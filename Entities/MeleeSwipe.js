class MeleeSwipe {
    constructor(x, y, angle, damage, color, radius, isCrit = false, owner = null, world = null) {
        this.x = x; this.y = y; this.angle = angle;
        this.damage = damage; this.color = color;
        this.life = 15; this.maxLife = 15;
        this.radius = radius;
        this.hitList = [];
        this.isCrit = isCrit;
        this.owner = owner;
        this._world = world ?? (typeof window !== 'undefined' ? window._world : null) ?? null;
    }
    update() {
        if (this.owner) {
            this.x = this.owner.x;
            this.y = this.owner.y;
        } else {
            const _p = this._world?.player ?? (typeof player !== 'undefined' ? player : null);
            if (_p) { this.x = _p.x; this.y = _p.y; }
        }
        this.life--;
    }
    draw() {
        ctx.save(); ctx.translate(this.x, this.y); ctx.rotate(this.angle);
        ctx.beginPath(); ctx.arc(0, 0, this.radius, -Math.PI / 3, Math.PI / 3);
        ctx.lineWidth = (this.isCrit ? 8 : 5) * (this.life / this.maxLife);
        ctx.strokeStyle = this.isCrit ? '#f1c40f' : 'white';
        ctx.stroke();
        ctx.fillStyle = this.color; ctx.globalAlpha = 0.5 * (this.life / this.maxLife); ctx.fill();
        ctx.restore();
    }

    // #20 P3 — object pool. Strict reset of every constructor field. hitList
    // is replaced with the existing array (cleared in place) to keep the
    // pool's hidden class stable across reuse.
    static _pool = [];
    static POOL_MAX = 64;
    static acquire(x, y, angle, damage, color, radius, isCrit = false, owner = null, world = null) {
        const a = MeleeSwipe._pool.pop();
        if (!a) return new MeleeSwipe(x, y, angle, damage, color, radius, isCrit, owner, world);
        a.x = x; a.y = y; a.angle = angle;
        a.damage = damage; a.color = color;
        a.life = 15; a.maxLife = 15;
        a.radius = radius;
        if (a.hitList) a.hitList.length = 0; else a.hitList = [];
        a.isCrit = isCrit;
        a.owner = owner;
        a._world = world ?? (typeof window !== 'undefined' ? window._world : null) ?? null;
        return a;
    }
    static release(a) {
        if (!a || MeleeSwipe._pool.length >= MeleeSwipe.POOL_MAX) return;
        MeleeSwipe._pool.push(a);
    }
}
export { MeleeSwipe };
export default MeleeSwipe;
if (typeof window !== 'undefined') window.MeleeSwipe = MeleeSwipe;
