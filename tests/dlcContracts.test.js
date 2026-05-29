// #174 — DLC stub layer + contract validator tests.
import { describe, it, expect, afterEach } from 'vitest';
import { registry, registryRoot, validateDLCContract } from '../dlc/dlcContracts.js';

const root = registryRoot();

// Track keys we create so each test cleans up the shared root (window|global).
function cleanup(...names) {
    for (const n of names) delete root[n];
}

describe('registry() accessor (dual-env stub surface)', () => {
    afterEach(() => cleanup('FOO_LOGIC', 'STORY_EVENTS', 'HERO_LOGIC'));

    it('lazily creates an object registry and returns the live reference', () => {
        expect(root.FOO_LOGIC).toBeUndefined();
        const a = registry('FOO_LOGIC');
        expect(a).toEqual({});
        a.someHero = 1;
        const b = registry('FOO_LOGIC'); // same call again
        expect(b).toBe(a);              // same reference, not a fresh object
        expect(b.someHero).toBe(1);     // mutations persist (write-through)
        expect(root.FOO_LOGIC).toBe(a); // lives on the active root
    });

    it('creates array-shaped registries as arrays', () => {
        const ev = registry('STORY_EVENTS');
        expect(Array.isArray(ev)).toBe(true);
        ev.push({ id: 'x' });
        expect(registry('STORY_EVENTS')).toHaveLength(1);
    });

    it('does not clobber an existing registry', () => {
        root.HERO_LOGIC = { existing: {} };
        const r = registry('HERO_LOGIC');
        expect(r.existing).toBeDefined();
    });
});

describe('validateDLCContract()', () => {
    afterEach(() => cleanup('HERO_LOGIC'));

    it('passes when every declared hero is registered', () => {
        root.HERO_LOGIC = { gravity: {}, void: {} };
        const problems = validateDLCContract('champions_of_chaos', { heroes: ['gravity', 'void'] });
        expect(problems).toEqual([]);
    });

    it('flags a declared hero missing from HERO_LOGIC (loud failure source)', () => {
        root.HERO_LOGIC = { gravity: {} }; // 'void' never registered
        const problems = validateDLCContract('champions_of_chaos', { heroes: ['gravity', 'void'] });
        expect(problems).toHaveLength(1);
        expect(problems[0]).toContain('void');
        expect(problems[0]).toContain('champions_of_chaos');
    });

    it('treats a DLC with no declared heroes as trivially valid', () => {
        root.HERO_LOGIC = {};
        expect(validateDLCContract('x', { heroes: [] })).toEqual([]);
        expect(validateDLCContract('x', {})).toEqual([]);
    });

    it('reports a missing manifest object', () => {
        expect(validateDLCContract('x', null)).toHaveLength(1);
    });
});
