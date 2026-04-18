const { app, BrowserWindow } = require('electron');
const path = require('path');
const fs = require('fs');

// Handle Squirrel.Windows installer events (install, update, uninstall shortcuts)
if (require('electron-squirrel-startup')) app.quit();

let logStream = null;

function writeLog(level, source, ...args) {
    if (!logStream) return;
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

    createWindow();

    app.on('activate', () => {
        if (BrowserWindow.getAllWindows().length === 0) {
            createWindow();
        }
    });
});

app.on('window-all-closed', () => {
    if (process.platform !== 'darwin') {
        app.quit();
    }
});