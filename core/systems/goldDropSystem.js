// #5 phase 5.7 — GoldDrop ECS system. Replaces `class GoldDrop` from
// Entities/GoldDrop.js with component arrays on runState. No magnet pull
// behavior despite the legacy "Golden Magnet" comment in the pickup loop —
// pickup is plain pickup-range collision against `player.pickupRange`.
//
// Storage layout per tasks/ecs-design.md (dense head + swap-with-last):
//   runState.goldDropX        : Float32Array
//   runState.goldDropY        : Float32Array
//   runState.goldDropValue    : Uint8Array       // 5..14 currency value
//   runState.goldDropTier     : Uint8Array       // 0|1|2 visual tier
//   runState.goldDropAngle    : Float32Array     // per-slot spin animation
//   runState.goldDropBobOffset: Float32Array     // per-slot bob phase
//   runState.goldDropCount    : number

import { cachedRadial } from '../../Utils.js';

export const MAX_GOLDDROPS = 128;
export const GOLDDROP_RADIUS = 10;

export function initGoldDrops(rs) {
    rs.goldDropX         = new Float32Array(MAX_GOLDDROPS);
    rs.goldDropY         = new Float32Array(MAX_GOLDDROPS);
    rs.goldDropValue     = new Uint8Array(MAX_GOLDDROPS);
    rs.goldDropTier      = new Uint8Array(MAX_GOLDDROPS);
    rs.goldDropAngle     = new Float32Array(MAX_GOLDDROPS);
    rs.goldDropBobOffset = new Float32Array(MAX_GOLDDROPS);
    rs.goldDropCount     = 0;
}

export function spawnGoldDrop(rs, x, y) {
    const i = rs.goldDropCount;
    if (i >= MAX_GOLDDROPS) return -1;
    const value = Math.floor(Math.random() * 10) + 5;
    rs.goldDropX[i]         = x;
    rs.goldDropY[i]         = y;
    rs.goldDropValue[i]     = value;
    rs.goldDropTier[i]      = value >= 12 ? 2 : value >= 8 ? 1 : 0;
    rs.goldDropAngle[i]     = Math.random() * Math.PI * 2;
    rs.goldDropBobOffset[i] = Math.random() * Math.PI * 2;
    rs.goldDropCount        = i + 1;
    return i;
}

export function killGoldDrop(rs, i) {
    const last = rs.goldDropCount - 1;
    if (i !== last) {
        rs.goldDropX[i]         = rs.goldDropX[last];
        rs.goldDropY[i]         = rs.goldDropY[last];
        rs.goldDropValue[i]     = rs.goldDropValue[last];
        rs.goldDropTier[i]      = rs.goldDropTier[last];
        rs.goldDropAngle[i]     = rs.goldDropAngle[last];
        rs.goldDropBobOffset[i] = rs.goldDropBobOffset[last];
    }
    rs.goldDropCount = last;
}

export function clearGoldDrops(rs) {
    rs.goldDropCount = 0;
}

// Per-tier color palettes (lifted from the original GoldDrop.draw).
const _RIM    = ['#b8860b', '#d4a017', '#e8c84a'];
const _FACE   = ['#d4a017', '#f0c330', '#ffd85e'];
const _SHINE  = ['rgba(255,240,160,0.55)', 'rgba(255,248,180,0.65)', 'rgba(255,255,200,0.75)'];
const _GLOW   = ['rgba(210,160,20,0.25)', 'rgba(240,195,30,0.3)', 'rgba(255,220,60,0.35)'];

export function drawGoldDrops(ctx, rs) {
    const t = Date.now() / 1000;
    for (let i = 0; i < rs.goldDropCount; i++) {
        // Per-slot spin + bob — match the per-frame mutation pattern from the
        // class draw method.
        rs.goldDropAngle[i] += 0.04;
        const tier = rs.goldDropTier[i];
        const angle = rs.goldDropAngle[i];
        const bob = Math.sin(t * 2.5 + rs.goldDropBobOffset[i]) * 3;
        const scaleX = Math.abs(Math.cos(angle));
        const coinR = 9 + tier * 2;

        const rimColor   = _RIM[tier];
        const faceColor  = _FACE[tier];
        const shineColor = _SHINE[tier];
        const glowColor  = _GLOW[tier];

        ctx.save();
        ctx.translate(rs.goldDropX[i], rs.goldDropY[i] + bob);

        // Outer glow — keyed per tier (3 variants).
        ctx.fillStyle = cachedRadial(ctx, `goldDrop:glow:t${tier}`, coinR * 0.3, coinR * 2, [
            [0, glowColor],
            [1, 'rgba(0,0,0,0)'],
        ]);
        ctx.beginPath();
        ctx.ellipse(0, 0, coinR * 2, coinR * 1.4, 0, 0, Math.PI * 2);
        ctx.fill();

        // Coin rim
        ctx.fillStyle = rimColor;
        ctx.beginPath();
        ctx.ellipse(0, 2, coinR * scaleX + 1, coinR + 1, 0, 0, Math.PI * 2);
        ctx.fill();

        // Coin face
        const faceGrad = ctx.createRadialGradient(-coinR * scaleX * 0.25, -coinR * 0.3, 1, 0, 0, coinR);
        faceGrad.addColorStop(0, shineColor.replace(/[\d.]+\)$/, '0.9)'));
        faceGrad.addColorStop(0.35, faceColor);
        faceGrad.addColorStop(1, rimColor);
        ctx.fillStyle = faceGrad;
        ctx.beginPath();
        ctx.ellipse(0, 0, coinR * scaleX, coinR, 0, 0, Math.PI * 2);
        ctx.fill();

        // Inner ring detail
        ctx.strokeStyle = rimColor;
        ctx.lineWidth = 0.8;
        ctx.globalAlpha = 0.5;
        ctx.beginPath();
        ctx.ellipse(0, 0, coinR * scaleX * 0.7, coinR * 0.7, 0, 0, Math.PI * 2);
        ctx.stroke();
        ctx.globalAlpha = 1;

        // Specular highlight
        if (scaleX > 0.15) {
            const hx = -coinR * scaleX * 0.3;
            const hy = -coinR * 0.35;
            const shine = ctx.createRadialGradient(hx, hy, 0, hx, hy, coinR * scaleX * 0.55);
            shine.addColorStop(0, shineColor);
            shine.addColorStop(1, 'rgba(255,255,255,0)');
            ctx.fillStyle = shine;
            ctx.beginPath();
            ctx.ellipse(0, 0, coinR * scaleX, coinR, 0, 0, Math.PI * 2);
            ctx.fill();
        }

        // Center symbol
        if (scaleX > 0.3) {
            ctx.globalAlpha = scaleX;
            ctx.fillStyle = rimColor;
            ctx.font = `bold ${7 + tier * 2}px serif`;
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            ctx.save();
            ctx.scale(scaleX, 1);
            ctx.fillText('✦', 0, 0);
            ctx.restore();
            ctx.globalAlpha = 1;
        }

        ctx.restore();
    }
}
