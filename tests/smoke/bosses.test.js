// Smoke coverage: every boss type must spawn, tick through both phases,
// and die without throwing. Catches the same class of regressions as
// the enemy smoke (renamed globals, missing sprite paths, removed
// helpers) plus boss-specific paths: phase-2 transition, telegraph
// timer, special attack states (Rhino charge, Makuta channel/barrage/
// sweep, Green Goblin ult, Zeus storm, Hydra split).
//
// Spawn path: `new Boss(type)` mirrors
// `TestingGrounds.spawnBoss(typeId)` (TestingGrounds.js:267-270).
// Boss is its own class — not an Enemy subtype — but bosses are
// pushed onto the same `enemies` array (cf.
// `core/updateGameplayPre.js:513,520`) and processed by the same
// gameplay loop.
//
// DLC boss classes (`WindBosses`, `TimeBosses`, `ThunderBoss`) live in
// DLC modules the server loader doesn't import; deferred to phase 3.5
// per the same plan note as DLC enemies.

import { describe, it, expect } from 'vitest';
import {
    BOSS_TYPES, STUB_INPUT,
    createSmokeSession, tickN, spawnBossOfType,
} from './_testkit.js';

describe('boss smoke — spawn + phase 2 + die', () => {
    for (const type of BOSS_TYPES) {
        it(`boss[${type}] spawns, transitions, and dies without throwing`, () => {
            // MAKUTA scales off `wave` — keep guest hero static so the
            // session's default wave (1) doesn't pump damage values
            // into infinity for hp = 1500 * wave * mult.
            const ctx = createSmokeSession('fire');
            try {
                const boss = spawnBossOfType(ctx, type);
                expect(boss).toBeTruthy();
                expect(boss.type).toBe(type);
                expect(boss.phase).toBe(1);

                // Phase 1: idle telegraph / attack cycle.
                tickN(ctx, 60, STUB_INPUT);

                // Force phase 2 transition. Most bosses gate on
                // `hp <= maxHp * 0.5` (Boss.js:180). GREEN_GOBLIN and
                // MAKUTA handle their own phase machines — setting hp
                // is still safe, just bypasses the generic phase swap.
                boss.hp = boss.maxHp * 0.4;
                tickN(ctx, 60, STUB_INPUT);

                // Lethal damage → death FX path.
                boss.hp = -99999;
                tickN(ctx, 60, STUB_INPUT);
            } finally {
                ctx.teardown();
            }
        });
    }
});

describe('boss smoke — under sustained player fire', () => {
    for (const type of BOSS_TYPES) {
        it(`boss[${type}] absorbs sustained shoot input without throwing`, () => {
            const ctx = createSmokeSession('fire');
            try {
                spawnBossOfType(ctx, type);
                // Host fires continuously into the boss. Stresses the
                // damage-application path, telegraph-interrupt logic,
                // and (for GREEN_GOBLIN / MAKUTA) custom on-hit hooks.
                tickN(ctx, 90, { ...STUB_INPUT, shoot: true });
            } finally {
                ctx.teardown();
            }
        });
    }
});
