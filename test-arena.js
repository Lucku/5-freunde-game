/**
 * Online Arena Test Script
 *
 * Runs a solo online-mode game without a second human player.
 * Spins up two WebSocket connections (host + bot), auto-completes the lobby
 * flow, then idles the bot so you can observe the server simulation.
 *
 * Usage:
 *   node test-arena.js [hostHero] [botHero] [mode]
 *
 * Defaults: fire water NORMAL
 * Heroes: fire, water, earth, air, lightning
 * Modes: NORMAL, VERSUS
 *
 * Run from project root with server already running on port 3001.
 */

'use strict';

const http = require('http');
// Resolve ws from server's node_modules (install deps there first: cd server && npm i)
let WebSocket;
try {
    WebSocket = require('./server/node_modules/ws');
} catch {
    try { WebSocket = require('ws'); } catch {
        console.error('[arena] ws not found. Run: cd server && npm install');
        process.exit(1);
    }
}

// ── Config ────────────────────────────────────────────────────────────────────

const BASE_URL = 'http://192.168.178.63:3001';
const WS_URL = 'ws://192.168.178.63:3001';

const HOST_HERO = process.argv[2] || 'fire';
const BOT_HERO = process.argv[3] || 'water';
const MODE = process.argv[4] || 'NORMAL';

const HOST_USER = { username: 'arena-host', password: 'arena-test-123' };
const BOT_USER = { username: 'arena-bot', password: 'arena-test-123' };

// ── Helpers ───────────────────────────────────────────────────────────────────

function post(path, body) {
    return new Promise((resolve, reject) => {
        const data = JSON.stringify(body);
        const req = http.request(`${BASE_URL}${path}`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'Content-Length': Buffer.byteLength(data) },
        }, res => {
            let raw = '';
            res.on('data', c => raw += c);
            res.on('end', () => {
                try { resolve(JSON.parse(raw)); } catch { resolve(raw); }
            });
        });
        req.on('error', reject);
        req.write(data);
        req.end();
    });
}

async function getToken(user) {
    // Try login first; register if user not found.
    let res = await post('/api/login', user);
    if (res.token) return res.token;
    res = await post('/api/register', user);
    if (res.token) return res.token;
    throw new Error(`Auth failed for ${user.username}: ${JSON.stringify(res)}`);
}

function connectWS(token) {
    return new Promise((resolve, reject) => {
        const ws = new WebSocket(`${WS_URL}?token=${token}`);
        ws.once('open', () => resolve(ws));
        ws.once('error', reject);
    });
}

function waitFor(ws, type) {
    return new Promise(resolve => {
        const handler = raw => {
            let msg;
            try { msg = JSON.parse(raw); } catch { return; }
            if (msg.type === type) {
                ws.off('message', handler);
                resolve(msg);
            }
        };
        ws.on('message', handler);
    });
}

function send(ws, msg) {
    ws.send(JSON.stringify(msg));
}

// ── Main ──────────────────────────────────────────────────────────────────────

async function main() {
    console.log(`\n[arena] Connecting as host=${HOST_USER.username}, bot=${BOT_USER.username}`);
    console.log(`[arena] Heroes: ${HOST_HERO} (host) vs ${BOT_HERO} (bot) | mode: ${MODE}\n`);

    // 1. Auth
    const [hostToken, botToken] = await Promise.all([
        getToken(HOST_USER),
        getToken(BOT_USER),
    ]);

    // 2. WebSocket connections
    const [hostWS, botWS] = await Promise.all([
        connectWS(hostToken),
        connectWS(botToken),
    ]);

    console.log('[arena] Connected (both sockets open)');

    // Track stats for display
    const state = { wave: 0, hostHp: '?', botHp: '?', enemies: 0, events: [] };

    // 3. Host creates lobby
    const lobbyCreatedP = waitFor(hostWS, 'LOBBY_CREATED');
    send(hostWS, { type: 'CREATE_LOBBY', hero: HOST_HERO });
    const { code } = await lobbyCreatedP;
    console.log(`[arena] Lobby created: ${code}`);

    // 4. Bot joins lobby
    const [, lobbyJoinedMsg] = await Promise.all([
        waitFor(hostWS, 'GUEST_JOINED'),
        (async () => {
            const p = waitFor(botWS, 'LOBBY_JOINED');
            send(botWS, { type: 'JOIN_LOBBY', code, hero: BOT_HERO });
            return p;
        })(),
    ]);
    console.log(`[arena] Bot joined lobby ${lobbyJoinedMsg.code}`);

    // 5. Both confirm heroes → PRE_GAME
    const hostPreGameP = waitFor(hostWS, 'PRE_GAME');
    const botPreGameP = waitFor(botWS, 'PRE_GAME');
    send(hostWS, { type: 'HERO_CONFIRM' });
    send(botWS, { type: 'HERO_CONFIRM' });
    await Promise.all([hostPreGameP, botPreGameP]);
    console.log('[arena] Both heroes confirmed → PRE_GAME');

    // 6. Host starts game
    const hostStartP = waitFor(hostWS, 'GAME_START');
    const botStartP = waitFor(botWS, 'GAME_START');
    send(hostWS, { type: 'START_ONLINE_GAME', mode: MODE });
    await Promise.all([hostStartP, botStartP]);
    console.log('[arena] Game started! Server simulation running at 20 Hz.\n');
    console.log('[arena] Bot sends idle inputs. Press Ctrl+C to exit.\n');

    // 7. Bot sends idle inputs every 50 ms
    const botInputInterval = setInterval(() => {
        if (botWS.readyState !== WebSocket.OPEN) return;
        send(botWS, { type: 'INPUT', x: 0, y: 0, aimAngle: 0, shoot: false, melee: false, dash: false, special: false });
    }, 50);

    // 8. Host sends idle inputs too (so server has both players active)
    const hostInputInterval = setInterval(() => {
        if (hostWS.readyState !== WebSocket.OPEN) return;
        send(hostWS, { type: 'INPUT', x: 0, y: 0, aimAngle: 0, shoot: false, melee: false, dash: false, special: false });
    }, 50);

    // 9. Listen to snapshots for status display
    let snapshotCount = 0;
    function onSnapshot(raw) {
        let msg;
        try { msg = JSON.parse(raw); } catch { return; }
        if (msg.type !== 'SNAPSHOT') return;
        snapshotCount++;

        if (msg.wave !== undefined) state.wave = msg.wave;
        if (msg.p1) state.hostHp = `${Math.round(msg.p1.hp)}/${msg.p1.maxHp}`;
        if (msg.p2) state.botHp = `${Math.round(msg.p2.hp)}/${msg.p2.maxHp}`;
        if (msg.enemies) state.enemies = msg.enemies.length;

        if (msg.events) {
            for (const e of msg.events) {
                if (e.type === 'wave_start') console.log(`[arena] Wave ${e.wave} started!`);
                if (e.type === 'notification') console.log(`[arena] Notification: ${e.message}`);
                if (e.type === 'level_up') console.log(`[arena] Level up! Player ${e.role} level ${e.level}`);
                if (e.type === 'game_over') console.log(`[arena] GAME OVER — wave ${state.wave}`);
            }
        }
    }
    hostWS.on('message', onSnapshot);
    botWS.on('message', onSnapshot);

    // 10. Bot auto-picks first level-up choice
    function onBotMessage(raw) {
        let msg;
        try { msg = JSON.parse(raw); } catch { return; }
        if (msg.type === 'SNAPSHOT' && msg.events) {
            for (const e of msg.events) {
                if (e.type === 'level_up' && e.role === 'guest') {
                    // Pick first available upgrade
                    send(botWS, { type: 'LEVEL_UP_CHOICE', choice: 0 });
                }
            }
        }
        if (msg.type === 'LEVEL_UP') {
            send(botWS, { type: 'LEVEL_UP_CHOICE', choice: 0 });
        }
    }
    botWS.on('message', onBotMessage);

    // Host auto-picks first level-up choice too
    function onHostMessage(raw) {
        let msg;
        try { msg = JSON.parse(raw); } catch { return; }
        if (msg.type === 'LEVEL_UP') {
            send(hostWS, { type: 'LEVEL_UP_CHOICE', choice: 0 });
        }
    }
    hostWS.on('message', onHostMessage);

    // 11. Print status every 2 seconds
    const statusInterval = setInterval(() => {
        process.stdout.write(
            `\r[arena] Wave:${state.wave} | Host HP:${state.hostHp} | Bot HP:${state.botHp} | Enemies:${state.enemies} | Snapshots:${snapshotCount}    `
        );
    }, 2000);

    // 12. Handle GAME_OVER
    function handleGameOver() {
        console.log('\n[arena] Session ended.');
        clearInterval(botInputInterval);
        clearInterval(hostInputInterval);
        clearInterval(statusInterval);
        botWS.close();
        hostWS.close();
        process.exit(0);
    }

    function onGameOver(raw) {
        let msg;
        try { msg = JSON.parse(raw); } catch { return; }
        if (msg.type === 'GAME_OVER') handleGameOver();
    }
    hostWS.on('message', onGameOver);
    botWS.on('message', onGameOver);

    // Clean exit on Ctrl+C
    process.on('SIGINT', () => {
        console.log('\n[arena] Interrupted.');
        clearInterval(botInputInterval);
        clearInterval(hostInputInterval);
        clearInterval(statusInterval);
        botWS.close();
        hostWS.close();
        process.exit(0);
    });
}

main().catch(err => {
    console.error('[arena] Fatal:', err.message || err);
    process.exit(1);
});
