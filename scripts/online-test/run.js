'use strict';
/* global fetch, WebSocket */ // Node ≥ 22 globals

// Online test launcher: watch or play online co-op against a real server
// without a second person. See README → "Testing online play".
//
//   npm run online:test                      2 windows: P1 = you, P2 = autopilot
//   npm run online:test -- --solo            1 window + headless bot partner
//   npm run online:test -- --server <url>    use a running server (e.g. the Pi)
//
// Starts a throwaway local server (unless --server), logs in two test accounts,
// opens the real game client(s) and walks them through the real lobby into a
// match. Everything stops on Ctrl+C, when the windows close, or after --duration.

const { spawn, spawnSync, execFileSync } = require('child_process');
const fs = require('fs');
const os = require('os');
const path = require('path');
const readline = require('readline');

const ROOT = path.resolve(__dirname, '..', '..');
const WORK_DIR = path.join(os.tmpdir(), '5freunde-online-test');
const LOCAL_PORT = 3101;
const DEV_URL = 'http://localhost:5173/game.html';
const PASSWORD = process.env.ONLINE_TEST_PASSWORD || 'online-test-123';

const USAGE = `Usage: npm run online:test -- [options]

  --solo              one game window; the partner is a headless bot
  --server <url>      use a running server instead of a local one
                      (http(s)://host:port, or a bare host like the game's
                      server field → http://host:3001)
  --p1 you|auto       P1 (host) window: you play, or autopilot   [you]
  --p2 auto|you       P2 (guest) window: autopilot, or you play   [auto]
  --hero1 <hero>      P1 hero                                     [fire]
  --hero2 <hero>      P2 / bot hero                               [water]
  --mode <mode>       NORMAL | STORY | VERSUS                     [NORMAL]
  --no-build          use the existing dist/ (default: rebuild first)
  --dev               load the Vite dev server (${DEV_URL}); run \`npm run dev\` first
  --duration <sec>    stop after <sec> and exit 1 if a player never got into the match
  --hidden            offscreen windows, both players on autopilot (for checks)

Env: ONLINE_TEST_PASSWORD (password of the ot-host / ot-guest accounts)`;

const log = msg => console.log(`[online-test] ${msg}`);
function die(msg) {
    console.error(`[online-test] ${msg}`);
    process.exit(1);
}
const sleep = ms => new Promise(r => setTimeout(r, ms));

function parseArgs(argv) {
    const o = {
        server: null, solo: false, p1: 'you', p2: 'auto', hero1: 'fire', hero2: 'water',
        mode: 'NORMAL', build: true, dev: false, duration: 0, hidden: false,
    };
    for (let i = 0; i < argv.length; i++) {
        const flag = argv[i];
        const value = () => {
            const v = argv[++i];
            if (v === undefined || v.startsWith('--')) die(`${flag} needs a value\n\n${USAGE}`);
            return v;
        };
        switch (flag) {
            case '--solo': o.solo = true; break;
            case '--server': o.server = value(); break;
            case '--p1': o.p1 = value(); break;
            case '--p2': o.p2 = value(); break;
            case '--hero1': o.hero1 = value().toLowerCase(); break;
            case '--hero2': o.hero2 = value().toLowerCase(); break;
            case '--mode': o.mode = value().toUpperCase(); break;
            case '--no-build': o.build = false; break;
            case '--dev': o.dev = true; o.build = false; break;
            case '--duration': o.duration = Number(value()); break;
            case '--hidden': o.hidden = true; break;
            case '-h': case '--help': console.log(USAGE); process.exit(0); break;
            default: die(`unknown option ${flag}\n\n${USAGE}`);
        }
    }
    if (!['you', 'auto'].includes(o.p1) || !['you', 'auto'].includes(o.p2)) die('--p1 / --p2 take "you" or "auto"');
    if (!['NORMAL', 'STORY', 'VERSUS'].includes(o.mode)) die('--mode must be NORMAL, STORY or VERSUS');
    if (!(o.duration >= 0)) die('--duration must be a number of seconds');
    if (o.hidden) { o.p1 = 'auto'; o.p2 = 'auto'; } // nobody is watching
    return o;
}

// Same rule as CloudSaveManager._baseUrl(): a bare host means http://host:3001.
function normalizeServer(raw) {
    const s = raw.trim().replace(/\/+$/, '');
    if (/^https?:\/\//.test(s)) return s;
    return s.includes(':') ? `http://${s}` : `http://${s}:3001`;
}

// ── Child processes ──────────────────────────────────────────────────────────

const children = [];
let bot = null;
let shuttingDown = false;
const inGame = new Set(); // roles that reached the match, for the --duration verdict
const failed = [];

function track(child, onLine) {
    children.push(child);
    readline.createInterface({ input: child.stdout }).on('line', onLine);
    readline.createInterface({ input: child.stderr }).on('line', onLine);
    return child;
}

async function shutdown(code) {
    if (shuttingDown) return;
    shuttingDown = true;
    if (bot) bot.stop();
    await Promise.all(children.map(c => new Promise(resolve => {
        if (c.exitCode !== null || c.signalCode !== null) return resolve();
        c.once('exit', resolve);
        c.kill('SIGTERM');
        setTimeout(() => c.kill('SIGKILL'), 3000).unref();
    })));
    process.exit(code);
}
process.on('SIGINT', () => shutdown(0));
process.on('SIGTERM', () => shutdown(0));

// ── Build / app ──────────────────────────────────────────────────────────────

function buildDist() {
    log('building dist/ (skip with --no-build)…');
    const t0 = Date.now();
    const r = spawnSync(process.execPath, [path.join(ROOT, 'node_modules', 'vite', 'bin', 'vite.js'), 'build'], {
        cwd: ROOT, encoding: 'utf8',
    });
    if (r.status !== 0) die(`build failed:\n${r.stdout}\n${r.stderr}`);
    log(`build done in ${((Date.now() - t0) / 1000).toFixed(1)}s`);
}

async function isUp(url) {
    try { return (await fetch(url)).ok; } catch { return false; }
}

async function waitUntilUp(url, timeoutMs) {
    const t0 = Date.now();
    while (Date.now() - t0 < timeoutMs) {
        if (await isUp(url)) return true;
        await sleep(200);
    }
    return false;
}

// ── Server ───────────────────────────────────────────────────────────────────

function listeningPids(port) {
    try {
        return execFileSync('lsof', ['-ti', `tcp:${port}`, '-sTCP:LISTEN'], { encoding: 'utf8' })
            .split('\n').filter(Boolean).map(Number);
    } catch {
        return []; // lsof exits 1 when nothing listens (or isn't installed)
    }
}

// A server left over from an earlier run holds the port; the new one would
// then fail with EADDRINUSE and the clients would quietly test old code.
async function freePort(port) {
    const pids = listeningPids(port);
    for (const pid of pids) {
        const cmd = execFileSync('ps', ['-o', 'command=', '-p', String(pid)], { encoding: 'utf8' }).trim();
        if (!cmd.includes('server.js')) die(`port ${port} is taken by another program: ${cmd}`);
        log(`stopping a stale test server (pid ${pid})`);
        process.kill(pid, 'SIGTERM');
    }
    for (let i = 0; i < 30 && pids.length && listeningPids(port).length; i++) await sleep(100);
}

async function startLocalServer() {
    const serverDir = path.join(ROOT, 'server');
    if (!fs.existsSync(path.join(serverDir, 'node_modules'))) die('server dependencies missing — run: cd server && npm install');
    await freePort(LOCAL_PORT);
    const dataDir = path.join(WORK_DIR, 'server-data');
    const child = spawn(process.execPath, ['server.js'], {
        cwd: serverDir,
        env: {
            ...process.env,
            PORT: String(LOCAL_PORT),
            DATA_DIR: dataDir,
            NODE_ENV: 'development',
            // dotenv never overrides keys that are already set, so these blank
            // out TLS / origin settings a local server/.env might carry.
            TLS_CERT_PATH: '',
            TLS_KEY_PATH: '',
            ALLOWED_WS_ORIGINS: '',
        },
    });
    track(child, line => console.log(`[server] ${line}`));
    child.on('exit', code => {
        if (!shuttingDown) { log(`server exited (code ${code})`); shutdown(1); }
    });
    const url = `http://localhost:${LOCAL_PORT}`;
    if (!(await waitUntilUp(`${url}/api/health`, 15000))) die('local server did not come up');
    log(`local server on ${url} (data: ${dataDir})`);
    return url;
}

// Login first; register only if the account doesn't exist yet.
async function getToken(serverUrl, username) {
    let last = null;
    for (const endpoint of ['/api/login', '/api/register']) {
        try {
            const res = await fetch(serverUrl + endpoint, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ username, password: PASSWORD }),
            });
            last = await res.json().catch(() => ({ error: `HTTP ${res.status}` }));
            if (last.token) return last.token;
        } catch (e) {
            last = { error: e.message };
        }
    }
    die(`could not log in or register "${username}" on ${serverUrl}: ${last && last.error}` +
        '\n  (account taken with another password? set ONLINE_TEST_PASSWORD)');
}

// ── Headless bot partner (--solo) ────────────────────────────────────────────

// Joins as guest and plays like driver.js's autopilot: walks an octagon while
// shooting and sweeping its aim. It must answer level-ups (the server pauses
// the whole match until the chooser picks) and echo story "continue".
function startBot(serverUrl, token) {
    const DIRS = [[1, 0], [1, 1], [0, 1], [-1, 1], [-1, 0], [-1, -1], [0, -1], [1, -1]];
    const blog = msg => console.log(`[bot] ${msg}`);
    const ws = new WebSocket(`${serverUrl.replace(/^http/, 'ws')}/ws?token=${encodeURIComponent(token)}`);
    const send = msg => { if (ws.readyState === WebSocket.OPEN) ws.send(JSON.stringify(msg)); };
    let pendingCode = null;
    let inputTimer = null;

    const join = code => send({ type: 'JOIN_LOBBY', code, hero: opts.hero2 });
    const startInputs = () => {
        const t0 = Date.now();
        inputTimer = setInterval(() => {
            const t = (Date.now() - t0) / 1000;
            const [x, y] = DIRS[Math.floor(t / 1.2) % DIRS.length];
            send({ type: 'INPUT', t: Date.now(), x, y, aimAngle: t * 2.4, shoot: true, melee: false, dash: false, special: false });
        }, 50);
    };

    ws.onopen = () => { blog('connected'); if (pendingCode) join(pendingCode); };
    ws.onclose = () => { clearInterval(inputTimer); if (!shuttingDown) blog('disconnected'); };
    ws.onmessage = ev => {
        let msg;
        try { msg = JSON.parse(ev.data); } catch { return; }
        switch (msg.type) {
            case 'LOBBY_JOINED': blog(`joined lobby ${msg.code}`); send({ type: 'HERO_CONFIRM' }); break;
            case 'GAME_START': blog('IN_GAME'); inGame.add('bot'); startInputs(); break;
            case 'LEVEL_UP': {
                const pick = (msg.options || [])[0];
                blog(`level-up → picks "${pick ? pick.title || pick.id : '?'}"`);
                setTimeout(() => send({ type: 'LEVEL_UP_CHOICE', choice: pick && pick.id }), 1000);
                break;
            }
            case 'STORY_CONTINUE': send({ type: 'STORY_CONTINUE' }); break;
            case 'GAME_OVER': blog('GAME_OVER'); clearInterval(inputTimer); break;
            case 'ERROR': blog(`server ERROR: ${msg.message}`); break;
        }
    };
    return {
        join(code) { if (ws.readyState === WebSocket.OPEN) join(code); else pendingCode = code; },
        stop() { clearInterval(inputTimer); try { ws.close(); } catch { /* already closed */ } },
    };
}

// ── Main ─────────────────────────────────────────────────────────────────────

const opts = parseArgs(process.argv.slice(2));

async function main() {
    let appFile = null;
    let appUrl = null;
    if (opts.dev) {
        if (!(await isUp(DEV_URL))) die(`Vite dev server not reachable at ${DEV_URL} — run \`npm run dev\` first`);
        appUrl = DEV_URL;
    } else {
        if (opts.build) buildDist();
        appFile = path.join(ROOT, 'dist', 'game.html');
        if (!fs.existsSync(appFile)) die('dist/game.html missing — run without --no-build');
    }

    let serverUrl;
    if (opts.server) {
        serverUrl = normalizeServer(opts.server);
        if (!(await waitUntilUp(`${serverUrl}/api/health`, 5000))) die(`no server answering at ${serverUrl}/api/health`);
        log(`using server ${serverUrl}`);
    } else {
        serverUrl = await startLocalServer();
    }

    const [hostToken, guestToken] = await Promise.all([getToken(serverUrl, 'ot-host'), getToken(serverUrl, 'ot-guest')]);
    const appVersion = (/APP_VERSION\s*=\s*['"]([^'"]+)/.exec(fs.readFileSync(path.join(ROOT, 'Constants.js'), 'utf8')) || [])[1];
    const who = p => (p === 'auto' ? 'autopilot' : 'you');
    const slots = [{
        id: 'host', role: 'host', hero: opts.hero1, username: 'ot-host', token: hostToken,
        title: `P1 · host · ${opts.hero1} (${who(opts.p1)})`, autopilot: opts.p1 === 'auto', muted: false,
    }];
    if (!opts.solo) {
        slots.push({
            id: 'guest', role: 'guest', hero: opts.hero2, username: 'ot-guest', token: guestToken,
            title: `P2 · guest · ${opts.hero2} (${who(opts.p2)})`, autopilot: opts.p2 === 'auto', muted: true,
        });
    } else {
        bot = startBot(serverUrl, guestToken);
    }

    const config = { workDir: WORK_DIR, serverUrl, appFile, appUrl, appVersion, mode: opts.mode, hidden: opts.hidden, slots };
    const env = { ...process.env, ONLINE_TEST_CONFIG: JSON.stringify(config) };
    delete env.ELECTRON_RUN_AS_NODE; // set by VS Code's terminal; Electron would start as plain Node

    const players = opts.solo ? ['host', 'bot'] : ['host', 'guest'];
    const electronBin = require(path.join(ROOT, 'node_modules', 'electron'));
    const electron = spawn(electronBin, [path.join(__dirname, 'electron-main.js')], { cwd: ROOT, env });
    track(electron, line => {
        const m = /^\[(host|guest)\] (.*)$/.exec(line);
        if (!m) return; // Chromium / macOS noise
        console.log(line);
        const [, role, text] = m;
        if (text.startsWith('IN_GAME')) inGame.add(role);
        if (text.startsWith('FAILED')) failed.push(line);
        const code = /^CODE ([A-Z0-9]+)/.exec(text);
        if (code && bot) bot.join(code[1]);
    });
    electron.on('exit', code => {
        if (!shuttingDown) { log(`game windows closed (code ${code})`); shutdown(0); }
    });

    log(opts.solo
        ? `1 window + bot, mode ${opts.mode}. Ctrl+C stops everything.`
        : `2 windows (P1 ${who(opts.p1)}, P2 ${who(opts.p2)}), mode ${opts.mode}. Ctrl+C stops everything.`);

    if (opts.duration > 0) {
        setTimeout(() => {
            const missing = players.filter(p => !inGame.has(p));
            const ok = missing.length === 0 && failed.length === 0;
            log(ok ? `PASS: ${players.join(' + ')} reached the match`
                : `FAIL: ${missing.length ? `never in game: ${missing.join(', ')}` : ''} ${failed.join(' | ')}`.trim());
            shutdown(ok ? 0 : 1);
        }, opts.duration * 1000);
    }
}

main().catch(e => { console.error(e); shutdown(1); });
