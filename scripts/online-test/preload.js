'use strict';
/* global window, localStorage */ // renderer preload: Node + DOM

// Preload for the online test windows (scripts/online-test/electron-main.cjs).
// Both windows share one Electron process, so the process-wide APP_SAVE_PATH
// that index.js sets can't tell them apart. Each window gets its own dir via
// `--ot-save-path=`; `Platform.js` reads `globalThis.process.env`, which is the
// object patched here (same context: contextIsolation is off).
const path = require('path');

const arg = process.argv.find(a => a.startsWith('--ot-save-path='));
if (arg) {
    const saveDir = arg.slice('--ot-save-path='.length);
    process.env.APP_SAVE_PATH = saveDir;
    process.env.APP_MAPS_PATH = path.join(saveDir, 'maps');
    window.__APP_MAPS_PATH__ = process.env.APP_MAPS_PATH;
}

// A test client killed mid-run leaves the run-active flag behind, and the next
// launch would block on the crash-recovery `confirm()`.
try { localStorage.removeItem('5FreundeRunActive'); } catch { /* storage unavailable */ }
