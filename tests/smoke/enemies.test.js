// Smoke coverage: every base enemy subtype must spawn, tick, and die
// without throwing. Catches regressions where a subType's AI branch
// references a renamed global, a missing sprite, or a removed helper —
// silent until that exact subType appears in a wave.
//
// Spawn path: `new Enemy(false, subType, session._world)`. This mirrors
// `TestingGrounds.spawnEnemy(typeId)` (TestingGrounds.js:234-236). The
// Enemy constructor allocates an ECS slot and the session's `_tick`
// loop iterates `runState.enemy*` typed arrays automatically — no
// manual push into `session.enemies` is required.
//
// DLC subtypes (GOLEM, HARPY, VOID_WALKER, …) live in DLC enemy modules
// that the server loader doesn't import; covering them is a separate
// follow-up — see plan phase 2 notes.

import { describe, it, expect } from 'vitest';
import {
    BASE_ENEMY_TYPES, STUB_INPUT,
    createSmokeSession, tickN, spawnEnemyOfType,
} from './_testkit.js';

describe('enemy smoke — spawn + tick + die', () => {
    for (const subType of BASE_ENEMY_TYPES) {
        it(`enemy[${subType}] spawns, ticks 60 frames, and dies without throwing`, () => {
            const ctx = createSmokeSession('fire');
            try {
                const enemy = spawnEnemyOfType(ctx, subType);
                expect(enemy).toBeTruthy();
                expect(enemy.subType).toBe(subType);
                // Idle ticks: enemy AI branch runs against a stationary
                // host. Long enough to cycle through shoot / summon /
                // bomber-explode / sniper-charge cooldowns where
                // applicable.
                tickN(ctx, 60, STUB_INPUT);

                // Lethal damage. Setting hp <= 0 triggers the gameplay
                // loop's death sweep on the next tick (cf.
                // core/updateGameplayMid.js:1281).
                enemy.hp = -99999;
                tickN(ctx, 30, STUB_INPUT);
            } finally {
                ctx.teardown();
            }
        });
    }
});

describe('enemy smoke — under sustained player fire', () => {
    for (const subType of BASE_ENEMY_TYPES) {
        it(`enemy[${subType}] absorbs sustained shoot input without throwing`, () => {
            const ctx = createSmokeSession('fire');
            try {
                spawnEnemyOfType(ctx, subType);
                // Host fires continuously. Stress-tests collision /
                // damage / death-FX paths against the enemy subtype.
                // 60 ticks at fire's rangeCd (15) = ~4 hits — enough to
                // resolve kill or expose state-machine bug.
                tickN(ctx, 60, { ...STUB_INPUT, shoot: true });
            } finally {
                ctx.teardown();
            }
        });
    }
});
