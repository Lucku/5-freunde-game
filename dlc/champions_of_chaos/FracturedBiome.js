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

    update(player) {
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
        if (Math.random() < 0.2) {
            this.particles.push({
                x: player.x + (Math.random() - 0.5) * 1200,
                y: player.y + (Math.random() - 0.5) * 800,
                vx: 0,
                vy: 5 + Math.random() * 5, // Falling
                life: 60,
                color: Math.random() < 0.5 ? '#00bcd4' : '#0f0',
                char: Math.random() > 0.5 ? '1' : '0'
            });
        }

        // Update particles
        for (let i = this.particles.length - 1; i >= 0; i--) {
            let p = this.particles[i];
            p.x += p.vx;
            p.y += p.vy;
            p.life--;
            if (p.life <= 0) this.particles.splice(i, 1);
        }
    }

    draw(ctx) {
        // Draw Particles (Matrix Rain)
        ctx.font = "12px monospace";
        this.particles.forEach(p => {
            ctx.fillStyle = p.color;
            ctx.fillText(p.char, p.x, p.y);
        });
    }
}

// Register
if (typeof BIOME_LOGIC === 'undefined') window.BIOME_LOGIC = {};
window.BIOME_LOGIC['void'] = new FracturedBiome();
