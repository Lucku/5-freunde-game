// #5 phase 5.10b — Projectile compat shim.
//
// Real storage lives on `runState.projectile*` typed arrays — see
// `core/systems/projectileSystem.js`. This file is the back-compat layer
// so the ~86 existing `Projectile.acquire(...)` / `new Projectile(...)`
// callsites and the ~50 leaf-module access patterns (`projectiles.X` /
// `projectiles[i]` / `projectiles.splice(i, 1)` / `projectiles.indexOf(p)` /
// `projectiles.length`) keep working unchanged.
//
// Two surfaces:
//
//   1. `Projectile.acquire(...)` / `new Projectile(...)` — spawns an ECS
//      slot and returns the system's `ProjectileSlot` proxy. The proxy
//      forwards `.x` / `.y` / `.velocity.x` / `.life` / `.type` / etc.
//      reads/writes to the typed arrays at that slot, and stores `_*`
//      custom DLC fields on a per-slot extras dictionary.
//
//   2. `window.projectiles` — Proxy-wrapped sentinel that looks like a real
//      Array. Iteration, subscript, `.length`, `.splice`, `.indexOf`,
//      `.push`, `.some`, `.filter`, `.forEach`, `.map`, `.find`,
//      `.findIndex` all dispatch to the ECS slots via system fns.

import { runState } from '../RunState.js';
import {
    spawnProjectile, killProjectile, clearProjectiles,
    _acquireProjectileSlot, MAX_PROJECTILES,
} from '../core/systems/projectileSystem.js';

const Projectile = {
    acquire(x, y, velocity, damage, color, radius, type, knockback, isEnemy, isExplosive = false, isCrit = false /* , world */) {
        const i = spawnProjectile(runState, x, y, velocity, damage, color, radius, type, knockback, isEnemy, {
            isExplosive,
            isCrit,
        });
        if (i < 0) return _DEAD;
        return _acquireProjectileSlot(runState, i);
    },
    release(/* p */) {
        // No-op — kill happens via splice/length/indexOf paths.
    },
    // Back-compat constants for tests + diagnostics.
    POOL_MAX: 0,
    _pool: [],
};

// Sentinel returned when MAX_PROJECTILES cap is hit — `_slot = -1` makes
// every accessor on the proxy a no-op so the caller's mutations vanish
// harmlessly.
const _DEAD = _makeDeadSlot();
function _makeDeadSlot() {
    // Build a one-off proxy whose every property is null/0/undefined.
    return new Proxy({}, {
        get(_t, prop) {
            if (prop === 'velocity') return { x: 0, y: 0 };
            if (prop === '_slot') return -1;
            if (prop === 'life')  return null;
            return 0;
        },
        set() { return true; },
    });
}

// `new Projectile(...)` legacy ctor — delegates to acquire.
class ProjectileCtor {
    constructor(x, y, velocity, damage, color, radius, type, knockback, isEnemy, isExplosive = false, isCrit = false, world = null) {
        return Projectile.acquire(x, y, velocity, damage, color, radius, type, knockback, isEnemy, isExplosive, isCrit, world);
    }
}
// Mirror static API + name so `typeof Projectile === 'function'` checks pass.
Object.assign(ProjectileCtor, Projectile);

export { ProjectileCtor as Projectile };
export default ProjectileCtor;

// ── `window.projectiles` smart sentinel ────────────────────────────────────

const _projectilesSentinel = new Proxy({}, {
    get(_target, prop) {
        // Numeric subscript → slot proxy
        if (typeof prop === 'string') {
            // Fast-path: integer string ('0', '1', '42')
            if (/^\d+$/.test(prop)) {
                const i = Number(prop);
                if (i < 0 || i >= runState.projectileCount) return undefined;
                return _acquireProjectileSlot(runState, i);
            }
        } else if (typeof prop === 'number') {
            if (prop < 0 || prop >= runState.projectileCount) return undefined;
            return _acquireProjectileSlot(runState, prop);
        }

        switch (prop) {
            case 'length':
                return runState.projectileCount;
            case Symbol.iterator:
                return _iter;
            case 'forEach':
                return _forEach;
            case 'some':
                return _some;
            case 'every':
                return _every;
            case 'find':
                return _find;
            case 'findIndex':
                return _findIndex;
            case 'filter':
                return _filter;
            case 'map':
                return _map;
            case 'indexOf':
                return _indexOf;
            case 'splice':
                return _splice;
            case 'push':
                return _push;
            case 'slice':
                return _slice;
            case 'concat':
                return _concat;
            case 'constructor':
                return Array;
            // Array.isArray check.
            case Symbol.toStringTag:
                return undefined;
            default:
                return undefined;
        }
    },
    set(_target, prop, value) {
        if (prop === 'length') {
            // `projectiles.length = 0` → clear.
            if (value === 0 || value === '0') clearProjectiles(runState);
            return true;
        }
        // Numeric assignment `projectiles[i] = X` not supported (no current site uses it).
        return true;
    },
    has(_target, prop) {
        if (typeof prop === 'string' && /^\d+$/.test(prop)) {
            return Number(prop) < runState.projectileCount;
        }
        return prop in Array.prototype;
    },
});

function* _iter() {
    for (let i = 0; i < runState.projectileCount; i++) {
        yield _acquireProjectileSlot(runState, i);
    }
}
function _forEach(cb, thisArg) {
    for (let i = 0; i < runState.projectileCount; i++) {
        cb.call(thisArg, _acquireProjectileSlot(runState, i), i, _projectilesSentinel);
    }
}
function _some(pred, thisArg) {
    for (let i = 0; i < runState.projectileCount; i++) {
        if (pred.call(thisArg, _acquireProjectileSlot(runState, i), i, _projectilesSentinel)) return true;
    }
    return false;
}
function _every(pred, thisArg) {
    for (let i = 0; i < runState.projectileCount; i++) {
        if (!pred.call(thisArg, _acquireProjectileSlot(runState, i), i, _projectilesSentinel)) return false;
    }
    return true;
}
function _find(pred, thisArg) {
    for (let i = 0; i < runState.projectileCount; i++) {
        const p = _acquireProjectileSlot(runState, i);
        if (pred.call(thisArg, p, i, _projectilesSentinel)) return p;
    }
    return undefined;
}
function _findIndex(pred, thisArg) {
    for (let i = 0; i < runState.projectileCount; i++) {
        if (pred.call(thisArg, _acquireProjectileSlot(runState, i), i, _projectilesSentinel)) return i;
    }
    return -1;
}
function _filter(pred, thisArg) {
    const out = [];
    for (let i = 0; i < runState.projectileCount; i++) {
        const p = _acquireProjectileSlot(runState, i);
        if (pred.call(thisArg, p, i, _projectilesSentinel)) out.push(p);
    }
    return out;
}
function _map(cb, thisArg) {
    const out = new Array(runState.projectileCount);
    for (let i = 0; i < runState.projectileCount; i++) {
        out[i] = cb.call(thisArg, _acquireProjectileSlot(runState, i), i, _projectilesSentinel);
    }
    return out;
}
function _indexOf(searchElement) {
    // Sentinel-backed proxies expose `_slotIdx()` for direct lookup.
    if (searchElement && typeof searchElement._slotIdx === 'function') {
        const idx = searchElement._slotIdx();
        if (idx >= 0 && idx < runState.projectileCount) return idx;
        return -1;
    }
    // Inner-class proxies from Proxy wrapper — `_slot` property.
    if (searchElement && typeof searchElement === 'object') {
        // Read slot index through the proxy itself (passes through to inner).
        const slot = searchElement._slot;
        if (typeof slot === 'number' && slot >= 0 && slot < runState.projectileCount) return slot;
    }
    return -1;
}
function _splice(start, deleteCount, ...inserts) {
    if (inserts.length > 0) {
        // No current site uses insert-mode splice; reject silently.
        return [];
    }
    const removed = [];
    const dc = (deleteCount === undefined) ? runState.projectileCount - start : deleteCount;
    for (let k = 0; k < dc; k++) {
        if (start >= runState.projectileCount) break;
        // killProjectile swaps-with-last, so we kill at `start` each iter.
        // Capture the proxy first (for return value) before its slot moves.
        removed.push(_acquireProjectileSlot(runState, start));
        killProjectile(runState, start);
    }
    return removed;
}
function _push() {
    // No-op — slots are allocated in spawnProjectile. Returns new length so
    // chains like `arr.push(p)` behave like Array#push.
    return runState.projectileCount;
}
function _slice(begin = 0, end = runState.projectileCount) {
    const out = [];
    for (let i = begin; i < Math.min(end, runState.projectileCount); i++) {
        out.push(_acquireProjectileSlot(runState, i));
    }
    return out;
}
function _concat(...arrs) {
    const out = _slice();
    for (const a of arrs) {
        if (Array.isArray(a)) out.push(...a);
        else out.push(a);
    }
    return out;
}

if (typeof window !== 'undefined') {
    window.projectiles = _projectilesSentinel;
    window.Projectile = ProjectileCtor;
    void MAX_PROJECTILES; // re-export for callers that read the cap
}
