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
}
if (typeof module !== 'undefined' && module.exports) module.exports = MeleeSwipe;
