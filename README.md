Freunde: Elemental Arena
=========================

A small local multiplayer / single-player arena game where you control elemental heroes and fight waves of enemies and bosses. This repository contains the game source, a DLC system and the "Rise of the Rock" Earth DLC.

Quick summary
-------------
- Built with plain JavaScript and HTML5 Canvas.
- Includes a DLC system under `dlc/` (example DLC: `rise_of_the_rock`).
- Audio is handled by `AudioManager.js`; story audio and DLC audio are located in `dlc/.../music`.

Building
--------
First, install dependencies:

```bash
npm install
npm install electron --save-dev
npm install --save-dev @electron-forge/cli
```

### Steam Deck / Linux (x64)

```bash
npm run make -- --platform=linux --arch=x64
```

Output: `out/make/zip/linux/x64/*.zip`

### Windows (x64)

Run on a Windows machine (or via the GitHub Actions workflow):

```bash
npm run make -- --platform=win32 --arch=x64
```

Output: `out/make/squirrel.windows/x64/5FreundeArena-Setup.exe`

Notes
-----
- The project is configured to run in Electron; `index.js` is the Electron entry.
- If packaging fails, check that you have the required native toolchain and that `node`/`npm` are installed and up to date.
- Audio autoplay policies on Linux/Electron may require a user gesture to enable sound in some environments; consider adding a simple click-to-unlock UX for first-run audio.

Development
-----------
- Open `game.html` in a browser for a quick web test (some Electron features will not be available).
- Use the console for debug logs (audio registration, DLC loading, etc.).
