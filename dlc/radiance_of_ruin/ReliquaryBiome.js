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
