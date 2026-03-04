const isElectron = typeof process !== 'undefined' && process.versions && process.versions.electron;
// lastInputType moved to InputManager
let fs, path, saveFilePath;

if (isElectron) {
    fs = require('fs');
    path = require('path');
    // Use the path we set in index.js
    saveFilePath = path.join(process.env.APP_SAVE_PATH, 'save_data.json');
    console.log("Save File Location:", saveFilePath); // Useful for debugging
}

const canvas = document.getElementById('gameCanvas');
window.canvas = canvas; // Expose for DLCs
const ctx = canvas.getContext('2d');
window.ctx = ctx; // Expose for DLCs
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
    fire: { level: 0, unlocked: 1, highScore: 0, prestige: 0, maxWinPrestige: -1 },
    water: { level: 0, unlocked: 0, highScore: 0, prestige: 0, maxWinPrestige: -1 },
    ice: { level: 0, unlocked: 0, highScore: 0, prestige: 0, maxWinPrestige: -1 },
    plant: { level: 0, unlocked: 0, highScore: 0, prestige: 0, maxWinPrestige: -1 },
    metal: { level: 0, unlocked: 0, highScore: 0, prestige: 0, maxWinPrestige: -1 },
    black: { level: 0, unlocked: 0, highScore: 0, prestige: 0, maxWinPrestige: -1 }, // Hidden/Daily Hero
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
    savedRun: null, // Slot for mid-run save
    tutorial: { seen: false, completed: false }, // First-launch & completion tracking
};

let currentBiomeType = 'fire'; // Default, updated in startGame
let isVersusMode = false;
let isChaosShuffleMode = false;
let isTutorialMode = false;
window.saveData = {
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
// Moved to SaveManager.js

function saveGame() {
    if (typeof SaveManager !== 'undefined') {
        SaveManager.saveGame(window.saveData);
    }
}

// --- Audio System ---
// Audio management has been moved to AudioManager.js


function loadGame() {
    if (typeof SaveManager !== 'undefined') {
        window.saveData = SaveManager.loadGame(defaultSaveData);
    } else {
        console.error("SaveManager is not defined!");
        window.saveData = JSON.parse(JSON.stringify(defaultSaveData));
    }
}

function exportSave() {
    if (typeof SaveManager !== 'undefined') {
        SaveManager.exportSave(window.saveData);
    }
}

function importSave(input) {
    if (!input.files[0]) return;
    if (typeof SaveManager !== 'undefined') {
        SaveManager.importSave(input.files[0], (data) => {
            window.saveData = data;
            saveGame();
            alert("Save loaded successfully!");
            location.reload();
        });
    }
}

function closeGame() {
    if (isElectron) {
        window.close();
    } else {
        alert("Cannot close window in browser mode. Please close the tab.");
    }
}

// --- Hero Specific Skill Trees ---
// --- Skill Tree Data is in UI/Statistics.js ---

// --- Menu Logic ---
window.selectedHeroType = 'fire';

// Moved to UI/MainMenu.js

// Moved to UI/MainMenu.js

// --- UI State Management for Gamepad ---
// uiState, uiSelectionIndex, uiDebounce are now managed by UIManager
const uiManager = new UIManager();
// Compatibility accessors (getters/setters if we wanted to be strict, but for now we replace usages)
// We need to keep `uiState` global variable because it is used everywhere in game.js logic like `if (uiState === 'GAME')`
// So we will sync them or replace usages. Replacing 100+ usages is risky in one shot.
// Plan: Redirect window.setUIState to UIManager, and `uiState` variable can refer to `uiManager.uiState`.

// REPLACEMENT STRATEGY:
// 1. Remove `let uiState ...` definition.
// 2. Define `uiState` property on window to link to `uiManager.uiState`.

Object.defineProperty(window, 'uiState', {
    get: function () { return uiManager.uiState; },
    set: function (v) { uiManager.uiState = v; }
});
Object.defineProperty(window, 'uiSelectionIndex', {
    get: function () { return uiManager.uiSelectionIndex; },
    set: function (v) { uiManager.uiSelectionIndex = v; }
});
Object.defineProperty(window, 'uiDebounce', {
    get: function () { return uiManager.uiDebounce; },
    set: function (v) { uiManager.uiDebounce = v; }
});

let lastGamepadState = { a: false, b: false, y: false };

// Make this global so Player.js can use it
window.setUIState = function (newState) {
    uiManager.setUIState(newState);
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

// Collection Logic moved to UI/Statistics.js

// --- Statistics Screen Logic ---
// Moved to UI/Statistics.js

// --- Completion Menu Logic ---
// Moved to UI/Statistics.js

function getFocusables() {
    return uiManager.getFocusables();
}

function updateUIHighlight() {
    uiManager.updateUIHighlight();
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
        inputManager.lastInputType = 'GAMEPAD';
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

    // --- CHAOS GAMBLE ---
    if (uiState === 'CHAOS_GAMBLE') {
        if (left) {
            chaosSelectionIndex = Math.max(0, chaosSelectionIndex - 1);
            updateChaosGambleUI();
            uiDebounce = 10;
        }
        if (right) {
            chaosSelectionIndex = Math.min(chaosShuffleOptions.length - 1, chaosSelectionIndex + 1);
            updateChaosGambleUI();
            uiDebounce = 10;
        }
        if (a) {
            confirmChaosGamble(chaosSelectionIndex);
            uiDebounce = 20;
        }
        return;
    }

    // --- CONFIRM DIALOGUE ---
    if (uiState === 'CONFIRM_OVERWRITE') {
        if (a) {
            confirmNewGame();
            uiDebounce = 20;
        }
        if (b) {
            closeConfirmDialog();
            uiDebounce = 20;
        }
        return;
    }

    // --- TUTORIAL WELCOME PROMPT ---
    if (uiState === 'TUTORIAL_PROMPT') {
        const acceptBtn = document.getElementById('tutorial-accept-btn');
        const skipBtn = document.getElementById('tutorial-skip-btn');
        if (left || right) {
            if (document.activeElement === acceptBtn) skipBtn.focus();
            else acceptBtn.focus();
            uiDebounce = 15;
        }
        if (a) {
            if (document.activeElement === skipBtn) skipTutorialPrompt();
            else acceptTutorialPrompt();
            uiDebounce = 20;
        }
        if (b) {
            skipTutorialPrompt();
            uiDebounce = 20;
        }
        return;
    }

    // --- SCROLLING LOGIC (Right Stick - REMOVED, now handled by selection) ---
    if (uiState === 'MENU') {
        // Music Toggle (still needed on Y)
        if (y && !lastGamepadState.y) {
            toggleMusic();
            uiDebounce = 20;
        }
    }

    // Back Action (B Button) - Moved BEFORE focus check so it works on empty screens
    if (b && !lastGamepadState.b) {
        if (uiState === 'OPTIONS') closeOptions();
        else if (uiState === 'PERMSHOP') closePermShop();
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

function startShuffleGame() {
    if (!saveData.story) {
        saveData.story = { unlockedChapters: [], enabled: false };
    }
    saveData.story.enabled = false;
    startGame('SHUFFLE');
}

function startTutorialGame() {
    if (!saveData.story) saveData.story = { unlockedChapters: [], enabled: false };
    saveData.story.enabled = false;
    selectedHeroType = 'fire';
    startGame('TUTORIAL');
}

function acceptTutorialPrompt() {
    document.getElementById('tutorial-welcome-overlay').style.display = 'none';
    saveData.tutorial.seen = true;
    saveGame();
    checkNewGame('TUTORIAL');
}

function skipTutorialPrompt() {
    document.getElementById('tutorial-welcome-overlay').style.display = 'none';
    saveData.tutorial.seen = true;
    saveGame();
    setUIState('MENU');
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

    // Safety: Hide other possible overlays
    const optScreen = document.getElementById('options-screen');
    if (optScreen) optScreen.style.display = 'none';
    const chaosScreen = document.getElementById('chaos-selection-screen');
    if (chaosScreen) chaosScreen.style.display = 'none';

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

    // First-launch tutorial prompt
    if (saveData.tutorial && !saveData.tutorial.seen) {
        const overlay = document.getElementById('tutorial-welcome-overlay');
        if (overlay) overlay.style.display = 'flex';
        setUIState('TUTORIAL_PROMPT');
        setTimeout(() => {
            const btn = document.getElementById('tutorial-accept-btn');
            if (btn) btn.focus();
        }, 50);
    }
}

// --- DLC Menu Logic ---
const DLC_META = {
    rise_of_the_rock:      { rgb: '180,120,60'  },
    tournament_of_thunder: { rgb: '241,196,15'  },
    champions_of_chaos:    { rgb: '155,89,182'  },
    waker_of_winds:        { rgb: '64,224,208'  },
    faith_of_fortune:      { rgb: '240,180,100' },
    symphony_of_sickness:  { rgb: '100,180,255' },
};

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
        container.innerHTML = '<div style="color:rgba(231,76,60,0.7); text-align:center; padding:40px;">DLC Manager not found.</div>';
        return;
    }

    const dlcs = window.dlcManager.getDLCList();

    if (dlcs.length === 0) {
        container.innerHTML = '<div style="color:rgba(255,255,255,0.2); text-align:center; padding:40px;">No expansions found.</div>';
        return;
    }

    dlcs.forEach(dlc => {
        const meta = DLC_META[dlc.id] || { rgb: '150,150,150' };
        const card = document.createElement('div');
        card.className = `dlc-card${dlc.active ? ' dlc-active' : ''}`;
        card.style.setProperty('--dlc-rgb', meta.rgb);

        card.innerHTML = `
            <div class="dlc-icon-wrap">${dlc.icon}</div>
            <div class="dlc-info">
                <div class="dlc-name">${dlc.title}</div>
                <div class="dlc-desc">${dlc.desc}</div>
            </div>
            <div class="dlc-status-col">
                <div class="dlc-badge ${dlc.active ? 'badge-active' : 'badge-inactive'}">
                    ${dlc.active ? '✓ ACTIVE' : '○ INACTIVE'}
                </div>
                <div class="dlc-action-btn">${dlc.active ? 'DISABLE' : 'ENABLE'}</div>
            </div>
        `;

        card.onclick = () => {
            window.dlcManager.toggleDLC(dlc.id, !dlc.active);
            renderDLCList();
        };

        container.appendChild(card);
    });
}

// --- Run Saving System ---

function saveRunState() {
    if (!gameRunning || wave <= 0) return;

    let currentMode = 'NORMAL';
    if (typeof isChaosShuffleMode !== 'undefined' && isChaosShuffleMode) currentMode = 'SHUFFLE';
    else if (saveData.story && saveData.story.enabled) currentMode = 'STORY';

    const runState = {
        mode: currentMode,
        wave: wave,
        score: score,
        chaos: (currentMode === 'SHUFFLE') ? {
            heroAffection: (typeof heroAffection !== 'undefined') ? heroAffection : {},
            chaosObjectiveStreak: (typeof chaosObjectiveStreak !== 'undefined') ? chaosObjectiveStreak : 0,
            lostHeroes: (typeof lostHeroes !== 'undefined') ? lostHeroes : []
        } : null,
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
        let modeName = 'Standard Run';
        if (saveData.savedRun.mode === 'STORY') modeName = 'Story Mode';
        else if (saveData.savedRun.mode === 'SHUFFLE') modeName = 'Chaos Shuffle';

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

    // Restore Chaos State if applicable
    if (state.mode === 'SHUFFLE' && state.chaos) {
        if (typeof heroAffection !== 'undefined') {
            // We need to carefully assign properties to avoid reference breaking if using let/const in other file
            Object.assign(heroAffection, state.chaos.heroAffection);
        }
        if (typeof chaosObjectiveStreak !== 'undefined') chaosObjectiveStreak = state.chaos.chaosObjectiveStreak;
        if (typeof lostHeroes !== 'undefined') {
            lostHeroes.length = 0; // Clear array
            state.chaos.lostHeroes.forEach(h => lostHeroes.push(h));
        }
    }

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
        setUIState('CONFIRM_OVERWRITE'); // Set UI state for controller
    } else {
        if (mode === 'STORY') startStoryGame();
        else if (mode === 'SHUFFLE') startShuffleGame();
        else if (mode === 'TUTORIAL') startTutorialGame();
        else startStandardGame();
    }
}

function confirmNewGame() {
    clearSavedRun();
    closeConfirmDialog();
    if (pendingGameMode === 'STORY') startStoryGame();
    else if (pendingGameMode === 'SHUFFLE') startShuffleGame();
    else if (pendingGameMode === 'TUTORIAL') startTutorialGame();
    else startStandardGame();
}

function closeConfirmDialog() {
    document.getElementById('confirm-dialog').style.display = 'none';
    pendingGameMode = null;
    setUIState('MENU'); // Restore UI state
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

// --- Move Quit Warning and Options to UI/Options.js ---

// --- Permanent Shop Logic ---
// Moved to UI/Shop.js

// --- Chaos Shop Logic ---
// Moved to UI/Shop.js

// --- Skill Tree Logic ---
// Moved to UI/Statistics.js

// --- Achievements Logic ---
// Moved to UI/Statistics.js

// --- Museum Logic Moved to Museum.js ---



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

// --- Render Skill Tree Logic ---
// Moved to UI/Statistics.js

// --- Hero Utils moved to Player.js ---



// --- Game State ---
let arena; // Arena Instance
// GLOBAL VARIABLES (Window Scope for UI Access)
var gameRunning = false;
var gamePaused = false;
var isLevelingUp = false;
var isShopping = false;
var isStatsOpen = false;

let score = 0;
var wave = 1; // Exposed for DLC
let frame = 0;
var enemiesKilledInWave = 0; // Exposed for DLC
var bossActive = false;      // Exposed for DLC
let bossDeathTimer = 0; // Timer for slow-mo effect
var isPlayerDying = false; // Player death animation flag - Exposed for Player.js
let playerDeathTimer = 0; // Timer for player death animation

// Weather
let currentWeather = null;
let weatherTimer = 3600; // Time until next weather
let weatherDuration = 0;

// GLOBAL VARIABLES (Window Scope for DLC Access)
var player;
var projectiles = [];
var enemies = [];
var particles = [];
var floatingTexts = [];
var meleeAttacks = [];

// Explicitly link to window to be 100% sure
window.player = player;
window.projectiles = projectiles;
window.enemies = enemies;
window.particles = particles;
window.floatingTexts = floatingTexts;
window.meleeAttacks = meleeAttacks;
window.arena = arena; // Expose Arena to Window for DLCs
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
var isStoryOpen = false;
let currentStoryEvent = null;

// Input
const inputManager = new InputManager(); // Handles keys, mouse, and lastInputType

// Context menu blocked by InputManager

inputManager.onKeyDown = e => {
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

        // DEBUG: Level Up with 'L'
        if (e.code === 'KeyL' && gameRunning && !gamePaused) {
            player.levelUp();
            showNotification("DEBUG: LEVEL UP");
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

        // DEBUG: Activate Ultimate Form with 'U'
        if ((e.code === 'KeyU' || e.key === 'u') && gameRunning && !gamePaused && player) {
            if (player.getFormName) {
                player.transformActive = true;
                player.currentForm = player.getFormName();
                // Air Hero visual fix: Activate Hurricane for Zephyr form
                if (player.type === 'air' && player.currentForm === 'ZEPHYR') {
                    player.hurricaneActive = true;
                }
                showNotification(`DEBUG: ${player.currentForm} FORM ACTIVATED!`);
                if (window.createExplosion) createExplosion(player.x, player.y, '#fff');
            } else {
                showNotification("DEBUG: NO ULTIMATE FORM AVAILABLE");
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

        // DEBUG: Simulate first launch (reset tutorial seen flag) with 'T' in Menu
        if (e.code === 'KeyT' && uiState === 'MENU') {
            saveData.tutorial = { seen: false, completed: false };
            saveGame();
            const overlay = document.getElementById('tutorial-welcome-overlay');
            if (overlay) overlay.style.display = 'flex';
            setUIState('TUTORIAL_PROMPT');
            showNotification('DEBUG: FIRST LAUNCH SIMULATED');
        }
    }
};

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

    const btn = document.querySelector('#daily-info-modal .screen-action-btn');
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

    const btn = document.querySelector('#daily-info-modal .screen-action-btn');
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

// Projectile class moved to Entities/Projectile.js

// MeleeSwipe, GoldDrop, CardDrop moved to Entities/

// HolyMask, PowerUp, Particle, FloatingText moved to Entities/
// shadeColor moved to Utils.js

// Expose Classes for DLC
window.FloatingText = FloatingText;
window.Particle = Particle;
window.CardDrop = CardDrop;
window.createExplosion = createExplosion; // Ensure function is visible

function createExplosion(x, y, color, count = 10) {
    for (let i = 0; i < 8; i++) { particles.push(new Particle(x, y, color)); }
}

function spawnLevelUpAura(x, y, color) {
    // Upward-rising aura particles — staggered with setTimeout for a flowing effect
    for (let i = 0; i < 40; i++) {
        setTimeout(() => {
            if (!particles) return;
            const ox = (Math.random() - 0.5) * 28; // spread around player
            const oy = (Math.random() - 0.5) * 10;
            const p = new Particle(x + ox, y + oy, color);
            p.velocity.x = (Math.random() - 0.5) * 1.8;
            p.velocity.y = -(Math.random() * 3.2 + 1.2); // drift upward
            p.life      = Math.random() * 0.008 + 0.005;  // slow fade (~120-200 frames)
            particles.push(p);
        }, i * 28);
    }
    // Burst ring at moment of level-up
    const ringCount = 18;
    for (let i = 0; i < ringCount; i++) {
        const angle = (i / ringCount) * Math.PI * 2;
        const speed = Math.random() * 1.5 + 1.5;
        const p = new Particle(x, y, color);
        p.velocity.x = Math.cos(angle) * speed;
        p.velocity.y = Math.sin(angle) * speed;
        p.life = 0.025;
        particles.push(p);
    }
}
window.spawnLevelUpAura = spawnLevelUpAura;

// generateArena removed - moved to Arena.js

// checkWallCollision removed - moved to Arena.js

// drawArena removed - moved to Arena.js

let _hudPrevHp = null, _hudPrevXp = null, _hudPrevMeleeReady = null;

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
    const displayHp = Math.max(0, Math.ceil(player.hp));
    const hpFill   = document.getElementById('health-fill');
    hpFill.style.width = hpPercent + '%';
    document.getElementById('health-text').innerText = displayHp + " / " + player.maxHp;
    if (_hudPrevHp !== null && player.hp < _hudPrevHp) {
        const hpWrap = hpFill.parentElement;
        if (!hpWrap.classList.contains('bar-glow-health')) {
            hpWrap.classList.add('bar-glow-health');
            setTimeout(() => hpWrap.classList.remove('bar-glow-health'), 550);
        }
    }
    _hudPrevHp = player.hp;

    const xpPercent = Math.min(100, (player.xp / player.maxXp) * 100);
    const xpFill    = document.getElementById('xp-fill');
    xpFill.style.width = xpPercent + '%';
    document.getElementById('xp-text').innerText = "Level " + player.level;
    if (_hudPrevXp !== null && xpPercent > _hudPrevXp) {
        const xpWrap = xpFill.parentElement;
        if (!xpWrap.classList.contains('bar-glow-xp')) {
            xpWrap.classList.add('bar-glow-xp');
            setTimeout(() => xpWrap.classList.remove('bar-glow-xp'), 550);
        }
    }
    _hudPrevXp = xpPercent;

    const meleePercent  = Math.max(0, 100 - (player.meleeCooldown / player.meleeMaxCooldown * 100));
    const meleeFill     = document.getElementById('melee-fill');
    meleeFill.style.width = meleePercent + '%';
    document.getElementById('melee-text').innerText = player.meleeCooldown <= 0 ? "MELEE READY" : "RECHARGING";
    const meleeReady = player.meleeCooldown <= 0;
    if (_hudPrevMeleeReady === false && meleeReady) {
        const meleeWrap = meleeFill.parentElement;
        if (!meleeWrap.classList.contains('bar-glow-melee')) {
            meleeWrap.classList.add('bar-glow-melee');
            setTimeout(() => meleeWrap.classList.remove('bar-glow-melee'), 550);
        }
    }
    _hudPrevMeleeReady = meleeReady;

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

    // Chaos Mode Indicators
    if (saveData.chaos && saveData.chaos.active && saveData.chaos.active.length > 0) {
        const chaosIcons = {
            'INVERTED': '↔️',
            'SLIPPERY': '🧊',
            'GIANT_ENEMIES': '👹',
            'TINY_PLAYER': '🐜',
            'EXPLOSIVE_STEPS': '💣',
            'DRUNK_CAM': '😵',
            'SPEED_DEMON': '⏩',
            'GHOST_TOWN': '👻',
            'MELEE_ONLY': '⚔️'
        };

        saveData.chaos.active.forEach(id => {
            const effect = CHAOS_EFFECTS.find(e => e.id === id);
            if (effect) {
                const div = document.createElement('div');
                div.className = 'buff-icon chaos-icon'; // Added class for potential styling
                div.style.backgroundColor = effect.color;
                div.style.color = 'white';
                div.style.border = '2px solid #fff'; // Distinguish from normal buffs
                div.innerText = chaosIcons[id] || '🌀';
                div.title = effect.name; // Tooltip
                buffContainer.appendChild(div);
            }
        });
    }
}

function chooseUpgrade(type) {
    if (type === 'health') {
        player.maxHp += 25;
        player.hp = Math.min(player.maxHp, player.hp + (player.maxHp * 0.2));
        player.runBuffs.maxHp += 25;
    }
    else if (type === 'radius') {
        player.meleeRadius *= 1.25;
    }
    else if (type === 'projectile') {
        if (player.heroType === 'EARTH') {
            // Earth Hero: Increase Ram Damage
            player.stats.ramDmgMult = (player.stats.ramDmgMult || 1) + 0.2; // +20% Ram Damage
            showNotification("RAM DAMAGE INCREASED!");
        } else {
            player.extraProjectiles += 1;
            player.runBuffs.projectiles += 1;
            // Balance: -20% Damage (Additive divisor) per split, similar to Skill Tree
            player.stats.rangeDmg /= 1.2;
        }
    }
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

// --- Shop Logic moved to UI/Shop.js ---

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

const _STORY_THEMES = {
    all:       { rgb: '212,175,55',  icon: '✦'  },
    fire:      { rgb: '231,76,60',   icon: '🔥' },
    water:     { rgb: '52,152,219',  icon: '💧' },
    ice:       { rgb: '170,200,218', icon: '❄️' },
    plant:     { rgb: '46,204,113',  icon: '🌿' },
    metal:     { rgb: '149,165,166', icon: '⚙️' },
    earth:     { rgb: '141,110,99',  icon: '🪨' },
    lightning: { rgb: '241,196,15',  icon: '⚡' },
    gravity:   { rgb: '155,89,182',  icon: '🌀' },
    void:      { rgb: '0,188,212',   icon: '☯️' },
    spirit:    { rgb: '240,208,128', icon: '✨' },
    chance:    { rgb: '224,64,251',  icon: '🎲' },
};

function _getStoryArcLabel(wave, hero) {
    const h = (hero || 'ALL').toLowerCase();
    const w = wave || 1;

    // DLC-injected arc labels (each DLC registers its own hero labels here)
    if (window.STORY_ARC_LABELS && typeof window.STORY_ARC_LABELS[h] === 'function') {
        return window.STORY_ARC_LABELS[h](w);
    }

    // Base game (fire, water, ice, plant, metal, ALL)
    if (w <= 10)  return '✦  ARC I  ·  THE AWAKENING  ✦';
    if (w <= 20)  return '✦  ARC II  ·  ELEMENTAL MASTERY  ✦';
    if (w <= 30)  return '✦  ARC III  ·  THE SHADOW DEEPENS  ✦';
    if (w <= 40)  return '✦  ARC IV  ·  THE CORRUPTION  ✦';
    if (w <= 50)  return '✦  ARC V  ·  THE INNER CONFLICT  ✦';
    if (w <= 60)  return '✦  ARC VI  ·  THE UNITY  ✦';
    if (w <= 70)  return '✦  ARC VII  ·  THE MASK\'S POWER  ✦';
    if (w <= 80)  return '✦  ARC VIII  ·  THE VOID APPROACHES  ✦';
    if (w <= 90)  return '✦  ARC IX  ·  THE MASK REVEALED  ✦';
    return '✦  ARC X  ·  THE FINAL STAND  ✦';
}

function openStory(story) {
    isStoryOpen = true;

    // Apply hero theme
    const heroKey = (story.hero || 'ALL').toLowerCase();
    const theme = (window.STORY_THEME_OVERRIDES && window.STORY_THEME_OVERRIDES[heroKey]) || _STORY_THEMES[heroKey] || _STORY_THEMES.all;
    const screen = document.getElementById('story-screen');
    screen.style.setProperty('--story-rgb', theme.rgb);
    screen.style.display = 'flex';

    document.getElementById('story-hero-icon').textContent = theme.icon;
    document.getElementById('story-arc-label').textContent = _getStoryArcLabel(story.wave || 1, story.hero);
    document.getElementById('story-title').innerText = story.title;
    document.getElementById('story-text').innerText = story.text;

    // Type badge
    const badge = document.getElementById('story-type-badge');
    if (story.type === 'BOSS_FIGHT') {
        badge.textContent = '⚔  BOSS ENCOUNTER';
        badge.className = 'story-type-badge badge-boss';
        badge.style.display = 'block';
    } else if (story.type === 'COMPANION_JOIN') {
        badge.textContent = '✦  ALLY JOINS';
        badge.className = 'story-type-badge badge-ally';
        badge.style.display = 'block';
    } else if (story.type === 'THE_END') {
        badge.textContent = '✦  JOURNEY\'S END';
        badge.className = 'story-type-badge badge-ally';
        badge.style.display = 'block';
    } else {
        badge.style.display = 'none';
    }

    // Choice Logic
    const choiceContainer = document.getElementById('story-choices');
    const continueBtn = document.getElementById('story-continue-btn');
    choiceContainer.innerHTML = '';

    if (story.choices && story.choices.length > 0) {
        continueBtn.style.display = 'none';
        story.choices.forEach(choice => {
            const btn = document.createElement('button');
            btn.className = 'btn';
            btn.innerText = choice.text;
            btn.onclick = () => {
                handleStoryChoice(choice);
                closeStory();
            };
            choiceContainer.appendChild(btn);
        });
    } else {
        continueBtn.style.display = 'block';
    }

    setUIState('STORY');

    // Save progress (skip for tutorial stages)
    if (!story.fromTutorial && !saveData.story.unlockedChapters.includes(story.id)) {
        saveData.story.unlockedChapters.push(story.id);
        saveGame();
    }

    // Play Story Audio
    if (currentStoryAudio) {
        currentStoryAudio.pause();
        currentStoryAudio = null;
    }

    // Prefer DLC story audio for Earth hero if available; fall back to base story audio on failure
    const basePath = `audio/story/${story.id}.mp3`;
    if (story.hero === 'EARTH') {
        const dlcPath = `dlc/rise_of_the_rock/audio/story/${story.id}.mp3`;
        const dlcAudio = new Audio(dlcPath);
        dlcAudio.play().then(() => {
            currentStoryAudio = dlcAudio;
        }).catch(() => {
            // DLC audio missing or blocked, fall back to base audio
            const baseAudio = new Audio(basePath);
            baseAudio.play().catch(() => { /* ignore */ });
            currentStoryAudio = baseAudio;
        });
    } else if (story.hero === 'LIGHTNING') {
        const dlcPath = `dlc/tournament_of_thunder/audio/story/${story.id}.mp3`;
        const dlcAudio = new Audio(dlcPath);
        dlcAudio.play().then(() => {
            currentStoryAudio = dlcAudio;
        }).catch(() => {
            // DLC audio missing or blocked, fall back to base audio
            const baseAudio = new Audio(basePath);
            baseAudio.play().catch(() => { /* ignore */ });
            currentStoryAudio = baseAudio;
        });
    } else if (story.hero === 'GRAVITY' || story.hero === 'VOID') {
        const dlcPath = `dlc/champions_of_chaos/audio/story/${story.id}.mp3`;
        const dlcAudio = new Audio(dlcPath);
        dlcAudio.play().then(() => {
            currentStoryAudio = dlcAudio;
        }).catch(() => {
            const baseAudio = new Audio(basePath);
            baseAudio.play().catch(() => { /* ignore */ });
            currentStoryAudio = baseAudio;
        });
    } else {
        currentStoryAudio = new Audio(basePath);
        currentStoryAudio.play().catch(() => { /* ignore */ });
    }
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

    // Victory Check: If this was "THE_END", trigger game over (victory)
    if (currentStoryEvent && currentStoryEvent.type === 'THE_END') {
        gameOver(true); // Victory!
        return;
    }

    // Force Hero Swap to match Narrative (Generic Logic for Chaos/Fortune/etc)
    if (currentStoryEvent && currentStoryEvent.hero) {
        // Convert to lowercase because player types are lowercase (gravity/void/spirit/chance)
        const requiredHero = currentStoryEvent.hero.toLowerCase();

        // Ensure player matches the narrator, BUT ignore "all"
        if (requiredHero !== 'all' && player.type !== requiredHero) {
            // Use changeHeroInGame for direct swap preserving stats
            changeHeroInGame(requiredHero);
        }
    }

    // Proceed to Shop or Next Wave
    // Special case: If wave is 0 (Intro), always advance to Wave 1
    if (wave === 0 || isTutorialMode) {
        advanceWave();
    } else if (wave % 4 === 0) {
        openShop();
    } else {
        advanceWave();
    }
}

// --- Story Choice Handler ---
window.handleStoryChoice = function (choice) {
    console.log("Story Choice Selected:", choice);
    if (!choice.effect && !choice.outcome) return;

    // This base function can be extended by DLCs (see dlc/index.js or specific dlc init)
};

function changeHeroInGame(newType) {
    if (!player) return;
    const oldHpRatio = player.hp / player.maxHp;
    const oldGold = player.gold;
    const oldStats = player.stats;
    const oldBuffs = player.buffs;

    player = new Player(newType);
    player.x = arena.width / 2;
    player.y = arena.height / 2;
    player.gold = oldGold;
    // Preserve HP Ratio
    player.hp = player.maxHp * oldHpRatio;

    // Notify
    if (window.createExplosion) createExplosion(player.x, player.y, '#fff');
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

// --- CHAOS MODE 2.0 LOGIC ---
// Moved to ChaosMode.js


function shuffleHero(targetHeroType = null) {
    // 1. Get available heroes
    let availableHeroes = ['fire', 'water', 'ice', 'plant', 'metal'];

    // Check DLC for heroes
    if (window.dlcManager) {
        const dlcs = window.dlcManager.getDLCList();
        dlcs.forEach(dlc => {
            if (dlc.active && dlc.hero && !availableHeroes.includes(dlc.hero)) {
                availableHeroes.push(dlc.hero);
            }
        });
    }

    // 2. Pick random NEXT hero (ensure it changes)
    let nextHero = targetHeroType;
    if (!nextHero) {
        nextHero = player.type;
        let attempts = 0;
        while (nextHero === player.type && attempts < 20) {
            nextHero = availableHeroes[Math.floor(Math.random() * availableHeroes.length)];
            attempts++;
        }
    }

    // 3. Store Stats
    const oldStats = {
        hpPercent: player.hp / player.maxHp,
        level: player.level,
        xp: player.xp,
        maxXp: player.maxXp,
        gold: player.gold,
        buffs: JSON.parse(JSON.stringify(player.buffs)),
        runBuffs: JSON.parse(JSON.stringify(player.runBuffs)),
        critChance: player.critChance,
        critMultiplier: player.critMultiplier
    };

    // 4. Create New Player
    const newPlayer = new Player(nextHero);

    // 5. Restore Position
    newPlayer.x = player.x;
    newPlayer.y = player.y;

    // 6. Apply Stats
    newPlayer.level = oldStats.level;
    newPlayer.xp = oldStats.xp;
    newPlayer.maxXp = oldStats.maxXp;
    newPlayer.gold = oldStats.gold;
    newPlayer.buffs = oldStats.buffs;
    newPlayer.runBuffs = oldStats.runBuffs;

    // Re-apply buffs to base stats
    newPlayer.maxHp += (oldStats.runBuffs.maxHp || 0);
    newPlayer.damageMultiplier += (oldStats.runBuffs.damage || 0);
    newPlayer.damageReduction += (oldStats.runBuffs.defense || 0);
    newPlayer.maskChance += (oldStats.runBuffs.luck || 0);
    newPlayer.extraProjectiles += (oldStats.runBuffs.projectiles || 0);
    newPlayer.speedMultiplier += (oldStats.runBuffs.speed || 0);

    // Cooldown Approximation
    newPlayer.cooldownMultiplier = Math.max(0.1, 1 - (oldStats.runBuffs.cooldown || 0));

    // Crit Carry Over (Approximate)
    newPlayer.critChance += (oldStats.critChance - 0.05);

    // 7. HP Percentage Restoration
    newPlayer.hp = newPlayer.maxHp * oldStats.hpPercent;

    // 8. Swap
    player = newPlayer;

    showNotification(`CHAOS SHUFFLE: ${nextHero.toUpperCase()}!`);
    createExplosion(player.x, player.y, '#fff', 20);
    updateUI();
}

function advanceWave() {
    // No-hit wave tracking for wind_no_hit achievement
    // Uses currentRunStats._noHitBaseline (resets per run) instead of a function property (persists across runs)
    if (player?.type === 'air' && typeof saveData !== 'undefined' && wave > 0) {
        const dmgThisWave = currentRunStats.damageTaken - (currentRunStats._noHitBaseline || 0);
        if (dmgThisWave === 0) {
            saveData.global.no_hit_wind = (saveData.global.no_hit_wind || 0) + 1;
        }
    }
    currentRunStats._noHitBaseline = currentRunStats.damageTaken;

    wave++;
    enemiesKilledInWave = 0;
    masksDroppedInWave = 0; // Reset mask cap
    enemies = [];
    bossActive = false;
    if (isTutorialMode && window.TutorialMode) TutorialMode.startObjective();

    // CHAOS GAMBLE
    if (isChaosShuffleMode && wave > 1) {
        openChaosGamble(); // Pause & Wait
    } else {
        resumeWaveGeneration();
    }
}

function resumeWaveGeneration() {
    // True Golden Mask Spawn (Wave 90 Narrative Event) - STORY MODE ONLY
    const isStoryMode = (saveData.story && saveData.story.enabled !== false) &&
        !isDailyMode && !isWeeklyMode && !isChaosShuffleMode && !isVersusMode;

    if (isStoryMode && wave === 90) {
        // Spawn in center
        holyMasks.push(new HolyMask(arena.width / 2, arena.height / 2, true));
        showNotification("THE GOLDEN MASK APPEARS!");
        createExplosion(arena.width / 2, arena.height / 2, '#f1c40f');
    }

    if (isChaosShuffleMode && wave > 0) generateChaosObjective();

    // Randomize Biome (Skip in Versus Mode)
    if (!isVersusMode) {
        let types = ['fire', 'water', 'ice', 'plant', 'metal'];

        // Add Enabled DLC Biomes (Only included in Standard/Challenge runs, NOT in active Story Mode)
        const isStoryRun = (saveData.story && saveData.story.enabled !== false) && !isDailyMode && !isWeeklyMode;

        if (!isStoryRun && window.BIOME_LOGIC) {
            const dlcBiomes = ['earth', 'lightning', 'air', 'gravity', 'void', 'spirit', 'chance'];
            dlcBiomes.forEach(b => {
                if (window.BIOME_LOGIC[b]) types.push(b);
            });
        }

        if (player && player.type === 'black') {
            types = ['black']; // Keep Black in his own realm
        }

        // Wave 1 starts in home biome
        if (wave === 1 && player && player.type !== 'black') {
            currentBiomeType = player.type;
        }
        // Narrative Override (e.g. Arc 2 forces Hero Biome)
        else if (currentStoryEvent && currentStoryEvent.data && currentStoryEvent.data.biome) {
            if (currentStoryEvent.data.biome === 'HERO') {
                currentBiomeType = player.type;
            } else {
                currentBiomeType = currentStoryEvent.data.biome;
            }
        }
        else {
            currentBiomeType = types[Math.floor(Math.random() * types.length)];
        }

        showNotification(`BIOME SHIFT: ${currentBiomeType.toUpperCase()}`);
    }

    let layoutOverride = null;
    let trapOverride = null;
    if (currentStoryEvent && currentStoryEvent.data) {
        if (currentStoryEvent.data.layout !== undefined) layoutOverride = currentStoryEvent.data.layout;
        if (currentStoryEvent.data.trap !== undefined) trapOverride = currentStoryEvent.data.trap;
    }

    // --- INSTANT BOSS SPAWN CHECK ---
    let storyBossId = null;

    // Check Chaos Nemesis
    if (typeof nextWaveIsNemesis !== 'undefined' && nextWaveIsNemesis) {
        storyBossId = nextWaveIsNemesis;
        nextWaveIsNemesis = null;
    }

    // Check Story Duel (1v1) - or other custom spawns handled by DLCs
    if (!storyBossId && currentStoryEvent && currentStoryEvent.data && currentStoryEvent.data.spawnEnemy) {
        const enemyId = currentStoryEvent.data.spawnEnemy;
        if (window.customSpawnHandlers && window.customSpawnHandlers[enemyId]) {
            console.log("Starting Custom Spawn:", enemyId);
            window.customSpawnHandlers[enemyId](enemyId);
        } else {
            console.warn("No handler found for custom spawn:", enemyId);
        }
    }

    if (!storyBossId && currentStoryEvent && currentStoryEvent.type === 'BOSS_FIGHT' && currentStoryEvent.data) {
        storyBossId = currentStoryEvent.data.bossId;
    }

    // Default Makuta check
    if (!storyBossId && saveData.story.enabled && !isDailyMode && !isWeeklyMode && (wave === 50 || wave === 100)) {
        storyBossId = 'MAKUTA';
    }

    if (storyBossId) {
        bossActive = true;
        let pName = storyBossId;
        if (storyBossId === 'MAKUTA') {
            showNotification("MAKUTA HAS AWAKENED!");
            pName = "MAKUTA";
            // Force Shadow Realm Biome for Makuta
            currentBiomeType = 'black';
        } else if (storyBossId === 'GREEN_GOBLIN') {
            showNotification("THE GREEN GOBLIN ATTACKS!");
            pName = "GREEN GOBLIN";
        } else if (storyBossId === 'DARK_GOLEM') {
            showNotification("THE DARK GOLEM AWAKENS!");
            pName = "DARK GOLEM";
        } else if (storyBossId === 'ZEUS') {
            showNotification("THE THUNDER LORD DECENDS!");
            pName = "ZEUS";
        } else {
            showNotification(`BOSS WARNING: ${storyBossId}!`);
        }
        document.getElementById('event-text').innerText = `BOSS: ${pName}`;

        document.getElementById('event-text').style.display = 'block';
        setTimeout(() => document.getElementById('event-text').style.display = 'none', 4000);

        enemies.unshift(new Boss(storyBossId));
    }

    arena.generate(currentBiomeType, layoutOverride, trapOverride);

    // Versus Mode Override: Force 1v1 Layout if somehow called here
    if (isVersusMode) {
        // We already generated it in startGame usually, but if wave advanced (e.g. rematch?), ensure layout
        arena.generate(currentBiomeType, 'VERSUS_1V1');
    }

    // Reset Player Position to Center
    if (player) {
        if (isVersusMode) {
            player.x = arena.width / 2 - 800; // Left Spawn
            player.y = arena.height / 2;

            // Update P2 if exists
            if (window.additionalPlayers && window.additionalPlayers[0]) {
                window.additionalPlayers[0].x = arena.width / 2 + 800; // Right Spawn
                window.additionalPlayers[0].y = arena.height / 2;
            }
        } else {
            player.x = arena.width / 2;
            player.y = arena.height / 2;
        }
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
            showAchievementNotif(ach);
            saveGame();
        }
    }
}
window.unlockAchievement = unlockAchievement;
window.DLC_STORY_ACHIEVEMENTS = {}; // bossType → achievementId (or direct unlockAchievement target)

const _achNotifQueue = [];
let _achNotifBusy = false;

function showAchievementNotif(ach) {
    // Deduplicate: don't queue the same achievement if it's already showing or waiting
    const alreadyQueued = _achNotifQueue.some(a => a.id === ach.id);
    const currentlyShowing = _achNotifBusy && document.querySelector('#ach-notif .ach-notif-title')?.textContent === ach.title;
    if (alreadyQueued || currentlyShowing) return;
    _achNotifQueue.push(ach);
    if (!_achNotifBusy) _processAchNotifQueue();
}

function _processAchNotifQueue() {
    if (_achNotifQueue.length === 0) { _achNotifBusy = false; return; }
    _achNotifBusy = true;
    const ach = _achNotifQueue.shift();
    const el = document.getElementById('ach-notif');
    if (!el) { _achNotifBusy = false; return; }

    const HOLD = 3000;

    el.querySelector('.ach-notif-title').textContent = ach.title;
    el.querySelector('.ach-notif-desc').textContent  = ach.desc;
    el.querySelector('.ach-notif-reward').textContent = ach.bonus.text;
    el.style.setProperty('--ach-duration', (HOLD / 1000) + 's');

    el.classList.remove('slide-in', 'slide-out', 'timing');
    void el.offsetWidth; // force reflow so animations restart cleanly

    el.classList.add('slide-in');
    setTimeout(() => el.classList.add('timing'), 350);

    setTimeout(() => {
        el.classList.remove('timing', 'slide-in');
        el.classList.add('slide-out');
        setTimeout(() => {
            el.classList.remove('slide-out');
            _processAchNotifQueue();
        }, 300);
    }, 350 + HOLD);
}

window.showAchievementNotif = showAchievementNotif;

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

            // Generic: 'hero_prestige' → saveData[hero].prestige (covers all DLC heroes)
            if (!unlocked && ach.stat.endsWith('_prestige')) {
                const hero = ach.stat.slice(0, -8);
                if ((saveData[hero]?.prestige || 0) >= ach.req) unlocked = true;
            }
            // Generic: 'kill_TYPE' → saveData.stats['kill_TYPE'] (covers all DLC enemy types)
            if (!unlocked && ach.stat.startsWith('kill_')) {
                if ((saveData.stats[ach.stat] || 0) >= ach.req) unlocked = true;
            }
            // Generic global fallback: any mechanic counter written to saveData.global is auto-checked
            if (!unlocked && typeof saveData.global[ach.stat] === 'number') {
                if (saveData.global[ach.stat] >= ach.req) unlocked = true;
            }

            if (unlocked) {
                saveData.global.unlockedAchievements.push(ach.id);
                showAchievementNotif(ach);
                saveGame();
            }
        }
    });
}

// --- Main Loop ---

// --- Main Loop ---

function startGame(mode = 'NORMAL') {
    // Initialize Arena (3000x3000)
    arena = new Arena(3000, 3000);
    window.arena = arena; // Expose to window for DLCs

    isChaosShuffleMode = (mode === 'SHUFFLE');
    isVersusMode = (mode === 'VERSUS');
    isTutorialMode = (mode === 'TUTORIAL');

    // Handle Versus Biome Selection
    if (isVersusMode && window.selectedBiome) {
        if (window.selectedBiome === 'random') {
            const biomes = ['fire', 'water', 'ice', 'plant', 'metal', 'rock', 'cloud', 'chaos'];
            currentBiomeType = biomes[Math.floor(Math.random() * biomes.length)];
        } else {
            currentBiomeType = window.selectedBiome;
        }
        console.log("Versus Biome:", currentBiomeType);
    } else {
        currentBiomeType = selectedHeroType; // Default (Campaign)
        if (currentBiomeType === 'black') currentBiomeType = 'chaos';
    }

    // Check for Shadow Form Mutator BEFORE creating player
    let heroType = selectedHeroType;
    if ((mode === 'DAILY' || mode === 'WEEKLY') && activeMutators.some(m => m.id === 'SHADOW_FORM')) {
        heroType = 'black';
    }

    // In Shuffle Mode, start with random non-black hero? Or selected? 
    // "Shuffles the current hero... Result in shuffling the 5 main game heroes... and DLC"
    // Let's start with the selected hero, then shuffle next wave.

    player = new Player(heroType);
    // Center Player in Arena
    player.x = arena.width / 2;
    player.y = arena.height / 2;

    // --- VERSUS MODE SETUP ---
    // Clear old AI / Additional Players from previous runs
    if (typeof window.additionalPlayers !== 'undefined') window.additionalPlayers = [];

    if (isVersusMode) {
        // Spawn Opponent
        let oppHero = window.selectedOpponent || 'random';
        if (typeof HeroTypes !== 'undefined' && oppHero === 'random') {
            // Redundant check
        }

        console.log("Spawning Versus AI:", oppHero);
        const p2 = new Player(oppHero, true); // true = isCPU
        p2.controller = new AIController(player);
        p2.id = "PLAYER_2_AI";

        // Initial Position (Will be enforced by resumeWaveGeneration too)
        p2.x = arena.width / 2 + 800;
        p2.y = arena.height / 2;

        if (!window.additionalPlayers) window.additionalPlayers = [];
        window.additionalPlayers.push(p2);

        showNotification(`VERSUS: ${heroType.toUpperCase()} VS ${oppHero.toUpperCase()}`);

        // Disable regular spawning setup
        waveTimer = 999999;
    }

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
    isPlayerDying = false;
    playerDeathTimer = 0;
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

    if (mode === 'TUTORIAL') {
        isDailyMode = false;
        isWeeklyMode = false;
        activeMutators = [];
        TutorialMode.init();
        return;
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
    isTutorialMode = false;

    // Clear Saved Run on Death
    clearSavedRun();

    // Safety: Ensure stats object exists
    if (!saveData.stats) saveData.stats = {};

    // --- NEW STATS TRACKING ---
    // 1. Total Time Played
    const sessionTimeSec = Math.floor((Date.now() - (currentRunStats.startTime || Date.now())) / 1000);
    if (!saveData.global.totalTimePlayed) saveData.global.totalTimePlayed = 0;
    saveData.global.totalTimePlayed += sessionTimeSec;

    // 2. Hero Pick Counts
    if (!saveData.global.heroRuns) saveData.global.heroRuns = {};
    const hType = player.type;
    saveData.global.heroRuns[hType] = (saveData.global.heroRuns[hType] || 0) + 1;

    // Track Games and Deaths
    saveData.global.totalGames = (saveData.global.totalGames || 0) + 1;
    if (!isVictory) {
        saveData.global.totalDeaths = (saveData.global.totalDeaths || 0) + 1;
    } else {
        // Victory! Track max prestige win
        const currentP = saveData[player.type].prestige || 0;

        // SPECIAL: Faith of Fortune Shared Prestige
        // If finishing the Fortune story, count it for both Spirit and Chance
        if (currentStoryEvent && currentStoryEvent.id && currentStoryEvent.id.startsWith('fortune_')) {
            const spiritRec = saveData['spirit'].maxWinPrestige ?? -1;
            const chanceRec = saveData['chance'].maxWinPrestige ?? -1;
            // Spirit
            if ((saveData['spirit'].prestige || 0) > spiritRec) {
                saveData['spirit'].maxWinPrestige = (saveData['spirit'].prestige || 0);
            }
            // Chance
            if ((saveData['chance'].prestige || 0) > chanceRec) {
                saveData['chance'].maxWinPrestige = (saveData['chance'].prestige || 0);
            }
        }

        // SPECIAL: Champions of Chaos Shared Prestige
        // If finishing the Chaos story, count it for both Gravity and Void
        if (currentStoryEvent && currentStoryEvent.id && currentStoryEvent.id.startsWith('chaos_')) {
            // Ensure data exists (safe check)
            if (!saveData['gravity']) saveData['gravity'] = { prestige: 0, maxWinPrestige: -1 };
            if (!saveData['void']) saveData['void'] = { prestige: 0, maxWinPrestige: -1 };

            const gravityRec = saveData['gravity'].maxWinPrestige ?? -1;
            const voidRec = saveData['void'].maxWinPrestige ?? -1;

            // Gravity
            if ((saveData['gravity'].prestige || 0) > gravityRec) {
                saveData['gravity'].maxWinPrestige = (saveData['gravity'].prestige || 0);
            }
            // Void
            if ((saveData['void'].prestige || 0) > voidRec) {
                saveData['void'].maxWinPrestige = (saveData['void'].prestige || 0);
            }
        }

        // Standard Prestige Track
        const recorded = saveData[player.type].maxWinPrestige ?? -1;
        if (currentP > recorded) {
            saveData[player.type].maxWinPrestige = currentP;
        }
    }

    // DLC story completion achievements (fires on any victory in story mode at wave ≥ 50)
    if (isVictory && player && wave >= 50) {
        const isStoryRun = (saveData.story && saveData.story.enabled !== false) &&
            !isDailyMode && !isWeeklyMode && !isChaosShuffleMode && !isVersusMode;
        if (isStoryRun) {
            const dlcStoryMap = {
                earth: 'rock_story', lightning: 'thunder_story',
                air: 'wind_story', gravity: 'chaos_gravity_story', void: 'chaos_void_story',
                spirit: 'faith_spirit_story', chance: 'faith_chance_story',
                sound: 'sickness_sound_story', poison: 'sickness_poison_story'
            };
            const achId = dlcStoryMap[player.type];
            if (achId) unlockAchievement(achId);
        }
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
        if (uiState === 'MUSEUM' && window.museum) {
            window.museum.update();
            window.museum.draw(ctx);
            return; // Skip normal game loop
        }

        // --- BIG GAMBLE STATE (FROZEN CONTEXT) ---
        if (typeof window.isBigGambleActive !== 'undefined' && window.isBigGambleActive) {
            if (window.HERO_LOGIC && window.HERO_LOGIC['chance']) {
                window.HERO_LOGIC['chance'].updateBigGamble(window.player);
                window.HERO_LOGIC['chance'].drawBigGamble(ctx);
            }
            return; // Skip normal update/draw
        }

        if (gameRunning && !gamePaused && !isLevelingUp && !isShopping && !isStoryOpen) {

            if (isChaosShuffleMode) updateChaosObjective(deltaTime / 1000);

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
                                try { audioManager.play('damage'); } catch (e) { }
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
                        if (!player.isInvincible) {
                            player.hp -= 2; // Lose 2 HP per second
                            audioManager.play('damage');
                        }
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

            // Boss Death Cinematic Sequence
            if (bossDeathTimer > 0) {
                bossDeathTimer--;

                const _progress = 1 - bossDeathTimer / 180; // 0 at sequence start → 1 at end

                // --- Cinematic frame drawn every frame (no strobe) ---
                ctx.clearRect(0, 0, canvas.width, canvas.height);

                // 1. Frozen arena background
                ctx.save();
                ctx.translate(-arena.camera.x, -arena.camera.y);
                if (arena) arena.draw(ctx, getHeroTheme(currentBiomeType));
                ctx.restore();

                // 2. White impact flash — bright burst at start, fades in ~0.25s
                if (_progress < 0.15) {
                    ctx.fillStyle = `rgba(255, 255, 255, ${(1 - _progress / 0.15) * 0.88})`;
                    ctx.fillRect(0, 0, canvas.width, canvas.height);
                }

                // 3. Cinematic dark overlay, deepens over the sequence
                ctx.fillStyle = `rgba(0, 0, 0, ${Math.min(0.78, _progress * 1.15)})`;
                ctx.fillRect(0, 0, canvas.width, canvas.height);

                // 4. Deterministic gold & white particle shower
                if (_progress > 0.08) {
                    const _pA = Math.min(1, (_progress - 0.08) / 0.35);
                    ctx.save();
                    for (let _i = 0; _i < 28; _i++) {
                        const _elapsed = (_progress - 0.08) * 180;
                        const _x = ((_i * 1.618 * 97) % 1) * canvas.width;
                        const _y = (((_i * 2.236 * 83 + 40) % 1) * canvas.height + _elapsed * (1.0 + (_i % 5) * 0.5) * 2.2) % canvas.height;
                        ctx.globalAlpha = _pA * (0.35 + 0.65 * Math.abs(Math.sin(_progress * 14 + _i * 0.9))) * 0.65;
                        ctx.fillStyle = _i % 3 === 0 ? '#ffffff' : '#f1c40f';
                        ctx.beginPath();
                        ctx.arc(_x, _y, 1.5 + (_i % 4) * 1.2, 0, Math.PI * 2);
                        ctx.fill();
                    }
                    ctx.restore();
                }

                // 5. "BOSS DEFEATED" heading — eases in with cubic after flash clears
                if (_progress > 0.15) {
                    const _eased = 1 - Math.pow(1 - Math.min(1, (_progress - 0.15) / 0.28), 3);
                    ctx.save();
                    ctx.globalAlpha = _eased;
                    ctx.textAlign = 'center';
                    ctx.textBaseline = 'middle';
                    // Broad gold halo pass
                    ctx.shadowColor = '#f1c40f';
                    ctx.shadowBlur = 70;
                    ctx.fillStyle = 'rgba(241, 196, 15, 0.22)';
                    ctx.font = `bold ${Math.round(64 + (1 - _eased) * 14)}px Arial`;
                    ctx.fillText('BOSS DEFEATED', canvas.width / 2, canvas.height / 2 - 10);
                    // Crisp white text on top
                    ctx.shadowBlur = 16;
                    ctx.shadowColor = 'rgba(241, 196, 15, 0.85)';
                    ctx.fillStyle = '#ffffff';
                    ctx.font = 'bold 64px Arial';
                    ctx.fillText('BOSS DEFEATED', canvas.width / 2, canvas.height / 2 - 10);
                    ctx.restore();
                }

                // 6. "WAVE X CLEARED" subtitle — fades in a beat after the heading
                if (_progress > 0.46) {
                    const _sT = Math.min(1, (_progress - 0.46) / 0.22);
                    ctx.save();
                    ctx.globalAlpha = _sT * 0.82;
                    ctx.textAlign = 'center';
                    ctx.textBaseline = 'middle';
                    ctx.shadowColor = '#f1c40f';
                    ctx.shadowBlur = 10;
                    ctx.fillStyle = '#f1c40f';
                    ctx.font = '13px Arial';
                    ctx.fillText(`\u2014 WAVE ${wave} CLEARED \u2014`, canvas.width / 2, canvas.height / 2 + 48);
                    ctx.restore();
                }

                // 7. Fade to black in the final stretch
                if (_progress > 0.8) {
                    ctx.fillStyle = `rgba(0, 0, 0, ${((_progress - 0.8) / 0.2) * 0.9})`;
                    ctx.fillRect(0, 0, canvas.width, canvas.height);
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

                    if (isTutorialMode) { TutorialMode.onBossDefeated(); return; }
                    triggerStory(wave);
                }
                return; // Always prevent normal render during cinematic
            }

            ctx.clearRect(0, 0, canvas.width, canvas.height);

            // Apply Camera Transform
            ctx.save();

            // Queasy Cam Chaos Effect
            if (saveData.chaos && saveData.chaos.active && saveData.chaos.active.includes('DRUNK_CAM')) {
                const cx = (canvas.width / 2);
                const cy = (canvas.height / 2);
                const angle = Math.sin(frame * 0.05) * 0.1; // Sway
                const scale = 1 + Math.sin(frame * 0.03) * 0.05; // Breathe

                ctx.translate(cx, cy);
                ctx.rotate(angle);
                ctx.scale(scale, scale);
                ctx.translate(-cx, -cy);
            }

            ctx.translate(-arena.camera.x, -arena.camera.y);

            // Draw World
            // Background follows Biome Type
            let themeType = currentBiomeType;
            if (arena) arena.biomeType = themeType;

            arena.draw(ctx, getHeroTheme(themeType));


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
            window.frame = frame; // Expose for DLCs

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
            // Disable standard boss spawn if Objective Wave or Boss already active (e.g. Instant Spawn)
            if (!bossActive && bossDeathTimer === 0 && enemiesKilledInWave >= ENEMIES_PER_WAVE * wave && (!isTutorialMode || TutorialMode.bossForced)) {
                if (currentObjective && currentObjective.state === 'ACTIVE') {
                    // Do nothing, wait for objective completion logic
                } else {
                    bossActive = true;
                    if (isTutorialMode) {
                        // Tutorial: one plain boss (no type modifier), reduced HP, no minions
                        const tutBoss = new Boss('BASIC');
                        tutBoss.hp = tutBoss.maxHp = Math.max(1, Math.floor(tutBoss.maxHp * 0.4));
                        enemies.unshift(tutBoss);
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
                        if (!currentStoryEvent || !currentStoryEvent.data || !currentStoryEvent.data.suppressMinions) {
                            for (let i = 0; i < 5; i++) enemies.push(new Enemy(true));
                        }
                    }
                }
            }

            if (!isVersusMode) {
                if (!bossActive && bossDeathTimer === 0) {
                    let spawnRate = Math.max(2, 40 - (wave * 2.5)); // Increased scaling
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
                    let suppress = false;
                    if (currentStoryEvent && currentStoryEvent.data && currentStoryEvent.data.suppressMinions) {
                        suppress = true;
                    }
                    if (!suppress && frame % 150 === 0) enemies.push(new Enemy(true));
                }
            }

            // Tutorial: scale new non-boss enemy HP to 40% and cap count at 8
            if (isTutorialMode) {
                enemies.forEach(e => {
                    if (!(e instanceof Boss) && !e._tutorialScaled) {
                        e._tutorialScaled = true;
                        e.hp = e.maxHp = Math.max(1, Math.floor(e.maxHp * 0.4));
                    }
                });
                const nonBoss = enemies.filter(e => !(e instanceof Boss));
                if (nonBoss.length > 8) {
                    const excess = new Set(nonBoss.slice(8));
                    enemies = enemies.filter(e => !excess.has(e));
                }
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
                                audioManager.play('damage');
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

            if (isPlayerDying) {
                // Freeze player during death sequence
                player.vx = 0;
                player.vy = 0;
            } else {
                player.update();
            }
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

                        // Play Audio
                        if (typeof audioManager !== 'undefined') {
                            audioManager.playVoice(shardType, newIndex);
                        }
                    } else {
                        showNotification("MEMORY RECOVERED! (All collected)");
                    }

                    saveGame();
                }
            });

            // Gold Drops
            goldDrops.forEach((drop, index) => {
                drop.draw();
                // Golden Magnet (Chance Convergence)
                const pickupRad = player.pickupRange || (player.radius + 20);
                const dist = Math.hypot(player.x - drop.x, player.y - drop.y);
                if (dist < pickupRad) {
                    const amount = Math.floor(drop.value * player.goldMultiplier);
                    if (player.gainGold) player.gainGold(amount); // Use new method
                    else player.gold += amount; // Fallback

                    if (isChaosShuffleMode) checkChaosEvent('GOLD', amount);
                    if (isTutorialMode && window.TutorialMode) TutorialMode.onGold();
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

                        if (typeof audioManager !== 'undefined') audioManager.play('pickup_card');

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

                        // Visual Flag
                        player.isGolden = true;

                        showNotification("TRUE GOLDEN MASK! ALL STATS BOOSTED!");
                        createExplosion(player.x, player.y, '#fff');
                        if (typeof audioManager !== 'undefined') audioManager.play('pickup_mask');

                        // Unlock Achievement if exists?
                    } else {
                        saveData[player.type].level++;
                        saveGame();
                        if (typeof audioManager !== 'undefined') audioManager.play('pickup_mask');
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
                    if (pup.type === 'HEAL') {
                        player.hp = Math.min(player.hp + 30, player.maxHp);
                        if (isChaosShuffleMode) checkChaosEvent('HEAL');
                        createExplosion(player.x, player.y, '#2ecc71');
                    }
                    else if (pup.type === 'MAXHP') { player.maxHp += 20; player.hp += 20; createExplosion(player.x, player.y, '#e74c3c'); }
                    else if (pup.type === 'SPEED') { player.buffs.speed = 600; createExplosion(player.x, player.y, '#f1c40f'); }
                    else if (pup.type === 'MULTI') {
                        if (player.heroType === 'EARTH') {
                            // Earth Hero: Instant Max Momentum
                            player.momentum = player.maxMomentum;
                            showNotification("MAX MOMENTUM!");
                            createExplosion(player.x, player.y, '#8d6e63');
                        } else {
                            player.buffs.multi = 600;
                            createExplosion(player.x, player.y, '#3498db');
                        }
                    }
                    else if (pup.type === 'AUTOAIM') {
                        if (player.heroType === 'EARTH') {
                            // Earth Hero: Temporary Ram Damage Boost
                            player.stats.ramDmgMult = (player.stats.ramDmgMult || 1) + 1.0; // +100% Ram Damage
                            setTimeout(() => { player.stats.ramDmgMult -= 1.0; }, 10000); // Lasts 10s
                            showNotification("RAM DAMAGE BOOST!");
                            createExplosion(player.x, player.y, '#e74c3c');
                        } else {
                            player.buffs.autoaim = 600;
                            createExplosion(player.x, player.y, '#9b59b6');
                        }
                    }
                    powerUps.splice(index, 1);
                } else if (pup.timer <= 0) powerUps.splice(index, 1);
            });

            projectiles.forEach((proj, index) => {
                proj.update();
                if (proj.life !== null && proj.life <= 0) {
                    projectiles.splice(index, 1);
                    return;
                }

                // --- PVP LOGIC ---
                // Check collision against AI Players (Avoiding Self-Damage)
                if (typeof window.additionalPlayers !== 'undefined' && window.additionalPlayers.length > 0 && !proj.isEnemy) {
                    window.additionalPlayers.forEach(p2 => {
                        // Avoid self-damage 
                        if (proj.owner === p2) return;

                        if (Math.hypot(p2.x - proj.x, p2.y - proj.y) < p2.radius + proj.radius) {
                            p2.hp -= proj.damage;
                            floatingTexts.push(new FloatingText(p2.x, p2.y - 40, proj.damage.toFixed(0), "#ff0000", 25));
                            proj.dead = true; // Mark dead
                            createExplosion(proj.x, proj.y, proj.color);
                            if (p2.hp <= 0) {
                                let idx = window.additionalPlayers.indexOf(p2);
                                if (idx > -1) window.additionalPlayers.splice(idx, 1);
                                createExplosion(p2.x, p2.y, '#fff');
                                showNotification("OPPONENT KO!");

                                if (isVersusMode && window.additionalPlayers.length === 0) {
                                    setTimeout(() => gameOver(true), 2000);
                                } else if (!isVersusMode && bossActive && window.additionalPlayers.length === 0) {
                                    // Story Mode Duel Victory
                                    bossActive = false;
                                    bossDeathTimer = 180; // 3 seconds for dramatic effect

                                    // Clear any remaining enemies/projectiles
                                    enemies.forEach(e => createExplosion(e.x, e.y, '#fff'));
                                    enemies = [];
                                    projectiles = [];
                                }
                            }
                        }
                    });

                    // Also check collision against Main Player (Player 1) if owner is not Player 1
                    if (proj.owner && proj.owner !== window.player) {
                        const p1 = window.player;
                        if (Math.hypot(p1.x - proj.x, p1.y - proj.y) < p1.radius + proj.radius) {
                            p1.takeDamage(proj.damage); // Use standard take damage
                            proj.dead = true;
                            createExplosion(proj.x, proj.y, proj.color);
                        }
                    }

                    if (proj.dead) {
                        projectiles.splice(index, 1);
                        return;
                    }
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

                // PvP Collision: P1 vs P2 (AI)
                if (att.owner === player && typeof window.additionalPlayers !== 'undefined') {
                    window.additionalPlayers.forEach(p2 => {
                        const pid = p2.id || 'P2';
                        if (att.hitList.includes(pid)) return;
                        if (Math.hypot(p2.x - att.x, p2.y - att.y) < att.radius + p2.radius) {
                            let angleTo = Math.atan2(p2.y - att.y, p2.x - att.x);
                            let diff = angleTo - att.angle;
                            while (diff < -Math.PI) diff += Math.PI * 2;
                            while (diff > Math.PI) diff -= Math.PI * 2;
                            if (Math.abs(diff) < Math.PI / 3) {
                                if (p2.hp > 0) {
                                    p2.hp -= att.damage;
                                    att.hitList.push(pid);
                                    createExplosion(p2.x, p2.y, att.color);
                                    floatingTexts.push(new FloatingText(p2.x, p2.y - 40, att.damage.toFixed(0), "#ff0000", 25));
                                    if (p2.hp <= 0) {
                                        let idx = window.additionalPlayers.indexOf(p2);
                                        if (idx > -1) window.additionalPlayers.splice(idx, 1);
                                        createExplosion(p2.x, p2.y, '#fff');
                                        showNotification("OPPONENT KO!");

                                        if (isVersusMode && window.additionalPlayers.length === 0) {
                                            setTimeout(() => gameOver(true), 2000);
                                        } else if (!isVersusMode && bossActive && window.additionalPlayers.length === 0) {
                                            bossActive = false;
                                            bossDeathTimer = 180;
                                            enemies.forEach(e => createExplosion(e.x, e.y, '#fff'));
                                            enemies = [];
                                            projectiles = [];
                                        }
                                    }
                                }
                            }
                        }
                    });
                }

                // PvP Collision: P2 (AI) vs P1
                if (att.owner && att.owner !== player && !att.hitList.includes('PLAYER')) {
                    if (Math.hypot(player.x - att.x, player.y - att.y) < att.radius + player.radius) {
                        let angleTo = Math.atan2(player.y - att.y, player.x - att.x);
                        let diff = angleTo - att.angle;
                        while (diff < -Math.PI) diff += Math.PI * 2;
                        while (diff > Math.PI) diff -= Math.PI * 2;
                        if (Math.abs(diff) < Math.PI / 3) {
                            if (!player.isInvincible && player.hp > 0) {
                                player.takeDamage(att.damage);
                                att.hitList.push('PLAYER');
                                createExplosion(player.x, player.y, att.color);
                            }
                        }
                    }
                }

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

            // Draw Additional Players (Versus / AI)
            if (typeof window.additionalPlayers !== 'undefined') {
                window.additionalPlayers.forEach(p2 => {
                    // Update P2
                    if (p2.controller) {
                        // Ensure input context is updated inside update() via controller
                        p2.update();
                    }

                    p2.draw();

                    // HP Bar for AI
                    const percent = Math.max(0, p2.hp / p2.maxHp);
                    ctx.save();
                    ctx.fillStyle = 'red';
                    ctx.fillRect(p2.x - 20, p2.y - 35, 40, 5);
                    ctx.fillStyle = '#2ecc71';
                    ctx.fillRect(p2.x - 20, p2.y - 35, 40 * percent, 5);
                    ctx.restore();
                });
            }

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

                    // Void Hero Realm Shift (Phasing)
                    if (player.type === 'void' && player.inRealmShift) {
                        return; // No collision damage
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
                        // Hook: Custom pre-damage check (for Shields etc)
                        let damagePrevented = false;
                        if (player.customOnDamage) {
                            damagePrevented = player.customOnDamage(dmgTaken);
                        }

                        if (!damagePrevented) {
                            player.hp -= dmgTaken;
                            audioManager.play('damage');
                            if (isChaosShuffleMode) checkChaosEvent('HIT');
                            floatingTexts.push(new FloatingText(player.x, player.y - 20, Math.ceil(dmgTaken), "#e74c3c", 20));
                            currentRunStats.damageTaken += dmgTaken; // Track Damage
                            player.resetCombo(); // Reset Combo on Damage
                        }
                    }
                    createExplosion(player.x, player.y, '#5e3939');

                    if (player.transformActive) {
                        player.transformActive = false;
                        player.currentForm = 'NONE';
                        showNotification("FORM BROKEN!");
                    }

                    const angle = Math.atan2(enemy.y - player.y, enemy.x - player.x);
                    if (!(enemy instanceof Boss)) { enemy.x += Math.cos(angle) * 20; enemy.y += Math.sin(angle) * 20; }
                }

                projectiles.forEach((proj, pIndex) => {
                    // Update: Additional Players Collision Logic (inserted here for performance to check against Enemy loop logic context?)
                    // Actually, PVP Logic shouldn't be inside the Enemy loop. It should be outside.
                    // But if this forEach iterates ALL projectiles, we can handle PVP here too if careful.
                    // But wait, this `projectiles.forEach` is inside `enemies.forEach((enemy) => ...`
                    // Line 3016: enemies.forEach((enemy) => { ...
                    // So this loop runs ProjectilesCount * EnemyCount times. O(M*N).
                    // This is for checking Projectile vs Current Enemy.

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
                                audioManager.play('damage');
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

                            // 1. PROJECTILE HOOK (For DLCs)
                            // If the projectile has a custom collision handler, let it handle interaction.
                            // If it returns 'STOP', we assume it handled damage/death and we stop default game logic.
                            if (proj.onHit) {
                                const result = proj.onHit(enemy);
                                if (result === 'STOP') {
                                    // Remove from array if the handler asks, or handler did it.
                                    // Usually handler might chain and then ask to be removed.
                                    // If handler returns STOP, we assume it managed the lifecycle.
                                    // We should check if it's still in the array?
                                    // Safest: Let handler kill itself or return STOP to suppress default splicing.
                                    if (proj.life <= 0) projectiles.splice(pIndex, 1);
                                    return;
                                }
                            }

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
                            if (enemy.hp <= 0 && enemy.hp + finalDamage > 0) enemy.lastHitBy = 'PROJECTILE';

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
                                        if (nearby.hp <= 0 && nearby.hp + proj.damage > 0) nearby.lastHitBy = 'PROJECTILE'; // Mark kill source

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
                            if (enemy.hp <= 0 && enemy.hp + att.damage > 0) enemy.lastHitBy = 'MELEE';
                            if (isTutorialMode && window.TutorialMode) TutorialMode.onMelee();

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
                    if (isChaosShuffleMode) checkChaosEvent('KILL', { isMelee: (enemy.lastHitBy === 'MELEE') });
                    if (isTutorialMode && window.TutorialMode && !(enemy instanceof Boss)) TutorialMode.onKill();
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
                                audioManager.play('damage');
                                floatingTexts.push(new FloatingText(player.x, player.y - 20, "10", "#e74c3c", 20));
                            }
                        }
                    }

                    if (enemy instanceof Boss) {
                        // Makuta Achievement Check
                        if (enemy.type === 'MAKUTA' && wave >= 100) {
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

                        // CHAOS EVENT HOOK
                        if (typeof checkChaosEvent === 'function') checkChaosEvent('BOSS_KILL', enemy.type);

                        // Unlock Hero Story Achievement
                        if (enemy.type === 'MAKUTA' && wave >= 100) {
                            // True Golden Mask moved to Wave 90 start

                            if (player.type === 'fire') unlockAchievement('STORY_FIRE');
                            if (player.type === 'water') unlockAchievement('STORY_WATER');
                            if (player.type === 'ice') unlockAchievement('STORY_ICE');
                            if (player.type === 'plant') unlockAchievement('STORY_PLANT');
                            if (player.type === 'metal') unlockAchievement('STORY_METAL');
                        }

                        // DLC boss-specific achievements (superbosses, etc.)
                        if (window.DLC_STORY_ACHIEVEMENTS[enemy.type]) {
                            unlockAchievement(window.DLC_STORY_ACHIEVEMENTS[enemy.type]);
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

                        const _xpMod = bossActive ? 0.15 : 1;
                        score += 10; player.gainXp(Math.round(20 * _xpMod)); createExplosion(enemy.x, enemy.y, '#aaa');

                        // Elite Logic on Death
                        if (enemy.isElite) {
                            score += 500;
                            player.gainXp(Math.round(200 * _xpMod));
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
                                        audioManager.play('damage');
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
            if (window.BIOME_LOGIC && window.BIOME_LOGIC[currentBiomeType] && window.BIOME_LOGIC[currentBiomeType].draw) {
                ctx.save();
                // Apply camera transform again for biome effects
                ctx.translate(-arena.camera.x, -arena.camera.y);
                window.BIOME_LOGIC[currentBiomeType].draw(ctx, arena);
                ctx.restore();
            }

            // DLC Hook: Hero UI (e.g. Spirit Meter)
            if (window.HERO_LOGIC && player && window.HERO_LOGIC[player.type] && window.HERO_LOGIC[player.type].drawUI) {
                window.HERO_LOGIC[player.type].drawUI(ctx);
            }

            // Tutorial HUD
            if (isTutorialMode && window.TutorialMode) TutorialMode.drawHUD(ctx);

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

            // Player Death Logic
            if (player.hp <= 0) {
                if (!isPlayerDying) {
                    isPlayerDying = true;
                    playerDeathTimer = 180; // 3 seconds animation
                    createExplosion(player.x, player.y, '#c0392b');

                    // Force Stop Movement
                    player.isDashing = false;
                    player.moveInput = { x: 0, y: 0 };
                    player.isInvincible = true; // Prevent further damage (negative HP)

                    // Sound
                    if (typeof audioManager !== 'undefined') {
                        // Play Death Sound
                        try { audioManager.play('death'); } catch (e) { }
                    }
                }
            }

            if (isPlayerDying) {
                playerDeathTimer--;

                // Slow Motion / Freeze Frame Effect Logic could go here

                // Visuals: Fade to Black + Text
                ctx.save();
                ctx.fillStyle = `rgba(0, 0, 0, ${(180 - playerDeathTimer) / 200})`; // Slow fade
                ctx.fillRect(0, 0, canvas.width, canvas.height);

                // Blood Explosions
                if (playerDeathTimer % 15 === 0) {
                    createExplosion(player.x + (Math.random() - 0.5) * 60, player.y + (Math.random() - 0.5) * 60, '#c0392b');
                }

                // Shake Screen
                const shake = (playerDeathTimer / 180) * 5;
                ctx.translate((Math.random() - 0.5) * shake, (Math.random() - 0.5) * shake);

                ctx.restore();

                // Finish
                if (playerDeathTimer <= 0) {
                    isPlayerDying = false;
                    gameOver();
                }
                return; // Stop processing frame
            }
        }
    }
}

// Ensure you call loadGame() at startup!
loadGame();

// Initialize DLCs then Menu
if (window.dlcManager) {
    window.dlcManager.init().then(() => {
        // Hide Loading Screen
        const loader = document.getElementById('loading-screen');
        if (loader) {
            loader.style.transition = 'opacity 0.5s';
            loader.style.opacity = '0';
            setTimeout(() => loader.remove(), 500);
        }

        initMenu();
        masterLoop();
    });
} else {
    // Hide Loading Screen
    const loader = document.getElementById('loading-screen');
    if (loader) loader.style.display = 'none';

    initMenu();
    masterLoop();
}

// OPTIONAL: Auto-save every 30 seconds
setInterval(() => {
    if (gameRunning && !gamePaused) {
        saveGame();
    }
}, 30000);
