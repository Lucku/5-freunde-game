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
            'musicEnabled':        'opt-music-btn',
            'sfxEnabled':          'opt-sfx-btn',
            'damageNumbers':       'opt-dmg-btn',
            'screenShake':         'opt-shake-btn',
            'controllerVibration': 'opt-vibration-btn',
            'showIntroScreens':    'opt-intro-btn',
            'subtitlesEnabled':    'opt-subtitles-btn',
            'cloudSaveEnabled':    'opt-cloud-btn'
        };

        for (let k in map) {
            const btn = document.getElementById(map[k]);
            if (btn) {
                const isActive = window.gameConfig[k];
                btn.innerText = isActive ? "ON" : "OFF";
                btn.className = isActive ? "opt-toggle-btn active" : "opt-toggle-btn";
            }
        }

        this._updateCloudAccountRow();
    }

    _updateCloudAccountRow() {
        const row = document.getElementById('cloud-account-row');
        const label = document.getElementById('cloud-account-label');
        const btn = document.getElementById('opt-cloud-account-btn');
        if (!row) return;

        const cloudEnabled = window.gameConfig.cloudSaveEnabled;
        row.style.display = cloudEnabled ? 'flex' : 'none';
        if (!cloudEnabled) return;

        const cfg = window.gameConfig.cloudSave || {};
        if (cfg.username && cfg.token) {
            if (label) label.textContent = `Logged in: ${cfg.username}`;
            if (btn) {
                btn.textContent = 'LOGOUT';
                btn.onclick = () => {
                    if (typeof CloudSaveManager !== 'undefined') CloudSaveManager.logout();
                };
            }
        } else {
            if (label) label.textContent = 'Not logged in';
            if (btn) {
                btn.textContent = 'LOGIN';
                btn.onclick = () => {
                    if (typeof CloudSaveManager !== 'undefined') CloudSaveManager.showLoginModal();
                };
            }
        }
    }
}

const optionsUI = new OptionsUI();
window.openOptions = () => optionsUI.openOptions();
window.closeOptions = () => optionsUI.closeOptions();
window.toggleOption = (key) => optionsUI.toggleOption(key);
window.updateOptionButtons = () => optionsUI.updateOptionButtons();

window.showQuitWarning = function () {
    const el = document.getElementById('quit-run-warning');
    if (el) el.style.opacity = 1;
};

window.hideQuitWarning = function () {
    const el = document.getElementById('quit-run-warning');
    if (el) el.style.opacity = 0;
};
