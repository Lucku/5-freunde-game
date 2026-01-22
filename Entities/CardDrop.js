class CardDrop {
    constructor(x, y, cardKey) {
        this.x = x; this.y = y; this.cardKey = cardKey;
        this.angle = 0;
        this.scale = 1;
        this.scaleDir = 0.01;
    }
    draw() {
        this.angle += 0.02;
        this.scale += this.scaleDir;
        if (this.scale > 1.1 || this.scale < 0.9) this.scaleDir *= -1;

        ctx.save();
        ctx.translate(this.x, this.y);
        ctx.rotate(this.angle);
        ctx.scale(this.scale, this.scale);

        // Card Body
        ctx.fillStyle = '#fff';
        ctx.fillRect(-10, -14, 20, 28);
        ctx.strokeStyle = '#000';
        ctx.lineWidth = 1;
        ctx.strokeRect(-10, -14, 20, 28);

        // Inner Design
        const card = COLLECTOR_CARDS[this.cardKey];
        ctx.fillStyle = card ? card.color : '#333';
        ctx.fillRect(-8, -12, 16, 24);

        // Icon/Text
        ctx.fillStyle = '#fff';
        ctx.font = 'bold 14px Arial';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText('C', 0, 1);

        ctx.restore();
    }
}
