class OptionsUI {
    openOptions() {
        if (window.setUIState) window.setUIState('OPTIONS');
        const screen = document.getElementById('options-screen');
        if (screen) screen.style.display = 'flex';
        this.updateOptionButtons();
    }

    closeOptions() {
        if (window.setUIState) window.setUIState('MENU');
        const screen = document.getElementById('options-screen');
        if (screen) screen.style.display = 'none';
    }

    toggleOption(key) {
        if (typeof window.gameConfig === 'undefined') return;

        // toggleSetting is in Config.js
        if (typeof window.toggleSetting === 'function') {
            window.toggleSetting(key);
        } else {
            // Fallback if toggleSetting is explicitly local to game.js (unlikely for config)
            window.gameConfig[key] = !window.gameConfig[key];
            if (localStorage) {
                localStorage.setItem('5Freunde_Config', JSON.stringify(window.gameConfig));
            }
        }
        this.updateOptionButtons();
    }

    updateOptionButtons() {
        if (typeof window.gameConfig === 'undefined') return;

        const map = {
            'musicEnabled':            'opt-music-btn',
            'sfxEnabled':              'opt-sfx-btn',
            'damageNumbers':           'opt-dmg-btn',
            'screenShake':             'opt-shake-btn',
            'controllerVibration':     'opt-vibration-btn',
            'showIntroScreens':        'opt-intro-btn',
            'subtitlesEnabled':        'opt-subtitles-btn',
            'reducedMotion':           'opt-reduced-motion-btn',
            'crashReportsEnabled':     'opt-crash-btn',
            'cloudSaveEnabled':        'opt-cloud-btn',
            'highContrast':            'opt-highcontrast-btn',
            'screenReaderHints':       'opt-screenreader-btn',
            'holdToFireToggle':        'opt-holdtofire-btn',
            'pauseOnFocusLoss':        'opt-pausefocus-btn',
            'pauseOnGamepadDisconnect': 'opt-pausegamepad-btn'
        };

        for (let k in map) {
            const btn = document.getElementById(map[k]);
            if (btn) {
                const isActive = window.gameConfig[k];
                btn.innerText = isActive ? "ON" : "OFF";
                btn.className = isActive ? "opt-toggle-btn active" : "opt-toggle-btn";
            }
        }

        // Colorblind cycles through 4 modes — render label rather than ON/OFF
        const cbBtn = document.getElementById('opt-colorblind-btn');
        if (cbBtn) {
            const mode = window.gameConfig.colorblindMode || 'off';
            const labels = { off: 'OFF', deuteranopia: 'DEUTAN', protanopia: 'PROTAN', tritanopia: 'TRITAN' };
            cbBtn.innerText = labels[mode] || 'OFF';
            cbBtn.className = (mode === 'off') ? 'opt-toggle-btn' : 'opt-toggle-btn active';
        }

        // Font scale: cycle through preset sizes — render label.
        const fontBtn = document.getElementById('opt-fontscale-btn');
        if (fontBtn) {
            const scale = Number(window.gameConfig.fontScale) || 1.0;
            const labels = [
                { v: 0.8,  label: 'SMALL' },
                { v: 1.0,  label: 'NORMAL' },
                { v: 1.25, label: 'LARGE' },
                { v: 1.5,  label: 'X-LARGE' }
            ];
            const match = labels.find(l => Math.abs(l.v - scale) < 0.01) || labels[1];
            fontBtn.innerText = match.label;
            fontBtn.className = (Math.abs(match.v - 1.0) < 0.01) ? 'opt-toggle-btn' : 'opt-toggle-btn active';
        }

        // Aim assist: percent label.
        const aimBtn = document.getElementById('opt-aimassist-btn');
        if (aimBtn) {
            const pct = Math.round((Number(window.gameConfig.aimAssist) || 0) * 100);
            aimBtn.innerText = pct === 0 ? 'OFF' : `${pct}%`;
            aimBtn.className = (pct === 0) ? 'opt-toggle-btn' : 'opt-toggle-btn active';
        }

        // One-handed scheme: label.
        const oneHandBtn = document.getElementById('opt-onehand-btn');
        if (oneHandBtn) {
            const scheme = window.gameConfig.oneHandedScheme || 'off';
            const labels = { off: 'OFF', leftHand: 'LEFT', rightHand: 'RIGHT' };
            oneHandBtn.innerText = labels[scheme] || 'OFF';
            oneHandBtn.className = (scheme === 'off') ? 'opt-toggle-btn' : 'opt-toggle-btn active';
        }

        this._updateCloudAccountRow();
    }

    cycleColorblindMode() {
        if (typeof window.gameConfig === 'undefined') return;
        const order = ['off', 'deuteranopia', 'protanopia', 'tritanopia'];
        const cur = window.gameConfig.colorblindMode || 'off';
        const next = order[(order.indexOf(cur) + 1) % order.length];
        window.gameConfig.colorblindMode = next;
        if (typeof saveConfig === 'function') saveConfig();
        this.updateOptionButtons();
    }

    cycleFontScale() {
        if (typeof window.gameConfig === 'undefined') return;
        const order = [0.8, 1.0, 1.25, 1.5];
        const cur = Number(window.gameConfig.fontScale) || 1.0;
        let idx = order.findIndex(v => Math.abs(v - cur) < 0.01);
        if (idx < 0) idx = 1;
        window.gameConfig.fontScale = order[(idx + 1) % order.length];
        if (typeof saveConfig === 'function') saveConfig();
        this.updateOptionButtons();
    }

    cycleAimAssist() {
        if (typeof window.gameConfig === 'undefined') return;
        const order = [0, 0.25, 0.5, 0.75, 1.0];
        const cur = Number(window.gameConfig.aimAssist) || 0;
        let idx = order.findIndex(v => Math.abs(v - cur) < 0.01);
        if (idx < 0) idx = 0;
        window.gameConfig.aimAssist = order[(idx + 1) % order.length];
        if (typeof saveConfig === 'function') saveConfig();
        this.updateOptionButtons();
    }

    cycleOneHandedScheme() {
        if (typeof window.gameConfig === 'undefined') return;
        const order = ['off', 'leftHand', 'rightHand'];
        const cur = window.gameConfig.oneHandedScheme || 'off';
        const next = order[(order.indexOf(cur) + 1) % order.length];
        if (typeof window.applyOneHandedScheme === 'function') {
            window.applyOneHandedScheme(next);
        } else {
            window.gameConfig.oneHandedScheme = next;
            if (typeof saveConfig === 'function') saveConfig();
        }
        this.updateOptionButtons();
        // Rebuild remap rows in case modal is open.
        if (typeof this.renderRemapRows === 'function') this.renderRemapRows();
    }

    openRemap() {
        const modal = document.getElementById('remap-modal');
        if (!modal) return;
        modal.style.display = 'flex';
        this.renderRemapRows();
    }

    closeRemap() {
        const modal = document.getElementById('remap-modal');
        if (modal) modal.style.display = 'none';
        if (window.inputManager && window.inputManager._remapAction) {
            window.inputManager.cancelRemap();
        }
    }

    renderRemapRows() {
        const list = document.getElementById('remap-list');
        if (!list) return;
        const cfg = window.gameConfig || {};
        const bindings = cfg.keyBindings || {};
        const ACTIONS = [
            { id: 'moveUp',    label: 'Move Up' },
            { id: 'moveDown',  label: 'Move Down' },
            { id: 'moveLeft',  label: 'Move Left' },
            { id: 'moveRight', label: 'Move Right' },
            { id: 'shoot',     label: 'Shoot (key)' },
            { id: 'melee',     label: 'Melee' },
            { id: 'dash',      label: 'Dash' },
            { id: 'special',   label: 'Special' },
            { id: 'pause',     label: 'Pause' }
        ];
        list.innerHTML = '';
        for (const a of ACTIONS) {
            const row = document.createElement('div');
            row.className = 'options-row';
            const labelKeys = (bindings[a.id] || []).map(k => k === ' ' ? 'Space' : k.toUpperCase()).join(' / ') || '—';
            row.innerHTML = `
                <div class="options-row-left">
                    <span class="options-icon">⌨</span>
                    <span class="options-label">${a.label}</span>
                </div>
                <button class="opt-toggle-btn" data-action="${a.id}">${labelKeys}</button>
            `;
            const btn = row.querySelector('button');
            btn.addEventListener('click', () => {
                btn.innerText = 'PRESS KEY...';
                btn.classList.add('active');
                window.inputManager.beginRemap(a.id, () => {
                    this.renderRemapRows();
                });
            });
            list.appendChild(row);
        }
    }

    announce(message) {
        if (!window.gameConfig || !window.gameConfig.screenReaderHints) return;
        let live = document.getElementById('a11y-live-region');
        if (!live) {
            live = document.createElement('div');
            live.id = 'a11y-live-region';
            live.setAttribute('aria-live', 'polite');
            live.setAttribute('aria-atomic', 'true');
            live.style.cssText = 'position:absolute; left:-10000px; width:1px; height:1px; overflow:hidden;';
            document.body.appendChild(live);
        }
        live.textContent = '';
        // Force reflow before re-setting so SR re-announces on repeats.
        void live.offsetWidth;
        live.textContent = message;
    }

    _updateCloudAccountRow() {
        const hostLabel = document.getElementById('opt-server-host-label');
        if (hostLabel) {
            hostLabel.textContent = (typeof CloudSaveManager !== 'undefined')
                ? CloudSaveManager._displayHost()
                : (window.gameConfig?.serverUrl || 'localhost');
        }

        const label = document.getElementById('cloud-account-label');
        const btn   = document.getElementById('opt-cloud-account-btn');
        const account = window.gameConfig?.account || {};

        const loggedIn = !!(account.username && account.token);

        if (loggedIn) {
            if (label) label.textContent = `${account.username}`;
            if (btn) {
                btn.textContent = 'LOGOUT';
                btn.onclick = () => {
                    if (typeof CloudSaveManager !== 'undefined') CloudSaveManager.logout();
                };
            }
        } else {
            if (label) label.textContent = 'Not signed in';
            if (btn) {
                btn.textContent = 'LOGIN';
                btn.onclick = () => {
                    if (typeof CloudSaveManager !== 'undefined') CloudSaveManager.showLoginModal();
                };
            }
        }

        // Cloud Sync toggle only makes sense when logged in
        const cloudSection = document.getElementById('opt-cloud-section');
        if (cloudSection) cloudSection.style.display = loggedIn ? '' : 'none';
    }
}

const optionsUI = new OptionsUI();
window.openOptions = () => optionsUI.openOptions();
window.closeOptions = () => optionsUI.closeOptions();
window.toggleOption = (key) => optionsUI.toggleOption(key);
window.updateOptionButtons = () => optionsUI.updateOptionButtons();
window.cycleColorblindMode = () => optionsUI.cycleColorblindMode();
window.cycleFontScale = () => optionsUI.cycleFontScale();
window.cycleAimAssist = () => optionsUI.cycleAimAssist();
window.cycleOneHandedScheme = () => optionsUI.cycleOneHandedScheme();
window.openRemap = () => optionsUI.openRemap();
window.closeRemap = () => optionsUI.closeRemap();
window.a11yAnnounce = (msg) => optionsUI.announce(msg);

window.showQuitWarning = function () {
    const el = document.getElementById('quit-run-warning');
    if (el) el.style.opacity = 1;
};

window.hideQuitWarning = function () {
    const el = document.getElementById('quit-run-warning');
    if (el) el.style.opacity = 0;
};

export { OptionsUI, optionsUI };
export default optionsUI;
