const STORY_CHAPTERS = [
    { wave: 1, title: "The Transformation", text: "It wasn't long ago that you and your four friends lived normal lives. But destiny had other plans. In a flash of light, you were transformed, imbued with raw elemental energy. Now, you are the only thing standing between the world and total chaos." },
    { wave: 2, title: "The Pursuit", text: "You are being hunted. Swarms of dark creatures, twisted and mindless, are hot on your trail. They are the foot soldiers of a greater evil, relentless in their pursuit to extinguish your newfound light." },
    { wave: 3, title: "Proving Grounds", text: "To survive, you must master your powers. The world has fractured into shifting biomes—Fire, Water, Ice, Plant, and Metal. These are not just battlefields; they are crucibles designed to test your resolve and unlock your true potential." },
    { wave: 4, title: "The Legend", text: "Amidst the chaos, a legend surfaces. The Golden Mask. An artifact long forgotten by history, said to grant its wearer unspeakable power. It is the key to saving this world... or destroying it." },
    { wave: 5, title: "The Shadow", text: "The enemy has a name: Makuta. The leader of the evil forces, he watches from the shadows. He knows of the Golden Mask, and he will stop at nothing to claim it for himself." },
    { wave: 6, title: "Chaos Rising", text: "Makuta's influence grows stronger. He seeks to harness the power of the Golden Mask to bring eternal chaos. His minions grow more numerous, their attacks more desperate. He knows you are the only threat to his plan." },
    { wave: 7, title: "Inner Strength", text: "But Makuta is missing a crucial piece of the puzzle. The Golden Mask cannot simply be taken. It only reveals itself to a hero who has found their inner source of strength. It is not a prize to be won, but a burden to be earned." },
    { wave: 8, title: "The Bond", text: "You are not alone. The bond between the Five Friends is your greatest weapon. While Makuta commands through fear, you fight with friendship. This connection amplifies your elemental powers in ways the enemy cannot comprehend." },
    { wave: 9, title: "The Hunt Intensifies", text: "Makuta is getting impatient. He senses that one of you is close to unlocking the mask's location. The swarms are no longer just chasing; they are trying to corner you. The final test is approaching." },
    { wave: 10, title: "The Test", text: "You have survived the initial onslaught, but the real war begins now. You must continue to prove yourself across the biomes. Only by unlocking your full potential will the Golden Mask appear. Makuta is waiting. Don't let him win." },

    // --- ARC 2: MASTERING THE ELEMENTS (Waves 11-20) ---
    { wave: 11, title: "The Fire Within", text: "The heat of battle has forged a new strength in you. Like the magma of the Fire Biome, your resolve is hardening. You realize that your anger at Makuta can be a fuel, not just a burden." },
    { wave: 12, title: "Tides of Change", text: "The Water Biome teaches you adaptability. Makuta's forces are rigid, predictable. You must be like the ocean—yielding when necessary, but crashing down with unstoppable force when the moment is right." },
    { wave: 13, title: "Rooted in Strength", text: "In the Plant Biome, you learn patience. Growth cannot be rushed. Your powers are developing naturally, and your connection to the earth grounds you against the chaos Makuta tries to sow." },
    { wave: 14, title: "Cold Resolve", text: "The Ice Biome is unforgiving, stripping away all that is unnecessary. You learn to focus your mind, freezing out fear and doubt. Your clarity of purpose terrifies the mindless swarm." },
    { wave: 15, title: "Iron Will", text: "Metal does not bend easily, and neither do you. The Metal Biome tests your endurance. You take hit after hit, but you remain standing. You are becoming the shield for your friends." },
    { wave: 16, title: "Elemental Harmony", text: "You begin to see how the elements interact. Fire melts Ice, Water nourishes Plant. You are not five separate warriors, but one ecosystem of power. This synergy is something Makuta cannot replicate." },
    { wave: 17, title: "The First General", text: "Makuta sends a lieutenant to the field. A massive, twisted creature of shadow and scrap. It mocks your friendship, calling it a weakness. Proving it wrong feels satisfying." },
    { wave: 18, title: "A Trap Sprung", text: "The arena shifts unexpectedly, trapping you in a small zone. It's an ambush! Makuta is trying to separate you. You must fight back-to-back, covering all angles. Trust is your only survival tool." },
    { wave: 19, title: "Narrow Escape", text: "That was too close. The enemy is learning your patterns. You realize that to defeat Makuta, you must be unpredictable. You must embrace the chaos of the elements, not just control them." },
    { wave: 20, title: "The Swarm Adapts", text: "The enemies are evolving. They now have resistance to certain elements. You must switch tactics on the fly. The Golden Mask feels distant, but you know you are on the right path." },

    // --- ARC 3: THE SHADOW DEEPENS (Waves 21-30) ---
    { wave: 21, title: "Darker Skies", text: "The sky above the arena turns a bruised purple. Makuta's influence is bleeding into the simulation. The air feels heavy, oppressive. He is trying to crush your spirit before he crushes your body." },
    { wave: 22, title: "The Whisper", text: "You hear a voice in your head. Not your friends, but Him. Makuta offers you power, safety, if you just surrender the others. It's a lie, of course, but the temptation of rest is strong." },
    { wave: 23, title: "Doubt", text: "The constant fighting is taking its toll. You see a friend stumble. Are you strong enough to carry them? Doubt creeps in. Is the Golden Mask even real? Or is it just another one of Makuta's games?" },
    { wave: 24, title: "Friction", text: "The stress leads to mistakes. Friendly fire, missed signals. The unity you built is fraying. You must remember who the real enemy is. It's not the one standing next to you." },
    { wave: 25, title: "Reaffirming the Bond", text: "A moment of respite. You look at your friends, battered and tired. You realize they are fighting just as hard as you. The bond snaps back into place, stronger than before. You fight for them." },
    { wave: 26, title: "The Hidden Shrine", text: "Deep in the arena, you find ruins of an ancient shrine. It depicts five figures holding a mask. It's proof! The legend is real. The Golden Mask exists, and it was protected by heroes like you." },
    { wave: 27, title: "Glyph of Power", text: "You decipher a glyph on the shrine. 'Unity, Duty, Destiny'. These were the virtues of the ancients. To unlock the mask, you must embody these principles." },
    { wave: 28, title: "The Guardian's Test", text: "A spectral guardian appears, testing your worthiness. It doesn't attack your body, but your character. Do you fight for glory, or for peace? Your answer determines your path." },
    { wave: 29, title: "A Glimmer of Gold", text: "For a split second, you see it. A golden light piercing the shadows. It's calling to you. The mask is reacting to your renewed conviction. Makuta screams in rage somewhere in the void." },
    { wave: 30, title: "The False Mask", text: "Makuta creates a decoy, a cursed mask of shadow. It promises power but drains life. You almost fall for it, but your inner light reveals the deception. You destroy the trap." },

    // --- ARC 4: THE CORRUPTION (Waves 31-40) ---
    { wave: 31, title: "Regrouping", text: "Makuta is furious. His tricks have failed. Now he resorts to brute force. The next waves will be a test of pure endurance. Prepare yourselves." },
    { wave: 32, title: "The Biomes Bleed", text: "The biomes are merging in grotesque ways. Lava flows into the ice, creating choking steam. Vines are made of rusted metal. The world is in pain." },
    { wave: 33, title: "Corrupted Fire", text: "The fire enemies now burn with a black flame. It doesn't just burn; it corrupts. Do not let them touch you. Keep your distance and strike true." },
    { wave: 34, title: "Frozen Time", text: "The ice enemies slow time itself. Your movements feel sluggish. You must anticipate their attacks before they happen. Trust your instincts, not your eyes." },
    { wave: 35, title: "Poisoned Roots", text: "The plant life has turned toxic. Spores fill the air. You must keep moving to find fresh air. The arena is trying to suffocate you." },
    { wave: 36, title: "Rusted Metal", text: "The metal constructs are decaying, jagged and dangerous. Tetanus and corruption await every scratch. Your armor is your only defense." },
    { wave: 37, title: "Murky Waters", text: "The water is black and oily. You can't see what lurks beneath. You must sense the disturbances in the flow. Use your elemental connection to see what is hidden." },
    { wave: 38, title: "Cleansing the Land", text: "As you defeat the corrupted enemies, the land begins to heal. Your light is purging Makuta's influence. You are not just warriors; you are healers of this world." },
    { wave: 39, title: "The Cost of War", text: "You are winning, but the cost is high. You are exhausted. Your resources are low. But you cannot stop. To stop is to die." },
    { wave: 40, title: "A Moment of Peace", text: "The corruption recedes for now. A strange calm settles. You take a breath. You know it's the eye of the storm, but you welcome the silence." },

    // --- ARC 5: THE INNER CONFLICT (Waves 41-50) ---
    { wave: 41, title: "The Shadow Deepens", text: "Makuta realizes he cannot defeat you physically. He attacks your mind. He shows you visions of your failure. Of a world ruled by shadow." },
    { wave: 42, title: "Makuta's Voice", text: "He speaks to you directly now. 'Why fight? The chaos is inevitable. Join me, and you can shape it.' His voice is smooth, persuasive." },
    { wave: 43, title: "The Temptation", text: "He offers you your heart's desire. Power? Peace? The return of your old life? It's all within his gift, he claims. You must reject it." },
    { wave: 44, title: "Resisting the Dark", text: "You shout into the void: 'NO!' Your refusal sends a shockwave through the arena. Makuta recoils. He fears your will." },
    { wave: 45, title: "The Light Returns", text: "Your defiance sparks a light within you. It's brighter than before. The Golden Mask is responding to your integrity." },
    { wave: 46, title: "No Allies", text: "You realize no one is coming to save you. The 'Five Friends' are the only line of defense. You are the guardians now." },
    { wave: 47, title: "The Ancient Texts", text: "Runes appear in the air. The history of the mask. It was created to lock away the ultimate evil. Makuta wants to destroy it to free himself fully." },
    { wave: 48, title: "Deciphering the Code", text: "The mask is not just an object; it's a key. And you are the tumblers. You must align your spirits perfectly to turn the lock." },
    { wave: 49, title: "The Path Forward", text: "The path is clear now. You don't just need to survive; you need to ascend. You must become the embodiment of your elements." },
    { wave: 50, title: "Halfway There", text: "You have come so far. The halfway point. The summit is in sight, but the climb gets steeper from here. Don't look down." },

    // --- ARC 6: THE UNITY (Waves 51-60) ---
    { wave: 51, title: "The Gauntlet", text: "Makuta throws everything at you. Waves of enemies, endless and relentless. This is a test of stamina." },
    { wave: 52, title: "Relentless", text: "There is no time to think, only react. Muscle memory takes over. You move as a blur of elemental energy." },
    { wave: 53, title: "No Sleep", text: "Fatigue is your enemy now. Your limbs feel heavy. But your spirit is light. You draw energy from the arena itself." },
    { wave: 54, title: "Exhaustion", text: "You are pushed to the brink. One mistake could end it. But you look at your friends, and they are still standing. So you stand too." },
    { wave: 55, title: "The Second Wind", text: "Suddenly, a surge of energy. You've broken through the wall. You feel faster, stronger. You have tapped into a deeper reserve of power." },
    { wave: 56, title: "Synchronized Combat", text: "You don't need to speak. You know where your friends are. You move as one entity. A perfect fighting machine." },
    { wave: 57, title: "Elemental Fusion", text: "Your attacks begin to merge. Fire and Wind create firestorms. Water and Ice create freezing prisons. You are discovering new ways to fight." },
    { wave: 58, title: "Breaking the Line", text: "The enemy line breaks. They are retreating! For the first time, Makuta's forces are afraid of you." },
    { wave: 59, title: "The Enemy Falters", text: "You press the advantage. You are the hunters now. You drive them back into the shadows." },
    { wave: 60, title: "A Victory", text: "The wave ends. The arena is clear. You have won a major battle. But the war is not over." },

    // --- ARC 7: THE MASK'S POWER (Waves 61-70) ---
    { wave: 61, title: "The Mask's Aura", text: "You can feel it. The Golden Mask is close. Its energy radiates through the floor. It feels warm, inviting." },
    { wave: 62, title: "Getting Closer", text: "The shadows are thinner here. The light of the mask is burning them away. Makuta is desperate to stop you." },
    { wave: 63, title: "The Inner Sanctum", text: "The arena transforms into a golden temple. You are in the antechamber of the mask. This is holy ground." },
    { wave: 64, title: "Guardians of the Gate", text: "Ancient constructs awaken. They are not evil; they are the final test. You must prove you are strong enough to wield the power." },
    { wave: 65, title: "The Puzzle", text: "It's not just about fighting. You must show wisdom. You use your powers to solve the environmental challenges of the temple." },
    { wave: 66, title: "Unity", text: "The first lock opens. Unity. You have proven your bond is unbreakable." },
    { wave: 67, title: "Duty", text: "The second lock opens. Duty. You have protected the world without asking for reward." },
    { wave: 68, title: "Destiny", text: "The third lock opens. Destiny. You have accepted your role as guardians." },
    { wave: 69, title: "The Three Virtues", text: "The virtues resonate within you. You are ready." },
    { wave: 70, title: "The Gate Opens", text: "The final door opens. A blinding light spills out. The Golden Mask awaits." },

    // --- ARC 8: THE VOID APPROACHES (Waves 71-80) ---
    { wave: 71, title: "Into the Abyss", text: "But Makuta is there! He steps from the shadows, blocking your path. He drags the temple into the Void." },
    { wave: 72, title: "The Void Realm", text: "You are in his domain now. Physics don't apply here. Up is down. Light is dark. You must hold onto your own reality." },
    { wave: 73, title: "Shadow Clones", text: "Makuta creates dark reflections of you. They know your moves. They know your weaknesses. You must fight yourself." },
    { wave: 74, title: "Fighting Oneself", text: "To defeat your shadow, you must accept your flaws. You are not perfect, and that is your strength. The shadows shatter." },
    { wave: 75, title: "Acceptance", text: "You accept who you are. Heroes. Friends. Flawed but trying. This acceptance acts as a shield against the Void." },
    { wave: 76, title: "The True Enemy", text: "Makuta reveals his true form. A swirling vortex of chaos. He is not a man; he is a force of nature." },
    { wave: 77, title: "Makuta's Rage", text: "He lashes out with pure destruction. The arena crumbles. You are fighting on floating debris." },
    { wave: 78, title: "The World Shakes", text: "The impact of the battle is felt across dimensions. The real world is shaking. You must end this soon." },
    { wave: 79, title: "Holding the Line", text: "You form a defensive circle. You protect the spark of light that is the mask's location. You will not move." },
    { wave: 80, title: "The Final Ascent", text: "You push Makuta back. You begin to climb out of the Void, back towards the light." },

    // --- ARC 9: THE MASK REVEALED (Waves 81-90) ---
    { wave: 81, title: "The Golden Glow", text: "You return to the temple. The mask is hovering there. It's beautiful." },
    { wave: 82, title: "Almost There", text: "Just a few more steps. But Makuta sends his elite guard. The Rahkshi. Sons of Makuta." },
    { wave: 83, title: "The Last Guardian", text: "You defeat the Rahkshi. Only Makuta remains." },
    { wave: 84, title: "A Sacrifice?", text: "Makuta launches a fatal attack. One of you steps in the way. But the attack is absorbed! The mask is protecting you." },
    { wave: 85, title: "No One Left Behind", text: "The mask will not allow a sacrifice. It demands life, not death." },
    { wave: 86, title: "The Mask's Choice", text: "The mask flies towards you. It has chosen. Not one of you, but ALL of you." },
    { wave: 87, title: "Worthiness", text: "You are all worthy. The mask splits into five golden pieces, one for each of you." },
    { wave: 88, title: "The Power Flows", text: "You put on the masks. Power unlike anything you've felt surges through you. You are golden." },
    { wave: 89, title: "Transformation", text: "Your armor turns gold. Your weapons glow with pure light. You are the Toa of Light now." },
    { wave: 90, title: "The Golden Armor", text: "You stand ready. Makuta looks on in fear. He knows he has lost." },

    // --- ARC 10: THE FINAL STAND (Waves 91-100) ---
    { wave: 91, title: "Makuta's Desperation", text: "Makuta unleashes all his remaining power. He becomes a giant of shadow. He wants to take the whole world down with him." },
    { wave: 92, title: "Total War", text: "This is it. The final battle. You fly towards him, golden streaks in the darkness." },
    { wave: 93, title: "The Elements Unleashed", text: "You unleash your full power. It's not just fire or ice anymore; it's pure energy. You blast away his shadows." },
    { wave: 94, title: "The Perfect Storm", text: "You combine your attacks into a single beam of light. The Perfect Storm. It pierces Makuta's heart." },
    { wave: 95, title: "Breaking the Shadow", text: "Makuta screams as the light burns him. His form begins to disintegrate." },
    { wave: 96, title: "The Light Shines", text: "The light spreads, cleansing the entire arena. The Void recedes. The biomes are restored to their natural beauty." },
    { wave: 97, title: "Makuta's Fall", text: "Makuta is reduced to nothingness. The evil is gone." },
    { wave: 98, title: "Banishment", text: "You banish the remnants of his spirit to the space between stars. He will not return." },
    { wave: 99, title: "Restoring Balance", text: "You land in the center of the arena. The Golden Masks fade, their job done. But the power remains within you." },
    { wave: 100, title: "The Legend Lives On", text: "You have saved the world. You are the Five Friends, the Elemental Heroes. The Golden Mask is safe, and so is the future. But your watch never truly ends..." }
];

const PROCEDURAL_TEMPLATES = [
    "Makuta's laughter seems to echo in the distance. He is watching.",
    "You feel a resonance with the Golden Mask. It's close, but not yet within reach.",
    "The swarm moves with a singular purpose: your destruction.",
    "You remember a moment from your past life. It gives you strength.",
    "The elemental energy within you surges. You are getting stronger.",
    "Makuta's minions are searching for the mask too. You must find it first.",
    "The bond with your friends feels stronger than ever.",
    "A vision of the Golden Mask flashes before your eyes. Pure, unspeakable power.",
    "The chaos of this world tries to break you, but you stand firm.",
    "Your inner strength is the key. Focus."
];

class StoryManager {
    constructor() {
        this.currentChapter = null;
    }

    getStoryForWave(wave) {
        // Check for predefined chapter
        const chapter = STORY_CHAPTERS.find(c => c.wave === wave);
        if (chapter) {
            return chapter;
        }

        // Procedural Generation for endless mode
        const seed = wave * 12345; // Simple deterministic seed
        const templateIndex = seed % PROCEDURAL_TEMPLATES.length;
        const title = `Log Entry: Wave ${wave}`;
        const text = PROCEDURAL_TEMPLATES[templateIndex];

        return { wave, title, text };
    }
}
