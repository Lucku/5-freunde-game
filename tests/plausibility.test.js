import { describe, it, expect } from 'vitest';
import { createRequire } from 'node:module';

// anticheat.js is CommonJS; load via createRequire to stay native to Vitest's ESM runner.
const require = createRequire(import.meta.url);
const { plausibilityReject, MAX_WAVE, MAX_SCORE } = require('../server/anticheat.js');

describe('plausibilityReject', () => {
    it('accepts realistic short run', () => {
        expect(plausibilityReject(10, 5000, 120)).toBeNull();
    });

    it('accepts realistic long run', () => {
        expect(plausibilityReject(50, 200000, 1500)).toBeNull();
    });

    it('rejects negative wave', () => {
        expect(plausibilityReject(-1, 100, 60)).toMatch(/wave out of range/);
    });

    it('rejects wave beyond cap', () => {
        expect(plausibilityReject(MAX_WAVE + 1, 100, 999999)).toMatch(/wave out of range/);
    });

    it('rejects negative score', () => {
        expect(plausibilityReject(10, -1, 100)).toMatch(/score out of range/);
    });

    it('rejects score beyond cap', () => {
        expect(plausibilityReject(10, MAX_SCORE + 1, 1000)).toMatch(/score out of range/);
    });

    it('rejects sub-8-sec-per-wave runs once past wave 5', () => {
        expect(plausibilityReject(20, 10000, 20)).toMatch(/time\/wave/);
    });

    it('allows fast-clear under wave 5 (no time check)', () => {
        // Wave 4 with 5s total — legit speed-run pacing at low waves
        expect(plausibilityReject(4, 800, 5)).toBeNull();
    });

    it('rejects impossible score/wave ratio', () => {
        // 200k+ per wave is well above legit hero damage caps
        expect(plausibilityReject(10, 3_000_000, 1200)).toMatch(/score\/wave/);
    });

    it('rejects negative time', () => {
        expect(plausibilityReject(10, 100, -1)).toMatch(/negative time/);
    });
});
