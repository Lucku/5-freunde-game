#!/usr/bin/env node
/**
 * generate_boss_sfx.js
 *
 * Generates DLC boss sound effects via the ElevenLabs Sound Generation API
 * and saves them to audio/sounds/.
 *
 * Usage:
 *   ELEVENLABS_API_KEY=your_key node scripts/generate_boss_sfx.js
 *
 * Options:
 *   --boss <name>   Only generate sounds for a specific boss (e.g. --boss mimic_king)
 *   --dry-run       Print what would be generated without calling the API
 *   --force         Regenerate even if the file already exists
 */

const fs = require('fs');
const path = require('path');
const { Readable } = require('stream');
const { ElevenLabsClient } = require('@elevenlabs/elevenlabs-js');

const API_KEY = process.env.ELEVENLABS_API_KEY;
const ROOT = path.resolve(__dirname, '..');
const OUT_DIR = path.join(ROOT, 'audio', 'sounds');

const args = process.argv.slice(2);
const DRY_RUN = args.includes('--dry-run');
const FORCE = args.includes('--force');
const BOSS_FILTER = (() => { const i = args.indexOf('--boss'); return i !== -1 ? args[i + 1] : null; })();

if (!API_KEY && !DRY_RUN) {
    console.error('\nError: ELEVENLABS_API_KEY environment variable is not set.');
    console.error('  export ELEVENLABS_API_KEY=your_key\n');
    process.exit(1);
}

// Initialize ElevenLabs client
const elevenlabs = !DRY_RUN ? new ElevenLabsClient({ apiKey: API_KEY }) : null;

// ---------------------------------------------------------------------------
// Sound definitions
// Each entry: { id, boss, filename, duration, promptInfluence, description }
//   id              → AudioManager key
//   boss            → logical group (for --boss filter)
//   filename        → relative to audio/sounds/
//   duration        → seconds (0.5–22)
//   promptInfluence → 0–1 (0.3 = balanced, 0.5 = more literal)
//   description     → ElevenLabs text prompt
// ---------------------------------------------------------------------------
const SOUNDS = [

    // // ── SHADOW CLONE (Symphony of Sickness) ─────────────────────────────────
    // {
    //     id: 'shadow_step_vanish',
    //     boss: 'shadow_clone',
    //     filename: 'boss_shadow_step_vanish.wav',
    //     duration: 0.6,
    //     promptInfluence: 0.4,
    //     description: 'Dark whoosh as something disappears into shadow, deep void bass pop with a trailing darkness hiss',
    // },
    // {
    //     id: 'shadow_step_reappear',
    //     boss: 'shadow_clone',
    //     filename: 'boss_shadow_step_reappear.wav',
    //     duration: 0.7,
    //     promptInfluence: 0.4,
    //     description: 'Heavy thud impact as a dark entity materialises from shadow, deep bass thump with brief crackling void energy',
    // },
    // {
    //     id: 'shadow_trail_tick',
    //     boss: 'shadow_clone',
    //     filename: 'boss_shadow_trail_tick.wav',
    //     duration: 0.5,
    //     promptInfluence: 0.3,
    //     description: 'Single brief dark pulse hiss, quiet shadow energy flicker, very subtle whoosh',
    // },
    // {
    //     id: 'shadow_fan_shot',
    //     boss: 'shadow_clone',
    //     filename: 'boss_shadow_fan_shot.wav',
    //     duration: 0.5,
    //     promptInfluence: 0.4,
    //     description: 'Five dark energy bolts fired in rapid succession, fanning out, dark whooshes in quick burst',
    // },
    // {
    //     id: 'shadow_phase_transition',
    //     boss: 'shadow_clone',
    //     filename: 'boss_shadow_phase_transition.wav',
    //     duration: 2.2,
    //     promptInfluence: 0.4,
    //     description: 'Deep ominous void rumble building into a violent dark energy explosion, low frequency bass surge with crackling purple energy, foreboding transformation sound',
    // },
    // {
    //     id: 'dark_pulse_ring',
    //     boss: 'shadow_clone',
    //     filename: 'boss_dark_pulse_ring.wav',
    //     duration: 1.5,
    //     promptInfluence: 0.4,
    //     description: 'Expanding ring of dark void orbs radiating outward, low resonant boom with a long dark energy tail, deep bass pulse wave',
    // },

    // // ── MIMIC KING (Faith of Fortune) ───────────────────────────────────────
    // {
    //     id: 'wheel_tick',
    //     boss: 'mimic_king',
    //     filename: 'boss_wheel_tick.wav',
    //     duration: 0.5,
    //     promptInfluence: 0.5,
    //     description: 'Single mechanical ratchet click, slot machine gear tick, crisp metal click',
    // },
    // {
    //     id: 'wheel_spin_start',
    //     boss: 'mimic_king',
    //     filename: 'boss_wheel_spin_start.wav',
    //     duration: 1.2,
    //     promptInfluence: 0.5,
    //     description: 'Slot machine wheel spinning up, rapid ratcheting mechanical clicks accelerating, carnival wheel of fortune spinning',
    // },
    // {
    //     id: 'wheel_land',
    //     boss: 'mimic_king',
    //     filename: 'boss_wheel_land.wav',
    //     duration: 0.6,
    //     promptInfluence: 0.5,
    //     description: 'Carnival wheel of fortune landing, satisfying mechanical clunk as ratchet stops, slot machine result reveal click',
    // },
    // {
    //     id: 'gambit_jackpot',
    //     boss: 'mimic_king',
    //     filename: 'boss_gambit_jackpot.wav',
    //     duration: 0.9,
    //     promptInfluence: 0.5,
    //     description: 'Slot machine jackpot fanfare chime, celebratory coin sounds, bright ascending ding ding ding winning sound',
    // },
    // {
    //     id: 'gambit_nothing',
    //     boss: 'mimic_king',
    //     filename: 'boss_gambit_nothing.wav',
    //     duration: 0.6,
    //     promptInfluence: 0.5,
    //     description: 'Comedic failure sound, deflating sad trombone, brief wah-wah descending musical fail stinger',
    // },
    // {
    //     id: 'mimic_nova_burst',
    //     boss: 'mimic_king',
    //     filename: 'boss_mimic_nova.wav',
    //     duration: 1.2,
    //     promptInfluence: 0.4,
    //     description: 'Ten magical orbs exploding outward in all directions simultaneously, golden energy burst with sparkle, magical radial explosion bloom',
    // },
    // {
    //     id: 'mimic_spiral_arms',
    //     boss: 'mimic_king',
    //     filename: 'boss_mimic_spiral.wav',
    //     duration: 1.5,
    //     promptInfluence: 0.4,
    //     description: 'Three rotating magical arms firing projectiles in a spiral pattern, sustained spinning magical whoosh with rhythmic energy pulses',
    // },
    // {
    //     id: 'mimic_copy_hit',
    //     boss: 'mimic_king',
    //     filename: 'boss_mimic_copy.wav',
    //     duration: 0.7,
    //     promptInfluence: 0.5,
    //     description: 'Mirror shattering resonance, magical copy sound, glass-like chime shatter combined with a brief magical sting',
    // },
    // {
    //     id: 'mimic_phase2_transition',
    //     boss: 'mimic_king',
    //     filename: 'boss_mimic_phase2.wav',
    //     duration: 2.0,
    //     promptInfluence: 0.4,
    //     description: 'Ornate mirror shattering dramatically, glass breaking with golden magical resonance, followed by an eerie laugh-like chime, theatrical reveal',
    // },
    // {
    //     id: 'mimic_phase3_transition',
    //     boss: 'mimic_king',
    //     filename: 'boss_mimic_phase3.wav',
    //     duration: 2.5,
    //     promptInfluence: 0.4,
    //     description: 'Loud crack of a golden mask breaking apart, deep distorted shatter with warped resonance, dramatic magical collapse sound, unsettling shift',
    // },

    // // ── CLOUD GOLEM (Waker of Winds) ─────────────────────────────────────────
    // {
    //     id: 'gust_push',
    //     boss: 'cloud_golem',
    //     filename: 'boss_gust_push.wav',
    //     duration: 0.6,
    //     promptInfluence: 0.5,
    //     description: 'Sharp concentrated wind burst, sudden strong gust blast, short powerful whoosh of air',
    // },
    // {
    //     id: 'hailstorm_burst',
    //     boss: 'cloud_golem',
    //     filename: 'boss_hailstorm_burst.wav',
    //     duration: 1.5,
    //     promptInfluence: 0.5,
    //     description: 'Hailstones pelting rapidly, ice pellets clattering and ricocheting, sharp icy patter, staccato ice impacts',
    // },
    // {
    //     id: 'cloud_golem_stomp',
    //     boss: 'cloud_golem',
    //     filename: 'boss_cloud_golem_stomp.wav',
    //     duration: 2.0,
    //     promptInfluence: 0.5,
    //     description: 'Massive stone golem ground slam, deep heavy impact causing a shockwave, loud rumbling crash with stone-on-earth bass thud, ground tremor',
    // },

    // // ── STORM CROW (Waker of Winds) ───────────────────────────────────────────
    // {
    //     id: 'crow_dive_screech',
    //     boss: 'storm_crow',
    //     filename: 'boss_crow_dive_screech.wav',
    //     duration: 1.2,
    //     promptInfluence: 0.5,
    //     description: 'Enormous bird of prey diving screech, raptor war cry, massive wings cutting air, terrifying screaming bird screech with wind rush',
    // },
    // {
    //     id: 'screech_land',
    //     boss: 'storm_crow',
    //     filename: 'boss_crow_screech_land.wav',
    //     duration: 0.8,
    //     promptInfluence: 0.5,
    //     description: 'Sharp bird of prey screech on landing impact, talon strike with shockwave, piercing raptor cry with ground impact thud',
    // },

    // // ── TORNADO MACHINA (Waker of Winds) ──────────────────────────────────────
    // {
    //     id: 'tornado_projectile_spawn',
    //     boss: 'tornado_machina',
    //     filename: 'boss_tornado_spawn.wav',
    //     duration: 0.5,
    //     promptInfluence: 0.4,
    //     description: 'Mechanical wind-up click as a tornado projectile launches, brief spinning mechanical tick combined with a short air burst',
    // },
    // {
    //     id: 'spin_dash',
    //     boss: 'tornado_machina',
    //     filename: 'boss_tornado_spin_dash.wav',
    //     duration: 1.5,
    //     promptInfluence: 0.5,
    //     description: 'Giant turbine revving to maximum speed, high-pitched mechanical spin-up whirr followed by a violent acceleration burst, industrial fan at full power',
    // },

    // // ── TEMPEST (Waker of Winds — final boss) ────────────────────────────────
    // {
    //     id: 'vortex_pull',
    //     boss: 'tempest',
    //     filename: 'boss_vortex_pull.wav',
    //     duration: 2.5,
    //     promptInfluence: 0.5,
    //     description: 'Deep vortex suction pulling inward, atmospheric whoosh of air rushing toward a central point, like being sucked into a tornado eye, deep low-frequency inward roar',
    // },
    // {
    //     id: 'eye_of_storm_ring',
    //     boss: 'tempest',
    //     filename: 'boss_eye_storm_ring.wav',
    //     duration: 2.0,
    //     promptInfluence: 0.5,
    //     description: 'Sixteen projectiles exploding outward in a ring of howling wind, expanding circular storm burst with a trailing howl, violent outward wind ring',
    // },
    // {
    //     id: 'tempest_phase2_transition',
    //     boss: 'tempest',
    //     filename: 'boss_tempest_phase2.wav',
    //     duration: 3.0,
    //     promptInfluence: 0.4,
    //     description: 'Titanic storm intensifying dramatically, the eye of a hurricane opening, explosive wind surge building to a massive climactic gale, violent atmospheric shift',
    // },

    // // ── ZEUS (Tournament of Thunder) ─────────────────────────────────────────
    // {
    //     id: 'thunder_spear_telegraph',
    //     boss: 'zeus',
    //     filename: 'boss_thunder_spear_telegraph.wav',
    //     duration: 1.2,
    //     promptInfluence: 0.5,
    //     description: 'Electrical charge building up, crackling high voltage building to a crescendo before discharge, buzzing and crackling electricity charging',
    // },
    // {
    //     id: 'thunder_spear_launch',
    //     boss: 'zeus',
    //     filename: 'boss_thunder_spear_launch.wav',
    //     duration: 0.6,
    //     promptInfluence: 0.5,
    //     description: 'Lightning bolt fired at extreme speed, fast electric snap and crack, sharp thunderclap discharge whoosh',
    // },
    // {
    //     id: 'zeus_storm_ring',
    //     boss: 'zeus',
    //     filename: 'boss_zeus_storm_ring.wav',
    //     duration: 1.5,
    //     promptInfluence: 0.5,
    //     description: 'Lightning ring expanding outward in all directions, rolling thunder with multiple electric discharges radiating, circular lightning burst',
    // },
    // {
    //     id: 'zeus_static_field',
    //     boss: 'zeus',
    //     filename: 'boss_zeus_static_field.wav',
    //     duration: 0.7,
    //     promptInfluence: 0.5,
    //     description: 'Electrical trap placed on ground, static electricity hum as a lightning mine is set, zap and buzz of a static field activating',
    // },
    // {
    //     id: 'wrath_of_olympus',
    //     boss: 'zeus',
    //     filename: 'boss_wrath_olympus.wav',
    //     duration: 5.0,
    //     promptInfluence: 0.4,
    //     description: 'Massive sustained lightning barrage, five consecutive volleys of thunderbolts firing over four seconds, divine retribution from the sky, rolling thunder with intense electric discharges escalating in intensity',
    // },
    // {
    //     id: 'zeus_phase2_transition',
    //     boss: 'zeus',
    //     filename: 'boss_zeus_phase2.wav',
    //     duration: 2.0,
    //     promptInfluence: 0.4,
    //     description: 'Dramatic thunder boom as a god of lightning declares dominance, massive thunderclap with reverberating electrical discharge, epic dramatic thunder strike',
    // },
    // {
    //     id: 'zeus_phase3_transition',
    //     boss: 'zeus',
    //     filename: 'boss_zeus_phase3.wav',
    //     duration: 2.5,
    //     promptInfluence: 0.4,
    //     description: 'The most powerful thunderbolt in existence unleashed, earth-shaking thunder crack with violent electrical surge, god-tier lightning detonation',
    // },
    // {
    //     id: 'zeus_teleport_flash',
    //     boss: 'zeus',
    //     filename: 'boss_zeus_teleport.wav',
    //     duration: 0.5,
    //     promptInfluence: 0.5,
    //     description: 'Electric pop and snap as lightning teleports, brief explosive electrical discharge, lightning flash sound effect',
    // },

    // // ── DARK GOLEM (Rise of the Rock) ────────────────────────────────────────
    // {
    //     id: 'dark_golem_boulder',
    //     boss: 'dark_golem',
    //     filename: 'boss_dark_golem_boulder.wav',
    //     duration: 0.7,
    //     promptInfluence: 0.5,
    //     description: 'Large boulder being hurled, heavy stone projectile whooshing through air, massive rock thrown with deep stone scraping sound',
    // },
    // {
    //     id: 'dark_golem_slam',
    //     boss: 'dark_golem',
    //     filename: 'boss_dark_golem_slam.wav',
    //     duration: 2.0,
    //     promptInfluence: 0.5,
    //     description: 'Gigantic obsidian fist slamming into the ground, cataclysmic stone impact with shockwave, earth shattering ground pound, massive rubble explosion',
    // },
    // {
    //     id: 'dark_golem_lava',
    //     boss: 'dark_golem',
    //     filename: 'boss_dark_golem_lava.wav',
    //     duration: 1.5,
    //     promptInfluence: 0.5,
    //     description: 'Molten lava erupting and spewing, viscous hot liquid bursting from stone cracks, volcanic sizzle and bubble with hissing steam',
    // },
    // {
    //     id: 'dark_golem_crack',
    //     boss: 'dark_golem',
    //     filename: 'boss_dark_golem_crack.wav',
    //     duration: 2.0,
    //     promptInfluence: 0.5,
    //     description: 'Massive obsidian stone cracking apart to reveal lava within, deep stone fracture crack and rumble, lava breaking through rock with hiss and explosion',
    // },
    // {
    //     id: 'dark_golem_charge',
    //     boss: 'dark_golem',
    //     filename: 'boss_dark_golem_charge.wav',
    //     duration: 0.9,
    //     promptInfluence: 0.5,
    //     description: 'Massive stone golem beginning to charge, heavy rumbling stone footsteps rapidly accelerating, ground shaking as a colossus builds momentum',
    // },
    // {
    //     id: 'dark_golem_berserk',
    //     boss: 'dark_golem',
    //     filename: 'boss_dark_golem_berserk.wav',
    //     duration: 3.0,
    //     promptInfluence: 0.4,
    //     description: 'Colossal stone golem entering berserk rage, deep lava-fuelled roar, stone and fire explosion, magma surging through cracks, earth trembling with violent volcanic fury',
    // },

    // // ── VOID WALKER BOSS (Champions of Chaos) ────────────────────────────────
    // {
    //     id: 'void_bolt',
    //     boss: 'void_walker_boss',
    //     filename: 'boss_void_bolt.wav',
    //     duration: 0.5,
    //     promptInfluence: 0.4,
    //     description: 'Dark void energy projectile fired, deep bass void pulse shot, dark matter bolt discharge',
    // },
    // {
    //     id: 'void_pulse_ring',
    //     boss: 'void_walker_boss',
    //     filename: 'boss_void_pulse_ring.wav',
    //     duration: 1.5,
    //     promptInfluence: 0.4,
    //     description: 'Twelve void energy orbs expanding outward simultaneously, low resonant void explosion with deep bass ring, darkness radiating outward',
    // },
    // {
    //     id: 'dimensional_rift',
    //     boss: 'void_walker_boss',
    //     filename: 'boss_dimensional_rift.wav',
    //     duration: 1.0,
    //     promptInfluence: 0.4,
    //     description: 'Dimensional portal tearing open, reality ripping apart briefly, void rift opening and closing with distorted spatial sound effect',
    // },
    // {
    //     id: 'void_phase_in',
    //     boss: 'void_walker_boss',
    //     filename: 'boss_void_phase_in.wav',
    //     duration: 0.7,
    //     promptInfluence: 0.4,
    //     description: 'Entity phasing back into reality from void, dark energy solidifying, void portal closing with deep bass thud and crackling darkness',
    // },
    // {
    //     id: 'void_phase_out',
    //     boss: 'void_walker_boss',
    //     filename: 'boss_void_phase_out.wav',
    //     duration: 0.7,
    //     promptInfluence: 0.4,
    //     description: 'Entity dissolving into void and becoming intangible, whooshing dark energy as something phases out of reality, fading void hiss',
    // },
    // {
    //     id: 'void_gravity_pull',
    //     boss: 'void_walker_boss',
    //     filename: 'boss_void_gravity_pull.wav',
    //     duration: 2.0,
    //     promptInfluence: 0.5,
    //     description: 'Gravitational void pull dragging something toward a singularity, deep low-frequency inward suction, tearing spatial sound as gravity warps',
    // },
    // {
    //     id: 'void_storm',
    //     boss: 'void_walker_boss',
    //     filename: 'boss_void_storm.wav',
    //     duration: 2.0,
    //     promptInfluence: 0.4,
    //     description: 'Twenty-four void projectiles erupting outward simultaneously, massive void explosion bloom, deep bass ring of dark energy expanding violently',
    // },

    // // ── GLITCH BOSS (Champions of Chaos) ─────────────────────────────────────
    // {
    //     id: 'glitch_teleport',
    //     boss: 'glitch_boss',
    //     filename: 'boss_glitch_teleport.wav',
    //     duration: 0.5,
    //     promptInfluence: 0.5,
    //     description: 'Digital glitch teleport, corrupted data blip, electronic pop with static distortion, error sound effect',
    // },
    // {
    //     id: 'glitch_corruption_beam',
    //     boss: 'glitch_boss',
    //     filename: 'boss_glitch_beam.wav',
    //     duration: 0.8,
    //     promptInfluence: 0.5,
    //     description: 'Rapid digital corruption beam firing, five quick electronic laser shots in rapid succession, corrupted data stream sound',
    // },
    // {
    //     id: 'glitch_fragmentation',
    //     boss: 'glitch_boss',
    //     filename: 'boss_glitch_fragment.wav',
    //     duration: 1.5,
    //     promptInfluence: 0.5,
    //     description: 'Digital entity fragmenting into multiple copies, glitching data corruption sound, electronic fragmentation with pixel scatter and static burst',
    // },
    // {
    //     id: 'glitch_system_crash',
    //     boss: 'glitch_boss',
    //     filename: 'boss_glitch_crash.wav',
    //     duration: 1.5,
    //     promptInfluence: 0.5,
    //     description: 'System crash error sound with massive glitch burst, digital catastrophic failure explosion, corrupted data explosion with harsh electronic noise',
    // },

    // // ── ENTROPY LORD (Champions of Chaos — superboss) ────────────────────────
    // {
    //     id: 'entropy_surge',
    //     boss: 'entropy_lord',
    //     filename: 'boss_entropy_surge.wav',
    //     duration: 1.5,
    //     promptInfluence: 0.4,
    //     description: 'Twelve chaos magic projectiles exploding outward in all directions simultaneously, entropy energy nova ring, chaotic magical explosion burst',
    // },
    // {
    //     id: 'chaos_storm',
    //     boss: 'entropy_lord',
    //     filename: 'boss_chaos_storm.wav',
    //     duration: 3.0,
    //     promptInfluence: 0.4,
    //     description: 'Three rotating rings of chaotic energy erupting in sequence two hundred milliseconds apart, chaotic magical storm volley, swirling entropy explosion waves',
    // },
    // {
    //     id: 'entropy_phase2_transition',
    //     boss: 'entropy_lord',
    //     filename: 'boss_entropy_phase2.wav',
    //     duration: 2.0,
    //     promptInfluence: 0.4,
    //     description: 'Entropy accelerating dramatically, chaotic magical surge, reality destabilising with crackling multi-colour energy explosion, dangerous power increase',
    // },
    // {
    //     id: 'entropy_phase3_transition',
    //     boss: 'entropy_lord',
    //     filename: 'boss_entropy_phase3.wav',
    //     duration: 3.0,
    //     promptInfluence: 0.4,
    //     description: 'Total entropy unleashed, apocalyptic chaos explosion, reality fracturing with multiple simultaneous magical detonations, supreme villain power surge',
    // },
    // {
    //     id: 'shield_orb_hit',
    //     boss: 'entropy_lord',
    //     filename: 'boss_shield_orb_hit.wav',
    //     duration: 0.5,
    //     promptInfluence: 0.4,
    //     description: 'Purple magical shield orb striking something, brief magical impact sting, small energy orb collision pulse',
    // },
    // {
    //     id: 'entropy_teleport',
    //     boss: 'entropy_lord',
    //     filename: 'boss_entropy_teleport.wav',
    //     duration: 0.6,
    //     promptInfluence: 0.4,
    //     description: 'Chaos mage teleporting away with a burst of purple energy, magical displacement pop, brief chaotic energy warp sound',
    // },

    // ── BASE GAME — existing sounds (for regeneration) ───────────────────────
    {
        id: 'boss_shooter',
        boss: 'base_ranged',
        filename: 'boss_shooter.wav',
        duration: 0.5,
        promptInfluence: 0.5,
        description: 'Boss monster firing a fast energy projectile, sharp ranged shot discharge, compact energy bolt launch sound',
    },
    {
        id: 'boss_rhino_charge',
        boss: 'base_ranged',
        filename: 'boss_rhino_charge.wav',
        duration: 1.0,
        promptInfluence: 0.5,
        description: 'Heavy armored beast beginning a full-speed charge, thundering ground pounds accelerating, powerful beast ramming forward with snorting aggression',
    },
    {
        id: 'boss_stomp',
        boss: 'base_ranged',
        filename: 'boss_stomp.wav',
        duration: 0.8,
        promptInfluence: 0.5,
        description: 'Massive stomp impact hitting the ground hard, heavy slam with shockwave, deep earth-shaking thud',
    },

    // ── TANK (base game) ──────────────────────────────────────────────────────
    {
        id: 'boss_tank_ring',
        boss: 'tank',
        filename: 'boss_tank_ring.wav',
        duration: 1.2,
        promptInfluence: 0.4,
        description: 'Armored tank boss firing twelve energy projectiles outward simultaneously in a ring, mechanical burst cannon discharge, rotating volley radiating in all directions',
    },
    {
        id: 'boss_tank_phase2',
        boss: 'tank',
        filename: 'boss_tank_phase2.wav',
        duration: 2.0,
        promptInfluence: 0.4,
        description: 'Battle tank going berserk in phase two, heavy metallic roar with turbines spinning faster, armored machine entering overdrive with grinding metal and steam venting',
    },

    // ── SUMMONER (base game) ──────────────────────────────────────────────────
    {
        id: 'boss_summoner_spawn',
        boss: 'summoner',
        filename: 'boss_summoner_spawn.wav',
        duration: 1.0,
        promptInfluence: 0.4,
        description: 'Dark sorcerer summoning enemy minions, ominous dark magic ritual sound, multiple enemies materialising with crackling purple energy',
    },
    {
        id: 'boss_summoner_phase2',
        boss: 'summoner',
        filename: 'boss_summoner_phase2.wav',
        duration: 2.0,
        promptInfluence: 0.4,
        description: 'Summoner boss activating an invulnerability shield while unleashing five powerful minions simultaneously, dark magical barrier snapping into place with booming resonance and forbidden ritual escalation',
    },
    {
        id: 'boss_summoner_shield_break',
        boss: 'summoner',
        filename: 'boss_summoner_shield_break.wav',
        duration: 1.2,
        promptInfluence: 0.4,
        description: 'Magical protection shield shattering dramatically, dark energy barrier breaking apart, arcane shield destroyed with a loud magical crack and dissipating energy hiss',
    },

    // ── MAKUTA (base game) ────────────────────────────────────────────────────
    {
        id: 'boss_makuta_teleport',
        boss: 'makuta',
        filename: 'boss_makuta_teleport.wav',
        duration: 0.8,
        promptInfluence: 0.4,
        description: 'Ultimate dark villain teleporting with a burst of black void energy, shadow displacement pop, ominous void crackle as a dark entity vanishes and reappears elsewhere',
    },
    {
        id: 'boss_makuta_shadow_nova',
        boss: 'makuta',
        filename: 'boss_makuta_shadow_nova.wav',
        duration: 1.5,
        promptInfluence: 0.4,
        description: 'Sixteen shadow projectiles exploding outward in all directions simultaneously, massive dark nova detonation, deep black void explosion ring with ominous bass rumble',
    },
    {
        id: 'boss_makuta_shadow_beam',
        boss: 'makuta',
        filename: 'boss_makuta_shadow_beam.wav',
        duration: 0.7,
        promptInfluence: 0.4,
        description: 'Concentrated shadow beam fired at extreme speed toward a target, dark energy lance discharge, piercing void ray with deep resonant hiss',
    },

    // ── WEATHER AMBIENCE ──────────────────────────────────────────────────────
    {
        id: 'weather_sandstorm',
        boss: 'weather',
        filename: 'weather_sandstorm.wav',
        duration: 4.0,
        promptInfluence: 0.3,
        description: 'Desert sandstorm ambience loop, fierce wind carrying thick waves of sand and grit, deep roaring gusts with hissing sand grains sweeping across arid terrain, relentless dry storm atmosphere',
    },
    {
        id: 'weather_acidic_fog',
        boss: 'weather',
        filename: 'weather_acidic_fog.wav',
        duration: 4.0,
        promptInfluence: 0.3,
        description: 'Eerie acidic fog ambience loop, slow bubbling and hissing of corrosive mist, unsettling low drones with occasional soft dripping and chemical sizzling sounds, toxic swamp atmosphere',
    },
    {
        id: 'weather_gale',
        boss: 'weather',
        filename: 'weather_gale.wav',
        duration: 4.0,
        promptInfluence: 0.3,
        description: 'Powerful gale force wind ambience loop, howling high-speed gusts roaring across open landscape, deep turbulent air whoosh with whistling tones, strong wind buffeting and swirling, dramatic storm wind loop',
    },
    {
        id: 'weather_blizzard',
        boss: 'weather',
        filename: 'weather_blizzard.wav',
        duration: 4.0,
        promptInfluence: 0.3,
        description: 'Howling blizzard wind ambience, icy gusts sweeping across an open field, deep rumbling wind with subtle whistling tones, cold and relentless winter storm loop',
    },
    {
        id: 'weather_heatwave',
        boss: 'weather',
        filename: 'weather_heatwave.wav',
        duration: 4.0,
        promptInfluence: 0.3,
        description: 'Scorching heatwave ambience, shimmering air distortion sound, faint crackling heat shimmer, oppressive dry summer heat with distant buzzing cicadas loop',
    },
    {
        id: 'weather_thunderstorm',
        boss: 'weather',
        filename: 'weather_thunderstorm.wav',
        duration: 4.0,
        promptInfluence: 0.3,
        description: 'Thunderstorm ambience loop, heavy rain pouring down with rumbling distant thunder, dramatic electrical storm atmosphere, intense weather loop',
    },
    {
        id: 'weather_thunder_crack',
        boss: 'weather',
        filename: 'weather_thunder_crack.wav',
        duration: 1.5,
        promptInfluence: 0.4,
        description: 'Single sharp lightning bolt strike, immediate thunderclap crack with deep resonant rumble, close-range lightning impact, powerful electrical discharge with short echo',
    },

    // ── TIME HERO — Hero SFX (Echos of Eternity) ─────────────────────────────
    {
        id: 'attack_time',
        boss: 'hero_time',
        dir: 'dlc/echos_of_eternity/audio/sounds',
        filename: 'attack_time.wav',
        duration: 0.8,
        promptInfluence: 0.4,
        description: 'Temporal energy orb fired, subtle whoosh with a crystalline time-ripple resonance, sand-gold tonal shimmer, otherworldly projectile launch',
    },
    {
        id: 'melee_time',
        boss: 'hero_time',
        dir: 'dlc/echos_of_eternity/audio/sounds',
        filename: 'melee_time.wav',
        duration: 0.5,
        promptInfluence: 0.4,
        description: 'Chrono strike melee swipe, sharp temporal distortion crack with a brief time-freeze shockwave, clock-hand slice through reality, snappy and precise',
    },
    {
        id: 'special_time',
        boss: 'hero_time',
        dir: 'dlc/echos_of_eternity/audio/sounds',
        filename: 'special_time.wav',
        duration: 1.5,
        promptInfluence: 0.4,
        description: 'Timeline Fracture special ability, reality splitting apart with a resonant time-crack, cascading clock-chime shatters, deep temporal rift opening with echo trails',
    },
    {
        id: 'paradox_time',
        boss: 'hero_time',
        dir: 'dlc/echos_of_eternity/audio/sounds',
        filename: 'paradox_time.wav',
        duration: 2.5,
        promptInfluence: 0.4,
        description: 'Eternal Paradox ultimate activation, all timelines converging at once, massive reality implosion with swirling echo shards, gold temporal energy surge building to a dramatic crescendo, climactic transformation sound',
    },
    {
        id: 'paradox_end_time',
        boss: 'hero_time',
        dir: 'dlc/echos_of_eternity/audio/sounds',
        filename: 'paradox_end_time.wav',
        duration: 1.2,
        promptInfluence: 0.35,
        description: 'Eternal Paradox fading away, temporal energy dissipating with a slow echo decay, time-ripples settling back into calm, soft gold resonance fading out',
    },

    // ── LOVE HERO — Hero SFX (Echos of Eternity) ─────────────────────────────
    {
        id: 'attack_love',
        boss: 'hero_love',
        dir: 'dlc/echos_of_eternity/audio/sounds',
        filename: 'attack_love.wav',
        duration: 0.8,
        promptInfluence: 0.4,
        description: 'Heart arrow fired, playful high-pitched twang with a soft pink sparkle chime, loveable projectile whoosh, light and charming with a tiny heart pop at the end',
    },
    {
        id: 'melee_love',
        boss: 'hero_love',
        dir: 'dlc/echos_of_eternity/audio/sounds',
        filename: 'melee_love.wav',
        duration: 0.5,
        promptInfluence: 0.4,
        description: 'Embrace melee strike, warm heavy thump with a soft pink energy burst, an enveloping AoE pull impact, love energy shockwave that draws enemies inward',
    },
    {
        id: 'special_love',
        boss: 'hero_love',
        dir: 'dlc/echos_of_eternity/audio/sounds',
        filename: 'special_love.wav',
        duration: 1.5,
        promptInfluence: 0.4,
        description: 'Emotional Resonance special ability, warm pulsing heart energy linking enemies together, soft chime chord rising with pink sparkle resonance, love chains connecting with a gentle musical sting',
    },
    {
        id: 'unity_love',
        boss: 'hero_love',
        dir: 'dlc/echos_of_eternity/audio/sounds',
        filename: 'unity_love.wav',
        duration: 2.5,
        promptInfluence: 0.4,
        description: 'Heart of Unity ultimate activation, massive all-encompassing love energy explosion, sweeping orchestral love theme swell, hearts bursting outward in all directions, powerful warm healing surge with triumphant chime crescendo',
    },
    {
        id: 'heartburst_love',
        boss: 'hero_love',
        dir: 'dlc/echos_of_eternity/audio/sounds',
        filename: 'heartburst_love.wav',
        duration: 1.0,
        promptInfluence: 0.4,
        description: 'Heartburst auto-trigger at full affection meter, rapid-fire heart projectiles bursting outward in a circle, bright sparkling pop with cascading pink chimes, affection meter releasing in an explosive love burst',
    },

    // ── WEATHER — DLC (Echos of Eternity) ────────────────────────────────────
    {
        id: 'weather_temporal_rift',
        boss: 'weather',
        dir: 'dlc/echos_of_eternity/audio/sounds',
        filename: 'weather_temporal_rift.wav',
        duration: 4.0,
        promptInfluence: 0.35,
        description: 'Temporal rift ambience loop, reality tearing apart with deep resonant hum, time fracturing sounds, eerie clockwork dissonance, ghostly echoes of past and future bleeding together',
    },
    {
        id: 'weather_petal_storm',
        boss: 'weather',
        dir: 'dlc/echos_of_eternity/audio/sounds',
        filename: 'weather_petal_storm.wav',
        duration: 4.0,
        promptInfluence: 0.30,
        description: 'Gentle petal storm ambience loop, soft romantic wind carrying flower petals, delicate chime tones, light and airy love-themed weather atmosphere, dreamy and whimsical',
    },

    // ── TIME WRAITH (Echos of Eternity) ──────────────────────────────────────
    {
        id: 'time_wraith_shadow_pulse',
        boss: 'time_wraith',
        dir: 'dlc/echos_of_eternity/audio/sounds',
        filename: 'boss_time_wraith_shadow_pulse.wav',
        duration: 1.2,
        promptInfluence: 0.4,
        description: 'A spectral wraith releasing a burst of ten shadowy temporal projectiles in all directions, ghostly hollow whoosh with ethereal crackling energy, eerie void pulse ring',
    },
    {
        id: 'time_wraith_twin_shot',
        boss: 'time_wraith',
        dir: 'dlc/echos_of_eternity/audio/sounds',
        filename: 'boss_time_wraith_twin_shot.wav',
        duration: 0.5,
        promptInfluence: 0.4,
        description: 'Two dark energy bolts fired in quick succession toward a target, hollow spectral double-shot, ghostly twin pulse discharge',
    },
    {
        id: 'time_wraith_blink',
        boss: 'time_wraith',
        dir: 'dlc/echos_of_eternity/audio/sounds',
        filename: 'boss_time_wraith_blink.wav',
        duration: 0.6,
        promptInfluence: 0.4,
        description: 'Ghostly entity blinking through time with a hollow pop, ethereal teleport displacement, brief temporal distortion crackle with trailing ghost echo',
    },
    {
        id: 'time_wraith_clone_spawn',
        boss: 'time_wraith',
        dir: 'dlc/echos_of_eternity/audio/sounds',
        filename: 'boss_time_wraith_clone_spawn.wav',
        duration: 1.5,
        promptInfluence: 0.4,
        description: 'Spectral wraith fragmenting into two shadow clones, ghostly bifurcation sound, eerie doubling echo with ethereal phase shimmer and dark crackling',
    },
    {
        id: 'time_wraith_final_echo',
        boss: 'time_wraith',
        dir: 'dlc/echos_of_eternity/audio/sounds',
        filename: 'boss_time_wraith_final_echo.wav',
        duration: 2.5,
        promptInfluence: 0.4,
        description: 'Wraith unleashing its final echo form, sixteen shadow projectiles erupting outward with ghostly wail, spectral explosion with hollow reverberating temporal shriek, eerie final phase surge',
    },

    // ── TEMPORAL RIFT (Echos of Eternity) ────────────────────────────────────
    {
        id: 'temporal_rift_portal_shot',
        boss: 'temporal_rift',
        dir: 'dlc/echos_of_eternity/audio/sounds',
        filename: 'boss_temporal_rift_portal_shot.wav',
        duration: 0.5,
        promptInfluence: 0.4,
        description: 'Small rift portal firing an energy projectile, brief warped dimensional pop discharge, space-tearing mini portal shot sound',
    },
    {
        id: 'temporal_rift_void_pull',
        boss: 'temporal_rift',
        dir: 'dlc/echos_of_eternity/audio/sounds',
        filename: 'boss_temporal_rift_void_pull.wav',
        duration: 2.0,
        promptInfluence: 0.5,
        description: 'Reality warping inward as a temporal void pulls a target toward it, deep gravitational suction sound, space tearing and bending with low frequency inward roar and distorted whoosh',
    },
    {
        id: 'temporal_rift_shockwave',
        boss: 'temporal_rift',
        dir: 'dlc/echos_of_eternity/audio/sounds',
        filename: 'boss_temporal_rift_shockwave.wav',
        duration: 1.8,
        promptInfluence: 0.4,
        description: 'Twelve temporal energy projectiles expanding outward as a shockwave ring, reality fracturing in a circle, deep resonant dimensional boom with crackling time distortion radiating outward',
    },
    {
        id: 'temporal_rift_destabilized',
        boss: 'temporal_rift',
        dir: 'dlc/echos_of_eternity/audio/sounds',
        filename: 'boss_temporal_rift_destabilized.wav',
        duration: 2.5,
        promptInfluence: 0.4,
        description: 'Temporal rift becoming critically unstable and entering enraged state, reality splintering with distorted dimensional tearing, warped time collapse sound with cascading cracks and a deep ominous resonance',
    },

    // ── ETERNAL COLLAPSE (Echos of Eternity) ─────────────────────────────────
    {
        id: 'eternal_collapse_absorb',
        boss: 'eternal_collapse',
        dir: 'dlc/echos_of_eternity/audio/sounds',
        filename: 'boss_eternal_collapse_absorb.wav',
        duration: 1.5,
        promptInfluence: 0.4,
        description: 'Ancient entity absorbing incoming projectiles into itself, deep magnetic suction sound as energy is pulled inward, dark humming absorption with low frequency gravitational pull',
    },
    {
        id: 'eternal_collapse_release',
        boss: 'eternal_collapse',
        dir: 'dlc/echos_of_eternity/audio/sounds',
        filename: 'boss_eternal_collapse_release.wav',
        duration: 1.2,
        promptInfluence: 0.4,
        description: 'Absorbed energy explosively released in a burst of sixteen projectiles, compressed energy discharge explosion, powerful radial detonation with deep bass boom and expanding energy ring',
    },
    {
        id: 'eternal_collapse_spiral',
        boss: 'eternal_collapse',
        dir: 'dlc/echos_of_eternity/audio/sounds',
        filename: 'boss_eternal_collapse_spiral.wav',
        duration: 2.0,
        promptInfluence: 0.4,
        description: 'Eight energy bolts firing in an expanding spiral pattern, sustained rotational energy discharge, swirling projectile stream with a deep humming rotation sound',
    },
    {
        id: 'eternal_collapse_mega_burst',
        boss: 'eternal_collapse',
        dir: 'dlc/echos_of_eternity/audio/sounds',
        filename: 'boss_eternal_collapse_mega_burst.wav',
        duration: 3.0,
        promptInfluence: 0.4,
        description: 'Catastrophic collapse of reality as twenty-four projectiles explode outward in the ultimate attack, followed by a second ring of sixteen, apocalyptic dual-ring detonation, deep bass reality implosion with violent expanding shockwaves',
    },
    {
        id: 'eternal_collapse_phase_surge',
        boss: 'eternal_collapse',
        dir: 'dlc/echos_of_eternity/audio/sounds',
        filename: 'boss_eternal_collapse_phase_surge.wav',
        duration: 2.5,
        promptInfluence: 0.4,
        description: 'Ancient temporal entity shifting into a more dangerous phase, deep rumbling temporal surge, reality collapsing inward then violently expanding, ominous transformation with crackling time fractures and building dread',
    },

    // ── MASK GUARDIAN (Echos of Eternity) ────────────────────────────────────
    {
        id: 'mask_guardian_shield_up',
        boss: 'mask_guardian',
        dir: 'dlc/echos_of_eternity/audio/sounds',
        filename: 'boss_mask_guardian_shield_up.wav',
        duration: 0.8,
        promptInfluence: 0.5,
        description: 'Ancient gold shield slamming into place, resonant golden clang as a magical barrier activates, heavy metallic shield block sound with warm golden resonance',
    },
    {
        id: 'mask_guardian_shield_break',
        boss: 'mask_guardian',
        dir: 'dlc/echos_of_eternity/audio/sounds',
        filename: 'boss_mask_guardian_shield_break.wav',
        duration: 1.5,
        promptInfluence: 0.5,
        description: 'Ancient golden shield shattering dramatically, ornate metallic barrier breaking with a reverberating golden crash, shield destroyed with a deep metallic explosion and shattering resonance',
    },
    {
        id: 'mask_guardian_dash_charge',
        boss: 'mask_guardian',
        dir: 'dlc/echos_of_eternity/audio/sounds',
        filename: 'boss_mask_guardian_dash_charge.wav',
        duration: 1.0,
        promptInfluence: 0.5,
        description: 'Armored guardian charging forward at high speed then exploding into a burst of golden bolts, heavy metallic dash whoosh followed by a sharp golden energy burst discharge',
    },
    {
        id: 'mask_guardian_unleashed',
        boss: 'mask_guardian',
        dir: 'dlc/echos_of_eternity/audio/sounds',
        filename: 'boss_mask_guardian_unleashed.wav',
        duration: 2.5,
        promptInfluence: 0.4,
        description: 'Ancient mask guardian removing all restraints and unleashing true power, dramatic golden explosion with resonating metallic roar, sacred power surge with reverberating ancient energy, mask shattering reveal',
    },

    // ── MAKUTA ECHO (Echos of Eternity) ──────────────────────────────────────
    {
        id: 'makuta_void_spiral',
        boss: 'makuta_echo',
        dir: 'dlc/echos_of_eternity/audio/sounds',
        filename: 'boss_makuta_void_spiral.wav',
        duration: 1.8,
        promptInfluence: 0.4,
        description: 'Dark void energy spiraling outward in a rotating arc, eight void projectiles in a spiral pattern, deep hollow spinning void discharge with rotating dark energy hum',
    },
    {
        id: 'makuta_echo_spawn',
        boss: 'makuta_echo',
        dir: 'dlc/echos_of_eternity/audio/sounds',
        filename: 'boss_makuta_echo_spawn.wav',
        duration: 1.2,
        promptInfluence: 0.4,
        description: 'Dark entity creating a copy of itself that materialises beside it, eerie duplication sound, hollow void resonance as a shadow copy forms from dark energy',
    },
    {
        id: 'makuta_void_nova',
        boss: 'makuta_echo',
        dir: 'dlc/echos_of_eternity/audio/sounds',
        filename: 'boss_makuta_void_nova.wav',
        duration: 2.0,
        promptInfluence: 0.4,
        description: 'Twenty void projectiles exploding outward simultaneously while multiple echo copies also fire, massive void nova detonation, deep bass void explosion bloom with layered dark energy discharges',
    },
    {
        id: 'makuta_echo_convergence',
        boss: 'makuta_echo',
        dir: 'dlc/echos_of_eternity/audio/sounds',
        filename: 'boss_makuta_echo_convergence.wav',
        duration: 2.5,
        promptInfluence: 0.4,
        description: 'Multiple echoes converging back into the main entity making it stronger, hollow void merging sound, dark energies collapsing together with a deep resonant thud and crackling dark power surge',
    },

    // ── CHROME LEVIATHAN (Echos of Eternity) ─────────────────────────────────
    {
        id: 'chrome_leviathan_laser',
        boss: 'chrome_leviathan',
        dir: 'dlc/echos_of_eternity/audio/sounds',
        filename: 'boss_chrome_leviathan_laser.wav',
        duration: 3.0,
        promptInfluence: 0.5,
        description: 'Massive mechanical laser beam sweeping in a full rotation, sustained high-energy laser cutting sound, industrial laser sweep with metallic hum and bright electric beam sizzle',
    },
    {
        id: 'chrome_leviathan_stomp',
        boss: 'chrome_leviathan',
        dir: 'dlc/echos_of_eternity/audio/sounds',
        filename: 'boss_chrome_leviathan_stomp.wav',
        duration: 2.0,
        promptInfluence: 0.5,
        description: 'Giant chrome mechanical creature slamming into the ground three times in succession, each impact sending out an expanding shockwave ring, heavy metallic triple stomp with ground-shaking bass impacts and expanding ring sounds',
    },
    {
        id: 'chrome_leviathan_spread',
        boss: 'chrome_leviathan',
        dir: 'dlc/echos_of_eternity/audio/sounds',
        filename: 'boss_chrome_leviathan_spread.wav',
        duration: 0.8,
        promptInfluence: 0.5,
        description: 'Chrome mechanical beast firing five energy projectiles in a wide fan spread, metallic rapid-fire burst, mechanical spread shot with industrial energy discharge',
    },
    {
        id: 'chrome_leviathan_rage',
        boss: 'chrome_leviathan',
        dir: 'dlc/echos_of_eternity/audio/sounds',
        filename: 'boss_chrome_leviathan_rage.wav',
        duration: 3.0,
        promptInfluence: 0.4,
        description: 'Massive chrome mechanical leviathan entering berserk rage mode, industrial mechanical roar with metal grinding, steam venting and turbines spinning to maximum speed, chrome beast awakening with violent metallic fury',
    },

    // ── TEMPORAL WARDEN (Echos of Eternity) ──────────────────────────────────
    {
        id: 'temporal_warden_dash',
        boss: 'temporal_warden',
        dir: 'dlc/echos_of_eternity/audio/sounds',
        filename: 'boss_temporal_warden_dash.wav',
        duration: 0.7,
        promptInfluence: 0.5,
        description: 'Armored time guardian dashing at extreme speed leaving a temporal trail, sharp high-velocity whoosh with crackling time energy wake, fast warrior dash with brief temporal distortion',
    },
    {
        id: 'temporal_warden_dash_burst',
        boss: 'temporal_warden',
        dir: 'dlc/echos_of_eternity/audio/sounds',
        filename: 'boss_temporal_warden_dash_burst.wav',
        duration: 0.9,
        promptInfluence: 0.5,
        description: 'Time warden stopping after a dash and unleashing a burst of eight projectiles outward, sharp stop impact followed by radial energy burst discharge, momentum into explosive release',
    },
    {
        id: 'temporal_warden_erase_grid',
        boss: 'temporal_warden',
        dir: 'dlc/echos_of_eternity/audio/sounds',
        filename: 'boss_temporal_warden_erase_grid.wav',
        duration: 2.5,
        promptInfluence: 0.4,
        description: 'Time warden activating a temporal erase grid across the arena, multiple flashing damage zones appearing simultaneously with crackling temporal energy, systematic time erasure sound with rhythmic energy pulses activating across the field',
    },
    {
        id: 'temporal_warden_unchained',
        boss: 'temporal_warden',
        dir: 'dlc/echos_of_eternity/audio/sounds',
        filename: 'boss_temporal_warden_unchained.wav',
        duration: 2.5,
        promptInfluence: 0.4,
        description: 'Time warden breaking free from all restraints and entering final form, chains of time shattering with a resonant metallic crack, powerful warrior battle cry with temporal energy surge, dramatic power unleashed',
    },

    // ── BOSS THUNDER (Echos of Eternity) ─────────────────────────────────────
    {
        id: 'boss_thunder_lightning_volley',
        boss: 'boss_thunder',
        dir: 'dlc/echos_of_eternity/audio/sounds',
        filename: 'boss_thunder_lightning_volley.wav',
        duration: 1.2,
        promptInfluence: 0.5,
        description: 'Six lightning bolts fired in a wide spread pattern, crackling electric volley, rapid lightning discharge with sharp thunder cracks, electric spread shot barrage',
    },
    {
        id: 'boss_thunder_barrage',
        boss: 'boss_thunder',
        dir: 'dlc/echos_of_eternity/audio/sounds',
        filename: 'boss_thunder_barrage.wav',
        duration: 2.5,
        promptInfluence: 0.5,
        description: 'Multiple lightning arcs striking randomly near a target in rapid succession, chaotic thunder barrage, rolling electric storm with staccato lightning impacts, relentless thunder assault',
    },
    {
        id: 'boss_thunder_storm_ring',
        boss: 'boss_thunder',
        dir: 'dlc/echos_of_eternity/audio/sounds',
        filename: 'boss_thunder_storm_ring.wav',
        duration: 2.0,
        promptInfluence: 0.5,
        description: 'Twenty thunder projectiles exploding outward in a massive ring, thunderstorm ring burst, massive circular lightning detonation with rolling thunder and crackling electric expansion radiating in all directions',
    },
    {
        id: 'boss_thunder_titan_fury',
        boss: 'boss_thunder',
        dir: 'dlc/echos_of_eternity/audio/sounds',
        filename: 'boss_thunder_titan_fury.wav',
        duration: 3.0,
        promptInfluence: 0.4,
        description: 'Thunder titan entering its most devastating phase, colossal thunder god roar with earth-splitting lightning, divine wrath unleashed with titanic thunderclap and surging electrical storm, gods-of-thunder transformation',
    },

    // ── BOSS SPIRIT (Echos of Eternity) ──────────────────────────────────────
    {
        id: 'boss_spirit_orb_fire',
        boss: 'boss_spirit',
        dir: 'dlc/echos_of_eternity/audio/sounds',
        filename: 'boss_spirit_orb_fire.wav',
        duration: 0.5,
        promptInfluence: 0.4,
        description: 'Spirit orb firing a magical bolt, small magical orb discharge, ethereal energy pulse from a floating spirit sphere',
    },
    {
        id: 'boss_spirit_luck_cascade',
        boss: 'boss_spirit',
        dir: 'dlc/echos_of_eternity/audio/sounds',
        filename: 'boss_spirit_luck_cascade.wav',
        duration: 1.8,
        promptInfluence: 0.4,
        description: 'Chaotic luck cascade unleashing random magical bursts in all directions, whimsical but dangerous magical explosion, chaotic fortune energy exploding with twinkling chimes and wild magical discharges',
    },
    {
        id: 'boss_spirit_chaos_nova',
        boss: 'boss_spirit',
        dir: 'dlc/echos_of_eternity/audio/sounds',
        filename: 'boss_spirit_chaos_nova.wav',
        duration: 2.0,
        promptInfluence: 0.4,
        description: 'Eighteen spirit projectiles exploding outward in a chaotic nova, wild magical explosion ring, chaotic fortune energy nova bursting in all directions with mystical crackling and ethereal boom',
    },
    {
        id: 'boss_spirit_chaos_ascendant',
        boss: 'boss_spirit',
        dir: 'dlc/echos_of_eternity/audio/sounds',
        filename: 'boss_spirit_chaos_ascendant.wav',
        duration: 3.0,
        promptInfluence: 0.4,
        description: 'Chaos spirit ascending to maximum power with wild unpredictable energy, ethereal power surge with chaotic magical explosion, fortune spirit transcending with mystical chaos energy burst, whimsical yet terrifying final form activation',
    },
];

// ---------------------------------------------------------------------------
// ElevenLabs Sound Generation via SDK
// ---------------------------------------------------------------------------
function pcmToWav(pcmBuffer, sampleRate = 44100, channels = 1, bitsPerSample = 16) {
    const blockAlign = channels * (bitsPerSample / 8);
    const byteRate = sampleRate * blockAlign;
    const wavHeader = Buffer.alloc(44);

    wavHeader.write('RIFF', 0);
    wavHeader.writeUInt32LE(36 + pcmBuffer.length, 4);
    wavHeader.write('WAVE', 8);
    wavHeader.write('fmt ', 12);
    wavHeader.writeUInt32LE(16, 16);
    wavHeader.writeUInt16LE(1, 20);
    wavHeader.writeUInt16LE(channels, 22);
    wavHeader.writeUInt32LE(sampleRate, 24);
    wavHeader.writeUInt32LE(byteRate, 28);
    wavHeader.writeUInt16LE(blockAlign, 32);
    wavHeader.writeUInt16LE(bitsPerSample, 34);
    wavHeader.write('data', 36);
    wavHeader.writeUInt32LE(pcmBuffer.length, 40);

    return Buffer.concat([wavHeader, pcmBuffer]);
}

async function generateSound(sound) {
    const response = await elevenlabs.textToSoundEffects.convert({
        text: sound.description,
        durationSeconds: sound.duration,
        promptInfluence: sound.promptInfluence,
        outputFormat: 'pcm_44100',
    });

    // Convert response to buffer
    if (response.pipe) {
        // Stream case
        const chunks = [];
        await new Promise((resolve, reject) => {
            response.on('data', chunk => chunks.push(chunk));
            response.on('end', resolve);
            response.on('error', reject);
        });
        return pcmToWav(Buffer.concat(chunks.map(chunk => Buffer.from(chunk))));
    } else if (Buffer.isBuffer(response)) {
        // Buffer case
        return pcmToWav(response);
    } else {
        // Web Stream case
        const chunks = [];
        const reader = response.getReader();
        while (true) {
            const { done, value } = await reader.read();
            if (done) break;
            chunks.push(Buffer.from(value));
        }
        return pcmToWav(Buffer.concat(chunks));
    }
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------
async function main() {
    fs.mkdirSync(OUT_DIR, { recursive: true });

    const filtered = BOSS_FILTER
        ? SOUNDS.filter(s => s.boss === BOSS_FILTER)
        : SOUNDS;

    if (filtered.length === 0) {
        console.error(`No sounds found for boss filter: "${BOSS_FILTER}"`);
        console.error('Available: ' + [...new Set(SOUNDS.map(s => s.boss))].join(', '));
        process.exit(1);
    }

    console.log(`\n🎵 DLC Boss SFX Generator`);
    console.log(`   Target: ${OUT_DIR}`);
    console.log(`   Sounds: ${filtered.length}${BOSS_FILTER ? ` (filtered to boss: ${BOSS_FILTER})` : ''}`);
    if (DRY_RUN) console.log('   Mode:   DRY RUN — no API calls will be made');
    if (FORCE) console.log('   Mode:   FORCE — will regenerate existing files');
    console.log('');

    // Group output by boss for readability
    const bosses = [...new Set(filtered.map(s => s.boss))];
    let generated = 0, skipped = 0, failed = 0;

    for (const boss of bosses) {
        const group = filtered.filter(s => s.boss === boss);
        console.log(`  ── ${boss.toUpperCase().replace(/_/g, ' ')} (${group.length} sounds)`);

        for (const sound of group) {
            const soundDir = sound.dir ? path.join(ROOT, sound.dir) : OUT_DIR;
            fs.mkdirSync(soundDir, { recursive: true });
            const outPath = path.join(soundDir, sound.filename);
            const exists = fs.existsSync(outPath);

            if (exists && !FORCE) {
                console.log(`     [SKIP] ${sound.id}`);
                skipped++;
                continue;
            }

            if (DRY_RUN) {
                console.log(`     [DRY ] ${sound.id} → ${sound.filename} (${sound.duration}s)`);
                generated++;
                continue;
            }

            try {
                process.stdout.write(`     [....] ${sound.id} → ${sound.filename} ...`);
                const buf = await generateSound(sound);
                fs.writeFileSync(outPath, buf);
                process.stdout.write(`\r     [ OK ] ${sound.id} → ${sound.filename} (${(buf.length / 1024).toFixed(0)}KB)\n`);
                generated++;

                // Brief pause to avoid rate limiting
                await new Promise(r => setTimeout(r, 500));
            } catch (err) {
                process.stdout.write(`\r     [FAIL] ${sound.id}: ${err.message}\n`);
                failed++;
            }
        }
        console.log('');
    }

    console.log(`Done.  Generated: ${generated}  Skipped: ${skipped}  Failed: ${failed}`);
    if (failed > 0) process.exit(1);
}

main().catch(err => { console.error(err); process.exit(1); });
