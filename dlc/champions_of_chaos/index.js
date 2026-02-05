// The Champions of Chaos - DLC Manifest

const CHAMPIONS_OF_CHAOS = {
    id: 'champions_of_chaos',
    name: "Champions of Chaos",
    heroes: ['gravity', 'void'],
    description: "Introduces 'Gravity' (Purple Hero), the Void Biome, and the Champions of Chaos story campaign.",

    load: async function () {
        console.log("Champions of Chaos: Injecting Content...");

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

        console.log("Champions of Chaos: Content Injected Successfully.");
    },

    injectHero: function () {
        // Hero Definition is handled in GravityHero.js which extends/modifies Player prototype or data
        console.log("Gravity Hero initialized.");

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

            console.log("Champions of Chaos: Altar Skills Injected.");
        }
    },

    injectAchievements: function () {
        if (typeof addAch === 'function') {
            addAch('GRAVITY_UNLOCK', 'Master of Gravity', 'Unlock all Gravity Hero Altar skills.', 10, 'unlock_gravity', 'damage', 0.1, '+10% Dmg');
            addAch('ENTROPY_LORD', 'Entropy Lord', 'Defeat the Chaos Superboss.', 50, 'chaos_boss_kill', 'damage', 0.25, '+25% Dmg');
            addAch('GALAXY_S', 'Galactic Conqueror', 'Complete Story Mode with Gravity Hero.', 50, 'story_gravity', 'damage', 0.15, '+15% Dmg');
        }
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
    }
};

// Register
window.DLC_REGISTRY['champions_of_chaos'] = CHAMPIONS_OF_CHAOS;
