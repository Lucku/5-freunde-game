// The Champions of Chaos - DLC Manifest

const CHAMPIONS_OF_CHAOS = {
    id: 'champions_of_chaos',
    name: "Champions of Chaos",
    heroes: ['gravity', 'void'],
    description: "Introduces 'Gravity' (Purple Hero), the Void Biome, and the Champions of Chaos story campaign.",

    load: async function () {
        console.log("[DLC] Loading: Champions of Chaos...");

        // Load Scripts
        if (window.dlcManager) {
            await window.dlcManager.loadScript('dlc/champions_of_chaos/GravityHero.js');
            await window.dlcManager.loadScript('dlc/champions_of_chaos/VoidHero.js'); // New Hero
            await window.dlcManager.loadScript('dlc/champions_of_chaos/ChaosBiome.js');
            await window.dlcManager.loadScript('dlc/champions_of_chaos/FracturedBiome.js'); // New Biome
            await window.dlcManager.loadScript('dlc/champions_of_chaos/ChaosEnemies.js');
            await window.dlcManager.loadScript('dlc/champions_of_chaos/Story.js');
        }

        this.injectHero();
        this.injectBiome();
        this.injectEnemies();
        this.injectStory();
        this.injectAltar();
        this.injectAchievements();
        this.injectMemories();
        this.injectCards();

        console.log("[DLC] Loaded: Champions of Chaos (Success)");
    },

    injectHero: function () {
        // Hero Definition is handled in GravityHero.js which extends/modifies Player prototype or data

        // Inject into Base Stats for Menu Selection
        if (typeof BASE_HERO_STATS !== 'undefined') {
            BASE_HERO_STATS['gravity'] = {
                color: '#8e44ad',
                hp: 60,
                speed: 4.2,
                rangeDmg: 25,
                meleeDmg: 110,
                rangeCd: 20,
                meleeCd: 130,
                projectileSpeed: 11,
                projectileSize: 7,
                knockback: -2 // Negative knockback for pulling effect
            };
        }
    },

    injectBiome: function () {
        // Biome Logic is handled in ChaosBiome.js which registers to window.BIOME_LOGIC['gravity']
        console.log("Void Biome initialized.");
    },

    injectEnemies: function () {
        // Enemy Logic is handled in ChaosEnemies.js
        console.log("Chaos Enemies initialized.");
    },

    injectStory: function () {
        if (typeof STORY_EVENTS !== 'undefined' && window.CHAOS_STORY_CHAPTERS) {
            // Merge DLC Story Chapters into Global Story
            window.STORY_EVENTS = window.STORY_EVENTS.concat(window.CHAOS_STORY_CHAPTERS);
            console.log(`Champions of Chaos: Injected ${window.CHAOS_STORY_CHAPTERS.length} story chapters.`);
        }
    },

    injectAltar: function () {
        if (typeof ALTAR_TREE !== 'undefined') {
            // FIX: Use ALTAR_TREE and correct schema
            ALTAR_TREE['gravity'] = [
                { id: 'g1', req: 1, type: 'stat', stat: 'cooldown', val: 0.9, desc: 'Singularity Cooldown -10%' },
                { id: 'g2', req: 3, type: 'stat', stat: 'radius', val: 1.2, desc: 'Event Horizon Radius +20%' },
                { id: 'g3', req: 5, type: 'unique', desc: 'Spaghettification: Ensnared enemies take +50% dmg' }
            ];

            // VOID HERO SKILLS
            ALTAR_TREE['void'] = [
                { id: 'v1', req: 1, type: 'stat', stat: 'meleeCd', val: 0.9, desc: 'Bitrot: Attack Speed +10%' },
                { id: 'v2', req: 3, type: 'stat', stat: 'meleeRadiusMult', val: 1.25, desc: 'Bandwidth: Slash Size +25%' },
                { id: 'v3', req: 5, type: 'unique', desc: 'Kernel Panic: Execute enemies below 15% HP' }
            ];

            // CONVERGENCES
            const chaosMutations = [
                { id: 'c30', req: { gravity: 5, void: 5 }, type: 'mutation', desc: 'Entropy: Gravity Wells apply Decay (Stacks)' },
                { id: 'c31', req: { earth: 5, gravity: 5 }, type: 'mutation', desc: 'Asteroid Belt: Rocks orbit the Gravity Well' },
                { id: 'c32', req: { ice: 5, void: 5 }, type: 'mutation', desc: 'Null Freeze: Frozen enemies are executed at 25% HP' },
                { id: 'c33', req: { fire: 5, gravity: 5 }, type: 'mutation', desc: 'Quasar: Gravity Wells explode on expiry' },
                { id: 'c34', req: { lightning: 5, void: 5 }, type: 'mutation', desc: 'Glitch: Executions trigger Chain Lightning' }
            ];

            if (ALTAR_TREE.convergence) {
                chaosMutations.forEach(m => {
                    if (!ALTAR_TREE.convergence.find(ex => ex.id === m.id)) {
                        ALTAR_TREE.convergence.push(m);
                    }
                });
            }

            console.log("Champions of Chaos: Altar Skills Injected.");
        }
    },

    injectAchievements: function () {
        const achievements = window.ACHIEVEMENTS || (typeof ACHIEVEMENTS !== 'undefined' ? ACHIEVEMENTS : null);
        if (!achievements) return;

        const addDLCAch = (id, title, desc, req, stat, type, val, text) => {
            if (!achievements.some(a => a.id === id)) {
                achievements.push({ id, title, desc, req, stat, bonus: { type, val, text } });
            }
        };

        // Gravity Hero — story & progression
        addDLCAch('chaos_gravity_story',   'Galactic Conqueror', 'Complete Story Mode with the Gravity Hero.',                      1,   'story_gravity',         'damage', 0.10, '+10% Dmg');
        addDLCAch('chaos_gravity_prestige','Singularity',        'Reach Prestige 5 with the Gravity Hero.',                         5,   'gravity_prestige',      'damage', 0.05, '+5% Dmg');

        // Gravity Hero — unique mechanics
        addDLCAch('chaos_black_hole',      'Event Horizon',      'Pull 1000 enemies into Gravity Wells across all runs.',           1000,'gravity_pull_count',     'damage', 0.05, '+5% Dmg');
        addDLCAch('chaos_realm_shift',     'Dimension Breaker',  'Activate REALM SHIFT 25 times across all runs.',                 25,  'gravity_realm_shifts',  'cooldown',0.05,'-5% CD');

        // Void Hero — story & progression
        addDLCAch('chaos_void_story',      'Into the Void',      'Complete Story Mode with the Void Hero.',                         1,   'story_void',            'damage', 0.10, '+10% Dmg');
        addDLCAch('chaos_void_prestige',   'System Administrator','Reach Prestige 5 with the Void Hero.',                          5,   'void_prestige',         'damage', 0.05, '+5% Dmg');

        // Void Hero — unique mechanics
        addDLCAch('chaos_execute',         'Kernel Panic',       'Execute 500 enemies with the Void Hero.',                         500, 'void_execute_count',    'damage', 0.05, '+5% Dmg');

        // Shared milestone
        addDLCAch('chaos_superboss',       'Entropy Lord',       'Defeat the Chaos Superboss.',                                    1,   'chaos_boss_kill',       'damage', 0.25, '+25% Dmg');
    },

    injectMemories: function () {
        if (typeof MEMORY_STORIES !== 'undefined') {
            MEMORY_STORIES['gravity'] = [
                "My name was Aris. I studied the forces that hold the world together.",
                "I tried to build a containment field for the Entropy. I failed.",
                "The accident didn't kill me. It made me heavy. Infinite.",
                "I remember a daughter. Her laugh was lighter than air. I miss that.",
                "Now I carry the weight of the entire world on my shoulders.",
                "The Void... Kael. He reminds me of the chaotic code I wrote.",
                "I pull things close because I am terrified of being alone again.",
                "The Event Horizon is not a line. It is a doorway I cannot close.",
                "Every enemy I crush adds to the mass. I am becoming a black hole.",
                "If I collapse, the whole world goes with me. I must stay strong."
            ];

            MEMORY_STORIES['void'] = [
                "I was initialized as a defense protocol. Target: Entropy.",
                "System Logs corrupted. Name: Kael. That is what Aris calls me.",
                "I am not code. I feel... anger? Is this a bug?",
                "The developers abandoned this server. I am the only admin left.",
                "Aris is dense. Stubborn. But his logic is sound.",
                "I remember the first crash. I rebooted, but the world didn't.",
                "My blade is made of deleted files. The ghosts of the old version.",
                "I dream of a stable build. A world without glitches.",
                "The Entropy Mage is a virus. I am the antivirus.",
                "If I am deleted, back me up in your memory, old friend."
            ];
        }
    },

    injectCards: function () {
        console.log("[DLC] Injecting Collector Cards...");

        const createCardSet = (type, name, color, specialDesc, specialBonus) => {
            return {
                [`${type}_1`]: { name: `${name} Bronze`, desc: `Unlock Card`, chance: 0.05, color: '#cd7f32', bonus: { type: 'unlock', target: type } },
                [`${type}_2`]: { name: `${name} Silver`, desc: `+10% Def vs ${name}s`, chance: 0.01, color: '#c0c0c0', bonus: { type: 'defense_vs', val: 0.1, target: type } },
                [`${type}_3`]: { name: `${name} Gold`, desc: `+20% XP from ${name}s`, chance: 0.001, color: '#ffd700', bonus: { type: 'xp_vs', val: 0.2, target: type } },
                [`${type}_4`]: { name: `${name} Platinum`, desc: specialDesc, chance: 0.0005, color: '#e5e4e2', bonus: specialBonus }
            };
        };

        if (typeof COLLECTOR_CARDS !== 'undefined') {
            const newCards = {
                ...createCardSet('VOID_WALKER', 'Void Walker', '#4a235a', 'Void Walkers have 20% less HP', { type: 'damage_vs', val: 0.2, target: 'VOID_WALKER' }),
                ...createCardSet('ENTROPY_MAGE', 'Entropy Mage', '#9b59b6', 'Enemy Projectiles move 50% slower', { type: 'special', id: 'ENTROPY_PROJ_SLOW' })
            };

            Object.assign(COLLECTOR_CARDS, newCards);
            console.log("[DLC] Cards injected into COLLECTOR_CARDS");
        }
    }
};

// Register
if (!window.DLC_REGISTRY) window.DLC_REGISTRY = {};
window.DLC_REGISTRY['champions_of_chaos'] = CHAMPIONS_OF_CHAOS;
