class FloatingText {
    constructor(x, y, text, color, size) {
        this.x = x; this.y = y;
        this.text = text;
        this.color = color;
        this.size = size;
        this.life = 60;
        this.velocity = { x: (Math.random() - 0.5) * 2, y: -2 };
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
        ctx.font = `bold ${this.size}px Arial`;
        ctx.strokeStyle = 'black';
        ctx.lineWidth = 3;
        ctx.strokeText(this.text, this.x, this.y);
        ctx.fillText(this.text, this.x, this.y);
        ctx.restore();
    }
}
