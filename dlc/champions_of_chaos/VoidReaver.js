// Void Reaver (Entropy) Hero Logic
// Name: VOID
// Concept: Melee Glitch Assassin.
// Unique: Melee attacks create rifts. Projectile stats create "Echoes" (Clones). Special is "Realm Shift".

if (typeof BASE_HERO_STATS !== 'undefined') {
    if (!BASE_HERO_STATS['void']) {
        BASE_HERO_STATS['void'] = {
            color: '#2c3e50',
            hp: 75,
            speed: 4.5,
            rangeDmg: 15,
            meleeDmg: 120,
            rangeCd: 40,
            meleeCd: 30, // Very fast melee
            projectileSpeed: 10,
            projectileSize: 5,
            knockback: 5
        };
    }
}

// --- CUSTOM UPGRADE POOLS ---

const VOID_UPGRADE_POOL = [
    { id: 'health', title: 'Corrupted Heart', desc: 'Increase Max HP by 25 and Heal 20%.', icon: '🖤' },
    { id: 'radius', title: 'Rift Size', desc: 'Increase Melee/Glitch Area by 25%.', icon: '🌌' },
    { id: 'projectile', title: 'Multi-Thread', desc: '+1 Passive Bolt & +1 Melee Echo.', icon: '👻' },
    { id: 'speed', title: 'Glitch Step', desc: 'Increase Movement Speed by 10%.', icon: '⚡' },
    { id: 'cooldown', title: 'Overclock', desc: 'Reduce Cooldowns by 10%.', icon: '⏱️' },
    { id: 'defense', title: 'Firewall', desc: 'Reduce incoming damage by 5%.', icon: '🛡️' },
    { id: 'damage', title: 'Entropy', desc: 'Increase all damage dealt by 10%.', icon: '⚔️' },
    { id: 'luck', title: 'RNG Manipulation', desc: 'Increase Holy Mask drop chance.', icon: '🎲' },
    { id: 'crit', title: 'Fatal Error', desc: '+5% Crit Chance & +20% Crit Damage.', icon: '🎯' }
];

const VOID_PERM_UPGRADES = {
    health: { name: "Void Heart", desc: "+5 Starting HP", baseCost: 1000, costMult: 1.2 },
    greed: { name: "Crypto Miner", desc: "+5% Gold Gain", baseCost: 2000, costMult: 1.3 },
    power: { name: "Code Injection", desc: "+1% Damage", baseCost: 5000, costMult: 1.4 },
    swift: { name: "Fiber Optic", desc: "+1% Speed", baseCost: 3000, costMult: 1.3 },
    defense: { name: "Proxy Server", desc: "+1% Damage Reduction", baseCost: 4000, costMult: 1.5 },
    wisdom: { name: "Machine Learning", desc: "+2% XP Gain", baseCost: 2500, costMult: 1.3 }
};

if (typeof window.HERO_LOGIC === 'undefined') window.HERO_LOGIC = {};

window.HERO_LOGIC['void'] = {
    upgradePool: VOID_UPGRADE_POOL,
    permUpgrades: VOID_PERM_UPGRADES,

    init: function (player) {
        // Base Stats
        player.damageMultiplier = 1.2;
        player.speedMultiplier = 1.2;
        player.stats.meleeCd = 0.5; // Fast attacks
        player.stats.meleeRadiusMult = 1.5; // Big swipes

        // Custom Properties
        player.echoes = []; // Stored clones
        player.inRealmShift = false;
        player.realmShiftTimer = 0;
        player.riftColor = "#00bcd4"; // Cyan/Glitch Blue

        // Override UI
        const originalSetup = player.setupSpecial.bind(player);
        player.setupSpecial = function () {
            const iconEl = document.getElementById('special-icon');
            if (iconEl) {
                this.specialName = "REALM SHIFT";
                this.specialMaxCooldown = 1200; // 20s
                iconEl.innerText = "👻"; // Ghost icon
                const container = document.getElementById('special-container');
                if (container) {
                    container.style.boxShadow = "0 0 10px #00bcd4";
                    container.style.border = "1px solid #00bcd4";
                }
            }
        };
        player.setupSpecial(); // Apply immediately

        // Hooks
        player.customMelee = () => this.meleeAttack(player);
        player.customSpecial = () => this.useSpecial(player);

        // Passive Projectile Override
        player.shoot = () => this.shootBolt(player);

        player.customUpdate = (dx, dy) => {
            this.update(player, dx, dy);
            return false; // allow normal movement processing
        };
    },

    shootBolt: function (player) {
        // Fires a "Glitch Bolt" using Range Stats
        if (player.rangeCooldown > 0) return;

        // Use standard find nearest logic or random
        let angle = player.aimAngle;
        let speed = player.stats.projectileSpeed;
        let dmg = player.stats.rangeDmg * player.damageMultiplier;
        let size = player.stats.projectileSize;

        // Projectile Count
        if (typeof projectiles !== 'undefined') {
            const count = 1 + (player.extraProjectiles || 0);
            for (let i = 0; i < count; i++) {
                // Spread
                const spread = (i - (count - 1) / 2) * 0.2;

                projectiles.push({
                    x: player.x,
                    y: player.y,
                    vx: Math.cos(angle + spread) * speed,
                    vy: Math.sin(angle + spread) * speed,
                    size: size,
                    color: player.riftColor || '#00bcd4',
                    dmg: dmg,
                    life: 60,
                    type: 'GLITCH_BOLT',
                    pierce: 1,
                    isCustom: true,
                    update: function () {
                        this.x += this.vx;
                        this.y += this.vy;
                        // Jitter Effect
                        this.x += (Math.random() - 0.5) * 5;
                        this.y += (Math.random() - 0.5) * 5;
                        this.life--;
                        if (this.life <= 0) this.dead = true;
                    },
                    draw: function () {
                        const ctx = window.ctx;
                        ctx.save();
                        ctx.translate(this.x, this.y);
                        // Glitch Visuals
                        ctx.fillStyle = this.color;
                        ctx.shadowColor = this.color;
                        ctx.shadowBlur = 10;
                        ctx.fillRect(-this.size / 2, -this.size / 2, this.size, this.size);

                        if (Math.random() < 0.3) {
                            ctx.fillStyle = "#fff";
                            ctx.fillRect(-this.size, -this.size / 2, this.size * 0.5, this.size);
                        }
                        ctx.restore();
                    }
                });
            }
            player.rangeCooldown = player.stats.rangeCd * player.cooldownMultiplier;
        }
    },

    meleeAttack: function (player) {
        // 1. Main Attack: Dimensional Slash
        // Visual: Dash forward slightly + Screen Cut effect
        const mx = player.lastMoveX || 1;
        const my = player.lastMoveY || 0;
        const angle = Math.atan2(my, mx);

        // Dash
        player.x += Math.cos(angle) * 30;
        player.y += Math.sin(angle) * 30;

        // Damage Area
        if (typeof enemies !== 'undefined') {
            enemies.forEach(e => {
                const dist = Math.hypot(e.x - player.x, e.y - player.y);
                if (dist < 150) { // Large area
                    // Directional check (180 degree cone)
                    const angToEnemy = Math.atan2(e.y - player.y, e.x - player.x);
                    let diff = angToEnemy - angle;
                    while (diff < -Math.PI) diff += Math.PI * 2;
                    while (diff > Math.PI) diff -= Math.PI * 2;

                    if (Math.abs(diff) < Math.PI / 1.5) { // Cone
                        const dmg = 50 * player.damageMultiplier;
                        e.hp -= dmg;

                        // Digital Glitch Stun
                        if (Math.random() < 0.3) e.frozenTimer = 30;

                        if (typeof floatingTexts !== 'undefined') {
                            floatingTexts.push(new FloatingText(e.x, e.y - 40, dmg.toFixed(0), "#00bcd4", 25));
                        }

                        if (e.hp <= 0 && typeof player.onKill === 'function') player.onKill(e);
                    }
                }
            });
        }

        // VFX
        if (typeof createExplosion !== 'undefined') {
            // Slash effect
            for (let i = 0; i < 10; i++) {
                const px = player.x + Math.cos(angle) * (i * 10);
                const py = player.y + Math.sin(angle) * (i * 10);
                createExplosion(px, py, "#00bcd4", 2);
            }
        }

        // 2. PASSIVE HOOK: Echoes
        // "Projectile Count" = Number of Echoes
        const count = 1 + (player.extraProjectiles || 0);

        for (let i = 0; i < count; i++) {
            // Create an Echo that delayed attacks
            setTimeout(() => {
                this.spawnEcho(player, angle, i);
            }, 200 + (i * 100));
        }

        return true; // We handled melee
    },

    spawnEcho: function (player, angle, index) {
        // Visual: Ghostly slash at random offset
        const offsetX = (Math.random() - 0.5) * 100;
        const offsetY = (Math.random() - 0.5) * 100;
        const x = player.x + offsetX;
        const y = player.y + offsetY;

        // VFX
        if (typeof createExplosion !== 'undefined') createExplosion(x, y, "rgba(255, 255, 255, 0.5)", 5);

        // Damage
        if (typeof enemies !== 'undefined') {
            enemies.forEach(e => {
                const dist = Math.hypot(e.x - x, e.y - y);
                if (dist < 80) {
                    const dmg = 30 * player.damageMultiplier;
                    e.hp -= dmg;
                    if (e.hp <= 0 && typeof player.onKill === 'function') player.onKill(e);
                    if (typeof floatingTexts !== 'undefined') {
                        floatingTexts.push(new FloatingText(e.x, e.y - 40, "ECHO " + dmg.toFixed(0), "#ccc", 20));
                    }
                }
            });
        }
    },

    useSpecial: function (player) {
        if (player.inRealmShift) return false;

        player.inRealmShift = true;
        player.realmShiftTimer = 600; // 10s
        if (typeof audioManager !== 'undefined') audioManager.play('special_fire'); // Placeholder
        if (typeof showNotification === 'function') showNotification("REALM SHIFT ACTIVATED", "#00bcd4");

        // Buffs
        player.originalSpeed = player.speedMultiplier;
        player.speedMultiplier *= 2.0;

        // Visual: Become Ghost
        player.oldColor = "#2c3e50"; // We'll just rely on VFX for now as player color is hardcoded in some renderers

        return true;
    },

    update: function (player, dx, dy) {
        if (player.inRealmShift) {
            player.realmShiftTimer--;

            // Effect: Phase Walk - Mark/Glitch Enemies
            if (typeof enemies !== 'undefined') {
                enemies.forEach(e => {
                    const dist = Math.hypot(e.x - player.x, e.y - player.y);
                    if (dist < 60) {
                        if (!e.glitched) {
                            e.glitched = true;
                            if (typeof createExplosion !== 'undefined') createExplosion(e.x, e.y, "#00bcd4", 10);
                        }
                        e.frozenTimer = 10; // Miniature stun
                    }

                    if (e.glitched) {
                        e.hp -= 2 * player.damageMultiplier; // DoT
                        if (e.hp <= 0 && typeof player.onKill === 'function') player.onKill(e);
                    }
                });
            }

            // Visuals: Trail
            if (Math.random() < 0.5 && typeof createExplosion !== 'undefined') {
                createExplosion(player.x, player.y, "rgba(0, 188, 212, 0.4)", 2);
            }

            if (player.realmShiftTimer <= 0) {
                // End Shift - BIG BOOM
                player.inRealmShift = false;
                player.speedMultiplier = player.originalSpeed;

                // Detonate all Glitched enemies
                let count = 0;
                enemies.forEach(e => {
                    if (e.glitched) {
                        e.hp -= 200 * player.damageMultiplier;
                        if (typeof createExplosion !== 'undefined') createExplosion(e.x, e.y, "#fff", 20);
                        e.glitched = false;
                        if (e.hp <= 0) {
                            if (typeof player.onKill === 'function') player.onKill(e);
                            count++;
                        }
                    }
                });

                if (typeof showNotification === 'function') showNotification(`REALM SHATTERED: ${count} KILLS`, "#fff");
            }
        }
    }
};
