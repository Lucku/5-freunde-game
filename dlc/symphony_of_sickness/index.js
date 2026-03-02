// Symphony of Sickness DLC Entry Point
const DLC_ID = 'symphony_of_sickness';

const SymphonyDLC = {
    id: DLC_ID,
    load: async function () {
        console.log("Loading Symphony of Sickness DLC...");

        // Load Dependency Scripts
        const scripts = [
            'dlc/symphony_of_sickness/SoundHero.js',
            'dlc/symphony_of_sickness/PoisonHero.js',
            'dlc/symphony_of_sickness/SoundStory.js',
            'dlc/symphony_of_sickness/PoisonStory.js',
            // Biomes will be loaded here too once created
            'dlc/symphony_of_sickness/SoundBiome.js',
            'dlc/symphony_of_sickness/PoisonBiome.js'
        ];

        // Load files sequentially or in parallel? Parallel is fine for these.
        for (const script of scripts) {
            try {
                // If the DLCManager helper is available, use it. Otherwise use a fallback.
                if (window.dlcManager && window.dlcManager.loadScript) {
                    await window.dlcManager.loadScript(script);
                } else {
                    await new Promise((resolve, reject) => {
                        const s = document.createElement('script');
                        s.src = script;
                        s.onload = resolve;
                        s.onerror = reject;
                        document.head.appendChild(s);
                    });
                }
            } catch (e) {
                console.error(`Failed to load ${script}:`, e);
            }
        }

        this.init();
    },

    init: function () {
        console.log("Initializing Symphony of Sickness DLC Logic...");

        // 0. Ensure saveData entries exist for DLC heroes (lazy-init, matching other DLC pattern)
        if (typeof saveData !== 'undefined') {
            if (!saveData['sound']) saveData['sound'] = { level: 0, unlocked: 0, highScore: 0, prestige: 0, maxWinPrestige: -1 };
            if (!saveData['poison']) saveData['poison'] = { level: 0, unlocked: 0, highScore: 0, prestige: 0, maxWinPrestige: -1 };
        }

        // 1. Inject Heroes into BASE_HERO_STATS for Main Menu
        if (typeof BASE_HERO_STATS !== 'undefined') {
            BASE_HERO_STATS['sound'] = {
                color: '#4fc3f7',
                description: "Master of Rhythm. Time your attacks to the beat for massive damage.",
                speed: 5,
                hp: 100,
                rangeDmg: 15,
                meleeDmg: 10,
                rangeCd: 40,
                meleeCd: 45,
                projectileSpeed: 10,
                projectileSize: 8,
                knockback: 4
            };
            BASE_HERO_STATS['poison'] = {
                color: '#76ff03',
                description: "Spreader of Decay. Expands a deadly miasma that drains life.",
                speed: 4,
                hp: 120,
                rangeDmg: 6,
                meleeDmg: 8,
                rangeCd: 30,
                meleeCd: 50,
                projectileSpeed: 6,
                projectileSize: 10,
                knockback: 2,
                gasRadius: 120 // Custom Stat
            };
        }

        // Init Global State
        window.SYMPHONY_STATE = {
            biomeTransformation: 0, // 0 to 100%
            targetBiome: 'sound',
            bpm: 120, // Default BPM
            lastBeatTime: 0,
            onBeat: false,
            // Sound Hero Specifics
            totems: [],
            totemsConquered: 0,
            // Poison Hero Specifics
            infectionTarget: 15, // Number of simultaneous infections needed
            currentInfectionCount: 0,
            originalBiome: null // To revert or track base state
        };

        // Helper to Trigger Biome Swap
        window.SYMPHONY_STATE.triggerBiomeAssimilation = (type) => {
            if (window.currentBiome === type) return; // Already there

            console.log(`ASSIMILATING BIOME INTO: ${type.toUpperCase()}`);
            if (typeof showNotification === 'function') {
                const msg = type === 'sound' ? "THE RHYTHM TAKES OVER!" : "THE TOXINS CONSUME ALL!";
                const color = type === 'sound' ? '#00e5ff' : '#76ff03';
                showNotification(msg, color, 300);
            }

            // Save original if not set
            if (!window.SYMPHONY_STATE.originalBiome) window.SYMPHONY_STATE.originalBiome = window.currentBiome;

            // Force Biome Swap
            window.currentBiome = type;
            // Also update global currentBiomeType used by game.js spawning logic
            if (typeof currentBiomeType !== 'undefined') {
                currentBiomeType = type;
            } else {
                window.currentBiomeType = type;
            }

            // Visual Flair
            if (type === 'sound') {
                // Clear any nearby enemies with a shockwave?
                window.enemies.forEach(e => {
                    const dist = Math.hypot(e.x - window.player.x, e.y - window.player.y);
                    if (dist < 800) e.pushbackX = (e.x - window.player.x) * 0.1;
                });
            } else if (type === 'poison') {
                // SCREEN CLEAR / MASS POISON
                if (window.enemies) {
                    window.enemies.forEach(e => {
                        // Apply Heavy Poison to ALL enemies
                        if (!e.poisonStacks) e.poisonStacks = 0;
                        e.poisonStacks += 50; // Massive dose

                        // Visual Float
                        if (typeof createDamageNumber === 'function') createDamageNumber(e.x, e.y - 30, "TOXIC SURGE!", '#76ff03');
                    });
                }

                // COOL ANIMATION: Expanding Poison Wave
                const player = window.player;
                if (player && typeof Projectile !== 'undefined') {
                    // Create a purely visual expanding ring
                    // modifying Projectile to handle 'VISUAL_RING' if needed, or just standard
                    // Actually, let's just spawn a bunch of visual particles or a custom "Wave" object if engine supports it.
                    // Fallback to standard explosion if no custom shader.
                    if (typeof createExplosion !== 'undefined') {
                        // Center burst
                        createExplosion(player.x, player.y, '#76ff03', 100);

                        // Ring effect (delayed explosions)
                        for (let r = 100; r <= 800; r += 100) {
                            setTimeout(() => {
                                const count = 8 + (r / 50);
                                for (let i = 0; i < count; i++) {
                                    const ang = (i / count) * Math.PI * 2;
                                    createExplosion(player.x + Math.cos(ang) * r, player.y + Math.sin(ang) * r, '#76ff03', 30);
                                }
                            }, r / 2); // Speed of wave
                        }
                    }
                }
            }
        };

        // Start Beat Loop
        setInterval(() => this.updateBeat(), 16);

        // 3. Inject Altar of Mastery skills
        this.injectAltar();

        console.log("Symphony of Sickness DLC Initialized");
    },

    injectAltar: function () {
        if (typeof ALTAR_TREE === 'undefined') return;

        // ── SOUND HERO ──
        ALTAR_TREE['sound'] = [
            { id: 'so1', req: 1, type: 'stat', stat: 'cooldown', val: 0.9,
              desc: 'Crescendo Cooldown -10%' },
            { id: 'so2', req: 3, type: 'stat', stat: 'beatBonus', val: 0.25,
              desc: 'On-Beat Bonus +25%: Perfect-beat attacks deal even more damage' },
            { id: 'so3', req: 5, type: 'unique',
              desc: 'Resonance Surge: CRESCENDO ring deals double damage to already-resonating enemies' }
        ];

        // ── POISON HERO ──
        ALTAR_TREE['poison'] = [
            { id: 'po1', req: 1, type: 'stat', stat: 'cooldown', val: 0.9,
              desc: 'Alchemical Mix Cooldown -10%' },
            { id: 'po2', req: 3, type: 'stat', stat: 'dotDamage', val: 1.2,
              desc: 'Virulence +20%: Poison DoT damage increased by 20%' },
            { id: 'po3', req: 5, type: 'unique',
              desc: 'Virulent Strain: Enemies killed by poison spread 50% of their stacks to all enemies within 150px' }
        ];

        // ── CONVERGENCES ──
        const symphonyConvergences = [
            // Sound ×5 base heroes
            { id: 'cv_so_f',  req: { sound: 5, fire: 5 },   type: 'mutation',
              desc: 'Resonant Flame: CRESCENDO ring ignites all enemies hit' },
            { id: 'cv_so_w',  req: { sound: 5, water: 5 },  type: 'mutation',
              desc: 'Sonar Current: On-beat attacks fill the Sync Meter 50% faster' },
            { id: 'cv_so_i',  req: { sound: 5, ice: 5 },    type: 'mutation',
              desc: 'Cryosonic: CRESCENDO ring freezes all enemies hit for 1.5s' },
            { id: 'cv_so_p',  req: { sound: 5, plant: 5 },  type: 'mutation',
              desc: 'Resonant Roots: Heal 1 HP for every enemy hit by CRESCENDO ring' },
            { id: 'cv_so_m',  req: { sound: 5, metal: 5 },  type: 'mutation',
              desc: 'Steel Tempo: Sync State grants 30% damage reduction' },
            // Poison ×5 base heroes
            { id: 'cv_po_f',  req: { poison: 5, fire: 5 },  type: 'mutation',
              desc: 'Burning Toxin: Enemies with 80+ poison stacks also catch fire' },
            { id: 'cv_po_w',  req: { poison: 5, water: 5 }, type: 'mutation',
              desc: 'Acid Rain: Tidal Wave applies 30 poison stacks to all enemies hit' },
            { id: 'cv_po_i',  req: { poison: 5, ice: 5 },   type: 'mutation',
              desc: 'Frozen Plague: Frozen enemies take double poison DoT damage' },
            { id: 'cv_po_p',  req: { poison: 5, plant: 5 }, type: 'mutation',
              desc: 'Plague Bloom: Heal 0.5% max HP when an enemy dies from poison' },
            { id: 'cv_po_m',  req: { poison: 5, metal: 5 }, type: 'mutation',
              desc: 'Corrosive Alloy: Poisoned enemies have 25% reduced defense' },
            // Cross-DLC: Sound + Poison
            { id: 'cv_so_po', req: { sound: 5, poison: 5 }, type: 'mutation',
              desc: 'Toxic Frequency: CRESCENDO ring applies 30 poison stacks to all enemies hit' }
        ];

        if (ALTAR_TREE.convergence) {
            symphonyConvergences.forEach(m => {
                if (!ALTAR_TREE.convergence.find(ex => ex.id === m.id)) {
                    ALTAR_TREE.convergence.push(m);
                }
            });
        }

        console.log("Symphony of Sickness: Altar Skills Injected.");
    },

    updateBeat: function () {
        if (!window.SYMPHONY_STATE || !window.player) return;

        // Logic runs if player is Sound Hero OR current biome is Sound Plains
        const isSoundRelevant = (window.player.type === 'sound' || (window.currentBiome && window.currentBiome.includes('sound')));

        if (isSoundRelevant) {
            const now = Date.now();
            const beatInterval = 60000 / (window.SYMPHONY_STATE.bpm || 120);

            if (now - window.SYMPHONY_STATE.lastBeatTime >= beatInterval) {
                window.SYMPHONY_STATE.lastBeatTime = now;
                window.SYMPHONY_STATE.onBeat = true;

                // Reset flag shortly after (150ms window)
                setTimeout(() => {
                    if (window.SYMPHONY_STATE) window.SYMPHONY_STATE.onBeat = false;
                }, 150);
            }
        }
    }
};

// Register in DLC Manager (if present) or Global Registry
if (!window.DLC_REGISTRY) window.DLC_REGISTRY = {};
window.DLC_REGISTRY[DLC_ID] = SymphonyDLC;

// --- Enemy Type Injection for Biome Transformation ---
(function () {
    const waitForGame = setInterval(() => {
        if (typeof window.Enemy !== 'undefined') {
            clearInterval(waitForGame);
            injectEnemyLogic();
        }
    }, 100);

    function injectEnemyLogic() {
        if (typeof window.getBiomeEnemyType === 'undefined') {
            // Define base function if missing
            window.getBiomeEnemyType = function (wave, enemy) { return null; };
        }

        const originalGetBiomeEnemyType = window.getBiomeEnemyType;
        window.getBiomeEnemyType = function (wave, enemyInstance) {
            // Check Current Biome
            let current = null;
            if (typeof currentBiomeType !== 'undefined') current = currentBiomeType;
            if (window.currentBiome) current = window.currentBiome;

            if (current) {
                const c = current.toLowerCase();
                if (c.includes('poison') || c === 'sickness') {
                    // Poison Biome Spawns
                    // Return types defined in PoisonEnemies (or assume standard if not loaded 3rd party classes)
                    // Currently using standard types but modified by Biome? 
                    // Let's use standard 'TOXIC' + chance for 'SLIME'
                    if (Math.random() < 0.3) return 'TOXIC';
                    return null; // Fallback to standard rng
                }
                if (c.includes('sound') || c === 'rhythm') {
                    // Sound Biome Spawns
                    if (Math.random() < 0.3) return 'SPEEDSTER'; // Fast tempo
                    return null;
                }
            }

            // Call original chain
            return originalGetBiomeEnemyType(wave, enemyInstance);
        };
        console.log("Symphony DLC: Biome Spawn Logic Injected.");
    }
})();

// --- Shadow Boss Implementation (Injected) ---
// Since we can't easily modify game.js spawning logic, we monkey-patch the Boss class
// to support our custom boss types.

(function () {
    // Wait for Boss class to be defined
    const integrityCheck = setInterval(() => {
        if (typeof window.Boss !== 'undefined') {
            clearInterval(integrityCheck);
            patchBossClass();
        }
    }, 100);

    function patchBossClass() {
        const OriginalBoss = window.Boss;

        window.Boss = class extends OriginalBoss {
            constructor(type) {
                // Intercept custom types
                if (type === 'SHADOW_CLONE' || type === 'SOUND_MASTER' || type === 'POISON_KING') {
                    super(type); // Call base constructor with type
                    // Override properties for custom boss
                    this.initCustomBoss(type);
                } else {
                    super(type);
                }
            }

            initCustomBoss(type) {
                if (type === 'SHADOW_CLONE') {
                    this.name = "Shadow Self";
                    this.color = "#000000"; // Pitch black
                    // Mimic player stats?
                    if (window.player) {
                        this.maxHp = window.player.maxHp * 50; // Tanky
                        this.hp = this.maxHp;
                        this.damage = window.player.damageMultiplier * 20;
                        this.speed = window.player.speedMultiplier * 1.2;
                    }
                    this.phase = 1;
                }
            }

            // Hook update to add custom logic if needed
            update(player) {
                if (this.type === 'SHADOW_CLONE') {
                    // Custom AI: Mimic player movement somewhat?
                    // For now, standard boss AI (chase) with teleports
                    if (Math.random() < 0.02) {
                        // Blink behind player
                        const angle = Math.random() * Math.PI * 2;
                        this.x = player.x + Math.cos(angle) * 150;
                        this.y = player.y + Math.sin(angle) * 150;
                        // Effect
                        if (typeof createExplosion === 'function') createExplosion(this.x, this.y, "#000", 30);
                    }
                }

                // Call original update
                if (super.update) super.update(player);
                // If the original class doesn't have update on prototype (defined in class body?)
                // Since this extends OriginalBoss, we rely on its update unless we fully replaced it.
                // Assuming standard ES6 class structure, super.update works.
            }

            draw(ctx) {
                if (this.type === 'SHADOW_CLONE') {
                    // Draw shadow aura
                    ctx.save();
                    ctx.shadowBlur = 20;
                    ctx.shadowColor = "#000";
                    super.draw(ctx);
                    ctx.restore();
                } else {
                    super.draw(ctx);
                }
            }
        };

        // Copy prototype methods just in case (if OriginalBoss used direct prototype assignment)
        // Usually 'extends' handles this.
        console.log("Symphony DLC: Boss Class Patched for Shadow Clone support.");
    }
})();

// --- Story Injection ---
(function () {
    const storyCheck = setInterval(() => {
        if (typeof window.STORY_EVENTS !== 'undefined' && window.SOUND_STORY_CHAPTERS && window.POISON_STORY_CHAPTERS) {
            clearInterval(storyCheck);
            injectStory();
        }
    }, 100);

    function injectStory() {
        // Prevent double injection
        if (window.SYMPHONY_STORY_INJECTED) return;
        window.SYMPHONY_STORY_INJECTED = true;

        if (window.SOUND_STORY_CHAPTERS) {
            window.STORY_EVENTS = window.STORY_EVENTS.concat(window.SOUND_STORY_CHAPTERS);
        }
        if (window.POISON_STORY_CHAPTERS) {
            window.STORY_EVENTS = window.STORY_EVENTS.concat(window.POISON_STORY_CHAPTERS);
        }

        console.log("Symphony DLC: Full Story Events Injected.");
    }
})();

