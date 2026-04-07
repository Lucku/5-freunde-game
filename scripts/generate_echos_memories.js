const fs = require('fs');
const path = require('path');
const { Readable } = require('stream');
const { ElevenLabsClient } = require('@elevenlabs/elevenlabs-js');

// --- Configuration ---
const API_KEY = process.env.ELEVENLABS_API_KEY;
const MODEL_ID = 'eleven_multilingual_v2';

const TIME_VOICE_ID = 'QajSKZavaIyUgvSOrelX';
const LOVE_VOICE_ID = '5x1b7R9BDxre5p7xVRsn';

const OUTPUT_DIR = path.join(__dirname, '../dlc/echos_of_eternity/audio/memories');

// --- Memory texts (from dlc/echos_of_eternity/index.js — injectMemories) ---
const heroes = [
    {
        key: 'time',
        voiceId: TIME_VOICE_ID,
        memories: [
            // 1-10: Early realizations
            "I used to think I was broken. Now I know I was just early.",
            "Every clock I ever looked at felt like it was mocking me. Tick. Tick. You are wasting this.",
            "I had everything anyone could want. And I kept searching for the thing that would finally make it feel like enough.",
            "The lie started small. So small I didn't recognize it as a lie. By the time I did, it had become the foundation of my life.",
            "I smiled at people I didn't trust. Said fine when I wasn't. Laughed at jokes I found hollow. I was fluent in the language of pretending.",
            "She asked me once where I went when I got that distant look. I said nowhere. I was everywhere. Every other moment I could have chosen instead of this one.",
            "I told myself it was ambition. That I needed more because I was capable of more. It took a long time to admit I needed more because I was afraid of what stillness would reveal.",
            "The hardest thing I ever did was sit quietly with myself and not immediately reach for something to fill the silence.",
            "I remember the exact moment I understood I had been lying. Not to her. To myself. About what I wanted. About who I was.",
            "Time does not heal wounds. It only gives you enough distance to finally look at them directly.",
            // 11-20: Deeper reckoning
            "I used to rewind conversations in my mind and rehearse different endings. Cleverer exits. Better words. As if I could retroactively become the person I wished I had been.",
            "The people who loved me loved a version of me I was performing. I was grateful and terrified in equal measure.",
            "I left because staying felt like suffocation. Only later did I understand that what I was suffocating under was my own silence.",
            "She deserved honesty. I gave her competence instead. I was always there, just never truly present.",
            "I know what it looks like to want someone and treat them as furniture simultaneously. I have done it. I am ashamed.",
            "The moments I cannot rewind are the ones that define me now. I don't get to choose differently. I only get to choose what comes next.",
            "I thought freedom meant having no obligations. I was wrong. Freedom is knowing you could leave and choosing to stay.",
            "There is a version of me in some other timeline who told the truth sooner. I hope he is happier. I know he is.",
            "I am not who I was. But I am made entirely of who I was. That is the paradox I have stopped trying to resolve.",
            "The fractures in time are real. So are the ones in me. Perhaps that is why I can see them when others cannot.",
        ],
    },
    {
        key: 'love',
        voiceId: LOVE_VOICE_ID,
        memories: [
            // 1-10: Life before
            "He was the kind of man who filled a room. When he laughed, you felt lucky to be the one who made him laugh.",
            "We used to sit at the kitchen table until midnight. Just talking. I thought that meant we understood each other. I think it meant we were both lonely.",
            "He had a way of making you feel chosen. Special. As if you were the only thing he had ever wanted. I didn't know then that was something he did with everyone.",
            "I remember the first time he cancelled plans. He apologized so beautifully that I almost felt guilty for being disappointed.",
            "I built my life around his schedule. Not because he asked. Because I thought that was what love looked like. No one told me love shouldn't require that kind of erosion.",
            "He was always somewhere else, even when he was there. I told myself he was just tired. I knew the word for it now. I just wasn't ready to say it.",
            "I used to rehearse conversations in my head. How I would bring it up. What I would say. Then he would smile and I would put it away again and tell myself I was imagining things.",
            "There are photographs from those years where I look genuinely happy. I was. And that is the part I have the hardest time explaining to people.",
            "I loved him completely. I want that on record. Whatever came after — I loved him completely, and it was real, and that matters.",
            "I think the worst part is not what he did. It is that I can still remember all the reasons I stayed.",
            // 11-20: The cracks
            "The first time I found something I couldn't explain away, I explained it away anyway. Practice makes perfect.",
            "He had a name for how I was feeling. He called it anxiety. He said I needed to trust more. I trusted him enough to believe that.",
            "I started keeping a list. Not to confront him. Just to have something to hold in my hands when my mind told me I was making it up.",
            "The lies got more intricate. More practiced. Looking back, I can see how much effort it took. I wonder if he was exhausted.",
            "I stopped asking where he'd been. Not because I believed the answers. Because the asking hurt more than the not knowing.",
            "There is a kind of loneliness that is worse than being alone. It is the loneliness of being with someone who has already left.",
            "He touched my face one morning before he got up. Gently. Like something precious. I thought it meant things were getting better. I think it was goodbye.",
            "I started crying in the car on the way to work. Not because of anything specific. Just because there was finally space to.",
            "I told my sister something was wrong. She said all couples go through rough patches. She was trying to help. She didn't know.",
            "The day I stopped waiting for him to choose me was the day I started choosing myself. I didn't know that's what I was doing at the time.",
            // 21-30: The knowing
            "When you know, you know. The problem is that knowing and accepting are two entirely different things.",
            "I found the proof on a Tuesday. The world didn't end. I made dinner. I washed the dishes. I went to bed. I lay very still and waited for myself to feel something.",
            "He cried when I confronted him. Real tears. And even then, part of me wanted to comfort him. That is the part of myself I had to learn to understand.",
            "He said it only happened once. I said I know that isn't true. The room got very quiet.",
            "He told me I was the one he wanted. I said that didn't explain the other person. He didn't have an answer for that.",
            "I didn't scream. I didn't throw things. I think that surprised him. He was prepared for anger. He wasn't prepared for how calm I was. I was calm because I had already grieved.",
            "There is a specific loneliness to loving someone who was never quite present enough to receive it.",
            "I had spent years loving a performance. And I think part of him loved me too — or loved the version of himself he was when he was with me.",
            "I asked him where he went. Not on the nights with her. Just generally. Where did he go when he got distant? He said he didn't know. I believe him.",
            "He was broken long before he broke us. That doesn't excuse it. But it helps me carry it.",
            // 31-40: After
            "People say time heals. Time doesn't heal. Distance heals. Understanding heals. Time is just the container.",
            "I had to learn to trust my own perception again. That took longer than I expected.",
            "Some mornings I wake up and I'm fine. Some mornings I wake up and I have to remind myself what is still real. That ratio gets better slowly.",
            "I started noticing things I never would have noticed before. The sound of rain. The weight of silence. All the things I stopped hearing when I was always listening for footsteps.",
            "The anger came later. That surprised me. By the time I was angry, I was already healing. I think that's how it works.",
            "My friends kept asking if I was angry. I kept saying not really. They didn't believe me. Eventually I stopped explaining.",
            "I started painting again. I had stopped — I don't know when. At some point I had just... stopped. Picking it back up felt like finding a piece of myself I had mailed to the wrong address.",
            "I think what I wanted most was an apology that was actually about me. Not about his guilt. Not about his shame. Just: I saw you. And I did that to you anyway. I never got that.",
            "I still have moments of doubt. Did I do something that made it easier for him to choose that? I have learned to sit with the question without letting it answer itself wrong.",
            "The strange thing is that I think losing him made me more capable of love, not less. I know what I'm not willing to accept. That is a kind of freedom.",
            // 41-50: Becoming
            "I remember the exact moment the grief turned into something else. Something quieter. Not peace exactly. More like a decision.",
            "I don't hate him. I tried. I thought it would be easier to carry than this — this grief that still has warmth in it. But you don't get to choose what shape your feelings take.",
            "Forgiveness isn't for him. It was never for him. It's for the version of me that still woke up hoping.",
            "I am different now. Better in some ways. Smaller in others. I am still learning which is which.",
            "I have had to learn to trust slowly. Not because I don't want to. Because I owe it to anyone I let close to me to be honest about what I am bringing.",
            "There are things I will never know. Why. When it started. Whether any of it was real. I have accepted that the not-knowing is permanent and that is a loss too.",
            "I used to think vulnerability was weakness. Now I understand it is the only thing worth protecting.",
            "Someone told me I was brave for staying as long as I did. I told them staying wasn't brave. Leaving was brave. They didn't understand the difference. I do.",
            "He is still somewhere in the world. I think about that sometimes. I hope he figured out why. I hope it cost him something.",
            "I loved him with my whole heart. That heart is mine now.",
            // 51: Secret shard — unlocked when all 50 love shards are collected
            "His name was Time. And I was the one who kept the world from ending while he was busy breaking it.",
        ],
    },
];

// --- Initialize Client ---
if (!API_KEY) {
    console.error('Please set ELEVENLABS_API_KEY environment variable.');
    process.exit(1);
}

const elevenlabs = new ElevenLabsClient({ apiKey: API_KEY });

// --- Main Generation Loop ---
async function generateAudio() {
    if (!fs.existsSync(OUTPUT_DIR)) {
        fs.mkdirSync(OUTPUT_DIR, { recursive: true });
    }

    for (const hero of heroes) {
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

    console.log('\nDone generating Echos of Eternity memory audio!');
}

generateAudio();
