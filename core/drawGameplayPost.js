// #173 phase 10 — leaf-module extraction of `_drawGameplayPost`. First piece
// of the gameplay-helpers split that lets the server-side simulation drive
// `_updateGameplayPre` / `_updateGameplayMid` directly (with a no-op post draw)
// without dragging the renderer's DOM-heavy import graph into Node.
//
// State access pattern: every gameplay scalar/array the helper reads is
// looked up via `globalThis.X`. The renderer side mirrors module-scope state
// onto `window.X` via the `Object.defineProperties` block in `game.js`; the
// server side aliases the per-session world fields onto `global.X` before
// calling. The helper itself is a pure read of those globals — no module-
// scope dependency, no DOM dependency.
//
// The renderer continues to import this leaf module so the function lives in
// exactly one place; the inline `function _drawGameplayPost()` in game.js is
// removed (it just re-exports this one).

// `isReducedMotion` lives in game.js and is exposed via `window.isReducedMotion`.
// The leaf module reads it via globalThis at call time.
function isReducedMotion() {
    const fn = globalThis.isReducedMotion === isReducedMotion ? null : globalThis.isReducedMotion;
    return typeof fn === 'function' ? fn() : false;
}

export function _drawGameplayPost() {
    const _ctx = globalThis.ctx;
    const _canvas = globalThis.canvas;
    if (!_ctx || !_canvas) return; // server stub path — should never hit since loader installs a no-op

    const _weatherParticles = globalThis.weatherParticles || [];
    const _currentWeather   = globalThis.currentWeather || null;
    const _weatherDuration  = globalThis.weatherDuration || 0;
    const _weatherFlash     = globalThis._weatherFlash || 0;
    const _weatherBolts     = globalThis._weatherBolts || [];
    const _frame            = globalThis.frame || 0;
    const _isPlayerDying    = globalThis.isPlayerDying || false;
    const _playerDeathTimer = globalThis.playerDeathTimer || 0;

    // ── Weather Particle Render (screen-space) ─────────────────────────
    if (_weatherParticles.length > 0 && !isReducedMotion()) {
        _ctx.save();
        const wid = _currentWeather?.id;
        for (const p of _weatherParticles) {
            _ctx.globalAlpha = p.alpha;
            if (p.rain) {
                _ctx.strokeStyle = '#8ab4d8';
                _ctx.lineWidth = 1;
                _ctx.beginPath();
                _ctx.moveTo(p.x, p.y);
                _ctx.lineTo(p.x + p.vx / p.vy * p.len, p.y + p.len);
                _ctx.stroke();
            } else if (p.sand) {
                _ctx.strokeStyle = p.color || '#c8924a';
                _ctx.lineWidth = 1.5;
                _ctx.beginPath();
                _ctx.moveTo(p.x, p.y);
                _ctx.lineTo(p.x + p.len, p.y + p.vy * 2);
                _ctx.stroke();
            } else if (p.gale) {
                _ctx.strokeStyle = '#d0e8ff';
                _ctx.lineWidth = 1;
                _ctx.beginPath();
                _ctx.moveTo(p.x, p.y);
                _ctx.lineTo(p.x + p.len, p.y + p.vy * 3);
                _ctx.stroke();
            } else if (p.fog) {
                _ctx.fillStyle = '#55cc55';
                _ctx.beginPath();
                _ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
                _ctx.fill();
            } else if (wid === 'BLIZZARD') {
                _ctx.fillStyle = '#dff0ff';
                _ctx.beginPath();
                _ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
                _ctx.fill();
            } else if (wid === 'HEATWAVE') {
                _ctx.fillStyle = p.color || '#ff6b2b';
                _ctx.beginPath();
                _ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
                _ctx.fill();
            }
        }
        _ctx.globalAlpha = 1;
        _ctx.restore();
    }

    // Thunderstorm flash + bolts (screen-space)
    if (_weatherFlash > 0) {
        _ctx.save();
        _ctx.globalAlpha = _weatherFlash;
        _ctx.fillStyle = '#c8d8ff';
        _ctx.fillRect(0, 0, _canvas.width, _canvas.height);
        _ctx.globalAlpha = 1;
        _ctx.restore();
    }
    if (_weatherBolts.length > 0) {
        _ctx.save();
        for (const bolt of _weatherBolts) {
            const progress = bolt.life / bolt.maxLife;
            _ctx.globalAlpha = progress;
            _ctx.strokeStyle = '#e8f4ff';
            _ctx.shadowColor = '#a0c8ff';
            _ctx.shadowBlur = 12;
            _ctx.lineWidth = 2;
            _ctx.beginPath();
            if (bolt.segs && bolt.segs.length > 0) {
                _ctx.moveTo(bolt.segs[0].x, bolt.segs[0].y);
                for (let si = 1; si < bolt.segs.length; si++) _ctx.lineTo(bolt.segs[si].x, bolt.segs[si].y);
            }
            _ctx.stroke();
        }
        _ctx.globalAlpha = 1;
        _ctx.shadowBlur = 0;
        _ctx.restore();
    }
    // DLC custom weather draw hook (screen-space, after all base weather)
    const _drawHooks = globalThis.window?._weatherDrawHooks;
    if (_currentWeather && _drawHooks && _drawHooks[_currentWeather.id]) {
        const _wBiomeLocks = globalThis.window?._weatherBiomeLocks;
        const _dhLock = _wBiomeLocks && _wBiomeLocks[_currentWeather.id];
        const _dhDlc = _dhLock && _dhLock.dlcId;
        const _dhOk = !_dhDlc || (globalThis.window?.dlcManager && globalThis.window.dlcManager.isDLCActive(_dhDlc));
        if (_dhOk) {
            const _wFIForDraw = Math.min(1, (_currentWeather.duration - _weatherDuration) / 120);
            _drawHooks[_currentWeather.id](_ctx, _wFIForDraw, _frame);
        }
    }
    // ──────────────────────────────────────────────────────────────────

    if (typeof globalThis.updateUI === 'function') globalThis.updateUI();

    // #173 phase 9 — player-death cinematic: pure overlay render driven by the
    // isPlayerDying flag + playerDeathTimer (both owned by _updateGameplayMid).
    // No state writes here; the timer ticks in update so photo mode freezes
    // the death sequence with the rest of the world.
    if (_isPlayerDying) {
        _ctx.save();
        _ctx.fillStyle = `rgba(0, 0, 0, ${(180 - _playerDeathTimer) / 200})`;
        _ctx.fillRect(0, 0, _canvas.width, _canvas.height);
        const shake = (_playerDeathTimer / 180) * 5;
        _ctx.translate((Math.random() - 0.5) * shake, (Math.random() - 0.5) * shake);
        _ctx.restore();
    }
}
