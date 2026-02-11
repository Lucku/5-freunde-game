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
        player.customSpecial = () => SpiritHero.useSpecial(player);
        player.shoot = () => SpiritHero.shootMantra(player);

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
            { id: 'shield', title: 'Spirit Shell', desc: 'Take 20% less damage when Peace > 50.', icon: '🛡️' },
            { id: 'refill_peace', title: 'Tranquility', desc: 'Instantly restore 100% Inner Peace.', icon: '🕊️' }
        ];

        window.HERO_LOGIC['spirit'].upgradePool = upgradePool;

        window.HERO_LOGIC['spirit'].applySkillNode = (base, node) => {
            if (node.id === 'max_peace') base.maxInnerPeace = (base.maxInnerPeace || 100) + 50;
            if (node.id === 'mantra') base.pierceCount = (base.pierceCount || 1) + 1;
        };
    }

    static update(player, dx, dy) {
        // Handle Instant Skill Triggers
        if (player.triggerRefillPeace) {
            player.triggerRefillPeace = false;
            player.innerPeace = player.maxInnerPeace;
            if (typeof showNotification === 'function') showNotification("PEACE RESTORED", "#F0D080");
            if (typeof createExplosion !== 'undefined') createExplosion(player.x, player.y, "#F0D080", 50);
            if (typeof audioManager !== 'undefined') audioManager.play('menu_open');
        }

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

    static shootMantra(player) {
        if (player.rangeCooldown > 0) return;

        // Calculate direction from player's aim angle (since args are not passed by standard shoot call)
        const dx = Math.cos(player.aimAngle);
        const dy = Math.sin(player.aimAngle);

        if (typeof audioManager !== 'undefined') audioManager.play('shoot_weak');

        // Ensure properties exist
        if (typeof player.innerPeace === 'undefined') player.innerPeace = 50;

        // Muzzle Flash
        if (typeof createExplosion !== 'undefined') {
            createExplosion(player.x + dx * 20, player.y + dy * 20, "#F0D080", 8);
        }

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
                radius: 10, // Slightly larger
                color: "#F0D080",
                dmg: dmg,
                life: 100,
                damage: dmg, // Map dmg property for standard collision
                pierce: player.pierceCount || 1, // Default 1 pierce
                type: 'MANTRA',

                onHit: function (enemy) {
                    // Spirit Mechanics: Violence disturbs peace
                    if (player && typeof player.innerPeace !== 'undefined') {
                        player.innerPeace = Math.max(0, player.innerPeace - 5);
                        // Visual Float Text if possible
                        if (typeof floatingTexts !== 'undefined' && Math.random() < 0.3) {
                            floatingTexts.push(new FloatingText(player.x, player.y - 40, "-Peace", "#cfcfcf", 15));
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

                    // Trailing bits (simple)
                    if (window.frame % 2 === 0) {
                        ctx.fillStyle = this.color;
                        ctx.fillRect(-this.radius, -2, 4, 4);
                    }

                    ctx.restore();
                }
            });
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
        player.speedMultiplier = 1.3; // Move faster inside form

        // Instant Heal based on Peace
        player.hp = Math.min(player.maxHp, player.hp + (player.innerPeace / 2));

        if (typeof showNotification === 'function') showNotification("TRANSCENDENCE", "#F0D080");
        if (typeof audioManager !== 'undefined') audioManager.play('level_up');

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
