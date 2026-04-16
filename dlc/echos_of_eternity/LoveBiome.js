// Echos of Eternity — Love Biome: The Heart Nexus
// Completely over-the-top pink fairytale love fantasy.
// Giant translucent hearts float overhead. Rose petals cascade endlessly.
// Rainbow ribbons spiral from the ground. Candy-coloured sparkles burst
// everywhere. The floor glows with heart-shaped blooms and love energy.
// Cupid arrow trails streak across the sky. Reality itself blushes.

class LoveBiome {
    static generate(arena) {
        const cx = arena.width  / 2;
        const cy = arena.height / 2;

        // Emotional resonance zones — charmed enemies take more damage
        if (typeof BiomeZone !== 'undefined') {
            arena.biomeZones.push(new BiomeZone(cx - 400, cy - 250, 220, 220, 'HEART_NEXUS'));
            arena.biomeZones.push(new BiomeZone(cx + 180, cy + 100, 200, 200, 'HEART_NEXUS'));
            arena.biomeZones.push(new BiomeZone(cx - 100, cy + 280, 180, 180, 'HEART_NEXUS'));
        }

        // ── Giant background hearts (slow-drifting, massive) ─────────────────
        arena._loveGiantHearts = [];
        for (let i = 0; i < 12; i++) {
            arena._loveGiantHearts.push({
                x:        Math.random() * arena.width,
                y:        Math.random() * arena.height,
                size:     80 + Math.random() * 180,
                alpha:    0.03 + Math.random() * 0.05,
                hue:      300 + Math.random() * 60,   // magenta → rose
                vx:       (Math.random() - 0.5) * 0.15,
                vy:       -(0.05 + Math.random() * 0.1),
                rot:      Math.random() * Math.PI * 2,
                rotSpeed: (Math.random() - 0.5) * 0.003,
                pulse:    Math.random() * Math.PI * 2,
            });
        }

        // ── Rose petal particles ──────────────────────────────────────────────
        arena._loveParticles = [];
        for (let i = 0; i < 100; i++) {
            arena._loveParticles.push(LoveBiome._makePetal(arena));
        }

        // ── Rainbow ribbon spirals (rising from ground) ───────────────────────
        arena._loveRibbons = [];
        for (let i = 0; i < 16; i++) {
            arena._loveRibbons.push({
                x:       Math.random() * arena.width,
                y:       Math.random() * arena.height,
                angle:   Math.random() * Math.PI * 2,
                length:  60 + Math.random() * 100,
                hue:     Math.random() * 360,
                alpha:   0.12 + Math.random() * 0.18,
                speed:   0.018 + Math.random() * 0.025,
                phase:   Math.random() * Math.PI * 2,
                drift:   (Math.random() - 0.5) * 0.3,
            });
        }

        // ── Heart-shaped ground blooms (static floor decor) ──────────────────
        arena._loveFloorHearts = [];
        for (let i = 0; i < 30; i++) {
            arena._loveFloorHearts.push({
                x:     Math.random() * arena.width,
                y:     Math.random() * arena.height,
                size:  12 + Math.random() * 30,
                alpha: 0.05 + Math.random() * 0.09,
                hue:   300 + Math.random() * 60,
                phase: Math.random() * Math.PI * 2,
            });
        }

        // ── Candy sparkles (tiny twinkling stars) ────────────────────────────
        arena._loveSparkles = [];
        for (let i = 0; i < 60; i++) {
            arena._loveSparkles.push(LoveBiome._makeSparkle(arena));
        }

        // ── Cupid arrow streaks ───────────────────────────────────────────────
        arena._loveCupidArrows = [];
        for (let i = 0; i < 5; i++) {
            arena._loveCupidArrows.push(LoveBiome._makeCupidArrow(arena));
        }

        // ── Light shafts ──────────────────────────────────────────────────────
        arena._loveShafts = [];
        for (let i = 0; i < 12; i++) {
            arena._loveShafts.push({
                x:     Math.random() * arena.width,
                width: 20 + Math.random() * 60,
                alpha: 0.025 + Math.random() * 0.035,
                hue:   300 + Math.random() * 60,
                phase: Math.random() * Math.PI * 2,
            });
        }

        // ── Heart pulse nodes (glowing floor wells) ───────────────────────────
        arena._heartNodes = [];
        for (let i = 0; i < 18; i++) {
            arena._heartNodes.push({
                x:      Math.random() * arena.width,
                y:      Math.random() * arena.height,
                radius: 30 + Math.random() * 55,
                phase:  Math.random() * Math.PI * 2,
                speed:  0.02 + Math.random() * 0.02,
                hue:    300 + Math.random() * 60,
                alpha:  0.06 + Math.random() * 0.08,
            });
        }

        arena._loveTick = 0;
    }

    // ── Factories ──────────────────────────────────────────────────────────────

    static _makePetal(arena) {
        const hue = 300 + Math.random() * 60;
        return {
            x:        Math.random() * arena.width,
            y:        Math.random() * arena.height,
            vx:       (Math.random() - 0.5) * 0.8,
            vy:       -(0.3 + Math.random() * 0.9),
            size:     3 + Math.random() * 7,
            alpha:    0.25 + Math.random() * 0.5,
            rot:      Math.random() * Math.PI * 2,
            rotSpeed: (Math.random() - 0.5) * 0.07,
            life:     180 + Math.floor(Math.random() * 300),
            maxLife:  480,
            hue,
            isHeart:  Math.random() < 0.30,  // 30% tiny heart, rest petal ellipse
        };
    }

    static _makeSparkle(arena) {
        return {
            x:      Math.random() * arena.width,
            y:      Math.random() * arena.height,
            phase:  Math.random() * Math.PI * 2,
            speed:  0.04 + Math.random() * 0.08,
            size:   1.5 + Math.random() * 3,
            hue:    Math.random() * 360,
            alpha:  0.4 + Math.random() * 0.6,
            life:   60 + Math.floor(Math.random() * 120),
        };
    }

    static _makeCupidArrow(arena) {
        const a = Math.random() * Math.PI * 2;
        const spd = 1.2 + Math.random() * 2;
        return {
            x:     Math.random() * arena.width,
            y:     Math.random() * arena.height,
            vx:    Math.cos(a) * spd,
            vy:    Math.sin(a) * spd,
            angle: a,
            length: 40 + Math.random() * 50,
            alpha: 0.2 + Math.random() * 0.35,
            life:  200 + Math.floor(Math.random() * 300),
            hue:   300 + Math.random() * 60,
        };
    }

    // ── Heart path helper ─────────────────────────────────────────────────────

    static _heartPath(ctx, cx, cy, size) {
        const s = size;
        ctx.beginPath();
        ctx.moveTo(cx, cy + s * 0.35);
        ctx.bezierCurveTo(cx,          cy,          cx - s * 0.5, cy,          cx - s * 0.5, cy + s * 0.35);
        ctx.bezierCurveTo(cx - s * 0.5, cy + s * 0.65, cx,         cy + s * 0.95, cx,          cy + s);
        ctx.bezierCurveTo(cx,           cy + s * 0.95, cx + s * 0.5, cy + s * 0.65, cx + s * 0.5, cy + s * 0.35);
        ctx.bezierCurveTo(cx + s * 0.5, cy,          cx,           cy,          cx,          cy + s * 0.35);
        ctx.closePath();
    }

    // ── Background ────────────────────────────────────────────────────────────

    static drawBackground(ctx, arena) {
        const cam  = arena.camera;
        const t    = Date.now();
        const tick = arena._loveTick || 0;

        ctx.save();

        // 0. Solid pink base tint so the background reads as pink
        ctx.fillStyle = 'rgba(255,130,185,0.18)';
        ctx.fillRect(cam.x, cam.y, cam.width, cam.height);

        // 1. Warm pink gradient vignette over the entire viewport
        {
            const grd = ctx.createRadialGradient(
                cam.x + cam.width * 0.5, cam.y + cam.height * 0.5, 0,
                cam.x + cam.width * 0.5, cam.y + cam.height * 0.5,
                Math.max(cam.width, cam.height) * 0.8
            );
            grd.addColorStop(0,   'rgba(255,180,210,0.18)');
            grd.addColorStop(0.5, 'rgba(255,100,160,0.22)');
            grd.addColorStop(1,   'rgba(200,0,100,0.30)');
            ctx.fillStyle = grd;
            ctx.fillRect(cam.x, cam.y, cam.width, cam.height);
        }

        // 2. Pink light shafts raining down
        if (arena._loveShafts) {
            for (const shaft of arena._loveShafts) {
                if (shaft.x < cam.x - 80 || shaft.x > cam.x + cam.width + 80) continue;
                const pulse = 0.5 + 0.5 * Math.sin(shaft.phase + t * 0.0009);
                const sg = ctx.createLinearGradient(shaft.x, cam.y, shaft.x, cam.y + cam.height * 0.8);
                sg.addColorStop(0,   `hsla(${shaft.hue},100%,75%,${shaft.alpha * pulse * 2})`);
                sg.addColorStop(0.4, `hsla(${shaft.hue},100%,70%,${shaft.alpha * pulse})`);
                sg.addColorStop(1,   `hsla(${shaft.hue},100%,65%,0)`);
                ctx.fillStyle = sg;
                ctx.fillRect(shaft.x - shaft.width / 2, cam.y, shaft.width, cam.height * 0.8);
            }
        }

        // 3. Heart pulse nodes (glowing floor wells)
        if (arena._heartNodes) {
            for (const node of arena._heartNodes) {
                if (node.x < cam.x - 100 || node.x > cam.x + cam.width  + 100) continue;
                if (node.y < cam.y - 100 || node.y > cam.y + cam.height + 100) continue;
                const pulse = 0.5 + 0.5 * Math.sin(node.phase);
                ctx.globalAlpha = node.alpha * (0.6 + pulse * 0.4);
                const ng = ctx.createRadialGradient(node.x, node.y, 2, node.x, node.y, node.radius * (1 + pulse * 0.3));
                ng.addColorStop(0, `hsla(${node.hue},100%,70%,0.7)`);
                ng.addColorStop(1, `hsla(${node.hue},100%,60%,0)`);
                ctx.fillStyle = ng;
                ctx.beginPath();
                ctx.arc(node.x, node.y, node.radius * (1 + pulse * 0.3), 0, Math.PI * 2);
                ctx.fill();
            }
            ctx.globalAlpha = 1;
        }

        // 4. Floor heart blooms
        if (arena._loveFloorHearts) {
            for (const fh of arena._loveFloorHearts) {
                if (fh.x < cam.x - 80 || fh.x > cam.x + cam.width  + 80) continue;
                if (fh.y < cam.y - 80 || fh.y > cam.y + cam.height + 80) continue;
                const pulse = 0.7 + 0.3 * Math.sin(fh.phase + t * 0.002);
                ctx.save();
                ctx.globalAlpha = fh.alpha * pulse;
                ctx.fillStyle   = `hsla(${fh.hue},100%,70%,1)`;
                ctx.shadowColor = `hsla(${fh.hue},100%,75%,1)`;
                ctx.shadowBlur  = 8;
                // Draw heart centered at fh.x, fh.y - size/2
                LoveBiome._heartPath(ctx, fh.x - fh.size * 0.5, fh.y - fh.size * 0.5, fh.size);
                ctx.fill();
                ctx.restore();
            }
        }

        // 5. Giant background hearts (massive, translucent)
        if (arena._loveGiantHearts) {
            for (const gh of arena._loveGiantHearts) {
                if (gh.x < cam.x - gh.size * 2 || gh.x > cam.x + cam.width  + gh.size * 2) continue;
                if (gh.y < cam.y - gh.size * 2 || gh.y > cam.y + cam.height + gh.size * 2) continue;
                const pulse = 0.85 + 0.15 * Math.sin(gh.pulse + t * 0.0015);
                ctx.save();
                ctx.globalAlpha = gh.alpha * pulse;
                ctx.translate(gh.x, gh.y);
                ctx.rotate(gh.rot);
                const sz = gh.size * pulse;
                ctx.fillStyle   = `hsla(${gh.hue},100%,70%,1)`;
                ctx.shadowColor = `hsla(${gh.hue},100%,80%,1)`;
                ctx.shadowBlur  = 20;
                LoveBiome._heartPath(ctx, -sz * 0.5, -sz * 0.5, sz);
                ctx.fill();
                ctx.restore();
            }
        }

        // 6. Rainbow ribbon spirals
        if (arena._loveRibbons) {
            for (const rib of arena._loveRibbons) {
                if (rib.x < cam.x - 150 || rib.x > cam.x + cam.width  + 150) continue;
                if (rib.y < cam.y - 150 || rib.y > cam.y + cam.height + 150) continue;
                ctx.save();
                ctx.globalAlpha = rib.alpha * (0.7 + 0.3 * Math.sin(rib.phase + t * 0.002));
                ctx.strokeStyle = `hsl(${(rib.hue + t * 0.05) % 360},100%,70%)`;
                ctx.lineWidth   = 3;
                ctx.lineCap     = 'round';
                ctx.shadowColor = `hsl(${(rib.hue + t * 0.05) % 360},100%,75%)`;
                ctx.shadowBlur  = 8;
                ctx.beginPath();
                for (let s = 0; s <= 1; s += 0.05) {
                    const wave  = Math.sin(rib.phase + s * Math.PI * 3 + t * 0.003) * 20;
                    const px    = rib.x + Math.cos(rib.angle) * s * rib.length + wave * Math.cos(rib.angle + Math.PI / 2);
                    const py    = rib.y + Math.sin(rib.angle) * s * rib.length + wave * Math.sin(rib.angle + Math.PI / 2);
                    s === 0 ? ctx.moveTo(px, py) : ctx.lineTo(px, py);
                }
                ctx.stroke();
                ctx.restore();
            }
        }

        // 7. Tiled floor — mini heart + sparkle pattern
        {
            const cellSize = 280;
            const sx = Math.floor(cam.x / cellSize) * cellSize;
            const sy = Math.floor(cam.y / cellSize) * cellSize;
            const ex = sx + cam.width  + cellSize;
            const ey = sy + cam.height + cellSize;
            for (let x = sx; x <= ex; x += cellSize) {
                for (let y = sy; y <= ey; y += cellSize) {
                    const h = Math.sin(x * 4.7312 + y * 9.1823) * 43758.5453;
                    const v = h - Math.floor(h);
                    if (v > 0.55) {
                        const fx   = x + (v * 4231) % cellSize;
                        const fy   = y + (v * 7753) % cellSize;
                        const sz   = 6 + v * 12;
                        const hue2 = 300 + v * 60;
                        ctx.globalAlpha = 0.06 + v * 0.05;
                        ctx.fillStyle   = `hsl(${hue2},100%,72%)`;
                        LoveBiome._heartPath(ctx, fx - sz * 0.5, fy - sz * 0.5, sz);
                        ctx.fill();
                    }
                }
            }
            ctx.globalAlpha = 1;
        }

        // 8. Cupid arrow streaks
        if (arena._loveCupidArrows) {
            for (const arr of arena._loveCupidArrows) {
                if (arr.x < cam.x - 80 || arr.x > cam.x + cam.width  + 80) continue;
                if (arr.y < cam.y - 80 || arr.y > cam.y + cam.height + 80) continue;
                ctx.save();
                ctx.globalAlpha = arr.alpha;
                ctx.translate(arr.x, arr.y);
                ctx.rotate(arr.angle);
                ctx.strokeStyle = `hsl(${arr.hue},100%,70%)`;
                ctx.lineWidth   = 2;
                ctx.shadowColor = `hsl(${arr.hue},100%,80%)`;
                ctx.shadowBlur  = 8;
                // Shaft
                ctx.beginPath();
                ctx.moveTo(-arr.length / 2, 0);
                ctx.lineTo( arr.length / 2, 0);
                ctx.stroke();
                // Arrowhead
                ctx.beginPath();
                ctx.moveTo(arr.length / 2,       0);
                ctx.lineTo(arr.length / 2 - 10,  -6);
                ctx.lineTo(arr.length / 2 - 10,   6);
                ctx.closePath();
                ctx.fillStyle = `hsl(${arr.hue},100%,70%)`;
                ctx.fill();
                // Tail fletching
                ctx.beginPath();
                ctx.moveTo(-arr.length / 2,       0);
                ctx.lineTo(-arr.length / 2 + 12, -7);
                ctx.moveTo(-arr.length / 2,       0);
                ctx.lineTo(-arr.length / 2 + 12,  7);
                ctx.stroke();
                // Tiny heart at tip
                ctx.globalAlpha = arr.alpha * 0.9;
                ctx.fillStyle   = '#ff9dbf';
                ctx.shadowBlur  = 4;
                LoveBiome._heartPath(ctx, arr.length / 2 + 4, -5, 10);
                ctx.fill();
                ctx.restore();
            }
        }

        ctx.restore();
    }

    // ── Update ─────────────────────────────────────────────────────────────────

    static update(arena, pl, enemies) {
        arena._loveTick = (arena._loveTick || 0) + 1;

        // Heart pulse nodes
        if (arena._heartNodes) {
            for (const node of arena._heartNodes) node.phase += node.speed;
        }

        // Light shafts
        if (arena._loveShafts) {
            for (const shaft of arena._loveShafts) shaft.phase += 0.007;
        }

        // Giant hearts drift and pulse
        if (arena._loveGiantHearts) {
            for (const gh of arena._loveGiantHearts) {
                gh.x     += gh.vx;
                gh.y     += gh.vy;
                gh.rot   += gh.rotSpeed;
                gh.pulse += 0.018;
                if (gh.y < -gh.size * 2) gh.y = arena.height + gh.size;
                if (gh.x < -gh.size * 2) gh.x = arena.width  + gh.size;
                if (gh.x > arena.width  + gh.size * 2) gh.x = -gh.size;
            }
        }

        // Floor heart blooms pulse
        if (arena._loveFloorHearts) {
            for (const fh of arena._loveFloorHearts) fh.phase += 0.025;
        }

        // Ribbons drift
        if (arena._loveRibbons) {
            for (const rib of arena._loveRibbons) {
                rib.phase  += rib.speed;
                rib.x      += rib.drift;
                rib.angle  += 0.004;
                if (rib.x < -200) rib.x = arena.width  + 200;
                if (rib.x > arena.width  + 200) rib.x = -200;
            }
        }

        // Rose petals
        if (arena._loveParticles) {
            for (let i = arena._loveParticles.length - 1; i >= 0; i--) {
                const p = arena._loveParticles[i];
                p.x   += p.vx;
                p.y   += p.vy;
                p.rot += p.rotSpeed;
                p.life--;
                if (p.life <= 0) {
                    arena._loveParticles[i] = LoveBiome._makePetal(arena);
                    arena._loveParticles[i].y = arena.height;
                }
            }
            while (arena._loveParticles.length < 100) {
                arena._loveParticles.push(LoveBiome._makePetal(arena));
            }
        }

        // Sparkles — respawn when dead
        if (arena._loveSparkles) {
            for (let i = arena._loveSparkles.length - 1; i >= 0; i--) {
                arena._loveSparkles[i].life--;
                arena._loveSparkles[i].phase += arena._loveSparkles[i].speed;
                if (arena._loveSparkles[i].life <= 0) {
                    arena._loveSparkles[i] = LoveBiome._makeSparkle(arena);
                }
            }
            while (arena._loveSparkles.length < 60) {
                arena._loveSparkles.push(LoveBiome._makeSparkle(arena));
            }
        }

        // Cupid arrows — fly and respawn
        if (arena._loveCupidArrows) {
            for (let i = arena._loveCupidArrows.length - 1; i >= 0; i--) {
                const arr = arena._loveCupidArrows[i];
                arr.x    += arr.vx;
                arr.y    += arr.vy;
                arr.life--;
                if (arr.life <= 0 || arr.x < -200 || arr.x > arena.width + 200 ||
                    arr.y < -200 || arr.y > arena.height + 200) {
                    arena._loveCupidArrows[i] = LoveBiome._makeCupidArrow(arena);
                }
            }
            while (arena._loveCupidArrows.length < 5) {
                arena._loveCupidArrows.push(LoveBiome._makeCupidArrow(arena));
            }
        }

        // Heart Nexus zone — charmed enemies take 25% more damage
        if (arena.biomeZones) {
            arena.biomeZones.forEach(zone => {
                if (zone.type !== 'HEART_NEXUS') return;
                enemies.forEach(e => {
                    if (e._loveCharmed > 0 &&
                        e.x > zone.x && e.x < zone.x + zone.w &&
                        e.y > zone.y && e.y < zone.y + zone.h) {
                        e._nexusDamageBoost = 1.25;
                    } else {
                        delete e._nexusDamageBoost;
                    }
                });
            });
        }
    }

    // ── Foreground draw ────────────────────────────────────────────────────────

    static draw(ctx, arena) {
        const cam  = arena.camera;
        const t    = Date.now();

        // Rose petals and tiny hearts (falling, in front of entities)
        if (arena._loveParticles) {
            ctx.save();
            for (const p of arena._loveParticles) {
                if (p.x < cam.x - 30 || p.x > cam.x + cam.width  + 30) continue;
                if (p.y < cam.y - 30 || p.y > cam.y + cam.height + 30) continue;
                const lifePct = p.life / (p.maxLife || 480);
                const fade    = Math.min(1, lifePct * 4) * Math.min(1, (1 - lifePct) * 8);
                ctx.globalAlpha = p.alpha * fade;
                ctx.save();
                ctx.translate(p.x, p.y);
                ctx.rotate(p.rot);
                if (p.isHeart) {
                    ctx.fillStyle   = `hsl(${p.hue},100%,72%)`;
                    ctx.shadowColor = `hsl(${p.hue},100%,80%)`;
                    ctx.shadowBlur  = 4;
                    LoveBiome._heartPath(ctx, -p.size * 0.5, -p.size * 0.5, p.size);
                    ctx.fill();
                } else {
                    ctx.fillStyle = `hsl(${p.hue},100%,78%)`;
                    ctx.beginPath();
                    ctx.ellipse(0, 0, p.size, p.size * 0.45, 0, 0, Math.PI * 2);
                    ctx.fill();
                }
                ctx.shadowBlur = 0;
                ctx.restore();
            }
            ctx.globalAlpha = 1;
            ctx.restore();
        }

        // Candy sparkles (4-point star bursts)
        if (arena._loveSparkles) {
            ctx.save();
            for (const sp of arena._loveSparkles) {
                if (sp.x < cam.x - 20 || sp.x > cam.x + cam.width  + 20) continue;
                if (sp.y < cam.y - 20 || sp.y > cam.y + cam.height + 20) continue;
                const twinkle = 0.5 + 0.5 * Math.sin(sp.phase);
                ctx.globalAlpha = sp.alpha * twinkle;
                ctx.save();
                ctx.translate(sp.x, sp.y);
                ctx.rotate(sp.phase * 0.5);
                ctx.fillStyle   = `hsl(${sp.hue},100%,80%)`;
                ctx.shadowColor = `hsl(${sp.hue},100%,85%)`;
                ctx.shadowBlur  = 6;
                // 4-point star
                const s = sp.size;
                ctx.beginPath();
                for (let i = 0; i < 8; i++) {
                    const r2  = i % 2 === 0 ? s : s * 0.35;
                    const ang = (Math.PI * i) / 4;
                    i === 0 ? ctx.moveTo(Math.cos(ang) * r2, Math.sin(ang) * r2)
                            : ctx.lineTo(Math.cos(ang) * r2, Math.sin(ang) * r2);
                }
                ctx.closePath();
                ctx.fill();
                ctx.shadowBlur = 0;
                ctx.restore();
            }
            ctx.globalAlpha = 1;
            ctx.restore();
        }

        // Heart Nexus zones — large pulsing heart outlines instead of boxes
        if (arena.biomeZones) {
            ctx.save();
            arena.biomeZones.forEach(zone => {
                if (zone.type !== 'HEART_NEXUS') return;
                const cx2   = zone.x + zone.w / 2;
                const cy2   = zone.y + zone.h / 2;
                const pulse = 0.5 + 0.5 * Math.sin(t * 0.002 + zone.x * 0.001);
                const sz    = Math.min(zone.w, zone.h) * 0.55 * (1 + pulse * 0.08);

                ctx.save();
                ctx.translate(cx2, cy2);
                // Glow fill
                const rg = ctx.createRadialGradient(0, sz * 0.1, 0, 0, sz * 0.1, sz);
                rg.addColorStop(0,   `rgba(255,100,160,${0.06 + 0.04 * pulse})`);
                rg.addColorStop(1,   'rgba(255,100,160,0)');
                ctx.fillStyle = rg;
                LoveBiome._heartPath(ctx, -sz * 0.5, -sz * 0.5, sz);
                ctx.fill();
                // Dashed outline
                ctx.strokeStyle = `rgba(255,80,150,${0.18 + 0.12 * pulse})`;
                ctx.lineWidth   = 2;
                ctx.shadowColor = '#ff4d94';
                ctx.shadowBlur  = 10 * pulse;
                ctx.setLineDash([8, 10]);
                ctx.lineDashOffset = (t * 0.03) % 18;
                LoveBiome._heartPath(ctx, -sz * 0.5, -sz * 0.5, sz);
                ctx.stroke();
                ctx.setLineDash([]);
                ctx.restore();
            });
            ctx.restore();
        }

        // Periodic love burst — brief screen-wide pink flash every ~5s
        const burstPhase = (arena._loveTick || 0) % 300;
        if (burstPhase < 8) {
            ctx.save();
            ctx.globalAlpha = 0.04 * (1 - burstPhase / 8);
            ctx.fillStyle   = '#ff6b9d';
            ctx.fillRect(cam.x, cam.y, cam.width, cam.height);
            ctx.restore();
        }
    }

    static drawObstacle(ctx, obs) {
        const { x, y, w, h } = obs;
        const bev = 6;
        const seed = obs.x * 0.0071 + obs.y * 0.0137;
        const r = (i) => { const s = Math.sin(seed + i * 0.391) * 43758.5453; return s - Math.floor(s); };

        // Base: deep rose → magenta gradient
        const grd = ctx.createLinearGradient(x, y, x + w, y + h);
        grd.addColorStop(0,   '#5c1030');
        grd.addColorStop(0.45,'#7a0a40');
        grd.addColorStop(1,   '#3a0820');
        ctx.fillStyle = grd;
        ctx.fillRect(x, y, w, h);

        ctx.save();
        ctx.beginPath(); ctx.rect(x + 1, y + 1, w - 2, h - 2); ctx.clip();

        // Scattered heart symbols
        const numHearts = 2 + (r(seed + 1) * 3 | 0);
        for (let i = 0; i < numHearts; i++) {
            const s = seed + i * 1.37;
            const hx = x + (0.15 + r(s) * 0.7) * w;
            const hy = y + (0.2  + r(s + 0.1) * 0.6) * h;
            const hs = 6 + r(s + 0.2) * 10;
            ctx.fillStyle = `rgba(255,${80 + (r(s + 0.3) * 80 | 0)},${120 + (r(s + 0.4) * 60 | 0)},${0.3 + r(s + 0.5) * 0.3})`;
            ctx.beginPath();
            ctx.moveTo(hx, hy + hs * 0.3);
            ctx.bezierCurveTo(hx, hy - hs * 0.1, hx - hs * 0.6, hy - hs * 0.5, hx - hs * 0.5, hy - hs * 0.15);
            ctx.arc(hx - hs * 0.25, hy - hs * 0.2, hs * 0.28, Math.PI * 1.1, Math.PI * 0, false);
            ctx.arc(hx + hs * 0.25, hy - hs * 0.2, hs * 0.28, Math.PI, Math.PI * 1.9, false);
            ctx.bezierCurveTo(hx + hs * 0.6, hy - hs * 0.5, hx, hy - hs * 0.1, hx, hy + hs * 0.3);
            ctx.closePath(); ctx.fill();
        }

        // Rose petal blobs along top edge
        const numPetals = 3 + (r(seed + 8) * 4 | 0);
        for (let i = 0; i < numPetals; i++) {
            const s = seed + i * 1.11;
            const px = x + (0.05 + r(s) * 0.9) * w;
            const pw = 10 + r(s + 0.1) * 16;
            const ph = 7  + r(s + 0.2) * 10;
            ctx.fillStyle = `rgba(255,${100 + (r(s + 0.3) * 60 | 0)},150,${0.45 + r(s + 0.4) * 0.3})`;
            ctx.beginPath(); ctx.ellipse(px, y + ph * 0.5, pw * 0.5, ph * 0.5, r(s + 0.5) * 0.6, 0, Math.PI * 2); ctx.fill();
        }

        // Sparkle highlights (4-point stars)
        const numSparkles = 2 + (r(seed + 15) * 3 | 0);
        for (let i = 0; i < numSparkles; i++) {
            const s = seed + i * 2.03;
            const sx = x + r(s)       * w;
            const sy = y + r(s + 0.1) * h;
            const sl = 4 + r(s + 0.2) * 5;
            ctx.strokeStyle = `rgba(255,220,240,${0.5 + r(s + 0.3) * 0.4})`;
            ctx.lineWidth = 1;
            ctx.beginPath(); ctx.moveTo(sx - sl, sy); ctx.lineTo(sx + sl, sy); ctx.stroke();
            ctx.beginPath(); ctx.moveTo(sx, sy - sl); ctx.lineTo(sx, sy + sl); ctx.stroke();
        }

        ctx.restore();

        // Bevel: warm pink tint
        ctx.fillStyle = 'rgba(220,60,130,0.28)';
        ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x + w, y); ctx.lineTo(x + w - bev, y + bev); ctx.lineTo(x + bev, y + bev); ctx.closePath(); ctx.fill();
        ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x + bev, y + bev); ctx.lineTo(x + bev, y + h - bev); ctx.lineTo(x, y + h); ctx.closePath(); ctx.fill();
        ctx.fillStyle = 'rgba(0,0,0,0.50)';
        ctx.beginPath(); ctx.moveTo(x, y + h); ctx.lineTo(x + w, y + h); ctx.lineTo(x + w - bev, y + h - bev); ctx.lineTo(x + bev, y + h - bev); ctx.closePath(); ctx.fill();
        ctx.beginPath(); ctx.moveTo(x + w, y); ctx.lineTo(x + w, y + h); ctx.lineTo(x + w - bev, y + h - bev); ctx.lineTo(x + w - bev, y + bev); ctx.closePath(); ctx.fill();

        ctx.strokeStyle = '#2a0415';
        ctx.lineWidth = 2;
        ctx.strokeRect(x, y, w, h);
    }
}

window.LoveBiome = LoveBiome;
