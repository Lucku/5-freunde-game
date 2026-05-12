class Particle {
    constructor(x, y, color, world = null) {
        this.x = x; this.y = y; this.color = color;
        this.velocity = { x: (Math.random() - 0.5) * 5, y: (Math.random() - 0.5) * 5 };
        this.alpha = 1; this.life = Math.random() * 0.05 + 0.02;
        this._world = world ?? (typeof window !== 'undefined' ? window._world : null) ?? null;
    }
    update() { this.x += this.velocity.x; this.y += this.velocity.y; this.alpha -= this.life; }

    // #25/#26 — sprite cache. Lazily prerenders an 8×8 disc per unique color
    // into an offscreen canvas, then draw() blits via drawImage instead of
    // ctx.save / fillStyle / beginPath / arc / fill / restore per particle
    // (7 ops → 2). Cache bounded to 64 entries with FIFO eviction so a
    // runaway DLC can't grow it unbounded.
    static _spriteCache = new Map();
    static _SPRITE_CACHE_MAX = 64;
    static _SPRITE_R = 3;       // particle radius in source canvas
    static _SPRITE_SIZE = 8;    // 2r + 1px halo on each side
    static _SPRITE_HALF = 4;    // offset used by drawImage to centre on (x, y)
    static _getSprite(color) {
        const cache = Particle._spriteCache;
        let s = cache.get(color);
        if (s) return s;
        if (typeof document === 'undefined') return null;
        const size = Particle._SPRITE_SIZE;
        s = document.createElement('canvas');
        s.width = size; s.height = size;
        const sctx = s.getContext('2d');
        sctx.fillStyle = color;
        sctx.beginPath();
        sctx.arc(Particle._SPRITE_HALF, Particle._SPRITE_HALF, Particle._SPRITE_R, 0, Math.PI * 2);
        sctx.fill();
        if (cache.size >= Particle._SPRITE_CACHE_MAX) {
            const first = cache.keys().next().value;
            if (first !== undefined) cache.delete(first);
        }
        cache.set(color, s);
        return s;
    }

    draw() {
        const sprite = Particle._getSprite(this.color);
        if (!sprite) {
            // Server/no-document fallback — original immediate-mode path.
            ctx.save(); ctx.globalAlpha = this.alpha; ctx.fillStyle = this.color;
            ctx.beginPath(); ctx.arc(this.x, this.y, Particle._SPRITE_R, 0, Math.PI * 2); ctx.fill(); ctx.restore();
            return;
        }
        ctx.globalAlpha = this.alpha;
        ctx.drawImage(sprite, this.x - Particle._SPRITE_HALF, this.y - Particle._SPRITE_HALF);
    }

    // #20 — object pool. Reuses retired Particle instances to cut GC churn.
    // Callers use Particle.acquire(...) instead of `new Particle(...)`.
    // The owning array (game.js `particles[]`) calls Particle.release(p) when
    // alpha hits 0 before splicing.
    static _pool = [];
    static POOL_MAX = 256;
    static acquire(x, y, color, world = null) {
        const p = Particle._pool.pop();
        if (!p) return new Particle(x, y, color, world);
        p.x = x; p.y = y; p.color = color;
        p.velocity.x = (Math.random() - 0.5) * 5;
        p.velocity.y = (Math.random() - 0.5) * 5;
        p.alpha = 1;
        p.life = Math.random() * 0.05 + 0.02;
        p._world = world ?? (typeof window !== 'undefined' ? window._world : null) ?? null;
        return p;
    }
    static release(p) {
        if (Particle._pool.length >= Particle.POOL_MAX) return;
        Particle._pool.push(p);
    }
}
export { Particle };
export default Particle;
if (typeof window !== 'undefined') window.Particle = Particle;
