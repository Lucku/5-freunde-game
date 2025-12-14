class Arena {
    constructor(width, height) {
        this.width = width;
        this.height = height;
        this.camera = { x: 0, y: 0, width: 0, height: 0 };
        this.obstacles = [];
        this.traps = [];
        this.biomeZones = [];
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

    generate(biomeType) {
        this.obstacles = [];
        this.biomeZones = [];
        const layout = Math.floor(Math.random() * 5);
        const cx = this.width / 2;
        const cy = this.height / 2;

        console.log(`Generating Arena: Layout ${layout}, Biome ${biomeType}, Size ${this.width}x${this.height}`);

        // --- Biome Generation ---
        if (biomeType === 'fire') {
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

        if (layout === 0) { // 4 Corners
            this.obstacles.push(new Obstacle(w * 0.1, h * 0.1, 200, 200));
            this.obstacles.push(new Obstacle(w * 0.9 - 200, h * 0.1, 200, 200));
            this.obstacles.push(new Obstacle(w * 0.1, h * 0.9 - 200, 200, 200));
            this.obstacles.push(new Obstacle(w * 0.9 - 200, h * 0.9 - 200, 200, 200));
        } else if (layout === 1) { // Horizontal Bars
            this.obstacles.push(new Obstacle(cx - 600, cy - 100, 200, 200));
            this.obstacles.push(new Obstacle(cx + 400, cy - 100, 200, 200));
        } else if (layout === 2) { // Vertical Walls
            this.obstacles.push(new Obstacle(w * 0.3, h * 0.1, 100, h * 0.3));
            this.obstacles.push(new Obstacle(w * 0.3, h * 0.6, 100, h * 0.3));
            this.obstacles.push(new Obstacle(w * 0.7, h * 0.1, 100, h * 0.3));
            this.obstacles.push(new Obstacle(w * 0.7, h * 0.6, 100, h * 0.3));
        } else if (layout === 3) { // Central Block
            this.obstacles.push(new Obstacle(cx - 150, cy - 150, 300, 300));
        } else if (layout === 4) { // Scattered
            for (let i = 0; i < 15; i++) {
                const x = Math.random() * (w - 200) + 100;
                const y = Math.random() * (h - 200) + 100;
                if (Math.hypot(x - cx, y - cy) > 400) { // Keep center clear
                    this.obstacles.push(new Obstacle(x, y, 100, 100));
                }
            }
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
        for (let i = 0; i < trapCount; i++) {
            const pos = this.getRandomSafePosition(50);
            const type = ['SLOW', 'CONVEYOR'][Math.floor(Math.random() * 2)];
            this.traps.push(new Trap(pos.x, pos.y, type));
        }
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

        // Draw Obstacles
        this.obstacles.forEach(obs => obs.draw(ctx));
    }

    update(player) {
        // Check Trap Collisions
        this.traps.forEach(trap => {
            trap.update(); // Update state

            const dx = player.x - (trap.x + trap.w / 2);
            const dy = player.y - (trap.y + trap.h / 2);
            if (Math.abs(dx) < trap.w / 2 && Math.abs(dy) < trap.h / 2) {
                if (trap.type === 'SPIKE' && trap.active) {
                    if (frame % 60 === 0) player.hp -= 10; // Damage every second if active
                } else if (trap.type === 'SLOW') {
                    player.trapSpeedMod = 0.5; // Slow down
                } else if (trap.type === 'CONVEYOR') {
                    player.x += trap.vx;
                    player.y += trap.vy;
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
                            floatingTexts.push(new FloatingText(player.x, player.y - 30, "+1", "#9b59b6", 14));

                            if (zone.healthYielded >= zone.maxHealthYield) {
                                zone.depleted = true;
                                floatingTexts.push(new FloatingText(zone.x + zone.w / 2, zone.y + zone.h / 2, "DEPLETED", "#555", 20));
                            }
                        }
                    } else {
                        // Damage other heroes (Makuta Fight Logic)
                        if (frame % 60 === 0) {
                            player.hp -= 5 * (1 - player.damageReduction);
                            createExplosion(player.x, player.y, '#8e44ad');
                            floatingTexts.push(new FloatingText(player.x, player.y - 20, "5", "#8e44ad", 16));
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
                                floatingTexts.push(new FloatingText(e.x, e.y - 50, "+50", "#9b59b6", 20));
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
        for (let obs of this.obstacles) {
            let closestX = Math.max(obs.x, Math.min(x, obs.x + obs.w));
            let closestY = Math.max(obs.y, Math.min(y, obs.y + obs.h));
            let dx = x - closestX;
            let dy = y - closestY;
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
        }

        ctx.fillRect(this.x, this.y, this.w, this.h);
        ctx.lineWidth = 2;
        ctx.strokeRect(this.x, this.y, this.w, this.h);
        ctx.restore();
    }
}

class Obstacle {
    constructor(x, y, w, h) {
        this.x = x; this.y = y; this.w = w; this.h = h;
    }
    draw(ctx) {
        ctx.fillStyle = '#444';
        ctx.fillRect(this.x, this.y, this.w, this.h);
        ctx.strokeStyle = '#666';
        ctx.lineWidth = 2;
        ctx.strokeRect(this.x, this.y, this.w, this.h);
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
        }
    }

    update() {
        if (this.type === 'SPIKE') {
            this.timer++;
            if (this.timer > 200) { // Cycle every ~3 seconds
                this.active = !this.active;
                this.timer = 0;
            }
        }
    }

    draw(ctx) {
        ctx.save();
        ctx.translate(this.x, this.y);

        if (this.type === 'SPIKE') {
            // Background (Floor)
            ctx.fillStyle = '#222';
            ctx.fillRect(0, 0, this.w, this.h);

            if (this.active) {
                // Spikes UP
                ctx.fillStyle = '#7f8c8d'; // Metallic
                for (let i = 0; i < 4; i++) {
                    for (let j = 0; j < 4; j++) {
                        ctx.beginPath();
                        ctx.moveTo(i * 25, j * 25 + 25);
                        ctx.lineTo(i * 25 + 12.5, j * 25); // Pointy
                        ctx.lineTo(i * 25 + 25, j * 25 + 25);
                        ctx.fill();
                    }
                }
                // Red tips
                ctx.fillStyle = '#c0392b';
                for (let i = 0; i < 4; i++) {
                    for (let j = 0; j < 4; j++) {
                        ctx.beginPath();
                        ctx.moveTo(i * 25 + 12.5, j * 25);
                        ctx.lineTo(i * 25 + 10, j * 25 + 5);
                        ctx.lineTo(i * 25 + 15, j * 25 + 5);
                        ctx.fill();
                    }
                }
            } else {
                // Spikes DOWN (Holes)
                ctx.fillStyle = '#111';
                for (let i = 0; i < 4; i++) {
                    for (let j = 0; j < 4; j++) {
                        ctx.beginPath();
                        ctx.arc(i * 25 + 12.5, j * 25 + 12.5, 5, 0, Math.PI * 2);
                        ctx.fill();
                    }
                }
            }
        } else if (this.type === 'SLOW') {
            // Subtle Mud/Web
            ctx.fillStyle = 'rgba(100, 100, 100, 0.2)'; // Very subtle
            ctx.fillRect(0, 0, this.w, this.h);
            // No border, just some specks
            ctx.fillStyle = 'rgba(0,0,0,0.3)';
            for (let i = 0; i < 5; i++) {
                ctx.fillRect(Math.random() * this.w, Math.random() * this.h, 5, 5);
            }
        } else if (this.type === 'CONVEYOR') {
            // Subtle Wind
            ctx.fillStyle = 'rgba(255, 255, 255, 0.05)';
            ctx.fillRect(0, 0, this.w, this.h);
        }
        ctx.restore();

        // Conveyor Arrows (Separate to handle rotation correctly)
        if (this.type === 'CONVEYOR') {
            ctx.save();
            ctx.translate(this.x + this.w / 2, this.y + this.h / 2);
            const angle = Math.atan2(this.vy, this.vx);
            ctx.rotate(angle);
            ctx.fillStyle = 'rgba(255,255,255,0.1)'; // Faint arrows
            const offset = (Date.now() / 10) % 50 - 25;

            for (let i = -1; i <= 1; i++) {
                ctx.beginPath();
                ctx.moveTo(-20 + offset + i * 50, -10);
                ctx.lineTo(0 + offset + i * 50, 0);
                ctx.lineTo(-20 + offset + i * 50, 10);
                ctx.fill();
            }
            ctx.restore();
        }
    }
}

