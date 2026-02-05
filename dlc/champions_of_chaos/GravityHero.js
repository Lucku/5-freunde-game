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
            knockback: 0, // Gravity pulls
            gravityWellSize: 100,
            maxGravityMass: 100
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

    getSkillTreeWeights: function () {
        return {
            'RADIUS': 0.20,
            'COOLDOWN': 0.20,
            'MASS_CAP': 0.15,
            'DAMAGE': 0.15,
            'HEALTH': 0.10,
            'SPEED': 0.10,
            'ULT_DAMAGE': 0.10
        };
    },

    getSkillNodeDetails: function (type, value, desc) {
        if (type === 'RADIUS') return { val: 0.05, desc: "+5% Gravity Radius" };
        if (type === 'MASS_CAP') return { val: 5, desc: "+5 Max Mass" };
        return { val: value, desc: desc };
    },

    applySkillNode: function (base, node) {
        if (node.type === 'RADIUS') {
            base.gravityWellSize = (base.gravityWellSize || 100) * (1 + node.value);
        }
        if (node.type === 'MASS_CAP') {
            base.maxGravityMass = (base.maxGravityMass || 100) + node.value;
        }
    },

    init: function (player) {
        player.orbitals = [];
        player.gravityWellSize = player.stats.gravityWellSize || 100;
        player.gravityMass = 0; // The new resource
        player.maxGravityMass = player.stats.maxGravityMass || 100;
        player.activeBlackHole = null; // Single active instance

        // Visual override for projectiles to look like small black holes
        // We do this by hooking into player.shoot or passing a custom property
        player.riftColor = "#000"; // Black Projectiles

        // Base Stats overrides
        player.damageMultiplier = 1.0;
        player.speedMultiplier = 1.1;

        // Custom Hook: Gain Mass on Kill
        const originalOnKill = player.onKill ? player.onKill.bind(player) : () => { };
        player.onKill = (enemy) => {
            originalOnKill(enemy);
            if (player.gravityMass < player.maxGravityMass) {
                player.gravityMass += 1;
                player.setupSpecial(); // Update UI
            }
        };

        // Setup Special UI via Hook
        const originalSetup = player.setupSpecial.bind(player);
        player.setupSpecial = function () {
            // CPU Guard:
            if (this.isCPU) {
                this.specialName = "SINGULARITY";
                if (this.activeBlackHole) this.specialName = "COLLAPSE";
                return;
            }

            // Override UI
            const iconEl = document.getElementById('special-icon');
            if (iconEl) {
                this.specialName = "SINGULARITY";

                // If we have an active black hole, show "DETONATE"
                if (this.activeBlackHole) {
                    iconEl.innerText = "💥";
                    this.specialName = "COLLAPSE";
                    iconEl.style.filter = "none";
                    iconEl.style.opacity = "1";

                    const container = document.getElementById('special-container');
                    if (container) {
                        container.style.background = "rgba(142, 68, 173, 0.8)";
                        container.style.boxShadow = "0 0 20px #8e44ad";
                        container.style.borderColor = "#fff";
                    }
                } else {
                    iconEl.innerText = "⚫";

                    // Check logic based on cooldown AND mass
                    const onCooldown = (this.specialCooldown > 0);
                    const canCast = (this.gravityMass >= 50);

                    // If on cooldown, show cooldown state regardless of mass
                    if (onCooldown) {
                        iconEl.style.filter = "grayscale(1)";
                        iconEl.style.opacity = "0.5";
                    } else {
                        // Not on cooldown, check mass
                        if (canCast) {
                            iconEl.style.filter = "brightness(1.5) drop-shadow(0 0 10px #8e44ad)";
                            iconEl.style.opacity = "1";
                            // Add a pulsing animation class if possible, or manual style
                        } else {
                            iconEl.style.filter = "grayscale(1)";
                            iconEl.style.opacity = "0.5";
                        }
                    }

                    // Colors
                    const container = document.getElementById('special-container');
                    if (container) {
                        const pct = (this.gravityMass / this.maxGravityMass) * 100;
                        container.style.background = `linear-gradient(to top, #8e44ad ${pct}%, rgba(0,0,0,0.5) ${pct}%)`;
                        container.style.boxShadow = (canCast && !onCooldown) ? "0 0 15px #8e44ad" : "none";
                        container.style.borderColor = "#8e44ad";
                    }
                }
            }
        };

        // Attach Custom Hooks
        player.customSpecial = () => this.useSpecial(player);

        // Hook Projectile creation to customize drawing
        // Since projectiles are generic, we can't easily change their draw function without a custom class 
        // or a property check. The simplest way is to overwrite the 'shoot' method or use the 'customUpdate'.
        // Let's hook 'shoot' to inject custom projectile visuals after creation.
        const originalShoot = player.shoot.bind(player);
        player.shoot = function () {
            // We need to capture the newly added projectile.
            // Assuming shoot() adds to the end of projectiles array.
            const initialLen = typeof projectiles !== 'undefined' ? projectiles.length : 0;
            originalShoot();
            const finalLen = typeof projectiles !== 'undefined' ? projectiles.length : 0;

            if (finalLen > initialLen) {
                // Get the new projectile(s)
                for (let i = initialLen; i < finalLen; i++) {
                    const p = projectiles[i];
                    p.color = "#000"; // Black hole color
                    p.radius = 8;     // Bigger size
                    p.draw = function () {
                        const ctx = window.ctx;
                        if (!ctx) return;
                        ctx.save();
                        ctx.translate(this.x, this.y);

                        // Black Hole Effect
                        ctx.beginPath();
                        ctx.arc(0, 0, this.radius, 0, Math.PI * 2);
                        ctx.fillStyle = "#000";
                        ctx.fill();

                        ctx.strokeStyle = "#8e44ad"; // Purple rim
                        ctx.lineWidth = 2;
                        ctx.stroke();

                        ctx.restore();
                    }
                }
            }
        };

        player.customUpdate = (dx, dy) => {
            this.update(player, dx, dy);
            return false; // Return false to let default movement run
        };

        // Force UI update immediately if we are the selected hero
        player.setupSpecial();
    },

    useSpecial: function (player) {
        // Mode 1: Detonate existing Black Hole
        if (player.activeBlackHole) {
            player.activeBlackHole.collapse(player);
            // APPLY LONG COOLDOWN AFTER DETONATION
            player.specialCooldown = 900; // 15 seconds cooldown
            player.setupSpecial();
            return true;
        }

        // Mode 2: Create Black Hole (Requires 50 Mass)
        if (player.specialCooldown > 0) {
            if (typeof showNotification === 'function') showNotification("RECHARGING SINGULARITY...", "#555");
            return false;
        }

        if (player.gravityMass >= 50) {
            player.gravityMass -= 50;
            if (typeof audioManager !== 'undefined') audioManager.startLoop('special_gravity');

            // Spawn Black Hole
            player.activeBlackHole = new BlackHole(player.x, player.y, player);

            if (typeof showNotification === 'function') showNotification("SINGULARITY OPENED", "#8e44ad");
            player.setupSpecial();

            // Note: We return TRUE here, which tells Player.js to start the "Special cooldown".
            // However, Player.js applies cooldown immediately. But we want to allow "Collapse" immediately.
            // So we should return FALSE (to block Player.js cooldown) but handle internal state logic.
            // Problem: If we return false, Player.js thinks it failed.
            // Actually, if we want to allow immediate reaction, we should manage cooldown manually.
            // So we return FALSE here (prevent Global Cooldown) and only apply it on collapse.
            return false;
        } else {
            if (typeof showNotification === 'function') showNotification("NEED MORE MASS (50)", "#555");
            return false;
        }
    },

    update: function (player, dx, dy) {
        // Passive: Gravity Pull (Smaller, consistent)
        if (typeof enemies !== 'undefined') {
            const range = player.gravityWellSize + (player.level * 2);
            enemies.forEach(e => {
                const dist = Math.hypot(e.x - player.x, e.y - player.y);
                if (dist < range) {
                    const angle = Math.atan2(player.y - e.y, player.x - e.x);
                    e.x += Math.cos(angle) * 0.5; // Gentle constant pull
                    e.y += Math.sin(angle) * 0.5;
                }
            });
        }

        // Update Active Black Hole
        if (player.activeBlackHole) {
            player.activeBlackHole.update();
            // Drawing is handled inside update() using window.ctx
        }
    }
};

// --- Helper Class for the Black Hole ---
class BlackHole {
    constructor(x, y, owner) {
        this.x = x;
        this.y = y;
        this.owner = owner;
        this.life = 600; // 10 seconds max duration
        this.radius = 10;
        this.maxRadius = 150;
        this.eaten = 0;
        this.active = true;
        this.rotation = 0;
    }

    update() {
        if (!this.active) return;

        // Grow
        if (this.radius < this.maxRadius) this.radius += 0.5;
        this.rotation += 0.1;
        this.life--;

        // Suck Enemies
        if (typeof enemies !== 'undefined') {
            enemies.forEach(e => {
                const dx = this.x - e.x;
                const dy = this.y - e.y;
                const dist = Math.hypot(dx, dy);

                // Pull Range: 3x current radius
                if (dist < this.radius * 3) {
                    const angle = Math.atan2(dy, dx);
                    const force = (1000 / (dist + 10)) * 2; // Stronger as you get closer
                    e.x += Math.cos(angle) * force;
                    e.y += Math.sin(angle) * force;

                    // Rotate enemy around center (Spaghettification visual)
                    e.x += Math.sin(this.rotation) * 2;
                    e.y += Math.cos(this.rotation) * 2;

                    // Eat
                    if (dist < 20) {
                        e.hp -= 1000; // Instakill most non-bosses
                        if (e.hp <= 0 && !e.dead) {
                            // e.dead is not standard, checks hp usually
                            // Just ensure we count it once
                            this.eaten++;
                            this.radius = Math.min(300, this.radius + 2); // Grow on eat
                            if (typeof createExplosion === 'function') createExplosion(this.x, this.y, "#8e44ad", 5);
                            // Visual: shrink enemy? can't easily.
                        }
                    }
                }
            });
        }

        if (this.life <= 0) {
            this.collapse(this.owner);
        }

        // Draw (Hack: Draw immediately to canvas context if available globally)
        if (window.ctx) {
            this.draw(window.ctx);
        }
    }

    collapse(player) {
        if (!this.active) return;
        this.active = false;
        if (typeof audioManager !== 'undefined') audioManager.stopLoop('special_gravity');
        player.activeBlackHole = null;
        player.setupSpecial(); // Reset UI icon

        // Explosion
        const dmg = 500 + (this.eaten * 50);
        const boomRadius = this.radius * 2;

        if (typeof createExplosion === 'function') {
            createExplosion(this.x, this.y, "#fff", this.radius);
            createExplosion(this.x, this.y, "#000", this.radius * 0.8);
        }
        if (typeof showNotification === 'function') showNotification(`QUASAR BLAST! ${this.eaten} consumed`, "#fff");

        // Damage all in wide area
        if (typeof enemies !== 'undefined') {
            enemies.forEach(e => {
                if (Math.hypot(e.x - this.x, e.y - this.y) < boomRadius) {
                    e.hp -= dmg * player.damageMultiplier;
                    if (e.hp <= 0 && typeof player.onKill === 'function') player.onKill(e);
                }
            });
        }
    }

    draw(ctx) {
        ctx.save();
        ctx.translate(this.x, this.y);
        ctx.rotate(this.rotation);

        // Event Horizon
        ctx.beginPath();
        ctx.arc(0, 0, this.radius, 0, Math.PI * 2);
        ctx.fillStyle = "#000";
        ctx.fill();
        ctx.strokeStyle = "#8e44ad";
        ctx.lineWidth = 3;
        ctx.stroke();

        // Accretion Disk
        ctx.beginPath();
        ctx.shadowBlur = 20;
        ctx.shadowColor = "#8e44ad";
        ctx.arc(0, 0, this.radius * 1.2, 0, Math.PI * 2, false);
        ctx.strokeStyle = "rgba(142, 68, 173, 0.5)";
        ctx.stroke();

        // Particles sucking in (Visual effect)
        for (let i = 0; i < 3; i++) {
            const r = this.radius + Math.random() * 50;
            const a = Math.random() * Math.PI * 2;
            ctx.fillStyle = "#fff";
            ctx.fillRect(Math.cos(a) * r, Math.sin(a) * r, 2, 2);
        }

        ctx.restore();
    }
}
