'use strict';

/**
 * GameSession — authoritative server-side game simulation.
 *
 * One instance per active online match. The server calls:
 *   session.init(hostHero, guestHero)      → starts the 20 Hz tick loop
 *   session.applyInput(role, input)         → accept inputs from either client
 *   session.applyLevelUpChoice(role, id)    → resume after a level-up choice
 *   session.stop()                          → clear the interval and release state
 *
 * Snapshots are pushed to both clients directly via their WebSocket handles.
 * The snapshot schema is identical to the existing _onlineSendSnapshot() format
 * so _onlineApplySnapshot() on the client works with zero changes.
 *
 * p1 = lobby host player,  p2 = lobby guest player.
 * Each client receives a personalised snapshot where p2 is always *their own*
 * character, so the client's existing reconciliation code works unchanged.
 */

const {
    BASE_HERO_STATS,
    UPGRADE_POOL,
    ARENA_WIDTH,
    ARENA_HEIGHT,
    PLAYER_RADIUS,
    TICK_MS,
    TICK_FRAMES,
} = require('./constants');
const WaveManager = require('./WaveManager');

class GameSession {
    constructor(lobby, sendFn) {
        this._lobby   = lobby;   // { host: {ws, userId, …}, guest: {ws, userId, …} }
        this._send    = sendFn;  // send(ws, msgObject)

        this.players      = [null, null]; // [hostPlayer, guestPlayer]
        this.enemies      = [];
        this.projectiles  = [];
        this.wave         = 1;
        this.score        = 0;
        this.bossActive   = false;
        this.isLevelingUp = false;

        this._events          = [];  // flushed each snapshot
        this._levelUpFor      = -1; // index of player currently choosing upgrade
        this._enemiesKilledInWave = 0;
        this._nextProjId      = 1;
        this._frame           = 0;  // virtual 60-fps frame counter
        this._waveKillTarget  = 30; // increases each wave

        // Phase 3 delta encoding: IDs sent at least once this session.
        // Static fields (color, radius, subType, …) are omitted after first appearance.
        this._knownEnemyIds = new Set();
        this._knownProjIds  = new Set();

        this._waveManager   = new WaveManager();
        this._tickInterval  = null;
        this._startedAt     = 0;
    }

    // ─── Public API ───────────────────────────────────────────────────────────

    init(hostHero, guestHero) {
        this.players[0] = this._createPlayer(hostHero, ARENA_WIDTH / 2 - 120, ARENA_HEIGHT / 2);
        this.players[1] = this._createPlayer(guestHero, ARENA_WIDTH / 2 + 120, ARENA_HEIGHT / 2);
        this._startedAt = Date.now();
        this._waveManager._lastSpawnMs = this._startedAt;
        this._tickInterval = setInterval(() => this._tick(), TICK_MS);
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
        if (input.dash)    player._pendingDash     = true;
        if (input.special) player._pendingSpecial  = true;
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
        // Game loop auto-resumes next tick (isLevelingUp guard lifted)
    }

    stop() {
        if (this._tickInterval) {
            clearInterval(this._tickInterval);
            this._tickInterval = null;
        }
    }

    // ─── Internal tick ────────────────────────────────────────────────────────

    _tick() {
        if (this.isLevelingUp) return;

        this._frame += TICK_FRAMES; // advance virtual frame counter

        // 1. Update players
        this.players.forEach((p, i) => { if (p && !p.isDead) this._updatePlayer(p, i); });

        // 2. Move projectiles + collision vs enemies/players
        this._updateProjectiles();

        // 3. Move enemies + contact damage
        this._updateEnemies();

        // 4. Spawn enemies
        const refP = this.players.find(p => p && !p.isDead);
        const spawned = this._waveManager.spawnIfReady(
            this.wave, this.bossActive, this.enemies, refP, Date.now()
        );
        this.enemies.push(...spawned);

        // 5. Wave advancement
        this._checkWaveAdvance();

        // 6. Push snapshot to both clients
        this._sendSnapshot();
    }

    // ─── Player logic ─────────────────────────────────────────────────────────

    _createPlayer(hero, x, y) {
        const rawStats = BASE_HERO_STATS[hero] || BASE_HERO_STATS.fire;
        const stats    = { ...rawStats };
        return {
            hero,
            x, y,
            radius: PLAYER_RADIUS,
            hp:     stats.hp,
            maxHp:  stats.hp,
            isDead: false,
            level:  1,
            xp:     0,
            maxXp:  100,
            gold:   0,
            aimAngle:  0,
            moveInput: { x: 0, y: 0 },
            stats,

            // Combat cooldowns — counted in virtual 60-fps frames
            rangeCooldown:  0,
            meleeCooldown:  0,
            dashCooldown:   0,
            dashFrames:     0,
            isDashing:      false,
            invincibleTimer: 0,
            isInvincible:   false,

            // Upgrade-derived multipliers
            damageMultiplier:  1,
            speedMultiplier:   1,
            cooldownMultiplier:1,
            damageReduction:   0,
            extraProjectiles:  0,
            critChance:        0.05,
            critMultiplier:    1.5,
            meleeRadius:       80,

            // Pending one-shot actions from input
            _pendingShoot:   false,
            _pendingMelee:   false,
            _pendingDash:    false,
            _pendingSpecial: false,

            // Level-up state
            _levelUpOptions: null,
        };
    }

    _updatePlayer(player, idx) {
        const TF = TICK_FRAMES;

        // Decrement frame-based timers
        player.rangeCooldown   = Math.max(0, player.rangeCooldown   - TF);
        player.meleeCooldown   = Math.max(0, player.meleeCooldown   - TF);
        player.dashCooldown    = Math.max(0, player.dashCooldown    - TF);
        player.invincibleTimer = Math.max(0, player.invincibleTimer - TF);
        player.isInvincible    = player.invincibleTimer > 0;

        const { x: dx, y: dy } = player.moveInput;

        // Dash trigger
        if (player._pendingDash) {
            player._pendingDash = false;
            if (player.dashCooldown <= 0 && !player.isDashing) {
                if (Math.abs(dx) > 0.05 || Math.abs(dy) > 0.05) {
                    player.isDashing   = true;
                    player.dashFrames  = 10;
                    player.dashCooldown = 180;
                }
            }
        }

        // Shoot
        if (player._pendingShoot) {
            player._pendingShoot = false;
            this._shootPlayer(player, idx);
        }

        // Melee
        if (player._pendingMelee) {
            player._pendingMelee = false;
            this._meleePlayer(player, idx);
        }

        // Consume pending special (no server effect yet; just clear it)
        player._pendingSpecial = false;

        // Movement speed
        let spd = player.stats.speed * player.speedMultiplier;
        if (player.isDashing) {
            spd *= 4;
            player.dashFrames -= TF;
            if (player.dashFrames <= 0) player.isDashing = false;
        }

        // Move — normalize diagonal, scale by speed × tick-frames
        let moveX = 0, moveY = 0;
        if (dx !== 0 || dy !== 0) {
            const len   = Math.sqrt(dx * dx + dy * dy);
            const scale = Math.min(1, len);
            moveX = (dx / (len || 1)) * spd * scale * TF;
            moveY = (dy / (len || 1)) * spd * scale * TF;
        }

        player.x = Math.max(player.radius, Math.min(ARENA_WIDTH  - player.radius, player.x + moveX));
        player.y = Math.max(player.radius, Math.min(ARENA_HEIGHT - player.radius, player.y + moveY));
    }

    _shootPlayer(player, ownerIdx) {
        if (player.rangeCooldown > 0) return;
        const s = player.stats;

        // Plant fires 3-way spread; everyone else fires single
        const baseAngle = player.aimAngle;
        const angles = (player.hero === 'plant')
            ? [baseAngle - 0.2, baseAngle, baseAngle + 0.2]
            : [baseAngle];

        const dmg      = s.rangeDmg  * player.damageMultiplier;
        const speed    = s.projectileSpeed;
        const size     = s.projectileSize;
        const cooldown = s.rangeCd   * player.cooldownMultiplier;

        const fireAngle = (a) => {
            const isCrit      = Math.random() < player.critChance;
            const finalDmg    = dmg * (isCrit ? player.critMultiplier : 1);
            const isExplosive = player.hero === 'fire' && Math.random() < 0.1;
            this.projectiles.push({
                _id:        this._nextProjId++,
                x:          player.x,
                y:          player.y,
                vx:         Math.cos(a) * speed,
                vy:         Math.sin(a) * speed,
                damage:     finalDmg,
                radius:     size,
                color:      s.color,
                isEnemy:    false,
                ownerIdx,
                isExplosive,
                isCrit,
                life:       180, // virtual 60-fps frames
                pierce:     0,
            });
        };

        angles.forEach(fireAngle);

        // Extra projectiles from upgrades
        for (let i = 0; i < player.extraProjectiles; i++) {
            fireAngle(baseAngle + (Math.random() - 0.5) * 0.25);
        }

        player.rangeCooldown = cooldown;
    }

    _meleePlayer(player, _ownerIdx) {
        if (player.meleeCooldown > 0) return;
        const dmg = player.stats.meleeDmg * player.damageMultiplier;

        this.enemies.forEach(enemy => {
            const dist = Math.hypot(enemy.x - player.x, enemy.y - player.y);
            if (dist < player.meleeRadius + enemy.radius) {
                this._damageEnemy(enemy, dmg);
            }
        });

        player.meleeCooldown = player.stats.meleeCd * player.cooldownMultiplier;
    }

    // ─── Projectiles ──────────────────────────────────────────────────────────

    _updateProjectiles() {
        const TF     = TICK_FRAMES;
        const remove = new Set();

        this.projectiles.forEach((proj, pi) => {
            proj.x    += proj.vx * TF;
            proj.y    += proj.vy * TF;
            proj.life -= TF;

            if (proj.life <= 0 ||
                proj.x < -50 || proj.x > ARENA_WIDTH  + 50 ||
                proj.y < -50 || proj.y > ARENA_HEIGHT + 50) {
                remove.add(pi);
                return;
            }

            if (!proj.isEnemy) {
                // Player projectile vs enemies
                this.enemies.forEach(enemy => {
                    if (remove.has(pi)) return;
                    const dist = Math.hypot(proj.x - enemy.x, proj.y - enemy.y);
                    if (dist < proj.radius + enemy.radius) {
                        this._damageEnemy(enemy, proj.damage);
                        if (proj.pierce <= 0) remove.add(pi);
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
    }

    // ─── Enemies ─────────────────────────────────────────────────────────────

    _updateEnemies() {
        const TF = TICK_FRAMES;

        this.enemies.forEach(enemy => {
            if (enemy.hp <= 0) return;

            // Find nearest living player
            let nearest = null, minDist = Infinity;
            this.players.forEach(p => {
                if (!p || p.isDead) return;
                const d = Math.hypot(p.x - enemy.x, p.y - enemy.y);
                if (d < minDist) { minDist = d; nearest = p; }
            });

            if (!nearest) return;

            // Move toward nearest player (unless frozen)
            if (enemy.frozenTimer > 0) {
                enemy.frozenTimer -= TF;
            } else {
                const dx   = nearest.x - enemy.x;
                const dy   = nearest.y - enemy.y;
                const dist = Math.sqrt(dx * dx + dy * dy) || 1;
                enemy.x += (dx / dist) * enemy.speed * TF;
                enemy.y += (dy / dist) * enemy.speed * TF;
                enemy.x  = Math.max(enemy.radius, Math.min(ARENA_WIDTH  - enemy.radius, enemy.x));
                enemy.y  = Math.max(enemy.radius, Math.min(ARENA_HEIGHT - enemy.radius, enemy.y));
            }

            // Ranged subtypes fire projectiles at the player
            if (enemy.subType === 'SHOOTER' || enemy.subType === 'SNIPER') {
                enemy.shootCooldown = Math.max(0, (enemy.shootCooldown || 0) - TF);
                const range     = enemy.subType === 'SNIPER' ? 900 : 600;
                const cd        = enemy.subType === 'SNIPER' ? 120 : 60;
                const projSpeed = enemy.subType === 'SNIPER' ? 18  : 6;

                if (enemy.shootCooldown <= 0 && minDist < range) {
                    const angle = Math.atan2(nearest.y - enemy.y, nearest.x - enemy.x);
                    this.projectiles.push({
                        _id:      this._nextProjId++,
                        x:        enemy.x,
                        y:        enemy.y,
                        vx:       Math.cos(angle) * projSpeed,
                        vy:       Math.sin(angle) * projSpeed,
                        damage:   enemy.damage * 0.5,
                        radius:   8,
                        color:    '#e74c3c',
                        isEnemy:  true,
                        life:     150,
                        pierce:   0,
                    });
                    enemy.shootCooldown = cd;
                }
            }

            // Contact damage to players
            this.players.forEach((player, pIdx) => {
                if (!player || player.isDead || player.isInvincible) return;
                const dist = Math.hypot(player.x - enemy.x, player.y - enemy.y);
                if (dist < player.radius + enemy.radius) {
                    this._damagePlayer(player, pIdx, enemy.damage);
                    // Knockback
                    const ang = Math.atan2(player.y - enemy.y, player.x - enemy.x);
                    player.x  = Math.max(player.radius, Math.min(ARENA_WIDTH  - player.radius, player.x + Math.cos(ang) * 8));
                    player.y  = Math.max(player.radius, Math.min(ARENA_HEIGHT - player.radius, player.y + Math.sin(ang) * 8));
                }
            });
        });

        // Prune dead enemies (HP checked in damageEnemy before kill logic)
        this.enemies = this.enemies.filter(e => e.hp > 0);
    }

    // ─── Damage helpers ───────────────────────────────────────────────────────

    _damageEnemy(enemy, damage) {
        enemy.hp -= damage;
        if (enemy.hp > 0) return;

        // Enemy killed
        this.score             += 10;
        this._enemiesKilledInWave++;

        const xpGain = 10;
        // Award XP to both players, split
        this.players.forEach((p, i) => {
            if (p && !p.isDead) this._giveXP(p, i, xpGain);
        });

        // Gold drop (event drives client particle; also credit both players)
        if (Math.random() < 0.3) {
            this._events.push({ type: 'gold_drop', x: enemy.x, y: enemy.y });
            this.players.forEach(p => { if (p) p.gold += 5; });
        }

        this._events.push({ type: 'enemy_death', x: enemy.x, y: enemy.y, color: enemy.color });
    }

    _damagePlayer(player, playerIdx, damage) {
        if (player.isInvincible) return;

        const actual = Math.max(0, damage * (1 - player.damageReduction));
        player.hp -= actual;

        // Short invincibility window after being hit (mirrors client logic)
        player.invincibleTimer = 30;
        player.isInvincible    = true;

        if (player.hp <= 0) {
            player.hp    = 0;
            player.isDead = true;

            const allDead = this.players.every(p => !p || p.isDead);
            if (allDead) {
                this._events.push({ type: 'game_over', victory: false });
                // Stop ticking; server.js's GAME_OVER handler will clean up
                this.stop();
            }
        }
    }

    // ─── XP & level-up ───────────────────────────────────────────────────────

    _giveXP(player, playerIdx, amount) {
        player.xp += amount;
        if (player.xp < player.maxXp) return;

        player.xp    -= player.maxXp;
        player.level++;
        player.maxXp  = Math.round(player.maxXp * 1.2);

        // Pause the simulation while this player chooses an upgrade
        this.isLevelingUp = true;
        this._levelUpFor  = playerIdx;

        // Pick 3 random upgrades without replacement
        const pool    = [...UPGRADE_POOL];
        const options = [];
        while (options.length < 3 && pool.length > 0) {
            const i = Math.floor(Math.random() * pool.length);
            options.push(pool.splice(i, 1)[0]);
        }
        player._levelUpOptions = options;

        // Send LEVEL_UP to the client who leveled up, PARTNER_LEVELING to the other
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
        switch (upgrade.id) {
            case 'health':
                player.maxHp += 25;
                player.hp     = Math.min(player.maxHp, player.hp + player.maxHp * 0.2);
                break;
            case 'radius':
                player.meleeRadius *= 1.25;
                break;
            case 'projectile':
                player.extraProjectiles++;
                break;
            case 'speed':
                player.speedMultiplier *= 1.1;
                break;
            case 'cooldown':
                player.cooldownMultiplier *= 0.9;
                break;
            case 'defense':
                player.damageReduction = Math.min(0.8, player.damageReduction + 0.05);
                break;
            case 'damage':
                player.damageMultiplier *= 1.1;
                break;
            case 'crit':
                player.critChance     = Math.min(0.75, player.critChance + 0.05);
                player.critMultiplier += 0.2;
                break;
        }
    }

    // ─── Wave logic ───────────────────────────────────────────────────────────

    _checkWaveAdvance() {
        if (this._enemiesKilledInWave < this._waveKillTarget) return;

        this.wave++;
        this._enemiesKilledInWave = 0;
        this._waveKillTarget      = Math.round(30 * this.wave);
        this.enemies              = [];

        // Revive dead players at wave start (mirrors co-op client logic)
        this.players.forEach(p => {
            if (!p || !p.isDead) return;
            p.isDead        = false;
            p.hp            = Math.floor(p.maxHp * 0.5);
            p.isInvincible  = false;
            p.invincibleTimer = 0;
        });

        this._events.push({ type: 'wave_start', wave: this.wave });
    }

    // ─── Snapshot ─────────────────────────────────────────────────────────────

    _sendSnapshot() {
        const roundP = (pl) => pl ? {
            x:           Math.round(pl.x),
            y:           Math.round(pl.y),
            vx:          0,
            vy:          0,
            hp:          Math.round(pl.hp),
            maxHp:       pl.maxHp,
            isDead:      pl.isDead,
            level:       pl.level,
            xp:          Math.round(pl.xp),
            maxXp:       pl.maxXp,
            gold:        Math.round(pl.gold),
            aimAngle:    Math.round((pl.aimAngle || 0) * 100) / 100,
            isInvincible:!!pl.isInvincible,
            mx:          Math.round((pl.moveInput?.x || 0) * 100) / 100,
            my:          Math.round((pl.moveInput?.y || 0) * 100) / 100,
        } : null;

        // Enemy list — static fields only on first appearance (delta encoding)
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
                entry.maxHp  = e.maxHp;
                entry.subType = e.subType;
                entry.color  = e.color;
                entry.sides  = e.sides;
                entry.radius = e.radius;
            }
            return entry;
        });
        this._knownEnemyIds = nextKnownEnemyIds;

        // Projectile list — static fields only on first appearance
        const nextKnownProjIds = new Set();
        const projList = this.projectiles.slice(0, 150).map(p => {
            nextKnownProjIds.add(p._id);
            const entry = {
                _id: p._id,
                x:   Math.round(p.x),
                y:   Math.round(p.y),
                vx:  Math.round((p.vx || 0) * 10) / 10,
                vy:  Math.round((p.vy || 0) * 10) / 10,
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

        const events = this._events.splice(0); // flush event queue

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

        // Send personalised snapshots so each client sees their own character in p2
        // (the client's _onlineApplySnapshot always reconciles using s.p2 as "my player")
        const hostSnap  = { ...base, p1: roundP(this.players[1]), p2: roundP(this.players[0]) };
        const guestSnap = { ...base, p1: roundP(this.players[0]), p2: roundP(this.players[1]) };

        const { host, guest } = this._lobby;
        if (host  && host.ws)  this._send(host.ws,  hostSnap);
        if (guest && guest.ws) this._send(guest.ws, guestSnap);
    }
}

module.exports = GameSession;
