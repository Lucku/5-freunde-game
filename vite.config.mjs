// Vite build for 5 Freunde Elemental Arena.
//
// #171 — ESM migration completion (Phase 1). All renderer modules now live in
// the dependency graph rooted at main.js, which game.html loads via a single
// `<script type="module" src="main.js">`. Vite bundles the whole graph into
// one chunk, tree-shaking unused exports.
//
// What Vite does:
//   - Bundle main.js + every transitive import into dist/assets/main-<hash>.js.
//   - CSS HMR (main.css updates without reload).
//   - Dev server with full-page reload on every save.
//   - Static asset passthrough (audio/, images/, dlc/, CHANGELOG.md).
//
// What Vite does NOT do:
//   - Touch DLCs — they still ship as raw files loaded at runtime via
//     DLCManager.loadScript(). Phase 2 will migrate DLCs to dynamic
//     `import()` so they join the bundler graph as separate chunks.
//
// Phase 2 (next): remove the per-file `window.X = X` shims now that every
// renderer file is in the bundle graph; the shims only remain to keep DLC
// classic-script loads working.

import { defineConfig } from 'vite';
import electronRenderer from 'vite-plugin-electron-renderer';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import fs from 'node:fs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// Directories of static runtime assets we ship as-is. Vite treats them as
// public files in dev (served raw) and we mirror them into dist/ on build.
// #194 — `dlc/` removed: DLC files are now bundled into separate chunks via
// the `import.meta.glob('./*/*.js')` manifest in dlc/DLCManager.js. Mirroring
// the raw files into dist/ would duplicate them at stale paths.
const STATIC_DIRS = ['audio', 'images'];

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
        },
    },
    plugins: [
        // Lets `require('fs')`, `require('path')` etc. work inside renderer
        // code (Config.js, SaveManager.js, DLCManager.js, game.js).
        electronRenderer(),

        // Mirror raw asset dirs into dist/ so the built game loads them at the
        // same relative paths it does in dev.
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
