class HolyMask {
    constructor(x, y, isTrueGolden = false) {
        this.x = x; this.y = y; this.radius = 20; this.angle = 0;
        this.isTrueGolden = isTrueGolden;
    }
    draw() {
        this.angle += 0.05;
        ctx.save(); ctx.translate(this.x, this.y); ctx.rotate(this.angle);

        if (this.isTrueGolden) {
            // True Golden Mask Visuals
            ctx.shadowBlur = 20;
            ctx.shadowColor = '#f1c40f';
            ctx.fillStyle = '#fff'; // White hot center
            ctx.beginPath(); ctx.arc(0, 0, 18, 0, Math.PI * 2); ctx.fill();
            ctx.strokeStyle = '#f1c40f'; ctx.lineWidth = 4; ctx.stroke();
        } else {
            ctx.fillStyle = '#f1c40f'; // Gold
            ctx.beginPath(); ctx.arc(0, 0, 15, 0, Math.PI * 2); ctx.fill();
            ctx.strokeStyle = '#fff'; ctx.lineWidth = 2; ctx.stroke();
        }

        // Eyes
        ctx.fillStyle = 'black';
        ctx.beginPath(); ctx.arc(-5, -2, 3, 0, Math.PI * 2); ctx.fill();
        ctx.beginPath(); ctx.arc(5, -2, 3, 0, Math.PI * 2); ctx.fill();
        ctx.restore();
    }
}
