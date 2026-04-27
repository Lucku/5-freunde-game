class UIManager {
    constructor() {
        this.uiState = 'MENU';
        this.uiSelectionIndex = 0;
        this.uiDebounce = 0;
    }

    setUIState(newState) {
        this.uiState = newState;
        this.uiSelectionIndex = 0;
        this.uiDebounce = 20; // Delay to prevent instant input
        this.updateUIHighlight();
        console.log("UI State:", this.uiState);
    }

    getFocusables() {
        let screenId = '';
        if (this.uiState === 'MENU') screenId = 'start-screen';
        else if (this.uiState === 'LEVELUP') screenId = 'levelup-screen';
        else if (this.uiState === 'SHOP') screenId = 'shop-screen';
        else if (this.uiState === 'PERMSHOP') screenId = 'perm-shop-screen';
        else if (this.uiState === 'PAUSE') screenId = 'pause-screen';
        else if (this.uiState === 'GAMEOVER') screenId = 'game-over-screen';
        else if (this.uiState === 'VICTORY')  screenId = 'victory-screen';
        else if (this.uiState === 'ACHIEVEMENTS') screenId = 'achievements-screen';
        else if (this.uiState === 'HIGHSCORE') screenId = 'highscore-screen';
        else if (this.uiState === 'SKILLTREE') screenId = 'skill-tree-screen';
        else if (this.uiState === 'STATS') screenId = 'stats-screen';
        else if (this.uiState === 'COLLECTION') screenId = 'collection-screen';
        else if (this.uiState === 'STORY') screenId = 'story-screen';
        else if (this.uiState === 'DAILY_INFO') screenId = 'daily-info-modal';
        else if (this.uiState === 'ALTAR') screenId = 'altar-screen';
        else if (this.uiState === 'CHAOSSHOP') screenId = 'chaos-shop-screen';
        else if (this.uiState === 'TUTORIAL') screenId = 'tutorial-screen';
        else if (this.uiState === 'COMPLETION') screenId = 'completion-screen';
        else if (this.uiState === 'DLC') screenId = 'dlc-screen';
        else if (this.uiState === 'OPTIONS') screenId = 'options-screen';
        else if (this.uiState === 'INFO_DIALOGUE') screenId = 'info-dialogue-screen';
        else if (this.uiState === 'ONLINE_LOBBY')  screenId = 'online-lobby-screen';
        else if (this.uiState === 'SIGN_IN') screenId = 'cloud-login-modal';

        if (!screenId) return [];
        const screen = document.getElementById(screenId);
        if (!screen) return [];

        // For text-entry modals and options, inputs are also navigable so the gamepad can reach them
        const inputStates = ['SIGN_IN', 'OPTIONS'];
        const inputSelector = inputStates.includes(this.uiState)
            ? ', input[type="text"], input[type="password"], input[type="url"]'
            : '';

        const elements = Array.from(screen.querySelectorAll(
            'button, .hero-card, .upgrade-card, .shop-item, .skill-node,' +
            '.collection-card, .coll-set,' +
            '.switch, .altar-node, .altar-pill, .altar-rune, .altar-conv-item,' +
            '.achievement-row, .stat-row, .summary-card, .dlc-card' + inputSelector
        ));
        return elements.filter(el => el.offsetParent !== null && !el.classList.contains('coop-disabled'));
    }

    updateUIHighlight() {
        if (this.uiState === 'GAME') return;

        const focusables = this.getFocusables();
        // Remove selected class from all
        document.querySelectorAll('.selected').forEach(el => el.classList.remove('selected'));

        // Check InputManager for lastInputType
        // We assume `window.inputManager` exists or we check `window.keys` (legacy hack)
        // Ideally we pass inputManager in constructor, but let's check strict global
        if (typeof inputManager !== 'undefined' && inputManager.lastInputType !== 'GAMEPAD') return;

        if (focusables.length > 0) {
            // Auto-select first available node in Skill Tree if at start
            if (this.uiState === 'SKILLTREE' && this.uiSelectionIndex === 0) {
                const firstAvailable = focusables.findIndex(el => el.classList.contains('available'));
                if (firstAvailable !== -1) this.uiSelectionIndex = firstAvailable;
            }

            // Clamp index
            if (this.uiSelectionIndex >= focusables.length) this.uiSelectionIndex = 0;
            if (this.uiSelectionIndex < 0) this.uiSelectionIndex = focusables.length - 1;

            const el = focusables[this.uiSelectionIndex];
            el.classList.add('selected');

            const scrollableStates = ['MENU', 'ACHIEVEMENTS', 'SKILLTREE', 'SHOP', 'PERMSHOP', 'COLLECTION', 'HIGHSCORE', 'ALTAR', 'COMPLETION', 'STATS', 'CHAOSSHOP', 'TUTORIAL', 'DAILY_INFO', 'OPTIONS', 'DLC', 'INFO_DIALOGUE'];
            if (scrollableStates.includes(this.uiState)) {
                el.scrollIntoView({ behavior: 'smooth', block: 'center', inline: 'nearest' });
            }
        }
    }
}
