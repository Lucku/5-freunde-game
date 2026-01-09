class LightningHero {
    static init(player) {
        // Unique Resource: Static Charge
        player.staticCharge = 0;
        player.maxStaticCharge = 100;

        // Hooks
        player.customUpdate = (dx, dy) => LightningHero.update(player, dx, dy);
        player.shoot = (dx, dy) => LightningHero.shoot(player, dx, dy);
        player.customSpecial = () => LightningHero.useUltimate(player);

        // Setup Special UI: STORM SURGE
        // This is the active spacebar ability.
        player.specialName = "STORM";
        // Cooldown: 15 seconds
        player.specialMaxCooldown = 15000;

        const iconEl = document.getElementById('special-icon');
        if (iconEl) iconEl.innerText = "⚡";

        // Override Form Name Logic for Level 10 Transformation
        // This makes the game recognize "FLASH" as the target form.
        player.getFormName = function () {
            return 'FLASH';
        };
    }

    static update(player, dx, dy) {
        // 1. Passive: Moving generates Static Charge
        if (dx !== 0 || dy !== 0) {
            // Charge faster if in Flash form?
            let rate = player.currentForm === 'FLASH' ? 2.0 : 1.0;
            player.staticCharge = Math.min(player.maxStaticCharge, player.staticCharge + rate);
        }

        // 2. FLASH Form Logic (Level 10 Transformation)
        if (player.transformActive) {
            if (player.currentForm !== 'FLASH') {
                player.currentForm = 'FLASH';
            }

            // Auto-fire lightning sparks
            if (Math.random() < 0.3) {
                LightningHero.shoot(player, 0, 0, true);
            }
        }

        // 3. SPECIAL: THUNDER GOD'S WRATH
        if (player.thunderWrath > 0) {
            player.thunderWrath--;
            // Frequency: Every 8 frames (approx 7 strikes per second)
            if (player.thunderWrath % 8 === 0) {
                LightningHero.spawnThunderStrike(player);
            }
        }

        // 4. UI: Draw Charge Bar
        if (typeof ctx !== 'undefined') {
            const barWidth = 40;
            const barHeight = 4;
            const x = player.x - barWidth / 2;
            const y = player.y - 35;

            ctx.fillStyle = '#222';
            ctx.fillRect(x, y, barWidth, barHeight);

            ctx.fillStyle = player.staticCharge >= 100 ? '#fff' : '#ffeb3b';
            ctx.fillRect(x, y, barWidth * (player.staticCharge / player.maxStaticCharge), barHeight);

            if (player.staticCharge >= 100) {
                ctx.strokeStyle = '#00ffff';
                ctx.lineWidth = 1;
                ctx.strokeRect(x - 1, y - 1, barWidth + 2, barHeight + 2);
            }
        }
    }

    static spawnThunderStrike(player) {
        // Find a valid target (random enemy on screen)
        const targets = (typeof enemies !== 'undefined') ? enemies : (window.enemies || []);
        const activeTargets = targets.filter(e =>
            e.hp > 0 &&
            Math.abs(e.x - player.x) < 500 && // Within screen range roughly
            Math.abs(e.y - player.y) < 400
        );

        let tx, ty;
        let targetEnemy = null;

        if (activeTargets.length > 0 && Math.random() < 0.8) {
            // 80% chance to target enemy
            targetEnemy = activeTargets[Math.floor(Math.random() * activeTargets.length)];
            tx = targetEnemy.x;
            ty = targetEnemy.y;
        } else {
            // 20% random ground strike
            tx = player.x + (Math.random() * 800 - 400);
            ty = player.y + (Math.random() * 600 - 300);
        }

        // Damage Area
        const blastRadius = 60;
        const damage = player.stats.rangeDmg * 3; // Heavy Damage

        if (targetEnemy) {
            // Instant Hit logic
            targetEnemy.hp -= damage;
            // Visuals
            if (typeof createExplosion !== 'undefined') createExplosion(tx, ty, '#00ffff', 10);
            if (typeof FloatingText !== 'undefined' && typeof floatingTexts !== 'undefined') {
                floatingTexts.push(new FloatingText(tx, ty - 20, Math.floor(damage), "#00ffff", 24));
            }
        } else {
            // AOE Check (if ground strike hit anyone)
            targets.forEach(e => {
                if (e.hp > 0 && Math.hypot(e.x - tx, e.y - ty) < blastRadius) {
                    e.hp -= damage;
                }
            });
            if (typeof createExplosion !== 'undefined') createExplosion(tx, ty, '#fff', 8);
        }

        // Add Visual Bolt (Purely cosmetic particle for now, or direct draw hook?)
        // Let's use a "Particle" that draws a line for 1 frame
        // Fix: Use an object that duck-types the Particle interface (update/draw)
        if (typeof particles !== 'undefined') {
            particles.push({
                x: tx, y: ty,
                life: 20,
                alpha: 1,
                update: function () { this.alpha -= 0.05; },
                draw: function () {
                    if (typeof ctx === 'undefined') return;
                    ctx.save();
                    ctx.globalAlpha = this.alpha;
                    ctx.strokeStyle = '#fff';
                    ctx.lineWidth = 3;
                    ctx.beginPath();
                    ctx.moveTo(this.x, this.y - 100); // Sky
                    ctx.lineTo(this.x, this.y); // Ground
                    ctx.stroke();
                    ctx.restore();
                }
            });
        }
    }

    static shoot(player, dx, dy, isAuto = false) {
        if (!gameRunning || gamePaused || isLevelingUp || isShopping) return;

        // Input Sanitization for Mouse/Keyboard interaction
        if (dx === undefined || dy === undefined) {
            if (player.aimAngle !== undefined) {
                // Recover direction from Player's calculated aim angle
                dx = Math.cos(player.aimAngle);
                dy = Math.sin(player.aimAngle);
            } else {
                dx = 0; dy = 0;
            }
        }

        const now = Date.now();
        // Cooldown:
        // Increase base cooldown significantly to reduce frequency
        // Base: 1000ms (1 shot/sec) - modified by stats
        let baseCd = 1000; // Increased massively from 400 to nerf OP nature
        if (player.currentForm === 'FLASH') baseCd = 250;

        // Treat rangeCd as a reduction in MS, but clamp to safe minimum
        const cdReduct = player.stats.rangeCd || 0;

        // Safer minimum to prevent overflow
        const finalCd = Math.max(150, baseCd - cdReduct);

        // ENFORCE COOLDOWN
        if (!isAuto && player.lastShotTime && (now - player.lastShotTime < finalCd)) {
            return;
        }

        // Mechanic: "Chain Lightning" if Full Charge, else "Static Spark"
        let isSuper = false;
        if (player.staticCharge >= 100) {
            player.staticCharge = 0;
            isSuper = true; // Unleash the storm
        }

        // Auto-aim / Angle Calculation
        let angle;

        // If explicitly moving or aiming with mouse/stick, prioritize that input direction
        if ((dx !== 0 || dy !== 0) && !isAuto) {
            angle = Math.atan2(dy, dx);
            player.lastFacingAngle = angle;
        }
        // Fallback: If player has an aimAngle set (Mouse cursor position tracked in Player.js)
        else if (player.aimAngle !== undefined && !isAuto) {
            angle = player.aimAngle;
        }
        // If auto-firing (Flash Mode) or no input given, find target
        else {
            let nearest = null;
            let minDist = 400; // Search range
            const targets = (typeof enemies !== 'undefined') ? enemies : (window.enemies || []);

            for (let e of targets) {
                if (e.hp <= 0) continue;
                let d = Math.hypot(e.x - player.x, e.y - player.y);
                if (d < minDist) { minDist = d; nearest = e; }
            }

            if (nearest) {
                angle = Math.atan2(nearest.y - player.y, nearest.x - player.x);
            } else {
                // If no targets nearby, use last known facing direction or random
                angle = (player.lastFacingAngle !== undefined) ? player.lastFacingAngle : Math.random() * Math.PI * 2;
            }
        }

        const speed = 12; // Reduced from 25 to prevent tunneling

        // Projectile Stats
        // NERFED: Reduced base damage and Super multiplier
        const dmgMult = isSuper ? 2.5 : 0.6; // Super is 4x stronger (was 4.0 / 0.8)
        const globalMult = player.damageMultiplier || 1;
        const finalDmg = player.stats.rangeDmg * dmgMult * globalMult;

        // SAFE INSTANTIATION: Check if class exists
        // We ensure the class is defined below BEFORE this method runs in typical usage,
        // but since 'shoot' is called at runtime, the class will be defined by then.

        // CHECK RAILGUN (c18)
        const hasRailgun = (typeof saveData !== 'undefined' && saveData.altar && saveData.altar.active && saveData.altar.active.includes('c18'));

        if (typeof LightningProjectile !== 'undefined') {
            const proj = new LightningProjectile(
                player.x, player.y,
                Math.cos(angle) * speed,
                Math.sin(angle) * speed,
                finalDmg,
                isSuper ? 25 : 10, // Larger Hitbox (10 normal, 25 super)
                isSuper,
                isSuper ? 5 : 2, // Chain Count (Nerfed from 8 -> 5)
                isSuper ? 600 : 350, // Range (Nerfed from 400 -> 350)
                [],
                hasRailgun
            );

            // Robust Push to Global Projectiles
            if (typeof projectiles !== 'undefined') {
                projectiles.push(proj);
            } else if (window.projectiles) {
                window.projectiles.push(proj);
            } else {
                console.error("[L-Hero] 'projectiles' array not found!");
            }

        } else {
            console.error("LightningProjectile class missing!");
        }

        // Feedback
        if (isSuper && typeof createExplosion !== 'undefined') {
            createExplosion(player.x, player.y, '#00ffff', 5);
        }

        if (!isAuto) {
            player.lastShotTime = now;
            currentRunStats.missilesFired++;
        }
    }

    static useUltimate(player) {
        // Special Ability: "THUNDER GOD'S WRATH"
        // Unleashes a storm of random lightning strikes for 5 seconds.

        // 1. Activate Mode
        player.thunderWrath = 300; // 5 seconds (60fps)
        player.invincibleTimer = 60; // Brief I-frame

        // 2. Consume Charge
        player.staticCharge = 0;

        // 3. Visual/Audio
        if (typeof createExplosion !== 'undefined') {
            createExplosion(player.x, player.y, '#ffff00', 15);
        }
        if (typeof showNotification !== 'undefined') showNotification("THUNDER WRATH!");

        // Screen Shake
        if (typeof arena !== 'undefined') {
            // Simple camera shake via activeMutators or manual?
            // Usually camera checks 'currentWeather' or screen shake variables.
            // We'll leave it to the explosions to create impact.
        }
    }

    static getDiff() {
        // Upgrade Weightings
        return {
            DAMAGE: 0.20,
            CHAIN_COUNT: 0.15,
            SPEED: 0.25,
            COOLDOWN: 0.20,
            Health: 0.10,
            Regen: 0.10
        };
    }

    static getSkillNodeDetails(type, val, desc) {
        // Flavor text for upgrades
        if (type === 'CHAIN_COUNT') return { val: 1, desc: "+1 Chain Jump" };
        if (type === 'STATIC_GEN') return { val: 0.1, desc: "+10% Charge Rate" };
        return { val, desc };
    }
}

window.LightningHero = LightningHero;


// ---------------------------------------------------------
// REVISED PROJECTILE CLASS
// ---------------------------------------------------------
class LightningProjectile {
    constructor(x, y, vx, vy, damage, radius, isSuper, chainsLeft, range, ignored = [], canPierce = false) {
        this.x = x;
        this.y = y;
        this.vx = vx;
        this.vy = vy;
        this.damage = damage;
        this.radius = radius;

        this.isSuper = isSuper;
        this.chainsLeft = chainsLeft;
        this.range = range;
        this.ignored = ignored;
        this.canPierce = canPierce;

        this.life = 60;
        this.color = isSuper ? '#00ffff' : '#ffeb3b';

        // Visuals
        this.segments = [];
        this.generateSegments();
    }

    generateSegments() {
        this.segments = [];
        // Generate a jagged line for the current frame
        const steps = 5;
        // Vector along velocity
        const speed = Math.hypot(this.vx, this.vy) || 1;
        const nx = this.vx / speed;
        const ny = this.vy / speed;

        const len = 40;

        for (let i = 0; i < steps; i++) {
            // Move back
            const t = (i + 1) / steps;
            const bx = -nx * (len * t);
            const by = -ny * (len * t);

            // Jitter
            const j = (1 - t) * 10; // Less jitter at tail
            const jA = Math.random() * j - j / 2;
            const jB = Math.random() * j - j / 2;

            this.segments.push({ x: bx + jA, y: by + jB });
        }
    }

    update() {
        this.x += this.vx;
        this.y += this.vy;
        this.life--;
        this.generateSegments();

        // FAILSAFE: Manual Collision Check
        this.checkCollisions();

        // Debug: Log position every 30 frames
        // if (this.life % 30 === 0) console.log(`[L-Proj] Pos: ${Math.floor(this.x)}, ${Math.floor(this.y)}`);
    }

    checkCollisions() {
        // Robust Scope Access
        let targets = [];
        if (typeof enemies !== 'undefined') targets = enemies;
        else if (window.enemies) targets = window.enemies;

        let closestDist = 9999;
        let closestEnemy = null;

        for (const e of targets) {
            if (e.hp <= 0) continue;
            if (this.ignored.includes(e)) continue;

            const dist = Math.hypot(e.x - this.x, e.y - this.y);
            const hitDist = e.radius + this.radius + 25; // Generous

            // Track closest for debug
            if (dist < closestDist) {
                closestDist = dist;
                closestEnemy = e;
            }

            // HIT CHECK
            if (dist < hitDist) {
                // console.log(`[L-Proj] HIT! Dist: ${dist.toFixed(1)} < HitDist: ${hitDist.toFixed(1)}`);
                this.hit(e);
                return;
            }
        }

        // Debug: Log status if very close to *something* but missed
        // if (closestDist < 150 && Math.random() < 0.2) {
        //    console.log(`[L-Proj] Miss. Closest: ${closestDist.toFixed(1)} px. ProjPos: ${Math.floor(this.x)},${Math.floor(this.y)}`);
        // }
    }

    onHit(enemy) {
        // Double-check ignore list (shared with manual check)
        if (this.ignored.includes(enemy)) return 'STOP';

        this.hit(enemy);
        return 'STOP';
    }

    hit(target) {
        // console.log("[L-Proj] Processing HIT Logic on", target);


        // 1. Damage
        let dmg = this.damage;

        // CHECK SUPERCONDUCTOR (c17)
        if (target.frozenTimer > 0 && typeof saveData !== 'undefined' && saveData.altar && saveData.altar.active && saveData.altar.active.includes('c17')) {
            dmg *= 2;
            if (typeof FloatingText !== 'undefined' && typeof floatingTexts !== 'undefined') floatingTexts.push(new FloatingText(target.x, target.y - 60, "CONDUCT", "#00ffff", 16));
        }

        let isCrit = false;

        // Try access globals for Crit
        if (typeof player !== 'undefined' && player.critChance) {
            if (Math.random() < player.critChance) {
                dmg *= 2;
                isCrit = true;
            }
        }

        target.hp -= dmg;
        if (typeof saveData !== 'undefined') saveData.global.totalDamage += dmg;
        if (typeof currentRunStats !== 'undefined') currentRunStats.damageDealt += dmg;

        // 2. Visuals
        if (typeof createExplosion !== 'undefined') {
            createExplosion(target.x, target.y, this.color, 8); // Sparks
        }
        if (typeof FloatingText !== 'undefined' && typeof floatingTexts !== 'undefined') {
            let color = isCrit ? '#ff0000' : '#fff';
            let txt = Math.floor(dmg);
            if (isCrit) txt += "!";
            floatingTexts.push(new FloatingText(target.x, target.y - 20, txt, color, isCrit ? 20 : 14));
        }

        // 3. Status Effects (Stun)
        // Shock/Stun logic
        if (this.isSuper || Math.random() < 0.3) {
            target.frozenTimer = 45; // 0.75s stun
            if (typeof FloatingText !== 'undefined' && typeof floatingTexts !== 'undefined') {
                floatingTexts.push(new FloatingText(target.x, target.y - 40, "SHOCK", "#ffff00", 16));
            }
        }

        // 4. Chain Logic
        if (this.chainsLeft > 0) {
            this.chain(target);
        }

        // Prevent re-hitting this enemy if piercing
        this.ignored.push(target);

        // 5. Remove Self
        if (!this.canPierce) this.kill();
    }

    chain(hitEnemy) {
        // Find next target
        let nextTarget = this.findNextTarget(hitEnemy);
        if (nextTarget) {
            const angle = Math.atan2(nextTarget.y - this.y, nextTarget.x - this.x);
            const speed = 25;

            // Add hitEnemy to ignored list for child
            const newIgnored = [...this.ignored, hitEnemy];

            const nextProj = new LightningProjectile(
                this.x, this.y,
                Math.cos(angle) * speed,
                Math.sin(angle) * speed,
                this.damage * 0.85, // Decay
                this.radius,
                this.isSuper,
                this.chainsLeft - 1,
                this.range,
                newIgnored
            );

            // Robust Push
            if (typeof projectiles !== 'undefined') projectiles.push(nextProj);
            else if (window.projectiles) window.projectiles.push(nextProj);

        }
    }

    findNextTarget(excludeEnemy) {
        let best = null;
        let minDist = 350; // Chain Range
        const targets = (typeof enemies !== 'undefined') ? enemies : (window.enemies || []);

        for (let e of targets) {
            if (e === excludeEnemy || e.hp <= 0 || this.ignored.includes(e)) continue;
            let d = Math.hypot(e.x - this.x, e.y - this.y);
            if (d < minDist) {
                minDist = d;
                best = e;
            }
        }
        return best;
    }

    kill() {
        // Move off screen to let game.js cleanup
        this.x = 999999;
    }

    draw() {
        if (typeof ctx === 'undefined') return;

        ctx.save();
        ctx.translate(this.x, this.y);
        // Rotation removed because segments are already generated in world-space orientation relative to position
        // ctx.rotate(Math.atan2(this.vy, this.vx));

        // Glow
        ctx.shadowBlur = this.isSuper ? 15 : 10;
        ctx.shadowColor = this.color;

        ctx.lineJoin = 'round';
        ctx.lineCap = 'round';

        // Draw Core Bolt
        ctx.strokeStyle = '#fff'; // Inner white hot core
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(0, 0);
        for (let p of this.segments) ctx.lineTo(p.x, p.y);
        ctx.stroke();

        // Draw Outer Glow
        ctx.strokeStyle = this.color;
        ctx.lineWidth = 4;
        ctx.beginPath();
        ctx.moveTo(0, 0);
        for (let p of this.segments) ctx.lineTo(p.x, p.y);
        ctx.stroke();

        ctx.shadowBlur = 0;
        ctx.restore();
    }
}
