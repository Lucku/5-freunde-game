// Dream Hero Logic — Radiance of Ruin
// Color: Twilight Indigo (#5a3e9e)
// Mechanic: Lucidity 0-100. Passive +2/sec, +1 on melee, +0.5 on ranged. -5 on damage taken.
//           Drowsy debuff: 1 stack per melee hit, 30% slow 2s, max 5. Dreamscape on Drowsy = burst.
//           Lucid Step: once-per-wave lethal-damage phase (3s untargetable, regen 5 HP/s).
// Special:  Dreamscape — 300px pocket: -50% speed +25% dmg taken to enemies, +5 HP/s ally regen. 6s. 30 Lucidity.
// Ultimate: The Long Sleep — arena dreamspace 8s + 5s execute window on <25% HP enemies. 90 Lucidity.

if (typeof BASE_HERO_STATS !== 'undefined') {
    if (!BASE_HERO_STATS['dream']) {
        BASE_HERO_STATS['dream'] = {
            color: '#5a3e9e',
            hp: 55,
            speed: 5.0,
            rangeDmg: 30,
            meleeDmg: 75,
            rangeCd: 10,
            meleeCd: 90,
            projectileSpeed: 14,
            projectileSize: 5,
            knockback: 4,
            maxLucidity: 100
        };
    }
}

const DREAM_UPGRADE_POOL = [
    { id: 'health',         title: 'Steadier Vessel', desc: 'Increase Max HP by 25 and Heal 20%.',  icon: '🌌' },
    { id: 'lucidity_regen', title: 'Wakeful Mind',    desc: 'Lucidity passive regen +1/sec.',       icon: '💭' },
    { id: 'dreamscape',     title: 'Wider Pocket',    desc: 'Dreamscape radius +25%, duration +2s.', icon: '🫧' },
    { id: 'drowsy',         title: 'Sandman',         desc: 'Drowsy slow +15%, duration +1s.',      icon: '😴' },
    { id: 'cost_reduction', title: 'Lucid Thrift',    desc: 'Special Lucidity costs -20%.',         icon: '🌀' },
    { id: 'speed',          title: 'Phasestep',       desc: 'Move speed +10%.',                     icon: '💫' },
    { id: 'damage',         title: 'Twilight Edge',   desc: 'Damage +10%.',                         icon: '🗡️' },
    { id: 'crit',           title: 'Foresight',       desc: '+5% Crit Chance & +20% Crit Damage.',  icon: '🎯' }
];

const DREAM_PERM_UPGRADES = {
    health:  { name: "Anchored Sleeper", desc: "+5 Starting HP",       baseCost: 1000, costMult: 1.2 },
    greed:   { name: "Dream-Coin",       desc: "+5% Gold Gain",        baseCost: 2000, costMult: 1.3 },
    power:   { name: "Edge of Sleep",    desc: "+1% Damage",           baseCost: 5000, costMult: 1.4 },
    swift:   { name: "Drift",            desc: "+1% Speed",            baseCost: 3000, costMult: 1.3 },
    defense: { name: "Veil",             desc: "+1% Damage Reduction", baseCost: 4000, costMult: 1.5 },
    wisdom:  { name: "Long Recall",      desc: "+2% XP Gain",          baseCost: 2500, costMult: 1.3 }
};

if (typeof window.HERO_LOGIC === 'undefined') window.HERO_LOGIC = {};

window.HERO_LOGIC['dream'] = {
    upgradePool: DREAM_UPGRADE_POOL,

    getSkillTreeWeights: function () {
        return {
            'LUCIDITY_REGEN': 0.20,
            'DREAMSCAPE':     0.20,
            'DROWSY':         0.15,
            'COST_REDUCTION': 0.15,
            'SPEED':          0.10,
            'DAMAGE':         0.10,
            'HEALTH':         0.05,
            'CRIT':           0.05
        };
    },

    getSkillNodeDetails: function (type, value, desc) {
        if (type === 'LUCIDITY_REGEN') return { val: 0.5, desc: "+0.5/sec Lucidity Regen" };
        if (type === 'DREAMSCAPE')     return { val: 0.10, desc: "+10% Dreamscape Radius" };
        if (type === 'DROWSY')         return { val: 0.05, desc: "+5% Drowsy Slow" };
        if (type === 'COST_REDUCTION') return { val: 0.10, desc: "-10% Special Costs" };
        return { val: value, desc: desc };
    },

    applySkillNode: function (base, node) {
        if (node.type === 'LUCIDITY_REGEN') base.lucidityRegenBonus = (base.lucidityRegenBonus || 0) + node.value;
        if (node.type === 'DREAMSCAPE')     base.dreamscapeRadiusMult = (base.dreamscapeRadiusMult || 1) * (1 + node.value);
        if (node.type === 'DROWSY')         base.drowsySlowBonus = (base.drowsySlowBonus || 0) + node.value;
        if (node.type === 'COST_REDUCTION') base.lucidityCostMult = (base.lucidityCostMult || 1) * (1 - node.value);
    },

    applyUpgrade: function (player, type, world) {
        if (type === 'lucidity_regen') {
            player.lucidityRegenBonus = (player.lucidityRegenBonus || 0) + 1;
            return true;
        }
        if (type === 'dreamscape') {
            player.dreamscapeRadiusMult   = (player.dreamscapeRadiusMult || 1) * 1.25;
            player.dreamscapeDurationBonus = (player.dreamscapeDurationBonus || 0) + 120;
            return true;
        }
        if (type === 'drowsy') {
            player.drowsySlowBonus     = (player.drowsySlowBonus || 0) + 0.15;
            player.drowsyDurationBonus = (player.drowsyDurationBonus || 0) + 60;
            return true;
        }
        if (type === 'cost_reduction') {
            player.lucidityCostMult = (player.lucidityCostMult || 1) * 0.8;
            return true;
        }
        if (type === 'transform') {
            window.HERO_LOGIC['dream']._unleashLongSleep(player);
            return true;
        }
        return false;
    },

    init: function (player) {
        const _self = this;

        player.maxLucidity         = player.stats.maxLucidity || 100;
        player.lucidity            = 0;
        player.lucidityRegenBonus  = player.stats.lucidityRegenBonus || 0;
        player.lucidityCostMult    = player.stats.lucidityCostMult || 1;
        player.dreamscapeRadiusMult = player.stats.dreamscapeRadiusMult || 1;
        player.dreamscapeDurationBonus = 0;
        player.drowsySlowBonus     = player.stats.drowsySlowBonus || 0;
        player.drowsyDurationBonus = player.stats.drowsyDurationBonus || 0;

        player.dreamPocket         = null; // { x, y, life, radius }

        // Long Sleep ult
        player.longSleepActive     = false;
        player.longSleepTimer      = 0;
        player.longSleepExecuteTimer = 0;

        // Lucid Step (once-per-wave revive phase)
        player.lucidStepUsed       = false;
        player.lucidStepPhase      = false;
        player.lucidStepTimer      = 0;

        player.damageMultiplier = 1.0;
        player.speedMultiplier  = 1.0;

        // Hook shoot — +0.5 Lucidity on launch (assume hit-on-fire approximation)
        const origShoot = player.shoot.bind(player);
        player.shoot = function () {
            if (typeof audioManager !== 'undefined') {
                const now = Date.now();
                if (!player._lastDreamAttackSfx || now - player._lastDreamAttackSfx >= 200) {
                    audioManager.play('attack_dream');
                    player._lastDreamAttackSfx = now;
                }
            }
            origShoot();
            if (!player.civilianForm) {
                player.lucidity = Math.min(player.maxLucidity, player.lucidity + 0.5);
                if (typeof player.setupSpecial === 'function') player.setupSpecial();
            }
        };

        // Hook melee — Twilight Edge: apply 1 Drowsy stack per hit, +1 Lucidity
        const origMelee = player.melee ? player.melee.bind(player) : null;
        if (origMelee) {
            player.melee = function (...args) {
                if (typeof audioManager !== 'undefined') audioManager.play('melee_dream');
                const _w = window._world ?? window;
                if (_w.enemies) {
                    _w.enemies.forEach(e => {
                        if (e.hp <= 0) return;
                        if (Math.hypot(e.x - player.x, e.y - player.y) < (player.meleeRange || 100)) {
                            e._dreamDrowsy = Math.min(5, (e._dreamDrowsy || 0) + 1);
                            e._dreamDrowsyTimer = 120 + (player.drowsyDurationBonus || 0); // 2s + bonus
                            player.lucidity = Math.min(player.maxLucidity, player.lucidity + 1);
                        }
                    });
                }
                origMelee(...args);
                if (typeof player.setupSpecial === 'function') player.setupSpecial();
            };
        }

        // Hook dash for SFX
        const origDash = player.dash.bind(player);
        player.dash = function (...args) {
            const before = player.isDashing;
            origDash(...args);
            if (!before && player.isDashing && typeof audioManager !== 'undefined') {
                audioManager.play('dash_dream');
            }
        };

        // Hook takeDamage — Lucidity drain + Lucid Step lethal-save
        const origTakeDamage = player.takeDamage ? player.takeDamage.bind(player) : null;
        if (origTakeDamage) {
            player.takeDamage = function (amount, ...args) {
                if (player.lucidStepPhase) return; // untargetable
                // Compute what the resulting HP would be
                const hpBefore = player.hp;
                const reduced  = (typeof amount === 'number') ? amount * (1 - (player.damageReduction || 0)) : 0;
                const wouldBe  = hpBefore - reduced;
                if (wouldBe <= 0 && !player.lucidStepUsed) {
                    // Trigger Lucid Step instead
                    player.lucidStepUsed  = true;
                    player.lucidStepPhase = true;
                    player.lucidStepTimer = 180; // 3s
                    player.hp = 1;
                    if (typeof audioManager !== 'undefined') audioManager.play('lucid_step_phase');
                    if (typeof showNotification === 'function') showNotification("LUCID STEP", "#5a3e9e");
                    if (typeof createExplosion === 'function') createExplosion(player.x, player.y, '#5a3e9e', 60);
                    return;
                }
                const result = origTakeDamage(amount, ...args);
                if (typeof amount === 'number' && amount > 0) {
                    player.lucidity = Math.max(0, player.lucidity - 5);
                }
                if (typeof player.setupSpecial === 'function') player.setupSpecial();
                return result;
            };
        }

        // Lucid Step resets at wave start (via global window.eventBus)
        const _bus = (typeof window !== 'undefined') ? window.eventBus : null;
        if (_bus && typeof _bus.on === 'function') {
            const onAdvance = () => {
                player.lucidStepUsed = false;
                player.lucidStepPhase = false;
                player.lucidStepTimer = 0;
            };
            if (player._dreamWaveHandler && typeof _bus.off === 'function') {
                try { _bus.off('wave:advance', player._dreamWaveHandler); } catch(e) {}
            }
            player._dreamWaveHandler = onAdvance;
            try { _bus.on('wave:advance', onAdvance); } catch(e) {}
        }

        player.getFormName = function () { return 'THE LONG SLEEP'; };

        player.customSpecial = () => _self.useSpecial(player);
        player.customUpdate  = (dx, dy) => { _self.update(player, dx, dy); return false; };

        // Special UI — Lucidity gauge for Dreamscape
        player.setupSpecial = function () {
            if (this.isCPU) { this.specialName = "DREAMSCAPE"; return; }
            const iconEl    = document.getElementById('special-icon');
            const container = document.getElementById('special-container');
            this.specialName = "DREAMSCAPE";
            if (iconEl) iconEl.innerText = "🫧";
            if (container) {
                const pct = (this.lucidity / this.maxLucidity) * 100;
                const onCd = (this.specialCooldown || 0) > 0;
                const cost = 30 * (this.lucidityCostMult || 1);
                const canCast = !onCd && this.lucidity >= cost;
                container.style.background = `linear-gradient(to top, #5a3e9e ${pct}%, rgba(0,0,0,0.5) ${pct}%)`;
                container.style.borderColor = "#5a3e9e";
                container.style.boxShadow = canCast ? "0 0 14px #7c5ec8" : "none";
            }
            if (iconEl) {
                const onCd = (this.specialCooldown || 0) > 0;
                const cost = 30 * (this.lucidityCostMult || 1);
                const canCast = !onCd && this.lucidity >= cost;
                iconEl.style.filter  = canCast ? "brightness(1.3) drop-shadow(0 0 8px #5a3e9e)" : "grayscale(0.7)";
                iconEl.style.opacity = canCast ? "1" : "0.55";
            }
        };

        player.setupSpecial();
    },

    _unleashLongSleep: function (player) {
        const cost = 90 * (player.lucidityCostMult || 1);
        if (player.lucidity < cost) return;
        player.lucidity -= cost;
        player.longSleepActive       = true;
        player.longSleepTimer        = 480; // 8s
        player.longSleepExecuteTimer = 480 + 300; // total window before execute ends

        if (typeof audioManager !== 'undefined') audioManager.play('long_sleep_activate');
        if (typeof showNotification === 'function') showNotification("THE LONG SLEEP", "#5a3e9e");
        if (typeof createExplosion === 'function') {
            createExplosion(player.x, player.y, '#5a3e9e', 100);
            createExplosion(player.x, player.y, '#0a0815', 80);
        }
    },

    useSpecial: function (player, world) {
        const _w = world ?? window._world;
        const { enemies, showNotification } = _w ?? window;
        if ((player.specialCooldown || 0) > 0) return false;
        const cost = 30 * (player.lucidityCostMult || 1);
        if (player.lucidity < cost) {
            if (typeof showNotification === 'function') showNotification("INSUFFICIENT LUCIDITY", "#888");
            return false;
        }
        player.lucidity -= cost;

        if (typeof audioManager !== 'undefined') audioManager.play('special_dream');
        if (typeof showNotification === 'function') showNotification("DREAMSCAPE", "#5a3e9e");

        const radius   = 300 * (player.dreamscapeRadiusMult || 1);
        const duration = 360 + (player.dreamscapeDurationBonus || 0);

        // Pocket spawns at player position (no cursor concept in keyboard layout)
        player.dreamPocket = {
            x: player.x,
            y: player.y,
            life: duration,
            maxLife: duration,
            radius
        };

        // Drowsy consumption burst: each Drowsy stack on enemies in pocket = +25% damage
        if (enemies) {
            enemies.forEach(e => {
                if (e.hp <= 0) return;
                if (Math.hypot(e.x - player.x, e.y - player.y) < radius) {
                    if (e._dreamDrowsy && e._dreamDrowsy > 0) {
                        const baseDmg = (player.stats.rangeDmg || 30) * 1.0 * (player.damageMultiplier || 1);
                        const burst = baseDmg * 0.25 * e._dreamDrowsy;
                        e.hp -= burst;
                        e._dreamDrowsy = 0;
                        e._dreamDrowsyTimer = 0;
                        if (e.hp <= 0 && typeof player.onKill === 'function') player.onKill(e);
                    }
                }
            });
        }

        // Counter for achievement
        if (typeof saveData !== 'undefined' && saveData.global) {
            saveData.global.dream_dreamscape_count = (saveData.global.dream_dreamscape_count || 0) + 1;
        }

        if (typeof createExplosion === 'function') {
            createExplosion(player.x, player.y, '#5a3e9e', 70);
            createExplosion(player.x, player.y, '#9c7fe0', 55);
        }

        player.specialCooldown = 720; // 12s
        player.setupSpecial();
        return true;
    },

    update: function (player, dx, dy, world) {
        const _w = world ?? window._world;
        const { enemies } = _w ?? window;
        const f = (typeof frame !== 'undefined' ? frame : 0);

        // Passive Lucidity regen (+2/sec base + bonus)
        if (!player.civilianForm) {
            const regenPerFrame = (2 + (player.lucidityRegenBonus || 0)) / 60;
            player.lucidity = Math.min(player.maxLucidity, player.lucidity + regenPerFrame);
        }

        // Lucid Step phase tick
        if (player.lucidStepPhase) {
            player.lucidStepTimer--;
            player.isInvincible = true;
            // Regen 5 HP/sec
            if (f % 12 === 0) player.hp = Math.min(player.maxHp || player.hp, player.hp + 1);
            // Visual: dissolved purple smoke
            if (window.ctx) {
                const ctx = window.ctx;
                ctx.save();
                ctx.globalAlpha = 0.55;
                const r = (player.radius || 18) + 12 + Math.sin(f * 0.2) * 3;
                const grad = ctx.createRadialGradient(player.x, player.y, 4, player.x, player.y, r);
                grad.addColorStop(0, 'rgba(124, 94, 200, 0.7)');
                grad.addColorStop(1, 'rgba(58, 30, 110, 0)');
                ctx.fillStyle = grad;
                ctx.beginPath();
                ctx.arc(player.x, player.y, r, 0, Math.PI * 2);
                ctx.fill();
                ctx.restore();
            }
            if (player.lucidStepTimer <= 0) {
                player.lucidStepPhase = false;
                player.isInvincible = false;
                if (typeof showNotification === 'function') showNotification("AWAKE", "#9c7fe0");
            }
        }

        // Drowsy decay + visual
        if (enemies) {
            enemies.forEach(e => {
                if (e._dreamDrowsy && e._dreamDrowsy > 0) {
                    e._dreamDrowsyTimer = (e._dreamDrowsyTimer || 0) - 1;
                    // Slow tag + apply
                    const slow = 0.30 + (player.drowsySlowBonus || 0);
                    e._dreamSlowFactor = 1 - slow;
                    if (e._dreamDrowsyTimer <= 0) {
                        e._dreamDrowsy = 0;
                        e._dreamSlowFactor = 1;
                    } else if (window.ctx) {
                        // Draw stacks as small Zz above
                        const ctx = window.ctx;
                        ctx.save();
                        ctx.translate(e.x, e.y - (e.radius || 18) - 22);
                        ctx.fillStyle = 'rgba(180, 160, 240, 0.85)';
                        ctx.font = 'bold 12px sans-serif';
                        ctx.textAlign = 'center';
                        for (let i = 0; i < e._dreamDrowsy; i++) {
                            ctx.fillText('z', i * 6 - (e._dreamDrowsy - 1) * 3, -Math.sin(f * 0.1 + i) * 2);
                        }
                        ctx.restore();
                    }
                    // Apply slow to velocity components if present
                    if (e._dreamSlowFactor && e._dreamSlowFactor < 1) {
                        if (typeof e.vx === 'number') e.vx *= e._dreamSlowFactor;
                        if (typeof e.vy === 'number') e.vy *= e._dreamSlowFactor;
                    }
                }
            });
        }

        // Dreamscape pocket tick
        if (player.dreamPocket) {
            const dp = player.dreamPocket;
            dp.life--;
            if (enemies) {
                enemies.forEach(e => {
                    if (e.hp <= 0) return;
                    if (Math.hypot(e.x - dp.x, e.y - dp.y) < dp.radius) {
                        e._dreamPocketSlow = 6;
                        e._dreamPocketVuln = 6;
                        // Slow movement
                        if (typeof e.vx === 'number') e.vx *= 0.5;
                        if (typeof e.vy === 'number') e.vy *= 0.5;
                    } else {
                        // decay tags
                        if (e._dreamPocketSlow && e._dreamPocketSlow > 0) e._dreamPocketSlow--;
                        if (e._dreamPocketVuln && e._dreamPocketVuln > 0) e._dreamPocketVuln--;
                    }
                });
            }
            // Ally regen +5 HP/s for player inside own pocket
            if (f % 12 === 0 && Math.hypot(player.x - dp.x, player.y - dp.y) < dp.radius) {
                player.hp = Math.min(player.maxHp || player.hp, player.hp + 1);
            }
            // Draw pocket
            if (window.ctx) {
                const ctx = window.ctx;
                ctx.save();
                ctx.translate(dp.x, dp.y);
                ctx.rotate(f * 0.01);
                const grad = ctx.createRadialGradient(0, 0, 10, 0, 0, dp.radius);
                grad.addColorStop(0,   'rgba(90, 62, 158, 0.45)');
                grad.addColorStop(0.7, 'rgba(40, 20, 90, 0.25)');
                grad.addColorStop(1,   'rgba(10, 8, 21, 0)');
                ctx.fillStyle = grad;
                ctx.beginPath();
                ctx.arc(0, 0, dp.radius, 0, Math.PI * 2);
                ctx.fill();
                // Galaxy swirls
                ctx.strokeStyle = 'rgba(200, 180, 240, 0.35)';
                ctx.lineWidth = 1.5;
                for (let i = 0; i < 3; i++) {
                    ctx.beginPath();
                    const startA = i * (Math.PI * 2 / 3);
                    ctx.arc(0, 0, dp.radius * (0.4 + i * 0.18), startA, startA + Math.PI * 1.4);
                    ctx.stroke();
                }
                ctx.restore();
            }
            if (dp.life <= 0) player.dreamPocket = null;
        }

        // Install global Enemy.takeDamage hook for +25% Dreamscape vuln (lazy, once)
        if (!window._dreamVulnInstalled && typeof Enemy !== 'undefined' && Enemy.prototype && Enemy.prototype.takeDamage) {
            const origET = Enemy.prototype.takeDamage;
            Enemy.prototype.takeDamage = function (amount, ...args) {
                let amt = amount;
                if (this._dreamPocketVuln && this._dreamPocketVuln > 0 && typeof amt === 'number') amt *= 1.25;
                return origET.call(this, amt, ...args);
            };
            window._dreamVulnInstalled = true;
        }

        // Long Sleep tick
        if (player.longSleepActive) {
            player.longSleepTimer--;
            player.longSleepExecuteTimer--;
            // Apply slow + miss to all enemies
            if (enemies) {
                enemies.forEach(e => {
                    if (e.hp <= 0) return;
                    e._dreamLongSlow = 5;
                    e._dreamMiss     = 5;
                    if (typeof e.vx === 'number') e.vx *= 0.4;
                    if (typeof e.vy === 'number') e.vy *= 0.4;
                });
            }
            // Phase-step: allies untargetable / pass through enemies — approximate via invincibility
            player.isInvincible = true;
            // Visual: indigo gradient overlay + stars
            if (window.ctx && window.canvas) {
                const ctx = window.ctx;
                ctx.save();
                ctx.globalAlpha = 0.22 + Math.sin(f * 0.06) * 0.05;
                const overlay = ctx.createLinearGradient(0, 0, 0, window.canvas.height);
                overlay.addColorStop(0, '#5a3e9e');
                overlay.addColorStop(1, '#0a0815');
                ctx.fillStyle = overlay;
                ctx.fillRect(0, 0, window.canvas.width, window.canvas.height);
                ctx.restore();
            }
            if (player.longSleepTimer <= 0) {
                player.longSleepActive = false;
                player.isInvincible = false;
            }
        } else if (player.longSleepExecuteTimer > 0) {
            // 5s execute window after ult ends
            player.longSleepExecuteTimer--;
            if (enemies) {
                enemies.forEach(e => {
                    if (e.hp <= 0) return;
                    if (e.maxHp && e.hp / e.maxHp < 0.25) {
                        e._dreamAsleep = 12;
                        if (window.ctx) {
                            const ctx = window.ctx;
                            ctx.save();
                            ctx.strokeStyle = 'rgba(180, 160, 240, 0.7)';
                            ctx.lineWidth = 2;
                            ctx.setLineDash([4, 4]);
                            ctx.beginPath();
                            ctx.arc(e.x, e.y, (e.radius || 18) + 5, 0, Math.PI * 2);
                            ctx.stroke();
                            ctx.setLineDash([]);
                            ctx.restore();
                        }
                    }
                });
            }
            // Install one-shot kill hook (lazy)
            if (!window._dreamAsleepInstalled && typeof Enemy !== 'undefined' && Enemy.prototype && Enemy.prototype.takeDamage) {
                const origET = Enemy.prototype.takeDamage;
                Enemy.prototype.takeDamage = function (amount, ...args) {
                    if (this._dreamAsleep && this._dreamAsleep > 0 && typeof amount === 'number' && amount > 0) {
                        return origET.call(this, this.hp + 1, ...args); // execute
                    }
                    return origET.call(this, amount, ...args);
                };
                window._dreamAsleepInstalled = true;
            }
        }

        // Decay one-frame tags
        if (enemies) {
            enemies.forEach(e => {
                if (e._dreamPocketSlow && e._dreamPocketSlow > 0) e._dreamPocketSlow--;
                if (e._dreamPocketVuln && e._dreamPocketVuln > 0) e._dreamPocketVuln--;
                if (e._dreamLongSlow && e._dreamLongSlow > 0) e._dreamLongSlow--;
                if (e._dreamMiss && e._dreamMiss > 0) e._dreamMiss--;
                if (e._dreamAsleep && e._dreamAsleep > 0) e._dreamAsleep--;
            });
        }

        // Player shimmer aura when high Lucidity
        if (window.ctx && player.lucidity > 60) {
            const ctx = window.ctx;
            ctx.save();
            ctx.globalCompositeOperation = 'lighter';
            const r = (player.radius || 18) + 6 + Math.sin(f * 0.18) * 2;
            const grad = ctx.createRadialGradient(player.x, player.y, 2, player.x, player.y, r);
            grad.addColorStop(0, 'rgba(160, 130, 240, 0.35)');
            grad.addColorStop(1, 'rgba(60, 30, 130, 0)');
            ctx.fillStyle = grad;
            ctx.beginPath();
            ctx.arc(player.x, player.y, r, 0, Math.PI * 2);
            ctx.fill();
            ctx.restore();
        }

        if (typeof player.setupSpecial === 'function' && f % 10 === 0) player.setupSpecial();
    }
};
