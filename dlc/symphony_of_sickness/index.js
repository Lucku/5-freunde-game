// Symphony of Sickness DLC Entry Point
const DLC_ID = 'symphony_of_sickness';

const SymphonyDLC = {
    id: DLC_ID,
    name: "Symphony of Sickness",
    heroes: ['sound', 'poison'],
    load: async function () {
        console.log("Loading Symphony of Sickness DLC...");

        // Load Dependency Scripts
        const scripts = [
            'dlc/symphony_of_sickness/SoundHero.js',
            'dlc/symphony_of_sickness/PoisonHero.js',
            'dlc/symphony_of_sickness/SoundStory.js',
            'dlc/symphony_of_sickness/PoisonStory.js',
            // Biomes will be loaded here too once created
            'dlc/symphony_of_sickness/SoundBiome.js',
            'dlc/symphony_of_sickness/PoisonBiome.js'
        ];

        // Load files sequentially or in parallel? Parallel is fine for these.
        for (const script of scripts) {
            try {
                // If the DLCManager helper is available, use it. Otherwise use a fallback.
                if (window.dlcManager && window.dlcManager.loadScript) {
                    await window.dlcManager.loadScript(script);
                } else {
                    await new Promise((resolve, reject) => {
                        const s = document.createElement('script');
                        s.src = script;
                        s.onload = resolve;
                        s.onerror = reject;
                        document.head.appendChild(s);
                    });
                }
            } catch (e) {
                console.error(`Failed to load ${script}:`, e);
            }
        }

        this.init();
    },

    init: function () {
        console.log("Initializing Symphony of Sickness DLC Logic...");

        // 0. Ensure saveData entries exist for DLC heroes (lazy-init, matching other DLC pattern)
        if (typeof saveData !== 'undefined') {
            if (!saveData['sound']) saveData['sound'] = { level: 0, unlocked: 0, highScore: 0, prestige: 0, maxWinPrestige: -1 };
            if (!saveData['poison']) saveData['poison'] = { level: 0, unlocked: 0, highScore: 0, prestige: 0, maxWinPrestige: -1 };
        }

        // 1. Inject Heroes into BASE_HERO_STATS for Main Menu
        if (typeof BASE_HERO_STATS !== 'undefined') {
            BASE_HERO_STATS['sound'] = {
                color: '#4fc3f7',
                description: "Master of Rhythm. Time your attacks to the beat for massive damage.",
                speed: 5,
                hp: 100,
                rangeDmg: 15,
                meleeDmg: 10,
                rangeCd: 40,
                meleeCd: 45,
                projectileSpeed: 10,
                projectileSize: 8,
                knockback: 4
            };
            BASE_HERO_STATS['poison'] = {
                color: '#76ff03',
                description: "Spreader of Decay. Expands a deadly miasma that drains life.",
                speed: 4,
                hp: 120,
                rangeDmg: 6,
                meleeDmg: 8,
                rangeCd: 30,
                meleeCd: 50,
                projectileSpeed: 6,
                projectileSize: 10,
                knockback: 2,
                gasRadius: 120 // Custom Stat
            };
        }

        // Init Global State
        window.SYMPHONY_STATE = {
            biomeTransformation: 0, // 0 to 100%
            targetBiome: 'sound',
            bpm: 120, // Default BPM
            lastBeatTime: 0,
            onBeat: false,
            // Sound Hero Specifics
            totems: [],
            totemsConquered: 0,
            // Poison Hero Specifics
            infectionTarget: 15, // Number of simultaneous infections needed
            currentInfectionCount: 0,
            originalBiome: null // To revert or track base state
        };

        // Helper to Trigger Biome Swap
        window.SYMPHONY_STATE.triggerBiomeAssimilation = (type) => {
            if (window.currentBiome === type) return; // Already there

            console.log(`ASSIMILATING BIOME INTO: ${type.toUpperCase()}`);
            if (typeof showNotification === 'function') {
                const msg = type === 'sound' ? "THE RHYTHM TAKES OVER!" : "THE TOXINS CONSUME ALL!";
                const color = type === 'sound' ? '#00e5ff' : '#76ff03';
                showNotification(msg, color, 300);
            }

            // Save original if not set
            if (!window.SYMPHONY_STATE.originalBiome) window.SYMPHONY_STATE.originalBiome = window.currentBiome;

            // Force Biome Swap
            window.currentBiome = type;
            // Also update global currentBiomeType used by game.js spawning logic
            if (typeof currentBiomeType !== 'undefined') {
                currentBiomeType = type;
            } else {
                window.currentBiomeType = type;
            }

            // Visual Flair
            if (type === 'sound') {
                // Clear any nearby enemies with a shockwave?
                window.enemies.forEach(e => {
                    const dist = Math.hypot(e.x - window.player.x, e.y - window.player.y);
                    if (dist < 800) e.pushbackX = (e.x - window.player.x) * 0.1;
                });
            } else if (type === 'poison') {
                // SCREEN CLEAR / MASS POISON
                if (window.enemies) {
                    window.enemies.forEach(e => {
                        // Apply Heavy Poison to ALL enemies
                        if (!e.poisonStacks) e.poisonStacks = 0;
                        e.poisonStacks += 50; // Massive dose

                        // Visual Float
                        if (typeof createDamageNumber === 'function') createDamageNumber(e.x, e.y - 30, "TOXIC SURGE!", '#76ff03');
                    });
                }

                // COOL ANIMATION: Expanding Poison Wave
                const player = window.player;
                if (player && typeof Projectile !== 'undefined') {
                    // Create a purely visual expanding ring
                    // modifying Projectile to handle 'VISUAL_RING' if needed, or just standard
                    // Actually, let's just spawn a bunch of visual particles or a custom "Wave" object if engine supports it.
                    // Fallback to standard explosion if no custom shader.
                    if (typeof createExplosion !== 'undefined') {
                        // Center burst
                        createExplosion(player.x, player.y, '#76ff03', 100);

                        // Ring effect (delayed explosions)
                        for (let r = 100; r <= 800; r += 100) {
                            setTimeout(() => {
                                const count = 8 + (r / 50);
                                for (let i = 0; i < count; i++) {
                                    const ang = (i / count) * Math.PI * 2;
                                    createExplosion(player.x + Math.cos(ang) * r, player.y + Math.sin(ang) * r, '#76ff03', 30);
                                }
                            }, r / 2); // Speed of wave
                        }
                    }
                }
            }
        };

        // Start Beat Loop
        setInterval(() => this.updateBeat(), 16);

        // 3. Inject story arc labels and themes
        this.injectStoryArcLabels();
        this.injectStoryTheme();

        // 4. Inject Altar of Mastery skills
        this.injectAltar();

        // 5. Inject Achievements
        this.injectAchievements();

        // 6. Inject Memory Stories
        this.injectMemories();

        // Register audio
        if (typeof audioManager !== 'undefined') {
            audioManager.registerSounds({
                'battle_poison':       { path: 'dlc/symphony_of_sickness/audio/music/battle_poison.wav',      loop: true, volume: 0.4 },
                'battle_sound':        { path: 'dlc/symphony_of_sickness/audio/music/battle_sound.wav',       loop: true, volume: 0.4 },
                'battle_sound_sync':   { path: 'dlc/symphony_of_sickness/audio/music/battle_sound_sync.wav',  loop: true, volume: 0.42 },
                'boss_poison':         { path: 'dlc/symphony_of_sickness/audio/music/boss_poison.wav',        loop: true, volume: 0.6 },
                'boss_sound':          { path: 'dlc/symphony_of_sickness/audio/music/boss_sound.wav',         loop: true, volume: 0.6 },
                'attack_sound_1':      { path: 'dlc/symphony_of_sickness/audio/sounds/attack_sound_1.wav',    volume: 0.25 },
                'attack_sound_2':      { path: 'dlc/symphony_of_sickness/audio/sounds/attack_sound_2.wav',    volume: 0.25 },
                'attack_sound_3':      { path: 'dlc/symphony_of_sickness/audio/sounds/attack_sound_3.wav',    volume: 0.25 },
                'attack_sound_4':      { path: 'dlc/symphony_of_sickness/audio/sounds/attack_sound_4.wav',    volume: 0.25 },
                'attack_sound_crit':   { path: 'dlc/symphony_of_sickness/audio/sounds/attack_sound_crit.wav', volume: 0.25 },
                'attack_sound_sync_1': { path: 'dlc/symphony_of_sickness/audio/sounds/attack_sound_sync_1.wav', volume: 0.25 },
                'attack_sound_sync_2': { path: 'dlc/symphony_of_sickness/audio/sounds/attack_sound_sync_2.wav', volume: 0.25 },
                'attack_sound_sync_3': { path: 'dlc/symphony_of_sickness/audio/sounds/attack_sound_sync_3.wav', volume: 0.25 },
                'attack_sound_sync_4': { path: 'dlc/symphony_of_sickness/audio/sounds/attack_sound_sync_4.wav', volume: 0.25 },
                'special_sound':       { path: 'dlc/symphony_of_sickness/audio/sounds/special_sound.wav',     volume: 0.5 },
                'attack_poison':       { path: 'dlc/symphony_of_sickness/audio/sounds/attack_poison.wav',     volume: 0.5 },
                'special_poison_1':    { path: 'dlc/symphony_of_sickness/audio/sounds/special_poison_1.wav',  volume: 0.6 },
                'special_poison_2':    { path: 'dlc/symphony_of_sickness/audio/sounds/special_poison_2.wav',  volume: 0.6 },
                'special_poison_3':    { path: 'dlc/symphony_of_sickness/audio/sounds/special_poison_3.wav',  volume: 0.6 },
                'special_poison_4':    { path: 'dlc/symphony_of_sickness/audio/sounds/special_poison_4.wav',  volume: 0.6 },
                'shadow_step_vanish':       { path: 'dlc/symphony_of_sickness/audio/sounds/boss_shadow_step_vanish.wav',    volume: 0.4 },
                'shadow_step_reappear':     { path: 'dlc/symphony_of_sickness/audio/sounds/boss_shadow_step_reappear.wav',  volume: 0.4 },
                'shadow_trail_tick':        { path: 'dlc/symphony_of_sickness/audio/sounds/boss_shadow_trail_tick.wav',     volume: 0.4 },
                'shadow_fan_shot':          { path: 'dlc/symphony_of_sickness/audio/sounds/boss_shadow_fan_shot.wav',       volume: 0.4 },
                'shadow_phase_transition':  { path: 'dlc/symphony_of_sickness/audio/sounds/boss_shadow_phase_transition.wav', volume: 0.7 },
                'dark_pulse_ring':          { path: 'dlc/symphony_of_sickness/audio/sounds/boss_dark_pulse_ring.wav',       volume: 0.55 },
            });
            audioManager.registerMusicHook({
                priority: 100,
                check: () => typeof bossActive !== 'undefined' && bossActive &&
                             typeof player !== 'undefined' && player && player.type === 'poison',
                play: () => 'boss_poison',
            });
            audioManager.registerMusicHook({
                priority: 100,
                check: () => typeof bossActive !== 'undefined' && bossActive &&
                             typeof player !== 'undefined' && player && player.type === 'sound',
                play: () => 'boss_sound',
            });
            // Sound biome sync music takes priority over plain sound-hero music
            audioManager.registerMusicHook({
                priority: 55,
                check: () => (typeof currentBiomeType !== 'undefined' && currentBiomeType === 'sound') ||
                             (typeof window.currentBiome !== 'undefined' && window.currentBiome === 'sound'),
                play: () => 'battle_sound_sync',
            });
            audioManager.registerMusicHook({
                priority: 50,
                check: () => typeof player !== 'undefined' && player && player.type === 'sound' &&
                             audioManager.isStoryMode() &&
                             !(typeof currentBiomeType !== 'undefined' && currentBiomeType === 'sound'),
                play: () => 'battle_sound',
            });
            audioManager.registerMusicHook({
                priority: 50,
                check: () => typeof player !== 'undefined' && player && player.type === 'poison' && audioManager.isStoryMode(),
                play: () => 'battle_poison',
            });
            audioManager.registerVoicePath('sound',  (id) => `dlc/symphony_of_sickness/audio/memories/sound_${id}.mp3`);
            audioManager.registerVoicePath('poison', (id) => `dlc/symphony_of_sickness/audio/memories/poison_${id}.mp3`);
            audioManager.registerExclamationPath('sound',  (s) => `dlc/symphony_of_sickness/audio/voices/sound/${s}.mp3`);
            audioManager.registerExclamationPath('poison', (s) => `dlc/symphony_of_sickness/audio/voices/poison/${s}.mp3`);
            window.STORY_AUDIO_RESOLVERS = window.STORY_AUDIO_RESOLVERS || {};
            window.STORY_AUDIO_RESOLVERS['SOUND']  = (id) => `dlc/symphony_of_sickness/audio/story/${id}.mp3`;
            window.STORY_AUDIO_RESOLVERS['POISON'] = (id) => `dlc/symphony_of_sickness/audio/story/${id}.mp3`;
        }

        console.log("Symphony of Sickness DLC Initialized");
    },

    injectMemories: function () {
        if (typeof MEMORY_STORIES === 'undefined') return;

        MEMORY_STORIES['sound'] = [
            "Music was my whole world. Before the silence.",
            "I was ten years old when the sounds stopped. They never came back. Until now.",
            "I don't just hear anymore. I feel the sounds pass through me like something sacred.",
            "The forest speaks in frequencies no one else can sense. I could listen forever.",
            "There are creatures out there that choke the world's song. I cannot stand that. I will not.",
            "Every enemy I defeat is a note returned to the silence they tried to create.",
            "But the wonder faded. What was once a miracle is now just... normal. I want more.",
            "I heard Makuta may be the reason my powers feel capped. I went looking for him.",
            "The five heroes already ended him. But the ceiling remains. I found a ritual in an ancient library that might help.",
            "I amplified the world's frequency. It felt like godhood. I know this road is wrong. I'm walking it anyway."
        ];

        MEMORY_STORIES['poison'] = [
            "I woke up as a hero. But that morning, I felt like I was dying.",
            "Rashes. Fever. A cough that cracked my ribs. The illness came from nowhere.",
            "Seven days of waking up worse than the day before.",
            "I thought I was cursed. I wasn't. The world just wasn't built for me.",
            "The swamp found me first. Or maybe I found it. Either way, I felt alive for the first time.",
            "In the poison, the pain lifted. That should have scared me. It didn't.",
            "I started mixing compounds. Crude things at first. Then more precise. More dangerous.",
            "I cannot live far from the toxins. So I have started finding ways to bring them with me.",
            "I know what I'm doing. I know what it does to others. I do it anyway. That is the worst part.",
            "Something dark is growing inside me. I tell myself it is the chemicals. I am no longer sure."
        ];
    },

    injectStoryArcLabels: function () {
        window.STORY_ARC_LABELS = window.STORY_ARC_LABELS || {};
        window.STORY_ARC_LABELS['sound'] = function (w) {
            if (w <= 10) return '✦  ARC I  ·  THE RESONANT PLAIN  ✦';
            if (w <= 20) return '✦  ARC II  ·  THE EMBER STAGE  ✦';
            if (w <= 30) return '✦  ARC III  ·  THE JUNGLE CHORUS  ✦';
            if (w <= 40) return '✦  ARC IV  ·  THE MACHINE AMPHITHEATER  ✦';
            return '✦  ARC V  ·  THE OVATION  ✦';
        };
        window.STORY_ARC_LABELS['poison'] = function (w) {
            if (w <= 10) return '✦  ARC I  ·  THE SWAMP  ✦';
            if (w <= 20) return '✦  ARC II  ·  THE LIVING FOREST  ✦';
            if (w <= 30) return '✦  ARC III  ·  THE DEPTHS & THE FLAMES  ✦';
            if (w <= 40) return '✦  ARC IV  ·  THE IRON LUNG  ✦';
            return '✦  ARC V  ·  THE TERMINAL PHASE  ✦';
        };
    },

    injectStoryTheme: function () {
        window.STORY_THEME_OVERRIDES = window.STORY_THEME_OVERRIDES || {};
        window.STORY_THEME_OVERRIDES['sound'] = { rgb: '79,195,247', icon: '🎵' };
        window.STORY_THEME_OVERRIDES['poison'] = { rgb: '118,255,3', icon: '☠️' };
    },

    injectAltar: function () {
        if (typeof ALTAR_TREE === 'undefined') return;

        // ── SOUND HERO ──
        ALTAR_TREE['sound'] = [
            {
                id: 'so1', req: 1, type: 'stat', stat: 'cooldown', val: 0.9,
                desc: 'Crescendo Cooldown -10%'
            },
            {
                id: 'so2', req: 3, type: 'stat', stat: 'beatBonus', val: 0.25,
                desc: 'On-Beat Bonus +25%: Perfect-beat attacks deal even more damage'
            },
            {
                id: 'so3', req: 5, type: 'unique',
                desc: 'Resonance Surge: CRESCENDO ring deals double damage to already-resonating enemies'
            }
        ];

        // ── POISON HERO ──
        ALTAR_TREE['poison'] = [
            {
                id: 'po1', req: 1, type: 'stat', stat: 'cooldown', val: 0.9,
                desc: 'Alchemical Mix Cooldown -10%'
            },
            {
                id: 'po2', req: 3, type: 'stat', stat: 'dotDamage', val: 1.2,
                desc: 'Virulence +20%: Poison DoT damage increased by 20%'
            },
            {
                id: 'po3', req: 5, type: 'unique',
                desc: 'Virulent Strain: Enemies killed by poison spread 50% of their stacks to all enemies within 150px'
            }
        ];

        // ── CONVERGENCES ──
        const symphonyConvergences = [
            // Sound ×5 base heroes
            {
                id: 'cv_so_f', req: { sound: 5, fire: 5 }, type: 'mutation',
                desc: 'Resonant Flame: CRESCENDO ring ignites all enemies hit'
            },
            {
                id: 'cv_so_w', req: { sound: 5, water: 5 }, type: 'mutation',
                desc: 'Sonar Current: On-beat attacks fill the Sync Meter 50% faster'
            },
            {
                id: 'cv_so_i', req: { sound: 5, ice: 5 }, type: 'mutation',
                desc: 'Cryosonic: CRESCENDO ring freezes all enemies hit for 1.5s'
            },
            {
                id: 'cv_so_p', req: { sound: 5, plant: 5 }, type: 'mutation',
                desc: 'Resonant Roots: Heal 1 HP for every enemy hit by CRESCENDO ring'
            },
            {
                id: 'cv_so_m', req: { sound: 5, metal: 5 }, type: 'mutation',
                desc: 'Steel Tempo: Sync State grants 30% damage reduction'
            },
            // Poison ×5 base heroes
            {
                id: 'cv_po_f', req: { poison: 5, fire: 5 }, type: 'mutation',
                desc: 'Burning Toxin: Enemies with 80+ poison stacks also catch fire'
            },
            {
                id: 'cv_po_w', req: { poison: 5, water: 5 }, type: 'mutation',
                desc: 'Acid Rain: Tidal Wave applies 30 poison stacks to all enemies hit'
            },
            {
                id: 'cv_po_i', req: { poison: 5, ice: 5 }, type: 'mutation',
                desc: 'Frozen Plague: Frozen enemies take double poison DoT damage'
            },
            {
                id: 'cv_po_p', req: { poison: 5, plant: 5 }, type: 'mutation',
                desc: 'Plague Bloom: Heal 0.5% max HP when an enemy dies from poison'
            },
            {
                id: 'cv_po_m', req: { poison: 5, metal: 5 }, type: 'mutation',
                desc: 'Corrosive Alloy: Poisoned enemies have 25% reduced defense'
            },
            // Cross-DLC: Sound + Poison
            {
                id: 'cv_so_po', req: { sound: 5, poison: 5 }, type: 'mutation',
                desc: 'Toxic Frequency: CRESCENDO ring applies 30 poison stacks to all enemies hit'
            }
        ];

        if (ALTAR_TREE.convergence) {
            symphonyConvergences.forEach(m => {
                if (!ALTAR_TREE.convergence.find(ex => ex.id === m.id)) {
                    ALTAR_TREE.convergence.push(m);
                }
            });
        }

        console.log("Symphony of Sickness: Altar Skills Injected.");
    },

    injectAchievements: function () {
        const achievements = window.ACHIEVEMENTS || (typeof ACHIEVEMENTS !== 'undefined' ? ACHIEVEMENTS : null);
        if (!achievements) return;

        const addDLCAch = (id, title, desc, req, stat, type, val, text) => {
            if (!achievements.some(a => a.id === id)) {
                achievements.push({ id, title, desc, req, stat, bonus: { type, val, text } });
            }
        };

        // Sound Hero
        addDLCAch('sickness_sound_story', 'Sonic Boom', 'Complete Story Mode with the Sound Hero.', 1, 'story_sound', 'damage', 0.05, '+5% Dmg');
        addDLCAch('sickness_sound_prestige', 'Maestro', 'Reach Prestige 5 with the Sound Hero.', 5, 'sound_prestige', 'cooldown', 0.05, '-5% CD');
        addDLCAch('sickness_crescendo', 'Perfect Pitch', 'Hit 1000 enemies with CRESCENDO rings.', 1000, 'sound_crescendo_hits', 'damage', 0.05, '+5% Dmg');

        // Poison Hero
        addDLCAch('sickness_poison_story', 'Plague Bearer', 'Complete Story Mode with the Poison Hero.', 1, 'story_poison', 'health', 0.05, '+5% HP');
        addDLCAch('sickness_poison_prestige', 'Virulent', 'Reach Prestige 5 with the Poison Hero.', 5, 'poison_prestige', 'damage', 0.05, '+5% Dmg');
        addDLCAch('sickness_pandemic', 'Pandemic', 'Apply 10000 total poison stacks across all runs.', 10000, 'poison_total_stacks', 'damage', 0.10, '+10% Dmg');

        console.log("Symphony of Sickness: Achievements Injected.");
    },

    updateBeat: function () {
        if (!window.SYMPHONY_STATE || !window.player) return;
        // Freeze beat phase while game is interrupted — keeps visualizations in sync on resume
        if (window.gamePaused || window.isLevelingUp) return;

        // Logic runs if player is Sound Hero OR current biome is Sound Plains
        const isSoundRelevant = (window.player.type === 'sound' || (window.currentBiome && window.currentBiome.includes('sound')));

        if (isSoundRelevant) {
            const bpm = window.SYMPHONY_STATE.bpm || 120;
            const beatIntervalMs  = 60000 / bpm;   // e.g. 500ms at 120 BPM
            const beatIntervalSec = 60    / bpm;   // e.g. 0.5s  at 120 BPM

            // ── Primary path: derive beat phase from audio currentTime ──────────
            // This gives perfect phase-lock with the music file regardless of
            // any wall-clock drift that accumulates over a long session.
            const track = typeof audioManager !== 'undefined' && audioManager.tracks &&
                (audioManager.tracks['battle_sound_sync'] || audioManager.tracks['battle_sound']);
            const audioPlaying = track && !track.paused && track.currentTime > 0;

            if (audioPlaying) {
                const phase = (track.currentTime % beatIntervalSec) / beatIntervalSec; // 0 → 1
                const prevPhase = window.SYMPHONY_STATE._prevBeatPhase || 0;

                // Beat fires on the leading edge (phase wraps through 0)
                if (prevPhase > 0.75 && phase < 0.25) {
                    window.SYMPHONY_STATE.onBeat = true;
                    window.SYMPHONY_STATE.lastBeatTime = Date.now();
                    setTimeout(() => { if (window.SYMPHONY_STATE) window.SYMPHONY_STATE.onBeat = false; }, 150);
                }

                window.SYMPHONY_STATE._prevBeatPhase = phase;
                window.SYMPHONY_STATE.beatPhase = phase; // 0 = just fired, 1 = about to fire

            } else {
                // ── Fallback: wall-clock timer when music is muted / not loaded ──
                const now = Date.now();
                if (now - window.SYMPHONY_STATE.lastBeatTime >= beatIntervalMs) {
                    window.SYMPHONY_STATE.lastBeatTime = now;
                    window.SYMPHONY_STATE.onBeat = true;
                    window.SYMPHONY_STATE.beatPhase = 0;
                    setTimeout(() => { if (window.SYMPHONY_STATE) window.SYMPHONY_STATE.onBeat = false; }, 150);
                } else {
                    window.SYMPHONY_STATE.beatPhase =
                        (now - window.SYMPHONY_STATE.lastBeatTime) / beatIntervalMs;
                }
            }
        }
    }
};

// Register in DLC Manager (if present) or Global Registry
if (!window.DLC_REGISTRY) window.DLC_REGISTRY = {};
window.DLC_REGISTRY[DLC_ID] = SymphonyDLC;

// --- Enemy Type Injection for Biome Transformation ---
(function () {
    const waitForGame = setInterval(() => {
        if (typeof window.Enemy !== 'undefined') {
            clearInterval(waitForGame);
            injectEnemyLogic();
        }
    }, 100);

    function injectEnemyLogic() {
        if (typeof window.getBiomeEnemyType === 'undefined') {
            // Define base function if missing
            window.getBiomeEnemyType = function (wave, enemy) { return null; };
        }

        const originalGetBiomeEnemyType = window.getBiomeEnemyType;
        window.getBiomeEnemyType = function (wave, enemyInstance) {
            // Check Current Biome
            let current = null;
            if (typeof currentBiomeType !== 'undefined') current = currentBiomeType;
            if (window.currentBiome) current = window.currentBiome;

            if (current) {
                const c = current.toLowerCase();
                if (c.includes('poison') || c === 'sickness') {
                    // Poison Biome Spawns
                    // Return types defined in PoisonEnemies (or assume standard if not loaded 3rd party classes)
                    // Currently using standard types but modified by Biome? 
                    // Let's use standard 'TOXIC' + chance for 'SLIME'
                    if (Math.random() < 0.3) return 'TOXIC';
                    return null; // Fallback to standard rng
                }
                if (c.includes('sound') || c === 'rhythm') {
                    // Sound Biome Spawns
                    if (Math.random() < 0.3) return 'SPEEDSTER'; // Fast tempo
                    return null;
                }
            }

            // Call original chain
            return originalGetBiomeEnemyType(wave, enemyInstance);
        };
        console.log("Symphony DLC: Biome Spawn Logic Injected.");
    }
})();

// --- Shadow Clone Boss Implementation ---
(function () {
    const integrityCheck = setInterval(() => {
        if (typeof window.Boss !== 'undefined') {
            clearInterval(integrityCheck);
            patchBossClass();
        }
    }, 100);

    function patchBossClass() {
        const OriginalBoss = window.Boss;

        window.Boss = class extends OriginalBoss {
            constructor(type) {
                super(type);
                if (type === 'SHADOW_CLONE') this._initShadowClone();
            }

            _initShadowClone() {
                this.name   = 'Shadow Self';
                this.color  = '#1a0030';
                this.radius = 65;
                // Scale on top of base stats (base = 1500 * wave * difficultyMult)
                this.maxHp *= 2.2;
                this.hp     = this.maxHp;
                this.damage *= 1.4;
                this.phase  = 1;
                // Ability timers (independent of base attackCooldown)
                this._stepTimer  = 240; // 4s — shadow step (teleport + fan burst)
                this._stepCD     = 240;
                this._pulseTimer = 300; // 5s — dark pulse (radial ring)
                this._atkTimer   = 80;  // regular aimed shot
                this._trailTimer = 0;
            }

            update(p) {
                if (this.type === 'SHADOW_CLONE') { this._shadowUpdate(p); return; }
                super.update(p);
            }

            _shadowUpdate(p) {
                const tgt = (typeof getCoopTarget === 'function') ? getCoopTarget(this.x, this.y) : p;

                // --- Phase transitions ---
                if (this.phase === 1 && this.hp <= this.maxHp * 0.6) {
                    this.phase = 2;
                    this.speed    *= 1.3;
                    this._stepCD   = 150; // 2.5 s
                    createExplosion(this.x, this.y, '#6c3483');
                    createExplosion(this.x, this.y, '#000000');
                    if (typeof floatingTexts !== 'undefined')
                        floatingTexts.push(new FloatingText(this.x, this.y - 90, 'THE REFLECTION STIRS', '#9b59b6', 90));
                    if (typeof showNotification === 'function') showNotification('THE REFLECTION STIRS!');
                    if (typeof audioManager !== 'undefined') audioManager.play('shadow_phase_transition');
                }
                if (this.phase === 2 && this.hp <= this.maxHp * 0.3) {
                    this.phase = 3;
                    this.speed    *= 1.25;
                    this._stepCD   = 90;  // 1.5 s
                    createExplosion(this.x, this.y, '#000000');
                    createExplosion(this.x, this.y, '#6c3483');
                    if (typeof showNotification === 'function') showNotification('YOU CANNOT ESCAPE YOURSELF!');
                    if (typeof audioManager !== 'undefined') audioManager.play('shadow_phase_transition');
                }

                // --- Shadow Step: teleport behind target + fan burst ---
                if (--this._stepTimer <= 0) {
                    // Vanish
                    if (typeof audioManager !== 'undefined') audioManager.play('shadow_step_vanish');
                    createExplosion(this.x, this.y, '#000000');
                    this._spawnTrailParticles(14);
                    // Reappear behind target
                    const _behind = Math.atan2(tgt.y - this.y, tgt.x - this.x) + Math.PI + (Math.random() - 0.5) * 0.9;
                    const _dist   = 110 + Math.random() * 70;
                    this.x = Math.max(this.radius, Math.min(arena.width  - this.radius, tgt.x + Math.cos(_behind) * _dist));
                    this.y = Math.max(this.radius, Math.min(arena.height - this.radius, tgt.y + Math.sin(_behind) * _dist));
                    if (typeof audioManager !== 'undefined') audioManager.play('shadow_step_reappear');
                    createExplosion(this.x, this.y, '#6c3483');
                    // Fan burst toward target
                    const shots  = this.phase === 3 ? 7 : 5;
                    const fanAng = Math.atan2(tgt.y - this.y, tgt.x - this.x);
                    for (let i = 0; i < shots; i++) {
                        const sp = ((i - Math.floor(shots / 2)) / Math.max(1, Math.floor(shots / 2))) * 0.55;
                        projectiles.push(new Projectile(this.x, this.y,
                            { x: Math.cos(fanAng + sp) * 9, y: Math.sin(fanAng + sp) * 9 },
                            this.damage * 0.65, '#6c3483', 7, 'enemy', 0, true));
                    }
                    if (typeof audioManager !== 'undefined') audioManager.play('shadow_fan_shot');
                    this._stepTimer = this._stepCD;
                }

                // --- Dark Pulse: radial orb ring ---
                if (--this._pulseTimer <= 0) {
                    const orbs = this.phase === 3 ? 16 : this.phase === 2 ? 12 : 8;
                    for (let i = 0; i < orbs; i++) {
                        const a = (Math.PI * 2 / orbs) * i;
                        projectiles.push(new Projectile(this.x, this.y,
                            { x: Math.cos(a) * 5, y: Math.sin(a) * 5 },
                            this.damage * 0.8, '#4a235a', 9, 'enemy', 0, true));
                    }
                    if (typeof audioManager !== 'undefined') audioManager.play('dark_pulse_ring');
                    this._pulseTimer = this.phase === 3 ? 180 : this.phase === 2 ? 240 : 300;
                }

                // --- Regular aimed attack ---
                if (--this._atkTimer <= 0) {
                    const a = Math.atan2(tgt.y - this.y, tgt.x - this.x);
                    if (this.phase >= 2) {
                        // 3-way spread in later phases
                        for (let i = -1; i <= 1; i++) {
                            projectiles.push(new Projectile(this.x, this.y,
                                { x: Math.cos(a + i * 0.28) * 10, y: Math.sin(a + i * 0.28) * 10 },
                                this.damage * 0.55, '#1a0030', 6, 'enemy', 0, true));
                        }
                    } else {
                        projectiles.push(new Projectile(this.x, this.y,
                            { x: Math.cos(a) * 10, y: Math.sin(a) * 10 },
                            this.damage * 0.8, '#1a0030', 8, 'enemy', 0, true));
                    }
                    this._atkTimer = this.phase === 3 ? 45 : this.phase === 2 ? 60 : 80;
                }

                // --- Shadow trail particles (phase 2+) ---
                if (this.phase >= 2) {
                    if (--this._trailTimer <= 0) {
                        this._spawnTrailParticles(3);
                        this._trailTimer = 3;
                    }
                }

                // --- Movement: approach with sinusoidal drift in phase 2+ ---
                const toAng = Math.atan2(tgt.y - this.y, tgt.x - this.x);
                const drift = this.phase >= 2 ? Math.sin(frame * 0.05) * 0.45 : 0;
                const mx = this.x + Math.cos(toAng + drift) * this.speed;
                const my = this.y + Math.sin(toAng + drift) * this.speed;
                if (!arena.checkCollision(mx, my, this.radius))          { this.x = mx; this.y = my; }
                else if (!arena.checkCollision(mx, this.y, this.radius)) { this.x = mx; }
                else if (!arena.checkCollision(this.x, my, this.radius)) { this.y = my; }
                this.x = Math.max(this.radius, Math.min(arena.width  - this.radius, this.x));
                this.y = Math.max(this.radius, Math.min(arena.height - this.radius, this.y));
            }

            _spawnTrailParticles(count) {
                if (typeof Particle === 'undefined' || typeof particles === 'undefined') return;
                for (let i = 0; i < count; i++) {
                    const tp = new Particle(
                        this.x + (Math.random() - 0.5) * this.radius,
                        this.y + (Math.random() - 0.5) * this.radius,
                        i % 2 === 0 ? '#1a0030' : '#4a235a'
                    );
                    tp.velocity.x = (Math.random() - 0.5) * 2.5;
                    tp.velocity.y = (Math.random() - 0.5) * 2.5;
                    tp.life = 0.013;
                    particles.push(tp);
                }
            }

            draw() {
                if (this.type !== 'SHADOW_CLONE') { super.draw(); return; }

                const pulse = 0.5 + 0.5 * Math.sin(frame * 0.08);

                ctx.save();
                ctx.translate(this.x, this.y);

                // Outer glow halo — expands and contracts with phase intensity
                const haloR     = this.radius * (1.5 + pulse * 0.35);
                const haloAlpha = (this.phase === 3 ? 0.55 : this.phase === 2 ? 0.38 : 0.22) * pulse;
                ctx.beginPath();
                ctx.arc(0, 0, haloR, 0, Math.PI * 2);
                ctx.fillStyle = `rgba(106,52,131,${haloAlpha})`;
                ctx.fill();

                // Body — deep void radial gradient
                const rg = ctx.createRadialGradient(-this.radius * 0.25, -this.radius * 0.25, this.radius * 0.05, 0, 0, this.radius);
                rg.addColorStop(0,    '#4a235a');
                rg.addColorStop(0.45, '#1a0030');
                rg.addColorStop(1,    '#000000');
                ctx.shadowColor = '#6c3483';
                ctx.shadowBlur  = 18 + 12 * pulse;
                ctx.beginPath();
                ctx.arc(0, 0, this.radius, 0, Math.PI * 2);
                ctx.fillStyle = rg;
                ctx.fill();

                // Rotating arc rings (phase 2+) — inner orbital detail
                if (this.phase >= 2) {
                    ctx.shadowBlur = 0;
                    for (let r = 0; r < 2; r++) {
                        const rot = frame * (0.016 + r * 0.012) * (r % 2 === 0 ? 1 : -1);
                        ctx.save();
                        ctx.rotate(rot);
                        ctx.strokeStyle = `rgba(106,52,131,${0.4 + 0.25 * pulse})`;
                        ctx.lineWidth = 1.5;
                        ctx.beginPath();
                        ctx.arc(0, 0, this.radius * (0.52 + r * 0.22), 0.2, Math.PI * 1.6);
                        ctx.stroke();
                        ctx.restore();
                    }
                }

                // Glowing violet eyes
                ctx.shadowColor = '#bf5fff';
                ctx.shadowBlur  = 5 + 4 * pulse;
                ctx.fillStyle   = '#bf5fff';
                const ex = this.radius * 0.27, ey = this.radius * 0.18;
                ctx.beginPath(); ctx.arc(-ex, -ey, 5.5, 0, Math.PI * 2); ctx.fill();
                ctx.beginPath(); ctx.arc( ex, -ey, 5.5, 0, Math.PI * 2); ctx.fill();

                // Phase 3: fracture lines radiating from centre
                if (this.phase === 3) {
                    ctx.shadowColor = '#bf5fff';
                    ctx.shadowBlur  = 6;
                    ctx.strokeStyle = `rgba(191,95,255,${0.35 + 0.2 * pulse})`;
                    ctx.lineWidth   = 1;
                    for (let i = 0; i < 6; i++) {
                        const ca = (Math.PI * 2 / 6) * i + frame * 0.012;
                        ctx.beginPath();
                        ctx.moveTo(Math.cos(ca) * this.radius * 0.28, Math.sin(ca) * this.radius * 0.28);
                        ctx.lineTo(Math.cos(ca) * this.radius * 0.88, Math.sin(ca) * this.radius * 0.88);
                        ctx.stroke();
                    }
                }

                ctx.restore();
            }
        };

        console.log("Symphony DLC: Shadow Clone boss patched.");
    }
})();

// --- Story Injection ---
(function () {
    const storyCheck = setInterval(() => {
        if (typeof window.STORY_EVENTS !== 'undefined' && window.SOUND_STORY_CHAPTERS && window.POISON_STORY_CHAPTERS) {
            clearInterval(storyCheck);
            injectStory();
        }
    }, 100);

    function injectStory() {
        // Prevent double injection
        if (window.SYMPHONY_STORY_INJECTED) return;
        window.SYMPHONY_STORY_INJECTED = true;

        if (window.SOUND_STORY_CHAPTERS) {
            window.STORY_EVENTS = window.STORY_EVENTS.concat(window.SOUND_STORY_CHAPTERS);
        }
        if (window.POISON_STORY_CHAPTERS) {
            window.STORY_EVENTS = window.STORY_EVENTS.concat(window.POISON_STORY_CHAPTERS);
        }

        console.log("Symphony DLC: Full Story Events Injected.");
    }
})();

