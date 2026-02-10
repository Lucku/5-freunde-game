class WindBiome {
    constructor() {
        this.name = "Sky Palace";
        this.color = "#e0f7fa"; // Very light cyan
        this.particles = [];
        this.frame = 0;
    }

    generate(arena) {
        console.log("Generating Sky Palace Biome...");
        const w = arena.width;
        const h = arena.height;

        // 1. SKY PLATFORMS (Obstacles)
        // Cloud-like platforms
        for (let i = 0; i < 15; i++) {
            const width = 150 + Math.random() * 150;
            const height = 100 + Math.random() * 100;
            const x = Math.random() * (w - width);
            const y = Math.random() * (h - height);

            if (Math.hypot(x + width / 2 - w / 2, y + height / 2 - h / 2) < 400) continue;

            const platform = new Obstacle(x, y, width, height);

            // Custom Draw
            platform.draw = (ctx) => {
                ctx.save();
                ctx.translate(platform.x, platform.y);
                ctx.fillStyle = '#ffffff';
                ctx.shadowColor = 'rgba(0,0,0,0.1)';
                ctx.shadowBlur = 15;

                // Rounded Box
                ctx.beginPath();
                ctx.moveTo(20, 0);
                ctx.lineTo(platform.w - 20, 0);
                ctx.quadraticCurveTo(platform.w, 0, platform.w, 20);
                ctx.lineTo(platform.w, platform.h - 20);
                ctx.quadraticCurveTo(platform.w, platform.h, platform.w - 20, platform.h);
                ctx.lineTo(20, platform.h);
                ctx.quadraticCurveTo(0, platform.h, 0, platform.h - 20);
                ctx.lineTo(0, 20);
                ctx.quadraticCurveTo(0, 0, 20, 0);
                ctx.fill();

                // Accents
                ctx.strokeStyle = '#b2ebf2';
                ctx.lineWidth = 3;
                ctx.stroke();

                ctx.restore();
            };

            arena.obstacles.push(platform);
        }

        // 2. UPDRAFTS (Biome Zones)
        for (let i = 0; i < 8; i++) {
            const size = 250;
            const x = Math.random() * (w - size);
            const y = Math.random() * (h - size);

            const updraft = new BiomeZone(x, y, size, size, 'UPDRAFT');

            updraft.draw = (ctx) => {
                ctx.save();
                ctx.translate(updraft.x, updraft.y);
                ctx.fillStyle = 'rgba(64, 224, 208, 0.1)';
                ctx.strokeStyle = 'rgba(64, 224, 208, 0.3)';
                ctx.lineWidth = 2;
                ctx.setLineDash([15, 10]);
                ctx.strokeRect(0, 0, updraft.w, updraft.h);
                ctx.fillRect(0, 0, updraft.w, updraft.h);

                // Arrows
                const time = Date.now() / 150;
                ctx.fillStyle = 'rgba(255, 255, 255, 0.5)';
                for (let j = 0; j < 3; j++) {
                    const offset = (j * 80 + time * 30) % updraft.h;
                    const arrowY = updraft.h - offset;
                    if (arrowY < updraft.h && arrowY > 0) {
                        ctx.beginPath();
                        ctx.moveTo(updraft.w / 2 - 20, arrowY + 10);
                        ctx.lineTo(updraft.w / 2, arrowY - 10);
                        ctx.lineTo(updraft.w / 2 + 20, arrowY + 10);
                        ctx.fill();
                    }
                }
                ctx.restore();
            };

            arena.biomeZones.push(updraft);
        }
    }

    update(arena, player, enemies) {
        this.frame++;

        // Particle logic
        for (let i = this.particles.length - 1; i >= 0; i--) {
            let p = this.particles[i];
            p.x += p.speed || 0;
            p.life = (p.life || 100) - 1;
            if (p.x > arena.width + 200 || p.life <= 0) {
                this.particles.splice(i, 1);
            }
        }

        // Spawning
        if (Math.random() < 0.05) {
            const camX = arena.camera ? arena.camera.x : 0;
            const camY = arena.camera ? arena.camera.y : 0;
            const camH = arena.camera ? arena.camera.height : 1000;
            this.particles.push({
                type: 'cloud',
                x: camX - 150,
                y: camY + Math.random() * camH,
                w: 100 + Math.random() * 100,
                h: 40 + Math.random() * 40,
                speed: 1 + Math.random() * 2,
                alpha: 0.1 + Math.random() * 0.3,
                life: 1000
            });
        }

        // Check Updrafts
        if (player && arena.biomeZones) {
            for (const zone of arena.biomeZones) {
                if (zone.type === 'UPDRAFT') {
                    if (player.x > zone.x && player.x < zone.x + zone.w &&
                        player.y > zone.y && player.y < zone.y + zone.h) {

                        // Effect: Speed + Flow
                        player.speedMultiplier = Math.max(player.speedMultiplier, 1.5); // Boost
                        if (player.type === 'air' && player.flow < player.maxFlow) {
                            player.flow += 0.5;
                        }
                    }
                }
            }
        }
    }

    draw(ctx, arena) {
        // Gradient Sky Background is handled by Arena.draw via getHeroTheme('air')
        // However, Arena only supports solid color BG. 
        // We want a gradient. But draw() here is called AFTER entities (Foreground).

        // If we want a background gradient, we must hack `arena.draw` or accept a solid color.
        // Or, we render "Clouds" here as foreground elements (Mist/Fog).

        // BACKGROUND FIX:
        // We removed the full-screen fillRect here so we don't hide the game.
        // The background color is now #87CEEB (Sky Blue) from getHeroTheme.

        // Particles (Mist/Clouds in foreground)
        for (const p of this.particles) {
            if (p.type === 'cloud') {
                ctx.fillStyle = '#ffffff';
                ctx.globalAlpha = p.alpha;
                this.drawCloud(ctx, p.x, p.y, p.w, p.h);
                ctx.globalAlpha = 1;
            }
        }
    }

    drawCloud(ctx, x, y, w, h) {
        ctx.beginPath();
        ctx.arc(x, y, h / 2, Math.PI * 0.5, Math.PI * 1.5);
        ctx.arc(x + w / 3, y - h / 2, h / 1.5, Math.PI * 1, Math.PI * 1.85);
        ctx.arc(x + w - h / 2, y, h / 2, Math.PI * 1.5, Math.PI * 0.5);
        ctx.closePath();
        ctx.fill();
    }
}

// Instantiate and Register
window.WindBiome = new WindBiome();
if (window.BIOMES) {
    window.BIOMES['SKY_PALACE'] = WindBiome;
}


