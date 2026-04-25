// The Fractured Reality - Void Reaver's Biome

class FracturedBiome {
    constructor() {
        this.name = "Fractured Reality";
        this.color = "#000000"; // Pitch Black
        this.gridColor = "#00bcd4"; // Cyan Grid
        this.particles = [];
        this.pulseTimer = 0;
    }

    generate(arena) {
        // Layout: Random Geometric shapes and "Error" zones
        const w = arena.width;
        const h = arena.height;

        console.log("Generating Fractured Biome...");

        // 1. Glitch Zones
        for (let i = 0; i < 5; i++) {
            arena.biomeZones.push(new BiomeZone(Math.random() * w, Math.random() * h, 300, 300, 'GLITCH'));
        }

        // 2. Obstacles (Floating Code Blocks)
        for (let i = 0; i < 20; i++) {
            const x = Math.random() * (w - 100);
            const y = Math.random() * (h - 100);
            arena.obstacles.push(new Obstacle(x, y, 50, 200, 'void'));
            arena.obstacles.push(new Obstacle(x + 60, y + 50, 200, 50, 'void'));
        }
    }

    update(arena, player) {
        // Biome Effect: Screen Tearing / Random Teleportation of enemies
        this.pulseTimer++;

        if (this.pulseTimer > 300) { // Every 5s
            if (Math.random() < 0.3) {
                // GLITCH: Teleport player slightly
                player.x += (Math.random() - 0.5) * 200;
                player.y += (Math.random() - 0.5) * 200;
                if (typeof showNotification === 'function') showNotification("REALITY ERR_CONNECTION_RESET", "#f00");
            }
            this.pulseTimer = 0;
        }

        // Visuals: Binary Rain / Squares
        // Increase density and ensure they spawn around player correctly
        // Since update(arena, player) was likely previously update(player), the args were mismatched.

        if (player && Math.random() < 0.4) {
            this.particles.push({
                x: player.x + (Math.random() - 0.5) * 1400,
                y: player.y + (Math.random() - 0.5) * 900,
                vx: 0,
                vy: 5 + Math.random() * 5, // Falling speed
                life: 120,
                color: Math.random() < 0.2 ? '#fff' : (Math.random() < 0.5 ? '#00bcd4' : '#0f0'),
                char: Math.random() > 0.5 ? '1' : '0',
                size: 10 + Math.random() * 10
            });
        }

        // Update particles
        for (let i = this.particles.length - 1; i >= 0; i--) {
            let p = this.particles[i];
            p.x += p.vx;
            p.y += p.vy;
            p.life--;

            // Random Glitch: Change char
            if (Math.random() < 0.1) p.char = Math.random() > 0.5 ? '1' : '0';

            if (p.life <= 0) this.particles.splice(i, 1);
        }
    }

    draw(ctx, arena) {
        // Draw Particles (Matrix Rain)
        const isGlitch = (Math.random() < 0.05);
        ctx.font = isGlitch ? "bold 16px Courier New" : "14px monospace";

        this.particles.forEach(p => {
            const alpha = Math.min(1, p.life / 20);
            ctx.fillStyle = p.color; // Reset color
            ctx.globalAlpha = alpha;

            if (isGlitch) {
                ctx.shadowBlur = 5;
                ctx.shadowColor = p.color;
            }

            // Fix: fillText uses current fillStyle
            ctx.fillText(p.char, p.x, p.y);

            ctx.shadowBlur = 0;
        });
        ctx.globalAlpha = 1;
    }

    drawObstacle(ctx, obs) {
        const { x, y, w, h } = obs;
        const bev = 6;
        const seed = obs.x * 0.0071 + obs.y * 0.0137;
        const r = (i) => { const s = Math.sin(seed + i * 0.391) * 43758.5453; return s - Math.floor(s); };

        // Base: near-black with faint cyan tinge
        const grd = ctx.createLinearGradient(x, y, x + w, y + h);
        grd.addColorStop(0,   '#010a0a');
        grd.addColorStop(0.5, '#010606');
        grd.addColorStop(1,   '#000303');
        ctx.fillStyle = grd;
        ctx.fillRect(x, y, w, h);

        ctx.save();
        ctx.beginPath(); ctx.rect(x + 1, y + 1, w - 2, h - 2); ctx.clip();

        // Glitch pixel blocks — seeded cyan/white rectangles
        const numBlocks = 5 + (r(seed + 1) * 7 | 0);
        for (let i = 0; i < numBlocks; i++) {
            const s = seed + i * 0.79;
            const bx = x + r(s)       * w;
            const by = y + r(s + 0.1) * h;
            const bw = 3 + r(s + 0.2) * 14;
            const bh = 1 + r(s + 0.3) * 5;
            const isBright = r(s + 0.4) > 0.55;
            ctx.fillStyle = isBright
                ? `rgba(255,255,255,${0.12 + r(s + 0.5) * 0.18})`
                : `rgba(0,188,212,${0.15 + r(s + 0.5) * 0.25})`;
            ctx.fillRect(bx, by, bw, bh);
        }

        // Scanline artifacts — thin horizontal cyan lines
        const numLines = 3 + (r(seed + 9) * 4 | 0);
        for (let i = 0; i < numLines; i++) {
            const s = seed + i * 1.31;
            const ly = y + r(s) * h;
            ctx.fillStyle = `rgba(0,188,212,${0.08 + r(s + 0.1) * 0.10})`;
            ctx.fillRect(x, ly, w, 1);
        }

        // Cyan edge glow strips
        ctx.fillStyle = 'rgba(0,188,212,0.10)';
        ctx.fillRect(x,         y, 2, h);
        ctx.fillRect(x + w - 2, y, 2, h);
        ctx.fillRect(x, y,         w, 2);
        ctx.fillRect(x, y + h - 2, w, 2);

        ctx.restore();

        // Bevel: cyan tint
        ctx.fillStyle = 'rgba(0,160,180,0.18)';
        ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x + w, y); ctx.lineTo(x + w - bev, y + bev); ctx.lineTo(x + bev, y + bev); ctx.closePath(); ctx.fill();
        ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x + bev, y + bev); ctx.lineTo(x + bev, y + h - bev); ctx.lineTo(x, y + h); ctx.closePath(); ctx.fill();
        ctx.fillStyle = 'rgba(0,0,0,0.60)';
        ctx.beginPath(); ctx.moveTo(x, y + h); ctx.lineTo(x + w, y + h); ctx.lineTo(x + w - bev, y + h - bev); ctx.lineTo(x + bev, y + h - bev); ctx.closePath(); ctx.fill();
        ctx.beginPath(); ctx.moveTo(x + w, y); ctx.lineTo(x + w, y + h); ctx.lineTo(x + w - bev, y + h - bev); ctx.lineTo(x + w - bev, y + bev); ctx.closePath(); ctx.fill();

        ctx.strokeStyle = '#00bcd4';
        ctx.lineWidth = 1.5;
        ctx.strokeRect(x, y, w, h);
    }
}

// Register
if (typeof BIOME_LOGIC === 'undefined') window.BIOME_LOGIC = {};
window.BIOME_LOGIC['void'] = new FracturedBiome();
