// #5 phase 5.8 — HolyMask ECS system. Replaces `class HolyMask` from
// Entities/HolyMask.js with component arrays on runState. No "type→buff
// lookup sub-table" despite the plan description — the original class held
// only `isTrueGolden` (boolean) + draw routines. Pickup buffs are applied
// inline by the leaf-module collision loop in `core/updateGameplayMid.js`.
//
// Storage layout per tasks/ecs-design.md (dense head + swap-with-last):
//   runState.holyMaskX             : Float32Array
//   runState.holyMaskY             : Float32Array
//   runState.holyMaskAngle         : Float32Array      // per-slot rotation, ticks in draw
//   runState.holyMaskIsTrueGolden  : Uint8Array        // 0|1 flag
//   runState.holyMaskCount         : number

import { cachedRadial } from '../../Utils.js';

export const MAX_HOLYMASKS = 32;
export const HOLYMASK_RADIUS = 20;

export function initHolyMasks(rs) {
    rs.holyMaskX            = new Float32Array(MAX_HOLYMASKS);
    rs.holyMaskY            = new Float32Array(MAX_HOLYMASKS);
    rs.holyMaskAngle        = new Float32Array(MAX_HOLYMASKS);
    rs.holyMaskIsTrueGolden = new Uint8Array(MAX_HOLYMASKS);
    rs.holyMaskCount        = 0;
}

export function spawnHolyMask(rs, x, y, isTrueGolden = false) {
    const i = rs.holyMaskCount;
    if (i >= MAX_HOLYMASKS) return -1;
    rs.holyMaskX[i]            = x;
    rs.holyMaskY[i]            = y;
    rs.holyMaskAngle[i]        = 0;
    rs.holyMaskIsTrueGolden[i] = isTrueGolden ? 1 : 0;
    rs.holyMaskCount           = i + 1;
    return i;
}

export function killHolyMask(rs, i) {
    const last = rs.holyMaskCount - 1;
    if (i !== last) {
        rs.holyMaskX[i]            = rs.holyMaskX[last];
        rs.holyMaskY[i]            = rs.holyMaskY[last];
        rs.holyMaskAngle[i]        = rs.holyMaskAngle[last];
        rs.holyMaskIsTrueGolden[i] = rs.holyMaskIsTrueGolden[last];
    }
    rs.holyMaskCount = last;
}

export function clearHolyMasks(rs) {
    rs.holyMaskCount = 0;
}

// ── Draw helpers — lifted from class _drawGolden / _drawTrueGolden ─────────

function _drawGolden(ctx, angle, pulse) {
    // Outer dashed halo (counter-rotating)
    ctx.save();
    ctx.rotate(-angle * 0.6);
    ctx.strokeStyle = `rgba(241,196,15,${pulse * 0.30})`;
    ctx.lineWidth = 1;
    ctx.setLineDash([3, 5]);
    ctx.beginPath(); ctx.arc(0, 0, 24, 0, Math.PI * 2); ctx.stroke();
    ctx.setLineDash([]);
    ctx.restore();

    // 8 orbiting diamond sparks
    ctx.save();
    ctx.rotate(angle * 1.1);
    for (let i = 0; i < 8; i++) {
        const a = (i / 8) * Math.PI * 2;
        const r = 20;
        ctx.save();
        ctx.translate(Math.cos(a) * r, Math.sin(a) * r);
        ctx.rotate(a + Math.PI / 4);
        ctx.fillStyle = `rgba(255,220,60,${i % 2 === 0 ? pulse * 0.55 : pulse * 0.28})`;
        ctx.fillRect(-1, -1, 2, 2);
        ctx.restore();
    }
    ctx.restore();

    // Glow
    ctx.shadowBlur = 18 * pulse;
    ctx.shadowColor = 'rgba(241,196,15,0.85)';

    // Face
    ctx.fillStyle = '#c8970a';
    ctx.beginPath(); ctx.arc(0, 0, 14, 0, Math.PI * 2); ctx.fill();

    // Warm highlight
    ctx.shadowBlur = 0;
    const hlGrad = ctx.createRadialGradient(-3, -5, 1, 0, 0, 14);
    hlGrad.addColorStop(0, 'rgba(255,240,140,0.45)');
    hlGrad.addColorStop(1, 'rgba(255,240,140,0)');
    ctx.fillStyle = hlGrad;
    ctx.beginPath(); ctx.arc(0, 0, 14, 0, Math.PI * 2); ctx.fill();

    // Face ring
    ctx.strokeStyle = `rgba(255,215,50,${pulse})`;
    ctx.lineWidth = 1.5;
    ctx.beginPath(); ctx.arc(0, 0, 14, 0, Math.PI * 2); ctx.stroke();

    // Crown (3 tines)
    ctx.strokeStyle = `rgba(255,215,50,${pulse * 0.9})`;
    ctx.lineWidth = 1.5;
    ctx.lineJoin = 'round';
    ctx.beginPath();
    ctx.moveTo(-7, -13);
    ctx.lineTo(-4, -19);
    ctx.lineTo(-1, -14);
    ctx.lineTo(0,  -20);
    ctx.lineTo(1,  -14);
    ctx.lineTo(4,  -19);
    ctx.lineTo(7,  -13);
    ctx.stroke();

    // Eyes (almond shape)
    for (const side of [-1, 1]) {
        const ex = side * 4.5;
        ctx.save();
        ctx.translate(ex, -2);
        ctx.scale(1.5, 0.85);
        ctx.fillStyle = '#1a0800';
        ctx.beginPath(); ctx.arc(0, 0, 2.4, 0, Math.PI * 2); ctx.fill();
        ctx.restore();
        ctx.fillStyle = `rgba(255,210,40,${pulse})`;
        ctx.beginPath(); ctx.arc(ex - side * 0.8, -2.8, 0.85, 0, Math.PI * 2); ctx.fill();
    }

    // Nose bridge line
    ctx.strokeStyle = 'rgba(100,60,0,0.35)';
    ctx.lineWidth = 1;
    ctx.beginPath(); ctx.moveTo(0, -0.5); ctx.lineTo(0, 4); ctx.stroke();

    // Mouth curve
    ctx.strokeStyle = 'rgba(100,60,0,0.30)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.arc(0, 3, 4, 0.25, Math.PI - 0.25);
    ctx.stroke();
}

function _drawTrueGolden(ctx, angle, pulse) {
    // Outer aura ring
    ctx.save();
    ctx.rotate(-angle * 0.5);
    ctx.strokeStyle = `rgba(255,255,200,${pulse * 0.22})`;
    ctx.lineWidth = 1;
    ctx.setLineDash([2, 6]);
    ctx.beginPath(); ctx.arc(0, 0, 32, 0, Math.PI * 2); ctx.stroke();
    ctx.setLineDash([]);
    ctx.restore();

    // Mid ring + 12 orbiting particles
    ctx.save();
    ctx.rotate(angle * 0.8);
    ctx.strokeStyle = `rgba(241,196,15,${pulse * 0.45})`;
    ctx.lineWidth = 1.5;
    ctx.beginPath(); ctx.arc(0, 0, 25, 0, Math.PI * 2); ctx.stroke();
    for (let i = 0; i < 12; i++) {
        const a = (i / 12) * Math.PI * 2;
        ctx.fillStyle = i % 3 === 0
            ? `rgba(255,255,255,${pulse * 0.8})`
            : `rgba(255,215,50,${pulse * 0.4})`;
        ctx.beginPath();
        ctx.arc(Math.cos(a) * 25, Math.sin(a) * 25, i % 3 === 0 ? 1.5 : 1, 0, Math.PI * 2);
        ctx.fill();
    }
    ctx.restore();

    // Blazing glow
    ctx.shadowBlur = 30 * pulse;
    ctx.shadowColor = 'rgba(255,220,80,0.95)';

    // White-hot face
    ctx.fillStyle = '#fffbe0';
    ctx.beginPath(); ctx.arc(0, 0, 17, 0, Math.PI * 2); ctx.fill();

    // Gold outer face ring
    ctx.strokeStyle = `rgba(255,215,50,${pulse})`;
    ctx.lineWidth = 2.5;
    ctx.beginPath(); ctx.arc(0, 0, 17, 0, Math.PI * 2); ctx.stroke();

    // Inner golden overlay — #22 cached gradient across all instances.
    ctx.shadowBlur = 0;
    ctx.fillStyle = cachedRadial(ctx, 'holyMask:gold', 3, 17, [
        [0,   'rgba(255,250,200,0)'],
        [0.6, 'rgba(241,196,15,0.15)'],
        [1,   'rgba(200,150,0,0.35)'],
    ]);
    ctx.beginPath(); ctx.arc(0, 0, 17, 0, Math.PI * 2); ctx.fill();

    // Grand crown (5 tines)
    ctx.shadowBlur = 10 * pulse;
    ctx.shadowColor = 'rgba(255,240,100,0.8)';
    ctx.strokeStyle = `rgba(255,220,50,${pulse})`;
    ctx.lineWidth = 2;
    ctx.lineJoin = 'round';
    ctx.beginPath();
    ctx.moveTo(-10, -16);
    ctx.lineTo(-7,  -24);
    ctx.lineTo(-4,  -17);
    ctx.lineTo(-2,  -26);
    ctx.lineTo(0,   -17);
    ctx.lineTo(2,   -26);
    ctx.lineTo(4,   -17);
    ctx.lineTo(7,   -24);
    ctx.lineTo(10,  -16);
    ctx.stroke();
    ctx.shadowBlur = 0;

    // Eyes
    for (const side of [-1, 1]) {
        const ex = side * 5.5;
        ctx.save();
        ctx.translate(ex, -2.5);
        ctx.scale(1.6, 0.9);
        ctx.fillStyle = '#1a0600';
        ctx.beginPath(); ctx.arc(0, 0, 2.8, 0, Math.PI * 2); ctx.fill();
        ctx.restore();
        ctx.fillStyle = `rgba(255,240,100,${pulse})`;
        ctx.beginPath(); ctx.arc(ex - side, -3.2, 1.1, 0, Math.PI * 2); ctx.fill();
    }

    // Nose & mouth
    ctx.strokeStyle = 'rgba(150,100,0,0.35)';
    ctx.lineWidth = 1;
    ctx.beginPath(); ctx.moveTo(0, -0.5); ctx.lineTo(0, 5); ctx.stroke();
    ctx.beginPath(); ctx.arc(0, 4, 5, 0.2, Math.PI - 0.2); ctx.stroke();

    // Face ring detail
    ctx.strokeStyle = `rgba(255,240,120,${pulse * 0.4})`;
    ctx.lineWidth = 1;
    ctx.beginPath(); ctx.arc(0, 0, 12, 0, Math.PI * 2); ctx.stroke();
}

export function drawHolyMasks(ctx, rs) {
    for (let i = 0; i < rs.holyMaskCount; i++) {
        rs.holyMaskAngle[i] += 0.022;
        const angle = rs.holyMaskAngle[i];
        const pulse = Math.sin(angle * 3.5) * 0.18 + 0.82;

        ctx.save();
        ctx.translate(rs.holyMaskX[i], rs.holyMaskY[i]);
        if (rs.holyMaskIsTrueGolden[i]) _drawTrueGolden(ctx, angle, pulse);
        else                            _drawGolden(ctx, angle, pulse);
        ctx.restore();
    }
}
