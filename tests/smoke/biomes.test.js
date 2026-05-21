// Smoke coverage: every registered biome must `generate()`, accept
// `update()` ticks, and survive `draw()` / `drawBackground()` calls
// against a stub canvas context. Catches the kind of regression where
// a biome references a renamed global, divides by an uninitialized
// camera dimension, or pushes to an array `generate()` forgot to seed.
//
// Spawn path: biomes self-register via `window.BiomeRegistry.register`
// (Biomes.js base 6) or `window.BIOME_LOGIC[id] = new BiomeClass()`
// (every DLC biome). The testkit's `loadBiomes()` requires each
// biome module so the registrations fire, then `getBiomeRoster()`
// dedupes by class instance so aliased keys (`cloud` / `lightning`,
// `time` / `eternity`, `sound` / `SOUND_PLAINS`, …) don't run the
// same biome's tests twice.
//
// Coverage gap: biomes that only register via their pack's
// `index.js` bootstrap (waker_of_winds, echos_of_eternity,
// rise_of_the_rock) are deferred to phase 4.5 — they need extra
// scaffolding to run the bootstrap without breaking on browser-only
// deps.

import { describe, it, expect } from 'vitest';
import {
    createSmokeSession, loadBiomes, biomeWorldArgs,
} from './_testkit.js';

const ROSTER = loadBiomes();

describe('biome smoke — registered biomes have a usable shape', () => {
    it('roster is non-empty', () => {
        expect(ROSTER.length).toBeGreaterThan(0);
    });

    for (const { id, biome } of ROSTER) {
        it(`biome[${id}] has required generate() method`, () => {
            expect(typeof biome.generate).toBe('function');
        });
    }
});

describe('biome smoke — generate + update + draw cycle', () => {
    for (const { id, biome } of ROSTER) {
        it(`biome[${id}] generates, ticks, and draws without throwing`, () => {
            const ctx = createSmokeSession('fire');
            try {
                const { arena, player } = biomeWorldArgs(ctx);
                const drawCtx = globalThis.ctx; // loader's no-op canvas proxy

                // generate(arena): canonical contract per
                // `Arena.js:119` (`biome.generate(this)`). Base biomes
                // ignore the arg; DLC biomes read `arena.width` /
                // `arena.height` to place static decorations.
                biome.generate(arena);

                // update(arena, player, enemies): canonical signature
                // is `(arena, player)` for most biomes, but a handful
                // (CloudBiome `static update(arena, player, enemies)`,
                // PoisonBiome `update(arena, player, enemies)`) read
                // enemies as a third arg. Other biomes ignore it. 30
                // ticks is enough to cycle internal phase counters
                // and particle TTLs.
                const enemyArg = ctx.session.enemies ?? [];
                if (typeof biome.update === 'function') {
                    for (let i = 0; i < 30; i++) {
                        biome.update(arena, player, enemyArg);
                    }
                }

                // drawBackground(ctx, arena): renders the parallax /
                // terrain layer beneath gameplay.
                if (typeof biome.drawBackground === 'function') {
                    biome.drawBackground(drawCtx, arena);
                }

                // draw(ctx, arena): foreground overlay (vignettes,
                // weather, particle systems).
                if (typeof biome.draw === 'function') {
                    biome.draw(drawCtx, arena);
                }

                // drawObstacle: per-obstacle hook — call once with a
                // minimal obstacle stub to exercise the optional path.
                if (typeof biome.drawObstacle === 'function') {
                    biome.drawObstacle(drawCtx, { x: 100, y: 100, width: 40, height: 40 });
                }
            } finally {
                ctx.teardown();
            }
        });
    }
});
