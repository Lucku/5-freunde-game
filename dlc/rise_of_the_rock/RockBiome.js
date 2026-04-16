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

        // 1. Stone brick floor tiling with more color variation
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
                const v = Math.abs((Math.sin(col * 127.3 + row * 311.7) * 43758.5) % 1) * 0.13;
                const r = (52 + v * 60) | 0, g2 = (38 + v * 44) | 0, b2 = (22 + v * 26) | 0;
                // Mortar gap
                ctx.fillStyle = "rgba(12, 8, 4, 0.28)";
                ctx.fillRect(bx, by, bW, bH);
                // Brick face
                ctx.fillStyle = `rgba(${r}, ${g2}, ${b2}, ${0.12 + v})`;
                ctx.fillRect(bx + 2, by + 2, bW - 4, bH - 4);
            }
        }

        // 2. Floor cracks (denser, with branches) and embedded jagged rocks
        const cellSize = 280;
        const sx = Math.floor(cam.x / cellSize) * cellSize;
        const sy = Math.floor(cam.y / cellSize) * cellSize;
        const ex = sx + cam.width + cellSize;
        const ey = sy + cam.height + cellSize;

        for (let x = sx; x <= ex; x += cellSize) {
            for (let y = sy; y <= ey; y += cellSize) {
                const hash = Math.sin(x * 12.9898 + y * 78.233) * 43758.5453;
                const val = hash - Math.floor(hash);

                if (val > 0.42) {
                    const crx = x + (val * 1337) % cellSize;
                    const cry = y + (val * 7331) % cellSize;
                    ctx.strokeStyle = "rgba(14, 8, 4, 0.35)";
                    ctx.lineWidth = 2 + val * 2;
                    ctx.lineCap = 'round';
                    ctx.beginPath();
                    ctx.moveTo(crx, cry);
                    ctx.lineTo(crx + 28 * val, cry + 38 * val);
                    ctx.lineTo(crx + 8 * val, cry + 74 * val);
                    ctx.lineTo(crx + 48 * val, cry + 102 * val);
                    ctx.stroke();
                    if (val > 0.62) {
                        // Branch crack
                        ctx.lineWidth = 1;
                        ctx.beginPath();
                        ctx.moveTo(crx + 8 * val, cry + 38 * val);
                        ctx.lineTo(crx - 22 * val, cry + 58 * val);
                        ctx.stroke();
                    }
                }

                if (val < 0.52) {
                    const rx = x + (val * 9999) % cellSize;
                    const ry = y + (val * 8888) % cellSize;
                    const rSize = 7 + val * 22;
                    // Jagged rock polygon instead of circle
                    const verts = 5 + ((val * 100 | 0) % 4);
                    ctx.fillStyle = "rgba(0,0,0,0.30)";
                    ctx.beginPath();
                    for (let vi = 0; vi < verts; vi++) {
                        const a = (vi / verts) * Math.PI * 2;
                        const rn = rSize * (0.65 + Math.abs(Math.sin(a * 2.3 + val * 5)) * 0.35);
                        const px = rx + 3 + Math.cos(a) * rn, py = ry + 3 + Math.sin(a) * rn;
                        vi === 0 ? ctx.moveTo(px, py) : ctx.lineTo(px, py);
                    }
                    ctx.closePath(); ctx.fill();
                    const rv = (62 + val * 22) | 0;
                    ctx.fillStyle = `rgba(${rv}, ${(rv * 0.72) | 0}, ${(rv * 0.45) | 0}, 0.80)`;
                    ctx.beginPath();
                    for (let vi = 0; vi < verts; vi++) {
                        const a = (vi / verts) * Math.PI * 2;
                        const rn = rSize * (0.65 + Math.abs(Math.sin(a * 2.3 + val * 5)) * 0.35);
                        const px = rx + Math.cos(a) * rn, py = ry + Math.sin(a) * rn;
                        vi === 0 ? ctx.moveTo(px, py) : ctx.lineTo(px, py);
                    }
                    ctx.closePath(); ctx.fill();
                }
            }
        }

        // 3. Vertical stone columns — position-jittered, varied width, rough surface
        const barSpacing = 210;
        const barX0 = Math.floor(cam.x / barSpacing) * barSpacing;
        for (let bxBase = barX0; bxBase <= cam.x + cam.width + barSpacing; bxBase += barSpacing) {
            const h1 = Math.abs(Math.sin(bxBase * 0.0073 + 17.3) * 43758.5) % 1;
            const bx = bxBase + (h1 - 0.5) * 52;   // ±26px position jitter
            const barW = 11 + h1 * 8;               // 11–19px width variation

            // Drop shadow
            ctx.fillStyle = "rgba(0,0,0,0.36)";
            ctx.fillRect(bx - barW / 2 + 4, cam.y, barW + 2, cam.height);

            // Main stone column with natural color variation
            const sr = (26 + h1 * 18) | 0, sg = (18 + h1 * 13) | 0, sb = (11 + h1 * 8) | 0;
            const g = ctx.createLinearGradient(bx - barW / 2, 0, bx + barW / 2, 0);
            g.addColorStop(0,    `rgba(${sr - 8}, ${sg - 5}, ${sb - 3}, 0.62)`);
            g.addColorStop(0.3,  `rgba(${sr + 10}, ${sg + 7}, ${sb + 4}, 0.58)`);
            g.addColorStop(0.7,  `rgba(${sr + 5},  ${sg + 3}, ${sb + 2}, 0.58)`);
            g.addColorStop(1,    `rgba(${sr - 8}, ${sg - 5}, ${sb - 3}, 0.62)`);
            ctx.fillStyle = g;
            ctx.fillRect(bx - barW / 2, cam.y, barW, cam.height);

            // Rough surface patches (simulate stone texture / fracture lines)
            const patchStep = 90;
            const patchY0 = Math.floor(cam.y / patchStep) * patchStep;
            for (let py = patchY0; py <= cam.y + cam.height; py += patchStep) {
                const ph = Math.abs(Math.sin(bx * 0.053 + py * 0.037) * 43758.5) % 1;
                if (ph > 0.50) {
                    const pw = 2 + ph * 5, phH = 12 + ph * 38;
                    const patchX = bx - barW / 2 + ph * (barW - pw);
                    ctx.fillStyle = `rgba(0,0,0,${0.12 + ph * 0.14})`;
                    ctx.fillRect(patchX, py + ph * patchStep * 0.4, pw, phH);
                }
            }

            // Edge highlight
            ctx.fillStyle = "rgba(75, 55, 34, 0.16)";
            ctx.fillRect(bx - barW / 2 + 2, cam.y, 2, cam.height);
        }

        // 4. Horizontal ledges — y-jittered, varied height, jagged edges
        const hBarSpacing = 290;
        const hBarY0 = Math.floor(cam.y / hBarSpacing) * hBarSpacing;
        for (let byBase = hBarY0; byBase <= cam.y + cam.height + hBarSpacing; byBase += hBarSpacing) {
            const hh = Math.abs(Math.sin(byBase * 0.0091 + 3.7) * 43758.5) % 1;
            const by = byBase + (hh - 0.5) * 64;   // ±32px y-jitter
            const hBarH = 8 + hh * 8;               // 8–16px height variation

            ctx.fillStyle = "rgba(0,0,0,0.28)";
            ctx.fillRect(cam.x, by + 4, cam.width, hBarH);
            const hg = ctx.createLinearGradient(0, by, 0, by + hBarH);
            hg.addColorStop(0,   "rgba(20, 14, 8, 0.55)");
            hg.addColorStop(0.5, "rgba(50, 36, 22, 0.48)");
            hg.addColorStop(1,   "rgba(20, 14, 8, 0.55)");
            ctx.fillStyle = hg;
            ctx.fillRect(cam.x, by, cam.width, hBarH);

            // Jagged top/bottom edge — small stone chips
            const chipStep = 32;
            const chipX0 = Math.floor(cam.x / chipStep) * chipStep;
            for (let cx2 = chipX0; cx2 <= cam.x + cam.width; cx2 += chipStep) {
                const ch = Math.abs(Math.sin(cx2 * 0.0313 + byBase * 0.0091) * 43758.5) % 1;
                if (ch > 0.38) {
                    const chipH = ch * 5;
                    ctx.fillStyle = "rgba(0,0,0,0.22)";
                    ctx.fillRect(cx2, by - chipH, chipStep * ch * 0.75, chipH);
                    ctx.fillRect(cx2, by + hBarH, chipStep * ch * 0.55, chipH * 0.6);
                }
            }
        }

        // 5. Rough stone knobs at column/ledge intersections (irregular rivets)
        for (let bxBase = barX0; bxBase <= cam.x + cam.width + barSpacing; bxBase += barSpacing) {
            const h1 = Math.abs(Math.sin(bxBase * 0.0073 + 17.3) * 43758.5) % 1;
            const bx = bxBase + (h1 - 0.5) * 52;
            for (let byBase = hBarY0; byBase <= cam.y + cam.height + hBarSpacing; byBase += hBarSpacing) {
                const hh = Math.abs(Math.sin(byBase * 0.0091 + 3.7) * 43758.5) % 1;
                const by = byBase + (hh - 0.5) * 64;
                const kh = Math.abs(Math.sin(bxBase * 0.0137 + byBase * 0.0091) * 43758.5) % 1;
                const kSize = 4 + kh * 7;                // 4–11px, irregular
                const kr = (44 + kh * 22) | 0;
                ctx.fillStyle = "rgba(0,0,0,0.45)";
                ctx.beginPath(); ctx.arc(bx + 1, by + 2, kSize, 0, Math.PI * 2); ctx.fill();
                ctx.fillStyle = `rgba(${kr}, ${(kr * 0.72) | 0}, ${(kr * 0.46) | 0}, 0.78)`;
                ctx.beginPath(); ctx.arc(bx, by, kSize, 0, Math.PI * 2); ctx.fill();
                ctx.fillStyle = "rgba(85, 65, 38, 0.30)";
                ctx.beginPath(); ctx.arc(bx - kSize * 0.3, by - kSize * 0.3, kSize * 0.35, 0, Math.PI * 2); ctx.fill();
            }
        }

        // 6. Stalactites — world-space, tiled rows hanging from ceiling
        const stalRowSpacing = 430;
        const stalRowY0 = Math.floor(cam.y / stalRowSpacing) * stalRowSpacing;
        for (let stRow = stalRowY0; stRow <= cam.y + cam.height + stalRowSpacing; stRow += stalRowSpacing) {
            const stalStep = 78;
            const stalSX = Math.floor(cam.x / stalStep) * stalStep;
            for (let ss = stalSX; ss <= cam.x + cam.width + stalStep; ss += stalStep) {
                const sh = Math.abs(Math.sin(ss * 0.0197 + stRow * 0.0041 + 7.7) * 43758.5) % 1;
                if (sh >= 0.68) continue;
                const stalX = ss + (sh - 0.5) * 28;
                const stalH = 18 + sh * 95;
                const stalW = 6 + sh * 13;
                const stR = (32 + sh * 20) | 0;
                ctx.fillStyle = "rgba(0,0,0,0.28)";
                ctx.beginPath();
                ctx.moveTo(stalX - stalW / 2 + 3, stRow);
                ctx.lineTo(stalX + stalW / 2 + 3, stRow);
                ctx.lineTo(stalX + (sh - 0.5) * 5 + 2, stRow + stalH);
                ctx.closePath(); ctx.fill();
                ctx.fillStyle = `rgba(${stR}, ${(stR * 0.72) | 0}, ${(stR * 0.44) | 0}, 0.88)`;
                ctx.beginPath();
                ctx.moveTo(stalX - stalW / 2, stRow);
                ctx.lineTo(stalX + stalW / 2, stRow);
                ctx.lineTo(stalX + (sh - 0.5) * 5, stRow + stalH);
                ctx.closePath(); ctx.fill();
            }
        }

        // 7. Stalagmites — world-space, tiled rows rising from floor
        const stagRowSpacing = 380;
        const stagRowY0 = Math.floor(cam.y / stagRowSpacing) * stagRowSpacing + stagRowSpacing;
        for (let stRow = stagRowY0; stRow <= cam.y + cam.height + stagRowSpacing; stRow += stagRowSpacing) {
            const stagStep = 92;
            const stagSX = Math.floor(cam.x / stagStep) * stagStep;
            for (let ss = stagSX; ss <= cam.x + cam.width + stagStep; ss += stagStep) {
                const sh = Math.abs(Math.sin(ss * 0.0233 + stRow * 0.0053 + 13.4) * 43758.5) % 1;
                if (sh >= 0.62) continue;
                const stalX = ss + (sh - 0.5) * 34;
                const stalH = 12 + sh * 62;
                const stalW = 7 + sh * 11;
                const stR = (28 + sh * 16) | 0;
                ctx.fillStyle = "rgba(0,0,0,0.24)";
                ctx.beginPath();
                ctx.moveTo(stalX - stalW / 2 + 3, stRow);
                ctx.lineTo(stalX + stalW / 2 + 3, stRow);
                ctx.lineTo(stalX + (sh - 0.5) * 6 + 2, stRow - stalH);
                ctx.closePath(); ctx.fill();
                ctx.fillStyle = `rgba(${stR}, ${(stR * 0.70) | 0}, ${(stR * 0.42) | 0}, 0.82)`;
                ctx.beginPath();
                ctx.moveTo(stalX - stalW / 2, stRow);
                ctx.lineTo(stalX + stalW / 2, stRow);
                ctx.lineTo(stalX + (sh - 0.5) * 6, stRow - stalH);
                ctx.closePath(); ctx.fill();
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

    static drawObstacle(ctx, obs) {
        const { x, y, w, h } = obs;
        const bev = 6;
        const seed = obs.x * 0.0071 + obs.y * 0.0137;
        const r = (i) => { const s = Math.sin(seed + i * 0.391) * 43758.5453; return s - Math.floor(s); };

        // Base: earthy brown-grey gradient
        const grd = ctx.createLinearGradient(x, y, x + w, y + h);
        grd.addColorStop(0,   '#4e3a22');
        grd.addColorStop(0.4, '#3c2c18');
        grd.addColorStop(1,   '#261c0e');
        ctx.fillStyle = grd;
        ctx.fillRect(x, y, w, h);

        ctx.save();
        ctx.beginPath(); ctx.rect(x + 1, y + 1, w - 2, h - 2); ctx.clip();

        // Horizontal strata lines
        const numStrata = 3 + (r(seed + 1) * 4 | 0);
        for (let i = 0; i < numStrata; i++) {
            const s = seed + i * 1.19;
            const sy = y + (0.15 + (i / numStrata) * 0.7 + (r(s) - 0.5) * 0.08) * h;
            const isDark = r(s + 0.1) > 0.5;
            ctx.strokeStyle = isDark ? `rgba(0,0,0,${0.25 + r(s + 0.2) * 0.15})` : `rgba(255,255,255,${0.06 + r(s + 0.3) * 0.06})`;
            ctx.lineWidth = 1 + r(s + 0.4) * 1.5;
            ctx.beginPath();
            ctx.moveTo(x + 2, sy + (r(s + 0.5) - 0.5) * 4);
            ctx.lineTo(x + w - 2, sy + (r(s + 0.6) - 0.5) * 4);
            ctx.stroke();
        }

        // Embedded stone chunks (jagged polygons)
        const numChunks = 2 + (r(seed + 7) * 3 | 0);
        for (let i = 0; i < numChunks; i++) {
            const s = seed + i * 2.07;
            const px = x + (0.1 + r(s) * 0.8) * w;
            const py = y + (0.1 + r(s + 0.1) * 0.8) * h;
            const pr = 6 + r(s + 0.2) * 14;
            ctx.fillStyle = `rgba(${80 + (r(s + 0.3) * 40 | 0)},${60 + (r(s + 0.4) * 30 | 0)},${40 + (r(s + 0.5) * 20 | 0)},0.40)`;
            ctx.beginPath();
            const sides = 5 + (r(s + 0.6) * 3 | 0);
            for (let j = 0; j < sides; j++) {
                const a = (j / sides) * Math.PI * 2;
                const jitter = 0.7 + r(s + j * 0.3) * 0.6;
                const method = j === 0 ? 'moveTo' : 'lineTo';
                ctx[method](px + Math.cos(a) * pr * jitter, py + Math.sin(a) * pr * jitter);
            }
            ctx.closePath(); ctx.fill();
        }

        // Rock chip marks (small dark triangles)
        const numChips = 3 + (r(seed + 13) * 4 | 0);
        for (let i = 0; i < numChips; i++) {
            const s = seed + i * 0.97;
            const cx2 = x + r(s) * w;
            const cy2 = y + r(s + 0.1) * h;
            const cs  = 3 + r(s + 0.2) * 6;
            ctx.fillStyle = `rgba(0,0,0,${0.25 + r(s + 0.3) * 0.2})`;
            ctx.beginPath();
            ctx.moveTo(cx2, cy2);
            ctx.lineTo(cx2 + cs, cy2 + cs * 0.5);
            ctx.lineTo(cx2 + cs * 0.3, cy2 + cs);
            ctx.closePath(); ctx.fill();
        }

        ctx.restore();

        // Bevel: warm stone tint
        ctx.fillStyle = 'rgba(130,90,40,0.28)';
        ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x + w, y); ctx.lineTo(x + w - bev, y + bev); ctx.lineTo(x + bev, y + bev); ctx.closePath(); ctx.fill();
        ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x + bev, y + bev); ctx.lineTo(x + bev, y + h - bev); ctx.lineTo(x, y + h); ctx.closePath(); ctx.fill();
        ctx.fillStyle = 'rgba(0,0,0,0.50)';
        ctx.beginPath(); ctx.moveTo(x, y + h); ctx.lineTo(x + w, y + h); ctx.lineTo(x + w - bev, y + h - bev); ctx.lineTo(x + bev, y + h - bev); ctx.closePath(); ctx.fill();
        ctx.beginPath(); ctx.moveTo(x + w, y); ctx.lineTo(x + w, y + h); ctx.lineTo(x + w - bev, y + h - bev); ctx.lineTo(x + w - bev, y + bev); ctx.closePath(); ctx.fill();

        ctx.strokeStyle = '#1a1008';
        ctx.lineWidth = 2;
        ctx.strokeRect(x, y, w, h);
    }
}

window.RockBiome = RockBiome;
