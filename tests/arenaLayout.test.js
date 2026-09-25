// N11 — online arena layout contract. The online host serializes the arena it
// generated (Arena.serializeLayout), the server validates + rebuilds it
// (GameSession.setArenaLayout), and the guest cross-checks by hash. For every
// biome the smoke testkit can load, across all 8 base layouts and the trap
// tiers, this pins down that:
//   1. a real generated arena is never rejected by the server's validation
//      (a rejection would silently leave that match without walls), and the
//      server rebuilds it with identical geometry and hash;
//   2. two generations under the same seeded Math.random (host vs guest) hash
//      identically — the premise of the guest's cross-check.

import { describe, it, expect } from 'vitest';
import { createSmokeSession, loadBiomes } from './smoke/_testkit.js';

const ROSTER = loadBiomes();
const BASE_BIOMES = ['fire', 'water', 'ice', 'plant', 'metal', 'black'];
const BIOME_IDS = [...new Set([...BASE_BIOMES, ...ROSTER.map(r => r.id)])];
const LAYOUTS = [0, 1, 2, 3, 4, 5, 6, 7];
const WAVES = [1, 3, 20]; // no traps / first traps / every trap type

// Same seeded wrap game.js uses for online generation (resumeWaveGeneration).
function withSeededRandom(seed, fn) {
    const saved = Math.random;
    let s = seed >>> 0;
    Math.random = () => {
        s = (s + 0x6D2B79F5) | 0;
        let t = Math.imul(s ^ (s >>> 15), 1 | s);
        t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
        return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
    try { return fn(); } finally { Math.random = saved; }
}

function generate(biome, layout, wave, seed) {
    const Arena = globalThis.Arena;
    globalThis.wave = wave;
    return withSeededRandom(seed, () => {
        const a = new Arena(3000, 3000);
        a.generate(biome, layout);
        return a;
    });
}

describe('online arena layout — serialize → validate → rebuild', () => {
    it('covers base + DLC biomes', () => {
        expect(BIOME_IDS.length).toBeGreaterThan(BASE_BIOMES.length);
    });

    for (const biome of BIOME_IDS) {
        it(`biome[${biome}] layouts survive the server round-trip and hash deterministically`, () => {
            const ctx = createSmokeSession('fire');
            try {
                const Arena = globalThis.Arena;
                let totalObstacles = 0, totalTraps = 0;
                for (const layoutIdx of LAYOUTS) {
                    for (const wave of WAVES) {
                        const seed = (wave * 2654435761) ^ (layoutIdx * 1664525) ^ biome.length;
                        const host = generate(biome, layoutIdx, wave, seed);
                        const sent = host.serializeLayout();
                        const where = `${biome} layout ${layoutIdx} wave ${wave}`;
                        totalObstacles += sent.obstacles.length;
                        totalTraps += sent.traps.length;

                        const ok = ctx.session.setArenaLayout(sent, wave);
                        expect(ok, `server rejected ${where}`).toBe(true);
                        const srv = ctx.session._world.arena;
                        expect(srv.obstacles.length, where).toBe(host.obstacles.length);
                        expect(srv.biomeZones.length, where).toBe(host.biomeZones.length);
                        expect(srv.traps.length, where).toBe(host.traps.length);
                        expect(ctx.session.arenaLayoutHash, where).toBe(Arena.layoutHash(sent));
                        expect(Arena.layoutHash(srv.serializeLayout()), where).toBe(Arena.layoutHash(sent));

                        const guest = generate(biome, layoutIdx, wave, seed);
                        expect(Arena.layoutHash(guest.serializeLayout()), `guest ≠ host for ${where}`)
                            .toBe(Arena.layoutHash(sent));
                    }
                }
                // Sanity: generation really ran (DLC hooks included) — every
                // biome places walls somewhere across the 8 layouts, and traps
                // unless it opts out via `noTraps`.
                expect(totalObstacles, `${biome} generated no obstacles at all`).toBeGreaterThan(0);
                const noTraps = !!globalThis.BIOME_LOGIC?.[biome]?.noTraps;
                if (!noTraps) expect(totalTraps, `${biome} generated no traps at wave 20`).toBeGreaterThan(0);
            } finally {
                ctx.teardown();
            }
        });
    }
});
