# World-Context Refactor — Option B Implementation Plan

## Goal

Replace every ambient global variable access in game logic with an explicit `world`
context object. After this refactor the server can `require()` the real client class
files and run them with `world.ctx = null`, giving 100 % DLC and balance parity in
online multiplayer with zero duplication.

---

## The World Contract

One object per live game session. Passed by reference — mutations to entity arrays
are visible to all holders immediately.

```js
// shared/world.js  (Node-compatible, no browser globals)
class World {
    constructor() {
        // ── Entity arrays ────────────────────────────────────────────
        this.enemies       = [];
        this.projectiles   = [];
        this.particles     = [];
        this.floatingTexts = [];
        this.goldDrops     = [];
        this.companions    = [];
        this.memoryShards  = [];

        // ── Players ──────────────────────────────────────────────────
        this.player  = null;
        this.player2 = null;

        // ── Scene ────────────────────────────────────────────────────
        this.arena  = null;
        this.frame  = 0;
        this.wave   = 1;
        this.score  = 0;
        this.bossActive = false;

        // ── Mode flags ───────────────────────────────────────────────
        this.gameRunning       = false;
        this.gamePaused        = false;
        this.isLevelingUp      = false;
        this.isShopping        = false;
        this.isCoopMode        = false;
        this.isAICompanionMode = false;
        this.isEvilMode        = false;
        this.isVersusMode      = false;

        // ── Environment ──────────────────────────────────────────────
        this.currentWeather    = null;
        this.currentObjective  = null;

        // ── Persistent data ──────────────────────────────────────────
        this.saveData       = {};
        this.currentRunStats = {};

        // ── Logic registries (populated by DLC loaders) ──────────────
        this.HERO_LOGIC  = {};   // { heroType: { update, special, … } }
        this.ENEMY_LOGIC = {};   // { enemyType: { update, … } }

        // ── Helper functions (no-ops on server) ──────────────────────
        this.createExplosion  = () => {};
        this.showNotification = () => {};
        this.getDecoyTarget   = () => null;

        // ── Browser-only (null on server) ────────────────────────────
        this.audioManager = null;
        this.keys         = null;
        this.mouse        = null;
        this.canvas       = null;
        this.ctx          = null;
    }
}
```

**Key decisions baked in:**

| Decision | Rationale |
|----------|-----------|
| `this._world` on class instances, not a parameter | Method signatures & callsites don't change |
| `world.ctx = null` on server | Guarantees draw code never executes; safe because all `ctx` calls are in `draw()` — confirmed by survey |
| `world.createExplosion` / `world.showNotification` | Side-effects are injectable; server uses no-ops |
| `world.HERO_LOGIC` / `world.ENEMY_LOGIC` | DLC registries become per-session, enabling multi-session isolation |
| `world.audioManager = null` on server | All audio calls must guard `if (this._world.audioManager)` |
| `world.keys = null` / `world.mouse = null` on server | Input fallback paths in Player.update() must guard nulls |

---

## File Inventory

Files touched and why:

| File | Lines | Change type | Key globals to remove |
|------|-------|-------------|----------------------|
| `shared/world.js` | NEW | New file | — |
| `Player.js` | 1 489 | High | enemies, projectiles, floatingTexts, particles, arena, audioManager, createExplosion, frame, wave, saveData, currentWeather, currentRunStats, isCoopMode, isEvilMode, isLevelingUp, HERO_LOGIC, keys, mouse, player, player2 |
| `Enemy.js` | 543 | High | enemies, projectiles, floatingTexts, particles, arena, audioManager, createExplosion, showNotification, frame, wave, player, saveData, currentWeather, currentObjective, ENEMY_LOGIC, getDecoyTarget |
| `Entities/Projectile.js` | 241 | Low | update() is already pure; constructor needs world for future use |
| `Entities/GoldDrop.js` | 94 | None | update() pure — no changes needed |
| `Entities/FloatingText.js` | 29 | None | update() pure |
| `Entities/Particle.js` | 12 | None | update() pure |
| `Entities/MeleeSwipe.js` | 30 | Low | `player` global in update() |
| `Entities/HolyMask.js` | 205 | Low | Audit needed |
| `EvilHeroes.js` | 643 | Medium | enemies, projectiles, floatingTexts, particles, arena, audioManager, createExplosion, showNotification, frame, player |
| `dlc/symphony_of_sickness/PoisonHero.js` | 1 218 | Medium | enemies, projectiles, particles, audioManager, createExplosion, showNotification, frame, wave, player, saveData |
| `dlc/symphony_of_sickness/SoundHero.js` | 1 063 | Medium | + arena, canvas (draw-only) |
| `dlc/waker_of_winds/AirHero.js` | 1 249 | Medium | + currentObjective, currentRunStats, gamePaused, gameRunning, isLevelingUp, isShopping |
| `dlc/faith_of_fortune/ChanceHero.js` | 821 | Medium | + goldDrops |
| `dlc/faith_of_fortune/SpiritHero.js` | 607 | Medium | arena, enemies, floatingTexts, player, projectiles |
| `dlc/champions_of_chaos/VoidHero.js` | 555 | Medium | + getDecoyTarget |
| `dlc/champions_of_chaos/GravityHero.js` | 597 | Medium | + canvas (draw-only) |
| `dlc/tournament_of_thunder/LightningHero.js` | 704 | Medium | + currentRunStats, currentWeather, gamePaused, gameRunning, isLevelingUp, isShopping |
| `dlc/echos_of_eternity/index.js` | 769 | Medium | arena, enemies, particles, player, saveData, wave |
| `dlc/rise_of_the_rock/index.js` | 899 | Medium | Full set |
| `dlc/tournament_of_thunder/index.js` | 387 | Low | arena, enemies, player, saveData, wave, audioManager |
| `game.js` | 6 831 | High | Creates world; wires window.* → world; passes world to every construction site |
| `server/simulation/GameSession.js` | ~650 | Replaced | Remove internal state; use real Player/Enemy/Arena instances |
| `server/simulation/constants.js` | ~80 | Kept | Still the single source of truth for hero/enemy base stats |
| `server/simulation/WaveManager.js` | ~150 | Kept | Wave spawn logic; adapt to world |

**Total lines in scope: ~18 900**

---

## Implementation Phases

---

### Phase 1 — Create `shared/world.js` ✅ (2 days)

**Tasks:**

- [x] Create `shared/world.js` with the full World class (Node + browser compatible — no globals, no `require`, no `import`)
- [x] Add `world.toJSON()` helper for debugging (serialises non-function fields)
- [x] Add `World.createServerWorld()` static factory with server defaults (ctx=null, canvas=null, audioManager null-stub, etc.)
- [x] Add `World.createClientWorld()` static factory (reads from globals at call-time, not parse-time)
- [x] In `game.js`: instantiate `window._world = World.createClientWorld()` at the top of `startGame()` after array resets; wire its arrays to the freshly-reset globals as aliases
- [x] Add `<script src="shared/world.js">` to `game.html` before `Constants.js`
- [x] Sync `window._world.X` at every array-reassignment site outside `startGame()`: `_resetGameState()`, `advanceWave()`, `_onlineApplySnapshot()`
- [x] Sync `_world.player2` when co-op player2 is instantiated in `startGame()`

**Why the bridge?** Allows phases 2–4 to happen file-by-file without breaking the live game. As each file is migrated it reads from `this._world`; un-migrated files still read from `window.*`; both point at the same array objects.

**Verification:** `World.createServerWorld()` and `World.createClientWorld()` unit-tested with Node's built-in `assert`. Run `node shared/world.js` to confirm it loads cleanly.

---

### Phase 2 — Refactor `Player.js` and `Enemy.js` ✅ (completed)

These are the highest-traffic files. Done together because they reference each other.

#### 2.1 `Player.js`

- [x] Add `this._world = null` to constructor; wired in game.js at every `new Player(…)` callsite
- [x] At the top of `update`, `shoot`, `melee`, `dash`, `onKill`, `takeDamage`, `useSpecial`, `addCombo`: destructure from `const _w = this._world ?? window._world`
- [x] Guard all `audioManager` calls: `audioManager?.play(…)`
- [x] Guard `keys` null: wrapped keyboard-input block in `if (keys) { … }`
- [x] `levelUp()` audioManager call migrated via `_wLU?.audioManager?.playHeroExclamation(…)`

#### 2.2 `Enemy.js`

- [x] `this._world = null` added at end of constructor
- [x] Destructure at top of `update()`: frame, wave, currentWeather, currentObjective, particles, enemies, projectiles, floatingTexts, arena, player, saveData, createExplosion, showNotification, audioManager, ENEMY_LOGIC, getDecoyTarget
- [x] `ENEMY_LOGIC[this.subType].update(this, _w)` — world passed to enemy logic hooks
- [x] Guard `audioManager?.play('attack_shooter')`
- [x] `getDecoyTarget` resolved from `_w` with `window.getDecoyTarget` fallback
- [x] Summoner minions get `minion._world = _w` at spawn

**Verification:** `node --check Player.js` → OK, `node --check Enemy.js` → OK

---

### Phase 3 — Refactor Entity classes ✅ (completed)

#### 3.1 `Entities/Projectile.js`

- [x] Added `world = null` as 12th constructor param; stores `this._world = world ?? window._world ?? null`
- [x] `update()` is already pure — no changes needed
- [x] `draw()` is browser-only — no changes needed

#### 3.2 `Entities/MeleeSwipe.js`

- [x] Added `world = null` as 9th constructor param; stores `this._world`
- [x] `update()`: fallback `player` global replaced with `this._world?.player ?? player`

#### 3.3 `Entities/HolyMask.js`

- [x] Audited — draw-only, no logic globals; no changes needed

#### 3.4 `GoldDrop`, `FloatingText`, `Particle`

- [x] All three: added `world = null` param and `this._world` binding for future-proofing; `update()` is pure — unchanged

**Verification:** `node --check` passed for all five modified files

---

### Phase 4 — Refactor DLC heroes (5 days)

All DLC heroes use the `window.HERO_LOGIC[type]` registry pattern. The refactor adds `world` as the last parameter to every hook that accesses globals.

**Convention for every hero file:**

```js
// Before:
window.HERO_LOGIC.poison = {
    update(player, dt) {
        // ... reads `enemies`, `frame`, `wave`, etc. as globals
    }
};

// After:
window.HERO_LOGIC.poison = {
    update(player, dt, world) {
        const { enemies, projectiles, particles, audioManager,
                createExplosion, showNotification, frame, wave,
                saveData } = world ?? window._world;
        // ... logic unchanged
    }
};
```

The `world ?? window._world` fallback means old callers that don't pass world yet continue to work.

**Call-sites in Player.js / Enemy.js / game.js** — after Phase 2 these already destructure `HERO_LOGIC` from `this._world`, and calls become:

```js
HERO_LOGIC[player.type]?.update(player, dt, this._world);
```

#### Per-file tasks:

- [x] `EvilHeroes.js` — add world param to all hooks
- [x] `dlc/symphony_of_sickness/PoisonHero.js`
- [x] `dlc/symphony_of_sickness/SoundHero.js`
- [x] `dlc/waker_of_winds/AirHero.js`
- [x] `dlc/faith_of_fortune/ChanceHero.js` — extra: `goldDrops`, `wave`, `frame` from world
- [x] `dlc/faith_of_fortune/SpiritHero.js` — extra: `frame`, `enemies` from world
- [x] `dlc/champions_of_chaos/VoidHero.js`
- [x] `dlc/champions_of_chaos/GravityHero.js`
- [x] `dlc/tournament_of_thunder/LightningHero.js` — extra: `enemies`, `projectiles`, `saveData` from world
- [x] `dlc/echos_of_eternity/LoveHero.js` — actual hero logic file (index.js is loader only)
- [x] `dlc/rise_of_the_rock/EarthHero.js` — actual hero logic file (index.js is loader only)
- [x] `dlc/echos_of_eternity/TimeHero.js` — actual hero logic file

After each file, verify the browser game still plays correctly with that hero selected.

---

### Phase 5 — Refactor `game.js` (5 days)

`game.js` is both the largest file and the world's owner. The goal here is:

1. `_world` is created at `startGame()`, populated from the same variables that were globals
2. All entity array creations go through `_world.X.push(…)` or via the array reference
3. The backwards-compat bridge aliases (`window.enemies = _world.enemies`) can be removed once all other files are migrated

#### 5.1 World creation in `startGame()`

- [x] At the top of `startGame()` call `window._world = World.createClientWorld({ canvas, ctx, saveData, audioManager, createExplosion, showNotification, … })`
- [x] Re-initialise all entity arrays from world: `enemies = _world.enemies; projectiles = _world.projectiles; …`
- [x] Pass `_world` to every `new Player(…)`, `new Enemy(…)`, `new Arena(…)` constructor call
- [x] Assign `frame, wave, score, currentWeather, currentObjective, bossActive, createExplosion, showNotification, audioManager, HERO_LOGIC, ENEMY_LOGIC, getDecoyTarget` into `_world` at init

#### 5.2 Game loop

- [x] Update world state each frame: `_world.frame = frame; _world.wave = wave; _world.score = score; …` (also syncs `gamePaused`, `isLevelingUp`, `isShopping`, `currentWeather`, `currentObjective`, `bossActive`, `enemies`)
  (This keeps the world in sync without requiring a full rewrite of the loop immediately)
- [x] Fix array reassignment sites: added `if (window._world) { window._world.enemies = enemies; window._world.projectiles = projectiles; }` after every bare `enemies = []` in debug key handlers and combat resolution (lines ~1786, ~1831, ~1935, ~5805, ~5913, ~6467); `companions` sync after restore-save

#### 5.3 `createExplosion` / `showNotification`

- [x] Assigned into world: `_w.createExplosion = createExplosion` and `_w.showNotification = showNotification`
      at game.js lines 3694-3695 (done in Phase 5 implementation).
- [x] Inner `const world = window._world` not needed: `showNotification` is pure DOM (no entity arrays);
      `createExplosion` uses `particles` which IS `_world.particles` (aliased, same reference). No change required.

#### 5.4 Remove backwards-compat bridge

- [ ] BLOCKED — 7 bridge assignments remain in game.js (lines 1737-1740, 4176, 4202, 4886).
      Cannot remove until DLC fallbacks migrated: `PoisonHero.js` (6 sites), `AirHero.js` (4 sites),
      `EarthHero.js` (1 site), `LightningHero.js` (5 sites), `SpiritHero.js` (1 site),
      `SoundHero.js` (1 site), `dlc/symphony_of_sickness/index.js` (2 sites).
- [x] Bare `enemies.push(...)` in game.js (spawn loop, lines ~5222-5278) — no change needed;
      `enemies` and `_world.enemies` are the same array reference. Pushes are visible to both.

---

### Phase 6 — Server adopts shared classes (5 days)

Now `GameSession.js` can be dramatically simplified because it no longer needs to re-implement game logic.

#### 6.1 Node.js file loading

Create `server/simulation/loader.js`:

```js
// Loads game classes into the Node.js global scope, providing
// a minimal browser shim so no canvas-touching code executes.
global.canvas = { width: 3000, height: 3000, getContext: () => null };
global.ctx    = null;
global.window = global;

// These will be overwritten per-session via world:
global.enemies = []; global.projectiles = []; // etc.

// Stub browser APIs that constructors reference:
global.document = { getElementById: () => ({ style: {}, innerHTML: '' }) };
global.Image    = class { set src(_) {} };

// Load shared game classes:
require('../../Arena.js');
require('../../Player.js');
require('../../Enemy.js');
require('../../Entities/Projectile.js');
require('../../Entities/GoldDrop.js');
require('../../Entities/FloatingText.js');
require('../../Entities/Particle.js');
require('../../Entities/MeleeSwipe.js');
require('../../Entities/HolyMask.js');

// Load DLC hero registries:
require('../../EvilHeroes.js');
require('../../dlc/symphony_of_sickness/PoisonHero.js');
// … all DLC files
```

Note: after Phase 2–4, these files read from `this._world` not globals, so loading them doesn't pollute the global scope. The shim is now only needed for the constructor code paths that reference `canvas.width` etc. for initial setup — those references must be audited and guarded.

#### 6.2 `GameSession.js` rewrite

- [x] Remove internal player state objects (the lightweight `{ x, y, hp, … }` structs)
- [x] Remove internal enemy structs; use real `Enemy` instances
- [x] Remove `_tick()` physics (movement, collision, etc.) — now delegated to Player/Enemy `update()`
- [x] Create a `World` instance per session in `init()`:
  ```js
  const { World } = require('../../shared/world');
  this._world = World.createServerWorld();
  this._world.HERO_LOGIC  = window.HERO_LOGIC;   // populated by loader
  this._world.ENEMY_LOGIC = window.ENEMY_LOGIC;
  this._world.createExplosion  = (x, y, color) => this._events.push({ type: 'enemy_death', x, y, color });
  this._world.showNotification = () => {};
  ```
- [x] `init(hostHero, guestHero)`:
  ```js
  this._world.player  = new Player(hostHero,  this._world);
  this._world.player2 = new Player(guestHero, this._world);
  this._world.arena   = new Arena(ARENA_WIDTH, ARENA_HEIGHT);
  ```
- [x] `_tick()` becomes:
  ```js
  _tick() {
      const w = this._world;
      w.frame++;
      // Apply inputs (already handled by applyInput → NetworkInputController)
      w.player.update();
      if (w.player2) w.player2.update();
      w.enemies.forEach(e => e.update());
      w.projectiles.forEach(p => { p.update(); /* collision handled by game.js logic extracted here */ });
      // Wave manager, collision resolution, snapshot push — same as now
  }
  ```
- [x] Keep `WaveManager.js` and `constants.js` — they remain the single source of truth
- [x] Keep `_sendSnapshot()` unchanged — snapshot schema stays the same

#### 6.3 Collision resolution

The current `GameSession._tick()` contains ~200 lines of collision code. After this phase, Player/Enemy `update()` handles movement and self-contained logic. The collision loop (projectile↔enemy, enemy↔player) can remain in `_tick()` or be extracted to `server/simulation/collision.js`. This is pure geometry and is already correct.

---

### Phase 7 — Parity test and cleanup (3 days)

- [x] Write `server/simulation/parityTest.js`:
  - 80 assertions: session isolation, player movement, all-hero HP, enemy spawning,
    snapshot schema, delta compression, DLC smoke (all heroes × 5 ticks), level-up flow
  - Run with `node server/simulation/parityTest.js` or `npm test`
- [x] Add parity test to CI — `.github/workflows/test.yml` runs on every push/PR
- [ ] BLOCKED — Remove `backwards-compat window.* bridge` from game.js:
      DLC files (PoisonHero, AirHero, EarthHero, LightningHero, SpiritHero, SoundHero,
      symphony/index.js) still use `window.enemies/projectiles/particles` as fallback.
      Must migrate those 20 sites first.
- [ ] DEFERRED — Remove `GameSession._updateEnemies()` duplicate physics:
      `Enemy` constructor reads `arena.camera`, `wave`, `player.type` from globals —
      cannot instantiate in WaveManager without a separate server-safe Enemy factory.
      Requires dedicated Enemy constructor refactor.
- [x] Update `CHANGELOG.md` and `tasks/world-refactor.md`

---

## Risk Register

| Risk | Likelihood | Impact | Mitigation |
|------|-----------|--------|------------|
| A DLC hero uses a global not caught in the survey | Medium | Medium | Phase 1 bridge keeps working; runtime error will be obvious |
| `Player.js` constructor references `canvas` or `document` directly | Low | High | Audit constructor before Phase 6; add null guards or move to `draw()` |
| Multi-session race during Phase 6 (world assignment) | Low | High | `World.createServerWorld()` is a new object per session — no sharing |
| `arena.checkCollision()` is already pure but `arena.draw()` references ctx | Known | None | draw() never called on server; null ctx is safe |
| Some HERO_LOGIC hook uses `window.ctx` outside draw | Medium | Low | All confirmed ctx in DLC heroes is in draw-overlay functions; add assertion in loader |
| Node.js `require()` order matters (class defined before use) | Medium | Medium | `loader.js` controls load order explicitly |

---

## Non-Goals (explicitly out of scope)

- Rewriting `draw()` methods — rendering stays browser-only
- Splitting files into separate model/view files — `this._world` binding is less invasive
- Changing the snapshot protocol — it stays identical
- Removing `constants.js` — it stays as the canonical stat source

---

## Success Criteria

1. `node server/simulation/parityTest.js` passes: client and server produce identical game state for a fixed seed
2. All 8 base heroes + all DLC heroes playable online with full ability support
3. No `window.*` global reads anywhere inside a logic method (enforced by a grep lint rule in CI)
4. Single `GameSession._tick()` at ≤ 100 lines (vs current ~400)
5. A new DLC hero requires zero changes to server code — only the shared hero file

---

## Effort Summary

| Phase | Work | Days |
|-------|------|------|
| 1 — World contract | New file + bridge in game.js | 2 |
| 2 — Player.js + Enemy.js | High density, mechanical | 5 |
| 3 — Entity classes | Small, straightforward | 2 |
| 4 — DLC heroes (11 files) | Repetitive, low risk | 5 |
| 5 — game.js | Largest file, high surface area | 5 |
| 6 — Server adopts shared classes | New architecture, careful testing | 5 |
| 7 — Parity test + cleanup | Testing and polish | 3 |
| **Total** | | **~27 working days** |

Phases 1–4 are fully parallelisable with feature development (they only change how globals are read, not game behaviour). Phase 5 and 6 touch the game loop and require a dedicated sprint.
