const BIOME_META = {
    random:  { name: 'Random',    rgb: '180,180,180' },
    fire:    { name: 'Volcano',   rgb: '231,76,60'   },
    water:   { name: 'Ocean',     rgb: '52,152,219'  },
    ice:     { name: 'Tundra',    rgb: '200,220,240' },
    plant:   { name: 'Forest',    rgb: '46,204,113'  },
    metal:   { name: 'Factory',   rgb: '149,165,166' },
    rock:    { name: 'Canyon',    rgb: '180,120,60'  },
    cloud:   { name: 'Sky',       rgb: '64,224,208'  },
    chaos:   { name: 'Void',      rgb: '155,89,182'  },
    sound:   { name: 'Harmonic',  rgb: '129,212,250' },
    poison:  { name: 'Bog',       rgb: '139,195,74'  },
    generic: { name: 'Ruins',     rgb: '140,130,120' },
    time:    { name: 'Continuum', rgb: '160,100,240' },
    love:    { name: 'Heartlands', rgb: '240,100,150' },
};

class VersusMenuUI {
    constructor() {
        this.opponent = 'random';
        this.biome = 'random';
        this.isOpen = false;

        // Controller Support
        this.currentRow = 0; // 0: Opponents, 1: Biomes, 2: Start Button
        this.colIndex = 0;
        this.inputDebounce = 0;
        this.inputLoopId = null;

        // Data Cache
        this.heroIds = [];
        this.biomeIds = [];
    }

    _hexRgb(hex) {
        const h = hex.replace('#', '');
        const r = parseInt(h.substring(0, 2), 16);
        const g = parseInt(h.substring(2, 4), 16);
        const b = parseInt(h.substring(4, 6), 16);
        return `${r},${g},${b}`;
    }

    open() {
        const screen = document.getElementById('versus-selection-screen');
        if (screen) screen.style.display = 'flex';
        this.isOpen = true;

        this.renderOpponents();
        this.renderBiomes();
        this.updateFocus();

        // Cancel any stale loop before starting fresh
        if (this.inputLoopId) cancelAnimationFrame(this.inputLoopId);
        this.inputLoopId = requestAnimationFrame(() => this.inputLoop());
    }

    renderOpponents() {
        const grid = document.getElementById('versus-opponent-grid');
        if (!grid) return;
        grid.innerHTML = '';

        const loveUnlocked  = typeof saveData !== 'undefined' && saveData['love'] && saveData['love'].unlocked;
        const evilUnlocked  = typeof saveData !== 'undefined' && saveData.global && saveData.global.evil_mode_beaten > 0;
        const heroBase = Object.keys(BASE_HERO_STATS).filter(h => {
            if (h === 'black') return false;
            if (h === 'love' && !loveUnlocked) return false;
            if ((h === 'green_goblin' || h === 'makuta') && !evilUnlocked) return false;
            return true;
        });
        this.heroIds = this._isOnline ? heroBase : ['random', ...heroBase];

        this.heroIds.forEach((h, index) => {
            const isRandom = (h === 'random');
            const color = isRandom ? '#aaaaaa' : (BASE_HERO_STATS[h]?.color || '#ffffff');
            const rgb = this._hexRgb(color);
            const VILLAIN_LABELS = { green_goblin: 'Goblin', makuta: 'Makuta' };
            const label = isRandom ? 'Random' : (VILLAIN_LABELS[h] || h.charAt(0).toUpperCase() + h.slice(1));

            const card = document.createElement('div');
            card.id = 'opp-opt-' + index;
            card.className = 'vs-hero-card' + (h === this.opponent ? ' selected' : '');
            card.style.setProperty('--hero-rgb', rgb);
            card.dataset.id = h;

            let helmetInner;
            if (isRandom) {
                helmetInner = `<span style="font-size:22px; line-height:1;">?</span>`;
            } else if (h === 'green_goblin') {
                helmetInner = `<svg viewBox="0 0 32 32" width="32" height="32" xmlns="http://www.w3.org/2000/svg">
                  <polygon points="16,2 10,14 22,14" fill="#0a5c1a"/>
                  <ellipse cx="16" cy="21" rx="11" ry="10" fill="#1d8a2e"/>
                  <ellipse cx="5" cy="20" rx="3" ry="4" fill="#1d8a2e"/>
                  <ellipse cx="27" cy="20" rx="3" ry="4" fill="#1d8a2e"/>
                  <path d="M7 17 Q16 14 25 17" fill="none" stroke="#0a5c1a" stroke-width="2"/>
                  <ellipse cx="11" cy="19" rx="3" ry="2.5" fill="#f0c020"/>
                  <ellipse cx="11" cy="19.2" rx="1.4" ry="2" fill="#0a0a0a"/>
                  <ellipse cx="21" cy="19" rx="3" ry="2.5" fill="#f0c020"/>
                  <ellipse cx="21" cy="19.2" rx="1.4" ry="2" fill="#0a0a0a"/>
                  <path d="M8 25 Q16 32 24 25" fill="#0a0a0a"/>
                  <rect x="10" y="24.5" width="3" height="3.5" rx="0.5" fill="white"/>
                  <rect x="14.5" y="24.5" width="3" height="3.5" rx="0.5" fill="white"/>
                  <rect x="19" y="24.5" width="3" height="3.5" rx="0.5" fill="white"/>
                </svg>`;
            } else if (h === 'makuta') {
                helmetInner = `<svg viewBox="0 0 32 32" width="32" height="32" xmlns="http://www.w3.org/2000/svg">
                  <polygon points="9,15 5,2 15,12" fill="#2a0040"/>
                  <polygon points="23,15 27,2 17,12" fill="#2a0040"/>
                  <ellipse cx="16" cy="20" rx="12" ry="11" fill="#0d0015"/>
                  <path d="M6 16 Q16 10 26 16" fill="none" stroke="#3d0060" stroke-width="1.5"/>
                  <ellipse cx="16" cy="20" rx="9" ry="6" fill="#1a0030"/>
                  <ellipse cx="16" cy="20" rx="6" ry="4" fill="#5500a0"/>
                  <ellipse cx="16" cy="20" rx="2.5" ry="4" fill="#cc00ff"/>
                  <ellipse cx="16" cy="20" rx="1" ry="2" fill="#ffaaff"/>
                  <ellipse cx="16" cy="20" rx="10" ry="7" fill="none" stroke="#9900cc" stroke-width="0.7" opacity="0.5"/>
                  <line x1="10" y1="26" x2="9" y2="29" stroke="#5500a0" stroke-width="1.5" stroke-linecap="round"/>
                  <line x1="22" y1="26" x2="23" y2="29" stroke="#5500a0" stroke-width="1.5" stroke-linecap="round"/>
                </svg>`;
            } else if (BASE_HERO_STATS[h]?.icon) {
                helmetInner = `<span style="font-size:20px; line-height:1;">${BASE_HERO_STATS[h].icon}</span>`;
            } else {
                helmetInner = `<div class="vs-hero-visor"></div>`;
            }
            card.innerHTML = `
                <div class="vs-hero-helmet">${helmetInner}</div>
                <div class="vs-hero-label">${label}</div>
            `;

            card.onclick = () => this.selectOpponent(h);
            grid.appendChild(card);
        });
    }

    renderBiomes() {
        const grid = document.getElementById('versus-biome-grid');
        if (!grid) return;
        grid.innerHTML = '';

        const loveUnlocked = typeof saveData !== 'undefined' && saveData['love'] && saveData['love'].unlocked;
        const eoeActive    = typeof window.dlcManager !== 'undefined' && window.dlcManager.isDLCActive('echos_of_eternity');

        const biomes = [
            { id: 'random' }, { id: 'fire' },  { id: 'water' },
            { id: 'ice' },    { id: 'plant' }, { id: 'metal' },
            { id: 'rock' },   { id: 'cloud' }, { id: 'chaos' },
            { id: 'sound' },  { id: 'poison' }, { id: 'generic' },
            ...(eoeActive                       ? [{ id: 'time' }]  : []),
            ...(eoeActive && loveUnlocked       ? [{ id: 'love' }]  : []),
        ];
        this.biomeIds = biomes;

        biomes.forEach((b, index) => {
            const meta = BIOME_META[b.id] || { name: b.id, rgb: '180,180,180' };

            const pill = document.createElement('div');
            pill.id = 'bio-opt-' + index;
            pill.className = 'vs-biome-card' + (b.id === this.biome ? ' selected' : '');
            pill.style.setProperty('--biome-rgb', meta.rgb);
            pill.dataset.id = b.id;
            pill.textContent = meta.name;
            pill.onclick = () => this.selectBiome(b.id);
            grid.appendChild(pill);
        });
    }

    selectOpponent(id, fromFocus = false) {
        this.opponent = id;

        document.querySelectorAll('#versus-opponent-grid .vs-hero-card').forEach(el => {
            el.classList.toggle('selected', el.dataset.id === id);
        });

        const disp = document.getElementById('versus-selected-opponent');
        if (disp) disp.textContent = id.toUpperCase();

        if (!fromFocus && this.heroIds) {
            const idx = this.heroIds.indexOf(id);
            if (idx !== -1) {
                this.currentRow = 0;
                this.colIndex = idx;
                this.updateFocus();
            }
        }

        // In online mode: sync hero change to server
        if (this._isOnline && id !== 'random') {
            this._onlineMyHero = id;
            window.networkManager?.selectHero(id);
        }
    }

    selectBiome(id, fromFocus = false) {
        this.biome = id;

        document.querySelectorAll('#versus-biome-grid .vs-biome-card').forEach(el => {
            el.classList.toggle('selected', el.dataset.id === id);
        });

        const disp = document.getElementById('versus-selected-biome');
        if (disp) disp.textContent = id.toUpperCase();

        if (!fromFocus && this.biomeIds) {
            const idx = this.biomeIds.findIndex(b => b.id === id);
            if (idx !== -1) {
                this.currentRow = 1;
                this.colIndex = idx;
                this.updateFocus();
            }
        }
    }

    open2PVersus() {
        const screen = document.getElementById('versus-selection-screen');
        if (screen) {
            screen.style.display = 'flex';
            // Hide opponent section — heroes already chosen in main menu
            const sections = screen.querySelectorAll('.vs-section');
            if (sections[0]) sections[0].style.display = 'none';

            const eyebrow = screen.querySelector('.vs-eyebrow');
            if (eyebrow) eyebrow.textContent = '⚔ 2 PLAYER VERSUS ⚔';
            const subtitle = screen.querySelector('.vs-subtitle-text');
            if (subtitle) subtitle.textContent = 'Choose your arena — then fight each other';
        }
        this.is2PVersus = true;
        this.isOpen = true;

        this.renderBiomes();
        this.currentRow = 1;
        this.colIndex = 0;
        this.updateFocus();

        // Cancel any stale loop before starting fresh
        if (this.inputLoopId) cancelAnimationFrame(this.inputLoopId);
        this.inputLoopId = requestAnimationFrame(() => this.inputLoop());
    }

    close() {
        const screen = document.getElementById('versus-selection-screen');
        if (screen) {
            screen.style.display = 'none';
            // Restore opponent section in case it was hidden for 2P mode
            const sections = screen.querySelectorAll('.vs-section');
            if (sections[0]) sections[0].style.display = '';
            const eyebrow = screen.querySelector('.vs-eyebrow');
            if (eyebrow) eyebrow.textContent = '⚔ DUEL ARENA ⚔';
            const subtitle = screen.querySelector('.vs-subtitle-text');
            if (subtitle) subtitle.textContent = 'Choose your opponent and step into the arena';
        }
        this.is2PVersus = false;
        this.isOpen = false;
        if (this.inputLoopId) {
            cancelAnimationFrame(this.inputLoopId);
            this.inputLoopId = null;
        }
    }

    start() {
        if (this.is2PVersus) {
            const connectedPads = navigator.getGamepads ? Array.from(navigator.getGamepads()).filter(Boolean) : [];
            if (connectedPads.length < 2) return; // Both controllers must be connected
            window.selectedBiome = this.biome;
            window.is2PlayerVersus = true;
            this.close();
            if (typeof startGame === 'function') startGame('VERSUS');
            return;
        }

        let op = this.opponent;
        if (op === 'random') {
            const loveOk = typeof saveData !== 'undefined' && saveData['love'] && saveData['love'].unlocked;
            const evilOk = typeof saveData !== 'undefined' && saveData.global && saveData.global.evil_mode_beaten > 0;
            const heroes = Object.keys(BASE_HERO_STATS).filter(h => {
                if (h === 'black') return false;
                if (h === 'love' && !loveOk) return false;
                if ((h === 'green_goblin' || h === 'makuta') && !evilOk) return false;
                return true;
            });
            op = heroes[Math.floor(Math.random() * heroes.length)];
        }

        window.selectedOpponent = op;
        window.selectedBiome = this.biome;

        this.close();
        if (typeof startGame === 'function') startGame('VERSUS');
    }

    // --- CONTROLLER LOGIC ---
    inputLoop() {
        if (!this.isOpen) return;

        const pads = navigator.getGamepads ? navigator.getGamepads() : [];
        const gp = [...(pads || [])].find(g => window.isRealGamepad?.(g) ?? (g && g.connected)) || pads[0];

        if (gp) {
            const now = Date.now();
            if (now - this.inputDebounce > 150) {
                let moved = false;

                const left  = (gp.axes[0] < -0.5) || gp.buttons[14].pressed;
                const right = (gp.axes[0] >  0.5) || gp.buttons[15].pressed;
                const up    = (gp.axes[1] < -0.5) || gp.buttons[12].pressed;
                const down  = (gp.axes[1] >  0.5) || gp.buttons[13].pressed;

                if (left)  { this.colIndex--; moved = true; }
                if (right) { this.colIndex++; moved = true; }

                if (moved) {
                    const maxCols = this.currentRow === 0 ? this.heroIds.length
                                  : this.currentRow === 1 ? (this._isOnline ? 4 : this.biomeIds.length) : 1;
                    if (this.colIndex < 0) this.colIndex = maxCols - 1;
                    if (this.colIndex >= maxCols) this.colIndex = 0;
                    this.updateFocus();
                    this.inputDebounce = now;
                }

                // In online mode: guests stay on row 0; only hosts can reach rows 1-2
                const maxRow = (this._isOnline && !this._isOnlineHost) ? 0 : 2;

                if (up || down) {
                    if (up)   this.currentRow--;
                    if (down) this.currentRow++;
                    if (this.currentRow < 0) this.currentRow = maxRow;
                    if (this.currentRow > maxRow) this.currentRow = 0;

                    const maxCols = this.currentRow === 0 ? this.heroIds.length
                                  : this.currentRow === 1 ? (this._isOnline ? 4 : this.biomeIds.length) : 1;
                    if (this.colIndex >= maxCols) this.colIndex = maxCols - 1;
                    this.updateFocus();
                    this.inputDebounce = now;
                }

                if (gp.buttons[0].pressed) {
                    if (this._isOnline) this._triggerOnlineSelection();
                    else this.triggerSelection();
                    this.inputDebounce = now + 200;
                }
                if (gp.buttons[1].pressed) {
                    // In online mode B doesn't cancel (can't leave pre-game via controller)
                    if (!this._isOnline) this.close();
                    this.inputDebounce = now + 200;
                }
            }
        }

        this.inputLoopId = requestAnimationFrame(() => this.inputLoop());
    }

    updateFocus() {
        document.querySelectorAll('.controller-focus').forEach(el => el.classList.remove('controller-focus'));

        if (this.currentRow === 0) {
            const el = document.getElementById('opp-opt-' + this.colIndex);
            if (el) {
                el.classList.add('controller-focus');
                const id = this.heroIds[this.colIndex];
                if (id) this.selectOpponent(id, true);
            }
        } else if (this.currentRow === 1) {
            if (this._isOnline) {
                // Online mode: col 0=Standard, 1=Story, 2=Chaos, 3=Versus
                const btnIds = ['vs-online-standard-btn', 'vs-online-story-btn', 'vs-online-chaos-btn', 'vs-online-versus-btn'];
                document.getElementById(btnIds[this.colIndex] || btnIds[0])?.classList.add('controller-focus');
            } else {
                const el = document.getElementById('bio-opt-' + this.colIndex);
                if (el) {
                    el.classList.add('controller-focus');
                    const item = this.biomeIds[this.colIndex];
                    if (item) this.selectBiome(item.id, true);
                }
            }
        } else if (this.currentRow === 2) {
            const startBtn = document.getElementById('versus-start-btn');
            if (startBtn) startBtn.classList.add('controller-focus');
        }
    }

    triggerSelection() {
        if (this.currentRow === 2) this.start();
    }

    _triggerOnlineSelection() {
        if (this.currentRow === 1 && this._isOnlineHost) {
            const modes = ['NORMAL', 'STORY', 'SHUFFLE', 'VERSUS'];
            this.selectOnlineMode(modes[this.colIndex] || 'NORMAL');
        } else if (this.currentRow === 2 && this._isOnlineHost) {
            this.startOnlineGame();
        }
        // Row 0: hero is already selected on focus
    }

    // ── Online pre-game (hero pick + mode select) ─────────────────────────────

    openOnlinePreGame(msg) {
        const nm = window.networkManager;
        this._isOnline       = true;
        this._isOnlineHost   = nm.isHost();
        this._onlineMode     = 'NORMAL';
        this._onlineMyHero   = nm.isHost() ? msg.hostHero : msg.guestHero;
        this._onlinePartnerHero = nm.isHost() ? msg.guestHero : msg.hostHero;
        this._onlinePartnerName = nm.isHost() ? msg.guestUsername : msg.hostUsername;
        this._onlineUnsubscribe = [];

        const add = (type, fn) => {
            const unsub = nm.on(type, fn.bind(this));
            this._onlineUnsubscribe.push(unsub);
        };
        add('HERO_UPDATE', m => {
            const isPartner = (this._isOnlineHost && m.player === 'guest') || (!this._isOnlineHost && m.player === 'host');
            if (isPartner) { this._onlinePartnerHero = m.hero; this._updateOnlinePartnerDisplay(); }
        });
        add('MODE_UPDATE', m => { this._onlineMode = m.mode || 'NORMAL'; this._updateOnlineModeDisplay(); });
        add('GAME_START', m => { this.closeOnline(); if (typeof window.startOnlineGame === 'function') window.startOnlineGame(m); });

        // Configure screen
        const screen = document.getElementById('versus-selection-screen');
        if (screen) screen.style.display = 'flex';

        const eyebrow  = screen?.querySelector('.vs-eyebrow');
        const titleEl  = screen?.querySelector('.vs-title-text');
        const subtitle = screen?.querySelector('.vs-subtitle-text');
        if (eyebrow)  eyebrow.textContent  = '🌐 ONLINE 2-PLAYER';
        if (titleEl)  titleEl.textContent  = 'HERO SELECT';
        if (subtitle) subtitle.textContent = this._isOnlineHost
            ? 'Choose your hero & mode, then start the match!'
            : 'Choose your hero — host will start the match';

        // Show hero section as "Your Hero", hide biome section
        const sections = screen?.querySelectorAll('.vs-section');
        if (sections?.[0]) {
            sections[0].style.display = '';
            const lbl = sections[0].querySelector('.vs-section-label');
            if (lbl) lbl.textContent = 'Your Hero';
            const disp = sections[0].querySelector('.vs-selection-display');
            if (disp) disp.style.display = 'none';
        }
        if (sections?.[1]) sections[1].style.display = 'none';

        // START button — host only
        const startBtn = document.getElementById('versus-start-btn');
        if (startBtn) {
            startBtn.style.display = this._isOnlineHost ? 'inline-block' : 'none';
            startBtn.textContent   = '▶ START';
            startBtn.onclick       = () => this.startOnlineGame();
        }

        // Hide CANCEL button — no backing out of online pre-game
        const cancelBtn = screen?.querySelector('.screen-back-btn');
        if (cancelBtn) cancelBtn.style.display = 'none';

        // Online info section
        document.getElementById('vs-online-info').style.display = 'flex';
        const modeBtns   = document.getElementById('vs-online-mode-btns');
        const guestLabel = document.getElementById('vs-online-guest-mode-label');
        if (this._isOnlineHost) {
            if (modeBtns)   modeBtns.style.display   = 'flex';
            if (guestLabel) guestLabel.style.display = 'none';
        } else {
            if (modeBtns)   modeBtns.style.display   = 'none';
            if (guestLabel) guestLabel.style.display = 'block';
        }

        this._updateOnlinePartnerDisplay();
        this._updateOnlineModeDisplay();

        // Render hero grid pre-selected on my hero
        this.opponent = this._onlineMyHero;
        this.renderOpponents();

        // Controller focus on my hero
        this.currentRow = 0;
        this.colIndex   = Math.max(0, this.heroIds.indexOf(this._onlineMyHero));
        this.updateFocus();

        this.isOpen = true;
        if (this.inputLoopId) cancelAnimationFrame(this.inputLoopId);
        this.inputLoopId = requestAnimationFrame(() => this.inputLoop());
    }

    selectOnlineMode(mode) {
        if (!this._isOnlineHost) return;
        this._onlineMode = mode;
        this._updateOnlineModeDisplay();
        window.networkManager?.selectMode(mode);
        // Keep controller col in sync with the selected mode button
        if (this.currentRow === 1) {
            const modes = ['NORMAL', 'STORY', 'SHUFFLE', 'VERSUS'];
            this.colIndex = Math.max(0, modes.indexOf(mode));
        }
    }

    startOnlineGame() {
        if (!this._isOnlineHost) return;
        window.networkManager?.startOnlineMatch(this._onlineMode);
    }

    _updateOnlinePartnerDisplay() {
        const emoji = (typeof _HERO_EMOJI !== 'undefined' ? _HERO_EMOJI[this._onlinePartnerHero] : null)
            || BASE_HERO_STATS?.[this._onlinePartnerHero]?.icon || '?';
        const emojiEl = document.getElementById('vs-online-partner-emoji');
        const nameEl  = document.getElementById('vs-online-partner-name');
        if (emojiEl) emojiEl.textContent = emoji;
        if (nameEl)  nameEl.textContent  = this._onlinePartnerName || '—';
    }

    _updateOnlineModeDisplay() {
        const m = this._onlineMode;
        document.getElementById('vs-online-standard-btn')?.classList.toggle('ol-mode-selected', m === 'NORMAL');
        document.getElementById('vs-online-story-btn')?.classList.toggle('ol-mode-selected',    m === 'STORY');
        document.getElementById('vs-online-chaos-btn')?.classList.toggle('ol-mode-selected',    m === 'SHUFFLE');
        document.getElementById('vs-online-versus-btn')?.classList.toggle('ol-mode-selected',   m === 'VERSUS');
    }

    closeOnline() {
        if (this._onlineUnsubscribe) { this._onlineUnsubscribe.forEach(fn => fn()); this._onlineUnsubscribe = []; }

        // Restore defaults
        const screen = document.getElementById('versus-selection-screen');
        const eyebrow  = screen?.querySelector('.vs-eyebrow');
        const titleEl  = screen?.querySelector('.vs-title-text');
        const subtitle = screen?.querySelector('.vs-subtitle-text');
        if (eyebrow)  eyebrow.textContent  = '⚔ DUEL ARENA ⚔';
        if (titleEl)  titleEl.textContent  = 'CHALLENGER SELECT';
        if (subtitle) subtitle.textContent = 'Choose your opponent and step into the arena';

        const sections = screen?.querySelectorAll('.vs-section');
        if (sections?.[0]) {
            const lbl = sections[0].querySelector('.vs-section-label');
            if (lbl) lbl.textContent = 'Opponent';
            const disp = sections[0].querySelector('.vs-selection-display');
            if (disp) disp.style.display = '';
        }
        if (sections?.[1]) sections[1].style.display = '';

        const startBtn = document.getElementById('versus-start-btn');
        if (startBtn) { startBtn.textContent = '⚔ FIGHT'; startBtn.style.display = ''; startBtn.onclick = () => window.startVersusMatch?.(); }

        document.getElementById('vs-online-info').style.display = 'none';

        // Restore CANCEL button
        const cancelBtn = document.querySelector('#versus-selection-screen .screen-back-btn');
        if (cancelBtn) cancelBtn.style.display = '';

        this._isOnline     = false;
        this._isOnlineHost = false;
        this._onlineMode   = 'NORMAL';

        if (screen) screen.style.display = 'none';
        this.isOpen = false;
        if (this.inputLoopId) { cancelAnimationFrame(this.inputLoopId); this.inputLoopId = null; }
    }
}

const versusMenu = new VersusMenuUI();
window.openVersusMenu = () => versusMenu.open();
window.open2PVersusMenu = () => versusMenu.open2PVersus();
window.closeVersusMenu = () => versusMenu.close();
window.startVersusMatch = () => versusMenu.start();
