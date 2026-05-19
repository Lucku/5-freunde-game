import { CompletionMenu } from '../CompletionMenu.js';

class CompletionUI {
    open() {
        document.getElementById('menu-overlay').style.display = 'none';
        document.getElementById('completion-screen').style.display = 'flex';
        window.completionMenu = new CompletionMenu();
        window.completionMenu.resetFilter();
        const btn = document.getElementById('completion-filter-btn');
        if (btn) { btn.textContent = '◻ Hide Completed: OFF'; btn.classList.remove('active'); }
        window.completionMenu.render();
        if (window.setUIState) window.setUIState('COMPLETION');
    }

    close() {
        document.getElementById('completion-screen').style.display = 'none';
        if (window.initMenu) window.initMenu();
    }
}

const completionUI = new CompletionUI();

window.openCompletion = () => completionUI.open();
window.closeCompletion = () => completionUI.close();

export { CompletionUI, completionUI };
export default completionUI;
