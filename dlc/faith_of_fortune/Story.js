// Faith of Fortune - Story Campaign
// 50 Chapters telling the tale of Spirit vs Chance

/*
    Plot: The delicate balance of probability has been shattered. 
    The "Spirit" monks of the Golden Temple seek to restore order, while the agents of "Chance" 
    revel in the newfound chaos of the fractured reality.

    Theme: Ego vs Duty. Hunt for the Golden Mask.
*/

window.FORTUNE_STORY_CHAPTERS = [
    // --- INTRO: The Split Path (Waves 1-10) ---
    // Chunk 1: Spirit (Waves 1-2)
    { id: "fortune_1", wave: 1, hero: "SPIRIT", title: "Two Sides of a Coin", type: "NARRATIVE", text: "The Great Schism. The True Golden Mask calls out. For the Monk 'Spirit', it is a relic to be hidden and protected. For the Gambler 'Chance', it is the ultimate jackpot." },
    { id: "fortune_2", wave: 2, hero: "SPIRIT", title: "The Temple Awakening", type: "NARRATIVE", text: "(Spirit) You sense a disturbance. Someone has breached the sacred seals. You leave the Golden Temple to pursue the thief." },

    // Chunk 2: Chance (Waves 3-5)
    { id: "fortune_3", wave: 3, hero: "CHANCE", title: "The Shortcut", type: "OBJECTIVE_WAVE", text: "(Chance) Why walk when you can warp? You open a rift to the Fields of Madness. It's dangerous, but it cuts travel time requires a wager.", data: { objective: true } },
    { id: "fortune_4", wave: 4, hero: "CHANCE", title: "Echoes of Madness", type: "NARRATIVE", text: "The Fields of Madness are unstable. Logic dissolves here. Gravity shifts. But Chance feels right at home among the chaos." },
    { id: "fortune_5", wave: 5, hero: "CHANCE", title: "Glitch Mob", type: "WAVE_OVERRIDE", text: "(Chance) 'Look at them glitch!' The enemies here are broken, stuttering in and out of existence. Perfect practice targets.", data: { forcedEnemyType: 'SPEEDSTER', spawnRateMod: 1.5 } },

    // Chunk 3: Spirit (Waves 6-8)
    { id: "fortune_6", wave: 6, hero: "SPIRIT", title: "Order in Chaos", type: "NARRATIVE", text: "(Spirit) You track the Gambler's trail into the Madness. The chaos repulses you, but you must press on to prevent the Mask from falling into greedy hands." },
    { id: "fortune_7", wave: 7, hero: "SPIRIT", title: "Divine Focus", type: "NARRATIVE", text: "(Spirit) Meditation amidst the noise. You channel your energy to stabilize the path forward. You are the anchor in this storm." },
    { id: "fortune_8", wave: 8, hero: "SPIRIT", title: "Cleansing Light", type: "OBJECTIVE_WAVE", text: "(Spirit) The corruption is trying to block your path. Purge the area.", data: { objective: true } },

    // Chunk 4: Convergence (Waves 9-10)
    { id: "fortune_9", wave: 9, hero: "CHANCE", title: "Neon Fog", type: "NARRATIVE", text: "(Chance) You deploy a neon fog to obscure the path. A little misdirection never hurt anyone. Except maybe the Monk." },
    {
        id: "fortune_10", wave: 10, hero: "SPIRIT", title: "Crossroads", type: "NARRATIVE",
        text: "The paths converge briefly. The two heroes spot each other across a chasm. A silent vow is made: One will stop the other.",
        choices: [
            { text: "Accelerate (Chance)", effect: "biomemod_madness" },
            { text: "Pursue (Spirit)", effect: "biomemod_temple" }
        ]
    },

    // --- ARC 2: THE ALLIANCE & THE HUNT (Waves 11-20) ---
    // Chunk 5: Chance (Waves 11-13)
    { id: "fortune_11", wave: 11, hero: "CHANCE", title: "A Familiar Cackle", type: "NARRATIVE", text: "(Chance) You reach out to an old contact. Someone who loves chaos as much as you do. A certain Green Goblin." },
    { id: "fortune_12", wave: 12, hero: "CHANCE", title: "The Deal", type: "NARRATIVE", text: "(Chance) 'Keep the Monk busy,' Chance tells the Goblin. 'And the loot is yours.' Ideally, they destroy each other." },
    { id: "fortune_13", wave: 13, hero: "CHANCE", title: "Goblin Tech", type: "WAVE_OVERRIDE", text: "(Chance) The Green Goblin shows off his toys. 'Look at them go!' he cackles. You test the stolen tech against the local wildlife.", data: { forcedEnemyType: 'SHOOTER', spawnRateMod: 1.2 } },

    // Chunk 6: Spirit (Waves 14-16)
    { id: "fortune_14", wave: 14, hero: "SPIRIT", title: "The Trap", type: "NARRATIVE", text: "(Spirit) The path ahead is rigged. Explosives. Tripwires. Chance didn't set these up alone. You must navigate carefully." },
    { id: "fortune_15", wave: 15, hero: "SPIRIT", title: "Purification", type: "NARRATIVE", text: "(Spirit) You cleanse the corrupted constructs left in their wake. Your resolve hardens. This is a battle for the soul of the world." },
    { id: "fortune_16", wave: 16, hero: "SPIRIT", title: "Calm Mind", type: "NARRATIVE", text: "(Spirit) You ignore the illusions. You see the true path. The Golden Mask is close." },

    // Chunk 7: Chance (Waves 17-18)
    { id: "fortune_17", wave: 17, hero: "CHANCE", title: "The Dealer's Hand", type: "NARRATIVE", text: "(Chance) 'House advantage!' You reshape the environment with holographic cards, turning the battlefield into a game board." },
    { id: "fortune_18", wave: 18, hero: "CHANCE", title: "Raising Stakes", type: "OBJECTIVE_WAVE", text: "(Chance) The pursuit is getting boring. You destabilize the reality anchors to make things interesting.", data: { objective: true } },

    // Chunk 8: Spirit (Waves 19-20)
    { id: "fortune_19", wave: 19, hero: "SPIRIT", title: "Observing the Trap", type: "NARRATIVE", text: "(Spirit) You corner the hired help. The Green Goblin has nowhere left to run." },
    { id: "fortune_20", wave: 20, hero: "SPIRIT", title: "The Mercenary", type: "BOSS_FIGHT", text: "(Spirit) 'He promised me gold!' screams the Green Goblin. You must defeat Chance's hired gun to proceed.", data: { bossId: 'GREEN_GOBLIN' } },

    // --- ARC 3: THE VOID ENCOUNTER (Waves 21-30) ---
    // Chunk 9: Spirit (Waves 21-22)
    { id: "fortune_21", wave: 21, hero: "SPIRIT", title: "Goblin's Defeat", type: "NARRATIVE", text: "The Goblin falls, cursing Chance for abandoning him. Spirit presses on, the gap closing." },
    { id: "fortune_22", wave: 22, hero: "SPIRIT", title: "Void Leak", type: "WAVE_OVERRIDE", text: "The battle has torn the veil. Void creatures spill into the reality. Spirit must clean up the mess.", data: { forcedEnemyType: 'VOID_SPAWN' } },

    // Chunk 10: Chance (Waves 23-26)
    { id: "fortune_23", wave: 23, hero: "CHANCE", title: "Deep Madness", type: "NARRATIVE", text: "(Chance) You delve deeper into the Fields of Madness. The colors turn inverted. Silence reigns." },
    { id: "fortune_24", wave: 24, hero: "CHANCE", title: "The Void Watcher", type: "NARRATIVE", text: "Something else lives in this shortcut. A guardian of the empty spaces. The Black Hero looks up." },
    {
        id: "fortune_25", wave: 25, hero: "CHANCE", title: "Arena of Void", type: "BOSS_FIGHT",
        text: "(Chance) The Black Hero blocks your path! 'You disturb the silence,' he intones. A Duel of Fate begins.",
        data: { spawnEnemy: 'BLACK_HERO_1V1' }
    },
    { id: "fortune_26", wave: 26, hero: "CHANCE", title: "The Bluff", type: "NARRATIVE", text: "(Chance) You barely escape the Black Hero, using a decoy to slip past. 'Always leave them guessing,' you pant, wounded but moving." },

    // Chunk 11: Spirit (Waves 27-30)
    { id: "fortune_27", wave: 27, hero: "SPIRIT", title: "Distant Aid", type: "NARRATIVE", text: "(Spirit) You sense another battle far away. Old friends fighting Makuta. You cannot join them, but you can send your energy." },
    { id: "fortune_28", wave: 28, hero: "SPIRIT", title: "The Proxy", type: "NARRATIVE", text: "(Spirit) By securing the ley lines here, you weaken Makuta's hold on your friends. You fight on two fronts." },
    { id: "fortune_29", wave: 29, hero: "SPIRIT", title: "Cleanup", type: "NARRATIVE", text: "(Spirit) Chance left a mess behind. Reality fractures that must be healed before you can proceed." },
    { id: "fortune_30", wave: 30, hero: "SPIRIT", title: "Anchoring", type: "OBJECTIVE_WAVE", text: "(Spirit) Destroy the Void Anchors to power your way through the corruption.", data: { objective: true } },

    // --- ARC 4: THE RACE FINISHES (Waves 31-40) ---
    // Chunk 12: Chance (Waves 31-33)
    { id: "fortune_31", wave: 31, hero: "CHANCE", title: "The Floating Isle", type: "NARRATIVE", text: "(Chance) The destination is in sight. A floating island where the Mask rests. 'Jackpot!'" },
    { id: "fortune_32", wave: 32, hero: "CHANCE", title: "Opportunity", type: "NARRATIVE", text: "(Chance) While the Monk was distracted playing hero to his friends, you pushed forward. The lead is yours." },
    { id: "fortune_33", wave: 33, hero: "CHANCE", title: "Shadows Remain", type: "WAVE_OVERRIDE", text: "(Chance) The Void creatures pursure. 'Persistent aren't they?' You run and gun.", data: { forcedEnemyType: 'GHOST' } },

    // Chunk 13: Spirit (Waves 34-36)
    { id: "fortune_34", wave: 34, hero: "SPIRIT", title: "Neck and Neck", type: "NARRATIVE", text: "(Spirit) You take the Bridge of Light, bypassing the twisted path Chance took. You land just as he does." },
    { id: "fortune_35", wave: 35, hero: "SPIRIT", title: "The Mask's Voice", type: "NARRATIVE", text: "(Spirit) The Mask hums. It does not want to be found. It wants to test the worthy." },
    { id: "fortune_36", wave: 36, hero: "SPIRIT", title: "Hesitation", type: "NARRATIVE", text: "Chance reaches for the Mask. Spirit blocks the hand. 'Do not touch it! The ritual must be completed!'" },

    // Chunk 14: Chance (Waves 37-38)
    { id: "fortune_37", wave: 37, hero: "CHANCE", title: "Ego vs Duty", type: "NARRATIVE", text: "'It's just a mask!' Chance yells. 'It is the balance of the world!' Spirit retorts." },
    { id: "fortune_38", wave: 38, hero: "CHANCE", title: "Guardian's Test", type: "BOSS_FIGHT", text: "(Chance) The spectral guardian of the Mask awakens. 'I'll bet I can take him,' you smirk.", data: { bossId: 'MIMIC_KING' } },

    // Chunk 15: Spirit (Waves 39-40)
    { id: "fortune_39", wave: 39, hero: "SPIRIT", title: "Bridge of Light", type: "OBJECTIVE_WAVE", text: "(Spirit) You must construct the final path to the pedestal with pure light.", data: { objective: true } },
    { id: "fortune_40", wave: 40, hero: "SPIRIT", title: "The Last Hurdle", type: "BOSS_FIGHT", text: "(Spirit) A manifestation of Chaos blocks the stairs. You must remove it.", data: { bossId: 'DARK_GOLEM' } },

    // --- ARC 5: THE FINAL WAGER (Waves 41-50) ---
    // Chunk 16: Spirit (Waves 41-43)
    { id: "fortune_41", wave: 41, hero: "SPIRIT", title: "The Setup", type: "NARRATIVE", text: "Spirit begins the Ritual of Concealment, chanting ancient verses. Chance circles, looking for an opening." },
    { id: "fortune_42", wave: 42, hero: "SPIRIT", title: "Chaos Storm", type: "WAVE_OVERRIDE", text: "(Spirit) The disrupted ritual unleashes a chaos storm. You must hold the line!", data: { forcedEnemyType: 'CHAOS_SPAWN', spawnRateMod: 2.0 } },
    {
        id: "fortune_43", wave: 43, hero: "SPIRIT", title: "Helping Hand", type: "NARRATIVE",
        text: "In the distance, the 5 Friends are faltering against Makuta. Spirit pauses the ritual to send a wave of healing light.",
        choices: [
            { text: "Channel Aid (Save Friends)", effect: "heal_full" },
            { text: "Focus on Mask (Ignore Them)", effect: "buff_damage" }
        ]
    },

    // Chunk 17: Chance (Waves 44-46)
    { id: "fortune_44", wave: 44, hero: "CHANCE", title: "The Distraction", type: "NARRATIVE", text: "(Chance) You use this moment of altruism to strike. 'You care too much,' you laugh, stepping forward." },
    { id: "fortune_45", wave: 45, hero: "CHANCE", title: "The Summit", type: "NARRATIVE", text: "(Chance) You stand before the True Golden Mask. The air crackles with tension. It's beautiful." },
    { id: "fortune_46", wave: 46, hero: "CHANCE", title: "Critical Mass", type: "OBJECTIVE_WAVE", text: "(Chance) The energy is going critical! Even you don't like these odds. Stabilize the pylons or we all blow up!", data: { objective: true } },

    // Chunk 18: Finale (Waves 47-50)
    { id: "fortune_47", wave: 47, hero: "SPIRIT", title: "The Realization", type: "NARRATIVE", text: "(Spirit) There is no middle ground. Chaos or Order. One must prevail." },
    {
        id: "fortune_48", wave: 48, title: "The Final Choice", type: "NARRATIVE",
        text: "The time has come. Who are you really? The Protector or the Opportunist?",
        choices: [
            { text: "I am Spirit (Finish Ritual)", outcome: "set_hero_spirit" },
            { text: "I am Chance (Take Mask)", outcome: "set_hero_chance" }
        ]
    },
    { id: "fortune_49", wave: 49, title: "Ascendance", type: "NARRATIVE", text: "You shed your disguise. You are the Avatar. Your rival stands ready for the final duel." },
    {
        id: "fortune_50", wave: 50, title: "The Ultimate Showdown", type: "BOSS_FIGHT",
        text: "Spirit must defeat Chance to complete the ritual. Chance must defeat Spirit to claim the prize. FIGHT!",
        data: { spawnEnemy: 'RIVAL_1V1' }
    }
];
