// The Smog Quarter - Smoke's Biome

class SmogQuarterBiome {
    constructor() {
        this.name = "The Smog Quarter";
        this.color = "#0f0f14";
        this.gridColor = "#5a5a6e";
        this.particles = [];
        this.windAngle = 0;
        this.windShiftTimer = 0;
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
    }

    update(arena, player) {
        this.windShiftTimer++;

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

        // Spawn 2-3 large slow drifting smoke wisps per frame
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
        // Heavy global gray haze overlay
        ctx.fillStyle = "rgba(15, 15, 20, 0.35)";
        ctx.fillRect(0, 0, arena.width, arena.height);

        // Smog wisps
        this.particles.forEach(p => {
            const lifeFade = Math.min(1, Math.min(p.life, p.maxLife - p.life) / 60);
            ctx.globalAlpha = p.alpha * lifeFade;
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
