// Spirit (Soft Amber) Hero Logic
// Playstyle: Support, Healing, Purification, Balance
// Weak direct combat, strong utility/sustain. Requires maintaining "Inner Peace".

class SpiritHero {
    static init(player) {
        // Base Stats (Tanky, Balanced)
        player.speedMultiplier = 0.95; // Slightly slower
        player.damageMultiplier = 0.8; // Lower base damage

        // Unique Resource: Inner Peace (0 - 100)
        player.innerPeace = 50;
        player.maxInnerPeace = 100;
        player.meditationTimer = 0; // Tracks time standing still

        player.specialName = "TRANSCEND";
        player.specialCooldown = 0; // Uses Resource instead of time (mostly)

        player.customUpdate = (dx, dy) => SpiritHero.update(player, dx, dy);
        player.customSpecial = () => SpiritHero.useSpecial(player);
        player.shoot = () => SpiritHero.shootMantra(player);

        // Override takeDamage to lose Inner Peace
        player._originalTakeDamage = player.takeDamage;
        player.takeDamage = (amount) => {
            // Convergence: Golden Bell (cv_s_m)
            const hasBell = SpiritHero.checkConvergence(player, 'cv_s_m');
            // Convergence: Ascension (cv_s_a)
            const hasAscension = SpiritHero.checkConvergence(player, 'cv_s_a');

            // Ascension Dodge Check
            if (hasAscension && Math.random() < (player.dodgeChance || 0)) {
                if (typeof showNotification === 'function') showNotification("DODGE", "#40e0d0");
                return;
            }

            if (hasBell && typeof enemies !== 'undefined') {
                const reflectDmg = amount * 0.1;
                // Find nearest attacker? Or just global?
                // Hard to find attacker. Let's reflect to ALL nearby.
                enemies.forEach(e => {
                    const dist = Math.hypot(e.x - player.x, e.y - player.y);
                    if (dist < 300) {
                        e.hp -= reflectDmg;
                        if (Math.random() < 0.1) createExplosion(e.x, e.y, "#95a5a6", 5);
                    }
                });
            }

            // Skill: Spirit Shell
            if (player.peaceShield && player.innerPeace > 50) {
                amount *= 0.8; // 20% Damage Reduction
            }

            player.innerPeace = Math.max(0, player.innerPeace - 15); // Lose focus on hit
            player.meditationTimer = 0; // Break concentration
            if (player._originalTakeDamage) player._originalTakeDamage.call(player, amount);
            else player.hp -= amount;
        };

        // Form Name
        player.getFormName = function () { return 'ENLIGHTENED'; };

        // Register in logic system
        if (typeof window.HERO_LOGIC === 'undefined') window.HERO_LOGIC = {};
        window.HERO_LOGIC['spirit'] = SpiritHero;
    }

    static checkConvergence(player, id) {
        if (typeof has === 'function') return has(id);
        // Fallback if 'has' is not global (e.g. in DLC context before init)
        // We assume 'has' is available from Player.js context or similar global
        if (window.player && window.player.upgradeList) return window.player.upgradeList.includes(id);
        return false;
    }

    static getSkillTreeWeights() {
        return { HEALTH: 0.25, PEACE_REGEN: 0.20, COOLDOWN: 0.20, ARMOR: 0.15, DAMAGE: 0.10, ULT_SPEED: 0.10 };
    }

    static getSkillNodeDetails(type, val, desc) {
        if (type === 'PEACE_REGEN') return { val: 2, desc: "+2 Peace Recharge Rate" };
        return { val, desc };
    }

    // SKILL TREE: Permanent Meta-Progression
    static applySkillNode(base, node) {
        if (node.type === 'PEACE_REGEN') base.peaceRechargeRate = (base.peaceRechargeRate || 0) + node.value;
    }

    // LEVEL UP: Per-Run Upgrades
    static applyUpgrade(player, type) {
        if (type === 'max_peace') {
            player.maxInnerPeace = (player.maxInnerPeace || 100) + 50;
            return true;
        }
        if (type === 'mantra') {
            player.pierceCount = (player.pierceCount || 1) + 1;
            return true;
        }
        if (type === 'regen') {
            player.meditationRegen = true;
            return true;
        }
        if (type === 'shield') {
            player.peaceShield = true;
            return true;
        }
        if (type === 'refill_peace') {
            player.triggerRefillPeace = true;
            return true;
        }
        return false; // Not handled
    }

    static update(player, dx, dy) {
        // Handle Instant Skill Triggers
        if (player.triggerRefillPeace) {
            player.triggerRefillPeace = false;
            player.innerPeace = player.maxInnerPeace;
            if (typeof showNotification === 'function') showNotification("PEACE RESTORED", "#F0D080");
            if (typeof createExplosion !== 'undefined') createExplosion(player.x, player.y, "#F0D080", 50);
            // if (typeof audioManager !== 'undefined') audioManager.play('menu_open');
        }

        // 1. Meditation Logic
        const isMoving = (dx !== 0 || dy !== 0) || (keys && (keys['ArrowUp'] || keys['ArrowDown'] || keys['ArrowLeft'] || keys['ArrowRight']));

        // Convergence Check
        const hasTranquility = SpiritHero.checkConvergence(player, 'cv_s_i');
        const hasLotus = SpiritHero.checkConvergence(player, 'cv_s_p');
        const hasAscension = SpiritHero.checkConvergence(player, 'cv_s_a');
        const hasKarma = SpiritHero.checkConvergence(player, 'cv_s_ch');

        // Apply Karma (Luck <-> Regen)
        if (hasKarma && window.frame % 60 === 0) {
            // (1 HP/s = 5 Luck)
            const luckBonus = (player.regen || 0) * 5;
            const regenBonus = (player.luck || 0) * 0.02; // 10 luck = 0.2 regen
            // Apply buffs softly (not additive per frame)
            // Just assume player logic handles base stats, we modify on top?
            // Safer: Just set a temporary buff property
            if (!player.karmaBuff) player.karmaBuff = { luck: 0, regen: 0 };
            // Reset base (hard to track) - let's just do direct modification if careful
        }

        if (hasAscension) {
            player.dodgeChance = isMoving ? 0.3 : 0; // 30% Dodge while moving
        } else {
            player.dodgeChance = 0;
        }

        if (hasTranquility && !isMoving) {
            // Slow nearby enemies
            if (window.enemies) {
                window.enemies.forEach(e => {
                    const d = Math.hypot(e.x - player.x, e.y - player.y);
                    if (d < 300) {
                        e.speedMultiplier = 0.5; // Slow down
                        // Visual effect occasionally
                        if (Math.random() < 0.05 && typeof createExplosion !== 'undefined') {
                            createExplosion(e.x, e.y, "#aaddff", 2);
                        }
                    }
                });
            }
        }

        if (!isMoving) {
            player.meditationTimer++;
            // Show visual effect for meditation
            if (player.meditationTimer > 60 && window.frame % 30 === 0) {
                if (typeof createExplosion !== 'undefined')
                    createExplosion(player.x, player.y, "#F0D080", 3); // Gentle glow
            }

            // Recharge Inner Peace
            if (player.meditationTimer > 30) {
                // Audio Loop Trigger
                if (player.innerPeace < player.maxInnerPeace) {
                    if (typeof audioManager !== 'undefined') audioManager.startLoop('special_spirit_charging');
                } else {
                    if (typeof audioManager !== 'undefined') audioManager.stopLoop('special_spirit_charging');
                }

                // Base Rate: 0.2 per frame -> ~12 per second
                const rate = 0.2 + ((player.peaceRechargeRate || 0) * 0.05);
                player.innerPeace = Math.min(player.maxInnerPeace, player.innerPeace + rate);
            }

            // Passive Regen (Skill or Base low regen)
            if (player.meditationTimer > 120 && window.frame % 60 === 0) {
                // Base drip
                if (player.hp < player.maxHp) player.hp += 1;

                // Skill: Regeneration
                if (player.meditationRegen && player.hp < player.maxHp) {
                    player.hp += 5;
                    if (typeof FloatingText !== 'undefined') new FloatingText(player.x, player.y - 20, "+5", "#ff69b4", 12);
                }

                else if (hasLotus) {
                    // Overheal -> Vines
                    if (typeof projectiles !== 'undefined') {
                        // Spawn Vine Projectile (Static Trap)
                        projectiles.push({
                            x: player.x + (Math.random() * 100 - 50),
                            y: player.y + (Math.random() * 100 - 50),
                            vx: 0, vy: 0, life: 300,
                            type: 'VINE',
                            radius: 15, color: '#2ecc71',
                            damage: 10, knockback: 0, owner: player,
                            update: function () { this.life--; if (this.life <= 0) this.dead = true; },
                            draw: function () {
                                const ctx = window.ctx; if (!ctx) return;
                                ctx.save(); ctx.translate(this.x, this.y);
                                ctx.fillStyle = this.color; ctx.beginPath(); ctx.arc(0, 0, this.radius, 0, Math.PI * 2); ctx.fill();
                                ctx.strokeStyle = "#27ae60"; ctx.lineWidth = 2; ctx.stroke();
                                ctx.restore();
                            }
                        });
                    }
                }
            }
        } else {
            player.meditationTimer = 0;
            if (typeof audioManager !== 'undefined') audioManager.stopLoop('special_spirit_charging');
        }

        // Draw UI Meter (Attached to Player logic to ensure it draws every frame)
        // We inject the draw logic directly if it's missing, or we can use a dedicated UI hook.
        // For simplicity, we'll assume the main loop doesn't draw this automatically, so we'll draw it here.
        // BUT 'update' is for logic. 'draw' handles rendering.
        // Since there is no 'draw' override on player yet, we can attach a UI draw hook to 'HERO_LOGIC'.

        // 2. Transcendent State (Ultimate Active)
        if (player.transformActive && player.currentForm === 'ENLIGHTENED') {
            player.innerPeace -= 0.5; // Drain resource
            player.invincibleTimer = 10; // Perma-invincible while active

            // Purification Aura
            if (window.frame % 15 === 0) {
                // Pulse damage around
                if (typeof enemies !== 'undefined') {
                    let hitsThisPulse = 0;
                    enemies.forEach(e => {
                        const dist = Math.hypot(e.x - player.x, e.y - player.y);
                        if (dist < 150) {
                            e.hp -= 20 * player.damageMultiplier; // Aura damage
                            // Pushback
                            e.x += (e.x - player.x) / dist * 5;
                            e.y += (e.y - player.y) / dist * 5;
                            hitsThisPulse++;
                        }
                    });
                    if (hitsThisPulse > 0) {
                        // Single visual + single sound per pulse regardless of how many enemies are hit
                        createExplosion(player.x, player.y, "#ffffff", 20);
                        if (typeof audioManager !== 'undefined') audioManager.playCapped('aura_pulse', 1, 'enemy_damage');
                    }
                }
            }

            if (player.innerPeace <= 0) {
                // End form
                player.transformActive = false;
                player.currentForm = null;
                if (typeof showNotification === 'function') showNotification("Peace Expended", "#F0D080");
                player.speedMultiplier = 0.95; // Reset speed
            }
        }

        // Passive Defense Buff
        if (player.innerPeace > 50) {
            // Visual indicator of high peace?
        }
    }

    static shootMantra(player) {
        if (player.rangeCooldown > 0) return;

        if (typeof audioManager !== 'undefined') audioManager.play('attack_spirit');

        // Ensure properties exist
        if (typeof player.innerPeace === 'undefined') player.innerPeace = 50;

        // Damage scales with Inner Peace
        // 0 Peace = 50% dmg, 100 Peace = 150% dmg
        const peaceMod = 0.5 + (player.innerPeace / 100);
        const baseDmg = player.stats.rangeDmg || 15; // Use stats base instead of hardcoded
        const dmg = baseDmg * peaceMod * player.damageMultiplier;

        // Convergence Checks
        const hasSacredFlame = SpiritHero.checkConvergence(player, 'cv_s_f');
        const hasHolyWater = SpiritHero.checkConvergence(player, 'cv_s_w');
        const hasEnlightenment = SpiritHero.checkConvergence(player, 'cv_s_l');

        // Multishot Logic
        let count = 1 + (player.extraProjectiles || 0);
        if (player.buffs && player.buffs.multi > 0) count += 1;

        for (let i = 0; i < count; i++) {
            // Spread calculation: centered around aimAngle
            // e.g. 1 proj: 0 offset
            // 2 proj: -0.05, +0.05
            // 3 proj: -0.1, 0, +0.1
            const spread = 0.1; // radians between shots
            const offset = (i - (count - 1) / 2) * spread;
            const finalAngle = player.aimAngle + offset;

            const dx = Math.cos(finalAngle);
            const dy = Math.sin(finalAngle);

            // Muzzle Flash (only once or for each?) - Let's do for each for cool effect
            if (typeof createExplosion !== 'undefined') {
                createExplosion(player.x + dx * 20, player.y + dy * 20, "#F0D080", 4);
            }

            if (typeof projectiles !== 'undefined') {
                projectiles.push({
                    x: player.x,
                    y: player.y,
                    vx: dx * 8, // Slower, steady speed
                    vy: dy * 8,
                    radius: 10, // Slightly larger
                    color: "#F0D080",
                    dmg: dmg,
                    life: 100,
                    damage: dmg, // Map dmg property for standard collision
                    pierce: player.pierceCount || 1, // Default 1 pierce
                    knockback: 0, // Spirit mantras do not knock back
                    type: 'MANTRA', owner: player,

                    onHit: function (enemy) {
                        // Spirit Mechanics: Violence disturbs peace
                        if (player && typeof player.innerPeace !== 'undefined') {
                            player.innerPeace = Math.max(0, player.innerPeace - 5);
                            // Visual Float Text if possible
                            if (typeof floatingTexts !== 'undefined' && Math.random() < 0.3) {
                                floatingTexts.push(new FloatingText(player.x, player.y - 40, "-Peace", "#cfcfcf", 15));
                            }
                        }

                        // Convergence Effects
                        if (hasSacredFlame) {
                            e.fireTicks = (e.fireTicks || 0) + 60; // Burn
                            createExplosion(e.x, e.y, "#e74c3c", 8);
                        }
                        if (hasHolyWater) {
                            const angle = Math.atan2(e.y - player.y, e.x - player.x);
                            e.vx += Math.cos(angle) * 5; // Extra Push
                            e.vy += Math.sin(angle) * 5;
                        }
                        if (hasEnlightenment) {
                            // Chain Lightning
                            if (Math.random() < 0.3 && typeof enemies !== 'undefined') {
                                const target = enemies.find(n => n !== e && Math.hypot(n.x - e.x, n.y - e.y) < 200);
                                if (target) {
                                    target.hp -= dmg * 0.5;
                                    // Draw line (needs global hook or temp)
                                    createExplosion(target.x, target.y, "#f1c40f", 8);
                                }
                            }
                        }

                        return 'DEFAULT';
                    },

                    update: function () {
                        this.x += this.vx;
                        this.y += this.vy;
                        this.life--;
                        if (this.life <= 0) this.dead = true;
                    },

                    draw: function () {
                        const ctx = window.ctx;
                        if (!ctx) return;

                        ctx.save();
                        ctx.translate(this.x, this.y);

                        // Glowing Core
                        ctx.shadowBlur = 10;
                        ctx.shadowColor = this.color;
                        ctx.fillStyle = "#fff"; // White core
                        ctx.beginPath();
                        ctx.arc(0, 0, this.radius / 2, 0, Math.PI * 2);
                        ctx.fill();

                        // Outer Halo
                        ctx.shadowBlur = 0;
                        ctx.strokeStyle = this.color;
                        ctx.lineWidth = 2;
                        ctx.beginPath();
                        ctx.arc(0, 0, this.radius, 0, Math.PI * 2);
                        ctx.stroke();

                        // Longer Spur (Tail)
                        const angle = Math.atan2(this.vy, this.vx);
                        ctx.rotate(angle);

                        ctx.fillStyle = this.color;
                        ctx.globalAlpha = 0.6;
                        ctx.beginPath();
                        ctx.moveTo(-this.radius, -this.radius / 2);
                        ctx.lineTo(-this.radius * 4, 0); // Tail length
                        ctx.lineTo(-this.radius, this.radius / 2);
                        ctx.fill();
                        ctx.globalAlpha = 1.0;

                        ctx.restore();
                    }
                });
            }
        }

        player.rangeCooldown = player.stats.rangeCd * player.cooldownMultiplier;
    }

    static useSpecial(player) {
        if (player.transformActive) return; // Already active

        if (player.innerPeace < 30) {
            if (typeof showNotification === 'function') showNotification("Need more Peace!", "#888");
            return;
        }

        // Activate Transcendence
        player.transformActive = true;
        player.currentForm = 'ENLIGHTENED';
        if (typeof saveData !== 'undefined') {
            saveData.global.spirit_transcend_count = (saveData.global.spirit_transcend_count || 0) + 1;
        }
        player.speedMultiplier = 1.3; // Move faster inside form

        // Instant Heal based on Peace
        player.hp = Math.min(player.maxHp, player.hp + (player.innerPeace / 2));

        if (typeof showNotification === 'function') showNotification("TRANSCENDENCE", "#F0D080");
        if (typeof audioManager !== 'undefined') audioManager.play('special_spirit');

        // Spawn Visual Aura
        if (typeof projectiles !== 'undefined') {
            projectiles.push({
                x: player.x,
                y: player.y,
                vx: 0,
                vy: 0,
                life: 9999, // Managed by update
                type: 'SPIRIT_AURA',
                radius: 100, // Visual radius
                angle: 0,
                owner: player,
                damage: 0, // No collision damage, logic handled in SpiritHero.update
                knockback: 0, // Must be 0 to prevent NaN enemy coordinates
                pierce: 9999, // Must not be spliced on enemy contact

                update: function () {
                    if (!this.owner.transformActive || this.owner.currentForm !== 'ENLIGHTENED') {
                        this.dead = true;
                        return;
                    }
                    this.x = this.owner.x;
                    this.y = this.owner.y;
                    this.angle += 0.05;
                },

                draw: function () {
                    const ctx = window.ctx;
                    if (!ctx) return;
                    ctx.save();
                    ctx.translate(this.x, this.y);
                    ctx.rotate(this.angle);

                    // Draw Mandala / Shield
                    ctx.strokeStyle = "rgba(240, 208, 128, 0.6)";
                    ctx.lineWidth = 3;
                    ctx.beginPath();
                    ctx.arc(0, 0, 60 + Math.sin(this.angle * 2) * 5, 0, Math.PI * 2);
                    ctx.stroke();

                    // Rotating Squares
                    ctx.beginPath();
                    ctx.rect(-40, -40, 80, 80);
                    ctx.strokeStyle = "rgba(255, 255, 255, 0.4)";
                    ctx.stroke();

                    ctx.rotate(Math.PI / 4);
                    ctx.beginPath();
                    ctx.rect(-40, -40, 80, 80);
                    ctx.stroke();

                    ctx.restore();
                }
            });
        }
    }
}

if (typeof window.HERO_LOGIC === 'undefined') window.HERO_LOGIC = {};
window.HERO_LOGIC['spirit'] = SpiritHero;

SpiritHero.upgradePool = [
    { id: 'max_peace', title: 'Deep Breaths', desc: '+50 Max Inner Peace.', icon: '🧘' },
    { id: 'regen', title: 'Regeneration', desc: 'Regenerate HP while meditating.', icon: '💖' },
    { id: 'mantra', title: 'Mantra', desc: 'Attacks pierce +1 enemy.', icon: '🔆' },
    { id: 'shield', title: 'Spirit Shell', desc: 'Take 20% less damage when Peace > 50.', icon: '🛡️' },
    { id: 'refill_peace', title: 'Tranquility', desc: 'Instantly restore 100% Inner Peace.', icon: '🕊️' }
];

// Hook UI Drawing
window.HERO_LOGIC['spirit'].drawUI = function (ctx) {
    if (!window.player || window.player.type !== 'spirit') return;

    // Draw Peace Meter UNDER player
    const p = window.player;
    // Calculate screen position
    const screenX = p.x - (window.arena ? window.arena.camera.x : 0);
    const screenY = p.y - (window.arena ? window.arena.camera.y : 0);

    const max = p.maxInnerPeace || 100;
    const cur = p.innerPeace || 0;
    const pct = Math.min(1, Math.max(0, cur / max));

    const w = 40;
    const h = 4;
    const x = screenX - w / 2;
    const y = screenY + 30; // Below player

    // Bg
    ctx.fillStyle = "rgba(0, 0, 0, 0.5)";
    ctx.fillRect(x, y, w, h);

    // Bar
    ctx.fillStyle = "#F0D080";
    ctx.fillRect(x, y, w * pct, h); // Fill based on percentage

    // Border (optional for small bar)
    ctx.lineWidth = 1;
    ctx.strokeStyle = "#aaa";
    ctx.strokeRect(x, y, w, h);
};
