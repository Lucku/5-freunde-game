class Particle {
    constructor(x, y, color, world = null) {
        this.x = x; this.y = y; this.color = color;
        this.velocity = { x: (Math.random() - 0.5) * 5, y: (Math.random() - 0.5) * 5 };
        this.alpha = 1; this.life = Math.random() * 0.05 + 0.02;
        this._world = world ?? (typeof window !== 'undefined' ? window._world : null) ?? null;
    }
    update() { this.x += this.velocity.x; this.y += this.velocity.y; this.alpha -= this.life; }
    draw() {
        ctx.save(); ctx.globalAlpha = this.alpha; ctx.fillStyle = this.color;
        ctx.beginPath(); ctx.arc(this.x, this.y, 3, 0, Math.PI * 2); ctx.fill(); ctx.restore();
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
