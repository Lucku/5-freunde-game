window.STORY_EVENTS = [
    // --- ARC 1: THE AWAKENING (Waves 1-10) ---
    {
        id: "awakening_1", wave: 1, hero: "ALL", type: "NARRATIVE",
        title: "The Transformation",
        text: "It wasn't long ago that you and your four friends lived normal lives. But destiny had other plans. In a flash of light, you were transformed, imbued with raw elemental energy. Now, you are the only thing standing between the world and total chaos."
    },
    {
        id: "awakening_2", wave: 2, hero: "ALL", type: "WAVE_OVERRIDE",
        title: "The Pursuit",
        text: "You are being hunted. Swarms of dark creatures, twisted and mindless, are hot on your trail. They are the foot soldiers of a greater evil, relentless in their pursuit to extinguish your newfound light.",
        data: {
            spawnRateMod: 0.5, // Spawns twice as fast
            forcedEnemyType: 'SWARM' // Only spawns SWARM enemies
        }
    },
    {
        id: "awakening_3", wave: 3, hero: "ALL", type: "NARRATIVE",
        title: "Proving Grounds",
        text: "To survive, you must master your powers. The world has fractured into shifting biomes—Fire, Water, Ice, Plant, and Metal. These are not just battlefields; they are crucibles designed to test your resolve and unlock your true potential."
    },
    {
        id: "awakening_4", wave: 4, hero: "ALL", type: "NARRATIVE",
        title: "The Legend",
        text: "Amidst the chaos, a legend surfaces. The Golden Mask. An artifact long forgotten by history, said to grant its wearer unspeakable power. It is the key to saving this world... or destroying it."
    },
    {
        id: "awakening_5", wave: 5, hero: "ALL", type: "BOSS_FIGHT",
        title: "The Shadow",
        text: "The enemy has a name: Makuta. The leader of the evil forces, he watches from the shadows. He knows of the Golden Mask, and he will stop at nothing to claim it for himself.",
        data: {
            bossId: 'MAKUTA'
        }
    },
    {
        id: "awakening_6", wave: 6, hero: "ALL", type: "NARRATIVE",
        title: "Chaos Rising",
        text: "Makuta's influence grows stronger. He seeks to harness the power of the Golden Mask to bring eternal chaos. His minions grow more numerous, their attacks more desperate. He knows you are the only threat to his plan."
    },
    {
        id: "awakening_7", wave: 7, hero: "ALL", type: "NARRATIVE",
        title: "Inner Strength",
        text: "But Makuta is missing a crucial piece of the puzzle. The Golden Mask cannot simply be taken. It only reveals itself to a hero who has found their inner source of strength. It is not a prize to be won, but a burden to be earned."
    },
    {
        id: "awakening_8", wave: 8, hero: "ALL", type: "NARRATIVE",
        title: "The Bond",
        text: "You are not alone. The bond between the Five Friends is your greatest weapon. While Makuta commands through fear, you fight with friendship. This connection amplifies your elemental powers."
    },
    {
        id: "awakening_9", wave: 9, hero: "ALL", type: "NARRATIVE",
        title: "The Hunt Intensifies",
        text: "Makuta is getting impatient. He senses that one of you is close to unlocking the mask's location. The swarms are no longer just chasing; they are trying to corner you. The final test is approaching."
    },
    {
        id: "awakening_10", wave: 10, hero: "ALL", type: "NARRATIVE",
        title: "The Test",
        text: "You have survived the initial onslaught, but the real war begins now. You must continue to prove yourself across the biomes. Only by unlocking your full potential will the Golden Mask appear. Makuta is waiting. Don't let him win."
    },

    // --- ARC 2: MASTERING THE ELEMENTS (Waves 11-20) ---
    { id: "mastery_11_fire", wave: 11, title: "The Fire Within", hero: "FIRE", type: "WAVE_OVERRIDE", text: "The heat of battle has forged a new strength in you. Like the magma of the Fire Biome, your resolve is hardening. You realize that your anger at Makuta can be a fuel, not just a burden.", data: { forcedEnemyType: 'BASIC', spawnRateMod: 2.0 } },
    { id: "mastery_11_water", wave: 11, title: "Tides of Change", hero: "WATER", type: "WAVE_OVERRIDE", text: "The Water Biome teaches you adaptability. Makuta's forces are rigid, predictable. You must be like the ocean—yielding when necessary, but crashing down with unstoppable force when the moment is right.", data: { forcedEnemyType: 'SPEEDSTER', spawnRateMod: 0.8 } },
    { id: "mastery_11_plant", wave: 11, title: "Rooted in Strength", hero: "PLANT", type: "WAVE_OVERRIDE", text: "In the Plant Biome, you learn patience. Growth cannot be rushed. Your powers are developing naturally, and your connection to the earth grounds you against the chaos Makuta tries to sow.", data: { forcedEnemyType: 'TANK', spawnRateMod: 0.5 } },
    { id: "mastery_11_ice", wave: 11, title: "Cold Resolve", hero: "ICE", type: "WAVE_OVERRIDE", text: "The Ice Biome is unforgiving, stripping away all that is unnecessary. You learn to focus your mind, freezing out fear and doubt. Your clarity of purpose terrifies the mindless swarm.", data: { forcedEnemyType: 'SHOOTER', spawnRateMod: 1.0 } },
    { id: "mastery_11_metal", wave: 11, title: "Iron Will", hero: "METAL", type: "WAVE_OVERRIDE", text: "Metal does not bend easily, and neither do you. The Metal Biome tests your endurance. You take hit after hit, but you remain standing. You are becoming the shield for your friends.", data: { forcedEnemyType: 'BRUTE', spawnRateMod: 0.7 } },

    { id: "mastery_11_all", wave: 11, title: "The Fire Within", hero: "ALL", type: "NARRATIVE", text: "The heat of battle has forged a new strength in you. Like the magma of the Fire Biome, your resolve is hardening. You realize that your anger at Makuta can be a fuel, not just a burden." },
    { id: "mastery_12", wave: 12, title: "First Ally", hero: "ALL", type: "COMPANION_JOIN", text: "The Water Biome teaches you adaptability. A friend arrives to fight by your side. While Makuta commands through fear, you fight with friendship.", data: { companionType: "AUTO" } },
    { id: "mastery_13", wave: 13, title: "The Hero's Trial", hero: "ALL", type: "OBJECTIVE_WAVE", text: "The arena shifts. This is no longer a simple battle. The environment itself challenges your specific abilities. Prove your mastery over your element to survive.", data: { objective: true } },
    { id: "mastery_14", wave: 14, title: "Cold Resolve", hero: "ALL", type: "NARRATIVE", text: "The Ice Biome is unforgiving, stripping away all that is unnecessary. You learn to focus your mind, freezing out fear and doubt. Your clarity of purpose terrifies the mindless swarm." },
    { id: "mastery_15", wave: 15, title: "Iron Will", hero: "ALL", type: "NARRATIVE", text: "Metal does not bend easily, and neither do you. The Metal Biome tests your endurance. You take hit after hit, but you remain standing. You are becoming the shield for your friends." },
    { id: "mastery_16", wave: 16, title: "Elemental Harmony", hero: "ALL", type: "NARRATIVE", text: "You begin to see how the elements interact. Fire melts Ice, Water nourishes Plant. You are not separate warriors, but one ecosystem of power. This synergy is something Makuta cannot replicate." },
    { id: "mastery_17", wave: 17, title: "The First General", hero: "ALL", type: "NARRATIVE", text: "Makuta sends a lieutenant to the field. A massive, twisted creature of shadow and scrap. It mocks your friendship, calling it a weakness. Proving it wrong feels satisfying." },
    { id: "mastery_18", wave: 18, title: "A Trap Sprung", hero: "ALL", type: "NARRATIVE", text: "The arena shifts unexpectedly, trapping you in a small zone. It's an ambush! Makuta is trying to separate you. You must fight back-to-back, covering all angles. Trust is your only survival tool." },
    { id: "mastery_19", wave: 19, title: "Narrow Escape", hero: "ALL", type: "NARRATIVE", text: "That was too close. The enemy is learning your patterns. You realize that to defeat Makuta, you must be unpredictable. You must embrace the chaos of the elements, not just control them." },
    { id: "mastery_20", wave: 20, title: "The Swarm Adapts", hero: "ALL", type: "NARRATIVE", text: "The enemies are evolving. They now have resistance to certain elements. You must switch tactics on the fly. The Golden Mask feels distant, but you know you are on the right path." },

    // --- ARC 3: THE SHADOW DEEPENS (Waves 21-30) ---
    { id: "shadow_21", wave: 21, title: "Darker Skies", hero: "ALL", type: "NARRATIVE", text: "The sky above the arena turns a bruised purple. Makuta's influence is bleeding into the simulation. The air feels heavy, oppressive. He is trying to crush your spirit before he crushes your body." },
    { id: "shadow_22", wave: 22, title: "The Whisper", hero: "ALL", type: "NARRATIVE", text: "You hear a voice in your head. Not your friends, but Him. Makuta offers you power, safety, if you just surrender the others. It's a lie, of course, but the temptation of rest is strong." },
    { id: "shadow_23", wave: 23, title: "Doubt", hero: "ALL", type: "OBJECTIVE_WAVE", text: "The constant fighting is taking its toll. You see a friend stumble. Are you strong enough to carry them? Doubt creeps in. Is the Golden Mask even real? Or is it just another one of Makuta's games?", data: { objective: true } },
    { id: "shadow_24", wave: 24, title: "Reinforcements", hero: "ALL", type: "NARRATIVE", text: "The constant fighting is taking its toll, but you are not done yet. You must remember who the real enemy is. It's not the one standing next to you." },

    // Wave 25: Reaffirming the Bond - Hero Specific Challenges
    { id: "shadow_25_fire", wave: 25, title: "Burning Passion", hero: "FIRE", type: "WAVE_OVERRIDE", text: "You look at your friends, battered and tired. Your fire isn't just for destruction; it's a hearth to warm them. You unleash a wall of flame to buy them time.", data: { forcedEnemyType: 'BASIC', spawnRateMod: 3.0 } }, // Horde Mode
    { id: "shadow_25_water", wave: 25, title: "Healing Waters", hero: "WATER", type: "WAVE_OVERRIDE", text: "The flow of battle has been chaotic. You take a deep breath, centering yourself. You become the calm in the storm, washing away the enemies that threaten your team.", data: { forcedEnemyType: 'TOXIC', spawnRateMod: 0.8 } }, // Cleansing Toxic
    { id: "shadow_25_plant", wave: 25, title: "Deep Roots", hero: "PLANT", type: "WAVE_OVERRIDE", text: "Your friends are the soil in which you grow. Without them, you wither. You plant your feet and refuse to let a single enemy pass.", data: { forcedEnemyType: 'BRUTE', spawnRateMod: 0.6 } }, // Holding the line
    { id: "shadow_25_ice", wave: 25, title: "Frozen Shield", hero: "ICE", type: "WAVE_OVERRIDE", text: "You see a projectile heading for a friend. You don't think; you act. An ice wall rises. You are their protector. Your cold exterior hides a warm heart.", data: { forcedEnemyType: 'SNIPER', spawnRateMod: 1.2 } }, // Blocking Snipers
    { id: "shadow_25_metal", wave: 25, title: "Unbreakable", hero: "METAL", type: "WAVE_OVERRIDE", text: "They strike your armor, but you feel nothing. You are the anchor. As long as you stand, the Five Friends stand. You taunt the enemy to focus on you.", data: { forcedEnemyType: 'TANK', spawnRateMod: 0.5 } }, // Tanking Tanks

    { id: "shadow_25_all", wave: 25, title: "Reaffirming the Bond", hero: "ALL", type: "NARRATIVE", text: "A moment of respite. You look at your friends, battered and tired. You realize they are fighting just as hard as you. The bond snaps back into place, stronger than before. You fight for them." },

    { id: "shadow_26", wave: 26, title: "The Hidden Shrine", hero: "ALL", type: "NARRATIVE", text: "Deep in the arena, you find ruins of an ancient shrine. It depicts five figures holding a mask. It's proof! The legend is real. The Golden Mask exists, and it was protected by heroes like you." },
    { id: "shadow_27", wave: 27, title: "Glyph of Power", hero: "ALL", type: "NARRATIVE", text: "You decipher a glyph on the shrine. 'Unity, Duty, Destiny'. These were the virtues of the ancients. To unlock the mask, you must embody these principles." },
    { id: "shadow_28", wave: 28, title: "The Guardian's Test", hero: "ALL", type: "NARRATIVE", text: "A spectral guardian appears, testing your worthiness. It doesn't attack your body, but your character. Do you fight for glory, or for peace? Your answer determines your path." },
    { id: "shadow_29", wave: 29, title: "A Glimmer of Gold", hero: "ALL", type: "NARRATIVE", text: "For a split second, you see it. A golden light piercing the shadows. It's calling to you. The mask is reacting to your renewed conviction. Makuta screams in rage somewhere in the void." },

    // Wave 30: The False Mask (Boss Fight)
    { id: "shadow_30", wave: 30, title: "The False Mask", hero: "ALL", type: "BOSS_FIGHT", text: "Makuta creates a decoy, a cursed mask of shadow. It promises power but drains life. You almost fall for it, but your inner light reveals the deception. You destroy the trap.", data: { bossId: 'MAKUTA' } }, // Re-using Makuta for now as a "Shadow Clone"

    // --- ARC 4: THE CORRUPTION (Waves 31-40) ---
    { id: "corruption_31", wave: 31, title: "Regrouping", hero: "ALL", type: "NARRATIVE", text: "Makuta is furious. His tricks have failed. Now he resorts to brute force. The next waves will be a test of pure endurance. Prepare yourselves." },
    { id: "corruption_32", wave: 32, title: "Second Ally", hero: "ALL", type: "COMPANION_JOIN", text: "The biomes are merging in grotesque ways. Another friend joins the fray, adding their strength to yours. You are not separate warriors, but one ecosystem of power.", data: { companionType: "AUTO" } },

    // Wave 33-37: Biome Specific Challenges
    { id: "corruption_33", wave: 33, title: "Corrupted Fire", hero: "ALL", type: "OBJECTIVE_WAVE", text: "The fire enemies now burn with a black flame. It doesn't just burn; it corrupts. Do not let them touch you. Keep your distance and strike true.", data: { objective: true, forcedEnemyType: 'BOMBER', spawnRateMod: 1.0 } },
    { id: "corruption_34", wave: 34, title: "Frozen Time", hero: "ALL", type: "WAVE_OVERRIDE", text: "The ice enemies slow time itself. Your movements feel sluggish. You must anticipate their attacks before they happen. Trust your instincts, not your eyes.", data: { forcedEnemyType: 'SHOOTER', spawnRateMod: 1.2 } },
    { id: "corruption_35", wave: 35, title: "Poisoned Roots", hero: "ALL", type: "WAVE_OVERRIDE", text: "The plant life has turned toxic. Spores fill the air. You must keep moving to find fresh air. The arena is trying to suffocate you.", data: { forcedEnemyType: 'TOXIC', spawnRateMod: 1.5 } },
    { id: "corruption_36", wave: 36, title: "Rusted Metal", hero: "ALL", type: "WAVE_OVERRIDE", text: "The metal constructs are decaying, jagged and dangerous. Tetanus and corruption await every scratch. Your armor is your only defense.", data: { forcedEnemyType: 'SHIELDER', spawnRateMod: 0.8 } },
    { id: "corruption_37", wave: 37, title: "Murky Waters", hero: "ALL", type: "WAVE_OVERRIDE", text: "The water is black and oily. You can't see what lurks beneath. You must sense the disturbances in the flow. Use your elemental connection to see what is hidden.", data: { forcedEnemyType: 'GHOST', spawnRateMod: 1.0 } },

    { id: "corruption_38", wave: 38, title: "Cleansing the Land", hero: "ALL", type: "NARRATIVE", text: "As you defeat the corrupted enemies, the land begins to heal. Your light is purging Makuta's influence. You are not just warriors; you are healers of this world." },
    { id: "corruption_39", wave: 39, title: "The Cost of War", hero: "ALL", type: "NARRATIVE", text: "You are winning, but the cost is high. You are exhausted. Your resources are low. But you cannot stop. To stop is to die." },

    // Wave 40: The Green Menace (Boss Fight)
    {
        id: "corruption_40", wave: 40, hero: "ALL", type: "BOSS_FIGHT",
        title: "The Green Menace",
        text: "Just when you thought you had a moment of peace, a cackling laugh echoes through the arena. A green figure on a glider descends from the sky, tossing pumpkin bombs. It's the Green Goblin! He works for Makuta and is here to stop you.",
        data: {
            bossId: 'GREEN_GOBLIN'
        }
    },

    // --- ARC 5: THE INNER CONFLICT (Waves 41-50) ---
    { id: "conflict_41", wave: 41, title: "The Shadow Deepens", hero: "ALL", type: "NARRATIVE", text: "Makuta realizes he cannot defeat you physically. He attacks your mind. He shows you visions of your failure. Of a world ruled by shadow." },

    // Wave 42: Goblin Reinforcements
    { id: "conflict_42", wave: 42, title: "Goblin Tech", hero: "ALL", type: "WAVE_OVERRIDE", text: "The Green Goblin may be gone, but his minions remain. Small, fast goblins armed with stolen tech swarm the arena. Watch out for their speed!", data: { forcedEnemyType: 'GOBLIN', spawnRateMod: 1.2 } },

    { id: "conflict_43", wave: 43, title: "The Temptation", hero: "ALL", type: "OBJECTIVE_WAVE", text: "He offers you your heart's desire. Power? Peace? The return of your old life? It's all within his gift, he claims. You must reject it.", data: { objective: true } },
    { id: "conflict_44", wave: 44, title: "Resisting the Dark", hero: "ALL", type: "NARRATIVE", text: "You shout into the void: 'NO!' Your refusal sends a shockwave through the arena. Makuta recoils. He fears your will." },
    { id: "conflict_45", wave: 45, title: "The Light Returns", hero: "ALL", type: "NARRATIVE", text: "Your defiance sparks a light within you. It's brighter than before. The Golden Mask is responding to your integrity." },
    { id: "conflict_46", wave: 46, title: "No Allies", hero: "ALL", type: "NARRATIVE", text: "You realize no one is coming to save you. The 'Five Friends' are the only line of defense. You are the guardians now." },
    { id: "conflict_47", wave: 47, title: "The Ancient Texts", hero: "ALL", type: "NARRATIVE", text: "Runes appear in the air. The history of the mask. It was created to lock away the ultimate evil. Makuta wants to destroy it to free himself fully." },
    { id: "conflict_48", wave: 48, title: "Deciphering the Code", hero: "ALL", type: "NARRATIVE", text: "The mask is not just an object; it's a key. And you are the tumblers. You must align your spirits perfectly to turn the lock." },
    { id: "conflict_49", wave: 49, title: "The Path Forward", hero: "ALL", type: "NARRATIVE", text: "The path is clear now. You don't just need to survive; you need to ascend. You must become the embodiment of your elements." },

    // Wave 50: Mid-Point Boss
    { id: "conflict_50", wave: 50, title: "The Shadow General", hero: "ALL", type: "BOSS_FIGHT", text: "You have reached the halfway point, but Makuta sends his strongest general to stop you. A massive creature of pure shadow blocks your path.", data: { bossId: 'MAKUTA' } },

    // --- ARC 6: THE UNITY (Waves 51-60) ---
    { id: "unity_51", wave: 51, title: "The Gauntlet", hero: "ALL", type: "NARRATIVE", text: "Makuta throws everything at you. Waves of enemies, endless and relentless. This is a test of stamina." },
    { id: "unity_52", wave: 52, title: "Third Ally", hero: "ALL", type: "COMPANION_JOIN", text: "There is no time to think, only react. A third ally steps onto the battlefield. Together, you can hold back the tide.", data: { companionType: "AUTO" } },
    { id: "unity_53", wave: 53, title: "No Sleep", hero: "ALL", type: "OBJECTIVE_WAVE", text: "Fatigue is your enemy now. Your limbs feel heavy. But your spirit is light. You draw energy from the arena itself.", data: { objective: true } },
    { id: "unity_54", wave: 54, title: "Exhaustion", hero: "ALL", type: "NARRATIVE", text: "You are pushed to the brink. One mistake could end it. But you look at your friends, and they are still standing. So you stand too." },
    { id: "unity_55", wave: 55, title: "The Second Wind", hero: "ALL", type: "NARRATIVE", text: "Suddenly, a surge of energy. You've broken through the wall. You feel faster, stronger. You have tapped into a deeper reserve of power." },
    { id: "unity_56", wave: 56, title: "Synchronized Combat", hero: "ALL", type: "NARRATIVE", text: "You don't need to speak. You know where your friends are. You move as one entity. A perfect fighting machine." },
    { id: "unity_57", wave: 57, title: "Elemental Fusion", hero: "ALL", type: "NARRATIVE", text: "Your attacks begin to merge. Fire and Wind create firestorms. Water and Ice create freezing prisons. You are discovering new ways to fight." },
    { id: "unity_58", wave: 58, title: "Breaking the Line", hero: "ALL", type: "NARRATIVE", text: "The enemy line breaks. They are retreating! For the first time, Makuta's forces are afraid of you." },
    { id: "unity_59", wave: 59, title: "The Enemy Falters", hero: "ALL", type: "NARRATIVE", text: "You press the advantage. You are the hunters now. You drive them back into the shadows." },
    { id: "unity_60", wave: 60, title: "A Victory", hero: "ALL", type: "NARRATIVE", text: "The wave ends. The arena is clear. You have won a major battle. But the war is not over." },

    // --- ARC 7: THE MASK'S POWER (Waves 61-70) ---
    { id: "mask_61", wave: 61, title: "The Mask's Aura", hero: "ALL", type: "NARRATIVE", text: "You can feel it. The Golden Mask is close. Its energy radiates through the floor. It feels warm, inviting." },
    { id: "mask_62", wave: 62, title: "Getting Closer", hero: "ALL", type: "NARRATIVE", text: "The shadows are thinner here. The light of the mask is burning them away. Makuta is desperate to stop you." },
    { id: "mask_63", wave: 63, title: "The Inner Sanctum", hero: "ALL", type: "OBJECTIVE_WAVE", text: "The arena transforms into a golden temple. You are in the antechamber of the mask. This is holy ground.", data: { objective: true } },
    { id: "mask_64", wave: 64, title: "Guardians of the Gate", hero: "ALL", type: "NARRATIVE", text: "Ancient constructs awaken. They are not evil; they are the final test. You must prove you are strong enough to wield the power." },
    { id: "mask_65", wave: 65, title: "The Guardian's Challenge", hero: "ALL", type: "WAVE_OVERRIDE", text: "The temple guardians are not evil, but they are strict. They test your defense. Massive stone constructs block your path. You must break them.", data: { forcedEnemyType: 'SHIELDER', spawnRateMod: 0.8, layout: 2, trap: 'TURRET' } },
    { id: "mask_66", wave: 66, title: "Unity", hero: "ALL", type: "NARRATIVE", text: "The first lock opens. Unity. You have proven your bond is unbreakable." },
    { id: "mask_67", wave: 67, title: "Duty", hero: "ALL", type: "NARRATIVE", text: "The second lock opens. Duty. You have protected the world without asking for reward." },
    { id: "mask_68", wave: 68, title: "Destiny", hero: "ALL", type: "NARRATIVE", text: "The third lock opens. Destiny. You have accepted your role as guardians." },
    { id: "mask_69", wave: 69, title: "The Three Virtues", hero: "ALL", type: "NARRATIVE", text: "The virtues resonate within you. You are ready." },
    { id: "mask_70", wave: 70, title: "The Gate Opens", hero: "ALL", type: "NARRATIVE", text: "The final door opens. A blinding light spills out. The Golden Mask awaits." },

    // --- ARC 8: THE VOID APPROACHES (Waves 71-80) ---
    { id: "void_71", wave: 71, title: "Into the Abyss", hero: "ALL", type: "NARRATIVE", text: "But Makuta is there! He steps from the shadows, blocking your path. He drags the temple into the Void." },
    { id: "void_72", wave: 72, title: "The Final Ally", hero: "ALL", type: "COMPANION_JOIN", text: "You are in his domain now. But you are not alone. The final member of the Five Friends joins you. The circle is complete.", data: { layout: 5, trap: 'TELEPORTER', companionType: "AUTO" } },
    { id: "void_73", wave: 73, title: "Shadow Clones", hero: "ALL", type: "OBJECTIVE_WAVE", text: "Makuta creates dark reflections of you. They know your moves. They know your weaknesses. You must fight yourself.", data: { objective: true } },
    { id: "void_74", wave: 74, title: "Fighting Oneself", hero: "ALL", type: "NARRATIVE", text: "To defeat your shadow, you must accept your flaws. You are not perfect, and that is your strength. The shadows shatter." },
    { id: "void_75", wave: 75, title: "Shadow Self", hero: "ALL", type: "BOSS_FIGHT", text: "Makuta plays his cruelest trick. He manifests a dark reflection of your own soul. To defeat it, you must accept your flaws.", data: { bossId: 'MAKUTA' } },
    { id: "void_76", wave: 76, title: "The True Enemy", hero: "ALL", type: "NARRATIVE", text: "Makuta reveals his true form. A swirling vortex of chaos. He is not a man; he is a force of nature." },
    { id: "void_77", wave: 77, title: "Makuta's Rage", hero: "ALL", type: "NARRATIVE", text: "He lashes out with pure destruction. The arena crumbles. You are fighting on floating debris." },
    { id: "void_78", wave: 78, title: "The World Shakes", hero: "ALL", type: "NARRATIVE", text: "The impact of the battle is felt across dimensions. The real world is shaking. You must end this soon." },
    { id: "void_79", wave: 79, title: "Holding the Line", hero: "ALL", type: "NARRATIVE", text: "You form a defensive circle. You protect the spark of light that is the mask's location. You will not move." },
    { id: "void_80", wave: 80, title: "The Final Ascent", hero: "ALL", type: "NARRATIVE", text: "You push Makuta back. You begin to climb out of the Void, back towards the light." },

    // --- ARC 9: THE MASK REVEALED (Waves 81-90) ---
    { id: "reveal_81", wave: 81, title: "The Golden Glow", hero: "ALL", type: "NARRATIVE", text: "You return to the temple. The mask is hovering there. It's beautiful." },
    { id: "reveal_82", wave: 82, title: "Almost There", hero: "ALL", type: "NARRATIVE", text: "Just a few more steps. But Makuta sends his elite guard. The Rahkshi. Sons of Makuta." },
    { id: "reveal_83", wave: 83, title: "The Last Guardian", hero: "ALL", type: "OBJECTIVE_WAVE", text: "You defeat the Rahkshi. Only Makuta remains.", data: { objective: true } },
    { id: "reveal_84", wave: 84, title: "A Sacrifice?", hero: "ALL", type: "NARRATIVE", text: "Makuta launches a fatal attack. One of you steps in the way. But the attack is absorbed! The mask is protecting you." },
    { id: "reveal_85", wave: 85, title: "The Sacrifice", hero: "ALL", type: "WAVE_OVERRIDE", text: "Makuta launches a fatal attack. The mask demands a sacrifice... or does it? You refuse to choose. You fight for everyone.", data: { forcedEnemyType: 'SPEEDSTER', spawnRateMod: 1.5 } },
    { id: "reveal_86", wave: 86, title: "The Mask's Choice", hero: "ALL", type: "NARRATIVE", text: "The mask flies towards you. It has chosen. Not one of you, but ALL of you." },
    { id: "reveal_87", wave: 87, title: "Worthiness", hero: "ALL", type: "NARRATIVE", text: "You are all worthy. The mask splits into five golden pieces, one for each of you." },
    { id: "reveal_88", wave: 88, title: "The Power Flows", hero: "ALL", type: "NARRATIVE", text: "You put on the masks. Power unlike anything you've felt surges through you. You are golden." },
    { id: "reveal_89", wave: 89, title: "Transformation", hero: "ALL", type: "NARRATIVE", text: "Your armor turns gold. Your weapons glow with pure light. You are the Toa of Light now." },
    { id: "reveal_90", wave: 90, title: "The Golden Armor", hero: "ALL", type: "NARRATIVE", text: "You stand ready. Makuta looks on in fear. He knows he has lost." },

    // --- ARC 10: THE FINAL STAND (Waves 91-100) ---
    { id: "final_91", wave: 91, title: "Makuta's Desperation", hero: "ALL", type: "NARRATIVE", text: "Makuta unleashes all his remaining power. He becomes a giant of shadow. He wants to take the whole world down with him." },
    { id: "final_92", wave: 92, title: "Total War", hero: "ALL", type: "WAVE_OVERRIDE", text: "This is it. The final battle. You fly towards him, golden streaks in the darkness.", data: { layout: 6, trap: 'LASER_BEAM' } },
    { id: "final_93", wave: 93, title: "The Elements Unleashed", hero: "ALL", type: "OBJECTIVE_WAVE", text: "You unleash your full power. It's not just fire or ice anymore; it's pure energy. You blast away his shadows.", data: { objective: true } },
    { id: "final_94", wave: 94, title: "The Perfect Storm", hero: "ALL", type: "NARRATIVE", text: "You combine your attacks into a single beam of light. The Perfect Storm. It pierces Makuta's heart." },
    { id: "final_95", wave: 95, title: "The Final Guard", hero: "ALL", type: "WAVE_OVERRIDE", text: "Makuta is weakened, but his personal guard remains. Two massive shadow beasts stand between you and victory.", data: { forcedEnemyType: 'BRUTE', spawnRateMod: 2.0 } },
    { id: "final_96", wave: 96, title: "Breaking Through", hero: "ALL", type: "NARRATIVE", text: "The guards fall. The path to Makuta is clear. The air crackles with the energy of the Void." },
    { id: "final_97", wave: 97, title: "The Inner Sanctum", hero: "ALL", type: "NARRATIVE", text: "You enter the heart of his domain. It is a place of absolute nothingness. Only your light exists here." },
    { id: "final_98", wave: 98, title: "Face to Face", hero: "ALL", type: "NARRATIVE", text: "He stands before you, no longer hiding in shadows. He is the shadow. And he is afraid." },
    { id: "final_99", wave: 99, title: "One Last Breath", hero: "ALL", type: "NARRATIVE", text: "You ready your weapons. Your friends stand beside you. This is the moment you were chosen for." },
    { id: "final_100", wave: 100, title: "The End of Shadows", hero: "ALL", type: "BOSS_FIGHT", text: "Makuta roars, a sound that shakes the universe. It ends here. For the Golden Mask! For the world!", data: { bossId: 'MAKUTA' } },
    { id: "final_101", wave: 101, title: "Victory", hero: "ALL", type: "THE_END", text: "Makuta falls. The shadows retreat. The world is safe... for now. You have mastered your elements and saved reality." }
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
        this.currentEvent = null;
    }

    getEventForWave(wave, heroType) {
        // Normalize
        const type = heroType.toUpperCase();

        // 1. Look for Exact Hero Match
        let event = STORY_EVENTS.find(e => {
            if (e.wave !== wave) return false;
            if (e.hero === "ALL") return false;
            return e.hero.toUpperCase() === type;
        });

        // 2. If not found, look for Shared Campaign Partner (Champions of Chaos)
        if (!event) {
            event = STORY_EVENTS.find(e => {
                if (e.wave !== wave) return false;
                if (e.hero === "ALL") return false;

                const target = e.hero.toUpperCase();
                // Chaos Shared Logic: Gravity <-> Void
                if ((type === 'GRAVITY' || type === 'VOID') && (target === 'GRAVITY' || target === 'VOID')) {
                    return true;
                }
                // Fortune Shared Logic: Spirit <-> Chance
                if ((type === 'SPIRIT' || type === 'CHANCE') && (target === 'SPIRIT' || target === 'CHANCE')) {
                    return true;
                }
                return false;
            });
        }

        // 3. Look for General Event ("ALL")
        if (!event) {
            event = STORY_EVENTS.find(e => e.wave === wave && e.hero === "ALL");
        }

        if (event) {
            // Dynamic Adjustments:
            // ARC 2 (Waves 11-20): Enforce Hero Biome
            if (wave >= 11 && wave <= 20) {
                if (!event.data) event.data = {};
                event.data.biome = 'HERO';
            }
            return event;
        }

        // 3. Procedural Fallback (Endless Mode or gaps)
        const seed = wave * 12345; // Simple deterministic seed
        const templateIndex = seed % PROCEDURAL_TEMPLATES.length;

        return {
            id: `procedural_${wave}`,
            wave: wave,
            hero: "ALL",
            type: "NARRATIVE",
            title: `Log Entry: Wave ${wave}`,
            text: PROCEDURAL_TEMPLATES[templateIndex]
        };
    }
}
