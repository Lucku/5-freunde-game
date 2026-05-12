class InputManager {
    constructor() {
        this.keys = {};
        this.mouse = { x: 0, y: 0, leftDown: false, rightDown: false };
        this.lastInputType = 'MOUSE';

        // Remap state — when non-null, next keydown captures the binding.
        this._remapAction = null;
        this._remapCallback = null;

        // Gamepad remap state — polled in a rAF loop while active.
        this._gpRemapAction = null;
        this._gpRemapCallback = null;
        this._gpRemapPrev = null;
        this._gpRemapLoop = null;

        // Expose to window for backward compatibility with Player.js and game.js
        window.keys = this.keys;
        window.mouse = this.mouse;

        this.initListeners();
    }

    // Resolve current key bindings. Falls back to defaults if config not ready.
    _getBindings() {
        const cfg = (typeof window !== 'undefined' && window.gameConfig) || null;
        if (cfg && cfg.keyBindings) return cfg.keyBindings;
        return null;
    }

    // Test if any key bound to `action` is currently held.
    isAction(action) {
        const b = this._getBindings();
        const list = b && b[action];
        if (!list || !list.length) return false;
        for (const k of list) if (this.keys[k]) return true;
        return false;
    }

    // Does the given KeyboardEvent's key match a binding for `action`?
    eventMatches(action, e) {
        if (!e || typeof e.key !== 'string') return false;
        const b = this._getBindings();
        const list = b && b[action];
        if (!list || !list.length) return false;
        return list.indexOf(e.key.toLowerCase()) !== -1;
    }

    // Begin remap for a single action. Next valid keydown stores the binding
    // and invokes `onDone(boundKey | null)`. Escape cancels.
    beginRemap(action, onDone) {
        this._remapAction = action;
        this._remapCallback = onDone || null;
    }

    cancelRemap() {
        const cb = this._remapCallback;
        this._remapAction = null;
        this._remapCallback = null;
        if (cb) cb(null);
    }

    _completeRemap(key) {
        const action = this._remapAction;
        const cb = this._remapCallback;
        this._remapAction = null;
        this._remapCallback = null;
        if (!action) return;
        const cfg = window.gameConfig;
        if (cfg && cfg.keyBindings) {
            cfg.keyBindings[action] = [key];
            if (typeof window.saveConfig === 'function') window.saveConfig();
        }
        if (cb) cb(key);
    }

    // Gamepad button bindings — single button index per action (array stored).
    _getGamepadBindings() {
        const cfg = (typeof window !== 'undefined' && window.gameConfig) || null;
        if (cfg && cfg.gamepadBindings) return cfg.gamepadBindings;
        return null;
    }

    // True if any bound button is currently pressed for `action` on `gp`.
    // Triggers (digital `pressed` or analog `value > 0.15`) both count.
    isGamepadAction(gp, action) {
        if (!gp) return false;
        const b = this._getGamepadBindings();
        const list = b && b[action];
        if (!list || !list.length) return false;
        for (const idx of list) {
            const btn = gp.buttons[idx];
            if (!btn) continue;
            if (btn.pressed) return true;
            if (typeof btn.value === 'number' && btn.value > 0.15) return true;
        }
        return false;
    }

    beginGamepadRemap(action, onDone) {
        this.cancelGamepadRemap();
        this._gpRemapAction = action;
        this._gpRemapCallback = onDone || null;
        this._gpRemapPrev = this._snapshotGamepadButtons();
        this._gpRemapLoop = requestAnimationFrame(() => this._pollGamepadRemap());
    }

    cancelGamepadRemap() {
        if (this._gpRemapLoop) cancelAnimationFrame(this._gpRemapLoop);
        this._gpRemapLoop = null;
        const cb = this._gpRemapCallback;
        const wasActive = !!this._gpRemapAction;
        this._gpRemapAction = null;
        this._gpRemapCallback = null;
        this._gpRemapPrev = null;
        if (wasActive && cb) cb(null);
    }

    _snapshotGamepadButtons() {
        const set = new Set();
        const pads = navigator.getGamepads ? navigator.getGamepads() : [];
        for (const gp of pads) {
            if (!gp || !gp.connected) continue;
            for (let i = 0; i < gp.buttons.length; i++) {
                const b = gp.buttons[i];
                if (b && (b.pressed || (typeof b.value === 'number' && b.value > 0.5))) {
                    set.add(i);
                }
            }
        }
        return set;
    }

    _pollGamepadRemap() {
        if (!this._gpRemapAction) return;
        const pads = navigator.getGamepads ? navigator.getGamepads() : [];
        for (const gp of pads) {
            if (!gp || !gp.connected) continue;
            for (let i = 0; i < gp.buttons.length; i++) {
                const b = gp.buttons[i];
                if (!b) continue;
                const pressed = b.pressed || (typeof b.value === 'number' && b.value > 0.5);
                if (pressed && !this._gpRemapPrev.has(i)) {
                    this._completeGamepadRemap(i);
                    return;
                }
                if (!pressed) this._gpRemapPrev.delete(i);
            }
        }
        this._gpRemapLoop = requestAnimationFrame(() => this._pollGamepadRemap());
    }

    _completeGamepadRemap(idx) {
        if (this._gpRemapLoop) cancelAnimationFrame(this._gpRemapLoop);
        this._gpRemapLoop = null;
        const action = this._gpRemapAction;
        const cb = this._gpRemapCallback;
        this._gpRemapAction = null;
        this._gpRemapCallback = null;
        this._gpRemapPrev = null;
        if (!action) return;
        const cfg = window.gameConfig;
        if (cfg && cfg.gamepadBindings) {
            cfg.gamepadBindings[action] = [idx];
            if (typeof window.saveConfig === 'function') window.saveConfig();
        }
        if (cb) cb(idx);
    }

    initListeners() {
        window.addEventListener('keydown', e => {
            const k = e.key.toLowerCase();

            // Active remap session — capture binding instead of game input.
            if (this._remapAction) {
                if (k === 'escape') {
                    this.cancelRemap();
                } else {
                    this._completeRemap(k);
                }
                e.preventDefault();
                return;
            }

            // Esc also cancels an in-flight gamepad remap.
            if (this._gpRemapAction && k === 'escape') {
                this.cancelGamepadRemap();
                e.preventDefault();
                return;
            }

            this.keys[k] = true;
            if (this.onKeyDown) this.onKeyDown(e);
        });
        window.addEventListener('keyup', e => {
            this.keys[e.key.toLowerCase()] = false;
            if (this.onKeyUp) this.onKeyUp(e);
        });

        window.addEventListener('mousemove', e => {
            this.lastInputType = 'MOUSE';
            this.mouse.x = e.clientX;
            this.mouse.y = e.clientY;

            // If mouse moves, switch back to mouse aiming
            if (window.player) window.player.usingGamepad = false;
        });

        // Mouse Listeners
        window.addEventListener('mousedown', e => {
            this.lastInputType = 'MOUSE';
            if (typeof gameRunning !== 'undefined' && (!gameRunning || gamePaused || isLevelingUp || isShopping)) return;

            const toggleMode = !!(window.gameConfig && window.gameConfig.holdToFireToggle);

            if (e.button === 0) {
                // Hold-to-fire toggle (#132): each click flips sticky leftDown.
                if (toggleMode) this.mouse.leftDown = !this.mouse.leftDown;
                else this.mouse.leftDown = true;
            }
            if (e.button === 2) this.mouse.rightDown = true;
        });

        window.addEventListener('mouseup', e => {
            const toggleMode = !!(window.gameConfig && window.gameConfig.holdToFireToggle);
            // In toggle mode the left button is sticky; ignore mouseup.
            if (e.button === 0 && !toggleMode) this.mouse.leftDown = false;
            if (e.button === 2) this.mouse.rightDown = false;
        });

        window.addEventListener('contextmenu', e => e.preventDefault());

        // #139 Auto-pause on tab switch / window blur.
        const autoPause = () => {
            const cfg = window.gameConfig;
            if (!cfg || !cfg.pauseOnFocusLoss) return;
            if (typeof gameRunning === 'undefined' || !gameRunning) return;
            if (typeof gamePaused !== 'undefined' && gamePaused) return;
            if (typeof isLevelingUp !== 'undefined' && isLevelingUp) return;
            if (typeof isShopping !== 'undefined' && isShopping) return;
            if (typeof window.togglePause === 'function') window.togglePause();
        };
        document.addEventListener('visibilitychange', () => {
            if (document.hidden) autoPause();
        });
        window.addEventListener('blur', autoPause);

        // #139 Auto-pause when a connected gamepad disconnects mid-run.
        window.addEventListener('gamepaddisconnected', () => {
            const cfg = window.gameConfig;
            if (!cfg || !cfg.pauseOnGamepadDisconnect) return;
            if (typeof gameRunning === 'undefined' || !gameRunning) return;
            if (typeof gamePaused !== 'undefined' && gamePaused) return;
            // Only pause if a gamepad was actually being used (mouse-only players unaffected).
            const wasUsingGamepad = !!(window.player && window.player.usingGamepad);
            if (!wasUsingGamepad) return;
            if (typeof window.togglePause === 'function') window.togglePause();
        });
    }
}

export { InputManager };
export default InputManager;
