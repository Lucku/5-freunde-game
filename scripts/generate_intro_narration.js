// generate_intro_narration.js
// Generates the story intro narration audio played on the intro screen
// before the main menu.
//
// Output:  audio/intro/story_intro.mp3
// Run:     ELEVENLABS_API_KEY=xxx node scripts/generate_intro_narration.js
//
// Voice: Uses a deep, measured narrator voice.
// Change NARRATOR_VOICE_ID to any ElevenLabs voice suitable for dramatic narration.
// Default: Makuta's voice (bwCXcoVxWNYMlC6Esa8u) — deep and authoritative.

'use strict';

const fs = require('fs');
const path = require('path');
const { Readable } = require('stream');
const { ElevenLabsClient } = require('@elevenlabs/elevenlabs-js');

// ── Config ─────────────────────────────────────────────────────────────────────
const API_KEY = process.env.ELEVENLABS_API_KEY;
const MODEL_ID = 'eleven_multilingual_v2';

// Deep narrator voice — swap for any ElevenLabs voice ID you prefer
const NARRATOR_VOICE_ID = 'JBFqnCBsd6RMkjVDRZzb'; // Makuta (deep, measured)

const OUTPUT_DIR = path.join(__dirname, '../audio/intro');
const OUTPUT_FILE = path.join(OUTPUT_DIR, 'story_intro.mp3');

// ── Narration text ─────────────────────────────────────────────────────────────
// This text matches what is displayed on screen.
// Punctuation is tuned for natural TTS pacing.
const NARRATION_TEXT = `\
Heroes are not born. They are chosen.

Five friends. One ordinary world. One night that changed everything.

Without warning, they fell unconscious — and when they opened their eyes, \
they stood in a world unlike their own. \
Each of them wielding a power they had never asked for. \
Fire. Water. Ice. Plant. Metal.

This new world was brutal, dangerous, and already at the edge of ruin. \
A great shadow was spreading — ancient, patient, unstoppable.

But not by five.

They had not chosen this. But the world had chosen them.

When they face what must be faced... \
will they ever find their way home?`;

// ── Voice settings ─────────────────────────────────────────────────────────────
const VOICE_SETTINGS = {
    stability: 0.55,
    similarity_boost: 0.72,
    style: 0.30,
    use_speaker_boost: true,
};

// ── Main ────────────────────────────────────────────────────────────────────────
async function main() {
    if (!API_KEY) {
        console.error('Please set ELEVENLABS_API_KEY environment variable.');
        process.exit(1);
    }

    if (fs.existsSync(OUTPUT_FILE)) {
        console.log(`[SKIP] ${OUTPUT_FILE} already exists. Delete it to regenerate.`);
        return;
    }

    fs.mkdirSync(OUTPUT_DIR, { recursive: true });

    console.log('Generating story intro narration...');
    console.log(`Voice ID : ${NARRATOR_VOICE_ID}`);
    console.log(`Output   : ${OUTPUT_FILE}\n`);
    console.log('Text:\n' + NARRATION_TEXT + '\n');

    const client = new ElevenLabsClient({ apiKey: API_KEY });

    try {
        const response = await client.textToSpeech.convert(NARRATOR_VOICE_ID, {
            text: NARRATION_TEXT,
            model_id: MODEL_ID,
            output_format: 'mp3_44100_128',
            voice_settings: VOICE_SETTINGS,
        });

        const fileStream = fs.createWriteStream(OUTPUT_FILE);

        if (response.pipe) {
            response.pipe(fileStream);
        } else if (Buffer.isBuffer(response)) {
            fileStream.write(response);
            fileStream.end();
        } else {
            Readable.fromWeb(response).pipe(fileStream);
        }

        await new Promise((resolve, reject) => {
            fileStream.on('finish', resolve);
            fileStream.on('error', reject);
        });

        console.log(`\n✓ Saved: ${OUTPUT_FILE}`);
    } catch (err) {
        console.error('Generation failed:', err.message);
        process.exit(1);
    }
}

main();
