// Poison Hero (Toxic Green) Logic
// Playstyle: Alchemy & DoT. Collects Flasks to mix spells.
// Unique: "Poison Flasks" inventory (Max 2).
// Weakness: Needs specific flask combos for situational power.

class PoisonHero {
    static init(player) {
        // Base Stats
        player.speedMultiplier = 0.95; // Slower
        player.damageMultiplier = 0.8; // Low initial direct damage

        // Unique Resource: Poison Flasks
        player.poisonFlasks = []; // Array of types: 'RED', 'BLUE', 'GREEN'
        player.maxFlasks = 2;

        player.specialName = "ALCHEMICAL MIX";
        player.specialMaxCooldown = 600; // 10s Standard Cooldown

        // Update UI Icon
        const iconEl = document.getElementById('special-icon');
        if (iconEl) iconEl.innerText = "⚗️";

        player.customUpdate = (dx, dy) => PoisonHero.update(player, dx, dy);
        player.customSpecial = () => PoisonHero.useSpecial(player);
        player.shoot = (dx, dy) => PoisonHero.shootGas(player, dx, dy);

        // Form Name
        player.getFormName = function () { return 'PLAGUEBRINGER'; };

        // Wave Tracking for Reset
        player.lastWave = 0;
    }

    // --- SKILL TREE ---
    static getSkillTreeWeights() {
        return { DOT_DURATION: 0.3, RADIUS: 0.25, POTENCY: 0.25, SPEED: 0.1, HEALTH: 0.1 };
    }

    static getSkillNodeDetails(type, val, desc) {
        if (type === 'DOT_DURATION') return { val: 60, desc: "+1s Poison Duration (Slower Decay)" };
        if (type === 'RADIUS') return { val: 5, desc: "+5 Attack Range" }; // Adjusted to affect standard attack range (life frames)
        if (type === 'POTENCY') return { val: 0.1, desc: "+10% DoT Damage" };
        return { val, desc };
    }

    static applySkillNode(base, node) {
        if (node.type === 'DOT_DURATION') base.stats.dotDuration = (base.stats.dotDuration || 300) + node.value;
        if (node.type === 'RADIUS') base.stats.attackRange = (base.stats.attackRange || 15) + node.value;
    }

    // --- LEVEL UP INTERCEPTION ---
    static modifyUpgradeOption(player, option) {
        if (option.id === 'projectile') {
            // Replace Multishot with Poison Potency Up
            option.title = "VENOM POTENCY";
            option.desc = "Increases Poison DoT Damage by +15%";
            option.icon = "☠️";
        }
        return option;
    }

    // Implement standard interface for Hero Logic upgrade handling
    static applyUpgrade(player, type) {
        if (type === 'projectile') { // ID from LevelUp.js `projectile`
            if (typeof player.stats.dotMultiplier === 'undefined') player.stats.dotMultiplier = 1;
            player.stats.dotMultiplier += 0.15;
            if (typeof showNotification === 'function') showNotification("POISON POTENCY UP!", "#76ff03");
            return true; // Stop default
        }
        return false;
    }

    // --- UTILS ---
    static getFlaskCombination(player) {
        if (!player.poisonFlasks || player.poisonFlasks.length === 0) return 'NONE';

        // Sort to make order irrelevant (e.g., RED+BLUE is same as BLUE+RED)
        const sorted = [...player.poisonFlasks].sort();
        return sorted.join('_');
    }

    static getSpecialDescription(player) {
        const combo = PoisonHero.getFlaskCombination(player);
        const map = {
            'NONE': 'MIASMA UNLEASHED (Decay Field)',
            // Singles
            'RED': 'Vampiric Mist (Life Steal)',
            'BLUE': 'Liquid Nitrogen (Freeze)',
            'GREEN': 'Corrosive Sludge (Defense Down)',
            // Doubles
            'RED_RED': 'BLOOD NOVA (Chain Reaction)',
            'BLUE_BLUE': 'ABSOLUTE ZERO (Time Stop)',
            'GREEN_GREEN': 'TOXIC TSUNAMI (Expanding Wave)',
            'BLUE_RED': 'HALLUCINOGEN (Mass Confusion)',
            'GREEN_RED': 'UNSTABLE COMPOUND (Nuke)',
            'BLUE_GREEN': 'CATALYTIC CONVERTER (Gold Transmute)' // Fun utility? Or maybe "Plague Carrier"
        };
        // Revert BLUE_GREEN to something combat focused if utility is weird. 
        // Let's go with 'VIRAL OUTBREAK (Spread)' for Blue+Green.
        map['BLUE_GREEN'] = 'VIRAL OUTBREAK (Epidemic)';

        return map[combo] || 'Unknown Mix';
    }

    // --- GAME LOOP ---

    static update(player, dx, dy) {
        // 1. Spawning Flasks logic is handled in PoisonBiome

        // Wave Reset logic
        if (typeof window.wave !== 'undefined' && player.lastWave !== window.wave) {
            player.lastWave = window.wave;
            player.poisonFlasks = [];
            // Optional notification
            // if (typeof showNotification === 'function') showNotification("New Wave - Flasks Cleared", "#76ff03");
        }

        // 2. UI Overlay for Flasks
        PoisonHero.drawFlaskUI(player);

        // 3. Transformation handling (Miasma)
        if (player.transformActive) {
            player.transformTimer--;

            // Effect: Decay Field around player
            if (window.frame % 20 === 0 && window.enemies) { // Slowed down tick rate
                const radius = 300;
                window.enemies.forEach(e => {
                    if (e.hp > 0 && Math.hypot(e.x - player.x, e.y - player.y) < radius) {
                        // Fix: Use takeDamage if available, otherwise direct HP
                        if (typeof e.takeDamage === 'function') {
                            e.takeDamage(1); // Low damage
                        } else {
                            e.hp -= 1;
                        }

                        if (!e.poisonStacks) e.poisonStacks = 0;
                        e.poisonStacks = Math.min(e.poisonStacks + 2, 100);
                    }
                });

                // Visuals for field
                if (window.particles && Math.random() < 0.5 && typeof Particle !== 'undefined') {
                    const a = Math.random() * Math.PI * 2;
                    const r = Math.random() * radius;
                    const p = new Particle(player.x + Math.cos(a) * r, player.y + Math.sin(a) * r, 'rgba(50, 50, 50, 0.5)');
                    p.velocity = { x: 0, y: -1 };
                    window.particles.push(p);
                }
            }

            if (player.transformTimer <= 0) {
                player.transformActive = false;
                if (typeof showNotification === 'function') showNotification("Miasma Fades...", "#ccc");
            }
        }

        // --- GLOBAL POISON DOT LOGIC (INJECTED) ---
        // Since core game loop doesn't handle poisonStacks, we do it here.
        if (window.enemies && window.frame % 30 === 0) { // Tick every 0.5s
            let activePoisonTicks = 0;
            window.enemies.forEach(e => {
                if (e.poisonStacks > 0 && e.hp > 0) {
                    activePoisonTicks++;
                    // Calculate DoT Damage
                    // User Request: "percentual per enemy" to avoid instant kill but ensure impact
                    // Logic: 1 stack = 0.1% Max HP damage? 100 stacks = 10%

                    const percentDmg = (e.maxHp * 0.001) * e.poisonStacks;
                    const flatDmg = e.poisonStacks * 0.1; // Small Flat component

                    let totalDmg = Math.max(1, percentDmg + flatDmg);

                    // Apply Hero Stats: Damage Multiplier (General) & DoT Potency (Specific)
                    const potency = (player.stats.dotMultiplier || 1);
                    totalDmg = totalDmg * player.damageMultiplier * potency;

                    // Cap damage to prevent one-shots on bosses from crazy stacks (max 5% current HP per tick)
                    totalDmg = Math.min(totalDmg, e.hp * 0.05 + 10);

                    // Apply Damage
                    if (typeof e.takeDamage === 'function') e.takeDamage(totalDmg);
                    else e.hp -= totalDmg;

                    // Visuals (Always show distinct effect while poisoned)
                    if (typeof createExplosion !== 'undefined') {
                        // Small green puff on every tick to indicate active poison
                        // Use a smaller radius (10) to not look like a huge explosion
                        createExplosion(e.x, e.y, '#76ff03', 10);
                    }

                    if (Math.random() < 0.3 && typeof createDamageNumber === 'function') {
                        createDamageNumber(e.x, e.y - 20, Math.floor(totalDmg), '#76ff03');
                    }
                    if (e.isPoisonedVisual > 0) e.isPoisonedVisual--;

                    // Decay Stacks slowly 
                    // Adjusted by Skill Tree (DOT_DURATION) - reduces decay chance
                    // Default duration: 300 ticks (stats.dotDuration) / 60 = 5s? 
                    // No, wait, decay is per TICK (every 30 frames = 0.5s).
                    // If Duration is high, decay chance is low.
                    // Let's say baseline dotDuration is 300. 
                    // If we have +60 (360), decay should be less frequent.

                    const decayChance = 300 / (player.stats.dotDuration || 300);
                    if (Math.random() < decayChance) {
                        e.poisonStacks = Math.max(0, e.poisonStacks - 1);
                    }
                }
            });
        }

        // 4. Biome Conversion Logic (Poison Meter)
        // Check if we are in Poison Biome
        let isPoisonBiome = false;

        // Check window.currentBiome (internal string)
        if (typeof window.currentBiome === 'string') {
            if (window.currentBiome.toLowerCase().includes('poison') || window.currentBiome.toLowerCase() === 'sickness') isPoisonBiome = true;
        }

        // Also check if currentBiomeType is available (global variable used by game.js)
        if (!isPoisonBiome && typeof currentBiomeType !== 'undefined' && typeof currentBiomeType === 'string') {
            if (currentBiomeType.toLowerCase().includes('poison') || currentBiomeType.toLowerCase() === 'sickness') isPoisonBiome = true;
        }

        // Also check window.currentBiomeType
        if (!isPoisonBiome && typeof window.currentBiomeType === 'string') {
            if (window.currentBiomeType.toLowerCase().includes('poison') || window.currentBiomeType.toLowerCase() === 'sickness') isPoisonBiome = true;
        }

        // Only run Meter logic if NOT in Poison Biome
        if (!isPoisonBiome && window.SYMPHONY_STATE) {
            // Count infected enemies
            let infectedCount = 0;
            if (window.enemies) {
                // Fix: Count any enemy with poison > 0
                infectedCount = window.enemies.filter(e => e.poisonStacks > 0).length;
            }

            // Logic: Increase with every enemy that is infected. 
            // It naturally decreases when enemies die because infectedCount drops.
            // But user asked for specific "increase with every enemy that is infected, but decrease when these enemies actually die".
            // The logic: "Meter = Current Number of Infected Enemies". 
            // Target scaling: Needs X infected enemies at once to trigger.

            // Scaling Target: Base 10 + (Wave * 0.5)
            const targetInfections = 10 + Math.floor(window.wave * 1.5); // Harder each wave

            if (typeof player.poisonMeter === 'undefined') player.poisonMeter = 0;

            // Make meter smooth move towards target
            const targetVal = infectedCount;
            // Easing
            // player.poisonMeter += (targetVal - player.poisonMeter) * 0.1; 
            // Actually, let's just use raw count for clarity? 
            // "The toxicity meter should increase with every enemy that is infected, but decrease when these enemies acrually die."
            // This implies the meter IS the count of infected enemies.

            player.poisonMeter = infectedCount;

            // Only draw if we have > 0
            if (typeof window.ctx !== 'undefined') {
                const ctx = window.ctx;
                ctx.save();
                ctx.setTransform(1, 0, 0, 1, 0, 0);

                const mx = window.innerWidth / 2 - 100;
                const my = 80; // Below standard HUD
                const mw = 200;
                const mh = 15;

                // Bg
                ctx.fillStyle = 'rgba(0,0,0,0.5)';
                ctx.fillRect(mx, my, mw, mh);
                ctx.strokeStyle = '#fff';
                ctx.strokeRect(mx, my, mw, mh);

                // Fill
                const pct = Math.min(1, player.poisonMeter / targetInfections);
                ctx.fillStyle = '#76ff03';
                ctx.fillRect(mx, my, mw * pct, mh);

                // Text
                ctx.fillStyle = '#fff';
                ctx.font = '10px Arial';
                ctx.textAlign = 'center';
                ctx.fillText(`TOXICITY: ${player.poisonMeter}/${targetInfections}`, mx + mw / 2, my + 11);

                ctx.restore();

                // Trigger Conversion logic needs to check pct
                if (player.poisonMeter >= targetInfections && window.SYMPHONY_STATE.triggerBiomeAssimilation) {
                    window.SYMPHONY_STATE.triggerBiomeAssimilation('poison');
                    player.poisonMeter = 0;
                }
            }
        }
    }

    static useSpecial(player) {
        const combo = PoisonHero.getFlaskCombination(player);
        console.log(`Using Special: ${combo}`);

        const cx = player.x;
        const cy = player.y;

        // Logic for Combinations
        switch (combo) {
            case 'NONE':
                // Mega Decay Field (Original Special preserved)
                if (typeof showNotification === 'function') showNotification("MIASMA UNLEASHED", "#76ff03");

                // Spawn Persistent Miasma
                if (typeof window.projectiles !== 'undefined') {
                    // Update: Smaller radius (150 vs 300) and visible effect on enemies
                    const miasmaRadius = 150;
                    // Create a proper Projectile instance to integrate better with game loop logic
                    // But prevent movement by setting velocity to 0 and overriding update
                    const p = new Projectile(
                        player.x,
                        player.y,
                        { x: 0, y: 0 },
                        1, // Base damage
                        "rgba(50, 50, 50, 0.5)",
                        miasmaRadius,
                        "MIASMA",
                        0,
                        false
                    );

                    p.life = 600; // 10s
                    p.pierce = 9999;
                    p.onHit = () => 'STOP'; // Prevent instakill

                    // Override update to stick to player
                    const originalUpdate = p.update.bind(p);
                    p.update = function () {
                        // We do NOT call originalUpdate because it moves x/y based on velocity
                        // And handles life decrease. We want to control everything.

                        if (typeof this.lastPlayerHp === 'undefined') this.lastPlayerHp = player.hp;

                        // Ensure it sticks to player and doesn't get cleaned up based on distance
                        if (!player || player.hp <= 0) {
                            this.life = 0;
                            this.dead = true;
                            return;
                        }

                        // Break if player took damage
                        if (player.hp < this.lastPlayerHp) {
                            this.life = 0;
                            this.dead = true;
                            if (typeof showNotification === 'function') showNotification("Miasma Dispersed (Hit)", "#ccc");
                            return;
                        }
                        this.lastPlayerHp = player.hp;

                        // FOLLOW PLAYER
                        this.x = player.x;
                        this.y = player.y;

                        // Decrement life manually since we skipped originalUpdate
                        this.life--;
                        if (this.life <= 0) this.dead = true;

                        // Custom Draw is needed? 
                        // Actually, standard projectile draw might work if we set radius, color. 
                        // But we want the pulsing effect.

                        // AoE Logic
                        if (window.enemies) {
                            window.enemies.forEach(e => {
                                // Simple distance check
                                const dist = Math.hypot(e.x - this.x, e.y - this.y);
                                if (e.hp > 0 && dist < this.radius) {
                                    if (window.frame % 10 === 0) {
                                        // Direct damage (tick)
                                        if (typeof e.takeDamage === 'function') {
                                            e.takeDamage(0.5);
                                        } else {
                                            e.hp -= 0.5;
                                        }

                                        // Apply Poison Stacks
                                        if (typeof e.poisonStacks === 'undefined') e.poisonStacks = 0;
                                        e.poisonStacks = Math.min(e.poisonStacks + 5, 100);

                                        // Visual Feedback on Enemy
                                        if (typeof createExplosion === 'function' && Math.random() < 0.3) {
                                            createExplosion(e.x, e.y, '#76ff03');
                                        }
                                    }
                                    e.isPoisonedVisual = 30;
                                }
                            });
                        }
                    };

                    // Override Draw for visual flair
                    p.draw = function () {
                        if (!window.ctx) return;
                        const ctx = window.ctx;
                        ctx.save();
                        ctx.translate(this.x, this.y);

                        ctx.fillStyle = this.color;
                        ctx.beginPath();
                        ctx.arc(0, 0, this.radius, 0, Math.PI * 2);
                        ctx.fill();

                        const pulse = 1 + Math.sin(Date.now() / 200) * 0.1;
                        ctx.strokeStyle = "#76ff03";
                        ctx.lineWidth = 2;
                        ctx.beginPath();
                        ctx.arc(0, 0, this.radius * pulse, 0, Math.PI * 2);
                        ctx.stroke();
                        ctx.restore();
                    };

                    window.projectiles.push(p);
                }
                break;

            // Single Vials (Weak versions but distinct utility)
            case 'RED':
                // Vampiric Mist: Small AoE, heals player slightly on hit
                PoisonHero.createVampiricCloud(player, cx, cy, 120);
                break;
            case 'BLUE':
                // Liquid Nitrogen: Instantly stops enemies for short duration
                PoisonHero.createFreezeZone(cx, cy, 120, 60); // 1s freeze
                break;
            case 'GREEN':
                // Corrosive Sludge: Permamently reduces enemy defense
                PoisonHero.createAcidPool(cx, cy, 120, 0.5); // 50% Def reduction 
                break;

            // DOUBLES (Full Power)

            case 'RED_RED':
                // BLOOD NOVA: Chain Reaction
                // Creates an explosion that triggers smaller explosions on enemies hit
                PoisonHero.createChainReaction(cx, cy, 300, 20);
                break;

            case 'BLUE_BLUE':
                // ABSOLUTE ZERO: Time Stop (Massive Freeze)
                // Freezes everything in large radius for 4 seconds
                PoisonHero.createFreezeZone(cx, cy, 400, 240);
                break;

            case 'GREEN_GREEN':
                // TOXIC TSUNAMI: Expanding Wave
                // Spawns a ring of projectiles expanding outwards rapidly
                PoisonHero.createExpandingWave(player, cx, cy, 24, 10);
                break;

            case 'BLUE_RED':
                // HALLUCINOGEN: Mass Confusion
                // Large cloud that makes enemies attack each other + DoT
                PoisonHero.createGasCloud(cx, cy, 300, 2, 400, '#9b59b6', 'CONFUSE');
                break;

            case 'GREEN_RED':
                // UNSTABLE COMPOUND: Nuke
                // Spawns a flask entity that waits 2s then detonates MASSIVELY
                PoisonHero.createTimeBomb(cx, cy, 400, 100);
                break;

            case 'BLUE_GREEN':
                // VIRAL OUTBREAK: Epidemic
                // Infects enemies with a special debuff that spreads poison stacks to neighbors on death
                PoisonHero.createViralZone(cx, cy, 300);
                break;
        }

        // NO LONGER Reset Flasks - User Request
        // player.poisonFlasks = [];

        // Trigger Cooldown
        player.specialCooldown = player.specialMaxCooldown;
    }

    // --- ABILITIES & EFFECTS ---

    static createVampiricCloud(player, x, y, r) {
        if (!window.projectiles) return;
        const p = new Projectile(x, y, { x: 0, y: 0 }, 1, 'rgba(231, 76, 60, 0.4)', r, 'VAMPIRIC', 0, false);
        p.life = 120; // 2s
        p.onHit = () => 'STOP';

        const origUpdate = p.update.bind(p);
        p.update = function () {
            if (origUpdate) origUpdate();
            if (window.frame % 15 === 0 && window.enemies) {
                let hitCount = 0;
                window.enemies.forEach(e => {
                    if (Math.hypot(e.x - this.x, e.y - this.y) < this.radius) {
                        e.hp -= 2; // Fixed low damage
                        hitCount++;
                        if (Math.random() < 0.2) createExplosion(e.x, e.y, '#e74c3c', 10);
                    }
                });
                // Heal player per enemy hit (capped)
                if (hitCount > 0 && player.hp < player.maxHp) {
                    const heal = Math.min(2, hitCount * 0.1);
                    player.hp += heal;
                    if (Math.random() < 0.5) createDamageNumber(player.x, player.y - 30, "+" + heal.toFixed(1), '#e74c3c');
                }
            }
        };
        window.projectiles.push(p);
    }

    static createFreezeZone(x, y, r, duration) {
        const freezeID = 'FROZEN_' + Date.now();
        // Visual Only Projectile for Zone
        if (typeof window.createExplosion === 'function') createExplosion(x, y, '#3498db', r);

        // Logic handled immediately on enemies
        if (window.enemies) {
            window.enemies.forEach(e => {
                const d = Math.hypot(e.x - x, e.y - y);
                if (d < r) {
                    // Apply deep freeze
                    e.frozen = duration;
                    // Add ice block visual if possible
                    if (!e.debuffs) e.debuffs = {};
                    e.debuffs.frozen = true;
                    // Visual pop
                    createDamageNumber(e.x, e.y - 10, "❄️", '#3498db');
                }
            });
        }
    }

    static createChainReaction(x, y, r, baseDmg) {
        if (typeof createExplosion === 'function') createExplosion(x, y, '#e74c3c', r);

        // Initial hit
        if (window.enemies) {
            const hitEnemies = [];
            window.enemies.forEach(e => {
                if (Math.hypot(e.x - x, e.y - y) < r) {
                    hitEnemies.push(e);
                }
            });

            hitEnemies.forEach((e, idx) => {
                setTimeout(() => {
                    if (e && e.hp > 0) {
                        e.hp -= baseDmg;
                        createExplosion(e.x, e.y, '#c0392b', 40); // Mini explosion
                        // Chain to neighbors?
                        // Simple visual flair: just delayed bursts
                    }
                }, idx * 50); // Staggered explosions
            });
        }
    }

    static createExpandingWave(player, x, y, count, speed) {
        // Shoots ring of projectiles outward
        if (!window.projectiles) return;
        const dmg = 8 * player.damageMultiplier;

        for (let i = 0; i < count; i++) {
            const angle = (i / count) * Math.PI * 2;
            const vx = Math.cos(angle) * speed;
            const vy = Math.sin(angle) * speed;

            const p = new Projectile(x, y, { x: vx, y: vy }, dmg, '#76ff03', 8, 'WAVE', 0, false);
            p.life = 60; // 1s travel time
            p.pierce = 5;
            window.projectiles.push(p);
        }
    }

    static createTimeBomb(x, y, r, dmg) {
        // Visual Marker
        // We can use a "Projectile" that doesn't move and explodes on death
        const p = new Projectile(x, y, { x: 0, y: 0 }, 0, '#e67e22', 15, 'BOMB', 0, false);
        p.life = 120; // 2s fuse

        // Override update entirely
        const origUpdate = p.update.bind(p);
        p.update = function () {
            if (this.life > 0) this.life--;

            // Pulse visual
            const pulsation = Math.abs(Math.sin(Date.now() / 100));
            this.radius = 15 + (pulsation * 10);

            if (window.frame % 30 === 0 && typeof createExplosion === 'function') createExplosion(this.x, this.y, '#fff', 10); // Beep

            if (this.life <= 1) {
                // DETONATE
                if (typeof createExplosion === 'function') createExplosion(this.x, this.y, '#c0392b', r); // Big red boom
                if (window.enemies) {
                    window.enemies.forEach(e => {
                        if (Math.hypot(e.x - this.x, e.y - this.y) < r) {
                            if (typeof e.takeDamage === 'function') e.takeDamage(dmg);
                            else e.hp -= dmg;
                            if (typeof createDamageNumber === 'function') createDamageNumber(e.x, e.y, "BOOM", '#fff');
                        }
                    });
                }
                if (typeof audioManager !== 'undefined') audioManager.play('explosion');
                this.dead = true;
            }
        };
        window.projectiles.push(p);
    }

    static createViralZone(x, y, r) {
        if (!window.projectiles) return;
        const p = new Projectile(x, y, { x: 0, y: 0 }, 0, 'rgba(46, 204, 113, 0.3)', r, 'VIRAL', 0, false);
        p.life = 300; // 5s
        p.onHit = () => 'STOP';

        const origUpdate = p.update.bind(p);
        p.update = function () {
            if (origUpdate) origUpdate();
            if (window.frame % 30 === 0 && window.enemies) {
                window.enemies.forEach(e => {
                    if (Math.hypot(e.x - this.x, e.y - this.y) < this.radius) {
                        // Mark as Carrier logic
                        // Monkeypatch apply: just give lots of poison
                        if (!e.poisonStacks) e.poisonStacks = 0;
                        e.poisonStacks += 10;

                        // Visual
                        if (Math.random() < 0.2 && typeof createDamageNumber === 'function')
                            createDamageNumber(e.x, e.y - 20, "INFECTED", '#2ecc71');
                    }
                });
            }
        };
        window.projectiles.push(p);
    }

    // Existing helper refactored to match new signature or kept for legacy if used elsewhere
    static createAcidPool(x, y, r, shred = 0.5) {
        if (!window.projectiles) return;
        // Fix: Pass object for velocity
        const p = new Projectile(x, y, { x: 0, y: 0 }, 2, '#76ff03', r, 'poison', 0, false);
        p.life = 300;
        p.pierce = 9999;
        p.onHit = () => 'STOP'; // Prevent default game.js insta-kill collision

        const originalUpdate = p.update.bind(p);
        p.update = function () {
            if (originalUpdate) originalUpdate();
            if (window.enemies && window.frame % 20 === 0) {
                window.enemies.forEach(e => {
                    if (e.hp > 0 && Math.hypot(e.x - this.x, e.y - this.y) < this.radius) {
                        e.defenseMultiplier = shred; // Apply shred
                        if (typeof e.takeDamage === 'function') e.takeDamage(1);
                        else e.hp -= 1;
                    }
                });
            }
        };
        window.projectiles.push(p);
    }

    static createGasCloud(x, y, r, dmg, dur, color, effect) {
        if (!window.projectiles) return;
        // Fix: Pass correct object for velocity
        const p = new Projectile(x, y, { x: 0, y: 0 }, dmg, color, r, 'poison', 0, false);
        p.life = dur;
        p.pierce = 9999; // Ensure it pierces
        p.onHit = () => 'STOP'; // Prevent default game.js insta-kill collision

        // Custom update logic for static cloud
        const originalUpdate = p.update.bind(p);
        p.update = function () {
            if (originalUpdate) originalUpdate();
            // Custom OnHit Logic because main loop might not trigger onHit for static 0-velocity projectiles properly
            if (window.enemies) {
                window.enemies.forEach(e => {
                    if (e.hp > 0 && Math.hypot(e.x - this.x, e.y - this.y) < this.radius) {
                        if (window.frame % 30 === 0) {
                            if (typeof e.takeDamage === 'function') e.takeDamage(this.damage);
                            else e.hp -= this.damage;

                            if (effect === 'CONFUSE') e.confused = 120;
                        }
                    }
                });
            }
        };
        window.projectiles.push(p);
    }

    static createExplosion(x, y, r, dmg, color) {
        // Visual
        if (typeof window.createExplosion === 'function') {
            window.createExplosion(x, y, color);
        } else if (window.particles && typeof Particle !== 'undefined') {
            for (let i = 0; i < 20; i++) {
                const p = new Particle(x, y, color);
                window.particles.push(p);
            }
        }

        // Dmg
        if (window.enemies) {
            window.enemies.forEach(e => {
                if (Math.hypot(e.x - x, e.y - y) < r) {
                    if (typeof e.takeDamage === 'function') e.takeDamage(dmg);
                    else e.hp -= dmg;

                    // Pushback
                    e.x += (e.x - x) * 0.1;
                    e.y += (e.y - y) * 0.1;

                    if (typeof createDamageNumber === 'function') createDamageNumber(e.x, e.y, dmg, color);
                }
            });
        }
    }

    static createSlowZone(x, y, r, slowFactor) {
        if (!window.projectiles) return;
        // Fix: Pass object for velocity
        const p = new Projectile(x, y, { x: 0, y: 0 }, 1, '#3498db', r, 'poison', 0, false);
        p.life = 300; // 5s
        p.pierce = 9999;
        p.onHit = () => 'STOP'; // Prevent default game.js insta-kill collision

        const originalUpdate = p.update.bind(p);
        p.update = function () {
            if (originalUpdate) originalUpdate();
            if (window.enemies) {
                window.enemies.forEach(e => {
                    if (e.hp > 0 && Math.hypot(e.x - this.x, e.y - this.y) < this.radius) {
                        e.isSlowed = true; // Use a flag usually or direct speed mod
                        e.speedMultiplier = slowFactor;
                        // Reset speed later? Usually enemies reset speed in their update or we need to re-apply constant
                    }
                });
            }
        };
        window.projectiles.push(p);
    }

    static createAcidPool(x, y, r) {
        if (!window.projectiles) return;
        // Fix: Pass object for velocity
        const p = new Projectile(x, y, { x: 0, y: 0 }, 2, '#76ff03', r, 'poison', 0, false);
        p.life = 300;
        p.pierce = 9999;
        p.onHit = () => 'STOP'; // Prevent default game.js insta-kill collision

        const originalUpdate = p.update.bind(p);
        p.update = function () {
            if (originalUpdate) originalUpdate();
            if (window.enemies && window.frame % 20 === 0) {
                window.enemies.forEach(e => {
                    if (e.hp > 0 && Math.hypot(e.x - this.x, e.y - this.y) < this.radius) {
                        e.defenseMultiplier = 0.5;
                        if (typeof e.takeDamage === 'function') e.takeDamage(2);
                        else e.hp -= 2;
                    }
                });
            }
        };
        window.projectiles.push(p);
    }


    static shootGas(player, dx, dy) {
        if (player.rangeCooldown > 0) return;

        // Visual: Short-Range Toxic Nova (8-way)
        // Relative to aimAngle, very short range.

        const dmg = (player.stats.rangeDmg || 5) * player.damageMultiplier;
        const count = 8; // Increased to 8
        const startAngle = (player.aimAngle || 0);

        if (typeof window.projectiles !== 'undefined') {
            for (let i = 0; i < count; i++) {
                // Distribute 8 projectiles around the circle start from aim angle
                const angle = startAngle + (i * (Math.PI * 2 / count));

                const speed = 4; // Moderate speed
                const vx = Math.cos(angle) * speed;
                const vy = Math.sin(angle) * speed;

                const p = new Projectile(
                    player.x,
                    player.y,
                    { x: vx, y: vy },
                    dmg,
                    "#76ff03",
                    6,
                    "poison_spit",
                    0,
                    false
                );

                // Very short range: Life 15 frames @ 60fps = 0.25s
                // Adjusted by Skill Tree (RADIUS node)
                p.life = (player.stats.attackRange || 15);
                p.hitEnemies = [];

                window.projectiles.push(p);
            }
        }

        if (typeof audioManager !== 'undefined') audioManager.play('attack_plant'); // Squishy sound

        player.rangeCooldown = player.stats.rangeCd * player.cooldownMultiplier;
    }


    // --- UI ---
    static drawFlaskUI(player) {
        if (typeof window.ctx === 'undefined') return;
        const ctx = window.ctx;

        // Draw Flasks at bottom of screen (Fixed Position)
        // Reset transform to ensure UI is static
        ctx.save();
        ctx.setTransform(1, 0, 0, 1, 0, 0); // Identity matrix

        const flasks = player.poisonFlasks || [];
        const max = 2;

        // Position: Bottom Left, moved up significantly to avoid intersection
        // Original: y = window.innerHeight - 140
        // New: y = window.innerHeight - 300
        const x = 120;
        const y = window.innerHeight - 300;

        // Label
        ctx.fillStyle = '#fff';
        ctx.font = '14px Arial';
        ctx.textAlign = 'left';
        ctx.shadowColor = '#000';
        ctx.shadowBlur = 4;
        ctx.fillText("⚗️ MIX: " + PoisonHero.getSpecialDescription(player), x - 40, y - 30);
        ctx.shadowBlur = 0;

        // Slots
        for (let i = 0; i < max; i++) {
            const fx = x + (i * 60);

            // Slot Bg
            ctx.fillStyle = 'rgba(0,0,0,0.5)';
            ctx.strokeStyle = '#fff';
            ctx.lineWidth = 2;
            ctx.beginPath();
            ctx.arc(fx, y, 20, 0, Math.PI * 2);
            ctx.fill();
            ctx.stroke();

            // Flask Content
            if (i < flasks.length) {
                const type = flasks[i];
                let color = '#fff';
                let symbol = '?';
                if (type === 'RED') { color = '#e74c3c'; symbol = '🩸'; }
                else if (type === 'BLUE') { color = '#3498db'; symbol = '❄️'; }
                else if (type === 'GREEN') { color = '#76ff03'; symbol = '🧪'; }

                ctx.fillStyle = color;
                ctx.beginPath();
                ctx.arc(fx, y, 15, 0, Math.PI * 2);
                ctx.fill();

                ctx.fillStyle = '#000';
                ctx.font = '16px apple color emoji, Arial'; // Emoji font
                ctx.textAlign = 'center';
                ctx.textBaseline = 'middle';
                ctx.fillText(symbol, fx, y);
            }
        }
        ctx.restore();
    }
}

// Register Hero Logic
if (typeof window.HERO_LOGIC === 'undefined') window.HERO_LOGIC = {};
window.HERO_LOGIC['poison'] = PoisonHero;
window.PoisonHero = PoisonHero;
