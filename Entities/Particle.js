// #5 phase 5.4 — Particle compat shim.
//
// The real storage lives on `runState.particle*` typed arrays — see
// `core/systems/particleSystem.js`. This file used to host the class +
// pool + sprite cache; now it's a back-compat wrapper so the ~115 existing
// `Particle.acquire(...)` call sites across game.js / Player.js / Enemy.js
// / Spawner.js / Biomes.js / UI / 17 DLCs keep working unchanged. The
// pattern:
//
//   const p = Particle.acquire(x, y, color);
//   p.velocity.x = vx; p.velocity.y = vy;
//   p.life = 0.018;
//   particles.push(p);
//
// routes through this shim: `acquire` spawns a slot in the ECS arrays and
// returns a ParticleSlot proxy whose setters write back to that slot.
// `particles.push(p)` is a no-op because the slot is already live.
// `Particle.release` is a no-op too — slots die automatically when alpha
// hits 0 in `updateParticles`.
//
// The `window.particles` global stays defined as a sentinel object (no-op
// push, `length` reads the ECS count) so DLC `typeof particles !== 'undefined'`
// guards still see something truthy.

import { runState } from '../RunState.js';
import { spawnParticle, MAX_PARTICLES } from '../core/systems/particleSystem.js';

class ParticleSlot {
    constructor(slot) {
        this._slot = slot;
        // Cached velocity accessor so callers can do `p.velocity.x = ...`
        // without allocating a new sub-object on every mutation.
        const self = this;
        this._velocityProxy = {
            get x() { return self._slot >= 0 ? runState.particleVX[self._slot] : 0; },
            set x(v) { if (self._slot >= 0) runState.particleVX[self._slot] = v; },
            get y() { return self._slot >= 0 ? runState.particleVY[self._slot] : 0; },
            set y(v) { if (self._slot >= 0) runState.particleVY[self._slot] = v; },
        };
    }
    get velocity() { return this._velocityProxy; }
    set velocity(v) {
        // Whole-object replacement: copy x/y onto the slot.
        if (this._slot < 0 || !v) return;
        if ('x' in v) runState.particleVX[this._slot] = v.x;
        if ('y' in v) runState.particleVY[this._slot] = v.y;
    }
    get life()  { return this._slot >= 0 ? runState.particleLife[this._slot]  : 0; }
    set life(v) { if (this._slot >= 0) runState.particleLife[this._slot] = v; }
    get alpha() { return this._slot >= 0 ? runState.particleAlpha[this._slot] : 0; }
    set alpha(v){ if (this._slot >= 0) runState.particleAlpha[this._slot] = v; }
    get x()  { return this._slot >= 0 ? runState.particleX[this._slot] : 0; }
    set x(v) { if (this._slot >= 0) runState.particleX[this._slot] = v; }
    get y()  { return this._slot >= 0 ? runState.particleY[this._slot] : 0; }
    set y(v) { if (this._slot >= 0) runState.particleY[this._slot] = v; }
}

// Sentinel returned when the ECS cap is hit — slot index -1 makes every
// setter a no-op so the caller's mutations harmlessly disappear.
const _DEAD = new ParticleSlot(-1);

const Particle = {
    acquire(x, y, color, vel) {
        let vx, vy;
        if (vel && typeof vel === 'object') { vx = vel.x; vy = vel.y; }
        const i = spawnParticle(runState, x, y, color, vx, vy);
        if (i < 0) return _DEAD;
        return new ParticleSlot(i);
    },
    // Pool deprecation per ecs-design.md — life decay kills slots
    // automatically inside updateParticles. release becomes a no-op.
    release() {},
    POOL_MAX: 0,
    _pool: [],
};

export { Particle };
export default Particle;

// `window.particles` sentinel — DLC guards (`typeof particles !== 'undefined'`)
// see a truthy push-able object. Pushes are dropped because the ECS slot was
// already allocated in `Particle.acquire`.
if (typeof window !== 'undefined') {
    const _particlesShim = {
        push() {},
        forEach() {},
        get length() { return runState.particleCount; },
    };
    // Only install if game.js hasn't already wired `runState.particles`
    // (legacy class-array path, removed in this phase).
    if (!('particles' in window) || Array.isArray(window.particles)) {
        // game.js destructure will overwrite this with a real array if it still
        // exists — but #5 phase 5.4 drops that destructure entry, so this
        // shim wins for the rest of the session.
        window.particles = _particlesShim;
    }
    window.Particle = Particle;
    void MAX_PARTICLES; // re-exported for callers that read the cap
}
