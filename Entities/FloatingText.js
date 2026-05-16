class FloatingText {
    constructor(x, y, text, color, size, world = null) {
        this.x = x; this.y = y;
        this.text = text;
        this.color = color;
        this.size = size;
        this.life = 60;
        this.maxLife = 60;
        // #40 — crit heuristic: '!' suffix or large size triggers polish.
        this.isCrit = FloatingText._detectCrit(text, size);
        this.velocity = FloatingText._initialVelocity(this.isCrit);
        this._world = world ?? (typeof window !== 'undefined' ? window._world : null) ?? null;
    }

    static _detectCrit(text, size) {
        if (typeof text === 'string' && text.length > 0 && text.indexOf('!') !== -1) return true;
        if (typeof size === 'number' && size >= 25) return true;
        return false;
    }

    static _initialVelocity(isCrit) {
        if (isCrit) {
            // Larger arc + horizontal kick for visual flair.
            return { x: (Math.random() - 0.5) * 5, y: -4 };
        }
        return { x: (Math.random() - 0.5) * 2, y: -2 };
    }

    update() {
        this.x += this.velocity.x;
        this.y += this.velocity.y;
        this.life--;
        this.velocity.y *= 0.9; // Gravity-ish drag
        // Crit arc — extra gravity so the kick falls back faster.
        if (this.isCrit) this.velocity.y += 0.18;
    }

    draw() {
        if (typeof gameConfig !== 'undefined' && !gameConfig.damageNumbers) return;

        ctx.save();
        ctx.globalAlpha = Math.max(0, this.life / this.maxLife);
        const scaleCfg = (typeof gameConfig !== 'undefined' && Number(gameConfig.fontScale)) || 1;

        // #40 — crit scale-pulse: starts ~1.6× and eases to 1× over life.
        const t = 1 - (this.life / this.maxLife);
        const scaleCrit = this.isCrit ? (1 + 0.6 * (1 - Math.min(1, t * 2))) : 1;
        const finalSize = this.size * scaleCfg * scaleCrit;

        // Color shift: crits alternate between stored color and white flash.
        const flash = this.isCrit && ((this.life | 0) % 4 === 0);
        ctx.fillStyle = flash ? '#ffffff' : this.color;

        ctx.font = `bold ${finalSize}px Arial`;
        ctx.strokeStyle = 'black';
        ctx.lineWidth = this.isCrit ? 4 : 3;
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
        ft.maxLife = 60;
        ft.isCrit = FloatingText._detectCrit(text, size);
        const v = FloatingText._initialVelocity(ft.isCrit);
        ft.velocity.x = v.x;
        ft.velocity.y = v.y;
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
