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
const {
    ARENA_WIDTH,
    ARENA_HEIGHT,
    TICK_MS,
    TICK_FRAMES,
    UPGRADE_POOL,
} = require('./constants');
// #198 — WaveManager retired (phase 3h.2 closed step 3; bridge owns spawn).
// Tests poke `gs._waveManager._lastSpawnMs` removed in this commit.

// #195 — per-session `runState`. RunState.js exports a Proxy that forwards
// to whichever object `setActiveRunState(rs)` last installed. GameSession
// creates its own instance on construct, then activates it for the
// duration of each `_tick` so the leaf modules' `runState.X` accesses
// resolve to this session's state — required for >1 concurrent match
// on the same server process. ESM-from-CJS require works because Node
// 24+ honors `__esModule` interop on the cached module.
const { createRunState: _createRunState, setActiveRunState: _setActiveRunState }
    = require(require('path').join(__dirname, '..', '..', 'RunState.js'));

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
        this._world.audioManager = {
            play: () => {}, playAttack: () => {}, stopLoop: () => {}, startLoop: () => {},
        };
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

        this._events             = []; // flushed each snapshot
        this._levelUpFor         = -1; // index of player currently choosing upgrade
        this._enemiesKilledInWave = 0;
        this._nextEnemyId        = 1;
        this._nextProjId         = 1;
        this._frame              = 0;  // virtual 60-fps frame counter
        this._waveKillTarget     = 30;

        // Phase 3 delta encoding: IDs sent at least once this session.
        this._knownEnemyIds = new Set();
        this._knownProjIds  = new Set();

        // #32 P9 — Position delta encoding. Track the last rounded x/y sent to
        // each client per entity id so subsequent snapshots can emit `dx, dy`
        // (typically -10..+10 = 2–3 char JSON tokens) instead of absolute
        // `x, y` (4–5 char tokens). Force a full keyframe every
        // _KEYFRAME_INTERVAL snapshots so client + server can never accumulate
        // drift past one second of misses.
        this._lastSentEnemyXY = new Map(); // id → [roundedX, roundedY]
        this._lastSentProjXY  = new Map();
        this._snapshotsSinceKeyframe = 0;
        this._KEYFRAME_INTERVAL = 30; // 1s at 30Hz

        this._tickInterval = null;
        this._startedAt    = 0;

        // Variable tick rate — runs at 30 Hz nominally, drops to 20 Hz when
        // entity count exceeds the threshold (CPU pressure proxy). TICK_FRAMES
        // scales with tick duration so simulated game speed stays constant.
        this._currentTickMs     = TICK_MS;
        this._currentTickFrames = TICK_FRAMES;
        // Hysteresis to prevent flapping at the boundary
        this._HIGH_LOAD_ENTER = 180; // enemies + projectiles
        this._HIGH_LOAD_EXIT  = 140;
        this._SLOW_TICK_MS    = 50; // 20 Hz

        // #195 — per-session `runState`. Own typed-array pools + scalars
        // so concurrent sessions don't share entity slots / wave counters
        // / RNG state. Activated for the duration of each `_tick` via
        // `setActiveRunState`; the leaf-module Proxy read from
        // RunState.js forwards to whichever session is currently active.
        this._runState = _createRunState();
    }

    _adjustTickRate() {
        const load = this.enemies.length + this.projectiles.length;
        const wasSlow = this._currentTickMs !== TICK_MS;
        let nextTickMs = this._currentTickMs;
        if (!wasSlow && load >= this._HIGH_LOAD_ENTER) nextTickMs = this._SLOW_TICK_MS;
        else if (wasSlow && load <= this._HIGH_LOAD_EXIT) nextTickMs = TICK_MS;
        if (nextTickMs !== this._currentTickMs) {
            this._currentTickMs     = nextTickMs;
            this._currentTickFrames = nextTickMs / (1000 / 60);
            console.log(`[GameSession ${this._lobby.code}] tick rate → ${Math.round(1000 / nextTickMs)} Hz (load=${load})`);
        }
    }

    // ─── Public API ─────────────────────────────────────────────────────────────

    init(hostHero, guestHero, mode = 'NORMAL') {
        this._isVersusMode = (mode === 'VERSUS');
        this._world.isVersusMode = this._isVersusMode;
        this._world.isCoopMode   = !this._isVersusMode;

        // #195 — activate this session's runState for the duration of init().
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

        const p1 = this._createPlayer(hostHero, ARENA_WIDTH / 2 - 300, ARENA_HEIGHT / 2);
        const p2 = this._createPlayer(guestHero, ARENA_WIDTH / 2 + 300, ARENA_HEIGHT / 2);

        this._world.player  = p1;
        this._world.player2 = p2;
        this.players = [p1, p2];

        // Wire world arrays (player.shoot() pushes to these)
        this._world.enemies     = this.enemies;
        this._world.projectiles = this.projectiles;

        this._startedAt = Date.now();
        // Self-rescheduling tick — interval adjusts per-iteration via _adjustTickRate
        const scheduleNext = () => {
            this._tickInterval = setTimeout(() => {
                this._tick();
                if (this._tickInterval !== null) scheduleNext();
            }, this._currentTickMs);
        };
        scheduleNext();

        // #195 — leave this session's runState ACTIVE after init() returns.
        // Tests + external callers between ticks expect `global.runState`
        // (which is the Proxy) to forward to the most-recently-initialized
        // session's state. `_tick` does its own activate+restore per
        // invocation, so concurrent sessions still alternate cleanly.
        // `_prevRunState` retained for diagnostics; not restored.
        void _prevRunState;
    }

    /**
     * Create a real Player instance for server-side simulation.
     * isCPU = true suppresses DOM access in setupSpecial().
     */
    _createPlayer(heroType, x, y) {
        // HERO_LOGIC.init() falls back to window._world when no world arg is passed;
        // set global._world so that lookup resolves to this session's world.
        global._world = this._world;
        const p = new global.Player(heroType, true); // isCPU = true → no DOM writes
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

    applyInput(role, input) {
        const idx    = role === 'host' ? 0 : 1;
        const player = this.players[idx];
        if (!player) return;

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
        const chosen  = options.find(o => o.id === choiceId) || options[0];
        if (chosen) this._applyUpgrade(player, chosen);

        player._levelUpOptions = null;
        this._levelUpFor       = -1;
        this.isLevelingUp      = false;

        // Clear queued action latches across both players so a held shoot/melee
        // pressed during the level-up modal does not auto-fire on resume.
        for (const p of [this._world.player, this._world.player2].filter(Boolean)) {
            p._pendingShoot   = false;
            p._pendingMelee   = false;
            p._pendingDash    = false;
            p._pendingSpecial = false;
        }
    }

    stop() {
        if (this._tickInterval) {
            clearTimeout(this._tickInterval);
            this._tickInterval = null;
        }
    }

    // ─── Internal tick ───────────────────────────────────────────────────────────

    _tick() {
        if (this.isLevelingUp) return;

        // #195 — activate this session's per-session `runState` for the
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
            const SUB_STEPS = Math.max(1, Math.round(this._currentTickFrames));
            for (let s = 0; s < SUB_STEPS; s++) {
                bridge.runUpdate(this, 1000 / 60);
            }
            this._frame = this._world.frame;

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
        // Phase 3h.2 + #195 — mutate THIS session's runState directly. Earlier
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
        w.isCoopMode   = !this._isVersusMode;
    }

    // ─── Melee ───────────────────────────────────────────────────────────────────

    /**
     * Process MeleeSwipe objects that were pushed by Player.melee() / DLC hooks.
     * MeleeSwipe.update() only repositions the swipe — damage must be applied here.
     */
    // ─── Damage helpers ──────────────────────────────────────────────────────────

    _onEnemyKilled(enemy) {
        enemy._killProcessed = true;
        this.score += 10;
        this._enemiesKilledInWave++;

        const xpGain = 10;
        this.players.forEach((p, i) => {
            if (p && !p.isDead) this._giveXP(p, i, xpGain);
        });

        if (Math.random() < 0.3) {
            this._events.push({ type: 'gold_drop', x: enemy.x, y: enemy.y });
            this.players.forEach(p => { if (p) p.gold += 5; });
        }

        this._events.push({ type: 'enemy_death', x: enemy.x, y: enemy.y, color: enemy.color });
    }

    _damageEnemy(enemy, damage) {
        enemy.hp -= damage;
        if (enemy.hp > 0) return;
        if (!enemy._killProcessed) this._onEnemyKilled(enemy);
    }

    _damagePlayer(player, playerIdx, damage) {
        if (player.isInvincible) return;

        const actual = Math.max(0, damage * (1 - (player.damageReduction || 0)));
        player.hp -= actual;

        player.invincibleTimer = 30;
        player.isInvincible    = true;

        if (player.hp <= 0) {
            player.hp     = 0;
            player.isDead = true;

            if (this._isVersusMode) {
                // Versus: first to die loses; surviving player wins
                this._events.push({ type: 'game_over', victory: false, loserIdx: playerIdx });
                this.stop();
            } else {
                const allDead = this.players.every(p => !p || p.isDead);
                if (allDead) {
                    this._events.push({ type: 'game_over', victory: false });
                    this.stop();
                }
            }
        }
    }

    // ─── XP & level-up ───────────────────────────────────────────────────────────

    _giveXP(player, playerIdx, amount) {
        player.xp += amount;
        if (player.xp < player.maxXp) return;

        // Drain enough levels to consume queued XP — avoids losing a level on big XP gains
        let levelsGained = 0;
        while (player.xp >= player.maxXp) {
            player.xp -= player.maxXp;
            player.level++;
            player.maxXp = Math.round(player.maxXp * 1.2);
            levelsGained++;
            if (levelsGained > 20) break; // Safety
        }

        this.isLevelingUp = true;
        this._levelUpFor  = playerIdx;

        const pool    = [...(this._world.HERO_LOGIC[player.type]?.upgradePool || UPGRADE_POOL)];
        const options = [];
        while (options.length < 3 && pool.length > 0) {
            const i = Math.floor(Math.random() * pool.length);
            options.push(pool.splice(i, 1)[0]);
        }
        player._levelUpOptions = options;

        const hostConn  = this._lobby.host;
        const guestConn = this._lobby.guest;

        if (playerIdx === 0) {
            if (hostConn)  this._send(hostConn.ws,  { type: 'LEVEL_UP', player: 'host', options });
            if (guestConn) this._send(guestConn.ws, { type: 'PARTNER_LEVELING' });
        } else {
            if (guestConn) this._send(guestConn.ws, { type: 'LEVEL_UP', player: 'guest', options });
            if (hostConn)  this._send(hostConn.ws,  { type: 'PARTNER_LEVELING' });
        }
    }

    _applyUpgrade(player, upgrade) {
        // Delegate to DLC hero applyUpgrade hook if available
        const hl = this._world.HERO_LOGIC[player.type];
        if (hl && typeof hl.applyUpgrade === 'function') {
            hl.applyUpgrade(player, upgrade.id, this._world);
            return;
        }

        // Generic upgrade application for non-DLC heroes
        switch (upgrade.id) {
            case 'health':
                player.maxHp += 25;
                player.hp     = Math.min(player.maxHp, player.hp + player.maxHp * 0.2);
                break;
            case 'radius':
                player.meleeRadius = (player.meleeRadius || 80) * 1.25;
                break;
            case 'projectile':
                player.extraProjectiles = (player.extraProjectiles || 0) + 1;
                break;
            case 'speed':
                player.speedMultiplier = (player.speedMultiplier || 1) * 1.1;
                break;
            case 'cooldown':
                player.cooldownMultiplier = (player.cooldownMultiplier || 1) * 0.9;
                break;
            case 'defense':
                player.damageReduction = Math.min(0.8, (player.damageReduction || 0) + 0.05);
                break;
            case 'damage':
                player.damageMultiplier = (player.damageMultiplier || 1) * 1.1;
                break;
            case 'crit':
                player.critChance     = Math.min(0.75, (player.critChance || 0.05) + 0.05);
                player.critMultiplier = (player.critMultiplier || 1.5) + 0.2;
                break;
        }
    }

    // ─── Snapshot ─────────────────────────────────────────────────────────────────

    _sendSnapshot() {
        const roundP = (pl) => pl ? {
            x:            Math.round(pl.x * 10) / 10,
            y:            Math.round(pl.y * 10) / 10,
            vx:           0,
            vy:           0,
            hp:           Math.round(pl.hp),
            maxHp:        pl.maxHp,
            isDead:       pl.isDead,
            level:        pl.level,
            xp:           Math.round(pl.xp),
            maxXp:        pl.maxXp,
            gold:         Math.round(pl.gold),
            aimAngle:     Math.round((pl.aimAngle || 0) * 100) / 100,
            isInvincible: !!pl.isInvincible,
            mx:           Math.round((pl.moveInput?.x || 0) * 100) / 100,
            my:           Math.round((pl.moveInput?.y || 0) * 100) / 100,
            objective:    pl.currentObjective ? {
                type:      pl.currentObjective.type,
                text:      pl.currentObjective.text,
                current:   Math.round(pl.currentObjective.current || 0),
                target:    pl.currentObjective.target,
                completed: !!pl.currentObjective.completed,
                failed:    !!pl.currentObjective.failed,
            } : null,
        } : null;

        // #32 P9 — keyframe gate. Force full x,y this snapshot if we've sent
        // _KEYFRAME_INTERVAL delta snapshots since the last keyframe.
        const isKeyframe = this._snapshotsSinceKeyframe >= this._KEYFRAME_INTERVAL;

        const nextKnownEnemyIds = new Set();
        const nextLastSentEnemyXY = new Map();
        const enemyList = this.enemies.slice(0, 80).map(e => {
            nextKnownEnemyIds.add(e._id);
            const rx = Math.round(e.x * 10) / 10;
            const ry = Math.round(e.y * 10) / 10;
            nextLastSentEnemyXY.set(e._id, [rx, ry]);
            const entry = {
                _id:         e._id,
                vx:          Math.round((e.vx || 0) * 10) / 10,
                vy:          Math.round((e.vy || 0) * 10) / 10,
                hp:          Math.round(e.hp),
                alpha:       e.alpha !== 1 ? Math.round((e.alpha || 1) * 100) / 100 : 1,
                frozenTimer: e.frozenTimer > 0 ? Math.round(e.frozenTimer) : 0,
            };
            const prev = this._lastSentEnemyXY.get(e._id);
            if (isKeyframe || !prev) {
                entry.x = rx;
                entry.y = ry;
            } else {
                // Delta — integer pixel difference; ~95% of cases fit -127..+127.
                entry.dx = Math.round(rx - prev[0]);
                entry.dy = Math.round(ry - prev[1]);
            }
            if (!this._knownEnemyIds.has(e._id)) {
                entry.maxHp   = e.maxHp;
                entry.subType = e.subType;
                entry.color   = e.color;
                entry.sides   = e.sides;
                entry.radius  = e.radius;
            }
            return entry;
        });
        this._knownEnemyIds = nextKnownEnemyIds;
        this._lastSentEnemyXY = nextLastSentEnemyXY;

        const nextKnownProjIds = new Set();
        const nextLastSentProjXY = new Map();
        const projList = this.projectiles.slice(0, 150).map(p => {
            nextKnownProjIds.add(p._id);
            // Support both real Projectile (velocity.x/y) and plain objects (vx/vy)
            const vx = p.vx ?? p.velocity?.x ?? 0;
            const vy = p.vy ?? p.velocity?.y ?? 0;
            const rx = Math.round(p.x * 10) / 10;
            const ry = Math.round(p.y * 10) / 10;
            nextLastSentProjXY.set(p._id, [rx, ry]);
            const entry = {
                _id: p._id,
                vx:  Math.round(vx * 10) / 10,
                vy:  Math.round(vy * 10) / 10,
            };
            const prev = this._lastSentProjXY.get(p._id);
            if (isKeyframe || !prev) {
                entry.x = rx;
                entry.y = ry;
            } else {
                entry.dx = Math.round(rx - prev[0]);
                entry.dy = Math.round(ry - prev[1]);
            }
            if (!this._knownProjIds.has(p._id)) {
                entry.color       = p.color;
                entry.radius      = p.radius;
                entry.isEnemy     = !!p.isEnemy;
                entry.isExplosive = !!p.isExplosive;
                entry.isCrit      = !!p.isCrit;
                entry.type        = p.type || '';
            }
            return entry;
        });
        this._knownProjIds = nextKnownProjIds;
        this._lastSentProjXY = nextLastSentProjXY;

        // Advance / reset keyframe counter for next snapshot.
        this._snapshotsSinceKeyframe = isKeyframe ? 0 : this._snapshotsSinceKeyframe + 1;

        const events = this._events.splice(0);

        const baseHeader = {
            type:         'SNAPSHOT',
            t:            Date.now(),
            wave:         this.wave,
            score:        this.score,
            bossActive:   this.bossActive,
            isLevelingUp: this.isLevelingUp,
            events,
        };

        // Personalised player views — each client sees their own character as p2
        const hostHeader  = { ...baseHeader, p1: roundP(this.players[1]), p2: roundP(this.players[0]) };
        const guestHeader = { ...baseHeader, p1: roundP(this.players[0]), p2: roundP(this.players[1]) };

        const { host, guest } = this._lobby;
        if (host  && host.ws)  this._emitSnapshot(host.ws,  hostHeader,  enemyList, projList);
        if (guest && guest.ws) this._emitSnapshot(guest.ws, guestHeader, enemyList, projList);
    }

    // Emit a snapshot, chunking entity arrays across multiple messages when the
    // payload would otherwise blow past typical buffer/MTU-friendly sizes. Each
    // chunk repeats the same `t` and a shared `chunk.seq` so the client can
    // reassemble. Header fields (players, score, events) appear only on idx 0.
    _emitSnapshot(ws, header, enemies, projectiles) {
        const totalEntities = enemies.length + projectiles.length;
        // Below ~100 entities the message is small enough that chunking adds
        // pure overhead. Tune threshold against perMessageDeflate ratio.
        if (totalEntities <= 100) {
            this._send(ws, { ...header, enemies, projectiles });
            return;
        }

        const numChunks = totalEntities > 200 ? 3 : 2;
        const seq = this._nextSnapSeq = (this._nextSnapSeq || 0) + 1;
        const ePer = Math.ceil(enemies.length / numChunks);
        const pPer = Math.ceil(projectiles.length / numChunks);

        for (let i = 0; i < numChunks; i++) {
            const ePart = enemies.slice(i * ePer, (i + 1) * ePer);
            const pPart = projectiles.slice(i * pPer, (i + 1) * pPer);
            const msg = (i === 0)
                ? { ...header, chunk: { seq, idx: i, of: numChunks }, enemies: ePart, projectiles: pPart }
                : {
                    type: 'SNAPSHOT',
                    t: header.t,
                    chunk: { seq, idx: i, of: numChunks },
                    enemies: ePart,
                    projectiles: pPart,
                };
            this._send(ws, msg);
        }
    }
}

module.exports = GameSession;
