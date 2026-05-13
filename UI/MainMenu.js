class MainMenuUI {
    constructor() {
        this.heroSelectionExpanded = false;
    }

    renderHeroSelect() {
        const container = document.getElementById('hero-select-container');
        if (!container) return;
        container.innerHTML = '';

        // Dynamically get heroes from BASE_HERO_STATS
        // Filter out 'black' (debug-only), 'green_goblin'/'makuta' (Evil Mode villains, not selectable),
        // and 'love' until unlocked via Maze of Time
        const loveUnlocked = window.saveData && window.saveData['love'] && window.saveData['love'].unlocked;
        const MENU_HIDDEN = new Set(['black', 'green_goblin', 'makuta']);
        const heroes = Object.keys(BASE_HERO_STATS).filter(h => {
            if (MENU_HIDDEN.has(h)) return false;
            if (h === 'love' && !loveUnlocked) return false;
            return true;
        });

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

        let saveDirty = false;
        heroes.forEach(h => {
            // Ensure save data exists
            if (!window.saveData[h]) {
                window.saveData[h] = { level: 0, unlocked: 0, highScore: 0, prestige: 0, storyCompleted: false, bestSpeedrunSec: null };
                if (h === 'earth') window.saveData[h].unlocked = 1;
                saveDirty = true;
            }

            const data = window.saveData[h];
            const el = document.createElement('div');
            el.className = 'hero-card';
            el.style.flexShrink = '0'; // Prevent squishing

            const isP1 = h === (window.selectedHeroType || 'fire');
            const heroes = Object.keys(BASE_HERO_STATS).filter(hh => hh !== 'black');
            const isP2Confirmed = window.isCoopMode && h === window.coopP2HeroType && window.coopP2Confirmed;
            const isP2Cursor   = window.isCoopMode && !isP2Confirmed &&
                                  heroes[typeof window.coopP2CursorIndex === 'number' ? window.coopP2CursorIndex : -1] === h;

            if (isP1 && isP2Confirmed) el.style.borderColor = '#a78bfa'; // Both confirmed — purple blend
            else if (isP1)            el.style.borderColor = 'white';
            else if (isP2Confirmed)   { el.style.borderColor = '#3b82f6'; el.style.borderWidth = '3px'; }
            else if (isP2Cursor)      { el.style.borderColor = '#3b82f6'; el.style.borderWidth = '3px'; }

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

            const p1Badge = (isP1 && window.isCoopMode) ? '<span class="hero-p1-badge">P1</span>' : '';
            const p2Badge = isP2Confirmed ? '<span class="hero-p2-badge">P2 ✓</span>'
                          : isP2Cursor    ? '<span class="hero-p2-badge" style="opacity:0.5">P2</span>' : '';

            const pbText = (data.bestSpeedrunSec != null)
                ? `<div class="hero-stats hero-speedrun-pb">⏱ ${this.formatSpeedrunTime(data.bestSpeedrunSec)}</div>`
                : '';
            el.innerHTML = `
                <div class="hero-icon" style="background: ${BASE_HERO_STATS[h].color}; position: relative; display: flex; justify-content: center; align-items: center;">
                    ${iconContent}
                    ${p1Badge}${p2Badge}
                </div>
                <div class="hero-name" style="color: ${BASE_HERO_STATS[h].color}; text-shadow: 0 0 30px rgba(255, 255, 255, 0.7);">${h.toUpperCase()}</div>
                <div class="hero-stats">High Score: ${data.highScore}</div>
                ${pbText}
                ${prestigeText}
            `;
            el.onclick = () => {
                if (isP2Confirmed) return; // P1 can't steal P2's confirmed hero
                window.selectedHeroType = h;
                this.renderHeroSelect();
            };
            // #29 P3 — hover prefetch. When the user hovers a hero card, kick
            // off the owning DLC's load in the background so it's already
            // resolved (or in-flight with a shared promise) by the time they
            // click Start. No-op for base heroes (returns null owner).
            el.onmouseenter = () => {
                const owner = window.dlcManager?.getHeroOwnerDLC?.(h);
                if (owner) window.dlcManager.ensureDLCLoaded(owner).catch(() => {});
            };
            container.appendChild(el);
        });

        if (saveDirty && typeof window.saveGame === 'function') window.saveGame();
        this.updateStoryButton();
        this.updateSkillTreeBadge();
    }

    updateSkillTreeBadge() {
        const badge = document.getElementById('skill-tree-badge');
        const btn = document.getElementById('btn-skill-tree');
        if (!badge) return;

        const hero = window.selectedHeroType || 'fire';
        if (window.saveData && window.saveData[hero]) {
            const data = window.saveData[hero];
            const level = data.level || 0;
            const unlocked = data.unlocked || 0;
            const points = level - unlocked;

            if (points > 0) {
                badge.style.display = '';
                badge.innerText = points;
                btn?.classList.add('menu-lib-btn-has-points');
            } else {
                badge.style.display = 'none';
                btn?.classList.remove('menu-lib-btn-has-points');
            }
        } else {
            badge.style.display = 'none';
            btn?.classList.remove('menu-lib-btn-has-points');
        }
    }

    isSpeedrunUnlocked(heroType) {
        if (!heroType) return false;
        const data = window.saveData && window.saveData[heroType];
        return !!(data && data.storyCompleted === true);
    }

    formatSpeedrunTime(totalSec) {
        if (totalSec == null || !isFinite(totalSec) || totalSec < 0) return '--:--';
        const m = Math.floor(totalSec / 60);
        const s = Math.floor(totalSec % 60);
        return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
    }

    updateStoryButton() {
        // Use IDs explicitly — after Speedrun was added there are two
        // `.menu-primary-btn` elements in the DOM. querySelector(first) used to
        // work by accident; lock it to btn-story-mode.
        const btn = document.getElementById('btn-story-mode');
        if (!btn) return;

        let title = "Story Mode";
        let routesToStandard = false;
        const hero = window.selectedHeroType || 'fire';

        const _dlcReg = window.gameContext.registries.dlcs;
        if (_dlcReg) {
            for (const key in _dlcReg) {
                const dlc = _dlcReg[key];
                const matchesHero = (dlc.hero === hero) || (dlc.heroes && dlc.heroes.includes(hero));

                if (dlc && matchesHero && dlc.name) {
                    title = dlc.name;
                    if (dlc.noStoryMode) {
                        title = "Standard Mode";
                        routesToStandard = true;
                    }
                    break;
                }
            }
        }
        btn.innerText = '▶ ' + title;
        // Re-route the click target for character-only DLCs (no story content)
        btn.setAttribute('onclick', routesToStandard ? "checkNewGame('STANDARD')" : "checkNewGame('STORY')");

        // Hide redundant Standard Run button when the primary button already routes to Standard Mode
        const standardBtn = document.getElementById('btn-standard-run');
        if (standardBtn) {
            standardBtn.style.display = routesToStandard ? 'none' : '';
        }

        // Story Speedrun button — unlocked per-hero on first story victory.
        // Hidden in co-op / online (solo only) and for character-only DLCs (no story).
        const speedrunBtn = document.getElementById('btn-speedrun-mode');
        if (speedrunBtn) {
            const eligible = this.isSpeedrunUnlocked(hero)
                && !routesToStandard
                && !window.isCoopMode
                && !window.isOnlineMode;
            speedrunBtn.style.display = eligible ? '' : 'none';
            if (eligible) {
                const pb = window.saveData?.[hero]?.bestSpeedrunSec;
                speedrunBtn.innerText = pb != null
                    ? `⏱ Story Speedrun (PB ${this.formatSpeedrunTime(pb)})`
                    : '⏱ Story Speedrun';
            }
        }
    }
}

const mainMenuUI = new MainMenuUI();
window.renderHeroSelect = () => mainMenuUI.renderHeroSelect();
window.updateStoryButton = () => mainMenuUI.updateStoryButton();
window.isSpeedrunUnlocked = (heroType) => mainMenuUI.isSpeedrunUnlocked(heroType);

export { MainMenuUI, mainMenuUI };
export default mainMenuUI;
