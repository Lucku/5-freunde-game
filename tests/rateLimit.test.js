import { describe, it, expect } from 'vitest';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const { makeRateLimiter } = require('../server/anticheat.js');

describe('makeRateLimiter (token bucket)', () => {
    it('allows up to capacity bursts', () => {
        const buckets = new Map();
        let t = 1000;
        const limit = makeRateLimiter({ capacity: 5, refillPerSec: 1, buckets, now: () => t });
        for (let i = 0; i < 5; i++) {
            expect(limit('ip1').allowed).toBe(true);
        }
        expect(limit('ip1').allowed).toBe(false);
    });

    it('refills tokens over time', () => {
        const buckets = new Map();
        let t = 0;
        const limit = makeRateLimiter({ capacity: 2, refillPerSec: 1, buckets, now: () => t });
        // Drain
        expect(limit('ip').allowed).toBe(true);
        expect(limit('ip').allowed).toBe(true);
        expect(limit('ip').allowed).toBe(false);
        // 1.5s later → 1.5 tokens, takes the integer one
        t += 1500;
        expect(limit('ip').allowed).toBe(true);
        // No tokens immediately after
        expect(limit('ip').allowed).toBe(false);
    });

    it('reports retryAfterSec when exhausted', () => {
        const buckets = new Map();
        let t = 0;
        const limit = makeRateLimiter({ capacity: 1, refillPerSec: 0.5, buckets, now: () => t });
        expect(limit('ip').allowed).toBe(true);
        const denied = limit('ip');
        expect(denied.allowed).toBe(false);
        // ceil((1 - 0) / 0.5) = 2 seconds
        expect(denied.retryAfterSec).toBe(2);
    });

    it('isolates buckets per key (different IPs)', () => {
        const buckets = new Map();
        const limit = makeRateLimiter({ capacity: 1, refillPerSec: 0.001, buckets, now: () => 1000 });
        expect(limit('a').allowed).toBe(true);
        expect(limit('a').allowed).toBe(false);
        expect(limit('b').allowed).toBe(true); // separate bucket
    });

    it('clamps refill at capacity (no overflow)', () => {
        const buckets = new Map();
        let t = 0;
        const limit = makeRateLimiter({ capacity: 3, refillPerSec: 10, buckets, now: () => t });
        limit('ip'); // consume 1, bucket = 2
        t += 60_000; // way past full refill window
        // Drain 3 tokens (cap clamped)
        expect(limit('ip').allowed).toBe(true);
        expect(limit('ip').allowed).toBe(true);
        expect(limit('ip').allowed).toBe(true);
        expect(limit('ip').allowed).toBe(false);
    });
});
