// Echos of Eternity — Time Hero Logic  (Phase 2)
//
// Core resources:
//   chronoEnergy    0-100  fills via combat; powers double-shot at 70+
//   timelineBurden  0-100  grows with Fast Forward choices
//   fractureLevel   0-5    derived: Math.floor(burden/20) — drives chaos
//
// Abilities:
//   Shoot   — Temporal Bolt: ranged attack, builds chrono energy; double-shot at 70+ CE
//   Melee   — Chrono Strike: AoE slow pulse, slows enemies 75% for 1.5s
//   Special — Timeline Fracture: spawns shadow enemies + slows real ones + +30% dmg boost
//   Passive — Temporal Echoes: phantom copies auto-fire at nearby enemies
//   Ultimate— Eternal Paradox: all fracture shadows explode, reset burden, massive power surge
//
// Level-up replaces standard cards:
//   Fast Forward — +8% all stats but +15 burden (may raise fracture level → more shadows)
//   Reverse      — −30 burden + heal + dissolve excess shadows (weakens but calms chaos)

class TimeHero {

    // ─── Init ────────────────────────────────────────────────────────────────
    static init(player) {
        // Core resources
        player.chronoEnergy = 0;   // 0-100
        player.timelineBurden = 0;   // 0-100

        // Passive echo system
        player.echoTimer = 180;
        player.echoMaxTimer = 260;
        player.activeEchoes = [];

        // Fracture shadow system  (Phase 2)
        player.fractureShadows = [];
        player._fractureShadowTimer = 400;  // first shadow arrives after ~6s at level 1
        player._fractureBoostTimer = 0;    // remaining frames of fracture damage boost
        player._fractureBoostActive = false;

        // Eternal Paradox (Ultimate)
        player.paradoxActive = false;
        player.paradoxTimer = 0;
        player._paradoxBackup = null;  // { damageMultiplier, speedMultiplier }

        // Override base stats
        player.stats.speed = 4.2;
        player.stats.rangeCd = 28;
        player.stats.meleeCd = 90;

        // Attach hooks
        player.customUpdate = (dx, dy) => TimeHero.update(player, dx, dy);
        player.customDraw = (ctx) => TimeHero.draw(player, ctx);
        player.customSpecial = () => TimeHero.useSpecial(player);
        player.melee = () => TimeHero.melee(player);
        player.shoot = () => TimeHero.shoot(player);
        player.getAIInput = (p, c, t) => TimeHero.getAIInput(p, c, t);

        // Special UI
        player.specialName = "TIMELINE FRACTURE";
        player.specialMaxCooldown = 1500;  // 25 s
        if (!player.isCPU) {
            const iconEl = document.getElementById('special-icon');
            if (iconEl) iconEl.innerText = "⌛";
        }

        // Altar synergies
        const active = (saveData.altar && saveData.altar.active) ? saveData.altar.active : [];
        const has = id => active.includes(id);
        if (has('t1')) player.stats.chronoGainMult = (player.stats.chronoGainMult || 1) + 0.20;
        if (has('t2')) player.echoTimer = 0;   // first echo spawns immediately
        if (has('t3')) player._shadowExplode = true;  // shadows AoE on death

        // Convergence mutations
        player._mutCt1 = has('ct1');  // Delayed Lightning: bolts trigger chain lightning after 2s
        player._mutCt2 = has('ct2');  // Time Dilation: Chrono Strike creates gravity well
        player._mutCt3 = has('ct3');  // Burning Moment: slowed enemies take fire DOT
        player._mutCt4 = has('ct4');  // Frozen Timeline: Chrono Strike freezes instead of slowing
        player._mutCt5 = has('ct5');  // Void Echo: echo bolts deal bonus void damage
        player._mutCt6 = has('ct6');  // Stone Moment: Chrono Strike also briefly freezes (roots)
        player._mutCt7 = has('ct7');  // Temporal Gust: echo bolts slower but double range
        if (player._mutCt1) player._delayedLightnings = [];
        if (player._mutCt2) player._gravWells = [];
    }

    // ─── Update ──────────────────────────────────────────────────────────────
    static update(player, dx, dy) {
        const fl = Math.floor((player.timelineBurden || 0) / 20);  // fracture level 0-5

        // 1. Passive echo spawn
        player.echoTimer--;
        if (player.echoTimer <= 0) {
            const maxEchoes = 2 + Math.floor(player.stats.echoCount || 0);
            if (player.activeEchoes.length < maxEchoes) TimeHero._spawnEcho(player);
            player.echoTimer = player.echoMaxTimer;
        }

        // 2. Update active echoes
        const echoFireDmg = player.stats.rangeDmg * player.damageMultiplier * 0.35;
        const eSpd = (player.stats.projectileSpeed || 11) * 0.75;
        player.activeEchoes = player.activeEchoes.filter(e => {
            e.life--;
            e.fireCd--;
            if (e.fireCd <= 0 && typeof enemies !== 'undefined' && enemies.length > 0) {
                let nearest = null, bestDist = 320;
                for (const en of enemies) {
                    const d = Math.hypot(en.x - e.x, en.y - e.y);
                    if (d < bestDist) { nearest = en; bestDist = d; }
                }
                if (nearest && typeof Projectile !== 'undefined') {
                    const a = Math.atan2(nearest.y - e.y, nearest.x - e.x);
                    // ct7 Temporal Gust: echo moves at half speed (double range)
                    const projSpd = player._mutCt7 ? eSpd * 0.5 : eSpd;
                    // ct5 Void Echo: bonus damage + purple void color
                    const projDmg = player._mutCt5 ? echoFireDmg * 1.4 : echoFireDmg;
                    const projColor = player._mutCt5 ? '#9b59b6' : '#c8aa6e';
                    const echoProj = new Projectile(
                        e.x, e.y,
                        { x: Math.cos(a) * projSpd, y: Math.sin(a) * projSpd },
                        projDmg, projColor, 5, 'player', 0, false
                    );
                    // ct1 Delayed Lightning: schedule chain lightning at hit position
                    if (player._mutCt1) {
                        echoProj.onHit = (enemy) => {
                            player._delayedLightnings = player._delayedLightnings || [];
                            player._delayedLightnings.push({ x: enemy.x, y: enemy.y, timer: 120 });
                        };
                    }
                    projectiles.push(echoProj);
                    if (typeof saveData !== 'undefined') {
                        saveData.global = saveData.global || {};
                        saveData.global.echo_shots = (saveData.global.echo_shots || 0) + 1;
                    }
                }
                // ct7 Temporal Gust: echo fires less often (trades rate for range)
                e.fireCd = player._mutCt7 ? 150 : 75;
            }
            return e.life > 0;
        });

        // 3. Auto-spawn fracture shadows based on fracture level
        if (fl > 0 && typeof enemies !== 'undefined' && enemies.length > 0) {
            player._fractureShadowTimer--;
            if (player._fractureShadowTimer <= 0) {
                const interval = Math.max(120, 550 - fl * 85); // level 1→465f … level 5→125f
                player._fractureShadowTimer = interval;
                const maxShadows = 2 + fl;
                if (player.fractureShadows.length < maxShadows) {
                    TimeHero._spawnFractureShadow(player);
                }
            }
        }

        // 4. Update fracture shadows
        const shadowFireDmg = 8 + fl * 7;
        player.fractureShadows = player.fractureShadows.filter(shadow => {
            // Move toward player
            const ang = Math.atan2(player.y - shadow.y, player.x - shadow.x);
            shadow.x += Math.cos(ang) * shadow.speed;
            shadow.y += Math.sin(ang) * shadow.speed;
            shadow.life--;
            if (shadow.hitCd > 0) shadow.hitCd--;

            // Projectile hits (player projectiles damage shadows)
            if (typeof projectiles !== 'undefined') {
                for (const p of projectiles) {
                    if (p.team !== 'player') continue;
                    if (Math.hypot(p.x - shadow.x, p.y - shadow.y) < shadow.radius + (p.radius || 8)) {
                        shadow.hp -= p.damage;
                        break; // one projectile hit per shadow per frame
                    }
                }
            }

            // Melee hits shadows too
            if (player.meleeCooldown === player.stats.meleeCd) {
                if (Math.hypot(player.x - shadow.x, player.y - shadow.y) < (player.meleeRadius || 120) + shadow.radius) {
                    shadow.hp -= player.stats.meleeDmg * player.damageMultiplier * 0.5;
                }
            }

            // Player collision — deal damage
            if (shadow.hitCd <= 0 &&
                Math.hypot(player.x - shadow.x, player.y - shadow.y) < player.radius + shadow.radius) {
                const rawDmg = shadow.damage * (1 - (player.damageReduction || 0));
                if (typeof player.takeDamage === 'function') player.takeDamage(rawDmg);
                else player.hp = Math.max(0, player.hp - rawDmg);
                if (typeof floatingTexts !== 'undefined' && typeof FloatingText !== 'undefined')
                    floatingTexts.push(new FloatingText(player.x, player.y - 25, Math.floor(rawDmg), '#c8aa6e', 18));
                shadow.hitCd = 90;
            }

            // Death
            if (shadow.hp <= 0 || shadow.life <= 0) {
                TimeHero._killShadow(player, shadow);
                return false;
            }
            return true;
        });

        // 5. Fracture damage-boost timer
        if (player._fractureBoostActive && player._fractureBoostTimer > 0) {
            player._fractureBoostTimer--;
            if (player._fractureBoostTimer <= 0) {
                player.damageMultiplier /= 1.3;
                player._fractureBoostActive = false;
            }
        }

        // 6. Melee slow ticks
        if (typeof enemies !== 'undefined') {
            enemies.forEach(e => {
                if (e._timeSlowTimer > 0) {
                    e._timeSlowTimer--;
                    if (e._timeSlowTimer <= 0 && e._timeSlowed) {
                        e._timeSlowed = false;
                        e.speed = e._baseSpeedSlow || e.speed;
                        delete e._baseSpeedSlow;
                    }
                }
            });
        }

        // 7a. Convergence mutation ticks
        // ct1 Delayed Lightning: fire chain lightning after 2s delay
        if (player._mutCt1 && player._delayedLightnings && player._delayedLightnings.length > 0) {
            for (let i = player._delayedLightnings.length - 1; i >= 0; i--) {
                const dl = player._delayedLightnings[i];
                dl.timer--;
                if (dl.timer <= 0) {
                    const lightDmg = player.stats.rangeDmg * player.damageMultiplier * 0.65;
                    if (typeof enemies !== 'undefined') {
                        enemies.forEach(e => {
                            if (Math.hypot(e.x - dl.x, e.y - dl.y) < 130) e.hp -= lightDmg;
                        });
                    }
                    if (typeof createExplosion === 'function') createExplosion(dl.x, dl.y, '#ffe066', 18);
                    player._delayedLightnings.splice(i, 1);
                }
            }
        }
        // ct2 Time Dilation: tick gravity wells, pull enemies in
        if (player._mutCt2 && player._gravWells && player._gravWells.length > 0) {
            for (let i = player._gravWells.length - 1; i >= 0; i--) {
                const gw = player._gravWells[i];
                gw.timer--;
                if (typeof enemies !== 'undefined') {
                    enemies.forEach(e => {
                        const d = Math.hypot(e.x - gw.x, e.y - gw.y);
                        if (d < 180 && d > 1) {
                            const pull = 1.4;
                            e.x += ((gw.x - e.x) / d) * pull;
                            e.y += ((gw.y - e.y) / d) * pull;
                        }
                    });
                }
                if (gw.timer <= 0) player._gravWells.splice(i, 1);
            }
        }
        // ct3 Burning Moment: slowed enemies take fire DOT every 45 frames
        if (player._mutCt3 && typeof enemies !== 'undefined') {
            const burnTick = Math.floor(Date.now() / 750) % 1 === 0; // ~every 45 frames at 60fps
            if ((player._ct3Tick = ((player._ct3Tick || 0) + 1)) % 45 === 0) {
                const burnDmg = player.stats.rangeDmg * player.damageMultiplier * 0.2;
                enemies.forEach(e => {
                    if (e._timeSlowed) {
                        e.hp -= burnDmg;
                        if (typeof particles !== 'undefined' && typeof Particle !== 'undefined' && Math.random() < 0.5) {
                            particles.push(new Particle(e.x, e.y - e.radius, '#ff4500', { x: (Math.random() - 0.5) * 1.5, y: -2 }));
                        }
                    }
                });
            }
        }

        // 7. Eternal Paradox timer
        if (player.paradoxActive) {
            player.paradoxTimer--;
            if (player.paradoxTimer <= 0) {
                TimeHero._endParadox(player);
            }
        }

        // 8. Slowly decay chrono energy
        player.chronoEnergy = Math.max(0, player.chronoEnergy - 0.04);

        // 9. Achievement: high burden survival tracker
        if ((player.timelineBurden || 0) >= 90 && fl >= 4) {
            if (typeof saveData !== 'undefined') {
                saveData.global = saveData.global || {};
                saveData.global.time_burden_90 = (saveData.global.time_burden_90 || 0) + 1;
            }
        }
    }

    // ─── Spawn echo ──────────────────────────────────────────────────────────
    static _spawnEcho(player) {
        const baseLife = 200 + Math.floor((player.stats.echoDuration || 0) * 60);
        player.activeEchoes.push({
            x: player.x + (Math.random() - 0.5) * 32,
            y: player.y + (Math.random() - 0.5) * 32,
            life: baseLife, maxLife: baseLife,
            fireCd: 30 + Math.floor(Math.random() * 40)
        });
    }

    // ─── Fracture shadow helpers ──────────────────────────────────────────────
    static _spawnFractureShadow(player) {
        if (typeof enemies === 'undefined' || enemies.length === 0) return;
        const fl = Math.floor((player.timelineBurden || 0) / 20);
        const src = enemies[Math.floor(Math.random() * enemies.length)];

        // Spawn offset from the source enemy position (not the player)
        const angle = Math.random() * Math.PI * 2;
        const dist = 80 + Math.random() * 120;
        player.fractureShadows.push({
            x: src.x + Math.cos(angle) * dist,
            y: src.y + Math.sin(angle) * dist,
            hp: 55 + fl * 25,
            maxHp: 55 + fl * 25,
            radius: Math.max(10, (src.radius || 18) * 0.65),
            speed: 1.3 + fl * 0.25,
            damage: 8 + fl * 7,
            life: 540,
            maxLife: 540,
            hitCd: 0
        });
    }

    static _spawnFractureWave(player) {
        if (typeof enemies === 'undefined' || enemies.length === 0) return;
        const fl = Math.floor((player.timelineBurden || 0) / 20);
        const count = 2 + fl;
        for (let i = 0; i < count; i++) TimeHero._spawnFractureShadow(player);
    }

    static _killShadow(player, shadow) {
        if (player._shadowExplode) {
            // Altar t3: shadows AoE on death
            if (typeof enemies !== 'undefined') {
                const aoeRange = shadow.radius + 70;
                const aoeDmg = (player.stats.rangeDmg || 20) * player.damageMultiplier * 0.35;
                enemies.forEach(e => {
                    if (Math.hypot(e.x - shadow.x, e.y - shadow.y) < aoeRange) {
                        if (typeof e.takeDamage === 'function') e.takeDamage(aoeDmg);
                        else e.hp -= aoeDmg;
                    }
                });
            }
            if (typeof createExplosion === 'function') createExplosion(shadow.x, shadow.y, '#c8aa6e', 22);
        } else {
            // Dissolve particles
            if (typeof particles !== 'undefined' && typeof Particle !== 'undefined') {
                for (let i = 0; i < 6; i++) {
                    const a = Math.random() * Math.PI * 2;
                    particles.push(new Particle(shadow.x, shadow.y, '#c8aa6e', { x: Math.cos(a) * 2, y: Math.sin(a) * 2 }));
                }
            }
        }
    }

    // ─── Shoot ───────────────────────────────────────────────────────────────
    static shoot(player) {
        if (player.rangeCooldown > 0) return;

        const a = player.aimAngle;
        const spd = player.stats.projectileSpeed || 11;
        const dmg = player.stats.rangeDmg * player.damageMultiplier;
        const sz = player.stats.projectileSize || 8;

        // Chrono Orb — slow-moving, piercing, slows enemies on hit
        const orb = new Projectile(
            player.x, player.y,
            { x: Math.cos(a) * spd * 0.55, y: Math.sin(a) * spd * 0.55 },
            dmg, '#c8aa6e', sz + 4, 'time', 0, false
        );
        orb.pierce = 99; // passes through all enemies
        orb.onHit = (enemy) => {
            const slowDur = 75 + Math.floor((player.stats.slowPower || 0) * 40);
            if (!enemy._timeSlowed) {
                enemy._baseSpeedSlow = enemy.speed;
                enemy.speed *= 0.35;
                enemy._timeSlowed = true;
            }
            enemy._timeSlowTimer = slowDur;
        };
        projectiles.push(orb);

        // Double-shot when chrono energy is high
        if (player.chronoEnergy >= 70) {
            const orb2 = new Projectile(
                player.x, player.y,
                { x: Math.cos(a + 0.20) * spd * 0.55, y: Math.sin(a + 0.20) * spd * 0.55 },
                dmg * 0.7, '#d4af37', sz + 1, 'time', 0, false
            );
            orb2.pierce = 99;
            orb2.onHit = orb.onHit;
            projectiles.push(orb2);
        }

        const gainMult = player.stats.chronoGainMult || 1;
        player.chronoEnergy = Math.min(100, player.chronoEnergy + 7 * gainMult);
        player.rangeCooldown = player.stats.rangeCd;

        if (typeof audioManager !== 'undefined') audioManager.play('attack_time');
    }

    // ─── Melee — Chrono Strike ───────────────────────────────────────────────
    static melee(player) {
        if (player.meleeCooldown > 0) return;

        const radius = player.meleeRadius || 120;
        const dmg = player.stats.meleeDmg * player.damageMultiplier;
        const slowDur = 90 + Math.floor((player.stats.slowPower || 0) * 60);
        let hitCount = 0;

        if (typeof enemies !== 'undefined') {
            enemies.forEach(e => {
                if (Math.hypot(e.x - player.x, e.y - player.y) < radius + e.radius) {
                    if (typeof e.takeDamage === 'function') e.takeDamage(dmg);
                    else e.hp -= dmg;
                    hitCount++;
                    // ct4 Frozen Timeline: fully freeze instead of slow
                    if (player._mutCt4) {
                        e.frozenTimer = Math.max(e.frozenTimer || 0, slowDur);
                    } else {
                        if (!e._timeSlowed) {
                            e._baseSpeedSlow = e.speed;
                            e.speed *= 0.25;
                            e._timeSlowed = true;
                        }
                        e._timeSlowTimer = slowDur;
                    }
                    // ct6 Stone Moment: brief freeze (root — no knockback) on top of slow
                    if (player._mutCt6) {
                        e.frozenTimer = Math.max(e.frozenTimer || 0, 45);
                    }
                    // Count toward objective
                    if (typeof window._timeObjectiveHit !== 'undefined') window._timeObjectiveHit++;
                }
            });
        }
        // ct2 Time Dilation: spawn gravity well at player position on Chrono Strike
        if (player._mutCt2) {
            player._gravWells = player._gravWells || [];
            player._gravWells.push({ x: player.x, y: player.y, timer: 180 });
        }

        // Also damage fracture shadows in melee range (handled in update, but hit visually here)
        player.fractureShadows.forEach(s => {
            if (Math.hypot(s.x - player.x, s.y - player.y) < radius + s.radius) {
                s.hp -= dmg * 0.5;
            }
        });

        // Ripple ring
        if (typeof particles !== 'undefined') {
            particles.push({
                x: player.x, y: player.y,
                radius: 12, maxRadius: radius,
                alpha: 1, color: '#c8aa6e', lineWidth: 7,
                update() { this.radius += (this.maxRadius - this.radius) * 0.13 + 2.5; this.alpha -= 0.04; this.lineWidth *= 0.91; },
                draw() {
                    if (this.alpha <= 0) return;
                    const c = window.ctx || document.getElementById('gameCanvas').getContext('2d');
                    c.save(); c.globalAlpha = this.alpha;
                    c.shadowColor = '#c8aa6e'; c.shadowBlur = 14;
                    c.beginPath(); c.arc(this.x, this.y, this.radius, 0, Math.PI * 2);
                    c.strokeStyle = this.color; c.lineWidth = this.lineWidth; c.stroke();
                    c.restore();
                }
            });
        }

        if (typeof createExplosion === 'function') createExplosion(player.x, player.y, '#c8aa6e');
        if (hitCount > 0) {
            const gainMult = player.stats.chronoGainMult || 1;
            player.chronoEnergy = Math.min(100, player.chronoEnergy + 14 * Math.min(hitCount, 3) * gainMult);
        }

        player.meleeCooldown = player.stats.meleeCd;
        if (typeof audioManager !== 'undefined') audioManager.play('melee_time');
    }

    // ─── Special — Timeline Fracture ─────────────────────────────────────────
    static useSpecial(player) {
        // Spawn a wave of fracture shadows immediately
        TimeHero._spawnFractureWave(player);

        // Slow all real enemies by 55% for 3 s
        if (typeof enemies !== 'undefined') {
            enemies.forEach(e => {
                if (!e._timeSlowed) {
                    e._baseSpeedSlow = e.speed;
                    e.speed *= 0.45;
                    e._timeSlowed = true;
                }
                e._timeSlowTimer = 180;
            });
        }

        // Player damage boost for 4 s
        if (!player._fractureBoostActive) {
            player.damageMultiplier *= 1.3;
            player._fractureBoostActive = true;
        }
        player._fractureBoostTimer = 240;

        // Raise burden
        player.timelineBurden = Math.min(100, (player.timelineBurden || 0) + 10);

        // Visuals
        if (typeof showNotification === 'function') showNotification("TIMELINE FRACTURE!");
        if (typeof createExplosion === 'function') {
            createExplosion(player.x, player.y, '#c8aa6e', 50);
            createExplosion(player.x, player.y, '#ffd700');
        }
        if (typeof particles !== 'undefined' && typeof Particle !== 'undefined') {
            for (let i = 0; i < 24; i++) {
                const a = (Math.PI * 2 / 24) * i;
                particles.push(new Particle(player.x, player.y, '#d4af37',
                    { x: Math.cos(a) * 4.5, y: Math.sin(a) * 4.5 }));
            }
        }

        if (typeof audioManager !== 'undefined') audioManager.play('special_time');

        if (typeof saveData !== 'undefined') {
            saveData.global = saveData.global || {};
            saveData.global.time_anchors = (saveData.global.time_anchors || 0) + 1;
        }

        player.chronoEnergy = Math.max(0, player.chronoEnergy - 30);
        return true;
    }

    // ─── Eternal Paradox ─────────────────────────────────────────────────────
    static _activateParadox(player) {
        // Back up current multipliers
        player._paradoxBackup = {
            damageMultiplier: player.damageMultiplier,
            speedMultiplier: player.speedMultiplier || 1
        };

        // Explode every fracture shadow simultaneously
        const shadowCount = player.fractureShadows.length;
        if (shadowCount > 0) {
            const aoeDmg = player.stats.meleeDmg * player.damageMultiplier * 0.8;
            for (const shadow of player.fractureShadows) {
                if (typeof createExplosion === 'function') createExplosion(shadow.x, shadow.y, '#ffd700', 30);
                if (typeof enemies !== 'undefined') {
                    enemies.forEach(e => {
                        if (Math.hypot(e.x - shadow.x, e.y - shadow.y) < 110) {
                            if (typeof e.takeDamage === 'function') e.takeDamage(aoeDmg);
                            else e.hp -= aoeDmg;
                        }
                    });
                }
            }
            if (typeof floatingTexts !== 'undefined' && typeof FloatingText !== 'undefined')
                floatingTexts.push(new FloatingText(player.x, player.y - 50,
                    `${shadowCount} ECHOES COLLAPSE!`, '#ffd700', 90));
        }

        player.fractureShadows = [];
        player.timelineBurden = 0;
        player._fractureShadowTimer = 600;

        // Boost player
        player.damageMultiplier *= 1.7;
        player.speedMultiplier = (player.speedMultiplier || 1) * 1.35;
        player.transformActive = true;
        player.paradoxActive = true;
        player.paradoxTimer = 600;  // 10 s
        player.currentForm = 'ETERNAL PARADOX';

        // Slow all enemies for 5 s
        if (typeof enemies !== 'undefined') {
            enemies.forEach(e => {
                if (!e._timeSlowed) {
                    e._baseSpeedSlow = e.speed;
                    e.speed *= 0.4;
                    e._timeSlowed = true;
                }
                e._timeSlowTimer = Math.max(e._timeSlowTimer || 0, 300);
            });
        }

        if (typeof showNotification === 'function') showNotification("ETERNAL PARADOX!");
        if (typeof createExplosion === 'function') {
            createExplosion(player.x, player.y, '#fff', 80);
            createExplosion(player.x, player.y, '#ffd700', 60);
        }
        if (typeof audioManager !== 'undefined') audioManager.play('paradox_time');
    }

    static _endParadox(player) {
        if (player._paradoxBackup) {
            player.damageMultiplier = player._paradoxBackup.damageMultiplier;
            player.speedMultiplier = player._paradoxBackup.speedMultiplier;
            player._paradoxBackup = null;
        }
        player.paradoxActive = false;
        player.transformActive = false;
        player.currentForm = null;
        if (typeof audioManager !== 'undefined') audioManager.play('paradox_end_time');
        if (!player.isCPU && typeof showNotification === 'function')
            showNotification("PARADOX ENDED");
    }

    // ─── Custom level-up options ──────────────────────────────────────────────
    static getCustomLevelUpOptions(player, defaultOptions) {
        const ult = defaultOptions.find(o => o.id === 'transform');
        const burden = Math.round(player.timelineBurden || 0);
        const fl = Math.floor(burden / 20);
        const shadows = player.fractureShadows ? player.fractureShadows.length : 0;

        let ffDesc;
        if (burden >= 85)
            ffDesc = `+8% all stats. ⚠ CRITICAL FRACTURE (${burden}/100, ${shadows} shadows)`;
        else if (fl >= 3)
            ffDesc = `+8% all stats. Fracture tier ${fl} — ${shadows} shadow${shadows !== 1 ? 's' : ''} active`;
        else
            ffDesc = `+8% all stats. Burden: ${burden}/100`;

        let rvDesc;
        if (burden === 0)
            rvDesc = `Heal 10% HP. Timeline is clear.`;
        else {
            const cleared = Math.min(30, burden);
            const newBurden = burden - cleared;
            const removable = shadows - Math.floor(newBurden / 20) - 2;
            rvDesc = `−${cleared} burden → dissolve ${Math.max(0, removable)} shadow${removable !== 1 ? 's' : ''}. Heal 10% HP.`;
        }

        const opts = [
            { id: 'time_fast_forward', icon: '⏩', title: 'Fast Forward', desc: ffDesc },
            { id: 'time_reverse', icon: '⏪', title: 'Reverse', desc: rvDesc }
        ];
        if (ult) opts.push({ ...ult, icon: '✨', title: 'Eternal Paradox', desc: `All ${shadows} shadow${shadows !== 1 ? 's' : ''} explode. 10s of ultimate power.` });
        return opts;
    }

    // ─── Apply custom upgrades ───────────────────────────────────────────────
    static applyUpgrade(player, type) {
        if (type === 'time_fast_forward') {
            player.damageMultiplier += 0.08;
            player.speedMultiplier = (player.speedMultiplier || 1) + 0.08;
            player.cooldownMultiplier = (player.cooldownMultiplier || 1) * 0.92;
            player.maxHp += 8;
            const oldFL = Math.floor((player.timelineBurden || 0) / 20);
            player.timelineBurden = Math.min(100, (player.timelineBurden || 0) + 15);
            const newFL = Math.floor(player.timelineBurden / 20);

            // Crossing a fracture tier: spawn a burst of new shadows
            if (newFL > oldFL && typeof enemies !== 'undefined' && enemies.length > 0) {
                for (let i = 0; i < newFL; i++) TimeHero._spawnFractureShadow(player);
                if (typeof showNotification === 'function')
                    showNotification(`FRACTURE TIER ${newFL}!`);
            } else {
                if (typeof showNotification === 'function') showNotification("TIMELINE ADVANCED!");
            }
            if (typeof createExplosion === 'function') createExplosion(player.x, player.y, '#ffd700');
            return true;
        }

        if (type === 'time_reverse') {
            const cleared = Math.min(30, player.timelineBurden || 0);
            const oldFL = Math.floor((player.timelineBurden || 0) / 20);
            player.timelineBurden = Math.max(0, (player.timelineBurden || 0) - 30);
            const newFL = Math.floor(player.timelineBurden / 20);
            player.hp = Math.min(player.maxHp, player.hp + player.maxHp * 0.10);

            // Dissolve shadows above the new tier cap
            if (newFL < oldFL) {
                const maxAllowed = 2 + newFL;
                while (player.fractureShadows.length > maxAllowed) {
                    const s = player.fractureShadows.pop();
                    TimeHero._killShadow(player, s);
                }
            }

            if (typeof showNotification === 'function')
                showNotification(cleared > 0 ? `REVERSED! −${cleared} BURDEN` : 'TIMELINE CLEAR!');
            if (typeof particles !== 'undefined' && typeof Particle !== 'undefined') {
                for (let i = 0; i < 14; i++) {
                    const a = (Math.PI * 2 / 14) * i;
                    particles.push(new Particle(player.x, player.y, '#c8aa6e',
                        { x: Math.cos(a) * 3, y: Math.sin(a) * 3 }));
                }
            }
            return true;
        }

        if (type === 'transform') {
            TimeHero._activateParadox(player);
            return true;
        }

        return false;
    }

    static modifyUpgradeOption(player, opt) { return opt; }

    // ─── Draw ─────────────────────────────────────────────────────────────────
    static draw(player, ctx) {
        const t = Date.now() / 1000;
        const r = player.radius;
        const ce = player.chronoEnergy || 0;
        const burden = player.timelineBurden || 0;
        const fl = Math.floor(burden / 20);

        // ── Draw fracture shadows first (world-space, before player translate) ──
        for (const shadow of player.fractureShadows) {
            const lifePct = shadow.life / shadow.maxLife;
            const hpPct = Math.max(0, shadow.hp / shadow.maxHp);
            const pulse = 0.8 + 0.2 * Math.sin(t * 3 + shadow.x * 0.05);

            ctx.save();
            ctx.translate(shadow.x, shadow.y);
            ctx.globalAlpha = 0.30 + 0.35 * lifePct;

            // Ghostly glow
            ctx.shadowColor = '#c8aa6e';
            ctx.shadowBlur = 14 * pulse;

            // Body fill
            const sg = ctx.createRadialGradient(0, 0, 0, 0, 0, shadow.radius);
            sg.addColorStop(0, 'rgba(210,180,100,0.85)');
            sg.addColorStop(1, 'rgba(90,55,10,0.08)');
            ctx.fillStyle = sg;
            ctx.beginPath();
            ctx.arc(0, 0, shadow.radius, 0, Math.PI * 2);
            ctx.fill();

            // Dashed outline
            ctx.shadowBlur = 0;
            ctx.strokeStyle = 'rgba(180,145,60,0.65)';
            ctx.lineWidth = 1.8;
            ctx.setLineDash([4, 7]);
            ctx.beginPath(); ctx.arc(0, 0, shadow.radius, 0, Math.PI * 2); ctx.stroke();
            ctx.setLineDash([]);

            // HP bar
            if (hpPct < 0.999) {
                ctx.fillStyle = 'rgba(0,0,0,0.45)';
                ctx.fillRect(-shadow.radius, -shadow.radius - 8, shadow.radius * 2, 4);
                ctx.fillStyle = '#ffd700';
                ctx.fillRect(-shadow.radius, -shadow.radius - 8, shadow.radius * 2 * hpPct, 4);
            }
            ctx.restore();
        }

        // ── All further drawing in player-local space ──
        ctx.save();
        ctx.translate(player.x, player.y);

        // ── Passive echoes ──
        for (const e of player.activeEchoes) {
            const lp = e.life / e.maxLife;
            ctx.save();
            ctx.translate(e.x - player.x, e.y - player.y);
            ctx.globalAlpha = lp * 0.42;
            const eg = ctx.createRadialGradient(-r * 0.2, -r * 0.2, r * 0.05, 0, 0, r * 0.82);
            eg.addColorStop(0, '#ede0b0');
            eg.addColorStop(1, 'rgba(200,170,110,0)');
            ctx.fillStyle = eg;
            ctx.beginPath(); ctx.arc(0, 0, r * 0.82, 0, Math.PI * 2); ctx.fill();
            ctx.restore();
        }

        // ── Eternal Paradox aura ──
        if (player.paradoxActive) {
            const ptimer = player.paradoxTimer || 0;
            const fade = Math.min(1, ptimer / 60);

            // Radiant halo
            const halo = ctx.createRadialGradient(0, 0, r * 0.8, 0, 0, r + 64);
            halo.addColorStop(0, `rgba(255,215,0,${0.55 * fade})`);
            halo.addColorStop(0.5, `rgba(255,190,0,${0.28 * fade})`);
            halo.addColorStop(1, 'rgba(255,150,0,0)');
            ctx.save();
            ctx.fillStyle = halo;
            ctx.beginPath(); ctx.arc(0, 0, r + 64, 0, Math.PI * 2); ctx.fill();
            ctx.restore();

            // Two counter-rotating clock rings
            for (let ring = 0; ring < 2; ring++) {
                const rr = r + 18 + ring * 16;
                const dir = ring === 0 ? 1 : -1;
                ctx.save();
                ctx.rotate(t * 1.6 * dir);
                ctx.strokeStyle = `rgba(255,215,0,${0.7 * fade})`;
                ctx.lineWidth = 2;
                ctx.shadowColor = '#ffd700'; ctx.shadowBlur = 10;
                for (let i = 0; i < 12; i++) {
                    const ma = (Math.PI * 2 / 12) * i;
                    ctx.beginPath();
                    ctx.moveTo(Math.cos(ma) * rr, Math.sin(ma) * rr);
                    ctx.lineTo(Math.cos(ma) * (rr + 7), Math.sin(ma) * (rr + 7));
                    ctx.stroke();
                }
                ctx.restore();
            }

            // Expanding shockwave pulse
            const sw = (t * 2.2) % 1;
            ctx.save();
            ctx.globalAlpha = (1 - sw) * 0.55 * fade;
            ctx.strokeStyle = '#ffd700';
            ctx.lineWidth = 2.5;
            ctx.shadowColor = '#ffd700'; ctx.shadowBlur = 8;
            ctx.beginPath(); ctx.arc(0, 0, r + sw * 90, 0, Math.PI * 2); ctx.stroke();
            ctx.restore();
        }

        // ── Fracture tier crack rings (burden > 20) ──
        if (fl >= 1) {
            ctx.save();
            ctx.strokeStyle = `rgba(200,100,50,${0.12 + fl * 0.07})`;
            ctx.lineWidth = 1.5;
            ctx.rotate(t * 0.4);
            for (let c = 0; c < fl * 2; c++) {
                const a1 = (Math.PI * 2 / (fl * 2)) * c;
                const a2 = a1 + 0.6 - Math.random() * 0.2;
                const cr = r + 5 + c % 2 * 6;
                ctx.beginPath();
                ctx.arc(0, 0, cr, a1, a2);
                ctx.stroke();
            }
            ctx.restore();
        }

        // ── Fracture boost active ring ──
        if (player._fractureBoostActive) {
            const bt = player._fractureBoostTimer / 240;
            ctx.save();
            ctx.globalAlpha = 0.5 * bt;
            ctx.shadowColor = '#ff8c00'; ctx.shadowBlur = 16;
            ctx.strokeStyle = '#ff8c00';
            ctx.lineWidth = 3;
            ctx.beginPath(); ctx.arc(0, 0, r + 12, 0, Math.PI * 2); ctx.stroke();
            ctx.restore();
        }

        // ── Burden warning ring (red when critical) ──
        if (burden > 60) {
            const bAlpha = ((burden - 60) / 40) * 0.5;
            ctx.save();
            ctx.shadowColor = '#e74c3c'; ctx.shadowBlur = 18;
            ctx.strokeStyle = `rgba(231,76,60,${bAlpha})`;
            ctx.lineWidth = 3;
            ctx.beginPath(); ctx.arc(0, 0, r + 4, 0, Math.PI * 2); ctx.stroke();
            ctx.restore();
        }

        // ── Body — helmet look (rotated to face aim direction) ──
        const bodyColor = player.paradoxActive ? '#ffd700' : (player.stats && player.stats.color) || '#c8aa6e';
        ctx.save();
        ctx.rotate(player.aimAngle);
        if (player.paradoxActive) { ctx.shadowColor = '#ffd700'; ctx.shadowBlur = 14; }
        drawHeroSprite(ctx, bodyColor, r);
        ctx.shadowBlur = 0;
        ctx.restore();

        // ── Chrono energy arc ──
        if (ce > 4) {
            ctx.save();
            ctx.strokeStyle = player.paradoxActive ? '#fffacd' : '#ffd700';
            ctx.lineWidth = 3;
            ctx.globalAlpha = 0.5 + 0.5 * (ce / 100);
            ctx.shadowColor = '#ffd700'; ctx.shadowBlur = 10;
            ctx.beginPath();
            ctx.arc(0, 0, r + 7, -Math.PI / 2, -Math.PI / 2 + Math.PI * 2 * (ce / 100));
            ctx.stroke();
            ctx.restore();
        }

        // ── Orbiting sand sparks (more during paradox) ──
        const sparkCount = player.paradoxActive ? 4 : 2;
        const orbitR = r + (player.paradoxActive ? 14 : 11);
        for (let i = 0; i < sparkCount; i++) {
            const oa = t * (player.paradoxActive ? 3.2 : 1.8) + i * (Math.PI * 2 / sparkCount);
            ctx.save();
            ctx.globalAlpha = player.paradoxActive ? 0.9 : 0.65;
            ctx.fillStyle = player.paradoxActive ? '#fff5a0' : '#d4af37';
            ctx.shadowColor = '#ffd700'; ctx.shadowBlur = player.paradoxActive ? 12 : 6;
            ctx.beginPath();
            ctx.arc(Math.cos(oa) * orbitR, Math.sin(oa) * orbitR,
                player.paradoxActive ? 4 : 3, 0, Math.PI * 2);
            ctx.fill();
            ctx.restore();
        }

        ctx.restore();
    }

    // ─── Skill tree ──────────────────────────────────────────────────────────
    static getSkillTreeWeights() {
        return { CHRONO_CHARGE: 0.25, ECHO_DURATION: 0.20, SLOW_POWER: 0.15, HEALTH: 0.15, COOLDOWN: 0.15, DAMAGE: 0.10 };
    }

    static getSkillNodeDetails(type, val, desc) {
        if (type === 'CHRONO_CHARGE') { val = 0.15; desc = '+15% Chrono Energy Gain'; }
        if (type === 'ECHO_DURATION') { val = 0.5; desc = '+0.5s Echo Duration'; }
        if (type === 'SLOW_POWER') { val = 0.3; desc = '+0.3s Chrono Strike Slow'; }
        return { val, desc };
    }

    static applySkillNode(base, node) {
        if (node.type === 'CHRONO_CHARGE') base.chronoGainMult = (base.chronoGainMult || 1) + node.value;
        if (node.type === 'ECHO_DURATION') base.echoDuration = (base.echoDuration || 0) + node.value;
        if (node.type === 'SLOW_POWER') base.slowPower = (base.slowPower || 0) + node.value;
    }

    // ─── Objective ───────────────────────────────────────────────────────────
    static startObjective(objective) {
        objective.type = 'CHRONO_STRIKE';
        objective.target = 30;
        objective.current = 0;
        window._timeObjectiveHit = 0;
        if (typeof showNotification === 'function') showNotification('OBJECTIVE: SLOW ENEMIES!');
    }

    static checkObjectiveCompletion(objective, wave) {
        if (objective.type === 'CHRONO_STRIKE') {
            objective.current = window._timeObjectiveHit || 0;
            if (objective.current >= objective.target) {
                objective.state = 'COMPLETED';
                if (typeof showNotification === 'function') showNotification('TIME MASTERED!');
                if (typeof triggerStory === 'function') triggerStory(wave);
                return true;
            }
        }
        return false;
    }

    static drawObjectiveUI(objective, objText, objFill) {
        if (objective.type === 'CHRONO_STRIKE') {
            const cur = window._timeObjectiveHit || 0;
            objText.innerText = `SLOWED: ${cur} / ${objective.target}`;
            objFill.style.width = `${Math.min(100, (cur / objective.target) * 100)}%`;
            objFill.style.backgroundColor = '#c8aa6e';
            return true;
        }
        return false;
    }

    // ─── AI ──────────────────────────────────────────────────────────────────
    static getAIInput(player, controllers, target) { return null; }
}

window.TimeHero = TimeHero;
