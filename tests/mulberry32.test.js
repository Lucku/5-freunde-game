import { describe, it, expect } from 'vitest';
import { mulberry32 } from '../Utils.js';

describe('mulberry32', () => {
    it('is deterministic for a given seed', () => {
        const a = mulberry32(42);
        const b = mulberry32(42);
        for (let i = 0; i < 100; i++) {
            expect(a()).toBe(b());
        }
    });

    it('different seeds yield different streams', () => {
        const a = mulberry32(1);
        const b = mulberry32(2);
        let diff = 0;
        for (let i = 0; i < 100; i++) if (a() !== b()) diff++;
        expect(diff).toBe(100);
    });

    it('outputs are in [0, 1)', () => {
        const r = mulberry32(7);
        for (let i = 0; i < 10000; i++) {
            const v = r();
            expect(v).toBeGreaterThanOrEqual(0);
            expect(v).toBeLessThan(1);
        }
    });

    it('rough uniformity across [0, 1) — no bucket more than 30% off expected', () => {
        const r = mulberry32(20260511);
        const buckets = new Array(10).fill(0);
        const N = 100_000;
        for (let i = 0; i < N; i++) buckets[Math.floor(r() * 10)]++;
        const expected = N / 10;
        for (const b of buckets) {
            expect(Math.abs(b - expected) / expected).toBeLessThan(0.03); // within 3%
        }
    });
});
