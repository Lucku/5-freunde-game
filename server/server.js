try { require('dotenv').config(); } catch { }

const express = require('express');
const cors = require('cors');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const Database = require('better-sqlite3');
const http = require('http');
const https = require('https');
const WebSocket = require('ws');
const fs = require('fs');
const path = require('path');
const GameSession = require('./simulation/GameSession');

const PORT = process.env.PORT || 3001;
const JWT_SECRET = process.env.JWT_SECRET || 'change-this-secret-in-production';
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || 'admin';
const DATA_DIR = path.join(__dirname, 'data');
const SAVES_DIR = path.join(DATA_DIR, 'saves');

// TLS — production deploys should set TLS_CERT_PATH + TLS_KEY_PATH to enable
// https + wss. Falls back to plain http + ws when unset (local dev).
const TLS_CERT_PATH = process.env.TLS_CERT_PATH;
const TLS_KEY_PATH  = process.env.TLS_KEY_PATH;
const TLS_CA_PATH   = process.env.TLS_CA_PATH; // optional intermediate chain

const completedSessions = []; // in-memory ring buffer, last 100 finished sessions

fs.mkdirSync(DATA_DIR, { recursive: true });
fs.mkdirSync(SAVES_DIR, { recursive: true });

// ── Database ──────────────────────────────────────────────────────────────────

const db = new Database(path.join(DATA_DIR, 'users.db'));
db.exec(`
    CREATE TABLE IF NOT EXISTS users (
        id           INTEGER PRIMARY KEY AUTOINCREMENT,
        username     TEXT UNIQUE NOT NULL COLLATE NOCASE,
        password_hash TEXT NOT NULL,
        created_at   INTEGER NOT NULL
    );
    CREATE TABLE IF NOT EXISTS scores (
        id           INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id      INTEGER NOT NULL,
        username     TEXT NOT NULL,
        hero         TEXT NOT NULL,
        mode         TEXT NOT NULL,
        wave         INTEGER NOT NULL DEFAULT 0,
        score        INTEGER NOT NULL DEFAULT 0,
        outcome      TEXT NOT NULL DEFAULT 'death',
        time_sec     INTEGER NOT NULL DEFAULT 0,
        submitted_at INTEGER NOT NULL
    )
`);

db.exec(`
    CREATE TABLE IF NOT EXISTS friendships (
        id           INTEGER PRIMARY KEY AUTOINCREMENT,
        requester_id INTEGER NOT NULL,
        addressee_id INTEGER NOT NULL,
        status       TEXT NOT NULL DEFAULT 'pending',
        created_at   INTEGER NOT NULL,
        UNIQUE(requester_id, addressee_id)
    );
    CREATE INDEX IF NOT EXISTS idx_fs_req  ON friendships(requester_id);
    CREATE INDEX IF NOT EXISTS idx_fs_addr ON friendships(addressee_id);
`);

db.exec(`
    CREATE TABLE IF NOT EXISTS world_events (
        id           INTEGER PRIMARY KEY AUTOINCREMENT,
        type         TEXT NOT NULL DEFAULT 'xp_boost',
        label        TEXT NOT NULL,
        multiplier   REAL NOT NULL DEFAULT 2.0,
        target       TEXT DEFAULT NULL,
        starts_at    INTEGER NOT NULL,
        ends_at      INTEGER NOT NULL,
        created_at   INTEGER NOT NULL
    )
`);

db.exec(`
    CREATE TABLE IF NOT EXISTS speedrun_scores (
        id           INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id      INTEGER NOT NULL,
        username     TEXT NOT NULL,
        hero         TEXT NOT NULL,
        time_sec     INTEGER NOT NULL,
        final_wave   INTEGER NOT NULL,
        splits_json  TEXT,
        submitted_at INTEGER NOT NULL,
        verified     INTEGER NOT NULL DEFAULT 0
    );
    CREATE INDEX IF NOT EXISTS idx_speedrun_hero_time ON speedrun_scores(hero, time_sec);
`);

db.exec(`
    CREATE TABLE IF NOT EXISTS custom_maps (
        id           INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id      INTEGER NOT NULL,
        author       TEXT NOT NULL,
        name         TEXT NOT NULL,
        biome_type   TEXT NOT NULL DEFAULT 'fire',
        map_data     TEXT NOT NULL,
        arena_width  INTEGER NOT NULL DEFAULT 2000,
        arena_height INTEGER NOT NULL DEFAULT 1500,
        play_count   INTEGER NOT NULL DEFAULT 0,
        like_count   INTEGER NOT NULL DEFAULT 0,
        created_at   INTEGER NOT NULL,
        updated_at   INTEGER NOT NULL
    );
    CREATE INDEX IF NOT EXISTS idx_maps_user  ON custom_maps(user_id);
    CREATE INDEX IF NOT EXISTS idx_maps_likes ON custom_maps(like_count DESC);
    CREATE INDEX IF NOT EXISTS idx_maps_date  ON custom_maps(created_at DESC);

    CREATE TABLE IF NOT EXISTS custom_map_scores (
        id           INTEGER PRIMARY KEY AUTOINCREMENT,
        map_id       INTEGER NOT NULL,
        user_id      INTEGER NOT NULL,
        username     TEXT NOT NULL,
        hero         TEXT NOT NULL,
        wave         INTEGER NOT NULL DEFAULT 0,
        score        INTEGER NOT NULL DEFAULT 0,
        time_sec     INTEGER NOT NULL DEFAULT 0,
        submitted_at INTEGER NOT NULL
    );
    CREATE INDEX IF NOT EXISTS idx_mscores_map ON custom_map_scores(map_id, score DESC);

    CREATE TABLE IF NOT EXISTS custom_map_likes (
        id      INTEGER PRIMARY KEY AUTOINCREMENT,
        map_id  INTEGER NOT NULL,
        user_id INTEGER NOT NULL,
        UNIQUE(map_id, user_id)
    );
`);

const MAP_DATA_MAX_BYTES = 64 * 1024;
const MAPS_PER_USER_MAX  = 20;

// Schema upgrade: add `verified` + `daily_seed` columns to existing scores tables.
// verified  — 0 = client-asserted (offline run), 1 = server-confirmed (online session).
// daily_seed — null for ordinary runs; YYYYMMDD for daily-challenge runs,
//              YYYYWW for weekly runs. Used for per-seed leaderboard filtering.
try {
    const cols = db.prepare("PRAGMA table_info(scores)").all();
    if (!cols.some(c => c.name === 'verified')) {
        db.exec('ALTER TABLE scores ADD COLUMN verified INTEGER NOT NULL DEFAULT 0');
        console.log('Scores table upgraded: added `verified` column');
    }
    if (!cols.some(c => c.name === 'daily_seed')) {
        db.exec('ALTER TABLE scores ADD COLUMN daily_seed INTEGER DEFAULT NULL');
        console.log('Scores table upgraded: added `daily_seed` column');
    }
} catch (e) {
    console.error('Failed to migrate scores table:', e);
}

// ── Express ───────────────────────────────────────────────────────────────────

const app = express();
// #89 — restrict CORS to the same allowlist when ALLOWED_WS_ORIGINS is set;
// otherwise (dev mode) allow all. Origin-less requests (curl, native clients)
// always pass through; the JWT in the Authorization header is the authn proof.
const _ALLOWED_HTTP_ORIGINS = (process.env.ALLOWED_WS_ORIGINS || '')
    .split(',').map(s => s.trim()).filter(Boolean);
app.use(cors({
    origin(origin, cb) {
        if (!origin) return cb(null, true);
        if (!_ALLOWED_HTTP_ORIGINS.length) return cb(null, true);
        if (_ALLOWED_HTTP_ORIGINS.includes(origin)) return cb(null, true);
        return cb(new Error(`CORS: origin "${origin}" not allowed`));
    }
}));
app.use(express.json({ limit: '10mb' }));

// Trust the first proxy hop so req.ip reads the X-Forwarded-For client IP
// when running behind a reverse proxy (Cloudflare / nginx / Fly). Safe no-op
// when direct-exposed.
app.set('trust proxy', 1);

// ── Rate limiting + plausibility (extracted to server/anticheat.js so unit
//    tests can import them without booting the WS server). ────────────────────

const { plausibilityReject, speedrunPlausibilityReject, makeRateLimiter } = require('./anticheat');

const _rateBuckets = new Map(); // key → { tokens, last }
const RATE_SWEEP_MS = 5 * 60 * 1000;
setInterval(() => {
    const cutoff = Date.now() - 30 * 60 * 1000;
    for (const [k, b] of _rateBuckets) {
        if (b.last < cutoff) _rateBuckets.delete(k);
    }
}, RATE_SWEEP_MS).unref?.();

function rateLimit({ key, capacity, refillPerSec }) {
    const limiter = makeRateLimiter({ capacity, refillPerSec, buckets: _rateBuckets });
    return (req, res, next) => {
        const ip = req.ip || req.headers['x-forwarded-for']?.split(',')[0].trim() || req.connection?.remoteAddress || 'unknown';
        const result = limiter(`${key}:${ip}`);
        if (!result.allowed) {
            res.set('Retry-After', String(result.retryAfterSec));
            return res.status(429).json({ error: 'Too many requests', retryAfterSec: result.retryAfterSec });
        }
        next();
    };
}

// ── Anti-cheat: session tokens for verified leaderboard submissions ───────────
// Server signs a short-lived token at GameSession start. Client returns it on
// /api/leaderboard; server overrides client-claimed score with its own state
// and marks the entry as verified.

const SESSION_TOKEN_TTL_SEC = 60 * 60 * 2; // 2 hours covers a long run + post-game submission
function signSessionToken(sessionId, userId) {
    return jwt.sign({ kind: 'gs', sid: sessionId, uid: userId }, JWT_SECRET, { expiresIn: SESSION_TOKEN_TTL_SEC });
}
function verifySessionToken(token) {
    try {
        const payload = jwt.verify(token, JWT_SECRET);
        if (payload.kind !== 'gs') return null;
        return payload;
    } catch { return null; }
}

// Stash for resolving session tokens against live/completed sessions.
const _sessionScores = new Map(); // sessionId → { wave, score, timeSec, hero, mode, userIds: [] }

function requireAuth(req, res, next) {
    const auth = req.headers.authorization;
    if (!auth || !auth.startsWith('Bearer ')) return res.status(401).json({ error: 'Unauthorized' });
    try {
        req.user = jwt.verify(auth.slice(7), JWT_SECRET);
        next();
    } catch {
        res.status(401).json({ error: 'Invalid or expired token' });
    }
}

app.get('/api/health', (_req, res) => res.json({ status: 'ok' }));

// ── Crash reports ─────────────────────────────────────────────────────────────
// Append-only JSONL log of client crashes. Unauthenticated (errors fire before
// login can complete) but rate-limited by IP and capped per payload.
const CRASH_LOG_PATH = path.join(DATA_DIR, 'crashes.jsonl');
const CRASH_MAX_BYTES = 32 * 1024;
app.post('/api/crash',
    rateLimit({ key: 'crash', capacity: 20, refillPerSec: 20 / 600 }), // 20/10min burst
    (req, res) => {
        const body = req.body || {};
        if (typeof body.message !== 'string') return res.status(400).json({ error: 'message required' });
        const raw = JSON.stringify(body);
        if (raw.length > CRASH_MAX_BYTES) return res.status(413).json({ error: 'payload too large' });
        const ip = req.ip || 'unknown';
        const line = JSON.stringify({
            t:       Date.now(),
            ipHash:  Buffer.from(ip).toString('base64').slice(0, 10), // pseudonymise
            kind:    body.kind || 'manual',
            message: body.message.slice(0, 1000),
            stack:   (body.stack || '').slice(0, 4000),
            source:  body.source || null,
            lineno:  body.lineno || null,
            colno:   body.colno  || null,
            breadcrumbs: Array.isArray(body.breadcrumbs) ? body.breadcrumbs.slice(-20) : [],
            context: body.context && typeof body.context === 'object' ? body.context : {},
        }) + '\n';
        try {
            fs.appendFileSync(CRASH_LOG_PATH, line);
        } catch (e) {
            console.error('[Crash] failed to append:', e);
            return res.status(500).json({ error: 'log write failed' });
        }
        res.json({ ok: true });
    }
);

app.get('/api/admin/crashes', requireAdmin, (_req, res) => {
    if (!fs.existsSync(CRASH_LOG_PATH)) return res.json({ crashes: [] });
    try {
        const raw = fs.readFileSync(CRASH_LOG_PATH, 'utf8');
        const lines = raw.split('\n').filter(Boolean).slice(-200);
        const crashes = lines.map(l => { try { return JSON.parse(l); } catch { return null; } }).filter(Boolean).reverse();
        res.json({ crashes });
    } catch (e) {
        res.status(500).json({ error: 'read failed' });
    }
});

// ── Leaderboard ───────────────────────────────────────────────────────────────

app.post('/api/leaderboard',
    rateLimit({ key: 'lb_post', capacity: 10, refillPerSec: 10 / 3600 }), // ~10 submissions per hour, burst 10
    requireAuth,
    (req, res) => {
        const { hero, mode, wave, score, outcome, timeSec, sessionToken, dailySeed } = req.body || {};
        if (typeof score !== 'number' || score < 0) return res.status(400).json({ error: 'Invalid score' });

        let finalWave    = Math.max(0, wave | 0);
        let finalScore   = score | 0;
        let finalTimeSec = Math.max(0, timeSec | 0);
        let verified     = 0;

        if (typeof sessionToken === 'string' && sessionToken.length > 0) {
            const payload = verifySessionToken(sessionToken);
            if (payload && payload.uid === req.user.id) {
                const auth = _sessionScores.get(payload.sid);
                if (auth) {
                    // Trust server-known state over client claim — clamp downward only.
                    finalWave    = Math.min(finalWave,    auth.wave);
                    finalScore   = Math.min(finalScore,   auth.score);
                    finalTimeSec = Math.min(finalTimeSec, auth.timeSec || finalTimeSec);
                    verified = 1;
                }
            }
        }

        if (!verified) {
            const reason = plausibilityReject(finalWave, finalScore, finalTimeSec);
            if (reason) {
                console.warn(`[Leaderboard] rejected from ${req.user.username}: ${reason}`);
                return res.status(400).json({ error: 'Score failed plausibility check', reason });
            }
        }

        const dailySeedVal = (typeof dailySeed === 'number' && dailySeed > 0) ? (dailySeed | 0) : null;

        db.prepare(`
            INSERT INTO scores (user_id, username, hero, mode, wave, score, outcome, time_sec, submitted_at, verified, daily_seed)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `).run(req.user.id, req.user.username, hero || 'fire', mode || 'standard',
            finalWave, finalScore, outcome || 'death', finalTimeSec, Date.now(), verified, dailySeedVal);
        // Keep at most 1000 rows total — prune oldest beyond that
        db.prepare(`DELETE FROM scores WHERE id NOT IN (SELECT id FROM scores ORDER BY score DESC LIMIT 1000)`).run();
        res.json({ ok: true, verified: !!verified });
    }
);

app.get('/api/leaderboard', (req, res) => {
    const limit = Math.min(Math.max(1, parseInt(req.query.limit) || 10), 50);
    const verifiedOnly = req.query.verified === '1' || req.query.verified === 'true';
    const dailySeed    = req.query.dailySeed ? parseInt(req.query.dailySeed, 10) : null;
    const where = [];
    const params = [];
    if (verifiedOnly)         where.push('verified = 1');
    if (dailySeed && dailySeed > 0) { where.push('daily_seed = ?'); params.push(dailySeed); }
    const whereSql = where.length ? `WHERE ${where.join(' AND ')}` : '';
    params.push(limit);
    const rows = db.prepare(`
        SELECT username, hero, mode, wave, score, outcome,
               time_sec AS timeSec, submitted_at AS submittedAt,
               verified, daily_seed AS dailySeed
        FROM scores
        ${whereSql}
        ORDER BY score DESC
        LIMIT ?
    `).all(...params);
    res.json({ entries: rows });
});

// ── Speedrun leaderboard ──────────────────────────────────────────────────────

app.post('/api/speedrun',
    rateLimit({ key: 'sr_post', capacity: 5, refillPerSec: 5 / 3600 }), // 5/hr
    requireAuth,
    (req, res) => {
        const { hero, timeSec, finalWave, splits, sessionToken } = req.body || {};

        let tSec = timeSec | 0;
        let fWave = finalWave | 0;

        const reason = speedrunPlausibilityReject(hero, tSec, fWave, splits);
        if (reason) {
            console.warn(`[Speedrun] rejected from ${req.user.username}: ${reason}`);
            return res.status(400).json({ error: 'Speedrun failed plausibility check', reason });
        }

        let verified = 0;
        if (typeof sessionToken === 'string' && sessionToken.length > 0) {
            const payload = verifySessionToken(sessionToken);
            if (payload && payload.uid === req.user.id) {
                const auth = _sessionScores.get(payload.sid);
                if (auth) verified = 1;
            }
        }

        const splitsJson = Array.isArray(splits) ? JSON.stringify(splits) : null;

        db.prepare(`
            INSERT INTO speedrun_scores (user_id, username, hero, time_sec, final_wave, splits_json, submitted_at, verified)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?)
        `).run(req.user.id, req.user.username, hero, tSec, fWave, splitsJson, Date.now(), verified);

        // Keep best 500 entries per hero — prune slowest beyond that
        db.prepare(`
            DELETE FROM speedrun_scores
            WHERE hero = ? AND id NOT IN (
                SELECT id FROM speedrun_scores WHERE hero = ? ORDER BY time_sec ASC LIMIT 500
            )
        `).run(hero, hero);

        res.json({ ok: true, verified: !!verified });
    }
);

app.get('/api/speedrun', (req, res) => {
    const hero  = typeof req.query.hero === 'string' ? req.query.hero : null;
    const limit = Math.min(Math.max(1, parseInt(req.query.limit) || 10), 50);

    const where  = hero ? 'WHERE hero = ?' : '';
    const params = hero ? [hero, limit] : [limit];

    const rows = db.prepare(`
        SELECT username, hero, time_sec AS timeSec, final_wave AS finalWave,
               submitted_at AS submittedAt, verified
        FROM speedrun_scores
        ${where}
        ORDER BY time_sec ASC
        LIMIT ?
    `).all(...params);

    res.json({ entries: rows });
});

// ── Community Maps ────────────────────────────────────────────────────────────

app.post('/api/maps',
    rateLimit({ key: 'map_post', capacity: 10, refillPerSec: 10 / 3600 }),
    requireAuth,
    (req, res) => {
        const body = req.body || {};
        const raw  = JSON.stringify(body);
        if (raw.length > MAP_DATA_MAX_BYTES) return res.status(413).json({ error: 'Map data too large (max 64 KB)' });
        const name = (typeof body.name === 'string' && body.name.trim()) ? body.name.trim().slice(0, 64) : null;
        if (!name) return res.status(400).json({ error: 'name required' });
        const count = db.prepare('SELECT COUNT(*) AS n FROM custom_maps WHERE user_id = ?').get(req.user.id).n;
        if (count >= MAPS_PER_USER_MAX) return res.status(400).json({ error: `Max ${MAPS_PER_USER_MAX} maps per user` });
        const now = Date.now();
        const mapData = JSON.stringify({
            version:     body.version     || 1,
            name:        name,
            biomeType:   body.biomeType   || 'fire',
            arenaWidth:  body.arenaWidth  || 2000,
            arenaHeight: body.arenaHeight || 1500,
            obstacles:   Array.isArray(body.obstacles)  ? body.obstacles  : [],
            biomeZones:  Array.isArray(body.biomeZones) ? body.biomeZones : [],
            traps:       Array.isArray(body.traps)      ? body.traps      : [],
        });
        const row = db.prepare(`
            INSERT INTO custom_maps (user_id, author, name, biome_type, map_data, arena_width, arena_height, created_at, updated_at)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
        `).run(req.user.id, req.user.username, name,
            body.biomeType || 'fire', mapData,
            body.arenaWidth || 2000, body.arenaHeight || 1500,
            now, now);
        res.json({ ok: true, id: row.lastInsertRowid });
    }
);

app.get('/api/maps', (req, res) => {
    const sort   = req.query.sort === 'newest' ? 'newest' : 'popular';
    const limit  = Math.min(Math.max(1, parseInt(req.query.limit)  || 20), 50);
    const offset = Math.max(0, parseInt(req.query.offset) || 0);
    const mine   = req.query.mine === '1' || req.query.mine === 'true';
    const where  = [];
    const params = [];
    if (mine) {
        const auth = req.headers.authorization;
        if (!auth || !auth.startsWith('Bearer ')) return res.status(401).json({ error: 'Unauthorized' });
        try {
            const u = require('jsonwebtoken').verify(auth.slice(7), JWT_SECRET);
            where.push('user_id = ?'); params.push(u.id);
        } catch { return res.status(401).json({ error: 'Invalid token' }); }
    }
    const whereSql = where.length ? `WHERE ${where.join(' AND ')}` : '';
    const orderSql = sort === 'newest' ? 'created_at DESC' : 'like_count DESC, play_count DESC';
    params.push(limit, offset);
    const rows = db.prepare(`
        SELECT id, name, author, biome_type AS biomeType, arena_width AS arenaWidth,
               arena_height AS arenaHeight, play_count AS playCount, like_count AS likeCount,
               created_at AS createdAt
        FROM custom_maps ${whereSql}
        ORDER BY ${orderSql}
        LIMIT ? OFFSET ?
    `).all(...params);
    res.json({ maps: rows });
});

app.get('/api/maps/:id', (req, res) => {
    const id = parseInt(req.params.id, 10);
    if (!id) return res.status(400).json({ error: 'Invalid id' });
    const row = db.prepare(`
        SELECT id, user_id AS userId, name, author, biome_type AS biomeType,
               map_data AS mapData, arena_width AS arenaWidth, arena_height AS arenaHeight,
               play_count AS playCount, like_count AS likeCount, created_at AS createdAt
        FROM custom_maps WHERE id = ?
    `).get(id);
    if (!row) return res.status(404).json({ error: 'Map not found' });
    // Increment play count fire-and-forget
    db.prepare('UPDATE custom_maps SET play_count = play_count + 1 WHERE id = ?').run(id);
    try { row.mapData = JSON.parse(row.mapData); } catch { row.mapData = {}; }
    res.json(row);
});

app.delete('/api/maps/:id', requireAuth, (req, res) => {
    const id = parseInt(req.params.id, 10);
    if (!id) return res.status(400).json({ error: 'Invalid id' });
    const row = db.prepare('SELECT user_id FROM custom_maps WHERE id = ?').get(id);
    if (!row) return res.status(404).json({ error: 'Map not found' });
    if (row.user_id !== req.user.id) return res.status(403).json({ error: 'Forbidden' });
    db.prepare('DELETE FROM custom_maps WHERE id = ?').run(id);
    db.prepare('DELETE FROM custom_map_scores WHERE map_id = ?').run(id);
    db.prepare('DELETE FROM custom_map_likes WHERE map_id = ?').run(id);
    res.json({ ok: true });
});

app.post('/api/maps/:id/like', requireAuth, (req, res) => {
    const id = parseInt(req.params.id, 10);
    if (!id) return res.status(400).json({ error: 'Invalid id' });
    const map = db.prepare('SELECT id, like_count FROM custom_maps WHERE id = ?').get(id);
    if (!map) return res.status(404).json({ error: 'Map not found' });
    try {
        db.prepare('INSERT INTO custom_map_likes (map_id, user_id) VALUES (?, ?)').run(id, req.user.id);
        db.prepare('UPDATE custom_maps SET like_count = like_count + 1 WHERE id = ?').run(id);
        const updated = db.prepare('SELECT like_count FROM custom_maps WHERE id = ?').get(id);
        res.json({ liked: true, likeCount: updated.like_count });
    } catch (e) {
        if (e.code === 'SQLITE_CONSTRAINT_UNIQUE') {
            // Already liked — toggle off
            db.prepare('DELETE FROM custom_map_likes WHERE map_id = ? AND user_id = ?').run(id, req.user.id);
            db.prepare('UPDATE custom_maps SET like_count = MAX(0, like_count - 1) WHERE id = ?').run(id);
            const updated = db.prepare('SELECT like_count FROM custom_maps WHERE id = ?').get(id);
            return res.json({ liked: false, likeCount: updated.like_count });
        }
        console.error(e);
        res.status(500).json({ error: 'Server error' });
    }
});

app.get('/api/maps/:id/leaderboard', (req, res) => {
    const id    = parseInt(req.params.id, 10);
    if (!id) return res.status(400).json({ error: 'Invalid id' });
    const limit = Math.min(Math.max(1, parseInt(req.query.limit) || 10), 50);
    const rows  = db.prepare(`
        SELECT username, hero, wave, score, time_sec AS timeSec, submitted_at AS submittedAt
        FROM custom_map_scores
        WHERE map_id = ?
        ORDER BY score DESC
        LIMIT ?
    `).all(id, limit);
    res.json({ entries: rows });
});

app.post('/api/maps/:id/score',
    rateLimit({ key: 'map_score', capacity: 30, refillPerSec: 30 / 3600 }),
    requireAuth,
    (req, res) => {
        const id = parseInt(req.params.id, 10);
        if (!id) return res.status(400).json({ error: 'Invalid id' });
        const map = db.prepare('SELECT id FROM custom_maps WHERE id = ?').get(id);
        if (!map) return res.status(404).json({ error: 'Map not found' });
        const { hero, wave, score, timeSec } = req.body || {};
        if (typeof score !== 'number' || score < 0) return res.status(400).json({ error: 'Invalid score' });
        const finalWave    = Math.max(0, wave    | 0);
        const finalScore   = Math.max(0, score   | 0);
        const finalTimeSec = Math.max(0, timeSec | 0);
        const reason = plausibilityReject(finalWave, finalScore, finalTimeSec);
        if (reason) return res.status(400).json({ error: 'Score failed plausibility check', reason });
        db.prepare(`
            INSERT INTO custom_map_scores (map_id, user_id, username, hero, wave, score, time_sec, submitted_at)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?)
        `).run(id, req.user.id, req.user.username, hero || 'fire',
            finalWave, finalScore, finalTimeSec, Date.now());
        // Keep best 500 per map
        db.prepare(`
            DELETE FROM custom_map_scores
            WHERE map_id = ? AND id NOT IN (
                SELECT id FROM custom_map_scores WHERE map_id = ? ORDER BY score DESC LIMIT 500
            )
        `).run(id, id);
        res.json({ ok: true });
    }
);

app.post('/api/register',
    rateLimit({ key: 'register', capacity: 5, refillPerSec: 5 / 3600 }), // 5/hr burst, then trickle
    async (req, res) => {
    const { username, password } = req.body || {};
    if (!username || !password) return res.status(400).json({ error: 'Username and password required' });
    if (username.length < 3 || username.length > 32) return res.status(400).json({ error: 'Username must be 3–32 characters' });
    if (!/^[a-zA-Z0-9_-]+$/.test(username)) return res.status(400).json({ error: 'Username may only contain letters, numbers, _ and -' });
    if (password.length < 6) return res.status(400).json({ error: 'Password must be at least 6 characters' });
    try {
        const hash = await bcrypt.hash(password, 10);
        const row = db.prepare('INSERT INTO users (username, password_hash, created_at) VALUES (?, ?, ?)').run(username, hash, Date.now());
        const token = jwt.sign({ id: row.lastInsertRowid, username }, JWT_SECRET, { expiresIn: '90d' });
        res.json({ token, username });
    } catch (e) {
        if (e.code === 'SQLITE_CONSTRAINT_UNIQUE') return res.status(409).json({ error: 'Username already taken' });
        console.error(e);
        res.status(500).json({ error: 'Server error' });
    }
});

app.post('/api/login',
    rateLimit({ key: 'login', capacity: 10, refillPerSec: 10 / 60 }), // 10/min burst, then 1/6s
    async (req, res) => {
        const { username, password } = req.body || {};
        if (!username || !password) return res.status(400).json({ error: 'Username and password required' });
        const user = db.prepare('SELECT * FROM users WHERE username = ? COLLATE NOCASE').get(username);
        if (!user) return res.status(401).json({ error: 'Invalid username or password' });
        const valid = await bcrypt.compare(password, user.password_hash);
        if (!valid) return res.status(401).json({ error: 'Invalid username or password' });
        const token = jwt.sign({ id: user.id, username: user.username }, JWT_SECRET, { expiresIn: '90d' });
        res.json({ token, username: user.username });
    }
);

app.get('/api/save', requireAuth, (req, res) => {
    const savePath = path.join(SAVES_DIR, `${req.user.id}.save`);
    const metaPath = savePath + '.meta';
    if (!fs.existsSync(savePath)) return res.json({ blob: null, savedAt: null });
    try {
        const blob = fs.readFileSync(savePath, 'utf8');
        const meta = fs.existsSync(metaPath) ? JSON.parse(fs.readFileSync(metaPath, 'utf8')) : { savedAt: 0 };
        res.json({ blob, savedAt: meta.savedAt });
    } catch (e) {
        console.error('Load error:', e);
        res.status(500).json({ error: 'Failed to load save' });
    }
});

app.put('/api/save', requireAuth, (req, res) => {
    const { blob } = req.body || {};
    if (!blob || typeof blob !== 'string') return res.status(400).json({ error: 'Save blob required' });
    const savePath = path.join(SAVES_DIR, `${req.user.id}.save`);
    const savedAt = Date.now();
    try {
        fs.writeFileSync(savePath, blob, 'utf8');
        fs.writeFileSync(savePath + '.meta', JSON.stringify({ savedAt }), 'utf8');
        res.json({ savedAt });
    } catch (e) {
        console.error('Save error:', e);
        res.status(500).json({ error: 'Failed to save' });
    }
});

// ── Admin Dashboard ───────────────────────────────────────────────────────────

function requireAdmin(req, res, next) {
    const auth = req.headers.authorization;
    if (!auth || !auth.startsWith('Bearer ')) return res.status(401).json({ error: 'Unauthorized' });
    if (auth.slice(7) !== ADMIN_PASSWORD) return res.status(403).json({ error: 'Forbidden' });
    next();
}

app.get('/admin', (_req, res) => res.sendFile(path.join(__dirname, 'dashboard.html')));

app.get('/api/admin/sessions', requireAdmin, (_req, res) => {
    const active = [];
    for (const lobby of lobbies.values()) {
        const s = lobby.session;
        active.push({
            code: lobby.code,
            phase: lobby.phase,
            startedAt: s ? s._startedAt : null,
            duration: s ? Date.now() - s._startedAt : null,
            host:  { username: lobby.hostUsername  || lobby.host?.username,  hero: lobby.hostHero  },
            guest: { username: lobby.guestUsername || lobby.guest?.username, hero: lobby.guestHero },
            wave:        s ? s.wave          : null,
            score:       s ? s.score         : null,
            enemyCount:  s ? s.enemies.length : null,
            players: s ? s.players.map(p => p ? {
                hp: p.hp, maxHp: p.maxHp, level: p.level, type: p.type, isDead: p.isDead,
            } : null) : null,
            stats: s ? { ...s._world.currentRunStats } : null,
        });
    }
    res.json({ active, completed: completedSessions });
});

app.get('/api/admin/online', requireAdmin, (_req, res) => {
    const museum = Array.from(globalLobby.values()).map(
        ({ userId, username, hero }) => ({ userId, username, hero })
    );
    const inGame = [];
    for (const lobby of lobbies.values()) {
        if (lobby.host)  inGame.push({ userId: lobby.host.userId,  username: lobby.host.username,  hero: lobby.hostHero,  lobbyCode: lobby.code });
        if (lobby.guest) inGame.push({ userId: lobby.guest.userId, username: lobby.guest.username, hero: lobby.guestHero, lobbyCode: lobby.code });
    }
    res.json({ museum, inGame, total: museum.length + inGame.length });
});

app.get('/api/admin/players', requireAdmin, (_req, res) => {
    const users = db.prepare('SELECT id, username, created_at AS createdAt FROM users ORDER BY id DESC').all();
    res.json({ users, count: users.length });
});

app.get('/api/admin/stats', requireAdmin, (_req, res) => {
    const totalUsers  = db.prepare('SELECT COUNT(*) AS c FROM users').get().c;
    const totalScores = db.prepare('SELECT COUNT(*) AS c FROM scores').get().c;
    const topScores   = db.prepare(`
        SELECT username, hero, mode, wave, score, outcome,
               time_sec AS timeSec, submitted_at AS submittedAt
        FROM scores ORDER BY score DESC LIMIT 20
    `).all();
    const heroDistribution = db.prepare(
        'SELECT hero, COUNT(*) AS count FROM scores GROUP BY hero ORDER BY count DESC'
    ).all();
    const modeDistribution = db.prepare(
        'SELECT mode, COUNT(*) AS count FROM scores GROUP BY mode ORDER BY count DESC'
    ).all();
    const outcomeStats = db.prepare(
        'SELECT outcome, COUNT(*) AS count FROM scores GROUP BY outcome'
    ).all();
    res.json({
        totalUsers, totalScores, topScores,
        heroDistribution, modeDistribution, outcomeStats,
        activeSessions:     lobbies.size,
        onlinePlayers:      globalLobby.size,
        completedSessions:  completedSessions.length,
    });
});

// ── World events ──────────────────────────────────────────────────────────────

app.get('/api/events', (_req, res) => {
    const now = Date.now();
    const events = db.prepare(
        'SELECT id, type, label, multiplier, target FROM world_events WHERE starts_at <= ? AND ends_at >= ? ORDER BY starts_at ASC'
    ).all(now, now);
    res.json({ events });
});

app.get('/api/admin/events', requireAdmin, (_req, res) => {
    const events = db.prepare('SELECT * FROM world_events ORDER BY starts_at DESC LIMIT 50').all();
    res.json({ events });
});

app.post('/api/admin/events', requireAdmin, (req, res) => {
    const { type, label, multiplier, target, startsAt, endsAt } = req.body || {};
    if (!label || !type) return res.status(400).json({ error: 'type and label required' });
    const row = db.prepare(`
        INSERT INTO world_events (type, label, multiplier, target, starts_at, ends_at, created_at)
        VALUES (?, ?, ?, ?, ?, ?, ?)
    `).run(type, label, multiplier || 2.0, target || null,
        startsAt || Date.now(), endsAt || (Date.now() + 3 * 24 * 60 * 60 * 1000), Date.now());
    res.json({ ok: true, id: row.lastInsertRowid });
});

app.delete('/api/admin/events/:id', requireAdmin, (req, res) => {
    db.prepare('DELETE FROM world_events WHERE id = ?').run(req.params.id | 0);
    res.json({ ok: true });
});

// ── Friends ───────────────────────────────────────────────────────────────────

app.get('/api/friends', requireAuth, (req, res) => {
    const friends = db.prepare(`
        SELECT u.id AS userId, u.username, 'accepted' AS status
        FROM friendships f
        JOIN users u ON u.id = CASE WHEN f.requester_id = ? THEN f.addressee_id ELSE f.requester_id END
        WHERE (f.requester_id = ? OR f.addressee_id = ?) AND f.status = 'accepted'
    `).all(req.user.id, req.user.id, req.user.id);

    const incoming = db.prepare(`
        SELECT f.id AS requestId, u.username AS fromUsername, f.created_at AS createdAt
        FROM friendships f
        JOIN users u ON u.id = f.requester_id
        WHERE f.addressee_id = ? AND f.status = 'pending'
    `).all(req.user.id);

    const outgoing = db.prepare(`
        SELECT f.id AS requestId, u.username AS toUsername, f.created_at AS createdAt
        FROM friendships f
        JOIN users u ON u.id = f.addressee_id
        WHERE f.requester_id = ? AND f.status = 'pending'
    `).all(req.user.id);

    res.json({ friends, incoming, outgoing });
});

app.post('/api/friends/request',
    rateLimit({ key: 'friend_req', capacity: 20, refillPerSec: 20 / 3600 }),
    requireAuth,
    (req, res) => {
        const { username } = req.body || {};
        if (!username) return res.status(400).json({ error: 'username required' });
        const target = db.prepare('SELECT id, username FROM users WHERE username = ? COLLATE NOCASE').get(username);
        if (!target) return res.status(404).json({ error: 'User not found' });
        if (target.id === req.user.id) return res.status(400).json({ error: 'Cannot add yourself' });
        const existing = db.prepare(`
            SELECT * FROM friendships
            WHERE (requester_id = ? AND addressee_id = ?) OR (requester_id = ? AND addressee_id = ?)
        `).get(req.user.id, target.id, target.id, req.user.id);
        if (existing) {
            if (existing.status === 'accepted') return res.status(409).json({ error: 'Already friends' });
            if (existing.requester_id === req.user.id) return res.status(409).json({ error: 'Request already sent' });
            // The target already sent us a request — accept it
            db.prepare('UPDATE friendships SET status = ? WHERE id = ?').run('accepted', existing.id);
            return res.json({ ok: true, status: 'accepted' });
        }
        db.prepare('INSERT INTO friendships (requester_id, addressee_id, status, created_at) VALUES (?, ?, ?, ?)')
            .run(req.user.id, target.id, 'pending', Date.now());
        res.json({ ok: true, status: 'pending' });
    }
);

app.post('/api/friends/respond', requireAuth, (req, res) => {
    const { requestId, accept } = req.body || {};
    const row = db.prepare('SELECT * FROM friendships WHERE id = ? AND addressee_id = ? AND status = ?')
        .get(requestId | 0, req.user.id, 'pending');
    if (!row) return res.status(404).json({ error: 'Request not found' });
    if (accept) {
        db.prepare('UPDATE friendships SET status = ? WHERE id = ?').run('accepted', requestId | 0);
    } else {
        db.prepare('DELETE FROM friendships WHERE id = ?').run(requestId | 0);
    }
    res.json({ ok: true, status: accept ? 'accepted' : 'rejected' });
});

app.delete('/api/friends/:userId', requireAuth, (req, res) => {
    const other = req.params.userId | 0;
    db.prepare(`
        DELETE FROM friendships
        WHERE (requester_id = ? AND addressee_id = ?) OR (requester_id = ? AND addressee_id = ?)
    `).run(req.user.id, other, other, req.user.id);
    res.json({ ok: true });
});

// ── Admin ─────────────────────────────────────────────────────────────────────

app.get('/api/admin/hero-balance', requireAdmin, (_req, res) => {
    const total = (db.prepare('SELECT COUNT(*) AS c FROM scores').get().c) || 1;
    const rows = db.prepare(`
        SELECT hero,
               COUNT(*) AS runs,
               ROUND(100.0 * COUNT(*) / ?, 1) AS pick_rate,
               ROUND(100.0 * SUM(CASE WHEN outcome = 'victory' THEN 1 ELSE 0 END) / COUNT(*), 1) AS win_rate,
               ROUND(AVG(wave), 1) AS avg_wave,
               ROUND(AVG(score), 0) AS avg_score
        FROM scores
        GROUP BY hero
        ORDER BY runs DESC
    `).all(total);
    res.json({ heroes: rows, totalRuns: total });
});

app.get('/api/admin/saves', requireAdmin, (_req, res) => {
    const users = db.prepare('SELECT id, username FROM users ORDER BY id').all();
    const saves = users.map(u => {
        const savePath = path.join(SAVES_DIR, `${u.id}.save`);
        const metaPath = savePath + '.meta';
        if (!fs.existsSync(savePath)) return { userId: u.id, username: u.username, hasData: false };
        const stat = fs.statSync(savePath);
        const meta = fs.existsSync(metaPath)
            ? JSON.parse(fs.readFileSync(metaPath, 'utf8'))
            : { savedAt: null };
        return { userId: u.id, username: u.username, hasData: true, savedAt: meta.savedAt, sizeBytes: stat.size };
    });
    res.json({ saves });
});

// ── HTTP(S) server + WebSocket ────────────────────────────────────────────────

let httpServer;
let serverProtocol = 'http';
if (TLS_CERT_PATH && TLS_KEY_PATH) {
    try {
        const tlsOpts = {
            cert: fs.readFileSync(TLS_CERT_PATH),
            key:  fs.readFileSync(TLS_KEY_PATH),
        };
        if (TLS_CA_PATH) tlsOpts.ca = fs.readFileSync(TLS_CA_PATH);
        httpServer = https.createServer(tlsOpts, app);
        serverProtocol = 'https';
        console.log('[TLS] HTTPS + WSS enabled');
    } catch (e) {
        console.error('[TLS] Failed to read cert/key — falling back to plain HTTP:', e.message);
        httpServer = http.createServer(app);
    }
} else {
    httpServer = http.createServer(app);
    console.log('[TLS] No TLS_CERT_PATH/TLS_KEY_PATH set — running plain HTTP (development only)');
}

// #89 — Origin allowlist for WebSocket upgrades (CSRF defense). Browsers
// always send an Origin header; native clients (Electron, Steam, dev tools)
// don't, so we accept missing Origin too (the JWT token in the query string
// is the authn proof). ALLOWED_WS_ORIGINS env var is a comma-separated list
// of accepted origins (no trailing slash). Empty list = wildcard (dev mode).
const ALLOWED_WS_ORIGINS = (process.env.ALLOWED_WS_ORIGINS || '')
    .split(',').map(s => s.trim()).filter(Boolean);

function _wsVerifyClient(info, cb) {
    const origin = info.origin || info.req.headers.origin || '';
    if (!origin) return cb(true); // native / Electron — no Origin header sent
    if (!ALLOWED_WS_ORIGINS.length) return cb(true); // dev mode wildcard
    if (ALLOWED_WS_ORIGINS.includes(origin)) return cb(true);
    console.warn(`WS: rejected origin "${origin}" (not in allowlist)`);
    cb(false, 403, 'Origin not allowed');
}

// permessage-deflate cuts ~50–70% off JSON snapshot bandwidth on internet links.
// Per the `ws` docs: zlib options must be conservative to avoid CPU spikes
// under load. concurrencyLimit caps parallel inflate operations per connection.
const wss = new WebSocket.Server({
    server: httpServer,
    path:   '/ws',
    verifyClient: _wsVerifyClient,
    perMessageDeflate: {
        zlibDeflateOptions: { level: 3, memLevel: 7, chunkSize: 1024 },
        zlibInflateOptions: { chunkSize: 10 * 1024 },
        clientNoContextTakeover: true,
        serverNoContextTakeover: true,
        concurrencyLimit: 10,
        threshold: 256, // skip compression for tiny messages (PING/PONG, INPUT)
    },
});

// ── Lobby state ───────────────────────────────────────────────────────────────

// code → { code, phase, host, guest, hostHero, guestHero, hostConfirmed, guestConfirmed, hostMode }
// phase: 'waiting' | 'hero_select' | 'pre_game' | 'in_game' | 'finished'
// host/guest: { ws, userId, username } | null
const lobbies = new Map();

// userId → active lobby code (for reconnects)
const userLobby = new Map();

// ── Global Lobby state ────────────────────────────────────────────────────────

// userId → { ws, userId, username, x, y, angle, hero }
const globalLobby = new Map();

// inviteId → { fromUserId, targetUserId, fromHero, targetHero }
const pendingInvites = new Map();

function broadcastGlobal(msg, exceptUserId) {
    for (const player of globalLobby.values()) {
        if (player.userId !== exceptUserId) send(player.ws, msg);
    }
}

const LOBBY_CHARS = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
function makeLobbyCode() {
    let code;
    do { code = Array.from({ length: 6 }, () => LOBBY_CHARS[Math.floor(Math.random() * LOBBY_CHARS.length)]).join(''); }
    while (lobbies.has(code));
    return code;
}

function verifyToken(token) {
    try { return jwt.verify(token, JWT_SECRET); } catch { return null; }
}

function send(ws, msg) {
    if (!ws || ws.readyState !== WebSocket.OPEN) return;
    try {
        ws.send(JSON.stringify(msg));
    } catch (err) {
        // Treat send failure as soft-disconnect — caller can detect via the close handler.
        try { ws.terminate(); } catch (_) { /* noop */ }
    }
}

function partner(lobby, role) {
    return role === 'host' ? lobby.guest : lobby.host;
}

// ── WebSocket connection handling ─────────────────────────────────────────────

wss.on('connection', (ws, req) => {
    const url = new URL(req.url, 'http://localhost');
    const token = url.searchParams.get('token');
    const user = verifyToken(token);

    if (!user) { ws.send(JSON.stringify({ type: 'ERROR', message: 'Unauthorized' })); ws.close(); return; }

    ws.userId = user.id;
    ws.username = user.username;
    ws.role = null;
    ws.lobbyCode = null;

    send(ws, { type: 'CONNECTED', username: user.username });

    // Auto-rejoin if the user was in a game when they disconnected
    const prevCode = userLobby.get(user.id);
    if (prevCode) {
        const lobby = lobbies.get(prevCode);
        if (lobby && lobby.phase === 'in_game') {
            ws.lobbyCode = prevCode;
            ws.role = (lobby.host?.userId === user.id) ? 'host' : 'guest';
            const slot = ws.role === 'host' ? 'host' : 'guest';
            lobby[slot] = { ws, userId: user.id, username: user.username };
            send(ws, { type: 'REJOINED', code: prevCode, role: ws.role });
            const p = partner(lobby, ws.role);
            if (p) send(p.ws, { type: 'PARTNER_RECONNECTED' });
            clearTimeout(lobby._graceTimer);
            lobby._graceTimer = null;
        } else {
            userLobby.delete(user.id);
        }
    }

    ws.on('message', raw => {
        let msg;
        try { msg = JSON.parse(raw); } catch { return; }
        handleMessage(ws, msg);
    });

    ws.on('close', () => handleClose(ws));
    ws.on('error', () => handleClose(ws));
});

function handleMessage(ws, msg) {
    switch (msg.type) {

        case 'CREATE_LOBBY': {
            leaveLobby(ws);
            const code = makeLobbyCode();
            lobbies.set(code, {
                code,
                phase: 'waiting',
                host: { ws, userId: ws.userId, username: ws.username },
                guest: null,
                hostHero: msg.hero || 'fire',
                guestHero: 'water',
                hostConfirmed: false,
                guestConfirmed: false,
                hostUsername: ws.username,
                guestUsername: null,
            });
            ws.lobbyCode = code;
            ws.role = 'host';
            userLobby.set(ws.userId, code);
            send(ws, { type: 'LOBBY_CREATED', code });
            break;
        }

        case 'JOIN_LOBBY': {
            const code = (msg.code || '').toUpperCase().trim();
            const lobby = lobbies.get(code);
            if (!lobby) return send(ws, { type: 'ERROR', message: 'Lobby not found' });
            if (lobby.guest) return send(ws, { type: 'ERROR', message: 'Lobby is full' });
            if (lobby.host.userId === ws.userId) return send(ws, { type: 'ERROR', message: 'Cannot join your own lobby' });
            if (lobby.phase !== 'waiting') return send(ws, { type: 'ERROR', message: 'Game already in progress' });

            leaveLobby(ws);
            lobby.guest = { ws, userId: ws.userId, username: ws.username };
            lobby.guestHero = msg.hero || lobby.guestHero || 'water';
            lobby.guestUsername = ws.username;
            lobby.phase = 'hero_select';
            ws.lobbyCode = code;
            ws.role = 'guest';
            userLobby.set(ws.userId, code);

            send(lobby.host.ws, { type: 'GUEST_JOINED', guestUsername: ws.username, guestHero: lobby.guestHero });
            send(ws, { type: 'LOBBY_JOINED', code, hostUsername: lobby.host.username, hostHero: lobby.hostHero });
            break;
        }

        case 'HERO_SELECT': {
            const lobby = lobbies.get(ws.lobbyCode);
            if (!lobby || (lobby.phase !== 'hero_select' && lobby.phase !== 'pre_game')) return;
            const hero = msg.hero;
            if (ws.role === 'host') {
                lobby.hostHero = hero;
                if (lobby.guest) send(lobby.guest.ws, { type: 'HERO_UPDATE', player: 'host', hero });
            } else {
                lobby.guestHero = hero;
                send(lobby.host.ws, { type: 'HERO_UPDATE', player: 'guest', hero });
            }
            break;
        }

        case 'HERO_CONFIRM': {
            const lobby = lobbies.get(ws.lobbyCode);
            if (!lobby || lobby.phase !== 'hero_select') return;
            if (ws.role === 'host') {
                lobby.hostConfirmed = true;
                if (lobby.guest) send(lobby.guest.ws, { type: 'HERO_CONFIRMED', player: 'host' });
            } else {
                lobby.guestConfirmed = true;
                send(lobby.host.ws, { type: 'HERO_CONFIRMED', player: 'guest' });
            }
            if (lobby.hostConfirmed && lobby.guestConfirmed) {
                lobby.phase = 'pre_game';
                lobby.hostMode = 'NORMAL';
                const preGameMsg = {
                    type: 'PRE_GAME',
                    lobbyCode: lobby.code,
                    hostHero: lobby.hostHero, guestHero: lobby.guestHero,
                    hostUsername: lobby.host.username, guestUsername: lobby.guest.username,
                };
                send(lobby.host.ws, preGameMsg);
                send(lobby.guest.ws, preGameMsg);
            }
            break;
        }

        case 'START_ONLINE_GAME': {
            const lobby = lobbies.get(ws.lobbyCode);
            if (!lobby || lobby.phase !== 'pre_game' || ws.role !== 'host') return;
            lobby.phase = 'in_game';

            // Issue per-user session tokens for anti-cheat verification at submit time.
            const sessionId = `${lobby.code}-${Date.now()}`;
            const hostToken  = lobby.host  ? signSessionToken(sessionId, lobby.host.userId)  : null;
            const guestToken = lobby.guest ? signSessionToken(sessionId, lobby.guest.userId) : null;
            lobby._sessionId = sessionId;
            _sessionScores.set(sessionId, {
                wave: 1, score: 0, timeSec: 0,
                hero: lobby.hostHero, mode: msg.mode || lobby.hostMode || 'NORMAL',
                userIds: [lobby.host?.userId, lobby.guest?.userId].filter(Boolean),
            });

            const baseStart = {
                type: 'GAME_START',
                hostHero: lobby.hostHero, guestHero: lobby.guestHero,
                hostUsername: lobby.host.username, guestUsername: lobby.guest.username,
                mode: msg.mode || lobby.hostMode || 'NORMAL',
            };
            send(lobby.host.ws,  { ...baseStart, sessionToken: hostToken });
            send(lobby.guest.ws, { ...baseStart, sessionToken: guestToken });

            // Start server-authoritative simulation for this lobby
            try {
                const session = new GameSession(lobby, send, {
                    // Keep authoritative wave/score fresh so /api/leaderboard
                    // can clamp client claims even before GAME_OVER lands.
                    onTickStats: (wave, score, timeSec) => {
                        const entry = _sessionScores.get(sessionId);
                        if (entry) { entry.wave = wave; entry.score = score; entry.timeSec = timeSec; }
                    },
                });
                session.init(lobby.hostHero, lobby.guestHero, msg.mode || lobby.hostMode || 'NORMAL');
                lobby.session = session;
            } catch (err) {
                console.error('[GameSession] Failed to start:', err);
            }
            break;
        }

        case 'MODE_SELECT': {
            const lobby = lobbies.get(ws.lobbyCode);
            if (!lobby || lobby.phase !== 'pre_game' || ws.role !== 'host') return;
            lobby.hostMode = msg.mode || 'NORMAL';
            if (lobby.guest) send(lobby.guest.ws, { type: 'MODE_UPDATE', mode: lobby.hostMode });
            break;
        }

        case 'INPUT': {
            // Both clients send inputs directly to the server (no relay)
            const lobby = lobbies.get(ws.lobbyCode);
            if (!lobby || lobby.phase !== 'in_game' || !lobby.session) return;
            lobby.session.applyInput(ws.role, msg);
            break;
        }

        case 'LEVEL_UP_CHOICE': {
            const lobby = lobbies.get(ws.lobbyCode);
            if (!lobby || !lobby.session) return;
            lobby.session.applyLevelUpChoice(ws.role, msg.choice);
            // Notify partner that level-up is done
            const p = partner(lobby, ws.role);
            if (p) send(p.ws, { type: 'LEVEL_UP_DONE' });
            break;
        }

        case 'RELAY': {
            // Legacy relay path — kept for pre_game phase messages only.
            // In-game INPUT is now handled by the INPUT case above.
            const lobby = lobbies.get(ws.lobbyCode);
            if (!lobby || lobby.phase !== 'pre_game') return;
            const p = partner(lobby, ws.role);
            if (p) send(p.ws, { type: 'RELAY', from: ws.role, payload: msg.payload });
            break;
        }

        case 'WEBRTC_OFFER':
        case 'WEBRTC_ANSWER':
        case 'WEBRTC_ICE': {
            const lobby = lobbies.get(ws.lobbyCode);
            if (!lobby) break;
            const p = partner(lobby, ws.role);
            if (p) send(p.ws, { type: msg.type, from: ws.role, data: msg.data });
            break;
        }

        case 'VOICE_MUTE': {
            const lobby = lobbies.get(ws.lobbyCode);
            if (!lobby) break;
            const p = partner(lobby, ws.role);
            if (p) send(p.ws, { type: 'VOICE_MUTE', muted: !!msg.muted, from: ws.role });
            break;
        }

        case 'GAME_OVER': {
            const lobby = lobbies.get(ws.lobbyCode);
            if (!lobby) return;
            if (lobby.phase === 'finished') return; // already done, ignore duplicate
            if (lobby.session) { recordCompletedSession(lobby); lobby.session.stop(); lobby.session = null; }
            lobby.phase = 'finished';
            const p = partner(lobby, ws.role);
            if (p) send(p.ws, { type: 'GAME_OVER' });
            // Keep lobby alive for 5 min so players can return-to-lobby; auto-cleanup after
            clearTimeout(lobby._finishTimer);
            lobby._finishTimer = setTimeout(() => cleanupLobby(lobby.code), 5 * 60 * 1000);
            break;
        }

        case 'RETURN_TO_LOBBY': {
            const lobby = lobbies.get(ws.lobbyCode);
            if (!lobby || lobby.phase !== 'finished') return;
            clearTimeout(lobby._finishTimer);
            lobby.phase = 'hero_select';
            lobby.hostConfirmed = false;
            lobby.guestConfirmed = false;
            const retMsg = {
                type: 'RETURN_TO_LOBBY',
                code: lobby.code,
                hostHero: lobby.hostHero,
                guestHero: lobby.guestHero,
                hostUsername: lobby.host?.username,
                guestUsername: lobby.guest?.username,
            };
            send(lobby.host.ws, retMsg);
            if (lobby.guest) send(lobby.guest.ws, retMsg);
            break;
        }

        case 'STORY_CONTINUE': {
            const lobby = lobbies.get(ws.lobbyCode);
            if (!lobby || lobby.phase !== 'in_game') return;
            const p = partner(lobby, ws.role);
            if (p) send(p.ws, { type: 'STORY_CONTINUE' });
            break;
        }

        case 'MAZE_NODE_SELECTED': {
            // Host relays their Maze of Time node pick to the guest
            const lobby = lobbies.get(ws.lobbyCode);
            if (!lobby || lobby.phase !== 'in_game' || ws.role !== 'host') return;
            const p = partner(lobby, ws.role);
            if (p) send(p.ws, { type: 'MAZE_NODE_SELECTED', nodeId: msg.nodeId, storyEvent: msg.storyEvent });
            break;
        }

        case 'LEAVE_LOBBY': {
            leaveLobby(ws);
            break;
        }

        case 'PING': {
            send(ws, { type: 'PONG', t: msg.t });
            break;
        }

        // ── Global Lobby ───────────────────────────────────────────────────────

        case 'JOIN_GLOBAL_LOBBY': {
            // Session takeover: evict the stale connection so the new device takes over cleanly
            if (globalLobby.has(ws.userId)) {
                const stale = globalLobby.get(ws.userId);
                stale.ws.inGlobalLobby = false;
                stale.ws.terminate();
                globalLobby.delete(ws.userId);
                broadcastGlobal({ type: 'GLOBAL_PLAYER_LEFT', userId: ws.userId }, null);
            }
            const entry = { ws, userId: ws.userId, username: ws.username, x: 1200, y: 1300, angle: 0, hero: msg.hero || 'fire' };
            globalLobby.set(ws.userId, entry);
            ws.inGlobalLobby = true;
            // Send current state to the joining player
            const players = Array.from(globalLobby.values())
                .filter(p => p.userId !== ws.userId)
                .map(({ userId, username, x, y, angle, hero }) => ({ userId, username, x, y, angle, hero }));
            send(ws, { type: 'GLOBAL_LOBBY_STATE', players });
            // Notify others
            broadcastGlobal({ type: 'GLOBAL_PLAYER_JOINED', userId: ws.userId, username: ws.username, x: entry.x, y: entry.y, angle: 0, hero: entry.hero }, ws.userId);
            break;
        }

        case 'LEAVE_GLOBAL_LOBBY': {
            if (!globalLobby.has(ws.userId)) break;
            globalLobby.delete(ws.userId);
            ws.inGlobalLobby = false;
            broadcastGlobal({ type: 'GLOBAL_PLAYER_LEFT', userId: ws.userId }, null);
            break;
        }

        case 'PLAYER_MOVE': {
            const entry = globalLobby.get(ws.userId);
            if (!entry) break;
            entry.x = msg.x; entry.y = msg.y; entry.angle = msg.angle;
            if (msg.hero) entry.hero = msg.hero;
            broadcastGlobal({ type: 'GLOBAL_PLAYER_UPDATE', userId: ws.userId, x: entry.x, y: entry.y, angle: entry.angle, hero: entry.hero }, ws.userId);
            break;
        }

        case 'GLOBAL_EMOTE': {
            if (!globalLobby.has(ws.userId)) break;
            broadcastGlobal({ type: 'GLOBAL_EMOTE', userId: ws.userId, emoteType: msg.emoteType }, ws.userId);
            break;
        }

        case 'GAME_INVITE': {
            const inviter = globalLobby.get(ws.userId);
            const target = globalLobby.get(msg.targetUserId);
            if (!inviter || !target) break;
            const inviteId = Math.random().toString(36).slice(2, 10);
            pendingInvites.set(inviteId, { fromUserId: ws.userId, targetUserId: msg.targetUserId });
            send(target.ws, { type: 'GAME_INVITE_INCOMING', fromUserId: ws.userId, fromUsername: ws.username, inviteId });
            break;
        }

        case 'GAME_INVITE_RESPONSE': {
            const invite = pendingInvites.get(msg.inviteId);
            if (!invite) break;
            pendingInvites.delete(msg.inviteId);
            const inviter = globalLobby.get(invite.fromUserId);
            const target = globalLobby.get(invite.targetUserId);
            if (!msg.accept) {
                if (inviter) send(inviter.ws, { type: 'GAME_INVITE_DECLINED', inviteId: msg.inviteId });
                break;
            }
            if (!inviter || !target) break;
            // Remove both from global lobby
            globalLobby.delete(invite.fromUserId);
            globalLobby.delete(invite.targetUserId);
            inviter.ws.inGlobalLobby = false;
            target.ws.inGlobalLobby = false;
            broadcastGlobal({ type: 'GLOBAL_PLAYER_LEFT', userId: invite.fromUserId }, null);
            broadcastGlobal({ type: 'GLOBAL_PLAYER_LEFT', userId: invite.targetUserId }, null);
            // Create a private lobby in pre_game phase so both players can select mode
            const code = makeLobbyCode();
            const hostHero = inviter.hero;
            const guestHero = target.hero;
            lobbies.set(code, {
                code, phase: 'pre_game',
                host: { ws: inviter.ws, userId: inviter.userId, username: inviter.username },
                guest: { ws: target.ws, userId: target.userId, username: target.username },
                hostHero, guestHero, hostConfirmed: true, guestConfirmed: true, hostMode: 'NORMAL',
                hostUsername: inviter.username, guestUsername: target.username,
            });
            inviter.ws.lobbyCode = code; inviter.ws.role = 'host';
            target.ws.lobbyCode = code; target.ws.role = 'guest';
            userLobby.set(inviter.userId, code);
            userLobby.set(target.userId, code);
            const preGameMsg = { type: 'PRE_GAME', lobbyCode: code, hostHero, guestHero, hostUsername: inviter.username, guestUsername: target.username };
            send(inviter.ws, preGameMsg);
            send(target.ws, preGameMsg);
            break;
        }
    }
}

function handleClose(ws) {
    // Clean up from global lobby if present
    if (ws.inGlobalLobby) {
        globalLobby.delete(ws.userId);
        ws.inGlobalLobby = false;
        broadcastGlobal({ type: 'GLOBAL_PLAYER_LEFT', userId: ws.userId }, null);
    }

    if (!ws.lobbyCode) return;
    const lobby = lobbies.get(ws.lobbyCode);
    if (!lobby) return;

    const p = partner(lobby, ws.role);
    if (p) send(p.ws, { type: 'PARTNER_DISCONNECTED' });

    if (lobby.phase === 'in_game') {
        // Keep lobby alive for reconnect; null out the disconnected slot
        if (ws.role === 'host') lobby.host = null;
        else lobby.guest = null;
        // 30s grace window — partner gets a pause overlay, not an immediate game-over
        if (p) send(p.ws, { type: 'PARTNER_RECONNECTING', timeoutSec: 30 });
        clearTimeout(lobby._graceTimer);
        lobby._graceTimer = setTimeout(() => {
            const l = lobbies.get(lobby.code);
            if (!l) return;
            const remaining = l.host || l.guest;
            if (remaining) send(remaining.ws, { type: 'PARTNER_DISCONNECTED' });
        }, 30_000);
        // Hard cleanup after 90s — allows the late leaderboard submission window
        setTimeout(() => {
            if (lobbies.has(lobby.code)) {
                const l = lobbies.get(lobby.code);
                if (!l.host || !l.guest) cleanupLobby(lobby.code);
            }
        }, 90_000);
    } else {
        leaveLobby(ws);
    }
}

function leaveLobby(ws) {
    const lobby = lobbies.get(ws.lobbyCode);
    if (!lobby) { ws.lobbyCode = null; ws.role = null; return; }
    const p = partner(lobby, ws.role);
    if (p) send(p.ws, { type: 'PARTNER_DISCONNECTED' });
    if (ws.role === 'host') {
        cleanupLobby(lobby.code);
    } else {
        // Guest left pre-game — lobby returns to waiting
        lobby.guest = null;
        lobby.guestConfirmed = false;
        lobby.phase = 'waiting';
        userLobby.delete(ws.userId);
    }
    ws.lobbyCode = null;
    ws.role = null;
}

function recordCompletedSession(lobby) {
    const s = lobby.session;
    if (!s || !s._startedAt) return;
    const duration = Math.round((Date.now() - s._startedAt) / 1000);
    const entry = {
        code:      lobby.code,
        startedAt: s._startedAt,
        endedAt:   Date.now(),
        duration,
        host:  { username: lobby.hostUsername  || lobby.host?.username,  hero: lobby.hostHero  },
        guest: { username: lobby.guestUsername || lobby.guest?.username, hero: lobby.guestHero },
        wave:  s.wave,
        score: s.score,
        stats: { ...s._world.currentRunStats },
    };
    if (completedSessions.length >= 100) completedSessions.shift();
    completedSessions.push(entry);

    // Stamp final score for leaderboard verification. Token TTL keeps the entry
    // alive long enough for late submissions; sweep below caps overall size.
    if (lobby._sessionId && _sessionScores.has(lobby._sessionId)) {
        const auth = _sessionScores.get(lobby._sessionId);
        auth.wave    = s.wave;
        auth.score   = s.score;
        auth.timeSec = duration;
        auth.endedAt = Date.now();
    }
}

// Sweep stale session-score entries — runs hourly, evicts anything older than
// twice the token TTL (covers any late submissions, then drops).
setInterval(() => {
    const cutoff = Date.now() - (SESSION_TOKEN_TTL_SEC * 2) * 1000;
    for (const [sid, e] of _sessionScores) {
        if ((e.endedAt || 0) > 0 && e.endedAt < cutoff) _sessionScores.delete(sid);
    }
}, 60 * 60 * 1000).unref?.();

function cleanupLobby(code) {
    const lobby = lobbies.get(code);
    if (!lobby) return;
    if (lobby.session) { recordCompletedSession(lobby); lobby.session.stop(); lobby.session = null; }
    if (lobby.host)  { userLobby.delete(lobby.host.userId);  lobby.host.ws.lobbyCode  = null; lobby.host.ws.role  = null; }
    if (lobby.guest) { userLobby.delete(lobby.guest.userId); lobby.guest.ws.lobbyCode = null; lobby.guest.ws.role = null; }
    lobbies.delete(code);
}

// ── Start ─────────────────────────────────────────────────────────────────────

httpServer.listen(PORT, () => console.log(`5 Freunde server running on port ${PORT} (${serverProtocol.toUpperCase()} + WebSocket${serverProtocol === 'https' ? ' over TLS' : ''})`));
