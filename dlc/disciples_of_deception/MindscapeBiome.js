// The Mindscape - Psycho's Biome

class MindscapeBiome {
    constructor() {
        this.name = "The Mindscape";
        this.color = "#0a1a18";
        this.gridColor = "#1abc9c";
        this.particles = [];
        this.glitchTimer = 0;
        this.obstacleSeeds = [];
    }

    generate(arena) {
        const w = arena.width;
        const h = arena.height;
        const cx = w / 2;
        const cy = h / 2;

        console.log("Generating Mindscape Biome...");

        // Fracture Zone covering most of arena
        arena.biomeZones.push(new BiomeZone(cx - 900, cy - 700, 1800, 1400, 'FRACTURE'));

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
        // Background tint
        ctx.fillStyle = "rgba(10, 26, 24, 0.35)";
        ctx.fillRect(0, 0, arena.width, arena.height);

        // Particles
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
