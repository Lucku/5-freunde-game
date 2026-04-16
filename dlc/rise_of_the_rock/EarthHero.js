// Earth Hero Logic
// This file would contain specific logic for the Earth hero, 
// such as unique update loops, rendering overrides, or skill tree definitions.

class EarthHero {
    static init(player) {
        player.momentum = 0;
        player.maxMomentum = player.stats.momentumCap || 100;
        player.momentumDecay = 0.5 * (player.stats.momentumDecayMult || 1);
        player.momentumGain = 1.0;
        player.lastMoveAngle = 0;
        player.isRolling = false;
        player.lastHp = player.hp; // Track HP for momentum penalty

        // Shield Props
        player.rockShield = { active: false, hp: 0, maxHp: 0, timer: 0 };

        // Override stats
        player.stats.speed = 4.5;   // Normal walk speed
        player.stats.maxSpeed = 12; // Max speed at full momentum while rolling
        player._rollMinSpeed = 2;   // Min speed when entering roll with 0 momentum
        player.baseDefense = player.stats.defense; // Store for Steel Ball

        // Attach Hooks
        player.customUpdate = (dx, dy) => EarthHero.update(player, dx, dy);
        player.customDraw = (ctx) => EarthHero.draw(player, ctx);
        player.customSpecial = () => EarthHero.useSpecial(player);
        player.melee = () => EarthHero.melee(player); // Tremor Attack
        player.shoot = () => EarthHero.shoot(player); // Rock Throw
        player.customOnDamage = (dmg) => EarthHero.onDamage(player, dmg); // Shield Logic
        player.getAIInput = (p, c, t) => EarthHero.getAIInput(p, c, t); // Custom AI
        player.dash = () => EarthHero.toggleRoll(player); // Dash = toggle rolling

        // Altar Checks
        const active = (saveData.altar && saveData.altar.active) ? saveData.altar.active : [];
        const has = (id) => active.includes(id);

        // Set Special Name
        player.specialName = "TECTONIC SHIELD";
        let cd = 2400; // 40s (Increased from 20s)
        if (has('e1')) cd *= 0.9; // Cooldown Reduction
        player.specialMaxCooldown = cd;

        if (!player.isCPU) {
            const iconEl = document.getElementById('special-icon');
            if (iconEl) iconEl.innerText = "🛡️";
        }
    }

    static toggleRoll(player) {
        // Dash button toggles rolling state on/off.
        // During Ultimate the roll is forced — can't exit it manually.
        if (player.transformActive) return;

        if (player.isRolling) {
            player.isRolling = false;
            player.momentum = 0;
            if (typeof audioManager !== 'undefined') audioManager.stopLoop('attack_earth_roll');
            if (typeof createExplosion === 'function') createExplosion(player.x, player.y, '#8d6e63');
        } else {
            player.isRolling = true;
            // Momentum starts at 0 and builds as the player moves
            if (typeof createExplosion === 'function') createExplosion(player.x, player.y, '#8d6e63');
        }
        // Brief cooldown so the toggle doesn't fire repeatedly from held input
        player.dashCooldown = 25;
    }

    // --- DLC OFFLOADING METHODS ---

    static getSkillTreeWeights() {
        return { RAM_DMG: 0.25, MOMENTUM_CAP: 0.20, ARMOR: 0.20, HEALTH: 0.15, MOMENTUM_DECAY: 0.10, ULT_DAMAGE: 0.10 };
    }

    static getSkillNodeDetails(type, val, desc) {
        if (type === 'MOMENTUM_CAP') { val = 10; desc = "+10 Max Momentum"; }
        if (type === 'RAM_DMG') { val = 0.10; desc = "+10% Ram Damage"; }
        if (type === 'MOMENTUM_DECAY') { val = 0.05; desc = "-5% Momentum Decay"; }
        return { val, desc };
    }

    static applySkillNode(base, node) {
        if (node.type === 'MOMENTUM_CAP') base.momentumCap = (base.momentumCap || 100) + node.value;
        if (node.type === 'RAM_DMG') base.ramDmgMult = (base.ramDmgMult || 1) + node.value;
        if (node.type === 'MOMENTUM_DECAY') base.momentumDecayMult = (base.momentumDecayMult || 1) - node.value;
    }

    static applyUpgrade(player, type) {
        if (type === 'projectile') {
            // Earth Hero: Increase Ram Damage instead of projectiles
            player.stats.ramDmgMult = (player.stats.ramDmgMult || 1) + 0.2; // +20% Ram Damage
            if (window.showNotification) window.showNotification("RAM DAMAGE INCREASED!");
            return true;
        }
        return false;
    }

    static modifyUpgradeOption(player, opt) {
        if (opt.id === 'projectile') {
            opt.title = 'Ram Damage';
            opt.desc = '+20% Ram Damage';
        }
        return opt;
    }

    static startObjective(objective) {
        objective.type = 'TECTONIC_SHIFT';
        objective.target = 5000; // Deal 5000 Ram Damage
        objective.current = 0;
        showNotification("OBJECTIVE: CRUSH ENEMIES (RAM DAMAGE)!");
    }

    static checkObjectiveCompletion(objective, wave) {
        if (objective.type === 'TECTONIC_SHIFT') {
            if (objective.current >= objective.target) {
                objective.state = 'COMPLETED';
                showNotification("CRUSHING VICTORY!");
                triggerStory(wave);
                return true;
            }
        }
        return false;
    }

    static drawObjectiveUI(objective, objText, objFill) {
        if (objective.type === 'TECTONIC_SHIFT') {
            objText.innerText = `RAM DAMAGE: ${Math.floor(objective.current)} / ${objective.target}`;
            objFill.style.width = `${(objective.current / objective.target) * 100}%`;
            objFill.style.backgroundColor = '#8d6e63';
            return true;
        }
        return false;
    }

    static useSpecial(player) {
        // TECTONIC SHIELD
        // Grants temporary rock armor based on Max HP

        const shieldHp = 50 + (player.maxHp * 0.5); // Base 50 + 50% Max HP
        const duration = 300; // 5 seconds

        player.rockShield = {
            active: true,
            hp: shieldHp,
            maxHp: shieldHp,
            timer: duration
        };

        showNotification("TECTONIC SHIELD!");
        createExplosion(player.x, player.y, '#8d6e63');

        // Visual debris
        if (typeof particles !== 'undefined') {
            for (let i = 0; i < 15; i++) {
                const angle = (Math.PI * 2 / 15) * i;
                particles.push(new Particle(player.x, player.y, '#5d4037', { x: Math.cos(angle) * 3, y: Math.sin(angle) * 3 }));
            }
        }

        // Altar Checks - Synergy
        const active = (saveData.altar && saveData.altar.active) ? saveData.altar.active : [];
        const has = (id) => active.includes(id);

        if (has('e2')) {
            // E2: Thorns Logic could go here or modify stats
            player.rockShield.hp *= 1.2;
        }

        return true;
    }

    static onDamage(player, dmg) {
        if (player.rockShield && player.rockShield.active) {

            // Absorb damage (Fragile Shield: Takes 2x Damage)
            const damageToShield = dmg * 2;
            player.rockShield.hp -= damageToShield;

            floatingTexts.push(new FloatingText(player.x, player.y - 40, "BLOCK", "#8d6e63", 20));

            // Visual Effect
            createExplosion(player.x, player.y, '#5d4037', 10);

            if (player.rockShield.hp <= 0) {
                player.rockShield.active = false;
                showNotification("SHIELD BROKEN!");
                createExplosion(player.x, player.y, '#8d6e63', 40); // Big break effect
            }

            return true; // Prevent default damage
        }
        return false;
    }

    static melee(player) {
        if (player.meleeCooldown > 0) return;

        // Tremor: A localized earthquake
        // Scales with Momentum and Melee Radius upgrades
        // CHANGE: Use fixed base (100) instead of maxMomentum for ratio so increasing valid Max Momentum actually buffs damage/radius
        const momentumRatio = player.momentum / 100;
        const radius = (player.meleeRadius || 120) * (1 + momentumRatio * 0.5); // Radius + 0-50+%
        const damage = player.stats.meleeDmg * player.damageMultiplier * (0.5 + momentumRatio); // 50% to 150%+ Damage

        // Visuals
        createExplosion(player.x, player.y, '#5d4037'); // Dark Brown

        // Shockwave Effect
        if (typeof particles !== 'undefined') {
            particles.push({
                x: player.x,
                y: player.y,
                radius: 10,
                maxRadius: radius,
                alpha: 1,
                color: '#8d6e63',
                lineWidth: 10,
                update: function () {
                    this.radius += (this.maxRadius - this.radius) * 0.15 + 2;
                    this.alpha -= 0.04;
                    this.lineWidth *= 0.95;
                },
                draw: function () {
                    if (this.alpha <= 0) return;
                    // Use global ctx
                    const c = window.ctx || document.getElementById('gameCanvas').getContext('2d');
                    c.save();
                    c.globalAlpha = this.alpha;
                    c.beginPath();
                    c.arc(this.x, this.y, this.radius, 0, Math.PI * 2);
                    c.strokeStyle = this.color;
                    c.lineWidth = this.lineWidth;
                    c.stroke();
                    c.restore();
                }
            });
        }

        // Hit Enemies
        if (typeof enemies !== 'undefined') {
            const active = player.activeAltarNodes || [];
            const has = (id) => active.includes(id);

            enemies.forEach(e => {
                const dist = Math.hypot(e.x - player.x, e.y - player.y);
                if (dist < radius) {
                    e.hp -= damage;

                    // c12: Mudslide (Slow)
                    if (has('c12')) {
                        e.slowTimer = 180; // Slow for 3 seconds
                    }

                    // c21: Grounding (Electric Shockwaves)
                    if (has('c21') && typeof projectiles !== 'undefined') {
                        for (let i = 0; i < 3; i++) {
                            const a = Math.random() * Math.PI * 2;
                            projectiles.push(new Projectile(
                                e.x, e.y,
                                { x: Math.cos(a) * 5, y: Math.sin(a) * 5 },
                                damage * 0.3, '#f1c40f', 5, 'friend', 0
                            ));
                        }
                    }

                    // Knockback
                    const angle = Math.atan2(e.y - player.y, e.x - player.x);
                    const force = 10 + (momentumRatio * 20);
                    e.x += Math.cos(angle) * force;
                    e.y += Math.sin(angle) * force;

                    // Floating Text
                    if (typeof FloatingText !== 'undefined') {
                        floatingTexts.push(new FloatingText(e.x, e.y - 20, Math.floor(damage), "#fff", 20));
                    }
                }
            });
        }

        player.meleeCooldown = player.meleeMaxCooldown * player.cooldownMultiplier;
    }

    static shoot(player) {
        if (player.isRolling) return; // No shooting while rolling
        if (player.rangeCooldown > 0) return;

        if (typeof audioManager !== 'undefined') {
            audioManager.playAttack('earth');
        }

        // Aim
        let angle = player.aimAngle;
        // If no aim (keyboard only?), use facing
        if (angle === undefined) {
            angle = player.lastMoveAngle || 0;
        }

        // Stats
        const speed = 10;
        const dmg = Math.max(1, player.stats.meleeDmg * 0.25); // 25% of Melee Damage

        // Cooldown: 45 frames (0.75s) - Moderate fire rate
        const cooldown = 45 * player.cooldownMultiplier;

        // Build shot angles (multi-shot support)
        const shots = [angle];
        if (player.buffs && player.buffs.multi > 0) {
            shots.push(angle - 0.25, angle + 0.25);
        }

        if (typeof Projectile !== 'undefined') {
            shots.forEach(a => {
                const vel = { x: Math.cos(a) * speed, y: Math.sin(a) * speed };
                const proj = new Projectile(
                    player.x, player.y,
                    vel,
                    dmg,
                    '#8d6e63', // Rock Brown
                    12, // Size
                    'earth',
                    25, // Knockback
                    false // isEnemy
                );
                proj.owner = player;
                proj.pierce = 1;
                proj.life = 25;
                if (typeof projectiles !== 'undefined') projectiles.push(proj);
                else if (window.projectiles) window.projectiles.push(proj);
            });
            if (typeof currentRunStats !== 'undefined') currentRunStats.missilesFired++;
        }

        player.rangeCooldown = cooldown;
    }

    static update(player, dx, dy) {
        // Custom Movement Logic
        // Instead of direct velocity, we apply force to momentum

        const active = (saveData.altar && saveData.altar.active) ? saveData.altar.active : [];
        const has = (id) => active.includes(id);

        // --- SHIELD TIMER LOGIC ---
        if (player.rockShield && player.rockShield.active) {
            player.rockShield.timer--;
            if (player.rockShield.timer <= 0) {
                player.rockShield.active = false;
                showNotification("SHIELD EXPIRED");
                // Visual pop
                if (typeof createExplosion === 'function') createExplosion(player.x, player.y, '#8d6e63', 20);
            }

            // --- PROJECTILE REFLECTION ---
            // Check for nearby enemy projectiles and reflect them
            if (typeof projectiles !== 'undefined') {
                const reflectRadius = 70; // Slightly larger than player to catch them before impact
                // Use a standard for loop for safety if projectiles is modified
                for (let i = 0; i < projectiles.length; i++) {
                    const p = projectiles[i];
                    if (p.isEnemy) { // Only reflect enemy projectiles
                        const dist = Math.hypot(p.x - player.x, p.y - player.y);
                        if (dist < reflectRadius) {
                            // REFLECT!
                            p.isEnemy = false; // Now it's friendly
                            p.velocity.x *= -1.5; // Return to sender faster
                            p.velocity.y *= -1.5;
                            p.color = '#8d6e63'; // Change to Earth color
                            p.damage = (p.damage || 10) * 2; // Bonus damage
                            p.radius = (p.radius || 4) + 2; // Make it bigger

                            // Move it away slightly to prevent immediate re-collision checks issues if any
                            p.x += p.velocity.x * 2;
                            p.y += p.velocity.y * 2;

                            // SFX / VFX
                            if (typeof createExplosion !== 'undefined') createExplosion(p.x, p.y, '#fff', 5);
                            if (typeof audioManager !== 'undefined') audioManager.play('attack_metal'); // Shield deflect sound
                        }
                    }
                }
            }
        }

        // --- ULTIMATE: OBSIDIAN GOLEM ---
        if (player.transformActive) {
            // Count each new activation (rising-edge detection)
            if (!player._golemWasActive && typeof saveData !== 'undefined') {
                saveData.global.earth_golem_summons = (saveData.global.earth_golem_summons || 0) + 1;
            }
            player._golemWasActive = true;

            // Infinite Momentum
            player.momentum = player.maxMomentum;
            player.isRolling = true;

            // Duration Logic (15s)
            if (!player.transformTimer) player.transformTimer = 900;
            player.transformTimer--;
            if (player.transformTimer <= 0) {
                player.transformActive = false;
                player.transformTimer = 0;
                player._golemWasActive = false;
            }
        } else {
            player._golemWasActive = false;
        }


        const isMoving = (dx !== 0 || dy !== 0);

        if (player.isRolling) {
            // ── ROLLING STATE: momentum-based movement ────────────────────
            if (isMoving) {
                const moveAngle = Math.atan2(dy, dx);
                let angleDiff = moveAngle - player.lastMoveAngle;
                while (angleDiff <= -Math.PI) angleDiff += Math.PI * 2;
                while (angleDiff > Math.PI) angleDiff -= Math.PI * 2;

                const isCardinal = (Math.abs(Math.sin(moveAngle)) < 0.25 || Math.abs(Math.cos(moveAngle)) < 0.25);

                if (Math.abs(angleDiff) > 2.0) {
                    player.momentum = 0;
                } else if (Math.abs(angleDiff) > 1.0) {
                    player.momentum *= 0.5;
                } else if (Math.abs(angleDiff) < 0.3 && isCardinal) {
                    player.momentum = Math.min(player.maxMomentum, player.momentum + player.momentumGain);
                } else {
                    player.momentum *= 0.98;
                }

                player.lastMoveAngle = moveAngle;

                // Magma Roll (c11)
                if (has('c11') && frame % 15 === 0) {
                    if (typeof createExplosion === 'function') createExplosion(player.x, player.y, '#e74c3c');
                    if (typeof enemies !== 'undefined') {
                        enemies.forEach(e => {
                            if (Math.hypot(e.x - player.x, e.y - player.y) < 60) {
                                e.hp -= 10 * player.damageMultiplier;
                            }
                        });
                    }
                }
            } else {
                // Decay momentum while not pressing movement keys
                player.momentum = Math.max(0, player.momentum - player.momentumDecay);
            }

            // Calculate speed from momentum
            const speedRatio = player.momentum / player.maxMomentum;
            const rollMinSpeed = player._rollMinSpeed || 2;
            let currentSpeed = rollMinSpeed + (player.stats.maxSpeed - rollMinSpeed) * speedRatio;
            if (player.buffs.speed > 0) currentSpeed *= 1.5;
            currentSpeed *= player.speedMultiplier;

            if (player.momentum > 0) {
                player.x += Math.cos(player.lastMoveAngle) * currentSpeed;
                player.y += Math.sin(player.lastMoveAngle) * currentSpeed;
            }
        } else {
            // ── NORMAL STATE: direct movement like other heroes ───────────
            if (isMoving) {
                player.lastMoveAngle = Math.atan2(dy, dx);
                let currentSpeed = player.stats.speed;
                if (player.buffs.speed > 0) currentSpeed *= 1.5;
                currentSpeed *= player.speedMultiplier;
                player.x += dx * currentSpeed;
                player.y += dy * currentSpeed;
            }
            player.momentum = 0;
        }

        // Steel Ball (c15)
        if (has('c15')) {
            player.stats.defense = (player.baseDefense || 0) + (player.isRolling ? 0.5 : 0);
        }

        // Manage Rolling Sound
        if (typeof audioManager !== 'undefined') {
            if (player.isRolling && player.momentum > 10) {
                audioManager.startLoop('attack_earth_roll');
            } else {
                audioManager.stopLoop('attack_earth_roll');
            }
        }

        // Cooldown Management (Since we override update, we must handle this)
        if (player.meleeCooldown > 0) player.meleeCooldown--;
        if (player.rangeCooldown > 0) player.rangeCooldown--;
        if (player.specialCooldown > 0) player.specialCooldown--;
        if (player._rollImpactCooldown > 0) player._rollImpactCooldown--;

        // Clamp to Arena
        if (typeof arena !== 'undefined') {
            player.x = Math.max(player.radius, Math.min(arena.width - player.radius, player.x));
            player.y = Math.max(player.radius, Math.min(arena.height - player.radius, player.y));

            // Obstacle Collision
            if (arena.obstacles) {
                arena.obstacles.forEach(obs => {
                    // Simple AABB vs Circle collision check
                    // Find closest point on rectangle to circle center
                    const closestX = Math.max(obs.x, Math.min(player.x, obs.x + obs.w));
                    const closestY = Math.max(obs.y, Math.min(player.y, obs.y + obs.h));

                    const dx = player.x - closestX;
                    const dy = player.y - closestY;
                    const distance = Math.sqrt(dx * dx + dy * dy);

                    if (distance < player.radius) {
                        // Collision detected!
                        // Resolve overlap
                        const overlap = player.radius - distance;

                        // Normalize vector
                        let nx = dx / distance;
                        let ny = dy / distance;

                        // Handle edge case where center is inside rectangle (distance is 0)
                        if (distance === 0) {
                            nx = 1; ny = 0; // Push right by default
                        }

                        player.x += nx * overlap;
                        player.y += ny * overlap;

                        // Stop momentum on collision
                        player.momentum = 0;

                        // Visual feedback
                        if (typeof createExplosion === 'function') createExplosion(closestX, closestY, '#8d6e63');
                    }
                });
            }
        }

        // Collision Damage Logic (Ramming)
        if (player.isRolling && player.momentum > 20) {
            // Check collision with enemies
            // We need access to the enemies array. Assuming global 'enemies' from game.js
            if (typeof enemies !== 'undefined') {
                enemies.forEach((e, index) => {
                    const dist = Math.hypot(e.x - player.x, e.y - player.y);
                    if (dist < player.radius + e.radius) {
                        // RAMMING SPEED!
                        // Changed to fixed base 100 so higher max momentum = higher damage
                        let damage = player.stats.meleeDmg * (player.momentum / 100) * player.damageMultiplier * (player.stats.ramDmgMult || 1);

                        // Ice Breaker (c13)
                        if (has('c13') && e.frozenTimer > 0) {
                            damage *= 3;
                            floatingTexts.push(new FloatingText(e.x, e.y - 60, "SHATTER!", "#aaddff", 30));
                            e.frozenTimer = 0;
                        }

                        // Ultimate Bonus
                        if (player.transformActive) damage *= 2;

                        // Apply Damage
                        e.hp -= damage;

                        // Impact SFX (debounced so it doesn't fire every frame)
                        if (typeof audioManager !== 'undefined' && !(player._rollImpactCooldown > 0)) {
                            audioManager.play('attack_earth_roll_impact');
                            player._rollImpactCooldown = 30; // ~0.5s at 60fps
                        }

                        // Nature's Embrace (c14)
                        if (has('c14')) {
                            player.hp = Math.min(player.maxHp, player.hp + player.maxHp * 0.01);
                            floatingTexts.push(new FloatingText(player.x, player.y - 40, "+HP", "#2ecc71", 20));
                        }

                        // Objective Tracking
                        if (typeof currentObjective !== 'undefined' && currentObjective && currentObjective.type === 'TECTONIC_SHIFT') {
                            currentObjective.current += damage;
                        }

                        // Visuals
                        if (typeof createExplosion === 'function') createExplosion(e.x, e.y, '#8d6e63');
                        if (typeof FloatingText === 'function' && typeof floatingTexts !== 'undefined') {
                            floatingTexts.push(new FloatingText(e.x, e.y - 20, Math.floor(damage), "#8d6e63", 25));
                        }

                        // Knockback
                        const angle = Math.atan2(e.y - player.y, e.x - player.x);
                        e.x += Math.cos(angle) * player.stats.knockback;
                        e.y += Math.sin(angle) * player.stats.knockback;

                        // Slight momentum loss on impact
                        player.momentum *= 0.95;
                    }
                });
            }

            // Versus Mode: Check collision with other players
            if (typeof isVersusMode !== 'undefined' && isVersusMode) {
                const targets = [];
                // Add global P1 if it's not 'this' player
                // Note: 'player' variable here comes from argument, shadowing global 'player'
                if (typeof window.player !== 'undefined' && window.player !== player) targets.push(window.player);

                // Add additional players
                if (typeof window.additionalPlayers !== 'undefined') {
                    window.additionalPlayers.forEach(p => {
                        if (p !== player) targets.push(p);
                    });
                }

                targets.forEach(e => {
                    const dist = Math.hypot(e.x - player.x, e.y - player.y);
                    if (dist < player.radius + e.radius) {
                        if (e.isInvincible) return;

                        // RAM DAMAGE calculation
                        let damage = player.stats.meleeDmg * (player.momentum / 100) * player.damageMultiplier * (player.stats.ramDmgMult || 1);

                        // Ultimate Bonus
                        if (player.transformActive) damage *= 2;

                        // Apply Damage
                        e.hp -= damage;

                        // Visuals
                        if (typeof createExplosion === 'function') createExplosion(e.x, e.y, '#8d6e63');
                        if (typeof FloatingText === 'function' && typeof floatingTexts !== 'undefined') {
                            floatingTexts.push(new FloatingText(e.x, e.y - 20, Math.floor(damage), "#8d6e63", 25));
                        }

                        // Knockback
                        const angle = Math.atan2(e.y - player.y, e.x - player.x);
                        // Use default knockback if stat undefined (fallback)
                        const knockback = player.stats.knockback || 10;
                        e.x += Math.cos(angle) * knockback;
                        e.y += Math.sin(angle) * knockback;

                        // Slight momentum loss on impact
                        player.momentum *= 0.95;
                    }
                });
            }
        }

        return true; // Return true to block default Player.update movement
    }

    static draw(player, ctx) {
        ctx.save();
        ctx.translate(player.x, player.y);

        const r   = player.radius;
        const t   = Date.now() / 1000;
        const rot = (player.x + player.y) * 0.05;
        const maxMom = player.maxMomentum || 100;
        const momPct = Math.max(0, Math.min(1, player.momentum / maxMom));
        const isObsidian = player.transformActive;
        const baseColor  = isObsidian ? '#1c1010' : player.stats.color;
        const darkColor  = isObsidian ? '#080404' : shadeColor(player.stats.color, -50);
        const lightColor = isObsidian ? '#3a2828' : shadeColor(player.stats.color, +42);
        const accentClr  = isObsidian ? '#f1c40f' : player.stats.color;

        if (player.isRolling) {
            // ── ROLLING: momentum aura + ultimate aura + boulder ─────────

            // Momentum aura ring
            if (player.momentum > 20) {
                ctx.globalAlpha = Math.min(0.72, (player.momentum - 20) / 80 * 0.72);
                ctx.beginPath(); ctx.arc(0, 0, r + 13, 0, Math.PI * 2);
                ctx.strokeStyle = accentClr; ctx.lineWidth = 3.5; ctx.stroke();
                ctx.globalAlpha = 1;
            }

            // Ultimate transform aura
            if (isObsidian) {
                const hc = '#f1c40f';
                const ag = ctx.createRadialGradient(0, 0, r * 0.4, 0, 0, r + 40);
                ag.addColorStop(0,   hc + 'BB'); ag.addColorStop(0.5, hc + '44'); ag.addColorStop(1, hc + '00');
                ctx.beginPath(); ctx.arc(0, 0, r + 40, 0, Math.PI * 2); ctx.fillStyle = ag; ctx.fill();
                ctx.save();
                ctx.shadowColor = hc; ctx.shadowBlur = 14;
                ctx.lineWidth = 2.5; ctx.strokeStyle = hc + 'CC';
                const a1 = t * 2.2;
                ctx.beginPath(); ctx.arc(0, 0, r + 24, a1, a1 + Math.PI * 1.3); ctx.stroke();
                const a2 = -t * 1.6 + 1;
                ctx.beginPath(); ctx.arc(0, 0, r + 24, a2, a2 + Math.PI * 0.85); ctx.stroke();
                ctx.restore();
            }

            // Boulder body
            ctx.save();
            ctx.rotate(rot);

            ctx.beginPath();
            ctx.ellipse(r * 0.08, r * 0.06, r * 1.08, r * 0.72, 0, 0, Math.PI * 2);
            ctx.fillStyle = 'rgba(0,0,0,0.32)'; ctx.fill();

            const bg = ctx.createRadialGradient(-r * 0.32, -r * 0.38, r * 0.04, 0, 0, r);
            bg.addColorStop(0,    lightColor);
            bg.addColorStop(0.45, baseColor);
            bg.addColorStop(1,    darkColor);
            ctx.beginPath(); ctx.arc(0, 0, r, 0, Math.PI * 2);
            ctx.fillStyle = bg; ctx.fill();
            ctx.strokeStyle = '#111'; ctx.lineWidth = 2.5; ctx.stroke();

            ctx.beginPath(); ctx.arc(0, 0, r - 3, 0, Math.PI * 2);
            ctx.strokeStyle = 'rgba(0,0,0,0.30)'; ctx.lineWidth = 1.8; ctx.stroke();

            ctx.save();
            ctx.beginPath(); ctx.arc(0, 0, r - 1, 0, Math.PI * 2); ctx.clip();

            const crackClr = isObsidian ? 'rgba(241,196,15,0.28)' : 'rgba(0,0,0,0.28)';
            const hlClr    = isObsidian ? 'rgba(255,220,50,0.10)'  : 'rgba(255,255,255,0.09)';
            const segs = [[[-7,-12],[4,2],[13,13]], [[13,-7],[1,-1],[-9,11]], [[-12,4],[-1,-2],[9,-13]]];
            ctx.lineCap = 'round';
            segs.forEach(pts => {
                ctx.strokeStyle = crackClr; ctx.lineWidth = 1.3;
                ctx.beginPath(); ctx.moveTo(...pts[0]); pts.slice(1).forEach(p => ctx.lineTo(...p)); ctx.stroke();
                ctx.strokeStyle = hlClr; ctx.lineWidth = 0.9;
                ctx.beginPath(); ctx.moveTo(pts[0][0]+0.7, pts[0][1]+0.7); pts.slice(1).forEach(p => ctx.lineTo(p[0]+0.7,p[1]+0.7)); ctx.stroke();
            });

            [[-5,-8,2.5],[8,-5,1.8],[-9,6,2.2],[6,9,2.0],[0,-13,1.5]].forEach(([px,py,pr2]) => {
                ctx.fillStyle = 'rgba(0,0,0,0.22)';
                ctx.beginPath(); ctx.arc(px, py, pr2, 0, Math.PI*2); ctx.fill();
                ctx.fillStyle = 'rgba(255,255,255,0.07)';
                ctx.beginPath(); ctx.arc(px+0.6, py+0.6, pr2*0.5, 0, Math.PI*2); ctx.fill();
            });
            ctx.restore();
            ctx.restore(); // end rot

        } else {
            // ── NORMAL STATE: standard hero sprite ───────────────────────

            // Subtle earth glow ring to hint rolling capability
            ctx.globalAlpha = 0.20 + Math.sin(t * 1.8) * 0.07;
            ctx.beginPath(); ctx.arc(0, 0, r + 7, 0, Math.PI * 2);
            ctx.strokeStyle = baseColor; ctx.lineWidth = 2.5; ctx.stroke();
            ctx.globalAlpha = 1;

            // Standard armored hero sprite (rotated to face aim direction)
            if (typeof drawHeroSprite === 'function') {
                ctx.save();
                ctx.rotate(player.aimAngle);
                drawHeroSprite(ctx, isObsidian ? '#1c1010' : player.stats.color, r);
                ctx.restore();
            }

            // Dashed ring indicator: "ROLL available"
            ctx.save();
            ctx.setLineDash([4, 5]);
            ctx.beginPath(); ctx.arc(0, 0, r + 5, 0, Math.PI * 2);
            ctx.strokeStyle = accentClr + '66'; ctx.lineWidth = 1.5; ctx.stroke();
            ctx.setLineDash([]);
            ctx.restore();
        }

        // ── Tectonic shield (orbiting rock chunks — always visible) ──────
        if (player.rockShield && player.rockShield.active) {
            const shieldPct = Math.max(0, player.rockShield.hp / player.rockShield.maxHp);
            const shieldR   = r + 10;
            ctx.save();
            ctx.rotate(t * 0.85);
            for (let i = 0; i < 4; i++) {
                const ang = (i / 4) * Math.PI * 2;
                ctx.save();
                ctx.rotate(ang);
                ctx.translate(shieldR, 0);
                const cg = ctx.createRadialGradient(-2, -2, 1, 0, 0, 6);
                cg.addColorStop(0, `rgba(180,140,110,${0.5 + shieldPct * 0.4})`);
                cg.addColorStop(1, `rgba(90,65,50,${0.4 + shieldPct * 0.3})`);
                ctx.fillStyle = cg;
                ctx.beginPath();
                ctx.moveTo(-4,-4); ctx.lineTo(5,-3); ctx.lineTo(5,4); ctx.lineTo(-3,5); ctx.closePath();
                ctx.fill();
                ctx.strokeStyle = `rgba(220,180,140,${0.3 + shieldPct * 0.3})`;
                ctx.lineWidth = 0.8; ctx.stroke();
                ctx.restore();
            }
            // Faint orbit ring
            ctx.strokeStyle = `rgba(141,110,99,${0.20 + shieldPct * 0.25})`;
            ctx.lineWidth = 1.5;
            ctx.beginPath(); ctx.arc(0, 0, shieldR + 3, 0, Math.PI * 2); ctx.stroke();
            ctx.restore();
        }

        ctx.restore(); // end translate

        // ── Momentum bar (world space) — only while rolling ──────────────
        if (player.isRolling) {
            const barW = 42, barH = 5, yOff = 30;
            const bx = player.x - barW / 2, by = player.y + yOff;
            const fillW = momPct * barW;
            const isMax = momPct >= 0.95;

            ctx.fillStyle = 'rgba(0,0,0,0.55)';
            ctx.fillRect(bx - 1, by - 1, barW + 2, barH + 2);
            ctx.fillStyle = '#1a1a1a';
            ctx.fillRect(bx, by, barW, barH);

            if (isMax) { ctx.shadowBlur = 10; ctx.shadowColor = '#e74c3c'; ctx.fillStyle = '#e74c3c'; }
            else        { ctx.fillStyle = '#f1c40f'; }
            ctx.fillRect(bx, by, fillW, barH);
            ctx.shadowBlur = 0;

            ctx.fillStyle = 'rgba(255,255,255,0.10)';
            ctx.fillRect(bx, by, fillW, barH * 0.4);

            ctx.strokeStyle = 'rgba(255,255,255,0.14)';
            ctx.lineWidth = 0.8;
            ctx.strokeRect(bx, by, barW, barH);

        }

        return true; // Block default draw
    }

    static getAIInput(player, controller, target) {
        // Stick to Cardinal Directions to build Momentum ("Roll")
        // Try to "Ram" the player by aligning on one axis and charging.

        if (!target) return { x: 0, y: 0, shoot: false, melee: false };

        const dx = target.x - player.x;
        const dy = target.y - player.y;
        const dist = Math.hypot(dx, dy);

        // Cardinal Alignment Logic
        // Whichever axis has greater distance, prioritize that one to close gap
        // But if we are already moving fast, commit to current axis until we hit or stop.

        let moveX = 0;
        let moveY = 0;

        // If high momentum, try to maintain current axis unless way off
        const currentAngle = player.lastMoveAngle || 0;
        const isMovingHoriz = Math.abs(Math.cos(currentAngle)) > 0.8;
        const isMovingVert = Math.abs(Math.sin(currentAngle)) > 0.8;

        if (player.momentum > 40) {
            // Commit to current direction
            if (isMovingHoriz) {
                moveX = Math.sign(dx) || 1;
                // However, if we overshoot (passed the target in X), we should probably stop or turn.
                // But the sign(dx) handles direction. 
                // If |dy| becomes huge (player dodged), we might want to switch.
                if (Math.abs(dy) > 200) moveX = 0; // Curve? or Stop?
            } else if (isMovingVert) {
                moveY = Math.sign(dy) || 1;
                if (Math.abs(dx) > 200) moveY = 0;
            } else {
                // Diagonal? Should resolve to cardinal.
                if (Math.abs(dx) > Math.abs(dy)) moveX = Math.sign(dx);
                else moveY = Math.sign(dy);
            }
        } else {
            // Low momentum: Turn to face nicely
            if (Math.abs(dx) > Math.abs(dy)) {
                moveX = Math.sign(dx);
            } else {
                moveY = Math.sign(dy);
            }
        }

        // Just enforce strict cardinal for input
        if (moveX !== 0) moveY = 0;

        let melee = false;
        let shoot = false;
        let special = false;

        // Shoot (Rock Throw) at mid-range
        if (dist < 400 && dist > 100 && Math.random() < 0.05) shoot = true;

        // Melee (Tremor) if close
        if (dist < 150) melee = true;

        // Special (Shield) if about to hit or being hit
        if (dist < 200 && (player.hp < player.maxHp * 0.5) && Math.random() < 0.02) special = true;

        // Aim is just direction
        const aimAngle = Math.atan2(dy, dx);

        // AI always wants to be in rolling mode for ramming; trigger the toggle if not rolling
        const dash = !player.isRolling && (player.dashCooldown <= 0);

        return { x: moveX, y: moveY, aimAngle, shoot, melee, dash, special, pause: false };
    }
}

// Register to global scope if needed, or just let the DLC index.js use it.
window.EarthHero = EarthHero;
