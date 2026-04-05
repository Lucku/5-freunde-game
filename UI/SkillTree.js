class SkillTreeUI {
    openSkillTree() {
        if (typeof audioManager !== 'undefined') audioManager.play('menu');
        if (typeof MenuBackground !== 'undefined') MenuBackground.stop();
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

        const heroData = window.saveData[heroType];
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
                    window.saveData[heroType].unlocked++;
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
            window.saveData[heroType].level = 0;
            window.saveData[heroType].unlocked = 0;
            window.saveData[heroType].prestige++;
            if (window.saveGame) window.saveGame();
            this.renderSkillTree();
        }
    }
}

const skillTreeUI = new SkillTreeUI();
window.openSkillTree = () => skillTreeUI.openSkillTree();
window.closeSkillTree = () => skillTreeUI.closeSkillTree();
window.prestigeHero = () => skillTreeUI.prestigeHero();

window.generateHeroSkillTree = function (type) {
    const tree = [];
    const weights = {
        fire: { DAMAGE: 0.25, EXPLODE_CHANCE: 0.30, SPEED: 0.10, COOLDOWN: 0.15, HEALTH: 0.10, ULT_DAMAGE: 0.10 },
        water: { COOLDOWN: 0.30, KNOCK: 0.30, SPEED: 0.20, HEALTH: 0.10, ULT_SPEED: 0.10 },
        ice: { PIERCE: 0.30, COOLDOWN: 0.15, DAMAGE: 0.20, HEALTH: 0.15, ULT_DAMAGE: 0.10, ULT_SPEED: 0.10 },
        plant: { SPLIT: 0.25, HEALTH: 0.30, DAMAGE: 0.10, COOLDOWN: 0.15, ULT_DAMAGE: 0.20 },
        metal: { MELEE: 0.25, ARMOR: 0.30, HEALTH: 0.25, DAMAGE: 0.10, ULT_DAMAGE: 0.10 },
        black: { DAMAGE: 1.0 }
    };

    if (window.HERO_LOGIC && window.HERO_LOGIC[type] && window.HERO_LOGIC[type].getSkillTreeWeights) {
        weights[type] = window.HERO_LOGIC[type].getSkillTreeWeights();
    }

    const w = weights[type];
    const types = [];
    for (let k in w) {
        const count = Math.floor(w[k] * 100);
        for (let i = 0; i < count; i++) types.push(k);
    }
    while (types.length < 100) types.push('DAMAGE');

    let seed = type.length;
    const random = () => {
        const x = Math.sin(seed++) * 10000;
        return x - Math.floor(x);
    };

    // Assumes SKILL_TREE_SIZE is global constant
    const size = typeof window.SKILL_TREE_SIZE !== 'undefined' ? window.SKILL_TREE_SIZE : 100;

    for (let i = 0; i < size; i++) {
        const idx = Math.floor(random() * types.length);
        const t = types[idx];

        let val = 0;
        let desc = "";

        if (t === 'DAMAGE') { val = 0.02; desc = "+2% Damage"; }
        if (t === 'HEALTH') { val = 0.02; desc = "+2% Max HP"; }
        if (t === 'SPEED') { val = 0.01; desc = "+1% Move Speed"; }
        if (t === 'COOLDOWN') { val = 0.01; desc = "-1% Cooldowns"; }
        if (t === 'ULT_DAMAGE') { val = 0.05; desc = "+5% Ult Dmg"; }
        if (t === 'ULT_SPEED') { val = 0.05; desc = "+5% Ult Spd"; }

        if (t === 'BLAST') { val = 0.05; desc = "+5% Blast Radius"; }
        if (t === 'EXPLODE_CHANCE') { val = 0.05; desc = "+5% Explode Chance"; }
        if (t === 'KNOCK') { val = 0.05; desc = "+5% Knockback"; }
        if (t === 'PIERCE') { val = 1; desc = "+1 Pierce Count"; }
        if (t === 'SPLIT') { val = 1; desc = "+1 Proj / -20% Dmg"; }
        if (t === 'ARMOR') { val = 0.01; desc = "+1% Dmg Reduction"; }
        if (t === 'MELEE') { val = 0.05; desc = "+5% Melee Size"; }

        if (window.HERO_LOGIC && window.HERO_LOGIC[type] && window.HERO_LOGIC[type].getSkillNodeDetails) {
            const details = window.HERO_LOGIC[type].getSkillNodeDetails(t, val, desc);
            val = details.val;
            desc = details.desc;
        }

        if ((i + 1) % 10 === 0) {
            if (t === 'PIERCE' || t === 'SPLIT') val += 1;
            else val *= 5;
            desc = "MAJOR: " + desc.replace('+', '+').replace('-', '-');
        }
        tree.push({ id: i, type: t, value: val, desc: desc });
    }
    return tree;
};
