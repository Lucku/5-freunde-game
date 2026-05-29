// #175 — per-DLC version stamping + migration framework.
import { describe, it, expect, afterEach } from 'vitest';
import { SaveManager } from '../Managers/SaveManager.js';

const TEST_ID = '__test_dlc__';

describe('SaveManager.applyDLCVersion (#175)', () => {
    afterEach(() => { delete SaveManager.DLC_MIGRATIONS[TEST_ID]; });

    it('first sighting stamps the current version and runs no migration', () => {
        const sd = {};
        let ran = false;
        SaveManager.DLC_MIGRATIONS[TEST_ID] = [{ from: 1, to: 2, migrate() { ran = true; } }];
        SaveManager.applyDLCVersion(sd, TEST_ID, 1);
        expect(sd.dlcVersions[TEST_ID]).toBe(1);
        expect(ran).toBe(false); // no migration on first stamp
    });

    it('recorded < current runs the matching migration exactly once, then stamps current', () => {
        const sd = { dlcVersions: { [TEST_ID]: 1 } };
        let runs = 0;
        SaveManager.DLC_MIGRATIONS[TEST_ID] = [
            { from: 1, to: 2, migrate(data) { runs++; data._migratedTo2 = true; } },
        ];
        SaveManager.applyDLCVersion(sd, TEST_ID, 2);
        expect(runs).toBe(1);
        expect(sd._migratedTo2).toBe(true);
        expect(sd.dlcVersions[TEST_ID]).toBe(2);

        // Idempotent: a second call at the same version does not re-run.
        SaveManager.applyDLCVersion(sd, TEST_ID, 2);
        expect(runs).toBe(1);
    });

    it('chains multiple migrations in order across several versions', () => {
        const sd = { dlcVersions: { [TEST_ID]: 1 } };
        const order = [];
        SaveManager.DLC_MIGRATIONS[TEST_ID] = [
            { from: 1, to: 2, migrate() { order.push('1->2'); } },
            { from: 2, to: 3, migrate() { order.push('2->3'); } },
        ];
        SaveManager.applyDLCVersion(sd, TEST_ID, 3);
        expect(order).toEqual(['1->2', '2->3']);
        expect(sd.dlcVersions[TEST_ID]).toBe(3);
    });

    it('skips migrations already applied (recorded above a migration.from)', () => {
        const sd = { dlcVersions: { [TEST_ID]: 2 } };
        const order = [];
        SaveManager.DLC_MIGRATIONS[TEST_ID] = [
            { from: 1, to: 2, migrate() { order.push('1->2'); } },
            { from: 2, to: 3, migrate() { order.push('2->3'); } },
        ];
        SaveManager.applyDLCVersion(sd, TEST_ID, 3);
        expect(order).toEqual(['2->3']); // 1->2 already applied
    });

    it('recorded >= current is a no-op (no downgrade)', () => {
        const sd = { dlcVersions: { [TEST_ID]: 3 } };
        SaveManager.applyDLCVersion(sd, TEST_ID, 2);
        expect(sd.dlcVersions[TEST_ID]).toBe(3);
    });

    it('initializes dlcVersions when absent and tolerates bad input', () => {
        const sd = {};
        SaveManager.applyDLCVersion(sd, TEST_ID, 1);
        expect(sd.dlcVersions).toBeTypeOf('object');
        // non-numeric version → returns saveData untouched
        const sd2 = {};
        SaveManager.applyDLCVersion(sd2, TEST_ID, undefined);
        expect(sd2.dlcVersions).toBeUndefined();
    });
});
