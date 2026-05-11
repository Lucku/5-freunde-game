import { describe, it, expect } from 'vitest';

// Inline port of game.js `_onlineInterpBuf`. Kept here verbatim from
// game.js:4310-4358 (post-edit line numbers) so the test exercises the exact
// production algorithm. When the algorithm changes, sync this copy.
function interpBuf(buf, renderTime) {
    const n = buf.length;
    if (n === 0) return { x: 0, y: 0 };
    if (n === 1 || renderTime >= buf[n - 1].t) return { x: buf[n - 1].x, y: buf[n - 1].y };
    if (renderTime <= buf[0].t) return { x: buf[0].x, y: buf[0].y };

    for (let i = n - 2; i >= 0; i--) {
        if (buf[i].t > renderTime) continue;
        const p0 = buf[i], p1 = buf[i + 1];
        const dt = p1.t - p0.t;
        if (dt <= 0) return { x: p1.x, y: p1.y };
        const s = (renderTime - p0.t) / dt;

        const left  = (i - 1 >= 0) ? buf[i - 1] : null;
        const right = (i + 2 < n)  ? buf[i + 2] : null;

        if (!left && !right) {
            return { x: p0.x + (p1.x - p0.x) * s, y: p0.y + (p1.y - p0.y) * s };
        }

        const m0x = left  ? (p1.x - left.x)  / (p1.t - left.t)  : (p1.x - p0.x) / dt;
        const m0y = left  ? (p1.y - left.y)  / (p1.t - left.t)  : (p1.y - p0.y) / dt;
        const m1x = right ? (right.x - p0.x) / (right.t - p0.t) : (p1.x - p0.x) / dt;
        const m1y = right ? (right.y - p0.y) / (right.t - p0.t) : (p1.y - p0.y) / dt;

        const s2 = s * s, s3 = s2 * s;
        const h00 =  2 * s3 - 3 * s2 + 1;
        const h10 =      s3 - 2 * s2 + s;
        const h01 = -2 * s3 + 3 * s2;
        const h11 =      s3 -     s2;

        return {
            x: h00 * p0.x + h10 * dt * m0x + h01 * p1.x + h11 * dt * m1x,
            y: h00 * p0.y + h10 * dt * m0y + h01 * p1.y + h11 * dt * m1y,
        };
    }
    return { x: buf[0].x, y: buf[0].y };
}

describe('Hermite snapshot interpolation', () => {
    it('returns origin for empty buffer', () => {
        expect(interpBuf([], 0)).toEqual({ x: 0, y: 0 });
    });

    it('clamps to oldest when renderTime is before buffer', () => {
        const buf = [{ x: 10, y: 20, t: 1000 }, { x: 30, y: 40, t: 2000 }];
        expect(interpBuf(buf, 500)).toEqual({ x: 10, y: 20 });
    });

    it('clamps to newest when renderTime is past buffer', () => {
        const buf = [{ x: 10, y: 20, t: 1000 }, { x: 30, y: 40, t: 2000 }];
        expect(interpBuf(buf, 5000)).toEqual({ x: 30, y: 40 });
    });

    it('falls back to linear when only two points (no neighbors)', () => {
        const buf = [{ x: 0, y: 0, t: 0 }, { x: 100, y: 100, t: 100 }];
        const mid = interpBuf(buf, 50);
        expect(mid.x).toBeCloseTo(50, 6);
        expect(mid.y).toBeCloseTo(50, 6);
    });

    it('returns last point if dt is zero', () => {
        const buf = [{ x: 0, y: 0, t: 1000 }, { x: 99, y: 99, t: 1000 }];
        const out = interpBuf(buf, 1000);
        // renderTime >= last.t triggers clamp-to-newest before the dt path
        expect(out).toEqual({ x: 99, y: 99 });
    });

    it('collinear constant-velocity samples match linear within 1e-6', () => {
        // Points along y = 2x + 5, equally spaced in time. Hermite + Catmull-Rom
        // tangents recover the line exactly for constant velocity.
        const buf = [];
        for (let i = 0; i < 6; i++) buf.push({ x: i * 10, y: i * 10 * 2 + 5, t: i * 100 });
        // Sample at t = 150 (between p1 and p2). Expected x = 15, y = 35.
        const out = interpBuf(buf, 150);
        expect(out.x).toBeCloseTo(15, 6);
        expect(out.y).toBeCloseTo(35, 6);
    });

    it('produces smooth (non-overshooting) curve at corner points', () => {
        // Sharp 90° turn: x goes 0,10,20,20,20; y goes 0,0,0,10,20.
        // Hermite should not overshoot the corner samples by more than 2x
        // their spacing.
        const buf = [
            { x: 0,  y: 0,  t: 0 },
            { x: 10, y: 0,  t: 100 },
            { x: 20, y: 0,  t: 200 },
            { x: 20, y: 10, t: 300 },
            { x: 20, y: 20, t: 400 },
        ];
        // Sample inside p1→p2 segment
        const out = interpBuf(buf, 150);
        // Real-world max overshoot near sharp turn is bounded; we just assert no
        // crazy outliers (a buggy implementation would emit values far outside [0,30]).
        expect(out.x).toBeGreaterThanOrEqual(0);
        expect(out.x).toBeLessThanOrEqual(30);
        expect(out.y).toBeGreaterThanOrEqual(-5);
        expect(out.y).toBeLessThanOrEqual(15);
    });
});
