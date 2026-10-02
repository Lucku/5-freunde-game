// Story objective waves (OBJECTIVE_WAVE) — shared by singleplayer (game.js
// resumeWaveGeneration) and the online server, which runs the objective and
// sends it in snapshots. The objective is P1's (its hero picks the type), as
// in local co-op. Reads the bare globals `arena` / `showNotification`, which
// both sides provide.
import { runState } from '../RunState.js';

export function startObjective() {
    runState.currentObjective = {
        type: 'NONE',
        target: 0,
        current: 0,
        state: 'ACTIVE',
        data: {}
    };

    if (runState.player.type === 'fire') {
        runState.currentObjective.type = 'INFERNO';
        runState.currentObjective.target = 30; // 30 seconds
        runState.currentObjective.current = 0;
        showNotification("OBJECTIVE: MAINTAIN COMBO x10!");
    } else if (runState.player.type === 'plant') {
        runState.currentObjective.type = 'DEFENSE';
        runState.currentObjective.data.sapling = {
            x: arena.width / 2,
            y: arena.height / 2,
            hp: 500,
            maxHp: 500,
            radius: 30
        };
        showNotification("OBJECTIVE: PROTECT THE SAPLING!");
    } else if (runState.player.type === 'ice') {
        runState.currentObjective.type = 'EYE_OF_STORM';
        runState.currentObjective.target = 45; // Accumulate 45 seconds inside the eye
        runState.currentObjective.current = 0;
        runState.currentObjective.data.stormEye = {
            x: arena.width / 2,
            y: arena.height / 2,
            radius: 150,
            tx: arena.width / 2,
            ty: arena.height / 2
        };
        showNotification("OBJECTIVE: STAY IN THE EYE OF THE STORM!");
    } else if (runState.player.type === 'water') {
        runState.currentObjective.type = 'UNTOUCHABLE';
        runState.currentObjective.target = 5; // Max 5 hits
        runState.currentObjective.current = 0;
        showNotification("OBJECTIVE: AVOID DAMAGE!");
    } else if (runState.player.type === 'metal') {
        runState.currentObjective.type = 'IRON_WILL';
        runState.currentObjective.target = 60; // Survive 60 seconds
        runState.currentObjective.current = 0;
        showNotification("OBJECTIVE: SURVIVE THE DECAY!");
    }

    // DLC Hook: Start Objective
    if (window.HERO_LOGIC && window.HERO_LOGIC[runState.player.type] && window.HERO_LOGIC[runState.player.type].startObjective) {
        window.HERO_LOGIC[runState.player.type].startObjective(runState.currentObjective);
    }
}
