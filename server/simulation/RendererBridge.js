'use strict';

/**
 * server/simulation/RendererBridge.js
 *
 * Bridge between the server-side `GameSession` simulation and the renderer's
 * pure update halves (`_updateGameplayPre`, `_updateGameplayMid`) exported by
 * `game.js`. Closes 's stated unlock — "server simulation can swap
 * the draw halves for no-op stubs and drive only the update helpers."
 *
 * ── Status as of 2026-05-18 ( complete) ─────────────────────────
 *
 *   ✅ All four pure halves now live in `core/*.js` leaf modules:
 *        core/updateGameplayPre.js
 *        core/updateGameplayMid.js
 *        core/drawGameplayMid.js
 *        core/drawGameplayPost.js
 *      Each reads run-scoped state via the singleton
 *      `runState` exported from `RunState.js`. Module-scope renderer globals
 *      (arena, canvas, audioManager, classes, helpers) still resolve via
 *      bare-name global lookup — `window.X` in the renderer,
 *      `global.X` stubs in `server/simulation/loader.js`.
 *   ✅ `loader.js` installs `global._drawGameplayMid` and
 *      `global._drawGameplayPost` as no-op stubs so any code path that ends up
 *      calling them server-side does nothing (no canvas writes, no crashes).
 *   ⚠️ Driving the update halves from this bridge still requires the loader
 *      to stub every bare-name global the helpers reach (arena, canvas,
 *      classes, audio etc.). That work continues — the bridge below returns
 *      the function refs but the caller still has to set up the globals.
 *
 * ── The intended swap (post phase-10) ─────────────────────────────────────────
 *
 *   const { _updateGameplayPre, _updateGameplayMid } = require('core/Gameplay');
 *
 *   function tick(session, dt) {
 *       _syncWorldToGlobals(session._world);    // alias world arrays onto global.*
 *       if (_updateGameplayPre(dt)) return;     // cinematic bailed out
 *       _updateGameplayMid(dt, session._isHitStopped);
 *       _syncGlobalsToWorld(session._world);    // pull scalars (wave, score, …) back
 *   }
 *
 *   The bridge functions below are wired so that the day phase 10 ships, the
 *   only change is `getUpdatePre`/`getUpdateMid` returning the imported helpers
 *   instead of the current `null` fallback. Every caller stays the same.
 *
 * ── Current fallback ─────────────────────────────────────────────────────────
 *
 *   Until phase 10 the bridge returns `null` so callers know to keep using the
 *   `GameSession._tick()` implementation. This preserves the existing
 *   server-sim behaviour with zero risk; the bridge module is purely additive.
 */

// Per-helper lazy-load cache. Each helper has its own try/catch so a single
// missing leaf module doesn't block the others.
const _cache = { pre: null, mid: null, drawMid: null, drawPost: null };
const _attempted = { pre: false, mid: false, drawMid: false, drawPost: false };

function _tryLoad(key, modulePath, exportName) {
    if (_attempted[key]) return _cache[key];
    _attempted[key] = true;
    try {
        const m = require(modulePath);
        _cache[key] = m[exportName] || null;
    } catch (e) {
        _cache[key] = null;
    }
    return _cache[key];
}

/**
 * Lazily try to load the renderer helpers. Returns an object with the four
 * function references; each may be null if its leaf module isn't yet split
 * out of game.js. Today: `drawPost` resolves to the extracted leaf module
 * `core/drawGameplayPost.js`; the other three are still in game.js and
 * remain null until phase 11+ extracts them too.
 */
function _tryLoadHelpers() {
    return {
        pre:      _tryLoad('pre',      '../../core/updateGameplayPre.js', '_updateGameplayPre'),
        mid:      _tryLoad('mid',      '../../core/updateGameplayMid.js', '_updateGameplayMid'),
        drawMid:  _tryLoad('drawMid',  '../../core/drawGameplayMid.js',   '_drawGameplayMid'),
        drawPost: _tryLoad('drawPost', '../../core/drawGameplayPost.js',  '_drawGameplayPost'),
    };
}

/**
 * Returns the renderer's `_updateGameplayPre` if loadable, else null. Callers
 * should fall back to the existing GameSession tick when null.
 */
function getUpdatePre()  { return _tryLoadHelpers().pre; }
function getUpdateMid()  { return _tryLoadHelpers().mid; }
function getDrawMid()    { return _tryLoadHelpers().drawMid; }
function getDrawPost()   { return _tryLoadHelpers().drawPost; }

/**
 * Sync a session's world state onto the Node `global` namespace so the
 * extracted leaf modules' bare-name reads (`arena`, `player`, `enemies`,
 * `frame`, etc.) resolve to this session's data. Mirror of game.js's
 * client-side `window.X = …` bridge block.
 *
 * Called by `runUpdate` before each `pre/mid` invocation. Safe to call
 * repeatedly — overwrites with current session values each tick.
 */
function syncWorldToGlobals(session) {
    const w = session._world;
    // Entities read `this._world ?? window._world`, and the shared update
    // code mirrors frame / wave / weather into `window._world` — this
    // session's, not whichever session created a player last.
    global._world        = w;
    global.arena         = w.arena;
    global.player        = session.players[0];
    global.player2       = session.players[1];
    global.frame         = w.frame;
    global.wave          = w.wave;
    global.score         = w.score;
    global.bossActive    = !!w.bossActive;
    global.saveData      = w.saveData || { global: {} };
    global.HERO_LOGIC    = w.HERO_LOGIC  || global.HERO_LOGIC  || {};
    global.ENEMY_LOGIC   = w.ENEMY_LOGIC || global.ENEMY_LOGIC || {};
    // This session's DLC biome instances (see biomes.js); restored after.
    _prevBiomeLogic = global.BIOME_LOGIC;
    global.BIOME_LOGIC   = session._biomes || global.BIOME_LOGIC;

    // Session-aware game over (both players down after the singleplayer death
    // cinematic): the loader's no-op stub left online runs going forever.
    _prevGameOver = global.gameOver;
    global.gameOver = (isVictory = false) => session._onGameOver(!!isVictory);

    // A finished objective wave calls triggerStory (singleplayer: chapter,
    // then advanceWave). Online the next chapter is the clients' (at
    // wave_start); the server just ends the wave.
    _prevTriggerStory = global.triggerStory;
    global.triggerStory = () => global.advanceWave();

    // Player.levelUp() hands its options to the level-up screen; online that
    // screen is the player's client — the session pauses and asks it. (The
    // loader's null stub only logged "LevelUpUI not initialized".)
    _prevLevelUpUI = global.levelUpUI;
    global.levelUpUI = { showLevelUp: (player, options) => session._queueLevelUp(player, options) };
    global.isLevelingUp = false; // ticks never run while a level-up is open

    // Singleplayer applyDamage() (game.js) minus its presentation (sound,
    // damage number): i-frame check, damage reduction, shield hook, HP, combo
    // reset. Kills and deaths are left to the shared update code, as in
    // singleplayer — the old server-only helpers marked a player dead on the
    // spot (no revive marker, no death cinematic, a game over the lobby never
    // heard of) and paid kill XP a second time. Both swaps are restored in
    // `syncGlobalsToWorld`.
    _prevApplyDamage = global.applyDamage;
    global.applyDamage = (target, dmg, opts = {}) => {
        if (!target || target.isInvincible) return 0;
        if (!Number.isFinite(dmg) || dmg <= 0) return 0;
        const reduction = opts.noReduction ? 0 : (Number(target.damageReduction) || 0);
        const finalDmg = dmg * (1 - reduction);
        if (typeof target.customOnDamage === 'function') {
            try {
                if (target.customOnDamage(finalDmg)) return 0;
            } catch (e) { console.warn('customOnDamage threw:', e); }
        }
        target.hp -= finalDmg;
        if (session.players.includes(target) && typeof target.resetCombo === 'function' && finalDmg > 0) {
            target.resetCombo();
        }
        return finalDmg;
    };

    // runState singleton mirrors the same fields — leaf modules read both
    // bare `player` AND `runState.player` depending on the code path.
    const rs = global.runState;
    if (rs) {
        rs.frame       = w.frame;
        rs.wave        = w.wave;
        rs.score       = w.score;
        rs.gameRunning = true;
        rs.gamePaused  = false;
        rs.isVersusMode = !!w.isVersusMode;
        rs.isCoopMode   = !!w.isCoopMode;
        rs.bossActive   = !!w.bossActive;
        rs.player       = session.players[0];
        rs.player2      = session.players[1];
        // Player.levelUp() reads the bare global: no level-ups during the
        // death cinematic, as in singleplayer.
        global.isPlayerDying = !!rs.isPlayerDying;
        // Weather is runState-owned (rolled and ended by the shared update
        // code); the world copy is what Player / Enemy speed effects read.
        // Resetting it from the world here every sub-step meant online
        // weather never lasted a frame.
        w.currentWeather = rs.currentWeather || null;
        rs.activeMutators = w.activeMutators || [];
    }
}

/**
 * Pull scalar mutations the helpers wrote back onto the session world. The
 * leaf modules increment `runState.frame`, may set `runState.bossActive`,
 * etc. — the session needs to observe these before the next snapshot.
 */
function syncGlobalsToWorld(session) {
    const w  = session._world;
    const rs = global.runState;
    if (rs) {
        w.frame        = rs.frame;
        w.wave         = rs.wave;
        w.score        = rs.score;
        w.bossActive   = !!rs.bossActive;
        w.currentWeather = rs.currentWeather || null;
        // Weather particles are screen-space visuals (clients make their own);
        // on the server's 3000 px "screen" they would pile up into the thousands.
        if (rs.weatherParticles && rs.weatherParticles.length) rs.weatherParticles.length = 0;
    }
    // Restore the loader.js smoke-grade `applyDamage` stub so the global
    // doesn't stay session-bound after the tick completes. Any non-bridge
    // require()-driven code path that calls `applyDamage` between ticks
    // gets the deterministic stub behavior.
    if (_prevApplyDamage) {
        global.applyDamage = _prevApplyDamage;
        _prevApplyDamage = null;
    }
    if (_prevGameOver) {
        global.gameOver = _prevGameOver;
        _prevGameOver = null;
    }
    if (_prevLevelUpUI !== undefined) {
        global.levelUpUI = _prevLevelUpUI;
        _prevLevelUpUI = undefined;
    }
    if (_prevTriggerStory) {
        global.triggerStory = _prevTriggerStory;
        _prevTriggerStory = null;
    }
    if (_prevBiomeLogic !== undefined) {
        global.BIOME_LOGIC = _prevBiomeLogic;
        _prevBiomeLogic = undefined;
    }
}

let _prevApplyDamage = null;
let _prevGameOver = null;
let _prevLevelUpUI = undefined; // the loader's stub is null
let _prevBiomeLogic = undefined;
let _prevTriggerStory = null;

/**
 * Run one tick of the extracted renderer update halves against a session's
 * world. Sync state in, call `pre(dt)` (bail if a cinematic-equivalent gate
 * fires), call `mid(dt, isHitStopped)`, sync state out.
 *
 * Returns `true` if the helpers ran. `false` if either helper failed to
 * load (caller should fall back).
 *
 * Phase 3h.2 — this IS the production `GameSession._tick` body now.
 * Legacy server-authoritative damage helpers (`_processMeleeAttacks` /
 * `_updateProjectiles` / `_applyEnemyContactDamage` / `_checkWaveAdvance`)
 * retired. The leaf modules from `core/*.js` execute every collision +
 * damage + wave-advance path server-side via the `runState` ECS layer.
 * `applyDamage` calls inside the leaf modules route through the per-tick
 * `global.applyDamage` swap in `syncWorldToGlobals` (session-aware closure
 * on entry, loader stub restored on exit), which mirrors singleplayer's.
 */
function runUpdate(session, dt) {
    const pre = getUpdatePre();
    const mid = getUpdateMid();
    if (!pre || !mid) return false;
    syncWorldToGlobals(session);
    try {
        const cinematicTookOver = pre(dt);
        if (!cinematicTookOver) {
            mid(dt, !!session._isHitStopped);
        }
    } finally {
        // Also after a throw: the session-bound swaps must not leak.
        syncGlobalsToWorld(session);
    }
    return true;
}

// Re-export the no-op draw stubs that `loader.js` installs on `global`. Having
// them named in this module lets a future caller `require('./RendererBridge')`
// and explicitly install them on a per-session basis instead of relying on the
// global side-effect from the loader.
const drawMidNoop  = () => {};
const drawPostNoop = () => {};

module.exports = {
    getUpdatePre,
    getUpdateMid,
    getDrawMid,
    getDrawPost,
    runUpdate,
    syncWorldToGlobals,
    syncGlobalsToWorld,
    drawMidNoop,
    drawPostNoop,
};
