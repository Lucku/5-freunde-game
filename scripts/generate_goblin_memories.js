const fs = require('fs');
const path = require('path');
const { Readable } = require('stream');
const { ElevenLabsClient } = require('@elevenlabs/elevenlabs-js');

// --- Configuration ---
const API_KEY = process.env.ELEVENLABS_API_KEY;
const MODEL_ID = 'eleven_multilingual_v2';

const GOBLIN_VOICE_ID = 'qhH5VOAvpCwvNpmn2srO';

const OUTPUT_DIR = path.join(__dirname, '../audio/memories');

// --- Green Goblin memory texts ---
// The Goblin is a twisted, brilliant technologist driven by the loss of his son.
// He is in a false alliance with Makuta, secretly planning to seize the Golden Mask
// for himself and use it to enslave a world he has grown to despise.
const goblinMemories = [
    "I was always the smartest person in any room, and rooms never forgave me for it.",
    "The world runs on order, and order runs on fear, but nobody has the guts to say that out loud.",
    "I built my first explosive device at fourteen, not to destroy anything, just to see if I could.",
    "Technology is the only honest language: it does exactly what you design it to do, nothing more, nothing less.",
    "People disappoint. Machines don't.",
    "My son was the one exception to that rule.",
    "He had my mind but his mother's patience, which made him better than both of us.",
    "The day the biome conflict reached our city, I was in my workshop. He was not.",
    "They never found enough of him to bury.",
    "The heroes were supposed to protect the world. They were busy fighting among themselves.",
    "I don't blame fate. I blame incompetence, and incompetence has faces.",
    "Makuta found me six weeks after the funeral, while I was building something I intended to use on a city.",
    "He offered purpose. I accepted, because grief without direction is just poison.",
    "He thinks I serve him. That misunderstanding is the most useful thing he has ever given me.",
    "The Golden Mask is not a symbol. It is a tool, and tools belong to whoever understands them best.",
    "I have studied the mask's resonance frequency for three years. Makuta has studied its mythology.",
    "He wants worship. I want compliance. The difference is I actually have a plan.",
    "Sometimes I see him watching me sideways, and I wonder how much he already suspects.",
    "Let him suspect. Suspicion without proof is just another form of fear.",
    "When I hold the mask, the first thing I will do is laugh, not at the world, but at myself, for waiting so long.",
];

// --- Initialize Client ---
if (!API_KEY) {
    console.error("Please set ELEVENLABS_API_KEY environment variable.");
    process.exit(1);
}

const elevenlabs = new ElevenLabsClient({ apiKey: API_KEY });

// --- Main Generation Loop ---
async function generateAudio() {
    if (!fs.existsSync(OUTPUT_DIR)) {
        fs.mkdirSync(OUTPUT_DIR, { recursive: true });
    }

    console.log(`Generating ${goblinMemories.length} Green Goblin memory audio files...`);

    for (let i = 0; i < goblinMemories.length; i++) {
        const id = `goblin_${i + 1}`;
        const text = goblinMemories[i];
        const filePath = path.join(OUTPUT_DIR, `${id}.mp3`);

        if (fs.existsSync(filePath)) {
            console.log(`Skipping ${id} (already exists)`);
            continue;
        }

        console.log(`Generating audio for ${id}: "${text}"`);

        try {
            const response = await elevenlabs.textToSpeech.convert(
                GOBLIN_VOICE_ID,
                {
                    text: text,
                    model_id: MODEL_ID,
                    output_format: 'mp3_44100_128',
                    voice_settings: {
                        stability: 0.42,
                        similarity_boost: 0.78,
                        style: 0.35,
                        use_speaker_boost: true,
                    },
                }
            );

            const fileStream = fs.createWriteStream(filePath);

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

            console.log(`Saved ${filePath}`);

            // Rate limit protection
            await new Promise(r => setTimeout(r, 500));

        } catch (error) {
            console.error(`Error generating ${id}:`, error.message);
        }
    }

    console.log("Done generating Green Goblin Memory Audio!");
}

generateAudio();
