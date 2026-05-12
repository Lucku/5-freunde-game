# Architecture

Map of how the codebase fits together, written for someone touching it for the first time. Read [`CONTRIBUTING.md`](CONTRIBUTING.md) first for setup.

## High-level shape

```
┌──────────────────────────┐    ┌────────────────────────────┐
│   Browser / Electron     │    │   Node server/             │
│   renderer process       │    │   (online co-op only)      │
│                          │ WS │                            │
│   game.html  → game.js   │◄──►│   server.js                │
│   ├── Entities/          │    │   ├── simulation/          │
│   ├── Managers/          │    │   │   (reuses Player/Enemy │
│   ├── UI/                │    │   │    via loader.js)      │
│   └── dlc/…              │    │   └── SQLite users.db      │
└──────────────────────────┘    └────────────────────────────┘
```

- **Client**: vanilla JS + HTML5 Canvas, packaged via Electron. Single-player and local co-op work fully offline.
- **Server**: Node + `ws` + SQLite. Only needed for online co-op, cloud saves, and leaderboards. Same `Player` / `Enemy` / `Arena` code runs on both sides via `server/simulation/loader.js`.

## Build pipeline

Vite 8 bundles ESM-converted modules. Classic-script files (`<script src>` without `type="module"`) are copied as-is into `dist/` by a small custom plugin in [`vite.config.mjs`](vite.config.mjs). The migration is **partial** — see [`tasks/improvements-2026-05-10.md`](tasks/improvements-2026-05-10.md) #2 for status.

- **Dev**: `npm run dev:electron` → Vite serves at `:5173`, Electron loads it. Hot reload free.
- **Prod**: `npm run build` produces `dist/`. Electron then loads `dist/game.html`.

## Module-by-module

### `game.js` (≈ 7000 lines)

The orchestrator. Holds ~539 module-scope globals (wave, score, enemies, projectiles, particles, …). Runs `masterLoop()` at 60 FPS — updates entities, draws the world, renders HUD overlays, handles input, manages UI state transitions.

Cross-module access to game.js state goes through:
1. **`GameContext`** (preferred for new code) — single read-only view onto the ~15 cross-cutting globals. See "`GameContext` (#4)" below.
2. **`Object.defineProperties(window, …)` blocks** — live getter/setter pairs for vars like `wave`, `bossActive`, `enemiesKilledInWave`, `isPlayerDying`, `isLevelingUp`, `isShopping`, `companions`, `projectiles`, etc. Pattern is mandatory after ESM migration because bare `var X` in an ES module does NOT auto-attach to `window`.
3. **`window.GAME_API`** — formal contract for DLC code. Stable entry points for game state, mode flags, entity arrays, helpers, registries. New DLCs should prefer this over raw bare globals.
4. **`window.X = X` shims** — bottom of `game.js` exposes specific helpers (`showNotification`, `advanceWave`, `gameOver`, `triggerImpact`, `triggerHitStop`, `applyDamage`, `recordPlayerDamage`, …) to DLC + classic-script callers.

A CI lint step (`.github/workflows/test.yml`) verifies every `let/var/const` tagged `// Exposed for DLC` in game.js has a corresponding window binding. Prevents the gray-enemies regression class.

### `GameContext` (#4)

[`GameContext.js`](GameContext.js) — single source of truth for the ~15 cross-cutting globals (`canvas`, `ctx`, `gameConfig`, `saveData`, `defaultSaveData`, `wave`, `arena`, `enemies`, `projectiles`, `world`, `player`, `player2`, `enemiesPerWave`, `biomeObstacleDensity`, `platform`, plus `registries.{biomes,heroes,enemies,dlcs}`).

**Current status (session 1):** getter-only view. Each property is an `Object.defineProperty` accessor that delegates to `window.X` so the underlying value stays where it always was. Readers can adopt the API today without breaking writers.

```js
import { GameContext } from './GameContext.js';

const ctx = GameContext.ctx;            // → window.ctx
const cfg = GameContext.gameConfig;     // → window.gameConfig
const wv  = GameContext.wave;           // → window.wave (which already routes via defineProperty to game.js's module var)
```

Or via the window shim for classic-script callers / non-importing modules:

```js
window.gameContext.gameConfig.musicVolume
```

**Migration arc (multi-session):**

| Session | Scope |
|---------|-------|
| 1 (shipped) | Singleton + getter view backed by `window.X`. 3 proof migrations (InputManager / AudioManager / CrashReporter). |
| 2 | Migrate `saveData` + tuning numbers (`ENEMIES_PER_WAVE`, `BIOME_OBSTACLE_DENSITY`). Manager call-site sweep. |
| 3 | Add registries view audit. DLC consumer survey. |
| 4 | Flip ownership: `GameContext.X` becomes source of truth, `window.X` becomes alias. Couples with #11 RunState for entity arrays. |
| 5 | Drop redundant `window.X` shims where no DLC bare-reads. ARCHITECTURE.md final sweep. |

The flip in session 4 is the risky part — until then, every change is additive.

### `Entities/`

One file per game-object kind. Each is an ES module exporting a class plus a `window.X = X` shim:

- `Player.js`, `Enemy.js`, `Boss.js`, `Companion.js`, `Arena.js`
- `Entities/Projectile.js`, `MeleeSwipe.js`, `Particle.js`, `FloatingText.js`, `GoldDrop.js`, `CardDrop.js`, `HolyMask.js`, `PowerUp.js`, `MemoryShard.js`
- `Entities/PlayerController.js` (`HumanController`, `AIController`, `CompanionAIController`) + `NetworkInputController.js` (`RecordingInputController`)

Pools: `Particle` and `FloatingText` have static `acquire()` / `release()` pools to cut GC churn on long runs. Other entity types still allocate per use.

### `Managers/`

Cross-cutting subsystems, one file per concern:

| Manager | Responsibility |
|---------|---------------|
| `SaveManager` | HMAC-signed save envelope, schema versioning, 5-slot ring-buffer backups (#140), localStorage + Electron disk paths. |
| `AudioManager` | ~60 `Audio` elements, per-category volume sliders (music / SFX / voice / UI), pause low-pass filter (Web Audio `BiquadFilter`), subtitle pipe-through, hero-exclamation text bank. |
| `InputManager` | Keyboard + mouse + gamepad polling, remappable key/button bindings, hold-to-fire toggle, focus-loss / gamepad-disconnect auto-pause. |
| `UIManager` | `setUIState(state)` drives which screen is "focused" for gamepad nav. Announces transitions to the ARIA live region. |
| `StoryManager` | Story-mode chapter unlock + boss reveal flow. |
| `IntroManager` | First-launch intro screens. |
| `NetworkManager` | WebSocket client to `server/server.js`. Snapshot interpolation (cubic Hermite), MTU-aware fragmentation. |
| `CloudSaveManager` | Save sync to server. |
| `CrashReporter` | Catches `window.onerror` + console breadcrumbs, POSTs to `/api/crash`. |
| `SpatialHash` | Cell-bucket structure for AOE-radius queries. |
| `EventBus` | Pub/sub primitive for cross-module signaling. Used selectively; full carve of game.js into modules is a future arc. |

### `UI/`

Per-screen menu/modal logic. Each file owns its `<div id="…-screen">` in `game.html`:

- `MainMenu`, `Options`, `Shop`, `LevelUp`, `Completion`, `Achievements`, `Collection`, `Statistics`, `SkillTree`, `HeroDetails`, `OnlineLobby`, `VersusMenu`, `InfoDialogueManager`, `MenuBackground`.

### `dlc/`

Eight DLC packs. Each is a drop-in directory with `index.js` (entry, registers heroes/biomes/bosses) plus hero/biome/story modules. DLC files are loaded by `dlc/DLCManager.js` via native dynamic `import()` (since 2026-05-11). Server-side, they're loaded via `require()` through `server/simulation/loader.js` which transparently unwraps `__esModule` namespace objects.

### `Constants.js`

`APP_VERSION`, `BASE_HERO_STATS`, `ACHIEVEMENTS`, `WEATHER_TYPES`, `ELITE_TYPES`, `COLLECTOR_CARDS`, `MUTATORS`, `CHAOS_*`, `UPGRADE_POOL`, `PERM_UPGRADES`. Plus the `GAMEPLAY` magic-number block (#16).

### `Config.js`

`gameConfig` — user-level settings (volumes, accessibility toggles, key bindings, account, cloud-sync metadata). Persisted to `config.json` in Electron user data dir + `localStorage` mirror. `applyConfig()` reads it and pokes the relevant subsystems.

## Save data shape

```
saveData = {
  version: 1,                       // SaveManager.SCHEMA_VERSION
  global: { totalKills, totalGold, totalDamage, … achievement stats … },
  <hero>: { level, prestige, unlocked, hp, … } × 19,
  metaUpgrades: { … },
  collection: [cardId, …],
  daily: { lastCompleted },
  weekly: { lastCompleted },
  story: { unlockedChapters, enabled },
  altar: { active: [nodeId, …] },
  chaos: { shards, unlocked, active },
  savedRun: { mode, wave, player snapshot, companions, … } | null,
}
```

`SaveManager.MIGRATIONS` is a sequential `[{from, to, fn(data)}]` array. Add an entry whenever the shape changes. Backups are written automatically before any migration runs.

## Server architecture

[`server/server.js`](server/server.js) — Express HTTP + `ws` WebSocket. Endpoints:

- `POST /api/register`, `/api/login` (bcrypt, JWT, rate-limited)
- `POST /api/leaderboard` (anti-cheat: signed session tokens, plausibility caps, hero-specific damage limits)
- `GET /api/leaderboard?mode=…&heroFilter=…`
- `POST /api/save` / `GET /api/save` (cloud sync)
- `POST /api/crash` (in-house crash reporter)
- `GET /api/admin/*` (admin dashboard at `/admin`)
- `WS /ws` — lobby + match state, gameplay snapshots (permessage-deflate compressed, MTU-fragmented). Origin allowlist via `ALLOWED_WS_ORIGINS` env var.

[`server/simulation/`](server/simulation/) — runs the same `Player` / `Enemy` / `Arena` code as the client. `GameSession` ticks at 30 Hz (drops to 20 Hz under CPU pressure via variable tick-rate). Inputs come from the client over WS; world state is broadcast back as snapshots.

## Networking

- **Snapshots**: cubic-Hermite-interpolated entity positions (Catmull-Rom tangents). Delta-encoded per entity (first appearance carries full payload, subsequent frames send only changed fields).
- **Compression**: WebSocket `permessage-deflate` (replaced the abandoned Zstd plan — same effect, zero handshake, broader support).
- **Fragmentation**: snapshots above MTU split + reassembled by sequence number.
- **Anti-cheat**: server-signed session token issued at run start; leaderboard submissions clamped to hero-specific damage caps; rate-limited per IP.

## CI

`.github/workflows/test.yml` runs on every push/PR:

1. `npm install`
2. `npm run lint` — must pass (warnings-only policy; 0 errors).
3. `npm run build` — bundle must succeed.
4. `npm test` — Vitest (48 tests) + parityTest (80 assertions).
5. The `// Exposed for DLC` window-binding check (custom step).

## What is still on the backlog

[`tasks/improvements-2026-05-10.md`](tasks/improvements-2026-05-10.md) has the running list. Highest-leverage items still open: **#1** (split game.js into modules — biggest architectural debt), **#3** (TypeScript/JSDoc), **#77** (achievement-driven cosmetics plumbing), **#101** (mod API), **#118** (i18n), **#119** (Steam SDK), **#123** (adaptive music stems).
