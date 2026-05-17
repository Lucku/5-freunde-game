'use strict';

/**
 * server/simulation/RendererBridge.js
 *
 * Bridge between the server-side `GameSession` simulation and the renderer's
 * pure update halves (`_updateGameplayPre`, `_updateGameplayMid`) exported by
 * `game.js`. Closes #173 phase 9's stated unlock — "server simulation can swap
 * the draw halves for no-op stubs and drive only the update helpers."
 *
 * ── Status as of 2026-05-17 ───────────────────────────────────────────────────
 *
 *   ✅ `game.js` exports the four pure halves
 *      (`_updateGameplayPre / _updateGameplayMid / _drawGameplayMid /
 *      _drawGameplayPost`) — see the named-export block near the bottom of the
 *      file.
 *   ✅ `loader.js` installs `global._drawGameplayMid` and
 *      `global._drawGameplayPost` as no-op stubs so any code path that ends up
 *      calling them server-side does nothing (no canvas writes, no crashes).
 *   ⚠️ `game.js` itself cannot yet be `require()`'d from Node — its module
 *      graph reaches into ~60 renderer files (UI/*, Managers/AudioManager.js,
 *      Managers/NetworkManager.js, etc.) that hard-depend on DOM globals.
 *      Loading the full file blows up before the helpers ever run.
 *      Phase 10 of the #173 arc is to extract the four helpers + their direct
 *      module-scope state into a leaf module (`core/Gameplay.js` or similar)
 *      that BOTH the renderer entry (`main.js`) and this bridge can pull in.
 *      That refactor unblocks the swap below.
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

let _cachedUpdatePre = null;
let _cachedUpdateMid = null;
let _attempted = false;

/**
 * Lazily try to load the renderer helpers. Returns an object with `pre` / `mid`
 * function references, or `{ pre: null, mid: null }` when the renderer module
 * can't be loaded in the current Node environment.
 */
function _tryLoadHelpers() {
    if (_attempted) return { pre: _cachedUpdatePre, mid: _cachedUpdateMid };
    _attempted = true;
    try {
        // Note: `require()` of an ESM file works on Node 22.12+. game.js still
        // throws on import because its dependency graph reaches DOM globals
        // before reaching the helpers; once phase 10 splits the helpers out
        // into a server-loadable leaf module this require() target switches.
        const mod = require('../../game.js');
        _cachedUpdatePre = mod._updateGameplayPre || null;
        _cachedUpdateMid = mod._updateGameplayMid || null;
    } catch (e) {
        // Expected today — game.js dependency graph isn't server-loadable yet.
        _cachedUpdatePre = null;
        _cachedUpdateMid = null;
    }
    return { pre: _cachedUpdatePre, mid: _cachedUpdateMid };
}

/**
 * Returns the renderer's `_updateGameplayPre` if loadable, else null. Callers
 * should fall back to the existing GameSession tick when null.
 */
function getUpdatePre() {
    return _tryLoadHelpers().pre;
}

/**
 * Returns the renderer's `_updateGameplayMid` if loadable, else null.
 */
function getUpdateMid() {
    return _tryLoadHelpers().mid;
}

/**
 * Run one tick of the renderer's update half against the given session world.
 * Returns `true` if any update happened (the renderer was loadable AND the
 * caller should skip its own per-tick logic), `false` if the caller should
 * fall back to the existing GameSession._tick() implementation.
 *
 * Implementation note: the helpers read/write `arena`, `player`, `enemies`,
 * `projectiles`, etc. from their module-scope closure. The expected pattern is
 * for the caller to alias its session state onto `global.X` before calling and
 * read scalars back after — handled by the matching syncWorldToGlobals /
 * syncGlobalsToWorld helpers in the same file (TODO).
 *
 * Currently always returns false (helpers not loadable).
 */
function runUpdate(_session, _dt) {
    const pre = getUpdatePre();
    const mid = getUpdateMid();
    if (!pre || !mid) return false; // phase 10 not done yet
    // TODO phase 10: syncWorldToGlobals(_session._world);
    // TODO phase 10: if (pre(_dt)) return true;
    // TODO phase 10: mid(_dt, _session._isHitStopped);
    // TODO phase 10: syncGlobalsToWorld(_session._world);
    return false;
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
    runUpdate,
    drawMidNoop,
    drawPostNoop,
};
