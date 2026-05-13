// Plausibility caps + rate limiting — extracted from server.js so unit tests
// can import them without spinning up the WebSocket server. server.js
// re-exports its own copies from here.
//
// Caps are intentionally generous: purpose is to reject obvious garbage
// submissions (score=1B, wave=10k, sub-1s/wave), not to gate legitimate
// long runs. Tighten as real-world data accumulates.

const MAX_WAVE       = 500;
const MAX_SCORE      = 5_000_000;
const MIN_SEC_PER_WAVE = 8;

function plausibilityReject(wave, score, timeSec) {
    if (wave < 0 || wave > MAX_WAVE)         return `wave out of range (0..${MAX_WAVE})`;
    if (score < 0 || score > MAX_SCORE)      return `score out of range (0..${MAX_SCORE})`;
    if (timeSec < 0)                         return 'negative time';
    if (wave >= 5 && timeSec < wave * MIN_SEC_PER_WAVE) {
        return `time/wave ratio impossible (${timeSec}s for wave ${wave})`;
    }
    if (wave > 0 && score / wave > 200_000) {
        return `score/wave ratio impossible (${score}/${wave})`;
    }
    return null;
}

/**
 * Token-bucket rate limiter factory. Returns a function `(key, nowMs) => bool`
 * that returns true if the request is allowed (1 token consumed), false if
 * exhausted. State is captured by `buckets` Map passed in; caller manages
 * eviction.
 */
function makeRateLimiter({ capacity, refillPerSec, buckets, now = Date.now }) {
    return function checkBucket(key) {
        const t = now();
        let b = buckets.get(key);
        if (!b) {
            b = { tokens: capacity, last: t };
            buckets.set(key, b);
        }
        const elapsedSec = (t - b.last) / 1000;
        b.tokens = Math.min(capacity, b.tokens + elapsedSec * refillPerSec);
        b.last   = t;
        if (b.tokens < 1) return { allowed: false, retryAfterSec: Math.ceil((1 - b.tokens) / refillPerSec) };
        b.tokens -= 1;
        return { allowed: true };
    };
}

// Speedrun plausibility — more permissive than standard (story forces specific
// wave counts, no score to inflate). 4s/wave minimum to block sub-second bots.
const MIN_SEC_PER_WAVE_SPEEDRUN = 4;
const MAX_SPEEDRUN_SPLITS = 20; // story never exceeds ~20 arc boundaries

function speedrunPlausibilityReject(hero, timeSec, finalWave, splits) {
    if (typeof timeSec !== 'number' || timeSec < 0) return 'negative time';
    if (typeof finalWave !== 'number' || finalWave < 1 || finalWave > MAX_WAVE)
        return `wave out of range (1..${MAX_WAVE})`;
    if (finalWave >= 5 && timeSec < finalWave * MIN_SEC_PER_WAVE_SPEEDRUN)
        return `time/wave ratio impossible (${timeSec}s for wave ${finalWave})`;
    if (typeof hero !== 'string' || !hero) return 'hero required';
    if (splits !== undefined && splits !== null) {
        if (!Array.isArray(splits)) return 'splits must be array';
        if (splits.length > MAX_SPEEDRUN_SPLITS) return 'too many splits';
        for (const s of splits) {
            if (typeof s.wave !== 'number' || typeof s.timeSec !== 'number') return 'malformed split';
            if (s.timeSec < 0 || s.timeSec > timeSec + 1) return 'split time out of range';
        }
    }
    return null;
}

module.exports = {
    MAX_WAVE, MAX_SCORE, MIN_SEC_PER_WAVE,
    MIN_SEC_PER_WAVE_SPEEDRUN, MAX_SPEEDRUN_SPLITS,
    plausibilityReject, speedrunPlausibilityReject, makeRateLimiter,
};
