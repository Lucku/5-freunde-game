import { describe, it, expect, beforeEach } from 'vitest';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';

// Pull the extracted admin auth helpers + the rate-limit factory we share with
// the login endpoint. Tests run without booting Express, so the bcrypt/jwt
// libraries are imported directly via require — they live under `server/`
// (`server/package.json`), not the root, so we anchor a require resolver at
// the server directory.
const localRequire = createRequire(import.meta.url);
const serverRequire = createRequire(fileURLToPath(new URL('../server/server.js', import.meta.url)));
const jwt = serverRequire('jsonwebtoken');
const { signAdminToken, verifyAdminToken, resolveAdminHash } = localRequire('../server/adminAuth.js');
const { makeRateLimiter } = localRequire('../server/anticheat.js');

const SECRET = 'test-secret-for-admin-auth';

// ── verifyAdminToken ──────────────────────────────────────────────────────────

describe('verifyAdminToken', () => {
    it('rejects missing Authorization header (401)', () => {
        const r = verifyAdminToken(undefined, SECRET);
        expect(r.ok).toBe(false);
        expect(r.status).toBe(401);
    });

    it('rejects non-Bearer scheme (401)', () => {
        const r = verifyAdminToken('Basic abc123', SECRET);
        expect(r.ok).toBe(false);
        expect(r.status).toBe(401);
    });

    it('rejects garbage token (401)', () => {
        const r = verifyAdminToken('Bearer not-a-jwt', SECRET);
        expect(r.ok).toBe(false);
        expect(r.status).toBe(401);
    });

    it('rejects wrong-signature token (401)', () => {
        const otherToken = jwt.sign({ kind: 'admin' }, 'different-secret', { expiresIn: 60 });
        const r = verifyAdminToken(`Bearer ${otherToken}`, SECRET);
        expect(r.ok).toBe(false);
        expect(r.status).toBe(401);
    });

    it('rejects expired token (401)', () => {
        const expired = jwt.sign({ kind: 'admin' }, SECRET, { expiresIn: -10 });
        const r = verifyAdminToken(`Bearer ${expired}`, SECRET);
        expect(r.ok).toBe(false);
        expect(r.status).toBe(401);
    });

    it('rejects player JWT (kind:"gs") with 403', () => {
        // GameSession tokens are signed with the same secret but a different
        // kind. They must not escalate into admin endpoints.
        const playerToken = jwt.sign({ kind: 'gs', sid: 'abc', uid: 5 }, SECRET, { expiresIn: 60 });
        const r = verifyAdminToken(`Bearer ${playerToken}`, SECRET);
        expect(r.ok).toBe(false);
        expect(r.status).toBe(403);
    });

    it('rejects token with no kind field (403)', () => {
        const noKind = jwt.sign({ sub: 'anon' }, SECRET, { expiresIn: 60 });
        const r = verifyAdminToken(`Bearer ${noKind}`, SECRET);
        expect(r.ok).toBe(false);
        expect(r.status).toBe(403);
    });

    it('accepts a valid admin token', () => {
        const { token } = signAdminToken(SECRET, 60);
        const r = verifyAdminToken(`Bearer ${token}`, SECRET);
        expect(r.ok).toBe(true);
    });
});

// ── signAdminToken ────────────────────────────────────────────────────────────

describe('signAdminToken', () => {
    it('produces a JWT with kind:"admin" and the configured TTL', () => {
        const before = Date.now();
        const { token, expiresAt } = signAdminToken(SECRET, 120);
        expect(typeof token).toBe('string');
        const decoded = jwt.verify(token, SECRET);
        expect(decoded.kind).toBe('admin');
        // expiresAt should be roughly `now + ttl*1000`, allow 5s slack.
        expect(expiresAt).toBeGreaterThanOrEqual(before + 120_000 - 5_000);
        expect(expiresAt).toBeLessThanOrEqual(before + 120_000 + 5_000);
    });

    it('defaults to an 8 hour TTL when none supplied', () => {
        const before = Date.now();
        const { expiresAt } = signAdminToken(SECRET);
        const eightHoursMs = 8 * 3600 * 1000;
        expect(expiresAt).toBeGreaterThanOrEqual(before + eightHoursMs - 5_000);
    });
});

// ── resolveAdminHash ──────────────────────────────────────────────────────────

describe('resolveAdminHash', () => {
    const stubBcrypt = { hashSync: (_pw, _cost) => 'stub-bcrypt-hash' };
    const stubCrypto = { randomBytes: (_n) => ({ toString: (_enc) => 'stub-ephemeral-pw' }) };
    let logged;
    const stubLogger = { warn: (...a) => logged.push(['warn', a]), error: (...a) => logged.push(['error', a]) };

    beforeEach(() => { logged = []; });

    it('uses ADMIN_PASSWORD_HASH when set', () => {
        const r = resolveAdminHash({
            env: { ADMIN_PASSWORD_HASH: '$2b$10$realhash' },
            nodeEnv: 'production',
            bcrypt: stubBcrypt,
            crypto: stubCrypto,
            logger: stubLogger,
        });
        expect(r.hash).toBe('$2b$10$realhash');
        expect(r.ephemeralPassword).toBe(null);
    });

    it('warns when legacy ADMIN_PASSWORD is set alongside hash', () => {
        resolveAdminHash({
            env: { ADMIN_PASSWORD: 'plain', ADMIN_PASSWORD_HASH: '$2b$10$x' },
            nodeEnv: 'production',
            bcrypt: stubBcrypt,
            crypto: stubCrypto,
            logger: stubLogger,
        });
        const warnings = logged.map(l => l[1][0]).join('\n');
        expect(warnings).toContain('ADMIN_PASSWORD env is set');
    });

    it('warns and ignores legacy ADMIN_PASSWORD even when hash is absent', () => {
        resolveAdminHash({
            env: { ADMIN_PASSWORD: 'plain' },
            nodeEnv: 'development',
            bcrypt: stubBcrypt,
            crypto: stubCrypto,
            logger: stubLogger,
        });
        const warnings = logged.map(l => l[1][0]).join('\n');
        expect(warnings).toContain('ADMIN_PASSWORD env is set');
        // Still falls back to ephemeral dev password — the plain env is not honored.
        expect(warnings).toContain('ephemeral dev password');
    });

    it('throws in production when no hash configured', () => {
        expect(() => resolveAdminHash({
            env: {},
            nodeEnv: 'production',
            bcrypt: stubBcrypt,
            crypto: stubCrypto,
            logger: stubLogger,
        })).toThrow(/ADMIN_PASSWORD_HASH/);
    });

    it('generates ephemeral password in development', () => {
        const r = resolveAdminHash({
            env: {},
            nodeEnv: 'development',
            bcrypt: stubBcrypt,
            crypto: stubCrypto,
            logger: stubLogger,
        });
        expect(r.hash).toBe('stub-bcrypt-hash');
        expect(r.ephemeralPassword).toBe('stub-ephemeral-pw');
        // Logger should surface the password so the operator can copy it.
        const warnings = logged.map(l => l[1][0]).join('\n');
        expect(warnings).toContain('stub-ephemeral-pw');
    });
});

// ── login rate limit (shared makeRateLimiter) ─────────────────────────────────

describe('admin login rate limit', () => {
    it('allows 5 attempts per 15min, then blocks', () => {
        // Mirror the parameters used by server.js for POST /api/admin/login.
        const buckets = new Map();
        let t = 1_000_000;
        const limit = makeRateLimiter({
            capacity: 5,
            refillPerSec: 5 / 900,
            buckets,
            now: () => t,
        });
        for (let i = 0; i < 5; i++) expect(limit('ip-1').allowed).toBe(true);
        expect(limit('ip-1').allowed).toBe(false);
    });

    it('different IPs do not share the bucket', () => {
        const buckets = new Map();
        let t = 1_000_000;
        const limit = makeRateLimiter({ capacity: 5, refillPerSec: 5 / 900, buckets, now: () => t });
        for (let i = 0; i < 5; i++) limit('ip-1');
        expect(limit('ip-1').allowed).toBe(false);
        expect(limit('ip-2').allowed).toBe(true);
    });

    it('refills tokens over time so a legitimate operator is not locked out forever', () => {
        const buckets = new Map();
        let t = 0;
        const limit = makeRateLimiter({ capacity: 5, refillPerSec: 5 / 900, buckets, now: () => t });
        for (let i = 0; i < 5; i++) limit('ip-x');
        expect(limit('ip-x').allowed).toBe(false);
        // After 15 minutes, the bucket should be back to full.
        t += 15 * 60 * 1000;
        for (let i = 0; i < 5; i++) expect(limit('ip-x').allowed).toBe(true);
    });
});
