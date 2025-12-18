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
        this.injectAchievements();
        this.injectMemories();
    },

    injectMemories: function () {
        if (typeof MEMORY_STORIES !== 'undefined') {
            MEMORY_STORIES['earth'] = [
                "I don't remember being born, only waking up in the dark.",
                "The crystal cage was cold, humming with a song that made my teeth ache.",
                "For a long time, I thought I was the crystal, just another part of the cave wall.",
                "Then came the anger, hot and sudden, cracking the silence and the stone.",
                "When I broke free, my hands were heavy, my skin rough like the cavern floor.",
                "I stumbled through the dark, guided only by the vibration of distant movement.",
                "The creatures here are blind, hungry things that know only how to devour.",
                "I learned quickly that I am not food; I am the thing that breaks teeth.",
                "Every time I smash a rock, I feel a strange satisfaction, like I'm reshaping the world.",
                "But the silence is loud. Am I the only one who thinks? The only one who feels?",
                "I found a shadow that spoke with a voice like sliding gravel.",
                "He called himself the Jailer, but his eyes held fear when he looked at me.",
                "He said I was a mistake, a variable that wasn't supposed to wake up.",
                "Fighting him felt like fighting my own shadow, heavy and suffocating.",
                "When he vanished, he left behind a scent of ozone and a path leading up.",
                "The light of the surface hurts my eyes, but it warms my stone skin.",
                "I see the sky and I feel small for the first time.",
                "There are others out there. I can feel their footsteps in the earth, miles away.",
                "They are fighting too. Fighting the same shadow that trapped me.",
                "I am coming. The mountain is moving, and I will not be stopped."
            ];
        }
    },

    injectAchievements: function () {
        // Ensure we are using the global array
        const achievements = window.ACHIEVEMENTS || (typeof ACHIEVEMENTS !== 'undefined' ? ACHIEVEMENTS : null);

        if (achievements) {
            // Helper to add achievement if not exists
            const addDLCAch = (id, title, desc, req, stat, type, val, text) => {
                if (!achievements.some(a => a.id === id)) {
                    achievements.push({ id, title, desc, req, stat, bonus: { type, val, text } });
                }
            };

            // 1. Earth Hero Prestige
            addDLCAch('rock_prestige_10', 'Earth Master', 'Rise of the Rock: Reach Prestige 10 with Earth Hero.', 10, 'earth_prestige', 'damage', 0.05, '+5% Dmg');

            // 2. Rock Biome Survival
            addDLCAch('rock_wave_50', 'Survivor', 'Rise of the Rock: Reach Wave 50 in Rock Biome.', 50, 'rock_max_wave', 'health', 0.10, '+10% HP');

            // 3. Golem Slayer
            addDLCAch('rock_kill_golem', 'Golem Breaker', 'Rise of the Rock: Kill 500 Golems.', 500, 'kill_GOLEM', 'damage', 0.05, '+5% Dmg vs Golems');

            // 4. Burrower Slayer
            addDLCAch('rock_kill_burrower', 'Exterminator', 'Rise of the Rock: Kill 500 Burrowers.', 500, 'kill_BURROWER', 'speed', 0.05, '+5% Speed');
        } else {
            console.error("Rise of the Rock: Could not find ACHIEVEMENTS to inject into.");
        }
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
                meleeCd: 120,     // Tremor Cooldown (2s)
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
        // Robustly find the events array
        const events = window.STORY_EVENTS || (typeof STORY_EVENTS !== 'undefined' ? STORY_EVENTS : null);

        if (events) {
            // Check if already injected to avoid duplicates
            if (events.some(e => e.id === 'rock_start')) return;

            const earthStory = [
                // --- ARC 1: THE AWAKENING ---
                {
                    id: "rock_start", wave: 1, hero: "EARTH", type: "NARRATIVE",
                    title: "The Cage",
                    text: "Darkness. That is all you knew. You woke up trapped in a crystal cage, deep within the earth. But something changed. A surge of power. You shattered the crystal with a single touch. You are free, but you are deep underground. You must climb."
                },
                {
                    id: "rock_2", wave: 2, hero: "EARTH", type: "NARRATIVE",
                    title: "First Steps",
                    text: "Your legs feel heavy, like stone pillars. Every step shakes the ground. You are not just walking; you are colliding with the world. You must learn to control this weight."
                },
                {
                    id: "rock_3", wave: 3, hero: "EARTH", type: "NARRATIVE",
                    title: "The Hunger",
                    text: "Creatures of the deep sense your awakening. They are blind, driven by hunger. They swarm towards the vibration of your footsteps. You have no weapon but your own body."
                },
                {
                    id: "rock_4", wave: 4, hero: "EARTH", type: "NARRATIVE",
                    title: "Hardened Skin",
                    text: "A beast bites your arm, but its teeth shatter. Your skin is not flesh; it is living rock. You realize you are not soft like the creatures that hunt you. You are the mountain."
                },
                {
                    id: "rock_5", wave: 5, hero: "EARTH", type: "NARRATIVE",
                    title: "Alone?",
                    text: "The caves are vast and empty, save for the monsters. You are scared. Who are you? Why do you have this power? You call out, but only echoes answer. Are you the only one of your kind?"
                },
                {
                    id: "rock_6", wave: 6, hero: "EARTH", type: "NARRATIVE",
                    title: "Echoes",
                    text: "The echoes return, but they sound... wrong. Distorted. Like a laugh. Is the cave mocking you? Or is someone watching from the shadows?"
                },
                {
                    id: "rock_7", wave: 7, hero: "EARTH", type: "NARRATIVE",
                    title: "Crystal Veins",
                    text: "You pass veins of glowing crystal. They pulse with the same energy you feel in your chest. You touch one, and it dims, its light flowing into you. You are part of this place."
                },
                {
                    id: "rock_8", wave: 8, hero: "EARTH", type: "NARRATIVE",
                    title: "Tremors",
                    text: "The ground shakes violently. Not from you, but from below. Something massive is moving in the deep. You must climb higher, faster."
                },
                {
                    id: "rock_9", wave: 9, hero: "EARTH", type: "NARRATIVE",
                    title: "The Crumbling",
                    text: "Dust falls from the ceiling. The tunnel is unstable. The fighting is causing the cave to collapse. You need to break through before you are buried."
                },
                {
                    id: "rock_10", wave: 10, hero: "EARTH", type: "OBJECTIVE_WAVE",
                    title: "The Collapse",
                    text: "The tunnel ahead is collapsing! You must use your momentum to smash through the falling debris before you are buried alive. Run!",
                    data: { objective: true }
                },

                // --- ARC 2: THE CLIMB ---
                {
                    id: "rock_11", wave: 11, hero: "EARTH", type: "NARRATIVE",
                    title: "Upward",
                    text: "You burst through the rubble into a larger cavern. The air is slightly fresher here. There is a draft coming from above. A path."
                },
                {
                    id: "rock_12", wave: 12, hero: "EARTH", type: "NARRATIVE",
                    title: "Bioluminescence",
                    text: "Giant mushrooms glow with a soft blue light. It's beautiful, but deadly. Spores drift in the air, choking and toxic. Even stone can erode."
                },
                {
                    id: "rock_13", wave: 13, hero: "EARTH", type: "NARRATIVE",
                    title: "The Swarm",
                    text: "Burrowers erupt from the walls! They don't just attack; they try to drag you back down. They are the jailer's hounds. Kick them off!"
                },
                {
                    id: "rock_14", wave: 14, hero: "EARTH", type: "NARRATIVE",
                    title: "Momentum",
                    text: "You learn that speed is your ally. When you stand still, you are a target. When you move, you are a cannonball. Don't stop."
                },
                {
                    id: "rock_15", wave: 15, hero: "EARTH", type: "NARRATIVE",
                    title: "Unstoppable",
                    text: "Fear is giving way to amazement. You are not just strong; you are a force of nature. The rocks that once trapped you now crumble before your charge. You are beginning to enjoy this."
                },
                {
                    id: "rock_16", wave: 16, hero: "EARTH", type: "NARRATIVE",
                    title: "Ancient Bones",
                    text: "You stumble upon a graveyard of massive bones. Creatures larger than any you've seen. What killed them? And why do the bones look... gnawed?"
                },
                {
                    id: "rock_17", wave: 17, hero: "EARTH", type: "NARRATIVE",
                    title: "Shadow Presence",
                    text: "The feeling of being watched returns. It's stronger now. A cold chill that penetrates your stone skin. He is here."
                },
                {
                    id: "rock_18", wave: 18, hero: "EARTH", type: "NARRATIVE",
                    title: "The Trap",
                    text: "The floor gives way! It's a pitfall trap. You catch the ledge just in time. This was not nature; this was design. Someone wants you to fall."
                },
                {
                    id: "rock_19", wave: 19, hero: "EARTH", type: "NARRATIVE",
                    title: "Dark Whispers",
                    text: "A voice slithers into your mind. 'Go back to sleep, little rock. The surface is not for you.' It tries to make your limbs heavy. Fight it!"
                },
                {
                    id: "rock_20", wave: 20, hero: "EARTH", type: "BOSS_FIGHT",
                    title: "The Jailer",
                    text: "A shadow blocks your path. It feels familiar... cold. 'You were not meant to wake,' it hisses. It is the one who caged you. Makuta. He will not let his prisoner escape so easily.",
                    data: { bossId: 'MAKUTA' } // Small Makuta fight
                },

                // --- ARC 3: THE SURFACE ---
                {
                    id: "rock_21", wave: 21, hero: "EARTH", type: "NARRATIVE",
                    title: "Aftermath",
                    text: "The shadow disperses, laughing as it fades. 'This is but a fragment,' it mocks. You are tired, cracked, but victorious. You climb over his defeated form."
                },
                {
                    id: "rock_22", wave: 22, hero: "EARTH", type: "NARRATIVE",
                    title: "Fresh Air",
                    text: "The stale air of the deep is replaced by something crisp. Ozone. Wind. You've never smelled it before, but your soul recognizes it. Freedom."
                },
                {
                    id: "rock_23", wave: 23, hero: "EARTH", type: "NARRATIVE",
                    title: "Roots",
                    text: "Thick roots penetrate the ceiling here. Life from above reaching down. If trees can break through the rock to reach the deep, you can break through to reach the sky."
                },
                {
                    id: "rock_24", wave: 24, hero: "EARTH", type: "NARRATIVE",
                    title: "Hope",
                    text: "The weight on your chest lifts. The fear of the dark recedes. You are no longer running away; you are running towards something."
                },
                {
                    id: "rock_25", wave: 25, hero: "EARTH", type: "NARRATIVE",
                    title: "A Glimmer",
                    text: "You defeated the shadow, but he vanished into smoke. You press on. Above, you see it—a faint, pale light. Not the glow of crystals, but true sunlight. You are close."
                },
                {
                    id: "rock_26", wave: 26, hero: "EARTH", type: "NARRATIVE",
                    title: "Stone Sentinels",
                    text: "Statues line the path. Ancient warriors of stone. As you pass, their eyes glow red. They are the guardians of the gate, and they do not recognize you as friend."
                },
                {
                    id: "rock_27", wave: 27, hero: "EARTH", type: "NARRATIVE",
                    title: "The Guardian's Warning",
                    text: "A booming voice fills the chamber. 'TURN BACK. THE SURFACE IS FORBIDDEN.' The sentinels step off their pedestals. They are slow, but they are many."
                },
                {
                    id: "rock_28", wave: 28, hero: "EARTH", type: "NARRATIVE",
                    title: "Defiance",
                    text: "'No.' You speak for the first time. Your voice is like grinding tectonic plates. 'I. Will. Rise.' The sentinels charge."
                },
                {
                    id: "rock_29", wave: 29, hero: "EARTH", type: "NARRATIVE",
                    title: "Near the Top",
                    text: "The light is blinding now. You can see the exit, a jagged tear in the cavern roof. Just a little further. The sentinels are relentless."
                },
                {
                    id: "rock_30", wave: 30, hero: "EARTH", type: "OBJECTIVE_WAVE",
                    title: "The Gauntlet",
                    text: "The path to the surface is guarded by ancient defenses. Stone sentinels awaken to stop you. Prove that you are the master of the earth, not its prisoner.",
                    data: { objective: true }
                },

                // --- ARC 4: THE REVELATION ---
                {
                    id: "rock_31", wave: 31, hero: "EARTH", type: "NARRATIVE",
                    title: "Broken Chains",
                    text: "You smash the last sentinel. The magic binding you to this place snaps. You feel light. Lighter than stone should be."
                },
                {
                    id: "rock_32", wave: 32, hero: "EARTH", type: "NARRATIVE",
                    title: "The Sky",
                    text: "You reach the tear. Blue. Infinite blue. It's terrifying and beautiful. Clouds drift by, soft and white. You reach a hand out."
                },
                {
                    id: "rock_33", wave: 33, hero: "EARTH", type: "NARRATIVE",
                    title: "Memories",
                    text: "As the sunlight hits your skin, flashes of memory return. You weren't always a rock. You were... someone. Someone who laughed. Someone who had friends."
                },
                {
                    id: "rock_34", wave: 34, hero: "EARTH", type: "NARRATIVE",
                    title: "Identity",
                    text: "You are Earth. But you are also... a protector. You remember a promise. 'We will stand together.' Who were you promising?"
                },
                {
                    id: "rock_35", wave: 35, hero: "EARTH", type: "NARRATIVE",
                    title: "The Question",
                    text: "As you near the surface, a thought troubles you. If there was a Jailer, are there others like you? Other prisoners? You hope that under the sun, you will find answers. And maybe... friends."
                },
                {
                    id: "rock_36", wave: 36, hero: "EARTH", type: "NARRATIVE",
                    title: "The Final Barrier",
                    text: "You step out onto the surface. But you are not free yet. A massive dome of dark energy surrounds the exit. Makuta's final contingency."
                },
                {
                    id: "rock_37", wave: 37, hero: "EARTH", type: "NARRATIVE",
                    title: "Gathering Strength",
                    text: "The ground beneath you hums. The planet itself is angry at this corruption. It lends you its strength. You are the avatar of the world's wrath."
                },
                {
                    id: "rock_38", wave: 38, hero: "EARTH", type: "NARRATIVE",
                    title: "The Earth's Pulse",
                    text: "Your heart beats in sync with the tremors. Thump. Thump. Thump. The dome cracks. Something is coming through."
                },
                {
                    id: "rock_39", wave: 39, hero: "EARTH", type: "NARRATIVE",
                    title: "Confrontation",
                    text: "The ground explodes. From the shards of the dome, a massive figure forms. Obsidian and hate. The Dark Golem. It roars, challenging your right to exist."
                },
                {
                    id: "rock_40", wave: 40, hero: "EARTH", type: "BOSS_FIGHT",
                    title: "The Gatekeeper",
                    text: "You stand at the exit, the light blindingly bright. But the way is barred. A massive construct of obsidian and dark magic rises. The Dark Golem. The final lock on your cage. Break it!",
                    data: { bossId: 'DARK_GOLEM' } // Unique Boss
                }
            ];

            events.push(...earthStory);
        } else {
            console.error("Rise of the Rock: Could not find STORY_EVENTS to inject into.");
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
