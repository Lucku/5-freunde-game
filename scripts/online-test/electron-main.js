'use strict';

// Electron main for the online test launcher. Started by scripts/online-test/run.js,
// which passes everything in ONLINE_TEST_CONFIG (see run.js for the shape).
//
// Opens one window per slot, tiled side by side, each with its own save dir,
// config.json and storage partition, and injects driver.js to walk the real
// lobby into a match. Mirrors only what index.js provides that the game needs
// (save/maps paths, update-status IPC, open-url) — index.js itself forces a
// single fullscreen window.

const { app, BrowserWindow, ipcMain, screen, shell } = require('electron');
const fs = require('fs');
const path = require('path');

const cfg = JSON.parse(process.env.ONLINE_TEST_CONFIG || 'null');
if (!cfg) {
    console.error('Start this through `npm run online:test`.');
    process.exit(1);
}

const DRIVER_SRC = fs.readFileSync(path.join(__dirname, 'driver.js'), 'utf8');
const windows = {}; // slot id → BrowserWindow
let lobbyCode = null;

app.setPath('userData', path.join(cfg.workDir, 'electron'));

// Online is blocked when a newer release exists; a test build must never be.
ipcMain.handle('get-update-status', () => ({ available: false, version: null, url: null }));
ipcMain.on('open-url', (_e, url) => shell.openExternal(url));

function writeSlotConfig(slot, saveDir) {
    fs.mkdirSync(path.join(saveDir, 'maps'), { recursive: true });
    const file = path.join(saveDir, 'config.json');
    let existing = {};
    try { existing = JSON.parse(fs.readFileSync(file, 'utf8')); } catch { /* first run */ }
    const config = {
        ...existing, // keep settings changed in-game between runs
        serverUrl: cfg.serverUrl,
        account: { token: slot.token, username: slot.username },
        cloudSaveEnabled: false,       // test accounts must not sync saves
        showIntroScreens: false,
        telemetryConsentSeen: true,
        lastSeenVersion: cfg.appVersion, // no What's New modal
        pauseOnFocusLoss: false,       // clicking one window must not pause the other
    };
    fs.writeFileSync(file, JSON.stringify(config, null, 2));
}

function relayCode(slotId) {
    const win = windows[slotId];
    if (lobbyCode && win && !win.isDestroyed()) {
        win.webContents.executeJavaScript(`window.__OT_code = ${JSON.stringify(lobbyCode)};`).catch(() => {});
    }
}

function onDriverLine(slot, text) {
    process.stdout.write(`[${slot.id}] ${text.replace(/^\[OT\] /, '')}\n`);
    const m = /^\[OT\] CODE ([A-Z0-9]+)/.exec(text);
    if (m) {
        lobbyCode = m[1];
        relayCode('guest'); // run.js reads the same line for the solo bot
    }
}

function createWindow(slot, bounds) {
    const saveDir = path.join(cfg.workDir, slot.id);
    writeSlotConfig(slot, saveDir);

    const win = new BrowserWindow({
        ...bounds,
        show: !cfg.hidden,
        title: slot.title,
        autoHideMenuBar: true,
        webPreferences: {
            nodeIntegration: true,
            contextIsolation: false,
            preload: path.join(__dirname, 'preload.js'),
            additionalArguments: [`--ot-save-path=${saveDir}`],
            partition: `persist:ot-${slot.id}`, // separate localStorage per player
            backgroundThrottling: false,        // the window you're not using keeps full rate
            offscreen: !!cfg.hidden,
        },
    });
    windows[slot.id] = win;
    win.webContents.setAudioMuted(!!(slot.muted || cfg.hidden));
    win.on('page-title-updated', e => e.preventDefault()); // keep "P1 host (you)" etc.

    // Inject once: after a manual reload (Cmd+R) the window is yours to drive.
    let injected = false;
    win.webContents.on('did-finish-load', () => {
        if (injected) return;
        injected = true;
        const ot = { role: slot.role, hero: slot.hero, mode: cfg.mode, autopilot: slot.autopilot };
        win.webContents.executeJavaScript(`window.__OT__ = ${JSON.stringify(ot)};\n${DRIVER_SRC}`).catch(e => {
            process.stdout.write(`[${slot.id}] driver injection failed: ${e.message}\n`);
        });
        relayCode(slot.id);
    });

    win.webContents.on('console-message', ({ message, level }) => {
        if (message.startsWith('[OT] ')) onDriverLine(slot, message);
        else if (level === 'error') process.stdout.write(`[${slot.id}] console error: ${message}\n`);
    });
    win.webContents.on('render-process-gone', (_e, d) => {
        process.stdout.write(`[${slot.id}] renderer gone: ${d.reason}\n`);
    });

    if (cfg.appUrl) win.loadURL(cfg.appUrl);
    else win.loadFile(cfg.appFile);
    return win;
}

app.whenReady().then(() => {
    const area = screen.getPrimaryDisplay().workArea;
    const tile = (left, i) => {
        const width = Math.floor((area.x + area.width - left) / cfg.slots.length);
        const height = Math.min(area.height, Math.round(width * 0.625)); // 16:10, like 1280×800
        return { x: left + i * width, y: area.y, width, height };
    };
    const [first, ...rest] = cfg.slots;
    const firstWin = createWindow(first, tile(area.x, 0));
    // macOS Stage Manager keeps a strip at the left edge free and moves a window
    // that starts there; tile the remaining width from wherever it landed.
    const left = firstWin.getBounds().x;
    firstWin.setBounds(tile(left, 0));
    rest.forEach((slot, i) => createWindow(slot, tile(left, i + 1)));
});

app.on('window-all-closed', () => app.quit());
