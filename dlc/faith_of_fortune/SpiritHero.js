// Spirit (Soft Amber) Hero Logic
// Playstyle: Support, Healing, Purification, Balance
// Weak direct combat, strong utility/sustain. Requires maintaining "Inner Peace".

class SpiritHero {
    static init(player) {
        // Base Stats (Tanky, Balanced)
        player.hp = 120;
        player.maxHp = 120;
        player.speedMultiplier = 0.95; // Slightly slower
        player.damageMultiplier = 0.8; // Lower base damage

        // Unique Resource: Inner Peace (0 - 100)
        player.innerPeace = 50;
        player.maxInnerPeace = 100;
        player.meditationTimer = 0; // Tracks time standing still

        player.specialName = "TRANSCEND";
        player.specialCooldown = 0; // Uses Resource instead of time (mostly)

        player.customUpdate = (dx, dy) => SpiritHero.update(player, dx, dy);
        player.customSpecial = () => SpiritHero.useUltimate(player);
        player.shoot = (dx, dy) => SpiritHero.shootMantra(player, dx, dy);

        // Override takeDamage to lose Inner Peace
        player._originalTakeDamage = player.takeDamage;
        player.takeDamage = (amount) => {
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
        SpiritHero.injectSkillTree();
    }

    static injectSkillTree() {
        const upgradePool = [
            { id: 'max_peace', title: 'Deep Breaths', desc: '+50 Max Inner Peace.', icon: '🧘' },
            { id: 'regen', title: 'Regeneration', desc: 'Regenerate HP while meditating.', icon: '💖' },
            { id: 'mantra', title: 'Mantra', desc: 'Attacks pierce +1 enemy.', icon: '🔆' },
            { id: 'shield', title: 'Spirit Shell', desc: 'Take 20% less damage when Peace > 50.', icon: '🛡️' }
        ];

        window.HERO_LOGIC['spirit'].upgradePool = upgradePool;

        window.HERO_LOGIC['spirit'].applySkillNode = (base, node) => {
            if (node.id === 'max_peace') base.maxInnerPeace = (base.maxInnerPeace || 100) + 50;
            if (node.id === 'mantra') base.pierceCount = (base.pierceCount || 1) + 1;
        };
    }

    static update(player, dx, dy) {
        // 1. Meditation Logic
        const isMoving = (dx !== 0 || dy !== 0) || (keys && (keys['ArrowUp'] || keys['ArrowDown'] || keys['ArrowLeft'] || keys['ArrowRight']));

        if (!isMoving) {
            player.meditationTimer++;
            // Show visual effect for meditation
            if (player.meditationTimer > 60 && window.frame % 30 === 0) {
                if (typeof createExplosion !== 'undefined')
                    createExplosion(player.x, player.y, "#F0D080", 3); // Gentle glow
            }

            // Gain Peace
            if (player.meditationTimer > 30 && window.frame % 10 === 0) {
                player.innerPeace = Math.min(player.maxInnerPeace, player.innerPeace + 1);
            }

            // Passive Regen (Skill or Base low regen)
            if (player.meditationTimer > 120 && window.frame % 60 === 0) {
                if (player.hp < player.maxHp) player.hp += 1;
            }
        } else {
            player.meditationTimer = 0;
        }

        // 2. Transcendent State (Ultimate Active)
        if (player.transformActive && player.currentForm === 'ENLIGHTENED') {
            player.innerPeace -= 0.5; // Drain resource
            player.invincibleTimer = 10; // Perma-invincible while active

            // Purification Aura
            if (window.frame % 15 === 0) {
                // Pulse damage around
                if (typeof enemies !== 'undefined') {
                    createExplosion(player.x, player.y, "#ffffff", 20); // Pulse visual
                    enemies.forEach(e => {
                        const dist = Math.hypot(e.x - player.x, e.y - player.y);
                        if (dist < 150) {
                            e.hp -= 20 * player.damageMultiplier; // Aura damage
                            // Pushback
                            e.x += (e.x - player.x) / dist * 5;
                            e.y += (e.y - player.y) / dist * 5;
                        }
                    });
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

    static shootMantra(player, dx, dy) {
        if (player.rangeCooldown > 0) return;

        if (typeof audioManager !== 'undefined') audioManager.play('shoot_weak');

        // Damage scales with Inner Peace
        // 0 Peace = 50% dmg, 100 Peace = 150% dmg
        const peaceMod = 0.5 + (player.innerPeace / 100);
        const dmg = 15 * peaceMod * player.damageMultiplier;

        if (typeof projectiles !== 'undefined') {
            projectiles.push({
                x: player.x,
                y: player.y,
                vx: dx * 8, // Slower, steady speed
                vy: dy * 8,
                radius: 8, // Changed from scalar 'size' to 'radius' for collision logic
                color: "#F0D080",
                dmg: dmg,
                life: 100,
                damage: dmg, // Map dmg property for standard collision
                pierce: player.pierceCount || 1, // Default 1 pierce
                type: 'MANTRA',

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

                    // Glowing Orb
                    ctx.beginPath();
                    ctx.arc(0, 0, this.radius, 0, Math.PI * 2);
                    ctx.fillStyle = this.color;
                    ctx.fill();

                    // Outer Ring
                    ctx.beginPath();
                    ctx.arc(0, 0, this.radius + 4, 0, Math.PI * 2);
                    ctx.strokeStyle = "rgba(240, 208, 128, 0.5)";
                    ctx.lineWidth = 2;
                    ctx.stroke();

                    ctx.restore();
                }
            });
        }

        // Attack costs a tiny bit of peace? No, builds it on hit maybe? 
        // Let's make it build peace on hit inside Enemy logic, or just passive gain.
        // For now, easier: just passive gain when still.

        player.rangeCooldown = player.stats.rangeCd * player.cooldownMultiplier;
    }

    static useUltimate(player) {
        if (player.transformActive) return; // Already active

        if (player.innerPeace < 30) {
            if (typeof showNotification === 'function') showNotification("Need more Peace!", "#888");
            return;
        }

        // Activate Transcendence
        player.transformActive = true;
        player.currentForm = 'ENLIGHTENED';
        player.speedMultiplier = 1.3; // Move faster inside form

        // Instant Heal based on Peace
        player.hp = Math.min(player.maxHp, player.hp + (player.innerPeace / 2));

        if (typeof showNotification === 'function') showNotification("TRANSCENDENCE", "#F0D080");
        if (typeof audioManager !== 'undefined') audioManager.play('level_up');

        // Peace consumes over time in update()
    }
}

if (typeof window.HERO_LOGIC === 'undefined') window.HERO_LOGIC = {};
window.HERO_LOGIC['spirit'] = SpiritHero;
