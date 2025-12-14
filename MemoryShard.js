class MemoryShard {
    constructor(x, y, heroType) {
        this.x = x;
        this.y = y;
        this.heroType = heroType;
        this.radius = 15;
        this.collected = false;
        this.color = this.getColorByType(heroType);
        this.floatOffset = 0;
    }

    getColorByType(type) {
        switch (type) {
            case 'fire': return '#e74c3c';
            case 'ice': return '#3498db';
            case 'plant': return '#2ecc71';
            case 'metal': return '#95a5a6';
            case 'water': return '#2980b9';
            default: return '#ffffff';
        }
    }

    update() {
        this.floatOffset = Math.sin(Date.now() / 500) * 5;
    }

    draw(ctx) {
        if (this.collected) return;

        ctx.save();
        ctx.translate(this.x, this.y + this.floatOffset);

        // Glow
        ctx.shadowBlur = 20;
        ctx.shadowColor = this.color;

        // Shape (Diamond)
        ctx.fillStyle = this.color;
        ctx.beginPath();
        ctx.moveTo(0, -15);
        ctx.lineTo(10, 0);
        ctx.lineTo(0, 15);
        ctx.lineTo(-10, 0);
        ctx.closePath();
        ctx.fill();

        // Inner Light
        ctx.fillStyle = '#fff';
        ctx.globalAlpha = 0.5;
        ctx.beginPath();
        ctx.moveTo(0, -8);
        ctx.lineTo(5, 0);
        ctx.lineTo(0, 8);
        ctx.lineTo(-5, 0);
        ctx.closePath();
        ctx.fill();

        ctx.restore();
    }
}
