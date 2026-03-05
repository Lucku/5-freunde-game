const fs = require('fs');
const path = require('path');
const { Readable } = require('stream');
const { ElevenLabsClient } = require('@elevenlabs/elevenlabs-js');

// --- Configuration ---
const API_KEY = process.env.ELEVENLABS_API_KEY;
const MODEL_ID = 'eleven_multilingual_v2';

// Base game narrator voice (same as regular story chapters) — used as fallback
const DEFAULT_VOICE_ID = 'esy0r39YPLQjOczyOib8';

const OUTPUT_DIR = path.join(__dirname, '../audio/story');

// --- Tutorial chapter texts (from TutorialMode.js STAGES) ---
// Set voiceId per entry to override the default narrator voice.
const tutorialChapters = [
    {
        id: 'tutorial_1',
        voiceId: 'SOYHLrjzK2X1ezoPC6cr',
        text: "I opened my eyes to a sky full of embers. I don't know this place. But the heat — it doesn't burn me. It flows through me. And those things in the distance... they're coming.",
    },
    {
        id: 'tutorial_2',
        voiceId: 'cgSgspJ2msm6clMCkdW9',
        text: "Water. Everywhere. But I'm not drowning. It bends around me like it knows my name. I don't know where I am. All I know is the creatures ahead don't belong in this calm.",
    },
    {
        id: 'tutorial_3',
        voiceId: 'iP95p4xoKVk53GoZ742B',
        text: "The world is still. Cold, and perfectly still. I should be freezing. I'm not. My breath fogs the air and something shifts in the distance — dark shapes, getting closer.",
    },
    {
        id: 'tutorial_4',
        voiceId: 'bIHbv24MWmeRgasZH58o',
        text: "I'm standing in a forest I've never seen, but somehow feel I've always known. The roots beneath my feet pulse like veins. Something is wrong here. Something is coming.",
    },
    {
        id: 'tutorial_5',
        voiceId: 'tZPwJezAhAZUGGBZDmR0',
        text: "I don't remember falling asleep. I remember the city. Now there's only steel and silence — and those things moving at the edge of the light. I'd better move.",
    },
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

    console.log(`Generating ${tutorialChapters.length} tutorial audio files...`);

    for (const chapter of tutorialChapters) {
        const filePath = path.join(OUTPUT_DIR, `${chapter.id}.mp3`);

        if (fs.existsSync(filePath)) {
            console.log(`Skipping ${chapter.id} (already exists)`);
            continue;
        }

        console.log(`Generating audio for ${chapter.id}...`);

        try {
            const response = await elevenlabs.textToSpeech.convert(
                chapter.voiceId || DEFAULT_VOICE_ID,
                {
                    text: chapter.text,
                    model_id: MODEL_ID,
                    output_format: 'mp3_44100_128',
                    voice_settings: {
                        stability: 0.5,
                        similarity_boost: 0.75,
                        style: 0,
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
                // Assume Web Stream
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
            console.error(`Error generating ${chapter.id}:`, error.message);
        }
    }

    console.log("Done generating Tutorial Audio!");
}

generateAudio();
