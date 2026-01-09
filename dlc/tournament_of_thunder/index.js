// The Tournament of Thunder - DLC Manifest

const TOURNAMENT_OF_THUNDER = {
    id: 'tournament_of_thunder',
    name: "The Tournament of Thunder",
    hero: 'lightning',
    description: "Enter the Cloud Kingdom! Introduces the Lightning Hero, Cloud Biome, and the legendary Tournament.",

    load: async function () {
        console.log("Tournament of Thunder: Injecting Content...");

        // Load Scripts
        if (window.dlcManager) {
            await window.dlcManager.loadScript('dlc/tournament_of_thunder/LightningHero.js');
            await window.dlcManager.loadScript('dlc/tournament_of_thunder/CloudBiome.js');
            await window.dlcManager.loadScript('dlc/tournament_of_thunder/ThunderEnemies.js');
            await window.dlcManager.loadScript('dlc/tournament_of_thunder/ThunderBoss.js');
        }

        this.injectHero();
        this.injectBiome();
        this.injectEnemies();
        this.injectStory();
        this.injectAltar();
        this.injectAchievements();
        this.injectMemories();
    },

    injectHero: function () {
        // 1. Add Hero Stats
        if (typeof BASE_HERO_STATS !== 'undefined') {
            BASE_HERO_STATS['lightning'] = {
                color: '#ffeb3b', // Yellow
                hp: 80,           // Fragile
                speed: 4.5,       // Very Fast
                rangeDmg: 20,
                meleeDmg: 5,
                rangeCd: 600,     // 0.6s
                meleeCd: 1000,
                projectileSpeed: 15,
                projectileSize: 5,
                knockback: 5,

                // Unique DLC Stats
                staticCharge: 0,
                maxStaticCharge: 100
            };
        }

        // 2. Register Logic
        if (!window.HERO_LOGIC) window.HERO_LOGIC = {};
        window.HERO_LOGIC['lightning'] = window.LightningHero;
    },

    injectBiome: function () {
        // Register Biome Logic
        if (!window.BIOME_LOGIC) window.BIOME_LOGIC = {};
        // Ensure CloudBiome is loaded (It was loaded via script)
        if (window.CloudBiome) {
            window.BIOME_LOGIC['cloud'] = window.CloudBiome;
            console.log("Cloud Biome registered.");
        } else {
            console.error("CloudBiome class not found!");
        }
    },

    injectEnemies: function () {
        if (window.ThunderEnemies) {
            window.ThunderEnemies.inject();
        }
    },

    injectStory: function () {
        const events = window.STORY_EVENTS || (typeof STORY_EVENTS !== 'undefined' ? STORY_EVENTS : null);

        if (events) {
            if (events.some(e => e.id === 'thunder_start')) return;

            // Generate 50 chapters with Objectives
            // Structuring similar to Rise of the Rock

            const thunderStory = [];

            // Helper to add chapters
            const addChapter = (i, title, text, type = "NARRATIVE", data = null) => {
                thunderStory.push({
                    id: `thunder_${i}`,
                    wave: i,
                    hero: "LIGHTNING",
                    type: type,
                    title: title,
                    text: text,
                    data: data
                });
            };

            const storyData = [
                { t: "Chains of Lightning", b: "You awake in an electrified cage. Makuta, the shadow lord, laughs from his high throne. 'Fight for my amusement, little spark, and perhaps you shall earn your freedom.' The Tournament begins." },
                { t: "The First Blood", b: "The crowd jeers as you step out. They expect you to die instantly. Prove them wrong." },
                { t: "Static Charge", b: "You feel the electricity in the air. It's not just a hazard; it's fuel. You can use this." },
                { t: "The Cage Rattles", b: "Another victory. The guards look nervous. Makuta merely sips his drink." },
                { t: "The First Test", b: "You have survived the initial weaklings. Makuta looks bored. He gestures, and the arena floor shifts, revealing spikes and storm vents. 'Dance!' he commands." },
                { t: "Wind Walker", b: "The winds pick up. Heavy contenders stumble, but you move with the gale. Speed is your ally." },
                { t: "Thunderous Applause", b: "For the first time, a section of the crowd cheers for you. The underdog is rising." },
                { t: "The Shadow's Pet", b: "Makuta sends in a beast of pure shadow. It fears the light. Shine bright." },
                { t: "Ozone Layer", b: "The air grows thin. Breathing is hard, but your spark burns hotter in the void." }
            ];

            // Wave 1-9 (Narrative)
            storyData.forEach((d, idx) => addChapter(idx + 1, d.t, d.b));

            // Wave 10: Special Objective (Survival)
            addChapter(10, "The Gauntlet", "Makuta seals the exits and floods the arena with elites. 'Survival is your only objective,' he sneers.", "OBJECTIVE_WAVE", { objective: "SURVIVE", duration: 60 });

            // Waves 11-19
            const storyData2 = [
                { t: "Scrap Metal", b: "The champion from Wave 10 lies in ruins. Makuta's glass shatters in his hand. Now, he is paying attention." },
                { t: "The Upper Deck", b: "You are moved to the upper arena. The fall is deadly, but the view is clear. You see the generator." },
                { t: "Short Circuit", b: "A momentary power failure. The shields flicker. Just for a second, you see a way out." },
                { t: "The Twins", b: "Two storm elementals at once. They coordinate their strikes. Divide and conquer." },
                { t: "Silence", b: "A round with no music, no announcer. Just the sound of your heart and the crackle of electricity." },
                { t: "The Gambler", b: "We bet on you, kid. Don't let us down. A note thrown into the arena wrapped around a health potion." },
                { t: "Volatile Ground", b: "The platforms are unstable. Run or fall. There is no standing still." },
                { t: "Eye of the Storm", b: "Calm before the chaos. Center yourself. The next wave will be relentless." },
                { t: "Surge", b: "Power levels are spiking. The arena is trying to overload you. Absorb it." }
            ];
            storyData2.forEach((d, idx) => addChapter(idx + 11, d.t, d.b));

            // Wave 20: Special Objective (Protect the Generator?)
            // Or "Charge the Coils" - Stand in zones.
            // Since game logic might not support zones, we stick to generic Kill/Survive objectives the game likely has or NARRATIVE boss.
            addChapter(20, "Overload", "The arena's generator is exposed. If you can withstand the energy surge, you might break the dampeners.", "BOSS_FIGHT", { bossId: 'GENERATOR_GUARDIAN' }); // Or standard boss if ID doesn't exist

            // ... Continue filling rest or procedural ...
            for (let i = 21; i < 50; i++) {
                addChapter(i, `Round ${i}`, "The tournament continues. The crowd roars.");
            }

            // Unique Objective at 40
            addChapter(40, "The Rebellion", "The prisoners are rioting! Makuta's guards are distracted. Now is your chance to strike the supports!", "OBJECTIVE_WAVE", { objective: "KILL_COUNT", count: 50 });

            // Final Boss at 50
            addChapter(50, "The Final Spark", "Makuta summons his mightiest minion, ZEUS. A titan of living lightning descends from the heavens. 'Show this spark what real power looks like,' Makuta commands.", "BOSS_FIGHT", { bossId: 'ZEUS' });

            // The End
            addChapter(51, "Champion of Thunder", "Zeus bows before you. Makuta scoffs but honors the deal. You are free, and you are the champion.", "THE_END");

            // Append to global events
            events.push(...thunderStory);
        }
    },

    injectAltar: function () {
        // Altar Data is now handled directly in AltarData.js
        console.log("Tournament of Thunder: Altar Data managed in core file.");
    },

    injectAchievements: function () {
        const achievements = window.ACHIEVEMENTS || (typeof ACHIEVEMENTS !== 'undefined' ? ACHIEVEMENTS : null);
        if (achievements) {
            const addDLCAch = (id, title, desc, req, stat, type, val, text) => {
                if (!achievements.some(a => a.id === id)) {
                    achievements.push({ id, title, desc, req, stat, bonus: { type, val, text } });
                }
            };

            addDLCAch('thunder_prestige_10', 'Thunder God', 'Tournament of Thunder: Reach Prestige 10 with Lightning Hero.', 10, 'lightning_prestige', 'damage', 0.05, '+5% Dmg');
            addDLCAch('thunder_clear', 'Champion', 'Tournament of Thunder: Complete the story.', 1, 'story_lightning', 'speed', 0.10, '+10% Speed');
        }
    },

    injectMemories: function () {
        if (typeof MEMORY_STORIES !== 'undefined') {
            MEMORY_STORIES['lightning'] = [
                "Speed was always my obsession, the blur of the world rushing past my eyes.",
                "But no matter how fast I ran, I couldn't outrun the feeling of not belonging.",
                "I worked as an electrical engineer, fixing circuits and grids, fascinated by the invisible flow of power.",
                "One night, a massive storm hit the city, the kind that rattles bones and turns the sky violet.",
                "A transformer blew nearby, arcing wild, deadly electricity towards a crowd of bystanders.",
                "I didn't think; I just moved, pushing a child out of the way of the falling cable.",
                "The bolt hit me square in the chest, stopping my heart... and then restarting it with a different rhythm.",
                "I didn't die. I absorbed it. The pain was replaced by a rush of pure adrenaline.",
                "My veins glowed, my hair stood on end, and I felt connected to every electron in the air.",
                "The government noticed quickly. Men in dark suits, endless tests in sterile white rooms.",
                "They wanted to contain me, to study me, to use me as a living battery.",
                "They underestimated the charge I held.",
                "I escaped, running faster than sound, turning into a streak of living light.",
                "My escape led me to a strange, ancient gate hidden deep in the mountains.",
                "It pulsed with the same energy I felt buzzing inside my bones.",
                "Touching it transported me here, to this Arena, a place out of time.",
                "Here, the air is thick with magic and danger, and I finally feel unfiltered.",
                "I learned to channel my static, to chain lightning between foes like a deadly dance.",
                "In my world, I was a freak, a science experiment gone wrong. Here, I am a force of nature.",
                "The others accepted me, though I move too fast for their liking sometimes."
            ];
        }

        // Extensibility: Hook into MemoryShard color
        if (typeof MemoryShard !== 'undefined') {
            const originalGetColor = MemoryShard.prototype.getColorByType;
            MemoryShard.prototype.getColorByType = function (type) {
                if (type === 'lightning') return '#ffeb3b';
                return originalGetColor.call(this, type);
            }
        }

        // Extensibility: Hook into Museum artifact spawning
        if (typeof Museum !== 'undefined') {
            const originalSpawn = Museum.prototype.spawnEntities;
            Museum.prototype.spawnEntities = function () {
                originalSpawn.call(this); // Run base logic

                // Add Lightning Artifact
                if (saveData.memories['lightning'] && Array.isArray(saveData.memories['lightning']) && saveData.memories['lightning'].length > 0) {
                    const count = saveData.memories['lightning'].length;
                    const room = this.rooms.find(r => r.name === 'gallery');
                    if (room) {
                        this.artifacts.push({
                            x: room.x + room.w - 100,
                            y: room.y + room.h / 2,
                            text: `Lightning: ${count}`,
                            color: '#ffeb3b',
                            type: 'MEMORY',
                            hero: 'lightning'
                        });
                    }
                }
            }
        }
    }
};

// Register via global or Manager
if (window.DLC_REGISTRY) {
    window.DLC_REGISTRY['tournament_of_thunder'] = TOURNAMENT_OF_THUNDER;
}
