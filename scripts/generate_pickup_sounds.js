#!/usr/bin/env node
/**
 * generate_pickup_sounds.js
 *
 * Generates in-game pickup sound effects via the ElevenLabs Sound Generation API
 * and saves them to audio/sounds/.
 *
 * Usage:
 *   ELEVENLABS_API_KEY=your_key node scripts/generate_pickup_sounds.js
 *
 * Options:
 *   --dry-run   Print what would be generated without calling the API
 *   --force     Regenerate even if the file already exists
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

if (!API_KEY && !DRY_RUN) {
    console.error('\nError: ELEVENLABS_API_KEY environment variable is not set.');
    console.error('  export ELEVENLABS_API_KEY=your_key\n');
    process.exit(1);
}

const elevenlabs = !DRY_RUN ? new ElevenLabsClient({ apiKey: API_KEY }) : null;

// ---------------------------------------------------------------------------
// Sound definitions
// Each entry: { id, filename, duration, promptInfluence, description }
// ---------------------------------------------------------------------------
const SOUNDS = [
    {
        id: 'pickup_heal',
        filename: 'pickup_heal.wav',
        duration: 0.6,
        promptInfluence: 0.4,
        description: 'Soft warm chime arpeggio rising upward, gentle healing magic sound, three airy bell tones ascending in a major chord, restorative and soothing',
    },
    {
        id: 'pickup_maxhp',
        filename: 'pickup_maxhp.wav',
        duration: 0.5,
        promptInfluence: 0.45,
        description: 'Powerfulwarm resonant swell, maximum health expansion sound, rising orchestral shimmer that fades out triumphantly, permanent vitality increase, full and weighty',
    },
    {
        id: 'pickup_speed',
        filename: 'pickup_speed.wav',
        duration: 0.5,
        promptInfluence: 0.45,
        description: 'Quick ascending whoosh sweep with a crisp high-pitched snap at the end, speed boost pickup, fast rising tone from low to high with a snappy finish, energetic and swift',
    },
    {
        id: 'pickup_multi',
        filename: 'pickup_multi.wav',
        duration: 0.5,
        promptInfluence: 0.45,
        description: 'Three rapid staccato pings in quick succession rising in pitch, multi-shot power-up sound, triple burst of short crisp tones, playful and percussive',
    },
    {
        id: 'pickup_autoaim',
        filename: 'pickup_autoaim.wav',
        duration: 0.6,
        promptInfluence: 0.4,
        description: 'Sci-fi targeting lock-on confirmation beep, electronic ping that settles into a clean tone, precision targeting acquired sound, electronic lock chime with a brief modulated swoosh',
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

    console.log(`\n🎵 Pickup SFX Generator`);
    console.log(`   Target: ${OUT_DIR}`);
    console.log(`   Sounds: ${SOUNDS.length}`);
    if (DRY_RUN) console.log('   Mode:   DRY RUN — no API calls will be made');
    if (FORCE) console.log('   Mode:   FORCE — will regenerate existing files');
    console.log('');

    let generated = 0, skipped = 0, failed = 0;

    for (const sound of SOUNDS) {
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
