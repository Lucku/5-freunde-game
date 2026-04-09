// Waker of Winds - DLC Manifest

const WAKER_OF_WINDS = {
    id: 'waker_of_winds',
    name: "Waker of Winds",
    heroes: ['air'],
    description: "Introduces 'Air' (Turquoise Hero), the Sky Palace Biome, and the 'Waker of Winds' story campaign.",
    icon: "🌪️",

    load: async function () {
        console.log("[DLC] Loading: Waker of Winds...");

        if (window.dlcManager) {
            await window.dlcManager.loadScript('dlc/waker_of_winds/AirHero.js');
            await window.dlcManager.loadScript('dlc/waker_of_winds/WindBiome.js');
            await window.dlcManager.loadScript('dlc/waker_of_winds/WindEnemies.js');
            await window.dlcManager.loadScript('dlc/waker_of_winds/WindBosses.js');
            await window.dlcManager.loadScript('dlc/waker_of_winds/Story.js');
        }

        this.injectHero();
        this.injectBiome();
        this.injectEnemies();
        this.injectStory();
        this.injectStoryArcLabels();
        this.injectStoryTheme();
        this.injectAltar();
        this.injectAchievements();
        this.injectMemories();
        this.injectCards();

        // Register audio
        if (typeof audioManager !== 'undefined') {
            audioManager.registerSounds({
                'battle_air_1':            { path: 'dlc/waker_of_winds/audio/music/battle_1.mp3', loop: true, volume: 0.4 },
                'battle_air_2':            { path: 'dlc/waker_of_winds/audio/music/battle_2.mp3', loop: true, volume: 0.4 },
                'boss_air':                { path: 'dlc/waker_of_winds/audio/music/boss.mp3',      loop: true, volume: 0.6 },
                'attack_air_1':            { path: 'dlc/waker_of_winds/audio/sounds/attack_air_1.wav', volume: 0.3 },
                'attack_air_2':            { path: 'dlc/waker_of_winds/audio/sounds/attack_air_2.wav', volume: 0.3 },
                'attack_air_3':            { path: 'dlc/waker_of_winds/audio/sounds/attack_air_3.wav', volume: 0.3 },
                'attack_air_4':            { path: 'dlc/waker_of_winds/audio/sounds/attack_air_4.wav', volume: 0.3 },
                'special_air_1':           { path: 'dlc/waker_of_winds/audio/sounds/special_air_1.wav', volume: 0.5 },
                'special_air_2':           { path: 'dlc/waker_of_winds/audio/sounds/special_air_2.wav', volume: 0.5 },
                'special_air_3':           { path: 'dlc/waker_of_winds/audio/sounds/special_air_3.wav', volume: 0.5 },
                'special_air_4':           { path: 'dlc/waker_of_winds/audio/sounds/special_air_4.wav', volume: 0.5 },
                'gust_push':               { path: 'dlc/waker_of_winds/audio/sounds/boss_gust_push.wav',          volume: 0.4 },
                'hailstorm_burst':         { path: 'dlc/waker_of_winds/audio/sounds/boss_hailstorm_burst.wav',    volume: 0.55 },
                'cloud_golem_stomp':       { path: 'dlc/waker_of_winds/audio/sounds/boss_cloud_golem_stomp.wav',  volume: 0.55 },
                'crow_dive_screech':       { path: 'dlc/waker_of_winds/audio/sounds/boss_crow_dive_screech.wav',  volume: 0.4 },
                'screech_land':            { path: 'dlc/waker_of_winds/audio/sounds/boss_crow_screech_land.wav',  volume: 0.4 },
                'tornado_projectile_spawn':{ path: 'dlc/waker_of_winds/audio/sounds/boss_tornado_spawn.wav',      volume: 0.4 },
                'spin_dash':               { path: 'dlc/waker_of_winds/audio/sounds/boss_tornado_spin_dash.wav',  volume: 0.55 },
                'vortex_pull':             { path: 'dlc/waker_of_winds/audio/sounds/boss_vortex_pull.wav',        volume: 0.55 },
                'eye_of_storm_ring':       { path: 'dlc/waker_of_winds/audio/sounds/boss_eye_storm_ring.wav',     volume: 0.55 },
                'tempest_phase2_transition': { path: 'dlc/waker_of_winds/audio/sounds/boss_tempest_phase2.wav',   volume: 0.7 },
            });
            audioManager.registerMusicHook({
                priority: 100,
                check: () => typeof bossActive !== 'undefined' && bossActive && typeof enemies !== 'undefined' &&
                             enemies.some(e => e instanceof Boss && ['CLOUD_GOLEM','STORM_CROW','TORNADO_MACHINA','TEMPEST'].includes(e.type)),
                play: () => 'boss_air',
            });
            audioManager.registerMusicHook({
                priority: 50,
                check: () => typeof player !== 'undefined' && player && player.type === 'air' && audioManager.isStoryMode(),
                play: (am) => {
                    const t1 = am.tracks['battle_air_1'];
                    const t2 = am.tracks['battle_air_2'];
                    if (t1 && !t1.paused) return 'battle_air_1';
                    if (t2 && !t2.paused) return 'battle_air_2';
                    return Math.random() < 0.5 ? 'battle_air_1' : 'battle_air_2';
                },
            });
            audioManager.registerVoicePath('air', (id) => `dlc/waker_of_winds/audio/memories/air_${id}.mp3`);
            audioManager.registerExclamationPath('air', (s) => `dlc/waker_of_winds/audio/voices/air/${s}.mp3`);
            window.STORY_AUDIO_RESOLVERS = window.STORY_AUDIO_RESOLVERS || {};
            window.STORY_AUDIO_RESOLVERS['AIR'] = (id) => `dlc/waker_of_winds/audio/story/${id}.mp3`;
            audioManager.registerExclamationPath('air', (s) => `dlc/waker_of_winds/audio/voices/air/${s}.mp3`);
        }

        console.log("[DLC] Loaded: Waker of Winds (Success)");
    },

    injectHero: function () {
        // Stats injected via AirHero.js logic, but we add base stats for menu here
        if (typeof BASE_HERO_STATS !== 'undefined') {
            BASE_HERO_STATS['air'] = {
                color: '#40e0d0', // Turquoise
                hp: 60,
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
                update: window.WindEnemies.updateHarpy,
                draw: window.WindEnemies.drawHarpy
            };
            window.ENEMY_LOGIC['AERO_DRONE'] = {
                init: window.WindEnemies.initAeroDrone,
                update: window.WindEnemies.updateAeroDrone,
                draw: window.WindEnemies.drawAeroDrone
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

    injectStoryArcLabels: function () {
        window.STORY_ARC_LABELS = window.STORY_ARC_LABELS || {};
        window.STORY_ARC_LABELS['air'] = function (w) {
            if (w <= 10) return '✦  ARC I  ·  THE WHISPER OF THE WIND  ✦';
            if (w <= 20) return '✦  ARC II  ·  THE GATHERING STORM  ✦';
            if (w <= 30) return '✦  ARC III  ·  THE ASCENSION  ✦';
            if (w <= 40) return '✦  ARC IV  ·  THE KING\'S PATH  ✦';
            return '✦  ARC V  ·  THE WINDS OF CHANGE  ✦';
        };
    },

    injectStoryTheme: function () {
        window.STORY_THEME_OVERRIDES = window.STORY_THEME_OVERRIDES || {};
        window.STORY_THEME_OVERRIDES['air'] = { rgb: '64,224,208', icon: '🌪️' };
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
        const achievements = window.ACHIEVEMENTS || (typeof ACHIEVEMENTS !== 'undefined' ? ACHIEVEMENTS : null);
        if (!achievements) return;

        const addDLCAch = (id, title, desc, req, stat, type, val, text) => {
            if (!achievements.some(a => a.id === id)) {
                achievements.push({ id, title, desc, req, stat, bonus: { type, val, text } });
            }
        };

        // Air Hero — story & progression
        addDLCAch('wind_story',        'Sky Sovereign',    'Complete Story Mode with the Air Hero.',                        1,   'story_air',           'speed',  0.10, '+10% Speed');
        addDLCAch('wind_prestige_5',   'Tempest King',     'Reach Prestige 5 with the Air Hero.',                          5,   'air_prestige',        'damage', 0.05, '+5% Dmg');

        // Air Hero — unique mechanics
        addDLCAch('wind_tornado_30',   'Eye of the Tornado','Activate TORNADO 30 times across all runs.',                  30,  'air_tornado_count',   'damage', 0.05, '+5% Dmg');
        addDLCAch('wind_no_hit',       'Untouchable',      'Clear a wave in the Sky Palace without taking damage.',         1,   'no_hit_wind',         'knockback',0.20,'+20% KB');

        // Air Hero — enemy encounters
        addDLCAch('wind_harpy_kills',  'Harpy Hunter',     'Kill 500 Harpies.',                                             500, 'kill_HARPY',          'speed',  0.05, '+5% Speed');

        // Survival
        addDLCAch('wind_wave_25',      'Above the Clouds', 'Reach Wave 25 in the Sky Palace Biome.',                       25,  'wind_max_wave',       'health', 0.05, '+5% HP');
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
                ...createCardSet('HARPY', 'Harpy', '#00bcd4', 'Harpies take +50% Knockback', { type: 'stat_vs', val: 1.5, stat: 'knockback', target: 'HARPY' }),
                ...createCardSet('AERO_DRONE', 'Aero Drone', '#607d8b', 'Drones have 30% less HP', { type: 'damage_vs', val: 0.3, target: 'AERO_DRONE' }),
                ...createCardSet('CLOUD_MANTA', 'Cloud Manta', '#cfd8dc', 'Mantas cannot stealth', { type: 'special', id: 'MANTA_NO_STEALTH' })
            };

            Object.assign(COLLECTOR_CARDS, newCards);
            console.log("[DLC] Cards injected into COLLECTOR_CARDS");
        }
    }
};

// Register
if (!window.DLC_REGISTRY) window.DLC_REGISTRY = {};
window.DLC_REGISTRY['waker_of_winds'] = WAKER_OF_WINDS;
