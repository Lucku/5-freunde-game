/**
 * Echos of Eternity — DLC Boss Implementations
 * Registers TIME_WRAITH, TEMPORAL_RIFT, ETERNAL_COLLAPSE,
 * MASK_GUARDIAN, MAKUTA_ECHO, CHROME_LEVIATHAN, TEMPORAL_WARDEN
 * via window._DLC_BOSS_REGISTRY
 */

(function () {
    if (!window._DLC_BOSS_REGISTRY) window._DLC_BOSS_REGISTRY = {};

    // ─────────────────────────────────────────────────────────────────
    // Shared Helpers
    // ─────────────────────────────────────────────────────────────────

    function getTarget(boss) {
        return (typeof getCoopTarget === 'function')
            ? getCoopTarget(boss.x, boss.y)
            : player;
    }

    function spawnProj(x, y, vx, vy, damage, color, size) {
        if (typeof projectiles !== 'undefined') {
            projectiles.push(new Projectile(x, y, vx, vy, damage, color, false, size || 8, null, 'boss'));
        }
    }

    function burst(x, y, n, speed, damage, color, size) {
        for (let i = 0; i < n; i++) {
            const a = (Math.PI * 2 / n) * i;
            spawnProj(x, y, Math.cos(a) * speed, Math.sin(a) * speed, damage, color, size);
        }
    }

    function explosion(x, y, color, count) {
        if (typeof createExplosion === 'function') createExplosion(x, y, color || '#4d4343', count || 12);
    }

    function floatText(x, y, txt, color) {
        if (typeof floatingTexts !== 'undefined') {
            floatingTexts.push(new FloatingText(x, y - 60, txt, color || '#fff', 2.5));
        }
    }

    function sfx(id) {
        if (typeof audioManager !== 'undefined') audioManager.play(id);
    }

    function applyHuntElite(boss) {
        const node = window.mazeCurrentNode;
        if (!node || !node.modifiers) return;
        if (node.modifiers.includes('ELITE')) {
            const mult = node.waveStrength || 1.0;
            boss.maxHp = Math.round(boss.maxHp * mult);
            boss.hp = boss.maxHp;
            boss.damage = Math.round(boss.damage * Math.min(2.0, Math.sqrt(mult)));
        }
    }

    // ─────────────────────────────────────────────────────────────────
    // TIME WRAITH
    // ─────────────────────────────────────────────────────────────────
    window._DLC_BOSS_REGISTRY['TIME_WRAITH'] = {
        init(b) {
            b.radius = 52;
            b.color = '#9ab8d0';
            b.phase = 1;
            b.speed = 1.6;
            b.attackCooldown = 90;
            b.attackMaxCooldown = 90;
            b.pulseCooldown = 200;
            b.blinkCooldown = 320;
            b.cloneTimer = 0;
            b.clones = []; // {x,y,life,maxLife}
            b.telegraphTimer = 0;
            b.telegraphData = null;
            b._phaseFlashed = false;
            b._phase3Flashed = false;
            applyHuntElite(b);
        },

        update(b, pl, ar) {
            const t = getTarget(b);
            const dx = t.x - b.x, dy = t.y - b.y;
            const dist = Math.hypot(dx, dy) || 1;

            // Movement — orbits at distance 200 in phase 1, charges in phase 3
            if (b.phase === 3) {
                b.x += (dx / dist) * b.speed * 1.8;
                b.y += (dy / dist) * b.speed * 1.8;
            } else {
                const orbitDist = 220;
                if (dist > orbitDist + 30) {
                    b.x += (dx / dist) * b.speed;
                    b.y += (dy / dist) * b.speed;
                } else if (dist < orbitDist - 30) {
                    b.x -= (dx / dist) * b.speed * 0.5;
                    b.y -= (dy / dist) * b.speed * 0.5;
                } else {
                    // Orbit
                    b.x += (-dy / dist) * b.speed * 0.7;
                    b.y += (dx / dist) * b.speed * 0.7;
                }
            }

            // Phase transitions
            if (b.phase === 1 && b.hp <= b.maxHp * 0.65 && !b._phaseFlashed) {
                b.phase = 2;
                b._phaseFlashed = true;
                b.speed = 2.0;
                b.attackMaxCooldown = 65;
                b.pulseCooldown = 140;
                explosion(b.x, b.y, '#9ab8d0', 16);
                floatText(b.x, b.y, 'PHASE SHIFT', '#9ab8d0');
                sfx('time_wraith_clone_spawn');
                // Spawn 2 clones
                for (let i = 0; i < 2; i++) {
                    b.clones.push({ x: b.x + (i === 0 ? -120 : 120), y: b.y, life: 240, maxLife: 240 });
                }
            }
            if (b.phase === 2 && b.hp <= b.maxHp * 0.30 && !b._phase3Flashed) {
                b.phase = 3;
                b._phase3Flashed = true;
                b.speed = 2.8;
                b.attackMaxCooldown = 45;
                explosion(b.x, b.y, '#ffffff', 20);
                floatText(b.x, b.y, 'FINAL ECHO', '#ffffff');
                sfx('time_wraith_final_echo');
            }

            // Shadow pulse (AoE burst every pulseCooldown frames)
            b.pulseCooldown--;
            if (b.pulseCooldown <= 0) {
                b.pulseCooldown = b.phase >= 2 ? 140 : 200;
                burst(b.x, b.y, b.phase === 3 ? 16 : 10, 3.2, b.damage * 0.7, '#c0d8f0', 7);
                explosion(b.x, b.y, '#9ab8d0', 6);
                sfx('time_wraith_shadow_pulse');
            }

            // Main attack — twin projectiles
            b.attackCooldown--;
            if (b.attackCooldown <= 0) {
                b.attackCooldown = b.attackMaxCooldown;
                sfx('time_wraith_twin_shot');
                const a = Math.atan2(dy, dx);
                const spread = 0.25;
                for (let s = -1; s <= 1; s += 2) {
                    spawnProj(b.x, b.y,
                        Math.cos(a + s * spread) * 4.5,
                        Math.sin(a + s * spread) * 4.5,
                        b.damage, '#9ab8d0', 9);
                }
                // Phase 3: extra aimed shot
                if (b.phase === 3) {
                    spawnProj(b.x, b.y, Math.cos(a) * 5.5, Math.sin(a) * 5.5, b.damage * 1.2, '#ffffff', 10);
                }
            }

            // Blink teleport
            b.blinkCooldown--;
            if (b.blinkCooldown <= 0) {
                b.blinkCooldown = b.phase >= 2 ? 220 : 320;
                // Teleport 250px in a random direction from target
                const ba = Math.random() * Math.PI * 2;
                b.x = Math.max(b.radius, Math.min(ar.width - b.radius, t.x + Math.cos(ba) * 250));
                b.y = Math.max(b.radius, Math.min(ar.height - b.radius, t.y + Math.sin(ba) * 250));
                explosion(b.x, b.y, '#9ab8d0', 8);
                sfx('time_wraith_blink');
            }

            // Clones tick
            for (let i = b.clones.length - 1; i >= 0; i--) {
                const c = b.clones[i];
                c.life--;
                // Clones periodically fire
                if (c.life % 70 === 0) {
                    const ca = Math.atan2(t.y - c.y, t.x - c.x);
                    spawnProj(c.x, c.y, Math.cos(ca) * 3.5, Math.sin(ca) * 3.5, b.damage * 0.45, '#6a90b0', 7);
                }
                if (c.life <= 0) b.clones.splice(i, 1);
            }
        },

        draw(ctx, b) {
            ctx.save();

            // Draw clones
            for (const c of b.clones) {
                const alpha = c.life / c.maxLife * 0.55;
                ctx.globalAlpha = alpha;
                ctx.beginPath();
                ctx.arc(c.x, c.y, b.radius * 0.65, 0, Math.PI * 2);
                ctx.fillStyle = '#9ab8d0';
                ctx.fill();
                ctx.globalAlpha = 1;
            }

            // Outer glow
            const grad = ctx.createRadialGradient(b.x, b.y, b.radius * 0.3, b.x, b.y, b.radius * 1.5);
            grad.addColorStop(0, 'rgba(154,184,208,0.3)');
            grad.addColorStop(1, 'rgba(154,184,208,0)');
            ctx.beginPath();
            ctx.arc(b.x, b.y, b.radius * 1.5, 0, Math.PI * 2);
            ctx.fillStyle = grad;
            ctx.fill();

            // Body
            ctx.beginPath();
            ctx.arc(b.x, b.y, b.radius, 0, Math.PI * 2);
            ctx.fillStyle = b.phase === 3 ? '#dce8f0' : (b.phase === 2 ? '#b0ccde' : '#9ab8d0');
            ctx.fill();
            ctx.strokeStyle = '#ffffff';
            ctx.lineWidth = 2.5;
            ctx.stroke();

            // Hourglass icon
            ctx.strokeStyle = 'rgba(255,255,255,0.7)';
            ctx.lineWidth = 2;
            ctx.beginPath();
            ctx.moveTo(b.x - 14, b.y - 18);
            ctx.lineTo(b.x + 14, b.y - 18);
            ctx.lineTo(b.x - 14, b.y + 18);
            ctx.lineTo(b.x + 14, b.y + 18);
            ctx.closePath();
            ctx.stroke();

            // HP bar shown in top UI — no duplicate bar drawn here
            ctx.restore();
        }
    };

    // ─────────────────────────────────────────────────────────────────
    // TEMPORAL RIFT
    // ─────────────────────────────────────────────────────────────────
    window._DLC_BOSS_REGISTRY['TEMPORAL_RIFT'] = {
        init(b) {
            b.radius = 62;
            b.color = '#7b2d8b';
            b.phase = 1;
            b.speed = 1.2;
            b.damage = b.damage * 1.1;
            b.attackCooldown = 80;
            b.attackMaxCooldown = 80;
            // Orbiting rifts
            b.rifts = [];
            const riftCount = 3;
            for (let i = 0; i < riftCount; i++) {
                b.rifts.push({ angle: (Math.PI * 2 / riftCount) * i, dist: 130, fireCooldown: 90, firePhase: i });
            }
            b.riftAngleSpeed = 0.018;
            b.pullCooldown = 280;
            b.shockCooldown = 400;
            b._phase2Done = false;
            applyHuntElite(b);
        },

        update(b, pl, ar) {
            const t = getTarget(b);
            const dx = t.x - b.x, dy = t.y - b.y;
            const dist = Math.hypot(dx, dy) || 1;

            // Slow pursuit
            b.x += (dx / dist) * b.speed;
            b.y += (dy / dist) * b.speed;

            // Phase 2
            if (!b._phase2Done && b.hp <= b.maxHp * 0.55) {
                b._phase2Done = true;
                b.phase = 2;
                b.riftAngleSpeed = 0.032;
                b.attackMaxCooldown = 55;
                // Add 4th rift
                b.rifts.push({ angle: Math.PI * 1.5, dist: 130, fireCooldown: 90, firePhase: 3 });
                explosion(b.x, b.y, '#7b2d8b', 18);
                floatText(b.x, b.y, 'RIFT DESTABILIZED', '#cc44ff');
                sfx('temporal_rift_destabilized');
            }

            // Rotate orbiting rifts
            for (const r of b.rifts) {
                r.angle += b.riftAngleSpeed;
                r.fireCooldown--;
                if (r.fireCooldown <= 0) {
                    r.fireCooldown = b.phase === 2 ? 60 : 90;
                    const rx = b.x + Math.cos(r.angle) * r.dist;
                    const ry = b.y + Math.sin(r.angle) * r.dist;
                    const ra = Math.atan2(t.y - ry, t.x - rx);
                    spawnProj(rx, ry, Math.cos(ra) * 4.0, Math.sin(ra) * 4.0, b.damage * 0.8, '#cc44ff', 8);
                    sfx('temporal_rift_portal_shot');
                    // Phase 2: also fire perpendicular
                    if (b.phase === 2) {
                        spawnProj(rx, ry, Math.cos(ra + Math.PI / 2) * 3.0, Math.sin(ra + Math.PI / 2) * 3.0, b.damage * 0.5, '#9933cc', 7);
                    }
                }
            }

            // Main body attack
            b.attackCooldown--;
            if (b.attackCooldown <= 0) {
                b.attackCooldown = b.attackMaxCooldown;
                burst(b.x, b.y, 8, 3.8, b.damage, '#7b2d8b', 9);
            }

            // Void pull
            b.pullCooldown--;
            if (b.pullCooldown <= 0) {
                b.pullCooldown = b.phase === 2 ? 200 : 280;
                floatText(b.x, b.y, 'VOID PULL', '#cc44ff');
                sfx('temporal_rift_void_pull');
                // Pull player toward boss
                const allTargets = [player];
                if (typeof player2 !== 'undefined' && player2 && !player2.isDead) allTargets.push(player2);
                for (const p of allTargets) {
                    const pdx = b.x - p.x, pdy = b.y - p.y;
                    const pd = Math.hypot(pdx, pdy) || 1;
                    const pullStrength = Math.min(pd * 0.4, 180);
                    p.x += (pdx / pd) * pullStrength;
                    p.y += (pdy / pd) * pullStrength;
                }
            }

            // Reality shockwave — expanding ring
            b.shockCooldown--;
            if (b.shockCooldown <= 0) {
                b.shockCooldown = b.phase === 2 ? 260 : 400;
                if (!b._shockwaves) b._shockwaves = [];
                b._shockwaves.push({ x: b.x, y: b.y, r: b.radius, maxR: 350, life: 50 });
                explosion(b.x, b.y, '#7b2d8b', 10);
                sfx('temporal_rift_shockwave');
            }

            // Shockwave damage check
            if (b._shockwaves) {
                for (let i = b._shockwaves.length - 1; i >= 0; i--) {
                    const sw = b._shockwaves[i];
                    sw.r += (sw.maxR - sw.r) * 0.15;
                    sw.life--;
                    // Damage check
                    const allP = [player];
                    if (typeof player2 !== 'undefined' && player2 && !player2.isDead) allP.push(player2);
                    for (const p of allP) {
                        const pd = Math.hypot(p.x - sw.x, p.y - sw.y);
                        if (Math.abs(pd - sw.r) < 25) p.takeDamage && p.takeDamage(b.damage * 0.6);
                    }
                    if (sw.life <= 0) b._shockwaves.splice(i, 1);
                }
            }
        },

        draw(ctx, b) {
            ctx.save();

            // Shockwave rings
            if (b._shockwaves) {
                for (const sw of b._shockwaves) {
                    ctx.globalAlpha = sw.life / 50 * 0.6;
                    ctx.strokeStyle = '#cc44ff';
                    ctx.lineWidth = 4;
                    ctx.beginPath();
                    ctx.arc(sw.x, sw.y, sw.r, 0, Math.PI * 2);
                    ctx.stroke();
                }
                ctx.globalAlpha = 1;
            }

            // Orbiting rift portals
            for (const r of b.rifts) {
                const rx = b.x + Math.cos(r.angle) * r.dist;
                const ry = b.y + Math.sin(r.angle) * r.dist;
                const rg = ctx.createRadialGradient(rx, ry, 4, rx, ry, 20);
                rg.addColorStop(0, '#ffffff');
                rg.addColorStop(0.4, '#cc44ff');
                rg.addColorStop(1, 'rgba(123,45,139,0)');
                ctx.beginPath();
                ctx.ellipse(rx, ry, 20, 12, r.angle, 0, Math.PI * 2);
                ctx.fillStyle = rg;
                ctx.fill();
            }

            // Outer glow
            const grad = ctx.createRadialGradient(b.x, b.y, b.radius * 0.2, b.x, b.y, b.radius * 2.2);
            grad.addColorStop(0, 'rgba(204,68,255,0.4)');
            grad.addColorStop(1, 'rgba(123,45,139,0)');
            ctx.beginPath();
            ctx.arc(b.x, b.y, b.radius * 2.2, 0, Math.PI * 2);
            ctx.fillStyle = grad;
            ctx.fill();

            // Body (distorted void)
            ctx.beginPath();
            ctx.arc(b.x, b.y, b.radius, 0, Math.PI * 2);
            ctx.fillStyle = b.phase === 2 ? '#4a1060' : '#2d1040';
            ctx.fill();
            ctx.strokeStyle = '#cc44ff';
            ctx.lineWidth = 3;
            ctx.stroke();

            // Inner vortex lines
            ctx.strokeStyle = 'rgba(204,68,255,0.5)';
            ctx.lineWidth = 1.5;
            for (let i = 0; i < 5; i++) {
                const ia = (Date.now() * 0.001 + i * Math.PI * 0.4) % (Math.PI * 2);
                ctx.beginPath();
                ctx.arc(b.x, b.y, b.radius * (0.3 + i * 0.14), ia, ia + Math.PI);
                ctx.stroke();
            }

            // HP bar handled by game HUD (boss-hp-container)
            ctx.restore();
        }
    };

    // ─────────────────────────────────────────────────────────────────
    // ETERNAL COLLAPSE — Finale Superboss
    // ─────────────────────────────────────────────────────────────────
    window._DLC_BOSS_REGISTRY['ETERNAL_COLLAPSE'] = {
        init(b) {
            b.radius = 78;
            b.color = '#000010';
            b.phase = 1;
            b.speed = 1.0;
            b.maxHp = Math.round(b.maxHp * 2.0);   // Double HP for finale
            b.hp = b.maxHp;
            b.damage = Math.round(b.damage * 1.3);
            b.attackCooldown = 70;
            b.attackMaxCooldown = 70;
            b._absorbing = false;
            b._absorbedCount = 0;
            b._absorbTimer = 0;
            b._collapseReady = false;
            b._collapseTimer = 0;
            b._phaseMarkers = [0.75, 0.5, 0.25];
            b._phases = [false, false, false];
            b._orbitAngle = 0;
            b._shards = [];   // visual debris shards
            // Initialize debris shards
            for (let i = 0; i < 12; i++) {
                b._shards.push({
                    angle: (Math.PI * 2 / 12) * i,
                    dist: b.radius + 20 + Math.random() * 30,
                    size: 6 + Math.random() * 8,
                    speed: 0.008 + Math.random() * 0.012
                });
            }
            applyHuntElite(b);
        },

        update(b, pl, ar) {
            const t = getTarget(b);
            const dx = t.x - b.x, dy = t.y - b.y;
            const dist = Math.hypot(dx, dy) || 1;

            // Phase checks
            for (let i = 0; i < b._phaseMarkers.length; i++) {
                if (!b._phases[i] && b.hp <= b.maxHp * b._phaseMarkers[i]) {
                    b._phases[i] = true;
                    b.phase = i + 2;
                    b.speed = Math.min(3.0, b.speed + 0.6);
                    b.attackMaxCooldown = Math.max(30, b.attackMaxCooldown - 12);
                    explosion(b.x, b.y, '#4444ff', 22);
                    floatText(b.x, b.y, ['TEMPORAL SURGE', 'REALITY FRACTURE', 'COLLAPSE IMMINENT'][i], '#8888ff');
                    sfx('eternal_collapse_phase_surge');
                    // Add more shards
                    for (let s = 0; s < 4; s++) {
                        b._shards.push({
                            angle: Math.random() * Math.PI * 2,
                            dist: b.radius + 15 + Math.random() * 50,
                            size: 5 + Math.random() * 10,
                            speed: 0.012 + Math.random() * 0.018
                        });
                    }
                }
            }

            // Movement
            if (b.phase >= 3) {
                // Aggressive chase
                b.x += (dx / dist) * b.speed;
                b.y += (dy / dist) * b.speed;
            } else {
                // Slow patrol
                b.x += (dx / dist) * b.speed * 0.7;
                b.y += (dy / dist) * b.speed * 0.7;
            }

            // Orbit shards
            b._orbitAngle += 0.015;
            for (const shard of b._shards) {
                shard.angle += shard.speed;
            }

            // Projectile absorption — absorb nearby projectiles in phase 2+
            if (b.phase >= 2) {
                if (!b._absorbing) {
                    b._absorbTimer--;
                    if (b._absorbTimer <= 0) {
                        b._absorbing = true;
                        b._absorbedCount = 0;
                        b._absorbActiveFor = 60;
                        floatText(b.x, b.y, 'ABSORBING...', '#4444ff');
                        sfx('eternal_collapse_absorb');
                    }
                } else {
                    b._absorbActiveFor--;
                    // Remove player projectiles near boss, count absorbed
                    for (let i = projectiles.length - 1; i >= 0; i--) {
                        const p = projectiles[i];
                        if (p.isPlayerShot) {
                            const d = Math.hypot(p.x - b.x, p.y - b.y);
                            if (d < b.radius * 1.8) {
                                projectiles.splice(i, 1);
                                b._absorbedCount++;
                            }
                        }
                    }
                    if (b._absorbActiveFor <= 0) {
                        b._absorbing = false;
                        b._absorbTimer = 180;
                        // Release absorbed energy
                        if (b._absorbedCount > 0) {
                            const count = Math.min(b._absorbedCount * 2, 20);
                            burst(b.x, b.y, count, 4.0, b.damage * 0.9, '#4444ff', 9);
                            floatText(b.x, b.y, 'ENERGY RELEASED', '#8888ff');
                            sfx('eternal_collapse_release');
                        }
                    }
                }
            } else {
                b._absorbTimer = 180;
            }

            // Main attack
            b.attackCooldown--;
            if (b.attackCooldown <= 0) {
                b.attackCooldown = b.attackMaxCooldown;
                sfx('eternal_collapse_spiral');
                const a = Math.atan2(dy, dx);
                // Spiral shot
                const count = b.phase >= 3 ? 6 : (b.phase >= 2 ? 4 : 3);
                for (let i = 0; i < count; i++) {
                    const sa = a + (Math.PI * 2 / count) * i + b._orbitAngle;
                    spawnProj(b.x, b.y, Math.cos(sa) * 4.2, Math.sin(sa) * 4.2, b.damage, '#000080', 10);
                }
                // Phase 4: extra aimed barrage
                if (b.phase >= 4) {
                    for (let i = -2; i <= 2; i++) {
                        spawnProj(b.x, b.y,
                            Math.cos(a + i * 0.12) * 5.5,
                            Math.sin(a + i * 0.12) * 5.5,
                            b.damage * 1.3, '#0000cc', 11);
                    }
                }
            }

            // Mega collapse attack — phase 3+, every 500 frames
            if (b.phase >= 3) {
                b._collapseTimer--;
                if (b._collapseTimer <= 0) {
                    b._collapseTimer = 500;
                    explosion(b.x, b.y, '#0000ff', 30);
                    floatText(b.x, b.y, 'ETERNAL COLLAPSE', '#8888ff');
                    sfx('eternal_collapse_mega_burst');
                    // Ring of projectiles outward
                    burst(b.x, b.y, 24, 5.0, b.damage * 1.5, '#0000aa', 12);
                    // Then a second ring delayed — mark for next frame
                    b._pendingCollapse = 30;
                }
                if (b._pendingCollapse > 0) {
                    b._pendingCollapse--;
                    if (b._pendingCollapse === 0) {
                        burst(b.x, b.y, 16, 3.5, b.damage, '#4444ff', 9);
                    }
                }
            }
        },

        draw(ctx, b) {
            ctx.save();

            // Debris shards orbiting
            for (const shard of b._shards) {
                const sx = b.x + Math.cos(shard.angle) * shard.dist;
                const sy = b.y + Math.sin(shard.angle) * shard.dist;
                ctx.beginPath();
                ctx.rect(sx - shard.size / 2, sy - shard.size / 2, shard.size, shard.size);
                ctx.fillStyle = `rgba(${40 + b.phase * 30}, ${40 + b.phase * 20}, ${150 + b.phase * 20}, 0.7)`;
                ctx.fill();
            }

            // Pulsing outer aura
            const pulse = 0.6 + 0.4 * Math.sin(Date.now() * 0.003);
            const grad = ctx.createRadialGradient(b.x, b.y, b.radius * 0.5, b.x, b.y, b.radius * 2.5);
            grad.addColorStop(0, `rgba(0,0,180,${0.5 * pulse})`);
            grad.addColorStop(1, 'rgba(0,0,20,0)');
            ctx.beginPath();
            ctx.arc(b.x, b.y, b.radius * 2.5, 0, Math.PI * 2);
            ctx.fillStyle = grad;
            ctx.fill();

            // Core body — dark void
            ctx.beginPath();
            ctx.arc(b.x, b.y, b.radius, 0, Math.PI * 2);
            const bodyGrad = ctx.createRadialGradient(b.x - b.radius * 0.3, b.y - b.radius * 0.3, 5, b.x, b.y, b.radius);
            bodyGrad.addColorStop(0, `hsl(240, 80%, ${10 + b.phase * 5}%)`);
            bodyGrad.addColorStop(1, '#000005');
            ctx.fillStyle = bodyGrad;
            ctx.fill();
            ctx.strokeStyle = b._absorbing ? '#4444ff' : '#0000cc';
            ctx.lineWidth = b._absorbing ? 5 : 3;
            ctx.stroke();

            // Absorption ring
            if (b._absorbing) {
                ctx.globalAlpha = 0.5;
                ctx.strokeStyle = '#8888ff';
                ctx.lineWidth = 3;
                ctx.setLineDash([8, 4]);
                ctx.beginPath();
                ctx.arc(b.x, b.y, b.radius * 1.8, 0, Math.PI * 2);
                ctx.stroke();
                ctx.setLineDash([]);
                ctx.globalAlpha = 1;
            }

            // Center star symbol
            ctx.strokeStyle = 'rgba(100,100,255,0.8)';
            ctx.lineWidth = 2;
            for (let i = 0; i < 4; i++) {
                const a = b._orbitAngle + (Math.PI / 4) * i;
                ctx.beginPath();
                ctx.moveTo(b.x + Math.cos(a) * 8, b.y + Math.sin(a) * 8);
                ctx.lineTo(b.x + Math.cos(a) * (b.radius - 12), b.y + Math.sin(a) * (b.radius - 12));
                ctx.stroke();
            }

            // HP bar handled by game HUD (boss-hp-container)
            ctx.restore();
        }
    };

    // ─────────────────────────────────────────────────────────────────
    // MASK GUARDIAN — The True Golden Mask
    // ─────────────────────────────────────────────────────────────────
    window._DLC_BOSS_REGISTRY['MASK_GUARDIAN'] = {
        init(b) {
            b.radius = 58;
            b.color = '#c8aa6e';
            b.phase = 1;
            b.speed = 1.4;
            b.attackCooldown = 75;
            b.attackMaxCooldown = 75;
            b._shieldTimer = 0;
            b._shieldDuration = 100;
            b._shieldCooldown = 240;
            b._shielded = false;
            b._chargeTimer = 0;
            b._chargeCooldown = 300;
            b._charging = false;
            b._chargeVx = 0;
            b._chargeVy = 0;
            b._chargeDist = 0;
            b._phase2Done = false;
            b._boltCooldown = 120;
            applyHuntElite(b);
        },

        update(b, pl, ar) {
            const t = getTarget(b);
            const dx = t.x - b.x, dy = t.y - b.y;
            const dist = Math.hypot(dx, dy) || 1;

            // Phase 2
            if (!b._phase2Done && b.hp <= b.maxHp * 0.55) {
                b._phase2Done = true;
                b.phase = 2;
                b.speed = 2.0;
                b.attackMaxCooldown = 50;
                b._shieldCooldown = 160;
                b._boltCooldown = 80;
                explosion(b.x, b.y, '#c8aa6e', 20);
                floatText(b.x, b.y, 'MASK UNLEASHED', '#ffd700');
                sfx('mask_guardian_unleashed');
            }

            // Shield logic — b.immune is checked by game.js Boss immunity path
            if (b._shielded) {
                b._shieldTimer--;
                b.immune = true;
                if (b._shieldTimer <= 0) {
                    b._shielded = false;
                    b.immune = false;
                    b._shieldCooldown = b.phase === 2 ? 160 : 240;
                    sfx('mask_guardian_shield_break');
                }
            } else {
                b._shieldCooldown--;
                if (b._shieldCooldown <= 0) {
                    b._shielded = true;
                    b.immune = true;
                    b._shieldTimer = b._shieldDuration;
                    floatText(b.x, b.y, 'SHIELD', '#ffd700');
                    explosion(b.x, b.y, '#c8aa6e', 8);
                    sfx('mask_guardian_shield_up');
                }
            }

            // Charge attack
            if (b._charging) {
                b.x += b._chargeVx;
                b.y += b._chargeVy;
                b._chargeDist -= Math.hypot(b._chargeVx, b._chargeVy);
                if (b._chargeDist <= 0) {
                    b._charging = false;
                    b._chargeCooldown = b.phase === 2 ? 200 : 300;
                    explosion(b.x, b.y, '#c8aa6e', 12);
                    burst(b.x, b.y, 8, 3.5, b.damage * 0.8, '#c8aa6e', 8);
                }
            } else {
                b._chargeCooldown--;
                if (b._chargeCooldown <= 0) {
                    b._charging = true;
                    const ca = Math.atan2(dy, dx);
                    const chargeSpeed = 9.0;
                    b._chargeVx = Math.cos(ca) * chargeSpeed;
                    b._chargeVy = Math.sin(ca) * chargeSpeed;
                    b._chargeDist = 350;
                    floatText(b.x, b.y, 'CHARGE!', '#ffd700');
                    sfx('mask_guardian_dash_charge');
                }
                // Normal movement
                b.x += (dx / dist) * b.speed;
                b.y += (dy / dist) * b.speed;
            }

            // Golden bolt streams
            b._boltCooldown--;
            if (b._boltCooldown <= 0) {
                b._boltCooldown = b.phase === 2 ? 80 : 120;
                const a = Math.atan2(dy, dx);
                const bolts = b.phase === 2 ? 5 : 3;
                for (let i = 0; i < bolts; i++) {
                    const ba = a + (i - Math.floor(bolts / 2)) * 0.18;
                    spawnProj(b.x, b.y, Math.cos(ba) * 5.0, Math.sin(ba) * 5.0, b.damage, '#c8aa6e', 9);
                }
            }

            // Main burst attack
            b.attackCooldown--;
            if (b.attackCooldown <= 0) {
                b.attackCooldown = b.attackMaxCooldown;
                burst(b.x, b.y, b.phase === 2 ? 12 : 8, 4.0, b.damage * 0.75, '#ffd700', 8);
            }
        },

        draw(ctx, b) {
            ctx.save();

            // Shield glow
            if (b._shielded) {
                const sg = ctx.createRadialGradient(b.x, b.y, b.radius, b.x, b.y, b.radius * 1.6);
                sg.addColorStop(0, 'rgba(255,215,0,0.5)');
                sg.addColorStop(1, 'rgba(255,215,0,0)');
                ctx.beginPath();
                ctx.arc(b.x, b.y, b.radius * 1.6, 0, Math.PI * 2);
                ctx.fillStyle = sg;
                ctx.fill();
                ctx.strokeStyle = '#ffd700';
                ctx.lineWidth = 4;
                ctx.setLineDash([6, 3]);
                ctx.beginPath();
                ctx.arc(b.x, b.y, b.radius * 1.3, 0, Math.PI * 2);
                ctx.stroke();
                ctx.setLineDash([]);
            }

            // Body
            ctx.beginPath();
            ctx.arc(b.x, b.y, b.radius, 0, Math.PI * 2);
            const bg = ctx.createRadialGradient(b.x - 15, b.y - 15, 5, b.x, b.y, b.radius);
            bg.addColorStop(0, '#e8c87e');
            bg.addColorStop(0.6, '#c8aa6e');
            bg.addColorStop(1, '#8a7040');
            ctx.fillStyle = bg;
            ctx.fill();
            ctx.strokeStyle = '#ffd700';
            ctx.lineWidth = 3;
            ctx.stroke();

            // Mask face
            ctx.strokeStyle = 'rgba(80,50,10,0.8)';
            ctx.lineWidth = 2.5;
            ctx.fillStyle = 'rgba(80,50,10,0.5)';
            // Eyes
            ctx.beginPath();
            ctx.ellipse(b.x - 16, b.y - 10, 8, 6, -0.2, 0, Math.PI * 2);
            ctx.fill();
            ctx.beginPath();
            ctx.ellipse(b.x + 16, b.y - 10, 8, 6, 0.2, 0, Math.PI * 2);
            ctx.fill();
            // Smile/grimace
            ctx.beginPath();
            ctx.arc(b.x, b.y + 8, 18, 0.2, Math.PI - 0.2);
            ctx.stroke();

            // HP bar handled by game HUD (boss-hp-container)
            ctx.restore();
        }
    };

    // Shield immunity — uses existing Boss.immune flag checked in game.js line 4656

    // ─────────────────────────────────────────────────────────────────
    // MAKUTA ECHO
    // ─────────────────────────────────────────────────────────────────
    window._DLC_BOSS_REGISTRY['MAKUTA_ECHO'] = {
        init(b) {
            b.radius = 58;
            b.color = '#1a0030';
            b.phase = 1;
            b.speed = 1.5;
            b.maxHp = Math.round(b.maxHp * 1.2);
            b.hp = b.maxHp;
            b.damage = Math.round(b.damage * 1.15);
            b.attackCooldown = 65;
            b.attackMaxCooldown = 65;
            b._echoes = []; // {x,y,life,maxLife,fireCooldown}
            b._echoCooldown = 300;
            b._voidNovaCooldown = 350;
            b._spiralAngle = 0;
            b._phase2Done = false;
            applyHuntElite(b);
        },

        update(b, pl, ar) {
            const t = getTarget(b);
            const dx = t.x - b.x, dy = t.y - b.y;
            const dist = Math.hypot(dx, dy) || 1;

            b.x += (dx / dist) * b.speed;
            b.y += (dy / dist) * b.speed;

            // Phase 2
            if (!b._phase2Done && b.hp <= b.maxHp * 0.5) {
                b._phase2Done = true;
                b.phase = 2;
                b.speed = 2.2;
                b.attackMaxCooldown = 45;
                b._echoCooldown = 200;
                b._voidNovaCooldown = 250;
                explosion(b.x, b.y, '#6600cc', 20);
                floatText(b.x, b.y, 'ECHO CONVERGENCE', '#cc00ff');
                sfx('makuta_echo_convergence');
            }

            // Main attack — void spirals
            b._spiralAngle += 0.05;
            b.attackCooldown--;
            if (b.attackCooldown <= 0) {
                b.attackCooldown = b.attackMaxCooldown;
                sfx('makuta_void_spiral');
                const spiralCount = b.phase === 2 ? 4 : 3;
                for (let i = 0; i < spiralCount; i++) {
                    const sa = b._spiralAngle + (Math.PI * 2 / spiralCount) * i;
                    spawnProj(b.x, b.y, Math.cos(sa) * 4.5, Math.sin(sa) * 4.5, b.damage, '#6600cc', 10);
                }
                // Aimed shot
                const a = Math.atan2(dy, dx);
                spawnProj(b.x, b.y, Math.cos(a) * 5.0, Math.sin(a) * 5.0, b.damage * 1.2, '#cc00ff', 11);
            }

            // Spawn echo copies
            b._echoCooldown--;
            if (b._echoCooldown <= 0) {
                b._echoCooldown = b.phase === 2 ? 200 : 300;
                const ea = Math.random() * Math.PI * 2;
                const edist = 180 + Math.random() * 80;
                b._echoes.push({
                    x: b.x + Math.cos(ea) * edist,
                    y: b.y + Math.sin(ea) * edist,
                    life: 220, maxLife: 220,
                    fireCooldown: 50 + Math.floor(Math.random() * 30)
                });
                floatText(b.x, b.y, 'ECHO', '#6600cc');
                sfx('makuta_echo_spawn');
            }

            // Update echoes
            for (let i = b._echoes.length - 1; i >= 0; i--) {
                const e = b._echoes[i];
                e.life--;
                e.fireCooldown--;
                if (e.fireCooldown <= 0) {
                    e.fireCooldown = 60;
                    const ea = Math.atan2(t.y - e.y, t.x - e.x);
                    spawnProj(e.x, e.y, Math.cos(ea) * 3.5, Math.sin(ea) * 3.5, b.damage * 0.5, '#6600cc', 7);
                }
                if (e.life <= 0) b._echoes.splice(i, 1);
            }

            // Void nova
            b._voidNovaCooldown--;
            if (b._voidNovaCooldown <= 0) {
                b._voidNovaCooldown = b.phase === 2 ? 250 : 350;
                burst(b.x, b.y, 20, 4.5, b.damage * 1.1, '#330066', 10);
                explosion(b.x, b.y, '#6600cc', 16);
                floatText(b.x, b.y, 'VOID NOVA', '#cc00ff');
                sfx('makuta_void_nova');
                // Also nova from all echoes
                for (const e of b._echoes) {
                    burst(e.x, e.y, 8, 3.5, b.damage * 0.6, '#330066', 8);
                }
            }
        },

        draw(ctx, b) {
            ctx.save();

            // Echo copies
            for (const e of b._echoes) {
                ctx.globalAlpha = (e.life / e.maxLife) * 0.55;
                ctx.beginPath();
                ctx.arc(e.x, e.y, b.radius * 0.55, 0, Math.PI * 2);
                ctx.fillStyle = '#330066';
                ctx.fill();
                ctx.strokeStyle = '#6600cc';
                ctx.lineWidth = 2;
                ctx.stroke();
                ctx.globalAlpha = 1;
            }

            // Dark aura
            const grad = ctx.createRadialGradient(b.x, b.y, b.radius * 0.3, b.x, b.y, b.radius * 2.0);
            grad.addColorStop(0, 'rgba(102,0,204,0.4)');
            grad.addColorStop(1, 'rgba(10,0,20,0)');
            ctx.beginPath();
            ctx.arc(b.x, b.y, b.radius * 2.0, 0, Math.PI * 2);
            ctx.fillStyle = grad;
            ctx.fill();

            // Body
            ctx.beginPath();
            ctx.arc(b.x, b.y, b.radius, 0, Math.PI * 2);
            const bg = ctx.createRadialGradient(b.x, b.y - 20, 8, b.x, b.y, b.radius);
            bg.addColorStop(0, '#2a0050');
            bg.addColorStop(1, '#050010');
            ctx.fillStyle = bg;
            ctx.fill();
            ctx.strokeStyle = '#6600cc';
            ctx.lineWidth = 3;
            ctx.stroke();

            // Makuta eye
            ctx.fillStyle = '#cc00ff';
            ctx.beginPath();
            ctx.ellipse(b.x, b.y - 5, 18, 10, 0, 0, Math.PI * 2);
            ctx.fill();
            ctx.fillStyle = '#000000';
            ctx.beginPath();
            ctx.ellipse(b.x, b.y - 5, 9, 8, 0, 0, Math.PI * 2);
            ctx.fill();
            ctx.fillStyle = '#ffffff';
            ctx.beginPath();
            ctx.arc(b.x - 4, b.y - 8, 3, 0, Math.PI * 2);
            ctx.fill();

            // Tendrils
            ctx.strokeStyle = 'rgba(102,0,204,0.6)';
            ctx.lineWidth = 2;
            for (let i = 0; i < 6; i++) {
                const ta = b._spiralAngle + (Math.PI / 3) * i;
                ctx.beginPath();
                ctx.moveTo(b.x + Math.cos(ta) * b.radius, b.y + Math.sin(ta) * b.radius);
                ctx.quadraticCurveTo(
                    b.x + Math.cos(ta + 0.4) * (b.radius * 1.5),
                    b.y + Math.sin(ta + 0.4) * (b.radius * 1.5),
                    b.x + Math.cos(ta + 0.8) * (b.radius + 35),
                    b.y + Math.sin(ta + 0.8) * (b.radius + 35)
                );
                ctx.stroke();
            }

            // HP bar handled by game HUD (boss-hp-container)
            ctx.restore();
        }
    };

    // ─────────────────────────────────────────────────────────────────
    // CHROME LEVIATHAN
    // ─────────────────────────────────────────────────────────────────
    window._DLC_BOSS_REGISTRY['CHROME_LEVIATHAN'] = {
        init(b) {
            b.radius = 85;
            b.color = '#8090a0';
            b.phase = 1;
            b.speed = 0.9;
            b.maxHp = Math.round(b.maxHp * 1.8);   // Tanky
            b.hp = b.maxHp;
            b.damage = Math.round(b.damage * 1.1);
            b.attackCooldown = 90;
            b.attackMaxCooldown = 90;
            b._laserAngle = 0;
            b._laserTimer = 0;
            b._laserCooldown = 300;
            b._laserActive = false;
            b._laserDuration = 80;
            b._stompCooldown = 200;
            b._stompRings = [];  // {x,y,r,maxR,life}
            b._phase2Done = false;
            b._segOffset = 0;  // visual wave animation
            applyHuntElite(b);
        },

        update(b, pl, ar) {
            const t = getTarget(b);
            const dx = t.x - b.x, dy = t.y - b.y;
            const dist = Math.hypot(dx, dy) || 1;

            b._segOffset += 0.04;

            // Phase 2
            if (!b._phase2Done && b.hp <= b.maxHp * 0.5) {
                b._phase2Done = true;
                b.phase = 2;
                b.speed = 1.4;
                b.attackMaxCooldown = 60;
                b._laserCooldown = 180;
                b._stompCooldown = 140;
                explosion(b.x, b.y, '#8090a0', 24);
                floatText(b.x, b.y, 'CHROME RAGE', '#c0d0e0');
                sfx('chrome_leviathan_rage');
            }

            // Movement — slow lumbering
            b.x += (dx / dist) * b.speed;
            b.y += (dy / dist) * b.speed;

            // Laser sweep
            b._laserCooldown--;
            if (b._laserCooldown <= 0 && !b._laserActive) {
                b._laserActive = true;
                b._laserTimer = b._laserDuration;
                b._laserAngle = Math.atan2(dy, dx) - 0.8;
                floatText(b.x, b.y, 'LASER SWEEP', '#c0d0e0');
                sfx('chrome_leviathan_laser');
            }
            if (b._laserActive) {
                b._laserTimer--;
                b._laserAngle += 0.022;
                // Fire laser projectiles along the beam
                if (b._laserTimer % 4 === 0) {
                    for (let i = 1; i <= 5; i++) {
                        const lx = b.x + Math.cos(b._laserAngle) * b.radius * i * 0.9;
                        const ly = b.y + Math.sin(b._laserAngle) * b.radius * i * 0.9;
                        // Damage check
                        const allP = [player];
                        if (typeof player2 !== 'undefined' && player2 && !player2.isDead) allP.push(player2);
                        for (const p of allP) {
                            if (Math.hypot(p.x - lx, p.y - ly) < 22) {
                                p.takeDamage && p.takeDamage(b.damage * 0.15);
                            }
                        }
                    }
                }
                if (b._laserTimer <= 0) {
                    b._laserActive = false;
                    b._laserCooldown = b.phase === 2 ? 180 : 300;
                }
            }

            // Stomp shockwave
            b._stompCooldown--;
            if (b._stompCooldown <= 0) {
                b._stompCooldown = b.phase === 2 ? 140 : 200;
                for (let r = 1; r <= 3; r++) {
                    b._stompRings.push({ x: b.x, y: b.y, r: b.radius, maxR: 180 + r * 80, life: 40 + r * 10 });
                }
                explosion(b.x, b.y, '#8090a0', 10);
                sfx('chrome_leviathan_stomp');
            }

            // Update stomp rings
            for (let i = b._stompRings.length - 1; i >= 0; i--) {
                const ring = b._stompRings[i];
                ring.r += (ring.maxR - ring.r) * 0.2;
                ring.life--;
                // Damage
                const allP = [player];
                if (typeof player2 !== 'undefined' && player2 && !player2.isDead) allP.push(player2);
                for (const p of allP) {
                    const pd = Math.hypot(p.x - ring.x, p.y - ring.y);
                    if (Math.abs(pd - ring.r) < 28) p.takeDamage && p.takeDamage(b.damage * 0.55);
                }
                if (ring.life <= 0) b._stompRings.splice(i, 1);
            }

            // Main ranged attack
            b.attackCooldown--;
            if (b.attackCooldown <= 0) {
                b.attackCooldown = b.attackMaxCooldown;
                sfx('chrome_leviathan_spread');
                const a = Math.atan2(dy, dx);
                // 3-wide spread
                for (let s = -1; s <= 1; s++) {
                    spawnProj(b.x, b.y,
                        Math.cos(a + s * 0.2) * 4.0,
                        Math.sin(a + s * 0.2) * 4.0,
                        b.damage, '#c0d0e0', 12);
                }
                if (b.phase === 2) {
                    // Extra vertical shots
                    spawnProj(b.x, b.y, Math.cos(a + Math.PI / 2) * 3.5, Math.sin(a + Math.PI / 2) * 3.5, b.damage * 0.8, '#8090a0', 10);
                    spawnProj(b.x, b.y, Math.cos(a - Math.PI / 2) * 3.5, Math.sin(a - Math.PI / 2) * 3.5, b.damage * 0.8, '#8090a0', 10);
                }
            }
        },

        draw(ctx, b) {
            ctx.save();

            // Stomp rings
            for (const ring of b._stompRings) {
                ctx.globalAlpha = ring.life / 50 * 0.7;
                ctx.strokeStyle = '#c0d0e0';
                ctx.lineWidth = 5;
                ctx.beginPath();
                ctx.arc(ring.x, ring.y, ring.r, 0, Math.PI * 2);
                ctx.stroke();
            }
            ctx.globalAlpha = 1;

            // Laser beam
            if (b._laserActive) {
                ctx.save();
                const laserLen = 600;
                const lx2 = b.x + Math.cos(b._laserAngle) * laserLen;
                const ly2 = b.y + Math.sin(b._laserAngle) * laserLen;
                const laserGrad = ctx.createLinearGradient(b.x, b.y, lx2, ly2);
                laserGrad.addColorStop(0, 'rgba(255,255,255,0.9)');
                laserGrad.addColorStop(0.3, 'rgba(192,208,224,0.7)');
                laserGrad.addColorStop(1, 'rgba(192,208,224,0)');
                ctx.strokeStyle = laserGrad;
                ctx.lineWidth = 10;
                ctx.beginPath();
                ctx.moveTo(b.x, b.y);
                ctx.lineTo(lx2, ly2);
                ctx.stroke();
                ctx.lineWidth = 4;
                ctx.strokeStyle = 'rgba(255,255,255,0.8)';
                ctx.beginPath();
                ctx.moveTo(b.x, b.y);
                ctx.lineTo(lx2, ly2);
                ctx.stroke();
                ctx.restore();
            }

            // Outer chrome glow
            const grad = ctx.createRadialGradient(b.x, b.y, b.radius * 0.5, b.x, b.y, b.radius * 1.6);
            grad.addColorStop(0, 'rgba(192,208,224,0.3)');
            grad.addColorStop(1, 'rgba(128,144,160,0)');
            ctx.beginPath();
            ctx.arc(b.x, b.y, b.radius * 1.6, 0, Math.PI * 2);
            ctx.fillStyle = grad;
            ctx.fill();

            // Body — segmented leviathan look
            for (let i = 3; i >= 0; i--) {
                const segR = b.radius * (1 - i * 0.1);
                const waveOff = Math.sin(b._segOffset + i) * 8;
                ctx.beginPath();
                ctx.arc(b.x + waveOff, b.y, segR, 0, Math.PI * 2);
                const sg = ctx.createRadialGradient(b.x - 20 + waveOff, b.y - 20, 10, b.x + waveOff, b.y, segR);
                sg.addColorStop(0, `hsl(205, 20%, ${55 - i * 8}%)`);
                sg.addColorStop(1, `hsl(205, 20%, ${25 - i * 5}%)`);
                ctx.fillStyle = sg;
                ctx.fill();
                if (i === 0) {
                    ctx.strokeStyle = '#c0d0e0';
                    ctx.lineWidth = 3;
                    ctx.stroke();
                }
            }

            // Eyes — two bright chrome eyes
            for (let e = -1; e <= 1; e += 2) {
                ctx.fillStyle = b._laserActive ? '#ffffff' : '#c0d0e0';
                ctx.beginPath();
                ctx.ellipse(b.x + e * 24, b.y - 14, 10, 7, e * 0.15, 0, Math.PI * 2);
                ctx.fill();
                ctx.fillStyle = '#101820';
                ctx.beginPath();
                ctx.arc(b.x + e * 24, b.y - 14, 5, 0, Math.PI * 2);
                ctx.fill();
            }

            // HP bar handled by game HUD (boss-hp-container)
            ctx.restore();
        }
    };

    // ─────────────────────────────────────────────────────────────────
    // TEMPORAL WARDEN — Fast precision Formidable Foe
    // ─────────────────────────────────────────────────────────────────
    window._DLC_BOSS_REGISTRY['TEMPORAL_WARDEN'] = {
        init(b) {
            b.radius = 46;
            b.color = '#e8f0ff';
            b.phase = 1;
            b.speed = 2.8;
            b.attackCooldown = 40;
            b.attackMaxCooldown = 40;
            b._dashTimer = 0;
            b._dashCooldown = 150;
            b._dashing = false;
            b._dashVx = 0;
            b._dashVy = 0;
            b._dashDuration = 0;
            b._eraseTimers = [];  // Visual "erase grid" effect
            b._eraseCooldown = 250;
            b._phase2Done = false;
            b._bladeAngle = 0;
            applyHuntElite(b);
        },

        update(b, pl, ar) {
            const t = getTarget(b);
            const dx = t.x - b.x, dy = t.y - b.y;
            const dist = Math.hypot(dx, dy) || 1;

            b._bladeAngle += 0.06;

            // Phase 2
            if (!b._phase2Done && b.hp <= b.maxHp * 0.5) {
                b._phase2Done = true;
                b.phase = 2;
                b.speed = 4.0;
                b.attackMaxCooldown = 25;
                b._dashCooldown = 100;
                b._eraseCooldown = 160;
                explosion(b.x, b.y, '#e8f0ff', 16);
                floatText(b.x, b.y, 'WARDEN UNCHAINED', '#ffffff');
                sfx('temporal_warden_unchained');
            }

            // Dash attack
            if (b._dashing) {
                b.x += b._dashVx;
                b.y += b._dashVy;
                b._dashDuration--;
                if (b._dashDuration <= 0) {
                    b._dashing = false;
                    b._dashCooldown = b.phase === 2 ? 100 : 150;
                    // Burst at end of dash
                    burst(b.x, b.y, 6, 5.0, b.damage * 0.9, '#e8f0ff', 9);
                    sfx('temporal_warden_dash_burst');
                }
            } else {
                b._dashCooldown--;
                if (b._dashCooldown <= 0) {
                    b._dashing = true;
                    const da = Math.atan2(dy, dx);
                    const dashSpeed = 14.0;
                    b._dashVx = Math.cos(da) * dashSpeed;
                    b._dashVy = Math.sin(da) * dashSpeed;
                    b._dashDuration = b.phase === 2 ? 14 : 10;
                    floatText(b.x, b.y, 'DASH', '#e8f0ff');
                    sfx('temporal_warden_dash');
                } else {
                    b.x += (dx / dist) * b.speed;
                    b.y += (dy / dist) * b.speed;
                }
            }

            // Fast precision shots
            b.attackCooldown--;
            if (b.attackCooldown <= 0) {
                b.attackCooldown = b.attackMaxCooldown;
                const a = Math.atan2(dy, dx);
                spawnProj(b.x, b.y, Math.cos(a) * 7.0, Math.sin(a) * 7.0, b.damage * 1.1, '#e8f0ff', 10);
                if (b.phase === 2) {
                    spawnProj(b.x, b.y, Math.cos(a + 0.15) * 6.5, Math.sin(a + 0.15) * 6.5, b.damage, '#b0c0ff', 8);
                    spawnProj(b.x, b.y, Math.cos(a - 0.15) * 6.5, Math.sin(a - 0.15) * 6.5, b.damage, '#b0c0ff', 8);
                }
            }

            // Erase grid — temporal destabilization AoE
            b._eraseCooldown--;
            if (b._eraseCooldown <= 0) {
                b._eraseCooldown = b.phase === 2 ? 160 : 250;
                // Create grid of erase zones
                b._eraseTimers = [];
                const gridSize = 80;
                for (let gx = -2; gx <= 2; gx++) {
                    for (let gy = -2; gy <= 2; gy++) {
                        if (Math.abs(gx) + Math.abs(gy) < 4) {
                            b._eraseTimers.push({
                                x: b.x + gx * gridSize, y: b.y + gy * gridSize,
                                size: gridSize * 0.8, life: 60, maxLife: 60,
                                damageDealt: false
                            });
                        }
                    }
                }
                floatText(b.x, b.y, 'TEMPORAL ERASE', '#e8f0ff');
                sfx('temporal_warden_erase_grid');
            }

            // Process erase grid
            for (let i = b._eraseTimers.length - 1; i >= 0; i--) {
                const ez = b._eraseTimers[i];
                ez.life--;
                // Deal damage at midpoint
                if (!ez.damageDealt && ez.life <= ez.maxLife * 0.5) {
                    ez.damageDealt = true;
                    const allP = [player];
                    if (typeof player2 !== 'undefined' && player2 && !player2.isDead) allP.push(player2);
                    for (const p of allP) {
                        if (Math.hypot(p.x - ez.x, p.y - ez.y) < ez.size * 0.6) {
                            p.takeDamage && p.takeDamage(b.damage * 0.9);
                        }
                    }
                }
                if (ez.life <= 0) b._eraseTimers.splice(i, 1);
            }
        },

        draw(ctx, b) {
            ctx.save();

            // Erase grid zones
            for (const ez of b._eraseTimers) {
                const alpha = ez.life > ez.maxLife * 0.5
                    ? (1 - ez.life / ez.maxLife) * 0.7
                    : (ez.life / ez.maxLife) * 1.4 * 0.7;
                ctx.globalAlpha = Math.max(0, Math.min(1, alpha));
                ctx.fillStyle = '#e8f0ff';
                ctx.fillRect(ez.x - ez.size / 2, ez.y - ez.size / 2, ez.size, ez.size);
                ctx.strokeStyle = '#ffffff';
                ctx.lineWidth = 1;
                ctx.strokeRect(ez.x - ez.size / 2, ez.y - ez.size / 2, ez.size, ez.size);
            }
            ctx.globalAlpha = 1;

            // Speed trail when dashing
            if (b._dashing) {
                ctx.globalAlpha = 0.35;
                ctx.fillStyle = '#b0c0ff';
                ctx.beginPath();
                ctx.arc(b.x - b._dashVx * 2, b.y - b._dashVy * 2, b.radius * 0.8, 0, Math.PI * 2);
                ctx.fill();
                ctx.beginPath();
                ctx.arc(b.x - b._dashVx * 4, b.y - b._dashVy * 4, b.radius * 0.5, 0, Math.PI * 2);
                ctx.fill();
                ctx.globalAlpha = 1;
            }

            // Body
            ctx.beginPath();
            ctx.arc(b.x, b.y, b.radius, 0, Math.PI * 2);
            const bg = ctx.createRadialGradient(b.x - 12, b.y - 12, 5, b.x, b.y, b.radius);
            bg.addColorStop(0, '#f4f8ff');
            bg.addColorStop(0.5, '#d0ddf0');
            bg.addColorStop(1, '#8090b0');
            ctx.fillStyle = bg;
            ctx.fill();
            ctx.strokeStyle = '#ffffff';
            ctx.lineWidth = 2.5;
            ctx.stroke();

            // Rotating blade arms
            ctx.strokeStyle = 'rgba(200,220,255,0.9)';
            ctx.lineWidth = 3;
            for (let i = 0; i < 4; i++) {
                const ba = b._bladeAngle + (Math.PI / 2) * i;
                ctx.beginPath();
                ctx.moveTo(b.x + Math.cos(ba) * (b.radius - 6), b.y + Math.sin(ba) * (b.radius - 6));
                ctx.lineTo(b.x + Math.cos(ba) * (b.radius + 22), b.y + Math.sin(ba) * (b.radius + 22));
                ctx.stroke();
                // Blade tip
                ctx.fillStyle = '#ffffff';
                ctx.beginPath();
                ctx.arc(b.x + Math.cos(ba) * (b.radius + 22), b.y + Math.sin(ba) * (b.radius + 22), 4, 0, Math.PI * 2);
                ctx.fill();
            }

            // Center cross symbol
            ctx.strokeStyle = 'rgba(100,140,220,0.8)';
            ctx.lineWidth = 2;
            ctx.beginPath();
            ctx.moveTo(b.x - 14, b.y); ctx.lineTo(b.x + 14, b.y);
            ctx.moveTo(b.x, b.y - 14); ctx.lineTo(b.x, b.y + 14);
            ctx.stroke();

            // HP bar handled by game HUD (boss-hp-container)
            ctx.restore();
        }
    };

    // ─────────────────────────────────────────────────────────────────
    // Shared HP bar helper (mirrors existing Boss.js style)
    // ─────────────────────────────────────────────────────────────────
    function _drawBossHpBar(ctx, b) {
        const barW = b.radius * 2.4;
        const barH = 9;
        const bx = b.x - barW / 2;
        const by = b.y - b.radius - 22;
        ctx.fillStyle = 'rgba(0,0,0,0.55)';
        ctx.fillRect(bx - 1, by - 1, barW + 2, barH + 2);
        const pct = Math.max(0, b.hp / b.maxHp);
        const hue = pct > 0.5 ? 120 * (pct - 0.5) * 2 : 0;
        ctx.fillStyle = `hsl(${hue}, 80%, 45%)`;
        ctx.fillRect(bx, by, barW * pct, barH);
        ctx.strokeStyle = 'rgba(255,255,255,0.3)';
        ctx.lineWidth = 1;
        ctx.strokeRect(bx, by, barW, barH);
        // Boss name
        ctx.fillStyle = 'rgba(255,255,255,0.85)';
        ctx.font = 'bold 11px monospace';
        ctx.textAlign = 'center';
        ctx.fillText(b.type.replace(/_/g, ' '), b.x, by - 5);
    }

    // ─────────────────────────────────────────────────────────────────
    // BOSS_THUNDER — The Thunder Titan (Formidable Foe)
    // ─────────────────────────────────────────────────────────────────
    window._DLC_BOSS_REGISTRY['BOSS_THUNDER'] = {
        init(b) {
            b.radius = 70;
            b.color = '#ffe040';
            b.phase = 1;
            b.speed = 1.8;
            b.maxHp = Math.round(b.maxHp * 1.5);
            b.hp = b.maxHp;
            b.damage = Math.round(b.damage * 1.25);
            b.attackCooldown = 55;
            b.attackMaxCooldown = 55;
            b._boltCooldown = 120;
            b._stormCooldown = 280;
            b._stormActive = false;
            b._stormTimer = 0;
            b._lightningArcs = [];  // visual arcs
            b._chargeAngle = 0;
            b._phase2Done = false;
            applyHuntElite(b);
        },

        update(b, pl, ar) {
            const t = getTarget(b);
            const dx = t.x - b.x, dy = t.y - b.y;
            const dist = Math.hypot(dx, dy) || 1;

            b._chargeAngle += 0.04;

            if (!b._phase2Done && b.hp <= b.maxHp * 0.5) {
                b._phase2Done = true;
                b.phase = 2;
                b.speed = 2.5;
                b.attackMaxCooldown = 35;
                b._boltCooldown = 80;
                b._stormCooldown = 180;
                explosion(b.x, b.y, '#ffe040', 22);
                floatText(b.x, b.y, 'TITAN FURY', '#ffe040');
                sfx('boss_thunder_titan_fury');
            }

            b.x += (dx / dist) * b.speed;
            b.y += (dy / dist) * b.speed;

            // Main lightning bolts
            b.attackCooldown--;
            if (b.attackCooldown <= 0) {
                b.attackCooldown = b.attackMaxCooldown;
                sfx('boss_thunder_lightning_volley');
                const a = Math.atan2(dy, dx);
                const count = b.phase === 2 ? 5 : 3;
                for (let i = 0; i < count; i++) {
                    const ba = a + (i - Math.floor(count / 2)) * 0.2;
                    spawnProj(b.x, b.y, Math.cos(ba) * 6.0, Math.sin(ba) * 6.0, b.damage, '#ffe040', 10);
                }
            }

            // Thunder bolt barrage
            b._boltCooldown--;
            if (b._boltCooldown <= 0) {
                b._boltCooldown = b.phase === 2 ? 80 : 120;
                sfx('boss_thunder_barrage');
                // Random lightning strikes near player
                const allP = [player];
                if (typeof player2 !== 'undefined' && player2 && !player2.isDead) allP.push(player2);
                for (const p of allP) {
                    for (let i = 0; i < 3; i++) {
                        const ox = (Math.random() - 0.5) * 200;
                        const oy = (Math.random() - 0.5) * 200;
                        b._lightningArcs.push({ x: p.x + ox, y: p.y + oy, life: 12, maxLife: 12 });
                        if (Math.hypot(ox, oy) < 60) p.takeDamage && p.takeDamage(b.damage * 0.6);
                    }
                }
            }

            // Lightning arc lifetime
            for (let i = b._lightningArcs.length - 1; i >= 0; i--) {
                b._lightningArcs[i].life--;
                if (b._lightningArcs[i].life <= 0) b._lightningArcs.splice(i, 1);
            }

            // Storm — burst of projectiles in all directions
            b._stormCooldown--;
            if (b._stormCooldown <= 0) {
                b._stormCooldown = b.phase === 2 ? 180 : 280;
                burst(b.x, b.y, b.phase === 2 ? 20 : 14, 5.0, b.damage * 0.9, '#ffe040', 10);
                explosion(b.x, b.y, '#ffe040', 14);
                floatText(b.x, b.y, 'THUNDERSTORM', '#ffe040');
                sfx('boss_thunder_storm_ring');
            }
        },

        draw(ctx, b) {
            ctx.save();

            // Lightning strike visuals
            for (const arc of b._lightningArcs) {
                ctx.globalAlpha = arc.life / arc.maxLife;
                ctx.strokeStyle = '#ffe040';
                ctx.lineWidth = 2;
                ctx.beginPath();
                const segments = 5;
                let lx = arc.x, ly = arc.y - 80;
                ctx.moveTo(lx, ly);
                for (let s = 0; s < segments; s++) {
                    lx += (Math.random() - 0.5) * 20;
                    ly += 80 / segments;
                    ctx.lineTo(lx, ly);
                }
                ctx.lineTo(arc.x, arc.y);
                ctx.stroke();
            }
            ctx.globalAlpha = 1;

            // Outer electric aura
            const pulse = 0.5 + 0.5 * Math.sin(b._chargeAngle * 3);
            const grad = ctx.createRadialGradient(b.x, b.y, b.radius * 0.4, b.x, b.y, b.radius * 1.8);
            grad.addColorStop(0, `rgba(255,220,0,${0.4 * pulse})`);
            grad.addColorStop(1, 'rgba(255,200,0,0)');
            ctx.beginPath();
            ctx.arc(b.x, b.y, b.radius * 1.8, 0, Math.PI * 2);
            ctx.fillStyle = grad;
            ctx.fill();

            // Body
            ctx.beginPath();
            ctx.arc(b.x, b.y, b.radius, 0, Math.PI * 2);
            const bg = ctx.createRadialGradient(b.x - 20, b.y - 20, 8, b.x, b.y, b.radius);
            bg.addColorStop(0, '#fff0a0');
            bg.addColorStop(0.5, '#ffe040');
            bg.addColorStop(1, '#c07000');
            ctx.fillStyle = bg;
            ctx.fill();
            ctx.strokeStyle = '#ffffff';
            ctx.lineWidth = 3;
            ctx.stroke();

            // Zigzag lightning symbol on body
            ctx.strokeStyle = 'rgba(100,60,0,0.7)';
            ctx.lineWidth = 3;
            ctx.beginPath();
            ctx.moveTo(b.x - 8, b.y - 24);
            ctx.lineTo(b.x + 4, b.y - 4);
            ctx.lineTo(b.x - 6, b.y - 4);
            ctx.lineTo(b.x + 8, b.y + 24);
            ctx.stroke();

            // HP bar handled by game HUD (boss-hp-container)
            ctx.restore();
        }
    };

    // ─────────────────────────────────────────────────────────────────
    // BOSS_SPIRIT — The Spirit Revenant (Formidable Foe)
    // ─────────────────────────────────────────────────────────────────
    window._DLC_BOSS_REGISTRY['BOSS_SPIRIT'] = {
        init(b) {
            b.radius = 54;
            b.color = '#a060e0';
            b.phase = 1;
            b.speed = 2.0;
            b.maxHp = Math.round(b.maxHp * 1.3);
            b.hp = b.maxHp;
            b.damage = Math.round(b.damage * 1.1);
            b.attackCooldown = 60;
            b.attackMaxCooldown = 60;
            b._chaosTimer = 0;
            b._chaosCooldown = 200;
            b._luckTimer = 0;
            b._luckCooldown = 140;
            b._orbAngle = 0;
            b._orbs = [];  // orbiting spirit orbs
            b._phase2Done = false;
            b._ghostAlpha = 0.8;
            b._ghostPulse = 0;
            // Spawn 3 spirit orbs
            for (let i = 0; i < 3; i++) {
                b._orbs.push({ angle: (Math.PI * 2 / 3) * i, dist: 100, hp: 80, maxHp: 80 });
            }
            applyHuntElite(b);
        },

        update(b, pl, ar) {
            const t = getTarget(b);
            const dx = t.x - b.x, dy = t.y - b.y;
            const dist = Math.hypot(dx, dy) || 1;

            b._orbAngle += 0.022;
            b._ghostPulse += 0.05;

            if (!b._phase2Done && b.hp <= b.maxHp * 0.55) {
                b._phase2Done = true;
                b.phase = 2;
                b.speed = 3.0;
                b.attackMaxCooldown = 40;
                b._chaosCooldown = 130;
                b._luckCooldown = 90;
                // Add 2 more orbs
                for (let i = 0; i < 2; i++) {
                    b._orbs.push({ angle: Math.random() * Math.PI * 2, dist: 100, hp: 80, maxHp: 80 });
                }
                explosion(b.x, b.y, '#a060e0', 18);
                floatText(b.x, b.y, 'CHAOS ASCENDANT', '#d080ff');
                sfx('boss_spirit_chaos_ascendant');
            }

            // Unpredictable movement — random jitter
            const jitter = b.phase === 2 ? 1.5 : 0.8;
            b.x += (dx / dist) * b.speed + (Math.random() - 0.5) * jitter * 4;
            b.y += (dy / dist) * b.speed + (Math.random() - 0.5) * jitter * 4;

            // Orbiting spirit orbs
            for (let i = b._orbs.length - 1; i >= 0; i--) {
                const orb = b._orbs[i];
                orb.angle += 0.025;
                const ox = b.x + Math.cos(orb.angle + b._orbAngle) * orb.dist;
                const oy = b.y + Math.sin(orb.angle + b._orbAngle) * orb.dist;
                orb._wx = ox; orb._wy = oy;
                // Orbs fire at player
                if (Math.random() < 0.008) {
                    const oa = Math.atan2(t.y - oy, t.x - ox);
                    spawnProj(ox, oy, Math.cos(oa) * 4.0, Math.sin(oa) * 4.0, b.damage * 0.55, '#d080ff', 7);
                    sfx('boss_spirit_orb_fire');
                }
                // Orbs can be damaged by player projectiles
                for (let pi = projectiles.length - 1; pi >= 0; pi--) {
                    const p = projectiles[pi];
                    if (p.isPlayerShot && Math.hypot(p.x - ox, p.y - oy) < 18) {
                        orb.hp -= p.damage || 10;
                        projectiles.splice(pi, 1);
                        if (orb.hp <= 0) {
                            explosion(ox, oy, '#a060e0', 6);
                            b._orbs.splice(i, 1);
                            break;
                        }
                    }
                }
            }

            // Main attack — chaotic spread
            b.attackCooldown--;
            if (b.attackCooldown <= 0) {
                b.attackCooldown = b.attackMaxCooldown;
                const a = Math.atan2(dy, dx);
                const spread = b.phase === 2 ? 0.5 : 0.35;
                const count = b.phase === 2 ? 6 : 4;
                for (let i = 0; i < count; i++) {
                    const ba = a + (Math.random() - 0.5) * spread * 2;
                    spawnProj(b.x, b.y, Math.cos(ba) * (4.5 + Math.random()), Math.sin(ba) * (4.5 + Math.random()), b.damage, '#a060e0', 9);
                }
            }

            // Luck cascade — random chaos burst
            b._luckCooldown--;
            if (b._luckCooldown <= 0) {
                b._luckCooldown = b.phase === 2 ? 90 : 140;
                sfx('boss_spirit_luck_cascade');
                // Random number of projectiles in random directions
                const n = 5 + Math.floor(Math.random() * 10);
                burst(b.x, b.y, n, 3.5 + Math.random() * 2, b.damage * 0.7, '#d080ff', 8);
            }

            // Chaos nova
            b._chaosCooldown--;
            if (b._chaosCooldown <= 0) {
                b._chaosCooldown = b.phase === 2 ? 130 : 200;
                burst(b.x, b.y, 18, 4.5, b.damage * 1.0, '#a060e0', 10);
                explosion(b.x, b.y, '#d080ff', 14);
                floatText(b.x, b.y, 'CHAOS NOVA', '#d080ff');
                sfx('boss_spirit_chaos_nova');
            }
        },

        draw(ctx, b) {
            ctx.save();

            // Spirit orbs
            for (const orb of b._orbs) {
                if (!orb._wx) continue;
                const orbPulse = 0.7 + 0.3 * Math.sin(orb.angle * 3 + b._ghostPulse);
                ctx.globalAlpha = orbPulse;
                const og = ctx.createRadialGradient(orb._wx, orb._wy, 4, orb._wx, orb._wy, 18);
                og.addColorStop(0, '#ffffff');
                og.addColorStop(0.4, '#d080ff');
                og.addColorStop(1, 'rgba(160,96,224,0)');
                ctx.beginPath();
                ctx.arc(orb._wx, orb._wy, 18, 0, Math.PI * 2);
                ctx.fillStyle = og;
                ctx.fill();
                // Orb HP bar
                if (orb.hp < orb.maxHp) {
                    ctx.globalAlpha = 0.8;
                    ctx.fillStyle = '#333';
                    ctx.fillRect(orb._wx - 15, orb._wy - 24, 30, 4);
                    ctx.fillStyle = '#a060e0';
                    ctx.fillRect(orb._wx - 15, orb._wy - 24, 30 * (orb.hp / orb.maxHp), 4);
                }
                ctx.globalAlpha = 1;
            }

            // Ghost trail (phase 2)
            if (b.phase === 2) {
                ctx.globalAlpha = 0.2;
                ctx.fillStyle = '#a060e0';
                ctx.beginPath();
                ctx.arc(b.x + Math.sin(b._ghostPulse) * 12, b.y + Math.cos(b._ghostPulse * 0.7) * 8, b.radius * 0.7, 0, Math.PI * 2);
                ctx.fill();
                ctx.globalAlpha = 1;
            }

            // Outer spirit aura
            const gPulse = 0.5 + 0.5 * Math.sin(b._ghostPulse);
            const grad = ctx.createRadialGradient(b.x, b.y, b.radius * 0.3, b.x, b.y, b.radius * 2.0);
            grad.addColorStop(0, `rgba(208,128,255,${0.35 * gPulse})`);
            grad.addColorStop(1, 'rgba(160,96,224,0)');
            ctx.beginPath();
            ctx.arc(b.x, b.y, b.radius * 2.0, 0, Math.PI * 2);
            ctx.fillStyle = grad;
            ctx.fill();

            // Body
            ctx.globalAlpha = 0.75 + 0.25 * Math.sin(b._ghostPulse * 2);
            ctx.beginPath();
            ctx.arc(b.x, b.y, b.radius, 0, Math.PI * 2);
            const bg = ctx.createRadialGradient(b.x - 15, b.y - 15, 6, b.x, b.y, b.radius);
            bg.addColorStop(0, '#d0a0ff');
            bg.addColorStop(0.5, '#a060e0');
            bg.addColorStop(1, '#502070');
            ctx.fillStyle = bg;
            ctx.fill();
            ctx.strokeStyle = '#d080ff';
            ctx.lineWidth = 2.5;
            ctx.stroke();
            ctx.globalAlpha = 1;

            // Ghostly face
            ctx.fillStyle = 'rgba(255,255,255,0.7)';
            ctx.beginPath();
            ctx.arc(b.x - 14, b.y - 8, 7, 0, Math.PI * 2);
            ctx.arc(b.x + 14, b.y - 8, 7, 0, Math.PI * 2);
            ctx.fill();
            ctx.fillStyle = 'rgba(50,0,80,0.8)';
            ctx.beginPath();
            ctx.arc(b.x - 14, b.y - 8, 4, 0, Math.PI * 2);
            ctx.arc(b.x + 14, b.y - 8, 4, 0, Math.PI * 2);
            ctx.fill();
            // Wavy mouth
            ctx.strokeStyle = 'rgba(255,255,255,0.6)';
            ctx.lineWidth = 2;
            ctx.beginPath();
            ctx.moveTo(b.x - 14, b.y + 10);
            for (let wx = -14; wx <= 14; wx += 4) {
                ctx.lineTo(b.x + wx, b.y + 10 + Math.sin(wx * 0.4 + b._ghostPulse) * 4);
            }
            ctx.stroke();

            // HP bar handled by game HUD (boss-hp-container)
            ctx.restore();
        }
    };
})();
