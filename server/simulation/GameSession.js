'use strict';

// Load real game classes into global scope (runs once; subsequent requires are cached).
require('./loader');

const World = global.World;
const NetworkInputController = require('./NetworkInputController');
const {
    ARENA_WIDTH,
    ARENA_HEIGHT,
    TICK_MS,
    TICK_FRAMES,
    UPGRADE_POOL,
} = require('./constants');
const WaveManager = require('./WaveManager');

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
 *     objects; _updateProjectiles() and _processMeleeAttacks() handle them.
 *   - Snapshot schema is unchanged — client-side _onlineApplySnapshot() works
 *     with zero modifications.
 *
 * p1 = lobby host player, p2 = lobby guest player.
 */
class GameSession {
    constructor(lobby, sendFn) {
        this._lobby  = lobby;  // { host: {ws, userId, …}, guest: {ws, userId, …} }
        this._send   = sendFn; // send(ws, msgObject)

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
        // No-op audioManager: DLC heroes guard with `typeof audioManager !== 'undefined'`,
        // which passes for null (typeof null === 'object'). Stub avoids the crash.
        this._world.audioManager = {
            play: () => {}, playAttack: () => {}, stopLoop: () => {}, startLoop: () => {},
        };
        // Flat arena — no obstacles on the server (pure collision boundary)
        this._world.arena = {
            width:          ARENA_WIDTH,
            height:         ARENA_HEIGHT,
            camera:         { x: 0, y: 0 },
            checkCollision: () => false,
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

        this._waveManager  = new WaveManager();
        this._tickInterval = null;
        this._startedAt    = 0;
    }

    // ─── Public API ─────────────────────────────────────────────────────────────

    init(hostHero, guestHero) {
        // Sync canvas dimensions so Player constructor gets correct spawn coords
        global.canvas = { width: ARENA_WIDTH, height: ARENA_HEIGHT };

        const p1 = this._createPlayer(hostHero, ARENA_WIDTH / 2 - 120, ARENA_HEIGHT / 2);
        const p2 = this._createPlayer(guestHero, ARENA_WIDTH / 2 + 120, ARENA_HEIGHT / 2);

        this._world.player  = p1;
        this._world.player2 = p2;
        this.players = [p1, p2];

        // Wire world arrays (player.shoot() pushes to these)
        this._world.enemies     = this.enemies;
        this._world.projectiles = this.projectiles;

        this._startedAt = Date.now();
        this._waveManager._lastSpawnMs = this._startedAt;
        this._tickInterval = setInterval(() => this._tick(), TICK_MS);
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
    }

    stop() {
        if (this._tickInterval) {
            clearInterval(this._tickInterval);
            this._tickInterval = null;
        }
    }

    // ─── Internal tick ───────────────────────────────────────────────────────────

    _tick() {
        if (this.isLevelingUp) return;

        this._frame += TICK_FRAMES;
        this._syncWorld();

        // 1. Update players via real Player.update()
        //    NetworkInputController feeds moveInput + _pendingXxx into Player's
        //    controller path, which dispatches movement, DLC hooks, and actions.
        const prevProjCount   = this.projectiles.length;
        const prevMeleeCount  = (this._world.meleeAttacks || []).length;

        this.players.forEach(p => {
            if (p && !p.isDead) p.update();
        });

        // Assign IDs to new projectiles spawned by Player.shoot() / DLC hooks
        for (let i = prevProjCount; i < this._world.projectiles.length; i++) {
            const proj = this._world.projectiles[i];
            if (!proj._id) proj._id = this._nextProjId++;
        }
        // Keep session reference in sync (player.shoot pushed to world array)
        this.projectiles        = this._world.projectiles;

        // 2. Process MeleeSwipe objects created by Player.melee() / DLC melee hooks
        this._processMeleeAttacks(prevMeleeCount);

        // 3. Move projectiles + collision vs enemies/players
        this._updateProjectiles();

        // 4. Move enemies (full AI via Enemy.update()) + contact damage
        const prevEnemyCount   = this.enemies.length;
        const prevEnemyProjCount = this.projectiles.length;

        if (this.players.some(p => p && !p.isDead)) {
            this.enemies.forEach(enemy => {
                if (enemy.hp <= 0) return;
                enemy.update();
            });
        }

        // Assign IDs to projectiles spawned by enemy.update() (real Projectile objects)
        for (let i = prevEnemyProjCount; i < this.projectiles.length; i++) {
            const proj = this.projectiles[i];
            if (!proj._id) proj._id = this._nextProjId++;
        }

        // Assign IDs to minions spawned by SUMMONER during update
        for (let i = prevEnemyCount; i < this.enemies.length; i++) {
            const e = this.enemies[i];
            if (!e._id) e._id = this._nextEnemyId++;
        }

        // Contact damage — Enemy.update() handles movement only, not player collision
        this._applyEnemyContactDamage();

        // Prune dead enemies, awarding kill rewards exactly once per enemy
        this.enemies = this.enemies.filter(e => {
            if (e.hp > 0) return true;
            if (!e._killProcessed) this._onEnemyKilled(e);
            return false;
        });
        this._world.enemies = this.enemies;

        // 5. Spawn enemies
        const refP    = this.players.find(p => p && !p.isDead);
        const spawned = this._waveManager.spawnIfReady(
            this.wave, this.bossActive, this.enemies, refP, Date.now(), this._world
        );
        if (spawned.length) {
            this.enemies.push(...spawned);
            this._world.enemies = this.enemies;
        }

        // 6. Wave advancement
        this._checkWaveAdvance();

        // 7. Push snapshot to both clients
        this._sendSnapshot();
    }

    /** Keep the world object in sync with mutable session state every tick. */
    _syncWorld() {
        const w = this._world;
        w.frame      = this._frame;
        w.wave       = this.wave;
        w.score      = this.score;
        w.bossActive = this.bossActive;
        w.enemies    = this.enemies;
        w.projectiles = this.projectiles;
    }

    // ─── Melee ───────────────────────────────────────────────────────────────────

    /**
     * Process MeleeSwipe objects that were pushed by Player.melee() / DLC hooks.
     * MeleeSwipe.update() only repositions the swipe — damage must be applied here.
     */
    _processMeleeAttacks(prevCount) {
        if (!this._world.meleeAttacks) return;
        const swipes = this._world.meleeAttacks;

        swipes.forEach(swipe => {
            swipe.update(); // reposition following owner

            this.enemies.forEach(enemy => {
                if (enemy.hp <= 0) return;
                if (swipe.hitList && swipe.hitList.includes(enemy)) return;
                const dist = Math.hypot(enemy.x - swipe.x, enemy.y - swipe.y);
                if (dist < swipe.radius + enemy.radius) {
                    if (swipe.hitList) swipe.hitList.push(enemy);
                    this._damageEnemy(enemy, swipe.damage);
                }
            });
        });

        // Prune expired swipes
        this._world.meleeAttacks = swipes.filter(s => s.life > 0);
    }

    // ─── Projectiles ─────────────────────────────────────────────────────────────

    _updateProjectiles() {
        const TF     = TICK_FRAMES;
        const remove = new Set();

        this.projectiles.forEach((proj, pi) => {
            // Support both real Projectile (velocity.x/y) and plain objects (vx/vy)
            const vx = proj.vx ?? proj.velocity?.x ?? 0;
            const vy = proj.vy ?? proj.velocity?.y ?? 0;
            proj.x += vx * TF;
            proj.y += vy * TF;

            // life = null means infinite lifetime (real Projectile default)
            if (proj.life !== null && proj.life !== undefined) {
                proj.life -= TF;
                if (proj.life <= 0) { remove.add(pi); return; }
            }

            // Boundary cull
            if (proj.x < -50 || proj.x > ARENA_WIDTH  + 50 ||
                proj.y < -50 || proj.y > ARENA_HEIGHT + 50) {
                remove.add(pi); return;
            }

            if (!proj.isEnemy) {
                // Player projectile vs enemies
                this.enemies.forEach(enemy => {
                    if (remove.has(pi) || enemy.hp <= 0) return;
                    const dist = Math.hypot(proj.x - enemy.x, proj.y - enemy.y);
                    if (dist < proj.radius + enemy.radius) {
                        this._damageEnemy(enemy, proj.damage);
                        if ((proj.pierce || 0) <= 0) remove.add(pi);
                        else proj.pierce--;
                    }
                });
            } else {
                // Enemy projectile vs players
                this.players.forEach((player, playerIdx) => {
                    if (remove.has(pi) || !player || player.isDead || player.isInvincible) return;
                    const dist = Math.hypot(proj.x - player.x, proj.y - player.y);
                    if (dist < proj.radius + player.radius) {
                        this._damagePlayer(player, playerIdx, proj.damage);
                        remove.add(pi);
                    }
                });
            }
        });

        this.projectiles = this.projectiles.filter((_, i) => !remove.has(i));
        this._world.projectiles = this.projectiles;
    }

    // ─── Enemies ─────────────────────────────────────────────────────────────────

    _applyEnemyContactDamage() {
        this.enemies.forEach(enemy => {
            if (enemy.hp <= 0) return;
            this.players.forEach((player, pIdx) => {
                if (!player || player.isDead || player.isInvincible) return;
                const dist = Math.hypot(player.x - enemy.x, player.y - enemy.y);
                if (dist < player.radius + enemy.radius) {
                    this._damagePlayer(player, pIdx, enemy.damage);
                    const ang = Math.atan2(player.y - enemy.y, player.x - enemy.x);
                    player.x = Math.max(player.radius, Math.min(ARENA_WIDTH  - player.radius, player.x + Math.cos(ang) * 8));
                    player.y = Math.max(player.radius, Math.min(ARENA_HEIGHT - player.radius, player.y + Math.sin(ang) * 8));
                }
            });
        });
    }

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

            const allDead = this.players.every(p => !p || p.isDead);
            if (allDead) {
                this._events.push({ type: 'game_over', victory: false });
                this.stop();
            }
        }
    }

    // ─── XP & level-up ───────────────────────────────────────────────────────────

    _giveXP(player, playerIdx, amount) {
        player.xp += amount;
        if (player.xp < player.maxXp) return;

        player.xp    -= player.maxXp;
        player.level++;
        player.maxXp  = Math.round(player.maxXp * 1.2);

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

    // ─── Wave logic ───────────────────────────────────────────────────────────────

    _checkWaveAdvance() {
        if (this._enemiesKilledInWave < this._waveKillTarget) return;

        this.wave++;
        this._enemiesKilledInWave = 0;
        this._waveKillTarget      = Math.round(30 * this.wave);
        this.enemies              = [];
        this._world.enemies       = this.enemies;

        this.players.forEach(p => {
            if (!p || !p.isDead) return;
            p.isDead          = false;
            p.hp              = Math.floor(p.maxHp * 0.5);
            p.isInvincible    = false;
            p.invincibleTimer = 0;
        });

        this._events.push({ type: 'wave_start', wave: this.wave });
    }

    // ─── Snapshot ─────────────────────────────────────────────────────────────────

    _sendSnapshot() {
        const roundP = (pl) => pl ? {
            x:            Math.round(pl.x),
            y:            Math.round(pl.y),
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
        } : null;

        const nextKnownEnemyIds = new Set();
        const enemyList = this.enemies.slice(0, 80).map(e => {
            nextKnownEnemyIds.add(e._id);
            const entry = {
                _id:         e._id,
                x:           Math.round(e.x),
                y:           Math.round(e.y),
                vx:          Math.round((e.vx || 0) * 10) / 10,
                vy:          Math.round((e.vy || 0) * 10) / 10,
                hp:          Math.round(e.hp),
                alpha:       e.alpha !== 1 ? Math.round((e.alpha || 1) * 100) / 100 : 1,
                frozenTimer: e.frozenTimer > 0 ? Math.round(e.frozenTimer) : 0,
            };
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

        const nextKnownProjIds = new Set();
        const projList = this.projectiles.slice(0, 150).map(p => {
            nextKnownProjIds.add(p._id);
            // Support both real Projectile (velocity.x/y) and plain objects (vx/vy)
            const vx = p.vx ?? p.velocity?.x ?? 0;
            const vy = p.vy ?? p.velocity?.y ?? 0;
            const entry = {
                _id: p._id,
                x:   Math.round(p.x),
                y:   Math.round(p.y),
                vx:  Math.round(vx * 10) / 10,
                vy:  Math.round(vy * 10) / 10,
            };
            if (!this._knownProjIds.has(p._id)) {
                entry.color       = p.color;
                entry.radius      = p.radius;
                entry.isEnemy     = !!p.isEnemy;
                entry.isExplosive = !!p.isExplosive;
                entry.isCrit      = !!p.isCrit;
            }
            return entry;
        });
        this._knownProjIds = nextKnownProjIds;

        const events = this._events.splice(0);

        const base = {
            type:         'SNAPSHOT',
            t:            Date.now(),
            wave:         this.wave,
            score:        this.score,
            bossActive:   this.bossActive,
            isLevelingUp: this.isLevelingUp,
            enemies:      enemyList,
            projectiles:  projList,
            events,
        };

        // Personalised: each client sees their own character as p2
        const hostSnap  = { ...base, p1: roundP(this.players[1]), p2: roundP(this.players[0]) };
        const guestSnap = { ...base, p1: roundP(this.players[0]), p2: roundP(this.players[1]) };

        const { host, guest } = this._lobby;
        if (host  && host.ws)  this._send(host.ws,  hostSnap);
        if (guest && guest.ws) this._send(guest.ws, guestSnap);
    }
}

module.exports = GameSession;
