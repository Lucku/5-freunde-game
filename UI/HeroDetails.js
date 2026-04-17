class HeroDetailsUI {
    constructor() {
        // Bind methods to global scope for button onclicks if needed, 
        // or we expect specific ID bindings.
        // For compatibility with existing HTML onclicks (e.g. onclick="openStats()"),
        // we might need to expose functions globally at the bottom.
    }

    // --- Hero Details Screen Logic ---
    openHeroDetails() {
        document.getElementById('menu-overlay').style.display = 'none';
        document.getElementById('stats-screen').style.display = 'flex';
        this.renderStatsScreen();
        if (window.setUIState) window.setUIState('STATS');
    }

    closeHeroDetails() {
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

}

// Instantiate and expose
const heroDetailsUI = new HeroDetailsUI();

// Global Functions
window.openHeroDetails = () => heroDetailsUI.openHeroDetails();
window.closeHeroDetails = () => heroDetailsUI.closeHeroDetails();

// Backwards compatibility
window.openStats = () => heroDetailsUI.openHeroDetails();
window.closeStats = () => heroDetailsUI.closeHeroDetails();

