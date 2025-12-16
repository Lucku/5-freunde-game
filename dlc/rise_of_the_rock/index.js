// The Rise of the Rock - DLC Manifest

const RISE_OF_THE_ROCK = {
    id: 'rise_of_the_rock',
    name: "The Rise of the Rock",
    description: "Introduces the Earth Hero, Rock Biome, and a new Story Campaign.",

    load: async function () {
        console.log("Rise of the Rock: Injecting Content...");

        // Load Scripts
        if (window.dlcManager) {
            await window.dlcManager.loadScript('dlc/rise_of_the_rock/EarthHero.js');
            await window.dlcManager.loadScript('dlc/rise_of_the_rock/RockBiome.js');
            await window.dlcManager.loadScript('dlc/rise_of_the_rock/RockEnemies.js');
        }

        this.injectHero();
        this.injectBiome();
        this.injectEnemies();
        this.injectStory();
        this.injectAltar();
    },

    injectHero: function () {
        // 1. Add Hero Stats
        if (typeof BASE_HERO_STATS !== 'undefined') {
            BASE_HERO_STATS['earth'] = {
                color: '#8d6e63', // Brown
                hp: 120,          // Tanky
                speed: 2.5,       // Slow base (overridden by EarthHero logic)
                rangeDmg: 0,      // No range
                meleeDmg: 100,    // Ramming damage base
                rangeCd: 999,     // Disable standard shooting
                meleeCd: 999,     // Disable standard melee
                projectileSpeed: 0,
                projectileSize: 0,
                knockback: 30,    // Huge knockback

                // Unique DLC Stats
                momentum: 0,      // Custom resource
                maxMomentum: 100
            };
        }

        // 2. Register Logic
        if (!window.HERO_LOGIC) window.HERO_LOGIC = {};
        window.HERO_LOGIC['earth'] = window.EarthHero;
    },

    injectStory: function () {
        if (typeof STORY_EVENTS !== 'undefined') {
            // Add 40 Chapters for Earth
            for (let i = 1; i <= 40; i++) {
                STORY_EVENTS.push({
                    id: `rock_${i}`,
                    wave: i * 2, // Every 2 waves
                    hero: "EARTH",
                    type: "NARRATIVE",
                    title: `Chapter ${i}: The Ascent`,
                    text: `The earth rumbles as you climb higher. The enemies grow stronger, but your resolve is as hard as stone. (Wave ${i * 2})`
                });
            }
        }
    },

    injectAltar: function () {
        if (typeof ALTAR_TREE !== 'undefined') {
            ALTAR_TREE['earth'] = [
                { id: 'e1', req: 1, type: 'stat', stat: 'cooldown', val: 0.9, desc: 'Seismic Slam Cooldown -10%' },
                { id: 'e2', req: 3, type: 'stat', stat: 'radius', val: 1.2, desc: 'Seismic Slam Radius +20%' },
                { id: 'e3', req: 5, type: 'unique', desc: 'Aftershock: Seismic Slam triggers twice' }
            ];
        }
    },

    injectEnemies: function () {
        if (typeof ENEMY_TYPES !== 'undefined') {
            if (!ENEMY_TYPES.includes('GOLEM')) ENEMY_TYPES.push('GOLEM');
            if (!ENEMY_TYPES.includes('BURROWER')) ENEMY_TYPES.push('BURROWER');
        }

        // Register Logic
        if (!window.ENEMY_LOGIC) window.ENEMY_LOGIC = {};

        window.ENEMY_LOGIC['GOLEM'] = {
            init: window.RockEnemies.initGolem,
            update: window.RockEnemies.updateGolem,
            draw: window.RockEnemies.drawGolem
        };

        window.ENEMY_LOGIC['BURROWER'] = {
            init: window.RockEnemies.initBurrower,
            update: window.RockEnemies.updateBurrower,
            draw: window.RockEnemies.drawBurrower
        };
    },

    injectBiome: function () {
        // Register Biome Logic
        if (!window.BIOME_LOGIC) window.BIOME_LOGIC = {};
        window.BIOME_LOGIC['rock'] = window.RockBiome;

        // Add to Constants if needed (game.js usually picks random from keys or array)
        // We need to ensure 'rock' is in the rotation.
        // Assuming game.js has a 'types' array for biomes or uses hero types.
        // If biomes are tied to hero types, we are good since we added 'earth' hero.
        // But we need to map 'earth' hero to 'rock' biome or just name the biome 'earth'.
        // Let's alias it.
        window.BIOME_LOGIC['earth'] = window.RockBiome;
    }
};

// Register globally
if (!window.DLC_REGISTRY) window.DLC_REGISTRY = {};
window.DLC_REGISTRY['rise_of_the_rock'] = RISE_OF_THE_ROCK;
