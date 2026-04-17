// Echos of Eternity — Love Hero Logic (Phase 5)
//
// Core resources:
//   affection    0-100  fills via charmed kills and healing; at 80+ heart arrows pierce all enemies
//
// Abilities:
//   Shoot   — Heart Arrow: high-damage projectile; charms target on hit (prevents movement+shooting)
//             At affection 80+: arrow also gains pierce (passes through all enemies)
//   Melee   — Embrace: AoE pull + damage; double damage vs charmed enemies; charms all hit enemies
//   Special — Emotional Resonance: links nearby enemies; periodic shared damage pulses; charms all linked
//   Passive — Love Companion: small companion orbits + fires heart bolts; respawns after 5s if absent
//   Ultimate— Heart of Unity: ALL enemies become overwhelmed (frozen + taking love damage); massive player heal
//
// Level-up uses standard cards — Love is the easy hero.
// Charm mechanic piggybacks on frozenTimer so existing Enemy movement/attack suppression applies automatically.

class LoveHero {

    // ─── Init ────────────────────────────────────────────────────────────────
    static init(player) {
        player.affection = 0;   // 0-100

        // Companion system
        player._loveCompanion = null;
        player._loveCompSpawn = 180;  // frames until next companion spawn attempt

        // Emotional resonance links: [{a: Enemy, b: Enemy, life, maxLife, pulseTimer}]
        player._resonanceLinks = [];

        // Heart of Unity (ultimate)
        player._heartUnityActive = false;
        player._heartUnityTimer = 0;
        player._heartburstFired = false;   // guards the 100-affection one-shot trigger
        player._heartburstStreak = 0;       // consecutive bursts without taking a hit
        player._prevHp = -1;      // -1 = uninitialized (skip first frame check)

        // Override base stats — easy hero, generous stats
        player.stats.speed = 4.8;
        player.stats.rangeDmg = 32;
        player.stats.meleeDmg = 62;
        player.stats.rangeCd = 22;
        player.stats.meleeCd = 65;
        player.stats.projectileSpeed = 12;
        player.stats.projectileSize = 10;

        // Hooks
        player.customUpdate = (dx, dy) => LoveHero.update(player, dx, dy);
        player.customDraw = (ctx) => LoveHero.draw(player, ctx);
        player.customSpecial = () => LoveHero.useSpecial(player);
        player.melee = () => LoveHero.melee(player);
        player.shoot = () => LoveHero.shoot(player);
        player.getAIInput = (p, c, t) => LoveHero.getAIInput(p, c, t);

        // Special UI
        player.specialName = "EMOTIONAL RESONANCE";
        player.specialMaxCooldown = 1200;  // 20 s
        if (!player.isCPU) {
            const iconEl = document.getElementById('special-icon');
            if (iconEl) iconEl.innerText = "💖";
        }

        // Altar synergies
        const active = (saveData.altar && saveData.altar.active) ? saveData.altar.active : [];
        const has = id => active.includes(id);
        if (has('l1')) player.stats.charmDuration = (player.stats.charmDuration || 0) + 45;
        if (has('l2')) player._loveCompSpawn = 60;   // companion spawns much faster
        if (has('l3')) player.stats.resonancePulseExtra = true; // resonance pulses also heal

        // Convergence mutations
        player._mutCl1 = has('cl1');  // Heartbreak: charmed enemies ignite on charm expiry
        player._mutCl2 = has('cl2');  // Frozen Heart: arrows freeze instead of charm
        player._mutCl3 = has('cl3');  // Charged Connection: resonance links fire chain lightning
        player._mutCl4 = has('cl4');  // Void Bond: resonance pulls linked enemies together
        player._mutCl5 = has('cl5');  // Growing Bond: companion drops healing flowers
        player._mutCl6 = has('cl6');  // Gravity of Love: embrace pulls 2x far + brief root
        player._mutCl7 = has('cl7');  // Timeless Love: charms last 30% longer (time affinity)
    }

    // ─── Update ──────────────────────────────────────────────────────────────
    static update(player, dx, dy) {
        // 1. Companion tick
        player._loveCompSpawn--;
        if (player._loveCompSpawn <= 0) {
            if (!player._loveCompanion || player._loveCompanion.life <= 0) {
                LoveHero._spawnCompanion(player);
            }
        }
        if (player._loveCompanion && player._loveCompanion.life > 0) {
            LoveHero._updateCompanion(player);
        }

        // 2. Tick charm timers (visual only — frozenTimer handles gameplay suppression)
        if (typeof enemies !== 'undefined') {
            enemies.forEach(e => {
                if (e._loveCharmed > 0) {
                    // cl1 Heartbreak: burst fire damage when charm expires
                    if (player._mutCl1 && e._loveCharmed === 1) {
                        const burnDmg = player.stats.rangeDmg * player.damageMultiplier * 1.5;
                        e.hp -= burnDmg;
                        if (typeof createExplosion === 'function') createExplosion(e.x, e.y, '#ff4500', 10);
                    }
                    e._loveCharmed--;
                    // Emit hearts while charmed
                    if (e._loveCharmed % 18 === 0 && typeof particles !== 'undefined' && typeof Particle !== 'undefined') {
                        particles.push(new Particle(
                            e.x + (Math.random() - 0.5) * e.radius,
                            e.y - e.radius,
                            '#ff6b9d',
                            { x: (Math.random() - 0.5) * 1.5, y: -1.5 }
                        ));
                    }
                }
            });
        }

        // 3. Emotional Resonance — periodic damage pulses through links
        if (player._resonanceLinks && player._resonanceLinks.length > 0) {
            for (let i = player._resonanceLinks.length - 1; i >= 0; i--) {
                const link = player._resonanceLinks[i];
                link.life--;
                link.pulseTimer = (link.pulseTimer || 0) - 1;

                // Validate links still alive
                const aAlive = typeof enemies !== 'undefined' && enemies.includes(link.a);
                const bAlive = typeof enemies !== 'undefined' && enemies.includes(link.b);
                if (!aAlive || !bAlive || link.life <= 0) {
                    player._resonanceLinks.splice(i, 1);
                    continue;
                }

                // cl4 Void Bond: pull linked enemies toward each other every frame
                if (player._mutCl4) {
                    const vdx = link.b.x - link.a.x;
                    const vdy = link.b.y - link.a.y;
                    const vdist = Math.hypot(vdx, vdy);
                    if (vdist > 40) {
                        const pull = 0.7;
                        link.a.x += (vdx / vdist) * pull;
                        link.a.y += (vdy / vdist) * pull;
                        link.b.x -= (vdx / vdist) * pull;
                        link.b.y -= (vdy / vdist) * pull;
                    }
                }

                // Pulse damage through the link every 45 frames
                if (link.pulseTimer <= 0) {
                    link.pulseTimer = 45;
                    const pulseDmg = (player.stats.rangeDmg * player.damageMultiplier * 0.4) *
                        (link.a._nexusDamageBoost || 1);
                    const finalDmgA = link.a._loveCharmed > 0 ? pulseDmg * 1.5 : pulseDmg;
                    const finalDmgB = link.b._loveCharmed > 0 ? pulseDmg * 1.5 : pulseDmg;
                    link.a.hp -= finalDmgA;
                    link.b.hp -= finalDmgB;

                    // Heal player if altar l3
                    if (player.stats.resonancePulseExtra) {
                        player.hp = Math.min(player.maxHp, player.hp + 2);
                    }

                    // cl3 Charged Connection: chain lightning between linked enemies on each pulse
                    if (player._mutCl3) {
                        const lightningDmg = pulseDmg * 0.6;
                        link.a.hp -= lightningDmg;
                        link.b.hp -= lightningDmg;
                        if (typeof createExplosion === 'function') {
                            createExplosion(link.a.x, link.a.y, '#ffe066', 6);
                            createExplosion(link.b.x, link.b.y, '#ffe066', 6);
                        }
                    }

                    // Visual spark between linked enemies
                    if (typeof createExplosion === 'function') {
                        const mx = (link.a.x + link.b.x) / 2;
                        const my = (link.a.y + link.b.y) / 2;
                        createExplosion(mx, my, '#ff6b9d', 3);
                    }
                }
            }
        }

        // 4. Hit detection — reset combo if player took damage this frame
        if (player._prevHp >= 0 && player.hp < player._prevHp) {
            if (player.affection > 0 || player._heartburstStreak > 0) {
                player.affection = 0;
                player._heartburstStreak = 0;
                player._heartburstFired = false;
                player._affectionFull = false;
                if (typeof floatingTexts !== 'undefined' && typeof FloatingText !== 'undefined') {
                    floatingTexts.push(new FloatingText(player.x, player.y - 55, 'COMBO BROKEN', '#aaaaaa', 1.6));
                }
            }
        }
        player._prevHp = player.hp;

        // 5. Affection milestones — checked BEFORE decay so reaching 100 always triggers
        // — At 100: auto-trigger Heartburst, reset meter to 0
        if (player.affection >= 100 && !player._heartburstFired) {
            player._heartburstFired = true;
            LoveHero._triggerHeartburst(player);
        } else if (player.affection < 100) {
            player._heartburstFired = false;
        }
        // — At 80: HEART SURGE notification + pierce unlock
        if (player.affection >= 80 && !player._affectionFull) {
            player._affectionFull = true;
            if (typeof floatingTexts !== 'undefined' && typeof FloatingText !== 'undefined') {
                floatingTexts.push(new FloatingText(player.x, player.y - 60, 'HEART SURGE', '#ff6b9d', 2.0));
            }
        } else if (player.affection < 80) {
            player._affectionFull = false;
        }

        // 6. Decay affection — drains fully in ~12s of no kills
        player.affection = Math.max(0, player.affection - 0.14);

        // 7. Heart of Unity timer
        if (player._heartUnityActive) {
            player._heartUnityTimer--;

            // AoE love damage + heal every 30 frames
            if (player._heartUnityTimer % 30 === 0 && typeof enemies !== 'undefined') {
                const unityDmg = player.stats.rangeDmg * player.damageMultiplier * 0.3;
                enemies.forEach(e => {
                    e.hp -= unityDmg;
                    if (typeof particles !== 'undefined' && typeof Particle !== 'undefined' && Math.random() < 0.4) {
                        particles.push(new Particle(e.x, e.y - e.radius, '#ff6b9d', { x: 0, y: -2 }));
                    }
                });
                player.hp = Math.min(player.maxHp, player.hp + 1.5);
            }

            if (player._heartUnityTimer <= 0) {
                LoveHero._endHeartUnity(player);
            }
        }

    }

    // ─── Companion ──────────────────────────────────────────────────────────
    static _spawnCompanion(player) {
        player._loveCompanion = {
            x: player.x + 60,
            y: player.y,
            angle: 0,
            life: 99999,
            fireCooldown: 50,
            radius: 12,
        };
        player._loveCompSpawn = 300;  // respawn check in 5s if companion dies
        if (typeof floatingTexts !== 'undefined' && typeof FloatingText !== 'undefined') {
            floatingTexts.push(new FloatingText(player.x, player.y - 50, '💖 COMPANION', '#ff9dbf', 1.8));
        }
    }

    static _updateCompanion(player) {
        const comp = player._loveCompanion;
        if (!comp || comp.life <= 0) return;

        // Orbit player
        comp.angle += 0.025;
        const targetX = player.x + Math.cos(comp.angle) * 70;
        const targetY = player.y + Math.sin(comp.angle) * 70;
        comp.x += (targetX - comp.x) * 0.12;
        comp.y += (targetY - comp.y) * 0.12;

        // Fire at nearest enemy
        comp.fireCooldown--;
        if (comp.fireCooldown <= 0 && typeof enemies !== 'undefined' && enemies.length > 0) {
            let nearest = null, bestDist = 380;
            for (const e of enemies) {
                const d = Math.hypot(e.x - comp.x, e.y - comp.y);
                if (d < bestDist) { nearest = e; bestDist = d; }
            }
            if (nearest && typeof Projectile !== 'undefined' && typeof projectiles !== 'undefined') {
                const a = Math.atan2(nearest.y - comp.y, nearest.x - comp.x);
                const spd = (player.stats.projectileSpeed || 12) * 0.85;
                const dmg = player.stats.rangeDmg * player.damageMultiplier * 0.35;
                const proj = new Projectile(
                    comp.x, comp.y,
                    { x: Math.cos(a) * spd, y: Math.sin(a) * spd },
                    dmg, '#ff9dbf', 6, 'player', 0, false
                );
                proj._loveHeartBolt = true;
                proj.owner = player;
                // Fill affection meter on companion kills (checked after damage is applied)
                proj.onHit = (enemy) => {
                    if (enemy.hp <= 0) {
                        player.affection = Math.min(100, player.affection + 20);
                    }
                    return undefined;
                };
                projectiles.push(proj);
            }
            comp.fireCooldown = 65;
        }

        // cl5 Growing Bond: companion periodically heals player and leaves a healing burst
        comp._flowerTimer = (comp._flowerTimer || 0) - 1;
        if (player._mutCl5 && comp._flowerTimer <= 0) {
            comp._flowerTimer = 240;  // every 4 s
            player.hp = Math.min(player.maxHp, player.hp + 8);
            if (typeof createExplosion === 'function') createExplosion(comp.x, comp.y, '#90ee90', 12);
            if (typeof floatingTexts !== 'undefined' && typeof FloatingText !== 'undefined') {
                floatingTexts.push(new FloatingText(comp.x, comp.y - 24, '+8', '#90ee90', 1.4));
            }
        }
    }

    // ─── Charm helper ────────────────────────────────────────────────────────
    static _charmEnemy(player, e) {
        if (!e || e.isBoss) return;  // bosses are immune to charm
        let dur = 90 + (player.stats.charmDuration || 0);
        // cl7 Timeless Love: charms last 30% longer
        if (player._mutCl7) dur = Math.round(dur * 1.3);
        // Re-use frozenTimer — this suppresses all enemy movement/attacks automatically
        if ((e.frozenTimer || 0) < dur) e.frozenTimer = dur;
        e._loveCharmed = dur;
        // Track for echo_love_charm100 achievement
        if (typeof saveData !== 'undefined') {
            saveData.global = saveData.global || {};
            saveData.global.love_charm_count = (saveData.global.love_charm_count || 0) + 1;
        }
    }

    // ─── Shoot — Heart Arrow ─────────────────────────────────────────────────
    static shoot(player) {
        if (player.rangeCooldown > 0) return;

        const a = player.aimAngle;
        const spd = player.stats.projectileSpeed || 12;
        const dmg = player.stats.rangeDmg * player.damageMultiplier;
        const sz = player.stats.projectileSize || 10;
        const highAffection = player.affection >= 80;

        // Build aim angles: main + spread shots from extraProjectiles
        const extra = player.extraProjectiles || 0;
        const total = 1 + extra;
        const spread = 0.22; // radians between each extra shot
        const angles = [];
        for (let i = 0; i < total; i++) {
            const offset = (i - (total - 1) / 2) * spread;
            angles.push(a + offset);
        }

        angles.forEach(angle => {
            const proj = new Projectile(
                player.x, player.y,
                { x: Math.cos(angle) * spd, y: Math.sin(angle) * spd },
                dmg, '#ff6b9d', sz, 'love', 0, false
            );
            proj._loveHeartArrow = true;

            // At high affection, heart arrows pierce through all enemies
            if (highAffection) {
                proj.pierce = 99;  // effectively infinite pierce
                proj.color = '#ff1a6b';
                proj.size = sz + 3;
            }

            // Mark for charm-on-hit; fill affection meter on kill
            // cl2 Frozen Heart: freeze instead of charm
            proj.owner = player;
            proj.onHit = (enemy) => {
                if (player._mutCl2) {
                    const freezeDur = 75 + (player.stats.charmDuration || 0);
                    enemy.frozenTimer = Math.max(enemy.frozenTimer || 0, freezeDur);
                } else {
                    LoveHero._charmEnemy(player, enemy);
                }
                if (enemy.hp <= 0) {
                    player.affection = Math.min(100, player.affection + 15);
                }
                return undefined;
            };

            projectiles.push(proj);
        });

        player.rangeCooldown = player.stats.rangeCd;

        if (typeof audioManager !== 'undefined') audioManager.play('attack_love');
    }

    // ─── Melee — Embrace ─────────────────────────────────────────────────────
    static melee(player) {
        if (player.meleeCooldown > 0) return;

        const radius = player.meleeRadius || 130;
        const baseDmg = player.stats.meleeDmg * player.damageMultiplier;
        let hitCount = 0;
        let killCount = 0;

        if (typeof enemies !== 'undefined') {
            enemies.forEach(e => {
                if (Math.hypot(e.x - player.x, e.y - player.y) > radius + e.radius) return;

                // Pull toward player (cl6 Gravity of Love: 2x pull distance)
                const pullDist = player._mutCl6 ? 90 : 45;
                const ang = Math.atan2(player.y - e.y, player.x - e.x);
                e.x += Math.cos(ang) * pullDist;
                e.y += Math.sin(ang) * pullDist;

                // cl6: brief root after landing (suppresses movement for 30 frames)
                if (player._mutCl6) {
                    e.frozenTimer = Math.max(e.frozenTimer || 0, 30);
                }

                // Double damage on already-charmed enemies
                const finalDmg = e._loveCharmed > 0 ? baseDmg * 2.0 : baseDmg;
                if (typeof e.takeDamage === 'function') e.takeDamage(finalDmg);
                else e.hp -= finalDmg;

                // Charm everything hit (bosses immune)
                LoveHero._charmEnemy(player, e);
                hitCount++;
                if (e.hp <= 0) killCount++;
            });
        }

        // Always show the melee AoE ring so the player can see the attack area
        player._loveMeleeRing = { r: 0, maxR: radius, alpha: 1.0 };

        if (hitCount > 0) {
            if (typeof createExplosion === 'function') createExplosion(player.x, player.y, '#ff6b9d', 12);
            if (typeof floatingTexts !== 'undefined' && typeof FloatingText !== 'undefined') {
                floatingTexts.push(new FloatingText(player.x, player.y - 50, 'EMBRACE', '#ff9dbf', 2.0));
            }
            if (typeof audioManager !== 'undefined') audioManager.play('melee_love');
        }
        if (killCount > 0) {
            player.affection = Math.min(100, player.affection + killCount * 15);
        }

        player.meleeCooldown = player.stats.meleeCd;
    }

    // ─── Special — Emotional Resonance ───────────────────────────────────────
    static useSpecial(player) {
        if (player.specialCooldown > 0) return;
        if (typeof enemies === 'undefined') return;

        const nonBoss = enemies.filter(e => !e.isBoss);
        if (nonBoss.length === 0) return;

        // Sort by distance from player, take nearest 10
        const sorted = nonBoss.slice().sort((a, b) =>
            Math.hypot(a.x - player.x, a.y - player.y) - Math.hypot(b.x - player.x, b.y - player.y)
        ).slice(0, 10);

        // Clear existing links
        player._resonanceLinks = [];

        // Chain links: 0→1, 1→2, … , n-1→0
        for (let i = 0; i < sorted.length; i++) {
            const next = (i + 1) % sorted.length;
            player._resonanceLinks.push({
                a: sorted[i],
                b: sorted[next],
                life: 600,
                maxLife: 600,
                pulseTimer: 10,  // first pulse soon
            });
        }

        // Charm all linked enemies
        sorted.forEach(e => LoveHero._charmEnemy(player, e));

        // Big visual burst from player
        if (typeof createExplosion === 'function') {
            createExplosion(player.x, player.y, '#ff6b9d', 18);
        }
        if (typeof floatingTexts !== 'undefined' && typeof FloatingText !== 'undefined') {
            floatingTexts.push(new FloatingText(player.x, player.y - 65, 'EMOTIONAL RESONANCE', '#ff6b9d', 2.5));
        }

        player.affection = Math.min(100, player.affection + 25);
        player.specialCooldown = player.specialMaxCooldown;
        if (typeof audioManager !== 'undefined') audioManager.play('special_love');
    }

    // ─── Heart of Unity (Ultimate) ───────────────────────────────────────────
    // Triggered separately — e.g. from level-up Ultimate card or game.js hook
    static triggerUltimate(player) {
        if (player._heartUnityActive) return;

        player._heartUnityActive = true;
        player._heartUnityTimer = 600;  // 10 seconds

        // Charm ALL enemies (bosses get a weaker version — just slow)
        if (typeof enemies !== 'undefined') {
            enemies.forEach(e => {
                if (e.isBoss) {
                    // Slow boss 50%
                    if (!e._heartUnitySlowed) {
                        e._heartUnitySlowed = true;
                        e._heartUnityBaseSpeed = e.speed;
                        e.speed *= 0.5;
                    }
                } else {
                    LoveHero._charmEnemy(player, e);
                    e.frozenTimer = Math.max(e.frozenTimer, 600);  // Full 10s freeze
                    e._loveCharmed = 600;
                }
            });
        }

        // Massive heal
        const heal = player.maxHp * 0.40;
        player.hp = Math.min(player.maxHp, player.hp + heal);

        // Big explosion + text
        if (typeof createExplosion === 'function') createExplosion(player.x, player.y, '#ff1a6b', 30);
        if (typeof floatingTexts !== 'undefined' && typeof FloatingText !== 'undefined') {
            floatingTexts.push(new FloatingText(player.x, player.y - 80, '💖 HEART OF UNITY', '#ff1a6b', 3.0));
        }
        if (typeof audioManager !== 'undefined') audioManager.play('unity_love');

        // Track for achievement
        if (typeof saveData !== 'undefined') {
            saveData.global = saveData.global || {};
            saveData.global.love_unity_count = (saveData.global.love_unity_count || 0) + 1;
        }
    }

    // ─── Heartburst (auto-trigger at 100 affection) ──────────────────────────
    // Fires 12 piercing heart projectiles in all directions, heals the player,
    // then resets the affection meter to 0 to start the loop again.
    static _triggerHeartburst(player) {
        const streak = player._heartburstStreak || 0;

        // Scale with streak: more projectiles, more damage, bigger heal
        const COUNT = Math.min(24, 12 + streak * 4);
        const dmgMult = 1.8 + streak * 0.5;
        const healPct = 0.15 + streak * 0.05;
        const spd = (player.stats.projectileSpeed || 12) * 1.2;
        const dmg = player.stats.rangeDmg * (player.damageMultiplier || 1) * dmgMult;
        const sz = (player.stats.projectileSize || 10) + 4 + streak;

        for (let i = 0; i < COUNT; i++) {
            const angle = (Math.PI * 2 * i) / COUNT;
            const proj = new Projectile(
                player.x, player.y,
                { x: Math.cos(angle) * spd, y: Math.sin(angle) * spd },
                dmg, '#ff1a6b', sz, 'love', 0, false
            );
            proj._loveHeartArrow = true;
            proj.pierce = 99;
            proj.owner = player;
            proj.onHit = (enemy) => {
                LoveHero._charmEnemy(player, enemy);
                return undefined;
            };
            if (typeof projectiles !== 'undefined') projectiles.push(proj);
        }

        // Heal scales with streak
        player.hp = Math.min(player.maxHp, player.hp + player.maxHp * healPct);

        if (typeof createExplosion === 'function') createExplosion(player.x, player.y, '#ff1a6b', 16 + streak * 4);
        if (typeof floatingTexts !== 'undefined' && typeof FloatingText !== 'undefined') {
            const label = streak > 0 ? `💗 HEARTBURST x${streak + 1}` : '💗 HEARTBURST';
            floatingTexts.push(new FloatingText(player.x, player.y - 70, label, '#ff1a6b', 2.8));
        }
        if (typeof audioManager !== 'undefined') audioManager.play('heartburst_love');

        // Advance the streak — resets only when the player takes a hit
        player._heartburstStreak = streak + 1;

        // Drain the meter — player fills it again for the next burst
        player.affection = 0;
    }

    static _endHeartUnity(player) {
        player._heartUnityActive = false;
        // Restore boss speeds
        if (typeof enemies !== 'undefined') {
            enemies.forEach(e => {
                if (e.isBoss && e._heartUnitySlowed) {
                    e.speed = e._heartUnityBaseSpeed || e.speed;
                    e._heartUnitySlowed = false;
                }
            });
        }
    }

    // ─── Draw ────────────────────────────────────────────────────────────────
    static draw(player, ctx) {
        const r = player.radius;

        // Heart of Unity overlay — soft pink screen wash (world-space, no translate needed)
        if (player._heartUnityActive) {
            const progress = player._heartUnityTimer / 600;
            ctx.save();
            ctx.fillStyle = `rgba(255, 107, 157, ${0.08 * progress})`;
            if (typeof arena !== 'undefined') {
                ctx.fillRect(arena.camera.x, arena.camera.y, arena.camera.width, arena.camera.height);
            }
            ctx.restore();
        }

        // Draw resonance link lines between enemies (world-space)
        if (player._resonanceLinks && player._resonanceLinks.length > 0) {
            ctx.save();
            for (const link of player._resonanceLinks) {
                if (!link.a || !link.b) continue;
                const alpha = (link.life / link.maxLife) * 0.55;
                const pulse = 0.5 + 0.5 * Math.sin((link.pulseTimer || 0) * 0.2 + Date.now() * 0.004);
                ctx.globalAlpha = alpha * pulse;
                ctx.strokeStyle = '#ff6b9d';
                ctx.lineWidth = 2.5;
                ctx.setLineDash([6, 5]);
                ctx.beginPath();
                ctx.moveTo(link.a.x, link.a.y);
                const mx = (link.a.x + link.b.x) / 2 + Math.sin(Date.now() * 0.002 + link.life) * 20;
                const my = (link.a.y + link.b.y) / 2 + Math.cos(Date.now() * 0.002 + link.life) * 20;
                ctx.quadraticCurveTo(mx, my, link.b.x, link.b.y);
                ctx.stroke();
                ctx.setLineDash([]);
            }
            ctx.globalAlpha = 1;
            ctx.restore();
        }

        // Draw Love Companion (world-space)
        if (player._loveCompanion && player._loveCompanion.life > 0) {
            const comp = player._loveCompanion;
            ctx.save();
            const cg = ctx.createRadialGradient(comp.x, comp.y, 3, comp.x, comp.y, comp.radius * 2);
            cg.addColorStop(0, 'rgba(255,157,191,0.5)');
            cg.addColorStop(1, 'rgba(255,107,157,0)');
            ctx.beginPath();
            ctx.arc(comp.x, comp.y, comp.radius * 2, 0, Math.PI * 2);
            ctx.fillStyle = cg;
            ctx.fill();
            ctx.beginPath();
            ctx.arc(comp.x, comp.y, comp.radius, 0, Math.PI * 2);
            ctx.fillStyle = '#ff9dbf';
            ctx.fill();
            ctx.strokeStyle = '#ffffff';
            ctx.lineWidth = 1.5;
            ctx.stroke();
            ctx.restore();
        }

        // Melee AoE ring — expands from player.x/y and fades out (world-space)
        if (player._loveMeleeRing) {
            const ring = player._loveMeleeRing;
            ring.r += (ring.maxR - ring.r) * 0.22;  // ease toward max radius
            ring.alpha -= 0.06;
            if (ring.alpha <= 0) {
                player._loveMeleeRing = null;
            } else {
                ctx.save();
                ctx.globalAlpha = ring.alpha * 0.8;
                ctx.strokeStyle = '#ff1a6b';
                ctx.lineWidth = 3.5;
                ctx.shadowColor = '#ff6b9d';
                ctx.shadowBlur = 12;
                ctx.beginPath();
                ctx.arc(player.x, player.y, ring.r, 0, Math.PI * 2);
                ctx.stroke();
                // Inner softer ring
                ctx.globalAlpha = ring.alpha * 0.3;
                ctx.lineWidth = 8;
                ctx.strokeStyle = '#ff9dbf';
                ctx.shadowBlur = 0;
                ctx.beginPath();
                ctx.arc(player.x, player.y, ring.r, 0, Math.PI * 2);
                ctx.stroke();
                ctx.restore();
            }
        }

        // ── Hero body (player-local space) ──
        ctx.save();
        ctx.translate(player.x, player.y);

        // Affection glow aura when full
        if (player.affection >= 80) {
            const pulse = 0.5 + 0.5 * Math.sin(Date.now() * 0.008);
            ctx.save();
            ctx.globalAlpha = 0.25 * pulse;
            ctx.shadowColor = '#ff1a6b';
            ctx.shadowBlur = 20;
            ctx.beginPath();
            ctx.arc(0, 0, r + 6, 0, Math.PI * 2);
            ctx.fillStyle = '#ff6b9d';
            ctx.fill();
            ctx.restore();
        }

        // Helmet sprite, rotated to aim direction
        ctx.rotate(player.aimAngle);
        if (typeof drawHeroSprite === 'function') {
            drawHeroSprite(ctx, player.stats && player.stats.color || '#ff6b9d', r);
        }

        ctx.restore();

        // Affection resource bar (world-space, above hero)
        if (!player.isCPU) {
            ctx.save();
            const barW = r * 2.2;
            const bx = player.x - barW / 2;
            const by = player.y - r - 30;
            ctx.fillStyle = 'rgba(0,0,0,0.45)';
            ctx.fillRect(bx - 1, by - 1, barW + 2, 7);
            const pct = player.affection / 100;
            const barColor = pct >= 0.8 ? '#ff1a6b' : '#ff6b9d';
            ctx.fillStyle = barColor;
            ctx.fillRect(bx, by, barW * pct, 5);
            if (pct >= 0.8) {
                ctx.globalAlpha = 0.5 * (0.5 + 0.5 * Math.sin(Date.now() * 0.008));
                ctx.fillStyle = '#ffffff';
                ctx.fillRect(bx, by, barW * pct, 5);
                ctx.globalAlpha = 1;
            }
            // Streak indicator
            if ((player._heartburstStreak || 0) > 0) {
                ctx.font = 'bold 9px monospace';
                ctx.textAlign = 'right';
                ctx.fillStyle = '#ff1a6b';
                ctx.fillText('x' + player._heartburstStreak, bx + barW, by - 2);
            }
            ctx.restore();
        }
    }

    // ─── AI Input (CPU companion or co-op AI) ───────────────────────────────
    static getAIInput(player, controller, target) {
        if (!target) return {};
        const dx = target.x - player.x;
        const dy = target.y - player.y;
        const dist = Math.hypot(dx, dy) || 1;
        // Love AI: keep medium distance, always shoot, use special when available
        const desiredDist = 180;
        const moveScale = dist > desiredDist + 40 ? 1 : (dist < desiredDist - 40 ? -0.6 : 0);
        return {
            moveX: (dx / dist) * moveScale,
            moveY: (dy / dist) * moveScale,
            shoot: true,
            melee: dist < 100,
            useSpecial: player.specialCooldown <= 0,
        };
    }
}

window.LoveHero = LoveHero;
