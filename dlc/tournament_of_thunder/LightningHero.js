// Explicit renderer imports (was: window-shim lookup).
import { FloatingText } from '../../Entities/FloatingText.js';
import { Projectile } from '../../Entities/Projectile.js';

// `projectiles.push(new LightningProjectile(...))` is a no-op on the
// post-ECS proxy sentinel (same root cause as the Spirit fix in the
// 2026-05-21 changelog). Spawn through `Projectile.acquire` so the slot
// actually lands in `runState.projectile*` and the engine collision pass
// + drawProjectiles pick it up. The class-shaped logic (segment jitter,
// chain spawn, hit handling) is preserved via free functions invoked from
// the slot's `update` / `draw` / `onHit` override hooks; underscore
// extras (`_isSuper`, `_chainsLeft`, ...) route through `projectileExtras`
// via the slot proxy's `_*` trap.
function _spawnLightningProjectile(args) {
    const { x, y, vx, vy, damage, radius, isSuper, chainsLeft, range, ignored = [], canPierce = false } = args;
    const color = isSuper ? '#00ffff' : '#ffeb3b';
    const p = Projectile.acquire(
        x, y,
        { x: vx, y: vy },
        damage,
        color,
        radius,
        'LIGHTNING',
        0,
        false,
        false,
        false
    );
    if (!p || (typeof p._slotIdx === 'function' && p._slotIdx() < 0)) return null;
    p.life = 60;
    p._isSuper = isSuper;
    p._chainsLeft = chainsLeft;
    p._range = range;
    p._ignored = ignored;
    p._canPierce = canPierce;
    p._color = color;
    p._segments = [];
    p._world = (typeof window !== 'undefined') ? window._world : null;
    _lightningGenerateSegments(p);
    p.update = function () { _lightningUpdate(this); };
    p.draw   = function () { _lightningDraw(this); };
    p.onHit  = function (enemy) { return _lightningOnHit(this, enemy); };
    return p;
}

function _lightningGenerateSegments(p) {
    const segs = [];
    const vx = p.velocity.x, vy = p.velocity.y;
    const speed = Math.hypot(vx, vy) || 1;
    const nx = vx / speed;
    const ny = vy / speed;
    const len = 40;
    const steps = 5;
    for (let i = 0; i < steps; i++) {
        const t = (i + 1) / steps;
        const bx = -nx * (len * t);
        const by = -ny * (len * t);
        const j = (1 - t) * 10;
        const jA = Math.random() * j - j / 2;
        const jB = Math.random() * j - j / 2;
        segs.push({ x: bx + jA, y: by + jB });
    }
    p._segments = segs;
}

function _lightningUpdate(p) {
    p.x += p.velocity.x;
    p.y += p.velocity.y;
    const l = p.life;
    if (l !== null) p.life = l - 1;
    _lightningGenerateSegments(p);
}

function _lightningOnHit(p, enemy) {
    const ignored = p._ignored || [];
    if (ignored.includes(enemy)) return 'STOP';
    _lightningHit(p, enemy);
    return 'STOP';
}

function _lightningHit(p, target) {
    let dmg = p.damage;
    const color = p._color || '#ffeb3b';

    // Superconductor (c17): 2× damage on frozen targets
    if (target.frozenTimer > 0 && typeof saveData !== 'undefined' && saveData.altar && saveData.altar.active && saveData.altar.active.includes('c17')) {
        dmg *= 2;
        if (typeof floatingTexts !== 'undefined') floatingTexts.push(FloatingText.acquire(target.x, target.y - 60, 'CONDUCT', '#00ffff', 16));
    }

    let isCrit = false;
    const owner = p.owner;
    if (owner && owner.critChance && Math.random() < owner.critChance) {
        dmg *= 2;
        isCrit = true;
    }

    target.hp -= dmg;
    if (typeof saveData !== 'undefined') saveData.global.totalDamage += dmg;
    if (typeof currentRunStats !== 'undefined') currentRunStats.damageDealt += dmg;

    if (typeof createExplosion !== 'undefined') {
        createExplosion(target.x, target.y, color, 8);
    }
    if (typeof floatingTexts !== 'undefined') {
        const tc = isCrit ? '#ff0000' : '#fff';
        let txt = Math.floor(dmg);
        if (isCrit) txt += '!';
        floatingTexts.push(FloatingText.acquire(target.x, target.y - 20, txt, tc, isCrit ? 20 : 14));
    }

    // Shock / stun
    if (p._isSuper || Math.random() < 0.3) {
        target.frozenTimer = 45;
        if (typeof floatingTexts !== 'undefined') {
            floatingTexts.push(FloatingText.acquire(target.x, target.y - 40, 'SHOCK', '#ffff00', 16));
        }
    }

    // Chain
    if ((p._chainsLeft || 0) > 0) {
        _lightningChain(p, target);
    }

    // Mark ignored so we don't re-hit
    const ig = p._ignored || [];
    ig.push(target);
    p._ignored = ig;

    if (!p._canPierce) p.life = 0;
}

function _lightningChain(p, hitEnemy) {
    const next = _lightningFindNextTarget(p, hitEnemy);
    if (!next) return;
    if (typeof audioManager !== 'undefined') audioManager.playAttack('lightning', p._isSuper);
    const angle = Math.atan2(next.y - p.y, next.x - p.x);
    const speed = 25;
    const newIgnored = [...(p._ignored || []), hitEnemy];
    const child = _spawnLightningProjectile({
        x: p.x, y: p.y,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        damage: p.damage * 0.85,
        radius: p.radius,
        isSuper: p._isSuper,
        chainsLeft: (p._chainsLeft || 0) - 1,
        range: p._range,
        ignored: newIgnored,
        canPierce: p._canPierce
    });
    if (child && p.owner) child.owner = p.owner;
    if (typeof saveData !== 'undefined') {
        saveData.global.lightning_chain_5_count = (saveData.global.lightning_chain_5_count || 0) + 1;
    }
}

function _lightningFindNextTarget(p, excludeEnemy) {
    const world = p._world || (typeof window !== 'undefined' ? window._world : null);
    const targets = (world && world.enemies) || (typeof window !== 'undefined' ? window.enemies : null) || [];
    const ignored = p._ignored || [];
    let best = null;
    let minDist = 350;
    for (const e of targets) {
        if (e === excludeEnemy || e.hp <= 0 || ignored.includes(e)) continue;
        const d = Math.hypot(e.x - p.x, e.y - p.y);
        if (d < minDist) { minDist = d; best = e; }
    }
    return best;
}

function _lightningDraw(p) {
    if (typeof ctx === 'undefined') return;
    const color = p._color || '#ffeb3b';
    const segs = p._segments || [];
    ctx.save();
    ctx.translate(p.x, p.y);
    ctx.shadowBlur = p._isSuper ? 15 : 10;
    ctx.shadowColor = color;
    ctx.lineJoin = 'round';
    ctx.lineCap = 'round';
    // Core bolt
    ctx.strokeStyle = '#fff';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(0, 0);
    for (const s of segs) ctx.lineTo(s.x, s.y);
    ctx.stroke();
    // Outer glow
    ctx.strokeStyle = color;
    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.moveTo(0, 0);
    for (const s of segs) ctx.lineTo(s.x, s.y);
    ctx.stroke();
    ctx.shadowBlur = 0;
    ctx.restore();
}

class LightningHero {
    static init(player) {
        // Unique Resource: Static Charge
        player.staticCharge = 0;
        player.maxStaticCharge = 100;

        // Hooks
        player.customUpdate = (dx, dy, world) => LightningHero.update(player, dx, dy, world);
        player.shoot = (dx, dy, world) => LightningHero.shoot(player, dx, dy, false, world);
        player.customSpecial = (world) => LightningHero.useSpecial(player, world);

        // Setup Special UI: STORM SURGE
        // This is the active spacebar ability.
        player.specialName = "STORM";
        // Cooldown: 15 seconds (900 frames @ 60 fps)
        player.specialMaxCooldown = 900;

        if (!player.isCPU) {
            const iconEl = document.getElementById('special-icon');
            if (iconEl) iconEl.innerText = "⚡";
        }

        // Override Form Name Logic for Level 10 Transformation
        // This makes the game recognize "FLASH" as the target form.
        player.getFormName = function () {
            return 'FLASH';
        };
    }

    static update(player, dx, dy, world) {
        const _w = world ?? window._world;
        const { showNotification, audioManager } = _w ?? {};
        // 1. Passive: Moving generates Static Charge
        if (dx !== 0 || dy !== 0) {
            // Charge faster if in Flash form?
            let rate = player.currentForm === 'FLASH' ? 3.0 : 1.0;
            if (player.stats && player.stats.staticGenMult) rate *= player.stats.staticGenMult;
            player.staticCharge = Math.min(player.maxStaticCharge, player.staticCharge + rate);
        }

        // 2. FLASH Form Logic (Level 10 Transformation)
        if (player.transformActive) {
            if (player.currentForm !== 'FLASH') player.currentForm = 'FLASH';
            player.flashTimer = (player.flashTimer || 0) - 1;
            player.speedMultiplier = Math.max(player.speedMultiplier || 1, 1.6);

            // Omni-burst when charge fills
            if (player.staticCharge >= 100) {
                player.staticCharge = 0;
                LightningHero.fireFlashOmniBurst(player, _w);
            }

            // Auto-fire lightning sparks
            if (Math.random() < 0.15) {
                LightningHero.shoot(player, 0, 0, true, _w);
            }

            if (player.flashTimer <= 0) {
                player.transformActive = false;
                if (typeof showNotification === 'function') showNotification("DISCHARGE COMPLETE", "#00ffff");
            }
        }

        // 3. SPECIAL: THUNDER GOD'S WRATH
        if (player.thunderWrath > 0) {
            player.thunderWrath--;
            // Frequency: Every 8 frames (approx 7 strikes per second)
            if (player.thunderWrath % 8 === 0) {
                LightningHero.spawnThunderStrike(player, _w);
            }
            // Stop loop when finished
            if (player.thunderWrath === 0) {
                if (typeof audioManager !== 'undefined') audioManager.stopLoop('special_lightning');
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

    static spawnThunderStrike(player, world) {
        const _w = world ?? window._world;
        const { enemies, createExplosion, floatingTexts, particles } = _w ?? {};
        // Find a valid target (random enemy on screen)
        const targets = enemies ?? [];
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
                floatingTexts.push(FloatingText.acquire(tx, ty - 20, Math.floor(damage), "#00ffff", 24));
            }
        } else {
            // AOE Check (if ground strike hit anyone). : route secondary
            // hits through applyDamage; noFloatText keeps the ground-strike
            // visuals readable (explosion + bolt convey the hit).
            const ad = (typeof window !== 'undefined' && window.applyDamage) ? window.applyDamage : null;
            targets.forEach(e => {
                if (e.hp > 0 && Math.hypot(e.x - tx, e.y - ty) < blastRadius) {
                    if (ad) ad(e, damage, { label: 'Lightning AOE', color: '#00ffff', noFloatText: true, sfx: null });
                    else e.hp -= damage;
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

    static shoot(player, dx, dy, isAuto = false, world) {
        const _w = world ?? window._world;
        const { saveData, audioManager, enemies, projectiles, createExplosion } = _w ?? {};
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
        let baseCd = 1000;
        if (player.currentForm === 'FLASH') baseCd = 400; // Slower auto-fire (was 250)

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
            if (typeof saveData !== 'undefined') {
                saveData.global.lightning_max_charges = (saveData.global.lightning_max_charges || 0) + 1;
            }
        }

        // Play Sound
        if (typeof audioManager !== 'undefined') {
            audioManager.playAttack('lightning', isSuper);
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
            const targets = enemies ?? [];

            for (const e of targets) {
                if (e.hp <= 0) continue;
                const d = Math.hypot(e.x - player.x, e.y - player.y);
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

        // CHAIN BONUS (Skill Tree)
        const chainBonus = (player.stats && player.stats.chainCount) ? player.stats.chainCount : 0;
        const chainCount = (isSuper ? 5 : 2) + chainBonus;

        const _spawn = (vx, vy, dmg) => {
            const proj = _spawnLightningProjectile({
                x: player.x, y: player.y,
                vx, vy,
                damage: dmg,
                radius: isSuper ? 25 : 10,
                isSuper,
                chainsLeft: chainCount,
                range: isSuper ? 600 : 350,
                ignored: [],
                canPierce: hasRailgun
            });
            if (proj) proj.owner = player;
            return proj;
        };

        // 1. Main Projectile
        _spawn(Math.cos(angle) * speed, Math.sin(angle) * speed, finalDmg);

        // 2. Buff Multi-Shot (Powerup)
        if (player.buffs && player.buffs.multi > 0) {
            const offsets = [-0.25, 0.25];
            offsets.forEach(offset => {
                const a = angle + offset;
                _spawn(Math.cos(a) * speed, Math.sin(a) * speed, finalDmg);
            });
        }

        // Multi-Shot (extraProjectiles from upgrades)
        if (player.extraProjectiles > 0) {
            const multiShotDmg = finalDmg;
            for (let i = 1; i <= player.extraProjectiles; i++) {
                const spreadAngle = (Math.random() - 0.5) * 0.3;
                _spawn(Math.cos(angle + spreadAngle) * speed, Math.sin(angle + spreadAngle) * speed, multiShotDmg);
            }
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

    static useSpecial(player, world) {
        const _w = world ?? window._world;
        const { saveData, createExplosion, showNotification, audioManager, arena } = _w ?? {};
        // Special Ability: "THUNDER GOD'S WRATH"
        // Unleashes a storm of random lightning strikes for 5 seconds.

        // 1. Activate Mode
        player.thunderWrath = 300; // 5 seconds (60fps)
        player.invincibleTimer = 60; // Brief I-frame
        if (typeof saveData !== 'undefined') {
            saveData.global.lightning_storm_count = (saveData.global.lightning_storm_count || 0) + 1;
        }

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

            // Start Audio Loop
            if (typeof audioManager !== 'undefined') audioManager.startLoop('special_lightning');
            // Usually camera checks 'currentWeather' or screen shake variables.
            // We'll leave it to the explosions to create impact.
        }

        // Return truthy so Player.use() applies the standard special cooldown;
        // without this the STORM special has no cooldown and recasts every frame.
        return true;
    }

    static getSkillTreeWeights() {
        // Upgrade Weightings
        return {
            DAMAGE: 0.20,
            CHAIN_COUNT: 0.15,
            SPEED: 0.25,
            COOLDOWN: 0.20,
            HEALTH: 0.10,
            STATIC_GEN: 0.10
        };
    }

    static getSkillNodeDetails(type, val, desc) {
        // Flavor text for upgrades
        if (type === 'CHAIN_COUNT') return { val: 1, desc: "+1 Chain Jump" };
        if (type === 'STATIC_GEN') return { val: 0.1, desc: "+10% Charge Rate" };
        return { val, desc };
    }

    static applySkillNode(base, node) {
        if (node.type === 'CHAIN_COUNT') {
            base.chainCount = (base.chainCount || 0) + node.value;
        }
        if (node.type === 'STATIC_GEN') {
            base.staticGenMult = (base.staticGenMult || 1) + node.value;
        }
    }

    static applyUpgrade(player, type, world) {
        const _w = world ?? window._world;
        const { createExplosion, showNotification } = _w ?? {};
        if (type === 'transform') {
            player.transformActive = true;
            player.currentForm = 'FLASH';
            player.flashTimer = 600;
            player.staticCharge = 100;
            LightningHero.fireFlashOmniBurst(player, _w);
            if (createExplosion) createExplosion(player.x, player.y, '#00ffff', 50);
            if (showNotification) showNotification("ABSOLUTE DISCHARGE!", "#00ffff");
            return true;
        }
        return false;
    }

    static fireFlashOmniBurst(player, world) {
        const _w = world ?? window._world;
        const { createExplosion } = _w ?? {};
        const speed = 12;
        for (let i = 0; i < 8; i++) {
            const a = (i / 8) * Math.PI * 2;
            const dmg = (player.stats.rangeDmg || 15) * 2.5 * (player.damageMultiplier || 1);
            const proj = _spawnLightningProjectile({
                x: player.x, y: player.y,
                vx: Math.cos(a) * speed,
                vy: Math.sin(a) * speed,
                damage: dmg,
                radius: 20,
                isSuper: true,
                chainsLeft: 5,
                range: 600,
                ignored: [],
                canPierce: false
            });
            if (proj) proj.owner = player;
        }
        if (createExplosion) createExplosion(player.x, player.y, '#00ffff', 30);
    }
}

window.LightningHero = LightningHero;

if (typeof window.HERO_LOGIC === 'undefined') window.HERO_LOGIC = {};
if (!window.HERO_LOGIC['lightning']) window.HERO_LOGIC['lightning'] = {};
window.HERO_LOGIC['lightning'].applyUpgrade = LightningHero.applyUpgrade.bind(LightningHero);

// Legacy `class LightningProjectile` removed — every spawn site now routes
// through `_spawnLightningProjectile` (defined at top of file). Slots are
// allocated via `Projectile.acquire`, lifecycle/visuals live in the
// `_lightning*` free functions, and chain spawns recurse through the same
// helper. Plain-object `projectiles.push` would be a no-op on the ECS proxy.
