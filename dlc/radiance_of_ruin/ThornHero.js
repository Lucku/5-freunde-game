// Thorn Hero Logic — Radiance of Ruin
// Color: Vine-Red (#8b1a1a)
// Mechanic: Blood Bond — every attack costs HP (floor 1). Lifebloom heals on kill,
//           extra HP per Bleed stack on dying enemies.
// Special:  Crimson Garden — plant a Blood Rose pulsing Bleed in 250px for 8s. Costs 20 HP.
// Ultimate: The Reckoning — drop to 1 HP, erupt vines arena-wide for 5s.

if (typeof BASE_HERO_STATS !== 'undefined') {
    if (!BASE_HERO_STATS['thorn']) {
        BASE_HERO_STATS['thorn'] = {
            color: '#8b1a1a',
            hp: 65,
            speed: 4.0,
            rangeDmg: 28,
            meleeDmg: 130,
            rangeCd: 12,
            meleeCd: 100,
            projectileSpeed: 12,
            projectileSize: 6,
            knockback: 6,
            bleedDpsPerStack: 4,
            bleedDurationFrames: 360, // 6s @60
            maxBleedStacks: 5
        };
    }
}

const THORN_UPGRADE_POOL = [
    { id: 'health',         title: 'Hardy Stalk',     desc: 'Increase Max HP by 25 and Heal 20%.',         icon: '🌹' },
    { id: 'bleed_dmg',      title: 'Open Wound',      desc: 'Bleed DPS +25%.',                              icon: '💧' },
    { id: 'lifebloom',      title: 'Crimson Harvest', desc: '+3 HP base on kill, +2 HP per Bleed stack.',   icon: '♻️' },
    { id: 'cost_reduction', title: 'Hardened Veins',  desc: 'Attack HP costs -1 (min 1).',                 icon: '🩸' },
    { id: 'bleed_stacks',   title: 'Lacerate',        desc: 'Max Bleed stacks +2.',                         icon: '🌿' },
    { id: 'garden',         title: 'Eternal Bloom',   desc: 'Crimson Garden duration +3s, radius +50px.',   icon: '🌷' },
    { id: 'damage',         title: 'Sharpened Thorn', desc: 'Damage +10%.',                                 icon: '🌵' },
    { id: 'crit',           title: 'Vein Strike',     desc: '+5% Crit Chance & +20% Crit Damage.',          icon: '🎯' }
];

const THORN_PERM_UPGRADES = {
    health:  { name: "Deep Roots",       desc: "+5 Starting HP",       baseCost: 1000, costMult: 1.2 },
    greed:   { name: "Carrion Profits",  desc: "+5% Gold Gain",        baseCost: 2000, costMult: 1.3 },
    power:   { name: "Barbed Edge",      desc: "+1% Damage",           baseCost: 5000, costMult: 1.4 },
    swift:   { name: "Tendril Step",     desc: "+1% Speed",            baseCost: 3000, costMult: 1.3 },
    defense: { name: "Bark Skin",        desc: "+1% Damage Reduction", baseCost: 4000, costMult: 1.5 },
    wisdom:  { name: "Garden Memory",    desc: "+2% XP Gain",          baseCost: 2500, costMult: 1.3 }
};

if (typeof window.HERO_LOGIC === 'undefined') window.HERO_LOGIC = {};

window.HERO_LOGIC['thorn'] = {
    upgradePool: THORN_UPGRADE_POOL,

    getSkillTreeWeights: function () {
        return {
            'BLEED_DMG':       0.20,
            'LIFEBLOOM':       0.20,
            'GARDEN':          0.15,
            'COST_REDUCTION':  0.15,
            'DAMAGE':          0.10,
            'BLEED_STACKS':    0.10,
            'HEALTH':          0.05,
            'CRIT':            0.05
        };
    },

    getSkillNodeDetails: function (type, value, desc) {
        if (type === 'BLEED_DMG')       return { val: 0.10, desc: "+10% Bleed DPS" };
        if (type === 'LIFEBLOOM')       return { val: 1,    desc: "+1 HP per kill" };
        if (type === 'GARDEN')          return { val: 30,   desc: "+0.5s Garden Duration" };
        if (type === 'COST_REDUCTION')  return { val: 1,    desc: "-1 Attack HP cost (min 1)" };
        if (type === 'BLEED_STACKS')    return { val: 1,    desc: "+1 Max Bleed Stack" };
        return { val: value, desc: desc };
    },

    applySkillNode: function (base, node) {
        if (node.type === 'BLEED_DMG')      base.bleedDmgMult = (base.bleedDmgMult || 1) * (1 + node.value);
        if (node.type === 'LIFEBLOOM')      base.lifebloomBase = (base.lifebloomBase || 5) + node.value;
        if (node.type === 'GARDEN')         base.gardenDurationBonus = (base.gardenDurationBonus || 0) + node.value;
        if (node.type === 'COST_REDUCTION') base.attackCostReduction = (base.attackCostReduction || 0) + node.value;
        if (node.type === 'BLEED_STACKS')   base.maxBleedStacks = (base.maxBleedStacks || 5) + node.value;
    },

    applyUpgrade: function (player, type, world) {
        if (type === 'bleed_dmg') {
            player.bleedDmgMult = (player.bleedDmgMult || 1) * 1.25;
            return true;
        }
        if (type === 'lifebloom') {
            player.lifebloomBase = (player.lifebloomBase || 5) + 3;
            player.lifebloomPerStack = (player.lifebloomPerStack || 3) + 2;
            return true;
        }
        if (type === 'cost_reduction') {
            player.attackCostReduction = (player.attackCostReduction || 0) + 1;
            return true;
        }
        if (type === 'bleed_stacks') {
            player.maxBleedStacks = (player.maxBleedStacks || 5) + 2;
            return true;
        }
        if (type === 'garden') {
            player.gardenDurationBonus = (player.gardenDurationBonus || 0) + 180; // +3s
            player.gardenRadiusBonus   = (player.gardenRadiusBonus || 0) + 50;
            return true;
        }
        if (type === 'transform') {
            window.HERO_LOGIC['thorn']._unleashReckoning(player);
            return true;
        }
        return false;
    },

    init: function (player) {
        const _self = this;

        player.bleedDpsPerStack    = player.stats.bleedDpsPerStack || 4;
        player.bleedDurationFrames = player.stats.bleedDurationFrames || 360;
        player.maxBleedStacks      = player.stats.maxBleedStacks || 5;
        player.bleedDmgMult        = player.stats.bleedDmgMult || 1;
        player.attackCostReduction = player.stats.attackCostReduction || 0;
        player.lifebloomBase       = player.stats.lifebloomBase || 5;
        player.lifebloomPerStack   = player.stats.lifebloomPerStack || 3;
        player.gardenDurationBonus = player.stats.gardenDurationBonus || 0;
        player.gardenRadiusBonus   = player.stats.gardenRadiusBonus || 0;

        player.bloodRose           = null; // { x, y, life, radius }

        player.damageMultiplier = 1.0;
        player.speedMultiplier  = 1.0;

        player.reckoningActive       = false;
        player.reckoningTimer        = 0;
        player.reckoningDamagePool   = 0; // hpSpent * 1.5

        // Helper — safe self-damage flooring at 1
        const _selfCost = (raw) => Math.max(1, raw - (player.attackCostReduction || 0));
        const _bleed = (e, src) => {
            if (!e || e.hp <= 0) return;
            e._thornBleedStacks   = Math.min(player.maxBleedStacks, (e._thornBleedStacks || 0) + 1);
            e._thornBleedTimer    = player.bleedDurationFrames;
            e._thornBleedOwner    = player;
            // Counter for achievement
            if (typeof saveData !== 'undefined' && saveData.global) {
                saveData.global.thorn_bleed_applied = (saveData.global.thorn_bleed_applied || 0) + 1;
            }
        };
        player._thornApplyBleed = _bleed;

        // Hook shoot — Volley costs 3 HP (3 thorns each apply Bleed on hit, low dmg)
        const origShoot = player.shoot.bind(player);
        player.shoot = function () {
            const cost = _selfCost(3);
            // Drop to 1 floor, never below
            if (player.hp > 1) player.hp = Math.max(1, player.hp - cost);
            if (typeof audioManager !== 'undefined') {
                const now = Date.now();
                if (!player._lastThornAttackSfx || now - player._lastThornAttackSfx >= 200) {
                    audioManager.play('attack_thorn');
                    player._lastThornAttackSfx = now;
                }
            }
            const initialLen = typeof projectiles !== 'undefined' ? projectiles.length : 0;
            origShoot();
            const finalLen = typeof projectiles !== 'undefined' ? projectiles.length : 0;
            // Mark thorn projectiles so collision can apply Bleed
            for (let i = initialLen; i < finalLen; i++) {
                if (projectiles[i]) projectiles[i]._thornBleed = true;
            }
        };

        // Hook melee — Briar Lash costs 3 HP, applies Bleed
        const origMelee = player.melee ? player.melee.bind(player) : null;
        if (origMelee) {
            player.melee = function (...args) {
                const cost = _selfCost(3);
                if (player.hp > 1) player.hp = Math.max(1, player.hp - cost);
                if (typeof audioManager !== 'undefined') audioManager.play('melee_thorn');
                // Apply Bleed to nearby enemies on swing
                const _w = window._world ?? window;
                if (_w.enemies) {
                    _w.enemies.forEach(e => {
                        if (e.hp <= 0) return;
                        if (Math.hypot(e.x - player.x, e.y - player.y) < (player.meleeRange || 110)) {
                            _bleed(e, player);
                        }
                    });
                }
                origMelee(...args);
            };
        }

        // Hook dash for SFX
        const origDash = player.dash.bind(player);
        player.dash = function (...args) {
            const before = player.isDashing;
            origDash(...args);
            if (!before && player.isDashing && typeof audioManager !== 'undefined') {
                audioManager.play('dash_thorn');
            }
        };

        // Hook onKill — Lifebloom: base + per-stack heal
        const origOnKill = player.onKill ? player.onKill.bind(player) : () => {};
        player.onKill = function (enemy) {
            origOnKill(enemy);
            const stacks = enemy._thornBleedStacks || 0;
            const heal = (player.lifebloomBase || 5) + stacks * (player.lifebloomPerStack || 3);
            player.hp = Math.min(player.maxHp || player.hp + heal, player.hp + heal);
            if (typeof audioManager !== 'undefined' && stacks > 0) audioManager.play('lifebloom_heal');
            // Reckoning kill refund
            if (player.reckoningActive) {
                player.hp = Math.min(player.maxHp, player.hp + 10);
            }
        };

        // Projectile-impact bleed application: lazy install Enemy.takeDamage wrap
        if (!window._thornBleedInstalled && typeof Enemy !== 'undefined' && Enemy.prototype && Enemy.prototype.takeDamage) {
            const origET = Enemy.prototype.takeDamage;
            Enemy.prototype.takeDamage = function (amount, sourceProjectile, ...args) {
                const result = origET.call(this, amount, sourceProjectile, ...args);
                if (sourceProjectile && sourceProjectile._thornBleed && this.hp > 0 && window.player && window.player.type === 'thorn') {
                    window.player._thornApplyBleed(this, window.player);
                }
                return result;
            };
            window._thornBleedInstalled = true;
        }

        player.getFormName = function () { return 'THE RECKONING'; };

        player.customSpecial = () => _self.useSpecial(player);
        player.customUpdate  = (dx, dy) => { _self.update(player, dx, dy); return false; };

        // Special UI — Crimson Garden
        player.setupSpecial = function () {
            if (this.isCPU) { this.specialName = "CRIMSON GARDEN"; return; }
            const iconEl    = document.getElementById('special-icon');
            const container = document.getElementById('special-container');
            this.specialName = "CRIMSON GARDEN";
            if (iconEl) iconEl.innerText = "🌹";

            if (container) {
                const onCd = (this.specialCooldown || 0) > 0;
                const color = this.bloodRose ? "#ffffff" : "#8b1a1a";
                container.style.background = onCd ? "rgba(0,0,0,0.5)" : "rgba(139, 26, 26, 0.65)";
                container.style.borderColor = color;
                container.style.boxShadow = onCd ? "none" : `0 0 12px ${color}`;
            }
            if (iconEl) {
                const onCd = (this.specialCooldown || 0) > 0;
                iconEl.style.filter  = onCd ? "grayscale(1)" : "brightness(1.2) drop-shadow(0 0 6px #c0392b)";
                iconEl.style.opacity = onCd ? "0.5" : "1";
            }
        };

        player.setupSpecial();
    },

    _unleashReckoning: function (player) {
        if (player.reckoningActive) return;
        const hpSpent = Math.max(0, player.hp - 1);
        player.hp = 1;
        player.reckoningActive     = true;
        player.reckoningTimer      = 300; // 5s
        player.reckoningDamagePool = hpSpent * 1.5;

        if (typeof audioManager !== 'undefined') audioManager.play('reckoning_activate');
        if (typeof showNotification === 'function') showNotification("THE RECKONING", "#8b1a1a");
        if (typeof createExplosion === 'function') {
            createExplosion(player.x, player.y, '#8b1a1a', 100);
            createExplosion(player.x, player.y, '#3d0808', 70);
        }
    },

    useSpecial: function (player, world) {
        const _w = world ?? window._world;
        const { showNotification } = _w ?? window;
        if ((player.specialCooldown || 0) > 0) return false;
        const cost = 20;
        if (player.hp <= cost) {
            if (typeof showNotification === 'function') showNotification("TOO FRAIL", "#888");
            return false;
        }
        player.hp = Math.max(1, player.hp - cost);

        if (typeof audioManager !== 'undefined') audioManager.play('special_thorn');
        if (typeof showNotification === 'function') showNotification("CRIMSON GARDEN", "#8b1a1a");

        player.bloodRose = {
            x: player.x,
            y: player.y,
            life: 480 + (player.gardenDurationBonus || 0),
            maxLife: 480 + (player.gardenDurationBonus || 0),
            radius: 250 + (player.gardenRadiusBonus || 0),
            pulseTimer: 0
        };

        if (typeof createExplosion === 'function') {
            createExplosion(player.x, player.y, '#c0392b', 60);
            createExplosion(player.x, player.y, '#5a0808', 50);
        }

        player.specialCooldown = 840; // 14s
        player.setupSpecial();
        return true;
    },

    update: function (player, dx, dy, world) {
        const _w = world ?? window._world;
        const { enemies } = _w ?? window;

        const f = (typeof frame !== 'undefined' ? frame : 0);

        // Bleed ticks on enemies
        if (enemies) {
            enemies.forEach(e => {
                if (e.hp <= 0) return;
                if (e._thornBleedStacks && e._thornBleedStacks > 0) {
                    if (e._thornBleedTimer && e._thornBleedTimer > 0) {
                        e._thornBleedTimer--;
                        if (f % 60 === 0) {
                            const dps = e._thornBleedStacks * (player.bleedDpsPerStack || 4) * (player.bleedDmgMult || 1) * (player.damageMultiplier || 1);
                            e.hp -= dps;
                            if (e.hp <= 0 && typeof player.onKill === 'function') player.onKill(e);
                        }
                        if (e._thornBleedTimer <= 0) {
                            e._thornBleedStacks = 0;
                        }
                    } else {
                        e._thornBleedStacks = 0;
                    }
                    // Visual: red blood droplet ring
                    if (window.ctx && e._thornBleedStacks > 0) {
                        const ctx = window.ctx;
                        ctx.save();
                        for (let i = 0; i < e._thornBleedStacks; i++) {
                            const ang = (i / Math.max(1, player.maxBleedStacks)) * Math.PI * 2 + f * 0.03;
                            const r = (e.radius || 18) + 6;
                            const x = e.x + Math.cos(ang) * r;
                            const y = e.y + Math.sin(ang) * r;
                            ctx.fillStyle = 'rgba(192, 57, 43, 0.9)';
                            ctx.beginPath();
                            ctx.arc(x, y, 2.5, 0, Math.PI * 2);
                            ctx.fill();
                        }
                        ctx.restore();
                    }
                }
            });
        }

        // Crimson Garden tick — pulse every 0.5s
        if (player.bloodRose) {
            const rose = player.bloodRose;
            rose.life--;
            rose.pulseTimer++;
            if (rose.pulseTimer >= 30 && enemies) {
                rose.pulseTimer = 0;
                let dmgThisPulse = 0;
                enemies.forEach(e => {
                    if (e.hp <= 0) return;
                    if (Math.hypot(e.x - rose.x, e.y - rose.y) < rose.radius) {
                        player._thornApplyBleed(e, player);
                        // Per-pulse direct bleed damage (1 stack tick spread)
                        const pulseDmg = (player.bleedDpsPerStack || 4) * (player.bleedDmgMult || 1) * 0.5 * (player.damageMultiplier || 1);
                        e.hp -= pulseDmg;
                        dmgThisPulse += pulseDmg;
                        if (e.hp <= 0 && typeof player.onKill === 'function') player.onKill(e);
                    }
                });
                // 50% heal of damage dealt
                if (dmgThisPulse > 0) {
                    player.hp = Math.min(player.maxHp || player.hp, player.hp + dmgThisPulse * 0.5);
                }
            }
            if (rose.life <= 0) player.bloodRose = null;

            // Draw Blood Rose
            if (window.ctx && rose) {
                const ctx = window.ctx;
                ctx.save();
                ctx.translate(rose.x, rose.y);
                const pulse = 0.7 + 0.3 * Math.sin(f * 0.2);
                const grad = ctx.createRadialGradient(0, 0, 8, 0, 0, rose.radius);
                grad.addColorStop(0,   `rgba(139, 26, 26, ${0.45 * pulse})`);
                grad.addColorStop(0.5, `rgba(80, 12, 12, ${0.25 * pulse})`);
                grad.addColorStop(1,   'rgba(50, 0, 0, 0)');
                ctx.fillStyle = grad;
                ctx.beginPath();
                ctx.arc(0, 0, rose.radius, 0, Math.PI * 2);
                ctx.fill();
                // Inner bloom — petal-ish
                ctx.rotate(f * 0.01);
                ctx.fillStyle = `rgba(192, 57, 43, ${0.7 * pulse})`;
                for (let i = 0; i < 6; i++) {
                    ctx.save();
                    ctx.rotate(i * Math.PI / 3);
                    ctx.beginPath();
                    ctx.ellipse(0, -14, 8, 18, 0, 0, Math.PI * 2);
                    ctx.fill();
                    ctx.restore();
                }
                ctx.fillStyle = '#1a0606';
                ctx.beginPath();
                ctx.arc(0, 0, 5, 0, Math.PI * 2);
                ctx.fill();
                ctx.restore();
            }
        }

        // The Reckoning tick — distribute damage arena-wide
        if (player.reckoningActive) {
            player.reckoningTimer--;
            if (enemies && player.reckoningDamagePool > 0) {
                // Spread total over 300 frames, distributed across live enemies per frame
                const perFrameTotal = player.reckoningDamagePool / 300;
                const live = enemies.filter(e => e.hp > 0);
                if (live.length > 0) {
                    const each = perFrameTotal / live.length * (player.damageMultiplier || 1);
                    live.forEach(e => {
                        e.hp -= each;
                        if (e.hp <= 0 && typeof player.onKill === 'function') player.onKill(e);
                    });
                }
            }
            // Visual: synchronized vine pulses
            if (window.ctx) {
                const ctx = window.ctx;
                const t = f;
                ctx.save();
                ctx.globalAlpha = 0.4 + Math.sin(t * 0.2) * 0.2;
                ctx.strokeStyle = '#8b1a1a';
                ctx.lineWidth = 3;
                ctx.shadowColor = '#5a0808';
                ctx.shadowBlur  = 14;
                const arcSegments = 14;
                const rArc = 220 + Math.sin(t * 0.1) * 60;
                ctx.beginPath();
                for (let i = 0; i < arcSegments; i++) {
                    const a = (i / arcSegments) * Math.PI * 2 + t * 0.02;
                    const x = player.x + Math.cos(a) * rArc;
                    const y = player.y + Math.sin(a) * rArc;
                    if (i === 0) ctx.moveTo(x, y);
                    else ctx.lineTo(x, y);
                }
                ctx.closePath();
                ctx.stroke();
                // Red overlay tint
                if (window.canvas) {
                    ctx.globalAlpha = 0.10 + Math.sin(t * 0.1) * 0.05;
                    ctx.fillStyle = '#5a0808';
                    ctx.fillRect(0, 0, window.canvas.width, window.canvas.height);
                }
                ctx.restore();
            }
            if (player.reckoningTimer <= 0) {
                player.reckoningActive = false;
                if (player.hp > 0) {
                    player.hp = player.maxHp;
                    if (typeof showNotification === 'function') showNotification("THE GARDEN ANSWERS", "#c0392b");
                } else {
                    if (typeof showNotification === 'function') showNotification("THE THORN FELL", "#444");
                }
            }
        }

        // Self-tint flash when attacking (low HP visual cue)
        if (window.ctx && player.hp <= 1 && (typeof frame === 'undefined' ? 0 : frame) % 30 < 10) {
            const ctx = window.ctx;
            ctx.save();
            ctx.strokeStyle = 'rgba(139, 26, 26, 0.7)';
            ctx.lineWidth = 2;
            ctx.beginPath();
            ctx.arc(player.x, player.y, (player.radius || 18) + 6, 0, Math.PI * 2);
            ctx.stroke();
            ctx.restore();
        }
    }
};
