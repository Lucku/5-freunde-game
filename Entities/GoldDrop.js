class GoldDrop {
    constructor(x, y) {
        this.x = x;
        this.y = y;
        this.radius = 10;
        this.value = Math.floor(Math.random() * 10) + 5;
        this._angle = Math.random() * Math.PI * 2; // spin offset
        this._bobOffset = Math.random() * Math.PI * 2;
        // Coin tier: small/medium/large based on value
        this._tier = this.value >= 12 ? 2 : this.value >= 8 ? 1 : 0;
    }

    draw() {
        this._angle += 0.04;
        const t = Date.now() / 1000;
        const bob = Math.sin(t * 2.5 + this._bobOffset) * 3;

        // Coin thickness — oscillate to simulate 3-D spin
        const scaleX = Math.abs(Math.cos(this._angle));
        const coinR = 9 + this._tier * 2;

        // Coin colors by tier
        const rimColor   = ['#b8860b', '#d4a017', '#e8c84a'][this._tier];
        const faceColor  = ['#d4a017', '#f0c330', '#ffd85e'][this._tier];
        const shineColor = ['rgba(255,240,160,0.55)', 'rgba(255,248,180,0.65)', 'rgba(255,255,200,0.75)'][this._tier];
        const glowColor  = ['rgba(210,160,20,0.25)', 'rgba(240,195,30,0.3)', 'rgba(255,220,60,0.35)'][this._tier];

        ctx.save();
        ctx.translate(this.x, this.y + bob);

        // Outer glow
        const glow = ctx.createRadialGradient(0, 0, coinR * 0.3, 0, 0, coinR * 2);
        glow.addColorStop(0, glowColor);
        glow.addColorStop(1, 'rgba(0,0,0,0)');
        ctx.fillStyle = glow;
        ctx.beginPath();
        ctx.ellipse(0, 0, coinR * 2, coinR * 1.4, 0, 0, Math.PI * 2);
        ctx.fill();

        // Coin rim (slightly larger, darker)
        ctx.fillStyle = rimColor;
        ctx.beginPath();
        ctx.ellipse(0, 2, coinR * scaleX + 1, coinR + 1, 0, 0, Math.PI * 2);
        ctx.fill();

        // Coin face (gradient top-lit)
        const faceGrad = ctx.createRadialGradient(-coinR * scaleX * 0.25, -coinR * 0.3, 1, 0, 0, coinR);
        faceGrad.addColorStop(0, shineColor.replace('rgba', 'rgba').replace(/[\d.]+\)$/, '0.9)'));
        faceGrad.addColorStop(0.35, faceColor);
        faceGrad.addColorStop(1, rimColor);
        ctx.fillStyle = faceGrad;
        ctx.beginPath();
        ctx.ellipse(0, 0, coinR * scaleX, coinR, 0, 0, Math.PI * 2);
        ctx.fill();

        // Inner ring detail
        ctx.strokeStyle = rimColor;
        ctx.lineWidth = 0.8;
        ctx.globalAlpha = 0.5;
        ctx.beginPath();
        ctx.ellipse(0, 0, coinR * scaleX * 0.7, coinR * 0.7, 0, 0, Math.PI * 2);
        ctx.stroke();
        ctx.globalAlpha = 1;

        // Specular highlight
        if (scaleX > 0.15) {
            const hx = -coinR * scaleX * 0.3;
            const hy = -coinR * 0.35;
            const shine = ctx.createRadialGradient(hx, hy, 0, hx, hy, coinR * scaleX * 0.55);
            shine.addColorStop(0, shineColor);
            shine.addColorStop(1, 'rgba(255,255,255,0)');
            ctx.fillStyle = shine;
            ctx.beginPath();
            ctx.ellipse(0, 0, coinR * scaleX, coinR, 0, 0, Math.PI * 2);
            ctx.fill();
        }

        // Center symbol — ¢ / coin mark
        if (scaleX > 0.3) {
            ctx.globalAlpha = scaleX;
            ctx.fillStyle = rimColor;
            ctx.font = `bold ${7 + this._tier * 2}px serif`;
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            ctx.save();
            ctx.scale(scaleX, 1);
            ctx.fillText('✦', 0, 0);
            ctx.restore();
            ctx.globalAlpha = 1;
        }

        ctx.restore();
    }
}
