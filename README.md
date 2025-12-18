Freunde: Elemental Arena
=========================

A small local multiplayer / single-player arena game where you control elemental heroes and fight waves of enemies and bosses. This repository contains the game source, a DLC system and the "Rise of the Rock" Earth DLC.

Quick summary
-------------
- Built with plain JavaScript and HTML5 Canvas.
- Includes a DLC system under `dlc/` (example DLC: `rise_of_the_rock`).
- Audio is handled by `AudioManager.js`; story audio and DLC audio are located in `dlc/.../music`.

Building for Steam Deck (Linux x64)
-----------------------------------
These are the minimal steps used to build an Electron app for Linux x64 (Steam Deck):

1. Install dependencies

```bash
npm install
npm install electron --save-dev
npm install --save-dev @electron-forge/cli
```

2. Build the distributable for Linux x64

```bash
npm run make -- --platform=linux --arch=x64
```

Notes
-----
- The project is configured to run in Electron; `index.js` is the Electron entry.
- If packaging fails, check that you have the required native toolchain and that `node`/`npm` are installed and up to date.
- Audio autoplay policies on Linux/Electron may require a user gesture to enable sound in some environments; consider adding a simple click-to-unlock UX for first-run audio.

Development
-----------
- Open `game.html` in a browser for a quick web test (some Electron features will not be available).
- Use the console for debug logs (audio registration, DLC loading, etc.).
