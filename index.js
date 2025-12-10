const { app, BrowserWindow } = require('electron');
const path = require('path');

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
}

app.whenReady().then(() => {
    // Define the save path in the environment variables so the game can read it
    process.env.APP_SAVE_PATH = app.getPath('userData');

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