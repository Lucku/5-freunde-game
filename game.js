const isElectron = typeof process !== 'undefined' && process.versions && process.versions.electron;
let fs, path, saveFilePath;

if (isElectron) {
    fs = require('fs');
    path = require('path');
    // Use the path we set in index.js
    saveFilePath = path.join(process.env.APP_SAVE_PATH, 'save_data.json');
    console.log("Save File Location:", saveFilePath); // Useful for debugging
}

const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');
const buffContainer = document.getElementById('buff-container');

function resize() {
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
}
window.addEventListener('resize', resize);
resize();

const defaultSaveData = {
    fire: { level: 0, unlocked: 1, highScore: 0, prestige: 0 },
    water: { level: 0, unlocked: 0, highScore: 0, prestige: 0 },
    ice: { level: 0, unlocked: 0, highScore: 0, prestige: 0 },
    plant: { level: 0, unlocked: 0, highScore: 0, prestige: 0 },
    metal: { level: 0, unlocked: 0, highScore: 0, prestige: 0 },
    global: {
        totalKills: 0, maxWave: 0, totalGold: 0, totalBosses: 0,
        totalDamage: 0, maxCombo: 0, totalGames: 0, totalDeaths: 0,
        totalVoidGoldSpent: 0, unlockedAchievements: []
    },
    collection: [],
    metaUpgrades: { health: 0, greed: 0, power: 0, swift: 0 },
    stats: {},
    daily: { lastCompleted: null },
    story: { unlockedChapters: [], enabled: true }
};

let currentBiomeType = 'fire'; // Default, updated in startGame
let saveData = {
    fire: { level: 0, unlocked: 0, highScore: 0, prestige: 0 },
    water: { level: 0, unlocked: 0, highScore: 0, prestige: 0 },
    ice: { level: 0, unlocked: 0, highScore: 0, prestige: 0 },
    plant: { level: 0, unlocked: 0, highScore: 0, prestige: 0 },
    metal: { level: 0, unlocked: 0, highScore: 0, prestige: 0 },
    global: { totalKills: 0, maxWave: 0, totalGold: 0, totalBosses: 0, totalDamage: 0, maxCombo: 0, totalGames: 0, totalDeaths: 0, totalVoidGoldSpent: 0, unlockedAchievements: [] },
    collection: [],
    metaUpgrades: { health: 0, greed: 0, power: 0, swift: 0 },
    stats: {
        missilesFired: 0,
        timeSurvived: 0,
        wavesCleared: 0,
        damageTaken: 0,
        damageDealt: 0,
        levelReached: 0,
        moneyGained: 0,
        moneySpent: 0,
        enemiesKilled: 0,
        bossesKilled: 0,
        maxCombo: 0
    },
    daily: { lastCompleted: null },
    story: { unlockedChapters: [], enabled: true }
};

// Runtime stats tracker
let currentRunStats = {
    missilesFired: 0,
    startTime: 0,
    damageTaken: 0,
    damageDealt: 0,
    moneyGained: 0,
    moneySpent: 0,
    enemiesKilled: 0,
    bossesKilled: 0,
    maxCombo: 0
};

function saveGame() {
    if (!saveData) return;

    if (isElectron) {
        try {
            fs.writeFileSync(saveFilePath, JSON.stringify(saveData, null, 2)); // Pretty print for readability
        } catch (e) {
            console.error("Failed to save game to disk:", e);
        }
    } else {
        // Fallback for Web Browser
        localStorage.setItem('5FreundeSave', JSON.stringify(saveData));
    }
}

function loadGame() {
    let data = null;

    if (isElectron) {
        try {
            if (fs.existsSync(saveFilePath)) {
                const raw = fs.readFileSync(saveFilePath, 'utf8');
                data = JSON.parse(raw);
            }
        } catch (e) {
            console.error("Failed to load save file:", e);
        }
    } else {
        // Fallback for Web Browser
        const raw = localStorage.getItem('5FreundeSave');
        if (raw) data = JSON.parse(raw);
    }

    if (data) {
        // Merge loaded data with default structure to ensure new updates don't break old saves
        saveData = { ...defaultSaveData, ...data, global: { ...defaultSaveData.global, ...data.global } };

        // Ensure story object exists and has enabled property (Migration for old saves)
        if (!saveData.story) {
            saveData.story = { unlockedChapters: [], enabled: true };
        } else if (saveData.story.enabled === undefined) {
            saveData.story.enabled = true;
        }
    } else {
        saveData = JSON.parse(JSON.stringify(defaultSaveData));
    }
}

function exportSave() {
    const blob = new Blob([JSON.stringify(saveData, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = 'freunde_savegame.json';
    document.body.appendChild(a); a.click(); document.body.removeChild(a);
}

function importSave(input) {
    const file = input.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = function (e) {
        try {
            const parsed = JSON.parse(e.target.result);
            saveData = parsed;
            saveGame();
            alert("Save loaded successfully!");
            location.reload();
        } catch (err) { alert("Invalid save file"); }
    };
    reader.readAsText(file);
}

function closeGame() {
    if (isElectron) {
        window.close();
    } else {
        alert("Cannot close window in browser mode. Please close the tab.");
    }
}

// --- Hero Specific Skill Trees ---
function generateHeroSkillTree(type) {
    const tree = [];
    // Specific weights for each hero identity
    const weights = {
        fire: { DAMAGE: 0.25, EXPLODE_CHANCE: 0.30, SPEED: 0.10, COOLDOWN: 0.15, HEALTH: 0.10, ULT_DAMAGE: 0.10 },
        water: { COOLDOWN: 0.30, KNOCK: 0.30, SPEED: 0.20, HEALTH: 0.10, ULT_SPEED: 0.10 },
        ice: { PIERCE: 0.30, COOLDOWN: 0.15, DAMAGE: 0.20, HEALTH: 0.15, ULT_DAMAGE: 0.10, ULT_SPEED: 0.10 },
        plant: { SPLIT: 0.25, HEALTH: 0.30, DAMAGE: 0.10, COOLDOWN: 0.15, ULT_DAMAGE: 0.20 },
        metal: { MELEE: 0.25, ARMOR: 0.30, HEALTH: 0.25, DAMAGE: 0.10, ULT_DAMAGE: 0.10 }
    };

    const w = weights[type];
    const types = [];
    for (let k in w) {
        const count = Math.floor(w[k] * 100);
        for (let i = 0; i < count; i++) types.push(k);
    }
    // Fill remaining with generic damage if rounding errors
    while (types.length < 100) types.push('DAMAGE');

    let seed = type.length;
    const random = () => {
        const x = Math.sin(seed++) * 10000;
        return x - Math.floor(x);
    };

    for (let i = 0; i < SKILL_TREE_SIZE; i++) {
        const idx = Math.floor(random() * types.length);
        const t = types[idx];

        let val = 0;
        let desc = "";

        // Generic
        if (t === 'DAMAGE') { val = 0.02; desc = "+2% Damage"; }
        if (t === 'HEALTH') { val = 0.02; desc = "+2% Max HP"; }
        if (t === 'SPEED') { val = 0.01; desc = "+1% Move Speed"; }
        if (t === 'COOLDOWN') { val = 0.01; desc = "-1% Cooldowns"; }
        if (t === 'ULT_DAMAGE') { val = 0.05; desc = "+5% Ult Dmg"; }
        if (t === 'ULT_SPEED') { val = 0.05; desc = "+5% Ult Spd"; }

        // Specific
        if (t === 'BLAST') { val = 0.05; desc = "+5% Blast Radius"; }
        if (t === 'EXPLODE_CHANCE') { val = 0.05; desc = "+5% Explode Chance"; }
        if (t === 'KNOCK') { val = 0.05; desc = "+5% Knockback"; }
        if (t === 'PIERCE') { val = 1; desc = "+1 Pierce Count"; }
        if (t === 'SPLIT') { val = 1; desc = "+1 Proj / -20% Dmg"; }
        if (t === 'ARMOR') { val = 0.01; desc = "+1% Dmg Reduction"; }
        if (t === 'MELEE') { val = 0.05; desc = "+5% Melee Size"; }

        if ((i + 1) % 10 === 0) {
            if (t === 'PIERCE' || t === 'SPLIT') val += 1; // +2 for major
            else val *= 5;
            desc = "MAJOR: " + desc.replace('+', '+').replace('-', '-');
        }
        tree.push({ id: i, type: t, value: val, desc: desc });
    }
    return tree;
}

// --- Menu Logic ---
let selectedHeroType = 'fire';

function renderHeroSelect() {
    const container = document.getElementById('hero-select-container');
    container.innerHTML = '';
    const heroes = ['fire', 'water', 'ice', 'plant', 'metal'];

    heroes.forEach(h => {
        const data = saveData[h];
        const el = document.createElement('div');
        el.className = 'hero-card';
        if (h === selectedHeroType) el.style.borderColor = 'white';

        let prestigeText = "";
        if (data.prestige > 0) {
            prestigeText = `<div class="hero-prestige">Hard Mode ${data.prestige}</div>`;
        }

        el.innerHTML = `
            <div class="hero-icon" style="background: ${BASE_HERO_STATS[h].color};"></div>
            <div class="hero-name" style="color: ${BASE_HERO_STATS[h].color}">${h.toUpperCase()}</div>
            <div class="hero-stats">High Score: ${data.highScore}</div>
            ${prestigeText}
        `;
        el.onclick = () => {
            selectedHeroType = h;
            renderHeroSelect();
        };
        container.appendChild(el);
    });
}

// --- UI State Management for Gamepad ---
let uiState = 'MENU'; // MENU, GAME, LEVELUP, SHOP, PERMSHOP, PAUSE, GAMEOVER
let uiSelectionIndex = 0;
let uiDebounce = 0;
let lastGamepadState = { a: false, b: false };

// Make this global so Player.js can use it
window.setUIState = function (newState) {
    uiState = newState;
    uiSelectionIndex = 0;
    uiDebounce = 20; // Delay to prevent instant input
    updateUIHighlight();
    console.log("UI State:", uiState);
};

// --- Collection Logic ---
window.checkDrop = function (enemyType, x, y) {
    // Check for all 4 tiers
    for (let i = 1; i <= 4; i++) {
        const cardKey = `${enemyType}_${i}`;
        const card = COLLECTOR_CARDS[cardKey];

        if (!card) continue;
        if (saveData.collection.includes(cardKey)) continue; // Already collected

        if (Math.random() < card.chance) {
            // Spawn a physical drop instead of instant collection
            cardDrops.push(new CardDrop(x, y, cardKey));

            // Only one card per kill to avoid spam
            return;
        }
    }
};

function getCollectionBonuses(targetType) {
    const bonuses = {
        damageMult: 1,
        defenseMult: 1,
        xpMult: 1,
        critChance: 0,
        specials: []
    };

    saveData.collection.forEach(key => {
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

    return bonuses;
}

function openCollection() {
    document.getElementById('menu-overlay').style.display = 'none';
    document.getElementById('collection-screen').style.display = 'flex';
    renderCollection();
    setUIState('COLLECTION');
}

window.closeCollection = function () {
    document.getElementById('collection-screen').style.display = 'none';
    initMenu();
}

function renderCollection() {
    const container = document.getElementById('collection-grid');
    container.innerHTML = '';
    container.style.display = 'flex';
    container.style.flexDirection = 'column';
    container.style.gap = '20px';

    const types = ['BASIC', 'SHOOTER', 'BRUTE', 'SPEEDSTER', 'SWARM', 'SUMMONER', 'GHOST', 'SNIPER', 'BOMBER', 'TOXIC', 'SHIELDER', 'BOSS'];

    types.forEach(type => {
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
        header.innerText = type;
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

// --- Statistics Screen Logic ---

function openStats() {
    document.getElementById('menu-overlay').style.display = 'none';
    document.getElementById('stats-screen').style.display = 'flex';
    renderStatsScreen();
    setUIState('STATS');
}

function closeStats() {
    document.getElementById('stats-screen').style.display = 'none';
    initMenu();
}

function renderStatsScreen() {
    document.getElementById('stats-hero-title').innerText = `ACTIVE HERO: ${selectedHeroType.toUpperCase()}`;

    // 1. Initialize Accumulators
    let totals = {
        damage: 0,      // %
        healthPct: 0,   // %
        healthFlat: 0,  // Flat
        speed: 0,       // %
        cooldown: 0,    // %
        defense: 0,     // %
        gold: 0,        // % (Greed)
        luck: 0,        // %
        projectiles: 0, // Flat
        revives: 0      // Flat
    };

    // --- A. VOID SHOP (Meta Upgrades) ---
    let voidHtml = '';
    // Note: Assuming PERM_UPGRADES is global from Constants.js
    // If not, define defaults or ensure Constants.js is loaded
    if (typeof PERM_UPGRADES !== 'undefined') {
        for (let key in PERM_UPGRADES) {
            const level = saveData.metaUpgrades[key] || 0;
            if (level > 0) {
                let effect = "";
                if (key === 'health') { totals.healthFlat += level * 5; effect = `+${level * 5} Max HP`; }
                if (key === 'power') { totals.damage += level; effect = `+${level}% Damage`; }
                if (key === 'swift') { totals.speed += level; effect = `+${level}% Speed`; }
                if (key === 'greed') { totals.gold += level * 5; effect = `+${level * 5}% Gold Gain`; } // Assuming Greed exists

                voidHtml += `<div class="stat-row"><span>${PERM_UPGRADES[key].name} (Lvl ${level})</span><span>${effect}</span></div>`;
            }
        }
    }
    if (voidHtml === '') voidHtml = '<div style="color:#666; font-style:italic; padding:10px;">No Void Upgrades purchased yet.</div>';
    document.getElementById('stats-void-list').innerHTML = voidHtml;

    // --- B. ACHIEVEMENTS ---
    let achHtml = '';
    saveData.global.unlockedAchievements.forEach(id => {
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
    if (achHtml === '') achHtml = '<div style="color:#666; font-style:italic; padding:10px;">No Achievements unlocked yet.</div>';
    document.getElementById('stats-ach-list').innerHTML = achHtml;

    // --- C. SKILL TREE ---
    let treeHtml = '';
    const treeData = generateHeroSkillTree(selectedHeroType);
    const unlockedCount = saveData[selectedHeroType].unlocked;

    // Aggregate Tree Stats for cleaner display
    let treeStats = { damage: 0, health: 0, speed: 0, cooldown: 0, defense: 0, projectiles: 0, other: [] };

    for (let i = 0; i < unlockedCount; i++) {
        const node = treeData[i];
        if (node.type === 'DAMAGE') { treeStats.damage += node.value; totals.damage += node.value * 100; }
        else if (node.type === 'HEALTH') { treeStats.health += node.value; totals.healthPct += node.value * 100; }
        else if (node.type === 'SPEED') { treeStats.speed += node.value; totals.speed += node.value * 100; }
        else if (node.type === 'COOLDOWN') { treeStats.cooldown += node.value; totals.cooldown += node.value * 100; } // Approx additive for display
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

    // Unique nodes
    const uniqueNodes = [...new Set(treeStats.other)]; // Deduplicate descriptions
    uniqueNodes.forEach(desc => {
        treeHtml += `<div class="stat-row"><span>Special Node</span><span>${desc}</span></div>`;
    });

    if (unlockedCount === 0) treeHtml = '<div style="color:#666; font-style:italic; padding:10px;">No Skill Tree nodes unlocked.</div>';
    document.getElementById('stats-tree-list').innerHTML = treeHtml;

    // --- D. RENDER TOTALS ---
    const summaryGrid = document.getElementById('stats-summary-grid');
    summaryGrid.innerHTML = `
        <div class="summary-card"><div class="summary-val" style="color:#e74c3c">+${totals.damage.toFixed(0)}%</div><div class="summary-label">Damage</div></div>
        <div class="summary-card"><div class="summary-val" style="color:#2ecc71">+${totals.healthPct.toFixed(0)}% / +${totals.healthFlat}</div><div class="summary-label">Health</div></div>
        <div class="summary-card"><div class="summary-val" style="color:#f1c40f">+${totals.speed.toFixed(0)}%</div><div class="summary-label">Move Speed</div></div>
        <div class="summary-card"><div class="summary-val" style="color:#3498db">${totals.cooldown.toFixed(0)}%</div><div class="summary-label">Cooldown Red.</div></div>
        <div class="summary-card"><div class="summary-val" style="color:#9b59b6">+${totals.defense.toFixed(0)}%</div><div class="summary-label">Defense</div></div>
        <div class="summary-card"><div class="summary-val" style="color:#f39c12">+${totals.gold.toFixed(0)}%</div><div class="summary-label">Gold Gain</div></div>
        <div class="summary-card"><div class="summary-val" style="color:#fff">+${totals.projectiles}</div><div class="summary-label">Extra Proj.</div></div>
        <div class="summary-card"><div class="summary-val" style="color:#1abc9c">${saveData[selectedHeroType].prestige}</div><div class="summary-label">Prestige Rank</div></div>
    `;
}

function getFocusables() {
    let screenId = '';
    if (uiState === 'MENU') screenId = 'start-screen';
    else if (uiState === 'LEVELUP') screenId = 'levelup-screen';
    else if (uiState === 'SHOP') screenId = 'shop-screen';
    else if (uiState === 'PERMSHOP') screenId = 'perm-shop-screen';
    else if (uiState === 'PAUSE') screenId = 'pause-screen';
    else if (uiState === 'GAMEOVER') screenId = 'game-over-screen';
    else if (uiState === 'ACHIEVEMENTS') screenId = 'achievements-screen';
    else if (uiState === 'HIGHSCORE') screenId = 'highscore-screen';
    else if (uiState === 'SKILLTREE') screenId = 'skill-tree-screen';
    else if (uiState === 'STATS') screenId = 'stats-screen'; // Added STATS
    else if (uiState === 'COLLECTION') screenId = 'collection-screen';
    else if (uiState === 'STORY') screenId = 'story-screen';

    if (!screenId) return [];
    const screen = document.getElementById(screenId);
    if (!screen) return [];

    // Select all interactive elements
    // REMOVED .achievement-row from here
    const elements = Array.from(screen.querySelectorAll('button, .hero-card, .upgrade-card, .shop-item, .skill-node, .collection-card, .switch'));
    // Filter out hidden elements
    return elements.filter(el => el.offsetParent !== null);
}

function updateUIHighlight() {
    if (uiState === 'GAME') return;

    const focusables = getFocusables();
    // Remove selected class from all
    document.querySelectorAll('.selected').forEach(el => el.classList.remove('selected'));

    if (focusables.length > 0) {
        // Auto-select first available node in Skill Tree if at start
        if (uiState === 'SKILLTREE' && uiSelectionIndex === 0) {
            const firstAvailable = focusables.findIndex(el => el.classList.contains('available'));
            if (firstAvailable !== -1) uiSelectionIndex = firstAvailable;
        }

        // Clamp index
        if (uiSelectionIndex >= focusables.length) uiSelectionIndex = 0;
        if (uiSelectionIndex < 0) uiSelectionIndex = focusables.length - 1;

        const el = focusables[uiSelectionIndex];
        el.classList.add('selected');


        const scrollableStates = ['ACHIEVEMENTS', 'SKILLTREE', 'SHOP', 'PERMSHOP', 'COLLECTION', 'HIGHSCORE'];
        if (scrollableStates.includes(uiState)) {
            // Scroll into view if needed
            el.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'nearest' });
        }
    }
}

function handleGamepadMenu() {
    const gamepads = navigator.getGamepads();
    const gp = gamepads[0]; // Assume Player 1
    if (!gp) return;

    if (uiDebounce > 0) {
        uiDebounce--;
        return;
    }

    // Input Thresholds
    const T = 0.5;
    const up = gp.axes[1] < -T || gp.buttons[12].pressed;
    const down = gp.axes[1] > T || gp.buttons[13].pressed;
    const left = gp.axes[0] < -T || gp.buttons[14].pressed;
    const right = gp.axes[0] > T || gp.buttons[15].pressed;
    const a = gp.buttons[0].pressed; // A / Cross
    const b = gp.buttons[1].pressed; // B / Circle

    if (uiState === 'GAME') return;

    // --- SCROLLING LOGIC (Right Stick) ---
    if (uiState === 'ACHIEVEMENTS') {
        const list = document.getElementById('achievements-list');
        // Axis 3 is usually Right Stick Y
        if (list && Math.abs(gp.axes[3]) > 0.1) {
            list.scrollTop += gp.axes[3] * 15; // Scroll speed
        }
    } else if (uiState === 'SKILLTREE') {
        const treeContainer = document.getElementById('skill-tree-container');
        if (treeContainer && Math.abs(gp.axes[3]) > 0.1) {
            treeContainer.scrollTop += gp.axes[3] * 15; // Scroll speed
        }
    } else if (uiState === 'STATS') { // Added STATS scrolling
        const content = document.getElementById('stats-content');
        if (content && Math.abs(gp.axes[3]) > 0.1) {
            content.scrollTop += gp.axes[3] * 15;
        }
    } else if (uiState === 'COLLECTION') {
        const content = document.getElementById('collection-grid');
        if (content && Math.abs(gp.axes[3]) > 0.1) {
            content.scrollTop += gp.axes[3] * 15;
        }
    } else if (uiState === 'HIGHSCORE') {
        const content = document.getElementById('highscore-content');
        if (content && Math.abs(gp.axes[3]) > 0.1) {
            content.scrollTop += gp.axes[3] * 15;
        }
    }

    // Back Action (B Button) - Moved BEFORE focus check so it works on empty screens
    if (b && !lastGamepadState.b) {
        if (uiState === 'PERMSHOP') closePermShop();
        else if (uiState === 'SHOP') closeShop();
        else if (uiState === 'PAUSE') togglePause();
        else if (uiState === 'ACHIEVEMENTS') closeAchievements();
        else if (uiState === 'HIGHSCORE') closeHighScores();
        else if (uiState === 'SKILLTREE') closeSkillTree();
        else if (uiState === 'STATS') closeStats(); // Added STATS
        else if (uiState === 'COLLECTION') closeCollection();
        uiDebounce = 15;
    }

    const focusables = getFocusables();

    // If nothing to focus, just update state and return
    if (focusables.length === 0) {
        lastGamepadState = { a, b };
        return;
    }

    let moved = false;

    // Navigation - Spatial Grid System
    if (down || up || left || right) {
        // Special Case for Skill Tree: Linear Navigation for Left/Right
        if (uiState === 'SKILLTREE' && (left || right)) {
            if (left) {
                uiSelectionIndex--;
                if (uiSelectionIndex < 0) uiSelectionIndex = focusables.length - 1; // Wrap to end
            } else if (right) {
                uiSelectionIndex++;
                if (uiSelectionIndex >= focusables.length) uiSelectionIndex = 0; // Wrap to start
            }
            moved = true;
        } else {
            const currentEl = focusables[uiSelectionIndex];
            if (currentEl) {
                const curRect = currentEl.getBoundingClientRect();
                const curCx = curRect.left + curRect.width / 2;
                const curCy = curRect.top + curRect.height / 2;

                let bestDist = Infinity;
                let bestIndex = -1;

                focusables.forEach((el, index) => {
                    if (index === uiSelectionIndex) return;

                    const rect = el.getBoundingClientRect();
                    const cx = rect.left + rect.width / 2;
                    const cy = rect.top + rect.height / 2;

                    let dist = Infinity;
                    let valid = false;
                    const k = 4; // Penalty weight for perpendicular deviation

                    if (down) {
                        if (cy > curCy + 10) { // Must be below
                            valid = true;
                            dist = (cy - curCy) + Math.abs(cx - curCx) * k;
                        }
                    } else if (up) {
                        if (cy < curCy - 10) { // Must be above
                            valid = true;
                            dist = (curCy - cy) + Math.abs(cx - curCx) * k;
                        }
                    } else if (right) {
                        if (cx > curCx + 10) { // Must be to the right
                            valid = true;
                            dist = (cx - curCx) + Math.abs(cy - curCy) * k;
                        }
                    } else if (left) {
                        if (cx < curCx - 10) { // Must be to the left
                            valid = true;
                            dist = (curCx - cx) + Math.abs(cy - curCy) * k;
                        }
                    }

                    if (valid && dist < bestDist) {
                        bestDist = dist;
                        bestIndex = index;
                    }
                });

                if (bestIndex !== -1) {
                    uiSelectionIndex = bestIndex;
                    moved = true;
                }
            } else {
                // Fallback if selection is invalid
                uiSelectionIndex = 0;
                moved = true;
            }
        }
    }

    if (moved) {
        if (uiSelectionIndex >= focusables.length) uiSelectionIndex = 0;
        if (uiSelectionIndex < 0) uiSelectionIndex = focusables.length - 1;
        updateUIHighlight();
        uiDebounce = 8;
    }

    // Select Action (A Button)
    if (a && !lastGamepadState.a) {
        focusables[uiSelectionIndex].click();
        uiDebounce = 15; // Reduced from 30 to 15 for snappier feel
    }

    // Back Action (B Button)
    if (b && !lastGamepadState.b) {
        if (uiState === 'PERMSHOP') closePermShop();
        else if (uiState === 'SHOP') closeShop();
        else if (uiState === 'PAUSE') togglePause();
        else if (uiState === 'ACHIEVEMENTS') closeAchievements();
        else if (uiState === 'HIGHSCORE') closeHighScores();
        else if (uiState === 'SKILLTREE') closeSkillTree(); // Added SKILLTREE
        else if (uiState === 'STATS') closeStats(); // Added STATS
        else if (uiState === 'STORY') closeStory(); // Added STORY
        uiDebounce = 30; // Increased from 20 to 30
    }

    lastGamepadState = { a, b };
}

// --- Update Existing Functions to use setUIState ---

function toggleStoryMode(checkbox) {
    if (!saveData.story) {
        saveData.story = { unlockedChapters: [], enabled: true };
    }
    saveData.story.enabled = checkbox.checked;
    saveGame();
    console.log("Story Mode " + (saveData.story.enabled ? "Enabled" : "Disabled"));
}

function initMenu() {
    document.getElementById('menu-overlay').style.display = 'flex';
    document.getElementById('start-screen').style.display = 'flex';
    document.getElementById('start-screen').style.flexDirection = 'column';
    document.getElementById('start-screen').style.alignItems = 'center';
    document.getElementById('game-over-screen').style.display = 'none';
    document.getElementById('skill-tree-screen').style.display = 'none';
    document.getElementById('pause-screen').style.display = 'none';
    document.getElementById('levelup-screen').style.display = 'none';
    document.getElementById('shop-screen').style.display = 'none';
    document.getElementById('perm-shop-screen').style.display = 'none'; // Hide perm shop
    document.getElementById('achievements-screen').style.display = 'none';
    document.getElementById('highscore-screen').style.display = 'none'; /* Hide highscore screen */
    document.getElementById('stats-screen').style.display = 'none'; // Hide stats screen
    document.getElementById('collection-screen').style.display = 'none';

    // Update Daily Challenge Button
    const dailyBtn = document.getElementById('daily-challenge-btn');
    if (dailyBtn) {
        const today = new Date().toISOString().slice(0, 10).replace(/-/g, '');
        if (saveData.daily && saveData.daily.lastCompleted === today) {
            dailyBtn.innerText = "Daily Completed";
            dailyBtn.disabled = true;
            dailyBtn.style.opacity = 0.5;
            dailyBtn.style.cursor = 'not-allowed';
        } else {
            dailyBtn.innerText = "Daily Challenge";
            dailyBtn.disabled = false;
            dailyBtn.style.opacity = 1;
            dailyBtn.style.cursor = 'pointer';
        }
    }

    // Update Story Toggle Checkbox
    const storyToggle = document.getElementById('story-toggle');
    if (storyToggle) {
        if (!saveData.story) {
            saveData.story = { unlockedChapters: [], enabled: true };
        }
        // Default to true if undefined
        if (saveData.story.enabled === undefined) {
            saveData.story.enabled = true;
        }
        storyToggle.checked = saveData.story.enabled;
    }

    renderHeroSelect();
    setUIState('MENU'); // Set State
}

// --- Permanent Shop Logic ---
function openPermShop() {
    document.getElementById('menu-overlay').style.display = 'none';
    document.getElementById('perm-shop-screen').style.display = 'flex';
    renderPermShop();
    setUIState('PERMSHOP');
}

function renderPermShop() {
    document.getElementById('permGoldVal').innerText = saveData.global.totalGold;
    const container = document.getElementById('perm-shop-container');
    container.innerHTML = '';

    for (let key in PERM_UPGRADES) {
        const up = PERM_UPGRADES[key];
        const level = saveData.metaUpgrades[key] || 0;
        const cost = Math.floor(up.baseCost * Math.pow(up.costMult, level));

        const div = document.createElement('div');
        div.className = 'shop-item';
        div.innerHTML = `
            <div style="font-size: 20px; font-weight: bold; color: #9b59b6;">${up.name}</div>
            <div style="color: #aaa; margin: 5px 0;">${up.desc}</div>
            <div style="color: #fff;">Level: ${level}</div>
            <div class="shop-cost">${cost} Total Gold</div>
        `;
        div.onclick = () => buyPermUpgrade(key, cost);
        container.appendChild(div);
    }
}

function buyPermUpgrade(key, cost) {
    if (saveData.global.totalGold >= cost) {
        saveData.global.totalGold -= cost;
        saveData.metaUpgrades[key]++;

        // Track Void Spending
        saveData.global.totalVoidGoldSpent = (saveData.global.totalVoidGoldSpent || 0) + cost;

        saveGame();
        renderPermShop();
        showNotification("Upgrade Purchased!");

        // Check for Void Shop achievements
        checkAchievements();
    } else {
        showNotification("Not enough Total Gold!");
    }
}

function closePermShop() {
    document.getElementById('perm-shop-screen').style.display = 'none';
    initMenu();
}

function openSkillTree() {
    document.getElementById('menu-overlay').style.display = 'none';
    document.getElementById('skill-tree-screen').style.display = 'flex';
    renderSkillTree();
    setUIState('SKILLTREE');
}

function closeSkillTree() {
    document.getElementById('skill-tree-screen').style.display = 'none';
    initMenu();
}

function openAchievements() {
    document.getElementById('menu-overlay').style.display = 'none';
    document.getElementById('achievements-screen').style.display = 'flex';
    const list = document.getElementById('achievements-list');
    list.innerHTML = '';

    ACHIEVEMENTS.forEach(ach => {
        const unlocked = saveData.global.unlockedAchievements.includes(ach.id);
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
    setUIState('ACHIEVEMENTS');
}

function closeAchievements() {
    document.getElementById('achievements-screen').style.display = 'none';
    initMenu();
}

// --- High Score Logic ---
function openHighScores() {
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
        let val = saveData.stats[key] || 0;
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
            <tr><td>Total Kills</td><td class="stats-val" style="color:#3498db">${saveData.global.totalKills}</td></tr>
            <tr><td>Total Gold Collected</td><td class="stats-val" style="color:#f1c40f">${saveData.global.totalGold}</td></tr>
            <tr><td>Total Bosses Slain</td><td class="stats-val" style="color:#e74c3c">${saveData.global.totalBosses}</td></tr>
            <tr><td>Total Damage Dealt</td><td class="stats-val" style="color:#9b59b6">${(saveData.global.totalDamage / 1000000).toFixed(2)}M</td></tr>
            <tr><td>Highest Wave Ever</td><td class="stats-val" style="color:#2ecc71">${saveData.global.maxWave}</td></tr>
        </tbody>
    </table>`;

    document.getElementById('highscore-content').innerHTML = html;
    setUIState('HIGHSCORE');
}

function closeHighScores() {
    document.getElementById('highscore-screen').style.display = 'none';
    initMenu();
}

function renderSkillTree() {
    const container = document.getElementById('skill-tree-container');
    container.innerHTML = '';
    const heroData = saveData[selectedHeroType];
    const pointsAvailable = heroData.level - heroData.unlocked;
    const treeData = generateHeroSkillTree(selectedHeroType);

    let title = selectedHeroType.toUpperCase() + " SKILL TREE";
    if (heroData.prestige > 0) title += ` (HARD MODE ${heroData.prestige})`;
    document.getElementById('skill-tree-title').innerText = title;
    document.getElementById('skill-points-display').innerText = `Points Available: ${pointsAvailable}`;

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
                saveData[selectedHeroType].unlocked++;
                saveGame();
                renderSkillTree();

                // Auto-select the next node (which is now available)
                // We need to wait for the DOM to update
                setTimeout(() => {
                    const focusables = getFocusables();
                    // The newly unlocked node is at index 'index' (0-based)
                    // The NEXT node (now available) is at index + 1
                    // But getFocusables returns ALL nodes now that we removed pointer-events:none
                    // So we can just select index + 1 if it exists
                    if (index + 1 < focusables.length) {
                        uiSelectionIndex = index + 1;
                        updateUIHighlight();
                    }
                }, 50);
            };
        }
        container.appendChild(el);
    });

    const prestigeBtn = document.getElementById('prestige-container');
    if (heroData.unlocked >= SKILL_TREE_SIZE) {
        prestigeBtn.style.display = 'block';
        prestigeBtn.querySelector('button').innerText = `UNLOCK HARD MODE ${heroData.prestige + 1}`;
    } else {
        prestigeBtn.style.display = 'none';
    }
}

function prestigeHero() {
    if (confirm("Are you sure? This will reset your Skill Tree progress to 0, but increase difficulty and base stats.")) {
        saveData[selectedHeroType].level = 0;
        saveData[selectedHeroType].unlocked = 0;
        saveData[selectedHeroType].prestige++;
        saveGame();
        renderSkillTree();
    }
}

function getHeroStats(type) {
    const base = JSON.parse(JSON.stringify(BASE_HERO_STATS[type]));
    const heroData = saveData[type];
    const treeData = generateHeroSkillTree(type);

    base.ultModifiers = { damage: 1, speed: 1 };

    // Apply Meta Upgrades (Permanent Shop)
    base.hp += (saveData.metaUpgrades.health || 0) * 5;
    base.rangeDmg *= (1 + (saveData.metaUpgrades.power || 0) * 0.01);
    base.meleeDmg *= (1 + (saveData.metaUpgrades.power || 0) * 0.01);
    base.speed *= (1 + (saveData.metaUpgrades.swift || 0) * 0.01);

    // Breakdown tracking
    base.breakdown = {
        damage: { tree: 0, ach: 0 },
        health: { tree: 0, ach: 0 },
        speed: { tree: 0, ach: 0 },
        cooldown: { tree: 0, ach: 0 },
        defense: { tree: 0, ach: 0 },
        projectiles: { tree: 0, ach: 0 },
        luck: { tree: 0, ach: 0 },
        explodeChance: { tree: 0, ach: 0 }
    };

    // New Stats Defaults
    base.pierce = (type === 'ice') ? 2 : 0;
    base.blastRadiusMult = 1;
    base.knockbackMult = 1;
    base.defense = 0;
    base.extraProjectiles = 0;
    base.meleeRadiusMult = 1;
    base.explodeChance = 0;
    base.goldMultiplier = 1; // Initialize gold multiplier

    const prestigeMult = 1 + (heroData.prestige * 0.2); // Reduced from 0.5 to 0.2
    base.hp *= prestigeMult;
    base.rangeDmg *= prestigeMult;
    base.meleeDmg *= prestigeMult;
    base.goldMultiplier *= prestigeMult; // Apply prestige to gold gain

    const unlockedCount = heroData.unlocked;
    for (let i = 0; i < unlockedCount; i++) {
        const node = treeData[i];
        if (node.type === 'DAMAGE') { base.rangeDmg *= (1 + node.value); base.breakdown.damage.tree += node.value; }
        if (node.type === 'HEALTH') { base.hp *= (1 + node.value); base.breakdown.health.tree += node.value; }
        if (node.type === 'SPEED') { base.speed *= (1 + node.value); base.breakdown.speed.tree += node.value; }
        if (node.type === 'COOLDOWN') {
            base.rangeCd *= (1 - node.value);
            base.meleeCd *= (1 - node.value);
            base.breakdown.cooldown.tree += node.value;
        }
        if (node.type === 'ULT_DAMAGE') base.ultModifiers.damage += node.value;
        if (node.type === 'ULT_SPEED') base.ultModifiers.speed += node.value;

        // Specifics
        if (node.type === 'BLAST') base.blastRadiusMult += node.value;
        if (node.type === 'EXPLODE_CHANCE') { base.explodeChance += node.value; base.breakdown.explodeChance.tree += node.value; }
        if (node.type === 'KNOCK') base.knockbackMult += node.value;
        if (node.type === 'PIERCE') base.pierce += node.value;
        if (node.type === 'SPLIT') {
            base.extraProjectiles += node.value;
            base.breakdown.projectiles.tree += node.value;
            // Nerf damage for each split node taken (compounding 20% reduction)
            for (let k = 0; k < node.value; k++) {
                base.rangeDmg *= 0.8;
            }
        }
        if (node.type === 'ARMOR') { base.defense += node.value; base.breakdown.defense.tree += node.value; }
        if (node.type === 'MELEE') base.meleeRadiusMult += node.value;
    }

    // Apply Achievement Bonuses
    saveData.global.unlockedAchievements.forEach(id => {
        const ach = ACHIEVEMENTS.find(a => a.id === id);
        if (ach) {
            if (ach.bonus.type === 'damage') { base.rangeDmg *= (1 + ach.bonus.val); base.breakdown.damage.ach += ach.bonus.val; }
            if (ach.bonus.type === 'health') { base.hp *= (1 + ach.bonus.val); base.breakdown.health.ach += ach.bonus.val; }
            if (ach.bonus.type === 'gold') { base.goldMultiplier += ach.bonus.val; } // Note: Gold isn't in breakdown yet, but works

            // NEW TYPES
            if (ach.bonus.type === 'speed') {
                base.speed *= (1 + ach.bonus.val);
                base.breakdown.speed.ach += ach.bonus.val;
            }
            if (ach.bonus.type === 'cooldown') {
                base.rangeCd *= (1 - ach.bonus.val);
                base.meleeCd *= (1 - ach.bonus.val);
                base.breakdown.cooldown.ach += ach.bonus.val;
            }
        }
    });

    base.hp = Math.floor(base.hp);
    return base;
}

function getHeroTheme(type) {
    if (type === 'fire') return { bg: '#2c0b0b', grid: '#521818' };
    if (type === 'water') return { bg: '#0b1a2c', grid: '#183652' };
    if (type === 'ice') return { bg: '#1a252a', grid: '#2c3e50' };
    if (type === 'plant') return { bg: '#0b2c14', grid: '#185226' };
    if (type === 'metal') return { bg: '#1a1a1a', grid: '#333' };
    return { bg: '#1a1a1a', grid: '#333' };
}

// --- Game State ---
let gameRunning = false;
let gamePaused = false;
let isLevelingUp = false;
let isShopping = false;
let isStatsOpen = false;

let score = 0;
let wave = 1;
let frame = 0;
let enemiesKilledInWave = 0;
let bossActive = false;
let bossDeathTimer = 0; // Timer for slow-mo effect

// Weather
let currentWeather = null;
let weatherTimer = 3600; // Time until next weather
let weatherDuration = 0;

let player;
let projectiles = [];
let enemies = [];
let particles = [];
let floatingTexts = []; // New array for damage numbers
let meleeAttacks = [];
let powerUps = [];
let weaponDrops = [];
let holyMasks = [];
let goldDrops = [];
let cardDrops = [];
let obstacles = [];
let biomeZones = [];

// Story Manager
const storyManager = new StoryManager();
let isStoryOpen = false;

// Input
const keys = {};
const mouse = { x: 0, y: 0, leftDown: false, rightDown: false }; // Updated mouse object

window.addEventListener('keydown', e => keys[e.key.toLowerCase()] = true);
window.addEventListener('keyup', e => keys[e.key.toLowerCase()] = false);
window.addEventListener('mousemove', e => {
    mouse.x = e.clientX;
    mouse.y = e.clientY;
    // If mouse moves, switch back to mouse aiming
    if (player) player.usingGamepad = false;
});

// Updated Mouse Listeners for Auto-Fire support
window.addEventListener('mousedown', e => {
    if (!gameRunning || gamePaused || isLevelingUp || isShopping) return;
    if (e.button === 0) mouse.leftDown = true;
    if (e.button === 2) mouse.rightDown = true;
});
window.addEventListener('mouseup', e => {
    if (e.button === 0) mouse.leftDown = false;
    if (e.button === 2) mouse.rightDown = false;
});
window.addEventListener('contextmenu', e => e.preventDefault());

window.addEventListener('keydown', e => {
    if (e.code === 'Escape' && gameRunning && !isLevelingUp && !isShopping) {
        togglePause();
    }
    if (e.code === 'Space' && gameRunning && !gamePaused && !isLevelingUp && !isShopping) {
        player.melee();
    }
    if ((e.code === 'ShiftLeft' || e.code === 'ShiftRight') && gameRunning && !gamePaused && !isShopping) {
        player.dash();
    }
    if (e.code === 'KeyE' && gameRunning && !gamePaused && !isShopping) {
        player.useSpecial();
    }
    // DEBUG: Kill Player with 'K'
    if (e.code === 'KeyK' && gameRunning && !gamePaused) {
        player.hp = -999;
        showNotification("DEBUG: SUICIDE");
    }
    // DEBUG: Next Wave with 'N'
    if (e.code === 'KeyN' && gameRunning && !gamePaused) {
        enemies = [];
        bossActive = false;
        projectiles = [];

        if (wave % 2 === 0) {
            openShop();
        } else {
            wave++;
            enemiesKilledInWave = 0;
            const types = ['fire', 'water', 'ice', 'plant', 'metal'];
            currentBiomeType = types[Math.floor(Math.random() * types.length)];
            showNotification(`DEBUG: SKIPPED TO WAVE ${wave}`);
            generateArena();
            if (player) {
                player.x = canvas.width / 2;
                player.y = canvas.height / 2;
            }
        }
    }

    // DEBUG: Spawn Boss with 'B'
    if (e.code === 'KeyB' && gameRunning && !gamePaused && !bossActive) {
        enemiesKilledInWave = ENEMIES_PER_WAVE * wave;
        showNotification("DEBUG: BOSS SPAWNED");
    }
});

function togglePause() {
    gamePaused = !gamePaused;
    document.getElementById('pause-screen').style.display = gamePaused ? 'flex' : 'none';
    setUIState(gamePaused ? 'PAUSE' : 'GAME');
}

function renderStatsTable(container) {
    if (!player) return;

    const bd = player.stats.breakdown;
    const run = player.runBuffs;

    const rows = [
        { label: 'Damage', tree: (bd.damage.tree * 100).toFixed(0) + '%', ach: (bd.damage.ach * 100).toFixed(0) + '%', run: (run.damage * 100).toFixed(0) + '%' },
        { label: 'Max HP', tree: (bd.health.tree * 100).toFixed(0) + '%', ach: (bd.health.ach * 100).toFixed(0) + '%', run: '+' + run.maxHp },
        { label: 'Speed', tree: (bd.speed.tree * 100).toFixed(0) + '%', ach: (bd.speed.ach * 100).toFixed(0) + '%', run: (run.speed * 100).toFixed(0) + '%' },
        { label: 'Cooldown Red.', tree: (bd.cooldown.tree * 100).toFixed(0) + '%', ach: (bd.cooldown.ach * 100).toFixed(0) + '%', run: (run.cooldown * 100).toFixed(0) + '%' },
        { label: 'Defense', tree: (bd.defense.tree * 100).toFixed(0) + '%', ach: (bd.defense.ach * 100).toFixed(0) + '%', run: (run.defense * 100).toFixed(0) + '%' },
        { label: 'Projectiles', tree: '+' + bd.projectiles.tree, ach: '+' + bd.projectiles.ach, run: '+' + run.projectiles },
        { label: 'Luck', tree: (bd.luck.tree * 100).toFixed(0) + '%', ach: (bd.luck.ach * 100).toFixed(0) + '%', run: (run.luck * 100).toFixed(0) + '%' },
        { label: 'Explode Chance', tree: (bd.explodeChance.tree * 100).toFixed(0) + '%', ach: '-', run: '-' }
    ];

    let html = `
        <table class="detailed-stats-table">
            <thead>
                <tr>
                    <th>Stat</th>
                    <th>Skill Tree</th>
                    <th>Achievements</th>
                    <th>Current Run</th>
                </tr>
            </thead>
            <tbody>
    `;

    rows.forEach(r => {
        html += `<tr>
            <td>${r.label}</td>
            <td>${r.tree}</td>
            <td>${r.ach}</td>
            <td style="color: #2ecc71; font-weight: bold;">${r.run}</td>
        </tr>`;
    });

    html += `</tbody></table>`;
    container.innerHTML = html;
}

function showNotification(text) {
    const div = document.createElement('div');
    div.className = 'notif';
    div.innerText = text;
    document.getElementById('notification-area').appendChild(div);
    setTimeout(() => div.remove(), 2000);
}

// --- Daily Challenge Logic ---
let activeMutators = [];
let isDailyMode = false;

function getDailySeed() {
    const now = new Date();
    // Create a unique integer for the day (YYYYMMDD)
    return parseInt(`${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, '0')}${String(now.getDate()).padStart(2, '0')}`);
}

function getDailyMutators() {
    const seed = getDailySeed();
    // Simple seeded random
    const random = (seed) => {
        let x = Math.sin(seed++) * 10000;
        return x - Math.floor(x);
    };

    let currentSeed = seed;
    const count = 2 + Math.floor(random(currentSeed) * 2); // 2 or 3 mutators
    currentSeed++;

    const selected = [];
    const pool = [...MUTATORS];

    for (let i = 0; i < count; i++) {
        if (pool.length === 0) break;
        const index = Math.floor(random(currentSeed) * pool.length);
        selected.push(pool[index]);
        pool.splice(index, 1);
        currentSeed++;
    }
    return selected;
}

function startDailyChallenge() {
    const today = getDailySeed();
    if (saveData.daily && saveData.daily.lastCompleted === today) {
        alert("You have already completed today's challenge!");
        return;
    }

    activeMutators = getDailyMutators();
    isDailyMode = true;

    // Show Mutators
    let msg = "DAILY CHALLENGE MUTATORS:\n";
    activeMutators.forEach(m => msg += `- ${m.name}: ${m.desc}\n`);
    alert(msg);

    startGame('DAILY');
}

// --- Classes ---

class BiomeZone {
    constructor(x, y, w, h, type) {
        this.x = x; this.y = y; this.w = w; this.h = h;
        this.type = type; // 'LAVA', 'ICE', 'MUD', 'WATER', 'MAGNET'
    }
    draw() {
        ctx.save();
        if (this.type === 'LAVA') {
            ctx.fillStyle = 'rgba(231, 76, 60, 0.3)';
            ctx.strokeStyle = '#c0392b';
            // Pulsing effect
            ctx.globalAlpha = 0.5 + Math.sin(Date.now() / 500) * 0.2;
        } else if (this.type === 'ICE') {
            ctx.fillStyle = 'rgba(52, 152, 219, 0.2)';
            ctx.strokeStyle = '#2980b9';
        } else if (this.type === 'MUD') {
            ctx.fillStyle = 'rgba(100, 80, 50, 0.4)';
            ctx.strokeStyle = '#5d4037';
        } else if (this.type === 'WATER') {
            ctx.fillStyle = 'rgba(41, 128, 185, 0.3)';
            ctx.strokeStyle = '#2980b9';
            ctx.globalAlpha = 0.5 + Math.sin(Date.now() / 1000) * 0.1;
        } else if (this.type === 'MAGNET') {
            ctx.fillStyle = 'rgba(142, 68, 173, 0.2)';
            ctx.strokeStyle = '#8e44ad';
        }

        ctx.fillRect(this.x, this.y, this.w, this.h);
        ctx.lineWidth = 2;
        ctx.strokeRect(this.x, this.y, this.w, this.h);
        ctx.restore();
    }
}

class Obstacle {
    constructor(x, y, w, h) {
        this.x = x; this.y = y; this.w = w; this.h = h;
    }
    draw() {
        ctx.fillStyle = '#444';
        ctx.fillRect(this.x, this.y, this.w, this.h);
        ctx.strokeStyle = '#666';
        ctx.lineWidth = 2;
        ctx.strokeRect(this.x, this.y, this.w, this.h);
    }
}

class Projectile {
    constructor(x, y, velocity, damage, color, radius, type, knockback, isEnemy, isExplosive = false, isCrit = false) {
        this.x = x; this.y = y; this.velocity = velocity;
        this.damage = damage; this.color = color; this.radius = radius;
        this.type = type; this.knockback = knockback; this.isEnemy = isEnemy;
        this.isExplosive = isExplosive;
        this.isCrit = isCrit; // Store crit status
        this.pierce = (type === 'ice' && !isEnemy) ? 2 : 0;

        if (this.isCrit) {
            this.radius *= 1.5; // Visual indicator
        }
    }
    update() { this.x += this.velocity.x; this.y += this.velocity.y; }
    draw() {
        ctx.beginPath(); ctx.arc(this.x, this.y, this.radius, 0, Math.PI * 2);
        ctx.fillStyle = this.color; ctx.fill();
        ctx.shadowBlur = this.isCrit ? 20 : 10;
        ctx.shadowColor = this.isCrit ? '#fff' : this.color;
        ctx.fill(); ctx.shadowBlur = 0;

        if (this.isCrit) {
            ctx.strokeStyle = '#fff'; ctx.lineWidth = 2; ctx.stroke();
        }
    }
}

class MeleeSwipe {
    constructor(x, y, angle, damage, color, radius, isCrit = false) {
        this.x = x; this.y = y; this.angle = angle;
        this.damage = damage; this.color = color;
        this.life = 15; this.maxLife = 15;
        this.radius = radius;
        this.hitList = [];
        this.isCrit = isCrit;
    }
    update() { this.x = player.x; this.y = player.y; this.life--; }
    draw() {
        ctx.save(); ctx.translate(this.x, this.y); ctx.rotate(this.angle);
        ctx.beginPath(); ctx.arc(0, 0, this.radius, -Math.PI / 3, Math.PI / 3);
        ctx.lineWidth = (this.isCrit ? 8 : 5) * (this.life / this.maxLife);
        ctx.strokeStyle = this.isCrit ? '#f1c40f' : 'white';
        ctx.stroke();
        ctx.fillStyle = this.color; ctx.globalAlpha = 0.5 * (this.life / this.maxLife); ctx.fill();
        ctx.restore();
    }
}

class WeaponDrop {
    constructor(x, y) {
        this.x = x; this.y = y;
        this.type = WEAPON_TYPES[Math.floor(Math.random() * WEAPON_TYPES.length)];
        this.radius = 20; this.angle = 0;
    }
    draw() {
        this.angle += 0.05;
        ctx.save(); ctx.translate(this.x, this.y); ctx.rotate(this.angle);
        ctx.fillStyle = '#8e44ad'; ctx.fillRect(-15, -15, 30, 30);
        ctx.strokeStyle = '#fff'; ctx.lineWidth = 2; ctx.strokeRect(-15, -15, 30, 30);
        ctx.fillStyle = 'white'; ctx.font = 'bold 20px Arial'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
        ctx.fillText('W', 0, 0); ctx.restore();
    }
}

class GoldDrop {
    constructor(x, y) {
        this.x = x; this.y = y; this.radius = 10; this.angle = 0;
        this.value = Math.floor(Math.random() * 10) + 5;
    }
    draw() {
        this.angle += 0.1;
        ctx.save(); ctx.translate(this.x, this.y); ctx.rotate(this.angle);
        ctx.fillStyle = '#f1c40f';
        ctx.beginPath(); ctx.arc(0, 0, 8, 0, Math.PI * 2); ctx.fill();
        ctx.strokeStyle = '#f39c12'; ctx.lineWidth = 2; ctx.stroke();
        ctx.fillStyle = 'black'; ctx.font = 'bold 10px Arial'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
        ctx.fillText('$', 0, 1); ctx.restore();
    }
}

class CardDrop {
    constructor(x, y, cardKey) {
        this.x = x; this.y = y; this.cardKey = cardKey;
        this.angle = 0;
        this.scale = 1;
        this.scaleDir = 0.01;
    }
    draw() {
        this.angle += 0.02;
        this.scale += this.scaleDir;
        if (this.scale > 1.1 || this.scale < 0.9) this.scaleDir *= -1;

        ctx.save();
        ctx.translate(this.x, this.y);
        ctx.rotate(this.angle);
        ctx.scale(this.scale, this.scale);

        // Card Body
        ctx.fillStyle = '#fff';
        ctx.fillRect(-10, -14, 20, 28);
        ctx.strokeStyle = '#000';
        ctx.lineWidth = 1;
        ctx.strokeRect(-10, -14, 20, 28);

        // Inner Design
        const card = COLLECTOR_CARDS[this.cardKey];
        ctx.fillStyle = card ? card.color : '#333';
        ctx.fillRect(-8, -12, 16, 24);

        // Icon/Text
        ctx.fillStyle = '#fff';
        ctx.font = 'bold 14px Arial';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText('C', 0, 1);

        ctx.restore();
    }
}

class HolyMask {
    constructor(x, y) {
        this.x = x; this.y = y; this.radius = 20; this.angle = 0;
    }
    draw() {
        this.angle += 0.05;
        ctx.save(); ctx.translate(this.x, this.y); ctx.rotate(this.angle);
        ctx.fillStyle = '#f1c40f'; // Gold
        ctx.beginPath(); ctx.arc(0, 0, 15, 0, Math.PI * 2); ctx.fill();
        ctx.strokeStyle = '#fff'; ctx.lineWidth = 2; ctx.stroke();
        // Eyes
        ctx.fillStyle = 'black';
        ctx.beginPath(); ctx.arc(-5, -2, 3, 0, Math.PI * 2); ctx.fill();
        ctx.beginPath(); ctx.arc(5, -2, 3, 0, Math.PI * 2); ctx.fill();
        ctx.restore();
    }
}

class PowerUp {
    constructor() {
        let safe = false;
        while (!safe) {
            this.x = Math.random() * (canvas.width - 100) + 50;
            this.y = Math.random() * (canvas.height - 100) + 50;
            if (!checkWallCollision(this.x, this.y, 15)) safe = true;
        }
        this.type = POWERUP_TYPES[Math.floor(Math.random() * POWERUP_TYPES.length)];
        this.radius = 15; this.timer = 600; this.oscillation = Math.random() * Math.PI;
    }
    update() { this.timer--; }
    draw() {
        ctx.save(); ctx.translate(this.x, this.y + Math.sin(frame * 0.1 + this.oscillation) * 5);
        ctx.shadowBlur = 15; ctx.shadowColor = 'white';
        let color = '#fff'; let symbol = '?';
        if (this.type === 'HEAL') { color = '#2ecc71'; symbol = '+'; }
        else if (this.type === 'MAXHP') { color = '#e74c3c'; symbol = '♥'; }
        else if (this.type === 'SPEED') { color = '#f1c40f'; symbol = '⚡'; }
        else if (this.type === 'MULTI') { color = '#3498db'; symbol = '⁙'; }
        else if (this.type === 'AUTOAIM') { color = '#9b59b6'; symbol = '🎯'; }
        ctx.fillStyle = color; ctx.beginPath(); ctx.arc(0, 0, this.radius, 0, Math.PI * 2); ctx.fill();
        ctx.fillStyle = 'white'; ctx.font = 'bold 16px Arial'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
        ctx.fillText(symbol, 0, 1); ctx.restore();
    }
}

class Particle {
    constructor(x, y, color) {
        this.x = x; this.y = y; this.color = color;
        this.velocity = { x: (Math.random() - 0.5) * 5, y: (Math.random() - 0.5) * 5 };
        this.alpha = 1; this.life = Math.random() * 0.05 + 0.02;
    }
    update() { this.x += this.velocity.x; this.y += this.velocity.y; this.alpha -= this.life; }
    draw() {
        ctx.save(); ctx.globalAlpha = this.alpha; ctx.fillStyle = this.color;
        ctx.beginPath(); ctx.arc(this.x, this.y, 3, 0, Math.PI * 2); ctx.fill(); ctx.restore();
    }
}

// New Floating Text Class
class FloatingText {
    constructor(x, y, text, color, size) {
        this.x = x; this.y = y;
        this.text = text;
        this.color = color;
        this.size = size;
        this.life = 60;
        this.velocity = { x: (Math.random() - 0.5) * 2, y: -2 };
    }
    update() {
        this.x += this.velocity.x;
        this.y += this.velocity.y;
        this.life--;
        this.velocity.y *= 0.9; // Gravity-ish drag
    }
    draw() {
        ctx.save();
        ctx.globalAlpha = Math.max(0, this.life / 60);
        ctx.fillStyle = this.color;
        ctx.font = `bold ${this.size}px Arial`;
        ctx.strokeStyle = 'black';
        ctx.lineWidth = 3;
        ctx.strokeText(this.text, this.x, this.y);
        ctx.fillText(this.text, this.x, this.y);
        ctx.restore();
    }
}

// --- Helper Functions ---
function shadeColor(color, percent) {
    var R = parseInt(color.substring(1, 3), 16); var G = parseInt(color.substring(3, 5), 16); var B = parseInt(color.substring(5, 7), 16);
    R = parseInt(R * (100 + percent) / 100); G = parseInt(G * (100 + percent) / 100); B = parseInt(B * (100 + percent) / 100);
    R = (R < 255) ? R : 255; G = (G < 255) ? G : 255; B = (B < 255) ? B : 255;
    var RR = ((R.toString(16).length == 1) ? "0" + R.toString(16) : R.toString(16));
    var GG = ((G.toString(16).length == 1) ? "0" + G.toString(16) : G.toString(16));
    var BB = ((B.toString(16).length == 1) ? "0" + B.toString(16) : B.toString(16));
    return "#" + RR + GG + BB;
}

function createExplosion(x, y, color) {
    for (let i = 0; i < 8; i++) { particles.push(new Particle(x, y, color)); }
}

function generateArena() {
    obstacles = [];
    biomeZones = [];
    const layout = Math.floor(Math.random() * 5); // Increased to 5 layouts
    const cx = canvas.width / 2;
    const cy = canvas.height / 2;
    const safeZone = 150;

    // --- Biome Generation ---
    // Based on currentBiomeType (randomized per wave)
    const type = currentBiomeType;

    if (type === 'fire') {
        // Lava Pools
        biomeZones.push(new BiomeZone(cx - 300, cy - 300, 150, 150, 'LAVA'));
        biomeZones.push(new BiomeZone(cx + 150, cy + 150, 150, 150, 'LAVA'));
    } else if (type === 'ice') {
        // Ice Patches (Slippery/Fast)
        biomeZones.push(new BiomeZone(cx - 400, cy - 100, 200, 200, 'ICE'));
        biomeZones.push(new BiomeZone(cx + 200, cy - 100, 200, 200, 'ICE'));
    } else if (type === 'plant') {
        // Mud/Swamp (Slow)
        biomeZones.push(new BiomeZone(cx - 200, cy - 200, 400, 100, 'MUD'));
        biomeZones.push(new BiomeZone(cx - 200, cy + 100, 400, 100, 'MUD'));
    } else if (type === 'water') {
        // Deep Water (Slow + Push?) - For now just visual + slight slow
        biomeZones.push(new BiomeZone(0, cy - 100, canvas.width, 200, 'WATER'));
    } else if (type === 'metal') {
        // Magnetic Zones
        biomeZones.push(new BiomeZone(cx - 100, cy - 100, 200, 200, 'MAGNET'));
    }

    if (layout === 0) {
        obstacles.push(new Obstacle(canvas.width * 0.2, canvas.height * 0.2, 100, 100));
        obstacles.push(new Obstacle(canvas.width * 0.8 - 100, canvas.height * 0.2, 100, 100));
        obstacles.push(new Obstacle(canvas.width * 0.2, canvas.height * 0.8 - 100, 100, 100));
        obstacles.push(new Obstacle(canvas.width * 0.8 - 100, canvas.height * 0.8 - 100, 100, 100));
    } else if (layout === 1) {
        obstacles.push(new Obstacle(cx - 300, cy - 50, 100, 100));
        obstacles.push(new Obstacle(cx + 200, cy - 50, 100, 100));
    } else if (layout === 2) {
        obstacles.push(new Obstacle(canvas.width * 0.3, 0, 50, canvas.height * 0.4));
        obstacles.push(new Obstacle(canvas.width * 0.7, canvas.height * 0.6, 50, canvas.height * 0.4));
    } else if (layout === 3) {
        // Central Block
        obstacles.push(new Obstacle(cx - 50, cy - 50, 100, 100));
    } else if (layout === 4) {
        // Scattered Small Blocks
        for (let i = 0; i < 6; i++) {
            const x = Math.random() * (canvas.width - 100);
            const y = Math.random() * (canvas.height - 100);
            // Avoid center
            if (Math.hypot(x - cx, y - cy) > 200) {
                obstacles.push(new Obstacle(x, y, 60, 60));
            }
        }
    }

    obstacles = obstacles.filter(obs => {
        const margin = 60;
        const playerRect = { x: cx - margin, y: cy - margin, w: margin * 2, h: margin * 2 };
        return !(playerRect.x < obs.x + obs.w &&
            playerRect.x + playerRect.w > obs.x &&
            playerRect.y < obs.y + obs.h &&
            playerRect.y + playerRect.h > obs.y);
    });

    // TINY ARENA MUTATOR
    if (typeof activeMutators !== 'undefined' && activeMutators.some(m => m.id === 'TINY_ARENA')) {
        const w = canvas.width;
        const h = canvas.height;
        const border = 0.25; // 25% border on each side -> 50% playable area

        // Top
        obstacles.push(new Obstacle(0, 0, w, h * border));
        // Bottom
        obstacles.push(new Obstacle(0, h * (1 - border), w, h * border));
        // Left
        obstacles.push(new Obstacle(0, 0, w * border, h));
        // Right
        obstacles.push(new Obstacle(w * (1 - border), 0, w * border, h));
    }
}

function checkWallCollision(x, y, r) {
    for (let obs of obstacles) {
        let closestX = Math.max(obs.x, Math.min(x, obs.x + obs.w));
        let closestY = Math.max(obs.y, Math.min(y, obs.y + obs.h));
        let dx = x - closestX; let dy = y - closestY;
        if ((dx * dx + dy * dy) < (r * r)) return true;
    }
    return false;
}

function drawArena() {
    const theme = getHeroTheme(player ? player.type : selectedHeroType);
    ctx.fillStyle = theme.bg; ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.strokeStyle = theme.grid; ctx.lineWidth = 2; const tileSize = 80;
    ctx.beginPath();
    for (let x = 0; x <= canvas.width; x += tileSize) { ctx.moveTo(x, 0); ctx.lineTo(x, canvas.height); }
    for (let y = 0; y <= canvas.height; y += tileSize) { ctx.moveTo(0, y); ctx.lineTo(canvas.width, y); }
    ctx.stroke();

    // Draw Biome Zones (Under obstacles)
    biomeZones.forEach(zone => zone.draw());

    obstacles.forEach(obs => obs.draw());
    ctx.save(); ctx.translate(canvas.width / 2, canvas.height / 2);
    ctx.beginPath(); ctx.arc(0, 0, 120, 0, Math.PI * 2); ctx.strokeStyle = bossActive ? '#c0392b' : '#444'; ctx.lineWidth = 15; ctx.stroke();
    ctx.beginPath(); ctx.arc(0, 0, 30, 0, Math.PI * 2); ctx.fillStyle = bossActive ? '#c0392b' : '#444'; ctx.fill();
    ctx.restore();
}

function updateUI() {
    document.getElementById('scoreVal').innerText = score;
    document.getElementById('waveVal').innerText = wave;
    document.getElementById('goldVal').innerText = player.gold;

    let weaponText = player.weapon;
    if (player.weapon !== 'STANDARD') {
        weaponText += ` (LVL ${player.weaponTier})`;
    }
    document.getElementById('weapon-display').innerText = weaponText;

    // Update Special Ability UI
    const specialPercent = Math.max(0, (player.specialCooldown / player.specialMaxCooldown) * 100);
    document.getElementById('special-cooldown-overlay').style.height = specialPercent + '%';
    if (player.specialCooldown <= 0) {
        document.getElementById('special-icon').style.opacity = 1;
        document.getElementById('special-container').style.borderColor = '#f1c40f';
    } else {
        document.getElementById('special-icon').style.opacity = 0.5;
        document.getElementById('special-container').style.borderColor = '#555';
    }

    // Update Stats Row
    document.getElementById('stats-row').innerHTML = `
        <span style="color:#e74c3c">⚔️ ${player.damageMultiplier.toFixed(2)}x</span>
        <span style="color:#f1c40f">👟 ${player.speedMultiplier.toFixed(2)}x</span>
        <span style="color:#3498db">⏳ ${player.cooldownMultiplier.toFixed(2)}x</span>
        <span style="color:#9b59b6">💥 ${(player.critChance * 100).toFixed(0)}%</span>
    `;

    const comboEl = document.getElementById('combo-display');
    if (player.combo > 0) {
        comboEl.innerText = `COMBO x${player.combo}`;
        comboEl.style.opacity = 1;
        comboEl.style.transform = `scale(${1 + Math.min(0.5, player.combo / 100)})`;
    } else {
        comboEl.style.opacity = 0;
    }

    const hpPercent = Math.max(0, (player.hp / player.maxHp) * 100);
    document.getElementById('health-fill').style.width = hpPercent + '%';
    document.getElementById('health-text').innerText = Math.ceil(player.hp) + " / " + player.maxHp;

    const xpPercent = Math.min(100, (player.xp / player.maxXp) * 100);
    document.getElementById('xp-fill').style.width = xpPercent + '%';
    document.getElementById('xp-text').innerText = "Level " + player.level;

    const meleePercent = Math.max(0, 100 - (player.meleeCooldown / player.meleeMaxCooldown * 100));
    document.getElementById('melee-fill').style.width = meleePercent + '%';
    document.getElementById('melee-text').innerText = player.meleeCooldown <= 0 ? "MELEE READY" : "RECHARGING";

    const bossContainer = document.getElementById('boss-hp-container');
    if (bossActive && enemies.length > 0 && enemies[0] instanceof Boss) {
        bossContainer.style.display = 'block';
        const boss = enemies[0];
        const bossHpPercent = Math.max(0, (boss.hp / boss.maxHp) * 100);
        document.getElementById('boss-hp-fill').style.width = bossHpPercent + '%';
    } else {
        bossContainer.style.display = 'none';
    }

    buffContainer.innerHTML = '';
    if (player.buffs.speed > 0) {
        const div = document.createElement('div'); div.className = 'buff-icon';
        div.style.backgroundColor = '#f1c40f'; div.style.color = 'black'; div.innerText = '⚡';
        buffContainer.appendChild(div);
    }
    if (player.buffs.multi > 0) {
        const div = document.createElement('div'); div.className = 'buff-icon';
        div.style.backgroundColor = '#3498db'; div.style.color = 'white'; div.innerText = '⁙';
        buffContainer.appendChild(div);
    }
    if (player.buffs.autoaim > 0) {
        const div = document.createElement('div'); div.className = 'buff-icon';
        div.style.backgroundColor = '#9b59b6'; div.style.color = 'white'; div.innerText = '🎯';
        buffContainer.appendChild(div);
    }
}

function chooseUpgrade(type) {
    if (type === 'health') {
        player.maxHp += 25;
        player.hp = Math.min(player.maxHp, player.hp + (player.maxHp * 0.2));
        player.runBuffs.maxHp += 25;
    }
    else if (type === 'radius') { player.meleeRadius *= 1.25; }
    else if (type === 'projectile') { player.extraProjectiles += 1; player.runBuffs.projectiles += 1; }
    else if (type === 'speed') { player.speedMultiplier += 0.1; player.runBuffs.speed += 0.1; }
    else if (type === 'cooldown') { player.cooldownMultiplier *= 0.9; player.runBuffs.cooldown += 0.1; }
    else if (type === 'defense') { player.damageReduction = Math.min(0.5, player.damageReduction + 0.05); player.runBuffs.defense += 0.05; }
    else if (type === 'damage') { player.damageMultiplier += 0.1; player.runBuffs.damage += 0.1; }
    else if (type === 'luck') { player.maskChance += 0.005; player.runBuffs.luck += 0.005; }
    else if (type === 'crit') { player.critChance += 0.05; player.critMultiplier += 0.2; } // New Upgrade logic if added to pool
    else if (type === 'transform') {
        player.transformActive = true;
        player.currentForm = player.getFormName();
        showNotification(`${player.currentForm} ACTIVATED!`);
        createExplosion(player.x, player.y, '#fff');
    }

    isLevelingUp = false;
    document.getElementById('levelup-screen').style.display = 'none';
    setUIState('GAME');
}

// --- Shop Logic ---
function openShop() {
    isShopping = true;
    document.getElementById('shop-screen').style.display = 'flex';
    document.getElementById('shopGoldVal').innerText = player.gold;
    const container = document.getElementById('shop-container');
    container.innerHTML = '';

    const items = [
        { id: 'heal', name: 'Health Potion', cost: 100, desc: 'Heal 50 HP', action: () => { player.hp = Math.min(player.hp + 50, player.maxHp); } },
        { id: 'dmg', name: 'Sharpening Stone', cost: 250, desc: '+5% Damage', action: () => { player.damageMultiplier += 0.05; player.runBuffs.damage += 0.05; } },
        { id: 'spd', name: 'Light Boots', cost: 200, desc: '+5% Speed', action: () => { player.speedMultiplier += 0.05; player.runBuffs.speed += 0.05; } },
        { id: 'hp', name: 'Heart Container', cost: 300, desc: '+20 Max HP', action: () => { player.maxHp += 20; player.hp += 20; player.runBuffs.maxHp += 20; } }
    ];

    items.forEach(item => {
        const div = document.createElement('div');
        div.className = 'shop-item';
        div.innerHTML = `
            <div style="font-size: 24px; font-weight: bold; color: #fff;">${item.name}</div>
            <div style="color: #aaa; margin: 5px 0;">${item.desc}</div>
            <div class="shop-cost">${item.cost} Gold</div>
        `;
        div.onclick = () => {
            if (player.gold >= item.cost) {
                player.gold -= item.cost;
                currentRunStats.moneySpent += item.cost; // Track Spent
                item.action();
                document.getElementById('shopGoldVal').innerText = player.gold;
                showNotification("Purchased!");
            } else {
                showNotification("Not enough Gold!");
            }
        };
        container.appendChild(div);
    });
    setUIState('SHOP');
}

function closeShop() {
    isShopping = false;
    document.getElementById('shop-screen').style.display = 'none';

    advanceWave();
}

// --- Story Logic ---
function triggerStory(completedWave) {
    // Check if story mode is enabled or if it's daily mode
    if ((saveData.story && saveData.story.enabled === false) || isDailyMode) {
        // Skip story
        if (wave % 2 === 0) {
            openShop();
        } else {
            advanceWave();
        }
        return;
    }

    const story = storyManager.getStoryForWave(completedWave);
    if (story) {
        openStory(story);
    } else {
        // Fallback if no story (shouldn't happen with procedural)
        advanceWave();
    }
}

function openStory(story) {
    isStoryOpen = true;
    document.getElementById('story-screen').style.display = 'flex';
    document.getElementById('story-title').innerText = story.title;
    document.getElementById('story-text').innerText = story.text;
    setUIState('STORY');

    // Save progress
    if (!saveData.story.unlockedChapters.includes(story.wave)) {
        saveData.story.unlockedChapters.push(story.wave);
        saveGame();
    }
}

function closeStory() {
    isStoryOpen = false;
    document.getElementById('story-screen').style.display = 'none';

    // Proceed to Shop or Next Wave
    if (wave % 2 === 0) {
        openShop();
    } else {
        advanceWave();
    }
}

function advanceWave() {
    wave++;
    enemiesKilledInWave = 0;
    enemies = [];
    bossActive = false;

    // Randomize Biome
    const types = ['fire', 'water', 'ice', 'plant', 'metal'];
    currentBiomeType = types[Math.floor(Math.random() * types.length)];
    showNotification(`BIOME SHIFT: ${currentBiomeType.toUpperCase()}`);

    generateArena();

    // Reset Player Position to Center
    if (player) {
        player.x = canvas.width / 2;
        player.y = canvas.height / 2;
    }
    setUIState('GAME');
}

function checkAchievements() {
    saveData.global.totalKills++;
    saveData.global.totalGold = (saveData.global.totalGold || 0) + 1;
    if (wave > saveData.global.maxWave) saveData.global.maxWave = wave;
    if (currentRunStats.maxCombo > (saveData.global.maxCombo || 0)) saveData.global.maxCombo = currentRunStats.maxCombo;

    // Calculate Dynamic Stats
    const totalSkills = ['fire', 'water', 'ice', 'plant', 'metal'].reduce((acc, h) => acc + (saveData[h].unlocked || 0), 0);
    const totalPrestige = ['fire', 'water', 'ice', 'plant', 'metal'].reduce((acc, h) => acc + (saveData[h].prestige || 0), 0);

    ACHIEVEMENTS.forEach(ach => {
        if (!saveData.global.unlockedAchievements.includes(ach.id)) {
            let unlocked = false;

            // Direct Global Stats
            if (ach.stat === 'totalKills' && saveData.global.totalKills >= ach.req) unlocked = true;
            if (ach.stat === 'maxWave' && saveData.global.maxWave >= ach.req) unlocked = true;
            if (ach.stat === 'totalGold' && saveData.global.totalGold >= ach.req) unlocked = true;
            if (ach.stat === 'totalBosses' && saveData.global.totalBosses >= ach.req) unlocked = true;
            if (ach.stat === 'totalDamage' && saveData.global.totalDamage >= ach.req) unlocked = true;
            if (ach.stat === 'maxCombo' && saveData.global.maxCombo >= ach.req) unlocked = true;
            if (ach.stat === 'totalGames' && (saveData.global.totalGames || 0) >= ach.req) unlocked = true;
            if (ach.stat === 'totalDeaths' && (saveData.global.totalDeaths || 0) >= ach.req) unlocked = true;
            if (ach.stat === 'totalVoidGoldSpent' && (saveData.global.totalVoidGoldSpent || 0) >= ach.req) unlocked = true;

            // Calculated Stats
            if (ach.stat === 'calculated_skills' && totalSkills >= ach.req) unlocked = true;
            if (ach.stat === 'calculated_prestige' && totalPrestige >= ach.req) unlocked = true;

            if (unlocked) {
                saveData.global.unlockedAchievements.push(ach.id);
                showNotification(`ACHIEVEMENT: ${ach.title}`);
                saveGame();
            }
        }
    });
}

// --- Main Loop ---

function startGame(mode = 'NORMAL') {
    player = new Player(selectedHeroType);
    score = 0;
    wave = 1;
    enemiesKilledInWave = 0;
    bossActive = false;
    enemies = [];
    projectiles = [];
    particles = [];
    floatingTexts = [];
    meleeAttacks = [];
    powerUps = [];
    weaponDrops = [];
    holyMasks = [];
    goldDrops = [];
    cardDrops = [];
    gameRunning = true;
    gamePaused = false;
    isLevelingUp = false;
    isShopping = false;
    currentWeather = null;
    weatherTimer = 3600; // Start with 1 minute clear weather

    // Reset Stats
    currentRunStats = {
        missilesFired: 0,
        startTime: Date.now(),
        damageTaken: 0,
        damageDealt: 0,
        moneyGained: 0,
        moneySpent: 0,
        enemiesKilled: 0,
        bossesKilled: 0,
        maxCombo: 0
    };

    // Mode Handling
    if (mode === 'NORMAL') {
        isDailyMode = false;
        activeMutators = [];
    }
    // Daily mode is set in startDailyChallenge

    // Apply Mutators (Initial)
    if (isDailyMode) {
        if (activeMutators.some(m => m.id === 'FRAGILE')) {
            player.maxHp = 1;
            player.hp = 1;
            player.damageMultiplier *= 5;
        }
        if (activeMutators.some(m => m.id === 'SLUG')) {
            player.speedMultiplier *= 0.5;
            player.damageMultiplier += 2; // +200%
        }
    }

    currentBiomeType = selectedHeroType; // Start in home biome
    generateArena();

    document.getElementById('menu-overlay').style.display = 'none';
    document.getElementById('start-screen').style.display = 'none';
    document.getElementById('game-over-screen').style.display = 'none';
    document.getElementById('pause-screen').style.display = 'none';
    document.getElementById('levelup-screen').style.display = 'none';
    document.getElementById('shop-screen').style.display = 'none';

    setUIState('GAME'); // Set State
}

function gameOver() {
    gameRunning = false;

    // Safety: Ensure stats object exists
    if (!saveData.stats) saveData.stats = {};

    // Track Games and Deaths
    saveData.global.totalGames = (saveData.global.totalGames || 0) + 1;
    saveData.global.totalDeaths = (saveData.global.totalDeaths || 0) + 1;

    checkAchievements();

    document.getElementById('menu-overlay').style.display = 'flex';

    // Show Screen
    const screen = document.getElementById('game-over-screen');
    if (screen) screen.style.display = 'flex';

    // 1. Header & Score
    const heroData = saveData[player.type];
    const isHighScore = score > heroData.highScore;
    if (isHighScore) heroData.highScore = score;

    document.getElementById('go-score-val').innerText = score.toLocaleString();
    document.getElementById('go-highscore-msg').style.display = isHighScore ? 'block' : 'none';

    // 2. Prepare Stats Data
    const timeSurvivedMs = Date.now() - (currentRunStats.startTime || Date.now());
    const timeSurvivedSec = Math.floor(timeSurvivedMs / 1000);
    const fmtTime = s => `${Math.floor(s / 60)}:${(s % 60).toString().padStart(2, '0')}`;

    const runStatsList = [
        { label: "Time Survived", val: fmtTime(timeSurvivedSec), key: 'timeSurvived', raw: timeSurvivedSec },
        { label: "Waves Cleared", val: wave - 1, key: 'wavesCleared', raw: wave - 1 },
        { label: "Level Reached", val: player.level, key: 'levelReached', raw: player.level },
        { label: "Enemies Killed", val: currentRunStats.enemiesKilled, key: 'enemiesKilled', raw: currentRunStats.enemiesKilled },
        { label: "Damage Dealt", val: Math.floor(currentRunStats.damageDealt).toLocaleString(), key: 'damageDealt', raw: currentRunStats.damageDealt },
        { label: "Gold Gained", val: currentRunStats.moneyGained, key: 'moneyGained', raw: currentRunStats.moneyGained },
        { label: "Max Combo", val: currentRunStats.maxCombo, key: 'maxCombo', raw: currentRunStats.maxCombo },
        { label: "Bosses Killed", val: currentRunStats.bossesKilled, key: 'bossesKilled', raw: currentRunStats.bossesKilled }
    ];

    const buildStatsList = [
        { label: "Max HP", val: Math.floor(player.maxHp) },
        { label: "Damage", val: "x" + player.damageMultiplier.toFixed(2) },
        { label: "Speed", val: Math.floor(player.stats.speed * player.speedMultiplier) },
        { label: "Crit Chance", val: (player.critChance * 100).toFixed(0) + "%" },
        { label: "Crit Dmg", val: (player.critMultiplier * 100).toFixed(0) + "%" },
        { label: "Cooldown", val: ((1 - player.cooldownMultiplier) * 100).toFixed(0) + "%" },
        { label: "Defense", val: (player.damageReduction * 100).toFixed(0) + "%" }
    ];

    // 3. Render Run Stats Grid
    const gridContainer = document.getElementById('go-stats-grid');
    gridContainer.innerHTML = '';

    runStatsList.forEach(item => {
        // Check for new record
        let isNewRecord = false;
        if (item.key && item.raw > (saveData.stats[item.key] || 0)) {
            saveData.stats[item.key] = item.raw;
            isNewRecord = true;
        }

        const card = document.createElement('div');
        card.className = `stat-card ${isNewRecord ? 'record' : ''}`;
        card.innerHTML = `
            <div class="stat-label">${item.label}</div>
            <div class="stat-val">${item.val}</div>
            ${isNewRecord ? '<div class="stat-new-badge">NEW BEST</div>' : ''}
        `;
        gridContainer.appendChild(card);
    });

    // 4. Render Build Stats List
    const listContainer = document.getElementById('go-build-list');
    listContainer.innerHTML = '';

    buildStatsList.forEach(item => {
        const row = document.createElement('div');
        row.className = 'build-item';
        row.innerHTML = `
            <span class="build-label">${item.label}</span>
            <span class="build-val">${item.val}</span>
        `;
        listContainer.appendChild(row);
    });

    saveGame();
    setUIState('GAMEOVER');
}

// --- Fixed Time Step Loop ---
let lastTime = 0;
const FPS = 60;
const frameDelay = 1000 / FPS;

function masterLoop(timestamp) {

    requestAnimationFrame(masterLoop);

    // Ensure timestamp is valid (for the first manual call)
    if (!timestamp) timestamp = performance.now();

    if (!lastTime) lastTime = timestamp;
    const deltaTime = timestamp - lastTime;

    // Only run logic if enough time has passed (cap at 60 FPS)
    if (deltaTime >= frameDelay) {
        // Adjust lastTime to account for the extra time (smooths out the jitter)
        lastTime = timestamp - (deltaTime % frameDelay);

        // Always handle UI input
        handleGamepadMenu();

        if (gameRunning && !gamePaused && !isLevelingUp && !isShopping && !isStoryOpen) {

            // Boss Death Slow-Mo Sequence
            if (bossDeathTimer > 0) {
                bossDeathTimer--;

                // Slow down game logic (only run every 3rd frame)
                if (bossDeathTimer % 3 !== 0) {
                    // Still draw to keep it smooth, but don't update logic
                    ctx.clearRect(0, 0, canvas.width, canvas.height);
                    drawArena();

                    // Draw "VICTORY" text overlay
                    ctx.save();
                    ctx.fillStyle = `rgba(0, 0, 0, ${0.5 - (bossDeathTimer / 360)})`; // Fade in bg
                    ctx.fillRect(0, 0, canvas.width, canvas.height);

                    ctx.fillStyle = '#f1c40f';
                    ctx.font = 'bold 60px Arial';
                    ctx.textAlign = 'center';
                    ctx.textBaseline = 'middle';
                    ctx.shadowColor = 'black';
                    ctx.shadowBlur = 20;
                    ctx.fillText("BOSS DEFEATED", canvas.width / 2, canvas.height / 2);
                    ctx.restore();
                    return;
                }

                if (bossDeathTimer === 0) {
                    // Sequence Finished - Proceed to Next Wave/Shop

                    // Daily Challenge Win Condition
                    if (isDailyMode && wave === 10) {
                        showNotification("DAILY CHALLENGE COMPLETE!");
                        saveData.daily.lastCompleted = getDailySeed();
                        saveData.global.totalVoidGoldSpent += 0; // Just to ensure field exists
                        // Reward
                        player.gold += 5000; // Bonus Gold
                        saveData.global.totalGold += 5000;
                        saveGame();
                        setTimeout(gameOver, 3000);
                        return;
                    }

                    triggerStory(wave);
                }
            }

            ctx.clearRect(0, 0, canvas.width, canvas.height);
            drawArena();
            frame++;

            // Weather Logic
            if (currentWeather) {
                weatherDuration--;
                if (weatherDuration <= 0) {
                    currentWeather = null;
                    document.getElementById('weather-overlay').style.backgroundColor = 'transparent';
                    document.getElementById('weather-display').style.display = 'none';
                    weatherTimer = 3600 + Math.random() * 2400; // 1-1.5 minutes break
                } else {
                    // Weather Effects
                    if (currentWeather.id === 'HEATWAVE' && frame % 60 === 0) {
                        player.hp -= 1;
                        currentRunStats.damageTaken += 1; // Track Damage
                        enemies.forEach(e => e.hp -= 1);
                    }
                    if (currentWeather.id === 'MAGNETIC') {
                        enemies.forEach(e1 => {
                            enemies.forEach(e2 => {
                                if (e1 !== e2) {
                                    const d = Math.hypot(e1.x - e2.x, e1.y - e2.y);
                                    if (d < 200) {
                                        const a = Math.atan2(e2.y - e1.y, e2.x - e1.x);
                                        e1.x += Math.cos(a) * 0.5; e1.y += Math.sin(a) * 0.5;
                                    }
                                }
                            });
                        });
                    }
                }
            } else {
                weatherTimer--;
                if (weatherTimer <= 0) {
                    currentWeather = WEATHER_TYPES[Math.floor(Math.random() * WEATHER_TYPES.length)];
                    weatherDuration = currentWeather.duration;
                    document.getElementById('weather-overlay').style.backgroundColor = currentWeather.color;
                    const wDisplay = document.getElementById('weather-display');
                    wDisplay.innerText = `WARNING: ${currentWeather.name}`;
                    wDisplay.style.color = currentWeather.id === 'HEATWAVE' ? '#e74c3c' : (currentWeather.id === 'BLIZZARD' ? '#3498db' : '#9b59b6');
                    wDisplay.style.display = 'block';
                }
            }

            // --- Spawning Logic ---
            if (!bossActive && bossDeathTimer === 0 && enemiesKilledInWave >= ENEMIES_PER_WAVE * wave) {
                bossActive = true;
                if (Math.random() < 0.05) {
                    document.getElementById('event-text').style.display = 'block';
                    setTimeout(() => document.getElementById('event-text').style.display = 'none', 3000);
                    enemies.unshift(new Boss(), new Boss());
                } else {
                    enemies.unshift(new Boss());
                }
                for (let i = 0; i < 5; i++) enemies.push(new Enemy(true));
            }

            if (!bossActive && bossDeathTimer === 0) {
                let spawnRate = Math.max(5, 40 - (wave * 2));
                if (frame % spawnRate === 0) {
                    let loops = 1;
                    if (typeof activeMutators !== 'undefined' && activeMutators.some(m => m.id === 'SWARM')) loops = 2;

                    for (let l = 0; l < loops; l++) {
                        // Swarm Logic
                        if (wave > 2 && Math.random() < 0.1) {
                            for (let i = 0; i < 5; i++) {
                                const swarm = new Enemy(false, 'SWARM');
                                // Offset slightly
                                swarm.x += (Math.random() - 0.5) * 50;
                                swarm.y += (Math.random() - 0.5) * 50;
                                enemies.push(swarm);
                            }
                        } else {
                            enemies.push(new Enemy());
                        }
                    }
                }
            } else {
                if (frame % 150 === 0) enemies.push(new Enemy(true));
            }

            if (frame % 600 === 0) powerUps.push(new PowerUp());

            // --- Updates ---

            // Biome Effects on Player
            let biomeSpeedMod = 1;
            biomeZones.forEach(zone => {
                // Simple AABB collision
                if (player.x > zone.x && player.x < zone.x + zone.w &&
                    player.y > zone.y && player.y < zone.y + zone.h) {

                    // Immunity Check
                    let isImmune = false;
                    if (player.type === 'fire' && zone.type === 'LAVA') isImmune = true;
                    if (player.type === 'ice' && zone.type === 'ICE') isImmune = true;
                    if (player.type === 'plant' && zone.type === 'MUD') isImmune = true;
                    if (player.type === 'water' && zone.type === 'WATER') isImmune = true;
                    if (player.type === 'metal' && zone.type === 'MAGNET') isImmune = true;

                    if (!isImmune) {
                        if (zone.type === 'MUD') biomeSpeedMod = 0.5;
                        if (zone.type === 'ICE') biomeSpeedMod = 1.3; // Slide faster
                        if (zone.type === 'WATER') biomeSpeedMod = 0.7;

                        if (zone.type === 'LAVA' && frame % 60 === 0) {
                            player.hp -= 5 * (1 - player.damageReduction);
                            currentRunStats.damageTaken += 5;
                            createExplosion(player.x, player.y, '#e74c3c');
                            showNotification("BURNING!");
                        }

                        if (zone.type === 'MAGNET') {
                            // Pull Player towards center
                            const cx = zone.x + zone.w / 2;
                            const cy = zone.y + zone.h / 2;
                            const angle = Math.atan2(cy - player.y, cx - player.x);
                            player.x += Math.cos(angle) * 2; // Strong pull
                            player.y += Math.sin(angle) * 2;
                        }
                    }
                }

                // Biome Effects on Enemies (Always active, no immunity for them)
                if (zone.type === 'MAGNET') {
                    const cx = zone.x + zone.w / 2;
                    const cy = zone.y + zone.h / 2;
                    enemies.forEach(e => {
                        if (e.x > zone.x && e.x < zone.x + zone.w &&
                            e.y > zone.y && e.y < zone.y + zone.h) {
                            const angle = Math.atan2(cy - e.y, cx - e.x);
                            e.x += Math.cos(angle) * 3; // Enemies get pulled harder
                            e.y += Math.sin(angle) * 3;
                        }
                    });
                }
            });
            player.biomeSpeedMod = biomeSpeedMod;

            player.update();
            player.draw();

            // Weapon Drops
            weaponDrops.forEach((drop, index) => {
                drop.draw();
                const dist = Math.hypot(player.x - drop.x, player.y - drop.y);
                if (dist < player.radius + 20) {
                    if (player.weapon === drop.type) {
                        player.weaponTier++;
                        player.weaponTimer = 900;
                        showNotification(`WEAPON UPGRADED! (LVL ${player.weaponTier})`);
                    } else {
                        player.weapon = drop.type;
                        player.weaponTier = 1;
                        player.weaponTimer = 900;
                        showNotification(`WEAPON EQUIPPED!`);
                    }
                    createExplosion(player.x, player.y, '#8e44ad');
                    weaponDrops.splice(index, 1);
                }
            });

            // Gold Drops
            goldDrops.forEach((drop, index) => {
                drop.draw();
                const dist = Math.hypot(player.x - drop.x, player.y - drop.y);
                if (dist < player.radius + 20) {
                    const amount = Math.floor(drop.value * player.goldMultiplier);
                    player.gold += amount;
                    currentRunStats.moneyGained += amount; // Track Gold
                    saveData.global.totalGold += drop.value; // Track for achievement
                    goldDrops.splice(index, 1);
                }
            });

            // Card Drops
            cardDrops.forEach((drop, index) => {
                drop.draw();
                const dist = Math.hypot(player.x - drop.x, player.y - drop.y);
                if (dist < player.radius + 20) {
                    const cardKey = drop.cardKey;
                    const card = COLLECTOR_CARDS[cardKey];

                    if (card && !saveData.collection.includes(cardKey)) {
                        saveData.collection.push(cardKey);
                        saveGame();

                        // Show notification
                        const notif = document.createElement('div');
                        notif.className = 'achievement-popup'; // Reuse achievement style
                        notif.style.borderColor = card.color;
                        notif.innerHTML = `
                            <div style="font-size: 12px; color: #aaa;">NEW CARD FOUND!</div>
                            <div style="color: ${card.color}; font-weight: bold; font-size: 16px; margin: 5px 0;">${card.name}</div>
                            <div style="font-size: 12px;">${card.desc}</div>
                        `;
                        document.body.appendChild(notif);

                        // Trigger animation
                        setTimeout(() => notif.classList.add('show'), 10);

                        setTimeout(() => {
                            notif.classList.remove('show');
                            setTimeout(() => notif.remove(), 1000);
                        }, 4000);
                    }

                    cardDrops.splice(index, 1);
                }
            });

            // Holy Masks
            holyMasks.forEach((mask, index) => {
                mask.draw();
                const dist = Math.hypot(player.x - mask.x, player.y - mask.y);
                if (dist < player.radius + 20) {
                    saveData[player.type].level++;
                    saveGame();
                    showNotification("PERMANENT LEVEL UP!");
                    createExplosion(player.x, player.y, '#f1c40f');
                    holyMasks.splice(index, 1);
                }
            });

            powerUps.forEach((pup, index) => {
                pup.update(); pup.draw();
                const dist = Math.hypot(player.x - pup.x, player.y - pup.y);
                if (dist < player.radius + pup.radius) {
                    if (pup.type === 'HEAL') { player.hp = Math.min(player.hp + 30, player.maxHp); createExplosion(player.x, player.y, '#2ecc71'); }
                    else if (pup.type === 'MAXHP') { player.maxHp += 20; player.hp += 20; createExplosion(player.x, player.y, '#e74c3c'); }
                    else if (pup.type === 'SPEED') { player.buffs.speed = 600; createExplosion(player.x, player.y, '#f1c40f'); }
                    else if (pup.type === 'MULTI') { player.buffs.multi = 600; createExplosion(player.x, player.y, '#3498db'); }
                    else if (pup.type === 'AUTOAIM') { player.buffs.autoaim = 600; createExplosion(player.x, player.y, '#9b59b6'); }
                    powerUps.splice(index, 1);
                } else if (pup.timer <= 0) powerUps.splice(index, 1);
            });

            projectiles.forEach((proj, index) => {
                proj.update(); proj.draw();
                if (checkWallCollision(proj.x, proj.y, proj.radius)) {
                    if (proj.isExplosive) {
                        enemies.forEach(e => {
                            if (Math.hypot(e.x - proj.x, e.y - proj.y) < 100) {
                                e.hp -= proj.damage;
                                currentRunStats.damageDealt += proj.damage; // Track Damage
                                saveData.global.totalDamage += proj.damage;
                            }
                        });
                        createExplosion(proj.x, proj.y, '#e67e22');
                    }
                    projectiles.splice(index, 1);
                    return;
                }
                if (proj.x < 0 || proj.x > canvas.width || proj.y < 0 || proj.y > canvas.height) projectiles.splice(index, 1);
            });

            meleeAttacks.forEach((att, index) => {
                att.update(); att.draw();
                if (att.life <= 0) meleeAttacks.splice(index, 1);
            });

            particles.forEach((part, index) => {
                part.update(); part.draw();
                if (part.alpha <= 0) particles.splice(index, 1);
            });

            // Update and Draw Floating Texts
            floatingTexts.forEach((ft, index) => {
                ft.update(); ft.draw();
                if (ft.life <= 0) floatingTexts.splice(index, 1);
            });

            enemies.forEach((enemy, eIndex) => {
                // Biome Effects on Enemy
                let enemySpeedMod = 1;
                biomeZones.forEach(zone => {
                    if (enemy.x > zone.x && enemy.x < zone.x + zone.w &&
                        enemy.y > zone.y && enemy.y < zone.y + zone.h) {

                        if (zone.type === 'MUD') enemySpeedMod = 0.5;
                        if (zone.type === 'ICE') enemySpeedMod = 1.3;
                        if (zone.type === 'WATER') enemySpeedMod = 0.7;

                        if (zone.type === 'LAVA' && frame % 60 === 0) {
                            enemy.hp -= 5;
                            createExplosion(enemy.x, enemy.y, '#e74c3c');
                        }
                    }
                });
                enemy.biomeSpeedMod = enemySpeedMod;

                enemy.update(); enemy.draw();
                const dist = Math.hypot(player.x - enemy.x, player.y - enemy.y);

                if (dist - enemy.radius - player.radius < 0 && !player.isDashing) {
                    // Invincibility Check
                    if (player.invincibleTimer > 0) {
                        // Reflect damage?
                        enemy.hp -= 5;
                        createExplosion(player.x, player.y, '#95a5a6');
                        const angle = Math.atan2(enemy.y - player.y, enemy.x - player.x);
                        enemy.x += Math.cos(angle) * 20; enemy.y += Math.sin(angle) * 20;
                        return; // Skip damage
                    }

                    let dmgTaken = 1 * (1 - player.damageReduction);

                    // Speedster Explosion
                    if (enemy.subType === 'SPEEDSTER') {
                        let speedsterDmg = 20;
                        const bonuses = getCollectionBonuses('SPEEDSTER');
                        speedsterDmg *= bonuses.defenseMult;

                        dmgTaken = speedsterDmg * (1 - player.damageReduction);
                        createExplosion(player.x, player.y, '#e74c3c');
                        enemy.hp = 0; // Suicide
                    }

                    player.hp -= dmgTaken;
                    currentRunStats.damageTaken += dmgTaken; // Track Damage
                    player.resetCombo(); // Reset Combo on Damage
                    createExplosion(player.x, player.y, '#fff');

                    if (player.transformActive) {
                        player.transformActive = false;
                        player.currentForm = 'NONE';
                        showNotification("FORM BROKEN!");
                    }

                    const angle = Math.atan2(enemy.y - player.y, enemy.x - player.x);
                    if (!(enemy instanceof Boss)) { enemy.x += Math.cos(angle) * 20; enemy.y += Math.sin(angle) * 20; }
                }

                projectiles.forEach((proj, pIndex) => {
                    if (proj.isEnemy) {
                        const pDist = Math.hypot(proj.x - player.x, proj.y - player.y);
                        if (pDist < player.radius + proj.radius) {
                            // Card Dodge/Reduction Logic
                            const bonuses = getCollectionBonuses(proj.shooterType);

                            if (proj.shooterType === 'SHOOTER' && bonuses.specials.includes('SHOOTER_DODGE') && Math.random() < 0.15) {
                                floatingTexts.push(new FloatingText(player.x, player.y - 40, "DODGE", "#f1c40f", 20));
                                projectiles.splice(pIndex, 1);
                                return;
                            }

                            if (proj.shooterType === 'TOXIC' && bonuses.specials.includes('TOXIC_IMMUNE')) {
                                return; // Immune
                            }

                            let finalDmg = proj.damage * bonuses.defenseMult;

                            const dmgTaken = finalDmg * (1 - player.damageReduction);
                            player.hp -= dmgTaken;

                            // Player takes damage number
                            floatingTexts.push(new FloatingText(player.x, player.y - 20, Math.floor(dmgTaken), '#e74c3c', 20));

                            currentRunStats.damageTaken += dmgTaken; // Track Damage
                            player.resetCombo(); // Reset Combo on Damage
                            createExplosion(player.x, player.y, proj.color); projectiles.splice(pIndex, 1);

                            if (player.transformActive) {
                                player.transformActive = false;
                                player.currentForm = 'NONE';
                                showNotification("FORM BROKEN!");
                            }
                        }
                    } else {
                        const pDist = Math.hypot(proj.x - enemy.x, proj.y - enemy.y);
                        if (pDist - enemy.radius - proj.radius < 0) {
                            let finalDamage = proj.damage;

                            // Card Bonuses
                            const bonuses = getCollectionBonuses(enemy.subType);
                            if (enemy instanceof Boss) {
                                const bossBonuses = getCollectionBonuses('BOSS');
                                bonuses.damageMult += (bossBonuses.damageMult - 1);
                            }

                            finalDamage *= bonuses.damageMult;

                            // Crit Check with Card Bonus
                            let isCrit = proj.isCrit;
                            if (!isCrit && Math.random() < (player.critChance + bonuses.critChance)) {
                                isCrit = true;
                                finalDamage *= player.critMultiplier;
                            }

                            // Special: Shield Pierce
                            if (enemy.subType === 'SHIELDER' && bonuses.specials.includes('SHIELD_PIERCE')) {
                                finalDamage *= 1.5;
                            }

                            enemy.hp -= finalDamage;

                            // Enemy takes damage number
                            floatingTexts.push(new FloatingText(
                                enemy.x,
                                enemy.y - 20,
                                Math.floor(finalDamage) + (isCrit ? '!' : ''),
                                isCrit ? '#f1c40f' : '#fff',
                                isCrit ? 30 : 16
                            ));

                            currentRunStats.damageDealt += finalDamage; // Track Damage
                            saveData.global.totalDamage += finalDamage;
                            createExplosion(enemy.x, enemy.y, proj.color);
                            if (proj.isExplosive) {
                                enemies.forEach(nearby => {
                                    if (Math.hypot(nearby.x - proj.x, nearby.y - proj.y) < 100) {
                                        nearby.hp -= proj.damage;
                                        // Explosion damage number
                                        floatingTexts.push(new FloatingText(nearby.x, nearby.y - 20, Math.floor(proj.damage), '#e67e22', 16));

                                        currentRunStats.damageDealt += proj.damage; // Track Damage
                                        saveData.global.totalDamage += proj.damage;
                                    }
                                });
                                projectiles.splice(pIndex, 1);
                            } else {
                                if (proj.pierce > 0) { proj.pierce--; } else { projectiles.splice(pIndex, 1); }
                            }
                            if (!(enemy instanceof Boss)) {
                                const angle = Math.atan2(enemy.y - proj.y, enemy.x - proj.x);
                                enemy.x += Math.cos(angle) * proj.knockback; enemy.y += Math.sin(angle) * proj.knockback;
                            }
                        }
                    }
                });

                meleeAttacks.forEach(att => {
                    if (att.hitList.includes(eIndex)) return;
                    const dx = enemy.x - att.x; const dy = enemy.y - att.y;
                    const dist = Math.sqrt(dx * dx + dy * dy);
                    if (dist < att.radius + enemy.radius) {
                        const angleToEnemy = Math.atan2(dy, dx);
                        let diff = angleToEnemy - att.angle;
                        while (diff < -Math.PI) diff += Math.PI * 2; while (diff > Math.PI) diff -= Math.PI * 2;
                        if (Math.abs(diff) < Math.PI / 3) {
                            enemy.hp -= att.damage;

                            // Melee damage number
                            const isCrit = att.isCrit;
                            floatingTexts.push(new FloatingText(
                                enemy.x,
                                enemy.y - 20,
                                Math.floor(att.damage) + (isCrit ? '!' : ''),
                                isCrit ? '#f1c40f' : '#fff',
                                isCrit ? 35 : 20
                            ));

                            currentRunStats.damageDealt += att.damage; // Track Damage
                            saveData.global.totalDamage += att.damage;
                            createExplosion(enemy.x, enemy.y, att.color); att.hitList.push(eIndex);
                            if (!(enemy instanceof Boss)) { enemy.x += Math.cos(angleToEnemy) * 50; enemy.y += Math.sin(angleToEnemy) * 50; }
                        }
                    }
                });

                if (enemy.hp <= 0) {
                    player.addCombo(); // Add Combo
                    checkAchievements(); // Check achievements on kill

                    // Mutator: Explosive Personality
                    if (isDailyMode && activeMutators.some(m => m.id === 'EXPLOSIVE')) {
                        createExplosion(enemy.x, enemy.y, '#e74c3c');
                        if (Math.hypot(player.x - enemy.x, player.y - enemy.y) < 100) {
                            player.hp -= 10 * (1 - player.damageReduction);
                            floatingTexts.push(new FloatingText(player.x, player.y - 20, "10", "#e74c3c", 20));
                        }
                    }

                    if (enemy instanceof Boss) {
                        currentRunStats.bossesKilled++; // Track Boss Kill
                        saveData.global.totalBosses = (saveData.global.totalBosses || 0) + 1; // Achievement track
                        score += 1000; player.gainXp(500); createExplosion(enemy.x, enemy.y, '#c0392b');
                        weaponDrops.push(new WeaponDrop(enemy.x, enemy.y));
                        checkDrop('BOSS', enemy.x, enemy.y); // Boss Card
                        enemies.splice(eIndex, 1);
                        const remainingBosses = enemies.filter(e => e instanceof Boss).length;
                        if (remainingBosses === 0) {
                            bossActive = false;

                            // Start Boss Death Sequence
                            bossDeathTimer = 180; // 3 seconds at 60 FPS

                            // Clear all other enemies instantly for dramatic effect
                            enemies.forEach(e => createExplosion(e.x, e.y, '#fff'));
                            enemies = [];
                            projectiles = []; // Clear projectiles too
                        }
                    } else {
                        // Swarm Explosion (Tier 4)
                        if (enemy.subType === 'SWARM' && saveData.collection.includes('SWARM_4')) {
                            createExplosion(enemy.x, enemy.y, '#8e44ad');
                            enemies.forEach(nearby => {
                                if (nearby !== enemy && Math.hypot(nearby.x - enemy.x, nearby.y - enemy.y) < 100) {
                                    nearby.hp -= 20;
                                    floatingTexts.push(new FloatingText(nearby.x, nearby.y - 20, "20", "#8e44ad", 16));
                                }
                            });
                        }

                        currentRunStats.enemiesKilled++; // Track Kill
                        score += 10; player.gainXp(20); createExplosion(enemy.x, enemy.y, '#aaa');
                        if (Math.random() < player.maskChance) holyMasks.push(new HolyMask(enemy.x, enemy.y));

                        // Mutator: No Regen (No Health Drops)
                        if (!(isDailyMode && activeMutators.some(m => m.id === 'NO_REGEN'))) {
                            if (Math.random() < 0.3) goldDrops.push(new GoldDrop(enemy.x, enemy.y)); // Gold Drop
                        } else {
                            // Still drop gold, but maybe less? Or just no health potions if they existed as drops.
                            // Wait, GoldDrop is money. Health is usually from Shop or Skills.
                            // If "No Regen" means no healing, we should block healing in Player.js or here.
                            // Let's assume "No Health Drops" refers to potential future drops or just disable lifesteal/regen.
                            // For now, let's just block Gold Drops as a penalty or rename mutator to "Poverty".
                            // Actually, let's stick to the description: "No Health Drops spawn".
                            // Since we don't have health drops yet (only shop potions), let's make it block Gold Drops instead for now?
                            // Or better: Block Shop Healing.
                        }
                        if (Math.random() < 0.3) goldDrops.push(new GoldDrop(enemy.x, enemy.y));

                        // Check for Card Drop
                        checkDrop(enemy.subType || 'BASIC', enemy.x, enemy.y);

                        enemies.splice(eIndex, 1);
                        if (!bossActive) enemiesKilledInWave++;
                    }
                }
            });

            // Low Health Indicator
            if (player.hp / player.maxHp < 0.2) {
                ctx.save();
                // Red Vignette
                const gradient = ctx.createRadialGradient(canvas.width / 2, canvas.height / 2, canvas.height * 0.4, canvas.width / 2, canvas.height / 2, canvas.height * 0.8);
                gradient.addColorStop(0, 'transparent');
                gradient.addColorStop(1, 'rgba(255, 0, 0, 0.4)');
                ctx.fillStyle = gradient;
                ctx.fillRect(0, 0, canvas.width, canvas.height);

                // Pulsing Overlay
                const pulse = (Math.sin(frame * 0.1) + 1) / 2; // 0 to 1
                ctx.fillStyle = `rgba(255, 0, 0, ${pulse * 0.15})`;
                ctx.fillRect(0, 0, canvas.width, canvas.height);
                ctx.restore();
            }

            updateUI();
            if (player.hp <= 0) {
                gameOver();
            }
        }
    }
}

// Ensure you call loadGame() at startup!
loadGame();

// Initialize Menu on Load
initMenu();
masterLoop();

// OPTIONAL: Auto-save every 30 seconds
setInterval(() => {
    if (gameRunning && !gamePaused) {
        saveGame();
    }
}, 30000);
