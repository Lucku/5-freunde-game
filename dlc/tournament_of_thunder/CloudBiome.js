class CloudBiome {
    // Static State
    static windTimer = 0;
    static windDirection = { x: 1, y: 0 };
    static name = "Cloud Kingdom";
    static flashOpacity = 0; // State for flash rendering

    static generate(arena) {
        // Add Cloud Platforms / Zones
        // In Cloud Biome, maybe "Open Sky" (Fall hazard) or "Storm Clouds" (Damage)
        const cx = arena.width / 2;
        const cy = arena.height / 2;

        // Storm Zones
        arena.biomeZones.push(new BiomeZone(cx - 600, cy - 600, 400, 400, 'STORM'));
        arena.biomeZones.push(new BiomeZone(cx + 400, cy + 400, 400, 400, 'STORM'));

        // Obstacles (Cloud Pillars)
        if (typeof Obstacle !== 'undefined') {
            arena.obstacles.push(new Obstacle(cx, cy - 300, 150, 150));
            arena.obstacles.push(new Obstacle(cx - 400, cy + 200, 100, 100));
            arena.obstacles.push(new Obstacle(cx + 400, cy - 200, 100, 100));
        }
    }

    static update(arena, player, enemies) {
        // Wind Mechanic
        this.windTimer++;

        // Initialize Bolt Array if missing
        if (!this.backgroundBolts) this.backgroundBolts = [];

        // Thunder Flash Effect
        if (typeof ctx !== 'undefined') {
            // Random chance for thunder (Increased frequency)
            if (Math.random() < 0.02) { // 2% chance (approx every 0.8s)
                this.flashOpacity = 0.6; // Slightly less blinding
            }

            // Generate Background Bolts
            if (Math.random() < 0.05) {
                this.backgroundBolts.push({
                    x: arena.camera.x + Math.random() * canvas.width,
                    y: arena.camera.y + Math.random() * canvas.height,
                    life: 10,
                    segments: this.generateBoltSegments()
                });
            }

            // Draw Flash (Screen tint)
            if (this.flashOpacity > 0) {
                ctx.save();
                ctx.resetTransform(); // Draw strictly over everything
                ctx.fillStyle = `rgba(255, 255, 255, ${this.flashOpacity * 0.3})`;
                ctx.fillRect(0, 0, canvas.width, canvas.height);
                ctx.restore();

                this.flashOpacity -= 0.05; // Fade out
            }
        }

        if (this.windTimer > 600) {
            const angle = Math.random() * Math.PI * 2;
            this.windDirection.x = Math.cos(angle) * 0.5;
            this.windDirection.y = Math.sin(angle) * 0.5;
            this.windTimer = 0;

            // Visual feedback
            if (Math.random() < 0.5 && typeof particles !== 'undefined') {
                // Wind Gust visual
                for (let i = 0; i < 5; i++) {
                    particles.push({
                        x: player.x - 500 + Math.random() * 1000,
                        y: player.y - 500 + Math.random() * 1000,
                        vx: this.windDirection.x * 5,
                        vy: this.windDirection.y * 5,
                        alpha: 1.0,
                        color: 'rgba(255,255,255,0.2)',
                        size: 20,
                        update: function () {
                            this.x += this.vx;
                            this.y += this.vy;
                            this.alpha -= 0.02; // Fade out
                        },
                        draw: function () {
                            if (typeof ctx === 'undefined') return;
                            ctx.fillStyle = this.color;
                            ctx.globalAlpha = this.alpha;
                            ctx.beginPath();
                            ctx.arc(this.x, this.y, this.size, 0, Math.PI * 2);
                            ctx.fill();
                            ctx.globalAlpha = 1.0;
                        }
                    });
                }
            }
        }

        // Apply Wind Force
        // Lightning hero (and maybe others with heavy armor?) are resistant
        let resistance = 1;
        if (player.type === 'lightning') resistance = 0.5;
        if (player.type === 'metal') resistance = 0.2;
        if (player.type === 'earth') resistance = 0.0; // Too heavy

        const pdx = this.windDirection.x * resistance;
        const pdy = this.windDirection.y * resistance;
        if (!arena.checkCollision(player.x + pdx, player.y + pdy, player.radius)) {
            player.x += pdx;
            player.y += pdy;
        } else {
            if (!arena.checkCollision(player.x + pdx, player.y, player.radius)) player.x += pdx;
            else if (!arena.checkCollision(player.x, player.y + pdy, player.radius)) player.y += pdy;
        }

        // Enemies
        enemies.forEach(e => {
            // Flying enemies might drift more
            let eRes = 1;
            if (e.type && (e.type === 'CLOUD_BAT' || e.type.includes('GHOST'))) eRes = 1.5;
            if (e.type && (e.type.includes('GOLEM') || e.type.includes('TANK'))) eRes = 0.1;

            const edx = this.windDirection.x * eRes;
            const edy = this.windDirection.y * eRes;
            if (!arena.checkCollision(e.x + edx, e.y + edy, e.radius)) {
                e.x += edx;
                e.y += edy;
            } else {
                if (!arena.checkCollision(e.x + edx, e.y, e.radius)) e.x += edx;
                else if (!arena.checkCollision(e.x, e.y + edy, e.radius)) e.y += edy;
            }
        });

        // Handle Zones
        if (arena.biomeZones) {
            arena.biomeZones.forEach(zone => {
                if (player.x > zone.x && player.x < zone.x + zone.w &&
                    player.y > zone.y && player.y < zone.y + zone.h) {

                    if (zone.type === 'STORM') {
                        // Storm Logic
                        if (player.type !== 'lightning' && Math.random() < 0.01) {
                            player.hp -= 1; // Minor chip damage to non-natives
                        }
                    }
                }
            });
        }
    }

    static generateBoltSegments() {
        // Simple vertical-ish jagged line
        let points = [{ x: 0, y: -100 }];
        let tx = 0, ty = -100;
        for (let i = 0; i < 5; i++) {
            tx += (Math.random() - 0.5) * 40;
            ty += 40 + Math.random() * 40;
            points.push({ x: tx, y: ty });
        }
        return points;
    }

    static draw(ctx, arena) {
        // Draw Bolts (Overlay)
        if (this.backgroundBolts) {
            ctx.save();
            ctx.lineWidth = 3;

            for (let i = this.backgroundBolts.length - 1; i >= 0; i--) {
                const b = this.backgroundBolts[i];
                b.life--;

                ctx.strokeStyle = `rgba(200, 200, 255, ${b.life / 10})`;
                ctx.beginPath();
                ctx.moveTo(b.x + b.segments[0].x, b.y + b.segments[0].y);
                for (let j = 1; j < b.segments.length; j++) {
                    ctx.lineTo(b.x + b.segments[j].x, b.y + b.segments[j].y);
                }
                ctx.stroke();

                if (b.life <= 0) this.backgroundBolts.splice(i, 1);
            }
            ctx.restore();
        }
    }
}

window.CloudBiome = CloudBiome;
window.BIOME_LOGIC['lightning'] = CloudBiome; // Register logic
