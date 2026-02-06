// The Champions of Chaos Story Campaign

// 50 Chapters - Alternating Perspectives
window.CHAOS_STORY_CHAPTERS = [
    // --- ARC 1: THE ARTIFACT (Weeks 1-10) ---
    // Discovery of the Chaos Gem
    { id: "chaos_1", wave: 1, hero: "GRAVITY", type: "NARRATIVE", title: "The Pull", text: "Something ancient has awoken. I can feel its gravitational pull from miles away." },
    { id: "chaos_2", wave: 2, hero: "VOID", type: "NARRATIVE", title: "Signal Detected", text: "Scanning... Unique energy signature detected. It does not belong to this reality." },
    { id: "chaos_3", wave: 3, hero: "GRAVITY", type: "NARRATIVE", title: "Whispers", text: "The earth trembles. A relic of the old world calls to me. I must find it." },
    { id: "chaos_4", wave: 4, hero: "VOID", type: "NARRATIVE", title: "Target Acquired", text: "Objective updated: Locate the source of the anomaly. Probability of trap: High." },
    { id: "chaos_5", wave: 5, hero: "GRAVITY", type: "BOSS_FIGHT", title: "Guardian", text: "A massive beast guards the crater. It knows what lies beneath.", data: { bossId: 'VOID_WALKER_BOSS' } },
    { id: "chaos_6", wave: 6, hero: "VOID", type: "NARRATIVE", title: "Visual Confirmation", text: "The object appears to be a gemstone. Emitting hazardous data streams." },
    { id: "chaos_7", wave: 7, hero: "GRAVITY", type: "NARRATIVE", title: "The Gem", text: "It pulses with a dark light. The Chaos Gem. Legends said it was destroyed." },
    { id: "chaos_8", wave: 8, hero: "VOID", type: "NARRATIVE", title: "Analysis", text: "Object analysis: Infinite potential energy. Unstable. It is a key." },
    { id: "chaos_9", wave: 9, hero: "GRAVITY", type: "NARRATIVE", title: "Intruder", text: "I am not alone here. A shadow moves in the periphery. A rival?" },
    { id: "chaos_10", wave: 10, hero: "VOID", type: "BOSS_FIGHT", title: "Defense System", text: "Security protocols engaging. I must secure the asset.", data: { bossId: 'GLITCH_BOSS' } },

    // --- ARC 2: THE ENCOUNTER (Weeks 11-20) ---
    // Meeting and Skepticism
    { id: "chaos_11", wave: 11, hero: "GRAVITY", type: "WAVE_OVERRIDE", title: "First Sight", text: "A being of static and void steps forward. Is he a demon or a machine?", data: { spawnRateMod: 2.0 } },
    { id: "chaos_12", wave: 12, hero: "VOID", type: "WAVE_OVERRIDE", title: "Variable Identified", text: "Entity 'Gravity' blocks the path. Threat level: Calculable.", data: { spawnRateMod: 0.5 } },
    { id: "chaos_13", wave: 13, hero: "GRAVITY", type: "NARRATIVE", title: "Stand Down", text: "I warned him to step back. The Gem is too dangerous for his kind." },
    { id: "chaos_14", wave: 14, hero: "VOID", type: "NARRATIVE", title: "Illogical", text: "This entity resists my commands. It seeks to control the anomaly manually. Foolish." },
    { id: "chaos_15", wave: 15, hero: "GRAVITY", type: "NARRATIVE", title: "Skirmish", text: "We clashed. His blade cuts through space, but my gravity holds him back." },
    { id: "chaos_16", wave: 16, hero: "VOID", type: "NARRATIVE", title: "Stalemate", text: "Combat simulations inconclusive. Neither side possesses the advantage." },
    { id: "chaos_17", wave: 17, hero: "GRAVITY", type: "BOSS_FIGHT", title: "Common Enemy", text: "The Gem's power attracts vermin. We have to pause our duel.", data: { bossId: 'VOID_WALKER_BOSS' } },
    { id: "chaos_18", wave: 18, hero: "VOID", type: "NARRATIVE", title: "Temporary Truce", text: "Enemy density critical. Ceasing hostilities to address local threats." },
    { id: "chaos_19", wave: 19, hero: "GRAVITY", type: "NARRATIVE", title: "Uneasy Ally", text: "He fights with precision. Cold, but effective. I'll watch his back for now." },
    { id: "chaos_20", wave: 20, hero: "VOID", type: "BOSS_FIGHT", title: "System Crash", text: "The swarm is endless. We must synchronize or be deleted.", data: { bossId: 'GLITCH_BOSS' } },

    // --- ARC 3: THE REVELATION (Weeks 21-30) ---
    // The Gem's message and the true enemy
    { id: "chaos_21", wave: 21, hero: "GRAVITY", type: "NARRATIVE", title: " The Vision", text: "We touched the Gem together. It showed us... him. The Entropy Mage." },
    { id: "chaos_22", wave: 22, hero: "VOID", type: "NARRATIVE", title: "Data Download", text: "Data received. The Entropy Mage is rewriting reality. He seeks total zero." },
    { id: "chaos_23", wave: 23, hero: "GRAVITY", type: "OBJECTIVE_WAVE", title: "The Mission", text: "The Gem wasn't a prize. It was a warning. We have to stop him.", data: { objective: true } },
    { id: "chaos_24", wave: 24, hero: "VOID", type: "OBJECTIVE_WAVE", title: "Calculated Risk", text: "Probability of success alone: 0%. Probability as a unit: 14%. Acceptable.", data: { objective: true } },
    { id: "chaos_25", wave: 25, hero: "GRAVITY", type: "NARRATIVE", title: "Into the Chaos", text: "We must travel to the Chaos Level. The Mage's domain." },
    { id: "chaos_26", wave: 26, hero: "VOID", type: "NARRATIVE", title: "Routing...", text: "Plotting trajectory to the Chaos dimension. Expect heavy resistance." },
    { id: "chaos_27", wave: 27, hero: "GRAVITY", type: "NARRATIVE", title: "Understanding", text: "The void creature... he is trying to save this world too. In his own way." },
    { id: "chaos_28", wave: 28, hero: "VOID", type: "NARRATIVE", title: "New Directive", text: "Entity Gravity displays high resilience. Status upgraded from 'Obstacle' to 'Asset'." },
    { id: "chaos_29", wave: 29, hero: "GRAVITY", type: "NARRATIVE", title: "The Gate", text: "The portal lies ahead. There is no turning back." },
    { id: "chaos_30", wave: 30, hero: "VOID", type: "BOSS_FIGHT", title: "Gatekeeper", text: "The Mage has sent his lieutenant. We break him together.", data: { bossId: 'ENTROPY_LORD' } },

    // --- ARC 4: THE BOND (Weeks 31-40) ---
    // Growing friendship
    { id: "chaos_31", wave: 31, hero: "GRAVITY", type: "COMPANION_JOIN", title: "Back to Back", text: "Enemies on all sides. I trust him to hold the line.", data: { companionType: "void" } },
    { id: "chaos_32", wave: 32, hero: "VOID", type: "COMPANION_JOIN", title: "Covering Fire", text: "Supporting Gravity. Do not let them breach defenses.", data: { companionType: "gravity" } },
    { id: "chaos_33", wave: 33, hero: "GRAVITY", type: "NARRATIVE", title: "Synergy", text: "My gravity wells group them, his blades finish them. A perfect storm." },
    { id: "chaos_34", wave: 34, hero: "VOID", type: "NARRATIVE", title: "Efficiency Peak", text: "Our combat algorithms are evolving. We are learning from each other." },
    { id: "chaos_35", wave: 35, hero: "GRAVITY", type: "OBJECTIVE_WAVE", title: "No One Left Behind", text: "He took a hit meant for me. He is more than just code.", data: { objective: true } },
    { id: "chaos_36", wave: 36, hero: "VOID", type: "OBJECTIVE_WAVE", title: "Repairs", text: "Damage sustained. Gravity protected my core while I rebooted.", data: { objective: true } },
    { id: "chaos_37", wave: 37, hero: "GRAVITY", type: "NARRATIVE", title: "Brotherhood", text: "We are different, but we fight for the same existence. He is my brother now." },
    { id: "chaos_38", wave: 38, hero: "VOID", type: "NARRATIVE", title: "Definition Update", text: "The term 'friend' was previously undefined. Updating dictionary." },
    { id: "chaos_39", wave: 39, hero: "GRAVITY", type: "NARRATIVE", title: "The Citadel", text: "We reached the Mage's citadel. The source of the entropy." },
    { id: "chaos_40", wave: 40, hero: "GRAVITY", type: "BOSS_FIGHT", title: "The Guard", text: "One last beast before the throne. Let's move.", data: { bossId: 'VOID_WALKER_BOSS' } },

    // --- ARC 5: THE ENTROPY MAGE (Weeks 41-50) ---
    // Final Confrontation
    { id: "chaos_41", wave: 41, hero: "VOID", type: "COMPANION_JOIN", title: "Breach", text: "We are in. The laws of physics are broken here.", data: { companionType: "gravity" } },
    { id: "chaos_42", wave: 42, hero: "GRAVITY", type: "COMPANION_JOIN", title: "Together", text: "Whatever happens, we face it together.", data: { companionType: "void" } },
    { id: "chaos_43", wave: 43, hero: "GRAVITY", type: "NARRATIVE", title: "The Mage", text: "He stands there, unmaking the world. The Entropy Mage." },
    { id: "chaos_44", wave: 44, hero: "VOID", type: "NARRATIVE", title: "Final Target", text: "Target locked: Entropy Mage. Elimination is the only option." },
    { id: "chaos_45", wave: 45, hero: "GRAVITY", type: "WAVE_OVERRIDE", title: "Total Chaos", text: "He is throwing everything at us. Reality is crumbling!", data: { spawnRateMod: 3.0 } },
    { id: "chaos_46", wave: 46, hero: "VOID", type: "WAVE_OVERRIDE", title: "System Failure", text: "Warning: Existential integrity critical. Redirecting power to weapons.", data: { spawnRateMod: 3.0 } },
    { id: "chaos_47", wave: 47, hero: "GRAVITY", type: "NARRATIVE", title: "The Last Stand", text: "We will not fade into the nothingness! Push!" },
    { id: "chaos_48", wave: 48, hero: "VOID", type: "NARRATIVE", title: "For the World", text: "Executing final protocol. For the world. For my friend." },
    { id: "chaos_49", wave: 49, hero: "GRAVITY", type: "NARRATIVE", title: "Strike", text: "Now! While he's distracted! Combined attack!" },
    { id: "chaos_50", wave: 50, hero: "VOID", type: "BOSS_FIGHT", title: "ENTROPY FALLS", text: "GAME OVER, MAGE. DELETE CONFIRMED.", data: { bossId: 'ENTROPY_LORD' } }
];
