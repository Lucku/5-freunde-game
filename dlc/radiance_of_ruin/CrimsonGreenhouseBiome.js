// The Crimson Greenhouse — Thorn's Biome
// Abandoned glass greenhouse, blood-red foliage, broken planters.

class CrimsonGreenhouseBiome {
    constructor() {
        this.name = "The Crimson Greenhouse";
        this.color = "#1a0808";
        this.gridColor = "#8b1a1a33";
        this.particles = [];   // petals
        this.blooms = [];      // {x, y, radius, baseRadius, pulseTimer}
        this.motherRose = null;
        this.t = 0;
    }

    generate(arena) {
        const w = arena.width, h = arena.height;
        const cx = w / 2, cy = h / 2;

        console.log("Generating Crimson Greenhouse Biome...");

        // 3-5 Bloom Patches as BiomeZones
        const patchCount = 3 + Math.floor(Math.random() * 3);
        this.blooms = [];
        for (let i = 0; i < patchCount; i++) {
            let bx, by, tries = 0;
            do {
                bx = 200 + Math.random() * (w - 400);
                by = 200 + Math.random() * (h - 400);
                tries++;
            } while (Math.hypot(bx - cx, by - cy) < 280 && tries < 12);
            const radius = 140;
            this.blooms.push({ x: bx, y: by, radius, baseRadius: radius, pulseTimer: Math.random() * 600 });
            arena.biomeZones.push(new BiomeZone(bx - radius, by - radius, radius * 2, radius * 2, 'BLOOM_PATCH'));
        }

        // Mother Rose decorative (near arena edge)
        const edge = Math.floor(Math.random() * 4);
        let mrX, mrY;
        if (edge === 0) { mrX = w * 0.5; mrY = 220; }
        else if (edge === 1) { mrX = w - 220; mrY = h * 0.5; }
        else if (edge === 2) { mrX = w * 0.5; mrY = h - 220; }
        else                 { mrX = 220; mrY = h * 0.5; }
        this.motherRose = { x: mrX, y: mrY, baseRadius: 90, pulse: 0 };

        // 12-16 obstacles: mix of round planters (small) and tall hedge clusters (large)
        const count = 12 + Math.floor(Math.random() * 5);
        for (let i = 0; i < count; i++) {
            const isPlanter = Math.random() < 0.5;
            const size = isPlanter ? 60 + Math.random() * 30 : 130 + Math.random() * 80;
            let ox, oy, tries = 0;
            do {
                ox = 150 + Math.random() * (w - 300);
                oy = 150 + Math.random() * (h - 300);
                tries++;
            } while (Math.hypot(ox - cx, oy - cy) < 280 && tries < 20);
            arena.obstacles.push(new Obstacle(ox, oy, size, isPlanter ? size : size * 1.4, isPlanter ? 'thorn-planter' : 'thorn-hedge'));
        }
    }

    update(arena, player, enemies) {
        this.t++;

        // Petal particles
        if (Math.random() < 0.55) {
            this.particles.push({
                x: Math.random() * arena.width,
                y: -10,
                vx: (Math.random() - 0.5) * 0.45,
                vy: 0.35 + Math.random() * 0.5,
                rot: Math.random() * Math.PI,
                rotSpeed: (Math.random() - 0.5) * 0.02,
                life: 700 + Math.random() * 300,
                maxLife: 1000,
                hue: Math.random() < 0.5 ? '#c0392b' : '#7f1d1d',
                size: 4 + Math.random() * 4
            });
        }
        for (let i = this.particles.length - 1; i >= 0; i--) {
            const p = this.particles[i];
            p.x += p.vx;
            p.y += p.vy;
            p.rot += p.rotSpeed;
            p.life--;
            if (p.life <= 0 || p.y > arena.height + 20) this.particles.splice(i, 1);
        }

        // Mother Rose pulse
        if (this.motherRose) this.motherRose.pulse = (Math.sin(this.t * 0.04) + 1) * 0.5;

        // Bloom Patches: pulse every 10s + radius temporarily +30%, also apply Bleed DPS
        this.blooms.forEach(b => {
            b.pulseTimer++;
            if (b.pulseTimer >= 600) b.pulseTimer = 0;
            const pulseActive = b.pulseTimer < 90; // 1.5s
            b.radius = b.baseRadius * (pulseActive ? 1.3 : 1.0);
        });

        // Apply Bleed-style DPS to enemies inside Bloom Patches (5 DPS)
        if (enemies && (this.t % 30) === 0) {
            enemies.forEach(e => {
                if (e.hp <= 0) return;
                this.blooms.forEach(b => {
                    if (Math.hypot(e.x - b.x, e.y - b.y) < b.radius) {
                        e.hp -= 2.5; // 5 DPS at 30-frame tick rate (2 ticks/sec)
                        e._biomeBleedTag = 30;
                        if (e.hp <= 0 && player && typeof player.onKill === 'function') player.onKill(e);
                    }
                });
            });
            enemies.forEach(e => { if (e._biomeBleedTag && e._biomeBleedTag > 0) e._biomeBleedTag--; });
        }

        // Sync glow with Thorn's Crimson Garden (visual)
        this.gardenActive = !!(player && player.bloodRose);
    }

    draw(ctx, arena) {
        const aw = arena.width, ah = arena.height;

        // Background: near-black blood-red + crimson player glow
        ctx.save();
        ctx.fillStyle = '#1a0808';
        ctx.fillRect(0, 0, aw, ah);
        if (window.player) {
            const grd = ctx.createRadialGradient(window.player.x, window.player.y, 50, window.player.x, window.player.y, 600);
            grd.addColorStop(0,   'rgba(139, 26, 26, 0.22)');
            grd.addColorStop(0.5, 'rgba(139, 26, 26, 0.06)');
            grd.addColorStop(1,   'rgba(139, 26, 26, 0)');
            ctx.fillStyle = grd;
            ctx.fillRect(0, 0, aw, ah);
        }
        ctx.restore();

        // Bloom Patches: dark red circular zones with red rim + thorn outline
        ctx.save();
        this.blooms.forEach(b => {
            const glow = this.gardenActive && Math.hypot(b.x - (window.player?.x || 0), b.y - (window.player?.y || 0)) < 600 ? 1.4 : 1.0;
            const grd = ctx.createRadialGradient(b.x, b.y, 10, b.x, b.y, b.radius);
            grd.addColorStop(0,   `rgba(139, 26, 26, ${0.4 * glow})`);
            grd.addColorStop(0.6, `rgba(80, 12, 12, ${0.18 * glow})`);
            grd.addColorStop(1,   'rgba(30, 5, 5, 0)');
            ctx.fillStyle = grd;
            ctx.beginPath();
            ctx.arc(b.x, b.y, b.radius, 0, Math.PI * 2);
            ctx.fill();

            // Thorn outline (jagged ring)
            ctx.strokeStyle = `rgba(192, 57, 43, ${0.55 * glow})`;
            ctx.lineWidth = 1.5;
            ctx.beginPath();
            const teeth = 18;
            for (let i = 0; i <= teeth; i++) {
                const ang = (i / teeth) * Math.PI * 2 + this.t * 0.003;
                const wob = (i % 2 === 0) ? 1 : 0.92;
                const x = b.x + Math.cos(ang) * b.radius * wob;
                const y = b.y + Math.sin(ang) * b.radius * wob;
                if (i === 0) ctx.moveTo(x, y);
                else ctx.lineTo(x, y);
            }
            ctx.stroke();
        });
        ctx.restore();

        // Mother Rose — large decorative
        if (this.motherRose) {
            const mr = this.motherRose;
            ctx.save();
            ctx.translate(mr.x, mr.y);
            const pulse = 0.85 + mr.pulse * 0.25;
            const r = mr.baseRadius * pulse;
            // Outer halo
            const grd = ctx.createRadialGradient(0, 0, 5, 0, 0, r * 2.5);
            grd.addColorStop(0,   'rgba(192, 57, 43, 0.55)');
            grd.addColorStop(0.5, 'rgba(100, 20, 20, 0.2)');
            grd.addColorStop(1,   'rgba(30, 5, 5, 0)');
            ctx.fillStyle = grd;
            ctx.beginPath();
            ctx.arc(0, 0, r * 2.5, 0, Math.PI * 2);
            ctx.fill();
            // Petals
            ctx.rotate(this.t * 0.003);
            for (let i = 0; i < 8; i++) {
                ctx.save();
                ctx.rotate(i * Math.PI / 4);
                ctx.fillStyle = `rgba(139, 26, 26, ${0.85})`;
                ctx.beginPath();
                ctx.ellipse(0, -r * 0.5, r * 0.35, r * 0.65, 0, 0, Math.PI * 2);
                ctx.fill();
                ctx.restore();
            }
            // Center bulb
            ctx.fillStyle = '#3d0606';
            ctx.beginPath();
            ctx.arc(0, 0, r * 0.25, 0, Math.PI * 2);
            ctx.fill();
            ctx.restore();
        }

        // Petal particles
        ctx.save();
        this.particles.forEach(p => {
            ctx.save();
            ctx.translate(p.x, p.y);
            ctx.rotate(p.rot);
            ctx.globalAlpha = Math.min(1, p.life / 150) * 0.85;
            ctx.fillStyle = p.hue;
            ctx.beginPath();
            ctx.ellipse(0, 0, p.size, p.size * 0.45, 0, 0, Math.PI * 2);
            ctx.fill();
            ctx.restore();
        });
        ctx.restore();

        // Faint horizontal glass-pane reflections (top edge)
        ctx.save();
        ctx.globalAlpha = 0.08;
        ctx.strokeStyle = '#c0392b';
        ctx.lineWidth = 1;
        for (let i = 0; i < 5; i++) {
            const yy = 80 + i * 40;
            ctx.beginPath();
            ctx.moveTo(0, yy);
            ctx.lineTo(aw, yy);
            ctx.stroke();
        }
        ctx.restore();

        // Reckoning red overlay
        if (window.player && window.player.reckoningActive) {
            ctx.save();
            ctx.globalAlpha = 0.18 + Math.sin(this.t * 0.12) * 0.06;
            ctx.fillStyle = '#5a0808';
            ctx.fillRect(0, 0, aw, ah);
            ctx.restore();
        }
    }

    drawObstacle(ctx, obs) {
        const { x, y, w, h } = obs;
        const bev = 5;
        const isPlanter = obs.biomeType === 'thorn-planter';

        if (isPlanter) {
            // Terracotta planter with bloom cap
            const grd = ctx.createLinearGradient(x, y, x, y + h);
            grd.addColorStop(0,   '#5a2418');
            grd.addColorStop(0.6, '#3d1a0e');
            grd.addColorStop(1,   '#2a0e08');
            ctx.fillStyle = grd;
            ctx.fillRect(x, y, w, h);

            // Bloom cap on top
            ctx.fillStyle = '#8b1a1a';
            ctx.beginPath();
            ctx.ellipse(x + w / 2, y + 6, w * 0.45, 8, 0, 0, Math.PI * 2);
            ctx.fill();
            ctx.fillStyle = '#c0392b';
            ctx.beginPath();
            ctx.ellipse(x + w / 2, y + 4, w * 0.35, 5, 0, 0, Math.PI * 2);
            ctx.fill();

            // Vine curls on sides
            ctx.strokeStyle = 'rgba(60, 100, 30, 0.55)';
            ctx.lineWidth = 2;
            ctx.beginPath();
            ctx.moveTo(x + 4, y + h * 0.5);
            ctx.quadraticCurveTo(x - 4, y + h * 0.7, x + 6, y + h * 0.9);
            ctx.stroke();
            ctx.beginPath();
            ctx.moveTo(x + w - 4, y + h * 0.4);
            ctx.quadraticCurveTo(x + w + 4, y + h * 0.6, x + w - 6, y + h * 0.85);
            ctx.stroke();
        } else {
            // Hedge cluster: deep green-red with thorn highlights
            const grd = ctx.createLinearGradient(x, y, x + w, y + h);
            grd.addColorStop(0,   '#3a1818');
            grd.addColorStop(0.5, '#2a1010');
            grd.addColorStop(1,   '#170808');
            ctx.fillStyle = grd;
            ctx.fillRect(x, y, w, h);

            // Jagged vine top edge
            ctx.save();
            ctx.beginPath();
            ctx.rect(x, y, w, h);
            ctx.clip();
            ctx.strokeStyle = 'rgba(139, 26, 26, 0.5)';
            ctx.lineWidth = 1.5;
            const seed = x * 0.013 + y * 0.029;
            const rn = (i) => { const s = Math.sin(seed + i * 0.47) * 43758.5453; return s - Math.floor(s); };
            for (let i = 0; i < 8; i++) {
                const sx = x + rn(i) * w;
                const sy = y + rn(i + 0.5) * h;
                const len = 10 + rn(i + 0.7) * 18;
                const ang = rn(i + 0.9) * Math.PI * 2;
                ctx.beginPath();
                ctx.moveTo(sx, sy);
                ctx.lineTo(sx + Math.cos(ang) * len, sy + Math.sin(ang) * len);
                ctx.stroke();
            }
            // Thorn highlights (red dots)
            for (let i = 0; i < 6; i++) {
                ctx.fillStyle = 'rgba(192, 57, 43, 0.65)';
                const tx = x + rn(i + 2) * w;
                const ty = y + rn(i + 2.5) * h;
                ctx.beginPath();
                ctx.arc(tx, ty, 2, 0, Math.PI * 2);
                ctx.fill();
            }
            ctx.restore();
        }

        // Bevel — dark red top-left, near-black bottom-right
        ctx.fillStyle = 'rgba(120, 30, 30, 0.40)';
        ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x + w, y); ctx.lineTo(x + w - bev, y + bev); ctx.lineTo(x + bev, y + bev); ctx.closePath(); ctx.fill();
        ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x + bev, y + bev); ctx.lineTo(x + bev, y + h - bev); ctx.lineTo(x, y + h); ctx.closePath(); ctx.fill();
        ctx.fillStyle = 'rgba(10, 4, 4, 0.65)';
        ctx.beginPath(); ctx.moveTo(x, y + h); ctx.lineTo(x + w, y + h); ctx.lineTo(x + w - bev, y + h - bev); ctx.lineTo(x + bev, y + h - bev); ctx.closePath(); ctx.fill();
        ctx.beginPath(); ctx.moveTo(x + w, y); ctx.lineTo(x + w, y + h); ctx.lineTo(x + w - bev, y + h - bev); ctx.lineTo(x + w - bev, y + bev); ctx.closePath(); ctx.fill();

        ctx.strokeStyle = '#1a0808';
        ctx.lineWidth = 2;
        ctx.strokeRect(x, y, w, h);
    }
}

if (typeof BIOME_LOGIC === 'undefined') window.BIOME_LOGIC = {};
window.BIOME_LOGIC['thorn'] = new CrimsonGreenhouseBiome();
