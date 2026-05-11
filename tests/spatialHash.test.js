import { describe, it, expect } from 'vitest';
import SpatialHash from '../Managers/SpatialHash.js';

describe('SpatialHash', () => {
    it('query returns entities in overlapping cells', () => {
        const h = new SpatialHash(100);
        h.rebuild([
            { x: 10, y: 10, id: 'a' },
            { x: 50, y: 50, id: 'b' },
            { x: 500, y: 500, id: 'c' }, // far away
        ]);
        const near = h.query(20, 20, 50);
        const ids = near.map((e) => e.id).sort();
        expect(ids).toEqual(['a', 'b']);
    });

    it('query returns empty for empty hash', () => {
        const h = new SpatialHash(100);
        expect(h.query(0, 0, 100)).toEqual([]);
    });

    it('rebuild clears previous entries', () => {
        const h = new SpatialHash(50);
        h.rebuild([{ x: 0, y: 0, id: 'old' }]);
        h.rebuild([{ x: 1000, y: 1000, id: 'new' }]);
        expect(h.query(0, 0, 50)).toEqual([]);
        expect(h.query(1000, 1000, 50).map((e) => e.id)).toEqual(['new']);
    });

    it('skips entities without x/y', () => {
        const h = new SpatialHash(100);
        h.rebuild([{ id: 'badboi' }, { x: 0, y: 0, id: 'ok' }, null]);
        const all = h.query(0, 0, 5);
        expect(all.map((e) => e.id)).toEqual(['ok']);
    });

    it('query spans multiple cells when radius exceeds cellSize', () => {
        const h = new SpatialHash(50);
        h.rebuild([
            { x: 10, y: 10, id: 'a' },
            { x: 60, y: 10, id: 'b' }, // different cell on x
            { x: 110, y: 10, id: 'c' }, // farther cell on x
        ]);
        const near = h.query(20, 10, 80);
        const ids = near.map((e) => e.id).sort();
        // a + b sit in cells covered by the query AABB; c is at x=110 so its
        // cell (index 2) is still inside the [-60,100] x-range covered.
        expect(ids).toContain('a');
        expect(ids).toContain('b');
        expect(ids).toContain('c');
    });

    it('stats() reports bucket counts', () => {
        const h = new SpatialHash(50);
        h.rebuild([
            { x: 0, y: 0 },
            { x: 1, y: 1 },
            { x: 1000, y: 1000 },
        ]);
        const s = h.stats();
        expect(s.buckets).toBe(2);
        expect(s.total).toBe(3);
        expect(s.maxBucket).toBe(2);
    });
});
