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
        this.injectStoryArcLabels();
        this.injectStoryHooks();
        this.injectAltar();
        this.injectAchievements();
        this.injectMemories();
        this.injectCards();

        // Register audio
        if (typeof audioManager !== 'undefined') {
            audioManager.registerSounds({
                'attack_chance':           { path: 'dlc/faith_of_fortune/audio/sounds/attack_chance.wav',            volume: 0.3 },
                'special_chance':          { path: 'dlc/faith_of_fortune/audio/sounds/special_chance.wav',           loop: true, volume: 0.5 },
                'special_chance_jackpot':  { path: 'dlc/faith_of_fortune/audio/sounds/special_chance_jackpot.wav',   volume: 0.6 },
                'special_chance_win':      { path: 'dlc/faith_of_fortune/audio/sounds/special_chance_win.wav',       volume: 0.6 },
                'special_chance_neutral':  { path: 'dlc/faith_of_fortune/audio/sounds/special_chance_neutral.wav',   volume: 0.6 },
                'special_chance_lose':     { path: 'dlc/faith_of_fortune/audio/sounds/special_chance_lose.wav',      volume: 0.6 },
                'big_gamble':              { path: 'dlc/faith_of_fortune/audio/sounds/big_gamble.wav',               loop: true, volume: 0.5 },
                'big_gamble_jackpot':      { path: 'dlc/faith_of_fortune/audio/sounds/big_gamble_jackpot.wav',       volume: 0.6 },
                'big_gamble_win':          { path: 'dlc/faith_of_fortune/audio/sounds/big_gamble_win.wav',           volume: 0.6 },
                'big_gamble_neutral':      { path: 'dlc/faith_of_fortune/audio/sounds/big_gamble_neutral.wav',       volume: 0.6 },
                'big_gamble_lose':         { path: 'dlc/faith_of_fortune/audio/sounds/big_gamble_lose.wav',          volume: 0.6 },
                'attack_spirit':           { path: 'dlc/faith_of_fortune/audio/sounds/attack_spirit.wav',            volume: 0.3 },
                'special_spirit':          { path: 'dlc/faith_of_fortune/audio/sounds/special_spirit.wav',           volume: 0.5 },
                'special_spirit_charging': { path: 'dlc/faith_of_fortune/audio/sounds/special_spirit_charging.wav',  loop: true, volume: 0.4 },
                'wheel_tick':              { path: 'dlc/faith_of_fortune/audio/sounds/boss_wheel_tick.wav',           volume: 0.4 },
                'wheel_spin_start':        { path: 'dlc/faith_of_fortune/audio/sounds/boss_wheel_spin_start.wav',    volume: 0.55 },
                'wheel_land':              { path: 'dlc/faith_of_fortune/audio/sounds/boss_wheel_land.wav',          volume: 0.4 },
                'gambit_jackpot':          { path: 'dlc/faith_of_fortune/audio/sounds/boss_gambit_jackpot.wav',      volume: 0.55 },
                'gambit_nothing':          { path: 'dlc/faith_of_fortune/audio/sounds/boss_gambit_nothing.wav',      volume: 0.4 },
                'mimic_nova_burst':        { path: 'dlc/faith_of_fortune/audio/sounds/boss_mimic_nova.wav',          volume: 0.55 },
                'mimic_spiral_arms':       { path: 'dlc/faith_of_fortune/audio/sounds/boss_mimic_spiral.wav',        volume: 0.55 },
                'mimic_copy_hit':          { path: 'dlc/faith_of_fortune/audio/sounds/boss_mimic_copy.wav',          volume: 0.4 },
                'mimic_phase2_transition': { path: 'dlc/faith_of_fortune/audio/sounds/boss_mimic_phase2.wav',        volume: 0.7 },
                'mimic_phase3_transition': { path: 'dlc/faith_of_fortune/audio/sounds/boss_mimic_phase3.wav',        volume: 0.7 },
            });
            audioManager.registerVoicePath('chance', (id) => `dlc/faith_of_fortune/audio/memories/chance_${id}.mp3`);
            audioManager.registerVoicePath('spirit', (id) => `dlc/faith_of_fortune/audio/memories/spirit_${id}.mp3`);
        }

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

    injectStoryArcLabels: function () {
        window.STORY_ARC_LABELS = window.STORY_ARC_LABELS || {};
        const labels = function (w) {
            if (w <= 10) return '✦  ARC I  ·  THE SPLIT PATH  ✦';
            if (w <= 20) return '✦  ARC II  ·  THE ALLIANCE & THE HUNT  ✦';
            if (w <= 30) return '✦  ARC III  ·  THE VOID ENCOUNTER  ✦';
            if (w <= 40) return '✦  ARC IV  ·  THE RACE FINISHES  ✦';
            return '✦  ARC V  ·  THE FINAL WAGER  ✦';
        };
        window.STORY_ARC_LABELS['spirit'] = labels;
        window.STORY_ARC_LABELS['chance'] = labels;
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

// ---------------------------------------------------------------------------
// Mimic King Boss  —  registered directly; no monkey-patching needed because
// Boss.js checks window._DLC_BOSS_REGISTRY at construction, update, and draw.
// ---------------------------------------------------------------------------
(function () {

    // Wheel segment definitions
    const _W_COLORS = ['#e74c3c', '#00bcd4', '#f39c12', '#9b59b6', '#ff00ff', '#2ecc71'];
    const _W_NAMES  = ['AIMED BURST', 'NOVA', 'SCATTER', 'SPIRAL', 'COPY ATTACK', 'GAMBIT'];
    const _HERO_COLORS = {
        fire:'#e74c3c', water:'#3498db', ice:'#74b9ff', plant:'#2ecc71',
        metal:'#95a5a6', black:'#2c3e50', sound:'#7e57c2', poison:'#76ff03',
        chance:'#ff00ff', spirit:'#F0D080'
    };

    window._DLC_BOSS_REGISTRY = window._DLC_BOSS_REGISTRY || {};
    window._DLC_BOSS_REGISTRY['MIMIC_KING'] = {

        init(boss) {
            boss.name   = 'Mimic King';
            boss.color  = '#f1c40f';
            boss.radius = 62;
            boss.maxHp *= 1.8;
            boss.hp     = boss.maxHp;
            boss.damage *= 1.2;
            boss.phase  = 1;

            // Wheel of Fate
            boss._wheelTimer     = 300;  // first wheel at 5 s
            boss._wheelCD        = 300;
            boss._wheelTelegraph = 0;    // frames remaining in telegraph
            boss._wheelResult    = -1;   // pre-rolled segment (0-5)
            boss._wheelSpinAngle = 0;    // current displayed angle of wheel
            boss._wheelSpinStart = 0;    // angle at telegraph start
            boss._wheelFinalAngle= 0;    // angle at telegraph end (result under pointer)

            // Regular attack
            boss._atkTimer = 90;

            // Orbit (phases 1-2)
            boss._orbitAngle = 0;

            // Decoys (phase 2+)
            boss._decoys = [];
        },

        update(boss, player, arena) {
            const tgt = (typeof getCoopTarget === 'function') ? getCoopTarget(boss.x, boss.y) : player;

            // ── Phase transitions ──────────────────────────────────────
            if (boss.phase === 1 && boss.hp <= boss.maxHp * 0.6) {
                boss.phase = 2;
                boss._wheelCD = 210; // 3.5 s
                boss._decoys  = [];
                this._spawnDecoy(boss, tgt);
                if (typeof audioManager !== 'undefined') audioManager.play('mimic_phase2_transition');
                createExplosion(boss.x, boss.y, '#f1c40f');
                createExplosion(boss.x, boss.y, '#ff00ff');
                if (typeof floatingTexts !== 'undefined')
                    floatingTexts.push(new FloatingText(boss.x, boss.y - 90, 'THE MIRROR AWAKENS', '#f1c40f', 90));
                if (typeof showNotification === 'function') showNotification('THE MIRROR AWAKENS!');
            }
            if (boss.phase === 2 && boss.hp <= boss.maxHp * 0.3) {
                boss.phase = 3;
                boss.speed   *= 1.35;
                boss._wheelCD = 150; // 2.5 s
                this._spawnDecoy(boss, tgt); // second decoy
                if (typeof audioManager !== 'undefined') audioManager.play('mimic_phase3_transition');
                createExplosion(boss.x, boss.y, '#f1c40f');
                createExplosion(boss.x, boss.y, '#c0392b');
                if (typeof showNotification === 'function') showNotification('THE MASK SHATTERS!');
            }

            // ── Wheel telegraph ────────────────────────────────────────
            if (boss._wheelTelegraph > 0) {
                // Ease-out cubic: wheel decelerates into result position
                const t    = 1 - boss._wheelTelegraph / 90;
                const ease = 1 - Math.pow(1 - t, 3);
                boss._wheelSpinAngle = boss._wheelSpinStart +
                    (boss._wheelFinalAngle - boss._wheelSpinStart) * ease;
                boss._wheelTelegraph--;
                // Tick sound — faster at start, slows as wheel decelerates
                if (boss._wheelTelegraph > 0 && boss._wheelTelegraph % Math.max(3, Math.floor(12 * t)) === 0) {
                    if (typeof audioManager !== 'undefined') audioManager.play('wheel_tick');
                }
                if (boss._wheelTelegraph === 0) {
                    if (typeof audioManager !== 'undefined') audioManager.play('wheel_land');
                    this._fireWheelResult(boss, tgt);
                }
                // Decoys keep moving/firing; boss pauses movement and own attacks
                this._updateDecoys(boss, tgt, arena);
                boss.x = Math.max(boss.radius, Math.min(arena.width  - boss.radius, boss.x));
                boss.y = Math.max(boss.radius, Math.min(arena.height - boss.radius, boss.y));
                return;
            }

            // ── Wheel trigger ──────────────────────────────────────────
            if (--boss._wheelTimer <= 0) {
                boss._wheelResult = Math.floor(Math.random() * 6);
                // Final angle: pointer is at -π/2 (top); centre of result segment lands there
                const finalA = -Math.PI / 2
                    - boss._wheelResult * (Math.PI * 2 / 6)
                    - Math.PI / 6;
                boss._wheelFinalAngle = finalA;
                boss._wheelSpinStart  = finalA - Math.PI * 2 * (4 + Math.floor(Math.random() * 3));
                boss._wheelSpinAngle  = boss._wheelSpinStart;
                boss._wheelTelegraph  = 90; // 1.5 s
                boss._wheelTimer      = boss._wheelCD;
                if (typeof audioManager !== 'undefined') audioManager.play('wheel_spin_start');
                if (typeof showNotification === 'function')
                    showNotification(`WHEEL OF FATE: ${_W_NAMES[boss._wheelResult]}`, _W_COLORS[boss._wheelResult]);
            }

            // ── Regular attack ─────────────────────────────────────────
            if (--boss._atkTimer <= 0) {
                this._regularAttack(boss, tgt);
                boss._atkTimer = boss.phase === 3 ? 50 : boss.phase === 2 ? 70 : 90;
            }

            // ── Decoys ─────────────────────────────────────────────────
            this._updateDecoys(boss, tgt, arena);

            // ── Movement ───────────────────────────────────────────────
            if (boss.phase === 3) {
                // Direct chase
                const a  = Math.atan2(tgt.y - boss.y, tgt.x - boss.x);
                const mx = boss.x + Math.cos(a) * boss.speed;
                const my = boss.y + Math.sin(a) * boss.speed;
                if (!arena.checkCollision(mx, my, boss.radius))          { boss.x = mx; boss.y = my; }
                else if (!arena.checkCollision(mx, boss.y, boss.radius)) { boss.x = mx; }
                else if (!arena.checkCollision(boss.x, my, boss.radius)) { boss.y = my; }
            } else {
                // Circular orbit around target
                boss._orbitAngle += 0.018;
                const orbitR = boss.phase === 2 ? 190 : 310;
                const tx = tgt.x + Math.cos(boss._orbitAngle) * orbitR;
                const ty = tgt.y + Math.sin(boss._orbitAngle) * orbitR;
                const a  = Math.atan2(ty - boss.y, tx - boss.x);
                const mx = boss.x + Math.cos(a) * boss.speed * 1.6;
                const my = boss.y + Math.sin(a) * boss.speed * 1.6;
                if (!arena.checkCollision(mx, my, boss.radius))          { boss.x = mx; boss.y = my; }
                else if (!arena.checkCollision(mx, boss.y, boss.radius)) { boss.x = mx; }
                else if (!arena.checkCollision(boss.x, my, boss.radius)) { boss.y = my; }
            }
            boss.x = Math.max(boss.radius, Math.min(arena.width  - boss.radius, boss.x));
            boss.y = Math.max(boss.radius, Math.min(arena.height - boss.radius, boss.y));
        },

        _regularAttack(boss, tgt) {
            const a = Math.atan2(tgt.y - boss.y, tgt.x - boss.x);
            const spreads = boss.phase === 3 ? [-0.28, 0, 0.28] : boss.phase === 2 ? [-0.2, 0.2] : [0];
            spreads.forEach(s => projectiles.push(new Projectile(
                boss.x, boss.y, { x: Math.cos(a + s) * 9, y: Math.sin(a + s) * 9 },
                boss.damage * 0.7, '#f1c40f', 8, 'enemy', 0, true
            )));
        },

        _fireWheelResult(boss, tgt) {
            const a   = Math.atan2(tgt.y - boss.y, tgt.x - boss.x);
            const col = _W_COLORS[boss._wheelResult];
            const dmg = boss.damage;
            const bx  = boss.x, by = boss.y;

            switch (boss._wheelResult) {
                case 0: // AIMED BURST — 5 fast consecutive bolts
                    for (let i = 0; i < 5; i++) {
                        const sp = (Math.random() - 0.5) * 0.14;
                        setTimeout(() => {
                            if (typeof projectiles !== 'undefined')
                                projectiles.push(new Projectile(bx, by,
                                    { x: Math.cos(a + sp) * 13, y: Math.sin(a + sp) * 13 },
                                    dmg * 0.9, col, 7, 'enemy', 0, true));
                        }, i * 120);
                    }
                    break;

                case 1: // NOVA — 10 outward orbs
                    for (let i = 0; i < 10; i++) {
                        const oa = (Math.PI * 2 / 10) * i;
                        projectiles.push(new Projectile(bx, by,
                            { x: Math.cos(oa) * 5.5, y: Math.sin(oa) * 5.5 },
                            dmg * 0.85, col, 10, 'enemy', 0, true));
                    }
                    if (typeof audioManager !== 'undefined') audioManager.play('mimic_nova_burst');
                    break;

                case 2: // SCATTER — 18 slow random orbs (zone denial)
                    for (let i = 0; i < 18; i++) {
                        const ra  = Math.random() * Math.PI * 2;
                        const spd = 2 + Math.random() * 2.5;
                        projectiles.push(new Projectile(bx, by,
                            { x: Math.cos(ra) * spd, y: Math.sin(ra) * spd },
                            dmg * 0.6, col, 7, 'enemy', 0, true));
                    }
                    break;

                case 3: // SPIRAL — 3 arms × 2 staggered shots each
                    if (typeof audioManager !== 'undefined') audioManager.play('mimic_spiral_arms');
                    for (let arm = 0; arm < 3; arm++) {
                        [0, 22].forEach(delay => setTimeout(() => {
                            if (typeof projectiles === 'undefined') return;
                            const sa = (Math.PI * 2 / 3) * arm + frame * 0.05;
                            projectiles.push(new Projectile(bx, by,
                                { x: Math.cos(sa) * 6, y: Math.sin(sa) * 6 },
                                dmg * 0.75, col, 8, 'enemy', 0, true));
                        }, arm * 90 + delay * 10));
                    }
                    break;

                case 4: { // COPY ATTACK — mirrors player's hero color and spread
                    const copyCol = (window.player && _HERO_COLORS[window.player.type])
                        ? _HERO_COLORS[window.player.type] : '#ffffff';
                    for (let i = -1; i <= 1; i++) {
                        projectiles.push(new Projectile(bx, by,
                            { x: Math.cos(a + i * 0.22) * 11, y: Math.sin(a + i * 0.22) * 11 },
                            dmg * 1.1, copyCol, 9, 'enemy', 0, true));
                    }
                    if (typeof audioManager !== 'undefined') audioManager.play('mimic_copy_hit');
                    if (typeof floatingTexts !== 'undefined')
                        floatingTexts.push(new FloatingText(bx, by - 80, 'COPIED!', copyCol, 45));
                    break;
                }

                case 5: // GAMBIT — 40% MEGA NOVA, 60% taunt (pure chance)
                    if (Math.random() < 0.4) {
                        for (let i = 0; i < 20; i++) {
                            const ga = (Math.PI * 2 / 20) * i;
                            projectiles.push(new Projectile(bx, by,
                                { x: Math.cos(ga) * 6.5, y: Math.sin(ga) * 6.5 },
                                dmg, col, 10, 'enemy', 0, true));
                        }
                        if (typeof audioManager !== 'undefined') audioManager.play('gambit_jackpot');
                        if (typeof showNotification === 'function') showNotification('JACKPOT!', col);
                    } else {
                        if (typeof audioManager !== 'undefined') audioManager.play('gambit_nothing');
                        if (typeof floatingTexts !== 'undefined')
                            floatingTexts.push(new FloatingText(bx, by - 80, 'HA! NOTHING!', col, 60));
                    }
                    break;
            }
        },

        _spawnDecoy(boss, tgt) {
            const a = Math.random() * Math.PI * 2;
            boss._decoys.push({
                x: tgt.x + Math.cos(a) * 200,
                y: tgt.y + Math.sin(a) * 200,
                fireTimer: 60 + Math.floor(Math.random() * 40),
            });
        },

        _updateDecoys(boss, tgt, arena) {
            boss._decoys.forEach(d => {
                const da = Math.atan2(tgt.y - d.y, tgt.x - d.x);
                d.x += Math.cos(da) * boss.speed * 0.65;
                d.y += Math.sin(da) * boss.speed * 0.65;
                d.x  = Math.max(boss.radius, Math.min(arena.width  - boss.radius, d.x));
                d.y  = Math.max(boss.radius, Math.min(arena.height - boss.radius, d.y));
                if (--d.fireTimer <= 0) {
                    const fa = Math.atan2(tgt.y - d.y, tgt.x - d.x);
                    projectiles.push(new Projectile(d.x, d.y,
                        { x: Math.cos(fa) * 7, y: Math.sin(fa) * 7 },
                        boss.damage * 0.45, '#c8a000', 7, 'enemy', 0, true));
                    d.fireTimer = 80;
                }
            });
        },

        draw(ctx, boss) {
            const pulse = 0.5 + 0.5 * Math.sin(frame * 0.07);

            // ── Decoys (rendered first, behind real boss) ──────────────
            boss._decoys.forEach(d => {
                ctx.save();
                ctx.globalAlpha = 0.3;
                ctx.translate(d.x, d.y);
                const drg = ctx.createRadialGradient(
                    -boss.radius * 0.25, -boss.radius * 0.25, 4, 0, 0, boss.radius);
                drg.addColorStop(0, '#ead070');
                drg.addColorStop(1, '#b89000');
                ctx.beginPath(); ctx.arc(0, 0, boss.radius, 0, Math.PI * 2);
                ctx.fillStyle = drg;
                ctx.shadowColor = '#c8a000'; ctx.shadowBlur = 8;
                ctx.fill();
                ctx.restore();
            });

            // ── Real boss body ─────────────────────────────────────────
            ctx.save();
            ctx.translate(boss.x, boss.y);

            // Rainbow shimmer halo — the "mimic" quality, constantly shifting colour
            const haloHue = (frame * 1.8) % 360;
            ctx.beginPath(); ctx.arc(0, 0, boss.radius * 1.55, 0, Math.PI * 2);
            ctx.fillStyle = `hsla(${haloHue},100%,60%,${0.18 + 0.12 * pulse})`;
            ctx.fill();

            // Gold body — warm radial gradient
            const rg = ctx.createRadialGradient(
                -boss.radius * 0.28, -boss.radius * 0.28, 4, 0, 0, boss.radius);
            rg.addColorStop(0,    '#ffe87a');
            rg.addColorStop(0.45, '#f1c40f');
            rg.addColorStop(1,    '#c0900a');
            ctx.shadowColor = '#f39c12';
            ctx.shadowBlur  = 14 + 10 * pulse;
            ctx.beginPath(); ctx.arc(0, 0, boss.radius, 0, Math.PI * 2);
            ctx.fillStyle = rg; ctx.fill();

            // Rotating hexagonal outline — the mask frame
            ctx.save();
            ctx.rotate(frame * 0.012);
            ctx.strokeStyle = `rgba(255,232,100,${0.55 + 0.25 * pulse})`;
            ctx.lineWidth = 2;
            ctx.beginPath();
            for (let i = 0; i < 6; i++) {
                const ha = (Math.PI / 3) * i;
                i === 0
                    ? ctx.moveTo(Math.cos(ha) * boss.radius * 0.96, Math.sin(ha) * boss.radius * 0.96)
                    : ctx.lineTo(Math.cos(ha) * boss.radius * 0.96, Math.sin(ha) * boss.radius * 0.96);
            }
            ctx.closePath(); ctx.stroke();
            ctx.restore();

            // ── Mask face (changes per phase) ──────────────────────────
            ctx.shadowBlur = 0;
            const ex = boss.radius * 0.28, ey = boss.radius * 0.18;

            if (boss.phase === 1) {
                // Calm: open oval eyes + flat neutral mouth
                ctx.fillStyle = '#6b4c00';
                ctx.beginPath(); ctx.ellipse(-ex, -ey, 6, 8, 0, 0, Math.PI * 2); ctx.fill();
                ctx.beginPath(); ctx.ellipse( ex, -ey, 6, 8, 0, 0, Math.PI * 2); ctx.fill();
                ctx.strokeStyle = '#6b4c00'; ctx.lineWidth = 2.5;
                ctx.beginPath();
                ctx.moveTo(-boss.radius * 0.22, boss.radius * 0.28);
                ctx.lineTo( boss.radius * 0.22, boss.radius * 0.28);
                ctx.stroke();
            } else if (boss.phase === 2) {
                // Grinning: angled slit eyes + wide smile
                ctx.fillStyle = '#3d2800';
                [-1, 1].forEach(side => {
                    ctx.save();
                    ctx.translate(side * ex, -ey);
                    ctx.rotate(side * 0.35);
                    ctx.beginPath(); ctx.ellipse(0, 0, 9, 4, 0, 0, Math.PI * 2); ctx.fill();
                    ctx.restore();
                });
                ctx.strokeStyle = '#3d2800'; ctx.lineWidth = 3;
                ctx.beginPath();
                ctx.arc(0, boss.radius * 0.18, boss.radius * 0.3, 0.1, Math.PI - 0.1);
                ctx.stroke();
            } else {
                // Phase 3: cracked mask — void eyes, fracture lines
                ctx.strokeStyle = 'rgba(15,8,0,0.9)'; ctx.lineWidth = 2.2;
                [
                    [[-0.10, -0.50], [ 0.05,  0.10]],
                    [[ 0.20, -0.30], [ 0.36,  0.46]],
                    [[-0.30,  0.10], [-0.10,  0.52]],
                ].forEach(([[x1, y1], [x2, y2]]) => {
                    ctx.beginPath();
                    ctx.moveTo(x1 * boss.radius, y1 * boss.radius);
                    ctx.lineTo(x2 * boss.radius, y2 * boss.radius);
                    ctx.stroke();
                });
                // Glowing red void eyes
                ctx.shadowColor = '#ff2200'; ctx.shadowBlur = 10;
                ctx.fillStyle   = '#cc0000';
                ctx.beginPath(); ctx.arc(-ex, -ey, 5 + 3 * pulse, 0, Math.PI * 2); ctx.fill();
                ctx.beginPath(); ctx.arc( ex, -ey, 5 + 3 * pulse, 0, Math.PI * 2); ctx.fill();
            }

            // ── Crown (marks the real boss) ────────────────────────────
            ctx.shadowColor = '#f39c12'; ctx.shadowBlur = 8;
            ctx.fillStyle   = '#f1c40f';
            const cr = boss.radius;
            ctx.beginPath();
            ctx.moveTo(-cr * 0.35, -cr * 1.08);
            ctx.lineTo(-cr * 0.35, -cr * 1.32);
            ctx.lineTo(-cr * 0.18, -cr * 1.18);
            ctx.lineTo(  0,        -cr * 1.40);
            ctx.lineTo( cr * 0.18, -cr * 1.18);
            ctx.lineTo( cr * 0.35, -cr * 1.32);
            ctx.lineTo( cr * 0.35, -cr * 1.08);
            ctx.closePath(); ctx.fill();

            ctx.restore(); // back to world space

            // ── Wheel of Fate telegraph ────────────────────────────────
            if (boss._wheelTelegraph > 0) this._drawWheel(ctx, boss);
        },

        _drawWheel(ctx, boss) {
            const R     = boss.radius + 26;   // inner radius of ring
            const R2    = boss.radius + 62;   // outer radius of ring
            const prog  = 1 - boss._wheelTelegraph / 90; // 0 → 1
            const alpha = Math.min(1, prog * 4);
            const SEG   = 6;

            ctx.save();
            ctx.translate(boss.x, boss.y);

            // Six coloured wedge segments
            for (let i = 0; i < SEG; i++) {
                const startA = boss._wheelSpinAngle + (Math.PI * 2 / SEG) * i;
                const endA   = startA + (Math.PI * 2 / SEG);
                const isResult = (i === boss._wheelResult);

                ctx.beginPath();
                ctx.moveTo(Math.cos(startA) * R, Math.sin(startA) * R);
                ctx.arc(0, 0, R2, startA, endA);
                ctx.arc(0, 0, R,  endA, startA, true);
                ctx.closePath();
                ctx.globalAlpha = alpha * (isResult ? 0.9 : 0.38);
                ctx.fillStyle   = _W_COLORS[i];
                ctx.fill();

                // Result segment gets a bright stroke border
                if (isResult) {
                    ctx.globalAlpha   = alpha;
                    ctx.strokeStyle   = '#ffffff';
                    ctx.lineWidth     = 2;
                    ctx.stroke();
                }

                // Labels appear when wheel is nearly stopped (prog > 0.72)
                if (prog > 0.72) {
                    const midA = startA + Math.PI / SEG;
                    const midR = (R + R2) / 2;
                    ctx.globalAlpha  = alpha * Math.min(1, (prog - 0.72) / 0.2);
                    ctx.fillStyle    = '#ffffff';
                    ctx.textAlign    = 'center';
                    ctx.textBaseline = 'middle';
                    ctx.font         = `bold 8px Arial`;
                    ctx.save();
                    ctx.translate(Math.cos(midA) * midR, Math.sin(midA) * midR);
                    ctx.rotate(midA + Math.PI / 2);
                    ctx.fillText(_W_NAMES[i], 0, 0);
                    ctx.restore();
                }
            }

            // Fixed pointer arrow at top (−π/2), pointing inward
            ctx.globalAlpha = alpha;
            ctx.fillStyle   = '#ffffff';
            ctx.shadowColor = '#ffffff'; ctx.shadowBlur = 6;
            const pY = -(R2 + 10);
            ctx.beginPath();
            ctx.moveTo(0, pY - 10);
            ctx.lineTo(-7, pY + 4);
            ctx.lineTo( 7, pY + 4);
            ctx.closePath(); ctx.fill();

            ctx.globalAlpha = 1;
            ctx.restore();
        },
    };

    console.log("Faith of Fortune DLC: Mimic King registered in _DLC_BOSS_REGISTRY.");
})();
