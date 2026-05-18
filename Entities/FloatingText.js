// #5 phase 5.5 — FloatingText compat shim.
//
// Real storage lives on `runState.floatingText*` typed arrays — see
// `core/systems/floatingTextSystem.js`. This file used to host the class +
// pool; now it's a thin wrapper so the ~155 existing `FloatingText.acquire(...)`
// + `floatingTexts.push(ft)` patterns across game.js / Player.js / Enemy.js /
// Boss.js / Companion.js / Arena.js / EvilHeroes.js / 4+ DLCs keep working
// unchanged.
//
// `acquire` spawns a slot in the ECS arrays and returns a FloatingTextSlot
// proxy whose setters write back to the slot. `floatingTexts.push(ft)` is a
// no-op via the `window.floatingTexts` sentinel (see below). `release` is a
// no-op too — slots die automatically when life hits 0 in `updateFloatingTexts`.

import { runState } from '../RunState.js';
import { spawnFloatingText, detectCrit } from '../core/systems/floatingTextSystem.js';

class FloatingTextSlot {
    constructor(slot) {
        this._slot = slot;
        const self = this;
        this._velocityProxy = {
            get x() { return self._slot >= 0 ? runState.floatingTextVX[self._slot] : 0; },
            set x(v) { if (self._slot >= 0) runState.floatingTextVX[self._slot] = v; },
            get y() { return self._slot >= 0 ? runState.floatingTextVY[self._slot] : 0; },
            set y(v) { if (self._slot >= 0) runState.floatingTextVY[self._slot] = v; },
        };
    }
    get velocity() { return this._velocityProxy; }
    set velocity(v) {
        if (this._slot < 0 || !v) return;
        if ('x' in v) runState.floatingTextVX[this._slot] = v.x;
        if ('y' in v) runState.floatingTextVY[this._slot] = v.y;
    }
    get life()    { return this._slot >= 0 ? runState.floatingTextLife[this._slot]    : 0; }
    set life(v)   { if (this._slot >= 0) runState.floatingTextLife[this._slot] = v; }
    get maxLife() { return this._slot >= 0 ? runState.floatingTextMaxLife[this._slot] : 0; }
    set maxLife(v){ if (this._slot >= 0) runState.floatingTextMaxLife[this._slot] = v; }
    get size()    { return this._slot >= 0 ? runState.floatingTextSize[this._slot]    : 0; }
    set size(v)   { if (this._slot >= 0) runState.floatingTextSize[this._slot] = v; }
    get isCrit()  { return this._slot >= 0 ? !!runState.floatingTextIsCrit[this._slot] : false; }
    set isCrit(v) { if (this._slot >= 0) runState.floatingTextIsCrit[this._slot] = v ? 1 : 0; }
    get text()    { return this._slot >= 0 ? runState.floatingTextText[this._slot] : ''; }
    set text(v)   { if (this._slot >= 0) runState.floatingTextText[this._slot] = v; }
    get x()       { return this._slot >= 0 ? runState.floatingTextX[this._slot] : 0; }
    set x(v)      { if (this._slot >= 0) runState.floatingTextX[this._slot] = v; }
    get y()       { return this._slot >= 0 ? runState.floatingTextY[this._slot] : 0; }
    set y(v)      { if (this._slot >= 0) runState.floatingTextY[this._slot] = v; }
}

const _DEAD = new FloatingTextSlot(-1);

const FloatingText = {
    acquire(x, y, text, color, size) {
        const i = spawnFloatingText(runState, x, y, text, color, size);
        if (i < 0) return _DEAD;
        return new FloatingTextSlot(i);
    },
    // Pool deprecation — life decay kills slots automatically.
    release() {},
    POOL_MAX: 0,
    _pool: [],
    _detectCrit: detectCrit,
};

export { FloatingText };
export default FloatingText;

if (typeof window !== 'undefined') {
    const _ftShim = {
        push() {},
        forEach() {},
        splice() {},
        get length() { return runState.floatingTextCount; },
    };
    if (!('floatingTexts' in window) || Array.isArray(window.floatingTexts)) {
        window.floatingTexts = _ftShim;
    }
    window.FloatingText = FloatingText;
}
