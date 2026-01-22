class MainMenuUI {
    renderHeroSelect() {
        const container = document.getElementById('hero-select-container');
        if (!container) return;
        container.innerHTML = '';

        // Dynamically get heroes from BASE_HERO_STATS
        // Filter out 'black' if it's meant to be hidden or handled separately
        const heroes = Object.keys(BASE_HERO_STATS).filter(h => h !== 'black');

        heroes.forEach(h => {
            // Ensure save data exists
            if (!window.saveData[h]) {
                window.saveData[h] = { level: 0, unlocked: 0, highScore: 0, prestige: 0 };
                if (h === 'earth') window.saveData[h].unlocked = 1;
            }

            const data = window.saveData[h];
            const el = document.createElement('div');
            el.className = 'hero-card';
            if (h === (window.selectedHeroType || 'fire')) el.style.borderColor = 'white';

            let prestigeText = "";
            if (data.prestige > 0) {
                prestigeText = `<div class="hero-prestige">Hard Mode ${data.prestige}</div>`;
            }

            el.innerHTML = `
                <div class="hero-icon" style="background: ${BASE_HERO_STATS[h].color}; position: relative; display: flex; justify-content: center; align-items: center;">
                    <div style="width: 60%; height: 30%; background: rgba(0,0,0,0.5); border-radius: 0 0 50% 50%; margin-top: -10%;"></div>
                </div>
                <div class="hero-name" style="color: ${BASE_HERO_STATS[h].color}">${h.toUpperCase()}</div>
                <div class="hero-stats">High Score: ${data.highScore}</div>
                ${prestigeText}
            `;
            el.onclick = () => {
                window.selectedHeroType = h;
                this.renderHeroSelect();
            };
            container.appendChild(el);
        });
        this.updateStoryButton();
    }

    updateStoryButton() {
        const btn = document.querySelector('.btn-story');
        if (!btn) return;

        let title = "Story Mode";
        if (typeof window.DLC_REGISTRY !== 'undefined' && window.DLC_REGISTRY) {
            for (const key in window.DLC_REGISTRY) {
                const dlc = window.DLC_REGISTRY[key];
                if (dlc && dlc.hero === (window.selectedHeroType || 'fire') && dlc.name) {
                    title = dlc.name;
                    break;
                }
            }
        }
        btn.innerText = title;
    }
}

const mainMenuUI = new MainMenuUI();
window.renderHeroSelect = () => mainMenuUI.renderHeroSelect();
window.updateStoryButton = () => mainMenuUI.updateStoryButton();
