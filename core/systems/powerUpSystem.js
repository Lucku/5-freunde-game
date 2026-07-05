// PowerUp ECS system. Replaces the `class PowerUp`
// Entities/PowerUp.js with component arrays on runState. See tasks/ecs-design.md
// for the slot-allocation strategy (dense head + swap-with-last), sizing
// rationale (MAX_POWERUPS = 16), and pickup-collision pattern.
//
// Public API:
//   initPowerUps(rs)              — allocates the typed arrays on a fresh runState
//   spawnPowerUp(rs)              — picks a safe arena position + random type; returns slot index or -1
//   killPowerUp(rs, i)            — swap-with-last; safe to call during reverse iter
//   clearPowerUps(rs)             — wipes all live entries (wave-reset / mode-switch resets)
//   updatePowerUps(rs)            — ticks timers + kills expired
//   drawPowerUps(ctx, rs)         — renders all live entries
//   getPowerUpType(rs, i)         — returns POWERUP_TYPES[type] string for slot i
//   POWERUP_TYPES, MAX_POWERUPS   — re-exported for consumers

import { POWERUP_TYPES } from '../../Constants.js';

export { POWERUP_TYPES };
export const MAX_POWERUPS = 16;
export const POWERUP_RADIUS = 15;
const POWERUP_TIMER_INIT = 600;

// One palette per type, indexed by Uint8 ordinal (HEAL/MAXHP/SPEED/MULTI/AUTOAIM).
const _COLORS  = ['#2ecc71', '#e74c3c', '#f1c40f', '#3498db', '#9b59b6'];
// Icons are drawn as procedural vector shapes (see drawPowerUpIcon) instead
// of emoji/glyphs. `♥ ⚡ ⁙ 🎯` rendered inconsistently across Windows/Linux/Steam
// Deck (mono vs color vs tofu); white vector shapes render identically everywhere.

export function initPowerUps(rs) {
    rs.powerUpX        = new Float32Array(MAX_POWERUPS);
    rs.powerUpY        = new Float32Array(MAX_POWERUPS);
    rs.powerUpType     = new Uint8Array(MAX_POWERUPS);
    rs.powerUpTimer    = new Int32Array(MAX_POWERUPS);
    rs.powerUpOscill   = new Float32Array(MAX_POWERUPS);
    rs.powerUpCount    = 0;
}

export function spawnPowerUp(rs) {
    const i = rs.powerUpCount;
    if (i >= MAX_POWERUPS) return -1;
    if (typeof arena === 'undefined') return -1;

    // Find a non-obstacle position. Original PowerUp.js loops until safe;
    // we keep the same semantics but cap attempts to avoid infinite loop
    // on a fully-blocked arena.
    // Placement stays on Math.random: the retry count depends on arena.checkCollision,
    // and arena layout/obstacles aren't seeded yet (client builds obstacles, server
    // is flat), so seeding this loop would diverge the RNG stream server-vs-client.
    // Tracked with the arena-determinism pass. Type IS seeded — it's the gameplay-
    // relevant part (which power-up you get) and is a single deterministic draw.
    let x = 0, y = 0;
    for (let attempt = 0; attempt < 20; attempt++) {
        x = Math.random() * (arena.width - 100) + 50;
        y = Math.random() * (arena.height - 100) + 50;
        if (!arena.checkCollision(x, y, POWERUP_RADIUS)) break;
    }

    rs.powerUpX[i]        = x;
    rs.powerUpY[i]        = y;
    rs.powerUpType[i]     = Math.floor(rs.rng() * POWERUP_TYPES.length);
    rs.powerUpTimer[i]    = POWERUP_TIMER_INIT;
    rs.powerUpOscill[i]   = Math.random() * Math.PI;
    rs.powerUpCount       = i + 1;
    return i;
}

export function killPowerUp(rs, i) {
    const last = rs.powerUpCount - 1;
    if (i !== last) {
        rs.powerUpX[i]      = rs.powerUpX[last];
        rs.powerUpY[i]      = rs.powerUpY[last];
        rs.powerUpType[i]   = rs.powerUpType[last];
        rs.powerUpTimer[i]  = rs.powerUpTimer[last];
        rs.powerUpOscill[i] = rs.powerUpOscill[last];
    }
    rs.powerUpCount = last;
}

export function clearPowerUps(rs) {
    rs.powerUpCount = 0;
}

export function getPowerUpType(rs, i) {
    return POWERUP_TYPES[rs.powerUpType[i]];
}

export function getPowerUpColor(rs, i) {
    return _COLORS[rs.powerUpType[i]];
}

export function updatePowerUps(rs) {
    for (let i = rs.powerUpCount - 1; i >= 0; i--) {
        rs.powerUpTimer[i]--;
    }
}

export function drawPowerUps(ctx, rs) {
    const f = rs.frame;
    for (let i = 0; i < rs.powerUpCount; i++) {
        const ti = rs.powerUpType[i];
        const oy = Math.sin(f * 0.1 + rs.powerUpOscill[i]) * 5;
        ctx.save();
        ctx.translate(rs.powerUpX[i], rs.powerUpY[i] + oy);
        ctx.shadowBlur = 15;
        ctx.shadowColor = 'white';
        ctx.fillStyle = _COLORS[ti];
        ctx.beginPath();
        ctx.arc(0, 0, POWERUP_RADIUS, 0, Math.PI * 2);
        ctx.fill();
        ctx.shadowBlur = 0; // icon strokes/fills shouldn't bloom like the disc
        drawPowerUpIcon(ctx, ti, POWERUP_RADIUS);
        ctx.restore();
    }
}

// Per-type white vector icons, replacing the old emoji/glyph fillText.
// Drawn centered at (0,0); caller has already translated to the powerup.
// HEAL=cross · MAXHP=heart · SPEED=lightning · MULTI=three dots · AUTOAIM=target.
function drawPowerUpIcon(ctx, ti, r) {
    ctx.fillStyle = 'white';
    ctx.strokeStyle = 'white';
    ctx.lineJoin = 'round';
    ctx.lineCap = 'round';
    const s = r * 0.62; // icon half-extent
    switch (ti) {
        case 0: { // HEAL — plus / cross
            const t = s * 0.40; // arm half-thickness
            ctx.beginPath();
            ctx.rect(-t, -s, t * 2, s * 2);
            ctx.rect(-s, -t, s * 2, t * 2);
            ctx.fill();
            break;
        }
        case 1: { // MAXHP — heart
            const w = s * 1.05, h = s;
            ctx.beginPath();
            ctx.moveTo(0, h * 0.62);
            ctx.bezierCurveTo(w, -h * 0.18, w * 0.5, -h, 0, -h * 0.32);
            ctx.bezierCurveTo(-w * 0.5, -h, -w, -h * 0.18, 0, h * 0.62);
            ctx.fill();
            break;
        }
        case 2: { // SPEED — lightning bolt
            ctx.beginPath();
            ctx.moveTo(s * 0.18, -s);
            ctx.lineTo(-s * 0.50, s * 0.12);
            ctx.lineTo(-s * 0.04, s * 0.12);
            ctx.lineTo(-s * 0.22, s);
            ctx.lineTo(s * 0.56, -s * 0.18);
            ctx.lineTo(s * 0.06, -s * 0.18);
            ctx.closePath();
            ctx.fill();
            break;
        }
        case 3: { // MULTI — three dots (multishot)
            const dr = s * 0.30;
            for (const dx of [-s * 0.58, 0, s * 0.58]) {
                ctx.beginPath();
                ctx.arc(dx, 0, dr, 0, Math.PI * 2);
                ctx.fill();
            }
            break;
        }
        case 4: { // AUTOAIM — target / crosshair
            ctx.lineWidth = Math.max(2, r * 0.13);
            ctx.beginPath(); ctx.arc(0, 0, s * 0.82, 0, Math.PI * 2); ctx.stroke();
            ctx.beginPath(); ctx.arc(0, 0, s * 0.34, 0, Math.PI * 2); ctx.stroke();
            ctx.beginPath();
            ctx.moveTo(-s, 0);        ctx.lineTo(-s * 0.55, 0);
            ctx.moveTo(s * 0.55, 0);  ctx.lineTo(s, 0);
            ctx.moveTo(0, -s);        ctx.lineTo(0, -s * 0.55);
            ctx.moveTo(0, s * 0.55);  ctx.lineTo(0, s);
            ctx.stroke();
            break;
        }
    }
}
