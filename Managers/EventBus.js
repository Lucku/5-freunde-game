/**
 * EventBus — simple pub/sub for cross-module signalling.
 *
 * Created during Phase 8a (2026-05-11) as the foundation for the eventual
 * game.js split (improvement #1). Lets future extracted modules (`Spawner`,
 * `Wave`, `RunState`, `GameLoop`) communicate without recreating ad-hoc global
 * function references.
 *
 * Usage:
 *   import { eventBus } from './Managers/EventBus.js';
 *
 *   eventBus.on('wave:complete', (waveNum) => { ... });
 *   eventBus.emit('wave:complete', 12);
 *   const unsubscribe = eventBus.on('player:level_up', handler);
 *   unsubscribe();
 *
 * Naming convention: `domain:event` (lowercase, colon-separated). Examples
 * the split will introduce:
 *   wave:start, wave:complete, wave:advance
 *   player:level_up, player:damage_taken, player:death
 *   boss:spawn, boss:phase_change, boss:defeat
 *   run:start, run:end, run:save
 *   spawner:enemy_spawned, spawner:limit_reached
 *
 * Synchronous dispatch — handlers run in registration order. Throwing from a
 * handler does not abort other handlers (errors logged via console.error).
 */
class EventBus {
    constructor() {
        this._handlers = new Map(); // name → Array<fn>
    }

    on(event, fn) {
        let arr = this._handlers.get(event);
        if (!arr) { arr = []; this._handlers.set(event, arr); }
        arr.push(fn);
        return () => this.off(event, fn);
    }

    off(event, fn) {
        const arr = this._handlers.get(event);
        if (!arr) return;
        const idx = arr.indexOf(fn);
        if (idx >= 0) arr.splice(idx, 1);
        if (arr.length === 0) this._handlers.delete(event);
    }

    once(event, fn) {
        const off = this.on(event, (...args) => {
            off();
            fn(...args);
        });
        return off;
    }

    emit(event, ...args) {
        const arr = this._handlers.get(event);
        if (!arr) return;
        // Iterate a copy so handlers can off() themselves without skipping.
        const snapshot = arr.slice();
        for (const fn of snapshot) {
            try { fn(...args); }
            catch (e) { console.error(`[EventBus] handler for "${event}" threw:`, e); }
        }
    }

    /** Diagnostic: list event names + handler counts. */
    stats() {
        const out = {};
        for (const [k, v] of this._handlers) out[k] = v.length;
        return out;
    }

    /** Clear ALL handlers — useful between runs or in tests. */
    clear() {
        this._handlers.clear();
    }
}

const eventBus = new EventBus();

export { EventBus, eventBus };
export default eventBus;
if (typeof window !== 'undefined') {
    window.eventBus = eventBus;
}
