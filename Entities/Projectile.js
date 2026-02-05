class Projectile {
    constructor(x, y, velocity, damage, color, radius, type, knockback, isEnemy, isExplosive = false, isCrit = false) {
        this.x = x; this.y = y; this.velocity = velocity;
        this.damage = damage; this.color = color; this.radius = radius;
        this.type = type; this.knockback = knockback; this.isEnemy = isEnemy;
        this.isExplosive = isExplosive;
        this.isCrit = isCrit; // Store crit status
        this.pierce = (type === 'ice' && !isEnemy) ? 2 : 0;
        this.owner = null; // Reference to the entity that fired this

        if (this.isCrit) {
            this.radius *= 1.5; // Visual indicator
        }
        this.life = null; // Optional lifetime
    }
    update() {
        this.x += this.velocity.x;
        this.y += this.velocity.y;
        if (this.life !== null) this.life--;
    }
    draw() {
        ctx.save();
        ctx.translate(this.x, this.y);
        // Calculate angle based on velocity
        const angle = Math.atan2(this.velocity.y, this.velocity.x);

        // Crit Glow
        if (this.isCrit) {
            ctx.shadowBlur = 15;
            ctx.shadowColor = '#fff';
        }

        if (this.type === 'ice') {
            // ICICLE: White/Cyan shard
            ctx.rotate(angle);
            ctx.beginPath();
            ctx.moveTo(this.radius * 2, 0); // Tip
            ctx.lineTo(-this.radius, -this.radius * 0.6);
            ctx.lineTo(-this.radius, this.radius * 0.6);
            ctx.closePath();

            // Gradient or solid color
            ctx.fillStyle = this.color;
            ctx.fill();

            // Shine highlight
            ctx.fillStyle = '#fff';
            ctx.beginPath();
            ctx.moveTo(this.radius, -2);
            ctx.lineTo(this.radius * 1.5, 0);
            ctx.lineTo(this.radius, 2);
            ctx.fill();

        } else if (this.type === 'fire') {
            // FIREBALL: Core with trail
            ctx.rotate(angle);
            ctx.beginPath();
            ctx.arc(0, 0, this.radius, 0, Math.PI * 2);
            ctx.fillStyle = '#f1c40f'; // Yellow Core
            ctx.fill();

            // Flame Tail
            ctx.beginPath();
            ctx.moveTo(0, -this.radius);
            ctx.lineTo(-this.radius * 2.5, 0);
            ctx.lineTo(0, this.radius);
            ctx.fillStyle = 'rgba(231, 76, 60, 0.8)'; // Red/Orange
            ctx.fill();

        } else if (this.type === 'water') {
            // WATER: Droplet + small droplets
            ctx.rotate(angle);
            ctx.beginPath();
            ctx.arc(0, 0, this.radius, 0, Math.PI * 2);
            ctx.fillStyle = '#2980b9';
            ctx.fill();
            // Trailing droplets
            ctx.beginPath(); ctx.arc(-this.radius * 1.8, 0, this.radius * 0.5, 0, Math.PI * 2); ctx.fill();
            ctx.beginPath(); ctx.arc(-this.radius * 3.0, 0, this.radius * 0.3, 0, Math.PI * 2); ctx.fill();

        } else if (this.type === 'plant') {
            // LEAF: Green oval with vein
            ctx.rotate(angle);
            ctx.beginPath();
            ctx.ellipse(0, 0, this.radius * 2, this.radius, 0, 0, Math.PI * 2);
            ctx.fillStyle = '#2ecc71';
            ctx.fill();
            // Vein
            ctx.beginPath();
            ctx.moveTo(-this.radius * 2, 0);
            ctx.lineTo(this.radius * 2, 0);
            ctx.strokeStyle = '#145a32';
            ctx.lineWidth = 2;
            ctx.stroke();

        } else if (this.type === 'metal') {
            // SHURIKEN: Rotating star/gear
            const spin = Date.now() / 50;
            ctx.rotate(spin);
            ctx.beginPath();
            const sides = 4;
            for (let i = 0; i < sides * 2; i++) {
                const l = (i % 2 === 0) ? this.radius * 1.8 : this.radius * 0.6;
                const a = (Math.PI * i) / sides;
                ctx.lineTo(Math.cos(a) * l, Math.sin(a) * l);
            }
            ctx.closePath();
            ctx.fillStyle = '#7f8c8d';
            ctx.fill();
            ctx.strokeStyle = '#2c3e50';
            ctx.lineWidth = 1;
            ctx.stroke();

        } else if (this.type === 'black') {
            // DARK ENERGY: Pulsing orb
            ctx.shadowBlur = 15 + Math.sin(Date.now() / 100) * 5;
            ctx.shadowColor = '#8e44ad'; // Purple glow
            ctx.beginPath();
            ctx.arc(0, 0, this.radius * 1.3, 0, Math.PI * 2);
            ctx.fillStyle = '#000';
            ctx.fill();
            // Inner Core
            ctx.beginPath();
            ctx.arc(0, 0, this.radius * 0.7, 0, Math.PI * 2);
            ctx.fillStyle = '#4a148c';
            ctx.shadowBlur = 0;
            ctx.fill();

        } else {
            // FALLBACK / ENEMY
            ctx.beginPath(); ctx.arc(0, 0, this.radius, 0, Math.PI * 2);
            ctx.fillStyle = this.color; ctx.fill();
            ctx.shadowBlur = this.isCrit ? 20 : 10;
            ctx.shadowColor = this.isCrit ? '#fff' : this.color;
            ctx.fill();
        }

        if (this.isCrit) {
            ctx.strokeStyle = '#fff'; ctx.lineWidth = 2; ctx.stroke();
        }

        ctx.restore();
    }
}
