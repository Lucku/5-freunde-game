// GameContext.js — central read-only view onto the ~15 cross-cutting globals
// that game.js (and the Managers / Entities / UI modules) currently reach for
// directly via `window.X` (#4).
//
// ─── Migration arc ───────────────────────────────────────────────────────────
// This file is **session 1** of a multi-session migration:
//
//   Session 1 (now)  — Define GameContext as a getter-only view; backing store
//                      stays on `window.X`. Adoption is safe: any caller can
//                      start reading `GameContext.X` without changing writers.
//   Session 2        — Migrate `saveData` + tuning numbers (`ENEMIES_PER_WAVE`,
//                      `BIOME_OBSTACLE_DENSITY`) to the view.
//   Session 3        — Add registries view (BIOME_LOGIC / HERO_LOGIC / ENEMY_LOGIC
//                      / DLC_REGISTRY). Audit DLC consumers.
//   Session 4        — Flip ownership: GameContext owns the value, `window.X`
//                      becomes the alias. Couples with #11 RunState migration
//                      for entity arrays (`enemies`/`projectiles`/`wave`/`arena`).
//   Session 5        — Drop redundant `window.X` shims where no DLC bare-reads.
//                      Update ARCHITECTURE.md + final lint sweep.
//
// ─── Usage ───────────────────────────────────────────────────────────────────
//
//   import { GameContext } from './GameContext.js';
//   const ctx = GameContext.ctx;
//   if (GameContext.gameConfig.musicEnabled) …
//
// Or via the window shim for classic-script callers:
//
//   const cfg = window.gameContext.gameConfig;
//
// ─── Why getter-only first ──────────────────────────────────────────────────
// Multiple subsystems (`game.js`, `Config.js`, DLC files, server-simulation
// stubs) all set `window.X` independently right now. Making GameContext a
// proxy that *reads* from window keeps every existing writer functional while
// new readers migrate to the cleaner API. Session 4 flips ownership once the
// reader set is small enough to audit.

const _winDescriptor = (name) => ({
    configurable: true,
    enumerable: true,
    get() { return (typeof window !== 'undefined') ? window[name] : undefined; },
});

const GameContext = {};

// Core canvas + draw context
Object.defineProperty(GameContext, 'canvas', _winDescriptor('canvas'));
Object.defineProperty(GameContext, 'ctx',    _winDescriptor('ctx'));

// User config (settings, key bindings, accessibility)
Object.defineProperty(GameContext, 'gameConfig', _winDescriptor('gameConfig'));

// Save data + defaults
Object.defineProperty(GameContext, 'saveData',         _winDescriptor('saveData'));
Object.defineProperty(GameContext, 'defaultSaveData',  _winDescriptor('_defaultSaveData'));

// Live run state (currently module-scoped in game.js, exposed via defineProperty
// pairs and entity-array window shims — see game.js).
Object.defineProperty(GameContext, 'wave',         _winDescriptor('wave'));
Object.defineProperty(GameContext, 'arena',        _winDescriptor('arena'));
Object.defineProperty(GameContext, 'enemies',      _winDescriptor('enemies'));
Object.defineProperty(GameContext, 'projectiles',  _winDescriptor('projectiles'));
Object.defineProperty(GameContext, 'world',        _winDescriptor('_world'));

// Tuning constants (will eventually point at GAMEPLAY/Constants instead of window)
Object.defineProperty(GameContext, 'enemiesPerWave',        _winDescriptor('ENEMIES_PER_WAVE'));
Object.defineProperty(GameContext, 'biomeObstacleDensity',  _winDescriptor('BIOME_OBSTACLE_DENSITY'));

// Registries (DLC-extended; session 3 wraps these so we can validate shape).
GameContext.registries = {};
Object.defineProperty(GameContext.registries, 'biomes',  _winDescriptor('BIOME_LOGIC'));
Object.defineProperty(GameContext.registries, 'heroes',  _winDescriptor('HERO_LOGIC'));
Object.defineProperty(GameContext.registries, 'enemies', _winDescriptor('ENEMY_LOGIC'));
Object.defineProperty(GameContext.registries, 'dlcs',    _winDescriptor('DLC_REGISTRY'));

// Player(s) for convenience — read-only since `player` / `player2` get
// reassigned multiple times per run from game.js scope.
Object.defineProperty(GameContext, 'player',  _winDescriptor('player'));
Object.defineProperty(GameContext, 'player2', _winDescriptor('player2'));

// Platform shim (loaded first — Platform.js itself is read through here too).
Object.defineProperty(GameContext, 'platform', _winDescriptor('Platform'));

export { GameContext };
export default GameContext;

if (typeof window !== 'undefined') {
    window.gameContext = GameContext;
}
