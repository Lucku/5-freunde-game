class SoundBiome {
    constructor() {
        this.name = "Sound";
        this.color = "#4fc3f7"; // Light Blue
    }

    generate(arena) {
        // Sound Plains are generally open but have "Null Zones" where sound is dampened
        // or "Amp Zones" where it is amplified.

        // Add Amp Zones (Boosts Sound Hero, Damages others?)
        // Let's keep it visual for now or minor mechanics
    }

    drawBackground(ctx, arena) {
        // Visual Style: Sound Plains - Equalizers, Rings, Grid

        const cam = arena.camera;
        const cellSize = 300; // Smaller grid

        const sx = Math.floor(cam.x / cellSize) * cellSize;
        const sy = Math.floor(cam.y / cellSize) * cellSize;
        const ex = sx + cam.width + cellSize;
        const ey = sy + cam.height + cellSize;

        const time = Date.now() / 1000;
        // Access global state or assume 1.0
        const beatPulse = (window.SYMPHONY_STATE && window.SYMPHONY_STATE.onBeat) ? 1.5 : 1.0;

        ctx.save();

        // 1. Digital Grid Overlay (Pulse on beat)
        if (beatPulse > 1.2) {
            ctx.strokeStyle = "rgba(41, 182, 246, 0.4)";
        } else {
            ctx.strokeStyle = "rgba(41, 182, 246, 0.1)";
        }
        ctx.lineWidth = 1;
        ctx.beginPath();
        for (let x = sx; x <= ex; x += cellSize) {
            ctx.moveTo(x, sy); ctx.lineTo(x, ey);
        }
        for (let y = sy; y <= ey; y += cellSize) {
            ctx.moveTo(sx, y); ctx.lineTo(ex, y);
        }
        ctx.stroke();

        for (let x = sx; x <= ex; x += cellSize) {
            for (let y = sy; y <= ey; y += cellSize) {
                // Procedural generation
                const hash = Math.sin(x * 12.9898 + y * 78.233) * 43758.5453;
                const val = hash - Math.floor(hash);

                // 2. Frequency Bars (Rising from 'ground')
                if (val > 0.6) {
                    const cx = x + cellSize / 2;
                    const cy = y + cellSize / 2;

                    const height = 20 + Math.abs(Math.sin(time * 5 + val * 10)) * 50 * beatPulse;
                    const width = 10 + val * 20;

                    ctx.fillStyle = "rgba(79, 195, 247, 0.4)"; // Bright Blue
                    ctx.fillRect(cx - width / 2, cy + height / 2, width, -height);
                }

                // 3. Floating Notes
                if (val > 0.9) {
                    const cx = x + (val * 999) % cellSize;
                    const cy = y + (val * 888) % cellSize + Math.sin(time + val * 5) * 20;
                    ctx.fillStyle = "rgba(1, 87, 155, 0.3)";
                    ctx.font = "20px Arial";
                    ctx.fillText("♫", cx, cy);
                }

                // 2. Concentric Ground Rings (Speakers)
                if (val < 0.3) {
                    const cx = x + (val * 900) % cellSize;
                    const cy = y + (val * 200) % cellSize;

                    const ringSize = (30 + Math.sin(time * 2) * 5) * beatPulse;

                    ctx.strokeStyle = "rgba(0, 188, 212, 0.1)";
                    ctx.lineWidth = 4;
                    ctx.beginPath();
                    ctx.arc(cx, cy, ringSize, 0, Math.PI * 2);
                    ctx.stroke();

                    ctx.beginPath();
                    ctx.arc(cx, cy, ringSize * 0.6, 0, Math.PI * 2);
                    ctx.stroke();
                }
            }
        }
        ctx.restore();
    }

    update(arena, player, enemies) {
        // Biome Effects
        if (window.SYMPHONY_STATE && window.SYMPHONY_STATE.onBeat) {
            // Maybe small pushback on enemies? Or just visual.
        }

        // If the player is Sound Hero, they might get a speed boost on beat? 
        // Already handled in SoundHero.update via damage/speed stats.
    }
}

// Register
if (typeof window.BIOME_LOGIC === 'undefined') window.BIOME_LOGIC = {};
window.BIOME_LOGIC['sound'] = new SoundBiome();
// Also register as match for LEVEL_CONFIG key
window.BIOME_LOGIC['SOUND_PLAINS'] = window.BIOME_LOGIC['sound'];
