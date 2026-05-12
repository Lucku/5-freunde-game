// Platform.js — single source of truth for Electron / web runtime detection
// and Node-module access (#9). Replaces duplicated `typeof process !==
// 'undefined' && process.versions && process.versions.electron` checks across
// `Config.js`, `game.js`, `Managers/SaveManager.js`, `Managers/CrashReporter.js`,
// `dlc/DLCManager.js`, etc.
//
// Renderer with `nodeIntegration: true` can `require('fs')` and `require('path')`
// directly. We capture both up-front so callers do `Platform.fs.writeFileSync`
// instead of repeating the try/catch every time.
//
// Browser-only callers stay safe: `Platform.isElectron === false` short-circuits
// any path that would touch Node APIs.

const isElectron = typeof process !== 'undefined'
    && !!process.versions
    && !!process.versions.electron;

let fs = null;
let path = null;
let appSavePath = null;
let saveFilePath = null;
let configFilePath = null;

if (isElectron) {
    try {
        fs   = require('fs');
        path = require('path');
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
