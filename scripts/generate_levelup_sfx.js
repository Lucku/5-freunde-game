#!/usr/bin/env node
/**
 * generate_levelup_sfx.js
 *
 * Generates a unique 2-second level-up sound effect for each hero via the
 * ElevenLabs Sound Generation API and saves them to audio/sounds/.
 *
 * Sound reflects each hero's elemental nature (fire crackle, ice chime, etc.)
 *
 * Usage:
 *   ELEVENLABS_API_KEY=your_key node scripts/generate_levelup_sfx.js
 *
 * Options:
 *   --dry-run          Print what would be generated without calling the API
 *   --force            Regenerate even if the file already exists
 *   --hero=<name>      Only generate for one specific hero
 */

'use strict';
const fs = require('fs');
const path = require('path');
const { ElevenLabsClient } = require('@elevenlabs/elevenlabs-js');

const API_KEY = process.env.ELEVENLABS_API_KEY;
const ROOT = path.resolve(__dirname, '..');
const OUT_DIR = path.join(ROOT, 'audio', 'sounds');

const args = process.argv.slice(2);
const DRY_RUN = args.includes('--dry-run');
const FORCE = args.includes('--force');
const HERO_FILTER = (args.find(a => a.startsWith('--hero=')) || '').replace('--hero=', '') || null;

if (!API_KEY && !DRY_RUN) {
    console.error('\nError: ELEVENLABS_API_KEY environment variable is not set.');
    console.error('  export ELEVENLABS_API_KEY=your_key\n');
    process.exit(1);
}

const elevenlabs = !DRY_RUN ? new ElevenLabsClient({ apiKey: API_KEY }) : null;

// ---------------------------------------------------------------------------
// Sound definitions — one per hero
// Each entry: { id, filename, duration, promptInfluence, description }
// ---------------------------------------------------------------------------
const SOUNDS = [
    {
        id: 'level_up_fire',
        filename: 'level_up_fire.wav',
        duration: 2.0,
        promptInfluence: 0.45,
        description: 'Heroic fire level-up fanfare — a burst of roaring flames whooshes upward, rising into a triumphant crackling inferno crescendo, hot embers sparkling and swirling, powerful and energetic, intense heat surge, ends on a bold fiery peak',
    },
    {
        id: 'level_up_water',
        filename: 'level_up_water.wav',
        duration: 2.0,
        promptInfluence: 0.4,
        description: 'Flowing water level-up chime — a rushing wave swells from deep to surface, oceanic resonance building into a bright liquid cascade of rising tones, cool and fluid, crystalline water droplets harmonizing into a majestic aquatic fanfare',
    },
    {
        id: 'level_up_ice',
        filename: 'level_up_ice.wav',
        duration: 2.0,
        promptInfluence: 0.4,
        description: 'Icy crystal level-up chime — shimmering frost fanfare, high crystalline bells cascading upward in a sparkling arpeggio, sharp and pristine, ice cracking and reforming into glittering shards, ethereal frozen resonance that ends on a pure ringing note',
    },
    {
        id: 'level_up_plant',
        filename: 'level_up_plant.wav',
        duration: 2.0,
        promptInfluence: 0.4,
        description: 'Nature level-up flourish — organic bloom of life, leaves rustling and vines growing rapidly, warm wooden flute melody rising, birds chirping in harmony, a lush forest awakening, earthy and alive, ends with a verdant resonant tone full of natural energy',
    },
    {
        id: 'level_up_metal',
        filename: 'level_up_metal.wav',
        duration: 2.0,
        promptInfluence: 0.45,
        description: 'Metal hero level-up upgrade — industrial mechanical power surge, heavy steel clank followed by rising harmonic resonance, machinery spinning up to full power, metallic ringing harmonics layering into a bold armored fanfare, sturdy and authoritative',
    },
    {
        id: 'level_up_black',
        filename: 'level_up_black.wav',
        duration: 2.0,
        promptInfluence: 0.45,
        description: 'Dark hero level-up — shadow power awakening, deep sinister whoosh rising from the abyss, dark resonant chord swelling with ominous grandeur, shadowy echoes layering, mysterious and foreboding, ends on a powerful deep drone with dark mystical energy',
    },
    {
        id: 'level_up_air',
        filename: 'level_up_air.wav',
        duration: 2.0,
        promptInfluence: 0.4,
        description: 'Wind hero level-up — swift breeze that builds into a soaring gale, airy whistling tones rising skyward in a spiraling ascent, light and fast, a playful whirlwind of musical tones culminating in a clear high gust of wind, free and uplifting',
    },
    {
        id: 'level_up_void',
        filename: 'level_up_void.wav',
        duration: 2.0,
        promptInfluence: 0.45,
        description: 'Void hero level-up — eerie spacial expansion, deep cosmic hum resonating from the emptiness, reality warping with a low drone that stretches outward, alien harmonics drifting through nothingness, otherworldly and hollow, ends on a vast open silence-breaking resonance',
    },
    {
        id: 'level_up_spirit',
        filename: 'level_up_spirit.wav',
        duration: 2.0,
        promptInfluence: 0.4,
        description: 'Spirit hero level-up — ethereal spiritual awakening, ghostly choir of harmonic voices ascending, sacred bells chiming in a gentle rising progression, soft and transcendent, inner peace expanding outward, ends with a luminous sustained chord full of spiritual warmth',
    },
    {
        id: 'level_up_chance',
        filename: 'level_up_chance.wav',
        duration: 2.0,
        promptInfluence: 0.4,
        description: 'Luck hero level-up — fortune favors the bold, bright casino-style lucky jingle with sparkling magical chimes, coin-toss shimmer effect, playful and whimsical, ascending major-key arpeggio with a triumphant lucky sparkle at the peak',
    },
    {
        id: 'level_up_sound',
        filename: 'level_up_sound.wav',
        duration: 2.0,
        promptInfluence: 0.4,
        description: 'Sound hero level-up — musical power ascending, orchestral fanfare building from a single note into a full harmonic swell, resonant waves of layered tones expanding, musical and vibrant, ends with a triumphant chord that reverberates with pure sonic energy',
    },
    {
        id: 'level_up_poison',
        filename: 'level_up_poison.wav',
        duration: 2.0,
        promptInfluence: 0.45,
        description: 'Poison hero level-up — sinister organic growth, dark bubbling toxin spreading, eerie chromatic melody with a venomous hiss, acidic dripping sounds layering into a warped ascending tone, unsettling and dangerous, ends on a potent ominous swell',
    },
    {
        id: 'level_up_gravity',
        filename: 'level_up_gravity.wav',
        duration: 2.0,
        promptInfluence: 0.45,
        description: 'Gravity hero level-up — massive gravitational pull intensifying, deep rumbling bass swell as gravity warps, a heavy compression wave that draws all sound inward before a powerful release, weighty and inevitable, ends with a resonant low-frequency boom',
    },
    {
        id: 'level_up_earth',
        filename: 'level_up_earth.wav',
        duration: 2.0,
        promptInfluence: 0.45,
        description: 'Earth hero level-up — seismic tremor rising, stones cracking and rumbling as the ground heaves, deep tectonic resonance building into a mountain-shaking crescendo, massive boulders grinding with harmonic resonance, ends on an immovable bedrock drone',
    },
    {
        id: 'level_up_lightning',
        filename: 'level_up_lightning.wav',
        duration: 2.0,
        promptInfluence: 0.45,
        description: 'Lightning hero level-up — electric surge crackling to life, high-voltage discharge building rapidly, sharp static crackle leading to a massive thunderbolt strike, electric energy arcing in bright staccato bursts, ends with a charged resonant buzz fading out',
    },
    {
        id: 'level_up_time',
        filename: 'level_up_time.wav',
        duration: 2.0,
        promptInfluence: 0.4,
        description: 'Time hero level-up — temporal power expanding, clockwork ticking that accelerates into a time-bending whoosh, past and future echoing simultaneously, musical tones playing forward and backward at once, ends with a resonant chime like a clock striking a new hour',
    },
    {
        id: 'level_up_love',
        filename: 'level_up_love.wav',
        duration: 2.0,
        promptInfluence: 0.4,
        description: 'Love hero level-up — heartfelt power swelling, warm resonant heartbeat building into a romantic orchestral swell, gentle bells chiming in a harmonious major progression, full of warmth and hope, ends with a glowing sustained chord full of tender emotional energy',
    },
    {
        id: 'level_up_green_goblin',
        filename: 'level_up_green_goblin.wav',
        duration: 2.0,
        promptInfluence: 0.45,
        description: 'Green Goblin villain level-up — manic cackling electronic surge, chaotic carnival organ sting with frenzied arpeggios, deranged and playfully evil, wild unpredictable musical energy, ends with a triumphant sinister jingle full of villainous delight',
    },
    {
        id: 'level_up_makuta',
        filename: 'level_up_makuta.wav',
        duration: 2.0,
        promptInfluence: 0.5,
        description: 'Makuta villain level-up — ancient dark power awakening, deep ominous booming chord resonating from shadow, massive low-frequency drone with shadow energy pulsing, dark and overwhelming, a god of darkness growing stronger, ends with a terrifying sustained bass roar',
    },
];

// ---------------------------------------------------------------------------
// ElevenLabs Sound Generation
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

    if (response.pipe) {
        const chunks = [];
        await new Promise((resolve, reject) => {
            response.on('data', chunk => chunks.push(chunk));
            response.on('end', resolve);
            response.on('error', reject);
        });
        return pcmToWav(Buffer.concat(chunks.map(chunk => Buffer.from(chunk))));
    } else if (Buffer.isBuffer(response)) {
        return pcmToWav(response);
    } else {
        // Web Stream
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

    const sounds = HERO_FILTER
        ? SOUNDS.filter(s => s.id === `level_up_${HERO_FILTER}`)
        : SOUNDS;

    if (HERO_FILTER && sounds.length === 0) {
        console.error(`\nError: no hero named "${HERO_FILTER}". Valid names: ${SOUNDS.map(s => s.id.replace('level_up_', '')).join(', ')}`);
        process.exit(1);
    }

    console.log(`\n🎵 Hero Level-Up SFX Generator`);
    console.log(`   Target: ${OUT_DIR}`);
    console.log(`   Heroes: ${sounds.length}`);
    if (DRY_RUN) console.log('   Mode:   DRY RUN — no API calls will be made');
    if (FORCE)   console.log('   Mode:   FORCE — will regenerate existing files');
    console.log('');

    let generated = 0, skipped = 0, failed = 0;

    for (const sound of sounds) {
        const outPath = path.join(OUT_DIR, sound.filename);
        const exists = fs.existsSync(outPath);

        if (exists && !FORCE) {
            console.log(`  [SKIP] ${sound.id}`);
            skipped++;
            continue;
        }

        if (DRY_RUN) {
            console.log(`  [DRY ] ${sound.id} → ${sound.filename} (${sound.duration}s)`);
            generated++;
            continue;
        }

        try {
            process.stdout.write(`  [....] ${sound.id} → ${sound.filename} ...`);
            const buf = await generateSound(sound);
            fs.writeFileSync(outPath, buf);
            process.stdout.write(`\r  [ OK ] ${sound.id} → ${sound.filename} (${(buf.length / 1024).toFixed(0)}KB)\n`);
            generated++;

            // Brief pause to avoid rate limiting
            await new Promise(r => setTimeout(r, 500));
        } catch (err) {
            process.stdout.write(`\r  [FAIL] ${sound.id}: ${err.message}\n`);
            failed++;
        }
    }

    console.log(`\nDone.  Generated: ${generated}  Skipped: ${skipped}  Failed: ${failed}`);
    if (failed > 0) process.exit(1);
}

main().catch(err => { console.error(err); process.exit(1); });
