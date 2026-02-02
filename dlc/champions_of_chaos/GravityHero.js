// Gravity (The Void) Hero Logic

// Hook into Player Class Prototype or extended logic
// We use the standard HERO_LOGIC extension point

// 1. Inject Stats into BASE_HERO_STATS for Menu/Altar visibility
if (typeof BASE_HERO_STATS !== 'undefined') {
    if (!BASE_HERO_STATS['gravity']) {
        BASE_HERO_STATS['gravity'] = {
            color: '#8e44ad',
            hp: 80,
            speed: 4,
            rangeDmg: 30,
            meleeDmg: 50,
            rangeCd: 40,
            meleeCd: 100,
            projectileSpeed: 8,
            projectileSize: 6,
            knockback: 0 // Gravity pulls
        };
    }
}

// --- CUSTOM UPGRADE POOLS ---

const GRAVITY_UPGRADE_POOL = [
    { id: 'health', title: 'Mass Increase', desc: 'Increase Max HP by 25 and Heal 20%.', icon: '🌑' },
    { id: 'radius', title: 'Event Horizon', desc: 'Increase Gravity Pull Radius by 25%.', icon: '⭕' },
    { id: 'projectile', title: 'Graviton Surge', desc: 'Fire +1 subsequent projectile.', icon: '☄️' },
    { id: 'speed', title: 'Orbital Velocity', desc: 'Increase Movement Speed by 10%.', icon: '🪐' },
    { id: 'cooldown', title: 'Time Dilation', desc: 'Reduce Cooldowns by 10%.', icon: '⏳' },
    { id: 'defense', title: 'Dense Atmosphere', desc: 'Reduce incoming damage by 5%.', icon: '🛡️' },
    { id: 'damage', title: 'Spaghettification', desc: 'Increase damage by 10%. Pulling forces tear enemies.', icon: '🌪️' },
    { id: 'luck', title: 'Cosmic Luck', desc: 'Increase Holy Mask drop chance.', icon: '🍀' },
    { id: 'crit', title: 'Singularity Strike', desc: '+5% Crit Chance & +20% Crit Damage.', icon: '🎯' }
];

const GRAVITY_PERM_UPGRADES = {
    health: { name: "Void Heart", desc: "+5 Starting HP", baseCost: 1000, costMult: 1.2 },
    greed: { name: "Cosmic Dust", desc: "+5% Gold Gain", baseCost: 2000, costMult: 1.3 },
    power: { name: "Singularity Core", desc: "+1% Damage", baseCost: 5000, costMult: 1.4 },
    swift: { name: "Light Speed", desc: "+1% Speed", baseCost: 3000, costMult: 1.3 },
    defense: { name: "Dark Matter", desc: "+1% Damage Reduction", baseCost: 4000, costMult: 1.5 },
    wisdom: { name: "Universal Mind", desc: "+2% XP Gain", baseCost: 2500, costMult: 1.3 }
};


// 2. Register Logic
if (typeof window.HERO_LOGIC === 'undefined') window.HERO_LOGIC = {};

window.HERO_LOGIC['gravity'] = {
    upgradePool: GRAVITY_UPGRADE_POOL,
    permUpgrades: GRAVITY_PERM_UPGRADES,

    init: function (player) {
        player.orbitals = [];
        player.gravityWellSize = 100;
        player.souls = 0;
        player.galaxyMode = false;
        player.galaxyTimer = 0;

        // Base Stats overrides
        player.damageMultiplier = 1.0;
        player.speedMultiplier = 1.1;

        // Setup Special UI via Hook
        const originalSetup = player.setupSpecial.bind(player);
        player.setupSpecial = function () {
            // originalSetup(); // Optional - skipping base setup

            // Override UI
            const iconEl = document.getElementById('special-icon');
            if (iconEl) {
                // Galaxy Mode UI vs Normal UI
                if (this.galaxyMode) {
                    this.specialName = "SUPERNOVA";
                    this.specialMaxCooldown = 100; // Very fast CD
                    iconEl.innerText = "🌌";
                } else {
                    this.specialName = "SINGULARITY";
                    this.specialMaxCooldown = 1500;
                    iconEl.innerText = "🌀";
                }

                // Colors
                const container = document.getElementById('special-container');
                if (container) {
                    container.style.boxShadow = this.galaxyMode ? "0 0 20px #fff" : "0 0 10px #8e44ad";
                    container.style.borderColor = this.galaxyMode ? "#fff" : "#444";
                }
            }
        };

        // Attach Custom Hooks
        player.customSpecial = () => this.useSpecial(player);

        player.customUpdate = (dx, dy) => {
            this.update(player, dx, dy);
            return false; // Return false to let default movement run
        };

        // Force UI update immediately if we are the selected hero
        player.setupSpecial();
    },

    useSpecial: function (player) {
        // --- GALAXY FORM SPECIAL: SUPERNOVA ---
        if (player.galaxyMode) {
            if (typeof audioManager !== 'undefined') audioManager.play('special_fire');
            if (typeof createExplosion === 'function') {
                createExplosion(player.x, player.y, '#fff', 40); // Big white bang
                createExplosion(player.x, player.y, '#8e44ad', 20);
            }

            // Massive Screen Wipe
            if (typeof enemies !== 'undefined') {
                enemies.forEach(e => {
                    const d = Math.hypot(e.x - player.x, e.y - player.y);
                    if (d < 800) {
                        e.hp -= 200 * player.damageMultiplier;
                        createExplosion(e.x, e.y, '#fff', 5);
                        if (e.hp <= 0 && typeof player.onKill === 'function') player.onKill(e);
                    }
                });
            }
            if (typeof showNotification === 'function') showNotification("SUPERNOVA!", "#fff");
            return true;
        }

        // --- NORMAL FORM SPECIAL: SINGULARITY ---
        if (typeof audioManager !== 'undefined') {
            audioManager.play('special_black');
        }

        // Visuals
        if (typeof createExplosion === 'function') {
            createExplosion(player.x, player.y, '#8e44ad');
            setTimeout(() => createExplosion(player.x, player.y, '#000'), 200);
        }

        // Logic: Pull & Damage
        let killCount = 0;
        if (typeof enemies !== 'undefined') {
            enemies.forEach(e => {
                const dist = Math.hypot(e.x - player.x, e.y - player.y);
                if (dist < 800) {
                    const angle = Math.atan2(player.y - e.y, player.x - e.x);

                    e.x += Math.cos(angle) * 400; // Strong Pull
                    e.y += Math.sin(angle) * 400;

                    const dmg = 80 * player.damageMultiplier;
                    e.hp -= dmg;
                    e.frozenTimer = 120; // Stun

                    if (typeof floatingTexts !== 'undefined') {
                        floatingTexts.push(new FloatingText(e.x, e.y - 40, dmg.toFixed(0), "#8e44ad", 30));
                    }

                    if (e.hp <= 0) {
                        if (typeof player.onKill === 'function') player.onKill(e);
                        killCount++;
                    }
                }
            });
        }

        // Soul Mechanics
        if (killCount > 0) {
            player.souls += killCount;
            const soulsNeeded = 10;

            if (typeof showNotification === 'function') {
                if (player.souls < soulsNeeded) {
                    showNotification(`SOULS HARVESTED: ${player.souls}/${soulsNeeded}`, "#8e44ad");
                }
            }

            // TRIGGER GALAXY MODE
            if (player.souls >= soulsNeeded) {
                this.enterGalaxyMode(player);
            }
        } else {
            if (typeof showNotification === 'function') showNotification("EVENT HORIZON - NO SOULS FOUND", "#555");
        }

        return true;
    },

    enterGalaxyMode: function (player) {
        player.galaxyMode = true;
        player.souls = 0;
        player.galaxyTimer = 900; // 15 seconds (60fps)

        // Buffs
        player.originalSpeed = player.speedMultiplier;
        player.speedMultiplier *= 1.5;
        player.gravityWellSize = 300;

        if (typeof showNotification === 'function') showNotification("GALAXY ASCENSION!", "#fff");
        if (typeof createExplosion === 'function') createExplosion(player.x, player.y, '#fff', 100);

        player.setupSpecial(); // Update UI to Galaxy Icon
    },

    exitGalaxyMode: function (player) {
        player.galaxyMode = false;
        player.speedMultiplier = player.originalSpeed || 1.1;
        player.gravityWellSize = 100;
        if (typeof showNotification === 'function') showNotification("Form Dissipated", "#8e44ad");
        player.setupSpecial(); // Revert UI
    },

    update: function (player, dx, dy) {
        // Passive: Gravity Pull
        if (typeof enemies !== 'undefined') {
            enemies.forEach(e => {
                const dist = Math.hypot(e.x - player.x, e.y - player.y);
                let range = player.gravityWellSize + (player.level * 5);
                let pull = 1.5;

                // Galaxy Mode Effects
                if (player.galaxyMode) {
                    range = 500;
                    pull = 4.0; // Strong passive pull

                    // Cosmic Radiation (Damage Aura)
                    if (dist < 300 && Math.random() < 0.2) {
                        e.hp -= 2;
                        if (Math.random() < 0.3) createExplosion(e.x, e.y, "#fff", 2);
                        if (e.hp <= 0 && typeof player.onKill === 'function') player.onKill(e);
                    }
                }

                if (dist < range) {
                    const angle = Math.atan2(player.y - e.y, player.x - e.x);
                    e.x += Math.cos(angle) * pull;
                    e.y += Math.sin(angle) * pull;
                }
            });
        }

        // Galaxy Timer
        if (player.galaxyMode) {
            player.galaxyTimer--;

            // Visuals: Sparkles
            if (Math.random() < 0.3 && typeof createExplosion === 'function') {
                createExplosion(player.x + (Math.random() - 0.5) * 60, player.y + (Math.random() - 0.5) * 60, '#fff', 3);
            }

            if (player.galaxyTimer <= 0) {
                this.exitGalaxyMode(player);
            }
        }
    }
};
