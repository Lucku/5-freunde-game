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

    static drawBackground(ctx, arena) {
        const cam = arena.camera;

        ctx.save();

        // 1. Stone brick floor tiling
        const bW = 110, bH = 72;
        const rowStart = Math.floor(cam.y / bH) - 1;
        const rowEnd   = Math.ceil((cam.y + cam.height) / bH) + 1;
        for (let row = rowStart; row <= rowEnd; row++) {
            const off = (row & 1) * (bW / 2);
            const colStart = Math.floor((cam.x - off) / bW) - 1;
            const colEnd   = Math.ceil((cam.x + cam.width - off) / bW) + 1;
            for (let col = colStart; col <= colEnd; col++) {
                const bx = col * bW + off;
                const by = row * bH;
                const v = Math.abs((Math.sin(col * 127.3 + row * 311.7) * 43758.5) % 1) * 0.07;
                // Mortar gap
                ctx.fillStyle = "rgba(14, 10, 6, 0.22)";
                ctx.fillRect(bx, by, bW, bH);
                // Brick face
                ctx.fillStyle = `rgba(65, 48, 30, ${0.1 + v})`;
                ctx.fillRect(bx + 2, by + 2, bW - 4, bH - 4);
            }
        }

        // 2. Floor cracks and embedded rocks
        const cellSize = 400;
        const sx = Math.floor(cam.x / cellSize) * cellSize;
        const sy = Math.floor(cam.y / cellSize) * cellSize;
        const ex = sx + cam.width + cellSize;
        const ey = sy + cam.height + cellSize;

        for (let x = sx; x <= ex; x += cellSize) {
            for (let y = sy; y <= ey; y += cellSize) {
                const hash = Math.sin(x * 12.9898 + y * 78.233) * 43758.5453;
                const val = hash - Math.floor(hash);

                if (val > 0.6) {
                    const crx = x + (val * 1337) % cellSize;
                    const cry = y + (val * 7331) % cellSize;
                    ctx.strokeStyle = "rgba(18, 10, 6, 0.28)";
                    ctx.lineWidth = 3;
                    ctx.lineCap = 'round';
                    ctx.beginPath();
                    ctx.moveTo(crx, cry);
                    ctx.lineTo(crx + 30 * val, cry + 40 * val);
                    ctx.lineTo(crx + 10 * val, cry + 80 * val);
                    ctx.lineTo(crx + 50 * val, cry + 100 * val);
                    ctx.stroke();
                }

                if (val < 0.4) {
                    const rx = x + (val * 9999) % cellSize;
                    const ry = y + (val * 8888) % cellSize;
                    const rSize = 10 + val * 20;
                    ctx.fillStyle = "rgba(0,0,0,0.28)";
                    ctx.beginPath();
                    ctx.arc(rx + 3, ry + 3, rSize, 0, Math.PI * 2);
                    ctx.fill();
                    ctx.fillStyle = "#4e4030";
                    ctx.beginPath();
                    ctx.arc(rx, ry, rSize, 0, Math.PI * 2);
                    ctx.fill();
                    ctx.fillStyle = "rgba(255,255,255,0.04)";
                    ctx.beginPath();
                    ctx.arc(rx - rSize * 0.3, ry - rSize * 0.3, rSize * 0.4, 0, Math.PI * 2);
                    ctx.fill();
                }
            }
        }

        // 3. Vertical iron cage bars
        const barSpacing = 210;
        const barW = 14;
        const barX0 = Math.floor(cam.x / barSpacing) * barSpacing;
        for (let bx = barX0; bx <= cam.x + cam.width + barSpacing; bx += barSpacing) {
            // Drop shadow
            ctx.fillStyle = "rgba(0,0,0,0.38)";
            ctx.fillRect(bx - barW / 2 + 4, cam.y, barW + 2, cam.height);
            // Bar with gradient sheen
            const g = ctx.createLinearGradient(bx - barW / 2, 0, bx + barW / 2, 0);
            g.addColorStop(0,    "rgba(16, 12, 8, 0.62)");
            g.addColorStop(0.25, "rgba(50, 40, 26, 0.58)");
            g.addColorStop(0.65, "rgba(36, 28, 18, 0.58)");
            g.addColorStop(1,    "rgba(16, 12, 8, 0.62)");
            ctx.fillStyle = g;
            ctx.fillRect(bx - barW / 2, cam.y, barW, cam.height);
            // Edge highlight
            ctx.fillStyle = "rgba(95, 72, 44, 0.18)";
            ctx.fillRect(bx - barW / 2 + 2, cam.y, 2, cam.height);
        }

        // 4. Horizontal cage crossbars
        const hBarSpacing = 290;
        const hBarH = 10;
        const hBarY0 = Math.floor(cam.y / hBarSpacing) * hBarSpacing;
        for (let by = hBarY0; by <= cam.y + cam.height + hBarSpacing; by += hBarSpacing) {
            ctx.fillStyle = "rgba(0,0,0,0.32)";
            ctx.fillRect(cam.x, by + 4, cam.width, hBarH);
            const g = ctx.createLinearGradient(0, by - hBarH / 2, 0, by + hBarH / 2);
            g.addColorStop(0,   "rgba(16, 12, 8, 0.58)");
            g.addColorStop(0.5, "rgba(48, 36, 22, 0.52)");
            g.addColorStop(1,   "rgba(16, 12, 8, 0.58)");
            ctx.fillStyle = g;
            ctx.fillRect(cam.x, by - hBarH / 2, cam.width, hBarH);
        }

        // 5. Iron rivets at bar intersections
        for (let bx = barX0; bx <= cam.x + cam.width + barSpacing; bx += barSpacing) {
            for (let by = hBarY0; by <= cam.y + cam.height + hBarSpacing; by += hBarSpacing) {
                ctx.fillStyle = "rgba(0,0,0,0.5)";
                ctx.beginPath(); ctx.arc(bx + 1, by + 2, 9, 0, Math.PI * 2); ctx.fill();
                ctx.fillStyle = "rgba(58, 44, 28, 0.8)";
                ctx.beginPath(); ctx.arc(bx, by, 8, 0, Math.PI * 2); ctx.fill();
                ctx.fillStyle = "rgba(95, 75, 48, 0.45)";
                ctx.beginPath(); ctx.arc(bx - 2, by - 2, 3, 0, Math.PI * 2); ctx.fill();
            }
        }

        ctx.restore();
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
