try { require('dotenv').config(); } catch {}

const express = require('express');
const cors = require('cors');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const Database = require('better-sqlite3');
const fs = require('fs');
const path = require('path');

const PORT = process.env.PORT || 3001;
const JWT_SECRET = process.env.JWT_SECRET || 'change-this-secret-in-production';
const DATA_DIR = path.join(__dirname, 'data');
const SAVES_DIR = path.join(DATA_DIR, 'saves');

fs.mkdirSync(DATA_DIR, { recursive: true });
fs.mkdirSync(SAVES_DIR, { recursive: true });

const db = new Database(path.join(DATA_DIR, 'users.db'));
db.exec(`
    CREATE TABLE IF NOT EXISTS users (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        username TEXT UNIQUE NOT NULL COLLATE NOCASE,
        password_hash TEXT NOT NULL,
        created_at INTEGER NOT NULL
    )
`);

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

app.listen(PORT, () => console.log(`5 Freunde cloud save server running on port ${PORT}`));
