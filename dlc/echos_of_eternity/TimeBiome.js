// Echos of Eternity — Time Biome: The Shattered Continuum
// The multiverse tears open. Infinite timelines bleed into each other.
// Shattered clock faces drift. Nebula-coloured rift veins crack the floor.
// Ghost silhouettes of past events flicker. Reality stutters.

class TimeBiome {
    static generate(arena) {
        const cx = arena.width / 2;
        const cy = arena.height / 2;

        // Temporal rift zones — slow enemy movement slightly
        if (typeof BiomeZone !== 'undefined') {
            arena.biomeZones.push(new BiomeZone(cx - 450, cy - 300, 250, 250, 'TIME_RIFT'));
            arena.biomeZones.push(new BiomeZone(cx + 200, cy + 150, 200, 200, 'TIME_RIFT'));
            arena.biomeZones.push(new BiomeZone(cx - 200, cy + 300, 180, 180, 'TIME_RIFT'));
        }

        // ── Clock face fragments (floating, world-space) ──────────────────────
        arena._timeFragments = [];
        for (let i = 0; i < 22; i++) {
            arena._timeFragments.push({
                x:        Math.random() * arena.width,
                y:        Math.random() * arena.height,
                radius:   22 + Math.random() * 60,
                angle:    Math.random() * Math.PI * 2,
                rotSpeed: (Math.random() - 0.5) * 0.006,
                alpha:    0.07 + Math.random() * 0.13,
                hands:    [Math.random() * Math.PI * 2, Math.random() * Math.PI * 2],
                cracked:  Math.random() > 0.4,  // cracked variant
                hue:      Math.random() < 0.3 ? 270 : 45,  // purple or gold
            });
        }

        // ── Rift veins (static lightning-bolt cracks in the floor) ───────────
        arena._timeRiftVeins = [];
        for (let i = 0; i < 14; i++) {
            const ox = Math.random() * arena.width;
            const oy = Math.random() * arena.height;
            const segments = [];
            let px = ox, py = oy;
            const length = 5 + Math.floor(Math.random() * 8);
            for (let s = 0; s < length; s++) {
                const a = (Math.random() - 0.5) * Math.PI * 0.9 + (s === 0 ? Math.PI * 0.25 : 0);
                px += Math.cos(a) * (30 + Math.random() * 70);
                py += Math.sin(a) * (20 + Math.random() * 50);
                segments.push({ x: px, y: py });
            }
            arena._timeRiftVeins.push({
                ox, oy, segments,
                color: Math.random() < 0.5 ? '#8b5cf6' : '#c8aa6e',
                alpha: 0.08 + Math.random() * 0.14,
                glowAlpha: 0.0,
                glowDir: 1,
            });
        }

        // ── Ghost echoes (flickering silhouettes of past hero positions) ──────
        arena._timeGhosts = [];
        for (let i = 0; i < 6; i++) {
            arena._timeGhosts.push(TimeBiome._makeGhost(arena));
        }

        // ── Nebula clouds (large, slow-moving coloured dust) ──────────────────
        arena._timeClouds = [];
        for (let i = 0; i < 10; i++) {
            arena._timeClouds.push({
                x:      Math.random() * arena.width,
                y:      Math.random() * arena.height,
                r:      120 + Math.random() * 200,
                hue:    Math.random() < 0.5 ? 270 : (Math.random() < 0.5 ? 200 : 45),
                alpha:  0.018 + Math.random() * 0.022,
                vx:     (Math.random() - 0.5) * 0.12,
                vy:     (Math.random() - 0.5) * 0.12,
            });
        }

        // ── Sand/dust motes rising upward ─────────────────────────────────────
        arena._timeParticles = [];
        for (let i = 0; i < 80; i++) {
            arena._timeParticles.push(TimeBiome._makeParticle(arena));
        }

        arena._timeRiftAngle = 0;
        arena._timeTick = 0;
    }

    // ── Factories ──────────────────────────────────────────────────────────────

    static _makeParticle(arena) {
        const type = Math.random();
        return {
            x:       Math.random() * arena.width,
            y:       arena.height * (0.3 + Math.random() * 0.7),
            vy:      -(0.2 + Math.random() * 1.1),
            vx:      (Math.random() - 0.5) * 0.5,
            size:    0.8 + Math.random() * 2.8,
            alpha:   0.12 + Math.random() * 0.45,
            life:    150 + Math.floor(Math.random() * 300),
            maxLife: 450,
            // gold dust vs purple mote
            gold:    type > 0.35,
        };
    }

    static _makeGhost(arena) {
        return {
            x:       Math.random() * arena.width,
            y:       Math.random() * arena.height,
            r:       14 + Math.random() * 10,
            alpha:   0,
            targetA: 0.06 + Math.random() * 0.10,
            life:    120 + Math.floor(Math.random() * 300),
            maxLife: 0,
            vx:      (Math.random() - 0.5) * 0.4,
            vy:      (Math.random() - 0.5) * 0.3,
            hue:     Math.random() < 0.5 ? 270 : 200,
        };
    }

    // ── Background (floor-level decoration, drawn before entities) ────────────

    static drawBackground(ctx, arena) {
        const cam  = arena.camera;
        const tick = arena._timeTick || 0;

        ctx.save();

        // 1. Sand-tinted base wash — warm desert undertone beneath the temporal effects
        {
            ctx.fillStyle = 'rgba(180,148,90,0.07)';
            ctx.fillRect(cam.x, cam.y, cam.width, cam.height);
        }

        // 1b. Deep space vignette — dark purple edge fade over the sand base
        {
            const grd = ctx.createRadialGradient(
                cam.x + cam.width * 0.5, cam.y + cam.height * 0.5, 0,
                cam.x + cam.width * 0.5, cam.y + cam.height * 0.5,
                Math.max(cam.width, cam.height) * 0.75
            );
            grd.addColorStop(0,   'rgba(20,0,40,0.0)');
            grd.addColorStop(0.6, 'rgba(20,0,40,0.0)');
            grd.addColorStop(1,   'rgba(10,0,25,0.22)');
            ctx.fillStyle = grd;
            ctx.fillRect(cam.x, cam.y, cam.width, cam.height);
        }

        // 2. Nebula clouds
        if (arena._timeClouds) {
            for (const cl of arena._timeClouds) {
                if (cl.x + cl.r < cam.x || cl.x - cl.r > cam.x + cam.width) continue;
                if (cl.y + cl.r < cam.y || cl.y - cl.r > cam.y + cam.height) continue;
                const grd = ctx.createRadialGradient(cl.x, cl.y, 0, cl.x, cl.y, cl.r);
                grd.addColorStop(0,   `hsla(${cl.hue},80%,55%,${cl.alpha * 2.2})`);
                grd.addColorStop(0.5, `hsla(${cl.hue},70%,45%,${cl.alpha})`);
                grd.addColorStop(1,   `hsla(${cl.hue},60%,35%,0)`);
                ctx.fillStyle = grd;
                ctx.beginPath();
                ctx.arc(cl.x, cl.y, cl.r, 0, Math.PI * 2);
                ctx.fill();
            }
        }

        // 3. Rift vein cracks in the floor
        if (arena._timeRiftVeins) {
            for (const vein of arena._timeRiftVeins) {
                // rough viewport cull
                if (vein.ox + 400 < cam.x || vein.ox - 400 > cam.x + cam.width) continue;
                const glowPulse = vein.glowAlpha;
                ctx.save();
                // outer glow pass
                ctx.strokeStyle = vein.color;
                ctx.lineWidth   = 4;
                ctx.globalAlpha = glowPulse * 0.5;
                ctx.shadowColor = vein.color;
                ctx.shadowBlur  = 12;
                ctx.lineCap     = 'round';
                ctx.lineJoin    = 'round';
                ctx.beginPath();
                ctx.moveTo(vein.ox, vein.oy);
                for (const seg of vein.segments) ctx.lineTo(seg.x, seg.y);
                ctx.stroke();
                // sharp inner line
                ctx.lineWidth   = 1.2;
                ctx.globalAlpha = vein.alpha + glowPulse * 0.25;
                ctx.shadowBlur  = 0;
                ctx.stroke();
                ctx.restore();
            }
        }

        // 4. Tiled floor detail — fracture marks + quantum static dots
        {
            const cellSize = 320;
            const sx = Math.floor(cam.x / cellSize) * cellSize;
            const sy = Math.floor(cam.y / cellSize) * cellSize;
            const ex = sx + cam.width  + cellSize;
            const ey = sy + cam.height + cellSize;

            for (let x = sx; x <= ex; x += cellSize) {
                for (let y = sy; y <= ey; y += cellSize) {
                    const h = Math.sin(x * 5.1731 + y * 11.9134) * 43758.5453;
                    const v = h - Math.floor(h);

                    // Fracture lines
                    if (v > 0.52) {
                        const fx = x + (v * 2341) % cellSize;
                        const fy = y + (v * 5673) % cellSize;
                        ctx.save();
                        ctx.strokeStyle = v > 0.75
                            ? `rgba(140,100,220,0.10)`
                            : `rgba(200,165,70,0.09)`;
                        ctx.lineWidth = 1.5;
                        ctx.lineCap   = 'round';
                        ctx.beginPath();
                        ctx.moveTo(fx, fy);
                        ctx.lineTo(fx + 40 * v, fy - 55 * v);
                        ctx.lineTo(fx + 18 * v, fy - 95 * v);
                        ctx.stroke();
                        // small branch
                        ctx.globalAlpha = 0.55;
                        ctx.beginPath();
                        ctx.moveTo(fx + 22 * v, fy - 40 * v);
                        ctx.lineTo(fx + 50 * v, fy - 35 * v);
                        ctx.stroke();
                        ctx.restore();
                    }

                    // Quantum static dots
                    if (v < 0.22) {
                        const qx = x + (v * 9137) % cellSize;
                        const qy = y + (v * 6421) % cellSize;
                        ctx.globalAlpha = 0.06;
                        ctx.fillStyle = v < 0.11 ? '#c8aa6e' : '#8b5cf6';
                        ctx.beginPath();
                        ctx.arc(qx, qy, 2 + v * 6, 0, Math.PI * 2);
                        ctx.fill();
                        ctx.globalAlpha = 1;
                    }
                }
            }
        }

        // 5. Ghost echoes
        if (arena._timeGhosts) {
            for (const g of arena._timeGhosts) {
                if (g.x < cam.x - 60 || g.x > cam.x + cam.width + 60) continue;
                if (g.y < cam.y - 60 || g.y > cam.y + cam.height + 60) continue;
                // Helmet silhouette (simplified drawHeroSprite outline)
                ctx.save();
                ctx.globalAlpha = g.alpha;
                ctx.fillStyle   = `hsla(${g.hue},70%,65%,1)`;
                ctx.shadowColor = `hsla(${g.hue},90%,70%,1)`;
                ctx.shadowBlur  = 10;
                // head blob
                ctx.beginPath();
                ctx.arc(g.x, g.y, g.r, 0, Math.PI * 2);
                ctx.fill();
                // shoulder stumps
                ctx.beginPath();
                ctx.ellipse(g.x - g.r * 1.1, g.y + g.r * 0.6, g.r * 0.55, g.r * 0.35, 0, 0, Math.PI * 2);
                ctx.fill();
                ctx.beginPath();
                ctx.ellipse(g.x + g.r * 1.1, g.y + g.r * 0.6, g.r * 0.55, g.r * 0.35, 0, 0, Math.PI * 2);
                ctx.fill();
                ctx.restore();
            }
        }

        // 6. Clock-face fragments
        if (arena._timeFragments) {
            for (const frag of arena._timeFragments) {
                if (frag.x < cam.x - 100 || frag.x > cam.x + cam.width + 100) continue;
                if (frag.y < cam.y - 100 || frag.y > cam.y + cam.height + 100) continue;

                ctx.save();
                ctx.translate(frag.x, frag.y);
                ctx.rotate(frag.angle);
                ctx.globalAlpha = frag.alpha;

                const col = frag.hue === 270 ? '#a78bfa' : '#c8aa6e';

                // Glow backdrop
                ctx.shadowColor = col;
                ctx.shadowBlur  = 8;

                // Outer circle
                ctx.strokeStyle = col;
                ctx.lineWidth   = 1.8;
                ctx.beginPath();
                ctx.arc(0, 0, frag.radius, 0, Math.PI * 2);
                ctx.stroke();

                // If cracked: draw a gap/shatter line through the face
                if (frag.cracked) {
                    ctx.save();
                    ctx.globalAlpha *= 1.5;
                    ctx.strokeStyle = col;
                    ctx.lineWidth   = 0.8;
                    const ca = Math.PI * 0.3;
                    ctx.beginPath();
                    ctx.moveTo(Math.cos(ca) * frag.radius * 0.2, Math.sin(ca) * frag.radius * 0.2);
                    ctx.lineTo(Math.cos(ca + Math.PI * 0.15) * frag.radius * 1.02,
                               Math.sin(ca + Math.PI * 0.15) * frag.radius * 1.02);
                    ctx.stroke();
                    const cb = ca + Math.PI * 0.65;
                    ctx.beginPath();
                    ctx.moveTo(0, 0);
                    ctx.lineTo(Math.cos(cb) * frag.radius * 1.0, Math.sin(cb) * frag.radius * 1.0);
                    ctx.stroke();
                    ctx.restore();
                }

                // Hour marks
                ctx.lineWidth = 1;
                for (let i = 0; i < 12; i++) {
                    const a     = (Math.PI * 2 / 12) * i;
                    const inner = frag.radius * (i % 3 === 0 ? 0.72 : 0.82);
                    ctx.beginPath();
                    ctx.moveTo(Math.cos(a) * inner,             Math.sin(a) * inner);
                    ctx.lineTo(Math.cos(a) * frag.radius * 0.96, Math.sin(a) * frag.radius * 0.96);
                    ctx.stroke();
                }

                // Two clock hands
                ctx.lineWidth = 1.2;
                [frag.radius * 0.58, frag.radius * 0.38].forEach((len, idx) => {
                    const a = frag.hands[idx];
                    ctx.beginPath();
                    ctx.moveTo(0, 0);
                    ctx.lineTo(Math.cos(a) * len, Math.sin(a) * len);
                    ctx.stroke();
                });

                // Centre pip
                ctx.fillStyle = col;
                ctx.beginPath();
                ctx.arc(0, 0, 2, 0, Math.PI * 2);
                ctx.fill();

                ctx.restore();
            }
        }

        ctx.restore();
    }

    // ── Update (called every frame) ────────────────────────────────────────────

    static update(arena, player, enemies) {
        arena._timeTick = (arena._timeTick || 0) + 1;
        const tick = arena._timeTick;

        // Clock fragments — rotate, tick hands
        if (arena._timeFragments) {
            for (const frag of arena._timeFragments) {
                frag.angle    += frag.rotSpeed;
                frag.hands[0] += 0.0025;
                frag.hands[1] += 0.0006;
            }
        }

        // Rift veins — pulse glow in and out randomly
        if (arena._timeRiftVeins) {
            for (const vein of arena._timeRiftVeins) {
                vein.glowAlpha += vein.glowDir * 0.004;
                if (vein.glowAlpha >= 0.7 || vein.glowAlpha <= 0) {
                    vein.glowDir *= -1;
                    if (Math.random() < 0.05) vein.glowDir *= Math.random() < 0.5 ? 3 : 1; // random spike
                }
                vein.glowAlpha = Math.max(0, Math.min(1, vein.glowAlpha));
            }
        }

        // Nebula clouds — drift slowly
        if (arena._timeClouds) {
            for (const cl of arena._timeClouds) {
                cl.x += cl.vx;
                cl.y += cl.vy;
                if (cl.x < -cl.r) cl.x = arena.width  + cl.r;
                if (cl.x > arena.width  + cl.r) cl.x = -cl.r;
                if (cl.y < -cl.r) cl.y = arena.height + cl.r;
                if (cl.y > arena.height + cl.r) cl.y = -cl.r;
            }
        }

        // Ghost echoes — fade in/out and drift
        if (arena._timeGhosts) {
            for (let i = arena._timeGhosts.length - 1; i >= 0; i--) {
                const g = arena._timeGhosts[i];
                g.life--;
                g.x += g.vx;
                g.y += g.vy;
                const half = g.maxLife || (g.life + 1);
                // fade in then out
                if (g.life > half * 0.6) {
                    g.alpha = Math.min(g.targetA, g.alpha + 0.002);
                } else {
                    g.alpha = Math.max(0, g.alpha - 0.003);
                }
                if (g.life <= 0) {
                    arena._timeGhosts[i] = TimeBiome._makeGhost(arena);
                    const ng = arena._timeGhosts[i];
                    ng.maxLife = ng.life;
                    ng.alpha   = 0;
                }
            }
            while (arena._timeGhosts.length < 6) {
                const g = TimeBiome._makeGhost(arena);
                g.maxLife = g.life;
                arena._timeGhosts.push(g);
            }
        }

        // Sand/dust motes
        if (arena._timeParticles) {
            for (let i = arena._timeParticles.length - 1; i >= 0; i--) {
                const p = arena._timeParticles[i];
                p.x   += p.vx;
                p.y   += p.vy;
                p.life--;
                if (p.life <= 0) {
                    arena._timeParticles[i] = TimeBiome._makeParticle(arena);
                    arena._timeParticles[i].y = arena.height;
                }
            }
            while (arena._timeParticles.length < 80) {
                arena._timeParticles.push(TimeBiome._makeParticle(arena));
            }
        }

        // Time Rift zone — slow non-time enemies
        if (arena.biomeZones) {
            arena.biomeZones.forEach(zone => {
                if (zone.type !== 'TIME_RIFT') return;
                enemies.forEach(e => {
                    if (e.x > zone.x && e.x < zone.x + zone.w &&
                        e.y > zone.y && e.y < zone.y + zone.h) {
                        if (!e._timeSlowed && !e._anchorFrozen) {
                            e.biomeSpeedMod = Math.min(e.biomeSpeedMod || 1, 0.72);
                        }
                    }
                });
            });
        }
    }

    // ── Foreground draw (after entities) ──────────────────────────────────────

    static draw(ctx, arena) {
        const cam  = arena.camera;
        const tick = arena._timeTick || 0;
        const t    = Date.now();

        // Rising sand/dust motes
        if (arena._timeParticles) {
            ctx.save();
            for (const p of arena._timeParticles) {
                if (p.x < cam.x - 10 || p.x > cam.x + cam.width  + 10) continue;
                if (p.y < cam.y - 10 || p.y > cam.y + cam.height + 10) continue;
                const lifePct = p.life / (p.maxLife || 300);
                // fade in during first 20% of life, fade out in last 20%
                const fadeIn  = Math.min(1, (1 - lifePct) * 5);
                const fadeOut = Math.min(1, lifePct * 5);
                ctx.globalAlpha = p.alpha * fadeIn * fadeOut;
                ctx.fillStyle   = p.gold ? '#d4af37' : '#a78bfa';
                ctx.beginPath();
                ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
                ctx.fill();
            }
            ctx.globalAlpha = 1;
            ctx.restore();
        }

        // Time rift zone — shimmering oval border, no ugly box
        if (arena.biomeZones) {
            ctx.save();
            arena.biomeZones.forEach(zone => {
                if (zone.type !== 'TIME_RIFT') return;
                const pulse = 0.5 + 0.5 * Math.sin(t * 0.0028 + zone.x * 0.001);
                const cx2   = zone.x + zone.w / 2;
                const cy2   = zone.y + zone.h / 2;
                const rx    = zone.w / 2;
                const ry    = zone.h / 2;

                ctx.save();
                ctx.translate(cx2, cy2);
                // Outer glow ellipse
                ctx.strokeStyle = `rgba(140,100,220,${0.10 + 0.08 * pulse})`;
                ctx.lineWidth   = 3;
                ctx.shadowColor = '#8b5cf6';
                ctx.shadowBlur  = 14 * pulse;
                ctx.setLineDash([10, 16]);
                ctx.lineDashOffset = (t * 0.025) % 26;
                ctx.beginPath();
                ctx.ellipse(0, 0, rx, ry, 0, 0, Math.PI * 2);
                ctx.stroke();
                ctx.setLineDash([]);
                ctx.shadowBlur = 0;
                // Inner fill tint
                const rg = ctx.createRadialGradient(0, 0, 0, 0, 0, Math.max(rx, ry));
                rg.addColorStop(0,   `rgba(100,60,180,${0.04 * pulse})`);
                rg.addColorStop(1,   'rgba(100,60,180,0)');
                ctx.fillStyle = rg;
                ctx.beginPath();
                ctx.ellipse(0, 0, rx, ry, 0, 0, Math.PI * 2);
                ctx.fill();
                ctx.restore();
            });
            ctx.restore();
        }

        // Intermittent reality-glitch flash — brief horizontal scanline across screen
        if (tick % 240 > 235) {
            const progress = (tick % 240 - 235) / 5;
            const y = cam.y + Math.random() * cam.height;
            ctx.save();
            ctx.globalAlpha = 0.07 * (1 - progress);
            ctx.fillStyle   = '#a78bfa';
            ctx.fillRect(cam.x, y, cam.width, 3 + Math.random() * 6);
            ctx.restore();
        }
    }
}

window.TimeBiome = TimeBiome;
