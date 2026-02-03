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
            arena.obstacles.push(new Obstacle(x, y, 50, 200)); // Tall thin blocks
            arena.obstacles.push(new Obstacle(x + 60, y + 50, 200, 50)); // Wide flat blocks
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
}

// Register
if (typeof BIOME_LOGIC === 'undefined') window.BIOME_LOGIC = {};
window.BIOME_LOGIC['void'] = new FracturedBiome();
