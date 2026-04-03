const fs = require('fs');
const path = require('path');
const { Readable } = require('stream');
const { ElevenLabsClient } = require('@elevenlabs/elevenlabs-js');

// --- Configuration ---
const API_KEY = process.env.ELEVENLABS_API_KEY;
const MODEL_ID = 'eleven_multilingual_v2';

// Same narrator voice used for Symphony of Sickness story narration
const NARRATOR_VOICE_ID = 'wyWA56cQNU2KqUW4eCsI';

const MAZE_FILE = path.join(__dirname, '../dlc/echos_of_eternity/MazeOfTime.js');
const OUTPUT_DIR = path.join(__dirname, '../dlc/echos_of_eternity/audio/story');

// --- Parse MAZE_NODES from source file ---
function loadNarratives() {
    if (!fs.existsSync(MAZE_FILE)) {
        console.error('Could not find MazeOfTime.js:', MAZE_FILE);
        process.exit(1);
    }

    const src = fs.readFileSync(MAZE_FILE, 'utf8');

    // Extract the MAZE_NODES array literal
    const match = src.match(/const\s+MAZE_NODES\s*=\s*(\[[\s\S]*?\n\];)/);
    if (!match) {
        console.error('Could not find MAZE_NODES array in MazeOfTime.js');
        process.exit(1);
    }

    let nodes;
    try {
        nodes = eval(match[1]);
    } catch (e) {
        console.error('Error parsing MAZE_NODES:', e.message);
        process.exit(1);
    }

    // Keep only nodes that have a narrative
    return nodes
        .filter(n => n.narrative && n.narrative.trim().length > 0)
        .map(n => ({ id: n.id, title: n.title, narrative: n.narrative }));
}

// --- Initialize Client ---
if (!API_KEY) {
    console.error('Please set ELEVENLABS_API_KEY environment variable.');
    process.exit(1);
}

const elevenlabs = new ElevenLabsClient({ apiKey: API_KEY });

// --- Main Generation Loop ---
async function generateAudio() {
    const narratives = loadNarratives();
    console.log(`Found ${narratives.length} narrative nodes in MazeOfTime.js`);

    if (!fs.existsSync(OUTPUT_DIR)) {
        fs.mkdirSync(OUTPUT_DIR, { recursive: true });
    }

    for (const node of narratives) {
        const filePath = path.join(OUTPUT_DIR, `${node.id}.mp3`);

        if (fs.existsSync(filePath)) {
            console.log(`  Skipping ${node.id} (already exists)`);
            continue;
        }

        console.log(`  Generating ${node.id} — "${node.title}"...`);

        try {
            const response = await elevenlabs.textToSpeech.convert(
                NARRATOR_VOICE_ID,
                {
                    text: node.narrative,
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

            console.log(`  Saved ${filePath}`);

            // Rate limit protection
            await new Promise(r => setTimeout(r, 500));

        } catch (error) {
            console.error(`  Error generating ${node.id}:`, error.message);
        }
    }

    console.log('\nDone generating Maze of Time narrative audio!');
}

generateAudio();
