'use strict';

// Load real game classes into global scope (runs once; subsequent requires are cached).
require('./loader');

// Local copy of `mulberry32` from `Utils.js` — that module is ESM and can't
// be `require()`'d from this CJS file without an adapter. Bit-for-bit
// identical so renderer-side seed + server-side seed produce the same
// stream when phase 3f wires netplay determinism end-to-end.
function _mulberry32(seed) {
    let s = seed >>> 0;
    return function () {
        s |= 0; s = (s + 0x6D2B79F5) | 0;
        let t = Math.imul(s ^ (s >>> 15), 1 | s);
        t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
        return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
}

const World = global.World;
const NetworkInputController = require('./NetworkInputController');
const { createSessionBiomes, SERVER_BIOMES } = require('./biomes');
const { DLC_BIOMES, isStoryBossWave: _isStoryBossWave } = require(require('path').join(__dirname, '..', '..', 'Wave.js'));
const { startObjective: _startObjective } = require(require('path').join(__dirname, '..', '..', 'core', 'objectives.js'));
const { spawnHolyMask: _spawnHolyMask } = require(require('path').join(__dirname, '..', '..', 'core', 'systems', 'holyMaskSystem.js'));
const { performance } = require('perf_hooks'); // monotonic clock for the tick scheduler
const {
    ARENA_WIDTH,
    ARENA_HEIGHT,
    TICK_MS,
    TICK_FRAMES,
} = require('./constants');
// Level-up picks change stats through the same code as singleplayer's
// level-up screen (UI/LevelUp.js).
const { applyUpgrade: _applyUpgradeShared } = require(require('path').join(__dirname, '..', '..', 'core', 'upgrades.js'));
// WaveManager retired (phase 3h.2 closed step 3; bridge owns spawn).
// Tests poke `gs._waveManager._lastSpawnMs` removed in this commit.

// Per-session `runState`. RunState.js exports a Proxy that forwards
// to whichever object `setActiveRunState(rs)` last installed. GameSession
// creates its own instance on construct, then activates it for the
// duration of each `_tick` so the leaf modules' `runState.X` accesses
// resolve to this session's state — required for >1 concurrent match
// on the same server process. ESM-from-CJS require works because Node
// 24+ honors `__esModule` interop on the cached module.
const { createRunState: _createRunState, setActiveRunState: _setActiveRunState }
    = require(require('path').join(__dirname, '..', '..', 'RunState.js'));

// Skip a client's snapshot while its socket still has this much unsent data
// queued (slow / congested link) — sending more only grows the backlog.
const SNAPSHOT_BACKPRESSURE_BYTES = 64 * 1024;
// Events queued for a client whose snapshots are being skipped are capped.
const SNAPSHOT_MAX_QUEUED_EVENTS  = 200;

// ── Arena layout (uploaded by the online host) ──────────────────────────────
// The host generates the arena exactly like singleplayer (seeded, incl. DLC
// biome hooks the server can't run) and uploads `Arena.serializeLayout()`.
// The server validates it and simulates on a real Arena built from it.
const LAYOUT_MAX_OBSTACLES = 200;
const LAYOUT_MAX_ZONES     = 80;
const LAYOUT_MAX_TRAPS     = 60;
const LAYOUT_TRAP_TYPES    = new Set(['SLOW', 'CONVEYOR', 'SPIKE', 'TURRET', 'LASER_BEAM', 'TELEPORTER']);
// Reference client viewport (Steam Deck). The server has no screen; its
// arena camera uses this size so camera-relative gameplay — enemies spawn
// just off the view (Enemy.js) — matches singleplayer instead of treating the
// whole 3000² map as "on screen" (which spawned enemies outside the walls).
const SERVER_VIEW_W = 1280;
const SERVER_VIEW_H = 800;

// ── Player progression (uploaded by each client at match start) ────────────
// Singleplayer heroes are built from the save: permanent upgrades, prestige,
// unlocked skill-tree nodes, achievement bonuses, chaos and altar picks. The
// server had none of that and simulated everyone at base stats while clients
// predicted with their real ones (speed upgrades → rubber-banding). Each
// client now sends that slice of its save; it is validated here and the
// player is built through the same Player / getHeroStats code with it.
const {
    ACHIEVEMENTS: _ACHIEVEMENTS, CHAOS_EFFECTS: _CHAOS_EFFECTS, COLLECTOR_CARDS: _COLLECTOR_CARDS,
    PERM_UPGRADES: _PERM_UPGRADES, SKILL_TREE_SIZE: _SKILL_TREE_SIZE,
} = require(require('path').join(__dirname, '..', '..', 'Constants.js'));
const { ALTAR_TREE: _ALTAR_TREE } = require(require('path').join(__dirname, '..', '..', 'AltarData.js'));
// Story mode: the next wave starts once the host's arena arrives, which is
// after both players read the chapter — wait for that, not the 5 s default.
const STORY_HOLD_MS = 15 * 60 * 1000;
const LOADOUT_PRESTIGE_MAX = 50;   // sanity bounds, not balance limits
const LOADOUT_META_MAX     = 200;
const _DEFAULT_SAVE = global.saveData; // loader's default-save Proxy

function _sanitizeLoadout(hero, raw) {
    if (!raw || typeof raw !== 'object') return null;
    const int = (v, lo, hi) => (Number.isInteger(v) && v >= lo && v <= hi) ? v : 0;
    const ids = (arr, known, max) => (Array.isArray(arr)
        ? [...new Set(arr.filter(x => typeof x === 'string' && known.has(x)))].slice(0, max)
        : []);
    const knownAch   = new Set(_ACHIEVEMENTS.map(a => a.id));
    const knownChaos = new Set(_CHAOS_EFFECTS.map(e => e.id));
    const knownAltar = new Set(Object.values(_ALTAR_TREE).flat().map(n => n.id));
    const knownCards = new Set(Object.keys(_COLLECTOR_CARDS));
    const rec  = (raw[hero] && typeof raw[hero] === 'object') ? raw[hero] : {};
    const meta = {};
    for (const k of Object.keys(_PERM_UPGRADES)) meta[k] = int(raw.metaUpgrades && raw.metaUpgrades[k], 0, LOADOUT_META_MAX);
    // Unknown keys (other heroes, …) fall through to the defaults.
    return Object.assign(Object.create(_DEFAULT_SAVE), {
        [hero]: {
            level:    int(rec.level, 0, 1e7),
            unlocked: int(rec.unlocked, 0, _SKILL_TREE_SIZE),
            prestige: int(rec.prestige, 0, LOADOUT_PRESTIGE_MAX),
        },
        metaUpgrades: meta,
        global:  { unlockedAchievements: ids(raw.global && raw.global.unlockedAchievements, knownAch, 2000), totalDamage: 0 },
        chaos:   { active: ids(raw.chaos && raw.chaos.active, knownChaos, 50) },
        altar:   { active: ids(raw.altar && raw.altar.active, knownAltar, 100) },
        collection: ids(raw.collection, knownCards, 1000),
        story:   { enabled: false },
    });
}

// Returns a normalized copy of an uploaded layout, or null if anything is
// malformed / out of range (the whole upload is rejected, never partially used).
function _sanitizeArenaLayout(raw, W, H) {
    if (!raw || typeof raw !== 'object') return null;
    const num = (v, lo, hi) => (typeof v === 'number' && Number.isFinite(v) && v >= lo && v <= hi) ? v : null;
    const tag = (v) => (typeof v === 'string' && v.length > 0 && v.length <= 40) ? v : null;
    const list = (v, max) => (v === undefined ? [] : (Array.isArray(v) && v.length <= max ? v : null));
    const obstacles = list(raw.obstacles, LAYOUT_MAX_OBSTACLES);
    const zones     = list(raw.biomeZones, LAYOUT_MAX_ZONES);
    const traps     = list(raw.traps, LAYOUT_MAX_TRAPS);
    if (!obstacles || !zones || !traps) return null;
    const rect = (o) => {
        if (!o || typeof o !== 'object') return null;
        const x = num(o.x, -W, 2 * W), y = num(o.y, -H, 2 * H);
        const w = num(o.w, 0, 2 * W),  h = num(o.h, 0, 2 * H);
        return (x === null || y === null || w === null || h === null) ? null : { x, y, w, h };
    };
    const out = { biomeType: null, obstacles: [], biomeZones: [], traps: [] };
    if (raw.biomeType != null && !(out.biomeType = tag(raw.biomeType))) return null;
    for (const o of obstacles) {
        const r = rect(o);
        if (!r) return null;
        if (o.biomeType != null) { if (!(r.biomeType = tag(o.biomeType))) return null; }
        if (o.solid === false) r.solid = false;
        out.obstacles.push(r);
    }
    for (const z of zones) {
        const r = rect(z);
        if (!r || !(r.type = tag(z.type))) return null;
        out.biomeZones.push(r);
    }
    for (const t of traps) {
        if (!t || typeof t !== 'object' || !LAYOUT_TRAP_TYPES.has(t.type)) return null;
        const x = num(t.x, -W, 2 * W), y = num(t.y, -H, 2 * H);
        if (x === null || y === null) return null;
        const e = { x, y, type: t.type, timer: num(t.timer, -1e6, 1e6) ?? 0, active: t.active !== false };
        if (t.angle !== undefined) { if ((e.angle = num(t.angle, -1e6, 1e6)) === null) return null; }
        if (t.vx !== undefined || t.vy !== undefined) {
            e.vx = num(t.vx, -20, 20); e.vy = num(t.vy, -20, 20);
            if (e.vx === null || e.vy === null) return null;
        }
        if (t.pairIndex !== undefined) {
            if (!Number.isInteger(t.pairIndex) || t.pairIndex < 0 || t.pairIndex >= traps.length) return null;
            e.pairIndex = t.pairIndex;
        }
        out.traps.push(e);
    }
    return out;
}

// A boss's state the client draws (phase look, shield, attack telegraphs,
// goblin bombs, Makuta's channel) — omitted while at the default.
function _bossVisuals(b) {
    const v = {};
    if (b.phase && b.phase !== 1) v.ph = b.phase;
    if (b.immune) v.im = 1;
    if (b.state) v.st = b.state;
    if (b.telegraphTimer > 0 && b.telegraphData) {
        const t = b.telegraphData;
        v.tg = [Math.round(t.x), Math.round(t.y), Math.round(t.radius || 0), t.type, b.telegraphTimer];
    }
    if (b.pendingBombs && b.pendingBombs.length) {
        v.bb = b.pendingBombs.map(k => [Math.round(k.x), Math.round(k.y), k.timer, k.maxTimer, k.radius]);
    }
    if (b.mkState && b.mkState !== 'IDLE') v.ms = b.mkState;
    return v;
}

// The gameplay part of a story chapter the host sent (STORY_EVENT): which
// boss, biome, layout, spawn overrides. Text and art stay on the clients.
// Returns null if malformed.
function _sanitizeStoryEvent(raw) {
    if (!raw || typeof raw !== 'object') return null;
    const tag = (v) => (typeof v === 'string' && v.length > 0 && v.length <= 64) ? v : undefined;
    const ev = { id: tag(raw.id), type: tag(raw.type) || 'NARRATIVE', hero: tag(raw.hero), data: {} };
    const d = (raw.data && typeof raw.data === 'object') ? raw.data : {};
    for (const k of ['biome', 'layout', 'trap', 'bossId', 'forcedEnemyType', 'mazeNodeId']) {
        if (tag(d[k]) !== undefined) ev.data[k] = d[k];
    }
    if (d.suppressMinions) ev.data.suppressMinions = true;
    if (typeof d.spawnRateMod === 'number' && d.spawnRateMod > 0 && d.spawnRateMod <= 10) ev.data.spawnRateMod = d.spawnRateMod;
    return ev;
}

// The objective HUD the clients draw (type, progress, sapling / storm eye).
function _objectiveView(o) {
    if (!o) return null;
    const v = { type: o.type, state: o.state, current: Math.round((o.current || 0) * 10) / 10, target: o.target };
    const d = o.data || {};
    if (d.sapling) v.sapling = { x: d.sapling.x, y: d.sapling.y, hp: Math.round(d.sapling.hp), maxHp: d.sapling.maxHp, radius: d.sapling.radius };
    if (d.stormEye) v.stormEye = { x: Math.round(d.stormEye.x), y: Math.round(d.stormEye.y), radius: d.stormEye.radius };
    return v;
}

function _useVirtualViewport(arena) {
    const cam = arena.updateCamera.bind(arena);
    const two = arena.updateCameraForTwo.bind(arena);
    arena.updateCamera       = (p) => cam(p, SERVER_VIEW_W, SERVER_VIEW_H);
    arena.updateCameraForTwo = (a, b) => two(a, b, SERVER_VIEW_W, SERVER_VIEW_H);
    arena.camera.width  = SERVER_VIEW_W;
    arena.camera.height = SERVER_VIEW_H;
}

/**
 * GameSession — authoritative server-side game simulation.
 *
 * One instance per active online match. The server calls:
 *   session.init(hostHero, guestHero)    → starts the 20 Hz tick loop
 *   session.applyInput(role, input)      → accept inputs from either client
 *   session.applyLevelUpChoice(role, id) → resume after a level-up choice
 *   session.stop()                       → clear the interval and release state
 *
 * Phase 6 changes vs previous version:
 *   - Each session owns a World.createServerWorld() instance.
 *   - Players are real Player class instances (correct stats + DLC init hooks).
 *   - Player.update() is called every tick — movement, DLC update hooks,
 *     and combat actions (shoot/melee/dash/special) are dispatched via
 *     NetworkInputController reading player.moveInput / _pendingXxx.
 *   - Player.shoot() and Player.melee() create real Projectile/MeleeSwipe
 *     objects; the leaf-module bridge (`core/updateGameplayMid.js`) handles
 *     their movement, collision, and damage application server-side.
 *   - Snapshot schema is unchanged — client-side _onlineApplySnapshot() works
 *     with zero modifications.
 *
 * p1 = lobby host player, p2 = lobby guest player.
 */
class GameSession {
    constructor(lobby, sendFn, opts = {}) {
        this._lobby  = lobby;  // { host: {ws, userId, …}, guest: {ws, userId, …} }
        this._send   = sendFn; // send(ws, msgObject)
        this._onTickStats = opts.onTickStats || null; // (wave, score, timeSec) => void
        this._onGameOverCb = opts.onGameOver || null; // (isVictory) => void — match ended
        this._ended       = false;
        // Wall-clock input staleness (ms). A client that stops sending INPUT
        // (paused frame, tab throttled, stall) would otherwise keep its last
        // movement forever and run off on the server, then snap back. Opt-in:
        // 0 = off, so test harnesses (sparse applyInput + virtual clock) stay
        // deterministic. server.js enables it for live sessions.
        this._inputTimeoutMs = opts.inputTimeoutMs || 0;
        // Hold the simulation at match start until the host's arena layout
        // arrives (up to this long), so nothing is simulated on the flat stub
        // arena first. Opt-in: 0 = start immediately (tests / harnesses).
        this._awaitLayoutMs       = opts.awaitLayoutMs || 0;
        this._awaitingLayoutUntil = 0;
        this.arenaLayout          = null; // sanitized layout once received
        this.arenaLayoutHash      = 0;
        this.arenaLayoutWave      = 0;
        // Match start also waits for both players' progression (opt-in, like
        // awaitLayoutMs) so neither hero is simulated at base stats first.
        this._awaitLoadouts       = !!opts.awaitLoadouts;
        this._loadoutsIn          = [false, false];
        this._clientBiomes        = [null, null]; // DLC biomes each client can play
        this._layoutReady         = false;

        // ── World instance ─────────────────────────────────────────────────────
        this._world = World.createServerWorld();
        this._world.isCoopMode = true;
        this._world.HERO_LOGIC  = global.HERO_LOGIC;
        this._world.ENEMY_LOGIC = global.ENEMY_LOGIC;
        this._world.saveData    = global.saveData;
        this._world.currentRunStats = {
            missilesFired: 0, meleeHits: 0, damageDealt: 0,
            damageTaken: 0, goldCollected: 0, enemiesKilled: 0,
            maxCombo: 0, _noHitBaseline: 0,
        };
        // createExplosion pushes a visual event; server uses it for enemy-death particles
        this._world.createExplosion = (x, y, color) => {
            this._events.push({ type: 'enemy_death', x, y, color });
        };
        // showNotification relays UI messages to both clients via the event queue
        this._world.showNotification = (msg, color) => {
            this._events.push({ type: 'notification', msg, color });
        };
        // No-op audioManager: DLC heroes guard with `typeof audioManager !== 'undefined'`,
        // which passes for null (typeof null === 'object'). Stub avoids the crash.
        // Every method is a no-op (see loader.js `silentAudioManager`) — a
        // hand-listed subset crashed the tick on the first level-up
        // (`playHeroExclamation`) once enemies could actually be killed.
        this._world.audioManager = global.silentAudioManager;
        // Flat arena — no obstacles on the server (pure collision boundary).
        // Leaf modules (`core/updateGameplayPre.js` via RendererBridge) call
        // `arena.update(player)` / `arena.updateCamera(player, w, h)` / etc.
        // Stub them as no-ops; the camera has zero meaning server-side.
        this._world.arena = {
            width:          ARENA_WIDTH,
            height:         ARENA_HEIGHT,
            camera:         { x: 0, y: 0, width: ARENA_WIDTH, height: ARENA_HEIGHT },
            checkCollision: () => false,
            update:             () => {},
            applyToPlayer:      () => {},
            updateCamera:       () => {},
            updateCameraForTwo: () => 1.0,
            draw:               () => {},
            obstacles:          [],
            biomeZones:         [],
        };

        // ── Session state ──────────────────────────────────────────────────────
        this.players      = [null, null]; // [hostPlayer, guestPlayer]
        this.enemies      = [];
        this.projectiles  = [];
        this.wave         = 1;
        this.score        = 0;
        this.bossActive   = false;
        this.isLevelingUp = false;
        this.paused       = false; // set by server.js during a reconnect grace window

        this._events             = []; // flushed each snapshot
        this._levelUpFor         = -1; // index of player currently choosing upgrade
        this._levelUpQueue       = []; // level-ups waiting to be offered: { idx, options }
        this._nextEnemyId        = 1;
        this._nextProjId         = 1;
        this._frame              = 0;  // virtual 60-fps frame counter
        this._waveKillTarget     = 30;

        // Delta encoding state, one entry per client socket (see
        // _clientSnapState): ids already described to that client (static
        // fields ship once), last x/y it reconstructed per id (so snapshots
        // emit `dx, dy` — typically -10..+10 = 2–3 char JSON tokens — instead
        // of absolute `x, y`), last hp shipped, and a keyframe counter. A full
        // keyframe is forced every _KEYFRAME_INTERVAL snapshots per client.
        this._snapStates = new Map(); // ws → state
        this._KEYFRAME_INTERVAL = 30; // 0.5 s at 60 Hz, 1 s at 30 Hz

        this._tickInterval = null;
        this._startedAt    = 0;

        // Variable tick rate — tri-state: 60 Hz at low load, 30 Hz nominal,
        // 20 Hz under heavy load. TICK_FRAMES scales with tick duration so
        // simulated game speed stays constant.
        this._currentTickMs     = TICK_MS;
        this._currentTickFrames = TICK_FRAMES;
        // Hysteresis to prevent flapping at the boundary
        this._HIGH_LOAD_ENTER = 180; // enemies + projectiles
        this._HIGH_LOAD_EXIT  = 140;
        this._SLOW_TICK_MS    = 50; // 20 Hz
        // Tier 1b — bump to 60 Hz when the world is calm. Halves the
        // authoritative-state gap clients see between snapshots, which is the
        // main source of rubber-band feel at low entity counts. Bandwidth
        // cost absorbed by dx/dy deltas + permessage-deflate.
        this._LOW_LOAD_ENTER  = 50;  // enemies + projectiles
        this._LOW_LOAD_EXIT   = 80;
        this._FAST_TICK_MS    = 16;  // ~60 Hz
        // Scheduler backlog cap. Short event-loop stalls are caught up (clients
        // already predicted those frames — dropping them left a lasting
        // client-vs-server offset); only a longer stall (sleep, debugger) is
        // dropped instead of replayed as a burst.
        this._TICK_MAX_LAG_MS = 250; // ≈ 15 frames
        this._nextTickAt      = 0;   // performance.now() deadline of the next tick

        // Per-session `runState`. Own typed-array pools + scalars
        // so concurrent sessions don't share entity slots / wave counters
        // / RNG state. Activated for the duration of each `_tick` via
        // `setActiveRunState`; the leaf-module Proxy read from
        // RunState.js forwards to whichever session is currently active.
        this._runState = _createRunState();
        // This match's own DLC biome logic (timers, hazards, wind — never
        // shared with another match); the bridge installs it as BIOME_LOGIC.
        this._biomes = createSessionBiomes();
        // Two players with their own saves and wallets: both pick up gold,
        // and save-side kill rewards (achievements, cards, masks) are each
        // client's — the shared update code leaves those to them.
        this._runState.perPlayerLoot = true;
        // Every kill → a `kill` event (who killed it, what it was): clients
        // play the death burst and grant their own save-side rewards.
        // Loot that changes the simulation and must be granted on one
        // player's screen (the True Golden Mask's stat boost).
        this._runState.lootListener = (kind, player) => {
            const by = this.players.indexOf(player);
            if (by >= 0) this._events.push({ type: kind, by: by === 0 ? 'host' : 'guest' });
        };
        this._runState.killListener = (enemy, killer, k) => {
            const by = this.players.indexOf(killer);
            const ev = { type: 'kill', x: Math.round(enemy.x), y: Math.round(enemy.y), sub: k.subType, color: enemy.color };
            if (k.isBoss)  { ev.boss = k.type; if (k.bossLabel) ev.label = k.bossLabel; }
            if (k.eliteId) ev.elite = k.eliteId;
            if (by >= 0)   ev.by = by === 0 ? 'host' : 'guest';
            this._events.push(ev);
        };
    }

    // 60 fps frames one tick simulates at the current tier (16 ms → 1,
    // 33 ms → 2, 50 ms → 3).
    _subSteps() {
        return Math.max(1, Math.round(this._currentTickFrames));
    }

    _adjustTickRate() {
        const load = this.enemies.length + this.projectiles.length;
        const cur = this._currentTickMs;
        let next = cur;
        // Tier 1b — tri-state: FAST (60 Hz) → NOMINAL (30 Hz) → SLOW (20 Hz).
        // Each transition has its own enter/exit threshold to prevent flapping
        // when load hovers around a boundary.
        if (cur === this._FAST_TICK_MS) {
            if (load >= this._HIGH_LOAD_ENTER)       next = this._SLOW_TICK_MS;
            else if (load >= this._LOW_LOAD_EXIT)    next = TICK_MS;
        } else if (cur === TICK_MS) {
            if (load >= this._HIGH_LOAD_ENTER)       next = this._SLOW_TICK_MS;
            else if (load <= this._LOW_LOAD_ENTER)   next = this._FAST_TICK_MS;
        } else { // SLOW
            if (load <= this._LOW_LOAD_ENTER)        next = this._FAST_TICK_MS;
            else if (load <= this._HIGH_LOAD_EXIT)   next = TICK_MS;
        }
        if (next !== cur) {
            this._currentTickMs     = next;
            this._currentTickFrames = next / (1000 / 60);
            console.log(`[GameSession ${this._lobby.code}] tick rate → ${Math.round(60 / this._subSteps())} Hz (load=${load})`);
        }
    }

    // ─── Public API ─────────────────────────────────────────────────────────────

    init(hostHero, guestHero, mode = 'NORMAL') {
        this._isVersusMode = (mode === 'VERSUS');
        this._world.isVersusMode = this._isVersusMode;
        // Story mode: chapters between waves (clients), story bosses /
        // objectives / overrides (here). The match-wide save says so, which
        // also turns the twin-boss roll off, as in a singleplayer story run.
        this._isStoryMode = (mode === 'STORY');
        this._storyEvent = null;        // { wave, event } — the host's chapter for that wave
        this._storyWavePending = false; // set up the story wave on the next tick
        if (this._isStoryMode) {
            this._world.saveData = Object.assign(Object.create(_DEFAULT_SAVE), { story: { enabled: true } });
            if (this._awaitLayoutMs > 0) this._awaitLayoutMs = Math.max(this._awaitLayoutMs, STORY_HOLD_MS);
        }

        // Activate this session's runState for the duration of init().
        // Player constructor + DLC hero init hooks read `runState.X` during
        // construction (e.g. assigning the player ref onto runState, reading
        // current biome). Without activation those reads + writes target the
        // default singleton state — leaks into other sessions.
        const _prevRunState = _setActiveRunState(this._runState);

        // Reset slot counts on this session's runState so a fresh init is
        // clean. Without this, slot data from a hot-reload or prior init
        // (typed-array x/y/hp from `enemies.push` / `Projectile.acquire`)
        // remains addressable via `runState.<thing>Count > 0` and gets
        // iterated by leaf-module collision loops the next time
        // `bridge.runUpdate` fires.
        this._resetEcsState();

        // Sync canvas dimensions so Player constructor gets correct spawn coords
        global.canvas = { width: ARENA_WIDTH, height: ARENA_HEIGHT };

        const s1 = this._spawnPoint(0), s2 = this._spawnPoint(1);
        const p1 = this._createPlayer(hostHero, s1.x, s1.y);
        const p2 = this._createPlayer(guestHero, s2.x, s2.y);

        this._world.player  = p1;
        this._world.player2 = p2;
        this.players = [p1, p2];

        // Wire world arrays (player.shoot() pushes to these)
        this._world.enemies     = this.enemies;
        this._world.projectiles = this.projectiles;

        this._startedAt = Date.now();
        if (this._awaitLayoutMs > 0) this._awaitingLayoutUntil = performance.now() + this._awaitLayoutMs;
        // Self-rescheduling tick on a wall-clock deadline. Each tick advances
        // `_subSteps()` 60 fps frames, so the next deadline moves by exactly that
        // much simulated time — the sim runs at a true 60 fps on every tier.
        // (Re-arming `setTimeout(_currentTickMs)` after the work ran ~4–7 %
        // slow, 55–58 fps, and the 16 ms tier 4 % fast; clients predict at 60,
        // so they drifted ahead and were pulled back.) A backlog beyond
        // _TICK_MAX_LAG_MS (event-loop stall) is dropped instead of replayed
        // as a burst.
        const FRAME_MS = 1000 / 60;
        this._nextTickAt = performance.now() + this._subSteps() * FRAME_MS;
        const scheduleNext = () => {
            const delay = Math.max(0, this._nextTickAt - performance.now());
            this._tickInterval = setTimeout(() => {
                const steps = this._subSteps(); // before _tick — it may retune the rate
                // A throw here is uncaught (timer callback) and would take the
                // whole server — every match — down. Log it and keep ticking.
                try { this._tick(); }
                catch (err) { console.error(`[GameSession ${this._lobby.code}] tick failed:`, err); }
                this._nextTickAt += steps * FRAME_MS;
                const now = performance.now();
                if (now - this._nextTickAt > this._TICK_MAX_LAG_MS) this._nextTickAt = now;
                if (this._tickInterval !== null) scheduleNext();
            }, delay);
        };
        scheduleNext();

        // Leave this session's runState ACTIVE after init() returns.
        // Tests + external callers between ticks expect `global.runState`
        // (which is the Proxy) to forward to the most-recently-initialized
        // session's state. `_tick` does its own activate+restore per
        // invocation, so concurrent sessions still alternate cleanly.
        // `_prevRunState` retained for diagnostics; not restored.
        void _prevRunState;
    }

    // Match-start spot of player `i` (0 = host, left; 1 = guest, right):
    // ±300 px in co-op, ±800 px in versus as local 2P versus. The clients
    // place themselves the same way (game.js _placeOnlineSpawn).
    _spawnPoint(i) {
        const off = this._isVersusMode ? 800 : 300;
        return { x: ARENA_WIDTH / 2 + (i === 0 ? -off : off), y: ARENA_HEIGHT / 2 };
    }

    /**
     * Create a real Player instance for server-side simulation.
     * isCPU = true suppresses DOM access in setupSpecial().
     */
    _createPlayer(heroType, x, y, save = null) {
        // HERO_LOGIC.init() falls back to window._world when no world arg is passed;
        // set global._world so that lookup resolves to this session's world.
        global._world = this._world;
        // The constructor (getHeroStats, setupSpecial, DLC init) reads the
        // global save — give it this player's progression while it runs.
        const _prevSave = global.saveData;
        if (save) global.saveData = save;
        let p;
        try { p = new global.Player(heroType, true); } // isCPU = true → no DOM writes
        finally { global.saveData = _prevSave; }
        if (save) { p._save = save; this._bindPlayerSave(p, save); }
        p._world    = this._world;
        p.x         = x;
        p.y         = y;
        p.moveInput = { x: 0, y: 0 };
        p._pendingShoot   = false;
        p._pendingMelee   = false;
        p._pendingDash    = false;
        p._pendingSpecial = false;
        p.controller = new NetworkInputController();
        return p;
    }

    // Player and DLC hero code also read progression while acting (altar perks
    // in specials, …) from the global / world `saveData` — run this player's
    // own actions with its save swapped in.
    _bindPlayerSave(p, save) {
        const world = this._world;
        for (const m of ['update', 'shoot', 'melee', 'dash', 'useSpecial']) {
            const fn = p[m];
            if (typeof fn !== 'function') continue;
            p[m] = function (...args) {
                const g = global.saveData, w = world.saveData;
                global.saveData = save; world.saveData = save;
                try { return fn.apply(this, args); }
                finally { global.saveData = g; world.saveData = w; }
            };
        }
    }

    /**
     * Rebuild `role`'s hero from the client's progression (`PLAYER_LOADOUT`).
     * Only before the simulation has started — returns false otherwise or if
     * the upload is malformed.
     */
    setPlayerLoadout(role, rawSave, biomes) {
        const idx = role === 'host' ? 0 : 1;
        const old = this.players[idx];
        if (!old || this._frame > 0) return false;
        if (Array.isArray(biomes)) this._clientBiomes[idx] = new Set(biomes.filter(b => typeof b === 'string'));
        const save = _sanitizeLoadout(old.type, rawSave);
        if (!save) return false;
        if (this._isStoryMode) save.story = { enabled: true };
        const _prevRunState = _setActiveRunState(this._runState);
        try {
            const p = this._createPlayer(old.type, old.x, old.y, save);
            this.players[idx] = p;
            if (idx === 0) this._world.player = p; else this._world.player2 = p;
            // The match-wide save the shared code reads (enemy / boss prestige
            // scaling, enemy card nerfs) is P1's, as in local co-op — it was
            // the empty default, so online enemies ignored the host's prestige.
            if (idx === 0) this._world.saveData = save;
        } finally {
            _setActiveRunState(_prevRunState);
        }
        this._loadoutsIn[idx] = true;
        return true;
    }

    applyInput(role, input) {
        const idx    = role === 'host' ? 0 : 1;
        const player = this.players[idx];
        if (!player) return;
        player._lastInputAt = Date.now();

        if (input.x        !== undefined) player.moveInput.x = input.x;
        if (input.y        !== undefined) player.moveInput.y = input.y;
        if (input.aimAngle !== undefined) player.aimAngle    = input.aimAngle;

        // Latch one-shot actions so they aren't dropped between ticks
        if (input.shoot)   player._pendingShoot   = true;
        if (input.melee)   player._pendingMelee   = true;
        if (input.dash)    player._pendingDash    = true;
        if (input.special) player._pendingSpecial = true;
    }

    applyLevelUpChoice(role, choiceId) {
        const idx = role === 'host' ? 0 : 1;
        if (this._levelUpFor !== idx) return;

        const player  = this.players[idx];
        const options = player._levelUpOptions || [];
        const chosen  = options.find(o => o && o.id === choiceId) || options[0];
        const _prevRunState = _setActiveRunState(this._runState);
        try {
            if (chosen) this._applyUpgrade(player, chosen.id);

            player._levelUpOptions = null;
            this._levelUpFor       = -1;

            // Clear queued action latches across both players so a held shoot/melee
            // pressed during the level-up modal does not auto-fire on resume.
            for (const p of [this._world.player, this._world.player2].filter(Boolean)) {
                p._pendingShoot   = false;
                p._pendingMelee   = false;
                p._pendingDash    = false;
                p._pendingSpecial = false;
            }

            // Next queued level-up (the partner's, or another of this
            // player's), else resume and release the partner's wait overlay.
            if (!this._offerNextLevelUp()) {
                this.isLevelingUp = false;
                const other = this._lobby[idx === 0 ? 'guest' : 'host'];
                if (other) this._send(other.ws, { type: 'LEVEL_UP_DONE' });
            }
        } finally {
            _setActiveRunState(_prevRunState);
        }
    }

    // A reconnecting client missed the level-up prompt it is due (or the
    // partner's wait overlay) — send it again.
    resendLevelUpPrompt(role) {
        if (this._levelUpFor >= 0) this._sendLevelUpPrompt(role);
    }

    stop() {
        if (this._tickInterval) {
            clearTimeout(this._tickInterval);
            this._tickInterval = null;
        }
    }

    // ─── Internal tick ───────────────────────────────────────────────────────────

    /**
     * Install the online host's generated arena (`Arena.serializeLayout()`).
     * Returns false if the upload is malformed. The server simulation then
     * collides with the same walls, zones and traps the clients draw.
     */
    setArenaLayout(raw, wave = 1, biomeState = null) {
        const layout = _sanitizeArenaLayout(raw, ARENA_WIDTH, ARENA_HEIGHT);
        if (!layout) return false;
        const _prevRunState = _setActiveRunState(this._runState);
        try {
            const arena = new global.Arena(ARENA_WIDTH, ARENA_HEIGHT);
            arena.generateFromMap(layout);
            _useVirtualViewport(arena);
            this._world.arena    = arena;
            // The wave's biome (the host generated the arena for it): weather
            // locks and boosts read it, and its DLC logic runs on it.
            if (layout.biomeType) this._runState.currentBiomeType = layout.biomeType;
            // Biome features its generate() made (bloom patches, light
            // shafts, dream pockets) — the server never runs generate, so the
            // host sends them. Each biome validates what it takes.
            const bl = layout.biomeType && this._biomes[layout.biomeType];
            if (bl && typeof bl.applyLayoutState === 'function' && biomeState && typeof biomeState === 'object') {
                try { bl.applyLayoutState(biomeState, arena); }
                catch (err) { console.warn(`[GameSession ${this._lobby.code}] bad ${layout.biomeType} biome state:`, err.message); }
            }
            this.arenaLayout     = layout;
            this.arenaLayoutHash = global.Arena.layoutHash(layout);
            this.arenaLayoutWave = wave;

            // Players: before the match starts, take the same deterministic
            // spawn the clients use (_spawnPoint, nudged out of walls —
            // game.js resumeWaveGeneration). Later, only rescue a player the
            // new walls would trap.
            const starting = this._awaitingLayoutUntil > 0 || this._frame === 0;
            this.players.forEach((p, i) => {
                if (!p) return;
                const r = p.radius || 20;
                const from = starting ? this._spawnPoint(i) : { x: p.x, y: p.y };
                const pos = arena.nearestFreePosition(from.x, from.y, r);
                p.x = pos.x; p.y = pos.y;
            });
            // Enemies already simulated on the flat stub arena (late upload).
            for (let i = 0; i < this.enemies.length; i++) {
                const e = this.enemies[i];
                if (!e) continue;
                const r = e.radius || 20;
                if (arena.checkCollision(e.x, e.y, r)) {
                    const pos = arena.nearestFreePosition(e.x, e.y, r);
                    e.x = pos.x; e.y = pos.y;
                }
            }
            this._layoutReady = true; // _isAwaitingLayout releases the hold
            // Story: the wave's chapter takes effect now that its arena is here.
            if (this._isStoryMode) this._storyWavePending = true;
        } finally {
            _setActiveRunState(_prevRunState);
        }
        return true;
    }

    // Server half of singleplayer's advanceWave() (game.js), run inside _tick
    // (this session's runState is active) when the wave number changed:
    // clear the field, bring fallen co-op players back at 50 % HP, and — when
    // the host uploads arenas — hold the sim until it sends this wave's layout.
    // Players are placed on their spawns when it lands, as singleplayer
    // re-centres the player each wave. Clients hear `wave_start` and run the
    // singleplayer wave set-up (biome shift, arena, spawn).
    _onWaveAdvanced() {
        if (global.enemies) global.enemies.length = 0;
        this.bossActive = false;
        this._runState.bossActive = false;
        for (const p of this.players) {
            if (!p || !p.isDead) continue;
            p.isDead = false;
            p.hp = Math.floor(p.maxHp * 0.5);
            p.isInvincible = false;
        }
        this._runState.p1RevivalMarker = null;
        this._runState.p2RevivalMarker = null;
        // Singleplayer's advanceWave stops the weather (game.js _stopWeather).
        const rs = this._runState;
        rs.currentObjective = null;
        if (this._isStoryMode) rs.currentStoryEvent = null; // the next chapter sets it
        rs.currentWeather = null; rs.weatherTimer = 3600; rs.weatherDuration = 0;
        rs.currentWeather2 = null; rs.weatherDuration2 = 0;
        rs.weatherParticles = []; rs._weatherBolts = []; rs._weatherFlash = 0;
        this._events.push({ type: 'wave_start', wave: this.wave, biomes: this.sharedBiomes() });
        if (this.arenaLayout && this._awaitLayoutMs > 0) {
            this._layoutReady = false;
            this._awaitingLayoutUntil = performance.now() + this._awaitLayoutMs;
        }
    }

    /**
     * The host's story chapter for `wave` (STORY_EVENT). Its gameplay part
     * applies when that wave's arena is installed. Returns false if ignored.
     */
    setStoryEvent(wave, raw) {
        if (!this._isStoryMode || !Number.isInteger(wave) || wave < this.wave) return false;
        const event = _sanitizeStoryEvent(raw);
        if (!event) return false;
        this._storyEvent = { wave, event };
        return true;
    }

    // Story wave set-up — the server half of singleplayer's
    // resumeWaveGeneration: the chapter's spawn overrides, a story boss
    // (BOSS_FIGHT, Makuta at 50 / 100) with its intro, an objective wave.
    // Runs inside the tick with this session's globals bound.
    _beginStoryWave() {
        this._storyWavePending = false;
        const rs = this._runState;
        const ev = (this._storyEvent && this._storyEvent.wave === this.wave) ? this._storyEvent.event : null;
        rs.currentStoryEvent = ev;
        rs.currentObjective = null;
        let bossId = (ev && ev.type === 'BOSS_FIGHT' && ev.data.bossId) || null;
        if (!bossId && _isStoryBossWave(this.wave, this._world.saveData)) bossId = 'MAKUTA';
        if (bossId) {
            rs.bossActive = true;
            global.enemies.unshift(new global.Boss(bossId));
            // The clients play the intro; the sim holds for it as theirs does
            // (loader _renderBossIntroCinematic).
            rs.bossIntroTimer = global.GAMEPLAY.BOSS_INTRO_FRAMES;
            this._events.push({ type: 'boss_intro', boss: bossId });
        }
        if (ev && ev.type === 'OBJECTIVE_WAVE') _startObjective();
        // The True Golden Mask appears mid-arena (singleplayer: resumeWaveGeneration)
        if (this.wave === 90) _spawnHolyMask(rs, ARENA_WIDTH / 2, ARENA_HEIGHT / 2, true);
    }

    // DLC biomes the online wave pool may use: those both clients have (and
    // the server simulates), in the canonical order both clients build from.
    sharedBiomes() {
        const [a, b] = this._clientBiomes;
        return DLC_BIOMES.filter(id => SERVER_BIOMES.includes(id) && a && a.has(id) && b && b.has(id));
    }

    // Singleplayer gameOver(), server half: both players stayed down through
    // the death cinematic (the shared update code calls gameOver()). Tell the
    // clients via the snapshot that is sent at the end of this tick, then stop.
    // Versus: the shared code calls gameOver from P1's (the host's) side —
    // victory = host won. Each client reads its own result from `winner`.
    _onGameOver(isVictory) {
        if (this._ended) return;
        this._ended = true;
        const ev = { type: 'game_over', victory: !!isVictory };
        if (this._isVersusMode) ev.winner = isVictory ? 'host' : 'guest';
        this._events.push(ev);
    }

    // Start / wave-start hold: wait for the host's arena (and, at match start
    // with awaitLoadouts, both players' progression), at most the deadline.
    _isAwaitingLayout() {
        if (!this._awaitingLayoutUntil) return false;
        const loadoutsReady = !this._awaitLoadouts || this._frame > 0 || this._loadoutsIn.every(Boolean);
        if (this._layoutReady && loadoutsReady) { this._awaitingLayoutUntil = 0; return false; }
        if (performance.now() < this._awaitingLayoutUntil) return true;
        // Timed out (older client that never uploads) — run with what we have.
        this._awaitingLayoutUntil = 0;
        console.warn(`[GameSession ${this._lobby.code}] start hold timed out (layout ${this._layoutReady ? 'ok' : 'missing'}, loadouts ${this._loadoutsIn.join('/')})`);
        return false;
    }

    _tick() {
        // A queued level-up nobody was asked about yet (normally offered at the
        // end of the tick that queued it) — offer it now rather than stall.
        if (this.isLevelingUp && this._levelUpFor < 0 && !this._ended) {
            const _prev = _setActiveRunState(this._runState);
            try { if (!this._offerNextLevelUp()) this.isLevelingUp = false; }
            finally { _setActiveRunState(_prev); }
        }
        if (this._ended || this.isLevelingUp || this.paused || this._isAwaitingLayout()) return;

        if (this._inputTimeoutMs > 0) {
            const now = Date.now();
            for (const p of this.players) {
                if (p && p.moveInput && now - (p._lastInputAt || 0) > this._inputTimeoutMs) {
                    p.moveInput.x = 0;
                    p.moveInput.y = 0;
                }
            }
        }

        // Activate this session's per-session `runState` for the
        // duration of the tick. RunState.js's exported `runState` Proxy
        // forwards every property access to whichever object was last
        // installed via `setActiveRunState`. Restore the prior state in
        // a `finally` block so a thrown exception doesn't leave another
        // session's tick reading this session's typed arrays.
        const _prevRunState = _setActiveRunState(this._runState);
        try {
            // Phase 3h.2 — bridge is the only path. `core/updateGameplayPre.js` +
            // `core/updateGameplayMid.js` drive the whole game-state update via
            // `bridge.runUpdate`. Snapshot + tick-rate hysteresis + anti-cheat
            // hand-off stay outside the bridge (server-only concerns).
            //
            // Sub-step `bridge.runUpdate` to match the renderer's per-frame pacing
            // (`proj.update()` / `enemy.update()` / `player.update()` advance by
            // one frame per call; one 33 ms server tick = ~2 renderer frames at
            // 60 fps, so `_currentTickFrames` sub-steps keep entity speeds in
            // sync with the browser-side renderer).
            //
            // Frame-counter handoff: the leaf module owns `runState.frame` and
            // increments it inside pre(). `_syncWorld()` runs first to push
            // `gs._frame → w.frame → rs.frame` via `bridge.syncWorldToGlobals`;
            // after sub-steps we read `gs._frame = w.frame` back so the snapshot
            // + next tick observe the authoritative count.
            this._syncWorld();
            const bridge = require('./RendererBridge');
            if (this._storyWavePending) {
                bridge.syncWorldToGlobals(this);
                try { this._beginStoryWave(); } finally { bridge.syncGlobalsToWorld(this); }
            }
            const SUB_STEPS = this._subSteps();
            const _waveBefore = this.wave;
            const _bossDeathBefore = this._runState.bossDeathTimer || 0;
            for (let s = 0; s < SUB_STEPS; s++) {
                bridge.runUpdate(this, 1000 / 60);
                if (this.isLevelingUp) break; // a level-up pauses the game here
            }
            // Read back everything the shared update code may change. Only
            // `frame` used to be read back, so the next tick's `_syncWorld`
            // reset wave → 1, score → 0 and bossActive → stale: online never
            // left wave 1 and the score always showed 0.
            this._frame      = this._world.frame;
            this.wave        = this._world.wave;
            this.score       = this._world.score;
            this.bossActive  = !!this._world.bossActive;

            // Boss just died → clients play the singleplayer death cinematic.
            if (_bossDeathBefore === 0 && (this._runState.bossDeathTimer || 0) > 0) {
                this._events.push({ type: 'boss_defeated', wave: this.wave });
            }
            if (this.wave !== _waveBefore) this._onWaveAdvanced();

            // Leaf-module spawn pushes through `enemies.push(new Enemy())` — the
            // `window.enemies` sentinel installed by Enemy.js (`_enemiesSentinel`
            // reads from `runState.enemyCount`). Same for `gs.projectiles`. Point
            // session refs at the sentinels so the snapshot path indexes through
            // the proxy's numeric getter and observes bridge-spawned entities.
            this.enemies     = global.enemies     || this._world.enemies;
            this.projectiles = global.projectiles || this._world.projectiles;
            this._world.enemies     = this.enemies;
            this._world.projectiles = this.projectiles;

            this._sendSnapshot();
            if (this._ended) {
                this.stop();
                if (this._onGameOverCb) this._onGameOverCb();
                return;
            }
            // After the snapshot, so the client already has the state the
            // level-up happened in when its level-up screen opens.
            if (this._levelUpFor < 0) this._offerNextLevelUp();
            this._adjustTickRate();
            if (this._onTickStats) {
                const elapsedSec = Math.round((Date.now() - this._startedAt) / 1000);
                this._onTickStats(this.wave, this.score, elapsedSec);
            }
        } finally {
            _setActiveRunState(_prevRunState);
        }
    }

    /**
     * Zero out the ECS slot counts on the runState singleton so a new
     * session doesn't inherit leftover slot data from a prior session.
     * `runState` is a process-wide singleton (`export const runState =
     * createRunState()`); without this reset, two sequential
     * `gs.init(...)` calls share enemy / projectile / particle /
     * floatingText / goldDrop / cardDrop / memoryShard / holyMask /
     * powerUp / companion slot data through the typed-array stores.
     * Boss instances (separate plain-array on `runState.bossInstances`)
     * also cleared.
     */
    _resetEcsState() {
        // Phase 3h.2 — mutate THIS session's runState directly. Earlier
        // singleton-only code path read through `global.runState` (still valid,
        // since the Proxy forwards to the session's state during a tick) — but
        // `_resetEcsState` runs from `init()` BEFORE the first tick, so no
        // `setActiveRunState` swap is in effect yet. Target `this._runState`
        // explicitly.
        const rs = this._runState;
        if (!rs) return;
        rs.enemyCount       = 0;
        rs.projectileCount  = 0;
        rs.particleCount    = 0;
        rs.floatingTextCount = 0;
        rs.goldDropCount    = 0;
        rs.cardDropCount    = 0;
        rs.memoryShardCount = 0;
        rs.holyMaskCount    = 0;
        rs.powerUpCount     = 0;
        rs.companionCount   = 0;
        if (rs.bossInstances && rs.bossInstances.length) {
            rs.bossInstances.length = 0;
        }
        // Slot proxies cached on the typed arrays — null out so future
        // `_acquireSlot` calls don't return a stale ref. Cheap.
        if (rs.enemySlotProxy) {
            for (let i = 0; i < rs.enemySlotProxy.length; i++) {
                if (rs.enemySlotProxy[i]) rs.enemySlotProxy[i]._slot = -1;
                rs.enemySlotProxy[i] = null;
            }
        }
        // Phase 3f — install a deterministic seeded RNG for this session.
        // Leaf-module spawn block (`core/updateGameplayPre.js:477-588`)
        // reads `runState.rng()` for spawn-chance rolls / twin-boss
        // event / swarm trigger / workshop enemyPool pick. Default seed
        // is `this._rngSeed` (set by tests via `gs._rngSeed = N`) or
        // a wall-clock derivation otherwise. Identical seeds across two
        // sessions yield identical spawn output — parity gate for
        // `parityTest` Test 25.
        const seed = (this._rngSeed | 0) || ((Date.now() ^ this._frame) | 0);
        rs.rng = _mulberry32(seed);
    }

    /** Keep the world object in sync with mutable session state every tick. */
    _syncWorld() {
        const w = this._world;
        w.frame        = this._frame;
        w.wave         = this.wave;
        w.score        = this.score;
        w.bossActive   = this.bossActive;
        w.enemies      = this.enemies;
        w.projectiles  = this.projectiles;
        w.isVersusMode = this._isVersusMode;
        // Two humans on one field: local 2P versus runs with co-op on too
        // (game.js startGame), which is what enables its PvP hits. With it
        // off the server never applied a single PvP hit.
        w.isCoopMode   = true;
    }

    // ─── Level-up ────────────────────────────────────────────────────────────────
    // Kills run singleplayer's Player.gainXp → levelUp(), which rolls the
    // options and hands them to the level-up screen. On the server that screen
    // is the player's client (RendererBridge routes `levelUpUI` here). As in
    // singleplayer the game pauses until the pick: the rest of the tick's
    // sub-steps are skipped and ticks hold while `isLevelingUp`. Several
    // level-ups (both players, or one player twice) are offered one by one.
    // (Before, `levelUpUI` was a null stub: the level went up, but nobody was
    // ever asked, nothing paused and no upgrade was ever applied.)

    _queueLevelUp(player, options) {
        // levelUp() set the bare `isLevelingUp` global; the session owns that
        // state here. Left set, a second level-up in the same frame would take
        // levelUp()'s local co-op "queue P2 behind P1's screen" path, which
        // only exists in game.js — and be lost.
        global.isLevelingUp = false;
        const idx = this.players.indexOf(player);
        if (idx < 0) return;
        this._levelUpQueue.push({ idx, options: Array.isArray(options) ? options : [] });
        this.isLevelingUp = true;
    }

    // Offer the next queued level-up to its player (partner waits). Runs with
    // this session's runState active. Returns false if none is queued.
    _offerNextLevelUp() {
        const next = this._levelUpQueue.shift();
        if (!next) return false;
        const player = this.players[next.idx];
        // Hero-specific option lists (Time: Fast Forward / Reverse), built the
        // way the level-up screen builds them — the pick is checked against these.
        let options = next.options;
        const hl = this._world.HERO_LOGIC[player.type];
        if (hl && typeof hl.getCustomLevelUpOptions === 'function') {
            const custom = hl.getCustomLevelUpOptions(player, options);
            if (custom !== undefined) options = custom;
        }
        player._levelUpOptions = options;
        this._levelUpFor  = next.idx;
        this.isLevelingUp = true;
        this._sendLevelUpPrompt();
        return true;
    }

    // LEVEL_UP to the choosing player, PARTNER_LEVELING to the other
    // (only to `onlyRole` when given).
    _sendLevelUpPrompt(onlyRole = null) {
        const idx = this._levelUpFor;
        if (idx < 0) return;
        const role = idx === 0 ? 'host' : 'guest', otherRole = idx === 0 ? 'guest' : 'host';
        const chooser = this._lobby[role], other = this._lobby[otherRole];
        if (chooser && (!onlyRole || onlyRole === role)) {
            this._send(chooser.ws, { type: 'LEVEL_UP', player: role, options: this.players[idx]._levelUpOptions });
        }
        if (other && (!onlyRole || onlyRole === otherRole)) this._send(other.ws, { type: 'PARTNER_LEVELING' });
    }

    _applyUpgrade(player, type) {
        const w = this._world;
        // The picking client applies the same pick to its own predicted hero
        // and shows its notification / burst; a server copy would reach that
        // client a second time as a relayed event.
        const notify = w.showNotification, explode = w.createExplosion;
        const prevSave = global.saveData, prevWorldSave = w.saveData;
        w.showNotification = () => {};
        w.createExplosion  = () => {};
        global._world = w;
        if (player._save) { global.saveData = player._save; w.saveData = player._save; }
        try {
            _applyUpgradeShared(player, type, { heroLogic: w.HERO_LOGIC[player.type], world: w });
        } finally {
            w.showNotification = notify;
            w.createExplosion  = explode;
            global.saveData = prevSave;
            w.saveData = prevWorldSave;
        }
    }

    // ─── Snapshot ─────────────────────────────────────────────────────────────────

    _sendSnapshot() {
        const roundP = (pl) => pl ? {
            x:            Math.round(pl.x * 10) / 10,
            y:            Math.round(pl.y * 10) / 10,
            hp:           Math.round(pl.hp),
            maxHp:        pl.maxHp,
            isDead:       pl.isDead,
            level:        pl.level,
            xp:           Math.round(pl.xp),
            maxXp:        pl.maxXp,
            gold:         Math.round(pl.gold),
            ...(pl.combo > 0 ? { combo: pl.combo } : {}),
            aimAngle:     Math.round((pl.aimAngle || 0) * 100) / 100,
            isInvincible: !!pl.isInvincible,
            mx:           Math.round((pl.moveInput?.x || 0) * 100) / 100,
            my:           Math.round((pl.moveInput?.y || 0) * 100) / 100,
            // Power-up buffs (frames left: speed, multi, autoaim) — omitted
            // when none. The owner's client predicts its pickups and is
            // corrected from this.
            ...(pl.buffs && (pl.buffs.speed > 0 || pl.buffs.multi > 0 || pl.buffs.autoaim > 0)
                ? { bf: [Math.max(0, pl.buffs.speed | 0), Math.max(0, pl.buffs.multi | 0), Math.max(0, pl.buffs.autoaim | 0)] }
                : {}),
            objective:    pl.currentObjective ? {
                type:      pl.currentObjective.type,
                text:      pl.currentObjective.text,
                current:   Math.round(pl.currentObjective.current || 0),
                target:    pl.currentObjective.target,
                completed: !!pl.currentObjective.completed,
                failed:    !!pl.currentObjective.failed,
            } : null,
        } : null;

        // Stamp ids once per tick (shared by every client's view). ECS
        // projectile slots carry no id of their own; the stamp lives in the
        // slot's extras bag (follows swap-remove, cleared on acquire), so a
        // reused slot gets a fresh id. Without it every entry shipped
        // `_id: undefined` and the client folded all server projectiles onto a
        // single ghost slot.
        const enemies = this.enemies.slice(0, 80);
        const projectiles = this.projectiles.slice(0, 150);
        for (const p of projectiles) if (p._id === undefined) p._id = this._nextProjId++;

        const events = this._events.splice(0);
        const t = Date.now();
        // World state both clients share. Weather (server-rolled, one for
        // both players): { id, left } frames left; omitted when clear.
        // `weather2` = the wave-30+ stacked one.
        const rs = this._runState, shared = {};
        // Story objective (runs here; the clients draw it).
        if (rs.currentObjective) shared.obj = _objectiveView(rs.currentObjective);
        // The True Golden Mask lying in the arena: [x, y]
        for (let i = 0; i < rs.holyMaskCount; i++) {
            if (rs.holyMaskIsTrueGolden[i]) { shared.gm = [Math.round(rs.holyMaskX[i]), Math.round(rs.holyMaskY[i])]; break; }
        }
        if (rs.currentWeather)  shared.weather  = { id: rs.currentWeather.id,  left: Math.round(rs.weatherDuration) };
        if (rs.currentWeather2) shared.weather2 = { id: rs.currentWeather2.id, left: Math.round(rs.weatherDuration2) };
        const biomeNet = this._biomeNetState();
        // Power-ups (server-spawned, picked up here): [[id, x, y, type], …];
        // omitted when there are none.
        if (rs.powerUpCount > 0) {
            shared.pu = [];
            for (let i = 0; i < rs.powerUpCount; i++) {
                shared.pu.push([rs.powerUpId[i], Math.round(rs.powerUpX[i]), Math.round(rs.powerUpY[i]), rs.powerUpType[i]]);
            }
        }
        const { host, guest } = this._lobby;

        // Delta state is per connection: a socket that joined late (rejoin) or
        // skipped snapshots under backpressure gets deltas against what IT last
        // received — a fresh socket starts empty, i.e. its first snapshot is a
        // full keyframe with every static field. States of sockets that are no
        // longer in the lobby are dropped.
        for (const ws of this._snapStates.keys()) {
            if (ws !== host?.ws && ws !== guest?.ws) this._snapStates.delete(ws);
        }

        // Personalised player views — each client sees their own character as p2
        const views = [
            [host?.ws,  this.players[1], this.players[0]],
            [guest?.ws, this.players[0], this.players[1]],
        ];
        for (const [ws, viewP1, viewP2] of views) {
            if (!ws) continue;
            const st = this._clientSnapState(ws);
            // Queue events per client so a skipped snapshot doesn't lose them.
            if (events.length) {
                st.events.push(...events);
                if (st.events.length > SNAPSHOT_MAX_QUEUED_EVENTS) st.events.splice(0, st.events.length - SNAPSHOT_MAX_QUEUED_EVENTS);
            }
            // Backpressure: a socket that hasn't drained its previous snapshots
            // (slow / congested link) skips this one instead of queueing more.
            // Safe because deltas are relative to this client's own last send.
            if ((ws.bufferedAmount || 0) > SNAPSHOT_BACKPRESSURE_BYTES) continue;

            // Gold drops (server-spawned, both players collect): the whole set
            // [[id, x, y, value], …], only when it changed since this client's
            // last snapshot.
            const perClient = {};
            if (st.goldVer !== rs.goldDropVersion) {
                st.goldVer = rs.goldDropVersion;
                perClient.gd = [];
                for (let i = 0; i < rs.goldDropCount; i++) {
                    perClient.gd.push([rs.goldDropId[i], Math.round(rs.goldDropX[i]), Math.round(rs.goldDropY[i]), rs.goldDropValue[i]]);
                }
            }
            // DLC biome state the clients mirror (gravity / wind direction,
            // falling rocks, floor tiles, …): on every change, plus a refresh
            // every 30 snapshots for the timers both sides count down.
            if (biomeNet && (st.bsRev !== biomeNet.rev || st.bsType !== biomeNet.type || ++st.sinceBs >= 30)) {
                perClient.bs = [biomeNet.type, biomeNet.state];
                st.bsRev = biomeNet.rev; st.bsType = biomeNet.type; st.sinceBs = 0;
            }
            const msg = {
                type:         'SNAPSHOT',
                t,
                wave:         this.wave,
                score:        this.score,
                bossActive:   this.bossActive,
                killed:       this._runState.enemiesKilledInWave || 0,
                isLevelingUp: this.isLevelingUp,
                ...shared,
                ...perClient,
                events:       st.events,
                p1:           roundP(viewP1),
                p2:           roundP(viewP2),
                ...this._buildEntityDeltas(st, enemies, projectiles, viewP2),
            };
            st.events = [];
            this._emitSnapshot(ws, msg);
        }
    }

    // The current biome's net state (if it has one) with its revision.
    _biomeNetState() {
        const type = this._world.arena && this._world.arena.biomeType;
        const bl = type && this._biomes[type];
        if (!bl || typeof bl.netState !== 'function') return null;
        try { return { type, rev: bl.netRev || 0, state: bl.netState(this._world.arena) }; }
        catch (err) { return null; }
    }

    _clientSnapState(ws) {
        let st = this._snapStates.get(ws);
        if (!st) {
            st = {
                knownEnemyIds: new Set(),
                lastEnemyXY:   new Map(), // id → client-reconstructed [x, y]
                lastEnemyHp:   new Map(), // id → last hp shipped
                knownProjIds:  new Set(),
                lastProjXY:    new Map(),
                goldVer:       -1, // gold-drop set version this client has
                bsRev:         -1, // biome net-state revision this client has
                bsType:        null,
                sinceBs:       0,
                sinceKeyframe: 0,
                events:        [],
            };
            this._snapStates.set(ws, st);
        }
        return st;
    }

    // Entity lists for one client, delta-encoded against that client's state
    // (which is advanced in place — call once per snapshot actually sent).
    // `ownPlayer` is that client's player: its projectiles are flagged `mine`
    // so the client can pair them with its own locally predicted shots.
    _buildEntityDeltas(st, enemies, projectiles, ownPlayer) {
        // Keyframe gate. Force full x,y this snapshot if we've sent
        // _KEYFRAME_INTERVAL delta snapshots since the last keyframe.
        const isKeyframe = st.sinceKeyframe >= this._KEYFRAME_INTERVAL;
        st.sinceKeyframe = isKeyframe ? 0 : st.sinceKeyframe + 1;

        const nextKnownEnemyIds = new Set();
        const nextLastEnemyXY = new Map();
        const nextLastEnemyHp = new Map();
        const enemyList = enemies.map(e => {
            nextKnownEnemyIds.add(e._id);
            const rx = Math.round(e.x * 10) / 10;
            const ry = Math.round(e.y * 10) / 10;
            // Default-valued fields are omitted (client reads missing vx/vy/
            // frozenTimer as 0 and alpha as 1). hp is sent on first sight,
            // keyframes and changes only — the client keeps the last value.
            const entry = { _id: e._id };
            const vx = Math.round((e.vx || 0) * 10) / 10;
            const vy = Math.round((e.vy || 0) * 10) / 10;
            if (vx) entry.vx = vx;
            if (vy) entry.vy = vy;
            const alpha = e.alpha !== 1 ? Math.round((e.alpha || 1) * 100) / 100 : 1;
            if (alpha !== 1) entry.alpha = alpha;
            if (e.frozenTimer > 0) entry.frozenTimer = Math.round(e.frozenTimer);
            const hp = Math.round(e.hp);
            nextLastEnemyHp.set(e._id, hp);
            const prev = st.lastEnemyXY.get(e._id);
            if (isKeyframe || !prev || st.lastEnemyHp.get(e._id) !== hp) entry.hp = hp;
            if (isKeyframe || !prev) {
                entry.x = rx;
                entry.y = ry;
                nextLastEnemyXY.set(e._id, [rx, ry]);
            } else {
                // Delta — integer pixel difference; ~95% of cases fit -127..+127.
                entry.dx = Math.round(rx - prev[0]);
                entry.dy = Math.round(ry - prev[1]);
                // Track the position the client reconstructs (prev + rounded
                // delta), not the true one — otherwise per-snapshot rounding
                // error accumulates client-side until the next keyframe snap.
                nextLastEnemyXY.set(e._id, [prev[0] + entry.dx, prev[1] + entry.dy]);
            }
            if (!st.knownEnemyIds.has(e._id)) {
                entry.maxHp   = e.maxHp;
                entry.subType = e.subType;
                entry.color   = e.color;
                entry.sides   = e.sides;
                entry.radius  = e.radius;
                if (e.isBoss) entry.boss = e.type; // client builds a Boss ghost (art, music, HP bar)
            }
            if (e.isBoss) Object.assign(entry, _bossVisuals(e));
            return entry;
        });
        st.knownEnemyIds = nextKnownEnemyIds;
        st.lastEnemyXY   = nextLastEnemyXY;
        st.lastEnemyHp   = nextLastEnemyHp;

        const nextKnownProjIds = new Set();
        const nextLastProjXY = new Map();
        const projList = projectiles.map(p => {
            nextKnownProjIds.add(p._id);
            // Support both real Projectile (velocity.x/y) and plain objects (vx/vy)
            const vx = p.vx ?? p.velocity?.x ?? 0;
            const vy = p.vy ?? p.velocity?.y ?? 0;
            const rx = Math.round(p.x * 10) / 10;
            const ry = Math.round(p.y * 10) / 10;
            const entry = {
                _id: p._id,
                vx:  Math.round(vx * 10) / 10,
                vy:  Math.round(vy * 10) / 10,
            };
            const prev = st.lastProjXY.get(p._id);
            if (isKeyframe || !prev) {
                entry.x = rx;
                entry.y = ry;
                nextLastProjXY.set(p._id, [rx, ry]);
            } else {
                entry.dx = Math.round(rx - prev[0]);
                entry.dy = Math.round(ry - prev[1]);
                nextLastProjXY.set(p._id, [prev[0] + entry.dx, prev[1] + entry.dy]);
            }
            if (!st.knownProjIds.has(p._id)) {
                entry.color       = p.color;
                entry.radius      = p.radius;
                entry.isEnemy     = !!p.isEnemy;
                entry.isExplosive = !!p.isExplosive;
                entry.isCrit      = !!p.isCrit;
                entry.type        = p.type || '';
                if (ownPlayer && p.owner === ownPlayer) entry.mine = 1;
            }
            return entry;
        });
        st.knownProjIds = nextKnownProjIds;
        st.lastProjXY   = nextLastProjXY;

        return { enemies: enemyList, projectiles: projList };
    }

    // Emit one snapshot per client per tick. Entity-count chunking was dropped:
    // over TCP it only added messages (each deflated without the others'
    // context) and a reassembly wait. The client still merges `chunk`-tagged
    // parts, so an older server stays compatible.
    _emitSnapshot(ws, msg) {
        this._send(ws, msg);
    }
}

module.exports = GameSession;
