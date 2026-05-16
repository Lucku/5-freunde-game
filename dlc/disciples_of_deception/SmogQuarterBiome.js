// #194 follow-up — explicit BiomeZone/Obstacle/Trap imports (were bare-name lookups via window shim).
import { BiomeZone, Obstacle } from '../../Arena.js';

// The Smog Quarter - Smoke's Biome

class SmogQuarterBiome {
    constructor() {
        this.name = "The Smog Quarter";
        this.color = "#14140f";
        this.gridColor = "#3a3a32";
        this.particles = [];
        this.windAngle = 0;
        this.windShiftTimer = 0;

        // Thematic background state
        this.t = 0;
        this.chimneys = [];     // smokestack silhouettes along top/bottom edges
        this.sootPools = [];    // dark ellipsoid stains on floor
        this.fogBanks = [];     // large rolling fog masses
        this.embers = [];       // hot rising sparks
        this.searchlights = []; // sweeping cone beams from arena corners
        this.gratePhase = Math.random() * 1000;
    }

    generate(arena) {
        const w = arena.width;
        const h = arena.height;
        const cx = w / 2;
        const cy = h / 2;

        console.log("Generating Smog Quarter Biome...");

        // Initial wind direction (random cardinal)
        const dirs = [0, Math.PI / 2, Math.PI, -Math.PI / 2];
        this.windAngle = dirs[Math.floor(Math.random() * dirs.length)];

        // 3-4 large Smog Pockets (biome zones with extra slow effect)
        const pocketCount = 3 + Math.floor(Math.random() * 2);
        for (let i = 0; i < pocketCount; i++) {
            const px = Math.random() * (w - 600) + 300;
            const py = Math.random() * (h - 600) + 300;
            arena.biomeZones.push(new BiomeZone(px - 200, py - 200, 400, 400, 'SMOG_POCKET'));
        }

        // 14-18 dense blocky obstacles
        const count = 14 + Math.floor(Math.random() * 5);
        for (let i = 0; i < count; i++) {
            const x = Math.random() * (w - 200) + 100;
            const y = Math.random() * (h - 200) + 100;
            if (Math.hypot(x - cx, y - cy) > 280) {
                const size = 100 + Math.random() * 80;
                arena.obstacles.push(new Obstacle(x, y, size, size, 'smoke'));
            }
        }

        // ── Thematic decor: smokestack silhouettes on top/bottom edges ───────
        this.chimneys = [];
        const chimCount = 7 + Math.floor(Math.random() * 5);
        for (let i = 0; i < chimCount; i++) {
            const onTop = Math.random() < 0.5;
            this.chimneys.push({
                x: Math.random() * w,
                edge: onTop ? 'top' : 'bottom',
                width: 36 + Math.random() * 34,
                height: 160 + Math.random() * 220,
                hasCap: Math.random() < 0.6,
                plumePhase: Math.random() * Math.PI * 2,
                puffDrift: Math.random() * Math.PI * 2
            });
        }

        // Soot pools — large flat dark stains scattered across floor
        this.sootPools = [];
        const poolCount = 10 + Math.floor(Math.random() * 5);
        for (let i = 0; i < poolCount; i++) {
            this.sootPools.push({
                x: Math.random() * w,
                y: Math.random() * h,
                rx: 90 + Math.random() * 200,
                ry: 50 + Math.random() * 130,
                rot: Math.random() * Math.PI,
                alpha: 0.18 + Math.random() * 0.18
            });
        }

        // Pre-seed rolling fog banks
        this.fogBanks = [];
        for (let i = 0; i < 6; i++) {
            this.fogBanks.push({
                x: Math.random() * w,
                y: Math.random() * h,
                r: 220 + Math.random() * 280,
                seed: Math.random() * 1000,
                alpha: 0.10 + Math.random() * 0.10
            });
        }

        // Searchlight cones from two opposite corners
        this.searchlights = [
            { cx: 60, cy: 60, angle: Math.PI * 0.25, baseAngle: Math.PI * 0.25,
              sweep: 0.5, angVel: 0.006, range: Math.max(w, h) * 0.85, phase: 0 },
            { cx: w - 60, cy: h - 60, angle: Math.PI * 1.25, baseAngle: Math.PI * 1.25,
              sweep: 0.5, angVel: -0.0055, range: Math.max(w, h) * 0.85, phase: Math.PI }
        ];
        // Pre-fill embers
        this.embers = [];
    }

    update(arena, player) {
        this.t++;
        this.windShiftTimer++;
        this.gratePhase += 0.003;

        // Wind shift every 20s — rotate 90° clockwise
        if (this.windShiftTimer > 1200) {
            this.windShiftTimer = 0;
            this.windAngle += Math.PI / 2;
            if (typeof showNotification === 'function') showNotification("WIND SHIFT", "#888899");
        }

        // Apply Smog Pocket slow to enemies (15% extra speed reduction inside zones)
        if (typeof enemies !== 'undefined' && arena.biomeZones) {
            const pockets = arena.biomeZones.filter(z => z.type === 'SMOG_POCKET');
            if (pockets.length > 0) {
                enemies.forEach(e => {
                    if (e.hp <= 0) return;
                    const inPocket = pockets.some(p =>
                        e.x >= p.x && e.x <= p.x + p.w &&
                        e.y >= p.y && e.y <= p.y + p.h
                    );
                    e._smogSlow = inPocket;
                });
            }
        }

        // Drift fog banks with wind, wrap around arena
        const aw = arena.width, ah = arena.height;
        const wx = Math.cos(this.windAngle) * 0.22;
        const wy = Math.sin(this.windAngle) * 0.22;
        this.fogBanks.forEach(f => {
            f.x += wx;
            f.y += wy;
            if (f.x < -f.r) f.x = aw + f.r;
            if (f.x > aw + f.r) f.x = -f.r;
            if (f.y < -f.r) f.y = ah + f.r;
            if (f.y > ah + f.r) f.y = -f.r;
        });

        // Oscillating searchlights
        this.searchlights.forEach(s => {
            s.phase += 0.012;
            s.angle = s.baseAngle + Math.sin(s.phase) * s.sweep;
        });

        // Spawn rising embers near player area (occasional)
        if (player && Math.random() < 0.45) {
            this.embers.push({
                x: player.x + (Math.random() - 0.5) * 1700,
                y: player.y + (Math.random() - 0.5) * 1100 + 200,
                vx: (Math.random() - 0.5) * 0.4,
                vy: -0.6 - Math.random() * 0.9,
                life: 80 + Math.random() * 90,
                maxLife: 170,
                size: 1.1 + Math.random() * 1.6,
                flicker: Math.random() * Math.PI * 2
            });
        }
        for (let i = this.embers.length - 1; i >= 0; i--) {
            const e = this.embers[i];
            e.x += e.vx;
            e.y += e.vy;
            e.vx += (Math.random() - 0.5) * 0.05;
            e.vy += -0.005; // accelerate upward slightly
            e.flicker += 0.4;
            e.life--;
            if (e.life <= 0) this.embers.splice(i, 1);
        }

        // Spawn 2-3 large slow drifting smoke wisps per frame (original behavior)
        if (player) {
            const spawnCount = 2 + Math.floor(Math.random() * 2);
            for (let i = 0; i < spawnCount; i++) {
                this.particles.push({
                    x: player.x + (Math.random() - 0.5) * 1600,
                    y: player.y + (Math.random() - 0.5) * 1100,
                    vx: Math.cos(this.windAngle) * (0.3 + Math.random() * 0.3),
                    vy: Math.sin(this.windAngle) * (0.3 + Math.random() * 0.3),
                    life: 400 + Math.random() * 200,
                    maxLife: 600,
                    size: 8 + Math.random() * 12,
                    alpha: 0.08 + Math.random() * 0.1,
                    color: Math.random() < 0.5 ? '#8888aa' : '#555566'
                });
            }
        }

        // Update particles
        for (let i = this.particles.length - 1; i >= 0; i--) {
            const p = this.particles[i];
            p.x += p.vx;
            p.y += p.vy;
            p.life--;
            if (p.life <= 0) this.particles.splice(i, 1);
        }
    }

    draw(ctx, arena) {
        const aw = arena.width;
        const ah = arena.height;
        const t = this.t;

        // ── 1. Sodium-light vertical gradient (smog horizon) ────────────────
        const bgGrd = ctx.createLinearGradient(0, 0, 0, ah);
        bgGrd.addColorStop(0,   'rgba(20, 16, 10, 0.55)');
        bgGrd.addColorStop(0.45,'rgba(35, 28, 14, 0.40)');
        bgGrd.addColorStop(0.75,'rgba(28, 22, 12, 0.32)');
        bgGrd.addColorStop(1,   'rgba(10, 10, 14, 0.55)');
        ctx.fillStyle = bgGrd;
        ctx.fillRect(0, 0, aw, ah);

        // ── 2. Sewer grate floor pattern — sparse diagonal cross-hatch ──────
        ctx.save();
        ctx.strokeStyle = 'rgba(60, 56, 40, 0.10)';
        ctx.lineWidth = 1;
        const grateSpace = 180;
        const shift = (this.gratePhase * 60) % grateSpace;
        ctx.beginPath();
        for (let x = -grateSpace + shift; x < aw + grateSpace; x += grateSpace) {
            ctx.moveTo(x, 0);
            ctx.lineTo(x + ah, ah);
            ctx.moveTo(x + ah, 0);
            ctx.lineTo(x, ah);
        }
        ctx.stroke();
        ctx.restore();

        // ── 3. Soot pools — flat dark ellipses on floor ─────────────────────
        ctx.save();
        this.sootPools.forEach(s => {
            ctx.save();
            ctx.translate(s.x, s.y);
            ctx.rotate(s.rot);
            ctx.globalAlpha = s.alpha;
            ctx.fillStyle = '#06060a';
            ctx.beginPath();
            ctx.ellipse(0, 0, s.rx, s.ry, 0, 0, Math.PI * 2);
            ctx.fill();
            ctx.restore();
        });
        ctx.restore();

        // ── 4. Distant smokestack silhouettes on top/bottom edges ───────────
        ctx.save();
        this.chimneys.forEach(c => {
            const baseY = c.edge === 'top' ? 0 : ah;
            const sign = c.edge === 'top' ? 1 : -1;
            const topY = baseY + sign * c.height;
            const cw = c.width;

            // Stack body
            ctx.fillStyle = '#08080c';
            ctx.fillRect(c.x - cw / 2, Math.min(baseY, topY), cw, c.height);

            // Rim highlight (sodium glow)
            ctx.fillStyle = 'rgba(80, 60, 30, 0.35)';
            ctx.fillRect(c.x - cw / 2, Math.min(baseY, topY), 2, c.height);
            ctx.fillStyle = 'rgba(40, 30, 12, 0.45)';
            ctx.fillRect(c.x + cw / 2 - 2, Math.min(baseY, topY), 2, c.height);

            // Cap
            if (c.hasCap) {
                ctx.fillStyle = '#0d0d12';
                ctx.fillRect(c.x - cw / 2 - 6, topY - sign * 8, cw + 12, 8);
            }

            // Vertical plume rising from each stack
            const plumeBaseY = topY;
            const drift = Math.sin(t * 0.01 + c.puffDrift) * 14;
            for (let p = 0; p < 6; p++) {
                const phase = (t * 0.4 + c.plumePhase + p * 30) % 220;
                const py = plumeBaseY + sign * phase * 1.4;
                const px = c.x + drift + Math.sin(phase * 0.05 + c.plumePhase) * 18;
                const r = 18 + phase * 0.35;
                const alpha = 0.22 * (1 - phase / 220);
                if (alpha <= 0.005) continue;
                ctx.fillStyle = `rgba(70, 70, 80, ${alpha})`;
                ctx.beginPath();
                ctx.arc(px, py, r, 0, Math.PI * 2);
                ctx.fill();
            }
        });
        ctx.restore();

        // ── 5. Rolling fog banks — radial gradient blobs ────────────────────
        ctx.save();
        this.fogBanks.forEach(f => {
            const wob = Math.sin(t * 0.008 + f.seed) * 0.15 + 1;
            const r = f.r * wob;
            const grd = ctx.createRadialGradient(f.x, f.y, r * 0.1, f.x, f.y, r);
            grd.addColorStop(0,   `rgba(150, 150, 160, ${f.alpha})`);
            grd.addColorStop(0.5, `rgba(110, 110, 122, ${f.alpha * 0.5})`);
            grd.addColorStop(1,   'rgba(70, 70, 82, 0)');
            ctx.fillStyle = grd;
            ctx.fillRect(f.x - r, f.y - r, r * 2, r * 2);
        });
        ctx.restore();

        // ── 6. Searchlight beams — sodium cones ─────────────────────────────
        ctx.save();
        ctx.globalCompositeOperation = 'lighter';
        this.searchlights.forEach(s => {
            const ang = s.angle;
            const halfSpread = 0.18;
            const range = s.range;
            const x1 = s.cx + Math.cos(ang - halfSpread) * range;
            const y1 = s.cy + Math.sin(ang - halfSpread) * range;
            const x2 = s.cx + Math.cos(ang + halfSpread) * range;
            const y2 = s.cy + Math.sin(ang + halfSpread) * range;

            const ex = s.cx + Math.cos(ang) * range;
            const ey = s.cy + Math.sin(ang) * range;
            const lg = ctx.createLinearGradient(s.cx, s.cy, ex, ey);
            lg.addColorStop(0,   'rgba(220, 180, 90, 0.30)');
            lg.addColorStop(0.5, 'rgba(180, 140, 70, 0.14)');
            lg.addColorStop(1,   'rgba(120, 90, 40, 0)');
            ctx.fillStyle = lg;
            ctx.beginPath();
            ctx.moveTo(s.cx, s.cy);
            ctx.lineTo(x1, y1);
            ctx.lineTo(x2, y2);
            ctx.closePath();
            ctx.fill();

            // Bright core
            const cx = s.cx + Math.cos(ang) * range * 0.15;
            const cy = s.cy + Math.sin(ang) * range * 0.15;
            const cg = ctx.createRadialGradient(cx, cy, 4, cx, cy, 40);
            cg.addColorStop(0, 'rgba(255, 220, 140, 0.55)');
            cg.addColorStop(1, 'rgba(255, 200, 120, 0)');
            ctx.fillStyle = cg;
            ctx.fillRect(cx - 40, cy - 40, 80, 80);
        });
        ctx.restore();

        // ── 7. Smog wisps (existing behavior) ───────────────────────────────
        this.particles.forEach(p => {
            const lifeFade = Math.min(1, Math.min(p.life, p.maxLife - p.life) / 60);
            ctx.globalAlpha = p.alpha * lifeFade;
            ctx.fillStyle = p.color;
            ctx.beginPath();
            ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
            ctx.fill();
        });
        ctx.globalAlpha = 1;

        // ── 8. Rising embers — orange sparks with glow ──────────────────────
        ctx.save();
        ctx.globalCompositeOperation = 'lighter';
        this.embers.forEach(e => {
            const fade = Math.min(1, e.life / 60);
            const flick = 0.6 + 0.4 * Math.sin(e.flicker);
            ctx.globalAlpha = fade * flick;
            ctx.fillStyle = '#ff8030';
            ctx.shadowBlur = 8;
            ctx.shadowColor = '#ff6020';
            ctx.beginPath();
            ctx.arc(e.x, e.y, e.size, 0, Math.PI * 2);
            ctx.fill();
        });
        ctx.shadowBlur = 0;
        ctx.globalAlpha = 1;
        ctx.restore();

        // ── 9. Vignette — darken edges ──────────────────────────────────────
        ctx.save();
        const vg = ctx.createRadialGradient(aw / 2, ah / 2, Math.min(aw, ah) * 0.35,
                                            aw / 2, ah / 2, Math.max(aw, ah) * 0.7);
        vg.addColorStop(0, 'rgba(0, 0, 0, 0)');
        vg.addColorStop(1, 'rgba(0, 0, 0, 0.5)');
        ctx.fillStyle = vg;
        ctx.fillRect(0, 0, aw, ah);
        ctx.restore();
    }

    drawObstacle(ctx, obs) {
        const { x, y, w, h } = obs;
        const bev = 6;
        const seed = obs.x * 0.0071 + obs.y * 0.0137;
        const r = (i) => { const s = Math.sin(seed + i * 0.391) * 43758.5453; return s - Math.floor(s); };

        // Base — dark cracked concrete
        const grd = ctx.createLinearGradient(x, y, x + w, y + h);
        grd.addColorStop(0,   '#1f1f28');
        grd.addColorStop(0.5, '#1a1a22');
        grd.addColorStop(1,   '#13131a');
        ctx.fillStyle = grd;
        ctx.fillRect(x, y, w, h);

        ctx.save();
        ctx.beginPath(); ctx.rect(x + 1, y + 1, w - 2, h - 2); ctx.clip();

        // Horizontal crack lines
        const numCracks = 4 + (r(seed + 1) * 4 | 0);
        for (let i = 0; i < numCracks; i++) {
            const s = seed + i * 1.13;
            const ly = y + r(s) * h;
            const lx1 = x + r(s + 0.1) * w * 0.3;
            const lx2 = x + (0.6 + r(s + 0.2) * 0.4) * w;
            ctx.strokeStyle = `rgba(15, 15, 20, ${0.3 + r(s + 0.3) * 0.2})`;
            ctx.lineWidth = 1;
            ctx.beginPath();
            ctx.moveTo(lx1, ly);
            ctx.lineTo(lx2, ly + (r(s + 0.4) - 0.5) * 4);
            ctx.stroke();
        }

        // Soot stains
        const numStains = 3 + (r(seed + 7) * 4 | 0);
        for (let i = 0; i < numStains; i++) {
            const s = seed + i * 0.71;
            const sx = x + r(s) * w;
            const sy = y + r(s + 0.1) * h;
            const sw = 10 + r(s + 0.2) * 30;
            const sh = 8 + r(s + 0.3) * 20;
            ctx.fillStyle = `rgba(0, 0, 0, ${0.18 + r(s + 0.4) * 0.18})`;
            ctx.fillRect(sx, sy, sw, sh);
        }

        ctx.restore();

        // Bevel
        ctx.fillStyle = 'rgba(120, 120, 135, 0.18)';
        ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x + w, y); ctx.lineTo(x + w - bev, y + bev); ctx.lineTo(x + bev, y + bev); ctx.closePath(); ctx.fill();
        ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x + bev, y + bev); ctx.lineTo(x + bev, y + h - bev); ctx.lineTo(x, y + h); ctx.closePath(); ctx.fill();
        ctx.fillStyle = 'rgba(0,0,0,0.6)';
        ctx.beginPath(); ctx.moveTo(x, y + h); ctx.lineTo(x + w, y + h); ctx.lineTo(x + w - bev, y + h - bev); ctx.lineTo(x + bev, y + h - bev); ctx.closePath(); ctx.fill();
        ctx.beginPath(); ctx.moveTo(x + w, y); ctx.lineTo(x + w, y + h); ctx.lineTo(x + w - bev, y + h - bev); ctx.lineTo(x + w - bev, y + bev); ctx.closePath(); ctx.fill();

        ctx.strokeStyle = '#111118';
        ctx.lineWidth = 2;
        ctx.strokeRect(x, y, w, h);
    }
}

// Register
if (typeof BIOME_LOGIC === 'undefined') window.BIOME_LOGIC = {};
window.BIOME_LOGIC['smoke'] = new SmogQuarterBiome();

// #194 — DLC class must be reachable by bare-name `typeof SmogQuarterBiome` checks in base code (Boss.js, TestingGrounds.js, etc.); these checks predate the ESM migration and look up the global directly.
if (typeof window !== 'undefined') window.SmogQuarterBiome = SmogQuarterBiome;
