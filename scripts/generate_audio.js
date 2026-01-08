const fs = require('fs');
const path = require('path');
const { Readable } = require('stream');
const { ElevenLabsClient } = require('@elevenlabs/elevenlabs-js');

// --- Configuration ---
const API_KEY = process.env.ELEVENLABS_API_KEY; // Ensure this is set in your environment
//const VOICE_ID = 'hfgNmTYYctMgJ7E2s6Vx'; // Default voblack (change as needed)
const VOICE_ID = 'xrNwYO0xeioXswMCcFNF'
const MODEL_ID = 'eleven_multilingual_v2';
const OUTPUT_DIR = path.join(__dirname, '../music/memories');

// --- Load Story Data ---
// Load MemoryStories.js and parse it
const memoryFileContent = fs.readFileSync(path.join(__dirname, '../MemoryStories.js'), 'utf8');

// Extract the MEMORY_STORIES object using regex or substring
// The file typically starts with "const MEMORY_STORIES = {" and ends with "};"
const startMarker = 'const MEMORY_STORIES = {';
const startIndex = memoryFileContent.indexOf(startMarker);

if (startIndex === -1) {
    console.error("Could not find MEMORY_STORIES in MemoryStories.js");
    process.exit(1);
}

// Extract the object literal content
let objectString = memoryFileContent.substring(startIndex + 'const MEMORY_STORIES = '.length);
// Remove trailing semicolon if present
objectString = objectString.trim().replace(/;$/, '');

let MEMORY_STORIES;
try {
    // Basic eval might fail if there are comments or complex things, but the file is simple JSON-like JS.
    MEMORY_STORIES = eval('(' + objectString + ')');
} catch (e) {
    console.error("Failed to parse MEMORY_STORIES:", e);
    process.exit(1);
}

const BLACK_MEMORIES = MEMORY_STORIES.black;

if (!BLACK_MEMORIES || !Array.isArray(BLACK_MEMORIES)) {
    console.error("Fire memories not found or invalid format.");
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

    console.log(`Found ${BLACK_MEMORIES.length} black memory events.`);

    // Limit to 50 as per requirements (although the array should be 50 already)
    const limit = Math.min(BLACK_MEMORIES.length, 50);

    for (let i = 0; i < limit; i++) {
        const text = BLACK_MEMORIES[i];
        const id = `black_${i + 1}`; // 1-based index for filenames

        const filePath = path.join(OUTPUT_DIR, `${id}.mp3`);

        if (fs.existsSync(filePath)) {
            console.log(`Skipping ${id} (already exists)`);
            continue;
        }

        if (!text) {
            console.log(`Skipping ${id} (no text)`);
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
                    voblackSettings: {
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

            // Rate limit protection
            await new Promise(r => setTimeout(r, 500));

        } catch (error) {
            console.error(`Error generating ${id}:`, error.message);
        }
    }

    console.log("Done!");
}

generateAudio();
