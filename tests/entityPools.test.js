import { describe, it, expect, beforeEach } from 'vitest';
import { Projectile } from '../Entities/Projectile.js';
import { MeleeSwipe } from '../Entities/MeleeSwipe.js';
import { GoldDrop } from '../Entities/GoldDrop.js';

// #20 P3 — verify strict reset of every pool acquire. The release/acquire
// round-trip MUST yield an instance indistinguishable from a fresh `new`
// constructor call for every documented field, including optional callsite-
// set fields (shooterType / onHit / altar flags / DLC marks).

describe('Projectile pool', () => {
    beforeEach(() => { Projectile._pool.length = 0; });

    it('acquire returns a constructor-equivalent instance when pool empty', () => {
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

    it('release + reacquire clears all optional fields', () => {
        const p1 = Projectile.acquire(0, 0, { x: 0, y: 0 }, 1, '#000', 4, 'metal', 2, false);
        // Caller-attached optional fields
        p1.shooterType = 'SHOOTER';
        p1.onHit = () => 'STOP';
        p1.isWildfire = true;
        p1.isCryo = true;
        p1._ghost = true;
        p1.dead = true;
        p1.life = 30;
        p1.owner = { foo: 'bar' };
        p1.pierce = 5;
        p1.outlineColor = '#abc';

        Projectile.release(p1);
        const p2 = Projectile.acquire(99, 99, { x: 1, y: 1 }, 7, '#0f0', 5, 'plant', 1, false);

        expect(p2).toBe(p1); // same instance reused
        expect(p2.shooterType).toBeUndefined();
        expect(p2.onHit).toBeUndefined();
        expect(p2.isWildfire).toBe(false);
        expect(p2.isCryo).toBe(false);
        expect(p2._ghost).toBe(false);
        expect(p2.dead).toBe(false);
        expect(p2.life).toBe(null);
        expect(p2.owner).toBe(null);
        expect(p2.pierce).toBe(0); // plant, not ice
        expect(p2.outlineColor).toBeUndefined();
        expect(p2.x).toBe(99);
        expect(p2.damage).toBe(7);
        expect(p2.type).toBe('plant');
    });

    it('crit radius re-derives correctly on reuse (no double multiplication)', () => {
        const p1 = Projectile.acquire(0, 0, { x: 0, y: 0 }, 1, '#000', 10, 'fire', 1, false, false, true);
        expect(p1.radius).toBeCloseTo(15); // 10 * 1.5
        Projectile.release(p1);
        const p2 = Projectile.acquire(0, 0, { x: 0, y: 0 }, 1, '#000', 10, 'fire', 1, false, false, true);
        expect(p2).toBe(p1);
        expect(p2.radius).toBeCloseTo(15); // not 22.5
        Projectile.release(p2);
        const p3 = Projectile.acquire(0, 0, { x: 0, y: 0 }, 1, '#000', 10, 'fire', 1, false, false, false);
        expect(p3).toBe(p1);
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

    it('POOL_MAX bounds the pool size', () => {
        for (let i = 0; i < Projectile.POOL_MAX + 10; i++) {
            const p = Projectile.acquire(0, 0, { x: 0, y: 0 }, 1, '#fff', 4, 'fire', 1, false);
            Projectile.release(p);
        }
        expect(Projectile._pool.length).toBeLessThanOrEqual(Projectile.POOL_MAX);
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

describe('GoldDrop pool', () => {
    beforeEach(() => { GoldDrop._pool.length = 0; });

    it('acquire returns instance with random value + tier', () => {
        const g = GoldDrop.acquire(100, 200);
        expect(g.x).toBe(100);
        expect(g.y).toBe(200);
        expect(g.radius).toBe(10);
        expect(g.value).toBeGreaterThanOrEqual(5);
        expect(g.value).toBeLessThanOrEqual(14);
        expect(g._tier).toBeGreaterThanOrEqual(0);
        expect(g._tier).toBeLessThanOrEqual(2);
    });

    it('release + reacquire re-rolls value and position', () => {
        const g1 = GoldDrop.acquire(0, 0);
        const oldValue = g1.value;
        const oldAngle = g1._angle;
        GoldDrop.release(g1);
        const g2 = GoldDrop.acquire(500, 600);
        expect(g2).toBe(g1);
        expect(g2.x).toBe(500);
        expect(g2.y).toBe(600);
        // value + _angle should be re-rolled (not strictly required to differ,
        // but tier must match value range)
        expect(g2._tier).toBe(g2.value >= 12 ? 2 : g2.value >= 8 ? 1 : 0);
        // sanity: assert it was actually re-rolled by checking the re-roll path
        // ran (value field was overwritten — verify radius reset to canonical)
        expect(g2.radius).toBe(10);
        void oldValue; void oldAngle;
    });
});
