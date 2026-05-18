import { describe, it, expect, beforeEach } from 'vitest';
import { Projectile } from '../Entities/Projectile.js';
import { MeleeSwipe } from '../Entities/MeleeSwipe.js';
// #5 phase 5.7 — GoldDrop class removed; pool semantics replaced by ECS
// slot allocation in `core/systems/goldDropSystem.js`. Tests below assert
// against `runState.goldDrop*` typed arrays directly.
// #5 phase 5.10b — Projectile pool semantics likewise replaced by ECS slot
// allocation in `core/systems/projectileSystem.js`. The pool block was
// rewritten to assert on slot reuse + field-reset semantics through the
// compat-shim proxy.
import { runState } from '../RunState.js';
import {
    spawnGoldDrop, killGoldDrop, clearGoldDrops, MAX_GOLDDROPS,
} from '../core/systems/goldDropSystem.js';
import {
    clearProjectiles, MAX_PROJECTILES,
} from '../core/systems/projectileSystem.js';

// #20 P3 — verify strict reset of every pool acquire. The release/acquire
// round-trip MUST yield an instance indistinguishable from a fresh `new`
// constructor call for every documented field, including optional callsite-
// set fields (shooterType / onHit / altar flags / DLC marks).

describe('Projectile ECS slots', () => {
    beforeEach(() => { clearProjectiles(runState); });

    it('acquire returns a proxy with constructor-equivalent field reads', () => {
        const p = Projectile.acquire(10, 20, { x: 1, y: 2 }, 5, '#fff', 6, 'fire', 3, false);
        expect(p.x).toBe(10);
        expect(p.y).toBe(20);
        expect(p.damage).toBe(5);
        expect(p.type).toBe('fire');
        expect(p.isEnemy).toBe(false);
        expect(p.isCrit).toBe(false);
        expect(p.life).toBe(null);
        expect(p.owner).toBe(null);
        expect(p.pierce).toBe(0); // fire, not ice
    });

    it('kill + spawn re-uses the freed slot with fresh field values', () => {
        const p1 = Projectile.acquire(0, 0, { x: 0, y: 0 }, 1, '#000', 4, 'metal', 2, false);
        p1.shooterType = 'SHOOTER';
        p1.onHit = () => 'STOP';
        p1.isWildfire = true;
        p1.isCryo = true;
        p1.life = 30;
        p1.owner = { foo: 'bar' };
        p1.pierce = 5;
        p1.outlineColor = '#abc';

        const slot1 = p1._slotIdx();
        expect(slot1).toBe(0);
        // killProjectile(runState, 0) — swap-with-last on a single-slot run
        // simply decrements count.
        clearProjectiles(runState);

        const p2 = Projectile.acquire(99, 99, { x: 1, y: 1 }, 7, '#0f0', 5, 'plant', 1, false);
        expect(p2._slotIdx()).toBe(0); // same slot reused

        // Fresh slot has none of p1's mutations.
        expect(p2.shooterType).toBeUndefined();
        expect(p2.onHit).toBe(null);
        expect(p2.isWildfire).toBe(false);
        expect(p2.isCryo).toBe(false);
        expect(p2.life).toBe(null);
        expect(p2.owner).toBe(null);
        expect(p2.pierce).toBe(0); // plant, not ice
        expect(p2.outlineColor).toBe(null);
        expect(p2.x).toBe(99);
        expect(p2.damage).toBe(7);
        expect(p2.type).toBe('plant');
    });

    it('crit radius applies once at spawn, no double multiplication on slot reuse', () => {
        const p1 = Projectile.acquire(0, 0, { x: 0, y: 0 }, 1, '#000', 10, 'fire', 1, false, false, true);
        expect(p1.radius).toBeCloseTo(15); // 10 * 1.5
        clearProjectiles(runState);
        const p2 = Projectile.acquire(0, 0, { x: 0, y: 0 }, 1, '#000', 10, 'fire', 1, false, false, true);
        expect(p2._slotIdx()).toBe(0);
        expect(p2.radius).toBeCloseTo(15); // not 22.5 — base radius re-read, not previous
        clearProjectiles(runState);
        const p3 = Projectile.acquire(0, 0, { x: 0, y: 0 }, 1, '#000', 10, 'fire', 1, false, false, false);
        expect(p3.radius).toBe(10); // crit cleared, base radius
    });

    it('ice projectile pierce defaults to 2 for player shots', () => {
        const p = Projectile.acquire(0, 0, { x: 0, y: 0 }, 1, '#0ff', 4, 'ice', 1, false);
        expect(p.pierce).toBe(2);
    });

    it('ice enemy projectile has no default pierce', () => {
        const p = Projectile.acquire(0, 0, { x: 0, y: 0 }, 1, '#0ff', 4, 'ice', 1, true);
        expect(p.pierce).toBe(0);
    });

    it('MAX_PROJECTILES cap returns dead-slot sentinel on overflow', () => {
        for (let i = 0; i < MAX_PROJECTILES; i++) {
            Projectile.acquire(0, 0, { x: 0, y: 0 }, 1, '#fff', 4, 'fire', 1, false);
        }
        expect(runState.projectileCount).toBe(MAX_PROJECTILES);
        const dead = Projectile.acquire(0, 0, { x: 0, y: 0 }, 1, '#fff', 4, 'fire', 1, false);
        // _DEAD sentinel: every read returns 0/null, _slot is -1.
        expect(dead._slot).toBe(-1);
    });
});

describe('MeleeSwipe pool', () => {
    beforeEach(() => { MeleeSwipe._pool.length = 0; });

    it('acquire returns instance with empty hitList', () => {
        const a = MeleeSwipe.acquire(10, 20, 0.5, 30, '#fff', 80);
        expect(a.x).toBe(10);
        expect(a.angle).toBe(0.5);
        expect(a.life).toBe(15);
        expect(a.maxLife).toBe(15);
        expect(a.hitList).toEqual([]);
        expect(a.isCrit).toBe(false);
    });

    it('release + reacquire resets hitList in place', () => {
        const a1 = MeleeSwipe.acquire(0, 0, 0, 1, '#fff', 50);
        a1.hitList.push(7, 8, 9);
        a1.life = 1;
        Projectile._pool.length = 0; // independence
        MeleeSwipe.release(a1);
        const a2 = MeleeSwipe.acquire(50, 50, 1, 5, '#000', 60, true, null);
        expect(a2).toBe(a1);
        expect(a2.hitList).toEqual([]);
        expect(a2.life).toBe(15);
        expect(a2.isCrit).toBe(true);
        expect(a2.damage).toBe(5);
    });
});

describe('GoldDrop ECS slots', () => {
    beforeEach(() => { clearGoldDrops(runState); });

    it('spawn allocates a slot with random value + tier', () => {
        const i = spawnGoldDrop(runState, 100, 200);
        expect(i).toBe(0);
        expect(runState.goldDropX[i]).toBe(100);
        expect(runState.goldDropY[i]).toBe(200);
        expect(runState.goldDropValue[i]).toBeGreaterThanOrEqual(5);
        expect(runState.goldDropValue[i]).toBeLessThanOrEqual(14);
        expect(runState.goldDropTier[i]).toBeGreaterThanOrEqual(0);
        expect(runState.goldDropTier[i]).toBeLessThanOrEqual(2);
        expect(runState.goldDropCount).toBe(1);
    });

    it('kill + spawn re-uses the freed slot (swap-with-last semantics)', () => {
        const i1 = spawnGoldDrop(runState, 0, 0);
        killGoldDrop(runState, i1);
        const i2 = spawnGoldDrop(runState, 500, 600);
        expect(i2).toBe(i1); // same slot reused
        expect(runState.goldDropX[i2]).toBe(500);
        expect(runState.goldDropY[i2]).toBe(600);
        // tier consistent with new value
        const v = runState.goldDropValue[i2];
        expect(runState.goldDropTier[i2]).toBe(v >= 12 ? 2 : v >= 8 ? 1 : 0);
    });

    it('MAX_GOLDDROPS cap returns -1 on overflow', () => {
        for (let i = 0; i < MAX_GOLDDROPS; i++) spawnGoldDrop(runState, 0, 0);
        expect(runState.goldDropCount).toBe(MAX_GOLDDROPS);
        expect(spawnGoldDrop(runState, 0, 0)).toBe(-1);
    });
});
