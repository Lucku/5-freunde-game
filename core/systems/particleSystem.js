// #5 phase 5.4 — Particle ECS system. Replaces `class Particle` from
// Entities/Particle.js with component arrays on runState. Highest-volume
// entity in the game (~115 spawn sites across renderer + 17 DLCs), so the
// system uses palette-interned colors (Uint16 ordinal per slot) and a
// module-private sprite cache keyed by palette index.
//
// Storage layout per tasks/ecs-design.md:
//   runState.particleX     : Float32Array     // world position
//   runState.particleY     : Float32Array
//   runState.particleVX    : Float32Array     // per-frame velocity
//   runState.particleVY    : Float32Array
//   runState.particleAlpha : Float32Array     // current alpha (decays by life/frame)
//   runState.particleLife  : Float32Array     // alpha decay rate per frame
//   runState.particleColor : Uint16Array      // index into _palette
//   runState.particleCount : number           // dense head; entries [0, count) are live
//
// Caller pattern: most spawn sites today wrap `Particle.acquire(x, y, color)`
// then mutate `.velocity` / `.life` before push. The ECS spawnParticle takes
// those as optional args (vx, vy, life) so the common acquire-then-mutate
// pattern collapses to a single call. Undefined args fall back to the original
// random defaults from the class constructor.
//
// Sprite cache: keyed by palette ordinal instead of color string. Cap at
// 64 unique sprites; FIFO eviction. Server-side (no document) skips the
// cache and the draw helper is a no-op.

export const MAX_PARTICLES = 300;

// ── Palette interning ──────────────────────────────────────────────────────
//
// Module-level palette shared across all runState instances. The intern table
// is monotonically growing; in practice it caps at ~50 unique colors per
// session. Per design doc this saves ~22 bytes per particle vs string refs.
const _palette  = [];        // ordinal → CSS color string
const _paletteByKey = new Map(); // color string → ordinal

function _internColor(color) {
    let idx = _paletteByKey.get(color);
    if (idx !== undefined) return idx;
    idx = _palette.length;
    _palette.push(color);
    _paletteByKey.set(color, idx);
    return idx;
}

// ── Sprite cache (renderer-only) ───────────────────────────────────────────
//
// Lifted from Entities/Particle.js's static `_spriteCache`. 8×8 offscreen
// canvas per unique palette ordinal. Eviction is FIFO once 64 sprites exist.
const _SPRITE_CACHE_MAX = 64;
const _SPRITE_R    = 3;
const _SPRITE_SIZE = 8;
const _SPRITE_HALF = 4;
const _spriteCache = new Map(); // palette-ordinal → HTMLCanvasElement

function _getSprite(idx) {
    let s = _spriteCache.get(idx);
    if (s) return s;
    if (typeof document === 'undefined') return null;
    s = document.createElement('canvas');
    s.width = _SPRITE_SIZE; s.height = _SPRITE_SIZE;
    const sctx = s.getContext('2d');
    sctx.fillStyle = _palette[idx];
    sctx.beginPath();
    sctx.arc(_SPRITE_HALF, _SPRITE_HALF, _SPRITE_R, 0, Math.PI * 2);
    sctx.fill();
    if (_spriteCache.size >= _SPRITE_CACHE_MAX) {
        const first = _spriteCache.keys().next().value;
        if (first !== undefined) _spriteCache.delete(first);
    }
    _spriteCache.set(idx, s);
    return s;
}

// ── System API ─────────────────────────────────────────────────────────────

export function initParticles(rs) {
    rs.particleX     = new Float32Array(MAX_PARTICLES);
    rs.particleY     = new Float32Array(MAX_PARTICLES);
    rs.particleVX    = new Float32Array(MAX_PARTICLES);
    rs.particleVY    = new Float32Array(MAX_PARTICLES);
    rs.particleAlpha = new Float32Array(MAX_PARTICLES);
    rs.particleLife  = new Float32Array(MAX_PARTICLES);
    rs.particleColor = new Uint16Array(MAX_PARTICLES);
    rs.particleCount = 0;
}

/**
 * Spawn a particle. Returns slot index or -1 if at MAX_PARTICLES cap.
 * @param {object} rs - runState
 * @param {number} x  - world position
 * @param {number} y
 * @param {string} color - CSS color string (interned)
 * @param {number} [vx] - velocity X (default: random −2.5..+2.5)
 * @param {number} [vy] - velocity Y (default: random −2.5..+2.5)
 * @param {number} [life] - alpha decay per frame (default: random 0.02..0.07)
 */
export function spawnParticle(rs, x, y, color, vx, vy, life) {
    const i = rs.particleCount;
    if (i >= MAX_PARTICLES) return -1;
    rs.particleX[i]     = x;
    rs.particleY[i]     = y;
    rs.particleVX[i]    = (vx === undefined) ? (Math.random() - 0.5) * 5 : vx;
    rs.particleVY[i]    = (vy === undefined) ? (Math.random() - 0.5) * 5 : vy;
    rs.particleAlpha[i] = 1;
    rs.particleLife[i]  = (life === undefined) ? Math.random() * 0.05 + 0.02 : life;
    rs.particleColor[i] = _internColor(color);
    rs.particleCount    = i + 1;
    return i;
}

export function killParticle(rs, i) {
    const last = rs.particleCount - 1;
    if (i !== last) {
        rs.particleX[i]     = rs.particleX[last];
        rs.particleY[i]     = rs.particleY[last];
        rs.particleVX[i]    = rs.particleVX[last];
        rs.particleVY[i]    = rs.particleVY[last];
        rs.particleAlpha[i] = rs.particleAlpha[last];
        rs.particleLife[i]  = rs.particleLife[last];
        rs.particleColor[i] = rs.particleColor[last];
    }
    rs.particleCount = last;
}

export function clearParticles(rs) {
    rs.particleCount = 0;
}

/**
 * Tick all particles: position += velocity, alpha -= life. Reverse iteration
 * so killParticle's swap-with-last is safe.
 */
export function updateParticles(rs) {
    for (let i = rs.particleCount - 1; i >= 0; i--) {
        rs.particleX[i] += rs.particleVX[i];
        rs.particleY[i] += rs.particleVY[i];
        rs.particleAlpha[i] -= rs.particleLife[i];
        if (rs.particleAlpha[i] <= 0) killParticle(rs, i);
    }
}

/**
 * Render all live particles via cached sprite blits. Server-side noops
 * since _getSprite returns null without a document.
 */
export function drawParticles(ctx, rs) {
    for (let i = 0; i < rs.particleCount; i++) {
        const sprite = _getSprite(rs.particleColor[i]);
        const a = rs.particleAlpha[i];
        if (!sprite) {
            // Fallback path (no document) — original immediate-mode draw.
            ctx.save();
            ctx.globalAlpha = a;
            ctx.fillStyle = _palette[rs.particleColor[i]];
            ctx.beginPath();
            ctx.arc(rs.particleX[i], rs.particleY[i], _SPRITE_R, 0, Math.PI * 2);
            ctx.fill();
            ctx.restore();
            continue;
        }
        ctx.globalAlpha = a;
        ctx.drawImage(sprite, rs.particleX[i] - _SPRITE_HALF, rs.particleY[i] - _SPRITE_HALF);
    }
}
