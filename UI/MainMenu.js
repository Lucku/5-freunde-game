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

        // Always show all heroes in Grid View
        container.style.display = 'grid';
        container.style.gridTemplateColumns = 'repeat(7, 160px)';
        container.style.gap = '15px';
        container.style.justifyContent = 'center';
        container.style.overflow = 'visible';

        // Ensure container fits within view but provides buffer for hover effects
        container.style.padding = '10px';
        container.style.width = '90vw';
        container.style.maxWidth = '1300px';
        container.style.height = 'auto';

        // Center and add bottom margin to prevent hover from hitting viewport edge
        container.style.margin = '0 auto';
        container.style.marginBottom = '50px';

        heroes.forEach(h => {
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
                <div class="hero-name" style="color: ${BASE_HERO_STATS[h].color}; text-shadow: 0 0 30px rgba(255, 255, 255, 0.7);">${h.toUpperCase()}</div>
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
        this.updateSkillTreeBadge();
    }

    updateSkillTreeBadge() {
        const badge = document.getElementById('skill-tree-badge');
        if (!badge) return;

        const hero = window.selectedHeroType || 'fire';
        if (window.saveData && window.saveData[hero]) {
            const data = window.saveData[hero];
            const level = data.level || 0;
            const unlocked = data.unlocked || 0;
            const points = level - unlocked;

            if (points > 0) {
                badge.style.display = 'inline-block';
                badge.innerText = "!";
            } else {
                badge.style.display = 'none';
            }
        } else {
            badge.style.display = 'none';
        }
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
