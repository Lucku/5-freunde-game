class RockBiome {
    static generate(arena) {
        const cx = arena.width / 2;
        const cy = arena.height / 2;

        // Add Rubble Zones (Slows down non-earth heroes)
        arena.biomeZones.push(new BiomeZone(cx - 500, cy - 500, 300, 300, 'RUBBLE'));
        arena.biomeZones.push(new BiomeZone(cx + 200, cy + 200, 300, 300, 'RUBBLE'));

        // Add Quicksand (Pulls towards center of zone)
        arena.biomeZones.push(new BiomeZone(cx - 400, cy + 300, 200, 200, 'QUICKSAND'));

        // Add Rock Pillars (Obstacles)
        if (typeof Obstacle !== 'undefined') {
            // Central Pillar
            arena.obstacles.push(new Obstacle(cx - 100, cy - 100, 200, 200));

            // Scattered Rocks
            arena.obstacles.push(new Obstacle(cx - 600, cy - 600, 100, 100));
            arena.obstacles.push(new Obstacle(cx + 500, cy - 500, 150, 150));
            arena.obstacles.push(new Obstacle(cx - 500, cy + 500, 120, 120));
            arena.obstacles.push(new Obstacle(cx + 600, cy + 600, 100, 100));
        }
    }

    static update(arena, player, enemies) {
        // 1. Handle Zone Effects
        arena.biomeZones.forEach(zone => {
            if (player.x > zone.x && player.x < zone.x + zone.w &&
                player.y > zone.y && player.y < zone.y + zone.h) {

                if (zone.type === 'RUBBLE') {
                    // Earth hero is immune to rubble
                    if (player.type !== 'earth') {
                        player.biomeSpeedMod = 0.6; // Slow down
                    }
                } else if (zone.type === 'QUICKSAND') {
                    const cx = zone.x + zone.w / 2;
                    const cy = zone.y + zone.h / 2;
                    const angle = Math.atan2(cy - player.y, cx - player.x);
                    player.x += Math.cos(angle) * 1.5; // Pull
                    player.y += Math.sin(angle) * 1.5;
                    if (player.type !== 'earth') player.biomeSpeedMod = 0.4;
                }
            }
        });

        // 2. Global Hazard: Falling Rocks
        // Randomly spawn falling rock indicators
        if (Math.random() < 0.005) { // 0.5% chance per frame (~once every 3-4 seconds)
            if (!arena.hazards) arena.hazards = [];
            arena.hazards.push({
                x: player.x + (Math.random() - 0.5) * 600,
                y: player.y + (Math.random() - 0.5) * 600,
                timer: 120, // 2 seconds warning
                radius: 60
            });
        }

        // Update Hazards
        if (arena.hazards) {
            for (let i = arena.hazards.length - 1; i >= 0; i--) {
                const h = arena.hazards[i];
                h.timer--;

                if (h.timer <= 0) {
                    // Impact!
                    createExplosion(h.x, h.y, '#795548'); // Brown explosion

                    // Damage Player
                    const dist = Math.hypot(player.x - h.x, player.y - h.y);
                    if (dist < h.radius) {
                        if (!player.isInvincible) {
                            const dmg = 30 * (1 - player.damageReduction);
                            player.hp -= dmg;
                            floatingTexts.push(new FloatingText(player.x, player.y - 20, Math.floor(dmg), "#795548", 20));
                        }
                    }

                    // Damage Enemies (Friendly Fire)
                    enemies.forEach(e => {
                        if (Math.hypot(e.x - h.x, e.y - h.y) < h.radius) {
                            e.hp -= 100;
                            floatingTexts.push(new FloatingText(e.x, e.y - 20, "100", "#795548", 20));
                        }
                    });

                    arena.hazards.splice(i, 1);
                }
            }
        }
    }

    static draw(ctx, arena) {
        if (arena.hazards) {
            arena.hazards.forEach(h => {
                // Draw Shadow/Indicator
                ctx.save();
                ctx.translate(h.x, h.y);

                // Pulsing Warning
                const alpha = 0.2 + (Math.sin(Date.now() * 0.01) + 1) * 0.1;
                ctx.fillStyle = `rgba(0, 0, 0, ${alpha})`;
                ctx.beginPath();
                ctx.arc(0, 0, h.radius, 0, Math.PI * 2);
                ctx.fill();

                // Growing Circle (Timer)
                const progress = 1 - (h.timer / 120);
                ctx.strokeStyle = '#e74c3c';
                ctx.lineWidth = 2;
                ctx.beginPath();
                ctx.arc(0, 0, h.radius * progress, 0, Math.PI * 2);
                ctx.stroke();

                ctx.restore();
            });
        }
    }
}

window.RockBiome = RockBiome;
