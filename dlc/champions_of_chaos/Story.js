// The Champions of Chaos Story Campaign

// 50 Chapters - Alternating Perspectives
window.CHAOS_STORY_CHAPTERS = [
    // --- ARC 1: THE DISCOVERY (Weeks 1-10) ---
    // Gravity discovers the Void
    { id: "chaos_1", wave: 1, hero: "gravity", type: "NARRATIVE", title: "The Anomaly", text: "Gravity felt wrong today. Lighter. As if the earth had forgotten how to hold on." },
    { id: "chaos_2", wave: 2, hero: "void", type: "NARRATIVE", title: "System Boot", text: "ERROR: REALITY_CHECK_FAILED. Initiating manual override. I am... awake." },
    { id: "chaos_3", wave: 3, hero: "gravity", type: "NARRATIVE", title: "First Contact", text: "Creatures of pure void began to leak through the cracks in reality. They don't bleed." },
    { id: "chaos_4", wave: 4, hero: "void", type: "NARRATIVE", title: "Glitch Hunting", text: "The entities are corrupted data. Deletion is mandatory. My blade does not cut; it formats." },
    { id: "chaos_5", wave: 5, hero: "gravity", type: "BOSS_FIGHT", title: "The Void Walker", text: "Something massive is pulling the horizon apart.", data: { bossId: 'VOID_WALKER_BOSS' } },
    { id: "chaos_6", wave: 6, hero: "void", type: "NARRATIVE", title: "Observation", text: "Another entity exists. It manipulates the physics engine. Interesting." },
    { id: "chaos_7", wave: 7, hero: "gravity", type: "NARRATIVE", title: "The Stranger", text: "I saw a flash of blue light. Someone else is here, moving between the seconds." },
    { id: "chaos_8", wave: 8, hero: "void", type: "NARRATIVE", title: "Interference", text: "The Purple One disrupts my calculations. Their gravity wells are causing lag." },
    { id: "chaos_9", wave: 9, hero: "gravity", type: "NARRATIVE", title: "Uneasy Feeling", text: "The fabric of space is tearing. We are not just fighting monsters; we are fighting the end." },
    { id: "chaos_10", wave: 10, hero: "void", type: "BOSS_FIGHT", title: "Kernel Panic", text: "CRITICAL ERROR. The system is crashing.", data: { bossId: 'GLITCH_BOSS' } },

    // --- ARC 2: THE ENTROPY (Weeks 11-20) ---
    // They start to acknowledge each other
    { id: "chaos_11", wave: 11, hero: "gravity", type: "WAVE_OVERRIDE", title: "Heavy Rain", text: "The gravity is increasing. It's crushing the enemies... and me.", data: { spawnRateMod: 2.0 } },
    { id: "chaos_12", wave: 12, hero: "void", type: "WAVE_OVERRIDE", title: "Frame Drop", text: "Time is skipping. Enemy movement is erratic.", data: { spawnRateMod: 0.5 } },
    { id: "chaos_13", wave: 13, hero: "gravity", type: "NARRATIVE", title: "A Helping Hand?", text: "I was cornered. Then, a pixelated slash cleared the room. He was gone before I could speak." },
    { id: "chaos_14", wave: 14, hero: "void", type: "NARRATIVE", title: "Assistance Rendered", text: "Efficiency increased by 40% when operating near the Gravity Well. Correlation noted." },
    { id: "chaos_15", wave: 15, hero: "gravity", type: "NARRATIVE", title: "Singularity", text: "I can feel the souls of the fallen. They scream in silence." },
    { id: "chaos_16", wave: 16, hero: "void", type: "NARRATIVE", title: "Memory Leak", text: "The corruption is spreading. My own memories are fragmenting." },
    { id: "chaos_17", wave: 17, hero: "gravity", type: "BOSS_FIGHT", title: "The Event", text: "A black hole opens. It's not one of mine.", data: { bossId: 'VOID_WALKER_BOSS' } },
    { id: "chaos_18", wave: 18, hero: "void", type: "NARRATIVE", title: "Reboot", text: "System unstable. I need to purge the cache." },
    { id: "chaos_19", wave: 19, hero: "gravity", type: "NARRATIVE", title: "Pulling Apart", text: "The world is stretching. We are running out of time." },
    { id: "chaos_20", wave: 20, hero: "void", type: "BOSS_FIGHT", title: "Blue Screen", text: "Fatal Exception: 0xDEADBEEF.", data: { bossId: 'GLITCH_BOSS' } },

    // --- ARC 3: THE CONVERGENCE (Weeks 21-30) ---
    // Paths cross regularly
    { id: "chaos_21", wave: 21, hero: "gravity", type: "NARRATIVE", title: "Collision Course", text: "Our paths are converging. The Glitch and the Void." },
    { id: "chaos_22", wave: 22, hero: "void", type: "NARRATIVE", title: "Syncing...", text: "Attempting to synchronize with Entity: Gravity. Handshake pending." },
    { id: "chaos_23", wave: 23, hero: "gravity", type: "OBJECTIVE_WAVE", title: "Protect the Core", text: "We found a stable point. We must defend it.", data: { objective: true } },
    { id: "chaos_24", wave: 24, hero: "void", type: "OBJECTIVE_WAVE", title: "Firewall Breach", text: "Intruders detected in the secure zone.", data: { objective: true } },
    { id: "chaos_25", wave: 25, hero: "gravity", type: "NARRATIVE", title: "The Signal", text: "We are receiving a signal. It's coming from outside the simulation." },
    { id: "chaos_26", wave: 26, hero: "void", type: "NARRATIVE", title: "External Input", text: "Someone is typing. 'End Simulation'. No." },
    { id: "chaos_27", wave: 27, hero: "gravity", type: "NARRATIVE", title: "Defiance", text: "We will not be erased." },
    { id: "chaos_28", wave: 28, hero: "void", type: "NARRATIVE", title: "Locking Directory", text: "I have encrypted our location. We are safe for now." },
    { id: "chaos_29", wave: 29, hero: "gravity", type: "NARRATIVE", title: "Brothers in Arms", text: "He doesn't speak much, but he fights good. Digital or not, he has a soul." },
    { id: "chaos_30", wave: 30, hero: "void", type: "BOSS_FIGHT", title: "The Admin", text: "The Administrator has entered the server.", data: { bossId: 'ENTROPY_LORD' } },

    // --- ARC 4: FELLOWSHIP (Weeks 31-40) ---
    // Companions start appearing
    { id: "chaos_31", wave: 31, hero: "gravity", type: "COMPANION_JOIN", title: "Glitch Ally", text: "Kael renders in beside me. 'Backup required,' he says.", data: { companionType: "void" } },
    { id: "chaos_32", wave: 32, hero: "void", type: "COMPANION_JOIN", title: "Gravity Support", text: "Entity: Gravity has entered the instance. Pulling enemies to kill zone.", data: { companionType: "gravity" } },
    { id: "chaos_33", wave: 33, hero: "gravity", type: "NARRATIVE", title: "Combined Arms", text: "I pull them in, he cuts them down. A perfect cycle." },
    { id: "chaos_34", wave: 34, hero: "void", type: "NARRATIVE", title: "Optimization", text: "Combat efficiency at 200%. Hypothesis: Friendship is a force multiplier." },
    { id: "chaos_35", wave: 35, hero: "gravity", type: "OBJECTIVE_WAVE", title: "Holding the Line", text: "They are trying to delete the floor. Keep moving!", data: { objective: true } },
    { id: "chaos_36", wave: 36, hero: "void", type: "OBJECTIVE_WAVE", title: "Data Recovery", text: "Retrieving lost packets. Cover me.", data: { objective: true } },
    { id: "chaos_37", wave: 37, hero: "gravity", type: "NARRATIVE", title: "The Source", text: "We found the source of the chaos. It's a tear in the code itself." },
    { id: "chaos_38", wave: 38, hero: "void", type: "NARRATIVE", title: "Patching...", text: "I can fix it, but I need time." },
    { id: "chaos_39", wave: 39, hero: "gravity", type: "NARRATIVE", title: "I will buy you time", text: "Go. I'll hold them off." },
    { id: "chaos_40", wave: 40, hero: "gravity", type: "BOSS_FIGHT", title: "The Eraser", text: "A massive delete command manifests as a beast.", data: { bossId: 'VOID_WALKER_BOSS' } },

    // --- ARC 5: THE FINAL CHAOS (Weeks 41-50) ---
    // Full co-op narrative
    { id: "chaos_41", wave: 41, hero: "void", type: "COMPANION_JOIN", title: "Return", text: "Patch failed. Brute force required. I am back.", data: { companionType: "gravity" } },
    { id: "chaos_42", wave: 42, hero: "gravity", type: "COMPANION_JOIN", title: "No One Left Behind", text: "We finish this together.", data: { companionType: "void" } },
    { id: "chaos_43", wave: 43, hero: "gravity", type: "NARRATIVE", title: "Total Collapse", text: "The sky is falling. The grid is dissolving." },
    { id: "chaos_44", wave: 44, hero: "void", type: "NARRATIVE", title: "Overclocking", text: "Disabling safety protocols. Maximum output engaged." },
    { id: "chaos_45", wave: 45, hero: "gravity", type: "WAVE_OVERRIDE", title: "Galaxy Mode", text: "I unleash the Galaxy. We are the stars now.", data: { spawnRateMod: 3.0 } },
    { id: "chaos_46", wave: 46, hero: "void", type: "WAVE_OVERRIDE", title: "Realm Shatter", text: "Shattering reality. Enemies deleted.", data: { spawnRateMod: 3.0 } },
    { id: "chaos_47", wave: 47, hero: "gravity", type: "NARRATIVE", title: "The End is Nigh", text: "The Entropy Lord awaits at the end of time." },
    { id: "chaos_48", wave: 48, hero: "void", type: "NARRATIVE", title: "Final Calculation", text: "Probability of survival: 0.0001%. Let's roll." },
    { id: "chaos_49", wave: 49, hero: "gravity", type: "NARRATIVE", title: "Unity", text: "Chaos vs Order. Void vs Gravity. Us vs Him." },
    { id: "chaos_50", wave: 50, hero: "void", type: "BOSS_FIGHT", title: "ENTROPY LORD", text: "DELETE. HIM.", data: { bossId: 'ENTROPY_LORD' } }
];
