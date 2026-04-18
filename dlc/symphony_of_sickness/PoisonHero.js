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
        if (!player.isCPU) {
            const iconEl = document.getElementById('special-icon');
            if (iconEl) iconEl.innerText = "⚗️";
        }

        player.customUpdate = (dx, dy) => PoisonHero.update(player, dx, dy);
        player.customSpecial = () => PoisonHero.useSpecial(player);
        player.shoot = (dx, dy) => PoisonHero.shootGas(player, dx, dy);

        // Altar checks
        const active = (saveData.altar && saveData.altar.active) ? saveData.altar.active : [];
        const has = (id) => active.includes(id);

        // po1: Alchemical Mix Cooldown -10%
        if (has('po1')) player.specialMaxCooldown = Math.floor(player.specialMaxCooldown * 0.9);

        // po2: Virulence +20% — boost dotMultiplier at init
        if (has('po2')) {
            player.stats.dotMultiplier = (player.stats.dotMultiplier || 1) * 1.2;
        }

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
        if (node.type === 'DOT_DURATION') base.dotDuration = (base.dotDuration || 300) + node.value;
        if (node.type === 'RADIUS') base.attackRange = (base.attackRange || 15) + node.value;
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
            'NONE':      'MIASMA UNLEASHED (Decay Aura)',
            'RED':       'SANGUINE LEECH (Blood Vortex)',
            'BLUE':      'CRYOGENIC BURST (Ice Shockwave)',
            'GREEN':     'ACID RAIN (Corrosive Downpour)',
            'RED_RED':   'HEMORRHAGE CHAIN (Blood Nova)',
            'BLUE_BLUE': 'ABSOLUTE ZERO (Triple Ice Wave)',
            'GREEN_GREEN':'TOXIC TSUNAMI (Rolling Wave)',
            'BLUE_RED':  'HALLUCINOGEN (Psychedelic Cloud)',
            'GREEN_RED': 'UNSTABLE COMPOUND (Vortex Nuke)',
            'BLUE_GREEN':'VIRAL MUTATION (Carrier Plague)',
        };
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
            // Altar checks (read once per tick for performance)
            const dotActive = (saveData.altar && saveData.altar.active) ? saveData.altar.active : [];
            const dotHas = (id) => dotActive.includes(id);
            const hasFrozenPlague  = dotHas('cv_po_i');
            const hasBurningToxin  = dotHas('cv_po_f');
            const hasPlagueBoom    = dotHas('cv_po_p');
            const hasCorrosive     = dotHas('cv_po_m');
            const hasVirulent      = dotHas('po3');

            let activePoisonTicks = 0;
            window.enemies.forEach(e => {
                if (e.poisonStacks > 0 && e.hp > 0) {
                    activePoisonTicks++;

                    const percentDmg = (e.maxHp * 0.001) * e.poisonStacks;
                    const flatDmg = e.poisonStacks * 0.1;

                    let totalDmg = Math.max(1, percentDmg + flatDmg);

                    // Apply Hero Stats: Damage Multiplier (General) & DoT Potency (Specific)
                    const potency = (player.stats.dotMultiplier || 1);
                    totalDmg = totalDmg * player.damageMultiplier * potency;

                    // cv_po_i: Frozen Plague — double DoT on frozen enemies
                    if (hasFrozenPlague && (e.frozen > 0 || e.frozenTimer > 0)) totalDmg *= 2;

                    // cv_po_m: Corrosive Alloy — reduce defense while poisoned
                    if (hasCorrosive) e.defenseMultiplier = Math.min(e.defenseMultiplier || 1, 0.75);

                    // cv_po_f: Burning Toxin — ignite enemies with heavy poison
                    if (hasBurningToxin && e.poisonStacks >= 80) {
                        e.burnTimer = Math.max(e.burnTimer || 0, 120);
                    }

                    // Cap damage (max 5% current HP per tick)
                    totalDmg = Math.min(totalDmg, e.hp * 0.05 + 10);

                    const hpBefore = e.hp;

                    // Apply Damage
                    if (typeof e.takeDamage === 'function') e.takeDamage(totalDmg);
                    else e.hp -= totalDmg;

                    // cv_po_p: Plague Bloom — heal player on poison kill
                    if (hasPlagueBoom && hpBefore > 0 && e.hp <= 0) {
                        const heal = player.maxHp * 0.005;
                        if (typeof isChaosActive === 'function' && !isChaosActive('NO_REGEN')) {
                            player.hp = Math.min(player.maxHp, player.hp + heal);
                        }
                        if (typeof createDamageNumber === 'function') createDamageNumber(player.x, player.y - 30, '+' + heal.toFixed(1), '#76ff03');
                    }

                    // po3: Virulent Strain — spread stacks on poison kill
                    if (hasVirulent && hpBefore > 0 && e.hp <= 0 && !e.pandemicSpread) {
                        e.pandemicSpread = true;
                        const spreadStacks = Math.floor(e.poisonStacks * 0.5);
                        if (spreadStacks > 0 && window.enemies) {
                            window.enemies.forEach(other => {
                                if (other !== e && other.hp > 0 && Math.hypot(other.x - e.x, other.y - e.y) < 150) {
                                    other.poisonStacks = Math.min((other.poisonStacks || 0) + spreadStacks, 100);
                                    if (typeof createExplosion !== 'undefined') createExplosion(other.x, other.y, '#76ff03', 15);
                                }
                            });
                        }
                        if (typeof createExplosion !== 'undefined') createExplosion(e.x, e.y, '#76ff03', 30);
                    }

                    // Visuals
                    if (typeof createExplosion !== 'undefined') {
                        createExplosion(e.x, e.y, '#76ff03', 10);
                    }

                    if (Math.random() < 0.3 && typeof createDamageNumber === 'function') {
                        createDamageNumber(e.x, e.y - 20, Math.floor(totalDmg), '#76ff03');
                    }
                    if (e.isPoisonedVisual > 0) e.isPoisonedVisual--;

                    // Decay Stacks
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

        // Play combo-tier sound
        if (typeof audioManager !== 'undefined') {
            const _sfxTier = (combo === 'NONE') ? 'special_poison_1'
                : (combo === 'RED' || combo === 'BLUE' || combo === 'GREEN') ? 'special_poison_2'
                : (combo === 'RED_RED' || combo === 'BLUE_BLUE' || combo === 'GREEN_GREEN') ? 'special_poison_3'
                : 'special_poison_4';
            audioManager.play(_sfxTier);
        }

        // Logic for Combinations
        switch (combo) {
            case 'NONE':      PoisonHero.createMiasmaField(player, cx, cy);       break;
            case 'RED':       PoisonHero.createSanguineLeech(player, cx, cy);     break;
            case 'BLUE':      PoisonHero.createCryogenicBurst(player, cx, cy);    break;
            case 'GREEN':     PoisonHero.createAcidRain(player, cx, cy);          break;
            case 'RED_RED':   PoisonHero.createHemorrhageChain(player, cx, cy);   break;
            case 'BLUE_BLUE': PoisonHero.createAbsoluteZero(player, cx, cy);      break;
            case 'GREEN_GREEN': PoisonHero.createToxicTsunami(player, cx, cy);    break;
            case 'BLUE_RED':  PoisonHero.createHallucinogenCloud(player, cx, cy); break;
            case 'GREEN_RED': PoisonHero.createUnstableCompound(player, cx, cy);  break;
            case 'BLUE_GREEN': PoisonHero.createViralMutation(player, cx, cy);    break;
        }

        // NO LONGER Reset Flasks - User Request
        // player.poisonFlasks = [];

        // Trigger Cooldown
        player.specialCooldown = player.specialMaxCooldown;
    }

    // --- ABILITIES & EFFECTS ---

    // NONE: Miasma Unleashed — rotating decay aura follows player
    static createMiasmaField(player, cx, cy) {
        if (!window.projectiles) return;
        if (typeof showNotification === 'function') showNotification("☠️ MIASMA UNLEASHED", "#76ff03");
        const p = new Projectile(cx, cy, { x: 0, y: 0 }, 0, 'rgba(30,80,30,0.4)', 180, 'MIASMA', 0, false);
        p.life = 480; p.pierce = 9999; p.onHit = () => 'STOP'; p._rot = 0;
        p.update = function() {
            if (!player || player.hp <= 0) { this.dead = true; return; }
            this.x = player.x; this.y = player.y;
            this._rot += 0.03; this.life--;
            if (this.life <= 0) { this.dead = true; return; }
            if (window.frame % 10 === 0 && window.enemies) {
                window.enemies.forEach(e => {
                    if (e.hp > 0 && Math.hypot(e.x - this.x, e.y - this.y) < this.radius) {
                        const dmg = (player.damageMultiplier || 1) * (player.stats.dotMultiplier || 1);
                        if (typeof e.takeDamage === 'function') e.takeDamage(dmg); else e.hp -= dmg;
                        e.poisonStacks = Math.min((e.poisonStacks || 0) + 3, 100);
                        e.speedMultiplier = Math.min(e.speedMultiplier || 1, 0.6);
                        e.isPoisonedVisual = 30;
                    }
                });
            }
            if (window.particles && typeof Particle !== 'undefined' && Math.random() < 0.35) {
                const a = Math.random() * Math.PI * 2, r = Math.random() * this.radius;
                const pp = new Particle(this.x + Math.cos(a)*r, this.y + Math.sin(a)*r, `rgba(60,${100+Math.random()*80|0},30,0.7)`);
                pp.velocity = { x: (Math.random()-0.5)*0.5, y: -1-Math.random() }; pp.life = 40;
                window.particles.push(pp);
            }
        };
        p.draw = function() {
            if (!window.ctx) return;
            const ctx = window.ctx; ctx.save(); ctx.translate(this.x, this.y);
            const alpha = Math.min(1, this.life / 60) * 0.85;
            const grad = ctx.createRadialGradient(0,0,0,0,0,this.radius);
            grad.addColorStop(0, `rgba(60,160,30,${alpha*0.6})`);
            grad.addColorStop(0.5, `rgba(30,90,20,${alpha*0.4})`);
            grad.addColorStop(1, 'rgba(10,40,10,0)');
            ctx.beginPath(); ctx.arc(0,0,this.radius,0,Math.PI*2); ctx.fillStyle = grad; ctx.fill();
            const t = Date.now() / 1000;
            for (let ring = 0; ring < 3; ring++) {
                ctx.strokeStyle = `rgba(${80+ring*40},${200-ring*30},20,${alpha*(0.6-ring*0.1)})`;
                ctx.lineWidth = 2.5 - ring*0.5; ctx.setLineDash([15, 10]);
                ctx.lineDashOffset = -t * 40 * (ring%2===0?1:-1);
                ctx.beginPath(); ctx.arc(0,0,this.radius*(0.4+ring*0.25),0,Math.PI*2); ctx.stroke();
            }
            ctx.setLineDash([]);
            ctx.fillStyle = `rgba(200,255,100,${alpha*0.7})`; ctx.font = '13px monospace';
            ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
            for (let i = 0; i < 5; i++) {
                const a = this._rot + (i/5)*Math.PI*2, r = this.radius*0.65;
                ctx.save(); ctx.translate(Math.cos(a)*r, Math.sin(a)*r); ctx.fillText('☠', 0, 0); ctx.restore();
            }
            ctx.restore();
        };
        p.owner = player;
        window.projectiles.push(p);
    }

    // RED: Sanguine Leech — blood vortex pulls enemies, drains life
    static createSanguineLeech(player, cx, cy) {
        if (!window.projectiles) return;
        if (typeof showNotification === 'function') showNotification("🩸 SANGUINE LEECH", "#e74c3c");
        const p = new Projectile(cx, cy, { x: 0, y: 0 }, 0, 'rgba(150,20,20,0.3)', 150, 'LEECH', 0, false);
        p.life = 180; p.pierce = 9999; p.onHit = () => 'STOP'; p._rot = 0; p._healAccum = 0;
        p.update = function() {
            this.life--; this._rot += 0.06;
            if (this.life <= 0) { this.dead = true; return; }
            if (window.enemies) {
                window.enemies.forEach(e => {
                    if (e.hp <= 0) return;
                    const d = Math.hypot(e.x - this.x, e.y - this.y);
                    if (d < this.radius) {
                        const pull = 1.5 * (1 - d / this.radius);
                        const ang = Math.atan2(this.y - e.y, this.x - e.x);
                        e.x += Math.cos(ang) * pull; e.y += Math.sin(ang) * pull;
                        if (window.frame % 8 === 0) {
                            const drain = 3 * (player.damageMultiplier || 1);
                            const before = e.hp;
                            if (typeof e.takeDamage === 'function') e.takeDamage(drain); else e.hp -= drain;
                            this._healAccum += (before - Math.max(0, e.hp)) * 0.3;
                            e.poisonStacks = Math.min((e.poisonStacks || 0) + 2, 100);
                            if (window.particles && typeof Particle !== 'undefined') {
                                const pp = new Particle(e.x, e.y, '#c0392b');
                                const ta = Math.atan2(player.y - e.y, player.x - e.x);
                                pp.velocity = { x: Math.cos(ta)*3, y: Math.sin(ta)*3 }; pp.life = 20;
                                window.particles.push(pp);
                            }
                        }
                    }
                });
            }
            if (this._healAccum > 0 && player.hp < player.maxHp) {
                const toHeal = Math.min(this._healAccum, 5);
                player.hp = Math.min(player.maxHp, player.hp + toHeal); this._healAccum -= toHeal;
                if (Math.random() < 0.15 && typeof createDamageNumber === 'function')
                    createDamageNumber(player.x, player.y-25, '+'+toHeal.toFixed(1), '#e74c3c');
            }
        };
        p.draw = function() {
            if (!window.ctx) return;
            const ctx = window.ctx; ctx.save(); ctx.translate(this.x, this.y);
            const alpha = Math.min(1, this.life/30), t = this._rot;
            const grad = ctx.createRadialGradient(0,0,0,0,0,this.radius);
            grad.addColorStop(0, `rgba(200,0,30,${alpha*0.7})`);
            grad.addColorStop(0.4, `rgba(120,0,20,${alpha*0.5})`);
            grad.addColorStop(1, 'rgba(60,0,10,0)');
            ctx.beginPath(); ctx.arc(0,0,this.radius,0,Math.PI*2); ctx.fillStyle = grad; ctx.fill();
            for (let arm = 0; arm < 3; arm++) {
                const base = t + (arm/3)*Math.PI*2;
                ctx.strokeStyle = `rgba(220,20,60,${alpha*0.8})`; ctx.lineWidth = 2; ctx.beginPath();
                for (let s = 0; s < 30; s++) {
                    const f = s/30, a = base + f*Math.PI*1.5, r = f*this.radius*0.9;
                    if (s===0) ctx.moveTo(Math.cos(a)*r, Math.sin(a)*r);
                    else ctx.lineTo(Math.cos(a)*r, Math.sin(a)*r);
                }
                ctx.stroke();
            }
            const pulse = 0.8 + 0.2*Math.sin(t*5);
            ctx.fillStyle = `rgba(255,50,80,${alpha})`; ctx.beginPath(); ctx.arc(0,0,12*pulse,0,Math.PI*2); ctx.fill();
            ctx.fillStyle = `rgba(255,255,255,${alpha})`; ctx.font = '14px monospace';
            ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillText('🩸', 0, 0);
            ctx.restore();
        };
        p.owner = player;
        window.projectiles.push(p);
    }

    // BLUE: Cryogenic Burst — expanding ice shockwave + lingering frost zone
    static createCryogenicBurst(player, cx, cy) {
        if (!window.projectiles) return;
        if (typeof showNotification === 'function') showNotification("❄️ CRYOGENIC BURST", "#3498db");
        // Phase 1: expanding wave
        const wave = new Projectile(cx, cy, { x:0, y:0 }, 0, 'rgba(0,0,0,0)', 0, 'CRYO_WAVE', 0, false);
        wave.life = 50; wave.pierce = 9999; wave.onHit = () => 'STOP';
        wave._maxR = 250; wave._hit = new Set();
        wave.update = function() {
            this.life--; this.radius = wave._maxR * (1 - this.life/50);
            if (this.life <= 0) { this.dead = true; return; }
            if (window.enemies) {
                window.enemies.forEach(e => {
                    if (e.hp <= 0 || this._hit.has(e)) return;
                    if (Math.hypot(e.x-cx, e.y-cy) < this.radius) {
                        this._hit.add(e); e.frozen = Math.max(e.frozen||0, 90);
                        e.poisonStacks = Math.min((e.poisonStacks||0)+5, 100);
                        if (typeof createDamageNumber === 'function') createDamageNumber(e.x, e.y-10, '❄️', '#3498db');
                        if (window.particles && typeof Particle !== 'undefined') {
                            for (let i=0;i<5;i++) {
                                const pp = new Particle(e.x,e.y,`rgba(${150+Math.random()*100|0},${200+Math.random()*55|0},255,0.9)`);
                                const a=Math.random()*Math.PI*2; pp.velocity={x:Math.cos(a)*2,y:Math.sin(a)*2}; pp.life=25;
                                window.particles.push(pp);
                            }
                        }
                    }
                });
            }
        };
        wave.draw = function() {
            if (!window.ctx) return;
            const ctx = window.ctx; ctx.save();
            const progress = 1 - this.life/50, r = wave._maxR*progress, alpha = (1-progress)*1.2;
            ctx.strokeStyle = `rgba(100,200,255,${Math.min(1,alpha)})`; ctx.lineWidth = 4;
            ctx.beginPath(); ctx.arc(cx,cy,r,0,Math.PI*2); ctx.stroke();
            const shards = 12;
            ctx.fillStyle = `rgba(180,230,255,${Math.min(1,alpha)*0.8})`;
            for (let i=0;i<shards;i++) {
                const a=(i/shards)*Math.PI*2;
                ctx.save(); ctx.translate(cx+Math.cos(a)*r, cy+Math.sin(a)*r); ctx.rotate(a);
                ctx.beginPath(); ctx.moveTo(0,0); ctx.lineTo(-4,-10); ctx.lineTo(0,-18); ctx.lineTo(4,-10); ctx.closePath(); ctx.fill();
                ctx.restore();
            }
            ctx.restore();
        };
        wave.owner = player;
        window.projectiles.push(wave);
        // Phase 2: frost zone after 100ms
        setTimeout(() => {
            if (!window.projectiles) return;
            const zone = new Projectile(cx, cy, {x:0,y:0}, 0, 'rgba(30,100,180,0.15)', 200, 'FROST_ZONE', 0, false);
            zone.life = 240; zone.pierce = 9999; zone.onHit = () => 'STOP'; zone.owner = player;
            zone.update = function() {
                this.life--; if (this.life<=0){this.dead=true;return;}
                if (window.enemies && window.frame%20===0) {
                    window.enemies.forEach(e => {
                        if (e.hp>0 && Math.hypot(e.x-this.x,e.y-this.y)<this.radius) {
                            e.frozen = Math.max(e.frozen||0,30); e.speedMultiplier=Math.min(e.speedMultiplier||1,0.4);
                        }
                    });
                }
            };
            zone.draw = function() {
                if (!window.ctx) return;
                const ctx = window.ctx; ctx.save(); ctx.translate(this.x, this.y);
                const alpha = Math.min(1, this.life/60)*0.5, t = Date.now()/2000;
                const grad = ctx.createRadialGradient(0,0,0,0,0,this.radius);
                grad.addColorStop(0,`rgba(150,220,255,${alpha*0.6})`); grad.addColorStop(0.7,`rgba(50,150,220,${alpha*0.3})`); grad.addColorStop(1,'rgba(0,80,180,0)');
                ctx.beginPath(); ctx.arc(0,0,this.radius,0,Math.PI*2); ctx.fillStyle=grad; ctx.fill();
                ctx.strokeStyle=`rgba(180,230,255,${alpha*0.7})`; ctx.lineWidth=1;
                for (let i=0;i<8;i++) {
                    const a=(i/8)*Math.PI*2+t, rr=(0.3+(i%3)*0.2)*this.radius, hs=8+(i%3)*4;
                    ctx.save(); ctx.translate(Math.cos(a)*rr, Math.sin(a)*rr); ctx.rotate(t+i);
                    ctx.beginPath();
                    for (let j=0;j<6;j++){const ha=(j/6)*Math.PI*2;if(j===0)ctx.moveTo(Math.cos(ha)*hs,Math.sin(ha)*hs);else ctx.lineTo(Math.cos(ha)*hs,Math.sin(ha)*hs);}
                    ctx.closePath(); ctx.stroke(); ctx.restore();
                }
                ctx.restore();
            };
            window.projectiles.push(zone);
        }, 100);
    }

    // GREEN: Acid Rain — corrosive droplets fall over wide area
    static createAcidRain(player, cx, cy) {
        if (!window.projectiles) return;
        if (typeof showNotification === 'function') showNotification("🧪 ACID RAIN", "#76ff03");
        const rainR = 220, totalDrops = 18;
        let dropped = 0;
        const ctrl = new Projectile(cx, cy, {x:0,y:0}, 0, 'rgba(0,0,0,0)', 5, 'ACIDRAIN', 0, false);
        ctrl.life = 300; ctrl.pierce = 9999; ctrl.onHit = () => 'STOP'; ctrl._last = 0;
        ctrl.update = function() {
            this.life--; if (this.life<=0){this.dead=true;return;}
            if (window.frame - this._last >= 16 && dropped < totalDrops) {
                this._last = window.frame; dropped++;
                const a=Math.random()*Math.PI*2, d=Math.random()*rainR;
                const tx=cx+Math.cos(a)*d, ty=cy+Math.sin(a)*d;
                PoisonHero._spawnAcidDrop(player, tx, ty-200, ty);
            }
        };
        ctrl.draw = function() {
            if (!window.ctx) return;
            const ctx = window.ctx; ctx.save();
            const alpha = Math.min(1, this.life/60)*0.4;
            ctx.setLineDash([8,6]); ctx.strokeStyle=`rgba(100,255,50,${alpha})`; ctx.lineWidth=2;
            ctx.beginPath(); ctx.arc(cx,cy,rainR,0,Math.PI*2); ctx.stroke(); ctx.setLineDash([]); ctx.restore();
        };
        ctrl.owner = player;
        window.projectiles.push(ctrl);
    }

    static _spawnAcidDrop(player, sx, sy, ty) {
        if (!window.projectiles) return;
        const spd = 12;
        const p = new Projectile(sx, sy, {x:0,y:spd}, 0, '#6bff00', 7, 'ACID_DROP', 0, false);
        p.life = Math.ceil(Math.abs(ty-sy)/spd)+5; p.pierce=9999; p.onHit=()=>'STOP'; p._ty=ty; p._landed=false;
        p.update = function() {
            if (this._landed) return;
            this.y += spd; this.life--;
            if (this.life<=0||this.y>=this._ty) {
                this._landed=true; this.dead=true;
                PoisonHero._spawnMiniAcidPool(player, this.x, this._ty, 55, 180);
                if (window.particles && typeof Particle !== 'undefined') {
                    for (let i=0;i<6;i++) {
                        const pp=new Particle(this.x,this._ty,`rgba(${80+Math.random()*100|0},255,${30+Math.random()*50|0},0.9)`);
                        const a=-Math.PI/2+(Math.random()-0.5)*Math.PI;
                        pp.velocity={x:Math.cos(a)*(1+Math.random()*2),y:Math.sin(a)*(1+Math.random()*2)}; pp.life=20;
                        window.particles.push(pp);
                    }
                }
            }
        };
        p.draw = function() {
            if (!window.ctx||this._landed) return;
            const ctx=window.ctx; ctx.save(); ctx.translate(this.x,this.y);
            ctx.fillStyle='rgba(100,255,50,0.9)'; ctx.beginPath(); ctx.arc(0,0,this.radius,0,Math.PI*2); ctx.fill();
            ctx.fillStyle='rgba(200,255,100,0.7)'; ctx.beginPath(); ctx.arc(-2,-2,3,0,Math.PI*2); ctx.fill();
            ctx.restore();
        };
        p.owner = player;
        window.projectiles.push(p);
    }

    static _spawnMiniAcidPool(player, x, y, r, life) {
        if (!window.projectiles) return;
        const p = new Projectile(x, y, {x:0,y:0}, 0, 'rgba(80,200,20,0.25)', r, 'MINI_ACID', 0, false);
        p.life=life; p.pierce=9999; p.onHit=()=>'STOP';
        p.update = function() {
            this.life--; if (this.life<=0){this.dead=true;return;}
            if (window.enemies && window.frame%15===0) {
                window.enemies.forEach(e => {
                    if (e.hp>0 && Math.hypot(e.x-this.x,e.y-this.y)<this.radius) {
                        const dmg=2*(player.damageMultiplier||1);
                        if (typeof e.takeDamage==='function') e.takeDamage(dmg); else e.hp-=dmg;
                        e.defenseMultiplier=Math.min(e.defenseMultiplier||1,0.65);
                        e.poisonStacks=Math.min((e.poisonStacks||0)+3,100);
                    }
                });
            }
        };
        p.draw = function() {
            if (!window.ctx) return;
            const ctx=window.ctx; ctx.save(); ctx.translate(this.x,this.y);
            const alpha=Math.min(1,this.life/30)*0.7, t=Date.now()/500;
            const grad=ctx.createRadialGradient(0,0,0,0,0,this.radius);
            grad.addColorStop(0,`rgba(120,255,40,${alpha})`); grad.addColorStop(0.6,`rgba(60,180,20,${alpha*0.6})`); grad.addColorStop(1,'rgba(30,100,10,0)');
            ctx.beginPath(); ctx.arc(0,0,this.radius,0,Math.PI*2); ctx.fillStyle=grad; ctx.fill();
            ctx.fillStyle=`rgba(180,255,100,${alpha*0.8})`;
            for (let i=0;i<3;i++) {
                const ba=(i/3)*Math.PI*2+t+i, br=(0.2+(i%2)*0.3)*this.radius, bs=3+Math.sin(t*2+i)*1.5;
                ctx.beginPath(); ctx.arc(Math.cos(ba)*br,Math.sin(ba)*br,bs,0,Math.PI*2); ctx.fill();
            }
            ctx.restore();
        };
        p.owner = player;
        window.projectiles.push(p);
    }

    // RED_RED: Hemorrhage Chain — blood nova with chain explosions
    static createHemorrhageChain(player, cx, cy) {
        if (typeof showNotification === 'function') showNotification("💀 HEMORRHAGE CHAIN", "#c0392b");
        const firstR=200, chainR=120, baseDmg=25*(player.damageMultiplier||1);
        PoisonHero._spawnRingShockwave(cx, cy, firstR, '#c0392b', player);
        if (typeof createExplosion === 'function') createExplosion(cx, cy, '#c0392b', 80);
        if (window.enemies) {
            window.enemies.forEach(e => {
                if (e.hp>0 && Math.hypot(e.x-cx,e.y-cy)<firstR) {
                    if (typeof e.takeDamage==='function') e.takeDamage(baseDmg); else e.hp-=baseDmg;
                    e.bleedStacks=(e.bleedStacks||0)+15;
                    e.poisonStacks=Math.min((e.poisonStacks||0)+10,100);
                    if (typeof createDamageNumber==='function') createDamageNumber(e.x,e.y,Math.floor(baseDmg),'#c0392b');
                }
            });
        }
        setTimeout(() => {
            if (!window.enemies) return;
            window.enemies.forEach(e => {
                if (!e||e.hp<=0||!e.bleedStacks||e.bleedStacks<10) return;
                if (typeof createExplosion==='function') createExplosion(e.x,e.y,'#8b0000',50);
                PoisonHero._spawnRingShockwave(e.x, e.y, chainR, '#8b0000', player);
                const ex=e.x, ey=e.y;
                window.enemies.forEach(nb => {
                    if (nb!==e && nb.hp>0 && Math.hypot(nb.x-ex,nb.y-ey)<chainR) {
                        const cd=baseDmg*0.7;
                        if (typeof nb.takeDamage==='function') nb.takeDamage(cd); else nb.hp-=cd;
                        nb.bleedStacks=(nb.bleedStacks||0)+8;
                        if (typeof createDamageNumber==='function') createDamageNumber(nb.x,nb.y,Math.floor(cd),'#8b0000');
                    }
                });
                e.bleedStacks=0;
            });
            const heal=player.maxHp*0.08;
            player.hp=Math.min(player.maxHp,player.hp+heal);
            if (typeof createDamageNumber==='function') createDamageNumber(player.x,player.y-30,'+'+heal.toFixed(0)+' LEECH','#c0392b');
        }, 500);
    }

    static _spawnRingShockwave(cx, cy, maxR, color, owner) {
        if (!window.projectiles) return;
        const p = new Projectile(cx,cy,{x:0,y:0},0,'rgba(0,0,0,0)',maxR,'RING_WAVE',0,false);
        p.life=30; p.pierce=9999; p.onHit=()=>'STOP'; p._maxR=maxR; p._col=color; if (owner) p.owner=owner;
        p.update=function(){this.life--;if(this.life<=0)this.dead=true;};
        p.draw=function(){
            if (!window.ctx) return;
            const ctx=window.ctx; ctx.save();
            const prog=1-this.life/30, r=this._maxR*prog, alpha=(1-prog)*0.9;
            ctx.strokeStyle=this._col.replace('#','').length===6 ? `rgba(${parseInt(this._col.slice(1,3),16)},${parseInt(this._col.slice(3,5),16)},${parseInt(this._col.slice(5,7),16)},${alpha})` : `rgba(200,0,30,${alpha})`;
            ctx.lineWidth=4; ctx.beginPath(); ctx.arc(cx,cy,r,0,Math.PI*2); ctx.stroke();
            ctx.lineWidth=2; ctx.globalAlpha=alpha*0.4; ctx.beginPath(); ctx.arc(cx,cy,r*0.7,0,Math.PI*2); ctx.stroke();
            ctx.restore();
        };
        window.projectiles.push(p);
    }

    // BLUE_BLUE: Absolute Zero — three staggered ice waves with shattering
    static createAbsoluteZero(player, cx, cy) {
        if (typeof showNotification === 'function') showNotification("🌨️ ABSOLUTE ZERO", "#00bfff");
        [0, 220, 460].forEach((delay, idx) => {
            setTimeout(() => {
                if (typeof createExplosion==='function') createExplosion(cx,cy,'#3498db',40);
                PoisonHero._spawnIceWave(player, cx, cy, 300+idx*70, idx);
            }, delay);
        });
    }

    static _spawnIceWave(player, cx, cy, maxR, waveIdx) {
        if (!window.projectiles) return;
        const p = new Projectile(cx,cy,{x:0,y:0},0,'rgba(0,0,0,0)',maxR,'ICE_WAVE',0,false);
        p.life=40; p.pierce=9999; p.onHit=()=>'STOP'; p._maxR=maxR; p._hit=new Set(); p._wi=waveIdx;
        p.update=function(){
            this.life--; const prog=1-this.life/40, curR=this._maxR*prog;
            if (this.life<=0){this.dead=true;return;}
            if (window.enemies) {
                window.enemies.forEach(e=>{
                    if (e.hp<=0||this._hit.has(e)) return;
                    if (Math.hypot(e.x-cx,e.y-cy)<curR) {
                        this._hit.add(e);
                        const alreadyFrozen=e.frozen>0;
                        e.frozen=Math.max(e.frozen||0,180+this._wi*60);
                        const dmg=(8+this._wi*6)*(player.damageMultiplier||1)*(alreadyFrozen?2.5:1);
                        if (typeof e.takeDamage==='function') e.takeDamage(dmg); else e.hp-=dmg;
                        e.poisonStacks=Math.min((e.poisonStacks||0)+5,100);
                        if (alreadyFrozen&&typeof createDamageNumber==='function') createDamageNumber(e.x,e.y-15,'SHATTERED!','#00bfff');
                        if (window.particles&&typeof Particle!=='undefined') {
                            for(let i=0;i<8;i++){
                                const pp=new Particle(e.x,e.y,`rgba(${100+Math.random()*155|0},${210+Math.random()*45|0},255,1)`);
                                const a=Math.random()*Math.PI*2; pp.velocity={x:Math.cos(a)*3,y:Math.sin(a)*3}; pp.life=30;
                                window.particles.push(pp);
                            }
                        }
                    }
                });
            }
        };
        p.draw=function(){
            if (!window.ctx) return;
            const ctx=window.ctx; ctx.save();
            const prog=1-this.life/40, r=this._maxR*prog, alpha=(1-prog)*1.2;
            const cols=['rgba(100,200,255','rgba(150,230,255','rgba(200,240,255'];
            ctx.strokeStyle=`${cols[this._wi]},${Math.min(1,alpha)})`; ctx.lineWidth=5-this._wi;
            ctx.beginPath(); ctx.arc(cx,cy,r,0,Math.PI*2); ctx.stroke();
            ctx.fillStyle=`rgba(180,230,255,${Math.min(1,alpha*0.7)})`;
            const shards=16+this._wi*4;
            for(let i=0;i<shards;i++){
                const a=(i/shards)*Math.PI*2;
                ctx.save(); ctx.translate(cx+Math.cos(a)*r,cy+Math.sin(a)*r); ctx.rotate(a+Math.PI/2);
                const h=8+Math.sin(i*1.7)*4;
                ctx.beginPath(); ctx.moveTo(0,-h); ctx.lineTo(-3,0); ctx.lineTo(3,0); ctx.closePath(); ctx.fill();
                ctx.restore();
            }
            ctx.restore();
        };
        p.owner = player;
        window.projectiles.push(p);
    }

    // GREEN_GREEN: Toxic Tsunami — rolling wave in aim direction
    static createToxicTsunami(player, cx, cy) {
        if (!window.projectiles) return;
        if (typeof showNotification === 'function') showNotification("🌊 TOXIC TSUNAMI", "#00e676");
        const angle=player.aimAngle||0, spd=6, ww=280;
        const p = new Projectile(cx,cy,{x:Math.cos(angle)*spd,y:Math.sin(angle)*spd},0,'rgba(0,200,60,0.4)',10,'TSUNAMI',0,false);
        p.life=Math.ceil(400/spd)+10; p.pierce=9999; p.onHit=()=>'STOP';
        p._ang=angle; p._ww=ww; p._hit=new Set();
        p.update=function(){
            this.life--; this.x+=this.velocity.x; this.y+=this.velocity.y;
            if (this.life<=0){this.dead=true;return;}
            if (window.enemies) {
                window.enemies.forEach(e=>{
                    if (e.hp<=0||this._hit.has(e)) return;
                    const dx=e.x-this.x, dy=e.y-this.y;
                    const along=dx*Math.cos(this._ang)+dy*Math.sin(this._ang);
                    const perp=Math.abs(-dx*Math.sin(this._ang)+dy*Math.cos(this._ang));
                    if (along>-60&&along<60&&perp<this._ww/2) {
                        this._hit.add(e);
                        const dmg=(15+Math.random()*10)*(player.damageMultiplier||1);
                        if (typeof e.takeDamage==='function') e.takeDamage(dmg); else e.hp-=dmg;
                        e.poisonStacks=Math.min((e.poisonStacks||0)+20,100);
                        e.x+=Math.cos(this._ang)*30; e.y+=Math.sin(this._ang)*30;
                        if (typeof createDamageNumber==='function') createDamageNumber(e.x,e.y,Math.floor(dmg),'#00e676');
                    }
                });
            }
            if (window.frame%8===0) PoisonHero._spawnMiniAcidPool(player,this.x-Math.cos(this._ang)*30,this.y-Math.sin(this._ang)*30,70,120);
            if (window.particles&&typeof Particle!=='undefined'&&Math.random()<0.5) {
                const perp=this._ang+Math.PI/2, off=(Math.random()-0.5)*this._ww;
                const pp=new Particle(this.x+Math.cos(perp)*off,this.y+Math.sin(perp)*off,`rgba(${100+Math.random()*100|0},255,${50+Math.random()*80|0},0.8)`);
                pp.velocity={x:Math.cos(this._ang)*2+(Math.random()-0.5),y:Math.sin(this._ang)*2+(Math.random()-0.5)}; pp.life=25;
                window.particles.push(pp);
            }
        };
        p.draw=function(){
            if (!window.ctx) return;
            const ctx=window.ctx; ctx.save(); ctx.translate(this.x,this.y); ctx.rotate(this._ang);
            const alpha=Math.min(1,this.life/30), w=this._ww;
            const grad=ctx.createLinearGradient(-80,0,60,0);
            grad.addColorStop(0,'rgba(0,150,40,0)'); grad.addColorStop(0.3,`rgba(0,220,80,${alpha*0.7})`);
            grad.addColorStop(0.7,`rgba(30,180,60,${alpha*0.8})`); grad.addColorStop(1,'rgba(0,100,30,0)');
            ctx.fillStyle=grad; ctx.fillRect(-80,-w/2,140,w);
            const crest=ctx.createLinearGradient(50,0,70,0);
            crest.addColorStop(0,`rgba(100,255,100,${alpha*0.8})`); crest.addColorStop(1,'rgba(0,200,60,0)');
            ctx.fillStyle=crest; ctx.fillRect(50,-w/2,20,w);
            ctx.fillStyle=`rgba(200,255,160,${alpha*0.9})`;
            for (let i=0;i<10;i++){
                const fy=-w/2+(i/10)*w, fx=50+Math.sin(i*1.5+Date.now()/200)*8;
                ctx.beginPath(); ctx.arc(fx,fy,5,0,Math.PI*2); ctx.fill();
            }
            ctx.fillStyle=`rgba(0,255,100,${alpha})`; ctx.font='bold 18px monospace';
            ctx.textAlign='center'; ctx.textBaseline='middle'; ctx.fillText('☣',0,0);
            ctx.restore();
        };
        p.owner = player;
        window.projectiles.push(p);
    }

    // BLUE_RED: Hallucinogen — psychedelic cloud causing enemy infighting
    static createHallucinogenCloud(player, cx, cy) {
        if (!window.projectiles) return;
        if (typeof showNotification === 'function') showNotification("🌀 HALLUCINOGEN", "#9b59b6");
        const p = new Projectile(cx,cy,{x:0,y:0},0,'rgba(100,20,150,0.3)',280,'HALLUCIN',0,false);
        p.life=360; p.pierce=9999; p.onHit=()=>'STOP'; p._rot=0;
        p.update=function(){
            this.life--; this._rot+=0.02;
            if (this.life<=0){this.dead=true;return;}
            if (window.enemies&&window.frame%20===0) {
                window.enemies.forEach(e=>{
                    if (e.hp<=0) return;
                    if (Math.hypot(e.x-this.x,e.y-this.y)<this.radius) {
                        e.confused=Math.max(e.confused||0,40);
                        e.poisonStacks=Math.min((e.poisonStacks||0)+4,100);
                        if (window.frame%30===0) {
                            const dmg=3*(player.damageMultiplier||1);
                            if (typeof e.takeDamage==='function') e.takeDamage(dmg); else e.hp-=dmg;
                            const target=window.enemies.find(o=>o!==e&&o.hp>0&&Math.hypot(o.x-e.x,o.y-e.y)<100);
                            if (target) {
                                const fd=(e.damage||5)*0.8;
                                if (typeof target.takeDamage==='function') target.takeDamage(fd); else target.hp-=fd;
                                if (typeof createDamageNumber==='function') createDamageNumber(target.x,target.y,'CONFUSED!','#9b59b6');
                            }
                        }
                    }
                });
            }
            if (window.particles&&typeof Particle!=='undefined'&&Math.random()<0.4) {
                const a=Math.random()*Math.PI*2, r=Math.random()*this.radius;
                const cols=['#9b59b6','#e74c3c','#3498db','#f39c12','#e91e63'];
                const pp=new Particle(this.x+Math.cos(a)*r,this.y+Math.sin(a)*r,cols[Math.floor(Math.random()*cols.length)]);
                pp.velocity={x:(Math.random()-0.5)*1.5,y:(Math.random()-0.5)*1.5}; pp.life=50;
                window.particles.push(pp);
            }
        };
        p.draw=function(){
            if (!window.ctx) return;
            const ctx=window.ctx; ctx.save(); ctx.translate(this.x,this.y);
            const alpha=Math.min(1,this.life/60)*0.8, t=Date.now()/1000;
            const grad=ctx.createRadialGradient(0,0,0,0,0,this.radius);
            grad.addColorStop(0,`rgba(150,30,200,${alpha*0.45})`); grad.addColorStop(0.5,`rgba(220,30,120,${alpha*0.3})`); grad.addColorStop(1,'rgba(0,0,0,0)');
            ctx.beginPath(); ctx.arc(0,0,this.radius,0,Math.PI*2); ctx.fillStyle=grad; ctx.fill();
            for (let ring=0;ring<4;ring++) {
                const rr=this.radius*(0.25+ring*0.2), dir=ring%2===0?1:-1;
                ctx.strokeStyle=`rgba(${150+ring*30},${30+ring*40},${200-ring*30},${alpha*0.6})`;
                ctx.lineWidth=1.5; ctx.setLineDash([8,6]); ctx.lineDashOffset=-t*1.5*dir*30;
                ctx.beginPath(); ctx.arc(0,0,rr,0,Math.PI*2); ctx.stroke();
            }
            ctx.setLineDash([]);
            ctx.fillStyle=`rgba(255,200,0,${alpha})`; ctx.font='20px monospace';
            ctx.textAlign='center'; ctx.textBaseline='middle'; ctx.fillText('👁',0,0);
            ctx.restore();
        };
        p.owner = player;
        window.projectiles.push(p);
    }

    // GREEN_RED: Unstable Compound — pull vortex then massive detonation
    static createUnstableCompound(player, cx, cy) {
        if (!window.projectiles) return;
        if (typeof showNotification === 'function') showNotification("⚗️ UNSTABLE COMPOUND", "#f39c12");
        const p = new Projectile(cx,cy,{x:0,y:0},0,'rgba(0,0,0,0)',250,'UC_PHASE1',0,false);
        p.life=180; p.pierce=9999; p.onHit=()=>'STOP'; p._rot=0;
        p.update=function(){
            this.life--; this._rot+=0.05;
            if (this.life<=0){this.dead=true; PoisonHero._detonateUnstableCompound(player,cx,cy,400); return;}
            if (window.enemies) {
                window.enemies.forEach(e=>{
                    if (e.hp<=0) return;
                    const d=Math.hypot(e.x-cx,e.y-cy);
                    if (d<this.radius&&d>5) {
                        const pull=1.8*(1-d/this.radius), ang=Math.atan2(cy-e.y,cx-e.x);
                        e.x+=Math.cos(ang)*pull; e.y+=Math.sin(ang)*pull;
                        if (window.frame%15===0) {
                            const dmg=4*(player.damageMultiplier||1);
                            if (typeof e.takeDamage==='function') e.takeDamage(dmg); else e.hp-=dmg;
                            e.poisonStacks=Math.min((e.poisonStacks||0)+3,100);
                        }
                    }
                });
            }
        };
        p.draw=function(){
            if (!window.ctx) return;
            const ctx=window.ctx; ctx.save(); ctx.translate(cx,cy);
            const urgency=1-this.life/180, t=this._rot;
            const grad=ctx.createRadialGradient(0,0,0,0,0,this.radius);
            grad.addColorStop(0,`rgba(255,150,0,0.5)`); grad.addColorStop(0.4,`rgba(180,80,0,0.25)`); grad.addColorStop(1,'rgba(100,50,0,0)');
            ctx.beginPath(); ctx.arc(0,0,this.radius,0,Math.PI*2); ctx.fillStyle=grad; ctx.fill();
            for (let i=0;i<3;i++){
                const rr=this.radius*(0.3+i*0.25), dir=i%2===0?1:-1;
                ctx.strokeStyle=`rgba(${255-i*40},${140-i*30},${urgency*200|0},${0.7-i*0.1})`;
                ctx.lineWidth=3-i*0.5; ctx.setLineDash([10,8]); ctx.lineDashOffset=t*dir*50;
                ctx.beginPath(); ctx.arc(0,0,rr,0,Math.PI*2); ctx.stroke();
            }
            ctx.setLineDash([]);
            ctx.strokeStyle=urgency>0.6?`rgba(255,0,0,0.9)`:`rgba(255,200,0,0.9)`; ctx.lineWidth=5;
            ctx.beginPath(); ctx.arc(0,0,25,-Math.PI/2,-Math.PI/2+Math.PI*2*(this.life/180)); ctx.stroke();
            ctx.fillStyle=`rgba(255,${urgency>0.6?50:200},${urgency>0.6?0:100},0.9)`; ctx.font='18px monospace';
            ctx.textAlign='center'; ctx.textBaseline='middle'; ctx.fillText('⚗',0,0);
            ctx.restore();
        };
        p.owner = player;
        window.projectiles.push(p);
    }

    static _detonateUnstableCompound(player, cx, cy, blastR) {
        if (typeof createExplosion==='function') {
            createExplosion(cx,cy,'#ff6600',blastR*0.5);
            setTimeout(()=>createExplosion(cx,cy,'#ff0000',blastR*0.7),80);
            setTimeout(()=>createExplosion(cx,cy,'#ff9900',blastR),160);
        }
        if (typeof audioManager!=='undefined') audioManager.play('explosion');
        if (typeof showNotification==='function') showNotification("💥 DETONATION!", "#ff4400");
        if (window.enemies) {
            window.enemies.forEach(e=>{
                const d=Math.hypot(e.x-cx,e.y-cy);
                if (d<blastR) {
                    const dmg=80*(player.damageMultiplier||1)+(e.poisonStacks||0)*1.5;
                    if (typeof e.takeDamage==='function') e.takeDamage(dmg); else e.hp-=dmg;
                    const kba=Math.atan2(e.y-cy,e.x-cx), kbf=(1-d/blastR)*60;
                    e.x+=Math.cos(kba)*kbf; e.y+=Math.sin(kba)*kbf;
                    if (typeof createDamageNumber==='function') createDamageNumber(e.x,e.y,Math.floor(dmg),'#ff6600');
                }
            });
        }
        PoisonHero._spawnRingShockwave(cx, cy, blastR, '#ff6600', player);
    }

    // BLUE_GREEN: Viral Mutation — infected enemies become spreading carriers
    static createViralMutation(player, cx, cy) {
        if (!window.projectiles) return;
        if (typeof showNotification === 'function') showNotification("🧬 VIRAL MUTATION", "#00e676");
        if (typeof createExplosion==='function') createExplosion(cx,cy,'#00e676',250*0.5);
        let count=0;
        if (window.enemies) {
            window.enemies.forEach(e=>{
                if (e.hp>0&&Math.hypot(e.x-cx,e.y-cy)<250) {
                    e.isViralCarrier=true; e.viralTimer=600;
                    e.poisonStacks=Math.min((e.poisonStacks||0)+25,100); count++;
                    if (typeof createDamageNumber==='function') createDamageNumber(e.x,e.y-15,'MUTATED','#00e676');
                }
            });
        }
        if (count>0&&typeof showNotification==='function') showNotification(`${count} ENEMIES MUTATED!`,'#00e676');
        // Persistent controller for carrier logic + draw
        const ctrl = new Projectile(cx,cy,{x:0,y:0},0,'rgba(0,0,0,0)',5,'VIRAL_CTRL',0,false);
        ctrl.life=600; ctrl.pierce=9999; ctrl.onHit=()=>'STOP';
        ctrl.update=function(){
            this.life--; if (this.life<=0){this.dead=true;return;}
            if (!window.enemies) return;
            window.enemies.forEach(e=>{
                if (!e.isViralCarrier||e.hp<=0) return;
                e.viralTimer--; if (e.viralTimer<=0){e.isViralCarrier=false;return;}
                if (window.frame%25===0) {
                    window.enemies.forEach(o=>{
                        if (o===e||o.hp<=0||o.isViralCarrier) return;
                        if (Math.hypot(o.x-e.x,o.y-e.y)<80) {
                            o.isViralCarrier=true; o.viralTimer=300;
                            o.poisonStacks=Math.min((o.poisonStacks||0)+15,100);
                            if (typeof createExplosion==='function') createExplosion(o.x,o.y,'#00e676',20);
                            if (typeof createDamageNumber==='function') createDamageNumber(o.x,o.y-10,'INFECTED!','#00c853');
                        }
                    });
                }
                if (window.frame%20===0&&Math.random()<0.4) PoisonHero._spawnMiniAcidPool(player,e.x,e.y,40,90);
                if (window.particles&&typeof Particle!=='undefined'&&Math.random()<0.2) {
                    const pp=new Particle(e.x+(Math.random()-0.5)*20,e.y+(Math.random()-0.5)*20,`rgba(0,${150+Math.random()*100|0},${50+Math.random()*100|0},0.8)`);
                    pp.velocity={x:(Math.random()-0.5)*1.5,y:-1-Math.random()}; pp.life=30;
                    window.particles.push(pp);
                }
            });
        };
        ctrl.draw=function(){
            if (!window.ctx||!window.enemies) return;
            const ctx=window.ctx; ctx.save();
            window.enemies.forEach(e=>{
                if (!e.isViralCarrier||e.hp<=0) return;
                const pulse=0.5+0.5*Math.sin(Date.now()/300+e.x*0.01), t=Date.now()/600, pct=e.viralTimer/600;
                const grad=ctx.createRadialGradient(e.x,e.y,0,e.x,e.y,35);
                grad.addColorStop(0,`rgba(0,230,100,${pulse*0.6})`); grad.addColorStop(0.5,`rgba(0,180,60,${pulse*0.3})`); grad.addColorStop(1,'rgba(0,120,30,0)');
                ctx.beginPath(); ctx.arc(e.x,e.y,35,0,Math.PI*2); ctx.fillStyle=grad; ctx.fill();
                ctx.fillStyle=`rgba(0,255,100,${pulse*0.9})`;
                for (let s=0;s<6;s++){
                    const a=t+(s/6)*Math.PI*2; ctx.beginPath(); ctx.arc(e.x+Math.cos(a)*22,e.y+Math.sin(a)*22,3,0,Math.PI*2); ctx.fill();
                }
                ctx.strokeStyle=`rgba(0,255,100,${pulse*0.7})`; ctx.lineWidth=2;
                ctx.beginPath(); ctx.arc(e.x,e.y,28,-Math.PI/2,-Math.PI/2+Math.PI*2*pct); ctx.stroke();
            });
            ctx.restore();
        };
        ctrl.owner = player;
        window.projectiles.push(ctrl);
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
                p.owner = player;
                window.projectiles.push(p);
            }
        }

        if (typeof audioManager !== 'undefined') audioManager.play('attack_poison');

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
