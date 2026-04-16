// Temple of Balance Biome Logic
// Associated with Spirit Hero
// Theme: Peaceful, Sacred Geometry, Lanterns, Sanctuaries

class TempleBiome {
    constructor() {
        this.name = "Temple of Balance";
        this.color = "#F0D080";
        this.lanterns = [];
        this.sanctuaries = [];
        this.patternOffset = 0;
    }

    generate(arena) {
        // Called when biome switches to this
        this.lanterns = [];
        this.sanctuaries = [];
        console.log("[TempleBiome] Generated.");
    }

    update(arena, player, enemies) {
        this.patternOffset = (this.patternOffset + 0.2) % 100;

        // 1. Spawn Lanterns (Passive visuals that float up)
        if (Math.random() < 0.02) {
            // Spawn relative to player or camera center
            const cx = (arena && arena.camera) ? arena.camera.x + arena.camera.width / 2 : (player ? player.x : 0);
            const cy = (arena && arena.camera) ? arena.camera.y + arena.camera.height : (player ? player.y : 0);

            this.lanterns.push({
                x: cx + (Math.random() - 0.5) * 800,
                y: cy + 100, // Below screen
                vx: (Math.random() - 0.5) * 0.5,
                vy: -0.5 - Math.random() * 1.0,
                size: 5 + Math.random() * 5,
                life: 600
            });
        }

        // Update Lanterns
        for (let i = this.lanterns.length - 1; i >= 0; i--) {
            let l = this.lanterns[i];
            l.x += l.vx;
            l.y += l.vy;
            l.life--;
            if (l.life <= 0) this.lanterns.splice(i, 1);
        }

        // 2. Sanctuary Zones (Safe Havens)
        // Similar to Madness zones, but they HEAL or provide buffs
        if (window.frame % 600 === 0) { // Rare: Every 10 seconds
            const spawnW = arena.width || 2000;
            const spawnH = arena.height || 2000;
            this.sanctuaries.push({
                x: Math.random() * (spawnW - 200),
                y: Math.random() * (spawnH - 200),
                r: 100,
                life: 600 // 10 seconds
            });
        }

        for (let i = this.sanctuaries.length - 1; i >= 0; i--) {
            let s = this.sanctuaries[i];
            s.life--;

            // Effect: Heal / Peace gain — Spirit hero only (like Fire hero immunity to lava)
            if (typeof player !== 'undefined' && player.type === 'spirit') {
                const dist = Math.hypot(player.x - (s.x + s.r), player.y - (s.y + s.r));
                if (dist < s.r) {
                    if (window.frame % 60 === 0) {
                        if (player.hp < player.maxHp) {
                            player.hp += 5;
                            if (typeof createTextEffect !== 'undefined') createTextEffect(player.x, player.y - 20, "+5 HP", "#00ff00");
                        }
                        // Spirit Hero Synergy
                        if (player.innerPeace !== undefined && player.innerPeace < player.maxInnerPeace) {
                            player.innerPeace += 5;
                        }
                    }
                }
            }

            if (s.life <= 0) this.sanctuaries.splice(i, 1);
        }
    }

    draw(ctx, arena) {
        // Soft Gold/Beige Background
        // Use camera for correct filling
        const cam = arena.camera || { x: 0, y: 0, width: window.canvas.width, height: window.canvas.height };

        // Background is handled by Arena.draw via getHeroTheme('spirit')
        // We only draw overlays here

        // Sacred Geometry / Arabesque Pattern
        ctx.save();
        ctx.strokeStyle = "rgba(240, 208, 128, 0.1)"; // Faint Soft Amber
        const size = 100;
        const off = this.patternOffset;

        const startX = Math.floor(cam.x / size) * size - size;
        const startY = Math.floor(cam.y / size) * size - size;
        const endX = cam.x + cam.width + size;
        const endY = cam.y + cam.height + size;

        for (let x = startX; x < endX; x += size) {
            for (let y = startY; y < endY; y += size) {
                // Determine pattern center
                const cx = x + (y % (size * 2) === 0 ? 0 : size / 2) + Math.sin(off / 20) * 10;
                const cy = y + Math.cos(off / 20) * 10;

                ctx.beginPath();
                ctx.arc(cx, cy, size / 2.5, 0, Math.PI * 2);
                ctx.stroke();

                ctx.beginPath();
                ctx.arc(cx, cy, size / 4, 0, Math.PI * 2);
                ctx.stroke();
            }
        }
        ctx.restore();

        // Draw Sanctuaries
        this.sanctuaries.forEach(s => {
            ctx.save();
            ctx.translate(s.x + s.r, s.y + s.r);

            // Rotating Ring
            ctx.rotate(window.frame * 0.01);

            ctx.beginPath();
            ctx.arc(0, 0, s.r, 0, Math.PI * 2);
            ctx.strokeStyle = `rgba(240, 208, 128, ${0.3 + Math.sin(window.frame * 0.05) * 0.1})`;
            ctx.lineWidth = 5;
            ctx.setLineDash([20, 10]);
            ctx.stroke();

            // Inner Fill
            ctx.fillStyle = "rgba(240, 208, 128, 0.1)";
            ctx.fill();

            // 8-pointed star
            const outerR = s.r * 0.65;
            const innerR = s.r * 0.28;
            const points = 8;
            ctx.beginPath();
            for (let i = 0; i < points * 2; i++) {
                const angle = (i * Math.PI) / points - Math.PI / 2;
                const r = i % 2 === 0 ? outerR : innerR;
                const px = Math.cos(angle) * r;
                const py = Math.sin(angle) * r;
                if (i === 0) ctx.moveTo(px, py);
                else ctx.lineTo(px, py);
            }
            ctx.closePath();
            ctx.strokeStyle = "rgba(240, 208, 128, 0.35)";
            ctx.lineWidth = 2;
            ctx.stroke();
            ctx.fillStyle = "rgba(240, 208, 128, 0.07)";
            ctx.fill();

            ctx.restore();

            // Text label removed as per request
        });

        // Draw Torches (Random placements based on grid logic to seem persistent)
        // We use a pseudo-random check on the grid coordinates
        ctx.save();
        const tSize = 100; // Same as pattern size
        const tOff = this.patternOffset;

        const cStartX = Math.floor(cam.x / tSize) * tSize;
        const cStartY = Math.floor(cam.y / tSize) * tSize;
        const cEndX = cam.x + cam.width;
        const cEndY = cam.y + cam.height;

        for (let x = cStartX - tSize; x < cEndX + tSize; x += tSize) {
            for (let y = cStartY - tSize; y < cEndY + tSize; y += tSize) {
                // Pseudo-random but deterministic placement based on coordinate
                // Simple hash: abs(sin(x * y)) > 0.985 (Reduced density)
                const hash = Math.abs(Math.sin(x * 0.123 + y * 0.456));
                if (hash > 0.985) {
                    // Draw Torch
                    const imgX = x + tSize / 2;
                    const imgY = y + tSize / 2;

                    // Torch Stand
                    ctx.fillStyle = "#8d6e63";
                    ctx.fillRect(imgX - 4, imgY - 10, 8, 20);

                    // Flame
                    const flameH = 10 + Math.sin(window.frame * 0.2 + x) * 3;
                    ctx.fillStyle = (window.frame % 10 < 5) ? "#e74c3c" : "#f1c40f";
                    ctx.beginPath();
                    ctx.moveTo(imgX - 4, imgY - 10);
                    ctx.lineTo(imgX + 4, imgY - 10);
                    ctx.lineTo(imgX, imgY - 10 - flameH);
                    ctx.fill();

                    // Glow
                    ctx.shadowBlur = 15;
                    ctx.shadowColor = "#e67e22";
                    ctx.fillStyle = "rgba(230, 126, 34, 0.2)";
                    ctx.beginPath();
                    ctx.arc(imgX, imgY - 15, 20 + Math.sin(window.frame * 0.1) * 2, 0, Math.PI * 2);
                    ctx.fill();
                    ctx.shadowBlur = 0;
                }

                // Prayer Statues (Removed as per design request)
                /*
                const hash2 = Math.abs(Math.sin(x * 0.789 + y * 0.321));
                if (hash2 > 0.997) { // Much rarer (only top 0.3%)
                    const imgX = x + tSize / 2;
                    const imgY = y + tSize / 2;

                    // Stone Color (Solid Grey)
                    ctx.fillStyle = "#7f8c8d"; // Darker Grey

                    // Base
                    ctx.fillRect(imgX - 6, imgY + 8, 12, 6);

                    // Body
                    ctx.beginPath();
                    ctx.arc(imgX, imgY, 10, Math.PI, 0); // Semicircle top
                    ctx.lineTo(imgX + 10, imgY + 8);
                    ctx.lineTo(imgX - 10, imgY + 8);
                    ctx.fill();

                    // No red bib - pure stone
                }
                */
            }
        }
        ctx.restore();

        // Draw Lanterns (Foreground-ish)
        this.lanterns.forEach(l => {
            ctx.save();
            ctx.shadowBlur = 10;
            ctx.shadowColor = "#ffa500";
            ctx.fillStyle = "#ffcc00";
            ctx.beginPath();
            ctx.arc(l.x, l.y, l.size, 0, Math.PI * 2);
            ctx.fill();
            ctx.restore();
        });
    }

    drawObstacle(ctx, obs) {
        const { x, y, w, h } = obs;
        const bev = 6;
        const seed = obs.x * 0.0071 + obs.y * 0.0137;
        const r = (i) => { const s = Math.sin(seed + i * 0.391) * 43758.5453; return s - Math.floor(s); };

        // Base: warm aged stone with gold undertone
        const grd = ctx.createLinearGradient(x, y, x + w, y + h);
        grd.addColorStop(0,   '#4a3810');
        grd.addColorStop(0.45,'#3a2c0c');
        grd.addColorStop(1,   '#261c06');
        ctx.fillStyle = grd;
        ctx.fillRect(x, y, w, h);

        ctx.save();
        ctx.beginPath(); ctx.rect(x + 1, y + 1, w - 2, h - 2); ctx.clip();

        // Arabesque: concentric circle rings (sacred geometry)
        const numRings = 2 + (r(seed + 1) * 2 | 0);
        for (let i = 0; i < numRings; i++) {
            const s = seed + i * 1.29;
            const cx2 = x + (0.2 + r(s) * 0.6) * w;
            const cy2 = y + (0.2 + r(s + 0.1) * 0.6) * h;
            const cr  = 10 + r(s + 0.2) * Math.min(w, h) * 0.22;
            ctx.strokeStyle = `rgba(${200 + (r(s + 0.3) * 40 | 0)},${150 + (r(s + 0.4) * 40 | 0)},40,${0.28 + r(s + 0.5) * 0.15})`;
            ctx.lineWidth = 0.8;
            ctx.beginPath(); ctx.arc(cx2, cy2, cr, 0, Math.PI * 2); ctx.stroke();
            ctx.beginPath(); ctx.arc(cx2, cy2, cr * 0.65, 0, Math.PI * 2); ctx.stroke();
            // 8-point cross
            for (let j = 0; j < 8; j++) {
                const a = (j / 8) * Math.PI * 2;
                ctx.beginPath();
                ctx.moveTo(cx2 + Math.cos(a) * cr * 0.3, cy2 + Math.sin(a) * cr * 0.3);
                ctx.lineTo(cx2 + Math.cos(a) * cr,       cy2 + Math.sin(a) * cr);
                ctx.stroke();
            }
        }

        // Gold trim bands (horizontal)
        const numBands = 2 + (r(seed + 9) * 2 | 0);
        for (let i = 0; i < numBands; i++) {
            const s = seed + i * 1.77;
            const by = y + (0.2 + i / numBands * 0.6) * h;
            ctx.fillStyle = `rgba(${200 + (r(s) * 40 | 0)},${150 + (r(s + 0.1) * 40 | 0)},30,${0.22 + r(s + 0.2) * 0.12})`;
            ctx.fillRect(x, by, w, 2 + r(s + 0.3) * 2);
        }

        // Flame orb on top
        const fx = x + (0.3 + r(seed + 15) * 0.4) * w;
        ctx.fillStyle = `rgba(255,${140 + (r(seed + 16) * 60 | 0)},0,0.65)`;
        ctx.beginPath(); ctx.arc(fx, y + 6, 5 + r(seed + 17) * 4, 0, Math.PI * 2); ctx.fill();
        ctx.fillStyle = 'rgba(255,220,80,0.40)';
        ctx.beginPath(); ctx.arc(fx - 1, y + 5, 2.5, 0, Math.PI * 2); ctx.fill();

        ctx.restore();

        // Bevel: warm gold tint
        ctx.fillStyle = 'rgba(180,130,20,0.28)';
        ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x + w, y); ctx.lineTo(x + w - bev, y + bev); ctx.lineTo(x + bev, y + bev); ctx.closePath(); ctx.fill();
        ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x + bev, y + bev); ctx.lineTo(x + bev, y + h - bev); ctx.lineTo(x, y + h); ctx.closePath(); ctx.fill();
        ctx.fillStyle = 'rgba(0,0,0,0.50)';
        ctx.beginPath(); ctx.moveTo(x, y + h); ctx.lineTo(x + w, y + h); ctx.lineTo(x + w - bev, y + h - bev); ctx.lineTo(x + bev, y + h - bev); ctx.closePath(); ctx.fill();
        ctx.beginPath(); ctx.moveTo(x + w, y); ctx.lineTo(x + w, y + h); ctx.lineTo(x + w - bev, y + h - bev); ctx.lineTo(x + w - bev, y + bev); ctx.closePath(); ctx.fill();

        ctx.strokeStyle = '#180e02';
        ctx.lineWidth = 2;
        ctx.strokeRect(x, y, w, h);
    }
}

if (typeof window.BIOME_LOGIC === 'undefined') window.BIOME_LOGIC = {};
window.BIOME_LOGIC['spirit'] = new TempleBiome();
