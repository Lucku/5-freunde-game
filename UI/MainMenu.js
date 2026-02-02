class MainMenuUI {
    constructor() {
        this.heroSelectionExpanded = false;
    }

    renderHeroSelect() {
        const container = document.getElementById('hero-select-container');
        if (!container) return;
        container.innerHTML = '';

        // Dynamically get heroes from BASE_HERO_STATS
        // Filter out 'black' if it's meant to be hidden or handled separately
        const heroes = Object.keys(BASE_HERO_STATS).filter(h => h !== 'black');

        // Logic for limiting view
        let displayHeroes = heroes;
        let showPlusButton = false;

        // If not expanded and we have more than 6, limit to 6 and show button
        if (!this.heroSelectionExpanded && heroes.length > 6) {
            displayHeroes = heroes.slice(0, 6);
            showPlusButton = true;
            container.style.overflowX = 'hidden';
            container.style.justifyContent = 'center';
            container.style.flexWrap = 'nowrap';
        } else {
            // Expanded mode: Show all, enable scrolling
            container.style.overflowX = 'auto'; // Horizontal scroll
            container.style.justifyContent = 'flex-start'; // Align left
            container.style.maxWidth = '95vw'; // Use wider screen space
            container.style.paddingBottom = '15px'; // Space for scrollbar
        }

        displayHeroes.forEach(h => {
            // Ensure save data exists
            if (!window.saveData[h]) {
                window.saveData[h] = { level: 0, unlocked: 0, highScore: 0, prestige: 0 };
                if (h === 'earth') window.saveData[h].unlocked = 1;
            }

            const data = window.saveData[h];
            const el = document.createElement('div');
            el.className = 'hero-card';
            el.style.flexShrink = '0'; // Prevent squishing
            if (h === (window.selectedHeroType || 'fire')) el.style.borderColor = 'white';

            let prestigeText = "";
            if (data.prestige > 0) {
                prestigeText = `<div class="hero-prestige">Hard Mode ${data.prestige}</div>`;
            }

            let iconContent = `
                <div style="width: 60%; height: 30%; background: rgba(0,0,0,0.5); border-radius: 0 0 50% 50%; margin-top: -10%;"></div>
            `;

            // Check for custom icon in BASE_HERO_STATS
            if (BASE_HERO_STATS[h].icon) {
                iconContent = `<div style="font-size: 30px; line-height: 50px;">${BASE_HERO_STATS[h].icon}</div>`;
            }

            el.innerHTML = `
                <div class="hero-icon" style="background: ${BASE_HERO_STATS[h].color}; position: relative; display: flex; justify-content: center; align-items: center;">
                    ${iconContent}
                </div>
                <div class="hero-name" style="color: ${BASE_HERO_STATS[h].color}; text-shadow: 0 0 5px rgba(255, 255, 255, 0.7);">${h.toUpperCase()}</div>
                <div class="hero-stats">High Score: ${data.highScore}</div>
                ${prestigeText}
            `;
            el.onclick = () => {
                window.selectedHeroType = h;
                this.renderHeroSelect();
            };
            container.appendChild(el);
        });

        if (showPlusButton) {
            const plusEl = document.createElement('div');
            plusEl.className = 'hero-card';
            plusEl.style.flexShrink = '0';
            plusEl.style.borderStyle = 'dashed';
            plusEl.style.borderColor = '#666';
            plusEl.style.display = 'flex';
            plusEl.style.alignItems = 'center';
            plusEl.style.justifyContent = 'center';
            plusEl.innerHTML = `
                <div style="display:flex; flex-direction:column; align-items:center;">
                    <div style="font-size: 40px; color: #aaa;">+</div>
                    <div style="font-size: 14px; color: #888; margin-top:5px;">More</div>
                </div>
            `;
            plusEl.onclick = () => {
                this.heroSelectionExpanded = true;
                this.renderHeroSelect();
            };
            container.appendChild(plusEl);
        }

        this.updateStoryButton();
    }

    updateStoryButton() {
        const btn = document.querySelector('.btn-story');
        if (!btn) return;

        let title = "Story Mode";
        const hero = window.selectedHeroType || 'fire';

        if (typeof window.DLC_REGISTRY !== 'undefined' && window.DLC_REGISTRY) {
            for (const key in window.DLC_REGISTRY) {
                const dlc = window.DLC_REGISTRY[key];
                const matchesHero = (dlc.hero === hero) || (dlc.heroes && dlc.heroes.includes(hero));

                if (dlc && matchesHero && dlc.name) {
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
