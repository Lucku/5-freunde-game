// #194 follow-up — explicit BiomeZone/Obstacle/Trap imports (were bare-name lookups via window shim).
import { BiomeZone, Obstacle } from '../../Arena.js';

// #194 — explicit renderer imports (was: window-shim lookup).

// The Crimson Greenhouse — Thorn's Biome
// Abandoned glass greenhouse, blood-red foliage, broken planters.

class CrimsonGreenhouseBiome {
    constructor() {
        this.name = "The Crimson Greenhouse";
        this.color = "#1a0808";
        this.gridColor = "#8b1a1a33";
        this.ownsObstacles = true;
        this.noTraps       = true; // Overgrowth — Bloom Patches are the hazard.
        this.particles = [];   // petals + leaves
        this.blooms = [];      // {x, y, radius, baseRadius, pulseTimer}
        this.motherRose = null;
        this.hangingVines = []; // {x, length, sway, swayPhase, leafSeed}
        this.climbingVines = []; // {side, y, span, seed}
        this.roseBuds = [];    // {x, y, r, hue, phase}
        this.briarPatches = []; // {x, y, r, spokes}
        this.t = 0;
    }

    generate(arena) {
        const w = arena.width, h = arena.height;
        const cx = w / 2, cy = h / 2;

        console.log("Generating Crimson Greenhouse Biome...");

        // 3-5 Bloom Patches as BiomeZones
        const patchCount = 3 + Math.floor(Math.random() * 3);
        this.blooms = [];
        for (let i = 0; i < patchCount; i++) {
            let bx, by, tries = 0;
            do {
                bx = 200 + Math.random() * (w - 400);
                by = 200 + Math.random() * (h - 400);
                tries++;
            } while (Math.hypot(bx - cx, by - cy) < 280 && tries < 12);
            const radius = 140;
            this.blooms.push({ x: bx, y: by, radius, baseRadius: radius, pulseTimer: Math.random() * 600 });
            arena.biomeZones.push(new BiomeZone(bx - radius, by - radius, radius * 2, radius * 2, 'BLOOM_PATCH'));
        }

        // Mother Rose decorative (near arena edge)
        const edge = Math.floor(Math.random() * 4);
        let mrX, mrY;
        if (edge === 0) { mrX = w * 0.5; mrY = 220; }
        else if (edge === 1) { mrX = w - 220; mrY = h * 0.5; }
        else if (edge === 2) { mrX = w * 0.5; mrY = h - 220; }
        else                 { mrX = 220; mrY = h * 0.5; }
        this.motherRose = { x: mrX, y: mrY, baseRadius: 90, pulse: 0 };

        // 12-16 obstacles: mix of round planters (small) and tall hedge clusters (large)
        const count = 12 + Math.floor(Math.random() * 5);
        for (let i = 0; i < count; i++) {
            const isPlanter = Math.random() < 0.5;
            const size = isPlanter ? 60 + Math.random() * 30 : 130 + Math.random() * 80;
            let ox, oy, tries = 0;
            do {
                ox = 150 + Math.random() * (w - 300);
                oy = 150 + Math.random() * (h - 300);
                tries++;
            } while (Math.hypot(ox - cx, oy - cy) < 280 && tries < 20);
            arena.obstacles.push(new Obstacle(ox, oy, size, isPlanter ? size : size * 1.4, isPlanter ? 'thorn-planter' : 'thorn-hedge'));
        }

        // Hanging vines from the glass roof (top band)
        this.hangingVines = [];
        const hangCount = 18;
        for (let i = 0; i < hangCount; i++) {
            this.hangingVines.push({
                x: 80 + (i / hangCount) * (w - 160) + (Math.random() - 0.5) * 40,
                length: 90 + Math.random() * 160,
                swayPhase: Math.random() * Math.PI * 2,
                swaySpeed: 0.018 + Math.random() * 0.015,
                leafSeed: Math.random() * 100,
                thornCount: 3 + Math.floor(Math.random() * 4)
            });
        }

        // Climbing wall vines down left + right edges
        this.climbingVines = [];
        for (let side = 0; side < 2; side++) {
            const x0 = side === 0 ? 0 : w;
            for (let i = 0; i < 5; i++) {
                this.climbingVines.push({
                    side,
                    x: x0,
                    y: 100 + i * (h - 200) / 5 + (Math.random() - 0.5) * 60,
                    span: 130 + Math.random() * 90,
                    seed: Math.random() * 100
                });
            }
        }

        // Scattered rose buds on the floor (24 small decorative roses)
        this.roseBuds = [];
        const budCount = 24;
        for (let i = 0; i < budCount; i++) {
            let bx, by, tries = 0;
            do {
                bx = 80 + Math.random() * (w - 160);
                by = 200 + Math.random() * (h - 400);
                tries++;
            } while (Math.hypot(bx - cx, by - cy) < 200 && tries < 8);
            this.roseBuds.push({
                x: bx, y: by,
                r: 5 + Math.random() * 4,
                hue: Math.random() < 0.6 ? '#8b1a1a' : '#c0392b',
                phase: Math.random() * Math.PI * 2
            });
        }

        // Briar patches — small jagged thorn-tangle decorations
        this.briarPatches = [];
        const briarCount = 10;
        for (let i = 0; i < briarCount; i++) {
            let bx, by, tries = 0;
            do {
                bx = 130 + Math.random() * (w - 260);
                by = 130 + Math.random() * (h - 260);
                tries++;
            } while (Math.hypot(bx - cx, by - cy) < 240 && tries < 10);
            this.briarPatches.push({
                x: bx, y: by,
                r: 25 + Math.random() * 22,
                spokes: 7 + Math.floor(Math.random() * 5),
                seed: Math.random() * 100
            });
        }
    }

    update(arena, player, enemies) {
        this.t++;

        // Petal particles
        if (Math.random() < 0.55) {
            this.particles.push({
                x: Math.random() * arena.width,
                y: -10,
                vx: (Math.random() - 0.5) * 0.45,
                vy: 0.35 + Math.random() * 0.5,
                rot: Math.random() * Math.PI,
                rotSpeed: (Math.random() - 0.5) * 0.02,
                life: 700 + Math.random() * 300,
                maxLife: 1000,
                hue: Math.random() < 0.5 ? '#c0392b' : '#7f1d1d',
                size: 4 + Math.random() * 4,
                kind: 'petal'
            });
        }
        // Falling leaf particles (slower, larger, dark green-red)
        if (Math.random() < 0.3) {
            this.particles.push({
                x: Math.random() * arena.width,
                y: -14,
                vx: (Math.random() - 0.5) * 0.7,
                vy: 0.25 + Math.random() * 0.35,
                rot: Math.random() * Math.PI * 2,
                rotSpeed: (Math.random() - 0.5) * 0.04,
                life: 900 + Math.random() * 400,
                maxLife: 1300,
                hue: Math.random() < 0.5 ? '#3a4a1a' : '#5a2412',
                size: 6 + Math.random() * 5,
                kind: 'leaf'
            });
        }
        for (let i = this.particles.length - 1; i >= 0; i--) {
            const p = this.particles[i];
            p.x += p.vx;
            p.y += p.vy;
            p.rot += p.rotSpeed;
            p.life--;
            if (p.life <= 0 || p.y > arena.height + 20) this.particles.splice(i, 1);
        }

        // Mother Rose pulse
        if (this.motherRose) this.motherRose.pulse = (Math.sin(this.t * 0.04) + 1) * 0.5;

        // Bloom Patches: pulse every 10s + radius temporarily +30%, also apply Bleed DPS
        this.blooms.forEach(b => {
            b.pulseTimer++;
            if (b.pulseTimer >= 600) b.pulseTimer = 0;
            const pulseActive = b.pulseTimer < 90; // 1.5s
            b.radius = b.baseRadius * (pulseActive ? 1.3 : 1.0);
        });

        // Apply Bleed-style DPS to enemies inside Bloom Patches (5 DPS)
        if (enemies && (this.t % 30) === 0) {
            enemies.forEach(e => {
                if (e.hp <= 0) return;
                this.blooms.forEach(b => {
                    if (Math.hypot(e.x - b.x, e.y - b.y) < b.radius) {
                        e.hp -= 2.5; // 5 DPS at 30-frame tick rate (2 ticks/sec)
                        e._biomeBleedTag = 30;
                        if (e.hp <= 0 && player && typeof player.onKill === 'function') player.onKill(e);
                    }
                });
            });
            enemies.forEach(e => { if (e._biomeBleedTag && e._biomeBleedTag > 0) e._biomeBleedTag--; });
        }

        // Sync glow with Thorn's Crimson Garden (visual)
        this.gardenActive = !!(player && player.bloodRose);
    }

    drawBackground(ctx, arena) {
        const aw = arena.width, ah = arena.height;
        const t = this.t;

        ctx.save();

        // ── Base: near-black blood-red ──────────────────────────────────────
        ctx.fillStyle = '#1a0808';
        ctx.fillRect(0, 0, aw, ah);

        // ── Cracked greenhouse glass roof (top band) ────────────────────────
        // Diamond/triangular glass panes with thick lead frames + visible cracks.
        ctx.save();
        const panelH = 140;
        const panelW = 180;
        // Sky tint through glass (slight crimson)
        const skyGrd = ctx.createLinearGradient(0, 0, 0, panelH);
        skyGrd.addColorStop(0, 'rgba(60, 18, 18, 0.55)');
        skyGrd.addColorStop(1, 'rgba(26, 8, 8, 0)');
        ctx.fillStyle = skyGrd;
        ctx.fillRect(0, 0, aw, panelH);
        // Lead frame lattice
        ctx.strokeStyle = 'rgba(80, 50, 30, 0.55)';
        ctx.lineWidth = 2;
        for (let x = 0; x <= aw; x += panelW) {
            ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, panelH); ctx.stroke();
            // Diagonals on each pane
            ctx.beginPath();
            ctx.moveTo(x, 0);
            ctx.lineTo(x + panelW / 2, panelH * 0.5);
            ctx.lineTo(x + panelW, 0);
            ctx.stroke();
        }
        ctx.beginPath(); ctx.moveTo(0, panelH * 0.5); ctx.lineTo(aw, panelH * 0.5); ctx.stroke();
        ctx.beginPath(); ctx.moveTo(0, panelH); ctx.lineTo(aw, panelH); ctx.stroke();

        // Random crack lines through 3-4 panes
        ctx.strokeStyle = 'rgba(0, 0, 0, 0.7)';
        ctx.lineWidth = 1.2;
        const crackCount = 6;
        for (let i = 0; i < crackCount; i++) {
            const seed = i * 13.37;
            const sx = (Math.sin(seed) * 0.5 + 0.5) * aw;
            const sy = (Math.sin(seed * 1.3) * 0.5 + 0.5) * panelH;
            ctx.beginPath();
            ctx.moveTo(sx, sy);
            let cx = sx, cy = sy;
            for (let j = 0; j < 4; j++) {
                cx += (Math.sin(seed + j * 7.3) * 0.5 + 0.5) * 60 - 30;
                cy += (Math.sin(seed + j * 11.7) * 0.5 + 0.5) * 40 - 20;
                ctx.lineTo(cx, cy);
            }
            ctx.stroke();
        }
        ctx.restore();

        // ── Tangled vine silhouettes growing from all four edges ────────────
        ctx.save();
        ctx.lineCap = 'round';
        const vineCount = 26;
        for (let i = 0; i < vineCount; i++) {
            const seed = i * 17.91;
            const edge = i % 4; // 0:top 1:right 2:bottom 3:left
            let sx, sy, ex, ey;
            const span = 240 + (Math.sin(seed) * 0.5 + 0.5) * 180;
            if (edge === 0)      { sx = (i / vineCount) * aw; sy = 0; ex = sx + Math.sin(seed) * 90; ey = sy + span; }
            else if (edge === 1) { sx = aw; sy = ((i + 1) / vineCount) * ah; ex = sx - span; ey = sy + Math.sin(seed) * 90; }
            else if (edge === 2) { sx = (i / vineCount) * aw; sy = ah; ex = sx + Math.sin(seed) * 90; ey = sy - span; }
            else                 { sx = 0; sy = ((i + 1) / vineCount) * ah; ex = sx + span; ey = sy + Math.sin(seed) * 90; }
            const midX = (sx + ex) / 2 + Math.sin(seed * 3.1) * 70;
            const midY = (sy + ey) / 2 + Math.cos(seed * 2.7) * 70;

            // Main vine — thicker dark stroke under, thinner highlight on top
            ctx.strokeStyle = 'rgba(20, 50, 16, 0.65)';
            ctx.lineWidth = 4;
            ctx.beginPath();
            ctx.moveTo(sx, sy);
            ctx.quadraticCurveTo(midX, midY, ex, ey);
            ctx.stroke();
            ctx.strokeStyle = 'rgba(45, 90, 30, 0.55)';
            ctx.lineWidth = 1.5;
            ctx.stroke();

            // Leaves along the vine
            for (let n = 0.18; n < 1; n += 0.18) {
                const t1 = n, t2 = n + 0.04;
                const px = (1 - t1) * (1 - t1) * sx + 2 * (1 - t1) * t1 * midX + t1 * t1 * ex;
                const py = (1 - t1) * (1 - t1) * sy + 2 * (1 - t1) * t1 * midY + t1 * t1 * ey;
                const tx = (1 - t2) * (1 - t2) * sx + 2 * (1 - t2) * t2 * midX + t2 * t2 * ex;
                const ty = (1 - t2) * (1 - t2) * sy + 2 * (1 - t2) * t2 * midY + t2 * t2 * ey;
                const ang = Math.atan2(ty - py, tx - px) + (n % 0.36 === 0 ? -1 : 1) * 1.0;
                const lLen = 9 + Math.sin(seed + n * 7) * 3;
                const lwid = 4 + Math.sin(seed + n * 4) * 1.2;
                ctx.save();
                ctx.translate(px, py);
                ctx.rotate(ang);
                ctx.fillStyle = 'rgba(40, 80, 28, 0.78)';
                ctx.beginPath();
                ctx.ellipse(lLen * 0.5, 0, lLen, lwid, 0, 0, Math.PI * 2);
                ctx.fill();
                // Leaf vein
                ctx.strokeStyle = 'rgba(20, 50, 14, 0.9)';
                ctx.lineWidth = 0.6;
                ctx.beginPath();
                ctx.moveTo(0, 0);
                ctx.lineTo(lLen, 0);
                ctx.stroke();
                ctx.restore();
            }
            // Thorn nubs
            for (let n = 0.3; n < 1; n += 0.22) {
                const nx = sx + (ex - sx) * n + Math.sin(seed + n * 5) * 6;
                const ny = sy + (ey - sy) * n + Math.cos(seed + n * 5) * 6;
                ctx.fillStyle = 'rgba(160, 30, 30, 0.75)';
                ctx.beginPath(); ctx.arc(nx, ny, 2.5, 0, Math.PI * 2); ctx.fill();
            }
        }
        ctx.restore();

        // ── Hanging vines from glass roof ──────────────────────────────────
        ctx.save();
        ctx.lineCap = 'round';
        const swayBase = t * 0.022;
        const roofH = 140; // mirrors panelH from glass-roof block
        this.hangingVines.forEach(v => {
            const sway = Math.sin(swayBase + v.swayPhase) * 8;
            const baseX = v.x;
            const tipX = baseX + sway;
            const tipY = roofH * 0.6 + v.length;
            const midX = baseX + sway * 0.5;
            const midY = roofH * 0.6 + v.length * 0.5;
            // Vine stem (dark + highlight)
            ctx.strokeStyle = 'rgba(18, 48, 14, 0.85)';
            ctx.lineWidth = 3.5;
            ctx.beginPath();
            ctx.moveTo(baseX, roofH * 0.4);
            ctx.quadraticCurveTo(midX, midY, tipX, tipY);
            ctx.stroke();
            ctx.strokeStyle = 'rgba(50, 95, 30, 0.55)';
            ctx.lineWidth = 1.4;
            ctx.stroke();

            // Leaves down the vine
            const leafCount = 5;
            for (let i = 1; i <= leafCount; i++) {
                const ti = i / (leafCount + 1);
                const lx = (1 - ti) * (1 - ti) * baseX + 2 * (1 - ti) * ti * midX + ti * ti * tipX;
                const ly = (1 - ti) * (1 - ti) * roofH * 0.4 + 2 * (1 - ti) * ti * midY + ti * ti * tipY;
                const sideSign = (i % 2 === 0) ? 1 : -1;
                ctx.save();
                ctx.translate(lx, ly);
                ctx.rotate(sideSign * 0.9 + Math.sin(swayBase * 0.6 + v.leafSeed + i) * 0.15);
                ctx.fillStyle = 'rgba(40, 80, 28, 0.8)';
                ctx.beginPath();
                ctx.ellipse(7, 0, 10, 4.5, 0, 0, Math.PI * 2);
                ctx.fill();
                ctx.restore();
            }
            // Tip flower
            ctx.fillStyle = 'rgba(139, 26, 26, 0.85)';
            ctx.beginPath();
            ctx.arc(tipX, tipY, 4, 0, Math.PI * 2);
            ctx.fill();
            ctx.fillStyle = 'rgba(192, 57, 43, 0.85)';
            ctx.beginPath();
            ctx.arc(tipX, tipY, 2, 0, Math.PI * 2);
            ctx.fill();
        });
        ctx.restore();

        // ── Edge-climbing wall vines (left + right) ────────────────────────
        ctx.save();
        ctx.lineCap = 'round';
        this.climbingVines.forEach(cv => {
            const dir = cv.side === 0 ? 1 : -1;
            const sx = cv.x;
            const sy = cv.y;
            const ex = sx + dir * cv.span;
            const ey = sy + Math.sin(cv.seed) * 60;
            const midX = (sx + ex) / 2 + dir * Math.cos(cv.seed * 1.7) * 40;
            const midY = (sy + ey) / 2 + Math.sin(cv.seed * 2.1) * 50;
            ctx.strokeStyle = 'rgba(20, 50, 16, 0.7)';
            ctx.lineWidth = 3.5;
            ctx.beginPath();
            ctx.moveTo(sx, sy);
            ctx.quadraticCurveTo(midX, midY, ex, ey);
            ctx.stroke();
            // Leaves
            for (let n = 0.2; n < 1; n += 0.25) {
                const lx = (1 - n) * (1 - n) * sx + 2 * (1 - n) * n * midX + n * n * ex;
                const ly = (1 - n) * (1 - n) * sy + 2 * (1 - n) * n * midY + n * n * ey;
                ctx.save();
                ctx.translate(lx, ly);
                ctx.rotate(Math.sin(cv.seed + n) * 1.2);
                ctx.fillStyle = 'rgba(40, 80, 28, 0.75)';
                ctx.beginPath();
                ctx.ellipse(6, 0, 9, 4, 0, 0, Math.PI * 2);
                ctx.fill();
                ctx.restore();
            }
            // Tip rose
            ctx.fillStyle = 'rgba(139, 26, 26, 0.85)';
            ctx.beginPath();
            ctx.arc(ex, ey, 4, 0, Math.PI * 2);
            ctx.fill();
        });
        ctx.restore();

        // ── Briar patches scattered on floor ────────────────────────────────
        ctx.save();
        this.briarPatches.forEach(b => {
            // Tangle of crossing thorn lines
            ctx.strokeStyle = 'rgba(60, 18, 18, 0.7)';
            ctx.lineWidth = 1.3;
            for (let i = 0; i < b.spokes; i++) {
                const a = (i / b.spokes) * Math.PI * 2 + Math.sin(b.seed + i) * 0.3;
                const r1 = b.r * (0.2 + Math.sin(b.seed * 3 + i) * 0.15);
                const r2 = b.r * (0.85 + Math.cos(b.seed + i * 0.7) * 0.15);
                ctx.beginPath();
                ctx.moveTo(b.x + Math.cos(a) * r1, b.y + Math.sin(a) * r1);
                ctx.quadraticCurveTo(
                    b.x + Math.cos(a + 0.3) * b.r * 0.6,
                    b.y + Math.sin(a + 0.3) * b.r * 0.6,
                    b.x + Math.cos(a + 0.6) * r2,
                    b.y + Math.sin(a + 0.6) * r2
                );
                ctx.stroke();
            }
            // Red thorn dots
            for (let i = 0; i < b.spokes; i++) {
                const a = (i / b.spokes) * Math.PI * 2;
                const r = b.r * 0.7;
                ctx.fillStyle = 'rgba(160, 30, 30, 0.65)';
                ctx.beginPath();
                ctx.arc(b.x + Math.cos(a) * r, b.y + Math.sin(a) * r, 1.6, 0, Math.PI * 2);
                ctx.fill();
            }
            // Central bud
            ctx.fillStyle = 'rgba(80, 12, 12, 0.85)';
            ctx.beginPath();
            ctx.arc(b.x, b.y, 4, 0, Math.PI * 2);
            ctx.fill();
        });
        ctx.restore();

        // ── Scattered rose buds on the floor ────────────────────────────────
        ctx.save();
        this.roseBuds.forEach(bud => {
            const pulse = 0.85 + 0.15 * Math.sin(t * 0.04 + bud.phase);
            // Soft halo
            const grd = ctx.createRadialGradient(bud.x, bud.y, 1, bud.x, bud.y, bud.r * 3);
            grd.addColorStop(0,   bud.hue + '60');
            grd.addColorStop(0.5, bud.hue + '18');
            grd.addColorStop(1,   'rgba(20, 0, 0, 0)');
            ctx.fillStyle = grd;
            ctx.beginPath();
            ctx.arc(bud.x, bud.y, bud.r * 3, 0, Math.PI * 2);
            ctx.fill();
            // Petals — 4 small ellipses
            for (let i = 0; i < 4; i++) {
                ctx.save();
                ctx.translate(bud.x, bud.y);
                ctx.rotate(i * Math.PI / 2 + bud.phase * 0.4);
                ctx.fillStyle = bud.hue;
                ctx.globalAlpha = 0.85 * pulse;
                ctx.beginPath();
                ctx.ellipse(0, -bud.r * 0.4, bud.r * 0.5, bud.r * 0.85, 0, 0, Math.PI * 2);
                ctx.fill();
                ctx.restore();
            }
            // Core
            ctx.fillStyle = '#3d0606';
            ctx.beginPath();
            ctx.arc(bud.x, bud.y, bud.r * 0.32, 0, Math.PI * 2);
            ctx.fill();
            // Tiny green leaf at base
            ctx.fillStyle = 'rgba(50, 90, 30, 0.85)';
            ctx.beginPath();
            ctx.ellipse(bud.x + bud.r * 0.6, bud.y + bud.r * 0.4, bud.r * 0.5, bud.r * 0.2, 0.5, 0, Math.PI * 2);
            ctx.fill();
        });
        ctx.restore();

        // ── Pulsing red veins crisscrossing arena floor ─────────────────────
        ctx.save();
        const veinPulse = 0.45 + 0.25 * Math.sin(t * 0.025);
        ctx.strokeStyle = `rgba(180, 30, 30, ${veinPulse * 0.5})`;
        ctx.shadowColor = '#c0392b';
        ctx.shadowBlur = 8;
        ctx.lineWidth = 2;
        const veinSeeds = [0.12, 0.41, 0.67, 0.83];
        veinSeeds.forEach((s, idx) => {
            const startX = Math.sin(s * 31.7) * aw * 0.4 + aw * 0.5;
            const startY = idx % 2 === 0 ? 200 : ah - 200;
            ctx.beginPath();
            ctx.moveTo(startX, startY);
            let x = startX, y = startY;
            for (let step = 0; step < 8; step++) {
                x += Math.sin(s * 7 + step * 1.7) * 180;
                y += (startY < ah / 2 ? 1 : -1) * (80 + Math.sin(s * 4 + step) * 50);
                ctx.lineTo(x, y);
            }
            ctx.stroke();
        });
        ctx.shadowBlur = 0;
        ctx.restore();

        // ── Pooling blood/sap splotches on floor ────────────────────────────
        ctx.save();
        ctx.globalAlpha = 0.55;
        const pools = [
            { x: aw * 0.22, y: ah * 0.40, r: 70 },
            { x: aw * 0.75, y: ah * 0.30, r: 50 },
            { x: aw * 0.35, y: ah * 0.75, r: 85 },
            { x: aw * 0.62, y: ah * 0.62, r: 60 },
            { x: aw * 0.48, y: ah * 0.18, r: 45 }
        ];
        pools.forEach(p => {
            const grd = ctx.createRadialGradient(p.x, p.y, 2, p.x, p.y, p.r);
            grd.addColorStop(0,   'rgba(70, 6, 6, 0.85)');
            grd.addColorStop(0.5, 'rgba(40, 3, 3, 0.55)');
            grd.addColorStop(1,   'rgba(20, 0, 0, 0)');
            ctx.fillStyle = grd;
            // Irregular blotch shape
            ctx.beginPath();
            for (let a = 0; a <= Math.PI * 2; a += Math.PI / 8) {
                const rad = p.r * (0.75 + Math.sin(a * 3 + p.x * 0.01) * 0.25);
                const px = p.x + Math.cos(a) * rad;
                const py = p.y + Math.sin(a) * rad;
                if (a === 0) ctx.moveTo(px, py);
                else ctx.lineTo(px, py);
            }
            ctx.closePath();
            ctx.fill();
        });
        ctx.restore();

        // ── Player-centered crimson radial glow ─────────────────────────────
        if (window.player) {
            const grd = ctx.createRadialGradient(window.player.x, window.player.y, 50, window.player.x, window.player.y, 600);
            grd.addColorStop(0,   'rgba(139, 26, 26, 0.22)');
            grd.addColorStop(0.5, 'rgba(139, 26, 26, 0.06)');
            grd.addColorStop(1,   'rgba(139, 26, 26, 0)');
            ctx.fillStyle = grd;
            ctx.fillRect(0, 0, aw, ah);
        }
        ctx.restore();
    }

    draw(ctx, arena) {
        const aw = arena.width, ah = arena.height;

        // Bloom Patches: dark red circular zones with red rim + thorn outline
        ctx.save();
        this.blooms.forEach(b => {
            const glow = this.gardenActive && Math.hypot(b.x - (window.player?.x || 0), b.y - (window.player?.y || 0)) < 600 ? 1.4 : 1.0;
            const grd = ctx.createRadialGradient(b.x, b.y, 10, b.x, b.y, b.radius);
            grd.addColorStop(0,   `rgba(139, 26, 26, ${0.4 * glow})`);
            grd.addColorStop(0.6, `rgba(80, 12, 12, ${0.18 * glow})`);
            grd.addColorStop(1,   'rgba(30, 5, 5, 0)');
            ctx.fillStyle = grd;
            ctx.beginPath();
            ctx.arc(b.x, b.y, b.radius, 0, Math.PI * 2);
            ctx.fill();

            // Thorn outline (jagged ring)
            ctx.strokeStyle = `rgba(192, 57, 43, ${0.55 * glow})`;
            ctx.lineWidth = 1.5;
            ctx.beginPath();
            const teeth = 18;
            for (let i = 0; i <= teeth; i++) {
                const ang = (i / teeth) * Math.PI * 2 + this.t * 0.003;
                const wob = (i % 2 === 0) ? 1 : 0.92;
                const x = b.x + Math.cos(ang) * b.radius * wob;
                const y = b.y + Math.sin(ang) * b.radius * wob;
                if (i === 0) ctx.moveTo(x, y);
                else ctx.lineTo(x, y);
            }
            ctx.stroke();
        });
        ctx.restore();

        // Mother Rose — large decorative
        if (this.motherRose) {
            const mr = this.motherRose;
            ctx.save();
            ctx.translate(mr.x, mr.y);
            const pulse = 0.85 + mr.pulse * 0.25;
            const r = mr.baseRadius * pulse;
            // Outer halo
            const grd = ctx.createRadialGradient(0, 0, 5, 0, 0, r * 2.5);
            grd.addColorStop(0,   'rgba(192, 57, 43, 0.55)');
            grd.addColorStop(0.5, 'rgba(100, 20, 20, 0.2)');
            grd.addColorStop(1,   'rgba(30, 5, 5, 0)');
            ctx.fillStyle = grd;
            ctx.beginPath();
            ctx.arc(0, 0, r * 2.5, 0, Math.PI * 2);
            ctx.fill();
            // Petals
            ctx.rotate(this.t * 0.003);
            for (let i = 0; i < 8; i++) {
                ctx.save();
                ctx.rotate(i * Math.PI / 4);
                ctx.fillStyle = `rgba(139, 26, 26, ${0.85})`;
                ctx.beginPath();
                ctx.ellipse(0, -r * 0.5, r * 0.35, r * 0.65, 0, 0, Math.PI * 2);
                ctx.fill();
                ctx.restore();
            }
            // Center bulb
            ctx.fillStyle = '#3d0606';
            ctx.beginPath();
            ctx.arc(0, 0, r * 0.25, 0, Math.PI * 2);
            ctx.fill();
            ctx.restore();
        }

        // Petal + leaf particles
        ctx.save();
        this.particles.forEach(p => {
            ctx.save();
            ctx.translate(p.x, p.y);
            ctx.rotate(p.rot);
            ctx.globalAlpha = Math.min(1, p.life / 150) * 0.85;
            if (p.kind === 'leaf') {
                // Pointed leaf with central vein
                ctx.fillStyle = p.hue;
                ctx.beginPath();
                ctx.ellipse(0, 0, p.size, p.size * 0.4, 0, 0, Math.PI * 2);
                ctx.fill();
                ctx.strokeStyle = 'rgba(20, 50, 14, 0.85)';
                ctx.lineWidth = 0.7;
                ctx.beginPath();
                ctx.moveTo(-p.size, 0);
                ctx.lineTo(p.size, 0);
                ctx.stroke();
            } else {
                ctx.fillStyle = p.hue;
                ctx.beginPath();
                ctx.ellipse(0, 0, p.size, p.size * 0.45, 0, 0, Math.PI * 2);
                ctx.fill();
            }
            ctx.restore();
        });
        ctx.restore();

        // Faint horizontal glass-pane reflections (top edge)
        ctx.save();
        ctx.globalAlpha = 0.08;
        ctx.strokeStyle = '#c0392b';
        ctx.lineWidth = 1;
        for (let i = 0; i < 5; i++) {
            const yy = 80 + i * 40;
            ctx.beginPath();
            ctx.moveTo(0, yy);
            ctx.lineTo(aw, yy);
            ctx.stroke();
        }
        ctx.restore();

        // Reckoning red overlay
        if (window.player && window.player.reckoningActive) {
            ctx.save();
            ctx.globalAlpha = 0.18 + Math.sin(this.t * 0.12) * 0.06;
            ctx.fillStyle = '#5a0808';
            ctx.fillRect(0, 0, aw, ah);
            ctx.restore();
        }
    }

    drawObstacle(ctx, obs) {
        const { x, y, w, h } = obs;
        const bev = 5;
        const isPlanter = obs.biomeType === 'thorn-planter';

        if (isPlanter) {
            // Terracotta planter with bloom cap
            const grd = ctx.createLinearGradient(x, y, x, y + h);
            grd.addColorStop(0,   '#5a2418');
            grd.addColorStop(0.6, '#3d1a0e');
            grd.addColorStop(1,   '#2a0e08');
            ctx.fillStyle = grd;
            ctx.fillRect(x, y, w, h);

            // Bloom cap on top
            ctx.fillStyle = '#8b1a1a';
            ctx.beginPath();
            ctx.ellipse(x + w / 2, y + 6, w * 0.45, 8, 0, 0, Math.PI * 2);
            ctx.fill();
            ctx.fillStyle = '#c0392b';
            ctx.beginPath();
            ctx.ellipse(x + w / 2, y + 4, w * 0.35, 5, 0, 0, Math.PI * 2);
            ctx.fill();

            // Vine curls on sides
            ctx.strokeStyle = 'rgba(60, 100, 30, 0.55)';
            ctx.lineWidth = 2;
            ctx.beginPath();
            ctx.moveTo(x + 4, y + h * 0.5);
            ctx.quadraticCurveTo(x - 4, y + h * 0.7, x + 6, y + h * 0.9);
            ctx.stroke();
            ctx.beginPath();
            ctx.moveTo(x + w - 4, y + h * 0.4);
            ctx.quadraticCurveTo(x + w + 4, y + h * 0.6, x + w - 6, y + h * 0.85);
            ctx.stroke();
        } else {
            // Hedge cluster: deep green-red with thorn highlights
            const grd = ctx.createLinearGradient(x, y, x + w, y + h);
            grd.addColorStop(0,   '#3a1818');
            grd.addColorStop(0.5, '#2a1010');
            grd.addColorStop(1,   '#170808');
            ctx.fillStyle = grd;
            ctx.fillRect(x, y, w, h);

            // Jagged vine top edge
            ctx.save();
            ctx.beginPath();
            ctx.rect(x, y, w, h);
            ctx.clip();
            ctx.strokeStyle = 'rgba(139, 26, 26, 0.5)';
            ctx.lineWidth = 1.5;
            const seed = x * 0.013 + y * 0.029;
            const rn = (i) => { const s = Math.sin(seed + i * 0.47) * 43758.5453; return s - Math.floor(s); };
            for (let i = 0; i < 8; i++) {
                const sx = x + rn(i) * w;
                const sy = y + rn(i + 0.5) * h;
                const len = 10 + rn(i + 0.7) * 18;
                const ang = rn(i + 0.9) * Math.PI * 2;
                ctx.beginPath();
                ctx.moveTo(sx, sy);
                ctx.lineTo(sx + Math.cos(ang) * len, sy + Math.sin(ang) * len);
                ctx.stroke();
            }
            // Thorn highlights (red dots)
            for (let i = 0; i < 6; i++) {
                ctx.fillStyle = 'rgba(192, 57, 43, 0.65)';
                const tx = x + rn(i + 2) * w;
                const ty = y + rn(i + 2.5) * h;
                ctx.beginPath();
                ctx.arc(tx, ty, 2, 0, Math.PI * 2);
                ctx.fill();
            }
            ctx.restore();
        }

        // Bevel — dark red top-left, near-black bottom-right
        ctx.fillStyle = 'rgba(120, 30, 30, 0.40)';
        ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x + w, y); ctx.lineTo(x + w - bev, y + bev); ctx.lineTo(x + bev, y + bev); ctx.closePath(); ctx.fill();
        ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x + bev, y + bev); ctx.lineTo(x + bev, y + h - bev); ctx.lineTo(x, y + h); ctx.closePath(); ctx.fill();
        ctx.fillStyle = 'rgba(10, 4, 4, 0.65)';
        ctx.beginPath(); ctx.moveTo(x, y + h); ctx.lineTo(x + w, y + h); ctx.lineTo(x + w - bev, y + h - bev); ctx.lineTo(x + bev, y + h - bev); ctx.closePath(); ctx.fill();
        ctx.beginPath(); ctx.moveTo(x + w, y); ctx.lineTo(x + w, y + h); ctx.lineTo(x + w - bev, y + h - bev); ctx.lineTo(x + w - bev, y + bev); ctx.closePath(); ctx.fill();

        ctx.strokeStyle = '#1a0808';
        ctx.lineWidth = 2;
        ctx.strokeRect(x, y, w, h);
    }
}

if (typeof BIOME_LOGIC === 'undefined') window.BIOME_LOGIC = {};
window.BIOME_LOGIC['thorn'] = new CrimsonGreenhouseBiome();
