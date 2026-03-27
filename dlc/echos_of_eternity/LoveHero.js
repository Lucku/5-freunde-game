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
        player._loveCompanion    = null;
        player._loveCompSpawn    = 180;  // frames until next companion spawn attempt

        // Emotional resonance links: [{a: Enemy, b: Enemy, life, maxLife, pulseTimer}]
        player._resonanceLinks   = [];

        // Heart of Unity (ultimate)
        player._heartUnityActive = false;
        player._heartUnityTimer  = 0;

        // Override base stats — easy hero, generous stats
        player.stats.speed         = 4.8;
        player.stats.rangeDmg      = 32;
        player.stats.meleeDmg      = 62;
        player.stats.rangeCd       = 22;
        player.stats.meleeCd       = 65;
        player.stats.projectileSpeed = 12;
        player.stats.projectileSize  = 10;

        // Hooks
        player.customUpdate   = (dx, dy) => LoveHero.update(player, dx, dy);
        player.customDraw     = (ctx)     => LoveHero.draw(player, ctx);
        player.customSpecial  = ()        => LoveHero.useSpecial(player);
        player.melee          = ()        => LoveHero.melee(player);
        player.shoot          = ()        => LoveHero.shoot(player);
        player.getAIInput     = (p, c, t) => LoveHero.getAIInput(p, c, t);

        // Special UI
        player.specialName        = "EMOTIONAL RESONANCE";
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

                    // Visual spark between linked enemies
                    if (typeof createExplosion === 'function') {
                        const mx = (link.a.x + link.b.x) / 2;
                        const my = (link.a.y + link.b.y) / 2;
                        createExplosion(mx, my, '#ff6b9d', 3);
                    }
                }
            }
        }

        // 4. Decay affection slowly
        player.affection = Math.max(0, player.affection - 0.025);

        // 5. Heart of Unity timer
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

        // 6. Affection milestone notification
        if (player.affection >= 80 && !player._affectionFull) {
            player._affectionFull = true;
            if (typeof floatingTexts !== 'undefined' && typeof FloatingText !== 'undefined') {
                floatingTexts.push(new FloatingText(player.x, player.y - 60, 'HEART SURGE', '#ff6b9d', 2.0));
            }
        } else if (player.affection < 80) {
            player._affectionFull = false;
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
                projectiles.push(proj);
            }
            comp.fireCooldown = 65;
        }
    }

    // ─── Charm helper ────────────────────────────────────────────────────────
    static _charmEnemy(player, e) {
        if (!e || e.isBoss) return;  // bosses are immune to charm
        const dur = 90 + (player.stats.charmDuration || 0);
        // Re-use frozenTimer — this suppresses all enemy movement/attacks automatically
        if ((e.frozenTimer || 0) < dur) e.frozenTimer = dur;
        e._loveCharmed = dur;
    }

    // ─── Shoot — Heart Arrow ─────────────────────────────────────────────────
    static shoot(player) {
        if (player.rangeCooldown > 0) return;
        const target = typeof getClosestEnemy === 'function' ? getClosestEnemy(player.x, player.y) : null;
        if (!target) return;

        const a   = Math.atan2(target.y - player.y, target.x - player.x);
        const spd = player.stats.projectileSpeed || 12;
        const dmg = player.stats.rangeDmg * player.damageMultiplier;
        const sz  = player.stats.projectileSize || 10;

        const proj = new Projectile(
            player.x, player.y,
            { x: Math.cos(a) * spd, y: Math.sin(a) * spd },
            dmg, '#ff6b9d', sz, 'player', 0, false
        );
        proj._loveHeartArrow = true;

        // At high affection, heart arrows pierce through all enemies
        if (player.affection >= 80) {
            proj.pierce = 99;  // effectively infinite pierce
            proj.color  = '#ff1a6b';
            proj.size   = sz + 3;
        }

        // Mark for charm-on-hit (handled in LoveHero.update via frozenTimer check)
        proj.onHit = (enemy) => {
            LoveHero._charmEnemy(player, enemy);
            // Gain affection per hit
            player.affection = Math.min(100, player.affection + 5);
            return undefined; // let normal damage processing continue
        };

        projectiles.push(proj);

        player.affection = Math.min(100, player.affection + 3);
        player.rangeCooldown = player.stats.rangeCd;

        if (typeof audioManager !== 'undefined') audioManager.play('attack_love');
    }

    // ─── Melee — Embrace ─────────────────────────────────────────────────────
    static melee(player) {
        if (player.meleeCooldown > 0) return;

        const radius   = player.meleeRadius || 130;
        const baseDmg  = player.stats.meleeDmg * player.damageMultiplier;
        let hitCount   = 0;

        if (typeof enemies !== 'undefined') {
            enemies.forEach(e => {
                if (Math.hypot(e.x - player.x, e.y - player.y) > radius + e.radius) return;

                // Pull toward player
                const ang = Math.atan2(player.y - e.y, player.x - e.x);
                e.x += Math.cos(ang) * 45;
                e.y += Math.sin(ang) * 45;

                // Double damage on already-charmed enemies
                const finalDmg = e._loveCharmed > 0 ? baseDmg * 2.0 : baseDmg;
                if (typeof e.takeDamage === 'function') e.takeDamage(finalDmg);
                else e.hp -= finalDmg;

                // Charm everything hit (bosses immune)
                LoveHero._charmEnemy(player, e);
                hitCount++;
            });
        }

        if (hitCount > 0) {
            player.affection = Math.min(100, player.affection + hitCount * 9);
            if (typeof createExplosion === 'function') createExplosion(player.x, player.y, '#ff6b9d', 12);
            if (typeof floatingTexts !== 'undefined' && typeof FloatingText !== 'undefined') {
                floatingTexts.push(new FloatingText(player.x, player.y - 50, 'EMBRACE', '#ff9dbf', 2.0));
            }
            if (typeof audioManager !== 'undefined') audioManager.play('melee_love');
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
        if (typeof audioManager !== 'undefined') audioManager.play('anchor_love');
    }

    // ─── Heart of Unity (Ultimate) ───────────────────────────────────────────
    // Triggered separately — e.g. from level-up Ultimate card or game.js hook
    static triggerUltimate(player) {
        if (player._heartUnityActive) return;

        player._heartUnityActive = true;
        player._heartUnityTimer  = 600;  // 10 seconds

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
        if (typeof audioManager !== 'undefined') audioManager.play('anchor_love');

        // Track for achievement
        if (typeof saveData !== 'undefined') {
            saveData.global = saveData.global || {};
            saveData.global.love_unity_count = (saveData.global.love_unity_count || 0) + 1;
        }
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
        // Heart of Unity overlay — soft pink screen wash
        if (player._heartUnityActive) {
            const progress = player._heartUnityTimer / 600;
            ctx.save();
            ctx.fillStyle = `rgba(255, 107, 157, ${0.08 * progress})`;
            if (typeof arena !== 'undefined') {
                ctx.fillRect(arena.camera.x, arena.camera.y, arena.camera.width, arena.camera.height);
            }
            ctx.restore();
        }

        // Draw resonance link lines between enemies
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
                // Bezier curve between the two linked enemies
                const mx = (link.a.x + link.b.x) / 2 + Math.sin(Date.now() * 0.002 + link.life) * 20;
                const my = (link.a.y + link.b.y) / 2 + Math.cos(Date.now() * 0.002 + link.life) * 20;
                ctx.quadraticCurveTo(mx, my, link.b.x, link.b.y);
                ctx.stroke();
                ctx.setLineDash([]);
            }
            ctx.globalAlpha = 1;
            ctx.restore();
        }

        // Draw Love Companion
        if (player._loveCompanion && player._loveCompanion.life > 0) {
            const comp = player._loveCompanion;
            ctx.save();
            // Glow
            const cg = ctx.createRadialGradient(comp.x, comp.y, 3, comp.x, comp.y, comp.radius * 2);
            cg.addColorStop(0, 'rgba(255,157,191,0.5)');
            cg.addColorStop(1, 'rgba(255,107,157,0)');
            ctx.beginPath();
            ctx.arc(comp.x, comp.y, comp.radius * 2, 0, Math.PI * 2);
            ctx.fillStyle = cg;
            ctx.fill();
            // Body
            ctx.beginPath();
            ctx.arc(comp.x, comp.y, comp.radius, 0, Math.PI * 2);
            ctx.fillStyle = '#ff9dbf';
            ctx.fill();
            ctx.strokeStyle = '#ffffff';
            ctx.lineWidth = 1.5;
            ctx.stroke();
            // Tiny heart symbol
            ctx.fillStyle = 'rgba(255,255,255,0.8)';
            ctx.font = '10px serif';
            ctx.textAlign = 'center';
            ctx.fillText('♥', comp.x, comp.y + 4);
            ctx.restore();
        }

        // Affection resource bar (above hero, below HP bar)
        if (!player.isCPU) {
            ctx.save();
            const barW = player.radius * 2.2;
            const bx   = player.x - barW / 2;
            const by   = player.y - player.radius - 30;
            ctx.fillStyle = 'rgba(0,0,0,0.45)';
            ctx.fillRect(bx - 1, by - 1, barW + 2, 7);
            const pct = player.affection / 100;
            const barColor = pct >= 0.8 ? '#ff1a6b' : '#ff6b9d';
            ctx.fillStyle = barColor;
            ctx.fillRect(bx, by, barW * pct, 5);
            if (pct >= 0.8) {
                // Pulse glow when full
                ctx.globalAlpha = 0.5 * (0.5 + 0.5 * Math.sin(Date.now() * 0.008));
                ctx.fillStyle = '#ffffff';
                ctx.fillRect(bx, by, barW * pct, 5);
                ctx.globalAlpha = 1;
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
