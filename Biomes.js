// Base Biome Visual Effects
// Pure visual enhancements for the 5 core biomes: Fire | Water | Ice | Plant | Metal
// No gameplay impact — only drawBackground, update (particles), draw (overlay).

if (typeof window.BIOME_LOGIC === 'undefined') window.BIOME_LOGIC = {};

// ─────────────────────────────────────────────
//  FIRE BIOME — Lava / Volcanic
// ─────────────────────────────────────────────
class FireBiome {
    constructor() {
        this.embers = [];
    }

    generate() {
        this.embers = [];
    }

    // Helper: junction point for a grid cell (deterministic, world coords)
    _jx(x, cellSize, h1) { return x + cellSize * (0.25 + h1 * 0.50); }
    _jy(y, cellSize, h2) { return y + cellSize * (0.25 + h2 * 0.50); }

    drawBackground(ctx, arena) {
        const cam = arena.camera;
        const cs  = 140; // cell size — tighter = denser crack network
        const sx  = Math.floor(cam.x / cs) * cs;
        const sy  = Math.floor(cam.y / cs) * cs;
        const t   = Date.now() * 0.001;

        ctx.save();
        ctx.lineCap  = 'round';
        ctx.lineJoin = 'round';

        for (let x = sx; x <= cam.x + cam.width + cs; x += cs) {
            for (let y = sy; y <= cam.y + cam.height + cs; y += cs) {
                const h1 = Math.sin(x * 0.0137 + y * 0.0091) * 0.5 + 0.5;
                const h2 = Math.cos(x * 0.0091 - y * 0.0137) * 0.5 + 0.5;
                const h3 = Math.sin(x * 0.0229 + y * 0.0181) * 0.5 + 0.5;

                // This cell's junction (crack node)
                const jx = this._jx(x, cs, h1);
                const jy = this._jy(y, cs, h2);

                // Per-cell pulse so different zones breathe independently
                const pulse = 0.78 + 0.22 * Math.sin(t * 1.5 + h1 * 5.1 + h2 * 3.8);

                // Neighbour junctions to connect to (right + bottom + optional diagonal)
                const h1r = Math.sin((x+cs) * 0.0137 + y       * 0.0091) * 0.5 + 0.5;
                const h2r = Math.cos((x+cs) * 0.0091 - y       * 0.0137) * 0.5 + 0.5;
                const h1b = Math.sin(x       * 0.0137 + (y+cs) * 0.0091) * 0.5 + 0.5;
                const h2b = Math.cos(x       * 0.0091 - (y+cs) * 0.0137) * 0.5 + 0.5;

                const targets = [
                    { ex: this._jx(x+cs, cs, h1r), ey: this._jy(y,    cs, h2r) },
                    { ex: this._jx(x,    cs, h1b), ey: this._jy(y+cs, cs, h2b) },
                ];
                if (h3 > 0.55) {
                    const h1d = Math.sin((x+cs) * 0.0137 + (y+cs) * 0.0091) * 0.5 + 0.5;
                    const h2d = Math.cos((x+cs) * 0.0091 - (y+cs) * 0.0137) * 0.5 + 0.5;
                    targets.push({ ex: this._jx(x+cs, cs, h1d), ey: this._jy(y+cs, cs, h2d) });
                }

                targets.forEach(({ ex, ey }) => {
                    // Jagged midpoint (offset perpendicular to crack direction)
                    const mx = (jx + ex) * 0.5 + (h2 - 0.5) * 22;
                    const my = (jy + ey) * 0.5 + (h1 - 0.5) * 22;

                    // Layer 1 — broad outer heat glow
                    ctx.strokeStyle = `rgba(200,35,0,${0.07 * pulse})`;
                    ctx.lineWidth = 8;
                    ctx.beginPath();
                    ctx.moveTo(jx, jy); ctx.lineTo(mx, my); ctx.lineTo(ex, ey);
                    ctx.stroke();

                    // Layer 2 — mid orange band
                    ctx.strokeStyle = `rgba(255,105,0,${0.11 * pulse})`;
                    ctx.lineWidth = 3;
                    ctx.beginPath();
                    ctx.moveTo(jx, jy); ctx.lineTo(mx, my); ctx.lineTo(ex, ey);
                    ctx.stroke();

                    // Layer 3 — bright yellow-white core
                    ctx.strokeStyle = `rgba(255,230,90,${0.16 * pulse})`;
                    ctx.lineWidth = 1;
                    ctx.beginPath();
                    ctx.moveTo(jx, jy); ctx.lineTo(mx, my); ctx.lineTo(ex, ey);
                    ctx.stroke();
                });

                // Lava pool at junction node
                const poolR = 7 + h1 * 10;
                const grd = ctx.createRadialGradient(jx, jy, 0, jx, jy, poolR);
                grd.addColorStop(0,    `rgba(255,210,60,${0.22 * pulse})`);
                grd.addColorStop(0.45, `rgba(255,75,0,${0.12 * pulse})`);
                grd.addColorStop(1,    'rgba(150,15,0,0)');
                ctx.fillStyle = grd;
                ctx.beginPath();
                ctx.arc(jx, jy, poolR, 0, Math.PI * 2);
                ctx.fill();
            }
        }
        ctx.restore();
    }

    update(arena, player) {
        if (this.embers.length < 200 && Math.random() < 0.10) {
            const cam = arena.camera;
            const life = 80 + Math.random() * 80;
            this.embers.push({
                x: cam.x + Math.random() * cam.width,
                y: cam.y + cam.height * 0.3 + Math.random() * cam.height * 0.7,
                vx: (Math.random() - 0.5) * 0.7,
                vy: -(0.6 + Math.random() * 1.4),
                size: 1.5 + Math.random() * 2.5,
                life, maxLife: life,
                wobble: Math.random() * Math.PI * 2,
                color: ['#ff6600', '#ff9900', '#ffcc00'][Math.floor(Math.random() * 3)]
            });
        }
        for (let i = this.embers.length - 1; i >= 0; i--) {
            const e = this.embers[i];
            e.wobble += 0.06;
            e.x += e.vx + Math.sin(e.wobble) * 0.35;
            e.y += e.vy;
            if (--e.life <= 0) this.embers.splice(i, 1);
        }
    }

    draw(ctx, arena) {
        if (!this.embers.length) return;
        ctx.save();
        ctx.shadowBlur = 6;
        ctx.shadowColor = '#ff4400';
        this.embers.forEach(e => {
            const alpha = Math.min(1, e.life / 25) * (e.life / e.maxLife) * 0.9;
            ctx.globalAlpha = alpha;
            ctx.fillStyle = e.color;
            ctx.beginPath();
            ctx.arc(e.x, e.y, e.size, 0, Math.PI * 2);
            ctx.fill();
        });
        ctx.shadowBlur = 0;
        ctx.globalAlpha = 1;
        ctx.restore();
    }
}

// ─────────────────────────────────────────────
//  WATER BIOME — Ocean / Underwater
// ─────────────────────────────────────────────
class WaterBiome {
    constructor() {
        this.bubbles = [];
        this.t = 0;
    }

    generate() {
        this.bubbles = [];
        this.t = 0;
    }

    drawBackground(ctx, arena) {
        const cam = arena.camera;
        const t = this.t;

        ctx.save();

        // Caustic light bands — animated horizontal shimmer
        for (let i = 0; i < 10; i++) {
            const wave = Math.sin(t * 0.6 + i * 0.95) * 60;
            const bx = cam.x + (i / 9) * cam.width + wave;
            const bw = 18 + Math.sin(t * 0.4 + i * 1.3) * 8;
            const grd = ctx.createLinearGradient(bx - bw, cam.y, bx + bw, cam.y);
            grd.addColorStop(0, 'rgba(80,200,255,0)');
            grd.addColorStop(0.5, 'rgba(80,200,255,0.038)');
            grd.addColorStop(1, 'rgba(80,200,255,0)');
            ctx.fillStyle = grd;
            ctx.fillRect(bx - bw, cam.y, bw * 2, cam.height);
        }

        // Seafloor pebble spots
        const cellSize = 240;
        const sx = Math.floor(cam.x / cellSize) * cellSize;
        const sy = Math.floor(cam.y / cellSize) * cellSize;
        for (let x = sx; x <= cam.x + cam.width + cellSize; x += cellSize) {
            for (let y = sy; y <= cam.y + cam.height + cellSize; y += cellSize) {
                const h = Math.sin(x * 0.0181 + y * 0.0097) * 0.5 + 0.5;
                if (h > 0.58) {
                    const px = x + h * cellSize * 0.65;
                    const py = y + (1 - h) * cellSize * 0.75;
                    const r = 5 + h * 9;
                    ctx.fillStyle = `rgba(20,70,120,0.16)`;
                    ctx.beginPath();
                    ctx.arc(px, py, r, 0, Math.PI * 2);
                    ctx.fill();
                }
            }
        }

        ctx.restore();
    }

    update(arena, player) {
        this.t += 0.02;
        if (this.bubbles.length < 200 && Math.random() < 0.05) {
            const cam = arena.camera;
            const life = 120 + Math.random() * 120;
            this.bubbles.push({
                x: cam.x + Math.random() * cam.width,
                y: cam.y + cam.height * 0.4 + Math.random() * cam.height * 0.6,
                vx: (Math.random() - 0.5) * 0.35,
                vy: -(0.4 + Math.random() * 0.8),
                r: 2 + Math.random() * 4,
                life, maxLife: life,
                wobble: Math.random() * Math.PI * 2
            });
        }
        for (let i = this.bubbles.length - 1; i >= 0; i--) {
            const b = this.bubbles[i];
            b.wobble += 0.04;
            b.x += b.vx + Math.sin(b.wobble) * 0.3;
            b.y += b.vy;
            if (--b.life <= 0) this.bubbles.splice(i, 1);
        }
    }

    draw(ctx, arena) {
        if (!this.bubbles.length) return;
        ctx.save();
        this.bubbles.forEach(b => {
            const alpha = Math.min(1, b.life / 30) * 0.55;
            ctx.globalAlpha = alpha;
            ctx.strokeStyle = 'rgba(140,220,255,0.9)';
            ctx.lineWidth = 1;
            ctx.beginPath();
            ctx.arc(b.x, b.y, b.r, 0, Math.PI * 2);
            ctx.stroke();
            // Small highlight
            ctx.fillStyle = 'rgba(210,245,255,0.35)';
            ctx.beginPath();
            ctx.arc(b.x - b.r * 0.3, b.y - b.r * 0.3, b.r * 0.35, 0, Math.PI * 2);
            ctx.fill();
        });
        ctx.globalAlpha = 1;
        ctx.restore();
    }
}

// ─────────────────────────────────────────────
//  ICE BIOME — Frozen Cave / Tundra
// ─────────────────────────────────────────────
class IceBiome {
    constructor() {
        this.snowflakes = [];
    }

    generate() {
        this.snowflakes = [];
    }

    drawBackground(ctx, arena) {
        const cam = arena.camera;
        const cellSize = 180;
        const sx = Math.floor(cam.x / cellSize) * cellSize;
        const sy = Math.floor(cam.y / cellSize) * cellSize;

        ctx.save();
        ctx.strokeStyle = 'rgba(160,210,240,0.09)';
        ctx.lineWidth = 1;

        for (let x = sx; x <= cam.x + cam.width + cellSize; x += cellSize) {
            for (let y = sy; y <= cam.y + cam.height + cellSize; y += cellSize) {
                const h  = Math.sin(x * 0.0141 + y * 0.0103) * 0.5 + 0.5;
                const h2 = Math.cos(x * 0.0097 - y * 0.0181) * 0.5 + 0.5;

                // Hexagonal ice crystal
                if (h > 0.38) {
                    const cx = x + h * cellSize * 0.5;
                    const cy = y + h2 * cellSize * 0.5;
                    const r  = 14 + h * 22;

                    ctx.beginPath();
                    for (let j = 0; j < 6; j++) {
                        const a = (j / 6) * Math.PI * 2 - Math.PI / 6;
                        const px = cx + Math.cos(a) * r;
                        const py = cy + Math.sin(a) * r;
                        j === 0 ? ctx.moveTo(px, py) : ctx.lineTo(px, py);
                    }
                    ctx.closePath();
                    ctx.stroke();

                    // Radial spokes
                    ctx.globalAlpha = 0.45;
                    for (let j = 0; j < 6; j++) {
                        const a = (j / 6) * Math.PI * 2 - Math.PI / 6;
                        ctx.beginPath();
                        ctx.moveTo(cx, cy);
                        ctx.lineTo(cx + Math.cos(a) * r, cy + Math.sin(a) * r);
                        ctx.stroke();
                    }
                    ctx.globalAlpha = 1;
                }

                // Snow patch
                if (h2 > 0.76) {
                    const px = x + h * cellSize * 0.4 + 20;
                    const py = y + h2 * cellSize * 0.4 + 20;
                    const grd = ctx.createRadialGradient(px, py, 0, px, py, 22 + h * 14);
                    grd.addColorStop(0, 'rgba(220,240,255,0.13)');
                    grd.addColorStop(1, 'rgba(180,215,240,0.0)');
                    ctx.fillStyle = grd;
                    ctx.beginPath();
                    ctx.ellipse(px, py, 32 + h * 18, 16 + h * 10, 0, 0, Math.PI * 2);
                    ctx.fill();
                }
            }
        }
        ctx.restore();
    }

    update(arena, player) {
        const inBlizzard = typeof currentWeather !== 'undefined' && currentWeather?.id === 'BLIZZARD';
        const snowCap  = inBlizzard ? 500 : 200;
        const snowRate = inBlizzard ? 0.40 : 0.12;
        if (this.snowflakes.length < snowCap && Math.random() < snowRate) {
            const cam = arena.camera;
            const life = 200 + Math.random() * 200;
            this.snowflakes.push({
                x: cam.x + Math.random() * cam.width,
                y: cam.y - 10,
                vx: (Math.random() - 0.5) * 0.5,
                vy: 0.4 + Math.random() * 0.8,
                r: 1 + Math.random() * 2.5,
                life, maxLife: life,
                wobble: Math.random() * Math.PI * 2
            });
        }
        for (let i = this.snowflakes.length - 1; i >= 0; i--) {
            const s = this.snowflakes[i];
            s.wobble += 0.04;
            s.x += s.vx + Math.sin(s.wobble) * 0.4;
            s.y += s.vy;
            if (--s.life <= 0) this.snowflakes.splice(i, 1);
        }
    }

    draw(ctx, arena) {
        if (!this.snowflakes.length) return;
        ctx.save();
        ctx.fillStyle = '#ddeeff';
        this.snowflakes.forEach(s => {
            ctx.globalAlpha = Math.min(1, s.life / 40) * 0.75;
            ctx.beginPath();
            ctx.arc(s.x, s.y, s.r, 0, Math.PI * 2);
            ctx.fill();
        });
        ctx.globalAlpha = 1;
        ctx.restore();
    }
}

// ─────────────────────────────────────────────
//  PLANT BIOME — Jungle / Forest
// ─────────────────────────────────────────────
class PlantBiome {
    constructor() {
        this.spores = [];
    }

    generate() {
        this.spores = [];
    }

    drawBackground(ctx, arena) {
        const cam = arena.camera;
        const cellSize = 320;
        const sx = Math.floor(cam.x / cellSize) * cellSize;
        const sy = Math.floor(cam.y / cellSize) * cellSize;

        ctx.save();
        for (let x = sx; x <= cam.x + cam.width + cellSize; x += cellSize) {
            for (let y = sy; y <= cam.y + cam.height + cellSize; y += cellSize) {
                const h  = Math.sin(x * 0.0113 + y * 0.0079) * 0.5 + 0.5;
                const h2 = Math.cos(x * 0.0089 - y * 0.0133) * 0.5 + 0.5;

                // Moss / lichen patch
                if (h > 0.42) {
                    const px = x + h2 * cellSize * 0.6;
                    const py = y + h  * cellSize * 0.65;
                    const grd = ctx.createRadialGradient(px, py, 0, px, py, 28 + h * 28);
                    grd.addColorStop(0, 'rgba(30,140,50,0.20)');
                    grd.addColorStop(0.6, 'rgba(20,100,30,0.10)');
                    grd.addColorStop(1, 'rgba(10,60,15,0.0)');
                    ctx.fillStyle = grd;
                    ctx.beginPath();
                    ctx.ellipse(px, py, 42 + h * 28, 28 + h2 * 18, h * 2, 0, Math.PI * 2);
                    ctx.fill();
                }

                // Root / vine line
                if (h2 > 0.60) {
                    const rx = x + h * cellSize * 0.3;
                    const ry = y + h2 * cellSize * 0.35;
                    ctx.strokeStyle = 'rgba(18,85,32,0.16)';
                    ctx.lineWidth = 2 + h * 2;
                    ctx.lineCap = 'round';
                    ctx.beginPath();
                    ctx.moveTo(rx, ry);
                    ctx.bezierCurveTo(
                        rx + 30 * h2, ry - 22 * h,
                        rx + 65 * h,  ry + 38 * h2,
                        rx + 95 * h2, ry + 18 * h
                    );
                    ctx.stroke();
                    // Branch
                    ctx.beginPath();
                    ctx.moveTo(rx + 38 * h2, ry + 8 * h);
                    ctx.lineTo(rx + 52 * h, ry - 22 * h2);
                    ctx.stroke();
                }

                // Bioluminescent glow spot
                if (h > 0.78 && h2 > 0.66) {
                    const bx = x + h * cellSize * 0.5;
                    const by = y + h2 * cellSize * 0.5;
                    const grd2 = ctx.createRadialGradient(bx, by, 0, bx, by, 12 + h * 8);
                    grd2.addColorStop(0, 'rgba(100,255,120,0.14)');
                    grd2.addColorStop(1, 'rgba(50,200,70,0.0)');
                    ctx.fillStyle = grd2;
                    ctx.beginPath();
                    ctx.arc(bx, by, 12 + h * 8, 0, Math.PI * 2);
                    ctx.fill();
                }
            }
        }
        ctx.restore();
    }

    update(arena, player) {
        if (this.spores.length < 200 && Math.random() < 0.06) {
            const cam = arena.camera;
            const life = 180 + Math.random() * 180;
            this.spores.push({
                x: cam.x + Math.random() * cam.width,
                y: cam.y + Math.random() * cam.height * 0.85,
                vx: (Math.random() - 0.5) * 0.45,
                vy: -(0.2 + Math.random() * 0.45),
                r: 1.5 + Math.random() * 2,
                life, maxLife: life,
                wobble: Math.random() * Math.PI * 2,
                isLeaf: Math.random() < 0.28
            });
        }
        for (let i = this.spores.length - 1; i >= 0; i--) {
            const s = this.spores[i];
            s.wobble += 0.03;
            s.x += s.vx + Math.sin(s.wobble) * 0.5;
            s.y += s.vy;
            if (--s.life <= 0) this.spores.splice(i, 1);
        }
    }

    draw(ctx, arena) {
        if (!this.spores.length) return;
        ctx.save();
        this.spores.forEach(s => {
            const alpha = Math.min(1, s.life / 40) * 0.72;
            ctx.globalAlpha = alpha;
            if (s.isLeaf) {
                ctx.fillStyle = '#55cc44';
                ctx.save();
                ctx.translate(s.x, s.y);
                ctx.rotate(s.wobble);
                ctx.beginPath();
                ctx.ellipse(0, 0, s.r * 2.2, s.r, 0, 0, Math.PI * 2);
                ctx.fill();
                ctx.restore();
            } else {
                ctx.shadowBlur = 4;
                ctx.shadowColor = '#44ff44';
                ctx.fillStyle = 'rgba(160,255,110,0.90)';
                ctx.beginPath();
                ctx.arc(s.x, s.y, s.r, 0, Math.PI * 2);
                ctx.fill();
                ctx.shadowBlur = 0;
            }
        });
        ctx.globalAlpha = 1;
        ctx.restore();
    }
}

// ─────────────────────────────────────────────
//  METAL BIOME — Industrial / Factory
// ─────────────────────────────────────────────
class MetalBiome {
    constructor() {
        this.particles = [];
    }

    generate() {
        this.particles = [];
    }

    drawBackground(ctx, arena) {
        const cam  = arena.camera;
        const ps   = 200; // plate size
        const sx   = Math.floor(cam.x / ps) * ps;
        const sy   = Math.floor(cam.y / ps) * ps;

        ctx.save();

        for (let x = sx; x <= cam.x + cam.width + ps; x += ps) {
            for (let y = sy; y <= cam.y + cam.height + ps; y += ps) {
                const h = Math.sin(x * 0.0201 + y * 0.0137) * 0.5 + 0.5;

                // Plate border
                ctx.strokeStyle = 'rgba(100,112,124,0.16)';
                ctx.lineWidth = 2;
                ctx.strokeRect(x + 5, y + 5, ps - 10, ps - 10);

                // Inset shadow edges (depth)
                ctx.fillStyle = 'rgba(0,0,0,0.05)';
                ctx.fillRect(x + 5, y + 5, ps - 10, 4);
                ctx.fillRect(x + 5, y + 5, 4, ps - 10);

                // Rivets at corners
                [[x+15, y+15],[x+ps-15, y+15],[x+15, y+ps-15],[x+ps-15, y+ps-15]].forEach(([rx, ry]) => {
                    ctx.fillStyle = 'rgba(70,82,94,0.28)';
                    ctx.beginPath();
                    ctx.arc(rx, ry, 4, 0, Math.PI * 2);
                    ctx.fill();
                    ctx.fillStyle = 'rgba(160,172,184,0.18)';
                    ctx.beginPath();
                    ctx.arc(rx - 1, ry - 1, 2, 0, Math.PI * 2);
                    ctx.fill();
                });

                // Grating / vent on select plates
                if (h > 0.70) {
                    ctx.strokeStyle = 'rgba(55,66,77,0.20)';
                    ctx.lineWidth = 1;
                    const vx = x + 30, vy = y + 30, vw = ps - 60, vh = ps - 60;
                    for (let gi = 0; gi <= 4; gi++) {
                        const gy = vy + (gi / 4) * vh;
                        ctx.beginPath();
                        ctx.moveTo(vx, gy);
                        ctx.lineTo(vx + vw, gy);
                        ctx.stroke();
                    }
                }
            }
        }

        // Hazard stripes along arena edges
        const aw = arena.width, ah = arena.height;
        const bw = 55, sw = 36;
        ctx.globalAlpha = 0.09;
        ctx.fillStyle = '#ffcc00';
        for (let i = -2; i < (aw + bw) / (sw * 2) + 2; i++) {
            const ox = i * sw * 2;
            // Top strip
            ctx.save();
            ctx.beginPath(); ctx.rect(0, 0, aw, bw); ctx.clip();
            ctx.beginPath();
            ctx.moveTo(ox, 0); ctx.lineTo(ox + sw, 0);
            ctx.lineTo(ox + sw + bw, bw); ctx.lineTo(ox + bw, bw);
            ctx.closePath(); ctx.fill();
            ctx.restore();
            // Bottom strip
            ctx.save();
            ctx.beginPath(); ctx.rect(0, ah - bw, aw, bw); ctx.clip();
            ctx.beginPath();
            ctx.moveTo(ox, ah - bw); ctx.lineTo(ox + sw, ah - bw);
            ctx.lineTo(ox + sw + bw, ah); ctx.lineTo(ox + bw, ah);
            ctx.closePath(); ctx.fill();
            ctx.restore();
        }
        ctx.globalAlpha = 1;
        ctx.restore();
    }

    update(arena, player) {
        if (this.particles.length < 200 && Math.random() < 0.09) {
            const cam = arena.camera;
            const isSteam = Math.random() < 0.32;
            const life = isSteam ? 70 + Math.random() * 70 : 12 + Math.random() * 18;
            this.particles.push({
                x: cam.x + Math.random() * cam.width,
                y: cam.y + cam.height * 0.3 + Math.random() * cam.height * 0.7,
                vx: (Math.random() - 0.5) * (isSteam ? 0.7 : 3.2),
                vy: isSteam ? -(0.5 + Math.random() * 1.0) : (Math.random() - 0.5) * 3.2,
                r: isSteam ? 4 + Math.random() * 5 : 1 + Math.random() * 1.5,
                life, maxLife: life, isSteam
            });
        }
        for (let i = this.particles.length - 1; i >= 0; i--) {
            const p = this.particles[i];
            p.x += p.vx;
            p.y += p.vy;
            if (p.isSteam) p.r += 0.14;
            if (--p.life <= 0) this.particles.splice(i, 1);
        }
    }

    draw(ctx, arena) {
        if (!this.particles.length) return;
        ctx.save();
        this.particles.forEach(p => {
            const t = p.life / p.maxLife;
            if (p.isSteam) {
                ctx.globalAlpha = t * 0.22;
                ctx.fillStyle = 'rgba(180,190,200,0.85)';
                ctx.beginPath();
                ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
                ctx.fill();
            } else {
                ctx.globalAlpha = t * 0.92;
                ctx.shadowBlur = 4;
                ctx.shadowColor = '#ffcc00';
                ctx.fillStyle = t > 0.5 ? '#ffeeaa' : '#ffffff';
                ctx.beginPath();
                ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
                ctx.fill();
                ctx.shadowBlur = 0;
            }
        });
        ctx.globalAlpha = 1;
        ctx.restore();
    }
}

// ─────────────────────────────────────────────
//  BLACK BIOME — Shadow Realm
// ─────────────────────────────────────────────
class BlackBiome {
    constructor() {
        this.wisps = [];      // Drifting shadow smoke puffs (drawn over entities)
        this._t = 0;
    }

    generate() {
        this.wisps = [];
        this._t = 0;
    }

    drawBackground(ctx, arena) {
        const cam = arena.camera;
        const t   = this._t;

        ctx.save();

        // ── LAYER 1: OPPRESSIVE DARK BASE ────────────────────────────────────
        ctx.fillStyle = 'rgba(2, 0, 8, 0.62)';
        ctx.fillRect(cam.x, cam.y, cam.width, cam.height);

        // ── LAYER 2: SLOW DRIFTING MIST BANDS ────────────────────────────────
        // Seven dark indigo/violet fog bands that drift horizontally.
        for (let i = 0; i < 7; i++) {
            const speed  = 0.12 + i * 0.04;
            const offset = Math.sin(t * speed + i * 1.7) * cam.width * 0.18;
            const bandY  = cam.y + ((i + 0.5) / 7) * cam.height;
            const bandH  = 40 + i * 8;
            const alpha  = 0.04 + Math.sin(t * 0.3 + i * 2.3) * 0.02;

            const grd = ctx.createLinearGradient(cam.x, bandY - bandH, cam.x, bandY + bandH);
            grd.addColorStop(0,   'rgba(30, 0, 55, 0)');
            grd.addColorStop(0.5, `rgba(30, 0, 55, ${alpha})`);
            grd.addColorStop(1,   'rgba(30, 0, 55, 0)');
            ctx.fillStyle = grd;
            ctx.fillRect(cam.x + offset, bandY - bandH, cam.width, bandH * 2);
        }

        // ── LAYER 3: PROCEDURAL VOID RIFTS & SHADOW POOLS ────────────────────
        const cellSize = 260;
        const sx = Math.floor(cam.x / cellSize) * cellSize;
        const sy = Math.floor(cam.y / cellSize) * cellSize;
        const ex = sx + cam.width  + cellSize;
        const ey = sy + cam.height + cellSize;

        for (let cx2 = sx; cx2 <= ex; cx2 += cellSize) {
            for (let cy2 = sy; cy2 <= ey; cy2 += cellSize) {
                const h  = Math.sin(cx2 * 0.0113 + cy2 * 0.0089) * 0.5 + 0.5;
                const h2 = Math.cos(cx2 * 0.0079 - cy2 * 0.0127) * 0.5 + 0.5;
                const h3 = Math.sin(cx2 * 0.0193 + cy2 * 0.0151) * 0.5 + 0.5;

                // VOID RIFT — a dark radial void that slowly breathes
                if (h > 0.52) {
                    const rx    = cx2 + h  * cellSize * 0.65;
                    const ry    = cy2 + h2 * cellSize * 0.70;
                    const pulse = 0.80 + 0.20 * Math.sin(t * 0.9 + h * 6.2);
                    const r     = (18 + h * 32) * pulse;

                    const voidGrd = ctx.createRadialGradient(rx, ry, 0, rx, ry, r);
                    voidGrd.addColorStop(0,    `rgba(0, 0, 0, ${0.45 * pulse})`);
                    voidGrd.addColorStop(0.55,  `rgba(15, 0, 35, ${0.22 * pulse})`);
                    voidGrd.addColorStop(0.80,  `rgba(40, 0, 80, ${0.10 * pulse})`);
                    voidGrd.addColorStop(1,    'rgba(0, 0, 0, 0)');
                    ctx.fillStyle = voidGrd;
                    ctx.beginPath();
                    ctx.arc(rx, ry, r, 0, Math.PI * 2);
                    ctx.fill();

                    // Pulsing purple ring edge on the void
                    const ringAlpha = 0.06 + Math.sin(t * 1.1 + h2 * 4) * 0.04;
                    ctx.strokeStyle = `rgba(100, 0, 180, ${ringAlpha})`;
                    ctx.lineWidth   = 1.5;
                    ctx.beginPath();
                    ctx.arc(rx, ry, r * 0.88, 0, Math.PI * 2);
                    ctx.stroke();
                }

                // SHADOW TENDRIL — sinuous animated curve from rift to nothing
                if (h2 > 0.65 && h3 > 0.45) {
                    const tx0  = cx2 + h2 * cellSize * 0.3;
                    const ty0  = cy2 + h  * cellSize * 0.35;
                    const curl = Math.sin(t * 0.7 + h * 5.1) * 28;
                    const len  = 55 + h * 60;

                    ctx.strokeStyle = `rgba(60, 0, 100, ${0.10 + h2 * 0.06})`;
                    ctx.lineWidth   = 1.5 + h * 1;
                    ctx.lineCap     = 'round';
                    ctx.beginPath();
                    ctx.moveTo(tx0, ty0);
                    ctx.bezierCurveTo(
                        tx0 + curl,       ty0 - len * 0.4,
                        tx0 - curl * 0.5, ty0 - len * 0.75,
                        tx0 + len * 0.3,  ty0 - len
                    );
                    ctx.stroke();

                    // A delicate branch off the tendril
                    ctx.strokeStyle = `rgba(80, 0, 140, ${0.07 + h * 0.04})`;
                    ctx.lineWidth   = 0.8;
                    ctx.beginPath();
                    ctx.moveTo(tx0 + curl * 0.3, ty0 - len * 0.5);
                    ctx.lineTo(tx0 + curl * 0.3 + len * 0.25 * h2, ty0 - len * 0.5 - len * 0.3 * h);
                    ctx.stroke();
                }

                // FAINT RUNE MARKS at grid intersection — thin glowing ancient glyphs
                if (h > 0.82 && h2 > 0.78) {
                    const ux    = cx2;
                    const uy    = cy2;
                    const glow  = 0.06 + Math.sin(t * 0.6 + h * 3.3) * 0.03;
                    const size  = 10 + h * 8;

                    ctx.strokeStyle = `rgba(160, 60, 255, ${glow})`;
                    ctx.lineWidth   = 1;

                    // Cross with inward-pointing arrow tips — a rune shape
                    ctx.beginPath();
                    ctx.moveTo(ux - size, uy);       ctx.lineTo(ux + size, uy);        // horizontal
                    ctx.moveTo(ux,        uy - size); ctx.lineTo(ux,        uy + size); // vertical
                    ctx.moveTo(ux - size * 0.55, uy - size * 0.55);
                    ctx.lineTo(ux + size * 0.55, uy + size * 0.55);                   // diagonal
                    ctx.stroke();

                    // Small central dot glow
                    const runeGrd = ctx.createRadialGradient(ux, uy, 0, ux, uy, size * 0.6);
                    runeGrd.addColorStop(0, `rgba(130, 0, 255, ${glow * 0.9})`);
                    runeGrd.addColorStop(1, 'rgba(0, 0, 0, 0)');
                    ctx.fillStyle = runeGrd;
                    ctx.beginPath();
                    ctx.arc(ux, uy, size * 0.6, 0, Math.PI * 2);
                    ctx.fill();
                }
            }
        }

        // ── LAYER 4: SLOW TWIN SHADOW SPIRALS ────────────────────────────────
        // Two enormous slowly-rotating spirals anchored to viewport corners.
        // Near-invisible but give the space a sense of slow, inexorable rotation.
        const spirals = [
            { tx: 0.15, ty: 0.20, scale: 200, dir:  1, speed: 0.06 },
            { tx: 0.85, ty: 0.80, scale: 160, dir: -1, speed: 0.05 },
        ];
        spirals.forEach(s => {
            const spx   = cam.x + cam.width  * s.tx;
            const spy   = cam.y + cam.height * s.ty;
            const rot   = t * s.speed * s.dir;
            const alpha = 0.025;

            ctx.strokeStyle = `rgba(80, 0, 160, ${alpha})`;
            ctx.lineWidth   = 1;
            ctx.beginPath();
            const steps = 180;
            for (let i = 0; i <= steps; i++) {
                const angle = (i / steps) * Math.PI * 6 + rot;
                const r     = (i / steps) * s.scale;
                const px    = spx + Math.cos(angle) * r;
                const py    = spy + Math.sin(angle) * r;
                if (i === 0) ctx.moveTo(px, py);
                else         ctx.lineTo(px, py);
            }
            ctx.stroke();
        });

        // ── LAYER 5: EDGE VOID VIGNETTE ──────────────────────────────────────
        const vigGrad = ctx.createRadialGradient(
            cam.x + cam.width / 2, cam.y + cam.height / 2, cam.height * 0.25,
            cam.x + cam.width / 2, cam.y + cam.height / 2, cam.height * 0.80
        );
        vigGrad.addColorStop(0, 'rgba(0, 0, 0, 0)');
        vigGrad.addColorStop(1, 'rgba(0, 0, 0, 0.45)');
        ctx.fillStyle = vigGrad;
        ctx.fillRect(cam.x, cam.y, cam.width, cam.height);

        ctx.restore();
    }

    update(arena, player) {
        this._t += 0.016;

        // Spawn shadow wisps — slow dark smoke puffs
        if (this.wisps.length < 120 && Math.random() < 0.07) {
            const cam  = arena.camera;
            const life = 140 + Math.random() * 160;
            const isBig = Math.random() < 0.25;
            this.wisps.push({
                x:       cam.x + Math.random() * cam.width,
                y:       cam.y + cam.height * 0.3 + Math.random() * cam.height * 0.7,
                vx:      (Math.random() - 0.5) * 0.3,
                vy:      -(0.15 + Math.random() * 0.35),
                r:       isBig ? 12 + Math.random() * 18 : 4 + Math.random() * 8,
                life,
                maxLife: life,
                wobble:  Math.random() * Math.PI * 2,
                isBig,
                // Dark purple or near-black
                purple: Math.random() < 0.45,
            });
        }

        for (let i = this.wisps.length - 1; i >= 0; i--) {
            const w = this.wisps[i];
            w.wobble += 0.025;
            w.x      += w.vx + Math.sin(w.wobble) * 0.25;
            w.y      += w.vy;
            if (w.isBig) w.r += 0.06; // expand as it rises
            if (--w.life <= 0) this.wisps.splice(i, 1);
        }
    }

    // Called after all entities — screen-space shadow overlay
    draw(ctx, arena) {
        const cam = arena.camera;
        const t   = this._t;

        ctx.save();

        // Shadow wisps drawn on top of entities
        this.wisps.forEach(w => {
            const progress = 1 - w.life / w.maxLife;
            const alpha    = Math.sin(progress * Math.PI) * (w.isBig ? 0.14 : 0.22);
            if (alpha < 0.01) return;

            ctx.globalAlpha = alpha;
            const color = w.purple ? '60, 0, 120' : '10, 0, 25';
            ctx.shadowBlur  = w.isBig ? 14 : 6;
            ctx.shadowColor = w.purple ? 'rgba(80, 0, 160, 0.5)' : 'rgba(0,0,0,0.8)';
            ctx.fillStyle   = `rgba(${color}, 0.85)`;
            ctx.beginPath();
            ctx.arc(w.x, w.y, w.r, 0, Math.PI * 2);
            ctx.fill();
        });
        ctx.shadowBlur  = 0;
        ctx.globalAlpha = 1;

        // Slow-breathing dark purple screen wash — the realm pressing in
        const breathe = 0.5 + Math.sin(t * 0.4) * 0.5; // 0→1 slow oscillation
        const washAlpha = 0.018 + breathe * 0.022;
        ctx.fillStyle = `rgba(20, 0, 45, ${washAlpha})`;
        ctx.fillRect(cam.x, cam.y, cam.width, cam.height);

        ctx.restore();
    }
}

// ─────────────────────────────────────────────
//  Register
// ─────────────────────────────────────────────
window.BIOME_LOGIC['fire']  = new FireBiome();
window.BIOME_LOGIC['water'] = new WaterBiome();
window.BIOME_LOGIC['ice']   = new IceBiome();
window.BIOME_LOGIC['plant'] = new PlantBiome();
window.BIOME_LOGIC['metal'] = new MetalBiome();
window.BIOME_LOGIC['black'] = new BlackBiome();
