// Chance (Magenta) Hero Logic
// Playstyle: High Risk, RNG, Luck Manipulation
// Damage is random, abilities are random.

class ChanceHero {
    static init(player) {
        // Base Stats (Volatile)
        player.hp = 77; // Lucky number
        player.maxHp = 77;
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
        player.customSpecial = () => ChanceHero.useUltimate(player);
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
        ChanceHero.injectSkillTree();
    }

    static injectSkillTree() {
        const upgradePool = [
            { id: 'luck', title: 'Lucky Charm', desc: '+10 Luck. Improves all rolls.', icon: '🍀' },
            { id: 'crit', title: 'High Roller', desc: '+10% Crit Chance.', icon: '🎲' },
            { id: 'damage', title: 'All In', desc: '+20% Max Damage Potential.', icon: '🎰' },
            { id: 'speed', title: 'Shuffle', desc: '+10% Movement Speed.', icon: '🃏' },
            { id: 'cooldown', title: 'Quick Spin', desc: '-10% Cooldowns.', icon: '⚡' }
        ];

        window.HERO_LOGIC['chance'].upgradePool = upgradePool;

        window.HERO_LOGIC['chance'].getSkillNodeDetails = (type, val, desc) => {
            if (type === 'LUCK') return { val: 10, desc: "+10 Luck" };
            return { val, desc };
        };

        window.HERO_LOGIC['chance'].applySkillNode = (base, node) => {
            if (node.type === 'LUCK') base.luck = (base.luck || 10) + node.value;
            // Standard stats handled generic player logic usually, or here if strict override needed
        };
    }

    static roll(max, luck, min = 1) {
        // RNG Logic skewed by Luck
        // Luck 0: Pure Random
        // Luck 100: Roll twice, take higher, + bias

        let val = Math.random();

        // Luck Mechanic: Reroll chance
        if (Math.random() < (luck / 200)) { // 50% chance at 100 luck to 'reroll for better'
            val = Math.max(val, Math.random());
        }

        return min + (val * (max - min));
    }

    static update(player, dx, dy) {
        // Form Logic: JACKPOT
        if (player.transformActive && player.currentForm === 'JACKPOT') {
            player.luck = 100; // Max Luck
            if (window.frame % 30 === 0 && typeof createExplosion !== 'undefined') {
                createExplosion(player.x, player.y, "#ff00ff", 5); // Sparkle
            }
        }

        // Slot Machine Logic
        if (player.slotMachine.active) {
            player.slotMachine.timer--;

            // Spin Animation (Randomize Reels)
            if (player.slotMachine.timer > 0 && player.slotMachine.timer % 5 === 0) {
                player.slotMachine.reels = [
                    Math.floor(Math.random() * 6),
                    Math.floor(Math.random() * 6),
                    Math.floor(Math.random() * 6)
                ];
                if (typeof audioManager !== 'undefined') audioManager.play('menu_click'); // Tick sound
            }

            // Resolve
            if (player.slotMachine.timer <= 0) {
                ChanceHero.resolveSlots(player);
                player.slotMachine.active = false;
            }

            // Draw Slots UI (Hack: Draw directly to canvas here)
            const ctx = window.ctx;
            if (ctx) {
                ctx.save();
                ctx.translate(player.x, player.y - 60);
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

        // Effects
        if (outcome === 'JACKPOT') {
            // Screen Wipe Damage
            if (typeof enemies !== 'undefined') enemies.forEach(e => {
                e.hp -= 7777;
                createExplosion(e.x, e.y, "#ff00ff", 20);
            });
            if (typeof audioManager !== 'undefined') audioManager.play('level_up'); // Big sound
        }
        else if (outcome === 'BAD') {
            // Self Damage or Debuff
            player.takeDamage(10);
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

        if (typeof audioManager !== 'undefined') audioManager.play('shoot_weak');

        // RNG Damage logic
        const minDmg = 1;
        const maxDmg = 500 * (1 + (player.luck / 100));
        let baseDmg = ChanceHero.roll(maxDmg, player.luck, minDmg);

        // Crit Logic
        let isCrit = false;
        if (Math.random() < player.critChance + (player.luck / 200)) {
            baseDmg *= player.critMultiplier;
            isCrit = true;
        }

        const radius = Math.max(5, Math.min(15, baseDmg / 20)); // Size based on damage

        if (typeof projectiles !== 'undefined') {
            const count = 1 + (player.extraProjectiles || 0);

            // Check for Match (Explosive Pair)
            const faces = [];
            // Generate faces first
            for (let k = 0; k < count; k++) faces.push(Math.floor(Math.random() * 6) + 1);

            // Determine mismatch/match logic (if all match, big boom)
            const allMatch = count > 1 && faces.every(f => f === faces[0]);

            for (let i = 0; i < count; i++) {
                const spread = (i - (count - 1) / 2) * 0.2;
                const angle = player.aimAngle + spread;
                const speed = 12 + Math.random() * 2; // Faster than typical, but not insane

                const isExplosive = allMatch;

                projectiles.push({
                    x: player.x,
                    y: player.y,
                    vx: Math.cos(angle) * speed,
                    vy: Math.sin(angle) * speed,
                    radius: radius, // Using 'radius' for collision
                    color: isExplosive ? "#ff0000" : (i === 0 && isCrit ? "#ff00ff" : "#ffffff"),
                    damage: baseDmg * (isExplosive ? 2 : 1), // Double damage on pair
                    dmg: baseDmg, // Legacy prop
                    life: 60,
                    type: isExplosive ? 'EXPLOSIVE_DICE' : 'DICE',
                    face: faces[i],
                    rotation: 0,
                    spinSpeed: 0.2, // Fixed spin visual

                    // Custom collision hook for Game.js
                    onHit: function (enemy) {
                        if (this.type === 'EXPLOSIVE_DICE') {
                            if (typeof createExplosion !== 'undefined') createExplosion(this.x, this.y, '#ff00ff', 60);
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
                        this.x += this.vx;
                        this.y += this.vy;
                        this.rotation += this.spinSpeed;
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
                        ctx.fillRect(-this.radius, -this.radius, size, size);

                        ctx.shadowBlur = 0; // Reset for dots

                        // Border
                        ctx.strokeStyle = this.color;
                        ctx.lineWidth = 2;
                        ctx.strokeRect(-this.radius, -this.radius, size, size);

                        // Dots
                        ctx.fillStyle = this.color;
                        const dotSize = size / 5;
                        const q = size / 4;

                        // 1: Center
                        if (this.face % 2 === 1) ctx.fillRect(-dotSize / 2, -dotSize / 2, dotSize, dotSize);
                        if (this.face > 1) {
                            ctx.fillRect(-q - dotSize / 2, -q - dotSize / 2, dotSize, dotSize); // TL
                            ctx.fillRect(q - dotSize / 2, q - dotSize / 2, dotSize, dotSize);   // BR
                        }
                        if (this.face > 3) {
                            ctx.fillRect(q - dotSize / 2, -q - dotSize / 2, dotSize, dotSize);  // TR
                            ctx.fillRect(-q - dotSize / 2, q - dotSize / 2, dotSize, dotSize);  // BL
                        }
                        if (this.face === 6) {
                            ctx.fillRect(-q - dotSize / 2, -dotSize / 2, dotSize, dotSize);     // ML
                            ctx.fillRect(q - dotSize / 2, -dotSize / 2, dotSize, dotSize);      // MR
                        }

                        ctx.restore();
                    }
                });
            }
        }

        player.rangeCooldown = player.stats.rangeCd * player.cooldownMultiplier;
    }

    static useUltimate(player) {
        if (player.slotMachine.active) return;

        player.slotMachine.active = true;
        player.slotMachine.timer = 120; // 2 seconds spin

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
}

if (typeof window.HERO_LOGIC === 'undefined') window.HERO_LOGIC = {};
window.HERO_LOGIC['chance'] = ChanceHero;
