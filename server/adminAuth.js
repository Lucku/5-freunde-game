// Admin auth helpers — extracted from server.js so unit tests can import them
// without booting the WebSocket server. server.js wires these into the
// Express middleware chain.

const jwt = require('jsonwebtoken');

const ADMIN_SESSION_TTL_SEC = 8 * 60 * 60;

/**
 * Sign an admin session JWT. Encodes `kind:'admin'` so a stolen player JWT
 * (signed with the same secret but `kind:'gs'` / etc.) cannot escalate.
 *
 * @param {string} secret  JWT signing secret.
 * @param {number} [ttlSec]  Token lifetime in seconds; defaults to 8 hours.
 * @returns {{ token: string, expiresAt: number }}
 */
function signAdminToken(secret, ttlSec = ADMIN_SESSION_TTL_SEC) {
    const token = jwt.sign({ kind: 'admin' }, secret, { expiresIn: ttlSec });
    return { token, expiresAt: Date.now() + ttlSec * 1000 };
}

/**
 * Verify a Bearer header against the admin signing secret. Returns a structured
 * result so the caller can map to HTTP status codes without duplicating the
 * verify logic in every middleware.
 *
 * @param {string|undefined} authHeader  Raw `Authorization` header value.
 * @param {string} secret                JWT signing secret.
 * @returns {{ ok: true } | { ok: false, status: 401 | 403, reason: string }}
 */
function verifyAdminToken(authHeader, secret) {
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return { ok: false, status: 401, reason: 'Unauthorized' };
    }
    const token = authHeader.slice(7);
    let payload;
    try { payload = jwt.verify(token, secret); }
    catch { return { ok: false, status: 401, reason: 'Invalid or expired token' }; }
    if (!payload || payload.kind !== 'admin') {
        return { ok: false, status: 403, reason: 'Forbidden' };
    }
    return { ok: true };
}

/**
 * Resolve the bcrypt hash that admin login should verify against. Pure factory
 * so the call site can swap in stubs for bcrypt / crypto / logger in tests.
 *
 * Behavior matches server.js boot:
 *   - `ADMIN_PASSWORD_HASH` set → use it.
 *   - else, dev mode → mint ephemeral random password, log it, hash it.
 *   - else, production → throw; caller is expected to exit.
 *
 * @param {object} opts
 * @param {object} opts.env       Environment object (process.env-shaped).
 * @param {string} opts.nodeEnv   `'production'` or `'development'`.
 * @param {object} opts.bcrypt    bcrypt module (uses hashSync).
 * @param {object} opts.crypto    crypto module (uses randomBytes).
 * @param {{ warn: Function, error: Function }} [opts.logger]
 * @returns {{ hash: string, ephemeralPassword: string | null }}
 */
function resolveAdminHash({ env, nodeEnv, bcrypt, crypto, logger = console }) {
    if (env.ADMIN_PASSWORD) {
        logger.warn('[admin] WARNING: ADMIN_PASSWORD env is set but plain passwords are no longer supported.');
        logger.warn('[admin]          Run `npm run admin-hash <password>` and set ADMIN_PASSWORD_HASH instead.');
        logger.warn('[admin]          The ADMIN_PASSWORD value will be ignored.');
    }
    if (env.ADMIN_PASSWORD_HASH) {
        return { hash: env.ADMIN_PASSWORD_HASH, ephemeralPassword: null };
    }
    if (nodeEnv === 'production') {
        throw new Error('ADMIN_PASSWORD_HASH not set; refusing to boot in production.');
    }
    const ephemeralPassword = crypto.randomBytes(12).toString('hex');
    const hash = bcrypt.hashSync(ephemeralPassword, 10);
    logger.warn('[admin] No ADMIN_PASSWORD_HASH set; generated an ephemeral dev password for this process:');
    logger.warn(`[admin]   password: ${ephemeralPassword}`);
    logger.warn('[admin] Set ADMIN_PASSWORD_HASH to a persistent bcrypt hash before deploying anywhere shared.');
    return { hash, ephemeralPassword };
}

module.exports = { signAdminToken, verifyAdminToken, resolveAdminHash, ADMIN_SESSION_TTL_SEC };
