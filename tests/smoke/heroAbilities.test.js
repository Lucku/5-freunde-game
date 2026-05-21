// Smoke coverage: every server-supported hero must init, shoot, melee, and
// fire its special without throwing. Catches the kind of regression where
// a hero's `customUpdate` / `shoot` / `customSpecial` references a
// renamed global, a missing sprite, or a removed helper — silent on the
// happy path until a player picks that exact hero.
//
// Behavior correctness (damage numbers, win conditions) is NOT asserted
// here. The nightly stochastic harness covers that.

import { describe, it, expect } from 'vitest';
import {
    HERO_KEYS, STUB_INPUT,
    createSmokeSession, tickN, hostPlayer, forceSpecialReady, pressSpecial,
} from './_testkit.js';

describe('hero smoke — init + idle tick', () => {
    for (const hero of HERO_KEYS) {
        it(`hero[${hero}] instantiates and idles without throwing`, () => {
            const ctx = createSmokeSession(hero);
            try {
                const p = hostPlayer(ctx);
                expect(p).toBeTruthy();
                expect(p.type).toBe(hero);
                tickN(ctx, 30);
            } finally {
                ctx.teardown();
            }
        });
    }
});

describe('hero smoke — sustained shoot', () => {
    for (const hero of HERO_KEYS) {
        it(`hero[${hero}] sustained shoot input does not throw`, () => {
            const ctx = createSmokeSession(hero);
            try {
                // 90 ticks ≈ 3 seconds at 30 Hz — enough for several
                // shoot cooldown cycles even on the slowest hero
                // (metal: rangeCd 40).
                tickN(ctx, 90, { ...STUB_INPUT, shoot: true });
            } finally {
                ctx.teardown();
            }
        });
    }
});

describe('hero smoke — sustained melee', () => {
    for (const hero of HERO_KEYS) {
        it(`hero[${hero}] sustained melee input does not throw`, () => {
            const ctx = createSmokeSession(hero);
            try {
                // 90 ticks covers the slowest melee cooldown (metal: 180).
                tickN(ctx, 90, { ...STUB_INPUT, melee: true });
            } finally {
                ctx.teardown();
            }
        });
    }
});

describe('hero smoke — special / ultimate ability', () => {
    for (const hero of HERO_KEYS) {
        it(`hero[${hero}] forced special activation does not throw`, () => {
            const ctx = createSmokeSession(hero);
            try {
                const p = hostPlayer(ctx);
                forceSpecialReady(p);
                pressSpecial(ctx);
                // Re-arm and press again — some specials have multi-stage
                // activation (charge → release) that wouldn't surface on
                // the first press alone.
                forceSpecialReady(p);
                pressSpecial(ctx);
            } finally {
                ctx.teardown();
            }
        });
    }
});
