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
    }

    // --- SKILL TREE ---
    static getSkillTreeWeights() {
        return { DOT_DURATION: 0.3, RADIUS: 0.25, POTENCY: 0.25, SPEED: 0.1, HEALTH: 0.1 };
    }

    static getSkillNodeDetails(type, val, desc) {
        if (type === 'DOT_DURATION') return { val: 60, desc: "+1s Poison Duration" };
        if (type === 'RADIUS') return { val: 20, desc: "+20 Gas Radius" };
        if (type === 'POTENCY') return { val: 0.1, desc: "+10% DoT Damage" }; // Re-added Potency
        return { val, desc };
    }

    static applySkillNode(base, node) {
        if (node.type === 'DOT_DURATION') base.stats.dotDuration = (base.stats.dotDuration || 300) + node.value;
        if (node.type === 'RADIUS') base.stats.gasRadius = (base.stats.gasRadius || 100) + node.value;
        if (node.type === 'POTENCY') base.stats.dotMultiplier = (base.stats.dotMultiplier || 1) + node.value;
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
            'NONE': 'MIASMA UNLEASHED (Decay Field)', // Default restored
            'RED': 'Hemotoxin (Bleed)',
            'BLUE': 'Neurotoxin (Slow)',
            'GREEN': 'Corrosive (Armor Break)',
            'RED_RED': 'CRIMSON BURST (Massive Dmg)',
            'BLUE_BLUE': 'DEEP FREEZE (Stun Cloud)',
            'GREEN_GREEN': 'ACID FLOOD (Huge Pool)',
            'BLUE_RED': 'PURPLE HAZE (Confuse + DoT)',
            'GREEN_RED': 'EXPLOSIVE BILE (Boom)',
            'BLUE_GREEN': 'PARALYTIC SLIME (Root)'
        };
        return map[combo] || 'Unknown Mix';
    }

    // --- GAME LOOP ---

    static update(player, dx, dy) {
        // 1. Spawning Flasks logic is handled in PoisonBiome

        // 2. UI Overlay for Flasks
        PoisonHero.drawFlaskUI(player);

        // 3. Transformation handling (Miasma)
        if (player.transformActive) {
            player.transformTimer--;

            // Effect: Decay Field around player
            if (window.frame % 10 === 0 && window.enemies) {
                const radius = 300;
                window.enemies.forEach(e => {
                    if (e.hp > 0 && Math.hypot(e.x - player.x, e.y - player.y) < radius) {
                        e.hp -= 2; // Decay Damage
                        if (!e.poisonStacks) e.poisonStacks = 0;
                        e.poisonStacks = Math.min(e.poisonStacks + 5, 100);
                    }
                });

                // Visuals for field
                if (window.particles && Math.random() < 0.5) {
                    const a = Math.random() * Math.PI * 2;
                    const r = Math.random() * radius;
                    window.particles.push({
                        x: player.x + Math.cos(a) * r,
                        y: player.y + Math.sin(a) * r,
                        vx: 0, vy: -1,
                        life: 30, color: 'rgba(50, 50, 50, 0.5)', size: 4
                    });
                }
            }

            if (player.transformTimer <= 0) {
                player.transformActive = false;
                if (typeof showNotification === 'function') showNotification("Miasma Fades...", "#ccc");
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
                // RESTORED: Default Miasma Ability (Transformation / Aura)
                // Was previously "Miasma Unleashed" requiring Toxicity. Now just a cooldown ability.
                player.transformActive = true;
                player.transformTimer = 600; // 10s duration
                if (typeof showNotification === 'function') showNotification("MIASMA UNLEASHED", "#76ff03");
                break;

            // Single Vials (Weak versions of doubles)
            case 'RED': PoisonHero.createDoTZone(cx, cy, 100, 'BLEED'); break;
            case 'BLUE': PoisonHero.createSlowZone(cx, cy, 100, 0.5); break;
            case 'GREEN': PoisonHero.createAcidPool(cx, cy, 100); break;

            // DOUBLES (Full Power)
            // ... (rest same as before)
            case 'RED_RED': PoisonHero.createExplosion(cx, cy, 250, 150, '#e74c3c'); break;
            case 'BLUE_BLUE': PoisonHero.createSlowZone(cx, cy, 250, 0.1); break;
            case 'GREEN_GREEN': PoisonHero.createAcidPool(cx, cy, 250); break;
            case 'BLUE_RED': PoisonHero.createGasCloud(cx, cy, 200, 5, 300, '#9b59b6', 'CONFUSE'); break;
            case 'GREEN_RED':
                PoisonHero.createAcidPool(cx, cy, 150);
                setTimeout(() => PoisonHero.createExplosion(cx, cy, 200, 100, '#e67e22'), 1000);
                break;
            case 'BLUE_GREEN': PoisonHero.createSlowZone(cx, cy, 200, 0.0); break;
        }

        // Reset Flasks
        player.poisonFlasks = [];
    }

    // --- ABILITIES ---
    static createGasCloud(x, y, r, dmg, dur, color, effect) {
        if (!window.projectiles) return;
        // Make a stationary projectile that lingers
        const p = new Projectile(x, y, 0, 0, 0, 'poison', dmg, dur, 1, color);
        p.radius = r;
        p.isStatic = true; // Custom flag for update loop to not move it? 
        // Actually, Projectile logic deletes if speed is 0 maybe? 
        // Better to spawn a BiomeZone or a custom Entity.
        // Let's reuse Projectile but ensure it persists.
        p.life = dur;
        p.onHit = (enemy) => {
            if (window.frame % 30 === 0) enemy.takeDamage(dmg);
            if (effect === 'CONFUSE') { enemy.confused = 120; }
        };
        window.projectiles.push(p);
    }

    static createExplosion(x, y, r, dmg, color) {
        // Visual
        if (window.particles) {
            for (let i = 0; i < 20; i++) {
                window.particles.push({
                    x: x, y: y,
                    vx: (Math.random() - 0.5) * 10, vy: (Math.random() - 0.5) * 10,
                    life: 30, color: color, size: Math.random() * 5
                });
            }
        }
        // Dmg
        if (window.enemies) {
            window.enemies.forEach(e => {
                if (Math.hypot(e.x - x, e.y - y) < r) {
                    e.takeDamage(dmg);
                    e.pushbackX = (e.x - x) * 0.1;
                    e.pushbackY = (e.y - y) * 0.1;
                }
            });
        }
    }

    static createSlowZone(x, y, r, slowFactor) {
        // Similar to Gas Cloud but applies slow
        const p = new Projectile(x, y, 0, 0, 0, 'poison', 1, 300, 1, '#3498db');
        p.radius = r;
        p.life = 300; // 5s
        p.onHit = (enemy) => { enemy.speedMultiplier = slowFactor; };
        window.projectiles.push(p);
    }

    static createAcidPool(x, y, r) {
        // Applies Armor Break (Def down)
        const p = new Projectile(x, y, 0, 0, 0, 'poison', 2, 300, 1, '#76ff03');
        p.radius = r;
        p.life = 300;
        p.onHit = (enemy) => {
            enemy.defenseMultiplier = 0.5;
            if (window.frame % 20 === 0) enemy.takeDamage(2);
        };
        window.projectiles.push(p);
    }


    static shootGas(player, dx, dy) {
        // Standard Attack: Poison Gas Cloud (Restored)
        // Replaces simple projectile with expanding cloud entity logic

        const angle = Math.atan2(dy, dx);
        const speed = player.stats.projectileSpeed || 6;

        const radius = (player.stats.gasRadius || 120);
        const dmg = (player.stats.rangeDmg || 5) * player.damageMultiplier;

        // Visual Explosion at cast
        if (typeof createExplosion !== 'undefined') createExplosion(player.x, player.y, "#76ff03", 20);

        // Spawn Cloud Entity as a Projectile with custom update logic
        // We reuse the Projectile class but override behaviors
        if (typeof window.projectiles !== 'undefined') {
            const p = {
                x: player.x,
                y: player.y,
                vx: Math.cos(angle) * speed * 0.5, // Move slower than a bullet
                vy: Math.sin(angle) * speed * 0.5,
                radius: 10, // Starts small
                maxRadius: radius,
                color: "rgba(118, 255, 3, 0.4)",
                damage: dmg,
                life: 60, // 1s duration
                type: 'GAS_CLOUD',
                update: function () {
                    // Expand
                    if (this.radius < this.maxRadius) this.radius += 5;

                    // Decelerate
                    this.vx *= 0.9;
                    this.vy *= 0.9;
                    this.x += this.vx;
                    this.y += this.vy;

                    this.life--;
                    if (this.life <= 0) this.dead = true;

                    // Damage Logic: Iterate enemies to apply damage/poison
                    if (window.frame % 10 === 0 && window.enemies) {
                        window.enemies.forEach(e => {
                            if (e.hp > 0 && Math.hypot(e.x - this.x, e.y - this.y) < this.radius) {
                                // Apply Poison Stack
                                if (!e.poisonStacks) e.poisonStacks = 0;
                                e.poisonStacks += 10;
                                e.hp -= this.damage;
                                if (typeof createExplosion !== 'undefined') createExplosion(e.x, e.y, "#76ff03", 5);
                            }
                        });
                    }
                },
                draw: function (ctx) {
                    if (!ctx) ctx = window.ctx;
                    if (!ctx) return;

                    ctx.save();
                    ctx.translate(this.x, this.y);

                    // Core
                    ctx.fillStyle = this.color;
                    ctx.beginPath();
                    ctx.arc(0, 0, this.radius, 0, Math.PI * 2);
                    ctx.fill();

                    // Bubbles detail
                    if (Math.random() < 0.3) {
                        const r = Math.random() * this.radius;
                        const a = Math.random() * Math.PI * 2;
                        ctx.fillStyle = "#ccff00";
                        ctx.beginPath();
                        ctx.arc(Math.cos(a) * r, Math.sin(a) * r, 3 + Math.random() * 3, 0, Math.PI * 2);
                        ctx.fill();
                    }
                    ctx.restore();
                }
            };
            window.projectiles.push(p);
        }
    }


    // --- UI ---
    static drawFlaskUI(player) {
        if (typeof window.ctx === 'undefined') return;
        const ctx = window.ctx;

        // Draw Flasks at bottom of screen
        const flasks = player.poisonFlasks || [];
        const max = 2;
        const x = window.innerWidth / 2;
        const y = window.innerHeight - 100; // Above hotbar

        ctx.save();

        // Label
        ctx.fillStyle = '#fff';
        ctx.font = '12px Arial';
        ctx.textAlign = 'center';
        ctx.shadowColor = '#000';
        ctx.shadowBlur = 4;
        ctx.fillText(PoisonHero.getSpecialDescription(player), x, y - 25);
        ctx.shadowBlur = 0;

        // Slots
        for (let i = 0; i < max; i++) {
            const fx = x - 30 + (i * 60);

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
