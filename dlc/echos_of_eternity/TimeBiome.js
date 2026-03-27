// Echos of Eternity — Time Biome: The Shattered Continuum
// Floating fragments of fractured timelines. Sand drifts upward.
// Clock-face shards pulse in the background. Reality bleeds.

class TimeBiome {
    static generate(arena) {
        const cx = arena.width / 2;
        const cy = arena.height / 2;

        // Temporal rift zones — slow enemy movement slightly, immune for Time hero
        if (typeof BiomeZone !== 'undefined') {
            arena.biomeZones.push(new BiomeZone(cx - 450, cy - 300, 250, 250, 'TIME_RIFT'));
            arena.biomeZones.push(new BiomeZone(cx + 200, cy + 150, 200, 200, 'TIME_RIFT'));
            arena.biomeZones.push(new BiomeZone(cx - 200, cy + 300, 180, 180, 'TIME_RIFT'));
        }

        // Initialize biome state on arena for particles
        arena._timeParticles = [];
        arena._timeRiftAngle = 0;
        arena._timeFragments = [];

        // Generate floating clock fragments (static world-space decorations)
        for (let i = 0; i < 18; i++) {
            arena._timeFragments.push({
                x: Math.random() * arena.width,
                y: Math.random() * arena.height,
                radius: 18 + Math.random() * 40,
                angle: Math.random() * Math.PI * 2,
                rotSpeed: (Math.random() - 0.5) * 0.008,
                alpha: 0.04 + Math.random() * 0.08,
                hands: [Math.random() * Math.PI * 2, Math.random() * Math.PI * 2]
            });
        }

        // Seed rising sand particles
        for (let i = 0; i < 60; i++) {
            arena._timeParticles.push(TimeBiome._makeParticle(arena));
        }
    }

    static _makeParticle(arena) {
        return {
            x: Math.random() * arena.width,
            y: Math.random() * arena.height,
            vy: -(0.3 + Math.random() * 0.9),   // drifts upward
            vx: (Math.random() - 0.5) * 0.4,
            size: 1 + Math.random() * 2.5,
            alpha: 0.15 + Math.random() * 0.4,
            life: 180 + Math.floor(Math.random() * 240),
            maxLife: 0
        };
    }

    static drawBackground(ctx, arena) {
        const cam = arena.camera;
        const cellSize = 380;
        const sx = Math.floor(cam.x / cellSize) * cellSize;
        const sy = Math.floor(cam.y / cellSize) * cellSize;
        const ex = sx + cam.width + cellSize;
        const ey = sy + cam.height + cellSize;

        ctx.save();

        for (let x = sx; x <= ex; x += cellSize) {
            for (let y = sy; y <= ey; y += cellSize) {
                const h = Math.sin(x * 7.3491 + y * 13.7128) * 43758.5453;
                const v = h - Math.floor(h);

                // Cracked time lines on the floor
                if (v > 0.55) {
                    const fx = x + (v * 2341) % cellSize;
                    const fy = y + (v * 5673) % cellSize;
                    ctx.strokeStyle = `rgba(180,150,60,0.12)`;
                    ctx.lineWidth = 2;
                    ctx.lineCap = 'round';
                    ctx.beginPath();
                    ctx.moveTo(fx, fy);
                    ctx.lineTo(fx + 25 * v, fy - 35 * v);
                    ctx.lineTo(fx + 10 * v, fy - 60 * v);
                    ctx.stroke();
                }

                // Sand grain clusters
                if (v < 0.35) {
                    const gx = x + (v * 8821) % cellSize;
                    const gy = y + (v * 6643) % cellSize;
                    const gs = 6 + v * 14;
                    ctx.fillStyle = `rgba(160,130,60,0.07)`;
                    ctx.beginPath();
                    ctx.arc(gx, gy, gs, 0, Math.PI * 2);
                    ctx.fill();
                }
            }
        }

        // Clock-face fragments (drawn in world space, only if in camera view)
        if (arena._timeFragments) {
            for (const frag of arena._timeFragments) {
                if (frag.x < cam.x - 80 || frag.x > cam.x + cam.width + 80) continue;
                if (frag.y < cam.y - 80 || frag.y > cam.y + cam.height + 80) continue;

                ctx.save();
                ctx.translate(frag.x, frag.y);
                ctx.rotate(frag.angle);
                ctx.globalAlpha = frag.alpha;

                // Outer circle
                ctx.strokeStyle = '#c8aa6e';
                ctx.lineWidth = 1.5;
                ctx.beginPath();
                ctx.arc(0, 0, frag.radius, 0, Math.PI * 2);
                ctx.stroke();

                // Hour marks
                for (let i = 0; i < 12; i++) {
                    const a = (Math.PI * 2 / 12) * i;
                    const inner = frag.radius * 0.8;
                    ctx.beginPath();
                    ctx.moveTo(Math.cos(a) * inner, Math.sin(a) * inner);
                    ctx.lineTo(Math.cos(a) * frag.radius * 0.95, Math.sin(a) * frag.radius * 0.95);
                    ctx.stroke();
                }

                // Two clock hands
                ctx.lineWidth = 1;
                [frag.radius * 0.55, frag.radius * 0.38].forEach((len, idx) => {
                    const a = frag.hands[idx];
                    ctx.beginPath();
                    ctx.moveTo(0, 0);
                    ctx.lineTo(Math.cos(a) * len, Math.sin(a) * len);
                    ctx.stroke();
                });

                ctx.restore();
            }
        }

        ctx.restore();
    }

    static update(arena, player, enemies) {
        // Rotate clock fragments slowly
        if (arena._timeFragments) {
            for (const frag of arena._timeFragments) {
                frag.angle += frag.rotSpeed;
                frag.hands[0] += 0.002;
                frag.hands[1] += 0.0005;
            }
        }

        // Update rising sand particles
        if (arena._timeParticles) {
            for (let i = arena._timeParticles.length - 1; i >= 0; i--) {
                const p = arena._timeParticles[i];
                p.x += p.vx;
                p.y += p.vy;
                p.life--;
                if (p.life <= 0) {
                    arena._timeParticles[i] = TimeBiome._makeParticle(arena);
                    // Re-seed at bottom of map
                    arena._timeParticles[i].y = arena.height * Math.random();
                }
            }

            // Spawn extras if below count (after deaths)
            while (arena._timeParticles.length < 60) {
                arena._timeParticles.push(TimeBiome._makeParticle(arena));
            }
        }

        // Time Rift zone effect — slow non-time enemies slightly
        if (arena.biomeZones) {
            arena.biomeZones.forEach(zone => {
                if (zone.type !== 'TIME_RIFT') return;
                enemies.forEach(e => {
                    if (e.x > zone.x && e.x < zone.x + zone.w &&
                        e.y > zone.y && e.y < zone.y + zone.h) {
                        // Only slow if not already affected by Time hero mechanics
                        if (!e._timeSlowed && !e._anchorFrozen) {
                            e.biomeSpeedMod = Math.min(e.biomeSpeedMod || 1, 0.75);
                        }
                    }
                });
                // Time hero is immune — no speed penalty for player
            });
        }
    }

    static draw(ctx, arena) {
        const cam = arena.camera;

        // Rising sand particles
        if (arena._timeParticles) {
            ctx.save();
            for (const p of arena._timeParticles) {
                if (p.x < cam.x - 10 || p.x > cam.x + cam.width + 10) continue;
                if (p.y < cam.y - 10 || p.y > cam.y + cam.height + 10) continue;
                ctx.globalAlpha = p.alpha * (p.life / (p.maxLife || 200));
                ctx.fillStyle = '#d4af37';
                ctx.beginPath();
                ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
                ctx.fill();
            }
            ctx.restore();
        }

        // Time rift zone indicators
        if (arena.biomeZones) {
            ctx.save();
            arena.biomeZones.forEach(zone => {
                if (zone.type !== 'TIME_RIFT') return;
                const pulse = 0.04 + 0.02 * Math.sin(Date.now() * 0.003);
                ctx.strokeStyle = `rgba(200,170,80,${pulse * 3})`;
                ctx.lineWidth = 1.5;
                ctx.setLineDash([8, 12]);
                ctx.strokeRect(zone.x, zone.y, zone.w, zone.h);
                ctx.setLineDash([]);
            });
            ctx.restore();
        }
    }
}

window.TimeBiome = TimeBiome;
