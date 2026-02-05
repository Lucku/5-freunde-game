const fs = require('fs');
const path = require('path');
const { Readable } = require('stream');
const { ElevenLabsClient } = require('@elevenlabs/elevenlabs-js');

// --- Configuration ---
const API_KEY = process.env.ELEVENLABS_API_KEY;
const MODEL_ID = 'eleven_multilingual_v2';

// Voices
const GRAVITY_VOICE_ID = 'esy0r39YPLQjOczyOib8';
const VOID_VOICE_ID = '69Na567Zr0bPvmBYuGdc';

// Paths for Champions of Chaos DLC
const STORY_FILE = path.join(__dirname, '../dlc/champions_of_chaos/Story.js');
const INDEX_FILE = path.join(__dirname, '../dlc/champions_of_chaos/index.js');
const OUTPUT_DIR = path.join(__dirname, '../dlc/champions_of_chaos/music/story');
const MEMORY_OUTPUT_DIR = path.join(__dirname, '../dlc/champions_of_chaos/music/memories');

// --- Load Story Data ---
if (!fs.existsSync(STORY_FILE)) {
    console.error("Could not find Story file:", STORY_FILE);
    process.exit(1);
}

const fileContent = fs.readFileSync(STORY_FILE, 'utf8');
const storyItems = [];

// Parse window.CHAOS_STORY_CHAPTERS = [ ... ];
const storyMatch = fileContent.match(/window\.CHAOS_STORY_CHAPTERS\s*=\s*(\[[\s\S]*?\]);/);

if (storyMatch) {
    try {
        const events = eval(storyMatch[1]);
        events.forEach(e => {
            if (e.text) {
                storyItems.push({
                    id: e.id || `chaos_wave_${e.wave}`,
                    text: e.text,
                    hero: e.hero, // 'gravity' or 'void'
                    isMemory: false
                });
            }
        });
    } catch (e) {
        console.error("Error parsing CHAOS_STORY_CHAPTERS:", e);
    }
} else {
    console.error("Could not find window.CHAOS_STORY_CHAPTERS in Story.js");
}

// --- Load Memory Data ---
if (fs.existsSync(INDEX_FILE)) {
    const indexContent = fs.readFileSync(INDEX_FILE, 'utf8');

    const extractMemories = (hero) => {
        const regex = new RegExp(`MEMORY_STORIES\\['${hero}'\\]\\s*=\\s*(\\[[\\s\\S]*?\\]);`);
        const match = indexContent.match(regex);
        if (match) {
            try {
                const memories = eval(match[1]);
                memories.forEach((text, index) => {
                    storyItems.push({
                        id: `memory_${hero}_${index + 1}`,
                        text: text,
                        hero: hero,
                        isMemory: true
                    });
                });
                console.log(`Loaded ${memories.length} memories for ${hero}`);
            } catch (e) {
                console.error(`Error parsing memories for ${hero}:`, e);
            }
        }
    };

    extractMemories('gravity');
    extractMemories('void');
}

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
    if (!fs.existsSync(MEMORY_OUTPUT_DIR)) {
        fs.mkdirSync(MEMORY_OUTPUT_DIR, { recursive: true });
    }

    console.log(`Found ${storyItems.length} Chaos story events.`);

    for (const item of storyItems) {
        const text = item.text;
        const id = item.id;
        const hero = item.hero;

        // Determine Output Path
        const targetDir = item.isMemory ? MEMORY_OUTPUT_DIR : OUTPUT_DIR;
        const filePath = path.join(targetDir, `${id}.mp3`);

        if (fs.existsSync(filePath)) {
            console.log(`Skipping ${id} (already exists)`);
            continue;
        }

        // Select Voice
        let currentVoiceId = GRAVITY_VOICE_ID; // Default
        if (hero === 'void') {
            currentVoiceId = VOID_VOICE_ID;
        } else if (hero === 'gravity') {
            currentVoiceId = GRAVITY_VOICE_ID;
        } else {
            console.warn(`Unknown hero '${hero}' for ${id}, defaulting to Gravity.`);
        }

        console.log(`Generating audio for ${id} [${hero ? hero.toUpperCase() : 'UNKNOWN'}]...`);

        try {
            const response = await elevenlabs.textToSpeech.convert(
                currentVoiceId,
                {
                    text: text,
                    model_id: MODEL_ID,
                    output_format: 'mp3_44100_128',
                    voice_settings: {
                        stability: 0.5,
                        similarity_boost: 0.75,
                        style: 0,
                        use_speaker_boost: true
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

    console.log("Done generating Chaos Audio!");
}

generateAudio();
