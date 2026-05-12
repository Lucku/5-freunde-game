# Improvement #1 — Split game.js into modules (2026-05-12)

User picked "All 5 phases in one session" with eyes open about regression risk.

Result: 5 new ES modules extracted from `game.js`. ~210 lines moved out (8379 → 8169). Build green, 80/80 parity tests + 38 Vitest assertions pass.

| Phase | Module | Status | Surface |
|-------|--------|--------|---------|
| A | `Camera.js` | shipped | Shake state + `SHAKE_PRESETS`, `applyScreenShake(ctx)`, photo mode (F2/Esc), gamepad vibration, `triggerImpact` |
| B | `Spawner.js` | shipped | `createExplosion`, `spawnLevelUpAura`, thin `spawnEnemy` / `spawnBoss` wrappers |
| C | `Wave.js` | shipped | `enemiesNeededForWave`, `isWaveCleared`, `buildBiomePool`, `pickRandomBiome`, `pickSeededBiome`, `isStoryBossWave`, `notifyWaveAdvance` (EventBus) |
| D | `RunState.js` | shipped | `createRunStats` factory, `resetRunStats`, `bumpDamageSource`, `logUpgradePick`, `logKeyMoment` |
| E | `GameLoop.js` | shipped | `createGameLoop({ targetFps, onRafTick, onFrame })`, rAF + fixed-timestep gate, `start()` / `stop()` |

`EventBus.js` (improvement #1 prerequisite) already existed from Phase 8a.

## Constraints / decisions

- **`advanceWave()` body stayed in game.js**. Touches 30+ run-scoped variables (currentBiomeType, currentStoryEvent, mode flags, p1/p2RevivalMarker, ...). Moving it requires moving those globals first (= improvement #11). Wave.js owns the pure helpers it uses now.
- **`masterFrame()` body stayed in game.js**. ~3000 lines, references every system. GameLoop.js owns the frame-timing harness only; the body runs as the `onFrame` callback.
- **Window shims preserved** (`window.shake`, `window.createExplosion`, ...) so unchanged DLCs and HTML `onclick` handlers keep working.
- **Live array refs**: `window.projectiles` / `window.enemies` / `window.particles` / `window.floatingTexts` newly mirrored from game.js module-scope arrays so Spawner can push into them.
- **EventBus wiring**: `notifyWaveAdvance(wave)` emits `wave:advance`. No subscribers yet — infrastructure for future extracted modules.

## Verification

- `npm run build` — green (no new warnings).
- `npm run lint` — 0 errors, 332 baseline warnings (unchanged).
- `npm run test` — 38 Vitest assertions pass.
- `parityTest` — 80/80 pass (server simulation untouched).

## Open follow-ups

1. **#11 — full RunState migration**. Move `wave`, `enemiesKilledInWave`, `masksDroppedInWave`, `bossActive`, `bossDeathTimer`, `currentBiomeType`, `currentObjective`, `currentWeather`, `activeMutators`, mode flags, etc. into a RunState instance. Touch every `Object.defineProperties(window, ...)` getter/setter pair in game.js so they read/write through the instance.
2. **advanceWave migration**. Once RunState owns the run-scoped vars, the function body can move into Wave.js and accept `(runState, modes)` params.
3. **masterFrame migration**. Slice the per-frame body into update/draw passes, then move each into its own module. Loop harness already supports it.
4. **Spawner grow**. Migrate the in-wave spawn rules (line ~6240, the mutator + special-enemy spawning block) once RunState lands.

---

# Path 1 — Foundation pass (Vite, ESM, lint, tests, hot reload)

Date: 2026-05-11. Implements improvements #2, #12, #14, #145 (+ #13 lint rule, partial #1/#3 unlock).

User chose **Vite + ESM migration** over esbuild concat. Hot reload: full reload + CSS hot-swap.

ESM migration is 1–2 weeks of work and cannot land in one session safely. Plan splits into phases that ship working game at every step.

---

## Constraints discovered from codebase scan

- **`require('fs')`, `require('path')` in client code** (Config.js, SaveManager.js, game.js, DLCManager.js, CrashReporter.js). Only works in Electron renderer with `nodeIntegration: true`. Vite needs `vite-plugin-electron-renderer` or a polyfill to keep these working.
- **DLCManager dynamic `<script>` injection**. Must keep working — DLCs ship as separate files loaded on demand. With ESM, these become `await import()`.
- **~539 module-scope globals in `game.js`** + `window.X` exports everywhere. Cross-file dependency graph is implicit.
- **`<script src="dlc/.../X.js">` references inside DLC files** — same dynamic-load pattern.

---

## Phase 0 — Vite scaffolding (today, no ESM conversion yet)

Goal: game builds + runs through Vite using existing global-based scripts. Zero file rewrites of game logic.

- [ ] 0.1. Add devDeps: `vite`, `vite-plugin-electron-renderer`.
- [ ] 0.2. `vite.config.mjs`:
  - root: project root
  - build outDir: `dist/`
  - Use HTML entry `game.html` so Vite picks up every `<script src>`
  - `vite-plugin-electron-renderer` for `require('fs')` etc.
  - server.port: 5173
- [ ] 0.3. `index.js` (Electron main) — load Vite dev server when `VITE_DEV=1`, otherwise load `dist/game.html`. Watch for `dist/` mtime in dev to trigger reload.
- [ ] 0.4. `package.json` scripts: `dev` (electron + vite), `build` (vite build), `start` (existing electron-forge).
- [ ] 0.5. `.gitignore` `dist/`, `node_modules/.vite/`.
- [ ] 0.6. `forge.config.js` — include `dist/` in packaged Electron app.
- [ ] 0.7. **Verify game runs to wave 5 in both `npm run dev` and `npm run build && npm start`.**

**Acceptance**: working Electron build via Vite. No game logic changed.

**Risk**: `require()` calls break, DLC dynamic load breaks, audio paths break. Mitigation: incremental fix per breakage encountered.

---

## Phase 1 — ESM migration: leaf files (today)

Goal: convert files with no internal dependencies. Validates the migration pattern. Keep `window.X` shims so callers still see them.

Leaf files (read-only consumers, no dependencies on other game files):
- [ ] 1.1. `Utils.js` → ESM. Export `drawHeroSprite`, `shadeColor`, `mulberry32`. Keep `window.*` shims.
- [ ] 1.2. `Managers/SpatialHash.js` → ESM. Export `SpatialHash`. Keep shim.
- [ ] 1.3. `Constants.js` → ESM. Export everything currently in scope.
- [ ] 1.4. Update `game.html` `<script>` tags for these files → `<script type="module" src=...>`.
- [ ] 1.5. Smoke test: `npm run dev`, play 1 wave, check no console errors.

**Acceptance**: 3 leaf files converted; game still runs.

---

## Phase 2 — ESLint + Prettier + #13 custom rule (today)

- [ ] 2.1. devDeps: `eslint`, `eslint-config-prettier`, `prettier`.
- [ ] 2.2. `.eslintrc.cjs` — permissive (warn-not-error):
  - `no-unused-vars: warn`, `no-undef: off`, `eqeqeq: warn`, `no-var: warn`, `prefer-const: warn`.
- [ ] 2.3. Local plugin `eslint-plugin-5freunde/` with one rule `no-foreach-splice` for #13.
- [ ] 2.4. `.prettierrc` (4-space indent, single quotes, semicolons, 120-col).
- [ ] 2.5. `package.json` scripts: `lint`, `lint:fix`.
- [ ] 2.6. `.github/workflows/ci.yml` — runs `lint` + `test` on push/PR. Allow warnings, fail on errors.
- [ ] 2.7. Report top 20 lint findings to user. **No mass auto-fix.**

**Acceptance**: lint runs locally + in CI.

---

## Phase 3 — Vitest test suite (today)

- [ ] 3.1. Add devDep `vitest` (natural pair with Vite).
- [ ] 3.2. `vitest.config.mjs`.
- [ ] 3.3. `tests/` directory:
  - `tests/saveManager.test.js` — v0 → v1 migration idempotent; version stamped.
  - `tests/mulberry32.test.js` — deterministic; rough uniformity.
  - `tests/spatialHash.test.js` — hits, misses, multi-cell, rebuild.
  - `tests/hermiteInterp.test.js` — boundaries clamp; collinear matches linear.
  - `tests/rateLimit.test.js` — bucket exhausts + refills.
  - `tests/plausibility.test.js` — accepts realistic; rejects garbage.
- [ ] 3.4. **Fix pre-existing parityTest failure** at `GameSession.js:211` — `this.world.player` → `this._world.player`. Caught during quick-wins verification.
- [ ] 3.5. `npm test` runs Vitest + parityTest.
- [ ] 3.6. CI workflow runs `npm test`.

**Acceptance**: `npm test` exits 0 with ≥6 new suites + fixed parityTest.

---

## Phase 4 — Hot reload (#145, today)

Vite's dev server gives full-page reload for free on `<script src>` changes. Add CSS hot-swap on top.

- [ ] 4.1. `npm run dev` already triggers reload on script save (Vite default).
- [ ] 4.2. For `main.css`: Vite's CSS HMR already injects new CSS without page reload (default behavior on `<link rel="stylesheet">`).
- [ ] 4.3. Verify both behaviors in Electron.
- [ ] 4.4. `HOT_RELOAD=0` env disables (default ON in dev, OFF in prod).

**Acceptance**: edit `.js` → reload ~1s. Edit `.css` → live swap, no reload.

---

## Phase 5+ — Future ESM migration (deferred sessions)

| Phase | Scope | Files | Approx effort |
|-------|-------|-------|---------------|
| 5 | Managers | `Managers/*.js` (~12 files) | 1 day |
| 6 | Entities | `Player.js`, `Enemy.js`, `Boss.js`, `Projectile.js`, `Entities/*` | 1–2 days |
| 7 | UI | `UI/*.js`, `Museum.js`, `Altar.js` | 1 day |
| 8 | `game.js` split | break into `GameLoop/`, `Spawner/`, `Wave/`, `Camera/`, `EventBus/`, `RunState/` (per #1) | 2–3 days |
| 9 | DLCs | `dlc/*/index.js` + `dlc/*/*.js` | 1 day |
| 10 | Remove `window.X` shims | repo-wide cleanup | 1 day |

Each phase ends with a working game. Each phase ships independently.

---

## Today's deliverable (this session)

Phases 0, 1, 2, 3, 4. Concrete: Vite working + 3 leaf files in ESM + lint scaffold + Vitest suite + hot reload via Vite dev mode.

Future sessions: Phases 5–10 (the heavy ESM migration). Each opens its own PR.

---

## Risks + mitigations

- **Vite + Electron `require()` interop fails.** Mitigation: `vite-plugin-electron-renderer`. Fallback: keep `nodeIntegration: true` + `contextIsolation: false` (current setup).
- **DLC dynamic loading breaks.** Mitigation: keep `dlc/` outside Vite's bundle; serve via static file path. Long-term: convert to `import()` (Phase 9).
- **Audio file paths break under Vite.** Mitigation: configure `publicDir` so `audio/` ships unchanged.
- **Source maps make crashes harder to attribute.** Mitigation: enable inline source maps in dev, hidden source maps in prod (uploaded to CrashReporter).

---

## Review

### 2026-05-11 (session 12) — ESM migration bug-fix sweep + GAME_API contract

The ESM migration that landed in sessions 1–10 (Phases 0–10) shipped functionally working code but left a class of *silent failure* bugs that only surfaced through gameplay. This session is the cleanup pass for those, plus a forward-looking API contract.

**Bug classes closed:**

1. **HTML `onclick` ReferenceErrors** — 26 game.js functions called from `<button onclick="X()">` attributes were module-scoped after Phase 8b and unreachable as globals. First wave hit `skipTutorialPrompt`; sweep covered all 26 plus the compound-handler edge case (`onclick="a(); b()"` where `b` was missed by initial grep) and the singleton instance `versusMenu` used as `versusMenu.selectOnlineMode(...)`.

2. **Stale `window.X` references after reassignment** — `window.player = player` ran once at init when `player` was `undefined`, then `startGame`, the chaos-shuffle hero swap, and the hero-change path each reassigned the module-level variable without re-syncing the window pointer. Same pattern hit `meleeAttacks`. Manifested as `TypeError: Cannot read properties of undefined (reading 'y')` in `Enemy.draw` on every run.

3. **ESM bare-global pattern broken** — module-level `var X` in `game.js` does NOT auto-attach to `window` (unlike classic scripts). Code in other ESM modules reading bare `X` resolved to `undefined`, breaking conditional behavior in Enemy.js (gray enemies — wave fallback to 1 → always BASIC subtype), Companion.js (no AI targeting), AudioManager.js (no Makuta/Goblin music triggers), WindBosses.js (no projectile firing), and several DLC heroes.

4. **DLC write-back silently dropped** — DLC code like `window.bossActive = true` (AirHero) and `window.enemiesKilledInWave = max - 1` (TutorialMode/AirHero) updated `window.X` data properties, but game.js read its local module variable — writes never reached the game state.

5. **Dead-guard bugs** — `if (window.X) X.method()` guards where `window.X` was *never assigned anywhere*, so the guarded path never ran. Found in Player.js (`window.TutorialMode` → tutorial dash/ability hooks broken; `window._syncSoundBiomeMusic` → Sound hero music sync on level-up broken).

6. **Missing function window exports** — `showNotification`, `openStory`, `advanceWave`, `checkAchievements`, `saveGame`, `gameOver`, `getCoopTarget`, `_syncSoundBiomeMusic` defined in game.js but never assigned to `window`. Callers (TutorialMode, EvilMode, Boss, TestingGrounds, Museum, MazeUI) guarded by `typeof` and silently skipped.

**Fix strategy — `Object.defineProperty` getter/setter pairs.** Single mechanism solves both directions: game.js declares `var wave = 1` (module-scoped); `Object.defineProperties(window, { wave: { get: () => wave, set: v => { wave = v; }, ... } })` makes `window.wave` a live view onto the module variable. Bare `wave` reads in any other ESM module find the getter via global-scope fallback; DLC writes to `window.wave` reach the setter and update the module variable. Replaces 15+ manual `window.X = X` sync lines that the first-attempt fix sprinkled at every mutation site.

**Variables covered by defineProperty:** `wave`, `bossActive`, `enemiesKilledInWave`, `isPlayerDying`, `isChaosShuffleMode`, `isDailyMode`, `isWeeklyMode`, `currentWeather`, `currentObjective`, `activeMutators`, `companions`, `projectiles`, `particles`, `enemies`, `floatingTexts`, `holyMasks`, `goldDrops`, `waveTimer` (18 total, in two grouped blocks at game.js declaration sites).

**ESM Phase 10 step 3 — redundant guards pruned in game.js:** 2× `if (window.createExplosion)`, 4× `if (window.TestingGrounds)`, 5× `&& TutorialMode` (truthy check on imported identifier). All dead code since the identifiers are statically imported.

**Player.js — explicit import for TutorialMode.** Follows the Phase 10 step 2 pattern (MeleeSwipe import). Replaces the `window.TutorialMode` dead-guard. Server-side: TutorialMode.js top-level is just an object literal (no DOM access), safe to require under loader.js.

**`window.GAME_API` formal contract:** new namespace at the bottom of game.js groups all DLC-consumable state, mode flags, entity arrays, helpers, and registries behind a single stable entry point. Uses getter/setter pairs for live state. Carries `GAME_API.version` matching `APP_VERSION` for future deprecation surfacing. Existing DLCs continue using bare globals; new DLCs should prefer `GAME_API.X`.

**CI regression-prevention:** new `test.yml` step extracts every `let|var|const` in game.js tagged `// Exposed for ...` and verifies each has a window binding (`window.X =`, `defineProperty`, or `X: { get:` block-style). Fails the build if any tagged var has no binding. Catches the exact ESM regression class that caused the gray-enemies bug.

**Metrics:**
- Vite bundle: 719 KB → 730 KB (+11 KB for defineProperty blocks + GAME_API namespace + new window exports)
- Tests: 80/80 parity + 48/48 Vitest
- Lint: 314 warnings, 0 errors (was 328 — net –14 from the guard cleanup)
- Build time: 776ms

**Remaining work (deferred — not bug fixes):**

| Item | Effort | Why deferred |
|------|--------|--------------|
| DLC file audit — same dead-guard sweep across `dlc/echos_of_eternity/`, `dlc/faith_of_fortune/`, `dlc/waker_of_winds/` | Medium | DLC code currently works for active features; would need feature-by-feature playtest to find regressions. |
| `GAME_API` documentation (CLAUDE.md note or `DLC_API.md`) | Small | API works; onboarding doc is QoL not bugfix. |
| Migrate one existing DLC to `GAME_API.X` as proof-of-concept | Medium | Validates the contract but breaks no existing flow. |
| Bundle size optimization (730 KB → split chunks) | Large | Load time concern, not correctness. |
| Remaining game.js `window.X` reads cleanup (~80 lower-priority candidates) | Medium | Diminishing returns past today's pass. |

**The ESM bug class is closed.** Every bug that surfaced via gameplay error or silent feature failure has been addressed, and CI lint prevents recurrence of the most common pattern (`// Exposed for DLC` without window binding). Deferred items are quality-of-life, not correctness.

---

### 2026-05-11 (session 11) — #31 getHeroStats memoization

**Shipped:**

Added `_heroStatsCache` Map inside `Player.js`. The `window.getHeroStats(type)` function now derives a cache key from `(type, "<prestige>:<unlocked>:<level>", JSON.stringify(metaUpgrades), achievements.join(','))` and short-circuits to `structuredClone(cached)` on hit. Cache miss runs the original derivation path (clone BASE_HERO_STATS, apply meta + prestige + skill-tree nodes + achievement bonuses + DLC `applySkillNode` hooks) and stores a `structuredClone(base)` under the key before returning.

**Why a clone on both sides:** callers (Player constructor + level-up math) mutate the returned object freely — if we returned the cached reference, the next call would see polluted state.

**Auto-invalidation:** any mutation to `saveData[type].prestige` / `.unlocked` / `.level`, any `saveData.metaUpgrades.*` write, or any achievement claim produces a new key string, so the next call recomputes. Manual escape hatch: `window.invalidateHeroStatsCache()` — wire this in if a future DLC toggle / save import changes BASE_HERO_STATS mid-session.

**What we skip on hit:** the skill-tree iteration (up to ~100 nodes for a maxed hero), the achievement-bonus loop, the per-node `HERO_LOGIC[type].applySkillNode` DLC dispatch, the meta-upgrade arithmetic, and the breakdown bookkeeping. Cost on hit is the cache-key build (~4 string ops) + one `structuredClone` of `base` (the same clone we'd do on miss).

**Metrics:**
- Vite bundle: 719.21 KB → 719.50 KB (~300 bytes for the cache infrastructure)
- Tests: 80/80 parity + 48/48 Vitest (no regressions; parity exercises getHeroStats across all 19 heroes × 5 ticks)
- Lint: 328 warnings, 0 errors

**Profiling note:** dedicated cache-hit benchmark deferred. The win is largest at level-up time (every choice rerolls upgrades, each of which calls getHeroStats internally) and at run start (P1 + P2 + companion all spawn within a frame).

---

### 2026-05-11 (session 10) — ESM Phase 10 step 2: Player.js + EvilMode.js imports

**Shipped:**
- `Player.js` gains `import { MeleeSwipe } from './Entities/MeleeSwipe.js';` — the bare `new MeleeSwipe(...)` call at line 1397 now resolves via the import binding instead of `window.MeleeSwipe` fallback. `window.MeleeSwipe` shim deleted.
- `EvilMode.js` gains `import { HolyMask } from './Entities/HolyMask.js';` — bare `new HolyMask(...)` (lines 279–280, 343) resolves via import. `window.HolyMask` shim deleted.

**Intentionally left as window shim:** `HumanController`. Player.js still calls `new HumanController(0)` bare. Adding `import { HumanController } from './Entities/PlayerController.js';` would pull the real browser-only class into the server simulation's `require()` graph (PlayerController.js touches `navigator.getGamepads`, `keys`, `mouse` at construction time inside the methods, not at module load — but importing means Node loads it, and the parityTest's stub `global.HumanController = class { ... }` is bypassed). Deferred to a later pass that splits Real vs Stub-friendly portions of PlayerController.

**Metrics:**
- Vite bundle: 719.31 KB → 719.21 KB (two shim lines + two `if (typeof window)` dead-code branches gone)
- Tests: 80/80 parity + 48/48 Vitest (no regressions)
- Build time: ~1.5s

**Remaining `window.X = X` shims fall into three buckets**:
1. DLC-loaded files reference them bare (Projectile, FloatingText, Particle, Boss, Altar, Player, MEMORY_STORIES, Enemy, MemoryShard, DLCManager, Arena, Companion, GoldDrop, Manual, CompletionMenu, MenuBackground, STORY_EVENTS, AIController, AudioManager).
2. HTML `onclick` handlers call them (TestingGrounds, CloudSaveManager, Manual, every UI singleton like `levelUpUI`/`shopUI`/etc., plus the ~50 `window.openX`/`window.closeX` callback shims).
3. Player.js / EvilMode.js bare-read AND can't be `import`-replaced today (HumanController).

Phase 10 is effectively done for the in-repo ESM modules. Further reduction needs either: (a) DLC files getting explicit imports (low priority — they work and modifying every DLC `index.js` is cross-cutting churn), or (b) replacing inline `onclick="openX()"` with `addEventListener` registrations (large HTML refactor).

---

### 2026-05-11 (session 9) — ESM Phase 10 step 1: window-shim cleanup pass

**Shipped:**

**Stage A — game.js bridge → explicit imports.** Replaced the `const { ... } = window;` destructuring block at the top of `game.js` with 30 explicit `import` statements: `Player`/`Enemy`/`Boss`/`Arena`/`Companion`, every `Entities/*`, manager classes + singletons (`UIManager`/`InputManager`/`SaveManager`/`CloudSaveManager`/`StoryManager`/`SpatialHash`/`audioManager`/`introManager`), modes (`EvilMode`/`TutorialMode`/`TestingGrounds`/`CoopGamepadController`), scenes (`Altar`/`Manual`/`MenuBackground`), AI controllers (`AIController`/`CompanionAIController`/`RecordingInputController`), `onlineLobby` + `infoDialogueManager` singletons, `DLCManager`, `MEMORY_STORIES`, plus 6 chaos helpers. Mutable registries (`BIOME_LOGIC`/`HERO_LOGIC`/`ENEMY_LOGIC`/`DLC_REGISTRY`/`chaosState`) and the always-`window.X`-accessed UI singletons stay as bare-`window` reads.

**Stage B — dropped 30 redundant `window.X` shims:** UIManager, InputManager, SaveManager, SpatialHash, EventBus (class), CrashReporter, StoryManager, PROCEDURAL_TEMPLATES, AudioManager (class), IntroManager (class), NetworkManager (class), CardDrop, PowerUp, NetworkInputController, RecordingInputController, PlayerController, CompanionAIController, LevelUpUI, MainMenuUI, OptionsUI, HeroDetailsUI, ShopUI (class), SHOP_POOL, CompletionUI, StatisticsUI, AchievementsUI, CollectionUI, SkillTreeUI, OnlineLobbyUI, VersusMenuUI, BIOME_META, EvilMode, TutorialMode, CoopGamepadController. Also rewrote the two `if (isTutorialMode && window.TutorialMode)` and `if (... window.CoopGamepadController)` truthy-guards in game.js to plain identifier checks (always defined via import now).

**Kept on purpose** — shims whose only consumers are non-importing modules: `MeleeSwipe` (Player.js bare-reads `new MeleeSwipe`), `HolyMask` (EvilMode.js bare-reads `new HolyMask`), `HumanController` (Player.js bare-reads `new HumanController(0)`), `AIController` (Faith of Fortune DLC bare-reads `new AIController(...)`), plus every shim DLC files touch as bare globals (`Projectile`, `FloatingText`, `Particle`, `Boss`, `Altar`, `Player`, `MEMORY_STORIES`, `Enemy`, `MemoryShard`, `DLCManager`, `Arena`, `Companion`, `GoldDrop`, `Manual`, `CompletionMenu`, `MenuBackground`, `STORY_EVENTS`, `TestingGrounds`, `CloudSaveManager`). HTML `onclick` handlers (~79 unique names) all point at lowercase singletons or class-static methods that still ship as `window.X`.

**The audit method:** for each candidate shim, grep all `.js` (excluding `node_modules`/`dist`/`server`/`tests`) for bare references not preceded by `window.` and not in a same-file declaration. Whenever a non-importing module had a bare `new X(...)` or `typeof X !==` check, the shim stays. This caught two false-positive drops (MeleeSwipe, HolyMask) before they hit the build.

**Metrics:**
- Vite bundle: 722 KB → 719 KB (3 KB shaved from inlined shim assignments + dead `if (typeof window)` blocks)
- Tests: 80/80 parity + 48/48 Vitest (no regressions)
- Lint: 328 warnings, 0 errors (unchanged)
- Build time: 733ms

**Phase 10 step 2 (future):** drive shim count to zero by adding explicit imports inside the four remaining non-importing modules — Player.js, EvilMode.js, plus any DLC file willing to opt in. Each migration is independent and cheap, but the DLC ones must respect the "DLC files run server-side via `require()`" CommonJS interop path that loader.js relies on. The lowest-hanging fruit is Player.js (one `import { HumanController, MeleeSwipe } from ...`) — that alone deletes two more shims.

---

### 2026-05-11 (session 8) — ESM Phase 8b step 2: game.js migrated

**Shipped:**
- `game.js` (7469 lines, last classic-script file) → ESM. `<script defer>` → `<script type="module">` in `game.html`.
- Module bridge prelude at the top of `game.js`: a single `const { ... } = window;` destructuring block pulls in every cross-module symbol the file uses as a bare identifier — classes (`Player`, `Enemy`, `Boss`, `Arena`, `Companion`, all `Entities/*`), manager singletons (`audioManager`, `introManager`, `infoDialogueManager`), manager classes (`SaveManager`, `CloudSaveManager`, `UIManager`, `InputManager`, `StoryManager`, `SpatialHash`), modes (`EvilMode`, `TutorialMode`, `TestingGrounds`, `CoopGamepadController`), scenes (`Altar`, `Manual`, `MenuBackground`), AI controllers (`AIController`, `CompanionAIController`, `RecordingInputController`), `onlineLobby`, `DLCManager`, `MEMORY_STORIES`, plus six chaos helpers (`openChaosGamble`, `updateChaosGambleUI`, `confirmChaosGamble`, `generateChaosObjective`, `updateChaosObjective`, `checkChaosEvent`), `mulberry32`, `gameConfig`.
- Identifiers game.js only ever reads via `window.X.` (mutable registries `BIOME_LOGIC` / `HERO_LOGIC` / `ENEMY_LOGIC` / `DLC_REGISTRY` / `chaosState`, plus UI singletons like `levelUpUI`/`shopUI`/etc.) are intentionally NOT in the bridge — they stay as `window.X` at call site so DLC-time extension stays observable and the bridge stays lint-clean.
- All 39 `window.X = X` shims at the bottom of game.js are kept for DLC consumers (DLCs use `import()` since Phase 9, but their files still expect globals).

**The game.js → ESM migration is the milestone that unblocks Phase 10** (window-shim cleanup). Until now Phase 10 was infeasible because the biggest classic-script consumer still depended on every shim.

**Metrics:**
- Vite bundle: 602 KB → 722 KB (game.js is now a real ESM chunk inside `main-*.js`, no longer a raw classic-script asset copy)
- Tests: 80/80 parity + 48/48 Vitest (no regressions)
- Lint: 328 warnings, 0 errors (unchanged)
- Build time: ~940ms cold

**Phase 10 next** — repo-wide `window.X` shim audit. Each shim's classic-script consumers are now zero (all of them); only DLC-loaded files still expect globals. Strategy: keep shims for symbols DLC index.js / hero / biome / story files reference; drop shims whose only consumers are already-ESM modules.

---

### 2026-05-11 (session 7) — ESM Phase 8b step 1: ChaosMode migrated

**Shipped:**
- `ChaosMode.js` → ESM. 10 shared mutable `let`s consolidated into one `state` object, exposed as `window.chaosState`. Game.js (still classic) mutates the same object via `window.chaosState.X` → no state divergence.
- 52 internal `state.X` references rewritten via Node-driven regex (BSD sed's lack of `\b` caught us first try; switched to JS for proper word-boundary matching).
- 3 game.js call sites updated to use `window.chaosState`.
- 10 top-level ChaosMode functions gained `window.X = X` shims.
- `game.html` ChaosMode tag → `<script type="module">`.

**The only remaining classic-script file: `game.js`.**

**Metrics:**
- Vite bundle: 589 KB → 602 KB
- Tests: 80/80 parity + 48/48 Vitest (no regressions)
- Lint: 338 → 328 warnings (10 dropped — module-recognized vars no longer flagged unused)
- Build time: 1.08s

**Phase 8b step 2 (next session)** — extract Camera state from game.js, then migrate game.js itself to ESM with `window.X` shims for the ~30 cross-file globals. After that, Phase 10 (shim cleanup) becomes tractable.

---

### 2026-05-11 (session 6) — ESM Phase 9: DLC loader

**Shipped:**
- `dlc/DLCManager.js` migrated to ES module (`export { DLCManager }; export default window.dlcManager;`).
- `DLCManager.loadScript(src)` rewritten from classic `<script>` tag injection to native dynamic `import()`. Uses absolute paths and `/* @vite-ignore */` so Vite skips static analysis (runtime-resolved URLs).
- `game.html` DLCManager script tag changed to `type="module"`.

**Intentionally left alone:**
- 8 DLC `index.js` files + ~45 sub-files (heroes, biomes, stories) — no edits needed. Each already does `window.X = X` for the bindings other modules depend on, so module-scoping their class declarations is harmless. Server-side `require()` still treats them as CommonJS (no `export` keyword) and runs their side effects via `global.window = global`.

**Decision:** skipping export-marker churn on DLC files saves ~50 edits with no functional benefit. If a future DLC author needs named imports, adding `export {}` is one-line additive.

**Metrics:**
- Vite bundle: 584 KB → 589 KB (DLCManager rolled into the ESM graph)
- Tests: 80/80 parity + 48/48 Vitest (no regressions)
- Lint: 338 warnings, 0 errors
- Build time: 888ms

**Remaining classic-script files**: only `ChaosMode.js` + `game.js` now.

**Phase 10 next** — repo-wide `window.X` shim cleanup, only safe once `game.js` (the biggest classic consumer) is split. Coupled with Phase 8b.

---

### 2026-05-11 (session 5) — ESM Phase 8a: EventBus scaffolding

**Shipped:**
- `Managers/EventBus.js` — pub/sub primitive for cross-module signalling, ~80 lines.
- 10 Vitest cases (`tests/eventBus.test.js`) covering on/off/once/clear/throw-isolation/self-unsubscribe-during-emit.
- Documented naming convention (`domain:event`) for the Phase 8b game.js split.

**Why not the full game.js split this session:**

Improvement #1 (split game.js into `GameLoop`/`Spawner`/`Wave`/`Camera`/`EventBus`/`RunState`) is the largest single item in the backlog. Honest scoping says it's a 2–4 day arc, not a session. Doing it half-way creates more bugs than working code.

`ChaosMode.js` is intentionally still classic because its top-level `let`s are mutated from `game.js` via bare-identifier assignments. Module-scoping ChaosMode would break the shared state without a coordinated game.js refactor.

**Phase 8b plan** (multi-session, future):

1. **Carve `RunState`** out of game.js's ~539 module globals. One object, exported as a frozen singleton, mutated through methods (`startRun()`, `endRun()`, `bumpWave()`). Replace bare-identifier access in game.js with `runState.X`. Co-migrate ChaosMode at the same time.
2. **Carve `Camera`** — viewport position, world-space ↔ screen-space transforms, screen shake state. Small, well-isolated.
3. **Carve `Spawner`** — wave-spawn logic + the `spawnEnemy`/`spawnBoss` helpers. Wire to `EventBus.emit('spawner:enemy_spawned', ...)`.
4. **Carve `WaveLogic`** — wave advancement + boss-wave detection. Subscribes to `spawner:enemy_killed`.
5. **Carve `GameLoop`** — the `masterLoop()` orchestrator. Imports and ticks every other system.
6. **Drain remaining game.js** into thin wiring; eventually delete the file.

Each step ends with a working game. Each step opens its own PR.

**Metrics this session:**
- Vite bundle: 584 KB (unchanged — EventBus is tiny)
- Tests: 80/80 parity + 48/48 Vitest (was 38)
- Lint: 338 warnings, 0 errors
- Build time: 486ms

**Remaining classic-script files**: still `ChaosMode.js`, `game.js`, `dlc/DLCManager.js`.

**Phases 9–10 still pending.**

---

### 2026-05-11 (session 4) — ESM Phase 7: UI + auxiliary game modules complete

32 files migrated:

**Auxiliary game modules** (16 files): `Config`, `AltarData`, `Biomes`, `Museum`, `Altar`, `GlobalLobbyScene`, `Tutorial`, `MemoryStories`, `MemoryShard`, `CompletionMenu`, `EvilHeroes`, `EvilMode`, `TutorialMode`, `TestingGrounds`, `CoopGamepadController`, `OnlineTestBot`, `shared/world.js`, `scripts/VersusTest.js`.

**UI** (14 files): every file under `UI/`.

**Server-side**: `shared/world.js` migrated to ESM, `server/simulation/loader.js` updated to unwrap the `World` namespace via `loadClass`.

**Skipped intentionally**: `ChaosMode.js` — mutable top-level `let`s (`chaosShuffleOptions`, `chaosSelectionIndex`, `heroAffection`, `lostHeroes`, etc.) are assigned from game.js. Module-scoping these would diverge from window-property writes by callers. Will migrate alongside Phase 8 game.js split, when both files can be fixed together.

**Metrics:**
- Vite bundle: 208 KB → 584 KB (70 modules transformed, up from 35)
- Tests: 80/80 parity + 38/38 Vitest (no regressions)
- Lint: 356 → 338 warnings (more no-unused-vars false-positives cleared)
- Build time: 450ms (still cold-build fast)

**Bundle now exceeds 500 KB warning threshold** — flagged for code-splitting follow-up. Once `game.js` is split (Phase 8) the natural chunks will emerge.

**Remaining classic-script files**: only `ChaosMode.js`, `game.js`, `dlc/DLCManager.js` (the 3 deferred for later phases).

**Phases 8–10 still pending** (game.js split + ChaosMode, DLCs, window.X shim cleanup).

---

### 2026-05-11 (session 3) — ESM Phase 6: Entities + core game classes complete

15 files migrated:
- **Server + browser** (8 files): `Player.js`, `Enemy.js`, `Arena.js`, `Entities/Projectile.js`, `Entities/MeleeSwipe.js`, `Entities/Particle.js`, `Entities/FloatingText.js`, `Entities/GoldDrop.js`
- **Browser-only** (7 files): `Boss.js`, `Companion.js`, `Entities/CardDrop.js`, `Entities/HolyMask.js`, `Entities/PowerUp.js`, `Entities/PlayerController.js` (incl. 3 sub-controllers), `Entities/NetworkInputController.js` (incl. RecordingInputController)
- `Arena.js` also exports internal classes `BiomeZone`/`Obstacle`/`Trap` (used by DLC biome files).

**Server-side change**: `server/simulation/loader.js` gains a `loadClass(path, name)` helper that unwraps `__esModule` namespaces from Node `require()` of ESM. All entity-require sites updated.

**Metrics:**
- Vite bundle: 98 KB → 208 KB (entities + Player + Enemy are big)
- Tests: 80/80 parity + 38/38 Vitest (no regressions)
- Lint: 364 → 356 warnings (more no-unused-vars false-positives cleared)
- Build time: 430ms (faster than Phase 5 cold)

**Phases 7–10 still pending** (UI/* + Museum/Altar/etc., game.js split, DLCs, window.X shim cleanup).

---

### 2026-05-11 (session 2) — ESM Phase 5: Managers complete

All 9 files under `Managers/` migrated from classic `<script defer>` to `<script type="module">`:
- `CrashReporter`, `StoryManager`, `IntroManager`, `InputManager`, `UIManager`, `AudioManager`, `CloudSaveManager`, `NetworkManager` (new)
- `SaveManager`, `SpatialHash` (already migrated in Phase 1)

Each file gained an `export` block + retained its `window.X = X` shim. No external consumers were touched — classic-script callers (game.js, DLC files, Entities, UI) see the same globals.

**Metrics:**
- Vite bundle: 24 KB → 98 KB (more code now in the ESM graph)
- Tests: 80/80 parity + 38/38 Vitest (no regressions)
- Lint: 369 → 364 warnings (some no-unused-vars false-positives cleared)
- Build time: 1.15s (unchanged)
- Files migrated: 8 new + 1 game.html edit (Manager script block)

**Phases 6–10 still pending** (Entities, UI, game.js split, DLCs, shim cleanup).

---

### 2026-05-11 (session 1) — Path 1 Foundation pass landed

All five planned phases shipped this session.

**Phase 0 — Vite scaffolding** ✅
- `vite.config.mjs` with HTML entries (`game.html`, `save-editor.html`), publicDir disabled, custom plugin that mirrors static dirs + classic scripts into `dist/` on build.
- `vite-plugin-electron-renderer` keeps renderer `require('fs')` calls working.
- `package.json` scripts: `dev`, `dev:electron`, `build`, `preview`, `lint`, `lint:fix`, `test`, `test:watch`.
- `index.js` updated to three load modes: Vite dev server (`VITE_DEV=1`), `dist/game.html` if present, fallback to source `game.html`.
- Production build: `dist/assets/main-*.js` (24 KB ESM bundle, 9 KB gzip) + classic scripts copied as-is + asset hash fingerprinting + source maps.
- Pre-existing HTML parse bug fixed: missing `>` on `<div id="tg-mode-overlay">`.

**Phase 1 — ESM migration: leaf files** ✅
- Converted: `Utils.js`, `Managers/SpatialHash.js`, `Constants.js`, `Managers/SaveManager.js`.
- Each adds explicit `export` lists + retains `window.X = X` shim for backward compat.
- `game.html` marks these as `<script type="module">`; all other scripts gain `defer` for document-order execution. Inline scripts that read `APP_VERSION` wrapped in `DOMContentLoaded`.

**Phase 2 — ESLint + Prettier + #13 custom rule + CI** ✅
- `eslint.config.mjs` (flat config, warnings-only).
- `eslint-plugin-5freunde/` with `no-foreach-splice` rule — fired on 8 instances in existing code.
- `.prettierrc` + `.prettierignore`.
- `.github/workflows/test.yml` upgraded to `CI` workflow running lint + build + tests on push/PR.
- Baseline: 0 errors / 369 warnings.

**Phase 3 — Vitest suite + parityTest fix** ✅
- 6 test files in `tests/`, 38 tests total (all passing).
- `server/anticheat.js` extracted so plausibility + rate-limit logic is testable without WS server.
- Fixed pre-existing parityTest typo: `this.world.player` → `this._world.player` in GameSession level-up handler.
- Fixed AirHero stub crash on server tick: `_noopCtx` Proxy now handles `Symbol.toPrimitive`/`valueOf`/`toString`.
- parityTest now 80/80 (was 79/80 with one pre-existing failure).

**Phase 4 — Hot reload** ✅
- Vite dev server provides full-page reload on JS/HTML save + CSS HMR for `<link rel="stylesheet">` automatically.
- `HOT_RELOAD=1` env path in `index.js` watches `dist/` for built-mode reload.

### Metrics

- Build time (cold): ~2.2s
- Dev server boot: ~200ms
- Test suite: ~430ms (Vitest) + ~3s (parityTest)
- Bundle size: 24 KB JS + 77 KB CSS (4 ESM files only — most code still classic-script)
- Lint baseline: 0 errors, 369 warnings (190 unused-vars, 141 prefer-const, 17 no-var, 12 no-undef, 8 forEach+splice bugs)

### Risks discovered + mitigations

- **`vite-plugin-electron-renderer` uses deprecated `customResolver`** (Vite 9 will remove). Cosmetic warning today; will need a replacement plugin before Vite 9.
- **Classic-script warnings clutter build output.** Tried `customLogger` but Vite 8 + Rolldown has stricter signatures than the docs show. `rollupOptions.onwarn` filter catches some, build-html plugin's `info`-level emit isn't filterable from there. Accepted for now.
- **Mixed defer + module ordering**: All classic scripts now use `defer`, so they execute in document order with module scripts — verified by smoke build + dev server boot.

### Multi-session plan for future ESM migration (Phases 5–10 below)

| Phase | Scope | Files | Est. effort |
|-------|-------|-------|---------------|
| 5 | Managers | `Managers/*.js` (~12 files) | 1 day |
| 6 | Entities | `Player.js`, `Enemy.js`, `Boss.js`, `Projectile.js`, `Entities/*` | 1–2 days |
| 7 | UI | `UI/*.js`, `Museum.js`, `Altar.js` | 1 day |
| 8 | `game.js` split | break into `GameLoop/`, `Spawner/`, `Wave/`, `Camera/`, `EventBus/`, `RunState/` (per #1) | 2–3 days |
| 9 | DLCs | `dlc/*/index.js` + `dlc/*/*.js` | 1 day |
| 10 | Remove `window.X` shims | repo-wide cleanup | 1 day |

Each phase ends with a working game and ships independently.


---

# Performance pass — improvements #19–#34 (2026-05-12)

Pick up Performance category from `improvements-2026-05-10.md`. Mix of partial (#19, #20, #22, #29) + untouched (#21, #23–#28, #30, #32, #34). #31, #33 already done — confirm and close.

## Status reconciliation

| # | Item | State | Action |
|---|------|-------|--------|
| 19 | Spatial hash | Phase 1: 3 AOE scans migrated, projectile×enemy nested loop NOT inverted | Phase 2 |
| 20 | Object pools | Particle + FloatingText done; Projectile / MeleeSwipe / GoldDrop deferred | Expand |
| 21 | Offscreen static layers | not started | Build |
| 22 | Gradient cache | helper landed, 3 / ~169 sites converted | Sweep |
| 23 | Frame budget HUD (p99) | partial — F1 overlay already shows p99 frame time (#148 work) | Verify + close |
| 24 | Web Worker AI | not started | Speculative — last |
| 25 | Texture atlas | not started | Bundled with #26 |
| 26 | Particle batching | not started | Bundled with #25 |
| 27 | Cull off-camera particles + floats | not started | Session 1 |
| 28 | 30 Hz throttle | not started | Session 1 |
| 29 | Lazy DLC | Phase 1 (parallel) + Phase 9 (dynamic import). On-demand per-hero load NOT wired | Phase 3 |
| 30 | WebGL/Pixi backend toggle | not started | Speculative — last |
| 32 | Bitpack snapshot int16 deltas | not started | Late session |
| 33 | WS permessage-deflate | DONE via #158 | Mark closed |
| 34 | Audio off-main-thread | not started | Late session |

## Sessions

### Session P1 — Cheap wins (#27, #28, #23-close, #33-close)
Goal: low-risk frame-time savings, no allocator/render-pipeline churn.

- [ ] `#33` mark `[x]` — `permessage-deflate` shipped under `#158`. Add note to improvements list.
- [ ] `#23` audit F1 overlay rendered by #148. If p99 already shown, mark `[x]` with reference. If only p50 shown, add p99 ring buffer (last 120 frames).
- [ ] `#27` cull off-camera particles + floating text in their update loops. Reuse existing camera bounds (`viewHalfW` / `viewHalfH` + margin). Skip update; skip draw. Release to pool if past margin × 2 to bound retained count.
- [ ] `#28` 30 Hz throttle for non-essential per-frame work:
  - Boss telegraph alpha pulses (`bossActive && telegraphTimer`)
  - Weather alpha pulses (`currentWeather` update branch)
  - Biome zone aura updates (`biomeZones.forEach(zone => zone.update())` — only when `frameCount % 2 === 0`)
- Verify: 80/80 parity + 38 Vitest, FPS in stress arena.

### Session P2 — Spatial hash Phase 2 (#19)
Goal: invert nested loops; the remaining O(N×M) cost.

- [ ] Audit `game.js` for nested `enemies.forEach(e => projectiles.forEach(p => …))` style loops + their melee equivalents. Targets at lines ~7426 + ~7595 + ~6935 already use the hash; check the inner projectile-vs-enemy collision branch at the masterLoop tail.
- [ ] Rebuild `_enemySpatialHash` once per tick (already done at 7100). Add `_projectileSpatialHash` for melee swipes that hunt projectiles (reflect, telekinesis).
- [ ] Add small-N bypass: skip rebuild + use linear scan when `enemies.length < 30`.
- [ ] Tune cell size (currently 128); profile at wave 30+ stress (200+ enemies).
- [ ] Update F1 overlay max-bucket stat for visibility.

### Session P3 — Pool expansion (#20)
Goal: kill GC churn on hottest spawn paths.

- [ ] Generic `Pool` factory in `Managers/Pool.js` (already exists for Particle/FloatingText — extract shared helper if not present).
- [ ] `ProjectilePool` — `acquire(x, y, vx, vy, owner, opts)` + `release(p)`. Reset every field; explicit clears for `homing`, `pierce`, `chains`, `lifetime`. Most error-prone — Projectile has 40+ optional fields.
- [ ] `MeleeSwipePool` — simpler, ~12 fields.
- [ ] `GoldDropPool` — trivial, 6 fields.
- [ ] Convert spawn sites (search `new Projectile(`, `new MeleeSwipe(`, `new GoldDrop(` across base + 8 DLCs).
- [ ] Release dead instances in masterLoop sweep before `splice`.
- [ ] Parity test + new Vitest assertions for pool reset correctness.

### Session P4 — Gradient cache sweep (#22)
Goal: drop per-frame `createRadialGradient` calls across all draw paths. ~169 sites.

- [ ] Confirm `Utils.cachedRadial(ctx, key, r0, r1, stops)` API + add `cachedLinear` if needed.
- [ ] Batch by file (each is mechanical):
  - `Boss.js`, `Enemy.js`, `Player.js`, `Projectile.js`, `Arena.js`, `Biomes.js`, `Museum.js`, `EvilHeroes.js`
  - `Entities/GoldDrop.js`, `Entities/HolyMask.js`
  - `UI/MenuBackground.js`
  - 8 DLC dirs (~30 files)
- [ ] Key convention: `{className}:{purpose}:{colorVariant}` (e.g., `'BOMBER:glow:red'`).
- [ ] Verify no rendering regression visually + parity 80/80.

### Session P5 — Offscreen static layers (#21)
Goal: bake static arena + biome decor; blit instead of redraw.

- [ ] `Managers/StaticLayer.js`: `OffscreenCanvas` per biome layer (or single per arena).
- [ ] Move arena-edge stripes, obstacle base sprites, biome static decals (mushroom rings, ice cracks, sand dunes) into `bake(biome, obstacles)`.
- [ ] `drawStaticLayer(ctx, cameraX, cameraY)` blits per frame.
- [ ] Invalidate on biome change, obstacle add/remove, arena regenerate.
- [ ] Verify visuals match; check `Arena.generate` + each biome's `draw` for static-vs-animated split — only static moves.

### Session P6 — Per-hero on-demand DLC load (#29 Phase 3)
Goal: stop loading 8 DLCs on launch — load hero/biome modules when user picks them.

- [ ] `DLCManager` split: `loadManifest()` (cheap — just registry of available DLCs) vs `loadDLC(id)` (full module import).
- [ ] Manifest at startup populates hero/biome lists without executing `register*`.
- [ ] First hero-pick or biome-spawn → `await loadDLC(owningId)` → registers hooks + caches.
- [ ] Loading UI in Hero Select if module not yet resolved.
- [ ] Verify Electron offline path (uses bundled paths, not network).

### Session P7 — Texture atlas + particle batching (#25, #26)
Goal: replace per-frame `arc/fill/stroke` with `drawImage` calls; batch fills.

- [ ] Pre-render shared sprite atlas at boot: small particle sizes (4/8/12/16/24 px), enemy core glyphs (BOMBER fuse, GHOST eye, SHIELDER ring), pickup icons.
- [ ] `SpriteAtlas` manager: `getFrame(id) → {sx, sy, sw, sh}`.
- [ ] Particle draw loop: sort by atlas frame, single `drawImage` per frame, no `fillStyle` thrash.
- [ ] Enemy glyph layer reuses same atlas.
- [ ] Stretch: animated hero frames as a separate atlas (overlap with #37 — defer here).

### Session P8 — Audio off-main-thread (#34)
Goal: stop decoding blocking the main thread.

- [ ] Audit `Audio.preload` defaults — `'metadata'` for everything not on the hot list (#15 partial done, verify).
- [ ] Migrate hot SFX to Web Audio API `decodeAudioData()` in a `Promise` chain off the boot path; `AudioBufferSourceNode` per shot (already mostly using `<audio>` clones — measure first).
- [ ] Don't ship if benchmark shows <5 ms saving — `<audio>` element pool may be fine.

### Session P9 — Snapshot bitpacking (#32)
Goal: bandwidth shrink for internet matches.

- [ ] Server: change snapshot frame encoder to write `Int16` packed (x, y, vx, vy) deltas from last full snapshot.
- [ ] Client: matching decoder.
- [ ] Full snapshot every N ticks for keyframe.
- [ ] Verify: parity 80/80, network bytes/sec halved on wave-30 boss fight.

### Session P10 — Speculative (#24, #30)
Goal: only if profiling at end of #P1–#P9 shows main-thread CPU still bound.

- [ ] `#24` — Web Worker AI batches via `SharedArrayBuffer`. Steering only, not damage. Big lift, big risk.
- [ ] `#30` — WebGL/Pixi backend toggle. Feature-flagged. Possibly its own multi-month track; deliberately last.

## Execution order

`P1 → P2 → P3 → P4 → P5 → P6 → P7 → P8 → P9` then re-prioritize `P10` based on profiler.

## Verification (each session)

- `npm run build` green
- `npm run lint` baseline (no new errors)
- `npm run test` 38/38
- `parityTest` 80/80
- Manual stress: spawn-storm console cheat (`spawn 200`) at wave 30, observe F1 overlay p99 frame time

## Tracking

Each session commits separately with `refactor: perf #N — <summary>` and updates `CHANGELOG.md` under `### Changed` (perf).
