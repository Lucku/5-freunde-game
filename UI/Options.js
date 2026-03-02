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
            'musicEnabled': 'opt-music-btn',
            'sfxEnabled': 'opt-sfx-btn',
            'damageNumbers': 'opt-dmg-btn',
            'screenShake': 'opt-shake-btn'
        };

        for (let k in map) {
            const btn = document.getElementById(map[k]);
            if (btn) {
                const isActive = window.gameConfig[k];
                btn.innerText = isActive ? "ON" : "OFF";
                btn.className = isActive ? "opt-toggle-btn active" : "opt-toggle-btn";
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
