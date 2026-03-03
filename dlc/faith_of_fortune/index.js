// Faith of Fortune - DLC Manifest

const FAITH_OF_FORTUNE = {
    id: 'faith_of_fortune',
    name: "Faith of Fortune",
    heroes: ['spirit', 'chance'],
    description: "Introduces 'Spirit' (Gold) and 'Chance' (Magenta). Balance versus Chaos. The Temple vs The Casino.",
    icon: "🎰",

    load: async function () {
        console.log("[DLC] Loading: Faith of Fortune...");

        if (window.dlcManager) {
            await window.dlcManager.loadScript('dlc/faith_of_fortune/SpiritHero.js');
            await window.dlcManager.loadScript('dlc/faith_of_fortune/ChanceHero.js');
            await window.dlcManager.loadScript('dlc/faith_of_fortune/TempleBiome.js');
            await window.dlcManager.loadScript('dlc/faith_of_fortune/MadnessBiome.js');
            await window.dlcManager.loadScript('dlc/faith_of_fortune/MadnessEnemies.js');
            await window.dlcManager.loadScript('dlc/faith_of_fortune/TempleEnemies.js');
            await window.dlcManager.loadScript('dlc/faith_of_fortune/Story.js');
        }

        this.injectHero();
        this.injectBiome();
        this.injectEnemies();
        this.injectStory();
        this.injectStoryHooks();
        this.injectAltar();
        this.injectAchievements();
        this.injectMemories();
        this.injectCards();

        console.log("[DLC] Loaded: Faith of Fortune (Success)");
    },

    injectStoryHooks: function () {
        // Hook Story Choices
        const originalHandleStoryChoice = window.handleStoryChoice;
        window.handleStoryChoice = function (choice) {
            // Try DLC handler
            if (FAITH_OF_FORTUNE.handleDLCStoryChoice(choice)) return;
            // Otherwise call original
            if (originalHandleStoryChoice) originalHandleStoryChoice(choice);
        };

        // Register Custom Spawn Handlers
        if (!window.customSpawnHandlers) window.customSpawnHandlers = {};
        window.customSpawnHandlers['BLACK_HERO_1V1'] = this.startStoryDuel;
        window.customSpawnHandlers['RIVAL_1V1'] = this.startStoryDuel;
    },

    handleDLCStoryChoice: function (choice) {
        if (!choice.effect && !choice.outcome) return false;

        // Biome Modifiers
        if (choice.effect === 'biomemod_madness') {
            currentBiomeType = 'chance';
            arena.generate(currentBiomeType);
            showNotification("BIOME SHIFT: MADNESS", "#ff00ff");
            return true;
        } else if (choice.effect === 'biomemod_temple') {
            currentBiomeType = 'spirit';
            arena.generate(currentBiomeType);
            showNotification("BIOME SHIFT: TEMPLE", "#f1c40f");
            return true;
        }
        // Stat Buffs
        else if (choice.effect === 'heal_full') {
            player.hp = player.maxHp;
            createExplosion(player.x, player.y, '#2ecc71');
            showNotification("FULL HEAL");
            return true;
        } else if (choice.effect === 'buff_damage') {
            player.damageMultiplier += 0.5;
            showNotification("DAMAGE BOOST!", "#e74c3c");
            return true;
        }
        // Hero Swaps (Climax)
        else if (choice.outcome === 'set_hero_spirit') {
            changeHeroInGame('spirit');
            showNotification("YOU ARE SPIRIT", "#f1c40f");
            return true;
        } else if (choice.outcome === 'set_hero_chance') {
            changeHeroInGame('chance');
            showNotification("YOU ARE CHANCE", "#ff00ff");
            return true;
        }
        // Endings
        else if (choice.outcome === 'fight_chance') {
            showNotification("DEFEAT CHANCE!", "#ff00ff");
            return true;
        } else if (choice.outcome === 'fight_spirit') {
            showNotification("DEFEAT SPIRIT!", "#f1c40f");
            return true;
        }
        return false;
    },

    startStoryDuel: function (enemyType) {
        // Clear existing enemies
        enemies = [];
        bossActive = true; // Block wave progression

        // Determine Rival Type
        let rivalType = 'black'; // Default
        if (enemyType === 'BLACK_HERO_1V1') rivalType = 'black';
        else if (enemyType === 'RIVAL_1V1') {
            // If player is Spirit, fight Chance. If player is Chance, fight Spirit.
            rivalType = (player.type === 'spirit') ? 'chance' : 'spirit';
        }

        console.log(`Starting Story Duel: ${player.type} VS ${rivalType}`);

        if (typeof AIController === 'undefined') {
            console.error("AIController not found! Cannot start duel.");
            bossActive = false;
            return;
        }

        const p2 = new Player(rivalType, true); // true = isCPU
        p2.controller = new AIController(player);
        p2.x = arena.width / 2 + 600;
        p2.y = arena.height / 2;
        p2.hp *= 2; // Buff Boss HP
        p2.maxHp *= 2;

        if (!window.additionalPlayers) window.additionalPlayers = [];
        window.additionalPlayers.push(p2);

        showNotification("DUEL STARTED!", "#ff0000");
    },

    injectHero: function () {
        if (typeof BASE_HERO_STATS !== 'undefined') {
            BASE_HERO_STATS['spirit'] = {
                color: '#F0D080', // Soft Amber / Ivory-Gold
                hp: 120,
                speed: 3.5,
                rangeDmg: 5,
                meleeDmg: 20,
                rangeCd: 20, // Fast low dmg
                meleeCd: 120,
                projectileSpeed: 8,
                projectileSize: 6,
                description: "A monk of balance. Heals over time, low damage."
            };
            BASE_HERO_STATS['chance'] = {
                color: '#ff00ff', // Magenta
                hp: 77, // Lucky number
                speed: 4.5,
                rangeDmg: 7,
                meleeDmg: 77,
                rangeCd: 30, // Slower fire rate
                meleeCd: 100,
                projectileSpeed: 10,
                projectileSize: 8,
                description: "A gambler. High risk, random outcomes."
            };
        }
    },

    injectBiome: function () {
        console.log("Faith of Fortune Biomes initialized.");
    },

    injectEnemies: function () {
        console.log("Faith of Fortune Enemies initialized.");

        // Dynamic Spawn Logic for specific biomes
        if (typeof window.getBiomeEnemyType !== 'function') {
            window.getBiomeEnemyType = function (wave, enemyInstance) {
                // Check Biome
                if (typeof currentBiomeType === 'undefined') return null;

                const rand = Math.random();

                // MADNESS BIOME
                if (currentBiomeType === 'madness') {
                    // 40% Glitch, 20% Turret, 40% Basic/Other
                    if (rand < 0.4) return 'glitch';
                    if (rand < 0.6) return 'rng_turret';
                    return null; // Fallback to normal pool
                }

                // TEMPLE BIOME
                if (currentBiomeType === 'temple') {
                    // 30% Monk, 20% Guardian
                    if (rand < 0.3) return 'spirit_monk';
                    if (rand < 0.5) return 'temple_guardian';
                    return null;
                }

                return null;
            };
        } else {
            // Chaining if exists (for multiple DLCs)
            const oldSpawn = window.getBiomeEnemyType;
            window.getBiomeEnemyType = function (wave, enemyInstance) {
                // Try this DLC first
                if (typeof currentBiomeType !== 'undefined') {
                    const rand = Math.random();
                    if (currentBiomeType === 'madness') {
                        if (rand < 0.4) return 'glitch';
                        if (rand < 0.6) return 'rng_turret';
                    }
                    if (currentBiomeType === 'temple') {
                        if (rand < 0.3) return 'spirit_monk';
                        if (rand < 0.5) return 'temple_guardian';
                    }
                }
                // Fallback to previous
                return oldSpawn(wave, enemyInstance);
            };
        }
    },

    injectStory: function () {
        if (typeof STORY_EVENTS !== 'undefined' && window.FORTUNE_STORY_CHAPTERS) {
            window.STORY_EVENTS = window.STORY_EVENTS.concat(window.FORTUNE_STORY_CHAPTERS);
            console.log(`Faith of Fortune: Injected ${window.FORTUNE_STORY_CHAPTERS.length} story chapters.`);
        }
    },

    injectAltar: function () {
        if (typeof ALTAR_TREE !== 'undefined') {
            // Spirit Altar
            ALTAR_TREE['spirit'] = [
                { id: 's1', req: 1, type: 'stat', stat: 'regen', val: 1.0, desc: 'Inner Peace: HP Regen +1/s' },
                { id: 's2', req: 3, type: 'stat', stat: 'radius', val: 1.2, desc: 'Aura of Light: Buff Radius +20%' },
                { id: 's3', req: 5, type: 'unique', desc: 'Nirvana: Prevents death once per run' }
            ];

            // Chance Altar
            ALTAR_TREE['chance'] = [
                { id: 'ch1', req: 1, type: 'stat', stat: 'luck', val: 10, desc: 'Lucky Charm: Luck +10' },
                { id: 'ch2', req: 3, type: 'stat', stat: 'crit', val: 0.1, desc: 'Loaded Dice: Crit Chance +10%' },
                { id: 'ch3', req: 5, type: 'unique', desc: 'Jackpot: 1% Chance to deal 777x Damage' }
            ];

            // Convergences (Spirit & Chance)
            const newConvergences = [
                // Spirit (Harmony & Balance)
                { id: 'cv_s_f', req: { spirit: 5, fire: 5 }, type: 'mutation', desc: 'Sacred Flame: Mantras apply a burning effect.' },
                { id: 'cv_s_w', req: { spirit: 5, water: 5 }, type: 'mutation', desc: 'Holy Water: Healing also pushes enemies away.' },
                { id: 'cv_s_i', req: { spirit: 5, ice: 5 }, type: 'mutation', desc: 'Tranquility: Standing still slows nearby enemies.' },
                { id: 'cv_s_p', req: { spirit: 5, plant: 5 }, type: 'mutation', desc: 'Lotus Bloom: Overhealing creates defensive vines.' },
                { id: 'cv_s_m', req: { spirit: 5, metal: 5 }, type: 'mutation', desc: 'Golden Bell: You reflect 10% of damage taken.' },
                { id: 'cv_s_a', req: { spirit: 5, air: 5 }, type: 'mutation', desc: 'Ascension: +20% Evasion while moving.' },
                { id: 'cv_s_e', req: { spirit: 5, earth: 5 }, type: 'mutation', desc: 'Monolith: Cannot be pushed while attacking.' },
                { id: 'cv_s_l', req: { spirit: 5, lightning: 5 }, type: 'mutation', desc: 'Enlightenment: Mantras arc lightning to 1 nearby enemy.' },

                // Chance (Chaos & Luck)
                { id: 'cv_ch_f', req: { chance: 5, fire: 5 }, type: 'mutation', desc: 'Hot Streak: Critical hits leave a fire trail.' },
                { id: 'cv_ch_w', req: { chance: 5, water: 5 }, type: 'mutation', desc: 'Liquid Assets: Gold pickups have a 10% chance to heal 1 HP.' },
                { id: 'cv_ch_i', req: { chance: 5, ice: 5 }, type: 'mutation', desc: 'Cold Hard Cash: Frozen enemies drop 2x Gold.' },
                { id: 'cv_ch_p', req: { chance: 5, plant: 5 }, type: 'mutation', desc: 'Money Tree: Gain 1% interest on current Gold every wave.' },
                { id: 'cv_ch_m', req: { chance: 5, metal: 5 }, type: 'mutation', desc: 'Golden Magnet: Gold pickup range +100%.' },
                { id: 'cv_ch_a', req: { chance: 5, air: 5 }, type: 'mutation', desc: 'Windfall: +50% Speed for 2s after picking up Gold.' },
                { id: 'cv_ch_e', req: { chance: 5, earth: 5 }, type: 'mutation', desc: 'Fool\'s Gold: Collecting Gold has a chance to stun nearby enemies.' },
                { id: 'cv_ch_l', req: { chance: 5, lightning: 5 }, type: 'mutation', desc: 'Jackpot Strike: Gold pickups trigger a lightning bolt.' },

                // Cross-DLC
                { id: 'cv_s_ch', req: { spirit: 5, chance: 5 }, type: 'mutation', desc: 'Karma: Luck increases Regen; Regen increases Luck.' }
            ];

            if (ALTAR_TREE.convergence) {
                newConvergences.forEach(m => {
                    if (!ALTAR_TREE.convergence.find(ex => ex.id === m.id)) {
                        ALTAR_TREE.convergence.push(m);
                    }
                });
            }
        }
    },

    injectAchievements: function () {
        if (typeof addAch === 'function') {
            // Spirit Hero — gameplay-based achievements
            addAch('faith_spirit_story', 'Serenity Achieved', 'Complete Story Mode with the Spirit Hero.', 1, 'story_spirit', 'health', 0.05, '+5% HP');
            addAch('faith_spirit_prestige', 'Enlightened Mind', 'Reach Prestige 5 with the Spirit Hero.', 5, 'spirit_prestige', 'cooldown', 0.05, '-5% CD');
            addAch('faith_spirit_transcend', 'Perfect Harmony', 'Activate TRANSCEND 50 times across all runs.', 50, 'spirit_transcend_count', 'damage', 0.05, '+5% Dmg');

            // Chance Hero — gameplay-based achievements
            addAch('faith_chance_story', 'Lady Luck', 'Complete Story Mode with the Chance Hero.', 1, 'story_chance', 'gold', 0.05, '+5% Gold');
            addAch('faith_chance_jackpot', 'Jackpot!', 'Win the SLOTS jackpot 10 times across all runs.', 10, 'chance_jackpots', 'gold', 0.10, '+10% Gold');
            addAch('faith_luck_max', "Fortune's Favorite", 'Accumulate 1000 Luck points across all runs.', 1000, 'chance_total_luck', 'gold', 0.05, '+5% Gold');
        }
    },

    injectMemories: function () {
        if (typeof MEMORY_STORIES !== 'undefined') {
            MEMORY_STORIES['spirit'] = [
                "I took the oath in the first light of dawn. The Golden Temple welcomed me not as I was, but as I could be. My old name, my old life—they dissolved into the prayer chimes.",
                "The Temple is vast. I have spent years polishing the same stone floor, seeking perfection in repetition. Each sweep of the broom is a mantra. Each breath is a connection to the divine.",
                "I always felt a pull. A heaviness in my chest that no meditation could lift. It was not doubt, but anticipation. Something ancient was waking up, and I was being prepared to meet it.",
                "One morning, the bells did not ring. The courtyards were empty. The Elder Monk's cushion was cold. I searched every chamber, every tower. They were gone. Simply... erased.",
                "I found the Great Archives unlocked. For the first time, I read the forbidden scrolls. They spoke of the Elements, the Chaos, and the cyclical destruction. Was I left behind to witness it?",
                "Loneliness became my teacher. I learned to speak to the silence, and the silence began to answer. It taught me that peace is not the absence of conflict, but the center of the storm.",
                "I practice forms of combat I never knew I had mastered. My body moves before my mind commands it. The spirit of the Temple lives in me now. I am not guarding it; I am the Temple.",
                "The shadows are lengthening in the corners of the sanctuary. I feel a dark presence approaching—not from the outside, but from the void between worlds. My faith is my only shield.",
                "I found a prophecy etched under the altar. 'When the Five fall, the Spirit must rise.' Am I the failsafe? The final hope? The weight of this responsibility is crushing, yet I stand.",
                "The doors have opened. I step out into a world that has forgotten the light. My friends are gone, replaced by stillness. I will bring balance back, even if I have to burn the corruption away."
            ];
            MEMORY_STORIES['chance'] = [
                "They called it a gift. 'Destiny', they said. I was chosen to save the world with luck on my side. But you can't build a life on a coin toss. It's exhilarating, until it's terrifying.",
                "At first, I tried to be the hero. I used my probability manipulation to stop accidents, to save lives. But for every lucky break, something else went wrong. The balance always corrected itself.",
                "I grew tired of the uncertainty. One day I'm a god, the next I can't even open a door without jamming my finger. This lack of control... it started to eat at me. I fell into a deep, grey depression.",
                "The responsibility was a joke. Fight Makuta? Save the realms? I couldn't even save myself from my own mind. I wanted out. I wanted to fold my hand and leave the table.",
                "That's when the voice found me. Not in a dream, but in the static between shadows. A dark, smooth whisper offering me a way out. A way to cheat the house.",
                "I took the deal. I stepped sideways out of reality and found the Madness Realm. It was beautiful. Chaos wasn't error here; it was the rule. I saw the glitches in the world's code.",
                "The power here is different. It doesn't ask permission. I learned that luck isn't random—it's a resource. And I could steal it. I could make my enemies unlucky so I could thrive.",
                "I'm done being a hero. Makuta can have his world. I found my purpose in the spin of the wheel. I will amass a fortune so vast that probability itself bends to my wallet.",
                "I fight now, yes. But not for justice. I fight because the loot drops are better when the stakes are high. Let the others bleed for ideals. I bleed for the Jackpot.",
                "The world is a casino, and I'm the only one who knows how to count cards. Watch me break the bank. Watch me take it all."
            ];
        }
    },

    injectCards: function () {
        console.log("[DLC] Injecting Collector Cards...");

        // Helper to generate the 4-card set
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
                // Madness Biome
                ...createCardSet('GLITCH', 'Glitch', '#ff00ff', 'Glitch enemies teleport 50% less often', { type: 'special', id: 'GLITCH_TELE_NERF' }),
                ...createCardSet('TURRET', 'RNG Turret', '#ff0000', 'Turrets fire 50% slower', { type: 'special', id: 'TURRET_SLOW' }),

                // Temple Biome
                ...createCardSet('GUARDIAN', 'Ivory Guardian', '#F0D080', 'Guardians cannot use shields', { type: 'special', id: 'GUARDIAN_NO_SHIELD' }),
                ...createCardSet('MONK', 'Spirit Monk', '#e6c200', 'Spirit Monks cannot heal', { type: 'special', id: 'MONK_NO_HEAL' }),
            };

            Object.assign(COLLECTOR_CARDS, newCards);
            console.log("[DLC] Cards injected into COLLECTOR_CARDS");
        } else {
            console.error("[DLC] COLLECTOR_CARDS not found!");
        }
    }
};

// Register
if (!window.DLC_REGISTRY) window.DLC_REGISTRY = {};
window.DLC_REGISTRY['faith_of_fortune'] = FAITH_OF_FORTUNE;
