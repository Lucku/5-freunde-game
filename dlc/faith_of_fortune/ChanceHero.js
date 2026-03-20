// Chance (Magenta) Hero Logic
// Playstyle: High Risk, RNG, Luck Manipulation
// Damage is random, abilities are random.

class ChanceHero {
    static init(player) {
        // Base Stats (Volatile)
        player.speedMultiplier = 1.1;
        player.damageMultiplier = 1.0;

        // Unique Attribute: Luck (0 to 100 scale)
        player.luck = 10;
        player.critChance = 0.1; // Base 10%
        player.critMultiplier = 2.0; // Big crits

        // Resource: Tokens (for Special?) or just Cooldown
        player.specialName = "SLOTS";
        player.specialMaxCooldown = 900; // 15s

        player.customUpdate = (dx, dy) => ChanceHero.update(player, dx, dy);
        player.customSpecial = () => ChanceHero.useSpecial(player);
        player.shoot = (dx, dy) => ChanceHero.shootDice(player, dx, dy);

        // Form Name
        player.getFormName = function () { return 'JACKPOT'; };

        // Slots State
        player.slotMachine = {
            active: false,
            timer: 0,
            reels: [0, 0, 0], // 0-5 symbols
            outcome: null
        };

        // Symbols: 0: Cherry, 1: Bell, 2: Bar, 3: 7, 4: Diamond, 5: Skull

        // Upgrade Pool
        if (typeof window.HERO_LOGIC === 'undefined') window.HERO_LOGIC = {};
        window.HERO_LOGIC['chance'] = ChanceHero;
    }

    static checkConvergence(player, id) {
        if (typeof has === 'function') return has(id);
        if (window.player && window.player.upgradeList) return window.player.upgradeList.includes(id);
        return false;
    }

    static getSkillTreeWeights() {
        return { CHANCE_LUCK: 0.30, CRIT: 0.20, DAMAGE: 0.15, SPEED: 0.15, COOLDOWN: 0.10, PROJECTILE: 0.10 };
    }

    static getSkillNodeDetails(type, val, desc) {
        if (type === 'CHANCE_LUCK') return { val: 10, desc: "+10 Luck" };
        if (type === 'PROJECTILE') return { val: 1, desc: "+1 Projectile" };
        return { val, desc };
    }

    // SKILL TREE: Permanent Meta-Progression
    static applySkillNode(base, node) {
        if (node.type === 'CHANCE_LUCK') base.luck = (base.luck || 10) + (node.value || 10);
        if (node.type === 'PROJECTILE') base.extraProjectiles = (base.extraProjectiles || 0) + (node.value || 1);

        // Standard Stats
        if (node.type === 'CRIT') base.critChance = (base.critChance || 0) + 0.1;
        if (node.type === 'DAMAGE') base.damageMultiplier = (base.damageMultiplier || 1) + 0.2;
        if (node.type === 'SPEED') base.speedMultiplier = (base.speedMultiplier || 1) + 0.1;
        if (node.type === 'COOLDOWN') base.cooldownMultiplier = (base.cooldownMultiplier || 1) - 0.1;

        // Ensure values are numbers
        if (typeof base.extraProjectiles !== 'number') base.extraProjectiles = 0;
    }

    // LEVEL UP: Per-Run Upgrades
    static applyUpgrade(player, type) {
        if (type === 'chance_luck') {
            player.luck = (player.luck || 10) + 10;
            if (typeof saveData !== 'undefined') {
                saveData.global.chance_total_luck = (saveData.global.chance_total_luck || 0) + 10;
            }
            return true;
        }
        if (type === 'big_gamble') {
            player.triggerBigGamble = true;
            return true;
        }
        if (type === 'projectile') {
            player.extraProjectiles = (player.extraProjectiles || 0) + 1;
            return true;
        }

        // Overrides for Standard Types (Chance Hero has stronger/different variants)
        if (type === 'crit') {
            player.critChance = (player.critChance || 0) + 0.10; // +10%
            return true;
        }
        if (type === 'damage') {
            player.damageMultiplier = (player.damageMultiplier || 1) + 0.20; // +20%
            return true;
        }
        if (type === 'speed') {
            player.speedMultiplier = (player.speedMultiplier || 1) + 0.10; // +10%
            return true;
        }
        if (type === 'cooldown') {
            player.cooldownMultiplier = (player.cooldownMultiplier || 1) - 0.10; // -10%
            return true;
        }

        return false;
    }

    static roll(max, luck, min = 1) {

        let val = Math.random();

        // Luck Mechanic: Reroll chance
        if (Math.random() < (luck / 200)) { // 50% chance at 100 luck to 'reroll for better'
            val = Math.max(val, Math.random());
        }

        return min + (val * (max - min));
    }

    static update(player, dx, dy) {
        // Convergence Updates

        // Golden Magnet (cv_ch_m)
        const hasMagnet = ChanceHero.checkConvergence(player, 'cv_ch_m');
        if (hasMagnet) {
            player.pickupRange = (player.radius + 20) * 2; // +100% Range
        } else {
            player.pickupRange = undefined; // Reset if not valid (though convergences are perm per run)
        }

        // Windfall Decay
        if (player.windfallActive) {
            if (player.speedBuffTimer > 0) {
                player.speedBuffTimer--;
                player.speedMultiplier *= 1.5; // Apply boost
                // Wait, if we multiply every frame it explodes. 
                // We should SET it, but speedMultiplier is recalculated often or static?
                // Player.js usually sets speedMultiplier = base * upgrades.
                // We should modify 'runBuffs.speed' or similar?
                // Let's just assume we add it to the movement vector in the Controller or here?
                // player.speedMultiplier is used in update loop: movespeed = stats.speed * speedMultiplier.

                // Hack: Since update is called BEFORE physics move usually?
                // Actually CustomUpdate return value dictates if default move happens.
                // If we return false, default move logic runs.
                // We can just add a temporary modifier to the object that Player.js respects?
                // Player.js doesn't respect custom props easily.
                // Let's just modify dx/dy? No, update passes dx/dy but doesn't return them.

                // Best bet: use the 'buffs' object if it exists and is used.
                // Player.js: this.buffs = { speed: 0... }
                // Let's see if Player.js uses buffs.speed.
                if (!player.buffs) player.buffs = {};
                player.buffs.tempSpeed = 0.5; // +50%
            } else {
                player.windfallActive = false;
                if (player.buffs) player.buffs.tempSpeed = 0;
            }
        }

        // Convergence: Money Tree (cv_ch_p)
        const hasMoneyTree = ChanceHero.checkConvergence(player, 'cv_ch_p');
        if (hasMoneyTree && window.wave > (player.lastInterestWave || 0)) {
            const interest = Math.floor(player.gold * 0.01);
            if (interest > 0) {
                player.gold += interest;
                if (typeof showNotification === 'function') showNotification(`INTEREST: +${interest}G`, "#2ecc71");
            }
            player.lastInterestWave = window.wave;
        }

        // Form Logic: JACKPOT
        if (player.transformActive && player.currentForm === 'JACKPOT') {
            player.luck = 100; // Max Luck
            if (window.frame % 30 === 0 && typeof createExplosion !== 'undefined') {
                createExplosion(player.x, player.y, "#ff00ff", 5); // Sparkle
            }
        }

        // BIG GAMBLE LOGIC
        if (player.triggerBigGamble) {
            player.triggerBigGamble = false;
            player.bigSlotMachine = {
                active: true,
                timer: 180, // 3 Seconds to build tension
                reels: [0, 0, 0],
                outcome: null
            };

            // Freeze Context
            if (window.ctx && window.canvas) {
                ChanceHero.snapshot = window.ctx.getImageData(0, 0, window.canvas.width, window.canvas.height);
                window.isBigGambleActive = true;
            }

            if (typeof audioManager !== 'undefined') {
                // audioManager.play('menu_open');
                audioManager.startLoop('big_gamble');
            }
        }

        // Standard Slot Machine Logic (Mini)
        if (player.slotMachine.active) {
            player.slotMachine.timer--;

            // Spin Animation (Randomize Reels)
            if (player.slotMachine.timer > 0 && player.slotMachine.timer % 5 === 0) {
                player.slotMachine.reels = [
                    Math.floor(Math.random() * 6),
                    Math.floor(Math.random() * 6),
                    Math.floor(Math.random() * 6)
                ];
                // Sound handled by loop
            }

            // Resolve
            if (player.slotMachine.timer <= 0) {
                ChanceHero.resolveSlots(player);
                player.slotMachine.active = false;
                if (typeof audioManager !== 'undefined') audioManager.stopLoop('special_chance');
            }
        }
    }

    static updateBigGamble(player) {
        if (!player.bigSlotMachine || !player.bigSlotMachine.active) return;

        player.bigSlotMachine.timer--;

        // Spin Animation
        if (player.bigSlotMachine.timer > 0 && player.bigSlotMachine.timer % 5 === 0) {
            player.bigSlotMachine.reels = [
                Math.floor(Math.random() * 6),
                Math.floor(Math.random() * 6),
                Math.floor(Math.random() * 6)
            ];
            // Sound handled by loop
        }

        // Resolve
        if (player.bigSlotMachine.timer <= 0) {
            ChanceHero.resolveBigSlots(player);
            player.bigSlotMachine.active = false;
            if (typeof audioManager !== 'undefined') audioManager.stopLoop('big_gamble');

            // Unfreeze
            window.isBigGambleActive = false;
            ChanceHero.snapshot = null;
        }
    }

    static drawBigGamble(ctx) {
        // Draw Snapshot (Frozen Background)
        if (ChanceHero.snapshot) {
            ctx.putImageData(ChanceHero.snapshot, 0, 0);
        }

        // Draw UI Overlay
        ChanceHero.drawUI(ctx);
    }

    static resolveBigSlots(player) {
        // Determine Outcome based on Luck but with high stakes
        // Logic similar to useSpecial but more extreme
        let pBad = 0.30 - (player.luck * 0.002); // Higher chance of bad initially
        let pMeh = 0.40 - (player.luck * 0.002);
        let pGood = 0.15 + (player.luck * 0.002);
        let pDiamond = 0.10 + (player.luck * 0.001);
        let pJackpot = 0.05 + (player.luck * 0.001);

        const roll = Math.random();
        let outcome = 'MEH';

        if (roll < pJackpot) outcome = 'JACKPOT';
        else if (roll < pJackpot + pDiamond) outcome = 'DIAMOND';
        else if (roll < pJackpot + pDiamond + pGood) outcome = 'GOOD';
        else if (roll < pJackpot + pDiamond + pGood + pMeh) outcome = 'MEH';
        else outcome = 'BAD';

        player.bigSlotMachine.outcome = outcome;

        // Visuals
        if (outcome === 'JACKPOT') player.bigSlotMachine.reels = [3, 3, 3]; // 777
        else if (outcome === 'BAD') player.bigSlotMachine.reels = [5, 5, 5]; // Skulls
        else if (outcome === 'GOOD') player.bigSlotMachine.reels = [0, 0, 0]; // Cherries
        else if (outcome === 'MEH') player.bigSlotMachine.reels = [1, 2, 4]; // Random
        else if (outcome === 'DIAMOND') player.bigSlotMachine.reels = [4, 4, 4];

        if (typeof showNotification === 'function')
            showNotification("BIG GAMBLE: " + outcome, outcome === 'BAD' ? "#ff0000" : "#ff00ff");

        if (typeof audioManager !== 'undefined') {
            if (outcome === 'JACKPOT') audioManager.play('big_gamble_jackpot');
            else if (outcome === 'BAD') audioManager.play('big_gamble_lose');
            else if (outcome === 'GOOD' || outcome === 'DIAMOND') audioManager.play('big_gamble_win');
            else audioManager.play('big_gamble_neutral');
        }

        // Effects
        if (outcome === 'JACKPOT') {
            // IMMORTALITY... almost
            player.maxHp += 777;
            player.hp = player.maxHp;
            player.damageMultiplier += 2.0; // Permanent +200%
            if (typeof createExplosion !== 'undefined') createExplosion(player.x, player.y, "#ff00ff", 100);
            // Audio handled above
        }
        else if (outcome === 'BAD') {
            // 1 HP.
            if (player.isCPU) {
                // AI Safety: Don't suicide. Take 25% max HP dmg.
                player.hp = Math.max(1, player.hp - (player.maxHp * 0.25));
            } else {
                player.hp = 1;
                window.showNotification("HP REDUCED TO 1", "#ff0000");
            }
            // Debuff
            player.speedMultiplier *= 0.5;
            setTimeout(() => player.speedMultiplier /= 0.5, 5000); // 5s slow
        }
        else if (outcome === 'GOOD') {
            // Heal Full + Gold
            player.hp = player.maxHp;
            if (typeof goldDrops !== 'undefined') {
                for (let i = 0; i < 50; i++) goldDrops.push(new GoldDrop(player.x, player.y, 50));
            }
        }
        else if (outcome === 'DIAMOND') {
            // 60s Invincibility
            player.invincibleTimer = 3600; // 60s
            window.showNotification("60s INVINCIBILITY", "#00ffff");
        }
        else {
            // MEH - Nothing, just sad sound
            window.showNotification("BETTER LUCK NEXT TIME", "#aaaaaa");
        }
    }

    static resolveSlots(player) {
        // Determine result based on "Simulated" reels or Forced result based on Luck
        // We already set player.slotMachine.outcome in useUltimate, now we apply cues

        const outcome = player.slotMachine.outcome;
        const symbols = ['🍒', '🔔', '➖', '7️⃣', '💎', '💀'];

        // Visual Set
        if (outcome === 'JACKPOT') player.slotMachine.reels = [3, 3, 3]; // 777
        else if (outcome === 'BAD') player.slotMachine.reels = [5, 5, 5]; // Skulls
        else if (outcome === 'GOOD') player.slotMachine.reels = [0, 0, 0]; // Cherries
        else if (outcome === 'MEH') player.slotMachine.reels = [1, 2, 4]; // Random
        else if (outcome === 'DIAMOND') player.slotMachine.reels = [4, 4, 4];

        if (typeof showNotification === 'function')
            showNotification(outcome === 'JACKPOT' ? "JACKPOT!!!" : outcome, "#ff00ff");

        // Audio Logic
        if (typeof audioManager !== 'undefined') {
            if (outcome === 'JACKPOT') audioManager.play('special_chance_jackpot');
            else if (outcome === 'BAD') audioManager.play('special_chance_lose');
            else if (outcome === 'GOOD' || outcome === 'DIAMOND') audioManager.play('special_chance_win');
            else audioManager.play('special_chance_neutral');
        }

        // Effects
        if (outcome === 'JACKPOT') {
            // Screen Wipe Damage
            if (typeof enemies !== 'undefined') enemies.forEach(e => {
                e.hp -= 7777;
                createExplosion(e.x, e.y, "#ff00ff", 20);
            });
            if (typeof saveData !== 'undefined') {
                saveData.global.chance_jackpots = (saveData.global.chance_jackpots || 0) + 1;
            }
            // Sound handled above
        }
        else if (outcome === 'BAD') {
            // Self Damage or Debuff
            if (!player.isCPU) player.takeDamage(10);
            if (typeof enemies !== 'undefined') enemies.forEach(e => {
                // But also damage enemies near
                if (Math.hypot(e.x - player.x, e.y - player.y) < 200) e.hp -= 50;
            });
        }
        else if (outcome === 'GOOD') {
            // Heal
            player.hp = Math.min(player.maxHp, player.hp + 50);
            // Drop Gold
            if (typeof goldDrops !== 'undefined') {
                for (let i = 0; i < 10; i++) goldDrops.push(new GoldDrop(player.x, player.y, 10));
            }
        }
        else if (outcome === 'DIAMOND') {
            // Invincibility + Damage Buff
            player.invincibleTimer = 300; // 5s
            player.damageMultiplier *= 2;
            setTimeout(() => player.damageMultiplier /= 2, 5000);
        }
        else {
            // MEH: Small explosion
            createExplosion(player.x, player.y, "#fff", 50);
            if (typeof enemies !== 'undefined') enemies.forEach(e => {
                if (Math.hypot(e.x - player.x, e.y - player.y) < 100) e.hp -= 100;
            });
        }
    }

    static shootDice(player, dx, dy) {
        if (player.rangeCooldown > 0) return;

        if (typeof audioManager !== 'undefined') audioManager.play('attack_chance');

        // RNG Damage logic
        const minDmg = 1;
        const maxDmg = 500 * (1 + (player.luck / 100));
        let baseDmg = ChanceHero.roll(maxDmg, player.luck, minDmg);

        const hasHotStreak = ChanceHero.checkConvergence(player, 'cv_ch_f');

        // Crit Logic
        let isCrit = false;
        if (Math.random() < player.critChance + (player.luck / 200)) {
            baseDmg *= player.critMultiplier;
            isCrit = true;
            if (hasHotStreak) {
                // Leave fire trail or create explosion
            }
        }

        const radius = Math.max(5, Math.min(15, baseDmg / 20)); // Size based on damage

        if (typeof projectiles !== 'undefined') {
            let count = 1 + (player.extraProjectiles || 0);
            if (player.buffs && player.buffs.multi > 0) count += 1; // Support Spread/Multi Buff

            // Generate faces
            const faces = [];
            for (let k = 0; k < count; k++) faces.push(Math.floor(Math.random() * 6) + 1);

            // Determine mismatch/match logic (if all match and count > 1, big boom)
            const allMatch = count > 1 && faces.every(f => f === faces[0]);

            for (let i = 0; i < count; i++) {
                // Fan Spread for Chance
                // Center is aimAngle
                const spread = 0.2; // Radians
                const angle = player.aimAngle + ((i - (count - 1) / 2) * spread);
                const speed = 22 + Math.random() * 6; // Start fast for "toss" effect

                const isExplosive = allMatch;
                const isPair = !allMatch && count > 1 && faces.filter(f => f === faces[i]).length > 1;

                const projScale = (isExplosive ? 2.0 : (isPair ? 1.5 : 1.0));

                projectiles.push({
                    x: player.x,
                    y: player.y,
                    vx: Math.cos(angle) * speed,
                    vy: Math.sin(angle) * speed,
                    radius: radius * projScale, // Using 'radius' for collision
                    color: isExplosive ? "#ff0000" : (isPair ? "#ff00ff" : "#ffffff"),
                    damage: baseDmg * projScale, // Double damage on pair/explosive
                    dmg: baseDmg * projScale, // Legacy prop
                    life: 60,
                    type: isExplosive ? 'EXPLOSIVE_DICE' : 'DICE',
                    face: faces[i],
                    rotation: 0,
                    spinSpeed: (Math.random() - 0.5) * 0.4, // Randomized spin

                    // Custom collision hook for Game.js
                    onHit: function (enemy) {
                        if (this.type === 'EXPLOSIVE_DICE') {
                            if (typeof createExplosion !== 'undefined') createExplosion(this.x, this.y, '#ff0000', 60);
                            // Area damage
                            if (typeof enemies !== 'undefined') {
                                enemies.forEach(e => {
                                    if (Math.hypot(e.x - this.x, e.y - this.y) < 100) {
                                        e.hp -= this.damage;
                                    }
                                });
                            }
                        }
                        return 'DEFAULT'; // Let standard system apply direct hit damage too
                    },

                    update: function () {
                        // Friction for "sliding/rolling" effect
                        this.vx *= 0.94;
                        this.vy *= 0.94;

                        this.x += this.vx;
                        this.y += this.vy;

                        // Spin based on current speed
                        const currentSpeed = Math.hypot(this.vx, this.vy);
                        this.rotation += currentSpeed * 0.05 + ((this.spinSpeed || 0.1) * 0.5);

                        this.life--;
                        if (this.life <= 0) this.dead = true;
                    },

                    draw: function () {
                        const ctx = window.ctx;
                        if (!ctx) return;

                        ctx.save();
                        ctx.translate(this.x, this.y);
                        ctx.rotate(this.rotation);

                        // Draw like Void Orb (Circle with core) but 'Dice' flavor
                        // Use square shape but with glow
                        const size = this.radius * 2;

                        // Glow
                        ctx.shadowBlur = 10;
                        ctx.shadowColor = this.color;

                        ctx.fillStyle = "#fff";
                        // Draw centered square
                        ctx.fillRect(-this.radius, -this.radius, size, size);

                        ctx.shadowBlur = 0; // Reset for dots

                        // Border
                        ctx.strokeStyle = this.color;
                        ctx.lineWidth = 2;
                        ctx.strokeRect(-this.radius, -this.radius, size, size);

                        // Dots
                        // If color is white (on white body), use black for dots
                        // If color is Red/Magenta, use that color heavily
                        ctx.fillStyle = (this.color === '#ffffff' || this.color === '#fff') ? '#000000' : this.color;

                        // Dots calculation relative to size
                        const dotSize = size / 5;
                        const q = size / 4;

                        // 1: Center
                        if (this.face % 2 === 1) ctx.fillRect(-dotSize / 2, -dotSize / 2, dotSize, dotSize);
                        // 2: TL, BR
                        if (this.face > 1) {
                            ctx.fillRect(-q - dotSize / 2, -q - dotSize / 2, dotSize, dotSize);
                            ctx.fillRect(q - dotSize / 2, q - dotSize / 2, dotSize, dotSize);
                        }
                        // 4: TR, BL
                        if (this.face > 3) {
                            ctx.fillRect(q - dotSize / 2, -q - dotSize / 2, dotSize, dotSize);
                            ctx.fillRect(-q - dotSize / 2, q - dotSize / 2, dotSize, dotSize);
                        }
                        // 6: ML, MR
                        if (this.face === 6) {
                            ctx.fillRect(-q - dotSize / 2, -dotSize / 2, dotSize, dotSize);
                            ctx.fillRect(q - dotSize / 2, -dotSize / 2, dotSize, dotSize);
                        }

                        ctx.restore();
                    }
                });
            }
        }

        player.rangeCooldown = player.stats.rangeCd * player.cooldownMultiplier;
    }

    static useSpecial(player) {
        if (player.slotMachine.active) return;

        player.slotMachine.active = true;
        player.slotMachine.timer = 120; // 2 seconds spin

        if (typeof audioManager !== 'undefined') audioManager.startLoop('special_chance');

        // Determine Outcome Immediately based on Luck
        // Base Weights:
        // BAD (Skull): 20%
        // MEH (Bell/Bar): 50%
        // GOOD (Cherry): 20%
        // DIAMOND: 9%
        // JACKPOT (777): 1%

        // Apply Luck Modifier
        // Luck 0: Standard
        // Luck 100: Bad 0%, Meh 30%, Good 40%, Diamond 20%, Jackpot 10%

        let pBad = 0.20 - (player.luck * 0.002);
        let pMeh = 0.50 - (player.luck * 0.002);
        let pGood = 0.20 + (player.luck * 0.002);
        let pDiamond = 0.09 + (player.luck * 0.001);
        let pJackpot = 0.01 + (player.luck * 0.001);

        // Normalize if needed, but simple cumulative check is easier
        const roll = Math.random();

        let outcome = 'MEH';

        // Cumulative Distribution
        let acc = 0;

        // Check Jackpot first (High roll needed? No, usually low P)
        // Let's do thresholds:
        // 0 -> pBad -> Skulls
        // pBad -> pBad+pMeh -> Meh
        // ...

        // Actually, let's simplify logic:
        if (roll < pJackpot) outcome = 'JACKPOT';            // 1% - 11%
        else if (roll < pJackpot + pDiamond) outcome = 'DIAMOND';
        else if (roll < pJackpot + pDiamond + pGood) outcome = 'GOOD';
        else if (roll < pJackpot + pDiamond + pGood + pMeh) outcome = 'MEH';
        else outcome = 'BAD'; // Remaining

        // Ultimate Form FORCE
        if (player.transformActive && player.currentForm === 'JACKPOT') {
            // Always Good or better
            if (outcome === 'BAD' || outcome === 'MEH') outcome = 'GOOD';
            if (Math.random() < 0.5) outcome = 'JACKPOT';
        }

        player.slotMachine.outcome = outcome;

        // Trigger Cooldown
        player.specialCooldown = player.specialMaxCooldown;
    }

    static drawUI(ctx) {
        if (!window.player || window.player.type !== 'chance') return;
        const player = window.player;

        // Draw Big Gamble Overlay
        if (player.bigSlotMachine && player.bigSlotMachine.active) {
            ctx.save();
            // Note: Context is already in Screen Space from game.js
            // Do NOT reset transform as it might break global scaling

            const cx = window.canvas.width / 2;
            const cy = window.canvas.height / 2;

            // Overlay Dim
            ctx.fillStyle = "rgba(0, 0, 0, 0.7)";
            ctx.fillRect(0, 0, window.canvas.width, window.canvas.height);

            // Machine Body
            ctx.shadowBlur = 40;
            ctx.shadowColor = "#ff00ff";
            ctx.fillStyle = "#222";
            ctx.fillRect(cx - 200, cy - 100, 400, 200);

            ctx.lineWidth = 10;
            ctx.strokeStyle = `hsl(${Math.floor(Date.now() / 10) % 360}, 100%, 50%)`; // Rainbow border
            ctx.strokeRect(cx - 200, cy - 100, 400, 200);

            ctx.shadowBlur = 0;

            // Title
            ctx.fillStyle = "#fff";
            ctx.font = "bold 30px Arial";
            ctx.textAlign = "center";
            ctx.fillText("BIG GAMBLE", cx, cy - 60);

            // Reels
            if (player.bigSlotMachine.reels) {
                const symbols = ['🍒', '🔔', '➖', '7️⃣', '💎', '💀'];
                ctx.font = "80px Arial";
                ctx.fillText(symbols[player.bigSlotMachine.reels[0]], cx - 100, cy + 30);
                ctx.fillText(symbols[player.bigSlotMachine.reels[1]], cx, cy + 30);
                ctx.fillText(symbols[player.bigSlotMachine.reels[2]], cx + 100, cy + 30);
            }

            ctx.restore();
        }

        // Draw Mini Slots Logic UI (Overlay but smaller/contextual)
        if (player.slotMachine && player.slotMachine.active) {
            // Calculate screen position
            const screenX = player.x - (window.arena ? window.arena.camera.x : 0);
            const screenY = player.y - (window.arena ? window.arena.camera.y : 0);

            ctx.save();
            ctx.translate(screenX, screenY - 60);
            // Box
            ctx.fillStyle = "#222";
            ctx.strokeStyle = "#ff00ff";
            ctx.lineWidth = 2;
            ctx.fillRect(-45, -20, 90, 40);
            ctx.strokeRect(-45, -20, 90, 40);

            // Reels
            const symbols = ['🍒', '🔔', '➖', '7️⃣', '💎', '💀'];
            ctx.fillStyle = "#fff";
            ctx.font = "20px Arial";
            ctx.textAlign = "center";
            ctx.fillText(symbols[player.slotMachine.reels[0]], -25, 8);
            ctx.fillText(symbols[player.slotMachine.reels[1]], 0, 8);
            ctx.fillText(symbols[player.slotMachine.reels[2]], 25, 8);

            ctx.restore();
        }
    }
}

if (typeof window.HERO_LOGIC === 'undefined') window.HERO_LOGIC = {};
window.HERO_LOGIC['chance'] = ChanceHero;
window.ChanceHero = ChanceHero;

ChanceHero.upgradePool = [
    { id: 'chance_luck', title: 'Lucky Charm', desc: '+10 Luck. Improves all rolls.', icon: '🍀' },
    { id: 'crit', title: 'High Roller', desc: '+10% Crit Chance.', icon: '🎲' },
    { id: 'damage', title: 'All In', desc: '+20% Max Damage Potential.', icon: '🎰' },
    { id: 'projectile', title: 'Double Down', desc: 'Throw +1 Extra Die.', icon: '🎲' },
    { id: 'speed', title: 'Shuffle', desc: '+10% Movement Speed.', icon: '🃏' },
    { id: 'cooldown', title: 'Quick Spin', desc: '-10% Cooldowns.', icon: '⚡' },
    { id: 'big_gamble', title: 'The Big Gamble', desc: 'Monumental Risk. Monumental Reward.', icon: '🎡' }
];

// Hook Gold Gain (Convergence)
window.HERO_LOGIC['chance'].onGainGold = function (player, amount) {
    // Liquid Assets (cv_ch_w)
    const hasLiquid = ChanceHero.checkConvergence(player, 'cv_ch_w');
    if (hasLiquid) {
        if (Math.random() < 0.1) {
            player.hp = Math.min(player.maxHp, player.hp + 1);
            if (typeof floatingTexts !== 'undefined') floatingTexts.push(new FloatingText(player.x, player.y - 20, "+1 HP", "#2ecc71", 15));
        }
    }

    // Windfall (cv_ch_a)
    const hasWindfall = ChanceHero.checkConvergence(player, 'cv_ch_a');
    if (hasWindfall) {
        // Apply temporary speed buff
        player.speedBuffTimer = 120; // 2s
        // Logic needs to handle this in update, or just modify multiplier directly and reset?
        // Let's modify directly, but we need a way to decay it.
        // Easier: add to 'buffs' object if supported, or just custom logic in update
        player.windfallActive = true;
    }

    // Fool's Gold (cv_ch_e)
    const hasFools = ChanceHero.checkConvergence(player, 'cv_ch_e');
    if (hasFools && Math.random() < 0.2) {
        // Stun nearby
        if (typeof enemies !== 'undefined') {
            enemies.forEach(e => {
                if (Math.hypot(e.x - player.x, e.y - player.y) < 300) {
                    e.stunTimer = 60; // 1s stun
                    if (typeof createExplosion !== 'undefined') createExplosion(e.x, e.y, "#ffff00", 5);
                }
            });
        }
    }

    // Jackpot Strike (cv_ch_l)
    const hasJackpot = ChanceHero.checkConvergence(player, 'cv_ch_l');
    if (hasJackpot) {
        // Zap nearest
        if (typeof enemies !== 'undefined') {
            const target = enemies.find(e => Math.hypot(e.x - player.x, e.y - player.y) < 400);
            if (target) {
                target.hp -= 20 * (player.damageMultiplier || 1);
                if (typeof createExplosion !== 'undefined') createExplosion(target.x, target.y, "#f1c40f", 15);
            }
        }
    }
};
