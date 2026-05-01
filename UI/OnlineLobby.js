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
        this._gameMode     = 'NORMAL';
    }

    // ── Open / close ──────────────────────────────────────────────────────────

    open() {
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

    selectMode(mode) {
        this._gameMode = mode;
        this._updateModeDisplay(mode);
        if (this._isHost) window.networkManager?.selectMode(mode);
    }

    startOnlineMatch() {
        window.networkManager?.startOnlineMatch(this._gameMode);
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

        add('PRE_GAME', msg => {
            // Populate the mode panel hero display (perspective: my = this client's hero)
            const myHero = this._isHost ? msg.hostHero : msg.guestHero;
            const partnerHero = this._isHost ? msg.guestHero : msg.hostHero;
            const myName = this._isHost ? msg.hostUsername : msg.guestUsername;
            const partnerName = this._isHost ? msg.guestUsername : msg.hostUsername;

            const setEl = (id, val) => { const e = document.getElementById(id); if (e) e.textContent = val; };
            setEl('ol-mode-my-hero', _HERO_EMOJI[myHero] || '?');
            setEl('ol-mode-my-name', myName || 'You');
            setEl('ol-mode-partner-hero', _HERO_EMOJI[partnerHero] || '?');
            setEl('ol-mode-partner-name', partnerName || 'Partner');

            const modeButtons = document.getElementById('ol-mode-buttons');
            const modeWaiting = document.getElementById('ol-mode-waiting');
            const startBtn    = document.getElementById('ol-start-btn');
            const guestWait   = document.getElementById('ol-mode-guest-wait');

            if (this._isHost) {
                if (modeButtons) modeButtons.style.display = 'flex';
                if (modeWaiting) modeWaiting.style.display = 'none';
                if (startBtn)    startBtn.style.display    = 'inline-block';
                if (guestWait)   guestWait.style.display   = 'none';
            } else {
                if (modeButtons) modeButtons.style.display = 'none';
                if (modeWaiting) modeWaiting.style.display = 'block';
                if (startBtn)    startBtn.style.display    = 'none';
                if (guestWait)   guestWait.style.display   = 'block';
            }

            this._gameMode = 'NORMAL';
            this._updateModeDisplay('NORMAL');
            this._showPanel('mode');
        });

        add('MODE_UPDATE', msg => {
            this._gameMode = msg.mode || 'NORMAL';
            this._updateModeDisplay(this._gameMode);
        });

        add('GAME_START', msg => {
            this._removeHandlers();
            const screen = document.getElementById('online-lobby-screen');
            if (screen) screen.style.display = 'none';
            // Hand off to game.js
            if (typeof window.startOnlineGame === 'function') {
                window.startOnlineGame(msg);
            }
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
        this._myHero = 'fire';
        this._partnerHero = null;
        this._myConfirmed = false;
        this._partnerConfirmed = false;
        this._partnerName = null;
        this._isHost = false;
        this._gameMode = 'NORMAL';
        // Reset slots
        this._renderSlot('my', 'fire', false);
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
        const modePanel = document.getElementById('ol-mode-panel');
        if (modePanel) modePanel.style.display = which === 'mode' ? 'flex' : 'none';
    }

    _updateModeDisplay(mode) {
        const label = document.getElementById('ol-mode-label');
        if (label) label.textContent = mode === 'VERSUS' ? 'VERSUS' : 'CO-OP';
        const coopBtn    = document.getElementById('ol-mode-coop-btn');
        const versusBtn  = document.getElementById('ol-mode-versus-btn');
        if (coopBtn)   coopBtn.classList.toggle('ol-mode-selected',   mode !== 'VERSUS');
        if (versusBtn) versusBtn.classList.toggle('ol-mode-selected',  mode === 'VERSUS');
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
}

window.onlineLobby = new OnlineLobbyUI();
window.openOnlineLobby = () => onlineLobby.open();
