const fs = require('fs');
const path = require('path');
const { Readable } = require('stream');
const { ElevenLabsClient } = require('@elevenlabs/elevenlabs-js');

// --- Configuration ---
const API_KEY = process.env.ELEVENLABS_API_KEY; // Ensure this is set in your environment
const VOICE_ID = 'hfgNmTYYctMgJ7E2s6Vx'; // Default voice (change as needed)
const MODEL_ID = 'eleven_multilingual_v2';
const OUTPUT_DIR = path.join(__dirname, '../dlc/music/story');

// --- Load Story Data ---
// We read the file manually to avoid issues with browser-specific code in Story.js
const storyFileContent = fs.readFileSync(path.join(__dirname, '../dlc/rise_of_the_rock/index.js'), 'utf8');

// Extract the STORY_EVENTS array using a safe evaluation or regex
// Since Story.js is simple, we can try to eval the array part.
// However, to be safe and avoid 'class StoryManager' errors, we'll just extract the array string.
const startMarker = 'const earthStory = [';
const endMarker = '];';
const startIndex = storyFileContent.indexOf(startMarker);
const endIndex = storyFileContent.indexOf(endMarker, startIndex);

if (startIndex === -1 || endIndex === -1) {
    console.error("Could not find earthStory in index.js");
    process.exit(1);
}

const arrayString = storyFileContent.substring(startIndex + 'const earthStory = '.length, endIndex + 1);
let STORY_EVENTS;
try {
    STORY_EVENTS = eval(arrayString);
} catch (e) {
    console.error("Failed to parse STORY_EVENTS:", e);
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

    console.log(`Found ${STORY_EVENTS.length} story events.`);

    for (const event of STORY_EVENTS) {
        // Determine ID: Use 'id' if present, otherwise construct from wave/hero
        let id = event.id;
        if (!id) {
            id = `wave_${event.wave}_${event.hero}`;
        }

        const filePath = path.join(OUTPUT_DIR, `${id}.mp3`);

        if (fs.existsSync(filePath)) {
            console.log(`Skipping ${id} (already exists)`);
            continue;
        }

        if (!event.text) {
            console.log(`Skipping ${id} (no text)`);
            continue;
        }

        console.log(`Generating audio for ${id}...`);

        try {
            const response = await elevenlabs.textToSpeech.convert(
                VOICE_ID,
                {
                    text: event.text,
                    model_id: MODEL_ID,
                    output_format: 'mp3_44100_128',
                    voiceSettings: {
                        stability: 1,
                        similarityBoost: 1,
                        useSpeakerBoost: true,
                        style: 0,
                        speed: 1,
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

            // Rate limit protection (optional but recommended)
            await new Promise(r => setTimeout(r, 500));

        } catch (error) {
            console.error(`Error generating ${id}:`, error.message);
        }
    }

    console.log("Done!");
}

generateAudio();
