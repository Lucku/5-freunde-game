// The Rise of the Rock - DLC Manifest

const RISE_OF_THE_ROCK = {
    id: 'rise_of_the_rock',
    name: "Rise of the Rock",
    hero: 'earth',
    description: "Introduces the Earth Hero, Rock Biome, and a new Story Campaign.",

    load: async function () {
        console.log("[DLC] Loading: Rise of the Rock...");

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
        this.injectStoryArcLabels();
        this.injectAltar();
        this.injectAchievements();
        this.injectMemories();
        this.injectCards();

        console.log("[DLC] Loaded: Rise of the Rock (Success)");
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

        // Extensibility: Hook into MemoryShard color
        if (typeof MemoryShard !== 'undefined') {
            const originalGetColor = MemoryShard.prototype.getColorByType;
            MemoryShard.prototype.getColorByType = function (type) {
                if (type === 'earth') return '#8d6e63';
                return originalGetColor.call(this, type);
            }
        }

        // Extensibility: Hook into Museum artifact spawning
        if (typeof Museum !== 'undefined') {
            const originalSpawn = Museum.prototype.spawnEntities;
            Museum.prototype.spawnEntities = function () {
                originalSpawn.call(this); // Run base logic

                // Add Earth Artifact
                if (saveData.memories['earth'] && Array.isArray(saveData.memories['earth']) && saveData.memories['earth'].length > 0) {
                    const count = saveData.memories['earth'].length;
                    const room = this.rooms.find(r => r.name === 'gallery');
                    if (room) {
                        this.artifacts.push({
                            x: room.x + 100, // Left side
                            y: room.y + room.h / 2,
                            text: `Earth: ${count}`,
                            color: '#8d6e63',
                            type: 'MEMORY',
                            hero: 'earth'
                        });
                    }
                }
            }
        }
    },

    injectAchievements: function () {
        const achievements = window.ACHIEVEMENTS || (typeof ACHIEVEMENTS !== 'undefined' ? ACHIEVEMENTS : null);
        if (!achievements) { console.error("Rise of the Rock: Could not find ACHIEVEMENTS to inject into."); return; }

        const addDLCAch = (id, title, desc, req, stat, type, val, text) => {
            if (!achievements.some(a => a.id === id)) {
                achievements.push({ id, title, desc, req, stat, bonus: { type, val, text } });
            }
        };

        // Earth Hero — story & progression
        addDLCAch('rock_story',        'Earthshaker',    'Complete Story Mode with the Earth Hero.',                       1,    'story_earth',         'health', 0.05, '+5% HP');
        addDLCAch('rock_prestige_5',   'Living Mountain', 'Reach Prestige 5 with the Earth Hero.',                        5,    'earth_prestige',      'damage', 0.05, '+5% Dmg');

        // Earth Hero — unique mechanics
        addDLCAch('rock_golem_summons','Colossus',       'Summon the Obsidian Golem 20 times across all runs.',           20,   'earth_golem_summons', 'damage', 0.05, '+5% Dmg');
        addDLCAch('rock_wave_25',      'Stone Wall',     'Reach Wave 25 in the Rock Biome.',                              25,   'rock_max_wave',       'health', 0.05, '+5% HP');

        // Earth Hero — enemy encounters
        addDLCAch('rock_golem_kills',  'Golem Breaker',  'Kill 500 Golems.',                                              500,  'kill_GOLEM',          'damage', 0.05, '+5% Dmg');
        addDLCAch('rock_burrower_kills','Exterminator',  'Kill 500 Burrowers.',                                           500,  'kill_BURROWER',       'speed',  0.05, '+5% Speed');
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

    injectStoryArcLabels: function () {
        window.STORY_ARC_LABELS = window.STORY_ARC_LABELS || {};
        window.STORY_ARC_LABELS['earth'] = function (w) {
            if (w <= 10) return '✦  ARC I  ·  THE AWAKENING  ✦';
            if (w <= 20) return '✦  ARC II  ·  THE CLIMB  ✦';
            if (w <= 30) return '✦  ARC III  ·  THE SURFACE  ✦';
            if (w <= 40) return '✦  ARC IV  ·  THE OBSIDIAN MAZE  ✦';
            if (w <= 50) return '✦  ARC V  ·  THE REVELATION  ✦';
            return '✦  FREEDOM  ✦';
        };
    },

    injectStory: function () {
        // Robustly find the events array
        const events = window.STORY_EVENTS || (typeof STORY_EVENTS !== 'undefined' ? STORY_EVENTS : null);

        if (events) {
            // Check if already injected to avoid duplicates
            // Check if already injected to avoid duplicates
            if (events.some(e => e.id === 'rock_start')) return;

            const earthStory = [
                // --- ARC 1: THE AWAKENING ---
                {
                    id: "rock_start", wave: 1, hero: "EARTH", type: "NARRATIVE",
                    title: "The Cage",
                    text: "Darkness. That is all you knew. You woke up trapped in a crystal cage, deep within the earth. But something changed. A surge of power. You shattered the crystal with a single touch. You are free, but you are deep underground. You must climb.",
                    data: { biome: 'HERO' }
                },
                {
                    id: "rock_2", wave: 2, hero: "EARTH", type: "NARRATIVE",
                    title: "First Steps",
                    text: "Your legs feel heavy, like stone pillars. Every step shakes the ground. You are not just walking; you are colliding with the world. You must learn to control this weight.",
                    data: { biome: 'HERO' }
                },
                {
                    id: "rock_3", wave: 3, hero: "EARTH", type: "NARRATIVE",
                    title: "The Hunger",
                    text: "Creatures of the deep sense your awakening. They are blind, driven by hunger. They swarm towards the vibration of your footsteps. You have no weapon but your own body.",
                    data: { biome: 'HERO' }
                },
                {
                    id: "rock_4", wave: 4, hero: "EARTH", type: "NARRATIVE",
                    title: "Hardened Skin",
                    text: "A beast bites your arm, but its teeth shatter. Your skin is not flesh; it is living rock. You realize you are not soft like the creatures that hunt you. You are the mountain.",
                    data: { biome: 'HERO' }
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
                    text: "You pass veins of glowing crystal. They pulse with the same energy you feel in your chest. You touch one, and it dims, its light flowing into you. You are part of this place.",
                    data: { biome: 'HERO' }
                },
                {
                    id: "rock_8", wave: 8, hero: "EARTH", type: "NARRATIVE",
                    title: "Tremors",
                    text: "The ground shakes violently. Not from you, but from below. Something massive is moving in the deep. You must climb higher, faster.",
                    data: { biome: 'HERO' }
                },
                {
                    id: "rock_9", wave: 9, hero: "EARTH", type: "NARRATIVE",
                    title: "The Crumbling",
                    text: "Dust falls from the ceiling. The tunnel is unstable. The fighting is causing the cave to collapse. You need to break through before you are buried.",
                    data: { biome: 'HERO' }
                },
                {
                    id: "rock_10", wave: 10, hero: "EARTH", type: "OBJECTIVE_WAVE",
                    title: "The Collapse",
                    text: "The tunnel ahead is collapsing! You must use your momentum to smash through the falling debris before you are buried alive. Run!",
                    data: { objective: true, biome: 'HERO' }
                },

                // --- ARC 2: THE CLIMB ---
                {
                    id: "rock_11", wave: 11, hero: "EARTH", type: "NARRATIVE",
                    title: "Upward",
                    text: "You burst through the rubble into a larger cavern. The air is slightly fresher here. There is a draft coming from above. A path.",
                    data: { biome: 'HERO' }
                },
                {
                    id: "rock_12", wave: 12, hero: "EARTH", type: "NARRATIVE",
                    title: "Bioluminescence",
                    text: "Giant mushrooms glow with a soft blue light. It's beautiful, but deadly. Spores drift in the air, choking and toxic. Even stone can erode.",
                    data: { biome: 'plant' }
                },
                {
                    id: "rock_13", wave: 13, hero: "EARTH", type: "NARRATIVE",
                    title: "The Swarm",
                    text: "Burrowers erupt from the walls! They don't just attack; they try to drag you back down. They are the jailer's hounds. Kick them off!",
                    data: { biome: 'HERO' }
                },
                {
                    id: "rock_14", wave: 14, hero: "EARTH", type: "NARRATIVE",
                    title: "Momentum",
                    text: "You learn that speed is your ally. When you stand still, you are a target. When you move, you are a cannonball. Don't stop."
                },
                {
                    id: "rock_15", wave: 15, hero: "EARTH", type: "NARRATIVE",
                    title: "Unstoppable",
                    text: "Fear is giving way to amazement. You are not just strong; you are a force of nature. The rocks that once trapped you now crumble before your charge. You are beginning to enjoy this.",
                    data: { biome: 'HERO' }
                },
                {
                    id: "rock_16", wave: 16, hero: "EARTH", type: "NARRATIVE",
                    title: "Ancient Bones",
                    text: "You stumble upon a graveyard of massive bones. Creatures larger than any you've seen. What killed them? And why do the bones look... gnawed?",
                    data: { biome: 'HERO' }
                },
                {
                    id: "rock_17", wave: 17, hero: "EARTH", type: "NARRATIVE",
                    title: "Shadow Presence",
                    text: "The feeling of being watched returns. It's stronger now. A cold chill that penetrates your stone skin. He is here."
                },
                {
                    id: "rock_18", wave: 18, hero: "EARTH", type: "NARRATIVE",
                    title: "The Trap",
                    text: "The floor gives way! It's a pitfall trap. You catch the ledge just in time. This was not nature; this was design. Someone wants you to fall.",
                    data: { biome: 'HERO' }
                },
                {
                    id: "rock_19", wave: 19, hero: "EARTH", type: "NARRATIVE",
                    title: "Dark Whispers",
                    text: "A voice slithers into your mind. 'Go back to sleep, little rock. The surface is not for you.' It tries to make your limbs heavy. Fight it!",
                    data: { biome: 'HERO' }
                },
                {
                    id: "rock_20", wave: 20, hero: "EARTH", type: "BOSS_FIGHT",
                    title: "The Jailer",
                    text: "A shadow blocks your path. It feels familiar... cold. 'You were not meant to wake,' it hisses. It is the one who caged you. Makuta. He will not let his prisoner escape so easily.",
                    data: { bossId: 'MAKUTA', biome: 'HERO' } // Small Makuta fight
                },

                // --- ARC 3: THE SURFACE ---
                {
                    id: "rock_21", wave: 21, hero: "EARTH", type: "NARRATIVE",
                    title: "Aftermath",
                    text: "The shadow disperses, laughing as it fades. 'This is but a fragment,' it mocks. You are tired, cracked, but victorious. You climb over his defeated form.",
                    data: { biome: 'HERO' }
                },
                {
                    id: "rock_22", wave: 22, hero: "EARTH", type: "NARRATIVE",
                    title: "Fresh Air",
                    text: "The stale air of the deep is replaced by something crisp. Ozone. Wind. You've never smelled it before, but your soul recognizes it. Freedom."
                },
                {
                    id: "rock_23", wave: 23, hero: "EARTH", type: "NARRATIVE",
                    title: "Roots",
                    text: "Thick roots penetrate the ceiling here. Life from above reaching down. If trees can break through the rock to reach the deep, you can break through to reach the sky.",
                    data: { biome: 'plant' }
                },
                {
                    id: "rock_24", wave: 24, hero: "EARTH", type: "NARRATIVE",
                    title: "Hope",
                    text: "The weight on your chest lifts. The fear of the dark recedes. You are no longer running away; you are running towards something.",
                    data: { biome: 'HERO' }
                },
                {
                    id: "rock_25", wave: 25, hero: "EARTH", type: "NARRATIVE",
                    title: "A Glimmer",
                    text: "You defeated the shadow, but he vanished into smoke. You press on. Above, you see it—a faint, pale light. Not the glow of crystals, but true sunlight. You are close.",
                    data: { biome: 'HERO' }
                },
                {
                    id: "rock_26", wave: 26, hero: "EARTH", type: "NARRATIVE",
                    title: "Stone Sentinels",
                    text: "Statues line the path. Ancient warriors of stone. As you pass, their eyes glow red. They are the guardians of the gate, and they do not recognize you as friend.",
                    data: { biome: 'HERO' }
                },
                {
                    id: "rock_27", wave: 27, hero: "EARTH", type: "NARRATIVE",
                    title: "The Guardian's Warning",
                    text: "A booming voice fills the chamber. 'TURN BACK. THE SURFACE IS FORBIDDEN.' The sentinels step off their pedestals. They are slow, but they are many.",
                    data: { biome: 'HERO' }
                },
                {
                    id: "rock_28", wave: 28, hero: "EARTH", type: "NARRATIVE",
                    title: "Defiance",
                    text: "'No.' You speak for the first time. Your voice is like grinding tectonic plates. 'I. Will. Rise.' The sentinels charge.",
                    data: { biome: 'HERO' }
                },
                {
                    id: "rock_29", wave: 29, hero: "EARTH", type: "NARRATIVE",
                    title: "Near the Top",
                    text: "The light is blinding now. You can see the exit, a jagged tear in the cavern roof. Just a little further. The sentinels are relentless.",
                    data: { biome: 'HERO' }
                },
                {
                    id: "rock_30", wave: 30, hero: "EARTH", type: "OBJECTIVE_WAVE",
                    title: "The Gauntlet",
                    text: "The path to the surface is guarded by ancient defenses. Stone sentinels awaken to stop you. Prove that you are the master of the earth, not its prisoner.",
                    data: { objective: true, biome: 'HERO' }
                },
                {
                    id: "rock_31", wave: 31, hero: "EARTH", type: "NARRATIVE",
                    title: "Broken Chains",
                    text: "You smash the last sentinel. The magic binding you to this place snaps. You feel light. Lighter than stone should be.",
                    data: { biome: 'HERO' }
                },

                // --- ARC 4: THE OBSIDIAN MAZE ---
                {
                    id: "rock_32", wave: 32, hero: "EARTH", type: "NARRATIVE",
                    title: "The False Summit",
                    text: "You expect the sky, but you find another wall. A layer of black obsidian, slick and impenetrable. The path didn't end; it changed.",
                    data: { biome: 'HERO' }
                },
                {
                    id: "rock_33", wave: 33, hero: "EARTH", type: "NARRATIVE",
                    title: "Reflection",
                    text: "The obsidian is like a mirror. You see yourself, but twisted. A monster of stone and rage. Is this what you are becoming?",
                    data: { biome: 'HERO' }
                },
                {
                    id: "rock_34", wave: 34, hero: "EARTH", type: "NARRATIVE",
                    title: "The Void",
                    text: "Between the layers of rock, there is a void. No sound. No vibration. It is deafening to someone who sees with their feet.",
                    data: { biome: 'black' }
                },
                {
                    id: "rock_35", wave: 35, hero: "EARTH", type: "NARRATIVE",
                    title: "Whispers of the Lost",
                    text: "You find statues here. Not carved, but petrified. Previous prisoners who gave up hope. Their despair lingers like a fog.",
                    data: { biome: 'HERO' }
                },
                {
                    id: "rock_36", wave: 36, hero: "EARTH", type: "NARRATIVE",
                    title: "Inner Fire",
                    text: "The cold of the void tries to freeze your core. You must stoke the magma within. Anger is a fuel. Use it.",
                    data: { biome: 'fire' }
                },
                {
                    id: "rock_37", wave: 37, hero: "EARTH", type: "NARRATIVE",
                    title: "Gravity",
                    text: "The laws of nature feel wrong here. The rock pulls at you, trying to merge you back into the wall. You have to fight to stay an individual."
                },
                {
                    id: "rock_38", wave: 38, hero: "EARTH", type: "NARRATIVE",
                    title: "Diamond Dust",
                    text: "The air is filled with razor-sharp dust. It scratches your surface. You polish yourself against the pain. You are becoming harder. Diamond hard.",
                    data: { biome: 'HERO' }
                },
                {
                    id: "rock_39", wave: 39, hero: "EARTH", type: "NARRATIVE",
                    title: "Resonance",
                    text: "You stop fighting the vibration and start creating it. You hum a low frequency. The obsidian begins to crack. It cannot withstand your song.",
                    data: { biome: 'HERO' }
                },
                {
                    id: "rock_40", wave: 40, hero: "EARTH", type: "OBJECTIVE_WAVE",
                    title: "Shatterpoint",
                    text: "You found the flaw in the obsidian wall. It requires one massive, sustained impact to shatter. Defend your position while you charge the blow!",
                    data: { objective: true, biome: 'HERO' }
                },
                {
                    id: "rock_41", wave: 41, hero: "EARTH", type: "NARRATIVE",
                    title: "Breakthrough",
                    text: "With a roar that shakes the mountain, the black wall explodes outward. Light floods in. Real light.",
                    data: { biome: 'HERO' }
                },

                // --- ARC 5: THE REVELATION ---
                {
                    id: "rock_42", wave: 42, hero: "EARTH", type: "NARRATIVE",
                    title: "The Sky",
                    text: "You reach the tear. Blue. Infinite blue. It's terrifying and beautiful. Clouds drift by, soft and white. You reach a hand out."
                },
                {
                    id: "rock_43", wave: 43, hero: "EARTH", type: "NARRATIVE",
                    title: "Memories",
                    text: "As the sunlight hits your skin, flashes of memory return. You weren't always a rock. You were... someone. Someone who laughed. Someone who had friends.",
                    data: { biome: 'HERO' }
                },
                {
                    id: "rock_44", wave: 44, hero: "EARTH", type: "NARRATIVE",
                    title: "Identity",
                    text: "You are Earth. But you are also... a protector. You remember a promise. 'We will stand together.' Who were you promising?",
                    data: { biome: 'HERO' }
                },
                {
                    id: "rock_45", wave: 45, hero: "EARTH", type: "NARRATIVE",
                    title: "The Question",
                    text: "As you near the surface, a thought troubles you. If there was a Jailer, are there others like you? Other prisoners? You hope that under the sun, you will find answers. And maybe... friends.",
                    data: { biome: 'HERO' }
                },
                {
                    id: "rock_46", wave: 46, hero: "EARTH", type: "NARRATIVE",
                    title: "The Final Barrier",
                    text: "You step out onto the surface. But you are not free yet. A massive dome of dark energy surrounds the exit. Makuta's final contingency."
                },
                {
                    id: "rock_47", wave: 47, hero: "EARTH", type: "NARRATIVE",
                    title: "Gathering Strength",
                    text: "The ground beneath you hums. The planet itself is angry at this corruption. It lends you its strength. You are the avatar of the world's wrath.",
                    data: { biome: 'HERO' }
                },
                {
                    id: "rock_48", wave: 48, hero: "EARTH", type: "NARRATIVE",
                    title: "The Earth's Pulse",
                    text: "Your heart beats in sync with the tremors. Thump. Thump. Thump. The dome cracks. Something is coming through.",
                    data: { biome: 'HERO' }
                },
                {
                    id: "rock_49", wave: 49, hero: "EARTH", type: "NARRATIVE",
                    title: "Confrontation",
                    text: "The ground explodes. From the shards of the dome, a massive figure forms. Obsidian and hate. The Dark Golem. It roars, challenging your right to exist.",
                    data: { biome: 'HERO' }
                },
                {
                    id: "rock_50", wave: 50, hero: "EARTH", type: "BOSS_FIGHT",
                    title: "The Gatekeeper",
                    text: "You stand at the exit, the light blindingly bright. But the way is barred. A massive construct of obsidian and dark magic rises. The Dark Golem. The final lock on your cage. Break it!",
                    data: { bossId: 'DARK_GOLEM', biome: 'HERO' } // Unique Boss
                },
                {
                    id: "rock_51", wave: 51, hero: "EARTH", type: "THE_END",
                    title: "Freedom",
                    text: "The Golem crumbles. The barrier shatters. You step out into the sunlight for the first time in eons. The earth rejoices beneath your feet. You are free."
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
                { id: 'e3', req: 5, type: 'unique', desc: 'Aftershock: Seismic Slam triggers a second time' }
            ];

            // CONVERGENCES
            const earthMutations = [
                { id: 'c11', req: { fire: 5, earth: 5 }, type: 'mutation', desc: 'Magma Roll: Rolling leaves a fire trail' },
                { id: 'c12', req: { water: 5, earth: 5 }, type: 'mutation', desc: 'Mudslide: Seismic Slam slows enemies' },
                { id: 'c13', req: { ice: 5, earth: 5 }, type: 'mutation', desc: 'Ice Breaker: Ramming frozen enemies deals 3x damage' },
                { id: 'c14', req: { plant: 5, earth: 5 }, type: 'mutation', desc: 'Nature\'s Embrace: Ramming heals for 1% HP' },
                { id: 'c15', req: { metal: 5, earth: 5 }, type: 'mutation', desc: 'Steel Ball: +50% Armor while rolling' },
                { id: 'c21', req: { earth: 5, lightning: 5 }, type: 'mutation', desc: 'Grounding: Seismic Slam releases electric shockwaves' },
                { id: 'c27', req: { earth: 5, air: 5 }, type: 'mutation', desc: 'Sandstorm: Blinds enemies, reducing their accuracy' }
            ];

            if (ALTAR_TREE.convergence) {
                earthMutations.forEach(m => {
                    if (!ALTAR_TREE.convergence.find(ex => ex.id === m.id)) {
                        ALTAR_TREE.convergence.push(m);
                    }
                });
            }
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
                ...createCardSet('GOLEM', 'Golem', '#795548', 'Golems do not split on death', { type: 'special', id: 'GOLEM_NO_SPLIT' }),
                ...createCardSet('BURROWER', 'Burrower', '#5d4037', 'Can hit Burrowers underground', { type: 'special', id: 'BURROWER_PIERCE' })
            };

            Object.assign(COLLECTOR_CARDS, newCards);
            console.log("[DLC] Cards injected into COLLECTOR_CARDS");
        }
    }
};

// Register globally
if (!window.DLC_REGISTRY) window.DLC_REGISTRY = {};
window.DLC_REGISTRY['rise_of_the_rock'] = RISE_OF_THE_ROCK;

// ---------------------------------------------------------------------------
// Dark Golem Boss  —  Rise of the Rock DLC, Wave 50 final boss.
// Massive obsidian construct of dark magic. Three phases: sealed stone >
// cracked lava > berserk. Attacks: boulder volley, ground slam ring,
// obsidian spike burst, lava eruption (P2+), golem charge (P3).
// ---------------------------------------------------------------------------
(function () {
    window._DLC_BOSS_REGISTRY = window._DLC_BOSS_REGISTRY || {};
    window._DLC_BOSS_REGISTRY['DARK_GOLEM'] = {

        init(boss) {
            boss.name            = 'Dark Golem';
            boss.color           = '#263238';
            boss.radius          = 88;
            boss.maxHp          *= 2.5;
            boss.hp              = boss.maxHp;
            boss.damage         *= 1.5;
            boss.speed          *= 0.45;
            boss.knockbackResist = 0.95;
            boss.phase           = 1;

            boss._slamTimer    = 90;
            boss._boulderTimer = 200;
            boss._spikeTimer   = 300;
            boss._lavaTimer    = 240;
            boss._chargeTimer  = 300;
            boss._charging     = false;
            boss._chargeVelX   = 0;
            boss._chargeVelY   = 0;
            boss._chargeDur    = 0;
        },

        update(boss, player, arena) {
            const tgt  = (typeof getCoopTarget === 'function') ? getCoopTarget(boss.x, boss.y) : player;
            const dist = Math.hypot(tgt.x - boss.x, tgt.y - boss.y);

            // Phase transitions
            if (boss.phase === 1 && boss.hp <= boss.maxHp * 0.6) {
                boss.phase = 2;
                if (typeof audioManager !== 'undefined') audioManager.play('dark_golem_crack');
                createExplosion(boss.x, boss.y, '#ff6600');
                createExplosion(boss.x, boss.y, '#263238');
                if (typeof floatingTexts !== 'undefined')
                    floatingTexts.push(new FloatingText(boss.x, boss.y - 100, 'THE OBSIDIAN CRACKS!', '#ff6600', 90));
                if (typeof showNotification === 'function') showNotification('THE OBSIDIAN CRACKS!');
            }
            if (boss.phase === 2 && boss.hp <= boss.maxHp * 0.3) {
                boss.phase = 3;
                boss.speed *= 2.5;
                boss._boulderTimer = 60;
                if (typeof audioManager !== 'undefined') audioManager.play('dark_golem_berserk');
                createExplosion(boss.x, boss.y, '#ff3300');
                createExplosion(boss.x, boss.y, '#ff9900');
                if (typeof showNotification === 'function') showNotification('GOLEM BERSERKS!');
                // Spawn 2 obsidian mini-golems
                if (typeof enemies !== 'undefined') {
                    for (let i = 0; i < 2; i++) {
                        const a    = (Math.PI / 2) + i * Math.PI;
                        const mini = new Enemy(false, 'BASIC');
                        mini.x = boss.x + Math.cos(a) * 130; mini.y = boss.y + Math.sin(a) * 130;
                        mini.radius = 30; mini.hp = boss.maxHp * 0.08; mini.maxHp = mini.hp;
                        mini.speed  = 2.5; mini.color = '#546e7a'; mini.damage = boss.damage * 0.3;
                        enemies.push(mini);
                    }
                }
            }

            // Charge (phase 3)
            if (boss._charging) {
                boss.x += boss._chargeVelX;
                boss.y += boss._chargeVelY;
                boss._chargeDur--;
                if (boss._chargeDur <= 0) boss._charging = false;
                if (Math.hypot(tgt.x - boss.x, tgt.y - boss.y) < boss.radius + 30) {
                    if (tgt.invulnTimer <= 0 && typeof tgt.takeDamage === 'function') tgt.takeDamage(boss.damage * 1.5);
                    const pa = Math.atan2(tgt.y - boss.y, tgt.x - boss.x);
                    tgt.vx = (tgt.vx || 0) + Math.cos(pa) * 40;
                    tgt.vy = (tgt.vy || 0) + Math.sin(pa) * 40;
                }
                boss.x = Math.max(boss.radius, Math.min(arena.width  - boss.radius, boss.x));
                boss.y = Math.max(boss.radius, Math.min(arena.height - boss.radius, boss.y));
                return;
            }

            // Slow march toward target
            const ang = Math.atan2(tgt.y - boss.y, tgt.x - boss.x);
            const mx  = boss.x + Math.cos(ang) * boss.speed;
            const my  = boss.y + Math.sin(ang) * boss.speed;
            if (!arena.checkCollision(mx, my, boss.radius))          { boss.x = mx; boss.y = my; }
            else if (!arena.checkCollision(mx, boss.y, boss.radius)) { boss.x = mx; }
            else if (!arena.checkCollision(boss.x, my, boss.radius)) { boss.y = my; }

            // Ground slam (close range, orb ring)
            if (--boss._slamTimer <= 0) {
                boss._slamTimer = boss.phase === 3 ? 75 : 120;
                if (dist < 290) this._groundSlam(boss, tgt);
            }

            // Boulder volley
            if (--boss._boulderTimer <= 0) {
                boss._boulderTimer = boss.phase === 3 ? 110 : boss.phase === 2 ? 160 : 200;
                this._boulderVolley(boss, tgt);
            }

            // Obsidian spike ring
            if (--boss._spikeTimer <= 0) {
                boss._spikeTimer = boss.phase === 3 ? 180 : 300;
                this._obsidianSpikes(boss);
            }

            // Lava eruption (phase 2+)
            if (boss.phase >= 2 && --boss._lavaTimer <= 0) {
                boss._lavaTimer = boss.phase === 3 ? 150 : 240;
                this._lavaErupt(boss, tgt);
            }

            // Charge attack (phase 3, every 5s)
            if (boss.phase === 3 && --boss._chargeTimer <= 0) {
                boss._chargeTimer  = 300;
                boss._charging     = true;
                boss._chargeDur    = 32;
                const ca = Math.atan2(tgt.y - boss.y, tgt.x - boss.x);
                boss._chargeVelX   = Math.cos(ca) * boss.speed * 6;
                boss._chargeVelY   = Math.sin(ca) * boss.speed * 6;
                if (typeof audioManager !== 'undefined') audioManager.play('dark_golem_charge');
                createExplosion(boss.x, boss.y, '#546e7a');
                if (typeof showNotification === 'function') showNotification('GOLEM CHARGES!');
            }

            boss.x = Math.max(boss.radius, Math.min(arena.width  - boss.radius, boss.x));
            boss.y = Math.max(boss.radius, Math.min(arena.height - boss.radius, boss.y));
        },

        _groundSlam(boss, tgt) {
            const count = boss.phase === 3 ? 18 : 10;
            const col   = boss.phase >= 2 ? '#ff6600' : '#546e7a';
            for (let i = 0; i < count; i++) {
                const a = (Math.PI * 2 / count) * i;
                projectiles.push(new Projectile(boss.x, boss.y,
                    { x: Math.cos(a) * (boss.phase === 3 ? 7 : 5), y: Math.sin(a) * (boss.phase === 3 ? 7 : 5) },
                    boss.damage * 0.55, col, 12, 'enemy', 0, true));
            }
            const pa = Math.atan2(tgt.y - boss.y, tgt.x - boss.x);
            tgt.vx = (tgt.vx || 0) + Math.cos(pa) * 35;
            tgt.vy = (tgt.vy || 0) + Math.sin(pa) * 35;
            createExplosion(boss.x, boss.y, col);
            if (typeof audioManager !== 'undefined') audioManager.play('dark_golem_slam');
        },

        _boulderVolley(boss, tgt) {
            const count = boss.phase === 3 ? 5 : 3;
            const bx = boss.x, by = boss.y;
            for (let i = 0; i < count; i++) {
                const spread = (i - Math.floor(count / 2)) * 0.28;
                const a      = Math.atan2(tgt.y - boss.y, tgt.x - boss.x) + spread;
                setTimeout(() => {
                    if (typeof projectiles === 'undefined') return;
                    projectiles.push(new Projectile(bx, by,
                        { x: Math.cos(a) * 5, y: Math.sin(a) * 5 },
                        boss.damage * 0.85, '#546e7a', 20, 'enemy', 0, true));
                }, i * 150);
            }
            if (typeof audioManager !== 'undefined') audioManager.play('dark_golem_boulder');
        },

        _obsidianSpikes(boss) {
            const count = boss.phase === 3 ? 20 : 12;
            for (let i = 0; i < count; i++) {
                const a = (Math.PI * 2 / count) * i;
                projectiles.push(new Projectile(boss.x, boss.y,
                    { x: Math.cos(a) * 8.5, y: Math.sin(a) * 8.5 },
                    boss.damage * 0.65, '#37474f', 9, 'enemy', 0, true));
            }
        },

        _lavaErupt(boss, tgt) {
            if (typeof audioManager !== 'undefined') audioManager.play('dark_golem_lava');
            const count = boss.phase === 3 ? 9 : 6;
            const bx = boss.x, by = boss.y;
            for (let i = 0; i < count; i++) {
                const ra = Math.random() * Math.PI * 2;
                const rd = 80 + Math.random() * 220;
                const lx = tgt.x + Math.cos(ra) * rd;
                const ly = tgt.y + Math.sin(ra) * rd;
                setTimeout(() => {
                    if (typeof projectiles === 'undefined') return;
                    const a = Math.atan2(ly - by, lx - bx);
                    projectiles.push(new Projectile(bx, by,
                        { x: Math.cos(a) * 3.5, y: Math.sin(a) * 3.5 },
                        boss.damage * 0.6, '#ff6600', 15, 'enemy', 0, true));
                }, i * 100);
            }
            createExplosion(boss.x, boss.y, '#ff6600');
        },

        draw(ctx, boss) {
            const t     = Date.now() / 1000;
            const pulse = 0.5 + 0.5 * Math.sin(frame * 0.06);
            const r     = boss.radius;

            ctx.save();
            ctx.translate(boss.x, boss.y);

            // Lava glow aura (phase 2+)
            if (boss.phase >= 2) {
                const aura = boss.phase === 3 ? 0.32 + 0.14 * pulse : 0.15 + 0.07 * pulse;
                ctx.beginPath(); ctx.arc(0, 0, r * 1.28, 0, Math.PI * 2);
                ctx.fillStyle = `rgba(255, ${boss.phase === 3 ? 40 : 90}, 0, ${aura})`;
                ctx.fill();
            }

            // Main obsidian body
            const glowCol = boss.phase === 3 ? '#6b0a00' : boss.phase === 2 ? '#3a1200' : '#1a2027';
            const rg = ctx.createRadialGradient(-r * 0.3, -r * 0.3, r * 0.05, 0, 0, r);
            rg.addColorStop(0,    '#546e7a');
            rg.addColorStop(0.35, '#37474f');
            rg.addColorStop(0.72, '#263238');
            rg.addColorStop(1,    glowCol);
            ctx.shadowColor = boss.phase === 3 ? '#ff3300' : boss.phase === 2 ? '#ff6600' : '#263238';
            ctx.shadowBlur  = boss.phase >= 2 ? 18 + 10 * pulse : 5;
            ctx.beginPath(); ctx.arc(0, 0, r, 0, Math.PI * 2);
            ctx.fillStyle = rg; ctx.fill();
            ctx.shadowBlur = 0;

            // Hexagonal armor outline (slowly rotating)
            ctx.save();
            ctx.rotate(Math.PI / 6 + t * 0.04);
            ctx.strokeStyle = 'rgba(84, 110, 122, 0.55)';
            ctx.lineWidth = 4;
            ctx.beginPath();
            for (let i = 0; i < 6; i++) {
                const ha = (Math.PI / 3) * i;
                i === 0
                    ? ctx.moveTo(Math.cos(ha) * r * 0.93, Math.sin(ha) * r * 0.93)
                    : ctx.lineTo(Math.cos(ha) * r * 0.93, Math.sin(ha) * r * 0.93);
            }
            ctx.closePath(); ctx.stroke();
            ctx.restore();

            // Lava crack lines (phase 2+)
            if (boss.phase >= 2) {
                ctx.strokeStyle = `rgba(255, ${boss.phase === 3 ? 60 : 130}, 0, ${boss.phase === 3 ? 0.92 : 0.65})`;
                ctx.lineWidth   = boss.phase === 3 ? 3 : 2;
                ctx.shadowColor = '#ff6600'; ctx.shadowBlur = 8;
                [
                    [[-0.15, -0.62], [ 0.08,  0.06], [ 0.28,  0.52]],
                    [[ 0.35, -0.44], [ 0.52,  0.18]],
                    [[-0.45,  0.08], [-0.18,  0.58]],
                ].forEach(pts => {
                    ctx.beginPath(); ctx.moveTo(pts[0][0] * r, pts[0][1] * r);
                    for (let i = 1; i < pts.length; i++) ctx.lineTo(pts[i][0] * r, pts[i][1] * r);
                    ctx.stroke();
                });
                ctx.shadowBlur = 0;
            }

            // Glowing eyes
            const eyeC = boss.phase === 3 ? '#ff2200' : boss.phase === 2 ? '#ff8800' : '#aed6f1';
            ctx.shadowColor = eyeC; ctx.shadowBlur = 14;
            ctx.fillStyle   = eyeC;
            const ex = r * 0.3, ey = r * 0.15;
            ctx.save(); ctx.translate(-ex, -ey); ctx.rotate(0.3);
            ctx.beginPath(); ctx.ellipse(0, 0, r * 0.12, r * 0.055, 0, 0, Math.PI * 2); ctx.fill();
            ctx.restore();
            ctx.save(); ctx.translate(ex, -ey); ctx.rotate(-0.3);
            ctx.beginPath(); ctx.ellipse(0, 0, r * 0.12, r * 0.055, 0, 0, Math.PI * 2); ctx.fill();
            ctx.restore();
            ctx.shadowBlur = 0;

            // Phase 3: rage sparks at perimeter
            if (boss.phase === 3 && frame % 3 === 0) {
                ctx.strokeStyle = '#ff6600'; ctx.lineWidth = 2;
                ctx.shadowColor = '#ff6600'; ctx.shadowBlur = 6;
                for (let i = 0; i < 4; i++) {
                    const sa  = Math.random() * Math.PI * 2;
                    const len = 10 + Math.random() * 18;
                    ctx.beginPath();
                    ctx.moveTo(Math.cos(sa) * r, Math.sin(sa) * r);
                    ctx.lineTo(Math.cos(sa) * (r + len), Math.sin(sa) * (r + len));
                    ctx.stroke();
                }
                ctx.shadowBlur = 0;
            }

            ctx.restore();
        },
    };

    console.log("Rise of the Rock DLC: Dark Golem registered in _DLC_BOSS_REGISTRY.");
})();
