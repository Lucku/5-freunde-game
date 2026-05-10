const _HERO_EMOJI = {
    fire:'🔥', water:'💧', ice:'❄️', plant:'🌿', metal:'⚙️',
    sound:'🎵', gravity:'🌀', void:'☯️', spirit:'✨', chance:'🎲',
    air:'🌪️', poison:'☠️', lightning:'⚡', love:'❤️', earth:'🪨',
    time:'⏳',
};

class OnlineLobbyUI {
    constructor() {
        this._unsubscribe  = [];   // cleanup functions for NetworkManager handlers
        this._myHero       = 'fire';
        this._partnerHero  = null;
        this._myConfirmed  = false;
        this._partnerConfirmed = false;
        this._partnerName  = null;
        this._isHost       = false;
    }

    // ── Open / close ──────────────────────────────────────────────────────────

    async open() {
        // Block online access if a newer version exists
        try {
            const { ipcRenderer } = require('electron');
            const status = await ipcRenderer.invoke('get-update-status');
            if (status.available) {
                const text = document.getElementById('online-update-required-text');
                if (text) {
                    text.textContent = `Online mode requires version ${status.version}. You are running v${APP_VERSION}. Please download the latest patch to play online.`;
                }
                const btn = document.getElementById('online-update-download-btn');
                if (btn) btn.onclick = () => ipcRenderer.send('open-url', status.url);
                const dlg = document.getElementById('online-update-required-dialog');
                if (dlg) dlg.style.display = 'flex';
                return;
            }
        } catch (e) {
            // Version check unavailable — allow entry
        }

        const account = window.gameConfig?.account || {};
        if (!account.token) {
            this._showError('You need to log in first.\nUse the LOGIN button on the main menu.');
            return;
        }

        const screen = document.getElementById('online-lobby-screen');
        if (screen) screen.style.display = 'flex';
        if (window.setUIState) window.setUIState('ONLINE_LOBBY');
        if (window.audioManager) window.audioManager.playMenuMusic?.();

        this._reset();
        this._buildHeroGrid();
        this._showPanel('connect');
        this._registerHandlers();

        // Connect (or reconnect) the WebSocket using the shared credentials
        const nm = window.networkManager;
        if (!nm.connected) {
            const serverUrl = (typeof CloudSaveManager !== 'undefined')
                ? CloudSaveManager._baseUrl()
                : (window.gameConfig.serverUrl || 'http://localhost:3001');
            nm.connect(serverUrl, account.token);
        }
        this._pollConnectStatus();
    }

    close() {
        window.networkManager?.leaveLobby();
        this._removeHandlers();
        const screen = document.getElementById('online-lobby-screen');
        if (screen) screen.style.display = 'none';
        if (window.setUIState) window.setUIState('MENU');
        clearTimeout(this._pollTimer);
    }

    // ── Lobby actions ─────────────────────────────────────────────────────────

    openGlobalLobby() {
        const nm = window.networkManager;
        if (!nm.connected) { this._setStatus('Not connected to server.', 'err'); return; }
        this._removeHandlers();
        clearTimeout(this._pollTimer);
        const screen = document.getElementById('online-lobby-screen');
        if (screen) screen.style.display = 'none';
        const hero = window.selectedHeroType || 'fire';
        if (typeof window.openGlobalLobby === 'function') window.openGlobalLobby(hero);
    }

    createGame() {
        const nm = window.networkManager;
        if (!nm.connected) { this._setStatus('Not connected to server.', 'err'); return; }
        this._isHost = true;
        nm.createLobby(this._myHero);
    }

    joinGame() {
        const nm = window.networkManager;
        if (!nm.connected) { this._setStatus('Not connected to server.', 'err'); return; }
        const code = (document.getElementById('ol-join-code')?.value || '').trim().toUpperCase();
        if (code.length !== 6) { this._setStatus('Enter a 6-character lobby code.', 'err'); return; }
        this._isHost = false;
        nm.joinLobby(code, this._myHero);
    }

    selectHero(hero) {
        this._myHero = hero;
        this._myConfirmed = false;
        this._renderSlot('my', hero, false);
        // Update ready button
        const btn = document.getElementById('ol-ready-btn');
        if (btn) { btn.textContent = 'READY'; btn.className = 'screen-action-btn'; }
        window.networkManager?.selectHero(hero);
        this._refreshHeroGrid();
    }

    confirmReady() {
        if (this._myConfirmed) return;
        this._myConfirmed = true;
        window.networkManager?.confirmHero();
        const btn = document.getElementById('ol-ready-btn');
        if (btn) { btn.textContent = '✓ READY'; btn.className = 'screen-action-btn'; btn.style.background = '#27ae60'; }
        this._renderSlot('my', this._myHero, true);
        this._updateWaitingMsg();
    }

    // ── NetworkManager event handlers ─────────────────────────────────────────

    _registerHandlers() {
        const nm = window.networkManager;
        const add = (type, fn) => { const unsub = nm.on(type, fn.bind(this)); this._unsubscribe.push(unsub); };

        add('LOBBY_CREATED', msg => {
            document.getElementById('ol-code-value').textContent = msg.code;
            this._showPanel('lobby');
            this._setStatus('Waiting for a partner to join…', 'info');
        });

        add('LOBBY_JOINED', msg => {
            document.getElementById('ol-code-value').textContent = msg.code;
            this._partnerName = msg.hostUsername;
            this._partnerHero = msg.hostHero;
            this._showPanel('lobby');
            this._renderSlot('partner', this._partnerHero, false);
            document.getElementById('ol-partner-name').textContent = msg.hostUsername;
            this._setStatus('Choose your hero and press READY.', 'info');
        });

        add('GUEST_JOINED', msg => {
            this._partnerName = msg.guestUsername;
            this._partnerHero = msg.guestHero;
            this._renderSlot('partner', this._partnerHero, false);
            document.getElementById('ol-partner-name').textContent = msg.guestUsername;
            this._setStatus('Partner connected! Choose your hero and press READY.', 'ok');
        });

        add('HERO_UPDATE', msg => {
            const isPartner = (this._isHost && msg.player === 'guest') || (!this._isHost && msg.player === 'host');
            if (isPartner) {
                this._partnerHero = msg.hero;
                this._partnerConfirmed = false;
                this._renderSlot('partner', msg.hero, false);
            }
        });

        add('HERO_CONFIRMED', msg => {
            const isPartner = (this._isHost && msg.player === 'guest') || (!this._isHost && msg.player === 'host');
            if (isPartner) {
                this._partnerConfirmed = true;
                this._renderSlot('partner', this._partnerHero, true);
                this._updateWaitingMsg();
            }
        });

        add('RETURN_TO_LOBBY', msg => {
            clearTimeout(this._returnTimer);
            const nm = window.networkManager;
            this._isHost = nm?.role === 'host';
            const myHero = this._isHost ? msg.hostHero : msg.guestHero;
            const partnerHero = this._isHost ? msg.guestHero : msg.hostHero;
            const partnerName = this._isHost ? msg.guestUsername : msg.hostUsername;
            this._myHero = myHero || this._myHero;
            this._partnerHero = partnerHero || null;
            this._myConfirmed = false;
            this._partnerConfirmed = false;
            this._partnerName = partnerName;
            document.getElementById('ol-code-value').textContent = msg.code || '—';
            document.getElementById('ol-partner-name').textContent = partnerName || '—';
            document.getElementById('ol-my-name').textContent = window.gameConfig?.account?.username || 'You';
            const btn = document.getElementById('ol-ready-btn');
            if (btn) { btn.textContent = 'READY'; btn.className = 'screen-action-btn'; btn.style.background = ''; }
            this._renderSlot('my', this._myHero, false);
            this._renderSlot('partner', this._partnerHero, false);
            this._refreshHeroGrid();
            this._showPanel('lobby');
            this._setStatus('Choose your hero and press READY.', 'info');
        });

        add('PRE_GAME', msg => {
            // Hide the lobby screen and hand off to the shared versus pre-game screen
            this._removeHandlers();
            const screen = document.getElementById('online-lobby-screen');
            if (screen) screen.style.display = 'none';
            if (typeof versusMenu !== 'undefined') versusMenu.openOnlinePreGame(msg);
        });

        add('GAME_START', msg => {
            // Fallback: if GAME_START somehow arrives while lobby screen is still open
            this._removeHandlers();
            const screen = document.getElementById('online-lobby-screen');
            if (screen) screen.style.display = 'none';
            if (typeof window.startOnlineGame === 'function') window.startOnlineGame(msg);
        });

        add('PARTNER_DISCONNECTED', () => {
            this._partnerConfirmed = false;
            this._setStatus('Partner disconnected — waiting for reconnect…', 'err');
            const btn = document.getElementById('ol-ready-btn');
            if (btn) { btn.textContent = 'READY'; btn.className = 'screen-action-btn'; btn.style.background = ''; }
        });

        add('PARTNER_RECONNECTED', () => {
            this._setStatus('Partner reconnected!', 'ok');
        });

        add('ERROR', msg => {
            this._setStatus(msg.message || 'Server error.', 'err');
        });
    }

    _removeHandlers() {
        this._unsubscribe.forEach(fn => fn());
        this._unsubscribe = [];
    }

    // ── UI helpers ────────────────────────────────────────────────────────────

    _reset() {
        this._myHero = window.selectedHeroType || 'fire';
        this._partnerHero = null;
        this._myConfirmed = false;
        this._partnerConfirmed = false;
        this._partnerName = null;
        this._isHost = false;
        // Reset slots
        this._renderSlot('my', this._myHero, false);
        this._renderSlot('partner', null, false);
        document.getElementById('ol-my-name').textContent = window.gameConfig?.account?.username || 'You';
        document.getElementById('ol-partner-name').textContent = '—';
        document.getElementById('ol-code-value').textContent = '—';
        document.getElementById('ol-join-code').value = '';
        const btn = document.getElementById('ol-ready-btn');
        if (btn) { btn.textContent = 'READY'; btn.className = 'screen-action-btn'; btn.style.background = ''; }
    }

    _showPanel(which) {
        document.getElementById('ol-connect-panel').style.display = which === 'connect' ? 'flex' : 'none';
        document.getElementById('ol-lobby-panel').style.display   = which === 'lobby'   ? 'flex' : 'none';
    }

    _setStatus(text, kind) {
        const el = document.getElementById('ol-status-msg');
        if (!el) return;
        el.textContent = text;
        el.style.color = kind === 'err' ? '#ff7777' : kind === 'ok' ? '#77ff88' : '#aaa';
    }

    _renderSlot(side, hero, confirmed) {
        const prefix = side === 'my' ? 'ol-my' : 'ol-partner';
        const heroEl = document.getElementById(`${prefix}-hero`);
        if (!heroEl) return;
        if (!hero) {
            heroEl.textContent = '?';
            heroEl.style.background = 'rgba(255,255,255,0.07)';
            heroEl.style.opacity = '0.4';
        } else {
            const emoji = _HERO_EMOJI[hero] || '?';
            heroEl.textContent = emoji;
            heroEl.style.opacity = '1';
            const theme = (typeof getHeroTheme === 'function') ? getHeroTheme(hero) : null;
            heroEl.style.background = theme?.color ? theme.color + '33' : 'rgba(255,255,255,0.1)';
            heroEl.style.borderColor = confirmed ? '#27ae60' : (theme?.color || 'rgba(255,255,255,0.2)');
        }
        const badge = document.getElementById(`${prefix}-check`);
        if (badge) badge.style.display = confirmed ? 'block' : 'none';
    }

    _updateWaitingMsg() {
        if (this._myConfirmed && this._partnerConfirmed) {
            this._setStatus('Both ready! Starting game…', 'ok');
        } else if (this._myConfirmed) {
            this._setStatus('Waiting for partner to confirm…', 'info');
        } else if (this._partnerConfirmed) {
            this._setStatus('Partner is ready. Press READY when set!', 'ok');
        }
    }

    _buildHeroGrid() {
        const grid = document.getElementById('ol-hero-grid');
        if (!grid) return;
        grid.innerHTML = '';
        const hidden = new Set(['black', 'green_goblin', 'makuta']);
        const loveUnlocked = window.saveData?.love?.unlocked;
        const heroes = Object.keys(window.BASE_HERO_STATS || {}).filter(h => {
            if (hidden.has(h)) return false;
            if (h === 'love' && !loveUnlocked) return false;
            return true;
        });
        heroes.forEach(h => {
            const btn = document.createElement('button');
            btn.id = `ol-hero-${h}`;
            btn.className = 'ol-hero-btn';
            btn.title = h.charAt(0).toUpperCase() + h.slice(1);
            btn.innerHTML = `<span class="ol-hero-emoji">${_HERO_EMOJI[h] || '?'}</span><span class="ol-hero-label">${h}</span>`;
            btn.onclick = () => this.selectHero(h);
            grid.appendChild(btn);
        });
        this._refreshHeroGrid();
    }

    _refreshHeroGrid() {
        const hidden = new Set(['black', 'green_goblin', 'makuta']);
        const heroes = Object.keys(window.BASE_HERO_STATS || {}).filter(h => !hidden.has(h));
        heroes.forEach(h => {
            const btn = document.getElementById(`ol-hero-${h}`);
            if (!btn) return;
            btn.classList.toggle('selected', h === this._myHero);
        });
    }

    _pollConnectStatus() {
        const nm = window.networkManager;
        const statusEl = document.getElementById('ol-connect-status');
        if (statusEl) statusEl.textContent = nm.connected ? '● Connected' : '○ Connecting…';
        clearTimeout(this._pollTimer);
        this._pollTimer = setTimeout(() => this._pollConnectStatus(), 1000);
    }

    _showError(msg) {
        console.warn('[OnlineLobby]', msg);
        if (typeof CloudSaveManager !== 'undefined') CloudSaveManager.showLoginModal();
    }

    // Called after an online game ends — both players click "Play Again Online"
    // Shows lobby screen and waits for server RETURN_TO_LOBBY broadcast
    _awaitReturnToLobby() {
        const nm = window.networkManager;
        this._isHost = nm?.role === 'host';
        const screen = document.getElementById('online-lobby-screen');
        if (screen) screen.style.display = 'flex';
        if (window.setUIState) window.setUIState('ONLINE_LOBBY');
        if (window.audioManager) window.audioManager.playMenuMusic?.();
        this._removeHandlers();
        this._registerHandlers();
        this._showPanel('connect');
        this._setStatus('Returning to lobby…', 'info');
        // Fallback: if RETURN_TO_LOBBY never arrives (e.g., partner quit), open fresh after 10s
        // The RETURN_TO_LOBBY handler in _registerHandlers() clears this._returnTimer
        this._returnTimer = setTimeout(() => {
            this._removeHandlers();
            this.open();
        }, 10000);
    }
}

window.onlineLobby = new OnlineLobbyUI();
window.openOnlineLobby = () => onlineLobby.open();
