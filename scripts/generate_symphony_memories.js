const fs = require('fs');
const path = require('path');
const { Readable } = require('stream');
const { ElevenLabsClient } = require('@elevenlabs/elevenlabs-js');

// --- Configuration ---
const API_KEY = process.env.ELEVENLABS_API_KEY;
const MODEL_ID = 'eleven_multilingual_v2';

// Voice IDs for the Symphony of Sickness DLC heroes
const SOUND_VOICE_ID = 'REPLACE_WITH_SOUND_VOICE_ID';
const POISON_VOICE_ID = 'REPLACE_WITH_POISON_VOICE_ID';

const OUTPUT_DIR = path.join(__dirname, '../dlc/symphony_of_sickness/audio/memories');

// --- Memory texts (from dlc/symphony_of_sickness/index.js) ---
const heroes = [
    {
        key: 'sound',
        voiceId: SOUND_VOICE_ID,
        memories: [
            "Music was my whole world. Before the silence.",
            "I was ten years old when the sounds stopped. They never came back. Until now.",
            "I don't just hear anymore. I feel the sounds pass through me like something sacred.",
            "The forest speaks in frequencies no one else can sense. I could listen forever.",
            "There are creatures out there that choke the world's song. I cannot stand that. I will not.",
            "Every enemy I defeat is a note returned to the silence they tried to create.",
            "But the wonder faded. What was once a miracle is now just... normal. I want more.",
            "I heard Makuta may be the reason my powers feel capped. I went looking for him.",
            "The five heroes already ended him. But the ceiling remains. I found a ritual in an ancient library that might help.",
            "I amplified the world's frequency. It felt like godhood. I know this road is wrong. I'm walking it anyway.",
        ],
    },
    {
        key: 'poison',
        voiceId: POISON_VOICE_ID,
        memories: [
            "I woke up as a hero. But that morning, I felt like I was dying.",
            "Rashes. Fever. A cough that cracked my ribs. The illness came from nowhere.",
            "Seven days of waking up worse than the day before.",
            "I thought I was cursed. I wasn't. The world just wasn't built for me.",
            "The swamp found me first. Or maybe I found it. Either way, I felt alive for the first time.",
            "In the poison, the pain lifted. That should have scared me. It didn't.",
            "I started mixing compounds. Crude things at first. Then more precise. More dangerous.",
            "I cannot live far from the toxins. So I have started finding ways to bring them with me.",
            "I know what I'm doing. I know what it does to others. I do it anyway. That is the worst part.",
            "Something dark is growing inside me. I tell myself it is the chemicals. I am no longer sure.",
        ],
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

    for (const hero of heroes) {
        if (hero.voiceId.startsWith('REPLACE_WITH')) {
            console.warn(`Skipping '${hero.key}' — voice ID not configured.`);
            continue;
        }

        console.log(`\nGenerating ${hero.memories.length} memory files for '${hero.key}'...`);

        for (let i = 0; i < hero.memories.length; i++) {
            const id = `${hero.key}_${i + 1}`;
            const text = hero.memories[i];
            const filePath = path.join(OUTPUT_DIR, `${id}.mp3`);

            if (fs.existsSync(filePath)) {
                console.log(`  Skipping ${id} (already exists)`);
                continue;
            }

            console.log(`  Generating ${id}...`);

            try {
                const response = await elevenlabs.textToSpeech.convert(
                    hero.voiceId,
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

                console.log(`  Saved ${filePath}`);

                // Rate limit protection
                await new Promise(r => setTimeout(r, 500));

            } catch (error) {
                console.error(`  Error generating ${id}:`, error.message);
            }
        }
    }

    console.log("\nDone generating Symphony of Sickness memory audio!");
}

generateAudio();
