// Faith of Fortune - Story Campaign

/*
    Plot: The delicate balance of probability has been shattered. 
    The "Spirit" monks of the Golden Temple seek to restore order, while the agents of "Chance" 
    revel in the newfound chaos of the fractured reality.
*/

window.FORTUNE_STORY_CHAPTERS = [
    // --- INTRO ---
    {
        id: "fortune_1",
        wave: 12,
        priority: 10,
        title: "The Two-Sided Coin",
        text: "You find a coin spinning on the ground, never toppling. One side reflects a serene amber light, the other flashes with blinding, glitching neon colors. It hums with a dissonant chord.",
        choices: [
            { text: "Pick it up", effect: "biomemod_madness" }
        ],
        onTrigger: () => {
            if (typeof showNotification === 'function') showNotification("New Paths Revealed", "#F0D080");
            // Force biome mix?
        }
    },

    // --- SPIRIT ARC (Order/Temple) ---
    {
        id: "fortune_spirit_unlock",
        wave: 25,
        reqHero: "any",
        priority: 20,
        title: "The Silent Sanctuary",
        text: "You stumble into a realm of golden geometry. The air is thick with incense and silence. A monk approaches, floating above the ground. 'The Equation of Fate is unbalanced,' they project into your mind. 'Help us restore the integers.'",
        data: {
            forceBiome: 'temple',
            reward: 'unlock_spirit' // Pseudo-reward logic handled in game or manual unlock
        },
        buttons: [{ text: "Meditate", action: "continue" }]
    },
    {
        id: "fortune_spirit_trial",
        wave: 35,
        reqHero: "spirit", // Requires playing as Spirit
        priority: 25,
        title: "Inner Turmoil",
        text: "The Guardian blocks your path. 'Peace is not passivity,' it rumbles. 'Prove that your tranquility can weather the storm.'",
        data: {
            spawnEnemy: 'temple_guardian',
            count: 3
        }
    },

    // --- CHANCE ARC (Chaos/Madness) ---
    {
        id: "fortune_chance_unlock",
        wave: 25, // Alternative path or parallel? Let's make it later or random. Let's make it Wave 45.
        // Actually, let's make it accessible independently.
        wave: 45,
        priority: 20,
        title: "Glitch in the Matrix",
        text: "The world stutters. Textures fail to load. A manic laughter erupts from a tear in the sky. 'BORING!' a voice screens. 'Let's reroll this universe!' A figure in magenta robes tosses a pair of dice that explode into stars.",
        data: {
            forceBiome: 'madness',
            reward: 'unlock_chance'
        },
        buttons: [{ text: "Roll the Dice", action: "continue" }]
    },
    {
        id: "fortune_chance_trial",
        wave: 55,
        reqHero: "chance",
        priority: 25,
        title: "Jackpot or Bust",
        text: "The neon lights of the Madness realm intensify. 'You think you're lucky?' the voice mocks. 'Fate isn't written, it's gambled! Go all in!'",
        data: {
            mutator: 'DOUBLE_SPEED' // Chaos effect
        }
    },

    // --- CLIMAX ---
    {
        id: "fortune_climax",
        wave: 77,
        priority: 50,
        title: "The Fate of Fortune",
        text: "The Golden Temple and the Madness Field collide. Order meets Entropy. The coin stops spinning.",
        choices: [
            { text: "Restore Balance (Spirit)", outcome: "ending_spirit" },
            { text: "Embrace Chaos (Chance)", outcome: "ending_chance" }
        ]
    }
];

