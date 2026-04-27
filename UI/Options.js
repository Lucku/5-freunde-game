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
        const urlInput = document.getElementById('opt-server-url');
        if (urlInput && document.activeElement !== urlInput) {
            urlInput.value = window.gameConfig?.serverUrl || 'http://localhost:3001';
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

window.showQuitWarning = function () {
    const el = document.getElementById('quit-run-warning');
    if (el) el.style.opacity = 1;
};

window.hideQuitWarning = function () {
    const el = document.getElementById('quit-run-warning');
    if (el) el.style.opacity = 0;
};
