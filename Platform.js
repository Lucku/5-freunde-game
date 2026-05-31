// Platform.js — single source of truth for Electron / web runtime detection
// and Node-module access. Replaces duplicated `typeof process !==
// 'undefined' && process.versions && process.versions.electron` checks across
// `Config.js`, `game.js`, `Managers/SaveManager.js`, `Managers/CrashReporter.js`,
// `dlc/DLCManager.js`, etc.
//
// Renderer with `nodeIntegration: true` exposes a real Node `require` on the
// global scope. We resolve it through an indirect alias (`_electronRequire`)
// so Vite/rolldown does NOT pattern-match the literal `require('fs')` call
// at build time and replace the import with a non-functional CJS polyfill —
// which is what previously shipped an `fs` object whose `existsSync` /
// `writeFileSync` were `undefined`, crashing every save attempt in the
// packaged build.
//
// Browser-only callers stay safe: `Platform.isElectron === false` short-circuits
// any path that would touch Node APIs.

const isElectron = typeof process !== 'undefined'
    && !!process.versions
    && !!process.versions.electron;

// Indirect handle to the renderer's real `require`. Two layers of indirection
// (variable + globalThis lookup) so the bundler can't see a literal
// `require('fs')` and rewrite it to a stub.
const _electronRequire = (typeof globalThis !== 'undefined' && typeof globalThis.require === 'function')
    ? globalThis.require
    : null;

let fs = null;
let path = null;
let appSavePath = null;
let saveFilePath = null;
let configFilePath = null;

if (isElectron && _electronRequire) {
    try {
        fs   = _electronRequire('fs');
        path = _electronRequire('path');
        if (process.env.APP_SAVE_PATH) {
            appSavePath    = process.env.APP_SAVE_PATH;
            saveFilePath   = path.join(appSavePath, 'save_data.json');
            configFilePath = path.join(appSavePath, 'config.json');
        }
    } catch (e) {
        console.warn('Platform: Electron detected but failed to load native modules:', e);
    }
}

export const Platform = {
    isElectron,
    fs,
    path,
    appSavePath,
    saveFilePath,
    configFilePath,
};

if (typeof window !== 'undefined') {
    window.Platform = Platform;
}

export default Platform;
