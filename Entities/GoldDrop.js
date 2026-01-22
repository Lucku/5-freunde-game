class GoldDrop {
    constructor(x, y) {
        this.x = x; this.y = y; this.radius = 10; this.angle = 0;
        this.value = Math.floor(Math.random() * 10) + 5;
    }
    draw() {
        this.angle += 0.1;
        ctx.save(); ctx.translate(this.x, this.y); ctx.rotate(this.angle);
        ctx.fillStyle = '#f1c40f';
        ctx.beginPath(); ctx.arc(0, 0, 8, 0, Math.PI * 2); ctx.fill();
        ctx.strokeStyle = '#f39c12'; ctx.lineWidth = 2; ctx.stroke();
        ctx.fillStyle = 'black'; ctx.font = 'bold 10px Arial'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
        ctx.fillText('$', 0, 1); ctx.restore();
    }
}
