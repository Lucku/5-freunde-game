'use strict';

/**
 * OnlineTestBot — headless WebSocket bot that acts as the second player in
 * Online Sim mode. Handles auth, lobby join, hero confirm, and idle inputs.
 * One instance lives at window.onlineTestBot.
 */
class OnlineTestBot {
    constructor() {
        this._ws = null;
        this._inputInterval = null;
        this._serverUrl = '';
    }

    // ── Public API ────────────────────────────────────────────────────────────

    /** Login / register as the bot account, then open a WebSocket connection. */
    async start(serverUrl) {
        this._serverUrl = serverUrl;
        const token = await this._getToken();
        const wsBase = serverUrl.replace(/^http/, 'ws').replace(/\/$/, '');
        await this._connect(`${wsBase}/ws?token=${encodeURIComponent(token)}`);
    }

    joinLobby(code, hero = 'water') {
        this._send({ type: 'JOIN_LOBBY', code, hero });
    }

    confirmHero() {
        this._send({ type: 'HERO_CONFIRM' });
    }

    /** Start sending idle (no-op) inputs to the server every 50 ms. */
    beginInputLoop() {
        clearInterval(this._inputInterval);
        this._inputInterval = setInterval(() => {
            this._send({ type: 'INPUT', x: 0, y: 0, aimAngle: 0, shoot: false, melee: false, dash: false, special: false });
        }, 50);
    }

    stop() {
        clearInterval(this._inputInterval);
        this._inputInterval = null;
        if (this._ws) {
            try { this._ws.close(); } catch {}
            this._ws = null;
        }
    }

    // ── Internals ─────────────────────────────────────────────────────────────

    async _getToken() {
        const creds = { username: 'arena-bot', password: 'arena-test-123' };
        let res = await fetch(`${this._serverUrl}/api/login`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(creds),
        }).then(r => r.json()).catch(() => ({}));
        if (res.token) return res.token;

        res = await fetch(`${this._serverUrl}/api/register`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(creds),
        }).then(r => r.json()).catch(() => ({}));
        if (res.token) return res.token;

        throw new Error(`Bot auth failed: ${JSON.stringify(res)}`);
    }

    _connect(url) {
        return new Promise((resolve, reject) => {
            const ws = new WebSocket(url);
            this._ws = ws;
            ws.onopen  = () => resolve();
            ws.onerror = () => reject(new Error('Bot WebSocket failed to open'));
            ws.onmessage = ev => {
                let msg;
                try { msg = JSON.parse(ev.data); } catch { return; }
                this._onMessage(msg);
            };
        });
    }

    _onMessage(msg) {
        // Auto-pick first level-up upgrade
        if (msg.type === 'LEVEL_UP') {
            this._send({ type: 'LEVEL_UP_CHOICE', choice: 0 });
        }
        if (msg.type === 'GAME_OVER') {
            this.stop();
        }
    }

    _send(msg) {
        if (this._ws && this._ws.readyState === WebSocket.OPEN) {
            this._ws.send(JSON.stringify(msg));
        }
    }
}

window.onlineTestBot = new OnlineTestBot();

export { OnlineTestBot };
export default window.onlineTestBot;
if (typeof window !== 'undefined') window.OnlineTestBot = OnlineTestBot;
