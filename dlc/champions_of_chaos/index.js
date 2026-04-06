// The Champions of Chaos - DLC Manifest

const CHAMPIONS_OF_CHAOS = {
    id: 'champions_of_chaos',
    name: "Champions of Chaos",
    heroes: ['gravity', 'void'],
    description: "Introduces 'Gravity' (Purple Hero), the Void Biome, and the Champions of Chaos story campaign.",

    load: async function () {
        console.log("[DLC] Loading: Champions of Chaos...");

        // Load Scripts
        if (window.dlcManager) {
            await window.dlcManager.loadScript('dlc/champions_of_chaos/GravityHero.js');
            await window.dlcManager.loadScript('dlc/champions_of_chaos/VoidHero.js'); // New Hero
            await window.dlcManager.loadScript('dlc/champions_of_chaos/ChaosBiome.js');
            await window.dlcManager.loadScript('dlc/champions_of_chaos/FracturedBiome.js'); // New Biome
            await window.dlcManager.loadScript('dlc/champions_of_chaos/ChaosEnemies.js');
            await window.dlcManager.loadScript('dlc/champions_of_chaos/Story.js');
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

        // Register audio
        if (typeof audioManager !== 'undefined') {
            audioManager.registerSounds({
                'battle_chaos_1':      { path: 'dlc/champions_of_chaos/audio/music/battle_1.wav',            loop: true, volume: 0.4 },
                'battle_chaos_2':      { path: 'dlc/champions_of_chaos/audio/music/battle_2.wav',            loop: true, volume: 0.4 },
                'boss_chaos_all':      { path: 'dlc/champions_of_chaos/audio/music/boss_all.wav',            loop: true, volume: 0.6 },
                'boss_entropy':        { path: 'dlc/champions_of_chaos/audio/music/boss_entropy_mage.wav',   loop: true, volume: 0.6 },
                'attack_gravity':      { path: 'dlc/champions_of_chaos/audio/sounds/attack_gravity.wav',     volume: 0.4 },
                'special_gravity':     { path: 'dlc/champions_of_chaos/audio/sounds/special_gravity.wav',    loop: true, volume: 0.6 },
                'attack_void':         { path: 'dlc/champions_of_chaos/audio/sounds/attack_void.wav',        volume: 0.4 },
                'melee_void':          { path: 'dlc/champions_of_chaos/audio/sounds/melee_void.wav',         volume: 0.5 },
                'special_void':        { path: 'dlc/champions_of_chaos/audio/sounds/special_void.wav',       volume: 0.6 },
                'dash_void':           { path: 'dlc/champions_of_chaos/audio/sounds/dash_void.wav',          volume: 0.6 },
                'void_bolt':           { path: 'dlc/champions_of_chaos/audio/sounds/boss_void_bolt.wav',         volume: 0.4 },
                'void_pulse_ring':     { path: 'dlc/champions_of_chaos/audio/sounds/boss_void_pulse_ring.wav',   volume: 0.55 },
                'dimensional_rift':    { path: 'dlc/champions_of_chaos/audio/sounds/boss_dimensional_rift.wav',  volume: 0.55 },
                'void_phase_in':       { path: 'dlc/champions_of_chaos/audio/sounds/boss_void_phase_in.wav',     volume: 0.4 },
                'void_phase_out':      { path: 'dlc/champions_of_chaos/audio/sounds/boss_void_phase_out.wav',    volume: 0.4 },
                'void_gravity_pull':   { path: 'dlc/champions_of_chaos/audio/sounds/boss_void_gravity_pull.wav', volume: 0.55 },
                'void_storm':          { path: 'dlc/champions_of_chaos/audio/sounds/boss_void_storm.wav',        volume: 0.55 },
                'glitch_teleport':     { path: 'dlc/champions_of_chaos/audio/sounds/boss_glitch_teleport.wav',   volume: 0.4 },
                'glitch_corruption_beam':  { path: 'dlc/champions_of_chaos/audio/sounds/boss_glitch_beam.wav',     volume: 0.4 },
                'glitch_fragmentation':    { path: 'dlc/champions_of_chaos/audio/sounds/boss_glitch_fragment.wav', volume: 0.55 },
                'glitch_system_crash':     { path: 'dlc/champions_of_chaos/audio/sounds/boss_glitch_crash.wav',    volume: 0.55 },
                'entropy_surge':           { path: 'dlc/champions_of_chaos/audio/sounds/boss_entropy_surge.wav',   volume: 0.55 },
                'chaos_storm':             { path: 'dlc/champions_of_chaos/audio/sounds/boss_chaos_storm.wav',     volume: 0.55 },
                'entropy_phase2_transition': { path: 'dlc/champions_of_chaos/audio/sounds/boss_entropy_phase2.wav', volume: 0.7 },
                'entropy_phase3_transition': { path: 'dlc/champions_of_chaos/audio/sounds/boss_entropy_phase3.wav', volume: 0.7 },
                'shield_orb_hit':          { path: 'dlc/champions_of_chaos/audio/sounds/boss_shield_orb_hit.wav',  volume: 0.4 },
                'entropy_teleport':        { path: 'dlc/champions_of_chaos/audio/sounds/boss_entropy_teleport.wav',volume: 0.4 },
            });
            audioManager.registerMusicHook({
                priority: 100,
                check: () => typeof bossActive !== 'undefined' && bossActive && typeof enemies !== 'undefined' &&
                             enemies.some(e => e instanceof Boss && e.type === 'ENTROPY_LORD'),
                play: () => 'boss_entropy',
            });
            audioManager.registerMusicHook({
                priority: 100,
                check: () => typeof bossActive !== 'undefined' && bossActive && typeof enemies !== 'undefined' &&
                             enemies.some(e => e instanceof Boss && (e.type === 'VOID_WALKER_BOSS' || e.type === 'GLITCH_BOSS')),
                play: () => 'boss_chaos_all',
            });
            audioManager.registerMusicHook({
                priority: 50,
                check: () => typeof player !== 'undefined' && player && player.type === 'gravity' && audioManager.isStoryMode(),
                play: () => 'battle_chaos_1',
            });
            audioManager.registerMusicHook({
                priority: 50,
                check: () => typeof player !== 'undefined' && player && player.type === 'void' && audioManager.isStoryMode(),
                play: () => 'battle_chaos_2',
            });
            audioManager.registerVoicePath('gravity', (id) => `dlc/champions_of_chaos/audio/memories/gravity_${id}.mp3`);
            audioManager.registerVoicePath('void',    (id) => `dlc/champions_of_chaos/audio/memories/void_${id}.mp3`);
            audioManager.registerExclamationPath('gravity', (s) => `dlc/champions_of_chaos/audio/voices/gravity/${s}.mp3`);
            audioManager.registerExclamationPath('void',    (s) => `dlc/champions_of_chaos/audio/voices/void/${s}.mp3`);
            window.STORY_AUDIO_RESOLVERS = window.STORY_AUDIO_RESOLVERS || {};
            window.STORY_AUDIO_RESOLVERS['GRAVITY'] = (id) => `dlc/champions_of_chaos/audio/story/${id}.mp3`;
            window.STORY_AUDIO_RESOLVERS['VOID']    = (id) => `dlc/champions_of_chaos/audio/story/${id}.mp3`;
        }

        console.log("[DLC] Loaded: Champions of Chaos (Success)");
    },

    injectHero: function () {
        // Hero Definition is handled in GravityHero.js which extends/modifies Player prototype or data

        // Inject into Base Stats for Menu Selection
        if (typeof BASE_HERO_STATS !== 'undefined') {
            BASE_HERO_STATS['gravity'] = {
                color: '#8e44ad',
                hp: 60,
                speed: 4.2,
                rangeDmg: 25,
                meleeDmg: 110,
                rangeCd: 20,
                meleeCd: 130,
                projectileSpeed: 11,
                projectileSize: 7,
                knockback: -2 // Negative knockback for pulling effect
            };
        }
    },

    injectBiome: function () {
        // Biome Logic is handled in ChaosBiome.js which registers to window.BIOME_LOGIC['gravity']
        console.log("Void Biome initialized.");
    },

    injectEnemies: function () {
        // Enemy Logic is handled in ChaosEnemies.js
        console.log("Chaos Enemies initialized.");
    },

    injectStoryArcLabels: function () {
        window.STORY_ARC_LABELS = window.STORY_ARC_LABELS || {};
        const labels = function (w) {
            if (w <= 10) return '✦  ARC I  ·  THE ARTIFACT  ✦';
            if (w <= 20) return '✦  ARC II  ·  THE ENCOUNTER  ✦';
            if (w <= 30) return '✦  ARC III  ·  THE REVELATION  ✦';
            if (w <= 40) return '✦  ARC IV  ·  THE BOND  ✦';
            return '✦  ARC V  ·  THE ENTROPY MAGE  ✦';
        };
        window.STORY_ARC_LABELS['gravity'] = labels;
        window.STORY_ARC_LABELS['void'] = labels;
    },

    injectStory: function () {
        if (typeof STORY_EVENTS !== 'undefined' && window.CHAOS_STORY_CHAPTERS) {
            // Merge DLC Story Chapters into Global Story
            window.STORY_EVENTS = window.STORY_EVENTS.concat(window.CHAOS_STORY_CHAPTERS);
            console.log(`Champions of Chaos: Injected ${window.CHAOS_STORY_CHAPTERS.length} story chapters.`);
        }
    },

    injectAltar: function () {
        if (typeof ALTAR_TREE !== 'undefined') {
            // FIX: Use ALTAR_TREE and correct schema
            ALTAR_TREE['gravity'] = [
                { id: 'g1', req: 1, type: 'stat', stat: 'cooldown', val: 0.9, desc: 'Singularity Cooldown -10%' },
                { id: 'g2', req: 3, type: 'stat', stat: 'radius', val: 1.2, desc: 'Event Horizon Radius +20%' },
                { id: 'g3', req: 5, type: 'unique', desc: 'Spaghettification: Ensnared enemies take +50% dmg' }
            ];

            // VOID HERO SKILLS
            ALTAR_TREE['void'] = [
                { id: 'v1', req: 1, type: 'stat', stat: 'meleeCd', val: 0.9, desc: 'Bitrot: Attack Speed +10%' },
                { id: 'v2', req: 3, type: 'stat', stat: 'meleeRadiusMult', val: 1.25, desc: 'Bandwidth: Slash Size +25%' },
                { id: 'v3', req: 5, type: 'unique', desc: 'Kernel Panic: Execute enemies below 15% HP' }
            ];

            // CONVERGENCES
            const chaosMutations = [
                { id: 'c30', req: { gravity: 5, void: 5 }, type: 'mutation', desc: 'Entropy: Gravity Wells apply Decay (Stacks)' },
                { id: 'c31', req: { earth: 5, gravity: 5 }, type: 'mutation', desc: 'Asteroid Belt: Rocks orbit the Gravity Well' },
                { id: 'c32', req: { ice: 5, void: 5 }, type: 'mutation', desc: 'Null Freeze: Frozen enemies are executed at 25% HP' },
                { id: 'c33', req: { fire: 5, gravity: 5 }, type: 'mutation', desc: 'Quasar: Gravity Wells explode on expiry' },
                { id: 'c34', req: { lightning: 5, void: 5 }, type: 'mutation', desc: 'Glitch: Executions trigger Chain Lightning' }
            ];

            if (ALTAR_TREE.convergence) {
                chaosMutations.forEach(m => {
                    if (!ALTAR_TREE.convergence.find(ex => ex.id === m.id)) {
                        ALTAR_TREE.convergence.push(m);
                    }
                });
            }

            console.log("Champions of Chaos: Altar Skills Injected.");
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

        // Gravity Hero — story & progression
        addDLCAch('chaos_gravity_story',   'Galactic Conqueror', 'Complete Story Mode with the Gravity Hero.',                      1,   'story_gravity',         'damage', 0.10, '+10% Dmg');
        addDLCAch('chaos_gravity_prestige','Singularity',        'Reach Prestige 5 with the Gravity Hero.',                         5,   'gravity_prestige',      'damage', 0.05, '+5% Dmg');

        // Gravity Hero — unique mechanics
        addDLCAch('chaos_black_hole',      'Event Horizon',      'Pull 1000 enemies into Gravity Wells across all runs.',           1000,'gravity_pull_count',     'damage', 0.05, '+5% Dmg');
        addDLCAch('chaos_realm_shift',     'Dimension Breaker',  'Activate REALM SHIFT 25 times across all runs.',                 25,  'gravity_realm_shifts',  'cooldown',0.05,'-5% CD');

        // Void Hero — story & progression
        addDLCAch('chaos_void_story',      'Into the Void',      'Complete Story Mode with the Void Hero.',                         1,   'story_void',            'damage', 0.10, '+10% Dmg');
        addDLCAch('chaos_void_prestige',   'System Administrator','Reach Prestige 5 with the Void Hero.',                          5,   'void_prestige',         'damage', 0.05, '+5% Dmg');

        // Void Hero — unique mechanics
        addDLCAch('chaos_execute',         'Kernel Panic',       'Execute 500 enemies with the Void Hero.',                         500, 'void_execute_count',    'damage', 0.05, '+5% Dmg');

        // Shared milestone — unlocked directly when ENTROPY_LORD boss dies
        addDLCAch('chaos_superboss', 'Entropy Lord', 'Defeat the Chaos Superboss.', 1, 'chaos_boss_kill', 'damage', 0.25, '+25% Dmg');

        // Register superboss for boss-death hook in game.js
        window.DLC_STORY_ACHIEVEMENTS = window.DLC_STORY_ACHIEVEMENTS || {};
        window.DLC_STORY_ACHIEVEMENTS['ENTROPY_LORD'] = 'chaos_superboss';
    },

    injectMemories: function () {
        if (typeof MEMORY_STORIES !== 'undefined') {
            MEMORY_STORIES['gravity'] = [
                "My name was Aris. I studied the forces that hold the world together.",
                "I tried to build a containment field for the Entropy. I failed.",
                "The accident didn't kill me. It made me heavy. Infinite.",
                "I remember a daughter. Her laugh was lighter than air. I miss that.",
                "Now I carry the weight of the entire world on my shoulders.",
                "The Void... Kael. He reminds me of the chaotic code I wrote.",
                "I pull things close because I am terrified of being alone again.",
                "The Event Horizon is not a line. It is a doorway I cannot close.",
                "Every enemy I crush adds to the mass. I am becoming a black hole.",
                "If I collapse, the whole world goes with me. I must stay strong."
            ];

            MEMORY_STORIES['void'] = [
                "I was initialized as a defense protocol. Target: Entropy.",
                "System Logs corrupted. Name: Kael. That is what Aris calls me.",
                "I am not code. I feel... anger? Is this a bug?",
                "The developers abandoned this server. I am the only admin left.",
                "Aris is dense. Stubborn. But his logic is sound.",
                "I remember the first crash. I rebooted, but the world didn't.",
                "My blade is made of deleted files. The ghosts of the old version.",
                "I dream of a stable build. A world without glitches.",
                "The Entropy Mage is a virus. I am the antivirus.",
                "If I am deleted, back me up in your memory, old friend."
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
                ...createCardSet('VOID_WALKER', 'Void Walker', '#4a235a', 'Void Walkers have 20% less HP', { type: 'damage_vs', val: 0.2, target: 'VOID_WALKER' }),
                ...createCardSet('ENTROPY_MAGE', 'Entropy Mage', '#9b59b6', 'Enemy Projectiles move 50% slower', { type: 'special', id: 'ENTROPY_PROJ_SLOW' })
            };

            Object.assign(COLLECTOR_CARDS, newCards);
            console.log("[DLC] Cards injected into COLLECTOR_CARDS");
        }
    }
};

// Register
if (!window.DLC_REGISTRY) window.DLC_REGISTRY = {};
window.DLC_REGISTRY['champions_of_chaos'] = CHAMPIONS_OF_CHAOS;

// ---------------------------------------------------------------------------
// Champions of Chaos — Boss Registry
//
//  VOID_WALKER_BOSS  Scaled-up dimensional void entity. Phases through
//                    reality (immune windows), void bolt barrages, gravity
//                    pull (P2+), void storm 24-ring (P3).
//
//  GLITCH_BOSS       Glass-cannon digital corruption boss. Rapid teleport +
//                    burst fire, corruption beam, fragmentation decoys (P2),
//                    system crash nova on every teleport (P3).
//
//  ENTROPY_LORD      Superboss. Orbital shield damage, chaos spread shots,
//                    entropy surge nova, summons GLITCH minions, chaos storm
//                    triple-ring volley (P3).
// ---------------------------------------------------------------------------
(function () {
    window._DLC_BOSS_REGISTRY = window._DLC_BOSS_REGISTRY || {};

    // ── VOID WALKER BOSS ────────────────────────────────────────────────────
    window._DLC_BOSS_REGISTRY['VOID_WALKER_BOSS'] = {

        init(boss) {
            boss.name            = 'Void Walker';
            boss.color           = '#1a0030';
            boss.radius          = 72;
            boss.maxHp          *= 2.2;
            boss.hp              = boss.maxHp;
            boss.damage         *= 1.3;
            boss.speed          *= 0.9;
            boss.knockbackResist = 0.6;
            boss.phase           = 1;

            boss._boltTimer    = 70;
            boss._pulseTimer   = 300;
            boss._riftTimer    = 240;
            boss._pullTimer    = 360;   // phase 2+
            boss._stormTimer   = 0;     // phase 3
            boss._phaseTimer   = 480;   // immunity cycle
            boss._phaseActive  = false;
            boss._phaseDur     = 0;
            boss._orbitAngle   = 0;
        },

        update(boss, player, arena) {
            const tgt = (typeof getCoopTarget === 'function') ? getCoopTarget(boss.x, boss.y) : player;

            // Phase transitions
            if (boss.phase === 1 && boss.hp <= boss.maxHp * 0.6) {
                boss.phase = 2;
                boss._pulseTimer  = 150;
                boss._phaseTimer  = 300;
                createExplosion(boss.x, boss.y, '#4a235a');
                createExplosion(boss.x, boss.y, '#000000');
                if (typeof showNotification === 'function') showNotification('THE VOID EXPANDS!');
            }
            if (boss.phase === 2 && boss.hp <= boss.maxHp * 0.3) {
                boss.phase = 3;
                boss.speed      *= 1.4;
                boss._phaseTimer = 200; // phase more frequently
                createExplosion(boss.x, boss.y, '#6c3483');
                if (typeof showNotification === 'function') showNotification('REALITY UNRAVELS!');
            }

            // Immunity phase cycle
            boss._phaseTimer--;
            if (boss._phaseTimer <= 0 && !boss._phaseActive) {
                boss._phaseActive = true;
                boss._phaseDur    = boss.phase === 3 ? 90 : 120;
                boss.alpha        = 0.15;
                boss._phaseTimer  = boss.phase === 3 ? 200 : 380;
                if (typeof audioManager !== 'undefined') audioManager.play('void_phase_out');
                createExplosion(boss.x, boss.y, '#4a235a');
            }
            if (boss._phaseActive) {
                boss._phaseDur--;
                if (boss._phaseDur <= 0) {
                    boss._phaseActive = false;
                    boss.alpha        = 1.0;
                    if (typeof audioManager !== 'undefined') audioManager.play('void_phase_in');
                    createExplosion(boss.x, boss.y, '#c39bd3');
                }
            }

            // Movement — wide orbit around target
            boss._orbitAngle += boss.phase === 3 ? 0.028 : 0.018;
            const orbitR = boss.phase === 3 ? 220 : boss.phase === 2 ? 280 : 340;
            const tx = tgt.x + Math.cos(boss._orbitAngle) * orbitR;
            const ty = tgt.y + Math.sin(boss._orbitAngle) * orbitR;
            const ma = Math.atan2(ty - boss.y, tx - boss.x);
            const mx = boss.x + Math.cos(ma) * boss.speed * 1.5;
            const my = boss.y + Math.sin(ma) * boss.speed * 1.5;
            if (!arena.checkCollision(mx, my, boss.radius))          { boss.x = mx; boss.y = my; }
            else if (!arena.checkCollision(mx, boss.y, boss.radius)) { boss.x = mx; }
            else if (!arena.checkCollision(boss.x, my, boss.radius)) { boss.y = my; }

            // Void bolt
            if (--boss._boltTimer <= 0) {
                boss._boltTimer = boss.phase === 3 ? 40 : boss.phase === 2 ? 55 : 70;
                this._voidBolt(boss, tgt);
            }

            // Void pulse ring
            if (--boss._pulseTimer <= 0) {
                boss._pulseTimer = boss.phase === 3 ? 150 : boss.phase === 2 ? 200 : 300;
                this._voidPulse(boss);
            }

            // Dimensional rift (teleport + burst)
            if (--boss._riftTimer <= 0) {
                boss._riftTimer = boss.phase === 3 ? 150 : boss.phase === 2 ? 200 : 240;
                this._dimensionalRift(boss, tgt, arena);
            }

            // Gravity pull (phase 2+)
            if (boss.phase >= 2 && --boss._pullTimer <= 0) {
                boss._pullTimer = boss.phase === 3 ? 200 : 360;
                this._gravityPull(boss, tgt);
            }

            // Void storm (phase 3 only)
            if (boss.phase === 3) {
                boss._stormTimer--;
                if (boss._stormTimer <= 0) {
                    boss._stormTimer = 280;
                    this._voidStorm(boss);
                }
            }

            boss.x = Math.max(boss.radius, Math.min(arena.width  - boss.radius, boss.x));
            boss.y = Math.max(boss.radius, Math.min(arena.height - boss.radius, boss.y));
        },

        _voidBolt(boss, tgt) {
            if (typeof audioManager !== 'undefined') audioManager.play('void_bolt');
            const a     = Math.atan2(tgt.y - boss.y, tgt.x - boss.x);
            const count = boss.phase === 3 ? 3 : boss.phase === 2 ? 2 : 1;
            for (let i = 0; i < count; i++) {
                const sp = (i - Math.floor(count / 2)) * 0.22;
                projectiles.push(new Projectile(boss.x, boss.y,
                    { x: Math.cos(a + sp) * 10, y: Math.sin(a + sp) * 10 },
                    boss.damage * 0.7, '#4a235a', 9, 'enemy', 0, true));
            }
        },

        _voidPulse(boss) {
            const count = boss.phase === 3 ? 16 : boss.phase === 2 ? 12 : 8;
            for (let i = 0; i < count; i++) {
                const a = (Math.PI * 2 / count) * i;
                projectiles.push(new Projectile(boss.x, boss.y,
                    { x: Math.cos(a) * 5.5, y: Math.sin(a) * 5.5 },
                    boss.damage * 0.8, '#6c3483', 10, 'enemy', 0, true));
            }
            createExplosion(boss.x, boss.y, '#4a235a');
            if (typeof audioManager !== 'undefined') audioManager.play('void_pulse_ring');
        },

        _dimensionalRift(boss, tgt, arena) {
            if (typeof audioManager !== 'undefined') audioManager.play('dimensional_rift');
            createExplosion(boss.x, boss.y, '#000000');
            const a = Math.random() * Math.PI * 2;
            const d = 200 + Math.random() * 150;
            boss.x = Math.max(boss.radius, Math.min(arena.width  - boss.radius, tgt.x + Math.cos(a) * d));
            boss.y = Math.max(boss.radius, Math.min(arena.height - boss.radius, tgt.y + Math.sin(a) * d));
            createExplosion(boss.x, boss.y, '#c39bd3');
            // Burst fire from new position
            const shots = boss.phase === 3 ? 10 : 6;
            const bx = boss.x, by = boss.y;
            for (let i = 0; i < shots; i++) {
                const fa = (Math.PI * 2 / shots) * i;
                projectiles.push(new Projectile(bx, by,
                    { x: Math.cos(fa) * 7, y: Math.sin(fa) * 7 },
                    boss.damage * 0.65, '#4a235a', 8, 'enemy', 0, true));
            }
        },

        _gravityPull(boss, tgt) {
            const dist = Math.hypot(tgt.x - boss.x, tgt.y - boss.y);
            if (dist < 500 && dist > boss.radius + 20) {
                const pa = Math.atan2(boss.y - tgt.y, boss.x - tgt.x);
                tgt.x += Math.cos(pa) * 70;
                tgt.y += Math.sin(pa) * 70;
                if (typeof audioManager !== 'undefined') audioManager.play('void_gravity_pull');
                createExplosion(boss.x, boss.y, '#1a0030');
                if (typeof showNotification === 'function') showNotification('VOID PULL!');
            }
        },

        _voidStorm(boss) {
            for (let i = 0; i < 24; i++) {
                const a = (Math.PI * 2 / 24) * i;
                projectiles.push(new Projectile(boss.x, boss.y,
                    { x: Math.cos(a) * 6.5, y: Math.sin(a) * 6.5 },
                    boss.damage * 0.9, '#6c3483', 10, 'enemy', 0, true));
            }
            if (typeof audioManager !== 'undefined') audioManager.play('void_storm');
            createExplosion(boss.x, boss.y, '#4a235a');
            createExplosion(boss.x, boss.y, '#000000');
            if (typeof showNotification === 'function') showNotification('VOID STORM!');
        },

        draw(ctx, boss) {
            const t     = Date.now() / 1000;
            const pulse = 0.5 + 0.5 * Math.sin(frame * 0.07);
            const r     = boss.radius;

            ctx.save();
            ctx.translate(boss.x, boss.y);
            ctx.globalAlpha = boss.alpha || 1;

            // Pulsing void rings
            for (let ring = 3; ring >= 1; ring--) {
                const rp = Math.sin(t * 1.6 + ring) * 7;
                ctx.beginPath(); ctx.arc(0, 0, r + ring * 18 + rp, 0, Math.PI * 2);
                ctx.strokeStyle = `rgba(74, 35, 90, ${0.20 - ring * 0.04})`;
                ctx.lineWidth = 2.5; ctx.stroke();
            }

            // Body — dissolving void gradient
            const rg = ctx.createRadialGradient(0, 0, 0, 0, 0, r);
            rg.addColorStop(0,    '#000000');
            rg.addColorStop(0.28, '#0d0020');
            rg.addColorStop(0.60, '#4a235a');
            rg.addColorStop(1,    'rgba(30, 0, 50, 0.05)');
            ctx.shadowColor = '#6c3483'; ctx.shadowBlur = 14 + 8 * pulse;
            ctx.beginPath(); ctx.arc(0, 0, r, 0, Math.PI * 2);
            ctx.fillStyle = rg; ctx.fill();
            ctx.shadowBlur = 0;

            // Rotating void tendrils — larger count than enemy version
            ctx.save(); ctx.rotate(t * 0.35);
            for (let i = 0; i < 6; i++) {
                const a = i * (Math.PI / 3);
                ctx.beginPath();
                ctx.moveTo(Math.cos(a) * r * 0.22, Math.sin(a) * r * 0.22);
                ctx.quadraticCurveTo(
                    Math.cos(a + 0.55) * r * 0.82, Math.sin(a + 0.55) * r * 0.82,
                    Math.cos(a + 1.05) * r * 1.08, Math.sin(a + 1.05) * r * 1.08
                );
                ctx.strokeStyle = `rgba(140, 50, 200, ${0.30 + 0.15 * pulse})`;
                ctx.lineWidth = 2; ctx.stroke();
            }
            ctx.restore();

            // Void core
            ctx.beginPath(); ctx.arc(0, 0, r * 0.30, 0, Math.PI * 2);
            ctx.fillStyle = '#000'; ctx.fill();

            // Glowing void eye slit (phase 3: split into two)
            ctx.save();
            ctx.shadowColor = '#8e44ad'; ctx.shadowBlur = 14;
            ctx.strokeStyle = '#c39bd3'; ctx.lineWidth = 3; ctx.lineCap = 'round';
            if (boss.phase === 3) {
                ctx.beginPath(); ctx.moveTo(-r * 0.2, -r * 0.06); ctx.lineTo(-r * 0.05, -r * 0.06); ctx.stroke();
                ctx.beginPath(); ctx.moveTo( r * 0.05, -r * 0.06); ctx.lineTo( r * 0.2,  -r * 0.06); ctx.stroke();
            } else {
                ctx.beginPath(); ctx.moveTo(-r * 0.22, 0); ctx.lineTo(r * 0.22, 0); ctx.stroke();
            }
            ctx.restore();

            // Phase indicator ring
            if (boss._phaseActive) {
                ctx.beginPath(); ctx.arc(0, 0, r * 1.22, 0, Math.PI * 2);
                ctx.strokeStyle = `rgba(200, 150, 255, ${0.55 + Math.sin(t * 10) * 0.3})`;
                ctx.lineWidth = 2; ctx.stroke();
            }

            // Phase 2+: extra rotating arc rings
            if (boss.phase >= 2) {
                ctx.save(); ctx.rotate(-t * 0.5);
                ctx.strokeStyle = `rgba(108, 52, 131, ${0.35 + 0.12 * pulse})`;
                ctx.lineWidth = 2; ctx.setLineDash([12, 8]);
                ctx.beginPath(); ctx.arc(0, 0, r * 0.78, 0, Math.PI * 1.6); ctx.stroke();
                ctx.setLineDash([]); ctx.restore();
            }

            ctx.globalAlpha = 1;
            ctx.restore();
        },
    };

    // ── GLITCH BOSS ─────────────────────────────────────────────────────────
    window._DLC_BOSS_REGISTRY['GLITCH_BOSS'] = {

        init(boss) {
            boss.name     = 'Glitch';
            boss.color    = '#ff00ff';
            boss.radius   = 60;
            boss.maxHp   *= 1.2;   // glass cannon
            boss.hp       = boss.maxHp;
            boss.damage  *= 1.8;
            boss.speed   *= 2.0;
            boss.phase    = 1;

            boss._baseSpeed    = boss.speed;
            boss._teleTimer    = 90;
            boss._beamTimer    = 120;
            boss._fragTimer    = 300;  // phase 2 fragmentation
            boss._decoys       = [];
            boss._crashMode    = false;  // phase 3
        },

        update(boss, player, arena) {
            const tgt = (typeof getCoopTarget === 'function') ? getCoopTarget(boss.x, boss.y) : player;

            // Phase transitions
            if (boss.phase === 1 && boss.hp <= boss.maxHp * 0.5) {
                boss.phase = 2;
                boss.speed *= 1.3;
                boss._teleTimer = 60;
                if (typeof audioManager !== 'undefined') audioManager.play('glitch_fragmentation');
                createExplosion(boss.x, boss.y, '#ff00ff');
                createExplosion(boss.x, boss.y, '#00ffff');
                if (typeof showNotification === 'function') showNotification('FRAGMENTATION ERROR!');
            }
            if (boss.phase === 2 && boss.hp <= boss.maxHp * 0.25) {
                boss.phase = 3;
                boss._crashMode = true;
                boss.speed *= 1.4;
                boss._teleTimer = 45;
                if (typeof audioManager !== 'undefined') audioManager.play('glitch_system_crash');
                createExplosion(boss.x, boss.y, '#ffffff');
                if (typeof showNotification === 'function') showNotification('SYSTEM CRASH!');
            }

            // Jitter movement (erratic)
            boss.speed = boss._baseSpeed * (boss.phase === 3 ? 1 : 1) * (0.6 + Math.random() * 0.8);
            const ang  = Math.atan2(tgt.y - boss.y, tgt.x - boss.x);
            const mx   = boss.x + Math.cos(ang) * boss.speed;
            const my   = boss.y + Math.sin(ang) * boss.speed;
            if (!arena.checkCollision(mx, my, boss.radius))          { boss.x = mx; boss.y = my; }
            else if (!arena.checkCollision(mx, boss.y, boss.radius)) { boss.x = mx; }
            else if (!arena.checkCollision(boss.x, my, boss.radius)) { boss.y = my; }

            // Teleport + burst
            if (--boss._teleTimer <= 0) {
                boss._teleTimer = boss.phase === 3 ? 45 : boss.phase === 2 ? 60 : 90;
                this._teleportBurst(boss, tgt, arena);
            }

            // Corruption beam
            if (--boss._beamTimer <= 0) {
                boss._beamTimer = boss.phase === 3 ? 80 : 120;
                this._corruptionBeam(boss, tgt);
            }

            // Fragmentation (phase 2+)
            if (boss.phase >= 2 && --boss._fragTimer <= 0) {
                boss._fragTimer = boss.phase === 3 ? 200 : 300;
                this._fragmentation(boss, tgt);
            }

            // Update decoys
            this._updateDecoys(boss, tgt, arena);

            boss.x = Math.max(boss.radius, Math.min(arena.width  - boss.radius, boss.x));
            boss.y = Math.max(boss.radius, Math.min(arena.height - boss.radius, boss.y));
        },

        _teleportBurst(boss, tgt, arena) {
            if (typeof audioManager !== 'undefined') audioManager.play('glitch_teleport');
            createExplosion(boss.x, boss.y, '#ff00ff');
            boss.x = tgt.x + (Math.random() - 0.5) * 400;
            boss.y = tgt.y + (Math.random() - 0.5) * 400;
            boss.x = Math.max(boss.radius + 30, Math.min(arena.width  - boss.radius - 30, boss.x));
            boss.y = Math.max(boss.radius + 30, Math.min(arena.height - boss.radius - 30, boss.y));
            createExplosion(boss.x, boss.y, '#00ffff');

            const count = boss._crashMode ? 16 : boss.phase === 2 ? 10 : 8;
            for (let i = 0; i < count; i++) {
                const a = (Math.PI * 2 / count) * i;
                const col = ['#ff00ff', '#00ffff', '#ff0055'][i % 3];
                projectiles.push(new Projectile(boss.x, boss.y,
                    { x: Math.cos(a) * (boss._crashMode ? 8 : 5.5), y: Math.sin(a) * (boss._crashMode ? 8 : 5.5) },
                    boss.damage * 0.65, col, 8, 'enemy', 0, true));
            }
        },

        _corruptionBeam(boss, tgt) {
            if (typeof audioManager !== 'undefined') audioManager.play('glitch_corruption_beam');
            const a    = Math.atan2(tgt.y - boss.y, tgt.x - boss.x);
            const bx   = boss.x, by = boss.y;
            const shots = boss.phase === 3 ? 7 : 5;
            for (let i = 0; i < shots; i++) {
                setTimeout(() => {
                    if (typeof projectiles === 'undefined') return;
                    const sp = (Math.random() - 0.5) * 0.18;
                    projectiles.push(new Projectile(bx, by,
                        { x: Math.cos(a + sp) * 12, y: Math.sin(a + sp) * 12 },
                        boss.damage * 0.8, '#00ffff', 7, 'enemy', 0, true));
                }, i * 60);
            }
        },

        _fragmentation(boss, tgt) {
            // Spawn 2 decoy copies that fire and chase
            boss._decoys = [];
            for (let i = 0; i < 2; i++) {
                const a = (Math.PI * 2 / 2) * i + Math.random();
                boss._decoys.push({
                    x: boss.x + Math.cos(a) * 120,
                    y: boss.y + Math.sin(a) * 120,
                    fireTimer: 40 + Math.floor(Math.random() * 30),
                    life: boss.phase === 3 ? 300 : 240,
                });
            }
            if (typeof audioManager !== 'undefined') audioManager.play('glitch_fragmentation');
            createExplosion(boss.x, boss.y, '#ff00ff');
            if (typeof showNotification === 'function') showNotification('FRAGMENTED!');
        },

        _updateDecoys(boss, tgt, arena) {
            boss._decoys = boss._decoys.filter(d => {
                d.life--;
                const da = Math.atan2(tgt.y - d.y, tgt.x - d.x);
                d.x += Math.cos(da) * boss._baseSpeed * 0.8;
                d.y += Math.sin(da) * boss._baseSpeed * 0.8;
                d.x  = Math.max(30, Math.min(arena.width  - 30, d.x));
                d.y  = Math.max(30, Math.min(arena.height - 30, d.y));
                if (--d.fireTimer <= 0) {
                    const fa = Math.atan2(tgt.y - d.y, tgt.x - d.x);
                    projectiles.push(new Projectile(d.x, d.y,
                        { x: Math.cos(fa) * 7, y: Math.sin(fa) * 7 },
                        boss.damage * 0.4, '#ff00ff', 7, 'enemy', 0, true));
                    d.fireTimer = 55;
                }
                return d.life > 0;
            });
        },

        draw(ctx, boss) {
            const t   = Date.now();
            const r   = boss.radius;

            // Draw decoys first
            boss._decoys.forEach(d => {
                ctx.save();
                ctx.translate(d.x, d.y);
                ctx.globalAlpha = 0.28;
                const triPath = () => {
                    ctx.beginPath(); ctx.moveTo(r, 0);
                    for (let i = 1; i <= 3; i++) ctx.lineTo(r * Math.cos(i * 2 * Math.PI / 3), r * Math.sin(i * 2 * Math.PI / 3));
                    ctx.closePath();
                };
                triPath(); ctx.fillStyle = '#ff00ff'; ctx.fill();
                ctx.restore();
            });

            ctx.save();
            ctx.translate(boss.x, boss.y);

            // Flicker
            const flicker = (Math.sin(t * 0.07) > 0.15) ? 1 : (Math.random() > 0.45 ? 0.6 : 1);
            ctx.globalAlpha = flicker;

            // Triangle path helper
            const triPath = () => {
                ctx.beginPath(); ctx.moveTo(r, 0);
                for (let i = 1; i <= 3; i++) ctx.lineTo(r * Math.cos(i * 2 * Math.PI / 3), r * Math.sin(i * 2 * Math.PI / 3));
                ctx.closePath();
            };

            // Chromatic aberration layers
            const abDist = boss.phase === 3 ? 6 : 3;
            [
                { dx: -abDist, dy:  abDist * 0.5, color: `rgba(255, 0, 200, 0.55)` },
                { dx:  abDist, dy: -abDist * 0.5, color: `rgba(0, 255, 255, 0.40)` },
                { dx:  0,      dy:  0,             color: `rgba(255, 0, 255, 0.88)` },
            ].forEach(a => {
                ctx.save(); ctx.translate(a.dx, a.dy);
                triPath(); ctx.fillStyle = a.color; ctx.fill();
                ctx.restore();
            });

            // Random scanline glitch bars (more in phase 3)
            const barCount = boss.phase === 3 ? 3 : 1;
            for (let b = 0; b < barCount; b++) {
                if (Math.random() < 0.35) {
                    const barY = (Math.random() - 0.5) * r * 1.8;
                    ctx.fillStyle = 'rgba(255, 0, 255, 0.18)';
                    ctx.fillRect(-r * 1.2, barY, r * 2.4, 3 + Math.random() * 5);
                }
            }

            // Outline
            triPath();
            ctx.strokeStyle = boss.phase === 3 ? '#ffffff' : '#ff00ff';
            ctx.lineWidth = boss.phase === 3 ? 3 : 2;
            ctx.shadowColor = '#ff00ff'; ctx.shadowBlur = 10;
            ctx.stroke(); ctx.shadowBlur = 0;

            // Label — glitches between BOSS and ERROR in phase 3
            ctx.globalAlpha = 1;
            ctx.fillStyle = '#ffffff';
            ctx.shadowColor = '#ff00ff'; ctx.shadowBlur = 8;
            ctx.font = `bold ${Math.floor(r * 0.28)}px monospace`;
            ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
            const label = (boss.phase === 3 && Math.random() < 0.12) ? 'ERR0R' : 'BOSS';
            ctx.fillText(label, 0, r * 0.08);
            ctx.shadowBlur = 0;

            ctx.globalAlpha = 1;
            ctx.restore();
        },
    };

    // ── ENTROPY LORD ─────────────────────────────────────────────────────────
    window._DLC_BOSS_REGISTRY['ENTROPY_LORD'] = {

        init(boss) {
            boss.name            = 'Entropy Lord';
            boss.color           = '#6c3483';
            boss.radius          = 82;
            boss.maxHp          *= 3.0;
            boss.hp              = boss.maxHp;
            boss.damage         *= 1.5;
            boss.speed          *= 1.1;
            boss.knockbackResist = 0.85;
            boss.phase           = 1;

            boss._spreadTimer  = 100;
            boss._surgeTimer   = 420;   // entropy surge nova
            boss._teleTimer    = 350;
            boss._summonTimer  = 480;
            boss._stormTimer   = 0;     // phase 3 chaos storm
            boss._shieldAngle  = 0;
            boss._orbitAngle   = 0;
        },

        update(boss, player, arena) {
            const tgt  = (typeof getCoopTarget === 'function') ? getCoopTarget(boss.x, boss.y) : player;
            const dist = Math.hypot(tgt.x - boss.x, tgt.y - boss.y);

            // Phase transitions
            if (boss.phase === 1 && boss.hp <= boss.maxHp * 0.6) {
                boss.phase = 2;
                boss._spreadTimer = 70;
                boss._summonTimer = 300;
                if (typeof audioManager !== 'undefined') audioManager.play('entropy_phase2_transition');
                createExplosion(boss.x, boss.y, '#e74c3c');
                createExplosion(boss.x, boss.y, '#9b59b6');
                this._entropySurge(boss); // immediate nova at transition
                if (typeof showNotification === 'function') showNotification('ENTROPY ACCELERATES!');
            }
            if (boss.phase === 2 && boss.hp <= boss.maxHp * 0.3) {
                boss.phase = 3;
                boss.speed      *= 1.35;
                boss._summonTimer = 180;
                boss._spreadTimer = 50;
                if (typeof audioManager !== 'undefined') audioManager.play('entropy_phase3_transition');
                this._entropySurge(boss);
                createExplosion(boss.x, boss.y, '#ff0000');
                createExplosion(boss.x, boss.y, '#8e44ad');
                if (typeof showNotification === 'function') showNotification('TOTAL ENTROPY!');
            }

            // Shield rotation (faster each phase)
            const shieldSpeed = boss.phase === 3 ? 0.10 : boss.phase === 2 ? 0.07 : 0.045;
            boss._shieldAngle += shieldSpeed;

            // Orbital shield damage
            const orbs        = boss.phase === 3 ? 5 : boss.phase === 2 ? 4 : 3;
            const shieldRadius = boss.radius + 32;
            for (let i = 0; i < orbs; i++) {
                const a  = boss._shieldAngle + (i * Math.PI * 2 / orbs);
                const sx = boss.x + Math.cos(a) * shieldRadius;
                const sy = boss.y + Math.sin(a) * shieldRadius;
                if (typeof player !== 'undefined') {
                    const targets = (typeof getCoopTarget === 'function' && window.player2 && !window.player2.isDead)
                        ? [player, window.player2] : [player];
                    targets.forEach(p => {
                        if (p.isDead) return;
                        if (Math.hypot(p.x - sx, p.y - sy) < 22 && p.invulnTimer <= 0) {
                            if (typeof p.takeDamage === 'function') p.takeDamage(boss.damage * 0.15);
                            const pa = Math.atan2(p.y - sy, p.x - sx);
                            p.x += Math.cos(pa) * 18; p.y += Math.sin(pa) * 18;
                            if (typeof audioManager !== 'undefined') audioManager.play('shield_orb_hit');
                            createExplosion(sx, sy, '#8e44ad');
                        }
                    });
                }
            }

            // Teleport away when player is too close
            if (--boss._teleTimer <= 0 || (dist < 120 && boss._teleTimer < 280)) {
                boss._teleTimer = boss.phase === 3 ? 200 : 300 + Math.random() * 80;
                if (typeof audioManager !== 'undefined') audioManager.play('entropy_teleport');
                createExplosion(boss.x, boss.y, '#6c3483');
                const ta = Math.random() * Math.PI * 2;
                const td = 280 + Math.random() * 180;
                boss.x = Math.max(boss.radius, Math.min(arena.width  - boss.radius, tgt.x + Math.cos(ta) * td));
                boss.y = Math.max(boss.radius, Math.min(arena.height - boss.radius, tgt.y + Math.sin(ta) * td));
                createExplosion(boss.x, boss.y, '#e8b4ff');
                boss._spreadTimer = Math.min(boss._spreadTimer, 20); // fire immediately after
            }

            // Movement — orbit at medium range
            boss._orbitAngle += 0.014;
            const preferDist = 380;
            if (dist > preferDist + 100) {
                const ma = Math.atan2(tgt.y - boss.y, tgt.x - boss.x);
                const mx = boss.x + Math.cos(ma) * boss.speed;
                const my = boss.y + Math.sin(ma) * boss.speed;
                if (!arena.checkCollision(mx, my, boss.radius))          { boss.x = mx; boss.y = my; }
                else if (!arena.checkCollision(mx, boss.y, boss.radius)) { boss.x = mx; }
                else if (!arena.checkCollision(boss.x, my, boss.radius)) { boss.y = my; }
            } else if (dist < preferDist - 100) {
                const ma = Math.atan2(tgt.y - boss.y, tgt.x - boss.x);
                const mx = boss.x - Math.cos(ma) * boss.speed;
                const my = boss.y - Math.sin(ma) * boss.speed;
                if (!arena.checkCollision(mx, my, boss.radius))          { boss.x = mx; boss.y = my; }
                else if (!arena.checkCollision(mx, boss.y, boss.radius)) { boss.x = mx; }
                else if (!arena.checkCollision(boss.x, my, boss.radius)) { boss.y = my; }
            } else {
                const ma = Math.atan2(tgt.y - boss.y, tgt.x - boss.x);
                const sx = boss.x + Math.cos(ma + Math.PI / 2) * boss.speed * 0.9;
                const sy = boss.y + Math.sin(ma + Math.PI / 2) * boss.speed * 0.9;
                if (!arena.checkCollision(sx, sy, boss.radius))          { boss.x = sx; boss.y = sy; }
            }

            // Chaos spread shots
            if (--boss._spreadTimer <= 0) {
                boss._spreadTimer = boss.phase === 3 ? 50 : boss.phase === 2 ? 70 : 100;
                this._chaosSpread(boss, tgt);
            }

            // Entropy surge nova
            if (--boss._surgeTimer <= 0) {
                boss._surgeTimer = boss.phase === 3 ? 240 : boss.phase === 2 ? 320 : 420;
                this._entropySurge(boss);
            }

            // Summon GLITCH enemies
            if (--boss._summonTimer <= 0) {
                boss._summonTimer = boss.phase === 3 ? 180 : boss.phase === 2 ? 300 : 480;
                if (typeof enemies !== 'undefined') {
                    const minion = new Enemy(false, 'GLITCH');
                    minion.x = boss.x + (Math.random() - 0.5) * 120;
                    minion.y = boss.y + (Math.random() - 0.5) * 120;
                    enemies.push(minion);
                    createExplosion(minion.x, minion.y, '#00ff00');
                }
            }

            // Chaos storm (phase 3, every 4s)
            if (boss.phase === 3 && --boss._stormTimer <= 0) {
                boss._stormTimer = 240;
                this._chaosStorm(boss);
            }

            boss.x = Math.max(boss.radius, Math.min(arena.width  - boss.radius, boss.x));
            boss.y = Math.max(boss.radius, Math.min(arena.height - boss.radius, boss.y));
        },

        _chaosSpread(boss, tgt) {
            const a    = Math.atan2(tgt.y - boss.y, tgt.x - boss.x);
            const cols = ['#9b59b6', '#e74c3c', '#3498db'];
            const shots = boss.phase === 3 ? 5 : boss.phase === 2 ? 4 : 3;
            for (let i = 0; i < shots; i++) {
                const sp = (i - Math.floor(shots / 2)) * 0.22;
                const col = cols[i % cols.length];
                projectiles.push(new Projectile(boss.x, boss.y,
                    { x: Math.cos(a + sp) * 9, y: Math.sin(a + sp) * 9 },
                    boss.damage * 0.75, col, 9, 'enemy', 0, true));
            }
        },

        _entropySurge(boss) {
            const count = boss.phase === 3 ? 18 : 12;
            const cols  = ['#9b59b6', '#e74c3c', '#3498db'];
            for (let i = 0; i < count; i++) {
                const a = (Math.PI * 2 / count) * i;
                projectiles.push(new Projectile(boss.x, boss.y,
                    { x: Math.cos(a) * 5, y: Math.sin(a) * 5 },
                    boss.damage * 0.8, cols[i % cols.length], 10, 'enemy', 0, true));
            }
            createExplosion(boss.x, boss.y, '#e74c3c');
            if (typeof audioManager !== 'undefined') audioManager.play('entropy_surge');
            if (typeof showNotification === 'function') showNotification('ENTROPY SURGE!');
        },

        _chaosStorm(boss) {
            if (typeof audioManager !== 'undefined') audioManager.play('chaos_storm');
            // Three rotating volleys fired 200ms apart
            for (let v = 0; v < 3; v++) {
                setTimeout(() => {
                    if (typeof projectiles === 'undefined') return;
                    const offset = (v * Math.PI * 2 / 3) + frame * 0.04;
                    for (let i = 0; i < 8; i++) {
                        const a   = (Math.PI * 2 / 8) * i + offset;
                        const col = ['#9b59b6', '#e74c3c', '#00ffff'][v];
                        projectiles.push(new Projectile(boss.x, boss.y,
                            { x: Math.cos(a) * 7, y: Math.sin(a) * 7 },
                            boss.damage * 0.85, col, 9, 'enemy', 0, true));
                    }
                    createExplosion(boss.x, boss.y, '#e74c3c');
                }, v * 200);
            }
            if (typeof showNotification === 'function') showNotification('CHAOS STORM!');
        },

        draw(ctx, boss) {
            const t     = Date.now() / 1000;
            const pulse = 0.5 + 0.5 * Math.sin(frame * 0.05);
            const r     = boss.radius;
            const hpF   = boss.hp / boss.maxHp;

            ctx.save();
            ctx.translate(boss.x, boss.y);

            // Pulsing outer chaos aura
            ctx.beginPath(); ctx.arc(0, 0, r * (1.32 + Math.sin(t * 3) * 0.06), 0, Math.PI * 2);
            ctx.strokeStyle = `rgba(142, 68, 173, ${0.20 + Math.sin(t * 2) * 0.07})`;
            ctx.lineWidth = 5; ctx.stroke();

            // 3D body — radial gradient, shifts redder in phase 3
            const bodyHi = boss.phase === 3 ? '#c0392b' : boss.phase === 2 ? '#9b59b6' : '#8e44ad';
            const bodyMid = boss.phase === 3 ? '#8e1a1a' : '#6c3483';
            const bodyLo  = boss.phase === 3 ? '#3a0808' : '#2c0046';
            const rg = ctx.createRadialGradient(-r * 0.28, -r * 0.28, r * 0.04, 0, 0, r);
            rg.addColorStop(0,    bodyHi);
            rg.addColorStop(0.50, bodyMid);
            rg.addColorStop(1,    bodyLo);
            ctx.beginPath(); ctx.arc(0, 0, r, 0, Math.PI * 2);
            ctx.fillStyle = rg; ctx.strokeStyle = '#110022'; ctx.lineWidth = 2.5;
            ctx.fill(); ctx.stroke();

            // Counter-rotating rune rings (3 rings in phase 3)
            const ringCount = boss.phase === 3 ? 3 : 2;
            for (let ri = 0; ri < ringCount; ri++) {
                ctx.save();
                ctx.rotate(t * (ri % 2 === 0 ? 0.55 : -0.40) * (1 + ri * 0.2));
                ctx.strokeStyle = `rgba(${boss.phase === 3 ? '231,76,60' : '155,89,182'}, ${0.28 + ri * 0.06})`;
                ctx.lineWidth = 1.5; ctx.setLineDash([5 - ri, 7 + ri]);
                ctx.beginPath(); ctx.arc(0, 0, r * (0.62 + ri * 0.12), 0, Math.PI * 2); ctx.stroke();
                ctx.setLineDash([]); ctx.restore();
            }

            // Chaos eye — glowing iris that shifts color by phase
            const eyeInner = boss.phase === 3 ? '#ff4444' : '#ffffff';
            const eyeMid   = boss.phase === 3 ? '#cc0000' : '#e74c3c';
            const eyeOuter = boss.phase === 3 ? '#8e0000' : '#8e44ad';
            const eyeG = ctx.createRadialGradient(0, 0, 0, 0, 0, r * 0.22);
            eyeG.addColorStop(0,    eyeInner);
            eyeG.addColorStop(0.35, eyeMid);
            eyeG.addColorStop(1,    eyeOuter);
            ctx.beginPath(); ctx.arc(0, 0, r * 0.22, 0, Math.PI * 2);
            ctx.fillStyle = eyeG;
            ctx.shadowColor = eyeMid; ctx.shadowBlur = 16 + 8 * pulse;
            ctx.fill(); ctx.shadowBlur = 0;

            // Phase 3: fracture lines radiating from eye
            if (boss.phase === 3) {
                ctx.strokeStyle = `rgba(231, 76, 60, 0.75)`;
                ctx.lineWidth = 1.8;
                [0.4, 1.1, 1.9, 2.8, 3.6, 4.7, 5.5].forEach(a => {
                    ctx.beginPath();
                    ctx.moveTo(Math.cos(a) * r * 0.25, Math.sin(a) * r * 0.25);
                    ctx.lineTo(Math.cos(a) * r * 0.82, Math.sin(a) * r * 0.82);
                    ctx.stroke();
                });
            }

            // Orbital shield orbs
            const orbs        = boss.phase === 3 ? 5 : boss.phase === 2 ? 4 : 3;
            const shieldRadius = r + 30;
            for (let i = 0; i < orbs; i++) {
                const a  = (boss._shieldAngle || 0) + (i * Math.PI * 2 / orbs);
                const sx = Math.cos(a) * shieldRadius;
                const sy = Math.sin(a) * shieldRadius;
                // Ghost trails
                for (let tr = 1; tr <= 3; tr++) {
                    const ta  = a - tr * 0.15;
                    const trx = Math.cos(ta) * shieldRadius;
                    const try_ = Math.sin(ta) * shieldRadius;
                    ctx.beginPath(); ctx.arc(trx, try_, 6 - tr, 0, Math.PI * 2);
                    ctx.fillStyle = `rgba(142, 68, 173, ${0.18 - tr * 0.04})`; ctx.fill();
                }
                // Link line
                ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(sx, sy);
                ctx.strokeStyle = 'rgba(142, 68, 173, 0.18)'; ctx.lineWidth = 1.5; ctx.stroke();
                // Orb
                const og = ctx.createRadialGradient(sx - 2, sy - 2, 1, sx, sy, 9);
                const orbCol = boss.phase === 3 ? '#ff6b6b' : '#e8b4ff';
                og.addColorStop(0, orbCol); og.addColorStop(0.5, '#9b59b6'); og.addColorStop(1, '#4a0070');
                ctx.beginPath(); ctx.arc(sx, sy, 9, 0, Math.PI * 2);
                ctx.fillStyle = og; ctx.shadowColor = '#9b59b6'; ctx.shadowBlur = 10;
                ctx.fill(); ctx.shadowBlur = 0;
                ctx.strokeStyle = 'rgba(255,255,255,0.45)'; ctx.lineWidth = 1; ctx.stroke();
            }

            // Phase 2+ warning ring
            if (hpF < 0.6) {
                const warnCol = boss.phase === 3 ? '231,76,60' : '155,89,182';
                ctx.beginPath(); ctx.arc(0, 0, r * 1.12, 0, Math.PI * 2);
                ctx.strokeStyle = `rgba(${warnCol}, ${0.42 + Math.sin(t * 7) * 0.20})`;
                ctx.lineWidth = 3.5; ctx.stroke();
            }

            ctx.restore();
        },
    };

    console.log("Champions of Chaos DLC: Void Walker Boss, Glitch Boss, and Entropy Lord registered in _DLC_BOSS_REGISTRY.");
})();
