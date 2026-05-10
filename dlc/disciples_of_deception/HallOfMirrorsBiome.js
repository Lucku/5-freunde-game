// The Hall of Mirrors - Mirror's Biome

class HallOfMirrorsBiome {
    constructor() {
        this.name = "The Hall of Mirrors";
        this.color = "#050d14";
        this.gridColor = "#1a5276";
        this.particles = [];
        this.sweepTimer = 0;
        this.sweepProgress = 0;
        this.sweepActive = false;
    }

    generate(arena) {
        const w = arena.width;
        const h = arena.height;
        const cx = w / 2;
        const cy = h / 2;

        console.log("Generating Hall of Mirrors Biome...");

        // 8-12 tall narrow obstacles in rough parallel rows
        const count = 8 + Math.floor(Math.random() * 5);
        const colSpacing = w / (count + 2);
        for (let i = 0; i < count; i++) {
            const x = colSpacing * (i + 1) + (Math.random() - 0.5) * 80;
            const y = cy - 250 + (Math.random() - 0.5) * 600;
            if (Math.hypot(x - cx, y - cy) > 300) {
                arena.obstacles.push(new Obstacle(x, y, 50, 220 + Math.random() * 80, 'mirror'));
            }
        }

        // Decorative wall mirrors (also obstacles for collision)
        const wallCount = 4 + Math.floor(Math.random() * 3);
        for (let i = 0; i < wallCount; i++) {
            const onTop = Math.random() < 0.5;
            const x = 200 + Math.random() * (w - 400);
            const y = onTop ? 80 : h - 130;
            arena.obstacles.push(new Obstacle(x, y, 180, 50, 'mirror'));
        }
    }

    update(arena, player) {
        this.sweepTimer++;

        // Trigger prismatic sweep every 8s
        if (this.sweepTimer > 480 && !this.sweepActive) {
            this.sweepTimer = 0;
            this.sweepActive = true;
            this.sweepProgress = 0;
        }

        if (this.sweepActive) {
            this.sweepProgress += 12;
            if (this.sweepProgress > arena.width + 400) {
                this.sweepActive = false;
            }
        }

        // Glint particles on obstacle edges near player
        if (player && Math.random() < 0.5) {
            const nearObs = arena.obstacles.filter(o =>
                o.type === 'mirror' &&
                Math.hypot((o.x + o.w / 2) - player.x, (o.y + o.h / 2) - player.y) < 600
            );
            if (nearObs.length > 0) {
                const o = nearObs[Math.floor(Math.random() * nearObs.length)];
                const onLeft = Math.random() < 0.5;
                const onTop = Math.random() < 0.5;
                this.particles.push({
                    x: onLeft ? o.x : (o.x + o.w),
                    y: o.y + Math.random() * o.h,
                    vx: 0,
                    vy: 0,
                    life: 20 + Math.random() * 15,
                    size: 1.5,
                    color: '#ffffff'
                });
                if (Math.random() < 0.3) {
                    this.particles.push({
                        x: o.x + Math.random() * o.w,
                        y: onTop ? o.y : (o.y + o.h),
                        vx: 0, vy: 0,
                        life: 20 + Math.random() * 15,
                        size: 1.5,
                        color: '#aed6f1'
                    });
                }
            }
        }

        // Update particles (just decay)
        for (let i = this.particles.length - 1; i >= 0; i--) {
            this.particles[i].life--;
            if (this.particles[i].life <= 0) this.particles.splice(i, 1);
        }
    }

    draw(ctx, arena) {
        // Background tint
        ctx.fillStyle = "rgba(5, 13, 20, 0.4)";
        ctx.fillRect(0, 0, arena.width, arena.height);

        // Prismatic sweep across floor
        if (this.sweepActive) {
            const sx = this.sweepProgress - 200;
            const grad = ctx.createLinearGradient(sx, 0, sx + 400, 0);
            grad.addColorStop(0, 'rgba(255, 255, 255, 0)');
            grad.addColorStop(0.5, 'rgba(174, 214, 241, 0.15)');
            grad.addColorStop(1, 'rgba(255, 255, 255, 0)');
            ctx.fillStyle = grad;
            ctx.fillRect(sx, 0, 400, arena.height);
        }

        // Glint particles
        this.particles.forEach(p => {
            ctx.globalAlpha = Math.min(1, p.life / 20);
            ctx.fillStyle = p.color;
            ctx.beginPath();
            ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
            ctx.fill();
            ctx.shadowBlur = 8;
            ctx.shadowColor = p.color;
            ctx.fill();
            ctx.shadowBlur = 0;
        });
        ctx.globalAlpha = 1;
    }

    drawObstacle(ctx, obs) {
        const { x, y, w, h } = obs;
        const bev = 5;

        // Base — polished dark marine
        const rg = ctx.createRadialGradient(x + w / 2, y + h / 2, 5, x + w / 2, y + h / 2, Math.max(w, h) * 0.7);
        rg.addColorStop(0,   '#13314a');
        rg.addColorStop(0.5, '#0a1f30');
        rg.addColorStop(1,   '#050d14');
        ctx.fillStyle = rg;
        ctx.fillRect(x, y, w, h);

        // Reflective sheen along top + left edges
        ctx.save();
        ctx.beginPath(); ctx.rect(x + 1, y + 1, w - 2, h - 2); ctx.clip();

        const sheenGrad = ctx.createLinearGradient(x, y, x + w * 0.4, y + h * 0.4);
        sheenGrad.addColorStop(0, 'rgba(174, 214, 241, 0.4)');
        sheenGrad.addColorStop(1, 'rgba(174, 214, 241, 0)');
        ctx.fillStyle = sheenGrad;
        ctx.fillRect(x, y, w, h);

        // Vertical highlight stripe (mirror panel look)
        ctx.fillStyle = 'rgba(255, 255, 255, 0.06)';
        ctx.fillRect(x + w * 0.15, y + 2, w * 0.1, h - 4);

        ctx.restore();

        // Bevel
        ctx.fillStyle = 'rgba(174, 214, 241, 0.28)';
        ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x + w, y); ctx.lineTo(x + w - bev, y + bev); ctx.lineTo(x + bev, y + bev); ctx.closePath(); ctx.fill();
        ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x + bev, y + bev); ctx.lineTo(x + bev, y + h - bev); ctx.lineTo(x, y + h); ctx.closePath(); ctx.fill();
        ctx.fillStyle = 'rgba(0,0,0,0.5)';
        ctx.beginPath(); ctx.moveTo(x, y + h); ctx.lineTo(x + w, y + h); ctx.lineTo(x + w - bev, y + h - bev); ctx.lineTo(x + bev, y + h - bev); ctx.closePath(); ctx.fill();
        ctx.beginPath(); ctx.moveTo(x + w, y); ctx.lineTo(x + w, y + h); ctx.lineTo(x + w - bev, y + h - bev); ctx.lineTo(x + w - bev, y + bev); ctx.closePath(); ctx.fill();

        ctx.strokeStyle = '#0d2840';
        ctx.lineWidth = 1.5;
        ctx.strokeRect(x, y, w, h);
    }
}

// Register
if (typeof BIOME_LOGIC === 'undefined') window.BIOME_LOGIC = {};
window.BIOME_LOGIC['mirror'] = new HallOfMirrorsBiome();
