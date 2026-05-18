/**
 * shared/world.js — Game-session context object.
 *
 * Replaces ambient global variable access in game logic classes.
 * All entity arrays, state flags, and injectable side-effects live here.
 *
 * Works in both environments:
 *   Browser  — <script src="shared/world.js"> → window.World
 *   Node.js  — const World = require('./shared/world')
 *
 * Migration status: Phase 1 (bridge in place).
 * Game classes still read window.* globals; World is created each run and
 * its arrays are aliased to the same objects.  Subsequent phases will
 * migrate each class to read from this._world instead.
 */

class World {
    constructor() {
        // ── Entity arrays ─────────────────────────────────────────────────────
        this.enemies       = [];
        this.projectiles   = [];
        this.particles     = [];
        // floatingTexts migrated to ECS on runState in #5 phase 5.5.
        this.goldDrops     = [];
        this.companions    = [];
        this.memoryShards  = [];
        this.meleeAttacks  = [];
        // powerUps migrated to ECS on runState in #5 phase 5.1.
        this.holyMasks     = [];
        // cardDrops migrated to ECS on runState in #5 phase 5.2.

        // ── Players ───────────────────────────────────────────────────────────
        this.player  = null;
        this.player2 = null;

        // ── Scene ─────────────────────────────────────────────────────────────
        this.arena      = null;
        this.frame      = 0;
        this.wave       = 1;
        this.score      = 0;
        this.bossActive = false;

        // ── Mode flags ────────────────────────────────────────────────────────
        this.gameRunning       = false;
        this.gamePaused        = false;
        this.isLevelingUp      = false;
        this.isShopping        = false;
        this.isCoopMode        = false;
        this.isAICompanionMode = false;
        this.isEvilMode        = false;
        this.isVersusMode      = false;
        this.isOnlineMode      = false;
        this.isOnlineGuest     = false;

        // ── Environment ───────────────────────────────────────────────────────
        this.currentWeather   = null;
        this.currentObjective = null;

        // ── Persistent data ───────────────────────────────────────────────────
        this.saveData        = {};
        this.currentRunStats = {};

        // ── Logic registries (populated by DLC loaders) ───────────────────────
        // { heroType: { update, special, applyUpgrade, drawOverlay, … } }
        this.HERO_LOGIC  = {};
        // { enemySubType: { update, … } }
        this.ENEMY_LOGIC = {};

        // ── Injectable side-effects (no-ops on server) ────────────────────────
        this.createExplosion  = () => {};
        this.showNotification = () => {};
        this.getDecoyTarget   = () => null;

        // ── Browser-only (null on server) ─────────────────────────────────────
        // draw() methods check these before using them.
        this.audioManager = null;
        this.canvas       = null;
        this.ctx          = null;

        // Input — null on server (server uses NetworkInputController instead)
        this.keys  = null;
        this.mouse = null;
    }

    /**
     * Snapshot of non-function fields for debugging.
     * Omits entity arrays (potentially large); use world.enemies.length etc. instead.
     */
    toJSON() {
        return {
            frame: this.frame, wave: this.wave, score: this.score,
            bossActive: this.bossActive,
            gameRunning: this.gameRunning, gamePaused: this.gamePaused,
            isLevelingUp: this.isLevelingUp, isShopping: this.isShopping,
            isCoopMode: this.isCoopMode, isEvilMode: this.isEvilMode,
            enemyCount:      this.enemies.length,
            projectileCount: this.projectiles.length,
            playerHp:  this.player  ? this.player.hp  : null,
            player2Hp: this.player2 ? this.player2.hp : null,
        };
    }

    // ── Static factories ──────────────────────────────────────────────────────

    /**
     * Client factory.  Reads canvas, ctx, audioManager, HERO_LOGIC, etc. from
     * the global scope at call-time (they are defined in game.js which loads after
     * this file, so they must be resolved lazily at startGame() time, not here).
     *
     * Call at the top of startGame() after resetting entity arrays.
     */
    static createClientWorld() {
        const w = new World();

        // Resolve browser globals lazily (this function is called at runtime,
        // not at parse time, so game.js functions are already defined by then).
        const _g = typeof globalThis !== 'undefined' ? globalThis
                 : typeof window     !== 'undefined' ? window : {};

        w.canvas       = _g.canvas       || null;
        w.ctx          = _g.ctx          || null;
        w.audioManager = typeof _g.audioManager !== 'undefined' ? _g.audioManager : null;

        w.createExplosion  = typeof _g.createExplosion  === 'function' ? _g.createExplosion  : () => {};
        w.showNotification = typeof _g.showNotification === 'function' ? _g.showNotification : () => {};
        w.getDecoyTarget   = typeof _g.getDecoyTarget   === 'function' ? _g.getDecoyTarget   : () => null;

        w.HERO_LOGIC  = _g.HERO_LOGIC  || {};
        w.ENEMY_LOGIC = _g.ENEMY_LOGIC || {};

        w.saveData        = _g.saveData        || {};
        w.currentRunStats = _g.currentRunStats || {};

        // Input: expose the raw key/mouse state objects that Player.update() reads.
        // After Phase 2 these move to this._world.keys / this._world.mouse.
        w.keys  = typeof _g.keys  !== 'undefined' ? _g.keys  : null;
        w.mouse = typeof _g.mouse !== 'undefined' ? _g.mouse : null;

        return w;
    }

    /**
     * Server factory.  Returns a world with all browser-only fields null and
     * side-effect functions as no-ops.  Caller must set:
     *   world.HERO_LOGIC  = …
     *   world.ENEMY_LOGIC = …
     *   world.createExplosion  = (x, y, color) => { … push event … }
     *   world.saveData    = {} (or a real save-data stub)
     */
    static createServerWorld() {
        return new World();
        // All defaults are already server-safe: null ctx, no-op side-effects.
    }
}

// ESM exports — server/loader.js's `loadClass` helper unwraps the namespace.
// window shim keeps classic-script callers (game.js) seeing `World` unchanged.
export { World };
export default World;
