// #194 — explicit renderer imports (was: window-shim lookup).
import { ALTAR_TREE } from '../../AltarData.js';

// Radiance of Ruin — DLC Manifest (Character Pack)
// Three heroes — Light (Gold), Thorn (Crimson), Dream (Indigo) — each with a dedicated biome.
// No story mode, no memory shards, no new music.

const RADIANCE_OF_RUIN = {
    id: 'radiance_of_ruin',
    name: "Radiance of Ruin",
    heroes: ['light', 'thorn', 'dream'],
    description: "A character pack featuring three resource-driven heroes: Light (Radiant Gold), Thorn (Crimson), and Dream (Twilight). No story campaign — drops you straight into Standard Mode.",
    noStoryMode: true,
    icon: "👁️",

    load: async function () {
        console.log("[DLC] Loading: Radiance of Ruin...");

        if (window.dlcManager) {
            await window.dlcManager.loadScript('dlc/radiance_of_ruin/LightHero.js');
            await window.dlcManager.loadScript('dlc/radiance_of_ruin/ThornHero.js');
            await window.dlcManager.loadScript('dlc/radiance_of_ruin/DreamHero.js');
            await window.dlcManager.loadScript('dlc/radiance_of_ruin/ReliquaryBiome.js');
            await window.dlcManager.loadScript('dlc/radiance_of_ruin/CrimsonGreenhouseBiome.js');
            await window.dlcManager.loadScript('dlc/radiance_of_ruin/DreamspaceBiome.js');
        }

        this.injectHero();
        this.injectBiome();
        this.injectAltar();
        this.injectAchievements();

        if (typeof audioManager !== 'undefined') {
            audioManager.registerSounds({
                // Light SFX
                'attack_light':       { path: 'dlc/radiance_of_ruin/audio/sounds/attack_light.wav',       volume: 0.4 },
                'melee_light':        { path: 'dlc/radiance_of_ruin/audio/sounds/melee_light.wav',        volume: 0.5 },
                'dash_light':         { path: 'dlc/radiance_of_ruin/audio/sounds/dash_light.wav',         volume: 0.5 },
                'special_light':      { path: 'dlc/radiance_of_ruin/audio/sounds/special_light.wav',      volume: 0.6 },
                'unveiling_activate': { path: 'dlc/radiance_of_ruin/audio/sounds/unveiling_activate.wav', volume: 0.65 },
                'civilian_collapse':  { path: 'dlc/radiance_of_ruin/audio/sounds/civilian_collapse.wav',  volume: 0.55 },
                // Thorn SFX
                'attack_thorn':       { path: 'dlc/radiance_of_ruin/audio/sounds/attack_thorn.wav',       volume: 0.4 },
                'melee_thorn':        { path: 'dlc/radiance_of_ruin/audio/sounds/melee_thorn.wav',        volume: 0.5 },
                'dash_thorn':         { path: 'dlc/radiance_of_ruin/audio/sounds/dash_thorn.wav',         volume: 0.5 },
                'special_thorn':      { path: 'dlc/radiance_of_ruin/audio/sounds/special_thorn.wav',      volume: 0.6 },
                'reckoning_activate': { path: 'dlc/radiance_of_ruin/audio/sounds/reckoning_activate.wav', volume: 0.65 },
                'lifebloom_heal':     { path: 'dlc/radiance_of_ruin/audio/sounds/lifebloom_heal.wav',     volume: 0.45 },
                // Dream SFX
                'attack_dream':       { path: 'dlc/radiance_of_ruin/audio/sounds/attack_dream.wav',       volume: 0.4 },
                'melee_dream':        { path: 'dlc/radiance_of_ruin/audio/sounds/melee_dream.wav',        volume: 0.5 },
                'dash_dream':         { path: 'dlc/radiance_of_ruin/audio/sounds/dash_dream.wav',         volume: 0.5 },
                'special_dream':      { path: 'dlc/radiance_of_ruin/audio/sounds/special_dream.wav',      volume: 0.6 },
                'long_sleep_activate':{ path: 'dlc/radiance_of_ruin/audio/sounds/long_sleep_activate.wav',volume: 0.65 },
                'lucid_step_phase':   { path: 'dlc/radiance_of_ruin/audio/sounds/lucid_step_phase.wav',   volume: 0.55 }
            });

            // Voice exclamation paths
            audioManager.registerExclamationPath('light', (s) => `dlc/radiance_of_ruin/audio/voices/light/${s}.mp3`);
            audioManager.registerExclamationPath('thorn', (s) => `dlc/radiance_of_ruin/audio/voices/thorn/${s}.mp3`);
            audioManager.registerExclamationPath('dream', (s) => `dlc/radiance_of_ruin/audio/voices/dream/${s}.mp3`);

            // Subtitle texts
            audioManager.registerExclamationTexts('light', {
                injured:       "The Mask hurts when it remembers me.",
                failure_1:     "Mar... bles. Marbles, my cat's name was...",
                failure_2:     "The light. It was supposed to *protect*.",
                twin_event:    "Two of you. Good. I see twice as clearly.",
                boss_moment_1: "You think the dark hides you. I am the morning.",
                boss_moment_2: "Stand still. I want to see you.",
                boss_win_1:    "Revealed. Resolved. Returned.",
                boss_win_2:    "I told you the Mask was warm.",
                found_1:       "It feeds the Mask. The Mask feeds me.",
                found_2:       "I will remember this. For a while.",
                level_up_1:    "Clearer. Brighter. Less of me left.",
                level_up_2:    "The light learns my name.",
                ultimate:      "THE UNVEILING! Let nothing be hidden from itself!"
            });
            audioManager.registerExclamationTexts('thorn', {
                injured:       "Good. The garden is hungry.",
                failure_1:     "Brother... you were right. About none of it.",
                failure_2:     "The rose was enough. It was *always* enough.",
                twin_event:    "Two of us. The garden doubles.",
                boss_moment_1: "You will feed the bloom. Willing or not.",
                boss_moment_2: "Bleed for me. I bled first.",
                boss_win_1:    "The thorn remembers it has the right to exist.",
                boss_win_2:    "Yield, harvest, repeat.",
                found_1:       "The roots will reach this.",
                found_2:       "Mine. The garden's. Same thing.",
                level_up_1:    "Deeper. The thorns go deeper.",
                level_up_2:    "The rose drinks. I grow.",
                ultimate:      "THE RECKONING! Let everything that owes me pay!"
            });
            audioManager.registerExclamationTexts('dream', {
                injured:       "The pain pulls me back. I was almost home.",
                failure_1:     "Goodnight. For now.",
                failure_2:     "I... wake.",
                twin_event:    "Two of me. One asleep, one not. As it should be.",
                boss_moment_1: "You are loud. Loud things do not last in dreams.",
                boss_moment_2: "Close your eyes. I will make this easy.",
                boss_win_1:    "There. The waking world is quieter again.",
                boss_win_2:    "Rest. You earned it.",
                found_1:       "A souvenir. I'll keep it on this side.",
                found_2:       "Useful. In either world.",
                level_up_1:    "The dream remembers me.",
                level_up_2:    "More room in the threshold.",
                ultimate:      "THE LONG SLEEP. Lie down. All of you. Lie down."
            });
        }

        console.log("[DLC] Loaded: Radiance of Ruin (Success)");
    },

    injectHero: function () {
        // Hero stats register in their own files (BASE_HERO_STATS['light'|'thorn'|'dream']).
        // HERO_LOGIC maps register in the same files.
        console.log("Radiance of Ruin: 3 heroes registered (light, thorn, dream).");
    },

    injectBiome: function () {
        // Biomes register via window.BIOME_LOGIC['light'|'thorn'|'dream'] in their own files.
        // Wave.js DLC_BIOMES adds 'light','thorn','dream' so they roll in standard biome pool.
        console.log("Radiance of Ruin: 3 biomes registered.");
    },

    injectAltar: function () {
        if (typeof ALTAR_TREE === 'undefined') return;

        ALTAR_TREE['light'] = [
            { id: 'lt1', req: 1, type: 'stat',   stat: 'cooldown',         val: 0.9,  desc: 'Cooldowns -10%' },
            { id: 'lt2', req: 3, type: 'stat',   stat: 'integrityCostMult', val: 0.85, desc: 'Ability Integrity Costs -15%' },
            { id: 'lt3', req: 5, type: 'unique', desc: 'Solar Crown: Revelation reveal radius +50%, duration +5s' }
        ];

        ALTAR_TREE['thorn'] = [
            { id: 'th1', req: 1, type: 'stat',   stat: 'cooldown',     val: 0.9,  desc: 'Cooldowns -10%' },
            { id: 'th2', req: 3, type: 'stat',   stat: 'bleedDmgMult', val: 1.25, desc: 'Bleed DPS +25%' },
            { id: 'th3', req: 5, type: 'unique', desc: 'Endless Bloom: Crimson Garden lasts +50%, heal rate doubled' }
        ];

        ALTAR_TREE['dream'] = [
            { id: 'dr1', req: 1, type: 'stat',   stat: 'cooldown',           val: 0.9,  desc: 'Cooldowns -10%' },
            { id: 'dr2', req: 3, type: 'stat',   stat: 'dreamscapeRadiusMult', val: 1.25, desc: 'Dreamscape Radius +25%' },
            { id: 'dr3', req: 5, type: 'unique', desc: 'Sleepwalker: Lucid Step regen +5 HP/sec, phase +1s' }
        ];

        // ── CONVERGENCES ──────────────────────────────────────────────
        // Prefix `cv_ror_` to avoid collisions with all prior DLC convergences.
        // Each Ruin hero pairs with every other hero in the convergence pool.
        const ruinMutations = [
            // Light convergences — full roster
            { id: 'cv_ror_lit_fire',      req: { light: 5, fire: 5 },      type: 'mutation', name: 'Solar Forge',       desc: 'Aurum Burn trail also applies Fire DoT (3 dmg/sec).' },
            { id: 'cv_ror_lit_water',     req: { light: 5, water: 5 },     type: 'mutation', name: 'Tidewash',          desc: 'Tidal Wave applies Revealed to all hit enemies for 5s.' },
            { id: 'cv_ror_lit_ice',       req: { light: 5, ice: 5 },       type: 'mutation', name: 'Crystal Mirror',    desc: 'Revelation freezes revealed enemies for 1s.' },
            { id: 'cv_ror_lit_plant',     req: { light: 5, plant: 5 },     type: 'mutation', name: 'Sanctified Grove',  desc: 'Overgrowth turrets deal +30% damage to Revealed enemies.' },
            { id: 'cv_ror_lit_metal',     req: { light: 5, metal: 5 },     type: 'mutation', name: 'Gilded Plate',      desc: 'Civilian Form duration -2s and HP cap +15.' },
            { id: 'cv_ror_lit_earth',     req: { light: 5, earth: 5 },     type: 'mutation', name: 'Gilded Quarry',     desc: 'Tremor radius +25% while Revelation is active.' },
            { id: 'cv_ror_lit_lightning', req: { light: 5, lightning: 5 }, type: 'mutation', name: 'Heliokeraunos',     desc: 'Storm bolts deal +50% damage to Revealed enemies.' },
            { id: 'cv_ror_lit_gravity',   req: { light: 5, gravity: 5 },   type: 'mutation', name: 'Singular Glow',     desc: 'Black Hole pulls Revealed enemies at 2x force.' },
            { id: 'cv_ror_lit_void',      req: { light: 5, void: 5 },      type: 'mutation', name: 'Eclipse',           desc: 'Enemies that are both Glitched and Revealed take +40% damage.' },
            { id: 'cv_ror_lit_air',       req: { light: 5, air: 5 },       type: 'mutation', name: 'Solar Gale',        desc: 'TORNADO applies Revealed to every enemy it catches.' },
            { id: 'cv_ror_lit_spirit',    req: { light: 5, spirit: 5 },    type: 'mutation', name: 'Inner Light',       desc: 'Enlightened aura also applies Revealed on hit.' },
            { id: 'cv_ror_lit_chance',    req: { light: 5, chance: 5 },    type: 'mutation', name: 'Lucky Ray',         desc: 'Slot Machine rolls one tier better while Revelation is active.' },
            { id: 'cv_ror_lit_sound',     req: { light: 5, sound: 5 },     type: 'mutation', name: 'Hymn of Light',     desc: 'Crescendo applies Revealed to all hit enemies.' },
            { id: 'cv_ror_lit_poison',    req: { light: 5, poison: 5 },    type: 'mutation', name: 'Sun-Brewed Toxin',  desc: 'Flask effects apply Revealed for 3s to hit enemies.' },
            { id: 'cv_ror_lit_time',      req: { light: 5, time: 5 },      type: 'mutation', name: 'Eternal Mask',      desc: 'Chrono Strike refunds 5 Integrity per enemy hit.' },
            { id: 'cv_ror_lit_love',      req: { light: 5, love: 5 },      type: 'mutation', name: 'Devoted Mask',      desc: 'Love Companion heals you for 5 HP per Revelation cast.' },
            { id: 'cv_ror_lit_psycho',    req: { light: 5, psycho: 5 },    type: 'mutation', name: 'Revealing Mind',    desc: 'Revelation confuses revealed enemies for the full duration.' },
            { id: 'cv_ror_lit_mirror',    req: { light: 5, mirror: 5 },    type: 'mutation', name: 'Refracted Aurum',   desc: 'Reflected projectiles apply Revealed for 3s to whatever they hit.' },
            { id: 'cv_ror_lit_smoke',     req: { light: 5, smoke: 5 },     type: 'mutation', name: 'Spotlight',         desc: 'Smoke clouds inside Revelation glow gold, revealing enemies that enter them.' },

            // Thorn convergences — full roster
            { id: 'cv_ror_thr_fire',      req: { thorn: 5, fire: 5 },      type: 'mutation', name: 'Char-Bloom',        desc: 'Bleeding enemies also burn for 3 DPS.' },
            { id: 'cv_ror_thr_water',     req: { thorn: 5, water: 5 },     type: 'mutation', name: 'Blood Tide',        desc: 'Tidal Wave applies 2 Bleed stacks to enemies it hits.' },
            { id: 'cv_ror_thr_ice',       req: { thorn: 5, ice: 5 },       type: 'mutation', name: 'Frozen Sap',        desc: 'Enemies at max Bleed stacks Freeze for 1s.' },
            { id: 'cv_ror_thr_plant',     req: { thorn: 5, plant: 5 },     type: 'mutation', name: 'Carnivorous Bloom', desc: 'Crimson Garden radius +50%; heal scales to 75%.' },
            { id: 'cv_ror_thr_metal',     req: { thorn: 5, metal: 5 },     type: 'mutation', name: 'Iron Thorn',        desc: 'Iron Will recovers +1 HP per Bleed stack on hit enemies.' },
            { id: 'cv_ror_thr_earth',     req: { thorn: 5, earth: 5 },     type: 'mutation', name: 'Iron Bramble',      desc: 'The Reckoning grants 50% damage reduction while active.' },
            { id: 'cv_ror_thr_lightning', req: { thorn: 5, lightning: 5 }, type: 'mutation', name: 'Galvanic Vein',     desc: 'Bleeding enemies arc lightning to the nearest enemy (50% chain damage).' },
            { id: 'cv_ror_thr_gravity',   req: { thorn: 5, gravity: 5 },   type: 'mutation', name: 'Gravewell',         desc: 'Bleeding enemies are pulled into Black Hole at 2x force.' },
            { id: 'cv_ror_thr_void',      req: { thorn: 5, void: 5 },      type: 'mutation', name: 'Hemorrhagic Glitch',desc: 'Glitched enemies bleed for 2 extra stacks per second.' },
            { id: 'cv_ror_thr_air',       req: { thorn: 5, air: 5 },       type: 'mutation', name: 'Thornstorm',        desc: 'TORNADO drags a Crimson Garden trail across the arena.' },
            { id: 'cv_ror_thr_spirit',    req: { thorn: 5, spirit: 5 },    type: 'mutation', name: 'Blood Discipline',  desc: 'Mantra damage +50% when paid in HP (1 HP per shot, no Peace cost).' },
            { id: 'cv_ror_thr_chance',    req: { thorn: 5, chance: 5 },    type: 'mutation', name: 'Lucky Reap',        desc: 'Lifebloom heal has a 25% chance to double.' },
            { id: 'cv_ror_thr_sound',     req: { thorn: 5, sound: 5 },     type: 'mutation', name: 'Resonant Bleed',    desc: 'Resonating enemies take +25% Bleed DPS.' },
            { id: 'cv_ror_thr_poison',    req: { thorn: 5, poison: 5 },    type: 'mutation', name: 'Septic Thorn',      desc: 'Bleed stacks also apply Poison DoT (3 dmg/sec).' },
            { id: 'cv_ror_thr_time',      req: { thorn: 5, time: 5 },      type: 'mutation', name: 'Slow Hemorrhage',   desc: 'Bleed duration +2s.' },
            { id: 'cv_ror_thr_love',      req: { thorn: 5, love: 5 },      type: 'mutation', name: 'Sacrificial Bond',  desc: 'Love Companion damage +50% while you are below 30% HP.' },
            { id: 'cv_ror_thr_psycho',    req: { thorn: 5, psycho: 5 },    type: 'mutation', name: 'Bleeding Mind',     desc: 'Confused enemies bleed automatically (1 stack/sec).' },
            { id: 'cv_ror_thr_mirror',    req: { thorn: 5, mirror: 5 },    type: 'mutation', name: 'Reflected Wound',   desc: 'Reflected projectiles apply 1 Bleed stack to whatever they hit.' },
            { id: 'cv_ror_thr_smoke',     req: { thorn: 5, smoke: 5 },     type: 'mutation', name: 'Hemoglobin Veil',   desc: 'Smoke clouds inside Crimson Garden tick Bleed (1 stack/sec).' },

            // Dream convergences — full roster
            { id: 'cv_ror_drm_fire',      req: { dream: 5, fire: 5 },      type: 'mutation', name: 'Burning Dreams',    desc: 'Drowsy enemies take +50% Fire damage.' },
            { id: 'cv_ror_drm_water',     req: { dream: 5, water: 5 },     type: 'mutation', name: 'Tidedream',         desc: 'Tidal Wave applies 2 Drowsy stacks to hit enemies.' },
            { id: 'cv_ror_drm_ice',       req: { dream: 5, ice: 5 },       type: 'mutation', name: 'Frostlull',         desc: 'Frozen enemies are Drowsy when they thaw.' },
            { id: 'cv_ror_drm_plant',     req: { dream: 5, plant: 5 },     type: 'mutation', name: 'Slumberbloom',      desc: 'Overgrowth turret shots apply 1 Drowsy stack.' },
            { id: 'cv_ror_drm_metal',     req: { dream: 5, metal: 5 },     type: 'mutation', name: 'Iron Lullaby',      desc: 'Iron Will keeps nearby enemies Drowsy continuously while active.' },
            { id: 'cv_ror_drm_earth',     req: { dream: 5, earth: 5 },     type: 'mutation', name: 'Stone Sleep',       desc: 'Tremor applies 2 Drowsy stacks.' },
            { id: 'cv_ror_drm_lightning', req: { dream: 5, lightning: 5 }, type: 'mutation', name: 'Static Drowse',     desc: 'Stun chance also applies 2 Drowsy stacks.' },
            { id: 'cv_ror_drm_gravity',   req: { dream: 5, gravity: 5 },   type: 'mutation', name: 'Gravity Lull',      desc: 'Enemies absorbed by Black Hole are Drowsy on absorb (refunds 5 Lucidity).' },
            { id: 'cv_ror_drm_void',      req: { dream: 5, void: 5 },      type: 'mutation', name: 'Voidstep',          desc: 'Lucid Step usable twice per wave.' },
            { id: 'cv_ror_drm_air',       req: { dream: 5, air: 5 },       type: 'mutation', name: 'Sky Walker',        desc: 'Dreamscape grants allies inside +25% speed.' },
            { id: 'cv_ror_drm_spirit',    req: { dream: 5, spirit: 5 },    type: 'mutation', name: 'Meditative Veil',   desc: 'Lucidity regen +0.5/sec while Enlightened.' },
            { id: 'cv_ror_drm_chance',    req: { dream: 5, chance: 5 },    type: 'mutation', name: 'Lucky Dream',       desc: 'Slot Machine costs no Lucidity while inside Dreamscape.' },
            { id: 'cv_ror_drm_sound',     req: { dream: 5, sound: 5 },     type: 'mutation', name: 'Lullaby',           desc: 'Crescendo refreshes Drowsy on hit.' },
            { id: 'cv_ror_drm_poison',    req: { dream: 5, poison: 5 },    type: 'mutation', name: 'Sleeper Brew',      desc: 'Drowsy enemies take +50% Poison DoT.' },
            { id: 'cv_ror_drm_time',      req: { dream: 5, time: 5 },      type: 'mutation', name: 'Slow Dream',        desc: 'The Long Sleep duration +3s; execute window +3s.' },
            { id: 'cv_ror_drm_love',      req: { dream: 5, love: 5 },      type: 'mutation', name: 'Dream Bond',        desc: 'Love Companion regenerates +1 Lucidity/sec for you.' },
            { id: 'cv_ror_drm_psycho',    req: { dream: 5, psycho: 5 },    type: 'mutation', name: 'Lucid Madness',     desc: 'Confused enemies count as Drowsy for all effects.' },
            { id: 'cv_ror_drm_mirror',    req: { dream: 5, mirror: 5 },    type: 'mutation', name: 'Mirror Sleep',      desc: 'Each reflected projectile grants +5 Lucidity.' },
            { id: 'cv_ror_drm_smoke',     req: { dream: 5, smoke: 5 },     type: 'mutation', name: 'Twilight Veil',     desc: 'Enemies inside smoke clouds gain 2 Drowsy stacks per second.' },

            // Intra-Ruin pairings
            { id: 'cv_ror_lit_thr',       req: { light: 5, thorn: 5 },     type: 'mutation', name: 'Crowned Garden',    desc: 'Crimson Garden centered inside Revelation auto-applies Revealed to every enemy that enters.' },
            { id: 'cv_ror_lit_drm',       req: { light: 5, dream: 5 },     type: 'mutation', name: 'Lucid Halo',        desc: 'Revelation may be paid in Lucidity instead of Integrity.' },
            { id: 'cv_ror_thr_drm',       req: { thorn: 5, dream: 5 },     type: 'mutation', name: 'Bleeding Sleep',    desc: 'Drowsy enemies bleed automatically (1 stack/sec).' },

            // Pack-wide trio
            { id: 'cv_ror_trio',          req: { light: 5, thorn: 5, dream: 5 }, type: 'mutation', name: 'Radiance of Ruin', desc: 'Revealed, Bleeding, or Drowsy enemies take +20% damage from all sources.' }
        ];

        if (ALTAR_TREE.convergence) {
            ruinMutations.forEach(m => {
                if (!ALTAR_TREE.convergence.find(ex => ex.id === m.id)) {
                    ALTAR_TREE.convergence.push(m);
                }
            });
        }

        console.log(`Radiance of Ruin: Altar Skills Injected (3 hero trees + ${ruinMutations.length} convergences).`);
    },

    injectAchievements: function () {
        const achievements = window.ACHIEVEMENTS || (typeof ACHIEVEMENTS !== 'undefined' ? ACHIEVEMENTS : null);
        if (!achievements) return;

        const addDLCAch = (id, title, desc, req, stat, type, val, text) => {
            if (!achievements.some(a => a.id === id)) {
                achievements.push({ id, title, desc, req, stat, bonus: { type, val, text } });
            }
        };

        // Light
        addDLCAch('ror_light_reveal',  'Nothing Hidden',  'Reveal 200 enemies with Revelation.',         200, 'light_reveal_count', 'damage', 0.05, '+5% Dmg');
        addDLCAch('ror_light_reach30', 'Mask Bearer',     'Reach Wave 30 with Light.',                    30, 'light_max_wave',     'speed',  0.05, '+5% Speed');
        addDLCAch('ror_light_biome',   'Light the Vault', 'Survive 10 waves in the Reliquary biome.',     10, 'light_biome_waves',  'damage', 0.03, '+3% Dmg');

        // Thorn
        addDLCAch('ror_thorn_bleed',   'Bleed the Garden',  'Apply 500 Bleed stacks total.',            500, 'thorn_bleed_applied','damage', 0.05, '+5% Dmg');
        addDLCAch('ror_thorn_reach30', 'Thornbound',        'Reach Wave 30 with Thorn.',                 30, 'thorn_max_wave',     'defense',0.05, '+5% Def');
        addDLCAch('ror_thorn_biome',   'Greenhouse Crown',  'Survive 10 waves in the Crimson Greenhouse biome.', 10, 'thorn_biome_waves','defense', 0.03, '+3% Def');

        // Dream
        addDLCAch('ror_dream_pocket',  'Threshold Walker',  'Cast Dreamscape 50 times.',                  50, 'dream_dreamscape_count', 'speed',  0.05, '+5% Speed');
        addDLCAch('ror_dream_reach30', 'The Long Visit',    'Reach Wave 30 with Dream.',                  30, 'dream_max_wave',         'xp',     0.05, '+5% XP');
        addDLCAch('ror_dream_biome',   'Beneath Waking',    'Survive 10 waves in the Dreamspace biome.',  10, 'dream_biome_waves',      'speed',  0.03, '+3% Speed');

        // Pack-wide
        addDLCAch('ror_pack_all',      'Radiance of Ruin',  'Reach Wave 20 with all 3 DLC heroes.',        1, 'ror_pack_complete',     'damage', 0.03, '+3% all stats');
    }
};

// Register
if (!window.DLC_REGISTRY) window.DLC_REGISTRY = {};
window.DLC_REGISTRY['radiance_of_ruin'] = RADIANCE_OF_RUIN;
