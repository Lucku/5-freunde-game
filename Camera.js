// Camera.js — extracted from game.js (improvement #1 phase A).
//
// Owns screen-shake state, named shake presets, photo-mode free-camera, and
// gamepad-vibration impact helpers. Reads `window.arena`, `window.gameConfig`,
// `window.gameRunning`, `window.showNotification`, `window.keys` so the module
// stays usable from both game.js and DLCs without dependency injection.
//
// Public surface (also mirrored on `window.*` for DLC back-compat):
//   triggerScreenShake(intensity, duration)
//   applyScreenShake(ctx)               — call inside the world-translate block
//   shake(type)                         — preset key lookup
//   SHAKE_PRESETS                       — named (intensity, duration) tuples
//   triggerVibration(weak, strong, ms, gpIndex)
//   triggerImpact(shakePx, shakeFrames, vibWeak, vibStrong, vibMs, gpIndex)
//   togglePhotoMode()
//   tickPhotoMode()                     — pan camera while photo mode active
//   isPhotoMode()
//
// Photo mode binds F2/Escape on import so the keydown listener is registered
// exactly once across the lifetime of the page.

let _shakeIntensity = 0;
let _shakeDuration  = 0;

export function triggerScreenShake(intensity, duration) {
    const cfg = window.gameConfig;
    if (cfg && (!cfg.screenShake || cfg.reducedMotion)) return;
    _shakeIntensity = Math.max(_shakeIntensity, intensity);
    _shakeDuration  = Math.max(_shakeDuration,  duration);
}

export function applyScreenShake(ctx) {
    if (_shakeDuration <= 0) return;
    const sx = (Math.random() - 0.5) * 2 * _shakeIntensity;
    const sy = (Math.random() - 0.5) * 2 * _shakeIntensity;
    ctx.translate(sx, sy);
    _shakeIntensity *= 0.82;
    _shakeDuration--;
}

// #38 — Camera-shake taxonomy. Named presets keep per-event flavor
// (intensity + duration) consistent across call sites.
export const SHAKE_PRESETS = {
    hitSmall: { i: 3,  d: 6  }, // small projectile / pellet hit
    hit:      { i: 5,  d: 10 }, // standard melee / shot
    hitBig:   { i: 8,  d: 14 }, // crit / heavy hit
    stomp:    { i: 10, d: 18 }, // boss stomp / shockwave
    explode:  { i: 7,  d: 16 }, // grenade / death burst
    boss:     { i: 12, d: 22 }, // boss phase change / boss death
    weather:  { i: 2,  d: 8  }  // thunder, gust ambient
};

export function shake(type) {
    const p = SHAKE_PRESETS[type];
    if (!p) return;
    triggerScreenShake(p.i, p.d);
}

/**
 * Vibrate all connected gamepads.
 * @param {number} weak      High-frequency motor magnitude (0–1).
 * @param {number} strong    Low-frequency motor magnitude (0–1).
 * @param {number} ms        Duration in milliseconds.
 * @param {number|null} gpIndex  Specific gamepad index, or null for all.
 */
export function triggerVibration(weak, strong, ms, gpIndex = null) {
    const cfg = window.gameConfig;
    if (cfg && !cfg.controllerVibration) return;
    const pads = navigator.getGamepads ? navigator.getGamepads() : [];
    for (let i = 0; i < pads.length; i++) {
        if (gpIndex !== null && i !== gpIndex) continue;
        const gp = pads[i];
        if (!gp || !gp.connected) continue;
        try {
            if (gp.vibrationActuator) {
                gp.vibrationActuator.playEffect('dual-rumble', {
                    startDelay: 0, duration: ms,
                    weakMagnitude: weak, strongMagnitude: strong
                });
            }
        } catch (e) { /* vibration not supported */ }
    }
}

/**
 * Combined screen shake + controller vibration for a single impact event.
 */
export function triggerImpact(shakePx, shakeFrames, vibWeak, vibStrong, vibMs, gpIndex = null) {
    triggerScreenShake(shakePx, shakeFrames);
    triggerVibration(vibWeak, vibStrong, vibMs, gpIndex);
}

// ── Photo mode (#51) ──────────────────────────────────────────────────────
// While active: UI overlays hide (HUD + pause-screen + minimap + debug),
// camera becomes free (Arrow keys / WASD pan, Shift = slow, Ctrl = fast).
// World keeps running ("live photo"). Press F2 / Esc to exit.

let _photoMode = false;
const _photoCam = { x: 0, y: 0 };

const _PHOTO_HIDE_IDS = [
    'ui-layer', 'pause-screen', 'minimap', 'debug-overlay', 'hud-top-left',
    'bottom-ui', 'p2-hud', 'notification-area', 'weather-display',
    'objective-display', 'combo-display', 'chaos-challenge-hud',
    'online-name-bar', 'hero-subtitle', 'weather-bar-wrap'
];

export function isPhotoMode() { return _photoMode; }

export function togglePhotoMode() {
    if (!window.gameRunning) return;
    _photoMode = !_photoMode;
    const arena = window.arena;
    if (_photoMode && arena && arena.camera) {
        _photoCam.x = arena.camera.x;
        _photoCam.y = arena.camera.y;
    }
    for (const id of _PHOTO_HIDE_IDS) {
        const el = document.getElementById(id);
        if (el) el.style.visibility = _photoMode ? 'hidden' : '';
    }
    if (typeof window.showNotification === 'function') {
        window.showNotification(_photoMode ? 'PHOTO MODE — Arrows to pan, F2 to exit' : 'Photo mode off');
    }
}

export function tickPhotoMode() {
    const arena = window.arena;
    if (!_photoMode || !arena || !arena.camera) return;
    const keys = window.keys;
    const fast = !!(keys && (keys['control'] || keys['ctrl']));
    const slow = !!(keys && keys['shift']);
    let speed = 8;
    if (fast) speed = 24;
    if (slow) speed = 3;
    let dx = 0, dy = 0;
    if (keys) {
        if (keys['arrowleft']  || keys['a']) dx -= 1;
        if (keys['arrowright'] || keys['d']) dx += 1;
        if (keys['arrowup']    || keys['w']) dy -= 1;
        if (keys['arrowdown']  || keys['s']) dy += 1;
    }
    _photoCam.x += dx * speed;
    _photoCam.y += dy * speed;
    _photoCam.x = Math.max(0, Math.min(arena.width  - arena.camera.width,  _photoCam.x));
    _photoCam.y = Math.max(0, Math.min(arena.height - arena.camera.height, _photoCam.y));
    arena.camera.x = _photoCam.x;
    arena.camera.y = _photoCam.y;
}

window.addEventListener('keydown', e => {
    if (e.key === 'F2') { e.preventDefault(); togglePhotoMode(); return; }
    if (_photoMode && (e.key === 'Escape' || e.key === 'F2')) {
        e.preventDefault(); togglePhotoMode(); return;
    }
});

// Back-compat window shims so DLCs that read globals still work.
window.SHAKE_PRESETS       = SHAKE_PRESETS;
window.shake               = shake;
window.triggerScreenShake  = triggerScreenShake;
window.triggerVibration    = triggerVibration;
window.triggerImpact       = triggerImpact;
window.togglePhotoMode     = togglePhotoMode;
