// #194 phase 2 — explicit imports for symbols previously read off window shims.
import { MeleeSwipe } from './Entities/MeleeSwipe.js';
import { World } from './shared/world.js';

// game.js migrated to ESM 2026-05-11 (Phase 8b step 2; explicit-import pass 8b/3).
// Mutable registries (BIOME_LOGIC, HERO_LOGIC, ENEMY_LOGIC, DLC_REGISTRY,
// chaosState) and UI singletons whose call sites already use `window.X` are
// intentionally NOT imported — they keep their `window.` prefix below so DLC-
// time extension stays observable.
import { mulberry32 } from './Utils.js';
import { gameConfig } from './Config.js';
import { Player } from './Player.js';
import { Enemy } from './Enemy.js';
import { Boss } from './Boss.js';
import { Arena } from './Arena.js';
import { Companion } from './Companion.js';
import { FloatingText } from './Entities/FloatingText.js';
import { Particle } from './Entities/Particle.js';
import { Projectile } from './Entities/Projectile.js';
import { GoldDrop } from './Entities/GoldDrop.js';
// CardDrop class removed in #5 phase 5.2 (ECS migration). See core/systems/cardDropSystem.js.
import { HolyMask } from './Entities/HolyMask.js';
// PowerUp class removed in #5 phase 5.1 (ECS migration). See core/systems/powerUpSystem.js.
import { SaveManager } from './Managers/SaveManager.js';
import { CloudSaveManager } from './Managers/CloudSaveManager.js';
import { UIManager } from './Managers/UIManager.js';
import { InputManager } from './Managers/InputManager.js';
import { StoryManager } from './Managers/StoryManager.js';
import { SpatialHash } from './Managers/SpatialHash.js';
import { audioManager } from './Managers/AudioManager.js';
import { introManager } from './Managers/IntroManager.js';
import { EvilMode } from './EvilMode.js';
import { TutorialMode } from './TutorialMode.js';
import { TestingGrounds } from './TestingGrounds.js';
import { CoopGamepadController } from './CoopGamepadController.js';
import { Altar } from './Altar.js';
import { Manual } from './Tutorial.js';
import { MenuBackground } from './UI/MenuBackground.js';
import { AIController, CompanionAIController } from './Entities/PlayerController.js';
import { RecordingInputController } from './Entities/NetworkInputController.js';
import { DLCManager } from './dlc/DLCManager.js';
import { MEMORY_STORIES } from './MemoryStories.js';
import {
    openChaosGamble, updateChaosGambleUI, confirmChaosGamble,
    generateChaosObjective, updateChaosObjective, checkChaosEvent,
} from './ChaosMode.js';
// Singletons whose only consumer in game.js is bare-identifier access (HTML
// onclick handlers and DLC files reach them through `window.X` directly).
import infoDialogueManager from './UI/InfoDialogueManager.js';
import onlineLobby from './UI/OnlineLobby.js';
import {
    shake, triggerImpact, applyScreenShake, tickPhotoMode, isPhotoMode,
} from './Camera.js';
import { createExplosion, spawnLevelUpAura } from './Spawner.js';
import {
    isWaveCleared, buildBiomePool, pickRandomBiome,
    pickSeededBiome, isStoryBossWave, notifyWaveAdvance,
} from './Wave.js';
import { createRunStats, runState } from './RunState.js';
import { createGameLoop } from './GameLoop.js';
import { _drawGameplayPost } from './core/drawGameplayPost.js';
import { _drawGameplayMid } from './core/drawGameplayMid.js';
import { _updateGameplayPre } from './core/updateGameplayPre.js';
import { _updateGameplayMid } from './core/updateGameplayMid.js';
import { renderPostFX } from './core/postProcess.js';
import { clearPowerUps } from './core/systems/powerUpSystem.js';
import { spawnCardDrop, clearCardDrops } from './core/systems/cardDropSystem.js';

// #9 — Electron detection + fs/path/saveFilePath now centralised in Platform.js.
const isElectron   = !!(window.Platform && window.Platform.isElectron);
const fs           = window.Platform ? window.Platform.fs   : null;
const saveFilePath = window.Platform ? window.Platform.saveFilePath : null;

// #194 follow-up — cross-module exposure for symbols read by bare name from
// non-importing files (typeof X !== 'undefined' guards in EvilMode.js,
// SaveManager.js, AudioManager.js, InputManager.js, CrashReporter.js, etc.).
// These bindings are immutable from this module's perspective so a one-time
// write is sufficient. Variables that get reassigned are in the
// defineProperty block further down.
window.isElectron    = isElectron;
window.fs            = fs;
window.saveFilePath  = saveFilePath;
window.audioManager  = audioManager;
window.createExplosion = createExplosion;
window.triggerImpact = triggerImpact;

if (isElectron) {
    if (saveFilePath) console.log("Save File Location:", saveFilePath); // Useful for debugging

    // Write uncaught JS errors directly to the log file so crashes are captured
    // even if the renderer freezes before the main process can log them.
    const _logPath = process.env.APP_LOG_PATH;
    if (_logPath) {
        window.onerror = function (message, source, lineno, colno, error) {
            const entry = `[${new Date().toISOString()}] [RENDERER:UNCAUGHT] ${message}\n  at ${source}:${lineno}:${colno}\n${error && error.stack ? error.stack : ''}\n`;
            try { fs.appendFileSync(_logPath, entry); } catch (_) {}
        };
        window.onunhandledrejection = function (event) {
            const entry = `[${new Date().toISOString()}] [RENDERER:UNHANDLED_REJECTION] ${event.reason && event.reason.stack ? event.reason.stack : event.reason}\n`;
            try { fs.appendFileSync(_logPath, entry); } catch (_) {}
        };
    }
}

const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');
// #4 session 4 — GameContext now owns canvas + ctx; the setter mirrors to
// `window.canvas` / `window.ctx` so DLC bare-reads keep working.
window.gameContext.canvas = canvas;
window.gameContext.ctx    = ctx;

// Canvas click handler for boss-defeated choice screen buttons
canvas.addEventListener('click', function (e) {
    if (!runState._bossChoiceScreen || runState._bossChoiceFrame < 20) return;
    const r = canvas.getBoundingClientRect();
    const mx = (e.clientX - r.left) * (canvas.width / r.width);
    const my = (e.clientY - r.top) * (canvas.height / r.height);
    const cont = window._bossContinueBtn;
    const quit = window._bossQuitBtn;
    if (cont && mx >= cont.x && mx <= cont.x + cont.w && my >= cont.y && my <= cont.y + cont.h) {
        _doBossContinue();
    } else if (quit && mx >= quit.x && mx <= quit.x + quit.w && my >= quit.y && my <= quit.y + quit.h) {
        saveAndQuit();
    }
});

function _doBossContinue() {
    runState._bossChoiceScreen = false;
    runState._bossChoiceFrame = 0;
    runState._bossChoiceFocus = 0;
    runState._bossChoiceGpPrev = {};
    window._bossContinueBtn = null;
    window._bossQuitBtn = null;
    ctx.clearRect(0, 0, canvas.width, canvas.height); // clear frozen boss-choice frame before story opens
    triggerStory(runState.wave);
}
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

/** @type {import('./types/schemas.js').SaveData} */
const defaultSaveData = {
    // Schema version — bumped only when SaveManager.MIGRATIONS gains an entry.
    // Saves loaded without a version field are treated as v0 and migrated.
    version: 1,
    fire: { level: 0, unlocked: 1, highScore: 0, prestige: 0, maxWinPrestige: -1, storyCompleted: false, bestSpeedrunSec: null },
    water: { level: 0, unlocked: 0, highScore: 0, prestige: 0, maxWinPrestige: -1, storyCompleted: false, bestSpeedrunSec: null },
    ice: { level: 0, unlocked: 0, highScore: 0, prestige: 0, maxWinPrestige: -1, storyCompleted: false, bestSpeedrunSec: null },
    plant: { level: 0, unlocked: 0, highScore: 0, prestige: 0, maxWinPrestige: -1, storyCompleted: false, bestSpeedrunSec: null },
    metal: { level: 0, unlocked: 0, highScore: 0, prestige: 0, maxWinPrestige: -1, storyCompleted: false, bestSpeedrunSec: null },
    black: { level: 0, unlocked: 0, highScore: 0, prestige: 0, maxWinPrestige: -1, storyCompleted: false, bestSpeedrunSec: null }, // Hidden/Daily Hero
    global: {
        totalKills: 0, maxWave: 0, totalGold: 0, totalBosses: 0,
        totalDamage: 0, maxCombo: 0, totalGames: 0, totalDeaths: 0,
        totalVoidGoldSpent: 0, unlockedAchievements: [],
        daily_wins: 0, weekly_wins: 0,
        onlineGamesPlayed: 0, onlineMaxWave: 0,
        bossesSeen: {} // #192 — per-boss-id flag; first encounter cinematic is always full, repeats are skippable
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
window.gameContext.defaultSaveData = defaultSaveData; // #4 session 4 — owned by GameContext, mirrored to window._defaultSaveData

// currentBiomeType migrated to runState (#11 phase 5).
// #11 phase 4 — mode flags migrated to runState.X (isVersusMode,
// isChaosShuffleMode, isTutorialMode, isTestingMode, isEvilMode, isCoopMode,
// isSpeedrunMode, isAICompanionMode, isWorkshopMode, isOnlineMode,
// isOnlineHost, isOnlineGuest, isDailyMode, isWeeklyMode). Bare references
// rewritten throughout game.js. DLC + leaf modules still read via window.X
// — defineProperty bridges below route to runState.X.
let _onlineFrame  = 0;      // frame counter for throttling network sends
let _onlineEvents = [];     // event queue flushed with each host snapshot
let coopP2HeroType = null;
let coopP1GamepadIndex = -1;
let coopP2GamepadIndex = -1;
let coopP2MenuIndex = 0;
let coopP2Debounce = 0;
let coopP2HeroLocked = false; // True when resuming a co-op save — P2 hero cannot be changed
// player2 migrated to runState (#11 phase 7).
// coopZoom migrated to runState (#11 phase 3).
// p1RevivalMarker, p2RevivalMarker migrated to runState (#11 phase 7).
let p2LevelUpPending = false;
const p2LevelUpOptions = [];
window.gameContext.saveData = { // #4 session 5
    fire: { level: 0, unlocked: 0, highScore: 0, prestige: 0 },
    water: { level: 0, unlocked: 0, highScore: 0, prestige: 0 },
    ice: { level: 0, unlocked: 0, highScore: 0, prestige: 0 },
    plant: { level: 0, unlocked: 0, highScore: 0, prestige: 0 },
    metal: { level: 0, unlocked: 0, highScore: 0, prestige: 0 },
    earth: { level: 0, unlocked: 0, highScore: 0, prestige: 0 },
    black: { level: 0, unlocked: 0, highScore: 0, prestige: 0 },
    global: { totalKills: 0, maxWave: 0, totalGold: 0, totalBosses: 0, totalDamage: 0, maxCombo: 0, totalGames: 0, totalDeaths: 0, totalVoidGoldSpent: 0, unlockedAchievements: [], daily_wins: 0, weekly_wins: 0, onlineGamesPlayed: 0, onlineMaxWave: 0 },
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

// Bucket damage dealt by source for the end-of-run breakdown. Called from each
// damage site (projectile / melee / dot / special) alongside the existing
// currentRunStats.damageDealt accumulator. Safe to call before stats are
// initialised — early returns if the map is missing.
function bumpDamageSource(src, n) {
    if (!runState.currentRunStats || !runState.currentRunStats.damageBySource || !(n > 0)) return;
    runState.currentRunStats.damageBySource[src] = (runState.currentRunStats.damageBySource[src] || 0) + n;
}
if (typeof window !== 'undefined') window.bumpDamageSource = bumpDamageSource;

// Build the end-of-run breakdown UI (Slay the Spire style). `pfx` is 'go' or
// 'vc' matching the screen id prefix. Renders three columns: damage-by-source
// bars, upgrade pick timeline, key-moment list.
function _renderRunBreakdown(pfx) {
    const host = document.getElementById(`${pfx}-breakdown`);
    if (!host) return;
    const fmtTime = s => `${Math.floor(s / 60)}:${(s % 60).toString().padStart(2, '0')}`;

    // --- Damage by source ---------------------------------------------------
    const dmg = runState.currentRunStats.damageBySource || {};
    const dmgEntries = Object.entries(dmg).sort((a, b) => b[1] - a[1]);
    const dmgTotal = dmgEntries.reduce((acc, [, v]) => acc + v, 0);
    const dmgLabels = { projectile: 'Projectile', melee: 'Melee', special: 'Special', dot: 'DoT' };
    const dmgHtml = dmgEntries.length
        ? dmgEntries.map(([src, n]) => {
            const pct = dmgTotal > 0 ? Math.round((n / dmgTotal) * 100) : 0;
            return `<div class="dmg-bar-row">
                <span class="dmg-label">${dmgLabels[src] || src}</span>
                <span class="dmg-bar"><span class="dmg-bar-fill" style="width:${pct}%"></span></span>
                <span class="dmg-val">${Math.floor(n).toLocaleString()}</span>
            </div>`;
        }).join('')
        : '<div class="go-breakdown-empty">No damage recorded</div>';

    // --- Upgrade picks ------------------------------------------------------
    const picks = runState.currentRunStats.upgradesPicked || [];
    const pickHtml = picks.length
        ? picks.map(p => `<div class="upgrade-pick-row">
            <span class="pick-wave">W${p.wave}</span>
            <span class="pick-title">${p.title}</span>
            <span class="pick-time">${fmtTime(p.timeSec)}</span>
        </div>`).join('')
        : '<div class="go-breakdown-empty">No upgrades picked</div>';

    // --- Key moments --------------------------------------------------------
    const moments = runState.currentRunStats.keyMoments || [];
    const momentHtml = moments.length
        ? moments.map(m => `<div class="moment-row ${m.kind}">
            <span class="moment-wave">W${m.wave}</span>
            <span class="moment-label">${m.label}</span>
            <span class="moment-time">${fmtTime(m.timeSec)}</span>
        </div>`).join('')
        : '<div class="go-breakdown-empty">No notable moments</div>';

    host.innerHTML = `
        <div class="go-breakdown-col">
            <h4>Damage by Source</h4>
            ${dmgHtml}
        </div>
        <div class="go-breakdown-col">
            <h4>Upgrades Picked (${picks.length})</h4>
            ${pickHtml}
        </div>
        <div class="go-breakdown-col">
            <h4>Key Moments</h4>
            ${momentHtml}
        </div>
    `;
}

// Module-level broad-phase indices. Rebuilt once per frame in the main update
// path; queried by AOE-radius scans (explosive projectiles, area hits) and the
// per-enemy projectile collision sweep to avoid the O(N×M) linear walk that
// was hot at wave 30+ entity counts.
//   _enemySpatialHash   — enemies indexed at 128 px cells
//   _projectileSpatialHash — projectiles indexed at 128 px cells (P2: enemy
//                            collision loop queries by enemy.x/y instead of
//                            iterating the full projectiles array per enemy)
// Both honour a small-N bypass: when entity counts are low the rebuild cost
// outweighs the savings, so the hash is left empty and call sites fall back
// to linear iteration. See _SPATIAL_HASH_MIN.
const _SPATIAL_HASH_MIN = 30; // skip rebuild + use linear scan when below this
const _enemySpatialHash = (typeof SpatialHash !== 'undefined') ? new SpatialHash(128) : null;
const _projectileSpatialHash = (typeof SpatialHash !== 'undefined') ? new SpatialHash(128) : null;

// Per-frame flags set in the masterLoop rebuild block. When false, queries
// fall back to a linear iteration of the underlying array.
let _enemyHashActive = false;
let _projectileHashActive = false;

// Helper: returns enemies near (x,y,r). Uses the broad-phase hash when active,
// falls back to the full enemies array otherwise. Callers MUST still do an
// exact distance test — the spatial hash is loose.
function queryEnemiesNear(x, y, r) {
    if (_enemyHashActive && _enemySpatialHash) return _enemySpatialHash.query(x, y, r);
    return (typeof enemies !== 'undefined') ? enemies : [];
}
// Helper: same for projectiles. Used by the inverted per-enemy collision sweep
// + future melee-vs-projectile reflect/telekinesis paths.
function queryProjectilesNear(x, y, r) {
    if (_projectileHashActive && _projectileSpatialHash) return _projectileSpatialHash.query(x, y, r);
    return (typeof projectiles !== 'undefined') ? projectiles : [];
}

if (typeof window !== 'undefined') {
    window._enemySpatialHash = _enemySpatialHash;
    window._projectileSpatialHash = _projectileSpatialHash;
    window.queryEnemiesNear = queryEnemiesNear;
    window.queryProjectilesNear = queryProjectilesNear;
}

// Runtime stats tracker — owned by runState.currentRunStats (#11 phase 7).
// `createRunState()` calls `createRunStats({ startTime: 0 })` for the
// initial instance; resetRunStats() is called at startGame().

// --- Save Encoding/Decoding ---
// Moved to SaveManager.js

async function saveGame() {
    if (typeof SaveManager !== 'undefined') {
        const blob = await SaveManager.saveGame(window.saveData);
        if (typeof CloudSaveManager !== 'undefined') {
            CloudSaveManager.uploadInBackground(blob);
        }
    }
}

// --- Audio System ---
// Audio management has been moved to AudioManager.js


async function loadGame() {
    if (typeof SaveManager !== 'undefined') {
        window.gameContext.saveData = await SaveManager.loadGame(defaultSaveData); // #4 session 5
    } else {
        console.error("SaveManager is not defined!");
        window.gameContext.saveData = structuredClone(defaultSaveData); // #4 session 5 + #17
    }
    if (typeof CloudSaveManager !== 'undefined') {
        await CloudSaveManager.syncOnStartup();
    }
    // Poll active world events (fire-and-forget; TTL guards against repeated calls)
    window.worldEvents?.poll?.();
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
            window.gameContext.saveData = data; // #4 session 5
            saveGame();
            alert("Save loaded successfully!");
            location.reload();
        });
    }
}

// #165 — In-game changelog ("What's New") modal
// Minimal markdown→HTML for the CHANGELOG slice rendered in the modal.
// Subset: `##` / `###` headings, `- ` lists, `**bold**`, `*em*`, `` `code` ``,
// `[text](url)`. Source is escaped first so any stray HTML is inert.
function _renderMarkdownLite(md) {
    const esc = (s) => s
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#39;');
    const inline = (s) => s
        .replace(/`([^`]+)`/g, (_, c) => `<code class="wn-code">${c}</code>`)
        .replace(/\*\*([^*]+?)\*\*/g, '<strong class="wn-strong">$1</strong>')
        .replace(/(^|[\s(])\*([^*\s][^*]*?)\*(?=[\s).,;:!?]|$)/g, '$1<em class="wn-em">$2</em>')
        .replace(/\[([^\]]+)\]\(([^)\s]+)\)/g,
            (_, t, u) => `<a class="wn-link" href="${u}" target="_blank" rel="noopener noreferrer">${t}</a>`);

    const lines = md.split('\n');
    const out = [];
    let inList = false;
    const closeList = () => { if (inList) { out.push('</ul>'); inList = false; } };
    for (const raw of lines) {
        const line = raw.replace(/\s+$/, '');
        if (!line.trim()) { closeList(); continue; }
        const escLine = esc(line);
        let m;
        if ((m = escLine.match(/^## (.+)$/))) {
            closeList();
            out.push(`<h2 class="wn-h2">${inline(m[1])}</h2>`);
        } else if ((m = escLine.match(/^### (.+)$/))) {
            closeList();
            out.push(`<h3 class="wn-h3">${inline(m[1])}</h3>`);
        } else if ((m = escLine.match(/^[-*] (.+)$/))) {
            if (!inList) { out.push('<ul class="wn-ul">'); inList = true; }
            out.push(`<li class="wn-li">${inline(m[1])}</li>`);
        } else {
            closeList();
            out.push(`<p class="wn-p">${inline(escLine)}</p>`);
        }
    }
    closeList();
    return out.join('');
}
async function _maybeShowWhatsNew() {
    try {
        if (!gameConfig) return;
        if (gameConfig.lastSeenVersion === APP_VERSION) return;

        const res = await fetch('CHANGELOG.md');
        if (!res.ok) return;
        const raw = await res.text();

        // Extract the most recent section: first '## [...]' block.
        // If user has seen a prior version, show every section newer than it
        // by concatenating all '## [...]' blocks until we hit lastSeenVersion.
        const sections = raw.split(/^## /m).slice(1); // first slice is preamble
        if (!sections.length) return;

        const lastSeen = gameConfig.lastSeenVersion;
        const shown = [];
        for (const s of sections) {
            const head = s.split('\n', 1)[0]; // e.g. "[Unreleased]" or "[1.2.0] - 2026-…"
            const verMatch = head.match(/\[([^\]]+)\]/);
            const ver = verMatch ? verMatch[1] : null;
            if (lastSeen && ver && ver === lastSeen) break;
            shown.push('## ' + s.trimEnd());
            if (shown.length >= 5) break; // safety cap
        }
        if (!shown.length) return;

        const body = document.getElementById('whatsnew-body');
        const ver  = document.getElementById('whatsnew-version');
        const modal = document.getElementById('whatsnew-modal');
        if (!body || !modal) return;
        ver.textContent = `Now on ${APP_VERSION}`;
        body.innerHTML = _renderMarkdownLite(shown.join('\n\n'));
        modal.style.display = 'flex';
    } catch (e) {
        console.warn('Whats-new modal failed:', e);
    }
}
function closeWhatsNew() {
    const modal = document.getElementById('whatsnew-modal');
    if (modal) modal.style.display = 'none';
    if (gameConfig) {
        gameConfig.lastSeenVersion = APP_VERSION;
        if (typeof saveConfig === 'function') saveConfig();
    }
}

// #98 — Telemetry consent. Shown once on first launch; suppressed once the
// user has answered (Enable / Decline). "Ask me later" leaves consentSeen
// false so the prompt returns next boot.
function _maybeShowTelemetryConsent() {
    try {
        if (!gameConfig) return;
        if (gameConfig.telemetryConsentSeen === true) return;
        const modal = document.getElementById('telemetry-consent-modal');
        if (modal) modal.style.display = 'flex';
    } catch (e) { console.warn('Telemetry consent modal failed:', e); }
}

window.respondTelemetryConsent = function (accepted) {
    const modal = document.getElementById('telemetry-consent-modal');
    if (modal) modal.style.display = 'none';
    if (!gameConfig) return;
    if (accepted === null) {
        // "Ask me later" — leave flags untouched so we re-prompt next launch.
        return;
    }
    gameConfig.telemetryConsentSeen = true;
    gameConfig.telemetryEnabled = !!accepted;
    if (typeof saveConfig === 'function') saveConfig();
    else if (typeof localStorage !== 'undefined') {
        try { localStorage.setItem('5Freunde_Config', JSON.stringify(gameConfig)); } catch (_) {}
    }
};

// #140 — Save backup browser
function openSaveBackups() {
    const modal = document.getElementById('save-backups-modal');
    const list  = document.getElementById('save-backups-list');
    if (!modal || !list) return;
    list.innerHTML = '';

    const entries = (typeof SaveManager !== 'undefined') ? SaveManager.listBackups() : [];
    if (!entries.length) {
        const row = document.createElement('div');
        row.className = 'options-row';
        row.innerHTML = '<div class="options-row-left"><span class="options-label">No backups yet. Backups are created automatically each time the game saves.</span></div>';
        list.appendChild(row);
    } else {
        for (const e of entries) {
            const when = new Date(e.ts).toLocaleString();
            const kb = (e.size / 1024).toFixed(1);
            const row = document.createElement('div');
            row.className = 'options-row';
            row.innerHTML = `
                <div class="options-row-left">
                    <span class="options-icon">💾</span>
                    <span class="options-label">Slot ${e.slot} — ${when} (${kb} KB)</span>
                </div>
                <button class="opt-toggle-btn" data-slot="${e.slot}">RESTORE</button>
            `;
            row.querySelector('button').addEventListener('click', async () => {
                if (!confirm(`Restore backup slot ${e.slot} from ${when}? Current save will be backed up first.`)) return;
                const ok = await SaveManager.restoreBackup(e.slot);
                if (ok) {
                    alert('Backup restored. Reloading...');
                    location.reload();
                } else {
                    alert('Restore failed — backup may be corrupt.');
                }
            });
            list.appendChild(row);
        }
    }
    modal.style.display = 'flex';
}
function closeSaveBackups() {
    const modal = document.getElementById('save-backups-modal');
    if (modal) modal.style.display = 'none';
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
let _lastOptLB = false;
let _lastOptRB = false;

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
            spawnCardDrop(runState, x, y, cardKey);

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

    // Determine which gamepad drives menu input
    let gpIndex = -1;
    if (runState.isCoopMode) {
        if (uiState === 'PAUSE' && window.pausedByGamepadIndex !== undefined && window.pausedByGamepadIndex !== -1) {
            gpIndex = window.pausedByGamepadIndex; // Pause menu → whoever paused
        } else if (uiState === 'LEVELUP' && window.levelingUpPlayer && window.levelingUpPlayer.controller && window.levelingUpPlayer.controller.gamepadIndex !== undefined) {
            gpIndex = window.levelingUpPlayer.controller.gamepadIndex; // Level-up → whoever leveled up
        } else {
            gpIndex = coopP1GamepadIndex !== -1 ? coopP1GamepadIndex : -1;
        }
    } else {
        // Find the first real controller, skipping USB receivers / non-controller HID devices
        for (let i = 0; i < gamepads.length; i++) {
            if (window.isRealGamepad(gamepads[i])) { gpIndex = i; break; }
        }
    }

    const gp = gpIndex !== -1 ? gamepads[gpIndex] : null;
    if (!gp) return;

    // Suppress menu nav while a gamepad-remap capture is in flight — the next
    // button press belongs to the remap UI, not the surrounding menu.
    if (typeof inputManager !== 'undefined' && inputManager && inputManager._gpRemapAction) {
        return;
    }

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
        // ChaosMode is now ESM — its mutable state lives on `window.chaosState`.
        const cs = window.chaosState;
        if (cs) {
            if (left) {
                cs.chaosSelectionIndex = Math.max(0, cs.chaosSelectionIndex - 1);
                updateChaosGambleUI();
                uiDebounce = 10;
            }
            if (right) {
                cs.chaosSelectionIndex = Math.min(cs.chaosShuffleOptions.length - 1, cs.chaosSelectionIndex + 1);
                updateChaosGambleUI();
                uiDebounce = 10;
            }
            if (a) {
                confirmChaosGamble(cs.chaosSelectionIndex);
                uiDebounce = 20;
            }
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

    // --- INFO DIALOGUE ---
    if (uiState === 'INFO_DIALOGUE') {
        if (a && !lastGamepadState.a) {
            const focused = getFocusables()[uiSelectionIndex];
            if (focused) focused.click();
            uiDebounce = 20;
        }
        if (b && !lastGamepadState.b) {
            infoDialogueManager.close();
            uiDebounce = 20;
        }
        if (up || down) {
            const wrap = document.getElementById('info-dialogue-body-wrap');
            const scrollable = wrap && wrap.scrollHeight > wrap.clientHeight;
            if (scrollable) {
                const atTop    = wrap.scrollTop <= 0;
                const atBottom = wrap.scrollTop >= wrap.scrollHeight - wrap.clientHeight - 1;
                // Scroll body unless we're already at the edge going that direction
                if ((down && !atBottom) || (up && !atTop)) {
                    wrap.scrollTop += down ? 80 : -80;
                    uiDebounce = 8;
                } else {
                    // At edge — fall through to focusable navigation
                    const focusables = getFocusables();
                    if (focusables.length > 1) {
                        uiSelectionIndex = (uiSelectionIndex + (down ? 1 : -1) + focusables.length) % focusables.length;
                        uiManager.updateUIHighlight();
                        uiDebounce = 10;
                    }
                }
            } else {
                const focusables = getFocusables();
                if (focusables.length > 1) {
                    uiSelectionIndex = (uiSelectionIndex + (down ? 1 : -1) + focusables.length) % focusables.length;
                    uiManager.updateUIHighlight();
                    uiDebounce = 10;
                }
            }
        }
        lastGamepadState = { a, b, y };
        return;
    }

    // --- CLOUD SAVE CONFLICT ---
    if (uiState === 'CLOUD_CONFLICT') {
        if (b && !lastGamepadState.b) {
            if (window._resolveCloudConflict) window._resolveCloudConflict('local');
            uiDebounce = 20;
        }
        if (a && !lastGamepadState.a) {
            const focused = getFocusables()[uiSelectionIndex];
            if (focused) focused.click();
            uiDebounce = 20;
        }
        if (up || down) {
            const focusables = getFocusables();
            if (focusables.length > 1) {
                uiSelectionIndex = (uiSelectionIndex + (down ? 1 : -1) + focusables.length) % focusables.length;
                uiManager.updateUIHighlight();
                uiDebounce = 10;
            }
        }
        lastGamepadState = { a, b, y };
        return;
    }

    // --- CUSTOM MAPS PANEL ---
    if (uiState === 'CUSTOM_MAPS') {
        if (b && !lastGamepadState.b) {
            if (window.customMapsPanel) window.customMapsPanel.close();
            uiDebounce = 20;
        }
        if (a && !lastGamepadState.a) {
            const focused = getFocusables()[uiSelectionIndex];
            if (focused) focused.click();
            uiDebounce = 20;
        }
        if (up || down) {
            const focusables = getFocusables();
            if (focusables.length > 1) {
                uiSelectionIndex = (uiSelectionIndex + (down ? 1 : -1) + focusables.length) % focusables.length;
                uiManager.updateUIHighlight();
                uiDebounce = 10;
            }
        }
        lastGamepadState = { a, b, y };
        return;
    }

    // --- SIGN IN MODAL ---
    if (uiState === 'SIGN_IN') {
        if (b && !lastGamepadState.b) {
            if (typeof CloudSaveManager !== 'undefined') CloudSaveManager.hideLoginModal();
            uiDebounce = 20;
        }
        if (a && !lastGamepadState.a) {
            const focused = getFocusables()[uiSelectionIndex];
            if (focused) {
                if (focused.tagName === 'INPUT') focused.focus();
                else focused.click();
            }
            uiDebounce = 15;
        }
        lastGamepadState = { a, b, y };
        return;
    }

    if (uiState === 'CHANGE_SERVER') {
        if (b && !lastGamepadState.b) {
            closeServerConfigModal();
            uiDebounce = 20;
        }
        if (a && !lastGamepadState.a) {
            const focused = getFocusables()[uiSelectionIndex];
            if (focused) {
                if (focused.tagName === 'INPUT') focused.focus();
                else focused.click();
            }
            uiDebounce = 15;
        }
        lastGamepadState = { a, b, y };
        return;
    }

    // --- GLOBAL LOBBY (walk-around scene handles its own input) ---
    if (uiState === 'GLOBAL_LOBBY') {
        lastGamepadState = { a, b };
        return;
    }

    // --- OPTIONS — cycle-button shortcuts + section jump (#options gamepad UX) ---
    if (uiState === 'OPTIONS') {
        const lb = gp.buttons[4] && gp.buttons[4].pressed;
        const rb = gp.buttons[5] && gp.buttons[5].pressed;
        const focusablesNow = getFocusables();
        const focused = focusablesNow[uiSelectionIndex];

        // Cycle buttons: a defined set of IDs that advance on click. Use Left/Right
        // to cycle backward/forward. Forward = click; backward = click N-1 times for
        // N-option cycles (cheap, since N is small for every cycle type).
        const CYCLE_BTN_FWD = {
            'opt-colorblind-btn':  { cycle: 'cycleColorblindMode', steps: 4 },
            'opt-fontscale-btn':   { cycle: 'cycleFontScale',      steps: 4 },
            'opt-aimassist-btn':   { cycle: 'cycleAimAssist',      steps: 5 },
            'opt-onehand-btn':     { cycle: 'cycleOneHandedScheme',steps: 3 },
            'opt-musicvol-btn':    { cycle: () => cycleVolume('musicVolume'),  steps: 5 },
            'opt-sfxvol-btn':      { cycle: () => cycleVolume('sfxVolume'),    steps: 5 },
            'opt-voicevol-btn':    { cycle: () => cycleVolume('voiceVolume'),  steps: 5 },
            'opt-uivol-btn':       { cycle: () => cycleVolume('uiVolume'),     steps: 5 },
        };
        if (focused && (left || right) && CYCLE_BTN_FWD[focused.id]) {
            const cfg = CYCLE_BTN_FWD[focused.id];
            const fn = typeof cfg.cycle === 'string' ? window[cfg.cycle] : cfg.cycle;
            if (typeof fn === 'function') {
                const reps = right ? 1 : (cfg.steps - 1);
                for (let r = 0; r < reps; r++) fn();
            }
            uiDebounce = 12;
            lastGamepadState = { a, b, y };
            return;
        }

        // LB / RB jump to previous / next section by focusing the first focusable
        // descendant of the adjacent .options-section.
        if ((lb || rb) && !_lastOptLB && !_lastOptRB) {
            const sections = Array.from(document.querySelectorAll('#options-screen .options-section'));
            if (sections.length && focused) {
                const curSection = sections.findIndex(s => s.contains(focused));
                let nextIdx = curSection + (rb ? 1 : -1);
                nextIdx = Math.max(0, Math.min(sections.length - 1, nextIdx));
                if (nextIdx !== curSection) {
                    const firstBtn = sections[nextIdx].querySelector('button, input');
                    if (firstBtn) {
                        const idx = focusablesNow.indexOf(firstBtn);
                        if (idx !== -1) {
                            uiSelectionIndex = idx;
                            updateUIHighlight();
                            firstBtn.scrollIntoView({ behavior: 'smooth', block: 'center' });
                        }
                    }
                }
                uiDebounce = 14;
                _lastOptLB = lb; _lastOptRB = rb;
                lastGamepadState = { a, b, y };
                return;
            }
        }
        _lastOptLB = lb; _lastOptRB = rb;
    } else {
        _lastOptLB = false; _lastOptRB = false;
    }

    // Back Action (B Button) - Moved BEFORE focus check so it works on empty screens
    if (b && !lastGamepadState.b) {
        // #192 — boss intro skip via controller B. Same gate as keyboard ESC:
        // only skippable once the player has seen this boss before on this save.
        if (runState.bossIntroTimer > 0 && runState.bossIntroSkippable) {
            runState.bossIntroTimer = 0;
            lastGamepadState.b = b;
            return;
        }
        if (uiState === 'OPTIONS') closeOptions();
        else if (uiState === 'PERMSHOP') closePermShop();
        else if (uiState === 'SHOP') closeShop();
        else if (uiState === 'PAUSE') togglePause();
        else if (uiState === 'ACHIEVEMENTS') closeAchievements();
        else if (uiState === 'HIGHSCORE') closeHighScores();
        else if (uiState === 'SKILLTREE') closeSkillTree();
        else if (uiState === 'STATS') closeStats();
        else if (uiState === 'COLLECTION') closeCollection();
        else if (uiState === 'ALTAR') closeAltar();
        else if (uiState === 'COMPLETION') closeCompletion();
        else if (uiState === 'DLC') closeDLCMenu();
        else if (uiState === 'BUGREPORT') closeBugReport();
        else if (uiState === 'TUTORIAL') Manual.close();
        else if (uiState === 'ONLINE_LOBBY') onlineLobby.close();
        else if (uiState === 'GLOBAL_LOBBY_MENU') toggleLobbyMenu();
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
        const el = focusables[uiSelectionIndex];
        if (el) {
            if (el.tagName === 'INPUT') el.focus(); // focus text inputs for keyboard entry
            else el.click();
        }
        uiDebounce = 15;
    }

    // Back Action (B Button)
    if (b && !lastGamepadState.b) {
        if (uiState === 'STORY') closeStory();
        else if (uiState === 'CHAOSSHOP') closeChaosShop();
        else if (uiState === 'DAILY_INFO') closeDailyInfo();
        uiDebounce = 30;
    }

    lastGamepadState = { a, b, y };
}

function toggleCoopMode() {
    runState.isCoopMode = !runState.isCoopMode;
    window.isCoopMode = runState.isCoopMode;

    const btn = document.getElementById('coop-mode-btn');
    if (btn) btn.classList.toggle('active', runState.isCoopMode);

    if (runState.isCoopMode) {
        const heroes = Object.keys(BASE_HERO_STATS).filter(h => h !== 'black' && (h !== 'love' || (saveData && saveData['love'] && saveData['love'].unlocked)));
        const p1Idx = heroes.indexOf(window.selectedHeroType || 'fire');
        coopP2MenuIndex = p1Idx === 0 ? 1 : 0;
        coopP2HeroType = heroes[coopP2MenuIndex];
        window.coopP2HeroType = coopP2HeroType;
        window.coopP2CursorIndex = coopP2MenuIndex;
        window.coopP2Confirmed = false;
        coopP1GamepadIndex = -1;
        coopP2GamepadIndex = -1;

        // Assign first two connected real controllers: P1 → first, P2 → second
        const gamepads = navigator.getGamepads();
        for (let i = 0; i < gamepads.length; i++) {
            if (window.isRealGamepad(gamepads[i])) {
                if (coopP1GamepadIndex === -1) coopP1GamepadIndex = i;
                else if (coopP2GamepadIndex === -1) { coopP2GamepadIndex = i; break; }
            }
        }
    } else {
        coopP2HeroType = null;
        window.coopP2HeroType = null;
        coopP1GamepadIndex = -1;
        coopP2GamepadIndex = -1;
        coopP2HeroLocked = false;
        window.coopP2Confirmed = false;
        window.coopP2CursorIndex = -1;
    }

    // Grey out unsupported modes in 2-player
    const restrictedBtns = ['btn-chaos-mode', 'btn-tutorial-mode', 'btn-evil-mode'];
    restrictedBtns.forEach(id => {
        const el = document.getElementById(id);
        if (el) el.classList.toggle('coop-disabled', runState.isCoopMode);
    });

    updateCoopUI();
    renderHeroSelect();
}

function getCoopTarget(ex, ey) {
    if (!(runState.isCoopMode || runState.isAICompanionMode) || !runState.player2 || runState.player2.isDead) return runState.player;
    if (runState.player.isDead) return runState.player2;
    const d1 = Math.hypot(runState.player.x - ex, player.y - ey);
    const d2 = Math.hypot(runState.player2.x - ex, player2.y - ey);
    return d1 <= d2 ? runState.player : runState.player2;
}

function drawCoopDistanceWarning(ctx, farPlayer, dist) {
    const alpha = Math.min(1.0, (dist - 650) / 100) * (0.5 + 0.5 * Math.sin(runState.frame * 0.15));
    ctx.save();
    ctx.strokeStyle = `rgba(255, 80, 80, ${alpha})`;
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.arc(farPlayer.x, farPlayer.y, farPlayer.radius + 18, 0, Math.PI * 2);
    ctx.stroke();
    ctx.restore();
}

function processRevivalMarker(ctx, marker, reviver, onComplete) {
    const pulse = 0.6 + 0.4 * Math.sin(runState.frame * 0.1);
    ctx.save();
    ctx.globalAlpha = pulse;
    ctx.strokeStyle = '#f1c40f';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(marker.x, marker.y, 30, 0, Math.PI * 2);
    ctx.stroke();
    if (marker.progress > 0) {
        ctx.globalAlpha = 1;
        ctx.strokeStyle = '#ffffff';
        ctx.lineWidth = 4;
        ctx.beginPath();
        ctx.arc(marker.x, marker.y, 30, -Math.PI / 2, -Math.PI / 2 + (Math.PI * 2 * marker.progress / marker.maxProgress));
        ctx.stroke();
    }
    ctx.globalAlpha = 1;
    ctx.fillStyle = '#f1c40f';
    ctx.font = 'bold 10px monospace';
    ctx.textAlign = 'center';
    ctx.fillText('REVIVE', marker.x, marker.y - 38);
    ctx.restore();

    if (reviver) {
        const d = Math.hypot(reviver.x - marker.x, reviver.y - marker.y);
        if (d < 40) {
            marker.progress++;
            if (marker.progress >= marker.maxProgress) onComplete(marker);
        } else {
            marker.progress = Math.max(0, marker.progress - 2);
        }
    }
}

function updateDrawRevivalMarkers(ctx) {
    if (runState.p1RevivalMarker) {
        const alive = runState.player2 && !runState.player2.isDead ? runState.player2 : null;
        processRevivalMarker(ctx, runState.p1RevivalMarker, alive, marker => {
            runState.player.isDead = false;
            runState.player.hp = Math.floor(runState.player.maxHp * 0.35);
            runState.player.isInvincible = false;
            runState.player.x = marker.x; runState.player.y = marker.y;
            runState.p1RevivalMarker = null;
            showNotification('P1 revived!');
        });
    }
    if (runState.p2RevivalMarker) {
        const alive = !runState.player.isDead ? runState.player : null;
        processRevivalMarker(ctx, runState.p2RevivalMarker, alive, marker => {
            runState.player2.isDead = false;
            runState.player2.hp = Math.floor(runState.player2.maxHp * 0.35);
            runState.player2.isInvincible = false;
            runState.player2.x = marker.x; runState.player2.y = marker.y;
            runState.p2RevivalMarker = null;
            showNotification('P2 revived!');
        });
    }
}

function updateCoopUI() {
    const bar = document.getElementById('coop-status-bar');
    if (!bar) return;

    if (!runState.isCoopMode) {
        bar.style.display = 'none';
        const storyBtn = document.getElementById('btn-story-mode');
        if (storyBtn) storyBtn.classList.remove('coop-disabled');
        const continueBtn = document.getElementById('continue-btn');
        if (continueBtn) continueBtn.classList.remove('coop-disabled');
        const standardBtn = document.getElementById('btn-standard-run');
        if (standardBtn) standardBtn.classList.remove('coop-disabled');
        const versusBtn2 = document.getElementById('btn-versus-mode');
        if (versusBtn2) versusBtn2.classList.remove('coop-disabled');
        const dailyBtn2 = document.getElementById('daily-challenge-btn');
        if (dailyBtn2) dailyBtn2.classList.remove('coop-disabled');
        const weeklyBtn2 = document.getElementById('weekly-challenge-btn');
        if (weeklyBtn2) weeklyBtn2.classList.remove('coop-disabled');
        return;
    }
    bar.style.display = 'flex';

    const noP1 = coopP1GamepadIndex === -1;
    const noP2 = coopP2GamepadIndex === -1;
    const ready = !noP1 && !noP2;

    if (ready) {
        const p1Hero = (window.selectedHeroType || 'fire').toUpperCase();
        const p2Hero = coopP2HeroType ? coopP2HeroType.toUpperCase() : '?';
        bar.innerHTML = `<span class="coop-p1-label">P1: ${p1Hero}</span><span class="coop-divider">+</span><span class="coop-p2-label">P2: ${p2Hero}</span>`;
    } else {
        const p1Chip = noP1
            ? '<span class="coop-waiting">P1 🎮 waiting&hellip;</span>'
            : '<span class="coop-p1-label">P1 🎮 ✓</span>';
        const p2Chip = noP2
            ? '<span class="coop-waiting">P2 🎮 waiting&hellip;</span>'
            : '<span class="coop-p2-label">P2 🎮 ✓</span>';
        bar.innerHTML = `${p1Chip}<span class="coop-divider">|</span>${p2Chip}`;
    }

    // Disable Story Mode until BOTH gamepads are connected
    const storyBtn = document.getElementById('btn-story-mode');
    if (storyBtn) storyBtn.classList.toggle('coop-disabled', !ready);

    // Disable Standard Run, 2P Versus, and Challenges until BOTH gamepads are connected
    const standardBtn = document.getElementById('btn-standard-run');
    if (standardBtn) standardBtn.classList.toggle('coop-disabled', !ready);
    const versusBtn = document.getElementById('btn-versus-mode');
    if (versusBtn) versusBtn.classList.toggle('coop-disabled', !ready);
    const dailyBtn = document.getElementById('daily-challenge-btn');
    if (dailyBtn) dailyBtn.classList.toggle('coop-disabled', !ready);
    const weeklyBtn = document.getElementById('weekly-challenge-btn');
    if (weeklyBtn) weeklyBtn.classList.toggle('coop-disabled', !ready);

    // Continue Run: disable if saved run is solo (can't join a solo run in co-op mid-way)
    const continueBtn = document.getElementById('continue-btn');
    if (continueBtn) {
        const hasSoloSave = saveData.savedRun && !saveData.savedRun.coopP2Type;
        continueBtn.classList.toggle('coop-disabled', hasSoloSave);
    }

    // If a co-op save exists, lock P2's hero to the saved type
    if (saveData.savedRun && saveData.savedRun.coopP2Type) {
        coopP2HeroLocked = true;
        coopP2HeroType = saveData.savedRun.coopP2Type;
        window.coopP2HeroType = coopP2HeroType;
        window.coopP2Confirmed = true;
        const _heroes = Object.keys(BASE_HERO_STATS).filter(h => h !== 'black' && (h !== 'love' || (saveData && saveData['love'] && saveData['love'].unlocked)));
        coopP2MenuIndex = Math.max(0, _heroes.indexOf(coopP2HeroType));
        window.coopP2CursorIndex = coopP2MenuIndex;
    }
}

function handleCoopP2Gamepad() {
    if (!runState.isCoopMode || uiState !== 'MENU') return;
    if (coopP2GamepadIndex === -1) return;
    if (coopP2HeroLocked) return; // Hero is fixed from saved co-op run

    const gamepads = navigator.getGamepads();
    const gp = gamepads[coopP2GamepadIndex];
    if (!gp) return;

    const T = 0.5;
    const left = gp.axes[0] < -T || gp.buttons[14].pressed;
    const right = gp.axes[0] > T || gp.buttons[15].pressed;
    const up = gp.axes[1] < -T || gp.buttons[12].pressed;
    const down = gp.axes[1] > T || gp.buttons[13].pressed;
    const aDown = gp.buttons[0].pressed;
    const aPressed = aDown && !window._coopP2APrev;
    window._coopP2APrev = aDown;

    // A button: lock in the current cursor hero
    if (aPressed) {
        const heroes = Object.keys(BASE_HERO_STATS).filter(h => h !== 'black' && (h !== 'love' || (saveData && saveData['love'] && saveData['love'].unlocked)));
        coopP2HeroType = heroes[coopP2MenuIndex];
        window.coopP2HeroType = coopP2HeroType;
        window.coopP2CursorIndex = coopP2MenuIndex;
        window.coopP2Confirmed = true;
        updateCoopUI();
        renderHeroSelect();
        return;
    }

    if (coopP2Debounce > 0) { coopP2Debounce--; return; }
    if (!left && !right && !up && !down) return;

    const heroes = Object.keys(BASE_HERO_STATS).filter(h => h !== 'black' && (h !== 'love' || (saveData && saveData['love'] && saveData['love'].unlocked)));
    const cols = 7;

    const p1Hero = window.selectedHeroType || 'fire';
    const prevIndex = coopP2MenuIndex;

    if (left) coopP2MenuIndex = (coopP2MenuIndex - 1 + heroes.length) % heroes.length;
    else if (right) coopP2MenuIndex = (coopP2MenuIndex + 1) % heroes.length;
    else if (up) coopP2MenuIndex = Math.max(0, coopP2MenuIndex - cols);
    else if (down) coopP2MenuIndex = Math.min(heroes.length - 1, coopP2MenuIndex + cols);

    // Skip P1's hero
    if (heroes[coopP2MenuIndex] === p1Hero) {
        if (left) coopP2MenuIndex = (coopP2MenuIndex - 1 + heroes.length) % heroes.length;
        else if (right) coopP2MenuIndex = (coopP2MenuIndex + 1) % heroes.length;
        else coopP2MenuIndex = prevIndex;
    }

    // Cursor moved — mark as unconfirmed until A is pressed
    window.coopP2Confirmed = false;
    window.coopP2CursorIndex = coopP2MenuIndex;
    coopP2Debounce = 12;

    updateCoopUI();
    renderHeroSelect();
}

window.addEventListener('gamepadconnected', e => {
    if (!window.isRealGamepad(e.gamepad)) return; // Ignore USB receivers / non-controller HID devices
    if (runState.isCoopMode) {
        if (coopP1GamepadIndex === -1) {
            coopP1GamepadIndex = e.gamepad.index;
        } else if (coopP2GamepadIndex === -1 && e.gamepad.index !== coopP1GamepadIndex) {
            coopP2GamepadIndex = e.gamepad.index;
        }
        updateCoopUI();
        renderHeroSelect();
    }
});

window.addEventListener('gamepaddisconnected', e => {
    if (e.gamepad.index === coopP1GamepadIndex) {
        coopP1GamepadIndex = -1;
        if (runState.isCoopMode) updateCoopUI();
    } else if (e.gamepad.index === coopP2GamepadIndex) {
        coopP2GamepadIndex = -1;
        if (runState.isCoopMode) updateCoopUI();
    }
});

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

function startTestingGrounds() {
    runState.isTestingMode = true;
    startGame('TESTING');
}

async function startOnlineTestArena() {
    document.getElementById('tg-mode-overlay').style.display = 'none';

    const account = window.gameConfig?.account;
    const serverUrl = (typeof CloudSaveManager !== 'undefined')
        ? CloudSaveManager._baseUrl()
        : (window.gameConfig?.serverUrl || 'http://localhost:3001');

    if (!account?.token) {
        showNotification('Online test requires login — sign in first.');
        return;
    }

    showNotification('Connecting online test arena…');

    const nm = window.networkManager;
    const bot = window.onlineTestBot;
    const _subs = [];
    const sub = (type, fn) => _subs.push(nm.on(type, fn));
    const cleanup = () => { _subs.forEach(u => u()); _subs.length = 0; };

    try {
        if (!nm.connected) {
            nm.connect(serverUrl, account.token);
            await new Promise((res, rej) => {
                const u = nm.on('CONNECTED', () => { u(); res(); });
                setTimeout(() => rej(new Error('Connection timeout')), 8000);
            });
        }

        await bot.start(serverUrl);

        const lobbyCode = await new Promise((res, rej) => {
            const u = nm.on('LOBBY_CREATED', msg => { u(); res(msg.code); });
            setTimeout(() => rej(new Error('Lobby timeout')), 5000);
            nm.createLobby(selectedHeroType || 'fire');
        });

        await new Promise((res, rej) => {
            const u = nm.on('GUEST_JOINED', () => { u(); res(); });
            setTimeout(() => rej(new Error('Bot join timeout')), 5000);
            bot.joinLobby(lobbyCode, 'water');
        });

        await new Promise((res, rej) => {
            const u = nm.on('PRE_GAME', msg => { u(); res(msg); });
            setTimeout(() => rej(new Error('PRE_GAME timeout')), 5000);
            nm.confirmHero();
            bot.confirmHero();
        });

        sub('GAME_START', msg => {
            cleanup();
            runState.isTestingMode = true;
            if (typeof window.startOnlineGame === 'function') window.startOnlineGame(msg);
            setTimeout(() => showNotification('[TAB] Spawn Menu  [C] Clear All  — server simulation active'), 800);
        });

        nm.startOnlineMatch('NORMAL');
        bot.beginInputLoop();

    } catch (err) {
        cleanup();
        bot.stop();
        console.error('[OnlineTest]', err);
        showNotification('Online test failed: ' + (err.message || err));
    }
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

function startSpeedrunGame() {
    if (runState.isCoopMode || runState.isOnlineMode) return; // solo only
    const hero = window.selectedHeroType || 'fire';
    if (!(window.isSpeedrunUnlocked && window.isSpeedrunUnlocked(hero))) return;
    if (!saveData.story) saveData.story = { unlockedChapters: [], enabled: true };
    saveData.story.enabled = true;
    runState.isSpeedrunMode = true;
    window.isSpeedrunMode = true;
    startGame('SPEEDRUN');
    _showSpeedrunHud(true);
}

function startEvilGame() {
    if (!saveData.story) saveData.story = { unlockedChapters: [], enabled: false };
    saveData.story.enabled = false;
    startGame('EVIL');
}

function initMenu() {
    // Remove the intro backdrop now that the menu is ready to show.
    const _backdrop = document.getElementById('intro-backdrop');
    if (_backdrop) _backdrop.style.display = 'none';

    if (typeof audioManager !== 'undefined') audioManager.play('menu');
    if (typeof MenuBackground !== 'undefined') MenuBackground.start();
    document.getElementById('menu-overlay').style.display = 'flex';
    document.getElementById('start-screen').style.display = 'flex';
    document.getElementById('start-screen').style.flexDirection = 'column';
    document.getElementById('start-screen').style.alignItems = 'center';
    document.getElementById('game-over-screen').style.display = 'none';
    document.getElementById('victory-screen').style.display = 'none';
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
    if (typeof EvilMode !== 'undefined') EvilMode.checkUnlock();
    setUIState('MENU'); // Set State
    updateMenuAccountBadge();

    // Show queued info dialogues (DLC announcements, etc.), then tutorial prompt if needed.
    infoDialogueManager.startQueue();
}

function updateMenuAccountBadge() {
    const badge = document.getElementById('menu-account-badge');
    if (!badge) return;
    const account = window.gameConfig?.account || {};
    if (account.username && account.token) {
        badge.textContent = `● Logged in as ${account.username}`;
        badge.classList.add('signed-in');
        badge.onclick = () => { if (typeof openOptions === 'function') openOptions(); };
        badge.title = 'Open Options to manage account';
    } else {
        badge.textContent = '○ Sign in';
        badge.classList.remove('signed-in');
        badge.onclick = () => { if (typeof CloudSaveManager !== 'undefined') CloudSaveManager.showLoginModal(); };
        badge.title = 'Sign in for cloud saves & online play';
    }
}
window.updateMenuAccountBadge = updateMenuAccountBadge;

// --- DLC Menu Logic ---
const DLC_META = {
    rise_of_the_rock: { rgb: '180,120,60' },
    tournament_of_thunder: { rgb: '241,196,15' },
    champions_of_chaos: { rgb: '155,89,182' },
    waker_of_winds: { rgb: '64,224,208' },
    faith_of_fortune: { rgb: '240,180,100' },
    symphony_of_sickness: { rgb: '100,180,255' },
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
            const enabling = !dlc.active;
            window.dlcManager.toggleDLC(dlc.id, enabling);
            renderDLCList();
            infoDialogueManager.showNow(
                enabling ? '✦ DLC ENABLED ✦' : '✦ DLC DISABLED ✦',
                `<strong>${dlc.title}</strong> has been ${enabling ? 'enabled' : 'disabled'}.<br><br>Please restart the game for the changes to take effect.`,
                'DLC'
            );
        };

        container.appendChild(card);
    });
}

// --- Run Saving System ---

function saveRunState() {
    if (!runState.gameRunning || runState.wave <= 0) return;

    let currentMode = 'NORMAL';
    if (typeof runState.isChaosShuffleMode !== 'undefined' && runState.isChaosShuffleMode) currentMode = 'SHUFFLE';
    else if (saveData.story && saveData.story.enabled) currentMode = 'STORY';

    const payload = {
        mode: currentMode,
        wave: runState.wave,
        score: runState.score,
        chaos: (currentMode === 'SHUFFLE' && window.chaosState) ? {
            heroAffection: window.chaosState.heroAffection || {},
            chaosObjectiveStreak: window.chaosState.chaosObjectiveStreak || 0,
            lostHeroes: window.chaosState.lostHeroes || [],
        } : null,
        player: {
            type: runState.player.type,
            hp: runState.player.hp,
            maxHp: runState.player.maxHp,
            level: runState.player.level,
            xp: runState.player.xp,
            maxXp: runState.player.maxXp,
            gold: runState.player.gold,
            buffs: runState.player.buffs,
            runBuffs: runState.player.runBuffs,
            stats: runState.player.stats, // Base stats
            // Modifiers
            damageMultiplier: runState.player.damageMultiplier,
            speedMultiplier: runState.player.speedMultiplier,
            cooldownMultiplier: runState.player.cooldownMultiplier,
            damageReduction: runState.player.damageReduction,
            extraProjectiles: runState.player.extraProjectiles,
            meleeRadius: runState.player.meleeRadius,
            maskChance: runState.player.maskChance,
            goldMultiplier: runState.player.goldMultiplier,
            critChance: runState.player.critChance,
            critMultiplier: runState.player.critMultiplier
        },
        companions: companions.map(c => ({ type: c.type })),
        coopP2Type: runState.isCoopMode && runState.player2 ? runState.player2.type : null,
        player2: runState.isCoopMode && runState.player2 ? {
            type: runState.player2.type,
            hp: runState.player2.hp, maxHp: runState.player2.maxHp,
            level: runState.player2.level, xp: runState.player2.xp, maxXp: runState.player2.maxXp,
            gold: runState.player2.gold, buffs: runState.player2.buffs, runBuffs: runState.player2.runBuffs,
            damageMultiplier: runState.player2.damageMultiplier, speedMultiplier: runState.player2.speedMultiplier,
            cooldownMultiplier: runState.player2.cooldownMultiplier, damageReduction: runState.player2.damageReduction,
            extraProjectiles: runState.player2.extraProjectiles, meleeRadius: runState.player2.meleeRadius,
            maskChance: runState.player2.maskChance, goldMultiplier: runState.player2.goldMultiplier,
            critChance: runState.player2.critChance, critMultiplier: runState.player2.critMultiplier
        } : null,
        currentRunStats: runState.currentRunStats,
        // We don't save enemies, projectiles, etc. as we restart at wave start
    };

    saveData.savedRun = payload;
    saveGame();
    _markRunActive(); // #166 — flag a run in progress for crash recovery
    console.log("Run saved at Wave " + payload.wave);
}

function clearSavedRun() {
    saveData.savedRun = null;
    saveGame();
    updateContinueButton();
    // #166 — crash recovery flag cleared on graceful shutdown / end-of-run.
    try { localStorage.removeItem('5FreundeRunActive'); } catch (_) { /* noop */ }
}

// #166 — set/clear the "run in progress" sentinel. Read at startup to detect
// crashes (sentinel still set + saveData.savedRun present → offer restore).
function _markRunActive() {
    try { localStorage.setItem('5FreundeRunActive', '1'); } catch (_) { /* noop */ }
}
function _markRunInactive() {
    try { localStorage.removeItem('5FreundeRunActive'); } catch (_) { /* noop */ }
}
window.addEventListener('beforeunload', () => {
    // Clean exit — clear the flag so re-launch won't show the recovery prompt.
    if (typeof runState.gameRunning !== 'undefined' && !runState.gameRunning) _markRunInactive();
});
function _maybeOfferCrashRecovery() {
    try {
        const flag = localStorage.getItem('5FreundeRunActive');
        if (!flag) return;
        if (!saveData || !saveData.savedRun) {
            _markRunInactive();
            return;
        }
        const sr = saveData.savedRun;
        const hero = (sr.player && sr.player.type) ? sr.player.type.toUpperCase() : '';
        const ok = confirm(`Crash recovery — your last run (Wave ${sr.wave}${hero ? ', ' + hero : ''}) ended unexpectedly. Restore it now?`);
        if (ok && typeof continueRun === 'function') {
            continueRun();
        } else {
            _markRunInactive();
        }
    } catch (e) { console.warn('Crash recovery check failed:', e); }
}
window._maybeOfferCrashRecovery = _maybeOfferCrashRecovery;

function updateContinueButton() {
    const btn = document.getElementById('continue-btn');
    const sub = document.getElementById('continue-subtitle');

    if (saveData.savedRun) {
        btn.style.display = 'block';
        let modeName = 'Standard Run';
        if (saveData.savedRun.mode === 'STORY') modeName = 'Story Mode';
        else if (saveData.savedRun.mode === 'SHUFFLE') modeName = 'Chaos Shuffle';

        const _p2Info = saveData.savedRun.coopP2Type ? ` + ${saveData.savedRun.coopP2Type.toUpperCase()}` : '';
        sub.innerText = `${modeName} - Wave ${saveData.savedRun.wave} - ${saveData.savedRun.player.type.toUpperCase()}${_p2Info}`;
    } else {
        btn.style.display = 'none';
    }
}

function continueRun() {
    if (!saveData.savedRun) return;

    const state = saveData.savedRun;

    // Restore Game Mode
    saveData.story.enabled = (state.mode === 'STORY');

    // If this was a co-op save and co-op is currently active, lock P2's hero to the saved type
    if (state.coopP2Type && runState.isCoopMode) {
        coopP2HeroType = state.coopP2Type;
        window.coopP2HeroType = coopP2HeroType;
        coopP2HeroLocked = true;
    }

    // Initialize Game Base
    startGame(state.mode); // This resets everything, so we overwrite after

    // Restore Chaos State if applicable — ChaosMode is now ESM with
    // shared state on window.chaosState.
    if (state.mode === 'SHUFFLE' && state.chaos && window.chaosState) {
        Object.assign(window.chaosState.heroAffection, state.chaos.heroAffection);
        window.chaosState.chaosObjectiveStreak = state.chaos.chaosObjectiveStreak || 0;
        window.chaosState.lostHeroes.length = 0;
        (state.chaos.lostHeroes || []).forEach(h => window.chaosState.lostHeroes.push(h));
    }

    // Restore Wave & Score
    runState.wave = state.wave - 1; // advanceWave() will increment it back to correct wave
    runState.score = state.score;
    document.getElementById('scoreVal').innerText = runState.score;

    // Restore Player
    // Re-create player with correct type (startGame does this, but let's be safe)
    runState.player = new Player(state.player.type);
    if (window._world) { runState.player._world = window._world; window._world.player = runState.player; }

    // Restore Stats
    runState.player.hp = state.player.hp;
    runState.player.maxHp = state.player.maxHp;
    runState.player.level = state.player.level;
    runState.player.xp = state.player.xp;
    runState.player.maxXp = state.player.maxXp;
    runState.player.gold = state.player.gold;

    // Restore Buffs & Modifiers
    runState.player.buffs = state.player.buffs;
    runState.player.runBuffs = state.player.runBuffs;

    runState.player.damageMultiplier = state.player.damageMultiplier;
    runState.player.speedMultiplier = state.player.speedMultiplier;
    runState.player.cooldownMultiplier = state.player.cooldownMultiplier;
    runState.player.damageReduction = state.player.damageReduction;
    runState.player.extraProjectiles = state.player.extraProjectiles;
    runState.player.meleeRadius = state.player.meleeRadius;
    runState.player.maskChance = state.player.maskChance;
    runState.player.goldMultiplier = state.player.goldMultiplier;
    runState.player.critChance = state.player.critChance;
    runState.player.critMultiplier = state.player.critMultiplier;

    // Restore Companions
    companions.length = 0;
    state.companions.forEach(cData => {
        companions.push(new Companion(cData.type, runState.player));
    });

    // Restore P2 state when continuing a co-op story run
    if (state.player2 && runState.isCoopMode && runState.player2 && runState.player2.type === state.coopP2Type) {
        const p2s = state.player2;
        runState.player2.hp = p2s.hp; runState.player2.maxHp = p2s.maxHp;
        runState.player2.level = p2s.level; runState.player2.xp = p2s.xp; runState.player2.maxXp = p2s.maxXp;
        runState.player2.gold = p2s.gold; runState.player2.buffs = p2s.buffs; runState.player2.runBuffs = p2s.runBuffs;
        runState.player2.damageMultiplier = p2s.damageMultiplier; runState.player2.speedMultiplier = p2s.speedMultiplier;
        runState.player2.cooldownMultiplier = p2s.cooldownMultiplier; runState.player2.damageReduction = p2s.damageReduction;
        runState.player2.extraProjectiles = p2s.extraProjectiles; runState.player2.meleeRadius = p2s.meleeRadius;
        runState.player2.maskChance = p2s.maskChance; runState.player2.goldMultiplier = p2s.goldMultiplier;
        runState.player2.critChance = p2s.critChance; runState.player2.critMultiplier = p2s.critMultiplier;
    }

    // Restore Run Stats
    runState.currentRunStats = state.currentRunStats;

    // Reset Boss Timer
    runState.bossDeathTimer = 0;
    runState.bossIntroTimer = 0; runState.bossIntroName = ''; runState.bossIntroSkippable = false;
    runState._bossChoiceScreen = false;
    runState._bossChoiceFrame = 0;
    runState.bossActive = false;
    runState.enemiesKilledInWave = 0; // Reset kill count for the wave we are about to start
    // The save was made at the start of state.wave (after story/shop already ran for the previous wave).
    // Just advance directly to restart that wave — no story or shop re-trigger needed.
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

// ── Online Co-op entry point ──────────────────────────────────────────────────
// Called by OnlineLobby.js when the server fires GAME_START.
function startOnlineGame(msg) {
    // msg: { hostHero, guestHero, hostUsername, guestUsername, mode }
    const nm = window.networkManager;

    // Both clients are now symmetric guests — the server runs the simulation.
    runState.isOnlineMode  = true;
    runState.isOnlineHost  = false;  // no client hosts the simulation any more
    runState.isOnlineGuest = true;   // both receive snapshots and send inputs
    window.isOnlineMode  = true;
    window.isOnlineHost  = false;
    window.isOnlineGuest = true;

    // Store player names for HUD display
    window._onlineHostName  = msg.hostUsername  || 'Host';
    window._onlineGuestName = msg.guestUsername || 'Guest';

    // Guest uses host's hero for story events so both see the same narrative
    window._onlineStoryHero = msg.hostHero || null;
    _onlineShowNameBar(true);

    const isVersusOnline = msg.mode === 'VERSUS';

    // Set co-op/versus flags
    runState.isCoopMode = !isVersusOnline;
    window.isCoopMode = runState.isCoopMode;
    if (isVersusOnline) {
        window.is2PlayerVersus = true;
        runState.isVersusMode = true;
        window.isVersusMode = true;
    }

    // Story mode flag (mirrors startStoryGame / startStandardGame)
    if (!saveData.story) saveData.story = { unlockedChapters: [], enabled: false };
    saveData.story.enabled = (msg.mode === 'STORY');

    // Hero assignment: host=P1, guest=P2 (roles stay; server sends personalised snapshots)
    const myHero      = nm.isHost() ? msg.hostHero : msg.guestHero;
    const partnerHero = nm.isHost() ? msg.guestHero : msg.hostHero;

    coopP2HeroType = partnerHero;
    window.coopP2HeroType = partnerHero;
    coopP1GamepadIndex = -1;
    coopP2GamepadIndex = -1;

    const _heroes = Object.keys(BASE_HERO_STATS);
    const myIdx = _heroes.indexOf(myHero);
    if (myIdx !== -1) window.selectedHeroIndex = myIdx;
    window.selectedHeroType = myHero; // must match index so startGame() builds correct player

    _onlineFrame  = 0;
    _onlineEvents = [];

    // Derive a shared numeric seed from the lobby code so both clients generate
    // the same biome sequence and identical arena layouts (seeded Math.random wrap).
    const _lobbyCode = nm?.lobbyCode || '';
    window._onlineBiomeSeed = _lobbyCode.split('').reduce(
        (h, c) => (Math.imul(h, 31) + c.charCodeAt(0)) >>> 0, 0
    );
    // Versus: pre-select a deterministic biome before startGame() picks one
    if (isVersusOnline) {
        const _vb = ['fire', 'water', 'ice', 'plant', 'metal', 'rock', 'cloud', 'chaos'];
        window.selectedBiome = _vb[window._onlineBiomeSeed % _vb.length];
    }

    // Both clients handle server-pushed messages directly (no RELAY wrapper in-game)
    nm.on('SNAPSHOT',        (s)  => { if (runState.isOnlineMode) _onlineHandleSnapshot(s); });
    nm.on('LEVEL_UP',        (ev) => { if (runState.isOnlineMode) _onlineShowLevelUpForGuest(ev); });
    nm.on('PARTNER_LEVELING',()   => { if (runState.isOnlineMode) _onlineShowPartnerLevelingOverlay(true); });
    nm.on('LEVEL_UP_DONE',   ()   => { if (runState.isOnlineMode) _onlineShowPartnerLevelingOverlay(false); });

    nm.on('PARTNER_RECONNECTING', (msg) => { if (runState.gameRunning) _onlineShowReconnectOverlay(true, msg.timeoutSec || 30); });
    nm.on('PARTNER_DISCONNECTED', () => { if (runState.gameRunning) _onlineShowReconnectOverlay(true, 0); });
    nm.on('PARTNER_RECONNECTED',  () => _onlineShowReconnectOverlay(false));
    nm.on('GAME_OVER', () => { if (runState.isOnlineMode) gameOver(false); });
    nm.on('STORY_CONTINUE', () => { if (runState.isOnlineMode && runState.isStoryOpen) _onlinePartnerContinueStory(); });
    nm.on('MAZE_NODE_SELECTED', (msg) => {
        if (!runState.isOnlineMode) return;
        // Close the read-only spectator maze UI
        if (window.mazeIsOpen && window.mazeUI) window.mazeUI.close();
        // Apply host's node selection so wave generation uses the correct enemy pool/modifiers
        if (window.MazeOfTime && msg.nodeId) {
            MazeOfTime.selectNode(msg.nodeId);
            MazeOfTime.clearEnemyPool();
        }
        // Proceed with the same storyEvent the host built
        if (msg.storyEvent && window.openStory) {
            window.currentStoryEvent = msg.storyEvent;
            window.openStory(msg.storyEvent);
        } else if (typeof advanceWave === 'function') {
            advanceWave();
        }
    });

    const _gameMode = isVersusOnline ? 'VERSUS' : (msg.mode === 'SHUFFLE' ? 'SHUFFLE' : 'NORMAL');
    startGame(_gameMode);
}
window.startOnlineGame = startOnlineGame;

function _onlineCleanup() {
    runState.isOnlineMode  = false;
    runState.isOnlineHost  = false;
    runState.isOnlineGuest = false;
    window.isOnlineMode  = false;
    window.isOnlineHost  = false;
    window.isOnlineGuest = false;
    _onlineEvents = [];
    window._onlineStoryHero = null;
    _onlineLocalContinuedStory  = false;
    _onlinePartnerContinuedStory = false;
}
window._onlineCleanup = _onlineCleanup;

function abortOnlineGame() {
    window.networkManager?.signalGameOver();
    _onlineCleanup();
    ['online-reconnect-overlay', 'online-partner-leveling-overlay', 'online-wait-overlay', 'online-name-bar'].forEach(id => {
        const el = document.getElementById(id);
        if (el) el.style.display = 'none';
    });
    gameOver(false);
}
window.abortOnlineGame = abortOnlineGame;

// --- Server Configuration Modal ---

function openServerConfigModal() {
    const modal = document.getElementById('server-config-modal');
    if (!modal) return;
    const input = document.getElementById('server-host-input');
    if (input) input.value = typeof CloudSaveManager !== 'undefined' ? CloudSaveManager._displayHost() : '';
    const status = document.getElementById('server-check-status');
    if (status) { status.textContent = ''; status.style.color = '#aaa'; }
    modal.style.display = 'flex';
    window._prevServerUIState = window.uiState || 'OPTIONS';
    if (window.setUIState) window.setUIState('CHANGE_SERVER');
}
window.openServerConfigModal = openServerConfigModal;

function closeServerConfigModal() {
    const modal = document.getElementById('server-config-modal');
    if (modal) modal.style.display = 'none';
    if (window.setUIState) window.setUIState(window._prevServerUIState || 'OPTIONS');
    window._prevServerUIState = null;
}
window.closeServerConfigModal = closeServerConfigModal;

async function checkServerConnection() {
    const host = (document.getElementById('server-host-input')?.value || '').trim();
    const status = document.getElementById('server-check-status');
    if (!host) {
        if (status) { status.textContent = 'Please enter a hostname or IP.'; status.style.color = '#ff7777'; }
        return;
    }
    if (status) { status.textContent = 'Checking…'; status.style.color = '#aaa'; }
    try {
        const url = `http://${host.split(':')[0]}:3001/api/health`;
        const res = await fetch(url, { signal: AbortSignal.timeout(5000) });
        const data = await res.json();
        if (res.ok && data.status === 'ok') {
            if (status) { status.textContent = '✓ Connected — server is reachable.'; status.style.color = '#77ff88'; }
        } else {
            if (status) { status.textContent = 'Server responded but returned an error.'; status.style.color = '#ff7777'; }
        }
    } catch (e) {
        if (status) { status.textContent = `Could not reach server: ${e.message}`; status.style.color = '#ff7777'; }
    }
}
window.checkServerConnection = checkServerConnection;

function saveServerConfig() {
    const host = (document.getElementById('server-host-input')?.value || '').trim();
    if (!host) return;
    if (typeof CloudSaveManager !== 'undefined') CloudSaveManager._saveHost(host);
    if (typeof updateOptionButtons === 'function') updateOptionButtons();
    closeServerConfigModal();
}
window.saveServerConfig = saveServerConfig;

function checkNewGame(mode) {
    if (mode === 'SPEEDRUN' && (runState.isCoopMode || runState.isOnlineMode)) return; // solo only
    if (runState.isCoopMode && mode !== 'STANDARD' && mode !== 'STORY' && mode !== 'DAILY' && mode !== 'WEEKLY') return; // co-op supports Standard, Story, Daily, Weekly
    if (runState.isCoopMode && coopP2GamepadIndex === -1) return; // P2 controller not yet connected
    if (saveData.savedRun) {
        pendingGameMode = mode;
        document.getElementById('confirm-dialog').style.display = 'flex';
        setUIState('CONFIRM_OVERWRITE'); // Set UI state for controller
    } else {
        if (mode === 'STORY') startStoryGame();
        else if (mode === 'SPEEDRUN') startSpeedrunGame();
        else if (mode === 'SHUFFLE') startShuffleGame();
        else if (mode === 'TUTORIAL') startTutorialGame();
        else if (mode === 'EVIL') startEvilGame();
        else startStandardGame();
    }
}

function confirmNewGame() {
    const mode = pendingGameMode; // Save before closeConfirmDialog() nulls pendingGameMode
    clearSavedRun();
    closeConfirmDialog();
    if (mode === 'STORY') startStoryGame();
    else if (mode === 'SPEEDRUN') startSpeedrunGame();
    else if (mode === 'SHUFFLE') startShuffleGame();
    else if (mode === 'TUTORIAL') startTutorialGame();
    else if (mode === 'EVIL') startEvilGame();
    else startStandardGame();
}

function closeConfirmDialog() {
    document.getElementById('confirm-dialog').style.display = 'none';
    pendingGameMode = null;
    setUIState('MENU'); // Restore UI state
}

function quitGame() {
    clearSavedRun();
    if (runState.isOnlineMode) {
        // quit=true: clears nm.lobbyCode so partner can't RETURN_TO_LOBBY to quitter
        window.networkManager?.signalGameOver(true);
        window.networkManager?.leaveLobby(); // clean up lobby on server immediately
        _onlineCleanup();
        ['online-reconnect-overlay', 'online-partner-leveling-overlay', 'online-wait-overlay', 'online-name-bar'].forEach(id => {
            const el = document.getElementById(id);
            if (el) el.style.display = 'none';
        });
        _resetGameState();
        if (typeof window.openOnlineLobby === 'function') window.openOnlineLobby();
        return;
    }
    _resetGameState();
    initMenu();
}

function saveAndQuit() {
    // Save the run pointing at the next wave (wave+1), so continueRun() resumes there.
    // continueRun() does: wave = savedRun.wave - 1, then advanceWave() → wave becomes savedRun.wave.
    runState.wave++;
    saveRunState();
    runState.wave--;
    _resetGameState();
    initMenu();
}

function _stopWeather() {
    runState.currentWeather = null;
    runState.weatherTimer = 3600;
    runState.weatherParticles = [];
    runState._weatherFlash = 0;
    runState._weatherBolts = [];
    runState.currentWeather2 = null;
    runState.weatherDuration2 = 0;
    if (typeof audioManager !== 'undefined') {
        (typeof WEATHER_TYPES !== 'undefined' ? WEATHER_TYPES : []).forEach(w => {
            audioManager.stopLoop('weather_' + w.id.toLowerCase());
        });
    }
}

function _resetGameState() {
    // Stop hero-specific loops that may still be playing (e.g. earth rolling, spirit charging)
    if (typeof audioManager !== 'undefined') {
        audioManager.stopLoop('attack_earth_roll');
        audioManager.stopLoop('special_spirit_charging');
    }
    _stopWeather();
    // Reset online interpolation state so a new session starts with a fresh clock-offset lock
    _onlineClockOffset = null;
    runState.gameRunning = false;
    runState.isTutorialMode = false;
    runState.isTestingMode = false;
    runState.isCoopMode = false;
    window.isCoopMode = false;
    runState.isAICompanionMode = false;
    window.isAICompanionMode = false;
    coopP2HeroType = null;
    window.coopP2HeroType = null;
    coopP2HeroLocked = false;
    coopP1GamepadIndex = -1;
    coopP2GamepadIndex = -1;
    runState.player2 = null;
    runState.p1RevivalMarker = null;
    runState.p2RevivalMarker = null;
    runState.coopZoom = 1.0;
    p2LevelUpPending = false;
    runState.isPlayerDying = false;
    runState.playerDeathTimer = 0;
    enemies.length = 0;
    projectiles.length = 0;
    clearPowerUps(runState);
    floatingTexts.length = 0;
    particles.length = 0;
    runState.bossActive = false;
    runState.wave = 1;
    runState.score = 0;
    runState.isLevelingUp = false;
    runState.gamePaused = false;
    document.getElementById('pause-screen').style.display = 'none';
    document.getElementById('levelup-screen').style.display = 'none';
    document.getElementById('shop-screen').style.display = 'none';
    document.getElementById('game-over-screen').style.display = 'none';
    document.getElementById('victory-screen').style.display = 'none';
    const _p2hud = document.getElementById('p2-hud');
    if (_p2hud) _p2hud.style.display = 'none';
}
window.saveAndQuit = saveAndQuit;

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
// #11 phase 3 — run-lifecycle scalars migrated to runState.X:
//   wave, score, frame, gameRunning, gamePaused, isLevelingUp, isShopping,
//   bossActive, enemiesKilledInWave, coopZoom, _hitStopFrames.
// All bare references in game.js were rewritten to `runState.X`. DLC + leaf
// modules still read via `window.X` — defineProperty bridges below now read
// from / write to `runState.X` (see the block ~3830).
const isStatsOpen = false;

// _shakeIntensity / _shakeDuration moved to Camera.js (Phase A of #1 split).
let _comboMilestoneTimer = 0;
let _prevCombo = 0;
let masksDroppedInWave = 0;  // Cap holy-mask drops per wave
let waveTimer = 0;           // Sentinel used by versus mode to disable wave timer
// #11 phase 6 — combat/cinematic state migrated to runState.X:
//   bossDeathTimer, bossIntroTimer, bossIntroName, bossIntroSkippable,
//   bossIntroCamStart{X,Y}, bossIntroCamTarget{X,Y}, _bossChoiceScreen,
//   _bossChoiceFrame, _bossChoiceFocus, _bossChoiceGpPrev, isPlayerDying,
//   playerDeathTimer. _bossChoiceGpConsumed stays local — never referenced
//   externally and not on Phase 6 schema list.
let _bossChoiceGpConsumed = false; // Gamepad debounce

// Bidirectional window bindings for DLC-exposed vars.
// Getters return the live module variable; setters update it so DLC writes
// propagate back. Arrow-function getters evaluate lazily, so closures over
// `let` variables declared later in this module are fine — by the time
// anything outside reads `window.X`, the corresponding `let X = …` line has
// already executed.
Object.defineProperties(window, {
    wave:                { get: () => runState.wave,                set: v => { runState.wave                = v; }, configurable: true, enumerable: true },
    bossActive:          { get: () => runState.bossActive,          set: v => { runState.bossActive          = v; }, configurable: true, enumerable: true },
    enemiesKilledInWave: { get: () => runState.enemiesKilledInWave, set: v => { runState.enemiesKilledInWave = v; }, configurable: true, enumerable: true },
    isPlayerDying:       { get: () => runState.isPlayerDying,       set: v => { runState.isPlayerDying       = v; }, configurable: true, enumerable: true },
    isLevelingUp:        { get: () => runState.isLevelingUp,        set: v => { runState.isLevelingUp        = v; }, configurable: true, enumerable: true },
    isShopping:          { get: () => runState.isShopping,          set: v => { runState.isShopping          = v; }, configurable: true, enumerable: true },
    gamePaused:          { get: () => runState.gamePaused,          set: v => { runState.gamePaused          = v; }, configurable: true, enumerable: true },
    isTutorialMode:      { get: () => runState.isTutorialMode,      set: v => { runState.isTutorialMode      = v; }, configurable: true, enumerable: true },
    // #194 follow-up — these are re-assigned at multiple sites in game.js
    // (`activeMutators = getDailyMutators()`, `weatherParticles = []`,
    // `currentWeather = pickWeather()`, etc.) so a one-time write would go
    // stale. Use the same lazy-getter pattern as above; consumers in
    // Enemy.js / Player.js / Biomes.js / TestingGrounds.js are guarded with
    // `typeof X !== 'undefined'` already.
    activeMutators:      { get: () => runState.activeMutators,      set: v => { runState.activeMutators      = v; }, configurable: true, enumerable: true },
    weatherParticles:    { get: () => runState.weatherParticles,    set: v => { runState.weatherParticles    = v; }, configurable: true, enumerable: true },
    currentWeather:      { get: () => runState.currentWeather,      set: v => { runState.currentWeather      = v; }, configurable: true, enumerable: true },
    currentObjective:    { get: () => runState.currentObjective,    set: v => { runState.currentObjective    = v; }, configurable: true, enumerable: true },
    currentBiomeType:    { get: () => runState.currentBiomeType,    set: v => { runState.currentBiomeType    = v; }, configurable: true, enumerable: true },
    currentRunStats:     { get: () => runState.currentRunStats,     set: v => { runState.currentRunStats     = v; }, configurable: true, enumerable: true },
    isChaosShuffleMode:  { get: () => runState.isChaosShuffleMode,  set: v => { runState.isChaosShuffleMode  = v; }, configurable: true, enumerable: true },
    isEvilMode:          { get: () => runState.isEvilMode,          set: v => { runState.isEvilMode          = v; }, configurable: true, enumerable: true },
    isOnlineMode:        { get: () => runState.isOnlineMode,        set: v => { runState.isOnlineMode        = v; }, configurable: true, enumerable: true },
    // #11 phase 4 — mode flag bridges (DLC + leaf modules read these via
    // bare-name global lookup or `window.X` / `globalThis.X`).
    isCoopMode:          { get: () => runState.isCoopMode,          set: v => { runState.isCoopMode          = v; }, configurable: true, enumerable: true },
    isAICompanionMode:   { get: () => runState.isAICompanionMode,   set: v => { runState.isAICompanionMode   = v; }, configurable: true, enumerable: true },
    isOnlineHost:        { get: () => runState.isOnlineHost,        set: v => { runState.isOnlineHost        = v; }, configurable: true, enumerable: true },
    isOnlineGuest:       { get: () => runState.isOnlineGuest,       set: v => { runState.isOnlineGuest       = v; }, configurable: true, enumerable: true },
    isVersusMode:        { get: () => runState.isVersusMode,        set: v => { runState.isVersusMode        = v; }, configurable: true, enumerable: true },
    isWorkshopMode:      { get: () => runState.isWorkshopMode,      set: v => { runState.isWorkshopMode      = v; }, configurable: true, enumerable: true },
    isTestingMode:       { get: () => runState.isTestingMode,       set: v => { runState.isTestingMode       = v; }, configurable: true, enumerable: true },
    isSpeedrunMode:      { get: () => runState.isSpeedrunMode,      set: v => { runState.isSpeedrunMode      = v; }, configurable: true, enumerable: true },
    // #11 phase 5 — story/weather bridge for DLC use (MazeUI.js sets currentStoryEvent).
    currentStoryEvent:   { get: () => runState.currentStoryEvent,   set: v => { runState.currentStoryEvent   = v; }, configurable: true, enumerable: true },
    // #11 phase 6 — bossDeathTimer bridge (TestingGrounds.js writes bare).
    bossDeathTimer:      { get: () => runState.bossDeathTimer,      set: v => { runState.bossDeathTimer      = v; }, configurable: true, enumerable: true },
    // #11 phase 7 — player refs. External consumers (EvilMode.js, Boss.js,
    // Player.js, TutorialMode.js, DLC) read window.player / window.player2 —
    // the bridges keep them always pointing at the current runState ref.
    player:              { get: () => runState.player,              set: v => { runState.player              = v; }, configurable: true, enumerable: true },
    player2:             { get: () => runState.player2,             set: v => { runState.player2             = v; }, configurable: true, enumerable: true },
    p1RevivalMarker:     { get: () => runState.p1RevivalMarker,     set: v => { runState.p1RevivalMarker     = v; }, configurable: true, enumerable: true },
    p2RevivalMarker:     { get: () => runState.p2RevivalMarker,     set: v => { runState.p2RevivalMarker     = v; }, configurable: true, enumerable: true },
    gameRunning:         { get: () => runState.gameRunning,         set: v => { runState.gameRunning         = v; }, configurable: true, enumerable: true },
    isStoryOpen:         { get: () => runState.isStoryOpen,         set: v => { runState.isStoryOpen         = v; }, configurable: true, enumerable: true },
    // #173 phase 10 — additional mirrors so `core/drawGameplayPost.js`
    // (and future leaf modules) can read this state via `globalThis.X`
    // without coupling to game.js's module scope.
    weatherDuration:     { get: () => runState.weatherDuration,     set: v => { runState.weatherDuration     = v; }, configurable: true, enumerable: true },
    _weatherFlash:       { get: () => runState._weatherFlash,       set: v => { runState._weatherFlash       = v; }, configurable: true, enumerable: true },
    _weatherBolts:       { get: () => runState._weatherBolts,       set: v => { runState._weatherBolts       = v; }, configurable: true, enumerable: true },
    playerDeathTimer:    { get: () => runState.playerDeathTimer,    set: v => { runState.playerDeathTimer    = v; }, configurable: true, enumerable: true },
    coopZoom:            { get: () => runState.coopZoom,            set: v => { runState.coopZoom            = v; }, configurable: true, enumerable: true },
    score:               { get: () => runState.score,               set: v => { runState.score               = v; }, configurable: true, enumerable: true },
    frame:               { get: () => runState.frame,               set: v => { runState.frame               = v; }, configurable: true, enumerable: true },
    _hitStopFrames:      { get: () => runState._hitStopFrames,      set: v => { runState._hitStopFrames      = v; }, configurable: true, enumerable: true },
    // #173 phase 10 — spatial-hash active flags. game.js owns the local
    // `let _enemyHashActive` / `_projectileHashActive`; the bridge lets the
    // extracted `core/updateGameplayMid.js` rebuild them each frame.
    _enemyHashActive:      { get: () => _enemyHashActive,      set: v => { _enemyHashActive      = v; }, configurable: true, enumerable: true },
    _projectileHashActive: { get: () => _projectileHashActive, set: v => { _projectileHashActive = v; }, configurable: true, enumerable: true },
    masksDroppedInWave:    { get: () => masksDroppedInWave,    set: v => { masksDroppedInWave    = v; }, configurable: true, enumerable: true },
});
// #173 phase 10 — class + helper references exposed for leaf modules.
window.Boss             = Boss;
window.applyScreenShake = applyScreenShake;
window.TutorialMode     = TutorialMode;
window.MeleeSwipe       = MeleeSwipe;
// PowerUp removed in #5 phase 5.1 (ECS migration).
window.MEMORY_STORIES   = MEMORY_STORIES;
window.updateChaosObjective = updateChaosObjective;
window.checkChaosEvent  = checkChaosEvent;
window.isWaveCleared    = isWaveCleared;
// Local helpers called from extracted leaf modules.
window.drawCoopDistanceWarning  = drawCoopDistanceWarning;
window.updateDrawRevivalMarkers = updateDrawRevivalMarkers;
window.createDeathBurst         = createDeathBurst;
window.Enemy                    = Enemy;
window._replaceArrInPlace       = _replaceArrInPlace;
window._renderBossIntroCinematic  = _renderBossIntroCinematic;
window._renderBossDeathCinematic  = _renderBossDeathCinematic;
window._renderBossChoiceScreen    = _renderBossChoiceScreen;
window.EvilMode                 = EvilMode;
window.Projectile               = Projectile;
window.GoldDrop                 = GoldDrop;
window.HolyMask                 = HolyMask;
window._SPATIAL_HASH_MIN        = _SPATIAL_HASH_MIN;
window._recordPhase             = _recordPhase;
window.getCollectionBonuses     = getCollectionBonuses;
window._onlineInterpBuf         = _onlineInterpBuf;
window._onlineRenderTime        = _onlineRenderTime;
window._renderMinimap           = _renderMinimap;

// Weather state migrated to runState (#11 phase 5):
//   currentWeather, weatherTimer, weatherDuration, weatherParticles,
//   _weatherFlash, _weatherBolts, currentWeather2, weatherDuration2.

// DLC extension point: { weatherId → (ctx, wFadeIn, frame) => void } for screen-space draw effects
window._weatherDrawHooks = {};
// DLC extension point: { weatherId → (wFadeIn, frame) => void } for per-frame logic (particles, damage, etc.)
window._weatherLogicHooks = {};

// player migrated to runState (#11 phase 7). Lives at runState.player.

// #11 phase 2 — entity arrays migrated into runState container. Destructured
// const aliases preserve the bare-name idiom (~330 refs in this file) while
// routing array identity through `runState.X`. Arrays are mutated in place
// (push / splice / `.length = 0`) and never reassigned, so the local aliases
// stay valid for the lifetime of the session.
// #173 phase 10 — `runState` is now imported from RunState.js so leaf modules
// (`core/updateGameplay*.js`) can read it without coupling to game.js.
// powerUps migrated to ECS in #5 phase 5.1 — see core/systems/powerUpSystem.js.
const {
    enemies, projectiles, particles, floatingTexts, meleeAttacks,
    holyMasks, goldDrops, memoryShards, companions,
} = runState;

// Replace an array's contents in place. Preserves identity so const aliases +
// `window.X` exports + `_world.X` resyncs stay valid after a filter/map pass.
function _replaceArrInPlace(target, src) {
    target.length = 0;
    for (let i = 0; i < src.length; i++) target.push(src[i]);
}

window.player = runState.player;
window.meleeAttacks = meleeAttacks;
window.arena = arena; // Expose Arena to Window for DLCs
// Live array references shared with extracted modules (Spawner.js, RunState.js).
// Arrays are reference types so module mutations propagate. After #11 phase 2
// these all alias the single `runState.X` ref, so the one-time exports stay
// valid forever and `window._world.X = X` resyncs become idempotent no-ops.
window.projectiles  = projectiles;
window.enemies      = enemies;
window.particles    = particles;
window.floatingTexts = floatingTexts;
// obstacles and biomeZones moved to Arena class.
// Cross-module references via window — these arrays are mutated (push / splice)
// but never reassigned, so a one-time window export keeps Arena.js,
// EvilMode.js, ChaosMode.js, Museum.js, etc. in sync without needing imports.
// powerUps no longer on window — migrated to ECS in #5 phase 5.1.
window.holyMasks    = holyMasks;
window.goldDrops    = goldDrops;
// cardDrops no longer on window — migrated to ECS in #5 phase 5.2.
window.memoryShards = memoryShards;
window.companions   = companions;

// Story Manager
const storyManager = new StoryManager();
// isStoryOpen + currentStoryEvent migrated to runState (#11 phase 5).
let _onlineLocalContinuedStory  = false;
let _onlinePartnerContinuedStory = false;

// Input
const inputManager = new InputManager(); // Handles keys, mouse, and lastInputType
window.inputManager = inputManager;

// Context menu blocked by InputManager

inputManager.onKeyDown = e => {
    // #131 routed via remappable key bindings; legacy keyCodes left as fallbacks
    // so the old defaults keep working even if config didn't load yet.
    const im = inputManager;
    // #192 — boss intro skip: ESC during a re-encounter cinematic ends it
    // immediately. Must run before the pause handler so the same key doesn't
    // also pause the game. First-encounter cinematics ignore the key entirely.
    if (runState.bossIntroTimer > 0 && runState.bossIntroSkippable && (im.eventMatches('pause', e) || e.code === 'Escape')) {
        runState.bossIntroTimer = 0;
        e.preventDefault?.();
        return;
    }
    if ((im.eventMatches('pause', e) || e.code === 'Escape') && runState.gameRunning && !runState.isLevelingUp && !runState.isShopping) {
        togglePause();
    }
    if ((im.eventMatches('melee', e) || e.code === 'Space') && runState.gameRunning && !runState.gamePaused && !runState.isLevelingUp && !runState.isShopping) {
        runState.player.melee();
    }
    if ((im.eventMatches('dash', e) || e.code === 'ShiftLeft' || e.code === 'ShiftRight') && runState.gameRunning && !runState.gamePaused && !runState.isShopping) {
        runState.player.dash();
    }
    if ((im.eventMatches('special', e) || e.code === 'KeyE') && runState.gameRunning && !runState.gamePaused && !runState.isShopping) {
        runState.player.useSpecial();
    }

    // --- DEBUG KEYS (Disabled in Electron) ---
    if (!isElectron) {
        // DEBUG: Kill Player with 'K'
        if (e.code === 'KeyK' && runState.gameRunning && !runState.gamePaused) {
            runState.player.hp = -999;
            showNotification("DEBUG: SUICIDE");
        }
        // DEBUG: Next Wave with 'N'
        if (e.code === 'KeyN' && runState.gameRunning && !runState.gamePaused) {
            enemies.length = 0;
            runState.bossActive = false;
            projectiles.length = 0;

            if (runState.wave % 2 === 0) {
                openShop();
            } else {
                runState.wave++;
                runState.enemiesKilledInWave = 0;
                const types = ['fire', 'water', 'ice', 'plant', 'metal'];
                runState.currentBiomeType = types[Math.floor(Math.random() * types.length)];
                showNotification(`DEBUG: SKIPPED TO WAVE ${runState.wave}`);
                arena.generate(runState.currentBiomeType);
                if (runState.player) {
                    runState.player.x = arena.width / 2;
                    runState.player.y = arena.height / 2;
                }
            }
        }

        // DEBUG: Spawn Boss with 'B'
        if (e.code === 'KeyB' && runState.gameRunning && !runState.gamePaused && !runState.bossActive) {
            runState.enemiesKilledInWave = ENEMIES_PER_WAVE * runState.wave;
            showNotification("DEBUG: BOSS SPAWNED");
        }

        // DEBUG: Toggle Invincibility with 'I'
        if (e.code === 'KeyI' && runState.gameRunning && !runState.gamePaused) {
            runState.player.isInvincible = !runState.player.isInvincible;
            showNotification(`DEBUG: INVINCIBILITY ${runState.player.isInvincible ? 'ON' : 'OFF'}`);
        }

        // DEBUG: Level Up with 'L'
        if (e.code === 'KeyL' && runState.gameRunning && !runState.gamePaused) {
            runState.player.levelUp();
            showNotification("DEBUG: LEVEL UP");
        }

        // DEBUG: Jump to Wave/Chapter with 'J'
        if (e.code === 'KeyJ' && runState.gameRunning && !runState.gamePaused) {
            const input = prompt("Jump to Wave (Story Chapter):", wave + 1);
            const targetWave = parseInt(input);
            if (!isNaN(targetWave) && targetWave > 0) {
                // Reset State
                enemies.length = 0;
                projectiles.length = 0;
                clearPowerUps(runState);
                runState.bossActive = false;
                runState.currentObjective = null;

                // Set wave to previous so triggerStory/advanceWave works correctly
                runState.wave = targetWave - 1;

                showNotification(`DEBUG: JUMPING TO WAVE ${targetWave}`);

                // Trigger Story Logic for the target wave
                triggerStory(runState.wave);
            }
        }

        // DEBUG: Activate Ultimate Form with 'U'
        if ((e.code === 'KeyU' || e.key === 'u') && runState.gameRunning && !runState.gamePaused && runState.player) {
            if (runState.player.getFormName) {
                runState.player.transformActive = true;
                runState.player.currentForm = runState.player.getFormName();
                // Air Hero visual fix: Activate Hurricane for Zephyr form
                if (runState.player.type === 'air' && runState.player.currentForm === 'ZEPHYR') {
                    runState.player.hurricaneActive = true;
                }
                showNotification(`DEBUG: ${runState.player.currentForm} FORM ACTIVATED!`);
                createExplosion(runState.player.x, runState.player.y, '#fff');
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

        // DEBUG: Toggle Love Hero unlock in save data with 'L' in Menu
        if (e.code === 'KeyL' && uiState === 'MENU') {
            if (!saveData['love']) saveData['love'] = {};
            const nowUnlocked = !saveData['love'].unlocked;
            saveData['love'].unlocked = nowUnlocked;
            saveGame();
            if (nowUnlocked) {
                showNotification("DEBUG: Love Hero UNLOCKED (saved)");
            } else {
                if (selectedHeroType === 'love') selectedHeroType = 'fire';
                showNotification("DEBUG: Love Hero LOCKED (saved)");
            }
            // Refresh hero selection UI if available
            if (typeof window.mainMenu !== 'undefined' && window.mainMenu.render) window.mainMenu.render();
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

        // DEBUG: Force-unlock Evil Mode with 'E' in Menu
        if (e.code === 'KeyE' && uiState === 'MENU') {
            if (typeof EvilMode !== 'undefined') {
                EvilMode.forceUnlock();
                showNotification('DEBUG: Evil Mode FORCE-UNLOCKED (saved)');
            }
        }

        // DEBUG: Open Testing Grounds with 'D' in Menu (only when menu overlay is actually visible)
        if (e.code === 'KeyD' && uiState === 'MENU' && !runState.gameRunning) {
            const menuOverlay = document.getElementById('menu-overlay');
            if (menuOverlay && menuOverlay.style.display !== 'none') {
                document.getElementById('tg-mode-overlay').style.display = 'flex';
            }
        }

        // Close TG mode chooser on Escape
        if (e.code === 'Escape') {
            const tgOverlay = document.getElementById('tg-mode-overlay');
            if (tgOverlay && tgOverlay.style.display !== 'none') tgOverlay.style.display = 'none';
        }

        // Testing Grounds controls
        if (runState.isTestingMode && runState.gameRunning && !runState.isLevelingUp) {
            if (e.code === 'Tab') {
                e.preventDefault();
                TestingGrounds.toggleSpawnMenu();
            }
            if (e.code === 'KeyC' && !runState.gamePaused) {
                TestingGrounds.clearAll();
            }
        }

        // DEBUG: [N] Instantly complete current wave (triggers boss-defeated cinematic)
        if (e.code === 'KeyN' && runState.gameRunning && !runState.isLevelingUp && !runState.gamePaused && runState.bossDeathTimer === 0 && !runState._bossChoiceScreen) {
            enemies.length = 0;
            projectiles.length = 0;
            runState.bossActive = false;
            runState.bossDeathTimer = GAMEPLAY.BOSS_DEATH_FRAMES;
            if (typeof audioManager !== 'undefined') audioManager.play('wave_completed');
            showNotification('DEBUG: Wave skipped');
        }
    }
};

// #159 — Pause menu summary. Pulls live numbers from currentRunStats + player
// + wave globals and paints them into the existing #pause-screen panel.
function renderPauseMenu() {
    try {
        const grid    = document.getElementById('pause-stats-grid');
        const upTitle = document.getElementById('pause-upgrades-title');
        const upList  = document.getElementById('pause-upgrades-list');
        const cardTitle = document.getElementById('pause-cards-title');
        const cardList  = document.getElementById('pause-cards-list');
        if (!grid) return;

        const timeSec = runState.currentRunStats && runState.currentRunStats.startTime
            ? Math.floor((Date.now() - runState.currentRunStats.startTime) / 1000) : 0;
        const mm = Math.floor(timeSec / 60).toString().padStart(2, '0');
        const ss = (timeSec % 60).toString().padStart(2, '0');
        const stats = [
            { label: 'Wave',  value: (typeof runState.wave !== 'undefined') ? runState.wave : 0 },
            { label: 'Level', value: (runState.player && runState.player.level) ? runState.player.level : 1 },
            { label: 'Gold',  value: (runState.player && Math.floor(runState.player.gold || 0)) || 0 },
            { label: 'Time',  value: `${mm}:${ss}` },
            { label: 'Kills', value: runState.currentRunStats?.enemiesKilled || 0 },
            { label: 'Dmg Dealt', value: Math.floor(runState.currentRunStats?.damageDealt || 0) },
            { label: 'Dmg Taken', value: Math.floor(runState.currentRunStats?.damageTaken || 0) },
            { label: 'Max Combo', value: runState.currentRunStats?.maxCombo || 0 }
        ];
        grid.innerHTML = stats.map(s =>
            `<div class="pause-stat-cell"><div class="ps-label">${s.label}</div><div class="ps-value">${s.value}</div></div>`
        ).join('');

        // Upgrades picked this run (most recent first, cap 24).
        const picks = (runState.currentRunStats && runState.currentRunStats.upgradesPicked) || [];
        if (picks.length && upList && upTitle) {
            upTitle.style.display = '';
            const rev = picks.slice(-24).reverse();
            upList.innerHTML = rev.map(p =>
                `<span class="pu-chip" title="Wave ${p.wave}">${(p.title || p.id || 'Upgrade').replace(/</g, '&lt;')}</span>`
            ).join('');
        } else if (upList && upTitle) {
            upTitle.style.display = 'none';
            upList.innerHTML = '';
        }

        // Active collection cards held by player. saveData.collection holds owned
        // card IDs across runs; show up to 12 so the panel stays compact.
        const cards = (saveData && Array.isArray(saveData.collection)) ? saveData.collection : [];
        if (cards.length && cardList && cardTitle) {
            cardTitle.style.display = '';
            const show = cards.slice(0, 12);
            cardList.innerHTML = show.map(id =>
                `<span class="pc-chip">${String(id).replace(/_/g, ' ')}</span>`
            ).join('') + (cards.length > show.length ? `<span class="pc-chip">+${cards.length - show.length} more</span>` : '');
        } else if (cardList && cardTitle) {
            cardTitle.style.display = 'none';
            cardList.innerHTML = '';
        }
    } catch (e) { console.warn('renderPauseMenu failed:', e); }
}
window.renderPauseMenu = renderPauseMenu;

function togglePause() {
    runState.gamePaused = !runState.gamePaused;
    document.getElementById('pause-screen').style.display = runState.gamePaused ? 'flex' : 'none';
    setUIState(runState.gamePaused ? 'PAUSE' : 'GAME');
    _syncSoundBiomeMusic();
    // Stop hero-specific loops on pause; hero update() will restart them on resume.
    if (runState.gamePaused && typeof audioManager !== 'undefined') {
        audioManager.stopLoop('attack_earth_roll');
        audioManager.stopLoop('special_spirit_charging');
    }
    // #167 — apply low-pass on the music bus while paused.
    if (typeof audioManager !== 'undefined' && typeof audioManager.setPauseFilter === 'function') {
        audioManager.setPauseFilter(!!runState.gamePaused);
    }
    // #159 — refresh pause-menu run summary contents.
    if (runState.gamePaused && typeof window.renderPauseMenu === 'function') window.renderPauseMenu();
}

function toggleLobbyMenu() {
    const menu = document.getElementById('global-lobby-menu');
    const isOpen = menu.style.display !== 'none';
    if (isOpen) {
        menu.style.display = 'none';
        setUIState('GLOBAL_LOBBY');
    } else {
        menu.style.display = 'flex';
        setUIState('GLOBAL_LOBBY_MENU');
    }
}

function quitGlobalLobby() {
    document.getElementById('global-lobby-menu').style.display = 'none';
    const nm = window.networkManager;
    if (nm) nm.leaveGlobalLobby();
    if (window.globalLobbyScene) {
        window.globalLobbyScene._cleanup();
        window.globalLobbyScene = null;
    }
    if (window.initMenu) window.initMenu();
    else { setUIState('MENU'); document.getElementById('menu-overlay').style.display = 'flex'; }
}

// Pause or resume battle_sound_sync to keep beat visualizations in sync with the music
// Called whenever gamePaused or isLevelingUp changes.
function _syncSoundBiomeMusic() {
    if (typeof audioManager === 'undefined' || !audioManager.tracks) return;
    const track = audioManager.tracks['battle_sound_sync'];
    if (!track) return;
    if (runState.gamePaused || runState.isLevelingUp) {
        if (!track.paused) track.pause();
    } else {
        if (track.paused && track.currentTime > 0) track.play().catch(() => { });
    }
}

function renderStatsTable(container) {
    if (!runState.player) return;

    const bd = runState.player.stats.breakdown;
    const run = runState.player.runBuffs;

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

function showNotification(text, type = 'info') {
    const icons = { info: '◈', positive: '✦', negative: '✖', warning: '⚠' };
    const area = document.getElementById('notification-area');
    const div = document.createElement('div');
    div.className = 'notif' + (type !== 'info' ? ` notif-${type}` : '');

    const icon = document.createElement('span');
    icon.className = 'notif-icon';
    icon.textContent = icons[type] || icons.info;

    const label = document.createElement('span');
    label.textContent = text;

    div.appendChild(icon);
    div.appendChild(label);
    area.appendChild(div);
    setTimeout(() => div.remove(), 2400);
}

// --- Daily Challenge Logic ---
// activeMutators migrated to runState (#11 phase 5).
// isDailyMode migrated to runState (#11 phase 4).
let forcedEnemyType = null;

function getDailySeed() {
    const now = new Date();
    // Create a unique integer for the day (YYYYMMDD)
    return parseInt(`${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, '0')}${String(now.getDate()).padStart(2, '0')}`);
}

function getDailyMutators() {
    const seed = getDailySeed();
    // mulberry32 is uniform — replaces the previous Math.sin-based PRNG which
    // skewed enough that some mutator combinations were rare globally.
    const rng = mulberry32(seed);
    const count = 2;
    const selected = [];
    const pool = [...MUTATORS];
    for (let i = 0; i < count; i++) {
        if (pool.length === 0) break;
        const index = Math.floor(rng() * pool.length);
        selected.push(pool[index]);
        pool.splice(index, 1);
    }
    return selected;
}

// Shared seeded RNG for daily/weekly modes. Generation sites that opt in (drops,
// arena, mutator-specific rolls) call this so every player on the same seed
// sees identical results. Returns null when not in a seeded mode.
let _seededRng = null;
function getSeededRng() { return _seededRng; }
function initSeededRng(seed) { _seededRng = mulberry32(seed); }
function clearSeededRng() { _seededRng = null; }
if (typeof window !== 'undefined') {
    window.getSeededRng   = getSeededRng;
    window.initSeededRng  = initSeededRng;
    window.clearSeededRng = clearSeededRng;
}

// isWeeklyMode migrated to runState (#11 phase 4).

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
        const x = Math.sin(seed++) * 10000;
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

    runState.activeMutators = getWeeklyMutators();
    runState.isWeeklyMode = true;
    runState.isDailyMode = false;

    const title = document.querySelector('#daily-info-modal h1');
    if (title) title.innerText = "WEEKLY CHALLENGE";

    const list = document.getElementById('daily-mutators-list');
    list.innerHTML = '';
    runState.activeMutators.forEach(m => {
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

    runState.activeMutators = getDailyMutators();
    runState.isDailyMode = true;
    runState.isWeeklyMode = false;

    const title = document.querySelector('#daily-info-modal h1');
    if (title) title.innerText = "DAILY CHALLENGE";

    // Show Custom Modal
    const list = document.getElementById('daily-mutators-list');
    list.innerHTML = '';
    runState.activeMutators.forEach(m => {
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
// CardDrop removed in #5 phase 5.2 (ECS migration).
// createExplosion / spawnLevelUpAura moved to Spawner.js (Phase B of #1 split).
// MAX_PARTICLES kept for createDeathBurst below (which still lives in game.js).
const MAX_PARTICLES = GAMEPLAY.MAX_PARTICLES;

// #38/#51/#168 — screen-shake, shake taxonomy, gamepad vibration, photo mode
// moved to Camera.js. Re-exposed via window shims from Camera.js for DLCs.

function isReducedMotion() {
    return typeof gameConfig !== 'undefined' && !!gameConfig.reducedMotion;
}
window.isReducedMotion = isReducedMotion;

function triggerHitStop(frames) {
    runState._hitStopFrames = Math.max(runState._hitStopFrames, frames);
}
window.triggerHitStop = triggerHitStop;

// #168 — track the last hit that landed on the local player so the game-over
// screen can surface "Defeated by SHOOTER (40 dmg)" instead of a bare title.
// Updated at every meaningful damage-take site (enemy body contact, projectile,
// acid fog, lava DOT, bomber, boss melee/ranged). The killing blow leaves the
// most recent value in place at the moment gameOver() fires.
function recordPlayerDamage(target, label, dmg) {
    if (!target) return;
    target._lastDamageSource = {
        label: String(label || 'UNKNOWN'),
        dmg:   Math.max(0, Math.round(Number(dmg) || 0)),
        time:  Date.now()
    };
}
window.recordPlayerDamage = recordPlayerDamage;

// #18 — Centralized damage pipeline. Handles the common bookkeeping that was
// previously duplicated at every `player.hp -= X` site: invincibility check,
// damageReduction multiplier, customOnDamage shield hook, damage-source stamp,
// floating-text number, SFX, run-stat accounting. Returns the final damage
// applied (0 if blocked).
//
// Options:
//   label         — short name for the damage source (drives #168 death feedback)
//   color         — floating-text color (default red #e74c3c)
//   size          — floating-text font size (default 20; >=25 reads as crit)
//   prefix        — optional text prefix (e.g. "☠")
//   sfx           — AudioManager key to play (default 'damage'; null = silent)
//   noFloatText   — suppress the floating-text damage number
//   noReduction   — bypass damageReduction (raw DOT damage)
//   shake         — SHAKE_PRESETS key for screenshake on hit (default null)
//
// Complex hero/biome-specific paths (chaos hooks, Earth momentum loss, Void
// realm shift, Thornmail reflect, Mirror Shield, etc.) stay site-local — this
// helper covers the cookie-cutter DOT + explosion paths.
function applyDamage(target, dmg, opts = {}) {
    if (!target) return 0;
    if (target.isInvincible) return 0;
    if (!Number.isFinite(dmg) || dmg <= 0) return 0;

    const reduction = opts.noReduction ? 0 : (Number(target.damageReduction) || 0);
    const finalDmg = dmg * (1 - reduction);

    // Shield hook (Hand of Death etc.) — returns true to fully block.
    if (typeof target.customOnDamage === 'function') {
        try {
            const blocked = target.customOnDamage(finalDmg);
            if (blocked) return 0;
        } catch (e) { console.warn('customOnDamage threw:', e); }
    }

    target.hp -= finalDmg;
    if (target === runState.player) {
        recordPlayerDamage(target, opts.label || 'UNKNOWN', finalDmg);
        if (typeof runState.currentRunStats !== 'undefined') runState.currentRunStats.damageTaken += finalDmg;
        if (typeof runState.player.resetCombo === 'function' && finalDmg > 0) runState.player.resetCombo();
    }

    if (opts.sfx !== null && typeof audioManager !== 'undefined') {
        audioManager.play(opts.sfx || 'damage');
    }

    if (!opts.noFloatText && typeof floatingTexts !== 'undefined') {
        const txt = (opts.prefix || '') + Math.ceil(finalDmg);
        floatingTexts.push(FloatingText.acquire(
            target.x, target.y - 20, txt, opts.color || '#e74c3c', opts.size || 20
        ));
    }

    if (opts.shake && typeof shake === 'function') shake(opts.shake);

    return finalDmg;
}
window.applyDamage = applyDamage;

function createDeathBurst(x, y, color) {
    if (particles.length >= MAX_PARTICLES) return;
    const count = 8;
    for (let i = 0; i < count; i++) {
        const p = Particle.acquire(x, y, color); // #20
        const speed = 1.5 + Math.random() * 2.5;
        const angle = (i / count) * Math.PI * 2 + (Math.random() - 0.5) * 0.5;
        p.velocity.x = Math.cos(angle) * speed;
        p.velocity.y = Math.sin(angle) * speed;
        p.life = 0.015 + Math.random() * 0.02;
        particles.push(p);
    }
}

// spawnLevelUpAura moved to Spawner.js (Phase B of #1 split).

// generateArena removed - moved to Arena.js

// checkWallCollision removed - moved to Arena.js

// drawArena removed - moved to Arena.js

let _hudPrevHp = null, _hudPrevXp = null, _hudPrevMeleeReady = null;

// Exposed for `core/drawGameplayPost.js` to call via globalThis.updateUI.
// updateUI itself is renderer-only (DOM access) — server bridge's no-op
// stub for _drawGameplayPost never reaches the leaf module, so this is
// only relevant to browser builds.
function updateUI() {
    document.getElementById('scoreVal').innerText = runState.score;
    document.getElementById('waveVal').innerText = runState.wave;
    document.getElementById('goldVal').innerText = runState.player.gold;

    // Hard Mode Indicator
    const prestige = saveData[runState.player.type].prestige;
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
    const specialPercent = Math.max(0, (runState.player.specialCooldown / runState.player.specialMaxCooldown) * 100);
    document.getElementById('special-cooldown-overlay').style.height = specialPercent + '%';
    // Show Y for gamepad, E for keyboard
    const _specialKeyEl = document.getElementById('special-key');
    if (_specialKeyEl) _specialKeyEl.innerText = runState.player.usingGamepad ? 'Y' : 'E';
    if (runState.player.specialCooldown <= 0) {
        document.getElementById('special-icon').style.opacity = 1;
        document.getElementById('special-container').style.borderColor = '#f1c40f';
    } else {
        document.getElementById('special-icon').style.opacity = 0.5;
        document.getElementById('special-container').style.borderColor = '#555';
    }

    // Update Stats Row
    document.getElementById('stats-row').innerHTML = `
        <span style="color:#e74c3c">⚔️ ${runState.player.damageMultiplier.toFixed(2)}x</span>
        <span style="color:#f1c40f">👟 ${runState.player.speedMultiplier.toFixed(2)}x</span>
        <span style="color:#3498db">⏳ ${runState.player.cooldownMultiplier.toFixed(2)}x</span>
        <span style="color:#9b59b6">💥 ${(runState.player.critChance * 100).toFixed(0)}%</span>
    `;

    const comboEl = document.getElementById('combo-display');
    if (runState.player.combo > 0) {
        const _comboMilestones = [10, 25, 50, 100];
        if (_comboMilestones.includes(runState.player.combo) && runState.player.combo !== _prevCombo) {
            _comboMilestoneTimer = 22;
        }
        _prevCombo = runState.player.combo;

        comboEl.innerText = `COMBO x${runState.player.combo}`;
        comboEl.style.opacity = 1;
        const _baseScale = 1 + Math.min(0.5, player.combo / 100);
        if (_comboMilestoneTimer > 0) {
            const _t = _comboMilestoneTimer / 22;
            const _bounce = 1 + Math.sin(_t * Math.PI) * 0.55;
            comboEl.style.transform = `scale(${_baseScale * _bounce})`;
            comboEl.style.color = `hsl(${45 + _t * 20}, 100%, ${55 + _t * 25}%)`;
            comboEl.style.textShadow = `0 0 ${12 + _t * 30}px rgba(255,220,30,${0.6 + _t * 0.4}), 0 2px 4px rgba(0,0,0,0.7)`;
            _comboMilestoneTimer--;
        } else {
            comboEl.style.transform = `scale(${_baseScale})`;
            comboEl.style.color = '#f1c40f';
            comboEl.style.textShadow = '0 0 24px rgba(241,196,15,0.9), 0 2px 4px rgba(0,0,0,0.7)';
        }
    } else {
        comboEl.style.opacity = 0;
        _prevCombo = 0;
    }

    const hpPercent = Math.max(0, (runState.player.hp / runState.player.maxHp) * 100);
    const displayHp = Math.max(0, Math.ceil(runState.player.hp));
    const hpFill = document.getElementById('health-fill');
    hpFill.style.width = hpPercent + '%';
    document.getElementById('health-text').innerText = displayHp + " / " + runState.player.maxHp;
    const hpWrap = hpFill.parentElement;
    if (_hudPrevHp !== null && runState.player.hp < _hudPrevHp) {
        if (!hpWrap.classList.contains('bar-glow-health')) {
            hpWrap.classList.add('bar-glow-health');
            setTimeout(() => hpWrap.classList.remove('bar-glow-health'), 550);
        }
    }
    // Persistent heartbeat glow when low health
    if (hpPercent < 10) {
        hpWrap.classList.remove('health-critical-slow');
        hpWrap.classList.add('health-critical-fast');
    } else if (hpPercent < 25) {
        hpWrap.classList.remove('health-critical-fast');
        hpWrap.classList.add('health-critical-slow');
    } else {
        hpWrap.classList.remove('health-critical-slow', 'health-critical-fast');
    }
    _hudPrevHp = runState.player.hp;

    const xpPercent = Math.min(100, (runState.player.xp / runState.player.maxXp) * 100);
    const xpFill = document.getElementById('xp-fill');
    xpFill.style.width = xpPercent + '%';
    document.getElementById('xp-text').innerText = "Level " + runState.player.level;
    if (_hudPrevXp !== null && xpPercent > _hudPrevXp) {
        const xpWrap = xpFill.parentElement;
        if (!xpWrap.classList.contains('bar-glow-xp')) {
            xpWrap.classList.add('bar-glow-xp');
            setTimeout(() => xpWrap.classList.remove('bar-glow-xp'), 550);
        }
    }
    _hudPrevXp = xpPercent;

    const meleePercent = Math.max(0, 100 - (runState.player.meleeCooldown / runState.player.meleeMaxCooldown * 100));
    const meleeFill = document.getElementById('melee-fill');
    meleeFill.style.width = meleePercent + '%';
    document.getElementById('melee-text').innerText = runState.player.meleeCooldown <= 0 ? "MELEE READY" : "RECHARGING";
    const meleeReady = runState.player.meleeCooldown <= 0;
    if (_hudPrevMeleeReady === false && meleeReady) {
        const meleeWrap = meleeFill.parentElement;
        if (!meleeWrap.classList.contains('bar-glow-melee')) {
            meleeWrap.classList.add('bar-glow-melee');
            setTimeout(() => meleeWrap.classList.remove('bar-glow-melee'), 550);
        }
    }
    _hudPrevMeleeReady = meleeReady;

    const bossContainer = document.getElementById('boss-hp-container');
    if (runState.bossActive && enemies.length > 0 && enemies[0] instanceof Boss) {
        bossContainer.style.display = 'block';
        const boss = enemies[0];
        const bossHpPercent = Math.max(0, (boss.hp / boss.maxHp) * 100);
        document.getElementById('boss-hp-fill').style.width = bossHpPercent + '%';
    } else {
        bossContainer.style.display = 'none';
    }

    buffContainer.innerHTML = '';
    if (runState.player.buffs.speed > 0) {
        const div = document.createElement('div'); div.className = 'buff-icon';
        div.style.backgroundColor = '#f1c40f'; div.style.color = 'black'; div.innerText = '⚡';
        buffContainer.appendChild(div);
    }
    if (runState.player.buffs.multi > 0) {
        const div = document.createElement('div'); div.className = 'buff-icon';
        div.style.backgroundColor = '#3498db'; div.style.color = 'white'; div.innerText = '⁙';
        buffContainer.appendChild(div);
    }
    if (runState.player.buffs.autoaim > 0) {
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

    // Co-op / AI companion: P2 HUD
    if ((runState.isCoopMode || runState.isAICompanionMode) && runState.player2) {
        const p2hud = document.getElementById('p2-hud');
        if (p2hud) {
            p2hud.style.display = runState.player2.isDead ? 'none' : 'flex';
            if (!runState.player2.isDead) {
                const p2hp = document.getElementById('p2-health-fill');
                if (p2hp) p2hp.style.width = Math.max(0, runState.player2.hp / runState.player2.maxHp * 100) + '%';
                const p2ht = document.getElementById('p2-health-text');
                if (p2ht) p2ht.innerText = Math.ceil(runState.player2.hp) + '/' + runState.player2.maxHp;
                const p2xp = document.getElementById('p2-xp-fill');
                if (p2xp) p2xp.style.width = Math.min(100, runState.player2.xp / runState.player2.maxXp * 100) + '%';
                const p2xt = document.getElementById('p2-xp-text');
                if (p2xt) p2xt.innerText = 'Level ' + runState.player2.level;
                const p2ml = document.getElementById('p2-melee-fill');
                if (p2ml) p2ml.style.width = Math.max(0, 100 - (runState.player2.meleeCooldown / runState.player2.meleeMaxCooldown * 100)) + '%';
                const p2sp = document.getElementById('p2-special-cooldown-overlay');
                if (p2sp) p2sp.style.height = (runState.player2.specialCooldown > 0 ? runState.player2.specialCooldown / runState.player2.specialMaxCooldown * 100 : 0) + '%';
            }
        }
    }
}

function chooseUpgrade(type) {
    // Apply upgrade to whoever triggered the level-up (P1 or P2 in co-op)
    const target = (window.levelingUpPlayer) ? window.levelingUpPlayer : runState.player;

    // Telemetry (#98) — anonymous level_up event. `type` is the upgrade id.
    try {
        window.TelemetryManager?.track('level_up', {
            hero:          target?.type || null,
            wave:          runState.wave,
            upgradePicked: String(type || '').slice(0, 64),
        });
    } catch (_) { /* swallow */ }

    if (type === 'health') {
        target.maxHp += 25;
        target.hp = Math.min(target.maxHp, target.hp + (target.maxHp * 0.2));
        target.runBuffs.maxHp += 25;
    }
    else if (type === 'radius') {
        target.meleeRadius *= 1.25;
    }
    else if (type === 'projectile') {
        if (target.type === 'earth') {
            target.stats.ramDmgMult = (target.stats.ramDmgMult || 1) + 0.2;
            showNotification("RAM DAMAGE INCREASED!");
        } else {
            target.extraProjectiles += 1;
            target.runBuffs.projectiles += 1;
            target.stats.rangeDmg /= 1.2;
        }
    }
    else if (type === 'speed') { target.speedMultiplier += 0.1; target.runBuffs.speed += 0.1; }
    else if (type === 'cooldown') { target.cooldownMultiplier *= 0.9; target.runBuffs.cooldown += 0.1; }
    else if (type === 'defense') { target.damageReduction = Math.min(0.5, target.damageReduction + 0.05); target.runBuffs.defense += 0.05; }
    else if (type === 'damage') { target.damageMultiplier += 0.1; target.runBuffs.damage += 0.1; }
    else if (type === 'luck') { target.maskChance += 0.005; target.runBuffs.luck += 0.005; }
    else if (type === 'crit') { target.critChance += 0.05; target.critMultiplier += 0.2; }
    else if (type === 'transform') {
        const _hl = window.HERO_LOGIC && window.HERO_LOGIC[target.type];
        const _handled = _hl && _hl.applyUpgrade && _hl.applyUpgrade(target, 'transform');
        if (!_handled) {
            target.transformActive = true;
            target.currentForm = target.getFormName();
            showNotification(`${target.currentForm} ACTIVATED!`);
            createExplosion(target.x, target.y, '#fff');
        }
        if (typeof audioManager !== 'undefined') audioManager.playHeroExclamation(target.type, 'ultimate');
    }

    window.levelingUpPlayer = null;
    runState.isLevelingUp = false;
    document.getElementById('levelup-screen').style.display = 'none';

    // Co-op / AI companion: dequeue P2 level-up if pending
    if ((runState.isCoopMode || runState.isAICompanionMode) && p2LevelUpPending && window.player2 && window.levelUpUI) {
        p2LevelUpPending = false;
        runState.isLevelingUp = true;
        window.levelingUpPlayer = window.player2;
        window.levelUpUI.showLevelUp(window.player2, p2LevelUpOptions);
        return;
    }

    _syncSoundBiomeMusic();
    setUIState('GAME');
}

// Called by LevelUpUI after any upgrade is chosen — handles P2 dequeue
window._afterUpgradeChosen = function () {
    window.levelingUpPlayer = null;
    if ((runState.isCoopMode || runState.isAICompanionMode) && p2LevelUpPending && window.player2 && window.levelUpUI) {
        p2LevelUpPending = false;
        runState.isLevelingUp = true;
        window.levelingUpPlayer = window.player2;
        window.levelUpUI.showLevelUp(window.player2, p2LevelUpOptions);
    } else {
        setUIState('GAME');
    }
};

// --- Shop Logic moved to UI/Shop.js ---

// --- Speedrun HUD ---
// Formats elapsed seconds to mm:ss.t. Decisecond precision matches the HUD —
// finer precision adds DOM noise without changing run feel.
function _formatSpeedrunTime(totalSec) {
    if (!isFinite(totalSec) || totalSec < 0) totalSec = 0;
    const m = Math.floor(totalSec / 60);
    const s = Math.floor(totalSec % 60);
    const t = Math.floor((totalSec * 10) % 10);
    return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}.${t}`;
}

let _speedrunSplitToastUntil = 0;

function _showSpeedrunHud(show) {
    const el = document.getElementById('speedrun-hud');
    if (el) el.style.display = show ? '' : 'none';
    if (!show) {
        const toast = document.getElementById('speedrun-split-toast');
        if (toast) { toast.textContent = ''; toast.classList.remove('show'); }
    }
}

function _updateSpeedrunHud() {
    if (!runState.isSpeedrunMode || !runState.gameRunning) return;
    const timerEl = document.getElementById('speedrun-timer');
    if (!timerEl) return;
    const start = (runState.currentRunStats && runState.currentRunStats.startTime) || Date.now();
    const elapsed = (Date.now() - start) / 1000;
    timerEl.textContent = _formatSpeedrunTime(elapsed);

    // Fade the split toast out after its TTL elapses.
    if (_speedrunSplitToastUntil && Date.now() > _speedrunSplitToastUntil) {
        const toast = document.getElementById('speedrun-split-toast');
        if (toast) toast.classList.remove('show');
        _speedrunSplitToastUntil = 0;
    }
}

// Record a split and flash the delta in the HUD. Called from advanceWave for
// every 10-wave boundary, and from _finishStoryEvent for the final win wave.
function _recordSpeedrunSplit(forWave) {
    if (!runState.isSpeedrunMode || !runState.currentRunStats) return;
    const start = runState.currentRunStats.startTime || Date.now();
    const elapsed = (Date.now() - start) / 1000;
    const splits = runState.currentRunStats.splits || (runState.currentRunStats.splits = []);
    const prev = splits.length ? splits[splits.length - 1] : null;
    splits.push({ wave: forWave, timeSec: elapsed });

    const toast = document.getElementById('speedrun-split-toast');
    if (toast) {
        const delta = prev ? (elapsed - prev.timeSec) : elapsed;
        const sign = prev ? '+' : '';
        toast.textContent = `W${forWave} ${sign}${_formatSpeedrunTime(delta)}`;
        toast.classList.add('show');
        _speedrunSplitToastUntil = Date.now() + 2000;
    }
}

// --- Story Logic ---
function triggerStory(completedWave) {
    // Evil Mode has its own story pipeline
    if (runState.isEvilMode && typeof EvilMode !== 'undefined') {
        const nextWave = completedWave + 1;
        const evilStory = EvilMode.getStoryForWave(nextWave);
        if (evilStory) {
            runState.currentStoryEvent = evilStory;
            openStory(evilStory);
        } else {
            runState.currentStoryEvent = null;
            advanceWave();
        }
        return;
    }

    // Check if story mode is enabled or if it's daily/weekly mode
    if ((saveData.story && saveData.story.enabled === false) || runState.isDailyMode || runState.isWeeklyMode) {
        // Skip story
        if (runState.wave % 4 === 0) {
            openShop();
        } else {
            advanceWave();
        }
        return;
    }

    // Maze of Time: intercept for Time/Love hero in story mode.
    // In online mode use the host hero (_onlineStoryHero) so both clients trigger together.
    const _mazeTriggerHero = (runState.isOnlineMode && window._onlineStoryHero)
        ? window._onlineStoryHero : (runState.player && runState.player.type);
    if ((_mazeTriggerHero === 'time' || _mazeTriggerHero === 'love') &&
        window.MazeUI && window.MazeOfTime) {
        // Only the host (or single-player) manages localStorage maze progress
        const _mazeIsHost = !runState.isOnlineMode || window.networkManager?.isHost();
        if (completedWave === 0) {
            window.mazeCurrentNode = null;
            window.mazeCurrentNodeId = null;
            MazeOfTime.clearEnemyPool();
            if (_mazeIsHost) MazeOfTime.initForRun();
        } else if (window.mazeCurrentNodeId) {
            if (_mazeIsHost) MazeOfTime.completeNode(window.mazeCurrentNodeId);
        }

        // Online guest: open read-only map and wait for MAZE_NODE_SELECTED relay
        if (runState.isOnlineMode && !window.networkManager?.isHost()) {
            window.mazeUI.open(_mazeTriggerHero, null, true);
            return;
        }

        // Host / single-player: check for next available nodes
        const _mazeState = MazeOfTime.getState();
        const _mazeNext = MazeOfTime.getNextNodes(_mazeState, _mazeTriggerHero);
        if (_mazeNext.length === 0 && _mazeState.runCompleted.length > 0) {
            // Path complete — let the normal story/wave flow handle the rest
        } else {
            window.mazeUI.open(_mazeTriggerHero);
            return;
        }
    }

    // Pass player type (uppercase) to get specific story events.
    // In online mode the guest runs the host's hero story so both see the same narrative.
    const heroType = (runState.isOnlineGuest && window._onlineStoryHero)
        ? window._onlineStoryHero.toUpperCase()
        : (runState.player ? runState.player.type.toUpperCase() : 'ALL');
    const nextWave = completedWave + 1;
    const story = storyManager.getEventForWave(nextWave, heroType);

    if (story) {
        runState.currentStoryEvent = story; // Store for gameplay logic
        openStory(story);
    } else {
        runState.currentStoryEvent = null;
        advanceWave();
    }
}

let currentStoryAudio = null;

const _STORY_THEMES = {
    all: { rgb: '212,175,55', icon: '✦' },
    fire: { rgb: '231,76,60', icon: '🔥' },
    water: { rgb: '52,152,219', icon: '💧' },
    ice: { rgb: '170,200,218', icon: '❄️' },
    plant: { rgb: '46,204,113', icon: '🌿' },
    metal: { rgb: '149,165,166', icon: '⚙️' },
    earth: { rgb: '141,110,99', icon: '🪨' },
    lightning: { rgb: '241,196,15', icon: '⚡' },
    gravity: { rgb: '155,89,182', icon: '🌀' },
    void: { rgb: '0,188,212', icon: '☯️' },
    spirit: { rgb: '240,208,128', icon: '✨' },
    chance: { rgb: '224,64,251', icon: '🎲' },
    green_goblin: { rgb: '29,138,46', icon: '🎃' },
    makuta: { rgb: '90,20,120', icon: '👁' },
};

function _getStoryArcLabel(wave, hero) {
    const h = (hero || 'ALL').toLowerCase();
    const w = wave || 1;

    // Evil Mode arc labels
    if ((h === 'green_goblin' || h === 'makuta') && typeof EvilMode !== 'undefined') {
        return EvilMode.getArcLabel(w);
    }

    // DLC-injected arc labels (each DLC registers its own hero labels here)
    if (window.STORY_ARC_LABELS && typeof window.STORY_ARC_LABELS[h] === 'function') {
        return window.STORY_ARC_LABELS[h](w);
    }

    // Base game (fire, water, ice, plant, metal, ALL)
    if (w <= 10) return '✦  ARC I  ·  THE AWAKENING  ✦';
    if (w <= 20) return '✦  ARC II  ·  ELEMENTAL MASTERY  ✦';
    if (w <= 30) return '✦  ARC III  ·  THE SHADOW DEEPENS  ✦';
    if (w <= 40) return '✦  ARC IV  ·  THE CORRUPTION  ✦';
    if (w <= 50) return '✦  ARC V  ·  THE INNER CONFLICT  ✦';
    if (w <= 60) return '✦  ARC VI  ·  THE UNITY  ✦';
    if (w <= 70) return '✦  ARC VII  ·  THE MASK\'S POWER  ✦';
    if (w <= 80) return '✦  ARC VIII  ·  THE VOID APPROACHES  ✦';
    if (w <= 90) return '✦  ARC IX  ·  THE MASK REVEALED  ✦';
    return '✦  ARC X  ·  THE FINAL STAND  ✦';
}

function openStory(story) {
    // Speedrun fast-path: skip the modal + audio entirely. Mechanics (boss spawn,
    // companion join, wave overrides, hero swap, THE_END victory, shop/advance)
    // are owned by _finishStoryEvent + the wave generator that runs after.
    if (runState.isSpeedrunMode && story && !story.fromTutorial) {
        runState.currentStoryEvent = story;
        if (saveData.story && Array.isArray(saveData.story.unlockedChapters) &&
            !saveData.story.unlockedChapters.includes(story.id)) {
            saveData.story.unlockedChapters.push(story.id);
            saveGame();
        }
        _finishStoryEvent(story);
        return;
    }

    runState.isStoryOpen = true;
    _onlineLocalContinuedStory  = false;
    _onlinePartnerContinuedStory = false;

    // Apply hero theme
    const heroKey = (story.hero || 'ALL').toLowerCase();
    const theme = (window.STORY_THEME_OVERRIDES && window.STORY_THEME_OVERRIDES[heroKey]) || _STORY_THEMES[heroKey] || _STORY_THEMES.all;
    const screen = document.getElementById('story-screen');
    screen.style.setProperty('--story-rgb', theme.rgb);
    screen.style.display = 'flex';

    // Title background image — per-DLC or base game
    // DLCs can extend this via window.STORY_TITLE_IMAGES (merged here so DLC entries always win)
    window.STORY_TITLE_IMAGES = Object.assign({
        fire: 'images/title.png',
        water: 'images/title.png',
        ice: 'images/title.png',
        plant: 'images/title.png',
        metal: 'images/title.png',
        all: 'images/title.png',
        air: 'dlc/waker_of_winds/images/title.png',
        earth: 'dlc/rise_of_the_rock/images/title.png',
        lightning: 'dlc/tournament_of_thunder/images/title.png',
        gravity: 'dlc/champions_of_chaos/images/title.png',
        void: 'dlc/champions_of_chaos/images/title.png',
        spirit: 'dlc/faith_of_fortune/images/title.png',
        chance: 'dlc/faith_of_fortune/images/title.png',
        sound: 'dlc/symphony_of_sickness/images/title.png',
        poison: 'dlc/symphony_of_sickness/images/title.png',
        green_goblin: 'images/title_evil.png',
        makuta: 'images/title_evil.png',
    }, window.STORY_TITLE_IMAGES || {});
    const bgImgEl = document.getElementById('story-bg-img');
    if (bgImgEl) {
        bgImgEl.onerror = () => { bgImgEl.src = 'images/title.png'; bgImgEl.onerror = null; };
        bgImgEl.src = window.STORY_TITLE_IMAGES[heroKey] || 'images/title.png';
    }

    document.getElementById('story-hero-icon').textContent = theme.icon;
    document.getElementById('story-arc-label').textContent = story.fromTutorial ? '✦  TUTORIAL  ✦' : _getStoryArcLabel(story.wave || 1, story.hero);
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
        continueBtn.textContent = 'CONTINUE →';
        continueBtn.onclick = runState.isOnlineMode ? _onlineLocalStoryContinue : closeStory;
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

    // DLCs can register audio in two ways:
    //   window.STORY_AUDIO_OVERRIDES[storyId] = 'path.mp3'  — per-chapter override
    //   window.STORY_AUDIO_RESOLVERS[heroKey]  = (id) => path  — per-hero path resolver
    // Falls back to base game audio/story/<id>.mp3 if nothing matches.
    const _heroKey = (story.hero || '').toUpperCase();
    let audioPath = `audio/story/${story.id}.mp3`;
    if (window.STORY_AUDIO_OVERRIDES && window.STORY_AUDIO_OVERRIDES[story.id]) {
        audioPath = window.STORY_AUDIO_OVERRIDES[story.id];
    } else if (window.STORY_AUDIO_RESOLVERS && window.STORY_AUDIO_RESOLVERS[_heroKey]) {
        audioPath = window.STORY_AUDIO_RESOLVERS[_heroKey](story.id);
    }
    currentStoryAudio = new Audio(audioPath);
    currentStoryAudio.play().catch(() => { /* ignore missing audio */ });
}

// Post-modal story logic — runs THE_END victory, hero swap, shop/advance. Shared
// by closeStory() (normal modal path) and openStory()'s speedrun fast-path so the
// two paths can't drift.
function _finishStoryEvent(event) {
    // Victory Check: If this was "THE_END", trigger game over (victory)
    if (event && event.type === 'THE_END') {
        // Speedrun: push the final split before gameOver clears the flag so the
        // splits array always ends with the win wave (base 101, DLC 51, etc.).
        if (runState.isSpeedrunMode) {
            const splits = runState.currentRunStats && runState.currentRunStats.splits;
            const lastWave = splits && splits.length ? splits[splits.length - 1].wave : 0;
            if (lastWave !== runState.wave) _recordSpeedrunSplit(runState.wave);
        }
        gameOver(true);
        return;
    }

    // Force Hero Swap to match Narrative (Generic Logic for Chaos/Fortune/etc)
    // Skip in Evil Mode — villain hero is managed exclusively by EvilMode.setupWave()
    if (!runState.isEvilMode && event && event.hero) {
        const requiredHero = event.hero.toLowerCase();
        if (requiredHero !== 'all' && runState.player.type !== requiredHero) {
            changeHeroInGame(requiredHero);
        }
    }

    // Proceed to Shop or Next Wave
    // Special case: If wave is 0 (Intro), always advance to Wave 1
    // Maze node events skip the shop entirely — the maze has its own reward flow
    const _isMazeEvent = event && event.id && event.id.startsWith('maze_');
    if (runState.wave === 0 || runState.isTutorialMode || runState.isEvilMode) {
        advanceWave();
    } else if (!_isMazeEvent && runState.wave % 4 === 0) {
        openShop();
    } else {
        advanceWave();
    }
}

function closeStory() {
    runState.isStoryOpen = false;
    document.getElementById('story-screen').style.display = 'none';

    // Stop Story Audio
    if (currentStoryAudio) {
        currentStoryAudio.pause();
        currentStoryAudio.currentTime = 0;
        currentStoryAudio = null;
    }

    _finishStoryEvent(runState.currentStoryEvent);
}

// ── Online story continue sync ────────────────────────────────────────────────

function _onlineLocalStoryContinue() {
    if (_onlineLocalContinuedStory) return;
    _onlineLocalContinuedStory = true;
    window.networkManager?.storyContinue();
    const btn = document.getElementById('story-continue-btn');
    if (btn) btn.textContent = 'Waiting for partner…';
    if (_onlinePartnerContinuedStory) closeStory();
}

function _onlinePartnerContinueStory() {
    _onlinePartnerContinuedStory = true;
    if (_onlineLocalContinuedStory) {
        closeStory();
    } else {
        const btn = document.getElementById('story-continue-btn');
        if (btn) btn.textContent = 'CONTINUE → (partner ready)';
    }
}

// --- Story Choice Handler ---
window.handleStoryChoice = function (choice) {
    console.log("Story Choice Selected:", choice);
    if (!choice.effect && !choice.outcome) return;

    // This base function can be extended by DLCs (see dlc/index.js or specific dlc init)
};

function changeHeroInGame(newType) {
    if (!runState.player) return;
    const oldHpRatio = runState.player.hp / runState.player.maxHp;
    const oldGold = runState.player.gold;
    const oldStats = runState.player.stats;
    const oldBuffs = runState.player.buffs;

    runState.player = new Player(newType);
    if (window._world) { runState.player._world = window._world; window._world.player = runState.player; }
    runState.player.x = arena.width / 2;
    runState.player.y = arena.height / 2;
    runState.player.gold = oldGold;
    // Preserve HP Ratio
    runState.player.hp = runState.player.maxHp * oldHpRatio;

    // Notify
    createExplosion(runState.player.x, runState.player.y, '#fff');
}

// currentObjective migrated to runState (#11 phase 5).

// Second batch of bidirectional window bindings — declared after the first block.
// Same getter/setter pattern: DLC reads see live values; DLC writes propagate back.
Object.defineProperties(window, {
    isChaosShuffleMode:  { get: () => runState.isChaosShuffleMode,  set: v => { runState.isChaosShuffleMode  = v; }, configurable: true, enumerable: true },
    isDailyMode:         { get: () => runState.isDailyMode,         set: v => { runState.isDailyMode         = v; }, configurable: true, enumerable: true },
    isWeeklyMode:        { get: () => runState.isWeeklyMode,        set: v => { runState.isWeeklyMode        = v; }, configurable: true, enumerable: true },
    currentWeather:      { get: () => runState.currentWeather,      set: v => { runState.currentWeather      = v; }, configurable: true, enumerable: true },
    currentObjective:    { get: () => runState.currentObjective,    set: v => { runState.currentObjective    = v; }, configurable: true, enumerable: true },
    activeMutators:      { get: () => runState.activeMutators,      set: v => { runState.activeMutators      = v; }, configurable: true, enumerable: true },
    // #11 phase 2 — entity arrays now live on runState with stable identity
    // (mutate-in-place via `arr.length = 0` and push/splice). The one-time
    // `window.X = X` exports above bind directly to the runState refs, so
    // defineProperty bridges are no longer needed for these fields.
    //   companions, projectiles, particles, enemies, floatingTexts,
    //   holyMasks, goldDrops — handled by plain `window.X = X` at init.
    waveTimer:           { get: () => waveTimer,           set: v => { waveTimer           = v; }, configurable: true, enumerable: true },
});

function startObjective() {
    runState.currentObjective = {
        type: 'NONE',
        target: 0,
        current: 0,
        state: 'ACTIVE',
        data: {}
    };

    if (runState.player.type === 'fire') {
        runState.currentObjective.type = 'INFERNO';
        runState.currentObjective.target = 30; // 30 seconds
        runState.currentObjective.current = 0;
        showNotification("OBJECTIVE: MAINTAIN COMBO x10!");
    } else if (runState.player.type === 'plant') {
        runState.currentObjective.type = 'DEFENSE';
        runState.currentObjective.data.sapling = {
            x: arena.width / 2,
            y: arena.height / 2,
            hp: 500,
            maxHp: 500,
            radius: 30
        };
        showNotification("OBJECTIVE: PROTECT THE SAPLING!");
    } else if (runState.player.type === 'ice') {
        runState.currentObjective.type = 'EYE_OF_STORM';
        runState.currentObjective.target = 45; // Accumulate 45 seconds inside the eye
        runState.currentObjective.current = 0;
        runState.currentObjective.data.stormEye = {
            x: arena.width / 2,
            y: arena.height / 2,
            radius: 150,
            tx: arena.width / 2,
            ty: arena.height / 2
        };
        showNotification("OBJECTIVE: STAY IN THE EYE OF THE STORM!");
    } else if (runState.player.type === 'water') {
        runState.currentObjective.type = 'UNTOUCHABLE';
        runState.currentObjective.target = 5; // Max 5 hits
        runState.currentObjective.current = 0;
        showNotification("OBJECTIVE: AVOID DAMAGE!");
    } else if (runState.player.type === 'metal') {
        runState.currentObjective.type = 'IRON_WILL';
        runState.currentObjective.target = 60; // Survive 60 seconds
        runState.currentObjective.current = 0;
        showNotification("OBJECTIVE: SURVIVE THE DECAY!");
    }

    // DLC Hook: Start Objective
    if (window.HERO_LOGIC && window.HERO_LOGIC[runState.player.type] && window.HERO_LOGIC[runState.player.type].startObjective) {
        window.HERO_LOGIC[runState.player.type].startObjective(runState.currentObjective);
    }
}

// --- CHAOS MODE 2.0 LOGIC ---
// Moved to ChaosMode.js


function shuffleHero(targetHeroType = null) {
    // 1. Get available heroes
    const availableHeroes = ['fire', 'water', 'ice', 'plant', 'metal'];

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
        nextHero = runState.player.type;
        let attempts = 0;
        while (nextHero === runState.player.type && attempts < 20) {
            nextHero = availableHeroes[Math.floor(Math.random() * availableHeroes.length)];
            attempts++;
        }
    }

    // 3. Store Stats
    const oldStats = {
        hpPercent: runState.player.hp / runState.player.maxHp,
        level: runState.player.level,
        xp: runState.player.xp,
        maxXp: runState.player.maxXp,
        gold: runState.player.gold,
        buffs: structuredClone(runState.player.buffs),       // #17
        runBuffs: structuredClone(runState.player.runBuffs), // #17
        critChance: runState.player.critChance,
        critMultiplier: runState.player.critMultiplier
    };

    // 4. Create New Player
    const newPlayer = new Player(nextHero);
    if (window._world) newPlayer._world = window._world;

    // 5. Restore Position
    newPlayer.x = runState.player.x;
    newPlayer.y = runState.player.y;

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
    runState.player = newPlayer;

    showNotification(`CHAOS SHUFFLE: ${nextHero.toUpperCase()}!`);
    createExplosion(runState.player.x, runState.player.y, '#fff', 20);
    updateUI();
}

function advanceWave() {
    if (runState.isTestingMode) return; // Testing Grounds: no wave progression

    // Telemetry (#98) — fire wave_completed for the wave that was just cleared.
    // Skip the initial transition (wave 0 → 1) since no wave was actually played.
    if (runState.wave > 0) {
        try {
            const startMs = runState.currentRunStats?.startTime || 0;
            window.TelemetryManager?.track('wave_completed', {
                hero:    runState.player?.type || null,
                mode:    runState.isDailyMode ? 'daily' : runState.isWeeklyMode ? 'weekly' : runState.isVersusMode ? 'versus' : runState.isEvilMode ? 'evil' : runState.isSpeedrunMode ? 'speedrun' : runState.isTutorialMode ? 'tutorial' : 'normal',
                biome:   runState.currentBiomeType || null,
                wave:    runState.wave,
                timeSec: startMs ? Math.floor((Date.now() - startMs) / 1000) : null,
            });
        } catch (_) { /* swallow */ }
    }

    _stopWeather(); // Clear any active weather at the start of every new wave

    // No-hit wave tracking for wind_no_hit achievement
    // Uses currentRunStats._noHitBaseline (resets per run) instead of a function property (persists across runs)
    if (runState.player?.type === 'air' && typeof saveData !== 'undefined' && runState.wave > 0) {
        const dmgThisWave = runState.currentRunStats.damageTaken - (runState.currentRunStats._noHitBaseline || 0);
        if (dmgThisWave === 0) {
            saveData.global.no_hit_wind = (saveData.global.no_hit_wind || 0) + 1;
        }
    }
    runState.currentRunStats._noHitBaseline = runState.currentRunStats.damageTaken;

    // Workshop: end game when configured wave count is reached
    if (runState.isWorkshopMode && window.pendingCustomMap?.waveConfig?.waveCount > 0) {
        if (runState.wave >= window.pendingCustomMap.waveConfig.waveCount) {
            gameOver(true);
            return;
        }
    }

    runState.wave++;
    // Speedrun split: a wave is "cleared" the moment advanceWave runs for the
    // next one. Record on every 10-wave boundary; the final win-wave split is
    // pushed by _finishStoryEvent when THE_END fires.
    if (runState.isSpeedrunMode) {
        const justCleared = runState.wave - 1;
        if (justCleared > 0 && justCleared % 10 === 0) {
            _recordSpeedrunSplit(justCleared);
        }
    }
    runState.enemiesKilledInWave = 0;
    masksDroppedInWave = 0; // Reset mask cap
    enemies.length = 0;
    runState.bossActive = false;
    notifyWaveAdvance(runState.wave);

    // Maze of Time: reset per-wave enemy pool
    if (window.MazeOfTime) window.MazeOfTime.clearEnemyPool();

    // Co-op / AI companion: revive dead player at wave start (they died before the final enemy)
    if (runState.isCoopMode || runState.isAICompanionMode) {
        if (runState.player.isDead) {
            runState.player.isDead = false;
            runState.player.hp = Math.floor(runState.player.maxHp * 0.5);
            runState.player.isInvincible = false;
            runState.p1RevivalMarker = null;
            showNotification('P1 revived!');
        }
        if (runState.player2 && runState.player2.isDead) {
            runState.player2.isDead = false;
            runState.player2.hp = Math.floor(runState.player2.maxHp * 0.5);
            runState.player2.isInvincible = false;
            runState.p2RevivalMarker = null;
            showNotification('P2 revived!');
        }
    }

    if (runState.isTutorialMode) TutorialMode.startObjective();

    // CHAOS GAMBLE
    if (runState.isChaosShuffleMode && runState.wave > 1) {
        openChaosGamble(); // Pause & Wait
    } else {
        resumeWaveGeneration();
    }
}

function resumeWaveGeneration() {
    // True Golden Mask Spawn (Wave 90 Narrative Event) - STORY MODE ONLY
    const isStoryMode = (saveData.story && saveData.story.enabled !== false) &&
        !runState.isDailyMode && !runState.isWeeklyMode && !runState.isChaosShuffleMode && !runState.isVersusMode;

    if (isStoryMode && runState.wave === 90) {
        // Spawn in center
        holyMasks.push(new HolyMask(arena.width / 2, arena.height / 2, true));
        showNotification("THE GOLDEN MASK APPEARS!");
        createExplosion(arena.width / 2, arena.height / 2, '#f1c40f');
    }

    if (runState.isChaosShuffleMode && runState.wave > 0) generateChaosObjective();

    // Evil Mode — delegate entirely to EvilMode.setupWave; skip all normal spawning
    if (runState.isEvilMode && typeof EvilMode !== 'undefined') {
        setUIState('GAME'); // Must set before early return — normal path sets it at the end
        EvilMode.setupWave(runState.wave);
        return;
    }

    // Randomize Biome (Skip in Versus Mode) — biome-pool & roll moved to Wave.js.
    if (!runState.isVersusMode && !runState.isWorkshopMode) {
        const isStoryRun = (saveData.story && saveData.story.enabled !== false) && !runState.isDailyMode && !runState.isWeeklyMode;
        const heroType = (runState.player && runState.player.type) || 'fire';
        const types = buildBiomePool(isStoryRun, heroType);

        if (runState.wave === 1 && runState.player && runState.player.type !== 'black') {
            runState.currentBiomeType = (runState.isOnlineMode && window._onlineStoryHero)
                ? window._onlineStoryHero : runState.player.type;
        } else if (runState.currentStoryEvent && runState.currentStoryEvent.data && runState.currentStoryEvent.data.biome) {
            runState.currentBiomeType = runState.currentStoryEvent.data.biome === 'HERO'
                ? runState.player.type : runState.currentStoryEvent.data.biome;
        } else if (runState.isOnlineMode && window._onlineBiomeSeed !== undefined) {
            runState.currentBiomeType = pickSeededBiome(runState.wave, window._onlineBiomeSeed);
        } else {
            runState.currentBiomeType = pickRandomBiome(types);
        }

        showNotification(`BIOME SHIFT: ${runState.currentBiomeType.toUpperCase()}`);
    }

    let layoutOverride = null;
    let trapOverride = null;
    if (runState.currentStoryEvent && runState.currentStoryEvent.data) {
        if (runState.currentStoryEvent.data.layout !== undefined) layoutOverride = runState.currentStoryEvent.data.layout;
        if (runState.currentStoryEvent.data.trap !== undefined) trapOverride = runState.currentStoryEvent.data.trap;
    }

    // --- INSTANT BOSS SPAWN CHECK ---
    let storyBossId = null;

    // Check Chaos Nemesis — chaosState lives on window now (ESM-migrated).
    if (window.chaosState && window.chaosState.nextWaveIsNemesis) {
        storyBossId = window.chaosState.nextWaveIsNemesis;
        window.chaosState.nextWaveIsNemesis = null;
    }

    // Check Story Duel (1v1) - or other custom spawns handled by DLCs
    if (!storyBossId && runState.currentStoryEvent && runState.currentStoryEvent.data && runState.currentStoryEvent.data.spawnEnemy) {
        const enemyId = runState.currentStoryEvent.data.spawnEnemy;
        if (window.customSpawnHandlers && window.customSpawnHandlers[enemyId]) {
            console.log("Starting Custom Spawn:", enemyId);
            window.customSpawnHandlers[enemyId](enemyId);
        } else {
            console.warn("No handler found for custom spawn:", enemyId);
        }
    }

    if (!storyBossId && runState.currentStoryEvent && runState.currentStoryEvent.type === 'BOSS_FIGHT' && runState.currentStoryEvent.data) {
        storyBossId = runState.currentStoryEvent.data.bossId;
    }

    // Default Makuta check (Wave.js helper)
    if (!storyBossId && isStoryBossWave(runState.wave, saveData, { isDailyMode: runState.isDailyMode, isWeeklyMode: runState.isWeeklyMode })) {
        storyBossId = 'MAKUTA';
    }

    if (storyBossId) {
        runState.bossActive = true;
        triggerImpact(9, 22, 0.45, 0.90, 550);
        let pName = storyBossId;
        if (storyBossId === 'MAKUTA') {
            showNotification("MAKUTA HAS AWAKENED!");
            pName = "MAKUTA";
            // Force Shadow Realm Biome for Makuta
            runState.currentBiomeType = 'black';
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
        enemies.unshift(new Boss(storyBossId));
        runState.bossIntroTimer = GAMEPLAY.BOSS_INTRO_FRAMES;
        runState.bossIntroName = pName;
        // #192 — only allow skip if this boss has been seen before on this save.
        // Stamp the flag AFTER reading it so the first encounter always plays full.
        if (!saveData.global.bossesSeen) saveData.global.bossesSeen = {};
        runState.bossIntroSkippable = !!saveData.global.bossesSeen[storyBossId];
        saveData.global.bossesSeen[storyBossId] = true;
        if (typeof audioManager !== 'undefined') {
            // Villain taunts when they spawn as a boss; hero reacts otherwise
            if (storyBossId === 'GREEN_GOBLIN') {
                audioManager.playHeroExclamation('green_goblin', 'boss_moment');
            } else if (storyBossId === 'MAKUTA') {
                audioManager.playHeroExclamation('makuta', 'boss_moment');
            } else if (runState.player) {
                audioManager.playHeroExclamation(runState.player.type, 'boss_moment');
            }
        }
    }

    // Online: temporarily replace Math.random with a seeded PRNG so both clients
    // generate identical arena layouts for the same wave + lobby code.
    let _savedRandom = null;
    if (runState.isOnlineMode && window._onlineBiomeSeed !== undefined) {
        let _ms = ((runState.wave * 2654435761) ^ (window._onlineBiomeSeed * 1664525)) >>> 0;
        _savedRandom = Math.random;
        Math.random = function() {
            _ms = (_ms + 0x6D2B79F5) | 0;
            let _t = Math.imul(_ms ^ (_ms >>> 15), 1 | _ms);
            _t = (_t + Math.imul(_t ^ (_t >>> 7), 61 | _t)) ^ _t;
            return ((_t ^ (_t >>> 14)) >>> 0) / 4294967296;
        };
    }

    if (runState.isWorkshopMode && window.pendingCustomMap) {
        arena.generateFromMap(window.pendingCustomMap);
    } else {
        arena.generate(runState.currentBiomeType, layoutOverride, trapOverride);

        // Versus Mode Override: Force 1v1 Layout if somehow called here
        if (runState.isVersusMode) {
            arena.generate(runState.currentBiomeType, 'VERSUS_1V1');
        }
    }

    if (_savedRandom) Math.random = _savedRandom;

    // Reset Player Position to Center
    if (runState.player) {
        if (runState.isVersusMode) {
            runState.player.x = arena.width / 2 - 800; // Left Spawn
            runState.player.y = arena.height / 2;

            // Update P2 if exists
            if (window.additionalPlayers && window.additionalPlayers[0]) {
                window.additionalPlayers[0].x = arena.width / 2 + 800; // Right Spawn
                window.additionalPlayers[0].y = arena.height / 2;
            }
        } else {
            runState.player.x = arena.width / 2;
            runState.player.y = arena.height / 2;
        }
    }

    // Reset Objective
    runState.currentObjective = null;

    // Check for Objective Wave
    if (runState.currentStoryEvent && runState.currentStoryEvent.type === 'OBJECTIVE_WAVE') {
        startObjective();
    }

    // Story Mode Companion Spawning
    if (runState.currentStoryEvent && runState.currentStoryEvent.type === 'COMPANION_JOIN' && !runState.isCoopMode) {
        const _evData = runState.currentStoryEvent.data;

        if (_evData && _evData.companionType && typeof CompanionAIController !== 'undefined') {
            // DLC story: spawn a full AI-controlled hero as player2
            let compType = _evData.companionType;

            // "AUTO" = base game story, pick a synergy hero
            if (compType === 'AUTO') {
                const synergy = { ice: 'fire', fire: 'ice', metal: 'plant', plant: 'metal', water: 'plant' };
                const allTypes = ['fire', 'water', 'ice', 'plant', 'metal'];
                compType = synergy[runState.player.type] || allTypes.find(t => t !== runState.player.type) || 'fire';
            }

            // Save P1's special icon before Player constructor overwrites #special-icon
            const _p1IconEl = document.getElementById('special-icon');
            const _p1IconTxt = _p1IconEl ? _p1IconEl.innerText : '★';

            runState.player2 = new Player(compType);
            if (window._world) runState.player2._world = window._world;
            runState.player2.controller = new CompanionAIController();

            // Restore P1 icon, write P2 icon to the P2 slot
            const _p2IconEl = document.getElementById('p2-special-icon');
            if (_p2IconEl && _p1IconEl) {
                _p2IconEl.innerText = _p1IconEl.innerText;
                _p1IconEl.innerText = _p1IconTxt;
            }

            runState.player2.x = runState.player.x + 120;
            runState.player2.y = runState.player.y;
            runState.player2.isDead = false;
            runState.p1RevivalMarker = null;
            runState.p2RevivalMarker = null;
            runState.isAICompanionMode = true;
            window.isAICompanionMode = true;

            showNotification(`${compType.toUpperCase()} ALLY JOINED!`);
        } else {
            // Base game story fallback: classic orbiting Companion
            let availableTypes = ['fire', 'water', 'ice', 'plant', 'metal'];
            if (runState.player) availableTypes = availableTypes.filter(t => t !== runState.player.type);
            companions.forEach(c => { availableTypes = availableTypes.filter(t => t !== c.type); });

            if (availableTypes.length > 0) {
                let pickedType = availableTypes[0];
                if (companions.length === 0) {
                    if (runState.player.type === 'ice' && availableTypes.includes('fire')) pickedType = 'fire';
                    else if (runState.player.type === 'fire' && availableTypes.includes('ice')) pickedType = 'ice';
                    else if (runState.player.type === 'metal' && availableTypes.includes('plant')) pickedType = 'plant';
                    else if (runState.player.type === 'plant' && availableTypes.includes('metal')) pickedType = 'metal';
                    else if (runState.player.type === 'water' && availableTypes.includes('plant')) pickedType = 'plant';
                }
                companions.push(new Companion(pickedType, runState.player));
                showNotification(`${pickedType.toUpperCase()} FRIEND JOINED!`);
            }
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
            if (typeof audioManager !== 'undefined') audioManager.play('achievement_unlocked');
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
    el.querySelector('.ach-notif-desc').textContent = ach.desc;
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
    if (runState.wave > saveData.global.maxWave) saveData.global.maxWave = runState.wave;
    if (runState.currentRunStats.maxCombo > (saveData.global.maxCombo || 0)) saveData.global.maxCombo = runState.currentRunStats.maxCombo;

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
                if (typeof audioManager !== 'undefined') audioManager.play('achievement_unlocked');
                showAchievementNotif(ach);
                saveGame();
            }
        }
    });
}

// --- Main Loop ---

// --- Main Loop ---

async function startGame(mode = 'NORMAL') {
    // #194 follow-up — block on DLC load before any arena.generate runs.
    // The hover-prefetch in UI/MainMenu.js fires `ensureDLCLoaded()` as a
    // fire-and-forget promise, but if the player clicks Start before the
    // chunk finishes downloading, `window.BIOME_LOGIC[hero]` is undefined
    // when Arena.generate consults the registry — DLC biomes silently fall
    // through to Arena's default obstacle layout (the "fallback obstacles"
    // bug reported for Thorn / Gravity). Awaiting the shared promise here
    // costs nothing on warm hits and bounds first-launch UX to the actual
    // download time.
    const hero = window.selectedHeroType;
    const owner = hero && window.dlcManager?.getHeroOwnerDLC?.(hero);
    if (owner) {
        try { await window.dlcManager.ensureDLCLoaded(owner); }
        catch (e) { console.warn('[startGame] DLC ensure failed for', owner, e); }
    }

    // Initialize Arena (3000x3000)
    arena = new Arena(3000, 3000);
    window.arena = arena; // Expose to window for DLCs

    runState.isChaosShuffleMode = (mode === 'SHUFFLE');
    runState.isVersusMode = (mode === 'VERSUS');
    runState.isTutorialMode = (mode === 'TUTORIAL');
    runState.isEvilMode = (mode === 'EVIL');
    runState.isWorkshopMode = (mode === 'WORKSHOP');
    // Clear custom map state on any non-workshop start so stale data never leaks in
    if (!runState.isWorkshopMode) { window.pendingCustomMap = null; window.currentCustomMapId = null; }
    window._customEnemiesPerWave = (runState.isWorkshopMode && window.pendingCustomMap?.waveConfig?.enemiesPerWave)
        ? window.pendingCustomMap.waveConfig.enemiesPerWave : null;
    // Speedrun flag is owned by startSpeedrunGame() (set before this runs).
    // Defend against stale state from a prior run: clear it for any non-SPEEDRUN
    // entry path and force solo when SPEEDRUN.
    if (mode !== 'SPEEDRUN') {
        runState.isSpeedrunMode = false;
        window.isSpeedrunMode = false;
    } else {
        runState.isCoopMode = false;
        window.isCoopMode = false;
    }

    // Seeded RNG for daily/weekly so opt-in callers (mutator-specific rolls,
    // future arena/drop wiring) yield identical results for every player on the
    // same seed. Cleared in gameOver() / new run start.
    if (mode === 'DAILY')      initSeededRng(getDailySeed());
    else if (mode === 'WEEKLY') initSeededRng(getWeeklySeed());
    else                        clearSeededRng();
    if (runState.isEvilMode && typeof EvilMode !== 'undefined') EvilMode.start();

    // Always reset the chaos HUD so "CHALLENGE FAILED" text from a previous run never bleeds in
    const _chaosHud = document.getElementById('chaos-challenge-hud');
    if (_chaosHud) { _chaosHud.style.display = 'none'; _chaosHud.innerHTML = ''; }

    // Handle Versus Biome Selection
    if (runState.isVersusMode && window.selectedBiome) {
        if (window.selectedBiome === 'random') {
            const biomes = ['fire', 'water', 'ice', 'plant', 'metal', 'rock', 'cloud', 'chaos'];
            runState.currentBiomeType = biomes[Math.floor(Math.random() * biomes.length)];
        } else {
            runState.currentBiomeType = window.selectedBiome;
        }
        console.log("Versus Biome:", runState.currentBiomeType);
    } else {
        runState.currentBiomeType = selectedHeroType; // Default (Campaign)
        if (runState.currentBiomeType === 'black') runState.currentBiomeType = 'chaos';
    }

    // Evil Mode: force Green Goblin as starting hero
    if (runState.isEvilMode) {
        runState.currentBiomeType = 'fire'; // wave 1 biome; EvilMode.setupWave will override per wave
    }

    // Workshop Mode: apply custom map data and override biome
    if (runState.isWorkshopMode && window.pendingCustomMap) {
        arena.generateFromMap(window.pendingCustomMap);
        runState.currentBiomeType = window.pendingCustomMap.biomeType || runState.currentBiomeType;
    }

    // Check for Shadow Form Mutator BEFORE creating player
    let heroType = selectedHeroType;
    if ((mode === 'DAILY' || mode === 'WEEKLY') && runState.activeMutators.some(m => m.id === 'SHADOW_FORM')) {
        heroType = 'black';
        // In co-op, P2 also plays as black
        if (runState.isCoopMode) {
            coopP2HeroType = 'black';
            window.coopP2HeroType = 'black';
        }
    }

    // In Shuffle Mode, start with random non-black hero? Or selected? 
    // "Shuffles the current hero... Result in shuffling the 5 main game heroes... and DLC"
    // Let's start with the selected hero, then shuffle next wave.

    if (runState.isEvilMode) heroType = 'green_goblin';
    runState.player = new Player(heroType);
    // Center Player in Arena
    runState.player.x = arena.width / 2;
    runState.player.y = arena.height / 2;

    // Eternal Hunter bonus — applied if all Formidable Foes on the Hunting List have been defeated
    try {
        const hunterData = JSON.parse(localStorage.getItem('maze_hunter_complete') || '{}');
        if (hunterData.complete) {
            runState.player.damageMultiplier = (runState.player.damageMultiplier || 1) * 1.15;
            runState.player.speedMultiplier = (runState.player.speedMultiplier || 1) * 1.10;
            runState.player.damageReduction = Math.min(0.5, (runState.player.damageReduction || 0) + 0.05);
            if (!runState.player.isCPU) showNotification("🏆 ETERNAL HUNTER: All Foes slain — permanent buff active!");
        }
    } catch (e) { /* ignore */ }

    // --- VERSUS MODE SETUP ---
    // Clear old AI / Additional Players from previous runs
    if (typeof window.additionalPlayers !== 'undefined') window.additionalPlayers = [];

    if (runState.isVersusMode) {
        if (window.is2PlayerVersus) {
            // 2P Human vs Human: activate co-op so the block below spawns P2 with gamepad.
            window.is2PlayerVersus = false;
            runState.isCoopMode = true;
            window.isCoopMode = true;
            waveTimer = 999999;
            const p2Hero = (coopP2HeroType || 'water').toUpperCase();
            showNotification(`2P VERSUS: ${heroType.toUpperCase()} VS ${p2Hero}`);
        } else {
            // CPU Opponent
            const oppHero = window.selectedOpponent || 'random';

            console.log("Spawning Versus AI:", oppHero);
            const p2 = new Player(oppHero, true); // true = isCPU
            if (window._world) p2._world = window._world;
            p2.controller = new AIController(runState.player);
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
    }

    if (runState.isCoopMode && (CoopGamepadController || runState.isOnlineMode)) {
        if (!runState.isOnlineMode) {
            // Local co-op: P1 uses dedicated gamepad
            runState.player.controller = new CoopGamepadController(coopP1GamepadIndex);
        }

        // Save P1's special icon before P2's constructor overwrites #special-icon
        const _p1IconEl = document.getElementById('special-icon');
        const _p1IconTxt = _p1IconEl ? _p1IconEl.innerText : '★';

        runState.player2 = new Player(coopP2HeroType || 'water');
        if (window._world) { window._world.player2 = runState.player2; runState.player2._world = window._world; }

        if (runState.isOnlineMode) {
            // P2 is a ghost — no controller, positions come from server snapshots
            runState.player2.controller = null;
            runState.player2._ghost = true;
            // Wrap local controller to forward inputs to server
            if (runState.player.controller) {
                runState.player.controller = new RecordingInputController(runState.player.controller);
            }
        } else {
            runState.player2.controller = new CoopGamepadController(coopP2GamepadIndex);
        }

        // P2's constructor wrote its icon to #special-icon — move it to #p2-special-icon, restore P1's
        const _p2IconEl = document.getElementById('p2-special-icon');
        if (_p2IconEl && _p1IconEl) {
            _p2IconEl.innerText = _p1IconEl.innerText;
            _p1IconEl.innerText = _p1IconTxt;
        }

        runState.player2.x = runState.isVersusMode ? arena.width / 2 + 800 : arena.width / 2 + 100;
        runState.player2.y = arena.height / 2;
        runState.player2.isDead = false;
        runState.p1RevivalMarker = null;
        runState.p2RevivalMarker = null;
    }

    runState.score = 0;
    runState.wave = 0; // Start at 0, advanceWave will increment to 1
    runState.enemiesKilledInWave = 0;
    masksDroppedInWave = 0; // Cap mask drops
    runState.bossActive = false;
    runState.isPlayerDying = false;
    runState.bossDeathTimer = 0;
    runState.bossIntroTimer = 0; runState.bossIntroName = ''; runState.bossIntroSkippable = false;
    runState._bossChoiceScreen = false;
    runState._bossChoiceFrame = 0;
    enemies.length = 0;
    projectiles.length = 0;
    particles.length = 0;
    floatingTexts.length = 0;
    meleeAttacks.length = 0;
    clearPowerUps(runState);
    holyMasks.length = 0;
    goldDrops.length = 0;
    clearCardDrops(runState);
    memoryShards.length = 0;
    companions.length = 0;
    runState.isPlayerDying = false;
    runState.playerDeathTimer = 0;
    forcedEnemyType = null;
    runState.currentObjective = null; // Reset Objective
    runState.currentStoryEvent = null; // Reset Story Event to prevent leaks
    runState.gameRunning = true;
    runState.gamePaused = false;
    runState.isLevelingUp = false;
    runState.isShopping = false;
    _stopWeather();

    // Reset Stats — shape lives in RunState.js.
    runState.currentRunStats = createRunStats({ startTime: Date.now() });

    // ── World context (Phase 1 bridge) ────────────────────────────────────────
    // Create a fresh World for this run and point its arrays at the same objects
    // created above so that entity pushes are visible to both old global-reading
    // code and new this._world-reading code simultaneously.
    if (typeof World !== 'undefined') {
        window._world = World.createClientWorld();
        const _w = window._world;
        _w.enemies       = enemies;
        _w.projectiles   = projectiles;
        _w.particles     = particles;
        _w.floatingTexts = floatingTexts;
        _w.meleeAttacks  = meleeAttacks;
        // powerUps now ECS — runState.powerUp* typed arrays, no _world mirror.
        _w.holyMasks     = holyMasks;
        _w.goldDrops     = goldDrops;
        // cardDrops now ECS — runState.cardDrop* typed arrays, no _world mirror.
        _w.memoryShards  = memoryShards;
        _w.companions    = companions;
        _w.saveData        = saveData;
        _w.currentRunStats = runState.currentRunStats;
        _w.gameRunning  = true;
        _w.gamePaused   = false;
        _w.isLevelingUp = false;
        _w.isShopping   = false;
        _w.isCoopMode        = runState.isCoopMode;
        _w.isAICompanionMode = runState.isAICompanionMode;
        _w.isEvilMode        = runState.isEvilMode;
        _w.isVersusMode      = runState.isVersusMode;
        _w.isOnlineMode      = runState.isOnlineMode;
        _w.isOnlineGuest     = runState.isOnlineGuest;
        _w.arena  = arena;    // created before array resets above
        _w.player = runState.player;   // created before array resets above
        // player2 is set later in this function (co-op branch); synced there
        runState.player._world = _w;

        // ── Phase 5: complete world state ────────────────────────────────────
        _w.frame            = runState.frame;
        _w.wave             = runState.wave;
        _w.score            = runState.score;
        _w.currentWeather   = runState.currentWeather;
        _w.currentObjective = runState.currentObjective;
        _w.bossActive       = runState.bossActive;
        _w.createExplosion  = createExplosion;
        _w.showNotification = showNotification;
        if (typeof audioManager !== 'undefined') _w.audioManager = audioManager;
        _w.HERO_LOGIC    = window.HERO_LOGIC  || {};
        _w.ENEMY_LOGIC   = window.ENEMY_LOGIC || {};
        if (typeof window.getDecoyTarget === 'function') _w.getDecoyTarget = window.getDecoyTarget;
    }

    // Hide Menus
    if (typeof MenuBackground !== 'undefined') MenuBackground.stop();
    document.getElementById('menu-overlay').style.display = 'none';
    document.getElementById('start-screen').style.display = 'none';
    document.getElementById('game-over-screen').style.display = 'none';
    document.getElementById('victory-screen').style.display = 'none';
    document.getElementById('pause-screen').style.display = 'none';
    document.getElementById('levelup-screen').style.display = 'none';
    document.getElementById('shop-screen').style.display = 'none';

    // Mode Handling
    if (mode === 'NORMAL') {
        runState.isDailyMode = false;
        runState.isWeeklyMode = false;
        runState.activeMutators = [];

        // Trigger Story Intro if enabled
        if (saveData.story && saveData.story.enabled) {
            triggerStory(0);
            return;
        }
    }

    if (mode === 'TUTORIAL') {
        runState.isDailyMode = false;
        runState.isWeeklyMode = false;
        runState.activeMutators = [];
        TutorialMode.init();
        return;
    }
    if (mode === 'EVIL') {
        // Show wave 1 narration before the first wave starts
        triggerStory(0);
        return;
    }

    if (mode === 'TESTING') {
        runState.isDailyMode = false;
        runState.isWeeklyMode = false;
        runState.activeMutators = [];
        runState.wave = 1;
        runState.currentBiomeType = selectedHeroType === 'black' ? 'chaos' : selectedHeroType;
        arena.generate(runState.currentBiomeType);
        runState.player.x = arena.width / 2;
        runState.player.y = arena.height / 2;
        setUIState('GAME');
        TestingGrounds.init();
        return;
    }
    // Daily/Weekly mode is set in startDailyChallenge/startWeeklyChallenge

    // Apply Mutators (Initial)
    if (runState.isDailyMode || runState.isWeeklyMode) {
        if (runState.activeMutators.some(m => m.id === 'FRAGILE')) {
            runState.player.maxHp = 1;
            runState.player.hp = 1;
            runState.player.damageMultiplier *= 5;
        }
        if (runState.activeMutators.some(m => m.id === 'SLUG')) {
            runState.player.speedMultiplier *= 0.5;
            runState.player.damageMultiplier += 2; // +200%
        }
        if (runState.activeMutators.some(m => m.id === 'ONE_TYPE')) {
            // Deterministic selection based on seed
            const seed = runState.isWeeklyMode ? getWeeklySeed() : getDailySeed();
            const rand = Math.sin(seed + 999) * 10000;
            const index = Math.floor((rand - Math.floor(rand)) * ENEMY_TYPES.length);
            forcedEnemyType = ENEMY_TYPES[index];
            showNotification(`MUTATOR: ONLY ${forcedEnemyType} ENEMIES!`);
        } else {
            forcedEnemyType = null;
        }
    }

    // Telemetry (#98) — anonymous run_start event (opt-in, gated by TelemetryManager).
    try {
        window.TelemetryManager?.track('run_start', {
            hero:      runState.player?.type || window.selectedHeroType || null,
            mode:      String(mode || 'NORMAL').toLowerCase(),
            biome:     runState.currentBiomeType || null,
            dailySeed: runState.isDailyMode ? getDailySeed() : (runState.isWeeklyMode ? getWeeklySeed() : null),
        });
    } catch (_) { /* never let telemetry break a run start */ }

    // Start Wave 1
    advanceWave();
}

function gameOver(isVictory = false) {
    // Capture before any resets so the Play Again button can reference it
    const wasEvilMode   = runState.isEvilMode;
    const wasVersusMode = runState.isVersusMode;
    const wasOnlineMode = runState.isOnlineMode;

    // Telemetry (#98) — anonymous run_end event. Fire before resets so we
    // still have hero / mode / wave / damage source intact. Flush right after
    // so the event survives an immediate menu return.
    try {
        const startMs = runState.currentRunStats?.startTime || 0;
        const totalTimeSec = startMs ? Math.floor((Date.now() - startMs) / 1000) : 0;
        window.TelemetryManager?.track('run_end', {
            hero:        runState.player?.type || null,
            mode:        runState.isDailyMode ? 'daily' : runState.isWeeklyMode ? 'weekly' : wasVersusMode ? 'versus' : wasEvilMode ? 'evil' : runState.isSpeedrunMode ? 'speedrun' : runState.isTutorialMode ? 'tutorial' : 'normal',
            biome:       runState.currentBiomeType || null,
            outcome:     isVictory ? 'win' : 'death',
            wave:        runState.wave,
            timeSec:     totalTimeSec,
            deathSource: (!isVictory && runState.player && runState.player._lastDamageSource) ? String(runState.player._lastDamageSource.label).slice(0, 64) : null,
        });
        window.TelemetryManager?.flush(false);
    } catch (_) { /* swallow */ }

    // #168 — surface "Defeated by X (Y dmg)" on the game-over screen unless we
    // won. Reads `player._lastDamageSource` set by recordPlayerDamage at every
    // tagged damage site. Cleared on victory.
    const _causeEl = document.getElementById('go-death-cause');
    if (_causeEl) {
        if (isVictory) {
            _causeEl.textContent = '';
        } else {
            const src = runState.player && runState.player._lastDamageSource;
            _causeEl.textContent = src
                ? `Defeated by ${src.label} — ${src.dmg} dmg`
                : '';
        }
    }

    // Stop any active weather immediately
    _stopWeather();

    // Evil Mode — unlock achievement on first clear
    if (runState.isEvilMode && isVictory) {
        if (saveData.global) saveData.global.evil_mode_beaten = (saveData.global.evil_mode_beaten || 0) + 1;
        unlockAchievement('EVIL_MODE_BEATEN');
    }
    if (typeof EvilMode !== 'undefined') EvilMode.stop();
    runState.isEvilMode = false;

    runState.gameRunning = false;
    runState.isTutorialMode = false;
    runState.isTestingMode = false;
    const wasSpeedrunMode = runState.isSpeedrunMode;
    if (wasSpeedrunMode) _showSpeedrunHud(false);
    runState.isSpeedrunMode = false;
    window.isSpeedrunMode = false;
    runState.isCoopMode = false;
    window.isCoopMode = false;
    runState.isAICompanionMode = false;
    window.isAICompanionMode = false;
    coopP2HeroType = null;
    window.coopP2HeroType = null;
    coopP2HeroLocked = false;
    coopP1GamepadIndex = -1;
    coopP2GamepadIndex = -1;
    runState.player2 = null;
    runState.p1RevivalMarker = null;
    runState.p2RevivalMarker = null;
    runState.coopZoom = 1.0;
    p2LevelUpPending = false;
    const _p2hudEl = document.getElementById('p2-hud');
    if (_p2hudEl) _p2hudEl.style.display = 'none';
    if (runState.isOnlineMode) {
        // signal(false) = natural game end; lobby stays alive for RETURN_TO_LOBBY
        window.networkManager?.signalGameOver(false);
        ['online-reconnect-overlay', 'online-partner-leveling-overlay', 'online-wait-overlay', 'online-name-bar'].forEach(id => {
            const el = document.getElementById(id);
            if (el) el.style.display = 'none';
        });
        _onlineCleanup();
    }

    // Clear Saved Run on Death
    clearSavedRun();

    // Safety: Ensure stats object exists
    if (!saveData.stats) saveData.stats = {};

    // --- NEW STATS TRACKING ---
    // 1. Total Time Played
    const sessionTimeSec = Math.floor((Date.now() - (runState.currentRunStats.startTime || Date.now())) / 1000);
    if (!saveData.global.totalTimePlayed) saveData.global.totalTimePlayed = 0;
    saveData.global.totalTimePlayed += sessionTimeSec;

    // 2. Hero Pick Counts
    if (!saveData.global.heroRuns) saveData.global.heroRuns = {};
    const hType = runState.player.type;
    saveData.global.heroRuns[hType] = (saveData.global.heroRuns[hType] || 0) + 1;

    // Track Games and Deaths
    saveData.global.totalGames = (saveData.global.totalGames || 0) + 1;
    if (!isVictory) {
        saveData.global.totalDeaths = (saveData.global.totalDeaths || 0) + 1;
    } else {
        // Victory! Track max prestige win
        const currentP = saveData[runState.player.type].prestige || 0;

        // SPECIAL: Faith of Fortune Shared Prestige
        // If finishing the Fortune story, count it for both Spirit and Chance
        if (runState.currentStoryEvent && runState.currentStoryEvent.id && runState.currentStoryEvent.id.startsWith('fortune_')) {
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
        if (runState.currentStoryEvent && runState.currentStoryEvent.id && runState.currentStoryEvent.id.startsWith('chaos_')) {
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
        const recorded = saveData[runState.player.type].maxWinPrestige ?? -1;
        if (currentP > recorded) {
            saveData[runState.player.type].maxWinPrestige = currentP;
        }
    }

    // DLC story completion achievements (fires on any victory in story mode at wave ≥ 50)
    if (isVictory && runState.player && runState.wave >= 50) {
        const isStoryRun = (saveData.story && saveData.story.enabled !== false) &&
            !runState.isDailyMode && !runState.isWeeklyMode && !runState.isChaosShuffleMode && !runState.isVersusMode;
        if (isStoryRun) {
            const dlcStoryMap = {
                earth: 'rock_story', lightning: 'thunder_story',
                air: 'wind_story', gravity: 'chaos_gravity_story', void: 'chaos_void_story',
                spirit: 'faith_spirit_story', chance: 'faith_chance_story',
                sound: 'sickness_sound_story', poison: 'sickness_poison_story',
                time: 'echo_time_story', love: 'echo_love_story'
            };
            const achId = dlcStoryMap[runState.player.type];
            if (achId) unlockAchievement(achId);

            // Mark Speedrun unlock per hero.
            // Base game story (fire/water/ice/plant/metal) is shared — finishing
            // with any one unlocks all five. Chaos and Fortune DLCs already share
            // prestige across paired heroes; mirror that for Speedrun unlock.
            const BASE_HEROES = ['fire', 'water', 'ice', 'plant', 'metal'];
            const flipStoryCompleted = (h) => {
                if (!saveData[h]) saveData[h] = { level: 0, unlocked: 0, highScore: 0, prestige: 0 };
                saveData[h].storyCompleted = true;
            };
            if (BASE_HEROES.includes(runState.player.type)) {
                BASE_HEROES.forEach(flipStoryCompleted);
            } else {
                flipStoryCompleted(runState.player.type);
                if (runState.currentStoryEvent && runState.currentStoryEvent.id) {
                    if (runState.currentStoryEvent.id.startsWith('chaos_')) {
                        flipStoryCompleted('gravity');
                        flipStoryCompleted('void');
                    } else if (runState.currentStoryEvent.id.startsWith('fortune_')) {
                        flipStoryCompleted('spirit');
                        flipStoryCompleted('chance');
                    }
                }
            }
        }
    }

    // Online co-op stat tracking
    if (runState.isOnlineMode) {
        saveData.global.onlineGamesPlayed = (saveData.global.onlineGamesPlayed || 0) + 1;
        if (runState.wave > (saveData.global.onlineMaxWave || 0)) saveData.global.onlineMaxWave = runState.wave;
    }

    // ── Speedrun: best-time persistence + leaderboard submit ──────────────────
    // Fires only on a successful speedrun victory (THE_END reached). Shared with
    // Chaos/Fortune partner heroes to mirror existing prestige-share semantics.
    if (wasSpeedrunMode && isVictory && runState.player) {
        const finalTimeSec = Math.floor((Date.now() - (runState.currentRunStats.startTime || Date.now())) / 1000);
        const updatePB = (h) => {
            if (!saveData[h]) saveData[h] = { level: 0, unlocked: 0, highScore: 0, prestige: 0 };
            const prev = saveData[h].bestSpeedrunSec;
            if (prev == null || finalTimeSec < prev) {
                saveData[h].bestSpeedrunSec = finalTimeSec;
            }
        };
        const BASE_HEROES = ['fire', 'water', 'ice', 'plant', 'metal'];
        if (BASE_HEROES.includes(runState.player.type)) {
            BASE_HEROES.forEach(updatePB);
        } else {
            updatePB(runState.player.type);
            if (runState.currentStoryEvent && runState.currentStoryEvent.id) {
                if (runState.currentStoryEvent.id.startsWith('chaos_')) {
                    updatePB('gravity'); updatePB('void');
                } else if (runState.currentStoryEvent.id.startsWith('fortune_')) {
                    updatePB('spirit'); updatePB('chance');
                }
            }
        }

        // Server submission — auth-only, fire-and-forget. Server clamps and
        // validates via `speedrunPlausibilityReject` (see anticheat.js).
        const _srToken = window.gameConfig?.account?.token;
        const _srUrl   = (typeof CloudSaveManager !== 'undefined') ? CloudSaveManager._baseUrl() : null;
        if (_srToken && _srUrl) {
            const _srSession = window.networkManager?._gameSessionToken || null;
            fetch(`${_srUrl}/api/speedrun`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${_srToken}` },
                body: JSON.stringify({
                    hero: runState.player.type,
                    timeSec: finalTimeSec,
                    finalWave: runState.wave,
                    splits: (runState.currentRunStats && runState.currentRunStats.splits) || [],
                    sessionToken: _srSession,
                }),
            }).catch(() => {});
        }
    }

    checkAchievements();

    // Save run history (last 5 runs) for Museum run-history wall
    if (!saveData.global.runHistory) saveData.global.runHistory = [];
    const _rhTimeSec = Math.floor((Date.now() - (runState.currentRunStats.startTime || Date.now())) / 1000);
    const _rhMode = runState.isDailyMode ? 'daily'
        : runState.isWeeklyMode ? 'weekly'
            : runState.isVersusMode && runState.isCoopMode ? '2p_versus'
                : runState.isVersusMode ? 'versus'
                    : runState.isChaosShuffleMode ? 'shuffle'
                        : runState.isTutorialMode ? 'tutorial'
                            : runState.isEvilMode ? 'evil'
                                : (saveData.story && saveData.story.enabled) ? 'story'
                                    : 'standard';
    // Submit to global leaderboard when playing online
    if (runState.isOnlineMode) {
        const _lbToken = window.gameConfig?.account?.token;
        const _lbUrl   = (typeof CloudSaveManager !== 'undefined') ? CloudSaveManager._baseUrl() : null;
        if (_lbToken && _lbUrl) {
            const _sessionToken = window.networkManager?._gameSessionToken || null;
            // Tag daily/weekly runs with their seed so the server can build
            // per-seed leaderboards (same-day scoreboard).
            const _seed = runState.isDailyMode ? getDailySeed()
                : runState.isWeeklyMode ? getWeeklySeed()
                    : null;
            fetch(`${_lbUrl}/api/leaderboard`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${_lbToken}` },
                body: JSON.stringify({
                    hero: runState.player.type, mode: _rhMode, wave: Math.max(0, runState.wave - 1),
                    score: runState.score, outcome: isVictory ? 'victory' : 'death',
                    timeSec: _rhTimeSec,
                    sessionToken: _sessionToken, // anti-cheat: server clamps to authoritative state
                    dailySeed: _seed,            // null for non-seeded modes
                }),
            }).catch(() => {}); // fire-and-forget
        }
    }

    // Submit score for community map run
    const _customMapId = window.currentCustomMapId;
    if (_customMapId) {
        const _lbToken = window.gameConfig?.account?.token;
        const _lbUrl   = (typeof CloudSaveManager !== 'undefined') ? CloudSaveManager._baseUrl() : null;
        if (_lbToken && _lbUrl) {
            fetch(`${_lbUrl}/api/maps/${_customMapId}/score`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${_lbToken}` },
                body: JSON.stringify({
                    hero: runState.player.type,
                    wave: Math.max(0, runState.wave - 1),
                    score: Math.floor(runState.score),
                    timeSec: _rhTimeSec,
                }),
            }).catch(() => {});
        }
        window.currentCustomMapId = null;
        window.pendingCustomMap   = null;
    }

    saveData.global.runHistory.unshift({
        hero: runState.player.type,
        mode: _rhMode,
        online: !!runState.isOnlineMode,
        wave: Math.max(0, runState.wave - 1),
        score: runState.score,
        outcome: isVictory ? 'victory' : 'death',
        enemiesKilled: runState.currentRunStats.enemiesKilled || 0,
        damageDealt: Math.floor(runState.currentRunStats.damageDealt || 0),
        maxCombo: runState.currentRunStats.maxCombo || 0,
        timeSec: _rhTimeSec
    });
    if (saveData.global.runHistory.length > 5) saveData.global.runHistory.length = 5;

    document.getElementById('menu-overlay').style.display = 'flex';

    // Show the correct screen
    const screenId = isVictory ? 'victory-screen' : 'game-over-screen';
    const screen = document.getElementById(screenId);
    if (screen) screen.style.display = 'flex';

    // Update Game Over title (victory screen has it baked into HTML)
    if (!isVictory) {
        const titleEl = document.getElementById('go-title');
        if (titleEl) {
            titleEl.innerText = "GAME OVER";
            titleEl.style.color = "#e74c3c";
        }
    }

    // 1. Header & Score
    const pfx = isVictory ? 'vc' : 'go';
    const heroData = saveData[runState.player.type];
    const isHighScore = runState.score > heroData.highScore;
    if (isHighScore) heroData.highScore = runState.score;

    document.getElementById(`${pfx}-score-val`).innerText = runState.score.toLocaleString();
    document.getElementById(`${pfx}-highscore-msg`).style.display = isHighScore ? 'block' : 'none';

    // 2. Prepare Stats Data
    const timeSurvivedMs = Date.now() - (runState.currentRunStats.startTime || Date.now());
    const timeSurvivedSec = Math.floor(timeSurvivedMs / 1000);
    const fmtTime = s => `${Math.floor(s / 60)}:${(s % 60).toString().padStart(2, '0')}`;

    const runStatsList = [
        { label: "Time Survived", val: fmtTime(timeSurvivedSec), key: 'timeSurvived', raw: timeSurvivedSec },
        { label: "Waves Cleared", val: runState.wave - 1, key: 'wavesCleared', raw: runState.wave - 1 },
        { label: "Level Reached", val: runState.player.level, key: 'levelReached', raw: runState.player.level },
        { label: "Enemies Killed", val: runState.currentRunStats.enemiesKilled, key: 'enemiesKilled', raw: runState.currentRunStats.enemiesKilled },
        { label: "Damage Dealt", val: Math.floor(runState.currentRunStats.damageDealt).toLocaleString(), key: 'damageDealt', raw: runState.currentRunStats.damageDealt },
        { label: "Gold Gained", val: runState.currentRunStats.moneyGained, key: 'moneyGained', raw: runState.currentRunStats.moneyGained },
        { label: "Max Combo", val: runState.currentRunStats.maxCombo, key: 'maxCombo', raw: runState.currentRunStats.maxCombo },
        { label: "Bosses Killed", val: runState.currentRunStats.bossesKilled, key: 'bossesKilled', raw: runState.currentRunStats.bossesKilled }
    ];

    const buildStatsList = [
        { label: "Max HP", val: Math.floor(runState.player.maxHp) },
        { label: "Damage", val: "x" + runState.player.damageMultiplier.toFixed(2) },
        { label: "Speed", val: Math.floor(runState.player.stats.speed * runState.player.speedMultiplier) },
        { label: "Crit Chance", val: (runState.player.critChance * 100).toFixed(0) + "%" },
        { label: "Crit Dmg", val: (runState.player.critMultiplier * 100).toFixed(0) + "%" },
        { label: "Cooldown", val: ((1 - runState.player.cooldownMultiplier) * 100).toFixed(0) + "%" },
        { label: "Defense", val: (runState.player.damageReduction * 100).toFixed(0) + "%" }
    ];

    // 3. Render Run Stats Grid
    const gridContainer = document.getElementById(`${pfx}-stats-grid`);
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
    const listContainer = document.getElementById(`${pfx}-build-list`);
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

    // 5. Render Breakdown (damage by source, upgrades picked, key moments)
    _renderRunBreakdown(pfx);

    saveGame();
    setUIState(isVictory ? 'VICTORY' : 'GAMEOVER');

    // Update Play Again button based on mode
    const playAgainBtn = document.querySelector(`#${screenId} .game-over-play-btn`);
    if (playAgainBtn) {
        if (wasOnlineMode) {
            // Online game over → return both players to lobby to pick heroes/mode again
            playAgainBtn.textContent = '🌐 PLAY AGAIN ONLINE';
            playAgainBtn.onclick = function () {
                document.getElementById('menu-overlay').style.display = 'none';
                document.getElementById('game-over-screen').style.display = 'none';
                document.getElementById('victory-screen').style.display = 'none';
                const nm = window.networkManager;
                if (nm && nm.lobbyCode && nm.phase === 'finished') {
                    // Lobby still alive — tell server to reset it for both players
                    nm.returnToLobby();
                    if (typeof onlineLobby !== 'undefined') onlineLobby._awaitReturnToLobby();
                    else if (typeof window.openOnlineLobby === 'function') window.openOnlineLobby();
                } else {
                    // Lobby gone (partner quit) — open fresh
                    if (typeof window.openOnlineLobby === 'function') window.openOnlineLobby();
                    else initMenu();
                }
            };
        } else if (runState.isDailyMode) {
            playAgainBtn.textContent = '▶ PLAY AGAIN';
            playAgainBtn.onclick = function () { startGame('DAILY'); };
        } else if (runState.isWeeklyMode) {
            playAgainBtn.textContent = '▶ PLAY AGAIN';
            playAgainBtn.onclick = function () { startGame('WEEKLY'); };
        } else if (wasEvilMode) {
            playAgainBtn.textContent = '▶ PLAY AGAIN';
            playAgainBtn.onclick = function () { startEvilGame(); };
        } else if (wasVersusMode) {
            playAgainBtn.textContent = '▶ PLAY AGAIN';
            playAgainBtn.onclick = function () { startGame('VERSUS'); };
        } else {
            playAgainBtn.textContent = '▶ PLAY AGAIN';
            playAgainBtn.onclick = function () { startGame('NORMAL'); };
        }
    }
}

// --- Fixed Time Step Loop --- (rAF + gate harness moved to GameLoop.js)
const FPS = 60;

// ── Online Co-op sync ─────────────────────────────────────────────────────────

// Render remote entities this many ms behind the latest server time so we always
// have two buffered snapshots to interpolate between, even with internet jitter.
// Server tick is 33 ms, so 100 ms = ~3 ticks of history available for interpolation.
const _INTERP_DELAY_MS = 100;
const _SNAP_BUF_MAX    = 6;

// Smoothed offset between client clock and server clock, derived from snapshot
// timestamps. clientNow - _onlineClockOffset ≈ server time. Locks to minimum
// observed offset (least-delayed packet) and slowly drifts to follow clock skew.
let _onlineClockOffset = null;

function _onlineUpdateClockOffset(serverT) {
    const sample = Date.now() - serverT;
    if (_onlineClockOffset === null || sample < _onlineClockOffset) {
        _onlineClockOffset = sample;
    } else {
        // Slow drift to track gradual clock skew between machines
        _onlineClockOffset = _onlineClockOffset * 0.995 + sample * 0.005;
    }
}

function _onlineRenderTime() {
    if (_onlineClockOffset === null) return Date.now() - _INTERP_DELAY_MS;
    return Date.now() - _onlineClockOffset - _INTERP_DELAY_MS;
}

// Cubic Hermite interpolation across a ring-buffer of {x,y,t} snapshots.
// Tangents are Catmull-Rom style — derived from neighboring snapshot positions
// — so motion stays smooth across dash starts/stops without storing velocities.
// Falls back to linear at the boundaries (no left/right neighbor available).
// Clamps to oldest/newest when out of range so a brief packet loss still
// renders the last known position.
function _onlineInterpBuf(buf, renderTime) {
    const n = buf.length;
    if (n === 0) return { x: 0, y: 0 };
    if (n === 1 || renderTime >= buf[n - 1].t) return { x: buf[n - 1].x, y: buf[n - 1].y };
    if (renderTime <= buf[0].t) return { x: buf[0].x, y: buf[0].y };

    for (let i = n - 2; i >= 0; i--) {
        if (buf[i].t > renderTime) continue;
        const p0 = buf[i], p1 = buf[i + 1];
        const dt = p1.t - p0.t;
        if (dt <= 0) return { x: p1.x, y: p1.y };
        const s = (renderTime - p0.t) / dt;

        // Tangents from neighbors (Catmull-Rom). Time-normalised so output
        // units are distance/time, then scaled by dt in the Hermite basis.
        const left  = (i - 1 >= 0) ? buf[i - 1] : null;
        const right = (i + 2 < n)  ? buf[i + 2] : null;

        // Linear fallback at both edges
        if (!left && !right) {
            return { x: p0.x + (p1.x - p0.x) * s, y: p0.y + (p1.y - p0.y) * s };
        }

        const m0x = left  ? (p1.x - left.x)  / (p1.t - left.t)  : (p1.x - p0.x) / dt;
        const m0y = left  ? (p1.y - left.y)  / (p1.t - left.t)  : (p1.y - p0.y) / dt;
        const m1x = right ? (right.x - p0.x) / (right.t - p0.t) : (p1.x - p0.x) / dt;
        const m1y = right ? (right.y - p0.y) / (right.t - p0.t) : (p1.y - p0.y) / dt;

        const s2 = s * s, s3 = s2 * s;
        const h00 =  2 * s3 - 3 * s2 + 1;
        const h10 =      s3 - 2 * s2 + s;
        const h01 = -2 * s3 + 3 * s2;
        const h11 =      s3 -     s2;

        return {
            x: h00 * p0.x + h10 * dt * m0x + h01 * p1.x + h11 * dt * m1x,
            y: h00 * p0.y + h10 * dt * m0y + h01 * p1.y + h11 * dt * m1y,
        };
    }
    return { x: buf[0].x, y: buf[0].y };
}

// Buffer for chunked snapshots — server splits large snapshots across
// multiple messages tagged with `chunk: { seq, idx, of }`. We merge when all
// parts arrive; stale partial sets are evicted after EVICT_MS.
const _SNAPSHOT_CHUNK_BUF = new Map(); // seq → { head, enemies, projectiles, parts, of, firstSeenAt }
const _SNAPSHOT_CHUNK_EVICT_MS = 500;

function _onlineHandleSnapshot(s) {
    if (!s) return;
    if (!s.chunk) {
        _onlineApplySnapshot(s);
        return;
    }
    const { seq, idx, of } = s.chunk;
    let entry = _SNAPSHOT_CHUNK_BUF.get(seq);
    const now = Date.now();
    if (!entry) {
        // Sweep stale partials so a packet-loss event doesn't grow the map unbounded
        for (const [k, e] of _SNAPSHOT_CHUNK_BUF) {
            if (now - e.firstSeenAt > _SNAPSHOT_CHUNK_EVICT_MS) _SNAPSHOT_CHUNK_BUF.delete(k);
        }
        entry = { head: null, enemies: [], projectiles: [], parts: 0, of, firstSeenAt: now };
        _SNAPSHOT_CHUNK_BUF.set(seq, entry);
    }
    if (idx === 0) {
        // Header chunk carries player/score/events. Strip chunk meta and merged arrays — we'll fill those below.
        const { chunk: _c, enemies: _e, projectiles: _p, ...rest } = s;
        entry.head = rest;
    }
    if (Array.isArray(s.enemies))     entry.enemies.push(...s.enemies);
    if (Array.isArray(s.projectiles)) entry.projectiles.push(...s.projectiles);
    entry.parts++;
    if (entry.parts >= entry.of && entry.head) {
        const merged = { ...entry.head, enemies: entry.enemies, projectiles: entry.projectiles };
        _SNAPSHOT_CHUNK_BUF.delete(seq);
        _onlineApplySnapshot(merged);
    }
}

/** GUEST: apply a state snapshot received from the host. */
function _onlineApplySnapshot(s) {
    if (!s || !runState.gameRunning) return;
    const _snapTime = Date.now();
    // Server-side timestamp: use this for interpolation buffers so spacing reflects
    // actual server tick cadence, not jittery packet receipt times.
    const _serverT  = (typeof s.t === 'number') ? s.t : _snapTime;
    _onlineUpdateClockOffset(_serverT);

    // Update host ghost (rendered as player2 on guest's machine)
    // Store snapshot position + movement so extrapolation loop can forward-predict it
    if (runState.player2 && s.p1) {
        runState.player2._sx       = s.p1.x;
        runState.player2._sy       = s.p1.y;
        runState.player2._smx      = s.p1.mx || 0;
        runState.player2._smy      = s.p1.my || 0;
        runState.player2._snapshotAt = _snapTime;
        if (!runState.player2._snapBuf) runState.player2._snapBuf = [];
        runState.player2._snapBuf.push({ x: s.p1.x, y: s.p1.y, t: _serverT });
        if (runState.player2._snapBuf.length > _SNAP_BUF_MAX) runState.player2._snapBuf.shift();
        if (runState.player2._snapBuf.length === 1) { runState.player2.x = s.p1.x; runState.player2.y = s.p1.y; }
        runState.player2.hp        = s.p1.hp;
        runState.player2.maxHp     = s.p1.maxHp;
        runState.player2.isDead    = s.p1.isDead;
        runState.player2.level     = s.p1.level;
        runState.player2.aimAngle  = s.p1.aimAngle;
        runState.player2.isInvincible = s.p1.isInvincible;
    }

    // Reconcile guest's own player (authoritative HP/level from host)
    if (runState.player && s.p2) {
        const prevDead = runState.player.isDead;
        runState.player.hp     = s.p2.hp;
        runState.player.maxHp  = s.p2.maxHp;
        runState.player.isDead = s.p2.isDead;
        runState.player.level  = s.p2.level;
        runState.player.xp     = s.p2.xp;
        runState.player.maxXp  = s.p2.maxXp;
        runState.player.gold   = s.p2.gold;
        // Server-authoritative target position; per-frame reconciliation loop
        // pulls the local predicted position toward this each frame instead of
        // applying a single per-snapshot jerk.
        runState.player._serverTargetX = s.p2.x;
        runState.player._serverTargetY = s.p2.y;

        // Revival: host revived us (isDead went true→false) — cancel any local death state
        if (prevDead && !runState.player.isDead) {
            runState.isPlayerDying   = false;
            runState.playerDeathTimer = 0;
        }

        // Sync Air Hero objective from server (authoritative) so HUD renders correctly
        if (s.p2.objective !== undefined) {
            runState.player.currentObjective = s.p2.objective;
        }
    }

    // Sync revival markers (host sends its perspective; guest swaps p1↔p2)
    if (s.p2Marker !== undefined) runState.p1RevivalMarker = s.p2Marker;
    if (s.p1Marker !== undefined) runState.p2RevivalMarker = s.p1Marker;

    // Rebuild ghost enemy array from snapshot
    const _now = Date.now();
    const _prevMap = new Map(enemies.filter(e => e._ghost).map(e => [e._id, e]));
    _replaceArrInPlace(enemies, s.enemies.map(ed => {
        // Reuse existing ghost object if possible (avoids GC churn)
        let e = _prevMap.get(ed._id);
        if (!e) {
            e = Object.create(Enemy.prototype);
            e._ghost = true;
            e.frame = 0; e.targetAngle = 0; e.isAttacking = false;
            e.dead = false; e.isBoss = false; e.isElite = false;
            e.isSummonedMinion = false; e.eliteType = null;
            e.radius = 20; e.color = '#888888'; e.sides = 0; // safe defaults until static fields arrive
        }
        e._id = ed._id;
        // #32 P9 — position delta decoding. Server emits absolute `x, y` on
        // first sight + every keyframe (~1s), and `dx, dy` between keyframes.
        // Apply delta to the last absolute we stored so client + server agree
        // bit-for-bit (server tracks the rounded value it sent).
        let _ax, _ay;
        if (ed.x !== undefined) {
            _ax = ed.x; _ay = ed.y;
        } else {
            _ax = (e._lastSnapX ?? 0) + (ed.dx || 0);
            _ay = (e._lastSnapY ?? 0) + (ed.dy || 0);
        }
        e._lastSnapX = _ax; e._lastSnapY = _ay;
        e._sx = _ax; e._sy = _ay;
        e._snapshotAt = _now;
        e.vx = ed.vx || 0; e.vy = ed.vy || 0;
        if (!e._snapBuf) { e._snapBuf = [{ x: _ax, y: _ay, t: _serverT }]; e.x = _ax; e.y = _ay; }
        else { e._snapBuf.push({ x: _ax, y: _ay, t: _serverT }); if (e._snapBuf.length > _SNAP_BUF_MAX) e._snapBuf.shift(); }
        const _prevEHp = e.hp;
        e.hp = ed.hp;
        if (ed.hp < _prevEHp && _prevEHp > 0) e._hitFlash = 6;
        e.alpha = ed.alpha !== undefined ? ed.alpha : 1;
        e.frozenTimer = ed.frozenTimer || 0;
        e.slowTimer   = 0;
        // Static fields present only on first appearance (delta encoding)
        if (ed.maxHp   !== undefined) e.maxHp   = ed.maxHp;
        if (ed.subType !== undefined) e.subType = ed.subType;
        if (ed.color   !== undefined) e.color   = ed.color;
        if (ed.sides   !== undefined) e.sides   = ed.sides;
        if (ed.radius  !== undefined) { if (e.radius !== ed.radius) e._bodyGradient = null; e.radius = ed.radius; }
        return e;
    }));

    // Rebuild ghost projectile array (reuse existing objects to reduce GC pressure).
    // When the server removes a projectile (it hit an enemy or expired), the client
    // renders ~100 ms behind via interpolation, so dropping the projectile object
    // immediately makes it pop out of existence mid-flight before it visually reaches
    // the target. We keep "orphan" projectiles around until renderTime catches up
    // with their last buffered position, so they finish their visible flight path.
    const _prevProjMap = new Map(projectiles.filter(p => p._ghost).map(p => [p._id, p]));
    const _newProjIds  = new Set(s.projectiles.map(pd => pd._id));
    _replaceArrInPlace(projectiles, s.projectiles.map(pd => {
        let p = _prevProjMap.get(pd._id);
        if (!p) {
            p = Object.create(Projectile ? Projectile.prototype : Object.prototype);
            p._ghost = true;
            p.life = 1; p.dead = false; p.pierce = 0; p.owner = null;
            p.damage = 0; p.knockback = 0; p.type = '';
        }
        p._id = pd._id;
        // #32 P9 — position delta decoding for projectiles (mirrors enemy
        // path; same keyframe-vs-delta wire shape).
        let _pax, _pay;
        if (pd.x !== undefined) {
            _pax = pd.x; _pay = pd.y;
        } else {
            _pax = (p._lastSnapX ?? 0) + (pd.dx || 0);
            _pay = (p._lastSnapY ?? 0) + (pd.dy || 0);
        }
        p._lastSnapX = _pax; p._lastSnapY = _pay;
        p._sx = _pax; p._sy = _pay;
        p._snapshotAt = _snapTime;
        p.velocity = { x: pd.vx, y: pd.vy };
        if (!p._snapBuf) { p._snapBuf = [{ x: _pax, y: _pay, t: _serverT }]; p.x = _pax; p.y = _pay; }
        else { p._snapBuf.push({ x: _pax, y: _pay, t: _serverT }); if (p._snapBuf.length > _SNAP_BUF_MAX) p._snapBuf.shift(); }
        // Static fields present only on first appearance (delta encoding)
        if (pd.color       !== undefined) p.color       = pd.color;
        if (pd.radius      !== undefined) p.radius      = pd.radius;
        if (pd.isEnemy     !== undefined) p.isEnemy     = pd.isEnemy;
        if (pd.isExplosive !== undefined) p.isExplosive = pd.isExplosive;
        if (pd.isCrit      !== undefined) p.isCrit      = pd.isCrit;
        if (pd.type        !== undefined) p.type        = pd.type;
        return p;
    }));
    // Carry forward orphans (in last frame's array, gone from this snapshot) so the
    // render loop can interpolate them to their final position before they vanish.
    for (const [id, p] of _prevProjMap) {
        if (_newProjIds.has(id)) continue;
        if (p._orphanAt === undefined) p._orphanAt = _serverT;
        projectiles.push(p);
    }

    // Game state
    if (s.wave     !== undefined) runState.wave      = s.wave;
    if (s.score    !== undefined) runState.score     = s.score;
    if (s.bossActive !== undefined) runState.bossActive = s.bossActive;

    // Process events
    if (s.events) s.events.forEach(_onlineProcessGuestEvent);
}

/** GUEST: handle one-shot events relayed from the host. */
function _onlineProcessGuestEvent(ev) {
    if (!ev) return;
    switch (ev.type) {
        case 'enemy_death':
            createExplosion(ev.x, ev.y, ev.color || '#fff');
            break;
        case 'gold_drop':
            goldDrops.push(GoldDrop.acquire(ev.x, ev.y));
            break;
        case 'wave_start':
            runState.wave = ev.wave;
            showNotification(`WAVE ${ev.wave}`);
            break;
        case 'notification':
            showNotification(ev.msg, ev.color);
            break;
        case 'game_over':
            gameOver(ev.victory || false);
            break;
    }
}

/** @deprecated Server now manages the event queue — kept for compatibility. */
function _onlineQueueEvent(_ev) {}
window._onlineQueueEvent = _onlineQueueEvent;

/** @deprecated Server now applies level-up choices — kept for compatibility. */
function _onlineHandleLevelUpChoice(_choice) {}

/** GUEST: display the level-up screen for their own character (choice relayed to host via LevelUp.js). */
function _onlineShowLevelUpForGuest(ev) {
    if (!ev.options || !runState.player) return;
    runState.isLevelingUp = true;
    if (window.levelUpUI) window.levelUpUI.showLevelUp(runState.player, ev.options);
}

/** GUEST: remove the "waiting for partner to level up" dimming. */
function _onlineHideLevelUpWait() {
    const el = document.getElementById('online-wait-overlay');
    if (el) el.style.display = 'none';
}

/** GUEST: show/hide the "partner is choosing an upgrade" overlay. */
function _onlineShowPartnerLevelingOverlay(show) {
    const el = document.getElementById('online-partner-leveling-overlay');
    if (!el) return;
    el.style.display = show ? 'flex' : 'none';
}

/** Show/hide the in-game online player name bar. */
function _onlineShowNameBar(show) {
    const bar = document.getElementById('online-name-bar');
    if (!bar) return;
    if (show) {
        const p1El = document.getElementById('online-name-p1');
        const p2El = document.getElementById('online-name-p2');
        if (p1El) p1El.textContent = window._onlineHostName  || 'Host';
        if (p2El) p2El.textContent = window._onlineGuestName || 'Guest';
        bar.style.display = 'flex';
    } else {
        bar.style.display = 'none';
    }
}

/** Show or hide the mid-game reconnect overlay. timeoutSec=0 = already timed out (instant disconnect). */
function _onlineShowReconnectOverlay(show, timeoutSec = 90) {
    const ov = document.getElementById('online-reconnect-overlay');
    if (!ov) return;
    ov.style.display = show ? 'flex' : 'none';
    if (show) {
        runState.gamePaused = true;
        clearInterval(ov._iv);
        if (timeoutSec <= 0) {
            // Partner already hard-disconnected — let game logic decide next step
            runState.gamePaused = false;
            abortOnlineGame();
            return;
        }
        let secs = timeoutSec;
        const timer = document.getElementById('online-reconnect-timer');
        if (timer) timer.textContent = `Giving up in ${secs}s…`;
        const iv = setInterval(() => {
            if (!runState.isOnlineMode || ov.style.display === 'none') { clearInterval(iv); return; }
            secs--;
            if (timer) timer.textContent = `Giving up in ${secs}s…`;
            if (secs <= 0) { clearInterval(iv); abortOnlineGame(); }
        }, 1000);
        ov._iv = iv;
    } else {
        clearInterval(ov._iv);
        runState.gamePaused = false;
    }
}

// #51 — Photo mode moved to Camera.js. togglePhotoMode / tickPhotoMode /
// isPhotoMode imported above. F2 keydown handler is registered inside Camera.js.

// #170 — Minimap. Renders arena bounds + player(s) + enemies + boss + objective
// markers into a small 180x135 canvas in the top-right corner. Throttled to 15 Hz
// since the player only needs rough positional context. Off when:
//   - gameConfig.minimapEnabled is false
//   - no arena yet (menu / loading)
//   - gameRunning is false
// Hidden via CSS display:none rather than zero-clearing so toggling is cheap.
let _minimapTimer = 0;
function _renderMinimap() {
    const el = document.getElementById('minimap');
    if (!el) return;
    // Auto-hide in any 2-player mode: P2 HUD takes the right edge in co-op,
    // versus uses dynamic zoom-out so a minimap adds no info, and online co-op
    // is identical to local co-op visually.
    const twoPlayer = (typeof runState.isCoopMode    !== 'undefined' && runState.isCoopMode)
                   || (typeof runState.isVersusMode  !== 'undefined' && runState.isVersusMode)
                   || (typeof runState.isOnlineMode  !== 'undefined' && runState.isOnlineMode);
    const shouldShow = (typeof gameConfig !== 'undefined' && gameConfig.minimapEnabled)
        && (typeof runState.gameRunning !== 'undefined' && runState.gameRunning)
        && (typeof arena !== 'undefined' && arena)
        && !twoPlayer;
    if (!shouldShow) {
        if (el.style.display !== 'none') el.style.display = 'none';
        return;
    }
    if (el.style.display === 'none') el.style.display = '';

    // Throttle DOM-canvas writes to ~15 Hz.
    _minimapTimer++;
    if (_minimapTimer < 4) return;
    _minimapTimer = 0;

    const mctx = el.getContext('2d');
    const W = el.width, H = el.height;
    const aw = arena.width, ah = arena.height;
    const sx = W / aw;
    const sy = H / ah;

    mctx.clearRect(0, 0, W, H);
    // Arena floor tint
    mctx.fillStyle = 'rgba(20,30,40,0.55)';
    mctx.fillRect(0, 0, W, H);

    // Camera viewport rectangle
    if (arena.camera) {
        mctx.strokeStyle = 'rgba(255,255,255,0.35)';
        mctx.lineWidth = 1;
        mctx.strokeRect(
            arena.camera.x * sx, arena.camera.y * sy,
            (arena.camera.width || 0) * sx, (arena.camera.height || 0) * sy
        );
    }

    // Obstacles
    if (Array.isArray(arena.obstacles)) {
        mctx.fillStyle = 'rgba(110,90,70,0.55)';
        for (const o of arena.obstacles) {
            mctx.fillRect(o.x * sx, o.y * sy, Math.max(1, o.w * sx), Math.max(1, o.h * sy));
        }
    }

    // Enemies (red dots; boss = bigger yellow)
    if (typeof enemies !== 'undefined') {
        for (const e of enemies) {
            if (!e || e.hp <= 0) continue;
            const isBoss = (typeof Boss === 'function') && (e instanceof Boss);
            mctx.fillStyle = isBoss ? '#f1c40f' : '#e74c3c';
            const r = isBoss ? 3.5 : 1.6;
            mctx.beginPath();
            mctx.arc(e.x * sx, e.y * sy, r, 0, Math.PI * 2);
            mctx.fill();
        }
    }

    // Objective marker (cyan)
    if (typeof runState.currentObjective !== 'undefined' && runState.currentObjective && runState.currentObjective.x !== undefined) {
        mctx.fillStyle = '#1abc9c';
        mctx.beginPath();
        mctx.arc(runState.currentObjective.x * sx, runState.currentObjective.y * sy, 3, 0, Math.PI * 2);
        mctx.fill();
    }

    // Player(s) — green for P1, blue for P2
    if (typeof runState.player !== 'undefined' && runState.player && !runState.player.isDead) {
        mctx.fillStyle = '#2ecc71';
        mctx.beginPath();
        mctx.arc(runState.player.x * sx, runState.player.y * sy, 3, 0, Math.PI * 2);
        mctx.fill();
    }
    if (typeof runState.player2 !== 'undefined' && runState.player2 && !runState.player2.isDead) {
        mctx.fillStyle = '#3498db';
        mctx.beginPath();
        mctx.arc(runState.player2.x * sx, runState.player2.y * sy, 3, 0, Math.PI * 2);
        mctx.fill();
    }
}

// #149 — Cheat console (~ toggles). Behind a single Tilde/Backtick keybind.
// Commands: give gold N | set wave N | spawn boss <id> | kill | god | heal | help
let _cheatOpen = false;
function _toggleCheatConsole() {
    _cheatOpen = !_cheatOpen;
    const el = document.getElementById('cheat-console');
    if (!el) return;
    el.style.display = _cheatOpen ? 'block' : 'none';
    const input = document.getElementById('cheat-input');
    if (_cheatOpen && input) { input.value = ''; input.focus(); }
}
function _cheatLog(line) {
    const log = document.getElementById('cheat-log');
    if (!log) return;
    log.textContent += (log.textContent ? '\n' : '') + line;
    log.scrollTop = log.scrollHeight;
}
function _cheatExec(raw) {
    const cmd = String(raw || '').trim();
    if (!cmd) return;
    _cheatLog('> ' + cmd);
    const parts = cmd.split(/\s+/);
    const verb = parts[0].toLowerCase();
    try {
        if (verb === 'help') {
            _cheatLog('  give gold <n>      add gold to current run');
            _cheatLog('  give xp <n>        grant XP to player');
            _cheatLog('  set wave <n>       jump to wave');
            _cheatLog('  spawn boss <id>    spawn boss now (e.g. MAKUTA, GOBLIN, TANK)');
            _cheatLog('  kill               kill player');
            _cheatLog('  killall            kill all enemies on screen');
            _cheatLog('  god                toggle invincibility');
            _cheatLog('  heal               restore HP');
            _cheatLog('  clear              clear log');
        } else if (verb === 'give' && parts[1] === 'gold') {
            const n = parseInt(parts[2], 10) || 0;
            if (runState.player) { runState.player.gold = (runState.player.gold || 0) + n; _cheatLog(`+${n} gold`); }
        } else if (verb === 'give' && parts[1] === 'xp') {
            const n = parseInt(parts[2], 10) || 0;
            if (runState.player && typeof runState.player.gainXp === 'function') { runState.player.gainXp(n); _cheatLog(`+${n} xp`); }
        } else if (verb === 'set' && parts[1] === 'wave') {
            const n = parseInt(parts[2], 10);
            if (Number.isFinite(n) && n > 0) {
                runState.wave = n - 1;
                enemies.length = 0;
                projectiles.length = 0;
                runState.bossActive = false;
                if (typeof advanceWave === 'function') advanceWave();
                _cheatLog(`wave → ${n}`);
            }
        } else if (verb === 'spawn' && parts[1] === 'boss') {
            const id = (parts[2] || 'MAKUTA').toUpperCase();
            if (typeof Boss === 'function') {
                const b = new Boss(id);
                if (runState.player) { b.x = runState.player.x + 200; b.y = runState.player.y; }
                enemies.push(b);
                runState.bossActive = true;
                _cheatLog(`spawned boss ${id}`);
            }
        } else if (verb === 'kill') {
            if (runState.player) { runState.player.hp = -999; recordPlayerDamage(runState.player, 'CHEAT', 999); _cheatLog('player killed'); }
        } else if (verb === 'killall') {
            if (typeof enemies !== 'undefined') {
                const n = enemies.length;
                enemies.forEach(e => { e.hp = 0; });
                _cheatLog(`killed ${n} enemies`);
            }
        } else if (verb === 'god') {
            if (runState.player) { runState.player.isInvincible = !runState.player.isInvincible; _cheatLog(`god mode ${runState.player.isInvincible ? 'ON' : 'OFF'}`); }
        } else if (verb === 'heal') {
            if (runState.player) { runState.player.hp = runState.player.maxHp; _cheatLog('healed'); }
        } else if (verb === 'clear') {
            const log = document.getElementById('cheat-log');
            if (log) log.textContent = '';
        } else {
            _cheatLog('unknown command — type help');
        }
    } catch (e) {
        _cheatLog('error: ' + e.message);
    }
}
window.addEventListener('keydown', e => {
    // Toggle on F9
    if (e.key === 'F9') {
        e.preventDefault();
        _toggleCheatConsole();
        return;
    }
    // Enter in cheat input executes; Esc closes
    if (_cheatOpen && e.target && e.target.id === 'cheat-input') {
        if (e.key === 'Enter') {
            e.preventDefault();
            _cheatExec(e.target.value);
            e.target.value = '';
        } else if (e.key === 'Escape') {
            e.preventDefault();
            _toggleCheatConsole();
        }
    }
});

// #148 — Debug overlay (F1)
let _debugOverlayOn = false;
const _frameTimes = new Array(120).fill(0);
let _frameIdx = 0;
let _lastDebugUpdateMs = 0;

// #24/#30 P10 — Phase timing infrastructure. Records per-phase ms over a
// rolling 120-frame window so the F1 overlay can show where main-thread time
// goes. Used to decide whether the speculative #24 (worker AI) and #30
// (WebGL/Pixi) passes are worth the rewrite cost. Active only while the
// overlay is on so non-debug runs pay zero overhead.
const _phaseTimes = {
    frameWork: new Array(120).fill(0),
    enemies:   new Array(120).fill(0),
};
function _recordPhase(name, ms) {
    const arr = _phaseTimes[name];
    if (!arr) return;
    arr[_frameIdx] = ms;
}
function _phaseP50(name) {
    const arr = _phaseTimes[name];
    if (!arr) return 0;
    const sorted = arr.filter(v => v > 0).sort((a, b) => a - b);
    return sorted[Math.floor(sorted.length * 0.5)] || 0;
}
function _phaseP99(name) {
    const arr = _phaseTimes[name];
    if (!arr) return 0;
    const sorted = arr.filter(v => v > 0).sort((a, b) => a - b);
    return sorted[Math.floor(sorted.length * 0.99)] || 0;
}
function _toggleDebugOverlay() {
    _debugOverlayOn = !_debugOverlayOn;
    const el = document.getElementById('debug-overlay');
    if (el) el.style.display = _debugOverlayOn ? 'block' : 'none';
}
window.addEventListener('keydown', e => {
    if (e.key === 'F1') { e.preventDefault(); _toggleDebugOverlay(); }
});
function _updateDebugOverlay(frameMs) {
    _frameTimes[_frameIdx] = frameMs;
    _frameIdx = (_frameIdx + 1) % _frameTimes.length;
    if (!_debugOverlayOn) return;
    const now = performance.now();
    if (now - _lastDebugUpdateMs < 200) return; // throttle DOM writes
    _lastDebugUpdateMs = now;
    const el = document.getElementById('debug-overlay');
    if (!el) return;
    const samples = _frameTimes.filter(v => v > 0).sort((a, b) => a - b);
    const p50 = samples[Math.floor(samples.length * 0.5)] || 0;
    const p99 = samples[Math.floor(samples.length * 0.99)] || 0;
    const fps = p50 > 0 ? (1000 / p50).toFixed(1) : '–';
    const enemiesN = (typeof enemies !== 'undefined') ? enemies.length : 0;
    const projN    = (typeof projectiles !== 'undefined') ? projectiles.length : 0;
    const partN    = (typeof particles !== 'undefined') ? particles.length : 0;
    const ftN      = (typeof floatingTexts !== 'undefined') ? floatingTexts.length : 0;
    const px       = (typeof runState.player !== 'undefined' && runState.player) ? Math.round(runState.player.x) : 0;
    const py       = (typeof runState.player !== 'undefined' && runState.player) ? Math.round(runState.player.y) : 0;
    const _eh = window._enemySpatialHash;
    const _ph = window._projectileSpatialHash;
    const _ehStats = _eh && _eh.stats ? _eh.stats() : { buckets: 0, maxBucket: 0 };
    const _phStats = _ph && _ph.stats ? _ph.stats() : { buckets: 0, maxBucket: 0 };
    const hitStop  = runState._hitStopFrames;
    const wv       = (typeof runState.wave !== 'undefined') ? runState.wave : 0;
    // #24/#30 P10 — phase breakdown. `frameWork` is total main-thread time
    // in masterFrame body; `enemies` is the per-frame enemy update + draw +
    // collision phase. Used to gate the speculative #24 (worker AI) /
    // #30 (WebGL/Pixi) passes — if `enemies` p99 < 4ms or `frameWork` p99
    // < 8ms at wave 30+, the rewrite cost outweighs the perf win.
    const fwP50 = _phaseP50('frameWork');
    const fwP99 = _phaseP99('frameWork');
    const enP50 = _phaseP50('enemies');
    const enP99 = _phaseP99('enemies');
    el.textContent =
        `FPS:    ${fps} (p50 ${p50.toFixed(1)}ms / p99 ${p99.toFixed(1)}ms)\n` +
        `Wave:   ${wv}\n` +
        `Player: ${px}, ${py}\n` +
        `Enemies:    ${enemiesN}\n` +
        `Projectiles: ${projN}\n` +
        `Particles:   ${partN}\n` +
        `FloatingText: ${ftN}\n` +
        `EnemyHash:   ${_ehStats.buckets} cells, max ${_ehStats.maxBucket}\n` +
        `ProjHash:    ${_phStats.buckets} cells, max ${_phStats.maxBucket}\n` +
        `HitStop: ${hitStop}\n` +
        `Frame work: p50 ${fwP50.toFixed(1)}ms / p99 ${fwP99.toFixed(1)}ms\n` +
        `Enemies ph: p50 ${enP50.toFixed(1)}ms / p99 ${enP99.toFixed(1)}ms\n` +
        `F1 to hide`;
}

// Per-fixed-frame body. Invoked by the GameLoop harness once every ~16.6 ms.
// The rAF dispatch + dt-gate now live in GameLoop.js.
// #173 phase 1 — scene helpers extracted from masterFrame for clarity. Each
// returns `true` when it owns the frame (caller should bail) or `false` to let
// normal gameplay update/draw proceed.
//
// Phase 2 (next) will split the remaining gameplay block in masterFrame into
// `_updateGameplay(dt)` + `_drawGameplay(ctx)` and gate the update half with
// `isPhotoMode()` so the photo-mode freeze flips on with a one-line change.
function _renderMuseumScene() {
    if (uiState === 'MUSEUM' && window.museum) {
        window.museum.update();
        window.museum.draw(ctx);
        return true;
    }
    return false;
}
function _renderGlobalLobbyScene() {
    if ((uiState === 'GLOBAL_LOBBY' || uiState === 'GLOBAL_LOBBY_MENU') && window.globalLobbyScene) {
        window.globalLobbyScene.update();
        window.globalLobbyScene.draw(ctx);
        return true;
    }
    return false;
}
function _renderBigGambleScene() {
    if (typeof window.isBigGambleActive !== 'undefined' && window.isBigGambleActive) {
        if (window.HERO_LOGIC && window.HERO_LOGIC['chance']) {
            window.HERO_LOGIC['chance'].updateBigGamble(runState.player);
            window.HERO_LOGIC['chance'].drawBigGamble(ctx);
        }
        return true;
    }
    return false;
}

// #173 phase 2 — boss death cinematic finalizer. Runs when bossDeathTimer
// transitions to 0. Daily / weekly win conditions, tutorial / evil-mode hooks,
// then opens the boss-choice screen. Returns `true` if the caller should
// short-circuit (game-over scheduled, mode-specific hook routed elsewhere)
// or `false` if the boss-choice screen will take over on the next frame.
function _finalizeBossDeathCinematic() {
    if (runState.isTestingMode) {
        showNotification('Boss defeated — [TAB] to spawn another');
        return false;
    }

    // Daily Challenge Win Condition
    if (runState.isDailyMode && runState.wave === 10) {
        showNotification("DAILY CHALLENGE COMPLETE!");
        saveData.daily.lastCompleted = getDailySeed();
        saveData.global.totalVoidGoldSpent += 0; // Just to ensure field exists
        // Reward
        runState.player.gold += 5000; // Bonus Gold
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
        return true;
    }

    // Weekly Challenge Win Condition
    if (runState.isWeeklyMode && runState.wave === 20) {
        showNotification("WEEKLY CHALLENGE COMPLETE!");
        saveData.weekly.lastCompleted = getWeeklySeed();
        // Reward (Bigger than Daily)
        runState.player.gold += 15000; // Bonus Gold
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
        return true;
    }

    if (runState.isTutorialMode) { TutorialMode.onBossDefeated(); return true; }
    if (runState.isEvilMode && typeof EvilMode !== 'undefined') { EvilMode.onBossScreenDone(); return true; }

    // Open choice screen — player picks Continue or Save & Quit
    runState._bossChoiceScreen = true;
    runState._bossChoiceFrame = 0;
    _bossChoiceGpConsumed = false;
    runState._bossChoiceFocus = 0;
    runState._bossChoiceGpPrev = {};
    return false;
}

// #173 phase 2 — boss death cinematic body. Pure render + 1s slow-motion
// fade-out. Returns `true` while bossDeathTimer > 0 so caller bails out;
// invokes the finalizer when the timer just hit 0.
function _renderBossDeathCinematic() {
    if (runState.bossDeathTimer <= 0) return false;
    runState.bossDeathTimer--;

    const _progress = 1 - runState.bossDeathTimer / 180;

    // --- Cinematic frame drawn every frame (no strobe) ---
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // 1. Frozen arena background
    ctx.save();
    ctx.translate(-arena.camera.x, -arena.camera.y);
    if (arena) arena.draw(ctx, getHeroTheme(runState.currentBiomeType));
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
        ctx.fillText(`— WAVE ${runState.wave} CLEARED —`, canvas.width / 2, canvas.height / 2 + 48);
        ctx.restore();
    }

    // 7. Fade to black in the final stretch
    if (_progress > 0.8) {
        ctx.fillStyle = `rgba(0, 0, 0, ${((_progress - 0.8) / 0.2) * 0.9})`;
        ctx.fillRect(0, 0, canvas.width, canvas.height);
    }

    if (runState.bossDeathTimer === 0) _finalizeBossDeathCinematic();
    return true;
}

// #173 phase 2 — boss intro cinematic. Pure render + timer-decrement; reads
// `bossIntroTimer/Name/Skippable/CamStart{X,Y}/CamTarget{X,Y}` from module
// scope, writes back the same. Self-contained — returns `true` while active.
function _renderBossIntroCinematic() {
    if (runState.bossIntroTimer <= 0) return false;
    const _ITOTAL = GAMEPLAY.BOSS_INTRO_FRAMES;
    if (runState.bossIntroTimer === _ITOTAL) {
        runState.bossIntroCamStartX = arena.camera.x;
        runState.bossIntroCamStartY = arena.camera.y;
        const _ib = enemies.find(e => e instanceof Boss);
        if (_ib) {
            runState.bossIntroCamTargetX = Math.max(0, Math.min(_ib.x - canvas.width / 2, arena.width - canvas.width));
            runState.bossIntroCamTargetY = Math.max(0, Math.min(_ib.y - canvas.height / 2, arena.height - canvas.height));
        } else {
            runState.bossIntroCamTargetX = runState.bossIntroCamStartX;
            runState.bossIntroCamTargetY = runState.bossIntroCamStartY;
        }
    }
    runState.bossIntroTimer--;
    const _ip = 1 - runState.bossIntroTimer / _ITOTAL;

    const _iEaseOut = t => 1 - Math.pow(1 - Math.min(1, t), 3);
    const _iEaseIn  = t => Math.min(1, t) * Math.min(1, t);

    // Camera pan toward boss over first 55%
    const _iCamT = _iEaseOut(Math.min(1, _ip / 0.55));
    const _iCamX = runState.bossIntroCamStartX + (runState.bossIntroCamTargetX - runState.bossIntroCamStartX) * _iCamT;
    const _iCamY = runState.bossIntroCamStartY + (runState.bossIntroCamTargetY - runState.bossIntroCamStartY) * _iCamT;

    // Zoom 1.0→1.45 during pan, hold, then back to 1.0
    let _iZoom;
    if (_ip < 0.55) {
        _iZoom = 1.0 + 0.45 * _iEaseOut(_ip / 0.55);
    } else if (_ip < 0.80) {
        _iZoom = 1.45;
    } else {
        _iZoom = 1.45 - 0.45 * _iEaseIn((_ip - 0.80) / 0.20);
    }

    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // World — cinematic camera + zoom
    ctx.save();
    ctx.translate(canvas.width / 2, canvas.height / 2);
    ctx.scale(_iZoom, _iZoom);
    ctx.translate(-canvas.width / 2, -canvas.height / 2);
    ctx.translate(-_iCamX, -_iCamY);
    if (arena) arena.draw(ctx, getHeroTheme(runState.currentBiomeType));
    const _iB = enemies.find(e => e instanceof Boss);
    if (_iB && typeof _iB.draw === 'function') _iB.draw(ctx);
    ctx.restore();

    // Vignette
    const _ivg = ctx.createRadialGradient(
        canvas.width / 2, canvas.height / 2, Math.hypot(canvas.width, canvas.height) * 0.22,
        canvas.width / 2, canvas.height / 2, Math.hypot(canvas.width, canvas.height) * 0.68
    );
    _ivg.addColorStop(0, 'rgba(0,0,0,0)');
    _ivg.addColorStop(1, 'rgba(0,0,0,0.84)');
    ctx.fillStyle = _ivg;
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // Impact flash (first 8%)
    if (_ip < 0.08) {
        ctx.fillStyle = `rgba(255,255,255,${(1 - _ip / 0.08) * 0.55})`;
        ctx.fillRect(0, 0, canvas.width, canvas.height);
    }

    // Boss name banner (fades 0.22→0.34, holds, fades 0.88→1.0)
    if (_ip > 0.22) {
        const _iBannerA = _ip < 0.34 ? (_ip - 0.22) / 0.12 :
                          _ip > 0.88 ? 1 - (_ip - 0.88) / 0.12 : 1.0;
        const _iba = Math.max(0, Math.min(1, _iBannerA));

        ctx.save();
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        const _bLabelY = canvas.height / 2 - 58;

        // Decorative rule lines
        ctx.globalAlpha = _iba * 0.55;
        ctx.strokeStyle = '#e74c3c';
        ctx.lineWidth = 1;
        ctx.beginPath(); ctx.moveTo(canvas.width / 2 - 200, _bLabelY); ctx.lineTo(canvas.width / 2 - 88, _bLabelY); ctx.stroke();
        ctx.beginPath(); ctx.moveTo(canvas.width / 2 + 88, _bLabelY); ctx.lineTo(canvas.width / 2 + 200, _bLabelY); ctx.stroke();

        // "BOSS FIGHT" label
        ctx.globalAlpha = _iba * 0.9;
        ctx.shadowColor = '#e74c3c';
        ctx.shadowBlur = 14;
        ctx.fillStyle = '#e74c3c';
        ctx.font = 'bold 13px Arial';
        ctx.fillText('BOSS FIGHT', canvas.width / 2, _bLabelY);

        // Boss name — red glow pass
        ctx.globalAlpha = _iba * 0.18;
        ctx.shadowBlur = 60;
        ctx.fillStyle = '#e74c3c';
        ctx.font = 'bold 72px Arial';
        ctx.fillText(runState.bossIntroName, canvas.width / 2, canvas.height / 2 - 4);

        // Boss name — crisp white pass
        ctx.globalAlpha = _iba;
        ctx.shadowBlur = 18;
        ctx.shadowColor = 'rgba(231,76,60,0.85)';
        ctx.fillStyle = '#ffffff';
        ctx.fillText(runState.bossIntroName, canvas.width / 2, canvas.height / 2 - 4);

        ctx.restore();
    }

    // #192 — skip hint, only on re-encounters. Fades in after the banner is
    // fully visible (≥0.34) and fades back out alongside the banner.
    if (runState.bossIntroSkippable && _ip > 0.34) {
        const _isa = _ip > 0.88 ? Math.max(0, 1 - (_ip - 0.88) / 0.12) : 1.0;
        ctx.save();
        ctx.globalAlpha = _isa * 0.55;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillStyle = '#ffffff';
        ctx.font = '12px Arial';
        ctx.shadowColor = 'rgba(0,0,0,0.8)';
        ctx.shadowBlur = 6;
        ctx.fillText('Press ESC or B to skip', canvas.width / 2, canvas.height - 36);
        ctx.restore();
    }

    // Fade to black in final 12%
    if (_ip > 0.88) {
        ctx.fillStyle = `rgba(0,0,0,${((_ip - 0.88) / 0.12) * 0.95})`;
        ctx.fillRect(0, 0, canvas.width, canvas.height);
    }
    return true;
}

// #173 phase 3 — main gameplay frame (~2.6K LOC). Owns update + draw
// for an active in-progress run. Gated by the caller on
// `gameRunning && !gamePaused && !isLevelingUp && !isShopping && !isStoryOpen`.
// Phase 4 (next) will split the body into _updateGameplay(dt) and
// _drawGameplay(ctx) so #180 (photo-mode true freeze) becomes a 1-line
// update gate and the server simulation can call the update half alone.
// #173 phase 3+ — boss-defeated choice screen. Renders the post-cinematic
// "Continue / Save & Quit" overlay and handles mouse + gamepad navigation.
// Returns `true` while the screen owns the frame so the caller bails out.
function _renderBossChoiceScreen() {
    if (!runState._bossChoiceScreen) return false;
runState._bossChoiceFrame++;
const _fi = Math.min(1, _bossChoiceFrame / 25); // fade-in over ~0.4 s

ctx.clearRect(0, 0, canvas.width, canvas.height);

// Arena background
ctx.save();
ctx.translate(-arena.camera.x, -arena.camera.y);
if (arena) arena.draw(ctx, getHeroTheme(runState.currentBiomeType));
ctx.restore();

// Dark overlay
ctx.fillStyle = 'rgba(0,0,0,0.82)';
ctx.fillRect(0, 0, canvas.width, canvas.height);

// Live particle shower — driven by _bossChoiceFrame so it keeps moving
ctx.save();
for (let _i = 0; _i < 28; _i++) {
    const _px = ((_i * 1.618 * 97) % 1) * canvas.width;
    const _py = (((_i * 2.236 * 83 + 40) % 1) * canvas.height + runState._bossChoiceFrame * (1.0 + (_i % 5) * 0.5) * 2.2) % canvas.height;
    ctx.globalAlpha = (0.35 + 0.65 * Math.abs(Math.sin(runState._bossChoiceFrame * 0.05 + _i * 0.9))) * 0.5;
    ctx.fillStyle = _i % 3 === 0 ? '#ffffff' : '#f1c40f';
    ctx.beginPath();
    ctx.arc(_px, _py, 1.5 + (_i % 4) * 1.2, 0, Math.PI * 2);
    ctx.fill();
}
ctx.restore();

// "BOSS DEFEATED" heading
ctx.save();
ctx.globalAlpha = _fi;
ctx.textAlign = 'center';
ctx.textBaseline = 'middle';
ctx.shadowColor = '#f1c40f';
ctx.shadowBlur = 70;
ctx.fillStyle = 'rgba(241,196,15,0.22)';
ctx.font = 'bold 64px Arial';
ctx.fillText('BOSS DEFEATED', canvas.width / 2, canvas.height / 2 - 10);
ctx.shadowBlur = 16;
ctx.shadowColor = 'rgba(241,196,15,0.85)';
ctx.fillStyle = '#ffffff';
ctx.fillText('BOSS DEFEATED', canvas.width / 2, canvas.height / 2 - 10);
ctx.restore();

// "WAVE X CLEARED" subtitle
ctx.save();
ctx.globalAlpha = _fi * 0.82;
ctx.textAlign = 'center';
ctx.textBaseline = 'middle';
ctx.shadowColor = '#f1c40f';
ctx.shadowBlur = 10;
ctx.fillStyle = '#f1c40f';
ctx.font = '13px Arial';
ctx.fillText(`\u2014 WAVE ${runState.wave} CLEARED \u2014`, canvas.width / 2, canvas.height / 2 + 48);
ctx.restore();

// Buttons
const _btY = canvas.height / 2 + 100;
const _btW = 180, _btH = 40, _btGap = 20;
const _bcx = canvas.width / 2;
const _contX = _bcx - _btW - _btGap / 2;
const _quitX = _bcx + _btGap / 2;

// Detect gamepad to decide hint text and update focus via D-pad/stick
let _gpActive = false;
if (runState._bossChoiceFrame > 20) {
    const _gpads = navigator.getGamepads ? navigator.getGamepads() : [];
    for (const _gp of _gpads) {
        if (!_gp || !isRealGamepad(_gp)) continue;
        _gpActive = true;
        const _gpPressed = (idx) => _gp.buttons[idx]?.pressed && !runState._bossChoiceGpPrev[idx];
        const _stickX = _gp.axes[0] || 0;
        const _dRight = _gpPressed(15) || (_stickX > 0.45 && !runState._bossChoiceGpPrev.sR);
        const _dLeft = _gpPressed(14) || (_stickX < -0.45 && !runState._bossChoiceGpPrev.sL);
        if (_dRight) runState._bossChoiceFocus = 1;
        if (_dLeft) runState._bossChoiceFocus = 0;
        // A confirms focused button; B shortcuts to Save & Quit
        if (!_bossChoiceGpConsumed) {
            if (_gpPressed(0)) { _bossChoiceGpConsumed = true; runState._bossChoiceFocus === 0 ? _doBossContinue() : saveAndQuit(); break; }
            if (_gpPressed(1)) { _bossChoiceGpConsumed = true; saveAndQuit(); break; }
        }
        const _anyHeld = _gp.buttons[0]?.pressed || _gp.buttons[1]?.pressed;
        if (!_anyHeld) _bossChoiceGpConsumed = false;
        // Store prev state
        for (let _bi = 0; _bi < _gp.buttons.length; _bi++) runState._bossChoiceGpPrev[_bi] = _gp.buttons[_bi]?.pressed;
        runState._bossChoiceGpPrev.sR = _stickX > 0.45;
        runState._bossChoiceGpPrev.sL = _stickX < -0.45;
        break; // only first connected gamepad
    }
}

// If a gamepad action dismissed the screen this frame, stop rendering it
if (!runState._bossChoiceScreen) return;

ctx.save();
ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
ctx.font = 'bold 11px Arial';

// Continue button
const _contFocused = (runState._bossChoiceFocus === 0);
ctx.globalAlpha = _fi * (_contFocused ? 1.0 : 0.72);
ctx.strokeStyle = _contFocused ? '#f1c40f' : 'rgba(241,196,15,0.55)';
ctx.lineWidth = _contFocused ? 2.5 : 1.5;
ctx.beginPath(); ctx.roundRect(_contX, _btY - _btH / 2, _btW, _btH, 6); ctx.stroke();
ctx.fillStyle = _contFocused ? 'rgba(241,196,15,0.22)' : 'rgba(241,196,15,0.08)'; ctx.fill();
if (_contFocused) { ctx.shadowColor = '#f1c40f'; ctx.shadowBlur = 12; }
ctx.fillStyle = '#f1c40f';
ctx.fillText('CONTINUE  \u2192', _contX + _btW / 2, _btY);
ctx.shadowBlur = 0;
window._bossContinueBtn = { x: _contX, y: _btY - _btH / 2, w: _btW, h: _btH };

// Save & Quit button
const _quitFocused = (runState._bossChoiceFocus === 1);
ctx.globalAlpha = _fi * (_quitFocused ? 0.95 : 0.55);
ctx.strokeStyle = _quitFocused ? 'rgba(255,255,255,0.9)' : 'rgba(255,255,255,0.35)';
ctx.lineWidth = _quitFocused ? 2.5 : 1;
ctx.beginPath(); ctx.roundRect(_quitX, _btY - _btH / 2, _btW, _btH, 6); ctx.stroke();
ctx.fillStyle = _quitFocused ? 'rgba(255,255,255,0.12)' : 'rgba(255,255,255,0.04)'; ctx.fill();
if (_quitFocused) { ctx.shadowColor = '#ffffff'; ctx.shadowBlur = 10; }
ctx.fillStyle = '#ffffff';
ctx.fillText('SAVE  &  QUIT', _quitX + _btW / 2, _btY);
ctx.shadowBlur = 0;
window._bossQuitBtn = { x: _quitX, y: _btY - _btH / 2, w: _btW, h: _btH };

// Hint line — show gamepad or keyboard hint depending on active input
ctx.globalAlpha = _fi * 0.35;
ctx.fillStyle = '#ffffff';
ctx.font = '10px Arial';
const _hint = _gpActive
    ? '[A] Confirm    [←/→] Switch    [B] Save & Quit'
    : '[Click] Select    [Enter] Confirm';
ctx.fillText(_hint, _bcx, _btY + _btH / 2 + 18);
ctx.restore();

return true; // Prevent normal game render
}

// #173 phase 4 — UPDATE phase prefix. Pure state mutation: hit-stop tick
// (caller owns), evil-mode boss-end check, chaos shuffle objective, camera
// update, heatwave wobble, arena.update, objective logic, boss-intro / death /
// choice cinematic delegations (return true here = caller bails), weather
// logic, spawning. Returns true if a cinematic owns the frame.
// #173 phase 10 — body extracted to `core/updateGameplayPre.js`.

// #173 phase 4 — DRAW phase suffix. Pure rendering: weather particles, HUD,
// player death cinematic. Caller responsibility: pass ctx, do not modify
// state. Player-death block decrements playerDeathTimer (mutation) — TODO
// for phase 5 hoist outside this helper.

// #173 phase 6 — mixed middle. Update + draw still interleaved by entity
// system; phase 7 (next) splits each forEach into a pure-update pass then a
// pure-draw pass and lifts the draw sites to a dedicated `_drawGameplayMid(ctx)`.
// For now this isolates the ~1.5K LOC as a single named function — useful for
// profiling, server-sim re-use, and bounding future split work.
// #173 phase 7 — draw helper. Pulls every entity-loop draw pass + the
// single-instance draws (player, evil overlay, player2, versus AI) into one
// place. Update logic in _runGameplayMid does NOT touch ctx; this helper
// is the only ctx writer in the gameplay middle. Server simulation can
// substitute a no-op helper to skip draws entirely.


function _runGameplayFrame(deltaTime) {
    // #173 phase 5 — photo-mode true-freeze gate. When isPhotoMode() is true,
    // every entity.update() in the mixed middle becomes a no-op so the
    // frozen scene can be re-rendered from a panning camera. Draws run
    // unconditionally so the camera pan stays visible.
    const _frozen = isPhotoMode();
    const _isHitStopped = runState._hitStopFrames > 0;
    if (!_frozen && runState._hitStopFrames > 0) runState._hitStopFrames--;

    // Photo mode: skip the update prefix entirely (arena.update, weather,
    // spawn, cinematic dispatch are all state mutation). Draws still run.
    if (!_frozen && _updateGameplayPre(deltaTime)) return;
    if (!_frozen) _updateGameplayMid(deltaTime, _isHitStopped);

    // #173 phase 8 — true update/draw split. _drawGameplayMid owns every
    // ctx.* write in the gameplay frame: camera transform setup, arena +
    // objective + entity draws, camera restore, then post-camera HUD draws.
    // Runs unconditionally so photo mode can re-render the frozen scene from
    // a panning camera.
    _drawGameplayMid();
    _drawGameplayPost();
    // #35 — single WebGL fragment-shader pass (bloom / chromatic / vignette /
    // biome color grade). No-op when disabled in Options or under reducedMotion.
    renderPostFX();
}

function masterFrame(deltaTime, timestamp) {
    // #10 P10 — measure actual frame work time, not the rAF delta. Wrap the
    // body in try/finally so timing covers every return path (museum skip,
    // game-over early return). Negligible overhead when overlay is off.
    const _frameT0 = performance.now();
    try {
        _updateDebugOverlay(deltaTime); // #148

        // Always handle UI input
        handleGamepadMenu();
        handleCoopP2Gamepad();

        // ── Standalone-scene early returns (#173 phase 1) ───────────────────
        if (_renderMuseumScene())      return;
        if (_renderGlobalLobbyScene()) return;
        if (_renderBigGambleScene())   return;

        // #51 — photo mode runs even while paused so the camera can pan.
        if (isPhotoMode()) tickPhotoMode();

        if (runState.gameRunning && !runState.gamePaused && !runState.isLevelingUp && !runState.isShopping && !runState.isStoryOpen) {
            _runGameplayFrame(deltaTime);
        }
    } finally {
        // #24/#30 P10 — record actual main-thread work time per frame.
        _recordPhase('frameWork', performance.now() - _frameT0);
    }
}

// Start save loading and DLC loading in parallel. Both feed the elemental
// loading ring in game.html via window.reportLoadingProgress so the user
// sees real motion instead of a generic spinner.
//   Weights — save read: 0.20, DLCs: 0.75, final fade-in jump: 1.00.
const _reportProgress = (p) => {
    if (typeof window.reportLoadingProgress === 'function') {
        window.reportLoadingProgress(p);
    }
};
const _saveReady = loadGame().then((r) => { _reportProgress(0.20); return r; });
const _dlcReady = window.dlcManager
    ? window.dlcManager.init({
        onProgress: (done, total) => {
            const ratio = total > 0 ? done / total : 1;
            _reportProgress(0.20 + 0.75 * ratio);
        }
    })
    : (_reportProgress(0.95), Promise.resolve());

// Called once both the intro (if any) is done AND both save + DLCs are loaded.
function _launchMenu() {
    Promise.all([_saveReady, _dlcReady]).then(() => {
        _reportProgress(1.0);
        if (typeof window.__loadingScreenCleanup === 'function') {
            window.__loadingScreenCleanup();
        }
        // If the loading screen is still visible (intro was off, or DLCs took longer
        // than the intro), fade it out gracefully before showing the menu.
        const loader = document.getElementById('loading-screen');
        if (loader && loader.style.display !== 'none' && loader.style.opacity !== '0') {
            loader.style.transition = 'opacity 0.5s';
            loader.style.opacity = '0';
            setTimeout(() => { loader.remove(); initMenu(); _maybeShowWhatsNew(); _maybeOfferCrashRecovery(); _maybeShowTelemetryConsent(); }, 500);
        } else {
            if (loader) loader.remove();
            initMenu();
            _maybeShowWhatsNew();
            _maybeOfferCrashRecovery();
            _maybeShowTelemetryConsent();
        }
    });
}

// GameLoop harness (Phase E of #1 split). audioManager.update() runs every
// rAF tick; masterFrame runs once per fixed 60 Hz frame.
const _gameLoop = createGameLoop({
    targetFps: FPS,
    onRafTick: () => {
        if (typeof audioManager !== 'undefined') audioManager.update();
        _updateSpeedrunHud();
    },
    onFrame:   (dt, ts) => masterFrame(dt, ts),
});
_gameLoop.start();

if (gameConfig.showIntroScreens) {
    // Hide the loading screen immediately — the intro-backdrop (already visible in HTML)
    // covers the canvas while the intro plays and DLCs load in background.
    const loader = document.getElementById('loading-screen');
    if (loader) loader.style.display = 'none';

    introManager.play(_launchMenu);
} else {
    // No intro: keep loading screen visible while DLCs load, then show menu.
    _launchMenu();
}

// OPTIONAL: Auto-save every 30 seconds
setInterval(() => {
    if (runState.gameRunning && !runState.gamePaused) {
        saveGame();
    }
}, 30000);

// #173 phase 10 — expose updateUI on window so the extracted leaf module
// `core/drawGameplayPost.js` can call it via `globalThis.updateUI`. Renderer-
// only path; server bridge's no-op stub never reaches the leaf.
if (typeof window !== 'undefined') window.updateUI = updateUI;

// #173 phase 9 follow-up — named exports for the four pure update/draw helpers
// so a server-side adapter (server/simulation/RendererBridge.js) can call them
// directly with no-op stubs for the draw halves. The renderer keeps using its
// usual side-effect-only module load path; these exports are the explicit API
// surface for the server bridge + future ECS tooling.
export {
    _updateGameplayPre,
    _updateGameplayMid,
    _drawGameplayMid,
    _drawGameplayPost,
    _runGameplayFrame,
};

// Expose module-scoped functions as globals so HTML onclick handlers can reach them.
window.skipTutorialPrompt  = skipTutorialPrompt;
window.acceptTutorialPrompt = acceptTutorialPrompt;
window.initMenu            = initMenu;
window.startGame           = startGame;
window.continueRun         = continueRun;
window.checkNewGame        = checkNewGame;
window.confirmNewGame      = confirmNewGame;
window.closeConfirmDialog  = closeConfirmDialog;
// Functions called from cross-file scripts (Altar.js, ChaosMode.js, UI/*) and
// from inline HTML onclick handlers. These look unused to ESLint because the
// references are out-of-file or in string attributes, but they need to live
// on window for the legacy script-tag load order.
// #194 follow-up — game.js-local functions called bare from other modules.
window.triggerStory        = triggerStory;
window.openAltar           = openAltar;
window.shuffleHero         = shuffleHero;
window.chooseUpgrade       = chooseUpgrade;
window.quitGame            = quitGame;
window.exitToDesktop       = exitToDesktop;
window.closeGame           = closeGame;
window.togglePause         = togglePause;
window.toggleCoopMode      = toggleCoopMode;
window.toggleLobbyMenu     = toggleLobbyMenu;
window.openDLCMenu         = openDLCMenu;
window.closeDLCMenu        = closeDLCMenu;
window.startDailyChallenge = startDailyChallenge;
window.startWeeklyChallenge = startWeeklyChallenge;
window.confirmDailyStart   = confirmDailyStart;
window.closeDailyInfo      = closeDailyInfo;
window.closeStory          = closeStory;
window.quitGlobalLobby     = quitGlobalLobby;
window.startOnlineTestArena = startOnlineTestArena;
window.exportSave          = exportSave;
window.importSave          = importSave;
window.openSaveBackups     = openSaveBackups;
window.closeSaveBackups    = closeSaveBackups;
window.closeWhatsNew       = closeWhatsNew;
window.startTestingGrounds = startTestingGrounds;
// Functions called as bare globals from TutorialMode.js, EvilMode.js, DLC files
window.showNotification    = showNotification;
window.openStory           = openStory;
window.advanceWave         = advanceWave;
window.checkAchievements   = checkAchievements;
window.saveGame            = saveGame;
window.gameOver            = gameOver;
window.getCoopTarget       = getCoopTarget;
window._syncSoundBiomeMusic = _syncSoundBiomeMusic;

// ── window.GAME_API — Formal DLC integration contract ──────────────────────
// Stable, documented entry point for DLC code. Existing DLCs read bare globals
// or window.X directly; new DLCs should prefer GAME_API for forward compatibility.
//
// Getters return live module variables; setters write through to the module
// variable so DLC mutations propagate. Function references are bound to game.js
// scope and safe to call from any module.
//
// Versioning: GAME_API.version matches APP_VERSION. When breaking changes ship,
// bump the major and surface a deprecation log here. DLCs can guard against
// missing keys with `GAME_API?.X ?? fallback`.
window.GAME_API = {
    version: APP_VERSION,

    // ── Live game state ──
    get wave()                  { return runState.wave; },
    set wave(v)                 { runState.wave = v; },
    get bossActive()            { return runState.bossActive; },
    set bossActive(v)           { runState.bossActive = v; },
    get enemiesKilledInWave()   { return runState.enemiesKilledInWave; },
    set enemiesKilledInWave(v)  { runState.enemiesKilledInWave = v; },
    get isPlayerDying()         { return runState.isPlayerDying; },
    set isPlayerDying(v)        { runState.isPlayerDying = v; },
    get currentObjective()      { return runState.currentObjective; },
    set currentObjective(v)     { runState.currentObjective = v; },
    get currentWeather()        { return runState.currentWeather; },
    set currentWeather(v)       { runState.currentWeather = v; },
    get activeMutators()        { return runState.activeMutators; },
    set activeMutators(v)       { runState.activeMutators = v; },

    // ── Mode flags ──
    get isCoopMode()            { return runState.isCoopMode; },
    get isAICompanionMode()     { return runState.isAICompanionMode; },
    get isOnlineMode()          { return runState.isOnlineMode; },
    get isOnlineGuest()         { return runState.isOnlineGuest; },
    get isOnlineHost()          { return runState.isOnlineHost; },
    get isVersusMode()          { return runState.isVersusMode; },
    get isDailyMode()           { return runState.isDailyMode; },
    set isDailyMode(v)          { runState.isDailyMode = v; },
    get isWeeklyMode()          { return runState.isWeeklyMode; },
    set isWeeklyMode(v)         { runState.isWeeklyMode = v; },
    get isChaosShuffleMode()    { return runState.isChaosShuffleMode; },
    set isChaosShuffleMode(v)   { runState.isChaosShuffleMode = v; },
    get isEvilMode()            { return runState.isEvilMode; },
    get isTutorialMode()        { return runState.isTutorialMode; },
    get isTestingMode()         { return runState.isTestingMode; },

    // ── Entity arrays (live references) ──
    get enemies()               { return enemies; },
    get projectiles()           { return projectiles; },
    get particles()             { return particles; },
    get floatingTexts()         { return floatingTexts; },
    get holyMasks()             { return holyMasks; },
    get goldDrops()             { return goldDrops; },
    get companions()            { return companions; },

    // ── Core actors ──
    get player()                { return runState.player; },
    get player2()               { return runState.player2; },
    get arena()                 { return arena; },

    // ── Helpers (bound to game.js) ──
    showNotification,
    createExplosion,
    advanceWave,
    triggerImpact,
    spawnLevelUpAura,
    getCoopTarget,
    openStory,
    gameOver,
    saveGame,
    checkAchievements,
    showAchievementNotif,

    // ── DLC registries (mutable; DLCs add entries on init) ──
    get HERO_LOGIC()            { return window.HERO_LOGIC; },
    get ENEMY_LOGIC()           { return window.ENEMY_LOGIC; },
    get BIOME_LOGIC()           { return window.BIOME_LOGIC; },

    // ── World context (shared with server simulation) ──
    get world()                 { return window._world; },
};
