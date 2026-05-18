'use strict';

/**
 * server/simulation/RendererBridge.js
 *
 * Bridge between the server-side `GameSession` simulation and the renderer's
 * pure update halves (`_updateGameplayPre`, `_updateGameplayMid`) exported by
 * `game.js`. Closes #173 phase 9's stated unlock — "server simulation can swap
 * the draw halves for no-op stubs and drive only the update helpers."
 *
 * ── Status as of 2026-05-18 (#173 phase 10 complete) ─────────────────────────
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
    getDrawMid,
    getDrawPost,
    runUpdate,
    drawMidNoop,
    drawPostNoop,
};
