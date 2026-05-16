// #194 — explicit renderer imports (was: window-shim lookup).

// The Reliquary — Light's Biome
// Vaulted museum hall after closing, gold dust shafts, marble pedestals.

class ReliquaryBiome {
    constructor() {
        this.name = "The Reliquary";
        this.color = "#1a1308";
        this.gridColor = "#f1c40f33";
        this.ownsObstacles = true; // Skip Arena's default layout — biome places its own.
        this.noTraps       = true; // Sacral hall — no mechanical traps.
        this.particles = [];
        this.shafts = [];      // {x, y, radius, brightness, baseY, height}
        this.chandeliers = []; // {x, ceilingY, chainLen, orbs:[{a,r}], swayPhase, swaySpeed, flicker}
        this.candles    = []; // {x, y, h, flickerPhase}
        this.medallions = []; // {x, y, r, rotPhase} — floor eye-of-providence mandalas
        this.banners    = []; // {x, y, w, h, hue, swayPhase}
        this.shrines    = []; // {x, y, edge} — small alcove mask icons along edges
        this.sunbursts  = []; // {x, y, r, rays, rotPhase}
        this.embers     = []; // gold particles drifting upward
        this.roseWindow = null;
        this.pulseTimer = 0;
        this.t = 0;
        this.unveilTint = 0; // 0..1 — lerp to warm white during Unveiling
    }

    generate(arena) {
        const w = arena.width, h = arena.height;
        const cx = w / 2, cy = h / 2;

        console.log("Generating Reliquary Biome...");

        // 3-4 Light Shafts as BiomeZones (heal + regen)
        const shaftCount = 3 + (Math.random() < 0.5 ? 1 : 0);
        this.shafts = [];
        for (let i = 0; i < shaftCount; i++) {
            let sx, sy, attempts = 0;
            do {
                sx = 250 + Math.random() * (w - 500);
                sy = 250 + Math.random() * (h - 500);
                attempts++;
            } while (Math.hypot(sx - cx, sy - cy) < 250 && attempts < 12);
            const radius = 120;
            this.shafts.push({ x: sx, y: sy, radius, brightness: 0.5, height: 600 });
            arena.biomeZones.push(new BiomeZone(sx - radius, sy - radius, radius * 2, radius * 2, 'LIGHT_SHAFT'));
        }

        // 10-14 large square/marble pedestals/display cases, roughly symmetric rows
        const count = 10 + Math.floor(Math.random() * 5);
        const rowSpacing = (h - 400) / 4;
        for (let i = 0; i < count; i++) {
            const row = i % 4;
            const col = Math.floor(i / 4);
            const baseX = 250 + col * 380 + (Math.random() - 0.5) * 80;
            const baseY = 250 + row * rowSpacing + (Math.random() - 0.5) * 60;
            const size = 100 + Math.random() * 60;
            if (Math.hypot(baseX - cx, baseY - cy) < 300) continue;
            arena.obstacles.push(new Obstacle(baseX, baseY, size, size, 'light'));
        }

        // Hanging chandeliers — 6 across the top half, swaying
        this.chandeliers = [];
        const chandCount = 6;
        for (let i = 0; i < chandCount; i++) {
            const px = (i + 0.5) * (w / chandCount) + (Math.random() - 0.5) * 80;
            const py = 90 + Math.random() * 60;
            const chainLen = 60 + Math.random() * 70;
            const orbCount = 6;
            const orbs = [];
            const radius = 26 + Math.random() * 10;
            for (let k = 0; k < orbCount; k++) {
                orbs.push({ a: (k / orbCount) * Math.PI * 2, r: radius });
            }
            this.chandeliers.push({
                x: px,
                ceilingY: py,
                chainLen,
                orbs,
                ringRadius: radius,
                swayPhase: Math.random() * Math.PI * 2,
                swaySpeed: 0.015 + Math.random() * 0.012,
                flickerPhase: Math.random() * Math.PI * 2
            });
        }

        // Candle clusters — 18 small floor candles scattered around perimeter
        this.candles = [];
        const candleCount = 22;
        for (let i = 0; i < candleCount; i++) {
            let candX, candY, tries = 0;
            do {
                candX = 120 + Math.random() * (w - 240);
                candY = 200 + Math.random() * (h - 400);
                tries++;
            } while (Math.hypot(candX - cx, candY - cy) < 240 && tries < 8);
            this.candles.push({
                x: candX, y: candY,
                h: 14 + Math.random() * 8,
                flickerPhase: Math.random() * Math.PI * 2
            });
        }

        // Eye-of-providence floor medallions — 7 spread across non-center floor
        this.medallions = [];
        const medCount = 7;
        for (let i = 0; i < medCount; i++) {
            let mx, my, tries = 0;
            do {
                mx = 200 + Math.random() * (w - 400);
                my = 200 + Math.random() * (h - 400);
                tries++;
            } while (Math.hypot(mx - cx, my - cy) < 280 && tries < 12);
            this.medallions.push({
                x: mx, y: my,
                r: 50 + Math.random() * 22,
                rotPhase: Math.random() * Math.PI * 2,
                blinkPhase: Math.random() * Math.PI * 2
            });
        }

        // Hanging banners — 4 vertical banners draped between arches
        this.banners = [];
        const archCount = 6;
        const archW = w / archCount;
        const bannerSlots = [1, 2, 3, 4]; // skip outermost
        bannerSlots.forEach((slot, idx) => {
            const bx = slot * archW;
            this.banners.push({
                x: bx,
                y: 90,
                w: 38,
                h: 220 + idx * 18,
                hue: idx % 2 === 0 ? '#7a1a1a' : '#a8741e',
                swayPhase: Math.random() * Math.PI * 2
            });
        });

        // Edge mask shrines — 8 alcoves with mask iconography
        this.shrines = [];
        const shrinePositions = [
            { x: 70, y: h * 0.30, edge: 3 },
            { x: 70, y: h * 0.70, edge: 3 },
            { x: w - 70, y: h * 0.30, edge: 1 },
            { x: w - 70, y: h * 0.70, edge: 1 },
            { x: w * 0.25, y: 80, edge: 0 },
            { x: w * 0.75, y: 80, edge: 0 },
            { x: w * 0.25, y: h - 80, edge: 2 },
            { x: w * 0.75, y: h - 80, edge: 2 }
        ];
        shrinePositions.forEach(s => this.shrines.push({ ...s, flickerPhase: Math.random() * Math.PI * 2 }));

        // Sunburst inlays — 4 large radiant patterns at quarter-points
        this.sunbursts = [];
        const sbSpots = [
            { x: w * 0.25, y: h * 0.5 },
            { x: w * 0.75, y: h * 0.5 },
            { x: w * 0.5,  y: h * 0.25 },
            { x: w * 0.5,  y: h * 0.75 }
        ];
        sbSpots.forEach((p, i) => {
            this.sunbursts.push({
                x: p.x, y: p.y,
                r: 100,
                rays: 16,
                rotPhase: i * Math.PI * 0.3
            });
        });

        // Large rose window centered above arches
        this.roseWindow = {
            x: w * 0.5,
            y: 80,
            r: 95,
            pulsePhase: 0
        };
    }

    update(arena, player, enemies) {
        this.t++;
        this.pulseTimer++;

        // Dust mote particle spawn (2-3 per frame, slow downward drift)
        if (Math.random() < 0.6) {
            for (let i = 0; i < 2; i++) {
                this.particles.push({
                    x: Math.random() * arena.width,
                    y: -10,
                    vx: (Math.random() - 0.5) * 0.15,
                    vy: 0.25 + Math.random() * 0.4,
                    life: 600 + Math.random() * 300,
                    maxLife: 900,
                    size: 1 + Math.random() * 2,
                    alpha: 0.25 + Math.random() * 0.3
                });
            }
        }
        // Update particles
        for (let i = this.particles.length - 1; i >= 0; i--) {
            const p = this.particles[i];
            p.x += p.vx;
            p.y += p.vy;
            p.life--;
            if (p.life <= 0 || p.y > arena.height + 20) this.particles.splice(i, 1);
        }

        // Gold embers — rise from candle clusters (occasional)
        if (Math.random() < 0.35 && this.candles.length) {
            const c = this.candles[Math.floor(Math.random() * this.candles.length)];
            this.embers.push({
                x: c.x + (Math.random() - 0.5) * 6,
                y: c.y - c.h,
                vx: (Math.random() - 0.5) * 0.25,
                vy: -0.45 - Math.random() * 0.35,
                life: 200 + Math.random() * 150,
                maxLife: 350,
                size: 1.4 + Math.random() * 1.4,
                phase: Math.random() * Math.PI * 2
            });
        }
        for (let i = this.embers.length - 1; i >= 0; i--) {
            const e = this.embers[i];
            e.x += e.vx + Math.sin(this.t * 0.05 + e.phase) * 0.15;
            e.y += e.vy;
            e.vy *= 0.995;
            e.life--;
            if (e.life <= 0) this.embers.splice(i, 1);
        }

        // Rose window pulse phase
        if (this.roseWindow) this.roseWindow.pulsePhase = Math.sin(this.t * 0.03);

        // Shaft pulse every 12s → bright flash + heal all allies inside
        if (this.pulseTimer >= 720) {
            this.pulseTimer = 0;
            this.shafts.forEach(s => { s.brightness = 1.5; });
            const allies = [player, window.player2].filter(p => p && p.hp > 0);
            allies.forEach(p => {
                this.shafts.forEach(s => {
                    if (Math.hypot(p.x - s.x, p.y - s.y) < s.radius) {
                        p.hp = Math.min(p.maxHp || p.hp + 5, p.hp + 5);
                    }
                });
            });
        }
        // Decay shaft brightness
        this.shafts.forEach(s => { s.brightness = Math.max(0.5, s.brightness * 0.97); });

        // Per-frame: ally regen inside shafts (1 HP/sec; Light gets +2 Integrity/sec extra)
        if ((this.t % 60) === 0) {
            const allies = [player, window.player2].filter(p => p && p.hp > 0);
            allies.forEach(p => {
                this.shafts.forEach(s => {
                    if (Math.hypot(p.x - s.x, p.y - s.y) < s.radius) {
                        p.hp = Math.min(p.maxHp || p.hp + 1, p.hp + 1);
                        if (p.type === 'light' && typeof p.integrity === 'number') {
                            p.integrity = Math.min(p.maxIntegrity || 100, p.integrity + 2);
                        }
                    }
                });
            });
        }

        // Unveiling tint lerp
        const unveiling = player && player.unveilingActive;
        const target = unveiling ? 1 : 0;
        this.unveilTint += (target - this.unveilTint) * 0.04;

        // Revelation arena outline tagging (visual hook)
        if (player && player.revelationActive && enemies) {
            enemies.forEach(e => { if (e.hp > 0) e._reliquaryGoldOutline = 6; });
        }
        if (enemies) {
            enemies.forEach(e => {
                if (e._reliquaryGoldOutline && e._reliquaryGoldOutline > 0) e._reliquaryGoldOutline--;
            });
        }
    }

    drawBackground(ctx, arena) {
        const aw = arena.width, ah = arena.height;
        const t = this.t;

        ctx.save();

        // ── Base fill: deep amber-black, lerping to warm-white during Unveiling ──
        const r = Math.floor(0x1a + (0xff - 0x1a) * this.unveilTint);
        const g = Math.floor(0x13 + (0xf8 - 0x13) * this.unveilTint);
        const b = Math.floor(0x08 + (0xc8 - 0x08) * this.unveilTint);
        ctx.fillStyle = `rgb(${r}, ${g}, ${b})`;
        ctx.fillRect(0, 0, aw, ah);

        // ── Marble floor tile grid — large 300px squares with thin gold seams ──
        ctx.save();
        ctx.globalAlpha = 0.18;
        ctx.strokeStyle = '#8a6a1a';
        ctx.lineWidth = 1.5;
        const tile = 300;
        for (let x = 0; x <= aw; x += tile) {
            ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, ah); ctx.stroke();
        }
        for (let y = 0; y <= ah; y += tile) {
            ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(aw, y); ctx.stroke();
        }
        // Diamond gold inlay at every other tile intersection
        ctx.globalAlpha = 0.30;
        ctx.fillStyle = '#d4af37';
        for (let x = tile; x < aw; x += tile * 2) {
            for (let y = tile; y < ah; y += tile * 2) {
                ctx.beginPath();
                ctx.moveTo(x, y - 6); ctx.lineTo(x + 6, y);
                ctx.lineTo(x, y + 6); ctx.lineTo(x - 6, y);
                ctx.closePath();
                ctx.fill();
            }
        }
        ctx.restore();

        // ── Vaulted cathedral arches along top edge ──────────────────────────
        ctx.save();
        const archCount = 6;
        const archW = aw / archCount;
        const archH = 160;
        ctx.fillStyle = 'rgba(20, 14, 6, 0.65)';
        ctx.strokeStyle = 'rgba(212, 175, 55, 0.35)';
        ctx.lineWidth = 1.5;
        for (let i = 0; i < archCount; i++) {
            const cx = i * archW + archW / 2;
            ctx.beginPath();
            ctx.moveTo(i * archW, 0);
            ctx.lineTo(i * archW, archH * 0.4);
            ctx.quadraticCurveTo(cx, archH * 1.4, (i + 1) * archW, archH * 0.4);
            ctx.lineTo((i + 1) * archW, 0);
            ctx.closePath();
            ctx.fill();
            ctx.stroke();
            // Stained-glass center medallion
            ctx.fillStyle = 'rgba(241, 196, 15, 0.18)';
            ctx.beginPath();
            ctx.arc(cx, archH * 0.55, 22, 0, Math.PI * 2);
            ctx.fill();
            ctx.fillStyle = 'rgba(20, 14, 6, 0.65)';
        }
        // Mirror arches along bottom edge (inverted)
        for (let i = 0; i < archCount; i++) {
            const cx = i * archW + archW / 2;
            ctx.beginPath();
            ctx.moveTo(i * archW, ah);
            ctx.lineTo(i * archW, ah - archH * 0.4);
            ctx.quadraticCurveTo(cx, ah - archH * 1.4, (i + 1) * archW, ah - archH * 0.4);
            ctx.lineTo((i + 1) * archW, ah);
            ctx.closePath();
            ctx.fill();
            ctx.stroke();
        }
        ctx.restore();

        // ── Streaming god-rays from arches ───────────────────────────────────
        ctx.save();
        ctx.globalCompositeOperation = 'lighter';
        for (let i = 0; i < archCount; i++) {
            const cx = i * archW + archW / 2;
            const sway = Math.sin(t * 0.005 + i * 0.7) * 30;
            const grd = ctx.createLinearGradient(cx + sway, 0, cx + sway * 0.5, ah * 0.6);
            grd.addColorStop(0,   'rgba(255, 235, 150, 0.10)');
            grd.addColorStop(0.5, 'rgba(241, 196, 15, 0.04)');
            grd.addColorStop(1,   'rgba(241, 196, 15, 0)');
            ctx.fillStyle = grd;
            ctx.beginPath();
            ctx.moveTo(cx + sway - 40, archH * 0.6);
            ctx.lineTo(cx + sway + 40, archH * 0.6);
            ctx.lineTo(cx + sway * 0.5 + 180, ah * 0.7);
            ctx.lineTo(cx + sway * 0.5 - 180, ah * 0.7);
            ctx.closePath();
            ctx.fill();
        }
        ctx.restore();

        // ── Rose window above arches (centered, top edge) ────────────────────
        if (this.roseWindow) {
            const rw = this.roseWindow;
            const pulse = 0.9 + rw.pulsePhase * 0.1;
            ctx.save();
            ctx.translate(rw.x, rw.y);
            // Outer halo
            const halo = ctx.createRadialGradient(0, 0, 5, 0, 0, rw.r * 1.8);
            halo.addColorStop(0,   'rgba(255, 230, 140, 0.45)');
            halo.addColorStop(0.5, 'rgba(241, 196, 15, 0.18)');
            halo.addColorStop(1,   'rgba(20, 14, 6, 0)');
            ctx.fillStyle = halo;
            ctx.beginPath();
            ctx.arc(0, 0, rw.r * 1.8, 0, Math.PI * 2);
            ctx.fill();
            // Outer ring
            ctx.strokeStyle = 'rgba(212, 175, 55, 0.7)';
            ctx.lineWidth = 2.5;
            ctx.beginPath();
            ctx.arc(0, 0, rw.r * pulse, 0, Math.PI * 2);
            ctx.stroke();
            // Petals — 12 stained-glass wedges in alternating hues
            const petals = 12;
            const wedgeHues = ['#e67e22', '#9b1c1c', '#2c5d9b', '#d4af37'];
            for (let i = 0; i < petals; i++) {
                const a0 = (i / petals) * Math.PI * 2;
                const a1 = ((i + 1) / petals) * Math.PI * 2;
                ctx.fillStyle = wedgeHues[i % wedgeHues.length];
                ctx.globalAlpha = 0.55;
                ctx.beginPath();
                ctx.moveTo(0, 0);
                ctx.arc(0, 0, rw.r * 0.92, a0, a1);
                ctx.closePath();
                ctx.fill();
                ctx.globalAlpha = 1;
                // Lead lines between petals
                ctx.strokeStyle = 'rgba(20, 14, 6, 0.6)';
                ctx.lineWidth = 1.4;
                ctx.beginPath();
                ctx.moveTo(0, 0);
                ctx.lineTo(Math.cos(a0) * rw.r * 0.92, Math.sin(a0) * rw.r * 0.92);
                ctx.stroke();
            }
            // Inner ring
            ctx.strokeStyle = 'rgba(212, 175, 55, 0.9)';
            ctx.lineWidth = 2;
            ctx.beginPath();
            ctx.arc(0, 0, rw.r * 0.4, 0, Math.PI * 2);
            ctx.stroke();
            // Center bright bulb
            const core = ctx.createRadialGradient(0, 0, 1, 0, 0, rw.r * 0.35);
            core.addColorStop(0, 'rgba(255, 250, 200, 0.95)');
            core.addColorStop(1, 'rgba(241, 196, 15, 0)');
            ctx.fillStyle = core;
            ctx.beginPath();
            ctx.arc(0, 0, rw.r * 0.35, 0, Math.PI * 2);
            ctx.fill();
            ctx.restore();
        }

        // ── Hanging banners (vertical tapestries between arches) ─────────────
        ctx.save();
        const bannerSway = t * 0.012;
        this.banners.forEach(b => {
            const sway = Math.sin(bannerSway + b.swayPhase) * 4;
            ctx.save();
            ctx.translate(b.x + sway * 0.3, b.y);
            // Hanging rod
            ctx.fillStyle = '#8a6a1a';
            ctx.fillRect(-b.w / 2 - 8, -4, b.w + 16, 4);
            // Cloth body
            const grd = ctx.createLinearGradient(-b.w / 2, 0, b.w / 2, 0);
            grd.addColorStop(0,   '#220a06');
            grd.addColorStop(0.5, b.hue);
            grd.addColorStop(1,   '#220a06');
            ctx.fillStyle = grd;
            ctx.beginPath();
            ctx.moveTo(-b.w / 2, 0);
            ctx.lineTo(b.w / 2, 0);
            ctx.lineTo(b.w / 2 + sway, b.h);
            ctx.lineTo(0 + sway, b.h + 10);
            ctx.lineTo(-b.w / 2 + sway, b.h);
            ctx.closePath();
            ctx.fill();
            // Gold trim border
            ctx.strokeStyle = 'rgba(212, 175, 55, 0.85)';
            ctx.lineWidth = 1.2;
            ctx.stroke();
            // Central gold sigil — eye
            ctx.fillStyle = 'rgba(241, 196, 15, 0.9)';
            ctx.beginPath();
            ctx.ellipse(sway * 0.5, b.h * 0.45, 7, 4, 0, 0, Math.PI * 2);
            ctx.fill();
            ctx.fillStyle = '#1a1308';
            ctx.beginPath();
            ctx.arc(sway * 0.5, b.h * 0.45, 2, 0, Math.PI * 2);
            ctx.fill();
            // Tassels at bottom
            ctx.strokeStyle = '#d4af37';
            ctx.lineWidth = 1;
            for (let k = -2; k <= 2; k++) {
                ctx.beginPath();
                ctx.moveTo(k * 7 + sway, b.h + 8);
                ctx.lineTo(k * 7 + sway, b.h + 18);
                ctx.stroke();
            }
            ctx.restore();
        });
        ctx.restore();

        // ── Sunburst inlays on floor (radiant gold) ─────────────────────────
        ctx.save();
        ctx.globalCompositeOperation = 'lighter';
        this.sunbursts.forEach(sb => {
            ctx.save();
            ctx.translate(sb.x, sb.y);
            ctx.rotate(sb.rotPhase + t * 0.001);
            // Soft halo
            const halo = ctx.createRadialGradient(0, 0, 5, 0, 0, sb.r * 1.3);
            halo.addColorStop(0,   'rgba(255, 230, 140, 0.18)');
            halo.addColorStop(0.7, 'rgba(212, 175, 55, 0.06)');
            halo.addColorStop(1,   'rgba(0, 0, 0, 0)');
            ctx.fillStyle = halo;
            ctx.beginPath();
            ctx.arc(0, 0, sb.r * 1.3, 0, Math.PI * 2);
            ctx.fill();
            // Rays
            ctx.strokeStyle = 'rgba(241, 196, 15, 0.4)';
            ctx.lineWidth = 1.4;
            for (let i = 0; i < sb.rays; i++) {
                const a = (i / sb.rays) * Math.PI * 2;
                const r1 = sb.r * 0.35;
                const r2 = sb.r * (i % 2 === 0 ? 1.0 : 0.7);
                ctx.beginPath();
                ctx.moveTo(Math.cos(a) * r1, Math.sin(a) * r1);
                ctx.lineTo(Math.cos(a) * r2, Math.sin(a) * r2);
                ctx.stroke();
            }
            // Inner disc
            ctx.fillStyle = 'rgba(212, 175, 55, 0.35)';
            ctx.beginPath();
            ctx.arc(0, 0, sb.r * 0.28, 0, Math.PI * 2);
            ctx.fill();
            ctx.restore();
        });
        ctx.restore();

        // ── Eye-of-providence floor medallions ──────────────────────────────
        ctx.save();
        this.medallions.forEach(m => {
            const blink = 0.85 + 0.15 * Math.sin(t * 0.025 + m.blinkPhase);
            ctx.save();
            ctx.translate(m.x, m.y);
            ctx.rotate(m.rotPhase);
            // Outer dark inlay ring
            ctx.strokeStyle = 'rgba(212, 175, 55, 0.55)';
            ctx.lineWidth = 1.5;
            ctx.beginPath();
            ctx.arc(0, 0, m.r, 0, Math.PI * 2);
            ctx.stroke();
            // Triangle outer frame
            ctx.beginPath();
            for (let i = 0; i < 3; i++) {
                const a = (i / 3) * Math.PI * 2 - Math.PI / 2;
                const px = Math.cos(a) * m.r * 0.85;
                const py = Math.sin(a) * m.r * 0.85;
                if (i === 0) ctx.moveTo(px, py);
                else ctx.lineTo(px, py);
            }
            ctx.closePath();
            ctx.stroke();
            // Eye ellipse + iris
            ctx.fillStyle = `rgba(255, 248, 200, ${0.7 * blink})`;
            ctx.beginPath();
            ctx.ellipse(0, 0, m.r * 0.45, m.r * 0.22, 0, 0, Math.PI * 2);
            ctx.fill();
            ctx.fillStyle = `rgba(212, 175, 55, ${0.85 * blink})`;
            ctx.beginPath();
            ctx.arc(0, 0, m.r * 0.18, 0, Math.PI * 2);
            ctx.fill();
            ctx.fillStyle = '#1a1308';
            ctx.beginPath();
            ctx.arc(0, 0, m.r * 0.08, 0, Math.PI * 2);
            ctx.fill();
            // Eight tiny outer dots (decorative)
            for (let i = 0; i < 8; i++) {
                const a = (i / 8) * Math.PI * 2;
                ctx.fillStyle = 'rgba(212, 175, 55, 0.7)';
                ctx.beginPath();
                ctx.arc(Math.cos(a) * m.r * 0.7, Math.sin(a) * m.r * 0.7, 1.4, 0, Math.PI * 2);
                ctx.fill();
            }
            ctx.restore();
        });
        ctx.restore();

        // ── Edge mask shrines ──────────────────────────────────────────────
        ctx.save();
        this.shrines.forEach(s => {
            const flicker = 0.85 + 0.15 * Math.sin(t * 0.08 + s.flickerPhase);
            ctx.save();
            ctx.translate(s.x, s.y);
            // Niche/alcove behind mask
            ctx.fillStyle = 'rgba(20, 14, 6, 0.85)';
            ctx.beginPath();
            ctx.rect(-22, -28, 44, 56);
            ctx.fill();
            ctx.strokeStyle = 'rgba(212, 175, 55, 0.65)';
            ctx.lineWidth = 1.5;
            ctx.stroke();
            // Top arch
            ctx.beginPath();
            ctx.arc(0, -28, 22, Math.PI, 0);
            ctx.stroke();
            // Mask glyph
            ctx.fillStyle = `rgba(241, 196, 15, ${0.85 * flicker})`;
            // Forehead
            ctx.beginPath();
            ctx.ellipse(0, -8, 12, 8, 0, 0, Math.PI * 2);
            ctx.fill();
            // Cheeks
            ctx.beginPath();
            ctx.ellipse(0, 4, 11, 12, 0, 0, Math.PI * 2);
            ctx.fill();
            // Eye slits
            ctx.fillStyle = '#1a1308';
            ctx.beginPath();
            ctx.ellipse(-4, -2, 2.2, 1.2, 0, 0, Math.PI * 2);
            ctx.fill();
            ctx.beginPath();
            ctx.ellipse(4, -2, 2.2, 1.2, 0, 0, Math.PI * 2);
            ctx.fill();
            // Candle pair beneath shrine
            ctx.fillStyle = '#e8d8a8';
            ctx.fillRect(-7, 16, 2, 8);
            ctx.fillRect(5, 16, 2, 8);
            // Tiny flames
            ctx.fillStyle = `rgba(255, 220, 100, ${0.9 * flicker})`;
            ctx.beginPath(); ctx.arc(-6, 14, 1.6, 0, Math.PI * 2); ctx.fill();
            ctx.beginPath(); ctx.arc(6, 14, 1.6, 0, Math.PI * 2); ctx.fill();
            ctx.restore();
        });
        ctx.restore();

        // ── Stained-glass color puddles on floor (orange/red/blue) ───────────
        ctx.save();
        ctx.globalAlpha = 0.22;
        const puddles = [
            { x: aw * 0.18, y: ah * 0.30, r: 90, hue: '#e67e22' },
            { x: aw * 0.78, y: ah * 0.32, r: 75, hue: '#9b1c1c' },
            { x: aw * 0.30, y: ah * 0.72, r: 80, hue: '#2c5d9b' },
            { x: aw * 0.65, y: ah * 0.78, r: 95, hue: '#a8741e' },
            { x: aw * 0.50, y: ah * 0.45, r: 110, hue: '#d4af37' }
        ];
        puddles.forEach(p => {
            const grd = ctx.createRadialGradient(p.x, p.y, 5, p.x, p.y, p.r);
            grd.addColorStop(0, p.hue);
            grd.addColorStop(1, 'rgba(0, 0, 0, 0)');
            ctx.fillStyle = grd;
            ctx.beginPath(); ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2); ctx.fill();
        });
        ctx.restore();

        // ── Player-centered gold radial glow ─────────────────────────────────
        if (window.player) {
            const grd = ctx.createRadialGradient(window.player.x, window.player.y, 50, window.player.x, window.player.y, 600);
            grd.addColorStop(0,   'rgba(241, 196, 15, 0.18)');
            grd.addColorStop(0.5, 'rgba(241, 196, 15, 0.05)');
            grd.addColorStop(1,   'rgba(241, 196, 15, 0)');
            ctx.fillStyle = grd;
            ctx.fillRect(0, 0, aw, ah);
        }
        ctx.restore();
    }

    draw(ctx, arena) {
        const aw = arena.width, ah = arena.height;
        const t = this.t;

        // ── Hanging chandeliers (sway + flicker, foreground) ───────────────
        ctx.save();
        this.chandeliers.forEach(c => {
            const sway = Math.sin(t * c.swaySpeed + c.swayPhase) * 6;
            const flicker = 0.85 + 0.15 * Math.sin(t * 0.18 + c.flickerPhase);
            const hubX = c.x + sway;
            const hubY = c.ceilingY + c.chainLen;
            // Chain (single line from ceiling to hub)
            ctx.strokeStyle = 'rgba(120, 100, 50, 0.85)';
            ctx.lineWidth = 1.5;
            ctx.beginPath();
            ctx.moveTo(c.x, c.ceilingY);
            ctx.lineTo(hubX, hubY);
            ctx.stroke();
            // Hub disc
            ctx.fillStyle = '#8a6a1a';
            ctx.beginPath();
            ctx.arc(hubX, hubY, 6, 0, Math.PI * 2);
            ctx.fill();
            // Outer ring (chandelier frame)
            ctx.strokeStyle = 'rgba(212, 175, 55, 0.85)';
            ctx.lineWidth = 1.6;
            ctx.beginPath();
            ctx.arc(hubX, hubY, c.ringRadius, 0, Math.PI * 2);
            ctx.stroke();
            // Orb candles around ring
            c.orbs.forEach((o, i) => {
                const oa = o.a + Math.sin(t * 0.02 + c.swayPhase + i) * 0.02;
                const ox = hubX + Math.cos(oa) * o.r;
                const oy = hubY + Math.sin(oa) * o.r;
                // Glow halo
                const glow = ctx.createRadialGradient(ox, oy, 0, ox, oy, 20);
                glow.addColorStop(0,   `rgba(255, 230, 140, ${0.7 * flicker})`);
                glow.addColorStop(0.5, `rgba(241, 196, 15, ${0.25 * flicker})`);
                glow.addColorStop(1,   'rgba(241, 196, 15, 0)');
                ctx.save();
                ctx.globalCompositeOperation = 'lighter';
                ctx.fillStyle = glow;
                ctx.beginPath();
                ctx.arc(ox, oy, 20, 0, Math.PI * 2);
                ctx.fill();
                ctx.restore();
                // Flame core
                ctx.fillStyle = `rgba(255, 240, 180, ${0.95 * flicker})`;
                ctx.beginPath();
                ctx.arc(ox, oy, 2.2, 0, Math.PI * 2);
                ctx.fill();
            });
            // Central pendant teardrop
            ctx.fillStyle = 'rgba(212, 175, 55, 0.85)';
            ctx.beginPath();
            ctx.ellipse(hubX, hubY + 8, 4, 8, 0, 0, Math.PI * 2);
            ctx.fill();
        });
        ctx.restore();

        // ── Floor candles (taper + flame) ──────────────────────────────────
        ctx.save();
        this.candles.forEach(c => {
            const flicker = 0.85 + 0.15 * Math.sin(t * 0.22 + c.flickerPhase);
            // Taper body
            ctx.fillStyle = '#e8d8a8';
            ctx.fillRect(c.x - 1.8, c.y - c.h, 3.6, c.h);
            // Wax drip highlight
            ctx.fillStyle = 'rgba(255, 245, 200, 0.75)';
            ctx.fillRect(c.x - 1.8, c.y - c.h, 1, c.h);
            // Flame glow
            const glow = ctx.createRadialGradient(c.x, c.y - c.h - 3, 0, c.x, c.y - c.h - 3, 18);
            glow.addColorStop(0,   `rgba(255, 230, 130, ${0.7 * flicker})`);
            glow.addColorStop(0.5, `rgba(241, 196, 15, ${0.22 * flicker})`);
            glow.addColorStop(1,   'rgba(241, 196, 15, 0)');
            ctx.save();
            ctx.globalCompositeOperation = 'lighter';
            ctx.fillStyle = glow;
            ctx.beginPath();
            ctx.arc(c.x, c.y - c.h - 3, 18, 0, Math.PI * 2);
            ctx.fill();
            ctx.restore();
            // Flame teardrop
            ctx.fillStyle = `rgba(255, 235, 150, ${0.95 * flicker})`;
            ctx.beginPath();
            ctx.ellipse(c.x, c.y - c.h - 3, 1.6, 3.5 * flicker, 0, 0, Math.PI * 2);
            ctx.fill();
            ctx.fillStyle = `rgba(255, 200, 80, ${0.9 * flicker})`;
            ctx.beginPath();
            ctx.arc(c.x, c.y - c.h - 1.5, 1, 0, Math.PI * 2);
            ctx.fill();
        });
        ctx.restore();

        // ── Gold embers (rising from candles) ──────────────────────────────
        ctx.save();
        ctx.globalCompositeOperation = 'lighter';
        this.embers.forEach(e => {
            ctx.globalAlpha = Math.min(1, e.life / 80) * 0.9;
            const grd = ctx.createRadialGradient(e.x, e.y, 0, e.x, e.y, e.size * 4);
            grd.addColorStop(0,   'rgba(255, 240, 170, 0.95)');
            grd.addColorStop(0.5, 'rgba(241, 196, 15, 0.35)');
            grd.addColorStop(1,   'rgba(241, 196, 15, 0)');
            ctx.fillStyle = grd;
            ctx.beginPath();
            ctx.arc(e.x, e.y, e.size * 4, 0, Math.PI * 2);
            ctx.fill();
            ctx.fillStyle = '#fff7c0';
            ctx.beginPath();
            ctx.arc(e.x, e.y, e.size, 0, Math.PI * 2);
            ctx.fill();
        });
        ctx.globalAlpha = 1;
        ctx.restore();

        // ── Light shafts: vertical translucent gold cones + floor disc ──
        ctx.save();
        ctx.globalCompositeOperation = 'lighter';
        this.shafts.forEach(s => {
            const intensity = s.brightness;
            // Cone (top tapers narrow, widens to radius at floor)
            const grd = ctx.createLinearGradient(s.x, s.y - s.height, s.x, s.y);
            grd.addColorStop(0,   `rgba(255, 230, 120, 0)`);
            grd.addColorStop(0.5, `rgba(255, 220, 110, ${0.12 * intensity})`);
            grd.addColorStop(1,   `rgba(255, 220, 110, ${0.22 * intensity})`);
            ctx.fillStyle = grd;
            ctx.beginPath();
            ctx.moveTo(s.x - 20, s.y - s.height);
            ctx.lineTo(s.x + 20, s.y - s.height);
            ctx.lineTo(s.x + s.radius, s.y);
            ctx.lineTo(s.x - s.radius, s.y);
            ctx.closePath();
            ctx.fill();

            // Floor disc
            const discGrd = ctx.createRadialGradient(s.x, s.y, 5, s.x, s.y, s.radius);
            discGrd.addColorStop(0,   `rgba(255, 240, 160, ${0.45 * intensity})`);
            discGrd.addColorStop(0.6, `rgba(241, 196, 15, ${0.18 * intensity})`);
            discGrd.addColorStop(1,   'rgba(241, 196, 15, 0)');
            ctx.fillStyle = discGrd;
            ctx.beginPath();
            ctx.arc(s.x, s.y, s.radius, 0, Math.PI * 2);
            ctx.fill();
        });
        ctx.restore();

        // ── Dust motes ─────────────────────────────────────────────────
        ctx.save();
        this.particles.forEach(p => {
            ctx.globalAlpha = p.alpha * Math.min(1, p.life / 100);
            ctx.fillStyle = '#fff7c0';
            ctx.beginPath();
            ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
            ctx.fill();
        });
        ctx.restore();

        // ── Civilian Form vignette (desaturation pull) ─────────────────
        if (window.player && window.player.civilianForm) {
            ctx.save();
            ctx.globalAlpha = 0.35;
            const cv = ctx.createRadialGradient(window.player.x, window.player.y, 100, window.player.x, window.player.y, 800);
            cv.addColorStop(0, 'rgba(70, 70, 70, 0)');
            cv.addColorStop(1, 'rgba(40, 40, 40, 0.65)');
            ctx.fillStyle = cv;
            ctx.fillRect(0, 0, aw, ah);
            ctx.restore();
        }
    }

    drawObstacle(ctx, obs) {
        const { x, y, w, h } = obs;
        const bev = 6;

        // Base — cream marble with horizontal vein striations
        const grd = ctx.createLinearGradient(x, y, x + w, y + h);
        grd.addColorStop(0,   '#e8d8a8');
        grd.addColorStop(0.5, '#d6c89a');
        grd.addColorStop(1,   '#b8a874');
        ctx.fillStyle = grd;
        ctx.fillRect(x, y, w, h);

        // Veins
        ctx.save();
        ctx.beginPath(); ctx.rect(x + 1, y + 1, w - 2, h - 2); ctx.clip();
        const seed = x * 0.013 + y * 0.027;
        const r = (i) => { const s = Math.sin(seed + i * 0.41) * 43758.5453; return s - Math.floor(s); };
        ctx.strokeStyle = 'rgba(120, 90, 40, 0.30)';
        ctx.lineWidth = 1;
        for (let i = 0; i < 5; i++) {
            const yy = y + 8 + r(i) * (h - 16);
            ctx.beginPath();
            ctx.moveTo(x, yy);
            for (let xx = 0; xx <= w; xx += 12) {
                const wobble = Math.sin((xx + seed * 20) * 0.05 + i) * 2;
                ctx.lineTo(x + xx, yy + wobble);
            }
            ctx.stroke();
        }
        ctx.restore();

        // Bevel — cream top-left, dark amber bottom-right
        ctx.fillStyle = 'rgba(255, 245, 200, 0.55)';
        ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x + w, y); ctx.lineTo(x + w - bev, y + bev); ctx.lineTo(x + bev, y + bev); ctx.closePath(); ctx.fill();
        ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x + bev, y + bev); ctx.lineTo(x + bev, y + h - bev); ctx.lineTo(x, y + h); ctx.closePath(); ctx.fill();
        ctx.fillStyle = 'rgba(58, 40, 16, 0.55)';
        ctx.beginPath(); ctx.moveTo(x, y + h); ctx.lineTo(x + w, y + h); ctx.lineTo(x + w - bev, y + h - bev); ctx.lineTo(x + bev, y + h - bev); ctx.closePath(); ctx.fill();
        ctx.beginPath(); ctx.moveTo(x + w, y); ctx.lineTo(x + w, y + h); ctx.lineTo(x + w - bev, y + h - bev); ctx.lineTo(x + w - bev, y + bev); ctx.closePath(); ctx.fill();

        // Gold inlay edges (museum trim)
        ctx.strokeStyle = 'rgba(241, 196, 15, 0.7)';
        ctx.lineWidth = 1.5;
        ctx.strokeRect(x + 4, y + 4, w - 8, h - 8);

        // Border
        ctx.strokeStyle = '#8a6a1a';
        ctx.lineWidth = 1.5;
        ctx.strokeRect(x, y, w, h);
    }
}

if (typeof BIOME_LOGIC === 'undefined') window.BIOME_LOGIC = {};
window.BIOME_LOGIC['light'] = new ReliquaryBiome();
