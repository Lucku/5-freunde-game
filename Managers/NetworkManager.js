/**
 * NetworkManager — client-side WebSocket layer for online co-op.
 *
 * Roles:
 *   host  — created the lobby; runs the authoritative simulation; sends state snapshots
 *   guest — joined with a code; sends inputs; receives state snapshots and renders them
 *
 * Usage:
 *   networkManager.connect(serverUrl, token)
 *   networkManager.on('GAME_START', handler)
 *   networkManager.createLobby(hero)
 *   networkManager.joinLobby(code, hero)
 *   networkManager.relay(payload)     // send any in-game message to partner
 *   networkManager.disconnect()
 */
class NetworkManager {
    constructor() {
        this._ws            = null;
        this._handlers      = {};   // type → [fn, ...]
        this._serverUrl     = '';
        this._token         = '';
        this._reconnectTimer = null;
        this._reconnectDelay = 1000;
        this._intentionalClose = false;
        this._pingInterval  = null;
        this._lastPingSent   = 0;

        this.latencyMs      = 0;
        this.connected      = false;
        this.role           = null;  // 'host' | 'guest' | null
        this.lobbyCode      = null;
        this.phase          = null;  // 'waiting' | 'hero_select' | 'in_game' | null

        // In-game input latch — host reads this for P2; guest writes from local controller
        this.pendingInput   = { x: 0, y: 0, aimAngle: 0, shoot: false, melee: false, dash: false, special: false };
    }

    // ── Connection ─────────────────────────────────────────────────────────────

    connect(serverUrl, token) {
        this._serverUrl = serverUrl.replace(/^http/, 'ws').replace(/\/$/, '');
        this._token     = token;
        this._intentionalClose = false;
        this._open();
    }

    _open() {
        if (this._ws) { try { this._ws.close(); } catch {} }
        const url = `${this._serverUrl}/ws?token=${encodeURIComponent(this._token)}`;
        try {
            this._ws = new WebSocket(url);
        } catch (e) {
            console.warn('[Network] WebSocket constructor failed:', e.message);
            this._scheduleReconnect();
            return;
        }

        this._ws.onopen = () => {
            this.connected = true;
            this._reconnectDelay = 1000;
            clearTimeout(this._reconnectTimer);
            this._startPing();
            console.log('[Network] Connected');
        };

        this._ws.onmessage = (ev) => {
            let msg;
            try { msg = JSON.parse(ev.data); } catch { return; }
            this._dispatch(msg);
        };

        this._ws.onclose = () => {
            this.connected = false;
            this._stopPing();
            console.log('[Network] Disconnected');
            if (!this._intentionalClose) this._scheduleReconnect();
        };

        this._ws.onerror = () => {
            // onerror always fires before onclose, so just let onclose handle reconnect
        };
    }

    _scheduleReconnect() {
        clearTimeout(this._reconnectTimer);
        if (this._intentionalClose) return;
        const delay = Math.min(this._reconnectDelay, 30_000);
        this._reconnectDelay = Math.min(this._reconnectDelay * 2, 30_000);
        console.log(`[Network] Reconnecting in ${delay}ms…`);
        this._reconnectTimer = setTimeout(() => this._open(), delay);
    }

    disconnect() {
        this._intentionalClose = true;
        this._stopPing();
        clearTimeout(this._reconnectTimer);
        if (this._ws) { try { this._ws.close(); } catch {} }
        this.connected  = false;
        this.role       = null;
        this.lobbyCode  = null;
        this.phase      = null;
    }

    // ── Messaging ──────────────────────────────────────────────────────────────

    send(msg) {
        if (this._ws && this._ws.readyState === WebSocket.OPEN) {
            this._ws.send(JSON.stringify(msg));
        }
    }

    _dispatch(msg) {
        // Internal bookkeeping
        if (msg.type === 'PONG') {
            this.latencyMs = Math.round((Date.now() - this._lastPingSent) / 2);
            return;
        }
        if (msg.type === 'CONNECTED') {
            // nothing extra needed
        }
        if (msg.type === 'LOBBY_CREATED') {
            this.lobbyCode = msg.code;
            this.role      = 'host';
            this.phase     = 'waiting';
        }
        if (msg.type === 'LOBBY_JOINED') {
            this.lobbyCode = msg.code;
            this.role      = 'guest';
            this.phase     = 'hero_select';
        }
        if (msg.type === 'GUEST_JOINED') {
            this.phase = 'hero_select';
        }
        if (msg.type === 'GAME_START') {
            this.phase = 'in_game';
        }
        if (msg.type === 'REJOINED') {
            this.lobbyCode = msg.code;
            this.role      = msg.role;
            this.phase     = 'in_game';
        }
        if (msg.type === 'GAME_OVER') {
            this.phase     = null;
            this.lobbyCode = null;
            this.role      = null;
        }

        // Fan out to registered handlers
        const list = this._handlers[msg.type];
        if (list) list.forEach(fn => fn(msg));
        const any = this._handlers['*'];
        if (any) any.forEach(fn => fn(msg));
    }

    on(type, fn) {
        if (!this._handlers[type]) this._handlers[type] = [];
        this._handlers[type].push(fn);
        return () => { this._handlers[type] = this._handlers[type].filter(f => f !== fn); };
    }

    off(type, fn) {
        if (!this._handlers[type]) return;
        this._handlers[type] = this._handlers[type].filter(f => f !== fn);
    }

    // ── Lobby operations ───────────────────────────────────────────────────────

    createLobby(hero) {
        this.send({ type: 'CREATE_LOBBY', hero });
    }

    joinLobby(code, hero) {
        this.send({ type: 'JOIN_LOBBY', code: code.toUpperCase().trim(), hero });
    }

    selectHero(hero) {
        this.send({ type: 'HERO_SELECT', hero });
    }

    confirmHero() {
        this.send({ type: 'HERO_CONFIRM' });
    }

    leaveLobby() {
        this.send({ type: 'LEAVE_LOBBY' });
        this.lobbyCode = null;
        this.role      = null;
        this.phase     = null;
    }

    // ── In-game relay ──────────────────────────────────────────────────────────

    /** Send any payload to the partner (server relays it). */
    relay(payload) {
        this.send({ type: 'RELAY', payload });
    }

    signalGameOver() {
        this.send({ type: 'GAME_OVER' });
        this.phase = null;
        this.lobbyCode = null;
        this.role = null;
    }

    // ── Input accumulation (guest-side) ────────────────────────────────────────

    /** Called by RecordingInputController every frame on the guest. */
    latchInput(input) {
        this.pendingInput.x        = input.x;
        this.pendingInput.y        = input.y;
        this.pendingInput.aimAngle = input.aimAngle;
        if (input.shoot)   this.pendingInput.shoot   = true;
        if (input.melee)   this.pendingInput.melee   = true;
        if (input.dash)    this.pendingInput.dash     = true;
        if (input.special) this.pendingInput.special  = true;
    }

    /** Consume latched input and reset action flags, then send to host. */
    flushInput() {
        const inp = { ...this.pendingInput };
        this.pendingInput.shoot   = false;
        this.pendingInput.melee   = false;
        this.pendingInput.dash    = false;
        this.pendingInput.special = false;
        this.relay({ type: 'INPUT', t: Date.now(), ...inp });
    }

    // ── Helpers ────────────────────────────────────────────────────────────────

    isHost()   { return this.role === 'host'; }
    isGuest()  { return this.role === 'guest'; }
    isInGame() { return this.phase === 'in_game'; }

    _startPing() {
        this._stopPing();
        this._pingInterval = setInterval(() => {
            this._lastPingSent = Date.now();
            this.send({ type: 'PING', t: this._lastPingSent });
        }, 3000);
    }

    _stopPing() {
        clearInterval(this._pingInterval);
        this._pingInterval = null;
    }
}

window.networkManager = new NetworkManager();
