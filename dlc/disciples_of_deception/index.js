// The Disciples of Deception - DLC Manifest (Character Pack)
// Adds three heroes — Psycho (Teal), Mirror (Marine Blue), Smoke (Slate Gray) —
// each with a dedicated biome. No story mode, no memory shards, no new music.

const DISCIPLES_OF_DECEPTION = {
    id: 'disciples_of_deception',
    name: "Disciples of Deception",
    heroes: ['psycho', 'mirror', 'smoke'],
    description: "A character pack featuring three deception-themed heroes: Psycho (Teal), Mirror (Marine Blue), and Smoke (Slate Gray). No story campaign — drops you straight into Standard Mode.",
    noStoryMode: true, // Flag: no Story.js / no story-mode unlock chapters
    icon: "🎭",

    load: async function () {
        console.log("[DLC] Loading: Disciples of Deception...");

        if (window.dlcManager) {
            await window.dlcManager.loadScript('dlc/disciples_of_deception/PsychoHero.js');
            await window.dlcManager.loadScript('dlc/disciples_of_deception/MirrorHero.js');
            await window.dlcManager.loadScript('dlc/disciples_of_deception/SmokeHero.js');
            await window.dlcManager.loadScript('dlc/disciples_of_deception/MindscapeBiome.js');
            await window.dlcManager.loadScript('dlc/disciples_of_deception/HallOfMirrorsBiome.js');
            await window.dlcManager.loadScript('dlc/disciples_of_deception/SmogQuarterBiome.js');
        }

        this.injectHero();
        this.injectBiome();
        this.injectAltar();
        this.injectAchievements();

        if (typeof audioManager !== 'undefined') {
            audioManager.registerSounds({
                // Psycho SFX
                'attack_psycho':     { path: 'dlc/disciples_of_deception/audio/sounds/attack_psycho.wav',     volume: 0.4 },
                'melee_psycho':      { path: 'dlc/disciples_of_deception/audio/sounds/melee_psycho.wav',      volume: 0.5 },
                'dash_psycho':       { path: 'dlc/disciples_of_deception/audio/sounds/dash_psycho.wav',       volume: 0.5 },
                'special_psycho':    { path: 'dlc/disciples_of_deception/audio/sounds/special_psycho.wav',    volume: 0.6 },
                'hysteria_activate': { path: 'dlc/disciples_of_deception/audio/sounds/hysteria_activate.wav', volume: 0.6 },
                // Mirror SFX
                'attack_mirror':     { path: 'dlc/disciples_of_deception/audio/sounds/attack_mirror.wav',     volume: 0.4 },
                'melee_mirror':      { path: 'dlc/disciples_of_deception/audio/sounds/melee_mirror.wav',      volume: 0.5 },
                'dash_mirror':       { path: 'dlc/disciples_of_deception/audio/sounds/dash_mirror.wav',       volume: 0.5 },
                'special_mirror':    { path: 'dlc/disciples_of_deception/audio/sounds/special_mirror.wav',    volume: 0.6 },
                'shield_activate':   { path: 'dlc/disciples_of_deception/audio/sounds/shield_activate.wav',   volume: 0.55 },
                'shield_reflect':    { path: 'dlc/disciples_of_deception/audio/sounds/shield_reflect.wav',    volume: 0.5 },
                // Smoke SFX
                'attack_smoke':      { path: 'dlc/disciples_of_deception/audio/sounds/attack_smoke.wav',      volume: 0.4 },
                'melee_smoke':       { path: 'dlc/disciples_of_deception/audio/sounds/melee_smoke.wav',       volume: 0.5 },
                'dash_smoke':        { path: 'dlc/disciples_of_deception/audio/sounds/dash_smoke.wav',        volume: 0.5 },
                'special_smoke':     { path: 'dlc/disciples_of_deception/audio/sounds/special_smoke.wav',     volume: 0.6 }
            });

            // Voice exclamations
            audioManager.registerExclamationPath('psycho', (s) => `dlc/disciples_of_deception/audio/voices/psycho/${s}.mp3`);
            audioManager.registerExclamationPath('mirror', (s) => `dlc/disciples_of_deception/audio/voices/mirror/${s}.mp3`);
            audioManager.registerExclamationPath('smoke',  (s) => `dlc/disciples_of_deception/audio/voices/smoke/${s}.mp3`);
        }

        console.log("[DLC] Loaded: Disciples of Deception (Success)");
    },

    injectHero: function () {
        // Hero stats are registered by each hero file (PsychoHero.js, MirrorHero.js, SmokeHero.js).
        // Versus Mode and Online Lobby auto-discover heroes from BASE_HERO_STATS.
        console.log("Disciples of Deception: 3 heroes registered (psycho, mirror, smoke).");
    },

    injectBiome: function () {
        // Biomes register via window.BIOME_LOGIC['psycho'|'mirror'|'smoke'] in their own files.
        // game.js advanceWave() reads dlcBiomes array — keys 'psycho','mirror','smoke' added there.
        console.log("Disciples of Deception: 3 biomes registered.");
    },

    injectAltar: function () {
        if (typeof ALTAR_TREE !== 'undefined') {
            ALTAR_TREE['psycho'] = [
                { id: 'p1', req: 1, type: 'stat', stat: 'cooldown',         val: 0.9,  desc: 'Cooldowns -10%' },
                { id: 'p2', req: 3, type: 'stat', stat: 'hysteriaGainMult', val: 1.25, desc: 'Hysteria Gain +25%' },
                { id: 'p3', req: 5, type: 'unique',                                    desc: 'Bleeding Edge: Hysteria Mode also pierces all projectiles' }
            ];

            ALTAR_TREE['mirror'] = [
                { id: 'mr1', req: 1, type: 'stat', stat: 'cooldown',        val: 0.9,  desc: 'Cooldowns -10%' },
                { id: 'mr2', req: 3, type: 'stat', stat: 'reflectDmgMult',  val: 0.25, desc: 'Reflect Damage +25%' },
                { id: 'mr3', req: 5, type: 'unique',                                   desc: 'Glasshouse: Mirror Shield duration +50%' }
            ];

            ALTAR_TREE['smoke'] = [
                { id: 'sm1', req: 1, type: 'stat', stat: 'cooldown',      val: 0.9,  desc: 'Cooldowns -10%' },
                { id: 'sm2', req: 3, type: 'stat', stat: 'cloudRadius',   val: 1.25, desc: 'Smoke Cloud Radius +25%' },
                { id: 'sm3', req: 5, type: 'unique',                                 desc: 'Suffocation: Enemies in clouds take +20% damage from all sources' }
            ];

            console.log("Disciples of Deception: Altar Skills Injected.");
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

        // Psycho
        addDLCAch('dod_psycho_hysteria', 'Feedback Loop',     'Activate Hysteria 50 times.',                      50, 'psycho_hysteria_count', 'damage',   0.05, '+5% Dmg');
        addDLCAch('dod_psycho_reach30',  'Unraveling',        'Reach Wave 30 with Psycho.',                       30, 'psycho_max_wave',       'speed',    0.05, '+5% Speed');
        addDLCAch('dod_psycho_biome',    'Into the Fracture', 'Survive 10 waves in the Mindscape biome.',         10, 'psycho_biome_waves',    'damage',   0.03, '+3% Dmg');

        // Mirror
        addDLCAch('dod_mirror_reflect100','Hall of Mirrors',  'Reflect 100 projectiles total.',                  100, 'mirror_reflect_count',  'defense',  0.05, '+5% Def');
        addDLCAch('dod_mirror_reach30',   'Perfect Surface',  'Reach Wave 30 with Mirror.',                       30, 'mirror_max_wave',       'damage',   0.05, '+5% Dmg');
        addDLCAch('dod_mirror_biome',     'Shining Labyrinth','Survive 10 waves in the Hall of Mirrors biome.',   10, 'mirror_biome_waves',    'defense',  0.03, '+3% Def');

        // Smoke
        addDLCAch('dod_smoke_clouds',     'Smog City',        'Have 3 simultaneous smoke clouds 25 times.',       25, 'smoke_max_clouds_count','xp',       0.05, '+5% XP');
        addDLCAch('dod_smoke_reach30',    'Vanishing Act',    'Reach Wave 30 with Smoke.',                        30, 'smoke_max_wave',        'defense',  0.05, '+5% Def');
        addDLCAch('dod_smoke_biome',      'Lost in the Haze', 'Survive 10 waves in the Smog Quarter biome.',      10, 'smoke_biome_waves',     'speed',    0.03, '+3% Speed');

        // Pack-wide milestone
        addDLCAch('dod_pack_all',         'Disciples',        'Reach Wave 20 with all three Disciples heroes.',    1, 'dod_pack_complete',     'damage',   0.03, '+3% all stats');
    }
};

// Register
if (!window.DLC_REGISTRY) window.DLC_REGISTRY = {};
window.DLC_REGISTRY['disciples_of_deception'] = DISCIPLES_OF_DECEPTION;
