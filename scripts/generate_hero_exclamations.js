// generate_hero_exclamations.js
// Generates situational exclamation voice lines for each hero using ElevenLabs.
//
// Output:  audio/voices/{hero}/{situation}.mp3
// Run:     ELEVENLABS_API_KEY=xxx node scripts/generate_hero_exclamations.js
//
// Situations (file names):
//   injured       — health falls below ~15% (red screen threshold)
//   failure_1/2   — hero dies (2 random variants)
//   twin_event    — twin boss event appears
//   boss_moment_1/2 — facing a story super-boss (2 random variants)
//   boss_win_1/2  — defeating a super-boss (2 random variants)
//   found_1/2     — picking up a collector card or permanent upgrade (2 random variants)
//
// Heroes without a voice ID in voice_ids.txt are skipped with a warning.
// Add missing IDs to scripts/voice_ids.txt to include them.

'use strict';

const fs = require('fs');
const path = require('path');
const { Readable } = require('stream');
const { ElevenLabsClient } = require('@elevenlabs/elevenlabs-js');

// ── Config ─────────────────────────────────────────────────────────────────────
const API_KEY = process.env.ELEVENLABS_API_KEY;
const MODEL_ID = 'eleven_multilingual_v2';
const OUTPUT_BASE = path.join(__dirname, '../audio/voices');

// Voice settings optimised for short, emotional exclamations
const VOICE_SETTINGS = {
    stability: 0.38,
    similarity_boost: 0.75,
    style: 0.40,
    use_speaker_boost: true,
};

// ── Load voice IDs from voice_ids.txt ─────────────────────────────────────────
const VOICE_IDS_FILE = path.join(__dirname, 'voice_ids.txt');
if (!fs.existsSync(VOICE_IDS_FILE)) {
    console.error('voice_ids.txt not found at', VOICE_IDS_FILE);
    process.exit(1);
}

const voiceIds = {};
fs.readFileSync(VOICE_IDS_FILE, 'utf8').split('\n').forEach(line => {
    const [hero, id] = line.split('=').map(s => s.trim());
    if (hero && id) voiceIds[hero] = id;
});

// Gravity is defined in generate_audio.js but not yet in voice_ids.txt — add here as fallback
if (!voiceIds['gravity']) voiceIds['gravity'] = 'esy0r39YPLQjOczyOib8';

// ── Voice lines ────────────────────────────────────────────────────────────────
// Key format: { situation: text } for single lines, { situation_1/2: text } for pairs.
// Keep texts short — they are in-game reactions, not narration.

const LINES = {

    fire: {
        injured: "Not yet! I won't burn out like this!",
        failure_1: "No... the fire dies here.",
        failure_2: "Everything burns. Even me.",
        twin_event: "Two of you? Then I'll burn you both!",
        boss_moment_1: "This is what I've been burning toward.",
        boss_moment_2: "You have no idea what real fire is.",
        boss_win_1: "Ash. That's all you are now.",
        boss_win_2: "The flame never dies!",
        found_1: "What is this... it feels powerful.",
        found_2: "Interesting. This changes things.",
        ultimate: "INFERNO! Everything burns!",
    },

    water: {
        injured: "Losing my flow... stay calm.",
        failure_1: "Even rivers find their end.",
        failure_2: "I return to the source.",
        twin_event: "Two waves. I'll adapt.",
        boss_moment_1: "You are the stone. I am the water. I always win.",
        boss_moment_2: "Stay calm. Read the current.",
        boss_win_1: "Water always finds a way.",
        boss_win_2: "The tide has turned.",
        found_1: "Something calls to me from this.",
        found_2: "There's depth to this I haven't understood yet.",
        ultimate: "Tidal Wave... the ocean rises!",
    },

    ice: {
        injured: "Damage critical. Recalculating.",
        failure_1: "Everything freezes. Eventually.",
        failure_2: "...Cold. Final.",
        twin_event: "Two targets. Efficiency unchanged.",
        boss_moment_1: "You cannot outlast absolute zero.",
        boss_moment_2: "I have calculated every possible outcome.",
        boss_win_1: "Precisely as calculated.",
        boss_win_2: "Everything falls to cold in the end.",
        found_1: "Curious. The composition is unlike anything I have analyzed.",
        found_2: "Fascinating properties. I'll study this later.",
        ultimate: "Deep Freeze initiated. Nothing moves.",
    },

    plant: {
        injured: "The roots are holding. Just barely.",
        failure_1: "I return to the soil.",
        failure_2: "Every ending is a new beginning.",
        twin_event: "The forest has faced worse storms than two.",
        boss_moment_1: "Even the mightiest tree faces its storm.",
        boss_moment_2: "I have roots older than your anger.",
        boss_win_1: "Life always finds a way.",
        boss_win_2: "The canopy holds.",
        found_1: "This resonates with something ancient.",
        found_2: "I can feel it growing in my hands.",
        ultimate: "OVERGROWTH! The forest reclaims everything.",
    },

    metal: {
        injured: "Hull compromised. Continuing.",
        failure_1: "Systems offline.",
        failure_2: "Every machine breaks down.",
        twin_event: "Double threat. Noted.",
        boss_moment_1: "Stronger alloys have failed before you.",
        boss_moment_2: "I don't feel fear. That's not a boast. It's a fact.",
        boss_win_1: "Scrapped.",
        boss_win_2: "Dismantled.",
        found_1: "Unusual material. Logging it.",
        found_2: "This has value I can use.",
        ultimate: "Iron Will engaged. Nothing gets through.",
    },

    air: {
        injured: "I'm scattered — pull together!",
        failure_1: "Drifting away... where the wind goes...",
        failure_2: "I just needed a little more sky.",
        twin_event: "Two? Ha! The wind doesn't pick favorites!",
        boss_moment_1: "You look heavy. That's going to be a problem for you.",
        boss_moment_2: "Let's see if you can catch the breeze.",
        boss_win_1: "Gone like a breath!",
        boss_win_2: "Ha! Try catching the wind!",
        found_1: "Oh, this thing is singing to me.",
        found_2: "Something special just drifted into my hands.",
        ultimate: "TWISTER! Ha! Hold on to something!",
    },

    void: {
        injured: "The void begins to claim me...",
        failure_1: "I return to nothing. As everything does.",
        failure_2: "Silence... at last.",
        twin_event: "Two echoes in the dark. How unfortunate... for them.",
        boss_moment_1: "You are a flicker. I am the nothing that swallows all light.",
        boss_moment_2: "The void has patience. You do not.",
        boss_win_1: "Consumed.",
        boss_win_2: "You were always nothing. Now you know it.",
        found_1: "It pulses with something I recognize.",
        found_2: "...This thing has seen darkness.",
        ultimate: "Void Eruption. Everything ends.",
    },

    spirit: {
        injured: "My peace is breaking. I must hold on.",
        failure_1: "I release... without regret.",
        failure_2: "Balance is restored. Even in this.",
        twin_event: "Two sides of the same chaos. I remain the center.",
        boss_moment_1: "You carry great weight. I can see it. That won't help you here.",
        boss_moment_2: "Inner peace cannot be shattered by outer force.",
        boss_win_1: "Balance is restored.",
        boss_win_2: "Harmony prevails.",
        found_1: "This... I wasn't meant to find this yet.",
        found_2: "A gift from the universe. I accept it with gratitude.",
        ultimate: "I am the stillness at the center of the storm.",
    },

    chance: {
        injured: "Bad roll! Come on luck, don't leave me now!",
        failure_1: "House always wins. Today, anyway.",
        failure_2: "Finally ran out of luck.",
        twin_event: "Two for one? Ha! I love those odds!",
        boss_moment_1: "Let's raise the stakes, shall we?",
        boss_moment_2: "I've bet everything on worse hands than this.",
        boss_win_1: "Read 'em and weep!",
        boss_win_2: "Ha! Never bet against the lucky one!",
        found_1: "Jackpot! Look at this beauty!",
        found_2: "Someone up there likes me.",
        ultimate: "Wild Card! Anything goes now!",
    },

    sound: {
        injured: "The melody is breaking apart!",
        failure_1: "Every song finds its final note.",
        failure_2: "The silence takes me.",
        twin_event: "A duet? Let's see if you can keep up!",
        boss_moment_1: "The crescendo was always going to end here.",
        boss_moment_2: "I will compose something worthy of this moment.",
        boss_win_1: "And... finale!",
        boss_win_2: "The symphony is complete!",
        found_1: "This vibrates at a frequency I've never heard.",
        found_2: "It harmonizes perfectly.",
        ultimate: "RESONANCE! Feel the full force of the symphony!",
    },

    poison: {
        injured: "You think that hurt me? Amusing.",
        failure_1: "Every poison has a cure. Mine just found it.",
        failure_2: "I have been the end of many. Now...",
        twin_event: "Two more carriers. The contagion spreads further.",
        boss_moment_1: "I've been seeping through your defenses since you first saw me.",
        boss_moment_2: "You don't beat poison. You survive it. Temporarily.",
        boss_win_1: "Infected. Neutralized.",
        boss_win_2: "No antidote for this.",
        found_1: "This is deliciously corrupted.",
        found_2: "Whatever this is, it has potential for harm. Wonderful.",
    },

    gravity: {
        injured: "The pull is too strong. Fight it.",
        failure_1: "All things collapse inward. In time.",
        failure_2: "I return to the center.",
        twin_event: "Two bodies. The gravitational pull intensifies.",
        boss_moment_1: "Nothing escapes what I carry.",
        boss_moment_2: "You stand at the edge of an event horizon.",
        boss_win_1: "Crushed under the weight of inevitability.",
        boss_win_2: "Pulled in. As all things are.",
        found_1: "This object bends the space around it.",
        found_2: "I feel its mass before I even touch it.",
    },

    // ── Add voice IDs to voice_ids.txt to enable these ──────────────────────────

    earth: {
        injured: "I'm crumbling... but I don't fall!",
        failure_1: "The mountain... has fallen.",
        failure_2: "I sink back into the earth.",
        twin_event: "Two? The ground shakes for both of you!",
        boss_moment_1: "I have stood longer than you have existed.",
        boss_moment_2: "You will break against me like every wave before you.",
        boss_win_1: "The mountain endures.",
        boss_win_2: "Buried.",
        found_1: "Something ancient is in this.",
        found_2: "The earth yielded this to me for a reason.",
    },

    lightning: {
        injured: "Aaah — short circuit! Keep going!",
        failure_1: "The charge... dies here.",
        failure_2: "Every bolt finds ground eventually.",
        twin_event: "Two of you? I'll hit both at once!",
        boss_moment_1: "You're about to learn what a direct strike feels like.",
        boss_moment_2: "Speed beats power. Always.",
        boss_win_1: "Strike!",
        boss_win_2: "Overloaded!",
        found_1: "This crackles with something wild.",
        found_2: "Electric. I like it.",
    },

    // time: {
    //     injured:        "The timeline is fracturing... hold together.",
    //     failure_1:      "Even I cannot outrun every ending.",
    //     failure_2:      "This was always one of the outcomes.",
    //     twin_event:     "Two of you... I've seen this before. It didn't end well.",
    //     boss_moment_1:  "I have watched this moment approaching for a long time.",
    //     boss_moment_2:  "Every path through time led here.",
    //     boss_win_1:     "This timeline survives.",
    //     boss_win_2:     "Rewritten.",
    //     found_1:        "This doesn't belong in this moment.",
    //     found_2:        "A fragment from another timeline.",
    // },

    // love: {
    //     injured:        "It hurts... but I won't let go.",
    //     failure_1:      "I loved every moment of this.",
    //     failure_2:      "Even this is an act of love.",
    //     twin_event:     "Two of you... my heart is big enough.",
    //     boss_moment_1:  "I'm not fighting out of hate. That's why I'll win.",
    //     boss_moment_2:  "Love is the strongest force in any world.",
    //     boss_win_1:     "Love wins.",
    //     boss_win_2:     "Open your heart.",
    //     found_1:        "Oh! This feels like it was waiting for me.",
    //     found_2:        "Something wonderful just found its way to me.",
    // },
};

// DLC heroes output to their own DLC directory to stay separate from base game audio
const DLC_OUTPUT_DIRS = {
    air:      path.join(__dirname, '../dlc/waker_of_winds/audio/voices/air'),
    gravity:  path.join(__dirname, '../dlc/champions_of_chaos/audio/voices/gravity'),
    void:     path.join(__dirname, '../dlc/champions_of_chaos/audio/voices/void'),
    spirit:   path.join(__dirname, '../dlc/faith_of_fortune/audio/voices/spirit'),
    chance:   path.join(__dirname, '../dlc/faith_of_fortune/audio/voices/chance'),
    sound:    path.join(__dirname, '../dlc/symphony_of_sickness/audio/voices/sound'),
    poison:   path.join(__dirname, '../dlc/symphony_of_sickness/audio/voices/poison'),
    earth:    path.join(__dirname, '../dlc/rise_of_the_rock/audio/voices/earth'),
    lightning: path.join(__dirname, '../dlc/tournament_of_thunder/audio/voices/lightning'),
    // echos_of_eternity heroes (add voice IDs to voice_ids.txt to enable):
    // time:  path.join(__dirname, '../dlc/echos_of_eternity/audio/voices/time'),
    // love:  path.join(__dirname, '../dlc/echos_of_eternity/audio/voices/love'),
};

// ── Main ────────────────────────────────────────────────────────────────────────
async function main() {
    if (!API_KEY) {
        console.error('Please set ELEVENLABS_API_KEY environment variable.');
        process.exit(1);
    }
    const client = new ElevenLabsClient({ apiKey: API_KEY });

    // Build flat task list
    const tasks = [];
    for (const [hero, lines] of Object.entries(LINES)) {
        const voiceId = voiceIds[hero];
        if (!voiceId) {
            console.warn(`[SKIP] No voice ID for '${hero}' — add it to voice_ids.txt`);
            continue;
        }
        for (const [situation, text] of Object.entries(lines)) {
            const dir  = DLC_OUTPUT_DIRS[hero] || path.join(OUTPUT_BASE, hero);
            const file = path.join(dir, `${situation}.mp3`);
            tasks.push({ hero, voiceId, situation, text, dir, file });
        }
    }

    console.log(`\nGenerating ${tasks.length} voice lines across ${Object.keys(LINES).length} heroes...\n`);

    let generated = 0;
    let skipped = 0;

    for (const task of tasks) {
        if (fs.existsSync(task.file)) {
            console.log(`[SKIP] ${task.hero}/${task.situation} (already exists)`);
            skipped++;
            continue;
        }

        fs.mkdirSync(task.dir, { recursive: true });
        console.log(`[GEN]  ${task.hero}/${task.situation}: "${task.text}"`);

        try {
            const response = await client.textToSpeech.convert(task.voiceId, {
                text: task.text,
                model_id: MODEL_ID,
                output_format: 'mp3_44100_128',
                voice_settings: VOICE_SETTINGS,
            });

            const fileStream = fs.createWriteStream(task.file);
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

            console.log(`       → saved ${path.relative(path.join(__dirname, '..'), task.file)}`);
            generated++;

            // Rate limit protection
            await new Promise(r => setTimeout(r, 500));

        } catch (err) {
            console.error(`[ERR]  ${task.hero}/${task.situation}: ${err.message}`);
        }
    }

    console.log(`\nDone. Generated: ${generated}  Skipped: ${skipped}`);
    if (generated > 0) {
        console.log(`\nFiles saved to: audio/voices/{hero}/{situation}.mp3`);
        console.log('Hook them up in game.js by playing audioManager.playVoice() or a dedicated playHeroExclamation() helper.');
    }
}

main();
