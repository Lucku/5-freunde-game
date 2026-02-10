// Madness Biome Logic
// Associated with Chance Hero
// Theme: High Contrast, Glitches, Random Hazards, Neon

class MadnessBiome {
    constructor() {
        this.name = "Madness";
        this.color = "#ff00ff"; // Base Magenta
        this.gridOffset = 0;
        this.glitchTimer = 0;
        this.zones = []; // Dangerous zones
    }

    update() {
        // Dynamic Hazards: Glitch Zones
        // Occasionally, a random area of the screen becomes 'corrupted' dealing damage

        // 1. Manage Zones
        if (window.frame % 180 === 0) { // Every 3 seconds
            // Create a new glitch zone
            this.zones.push({
                x: Math.random() * window.canvas.width,
                y: Math.random() * window.canvas.height,
                w: 100 + Math.random() * 200,
                h: 100 + Math.random() * 200,
                life: 300, // 5 seconds
                active: false,
                warningColor: "rgba(255, 0, 255, 0.2)",
                activeColor: "rgba(255, 0, 255, 0.8)"
            });
        }

        // 2. Update Zones
        for (let i = this.zones.length - 1; i >= 0; i--) {
            let z = this.zones[i];
            z.life--;

            // Warning Phase (First 2 seconds = 120 frames)
            if (z.life > 180) {
                z.active = false;
            } else {
                z.active = true;
            }

            // Damage Logic
            if (z.active && typeof player !== 'undefined') {
                if (player.x > z.x && player.x < z.x + z.w &&
                    player.y > z.y && player.y < z.y + z.h) {

                    // Damage Player if inside
                    if (window.frame % 30 === 0 && !player.invincibleTimer) {
                        player.takeDamage(5); // Chip damage
                        if (typeof showNotification === 'function') showNotification("MADNESS!", "#ff00ff");
                    }
                }
            }

            if (z.life <= 0) {
                this.zones.splice(i, 1);
            }
        }

        // Glitch Effect
        if (Math.random() < 0.05) {
            this.glitchTimer = 5;
        }
        if (this.glitchTimer > 0) this.glitchTimer--;
    }

    draw(ctx, arena) {
        const cam = arena.camera || { x: 0, y: 0, width: window.canvas.width, height: window.canvas.height };

        // Background is handled by Arena.draw via getHeroTheme('chance')

        // Moving Grid
        this.gridOffset = (this.gridOffset + 0.5) % 50;

        ctx.lineWidth = 1;
        ctx.save();
        ctx.strokeStyle = "rgba(255, 0, 255, 0.3)";

        // Vertical lines based on camera
        // Start from cam.x, snap to grid
        const startX = Math.floor(cam.x / 50) * 50;
        // Shift by offset (needs modulo with 50 relative to world)
        // Simple approach: grid is stationary in world, moving offset animation is separate?
        // Actually, previous code: x = this.gridOffset; x < width. That was screen space moving grid.
        // Let's keep it "moving" by scrolling in screen space but mapped to world coordinates if possible,
        // OR just draw it covering the camera view.

        // Let's implement a world-space grid that moves slightly to create the "unstable" effect
        // or just screen space grid mapped to camera rect.

        const gridShift = this.gridOffset;

        // Vertical
        for (let x = cam.x - (cam.x % 50) + gridShift - 50; x < cam.x + cam.width; x += 50) {
            ctx.beginPath();
            ctx.moveTo(x, cam.y);
            ctx.lineTo(x, cam.y + cam.height);
            ctx.stroke();
        }

        // Horizontal
        for (let y = cam.y - (cam.y % 50) + gridShift - 50; y < cam.y + cam.height; y += 50) {
            ctx.beginPath();
            ctx.moveTo(cam.x, y);
            ctx.lineTo(cam.x + cam.width, y);
            ctx.stroke();
        }
        ctx.restore();

        // Draw Glitch Zones
        this.zones.forEach(z => {
            if (z.active) {
                // Active Damage State: Static/Noise
                ctx.fillStyle = z.activeColor;
                ctx.fillRect(z.x, z.y, z.w, z.h);

                // Add noise
                for (let i = 0; i < 10; i++) {
                    const nx = z.x + Math.random() * z.w;
                    const ny = z.y + Math.random() * z.h;
                    ctx.fillStyle = Math.random() > 0.5 ? "#fff" : "#000";
                    ctx.fillRect(nx, ny, 10, 2);
                }
            } else {
                // Warning State
                ctx.fillStyle = z.warningColor;
                ctx.fillRect(z.x, z.y, z.w, z.h);
                ctx.strokeStyle = "#ff00ff";
                ctx.strokeRect(z.x, z.y, z.w, z.h);

                // Text
                ctx.fillStyle = "#fff";
                ctx.font = "12px monospace";
                ctx.fillText("WARNING: REALITY FAILURE", z.x + 5, z.y + 15);
            }
        });

        // Global Glitch Overlay
        if (this.glitchTimer > 0) {
            ctx.save();
            ctx.globalCompositeOperation = "exclusion";
            ctx.fillStyle = Math.random() > 0.5 ? "rgba(0, 255, 255, 0.5)" : "rgba(255, 0, 255, 0.5)";
            ctx.fillRect(cam.x, cam.y + Math.random() * cam.height, cam.width, 50);
            ctx.restore();
        }
    }
}

if (typeof window.BIOME_LOGIC === 'undefined') window.BIOME_LOGIC = {};
window.BIOME_LOGIC['chance'] = new MadnessBiome();
