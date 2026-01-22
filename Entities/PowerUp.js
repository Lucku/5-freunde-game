class PowerUp {
    constructor() {
        let safe = false;
        while (!safe) {
            this.x = Math.random() * (arena.width - 100) + 50;
            this.y = Math.random() * (arena.height - 100) + 50;
            if (!arena.checkCollision(this.x, this.y, 15)) safe = true;
        }
        this.type = POWERUP_TYPES[Math.floor(Math.random() * POWERUP_TYPES.length)];
        this.radius = 15; this.timer = 600; this.oscillation = Math.random() * Math.PI;
    }
    update() { this.timer--; }
    draw() {
        ctx.save(); ctx.translate(this.x, this.y + Math.sin(frame * 0.1 + this.oscillation) * 5);
        ctx.shadowBlur = 15; ctx.shadowColor = 'white';
        let color = '#fff'; let symbol = '?';
        if (this.type === 'HEAL') { color = '#2ecc71'; symbol = '+'; }
        else if (this.type === 'MAXHP') { color = '#e74c3c'; symbol = '♥'; }
        else if (this.type === 'SPEED') { color = '#f1c40f'; symbol = '⚡'; }
        else if (this.type === 'MULTI') { color = '#3498db'; symbol = '⁙'; }
        else if (this.type === 'AUTOAIM') { color = '#9b59b6'; symbol = '🎯'; }
        ctx.fillStyle = color; ctx.beginPath(); ctx.arc(0, 0, this.radius, 0, Math.PI * 2); ctx.fill();
        ctx.fillStyle = 'white'; ctx.font = 'bold 16px Arial'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
        ctx.fillText(symbol, 0, 1); ctx.restore();
    }
}
