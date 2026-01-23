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

        // New Stats
        this.damageReduction = this.stats.defense || 0;
        this.damageMultiplier = 1;
        this.maskChance = 0.01;
        this.speedMultiplier = 1;
        this.trapSpeedMod = 1; // Added for traps
        this.cooldownMultiplier = 1;
        this.gold = 0;
        this.goldMultiplier = this.stats.goldMultiplier || 1;

        // Debug
        this.isInvincible = false;

        // Apply Meta Greed
        this.goldMultiplier += (saveData.metaUpgrades.greed || 0) * 0.05;

        // Apply Chaos Gold Bonus
        if (saveData.chaos && saveData.chaos.active) {
            saveData.chaos.active.forEach(id => {
                const effect = CHAOS_EFFECTS.find(e => e.id === id);
                if (effect) {
                    this.goldMultiplier += effect.bonus;
                }
            });
        }

        // Biome Modifier
        this.biomeSpeedMod = 1;

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

        // Chaos Effects (Constructor)
        if (typeof isChaosActive === 'function') {
            if (isChaosActive('TINY_PLAYER')) this.radius *= 0.5;
            if (isChaosActive('ONE_HIT')) {
                this.maxHp = 1;
                this.hp = 1;
            }
        }

        // Physics State for Slippery
        this.vx = 0;
        this.vy = 0;

        // DLC Hero Initialization
        if (window.HERO_LOGIC && window.HERO_LOGIC[this.type]) {
            window.HERO_LOGIC[this.type].init(this);
        }
    }

    gainXp(amount) {
        this.xp += amount * (this.stats.xpMultiplier || 1);
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

        let options = [];

        if (this.level % 10 === 0) {
            const formName = this.getFormName();
            let desc = `Transform into ${formName}! Lasts until you take damage.`;
            if (this.type === 'earth') desc = `Transform into ${formName}! Lasts 15 seconds. Unstoppable Momentum.`;

            const transformOption = {
                id: 'transform',
                title: 'ULTIMATE FORM',
                desc: desc,
                icon: '🌟'
            };
            const pool = [...UPGRADE_POOL].sort(() => 0.5 - Math.random());
            options = [transformOption, pool[0]];
        } else {
            const pool = [...UPGRADE_POOL].sort(() => 0.5 - Math.random());
            options = pool.slice(0, 2);
        }

        if (window.levelUpUI) {
            window.levelUpUI.showLevelUp(this, options);
        } else {
            console.error("LevelUpUI not initialized");
        }
    }

    getFormName() {
        if (this.type === 'ice') return 'BLACK ICE';
        if (this.type === 'fire') return 'LAVA';
        if (this.type === 'metal') return 'IRON';
        if (this.type === 'plant') return 'CREEPER';
        if (this.type === 'water') return 'OCEAN';
        if (this.type === 'black') return 'THE SHADOW';
        if (this.type === 'earth') return 'OBSIDIAN GOLEM';
        return 'ULTIMATE';
    }

    dash() {
        // Chaos Hook
        if (typeof isChaosShuffleMode !== 'undefined' && isChaosShuffleMode) checkChaosEvent('DASH');

        // Mutator: No Dash
        if (typeof activeMutators !== 'undefined' && activeMutators.some(m => m.id === 'NO_DASH')) return;

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
            if (typeof audioManager !== 'undefined') audioManager.play('dash');
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
        } else if (this.type === 'black') {
            this.specialName = "VOID ERUPTION";
            this.specialMaxCooldown = 900; // 15s
            iconEl.innerText = "🌑";
        }

        // Apply Altar Stats (Passive)
        if (saveData.altar && saveData.altar.active) {
            const active = saveData.altar.active;
            // Helper to check if node is active
            const has = (id) => active.includes(id);

            // Cooldown Reductions
            if (this.type === 'fire' && has('f1')) this.specialMaxCooldown *= 0.9;
            if (this.type === 'water' && has('w1')) this.specialMaxCooldown *= 0.9;
            if (this.type === 'ice' && has('i1')) this.specialMaxCooldown *= 0.9;
            if (this.type === 'plant' && has('p1')) this.specialMaxCooldown *= 0.9;
            if (this.type === 'metal' && has('m1')) this.specialMaxCooldown *= 0.9;
        }
    }

    useSpecial() {
        if (this.specialCooldown > 0) return;

        // Chaos Hook
        if (typeof isChaosShuffleMode !== 'undefined' && isChaosShuffleMode) checkChaosEvent('SPECIAL');

        // --- DLC HOOK: Custom Special ---
        if (this.customSpecial) {
            if (this.customSpecial()) {
                this.specialCooldown = this.specialMaxCooldown * this.cooldownMultiplier;
                return;
            }
        }

        showNotification(`${this.specialName}!`);
        this.specialCooldown = this.specialMaxCooldown * this.cooldownMultiplier;

        // Altar Checks
        const active = (saveData.altar && saveData.altar.active) ? saveData.altar.active : [];
        const has = (id) => active.includes(id);

        if (this.type === 'fire') {
            if (typeof audioManager !== 'undefined') audioManager.play('special_fire');
            // Ring of explosions
            let radius = 150;
            if (has('f2')) radius *= 1.2; // +20% Radius

            // Convergence: Thermal Shock (c3)
            const isThermal = has('c3');
            // Convergence: Meteor Impact (c11)
            const isMeteor = has('c11');
            // Convergence: Plasma (c16)
            const isPlasma = has('c16');

            for (let i = 0; i < 12; i++) {
                const angle = (Math.PI * 2 / 12) * i;
                const ex = this.x + Math.cos(angle) * radius;
                const ey = this.y + Math.sin(angle) * radius;
                setTimeout(() => {
                    createExplosion(ex, ey, '#e74c3c');
                    // Lingering Flame (f3)
                    if (has('f3')) {
                        setTimeout(() => createExplosion(ex, ey, '#e67e22'), 500);
                    }

                    enemies.forEach(e => {
                        if (Math.hypot(e.x - ex, e.y - ey) < 80) {
                            e.hp -= 50 * this.damageMultiplier;
                            floatingTexts.push(new FloatingText(e.x, e.y - 20, "50", "#e74c3c", 20));

                            if (isThermal) {
                                e.frozenTimer = 60; // 1s Freeze
                                floatingTexts.push(new FloatingText(e.x, e.y - 40, "FREEZE", "#aaddff", 16));
                            }
                            if (isMeteor) {
                                const angle = Math.atan2(e.y - ey, e.x - ex);
                                e.x += Math.cos(angle) * 50;
                                e.y += Math.sin(angle) * 50;
                            }
                            if (isPlasma) {
                                createExplosion(e.x, e.y, '#ffff00');
                                e.hp -= 20 * this.damageMultiplier;
                            }
                        }
                    });
                }, i * 50);
            }
        } else if (this.type === 'water') {
            if (typeof audioManager !== 'undefined') audioManager.play('special_water');
            // Pushback
            createExplosion(this.x, this.y, '#3498db');
            let pushForce = 200;
            if (has('w2')) pushForce *= 1.3; // +30% Pushback

            // Tsunami (w3) - Wider effect?
            // Convergence: Boiling Wave (c1)
            const isBoiling = has('c1');
            // Convergence: Algae Bloom (c7)
            const isAlgae = has('c7');
            // Convergence: Muddy Waters (c12)
            const isMuddy = has('c12');
            // Convergence: Hydro-Shield (c8)
            if (has('c8')) {
                if (typeof isChaosActive === 'function' && !isChaosActive('NO_REGEN')) this.hp = Math.min(this.maxHp, this.hp + 20); // Temp HP / Heal
                floatingTexts.push(new FloatingText(this.x, this.y - 40, "SHIELD", "#3498db", 20));
            }

            // Convergence: Storm Surge (c19)
            const isStormSurge = has('c19');

            enemies.forEach(e => {
                const angle = Math.atan2(e.y - this.y, e.x - this.x);
                e.x += Math.cos(angle) * pushForce;
                e.y += Math.sin(angle) * pushForce;
                e.hp -= 20 * this.damageMultiplier;

                if (isStormSurge) {
                    e.hp -= 25 * this.damageMultiplier;
                    if (Math.random() < 0.5) {
                        floatingTexts.push(new FloatingText(e.x, e.y - 40, "ZAP", "#ffff00", 16));
                        // Check if createExplosion supports color
                        createExplosion(e.x, e.y, '#ffff00');
                    }
                }

                if (isBoiling) {
                    e.hp -= 10 * this.damageMultiplier; // Fire DoT instant burst
                    floatingTexts.push(new FloatingText(e.x, e.y - 40, "BOIL", "#e74c3c", 16));
                }
                if (isAlgae) {
                    if (typeof isChaosActive === 'function' && !isChaosActive('NO_REGEN')) this.hp = Math.min(this.maxHp, this.hp + 1);
                }
                if (isMuddy) {
                    e.speedMult = (e.speedMult || 1) * 0.5;
                    floatingTexts.push(new FloatingText(e.x, e.y - 60, "SLOW", "#8d6e63", 16));
                }
            });
        } else if (this.type === 'ice') {
            if (typeof audioManager !== 'undefined') audioManager.play('special_ice');
            // Freeze
            let duration = 180;
            if (has('i2')) duration *= 1.5; // +50% Duration

            // Shatter (i3)
            const canShatter = has('i3');
            // Convergence: Permafrost (c6)
            const isPermafrost = has('c6');
            // Convergence: Glacial Shatter (c13)
            const isGlacial = has('c13');

            enemies.forEach(e => {
                if (canShatter && e.frozenTimer > 0) {
                    e.hp -= 50 * this.damageMultiplier; // Shatter Damage
                    floatingTexts.push(new FloatingText(e.x, e.y - 20, "SHATTER", "#aaddff", 20));
                }
                e.frozenTimer = duration;
                floatingTexts.push(new FloatingText(e.x, e.y - 40, "FROZEN", "#aaddff", 16));

                if (isPermafrost) {
                    const angle = Math.atan2(e.y - this.y, e.x - this.x);
                    e.x += Math.cos(angle) * 150;
                    e.y += Math.sin(angle) * 150;
                }
                if (isGlacial) {
                    e.hp -= 30 * this.damageMultiplier;
                    floatingTexts.push(new FloatingText(e.x, e.y - 60, "CRUSH", "#8d6e63", 20));
                }
            });
        } else if (this.type === 'plant') {
            if (typeof audioManager !== 'undefined') audioManager.play('special_plant');
            // Heal + Turret
            let healAmount = this.maxHp * 0.3;
            if (has('p2')) healAmount *= 1.2; // +20% Heal

            if (typeof isChaosActive === 'function' && !isChaosActive('NO_REGEN')) this.hp = Math.min(this.maxHp, this.hp + healAmount);
            floatingTexts.push(new FloatingText(this.x, this.y - 40, "HEAL", "#2ecc71", 20));

            // Convergence: Bio-Electricity (c20)
            if (has('c20')) {
                enemies.forEach(e => {
                    if (Math.hypot(e.x - this.x, e.y - this.y) < 250) {
                        e.hp -= 40 * this.damageMultiplier;
                        createExplosion(e.x, e.y, '#ffff00');
                        floatingTexts.push(new FloatingText(e.x, e.y - 30, "SHOCK", "#ffff00", 18));
                    }
                });
            }

            // Thornmail (p3)
            if (has('p3')) {
                this.thornmailTimer = 300; // 5s
                floatingTexts.push(new FloatingText(this.x, this.y - 60, "THORNMAIL", "#2ecc71", 20));
            }

            // Convergence: Ironbark (c10)
            if (has('c10')) {
                const oldDr = this.damageReduction;
                this.damageReduction = Math.max(this.damageReduction, 0.5); // Set to 50% DR if lower
                setTimeout(() => this.damageReduction = oldDr, 5000); // Reset to previous value
                floatingTexts.push(new FloatingText(this.x, this.y - 80, "IRONBARK", "#95a5a6", 20));
            }

            // Convergence: Stone Roots (c14)
            if (has('c14')) {
                this.invincibleTimer = 60; // 1s Invincibility
                floatingTexts.push(new FloatingText(this.x, this.y - 80, "STONE SKIN", "#8d6e63", 20));
            }

            // Convergence: Wildfire (c4)
            const isWildfire = has('c4');
            // Convergence: Cryo-Flora (c9)
            const isCryo = has('c9');

            // Burst of thorns
            for (let i = 0; i < 20; i++) {
                const angle = (Math.PI * 2 / 20) * i;
                const p = new Projectile(this.x, this.y, { x: Math.cos(angle) * 10, y: Math.sin(angle) * 10 }, 30 * this.damageMultiplier, '#2ecc71', 5, 'plant', 10, false);
                if (isWildfire) p.color = '#e67e22'; // Orange thorns
                if (isCryo) p.color = '#aaddff'; // Blue thorns
                // We need to handle these effects in Projectile collision or just assume basic damage for now
                // Since Projectile class handles collision, we might need to add flags to projectile
                // But Projectile constructor doesn't take flags.
                // Let's hack it by adding properties after creation
                if (isWildfire) p.isWildfire = true;
                if (isCryo) p.isCryo = true;

                projectiles.push(p);
            }
        } else if (this.type === 'metal') {
            if (typeof audioManager !== 'undefined') audioManager.play('special_metal');
            // Invincible
            let duration = 300;
            if (has('m2')) duration *= 1.5; // +50% Duration

            this.invincibleTimer = duration;
            floatingTexts.push(new FloatingText(this.x, this.y - 40, "INVINCIBLE", "#95a5a6", 20));

            // Magnetic Field (m3)
            if (has('m3')) {
                enemies.forEach(e => {
                    if (Math.hypot(e.x - this.x, e.y - this.y) < 400) {
                        const angle = Math.atan2(this.y - e.y, this.x - e.x);
                        e.x += Math.cos(angle) * 100;
                        e.y += Math.sin(angle) * 100;
                    }
                });
            }

            // Convergence: Frostbite Armor (c2)
            if (has('c2')) this.hasFrostbiteArmor = true;

            // Convergence: Heavy Metal (c15)
            if (has('c15')) {
                createExplosion(this.x, this.y, '#8d6e63');
                enemies.forEach(e => {
                    if (Math.hypot(e.x - this.x, e.y - this.y) < 150) {
                        const angle = Math.atan2(e.y - this.y, e.x - this.x);
                        e.x += Math.cos(angle) * 200;
                        e.y += Math.sin(angle) * 200;
                        e.hp -= 50 * this.damageMultiplier;
                    }
                });
            }

            // Convergence: Molten Core (c5)
            if (has('c5')) {
                // Pulse fire
                createExplosion(this.x, this.y, '#e74c3c');
                enemies.forEach(e => {
                    if (Math.hypot(e.x - this.x, e.y - this.y) < 200) {
                        e.hp -= 30 * this.damageMultiplier;
                        floatingTexts.push(new FloatingText(e.x, e.y - 20, "BURN", "#e74c3c", 16));
                    }
                });
            }
        } else if (this.type === 'black') {
            // Massive Area Damage + Heal
            // Play Sound
            if (typeof audioManager !== 'undefined') audioManager.play('special_black');

            let radius = 300;

            // Burst Heal
            if (typeof isChaosActive === 'function' && !isChaosActive('NO_REGEN')) {
                this.hp = Math.min(this.maxHp, this.hp + 50);
                floatingTexts.push(new FloatingText(this.x, this.y - 40, "+50 HP", "#2ecc71", 20));
            }

            createExplosion(this.x, this.y, '#9b59b6'); // Bright Purple

            // Ring Effect (Visual Pulse)
            for (let i = 0; i < 36; i++) {
                const angle = (Math.PI * 2 / 36) * i;
                const px = this.x + Math.cos(angle) * (radius / 2);
                const py = this.y + Math.sin(angle) * (radius / 2);
                particles.push(new Particle(px, py, '#8e44ad'));
            }

            // Convergence: Void Storm (c22)
            const isVoidStorm = has('c22');

            enemies.forEach(e => {
                if (Math.hypot(e.x - this.x, e.y - this.y) < radius) {
                    e.hp -= 100 * this.damageMultiplier;
                    floatingTexts.push(new FloatingText(e.x, e.y - 20, "100", "#8e44ad", 25));
                    createExplosion(e.x, e.y, '#9b59b6');

                    if (isVoidStorm) {
                        e.hp -= 50 * this.damageMultiplier;
                        e.frozenTimer = 60; // Mini-stun
                        createExplosion(e.x, e.y, '#ffff00'); // Lightning visual
                        floatingTexts.push(new FloatingText(e.x, e.y - 50, "STORM", "#ffff00", 20));
                    }
                }
            });
        }
    }

    onKill() {
        if (this.type === 'black') {
            if (typeof isChaosActive === 'function' && !isChaosActive('NO_REGEN')) {
                // Buffed Healing: 3 HP per kill (was 1)
                this.hp = Math.min(this.maxHp, this.hp + 3);
                floatingTexts.push(new FloatingText(this.x, this.y - 30, "+3", "#2ecc71", 14));
            }
        }
    }

    update() {
        this.trapSpeedMod = 1; // Reset trap modifier

        if (this.buffs.speed > 0) this.buffs.speed--;
        if (this.buffs.multi > 0) this.buffs.multi--;
        if (this.buffs.autoaim > 0) this.buffs.autoaim--;
        if (this.specialCooldown > 0) this.specialCooldown--;
        if (this.invincibleTimer > 0) {
            this.invincibleTimer--;
            if (this.invincibleTimer <= 0) this.hasFrostbiteArmor = false;
        }
        if (this.thornmailTimer > 0) this.thornmailTimer--;
        if (this.pauseDebounce > 0) this.pauseDebounce--;

        if (this.dashCooldown > 0) this.dashCooldown--;

        // Black Hero Passive: DoT & Aura
        if (this.type === 'black') {
            // Self Damage (DoT) - Increases with wave
            // Base: 1 HP per 20 frames. Scaling: +0.1 per wave
            if (frame % 20 === 0 && this.hp > 1) {
                const dotDamage = 1 + (wave * 0.1);
                this.hp -= dotDamage;
                currentRunStats.damageTaken += dotDamage;

                // Visual indicator for high DoT
                if (dotDamage > 2) {
                    floatingTexts.push(new FloatingText(this.x, this.y - 20, "-" + dotDamage.toFixed(1), "#555", 12));
                }
            }

            // Dark Aura (Damage nearby enemies)
            if (frame % 30 === 0) { // Twice a second
                enemies.forEach(e => {
                    if (Math.hypot(e.x - this.x, e.y - this.y) < 150) {
                        e.hp -= 5 * this.damageMultiplier;
                        createExplosion(e.x, e.y, '#9b59b6'); // Purple pop
                    }
                });
            }
        }

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

            // Melee: LT (Button 6) or X (Button 2)
            if (gp.buttons[6].pressed || gp.buttons[2].pressed) this.melee();

            // Dash: B (Button 1) or LB (Button 4) or A (Button 0)
            if ((gp.buttons[1].pressed || gp.buttons[4].pressed || gp.buttons[0].pressed) && !this.isDashing) this.dash();

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
            // Adjust mouse coordinates by camera position
            const camX = arena ? arena.camera.x : 0;
            const camY = arena ? arena.camera.y : 0;
            this.aimAngle = Math.atan2((mouse.y + camY) - this.y, (mouse.x + camX) - this.x);
            if (mouse.leftDown) this.shoot();
            if (mouse.rightDown) this.melee();
        }

        // Chaos: Inverted Controls
        if (typeof isChaosActive === 'function' && isChaosActive('INVERTED')) {
            dx = -dx;
            dy = -dy;
        }

        // Store input for dash direction
        this.moveInput = { x: dx, y: dy };

        // --- DLC HOOK: Custom Update ---
        if (this.customUpdate) {
            // If customUpdate returns true, it handles movement/physics completely
            if (this.customUpdate(dx, dy)) return;
        }

        let currentSpeed = this.stats.speed * this.speedMultiplier * this.trapSpeedMod;
        if (this.buffs.speed > 0) currentSpeed *= 1.5;

        // Apply Biome Modifier
        currentSpeed *= this.biomeSpeedMod;

        // Weather Slow
        if (currentWeather && currentWeather.id === 'BLIZZARD') currentSpeed *= 0.8;

        // Chaos: Double Speed
        if (typeof isChaosActive === 'function' && isChaosActive('DOUBLE_SPEED')) {
            currentSpeed *= 2;
        }

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

        // Calculate Movement Vector
        let moveX = 0;
        let moveY = 0;

        if (typeof isChaosActive === 'function' && isChaosActive('SLIPPERY')) {
            // Slippery logic
            if (dx !== 0 || dy !== 0) {
                const moveLen = Math.sqrt(dx * dx + dy * dy);
                const scale = (moveLen > 1 ? 1 : moveLen);
                const targetVx = (dx / (moveLen || 1)) * currentSpeed * scale;
                const targetVy = (dy / (moveLen || 1)) * currentSpeed * scale;

                this.vx += (targetVx - this.vx) * 0.05;
                this.vy += (targetVy - this.vy) * 0.05;
            } else {
                this.vx *= 0.95; // Friction
                this.vy *= 0.95;
            }
            moveX = this.vx;
            moveY = this.vy;
        } else {
            // Normal Movement
            if (dx !== 0 || dy !== 0) {
                const moveLen = Math.sqrt(dx * dx + dy * dy);
                const scale = (moveLen > 1 ? 1 : moveLen); // Cap at 1 for gamepad
                moveX = (dx / (moveLen || 1)) * currentSpeed * scale;
                moveY = (dy / (moveLen || 1)) * currentSpeed * scale;
            }
        }

        // WINDY MUTATOR
        if (typeof activeMutators !== 'undefined' && activeMutators.some(m => m.id === 'WINDY')) {
            moveX += 1.5; // Wind pushes right
        }

        // Apply Movement
        if (moveX !== 0 || moveY !== 0) {
            let nextX = this.x + moveX;
            let nextY = this.y + moveY;

            if (!arena.checkCollision(nextX, nextY, this.radius)) {
                this.x = nextX; this.y = nextY;
            } else {
                if (!arena.checkCollision(nextX, this.y, this.radius)) this.x = nextX;
                else if (!arena.checkCollision(this.x, nextY, this.radius)) this.y = nextY;
            }
        }

        this.x = Math.max(this.radius, Math.min(arena.width - this.radius, this.x));
        this.y = Math.max(this.radius, Math.min(arena.height - this.radius, this.y));

        if (this.rangeCooldown > 0) this.rangeCooldown--;
        if (this.meleeCooldown > 0) this.meleeCooldown--;
    }

    draw() {
        // --- DLC HOOK: Custom Draw ---
        if (this.customDraw) {
            this.customDraw(ctx);
            return;
        }

        ctx.save();
        ctx.translate(this.x, this.y);
        // Use stored aimAngle instead of calculating from mouse every frame
        ctx.rotate(this.aimAngle);

        // Black Hero Aura Visual
        if (this.type === 'black') {
            ctx.beginPath();
            ctx.arc(0, 0, 150, 0, Math.PI * 2);
            ctx.fillStyle = 'rgba(142, 68, 173, 0.1)'; // Faint purple
            ctx.fill();
            ctx.strokeStyle = 'rgba(142, 68, 173, 0.3)';
            ctx.lineWidth = 1;
            ctx.stroke();
        }

        // Metal Hero Invincibility Visual
        if (this.type === 'metal' && this.invincibleTimer > 0) {
            ctx.beginPath();
            ctx.arc(0, 0, this.radius + 5, 0, Math.PI * 2);
            ctx.strokeStyle = '#bdc3c7'; // Silver/Metal color
            ctx.lineWidth = 3;
            ctx.setLineDash([5, 5]); // Dashed line for shield effect
            ctx.stroke();
            ctx.setLineDash([]); // Reset dash

            // Inner glow
            ctx.fillStyle = 'rgba(189, 195, 199, 0.3)';
            ctx.fill();
        }

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
        if (typeof isChaosShuffleMode !== 'undefined' && isChaosShuffleMode && typeof checkChaosEvent === 'function') checkChaosEvent('ATTACK');

        // Melee Only Mutator / Chaos Effect
        if ((typeof activeMutators !== 'undefined' && activeMutators.some(m => m.id === 'MELEE_ONLY')) ||
            (typeof isChaosActive !== 'undefined' && isChaosActive('MELEE_ONLY'))) {
            return;
        }

        // Play Attack Sound
        if (typeof audioManager !== 'undefined') audioManager.playAttack(this.type);

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

        // Crit Calculation per shot batch (or per projectile)
        // We'll calculate it per projectile in the loop for variety

        // Apply Blast Radius to size for Fire/Explosive
        if (this.type === 'fire') {
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

        shots.forEach(a => {
            // Calculate Crit
            const isCrit = Math.random() < this.critChance;
            const finalDmg = dmg * (isCrit ? this.critMultiplier : 1);

            const vel = { x: Math.cos(a) * speed, y: Math.sin(a) * speed };
            const proj = new Projectile(this.x, this.y, vel, finalDmg, color, size, this.type, knockback, false, isExplosive, isCrit);
            if (pierce > 0) proj.pierce = pierce;
            projectiles.push(proj);
            currentRunStats.missilesFired++; // Track Missiles

            if (!this.transformActive) {
                for (let i = 1; i <= this.extraProjectiles; i++) {
                    // Extra projectiles also roll for crit independently
                    const isExtraCrit = Math.random() < this.critChance;
                    const extraDmg = dmg * (isExtraCrit ? this.critMultiplier : 1);

                    // Add slight spread to extra projectiles so they are visible
                    const spreadAngle = (Math.random() - 0.5) * 0.2; // +/- 0.1 radians (~5.7 degrees)
                    const spreadVel = {
                        x: Math.cos(angle + spreadAngle) * speed,
                        y: Math.sin(angle + spreadAngle) * speed
                    };

                    // Spawn exactly at hero position
                    const extraProj = new Projectile(this.x, this.y, spreadVel, extraDmg, this.stats.color, size, this.type, knockback, false, false, isExtraCrit);
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
        if (typeof isChaosShuffleMode !== 'undefined' && isChaosShuffleMode && typeof checkChaosEvent === 'function') checkChaosEvent('ATTACK');

        // Play Melee Sound
        if (typeof audioManager !== 'undefined') {
            if (this.type === 'earth') audioManager.play('melee_earth');
            else audioManager.play('melee_all');
        }

        const angle = this.aimAngle; // Use stored aim angle

        const isCrit = Math.random() < this.critChance;
        const finalDmg = this.stats.meleeDmg * this.damageMultiplier * (isCrit ? this.critMultiplier : 1);

        meleeAttacks.push(new MeleeSwipe(this.x, this.y, angle, finalDmg, this.stats.color, this.meleeRadius, isCrit));
        this.meleeCooldown = this.meleeMaxCooldown * this.cooldownMultiplier;
    }
}

window.getHeroStats = function (type) {
    const base = JSON.parse(JSON.stringify(BASE_HERO_STATS[type]));
    const heroData = saveData[type];
    const treeData = window.generateHeroSkillTree(type);

    base.ultModifiers = { damage: 1, speed: 1 };

    // Apply Meta Upgrades (Permanent Shop)
    base.hp += (saveData.metaUpgrades.health || 0) * 5;
    base.rangeDmg *= (1 + (saveData.metaUpgrades.power || 0) * 0.01);
    base.meleeDmg *= (1 + (saveData.metaUpgrades.power || 0) * 0.01);
    base.speed *= (1 + (saveData.metaUpgrades.swift || 0) * 0.01);

    // Breakdown tracking
    base.breakdown = {
        damage: { tree: 0, ach: 0 },
        health: { tree: 0, ach: 0 },
        speed: { tree: 0, ach: 0 },
        cooldown: { tree: 0, ach: 0 },
        defense: { tree: 0, ach: 0 },
        projectiles: { tree: 0, ach: 0 },
        luck: { tree: 0, ach: 0 },
        explodeChance: { tree: 0, ach: 0 }
    };

    // New Stats Defaults
    base.pierce = (type === 'ice') ? 2 : 0;
    base.blastRadiusMult = 1;
    base.knockbackMult = 1;
    base.defense = (saveData.metaUpgrades.defense || 0) * 0.01; // Apply Void Shell
    base.extraProjectiles = 0;
    base.meleeRadiusMult = 1;
    base.explodeChance = 0;
    base.goldMultiplier = 1; // Initialize gold multiplier
    base.xpMultiplier = 1 + (saveData.metaUpgrades.wisdom || 0) * 0.02; // Apply Void Mind

    // Earth Hero Stats (Defaults)
    base.momentumCap = 100;
    base.ramDmgMult = 1;
    base.momentumDecayMult = 1;

    const prestigeMult = 1 + (heroData.prestige * 0.2); // Reduced from 0.5 to 0.2
    base.hp *= prestigeMult;
    base.rangeDmg *= prestigeMult;
    base.meleeDmg *= prestigeMult;
    base.goldMultiplier *= prestigeMult; // Apply prestige to gold gain

    const unlockedCount = heroData.unlocked;
    for (let i = 0; i < unlockedCount; i++) {
        const node = treeData[i];
        if (node.type === 'DAMAGE') { base.rangeDmg *= (1 + node.value); base.breakdown.damage.tree += node.value; }
        if (node.type === 'HEALTH') { base.hp *= (1 + node.value); base.breakdown.health.tree += node.value; }
        if (node.type === 'SPEED') { base.speed *= (1 + node.value); base.breakdown.speed.tree += node.value; }
        if (node.type === 'COOLDOWN') {
            base.rangeCd *= (1 - node.value);
            base.meleeCd *= (1 - node.value);
            base.breakdown.cooldown.tree += node.value;
        }
        if (node.type === 'ULT_DAMAGE') base.ultModifiers.damage += node.value;
        if (node.type === 'ULT_SPEED') base.ultModifiers.speed += node.value;

        // Specifics
        if (node.type === 'BLAST') base.blastRadiusMult += node.value;
        if (node.type === 'EXPLODE_CHANCE') { base.explodeChance += node.value; base.breakdown.explodeChance.tree += node.value; }
        if (node.type === 'KNOCK') base.knockbackMult += node.value;
        if (node.type === 'PIERCE') base.pierce += node.value;
        if (node.type === 'SPLIT') {
            base.extraProjectiles += node.value;
            base.breakdown.projectiles.tree += node.value;
            // Nerf damage: 20% reduction per extra projectile (Additive divisor, not compounding)
            base.rangeDmg /= (1 + (0.2 * node.value));
        }
        if (node.type === 'ARMOR') { base.defense += node.value; base.breakdown.defense.tree += node.value; }
        if (node.type === 'MELEE') base.meleeRadiusMult += node.value;

        // DLC Hook: Apply Node
        if (window.HERO_LOGIC && window.HERO_LOGIC[type] && window.HERO_LOGIC[type].applySkillNode) {
            window.HERO_LOGIC[type].applySkillNode(base, node);
        }
    }

    // Apply Achievement Bonuses
    if (saveData.global.unlockedAchievements) {
        saveData.global.unlockedAchievements.forEach(id => {
            const ach = ACHIEVEMENTS.find(a => a.id === id);
            if (ach) {
                if (ach.bonus.type === 'damage') { base.rangeDmg *= (1 + ach.bonus.val); base.breakdown.damage.ach += ach.bonus.val; }
                if (ach.bonus.type === 'health') { base.hp *= (1 + ach.bonus.val); base.breakdown.health.ach += ach.bonus.val; }
                if (ach.bonus.type === 'gold') { base.goldMultiplier += ach.bonus.val; } // Note: Gold isn't in breakdown yet, but works

                // NEW TYPES
                if (ach.bonus.type === 'speed') {
                    base.speed *= (1 + ach.bonus.val);
                    base.breakdown.speed.ach += ach.bonus.val;
                }
                if (ach.bonus.type === 'cooldown') {
                    base.rangeCd *= (1 - ach.bonus.val);
                    base.meleeCd *= (1 - ach.bonus.val);
                    base.breakdown.cooldown.ach += ach.bonus.val;
                }
            }
        });
    }

    base.hp = Math.floor(base.hp);
    return base;
};
