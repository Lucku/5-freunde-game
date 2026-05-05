'use strict';

const { ARENA_WIDTH, ARENA_HEIGHT, TICK_FRAMES } = require('./constants');

// Enemy sub-type base overrides applied on top of the random base stats
const SUBTYPE_MODS = {
    BASIC:      { hpMult: 1.0,  speedMult: 1.0,  radiusMult: 1.0,  color: '#7f8c8d', sides: null },
    SHOOTER:    { hpMult: 0.8,  speedMult: 0.8,  radiusMult: 1.0,  color: '#f1c40f', sides: 4 },
    BRUTE:      { hpMult: 2.0,  speedMult: 0.6,  radiusMult: 1.5,  color: '#8b4513', sides: 6 },
    SPEEDSTER:  { hpMult: 0.7,  speedMult: 2.0,  radiusMult: 0.8,  color: '#e74c3c', sides: 3 },
    SWARM:      { hpMult: 0.4,  speedMult: 1.3,  radiusMult: 0.5,  color: '#8e44ad', sides: 3 },
    SUMMONER:   { hpMult: 1.5,  speedMult: 0.6,  radiusMult: 1.2,  color: '#2980b9', sides: 5 },
    GHOST:      { hpMult: 0.9,  speedMult: 1.1,  radiusMult: 1.0,  color: '#bdc3c7', sides: 6 },
    SNIPER:     { hpMult: 0.6,  speedMult: 0.7,  radiusMult: 0.9,  color: '#16a085', sides: 4 },
    BOMBER:     { hpMult: 1.2,  speedMult: 0.9,  radiusMult: 1.1,  color: '#2c3e50', sides: 5 },
    TOXIC:      { hpMult: 1.0,  speedMult: 1.0,  radiusMult: 1.0,  color: '#27ae60', sides: 4 },
    SHIELDER:   { hpMult: 1.8,  speedMult: 0.7,  radiusMult: 1.3,  color: '#95a5a6', sides: 8 },
};

class WaveManager {
    constructor() {
        this._nextEnemyId = 1;
        this._lastSpawnMs = 0;
    }

    /** Pick a random enemy sub-type appropriate for the current wave. */
    pickSubType(wave) {
        const rand = Math.random();
        if (wave > 10 && rand < 0.05)  return 'SNIPER';
        if (wave > 8  && rand < 0.10)  return 'BOMBER';
        if (wave > 6  && rand < 0.15)  return 'GHOST';
        if (wave > 5  && rand < 0.20)  return 'BRUTE';
        if (wave > 4  && rand < 0.25)  return 'TOXIC';
        if (wave > 3  && rand < 0.30)  return 'SPEEDSTER';
        if (wave > 8  && rand < 0.35)  return 'SUMMONER';
        if (wave > 12 && rand < 0.40)  return 'SHIELDER';
        if (wave > 1  && rand < 0.45)  return 'SHOOTER';
        return 'BASIC';
    }

    /** How many ms between enemy spawns at this wave. */
    spawnIntervalMs(wave) {
        // Mirrors client: Math.max(10, 45 - wave*1.3) frames @60fps → ms
        return Math.max(167, (45 - wave * 1.3) * (1000 / 60));
    }

    /** Max non-boss enemies on screen at once (co-op has +4 like the client). */
    enemyCap(wave) {
        return Math.min(22, 5 + wave) + 4;
    }

    /**
     * Return a list of new enemies to add this tick (may be empty).
     * Callers pass in the current enemy array and a reference player for spawn-edge positioning.
     */
    spawnIfReady(wave, bossActive, enemies, refPlayer, nowMs) {
        if (bossActive) return [];
        if (nowMs - this._lastSpawnMs < this.spawnIntervalMs(wave)) return [];

        const nonBoss = enemies.filter(e => !e.isBoss).length;
        if (nonBoss >= this.enemyCap(wave)) return [];

        this._lastSpawnMs = nowMs;
        const spawned = [];

        const subType = this.pickSubType(wave);
        spawned.push(this._createEnemy(wave, subType, refPlayer));

        // 10% chance of a swarm cluster
        if (wave > 2 && Math.random() < 0.1) {
            for (let i = 0; i < 4; i++) {
                const swarm = this._createEnemy(wave, 'SWARM', refPlayer);
                swarm.x += (Math.random() - 0.5) * 100;
                swarm.y += (Math.random() - 0.5) * 100;
                swarm.x = Math.max(swarm.radius, Math.min(ARENA_WIDTH  - swarm.radius, swarm.x));
                swarm.y = Math.max(swarm.radius, Math.min(ARENA_HEIGHT - swarm.radius, swarm.y));
                spawned.push(swarm);
            }
        }

        return spawned;
    }

    _createEnemy(wave, subType, refPlayer) {
        const mods = SUBTYPE_MODS[subType] || SUBTYPE_MODS.BASIC;
        const difficultyMult = 1 + wave * 0.15;

        const baseHp    = (25 + Math.random() * 25) * (1 + wave * 0.38) * difficultyMult;
        const baseSpeed = (1  + Math.random() * 1.5) * (1 + wave * 0.018);
        const baseRad   = 15  + Math.random() * 10;

        const sides = mods.sides !== null ? mods.sides : (Math.floor(Math.random() * 3) + 4);
        const hp    = baseHp    * mods.hpMult    * 1.4; // co-op scale
        const speed = baseSpeed * mods.speedMult;
        const radius = baseRad  * mods.radiusMult;

        // Spawn just outside the visible viewport edge
        const viewHalfW = 1000;
        const viewHalfH = 580;
        const cx = refPlayer ? refPlayer.x : ARENA_WIDTH  / 2;
        const cy = refPlayer ? refPlayer.y : ARENA_HEIGHT / 2;

        let ex, ey;
        const side = Math.floor(Math.random() * 4);
        if (side === 0)      { ex = cx - viewHalfW - 40; ey = cy + (Math.random() - 0.5) * viewHalfH * 2; }
        else if (side === 1) { ex = cx + viewHalfW + 40; ey = cy + (Math.random() - 0.5) * viewHalfH * 2; }
        else if (side === 2) { ex = cx + (Math.random() - 0.5) * viewHalfW * 2; ey = cy - viewHalfH - 40; }
        else                 { ex = cx + (Math.random() - 0.5) * viewHalfW * 2; ey = cy + viewHalfH + 40; }

        ex = Math.max(radius, Math.min(ARENA_WIDTH  - radius, ex));
        ey = Math.max(radius, Math.min(ARENA_HEIGHT - radius, ey));

        return {
            _id:          this._nextEnemyId++,
            x:            ex,
            y:            ey,
            vx:           0,
            vy:           0,
            hp,
            maxHp:        hp,
            speed,
            radius,
            damage:       20 * difficultyMult,
            color:        mods.color,
            sides,
            subType,
            alpha:        1,
            frozenTimer:  0,
            slowTimer:    0,
            shootCooldown: 0,
            isBoss:       false,
        };
    }
}

module.exports = WaveManager;
