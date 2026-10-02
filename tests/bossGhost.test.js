import { describe, it, expect, beforeAll } from 'vitest';

// Online co-op: server bosses reach clients as Boss-prototype ghosts
// (Boss.createGhost) so boss music hooks, the HP bar and the intro camera —
// all `instanceof Boss` — see them, and Boss.draw renders their art.

let Boss;
let depth = 0, maxDepth = 0;
const ctx = new Proxy(function () {}, {
    get(_t, prop) {
        if (prop === 'save') return () => { depth++; maxDepth = Math.max(maxDepth, depth); };
        if (prop === 'restore') return () => { depth--; };
        if (prop === Symbol.toPrimitive) return () => 0;
        return ctx;
    },
    apply: () => ctx,
    set: () => true,
});

beforeAll(async () => {
    globalThis.window = globalThis.window || globalThis;
    globalThis.ctx = ctx;
    globalThis.frame = 0;
    globalThis.player = { x: 0, y: 0 };
    window._DLC_BOSS_REGISTRY = {
        // A DLC boss whose art needs state a ghost doesn't have.
        NEEDS_STATE: { init(b) { b.radius = 70; }, draw(c) { c.save(); throw new Error('missing state'); } },
    };
    ({ Boss } = await import('../Boss.js'));
});

describe('Boss.createGhost', () => {
    it('is a Boss with the type, art defaults and no simulation', () => {
        const g = Boss.createGhost('MAKUTA');
        expect(g).toBeInstanceOf(Boss);
        expect(g.isBoss && g._ghost).toBe(true);
        expect(g.type).toBe('MAKUTA');
        expect(g.radius).toBe(85);
        expect(g.mkOrbs).toHaveLength(3);
        expect(g._id).toBeUndefined(); // the snapshot's id is set by the client
    });

    it('draws base bosses with balanced canvas state', () => {
        for (const t of ['TANK', 'SPEEDSTER', 'NOVA', 'RHINO', 'HYDRA', 'MAKUTA', 'GREEN_GOBLIN', 'DARK_GOLEM', 'ZEUS']) {
            const g = Boss.createGhost(t);
            g.x = 100; g.y = 100; g.hp = 50; g.maxHp = 100;
            depth = 0;
            g.drawGhost();
            expect(depth, t).toBe(0);
            expect(g._plainDraw, t).toBeUndefined();
        }
    });

    it('falls back to the plain body for good when a DLC draw throws', () => {
        const g = Boss.createGhost('NEEDS_STATE');
        g.x = 100; g.y = 100;
        depth = 0;
        expect(() => g.drawGhost()).not.toThrow();
        expect(g._plainDraw).toBe(true);
        expect(depth).toBe(0);
        expect(g.type).toBe('NEEDS_STATE');
        expect(() => g.drawGhost()).not.toThrow(); // straight to the plain body
        expect(depth).toBe(0);
    });
});
