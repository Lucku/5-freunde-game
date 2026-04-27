try { require('dotenv').config(); } catch {}

const express   = require('express');
const cors      = require('cors');
const bcrypt    = require('bcrypt');
const jwt       = require('jsonwebtoken');
const Database  = require('better-sqlite3');
const http      = require('http');
const WebSocket = require('ws');
const fs        = require('fs');
const path      = require('path');

const PORT       = process.env.PORT       || 3001;
const JWT_SECRET = process.env.JWT_SECRET || 'change-this-secret-in-production';
const DATA_DIR   = path.join(__dirname, 'data');
const SAVES_DIR  = path.join(DATA_DIR, 'saves');

fs.mkdirSync(DATA_DIR,  { recursive: true });
fs.mkdirSync(SAVES_DIR, { recursive: true });

// ── Database ──────────────────────────────────────────────────────────────────

const db = new Database(path.join(DATA_DIR, 'users.db'));
db.exec(`
    CREATE TABLE IF NOT EXISTS users (
        id           INTEGER PRIMARY KEY AUTOINCREMENT,
        username     TEXT UNIQUE NOT NULL COLLATE NOCASE,
        password_hash TEXT NOT NULL,
        created_at   INTEGER NOT NULL
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

app.post('/api/register', async (req, res) => {
    const { username, password } = req.body || {};
    if (!username || !password)                    return res.status(400).json({ error: 'Username and password required' });
    if (username.length < 3 || username.length > 32) return res.status(400).json({ error: 'Username must be 3–32 characters' });
    if (!/^[a-zA-Z0-9_-]+$/.test(username))        return res.status(400).json({ error: 'Username may only contain letters, numbers, _ and -' });
    if (password.length < 6)                        return res.status(400).json({ error: 'Password must be at least 6 characters' });
    try {
        const hash = await bcrypt.hash(password, 10);
        const row  = db.prepare('INSERT INTO users (username, password_hash, created_at) VALUES (?, ?, ?)').run(username, hash, Date.now());
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
    const savedAt  = Date.now();
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

// code → { code, phase, host, guest, hostHero, guestHero, hostConfirmed, guestConfirmed }
// phase: 'waiting' | 'hero_select' | 'in_game' | 'finished'
// host/guest: { ws, userId, username } | null
const lobbies = new Map();

// userId → active lobby code (for reconnects)
const userLobby = new Map();

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
    const url   = new URL(req.url, 'http://localhost');
    const token = url.searchParams.get('token');
    const user  = verifyToken(token);

    if (!user) { ws.send(JSON.stringify({ type: 'ERROR', message: 'Unauthorized' })); ws.close(); return; }

    ws.userId   = user.id;
    ws.username = user.username;
    ws.role     = null;
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
            if (!lobby)                          return send(ws, { type: 'ERROR', message: 'Lobby not found' });
            if (lobby.guest)                     return send(ws, { type: 'ERROR', message: 'Lobby is full' });
            if (lobby.host.userId === ws.userId) return send(ws, { type: 'ERROR', message: 'Cannot join your own lobby' });
            if (lobby.phase !== 'waiting')       return send(ws, { type: 'ERROR', message: 'Game already in progress' });

            leaveLobby(ws);
            lobby.guest = { ws, userId: ws.userId, username: ws.username };
            lobby.phase = 'hero_select';
            ws.lobbyCode = code;
            ws.role = 'guest';
            userLobby.set(ws.userId, code);

            send(lobby.host.ws, { type: 'GUEST_JOINED', guestUsername: ws.username, guestHero: lobby.guestHero });
            send(ws,            { type: 'LOBBY_JOINED', code, hostUsername: lobby.host.username, hostHero: lobby.hostHero });
            break;
        }

        case 'HERO_SELECT': {
            const lobby = lobbies.get(ws.lobbyCode);
            if (!lobby || lobby.phase !== 'hero_select') return;
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
                lobby.phase = 'in_game';
                const startMsg = {
                    type: 'GAME_START',
                    hostHero: lobby.hostHero, guestHero: lobby.guestHero,
                    hostUsername: lobby.host.username, guestUsername: lobby.guest.username,
                };
                send(lobby.host.ws,  startMsg);
                send(lobby.guest.ws, startMsg);
            }
            break;
        }

        case 'RELAY': {
            // Generic relay — host sends game state, guest sends inputs
            const lobby = lobbies.get(ws.lobbyCode);
            if (!lobby || lobby.phase !== 'in_game') return;
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
    }
}

function handleClose(ws) {
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
    if (lobby.host)  { userLobby.delete(lobby.host.userId);  lobby.host.ws.lobbyCode  = null; lobby.host.ws.role  = null; }
    if (lobby.guest) { userLobby.delete(lobby.guest.userId); lobby.guest.ws.lobbyCode = null; lobby.guest.ws.role = null; }
    lobbies.delete(code);
}

// ── Start ─────────────────────────────────────────────────────────────────────

httpServer.listen(PORT, () => console.log(`5 Freunde server running on port ${PORT} (HTTP + WebSocket)`));
