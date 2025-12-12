class Museum {
    constructor() {
        this.width = 2400;
        this.height = 1800;
        this.camera = { x: 0, y: 0, width: canvas.width, height: canvas.height };
        this.entities = [];
        this.walls = [];
        this.rooms = [];
        this.artifacts = [];
        this.cards = [];

        // Player Avatar in Museum (defaults to selected hero)
        this.player = { x: 1200, y: 1600, radius: 20, speed: 5, type: selectedHeroType, angle: 0 };

        this.generateLayout();
        this.spawnEntities();
    }

    generateLayout() {
        // Define Rooms
        // Main Hall: 800, 1200 to 1600, 1800 (Entrance)
        // Central Hub: 800, 800 to 1600, 1200
        // Hero Rooms: Top (3), Left (1), Right (1)
        // Gallery: Bottom Left/Right or separate wing? 
        // Let's make a cross shape with extra rooms.

        // Walls (x, y, w, h)
        this.walls = [
            // Outer Boundary
            { x: 0, y: 0, w: 2400, h: 50 }, // Top
            { x: 0, y: 1750, w: 2400, h: 50 }, // Bottom
            { x: 0, y: 0, w: 50, h: 1800 }, // Left
            { x: 2350, y: 0, w: 50, h: 1800 }, // Right

            // Room Dividers
            // Horizontal Line at y=600 (Top Rooms)
            { x: 0, y: 600, w: 900, h: 50 },
            { x: 1500, y: 600, w: 900, h: 50 },

            // Vertical Lines for Top Rooms (3 rooms: 0-800, 800-1600, 1600-2400)
            { x: 800, y: 0, w: 50, h: 600 },
            { x: 1600, y: 0, w: 50, h: 600 },

            // Central Hub Walls
            { x: 600, y: 600, w: 50, h: 600 }, // Left Hub Wall
            { x: 1750, y: 600, w: 50, h: 600 }, // Right Hub Wall
        ];

        // Define Zones for Logic/Decor
        this.rooms = [
            { name: 'fire', x: 50, y: 50, w: 750, h: 550, color: '#2c0b0b' },
            { name: 'water', x: 850, y: 50, w: 750, h: 550, color: '#0b1a2c' },
            { name: 'ice', x: 1650, y: 50, w: 700, h: 550, color: '#1a252a' },
            { name: 'plant', x: 50, y: 650, w: 550, h: 1100, color: '#0b2c14' }, // Left Wing
            { name: 'metal', x: 1800, y: 650, w: 550, h: 1100, color: '#1a1a1a' }, // Right Wing
            { name: 'gallery', x: 650, y: 650, w: 1100, h: 1100, color: '#333' } // Central/Main
        ];
    }

    spawnEntities() {
        // Spawn Heroes in their rooms (Exclude current player)
        if (this.player.type !== 'fire') this.entities.push(new MuseumEntity(400, 300, 'fire', true));
        if (this.player.type !== 'water') this.entities.push(new MuseumEntity(1200, 300, 'water', true));
        if (this.player.type !== 'ice') this.entities.push(new MuseumEntity(2000, 300, 'ice', true));
        if (this.player.type !== 'plant') this.entities.push(new MuseumEntity(300, 1200, 'plant', true));
        if (this.player.type !== 'metal') this.entities.push(new MuseumEntity(2100, 1200, 'metal', true));

        // Spawn Collected Enemies in Gallery
        const collected = saveData.collection || [];
        collected.forEach((id, index) => {
            // Simple grid layout in Gallery
            const col = index % 10;
            const row = Math.floor(index / 10);
            const x = 700 + col * 100;
            const y = 800 + row * 100;

            // Parse ID to get type (e.g., "BASIC_1" -> "BASIC")
            const type = id.split('_')[0];
            this.entities.push(new MuseumEntity(x, y, type, false));
        });
    }

    update() {
        // Move Player
        let dx = 0; let dy = 0;
        if (keys['ArrowUp'] || keys['w']) dy = -this.player.speed;
        if (keys['ArrowDown'] || keys['s']) dy = this.player.speed;
        if (keys['ArrowLeft'] || keys['a']) dx = -this.player.speed;
        if (keys['ArrowRight'] || keys['d']) dx = this.player.speed;

        // Gamepad
        const gp = navigator.getGamepads()[0];
        if (gp) {
            if (Math.abs(gp.axes[0]) > 0.1) dx = gp.axes[0] * this.player.speed;
            if (Math.abs(gp.axes[1]) > 0.1) dy = gp.axes[1] * this.player.speed;

            // Exit with B
            if (gp.buttons[1].pressed) {
                setUIState('MENU');
                document.getElementById('menu-overlay').style.display = 'flex';
            }
        }

        // Update Rotation
        if (dx !== 0 || dy !== 0) {
            this.player.angle = Math.atan2(dy, dx);
        }

        // Collision with Walls
        const nextX = this.player.x + dx;
        const nextY = this.player.y + dy;
        if (!this.checkWallCollision(nextX, this.player.y)) this.player.x = nextX;
        if (!this.checkWallCollision(this.player.x, nextY)) this.player.y = nextY;

        // Update Camera
        this.camera.x = this.player.x - this.camera.width / 2;
        this.camera.y = this.player.y - this.camera.height / 2;

        // Clamp Camera
        this.camera.x = Math.max(0, Math.min(this.camera.x, this.width - this.camera.width));
        this.camera.y = Math.max(0, Math.min(this.camera.y, this.height - this.camera.height));

        // Update Entities (Wander)
        this.entities.forEach(e => e.update(this.walls));
    }

    checkWallCollision(x, y) {
        // Boundary
        if (x < 0 || x > this.width || y < 0 || y > this.height) return true;

        // Walls
        for (let w of this.walls) {
            if (x > w.x && x < w.x + w.w && y > w.y && y < w.y + w.h) return true;
        }
        return false;
    }

    draw(ctx) {
        ctx.save();
        ctx.translate(-this.camera.x, -this.camera.y);

        // Draw Floor
        ctx.fillStyle = '#111';
        ctx.fillRect(0, 0, this.width, this.height);

        // Draw Rooms
        this.rooms.forEach(r => {
            ctx.fillStyle = r.color;
            ctx.fillRect(r.x, r.y, r.w, r.h);

            // Room Label
            ctx.fillStyle = 'rgba(255,255,255,0.1)';
            ctx.font = 'bold 40px Arial';
            ctx.textAlign = 'center';
            ctx.fillText(r.name.toUpperCase(), r.x + r.w / 2, r.y + r.h / 2);

            // Draw Artifacts (Prestige)
            if (['fire', 'water', 'ice', 'plant', 'metal'].includes(r.name)) {
                const prestige = saveData[r.name].prestige;
                for (let i = 0; i < prestige; i++) {
                    const ax = r.x + 50 + (i % 10) * 40;
                    const ay = r.y + 50 + Math.floor(i / 10) * 40;
                    this.drawArtifact(ctx, ax, ay, r.name);
                }
            }
        });

        // Draw Walls
        ctx.fillStyle = '#444';
        this.walls.forEach(w => {
            ctx.fillRect(w.x, w.y, w.w, w.h);
            ctx.strokeStyle = '#000';
            ctx.strokeRect(w.x, w.y, w.w, w.h);
        });

        // Draw Entities
        this.entities.forEach(e => e.draw(ctx));

        // Draw Player
        this.drawPlayer(ctx);

        ctx.restore();

        // UI Overlay
        ctx.fillStyle = 'white';
        ctx.font = '20px Arial';
        ctx.textAlign = 'center';
        ctx.fillText("MUSEUM - Press ESC or B to Exit", canvas.width / 2, 30);
    }

    drawArtifact(ctx, x, y, type) {
        ctx.save();
        ctx.translate(x, y);
        if (type === 'fire') {
            ctx.fillStyle = '#e74c3c';
            ctx.beginPath(); ctx.moveTo(0, -10); ctx.lineTo(5, 5); ctx.lineTo(-5, 5); ctx.fill();
        } else if (type === 'water') {
            ctx.fillStyle = '#3498db';
            ctx.beginPath(); ctx.arc(0, 0, 5, 0, Math.PI * 2); ctx.fill();
        } else if (type === 'ice') {
            ctx.fillStyle = '#ecf0f1';
            ctx.fillRect(-4, -4, 8, 8);
        } else if (type === 'plant') {
            ctx.fillStyle = '#2ecc71';
            ctx.beginPath(); ctx.arc(0, -5, 5, 0, Math.PI); ctx.fill(); ctx.fillRect(-1, 0, 2, 8);
        } else if (type === 'metal') {
            ctx.fillStyle = '#95a5a6';
            ctx.beginPath(); ctx.moveTo(0, -6); ctx.lineTo(6, 0); ctx.lineTo(0, 6); ctx.lineTo(-6, 0); ctx.fill();
        }
        ctx.restore();
    }

    drawPlayer(ctx) {
        ctx.save();
        ctx.translate(this.player.x, this.player.y);

        // Rotate based on movement
        ctx.rotate(this.player.angle);

        let color = '#f1c40f';
        if (this.player.type === 'fire') color = '#e74c3c';
        if (this.player.type === 'water') color = '#3498db';
        if (this.player.type === 'ice') color = '#ecf0f1';
        if (this.player.type === 'plant') color = '#2ecc71';
        if (this.player.type === 'metal') color = '#95a5a6';

        ctx.fillStyle = color;
        ctx.beginPath(); ctx.arc(0, 0, 15, 0, Math.PI * 2); ctx.fill();
        ctx.lineWidth = 3; ctx.strokeStyle = '#111'; ctx.stroke();

        // Visor
        ctx.fillStyle = '#000'; ctx.fillRect(0, -4, 16, 8);

        // Hands/Shoulders
        ctx.fillStyle = shadeColor(color, -40);
        ctx.beginPath(); ctx.arc(0, -15, 8, 0, Math.PI * 2); ctx.arc(0, 15, 8, 0, Math.PI * 2); ctx.fill();

        ctx.restore();
    }
}

class MuseumEntity {
    constructor(x, y, type, isHero) {
        this.x = x;
        this.y = y;
        this.type = type;
        this.isHero = isHero;
        this.angle = Math.random() * Math.PI * 2;
        this.timer = Math.random() * 100;

        // Defaults
        this.radius = 20;
        this.color = '#fff';
        this.sides = 0;
        this.alpha = 1;

        if (this.isHero) {
            if (this.type === 'fire') this.color = '#e74c3c';
            if (this.type === 'water') this.color = '#3498db';
            if (this.type === 'ice') this.color = '#ecf0f1';
            if (this.type === 'plant') this.color = '#2ecc71';
            if (this.type === 'metal') this.color = '#95a5a6';
        } else {
            // Enemy Defaults
            this.radius = 15 + Math.random() * 10;
            this.color = '#555';
            this.sides = Math.floor(Math.random() * 3) + 4;

            if (this.type === 'SHOOTER') { this.radius = 18; this.color = '#f1c40f'; this.sides = 3; }
            else if (this.type === 'BRUTE') { this.radius = 30; this.color = '#5d4037'; this.sides = 4; }
            else if (this.type === 'SPEEDSTER') { this.radius = 12; this.color = '#e74c3c'; this.sides = 3; }
            else if (this.type === 'SWARM') { this.radius = 8; this.color = '#8e44ad'; this.sides = 0; }
            else if (this.type === 'SUMMONER') { this.radius = 25; this.color = '#2980b9'; this.sides = 5; }
            else if (this.type === 'GHOST') { this.radius = 15; this.color = '#bdc3c7'; this.sides = 0; this.alpha = 0.6; }
            else if (this.type === 'SNIPER') { this.radius = 15; this.color = '#16a085'; this.sides = 3; }
            else if (this.type === 'BOMBER') { this.radius = 22; this.color = '#2c3e50'; this.sides = 8; }
            else if (this.type === 'TOXIC') { this.radius = 18; this.color = '#27ae60'; this.sides = 6; }
            else if (this.type === 'SHIELDER') { this.radius = 25; this.color = '#7f8c8d'; this.sides = 4; }
            else { this.type = 'BASIC'; } // Fallback
        }
    }

    update(walls) {
        // Simple Wander
        this.timer--;
        if (this.timer <= 0) {
            this.angle += (Math.random() - 0.5) * 2;
            this.timer = 50 + Math.random() * 100;
        }

        const speed = 0.5;
        const dx = Math.cos(this.angle) * speed;
        const dy = Math.sin(this.angle) * speed;

        // Check Wall Collision
        const nextX = this.x + dx;
        const nextY = this.y + dy;

        let hitWall = false;
        // Boundary
        if (nextX < 0 || nextX > 2400 || nextY < 0 || nextY > 1800) hitWall = true;

        // Walls
        if (!hitWall) {
            for (let w of walls) {
                if (nextX > w.x && nextX < w.x + w.w && nextY > w.y && nextY < w.y + w.h) {
                    hitWall = true;
                    break;
                }
            }
        }

        if (!hitWall) {
            this.x = nextX;
            this.y = nextY;
        } else {
            // Turn around if hit wall
            this.angle += Math.PI;
        }
    }

    draw(ctx) {
        ctx.save();
        ctx.translate(this.x, this.y);

        // Rotate slightly for movement effect or just face direction
        // Since they wander randomly, let's just use their movement angle
        ctx.rotate(this.angle);

        if (this.isHero) {
            // Draw Hero Style (Matching Player.js)
            ctx.fillStyle = this.color;
            ctx.beginPath(); ctx.arc(0, 0, 15, 0, Math.PI * 2); ctx.fill(); // Radius 15 for museum heroes
            ctx.lineWidth = 3; ctx.strokeStyle = '#111'; ctx.stroke();

            // Visor
            ctx.fillStyle = '#000'; ctx.fillRect(0, -4, 16, 8);

            // Hands/Shoulders
            ctx.fillStyle = shadeColor(this.color, -40);
            ctx.beginPath(); ctx.arc(0, -15, 8, 0, Math.PI * 2); ctx.arc(0, 15, 8, 0, Math.PI * 2); ctx.fill();

        } else {
            // Draw Enemy Style (Matching Enemy.js)
            ctx.globalAlpha = this.alpha;
            ctx.fillStyle = this.color; ctx.strokeStyle = '#888'; ctx.lineWidth = 2;
            ctx.beginPath();

            if (this.sides === 0) { // Circle
                ctx.arc(0, 0, this.radius, 0, Math.PI * 2);
            } else {
                // Draw Polygon
                ctx.moveTo(this.radius, 0);
                for (let i = 1; i <= this.sides; i++) {
                    ctx.lineTo(this.radius * Math.cos(i * 2 * Math.PI / this.sides), this.radius * Math.sin(i * 2 * Math.PI / this.sides));
                }
            }
            ctx.closePath(); ctx.fill(); ctx.stroke();

            // Eyes
            ctx.fillStyle = 'white';
            ctx.beginPath(); ctx.arc(this.radius * 0.3, -this.radius * 0.3, this.radius * 0.25, 0, Math.PI * 2); ctx.fill();
            ctx.beginPath(); ctx.arc(this.radius * 0.3, this.radius * 0.3, this.radius * 0.25, 0, Math.PI * 2); ctx.fill();
            // Pupils
            ctx.fillStyle = 'red';
            ctx.beginPath(); ctx.arc(this.radius * 0.4, -this.radius * 0.3, this.radius * 0.1, 0, Math.PI * 2); ctx.fill();
            ctx.beginPath(); ctx.arc(this.radius * 0.4, this.radius * 0.3, this.radius * 0.1, 0, Math.PI * 2); ctx.fill();

            // Visual Markers
            if (this.type === 'SNIPER') {
                ctx.globalAlpha = 0.3;
                ctx.strokeStyle = 'red'; ctx.lineWidth = 1;
                ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(50, 0); ctx.stroke(); // Short laser
            }
            if (this.type === 'BOMBER') {
                const pulse = Math.sin(Date.now() * 0.005) * 3;
                ctx.strokeStyle = 'orange'; ctx.beginPath(); ctx.arc(0, 0, this.radius + pulse, 0, Math.PI * 2); ctx.stroke();
            }
            if (this.type === 'SHIELDER') {
                ctx.rotate(Date.now() * 0.002);
                ctx.fillStyle = '#95a5a6'; ctx.fillRect(this.radius + 5, -10, 10, 20);
            }
        }
        ctx.restore();
    }
}
