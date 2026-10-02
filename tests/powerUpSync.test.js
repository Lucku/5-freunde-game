import { describe, it, expect, beforeEach } from 'vitest';
import { createRunState } from '../RunState.js';
import { spawnPowerUp, killPowerUp, syncPowerUps } from '../core/systems/powerUpSystem.js';

// Online co-op: the server owns power-ups and names them by a stable id in
// snapshots; clients mirror that set (core/systems/powerUpSystem.js).

describe('power-up ids + online mirror', () => {
    let rs;
    beforeEach(() => {
        rs = createRunState();
        rs.rng = () => 0.5;
        globalThis.arena = { width: 3000, height: 3000, checkCollision: () => false };
    });

    it('every spawn gets a fresh id that follows its slot on swap-with-last', () => {
        spawnPowerUp(rs); spawnPowerUp(rs); spawnPowerUp(rs);
        expect([...rs.powerUpId.slice(0, 3)]).toEqual([1, 2, 3]);
        const x3 = rs.powerUpX[2];
        killPowerUp(rs, 0); // last (id 3) moves into slot 0
        expect(rs.powerUpCount).toBe(2);
        expect(rs.powerUpId[0]).toBe(3);
        expect(rs.powerUpX[0]).toBe(x3);
        spawnPowerUp(rs);
        expect(rs.powerUpId[2]).toBe(4); // ids are never reused
    });

    it('syncPowerUps mirrors the server list, skipping locally picked ids', () => {
        spawnPowerUp(rs); // a stale local one is replaced
        syncPowerUps(rs, [[7, 100, 200, 2], [9, 300, 400, 4], [11, 500, 600, 0]], new Map([[9, {}]]));
        expect(rs.powerUpCount).toBe(2);
        expect([rs.powerUpId[0], rs.powerUpX[0], rs.powerUpY[0], rs.powerUpType[0]]).toEqual([7, 100, 200, 2]);
        expect([rs.powerUpId[1], rs.powerUpType[1]]).toEqual([11, 0]);
        const bob = rs.powerUpOscill[0];
        syncPowerUps(rs, [[7, 100, 200, 2]]);
        expect(rs.powerUpOscill[0]).toBe(bob); // stable bob phase per id across snapshots
        syncPowerUps(rs, []);
        expect(rs.powerUpCount).toBe(0);
    });
});
