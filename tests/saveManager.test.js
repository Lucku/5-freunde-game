import { describe, it, expect } from 'vitest';
import SaveManager from '../Managers/SaveManager.js';

describe('SaveManager schema migrations', () => {
    it('SCHEMA_VERSION is at least 1', () => {
        expect(SaveManager.SCHEMA_VERSION).toBeGreaterThanOrEqual(1);
    });

    it('MIGRATIONS array is contiguous from v0', () => {
        let expected = 0;
        for (const m of SaveManager.MIGRATIONS) {
            expect(m.from).toBe(expected);
            expect(m.to).toBe(m.from + 1);
            expect(typeof m.fn).toBe('function');
            expected = m.to;
        }
        // Last migration's `to` equals SCHEMA_VERSION
        if (SaveManager.MIGRATIONS.length > 0) {
            const last = SaveManager.MIGRATIONS[SaveManager.MIGRATIONS.length - 1];
            expect(last.to).toBe(SaveManager.SCHEMA_VERSION);
        }
    });

    it('_migrate stamps version on legacy save (no version field)', () => {
        const legacy = { fire: { level: 1 }, global: {} };
        const migrated = SaveManager._migrate(legacy);
        expect(migrated.version).toBe(SaveManager.SCHEMA_VERSION);
    });

    it('_migrate is idempotent for already-current saves', () => {
        const current = { version: SaveManager.SCHEMA_VERSION, fire: { level: 3 } };
        const out = SaveManager._migrate(structuredClone(current));
        expect(out.version).toBe(SaveManager.SCHEMA_VERSION);
        expect(out.fire.level).toBe(3);
    });

    it('_migrate clamps forward-compat saves (version > SCHEMA_VERSION) to current', () => {
        // If a user opens an older client after running a newer one, the stored
        // version is higher than this client knows about. Don't downgrade — just
        // stamp current and let the defensive merge fill gaps.
        const future = { version: SaveManager.SCHEMA_VERSION + 5, fire: {} };
        const out = SaveManager._migrate(future);
        expect(out.version).toBe(SaveManager.SCHEMA_VERSION);
    });

    it('_migrate leaves data fields intact through v0→v1 transform', () => {
        const legacy = {
            fire: { level: 2, prestige: 1 },
            global: { totalKills: 42 },
            altar: { active: ['c4'] },
            chaos: { shards: 100 },
        };
        const out = SaveManager._migrate(legacy);
        expect(out.fire.level).toBe(2);
        expect(out.fire.prestige).toBe(1);
        expect(out.global.totalKills).toBe(42);
        expect(out.altar.active).toEqual(['c4']);
        expect(out.chaos.shards).toBe(100);
    });
});
