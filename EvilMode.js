// EvilMode.js
// Manages Evil Mode wave sequencing, enemy hero spawning, biome routing,
// mid-run hero swap (Green Goblin → Makuta at wave 6), story narration,
// the True Golden Mask reward after wave 10, and the final "Elemental Arena".

const EvilMode = (() => {

    // ── Wave definition ──────────────────────────────────────────────────────
    // Waves 1-5:  Green Goblin vs. each hero (normal difficulty)
    // Waves 6-10: Makuta vs. each hero     (harder: statMult 1.7)
    // Wave 11:    Makuta vs. all 5 heroes  ("Elemental Arena")
    const WAVE_DEFS = [
        { playAs: 'green_goblin', enemy: ['fire'],                           biome: 'fire',   statMult: 1.0, name: 'THE FIRE HERO STRIKES' },
        { playAs: 'green_goblin', enemy: ['water'],                          biome: 'water',  statMult: 1.0, name: 'THE OCEAN RISES' },
        { playAs: 'green_goblin', enemy: ['ice'],                            biome: 'ice',    statMult: 1.0, name: 'FROZEN FURY' },
        { playAs: 'green_goblin', enemy: ['plant'],                          biome: 'plant',  statMult: 1.0, name: 'ROOTS OF RESISTANCE' },
        { playAs: 'green_goblin', enemy: ['metal'],                          biome: 'metal',  statMult: 1.0, name: 'IRON RESOLVE' },
        { playAs: 'makuta',       enemy: ['fire'],                           biome: 'fire',   statMult: 1.7, name: 'FIRE REBORN' },
        { playAs: 'makuta',       enemy: ['water'],                          biome: 'water',  statMult: 1.7, name: 'THE TIDE WARS BACK' },
        { playAs: 'makuta',       enemy: ['ice'],                            biome: 'ice',    statMult: 1.7, name: 'ABSOLUTE ZERO' },
        { playAs: 'makuta',       enemy: ['plant'],                          biome: 'plant',  statMult: 1.7, name: 'NATURE UNLEASHED' },
        { playAs: 'makuta',       enemy: ['metal'],                          biome: 'metal',  statMult: 1.7, name: 'INDESTRUCTIBLE' },
        { playAs: 'makuta',       enemy: ['fire','water','ice','plant','metal'], biome: 'chaos', statMult: 2.2, name: 'ELEMENTAL ARENA' },
    ];

    // XP multiplier so 11 waves feel as rewarding as a full run
    const XP_MULT = 3.5;

    // ── Story events ─────────────────────────────────────────────────────────
    // Narrated in first person by whichever villain is currently playable.
    // hero: 'green_goblin' | 'makuta' | 'BOTH' (shown for the wave before hero switch)
    const EVIL_STORY_EVENTS = [
        // ── Green Goblin arc (waves 1-5) ──
        {
            wave: 1, hero: 'green_goblin', id: 'evil_1_green_goblin',
            arcLabel: '🎃  ACT I  ·  THE GOBLIN HUNTS  🎃',
            title: "Into the Fire",
            text: "Heheheh! Makuta has given me a simple task: eliminate the Five Heroes before they grow too strong. I start with the Fire Hero. Cocky little ember — thinks passion alone will save them. Let's see how they handle my tricks!",
            type: 'NARRATIVE',
        },
        {
            wave: 2, hero: 'green_goblin', id: 'evil_2_green_goblin',
            arcLabel: '🎃  ACT I  ·  THE GOBLIN HUNTS  🎃',
            title: "Dampening the Tide",
            text: "One down, four to go! The Water Hero thinks their precious adaptability will save them. Flows like the ocean, they say. Well, oceans can dry up. Time to show them what happens when you face a bomb that doesn't care how fluid you are.",
            type: 'NARRATIVE',
        },
        {
            wave: 3, hero: 'green_goblin', id: 'evil_3_green_goblin',
            arcLabel: '🎃  ACT I  ·  THE GOBLIN HUNTS  🎃',
            title: "Cracking the Ice",
            text: "I do enjoy the Ice Biome. The cold keeps my bombs stable — more precise. The Ice Hero is calm, calculating. Perfect. I like dismantling calm people. Nothing breaks composure faster than realizing your defenses mean nothing against me.",
            type: 'NARRATIVE',
        },
        {
            wave: 4, hero: 'green_goblin', id: 'evil_4_green_goblin',
            arcLabel: '🎃  ACT I  ·  THE GOBLIN HUNTS  🎃',
            title: "Uprooting the Garden",
            text: "Patience. Strength through roots. How poetic. The Plant Hero thinks they can outlast me. Heheheh — I've been blowing things up for years. I have infinite patience for destruction. Let the garden burn.",
            type: 'NARRATIVE',
        },
        {
            wave: 5, hero: 'green_goblin', id: 'evil_5_green_goblin',
            arcLabel: '🎃  ACT I  ·  THE GOBLIN HUNTS  🎃',
            title: "Shattering Iron",
            text: "The Metal Hero. The strongest of the five. This one actually makes me nervous — I won't lie. But nervous is good. Nervous means I'm taking it seriously. And when I take something seriously... I always win. Time to prove it.",
            type: 'NARRATIVE',
        },

        // ── Transition to Makuta (shown before wave 6, triggered as wave 5 clears) ──
        {
            wave: 6, hero: 'makuta', id: 'evil_6_makuta',
            arcLabel: '👁  ACT II  ·  THE SHADOW DESCENDS  👁',
            title: "The Shadow Rises",
            text: "Goblin has done his part — softened them, bruised their pride. But a cracked wall still stands. I am Makuta. And I do not crack walls. I erase them. The five heroes will face me now, in the very biomes they call home. There is no sanctuary from shadow.",
            type: 'NARRATIVE',
        },
        {
            wave: 7, hero: 'makuta', id: 'evil_7_makuta',
            arcLabel: '👁  ACT II  ·  THE SHADOW DESCENDS  👁',
            title: "The Tide Bows",
            text: "The Water Hero learned to bend. Admirable. But shadow does not bend — it seeps. It fills every crack, every doubt, every moment of hesitation. I will flood the Water Biome with darkness until there is nothing left to flow.",
            type: 'NARRATIVE',
        },
        {
            wave: 8, hero: 'makuta', id: 'evil_8_makuta',
            arcLabel: '👁  ACT II  ·  THE SHADOW DESCENDS  👁',
            title: "Absolute Cold",
            text: "The Ice Hero froze their fear and called it strength. I respect the discipline. But true cold has no emotion at all — not even resolve. I am the void between stars. The Ice Hero will learn the difference between cold and nothing.",
            type: 'NARRATIVE',
        },
        {
            wave: 9, hero: 'makuta', id: 'evil_9_makuta',
            arcLabel: '👁  ACT II  ·  THE SHADOW DESCENDS  👁',
            title: "The Roots Wither",
            text: "Life persists. Nature endures. These are the lies the Plant Hero tells itself as it clings to the earth. But I have watched civilizations built over millennia crumble into dust. One hero, however rooted, is nothing before eternity.",
            type: 'NARRATIVE',
        },
        {
            wave: 10, hero: 'makuta', id: 'evil_10_makuta',
            arcLabel: '👁  ACT II  ·  THE SHADOW DESCENDS  👁',
            title: "The Final Pillar",
            text: "Metal. The last of the five. They call it indestructible. They say no force can bend it. Those who say such things have not yet faced the full weight of shadow. Every metal rusts. Every wall corrodes. I am patient enough to wait — and powerful enough not to have to.",
            type: 'NARRATIVE',
        },

        // ── Final wave ──
        {
            wave: 11, hero: 'makuta', id: 'evil_11_makuta',
            arcLabel: '👁  ACT III  ·  ELEMENTAL ARENA  👁',
            title: "All Five. One Arena.",
            text: "They have gathered. All five heroes, standing together in defiance. I can feel their bond — that insufferable warmth they call friendship. Let them cling to each other. In the end, all light fades. All bonds break. This is where the story of the Five Friends ends. This is the Elemental Arena. And I am its final chapter.",
            type: 'NARRATIVE',
        },

        // ── Epilogue (after wave 11 victory) ──
        {
            wave: 12, hero: 'makuta', id: 'evil_12_makuta',
            arcLabel: '👁  EPILOGUE  ·  THE WORLD FALLS  👁',
            title: "Eternity Begins",
            text: "It is done. The Five Heroes — who dared call themselves chosen — lie broken. The Golden Mask is mine. The world, at last, falls silent. No more light. No more hope. No more... resistance. I have waited ages for this moment. This is not an end. This is the beginning of an eternity under shadow. My shadow.",
            type: 'NARRATIVE',
        },
    ];

    // ── Arc label for openStory ───────────────────────────────────────────────
    function _getArcLabel(wave) {
        if (wave <= 5)  return '🎃  ACT I  ·  THE GOBLIN HUNTS  🎃';
        if (wave <= 10) return '👁  ACT II  ·  THE SHADOW DESCENDS  👁';
        if (wave === 11) return '👁  ACT III  ·  ELEMENTAL ARENA  👁';
        return '👁  EPILOGUE  ·  THE WORLD FALLS  👁';
    }

    // ── State ─────────────────────────────────────────────────────────────────
    let active        = false;
    let currentWave   = 0;  // 1-indexed, matches global `wave`
    let waveJustCleared = false; // guard to prevent double-trigger

    // ── Public API ────────────────────────────────────────────────────────────

    function start() {
        active          = true;
        currentWave     = 0;
        waveJustCleared = false;

        // Register audio path resolver so openStory() finds evil_N_hero.mp3 files
        window.STORY_AUDIO_RESOLVERS = window.STORY_AUDIO_RESOLVERS || {};
        const _resolver = (id) => `audio/story/evil_mode/${id}.mp3`;
        window.STORY_AUDIO_RESOLVERS['GREEN_GOBLIN'] = _resolver;
        window.STORY_AUDIO_RESOLVERS['MAKUTA']       = _resolver;

        // Register music hook: play the villain's boss theme during Evil Mode battles
        if (typeof audioManager !== 'undefined') {
            audioManager.registerMusicHook({
                priority: 90, // Higher than DLC hooks (typically 10-50), lower than Maze (always wins)
                check: () => typeof isEvilMode !== 'undefined' && isEvilMode &&
                             typeof player !== 'undefined' && !!player,
                play: () => {
                    if (typeof player !== 'undefined' && player && player.type === 'makuta') return 'makuta';
                    return 'goblin';
                },
            });
        }
    }

    function stop() {
        active = false;
    }

    function isActive() { return active; }

    function getXpMultiplier() { return XP_MULT; }

    // Returns the story event for the given wave number, or null.
    // Called from game.js triggerStory() when isEvilMode is true.
    function getStoryForWave(wave) {
        return EVIL_STORY_EVENTS.find(e => e.wave === wave) || null;
    }

    // Called from resumeWaveGeneration() instead of normal enemy/boss logic.
    function setupWave(wave) {
        currentWave     = wave;
        waveJustCleared = false;

        // Wave 12 is the epilogue — no arena, just trigger game over (victory)
        if (wave >= 12) {
            if (typeof showNotification !== 'undefined') showNotification('EVIL REIGNS SUPREME!');
            setTimeout(() => {
                if (typeof gameOver !== 'undefined') gameOver(true);
            }, 1500);
            return;
        }

        const def = WAVE_DEFS[wave - 1];
        if (!def) return;

        // ── Biome ────────────────────────────────────────────────────────────
        currentBiomeType = def.biome;

        arena.generate(def.biome, wave === 11 ? null : 'VERSUS_1V1');

        // ── Possible hero switch at wave 6+ (>6 handles debug J-key jumps) ───
        if (wave >= 6 && typeof player !== 'undefined' && player.type === 'green_goblin') {
            _switchToMakuta();
        }

        // ── True Golden Mask spawns during wave 11 (earned after wave 10) ────
        // The mask already spawned in onWaveCleared(10); nothing extra needed here.

        // ── Spawn enemy hero(es) ──────────────────────────────────────────────
        if (!window.additionalPlayers) window.additionalPlayers = [];
        window.additionalPlayers = [];

        if (wave === 11) {
            const positions = [
                { x: arena.width / 2 - 700, y: arena.height / 2 - 400 },
                { x: arena.width / 2 + 700, y: arena.height / 2 - 400 },
                { x: arena.width / 2 - 700, y: arena.height / 2 + 400 },
                { x: arena.width / 2 + 700, y: arena.height / 2 + 400 },
                { x: arena.width / 2,        y: arena.height / 2 - 600 },
            ];
            def.enemy.forEach((type, i) => {
                const pos = positions[i] || { x: arena.width / 2 + 600, y: arena.height / 2 };
                _spawnEnemyHero(type, def.statMult, pos);
            });
        } else {
            _spawnEnemyHero(def.enemy[0], def.statMult, {
                x: arena.width / 2 + 800,
                y: arena.height / 2,
            });
        }

        // Reposition player to left spawn
        if (typeof player !== 'undefined' && player) {
            player.x = arena.width / 2 - 800;
            player.y = arena.height / 2;
        }

        if (typeof bossActive !== 'undefined') bossActive = false;
        if (typeof waveTimer  !== 'undefined') waveTimer  = 999999;

        // Villain taunts the heroes at the start of every wave
        if (typeof audioManager !== 'undefined' && typeof player !== 'undefined' && player) {
            audioManager.playHeroExclamation(player.type, 'boss_moment');
        }
    }

    // Called every frame. Returns true when all enemy heroes are dead.
    function checkWaveEnd() {
        if (!active || waveJustCleared) return false;
        if (!window.additionalPlayers || window.additionalPlayers.length === 0) return false;
        return window.additionalPlayers.every(p => p.hp <= 0 || p.isDead);
    }

    // Called when the last enemy hero of the current wave is killed.
    // Only does immediate cleanup — cinematic + story continuation handled by game.js/onBossScreenDone().
    function onWaveCleared() {
        if (!active || waveJustCleared) return;
        waveJustCleared = true;

        // Clean up enemies and stray projectiles immediately
        window.additionalPlayers = [];
        if (typeof projectiles !== 'undefined') {
            projectiles = projectiles.filter(p => !p.isEnemy);
        }
    }

    // Called by game.js when the boss-defeated cinematic finishes, to continue the wave flow.
    function onBossScreenDone() {
        if (currentWave >= 11) {
            // Epilogue story before final game over
            if (typeof triggerStory !== 'undefined') triggerStory(currentWave);
            return;
        }

        // After wave 10: spawn the True Golden Mask as a reward before wave 11
        if (currentWave === 10) {
            setTimeout(() => {
                if (typeof holyMasks !== 'undefined' && typeof HolyMask !== 'undefined') {
                    holyMasks.push(new HolyMask(arena.width / 2, arena.height / 2, true));
                }
                if (typeof showNotification !== 'undefined') showNotification('THE GOLDEN MASK APPEARS! CLAIM IT!', '#f1c40f');
                if (typeof createExplosion !== 'undefined')  createExplosion(arena.width / 2, arena.height / 2, '#f1c40f');
                if (typeof triggerImpact !== 'undefined')    triggerImpact(5, 14, 0.3, 0.6, 400);
            }, 1200);
            setTimeout(() => {
                if (typeof triggerStory !== 'undefined') triggerStory(currentWave);
            }, 6000);
            return;
        }

        // Normal inter-wave transition — story screen then advanceWave
        if (typeof triggerStory !== 'undefined') triggerStory(currentWave);
    }

    // ── Private helpers ───────────────────────────────────────────────────────

    function _spawnEnemyHero(type, statMult, pos) {
        const iconEl  = document.getElementById('special-icon');
        const iconTxt = iconEl ? iconEl.innerText : '★';

        const cpu = new Player(type, true);
        cpu.controller = new AIController(player);
        cpu.id = `EVIL_CPU_${type}`;

        cpu.maxHp           *= statMult;
        cpu.hp               = cpu.maxHp;
        cpu.stats.rangeDmg  *= statMult;
        cpu.stats.meleeDmg  *= statMult;
        cpu.stats.speed     *= Math.min(statMult, 1.4);
        cpu.damageMultiplier = statMult;

        cpu.x = pos.x;
        cpu.y = pos.y;

        window.additionalPlayers.push(cpu);

        if (iconEl) iconEl.innerText = iconTxt;
    }

    function _switchToMakuta() {
        const prev = {
            level:             player.level,
            xp:                player.xp,
            maxXp:             player.maxXp,
            damageMultiplier:  player.damageMultiplier,
            speedMultiplier:   player.speedMultiplier,
            cooldownMultiplier:player.cooldownMultiplier,
            damageReduction:   player.damageReduction,
            critChance:        player.critChance,
            critMultiplier:    player.critMultiplier,
            maxHp:             player.maxHp,
            hpPct:             player.hp / player.maxHp,
            gold:              player.gold,
            goldMultiplier:    player.goldMultiplier,
            maskChance:        player.maskChance,
            runBuffs:          player.runBuffs,
            x:                 player.x,
            y:                 player.y,
        };

        player = new Player('makuta');
        window.player = player;

        player.level            = prev.level;
        player.xp               = prev.xp;
        player.maxXp            = prev.maxXp;
        player.damageMultiplier  = prev.damageMultiplier;
        player.speedMultiplier   = prev.speedMultiplier;
        player.cooldownMultiplier= prev.cooldownMultiplier;
        player.damageReduction   = prev.damageReduction;
        player.critChance        = prev.critChance;
        player.critMultiplier    = prev.critMultiplier;
        player.maxHp             = prev.maxHp;
        player.hp                = Math.floor(prev.maxHp * prev.hpPct);
        player.gold              = prev.gold;
        player.goldMultiplier    = prev.goldMultiplier;
        player.maskChance        = prev.maskChance;
        player.runBuffs          = prev.runBuffs;
        player.x                 = prev.x;
        player.y                 = prev.y;

        if (typeof showNotification !== 'undefined') showNotification('THE SHADOW RISES…', '#8e44ad');
        if (typeof triggerImpact    !== 'undefined') triggerImpact(7, 20, 0.5, 0.9, 500);
        if (typeof createExplosion  !== 'undefined') createExplosion(player.x, player.y, '#000000');
        if (typeof audioManager     !== 'undefined') audioManager.play('challenge_success');

        const xpText = document.getElementById('xp-text');
        if (xpText) xpText.innerText = `Level ${player.level}`;
    }

    // ── Unlock check (called from initMenu) ───────────────────────────────────
    function checkUnlock() {
        if (typeof saveData === 'undefined') return;
        const BASE_HEROES = ['fire', 'water', 'ice', 'plant', 'metal'];
        const unlocked = BASE_HEROES.every(h => saveData[h] && saveData[h].maxWinPrestige >= 0);
        const btn = document.getElementById('btn-evil-mode');
        if (btn) btn.style.display = unlocked ? '' : 'none';
    }

    // ── Force-unlock (debug) ──────────────────────────────────────────────────
    function forceUnlock() {
        if (typeof saveData === 'undefined') return;
        const BASE_HEROES = ['fire', 'water', 'ice', 'plant', 'metal'];
        BASE_HEROES.forEach(h => {
            if (!saveData[h]) saveData[h] = { level: 0, unlocked: 0, highScore: 0, prestige: 0, maxWinPrestige: -1 };
            // maxWinPrestige >= 0 means "beaten at least once" — set to 0 if not already beaten
            if (saveData[h].maxWinPrestige < 0) saveData[h].maxWinPrestige = 0;
        });
        if (typeof saveGame !== 'undefined') saveGame();
        checkUnlock();
    }

    // ── Public object ─────────────────────────────────────────────────────────
    return {
        start, stop, isActive,
        getXpMultiplier,
        setupWave, checkWaveEnd, onWaveCleared, onBossScreenDone,
        getStoryForWave, getArcLabel: _getArcLabel,
        checkUnlock, forceUnlock,
    };
})();

window.EvilMode = EvilMode;
