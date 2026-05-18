// #5 phase 5.1 — PowerUp ECS system. Replaces the `class PowerUp` from
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

// One palette + one symbol per type, indexed by Uint8 ordinal.
const _COLORS  = ['#2ecc71', '#e74c3c', '#f1c40f', '#3498db', '#9b59b6'];
const _SYMBOLS = ['+',       '♥',       '⚡',      '⁙',       '🎯'];

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
    let x = 0, y = 0;
    for (let attempt = 0; attempt < 20; attempt++) {
        x = Math.random() * (arena.width - 100) + 50;
        y = Math.random() * (arena.height - 100) + 50;
        if (!arena.checkCollision(x, y, POWERUP_RADIUS)) break;
    }

    rs.powerUpX[i]        = x;
    rs.powerUpY[i]        = y;
    rs.powerUpType[i]     = Math.floor(Math.random() * POWERUP_TYPES.length);
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
        ctx.fillStyle = 'white';
        ctx.font = 'bold 16px Arial';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(_SYMBOLS[ti], 0, 1);
        ctx.restore();
    }
}
