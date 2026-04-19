const { app, BrowserWindow, ipcMain, shell } = require('electron');
const path = require('path');
const fs = require('fs');
const https = require('https');

// Handle Squirrel.Windows installer events (install, update, uninstall shortcuts)
if (require('electron-squirrel-startup')) app.quit();

const LOGGING_ENABLED = false;

let logStream = null;

function writeLog(level, source, ...args) {
    if (!LOGGING_ENABLED || !logStream) return;
    const line = `[${new Date().toISOString()}] [${source}:${level}] ${args.join(' ')}\n`;
    logStream.write(line);
}

function createWindow() {
    const win = new BrowserWindow({
        width: 1280,
        height: 800, // Steam Deck native height
        title: "Freunde: Elemental Arena",
        fullscreen: true, // Important for Steam Deck
        autoHideMenuBar: true, // Hide the menu bar
        webPreferences: {
            nodeIntegration: true,
            contextIsolation: false
        },
        icon: path.join(__dirname, 'icon.png')
    });

    win.loadFile('game.html');

    // Capture all renderer console output
    win.webContents.on('console-message', (event, level, message, line, sourceId) => {
        const levelName = ['LOG', 'WARN', 'ERROR', 'DEBUG'][level] || 'LOG';
        writeLog(levelName, 'RENDERER', message, `(${path.basename(sourceId || '')}:${line})`);
    });

    // Capture renderer crashes and load failures
    win.webContents.on('render-process-gone', (event, details) => {
        writeLog('ERROR', 'MAIN', `Renderer process gone: reason=${details.reason} exitCode=${details.exitCode}`);
    });
    win.webContents.on('did-fail-load', (event, errorCode, errorDescription) => {
        writeLog('ERROR', 'MAIN', `Page failed to load: ${errorDescription} (${errorCode})`);
    });
    win.webContents.on('unresponsive', () => {
        writeLog('WARN', 'MAIN', 'Renderer became unresponsive');
    });
}

app.whenReady().then(() => {
    // Define the save path in the environment variables so the game can read it
    process.env.APP_SAVE_PATH = app.getPath('userData');

    if (LOGGING_ENABLED) {
        // Open a persistent log file (append mode so multiple sessions accumulate)
        const logPath = path.join(app.getPath('userData'), 'game.log');
        try {
            logStream = fs.createWriteStream(logPath, { flags: 'a' });
            logStream.write(`\n${'='.repeat(60)}\n`);
            writeLog('INFO', 'MAIN', `Session started — log: ${logPath}`);
            writeLog('INFO', 'MAIN', `Save dir: ${process.env.APP_SAVE_PATH}`);
            process.env.APP_LOG_PATH = logPath;
        } catch (e) {
            console.error('Failed to open log file:', e);
        }

        // Catch unhandled errors in the main process itself
        process.on('uncaughtException', (err) => {
            writeLog('ERROR', 'MAIN', `Uncaught exception: ${err.stack || err}`);
        });
    }

    createWindow();

    // Check for updates after window is created
    checkForUpdates();

    app.on('activate', () => {
        if (BrowserWindow.getAllWindows().length === 0) {
            createWindow();
        }
    });
});

ipcMain.on('open-url', (event, url) => {
    shell.openExternal(url);
});

function parseVersion(v) {
    return (v || '').replace(/^v/, '').split('.').map(Number);
}

function isNewer(latest, current) {
    const l = parseVersion(latest);
    const c = parseVersion(current);
    for (let i = 0; i < 3; i++) {
        if ((l[i] || 0) > (c[i] || 0)) return true;
        if ((l[i] || 0) < (c[i] || 0)) return false;
    }
    return false;
}

function checkForUpdates() {
    const options = {
        hostname: 'api.github.com',
        path: '/repos/Lucku/5-freunde-game/releases/latest',
        headers: { 'User-Agent': 'Freunde-Elemental-Arena' }
    };
    https.get(options, (res) => {
        let data = '';
        res.on('data', (chunk) => { data += chunk; });
        res.on('end', () => {
            try {
                const release = JSON.parse(data);
                const latestTag = release.tag_name;
                const currentVersion = app.getVersion();
                if (latestTag && isNewer(latestTag, currentVersion)) {
                    const downloadUrl = release.html_url;
                    const wins = BrowserWindow.getAllWindows();
                    if (wins.length > 0) {
                        // Wait for renderer to be ready before sending
                        const win = wins[0];
                        const send = () => win.webContents.send('update-available', { version: latestTag, url: downloadUrl });
                        if (win.webContents.isLoading()) {
                            win.webContents.once('did-finish-load', send);
                        } else {
                            send();
                        }
                    }
                }
            } catch (e) {
                // Silently ignore parse errors
            }
        });
    }).on('error', () => {
        // Silently ignore network errors
    });
}

app.on('window-all-closed', () => {
    if (process.platform !== 'darwin') {
        app.quit();
    }
});