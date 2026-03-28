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

        } else if (this.type === 'time') {
            // CHRONO ORB: layered pulsing rings + rotating energy wisps
            const t = Date.now();
            const pulse = 0.75 + 0.25 * Math.sin(t * 0.007);
            const r = this.radius;

            // Outer aura
            const aura = ctx.createRadialGradient(0, 0, r * 0.2, 0, 0, r * 2.2);
            aura.addColorStop(0,   'rgba(200,170,80,0.35)');
            aura.addColorStop(0.5, 'rgba(120,80,200,0.15)');
            aura.addColorStop(1,   'rgba(80,40,160,0)');
            ctx.fillStyle = aura;
            ctx.beginPath(); ctx.arc(0, 0, r * 2.2, 0, Math.PI * 2); ctx.fill();

            // Rotating outer ring
            ctx.save();
            ctx.rotate(t * 0.003);
            ctx.strokeStyle = 'rgba(200,170,80,0.55)';
            ctx.lineWidth = 1.2;
            ctx.setLineDash([4, 6]);
            ctx.beginPath(); ctx.arc(0, 0, r * 1.6, 0, Math.PI * 2); ctx.stroke();
            ctx.setLineDash([]);
            ctx.restore();

            // Counter-rotating inner ring
            ctx.save();
            ctx.rotate(-t * 0.005);
            ctx.strokeStyle = 'rgba(160,120,255,0.5)';
            ctx.lineWidth = 1;
            ctx.setLineDash([3, 5]);
            ctx.beginPath(); ctx.arc(0, 0, r * 1.1, 0, Math.PI * 2); ctx.stroke();
            ctx.setLineDash([]);
            ctx.restore();

            // Core orb
            const core = ctx.createRadialGradient(0, 0, 0, 0, 0, r);
            core.addColorStop(0,   '#fffbe0');
            core.addColorStop(0.4, '#c8aa6e');
            core.addColorStop(1,   '#7c5020');
            ctx.shadowColor = '#c8aa6e';
            ctx.shadowBlur  = 12 * pulse;
            ctx.fillStyle = core;
            ctx.beginPath(); ctx.arc(0, 0, r * pulse, 0, Math.PI * 2); ctx.fill();
            ctx.shadowBlur = 0;

            // Two tiny clock hands rotating inside
            ctx.save();
            ctx.rotate(t * 0.004);
            ctx.strokeStyle = 'rgba(255,245,200,0.8)';
            ctx.lineWidth = 1;
            ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(0, -r * 0.55); ctx.stroke();
            ctx.restore();
            ctx.save();
            ctx.rotate(t * 0.0012);
            ctx.strokeStyle = 'rgba(255,245,200,0.55)';
            ctx.lineWidth = 0.8;
            ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(0, -r * 0.38); ctx.stroke();
            ctx.restore();

        } else if (this.type === 'love') {
            // HEART ARROW: filled heart with glow + sparkle trail
            const t   = Date.now();
            const r   = this.radius;
            const pulse = 0.85 + 0.15 * Math.sin(t * 0.012);

            // Rotate to travel direction
            ctx.rotate(angle + Math.PI * 0.5);

            // Outer glow
            ctx.shadowColor = '#ff1a6b';
            ctx.shadowBlur  = 14 * pulse;

            // Heart path (centred, pointing downward in local space)
            const s = r * 1.4 * pulse;
            ctx.beginPath();
            ctx.moveTo(0, s * 0.4);
            ctx.bezierCurveTo( s * 0.5,  s * 0.1,  s,      -s * 0.3,  0,     -s * 0.7);
            ctx.bezierCurveTo(-s,        -s * 0.3, -s * 0.5, s * 0.1,  0,      s * 0.4);
            ctx.closePath();

            // Gradient fill — hot pink to deep rose
            const hg = ctx.createRadialGradient(0, -s * 0.1, 0, 0, 0, s);
            hg.addColorStop(0,   '#ff9dbf');
            hg.addColorStop(0.5, '#ff4d94');
            hg.addColorStop(1,   '#c0124a');
            ctx.fillStyle = hg;
            ctx.fill();

            // White sheen highlight
            ctx.globalAlpha = 0.35;
            ctx.fillStyle = '#ffffff';
            ctx.beginPath();
            ctx.ellipse(-s * 0.2, -s * 0.45, s * 0.18, s * 0.11, -0.6, 0, Math.PI * 2);
            ctx.fill();
            ctx.globalAlpha = 1;
            ctx.shadowBlur = 0;

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
