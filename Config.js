// Config.js - Handles local user settings

// Electron Detection (Duplicated from game.js to ensure early availability)
const isElectronConfig = typeof process !== 'undefined' && process.versions && process.versions.electron;
let fsConfig, pathConfig, configFilePath;

if (isElectronConfig) {
    try {
        fsConfig = require('fs');
        pathConfig = require('path');
        // Use the path we set in index.js
        if (process.env.APP_SAVE_PATH) {
            configFilePath = pathConfig.join(process.env.APP_SAVE_PATH, 'config.json');
            console.log("Config File Location:", configFilePath);
        }
    } catch (e) {
        console.warn("Electron detected but failed to load modules in Config.js:", e);
    }
}

const defaultConfig = {
    // Audio
    musicEnabled: true,
    musicVolume: 0.5,
    sfxEnabled: true,
    sfxVolume: 1.0,

    // Visuals
    damageNumbers: true,
    screenShake: true,
    particles: true,

    // Gameplay
    autoAim: false, // Accessibility?
    showFPS: false,

    // Intro
    showIntroScreens: true
};

var gameConfig = JSON.parse(JSON.stringify(defaultConfig));
if (typeof window !== 'undefined') window.gameConfig = gameConfig;

function loadConfig() {
    let raw = null;

    if (isElectronConfig && fsConfig && configFilePath) {
        try {
            if (fsConfig.existsSync(configFilePath)) {
                raw = fsConfig.readFileSync(configFilePath, 'utf8');
            }
        } catch (e) {
            console.error("Failed to load config file from disk:", e);
        }
    }

    // Fallback to localStorage if no file or not electron
    if (!raw) {
        raw = localStorage.getItem('5FreundeConfig');
    }

    if (raw) {
        try {
            const data = JSON.parse(raw);
            // Merge to ensure new keys exist
            gameConfig = { ...defaultConfig, ...data };
            console.log("Config loaded:", gameConfig);
        } catch (e) {
            console.error("Failed to parse config:", e);
            gameConfig = JSON.parse(JSON.stringify(defaultConfig));
        }
    } else {
        console.log("No config found, using defaults.");
    }
    applyConfig();
}

function saveConfig() {
    const json = JSON.stringify(gameConfig, null, 2);

    if (isElectronConfig && fsConfig && configFilePath) {
        try {
            // Ensure directory exists (should be handled by main process/game.js, but good safety)
            fsConfig.writeFileSync(configFilePath, json);
        } catch (e) {
            console.error("Failed to save config to disk:", e);
        }
    }

    // Always save to localStorage as backup/web version
    localStorage.setItem('5FreundeConfig', json);
    applyConfig();
}

function applyConfig() {
    // Apply Audio Settings Immediately
    if (typeof audioManager !== 'undefined') {
        audioManager.updateSettings();
    }

    // Apply any other global CSS/State changes here
    const fpsDisplay = document.getElementById('fps-display');
    if (fpsDisplay) {
        fpsDisplay.style.display = gameConfig.showFPS ? 'block' : 'none';
    }
}

// Initial Load
loadConfig();

// Helper to toggle boolean settings
function toggleSetting(key) {
    if (gameConfig.hasOwnProperty(key)) {
        gameConfig[key] = !gameConfig[key];
        saveConfig();
        return gameConfig[key];
    }
    return false;
}
window.toggleSetting = toggleSetting;
