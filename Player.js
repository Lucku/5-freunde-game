class Player {
    constructor(type) {
        this.type = type;
        this.stats = getHeroStats(type);
        this.x = canvas.width / 2;
        this.y = canvas.height / 2;
        this.radius = 20;
        this.maxHp = this.stats.hp;
        this.hp = this.maxHp;
        this.rangeCooldown = 0;
        this.meleeCooldown = 0;
        this.meleeMaxCooldown = this.stats.meleeCd;
        this.meleeRadius = 80 * (this.stats.meleeRadiusMult || 1);
        this.level = 1;
        this.xp = 0;
        this.maxXp = 100;
        this.extraProjectiles = this.stats.extraProjectiles || 0;
        this.buffs = { speed: 0, multi: 0, autoaim: 0 };
        this.weapon = 'STANDARD';
        this.weaponTimer = 0;
        this.weaponTier = 1; // Weapon Tier System

        // New Stats
        this.damageReduction = this.stats.defense || 0;
        this.damageMultiplier = 1;
        this.maskChance = 0.01;
        this.speedMultiplier = 1;
        this.cooldownMultiplier = 1;
        this.gold = 0;
        this.goldMultiplier = 1;

        // Apply Meta Greed
        this.goldMultiplier += (saveData.metaUpgrades.greed || 0) * 0.05;

        // Crit Stats
        this.critChance = 0.05; // 5% base
        this.critMultiplier = 1.5; // 150% damage

        // Run Buff Tracking
        this.runBuffs = {
            damage: 0,
            maxHp: 0,
            speed: 0,
            cooldown: 0,
            defense: 0,
            projectiles: 0,
            luck: 0
        };

        // Combo
        this.combo = 0;
        this.comboTimer = 0;

        // Transformation Logic
        this.transformActive = false;
        this.currentForm = 'NONE';

        // Dash Properties
        this.dashCooldown = 0;
        this.dashMaxCooldown = 180;
        this.isDashing = false;
        this.dashFrames = 0;

        // Special Ability
        this.specialCooldown = 0;
        this.specialMaxCooldown = 600; // 10 seconds default
        this.invincibleTimer = 0;
        this.setupSpecial();

        // Controller Support
        this.aimAngle = 0;
        this.usingGamepad = false;
        this.pauseDebounce = 0;
        this.moveInput = { x: 0, y: 0 };

        // Apply Achievement Gold Bonus
        saveData.global.unlockedAchievements.forEach(id => {
            const ach = ACHIEVEMENTS.find(a => a.id === id);
            if (ach && ach.bonus.type === 'gold') this.goldMultiplier += ach.bonus.val;
        });
    }

    gainXp(amount) {
        this.xp += amount;
        if (this.xp >= this.maxXp) {
            this.xp -= this.maxXp;
            this.levelUp();
        }
    }

    addCombo() {
        this.combo++;
        if (this.combo > currentRunStats.maxCombo) currentRunStats.maxCombo = this.combo;
        this.comboTimer = 240; // 4 seconds

        // Combo Buffs
        if (this.combo > 50) this.goldMultiplier = 2;
        else if (this.combo > 25) this.goldMultiplier = 1.5;
        else this.goldMultiplier = 1;
    }

    resetCombo() {
        this.combo = 0;
        this.comboTimer = 0;
        this.goldMultiplier = 1;
    }

    levelUp() {
        this.level++;
        this.maxXp = Math.floor(this.maxXp * 1.2);
        isLevelingUp = true;

        const container = document.getElementById('upgrade-options');
        container.innerHTML = '';

        if (this.level % 10 === 0) {
            const formName = this.getFormName();
            const transformOption = {
                id: 'transform',
                title: 'ULTIMATE FORM',
                desc: `Transform into ${formName}! Lasts until you take damage.`,
                icon: '🌟'
            };
            const pool = [...UPGRADE_POOL].sort(() => 0.5 - Math.random());
            const options = [transformOption, pool[0]];
            options.forEach(opt => this.createUpgradeCard(opt, container));
        } else {
            const pool = [...UPGRADE_POOL].sort(() => 0.5 - Math.random());
            const options = pool.slice(0, 2);
            options.forEach(opt => this.createUpgradeCard(opt, container));
        }

        document.getElementById('levelup-screen').style.display = 'flex';

        // Trigger UI State for Controller
        if (window.setUIState) window.setUIState('LEVELUP');
    }

    createUpgradeCard(opt, container) {
        const card = document.createElement('div');
        card.className = 'upgrade-card';
        card.innerHTML = `
            <div class="upgrade-icon">${opt.icon}</div>
            <div class="upgrade-title">${opt.title}</div>
            <div class="upgrade-desc">${opt.desc}</div>
        `;
        card.onclick = () => chooseUpgrade(opt.id);
        container.appendChild(card);
    }

    getFormName() {
        if (this.type === 'ice') return 'BLACK ICE';
        if (this.type === 'fire') return 'LAVA';
        if (this.type === 'metal') return 'IRON';
        if (this.type === 'plant') return 'CREEPER';
        if (this.type === 'water') return 'OCEAN';
        return 'ULTIMATE';
    }

    dash() {
        if (this.dashCooldown > 0 || this.isDashing) return;

        let dx = this.moveInput.x;
        let dy = this.moveInput.y;

        // Keyboard fallback if moveInput is zero (though update handles this)
        if (dx === 0 && dy === 0) {
            if (keys['w'] || keys['arrowup']) dy = -1;
            if (keys['s'] || keys['arrowdown']) dy = 1;
            if (keys['a'] || keys['arrowleft']) dx = -1;
            if (keys['d'] || keys['arrowright']) dx = 1;
        }

        if (Math.abs(dx) > 0.1 || Math.abs(dy) > 0.1) {
            this.isDashing = true;
            this.dashFrames = 10;
            this.dashCooldown = this.dashMaxCooldown;
            createExplosion(this.x, this.y, '#fff');
        }
    }

    setupSpecial() {
        const iconEl = document.getElementById('special-icon');
        if (this.type === 'fire') {
            this.specialName = "INFERNO";
            this.specialMaxCooldown = 900; // 15s
            iconEl.innerText = "🔥";
        } else if (this.type === 'water') {
            this.specialName = "TIDAL WAVE";
            this.specialMaxCooldown = 600; // 10s
            iconEl.innerText = "🌊";
        } else if (this.type === 'ice') {
            this.specialName = "DEEP FREEZE";
            this.specialMaxCooldown = 1200; // 20s
            iconEl.innerText = "❄️";
        } else if (this.type === 'plant') {
            this.specialName = "OVERGROWTH";
            this.specialMaxCooldown = 1800; // 30s
            iconEl.innerText = "🌿";
        } else if (this.type === 'metal') {
            this.specialName = "IRON WILL";
            this.specialMaxCooldown = 1200; // 20s
            iconEl.innerText = "🛡️";
        }
    }

    useSpecial() {
        if (this.specialCooldown > 0) return;

        showNotification(`${this.specialName}!`);
        this.specialCooldown = this.specialMaxCooldown * this.cooldownMultiplier;

        if (this.type === 'fire') {
            // Ring of explosions
            for (let i = 0; i < 12; i++) {
                const angle = (Math.PI * 2 / 12) * i;
                const ex = this.x + Math.cos(angle) * 150;
                const ey = this.y + Math.sin(angle) * 150;
                setTimeout(() => {
                    createExplosion(ex, ey, '#e74c3c');
                    enemies.forEach(e => {
                        if (Math.hypot(e.x - ex, e.y - ey) < 80) {
                            e.hp -= 50 * this.damageMultiplier;
                            floatingTexts.push(new FloatingText(e.x, e.y - 20, "50", "#e74c3c", 20));
                        }
                    });
                }, i * 50);
            }
        } else if (this.type === 'water') {
            // Pushback
            createExplosion(this.x, this.y, '#3498db');
            enemies.forEach(e => {
                const angle = Math.atan2(e.y - this.y, e.x - this.x);
                e.x += Math.cos(angle) * 200;
                e.y += Math.sin(angle) * 200;
                e.hp -= 20 * this.damageMultiplier;
            });
        } else if (this.type === 'ice') {
            // Freeze
            enemies.forEach(e => {
                e.frozenTimer = 180; // 3 seconds
                floatingTexts.push(new FloatingText(e.x, e.y - 40, "FROZEN", "#aaddff", 16));
            });
        } else if (this.type === 'plant') {
            // Heal + Turret (Simulated by just spawning projectiles for now)
            this.hp = Math.min(this.maxHp, this.hp + (this.maxHp * 0.3));
            floatingTexts.push(new FloatingText(this.x, this.y - 40, "HEAL", "#2ecc71", 20));
            // Burst of thorns
            for (let i = 0; i < 20; i++) {
                const angle = (Math.PI * 2 / 20) * i;
                projectiles.push(new Projectile(this.x, this.y, { x: Math.cos(angle) * 10, y: Math.sin(angle) * 10 }, 30 * this.damageMultiplier, '#2ecc71', 5, 'plant', 10, false));
            }
        } else if (this.type === 'metal') {
            // Invincible
            this.invincibleTimer = 300; // 5 seconds
            floatingTexts.push(new FloatingText(this.x, this.y - 40, "INVINCIBLE", "#95a5a6", 20));
        }
    }

    update() {
        if (this.buffs.speed > 0) this.buffs.speed--;
        if (this.buffs.multi > 0) this.buffs.multi--;
        if (this.buffs.autoaim > 0) this.buffs.autoaim--;
        if (this.specialCooldown > 0) this.specialCooldown--;
        if (this.invincibleTimer > 0) this.invincibleTimer--;
        if (this.pauseDebounce > 0) this.pauseDebounce--;

        if (this.dashCooldown > 0) this.dashCooldown--;

        // Combo Decay
        if (this.comboTimer > 0) {
            this.comboTimer--;
            if (this.comboTimer <= 0) this.resetCombo();
        }

        // Transformation Updates
        if (this.transformActive) {
            if (this.currentForm === 'IRON') {
                enemies.forEach(e => {
                    const d = Math.hypot(e.x - this.x, e.y - this.y);
                    if (d < 150) {
                        const angle = Math.atan2(e.y - this.y, e.x - this.x);
                        e.x += Math.cos(angle) * 5;
                        e.y += Math.sin(angle) * 5;
                        e.hp -= 2;
                        currentRunStats.damageDealt += 2; // Track Damage
                        saveData.global.totalDamage += 2;
                        if (frame % 10 === 0) createExplosion(e.x, e.y, '#aaa');
                    }
                });
            }
        }

        if (this.weapon !== 'STANDARD') {
            this.weaponTimer--;
            if (this.weaponTimer <= 0) {
                this.weapon = 'STANDARD';
                showNotification("WEAPON EXPIRED");
            }
        }

        // --- Input Handling (Keyboard & Controller) ---
        let dx = 0; let dy = 0;

        // Keyboard
        if (keys['w'] || keys['arrowup']) dy = -1;
        if (keys['s'] || keys['arrowdown']) dy = 1;
        if (keys['a'] || keys['arrowleft']) dx = -1;
        if (keys['d'] || keys['arrowright']) dx = 1;

        // Gamepad Polling
        const gamepads = navigator.getGamepads();
        let gp = null;
        for (let g of gamepads) { if (g && g.connected) { gp = g; break; } }

        if (gp) {
            // Movement (Left Stick)
            if (Math.abs(gp.axes[0]) > 0.1) dx = gp.axes[0];
            if (Math.abs(gp.axes[1]) > 0.1) dy = gp.axes[1];

            // Aiming (Right Stick)
            if (Math.abs(gp.axes[2]) > 0.1 || Math.abs(gp.axes[3]) > 0.1) {
                this.aimAngle = Math.atan2(gp.axes[3], gp.axes[2]);
                this.usingGamepad = true;
            }

            // Actions
            // Shoot: RT (Button 7) or R1 (Button 5)
            if (gp.buttons[7].pressed || gp.buttons[5].pressed) this.shoot();

            // Melee: B (Button 1) or X (Button 2)
            if (gp.buttons[1].pressed || gp.buttons[2].pressed) this.melee();

            // Dash: LT (Button 6) or LB (Button 4) or A (Button 0)
            if ((gp.buttons[6].pressed || gp.buttons[4].pressed || gp.buttons[0].pressed) && !this.isDashing) this.dash();

            // Special: Y (Button 3)
            if (gp.buttons[3].pressed) this.useSpecial();

            // Pause: Start (Button 9)
            if (gp.buttons[9].pressed && this.pauseDebounce <= 0) {
                togglePause();
                this.pauseDebounce = 30;
            }
        }

        // Mouse Fallback & Auto-fire
        if (!this.usingGamepad) {
            this.aimAngle = Math.atan2(mouse.y - this.y, mouse.x - this.x);
            if (mouse.leftDown) this.shoot();
            if (mouse.rightDown) this.melee();
        }

        // Store input for dash direction
        this.moveInput = { x: dx, y: dy };

        let currentSpeed = this.stats.speed * this.speedMultiplier;
        if (this.buffs.speed > 0) currentSpeed *= 1.5;

        // Weather Slow
        if (currentWeather && currentWeather.id === 'BLIZZARD') currentSpeed *= 0.8;

        if (this.transformActive) {
            currentSpeed *= this.stats.ultModifiers.speed;
            if (this.currentForm === 'OCEAN') currentSpeed *= 2.0;
            if (this.currentForm === 'IRON') currentSpeed *= 0.6;
        }

        if (this.isDashing) {
            currentSpeed *= 4;
            this.dashFrames--;
            if (this.dashFrames <= 0) this.isDashing = false;
            if (frame % 2 === 0) particles.push(new Particle(this.x, this.y, this.stats.color));
        }

        if (dx !== 0 || dy !== 0) {
            // Normalize vector if using keyboard (gamepad axes are usually 0-1)
            let len = Math.sqrt(dx * dx + dy * dy);
            // Cap length at 1 for gamepad to allow slow walking, but normalize keyboard
            if (len > 1) len = 1;
            // For keyboard diagonal, len is 1.414, so we normalize. 
            // For gamepad, we want to keep the analog value if it's < 1.

            // Simple normalization for direction calculation
            const moveLen = Math.sqrt(dx * dx + dy * dy);

            let nextX = this.x + (dx / (moveLen || 1)) * currentSpeed * (moveLen > 1 ? 1 : moveLen);
            let nextY = this.y + (dy / (moveLen || 1)) * currentSpeed * (moveLen > 1 ? 1 : moveLen);

            if (!checkWallCollision(nextX, nextY, this.radius)) {
                this.x = nextX; this.y = nextY;
            } else {
                if (!checkWallCollision(nextX, this.y, this.radius)) this.x = nextX;
                else if (!checkWallCollision(this.x, nextY, this.radius)) this.y = nextY;
            }
        }

        this.x = Math.max(this.radius, Math.min(canvas.width - this.radius, this.x));
        this.y = Math.max(this.radius, Math.min(canvas.height - this.radius, this.y));

        if (this.rangeCooldown > 0) this.rangeCooldown--;
        if (this.meleeCooldown > 0) this.meleeCooldown--;
    }

    draw() {
        ctx.save();
        ctx.translate(this.x, this.y);
        // Use stored aimAngle instead of calculating from mouse every frame
        ctx.rotate(this.aimAngle);

        // Transformation Visuals
        if (this.transformActive) {
            ctx.beginPath(); ctx.arc(0, 0, this.radius + 15, 0, Math.PI * 2);
            ctx.lineWidth = 4;
            if (this.currentForm === 'BLACK ICE') ctx.strokeStyle = '#000';
            if (this.currentForm === 'LAVA') ctx.strokeStyle = '#e74c3c';
            ctx.stroke();
        }

        if (this.buffs.speed > 0) {
            ctx.beginPath(); ctx.arc(0, 0, this.radius + 5, 0, Math.PI * 2);
            ctx.strokeStyle = '#f1c40f'; ctx.lineWidth = 2; ctx.stroke();
        }
        if (this.buffs.multi > 0) {
            ctx.beginPath(); ctx.arc(0, 0, this.radius + 8, 0, Math.PI * 2);
            ctx.strokeStyle = '#3498db'; ctx.lineWidth = 2; ctx.stroke();
        }
        if (this.buffs.autoaim > 0) {
            ctx.beginPath(); ctx.arc(0, 0, this.radius + 11, 0, Math.PI * 2);
            ctx.strokeStyle = '#9b59b6'; ctx.lineWidth = 2; ctx.stroke();
        }

        ctx.fillStyle = this.stats.color;
        ctx.beginPath(); ctx.arc(0, 0, this.radius, 0, Math.PI * 2); ctx.fill();
        ctx.lineWidth = 3; ctx.strokeStyle = '#111'; ctx.stroke();
        ctx.fillStyle = '#000'; ctx.fillRect(0, -4, 16, 8);
        ctx.fillStyle = shadeColor(this.stats.color, -40);
        ctx.beginPath(); ctx.arc(0, -15, 8, 0, Math.PI * 2); ctx.arc(0, 15, 8, 0, Math.PI * 2); ctx.fill();
        ctx.restore();

        if (this.dashCooldown > 0) {
            ctx.fillStyle = 'rgba(255, 255, 255, 0.3)';
            const w = 40 * (1 - (this.dashCooldown / this.dashMaxCooldown));
            ctx.fillRect(-20, 30, w, 4);
        }
    }

    shoot() {
        if (this.rangeCooldown > 0) return;

        let angle = this.aimAngle; // Use stored aim angle
        let autoAimActive = this.buffs.autoaim > 0;

        if (this.transformActive && this.currentForm === 'OCEAN') autoAimActive = true;

        if (autoAimActive) {
            let nearest = null;
            let minDst = Infinity;
            enemies.forEach(e => {
                const d = Math.hypot(e.x - this.x, e.y - this.y);
                if (d < minDst) { minDst = d; nearest = e; }
            });
            if (nearest) {
                angle = Math.atan2(nearest.y - this.y, nearest.x - this.x);
            }
        }

        let shots = [];
        let speed = this.stats.projectileSpeed;
        let dmg = this.stats.rangeDmg * this.damageMultiplier;
        let size = this.stats.projectileSize;
        let cooldown = this.stats.rangeCd * this.cooldownMultiplier;

        // Apply Weapon Tier Bonuses
        if (this.weapon !== 'STANDARD') {
            const tierMult = 1 + (this.weaponTier - 1) * 0.25; // +25% damage per tier
            dmg *= tierMult;
            size *= (1 + (this.weaponTier - 1) * 0.1); // +10% size per tier
        }

        // Crit Calculation per shot batch (or per projectile)
        // We'll calculate it per projectile in the loop for variety

        // Apply Blast Radius to size for Fire/Explosive
        if (this.type === 'fire' || this.weapon === 'BAZOOKA') {
            size *= (this.stats.blastRadiusMult || 1);
        }

        // Combo Fire Rate Buff
        if (this.combo > 10) cooldown *= 0.9;
        if (this.combo > 25) cooldown *= 0.9;
        if (this.combo > 50) cooldown *= 0.9;

        let isExplosive = false;
        let pierce = this.stats.pierce || 0;
        let color = this.stats.color;
        let knockback = this.stats.knockback * (this.stats.knockbackMult || 1);

        if (this.transformActive) {
            dmg *= this.stats.ultModifiers.damage;

            if (this.currentForm === 'BLACK ICE') {
                for (let i = 0; i < 8; i++) shots.push(angle + (Math.PI / 4) * i);
                dmg *= 1.5; color = '#000'; cooldown = 20 * this.cooldownMultiplier;
                pierce += 10; // Ult pierce
            } else if (this.currentForm === 'LAVA') {
                shots.push(angle + (Math.random() - 0.5) * 0.1);
                cooldown = 3 * this.cooldownMultiplier; dmg *= 0.8; color = '#e67e22';
            } else if (this.currentForm === 'CREEPER') {
                shots.push(angle);
                size = 15; pierce = 100; dmg *= 2; cooldown = 40 * this.cooldownMultiplier; color = '#27ae60';
            } else if (this.currentForm === 'OCEAN') {
                shots.push(angle);
                speed *= 1.5; cooldown = 8 * this.cooldownMultiplier; color = '#3498db';
            } else if (this.currentForm === 'IRON') {
                shots.push(angle);
                size = 12; dmg *= 3; speed *= 0.8; cooldown = 50 * this.cooldownMultiplier; color = '#7f8c8d';
            }
        } else {
            if (this.weapon === 'SCATTER') {
                shots.push(angle - 0.3, angle - 0.15, angle, angle + 0.15, angle + 0.3);
                cooldown = 30 * this.cooldownMultiplier; dmg = this.stats.rangeDmg * 0.6 * this.damageMultiplier;
            } else if (this.weapon === 'MINIGUN') {
                shots.push(angle + (Math.random() - 0.5) * 0.2);
                cooldown = 4 * this.cooldownMultiplier; dmg = this.stats.rangeDmg * 0.4 * this.damageMultiplier;
            } else if (this.weapon === 'BAZOOKA') {
                shots.push(angle); speed = 8; size = 10; dmg = this.stats.rangeDmg * 2 * this.damageMultiplier;
                cooldown = 60 * this.cooldownMultiplier; isExplosive = true;
            } else {
                if (this.type === 'plant') { shots.push(angle - 0.2, angle, angle + 0.2); }
                else { shots.push(angle); }
                if (this.buffs.multi > 0) {
                    shots.push(angle - 0.25, angle + 0.25);
                }

                // Fire Hero Special Trait
                if (this.type === 'fire' && Math.random() < (this.stats.explodeChance || 0)) {
                    isExplosive = true;
                    color = '#e67e22'; // Orange tint for explosive shots
                    size *= 1.5; // Increase size for explosion
                    dmg *= 1.2; // Slightly increase damage
                }
            }
        }

        shots.forEach(a => {
            // Calculate Crit
            const isCrit = Math.random() < this.critChance;
            const finalDmg = dmg * (isCrit ? this.critMultiplier : 1);

            const vel = { x: Math.cos(a) * speed, y: Math.sin(a) * speed };
            const proj = new Projectile(this.x, this.y, vel, finalDmg, color, size, this.type, knockback, false, isExplosive, isCrit);
            if (pierce > 0) proj.pierce = pierce;
            projectiles.push(proj);
            currentRunStats.missilesFired++; // Track Missiles

            if (this.weapon === 'STANDARD' && !this.transformActive) {
                for (let i = 1; i <= this.extraProjectiles; i++) {
                    // Extra projectiles also roll for crit independently
                    const isExtraCrit = Math.random() < this.critChance;
                    const extraDmg = dmg * (isExtraCrit ? this.critMultiplier : 1);

                    const offsetX = this.x - (vel.x * (i * 3));
                    const offsetY = this.y - (vel.y * (i * 3));
                    const extraProj = new Projectile(offsetX, offsetY, vel, extraDmg, this.stats.color, size, this.type, knockback, false, false, isExtraCrit);
                    if (pierce > 0) extraProj.pierce = pierce;
                    projectiles.push(extraProj);
                    currentRunStats.missilesFired++; // Track Missiles
                }
            }
        });

        this.rangeCooldown = cooldown;
    }

    melee() {
        if (this.meleeCooldown > 0) return;
        const angle = this.aimAngle; // Use stored aim angle

        const isCrit = Math.random() < this.critChance;
        const finalDmg = this.stats.meleeDmg * this.damageMultiplier * (isCrit ? this.critMultiplier : 1);

        meleeAttacks.push(new MeleeSwipe(this.x, this.y, angle, finalDmg, this.stats.color, this.meleeRadius, isCrit));
        this.meleeCooldown = this.meleeMaxCooldown * this.cooldownMultiplier;
    }
}
