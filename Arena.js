class Arena {
    constructor(width, height) {
        this.width = width;
        this.height = height;
        this.camera = { x: 0, y: 0, width: 0, height: 0 };
        this.obstacles = [];
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

        // Draw Obstacles
        this.obstacles.forEach(obs => obs.draw(ctx));
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
