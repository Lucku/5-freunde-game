#!/usr/bin/env node
/**
 * generate_weather_sfx.js
 *
 * Generates ambient weather sound loops via the ElevenLabs Sound Generation API
 * and saves them to audio/sounds/.
 *
 * Usage:
 *   ELEVENLABS_API_KEY=your_key node scripts/generate_weather_sfx.js
 *
 * Options:
 *   --weather <id>  Only generate sounds for a specific weather (e.g. --weather sandstorm)
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
const WEATHER_FILTER = (() => { const i = args.indexOf('--weather'); return i !== -1 ? args[i + 1] : null; })();

if (!API_KEY && !DRY_RUN) {
    console.error('\nError: ELEVENLABS_API_KEY environment variable is not set.');
    console.error('  export ELEVENLABS_API_KEY=your_key\n');
    process.exit(1);
}

// Initialize ElevenLabs client
const elevenlabs = !DRY_RUN ? new ElevenLabsClient({ apiKey: API_KEY }) : null;

// ---------------------------------------------------------------------------
// Sound definitions
// Each entry: { id, weather, filename, duration, promptInfluence, description }
//   id              → AudioManager key (must match 'weather_' + WEATHER_TYPE.id.toLowerCase())
//   weather         → logical group (for --weather filter)
//   filename        → relative to audio/sounds/
//   duration        → seconds (0.5–22)
//   promptInfluence → 0–1 (0.3 = balanced, 0.5 = more literal)
//   description     → ElevenLabs text prompt
// ---------------------------------------------------------------------------
const SOUNDS = [

    // ── SANDSTORM ─────────────────────────────────────────────────────────────
    {
        id: 'weather_sandstorm',
        weather: 'sandstorm',
        filename: 'weather_sandstorm.wav',
        duration: 8.0,
        promptInfluence: 0.3,
        description: 'Desert sandstorm ambience loop, fierce wind carrying thick waves of sand and grit, deep roaring gusts with hissing sand grains sweeping across arid terrain, relentless dry storm atmosphere',
    },

    // ── ACIDIC FOG ────────────────────────────────────────────────────────────
    {
        id: 'weather_acidic_fog',
        weather: 'acidic_fog',
        filename: 'weather_acidic_fog.wav',
        duration: 8.0,
        promptInfluence: 0.3,
        description: 'Eerie acidic fog ambience loop, slow bubbling and hissing of corrosive mist, unsettling low drones with occasional soft dripping and chemical sizzling sounds, toxic swamp atmosphere',
    },

    // ── GALE ──────────────────────────────────────────────────────────────────
    {
        id: 'weather_gale',
        weather: 'gale',
        filename: 'weather_gale.wav',
        duration: 8.0,
        promptInfluence: 0.3,
        description: 'Powerful gale force wind ambience loop, howling high-speed gusts roaring across open landscape, deep turbulent air whoosh with whistling tones, strong wind buffeting and swirling, dramatic storm wind loop',
    },

];

// ---------------------------------------------------------------------------
// Generate
// ---------------------------------------------------------------------------
async function generate(sound) {
    const outPath = path.join(OUT_DIR, sound.filename);

    if (!FORCE && fs.existsSync(outPath)) {
        console.log(`  [SKIP] ${sound.filename} already exists (use --force to regenerate)`);
        return;
    }

    if (DRY_RUN) {
        console.log(`  [DRY]  Would generate: ${sound.filename}`);
        console.log(`         Prompt: "${sound.description}"`);
        console.log(`         Duration: ${sound.duration}s  Influence: ${sound.promptInfluence}`);
        return;
    }

    console.log(`  [GEN]  ${sound.filename} ...`);
    try {
        const result = await elevenlabs.textToSoundEffects.convert({
            text: sound.description,
            duration_seconds: sound.duration,
            prompt_influence: sound.promptInfluence,
        });

        const chunks = [];
        for await (const chunk of result) {
            chunks.push(chunk instanceof Buffer ? chunk : Buffer.from(chunk));
        }
        fs.writeFileSync(outPath, Buffer.concat(chunks));
        console.log(`  [OK]   Saved → ${path.relative(ROOT, outPath)}`);
    } catch (err) {
        console.error(`  [ERR]  ${sound.filename}: ${err.message}`);
    }
}

async function main() {
    const filtered = WEATHER_FILTER
        ? SOUNDS.filter(s => s.weather === WEATHER_FILTER)
        : SOUNDS;

    if (filtered.length === 0) {
        console.error(`No sounds found for weather "${WEATHER_FILTER}".`);
        console.error('Available: ' + [...new Set(SOUNDS.map(s => s.weather))].join(', '));
        process.exit(1);
    }

    console.log(`\nWeather SFX Generator — ${DRY_RUN ? 'DRY RUN' : 'LIVE'}`);
    console.log(`Output: ${OUT_DIR}\n`);

    for (const sound of filtered) {
        await generate(sound);
    }

    console.log('\nDone.\n');
}

main().catch(err => {
    console.error('Fatal:', err);
    process.exit(1);
});
