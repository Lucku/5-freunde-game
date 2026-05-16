// #194 phase 2 — explicit imports for symbols previously read off window shims.
import { FloatingText } from './Entities/FloatingText.js';
import { Projectile } from './Entities/Projectile.js';
import { MemoryShard } from './MemoryShard.js';

/**
 * @typedef {import('./types/schemas.js').ArenaCamera}   ArenaCamera
 * @typedef {import('./types/schemas.js').ArenaObstacle} ArenaObstacle
 * @typedef {import('./types/schemas.js').BiomeZone}     BiomeZone
 */
class Arena {
    constructor(width, height) {
        this.width = width;
        this.height = height;
        /** @type {ArenaCamera} */
        this.camera = { x: 0, y: 0, width: 0, height: 0 };
        /** @type {ArenaObstacle[]} */
        this.obstacles = [];
        this.traps = [];
        /** @type {BiomeZone[]} */
        this.biomeZones = [];
        // #21 — Static obstacle layer. Obstacles never move (only the array
        // is mutated by adds/removes), so their gradient + crack + pit detail
        // (~25 draw ops per obstacle) is baked into an offscreen canvas once
        // per generation and blitted as a single drawImage each frame. The
        // length+biome fingerprint below lets `draw()` detect DLC mutations
        // (PoisonFlask spawns/consumes) and rebake lazily without explicit
        // invalidation calls.
        this._staticObstacleCanvas = null;
        this._staticObstacleFingerprint = '';
    }

    // #21 — Lazy rebuild for the obstacle bake layer. No-op in non-browser
    // environments (server simulation) since `document` is absent.
    _rebuildStaticObstacleLayer() {
        if (typeof document === 'undefined') {
            this._staticObstacleCanvas = null;
            return;
        }
        if (!this.obstacles || this.obstacles.length === 0) {
            this._staticObstacleCanvas = null;
            this._staticObstacleFingerprint = `0:${this.biomeType || ''}:${this.width}x${this.height}`;
            return;
        }
        let off = this._staticObstacleCanvas;
        if (!off || off.width !== this.width || off.height !== this.height) {
            off = document.createElement('canvas');
            off.width  = this.width;
            off.height = this.height;
            this._staticObstacleCanvas = off;
        }
        const octx = off.getContext('2d');
        octx.clearRect(0, 0, off.width, off.height);
        this.obstacles.forEach(obs => obs.draw(octx));
        this._staticObstacleFingerprint = `${this.obstacles.length}:${this.biomeType || ''}:${this.width}x${this.height}`;
    }

    // Compare a cheap fingerprint of the current obstacle array against the
    // last bake; rebuild if the count, biome, or arena dimensions changed.
    _staticObstacleLayerDirty() {
        const fp = `${this.obstacles.length}:${this.biomeType || ''}:${this.width}x${this.height}`;
        return fp !== this._staticObstacleFingerprint;
    }

    updateCamera(player, canvasWidth, canvasHeight) {
        this.camera.width = canvasWidth;
        this.camera.height = canvasHeight;

        if (player) {
            // Center camera on player
            this.camera.x = player.x - canvasWidth / 2;
            this.camera.y = player.y - canvasHeight / 2;

            // Clamp camera to map bounds
            this.camera.x = Math.max(0, Math.min(this.camera.x, this.width - canvasWidth));
            this.camera.y = Math.max(0, Math.min(this.camera.y, this.height - canvasHeight));
        }
    }

    updateCameraForTwo(p1, p2, canvasWidth, canvasHeight) {
        const mx = (p1.x + p2.x) / 2;
        const my = (p1.y + p2.y) / 2;
        // Compute the minimum zoom needed to keep both players visible with padding
        const dx = Math.abs(p2.x - p1.x);
        const dy = Math.abs(p2.y - p1.y);
        const pad = 300; // world-space margin on each side
        const zoomX = canvasWidth  / (dx + pad * 2);
        const zoomY = canvasHeight / (dy + pad * 2);
        const minZoom = Math.max(canvasWidth / this.width, canvasHeight / this.height);
        const zoom = Math.max(minZoom, Math.max(0.4, Math.min(1.0, Math.min(zoomX, zoomY))));
        const vw = canvasWidth  / zoom;
        const vh = canvasHeight / zoom;
        this.camera.x = Math.max(0, Math.min(mx - vw / 2, Math.max(0, this.width  - vw)));
        this.camera.y = Math.max(0, Math.min(my - vh / 2, Math.max(0, this.height - vh)));
        // Store world-space dimensions so tile culling covers the full visible area
        this.camera.width  = vw;
        this.camera.height = vh;
        return zoom;
    }

    generate(biomeType, layoutOverride = null, trapOverride = null) {
        this.biomeType = biomeType; // Store for update/draw hooks
        this.obstacles = [];
        this.biomeZones = [];
        const layout = layoutOverride !== null ? layoutOverride : Math.floor(Math.random() * 8);
        const cx = this.width / 2;
        const cy = this.height / 2;

        // Access global wave variable
        const currentWave = typeof wave !== 'undefined' ? wave : 1;

        console.log(`Generating Arena: Layout ${layout}, Biome ${biomeType}, Size ${this.width}x${this.height}, Wave ${currentWave}`);

        // --- Biome Generation ---
        // DLC Hook
        if (window.BIOME_LOGIC && window.BIOME_LOGIC[biomeType]) {
            window.BIOME_LOGIC[biomeType].generate(this);
        }
        else if (biomeType === 'fire') {
            this.biomeZones.push(new BiomeZone(cx - 600, cy - 600, 300, 300, 'LAVA'));
            this.biomeZones.push(new BiomeZone(cx + 300, cy + 300, 300, 300, 'LAVA'));
            this.biomeZones.push(new BiomeZone(cx - 300, cy + 300, 200, 200, 'LAVA'));
            this.biomeZones.push(new BiomeZone(cx + 300, cy - 300, 200, 200, 'LAVA'));
        } else if (biomeType === 'ice') {
            this.biomeZones.push(new BiomeZone(cx - 800, cy - 200, 400, 400, 'ICE'));
            this.biomeZones.push(new BiomeZone(cx + 400, cy - 200, 400, 400, 'ICE'));
        } else if (biomeType === 'plant') {
            this.biomeZones.push(new BiomeZone(cx - 400, cy - 400, 800, 200, 'MUD'));
            this.biomeZones.push(new BiomeZone(cx - 400, cy + 200, 800, 200, 'MUD'));
        } else if (biomeType === 'water') {
            this.biomeZones.push(new BiomeZone(0, cy - 200, this.width, 400, 'WATER'));
        } else if (biomeType === 'metal') {
            this.biomeZones.push(new BiomeZone(cx - 200, cy - 200, 400, 400, 'MAGNET'));
            this.biomeZones.push(new BiomeZone(cx - 800, cy - 800, 300, 300, 'MAGNET'));
            this.biomeZones.push(new BiomeZone(cx + 500, cy + 500, 300, 300, 'MAGNET'));
        } else if (biomeType === 'black') {
            // Dark Energy Patches
            for (let i = 0; i < 8; i++) {
                const bx = Math.random() * (this.width - 400) + 200;
                const by = Math.random() * (this.height - 400) + 200;
                this.biomeZones.push(new BiomeZone(bx, by, 250, 250, 'DARK_ENERGY'));
            }
        }

        // --- Obstacle Generation ---
        // Scale positions relative to map size
        const w = this.width;
        const h = this.height;
        // Biome obstacle density: 0.0 = all stone, 1.0 = all themed (default 1.0)
        const themedObstacle = (ox, oy, ow, oh) => {
            const threshold = 1.0 - (typeof window.BIOME_OBSTACLE_DENSITY !== 'undefined' ? window.BIOME_OBSTACLE_DENSITY : 1.0);
            const themed = (Math.sin(ox * 0.0413 + oy * 0.0271) * 0.5 + 0.5) > threshold;
            return new Obstacle(ox, oy, ow, oh, themed ? biomeType : null);
        };

        // DLC biomes can set `ownsObstacles = true` on their BIOME_LOGIC entry to
        // skip the default layout pass entirely — biome.generate(this) is solely
        // responsible for obstacle placement. Used by Radiance of Ruin biomes
        // (Reliquary, Crimson Greenhouse, Dreamspace) which already place
        // themed obstacles tied to biome layout.
        const _biomeOwnsObstacles = !!(window.BIOME_LOGIC && window.BIOME_LOGIC[biomeType] && window.BIOME_LOGIC[biomeType].ownsObstacles);
        if (_biomeOwnsObstacles) {
            // Skip default layout generator below. Spawn-area clear + trap gen still run.
        } else if (layout === 0) { // 4 Corners
            this.obstacles.push(themedObstacle(w * 0.1, h * 0.1, 200, 200));
            this.obstacles.push(themedObstacle(w * 0.9 - 200, h * 0.1, 200, 200));
            this.obstacles.push(themedObstacle(w * 0.1, h * 0.9 - 200, 200, 200));
            this.obstacles.push(themedObstacle(w * 0.9 - 200, h * 0.9 - 200, 200, 200));
        } else if (layout === 1) { // Horizontal Bars
            this.obstacles.push(themedObstacle(cx - 600, cy - 100, 200, 200));
            this.obstacles.push(themedObstacle(cx + 400, cy - 100, 200, 200));
        } else if (layout === 2) { // Vertical Walls
            this.obstacles.push(themedObstacle(w * 0.3, h * 0.1, 100, h * 0.3));
            this.obstacles.push(themedObstacle(w * 0.3, h * 0.6, 100, h * 0.3));
            this.obstacles.push(themedObstacle(w * 0.7, h * 0.1, 100, h * 0.3));
            this.obstacles.push(themedObstacle(w * 0.7, h * 0.6, 100, h * 0.3));
        } else if (layout === 3) { // Central Block
            this.obstacles.push(themedObstacle(cx - 150, cy - 150, 300, 300));
        } else if (layout === 4) { // Scattered
            for (let i = 0; i < 15; i++) {
                const x = Math.random() * (w - 200) + 100;
                const y = Math.random() * (h - 200) + 100;
                if (Math.hypot(x - cx, y - cy) > 400) { // Keep center clear
                    this.obstacles.push(themedObstacle(x, y, 100, 100));
                }
            }
        } else if (layout === 5) { // Maze-like
            const cellSize = 200;
            for (let x = 100; x < w - 100; x += cellSize) {
                for (let y = 100; y < h - 100; y += cellSize) {
                    if (Math.random() < 0.3 && Math.hypot(x - cx, y - cy) > 300) {
                        this.obstacles.push(themedObstacle(x, y, 100, 100));
                    }
                }
            }
        } else if (layout === 6) { // Arena Ring
            const radius = 600;
            const count = 12;
            for (let i = 0; i < count; i++) {
                const angle = (Math.PI * 2 / count) * i;
                const x = cx + Math.cos(angle) * radius;
                const y = cy + Math.sin(angle) * radius;
                this.obstacles.push(themedObstacle(x - 50, y - 50, 100, 100));
            }
        } else if (layout === 7) { // Checkerboard
            const size = 300;
            for (let x = 0; x < w; x += size) {
                for (let y = 0; y < h; y += size) {
                    if ((Math.floor(x / size) + Math.floor(y / size)) % 2 === 0) {
                        if (Math.hypot(x + size / 2 - cx, y + size / 2 - cy) > 400) {
                            // 50% chance for obstacle, 50% for trap (handled later)
                            if (Math.random() < 0.5) this.obstacles.push(themedObstacle(x + 50, y + 50, 200, 200));
                        }
                    }
                }
            }
        } else if (layout === 'VERSUS_1V1') {
            // Symmetrical 1v1 Layout
            // Central cover (small)
            this.obstacles.push(themedObstacle(cx - 50, cy - 150, 100, 300));

            // Flanking pillars
            this.obstacles.push(themedObstacle(cx - 600, cy - 400, 150, 150));
            this.obstacles.push(themedObstacle(cx + 450, cy - 400, 150, 150));
            this.obstacles.push(themedObstacle(cx - 600, cy + 250, 150, 150));
            this.obstacles.push(themedObstacle(cx + 450, cy + 250, 150, 150));

            // Outer barriers
            this.obstacles.push(themedObstacle(cx - 1200, cy - 1000, 200, 2000)); // Left wall segment
            this.obstacles.push(themedObstacle(cx + 1000, cy - 1000, 200, 2000)); // Right wall segment
        }

        // Ensure spawn area is clear
        this.obstacles = this.obstacles.filter(obs => {
            const margin = 100;
            const playerRect = { x: cx - margin, y: cy - margin, w: margin * 2, h: margin * 2 };
            return !(playerRect.x < obs.x + obs.w &&
                playerRect.x + playerRect.w > obs.x &&
                playerRect.y < obs.y + obs.h &&
                playerRect.y + playerRect.h > obs.y);
        });

        // --- Trap Generation ---
        this.traps = [];
        const trapCount = 5 + Math.floor(Math.random() * 5);

        // Trap Progression System
        const availableTraps = [];
        if (currentWave >= 3)  availableTraps.push('SLOW');
        if (currentWave >= 5)  availableTraps.push('CONVEYOR');
        if (currentWave >= 10) availableTraps.push('SPIKE');
        if (currentWave >= 15) availableTraps.push('TURRET');
        if (currentWave >= 20) availableTraps.push('LASER_BEAM');

        // Biomes can set `noTraps = true` to opt out of trap generation entirely
        // (Radiance of Ruin biomes: Reliquary, Dreamspace are sacral/dreamspace,
        // Crimson Greenhouse is overgrowth — none should have mechanical traps).
        const _biomeNoTraps = !!(window.BIOME_LOGIC && window.BIOME_LOGIC[biomeType] && window.BIOME_LOGIC[biomeType].noTraps);

        if (!_biomeNoTraps && (trapOverride || availableTraps.length > 0)) {
            for (let i = 0; i < trapCount; i++) {
                const pos = this.getRandomSafePosition(50);
                const type = trapOverride ? trapOverride : availableTraps[Math.floor(Math.random() * availableTraps.length)];
                const newTrap = new Trap(pos.x, pos.y, type);
                this.traps.push(newTrap);

                // Add Obstacles for Turrets and Laser Beams.
                // Tag with the current biomeType so they render through the
                // biome's drawObstacle hook instead of as default grey stones.
                if (type === 'TURRET' || type === 'LASER_BEAM') {
                    this.obstacles.push(new Obstacle(pos.x, pos.y, newTrap.w, newTrap.h, biomeType));
                }
            }
        }

        // Always add a Teleporter pair if layout is Maze-like
        if (layout === 5) {
            const p1 = this.getRandomSafePosition(50);
            const p2 = this.getRandomSafePosition(50);
            const t1 = new Trap(p1.x, p1.y, 'TELEPORTER');
            const t2 = new Trap(p2.x, p2.y, 'TELEPORTER');
            t1.pair = t2;
            t2.pair = t1;
            this.traps.push(t1, t2);
        }

        // --- Memory Shard Generation (Story Mode) ---
        if (saveData.story && saveData.story.enabled && !isDailyMode && !isWeeklyMode) {
            // Chance to spawn a memory shard
            if (Math.random() < 0.3) { // 30% chance per wave
                const pos = this.getRandomSafePosition(20);
                // Determine type based on player or random?
                // "Uniqueness: Each hero sees different memories."
                // So we spawn a shard for the CURRENT hero.
                const shard = new MemoryShard(pos.x, pos.y, player.type);
                memoryShards.push(shard);
            }

            // Special Black Shard Drop (Very Rare - 0.5% chance)
            if (Math.random() < 0.005) {
                const pos = this.getRandomSafePosition(20);
                const shard = new MemoryShard(pos.x, pos.y, 'black');
                memoryShards.push(shard);
            }

            // Special Makuta Shard Drop (Very Rare - 0.5% chance)
            if (Math.random() < 0.005) {
                const pos = this.getRandomSafePosition(20);
                const shard = new MemoryShard(pos.x, pos.y, 'makuta');
                memoryShards.push(shard);
            }

            // Special Goblin Shard Drop (Very Rare - 0.5% chance)
            if (Math.random() < 0.005) {
                const pos = this.getRandomSafePosition(20);
                const shard = new MemoryShard(pos.x, pos.y, 'goblin');
                memoryShards.push(shard);
            }
        }

        // #21 — Bake obstacles into the offscreen layer after the final
        // population (incl. turret/laser obstacle pushes above). Subsequent
        // DLC mutations (PoisonFlask consume etc.) auto-rebake via the
        // fingerprint check in draw().
        this._rebuildStaticObstacleLayer();
    }

    // #102 — Load a custom map produced by the map editor.
    // mapData shape: { biomeType, arenaWidth?, arenaHeight?, obstacles[], biomeZones[], traps[] }
    // traps entries may include pairIndex (int) to wire TELEPORTER pairs.
    generateFromMap(mapData) {
        if (!mapData || typeof mapData !== 'object') return;
        this.biomeType = mapData.biomeType || 'fire';
        if (mapData.arenaWidth) this.width = mapData.arenaWidth;
        if (mapData.arenaHeight) this.height = mapData.arenaHeight;

        this.obstacles = (mapData.obstacles || []).map(
            o => new Obstacle(o.x, o.y, o.w, o.h, o.biomeType ?? null)
        );
        this.biomeZones = (mapData.biomeZones || []).map(
            z => new BiomeZone(z.x, z.y, z.w, z.h, z.type)
        );
        this.traps = (mapData.traps || []).map(t => new Trap(t.x, t.y, t.type));

        // Wire TELEPORTER pairs via pairIndex
        if (mapData.traps) {
            mapData.traps.forEach((t, i) => {
                if (t.type === 'TELEPORTER' && typeof t.pairIndex === 'number') {
                    const partner = this.traps[t.pairIndex];
                    if (partner) this.traps[i].pair = partner;
                }
            });
        }

        this._rebuildStaticObstacleLayer();
    }

    draw(ctx, theme) {
        // Draw Background (Only visible area)
        ctx.fillStyle = theme.bg;
        ctx.fillRect(
            Math.max(0, this.camera.x),
            Math.max(0, this.camera.y),
            Math.min(this.width - this.camera.x, this.camera.width),
            Math.min(this.height - this.camera.y, this.camera.height)
        );

        // DLC Hook for Biome Custom Drawing (Background Layer - e.g. Floor Tiles)
        if (this.biomeType && window.BIOME_LOGIC && window.BIOME_LOGIC[this.biomeType] && window.BIOME_LOGIC[this.biomeType].drawBackground) {
            window.BIOME_LOGIC[this.biomeType].drawBackground(ctx, this);
        }
        // Fallback for older method signature if drawBackground not defined but draw is
        else if (this.biomeType && window.BIOME_LOGIC && window.BIOME_LOGIC[this.biomeType] && window.BIOME_LOGIC[this.biomeType].draw) {
            window.BIOME_LOGIC[this.biomeType].draw(ctx, this);
        }

        // Draw Grid
        ctx.strokeStyle = theme.grid;
        ctx.lineWidth = 2;
        const tileSize = 100;

        // Optimize: Only draw visible grid lines
        const startX = Math.floor(this.camera.x / tileSize) * tileSize;
        const startY = Math.floor(this.camera.y / tileSize) * tileSize;
        const endX = startX + this.camera.width + tileSize;
        const endY = startY + this.camera.height + tileSize;

        ctx.beginPath();
        for (let x = startX; x <= endX; x += tileSize) {
            if (x > this.width) break;
            ctx.moveTo(x, Math.max(0, this.camera.y));
            ctx.lineTo(x, Math.min(this.height, this.camera.y + this.camera.height));
        }
        for (let y = startY; y <= endY; y += tileSize) {
            if (y > this.height) break;
            ctx.moveTo(Math.max(0, this.camera.x), y);
            ctx.lineTo(Math.min(this.width, this.camera.x + this.camera.width), y);
        }
        ctx.stroke();

        // Draw Map Borders
        ctx.strokeStyle = '#ff0000';
        ctx.lineWidth = 5;
        ctx.strokeRect(0, 0, this.width, this.height);

        // Draw Biome Zones
        this.biomeZones.forEach(zone => zone.draw(ctx));

        // Draw Traps
        this.traps.forEach(trap => trap.draw(ctx));

        // Draw Obstacles — #21 blit baked layer. Auto-rebuild if DLC adds /
        // removes obstacles (PoisonFlask spawn or consume) since last bake.
        if (this._staticObstacleLayerDirty()) this._rebuildStaticObstacleLayer();
        if (this._staticObstacleCanvas) {
            ctx.drawImage(this._staticObstacleCanvas, 0, 0);
        } else {
            this.obstacles.forEach(obs => obs.draw(ctx));
        }
    }

    update(player) {
        // DLC Hook for Biome Custom Update
        if (this.biomeType && window.BIOME_LOGIC && window.BIOME_LOGIC[this.biomeType] && window.BIOME_LOGIC[this.biomeType].update) {
            window.BIOME_LOGIC[this.biomeType].update(this, player, typeof enemies !== 'undefined' ? enemies : []);
        }

        // Check Trap Collisions
        this.traps.forEach(trap => {
            trap.update(); // Update state

            const dx = player.x - (trap.x + trap.w / 2);
            const dy = player.y - (trap.y + trap.h / 2);
            if (Math.abs(dx) < trap.w / 2 && Math.abs(dy) < trap.h / 2) {
                if (trap.type === 'SPIKE' && trap.active) {
                    if (frame % 60 === 0) {
                        if (!player.isInvincible) {
                            player.hp -= 10; // Damage every second if active
                            floatingTexts.push(FloatingText.acquire(player.x, player.y - 20, "10", "#e74c3c", 20));
                        }
                    }
                } else if (trap.type === 'SLOW') {
                    player.trapSpeedMod = 0.5; // Slow down
                } else if (trap.type === 'CONVEYOR') {
                    player.x += trap.vx;
                    player.y += trap.vy;
                } else if (trap.type === 'TELEPORTER' && trap.active && trap.pair) {
                    // Teleport
                    createExplosion(player.x, player.y, '#3498db');
                    player.x = trap.pair.x + trap.pair.w / 2;
                    player.y = trap.pair.y + trap.pair.h / 2;
                    createExplosion(player.x, player.y, '#3498db');
                    trap.active = false; // Cooldown
                    trap.pair.active = false;
                    trap.timer = 180; // 3 seconds cooldown
                    trap.pair.timer = 180;
                }
            }

            // Laser Beam Collision (Line vs Circle)
            if (trap.type === 'LASER_BEAM') {
                // Simple check: distance from point to line segment
                // Laser rotates around center
                const cx = trap.x + trap.w / 2;
                const cy = trap.y + trap.h / 2;
                const lx = cx + Math.cos(trap.angle) * 200;
                const ly = cy + Math.sin(trap.angle) * 200;

                // Check collision with player
                // Vector from start to end
                const dx = lx - cx;
                const dy = ly - cy;
                // Vector from start to player
                const px = player.x - cx;
                const py = player.y - cy;

                const t = Math.max(0, Math.min(1, (px * dx + py * dy) / (dx * dx + dy * dy)));
                const closestX = cx + t * dx;
                const closestY = cy + t * dy;

                const dist = Math.hypot(player.x - closestX, player.y - closestY);
                if (dist < player.radius + 5) {
                    if (frame % 10 === 0) {
                        if (!player.isInvincible) {
                            player.hp -= 2;
                            createExplosion(player.x, player.y, '#e74c3c');
                            floatingTexts.push(FloatingText.acquire(player.x, player.y - 20, "2", "#e74c3c", 20));
                        }
                    }
                }
            }
        });

        // Check Biome Collisions (Dark Energy)
        this.biomeZones.forEach(zone => {
            if (zone.type === 'DARK_ENERGY') {
                // Player Interaction
                if (player.x > zone.x && player.x < zone.x + zone.w &&
                    player.y > zone.y && player.y < zone.y + zone.h) {

                    if (player.type === 'black') {
                        // Heal Black Hero
                        if (frame % 60 === 0 && player.hp < player.maxHp) {
                            player.hp += 1;
                            zone.healthYielded += 1;
                            floatingTexts.push(FloatingText.acquire(player.x, player.y - 30, "+1", "#9b59b6", 14));

                            if (zone.healthYielded >= zone.maxHealthYield) {
                                zone.depleted = true;
                                floatingTexts.push(FloatingText.acquire(zone.x + zone.w / 2, zone.y + zone.h / 2, "DEPLETED", "#555", 20));
                            }
                        }
                    } else {
                        // Damage other heroes (Makuta Fight Logic)
                        if (frame % 60 === 0) {
                            if (!player.isInvincible) {
                                player.hp -= 5 * (1 - player.damageReduction);
                                createExplosion(player.x, player.y, '#8e44ad');
                                floatingTexts.push(FloatingText.acquire(player.x, player.y - 20, "5", "#8e44ad", 16));
                            }
                        }
                    }
                }

                // Enemy Interaction
                enemies.forEach(e => {
                    if (e.x > zone.x && e.x < zone.x + zone.w &&
                        e.y > zone.y && e.y < zone.y + zone.h) {

                        if (e.type === 'MAKUTA') {
                            // Heal Makuta
                            if (frame % 60 === 0 && e.hp < e.maxHp) {
                                e.hp += 50; // Significant healing
                                floatingTexts.push(FloatingText.acquire(e.x, e.y - 50, "+50", "#9b59b6", 20));
                            }
                        } else {
                            // Damage regular enemies
                            if (frame % 30 === 0) {
                                e.hp -= 2;
                                createExplosion(e.x, e.y, '#8e44ad');
                            }
                        }
                    }
                });
            }
        });

        // Remove depleted zones
        this.biomeZones = this.biomeZones.filter(z => !z.depleted);
    }

    checkCollision(x, y, r) {
        // Map Boundaries
        if (x - r < 0 || x + r > this.width || y - r < 0 || y + r > this.height) return true;

        // Obstacles
        for (const obs of this.obstacles) {
            if (obs.solid === false) continue; // Non-solid pickups (e.g. PoisonFlask) don't block movement
            const closestX = Math.max(obs.x, Math.min(x, obs.x + obs.w));
            const closestY = Math.max(obs.y, Math.min(y, obs.y + obs.h));
            const dx = x - closestX;
            const dy = y - closestY;
            if ((dx * dx + dy * dy) < (r * r)) return true;
        }
        return false;
    }

    getRandomSafePosition(r) {
        let safe = false;
        let x, y;
        let attempts = 0;
        while (!safe && attempts < 100) {
            x = Math.random() * (this.width - 200) + 100;
            y = Math.random() * (this.height - 200) + 100;
            if (!this.checkCollision(x, y, r)) safe = true;
            attempts++;
        }
        return { x, y };
    }
}

class BiomeZone {
    constructor(x, y, w, h, type) {
        this.x = x; this.y = y; this.w = w; this.h = h;
        this.type = type;
        this.healthYielded = 0;
        this.maxHealthYield = 50; // Disappear after healing 50 HP
        this.depleted = false;
    }
    draw(ctx) {
        ctx.save();
        if (this.type === 'LAVA') {
            ctx.fillStyle = 'rgba(231, 76, 60, 0.3)';
            ctx.strokeStyle = '#c0392b';
            ctx.globalAlpha = 0.5 + Math.sin(Date.now() / 500) * 0.2;
        } else if (this.type === 'ICE') {
            ctx.fillStyle = 'rgba(52, 152, 219, 0.2)';
            ctx.strokeStyle = '#2980b9';
        } else if (this.type === 'MUD') {
            ctx.fillStyle = 'rgba(100, 80, 50, 0.4)';
            ctx.strokeStyle = '#5d4037';
        } else if (this.type === 'WATER') {
            ctx.fillStyle = 'rgba(41, 128, 185, 0.3)';
            ctx.strokeStyle = '#2980b9';
            ctx.globalAlpha = 0.5 + Math.sin(Date.now() / 1000) * 0.1;
        } else if (this.type === 'MAGNET') {
            ctx.fillStyle = 'rgba(142, 68, 173, 0.2)';
            ctx.strokeStyle = '#8e44ad';
        } else if (this.type === 'DARK_ENERGY') {
            ctx.fillStyle = 'rgba(155, 89, 182, 0.3)'; // Purple
            ctx.strokeStyle = '#8e44ad';
            ctx.globalAlpha = 0.6 + Math.sin(Date.now() / 300) * 0.2; // Pulsing
        } else if (this.type === 'RUBBLE') {
            ctx.fillStyle = 'rgba(121, 85, 72, 0.3)'; // Brown
            ctx.strokeStyle = '#795548';
        } else if (this.type === 'QUICKSAND') {
            ctx.fillStyle = 'rgba(230, 126, 34, 0.3)'; // Sandy Orange
            ctx.strokeStyle = '#d35400';
            ctx.globalAlpha = 0.5 + Math.sin(Date.now() / 800) * 0.1;
        } else if (this.type === 'STORM') {
            ctx.fillStyle = 'rgba(50, 50, 80, 0.4)'; // Dark Thundercloud
            ctx.strokeStyle = '#ffff00'; // Electric Yellow Outline
            ctx.globalAlpha = 0.5 + Math.sin(Date.now() / 150) * 0.2; // Rapid flickering
        } else if (this.type === 'VOID') {
            ctx.fillStyle = 'rgba(0, 0, 0, 0.6)'; // Deep Void
            ctx.strokeStyle = '#8e44ad'; // Purple Outline
            ctx.globalAlpha = 0.8;
        } else if (this.type === 'TIME_RIFT' || this.type === 'HEART_NEXUS') {
            // Visual rendering handled by TimeBiome.draw() / LoveBiome.draw() — skip default box
            ctx.restore(); return;
        } else if (this.type === 'FRACTURE' || this.type === 'SMOG_POCKET') {
            // Visual rendering handled by MindscapeBiome.draw() / SmogQuarterBiome.draw() — skip default box
            ctx.restore(); return;
        } else if (this.type === 'LIGHT_SHAFT' || this.type === 'BLOOM_PATCH' || this.type === 'DREAM_POCKET') {
            // Visual rendering handled by Radiance of Ruin biomes (Reliquary,
            // Crimson Greenhouse, Dreamspace). Skip default fillRect/strokeRect
            // — otherwise the zones inherit whatever fill/stroke was last on
            // the ctx (often red), painting an outlined box over the floor.
            ctx.restore(); return;
        } else if (this.type === 'GLITCH') {
            ctx.fillStyle = Math.random() < 0.1 ? '#fff' : 'rgba(0, 188, 212, 0.2)'; // Glitchy Clear/White
            ctx.strokeStyle = '#00bcd4';
            ctx.globalAlpha = 0.6 + Math.random() * 0.4;
        }

        ctx.fillRect(this.x, this.y, this.w, this.h);
        ctx.lineWidth = 2;
        ctx.strokeRect(this.x, this.y, this.w, this.h);
        ctx.restore();
    }
}

class Obstacle {
    constructor(x, y, w, h, biomeType = null) {
        this.x = x; this.y = y; this.w = w; this.h = h;
        this.biomeType = biomeType;
        this._buildDecor();
    }

    // Seeded pseudo-random — consistent per obstacle position
    _rng(n) { const s = Math.sin(n) * 43758.5453; return s - Math.floor(s); }

    _buildDecor() {
        const seed = this.x * 0.0071 + this.y * 0.0137;
        const r = (i) => this._rng(seed + i * 0.391);

        // Stone block subdivision lines
        const bSize = 58;
        this._blockLines = [];
        if (this.w > 90) {
            for (let bx = bSize; bx < this.w - 10; bx += bSize + (r(bx) * 18 | 0) - 9)
                this._blockLines.push([bx, 5, bx, this.h - 5, false]);
        }
        if (this.h > 90) {
            for (let by = bSize; by < this.h - 10; by += bSize + (r(by) * 18 | 0) - 9)
                this._blockLines.push([5, by, this.w - 5, by, true]);
        }

        // Cracks — 2-4 per obstacle, clipped to interior
        this._cracks = [];
        const num = 2 + (r(seed) * 2 | 0);
        for (let i = 0; i < num; i++) {
            const s = seed + i * 1.37;
            const ox = 10 + r(s)       * (this.w - 20);
            const oy = 10 + r(s + 0.1) * (this.h - 20);
            const ang = r(s + 0.2) * Math.PI;
            const len = 18 + r(s + 0.3) * Math.min(this.w, this.h) * 0.38;
            const bAng = ang + 0.6 + r(s + 0.4) * 0.8;
            const bLen = len * (0.25 + r(s + 0.5) * 0.35);
            this._cracks.push({
                ox, oy,
                ex: ox + Math.cos(ang) * len,  ey: oy + Math.sin(ang) * len,
                bx: ox + Math.cos(bAng) * bLen, by: oy + Math.sin(bAng) * bLen,
            });
        }

        // Scattered surface pits for roughness
        this._pits = [];
        const numPits = 3 + (r(seed + 5) * 5 | 0);
        for (let i = 0; i < numPits; i++) {
            const s = seed + 10 + i * 0.77;
            this._pits.push({ px: r(s) * this.w, py: r(s + 0.1) * this.h, pr: 1.5 + r(s + 0.2) * 2.5 });
        }
    }

    draw(ctx) {
        // Delegate to biome-specific renderer if available
        if (this.biomeType && window.BIOME_LOGIC?.[this.biomeType]?.drawObstacle) {
            window.BIOME_LOGIC[this.biomeType].drawObstacle(ctx, this);
            return;
        }

        const { x, y, w, h } = this;
        const bev = 6;

        // --- Base: diagonal stone gradient (top-left bright → bottom-right dark) ---
        const grd = ctx.createLinearGradient(x, y, x + w, y + h);
        grd.addColorStop(0,   '#6e6e6e');
        grd.addColorStop(0.38,'#585858');
        grd.addColorStop(1,   '#393939');
        ctx.fillStyle = grd;
        ctx.fillRect(x, y, w, h);

        // --- Interior details clipped to obstacle bounds ---
        ctx.save();
        ctx.beginPath(); ctx.rect(x + 1, y + 1, w - 2, h - 2); ctx.clip();

        // Block subdivision lines
        ctx.lineWidth = 1.5;
        this._blockLines.forEach(([x1, y1, x2, y2]) => {
            ctx.strokeStyle = 'rgba(0,0,0,0.38)';
            ctx.beginPath(); ctx.moveTo(x + x1, y + y1); ctx.lineTo(x + x2, y + y2); ctx.stroke();
            ctx.strokeStyle = 'rgba(255,255,255,0.07)';
            ctx.lineWidth = 1;
            ctx.beginPath(); ctx.moveTo(x + x1 + 1, y + y1 + 1); ctx.lineTo(x + x2 + 1, y + y2 + 1); ctx.stroke();
            ctx.lineWidth = 1.5;
        });

        // Cracks
        ctx.lineCap = 'round';
        this._cracks.forEach(c => {
            ctx.strokeStyle = 'rgba(0,0,0,0.52)';
            ctx.lineWidth = 1.1;
            ctx.beginPath(); ctx.moveTo(x + c.ox, y + c.oy); ctx.lineTo(x + c.ex, y + c.ey); ctx.stroke();
            ctx.beginPath(); ctx.moveTo(x + c.ox, y + c.oy); ctx.lineTo(x + c.bx, y + c.by); ctx.stroke();
            // Bright sliver next to crack (rock split highlight)
            ctx.strokeStyle = 'rgba(255,255,255,0.11)';
            ctx.lineWidth = 0.8;
            ctx.beginPath(); ctx.moveTo(x + c.ox + 0.8, y + c.oy + 0.8); ctx.lineTo(x + c.ex + 0.8, y + c.ey + 0.8); ctx.stroke();
        });

        // Surface pits
        this._pits.forEach(p => {
            ctx.fillStyle = 'rgba(0,0,0,0.22)';
            ctx.beginPath(); ctx.arc(x + p.px, y + p.py, p.pr, 0, Math.PI * 2); ctx.fill();
            ctx.fillStyle = 'rgba(255,255,255,0.06)';
            ctx.beginPath(); ctx.arc(x + p.px + 0.7, y + p.py + 0.7, p.pr * 0.55, 0, Math.PI * 2); ctx.fill();
        });

        ctx.restore();

        // --- Bevel: raised 3-D edge (top+left lit, bottom+right shadowed) ---
        // Top face
        ctx.fillStyle = 'rgba(255,255,255,0.20)';
        ctx.beginPath();
        ctx.moveTo(x, y); ctx.lineTo(x + w, y);
        ctx.lineTo(x + w - bev, y + bev); ctx.lineTo(x + bev, y + bev);
        ctx.closePath(); ctx.fill();
        // Left face
        ctx.beginPath();
        ctx.moveTo(x, y); ctx.lineTo(x + bev, y + bev);
        ctx.lineTo(x + bev, y + h - bev); ctx.lineTo(x, y + h);
        ctx.closePath(); ctx.fill();
        // Bottom shadow
        ctx.fillStyle = 'rgba(0,0,0,0.40)';
        ctx.beginPath();
        ctx.moveTo(x, y + h); ctx.lineTo(x + w, y + h);
        ctx.lineTo(x + w - bev, y + h - bev); ctx.lineTo(x + bev, y + h - bev);
        ctx.closePath(); ctx.fill();
        // Right shadow
        ctx.beginPath();
        ctx.moveTo(x + w, y); ctx.lineTo(x + w, y + h);
        ctx.lineTo(x + w - bev, y + h - bev); ctx.lineTo(x + w - bev, y + bev);
        ctx.closePath(); ctx.fill();

        // Outer border
        ctx.strokeStyle = '#1e1e1e';
        ctx.lineWidth = 2;
        ctx.strokeRect(x, y, w, h);
    }
}

class Trap {
    constructor(x, y, type) {
        this.x = x;
        this.y = y;
        this.w = 100;
        this.h = 100;
        this.type = type;
        this.timer = 0;
        this.active = true;

        if (this.type === 'CONVEYOR') {
            const angle = Math.floor(Math.random() * 4) * (Math.PI / 2);
            this.vx = Math.cos(angle) * 2;
            this.vy = Math.sin(angle) * 2;
        } else if (this.type === 'SPIKE') {
            this.timer = Math.random() * 200;
            this.active = false;
        } else if (this.type === 'TURRET') {
            this.timer = Math.random() * 100;
        } else if (this.type === 'LASER_BEAM') {
            this.angle = Math.random() * Math.PI * 2;
        } else if (this.type === 'TELEPORTER') {
            this.active = true;
            this.timer = 0;
        }
    }

    update() {
        if (this.type === 'SPIKE') {
            this.timer++;
            if (this.timer > 200) { // Cycle every ~3 seconds
                this.active = !this.active;
                this.timer = 0;
            }
        } else if (this.type === 'TURRET') {
            this.timer++;
            if (this.timer > 120) { // Shoot every 2 seconds
                // Find nearest player (only 1 player for now)
                // Assuming 'player' and 'projectiles' are global
                if (typeof player !== 'undefined' && typeof projectiles !== 'undefined') {
                    const angle = Math.atan2(player.y - (this.y + this.h / 2), player.x - (this.x + this.w / 2));
                    const vel = { x: Math.cos(angle) * 5, y: Math.sin(angle) * 5 };
                    projectiles.push(Projectile.acquire(this.x + this.w / 2, this.y + this.h / 2, vel, 10, '#e74c3c', 8, 'enemy', 0, true));
                }
                this.timer = 0;
            }
        } else if (this.type === 'LASER_BEAM') {
            this.angle += 0.02; // Rotate
        } else if (this.type === 'TELEPORTER') {
            if (!this.active) {
                this.timer--;
                if (this.timer <= 0) this.active = true;
            }
        }
    }

    draw(ctx) {
        ctx.save();
        ctx.translate(this.x, this.y);
        const cx = this.w / 2, cy = this.h / 2;
        const t = Date.now();

        if (this.type === 'SPIKE') {
            // Dark plate base with gradient depth
            const bgGrad = ctx.createLinearGradient(0, 0, this.w, this.h);
            bgGrad.addColorStop(0, '#1c1c1c');
            bgGrad.addColorStop(1, '#0a0a0a');
            ctx.fillStyle = bgGrad;
            ctx.fillRect(0, 0, this.w, this.h);

            // Warning pulse when cycle is near transition
            if (this.timer > 160) {
                const pulse = (Math.sin(t / 80) + 1) / 2;
                ctx.fillStyle = `rgba(231, 76, 60, ${pulse * 0.35})`;
                ctx.fillRect(0, 0, this.w, this.h);
            }

            if (this.active) {
                for (let i = 0; i < 4; i++) {
                    for (let j = 0; j < 4; j++) {
                        const bx = i * 25, by = j * 25;
                        const tipX = bx + 12.5;
                        // Metallic gradient spike body
                        const spikeGrad = ctx.createLinearGradient(bx, by + 25, bx + 25, by);
                        spikeGrad.addColorStop(0, '#2d3035');
                        spikeGrad.addColorStop(0.55, '#8a9196');
                        spikeGrad.addColorStop(1, '#d8dfe2');
                        ctx.fillStyle = spikeGrad;
                        ctx.beginPath();
                        ctx.moveTo(bx + 3, by + 25);
                        ctx.lineTo(tipX, by + 1);
                        ctx.lineTo(bx + 22, by + 25);
                        ctx.closePath();
                        ctx.fill();
                        // Highlight left face
                        ctx.fillStyle = 'rgba(255,255,255,0.2)';
                        ctx.beginPath();
                        ctx.moveTo(bx + 3, by + 25);
                        ctx.lineTo(tipX, by + 1);
                        ctx.lineTo(tipX - 4, by + 9);
                        ctx.lineTo(bx + 7, by + 25);
                        ctx.closePath();
                        ctx.fill();
                        // Glowing blood-red tip
                        ctx.shadowColor = '#ff3333';
                        ctx.shadowBlur = 8;
                        ctx.fillStyle = '#c0392b';
                        ctx.beginPath();
                        ctx.moveTo(tipX - 3.5, by + 8);
                        ctx.lineTo(tipX, by + 1);
                        ctx.lineTo(tipX + 3.5, by + 8);
                        ctx.closePath();
                        ctx.fill();
                        ctx.shadowBlur = 0;
                    }
                }
            } else {
                // Retracted: deep hole per spike position
                for (let i = 0; i < 4; i++) {
                    for (let j = 0; j < 4; j++) {
                        const hx = i * 25 + 12.5, hy = j * 25 + 12.5;
                        const holeGrad = ctx.createRadialGradient(hx, hy, 1, hx, hy, 9);
                        holeGrad.addColorStop(0, '#000000');
                        holeGrad.addColorStop(0.6, '#0d0d0d');
                        holeGrad.addColorStop(1, '#1c1c1c');
                        ctx.fillStyle = holeGrad;
                        ctx.beginPath();
                        ctx.arc(hx, hy, 9, 0, Math.PI * 2);
                        ctx.fill();
                        // Tiny rim gleam
                        ctx.fillStyle = 'rgba(100,100,100,0.35)';
                        ctx.beginPath();
                        ctx.arc(hx - 2.5, hy - 2.5, 2.5, 0, Math.PI * 2);
                        ctx.fill();
                    }
                }
            }

        } else if (this.type === 'SLOW') {
            // Soft purple disc — minimal distraction
            const bgGrad = ctx.createRadialGradient(cx, cy, 8, cx, cy, 50);
            bgGrad.addColorStop(0, 'rgba(95, 45, 135, 0.45)');
            bgGrad.addColorStop(1, 'rgba(25, 5, 45, 0.10)');
            ctx.fillStyle = bgGrad;
            ctx.fillRect(0, 0, this.w, this.h);

        } else if (this.type === 'CONVEYOR') {
            // Dark industrial steel plate
            const bgGrad = ctx.createLinearGradient(0, 0, this.w, this.h);
            bgGrad.addColorStop(0, '#1c1c1f');
            bgGrad.addColorStop(0.5, '#2c2c30');
            bgGrad.addColorStop(1, '#1c1c1f');
            ctx.fillStyle = bgGrad;
            ctx.fillRect(0, 0, this.w, this.h);

            // Belt grooves perpendicular to direction
            ctx.save();
            ctx.translate(cx, cy);
            const beltAngle = Math.atan2(this.vy, this.vx);
            ctx.rotate(beltAngle + Math.PI / 2);
            ctx.strokeStyle = 'rgba(75, 75, 85, 0.65)';
            ctx.lineWidth = 1;
            for (let i = -60; i <= 60; i += 12) {
                ctx.beginPath();
                ctx.moveTo(i, -60);
                ctx.lineTo(i, 60);
                ctx.stroke();
            }
            ctx.restore();

            // Border
            ctx.strokeStyle = 'rgba(90, 90, 110, 0.5)';
            ctx.lineWidth = 2;
            ctx.strokeRect(1, 1, this.w - 2, this.h - 2);

            // Animated amber directional arrows
            ctx.save();
            ctx.translate(cx, cy);
            ctx.rotate(beltAngle);
            const offset = (t / 10) % 50 - 25;
            ctx.fillStyle = 'rgba(255, 195, 60, 0.82)';
            ctx.shadowColor = 'rgba(255, 170, 0, 0.5)';
            ctx.shadowBlur = 7;
            for (let i = -1; i <= 1; i++) {
                const ox = offset + i * 50;
                ctx.beginPath();
                ctx.moveTo(ox - 14, -8);
                ctx.lineTo(ox + 4, 0);
                ctx.lineTo(ox - 14, 8);
                ctx.lineTo(ox - 7, 0);
                ctx.closePath();
                ctx.fill();
            }
            ctx.shadowBlur = 0;
            ctx.restore();

        } else if (this.type === 'TURRET') {
            ctx.save();
            ctx.translate(cx, cy);

            // Hexagonal armored shell
            ctx.shadowColor = 'rgba(231,76,60,0.5)';
            ctx.shadowBlur = 14;
            ctx.strokeStyle = 'rgba(231,76,60,0.55)';
            ctx.lineWidth = 2;
            ctx.beginPath();
            for (let a = 0; a < 6; a++) {
                const ang = (Math.PI / 3) * a - Math.PI / 6;
                a === 0 ? ctx.moveTo(Math.cos(ang) * 36, Math.sin(ang) * 36)
                        : ctx.lineTo(Math.cos(ang) * 36, Math.sin(ang) * 36);
            }
            ctx.closePath();
            ctx.stroke();
            ctx.shadowBlur = 0;

            const baseGrad = ctx.createRadialGradient(0, -4, 3, 0, 0, 33);
            baseGrad.addColorStop(0, '#4a5568');
            baseGrad.addColorStop(0.55, '#2d3748');
            baseGrad.addColorStop(1, '#161b26');
            ctx.fillStyle = baseGrad;
            ctx.beginPath();
            for (let a = 0; a < 6; a++) {
                const ang = (Math.PI / 3) * a - Math.PI / 6;
                a === 0 ? ctx.moveTo(Math.cos(ang) * 33, Math.sin(ang) * 33)
                        : ctx.lineTo(Math.cos(ang) * 33, Math.sin(ang) * 33);
            }
            ctx.closePath();
            ctx.fill();

            // Pivot ring
            ctx.strokeStyle = '#606878';
            ctx.lineWidth = 3;
            ctx.beginPath();
            ctx.arc(0, 0, 13, 0, Math.PI * 2);
            ctx.stroke();

            // Aim toward player and draw barrel
            let aimAngle = 0;
            if (typeof player !== 'undefined') {
                aimAngle = Math.atan2(player.y - (this.y + cy), player.x - (this.x + cx));
            }
            ctx.rotate(aimAngle);
            const barrelGrad = ctx.createLinearGradient(0, -5, 0, 5);
            barrelGrad.addColorStop(0, '#6b7a8a');
            barrelGrad.addColorStop(0.5, '#9daab8');
            barrelGrad.addColorStop(1, '#3e4a58');
            ctx.fillStyle = barrelGrad;
            ctx.fillRect(10, -5, 30, 10);
            ctx.fillRect(14, -7, 10, 14); // Barrel collar

            // Charge glow near fire
            const chargePhase = this.timer / 120;
            if (chargePhase > 0.65) {
                const charge = (chargePhase - 0.65) / 0.35;
                ctx.shadowColor = '#ff4444';
                ctx.shadowBlur = 14 * charge;
                ctx.fillStyle = `rgba(255,68,68,${charge * 0.85})`;
                ctx.beginPath();
                ctx.arc(40, 0, 3 + 4 * charge, 0, Math.PI * 2);
                ctx.fill();
                ctx.shadowBlur = 0;
            }

            // Sensor eye
            ctx.shadowColor = '#ff2222';
            ctx.shadowBlur = 10;
            ctx.fillStyle = '#e74c3c';
            ctx.beginPath();
            ctx.arc(0, 0, 6, 0, Math.PI * 2);
            ctx.fill();
            ctx.shadowBlur = 0;
            ctx.restore();

        } else if (this.type === 'LASER_BEAM') {
            ctx.save();
            ctx.translate(cx, cy);

            // Laser beam layers (drawn before base so base sits on top)
            const ex = Math.cos(this.angle) * 200, ey = Math.sin(this.angle) * 200;
            ctx.shadowBlur = 0;
            ctx.strokeStyle = 'rgba(231,76,60,0.12)';
            ctx.lineWidth = 20;
            ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(ex, ey); ctx.stroke();
            ctx.strokeStyle = 'rgba(231,76,60,0.30)';
            ctx.lineWidth = 9;
            ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(ex, ey); ctx.stroke();
            ctx.shadowColor = '#ff7070';
            ctx.shadowBlur = 5;
            ctx.strokeStyle = '#fff0f0';
            ctx.lineWidth = 2;
            ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(ex, ey); ctx.stroke();
            ctx.shadowBlur = 0;

            // Octagonal emitter base
            const octGrad = ctx.createRadialGradient(0, -2, 1, 0, 0, 14);
            octGrad.addColorStop(0, '#3a4555');
            octGrad.addColorStop(0.65, '#1e2535');
            octGrad.addColorStop(1, '#0e1520');
            ctx.fillStyle = octGrad;
            ctx.beginPath();
            for (let a = 0; a < 8; a++) {
                const ang = (Math.PI / 4) * a - Math.PI / 8;
                a === 0 ? ctx.moveTo(Math.cos(ang) * 13, Math.sin(ang) * 13)
                        : ctx.lineTo(Math.cos(ang) * 13, Math.sin(ang) * 13);
            }
            ctx.closePath();
            ctx.fill();

            // Emitter glow ring
            ctx.shadowColor = '#e74c3c';
            ctx.shadowBlur = 10;
            ctx.strokeStyle = 'rgba(231,76,60,0.85)';
            ctx.lineWidth = 1.5;
            ctx.stroke();
            ctx.shadowBlur = 0;

            // Spinning dashed energy ring
            ctx.save();
            ctx.rotate(t / 300);
            ctx.strokeStyle = 'rgba(255,90,70,0.65)';
            ctx.lineWidth = 2;
            ctx.setLineDash([4, 4]);
            ctx.beginPath();
            ctx.arc(0, 0, 9, 0, Math.PI * 2);
            ctx.stroke();
            ctx.setLineDash([]);
            ctx.restore();

            ctx.restore();

        } else if (this.type === 'TELEPORTER') {
            ctx.save();
            ctx.translate(cx, cy);
            const pulse = (Math.sin(t / 400) + 1) / 2;

            // Portal fill rings
            const ringAlphas = this.active
                ? [0.14, 0.28, 0.48]
                : [0.04, 0.08, 0.14];
            const ringColor = this.active ? '0,210,255' : '52,152,219';
            for (let r = 0; r < 3; r++) {
                ctx.fillStyle = `rgba(${ringColor},${ringAlphas[r]})`;
                ctx.beginPath();
                ctx.arc(0, 0, 40 - r * 10, 0, Math.PI * 2);
                ctx.fill();
            }

            // Outer border ring
            ctx.shadowColor = this.active ? '#00d4ff' : '#3498db';
            ctx.shadowBlur = this.active ? 18 + pulse * 8 : 4;
            ctx.strokeStyle = this.active
                ? `rgba(0,210,255,${0.7 + pulse * 0.3})`
                : 'rgba(52,152,219,0.3)';
            ctx.lineWidth = 2;
            ctx.beginPath();
            ctx.arc(0, 0, 40, 0, Math.PI * 2);
            ctx.stroke();
            ctx.shadowBlur = 0;

            if (this.active) {
                // Three rotating vortex arcs
                for (let arm = 0; arm < 3; arm++) {
                    ctx.save();
                    ctx.rotate(t / 500 + (arm * Math.PI * 2) / 3);
                    ctx.strokeStyle = `rgba(0,220,255,${0.38 + arm * 0.15})`;
                    ctx.lineWidth = 1.5 + arm * 0.5;
                    ctx.beginPath();
                    ctx.arc(0, 0, 28 - arm * 6, 0, Math.PI * 1.4);
                    ctx.stroke();
                    ctx.restore();
                }
                // Inner radiant core
                const coreGrad = ctx.createRadialGradient(0, 0, 0, 0, 0, 15);
                coreGrad.addColorStop(0, `rgba(210,248,255,${0.85 + pulse * 0.15})`);
                coreGrad.addColorStop(0.5, 'rgba(0,200,255,0.5)');
                coreGrad.addColorStop(1, 'rgba(0,100,200,0)');
                ctx.fillStyle = coreGrad;
                ctx.beginPath();
                ctx.arc(0, 0, 15, 0, Math.PI * 2);
                ctx.fill();
            } else {
                // Inactive dim center
                ctx.fillStyle = `rgba(52,152,219,${0.08 + pulse * 0.05})`;
                ctx.beginPath();
                ctx.arc(0, 0, 14, 0, Math.PI * 2);
                ctx.fill();
            }
            ctx.restore();
        }

        ctx.restore();
    }
}

window.getHeroTheme = function (type) {
    if (type === 'fire') return { bg: '#2c0b0b', grid: '#521818' };
    if (type === 'water') return { bg: '#0b1a2c', grid: '#183652' };
    if (type === 'ice') return { bg: '#1a252a', grid: '#2c3e50' };
    if (type === 'plant') return { bg: '#0b2c14', grid: '#185226' };
    if (type === 'metal') return { bg: '#1a1a1a', grid: '#333' };
    if (type === 'black') return { bg: '#000000', grid: '#2c3e50' };
    if (type === 'lightning') return { bg: '#101020', grid: '#303060' };
    if (type === 'earth') return { bg: '#2e2718', grid: '#584930' };
    if (type === 'gravity') return { bg: '#1a0b2e', grid: '#4a235a' };
    if (type === 'void') return { bg: '#0b0b1a', grid: '#004c54' }; // Low contrast cyan
    if (type === 'air') return { bg: '#87CEEB', grid: '#E0F7FA' }; // Sky Palace
    if (type === 'spirit') return { bg: '#2a2000', grid: '#4a3b00' }; // Temple Gold
    if (type === 'chance') return { bg: '#1a0b1a', grid: '#4a004a' }; // Casino Neon
    if (type === 'sound') return { bg: '#b3e5fc', grid: '#b8d4e1' }; // Harmonic Plains
    if (type === 'poison') return { bg: '#dcedc8', grid: '#aed581' }; // Toxic Bog
    if (type === 'smoke')  return { bg: '#14140f', grid: '#3a3a32' }; // Smog Quarter
    if (type === 'mirror') return { bg: '#050d18', grid: '#1a5276' }; // Hall of Mirrors
    return { bg: '#1a1a1a', grid: '#333' };
};
// ESM exports — server/loader.js unwraps via `.default`. window shims keep
// BiomeZone / Obstacle / Trap reachable for DLC files (RockBiome, TimeBiome,
// LoveBiome, etc.) that instantiate them from classic-script context.
export { Arena, BiomeZone, Obstacle, Trap };
export default Arena;
if (typeof window !== 'undefined') {
    window.Arena = Arena;
    window.BiomeZone = BiomeZone;
    window.Obstacle = Obstacle;
    window.Trap = Trap;
}
