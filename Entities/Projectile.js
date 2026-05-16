import { cachedRadial } from '../Utils.js';

class Projectile {
    constructor(x, y, velocity, damage, color, radius, type, knockback, isEnemy, isExplosive = false, isCrit = false, world = null) {
        this.x = x; this.y = y; this.velocity = velocity;
        this.damage = damage; this.color = color; this.radius = radius;
        this.type = type; this.knockback = knockback; this.isEnemy = isEnemy;
        this.isExplosive = isExplosive;
        this.isCrit = isCrit;
        this.pierce = (type === 'ice' && !isEnemy) ? 2 : 0;
        this.owner = null;
        this._world = world ?? (typeof window !== 'undefined' ? window._world : null) ?? null;

        if (this.isCrit) {
            this.radius *= 1.5;
        }
        this.life = null;
    }
    update() {
        this.x += this.velocity.x;
        this.y += this.velocity.y;
        if (this.life !== null) this.life--;
    }
    draw() {
        const NOW = Date.now();
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
            const spin = NOW / 50;
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
            ctx.shadowBlur = 15 + Math.sin(NOW / 100) * 5;
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
            const t = NOW;
            const pulse = 0.75 + 0.25 * Math.sin(t * 0.007);
            const r = this.radius;

            // Outer aura
            const aura = cachedRadial(ctx, `proj-time-aura:${r}`, r * 0.2, r * 2.2, [
                [0,   'rgba(200,170,80,0.35)'],
                [0.5, 'rgba(120,80,200,0.15)'],
                [1,   'rgba(80,40,160,0)']
            ]);
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
            const core = cachedRadial(ctx, `proj-time-core:${r}`, 0, r, [
                [0,   '#fffbe0'],
                [0.4, '#c8aa6e'],
                [1,   '#7c5020']
            ]);
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
            const t   = NOW;
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

            // Gradient fill — hot pink to deep rose. Note: offset center (-s*0.1)
            // collapses to (0,0) under cachedRadial; the visual difference is minor
            // and the cache reuse outweighs the displacement loss.
            const hg = cachedRadial(ctx, `proj-love-heart:${Math.round(s * 4)}`, 0, s, [
                [0,   '#ff9dbf'],
                [0.5, '#ff4d94'],
                [1,   '#c0124a']
            ]);
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

        } else if (this.type === 'smoke') {
            // SMOKE PUFF: dark wispy orb with trailing tendrils
            const t = NOW;
            const r = this.radius;
            const pulse = 0.85 + 0.15 * Math.sin(t * 0.012);

            ctx.rotate(angle);

            // Outer smoky aura
            const aura = cachedRadial(ctx, `proj-smoke-aura:${r}`, r * 0.2, r * 2.0, [
                [0,   'rgba(90, 90, 110, 0.55)'],
                [0.5, 'rgba(60, 60, 75, 0.25)'],
                [1,   'rgba(15, 15, 20, 0)']
            ]);
            ctx.fillStyle = aura;
            ctx.beginPath(); ctx.arc(0, 0, r * 2.0 * pulse, 0, Math.PI * 2); ctx.fill();

            // Trailing wisps behind direction of travel
            ctx.fillStyle = 'rgba(60, 60, 75, 0.45)';
            ctx.beginPath(); ctx.arc(-r * 1.8, -r * 0.3 + Math.sin(t * 0.02) * r * 0.2, r * 0.55, 0, Math.PI * 2); ctx.fill();
            ctx.beginPath(); ctx.arc(-r * 2.8,  r * 0.3 + Math.cos(t * 0.02) * r * 0.2, r * 0.35, 0, Math.PI * 2); ctx.fill();

            // Dark inner core
            const core = cachedRadial(ctx, `proj-smoke-core:${r}`, 0, r, [
                [0,   '#3a3a48'],
                [0.6, '#1a1a22'],
                [1,   '#0f0f14']
            ]);
            ctx.fillStyle = core;
            ctx.beginPath(); ctx.arc(0, 0, r * pulse, 0, Math.PI * 2); ctx.fill();

            // Subtle swirl
            ctx.strokeStyle = 'rgba(140, 140, 160, 0.4)';
            ctx.lineWidth = 1;
            ctx.beginPath();
            ctx.arc(0, 0, r * 0.6, t * 0.01 % (Math.PI * 2), (t * 0.01 % (Math.PI * 2)) + Math.PI);
            ctx.stroke();

        } else if (this.type === 'mirror') {
            // MIRROR SHARD: angular glass fragment with prismatic sheen
            const t = NOW;
            const r = this.radius;

            ctx.rotate(angle);

            // Faint blue glow
            ctx.shadowColor = '#5dade2';
            ctx.shadowBlur  = 8;

            // Elongated diamond shard
            ctx.beginPath();
            ctx.moveTo(r * 2.2, 0);
            ctx.lineTo(0, -r * 0.8);
            ctx.lineTo(-r * 1.4, 0);
            ctx.lineTo(0, r * 0.8);
            ctx.closePath();

            // Glassy gradient body
            const body = cachedRadial(ctx, `proj-mirror-body:${r}`, 0, r * 1.6, [
                [0,   'rgba(220, 240, 255, 0.95)'],
                [0.5, 'rgba(93, 173, 226, 0.85)'],
                [1,   'rgba(26, 82, 118, 0.9)']
            ]);
            ctx.fillStyle = body;
            ctx.fill();
            ctx.shadowBlur = 0;

            // Dark edge outline
            ctx.strokeStyle = '#0e2e44';
            ctx.lineWidth = 1;
            ctx.stroke();

            // Bright sheen stripe (prism highlight) — shifts with time
            ctx.globalAlpha = 0.7;
            ctx.strokeStyle = '#ffffff';
            ctx.lineWidth = 1.4;
            ctx.beginPath();
            ctx.moveTo(r * 1.2, -r * 0.25);
            ctx.lineTo(-r * 0.4, r * 0.25);
            ctx.stroke();

            // Rainbow refraction tick
            ctx.strokeStyle = `hsl(${(t * 0.1) % 360}, 80%, 70%)`;
            ctx.lineWidth = 0.8;
            ctx.beginPath();
            ctx.moveTo(r * 0.6, -r * 0.45);
            ctx.lineTo(r * 0.1, -r * 0.1);
            ctx.stroke();
            ctx.globalAlpha = 1;

        } else if (this.type === 'psycho') {
            // PSYCHIC BOLT: erratic teal orb with crackling sparks
            const t = NOW;
            const r = this.radius;
            const pulse = 0.8 + 0.2 * Math.sin(t * 0.025);

            // Outer psychic aura
            const aura = cachedRadial(ctx, `proj-psycho-aura:${r}`, r * 0.2, r * 2.0, [
                [0,   'rgba(26, 188, 156, 0.5)'],
                [0.5, 'rgba(155, 89, 182, 0.25)'],
                [1,   'rgba(26, 188, 156, 0)']
            ]);
            ctx.fillStyle = aura;
            ctx.beginPath(); ctx.arc(0, 0, r * 2.0, 0, Math.PI * 2); ctx.fill();

            // Pulsing teal core
            const core = cachedRadial(ctx, `proj-psycho-core:${r}`, 0, r, [
                [0,   '#e8fff8'],
                [0.4, '#1abc9c'],
                [1,   '#117a65']
            ]);
            ctx.shadowColor = '#1abc9c';
            ctx.shadowBlur  = 10 * pulse;
            ctx.fillStyle = core;
            ctx.beginPath(); ctx.arc(0, 0, r * pulse, 0, Math.PI * 2); ctx.fill();
            ctx.shadowBlur = 0;

            // Erratic spark arcs — 3 short jagged lines around the orb
            ctx.strokeStyle = 'rgba(232, 255, 248, 0.85)';
            ctx.lineWidth = 1;
            for (let i = 0; i < 3; i++) {
                const baseA = (t * 0.01 + i * (Math.PI * 2 / 3)) % (Math.PI * 2);
                const x0 = Math.cos(baseA) * r * 1.1;
                const y0 = Math.sin(baseA) * r * 1.1;
                const x1 = Math.cos(baseA) * r * 1.8 + Math.sin(t * 0.05 + i) * r * 0.3;
                const y1 = Math.sin(baseA) * r * 1.8 + Math.cos(t * 0.05 + i) * r * 0.3;
                ctx.beginPath();
                ctx.moveTo(x0, y0);
                ctx.lineTo((x0 + x1) * 0.5 + Math.sin(t * 0.08 + i * 2) * r * 0.25, (y0 + y1) * 0.5 + Math.cos(t * 0.08 + i * 2) * r * 0.25);
                ctx.lineTo(x1, y1);
                ctx.stroke();
            }

            // Magenta counter-rotating ring
            ctx.save();
            ctx.rotate(-t * 0.006);
            ctx.strokeStyle = 'rgba(155, 89, 182, 0.6)';
            ctx.lineWidth = 0.9;
            ctx.setLineDash([3, 4]);
            ctx.beginPath(); ctx.arc(0, 0, r * 1.3, 0, Math.PI * 2); ctx.stroke();
            ctx.setLineDash([]);
            ctx.restore();

        } else if (this.type === 'light') {
            // SUN-MOTE: small homing gold sphere with bright halo + comet trail
            const t = NOW;
            const r = this.radius;
            const pulse = 0.85 + 0.15 * Math.sin(t * 0.018);

            ctx.rotate(angle);

            // Comet trail (behind direction of travel)
            ctx.globalCompositeOperation = 'lighter';
            for (let i = 1; i <= 4; i++) {
                const tx = -r * 0.9 * i;
                const tr = r * (0.85 - i * 0.16);
                const ta = 0.45 - i * 0.10;
                if (tr <= 0 || ta <= 0) break;
                const trailGrd = cachedRadial(ctx, `proj-light-trail:${Math.round(tr * 4)}`, 0, tr, [
                    [0,   `rgba(255, 245, 180, ${ta})`],
                    [0.6, `rgba(241, 196, 15, ${ta * 0.5})`],
                    [1,   'rgba(241, 196, 15, 0)']
                ]);
                ctx.fillStyle = trailGrd;
                ctx.beginPath(); ctx.arc(tx, 0, tr, 0, Math.PI * 2); ctx.fill();
            }

            // Outer halo
            const halo = cachedRadial(ctx, `proj-light-halo:${r}`, r * 0.1, r * 2.4, [
                [0,   'rgba(255, 250, 200, 0.85)'],
                [0.35,'rgba(255, 220, 90, 0.55)'],
                [0.7, 'rgba(241, 196, 15, 0.18)'],
                [1,   'rgba(241, 196, 15, 0)']
            ]);
            ctx.fillStyle = halo;
            ctx.beginPath(); ctx.arc(0, 0, r * 2.4 * pulse, 0, Math.PI * 2); ctx.fill();

            // Hot core
            ctx.globalCompositeOperation = 'source-over';
            ctx.shadowColor = '#fff5b8';
            ctx.shadowBlur  = 14 * pulse;
            const core = cachedRadial(ctx, `proj-light-core:${r}`, 0, r, [
                [0,   '#ffffff'],
                [0.3, '#fff2a8'],
                [0.7, '#f1c40f'],
                [1,   '#b8860b']
            ]);
            ctx.fillStyle = core;
            ctx.beginPath(); ctx.arc(0, 0, r * pulse, 0, Math.PI * 2); ctx.fill();
            ctx.shadowBlur = 0;

            // Cross-shaped lens-flare spike (subtle)
            ctx.strokeStyle = 'rgba(255, 255, 230, 0.55)';
            ctx.lineWidth = 1.1;
            ctx.beginPath();
            ctx.moveTo(-r * 1.9, 0); ctx.lineTo(r * 1.9, 0);
            ctx.moveTo(0, -r * 1.4); ctx.lineTo(0, r * 1.4);
            ctx.stroke();

        } else if (this.type === 'thorn') {
            // THORN-SHARD: dark crimson barbed shard with trailing red mist
            const t = NOW;
            const r = this.radius;

            ctx.rotate(angle);

            // Red mist trail (behind)
            ctx.globalCompositeOperation = 'source-over';
            for (let i = 1; i <= 3; i++) {
                const tx = -r * 1.0 * i;
                const tr = r * (0.7 - i * 0.18);
                const ta = 0.4 - i * 0.10;
                if (tr <= 0 || ta <= 0) break;
                const mist = cachedRadial(ctx, `proj-thorn-mist:${Math.round(tr * 4)}`, 0, tr, [
                    [0,   `rgba(192, 57, 43, ${ta})`],
                    [0.5, `rgba(120, 18, 18, ${ta * 0.5})`],
                    [1,   'rgba(60, 8, 8, 0)']
                ]);
                ctx.fillStyle = mist;
                ctx.beginPath();
                ctx.arc(tx + Math.sin(t * 0.02 + i) * r * 0.15, Math.cos(t * 0.025 + i) * r * 0.2, tr, 0, Math.PI * 2);
                ctx.fill();
            }

            // Faint blood-red glow under shard
            ctx.shadowColor = '#8b1a1a';
            ctx.shadowBlur  = 9;

            // Barbed shard: elongated diamond with two side barbs
            ctx.beginPath();
            ctx.moveTo(r * 2.2, 0);                              // tip
            ctx.lineTo(r * 0.6, -r * 0.55);                       // upper shoulder
            ctx.lineTo(r * 0.1, -r * 0.25);                       // upper barb root
            ctx.lineTo(-r * 0.4, -r * 0.75);                      // upper barb hook
            ctx.lineTo(-r * 0.7, -r * 0.20);                      // upper rear
            ctx.lineTo(-r * 1.5, 0);                              // back tip
            ctx.lineTo(-r * 0.7,  r * 0.20);                      // lower rear
            ctx.lineTo(-r * 0.4,  r * 0.75);                      // lower barb hook
            ctx.lineTo(r * 0.1,  r * 0.25);                       // lower barb root
            ctx.lineTo(r * 0.6,  r * 0.55);                       // lower shoulder
            ctx.closePath();

            const body = cachedRadial(ctx, `proj-thorn-body:${r}`, r * 0.6, r * 2.0, [
                [0,   '#d63a3a'],
                [0.45,'#8b1a1a'],
                [1,   '#3d0606']
            ]);
            ctx.fillStyle = body;
            ctx.fill();
            ctx.shadowBlur = 0;

            // Black thorn outline
            ctx.strokeStyle = '#1a0303';
            ctx.lineWidth = 1.2;
            ctx.stroke();

            // Sharp white tip highlight
            ctx.fillStyle = 'rgba(255, 220, 220, 0.85)';
            ctx.beginPath();
            ctx.moveTo(r * 2.2, 0);
            ctx.lineTo(r * 1.6, -r * 0.18);
            ctx.lineTo(r * 1.6,  r * 0.18);
            ctx.closePath();
            ctx.fill();

        } else if (this.type === 'dream') {
            // WHISPER: thin curving violet arc with weak homing + dotted trail
            const t = NOW;
            const r = this.radius;
            const wob = Math.sin(t * 0.018) * r * 0.25;

            ctx.rotate(angle);

            // Dotted trail (3-4 small fading dots behind, slight sinusoidal wave)
            for (let i = 1; i <= 5; i++) {
                const tx = -r * 0.9 * i;
                const ty = Math.sin(t * 0.02 + i * 0.7) * r * 0.45;
                const ta = 0.55 - i * 0.10;
                const tr = r * (0.45 - i * 0.06);
                if (tr <= 0 || ta <= 0) break;
                ctx.fillStyle = `rgba(196, 181, 253, ${ta})`;
                ctx.beginPath(); ctx.arc(tx, ty, tr, 0, Math.PI * 2); ctx.fill();
            }

            // Curving arc body — two layered swooshes
            ctx.shadowColor = '#9c7fe0';
            ctx.shadowBlur  = 8;

            ctx.strokeStyle = 'rgba(196, 181, 253, 0.85)';
            ctx.lineWidth = r * 0.55;
            ctx.lineCap = 'round';
            ctx.beginPath();
            ctx.moveTo(-r * 1.0,  wob);
            ctx.quadraticCurveTo(0, -wob, r * 1.0, wob);
            ctx.stroke();

            // Brighter inner streak
            ctx.strokeStyle = 'rgba(255, 255, 255, 0.85)';
            ctx.lineWidth = r * 0.22;
            ctx.beginPath();
            ctx.moveTo(-r * 0.9,  wob * 0.9);
            ctx.quadraticCurveTo(0, -wob * 0.9, r * 0.9, wob * 0.9);
            ctx.stroke();
            ctx.shadowBlur = 0;

            // Front star-spark — tiny twinkle at the leading tip
            ctx.fillStyle = 'rgba(230, 220, 255, 0.95)';
            ctx.beginPath(); ctx.arc(r * 1.0, wob, r * 0.32, 0, Math.PI * 2); ctx.fill();

            // Twin micro-stars on either side of the streak (slow-blinking)
            const blink = (Math.sin(t * 0.04) + 1) * 0.5;
            ctx.fillStyle = `rgba(196, 181, 253, ${0.4 + blink * 0.4})`;
            ctx.beginPath(); ctx.arc(r * 0.2, -r * 0.6, r * 0.16, 0, Math.PI * 2); ctx.fill();
            ctx.beginPath(); ctx.arc(-r * 0.2, r * 0.6, r * 0.16, 0, Math.PI * 2); ctx.fill();

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

    // #20 P3 — object pool. Strict reset: every field touched by the
    // constructor is reapplied at acquire, and every known optional field
    // attached by callers (shooterType / onHit / altar flags / DLC marks /
    // _ghost / dead) is cleared. Callers that subsequently set optional
    // fields work unchanged.
    static _pool = [];
    static POOL_MAX = 256;
    static acquire(x, y, velocity, damage, color, radius, type, knockback, isEnemy, isExplosive = false, isCrit = false, world = null) {
        const p = Projectile._pool.pop();
        if (!p) return new Projectile(x, y, velocity, damage, color, radius, type, knockback, isEnemy, isExplosive, isCrit, world);

        // Mirror constructor — every base field reapplied.
        p.x = x; p.y = y;
        p.velocity = velocity;
        p.damage = damage; p.color = color; p.radius = radius;
        p.type = type; p.knockback = knockback; p.isEnemy = isEnemy;
        p.isExplosive = isExplosive;
        p.isCrit = isCrit;
        p.pierce = (type === 'ice' && !isEnemy) ? 2 : 0;
        p.owner = null;
        p._world = world ?? (typeof window !== 'undefined' ? window._world : null) ?? null;
        if (p.isCrit) p.radius *= 1.5;
        p.life = null;

        // Strict-reset optional fields. Callers reattach what they need.
        p.shooterType = undefined;
        p.onHit = undefined;
        p.isWildfire = false;
        p.isCryo = false;
        p._ghost = false;
        p._id = undefined;
        p._loveHeartArrow = undefined;
        p._loveHeartBolt = undefined;
        p.outlineColor = undefined;
        p.ownerIsPlayer = undefined;
        p.dead = false;
        // DLC hero shoot hooks (GravityHero, future custom-projectile heroes)
        // overwrite the per-instance `draw` / `update` methods to render
        // hero-specific visuals (e.g. Gravity's black-hole projectiles).
        // Pooled instances were carrying those overrides across hero swaps,
        // so e.g. switching from Gravity → Thorn made Thorn fire black-hole
        // projectiles. `delete` restores the prototype method.
        if (Object.prototype.hasOwnProperty.call(p, 'draw'))   delete p.draw;
        if (Object.prototype.hasOwnProperty.call(p, 'update')) delete p.update;
        return p;
    }
    static release(p) {
        if (!p || Projectile._pool.length >= Projectile.POOL_MAX) return;
        Projectile._pool.push(p);
    }
}
export { Projectile };
export default Projectile;
