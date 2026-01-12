const fs = require('fs');
const path = require('path');
const { Readable } = require('stream');
const { ElevenLabsClient } = require('@elevenlabs/elevenlabs-js');

// --- Configuration ---
const API_KEY = process.env.ELEVENLABS_API_KEY;
const VOICE_ID = 'JBFqnCBsd6RMkjVDRZzb'; // Main Story Voice
const MODEL_ID = 'eleven_multilingual_v2';
const STORY_FILE = path.join(__dirname, '../Story.js');
const OUTPUT_DIR = path.join(__dirname, '../music/story');

// --- Load Story Data ---
if (!fs.existsSync(STORY_FILE)) {
    console.error("Could not find Story file:", STORY_FILE);
    process.exit(1);
}

const fileContent = fs.readFileSync(STORY_FILE, 'utf8');
const storyItems = [];

// Parse window.STORY_EVENTS = [ ... ];
const storyMatch = fileContent.match(/window\.STORY_EVENTS\s*=\s*(\[[\s\S]*?\]);/);

if (storyMatch) {
    try {
        const events = eval(storyMatch[1]);
        events.forEach(e => {
            if (e.text) {
                storyItems.push({
                    id: e.id || `wave_${e.wave}`, // Ensure ID
                    text: e.text
                });
            }
        });
    } catch (e) {
        console.error("Error parsing STORY_EVENTS:", e);
    }
}

// Fallback or explicit additions could go here

if (storyItems.length === 0) {
    console.error("No story items found to generate.");
    process.exit(1);
}

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

    console.log(`Found ${storyItems.length} story events.`);

    for (const item of storyItems) {
        const text = item.text;
        const id = item.id;
        const filePath = path.join(OUTPUT_DIR, `${id}.mp3`);

        if (fs.existsSync(filePath)) {
            console.log(`Skipping ${id} (already exists)`);
            continue;
        }

        console.log(`Generating audio for ${id}...`);

        try {
            const response = await elevenlabs.textToSpeech.convert(
                VOICE_ID,
                {
                    text: text,
                    model_id: MODEL_ID,
                    output_format: 'mp3_44100_128',
                    voice_settings: {
                        stability: 1,
                        similarity_boost: 1,
                        use_speaker_boost: true,
                        style: 0,
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
            console.error(`Error generating ${id}:`, error.message);
        }
    }

    console.log("Done!");
}

generateAudio();
