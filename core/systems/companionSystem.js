// #5 phase 5.9 — Companion ECS system. Replaces `class Companion` from
// Companion.js with component arrays on runState. First behavioral system
// in the migration (vs prior data+render-only entities): per-frame orbit
// motion around the owning player, nearest-enemy targeting within 400 px
// range, type-keyed synergy damage / heal effects, and a short-lived beam
// VFX to the last hit target.
//
// Storage layout per tasks/ecs-design.md (dense head + swap-with-last):
//   runState.companionX            : Float32Array
//   runState.companionY            : Float32Array
//   runState.companionAngle        : Float32Array    // orbit phase, ticks each frame
//   runState.companionSpeed        : Float32Array    // cached from player.speed at spawn
//   runState.companionCooldown     : Int32Array      // frames until next attack
//   runState.companionLastTimer    : Int32Array      // beam-visible ticks remaining
//   runState.companionActive       : Uint8Array      // 0|1 — gates update+draw
//   runState.companionColor        : Uint16Array     // palette ordinal
//   runState.companionType         : string[]        // 'fire' | 'ice' | … | DLC types
//   runState.companionPlayer       : Array           // owning Player ref
//   runState.companionLastTarget   : Array           // last Enemy ref (or null)
//   runState.companionCount        : number
//
// `radius` (15), `distance` (60), and `attackMaxCooldown` (120) are
// constants in the original class — kept as module-level consts here, no
// per-slot storage.

import { FloatingText } from '../../Entities/FloatingText.js';

export const MAX_COMPANIONS = 16;
export const COMPANION_RADIUS    = 15;
const _ORBIT_DISTANCE      = 60;
const _ATTACK_MAX_COOLDOWN = 120;
const _SYNERGY_RANGE       = 400;

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

function _getColorByType(type) {
    switch (type) {
        case 'fire':    return '#e74c3c';
        case 'ice':     return '#3498db';
        case 'plant':   return '#2ecc71';
        case 'metal':   return '#95a5a6';
        case 'water':   return '#2980b9';
        case 'gravity': return '#8e44ad';
        case 'void':    return '#00bcd4';
        default:        return '#ffffff';
    }
}

// ── System API ─────────────────────────────────────────────────────────────

export function initCompanions(rs) {
    rs.companionX          = new Float32Array(MAX_COMPANIONS);
    rs.companionY          = new Float32Array(MAX_COMPANIONS);
    rs.companionAngle      = new Float32Array(MAX_COMPANIONS);
    rs.companionSpeed      = new Float32Array(MAX_COMPANIONS);
    rs.companionCooldown   = new Int32Array(MAX_COMPANIONS);
    rs.companionLastTimer  = new Int32Array(MAX_COMPANIONS);
    rs.companionActive     = new Uint8Array(MAX_COMPANIONS);
    rs.companionColor      = new Uint16Array(MAX_COMPANIONS);
    rs.companionType       = new Array(MAX_COMPANIONS).fill('');
    rs.companionPlayer     = new Array(MAX_COMPANIONS).fill(null);
    rs.companionLastTarget = new Array(MAX_COMPANIONS).fill(null);
    rs.companionCount      = 0;
}

export function spawnCompanion(rs, type, player) {
    const i = rs.companionCount;
    if (i >= MAX_COMPANIONS) return -1;
    rs.companionX[i]          = player ? player.x : 0;
    rs.companionY[i]          = player ? player.y : 0;
    rs.companionAngle[i]      = 0;
    rs.companionSpeed[i]      = player ? player.speed * 0.9 : 0;
    rs.companionCooldown[i]   = 0;
    rs.companionLastTimer[i]  = 0;
    rs.companionActive[i]     = 1;
    rs.companionType[i]       = type;
    rs.companionColor[i]      = _internColor(_getColorByType(type));
    rs.companionPlayer[i]     = player;
    rs.companionLastTarget[i] = null;
    rs.companionCount         = i + 1;
    return i;
}

export function killCompanion(rs, i) {
    const last = rs.companionCount - 1;
    if (i !== last) {
        rs.companionX[i]          = rs.companionX[last];
        rs.companionY[i]          = rs.companionY[last];
        rs.companionAngle[i]      = rs.companionAngle[last];
        rs.companionSpeed[i]      = rs.companionSpeed[last];
        rs.companionCooldown[i]   = rs.companionCooldown[last];
        rs.companionLastTimer[i]  = rs.companionLastTimer[last];
        rs.companionActive[i]     = rs.companionActive[last];
        rs.companionColor[i]      = rs.companionColor[last];
        rs.companionType[i]       = rs.companionType[last];
        rs.companionPlayer[i]     = rs.companionPlayer[last];
        rs.companionLastTarget[i] = rs.companionLastTarget[last];
    }
    rs.companionType[last]       = '';
    rs.companionPlayer[last]     = null;
    rs.companionLastTarget[last] = null;
    rs.companionCount = last;
}

export function clearCompanions(rs) {
    for (let i = 0; i < rs.companionCount; i++) {
        rs.companionType[i]       = '';
        rs.companionPlayer[i]     = null;
        rs.companionLastTarget[i] = null;
    }
    rs.companionCount = 0;
}

export function findCompanionByType(rs, type) {
    for (let i = 0; i < rs.companionCount; i++) {
        if (rs.companionType[i] === type) return i;
    }
    return -1;
}

export function getCompanionType(rs, i) {
    return rs.companionType[i];
}

/**
 * Snapshot for save: returns `[{type}, …]`. Restore via spawnCompanion.
 */
export function serializeCompanions(rs) {
    const out = new Array(rs.companionCount);
    for (let i = 0; i < rs.companionCount; i++) {
        out[i] = { type: rs.companionType[i] };
    }
    return out;
}

// ── Behavior — orbit + synergy ─────────────────────────────────────────────

function _applyEffect(rs, i, target) {
    const type = rs.companionType[i];
    const player = rs.companionPlayer[i];
    const color = _palette[rs.companionColor[i]];

    // Thermal Shock: Fire companion + Ice player → high damage on frozen enemies
    if (type === 'fire' && player && player.type === 'ice') {
        if (target.frozenTimer > 0) {
            floatingTexts.push(FloatingText.acquire(target.x, target.y, 50, '#e74c3c', 20));
            target.hp -= 50;
            target.frozenTimer = 0;
        } else {
            floatingTexts.push(FloatingText.acquire(target.x, target.y, 10, '#e74c3c', 15));
            target.hp -= 10;
        }
        return;
    }

    // Plant + Metal player → heal player
    if (type === 'plant' && player && player.type === 'metal') {
        if (target === player) {
            if (player.hp < player.maxHp) {
                player.hp = Math.min(player.hp + 5, player.maxHp);
                floatingTexts.push(FloatingText.acquire(player.x, player.y, "+5", '#2ecc71', 15));
            }
        }
        return;
    }

    // Generic damage
    if (target !== player) {
        target.hp -= 15;
        floatingTexts.push(FloatingText.acquire(target.x, target.y, 15, color, 15));
    }
}

function _performSynergy(rs, i) {
    if (typeof enemies === 'undefined') return;

    const cx = rs.companionX[i];
    const cy = rs.companionY[i];
    let nearest = null;
    let minDist = _SYNERGY_RANGE;

    for (let j = 0; j < enemies.length; j++) {
        const e = enemies[j];
        const d = Math.hypot(e.x - cx, e.y - cy);
        if (d < minDist) {
            minDist = d;
            nearest = e;
        }
    }

    if (nearest) {
        rs.companionLastTarget[i] = nearest;
        rs.companionLastTimer[i]  = 8; // beam visible ~8 frames
        _applyEffect(rs, i, nearest);
    } else if (rs.companionType[i] === 'plant') {
        _applyEffect(rs, i, rs.companionPlayer[i]);
    }
}

export function updateCompanions(rs) {
    for (let i = 0; i < rs.companionCount; i++) {
        if (!rs.companionActive[i]) continue;
        const player = rs.companionPlayer[i];
        if (!player) continue;

        // Orbit/follow logic
        rs.companionAngle[i] += 0.02;
        const angle = rs.companionAngle[i];
        const targetX = player.x + Math.cos(angle) * _ORBIT_DISTANCE;
        const targetY = player.y + Math.sin(angle) * _ORBIT_DISTANCE;
        rs.companionX[i] += (targetX - rs.companionX[i]) * 0.1;
        rs.companionY[i] += (targetY - rs.companionY[i]) * 0.1;

        // Attack cooldown + synergy
        if (rs.companionCooldown[i] > 0) {
            rs.companionCooldown[i]--;
        } else {
            _performSynergy(rs, i);
            rs.companionCooldown[i] = _ATTACK_MAX_COOLDOWN;
        }

        if (rs.companionLastTimer[i] > 0) {
            rs.companionLastTimer[i]--;
        } else {
            rs.companionLastTarget[i] = null;
        }
    }
}

export function drawCompanions(ctx, rs) {
    for (let i = 0; i < rs.companionCount; i++) {
        if (!rs.companionActive[i]) continue;
        const player = rs.companionPlayer[i];
        if (!player) continue;
        const cx = rs.companionX[i];
        const cy = rs.companionY[i];
        const color = _palette[rs.companionColor[i]];
        const lastTarget = rs.companionLastTarget[i];

        ctx.save();
        ctx.globalAlpha = 0.8;

        // Beam to last target
        if (lastTarget && rs.companionLastTimer[i] > 0) {
            ctx.strokeStyle = color;
            ctx.lineWidth = 2;
            ctx.beginPath();
            ctx.moveTo(cx, cy);
            ctx.lineTo(lastTarget.x, lastTarget.y);
            ctx.stroke();
        }

        // Tether to player
        ctx.beginPath();
        ctx.moveTo(cx, cy);
        ctx.lineTo(player.x, player.y);
        ctx.strokeStyle = color;
        ctx.lineWidth = 1;
        ctx.setLineDash([5, 5]);
        ctx.stroke();
        ctx.setLineDash([]);

        // Body
        ctx.beginPath();
        ctx.arc(cx, cy, COMPANION_RADIUS, 0, Math.PI * 2);
        ctx.fillStyle = color;
        ctx.fill();
        ctx.strokeStyle = '#fff';
        ctx.lineWidth = 2;
        ctx.stroke();

        // Glow
        ctx.shadowBlur = 10;
        ctx.shadowColor = color;
        ctx.fill();

        // Visor
        ctx.fillStyle = '#000';
        ctx.fillRect(cx - 10, cy - 4, 20, 8);

        ctx.restore();
    }
}
