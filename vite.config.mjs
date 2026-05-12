// Vite build for 5 Freunde Elemental Arena.
//
// This project is mid-migration: most files are still classic <script> tags
// in game.html that rely on global-scope class/function declarations. A small
// number of files have been ESM-converted (Utils.js, SpatialHash.js, etc.)
// and are loaded via <script type="module">.
//
// Vite handles:
//   - Dev server with hot reload on every save (full page reload by default).
//   - CSS HMR (main.css updates without reload).
//   - Bundling of ESM modules referenced from <script type="module">.
//   - Static asset passthrough (audio/, images/, dlc/, save-editor.html).
//
// What Vite does NOT do here:
//   - Bundle classic <script src> tags (still served as separate files).
//   - Touch DLCs — they ship as raw files loaded via DLCManager.loadScript().
//
// Future ESM migration sessions will convert more files to type="module" and
// fold them into the bundled graph. See tasks/todo.md.

import { defineConfig } from 'vite';
import electronRenderer from 'vite-plugin-electron-renderer';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import fs from 'node:fs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// Directories of static runtime assets we ship as-is. Vite treats them as
// public files in dev (served raw) and we mirror them into dist/ on build.
const STATIC_DIRS = ['audio', 'images', 'dlc'];

// Loose-script files referenced by game.html with `<script src="X.js">` rather
// than `<script type="module">`. Vite doesn't bundle these — we copy them to
// dist/ post-build so production load mirrors dev paths exactly.
//
// Keep this list authoritative against game.html. When a file gets ESM-
// converted (i.e. gains explicit imports/exports and is loaded via
// `<script type="module">`), remove it from here.
function collectClassicScripts() {
    const html = fs.readFileSync(path.resolve(__dirname, 'game.html'), 'utf8');
    const out = new Set();
    const re = /<script\s+([^>]*?)src=["']([^"']+)["']([^>]*?)>/g;
    let m;
    while ((m = re.exec(html)) !== null) {
        const attrs = (m[1] + ' ' + m[3]).toLowerCase();
        if (attrs.includes('type="module"')) continue; // bundled
        const src = m[2];
        if (src.startsWith('http')) continue;          // external CDN
        if (src.startsWith('dlc/')) continue;          // DLC handles itself
        if (!src.endsWith('.js')) continue;
        out.add(src.replace(/^\.?\/+/, ''));
    }
    return [...out];
}

// Filter the noisy "can't be bundled without type=module" warning that Vite
// emits for every classic <script src> tag during the ESM migration. Vite's
// HTML plugin runs this through `onwarn`; we suppress it there. Other
// warnings still print as normal.
const _CLASSIC_WARN_RE = /can't be bundled without type="module"/;

export default defineConfig({
    root: __dirname,
    publicDir: false, // we copy static dirs manually below
    server: {
        port: 5173,
        strictPort: true,
    },
    build: {
        outDir: 'dist',
        emptyOutDir: true,
        sourcemap: true,
        rollupOptions: {
            input: {
                main:        path.resolve(__dirname, 'game.html'),
                saveEditor:  path.resolve(__dirname, 'save-editor.html'),
            },
            onwarn(warning, defaultHandler) {
                if (warning && typeof warning.message === 'string'
                    && _CLASSIC_WARN_RE.test(warning.message)) return;
                defaultHandler(warning);
            },
        },
    },
    plugins: [
        // Lets `require('fs')`, `require('path')` etc. work inside renderer
        // code (Config.js, SaveManager.js, DLCManager.js, game.js).
        electronRenderer(),

        // Mirror classic-script .js files + raw asset dirs into dist/ so the
        // built game loads them at the same relative paths it does in dev.
        {
            name: '5freunde:copy-static-runtime-assets',
            apply: 'build',
            closeBundle() {
                // Static asset dirs (audio/images/dlc)
                for (const d of STATIC_DIRS) {
                    const src = path.resolve(__dirname, d);
                    const dst = path.resolve(__dirname, 'dist', d);
                    if (fs.existsSync(src)) {
                        fs.cpSync(src, dst, { recursive: true });
                    }
                }
                // Classic script files referenced by game.html
                const classic = collectClassicScripts();
                for (const rel of classic) {
                    const src = path.resolve(__dirname, rel);
                    const dst = path.resolve(__dirname, 'dist', rel);
                    if (!fs.existsSync(src)) {
                        console.warn(`[vite/5freunde] missing classic script: ${rel}`);
                        continue;
                    }
                    fs.mkdirSync(path.dirname(dst), { recursive: true });
                    fs.copyFileSync(src, dst);
                }
                // Save-editor's standalone scripts (none currently external)
                // CSS is bundled via Vite's HTML pipeline.

                // #165 — bundle CHANGELOG.md so the in-game "What's New" modal
                // can fetch it at runtime via fetch('CHANGELOG.md').
                {
                    const src = path.resolve(__dirname, 'CHANGELOG.md');
                    const dst = path.resolve(__dirname, 'dist', 'CHANGELOG.md');
                    if (fs.existsSync(src)) fs.copyFileSync(src, dst);
                }
            },
        },
    ],
});
