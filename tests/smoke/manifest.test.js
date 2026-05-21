// Smoke coverage: static manifest lint. No runtime — pure FS scan.
//
// Catches the kind of regression where a hero / asset / DLC pack
// rename leaves a dangling reference in the codebase that the
// runtime smoke tests can't reach (e.g. an `audio/foo.wav` path
// that only loads on a specific wave trigger, or a DLC hero key
// that exists in `BASE_HERO_STATS` but whose implementation file
// got renamed without updating callers).
//
// What it checks:
//   1. Every DLC hero key registered via `BASE_HERO_STATS['key']`
//      has a matching `KeyHero.js` file under its DLC pack.
//   2. Every `new Audio('PATH')` literal points to a real file
//      on disk (skipping dynamic-path callsites whose argument
//      isn't a string literal).
//   3. Every `.src = 'PATH'` literal where PATH looks like a
//      relative asset (`audio/`, `images/`, or `dlc/`) points to
//      a real file on disk.
//   4. Server vs browser `BASE_HERO_STATS` drift — report the
//      diff (the 6 disciples_of_deception + radiance_of_ruin DLC
//      heroes that the server constants table doesn't enumerate)
//      as a documented finding, not a test failure.

import { describe, it, expect } from 'vitest';
import { readFileSync, existsSync, readdirSync, statSync } from 'node:fs';
import { join, dirname, relative } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, '..', '..');

// ─── Helpers ──────────────────────────────────────────────────────────────────

function pascalize(key) {
    // 'green_goblin' → 'GreenGoblin', 'spirit' → 'Spirit'.
    return key.split('_').map(s => s.charAt(0).toUpperCase() + s.slice(1)).join('');
}

function* walkJs(dir, skip = ['node_modules', 'dist', 'out', '.git', 'tests']) {
    for (const entry of readdirSync(dir)) {
        if (skip.includes(entry)) continue;
        const full = join(dir, entry);
        const st = statSync(full);
        if (st.isDirectory()) {
            yield* walkJs(full, skip);
        } else if (entry.endsWith('.js') || entry.endsWith('.mjs')) {
            yield full;
        }
    }
}

function readAll(file) {
    try { return readFileSync(file, 'utf8'); }
    catch { return ''; }
}

// Extract `new Audio('PATH')` and `new Audio("PATH")` literals from a source
// string. Returns `{ path, lineNo }[]`. Skips `new Audio()` with no arg or
// non-string arg (template literals, variables) — those are dynamic and
// belong to a runtime audit, not a static manifest lint.
function extractAudioLiterals(src) {
    const out = [];
    const lines = src.split('\n');
    const re = /new\s+Audio\s*\(\s*['"]([^'"]+)['"]\s*\)/g;
    for (let i = 0; i < lines.length; i++) {
        let m;
        while ((m = re.exec(lines[i])) !== null) {
            out.push({ path: m[1], lineNo: i + 1 });
        }
    }
    return out;
}

// Extract `.src = 'PATH'` / `.src = "PATH"` assignments. Filters to paths
// that look like relative asset references (don't start with `data:`,
// `http`, `blob:`, `/`, or contain `${` / `+` interpolation).
function extractSrcLiterals(src) {
    const out = [];
    const lines = src.split('\n');
    const re = /\.src\s*=\s*['"]([^'"]+)['"]/g;
    for (let i = 0; i < lines.length; i++) {
        let m;
        while ((m = re.exec(lines[i])) !== null) {
            const p = m[1];
            if (p.startsWith('data:') || p.startsWith('http') ||
                p.startsWith('blob:') || p.startsWith('/')) continue;
            if (p.includes('${') || p.includes('+')) continue;
            out.push({ path: p, lineNo: i + 1 });
        }
    }
    return out;
}

// Collected once at module load — single FS walk, all later tests reuse.
const ALL_JS_FILES = [...walkJs(ROOT)];

const AUDIO_REFS = [];
const SRC_REFS = [];
for (const file of ALL_JS_FILES) {
    const src = readAll(file);
    for (const { path: p, lineNo } of extractAudioLiterals(src)) {
        AUDIO_REFS.push({ file, lineNo, path: p });
    }
    for (const { path: p, lineNo } of extractSrcLiterals(src)) {
        SRC_REFS.push({ file, lineNo, path: p });
    }
}

// Dedupe by path — one test per unique asset.
const UNIQUE_AUDIO = [...new Set(AUDIO_REFS.map(r => r.path))].sort();
const UNIQUE_SRC   = [...new Set(SRC_REFS.map(r => r.path))].sort();

// ─── 1. Hero key → implementation file mapping ────────────────────────────────

const HERO_KEY_PATTERN = /BASE_HERO_STATS\[['"]([a-z_]+)['"]\]\s*=/g;
const DLC_HERO_KEYS = new Map(); // key → DLC pack relative path

for (const file of ALL_JS_FILES) {
    if (!file.includes('/dlc/')) continue;
    const src = readAll(file);
    let m;
    while ((m = HERO_KEY_PATTERN.exec(src)) !== null) {
        const key = m[1];
        if (!DLC_HERO_KEYS.has(key)) {
            // Pack folder is the immediate child of `dlc/`.
            const rel = relative(ROOT, file);
            const pack = rel.split('/')[1]; // 'dlc/PACK/...'
            DLC_HERO_KEYS.set(key, pack);
        }
    }
}

describe('manifest — every DLC hero key has an implementation file', () => {
    for (const [key, pack] of DLC_HERO_KEYS) {
        it(`hero[${key}] → dlc/${pack}/${pascalize(key)}Hero.js exists`, () => {
            const expected = join(ROOT, 'dlc', pack, `${pascalize(key)}Hero.js`);
            expect(existsSync(expected), `Missing: dlc/${pack}/${pascalize(key)}Hero.js`).toBe(true);
        });
    }
});

// ─── 2. Audio literal existence ───────────────────────────────────────────────

describe('manifest — every `new Audio(PATH)` literal points to a real file', () => {
    it('roster non-empty', () => {
        expect(UNIQUE_AUDIO.length).toBeGreaterThan(0);
    });

    for (const audioPath of UNIQUE_AUDIO) {
        it(`audio[${audioPath}] exists on disk`, () => {
            // Most `new Audio()` paths are project-root relative.
            const full = join(ROOT, audioPath);
            expect(existsSync(full), `Missing audio file: ${audioPath}`).toBe(true);
        });
    }
});

// ─── 3. .src = '...' image existence ──────────────────────────────────────────

describe('manifest — every relative `.src = PATH` literal points to a real file', () => {
    for (const srcPath of UNIQUE_SRC) {
        it(`src[${srcPath}] exists on disk`, () => {
            const full = join(ROOT, srcPath);
            expect(existsSync(full), `Missing image file: ${srcPath}`).toBe(true);
        });
    }
});

// ─── 4. Server vs browser hero table drift ────────────────────────────────────

describe('manifest — server vs browser BASE_HERO_STATS drift', () => {
    // Read both tables from source so the test never depends on runtime
    // module load order.
    const browserSrc = readAll(join(ROOT, 'Constants.js'));
    const serverSrc  = readAll(join(ROOT, 'server', 'simulation', 'constants.js'));

    function keysFromObjectLiteral(src, varName) {
        // Find `const VARNAME = { ... }` and pull keys.
        const re = new RegExp(`const\\s+${varName}\\s*=\\s*\\{([\\s\\S]*?)\\n\\}`, 'm');
        const m = re.exec(src);
        if (!m) return new Set();
        const body = m[1];
        return new Set([...body.matchAll(/^\s*([a-z_][a-z0-9_]*)\s*:/gm)].map(x => x[1]));
    }

    // Browser keys: `const BASE_HERO_STATS = { ... }` in Constants.js (8 keys
    // including evil mode). DLC heroes self-register via DLC files at runtime
    // — we collect those by grepping for `BASE_HERO_STATS['key'] = {`.
    const browserKeysBase = keysFromObjectLiteral(browserSrc, 'BASE_HERO_STATS');
    const browserKeysDlc  = new Set(DLC_HERO_KEYS.keys());
    const browserKeys     = new Set([...browserKeysBase, ...browserKeysDlc]);

    // Server keys: `const _dlcHeroStats = { ... }` + browser-imported base.
    const serverDlcKeys = keysFromObjectLiteral(serverSrc, '_dlcHeroStats');
    const serverKeys    = new Set([...browserKeysBase, ...serverDlcKeys]);

    it('every server-enumerated hero exists in the browser', () => {
        const orphans = [...serverKeys].filter(k => !browserKeys.has(k));
        expect(orphans, `Server has heroes not in browser: ${orphans.join(', ')}`).toEqual([]);
    });

    it('reports browser-only heroes (server does not enumerate)', () => {
        const browserOnly = [...browserKeys].filter(k => !serverKeys.has(k));
        // This is documentation, not a hard failure — the missing entries
        // are real and intentional until the server table catches up. Snapshot
        // the current set so a NEW orphan triggers a review.
        const expected = new Set(['smoke', 'psycho', 'mirror', 'thorn', 'dream', 'light']);
        const unexpected = browserOnly.filter(k => !expected.has(k));
        const missing    = [...expected].filter(k => !browserOnly.includes(k));
        expect(
            { unexpected, missing },
            `Browser-only hero set drifted from the documented baseline. ` +
            `Either update server/simulation/constants.js _dlcHeroStats or update the baseline.`,
        ).toEqual({ unexpected: [], missing: [] });
    });
});
