'use strict';

/**
 * server/simulation/loader.js
 *
 * Loads real game-class files into the Node.js global scope.
 * Must be require()'d exactly ONCE (at server startup, before any GameSession
 * is created).  Subsequent require() calls are no-ops due to Node module cache.
 *
 * Strategy:
 *   - Class files (Player, Enemy, Arena, entities) now have UMD footers and are
 *     loaded with regular require(); their exports are assigned to globals.
 *   - DLC registration files do window.HERO_LOGIC[type] = {...} — with
 *     global.window = global these writes land in global.HERO_LOGIC.
 *   - Constants come from server/simulation/constants.js (Node-safe), never
 *     from the browser-only Constants.js.
 */

const path = require('path');
const ROOT = path.resolve(__dirname, '../../');

function g(relPath) {
    return require(path.join(ROOT, relPath));
}

// `require()`-of-ESM (Node 22.12+, native in Node 24) returns the module
// namespace object: `{ __esModule: true, default: Cls, Cls, ... }`. Entity
// files (Player.js, Enemy.js, etc.) now export their class as both `default`
// and a named export. This helper unwraps the class for `global.X` assignment.
function loadClass(relPath, namedExport) {
    const m = require(path.join(ROOT, relPath));
    if (m && m.__esModule) {
        return (namedExport && m[namedExport]) || m.default;
    }
    return m; // legacy CommonJS file (DLCs, shared/world.js)
}

// ── 1. Window / browser shim ──────────────────────────────────────────────────
global.window   = global;
global.canvas   = { width: 3000, height: 3000, getContext: () => _noopCtx };
// No-op canvas context: DLC heroes mix rendering into update(); swallow all
// canvas calls. The Proxy returns itself for every property access so chained
// dereferences (ctx.canvas.width) and method calls (ctx.save()) keep working.
// Symbol.toPrimitive is special-cased so arithmetic (`screenW / 2`) coerces to
// a number; without this, divisions on accidentally-fetched stub objects throw
// `Cannot convert object to primitive value`.
const _noopCtx = new Proxy(function () {}, {
    get(_target, prop) {
        if (prop === Symbol.toPrimitive) return (hint) => (hint === 'string' ? '' : 0);
        if (prop === 'valueOf')          return () => 0;
        if (prop === 'toString')         return () => '';
        return _noopCtx;
    },
    apply: ()  => _noopCtx,
    set:   ()  => true,
});
global.ctx = _noopCtx;
global.document = {
    getElementById: () => ({
        innerText: '', style: {}, innerHTML: '', src: '',
        addEventListener: () => {},
        classList: { add: () => {}, remove: () => {} },
    }),
};
global.Image = class { set src(_) {} };
// Audio constructor stub — AudioManager uses `new Audio(path)` for SFX preload.
// Server never plays audio so all methods are no-ops.
global.Audio = class {
    constructor(_src) {}
    play() { return Promise.resolve(); }
    pause() {}
    load() {}
    cloneNode() { return new global.Audio(); }
    addEventListener() {}
    removeEventListener() {}
    get currentTime() { return 0; }
    set currentTime(_) {}
    get duration() { return 0; }
    get paused() { return true; }
    get volume() { return 0; }
    set volume(_) {}
    get muted() { return true; }
    set muted(_) {}
    get loop() { return false; }
    set loop(_) {}
    get readyState() { return 4; }
    get error() { return null; }
};

// localStorage / sessionStorage shims so Config.js, SaveManager, etc. can
// `getItem`/`setItem` without crashing. In-memory map per process — survives
// across require() calls but doesn't persist across server restarts (server
// gameplay doesn't need persistence; renderer paths are unreachable here).
const _makeStorage = () => {
    const data = new Map();
    return {
        getItem: (k) => data.has(k) ? data.get(k) : null,
        setItem: (k, v) => data.set(k, String(v)),
        removeItem: (k) => data.delete(k),
        clear: () => data.clear(),
        get length() { return data.size; },
        key: (i) => [...data.keys()][i] ?? null,
    };
};
global.localStorage   = _makeStorage();
global.sessionStorage = _makeStorage();

// ── 2. Game constants (Node-safe server constants, not browser Constants.js) ──
const {
    BASE_HERO_STATS, UPGRADE_POOL,
    ARENA_WIDTH, ARENA_HEIGHT,
} = require('./constants');

global.BASE_HERO_STATS = BASE_HERO_STATS;
global.UPGRADE_POOL    = UPGRADE_POOL;
global.ARENA_WIDTH     = ARENA_WIDTH;
global.ARENA_HEIGHT    = ARENA_HEIGHT;

// Additional stubs Player constructor touches but aren't needed on server:
global.CHAOS_EFFECTS   = [];
global.ELITE_TYPES     = [];
global.ACHIEVEMENTS    = [];

// ── 3. Per-session game-state globals (stubs; synced from world each tick) ────
// Player constructor reads these globals — they're overwritten before each
// new Player() call via the global.canvas dimension fix above.

// saveData: Proxy returns default hero save-data for unknown hero types so that
// getHeroStats() never crashes on prestige/unlocked access.
global.saveData = new Proxy({
    metaUpgrades: { greed: 0, health: 0, power: 0, swift: 0, defense: 0, wisdom: 0 },
    chaos: { active: [] },
    global: { unlockedAchievements: [], totalDamage: 0 },
    collection: [],
    story: { enabled: false },
    altar: { active: [] },
}, {
    get(target, prop) {
        if (prop in target) return target[prop];
        return { prestige: 0, unlocked: 0 }; // default hero data for any type
    },
});

global.player           = null;
global.player2          = null;
global.wave             = 1;
global.frame            = 0;
global.arena            = { width: ARENA_WIDTH, height: ARENA_HEIGHT, camera: { x: 0, y: 0 }, checkCollision: () => false };
global.enemies          = [];
global.projectiles      = [];
global.particles        = [];
global.floatingTexts    = [];
global.goldDrops        = [];
global.companions       = [];
global.memoryShards     = [];
global.meleeAttacks     = [];
// powerUps removed in #5 phase 5.1 — now lives on runState as typed arrays.
global.keys             = null;
global.mouse            = null;
global.bossActive       = false;
global.isLevelingUp     = false;
global.isShopping       = false;
global.gamePaused       = false;
global.isCoopMode       = true;
global.isAICompanionMode = false;
global.isEvilMode       = false;
global.isOnlineHost     = false;
global.isChaosShuffleMode = false;
global.isTutorialMode   = false;
global.isPlayerDying    = false;
global.isDailyMode      = false;
global.isWeeklyMode     = false;
global.isVersusMode     = false;
global.activeMutators   = [];
global.forcedEnemyType  = null;
global.currentObjective = null;
global.currentWeather   = null;
global.currentRunStats  = {
    missilesFired: 0, meleeHits: 0, damageDealt: 0,
    damageTaken: 0, goldCollected: 0, enemiesKilled: 0,
    maxCombo: 0, _noHitBaseline: 0,
};
global.audioManager     = undefined; // undefined → `typeof audioManager !== 'undefined'` is false

// ── 4. Stub functions ─────────────────────────────────────────────────────────
global.createExplosion   = () => {};
global.showNotification  = () => {};
global.getDecoyTarget    = () => null;
global.getBiomeEnemyType = () => null;
global.getCoopTarget     = (x, y) => {
    const p1 = global._world?.player  ?? global.player;
    const p2 = global._world?.player2 ?? global.player2;
    if (!p1 && !p2) return null;
    if (!p1) return p2;
    if (!p2) return p1;
    const d1 = Math.hypot(p1.x - x, p1.y - y);
    const d2 = Math.hypot(p2.x - x, p2.y - y);
    return d1 <= d2 ? p1 : p2;
};
global.getCollectionBonuses = () => ({
    damageMult: 1, speedMult: 1, healthMult: 1, goldMult: 1, xpMult: 1,
    meleeDmg: 0, rangeDmg: 0, maxHp: 0, speed: 0, defense: 0, luck: 0,
});
global.isChaosActive     = () => false;
global.checkChaosEvent   = () => {};
global.triggerImpact     = () => {};
global.togglePause       = () => {};
global.triggerStory      = () => {};
global._stopWeather      = () => {};
global.EvilMode          = { getXpMultiplier: () => 1 };
global.TutorialMode      = null;
global.HERO_LOGIC        = {};
global.ENEMY_LOGIC       = {};
global.BIOME_LOGIC       = {};
// SoundHero reads window.SYMPHONY_STATE for its totem system
global.SYMPHONY_STATE    = { _lastWave: null, totems: [], totemsConquered: 0, onBeat: false };

// getHeroStats() calls this for skill-tree bonuses; return empty tree (unlocked=0 skips loop)
global.generateHeroSkillTree = () => ({});

// Stub level-up UI so Player.levelUp() doesn't crash on server
global.levelUpUI         = null;
global.spawnLevelUpAura  = () => {};

// HumanController stub — Player constructor calls new HumanController(0) for non-CPU players.
// Server always passes isCPU=true so this is only a safety net.
global.HumanController = class {
    constructor() { this.gamepadIndex = 0; }
    getInput() {
        return { x: 0, y: 0, aimAngle: 0, usingGamepad: false,
                 shoot: false, melee: false, dash: false, special: false, pause: false };
    }
};

// ── 5. Load shared World class ────────────────────────────────────────────────
global.World = loadClass('shared/world', 'World');

// ── 6. Load entity classes (ESM since 2026-05-11; unwrap default export) ─────
global.Projectile   = loadClass('Entities/Projectile',   'Projectile');
global.FloatingText = loadClass('Entities/FloatingText', 'FloatingText');
global.GoldDrop     = loadClass('Entities/GoldDrop',     'GoldDrop');
global.Particle     = loadClass('Entities/Particle',     'Particle');
global.MeleeSwipe   = loadClass('Entities/MeleeSwipe',   'MeleeSwipe');

// ── 7. Load core game classes ─────────────────────────────────────────────────
// Player.js defines window.getHeroStats at the bottom — with global.window = global
// this becomes global.getHeroStats, which is required by the Player constructor.
global.Player = loadClass('Player', 'Player');
global.Enemy  = loadClass('Enemy',  'Enemy');
global.Arena  = loadClass('Arena',  'Arena');

// ── 8. Load DLC HERO_LOGIC registries ─────────────────────────────────────────
// These files do:  window.HERO_LOGIC[type] = { ... }
// With global.window = global, they write to global.HERO_LOGIC.
// They also self-register BASE_HERO_STATS entries where needed (e.g. VoidHero.js).
g('EvilHeroes');
g('dlc/symphony_of_sickness/PoisonHero');
g('dlc/symphony_of_sickness/SoundHero');
g('dlc/waker_of_winds/AirHero');
g('dlc/faith_of_fortune/ChanceHero');
g('dlc/faith_of_fortune/SpiritHero');
g('dlc/champions_of_chaos/VoidHero');
g('dlc/champions_of_chaos/GravityHero');
g('dlc/tournament_of_thunder/LightningHero');
g('dlc/echos_of_eternity/LoveHero');
g('dlc/rise_of_the_rock/EarthHero');
g('dlc/echos_of_eternity/TimeHero');

// Files that expose via window.XxxHero but don't self-register to HERO_LOGIC
// (their DLC index.js does that in the browser — we do it here instead).
if (global.LoveHero)      global.HERO_LOGIC['love']      = global.LoveHero;
if (global.EarthHero)     global.HERO_LOGIC['earth']     = global.EarthHero;
if (global.TimeHero)      global.HERO_LOGIC['time']      = global.TimeHero;
// LightningHero.js sets window.LightningHero but then overwrites HERO_LOGIC['lightning']
// with only { applyUpgrade }; restore the full class so Player.init() finds init().
if (global.LightningHero) global.HERO_LOGIC['lightning'] = global.LightningHero;

// ── 9. Renderer helper stubs (#173) ──────────────────────────────────────────
// game.js exports _updateGameplayPre / _updateGameplayMid / _drawGameplayMid /
// _drawGameplayPost as the four pure halves of a frame. The server simulation
// drives the update halves via RendererBridge.js and never wants the draws.
// These no-ops let any future code path that calls the draw helpers (e.g. if
// the renderer is fully bridged in) early-return cleanly with no canvas work.
global._drawGameplayMid  = () => {};
global._drawGameplayPost = () => {};
