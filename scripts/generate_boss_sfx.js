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

    // ── SHADOW CLONE (Symphony of Sickness) ─────────────────────────────────
    {
        id: 'shadow_step_vanish',
        boss: 'shadow_clone',
        filename: 'boss_shadow_step_vanish.wav',
        duration: 0.6,
        promptInfluence: 0.4,
        description: 'Dark whoosh as something disappears into shadow, deep void bass pop with a trailing darkness hiss',
    },
    {
        id: 'shadow_step_reappear',
        boss: 'shadow_clone',
        filename: 'boss_shadow_step_reappear.wav',
        duration: 0.7,
        promptInfluence: 0.4,
        description: 'Heavy thud impact as a dark entity materialises from shadow, deep bass thump with brief crackling void energy',
    },
    {
        id: 'shadow_trail_tick',
        boss: 'shadow_clone',
        filename: 'boss_shadow_trail_tick.wav',
        duration: 0.5,
        promptInfluence: 0.3,
        description: 'Single brief dark pulse hiss, quiet shadow energy flicker, very subtle whoosh',
    },
    {
        id: 'shadow_fan_shot',
        boss: 'shadow_clone',
        filename: 'boss_shadow_fan_shot.wav',
        duration: 0.5,
        promptInfluence: 0.4,
        description: 'Five dark energy bolts fired in rapid succession, fanning out, dark whooshes in quick burst',
    },
    {
        id: 'shadow_phase_transition',
        boss: 'shadow_clone',
        filename: 'boss_shadow_phase_transition.wav',
        duration: 2.2,
        promptInfluence: 0.4,
        description: 'Deep ominous void rumble building into a violent dark energy explosion, low frequency bass surge with crackling purple energy, foreboding transformation sound',
    },
    {
        id: 'dark_pulse_ring',
        boss: 'shadow_clone',
        filename: 'boss_dark_pulse_ring.wav',
        duration: 1.5,
        promptInfluence: 0.4,
        description: 'Expanding ring of dark void orbs radiating outward, low resonant boom with a long dark energy tail, deep bass pulse wave',
    },

    // ── MIMIC KING (Faith of Fortune) ───────────────────────────────────────
    {
        id: 'wheel_tick',
        boss: 'mimic_king',
        filename: 'boss_wheel_tick.wav',
        duration: 0.5,
        promptInfluence: 0.5,
        description: 'Single mechanical ratchet click, slot machine gear tick, crisp metal click',
    },
    {
        id: 'wheel_spin_start',
        boss: 'mimic_king',
        filename: 'boss_wheel_spin_start.wav',
        duration: 1.2,
        promptInfluence: 0.5,
        description: 'Slot machine wheel spinning up, rapid ratcheting mechanical clicks accelerating, carnival wheel of fortune spinning',
    },
    {
        id: 'wheel_land',
        boss: 'mimic_king',
        filename: 'boss_wheel_land.wav',
        duration: 0.6,
        promptInfluence: 0.5,
        description: 'Carnival wheel of fortune landing, satisfying mechanical clunk as ratchet stops, slot machine result reveal click',
    },
    {
        id: 'gambit_jackpot',
        boss: 'mimic_king',
        filename: 'boss_gambit_jackpot.wav',
        duration: 0.9,
        promptInfluence: 0.5,
        description: 'Slot machine jackpot fanfare chime, celebratory coin sounds, bright ascending ding ding ding winning sound',
    },
    {
        id: 'gambit_nothing',
        boss: 'mimic_king',
        filename: 'boss_gambit_nothing.wav',
        duration: 0.6,
        promptInfluence: 0.5,
        description: 'Comedic failure sound, deflating sad trombone, brief wah-wah descending musical fail stinger',
    },
    {
        id: 'mimic_nova_burst',
        boss: 'mimic_king',
        filename: 'boss_mimic_nova.wav',
        duration: 1.2,
        promptInfluence: 0.4,
        description: 'Ten magical orbs exploding outward in all directions simultaneously, golden energy burst with sparkle, magical radial explosion bloom',
    },
    {
        id: 'mimic_spiral_arms',
        boss: 'mimic_king',
        filename: 'boss_mimic_spiral.wav',
        duration: 1.5,
        promptInfluence: 0.4,
        description: 'Three rotating magical arms firing projectiles in a spiral pattern, sustained spinning magical whoosh with rhythmic energy pulses',
    },
    {
        id: 'mimic_copy_hit',
        boss: 'mimic_king',
        filename: 'boss_mimic_copy.wav',
        duration: 0.7,
        promptInfluence: 0.5,
        description: 'Mirror shattering resonance, magical copy sound, glass-like chime shatter combined with a brief magical sting',
    },
    {
        id: 'mimic_phase2_transition',
        boss: 'mimic_king',
        filename: 'boss_mimic_phase2.wav',
        duration: 2.0,
        promptInfluence: 0.4,
        description: 'Ornate mirror shattering dramatically, glass breaking with golden magical resonance, followed by an eerie laugh-like chime, theatrical reveal',
    },
    {
        id: 'mimic_phase3_transition',
        boss: 'mimic_king',
        filename: 'boss_mimic_phase3.wav',
        duration: 2.5,
        promptInfluence: 0.4,
        description: 'Loud crack of a golden mask breaking apart, deep distorted shatter with warped resonance, dramatic magical collapse sound, unsettling shift',
    },

    // ── CLOUD GOLEM (Waker of Winds) ─────────────────────────────────────────
    {
        id: 'gust_push',
        boss: 'cloud_golem',
        filename: 'boss_gust_push.wav',
        duration: 0.6,
        promptInfluence: 0.5,
        description: 'Sharp concentrated wind burst, sudden strong gust blast, short powerful whoosh of air',
    },
    {
        id: 'hailstorm_burst',
        boss: 'cloud_golem',
        filename: 'boss_hailstorm_burst.wav',
        duration: 1.5,
        promptInfluence: 0.5,
        description: 'Hailstones pelting rapidly, ice pellets clattering and ricocheting, sharp icy patter, staccato ice impacts',
    },
    {
        id: 'cloud_golem_stomp',
        boss: 'cloud_golem',
        filename: 'boss_cloud_golem_stomp.wav',
        duration: 2.0,
        promptInfluence: 0.5,
        description: 'Massive stone golem ground slam, deep heavy impact causing a shockwave, loud rumbling crash with stone-on-earth bass thud, ground tremor',
    },

    // ── STORM CROW (Waker of Winds) ───────────────────────────────────────────
    {
        id: 'crow_dive_screech',
        boss: 'storm_crow',
        filename: 'boss_crow_dive_screech.wav',
        duration: 1.2,
        promptInfluence: 0.5,
        description: 'Enormous bird of prey diving screech, raptor war cry, massive wings cutting air, terrifying screaming bird screech with wind rush',
    },
    {
        id: 'screech_land',
        boss: 'storm_crow',
        filename: 'boss_crow_screech_land.wav',
        duration: 0.8,
        promptInfluence: 0.5,
        description: 'Sharp bird of prey screech on landing impact, talon strike with shockwave, piercing raptor cry with ground impact thud',
    },

    // ── TORNADO MACHINA (Waker of Winds) ──────────────────────────────────────
    {
        id: 'tornado_projectile_spawn',
        boss: 'tornado_machina',
        filename: 'boss_tornado_spawn.wav',
        duration: 0.5,
        promptInfluence: 0.4,
        description: 'Mechanical wind-up click as a tornado projectile launches, brief spinning mechanical tick combined with a short air burst',
    },
    {
        id: 'spin_dash',
        boss: 'tornado_machina',
        filename: 'boss_tornado_spin_dash.wav',
        duration: 1.5,
        promptInfluence: 0.5,
        description: 'Giant turbine revving to maximum speed, high-pitched mechanical spin-up whirr followed by a violent acceleration burst, industrial fan at full power',
    },

    // ── TEMPEST (Waker of Winds — final boss) ────────────────────────────────
    {
        id: 'vortex_pull',
        boss: 'tempest',
        filename: 'boss_vortex_pull.wav',
        duration: 2.5,
        promptInfluence: 0.5,
        description: 'Deep vortex suction pulling inward, atmospheric whoosh of air rushing toward a central point, like being sucked into a tornado eye, deep low-frequency inward roar',
    },
    {
        id: 'eye_of_storm_ring',
        boss: 'tempest',
        filename: 'boss_eye_storm_ring.wav',
        duration: 2.0,
        promptInfluence: 0.5,
        description: 'Sixteen projectiles exploding outward in a ring of howling wind, expanding circular storm burst with a trailing howl, violent outward wind ring',
    },
    {
        id: 'tempest_phase2_transition',
        boss: 'tempest',
        filename: 'boss_tempest_phase2.wav',
        duration: 3.0,
        promptInfluence: 0.4,
        description: 'Titanic storm intensifying dramatically, the eye of a hurricane opening, explosive wind surge building to a massive climactic gale, violent atmospheric shift',
    },

    // ── ZEUS (Tournament of Thunder) ─────────────────────────────────────────
    {
        id: 'thunder_spear_telegraph',
        boss: 'zeus',
        filename: 'boss_thunder_spear_telegraph.wav',
        duration: 1.2,
        promptInfluence: 0.5,
        description: 'Electrical charge building up, crackling high voltage building to a crescendo before discharge, buzzing and crackling electricity charging',
    },
    {
        id: 'thunder_spear_launch',
        boss: 'zeus',
        filename: 'boss_thunder_spear_launch.wav',
        duration: 0.6,
        promptInfluence: 0.5,
        description: 'Lightning bolt fired at extreme speed, fast electric snap and crack, sharp thunderclap discharge whoosh',
    },
    {
        id: 'zeus_storm_ring',
        boss: 'zeus',
        filename: 'boss_zeus_storm_ring.wav',
        duration: 1.5,
        promptInfluence: 0.5,
        description: 'Lightning ring expanding outward in all directions, rolling thunder with multiple electric discharges radiating, circular lightning burst',
    },
    {
        id: 'zeus_static_field',
        boss: 'zeus',
        filename: 'boss_zeus_static_field.wav',
        duration: 0.7,
        promptInfluence: 0.5,
        description: 'Electrical trap placed on ground, static electricity hum as a lightning mine is set, zap and buzz of a static field activating',
    },
    {
        id: 'wrath_of_olympus',
        boss: 'zeus',
        filename: 'boss_wrath_olympus.wav',
        duration: 5.0,
        promptInfluence: 0.4,
        description: 'Massive sustained lightning barrage, five consecutive volleys of thunderbolts firing over four seconds, divine retribution from the sky, rolling thunder with intense electric discharges escalating in intensity',
    },
    {
        id: 'zeus_phase2_transition',
        boss: 'zeus',
        filename: 'boss_zeus_phase2.wav',
        duration: 2.0,
        promptInfluence: 0.4,
        description: 'Dramatic thunder boom as a god of lightning declares dominance, massive thunderclap with reverberating electrical discharge, epic dramatic thunder strike',
    },
    {
        id: 'zeus_phase3_transition',
        boss: 'zeus',
        filename: 'boss_zeus_phase3.wav',
        duration: 2.5,
        promptInfluence: 0.4,
        description: 'The most powerful thunderbolt in existence unleashed, earth-shaking thunder crack with violent electrical surge, god-tier lightning detonation',
    },
    {
        id: 'zeus_teleport_flash',
        boss: 'zeus',
        filename: 'boss_zeus_teleport.wav',
        duration: 0.5,
        promptInfluence: 0.5,
        description: 'Electric pop and snap as lightning teleports, brief explosive electrical discharge, lightning flash sound effect',
    },

    // ── DARK GOLEM (Rise of the Rock) ────────────────────────────────────────
    {
        id: 'dark_golem_boulder',
        boss: 'dark_golem',
        filename: 'boss_dark_golem_boulder.wav',
        duration: 0.7,
        promptInfluence: 0.5,
        description: 'Large boulder being hurled, heavy stone projectile whooshing through air, massive rock thrown with deep stone scraping sound',
    },
    {
        id: 'dark_golem_slam',
        boss: 'dark_golem',
        filename: 'boss_dark_golem_slam.wav',
        duration: 2.0,
        promptInfluence: 0.5,
        description: 'Gigantic obsidian fist slamming into the ground, cataclysmic stone impact with shockwave, earth shattering ground pound, massive rubble explosion',
    },
    {
        id: 'dark_golem_lava',
        boss: 'dark_golem',
        filename: 'boss_dark_golem_lava.wav',
        duration: 1.5,
        promptInfluence: 0.5,
        description: 'Molten lava erupting and spewing, viscous hot liquid bursting from stone cracks, volcanic sizzle and bubble with hissing steam',
    },
    {
        id: 'dark_golem_crack',
        boss: 'dark_golem',
        filename: 'boss_dark_golem_crack.wav',
        duration: 2.0,
        promptInfluence: 0.5,
        description: 'Massive obsidian stone cracking apart to reveal lava within, deep stone fracture crack and rumble, lava breaking through rock with hiss and explosion',
    },
    {
        id: 'dark_golem_charge',
        boss: 'dark_golem',
        filename: 'boss_dark_golem_charge.wav',
        duration: 0.9,
        promptInfluence: 0.5,
        description: 'Massive stone golem beginning to charge, heavy rumbling stone footsteps rapidly accelerating, ground shaking as a colossus builds momentum',
    },
    {
        id: 'dark_golem_berserk',
        boss: 'dark_golem',
        filename: 'boss_dark_golem_berserk.wav',
        duration: 3.0,
        promptInfluence: 0.4,
        description: 'Colossal stone golem entering berserk rage, deep lava-fuelled roar, stone and fire explosion, magma surging through cracks, earth trembling with violent volcanic fury',
    },

    // ── VOID WALKER BOSS (Champions of Chaos) ────────────────────────────────
    {
        id: 'void_bolt',
        boss: 'void_walker_boss',
        filename: 'boss_void_bolt.wav',
        duration: 0.5,
        promptInfluence: 0.4,
        description: 'Dark void energy projectile fired, deep bass void pulse shot, dark matter bolt discharge',
    },
    {
        id: 'void_pulse_ring',
        boss: 'void_walker_boss',
        filename: 'boss_void_pulse_ring.wav',
        duration: 1.5,
        promptInfluence: 0.4,
        description: 'Twelve void energy orbs expanding outward simultaneously, low resonant void explosion with deep bass ring, darkness radiating outward',
    },
    {
        id: 'dimensional_rift',
        boss: 'void_walker_boss',
        filename: 'boss_dimensional_rift.wav',
        duration: 1.0,
        promptInfluence: 0.4,
        description: 'Dimensional portal tearing open, reality ripping apart briefly, void rift opening and closing with distorted spatial sound effect',
    },
    {
        id: 'void_phase_in',
        boss: 'void_walker_boss',
        filename: 'boss_void_phase_in.wav',
        duration: 0.7,
        promptInfluence: 0.4,
        description: 'Entity phasing back into reality from void, dark energy solidifying, void portal closing with deep bass thud and crackling darkness',
    },
    {
        id: 'void_phase_out',
        boss: 'void_walker_boss',
        filename: 'boss_void_phase_out.wav',
        duration: 0.7,
        promptInfluence: 0.4,
        description: 'Entity dissolving into void and becoming intangible, whooshing dark energy as something phases out of reality, fading void hiss',
    },
    {
        id: 'void_gravity_pull',
        boss: 'void_walker_boss',
        filename: 'boss_void_gravity_pull.wav',
        duration: 2.0,
        promptInfluence: 0.5,
        description: 'Gravitational void pull dragging something toward a singularity, deep low-frequency inward suction, tearing spatial sound as gravity warps',
    },
    {
        id: 'void_storm',
        boss: 'void_walker_boss',
        filename: 'boss_void_storm.wav',
        duration: 2.0,
        promptInfluence: 0.4,
        description: 'Twenty-four void projectiles erupting outward simultaneously, massive void explosion bloom, deep bass ring of dark energy expanding violently',
    },

    // ── GLITCH BOSS (Champions of Chaos) ─────────────────────────────────────
    {
        id: 'glitch_teleport',
        boss: 'glitch_boss',
        filename: 'boss_glitch_teleport.wav',
        duration: 0.5,
        promptInfluence: 0.5,
        description: 'Digital glitch teleport, corrupted data blip, electronic pop with static distortion, error sound effect',
    },
    {
        id: 'glitch_corruption_beam',
        boss: 'glitch_boss',
        filename: 'boss_glitch_beam.wav',
        duration: 0.8,
        promptInfluence: 0.5,
        description: 'Rapid digital corruption beam firing, five quick electronic laser shots in rapid succession, corrupted data stream sound',
    },
    {
        id: 'glitch_fragmentation',
        boss: 'glitch_boss',
        filename: 'boss_glitch_fragment.wav',
        duration: 1.5,
        promptInfluence: 0.5,
        description: 'Digital entity fragmenting into multiple copies, glitching data corruption sound, electronic fragmentation with pixel scatter and static burst',
    },
    {
        id: 'glitch_system_crash',
        boss: 'glitch_boss',
        filename: 'boss_glitch_crash.wav',
        duration: 1.5,
        promptInfluence: 0.5,
        description: 'System crash error sound with massive glitch burst, digital catastrophic failure explosion, corrupted data explosion with harsh electronic noise',
    },

    // ── ENTROPY LORD (Champions of Chaos — superboss) ────────────────────────
    {
        id: 'entropy_surge',
        boss: 'entropy_lord',
        filename: 'boss_entropy_surge.wav',
        duration: 1.5,
        promptInfluence: 0.4,
        description: 'Twelve chaos magic projectiles exploding outward in all directions simultaneously, entropy energy nova ring, chaotic magical explosion burst',
    },
    {
        id: 'chaos_storm',
        boss: 'entropy_lord',
        filename: 'boss_chaos_storm.wav',
        duration: 3.0,
        promptInfluence: 0.4,
        description: 'Three rotating rings of chaotic energy erupting in sequence two hundred milliseconds apart, chaotic magical storm volley, swirling entropy explosion waves',
    },
    {
        id: 'entropy_phase2_transition',
        boss: 'entropy_lord',
        filename: 'boss_entropy_phase2.wav',
        duration: 2.0,
        promptInfluence: 0.4,
        description: 'Entropy accelerating dramatically, chaotic magical surge, reality destabilising with crackling multi-colour energy explosion, dangerous power increase',
    },
    {
        id: 'entropy_phase3_transition',
        boss: 'entropy_lord',
        filename: 'boss_entropy_phase3.wav',
        duration: 3.0,
        promptInfluence: 0.4,
        description: 'Total entropy unleashed, apocalyptic chaos explosion, reality fracturing with multiple simultaneous magical detonations, supreme villain power surge',
    },
    {
        id: 'shield_orb_hit',
        boss: 'entropy_lord',
        filename: 'boss_shield_orb_hit.wav',
        duration: 0.5,
        promptInfluence: 0.4,
        description: 'Purple magical shield orb striking something, brief magical impact sting, small energy orb collision pulse',
    },
    {
        id: 'entropy_teleport',
        boss: 'entropy_lord',
        filename: 'boss_entropy_teleport.wav',
        duration: 0.6,
        promptInfluence: 0.4,
        description: 'Chaos mage teleporting away with a burst of purple energy, magical displacement pop, brief chaotic energy warp sound',
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
            const outPath = path.join(OUT_DIR, sound.filename);
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
