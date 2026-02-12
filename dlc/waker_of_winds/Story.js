// Waker of Winds - Story Campaign

window.WIND_STORY_CHAPTERS = [
    // --- ARC 1: THE WHISPER OF THE WIND (Weeks 1-10) ---
    {
        id: "wind_1", wave: 1, hero: "AIR", type: "NARRATIVE",
        title: "The Awakening",
        text: "You wake up on the floating stones of the Sky Palace. The wind whispers: 'Prove your worth'. Maintain your flow to show you belong here.",
        data: { trial: { type: 'FLOW', params: { threshold: 50 } } }
    },
    {
        id: "wind_2", wave: 2, hero: "AIR", type: "NARRATIVE",
        title: "A Change in Pressure",
        text: "The pressure drops. Dark clouds gather. You must be fast to outrun the storm.",
        data: { trial: { type: 'SPEED', params: { time: 40 } } }
    },
    {
        id: "wind_3", wave: 3, hero: "AIR", type: "NARRATIVE",
        title: "Fragile Form",
        text: "This body is new to the skies. One mistake means falling. Do not get hit.",
        data: { trial: { type: 'NO_HIT', params: { hits: 0 } } }
    },
    {
        id: "wind_4", wave: 4, hero: "AIR", type: "OBJECTIVE_WAVE",
        title: "Growing Strength",
        text: "To lead the wind, you must command power. Become stronger to unlock the next gate.",
        data: { trial: { type: 'LEVEL_REACH', params: { level: 20 } } }
    },
    {
        id: "wind_5", wave: 5, hero: "AIR", type: "BOSS_FIGHT",
        title: "The Gatekeeper",
        text: "A Cloud Golem blocks the way. It tests your resolve. Defeat it to enter the courtyard.",
        data: { bossId: 'CLOUD_GOLEM' }
    },
    {
        id: "wind_6", wave: 6, hero: "AIR", type: "NARRATIVE",
        title: "The First Artifact",
        text: "An azure crystal pulses with light. Keep moving to synchronize with its rhythm.",
        data: { trial: { type: 'FLOW_DURATION', params: { duration: 10 } } }
    },
    {
        id: "wind_7", wave: 7, hero: "AIR", type: "NARRATIVE",
        title: "Birds of Prey",
        text: "Harpies descend, screeching. They are fast. You must be faster.",
        data: { trial: { type: 'SPEED', params: { time: 35 } } }
    },
    {
        id: "wind_8", wave: 8, hero: "AIR", type: "NARRATIVE",
        title: "Freefall",
        text: "The bridge collapses! Avoid debris while falling. Minimize impact.",
        data: { trial: { type: 'NO_HIT', params: { hits: 2 } } }
    },
    {
        id: "wind_9", wave: 9, hero: "AIR", type: "NARRATIVE",
        title: "Updraft",
        text: "The wind lifts you back up. Use the updraft. Don't stop moving.",
        data: { trial: { type: 'FLOW', params: { threshold: 1 } } }
    },
    {
        id: "wind_10", wave: 10, hero: "AIR", type: "BOSS_FIGHT",
        title: "The Storm Crow",
        text: "The ruler of the lower currents. Lightning crackles in its wings. Survive.",
        data: { bossId: 'STORM_CROW' }
    },

    // --- ARC 2: THE GATHERING STORM ---
    {
        id: "wind_11", wave: 11, hero: "AIR", type: "WAVE_OVERRIDE",
        title: "Headwind",
        text: "You have ascended, but the wind fights you now. Push through the gale.",
        data: { chaosMode: 'SPEED_DEMON', trial: { type: 'SPEED', params: { time: 60 } } }
    },
    {
        id: "wind_12", wave: 12, hero: "AIR", type: "NARRATIVE",
        title: "Voices",
        text: "Voices of fallen heroes echo in the gale. 'Turn back,' they say. Prove them wrong by taking no damage.",
        data: { trial: { type: 'NO_HIT', params: { hits: 0 } } }
    },
    {
        id: "wind_13", wave: 13, hero: "AIR", type: "NARRATIVE",
        title: "Lightning's Shadow",
        text: "Ancient thunder rumbles. Dodge the strikes. Stay elusive.",
        data: { trial: { type: 'NO_HIT', params: { hits: 3 } } }
    },
    {
        id: "wind_14", wave: 14, hero: "AIR", type: "NARRATIVE",
        title: "The Vacuum",
        text: "The air is sucked away. Suffocation sets in. Kill quickly to restore the atmosphere.",
        data: { trial: { type: 'SPEED', params: { time: 45 } } }
    },
    {
        id: "wind_15", wave: 15, hero: "AIR", type: "OBJECTIVE_WAVE",
        title: "Threshold of Power",
        text: "The inner sanctum requires strength. Become stronger or be cast out.",
        data: { trial: { type: 'LEVEL_REACH', params: { level: 30 } } }
    },
    {
        id: "wind_16", wave: 16, hero: "AIR", type: "NARRATIVE",
        title: "Elevation",
        text: "The altitude freezes your lungs. Keep your flow high to stay warm.",
        data: { trial: { type: 'FLOW', params: { threshold: 30 } } }
    },
    {
        id: "wind_17", wave: 17, hero: "AIR", type: "NARRATIVE",
        title: "The Zephyr",
        text: "Become the wind itself. Unleash your ultimate power.",
        data: { trial: { type: 'ULTIMATE', params: { count: 1 } } }
    },
    {
        id: "wind_18", wave: 18, hero: "AIR", type: "NARRATIVE",
        title: "Lost Technology",
        text: "Floating platforms rotate around a core. Don't fall. Precision is key.",
        data: { trial: { type: 'NO_HIT', params: { hits: 5 } } }
    },
    {
        id: "wind_19", wave: 19, hero: "AIR", type: "NARRATIVE",
        title: "Target Locked",
        text: "Security drones are active. You are being hunted. Evade capture.",
        data: { trial: { type: 'SPEED', params: { time: 50 } } }
    },
    {
        id: "wind_20", wave: 20, hero: "AIR", type: "BOSS_FIGHT",
        title: "Mechanized Storm",
        text: "The Machine that generates the palace's storms. Break its core to stop the gale.",
        data: { bossId: 'TORNADO_MACHINA' }
    },
    {
        id: "wind_21", wave: 21, hero: "AIR", type: "NARRATIVE", title: "The Compass",
        text: "The compass spins wildly. It demands speed to find your true direction.",
        data: { trial: { type: 'SPEED', params: { time: 40 } } }
    },
    {
        id: "wind_22", wave: 22, hero: "AIR", type: "NARRATIVE", title: "Ascension",
        text: "You climb towards the throne. Don't look down. Perfection is required.",
        data: { trial: { type: 'NO_HIT', params: { hits: 0 } } }
    },
    {
        id: "wind_23", wave: 23, hero: "AIR", type: "WAVE_OVERRIDE", title: "Fog of War",
        text: "The clouds descend, blinding you. Trust your senses to clear the way.",
        data: { chaosMode: 'GHOST_TOWN', trial: { type: 'SPEED', params: { time: 60 } } }
    },
    {
        id: "wind_24", wave: 24, hero: "AIR", type: "NARRATIVE", title: "Echoes",
        text: "Your attacks echo in the vast hall. Maintain your rhythm.",
        data: { trial: { type: 'FLOW', params: { threshold: 80 } } }
    },
    {
        id: "wind_25", wave: 25, hero: "AIR", type: "OBJECTIVE_WAVE", title: "Mid-Ascension",
        text: "The air is too thin for the weak. Become stronger before the summit.",
        data: { trial: { type: 'LEVEL_REACH', params: { level: 40 } } }
    },
    {
        id: "wind_26", wave: 26, hero: "AIR", type: "NARRATIVE", title: "The Summit",
        text: "The throne room is near. The guards are elite. Minimize damage.",
        data: { trial: { type: 'NO_HIT', params: { hits: 3 } } }
    },
    {
        id: "wind_27", wave: 27, hero: "AIR", type: "NARRATIVE", title: "Divine Right",
        text: "Are you worthy to sit on the throne? Prove your speed.",
        data: { trial: { type: 'SPEED', params: { time: 45 } } }
    },
    {
        id: "wind_28", wave: 28, hero: "AIR", type: "NARRATIVE", title: "The Rival",
        text: "A shadow approaches. It moves like you. Show it your power.",
        data: { trial: { type: 'ULTIMATE', params: { count: 1 } } }
    },
    {
        id: "wind_29", wave: 29, hero: "AIR", type: "NARRATIVE", title: "Mirror Match",
        text: "You face your own doubts. Don't let them hit you.",
        data: { trial: { type: 'NO_HIT', params: { hits: 5 } } }
    },
    { id: "wind_30", wave: 30, hero: "AIR", type: "BOSS_FIGHT", title: "Doppelganger", text: "Defeat your shadow. Prove you are the true Air Hero.", data: { bossId: 'AIR_CLONE' } },

    // Arc 4
    { id: "wind_31", wave: 31, hero: "AIR", type: "NARRATIVE", title: "Self Mastery", text: "You have conquered yourself. Now, become lighter than air.", data: { trial: { type: 'FLOW', params: { threshold: 50 } } } },
    { id: "wind_32", wave: 32, hero: "AIR", type: "COMPANION_JOIN", title: "An Old Ally", text: "The Fire Hero sends aid. Fire joins Wind.", data: { companionType: "fire" } },
    { id: "wind_33", wave: 33, hero: "AIR", type: "NARRATIVE", title: "Convergence", text: "Together you are stronger. Clear the path quickly.", data: { trial: { type: 'SPEED', params: { time: 50 } } } },
    { id: "wind_34", wave: 34, hero: "AIR", type: "OBJECTIVE_WAVE", title: "Peak Condition", text: "The Storm King wakes. You must become stronger to face him.", data: { trial: { type: 'LEVEL_REACH', params: { level: 50 } } } },
    { id: "wind_35", wave: 35, hero: "AIR", type: "NARRATIVE", title: "The Warning", text: "The palace shakes. The King demands perfection.", data: { trial: { type: 'NO_HIT', params: { hits: 2 } } } },
    { id: "wind_36", wave: 36, hero: "AIR", type: "NARRATIVE", title: "Hurricane", text: "Debris fills the air. Flow around it.", data: { trial: { type: 'FLOW', params: { threshold: 90 } } } },
    { id: "wind_37", wave: 37, hero: "AIR", type: "WAVE_OVERRIDE", title: "Debris Field", text: "Giant rocks are thrown by the storm. Dodge them.", data: { chaosMode: 'GIANT_ENEMIES', trial: { type: 'NO_HIT', params: { hits: 4 } } } },
    { id: "wind_38", wave: 38, hero: "AIR", type: "NARRATIVE", title: "The Throne", text: "A cold wind blows from the throne. Rush forward.", data: { trial: { type: 'SPEED', params: { time: 40 } } } },
    { id: "wind_39", wave: 39, hero: "AIR", type: "NARRATIVE", title: "Face to Face", text: "He looks tired, but powerful. Keep moving.", data: { trial: { type: 'FLOW', params: { threshold: 20 } } } },
    { id: "wind_40", wave: 40, hero: "AIR", type: "BOSS_FIGHT", title: "The Lieutenant", text: "The Living Tornado guards his master. Disperse it.", data: { bossId: 'TORNADO_MACHINA' } },

    // Arc 5
    { id: "wind_41", wave: 41, hero: "AIR", type: "NARRATIVE", title: "The Truth", text: "The King was once a hero like you. He tests you now.", data: { trial: { type: 'SPEED', params: { time: 60 } } } },
    { id: "wind_42", wave: 42, hero: "AIR", type: "NARRATIVE", title: "Inheritance", text: "To take his place, you must be untouchable.", data: { trial: { type: 'NO_HIT', params: { hits: 2 } } } },
    { id: "wind_43", wave: 43, hero: "AIR", type: "OBJECTIVE_WAVE", title: "Final Gate", text: "Prove complete mastery. Become stronger.", data: { trial: { type: 'LEVEL_REACH', params: { level: 60 } } } },
    { id: "wind_44", wave: 44, hero: "AIR", type: "NARRATIVE", title: "Unleashed", text: "The storm crashes around you. Maintain 100% Flow.", data: { trial: { type: 'FLOW', params: { threshold: 100 } } } },
    { id: "wind_45", wave: 45, hero: "AIR", type: "WAVE_OVERRIDE", title: "Cat. 5", text: "Survival is unlikely. The wind screams.", data: { spawnRateMod: 3.0, trial: { type: 'NO_HIT', params: { hits: 10 } } } },
    { id: "wind_46", wave: 46, hero: "AIR", type: "NARRATIVE", title: "Eye of the Needle", text: "Thread the needle. One path forward.", data: { trial: { type: 'SPEED', params: { time: 50 } } } },
    { id: "wind_47", wave: 47, hero: "AIR", type: "NARRATIVE", title: "I Am The Storm", text: "Accept your power. Unleash the storm twice.", data: { trial: { type: 'ULTIMATE', params: { count: 2 } } } },
    { id: "wind_48", wave: 48, hero: "AIR", type: "NARRATIVE", title: "Final Form", text: "You are the Zephyr. Consistent flow required.", data: { trial: { type: 'FLOW', params: { threshold: 50 } } } },
    { id: "wind_49", wave: 49, hero: "AIR", type: "NARRATIVE", title: "Succession", text: "The King smiles. He is ready to rest.", data: { trial: { type: 'SPEED', params: { time: 30 } } } },
    { id: "wind_50", wave: 50, hero: "AIR", type: "BOSS_FIGHT", title: "The Winds of Change", text: "Face the Storm King. Become the new Wind Waker.", data: { bossId: 'TEMP_EST' } }
];
