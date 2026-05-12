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

// Phase-1 descriptor: delegates to window.X for both read + write so callers
// can adopt without breaking existing writers.
const _winDescriptor = (name) => ({
    configurable: true,
    enumerable: true,
    get() { return (typeof window !== 'undefined') ? window[name] : undefined; },
});

// Phase-2 descriptor (session 4 onward): GameContext owns the value; `window.X`
// becomes a reverse alias that reads from the same backing field. `winAlias`
// is the legacy `window.<winAlias>` name to mirror to (for classic-script + DLC
// callers that still bare-read `X`).
function _ownedDescriptor(backingKey, winAlias) {
    return {
        configurable: true,
        enumerable: true,
        get() { return GameContext[backingKey]; },
        set(v) {
            GameContext[backingKey] = v;
            if (winAlias && typeof window !== 'undefined') {
                // Re-define the legacy alias as a getter so it always tracks
                // the GameContext-owned value, not the moment-in-time snapshot.
                try {
                    Object.defineProperty(window, winAlias, {
                        configurable: true,
                        enumerable: true,
                        get() { return GameContext[backingKey]; },
                    });
                } catch (_) { window[winAlias] = v; }
            }
        },
    };
}

const GameContext = {};

// Core canvas + draw context — session 4 flip: GameContext owns, window mirrors.
GameContext._canvasBacking = null;
GameContext._ctxBacking    = null;
Object.defineProperty(GameContext, 'canvas', _ownedDescriptor('_canvasBacking', 'canvas'));
Object.defineProperty(GameContext, 'ctx',    _ownedDescriptor('_ctxBacking',    'ctx'));

// User config (settings, key bindings, accessibility). Session 5 flip:
// Config.js writes via setter on init; all later mutations are deep-prop
// (`gameConfig.X = …` or `Object.assign(gameConfig, …)`) so object identity
// is preserved and reverse-alias readers stay coherent.
GameContext._gameConfigBacking = null;
Object.defineProperty(GameContext, 'gameConfig', _ownedDescriptor('_gameConfigBacking', 'gameConfig'));

// Save data + defaults — both flipped in session 5. `saveData` writers
// (SaveManager.loadGame result, fresh-init, importSave, CloudSaveManager merge)
// all route through the setter.
GameContext._saveDataBacking = null;
Object.defineProperty(GameContext, 'saveData', _ownedDescriptor('_saveDataBacking', 'saveData'));
GameContext._defaultSaveDataBacking = null;
Object.defineProperty(GameContext, 'defaultSaveData', _ownedDescriptor('_defaultSaveDataBacking', '_defaultSaveData'));

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

// Registries (DLC-extended). Session 3: expanded API with convenience lookups
// + null-safe helpers so callers stop repeating
// `if (window.HERO_LOGIC && window.HERO_LOGIC[t] && window.HERO_LOGIC[t].fn)`.
GameContext.registries = {};
Object.defineProperty(GameContext.registries, 'biomes',  _winDescriptor('BIOME_LOGIC'));
Object.defineProperty(GameContext.registries, 'heroes',  _winDescriptor('HERO_LOGIC'));
Object.defineProperty(GameContext.registries, 'enemies', _winDescriptor('ENEMY_LOGIC'));
Object.defineProperty(GameContext.registries, 'dlcs',    _winDescriptor('DLC_REGISTRY'));

// Convenience lookups — return entry or null. Safer than chained && checks
// and centralises the lookup so we can swap the backing store later.
GameContext.registries.getBiome = (id) => {
    const r = (typeof window !== 'undefined') ? window.BIOME_LOGIC : null;
    return (r && r[id]) ? r[id] : null;
};
GameContext.registries.getHero = (type) => {
    const r = (typeof window !== 'undefined') ? window.HERO_LOGIC : null;
    return (r && r[type]) ? r[type] : null;
};
GameContext.registries.getEnemy = (type) => {
    const r = (typeof window !== 'undefined') ? window.ENEMY_LOGIC : null;
    return (r && r[type]) ? r[type] : null;
};
GameContext.registries.getDLC = (key) => {
    const r = (typeof window !== 'undefined') ? window.DLC_REGISTRY : null;
    return (r && r[key]) ? r[key] : null;
};

// Hero-method dispatch — invoke `name(...args)` on the HERO_LOGIC entry if it
// exists. Returns the method result or `undefined` when absent. Eliminates the
// repeated `&& HERO_LOGIC[t] && typeof HERO_LOGIC[t].fn === 'function'` guard.
GameContext.registries.callHero = (type, methodName, ...args) => {
    const hl = GameContext.registries.getHero(type);
    if (!hl || typeof hl[methodName] !== 'function') return undefined;
    return hl[methodName](...args);
};

// List DLC consumers (for #4 audit + future #101 mod-API surface).
GameContext.registries.listDLCs = () => {
    const r = (typeof window !== 'undefined') ? window.DLC_REGISTRY : null;
    return r ? Object.keys(r) : [];
};

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
