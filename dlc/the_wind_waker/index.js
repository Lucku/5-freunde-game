// The Wind Waker - DLC Manifest

const THE_WIND_WAKER = {
    id: 'the_wind_waker',
    name: "The Wind Waker",
    heroes: ['air'],
    description: "Introduces 'Air' (Turquoise Hero), the Sky Palace Biome, and the 'Wind Waker' story campaign.",
    icon: "🌪️",

    load: async function () {
        console.log("[DLC] Loading: The Wind Waker...");

        if (window.dlcManager) {
            await window.dlcManager.loadScript('dlc/the_wind_waker/AirHero.js');
            await window.dlcManager.loadScript('dlc/the_wind_waker/WindBiome.js');
            await window.dlcManager.loadScript('dlc/the_wind_waker/WindEnemies.js');
            await window.dlcManager.loadScript('dlc/the_wind_waker/WindBosses.js');
            await window.dlcManager.loadScript('dlc/the_wind_waker/Story.js');
        }

        this.injectHero();
        this.injectBiome();
        this.injectEnemies();
        this.injectStory();
        this.injectAltar();
        this.injectAchievements();
        this.injectMemories();

        console.log("[DLC] Loaded: The Wind Waker (Success)");
    },

    injectHero: function () {
        // Stats injected via AirHero.js logic, but we add base stats for menu here
        if (typeof BASE_HERO_STATS !== 'undefined') {
            BASE_HERO_STATS['air'] = {
                color: '#40e0d0', // Turquoise
                hp: 65,
                speed: 5.5, // Fastest base speed
                rangeDmg: 20,
                meleeDmg: 80,
                rangeCd: 80,
                meleeCd: 80,
                projectileSpeed: 6,
                projectileSize: 6,
                knockback: 15 // High Knockback
            };
        }
    },

    injectBiome: function () {
        console.log("Sky Palace Biome initialized.");
        if (typeof window.BIOME_LOGIC === 'undefined') window.BIOME_LOGIC = {};
        if (window.WindBiome) {
            window.BIOME_LOGIC['air'] = window.WindBiome;
        }
    },

    injectEnemies: function () {
        console.log("Wind Enemies initialized.");
        if (typeof ENEMY_TYPES !== 'undefined') {
            if (!ENEMY_TYPES.includes('HARPY')) ENEMY_TYPES.push('HARPY');
            if (!ENEMY_TYPES.includes('AERO_DRONE')) ENEMY_TYPES.push('AERO_DRONE');
            if (!ENEMY_TYPES.includes('CLOUD_MANTA')) ENEMY_TYPES.push('CLOUD_MANTA');
        }

        if (typeof window.ENEMY_LOGIC === 'undefined') window.ENEMY_LOGIC = {};
        if (window.WindEnemies) {
            window.ENEMY_LOGIC['HARPY'] = {
                init: window.WindEnemies.initHarpy,
                update: window.WindEnemies.updateHarpy
                // draw: default
            };
            window.ENEMY_LOGIC['AERO_DRONE'] = {
                init: window.WindEnemies.initAeroDrone,
                update: window.WindEnemies.updateAeroDrone
            };
            window.ENEMY_LOGIC['CLOUD_MANTA'] = {
                init: window.WindEnemies.initCloudManta,
                update: window.WindEnemies.updateCloudManta,
                draw: window.WindEnemies.drawCloudManta
            };
        }
    },

    injectStory: function () {
        if (typeof STORY_EVENTS !== 'undefined' && window.WIND_STORY_CHAPTERS) {
            window.STORY_EVENTS = window.STORY_EVENTS.concat(window.WIND_STORY_CHAPTERS);
            console.log(`The Wind Waker: Injected ${window.WIND_STORY_CHAPTERS.length} story chapters.`);
        }
    },

    injectAltar: function () {
        if (typeof ALTAR_TREE !== 'undefined') {
            // AIR HERO SKILLS
            ALTAR_TREE['air'] = [
                { id: 'a1', req: 1, type: 'stat', stat: 'cooldown', val: 0.9, desc: 'Wind Shear Cooldown -10%' },
                { id: 'a2', req: 3, type: 'stat', stat: 'knockback', val: 1.3, desc: 'Gust: Pushback +30%' },
                { id: 'a3', req: 5, type: 'unique', desc: 'Headwind: Enemies moving towards you are slowed' }
            ];

            // CROSS CONVERGENCE SKILLS
            const airMutations = [
                { id: 'c22', req: { fire: 5, air: 5 }, type: 'mutation', desc: 'Firestorm: Wind attacks spread fire' },
                { id: 'c23', req: { water: 5, air: 5 }, type: 'mutation', desc: 'Typhoon: Knockback distance increased by 50%' },
                { id: 'c24', req: { ice: 5, air: 5 }, type: 'mutation', desc: 'Blizzard: Frozen enemies shatter when pushed' },
                { id: 'c25', req: { plant: 5, air: 5 }, type: 'mutation', desc: 'Pollen: Wind attacks heal for small amounts' },
                { id: 'c26', req: { metal: 5, air: 5 }, type: 'mutation', desc: 'Shrapnel: Wind attacks cause bleeding' },
                { id: 'c27', req: { earth: 5, air: 5 }, type: 'mutation', desc: 'Sandstorm: Blinds enemies, reducing their accuracy' },
                { id: 'c28', req: { lightning: 5, air: 5 }, type: 'mutation', desc: 'Thunderhead: Wind attacks generate static sparks' }
            ];

            // Add only if not already present
            if (ALTAR_TREE.convergence) {
                airMutations.forEach(m => {
                    if (!ALTAR_TREE.convergence.find(ex => ex.id === m.id)) {
                        ALTAR_TREE.convergence.push(m);
                    }
                });
            }
        }
    },

    injectAchievements: function () {
        if (typeof addAch === 'function') {
            addAch('AIR_UNLOCK', 'Wind Waker', 'Unlock all Air Hero Altar skills.', 10, 'unlock_air', 'speed', 0.1, '+10% Speed');
            addAch('TEMPEST_KING', 'Tempest King', 'Defeat the Storm Bringer Superboss.', 50, 'wind_boss_kill', 'damage', 0.25, '+25% Dmg');

            // New DLC Achievements
            addAch('wind_perfect_flow', 'Untouchable', 'Clear a Wind Waker wave without taking damage.', 15, 'no_hit_wind', 'knockback', 0.2, '+20% KB');
        }
    },

    injectMemories: function () {
        if (typeof MEMORY_STORIES !== 'undefined') {
            MEMORY_STORIES['air'] = [
                "I woke up falling. No ground beneath me, just an endless expanse of gray clouds. The wind screamed in my ears, deafening and cold. Panic rushed in before breath did.",
                "I tried to scream, but the gale stole the sound from my throat. My body felt light, wrong, as if my bones were made of hollow reeds. I flailed, grasping at mist.",
                "There are islands floating in this void. Shattered remnants of a place that feels familiar yet alien. I landed on one, bruising my knees. Why is there stone in the sky?",
                "The silence here is heavier than the wind. When the gusts die down, I hear nothing. no birds, no insects, just the terrifying sound of my own shallow breathing.",
                "I found a mask today. It was lying near a precipice, staring up at the empty sky. It looks like... me? But twisted. Angry. I kicked it over the edge.",
                "My hands are changing. The skin is turning a pale turquoise, and when I move fast, I leave trails of light. Am I sick? Or is this place changing me?",
                "I remember a voice. A deep, rumbling laughter. 'Too slow,' it said. 'Always too slow.' Who was that? Why does the memory make my chest ache?",
                "I tried to fly today. Pure instinct took over when I slipped. For a second, I hovered. Then I crashed. Frustration burns hotter than the cold wind.",
                "The creatures here are made of storm and stone. They ignore me until I move. Acceleration triggers their aggression. I must be fast, but never unseen.",
                "I found a carving on a pillar. It shows a figure commanding tornadoes. The face is eroded, but the posture... it's arrogant. Was this a king? Or a tyrant?",
                "The pressure changes constantly. My head throbs. Sometimes gravity feels like a suggestion, other times like an anchor chaining me to these rocks.",
                "I killed something today. A harpy. It looked at me with human eyes before it dissolved into vapor. I feel sick. Was it trapped here too?",
                "I had a dream of the ground. Green grass, heavy soil. Real weight. I woke up crying. I don't think I can ever go back down.",
                "The wind speaks now. Not words, but intent. It wants me to push harder. To break myself against the resistance. It feels like a cruel teacher.",
                "I found another mask. I put this one on. For a moment, the confusion vanished. I felt... powerful. Dangerous. I tore it off before I lost myself.",
                "I saw a reflection in a pool of rainwater. My eyes are glowing. I don't recognize the person looking back. He looks like he belongs here. I hate him.",
                "The Storm King. The name floated into my mind like a stray leaf. Is he the one doing this? Is this his prison or his playground?",
                "I am faster now. Faster than thought. I moved through a barrage of lightning without thinking. My body is a weapon, sculpted by this hostile air.",
                "I don't know if I'm surviving or evolving. The difference feels meaningless. All that matters is the next gust, the next jump, the next kill.",
                "If I reach the top... if I clear these skies... will I find answers? Or just more empty air? I have to know. I have to keep climbing."
            ];
        }
    }
};

// Register
if (window.DLC_REGISTRY) {
    window.DLC_REGISTRY['the_wind_waker'] = THE_WIND_WAKER;
}
