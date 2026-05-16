// #194 follow-up — explicit BiomeZone/Obstacle/Trap imports (were bare-name lookups via window shim).
import { Obstacle } from '../../Arena.js';

// #194 — explicit renderer imports (was: window-shim lookup).

// The Hall of Mirrors - Mirror's Biome

class HallOfMirrorsBiome {
    constructor() {
        this.name = "The Hall of Mirrors";
        this.color = "#050d18";
        this.gridColor = "#1a5276";
        this.particles = [];
        this.sweepTimer = 0;
        this.sweepProgress = 0;
        this.sweepActive = false;

        // Thematic background state
        this.t = 0;
        this.ripples = [];          // expanding rings from arena center
        this.rippleTimer = 0;
        this.fractures = [];        // distant fracture-line clusters (radial cracks)
        this.echoes = [];           // ghost reflections of player
        this.echoTimer = 0;
        this.tileSize = 240;
        this.prismAngle = 0;
    }

    generate(arena) {
        const w = arena.width;
        const h = arena.height;
        const cx = w / 2;
        const cy = h / 2;

        console.log("Generating Hall of Mirrors Biome...");

        // 8-12 tall narrow obstacles in rough parallel rows
        const count = 8 + Math.floor(Math.random() * 5);
        const colSpacing = w / (count + 2);
        for (let i = 0; i < count; i++) {
            const x = colSpacing * (i + 1) + (Math.random() - 0.5) * 80;
            const y = cy - 250 + (Math.random() - 0.5) * 600;
            if (Math.hypot(x - cx, y - cy) > 300) {
                arena.obstacles.push(new Obstacle(x, y, 50, 220 + Math.random() * 80, 'mirror'));
            }
        }

        // Decorative wall mirrors (also obstacles for collision)
        const wallCount = 4 + Math.floor(Math.random() * 3);
        for (let i = 0; i < wallCount; i++) {
            const onTop = Math.random() < 0.5;
            const x = 200 + Math.random() * (w - 400);
            const y = onTop ? 80 : h - 130;
            arena.obstacles.push(new Obstacle(x, y, 180, 50, 'mirror'));
        }

        // ── Thematic decor ──────────────────────────────────────────────────
        // Distant fracture clusters (each: origin + N radial cracks)
        this.fractures = [];
        const fracCount = 6 + Math.floor(Math.random() * 4);
        for (let i = 0; i < fracCount; i++) {
            const fx = Math.random() * w;
            const fy = Math.random() * h;
            // Avoid placing too close to center spawn
            if (Math.hypot(fx - cx, fy - cy) < 400) continue;
            const cracks = [];
            const crackCount = 5 + Math.floor(Math.random() * 5);
            for (let j = 0; j < crackCount; j++) {
                cracks.push({
                    ang: Math.random() * Math.PI * 2,
                    len: 50 + Math.random() * 160,
                    wob: 0.15 + Math.random() * 0.25
                });
            }
            this.fractures.push({ x: fx, y: fy, cracks });
        }

        this.ripples = [];
        this.echoes = [];
        this.prismAngle = Math.random() * Math.PI * 2;
    }

    update(arena, player) {
        this.t++;
        this.sweepTimer++;
        this.rippleTimer++;
        this.echoTimer++;
        this.prismAngle += 0.0035;

        // Trigger prismatic sweep every 8s
        if (this.sweepTimer > 480 && !this.sweepActive) {
            this.sweepTimer = 0;
            this.sweepActive = true;
            this.sweepProgress = 0;
        }

        if (this.sweepActive) {
            this.sweepProgress += 12;
            if (this.sweepProgress > arena.width + 400) {
                this.sweepActive = false;
            }
        }

        // Spawn concentric ripples from arena center every ~2.5s
        if (this.rippleTimer > 150) {
            this.rippleTimer = 0;
            this.ripples.push({
                cx: arena.width / 2,
                cy: arena.height / 2,
                r: 60,
                maxR: Math.max(arena.width, arena.height) * 0.7,
                speed: 3.5 + Math.random() * 1.5,
                hue: Math.random() < 0.5 ? '#aed6f1' : '#7fcdff'
            });
        }
        for (let i = this.ripples.length - 1; i >= 0; i--) {
            const rp = this.ripples[i];
            rp.r += rp.speed;
            if (rp.r > rp.maxR) this.ripples.splice(i, 1);
        }

        // Spawn ghost echo of player ~every 0.6s
        if (player && this.echoTimer > 36) {
            this.echoTimer = 0;
            // Project player position onto one of four "far walls"
            const w = arena.width, h = arena.height;
            const side = Math.floor(Math.random() * 4);
            let ex, ey;
            if (side === 0) { ex = player.x; ey = 60; }
            else if (side === 1) { ex = player.x; ey = h - 60; }
            else if (side === 2) { ex = 60; ey = player.y; }
            else { ex = w - 60; ey = player.y; }
            this.echoes.push({
                x: ex, y: ey,
                origX: player.x, origY: player.y,
                side,
                life: 60,
                maxLife: 60,
                radius: player.radius || 18
            });
        }
        for (let i = this.echoes.length - 1; i >= 0; i--) {
            this.echoes[i].life--;
            if (this.echoes[i].life <= 0) this.echoes.splice(i, 1);
        }

        // Glint particles on obstacle edges near player
        if (player && Math.random() < 0.5) {
            const nearObs = arena.obstacles.filter(o =>
                o.type === 'mirror' &&
                Math.hypot((o.x + o.w / 2) - player.x, (o.y + o.h / 2) - player.y) < 600
            );
            if (nearObs.length > 0) {
                const o = nearObs[Math.floor(Math.random() * nearObs.length)];
                const onLeft = Math.random() < 0.5;
                const onTop = Math.random() < 0.5;
                this.particles.push({
                    x: onLeft ? o.x : (o.x + o.w),
                    y: o.y + Math.random() * o.h,
                    vx: 0,
                    vy: 0,
                    life: 20 + Math.random() * 15,
                    size: 1.5,
                    color: '#ffffff'
                });
                if (Math.random() < 0.3) {
                    this.particles.push({
                        x: o.x + Math.random() * o.w,
                        y: onTop ? o.y : (o.y + o.h),
                        vx: 0, vy: 0,
                        life: 20 + Math.random() * 15,
                        size: 1.5,
                        color: '#aed6f1'
                    });
                }
            }
        }

        // Update particles (just decay)
        for (let i = this.particles.length - 1; i >= 0; i--) {
            this.particles[i].life--;
            if (this.particles[i].life <= 0) this.particles.splice(i, 1);
        }
    }

    draw(ctx, arena) {
        const aw = arena.width;
        const ah = arena.height;
        const cx = aw / 2;
        const cy = ah / 2;
        const t = this.t;

        // ── 1. Polished marble radial gradient ──────────────────────────────
        ctx.save();
        const bgGrd = ctx.createRadialGradient(cx, cy, 80, cx, cy, Math.max(aw, ah) * 0.85);
        bgGrd.addColorStop(0,    'rgba(20, 50, 78, 0.55)');
        bgGrd.addColorStop(0.35, 'rgba(10, 30, 52, 0.55)');
        bgGrd.addColorStop(0.75, 'rgba(5, 14, 26, 0.55)');
        bgGrd.addColorStop(1,    'rgba(0, 4, 10, 0.75)');
        ctx.fillStyle = bgGrd;
        ctx.fillRect(0, 0, aw, ah);
        ctx.restore();

        // ── 2. Diamond mirror-tile pattern (floor) ──────────────────────────
        ctx.save();
        const tile = this.tileSize;
        const halfT = tile / 2;
        // Camera-aware tile range
        const cam = arena.camera;
        const startX = Math.floor((cam.x - tile) / tile) * tile;
        const startY = Math.floor((cam.y - tile) / tile) * tile;
        const endX = cam.x + cam.width + tile;
        const endY = cam.y + cam.height + tile;
        ctx.lineWidth = 1;
        for (let y = startY; y < endY; y += halfT) {
            const offset = ((y / halfT) | 0) % 2 === 0 ? 0 : halfT;
            for (let x = startX + offset; x < endX; x += tile) {
                // Per-tile faint shimmer based on position + time
                const sh = Math.sin(t * 0.015 + x * 0.0021 + y * 0.0017);
                const alpha = 0.06 + 0.05 * sh;
                ctx.fillStyle = `rgba(174, 214, 241, ${Math.max(0.02, alpha * 0.3)})`;
                ctx.beginPath();
                ctx.moveTo(x, y);
                ctx.lineTo(x + halfT, y + halfT);
                ctx.lineTo(x, y + tile);
                ctx.lineTo(x - halfT, y + halfT);
                ctx.closePath();
                ctx.fill();
                ctx.strokeStyle = `rgba(174, 214, 241, ${0.10 + 0.06 * sh})`;
                ctx.stroke();
            }
        }
        ctx.restore();

        // ── 3. Distant fracture-crack clusters ──────────────────────────────
        ctx.save();
        ctx.globalCompositeOperation = 'lighter';
        ctx.strokeStyle = 'rgba(220, 235, 255, 0.18)';
        ctx.lineWidth = 1;
        this.fractures.forEach((f, idx) => {
            const pulse = 0.6 + 0.4 * Math.sin(t * 0.02 + idx);
            ctx.strokeStyle = `rgba(220, 235, 255, ${0.10 + 0.10 * pulse})`;
            for (let i = 0; i < f.cracks.length; i++) {
                const cr = f.cracks[i];
                const wob = Math.sin(t * 0.01 + idx * 0.7 + i * 1.3) * cr.wob;
                const ex = f.x + Math.cos(cr.ang + wob * 0.1) * cr.len;
                const ey = f.y + Math.sin(cr.ang + wob * 0.1) * cr.len;
                ctx.beginPath();
                ctx.moveTo(f.x, f.y);
                ctx.lineTo(ex, ey);
                ctx.stroke();
                // Branch line halfway
                if (i % 2 === 0) {
                    const mx = (f.x + ex) / 2;
                    const my = (f.y + ey) / 2;
                    const branchAng = cr.ang + Math.PI / 2 + wob;
                    ctx.beginPath();
                    ctx.moveTo(mx, my);
                    ctx.lineTo(mx + Math.cos(branchAng) * cr.len * 0.25,
                               my + Math.sin(branchAng) * cr.len * 0.25);
                    ctx.stroke();
                }
            }
            // Center starburst point
            const cgrd = ctx.createRadialGradient(f.x, f.y, 1, f.x, f.y, 22);
            cgrd.addColorStop(0, `rgba(255, 255, 255, ${0.30 * pulse})`);
            cgrd.addColorStop(1, 'rgba(255, 255, 255, 0)');
            ctx.fillStyle = cgrd;
            ctx.fillRect(f.x - 22, f.y - 22, 44, 44);
        });
        ctx.restore();

        // ── 4. Concentric reflection ripples ────────────────────────────────
        ctx.save();
        ctx.globalCompositeOperation = 'lighter';
        ctx.lineWidth = 2;
        this.ripples.forEach(rp => {
            const fade = 1 - (rp.r / rp.maxR);
            ctx.strokeStyle = `${rp.hue}${Math.floor(0x33 * fade).toString(16).padStart(2, '0')}`;
            ctx.beginPath();
            ctx.arc(rp.cx, rp.cy, rp.r, 0, Math.PI * 2);
            ctx.stroke();
            // Echo ring
            ctx.lineWidth = 1;
            ctx.strokeStyle = `rgba(174, 214, 241, ${0.15 * fade})`;
            ctx.beginPath();
            ctx.arc(rp.cx, rp.cy, rp.r * 0.95, 0, Math.PI * 2);
            ctx.stroke();
            ctx.lineWidth = 2;
        });
        ctx.restore();

        // ── 5. Rotating prismatic rays from center ──────────────────────────
        ctx.save();
        ctx.globalCompositeOperation = 'lighter';
        const rayCount = 6;
        const rayLen = Math.max(aw, ah) * 0.65;
        const colors = ['#ff4d6d', '#ffb84d', '#fff04d', '#4dff7d', '#4dd0ff', '#a64dff'];
        for (let i = 0; i < rayCount; i++) {
            const ang = this.prismAngle + (i / rayCount) * Math.PI * 2;
            const spread = 0.05;
            const x1 = cx + Math.cos(ang - spread) * rayLen;
            const y1 = cy + Math.sin(ang - spread) * rayLen;
            const x2 = cx + Math.cos(ang + spread) * rayLen;
            const y2 = cy + Math.sin(ang + spread) * rayLen;
            const ex = cx + Math.cos(ang) * rayLen;
            const ey = cy + Math.sin(ang) * rayLen;
            const lg = ctx.createLinearGradient(cx, cy, ex, ey);
            lg.addColorStop(0,   `${colors[i]}00`);
            lg.addColorStop(0.3, `${colors[i]}1a`);
            lg.addColorStop(1,   `${colors[i]}00`);
            ctx.fillStyle = lg;
            ctx.beginPath();
            ctx.moveTo(cx, cy);
            ctx.lineTo(x1, y1);
            ctx.lineTo(x2, y2);
            ctx.closePath();
            ctx.fill();
        }
        // Central bright core
        const coreGrd = ctx.createRadialGradient(cx, cy, 4, cx, cy, 70);
        coreGrd.addColorStop(0, 'rgba(255, 255, 255, 0.35)');
        coreGrd.addColorStop(1, 'rgba(255, 255, 255, 0)');
        ctx.fillStyle = coreGrd;
        ctx.fillRect(cx - 70, cy - 70, 140, 140);
        ctx.restore();

        // ── 6. Prismatic floor sweep (existing) ─────────────────────────────
        if (this.sweepActive) {
            const sx = this.sweepProgress - 200;
            ctx.save();
            ctx.globalCompositeOperation = 'lighter';
            const grad = ctx.createLinearGradient(sx, 0, sx + 400, 0);
            grad.addColorStop(0,   'rgba(255, 255, 255, 0)');
            grad.addColorStop(0.3, 'rgba(174, 214, 241, 0.20)');
            grad.addColorStop(0.5, 'rgba(255, 220, 240, 0.18)');
            grad.addColorStop(0.7, 'rgba(174, 214, 241, 0.20)');
            grad.addColorStop(1,   'rgba(255, 255, 255, 0)');
            ctx.fillStyle = grad;
            ctx.fillRect(sx, 0, 400, ah);
            ctx.restore();
        }

        // ── 7. Player echoes — ghost reflections on far walls ───────────────
        ctx.save();
        this.echoes.forEach(e => {
            const fade = e.life / e.maxLife;
            ctx.globalAlpha = 0.35 * fade;
            ctx.fillStyle = '#aed6f1';
            ctx.beginPath();
            ctx.arc(e.x, e.y, e.radius * (0.7 + 0.3 * fade), 0, Math.PI * 2);
            ctx.fill();
            // White rim
            ctx.globalAlpha = 0.5 * fade;
            ctx.strokeStyle = '#ffffff';
            ctx.lineWidth = 1.2;
            ctx.beginPath();
            ctx.arc(e.x, e.y, e.radius * (0.7 + 0.3 * fade), 0, Math.PI * 2);
            ctx.stroke();
            // Thin connecting line back to player position (faint)
            ctx.globalAlpha = 0.10 * fade;
            ctx.strokeStyle = '#aed6f1';
            ctx.beginPath();
            ctx.moveTo(e.x, e.y);
            ctx.lineTo(e.origX, e.origY);
            ctx.stroke();
        });
        ctx.globalAlpha = 1;
        ctx.restore();

        // ── 8. Chromatic edge aberration — cyan + magenta column bleed ──────
        ctx.save();
        ctx.globalCompositeOperation = 'lighter';
        const ab = 0.04 + 0.03 * Math.sin(t * 0.02);
        const edgeW = 80;
        const lg1 = ctx.createLinearGradient(0, 0, edgeW, 0);
        lg1.addColorStop(0, `rgba(174, 214, 241, ${ab})`);
        lg1.addColorStop(1, 'rgba(174, 214, 241, 0)');
        ctx.fillStyle = lg1;
        ctx.fillRect(0, 0, edgeW, ah);
        const lg2 = ctx.createLinearGradient(aw - edgeW, 0, aw, 0);
        lg2.addColorStop(0, 'rgba(220, 174, 241, 0)');
        lg2.addColorStop(1, `rgba(220, 174, 241, ${ab})`);
        ctx.fillStyle = lg2;
        ctx.fillRect(aw - edgeW, 0, edgeW, ah);
        ctx.restore();

        // ── 9. Glint particles (existing) ───────────────────────────────────
        this.particles.forEach(p => {
            ctx.globalAlpha = Math.min(1, p.life / 20);
            ctx.fillStyle = p.color;
            ctx.beginPath();
            ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
            ctx.fill();
            ctx.shadowBlur = 8;
            ctx.shadowColor = p.color;
            ctx.fill();
            ctx.shadowBlur = 0;
        });
        ctx.globalAlpha = 1;
    }

    drawObstacle(ctx, obs) {
        const { x, y, w, h } = obs;
        const bev = 5;

        // Base — polished dark marine
        const rg = ctx.createRadialGradient(x + w / 2, y + h / 2, 5, x + w / 2, y + h / 2, Math.max(w, h) * 0.7);
        rg.addColorStop(0,   '#13314a');
        rg.addColorStop(0.5, '#0a1f30');
        rg.addColorStop(1,   '#050d14');
        ctx.fillStyle = rg;
        ctx.fillRect(x, y, w, h);

        // Reflective sheen along top + left edges
        ctx.save();
        ctx.beginPath(); ctx.rect(x + 1, y + 1, w - 2, h - 2); ctx.clip();

        const sheenGrad = ctx.createLinearGradient(x, y, x + w * 0.4, y + h * 0.4);
        sheenGrad.addColorStop(0, 'rgba(174, 214, 241, 0.4)');
        sheenGrad.addColorStop(1, 'rgba(174, 214, 241, 0)');
        ctx.fillStyle = sheenGrad;
        ctx.fillRect(x, y, w, h);

        // Vertical highlight stripe (mirror panel look)
        ctx.fillStyle = 'rgba(255, 255, 255, 0.06)';
        ctx.fillRect(x + w * 0.15, y + 2, w * 0.1, h - 4);

        ctx.restore();

        // Bevel
        ctx.fillStyle = 'rgba(174, 214, 241, 0.28)';
        ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x + w, y); ctx.lineTo(x + w - bev, y + bev); ctx.lineTo(x + bev, y + bev); ctx.closePath(); ctx.fill();
        ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x + bev, y + bev); ctx.lineTo(x + bev, y + h - bev); ctx.lineTo(x, y + h); ctx.closePath(); ctx.fill();
        ctx.fillStyle = 'rgba(0,0,0,0.5)';
        ctx.beginPath(); ctx.moveTo(x, y + h); ctx.lineTo(x + w, y + h); ctx.lineTo(x + w - bev, y + h - bev); ctx.lineTo(x + bev, y + h - bev); ctx.closePath(); ctx.fill();
        ctx.beginPath(); ctx.moveTo(x + w, y); ctx.lineTo(x + w, y + h); ctx.lineTo(x + w - bev, y + h - bev); ctx.lineTo(x + w - bev, y + bev); ctx.closePath(); ctx.fill();

        ctx.strokeStyle = '#0d2840';
        ctx.lineWidth = 1.5;
        ctx.strokeRect(x, y, w, h);
    }
}

// Register
if (typeof BIOME_LOGIC === 'undefined') window.BIOME_LOGIC = {};
window.BIOME_LOGIC['mirror'] = new HallOfMirrorsBiome();
