class FloatingText {
    constructor(x, y, text, color, size, world = null) {
        this.x = x; this.y = y;
        this.text = text;
        this.color = color;
        this.size = size;
        this.life = 60;
        this.velocity = { x: (Math.random() - 0.5) * 2, y: -2 };
        this._world = world ?? (typeof window !== 'undefined' ? window._world : null) ?? null;
    }
    update() {
        this.x += this.velocity.x;
        this.y += this.velocity.y;
        this.life--;
        this.velocity.y *= 0.9; // Gravity-ish drag
    }
    draw() {
        if (typeof gameConfig !== 'undefined' && !gameConfig.damageNumbers) return;

        ctx.save();
        ctx.globalAlpha = Math.max(0, this.life / 60);
        ctx.fillStyle = this.color;
        const scale = (typeof gameConfig !== 'undefined' && Number(gameConfig.fontScale)) || 1;
        ctx.font = `bold ${this.size * scale}px Arial`;
        ctx.strokeStyle = 'black';
        ctx.lineWidth = 3;
        ctx.strokeText(this.text, this.x, this.y);
        ctx.fillText(this.text, this.x, this.y);
        ctx.restore();
    }

    // #20 — object pool. Reuses retired FloatingText instances to cut GC churn.
    static _pool = [];
    static POOL_MAX = 128;
    static acquire(x, y, text, color, size, world = null) {
        const ft = FloatingText._pool.pop();
        if (!ft) return new FloatingText(x, y, text, color, size, world);
        ft.x = x; ft.y = y;
        ft.text = text;
        ft.color = color;
        ft.size = size;
        ft.life = 60;
        ft.velocity.x = (Math.random() - 0.5) * 2;
        ft.velocity.y = -2;
        ft._world = world ?? (typeof window !== 'undefined' ? window._world : null) ?? null;
        return ft;
    }
    static release(ft) {
        if (FloatingText._pool.length >= FloatingText.POOL_MAX) return;
        FloatingText._pool.push(ft);
    }
}
export { FloatingText };
export default FloatingText;
if (typeof window !== 'undefined') window.FloatingText = FloatingText;
