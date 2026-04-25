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
        // DLC hook: allow overrides via prototype patching
        if (window.BIOME_LOGIC && window._MEMORY_SHARD_COLORS && window._MEMORY_SHARD_COLORS[type]) {
            return window._MEMORY_SHARD_COLORS[type];
        }
        switch (type) {
            case 'fire':        return '#e74c3c';
            case 'water':       return '#3498db';
            case 'ice':         return '#aac8da';
            case 'plant':       return '#2ecc71';
            case 'metal':       return '#95a5a6';
            case 'earth':       return '#8d6e63';
            case 'lightning':   return '#f1c40f';
            case 'gravity':     return '#9b59b6';
            case 'void':        return '#00bcd4';
            case 'spirit':      return '#f0d080';
            case 'chance':      return '#e040fb';
            case 'time':        return '#c8aa6e';
            case 'love':        return '#ff6b9d';
            case 'air':         return '#40e0d0';
            case 'black':       return '#2c3e50';
            case 'green_goblin':
            case 'goblin':      return '#27ae60';
            case 'makuta':      return '#8e44ad';
            default:            return '#ffffff';
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
