// Temple of Balance Biome Logic
// Associated with Spirit Hero
// Theme: Peaceful, Sacred Geometry, Lanterns, Sanctuaries

class TempleBiome {
    constructor() {
        this.name = "Temple of Balance";
        this.color = "#F0D080";
        this.lanterns = [];
        this.sanctuaries = [];
        this.patternOffset = 0;
    }

    generate(arena) {
        // Called when biome switches to this
        this.lanterns = [];
        this.sanctuaries = [];
        console.log("[TempleBiome] Generated.");
    }

    update(arena, player, enemies) {
        this.patternOffset = (this.patternOffset + 0.2) % 100;

        // 1. Spawn Lanterns (Passive visuals that float up)
        if (Math.random() < 0.02) {
            // Spawn relative to player or camera center
            const cx = (arena && arena.camera) ? arena.camera.x + arena.camera.width / 2 : (player ? player.x : 0);
            const cy = (arena && arena.camera) ? arena.camera.y + arena.camera.height : (player ? player.y : 0);

            this.lanterns.push({
                x: cx + (Math.random() - 0.5) * 800,
                y: cy + 100, // Below screen
                vx: (Math.random() - 0.5) * 0.5,
                vy: -0.5 - Math.random() * 1.0,
                size: 5 + Math.random() * 5,
                life: 600
            });
        }

        // Update Lanterns
        for (let i = this.lanterns.length - 1; i >= 0; i--) {
            let l = this.lanterns[i];
            l.x += l.vx;
            l.y += l.vy;
            l.life--;
            if (l.life <= 0) this.lanterns.splice(i, 1);
        }

        // 2. Sanctuary Zones (Safe Havens)
        // Similar to Madness zones, but they HEAL or provide buffs
        if (window.frame % 600 === 0) { // Rare: Every 10 seconds
            const spawnW = arena.width || 2000;
            const spawnH = arena.height || 2000;
            this.sanctuaries.push({
                x: Math.random() * (spawnW - 200),
                y: Math.random() * (spawnH - 200),
                r: 100,
                life: 600 // 10 seconds
            });
        }

        for (let i = this.sanctuaries.length - 1; i >= 0; i--) {
            let s = this.sanctuaries[i];
            s.life--;

            // Effect: Heal / Peace gain
            if (typeof player !== 'undefined') {
                const dist = Math.hypot(player.x - (s.x + s.r), player.y - (s.y + s.r));
                if (dist < s.r) {
                    if (window.frame % 60 === 0) {
                        if (player.hp < player.maxHp) {
                            player.hp += 5;
                            if (typeof createTextEffect !== 'undefined') createTextEffect(player.x, player.y - 20, "+5 HP", "#00ff00");
                        }
                        // Spirit Hero Synergy
                        if (player.innerPeace !== undefined && player.innerPeace < player.maxInnerPeace) {
                            player.innerPeace += 5;
                        }
                    }
                }
            }

            if (s.life <= 0) this.sanctuaries.splice(i, 1);
        }
    }

    draw(ctx, arena) {
        // Soft Gold/Beige Background
        // Use camera for correct filling
        const cam = arena.camera || { x: 0, y: 0, width: window.canvas.width, height: window.canvas.height };

        // Background is handled by Arena.draw via getHeroTheme('spirit')
        // We only draw overlays here

        // Sacred Geometry / Arabesque Pattern
        ctx.save();
        ctx.strokeStyle = "rgba(240, 208, 128, 0.1)"; // Faint Soft Amber
        const size = 100;
        const off = this.patternOffset;

        const startX = Math.floor(cam.x / size) * size - size;
        const startY = Math.floor(cam.y / size) * size - size;
        const endX = cam.x + cam.width + size;
        const endY = cam.y + cam.height + size;

        for (let x = startX; x < endX; x += size) {
            for (let y = startY; y < endY; y += size) {
                // Determine pattern center
                const cx = x + (y % (size * 2) === 0 ? 0 : size / 2) + Math.sin(off / 20) * 10;
                const cy = y + Math.cos(off / 20) * 10;

                ctx.beginPath();
                ctx.arc(cx, cy, size / 2.5, 0, Math.PI * 2);
                ctx.stroke();

                ctx.beginPath();
                ctx.arc(cx, cy, size / 4, 0, Math.PI * 2);
                ctx.stroke();
            }
        }
        ctx.restore();

        // Draw Sanctuaries
        this.sanctuaries.forEach(s => {
            ctx.save();
            ctx.translate(s.x + s.r, s.y + s.r);

            // Rotating Ring
            ctx.rotate(window.frame * 0.01);

            ctx.beginPath();
            ctx.arc(0, 0, s.r, 0, Math.PI * 2);
            ctx.strokeStyle = `rgba(240, 208, 128, ${0.3 + Math.sin(window.frame * 0.05) * 0.1})`;
            ctx.lineWidth = 5;
            ctx.setLineDash([20, 10]);
            ctx.stroke();

            // Inner Fill
            ctx.fillStyle = "rgba(240, 208, 128, 0.1)";
            ctx.fill();

            // Mandala Floor
            ctx.beginPath();
            ctx.moveTo(0, -s.r / 2);
            for (let i = 0; i < 8; i++) {
                ctx.rotate(Math.PI / 4);
                ctx.lineTo(0, -s.r / 2);
                ctx.lineTo(10, -s.r / 1.5);
            }
            ctx.strokeStyle = "rgba(240, 208, 128, 0.2)";
            ctx.stroke();

            ctx.restore();

            // Text label removed as per request
        });

        // Draw Torches (Random placements based on grid logic to seem persistent)
        // We use a pseudo-random check on the grid coordinates
        ctx.save();
        const tSize = 100; // Same as pattern size
        const tOff = this.patternOffset;

        const cStartX = Math.floor(cam.x / tSize) * tSize;
        const cStartY = Math.floor(cam.y / tSize) * tSize;
        const cEndX = cam.x + cam.width;
        const cEndY = cam.y + cam.height;

        for (let x = cStartX - tSize; x < cEndX + tSize; x += tSize) {
            for (let y = cStartY - tSize; y < cEndY + tSize; y += tSize) {
                // Pseudo-random but deterministic placement based on coordinate
                // Simple hash: abs(sin(x * y)) > 0.985 (Reduced density)
                const hash = Math.abs(Math.sin(x * 0.123 + y * 0.456));
                if (hash > 0.985) {
                    // Draw Torch
                    const imgX = x + tSize / 2;
                    const imgY = y + tSize / 2;

                    // Torch Stand
                    ctx.fillStyle = "#8d6e63";
                    ctx.fillRect(imgX - 4, imgY - 10, 8, 20);

                    // Flame
                    const flameH = 10 + Math.sin(window.frame * 0.2 + x) * 3;
                    ctx.fillStyle = (window.frame % 10 < 5) ? "#e74c3c" : "#f1c40f";
                    ctx.beginPath();
                    ctx.moveTo(imgX - 4, imgY - 10);
                    ctx.lineTo(imgX + 4, imgY - 10);
                    ctx.lineTo(imgX, imgY - 10 - flameH);
                    ctx.fill();

                    // Glow
                    ctx.shadowBlur = 15;
                    ctx.shadowColor = "#e67e22";
                    ctx.fillStyle = "rgba(230, 126, 34, 0.2)";
                    ctx.beginPath();
                    ctx.arc(imgX, imgY - 15, 20 + Math.sin(window.frame * 0.1) * 2, 0, Math.PI * 2);
                    ctx.fill();
                    ctx.shadowBlur = 0;
                }

                // Prayer Statues (New Spiritual Object)
                const hash2 = Math.abs(Math.sin(x * 0.789 + y * 0.321));
                if (hash2 > 0.997) { // Much rarer (only top 0.3%)
                    const imgX = x + tSize / 2;
                    const imgY = y + tSize / 2;

                    // Stone Color (Solid Grey)
                    ctx.fillStyle = "#7f8c8d"; // Darker Grey

                    // Base
                    ctx.fillRect(imgX - 6, imgY + 8, 12, 6);

                    // Body
                    ctx.beginPath();
                    ctx.arc(imgX, imgY, 10, Math.PI, 0); // Semicircle top
                    ctx.lineTo(imgX + 10, imgY + 8);
                    ctx.lineTo(imgX - 10, imgY + 8);
                    ctx.fill();

                    // No red bib - pure stone
                }
            }
        }
        ctx.restore();

        // Draw Lanterns (Foreground-ish)
        this.lanterns.forEach(l => {
            ctx.save();
            ctx.shadowBlur = 10;
            ctx.shadowColor = "#ffa500";
            ctx.fillStyle = "#ffcc00";
            ctx.beginPath();
            ctx.arc(l.x, l.y, l.size, 0, Math.PI * 2);
            ctx.fill();
            ctx.restore();
        });
    }
}

if (typeof window.BIOME_LOGIC === 'undefined') window.BIOME_LOGIC = {};
window.BIOME_LOGIC['spirit'] = new TempleBiome();
