const isElectron = typeof process !== 'undefined' && process.versions && process.versions.electron;
let lastInputType = 'MOUSE'; // 'MOUSE' or 'GAMEPAD'
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

// Initialize DLC Manager
if (typeof DLCManager !== 'undefined') {
    window.dlcManager = new DLCManager();
}

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
    black: { level: 0, unlocked: 0, highScore: 0, prestige: 0 }, // Hidden/Daily Hero
    global: {
        totalKills: 0, maxWave: 0, totalGold: 0, totalBosses: 0,
        totalDamage: 0, maxCombo: 0, totalGames: 0, totalDeaths: 0,
        totalVoidGoldSpent: 0, unlockedAchievements: [],
        daily_wins: 0, weekly_wins: 0
    },
    collection: [],
    metaUpgrades: { health: 0, greed: 0, power: 0, swift: 0, defense: 0, wisdom: 0 },
    stats: {},
    daily: { lastCompleted: null },
    weekly: { lastCompleted: null },
    story: { unlockedChapters: [], enabled: true },
    memories: {}, // New Memory System
    altar: { active: [] }, // New Altar Data
    chaos: { shards: 0, unlocked: [], active: [] }, // Chaos Shop Data
    savedRun: null // Slot for mid-run save
};

let currentBiomeType = 'fire'; // Default, updated in startGame
let saveData = {
    fire: { level: 0, unlocked: 0, highScore: 0, prestige: 0 },
    water: { level: 0, unlocked: 0, highScore: 0, prestige: 0 },
    ice: { level: 0, unlocked: 0, highScore: 0, prestige: 0 },
    plant: { level: 0, unlocked: 0, highScore: 0, prestige: 0 },
    metal: { level: 0, unlocked: 0, highScore: 0, prestige: 0 },
    earth: { level: 0, unlocked: 0, highScore: 0, prestige: 0 },
    black: { level: 0, unlocked: 0, highScore: 0, prestige: 0 },
    global: { totalKills: 0, maxWave: 0, totalGold: 0, totalBosses: 0, totalDamage: 0, maxCombo: 0, totalGames: 0, totalDeaths: 0, totalVoidGoldSpent: 0, unlockedAchievements: [], daily_wins: 0, weekly_wins: 0 },
    collection: [],
    metaUpgrades: { health: 0, greed: 0, power: 0, swift: 0, defense: 0, wisdom: 0 },
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
    weekly: { lastCompleted: null },
    story: { unlockedChapters: [], enabled: true },
    memories: {},
    altar: { active: [] }, // New Altar Data
    chaos: { shards: 0, unlocked: [], active: [] }, // Chaos Shop Data
    savedRun: null
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

// --- Save Encoding/Decoding ---
function encodeSaveData(data) {
    try {
        const jsonString = JSON.stringify(data);
        // Simple obfuscation: Base64 encode
        // For "binary" feel, we could use TextEncoder but localStorage stores strings.
        // To make it harder to edit, we can reverse it or add a salt, but Base64 is standard for "binary-to-text".
        // Let's do: Base64(JSON)
        return btoa(unescape(encodeURIComponent(jsonString)));
    } catch (e) {
        console.error("Failed to encode save data:", e);
        return null;
    }
}

function decodeSaveData(encodedString) {
    try {
        // Check if it's old format (JSON)
        if (encodedString.trim().startsWith('{')) {
            return JSON.parse(encodedString);
        }
        // Assume new format (Base64)
        const jsonString = decodeURIComponent(escape(atob(encodedString)));
        return JSON.parse(jsonString);
    } catch (e) {
        console.error("Failed to decode save data:", e);
        return null;
    }
}

function saveGame() {
    if (!saveData) return;

    const encodedData = encodeSaveData(saveData);
    if (!encodedData) return;

    if (isElectron) {
        try {
            // We save as a binary-like string (Base64) to make it harder to edit manually
            fs.writeFileSync(saveFilePath, encodedData);
        } catch (e) {
            console.error("Failed to save game to disk:", e);
        }
    } else {
        // Fallback for Web Browser
        localStorage.setItem('5FreundeSave', encodedData);
    }
}

// --- Audio System ---
// Audio management has been moved to AudioManager.js


function loadGame() {
    let data = null;

    if (isElectron) {
        try {
            if (fs.existsSync(saveFilePath)) {
                const raw = fs.readFileSync(saveFilePath, 'utf8');
                data = decodeSaveData(raw);
            }
        } catch (e) {
            console.error("Failed to load save file:", e);
        }
    } else {
        // Fallback for Web Browser
        const raw = localStorage.getItem('5FreundeSave');
        if (raw) data = decodeSaveData(raw);
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

        // Ensure Altar object exists (Migration)
        if (!saveData.altar) {
            saveData.altar = { active: [] };
        }

        // Ensure Weekly object exists (Migration)
        if (!saveData.weekly) {
            saveData.weekly = { lastCompleted: null };
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
        metal: { MELEE: 0.25, ARMOR: 0.30, HEALTH: 0.25, DAMAGE: 0.10, ULT_DAMAGE: 0.10 },
        black: { DAMAGE: 1.0 } // Dummy tree, not used
    };

    // DLC Hook: Get Weights
    if (window.HERO_LOGIC && window.HERO_LOGIC[type] && window.HERO_LOGIC[type].getSkillTreeWeights) {
        weights[type] = window.HERO_LOGIC[type].getSkillTreeWeights();
    }

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

        // DLC Hook: Node Details
        if (window.HERO_LOGIC && window.HERO_LOGIC[type] && window.HERO_LOGIC[type].getSkillNodeDetails) {
            const details = window.HERO_LOGIC[type].getSkillNodeDetails(t, val, desc);
            val = details.val;
            desc = details.desc;
        }

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

    // Dynamically get heroes from BASE_HERO_STATS
    // Filter out 'black' if it's meant to be hidden or handled separately
    const heroes = Object.keys(BASE_HERO_STATS).filter(h => h !== 'black');

    heroes.forEach(h => {
        // Ensure save data exists for this hero (e.g. DLC heroes)
        if (!saveData[h]) {
            saveData[h] = { level: 0, unlocked: 0, highScore: 0, prestige: 0 };
            // Auto-unlock DLC heroes for now, or handle via DLC logic
            if (h === 'earth') saveData[h].unlocked = 1;
        }

        const data = saveData[h];
        const el = document.createElement('div');
        el.className = 'hero-card';
        if (h === selectedHeroType) el.style.borderColor = 'white';

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
let lastGamepadState = { a: false, b: false, y: false };

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

    // Build types list dynamically from ENEMY_TYPES + BOSS + ELITES
    let types = [];
    if (typeof ENEMY_TYPES !== 'undefined') {
        types = [...ENEMY_TYPES];
    } else {
        types = ['BASIC', 'SHOOTER', 'BRUTE', 'SPEEDSTER', 'SWARM', 'SUMMONER', 'GHOST', 'SNIPER', 'BOMBER', 'TOXIC', 'SHIELDER'];
    }

    if (!types.includes('BOSS')) types.push('BOSS');

    // Add DLC types if not already in ENEMY_TYPES (just in case)
    if (window.dlcManager && window.dlcManager.isDLCActive('rise_of_the_rock')) {
        if (!types.includes('GOLEM')) types.push('GOLEM');
        if (!types.includes('BURROWER')) types.push('BURROWER');
    }

    // Add Elite Types
    const elites = ['ELITE_AURA_SPEED', 'ELITE_AURA_HEAL', 'ELITE_EXPLODER', 'ELITE_TANK'];
    types.push(...elites);

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
        xp: 0,          // % (Wisdom)
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
                if (key === 'greed') { totals.gold += level * 5; effect = `+${level * 5}% Gold Gain`; }
                if (key === 'defense') { totals.defense += level; effect = `+${level}% Dmg Reduction`; }
                if (key === 'wisdom') { totals.xp += level * 2; effect = `+${level * 2}% XP Gain`; }

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
        <div class="summary-card"><div class="summary-val" style="color:#3498db">+${totals.xp.toFixed(0)}%</div><div class="summary-label">XP Gain</div></div>
        <div class="summary-card"><div class="summary-val" style="color:#fff">+${totals.projectiles}</div><div class="summary-label">Extra Proj.</div></div>
        <div class="summary-card"><div class="summary-val" style="color:#1abc9c">${saveData[selectedHeroType].prestige}</div><div class="summary-label">Prestige Rank</div></div>
    `;
}

// --- Completion Menu Logic ---
window.openCompletion = function () {
    document.getElementById('menu-overlay').style.display = 'none';
    document.getElementById('completion-screen').style.display = 'flex';
    const menu = new CompletionMenu();
    menu.render();
    setUIState('COMPLETION');
}

window.closeCompletion = function () {
    document.getElementById('completion-screen').style.display = 'none';
    initMenu();
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
    else if (uiState === 'DAILY_INFO') screenId = 'daily-info-modal';
    else if (uiState === 'ALTAR') screenId = 'altar-screen';
    else if (uiState === 'CHAOSSHOP') screenId = 'chaos-shop-screen';
    else if (uiState === 'TUTORIAL') screenId = 'tutorial-screen';
    else if (uiState === 'COMPLETION') screenId = 'completion-screen';
    else if (uiState === 'DLC') screenId = 'dlc-screen';

    if (!screenId) return [];
    const screen = document.getElementById(screenId);
    if (!screen) return [];

    // Select all interactive elements
    // REMOVED .achievement-row from here
    const elements = Array.from(screen.querySelectorAll('button, .hero-card, .upgrade-card, .shop-item, .skill-node, .collection-card, .switch, .altar-node'));
    // Filter out hidden elements
    return elements.filter(el => el.offsetParent !== null);
}

function updateUIHighlight() {
    if (uiState === 'GAME') return;

    const focusables = getFocusables();
    // Remove selected class from all
    document.querySelectorAll('.selected').forEach(el => el.classList.remove('selected'));

    if (lastInputType !== 'GAMEPAD') return;

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


        const scrollableStates = ['MENU', 'ACHIEVEMENTS', 'SKILLTREE', 'SHOP', 'PERMSHOP', 'COLLECTION', 'HIGHSCORE', 'ALTAR', 'COMPLETION'];
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
    const y = gp.buttons[3].pressed; // Y / Triangle

    // Check for active input to switch mode
    if (up || down || left || right || a || b || y || Math.abs(gp.axes[3]) > 0.1) {
        lastInputType = 'GAMEPAD';
    }

    if (uiState === 'GAME') return;

    // --- MUSEUM ---
    if (uiState === 'MUSEUM') {
        if (b) {
            setUIState('MENU');
            document.getElementById('menu-overlay').style.display = 'flex';
            uiDebounce = 20;
        }
        return;
    }

    // --- SCROLLING LOGIC (Right Stick) ---
    if (uiState === 'MENU') {
        // Music Toggle
        if (y && !lastGamepadState.y) {
            toggleMusic();
            uiDebounce = 20;
        }

        const content = document.getElementById('menu-overlay');
        if (content && Math.abs(gp.axes[3]) > 0.1) {
            content.scrollTop += gp.axes[3] * 15;
        }
    } else if (uiState === 'ACHIEVEMENTS') {
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
    } else if (uiState === 'ALTAR') {
        const content = document.getElementById('altar-screen');
        if (content && Math.abs(gp.axes[3]) > 0.1) {
            content.scrollTop += gp.axes[3] * 15;
        }
    } else if (uiState === 'CHAOSSHOP') {
        const content = document.getElementById('chaos-shop-container');
        if (content && Math.abs(gp.axes[3]) > 0.1) {
            content.scrollTop += gp.axes[3] * 15;
        }
    } else if (uiState === 'TUTORIAL') {
        const content = document.getElementById('tutorial-content');
        if (content && Math.abs(gp.axes[3]) > 0.1) {
            content.scrollTop += gp.axes[3] * 15;
        }
    } else if (uiState === 'COMPLETION') {
        const content = document.getElementById('completion-grid');
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
        else if (uiState === 'ALTAR') closeAltar();
        else if (uiState === 'COMPLETION') closeCompletion();
        uiDebounce = 15;
    }

    const focusables = getFocusables();

    // If nothing to focus, just update state and return
    if (focusables.length === 0) {
        lastGamepadState = { a, b, y };
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
        else if (uiState === 'TUTORIAL') closeTutorial(); // Added TUTORIAL
        else if (uiState === 'CHAOSSHOP') closeChaosShop(); // Added CHAOSSHOP
        else if (uiState === 'DAILY_INFO') closeDailyInfo();
        uiDebounce = 30; // Increased from 20 to 30
    }

    lastGamepadState = { a, b, y };
}

// --- Update Existing Functions to use setUIState ---

function startStandardGame() {
    if (!saveData.story) {
        saveData.story = { unlockedChapters: [], enabled: false };
    }
    saveData.story.enabled = false;
    startGame('NORMAL');
}

function startStoryGame() {
    if (!saveData.story) {
        saveData.story = { unlockedChapters: [], enabled: true };
    }
    saveData.story.enabled = true;
    startGame('NORMAL');
}

function initMenu() {
    if (typeof audioManager !== 'undefined') audioManager.play('menu');
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
    document.getElementById('dlc-screen').style.display = 'none';

    // Setup DLC Buttons
    const dlcBtn = document.getElementById('btn-dlc');
    if (dlcBtn) dlcBtn.onclick = openDLCMenu;
    const dlcBackBtn = document.getElementById('btn-dlc-back');
    if (dlcBackBtn) dlcBackBtn.onclick = closeDLCMenu;

    // Hide Save Management in Electron
    const saveMgmt = document.getElementById('save-management');
    if (saveMgmt) {
        saveMgmt.style.display = isElectron ? 'none' : 'flex';
    }

    // Hide Import/Export Buttons in Electron
    const exportBtn = document.getElementById('btn-export-save');
    const importBtn = document.getElementById('btn-import-save');
    if (exportBtn) exportBtn.style.display = isElectron ? 'none' : 'inline-block';
    if (importBtn) importBtn.style.display = isElectron ? 'none' : 'inline-block';

    // Show Exit to Desktop Button in Electron
    const exitBtn = document.getElementById('btn-exit-desktop');
    if (exitBtn) {
        exitBtn.style.display = isElectron ? 'inline-block' : 'none';
    }

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

    // Update Weekly Challenge Button
    const weeklyBtn = document.getElementById('weekly-challenge-btn');
    if (weeklyBtn) {
        const thisWeek = getWeeklySeed();
        if (saveData.weekly && saveData.weekly.lastCompleted === thisWeek) {
            weeklyBtn.innerText = "Weekly Completed";
            weeklyBtn.disabled = true;
            weeklyBtn.style.opacity = 0.5;
            weeklyBtn.style.cursor = 'not-allowed';
        } else {
            weeklyBtn.innerText = "Weekly Challenge";
            weeklyBtn.disabled = false;
            weeklyBtn.style.opacity = 1;
            weeklyBtn.style.cursor = 'pointer';
        }
    }

    // Update Altar Button Visibility
    const altarBtn = document.getElementById('altar-btn');
    if (altarBtn) {
        const hasPrestige = Object.keys(BASE_HERO_STATS).some(h => saveData[h] && saveData[h].prestige > 0);
        altarBtn.style.display = hasPrestige ? 'block' : 'none';
    }

    renderHeroSelect();
    updateContinueButton();
    setUIState('MENU'); // Set State
}

// --- DLC Menu Logic ---
function openDLCMenu() {
    setUIState('DLC');
    document.getElementById('menu-overlay').style.display = 'none';
    document.getElementById('dlc-screen').style.display = 'flex';
    renderDLCList();
}

function closeDLCMenu() {
    document.getElementById('dlc-screen').style.display = 'none';
    initMenu();
}

function renderDLCList() {
    const container = document.getElementById('dlc-list');
    container.innerHTML = '';

    if (!window.dlcManager) {
        container.innerHTML = '<div style="color:red;">DLC Manager not found.</div>';
        return;
    }

    const dlcs = window.dlcManager.getDLCList();

    if (dlcs.length === 0) {
        container.innerHTML = '<div style="color:#777; text-align:center;">No DLCs found.</div>';
        return;
    }

    dlcs.forEach(dlc => {
        const card = document.createElement('div');
        card.className = 'dlc-card';
        card.style.cssText = `
            background: rgba(255,255,255,0.05);
            border: 1px solid ${dlc.active ? '#2ecc71' : '#555'};
            border-radius: 10px;
            padding: 20px;
            display: flex;
            align-items: center;
            gap: 20px;
            transition: all 0.2s;
        `;

        card.innerHTML = `
            <div style="font-size: 40px;">${dlc.icon}</div>
            <div style="flex-grow: 1;">
                <h2 style="margin: 0; color: ${dlc.active ? '#fff' : '#aaa'};">${dlc.title}</h2>
                <div style="color: #888; margin-top: 5px;">${dlc.desc}</div>
            </div>
            <div>
                <button class="btn ${dlc.active ? 'btn-red' : 'btn-green'}" style="min-width: 100px;">
                    ${dlc.active ? 'DISABLE' : 'ENABLE'}
                </button>
            </div>
        `;

        // Toggle Button Logic
        const btn = card.querySelector('button');
        btn.onclick = () => {
            window.dlcManager.toggleDLC(dlc.id, !dlc.active);
            renderDLCList(); // Refresh list
        };

        container.appendChild(card);
    });
}

// --- Run Saving System ---

function saveRunState() {
    if (!gameRunning || wave <= 0) return;

    const runState = {
        mode: saveData.story.enabled ? 'STORY' : 'NORMAL', // Simplified mode tracking
        wave: wave,
        score: score,
        player: {
            type: player.type,
            hp: player.hp,
            maxHp: player.maxHp,
            level: player.level,
            xp: player.xp,
            maxXp: player.maxXp,
            gold: player.gold,
            buffs: player.buffs,
            runBuffs: player.runBuffs,
            stats: player.stats, // Base stats
            // Modifiers
            damageMultiplier: player.damageMultiplier,
            speedMultiplier: player.speedMultiplier,
            cooldownMultiplier: player.cooldownMultiplier,
            damageReduction: player.damageReduction,
            extraProjectiles: player.extraProjectiles,
            meleeRadius: player.meleeRadius,
            maskChance: player.maskChance,
            goldMultiplier: player.goldMultiplier,
            critChance: player.critChance,
            critMultiplier: player.critMultiplier
        },
        companions: companions.map(c => ({ type: c.type })), // Only need types to recreate
        currentRunStats: currentRunStats,
        // We don't save enemies, projectiles, etc. as we restart at wave start
    };

    saveData.savedRun = runState;
    saveGame();
    console.log("Run saved at Wave " + wave);
}

function clearSavedRun() {
    saveData.savedRun = null;
    saveGame();
    updateContinueButton();
}

function updateContinueButton() {
    const btn = document.getElementById('continue-btn');
    const sub = document.getElementById('continue-subtitle');

    if (saveData.savedRun) {
        btn.style.display = 'block';
        const modeName = saveData.savedRun.mode === 'STORY' ? 'Story Mode' : 'Standard Run';
        sub.innerText = `${modeName} - Wave ${saveData.savedRun.wave} - ${saveData.savedRun.player.type.toUpperCase()}`;
    } else {
        btn.style.display = 'none';
    }
}

function continueRun() {
    if (!saveData.savedRun) return;

    const state = saveData.savedRun;

    // Restore Game Mode
    saveData.story.enabled = (state.mode === 'STORY');

    // Initialize Game Base
    startGame(state.mode); // This resets everything, so we overwrite after

    // Restore Wave & Score
    wave = state.wave - 1; // advanceWave() will increment it back to correct wave
    score = state.score;
    document.getElementById('scoreVal').innerText = score;

    // Restore Player
    // Re-create player with correct type (startGame does this, but let's be safe)
    player = new Player(state.player.type);

    // Restore Stats
    player.hp = state.player.hp;
    player.maxHp = state.player.maxHp;
    player.level = state.player.level;
    player.xp = state.player.xp;
    player.maxXp = state.player.maxXp;
    player.gold = state.player.gold;

    // Restore Buffs & Modifiers
    player.buffs = state.player.buffs;
    player.runBuffs = state.player.runBuffs;

    player.damageMultiplier = state.player.damageMultiplier;
    player.speedMultiplier = state.player.speedMultiplier;
    player.cooldownMultiplier = state.player.cooldownMultiplier;
    player.damageReduction = state.player.damageReduction;
    player.extraProjectiles = state.player.extraProjectiles;
    player.meleeRadius = state.player.meleeRadius;
    player.maskChance = state.player.maskChance;
    player.goldMultiplier = state.player.goldMultiplier;
    player.critChance = state.player.critChance;
    player.critMultiplier = state.player.critMultiplier;

    // Restore Companions
    companions = [];
    state.companions.forEach(cData => {
        companions.push(new Companion(cData.type, player));
    });

    // Restore Run Stats
    currentRunStats = state.currentRunStats;

    // Reset Boss Timer
    bossDeathTimer = 0;
    bossActive = false;
    enemiesKilledInWave = 0; // Reset kill count for the wave we are about to start
    // Start the wave
    advanceWave();

    // Clear the save slot immediately upon loading (Rogue-lite style)
    // Or keep it until next wave start? 
    // "The moment a game over happens, the saved run is automatically cleared" implies we keep it until death or overwrite.
    // BUT "pick up on that saved run again" usually implies consumption in roguelikes to prevent save scumming.
    // However, user said "automatically saved at the beginning of each wave".
    // So we don't clear it here. We overwrite it at next wave start.
    // But if they die, we must clear it.
}

let pendingGameMode = null;

function checkNewGame(mode) {
    if (saveData.savedRun) {
        pendingGameMode = mode;
        document.getElementById('confirm-dialog').style.display = 'flex';
        // Controller focus handling would go here
    } else {
        if (mode === 'STORY') startStoryGame();
        else startStandardGame();
    }
}

function confirmNewGame() {
    clearSavedRun();
    closeConfirmDialog();
    if (pendingGameMode === 'STORY') startStoryGame();
    else startStandardGame();
}

function closeConfirmDialog() {
    document.getElementById('confirm-dialog').style.display = 'none';
    pendingGameMode = null;
}

function quitGame() {
    clearSavedRun();
    // Use initMenu to return to menu without full reload if preferred, 
    // but reload ensures clean state.
    location.reload();
}

function exitToDesktop() {
    if (isElectron) {
        window.close();
    }
}

function showQuitWarning() {
    document.getElementById('quit-run-warning').style.opacity = 1;
}

function hideQuitWarning() {
    document.getElementById('quit-run-warning').style.opacity = 0;
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

function toggleMusic() {
    if (typeof audioManager !== 'undefined') {
        const isMuted = audioManager.toggleMute();
        const btn = document.getElementById('music-btn');
        if (btn) {
            btn.innerText = `Music: ${isMuted ? 'OFF' : 'ON'} (Y)`;
            btn.style.color = isMuted ? '#e74c3c' : '';
        }
    }
}

// --- Chaos Shop Logic ---
function isChaosActive(effectId) {
    return saveData.chaos && saveData.chaos.active && saveData.chaos.active.includes(effectId);
}

function openChaosShop() {
    document.getElementById('menu-overlay').style.display = 'none';
    document.getElementById('chaos-shop-screen').style.display = 'flex';
    renderChaosShop();
    setUIState('CHAOSSHOP');
}

function renderChaosShop() {
    // Ensure chaos data exists
    if (!saveData.chaos) saveData.chaos = { shards: 0, unlocked: [], active: [] };

    document.getElementById('chaosShardsVal').innerText = saveData.chaos.shards;
    const container = document.getElementById('chaos-shop-container');
    container.innerHTML = '';

    CHAOS_EFFECTS.forEach(effect => {
        const isUnlocked = saveData.chaos.unlocked.includes(effect.id);
        const isActive = saveData.chaos.active.includes(effect.id);

        const div = document.createElement('div');
        div.className = 'shop-item';
        // Style differently if unlocked/active
        if (isUnlocked) {
            div.style.borderColor = isActive ? '#2ecc71' : '#e74c3c';
            div.style.background = isActive ? 'rgba(46, 204, 113, 0.2)' : 'rgba(231, 76, 60, 0.1)';
        }

        let actionText = isUnlocked ? (isActive ? "ACTIVE (Click to Disable)" : "INACTIVE (Click to Enable)") : `Buy for ${effect.cost} Shards`;
        let costColor = isUnlocked ? (isActive ? '#2ecc71' : '#e74c3c') : '#f1c40f';

        div.innerHTML = `
            <div style="font-size: 20px; font-weight: bold; color: #e74c3c;">${effect.name}</div>
            <div style="color: #aaa; margin: 5px 0;">${effect.desc}</div>
            <div style="color: #f1c40f; font-weight: bold;">Bonus: +${Math.round(effect.bonus * 100)}% Gold</div>
            <div style="color: ${costColor}; margin-top: 10px; font-weight: bold;">${actionText}</div>
        `;

        div.onclick = () => {
            if (isUnlocked) {
                toggleChaosEffect(effect.id);
            } else {
                buyChaosEffect(effect.id, effect.cost);
            }
        };
        container.appendChild(div);
    });
}

function buyChaosEffect(id, cost) {
    if (saveData.chaos.shards >= cost) {
        saveData.chaos.shards -= cost;
        saveData.chaos.unlocked.push(id);
        saveGame();
        renderChaosShop();
        showNotification("Chaos Effect Unlocked!");
    } else {
        showNotification("Not enough Chaos Shards!");
    }
}

function toggleChaosEffect(id) {
    const index = saveData.chaos.active.indexOf(id);
    if (index > -1) {
        saveData.chaos.active.splice(index, 1);
        showNotification("Effect Disabled");
    } else {
        saveData.chaos.active.push(id);
        showNotification("Effect Enabled");
    }
    saveGame();
    renderChaosShop();
}

function closeChaosShop() {
    document.getElementById('chaos-shop-screen').style.display = 'none';
    initMenu();
}

function openSkillTree() {
    if (typeof audioManager !== 'undefined') audioManager.play('menu');
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

    const achievementsList = window.ACHIEVEMENTS || ACHIEVEMENTS;

    achievementsList.forEach(ach => {
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

// --- Museum Logic ---
let museum = null;

function openMuseum() {
    document.getElementById('menu-overlay').style.display = 'none';
    museum = new Museum();
    setUIState('MUSEUM');
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

// --- Altar Logic ---
let altar = null;

function openAltar() {
    document.getElementById('menu-overlay').style.display = 'none';
    document.getElementById('altar-screen').style.display = 'flex';
    if (!altar) altar = new Altar();
    altar.render();
    setUIState('ALTAR');
}

function closeAltar() {
    document.getElementById('altar-screen').style.display = 'none';
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
    base.defense = (saveData.metaUpgrades.defense || 0) * 0.01; // Apply Void Shell
    base.extraProjectiles = 0;
    base.meleeRadiusMult = 1;
    base.explodeChance = 0;
    base.goldMultiplier = 1; // Initialize gold multiplier
    base.xpMultiplier = 1 + (saveData.metaUpgrades.wisdom || 0) * 0.02; // Apply Void Mind

    // Earth Hero Stats (Defaults)
    base.momentumCap = 100;
    base.ramDmgMult = 1;
    base.momentumDecayMult = 1;

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

        // DLC Hook: Apply Node
        if (window.HERO_LOGIC && window.HERO_LOGIC[type] && window.HERO_LOGIC[type].applySkillNode) {
            window.HERO_LOGIC[type].applySkillNode(base, node);
        }
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
    if (type === 'black') return { bg: '#000000', grid: '#2c3e50' }; // Dark theme for Black
    return { bg: '#1a1a1a', grid: '#333' };
}

// --- Game State ---
let arena; // Arena Instance
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
// obstacles and biomeZones moved to Arena class
let holyMasks = [];
let goldDrops = [];
let cardDrops = [];
let memoryShards = [];
let companions = [];
// let obstacles = []; // REMOVED
// let biomeZones = []; // REMOVED

// Story Manager
const storyManager = new StoryManager();
let isStoryOpen = false;
let currentStoryEvent = null;

// Input
const keys = {};
const mouse = { x: 0, y: 0, leftDown: false, rightDown: false }; // Updated mouse object

window.addEventListener('keydown', e => keys[e.key.toLowerCase()] = true);
window.addEventListener('keyup', e => keys[e.key.toLowerCase()] = false);
window.addEventListener('mousemove', e => {
    lastInputType = 'MOUSE';
    mouse.x = e.clientX;
    mouse.y = e.clientY;
    // If mouse moves, switch back to mouse aiming
    if (player) player.usingGamepad = false;
});

// Updated Mouse Listeners for Auto-Fire support
window.addEventListener('mousedown', e => {
    lastInputType = 'MOUSE';
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

    // --- DEBUG KEYS (Disabled in Electron) ---
    if (!isElectron) {
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
                arena.generate(currentBiomeType);
                if (player) {
                    player.x = arena.width / 2;
                    player.y = arena.height / 2;
                }
            }
        }

        // DEBUG: Spawn Boss with 'B'
        if (e.code === 'KeyB' && gameRunning && !gamePaused && !bossActive) {
            enemiesKilledInWave = ENEMIES_PER_WAVE * wave;
            showNotification("DEBUG: BOSS SPAWNED");
        }

        // DEBUG: Toggle Invincibility with 'I'
        if (e.code === 'KeyI' && gameRunning && !gamePaused) {
            player.isInvincible = !player.isInvincible;
            showNotification(`DEBUG: INVINCIBILITY ${player.isInvincible ? 'ON' : 'OFF'}`);
        }

        // DEBUG: Jump to Wave/Chapter with 'J'
        if (e.code === 'KeyJ' && gameRunning && !gamePaused) {
            const input = prompt("Jump to Wave (Story Chapter):", wave + 1);
            const targetWave = parseInt(input);
            if (!isNaN(targetWave) && targetWave > 0) {
                // Reset State
                enemies = [];
                projectiles = [];
                powerUps = [];
                bossActive = false;
                currentObjective = null;

                // Set wave to previous so triggerStory/advanceWave works correctly
                wave = targetWave - 1;

                showNotification(`DEBUG: JUMPING TO WAVE ${targetWave}`);

                // Trigger Story Logic for the target wave
                triggerStory(wave);
            }
        }

        // DEBUG: Select Black Hero in Menu with 'B'
        if (e.code === 'KeyB' && uiState === 'MENU') {
            selectedHeroType = 'black';
            showNotification("DEBUG: BLACK HERO SELECTED");
            // We don't call renderHeroSelect() because Black isn't in the list, 
            // so we just rely on the notification.
        }

        // DEBUG: Add Skill Point with 'P' in Menu
        if (e.code === 'KeyP' && uiState === 'MENU') {
            saveData[selectedHeroType].level++;
            saveGame();
            renderHeroSelect();
            showNotification(`DEBUG: +1 Point for ${selectedHeroType.toUpperCase()}`);
        }
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
let forcedEnemyType = null;

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
    const count = 2; // Always 2 mutators for Daily
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

let isWeeklyMode = false;

function getWeeklySeed() {
    const now = new Date();
    const d = new Date(Date.UTC(now.getFullYear(), now.getMonth(), now.getDate()));
    const dayNum = d.getUTCDay() || 7;
    d.setUTCDate(d.getUTCDate() + 4 - dayNum);
    const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
    const weekNo = Math.ceil((((d - yearStart) / 86400000) + 1) / 7);
    return parseInt(`${d.getUTCFullYear()}${String(weekNo).padStart(2, '0')}`);
}

function getWeeklyMutators() {
    const seed = getWeeklySeed();
    const random = (seed) => {
        let x = Math.sin(seed++) * 10000;
        return x - Math.floor(x);
    };

    let currentSeed = seed;
    const count = 3; // Always 3 mutators for Weekly
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

function startWeeklyChallenge() {
    const thisWeek = getWeeklySeed();
    if (saveData.weekly && saveData.weekly.lastCompleted === thisWeek) {
        alert("You have already completed this week's challenge!");
        return;
    }

    activeMutators = getWeeklyMutators();
    isWeeklyMode = true;
    isDailyMode = false;

    const title = document.querySelector('#daily-info-modal h1');
    if (title) title.innerText = "WEEKLY CHALLENGE";

    const list = document.getElementById('daily-mutators-list');
    list.innerHTML = '';
    activeMutators.forEach(m => {
        const item = document.createElement('div');
        item.style.marginBottom = '10px';
        item.innerHTML = `<strong style="color:${m.color}">${m.name}</strong>: ${m.desc}`;
        list.appendChild(item);
    });

    const btn = document.querySelector('#daily-info-modal .btn-gold');
    btn.onclick = confirmWeeklyStart;

    document.getElementById('daily-info-modal').style.display = 'flex';
    setUIState('DAILY_INFO');
}

function confirmWeeklyStart() {
    document.getElementById('daily-info-modal').style.display = 'none';
    startGame('WEEKLY');
}

function startDailyChallenge() {
    const today = getDailySeed();
    if (saveData.daily && saveData.daily.lastCompleted === today) {
        alert("You have already completed today's challenge!");
        return;
    }

    activeMutators = getDailyMutators();
    isDailyMode = true;
    isWeeklyMode = false;

    const title = document.querySelector('#daily-info-modal h1');
    if (title) title.innerText = "DAILY CHALLENGE";

    // Show Custom Modal
    const list = document.getElementById('daily-mutators-list');
    list.innerHTML = '';
    activeMutators.forEach(m => {
        const item = document.createElement('div');
        item.style.marginBottom = '10px';
        item.innerHTML = `<strong style="color:${m.color}">${m.name}</strong>: ${m.desc}`;
        list.appendChild(item);
    });

    const btn = document.querySelector('#daily-info-modal .btn-gold');
    btn.onclick = confirmDailyStart;

    document.getElementById('daily-info-modal').style.display = 'flex';
    setUIState('DAILY_INFO');
}

function confirmDailyStart() {
    document.getElementById('daily-info-modal').style.display = 'none';
    startGame('DAILY');
}

function closeDailyInfo() {
    document.getElementById('daily-info-modal').style.display = 'none';
    setUIState('MENU');
}

// --- Classes ---

// BiomeZone removed - moved to Arena.js

// Obstacle removed - moved to Arena.js

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
        this.life = null; // Optional lifetime
    }
    update() {
        this.x += this.velocity.x;
        this.y += this.velocity.y;
        if (this.life !== null) this.life--;
    }
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
    constructor(x, y, isTrueGolden = false) {
        this.x = x; this.y = y; this.radius = 20; this.angle = 0;
        this.isTrueGolden = isTrueGolden;
    }
    draw() {
        this.angle += 0.05;
        ctx.save(); ctx.translate(this.x, this.y); ctx.rotate(this.angle);

        if (this.isTrueGolden) {
            // True Golden Mask Visuals
            ctx.shadowBlur = 20;
            ctx.shadowColor = '#f1c40f';
            ctx.fillStyle = '#fff'; // White hot center
            ctx.beginPath(); ctx.arc(0, 0, 18, 0, Math.PI * 2); ctx.fill();
            ctx.strokeStyle = '#f1c40f'; ctx.lineWidth = 4; ctx.stroke();
        } else {
            ctx.fillStyle = '#f1c40f'; // Gold
            ctx.beginPath(); ctx.arc(0, 0, 15, 0, Math.PI * 2); ctx.fill();
            ctx.strokeStyle = '#fff'; ctx.lineWidth = 2; ctx.stroke();
        }

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
            this.x = Math.random() * (arena.width - 100) + 50;
            this.y = Math.random() * (arena.height - 100) + 50;
            if (!arena.checkCollision(this.x, this.y, 15)) safe = true;
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

// generateArena removed - moved to Arena.js

// checkWallCollision removed - moved to Arena.js

// drawArena removed - moved to Arena.js

function updateUI() {
    document.getElementById('scoreVal').innerText = score;
    document.getElementById('waveVal').innerText = wave;
    document.getElementById('goldVal').innerText = player.gold;

    // Hard Mode Indicator
    const prestige = saveData[player.type].prestige;
    const scoreBoard = document.getElementById('score-board');
    if (prestige > 0) {
        if (!document.getElementById('hm-indicator')) {
            const hmSpan = document.createElement('span');
            hmSpan.id = 'hm-indicator';
            hmSpan.style.color = '#e74c3c';
            hmSpan.style.marginLeft = '10px';
            hmSpan.style.fontWeight = 'bold';
            scoreBoard.appendChild(hmSpan);
        }
        document.getElementById('hm-indicator').innerText = `| HM ${prestige}`;
    } else {
        const hmSpan = document.getElementById('hm-indicator');
        if (hmSpan) hmSpan.remove();
    }

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
const SHOP_POOL = [
    { id: 'dmg', name: 'Sharpening Stone', baseCost: 250, desc: '+5% Damage', action: () => { player.damageMultiplier += 0.05; player.runBuffs.damage += 0.05; } },
    { id: 'spd', name: 'Light Boots', baseCost: 200, desc: '+5% Speed', action: () => { player.speedMultiplier += 0.05; player.runBuffs.speed += 0.05; } },
    { id: 'hp', name: 'Heart Container', baseCost: 300, desc: '+20 Max HP', action: () => { player.maxHp += 20; player.hp += 20; player.runBuffs.maxHp += 20; } },
    { id: 'cd', name: 'Hourglass', baseCost: 350, desc: '-5% Cooldown', action: () => { player.cooldownMultiplier *= 0.95; player.runBuffs.cooldown += 0.05; } },
    { id: 'crit', name: 'Lucky Charm', baseCost: 400, desc: '+5% Crit Chance', action: () => { player.critChance += 0.05; } },
    { id: 'def', name: 'Iron Plating', baseCost: 400, desc: '+2% Dmg Reduction', action: () => { player.damageReduction = Math.min(0.75, player.damageReduction + 0.02); player.runBuffs.defense += 0.02; } },
    { id: 'range', name: 'Magnet', baseCost: 150, desc: '+20 Pickup Range', action: () => { player.pickupRadius += 20; } }
];

let currentShopItems = [];

function openShop() {
    isShopping = true;
    document.getElementById('shop-screen').style.display = 'flex';

    // Generate Shop Items if new visit (empty list)
    if (!currentShopItems || currentShopItems.length === 0) {
        currentShopItems = [];
        // Always add Heal
        currentShopItems.push({
            id: 'heal',
            name: 'Health Potion',
            baseCost: 100,
            desc: 'Heal 50 HP',
            action: () => { player.hp = Math.min(player.hp + 50, player.maxHp); }
        });

        // Pick 3 random unique items from pool
        const pool = [...SHOP_POOL];
        for (let i = 0; i < 3; i++) {
            if (pool.length === 0) break;
            const idx = Math.floor(Math.random() * pool.length);
            currentShopItems.push(pool[idx]);
            pool.splice(idx, 1);
        }
    }

    renderShopItems();
    setUIState('SHOP');
}

function renderShopItems() {
    document.getElementById('shopGoldVal').innerText = player.gold;

    // Update Health UI
    const updateShopHealth = () => {
        document.getElementById('shopHealthVal').innerText = Math.ceil(player.hp);
        document.getElementById('shopMaxHealthVal').innerText = Math.ceil(player.maxHp);
    };
    updateShopHealth();

    const container = document.getElementById('shop-container');
    container.innerHTML = '';

    // Calculate Multipliers
    // Price increases with wave and items bought
    const waveMult = 1 + (wave * 0.1);
    const boughtMult = 1 + ((currentRunStats.itemsBought || 0) * 0.2); // 20% increase per item bought

    currentShopItems.forEach(item => {
        const cost = Math.floor(item.baseCost * waveMult * boughtMult);

        const div = document.createElement('div');
        div.className = 'shop-item';
        div.innerHTML = `
            <div style="font-size: 24px; font-weight: bold; color: #fff;">${item.name}</div>
            <div style="color: #aaa; margin: 5px 0;">${item.desc}</div>
            <div class="shop-cost" style="color: ${player.gold >= cost ? '#f1c40f' : '#e74c3c'}">${cost} Gold</div>
        `;
        div.onclick = () => {
            if (player.gold >= cost) {
                player.gold -= cost;
                currentRunStats.moneySpent += cost;
                if (!currentRunStats.itemsBought) currentRunStats.itemsBought = 0;
                currentRunStats.itemsBought++;

                item.action();

                showNotification("Purchased!");
                renderShopItems(); // Re-render to update prices and health
            } else {
                showNotification("Not enough Gold!");
            }
        };
        container.appendChild(div);
    });
}

function closeShop() {
    isShopping = false;
    document.getElementById('shop-screen').style.display = 'none';
    currentShopItems = []; // Reset for next shop
    advanceWave();
}

// --- Story Logic ---
function triggerStory(completedWave) {
    // Check if story mode is enabled or if it's daily/weekly mode
    if ((saveData.story && saveData.story.enabled === false) || isDailyMode || isWeeklyMode) {
        // Skip story
        if (wave % 4 === 0) {
            openShop();
        } else {
            advanceWave();
        }
        return;
    }

    // Pass player type (uppercase) to get specific story events
    const heroType = player ? player.type.toUpperCase() : 'ALL';
    const nextWave = completedWave + 1;
    const story = storyManager.getEventForWave(nextWave, heroType);

    if (story) {
        currentStoryEvent = story; // Store for gameplay logic
        openStory(story);
    } else {
        currentStoryEvent = null;
        advanceWave();
    }
}

let currentStoryAudio = null;

function openStory(story) {
    isStoryOpen = true;
    document.getElementById('story-screen').style.display = 'flex';
    document.getElementById('story-title').innerText = story.title;
    document.getElementById('story-text').innerText = story.text;
    setUIState('STORY');

    // Save progress
    if (!saveData.story.unlockedChapters.includes(story.id)) {
        saveData.story.unlockedChapters.push(story.id);
        saveGame();
    }

    // Play Story Audio
    if (currentStoryAudio) {
        currentStoryAudio.pause();
        currentStoryAudio = null;
    }

    const audioPath = `music/story/${story.id}.mp3`;
    currentStoryAudio = new Audio(audioPath);
    // Optional: Adjust volume based on AudioManager settings if accessible, or default to 1.0
    // currentStoryAudio.volume = 1.0; 

    currentStoryAudio.play().catch(e => {
        // Audio file likely doesn't exist, ignore error
        // console.log("No audio found for story event:", story.id);
    });
}

function closeStory() {
    isStoryOpen = false;
    document.getElementById('story-screen').style.display = 'none';

    // Stop Story Audio
    if (currentStoryAudio) {
        currentStoryAudio.pause();
        currentStoryAudio.currentTime = 0;
        currentStoryAudio = null;
    }

    // Proceed to Shop or Next Wave
    // Special case: If wave is 0 (Intro), always advance to Wave 1
    if (wave === 0) {
        advanceWave();
    } else if (wave % 4 === 0) {
        openShop();
    } else {
        advanceWave();
    }
}

let currentObjective = null;

function startObjective() {
    currentObjective = {
        type: 'NONE',
        target: 0,
        current: 0,
        state: 'ACTIVE',
        data: {}
    };

    if (player.type === 'fire') {
        currentObjective.type = 'INFERNO';
        currentObjective.target = 30; // 30 seconds
        currentObjective.current = 0;
        showNotification("OBJECTIVE: MAINTAIN COMBO x10!");
    } else if (player.type === 'plant') {
        currentObjective.type = 'DEFENSE';
        currentObjective.data.sapling = {
            x: arena.width / 2,
            y: arena.height / 2,
            hp: 500,
            maxHp: 500,
            radius: 30
        };
        showNotification("OBJECTIVE: PROTECT THE SAPLING!");
    } else if (player.type === 'ice') {
        currentObjective.type = 'EYE_OF_STORM';
        currentObjective.target = 45; // Accumulate 45 seconds inside the eye
        currentObjective.current = 0;
        currentObjective.data.stormEye = {
            x: arena.width / 2,
            y: arena.height / 2,
            radius: 150,
            tx: arena.width / 2,
            ty: arena.height / 2
        };
        showNotification("OBJECTIVE: STAY IN THE EYE OF THE STORM!");
    } else if (player.type === 'water') {
        currentObjective.type = 'UNTOUCHABLE';
        currentObjective.target = 5; // Max 5 hits
        currentObjective.current = 0;
        showNotification("OBJECTIVE: AVOID DAMAGE!");
    } else if (player.type === 'metal') {
        currentObjective.type = 'IRON_WILL';
        currentObjective.target = 60; // Survive 60 seconds
        currentObjective.current = 0;
        showNotification("OBJECTIVE: SURVIVE THE DECAY!");
    }

    // DLC Hook: Start Objective
    if (window.HERO_LOGIC && window.HERO_LOGIC[player.type] && window.HERO_LOGIC[player.type].startObjective) {
        window.HERO_LOGIC[player.type].startObjective(currentObjective);
    }
}

function advanceWave() {
    wave++;
    enemiesKilledInWave = 0;
    masksDroppedInWave = 0; // Reset mask cap
    enemies = [];
    bossActive = false;

    // Randomize Biome
    let types = ['fire', 'water', 'ice', 'plant', 'metal'];
    if (player && player.type === 'black') {
        types = ['black']; // Keep Black in his own realm
    }

    // Wave 1 starts in home biome
    if (wave === 1 && player && player.type !== 'black') {
        currentBiomeType = player.type;
    } else {
        currentBiomeType = types[Math.floor(Math.random() * types.length)];
    }

    showNotification(`BIOME SHIFT: ${currentBiomeType.toUpperCase()}`);

    let layoutOverride = null;
    let trapOverride = null;
    if (currentStoryEvent && currentStoryEvent.data) {
        if (currentStoryEvent.data.layout !== undefined) layoutOverride = currentStoryEvent.data.layout;
        if (currentStoryEvent.data.trap !== undefined) trapOverride = currentStoryEvent.data.trap;
    }

    arena.generate(currentBiomeType, layoutOverride, trapOverride);

    // Reset Player Position to Center
    if (player) {
        player.x = arena.width / 2;
        player.y = arena.height / 2;
    }

    // Reset Objective
    currentObjective = null;

    // Check for Objective Wave
    if (currentStoryEvent && currentStoryEvent.type === 'OBJECTIVE_WAVE') {
        startObjective();
    }

    // Story Mode Companion Spawning
    if (currentStoryEvent && currentStoryEvent.type === 'COMPANION_JOIN') {
        let availableTypes = ['fire', 'water', 'ice', 'plant', 'metal'];
        // Remove player type
        if (player) {
            availableTypes = availableTypes.filter(t => t !== player.type);
        }
        // Remove existing companions
        companions.forEach(c => {
            availableTypes = availableTypes.filter(t => t !== c.type);
        });

        if (availableTypes.length > 0) {
            let pickedType = availableTypes[0]; // Default

            // Synergy Preference - Only for the first companion
            if (companions.length === 0) {
                if (player.type === 'ice' && availableTypes.includes('fire')) pickedType = 'fire';
                else if (player.type === 'fire' && availableTypes.includes('ice')) pickedType = 'ice';
                else if (player.type === 'metal' && availableTypes.includes('plant')) pickedType = 'plant';
                else if (player.type === 'plant' && availableTypes.includes('metal')) pickedType = 'metal';
                else if (player.type === 'water' && availableTypes.includes('plant')) pickedType = 'plant'; // Fallback synergy
            }

            companions.push(new Companion(pickedType, player));
            showNotification(`${pickedType.toUpperCase()} FRIEND JOINED!`);
        }
    }

    // Save Run State at start of wave
    saveRunState();

    setUIState('GAME');
}

function unlockAchievement(id) {
    if (!saveData.global.unlockedAchievements.includes(id)) {
        const ach = ACHIEVEMENTS.find(a => a.id === id);
        if (ach) {
            saveData.global.unlockedAchievements.push(id);
            showNotification(`ACHIEVEMENT: ${ach.title}`);
            saveGame();
        }
    }
}

function checkAchievements() {
    saveData.global.totalKills++;
    saveData.global.totalGold = (saveData.global.totalGold || 0) + 1;
    if (wave > saveData.global.maxWave) saveData.global.maxWave = wave;
    if (currentRunStats.maxCombo > (saveData.global.maxCombo || 0)) saveData.global.maxCombo = currentRunStats.maxCombo;

    // Calculate Dynamic Stats
    const totalSkills = ['fire', 'water', 'ice', 'plant', 'metal'].reduce((acc, h) => acc + (saveData[h].unlocked || 0), 0);
    const totalPrestige = ['fire', 'water', 'ice', 'plant', 'metal'].reduce((acc, h) => acc + (saveData[h].prestige || 0), 0);

    // DLC Stats
    const earthPrestige = saveData['earth'] ? (saveData['earth'].prestige || 0) : 0;
    const rockMaxWave = saveData['earth'] ? (saveData['earth'].highScore || 0) : 0; // Assuming highScore tracks max wave for that hero/biome context
    const killGolem = saveData.stats['kill_GOLEM'] || 0; // Need to ensure kill stats are tracked per enemy type
    const killBurrower = saveData.stats['kill_BURROWER'] || 0;

    const achievementsList = window.ACHIEVEMENTS || ACHIEVEMENTS;

    achievementsList.forEach(ach => {
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
            if (ach.stat === 'daily_wins' && (saveData.global.daily_wins || 0) >= ach.req) unlocked = true;
            if (ach.stat === 'weekly_wins' && (saveData.global.weekly_wins || 0) >= ach.req) unlocked = true;

            // Calculated Stats
            if (ach.stat === 'calculated_skills' && totalSkills >= ach.req) unlocked = true;
            if (ach.stat === 'calculated_prestige' && totalPrestige >= ach.req) unlocked = true;

            // DLC Stats
            if (ach.stat === 'earth_prestige' && earthPrestige >= ach.req) unlocked = true;
            if (ach.stat === 'rock_max_wave' && rockMaxWave >= ach.req) unlocked = true;
            if (ach.stat === 'kill_GOLEM' && killGolem >= ach.req) unlocked = true;
            if (ach.stat === 'kill_BURROWER' && killBurrower >= ach.req) unlocked = true;

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
    // Initialize Arena (3000x3000)
    arena = new Arena(3000, 3000);

    // Check for Shadow Form Mutator BEFORE creating player
    let heroType = selectedHeroType;
    if ((mode === 'DAILY' || mode === 'WEEKLY') && activeMutators.some(m => m.id === 'SHADOW_FORM')) {
        heroType = 'black';
    }

    player = new Player(heroType);
    // Center Player in Arena
    player.x = arena.width / 2;
    player.y = arena.height / 2;

    score = 0;
    wave = 0; // Start at 0, advanceWave will increment to 1
    enemiesKilledInWave = 0;
    masksDroppedInWave = 0; // Cap mask drops
    bossActive = false;
    enemies = [];
    projectiles = [];
    particles = [];
    floatingTexts = [];
    meleeAttacks = [];
    powerUps = [];
    holyMasks = [];
    goldDrops = [];
    cardDrops = [];
    memoryShards = [];
    companions = [];
    forcedEnemyType = null;
    currentObjective = null; // Reset Objective
    currentStoryEvent = null; // Reset Story Event to prevent leaks
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
        maxCombo: 0,
        itemsBought: 0
    };

    // Hide Menus
    document.getElementById('menu-overlay').style.display = 'none';
    document.getElementById('start-screen').style.display = 'none';
    document.getElementById('game-over-screen').style.display = 'none';
    document.getElementById('pause-screen').style.display = 'none';
    document.getElementById('levelup-screen').style.display = 'none';
    document.getElementById('shop-screen').style.display = 'none';

    // Mode Handling
    if (mode === 'NORMAL') {
        isDailyMode = false;
        isWeeklyMode = false;
        activeMutators = [];

        // Trigger Story Intro if enabled
        if (saveData.story && saveData.story.enabled) {
            triggerStory(0);
            return;
        }
    }
    // Daily/Weekly mode is set in startDailyChallenge/startWeeklyChallenge

    // Apply Mutators (Initial)
    if (isDailyMode || isWeeklyMode) {
        if (activeMutators.some(m => m.id === 'FRAGILE')) {
            player.maxHp = 1;
            player.hp = 1;
            player.damageMultiplier *= 5;
        }
        if (activeMutators.some(m => m.id === 'SLUG')) {
            player.speedMultiplier *= 0.5;
            player.damageMultiplier += 2; // +200%
        }
        if (activeMutators.some(m => m.id === 'ONE_TYPE')) {
            // Deterministic selection based on seed
            const seed = isWeeklyMode ? getWeeklySeed() : getDailySeed();
            const rand = Math.sin(seed + 999) * 10000;
            const index = Math.floor((rand - Math.floor(rand)) * ENEMY_TYPES.length);
            forcedEnemyType = ENEMY_TYPES[index];
            showNotification(`MUTATOR: ONLY ${forcedEnemyType} ENEMIES!`);
        } else {
            forcedEnemyType = null;
        }
    }

    // Start Wave 1
    advanceWave();
}

function gameOver(isVictory = false) {
    gameRunning = false;

    // Clear Saved Run on Death
    clearSavedRun();

    // Safety: Ensure stats object exists
    if (!saveData.stats) saveData.stats = {};

    // Track Games and Deaths
    saveData.global.totalGames = (saveData.global.totalGames || 0) + 1;
    if (!isVictory) {
        saveData.global.totalDeaths = (saveData.global.totalDeaths || 0) + 1;
    }

    checkAchievements();

    document.getElementById('menu-overlay').style.display = 'flex';

    // Show Screen
    const screen = document.getElementById('game-over-screen');
    if (screen) screen.style.display = 'flex';

    // Update Title
    const titleEl = document.getElementById('go-title');
    if (titleEl) {
        titleEl.innerText = isVictory ? "VICTORY!" : "GAME OVER";
        titleEl.style.color = isVictory ? "#f1c40f" : "#e74c3c";
    }

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

    // Update Play Again button based on mode
    const playAgainBtn = document.querySelector('#game-over-screen .btn-play-again');
    if (playAgainBtn) {
        if (isDailyMode) {
            playAgainBtn.onclick = function () { startGame('DAILY'); };
        } else if (isWeeklyMode) {
            playAgainBtn.onclick = function () { startGame('WEEKLY'); };
        } else {
            playAgainBtn.onclick = function () { startGame('NORMAL'); };
        }
    }
}

// --- Fixed Time Step Loop ---
let lastTime = 0;
const FPS = 60;
const frameDelay = 1000 / FPS;

function masterLoop(timestamp) {
    if (typeof audioManager !== 'undefined') {
        audioManager.update();
    }

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

        // --- MUSEUM STATE ---
        if (uiState === 'MUSEUM' && museum) {
            museum.update();
            museum.draw(ctx);
            return; // Skip normal game loop
        }

        if (gameRunning && !gamePaused && !isLevelingUp && !isShopping && !isStoryOpen) {

            // Update Camera
            arena.updateCamera(player, canvas.width, canvas.height);

            // Heatwave Mirage Effect (Camera Wobble)
            if (currentWeather && currentWeather.id === 'HEATWAVE') {
                const wobbleX = Math.sin(frame * 0.05) * 15;
                const wobbleY = Math.cos(frame * 0.03) * 15;
                arena.camera.x += wobbleX;
                arena.camera.y += wobbleY;
            }

            arena.update(player);

            // --- OBJECTIVE LOGIC ---
            if (currentObjective && currentObjective.state === 'ACTIVE') {
                if (currentObjective.type === 'INFERNO') {
                    if (player.combo >= 10) {
                        currentObjective.current += 1 / 60; // Add 1 second per 60 frames
                    }
                    if (currentObjective.current >= currentObjective.target) {
                        currentObjective.state = 'COMPLETED';
                        showNotification("OBJECTIVE COMPLETE!");
                        triggerStory(wave); // Advance
                    }
                } else if (currentObjective.type === 'DEFENSE') {
                    // Sapling Logic handled in draw/enemy loop
                    if (currentObjective.data.sapling.hp <= 0) {
                        currentObjective.state = 'FAILED';
                        gameOver();
                    }
                    // Survival Condition: Kill all enemies or survive time?
                    // Let's say kill count for now, or just standard wave clear
                    if (enemiesKilledInWave >= ENEMIES_PER_WAVE * wave) {
                        currentObjective.state = 'COMPLETED';
                        showNotification("SAPLING SAVED!");
                        triggerStory(wave);
                    }
                } else if (currentObjective.type === 'EYE_OF_STORM') {
                    const eye = currentObjective.data.stormEye;
                    // Move Eye
                    const dx = eye.tx - eye.x;
                    const dy = eye.ty - eye.y;
                    const distToTarget = Math.hypot(dx, dy);
                    if (distToTarget < 10) {
                        eye.tx = Math.random() * arena.width;
                        eye.ty = Math.random() * arena.height;
                    } else {
                        eye.x += (dx / distToTarget) * 1.5; // Speed
                        eye.y += (dy / distToTarget) * 1.5;
                    }

                    // Check Player
                    const d = Math.hypot(player.x - eye.x, player.y - eye.y);
                    if (d < eye.radius) {
                        currentObjective.current += 1 / 60;
                    } else {
                        // Damage if outside
                        if (frame % 60 === 0) {
                            if (!player.isInvincible) {
                                player.hp -= 5;
                                currentRunStats.damageTaken += 5;
                                floatingTexts.push(new FloatingText(player.x, player.y - 20, "STORM!", "#3498db", 20));
                            }
                            if (player.hp <= 0) gameOver();
                        }
                    }

                    if (currentObjective.current >= currentObjective.target) {
                        currentObjective.state = 'COMPLETED';
                        showNotification("STORM SURVIVED!");
                        triggerStory(wave);
                    }
                } else if (currentObjective.type === 'UNTOUCHABLE') {
                    if (currentObjective.current >= currentObjective.target) {
                        currentObjective.state = 'FAILED';
                        gameOver();
                    }
                    if (enemiesKilledInWave >= ENEMIES_PER_WAVE * wave) {
                        currentObjective.state = 'COMPLETED';
                        showNotification("UNTOUCHABLE!");
                        triggerStory(wave);
                    }
                } else if (currentObjective.type === 'IRON_WILL') {
                    // Decay HP
                    if (frame % 60 === 0) {
                        if (!player.isInvincible) player.hp -= 2; // Lose 2 HP per second
                        if (player.hp <= 0) {
                            currentObjective.state = 'FAILED';
                            gameOver();
                        }
                    }
                    currentObjective.current += 1 / 60;
                    if (currentObjective.current >= currentObjective.target) {
                        currentObjective.state = 'COMPLETED';
                        showNotification("SURVIVED!");
                        triggerStory(wave);
                    }
                }

                // DLC Hook: Check Completion
                if (window.HERO_LOGIC && window.HERO_LOGIC[player.type] && window.HERO_LOGIC[player.type].checkObjectiveCompletion) {
                    window.HERO_LOGIC[player.type].checkObjectiveCompletion(currentObjective, wave);
                }
            }

            // Boss Death Slow-Mo Sequence
            if (bossDeathTimer > 0) {
                bossDeathTimer--;

                // Slow down game logic (only run every 3rd frame)
                if (bossDeathTimer % 3 !== 0) {
                    // Still draw to keep it smooth, but don't update logic
                    ctx.clearRect(0, 0, canvas.width, canvas.height);

                    ctx.save();
                    ctx.translate(-arena.camera.x, -arena.camera.y);
                    arena.draw(ctx, getHeroTheme(player ? player.type : selectedHeroType));
                    // Draw entities (static for slow-mo)
                    // ... (Ideally we'd draw entities here too, but for now just arena is fine or we duplicate draw calls)
                    // Actually, let's just draw the arena background and overlay
                    ctx.restore();

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

                        // Chaos Reward
                        if (!saveData.chaos) saveData.chaos = { shards: 0, unlocked: [], active: [] };
                        saveData.chaos.shards += 1;
                        showNotification("EARNED 1 CHAOS SHARD!");

                        // Track Wins
                        saveData.global.daily_wins = (saveData.global.daily_wins || 0) + 1;

                        // Achievement
                        unlockAchievement('DAILY_CHALLENGE');
                        checkAchievements(); // Check tiered achievements

                        saveGame();
                        setTimeout(() => gameOver(true), 3000);
                        return;
                    }

                    // Weekly Challenge Win Condition
                    if (isWeeklyMode && wave === 20) {
                        showNotification("WEEKLY CHALLENGE COMPLETE!");
                        saveData.weekly.lastCompleted = getWeeklySeed();
                        // Reward (Bigger than Daily)
                        player.gold += 15000; // Bonus Gold
                        saveData.global.totalGold += 15000;

                        // Chaos Reward
                        if (!saveData.chaos) saveData.chaos = { shards: 0, unlocked: [], active: [] };
                        saveData.chaos.shards += 3;
                        showNotification("EARNED 3 CHAOS SHARDS!");

                        // Track Wins
                        saveData.global.weekly_wins = (saveData.global.weekly_wins || 0) + 1;

                        // Achievement
                        unlockAchievement('WEEKLY_CHALLENGE');
                        checkAchievements(); // Check tiered achievements

                        saveGame();
                        setTimeout(() => gameOver(true), 3000);
                        return;
                    }

                    triggerStory(wave);
                }
            }

            ctx.clearRect(0, 0, canvas.width, canvas.height);

            // Apply Camera Transform
            ctx.save();
            ctx.translate(-arena.camera.x, -arena.camera.y);

            // Draw World
            arena.draw(ctx, getHeroTheme(player ? player.type : selectedHeroType));

            // Draw Objective Elements
            if (currentObjective && currentObjective.state === 'ACTIVE') {
                const objDisplay = document.getElementById('objective-display');
                const objText = document.getElementById('objective-text');
                const objBar = document.getElementById('objective-bar-container');
                const objFill = document.getElementById('objective-bar-fill');

                objDisplay.style.display = 'block';
                objBar.style.display = 'block';

                if (currentObjective.type === 'INFERNO') {
                    objText.innerText = `COMBO TIME: ${Math.floor(currentObjective.current)} / ${currentObjective.target}s`;
                    objFill.style.width = `${(currentObjective.current / currentObjective.target) * 100}%`;
                    objFill.style.backgroundColor = '#e74c3c';
                } else if (currentObjective.type === 'DEFENSE') {
                    const s = currentObjective.data.sapling;
                    objText.innerText = `SAPLING HP: ${Math.floor(s.hp)}`;
                    objFill.style.width = `${(s.hp / s.maxHp) * 100}%`;
                    objFill.style.backgroundColor = '#2ecc71';

                    // Draw Sapling in World
                    ctx.save();
                    ctx.translate(s.x - arena.camera.x, s.y - arena.camera.y);
                    ctx.fillStyle = '#2ecc71';
                    ctx.beginPath(); ctx.arc(0, 0, s.radius, 0, Math.PI * 2); ctx.fill();
                    ctx.shadowBlur = 20; ctx.shadowColor = '#2ecc71'; ctx.stroke();
                    ctx.restore();
                } else if (currentObjective.type === 'EYE_OF_STORM') {
                    const eye = currentObjective.data.stormEye;
                    objText.innerText = `TIME IN EYE: ${Math.floor(currentObjective.current)} / ${currentObjective.target}s`;
                    objFill.style.width = `${(currentObjective.current / currentObjective.target) * 100}%`;
                    objFill.style.backgroundColor = '#ecf0f1';

                    // Draw Eye
                    ctx.save();
                    ctx.translate(eye.x - arena.camera.x, eye.y - arena.camera.y);

                    // Safe Zone
                    ctx.beginPath();
                    ctx.arc(0, 0, eye.radius, 0, Math.PI * 2);
                    ctx.fillStyle = 'rgba(52, 152, 219, 0.2)';
                    ctx.fill();
                    ctx.lineWidth = 5;
                    ctx.strokeStyle = '#ecf0f1';
                    ctx.stroke();
                    ctx.restore();
                } else if (currentObjective.type === 'UNTOUCHABLE') {
                    objText.innerText = `HITS TAKEN: ${currentObjective.current} / ${currentObjective.target}`;
                    objFill.style.width = `${(currentObjective.current / currentObjective.target) * 100}%`;
                    objFill.style.backgroundColor = '#3498db';
                } else if (currentObjective.type === 'IRON_WILL') {
                    objText.innerText = `SURVIVE: ${Math.floor(currentObjective.current)} / ${currentObjective.target}s`;
                    objFill.style.width = `${(currentObjective.current / currentObjective.target) * 100}%`;
                    objFill.style.backgroundColor = '#95a5a6';
                }

                // DLC Hook: Draw UI
                if (window.HERO_LOGIC && window.HERO_LOGIC[player.type] && window.HERO_LOGIC[player.type].drawObjectiveUI) {
                    window.HERO_LOGIC[player.type].drawObjectiveUI(currentObjective, objText, objFill);
                }
            } else {
                document.getElementById('objective-display').style.display = 'none';
            }

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
                    if (currentWeather.id === 'HEATWAVE') {
                        // Mirage Effect handled in Camera Update
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
            // Disable standard boss spawn if Objective Wave
            if (!bossActive && bossDeathTimer === 0 && enemiesKilledInWave >= ENEMIES_PER_WAVE * wave) {
                if (currentObjective && currentObjective.state === 'ACTIVE') {
                    // Do nothing, wait for objective completion logic
                } else {
                    bossActive = true;

                    // Story Mode Special Boss: Makuta (Legacy Check + New Event System)
                    let storyBossId = null;
                    if (currentStoryEvent && currentStoryEvent.type === 'BOSS_FIGHT' && currentStoryEvent.data) {
                        storyBossId = currentStoryEvent.data.bossId;
                    }

                    if (storyBossId === 'MAKUTA' || (saveData.story.enabled && !isDailyMode && !isWeeklyMode && (wave === 50 || wave === 100))) {
                        showNotification("MAKUTA HAS AWAKENED!");
                        document.getElementById('event-text').innerText = "BOSS: MAKUTA";
                        document.getElementById('event-text').style.display = 'block';
                        setTimeout(() => document.getElementById('event-text').style.display = 'none', 4000);

                        // Force Shadow Realm Biome
                        currentBiomeType = 'black';
                        arena.generate('black');
                        showNotification("ENTERING SHADOW REALM...");

                        enemies.unshift(new Boss('MAKUTA'));
                    } else if (storyBossId === 'GREEN_GOBLIN') {
                        showNotification("THE GREEN GOBLIN ATTACKS!");
                        document.getElementById('event-text').innerText = "BOSS: GREEN GOBLIN";
                        document.getElementById('event-text').style.display = 'block';
                        setTimeout(() => document.getElementById('event-text').style.display = 'none', 4000);
                        enemies.unshift(new Boss('GREEN_GOBLIN'));
                    } else {
                        // Standard Boss Spawning
                        if (Math.random() < 0.05) {
                            document.getElementById('event-text').style.display = 'block';
                            setTimeout(() => document.getElementById('event-text').style.display = 'none', 3000);
                            enemies.unshift(new Boss(), new Boss());
                        } else {
                            // Mutator: Double Boss
                            if ((isDailyMode || isWeeklyMode) && activeMutators.some(m => m.id === 'DOUBLE_BOSS')) {
                                enemies.unshift(new Boss(), new Boss());
                                showNotification("DOUBLE BOSS SPAWN!");
                            } else {
                                enemies.unshift(new Boss());
                            }
                        }
                    }
                    for (let i = 0; i < 5; i++) enemies.push(new Enemy(true));
                }
            }

            if (!bossActive && bossDeathTimer === 0) {
                let spawnRate = Math.max(5, 40 - (wave * 2));
                let forcedType = null;

                // Story Override
                if (currentStoryEvent && currentStoryEvent.type === 'WAVE_OVERRIDE' && currentStoryEvent.data) {
                    if (currentStoryEvent.data.spawnRateMod) {
                        spawnRate = Math.max(5, spawnRate * currentStoryEvent.data.spawnRateMod);
                    }
                    if (currentStoryEvent.data.forcedEnemyType) {
                        forcedType = currentStoryEvent.data.forcedEnemyType;
                    }
                }

                if (frame % Math.floor(spawnRate) === 0) {
                    let loops = 1;
                    if (typeof activeMutators !== 'undefined' && activeMutators.some(m => m.id === 'SWARM')) loops = 2;

                    for (let l = 0; l < loops; l++) {
                        if (forcedType) {
                            enemies.push(new Enemy(false, forcedType));
                        } else {
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
                }
            } else {
                if (frame % 150 === 0) enemies.push(new Enemy(true));
            }

            if (frame % 600 === 0) powerUps.push(new PowerUp());

            // --- Updates ---

            // Biome Effects on Player
            let biomeSpeedMod = 1;

            // DLC Hook: Biome Update
            if (window.BIOME_LOGIC && window.BIOME_LOGIC[currentBiomeType]) {
                window.BIOME_LOGIC[currentBiomeType].update(arena, player, enemies);
            }

            arena.biomeZones.forEach(zone => {
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
                            const lavaDmg = 5 * (1 - player.damageReduction);
                            if (!player.isInvincible) {
                                player.hp -= lavaDmg;
                                floatingTexts.push(new FloatingText(player.x, player.y - 20, Math.floor(lavaDmg), "#e74c3c", 20));
                                currentRunStats.damageTaken += 5;
                            }
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

            // Update Companions
            companions.forEach(c => {
                c.update();
                c.draw(ctx);
            });

            // Memory Shards
            memoryShards.forEach((shard, index) => {
                shard.update();
                shard.draw(ctx);
                const dist = Math.hypot(player.x - shard.x, player.y - shard.y);
                if (dist < player.radius + 20) {
                    // Collect
                    memoryShards.splice(index, 1);
                    showNotification("MEMORY RECOVERED!");
                    createExplosion(shard.x, shard.y, shard.color);

                    // Save Memory
                    if (!saveData.memories) saveData.memories = {};

                    const shardType = shard.heroType;

                    // Migration: Convert number to array if needed
                    if (typeof saveData.memories[shardType] === 'number') {
                        const count = saveData.memories[shardType];
                        saveData.memories[shardType] = [];
                        for (let i = 0; i < count; i++) saveData.memories[shardType].push(i);
                    }

                    if (!saveData.memories[shardType]) saveData.memories[shardType] = [];

                    const unlockedIndices = saveData.memories[shardType];
                    const allStories = MEMORY_STORIES[shardType] || [];
                    const availableIndices = [];
                    for (let i = 0; i < allStories.length; i++) {
                        if (!unlockedIndices.includes(i)) availableIndices.push(i);
                    }

                    if (availableIndices.length > 0) {
                        const newIndex = availableIndices[Math.floor(Math.random() * availableIndices.length)];
                        saveData.memories[shardType].push(newIndex);

                        // Show Story Text
                        const storyText = allStories[newIndex];
                        showNotification(`MEMORY: "${storyText}"`);
                    } else {
                        showNotification("MEMORY RECOVERED! (All collected)");
                    }

                    saveGame();
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
                    if (mask.isTrueGolden) {
                        // True Golden Mask Effect
                        player.damageMultiplier += 0.5; // +50% Damage
                        player.speedMultiplier += 0.2; // +20% Speed
                        player.maxHp += 50;
                        player.hp += 50;
                        player.cooldownMultiplier *= 0.8; // -20% Cooldown

                        showNotification("TRUE GOLDEN MASK! ALL STATS BOOSTED!");
                        createExplosion(player.x, player.y, '#fff');
                        // Unlock Achievement if exists?
                    } else {
                        saveData[player.type].level++;
                        saveGame();
                        showNotification("PERMANENT LEVEL UP!");
                        createExplosion(player.x, player.y, '#f1c40f');
                    }
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
                proj.update();
                if (proj.life !== null && proj.life <= 0) {
                    projectiles.splice(index, 1);
                    return;
                }
                proj.draw();
                if (arena.checkCollision(proj.x, proj.y, proj.radius)) {
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
                if (proj.x < 0 || proj.x > arena.width || proj.y < 0 || proj.y > arena.height) projectiles.splice(index, 1);
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
                arena.biomeZones.forEach(zone => {
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
                        // Frostbite Armor (Altar c2)
                        if (player.hasFrostbiteArmor) {
                            enemy.frozenTimer = 180; // 3s Freeze
                            floatingTexts.push(new FloatingText(enemy.x, enemy.y - 40, "FROZEN", "#aaddff", 16));
                        }

                        // Reflect damage?
                        enemy.hp -= 5;
                        createExplosion(player.x, player.y, '#95a5a6');
                        const angle = Math.atan2(enemy.y - player.y, enemy.x - player.x);
                        enemy.x += Math.cos(angle) * 20; enemy.y += Math.sin(angle) * 20;
                        return; // Skip damage
                    }

                    // Earth Hero Max Momentum Invulnerability (Ramming)
                    if (player.heroType === 'EARTH' && player.momentum >= player.maxMomentum * 0.95) {
                        // Bounce enemy away
                        const angle = Math.atan2(enemy.y - player.y, enemy.x - player.x);
                        if (!(enemy instanceof Boss)) {
                            enemy.x += Math.cos(angle) * 50;
                            enemy.y += Math.sin(angle) * 50;
                        }
                        createExplosion(player.x, player.y, '#8d6e63');
                        return; // No damage taken
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

                    // Thornmail (Altar p3)
                    if (player.thornmailTimer > 0) {
                        const reflectDmg = 20;
                        enemy.hp -= reflectDmg;
                        createExplosion(player.x, player.y, '#2ecc71');
                        floatingTexts.push(new FloatingText(player.x, player.y - 40, "REFLECT", "#2ecc71", 16));
                    }

                    if (!player.isInvincible) {
                        player.hp -= dmgTaken;
                        floatingTexts.push(new FloatingText(player.x, player.y - 20, Math.ceil(dmgTaken), "#e74c3c", 20));
                        currentRunStats.damageTaken += dmgTaken; // Track Damage
                        player.resetCombo(); // Reset Combo on Damage
                    }
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

                            if (!player.isInvincible) {
                                player.hp -= dmgTaken;
                                // Player takes damage number
                                floatingTexts.push(new FloatingText(player.x, player.y - 20, Math.ceil(dmgTaken), '#e74c3c', 20));
                                currentRunStats.damageTaken += dmgTaken; // Track Damage
                                player.resetCombo(); // Reset Combo on Damage

                                // Earth Hero Momentum Loss on Projectile Hit
                                if (player.heroType === 'EARTH' && player.momentum > 0) {
                                    player.momentum = Math.max(0, player.momentum - 30);
                                }
                            }

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
                            // Boss Immunity Check
                            if (enemy instanceof Boss && enemy.immune) {
                                floatingTexts.push(new FloatingText(enemy.x, enemy.y - 40, "IMMUNE", "#fff", 20));
                                projectiles.splice(pIndex, 1);
                                return;
                            }

                            let finalDamage = proj.damage;

                            // Card Bonuses
                            const bonuses = getCollectionBonuses(enemy.subType);
                            if (enemy instanceof Boss) {
                                const bossBonuses = getCollectionBonuses('BOSS');
                                bonuses.damageMult += (bossBonuses.damageMult - 1);

                                // Tank Boss Phase 2 Vulnerability
                                if (enemy.type === 'TANK' && enemy.phase === 2) {
                                    bonuses.damageMult *= 1.5; // Takes 50% more damage
                                }
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

                            // Altar: Wildfire (c4) - Apply Burn
                            if (proj.isWildfire) {
                                // Simple burn implementation: instant extra damage for now, or add status effect logic to Enemy class
                                // Let's do instant bonus damage + visual
                                finalDamage += 10;
                                createExplosion(enemy.x, enemy.y, '#e67e22');
                            }

                            // Altar: Cryo-Flora (c9) - Apply Freeze
                            if (proj.isCryo) {
                                enemy.frozenTimer = 60; // 1s
                                floatingTexts.push(new FloatingText(enemy.x, enemy.y - 40, "FROZEN", "#aaddff", 16));
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
                    // Boss Minion Logic
                    if (enemy.isSummonedMinion && enemy.parentBoss) {
                        enemy.parentBoss.minionsToKill--;
                    }

                    player.addCombo(); // Add Combo
                    if (player.onKill) player.onKill(); // Trigger onKill effects (e.g. Black Hero Heal)
                    checkAchievements(); // Check achievements on kill

                    // Mutator: Explosive Personality
                    if ((isDailyMode || isWeeklyMode) && activeMutators.some(m => m.id === 'EXPLOSIVE')) {
                        createExplosion(enemy.x, enemy.y, '#e74c3c');
                        if (Math.hypot(player.x - enemy.x, player.y - enemy.y) < 100) {
                            if (!player.isInvincible) {
                                player.hp -= 10 * (1 - player.damageReduction);
                                floatingTexts.push(new FloatingText(player.x, player.y - 20, "10", "#e74c3c", 20));
                            }
                        }
                    }

                    if (enemy instanceof Boss) {
                        // Makuta Achievement Check
                        if (enemy.type === 'MAKUTA') {
                            unlockAchievement('MAKUTA_SLAYER'); // Base Achievement

                            // Hard Mode Achievements (1-10)
                            const prestige = saveData[player.type].prestige;
                            for (let i = 1; i <= 10; i++) {
                                if (prestige >= i) unlockAchievement(`MAKUTA_HM_${i}`);
                            }

                            showNotification("MAKUTA DEFEATED!");
                        }

                        currentRunStats.bossesKilled++; // Track Boss Kill
                        saveData.global.totalBosses = (saveData.global.totalBosses || 0) + 1; // Achievement track
                        score += 1000; player.gainXp(500); createExplosion(enemy.x, enemy.y, '#c0392b');
                        checkDrop('BOSS', enemy.x, enemy.y); // Boss Card

                        // True Golden Mask Drop (Makuta Wave 100+)
                        if (enemy.type === 'MAKUTA' && wave >= 100) {
                            holyMasks.push(new HolyMask(enemy.x, enemy.y, true));

                            // Unlock Hero Story Achievement
                            if (player.type === 'fire') unlockAchievement('STORY_FIRE');
                            if (player.type === 'water') unlockAchievement('STORY_WATER');
                            if (player.type === 'ice') unlockAchievement('STORY_ICE');
                            if (player.type === 'plant') unlockAchievement('STORY_PLANT');
                            if (player.type === 'metal') unlockAchievement('STORY_METAL');
                        }

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

                        // Track Specific Enemy Kills for Achievements
                        const killKey = `kill_${enemy.subType}`;
                        if (!saveData.stats[killKey]) saveData.stats[killKey] = 0;
                        saveData.stats[killKey]++;

                        score += 10; player.gainXp(20); createExplosion(enemy.x, enemy.y, '#aaa');

                        // Elite Logic on Death
                        if (enemy.isElite) {
                            score += 500;
                            player.gainXp(200);
                            createExplosion(enemy.x, enemy.y, enemy.eliteType.color);

                            // Elite Card Drop
                            checkDrop(enemy.eliteType.id, enemy.x, enemy.y);

                            if (enemy.eliteType.id === 'EXPLODER') {
                                let radius = 200;
                                if (saveData.collection.includes('ELITE_EXPLODER_4')) radius = 160; // Nerf

                                createExplosion(enemy.x, enemy.y, '#e74c3c');
                                // Damage Player
                                if (Math.hypot(player.x - enemy.x, player.y - enemy.y) < radius) {
                                    if (!player.isInvincible) {
                                        player.hp -= 30 * (1 - player.damageReduction);
                                        floatingTexts.push(new FloatingText(player.x, player.y - 20, "30", "#e74c3c", 20));
                                    }
                                }
                            }
                        }

                        // Mask Drop Logic (Capped at 5 per wave)
                        if (masksDroppedInWave < 5 && Math.random() < player.maskChance) {
                            holyMasks.push(new HolyMask(enemy.x, enemy.y));
                            masksDroppedInWave++;
                        }

                        // Mutator: No Regen (No Health Drops)
                        if (!((isDailyMode || isWeeklyMode) && activeMutators.some(m => m.id === 'NO_REGEN'))) {
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

            // Restore Camera Transform
            ctx.restore();

            // DLC Hook: Biome Draw (e.g. Falling Rock Shadows)
            if (window.BIOME_LOGIC && window.BIOME_LOGIC[currentBiomeType]) {
                ctx.save();
                // Apply camera transform again for biome effects
                ctx.translate(-arena.camera.x, -arena.camera.y);
                window.BIOME_LOGIC[currentBiomeType].draw(ctx, arena);
                ctx.restore();
            }

            // Chaos: Darkness (Fog of War) OR Mutator: Low Visibility
            const isLowVis = (typeof activeMutators !== 'undefined' && activeMutators.some(m => m.id === 'LOW_VISIBILITY'));
            if ((typeof isChaosActive === 'function' && isChaosActive('DARKNESS')) || isLowVis) {
                ctx.save();
                const gradient = ctx.createRadialGradient(canvas.width / 2, canvas.height / 2, 150, canvas.width / 2, canvas.height / 2, 800);
                gradient.addColorStop(0, 'transparent');
                gradient.addColorStop(0.4, 'rgba(0, 0, 0, 0.8)');
                gradient.addColorStop(1, 'rgba(0, 0, 0, 1)');
                ctx.fillStyle = gradient;
                ctx.fillRect(0, 0, canvas.width, canvas.height);
                ctx.restore();
            }

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

// Initialize DLCs then Menu
if (window.dlcManager) {
    window.dlcManager.init().then(() => {
        initMenu();
        masterLoop();
    });
} else {
    initMenu();
    masterLoop();
}

// OPTIONAL: Auto-save every 30 seconds
setInterval(() => {
    if (gameRunning && !gamePaused) {
        saveGame();
    }
}, 30000);
