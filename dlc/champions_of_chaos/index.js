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
            await window.dlcManager.loadScript('dlc/champions_of_chaos/VoidReaver.js'); // New Hero
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
                "Everything falls. That is the only truth I knew.",
                "I watched stars die and be born again in the silence between worlds.",
                "They call it chaos, but I see the pattern. The spiral.",
                "Gravity isn't just a force; it's a hunger. And I am starving.",
                "The others fight to preserve their elements. I fight to consume them.",
                "My power scares them. Good. Fear is heavy. Fear grounds them.",
                "I remember the Void. It wasn't empty. It was full of whispers.",
                "When I unleash the Galaxy, I feel at home.",
                "The Entropy Lord thinks he owns the chaos. He is just a tourist.",
                "I will show them what happens when the laws of physics break."
            ];

            MEMORY_STORIES['void'] = [
                "I am the glitch in the system. The error you cannot catch.",
                "Reality is fragile. I enjoy breaking it.",
                "They built walls to keep me out. I built a backdoor.",
                "My echoes remember what I have forgotten.",
                "Speed is an illusion. I am already there.",
                "The Void is not empty. It is full of rejected data.",
                "I don't kill. I merely delete.",
                "The kernel panicked long before I arrived.",
                "Do not fear the dark. Fear what hides within the code.",
                "Sync complete. Resetting universe... Error."
            ];
        }
    }
};

// Register
window.DLC_REGISTRY['champions_of_chaos'] = CHAMPIONS_OF_CHAOS;
