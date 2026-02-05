// Temporary testing code for Versus Mode AI
// This should be integrated into a proper GameMode later.

window.spawnAIPlayer = function (heroType = 'fire') {
    if (!window.player) {
        console.error("Player 1 must be active to spawn AI.");
        return;
    }

    console.log(`Spawning AI Opponent: ${heroType}`);

    // Create the AI Player with isCPU=true
    const p2 = new Player(heroType, true);
    p2.controller = new AIController(window.player); // Target Player 1

    // Position relative to P1
    p2.x = window.player.x + 400;
    p2.y = window.player.y;

    // Assign ID to distinguish (important for collision)
    p2.id = "PLAYER_2_AI";

    // Add to a global list so game loop can update it
    if (!window.additionalPlayers) window.additionalPlayers = [];
    window.additionalPlayers.push(p2);

    // Turn off Spawners for duel
    if (typeof waveTimer !== 'undefined') waveTimer = 999999;
    // We should probably disable enemy spawning logic too, 
    // but setting timer high prevents wave progression at least.

    console.log("AI Player Spawned. Access via window.additionalPlayers[0]");
}
