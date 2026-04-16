// Chaos Biome - The Void Dimension

class ChaosBiome {
    constructor() {
        this.name = "The Void";
        this.color = "#1a0b2e"; // Dark Purple Background
        this.gridColor = "#4a235a"; // Lighter Purple Grid
        this.particles = [];
        this.gravityShiftTimer = 0;
        this.gravityDir = { x: 0, y: 0 };
    }

    generate(arena) {
        // Void Layout: Sparse floating islands (obstacles) and random dark energy patches
        const w = arena.width;
        const h = arena.height;
        const cx = w / 2;
        const cy = h / 2;

        console.log("Generating Void Biome...");

        // 1. Add Void Zones (Biomes)
        // One massive central void or scattered pockets
        arena.biomeZones.push(new BiomeZone(cx - 1000, cy - 1000, 2000, 2000, 'VOID'));

        // 2. Obstacles (Floating Islands)
        // Randomly scatter rectangular blocks
        for (let i = 0; i < 15; i++) {
            const x = Math.random() * (w - 400) + 200;
            const y = Math.random() * (h - 400) + 200;
            // Avoid center spawn
            if (Math.hypot(x - cx, y - cy) > 400) {
                arena.obstacles.push(new Obstacle(x, y, 150 + Math.random() * 100, 150 + Math.random() * 100));
            }
        }

        // 3. Traps
        // Gravity Wells (custom trap logic if supported, else standard)
        // arena.traps.push(...)
    }

    update(arena, player) {
        // Biome Effect: Shifting Gravity
        // Every 10 seconds, gravity pulls the player slightly
        this.gravityShiftTimer++;

        if (this.gravityShiftTimer > 600) {
            // Change direction
            const angle = Math.random() * Math.PI * 2;
            this.gravityDir = { x: Math.cos(angle) * 0.5, y: Math.sin(angle) * 0.5 };
            this.gravityShiftTimer = 0;
            if (typeof showNotification === 'function') showNotification("GRAVITY SHIFT!", "#8e44ad");
        }

        // Apply Gravity Force to Player (with Collision Check)
        if (this.gravityDir.x !== 0 || this.gravityDir.y !== 0) {
            const dx = this.gravityDir.x * player.speedMultiplier;
            const dy = this.gravityDir.y * player.speedMultiplier;
            const nextX = player.x + dx;
            const nextY = player.y + dy;

            // Check full move
            if (!arena.checkCollision(nextX, nextY, player.radius)) {
                player.x = nextX;
                player.y = nextY;
            } else {
                // Try separate axes to allow sliding
                if (!arena.checkCollision(nextX, player.y, player.radius)) {
                    player.x = nextX;
                } else if (!arena.checkCollision(player.x, nextY, player.radius)) {
                    player.y = nextY;
                }
            }
        }

        // Visuals 1: Ambient Particles (Orbiting dust)
        if (Math.random() < 0.2) {
            this.particles.push({
                x: player.x + (Math.random() - 0.5) * 1400, // Wide spawn
                y: player.y + (Math.random() - 0.5) * 1000,
                vx: (Math.random() - 0.5) * 0.5,
                vy: (Math.random() - 0.5) * 0.5,
                life: 300,
                size: Math.random() * 2,
                color: Math.random() < 0.3 ? '#9b59b6' : '#fff', // Purple or White
                type: 'DUST'
            });
        }

        // Visuals 2: Background Stars (Static relative to world, but we simulate them)
        // Actually, let's just make particles that twinkle.

        // Update particles
        for (let i = this.particles.length - 1; i >= 0; i--) {
            let p = this.particles[i];
            p.x += p.vx;
            p.y += p.vy;
            p.life--;

            // Gravity effect on dust itself
            p.x += this.gravityDir.x * 2;
            p.y += this.gravityDir.y * 2;

            if (p.life <= 0) this.particles.splice(i, 1);
        }
    }

    draw(ctx, arena) {
        // Draw Dark Nebula Overlay (Gradient)
        // We draw this centered on the player/camera to fake a background
        const camX = (typeof arena.camera !== 'undefined') ? arena.camera.x : 0;
        const camY = (typeof arena.camera !== 'undefined') ? arena.camera.y : 0;

        // Background Tint
        ctx.fillStyle = "rgba(20, 10, 40, 0.3)"; // Deep void purple
        // We can draw a massive rect covering the visible area
        // Since ctx is already translated by -camera.x/y, we can just draw huge rects
        // around the player or just cover the arena bounds if known.
        // Assuming arena.width is valid:
        ctx.fillRect(0, 0, arena.width, arena.height);

        // Draw Particles
        this.particles.forEach(p => {
            ctx.globalAlpha = Math.min(1, p.life / 60);
            ctx.fillStyle = p.color;
            ctx.beginPath();
            ctx.arc(p.x, p.y, p.size || 1, 0, Math.PI * 2);
            ctx.fill();

            // Twinkle effect (Glow)
            if (p.color === '#fff' && Math.random() < 0.05) {
                ctx.shadowBlur = 10;
                ctx.shadowColor = "#fff";
                ctx.fill();
                ctx.shadowBlur = 0;
            }
        });
        ctx.globalAlpha = 1;
    }

    drawObstacle(ctx, obs) {
        const { x, y, w, h } = obs;
        const bev = 6;
        const seed = obs.x * 0.0071 + obs.y * 0.0137;
        const r = (i) => { const s = Math.sin(seed + i * 0.391) * 43758.5453; return s - Math.floor(s); };

        // Base: near-void deep purple
        const grd = ctx.createLinearGradient(x, y, x + w, y + h);
        grd.addColorStop(0,   '#100520');
        grd.addColorStop(0.5, '#08030f');
        grd.addColorStop(1,   '#040108');
        ctx.fillStyle = grd;
        ctx.fillRect(x, y, w, h);

        ctx.save();
        ctx.beginPath(); ctx.rect(x + 1, y + 1, w - 2, h - 2); ctx.clip();

        // Central void — radial dark gradient
        const voidGrd = ctx.createRadialGradient(x + w * 0.5, y + h * 0.5, 0, x + w * 0.5, y + h * 0.5, Math.max(w, h) * 0.55);
        voidGrd.addColorStop(0,   'rgba(0,0,0,0.50)');
        voidGrd.addColorStop(0.6, 'rgba(0,0,0,0.10)');
        voidGrd.addColorStop(1,   'rgba(0,0,0,0.00)');
        ctx.fillStyle = voidGrd;
        ctx.fillRect(x, y, w, h);

        // Nebula swirl arcs
        ctx.lineCap = 'round';
        const numSwirls = 2 + (r(seed + 1) * 2 | 0);
        for (let i = 0; i < numSwirls; i++) {
            const s = seed + i * 1.61;
            const cx2 = x + (0.2 + r(s) * 0.6) * w;
            const cy2 = y + (0.2 + r(s + 0.1) * 0.6) * h;
            const sr  = 12 + r(s + 0.2) * Math.min(w, h) * 0.3;
            const startA = r(s + 0.3) * Math.PI * 2;
            ctx.strokeStyle = `rgba(${100 + (r(s + 0.4) * 60 | 0)},${30 + (r(s + 0.5) * 40 | 0)},${180 + (r(s + 0.6) * 60 | 0)},0.35)`;
            ctx.lineWidth = 1.5;
            ctx.beginPath();
            ctx.arc(cx2, cy2, sr, startA, startA + Math.PI * (1.2 + r(s + 0.7) * 0.8));
            ctx.stroke();
        }

        // Orbiting dust dots
        const numDots = 6 + (r(seed + 9) * 6 | 0);
        for (let i = 0; i < numDots; i++) {
            const s = seed + i * 0.73;
            const angle = r(s) * Math.PI * 2;
            const dist  = (0.25 + r(s + 0.1) * 0.4) * Math.min(w, h) * 0.5;
            const cx2 = x + w * 0.5 + Math.cos(angle) * dist;
            const cy2 = y + h * 0.5 + Math.sin(angle) * dist;
            const isWhite = r(s + 0.2) > 0.6;
            ctx.fillStyle = isWhite ? `rgba(255,255,255,${0.25 + r(s + 0.3) * 0.35})` : `rgba(${120 + (r(s + 0.4) * 60 | 0)},50,220,${0.35 + r(s + 0.5) * 0.3})`;
            ctx.beginPath(); ctx.arc(cx2, cy2, 1 + r(s + 0.6), 0, Math.PI * 2); ctx.fill();
        }

        ctx.restore();

        // Bevel: deep purple tint
        ctx.fillStyle = 'rgba(80,20,160,0.22)';
        ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x + w, y); ctx.lineTo(x + w - bev, y + bev); ctx.lineTo(x + bev, y + bev); ctx.closePath(); ctx.fill();
        ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x + bev, y + bev); ctx.lineTo(x + bev, y + h - bev); ctx.lineTo(x, y + h); ctx.closePath(); ctx.fill();
        ctx.fillStyle = 'rgba(0,0,0,0.60)';
        ctx.beginPath(); ctx.moveTo(x, y + h); ctx.lineTo(x + w, y + h); ctx.lineTo(x + w - bev, y + h - bev); ctx.lineTo(x + bev, y + h - bev); ctx.closePath(); ctx.fill();
        ctx.beginPath(); ctx.moveTo(x + w, y); ctx.lineTo(x + w, y + h); ctx.lineTo(x + w - bev, y + h - bev); ctx.lineTo(x + w - bev, y + bev); ctx.closePath(); ctx.fill();

        ctx.strokeStyle = '#04010a';
        ctx.lineWidth = 2;
        ctx.strokeRect(x, y, w, h);
    }
}

// Register Biome if BiomeManager exists, otherwise it might be handled by game.js logic
if (typeof BIOME_LOGIC === 'undefined') window.BIOME_LOGIC = {};
window.BIOME_LOGIC['gravity'] = new ChaosBiome();
