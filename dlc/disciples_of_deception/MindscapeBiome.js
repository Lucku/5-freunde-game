// The Mindscape - Psycho's Biome

class MindscapeBiome {
    constructor() {
        this.name = "The Mindscape";
        this.color = "#0a1a18";
        this.gridColor = "#1abc9c";
        this.particles = [];
        this.glitchTimer = 0;
        this.obstacleSeeds = [];

        // Crazier background state
        this.t = 0;
        this.tearBands = [];   // transient horizontal screen tears
        this.inkBlots = [];    // slow-drifting rorschach blobs
        this.fracturePts = []; // mandala fracture-line endpoints (regen on generate)
        this.pulsePhase = 0;
    }

    generate(arena) {
        const w = arena.width;
        const h = arena.height;
        const cx = w / 2;
        const cy = h / 2;

        console.log("Generating Mindscape Biome...");

        // Fracture Zone covering most of arena
        arena.biomeZones.push(new BiomeZone(cx - 900, cy - 700, 1800, 1400, 'FRACTURE'));

        // Mandala fracture-line endpoints — 24 radial spokes with jittered length
        this.fracturePts = [];
        for (let i = 0; i < 24; i++) {
            const ang = (i / 24) * Math.PI * 2;
            const len = 700 + Math.random() * 600;
            const wob = 0.35 + Math.random() * 0.4;
            this.fracturePts.push({ ang, len, wob });
        }

        // 6 slow rorschach inkblots drifting across the arena
        this.inkBlots = [];
        for (let i = 0; i < 6; i++) {
            this.inkBlots.push({
                x: Math.random() * w,
                y: Math.random() * h,
                r: 80 + Math.random() * 140,
                drift: Math.random() * Math.PI * 2,
                speed: 0.15 + Math.random() * 0.25,
                hue: Math.random() < 0.5 ? '#1abc9c' : '#e74c3c',
                spikes: 5 + Math.floor(Math.random() * 4)
            });
        }

        // 12-16 obstacles, asymmetric, avoiding center spawn
        const count = 12 + Math.floor(Math.random() * 5);
        this.obstacleSeeds = [];
        for (let i = 0; i < count; i++) {
            const x = Math.random() * (w - 300) + 150;
            const y = Math.random() * (h - 300) + 150;
            if (Math.hypot(x - cx, y - cy) > 350) {
                const ow = 80 + Math.random() * 120;
                const oh = 80 + Math.random() * 120;
                arena.obstacles.push(new Obstacle(x, y, ow, oh, 'psycho'));
                this.obstacleSeeds.push({ baseX: x, baseY: y, jitterPhase: Math.random() * Math.PI * 2 });
            }
        }
    }

    update(arena, player) {
        this.glitchTimer++;
        this.t++;
        this.pulsePhase += 0.025;

        // Drift inkblots — wraps around arena
        if (this.inkBlots && this.inkBlots.length) {
            const aw = arena.width, ah = arena.height;
            this.inkBlots.forEach(b => {
                b.drift += (Math.random() - 0.5) * 0.05;
                b.x += Math.cos(b.drift) * b.speed;
                b.y += Math.sin(b.drift) * b.speed;
                if (b.x < -b.r) b.x = aw + b.r;
                if (b.x > aw + b.r) b.x = -b.r;
                if (b.y < -b.r) b.y = ah + b.r;
                if (b.y > ah + b.r) b.y = -b.r;
            });
        }

        // Random screen-tear band ~every 2-4 seconds (denser during Hysteria)
        const hyst = !!(player && player.hysteriaActive);
        const tearRate = hyst ? 0.06 : 0.012;
        if (Math.random() < tearRate) {
            this.tearBands.push({
                y: (player ? player.y : arena.height / 2) + (Math.random() - 0.5) * 1000,
                h: 6 + Math.random() * 20,
                life: 18 + Math.random() * 20,
                maxLife: 30,
                offset: (Math.random() - 0.5) * 80
            });
        }
        for (let i = this.tearBands.length - 1; i >= 0; i--) {
            const tb = this.tearBands[i];
            tb.life--;
            if (tb.life <= 0) this.tearBands.splice(i, 1);
        }

        // Glitch step: every ~15s nudge obstacles slightly
        if (this.glitchTimer > 900) {
            this.glitchTimer = 0;
            arena.obstacles.forEach(o => {
                if (o.type === 'psycho') {
                    const nx = o.x + (Math.random() - 0.5) * 60;
                    const ny = o.y + (Math.random() - 0.5) * 60;
                    // Only shift if new position not colliding with player
                    if (!player || Math.hypot(nx - player.x, ny - player.y) > 120) {
                        o.x = Math.max(50, Math.min(arena.width - o.w - 50, nx));
                        o.y = Math.max(50, Math.min(arena.height - o.h - 50, ny));
                        o._glitchFlash = 30;
                    }
                }
            });
        }

        // Decay glitch flash
        arena.obstacles.forEach(o => {
            if (o._glitchFlash) o._glitchFlash--;
        });

        // Particle spawn — denser during Hysteria
        const inHysteria = !!(player && player.hysteriaActive);
        const spawnRate = inHysteria ? 0.85 : 0.25;
        if (player && Math.random() < spawnRate) {
            this.particles.push({
                x: player.x + (Math.random() - 0.5) * 1400,
                y: player.y + (Math.random() - 0.5) * 1000,
                vx: (Math.random() - 0.5) * 1.6,
                vy: (Math.random() - 0.5) * 1.6,
                life: 80 + Math.random() * 80,
                size: 1 + Math.random() * 2,
                color: Math.random() < 0.4 ? '#ffffff' : '#1abc9c'
            });
        }

        // Update particles
        for (let i = this.particles.length - 1; i >= 0; i--) {
            const p = this.particles[i];
            p.x += p.vx;
            p.y += p.vy;
            // Erratic drift
            p.vx += (Math.random() - 0.5) * 0.2;
            p.vy += (Math.random() - 0.5) * 0.2;
            p.life--;
            if (p.life <= 0) this.particles.splice(i, 1);
        }
    }

    draw(ctx, arena) {
        const aw = arena.width;
        const ah = arena.height;
        const cx = aw / 2;
        const cy = ah / 2;
        const t = this.t;

        // ── 1. Pulsing radial vignette ──────────────────────────────────────
        ctx.save();
        const pulse = 0.5 + 0.5 * Math.sin(this.pulsePhase);
        const baseAlpha = 0.35 + 0.18 * pulse;
        const bgGrd = ctx.createRadialGradient(cx, cy, 100, cx, cy, Math.max(aw, ah) * 0.7);
        bgGrd.addColorStop(0,   `rgba(8, 18, 16, ${baseAlpha})`);
        bgGrd.addColorStop(0.55,`rgba(20, 6, 14, ${baseAlpha + 0.12})`);
        bgGrd.addColorStop(1,   'rgba(0, 0, 0, 0.85)');
        ctx.fillStyle = bgGrd;
        ctx.fillRect(0, 0, aw, ah);
        ctx.restore();

        // ── 2. Mandala fracture lines radiating from centre ─────────────────
        if (this.fracturePts && this.fracturePts.length) {
            ctx.save();
            ctx.globalCompositeOperation = 'lighter';
            ctx.strokeStyle = 'rgba(26, 188, 156, 0.10)';
            ctx.lineWidth = 1.2;
            for (let i = 0; i < this.fracturePts.length; i++) {
                const p = this.fracturePts[i];
                const wobble = Math.sin(t * 0.01 + i * 0.7) * p.wob;
                const endX = cx + Math.cos(p.ang + wobble * 0.05) * p.len;
                const endY = cy + Math.sin(p.ang + wobble * 0.05) * p.len;
                ctx.beginPath();
                ctx.moveTo(cx, cy);
                ctx.lineTo(endX, endY);
                ctx.stroke();
            }
            // Cross-hatch echo
            ctx.strokeStyle = 'rgba(231, 76, 60, 0.06)';
            for (let i = 0; i < this.fracturePts.length; i += 2) {
                const a = this.fracturePts[i];
                const b = this.fracturePts[(i + 7) % this.fracturePts.length];
                ctx.beginPath();
                ctx.moveTo(cx + Math.cos(a.ang) * a.len * 0.5, cy + Math.sin(a.ang) * a.len * 0.5);
                ctx.lineTo(cx + Math.cos(b.ang) * b.len * 0.5, cy + Math.sin(b.ang) * b.len * 0.5);
                ctx.stroke();
            }
            ctx.restore();
        }

        // ── 3. Concentric pulsing rings around centre ───────────────────────
        ctx.save();
        ctx.globalCompositeOperation = 'lighter';
        for (let r = 0; r < 5; r++) {
            const radius = ((t * 1.4 + r * 220) % 1100) + 40;
            const alpha = Math.max(0, 0.18 * (1 - radius / 1100));
            ctx.strokeStyle = `rgba(26, 188, 156, ${alpha})`;
            ctx.lineWidth = 1.5;
            ctx.beginPath();
            ctx.arc(cx, cy, radius, 0, Math.PI * 2);
            ctx.stroke();
        }
        ctx.restore();

        // ── 4. Rorschach inkblots — symmetric squashed lobes ────────────────
        if (this.inkBlots && this.inkBlots.length) {
            ctx.save();
            this.inkBlots.forEach((b, idx) => {
                ctx.save();
                ctx.translate(b.x, b.y);
                ctx.globalAlpha = 0.22;
                ctx.fillStyle = b.hue;
                ctx.beginPath();
                const wobT = t * 0.015 + idx;
                for (let i = 0; i <= b.spikes; i++) {
                    const ang = (i / b.spikes) * Math.PI * 2;
                    const wob = 0.7 + 0.3 * Math.sin(wobT + ang * 3);
                    const rx = Math.cos(ang) * b.r * wob;
                    const ry = Math.sin(ang) * b.r * wob * 0.7;
                    if (i === 0) ctx.moveTo(rx, ry);
                    else ctx.quadraticCurveTo(rx * 1.1, ry * 1.1, rx, ry);
                }
                ctx.closePath();
                ctx.filter = 'blur(8px)';
                ctx.fill();
                ctx.filter = 'none';
                ctx.restore();
            });
            ctx.restore();
        }

        // ── 5. Horizontal screen-tear bands (per-frame; sliced across arena) ─
        if (this.tearBands && this.tearBands.length) {
            ctx.save();
            this.tearBands.forEach(tb => {
                const fade = tb.life / tb.maxLife;
                ctx.fillStyle = `rgba(26, 188, 156, ${0.18 * fade})`;
                ctx.fillRect(tb.offset, tb.y, aw, tb.h);
                // Echo line
                ctx.fillStyle = `rgba(255, 80, 120, ${0.10 * fade})`;
                ctx.fillRect(tb.offset * 0.6, tb.y + tb.h * 0.5, aw, 1.5);
            });
            ctx.restore();
        }

        // ── 6. Vertical chromatic bleeds — subtle magenta + teal columns ────
        ctx.save();
        ctx.globalAlpha = 0.06 + 0.04 * pulse;
        const stripeSpacing = 140;
        for (let i = 0; i < aw; i += stripeSpacing) {
            const phase = Math.sin(t * 0.006 + i * 0.01);
            const x = i + phase * 20;
            ctx.fillStyle = (i / stripeSpacing) & 1 ? '#1abc9c' : '#a83080';
            ctx.fillRect(x, 0, 2, ah);
        }
        ctx.restore();

        // ── 7. Foreground particles (existing dust) ─────────────────────────
        this.particles.forEach(p => {
            ctx.globalAlpha = Math.min(1, p.life / 60);
            ctx.fillStyle = p.color;
            ctx.beginPath();
            ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
            ctx.fill();
        });
        ctx.globalAlpha = 1;
    }

    drawObstacle(ctx, obs) {
        const { x, y, w, h } = obs;
        const bev = 6;
        const seed = obs.x * 0.0071 + obs.y * 0.0137;
        const r = (i) => { const s = Math.sin(seed + i * 0.391) * 43758.5453; return s - Math.floor(s); };

        // Base — dark teal
        const grd = ctx.createLinearGradient(x, y, x + w, y + h);
        grd.addColorStop(0,   '#0d2b27');
        grd.addColorStop(0.5, '#08201d');
        grd.addColorStop(1,   '#051613');
        ctx.fillStyle = grd;
        ctx.fillRect(x, y, w, h);

        ctx.save();
        ctx.beginPath(); ctx.rect(x + 1, y + 1, w - 2, h - 2); ctx.clip();

        // Diagonal scratch lines
        ctx.strokeStyle = 'rgba(26, 188, 156, 0.18)';
        ctx.lineWidth = 1;
        const numScratches = 4 + (r(seed + 1) * 4 | 0);
        for (let i = 0; i < numScratches; i++) {
            const s = seed + i * 1.13;
            const sx = x + r(s) * w;
            const sy = y + r(s + 0.1) * h;
            const len = 20 + r(s + 0.2) * 60;
            const ang = r(s + 0.3) * Math.PI * 2;
            ctx.beginPath();
            ctx.moveTo(sx, sy);
            ctx.lineTo(sx + Math.cos(ang) * len, sy + Math.sin(ang) * len);
            ctx.stroke();
        }

        // Subtle teal energy spots
        const numSpots = 3 + (r(seed + 7) * 3 | 0);
        for (let i = 0; i < numSpots; i++) {
            const s = seed + i * 0.81;
            const sx = x + r(s) * w;
            const sy = y + r(s + 0.1) * h;
            ctx.fillStyle = `rgba(26, 188, 156, ${0.12 + r(s + 0.2) * 0.18})`;
            ctx.beginPath();
            ctx.arc(sx, sy, 2 + r(s + 0.3) * 3, 0, Math.PI * 2);
            ctx.fill();
        }

        ctx.restore();

        // Glitch flash overlay during shift
        if (obs._glitchFlash && obs._glitchFlash > 0) {
            ctx.fillStyle = `rgba(255, 255, 255, ${obs._glitchFlash / 60})`;
            ctx.fillRect(x, y, w, h);
        }

        // Bevel
        ctx.fillStyle = 'rgba(26, 188, 156, 0.22)';
        ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x + w, y); ctx.lineTo(x + w - bev, y + bev); ctx.lineTo(x + bev, y + bev); ctx.closePath(); ctx.fill();
        ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x + bev, y + bev); ctx.lineTo(x + bev, y + h - bev); ctx.lineTo(x, y + h); ctx.closePath(); ctx.fill();
        ctx.fillStyle = 'rgba(0,0,0,0.55)';
        ctx.beginPath(); ctx.moveTo(x, y + h); ctx.lineTo(x + w, y + h); ctx.lineTo(x + w - bev, y + h - bev); ctx.lineTo(x + bev, y + h - bev); ctx.closePath(); ctx.fill();
        ctx.beginPath(); ctx.moveTo(x + w, y); ctx.lineTo(x + w, y + h); ctx.lineTo(x + w - bev, y + h - bev); ctx.lineTo(x + w - bev, y + bev); ctx.closePath(); ctx.fill();

        ctx.strokeStyle = '#0a1a18';
        ctx.lineWidth = 1.5;
        ctx.strokeRect(x, y, w, h);
    }
}

// Register
if (typeof BIOME_LOGIC === 'undefined') window.BIOME_LOGIC = {};
window.BIOME_LOGIC['psycho'] = new MindscapeBiome();
