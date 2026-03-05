const fs = require('fs');
const path = require('path');
const { Readable } = require('stream');
const { ElevenLabsClient } = require('@elevenlabs/elevenlabs-js');

// --- Configuration ---
const API_KEY = process.env.ELEVENLABS_API_KEY;
const MODEL_ID = 'eleven_multilingual_v2';

const METAL_VOICE_ID = 'tZPwJezAhAZUGGBZDmR0';

const OUTPUT_DIR = path.join(__dirname, '../audio/memories');

// --- Metal hero memory texts (from MemoryStories.js) ---
const metalMemories = [
    "I've always been the guy who jokes first and thinks later, mostly because silence makes fear too loud.",
    "Back in school, humor was my armor, and sarcasm was how I survived bad days.",
    "The five of us stuck together because somehow our flaws fit like puzzle pieces.",
    "Fire burned too hot, Ice thought too much, Plants felt too deeply, and Water held us all together.",
    "And me, I pretended nothing ever scared me.",
    "I flirted with Water shamelessly, partly because she smiled back, and partly because it made everything feel normal.",
    "I never meant to hide behind charm, but it became habit.",
    "Metal fascinated me long before it became my power.",
    "Machines made sense, because broken parts could be replaced.",
    "People were harder to fix.",
    "The day destiny found me, I was trapped inside a collapsing construction site.",
    "Steel beams snapped, concrete fell, and panic finally caught up with me.",
    "I tried to run, but the floor gave way beneath my feet.",
    "Pain should have followed.",
    "Instead, my body hardened.",
    "Metal fused to my skin like it had always belonged there.",
    "The falling beams bent around me, screaming under pressure.",
    "I laughed hysterically afterward, because laughing felt better than shaking.",
    "Destiny doesn't always choose heroes; sometimes it chooses shields.",
    "When I told the others, Fire looked impressed and worried at the same time.",
    "Water touched my arm like she needed to be sure I was still human.",
    "Ice immediately asked about structural limits.",
    "Plants warned me quietly about becoming too rigid.",
    "I joked it off, because that's what I do.",
    "At first, my powers felt amazing.",
    "Nothing could hurt me.",
    "Or so I thought.",
    "I could lift impossible weight, block massive attacks, and walk through danger smiling.",
    "Inside, though, every impact echoed.",
    "Makuta noticed that quickly.",
    "He whispered that I was disposable, useful only as armor.",
    "He said shields are meant to break.",
    "I laughed at him too.",
    "Our first fight with the Green Goblin changed that.",
    "I stepped in front of an attack meant for Water without thinking.",
    "The hit cracked my armor and nearly crushed me.",
    "Lying there, unable to move, I realized how close I came to dying.",
    "That fear stayed with me.",
    "Destiny sent me to my trial, a vast industrial graveyard of rust and broken machines.",
    "There, metal decayed when neglected.",
    "Strength meant maintenance, not invincibility.",
    "I faced visions of myself shattering under pressure while my friends fell behind me.",
    "Makuta told me that jokes wouldn't save them.",
    "For once, I didn't laugh.",
    "I learned to reinforce instead of overextend.",
    "Flexibility mattered more than thickness.",
    "Metal that bends survives longer than metal that resists everything.",
    "When I returned, my armor felt lighter but stronger.",
    "In our second battle with the Green Goblin, I protected without reckless bravado.",
    "Fire trusted me to hold the line.",
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

    console.log(`Generating ${metalMemories.length} metal memory audio files...`);

    for (let i = 0; i < metalMemories.length; i++) {
        const id = `metal_${i + 1}`;
        const text = metalMemories[i];
        const filePath = path.join(OUTPUT_DIR, `${id}.mp3`);

        if (fs.existsSync(filePath)) {
            console.log(`Skipping ${id} (already exists)`);
            continue;
        }

        console.log(`Generating audio for ${id}...`);

        try {
            const response = await elevenlabs.textToSpeech.convert(
                METAL_VOICE_ID,
                {
                    text: text,
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
            console.error(`Error generating ${id}:`, error.message);
        }
    }

    console.log("Done generating Metal Memory Audio!");
}

generateAudio();
