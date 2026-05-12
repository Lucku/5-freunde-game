// Psycho Hero Logic
// Color: Teal (#1abc9c)
// Mechanic: Hysteria Gauge fills from damage and kills. When full, enter Hysteria Mode (6s) —
//           speed +40%, projectiles split into 3, nearby enemies confused.
// Special:  Mind Fracture — bouncing psychic bolt that confuses targets.

if (typeof BASE_HERO_STATS !== 'undefined') {
    if (!BASE_HERO_STATS['psycho']) {
        BASE_HERO_STATS['psycho'] = {
            color: '#1abc9c',
            hp: 45,
            speed: 5.5,
            rangeDmg: 35,
            meleeDmg: 90,
            rangeCd: 10,
            meleeCd: 90,
            projectileSpeed: 14,
            projectileSize: 5,
            knockback: 6,
            maxHysteria: 100,
            mindFractureBounces: 4
        };
    }
}

const PSYCHO_UPGRADE_POOL = [
    { id: 'health',             title: 'Manic Energy',     desc: 'Increase Max HP by 25 and Heal 20%.',  icon: '🧠' },
    { id: 'cooldown',           title: 'Racing Thoughts',  desc: 'Reduce Cooldowns by 10%.',             icon: '⚡' },
    { id: 'hysteria_gain',      title: 'Hypersensitive',   desc: 'Hysteria Gauge fills 25% faster.',     icon: '🌀' },
    { id: 'bounce',             title: 'Ricochet Mind',    desc: 'Mind Fracture bounces +1 target.',     icon: '🔀' },
    { id: 'speed',              title: 'Flight Response',  desc: 'Increase Movement Speed by 10%.',      icon: '💨' },
    { id: 'damage',             title: 'Unhinged',         desc: 'Increase damage by 10%.',              icon: '🔪' },
    { id: 'crit',               title: 'Snap',             desc: '+5% Crit Chance & +20% Crit Damage.',  icon: '💥' },
    { id: 'hysteria_duration',  title: 'Deep Break',       desc: 'Hysteria Mode lasts +2s.',             icon: '⏳' }
];

const PSYCHO_PERM_UPGRADES = {
    health:  { name: "Fractured Mind",  desc: "+5 Starting HP",        baseCost: 1000, costMult: 1.2 },
    greed:   { name: "Magpie",          desc: "+5% Gold Gain",         baseCost: 2000, costMult: 1.3 },
    power:   { name: "Raw Edge",        desc: "+1% Damage",            baseCost: 5000, costMult: 1.4 },
    swift:   { name: "Live Wire",       desc: "+1% Speed",             baseCost: 3000, costMult: 1.3 },
    defense: { name: "Erratic Dodge",   desc: "+1% Damage Reduction",  baseCost: 4000, costMult: 1.5 },
    wisdom:  { name: "Obsessive Focus", desc: "+2% XP Gain",           baseCost: 2500, costMult: 1.3 }
};

if (typeof window.HERO_LOGIC === 'undefined') window.HERO_LOGIC = {};

window.HERO_LOGIC['psycho'] = {
    upgradePool: PSYCHO_UPGRADE_POOL,

    getSkillTreeWeights: function () {
        return {
            'COOLDOWN':       0.20,
            'HYSTERIA_GAIN':  0.20,
            'DAMAGE':         0.15,
            'SPEED':          0.15,
            'HEALTH':         0.10,
            'BOUNCE':         0.10,
            'CRIT':           0.10
        };
    },

    getSkillNodeDetails: function (type, value, desc) {
        if (type === 'HYSTERIA_GAIN') return { val: 0.10, desc: "+10% Hysteria Gain" };
        if (type === 'BOUNCE')        return { val: 1,    desc: "+1 Mind Fracture bounce" };
        return { val: value, desc: desc };
    },

    applySkillNode: function (base, node) {
        if (node.type === 'HYSTERIA_GAIN') {
            base.hysteriaGainMult = (base.hysteriaGainMult || 1) * (1 + node.value);
        }
        if (node.type === 'BOUNCE') {
            base.mindFractureBounces = (base.mindFractureBounces || 4) + node.value;
        }
    },

    applyUpgrade: function (player, type, world) {
        if (type === 'hysteria_gain') {
            player.hysteriaGainMult = (player.hysteriaGainMult || 1) * 1.25;
            return true;
        }
        if (type === 'bounce') {
            player.mindFractureBounces = (player.mindFractureBounces || 4) + 1;
            return true;
        }
        if (type === 'hysteria_duration') {
            player.hysteriaMaxDuration = (player.hysteriaMaxDuration || 360) + 120;
            return true;
        }
        if (type === 'transform') {
            player.transformActive = true;
            player.currentForm = 'DELIRIUM';
            player.deliriumTimer = 600; // 10s
            // Activation burst
            if (typeof createExplosion === 'function') {
                createExplosion(player.x, player.y, '#ffffff', 60);
                createExplosion(player.x, player.y, '#1abc9c', 50);
            }
            if (typeof showNotification === 'function') showNotification("DELIRIUM RISING", "#1abc9c");
            if (typeof audioManager !== 'undefined') audioManager.play('hysteria_activate');
            return true;
        }
        return false;
    },

    init: function (player) {
        const _self = this;

        // Altar convergence helper
        const altarActive = (typeof saveData !== 'undefined' && saveData.altar && saveData.altar.active) ? saveData.altar.active : [];
        const hasAltar = (id) => altarActive.includes(id);

        // Resource state
        player.hysteriaGauge       = 0;
        player.maxHysteria         = player.stats.maxHysteria || 100;
        player.hysteriaActive      = false;
        player.hysteriaDuration    = 0;
        player.hysteriaMaxDuration = 360; // 6 seconds @ 60fps
        // Mental Loop convergence: +50% Hysteria duration
        if (hasAltar('cv_dod_psy_time')) player.hysteriaMaxDuration = Math.floor(player.hysteriaMaxDuration * 1.5);
        player.hysteriaGainMult    = 1.0;
        player.mindFractureBounces = player.stats.mindFractureBounces || 4;

        player.damageMultiplier = 1.0;
        player.speedMultiplier  = 1.0;

        // Hook takeDamage to charge gauge
        const origTakeDamage = player.takeDamage ? player.takeDamage.bind(player) : null;
        if (origTakeDamage) {
            player.takeDamage = function (amount, ...args) {
                const result = origTakeDamage(amount, ...args);
                if (!player.hysteriaActive && typeof amount === 'number') {
                    const gain = amount * 1.5 * (player.hysteriaGainMult || 1);
                    player.hysteriaGauge = Math.min(player.maxHysteria, player.hysteriaGauge + gain);
                    if (player.hysteriaGauge >= player.maxHysteria) {
                        _self._activateHysteria(player);
                    }
                    if (typeof player.setupSpecial === 'function') player.setupSpecial();
                }
                return result;
            };
        }

        // Hook onKill to charge gauge
        const origOnKill = player.onKill ? player.onKill.bind(player) : () => {};
        player.onKill = function (enemy) {
            origOnKill(enemy);
            if (!player.hysteriaActive) {
                const gain = 8 * (player.hysteriaGainMult || 1);
                player.hysteriaGauge = Math.min(player.maxHysteria, player.hysteriaGauge + gain);
                if (player.hysteriaGauge >= player.maxHysteria) {
                    _self._activateHysteria(player);
                }
                if (typeof player.setupSpecial === 'function') player.setupSpecial();
            }
        };

        // Hook shoot to split projectiles 3x during Hysteria + play sfx
        const origShoot = player.shoot.bind(player);
        player.shoot = function () {
            if (typeof audioManager !== 'undefined') {
                const now = Date.now();
                if (!player._lastPsychoAttackSfx || now - player._lastPsychoAttackSfx >= 200) {
                    audioManager.play('attack_psycho');
                    player._lastPsychoAttackSfx = now;
                }
            }

            const initialLen = typeof projectiles !== 'undefined' ? projectiles.length : 0;
            origShoot();
            const finalLen = typeof projectiles !== 'undefined' ? projectiles.length : 0;

            // Split into 3 erratic shots while in Hysteria, or 5 in DELIRIUM
            const inDelirium = player.transformActive && player.currentForm === 'DELIRIUM';
            const splitMode = inDelirium ? 'delirium' : (player.hysteriaActive ? 'hysteria' : null);
            if (splitMode && finalLen > initialLen) {
                const newProjs = [];
                const offsets = (splitMode === 'delirium')
                    ? [-0.42, -0.20, 0.20, 0.42]
                    : [-0.26, 0.26];
                for (let i = initialLen; i < finalLen; i++) {
                    const p = projectiles[i];
                    const baseAng = Math.atan2(p.velocity.y, p.velocity.x);
                    const sp = Math.hypot(p.velocity.x, p.velocity.y);
                    offsets.forEach(off => {
                        const ang = baseAng + off + (Math.random() - 0.5) * 0.15;
                        const np = Projectile.acquire(p.x, p.y, { x: Math.cos(ang) * sp, y: Math.sin(ang) * sp },
                            p.damage * 0.7, '#ffffff', p.radius, p.type, p.knockback, false);
                        newProjs.push(np);
                    });
                }
                newProjs.forEach(np => projectiles.push(np));
            }
        };

        player.getFormName = function () { return 'DELIRIUM'; };

        player.customSpecial = () => _self.useSpecial(player);
        player.customUpdate = (dx, dy) => { _self.update(player, dx, dy); return false; };

        // Special UI
        const origSetupSpecial = player.setupSpecial ? player.setupSpecial.bind(player) : null;
        player.setupSpecial = function () {
            if (this.isCPU) {
                this.specialName = "MIND FRACTURE";
                return;
            }
            const iconEl = document.getElementById('special-icon');
            const container = document.getElementById('special-container');
            this.specialName = "MIND FRACTURE";
            if (iconEl) iconEl.innerText = "🧠";

            if (container) {
                const pct = (this.hysteriaGauge / this.maxHysteria) * 100;
                const onCd = (this.specialCooldown || 0) > 0;
                const color = this.hysteriaActive ? "#ffffff" : "#1abc9c";
                container.style.background = `linear-gradient(to top, ${color} ${pct}%, rgba(0,0,0,0.5) ${pct}%)`;
                container.style.borderColor = color;
                container.style.boxShadow = (!onCd && pct >= 100) ? `0 0 15px ${color}` : "none";
            }
            if (iconEl) {
                const onCd = (this.specialCooldown || 0) > 0;
                if (onCd) {
                    iconEl.style.filter = "grayscale(1)";
                    iconEl.style.opacity = "0.5";
                } else {
                    iconEl.style.filter = this.hysteriaActive
                        ? "brightness(1.5) drop-shadow(0 0 10px #ffffff)"
                        : "brightness(1.2) drop-shadow(0 0 6px #1abc9c)";
                    iconEl.style.opacity = "1";
                }
            }
        };

        player.setupSpecial();
    },

    _activateHysteria: function (player) {
        player.hysteriaActive    = true;
        player.hysteriaDuration  = player.hysteriaMaxDuration || 360;
        player.hysteriaGauge     = 0;
        player._hysteriaSpeedBoost = 0.4;

        if (typeof audioManager !== 'undefined') audioManager.play('hysteria_activate');
        if (typeof showNotification === 'function') showNotification("HYSTERIA RISING", "#1abc9c");
        if (typeof createExplosion === 'function') {
            createExplosion(player.x, player.y, '#1abc9c', 50);
            createExplosion(player.x, player.y, '#ffffff', 40);
        }
    },

    useSpecial: function (player, world) {
        const _w = world ?? window._world;
        const { enemies, createExplosion, showNotification } = _w ?? window;

        if ((player.specialCooldown || 0) > 0) return false;

        // Find nearest enemy as initial target
        const liveEnemies = (enemies || []).filter(e => e.hp > 0);
        if (liveEnemies.length === 0) {
            if (typeof showNotification === 'function') showNotification("NO TARGETS", "#555");
            return false;
        }

        if (typeof audioManager !== 'undefined') audioManager.play('special_psycho');

        const maxBounces = player.mindFractureBounces || 4;
        const dmgPerHit = (player.stats.rangeDmg || 35) * 1.4 * (player.damageMultiplier || 1);
        const visited = new Set();
        let curX = player.x, curY = player.y;
        let bouncesLeft = maxBounces;

        // Build chain
        const chainPoints = [{ x: curX, y: curY }];
        while (bouncesLeft > 0) {
            let best = null;
            let bestDist = Infinity;
            for (const e of liveEnemies) {
                if (visited.has(e)) continue;
                const d = Math.hypot(e.x - curX, e.y - curY);
                if (d < 700 && d < bestDist) { bestDist = d; best = e; }
            }
            if (!best) break;
            visited.add(best);
            chainPoints.push({ x: best.x, y: best.y, enemy: best });
            best.hp -= dmgPerHit;
            best._psychoConfused = 120; // 2s confusion
            if (typeof createExplosion === 'function') createExplosion(best.x, best.y, '#1abc9c', 12);
            if (best.hp <= 0 && typeof player.onKill === 'function') player.onKill(best);
            curX = best.x; curY = best.y;
            bouncesLeft--;
        }

        // Visual: draw zap chain on canvas as a quick flash (handled by adding to a global FX list if available;
        // otherwise do an immediate canvas burst)
        if (window.ctx && chainPoints.length > 1) {
            const ctx = window.ctx;
            ctx.save();
            ctx.strokeStyle = '#ffffff';
            ctx.shadowColor = '#1abc9c';
            ctx.shadowBlur = 16;
            ctx.lineWidth = 3;
            ctx.beginPath();
            ctx.moveTo(chainPoints[0].x, chainPoints[0].y);
            for (let i = 1; i < chainPoints.length; i++) {
                const cp = chainPoints[i];
                ctx.lineTo(cp.x + (Math.random() - 0.5) * 12, cp.y + (Math.random() - 0.5) * 12);
            }
            ctx.stroke();
            ctx.restore();
        }

        player.specialCooldown = 600; // 10s cooldown
        player.setupSpecial();
        return true;
    },

    update: function (player, dx, dy, world) {
        const _w = world ?? window._world;
        const { enemies } = _w ?? window;

        // DELIRIUM Ultimate
        if (player.transformActive && player.currentForm === 'DELIRIUM') {
            player.deliriumTimer = (player.deliriumTimer || 0) - 1;
            // Permanent confusion + speed boost while active
            player.speedMultiplier = Math.max(player.speedMultiplier || 1, 1.5);
            if (enemies) {
                enemies.forEach(e => {
                    if (e.hp <= 0) return;
                    e._psychoConfused = Math.max(e._psychoConfused || 0, 30);
                });
            }
            // Distortion vignette
            if (window.ctx) {
                const ctx = window.ctx;
                const t = (typeof frame !== 'undefined' ? frame : Date.now() * 0.06);
                ctx.save();
                ctx.globalAlpha = 0.25 + Math.sin(t * 0.4) * 0.1;
                ctx.fillStyle = '#1abc9c';
                ctx.fillRect(0, 0, (typeof window !== 'undefined' && window.canvas) ? window.canvas.width : 1920, 80);
                ctx.fillRect(0, ((typeof window !== 'undefined' && window.canvas) ? window.canvas.height : 1080) - 80, (typeof window !== 'undefined' && window.canvas) ? window.canvas.width : 1920, 80);
                ctx.restore();
            }
            if (player.deliriumTimer <= 0) {
                player.transformActive = false;
                player.currentForm = 'NONE';
                player.speedMultiplier = 1.0;
                if (typeof showNotification === 'function') showNotification("DELIRIUM FADES", "#888");
            }
        }

        // Hysteria duration tick
        if (player.hysteriaActive) {
            player.hysteriaDuration--;

            // Apply movement speed boost
            player.speedMultiplier = 1.0 + (player._hysteriaSpeedBoost || 0.4);

            // Confuse nearby enemies
            if (enemies) {
                const range = 350;
                enemies.forEach(e => {
                    if (e.hp <= 0) return;
                    if (Math.hypot(e.x - player.x, e.y - player.y) < range) {
                        e._psychoConfused = Math.max(e._psychoConfused || 0, 30);
                    }
                });
            }

            if (player.hysteriaDuration <= 0) {
                player.hysteriaActive = false;
                player.hysteriaDuration = 0;
                player.speedMultiplier = 1.0;
                if (typeof showNotification === 'function') showNotification("HYSTERIA FADES", "#888");
                if (typeof player.setupSpecial === 'function') player.setupSpecial();
            }
        }

        // Altar convergence flags (recomputed per frame to support mid-run unlock)
        const _altActive = (typeof saveData !== 'undefined' && saveData.altar && saveData.altar.active) ? saveData.altar.active : [];
        const _hasBurningMind  = _altActive.includes('cv_dod_psy_fire');
        const _hasMentalLoop   = _altActive.includes('cv_dod_psy_time');
        const _hasTrio         = _altActive.includes('cv_dod_trio');

        // Apply confusion to enemies — push them away from player instead of toward
        if (enemies) {
            enemies.forEach(e => {
                if (e._psychoConfused && e._psychoConfused > 0) {
                    e._psychoConfused--;
                    const ang = Math.atan2(e.y - player.y, e.x - player.x);
                    const slowMult = _hasMentalLoop ? 0.7 : 1.0;
                    e.x += Math.cos(ang) * 0.6 * slowMult;
                    e.y += Math.sin(ang) * 0.6 * slowMult;
                    // Burning Mind: 3 dmg/sec while confused
                    if (_hasBurningMind && (typeof frame !== 'undefined' ? frame : 0) % 20 === 0) {
                        e.hp -= 1 * (player.damageMultiplier || 1);
                        if (e.hp <= 0 && typeof player.onKill === 'function') player.onKill(e);
                    }
                    // Trio: tag for +25% damage taken (read by enemy.takeDamage hooks elsewhere; safe no-op when none read it)
                    if (_hasTrio) e._dodVulnerable = 30;
                    // Draw swirling teal icon above enemy
                    if (window.ctx) {
                        const ctx = window.ctx;
                        const t = (typeof frame !== 'undefined' ? frame : Date.now() * 0.06);
                        ctx.save();
                        ctx.translate(e.x, e.y - (e.radius || 20) - 18);
                        ctx.rotate(t * 0.2);
                        ctx.strokeStyle = '#1abc9c';
                        ctx.lineWidth = 2;
                        ctx.shadowColor = '#1abc9c';
                        ctx.shadowBlur = 6;
                        ctx.beginPath();
                        ctx.arc(0, 0, 8, 0, Math.PI * 1.4);
                        ctx.stroke();
                        ctx.beginPath();
                        ctx.arc(0, 0, 5, Math.PI, Math.PI * 2.4);
                        ctx.stroke();
                        ctx.restore();
                    }
                }
            });
        }

        // Hysteria visual aura when active
        if (player.hysteriaActive && window.ctx) {
            const ctx = window.ctx;
            const t = (typeof frame !== 'undefined' ? frame : Date.now() * 0.06);
            ctx.save();
            ctx.translate(player.x, player.y);
            for (let i = 0; i < 4; i++) {
                const r = 25 + i * 8 + Math.sin(t * 0.3 + i) * 4;
                ctx.strokeStyle = `rgba(255, 255, 255, ${0.35 - i * 0.07})`;
                ctx.lineWidth = 2;
                ctx.beginPath();
                ctx.arc(0, 0, r, 0, Math.PI * 2);
                ctx.stroke();
            }
            ctx.restore();
        }
    }
};
