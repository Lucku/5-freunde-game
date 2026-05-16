// #194 — explicit renderer imports (was: window-shim lookup).
import { Projectile } from '../../Entities/Projectile.js';

// Mirror Hero Logic
// Color: Marine Blue (#1a5276)
// Mechanic: Mirror Shield (special) — 3s aura that reflects projectiles back at 150% damage,
//           heals 5 HP per blocked projectile, melee hits trigger a point-blank burst.
// Special:  Shatter — slow shard that splits into 6 fragments on impact.

if (typeof BASE_HERO_STATS !== 'undefined') {
    if (!BASE_HERO_STATS['mirror']) {
        BASE_HERO_STATS['mirror'] = {
            color: '#1a5276',
            hp: 75,
            speed: 3.5,
            rangeDmg: 12,
            meleeDmg: 140,
            rangeCd: 30,
            meleeCd: 110,
            projectileSpeed: 9,
            projectileSize: 7,
            knockback: 8,
            shatterFragments: 6,
            shieldDuration: 180 // 3s @ 60fps
        };
    }
}

const MIRROR_UPGRADE_POOL = [
    { id: 'health',          title: 'Tempered Glass',       desc: 'Increase Max HP by 25 and Heal 20%.', icon: '🛡️' },
    { id: 'reflect_dmg',     title: 'Perfect Reflection',   desc: 'Reflected projectile damage +20%.',   icon: '🪞' },
    { id: 'shield_duration', title: 'Resilient Surface',    desc: 'Mirror Shield lasts +1s.',            icon: '⏱️' },
    { id: 'fragments',       title: 'Shatterpoint',         desc: 'Shatter fires +2 fragments.',         icon: '💠' },
    { id: 'speed',           title: 'Light Step',           desc: 'Increase Movement Speed by 10%.',     icon: '🦶' },
    { id: 'damage',          title: 'Sharp Edge',           desc: 'Increase damage by 10%.',             icon: '🔷' },
    { id: 'cooldown',        title: 'Quick Polish',         desc: 'Reduce Cooldowns by 10%.',            icon: '✨' },
    { id: 'crit',            title: 'Blind Spot',           desc: '+5% Crit Chance & +20% Crit Damage.', icon: '🎯' }
];

const MIRROR_PERM_UPGRADES = {
    health:  { name: "Reinforced Frame",   desc: "+5 Starting HP",       baseCost: 1000, costMult: 1.2 },
    greed:   { name: "Glinting Eye",       desc: "+5% Gold Gain",        baseCost: 2000, costMult: 1.3 },
    power:   { name: "Razor Surface",      desc: "+1% Damage",           baseCost: 5000, costMult: 1.4 },
    swift:   { name: "Refraction",         desc: "+1% Speed",            baseCost: 3000, costMult: 1.3 },
    defense: { name: "Layered Glass",      desc: "+1% Damage Reduction", baseCost: 4000, costMult: 1.5 },
    wisdom:  { name: "Studied Reflection", desc: "+2% XP Gain",          baseCost: 2500, costMult: 1.3 }
};

if (typeof window.HERO_LOGIC === 'undefined') window.HERO_LOGIC = {};

window.HERO_LOGIC['mirror'] = {
    upgradePool: MIRROR_UPGRADE_POOL,

    getSkillTreeWeights: function () {
        return {
            'REFLECT_DMG':     0.25,
            'SHIELD_DURATION': 0.20,
            'HEALTH':          0.15,
            'DAMAGE':          0.15,
            'FRAGMENTS':       0.15,
            'SPEED':           0.05,
            'COOLDOWN':        0.05
        };
    },

    getSkillNodeDetails: function (type, value, desc) {
        if (type === 'REFLECT_DMG')     return { val: 0.10, desc: "+10% Reflect Damage" };
        if (type === 'SHIELD_DURATION') return { val: 30,   desc: "+0.5s Shield Duration" };
        if (type === 'FRAGMENTS')       return { val: 1,    desc: "+1 Shatter Fragment" };
        return { val: value, desc: desc };
    },

    applySkillNode: function (base, node) {
        if (node.type === 'REFLECT_DMG') {
            base.reflectDmgMult = (base.reflectDmgMult || 1.5) + node.value;
        }
        if (node.type === 'SHIELD_DURATION') {
            base.shieldDuration = (base.shieldDuration || 180) + node.value;
        }
        if (node.type === 'FRAGMENTS') {
            base.shatterFragments = (base.shatterFragments || 6) + node.value;
        }
    },

    applyUpgrade: function (player, type, world) {
        if (type === 'reflect_dmg') {
            player.reflectDmgMult = (player.reflectDmgMult || 1.5) + 0.2;
            return true;
        }
        if (type === 'shield_duration') {
            player.shieldDuration = (player.shieldDuration || 180) + 60;
            return true;
        }
        if (type === 'fragments') {
            player.shatterFragments = (player.shatterFragments || 6) + 2;
            return true;
        }
        if (type === 'transform') {
            player.transformActive = true;
            player.currentForm = 'REFRACTION';
            player.shieldActive = true;
            player.shieldTimer = 999999; // permanent until damage
            if (typeof createExplosion === 'function') {
                createExplosion(player.x, player.y, '#aed6f1', 60);
                createExplosion(player.x, player.y, '#ffffff', 45);
            }
            if (typeof showNotification === 'function') showNotification("REFRACTION", "#aed6f1");
            if (typeof audioManager !== 'undefined') audioManager.play('shield_activate');
            return true;
        }
        return false;
    },

    init: function (player) {
        const _self = this;

        player.shieldActive    = false;
        player.shieldTimer     = 0;
        player.shieldDuration  = player.stats.shieldDuration || 180;
        player.reflectDmgMult  = 1.5;
        player.shatterFragments = player.stats.shatterFragments || 6;

        player.damageMultiplier = 1.0;
        player.speedMultiplier  = 1.0;

        // Hook shoot for SFX + Shatter visual flair on regular projectiles
        const origShoot = player.shoot.bind(player);
        player.shoot = function () {
            if (typeof audioManager !== 'undefined') {
                const now = Date.now();
                if (!player._lastMirrorAttackSfx || now - player._lastMirrorAttackSfx >= 200) {
                    audioManager.play('attack_mirror');
                    player._lastMirrorAttackSfx = now;
                }
            }
            origShoot();
        };

        player.getFormName = function () { return 'REFRACTION'; };

        // REFRACTION breaks if you take damage (consistent with "lasts until you take a hit")
        // Plate Glass convergence (cv_dod_mir_metal): -30% damage taken while shield active.
        const origTakeDamage = player.takeDamage ? player.takeDamage.bind(player) : null;
        if (origTakeDamage) {
            player.takeDamage = function (amount, ...args) {
                let amt = amount;
                if (typeof amt === 'number' && player.shieldActive) {
                    const _alt = (typeof saveData !== 'undefined' && saveData.altar && saveData.altar.active) ? saveData.altar.active : [];
                    if (_alt.includes('cv_dod_mir_metal')) amt = amt * 0.7;
                }
                const wasRefracting = player.transformActive && player.currentForm === 'REFRACTION';
                const result = origTakeDamage(amt, ...args);
                if (wasRefracting && typeof amount === 'number' && amount > 0) {
                    player.transformActive = false;
                    player.currentForm = 'NONE';
                    player.shieldActive = false;
                    player.shieldTimer = 0;
                    if (typeof showNotification === 'function') showNotification("REFRACTION SHATTERED", "#888");
                    if (typeof createExplosion === 'function') createExplosion(player.x, player.y, '#aed6f1', 40);
                }
                return result;
            };
        }

        player.customSpecial = () => _self.useSpecial(player);
        player.customUpdate = (dx, dy) => { _self.update(player, dx, dy); return false; };

        // Special UI
        player.setupSpecial = function () {
            if (this.isCPU) {
                this.specialName = "SHATTER";
                if (this.shieldActive) this.specialName = "MIRROR SHIELD";
                return;
            }
            const iconEl = document.getElementById('special-icon');
            const container = document.getElementById('special-container');
            this.specialName = this.shieldActive ? "MIRROR SHIELD" : "SHATTER";

            if (iconEl) iconEl.innerText = this.shieldActive ? "🪞" : "💠";

            if (container) {
                const onCd = (this.specialCooldown || 0) > 0;
                if (this.shieldActive) {
                    const pct = (this.shieldTimer / this.shieldDuration) * 100;
                    container.style.background = `linear-gradient(to top, #aed6f1 ${pct}%, rgba(0,0,0,0.5) ${pct}%)`;
                    container.style.borderColor = "#aed6f1";
                    container.style.boxShadow = "0 0 20px #1a5276";
                } else {
                    container.style.background = onCd ? "rgba(0,0,0,0.5)" : "rgba(26, 82, 118, 0.6)";
                    container.style.borderColor = "#1a5276";
                    container.style.boxShadow = onCd ? "none" : "0 0 10px #1a5276";
                }
            }
            if (iconEl) {
                const onCd = (this.specialCooldown || 0) > 0;
                if (onCd && !this.shieldActive) {
                    iconEl.style.filter = "grayscale(1)";
                    iconEl.style.opacity = "0.5";
                } else {
                    iconEl.style.filter = "brightness(1.2) drop-shadow(0 0 8px #aed6f1)";
                    iconEl.style.opacity = "1";
                }
            }
        };

        player.setupSpecial();
    },

    useSpecial: function (player, world) {
        const _w = world ?? window._world;
        const { showNotification } = _w ?? window;

        if ((player.specialCooldown || 0) > 0 && !player.shieldActive) return false;

        if (!player.shieldActive) {
            // Activate Mirror Shield + immediate Shatter shard fire
            player.shieldActive = true;
            player.shieldTimer  = player.shieldDuration;
            if (typeof audioManager !== 'undefined') audioManager.play('shield_activate');
            if (typeof showNotification === 'function') showNotification("MIRROR SHIELD", "#1a5276");

            // Fire Shatter shard
            this._fireShatterShard(player);

            player.specialCooldown = 720; // 12s base
            player.setupSpecial();
            return false; // don't apply default cooldown logic again
        }
        return false;
    },

    _fireShatterShard: function (player) {
        if (typeof projectiles === 'undefined') return;
        const angle = (player.aimAngle !== undefined && player.aimAngle !== null)
            ? player.aimAngle
            : (player._lastAimAngle || 0);
        const speed = 7;
        const dmg = (player.stats.rangeDmg || 12) * 1.2 * (player.damageMultiplier || 1);
        const shard = Projectile.acquire(
            player.x, player.y,
            { x: Math.cos(angle) * speed, y: Math.sin(angle) * speed },
            dmg, '#aed6f1', 9, 'mirror', 0, false
        );
        shard._isShatterShard = true;
        shard._shatterFragments = player.shatterFragments || 6;
        shard._owner = player;
        projectiles.push(shard);
        if (typeof audioManager !== 'undefined') audioManager.play('special_mirror');
    },

    update: function (player, dx, dy, world) {
        const _w = world ?? window._world;
        const { enemies } = _w ?? window;

        // Track aim angle for Shatter
        if (player.aimAngle !== undefined && player.aimAngle !== null) {
            player._lastAimAngle = player.aimAngle;
        }

        // Shield tick
        if (player.shieldActive) {
            player.shieldTimer--;

            // Reflect enemy projectiles within shield radius
            if (typeof projectiles !== 'undefined') {
                const radius = 70;
                projectiles.forEach(p => {
                    if (!p.isEnemy) return;
                    if (p._mirrorReflected) return;
                    const d = Math.hypot(p.x - player.x, p.y - player.y);
                    if (d < radius) {
                        // Flip velocity
                        p.velocity.x = -p.velocity.x;
                        p.velocity.y = -p.velocity.y;
                        p.isEnemy = false;
                        p._mirrorReflected = true;
                        p.damage = (p.damage || 10) * (player.reflectDmgMult || 1.5) * (player.damageMultiplier || 1);
                        p.color = '#aed6f1';
                        p.type = 'mirror';
                        // Hydroflect convergence: reflected projectiles inherit Water's full knockback
                        const _altR = (typeof saveData !== 'undefined' && saveData.altar && saveData.altar.active) ? saveData.altar.active : [];
                        if (_altR.includes('cv_dod_mir_water')) p.knockback = 20;

                        // Heal small amount per reflect
                        if (typeof player.hp === 'number' && typeof player.maxHp === 'number') {
                            player.hp = Math.min(player.maxHp, player.hp + 5);
                        }
                        if (typeof audioManager !== 'undefined') audioManager.play('shield_reflect');
                    }
                });
            }

            // Reflect melee — burst back at nearby enemies that are very close
            if (enemies) {
                enemies.forEach(e => {
                    if (e.hp <= 0) return;
                    const d = Math.hypot(e.x - player.x, e.y - player.y);
                    const contactDist = (e.radius || 20) + (player.radius || 18) + 4;
                    if (d < contactDist && !e._mirrorBurstTick) {
                        e._mirrorBurstTick = 30; // throttle
                        const dmg = (player.stats.meleeDmg || 140) * 0.8 * (player.damageMultiplier || 1);
                        e.hp -= dmg;
                        const ang = Math.atan2(e.y - player.y, e.x - player.x);
                        e.x += Math.cos(ang) * 30;
                        e.y += Math.sin(ang) * 30;
                        if (typeof createExplosion === 'function') createExplosion(e.x, e.y, '#aed6f1', 12);
                        if (e.hp <= 0 && typeof player.onKill === 'function') player.onKill(e);
                    }
                });
            }

            if (player.shieldTimer <= 0) {
                player.shieldActive = false;
                player.shieldTimer = 0;
                if (typeof showNotification === 'function') showNotification("SHIELD BROKEN", "#888");
                if (typeof player.setupSpecial === 'function') player.setupSpecial();
            }
        }

        // Tick mirror burst throttle
        if (enemies) {
            enemies.forEach(e => {
                if (e._mirrorBurstTick && e._mirrorBurstTick > 0) e._mirrorBurstTick--;
            });
        }

        // Process Shatter shard impacts
        if (typeof projectiles !== 'undefined' && enemies) {
            for (let i = projectiles.length - 1; i >= 0; i--) {
                const p = projectiles[i];
                if (!p._isShatterShard || p._isEnemy) continue;
                let exploded = false;
                // Check enemy hit
                for (const e of enemies) {
                    if (e.hp <= 0) continue;
                    if (Math.hypot(e.x - p.x, e.y - p.y) < (e.radius || 20) + p.radius) {
                        exploded = true; break;
                    }
                }
                if (exploded) {
                    this._spawnShatterFragments(p);
                    if (typeof Projectile !== 'undefined') Projectile.release(p); // #20 P3
                    projectiles.splice(i, 1);
                }
            }
        }

        // REFRACTION Ultimate — extra orbiting mirror panels
        if (player.transformActive && player.currentForm === 'REFRACTION' && window.ctx) {
            const ctx = window.ctx;
            const t = (typeof frame !== 'undefined' ? frame : Date.now() * 0.06);
            ctx.save();
            ctx.translate(player.x, player.y);
            const panels = 4;
            const orbitR = 70;
            for (let i = 0; i < panels; i++) {
                const a = (i / panels) * Math.PI * 2 + t * 0.05;
                const px = Math.cos(a) * orbitR;
                const py = Math.sin(a) * orbitR;
                ctx.save();
                ctx.translate(px, py);
                ctx.rotate(a + Math.PI / 2);
                // Mirror panel rectangle
                ctx.fillStyle = `rgba(174, 214, 241, ${0.55 + Math.sin(t * 0.2 + i) * 0.15})`;
                ctx.shadowColor = '#1a5276';
                ctx.shadowBlur = 12;
                ctx.fillRect(-12, -3, 24, 6);
                ctx.strokeStyle = '#ffffff';
                ctx.lineWidth = 1;
                ctx.strokeRect(-12, -3, 24, 6);
                ctx.restore();
            }
            ctx.restore();
        }

        // Draw shield aura
        if (player.shieldActive && window.ctx) {
            const ctx = window.ctx;
            const t = (typeof frame !== 'undefined' ? frame : Date.now() * 0.06);
            ctx.save();
            ctx.translate(player.x, player.y);
            // Hexagonal mirror panels rotating
            const sides = 6;
            const r = 40;
            ctx.rotate(t * 0.04);
            ctx.strokeStyle = '#aed6f1';
            ctx.shadowColor = '#1a5276';
            ctx.shadowBlur = 14;
            ctx.lineWidth = 2.5;
            ctx.beginPath();
            for (let i = 0; i <= sides; i++) {
                const a = (i / sides) * Math.PI * 2;
                const x = Math.cos(a) * r;
                const y = Math.sin(a) * r;
                if (i === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
            }
            ctx.stroke();
            // Inner flash
            ctx.fillStyle = `rgba(174, 214, 241, ${0.08 + Math.sin(t * 0.2) * 0.04})`;
            ctx.beginPath();
            ctx.arc(0, 0, r - 4, 0, Math.PI * 2);
            ctx.fill();
            ctx.restore();
        }
    },

    _spawnShatterFragments: function (shard) {
        if (typeof projectiles === 'undefined') return;
        const count = shard._shatterFragments || 6;
        const baseDmg = shard.damage * 0.6;
        for (let i = 0; i < count; i++) {
            const a = (Math.PI * 2 / count) * i;
            const v = 8;
            const frag = Projectile.acquire(shard.x, shard.y,
                { x: Math.cos(a) * v, y: Math.sin(a) * v },
                baseDmg, '#aed6f1', 5, 'mirror', shard.knockback || 0, false);
            frag.life = 60;
            projectiles.push(frag);
        }
        if (typeof createExplosion === 'function') {
            createExplosion(shard.x, shard.y, '#aed6f1', 25);
            createExplosion(shard.x, shard.y, '#ffffff', 15);
        }
    }
};
