const BIOME_META = {
    random: { name: 'Random',  rgb: '180,180,180' },
    fire:   { name: 'Volcano', rgb: '231,76,60'   },
    water:  { name: 'Ocean',   rgb: '52,152,219'  },
    ice:    { name: 'Tundra',  rgb: '200,220,240' },
    plant:  { name: 'Forest',  rgb: '46,204,113'  },
    metal:  { name: 'Factory', rgb: '149,165,166' },
    rock:   { name: 'Canyon',  rgb: '180,120,60'  },
    cloud:  { name: 'Sky',     rgb: '64,224,208'  },
    chaos:  { name: 'Void',    rgb: '155,89,182'  },
    sound:  { name: 'Harmonic', rgb: '129,212,250' },
    poison: { name: 'Bog',      rgb: '139,195,74'  },
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

        if (!this.inputLoopId) {
            this.inputLoopId = requestAnimationFrame(() => this.inputLoop());
        }
    }

    renderOpponents() {
        const grid = document.getElementById('versus-opponent-grid');
        if (!grid) return;
        grid.innerHTML = '';

        const loveUnlocked = typeof saveData !== 'undefined' && saveData['love'] && saveData['love'].unlocked;
        this.heroIds = ['random', ...Object.keys(BASE_HERO_STATS).filter(h => {
            if (h === 'black') return false;
            if (h === 'love' && !loveUnlocked) return false;
            return true;
        })];

        this.heroIds.forEach((h, index) => {
            const isRandom = (h === 'random');
            const color = isRandom ? '#aaaaaa' : (BASE_HERO_STATS[h]?.color || '#ffffff');
            const rgb = this._hexRgb(color);
            const label = isRandom ? 'Random' : h.charAt(0).toUpperCase() + h.slice(1);

            const card = document.createElement('div');
            card.id = 'opp-opt-' + index;
            card.className = 'vs-hero-card' + (h === this.opponent ? ' selected' : '');
            card.style.setProperty('--hero-rgb', rgb);
            card.dataset.id = h;

            let helmetInner;
            if (isRandom) {
                helmetInner = `<span style="font-size:22px; line-height:1;">?</span>`;
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

        const biomes = [
            { id: 'random' }, { id: 'fire' },  { id: 'water' },
            { id: 'ice' },    { id: 'plant' }, { id: 'metal' },
            { id: 'rock' },   { id: 'cloud' }, { id: 'chaos' },
            { id: 'sound' },  { id: 'poison' },
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

        if (!this.inputLoopId) {
            this.inputLoopId = requestAnimationFrame(() => this.inputLoop());
        }
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
            const heroes = Object.keys(BASE_HERO_STATS).filter(h => h !== 'black' && (h !== 'love' || loveOk));
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
        const gp = pads[0];

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
                                  : this.currentRow === 1 ? this.biomeIds.length : 1;
                    if (this.colIndex < 0) this.colIndex = maxCols - 1;
                    if (this.colIndex >= maxCols) this.colIndex = 0;
                    this.updateFocus();
                    this.inputDebounce = now;
                }

                if (up || down) {
                    if (up)   this.currentRow--;
                    if (down) this.currentRow++;
                    if (this.currentRow < 0) this.currentRow = 2;
                    if (this.currentRow > 2) this.currentRow = 0;

                    const maxCols = this.currentRow === 0 ? this.heroIds.length
                                  : this.currentRow === 1 ? this.biomeIds.length : 1;
                    if (this.colIndex >= maxCols) this.colIndex = maxCols - 1;
                    this.updateFocus();
                    this.inputDebounce = now;
                }

                if (gp.buttons[0].pressed) {
                    this.triggerSelection();
                    this.inputDebounce = now + 200;
                }
                if (gp.buttons[1].pressed) {
                    this.close();
                    this.inputDebounce = now + 200;
                }
            }
        }

        requestAnimationFrame(() => this.inputLoop());
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
            const el = document.getElementById('bio-opt-' + this.colIndex);
            if (el) {
                el.classList.add('controller-focus');
                const item = this.biomeIds[this.colIndex];
                if (item) this.selectBiome(item.id, true);
            }
        } else if (this.currentRow === 2) {
            const startBtn = document.getElementById('versus-start-btn');
            if (startBtn) startBtn.classList.add('controller-focus');
        }
    }

    triggerSelection() {
        if (this.currentRow === 2) this.start();
    }
}

const versusMenu = new VersusMenuUI();
window.openVersusMenu = () => versusMenu.open();
window.open2PVersusMenu = () => versusMenu.open2PVersus();
window.closeVersusMenu = () => versusMenu.close();
window.startVersusMatch = () => versusMenu.start();
