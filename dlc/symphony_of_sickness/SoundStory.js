/*
    SOUND HERO — "THE GRAND TOUR OF RESONANCE"
    The Performer's world conquest through music.
    Arc 1: Home (Sound biome) — learning the craft.
    Arc 2: Fire biome — the Ember Stage. Harmonize or burn.
    Arc 3: Water biome — the Deep Amphitheater. Tune the tides.
    Arc 4: Plant biome — the Jungle Chorus. Nature bends to the beat.
    Arc 5: Ice biome — the Crystal Hall. Shatter and sing.
    Arc 6: Metal biome — the Machine Amphitheater. Override the gears.
    Arc 7 (Final): All biomes harmonized. Face the Silent Shadow.

    Biome mechanic: Foreign biome waves require the player to
    conquer the Ritual of Resonance totems to transform the biome mid-wave.
*/

window.SOUND_STORY_CHAPTERS = [

    // ─── ARC 1: THE RESONANT PLAIN (Waves 1–10) ─────────────────────────────
    // Home base. The Performer's power awakens. The world must be made to listen.

    {
        id: "sound_1", wave: 1, hero: "SOUND", type: "NARRATIVE",
        title: "The First Note",
        text: "The Resonant Plain hums beneath your feet — your birthplace, your stage. Every stone vibrates with potential. But one biome is not enough. The world is full of noise, full of chaos, full of sounds that belong to no one. You will give them an owner.",
        data: { biome: 'HERO' }
    },
    {
        id: "sound_2", wave: 2, hero: "SOUND", type: "NARRATIVE",
        title: "Vibrations",
        text: "The first enemies arrive stumbling through the static. You feel them before you see them — each footstep a wrong note, each grunt an off-key intrusion. You correct them the only way a Performer knows how.",
        data: { biome: 'HERO' }
    },
    {
        id: "sound_3", wave: 3, hero: "SOUND", type: "NARRATIVE",
        title: "Echo Location",
        text: "Your waves bounce off the valley walls, painting the world in sound. You can feel the pulse of every creature within range. Nothing moves without your awareness. This biome already sings your name.",
        data: { biome: 'HERO' }
    },
    {
        id: "sound_4", wave: 4, hero: "SOUND", type: "NARRATIVE",
        title: "Amplification",
        text: "You call to the far mountains and hear yourself return — louder. The plain amplifies you, feeds you back your own power, magnified. You are building toward something immense. The question is no longer if the world will listen, but when.",
        data: { biome: 'HERO' }
    },
    {
        id: "sound_5", wave: 5, hero: "SOUND", type: "NARRATIVE",
        title: "The Chorus",
        text: "You are not alone. The wind, the rivers, the creak of ancient trees — they join your tempo. The rhythm of battle fuels you. You are the conductor and the plain is your orchestra. But orchestras must grow. One biome is a solo. You need a symphony.",
        data: { biome: 'HERO' }
    },
    {
        id: "sound_6", wave: 6, hero: "SOUND", type: "NARRATIVE",
        title: "Dissonance",
        text: "An enemy appears that absorbs sound — a void in the music. Every note you fire vanishes into it. But you have learned: every material has a resonant frequency. You simply have to find the one that tears it apart.",
        data: { biome: 'HERO' }
    },
    {
        id: "sound_7", wave: 7, hero: "SOUND", type: "NARRATIVE",
        title: "High Fidelity",
        text: "Clarity comes with practice. You now target with surgical precision — a note for the kneecap, a chord for the ribcage, a full crescendo for the soul. The biology of your enemies is just another instrument waiting to be played.",
        data: { biome: 'HERO' }
    },
    {
        id: "sound_8", wave: 8, hero: "SOUND", type: "NARRATIVE",
        title: "Feedback Loop",
        text: "Your energy returns to you, amplified. You are encased in a shell of standing waves. They test you in increasing numbers, but you only grow louder with each wave they send. The horizon beyond the plain pulses with colour you haven't harmonized yet.",
        data: { biome: 'HERO' }
    },
    {
        id: "sound_9", wave: 9, hero: "SOUND", type: "NARRATIVE",
        title: "The Grand Plan",
        text: "You spread your awareness beyond the plain. You sense them — Fire, Water, Plant, Ice, Metal. Five foreign biomes, each with its own cacophony. Five stages that don't yet know your name. After you defeat whatever comes next, the tour begins.",
        data: { biome: 'HERO' }
    },
    {
        id: "sound_10", wave: 10, hero: "SOUND", type: "BOSS_SPAWN",
        title: "The Cacophony",
        text: "A massive beast emerges, roaring a challenge that shakes the valley. Every step it takes is a discordant thunderclap. It has never heard music before. It is about to receive an education.",
        data: { bossId: 'RHINO', biome: 'HERO' }
    },

    // ─── ARC 2: THE EMBER STAGE — Fire Biome (Waves 11–20) ──────────────────
    // The Performer enters the Fire biome. Crackle and roar resist the melody.
    // Waves 11–12: fire biome. Totems must be conquered to transform it.
    // Waves 13–15: HERO (fire converted). Waves 16–17: water. Waves 18–20: HERO.

    {
        id: "sound_11", wave: 11, hero: "SOUND", type: "NARRATIVE",
        title: "The Ember Stage",
        text: "The fire biome. Columns of flame, the shriek of heat, the roar of an inferno that has never known a conductor. This is not a concert hall — yet. You sense the three Resonance Totems hidden among the cinders. Claim them, and fire will learn to crackle in your key.",
        data: { biome: 'fire' }
    },
    {
        id: "sound_12", wave: 12, hero: "SOUND", type: "NARRATIVE",
        title: "Harmonize or Burn",
        text: "The flames resist you. Fire has its own tempo — wild, arrhythmic, hungry. But you have felt worse dissonance. Stand at the totems long enough to impose your beat, and this inferno will bend. The fire doesn't have to stop burning. It just has to burn in time.",
        data: { biome: 'fire' }
    },
    {
        id: "sound_13", wave: 13, hero: "SOUND", type: "NARRATIVE",
        title: "Embers of Harmony",
        text: "The transformation spreads like a shockwave — the crackle becomes a rhythm, the roar becomes a bass line. The Ember Stage is yours. Fire still burns here, but it burns to your tempo. The first conquest is complete.",
        data: { biome: 'HERO' }
    },
    {
        id: "sound_14", wave: 14, hero: "SOUND", type: "NARRATIVE",
        title: "Ash and Rhythm",
        text: "The fire enemies scatter, disoriented by the new frequency that saturates their home. A few stragglers cling to the old chaos. You are here to correct them. No refunds for tickets to a show you didn't pay for.",
        data: { biome: 'HERO' }
    },
    {
        id: "sound_15", wave: 15, hero: "SOUND", type: "NARRATIVE",
        title: "The Fire's Memory",
        text: "The ember stage hums with a low, satisfied drone. You leave it burning — now, every flicker is a quarter note in your score. Ahead lies a deeper kind of silence: the vast, formless roar of the ocean.",
        data: { biome: 'HERO' }
    },
    {
        id: "sound_16", wave: 16, hero: "SOUND", type: "NARRATIVE",
        title: "The Deep Amphitheater",
        text: "The water biome. Waves crashing, currents surging — it has its own rhythm, older than any song you know. That makes this interesting. The ocean has never had a composer. Find the three totems beneath the spray. Tune the tide.",
        data: { biome: 'water' }
    },
    {
        id: "sound_17", wave: 17, hero: "SOUND", type: "NARRATIVE",
        title: "Underwater Acoustics",
        text: "Sound travels four times faster in water. The ocean amplifies you beautifully — if you can dominate it first. The totems are contested; the water throws its creatures at you. Hold your ground at each one and impose the beat. Water follows the path of least resistance. Be that path.",
        data: { biome: 'water' }
    },
    {
        id: "sound_18", wave: 18, hero: "SOUND", type: "NARRATIVE",
        title: "Current of Sound",
        text: "The ocean breaks. Not violently — it simply shifts, as if it had always been waiting for a conductor. The waves synchronize, the currents follow a tempo, the spray falls in rhythm. Two biomes harmonized. Three remain.",
        data: { biome: 'HERO' }
    },
    {
        id: "sound_19", wave: 19, hero: "SOUND", type: "NARRATIVE",
        title: "Still Waters",
        text: "The sea is calmer now, shaped by your frequency. But from the deep comes a response — something vast and silent approaches. It has heard your conquest of the ocean and does not approve.",
        data: { biome: 'HERO' }
    },
    {
        id: "sound_20", wave: 20, hero: "SOUND", type: "BOSS_SPAWN",
        title: "The Silencer",
        text: "An entity of pure void rises from the water — it absorbs every frequency, devours every echo. The ocean goes completely silent around it. You must scream loud enough to fill the void, or the first two conquests mean nothing.",
        data: { bossId: 'NOVA', biome: 'HERO' }
    },

    // ─── ARC 3: THE JUNGLE CHORUS & CRYSTAL HALL (Waves 21–30) ─────────────
    // Plant biome (21–22), then HERO (23–25), then Ice biome (26–27), HERO (28–30).

    {
        id: "sound_21", wave: 21, hero: "SOUND", type: "NARRATIVE",
        title: "The Jungle Chorus",
        text: "The plant biome erupts with sound — bird calls, wind through leaves, the low percussion of roots shifting in soil. Nature makes music, but nature has never heard music. There is a difference. Find the totems buried in the undergrowth. Make the jungle choose a conductor.",
        data: { biome: 'plant' }
    },
    {
        id: "sound_22", wave: 22, hero: "SOUND", type: "NARRATIVE",
        title: "Overgrown Stage",
        text: "The jungle pushes back. Vines tangle the totems, roots shift their positions, creatures swarm to reclaim them the moment you step away. Persistence is the instrument here. The jungle will not harmonize easily — it is proud of its own cacophony. Override it.",
        data: { biome: 'plant' }
    },
    {
        id: "sound_23", wave: 23, hero: "SOUND", type: "NARRATIVE",
        title: "The Living Song",
        text: "The moment of conversion. The jungle falls into tempo — leaves rustle on the beat, branches sway in 4/4, even the insects chirp in key. You have conducted an entire ecosystem. Three biomes harmonized.",
        data: { biome: 'HERO' }
    },
    {
        id: "sound_24", wave: 24, hero: "SOUND", type: "NARRATIVE",
        title: "Root Rhythm",
        text: "The plant enemies are slower now, their movements synchronized to your beat. They are no less dangerous — but predictable. Predictable things can be composed around. Ahead, the temperature drops sharply.",
        data: { biome: 'HERO' }
    },
    {
        id: "sound_25", wave: 25, hero: "SOUND", type: "NARRATIVE",
        title: "Undergrowth Beat",
        text: "The jungle behind you pulses with a slow, organic rhythm. You are beginning to feel the harmony of the world as a whole — not just one biome, but all of them, slowly tuning to your frequency. Two more stages to go.",
        data: { biome: 'HERO' }
    },
    {
        id: "sound_26", wave: 26, hero: "SOUND", type: "NARRATIVE",
        title: "The Crystal Hall",
        text: "Ice. Silence, then the high-pitched crack of glaciers shifting. Crystal formations hang like chandeliers, each one a perfect resonator. You have entered the most acoustically perfect biome in the world — and it belongs to someone else. Locate the three frozen totems and warm them with your frequency.",
        data: { biome: 'ice' }
    },
    {
        id: "sound_27", wave: 27, hero: "SOUND", type: "NARRATIVE",
        title: "Frozen Frequency",
        text: "Ice transmits sound in perfect, razor-sharp clarity. Every note you play cuts the crystal air like a blade. But the ice also shatters what it cannot contain. Hold the totems long enough and the ice will not break your sound — it will amplify it.",
        data: { biome: 'ice' }
    },
    {
        id: "sound_28", wave: 28, hero: "SOUND", type: "NARRATIVE",
        title: "Thawed Harmonics",
        text: "A single resonant tone spreads from the conquered totems. The crystal hall fills with warm harmonics where there was only frozen silence. Ice does not disappear — it simply sings now. Four biomes down.",
        data: { biome: 'HERO' }
    },
    {
        id: "sound_29", wave: 29, hero: "SOUND", type: "NARRATIVE",
        title: "Breaking Point",
        text: "The ice enemies splinter — literally. Your harmonics have reached a frequency that their crystalline forms cannot sustain. They were beautiful and deadly. Now they are just shards. Something ancient stirs beneath the cold, something that has composed dark music for centuries.",
        data: { biome: 'HERO' }
    },
    {
        id: "sound_30", wave: 30, hero: "SOUND", type: "BOSS_SPAWN",
        title: "The Composer",
        text: "A twisted being of old instruments and fused flesh rises — it has been composing this world's discord for centuries. It sees your four harmonized biomes and declares war. It tries to steal your melody and conduct your death. Show it who leads this orchestra.",
        data: { bossId: 'HYDRA', biome: 'HERO' }
    },

    // ─── ARC 4: THE MACHINE AMPHITHEATER (Waves 31–40) ─────────────────────
    // Metal biome (31–32), HERO (33–35), HERO (36–37), HERO (38–40).

    {
        id: "sound_31", wave: 31, hero: "SOUND", type: "NARRATIVE",
        title: "The Machine Amphitheater",
        text: "Metal. The grinding of gears, the percussion of pistons, the relentless, mechanical rhythm of a world built by engineers who never heard music. Machines have rhythm, but no soul. You will give them one. The totems here are iron-bound and guarded by the machine's own defenses.",
        data: { biome: 'metal' }
    },
    {
        id: "sound_32", wave: 32, hero: "SOUND", type: "NARRATIVE",
        title: "Override",
        text: "The machines fight the conversion. Their rhythm is precise, digital, calculated — it has no room for the organic swing of your beat. But precision without soul is just noise. Hold the totems long enough for your frequency to overwrite their code. Music is a better operating system.",
        data: { biome: 'metal' }
    },
    {
        id: "sound_33", wave: 33, hero: "SOUND", type: "NARRATIVE",
        title: "Steel Symphony",
        text: "The machines pause — then restart in 4/4 time. Pistons pump on the beat. Gears mesh in a new, harmonic sequence. The factory has become a percussion ensemble. Five biomes harmonized. Only one remains.",
        data: { biome: 'HERO' }
    },
    {
        id: "sound_34", wave: 34, hero: "SOUND", type: "NARRATIVE",
        title: "The Gears Sing",
        text: "The metal enemies now move in synchronized formation — not because you command them, but because the rhythm commands everything in range. They are still dangerous, still relentless. But they are in tempo.",
        data: { biome: 'HERO' }
    },
    {
        id: "sound_35", wave: 35, hero: "SOUND", type: "NARRATIVE",
        title: "Harmonic Overtones",
        text: "You can feel all five converted biomes vibrating at once — fire, water, plant, ice, metal — a chord that spans the world. It is magnificent. And behind you, you feel a massive vibration that does not belong to any biome. It is your own shadow. It has been following you.",
        data: { biome: 'HERO' }
    },
    {
        id: "sound_36", wave: 36, hero: "SOUND", type: "NARRATIVE",
        title: "Resonant Peak",
        text: "Five biomes harmonized. You stand at the apex of your conquest, the five great stages vibrating beneath a single conductor. You have done what no Performer ever attempted. But mastery is not the same as completion. Your shadow has been building something — collecting the silence of every converted biome, composing its response.",
        data: { biome: 'HERO' }
    },
    {
        id: "sound_37", wave: 37, hero: "SOUND", type: "NARRATIVE",
        title: "The Shadow's Symphony",
        text: "You hear it before you see it — a frequency that mirrors yours exactly, but inverted. Your shadow is composing. Every note you played across five biomes, it has heard and countered. A perfect, dark counterpoint to your grand tour. The final movement is not a solo. It is a duel.",
        data: { biome: 'HERO' }
    },
    {
        id: "sound_38", wave: 38, hero: "SOUND", type: "NARRATIVE",
        title: "The World Resonates",
        text: "Five biomes vibrating in perfect harmony — the crackle of fire, the rhythm of the tide, the pulse of the jungle, the crystalline ring of ice, the mechanical percussion of metal. Every stage claimed. The world is your concert hall now. One thing remains: the dark movement that follows every great symphony.",
        data: { biome: 'HERO' }
    },
    {
        id: "sound_39", wave: 39, hero: "SOUND", type: "NARRATIVE",
        title: "Dark Harmony",
        text: "The enemies dissolve in the resonant field you have built. But the shadow you have felt since the metal biome grows louder — a frequency of pure silence, of negation. It is not an enemy from outside. It is the silence you left behind — the version of you that never played a note, that let the world stay mute.",
        data: { biome: 'HERO' }
    },
    {
        id: "sound_40", wave: 40, hero: "SOUND", type: "BOSS_SPAWN",
        title: "The Banshee",
        text: "A spirit of grief wails across the harmonized world — a death-song that has outlived its composer. Her voice is the oldest sound in existence and it seeks to silence yours forever. Counter her melody with the full weight of five conquered biomes behind you.",
        data: { bossId: 'SPEEDSTER', biome: 'HERO' }
    },

    // ─── ARC 5: THE OVATION — Final Symphony (Waves 41–50) ─────────────────
    // All biomes harmonized. The shadow self approaches. The final movement.

    {
        id: "sound_41", wave: 41, hero: "SOUND", type: "NARRATIVE",
        title: "Encore",
        text: "The Banshee fades mid-note. Her grief, finally resolved. You stand in the center of a world that hums with your music — every biome vibrating in harmony. But perfect harmony has a shadow. The silence that was everywhere before you began has not disappeared. It has been collecting itself.",
        data: { biome: 'HERO' }
    },
    {
        id: "sound_42", wave: 42, hero: "SOUND", type: "NARRATIVE",
        title: "The World Sings",
        text: "From here, you can hear all five biomes at once: the crackle of harmonic fire, the rhythmic tide, the living pulse of the jungle, the crystalline ice, the mechanical percussion. It is the most complex piece ever composed. It is yours.",
        data: { biome: 'HERO' }
    },
    {
        id: "sound_43", wave: 43, hero: "SOUND", type: "NARRATIVE",
        title: "Ultrasonic",
        text: "You push your frequency beyond what the world was designed to carry. You phase slightly out of sync with reality itself. Attacks pass through you. You are becoming sound — intangible, omnipresent, eternal. But something in the dark does not like this.",
        data: { biome: 'HERO' }
    },
    {
        id: "sound_44", wave: 44, hero: "SOUND", type: "NARRATIVE",
        title: "Harmonic Convergence",
        text: "All five converted biomes pulse in unison. You direct their combined frequency into a single weapon of mass harmony. The enemies dissolve before they reach you. But the shadow is immune. It is made of your own absence.",
        data: { biome: 'HERO' }
    },
    {
        id: "sound_45", wave: 45, hero: "SOUND", type: "NARRATIVE",
        title: "The Great Bell",
        text: "You find an ancient structure — a bell the size of a mountain at the center of the world. Every Performer has known of it. None have reached it. You strike it. The ring clears the sky and summons the final truth: you cannot harmonize the world without first harmonizing yourself.",
        data: { biome: 'HERO' }
    },
    {
        id: "sound_46", wave: 46, hero: "SOUND", type: "NARRATIVE",
        title: "Sound of Silence",
        text: "You revisit the silence before your first note. It was not empty — it was potential. Everything you have done since that first note was written in that original silence. The shadow has always been there. It is the you that might have stayed quiet.",
        data: { biome: 'HERO' }
    },
    {
        id: "sound_47", wave: 47, hero: "SOUND", type: "NARRATIVE",
        title: "Final Verse",
        text: "The lyrics are written in the frequencies of five biomes. The last movement of your symphony approaches. You have turned the world into an instrument. Now you must play the final note — not outward, but inward.",
        data: { biome: 'HERO' }
    },
    {
        id: "sound_48", wave: 48, hero: "SOUND", type: "NARRATIVE",
        title: "Broken Record",
        text: "Time skips. You relive the moment in the fire biome, in the frozen hall, in the jungle — each transformation reflected back at you. You have heard this song before, in reverse. Your shadow has been watching every performance. Memorizing every weakness.",
        data: { biome: 'HERO' }
    },
    {
        id: "sound_49", wave: 49, hero: "SOUND", type: "NARRATIVE",
        title: "The Conductor's Bow",
        text: "You bow before the final curtain. Five biomes harmonized. A world reshaped in your image. The Shadow Realm awaits — a place without resonance, without beat, without echo. Your dissonant self waits there. It has been composing its rebuttal since your first note.",
        data: { biome: 'HERO' }
    },
    {
        id: "sound_50", wave: 50, hero: "SOUND", type: "BOSS_FIGHT",
        title: "The Silent Shadow",
        text: "The music stops. The world turns monochrome. A figure steps out from your own reflection — you, but drained of every frequency. It has absorbed the silence of every biome you conquered. It is the accumulated quiet of a world that once had no song. Defeat your dissonance. Play the final note.",
        data: { bossId: 'SHADOW_CLONE', biome: 'black' }
    }
];
