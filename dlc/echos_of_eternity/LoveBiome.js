// Echos of Eternity — Love Biome: The Heart Nexus
// Ethereal, glowing environments. Calm but emotionally intense.
// Pink petals drift upward. Soft light pulses from the ground.
// Emotional field effects link entities together.

class LoveBiome {
    static generate(arena) {
        const cx = arena.width / 2;
        const cy = arena.height / 2;

        // Emotional resonance zones — charmed enemies take more damage
        if (typeof BiomeZone !== 'undefined') {
            arena.biomeZones.push(new BiomeZone(cx - 400, cy - 250, 220, 220, 'HEART_NEXUS'));
            arena.biomeZones.push(new BiomeZone(cx + 180, cy + 100, 200, 200, 'HEART_NEXUS'));
            arena.biomeZones.push(new BiomeZone(cx - 100, cy + 280, 180, 180, 'HEART_NEXUS'));
        }

        // Petal particles
        arena._loveParticles = [];
        for (let i = 0; i < 55; i++) {
            arena._loveParticles.push(LoveBiome._makePetal(arena));
        }

        // Heart pulse nodes (glowing floor marks)
        arena._heartNodes = [];
        for (let i = 0; i < 14; i++) {
            arena._heartNodes.push({
                x: Math.random() * arena.width,
                y: Math.random() * arena.height,
                radius: 24 + Math.random() * 32,
                phase: Math.random() * Math.PI * 2,
                speed: 0.025 + Math.random() * 0.015,
                alpha: 0.04 + Math.random() * 0.06,
            });
        }

        // Soft light shafts (decorative)
        arena._loveShafts = [];
        for (let i = 0; i < 8; i++) {
            arena._loveShafts.push({
                x: Math.random() * arena.width,
                y: 0,
                width: 30 + Math.random() * 50,
                alpha: 0.03 + Math.random() * 0.04,
                phase: Math.random() * Math.PI * 2,
            });
        }
    }

    static _makePetal(arena) {
        return {
            x: Math.random() * arena.width,
            y: Math.random() * arena.height,
            vx: (Math.random() - 0.5) * 0.5,
            vy: -(0.4 + Math.random() * 0.8),
            size: 3 + Math.random() * 5,
            alpha: 0.2 + Math.random() * 0.45,
            rot: Math.random() * Math.PI * 2,
            rotSpeed: (Math.random() - 0.5) * 0.05,
            life: 200 + Math.floor(Math.random() * 300),
            color: Math.random() < 0.6 ? '#ff9dbf' : '#ffb3cc',
        };
    }

    static drawBackground(ctx, arena) {
        const cam = arena.camera;
        const cellSize = 320;
        const sx = Math.floor(cam.x / cellSize) * cellSize;
        const sy = Math.floor(cam.y / cellSize) * cellSize;
        const ex = sx + cam.width + cellSize;
        const ey = sy + cam.height + cellSize;

        ctx.save();

        // Soft grid of heart-shaped floor marks
        for (let x = sx; x <= ex; x += cellSize) {
            for (let y = sy; y <= ey; y += cellSize) {
                const h = Math.sin(x * 5.3491 + y * 11.7128) * 43758.5453;
                const v = h - Math.floor(h);

                if (v > 0.65) {
                    const fx = x + (v * 3341) % cellSize;
                    const fy = y + (v * 6653) % cellSize;
                    ctx.strokeStyle = `rgba(255, 100, 160, 0.07)`;
                    ctx.lineWidth = 1;
                    LoveBiome._drawSmallHeart(ctx, fx, fy, 10 + v * 8);
                }
            }
        }

        // Light shafts from above
        if (arena._loveShafts) {
            for (const shaft of arena._loveShafts) {
                if (shaft.x < cam.x - 80 || shaft.x > cam.x + cam.width + 80) continue;
                const pulse = Math.sin(shaft.phase + Date.now() * 0.001) * 0.5 + 0.5;
                const sg = ctx.createLinearGradient(shaft.x, cam.y, shaft.x, cam.y + cam.height);
                sg.addColorStop(0, `rgba(255,180,210,${shaft.alpha * pulse})`);
                sg.addColorStop(0.5, `rgba(255,150,190,${shaft.alpha * pulse * 0.5})`);
                sg.addColorStop(1, 'rgba(255,150,190,0)');
                ctx.fillStyle = sg;
                ctx.fillRect(shaft.x - shaft.width / 2, cam.y, shaft.width, cam.height);
            }
        }

        // Heart pulse nodes
        if (arena._heartNodes) {
            for (const node of arena._heartNodes) {
                if (node.x < cam.x - 80 || node.x > cam.x + cam.width + 80) continue;
                if (node.y < cam.y - 80 || node.y > cam.y + cam.height + 80) continue;
                const pulse = Math.sin(node.phase) * 0.5 + 0.5;
                ctx.globalAlpha = node.alpha * (0.5 + pulse * 0.5);
                const ng = ctx.createRadialGradient(node.x, node.y, 2, node.x, node.y, node.radius);
                ng.addColorStop(0, 'rgba(255,100,160,0.6)');
                ng.addColorStop(1, 'rgba(255,100,160,0)');
                ctx.beginPath();
                ctx.arc(node.x, node.y, node.radius, 0, Math.PI * 2);
                ctx.fillStyle = ng;
                ctx.fill();
            }
            ctx.globalAlpha = 1;
        }

        ctx.restore();
    }

    static _drawSmallHeart(ctx, x, y, size) {
        ctx.beginPath();
        ctx.moveTo(x, y + size * 0.3);
        ctx.bezierCurveTo(x, y, x - size * 0.5, y, x - size * 0.5, y + size * 0.3);
        ctx.bezierCurveTo(x - size * 0.5, y + size * 0.6, x, y + size * 0.9, x, y + size);
        ctx.bezierCurveTo(x, y + size * 0.9, x + size * 0.5, y + size * 0.6, x + size * 0.5, y + size * 0.3);
        ctx.bezierCurveTo(x + size * 0.5, y, x, y, x, y + size * 0.3);
        ctx.stroke();
    }

    static update(arena, pl, enemies) {
        // Rotate heart pulse nodes
        if (arena._heartNodes) {
            for (const node of arena._heartNodes) {
                node.phase += node.speed;
            }
        }

        // Drift shafts
        if (arena._loveShafts) {
            for (const shaft of arena._loveShafts) {
                shaft.phase += 0.008;
            }
        }

        // Update petal particles
        if (arena._loveParticles) {
            for (let i = arena._loveParticles.length - 1; i >= 0; i--) {
                const p = arena._loveParticles[i];
                p.x += p.vx;
                p.y += p.vy;
                p.rot += p.rotSpeed;
                p.life--;
                if (p.life <= 0) {
                    arena._loveParticles[i] = LoveBiome._makePetal(arena);
                    arena._loveParticles[i].y = arena.height;
                }
            }
            while (arena._loveParticles.length < 55) {
                arena._loveParticles.push(LoveBiome._makePetal(arena));
            }
        }

        // Heart Nexus zone — charmed enemies (from Love hero) take 25% more damage
        if (arena.biomeZones) {
            arena.biomeZones.forEach(zone => {
                if (zone.type !== 'HEART_NEXUS') return;
                enemies.forEach(e => {
                    if (e._loveCharmed > 0 &&
                        e.x > zone.x && e.x < zone.x + zone.w &&
                        e.y > zone.y && e.y < zone.y + zone.h) {
                        e._nexusDamageBoost = 1.25;
                    } else {
                        delete e._nexusDamageBoost;
                    }
                });
            });
        }
    }

    static draw(ctx, arena) {
        const cam = arena.camera;

        // Floating petals
        if (arena._loveParticles) {
            ctx.save();
            for (const p of arena._loveParticles) {
                if (p.x < cam.x - 20 || p.x > cam.x + cam.width + 20) continue;
                if (p.y < cam.y - 20 || p.y > cam.y + cam.height + 20) continue;
                ctx.globalAlpha = p.alpha * (p.life / 400);
                ctx.save();
                ctx.translate(p.x, p.y);
                ctx.rotate(p.rot);
                ctx.fillStyle = p.color;
                // Petal shape (ellipse)
                ctx.beginPath();
                ctx.ellipse(0, 0, p.size, p.size * 0.5, 0, 0, Math.PI * 2);
                ctx.fill();
                ctx.restore();
            }
            ctx.globalAlpha = 1;
            ctx.restore();
        }

        // Heart Nexus zone indicators
        if (arena.biomeZones) {
            ctx.save();
            arena.biomeZones.forEach(zone => {
                if (zone.type !== 'HEART_NEXUS') return;
                const pulse = 0.03 + 0.015 * Math.sin(Date.now() * 0.002);
                ctx.strokeStyle = `rgba(255, 100, 160, ${pulse * 3})`;
                ctx.lineWidth = 1.5;
                ctx.setLineDash([6, 10]);
                ctx.strokeRect(zone.x, zone.y, zone.w, zone.h);
                ctx.setLineDash([]);
            });
            ctx.restore();
        }
    }
}

window.LoveBiome = LoveBiome;
