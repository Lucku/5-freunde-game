// Smoke Hero Logic
// Color: Slate Gray (#5a5a6e)
// Mechanic: Each dash drops a Smoke Cloud (radius 60, 4s, max 3). Enemies inside slow 40%
//           and lose targeting accuracy.
// Special:  Blackout — burst cloud (radius 120) that damages and blinds enemies for 3s.

if (typeof BASE_HERO_STATS !== 'undefined') {
    if (!BASE_HERO_STATS['smoke']) {
        BASE_HERO_STATS['smoke'] = {
            color: '#5a5a6e',
            hp: 65,
            speed: 5,
            rangeDmg: 20,
            meleeDmg: 100,
            rangeCd: 18,
            meleeCd: 100,
            projectileSpeed: 11,
            projectileSize: 6,
            knockback: 5,
            cloudRadius: 60,
            cloudLifetime: 240,
            cloudMax: 3
        };
    }
}

const SMOKE_UPGRADE_POOL = [
    { id: 'health',         title: 'Dense Vapor',  desc: 'Increase Max HP by 25 and Heal 20%.', icon: '💨' },
    { id: 'cloud_size',     title: 'Thick Cloud',  desc: 'Smoke cloud radius +20%.',            icon: '🌫️' },
    { id: 'cloud_duration', title: 'Lingering',    desc: 'Smoke clouds last +1.5s.',            icon: '⏳' },
    { id: 'cooldown',       title: 'Flash Step',   desc: 'Reduce Cooldowns by 10%.',            icon: '⚡' },
    { id: 'speed',          title: 'Drift',        desc: 'Increase Movement Speed by 10%.',     icon: '🌀' },
    { id: 'damage',         title: 'Toxic Haze',   desc: 'Damage +10%, clouds deal 2 DPS.',     icon: '☠️' },
    { id: 'cloud_count',    title: 'Smog Screen',  desc: '+1 simultaneous cloud.',              icon: '➕' },
    { id: 'crit',           title: 'Blindside',    desc: '+5% Crit Chance & +20% Crit Damage.', icon: '🎯' }
];

const SMOKE_PERM_UPGRADES = {
    health:  { name: "Iron Lung",     desc: "+5 Starting HP",       baseCost: 1000, costMult: 1.2 },
    greed:   { name: "Murky Profits", desc: "+5% Gold Gain",        baseCost: 2000, costMult: 1.3 },
    power:   { name: "Corrosive",     desc: "+1% Damage",           baseCost: 5000, costMult: 1.4 },
    swift:   { name: "Vapor Trail",   desc: "+1% Speed",            baseCost: 3000, costMult: 1.3 },
    defense: { name: "Cloud Cover",   desc: "+1% Damage Reduction", baseCost: 4000, costMult: 1.5 },
    wisdom:  { name: "Unseen Study",  desc: "+2% XP Gain",          baseCost: 2500, costMult: 1.3 }
};

if (typeof window.HERO_LOGIC === 'undefined') window.HERO_LOGIC = {};

window.HERO_LOGIC['smoke'] = {
    upgradePool: SMOKE_UPGRADE_POOL,

    getSkillTreeWeights: function () {
        return {
            'CLOUD_SIZE':     0.20,
            'CLOUD_DURATION': 0.20,
            'DAMAGE':         0.15,
            'COOLDOWN':       0.15,
            'SPEED':          0.15,
            'CLOUD_COUNT':    0.10,
            'HEALTH':         0.05
        };
    },

    getSkillNodeDetails: function (type, value, desc) {
        if (type === 'CLOUD_SIZE')     return { val: 0.10, desc: "+10% Cloud Radius" };
        if (type === 'CLOUD_DURATION') return { val: 30,   desc: "+0.5s Cloud Duration" };
        if (type === 'CLOUD_COUNT')    return { val: 1,    desc: "+1 Simultaneous Cloud" };
        return { val: value, desc: desc };
    },

    applySkillNode: function (base, node) {
        if (node.type === 'CLOUD_SIZE') {
            base.cloudRadius = (base.cloudRadius || 60) * (1 + node.value);
        }
        if (node.type === 'CLOUD_DURATION') {
            base.cloudLifetime = (base.cloudLifetime || 240) + node.value;
        }
        if (node.type === 'CLOUD_COUNT') {
            base.cloudMax = (base.cloudMax || 3) + node.value;
        }
    },

    applyUpgrade: function (player, type, world) {
        if (type === 'cloud_size') {
            player.cloudRadius = (player.cloudRadius || 60) * 1.2;
            return true;
        }
        if (type === 'cloud_duration') {
            player.cloudLifetime = (player.cloudLifetime || 240) + 90;
            return true;
        }
        if (type === 'cloud_count') {
            player.cloudMax = (player.cloudMax || 3) + 1;
            return true;
        }
        if (type === 'damage') {
            player.cloudDealsDot = true;
            return false; // let default damage upgrade also apply
        }
        if (type === 'transform') {
            player.transformActive = true;
            player.currentForm = 'INK STORM';
            player.inkStormTimer = 600; // 10s
            if (typeof createExplosion === 'function') {
                createExplosion(player.x, player.y, '#0f0f14', 80);
                createExplosion(player.x, player.y, '#5a5a6e', 60);
            }
            if (typeof showNotification === 'function') showNotification("INK STORM", "#0f0f14");
            if (typeof audioManager !== 'undefined') audioManager.play('special_smoke');
            return true;
        }
        return false;
    },

    init: function (player) {
        const _self = this;

        player.smokeClouds   = [];
        player.cloudRadius   = player.stats.cloudRadius || 60;
        player.cloudLifetime = player.stats.cloudLifetime || 240;
        player.cloudMax      = player.stats.cloudMax || 3;
        player.cloudDealsDot = false;

        player.damageMultiplier = 1.0;
        player.speedMultiplier  = 1.0;

        // Hook shoot for SFX
        const origShoot = player.shoot.bind(player);
        player.shoot = function () {
            if (typeof audioManager !== 'undefined') {
                const now = Date.now();
                if (!player._lastSmokeAttackSfx || now - player._lastSmokeAttackSfx >= 200) {
                    audioManager.play('attack_smoke');
                    player._lastSmokeAttackSfx = now;
                }
            }
            origShoot();
        };

        // Hook dash to spawn smoke cloud at origin
        const origDash = player.dash.bind(player);
        player.dash = function (...args) {
            const beforeFrames = player.dashFrames;
            const beforeCd = player.dashCooldown;
            const ox = player.x, oy = player.y;
            origDash(...args);
            // Detect successful dash: dashFrames went from 0 to >0
            if (player.dashFrames > beforeFrames || (beforeFrames === 0 && player.isDashing)) {
                if (typeof audioManager !== 'undefined') audioManager.play('dash_smoke');
                _self._spawnCloud(player, ox, oy);
            }
        };

        player.getFormName = function () { return 'INK STORM'; };

        player.customSpecial = () => _self.useSpecial(player);
        player.customUpdate = (dx, dy) => { _self.update(player, dx, dy); return false; };

        // Special UI
        player.setupSpecial = function () {
            if (this.isCPU) {
                this.specialName = "BLACKOUT";
                return;
            }
            const iconEl = document.getElementById('special-icon');
            const container = document.getElementById('special-container');
            this.specialName = "BLACKOUT";
            if (iconEl) iconEl.innerText = "🌫️";

            if (container) {
                const onCd = (this.specialCooldown || 0) > 0;
                container.style.background = onCd ? "rgba(0,0,0,0.5)" : "rgba(90, 90, 110, 0.7)";
                container.style.borderColor = "#5a5a6e";
                container.style.boxShadow = onCd ? "none" : "0 0 12px #5a5a6e";
            }
            if (iconEl) {
                const onCd = (this.specialCooldown || 0) > 0;
                if (onCd) {
                    iconEl.style.filter = "grayscale(1)";
                    iconEl.style.opacity = "0.5";
                } else {
                    iconEl.style.filter = "brightness(1.2) drop-shadow(0 0 6px #888899)";
                    iconEl.style.opacity = "1";
                }
            }
        };

        player.setupSpecial();
    },

    _spawnCloud: function (player, x, y) {
        // Maintain max cloud count — drop oldest
        while (player.smokeClouds.length >= player.cloudMax) {
            player.smokeClouds.shift();
        }

        const _alt = (typeof saveData !== 'undefined' && saveData.altar && saveData.altar.active) ? saveData.altar.active : [];

        // Toxic Smog: clouds last +1s and get poison flag
        let life = player.cloudLifetime;
        if (_alt.includes('cv_dod_smk_poison')) life += 60;

        player.smokeClouds.push({
            x, y,
            radius: player.cloudRadius,
            life,
            maxLife: life,
            poison: _alt.includes('cv_dod_smk_poison')
        });

        // Smoke Bomb: 60-damage fire burst at cloud origin
        if (_alt.includes('cv_dod_smk_fire') && typeof enemies !== 'undefined') {
            const burstDmg = 60 * (player.damageMultiplier || 1);
            enemies.forEach(e => {
                if (e.hp <= 0) return;
                if (Math.hypot(e.x - x, e.y - y) < player.cloudRadius) {
                    e.hp -= burstDmg;
                    if (e.hp <= 0 && typeof player.onKill === 'function') player.onKill(e);
                }
            });
            if (typeof createExplosion === 'function') createExplosion(x, y, '#e67e22', player.cloudRadius * 0.6);
        }
    },

    useSpecial: function (player, world) {
        const _w = world ?? window._world;
        const { enemies, showNotification } = _w ?? window;

        if ((player.specialCooldown || 0) > 0) return false;

        if (typeof audioManager !== 'undefined') audioManager.play('special_smoke');
        if (typeof showNotification === 'function') showNotification("BLACKOUT", "#5a5a6e");

        const burstRadius = 120;
        const dmg = (player.stats.rangeDmg || 20) * 1.0 * (player.damageMultiplier || 1);

        if (enemies) {
            enemies.forEach(e => {
                if (e.hp <= 0) return;
                if (Math.hypot(e.x - player.x, e.y - player.y) < burstRadius) {
                    e.hp -= dmg;
                    e._smokeBlind = 180; // 3s blind
                    if (e.hp <= 0 && typeof player.onKill === 'function') player.onKill(e);
                }
            });
        }

        if (typeof createExplosion === 'function') {
            createExplosion(player.x, player.y, '#5a5a6e', 60);
            createExplosion(player.x, player.y, '#0f0f14', 45);
        }

        // Drop a big cloud at player position
        player.smokeClouds.push({
            x: player.x, y: player.y,
            radius: burstRadius,
            life: 240,
            maxLife: 240,
            isBlackout: true
        });
        while (player.smokeClouds.length > player.cloudMax) player.smokeClouds.shift();

        player.specialCooldown = 720; // 12s
        player.setupSpecial();
        return true;
    },

    update: function (player, dx, dy, world) {
        const _w = world ?? window._world;
        const { enemies } = _w ?? window;

        // INK STORM Ultimate — follow-cloud + global blind
        if (player.transformActive && player.currentForm === 'INK STORM') {
            player.inkStormTimer = (player.inkStormTimer || 0) - 1;
            // Apply global blind to every enemy each frame
            if (enemies) {
                enemies.forEach(e => {
                    if (e.hp <= 0) return;
                    e._smokeBlind = Math.max(e._smokeBlind || 0, 30);
                    // Slow + DoT for enemies near the player (within 200px traveling cloud)
                    const d = Math.hypot(e.x - player.x, e.y - player.y);
                    if (d < 200) {
                        e._smokeSlowed = 5;
                        if ((typeof frame !== 'undefined' ? frame : 0) % 30 === 0) {
                            e.hp -= 4 * (player.damageMultiplier || 1);
                            if (e.hp <= 0 && typeof player.onKill === 'function') player.onKill(e);
                        }
                    }
                });
            }
            // Draw the moving ink-storm cloud
            if (window.ctx) {
                const ctx = window.ctx;
                const t = (typeof frame !== 'undefined' ? frame : Date.now() * 0.06);
                ctx.save();
                ctx.translate(player.x, player.y);
                const rg = ctx.createRadialGradient(0, 0, 20, 0, 0, 200);
                rg.addColorStop(0,   'rgba(15, 15, 20, 0.55)');
                rg.addColorStop(0.5, 'rgba(15, 15, 20, 0.35)');
                rg.addColorStop(1,   'rgba(15, 15, 20, 0)');
                ctx.fillStyle = rg;
                ctx.beginPath();
                ctx.arc(0, 0, 200, 0, Math.PI * 2);
                ctx.fill();
                // Slow swirl ring
                ctx.rotate(t * 0.02);
                ctx.strokeStyle = 'rgba(140, 140, 160, 0.35)';
                ctx.lineWidth = 2;
                ctx.beginPath();
                ctx.arc(0, 0, 160, 0, Math.PI * 1.6);
                ctx.stroke();
                ctx.restore();
            }
            if (player.inkStormTimer <= 0) {
                player.transformActive = false;
                player.currentForm = 'NONE';
                if (typeof showNotification === 'function') showNotification("INK STORM CLEARS", "#888");
            }
        }

        // Update clouds
        for (let i = player.smokeClouds.length - 1; i >= 0; i--) {
            const c = player.smokeClouds[i];
            c.life--;
            if (c.life <= 0) {
                player.smokeClouds.splice(i, 1);
                continue;
            }
        }

        // Altar convergence checks (per-frame so mid-run unlock works)
        const _altS = (typeof saveData !== 'undefined' && saveData.altar && saveData.altar.active) ? saveData.altar.active : [];
        const _hasSpore  = _altS.includes('cv_dod_smk_plant');
        const _hasToxic  = _altS.includes('cv_dod_smk_poison');
        const _hasDust   = _altS.includes('cv_dod_smk_earth');
        const _hasTrioS  = _altS.includes('cv_dod_trio');

        // Spore Cloud: heal player when standing inside own cloud
        if (_hasSpore && (typeof frame !== 'undefined' ? frame : 0) % 30 === 0 && typeof player.hp === 'number') {
            const inOwnCloud = player.smokeClouds.some(c => Math.hypot(player.x - c.x, player.y - c.y) < c.radius);
            if (inOwnCloud && player.hp < (player.maxHp || player.hp)) {
                player.hp = Math.min(player.maxHp || player.hp, player.hp + 1);
            }
        }

        // Apply cloud effects to enemies
        if (enemies) {
            enemies.forEach(e => {
                if (e.hp <= 0) return;
                let inCloud = false;
                let cloudIsPoison = false;
                for (const c of player.smokeClouds) {
                    if (Math.hypot(e.x - c.x, e.y - c.y) < c.radius) {
                        inCloud = true;
                        if (c.poison) cloudIsPoison = true;
                        // Toxic Haze DPS upgrade
                        if (player.cloudDealsDot && (typeof frame !== 'undefined' ? frame : 0) % 30 === 0) {
                            e.hp -= 2 * (player.damageMultiplier || 1);
                            if (e.hp <= 0 && typeof player.onKill === 'function') player.onKill(e);
                        }
                        break;
                    }
                }
                // Toxic Smog convergence: 4 dmg/sec for enemies in poison clouds
                if (_hasToxic && cloudIsPoison && (typeof frame !== 'undefined' ? frame : 0) % 15 === 0) {
                    e.hp -= 1 * (player.damageMultiplier || 1);
                    if (e.hp <= 0 && typeof player.onKill === 'function') player.onKill(e);
                }
                // Dust Cloud convergence: enemies in clouds can't fire ranged
                if (_hasDust && inCloud) e._smokeRangedLock = 5;
                // Trio: blinded enemies get vulnerability tag
                if (_hasTrioS && e._smokeBlind && e._smokeBlind > 0) e._dodVulnerable = 30;
                if (inCloud) {
                    e._smokeSlowed = 5; // tag for several frames
                }
                // Decay slow tag
                if (e._smokeSlowed && e._smokeSlowed > 0) {
                    e._smokeSlowed--;
                    // Push enemy in slight random direction (loss of accuracy)
                    if ((typeof frame !== 'undefined' ? frame : 0) % 6 === 0) {
                        const ang = Math.random() * Math.PI * 2;
                        e.x += Math.cos(ang) * 0.4;
                        e.y += Math.sin(ang) * 0.4;
                    }
                }
                // Decay blind tag
                if (e._smokeBlind && e._smokeBlind > 0) {
                    e._smokeBlind--;
                }
            });
        }

        // Draw clouds
        if (window.ctx) {
            const ctx = window.ctx;
            const t = (typeof frame !== 'undefined' ? frame : Date.now() * 0.06);
            player.smokeClouds.forEach(c => {
                const alpha = Math.min(0.5, c.life / 60);
                ctx.save();
                ctx.translate(c.x, c.y);
                // Pulsing inner gradient
                const grad = ctx.createRadialGradient(0, 0, 5, 0, 0, c.radius);
                const baseCol = c.isBlackout ? '15, 15, 20' : '60, 60, 75';
                grad.addColorStop(0,   `rgba(${baseCol}, ${alpha * 0.9})`);
                grad.addColorStop(0.6, `rgba(${baseCol}, ${alpha * 0.5})`);
                grad.addColorStop(1,   `rgba(${baseCol}, 0)`);
                ctx.fillStyle = grad;
                ctx.beginPath();
                ctx.arc(0, 0, c.radius, 0, Math.PI * 2);
                ctx.fill();
                // Slow swirl rings
                ctx.rotate(t * 0.01);
                ctx.strokeStyle = `rgba(140, 140, 160, ${alpha * 0.3})`;
                ctx.lineWidth = 1.5;
                ctx.beginPath();
                ctx.arc(0, 0, c.radius * 0.7, 0, Math.PI * 1.5);
                ctx.stroke();
                ctx.restore();
            });
        }
    }
};
