Freunde: Elemental Arena
=========================

Local multiplayer / single-player arena game. Pick an elemental hero, fight waves of enemies and bosses, collect cards, unlock DLC heroes and biomes. Built with vanilla JavaScript + HTML5 Canvas, packaged via Electron.

Quick summary
-------------
- Vanilla JS + HTML5 Canvas. Electron renderer with `nodeIntegration: true`.
- DLC system under `dlc/` (8 packs: Rise of the Rock, Tournament of Thunder, Champions of Chaos, Waker of Winds, Faith of Fortune, Symphony of Sickness, Echos of Eternity, Disciples of Deception).
- Server-authoritative online co-op via `server/` (Node + WebSocket + bcrypt + SQLite).
- Bundled with **Vite 8** (since 2026-05-11). ESM migration in progress — leaf files (`Utils.js`, `Constants.js`, `Managers/SpatialHash.js`, `Managers/SaveManager.js`) are native modules; rest still classic-script with `defer`.

Install
-------
```bash
npm install
```

This pulls Electron, Vite, ESLint, Vitest, and the rest of the toolchain. No extra `npm install electron` step needed.

Running the game
----------------

### Production-style (default)
```bash
npm start
```
Runs `electron-forge start`. `index.js` loads `dist/game.html` if it exists (run `npm run build` first), otherwise falls back to the source `game.html`. This is the path used by packaged releases.

### Dev mode with Vite + hot reload
```bash
npm run dev:electron
```
Boots Vite dev server at `http://localhost:5173` then launches Electron pointed at it. Saving a `.js` or `.html` file triggers a full page reload. Saving `main.css` swaps styles live (no reload) via Vite CSS HMR.

Set `VITE_DEV=1` manually if launching Electron yourself:
```bash
npx vite                  # terminal 1
VITE_DEV=1 npm start      # terminal 2
```

### Vite dev server only (browser, no Electron)
```bash
npm run dev
```
Open `http://localhost:5173/game.html`. Electron-only features (`require('fs')`, local save file) will not work — `localStorage` fallback kicks in.

### Server (online co-op + leaderboard + cloud save)
```bash
cd server && npm install && npm start
```
Listens on port 3001 by default (HTTP/WS). Set `TLS_CERT_PATH` + `TLS_KEY_PATH` env vars to enable HTTPS/WSS. Set `JWT_SECRET` in production.

Building distributables
-----------------------

### Bundle (any platform)
```bash
npm run build
```
Vite produces `dist/` with fingerprinted assets + source maps. Static files (`audio/`, `images/`, `dlc/`) and not-yet-ESM scripts are mirrored as-is so DLC dynamic-script-load paths still resolve.

### Steam Deck / Linux (x64)
```bash
npm run build
npm run make -- --platform=linux --arch=x64
```
Output: `out/make/zip/linux/x64/*.zip`

### Windows (x64)
On Windows (or via GitHub Actions):
```bash
npm run build
npm run make -- --platform=win32 --arch=x64
```
Output: `out/make/squirrel.windows/x64/5FreundeArena-Setup.exe`

### macOS
```bash
npm run build
npm run make -- --platform=darwin --arch=arm64
```

Quality scripts
---------------
```bash
npm run lint         # ESLint flat config, warnings-only (0 errors baseline)
npm run lint:fix     # auto-fix safe issues (prefer-const, no-var, etc.)
npm test             # Vitest unit tests + parityTest integration (80 + 38 cases)
npm run test:watch   # Vitest watch mode
```

CI (`.github/workflows/test.yml`) runs lint + build + tests on every push and PR.

Custom lint rule
----------------
`eslint-plugin-5freunde/no-foreach-splice` catches the `arr.forEach((e, i) => arr.splice(i, 1))` index-skip bug class. See `eslint-plugin-5freunde/index.mjs`.

Notes
-----
- `index.js` is the Electron main entry. Renderer uses `nodeIntegration: true` + `contextIsolation: false` so `require('fs')` works inside Config.js, SaveManager.js, DLCManager.js, etc.
- Audio autoplay on Linux/Electron may require a user gesture to start; first input unlocks the AudioContext.
- Save data lives in `app.getPath('userData')/save_data.json` (Electron) or `localStorage['5FreundeSave']` (browser). Schema version tracked by `SaveManager.SCHEMA_VERSION`.
- Crash reports POST to the configured server `/api/crash` endpoint (opt-out via Options → Crash Reports).

Development tips
----------------
- Watch lint while coding: `npm run lint -- --watch` is not supported by ESLint flat config; use your editor's ESLint integration instead.
- Debug logs in the browser console: audio registration, DLC loading, network snapshots, etc.
- `tasks/todo.md` tracks current refactor work. `tasks/improvements-2026-05-10.md` is the long-tail backlog.
- The longer ESM migration (Managers → Entities → UI → `game.js` split → DLCs) is phased across future sessions. See `tasks/todo.md` Review section.

Project layout
--------------
```
.                       repo root
├── game.html           main HTML entry (Vite reads this)
├── save-editor.html    standalone save editor
├── index.js            Electron main process
├── game.js             client game loop (largest file, slated for #1 split)
├── Player.js, Enemy.js, Boss.js, Projectile.js, Arena.js, Biomes.js
├── Constants.js, Utils.js, Config.js
├── Managers/           AudioManager, SaveManager, NetworkManager, etc.
├── Entities/           PlayerController, Particle, GoldDrop, etc.
├── UI/                 menus, level-up, options, completion screens
├── dlc/                8 DLC packs + DLCManager.js
├── audio/, images/     static assets
├── server/             Node WebSocket server (online co-op)
├── shared/             world helper shared between client + server sim
├── tests/              Vitest unit tests
├── eslint-plugin-5freunde/  local ESLint rules
├── .github/workflows/  CI
└── dist/               Vite build output (gitignored)
```
