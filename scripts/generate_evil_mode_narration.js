// generate_evil_mode_narration.js
// Generates all Evil Mode story narration audio files.
//
// Waves 1-5  (Green Goblin arc) → voiced by Green Goblin  (qhH5VOAvpCwvNpmn2srO)
// Waves 6-12 (Makuta arc + epilogue) → voiced by Makuta  (bwCXcoVxWNYMlC6Esa8u)
//
// Output dir: audio/story/evil_mode/
// File names: evil_{wave}_{hero}.mp3
//   e.g. evil_1_green_goblin.mp3, evil_6_makuta.mp3, evil_12_makuta.mp3
//
// Run:  ELEVENLABS_API_KEY=xxx node scripts/generate_evil_mode_narration.js
// Skip: existing files are never overwritten — delete them to regenerate.

'use strict';

const fs   = require('fs');
const path = require('path');
const { Readable } = require('stream');
const { ElevenLabsClient } = require('@elevenlabs/elevenlabs-js');

// ── Config ─────────────────────────────────────────────────────────────────────
const API_KEY  = process.env.ELEVENLABS_API_KEY;
const MODEL_ID = 'eleven_multilingual_v2';

const GOBLIN_VOICE_ID  = 'qhH5VOAvpCwvNpmn2srO'; // Green Goblin — manic, theatrical
const MAKUTA_VOICE_ID  = 'bwCXcoVxWNYMlC6Esa8u'; // Makuta — deep, authoritative

const GOBLIN_SETTINGS = {
    stability:        0.42,
    similarity_boost: 0.78,
    style:            0.35,
    use_speaker_boost: true,
};

const MAKUTA_SETTINGS = {
    stability:        0.55,
    similarity_boost: 0.72,
    style:            0.30,
    use_speaker_boost: true,
};

const OUTPUT_DIR = path.join(__dirname, '../audio/story/evil_mode');

// ── Story entries ──────────────────────────────────────────────────────────────
// Each entry matches the corresponding EVIL_STORY_EVENTS entry in EvilMode.js.
// hero: 'green_goblin' | 'makuta'  → determines voice + file name suffix
const ENTRIES = [
    // ── Green Goblin arc (waves 1-5) ──────────────────────────────────────────
    {
        wave: 1,
        hero: 'green_goblin',
        text: `Heheheh! Makuta has given me a simple task: eliminate the Five Heroes before they grow too strong. I start with the Fire Hero. Cocky little ember — thinks passion alone will save them. Let's see how they handle my tricks!`,
    },
    {
        wave: 2,
        hero: 'green_goblin',
        text: `One down, four to go! The Water Hero thinks their precious adaptability will save them. Flows like the ocean, they say. Well, oceans can dry up. Time to show them what happens when you face a bomb that doesn't care how fluid you are.`,
    },
    {
        wave: 3,
        hero: 'green_goblin',
        text: `I do enjoy the Ice Biome. The cold keeps my bombs stable — more precise. The Ice Hero is calm, calculating. Perfect. I like dismantling calm people. Nothing breaks composure faster than realizing your defenses mean nothing against me.`,
    },
    {
        wave: 4,
        hero: 'green_goblin',
        text: `Patience. Strength through roots. How poetic. The Plant Hero thinks they can outlast me. Heheheh — I've been blowing things up for years. I have infinite patience for destruction. Let the garden burn.`,
    },
    {
        wave: 5,
        hero: 'green_goblin',
        text: `The Metal Hero. The strongest of the five. This one actually makes me nervous — I won't lie. But nervous is good. Nervous means I'm taking it seriously. And when I take something seriously... I always win. Time to prove it.`,
    },

    // ── Makuta arc (waves 6-11) ───────────────────────────────────────────────
    {
        wave: 6,
        hero: 'makuta',
        text: `Goblin has done his part — softened them, bruised their pride. But a cracked wall still stands. I am Makuta. And I do not crack walls. I erase them. The five heroes will face me now, in the very biomes they call home. There is no sanctuary from shadow.`,
    },
    {
        wave: 7,
        hero: 'makuta',
        text: `The Water Hero learned to bend. Admirable. But shadow does not bend — it seeps. It fills every crack, every doubt, every moment of hesitation. I will flood the Water Biome with darkness until there is nothing left to flow.`,
    },
    {
        wave: 8,
        hero: 'makuta',
        text: `The Ice Hero froze their fear and called it strength. I respect the discipline. But true cold has no emotion at all — not even resolve. I am the void between stars. The Ice Hero will learn the difference between cold and nothing.`,
    },
    {
        wave: 9,
        hero: 'makuta',
        text: `Life persists. Nature endures. These are the lies the Plant Hero tells itself as it clings to the earth. But I have watched civilizations built over millennia crumble into dust. One hero, however rooted, is nothing before eternity.`,
    },
    {
        wave: 10,
        hero: 'makuta',
        text: `Metal. The last of the five. They call it indestructible. They say no force can bend it. Those who say such things have not yet faced the full weight of shadow. Every metal rusts. Every wall corrodes. I am patient enough to wait — and powerful enough not to have to.`,
    },
    {
        wave: 11,
        hero: 'makuta',
        text: `They have gathered. All five heroes, standing together in defiance. I can feel their bond — that insufferable warmth they call friendship. Let them cling to each other. In the end, all light fades. All bonds break. This is where the story of the Five Friends ends. This is the Elemental Arena. And I am its final chapter.`,
    },

    // ── Epilogue (wave 12 — after all heroes fall) ────────────────────────────
    {
        wave: 12,
        hero: 'makuta',
        text: `It is done. The Five Heroes — who dared call themselves chosen — lie broken. The Golden Mask is mine. The world, at last, falls silent. No more light. No more hope. No more... resistance. I have waited ages for this moment. This is not an end. This is the beginning of an eternity under shadow. My shadow.`,
    },
];

// ── Helpers ────────────────────────────────────────────────────────────────────
function outputPath(entry) {
    return path.join(OUTPUT_DIR, `evil_${entry.wave}_${entry.hero}.mp3`);
}

async function generate(client, entry) {
    const outFile    = outputPath(entry);
    const isGoblin   = entry.hero === 'green_goblin';
    const voiceId    = isGoblin ? GOBLIN_VOICE_ID : MAKUTA_VOICE_ID;
    const settings   = isGoblin ? GOBLIN_SETTINGS : MAKUTA_SETTINGS;
    const label      = `wave ${entry.wave} (${entry.hero})`;

    if (fs.existsSync(outFile)) {
        console.log(`[SKIP] ${path.basename(outFile)} already exists.`);
        return;
    }

    console.log(`\nGenerating ${label}…`);
    console.log(`  Voice : ${voiceId}`);
    console.log(`  Output: ${outFile}`);

    const response = await client.textToSpeech.convert(voiceId, {
        text:           entry.text,
        model_id:       MODEL_ID,
        output_format:  'mp3_44100_128',
        voice_settings: settings,
    });

    const fileStream = fs.createWriteStream(outFile);

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

    console.log(`  ✓ Saved`);
}

// ── Main ────────────────────────────────────────────────────────────────────────
async function main() {
    if (!API_KEY) {
        console.error('Please set ELEVENLABS_API_KEY environment variable.');
        process.exit(1);
    }

    fs.mkdirSync(OUTPUT_DIR, { recursive: true });

    console.log(`Evil Mode narration generator`);
    console.log(`Output dir : ${OUTPUT_DIR}`);
    console.log(`Entries    : ${ENTRIES.length} (waves 1-12)\n`);

    const client = new ElevenLabsClient({ apiKey: API_KEY });

    for (const entry of ENTRIES) {
        try {
            await generate(client, entry);
        } catch (err) {
            console.error(`  ✗ Failed wave ${entry.wave}: ${err.message}`);
            process.exit(1);
        }
    }

    console.log(`\nAll done. Files written to: ${OUTPUT_DIR}`);
}

main();
