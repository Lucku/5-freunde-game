// The Dreamspace — Dream's Biome
// Floating geometry, starfields, drifting motes. Dream Pockets teleport enemies.

class DreamspaceBiome {
    constructor() {
        this.name = "The Dreamspace";
        this.color = "#0a0815";
        this.gridColor = "#5a3e9e44";
        this.sparks = [];
        this.pockets = [];     // {x, y, radius, blinkTimer, rotation}
        this.bgStars = [];     // precomputed at gen
        this.t = 0;
        this.starPulsePhase = 0;
    }

    generate(arena) {
        const w = arena.width, h = arena.height;
        const cx = w / 2, cy = h / 2;

        console.log("Generating Dreamspace Biome...");

        // 2-4 Dream Pockets as BiomeZones (mark for teleport behavior in update)
        const pocketCount = 2 + Math.floor(Math.random() * 3);
        this.pockets = [];
        for (let i = 0; i < pocketCount; i++) {
            let px, py, tries = 0;
            do {
                px = 250 + Math.random() * (w - 500);
                py = 250 + Math.random() * (h - 500);
                tries++;
            } while (Math.hypot(px - cx, py - cy) < 250 && tries < 12);
            const radius = 150;
            this.pockets.push({
                x: px, y: py, radius,
                blinkTimer: 100 + Math.random() * 360,
                rotation: 0,
                lastTeleportFrame: {}
            });
            arena.biomeZones.push(new BiomeZone(px - radius, py - radius, radius * 2, radius * 2, 'DREAM_POCKET'));
        }

        // 10-14 obstacles, mix of rect + circle "floating islands", asymmetric
        const count = 10 + Math.floor(Math.random() * 5);
        for (let i = 0; i < count; i++) {
            const isCircle = Math.random() < 0.4;
            const size = 80 + Math.random() * 90;
            let ox, oy, tries = 0;
            do {
                ox = 150 + Math.random() * (w - 300);
                oy = 150 + Math.random() * (h - 300);
                tries++;
            } while (Math.hypot(ox - cx, oy - cy) < 300 && tries < 20);
            arena.obstacles.push(new Obstacle(ox, oy, size, isCircle ? size : 80 + Math.random() * 90, isCircle ? 'dream-circle' : 'dream-rect'));
        }

        // Precompute background stars (1000 across arena)
        this.bgStars = [];
        for (let i = 0; i < 800; i++) {
            this.bgStars.push({
                x: Math.random() * w,
                y: Math.random() * h,
                r: 0.4 + Math.random() * 1.2,
                phase: Math.random() * Math.PI * 2,
                baseAlpha: 0.2 + Math.random() * 0.4,
                hue: Math.random() < 0.3 ? '#c4b5fd' : '#ffffff'
            });
        }
    }

    update(arena, player, enemies) {
        this.t++;
        this.starPulsePhase += 0.014;

        // Spark particles (2-3 per frame, slow random drift)
        if (Math.random() < 0.7) {
            for (let i = 0; i < 2; i++) {
                this.sparks.push({
                    x: Math.random() * arena.width,
                    y: Math.random() * arena.height,
                    vx: (Math.random() - 0.5) * 0.4,
                    vy: (Math.random() - 0.5) * 0.4,
                    life: 200 + Math.random() * 200,
                    maxLife: 400,
                    size: 1 + Math.random() * 1.8,
                    hue: Math.random() < 0.5 ? '#9c7fe0' : '#c4b5fd'
                });
            }
        }
        for (let i = this.sparks.length - 1; i >= 0; i--) {
            const s = this.sparks[i];
            s.x += s.vx;
            s.y += s.vy;
            s.life--;
            if (s.life <= 0) this.sparks.splice(i, 1);
        }

        // Dream Pockets: blink (relocate) every ~6s
        this.pockets.forEach((p, idx) => {
            p.blinkTimer--;
            p.rotation += 0.012;
            if (p.blinkTimer <= 0) {
                p.blinkTimer = 300 + Math.random() * 120;
                // Pick new random position
                const w = arena.width, h = arena.height;
                p.x = 250 + Math.random() * (w - 500);
                p.y = 250 + Math.random() * (h - 500);
                // Sync BiomeZone position if present
                const zone = arena.biomeZones.find(z => z.type === 'DREAM_POCKET' && Math.abs(z.x + z.w/2 - (p._lastX || p.x)) < 1);
                if (zone) {
                    zone.x = p.x - p.radius;
                    zone.y = p.y - p.radius;
                }
                p._lastX = p.x;
                // Soft chime — reuse special_dream for now (light play)
                if (typeof audioManager !== 'undefined' && Math.random() < 0.3) {
                    // skip — too noisy
                }
            }
        });

        // Enemy teleport on entering a pocket (20% per entry)
        if (enemies) {
            enemies.forEach(e => {
                if (e.hp <= 0) return;
                this.pockets.forEach((p, idx) => {
                    const inside = Math.hypot(e.x - p.x, e.y - p.y) < p.radius;
                    const wasInside = e._dpInside && e._dpInside === idx;
                    if (inside && !wasInside) {
                        e._dpInside = idx;
                        if (Math.random() < 0.2) {
                            // Short-range teleport (200px random offset)
                            const ang = Math.random() * Math.PI * 2;
                            const dist = 60 + Math.random() * 140;
                            e.x += Math.cos(ang) * dist;
                            e.y += Math.sin(ang) * dist;
                            e._dreamTeleportFx = 20;
                        }
                    } else if (!inside && wasInside) {
                        e._dpInside = -1;
                    }
                });
                if (e._dreamTeleportFx && e._dreamTeleportFx > 0) e._dreamTeleportFx--;
            });
        }
    }

    drawBackground(ctx, arena) {
        const aw = arena.width, ah = arena.height;

        // Opaque bg fill (called before entities)
        ctx.save();
        ctx.fillStyle = '#0a0815';
        ctx.fillRect(0, 0, aw, ah);

        // Saturation boost during Dreamscape / Long Sleep
        const boosted = window.player && (window.player.dreamPocket || window.player.longSleepActive);
        if (boosted) {
            ctx.globalAlpha = 0.18;
            const grd = ctx.createLinearGradient(0, 0, 0, ah);
            grd.addColorStop(0, '#3a1e90');
            grd.addColorStop(1, '#1a1438');
            ctx.fillStyle = grd;
            ctx.fillRect(0, 0, aw, ah);
            ctx.globalAlpha = 1;
        }
        ctx.restore();

        // Background stars (part of bg layer so entities draw on top)
        ctx.save();
        this.bgStars.forEach(s => {
            const tw = boosted ? 1.6 : 1.0;
            const alpha = s.baseAlpha * tw * (0.6 + 0.4 * Math.sin(this.starPulsePhase + s.phase));
            ctx.globalAlpha = alpha;
            ctx.fillStyle = s.hue;
            ctx.beginPath();
            ctx.arc(s.x, s.y, s.r, 0, Math.PI * 2);
            ctx.fill();
        });
        ctx.globalAlpha = 1;
        ctx.restore();

        // Player indigo radial glow (translucent — part of bg layer)
        if (window.player) {
            ctx.save();
            const grd = ctx.createRadialGradient(window.player.x, window.player.y, 50, window.player.x, window.player.y, 500);
            grd.addColorStop(0,   'rgba(124, 94, 200, 0.20)');
            grd.addColorStop(0.6, 'rgba(60, 30, 130, 0.05)');
            grd.addColorStop(1,   'rgba(20, 8, 50, 0)');
            ctx.fillStyle = grd;
            ctx.fillRect(0, 0, aw, ah);
            ctx.restore();
        }
    }

    draw(ctx, arena) {
        const aw = arena.width, ah = arena.height;

        // Dream Pockets: rotating swirl rings
        ctx.save();
        ctx.globalCompositeOperation = 'lighter';
        this.pockets.forEach(p => {
            ctx.save();
            ctx.translate(p.x, p.y);
            ctx.rotate(p.rotation);
            const grd = ctx.createRadialGradient(0, 0, 10, 0, 0, p.radius);
            grd.addColorStop(0,   'rgba(90, 62, 158, 0.40)');
            grd.addColorStop(0.6, 'rgba(40, 20, 90, 0.18)');
            grd.addColorStop(1,   'rgba(10, 8, 21, 0)');
            ctx.fillStyle = grd;
            ctx.beginPath();
            ctx.arc(0, 0, p.radius, 0, Math.PI * 2);
            ctx.fill();
            ctx.strokeStyle = 'rgba(196, 181, 253, 0.4)';
            ctx.lineWidth = 1.2;
            for (let i = 0; i < 3; i++) {
                ctx.beginPath();
                const sa = i * (Math.PI * 2 / 3);
                ctx.arc(0, 0, p.radius * (0.4 + i * 0.18), sa, sa + Math.PI * 1.3);
                ctx.stroke();
            }
            ctx.restore();
        });
        ctx.restore();

        // Sparks
        ctx.save();
        this.sparks.forEach(s => {
            ctx.globalAlpha = Math.min(1, s.life / 120) * 0.85;
            ctx.fillStyle = s.hue;
            ctx.beginPath();
            ctx.arc(s.x, s.y, s.size, 0, Math.PI * 2);
            ctx.fill();
            // Short trail
            ctx.strokeStyle = s.hue;
            ctx.globalAlpha = Math.min(1, s.life / 120) * 0.35;
            ctx.lineWidth = 0.8;
            ctx.beginPath();
            ctx.moveTo(s.x, s.y);
            ctx.lineTo(s.x - s.vx * 6, s.y - s.vy * 6);
            ctx.stroke();
        });
        ctx.globalAlpha = 1;
        ctx.restore();

        // Teleport flash overlay
        if (window._world && window._world.enemies) {
            ctx.save();
            window._world.enemies.forEach(e => {
                if (e._dreamTeleportFx && e._dreamTeleportFx > 0) {
                    const a = e._dreamTeleportFx / 20;
                    ctx.strokeStyle = `rgba(196, 181, 253, ${a * 0.8})`;
                    ctx.lineWidth = 2;
                    ctx.beginPath();
                    ctx.arc(e.x, e.y, (e.radius || 18) + 6, 0, Math.PI * 2);
                    ctx.stroke();
                }
            });
            ctx.restore();
        }
    }

    drawObstacle(ctx, obs) {
        const { x, y, w, h } = obs;
        const bev = 5;
        const isCircle = obs.biomeType === 'dream-circle';
        const t = this.t;
        const bob = Math.sin(t * 0.04 + x * 0.01) * 1.5;

        // Drop shadow beneath obstacle (hovering effect)
        ctx.save();
        ctx.fillStyle = 'rgba(0, 0, 10, 0.5)';
        ctx.beginPath();
        ctx.ellipse(x + w / 2, y + h + 8, w * 0.45, 6, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();

        ctx.save();
        ctx.translate(0, bob);

        if (isCircle) {
            const cx = x + w / 2, cy = y + h / 2;
            const rad = Math.min(w, h) / 2;
            const grd = ctx.createRadialGradient(cx - rad * 0.3, cy - rad * 0.3, rad * 0.1, cx, cy, rad);
            grd.addColorStop(0,   '#352866');
            grd.addColorStop(0.6, '#1a1438');
            grd.addColorStop(1,   '#0a0815');
            ctx.fillStyle = grd;
            ctx.beginPath();
            ctx.arc(cx, cy, rad, 0, Math.PI * 2);
            ctx.fill();
            ctx.strokeStyle = '#2a1a4a';
            ctx.lineWidth = 1.5;
            ctx.stroke();

            // Internal stars
            const seed = x * 0.013 + y * 0.029;
            for (let i = 0; i < 2; i++) {
                const ang = (i * 1.7 + seed) % (Math.PI * 2);
                const sx = cx + Math.cos(ang) * rad * 0.4;
                const sy = cy + Math.sin(ang) * rad * 0.4;
                ctx.fillStyle = `rgba(196, 181, 253, ${0.55 + Math.sin(t * 0.1 + i) * 0.25})`;
                ctx.beginPath();
                ctx.arc(sx, sy, 2, 0, Math.PI * 2);
                ctx.fill();
            }
        } else {
            const grd = ctx.createLinearGradient(x, y, x + w, y + h);
            grd.addColorStop(0,   '#2c2360');
            grd.addColorStop(0.5, '#1a1438');
            grd.addColorStop(1,   '#0a0815');
            ctx.fillStyle = grd;
            ctx.fillRect(x, y, w, h);

            // Bevel
            ctx.fillStyle = 'rgba(108, 92, 231, 0.45)';
            ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x + w, y); ctx.lineTo(x + w - bev, y + bev); ctx.lineTo(x + bev, y + bev); ctx.closePath(); ctx.fill();
            ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x + bev, y + bev); ctx.lineTo(x + bev, y + h - bev); ctx.lineTo(x, y + h); ctx.closePath(); ctx.fill();
            ctx.fillStyle = 'rgba(5, 4, 12, 0.6)';
            ctx.beginPath(); ctx.moveTo(x, y + h); ctx.lineTo(x + w, y + h); ctx.lineTo(x + w - bev, y + h - bev); ctx.lineTo(x + bev, y + h - bev); ctx.closePath(); ctx.fill();
            ctx.beginPath(); ctx.moveTo(x + w, y); ctx.lineTo(x + w, y + h); ctx.lineTo(x + w - bev, y + h - bev); ctx.lineTo(x + w - bev, y + bev); ctx.closePath(); ctx.fill();

            // Internal stars
            const seed = x * 0.013 + y * 0.027;
            for (let i = 0; i < 2; i++) {
                const sx = x + 10 + ((seed * 100 + i * 37) % (w - 20));
                const sy = y + 10 + ((seed * 70 + i * 53) % (h - 20));
                ctx.fillStyle = `rgba(196, 181, 253, ${0.5 + Math.sin(t * 0.1 + i + seed) * 0.3})`;
                ctx.beginPath();
                ctx.arc(sx, sy, 1.8, 0, Math.PI * 2);
                ctx.fill();
            }

            ctx.strokeStyle = '#2a1a4a';
            ctx.lineWidth = 1.5;
            ctx.strokeRect(x, y, w, h);
        }

        ctx.restore();
    }
}

if (typeof BIOME_LOGIC === 'undefined') window.BIOME_LOGIC = {};
window.BIOME_LOGIC['dream'] = new DreamspaceBiome();
