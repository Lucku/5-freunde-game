class PoisonBiome {
    constructor() {
        this.name = "Poison";
        this.color = "#76ff03";
        this.gasClouds = []; // Rising gas particles
        this.bubbles = [];   // Surface bubbles
    }

    update(arena, player, enemies) {
        const cam = arena.camera;
        const frame = window.frame || 0;

        // --- Spawn rising gas clouds from random ground positions within view ---
        if (Math.random() < 0.35) {
            const spawnX = cam.x + Math.random() * cam.width;
            const spawnY = cam.y + cam.height * 0.5 + Math.random() * cam.height * 0.5;
            const life = 140 + Math.random() * 160;
            this.gasClouds.push({
                x: spawnX,
                y: spawnY,
                vx: (Math.random() - 0.5) * 0.25,
                vy: -(0.25 + Math.random() * 0.45),
                r: 18 + Math.random() * 28,
                life: life,
                maxLife: life,
                phase: Math.random() * Math.PI * 2,
                // 0 = sickly yellow-green, 1 = dark toxic
                tint: Math.random() < 0.4 ? 0 : 1,
            });
        }

        // Update gas clouds
        for (let i = this.gasClouds.length - 1; i >= 0; i--) {
            const g = this.gasClouds[i];
            g.x += g.vx + Math.sin(g.life * 0.04 + g.phase) * 0.18;
            g.y += g.vy;
            g.r += 0.12; // Expand as they rise
            g.life--;
            if (g.life <= 0) this.gasClouds.splice(i, 1);
        }

        // --- Spawn surface bubbles ---
        if (Math.random() < 0.12) {
            this.bubbles.push({
                x: cam.x + Math.random() * cam.width,
                y: cam.y + Math.random() * cam.height,
                r: 2.5 + Math.random() * 7,
                life: 30 + Math.random() * 50,
                maxLife: 80,
                phase: Math.random() * Math.PI * 2,
            });
        }
        for (let i = this.bubbles.length - 1; i >= 0; i--) {
            this.bubbles[i].y -= 0.4;
            this.bubbles[i].life--;
            if (this.bubbles[i].life <= 0) this.bubbles.splice(i, 1);
        }

        // --- Flask spawning ---
        if (Math.random() < 0.002) {
            const flasks = arena.obstacles.filter(o => o instanceof PoisonFlask);
            if (flasks.length < 3) {
                const x = Math.random() * (arena.width - 100) + 50;
                const y = Math.random() * (arena.height - 100) + 50;
                if (!arena.checkCollision(x, y, 30)) {
                    arena.obstacles.push(new PoisonFlask(x, y));
                }
            }
        }

        // --- Update existing flasks ---
        for (let i = arena.obstacles.length - 1; i >= 0; i--) {
            const obs = arena.obstacles[i];
            if (obs instanceof PoisonFlask) {
                obs.update();
                if (obs.checkCollision(player) || obs.life <= 0) {
                    arena.obstacles.splice(i, 1);
                }
            }
        }

        // --- Sludge zone effects ---
        if (arena.biomeZones) {
            arena.biomeZones.forEach(zone => {
                if (zone.type === 'SLUDGE') {
                    if (player.x > zone.x && player.x < zone.x + zone.w &&
                        player.y > zone.y && player.y < zone.y + zone.h) {
                        if (player.type === 'poison') {
                            if (frame % 60 === 0) player.hp = Math.min(player.maxHp, player.hp + 1);
                        } else {
                            player.speedMultiplier = (player.speedMultiplier || 1) * 0.7;
                            if (frame % 60 === 0) player.hp -= 1;
                        }
                    }
                }
            });
        }
    }

    drawBackground(ctx, arena) {
        const cam = arena.camera;
        const time = Date.now() / 1000;
        const cellSize = 320;

        const sx = Math.floor(cam.x / cellSize) * cellSize;
        const sy = Math.floor(cam.y / cellSize) * cellSize;
        const ex = sx + cam.width + cellSize;
        const ey = sy + cam.height + cellSize;

        ctx.save();

        // ── LAYER 1: OPPRESSIVE DARK OVERLAY ────────────────────────────────
        ctx.fillStyle = 'rgba(3, 12, 0, 0.6)';
        ctx.fillRect(cam.x, cam.y, cam.width, cam.height);

        // ── LAYER 2: DRIFTING TOXIC MIST BANDS ──────────────────────────────
        for (let row = 0; row < 6; row++) {
            const bandY = cam.y + (row / 6) * cam.height;
            const drift  = Math.sin(time * 0.28 + row * 1.9) * 40;
            const alpha  = 0.03 + Math.sin(time * 0.4 + row * 0.8) * 0.015;
            const grad = ctx.createLinearGradient(cam.x + drift, bandY, cam.x + cam.width + drift, bandY + cam.height / 5);
            grad.addColorStop(0,   'rgba(30, 80, 0, 0)');
            grad.addColorStop(0.4, `rgba(45, 110, 0, ${alpha})`);
            grad.addColorStop(0.6, `rgba(65, 130, 0, ${alpha})`);
            grad.addColorStop(1,   'rgba(30, 80, 0, 0)');
            ctx.fillStyle = grad;
            ctx.fillRect(cam.x + drift - 60, bandY, cam.width + 120, cam.height / 5);
        }

        // ── LAYER 3: PROCEDURAL TOXIC POOLS, DEAD FLORA, CRACKS ─────────────
        for (let x = sx; x <= ex; x += cellSize) {
            for (let y = sy; y <= ey; y += cellSize) {
                const hash  = Math.sin(x * 12.9898 + y * 78.233) * 43758.5453;
                const val   = hash - Math.floor(hash);
                const hash2 = Math.sin(x * 93.989 + y * 17.233) * 7843.5;
                const val2  = hash2 - Math.floor(hash2);

                const px = x + (val  * 1337) % cellSize;
                const py = y + (val  * 7331) % cellSize;

                // TOXIC POOLS
                if (val > 0.32) {
                    const swell  = Math.sin(time * 1.4 + val * 8) * 5;
                    const radius = 22 + val * 38 + swell;

                    // Dark outer sludge
                    ctx.fillStyle = 'rgba(8, 28, 3, 0.5)';
                    ctx.beginPath();
                    ctx.arc(px, py, radius * 1.5, 0, Math.PI * 2);
                    ctx.fill();

                    // Inner toxic gradient
                    const poolGrad = ctx.createRadialGradient(px, py, 0, px, py, radius);
                    poolGrad.addColorStop(0,   'rgba(70, 160, 0, 0.28)');
                    poolGrad.addColorStop(0.55, 'rgba(35, 90, 0, 0.18)');
                    poolGrad.addColorStop(1,    'rgba(8, 25, 0, 0.04)');
                    ctx.fillStyle = poolGrad;
                    ctx.beginPath();
                    ctx.arc(px, py, radius, 0, Math.PI * 2);
                    ctx.fill();

                    // Glowing toxic rim
                    ctx.strokeStyle = `rgba(90, 190, 0, ${0.08 + Math.sin(time * 2 + val * 7) * 0.04})`;
                    ctx.lineWidth = 1.5;
                    ctx.beginPath();
                    ctx.arc(px, py, radius * 0.85, 0, Math.PI * 2);
                    ctx.stroke();

                    // Bubbling highlight
                    const bubbleSin = Math.sin(time * 2.8 + val * 18);
                    if (bubbleSin > 0.55) {
                        const bx = px + Math.cos(time * 0.9 + val) * radius * 0.4;
                        const by = py + Math.sin(time * 1.2 + val) * radius * 0.4;
                        ctx.fillStyle = `rgba(140, 240, 10, ${(bubbleSin - 0.55) * 0.7})`;
                        ctx.shadowBlur = 6;
                        ctx.shadowColor = '#76ff03';
                        ctx.beginPath();
                        ctx.arc(bx, by, 2.5 + val * 4, 0, Math.PI * 2);
                        ctx.fill();
                        ctx.shadowBlur = 0;
                    }
                }

                // DEAD / DISEASED VEGETATION
                if (val2 < 0.42) {
                    const vx = x + (val2 * 9999) % cellSize;
                    const vy = y + (val2 * 8888) % cellSize;
                    const sway = Math.sin(time * 0.65 + val2 * 4.5) * 3.5;

                    ctx.strokeStyle = `rgba(25, 50, 8, ${0.55 + val2 * 0.25})`;
                    ctx.lineWidth = 1.5 + val2 * 1.5;
                    ctx.lineCap = 'round';

                    // Main stalk with slight curve
                    ctx.beginPath();
                    ctx.moveTo(vx, vy);
                    ctx.quadraticCurveTo(vx + sway * 0.6, vy - 14, vx + sway - 6, vy - 28);
                    ctx.stroke();

                    // Side branch
                    if (val2 > 0.2) {
                        ctx.lineWidth = 1;
                        ctx.beginPath();
                        ctx.moveTo(vx + sway * 0.4, vy - 11);
                        ctx.lineTo(vx + sway * 0.4 + 12 * (val2 > 0.3 ? 1 : -1), vy - 21);
                        ctx.stroke();
                    }

                    // Toxic drip from tip
                    const drip = Math.sin(time * 1.8 + val2 * 6);
                    if (drip > 0.5) {
                        const dropY = vy - 28 + ((drip - 0.5) / 0.5) * 10;
                        ctx.fillStyle = `rgba(80, 180, 5, ${(drip - 0.5) * 0.8})`;
                        ctx.beginPath();
                        ctx.arc(vx + sway - 6, dropY, 2, 0, Math.PI * 2);
                        ctx.fill();
                    }
                }

                // TOXIC FISSURES / CRACKS
                if (val > 0.72 && val2 > 0.65) {
                    const fx = x + (val2 * 5432) % cellSize;
                    const fy = y + (val  * 3210) % cellSize;
                    ctx.strokeStyle = `rgba(80, 170, 0, 0.1)`;
                    ctx.lineWidth = 1;
                    ctx.lineCap = 'round';
                    ctx.beginPath();
                    ctx.moveTo(fx, fy);
                    ctx.lineTo(fx + (val  - 0.5) * 36, fy + (val2 - 0.5) * 26);
                    ctx.lineTo(fx + (val2 - 0.3) * 28, fy + (val  - 0.4) * 44);
                    ctx.stroke();
                }
            }
        }

        // ── LAYER 4: RISING GAS CLOUDS ───────────────────────────────────────
        this.gasClouds.forEach(g => {
            const r = 1 - g.life / g.maxLife; // 0→1 as cloud rises and fades
            // Fade in during first 15%, full opacity until 75%, fade out last 25%
            let a;
            if (r < 0.15)      a = (r / 0.15) * 0.22;
            else if (r > 0.75) a = (1 - (r - 0.75) / 0.25) * 0.22;
            else               a = 0.22;

            const grad = ctx.createRadialGradient(g.x, g.y, 0, g.x, g.y, g.r);
            if (g.tint === 0) {
                // Sickly yellow-green
                grad.addColorStop(0,   `rgba(100, 175, 0, ${a})`);
                grad.addColorStop(0.55, `rgba(55, 110, 0, ${a * 0.6})`);
                grad.addColorStop(1,    'rgba(20, 50, 0, 0)');
            } else {
                // Dark murky green
                grad.addColorStop(0,   `rgba(30, 70, 0, ${a * 0.9})`);
                grad.addColorStop(0.55, `rgba(15, 45, 0, ${a * 0.5})`);
                grad.addColorStop(1,    'rgba(5, 18, 0, 0)');
            }
            ctx.fillStyle = grad;
            ctx.beginPath();
            ctx.arc(g.x, g.y, g.r, 0, Math.PI * 2);
            ctx.fill();
        });

        // ── LAYER 5: SURFACE BUBBLES ─────────────────────────────────────────
        this.bubbles.forEach(b => {
            const a = Math.min(1, b.life / 25) * 0.55;
            ctx.strokeStyle = `rgba(140, 250, 10, ${a})`;
            ctx.lineWidth = 1;
            ctx.beginPath();
            ctx.arc(b.x, b.y, b.r, 0, Math.PI * 2);
            ctx.stroke();
            // Highlight sheen
            ctx.fillStyle = `rgba(200, 255, 80, ${a * 0.28})`;
            ctx.beginPath();
            ctx.arc(b.x - b.r * 0.3, b.y - b.r * 0.3, b.r * 0.28, 0, Math.PI * 2);
            ctx.fill();
        });

        // ── LAYER 6: EDGE VIGNETTE (darkness creeping in) ───────────────────
        const vigCX = cam.x + cam.width  / 2;
        const vigCY = cam.y + cam.height / 2;
        const vigGrad = ctx.createRadialGradient(vigCX, vigCY, cam.height * 0.22, vigCX, vigCY, cam.height * 0.78);
        vigGrad.addColorStop(0, 'rgba(0, 0, 0, 0)');
        vigGrad.addColorStop(1, 'rgba(0, 12, 0, 0.5)');
        ctx.fillStyle = vigGrad;
        ctx.fillRect(cam.x, cam.y, cam.width, cam.height);

        ctx.restore();
    }

    // Called from game.js draw hook (world-space, renders on top of entities)
    draw(ctx, arena) {
        const cam = arena.camera;
        const time = Date.now() / 1000;

        ctx.save();

        // Pulsing sickly green tint over everything — like breathing in the fumes
        const breathe = 0.025 + Math.sin(time * 0.6) * 0.015;
        ctx.fillStyle = `rgba(20, 60, 0, ${breathe})`;
        ctx.fillRect(cam.x, cam.y, cam.width, cam.height);

        ctx.restore();
    }
}

// Register
if (typeof window.BIOME_LOGIC === 'undefined') window.BIOME_LOGIC = {};
window.BIOME_LOGIC['poison'] = new PoisonBiome();
window.BIOME_LOGIC['POISON_SWAMP'] = window.BIOME_LOGIC['poison'];

// ── POISON FLASK ENTITY ──────────────────────────────────────────────────────
class PoisonFlask {
    constructor(x, y) {
        this.x = x;
        this.y = y;
        this.w = 30;
        this.h = 30;
        this.radius = 15;

        const types = ['RED', 'BLUE', 'GREEN'];
        this.type = types[Math.floor(Math.random() * types.length)];

        this.life = 1200;
        this.bobOffset = Math.random() * Math.PI;
    }

    update() {
        this.life--;
    }

    draw(ctx) {
        const bob = Math.sin((Date.now() / 200) + this.bobOffset) * 5;
        const drawY = this.y + bob;

        ctx.save();

        let color = '#fff';
        if (this.type === 'RED')   color = '#e74c3c';
        if (this.type === 'BLUE')  color = '#3498db';
        if (this.type === 'GREEN') color = '#76ff03';

        ctx.fillStyle = color;
        ctx.strokeStyle = '#fff';
        ctx.lineWidth = 2;

        ctx.beginPath();
        ctx.arc(this.x, drawY, 10, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();

        ctx.fillStyle = '#fff';
        ctx.fillRect(this.x - 4, drawY - 15, 8, 8);

        ctx.shadowBlur = 10;
        ctx.shadowColor = color;
        ctx.fillStyle = 'rgba(255,255,255,0.5)';
        ctx.beginPath();
        ctx.arc(this.x - 3, drawY - 3, 3, 0, Math.PI * 2);
        ctx.fill();

        ctx.restore();
    }

    checkCollision(player) {
        if (player.type !== 'poison') return false;

        let hit = false;
        if (typeof player.radius === 'number') {
            hit = Math.hypot(player.x - this.x, player.y - this.y) < player.radius + this.radius;
        } else {
            const px = player.x - (player.width || 30) / 2;
            const py = player.y - (player.height || 30) / 2;
            const pw = player.width || 30;
            const ph = player.height || 30;
            const fx = this.x - this.radius;
            const fy = this.y - this.radius;
            const fs = this.radius * 2;
            hit = (px < fx + fs && px + pw > fx && py < fy + fs && py + ph > fy);
        }

        if (hit) {
            if (player.poisonFlasks) {
                player.poisonFlasks.push(this.type);
                if (player.poisonFlasks.length > 2) player.poisonFlasks.shift();
                if (typeof showNotification === 'function') showNotification(`Got ${this.type} Flask!`, '#fff');
            }
            return true;
        }
        return false;
    }
}
