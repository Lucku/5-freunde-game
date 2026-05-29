// #8 — DLC declarative manifest + auto-loader tests.
//
// Two layers:
//   1. Loader unit test — drives the real `DLCManager._activateDLC` with fake
//      manifest + legacy DLC objects, asserting orchestration order + fallback.
//   2. Static contract test — reads every `dlc/*/index.js` and validates the
//      manifest shape against the file itself (every declared `inject<Name>`
//      hook is defined; every `scripts` entry exists on disk). This catches
//      a typo'd hook name or missing file in any DLC without executing the
//      browser-only module graph.
import { describe, it, expect, beforeAll } from 'vitest';
import { readFileSync, existsSync, readdirSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, '..');
const DLC_DIR = join(ROOT, 'dlc');

// ───────────────────────── Loader unit test ─────────────────────────

describe('DLCManager._activateDLC (manifest auto-loader)', () => {
    let DLCManager;

    beforeAll(async () => {
        // DLCManager.js assigns window.dlcManager / window.DLC_REGISTRY at module
        // top, so a window stub must exist before the dynamic import.
        globalThis.window = globalThis.window || {};
        const mod = await import('../dlc/DLCManager.js');
        DLCManager = mod.DLCManager;
    });

    function makeManager() {
        const mgr = new DLCManager();
        const loaded = [];
        // Override the real glob-based loader so the test never fetches modules.
        mgr.loadScript = async (src) => { loaded.push(src); };
        mgr._loadedScripts = loaded;
        return mgr;
    }

    it('manifest path: loads scripts (dir-prefixed, in order) then inject hooks in order', async () => {
        const mgr = makeManager();
        const calls = [];
        const dlc = {
            scripts: ['HeroA.js', 'HeroB.js', 'Biome.js'],
            inject: ['Hero', 'Biome', 'Audio'],
            injectHero() { calls.push('Hero'); },
            injectBiome() { calls.push('Biome'); },
            injectAudio() { calls.push('Audio'); },
        };
        await mgr._activateDLC('my_dlc', dlc);

        expect(mgr._loadedScripts).toEqual([
            'dlc/my_dlc/HeroA.js',
            'dlc/my_dlc/HeroB.js',
            'dlc/my_dlc/Biome.js',
        ]);
        expect(calls).toEqual(['Hero', 'Biome', 'Audio']);
    });

    it('manifest path: missing inject hook warns but does not throw, others still run', async () => {
        const mgr = makeManager();
        const calls = [];
        const dlc = {
            scripts: [],
            inject: ['Hero', 'Ghost', 'Cards'],
            injectHero() { calls.push('Hero'); },
            injectCards() { calls.push('Cards'); },
        };
        await expect(mgr._activateDLC('x', dlc)).resolves.toBeUndefined();
        expect(calls).toEqual(['Hero', 'Cards']);
    });

    it('legacy path: object with no scripts falls back to load()', async () => {
        const mgr = makeManager();
        let loadCalled = false;
        const dlc = { load: async () => { loadCalled = true; } };
        await mgr._activateDLC('legacy', dlc);
        expect(loadCalled).toBe(true);
        expect(mgr._loadedScripts).toEqual([]); // load() owns its own scripts
    });

    it('inject hooks are invoked with the DLC object as `this`', async () => {
        const mgr = makeManager();
        let seenThis = null;
        const dlc = {
            scripts: [],
            inject: ['Hero'],
            marker: 42,
            injectHero() { seenThis = this.marker; },
        };
        await mgr._activateDLC('t', dlc);
        expect(seenThis).toBe(42);
    });
});

// ─────────────────────── Static manifest contract ───────────────────────

// Map dlc dir → registered id. Most match the dir name; symphony uses a
// DLC_ID const but registers under its dir name too.
const DLC_DIRS = readdirSync(DLC_DIR, { withFileTypes: true })
    .filter(d => d.isDirectory() && existsSync(join(DLC_DIR, d.name, 'index.js')))
    .map(d => d.name);

// DLCs intentionally kept on the legacy load() escape hatch (non-uniform
// bring-up). Documented in DLCManager._activateDLC.
const LEGACY_DLCS = new Set(['symphony_of_sickness']);

function extractArrayLiteral(src, key) {
    const start = src.indexOf(`${key}:`);
    if (start < 0) return null;
    const open = src.indexOf('[', start);
    const close = src.indexOf(']', open);
    if (open < 0 || close < 0) return null;
    const body = src.slice(open + 1, close);
    return body
        .split(',')
        .map(s => s.trim().replace(/^['"]|['"]$/g, ''))
        .filter(Boolean);
}

describe('DLC manifest contract (static)', () => {
    for (const id of DLC_DIRS) {
        const file = join(DLC_DIR, id, 'index.js');
        const src = readFileSync(file, 'utf8');

        if (LEGACY_DLCS.has(id)) {
            it(`${id}: legacy DLC still exposes a load()`, () => {
                expect(/load\s*:\s*(async\s*)?function/.test(src) || /load\s*:\s*async/.test(src)).toBe(true);
            });
            continue;
        }

        describe(id, () => {
            const scripts = extractArrayLiteral(src, 'scripts');
            const inject = extractArrayLiteral(src, 'inject');

            it('declares a scripts array and an inject array', () => {
                expect(Array.isArray(scripts)).toBe(true);
                expect(scripts.length).toBeGreaterThan(0);
                expect(Array.isArray(inject)).toBe(true);
                expect(inject.length).toBeGreaterThan(0);
            });

            it('no longer defines a load() (converted to manifest)', () => {
                expect(/\bload\s*:\s*(async\s*)?function/.test(src)).toBe(false);
            });

            it('every scripts entry is a bare filename that exists on disk', () => {
                for (const s of scripts) {
                    expect(s.includes('/'), `${s} should be a bare filename, not a path`).toBe(false);
                    expect(existsSync(join(DLC_DIR, id, s)), `${id}/${s} missing on disk`).toBe(true);
                }
            });

            it('every inject hook resolves to an inject<Name> method in the file', () => {
                for (const name of inject) {
                    const re = new RegExp(`inject${name}\\s*:\\s*function|inject${name}\\s*\\(`);
                    expect(re.test(src), `${id}: declared inject hook 'inject${name}' has no method`).toBe(true);
                }
            });
        });
    }
});
