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
                description: "A monk of balance. Heals over time, low damage."
            };
            BASE_HERO_STATS['chance'] = {
                color: '#ff00ff', // Magenta
                hp: 77,
                speed: 4.5,
                rangeDmg: 7,
                meleeDmg: 77,
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

            // Convergences (Placeholders)
            console.log("Faith of Fortune: Altar Skills Injected.");
        }
    },

    injectAchievements: function () {
        if (typeof addAch === 'function') {
            addAch('SPIRIT_UNLOCK', 'Enlightened', 'Unlock Spirit Hero.', 10, 'unlock_spirit', 'regen', 1, '+1 HP/s');
            addAch('CHANCE_UNLOCK', 'High Roller', 'Unlock Chance Hero.', 10, 'unlock_chance', 'luck', 5, '+5 Luck');
        }
    },

    injectMemories: function () {
        if (typeof MEMORY_STORIES !== 'undefined') {
            MEMORY_STORIES['spirit'] = [
                "Silence is not empty. It is full of answers.",
                "The mask belongs to the temple. Not to men."
            ];
            MEMORY_STORIES['chance'] = [
                "Life is a game. And I'm cheating.",
                "The odds were never in my favor anyway."
            ];
        }
    }
};

// Register
if (!window.DLC_REGISTRY) window.DLC_REGISTRY = {};
window.DLC_REGISTRY['faith_of_fortune'] = FAITH_OF_FORTUNE;
