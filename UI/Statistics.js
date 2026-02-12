class StatisticsUI {
    constructor() {
        // Bind methods to global scope for button onclicks if needed, 
        // or we expect specific ID bindings.
        // For compatibility with existing HTML onclicks (e.g. onclick="openStats()"),
        // we might need to expose functions globally at the bottom.
    }

    // --- Statistics Screen Logic ---
    openStats() {
        document.getElementById('menu-overlay').style.display = 'none';
        document.getElementById('stats-screen').style.display = 'flex';
        this.renderStatsScreen();
        if (window.setUIState) window.setUIState('STATS');
    }

    closeStats() {
        document.getElementById('stats-screen').style.display = 'none';
        if (window.initMenu) window.initMenu();
    }

    renderStatsScreen() {
        // Safety check for selectedHeroType
        const heroType = window.selectedHeroType || 'fire';
        document.getElementById('stats-hero-title').innerText = `ACTIVE HERO: ${heroType.toUpperCase()}`;

        // 1. Initialize Accumulators
        let totals = {
            damage: 0,      // %
            healthPct: 0,   // %
            healthFlat: 0,  // Flat
            speed: 0,       // %
            cooldown: 0,    // %
            defense: 0,     // %
            gold: 0,        // % (Greed)
            xp: 0,          // % (Wisdom)
            luck: 0,        // %
            projectiles: 0, // Flat
            revives: 0      // Flat
        };

        // --- A. VOID SHOP (Meta Upgrades) ---
        let voidHtml = '';
        if (typeof PERM_UPGRADES !== 'undefined' && window.saveData && window.saveData.metaUpgrades) {
            for (let key in PERM_UPGRADES) {
                const level = window.saveData.metaUpgrades[key] || 0;
                if (level > 0) {
                    let effect = "";
                    if (key === 'health') { totals.healthFlat += level * 5; effect = `+${level * 5} Max HP`; }
                    if (key === 'power') { totals.damage += level; effect = `+${level}% Damage`; }
                    if (key === 'swift') { totals.speed += level; effect = `+${level}% Speed`; }
                    if (key === 'greed') { totals.gold += level * 5; effect = `+${level * 5}% Gold Gain`; }
                    if (key === 'defense') { totals.defense += level; effect = `+${level}% Dmg Reduction`; }
                    if (key === 'wisdom') { totals.xp += level * 2; effect = `+${level * 2}% XP Gain`; }

                    voidHtml += `<div class="stat-row"><span>${PERM_UPGRADES[key].name} (Lvl ${level})</span><span>${effect}</span></div>`;
                }
            }
        }
        if (voidHtml === '') voidHtml = '<div style="color:#666; font-style:italic; padding:10px;">No Void Upgrades purchased yet.</div>';
        const voidListFn = document.getElementById('stats-void-list');
        if (voidListFn) voidListFn.innerHTML = voidHtml;

        // --- B. ACHIEVEMENTS ---
        let achHtml = '';
        if (window.saveData && window.saveData.global.unlockedAchievements) {
            window.saveData.global.unlockedAchievements.forEach(id => {
                const ach = ACHIEVEMENTS.find(a => a.id === id);
                if (ach) {
                    const val = ach.bonus.val;
                    let effect = "";

                    if (ach.bonus.type === 'damage') { totals.damage += val * 100; effect = `+${(val * 100).toFixed(0)}% Damage`; }
                    if (ach.bonus.type === 'health') { totals.healthPct += val * 100; effect = `+${(val * 100).toFixed(0)}% HP`; }
                    if (ach.bonus.type === 'speed') { totals.speed += val * 100; effect = `+${(val * 100).toFixed(0)}% Speed`; }
                    if (ach.bonus.type === 'cooldown') { totals.cooldown += val * 100; effect = `+${(val * 100).toFixed(0)}% CDR`; }
                    if (ach.bonus.type === 'gold') { totals.gold += val * 100; effect = `+${(val * 100).toFixed(0)}% Gold`; }

                    achHtml += `<div class="stat-row"><span>${ach.title}</span><span>${effect}</span></div>`;
                }
            });
        }
        if (achHtml === '') achHtml = '<div style="color:#666; font-style:italic; padding:10px;">No Achievements unlocked yet.</div>';
        const achListFn = document.getElementById('stats-ach-list');
        if (achListFn) achListFn.innerHTML = achHtml;

        // --- C. SKILL TREE ---
        let treeHtml = '';
        // Assuming generateHeroSkillTree is global or we move it here?
        // If it logic, it should probably be available.
        // For now, let's assume it's global or attached to window.
        // If moved, we call it via appropriate referencing.
        if (typeof window.generateHeroSkillTree === 'function') {
            const treeData = window.generateHeroSkillTree(heroType);
            const unlockedCount = window.saveData[heroType].unlocked;

            let treeStats = { damage: 0, health: 0, speed: 0, cooldown: 0, defense: 0, projectiles: 0, other: [] };

            for (let i = 0; i < unlockedCount; i++) {
                const node = treeData[i];
                if (node.type === 'DAMAGE') { treeStats.damage += node.value; totals.damage += node.value * 100; }
                else if (node.type === 'HEALTH') { treeStats.health += node.value; totals.healthPct += node.value * 100; }
                else if (node.type === 'SPEED') { treeStats.speed += node.value; totals.speed += node.value * 100; }
                else if (node.type === 'COOLDOWN') { treeStats.cooldown += node.value; totals.cooldown += node.value * 100; }
                else if (node.type === 'ARMOR') { treeStats.defense += node.value; totals.defense += node.value * 100; }
                else if (node.type === 'SPLIT' || node.type === 'PIERCE') {
                    treeStats.projectiles += node.value;
                    totals.projectiles += node.value;
                    treeStats.other.push(node.desc);
                }
                else {
                    treeStats.other.push(node.desc);
                }
            }

            if (treeStats.damage > 0) treeHtml += `<div class="stat-row"><span>Total Damage Nodes</span><span>+${(treeStats.damage * 100).toFixed(0)}%</span></div>`;
            if (treeStats.health > 0) treeHtml += `<div class="stat-row"><span>Total Health Nodes</span><span>+${(treeStats.health * 100).toFixed(0)}%</span></div>`;
            if (treeStats.speed > 0) treeHtml += `<div class="stat-row"><span>Total Speed Nodes</span><span>+${(treeStats.speed * 100).toFixed(0)}%</span></div>`;
            if (treeStats.cooldown > 0) treeHtml += `<div class="stat-row"><span>Total Cooldown Nodes</span><span>-${(treeStats.cooldown * 100).toFixed(0)}%</span></div>`;
            if (treeStats.defense > 0) treeHtml += `<div class="stat-row"><span>Total Armor Nodes</span><span>+${(treeStats.defense * 100).toFixed(0)}%</span></div>`;

            const uniqueNodes = [...new Set(treeStats.other)];
            uniqueNodes.forEach(desc => {
                treeHtml += `<div class="stat-row"><span>Special Node</span><span>${desc}</span></div>`;
            });

            if (unlockedCount === 0) treeHtml = '<div style="color:#666; font-style:italic; padding:10px;">No Skill Tree nodes unlocked.</div>';
        }
        const treeListFn = document.getElementById('stats-tree-list');
        if (treeListFn) treeListFn.innerHTML = treeHtml;

        // --- D. RENDER TOTALS ---
        const summaryGrid = document.getElementById('stats-summary-grid');
        if (summaryGrid) {
            summaryGrid.innerHTML = `
                <div class="summary-card"><div class="summary-val" style="color:#e74c3c">+${totals.damage.toFixed(0)}%</div><div class="summary-label">Damage</div></div>
                <div class="summary-card"><div class="summary-val" style="color:#2ecc71">+${totals.healthPct.toFixed(0)}% / +${totals.healthFlat}</div><div class="summary-label">Health</div></div>
                <div class="summary-card"><div class="summary-val" style="color:#f1c40f">+${totals.speed.toFixed(0)}%</div><div class="summary-label">Move Speed</div></div>
                <div class="summary-card"><div class="summary-val" style="color:#3498db">${totals.cooldown.toFixed(0)}%</div><div class="summary-label">Cooldown Red.</div></div>
                <div class="summary-card"><div class="summary-val" style="color:#9b59b6">+${totals.defense.toFixed(0)}%</div><div class="summary-label">Defense</div></div>
                <div class="summary-card"><div class="summary-val" style="color:#f39c12">+${totals.gold.toFixed(0)}%</div><div class="summary-label">Gold Gain</div></div>
                <div class="summary-card"><div class="summary-val" style="color:#3498db">+${totals.xp.toFixed(0)}%</div><div class="summary-label">XP Gain</div></div>
                <div class="summary-card"><div class="summary-val" style="color:#fff">+${totals.projectiles}</div><div class="summary-label">Extra Proj.</div></div>
                <div class="summary-card"><div class="summary-val" style="color:#1abc9c">${window.saveData[heroType].prestige}</div><div class="summary-label">Prestige Rank</div></div>
            `;
        }
    }

    // --- Completion Menu Logic ---
    openCompletion() {
        document.getElementById('menu-overlay').style.display = 'none';
        document.getElementById('completion-screen').style.display = 'flex';
        // Assuming CompletionMenu is already a class in CompletionMenu.js
        if (typeof CompletionMenu !== 'undefined') {
            const menu = new CompletionMenu();
            menu.render();
        }
        if (window.setUIState) window.setUIState('COMPLETION');
    }

    closeCompletion() {
        document.getElementById('completion-screen').style.display = 'none';
        if (window.initMenu) window.initMenu();
    }

    // --- Collection Logic ---
    getCollectionBonuses(targetType) {
        const bonuses = {
            damageMult: 1,
            defenseMult: 1,
            xpMult: 1,
            critChance: 0,
            specials: []
        };

        if (window.saveData && window.saveData.collection) {
            window.saveData.collection.forEach(key => {
                const card = COLLECTOR_CARDS[key];
                if (!card || !card.bonus) return;

                // Check if bonus applies to this target (or is global/special)
                if (card.bonus.target === targetType || card.bonus.type === 'special') {
                    if (card.bonus.type === 'damage_vs') bonuses.damageMult += card.bonus.val;
                    if (card.bonus.type === 'defense_vs') bonuses.defenseMult -= card.bonus.val; // Reduction
                    if (card.bonus.type === 'xp_vs') bonuses.xpMult += card.bonus.val;
                    if (card.bonus.type === 'crit_vs') bonuses.critChance += card.bonus.val;
                    if (card.bonus.type === 'special') bonuses.specials.push(card.bonus.id);
                }
            });
        }
        return bonuses;
    }

    openCollection() {
        document.getElementById('menu-overlay').style.display = 'none';
        document.getElementById('collection-screen').style.display = 'flex';
        this.renderCollection();
        if (window.setUIState) window.setUIState('COLLECTION');
    }

    closeCollection() {
        document.getElementById('collection-screen').style.display = 'none';
        if (window.initMenu) window.initMenu();
    }

    renderCollection() {
        const container = document.getElementById('collection-grid');
        if (!container) return;

        container.innerHTML = '';
        container.style.display = 'flex';
        container.style.flexDirection = 'column';
        container.style.gap = '20px';

        // Dynamically discover all card types from COLLECTOR_CARDS
        const typesSet = new Set();
        if (typeof COLLECTOR_CARDS !== 'undefined') {
            Object.keys(COLLECTOR_CARDS).forEach(key => {
                // Match pattern "TYPE_NUMBER" (e.g., "BASIC_1", "CLOUD_BAT_2")
                const match = key.match(/^(.*)_\d+$/);
                if (match) {
                    typesSet.add(match[1]);
                }
            });
        }

        const types = Array.from(typesSet);

        // types.forEach(type => {
        //     // Check if we actually have cards for this type
        //     if (!COLLECTOR_CARDS[`${type}_1`]) return;

        //     const row = document.createElement('div');
        //     row.className = 'collection-row';
        //     row.style.display = 'flex';
        //     row.style.gap = '10px';
        //     row.style.justifyContent = 'center';
        //     row.style.flexWrap = 'wrap';

        //     // Header for row
        //     const header = document.createElement('h3');
        //     header.style.width = '100%';
        //     header.style.textAlign = 'center';
        //     header.style.color = '#ccc';
        //     header.style.marginBottom = '5px';
        //     header.innerText = type.replace('_', ' ');
        //     row.appendChild(header);

        //     for (let i = 1; i <= 4; i++) {
        //         const cardKey = `${type}_${i}`;
        //         const cardData = COLLECTOR_CARDS[cardKey];
        //         const isCollected = window.saveData.collection.includes(cardKey);

        //         if (cardData) {
        //             const el = document.createElement('div');
        //             el.className = `collection-card ${isCollected ? 'collected' : 'locked'}`;
        //             el.style.border = `2px solid ${cardData.rarity === 'common' ? '#bdc3c7' : cardData.rarity === 'rare' ? '#3498db' : cardData.rarity === 'epic' ? '#9b59b6' : '#f1c40f'}`;

        //             let bg = '#333';
        //             if (isCollected) bg = cardData.rarity === 'common' ? '#2c3e50' : cardData.rarity === 'rare' ? '#2980b9' : cardData.rarity === 'epic' ? '#8e44ad' : '#f39c12';

        //             el.style.background = bg;
        //             el.style.padding = '10px';
        //             el.style.width = '120px';
        //             el.style.borderRadius = '5px';
        //             el.style.display = 'flex';
        //             el.style.flexDirection = 'column';
        //             el.style.alignItems = 'center';
        //             el.style.opacity = isCollected ? 1 : 0.5;

        //             el.innerHTML = `
        //                 <div style="font-size: 24px;">${isCollected ? '🃏' : '🔒'}</div>
        //                 <div style="font-weight: bold; margin: 5px 0; font-size: 12px; text-align: center;">${cardData.name}</div>
        //                 <div style="font-size: 10px; text-align: center; color: #ddd;">${isCollected ? parseBonusDesc(cardData.bonus) : '???'}</div>
        //             `;
        //             row.appendChild(el);
        //         }
        //     }
        //     container.appendChild(row);
        // });
        types.forEach(type => {
            // Check if we actually have cards for this type
            // (Prevents showing empty rows if a type exists but has no cards)
            if (!COLLECTOR_CARDS[`${type}_1`]) return;

            const row = document.createElement('div');
            row.className = 'collection-row';
            row.style.display = 'flex';
            row.style.gap = '10px';
            row.style.justifyContent = 'center';
            row.style.flexWrap = 'wrap';

            // Header for row
            const header = document.createElement('div');
            header.style.width = '100%';
            header.style.textAlign = 'center';
            header.style.color = '#aaa';
            header.style.marginBottom = '5px';
            header.style.fontSize = '14px';
            header.innerText = type.replace(/_/g, ' ');
            row.appendChild(header);

            for (let i = 1; i <= 4; i++) {
                const key = `${type}_${i}`;
                const card = COLLECTOR_CARDS[key];
                if (!card) continue;

                const unlocked = saveData.collection.includes(key);

                const el = document.createElement('div');
                el.className = 'collection-card';
                if (!unlocked) el.classList.add('locked');

                el.style.borderColor = unlocked ? card.color : '#333';
                el.style.boxShadow = unlocked ? `0 0 15px ${card.color}20` : 'none';
                el.style.width = '180px'; // Fixed width for consistency

                el.innerHTML = `
                <div class="card-icon" style="background: ${unlocked ? card.color : '#222'}">
                    ${unlocked ? (i === 4 ? '👑' : i === 3 ? '💰' : i === 2 ? '🛡️' : '⚔️') : '?'}
                </div>
                <div class="card-info">
                    <div class="card-name" style="color: ${unlocked ? card.color : '#666'}">
                        ${unlocked ? card.name : 'Unknown'}
                    </div>
                    <div class="card-desc" style="color: ${unlocked ? '#ccc' : '#444'}">
                        ${unlocked ? card.desc : 'Find this card to unlock bonus.'}
                    </div>
                </div>
            `;
                row.appendChild(el);
            }
            container.appendChild(row);
        });
    }
}

// Helper for parsing bonus description
function parseBonusDesc(bonus) {
    if (!bonus) return "No Bonus";
    if (bonus.type === 'damage_vs') return `+${(bonus.val * 100).toFixed(0)}% Dmg vs ${bonus.target}`;
    if (bonus.type === 'defense_vs') return `+${(bonus.val * 100).toFixed(0)}% Def vs ${bonus.target}`;
    if (bonus.type === 'xp_vs') return `+${(bonus.val * 100).toFixed(0)}% XP vs ${bonus.target}`;
    if (bonus.type === 'crit_vs') return `+${(bonus.val * 100).toFixed(0)}% Crit vs ${bonus.target}`;
    if (bonus.type === 'special') return "Special Effect";
    return "Unknown Bonus";
}

// Instantiate and expose
const statisticsUI = new StatisticsUI();

// Global Functions for backwards compatibility
window.openStats = () => statisticsUI.openStats();
window.closeStats = () => statisticsUI.closeStats();
window.openCompletion = () => statisticsUI.openCompletion();
window.closeCompletion = () => statisticsUI.closeCompletion();
window.getCollectionBonuses = (t) => statisticsUI.getCollectionBonuses(t);
window.openCollection = () => statisticsUI.openCollection();
window.closeCollection = () => statisticsUI.closeCollection();
window.openCollection = () => statisticsUI.openCollection();
window.closeCollection = () => statisticsUI.closeCollection();

// --- Skill Tree Logic ---
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

        const ptsEl = document.getElementById('skill-points-display');
        if (ptsEl) ptsEl.innerText = `Points Available: ${pointsAvailable}`;

        treeData.forEach((node, index) => {
            const el = document.createElement('div');
            el.className = 'skill-node';

            const isUnlocked = index < heroData.unlocked;
            const isAvailable = index === heroData.unlocked && pointsAvailable > 0;

            if (isUnlocked) el.classList.add('unlocked');
            else if (isAvailable) el.classList.add('available');
            else el.classList.add('locked');

            // Determine Icon based on type
            let icon = "⚔️";
            if (node.type === 'HEALTH') icon = "❤️";
            if (node.type === 'SPEED') icon = "👟";
            if (node.type === 'COOLDOWN') icon = "⏳";
            if (node.type === 'ARMOR') icon = "🛡️";
            if (node.type === 'PIERCE' || node.type === 'SPLIT') icon = "🏹";
            if (node.type.includes('ULT')) icon = "✨";

            el.innerHTML = `
                <div class="skill-level">${index + 1}</div>
                <div class="skill-icon">${icon}</div>
                <div class="skill-tooltip">
                    ${node.desc}
                </div>
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

// --- Achievements Logic ---
class AchievementsUI {
    openAchievements() {
        document.getElementById('menu-overlay').style.display = 'none';
        document.getElementById('achievements-screen').style.display = 'flex';

        const list = document.getElementById('achievements-list');
        if (!list) return;
        list.innerHTML = '';

        const achievementsList = window.ACHIEVEMENTS || [];

        achievementsList.forEach(ach => {
            const unlocked = window.saveData.global.unlockedAchievements.includes(ach.id);
            const div = document.createElement('div');
            div.className = `achievement-row ${unlocked ? 'unlocked' : ''}`;
            div.innerHTML = `
                <div class="ach-info">
                    <h3>${ach.title} ${unlocked ? '✅' : '🔒'}</h3>
                    <p>${ach.desc}</p>
                </div>
                <div class="ach-reward">${ach.bonus.text}</div>
            `;
            list.appendChild(div);
        });
        if (window.setUIState) window.setUIState('ACHIEVEMENTS');
    }

    closeAchievements() {
        document.getElementById('achievements-screen').style.display = 'none';
        if (window.initMenu) window.initMenu();
    }
}
const achievementsUI = new AchievementsUI();
window.openAchievements = () => achievementsUI.openAchievements();
window.closeAchievements = () => achievementsUI.closeAchievements();

// --- High Score Logic ---
class HighScoreUI {
    openHighScores() {
        document.getElementById('menu-overlay').style.display = 'none';
        document.getElementById('highscore-screen').style.display = 'flex';

        const labels = {
            missilesFired: "Missiles Fired",
            timeSurvived: "Longest Run",
            wavesCleared: "Max Waves",
            damageTaken: "Damage Taken",
            damageDealt: "Damage Dealt",
            levelReached: "Max Level",
            moneyGained: "Max Gold (Run)",
            moneySpent: "Max Spent (Run)",
            enemiesKilled: "Max Kills (Run)",
            bossesKilled: "Max Bosses (Run)",
            maxCombo: "Max Combo"
        };

        let html = `
        <h2 style="color:#f1c40f; margin-bottom:10px;">BEST RUN RECORDS</h2>
        <table class="stats-table">
            <thead><tr><th>Statistic</th><th style="text-align:right">Best Record</th></tr></thead>
            <tbody>`;

        // 1. Best Run Stats
        for (let key in labels) {
            let val = window.saveData.stats[key] || 0;
            if (key === 'timeSurvived') {
                val = `${Math.floor(val / 60)}:${(val % 60).toString().padStart(2, '0')}`;
            }
            html += `<tr><td>${labels[key]}</td><td class="stats-val" style="color:#fff">${val}</td></tr>`;
        }
        html += `</tbody></table>`;

        // 2. Lifetime Totals
        html += `
        <h2 style="color:#3498db; margin-top:30px; margin-bottom:10px;">LIFETIME TOTALS</h2>
        <table class="stats-table">
            <thead><tr><th>Statistic</th><th style="text-align:right">Total</th></tr></thead>
            <tbody>
                <tr><td>Total Kills</td><td class="stats-val" style="color:#3498db">${window.saveData.global.totalKills}</td></tr>
                <tr><td>Total Gold Collected</td><td class="stats-val" style="color:#f1c40f">${window.saveData.global.totalGold}</td></tr>
                <tr><td>Total Bosses Slain</td><td class="stats-val" style="color:#e74c3c">${window.saveData.global.totalBosses}</td></tr>
                <tr><td>Total Damage Dealt</td><td class="stats-val" style="color:#9b59b6">${(window.saveData.global.totalDamage / 1000000).toFixed(2)}M</td></tr>
                <tr><td>Highest Wave Ever</td><td class="stats-val" style="color:#2ecc71">${window.saveData.global.maxWave}</td></tr>
            </tbody>
        </table>`;

        document.getElementById('highscore-content').innerHTML = html;
        if (window.setUIState) window.setUIState('HIGHSCORE');
    }

    closeHighScores() {
        document.getElementById('highscore-screen').style.display = 'none';
        if (window.initMenu) window.initMenu();
    }
}
const highScoreUI = new HighScoreUI();
window.openHighScores = () => highScoreUI.openHighScores();
window.closeHighScores = () => highScoreUI.closeHighScores();

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

