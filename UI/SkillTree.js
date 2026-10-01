import { generateHeroSkillTree } from '../core/skillTree.js';

class SkillTreeUI {
    openSkillTree() {
        if (typeof audioManager !== 'undefined') audioManager.play('menu');
        document.getElementById('menu-overlay').style.display = 'none';
        document.getElementById('skill-tree-screen').style.display = 'flex';
        this.renderSkillTree();
        if (window.setUIState) window.setUIState('SKILLTREE');
    }

    closeSkillTree() {
        document.getElementById('skill-tree-screen').style.display = 'none';
        if (window.initMenu) window.initMenu();
    }

    renderSkillTree() {
        // Safety for selectedHeroType
        const heroType = window.selectedHeroType || 'fire';
        const container = document.getElementById('skill-tree-container');
        if (!container) return;
        container.innerHTML = '';

        const heroData = window.gameContext.saveData[heroType];
        const pointsAvailable = heroData.level - heroData.unlocked;
        // Assume generateHeroSkillTree is global. If not, we moved it? 
        // We found it in game.js in Phase 2. We should assume it stays there or we need to move it.
        // It's a logic function.
        if (typeof window.generateHeroSkillTree !== 'function') {
            console.error("generateHeroSkillTree not found");
            return;
        }
        const treeData = window.generateHeroSkillTree(heroType);

        let title = heroType.toUpperCase() + " SKILL TREE";
        if (heroData.prestige > 0) title += ` (HARD MODE ${heroData.prestige})`;
        const titleEl = document.getElementById('skill-tree-title');
        if (titleEl) titleEl.innerText = title;

        // Update points display
        const ptsEl = document.getElementById('skill-points-display');
        if (ptsEl) {
            const ST_SIZE_pts = (typeof SKILL_TREE_SIZE !== 'undefined') ? SKILL_TREE_SIZE : 100;
            if (pointsAvailable > 0) {
                ptsEl.textContent = `${heroData.unlocked}/${ST_SIZE_pts}  ·  ${pointsAvailable} pt${pointsAvailable !== 1 ? 's' : ''}`;
                ptsEl.style.borderColor = 'rgba(241,196,15,0.45)';
                ptsEl.style.color = '#f1c40f';
            } else {
                ptsEl.textContent = `${heroData.unlocked}/${ST_SIZE_pts}`;
                ptsEl.style.borderColor = 'rgba(255,255,255,0.1)';
                ptsEl.style.color = 'rgba(255,255,255,0.4)';
            }
        }

        // Update progress bar
        const progressFill = document.getElementById('skill-tree-progress-fill');
        if (progressFill) {
            const ST_SIZE_prog = (typeof SKILL_TREE_SIZE !== 'undefined') ? SKILL_TREE_SIZE : 100;
            progressFill.style.width = `${(heroData.unlocked / ST_SIZE_prog * 100).toFixed(1)}%`;
        }

        treeData.forEach((node, index) => {
            const el = document.createElement('div');
            el.className = 'skill-node';

            const isUnlocked = index < heroData.unlocked;
            const isAvailable = index === heroData.unlocked && pointsAvailable > 0;
            const isMilestone = (index + 1) % 10 === 0;

            if (isUnlocked) el.classList.add('unlocked');
            else if (isAvailable) el.classList.add('available');
            else el.classList.add('locked');
            if (isMilestone) el.classList.add('milestone');

            // Determine icon based on type
            let icon = "⚔️";
            if (node.type === 'HEALTH') icon = "❤️";
            else if (node.type === 'SPEED') icon = "👟";
            else if (node.type === 'COOLDOWN') icon = "⏳";
            else if (node.type === 'ARMOR') icon = "🛡️";
            else if (node.type === 'PIERCE' || node.type === 'SPLIT') icon = "🏹";
            else if (node.type.includes('ULT')) icon = "✨";
            else if (node.type === 'KNOCK') icon = "💥";
            else if (node.type === 'MELEE') icon = "🥊";
            else if (node.type === 'EXPLODE_CHANCE' || node.type === 'BLAST') icon = "💣";

            // Strip "MAJOR: " prefix for the inline label — tooltip keeps full text
            const shortDesc = node.desc.replace(/^MAJOR:\s*/i, '');

            el.innerHTML = `
                <span class="skill-level">${index + 1}</span>
                <div class="skill-icon">${icon}</div>
                <div class="skill-desc">${shortDesc}</div>
                <div class="skill-tooltip">${node.desc}</div>
            `;

            if (isAvailable) {
                el.onclick = () => {
                    window.gameContext.saveData[heroType].unlocked++;
                    if (window.saveGame) window.saveGame();
                    this.renderSkillTree();

                    setTimeout(() => {
                        // Assuming uiManager or global methods exist
                        // We check if uiManager exists on window
                        if (typeof uiManager !== 'undefined' && uiManager.getFocusables) {
                            const focusables = uiManager.getFocusables();
                            if (index + 1 < focusables.length) {
                                if (uiManager.uiSelectionIndex !== undefined) uiManager.uiSelectionIndex = index + 1;
                                if (uiManager.updateUIHighlight) uiManager.updateUIHighlight();
                            }
                        }
                    }, 50);
                };
            }
            container.appendChild(el);
        });

        const prestigeBtn = document.getElementById('prestige-container');
        if (prestigeBtn) {
            const hasBeatenRank = (heroData.maxWinPrestige ?? -1) >= heroData.prestige;
            // SKILL_TREE_SIZE global constant
            const ST_SIZE = (typeof SKILL_TREE_SIZE !== 'undefined') ? SKILL_TREE_SIZE : 100;

            if (heroData.unlocked >= ST_SIZE && hasBeatenRank) {
                prestigeBtn.style.display = 'block';
                const btn = prestigeBtn.querySelector('button');
                btn.innerText = `UNLOCK HARD MODE ${heroData.prestige + 1}`;
                btn.disabled = false;
                btn.title = "Reset tree, increase difficulty, gain base stats.";
            } else if (heroData.unlocked >= ST_SIZE && !hasBeatenRank) {
                prestigeBtn.style.display = 'block';
                const btn = prestigeBtn.querySelector('button');
                btn.innerText = `BEAT STORY WITH RANK ${heroData.prestige} TO PRESTIGE`;
                btn.disabled = true;
                btn.title = "You must complete a Story Mode run with this character's current Prestige Rank first.";
            } else {
                prestigeBtn.style.display = 'none';
            }
        }
    }

    prestigeHero() {
        const heroType = window.selectedHeroType || 'fire';
        if (confirm("Are you sure? This will reset your Skill Tree progress to 0, but increase difficulty and base stats.")) {
            window.gameContext.saveData[heroType].level = 0;
            window.gameContext.saveData[heroType].unlocked = 0;
            window.gameContext.saveData[heroType].prestige++;
            if (window.saveGame) window.saveGame();
            this.renderSkillTree();
        }
    }
}

const skillTreeUI = new SkillTreeUI();
window.openSkillTree = () => skillTreeUI.openSkillTree();
window.closeSkillTree = () => skillTreeUI.closeSkillTree();
window.prestigeHero = () => skillTreeUI.prestigeHero();

// Pure generator lives in core/skillTree.js (shared with the server
// simulation, which needs the same tree to compute online heroes' stats).
window.generateHeroSkillTree = generateHeroSkillTree;

export { SkillTreeUI, skillTreeUI };
export default skillTreeUI;
