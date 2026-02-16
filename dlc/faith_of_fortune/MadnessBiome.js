// Madness Biome Logic
// Associated with Chance Hero
// Theme: High Contrast, Glitches, Random Hazards, Neon

class MadnessBiome {
    constructor() {
        this.name = "Madness";
        this.color = "#ff00ff"; // Base Magenta
        this.gridOffset = 0;
        this.glitchTimer = 0;
        // Falling Floor Mechanic
        this.tiles = [];
        this.tileSize = 150;
        this.initialized = false;
        this.dropTimer = 0;
    }

    initTiles(arena) {
        this.tiles = [];
        const cols = Math.ceil(arena.width / this.tileSize);
        const rows = Math.ceil(arena.height / this.tileSize);

        for (let x = 0; x < cols; x++) {
            for (let y = 0; y < rows; y++) {
                this.tiles.push({
                    c: x, r: y,
                    x: x * this.tileSize,
                    y: y * this.tileSize,
                    state: 'STABLE', // STABLE, WARNING, FALLING, VOID
                    timer: 0,
                    offsetY: 0
                });
            }
        }
        this.initialized = true;
        console.log(`[MadnessBiome] Initialized ${this.tiles.length} floor tiles.`);
    }

    update(arena, player, enemies) {
        const _arena = arena || window.arena;
        if (!_arena) return;

        // Ensure re-initialization if size changes or not set
        if (!this.initialized || !this.tiles.length) {
            this.initTiles(_arena);
        }

        // Drop Logic
        this.dropTimer++;
        if (this.dropTimer > 60) { // Check every second
            this.dropTimer = 0;

            // Pick random tile to drop
            // Chance increases with difficulty/time? 
            // Let's drop 1-3 random tiles
            let drops = 1 + Math.floor(Math.random() * 2);

            // Filter STABLE tiles
            const stable = this.tiles.filter(t => t.state === 'STABLE');

            if (stable.length > 5) { // Always leave some floor
                for (let i = 0; i < drops; i++) {
                    const t = stable[Math.floor(Math.random() * stable.length)];
                    if (t) {
                        t.state = 'WARNING';
                        t.timer = 180; // 3 seconds warning
                    }
                }
            }
        }

        // Update Tiles
        for (let t of this.tiles) {
            if (t.state === 'WARNING') {
                t.timer--;
                if (t.timer <= 0) {
                    t.state = 'FALLING';
                    t.timer = 60; // 1 second fall animation
                }
            } else if (t.state === 'FALLING') {
                t.offsetY += 10; // Fall speed
                t.timer--;
                if (t.timer <= 0) {
                    t.state = 'VOID';
                    t.timer = 600; // 10 seconds empty void before respawn (optional)
                }
            } else if (t.state === 'VOID') {
                // Instakill Check handled globally in checkEntityCollisions

                // Optional: Respawn tile logic
                t.timer--;
                if (t.timer <= 0) {
                    t.state = 'STABLE';
                    t.offsetY = 0;
                }
            }
        }

        // Glitch Effect
        if (Math.random() < 0.05) {
            this.glitchTimer = 5;
        }
        if (this.glitchTimer > 0) this.glitchTimer--;

        // Optimised Collision Check
        this.checkEntityCollisions(_arena, player, enemies);
    }

    checkEntityCollisions(arena, player, enemies) {
        if (!this.initialized || !this.tiles.length) return;
        const _arena = arena || window.arena;
        if (!_arena) return;

        // Helper to get tile at x,y
        const getTile = (x, y) => {
            const c = Math.floor(x / this.tileSize);
            const r = Math.floor(y / this.tileSize);
            // Assuming tiles are ordered row-major or simple push
            // But we used push inside nested loops c, r.
            // Index = c * rows + r? No, loops set: c=0..cols, r=0..rows.
            // this.tiles.push is in order of loops.
            // Loop: x(col), y(row).
            // So index = x * rows + y
            const rows = Math.ceil(_arena.height / this.tileSize);
            const idx = c * rows + r;
            if (idx >= 0 && idx < this.tiles.length) {
                const t = this.tiles[idx];
                if (t && t.c === c && t.r === r) return t;
            }
            return null;
            // Fallback find if order is messed up:
            // return this.tiles.find(t => t.c === c && t.r === r);
        };

        // Check Player
        if (player) {
            // Check Safe Zones first
            let safe = false;
            // Access arena from window or passed context (we rely on window.arena here)
            if (_arena && _arena.biomeZones) {
                for (let z of _arena.biomeZones) {
                    if (z.type === 'SAFE_ZONE' &&
                        player.x > z.x && player.x < z.x + z.w &&
                        player.y > z.y && player.y < z.y + z.h) {
                        safe = true;
                        break;
                    }
                }
            }

            if (!safe) {
                const t = getTile(player.x, player.y);
                if (t && t.state === 'VOID') {
                    if (!player.invincibleTimer && !player.isFlying) {
                        // Nerf: Instead of instant death (9999), take heavy damage
                        // 60 dmg is significant (approx 25-30% HP) but survivable
                        let voidDmg = 60;

                        player.takeDamage(voidDmg);
                        player.invincibleTimer = 90; // 1.5s invincibility to escape

                        if (typeof showNotification === 'function') showNotification("VOID DAMAGE!", "#ff00ff");
                        createExplosion(player.x, player.y, "#ff00ff");
                    }
                }
            }
        }

        // Check Enemies
        if (enemies) {
            for (let i = enemies.length - 1; i >= 0; i--) {
                const e = enemies[i];

                // Safe Zone Check for Enemies
                let safe = false;
                if (_arena && _arena.biomeZones) {
                    for (let z of _arena.biomeZones) {
                        if (z.type === 'SAFE_ZONE' &&
                            e.x > z.x && e.x < z.x + z.w &&
                            e.y > z.y && e.y < z.y + z.h) {
                            safe = true;
                            break;
                        }
                    }
                }
                if (safe) continue;

                const t = getTile(e.x, e.y);
                if (t && t.state === 'VOID') {
                    if (!e.isFlying && !e.isBoss) {
                        e.hp = 0;
                        createExplosion(e.x, e.y, "#ff00ff");
                    }
                }
            }
        }
    }

    // Removed per-tile collision method
    // Renamed to drawBackground so Arena calls it before obstacles
    drawBackground(ctx, arena) {
        if (!this.initialized) {
            // Force Init if drawing before update (Fix for "Not doing anything")
            this.initTiles(arena);
        }

        const cam = arena.camera || { x: 0, y: 0, width: window.canvas.width, height: window.canvas.height };

        // Ensure we are drawing in the correct composite mode (Standard Layering)
        ctx.save();
        ctx.globalCompositeOperation = "source-over";
        ctx.globalAlpha = 1.0;

        // 1. Moving Grid Effect (Restored) - Draw BEHIND tiles
        this.gridOffset = (this.gridOffset + 0.5) % 50;

        ctx.save();
        ctx.strokeStyle = "rgba(255, 0, 255, 0.2)";
        ctx.lineWidth = 1;
        const gridShift = this.gridOffset;

        // Vertical Moving Lines
        for (let x = cam.x - (cam.x % 50) + gridShift - 50; x < cam.x + cam.width; x += 50) {
            ctx.beginPath();
            ctx.moveTo(x, cam.y);
            ctx.lineTo(x, cam.y + cam.height);
            ctx.stroke();
        }
        ctx.restore();

        // 2. Draw Floor Tiles
        ctx.save();
        for (let t of this.tiles) {
            // Culling
            if (t.x + this.tileSize < cam.x || t.x > cam.x + cam.width ||
                t.y + this.tileSize < cam.y || t.y > cam.y + cam.height) continue;

            if (t.state === 'STABLE') {
                this.drawTile(ctx, t, '#ff00ff', 0.1);
            } else if (t.state === 'WARNING') {
                // Flash Red/Magenta
                const flash = (window.frame % 10 < 5);
                this.drawTile(ctx, t, flash ? '#ff0000' : '#ff00ff', 0.6);

                // Warning symbol
                ctx.fillStyle = "#fff";
                ctx.font = "bold 40px monospace";
                ctx.textAlign = "center";
                ctx.fillText("!", t.x + this.tileSize / 2, t.y + this.tileSize / 2 + 10);
            } else if (t.state === 'FALLING') {
                // Falling animation
                const progress = 1.0 - (t.timer / 60); // 0 to 1
                const scale = 1.0 - progress;

                ctx.save();
                ctx.translate(t.x + this.tileSize / 2, t.y + this.tileSize / 2);
                ctx.rotate(progress * 0.5); // Spin
                ctx.scale(scale, scale);
                ctx.fillStyle = "#440044";
                ctx.fillRect(-this.tileSize / 2, -this.tileSize / 2, this.tileSize, this.tileSize);
                ctx.restore();
            } else if (t.state === 'VOID') {
                // Void Hole
                ctx.fillStyle = "#000";
                ctx.fillRect(t.x, t.y, this.tileSize, this.tileSize);

                // Inner Shadow
                ctx.strokeStyle = "#440044";
                ctx.lineWidth = 2;
                ctx.strokeRect(t.x, t.y, this.tileSize, this.tileSize);

                // Stars in void
                if (Math.random() < 0.1) {
                    ctx.fillStyle = "#fff";
                    ctx.fillRect(t.x + Math.random() * this.tileSize, t.y + Math.random() * this.tileSize, 2, 2);
                }
            }
        }
        ctx.restore();

        // 3. Global Glitch Overlay
        if (this.glitchTimer > 0) {
            ctx.save();
            ctx.globalCompositeOperation = "color-dodge";
            ctx.fillStyle = Math.random() > 0.5 ? "rgba(0, 255, 255, 0.2)" : "rgba(255, 0, 255, 0.2)";

            // Random bars
            for (let i = 0; i < 3; i++) {
                ctx.fillRect(cam.x, cam.y + Math.random() * cam.height, cam.width, Math.random() * 50);
            }
            // Vertical Shift
            ctx.fillStyle = "rgba(255, 255, 255, 0.1)";
            ctx.fillRect(cam.x + Math.random() * cam.width, cam.y, 100, cam.height);

            ctx.restore();
        }
        ctx.restore(); // End global save
    }

    drawTile(ctx, t, color, alpha) {
        ctx.fillStyle = `rgba(20, 0, 20, 0.6)`; // Dark floor (More transparent)
        ctx.fillRect(t.x + 2, t.y + 2, this.tileSize - 4, this.tileSize - 4);

        // Neon Border - Less Dominant
        ctx.save();
        ctx.strokeStyle = color;
        ctx.lineWidth = 1; // Thinner
        ctx.globalAlpha = 0.4; // Reduced opacity for border
        ctx.strokeRect(t.x + 4, t.y + 4, this.tileSize - 8, this.tileSize - 8);
        ctx.restore();

        // Pattern
        ctx.fillStyle = color;
        ctx.globalAlpha = alpha; // Keep pattern alpha logic but maybe the input alpha handles it
        ctx.fillRect(t.x + 5, t.y + 5, this.tileSize - 10, this.tileSize - 10);
        ctx.globalAlpha = 1.0;
    }

    // DLC Required Method
    generate(arena) {
        this.initTiles(arena);
        // Add some cover obstacles to stand on?
        // No, the floor itself is the obstacle.
        // Maybe a few permanent safe zones (Iron platforms)

        // We push a custom object with a draw method because BiomeZone class is not globally exposed
        const safeZone = {
            x: arena.width / 2 - 200,
            y: arena.height / 2 - 200,
            w: 400,
            h: 400,
            type: 'SAFE_ZONE',
            // Must define draw() to prevent "zone.draw is not a function" error in Arena.js
            draw: function (ctx) {
                ctx.save();
                // Draw Metal Platform look
                ctx.fillStyle = '#222';
                ctx.fillRect(this.x, this.y, this.w, this.h);

                ctx.strokeStyle = '#444';
                ctx.lineWidth = 4;
                ctx.strokeRect(this.x, this.y, this.w, this.h);

                // Crosshatch
                ctx.beginPath();
                ctx.strokeStyle = '#333';
                ctx.lineWidth = 2;
                for (let i = 0; i <= this.w; i += 40) {
                    ctx.moveTo(this.x + i, this.y);
                    ctx.lineTo(this.x + i, this.y + this.h);
                }
                for (let i = 0; i <= this.h; i += 40) {
                    ctx.moveTo(this.x, this.y + i);
                    ctx.lineTo(this.x + this.w, this.y + i);
                }
                ctx.stroke();

                // Neon Trim
                ctx.strokeStyle = '#ff00ff';
                ctx.lineWidth = 2;
                ctx.strokeRect(this.x + 10, this.y + 10, this.w - 20, this.h - 20);
                // Inner Trim
                ctx.strokeRect(this.x + 20, this.y + 20, this.w - 40, this.h - 40);

                ctx.restore();
            }
        };
        arena.biomeZones.push(safeZone);
    }
}

if (typeof window.BIOME_LOGIC === 'undefined') window.BIOME_LOGIC = {};
window.BIOME_LOGIC['chance'] = new MadnessBiome();
