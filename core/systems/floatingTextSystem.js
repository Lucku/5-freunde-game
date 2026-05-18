// #5 phase 5.5 — FloatingText ECS system. Replaces `class FloatingText` from
// Entities/FloatingText.js with component arrays on runState. Same compat-shim
// strategy as Particle (#5 phase 5.4): the existing ~155 callsites across 30+
// files keep using `FloatingText.acquire(...)` + `floatingTexts.push(ft)` via
// a thin proxy layer over slot indices.
//
// Storage layout per tasks/ecs-design.md (dense head + swap-with-last):
//   runState.floatingTextX       : Float32Array
//   runState.floatingTextY       : Float32Array
//   runState.floatingTextVX      : Float32Array
//   runState.floatingTextVY      : Float32Array
//   runState.floatingTextLife    : Float32Array   // ticks remaining, starts at maxLife
//   runState.floatingTextMaxLife : Float32Array   // stored per slot for alpha calc
//   runState.floatingTextSize    : Float32Array   // base font size in px
//   runState.floatingTextColor   : Uint16Array    // palette ordinal
//   runState.floatingTextIsCrit  : Uint8Array     // 0/1 boolean
//   runState.floatingTextText    : string[]       // side table for text content
//   runState.floatingTextCount   : number
//
// Cap = `GAMEPLAY.MAX_FLOATING_TEXTS` (80). Overflow drops new spawns (returns
// -1). Original class dropped oldest; we drop newest for O(1) cap enforcement.
// Visually indistinguishable in practice — damage-number storms saturate within
// ~10 frames either way.

import { GAMEPLAY } from '../../Constants.js';

export const MAX_FLOATING_TEXTS = GAMEPLAY.MAX_FLOATING_TEXTS;

// ── Palette interning ──────────────────────────────────────────────────────
const _palette = [];
const _paletteByKey = new Map();
function _internColor(color) {
    let idx = _paletteByKey.get(color);
    if (idx !== undefined) return idx;
    idx = _palette.length;
    _palette.push(color);
    _paletteByKey.set(color, idx);
    return idx;
}

// ── Crit detection (kept from class) ───────────────────────────────────────
//
// Original class heuristic: '!' suffix OR size >= 25 → crit-styled.
export function detectCrit(text, size) {
    if (typeof text === 'string' && text.length > 0 && text.indexOf('!') !== -1) return true;
    if (typeof size === 'number' && size >= 25) return true;
    return false;
}

function _initialVelocity(isCrit) {
    if (isCrit) {
        return { x: (Math.random() - 0.5) * 5, y: -4 };
    }
    return { x: (Math.random() - 0.5) * 2, y: -2 };
}

// ── System API ─────────────────────────────────────────────────────────────

export function initFloatingTexts(rs) {
    rs.floatingTextX       = new Float32Array(MAX_FLOATING_TEXTS);
    rs.floatingTextY       = new Float32Array(MAX_FLOATING_TEXTS);
    rs.floatingTextVX      = new Float32Array(MAX_FLOATING_TEXTS);
    rs.floatingTextVY      = new Float32Array(MAX_FLOATING_TEXTS);
    rs.floatingTextLife    = new Float32Array(MAX_FLOATING_TEXTS);
    rs.floatingTextMaxLife = new Float32Array(MAX_FLOATING_TEXTS);
    rs.floatingTextSize    = new Float32Array(MAX_FLOATING_TEXTS);
    rs.floatingTextColor   = new Uint16Array(MAX_FLOATING_TEXTS);
    rs.floatingTextIsCrit  = new Uint8Array(MAX_FLOATING_TEXTS);
    rs.floatingTextText    = new Array(MAX_FLOATING_TEXTS).fill('');
    rs.floatingTextCount   = 0;
}

export function spawnFloatingText(rs, x, y, text, color, size) {
    const i = rs.floatingTextCount;
    if (i >= MAX_FLOATING_TEXTS) return -1;
    const crit = detectCrit(text, size);
    const v = _initialVelocity(crit);
    rs.floatingTextX[i]       = x;
    rs.floatingTextY[i]       = y;
    rs.floatingTextVX[i]      = v.x;
    rs.floatingTextVY[i]      = v.y;
    rs.floatingTextLife[i]    = 60;
    rs.floatingTextMaxLife[i] = 60;
    rs.floatingTextSize[i]    = size;
    rs.floatingTextColor[i]   = _internColor(color);
    rs.floatingTextIsCrit[i]  = crit ? 1 : 0;
    rs.floatingTextText[i]    = text;
    rs.floatingTextCount      = i + 1;
    return i;
}

export function killFloatingText(rs, i) {
    const last = rs.floatingTextCount - 1;
    if (i !== last) {
        rs.floatingTextX[i]       = rs.floatingTextX[last];
        rs.floatingTextY[i]       = rs.floatingTextY[last];
        rs.floatingTextVX[i]      = rs.floatingTextVX[last];
        rs.floatingTextVY[i]      = rs.floatingTextVY[last];
        rs.floatingTextLife[i]    = rs.floatingTextLife[last];
        rs.floatingTextMaxLife[i] = rs.floatingTextMaxLife[last];
        rs.floatingTextSize[i]    = rs.floatingTextSize[last];
        rs.floatingTextColor[i]   = rs.floatingTextColor[last];
        rs.floatingTextIsCrit[i]  = rs.floatingTextIsCrit[last];
        rs.floatingTextText[i]    = rs.floatingTextText[last];
    }
    rs.floatingTextText[last] = '';
    rs.floatingTextCount = last;
}

export function clearFloatingTexts(rs) {
    for (let i = 0; i < rs.floatingTextCount; i++) rs.floatingTextText[i] = '';
    rs.floatingTextCount = 0;
}

/**
 * Tick all floating texts: position += velocity, velocity.y *= 0.9 gravity
 * drag, plus +0.18 gravity on crits. Decrement life; kill on <= 0. Reverse
 * iteration so killFloatingText's swap-with-last is safe.
 */
export function updateFloatingTexts(rs) {
    for (let i = rs.floatingTextCount - 1; i >= 0; i--) {
        rs.floatingTextX[i] += rs.floatingTextVX[i];
        rs.floatingTextY[i] += rs.floatingTextVY[i];
        rs.floatingTextLife[i]--;
        rs.floatingTextVY[i] *= 0.9;
        if (rs.floatingTextIsCrit[i]) rs.floatingTextVY[i] += 0.18;
        if (rs.floatingTextLife[i] <= 0) killFloatingText(rs, i);
    }
}

/**
 * Draw all live floating texts. Skips entirely if damageNumbers is off in
 * gameConfig. Per-glyph save/restore matches the class semantics.
 */
export function drawFloatingTexts(ctx, rs) {
    if (typeof gameConfig !== 'undefined' && !gameConfig.damageNumbers) return;
    const scaleCfg = (typeof gameConfig !== 'undefined' && Number(gameConfig.fontScale)) || 1;
    for (let i = 0; i < rs.floatingTextCount; i++) {
        const life = rs.floatingTextLife[i];
        const maxLife = rs.floatingTextMaxLife[i];
        const isCrit = rs.floatingTextIsCrit[i];
        const size = rs.floatingTextSize[i];
        const x = rs.floatingTextX[i];
        const y = rs.floatingTextY[i];
        const color = _palette[rs.floatingTextColor[i]];
        const text = rs.floatingTextText[i];

        ctx.save();
        ctx.globalAlpha = Math.max(0, life / maxLife);

        // #40 — crit scale-pulse: starts ~1.6× and eases to 1× over life.
        const t = 1 - (life / maxLife);
        const scaleCrit = isCrit ? (1 + 0.6 * (1 - Math.min(1, t * 2))) : 1;
        const finalSize = size * scaleCfg * scaleCrit;

        // Color shift: crits alternate between stored color and white flash.
        const flash = isCrit && ((life | 0) % 4 === 0);
        ctx.fillStyle = flash ? '#ffffff' : color;

        ctx.font = `bold ${finalSize}px Arial`;
        ctx.strokeStyle = 'black';
        ctx.lineWidth = isCrit ? 4 : 3;
        ctx.strokeText(text, x, y);
        ctx.fillText(text, x, y);
        ctx.restore();
    }
}
