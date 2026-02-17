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

        // Override stats for "Rolling Boulder" feel
        player.stats.speed = 2; // Slow base speed
        player.stats.maxSpeed = 12; // High max speed with momentum
        player.baseDefense = player.stats.defense; // Store for Steel Ball

        // Attach Hooks
        player.customUpdate = (dx, dy) => EarthHero.update(player, dx, dy);
        player.customDraw = (ctx) => EarthHero.draw(player, ctx);
        player.customSpecial = () => EarthHero.useSpecial(player);
        player.melee = () => EarthHero.melee(player); // Tremor Attack
        player.shoot = () => EarthHero.shoot(player); // Rock Throw
        player.customOnDamage = (dmg) => EarthHero.onDamage(player, dmg); // Shield Logic
        player.getAIInput = (p, c, t) => EarthHero.getAIInput(p, c, t); // Custom AI

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

        const vel = { x: Math.cos(angle) * speed, y: Math.sin(angle) * speed };

        if (typeof Projectile !== 'undefined') {
            const proj = new Projectile(
                player.x, player.y,
                vel,
                dmg,
                '#8d6e63', // Rock Brown
                12, // Size
                'earth',
                25, // Knockback (Increased for effect)
                false // isEnemy
            );
            proj.owner = player;

            // Optional: Allow rock to pierce 1 enemy
            proj.pierce = 1;

            // Low Range: ~250px (25 frames * 10 speed)
            proj.life = 25;

            if (typeof projectiles !== 'undefined') projectiles.push(proj);
            else if (window.projectiles) window.projectiles.push(proj);

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
            // Infinite Momentum
            player.momentum = player.maxMomentum;
            player.isRolling = true;

            // Duration Logic (15s)
            if (!player.transformTimer) player.transformTimer = 900;
            player.transformTimer--;
            if (player.transformTimer <= 0) {
                player.transformActive = false;
                player.transformTimer = 0;
            }
        }


        const isMoving = (dx !== 0 || dy !== 0);

        if (isMoving) {
            const moveAngle = Math.atan2(dy, dx);
            let angleDiff = moveAngle - player.lastMoveAngle;
            // Normalize angle
            while (angleDiff <= -Math.PI) angleDiff += Math.PI * 2;
            while (angleDiff > Math.PI) angleDiff -= Math.PI * 2;

            // Momentum Logic: Only gain if moving straight AND in cardinal direction (not diagonal)
            // Check if angle is close to 0, PI/2, PI, -PI/2
            const isCardinal = (Math.abs(Math.sin(moveAngle)) < 0.25 || Math.abs(Math.cos(moveAngle)) < 0.25);

            if (Math.abs(angleDiff) > 2.0) {
                // Sharp Turn (e.g. 180 degree reversal): Lose ALL Momentum
                player.momentum = 0;
            } else if (Math.abs(angleDiff) > 1.0) {
                // 90 Degree Turn (approx 1.57 rad): Lose significant momentum
                player.momentum *= 0.5;
            } else if (Math.abs(angleDiff) < 0.3 && isCardinal) {
                // Straight line & Cardinal: Gain Momentum
                player.momentum = Math.min(player.maxMomentum, player.momentum + player.momentumGain);
            } else {
                // Turning or Diagonal: Lose Momentum significantly
                player.momentum *= 0.98;
            }

            player.lastMoveAngle = moveAngle;

            player.isRolling = true;

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
            // Decay Momentum
            player.momentum = Math.max(0, player.momentum - player.momentumDecay);
            if (player.momentum < 5) player.isRolling = false;
        }

        // Steel Ball (c15)
        if (has('c15')) {
            player.stats.defense = (player.baseDefense || 0) + (player.isRolling ? 0.5 : 0);
        }

        // Manage Rolling Sound
        if (typeof audioManager !== 'undefined') {
            if (player.isRolling && player.momentum > 10) { // Only play if actually rolling with some speed
                audioManager.startLoop('attack_earth_roll');
            } else {
                audioManager.stopLoop('attack_earth_roll');
            }
        }

        // Calculate Speed based on Momentum
        // Base speed + (Max Speed - Base Speed) * (Momentum / Max)
        const speedRatio = player.momentum / player.maxMomentum;
        let currentSpeed = player.stats.speed + (player.stats.maxSpeed - player.stats.speed) * speedRatio;

        // Apply Speed Buffs
        if (player.buffs.speed > 0) currentSpeed *= 1.5;
        currentSpeed *= player.speedMultiplier;

        // Apply Movement
        if (player.momentum > 0) {
            player.x += Math.cos(player.lastMoveAngle) * currentSpeed;
            player.y += Math.sin(player.lastMoveAngle) * currentSpeed;
        }

        // Cooldown Management (Since we override update, we must handle this)
        if (player.meleeCooldown > 0) player.meleeCooldown--;
        if (player.rangeCooldown > 0) player.rangeCooldown--;
        if (player.specialCooldown > 0) player.specialCooldown--;

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

        // --- Aim Indicator ---
        let aimAngle = player.aimAngle;
        if (aimAngle === undefined) aimAngle = player.lastMoveAngle || 0;

        ctx.save();
        ctx.rotate(aimAngle);

        // Draw Directional Arrow
        ctx.beginPath();
        // Line out
        ctx.moveTo(player.radius + 5, 0);
        ctx.lineTo(player.radius + 35, 0);
        // Arrowhead
        ctx.lineTo(player.radius + 25, -6);
        ctx.moveTo(player.radius + 35, 0);
        ctx.lineTo(player.radius + 25, 6);

        ctx.lineCap = 'round';
        ctx.lineWidth = 3;
        ctx.strokeStyle = 'rgba(141, 110, 99, 0.6)'; // Semi-transparent brown
        ctx.stroke();

        ctx.restore();

        // Rotate based on movement to simulate rolling
        // We can use a global frame counter or player.x/y for rotation
        const rotation = (player.x + player.y) * 0.05;
        ctx.rotate(rotation);

        // Draw Boulder Body
        ctx.beginPath();
        ctx.arc(0, 0, player.radius, 0, Math.PI * 2);
        ctx.fillStyle = player.transformActive ? '#212121' : player.stats.color; // Obsidian if transformed
        ctx.fill();

        // Ultimate Aura
        if (player.transformActive) {
            ctx.strokeStyle = '#f1c40f';
            ctx.lineWidth = 4;
            ctx.stroke();
        }

        // Draw "Cracks" or texture to show rotation
        ctx.strokeStyle = '#5d4037'; // Darker brown
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.moveTo(-10, -10); ctx.lineTo(10, 10);
        ctx.moveTo(10, -10); ctx.lineTo(-10, 10);
        ctx.stroke();

        // Draw Momentum Aura
        if (player.momentum > 50) {
            ctx.beginPath();
            ctx.arc(0, 0, player.radius + 5, 0, Math.PI * 2);
            ctx.strokeStyle = `rgba(141, 110, 99, ${(player.momentum - 50) / 50})`;
            ctx.lineWidth = 2;
            ctx.stroke();
        }

        // --- DRAW TECTONIC SHIELD ---
        if (player.rockShield && player.rockShield.active) {
            const shieldPct = Math.max(0, player.rockShield.hp / player.rockShield.maxHp);
            const shieldRadius = player.radius + 8; // Tighter fit

            // Rotating Shield Ring
            ctx.save();
            ctx.rotate(Date.now() * 0.001); // Slower, subtler rotation

            ctx.beginPath();
            // Single thin subtle ring instead of segmented blocks
            ctx.arc(0, 0, shieldRadius, 0, Math.PI * 2);

            ctx.strokeStyle = `rgba(100, 80, 70, ${0.3 + shieldPct * 0.3})`; // Lower opacity
            ctx.lineWidth = 3; // Thinner line
            ctx.stroke();

            // Very subtle inner glow
            if (shieldPct > 0.5) {
                ctx.beginPath();
                ctx.arc(0, 0, shieldRadius - 2, 0, Math.PI * 2);
                ctx.fillStyle = `rgba(141, 110, 99, 0.05)`;
                ctx.fill();
            }

            ctx.restore();
            // Removed spikes for subtlety
        }

        ctx.restore();

        // Draw Momentum Bar below player
        const barWidth = 40;
        const barHeight = 5;
        const yOffset = 30;

        ctx.fillStyle = '#333';
        ctx.fillRect(player.x - barWidth / 2, player.y + yOffset, barWidth, barHeight);

        // Momentum Bar Color
        if (player.momentum >= player.maxMomentum * 0.95) {
            ctx.fillStyle = '#e74c3c'; // Red/Hot when max
            // Glow effect
            ctx.shadowBlur = 10;
            ctx.shadowColor = '#e74c3c';
        } else {
            ctx.fillStyle = '#f1c40f'; // Gold/Earth color
            ctx.shadowBlur = 0;
        }

        const fillWidth = (player.momentum / player.maxMomentum) * barWidth;
        ctx.fillRect(player.x - barWidth / 2, player.y + yOffset, fillWidth, barHeight);
        ctx.shadowBlur = 0; // Reset shadow

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

        return { x: moveX, y: moveY, aimAngle, shoot, melee, dash: false, special, pause: false };
    }
}

// Register to global scope if needed, or just let the DLC index.js use it.
window.EarthHero = EarthHero;
