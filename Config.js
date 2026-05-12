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
    voiceVolume: 1.0,
    uiVolume:    1.0,

    // Visuals
    damageNumbers: true,
    screenShake: true,
    controllerVibration: true,
    particles: true,

    // Gameplay
    autoAim: false, // Accessibility?
    showFPS: false,

    // Intro
    showIntroScreens: true,

    // Accessibility
    subtitlesEnabled: false,
    reducedMotion:    false, // disables screen shake, hit flashes, weather overlays
    colorblindMode:   'off', // 'off' | 'deuteranopia' | 'protanopia' | 'tritanopia'
    highContrast:     false, // forces high-contrast palette on UI
    fontScale:        1.0,   // 0.8 | 1.0 | 1.25 | 1.5 — HUD + damage-number font scaling
    screenReaderHints: false, // ARIA live announcements on UI state changes
    holdToFireToggle: false, // when true, mouse click toggles auto-fire (#132)
    aimAssist:        0,     // 0..1 — strength of aim snap toward nearest enemy (#133)
    oneHandedScheme:  'off', // 'off' | 'leftHand' | 'rightHand' (#138)
    pauseOnFocusLoss: true,  // pause when window loses focus (#139)
    pauseOnGamepadDisconnect: true, // pause when an in-use gamepad disconnects (#139)
    keyBindings: {           // #131 remappable keys (lowercase event.key)
        moveUp:    ['w', 'arrowup'],
        moveDown:  ['s', 'arrowdown'],
        moveLeft:  ['a', 'arrowleft'],
        moveRight: ['d', 'arrowright'],
        shoot:     [' ', 'enter'],
        melee:     ['shift'],
        dash:      ['control'],
        special:   ['q'],
        pause:     ['escape', 'p']
    },

    // Telemetry — opt-in crash reports to the configured server. No PII.
    crashReportsEnabled: true,

    // Last APP_VERSION the user has seen the "What's New" modal for (#165).
    lastSeenVersion: null,

    // Dismissed info dialogues (array of dialogue IDs)
    dismissedDialogues: [],

    // Server URL — shared by cloud saves and online multiplayer
    serverUrl: 'http://localhost:3001',

    // Account credentials — shared by cloud saves and online multiplayer
    account: {
        token: null,
        username: null
    },

    // Cloud save sync toggle (boolean, shown in options); defaults to on when logged in
    cloudSaveEnabled: true,

    // Cloud save sync metadata only (no auth state here)
    cloudSave: {
        lastSyncAt: 0,
        lastSyncHash: null
    }
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
            // Deep-merge nested objects so new keys from defaultConfig always exist.
            // Use Object.assign to mutate the existing gameConfig object in place —
            // reassigning would leave window.gameConfig pointing to the old object.
            Object.assign(gameConfig, defaultConfig, data, {
                account:     { ...defaultConfig.account,     ...(data.account     || {}) },
                cloudSave:   { ...defaultConfig.cloudSave,   ...(data.cloudSave   || {}) },
                keyBindings: { ...defaultConfig.keyBindings, ...(data.keyBindings || {}) }
            });
            console.log("Config loaded:", gameConfig);
        } catch (e) {
            console.error("Failed to parse config:", e);
            Object.assign(gameConfig, JSON.parse(JSON.stringify(defaultConfig)));
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

    // Colorblind correction — SVG color-matrix filter on the canvas element.
    // Mode values: 'off' | 'deuteranopia' | 'protanopia' | 'tritanopia'.
    const cb = (gameConfig.colorblindMode || 'off');
    const canvasEl = document.getElementById('gameCanvas');
    if (canvasEl) {
        canvasEl.style.filter = (cb === 'off') ? '' : `url(#cb-${cb})`;
    }

    // High-contrast mode — toggles body class consumed by main.css overrides.
    if (typeof document !== 'undefined' && document.body) {
        document.body.classList.toggle('high-contrast', !!gameConfig.highContrast);
    }

    // Font scaling — exposes --ui-font-scale CSS variable for HUD + UI.
    if (typeof document !== 'undefined' && document.documentElement) {
        const scale = Number(gameConfig.fontScale) || 1.0;
        document.documentElement.style.setProperty('--ui-font-scale', String(scale));
    }
}

// One-handed control presets (#138). Selected preset is applied as the active
// keyBindings; the user can still customise on top via the remap UI.
const ONE_HANDED_PRESETS = {
    off: null, // use defaultConfig.keyBindings
    leftHand: {
        moveUp:    ['w', 'arrowup'],
        moveDown:  ['s', 'arrowdown'],
        moveLeft:  ['a', 'arrowleft'],
        moveRight: ['d', 'arrowright'],
        shoot:     [' '],
        melee:     ['shift'],
        dash:      ['control'],
        special:   ['q'],
        pause:     ['escape']
    },
    rightHand: {
        moveUp:    ['arrowup', 'i'],
        moveDown:  ['arrowdown', 'k'],
        moveLeft:  ['arrowleft', 'j'],
        moveRight: ['arrowright', 'l'],
        shoot:     ['enter'],
        melee:     ['/', 'm'],
        dash:      ['.', ','],
        special:   ['p'],
        pause:     ['escape']
    }
};

function applyOneHandedScheme(scheme) {
    const preset = ONE_HANDED_PRESETS[scheme];
    if (!preset) {
        gameConfig.keyBindings = JSON.parse(JSON.stringify(defaultConfig.keyBindings));
    } else {
        gameConfig.keyBindings = JSON.parse(JSON.stringify(preset));
    }
    gameConfig.oneHandedScheme = scheme;
    saveConfig();
}
if (typeof window !== 'undefined') window.applyOneHandedScheme = applyOneHandedScheme;

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

// ESM exports — classic-script callers still resolve via window/global lookup.
export { defaultConfig, gameConfig, loadConfig, saveConfig, applyConfig, toggleSetting };
if (typeof window !== 'undefined') {
    window.loadConfig  = loadConfig;
    window.saveConfig  = saveConfig;
    window.applyConfig = applyConfig;
}
