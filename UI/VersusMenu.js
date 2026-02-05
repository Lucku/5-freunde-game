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

    open() {
        const screen = document.getElementById('versus-selection-screen');
        if (screen) screen.style.display = 'flex';
        this.isOpen = true;

        this.renderOpponents();
        this.renderBiomes();

        // Highlight current selection visually for controller users
        this.updateFocus();

        if (!this.inputLoopId) {
            this.inputLoopId = requestAnimationFrame(() => this.inputLoop());
        }
    }

    close() {
        const screen = document.getElementById('versus-selection-screen');
        if (screen) screen.style.display = 'none';
        this.isOpen = false;
        if (this.inputLoopId) {
            cancelAnimationFrame(this.inputLoopId);
            this.inputLoopId = null;
        }
    }

    renderOpponents() {
        const grid = document.getElementById('versus-opponent-grid');
        if (!grid) return;
        grid.innerHTML = '';

        // Base Heroes + DLC (Dynamically fetched)
        // Ensure we catch all heroes by iterating BASE_HERO_STATS
        this.heroIds = ['random', ...Object.keys(BASE_HERO_STATS).filter(h => h !== 'black')];

        this.heroIds.forEach((h, index) => {
            const isRandom = (h === 'random');
            const color = isRandom ? '#fff' : (BASE_HERO_STATS[h].color || '#fff');

            let iconContent;
            if (isRandom) {
                iconContent = `<div style="font-size:30px;">?</div>`;
            } else {
                // Use MainMenu Style Icons with background wrapper
                let innerContent;
                if (BASE_HERO_STATS[h].icon) {
                    innerContent = `<div style="font-size: 30px; line-height: 50px;">${BASE_HERO_STATS[h].icon}</div>`;
                } else {
                    innerContent = `
                        <div style="width: 60%; height: 30%; background: rgba(0,0,0,0.5); border-radius: 0 0 50% 50%; margin-top: -10%;"></div>
                        <div style="position:absolute; top:5px; right:5px; font-size:10px;">${h[0].toUpperCase()}</div>
                    `;
                }

                iconContent = `
                    <div class="hero-icon" style="background: ${color}; width: 60px; height: 60px; border-radius: 5px; position: relative; display: flex; justify-content: center; align-items: center; border: 2px solid rgba(255,255,255,0.2);">
                        ${innerContent}
                    </div>
                 `;
            }

            this.createOption(grid, h, iconContent, color, () => this.selectOpponent(h), false, 'opp-opt-' + index);
        });
    }

    renderBiomes() {
        const grid = document.getElementById('versus-biome-grid');
        if (!grid) return;
        grid.innerHTML = '';

        // List of biomes
        const biomes = [
            { id: 'random', name: 'Random Map' },
            { id: 'fire', name: 'Volcano' },
            { id: 'water', name: 'Ocean' },
            { id: 'ice', name: 'Tundra' },
            { id: 'plant', name: 'Forest' },
            { id: 'metal', name: 'Factory' },
            { id: 'rock', name: 'Canyon' }, // DLC
            { id: 'cloud', name: 'Sky' }, // DLC
            { id: 'chaos', name: 'Void' } // DLC
        ];

        this.biomeIds = biomes; // Cache for navigation

        biomes.forEach((b, index) => {
            this.createOption(grid, b.id, b.name, '#ddd', () => this.selectBiome(b.id), true, 'bio-opt-' + index);
        });
    }

    createOption(container, id, content, color, onClick, isText, domId) {
        const el = document.createElement('div');
        el.id = domId;
        el.className = 'versus-opt'; // Marker class
        el.style.border = '2px solid #555';
        el.style.borderRadius = '5px';
        el.style.cursor = 'pointer';
        el.style.display = 'flex';
        el.style.justifyContent = 'center';
        el.style.alignItems = 'center';
        el.style.background = 'rgba(0,0,0,0.5)';
        el.style.position = 'relative'; // For absolute positioning inside
        el.dataset.id = id;

        if (isText) {
            el.innerText = content;
            el.style.padding = '10px';
            el.style.fontSize = '16px';
        } else {
            el.innerHTML = content;
            el.style.height = '80px';
        }
        el.style.color = color;
        el.style.borderColor = color;

        el.onclick = () => {
            // Visual update handled by updateFocus or selectOpponent
            onClick();
            this.updateSelectionVisuals(container, el);
        };

        container.appendChild(el);
    }

    updateSelectionVisuals(container, selectedEl) {
        Array.from(container.children).forEach(c => {
            c.style.background = 'rgba(0,0,0,0.5)';
            c.style.transform = 'scale(1)';
        });
        if (selectedEl) {
            selectedEl.style.background = 'rgba(255,255,255,0.2)';
            selectedEl.style.transform = 'scale(1.05)';
        }
    }

    selectOpponent(id, fromFocus = false) {
        this.opponent = id;
        const disp = document.getElementById('versus-selected-opponent');
        if (disp) {
            disp.innerText = id.toUpperCase();
            if (id !== 'random' && BASE_HERO_STATS[id]) {
                disp.style.color = BASE_HERO_STATS[id].color;
            } else {
                disp.style.color = '#f1c40f';
            }
        }

        // Sync nav index if clicked by mouse AND not triggered by focus update
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
        const disp = document.getElementById('versus-selected-biome');
        if (disp) disp.innerText = id.toUpperCase();

        // Sync nav index if clicked by mouse
        if (!fromFocus && this.biomeIds) {
            const idx = this.biomeIds.findIndex(b => b.id === id);
            if (idx !== -1) {
                this.currentRow = 1;
                this.colIndex = idx;
                this.updateFocus();
            }
        }
    }

    start() {
        let op = this.opponent;
        if (op === 'random') {
            const heroes = Object.keys(BASE_HERO_STATS).filter(h => h !== 'black');
            op = heroes[Math.floor(Math.random() * heroes.length)];
        }

        let bio = this.biome;

        // Save selection to global window for startGame to pick up
        window.selectedOpponent = op;
        window.selectedBiome = bio;

        this.close();

        // Start the game in VERSUS mode
        if (typeof startGame === 'function') startGame('VERSUS');
    }

    // --- CONTROLLER LOGIC ---
    inputLoop() {
        if (!this.isOpen) return;

        const pads = navigator.getGamepads ? navigator.getGamepads() : [];
        const gp = pads[0]; // Assuming P1

        if (gp) {
            const now = Date.now();
            if (now - this.inputDebounce > 150) {
                // Navigation
                let moved = false;

                // Axis 0: Left Stick X, Axis 1: Left Stick Y
                // D-Pad usually mapped to buttons 12, 13, 14, 15 (Up, Down, Left, Right)

                const left = (gp.axes[0] < -0.5) || gp.buttons[14].pressed;
                const right = (gp.axes[0] > 0.5) || gp.buttons[15].pressed;
                const up = (gp.axes[1] < -0.5) || gp.buttons[12].pressed;
                const down = (gp.axes[1] > 0.5) || gp.buttons[13].pressed;

                if (left) {
                    this.colIndex--;
                    moved = true;
                }
                if (right) {
                    this.colIndex++;
                    moved = true;
                }

                if (moved) {
                    // Wrap or clamp columns
                    let maxCols = 0;
                    if (this.currentRow === 0) maxCols = this.heroIds.length;
                    else if (this.currentRow === 1) maxCols = this.biomeIds.length;
                    else maxCols = 1; // Start button

                    if (this.colIndex < 0) this.colIndex = maxCols - 1;
                    if (this.colIndex >= maxCols) this.colIndex = 0;

                    this.updateFocus();
                    this.inputDebounce = now;
                }

                if (up || down) {
                    if (up) this.currentRow--;
                    if (down) this.currentRow++;

                    if (this.currentRow < 0) this.currentRow = 2;
                    if (this.currentRow > 2) this.currentRow = 0;

                    // Reset or clamp Col Index for new row
                    let maxCols = 0;
                    if (this.currentRow === 0) maxCols = this.heroIds.length;
                    else if (this.currentRow === 1) maxCols = this.biomeIds.length;
                    else maxCols = 1;

                    if (this.colIndex >= maxCols) this.colIndex = maxCols - 1;

                    this.updateFocus();
                    this.inputDebounce = now;
                }

                // Selection (A / Cross = Button 0)
                if (gp.buttons[0].pressed) {
                    this.triggerSelection();
                    this.inputDebounce = now + 200; // Longer debounce for action
                }

                // Back (B / Circle = Button 1)
                if (gp.buttons[1].pressed) {
                    this.close();
                    this.inputDebounce = now + 200;
                }
            }
        }

        requestAnimationFrame(() => this.inputLoop());
    }

    updateFocus() {
        // Clear all focus rings
        document.querySelectorAll('.versus-opt').forEach(el => el.style.boxShadow = 'none');
        const startBtn = document.getElementById('versus-start-btn');
        if (startBtn) startBtn.style.boxShadow = 'none';

        if (this.currentRow === 0) {
            const el = document.getElementById('opp-opt-' + this.colIndex);
            if (el) {
                el.style.boxShadow = '0 0 10px 2px #3498db';
                // Trigger selection only on explicit confirm or just highlight?
                // For Hero/Biome we can auto-select on hover
                const id = this.heroIds[this.colIndex];
                if (id) this.selectOpponent(id, true);
            }
        } else if (this.currentRow === 1) {
            const el = document.getElementById('bio-opt-' + this.colIndex);
            if (el) {
                el.style.boxShadow = '0 0 10px 2px #3498db';
                const item = this.biomeIds[this.colIndex];
                if (item) this.selectBiome(item.id, true);
            }
        } else if (this.currentRow === 2) {
            if (startBtn) startBtn.style.boxShadow = '0 0 10px 2px #e74c3c';
        }
    }

    triggerSelection() {
        if (this.currentRow === 0) {
            // Already selected by focus
        } else if (this.currentRow === 1) {
            // Already selected by focus
        } else if (this.currentRow === 2) {
            this.start();
        }
    }
}

const versusMenu = new VersusMenuUI();
window.openVersusMenu = () => versusMenu.open();
window.closeVersusMenu = () => versusMenu.close();
window.startVersusMatch = () => versusMenu.start();
