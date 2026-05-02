try { require('dotenv').config(); } catch { }

const express = require('express');
const cors = require('cors');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const Database = require('better-sqlite3');
const http = require('http');
const WebSocket = require('ws');
const fs = require('fs');
const path = require('path');

const PORT = process.env.PORT || 3001;
const JWT_SECRET = process.env.JWT_SECRET || 'change-this-secret-in-production';
const DATA_DIR = path.join(__dirname, 'data');
const SAVES_DIR = path.join(DATA_DIR, 'saves');

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

// ── Express ───────────────────────────────────────────────────────────────────

const app = express();
app.use(cors());
app.use(express.json({ limit: '10mb' }));

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

// ── Leaderboard ───────────────────────────────────────────────────────────────

app.post('/api/leaderboard', requireAuth, (req, res) => {
    const { hero, mode, wave, score, outcome, timeSec } = req.body || {};
    if (typeof score !== 'number' || score < 0) return res.status(400).json({ error: 'Invalid score' });
    db.prepare(`
        INSERT INTO scores (user_id, username, hero, mode, wave, score, outcome, time_sec, submitted_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(req.user.id, req.user.username, hero || 'fire', mode || 'standard',
        Math.max(0, wave | 0), score | 0, outcome || 'death', Math.max(0, timeSec | 0), Date.now());
    // Keep at most 1000 rows total — prune oldest beyond that
    db.prepare(`DELETE FROM scores WHERE id NOT IN (SELECT id FROM scores ORDER BY score DESC LIMIT 1000)`).run();
    res.json({ ok: true });
});

app.get('/api/leaderboard', (req, res) => {
    const limit = Math.min(Math.max(1, parseInt(req.query.limit) || 10), 50);
    const rows = db.prepare(`
        SELECT username, hero, mode, wave, score, outcome, time_sec AS timeSec, submitted_at AS submittedAt
        FROM scores
        ORDER BY score DESC
        LIMIT ?
    `).all(limit);
    res.json({ entries: rows });
});

app.post('/api/register', async (req, res) => {
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

app.post('/api/login', async (req, res) => {
    const { username, password } = req.body || {};
    if (!username || !password) return res.status(400).json({ error: 'Username and password required' });
    const user = db.prepare('SELECT * FROM users WHERE username = ? COLLATE NOCASE').get(username);
    if (!user) return res.status(401).json({ error: 'Invalid username or password' });
    const valid = await bcrypt.compare(password, user.password_hash);
    if (!valid) return res.status(401).json({ error: 'Invalid username or password' });
    const token = jwt.sign({ id: user.id, username: user.username }, JWT_SECRET, { expiresIn: '90d' });
    res.json({ token, username: user.username });
});

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

// ── HTTP server + WebSocket ───────────────────────────────────────────────────

const httpServer = http.createServer(app);
const wss = new WebSocket.Server({ server: httpServer, path: '/ws' });

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
    if (ws && ws.readyState === WebSocket.OPEN) ws.send(JSON.stringify(msg));
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
            const startMsg = {
                type: 'GAME_START',
                hostHero: lobby.hostHero, guestHero: lobby.guestHero,
                hostUsername: lobby.host.username, guestUsername: lobby.guest.username,
                mode: msg.mode || lobby.hostMode || 'NORMAL',
            };
            send(lobby.host.ws, startMsg);
            send(lobby.guest.ws, startMsg);
            break;
        }

        case 'MODE_SELECT': {
            const lobby = lobbies.get(ws.lobbyCode);
            if (!lobby || lobby.phase !== 'pre_game' || ws.role !== 'host') return;
            lobby.hostMode = msg.mode || 'NORMAL';
            if (lobby.guest) send(lobby.guest.ws, { type: 'MODE_UPDATE', mode: lobby.hostMode });
            break;
        }

        case 'RELAY': {
            // Generic relay — host sends game state, guest sends inputs
            const lobby = lobbies.get(ws.lobbyCode);
            if (!lobby || (lobby.phase !== 'in_game' && lobby.phase !== 'pre_game')) return;
            const p = partner(lobby, ws.role);
            if (p) send(p.ws, { type: 'RELAY', from: ws.role, payload: msg.payload });
            break;
        }

        case 'GAME_OVER': {
            const lobby = lobbies.get(ws.lobbyCode);
            if (!lobby) return;
            lobby.phase = 'finished';
            const p = partner(lobby, ws.role);
            if (p) send(p.ws, { type: 'GAME_OVER' });
            cleanupLobby(lobby.code);
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
        // Schedule cleanup if partner doesn't reconnect within 90s
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

function cleanupLobby(code) {
    const lobby = lobbies.get(code);
    if (!lobby) return;
    if (lobby.host) { userLobby.delete(lobby.host.userId); lobby.host.ws.lobbyCode = null; lobby.host.ws.role = null; }
    if (lobby.guest) { userLobby.delete(lobby.guest.userId); lobby.guest.ws.lobbyCode = null; lobby.guest.ws.role = null; }
    lobbies.delete(code);
}

// ── Start ─────────────────────────────────────────────────────────────────────

httpServer.listen(PORT, () => console.log(`5 Freunde server running on port ${PORT} (HTTP + WebSocket)`));
