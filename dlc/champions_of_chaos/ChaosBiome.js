// Chaos Biome - The Void Dimension

class ChaosBiome {
    constructor() {
        this.name = "The Void";
        this.color = "#1a0b2e"; // Dark Purple Background
        this.gridColor = "#4a235a"; // Lighter Purple Grid
        this.particles = [];
        this.gravityShiftTimer = 0;
        this.gravityDir = { x: 0, y: 0 };
    }

    generate(arena) {
        // Void Layout: Sparse floating islands (obstacles) and random dark energy patches
        const w = arena.width;
        const h = arena.height;
        const cx = w / 2;
        const cy = h / 2;

        console.log("Generating Void Biome...");

        // 1. Add Void Zones (Biomes)
        // One massive central void or scattered pockets
        arena.biomeZones.push(new BiomeZone(cx - 1000, cy - 1000, 2000, 2000, 'VOID'));

        // 2. Obstacles (Floating Islands)
        // Randomly scatter rectangular blocks
        for (let i = 0; i < 15; i++) {
            const x = Math.random() * (w - 400) + 200;
            const y = Math.random() * (h - 400) + 200;
            // Avoid center spawn
            if (Math.hypot(x - cx, y - cy) > 400) {
                arena.obstacles.push(new Obstacle(x, y, 150 + Math.random() * 100, 150 + Math.random() * 100));
            }
        }

        // 3. Traps
        // Gravity Wells (custom trap logic if supported, else standard)
        // arena.traps.push(...)
    }

    update(player) {
        // Biome Effect: Shifting Gravity
        // Every 10 seconds, gravity pulls the player slightly
        this.gravityShiftTimer++;

        if (this.gravityShiftTimer > 600) {
            // Change direction
            const angle = Math.random() * Math.PI * 2;
            this.gravityDir = { x: Math.cos(angle) * 0.5, y: Math.sin(angle) * 0.5 };
            this.gravityShiftTimer = 0;
            if (typeof showNotification === 'function') showNotification("GRAVITY SHIFT!");
        }

        // Apply Gravity Force to Player
        if (this.gravityDir.x !== 0 || this.gravityDir.y !== 0) {
            player.x += this.gravityDir.x * player.speedMultiplier;
            player.y += this.gravityDir.y * player.speedMultiplier;
        }

        // Visuals
        if (Math.random() < 0.1) {
            this.particles.push({
                x: player.x + (Math.random() - 0.5) * 1000,
                y: player.y + (Math.random() - 0.5) * 1000,
                vx: (Math.random() - 0.5) * 2,
                vy: (Math.random() - 0.5) * 2,
                life: 100,
                color: Math.random() < 0.5 ? '#8e44ad' : '#000'
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
        // Draw Background Overlay
        ctx.fillStyle = "rgba(26, 11, 46, 0.2)";
        ctx.fillRect(0, 0, arena.width, arena.height); // Assuming global arena

        // Draw Particles
        this.particles.forEach(p => {
            ctx.fillStyle = p.color;
            ctx.beginPath();
            ctx.arc(p.x, p.y, Math.random() * 3, 0, Math.PI * 2);
            ctx.fill();
        });
    }
}

// Register Biome if BiomeManager exists, otherwise it might be handled by game.js logic
if (typeof BIOME_LOGIC === 'undefined') window.BIOME_LOGIC = {};
window.BIOME_LOGIC['gravity'] = new ChaosBiome();
