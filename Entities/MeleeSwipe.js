class MeleeSwipe {
    constructor(x, y, angle, damage, color, radius, isCrit = false) {
        this.x = x; this.y = y; this.angle = angle;
        this.damage = damage; this.color = color;
        this.life = 15; this.maxLife = 15;
        this.radius = radius;
        this.hitList = [];
        this.isCrit = isCrit;
    }
    update() { this.x = player.x; this.y = player.y; this.life--; }
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
