// Light Hero Logic — Radiance of Ruin
// Color: Radiant Gold (#f1c40f)
// Mechanic: Mask Integrity (0-100). Refills 100 at wave start. Drains per ability.
//           At 0 -> Civilian Form for 8s (HP cap 25, speed 2.0, abilities disabled).
//           Death during Civilian Form locks Light out for the rest of the run.
// Special:  Revelation — 400px reveal sphere, enemies +30% dmg taken, 10s.
// Ultimate: The Unveiling — arena-wide stun + ally heal + +50% dmg for 6s, then 15s Civilian.

if (typeof BASE_HERO_STATS !== 'undefined') {
    if (!BASE_HERO_STATS['light']) {
        BASE_HERO_STATS['light'] = {
            color: '#f1c40f',
            hp: 80,
            speed: 4.5,
            rangeDmg: 45,
            meleeDmg: 140,
            rangeCd: 16,
            meleeCd: 110,
            projectileSpeed: 13,
            projectileSize: 6,
            knockback: 5,
            maxIntegrity: 100
        };
    }
}

const LIGHT_UPGRADE_POOL = [
    { id: 'health',             title: 'Solar Vessel',     desc: 'Increase Max HP by 25 and Heal 20%.',     icon: '☀️' },
    { id: 'max_integrity',      title: 'Greater Vessel',   desc: '+20 Max Integrity.',                       icon: '🪙' },
    { id: 'cost_reduction',     title: 'Efficient Light',  desc: 'Ability Integrity costs -15%.',           icon: '💡' },
    { id: 'integrity_on_kill',  title: 'Feed the Flame',   desc: 'Restore 3 Integrity per kill.',           icon: '🔥' },
    { id: 'revelation',         title: 'Wider Glare',      desc: 'Revelation radius +25%, duration +2s.',   icon: '👁️' },
    { id: 'aurum_burn',         title: 'Searing Trail',    desc: 'Aurum Burn DPS +50%.',                    icon: '🌟' },
    { id: 'civilian_recovery',  title: 'Resurgent',        desc: 'Civilian Form duration -3s.',             icon: '⏳' },
    { id: 'crit',               title: 'Pinpoint',         desc: '+5% Crit Chance & +20% Crit Damage.',     icon: '🎯' }
];

const LIGHT_PERM_UPGRADES = {
    health:  { name: "Gilded Frame",   desc: "+5 Starting HP",       baseCost: 1000, costMult: 1.2 },
    greed:   { name: "Glittering Eye", desc: "+5% Gold Gain",        baseCost: 2000, costMult: 1.3 },
    power:   { name: "Burning Halo",   desc: "+1% Damage",           baseCost: 5000, costMult: 1.4 },
    swift:   { name: "Sunstride",      desc: "+1% Speed",            baseCost: 3000, costMult: 1.3 },
    defense: { name: "Anchored Light", desc: "+1% Damage Reduction", baseCost: 4000, costMult: 1.5 },
    wisdom:  { name: "Reverent Study", desc: "+2% XP Gain",          baseCost: 2500, costMult: 1.3 }
};

if (typeof window.HERO_LOGIC === 'undefined') window.HERO_LOGIC = {};

window.HERO_LOGIC['light'] = {
    upgradePool: LIGHT_UPGRADE_POOL,

    getSkillTreeWeights: function () {
        return {
            'MAX_INTEGRITY':     0.20,
            'COST_REDUCTION':    0.20,
            'INTEGRITY_ON_KILL': 0.15,
            'REVELATION':        0.15,
            'HEALTH':            0.10,
            'AURUM_BURN':        0.10,
            'CIVILIAN_RECOVERY': 0.05,
            'CRIT':              0.05
        };
    },

    getSkillNodeDetails: function (type, value, desc) {
        if (type === 'MAX_INTEGRITY')     return { val: 10, desc: "+10 Max Integrity" };
        if (type === 'COST_REDUCTION')    return { val: 0.08, desc: "-8% Ability Costs" };
        if (type === 'INTEGRITY_ON_KILL') return { val: 1,  desc: "+1 Integrity per kill" };
        if (type === 'REVELATION')        return { val: 0.10, desc: "+10% Revelation Radius" };
        if (type === 'AURUM_BURN')        return { val: 0.20, desc: "+20% Aurum Burn DPS" };
        if (type === 'CIVILIAN_RECOVERY') return { val: 30, desc: "-0.5s Civilian Form" };
        return { val: value, desc: desc };
    },

    applySkillNode: function (base, node) {
        if (node.type === 'MAX_INTEGRITY')     base.maxIntegrity     = (base.maxIntegrity || 100) + node.value;
        if (node.type === 'COST_REDUCTION')    base.integrityCostMult = (base.integrityCostMult || 1) * (1 - node.value);
        if (node.type === 'INTEGRITY_ON_KILL') base.integrityOnKill  = (base.integrityOnKill || 0) + node.value;
        if (node.type === 'REVELATION')        base.revelationRadiusMult = (base.revelationRadiusMult || 1) * (1 + node.value);
        if (node.type === 'AURUM_BURN')        base.aurumBurnDpsMult = (base.aurumBurnDpsMult || 1) * (1 + node.value);
        if (node.type === 'CIVILIAN_RECOVERY') base.civilianDurationOffset = (base.civilianDurationOffset || 0) - node.value;
    },

    applyUpgrade: function (player, type, world) {
        if (type === 'max_integrity') {
            player.maxIntegrity = (player.maxIntegrity || 100) + 20;
            player.integrity    = Math.min(player.maxIntegrity, (player.integrity || 0) + 20);
            return true;
        }
        if (type === 'cost_reduction') {
            player.integrityCostMult = (player.integrityCostMult || 1) * 0.85;
            return true;
        }
        if (type === 'integrity_on_kill') {
            player.integrityOnKill = (player.integrityOnKill || 0) + 3;
            return true;
        }
        if (type === 'revelation') {
            player.revelationRadiusMult = (player.revelationRadiusMult || 1) * 1.25;
            player.revelationDurationBonus = (player.revelationDurationBonus || 0) + 120;
            return true;
        }
        if (type === 'aurum_burn') {
            player.aurumBurnDpsMult = (player.aurumBurnDpsMult || 1) * 1.5;
            return true;
        }
        if (type === 'civilian_recovery') {
            player.civilianDurationOffset = (player.civilianDurationOffset || 0) - 180;
            return true;
        }
        if (type === 'transform') {
            window.HERO_LOGIC['light']._unleashUnveiling(player);
            return true;
        }
        return false;
    },

    init: function (player) {
        const _self = this;

        // Integrity state
        player.maxIntegrity        = player.stats.maxIntegrity || 100;
        player.integrity           = player.maxIntegrity;
        player.integrityCostMult   = player.stats.integrityCostMult || 1;
        player.integrityOnKill     = player.stats.integrityOnKill || 0;
        player.revelationRadiusMult = player.stats.revelationRadiusMult || 1;
        player.revelationDurationBonus = 0;
        player.aurumBurnDpsMult    = player.stats.aurumBurnDpsMult || 1;
        player.civilianDurationOffset = player.stats.civilianDurationOffset || 0;

        // Civilian Form state
        player.civilianForm        = false;
        player.civilianTimer       = 0;
        player.civilianHpCap       = 25;
        player.maskLost            = false; // Run-locked after Civilian death

        // Aurum Burn trail
        player.aurumTrail          = []; // {x, y, life, maxLife}
        player.aurumBurnEnabled    = true;

        // Revelation state (visual + buff tagging)
        player.revelationActive    = false;
        player.revelationTimer     = 0;

        // Unveiling Ultimate state
        player.unveilingActive     = false;
        player.unveilingTimer      = 0;
        player.unveilingCivilianTimer = 0;

        // Multipliers
        player.damageMultiplier    = 1.0;
        player.speedMultiplier     = 1.0;

        // Hook shoot: Bolt costs 2 Integrity, locked in Civilian Form
        const origShoot = player.shoot.bind(player);
        player.shoot = function () {
            if (player.maskLost && player.type === 'light') return; // run-locked
            if (player.civilianForm) {
                // Civilian basic shot: no integrity cost, reduced damage
                if (typeof audioManager !== 'undefined') {
                    const now = Date.now();
                    if (!player._lastLightAttackSfx || now - player._lastLightAttackSfx >= 250) {
                        audioManager.play('attack_light');
                        player._lastLightAttackSfx = now;
                    }
                }
                const restoreDmg = player.damageMultiplier;
                player.damageMultiplier = (restoreDmg || 1) * 0.4;
                origShoot();
                player.damageMultiplier = restoreDmg;
                return;
            }
            const cost = 2 * (player.integrityCostMult || 1);
            if (player.integrity < cost) {
                _self._enterCivilianForm(player);
                return;
            }
            player.integrity -= cost;
            if (typeof audioManager !== 'undefined') {
                const now = Date.now();
                if (!player._lastLightAttackSfx || now - player._lastLightAttackSfx >= 200) {
                    audioManager.play('attack_light');
                    player._lastLightAttackSfx = now;
                }
            }
            origShoot();
            if (typeof player.setupSpecial === 'function') player.setupSpecial();
        };

        // Hook melee — Solar Lance costs 5 Integrity
        const origMelee = player.melee ? player.melee.bind(player) : null;
        if (origMelee) {
            player.melee = function (...args) {
                if (player.civilianForm) return; // disabled
                const cost = 5 * (player.integrityCostMult || 1);
                if (player.integrity < cost) {
                    _self._enterCivilianForm(player);
                    return;
                }
                player.integrity -= cost;
                if (typeof audioManager !== 'undefined') audioManager.play('melee_light');
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
                audioManager.play('dash_light');
            }
        };

        // Hook onKill — Integrity restore + counter
        const origOnKill = player.onKill ? player.onKill.bind(player) : () => {};
        player.onKill = function (enemy) {
            origOnKill(enemy);
            if (!player.civilianForm && player.integrityOnKill) {
                player.integrity = Math.min(player.maxIntegrity, player.integrity + player.integrityOnKill);
                if (typeof player.setupSpecial === 'function') player.setupSpecial();
            }
            // Revelation kill counter (for achievement)
            if (player.revelationActive && enemy._lightRevealed && typeof saveData !== 'undefined' && saveData.global) {
                saveData.global.light_reveal_kills = (saveData.global.light_reveal_kills || 0) + 1;
            }
        };

        // Wave start: refill Integrity (via global window.eventBus)
        const _bus = (typeof window !== 'undefined') ? window.eventBus : null;
        if (_bus && typeof _bus.on === 'function') {
            const _onAdvance = () => {
                player.integrity = player.maxIntegrity;
                if (player.civilianForm) {
                    player.civilianForm = false;
                    player.civilianTimer = 0;
                    player.integrity = Math.min(player.maxIntegrity, 50);
                }
                if (typeof player.setupSpecial === 'function') player.setupSpecial();
            };
            if (player._lightWaveHandler && typeof _bus.off === 'function') {
                try { _bus.off('wave:advance', player._lightWaveHandler); } catch(e) {}
            }
            player._lightWaveHandler = _onAdvance;
            try { _bus.on('wave:advance', _onAdvance); } catch (e) {}
        }

        player.getFormName = function () { return 'THE UNVEILING'; };

        player.customSpecial = () => _self.useSpecial(player);
        player.customUpdate  = (dx, dy) => { _self.update(player, dx, dy); return false; };

        // Special UI (Revelation gauge = Integrity)
        player.setupSpecial = function () {
            if (this.isCPU) { this.specialName = "REVELATION"; return; }
            const iconEl = document.getElementById('special-icon');
            const container = document.getElementById('special-container');
            this.specialName = "REVELATION";
            if (iconEl) iconEl.innerText = "👁️";

            if (container) {
                const pct = Math.max(0, Math.min(100, (this.integrity / this.maxIntegrity) * 100));
                const onCd = (this.specialCooldown || 0) > 0;
                const color = this.civilianForm ? "#888888" : (this.revelationActive ? "#ffffff" : "#f1c40f");
                container.style.background = `linear-gradient(to top, ${color} ${pct}%, rgba(0,0,0,0.5) ${pct}%)`;
                container.style.borderColor = color;
                const canCast = !onCd && !this.civilianForm && this.integrity >= 25 * (this.integrityCostMult || 1);
                container.style.boxShadow = canCast ? `0 0 12px ${color}` : "none";
            }
            if (iconEl) {
                const canCast = (this.specialCooldown || 0) <= 0 && !this.civilianForm
                    && this.integrity >= 25 * (this.integrityCostMult || 1);
                iconEl.style.filter = canCast
                    ? "brightness(1.3) drop-shadow(0 0 8px #f1c40f)"
                    : "grayscale(0.7)";
                iconEl.style.opacity = canCast ? "1" : "0.55";
            }
        };

        player.setupSpecial();
    },

    _enterCivilianForm: function (player) {
        if (player.civilianForm) return;
        let dur = 480 + (player.civilianDurationOffset || 0); // 8s @60fps
        dur = Math.max(120, dur);
        player.civilianForm  = true;
        player.civilianTimer = dur;
        player.integrity     = 0;
        // Clamp HP to civilian cap
        if (player.hp > player.civilianHpCap) player.hp = player.civilianHpCap;
        player.aurumBurnEnabled = false;
        if (typeof audioManager !== 'undefined') audioManager.play('civilian_collapse');
        if (typeof showNotification === 'function') showNotification("MASK SHATTERED", "#888888");
        if (typeof createExplosion === 'function') {
            createExplosion(player.x, player.y, '#888888', 40);
            createExplosion(player.x, player.y, '#3a2810', 30);
        }
        if (typeof player.setupSpecial === 'function') player.setupSpecial();
    },

    _exitCivilianForm: function (player) {
        player.civilianForm  = false;
        player.civilianTimer = 0;
        player.integrity     = Math.min(player.maxIntegrity, 50);
        player.aurumBurnEnabled = true;
        if (typeof showNotification === 'function') showNotification("MASK RESTORED", "#f1c40f");
        if (typeof createExplosion === 'function') createExplosion(player.x, player.y, '#f1c40f', 50);
        if (typeof player.setupSpecial === 'function') player.setupSpecial();
    },

    _unleashUnveiling: function (player) {
        const _w = window._world ?? window;
        const enemies = _w.enemies;
        const players = (typeof window.player2 !== 'undefined' && window.player2 && window.player2.hp > 0)
            ? [window.player, window.player2].filter(p => p && p.hp > 0) : [window.player].filter(Boolean);

        const cost = 80 * (player.integrityCostMult || 1);
        if (player.civilianForm || player.maskLost) return;
        if (player.integrity < cost) return;
        player.integrity -= cost;

        player.unveilingActive = true;
        player.unveilingTimer  = 360; // 6s
        // Forced Civilian Form afterward (15s)
        player.unveilingCivilianTimer = 360 + 900;

        if (typeof audioManager !== 'undefined') audioManager.play('unveiling_activate');
        if (typeof showNotification === 'function') showNotification("THE UNVEILING", "#ffffff");
        if (typeof createExplosion === 'function') {
            createExplosion(player.x, player.y, '#ffffff', 100);
            createExplosion(player.x, player.y, '#f1c40f', 80);
        }

        // Stun + reveal + +50% ally dmg + ally heal
        if (enemies) {
            enemies.forEach(e => {
                if (e.hp <= 0) return;
                e._lightStun     = 360;
                e._lightRevealed = 360;
                e._lightVulnerable = 360;
            });
        }
        players.forEach(p => {
            if (!p) return;
            p.hp = p.maxHp;
            p._unveilingBuff = 360;
        });
    },

    useSpecial: function (player, world) {
        const _w = world ?? window._world;
        const { enemies, showNotification } = _w ?? window;
        if ((player.specialCooldown || 0) > 0) return false;
        if (player.civilianForm) {
            if (typeof showNotification === 'function') showNotification("MASK BROKEN", "#888");
            return false;
        }
        const cost = 25 * (player.integrityCostMult || 1);
        if (player.integrity < cost) {
            if (typeof showNotification === 'function') showNotification("INSUFFICIENT LIGHT", "#888");
            return false;
        }
        player.integrity -= cost;

        if (typeof audioManager !== 'undefined') audioManager.play('special_light');
        if (typeof showNotification === 'function') showNotification("REVELATION", "#f1c40f");

        const radius = 400 * (player.revelationRadiusMult || 1);
        const duration = 600 + (player.revelationDurationBonus || 0); // 10s @60

        player.revelationActive = true;
        player.revelationTimer  = Math.max(player.revelationTimer || 0, duration);
        player._revelationRadius = radius;

        if (enemies) {
            let revealed = 0;
            enemies.forEach(e => {
                if (e.hp <= 0) return;
                if (Math.hypot(e.x - player.x, e.y - player.y) < radius) {
                    e._lightRevealed   = Math.max(e._lightRevealed || 0, duration);
                    e._lightVulnerable = Math.max(e._lightVulnerable || 0, duration);
                    revealed++;
                }
            });
            if (revealed > 0 && typeof saveData !== 'undefined' && saveData.global) {
                saveData.global.light_reveal_count = (saveData.global.light_reveal_count || 0) + revealed;
            }
        }

        if (typeof createExplosion === 'function') {
            createExplosion(player.x, player.y, '#ffffff', 60);
            createExplosion(player.x, player.y, '#f1c40f', 50);
        }

        player.specialCooldown = 840; // 14s
        player.setupSpecial();
        return true;
    },

    update: function (player, dx, dy, world) {
        const _w = world ?? window._world;
        const { enemies } = _w ?? window;
        const moving = Math.abs(dx || 0) > 0.05 || Math.abs(dy || 0) > 0.05;

        // Civilian Form tick
        if (player.civilianForm) {
            player.civilianTimer--;
            // Hard caps while civilian
            if (player.hp > player.civilianHpCap) player.hp = player.civilianHpCap;
            player.speedMultiplier = (2.0 / (player.stats.speed || 4.5));
            if (player.civilianTimer <= 0) {
                this._exitCivilianForm(player);
                player.speedMultiplier = 1.0;
            }
        } else {
            player.speedMultiplier = 1.0;
        }

        // Aurum Burn: golden trail while moving, drains Integrity/sec
        if (!player.civilianForm && player.aurumBurnEnabled && moving) {
            // 1 Integrity/sec = ~0.0167 per frame
            player.integrity = Math.max(0, player.integrity - (1 / 60));
            if (player.integrity < 10) player.aurumBurnEnabled = false; // safety
            // Spawn trail point every 4 frames
            if ((typeof frame !== 'undefined' ? frame : 0) % 4 === 0) {
                player.aurumTrail.push({ x: player.x, y: player.y, life: 120, maxLife: 120 });
                if (player.aurumTrail.length > 80) player.aurumTrail.shift();
            }
        } else if (!moving && player.integrity >= 15) {
            // Re-enable once safely above threshold
            player.aurumBurnEnabled = true;
        }

        // Trail damage tick & decay
        for (let i = player.aurumTrail.length - 1; i >= 0; i--) {
            const t = player.aurumTrail[i];
            t.life--;
            if (t.life <= 0) { player.aurumTrail.splice(i, 1); continue; }
            // Damage enemies inside trail point (every 10 frames per point)
            if (enemies && (typeof frame !== 'undefined' ? frame : 0) % 10 === 0) {
                const dps = 8 * (player.aurumBurnDpsMult || 1) * (player.damageMultiplier || 1);
                const tickDmg = dps / 6; // 6 ticks/sec when frame%10===0 -> 6 hits/sec
                enemies.forEach(e => {
                    if (e.hp <= 0) return;
                    if (Math.hypot(e.x - t.x, e.y - t.y) < 30) {
                        e.hp -= tickDmg;
                        if (e.hp <= 0 && typeof player.onKill === 'function') player.onKill(e);
                    }
                });
            }
        }

        // Revelation tick
        if (player.revelationActive) {
            player.revelationTimer--;
            if (player.revelationTimer <= 0) {
                player.revelationActive = false;
            }
        }

        // Tag enemies + draw gold outline on revealed targets, +30% dmg vulnerability
        if (enemies) {
            enemies.forEach(e => {
                if (e._lightRevealed && e._lightRevealed > 0) {
                    e._lightRevealed--;
                    // Re-apply vuln tag so other systems can read it briefly
                    e._lightVulnerable = Math.max(e._lightVulnerable || 0, 6);
                    if (window.ctx) {
                        const ctx = window.ctx;
                        ctx.save();
                        ctx.strokeStyle = 'rgba(241, 196, 15, 0.85)';
                        ctx.lineWidth = 2;
                        ctx.beginPath();
                        ctx.arc(e.x, e.y, (e.radius || 20) + 4, 0, Math.PI * 2);
                        ctx.stroke();
                        ctx.restore();
                    }
                }
                if (e._lightVulnerable && e._lightVulnerable > 0) e._lightVulnerable--;
                if (e._lightStun && e._lightStun > 0) {
                    e._lightStun--;
                    // Cheap stun: zero out velocity if present
                    if (typeof e.vx === 'number') e.vx *= 0.85;
                    if (typeof e.vy === 'number') e.vy *= 0.85;
                }
            });
        }

        // Apply +30% damage vulnerability via global enemy.takeDamage wrap (lazy install)
        if (!window._lightVulnInstalled && typeof Enemy !== 'undefined' && Enemy.prototype && Enemy.prototype.takeDamage) {
            const origET = Enemy.prototype.takeDamage;
            Enemy.prototype.takeDamage = function (amount, ...args) {
                let amt = amount;
                if (this._lightVulnerable && this._lightVulnerable > 0 && typeof amt === 'number') amt *= 1.30;
                return origET.call(this, amt, ...args);
            };
            window._lightVulnInstalled = true;
        }

        // Unveiling: stun all + buff allies; force civilian after
        if (player.unveilingActive) {
            player.unveilingTimer--;
            // White-gold tint overlay
            if (window.ctx && window.canvas) {
                const ctx = window.ctx;
                ctx.save();
                ctx.globalAlpha = 0.15 + Math.sin((typeof frame !== 'undefined' ? frame : 0) * 0.15) * 0.05;
                ctx.fillStyle = '#fff8c8';
                ctx.fillRect(0, 0, window.canvas.width, window.canvas.height);
                ctx.restore();
            }
            // Refresh stun + reveal each frame so all enemies that spawn mid-ult are hit too
            if (enemies) {
                enemies.forEach(e => {
                    if (e.hp <= 0) return;
                    e._lightStun       = Math.max(e._lightStun || 0, 30);
                    e._lightRevealed   = Math.max(e._lightRevealed || 0, 30);
                    e._lightVulnerable = Math.max(e._lightVulnerable || 0, 30);
                });
            }
            if (player.unveilingTimer <= 0) {
                player.unveilingActive = false;
                // Force into civilian form for remainder window
                this._enterCivilianForm(player);
                // Override civilian timer to 15s
                player.civilianTimer = 900;
            }
        }

        // Death during civilian = run-locked
        if (player.civilianForm && player.hp <= 0 && !player.maskLost) {
            player.maskLost = true;
            if (typeof showNotification === 'function') showNotification("THE MASK IS LOST", "#444");
        }

        // ── Visuals ─────────────────────────────────────────────────
        if (window.ctx) {
            const ctx = window.ctx;
            const t = (typeof frame !== 'undefined' ? frame : Date.now() * 0.06);

            // Aurum trail
            ctx.save();
            ctx.globalCompositeOperation = 'lighter';
            player.aurumTrail.forEach(p => {
                const a = (p.life / p.maxLife) * 0.55;
                const grad = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, 30);
                grad.addColorStop(0, `rgba(255, 230, 110, ${a})`);
                grad.addColorStop(1, 'rgba(255, 230, 110, 0)');
                ctx.fillStyle = grad;
                ctx.beginPath();
                ctx.arc(p.x, p.y, 30, 0, Math.PI * 2);
                ctx.fill();
            });
            ctx.restore();

            // Revelation expanding ring at cast
            if (player.revelationActive && player._revelationRadius) {
                const dur = 600 + (player.revelationDurationBonus || 0);
                const age = dur - player.revelationTimer;
                if (age < 30) {
                    const ringR = (age / 30) * player._revelationRadius;
                    ctx.save();
                    ctx.strokeStyle = 'rgba(255, 255, 220, 0.65)';
                    ctx.lineWidth = 6;
                    ctx.shadowColor = '#f1c40f';
                    ctx.shadowBlur  = 16;
                    ctx.beginPath();
                    ctx.arc(player.x, player.y, ringR, 0, Math.PI * 2);
                    ctx.stroke();
                    ctx.restore();
                }
                // Soft sphere fill that lingers
                ctx.save();
                const grd = ctx.createRadialGradient(player.x, player.y, 0, player.x, player.y, player._revelationRadius);
                grd.addColorStop(0, 'rgba(255, 240, 180, 0.05)');
                grd.addColorStop(0.7, 'rgba(255, 240, 180, 0.03)');
                grd.addColorStop(1, 'rgba(255, 240, 180, 0)');
                ctx.fillStyle = grd;
                ctx.beginPath();
                ctx.arc(player.x, player.y, player._revelationRadius, 0, Math.PI * 2);
                ctx.fill();
                ctx.restore();
            }

            // Civilian Form overlay: cracked-mask icon hovering, gray vignette
            if (player.civilianForm) {
                ctx.save();
                ctx.translate(player.x, player.y - (player.radius || 18) - 22);
                ctx.fillStyle = 'rgba(120, 120, 120, 0.85)';
                ctx.font = 'bold 16px sans-serif';
                ctx.textAlign = 'center';
                ctx.textBaseline = 'middle';
                ctx.fillText('🪞', 0, 0);
                ctx.restore();
            } else {
                // Faint inner glow halo when masked
                ctx.save();
                ctx.globalCompositeOperation = 'lighter';
                const r = (player.radius || 18) + 8 + Math.sin(t * 0.12) * 2;
                const grad = ctx.createRadialGradient(player.x, player.y, 2, player.x, player.y, r);
                grad.addColorStop(0, 'rgba(255, 240, 160, 0.35)');
                grad.addColorStop(1, 'rgba(255, 240, 160, 0)');
                ctx.fillStyle = grad;
                ctx.beginPath();
                ctx.arc(player.x, player.y, r, 0, Math.PI * 2);
                ctx.fill();
                ctx.restore();
            }
        }

        // Ally damage buff window
        if (player._unveilingBuff && player._unveilingBuff > 0) {
            player._unveilingBuff--;
            player.damageMultiplier = Math.max(player.damageMultiplier || 1, 1.5);
        } else if (player._unveilingBuff === 0) {
            player.damageMultiplier = 1.0;
            player._unveilingBuff = -1;
        }
    }
};
