class CloudBiome {
    // Static State
    static windTimer = 0;
    static windDirection = { x: 1, y: 0 };
    static name = "Cloud Kingdom";
    static flashOpacity = 0; // State for flash rendering

    static generate(arena) {
        // Add Cloud Platforms / Zones
        // In Cloud Biome, maybe "Open Sky" (Fall hazard) or "Storm Clouds" (Damage)
        const cx = arena.width / 2;
        const cy = arena.height / 2;

        // Storm Zones
        arena.biomeZones.push(new BiomeZone(cx - 600, cy - 600, 400, 400, 'STORM'));
        arena.biomeZones.push(new BiomeZone(cx + 400, cy + 400, 400, 400, 'STORM'));

        // Obstacles (Cloud Pillars)
        if (typeof Obstacle !== 'undefined') {
            arena.obstacles.push(new Obstacle(cx, cy - 300, 150, 150));
            arena.obstacles.push(new Obstacle(cx - 400, cy + 200, 100, 100));
            arena.obstacles.push(new Obstacle(cx + 400, cy - 200, 100, 100));
        }
    }

    static update(arena, player, enemies) {
        // Wind Mechanic
        this.windTimer++;

        // Initialize Bolt Array if missing
        if (!this.backgroundBolts) this.backgroundBolts = [];

        // Thunder Flash Effect
        if (typeof ctx !== 'undefined') {
            // Random chance for thunder (Increased frequency)
            if (Math.random() < 0.02) { // 2% chance (approx every 0.8s)
                this.flashOpacity = 0.6; // Slightly less blinding
            }

            // Generate Background Bolts
            if (Math.random() < 0.05) {
                this.backgroundBolts.push({
                    x: arena.camera.x + Math.random() * canvas.width,
                    y: arena.camera.y + Math.random() * canvas.height,
                    life: 10,
                    segments: this.generateBoltSegments()
                });
            }

            // Draw Flash (Screen tint)
            if (this.flashOpacity > 0) {
                ctx.save();
                ctx.resetTransform(); // Draw strictly over everything
                ctx.fillStyle = `rgba(255, 255, 255, ${this.flashOpacity * 0.3})`;
                ctx.fillRect(0, 0, canvas.width, canvas.height);
                ctx.restore();

                this.flashOpacity -= 0.05; // Fade out
            }
        }

        if (this.windTimer > 600) {
            const angle = Math.random() * Math.PI * 2;
            this.windDirection.x = Math.cos(angle) * 0.5;
            this.windDirection.y = Math.sin(angle) * 0.5;
            this.windTimer = 0;

            // Visual feedback
            if (Math.random() < 0.5 && typeof particles !== 'undefined') {
                // Wind Gust visual
                for (let i = 0; i < 5; i++) {
                    particles.push({
                        x: player.x - 500 + Math.random() * 1000,
                        y: player.y - 500 + Math.random() * 1000,
                        vx: this.windDirection.x * 5,
                        vy: this.windDirection.y * 5,
                        alpha: 1.0,
                        color: 'rgba(255,255,255,0.2)',
                        size: 20,
                        update: function () {
                            this.x += this.vx;
                            this.y += this.vy;
                            this.alpha -= 0.02; // Fade out
                        },
                        draw: function () {
                            if (typeof ctx === 'undefined') return;
                            ctx.fillStyle = this.color;
                            ctx.globalAlpha = this.alpha;
                            ctx.beginPath();
                            ctx.arc(this.x, this.y, this.size, 0, Math.PI * 2);
                            ctx.fill();
                            ctx.globalAlpha = 1.0;
                        }
                    });
                }
            }
        }

        // Apply Wind Force
        // Lightning hero (and maybe others with heavy armor?) are resistant
        let resistance = 1;
        if (player.type === 'lightning') resistance = 0.5;
        if (player.type === 'metal') resistance = 0.2;
        if (player.type === 'earth') resistance = 0.0; // Too heavy

        const pdx = this.windDirection.x * resistance;
        const pdy = this.windDirection.y * resistance;
        if (!arena.checkCollision(player.x + pdx, player.y + pdy, player.radius)) {
            player.x += pdx;
            player.y += pdy;
        } else {
            if (!arena.checkCollision(player.x + pdx, player.y, player.radius)) player.x += pdx;
            else if (!arena.checkCollision(player.x, player.y + pdy, player.radius)) player.y += pdy;
        }

        // Enemies
        enemies.forEach(e => {
            // Flying enemies might drift more
            let eRes = 1;
            if (e.type && (e.type === 'CLOUD_BAT' || e.type.includes('GHOST'))) eRes = 1.5;
            if (e.type && (e.type.includes('GOLEM') || e.type.includes('TANK'))) eRes = 0.1;

            const edx = this.windDirection.x * eRes;
            const edy = this.windDirection.y * eRes;
            if (!arena.checkCollision(e.x + edx, e.y + edy, e.radius)) {
                e.x += edx;
                e.y += edy;
            } else {
                if (!arena.checkCollision(e.x + edx, e.y, e.radius)) e.x += edx;
                else if (!arena.checkCollision(e.x, e.y + edy, e.radius)) e.y += edy;
            }
        });

        // Handle Zones
        if (arena.biomeZones) {
            arena.biomeZones.forEach(zone => {
                if (player.x > zone.x && player.x < zone.x + zone.w &&
                    player.y > zone.y && player.y < zone.y + zone.h) {

                    if (zone.type === 'STORM') {
                        // Storm Logic
                        if (player.type !== 'lightning' && Math.random() < 0.01) {
                            player.hp -= 1; // Minor chip damage to non-natives
                        }
                    }
                }
            });
        }
    }

    static generateBoltSegments() {
        // Simple vertical-ish jagged line
        let points = [{ x: 0, y: -100 }];
        let tx = 0, ty = -100;
        for (let i = 0; i < 5; i++) {
            tx += (Math.random() - 0.5) * 40;
            ty += 40 + Math.random() * 40;
            points.push({ x: tx, y: ty });
        }
        return points;
    }

    static drawBackground(ctx, arena) {
        const cam = arena.camera;
        const aw = arena.width;
        const ah = arena.height;
        const acx = aw / 2;
        const acy = ah / 2;

        ctx.save();

        // 1. Hexagonal floor tiles
        const hexR = 55;
        const hexW = hexR * Math.sqrt(3);
        const hexRowH = hexR * 1.5;
        const hRowStart = Math.floor((cam.y - hexR * 2) / hexRowH);
        const hRowEnd   = Math.ceil((cam.y + cam.height + hexR * 2) / hexRowH);
        for (let row = hRowStart; row <= hRowEnd; row++) {
            const offX = (row & 1) * (hexW / 2);
            const hColStart = Math.floor((cam.x - hexW - offX) / hexW);
            const hColEnd   = Math.ceil((cam.x + cam.width + hexW - offX) / hexW);
            for (let col = hColStart; col <= hColEnd; col++) {
                const hx = col * hexW + offX;
                const hy = row * hexRowH;
                ctx.beginPath();
                for (let i = 0; i < 6; i++) {
                    const a = (Math.PI / 3) * i - Math.PI / 6;
                    const px = hx + Math.cos(a) * (hexR - 1.5);
                    const py = hy + Math.sin(a) * (hexR - 1.5);
                    if (i === 0) ctx.moveTo(px, py); else ctx.lineTo(px, py);
                }
                ctx.closePath();
                const hv = Math.abs((Math.sin(col * 127.3 + row * 311.7) * 43758.5) % 1) * 0.05;
                ctx.fillStyle = `rgba(12, 12, 26, ${0.32 + hv})`;
                ctx.fill();
                ctx.strokeStyle = "rgba(45, 55, 115, 0.22)";
                ctx.lineWidth = 1;
                ctx.stroke();
            }
        }

        // 2. Competition ring and floor markings
        const ringR = Math.min(aw, ah) * 0.32;
        ctx.strokeStyle = "rgba(110, 150, 255, 0.32)";
        ctx.lineWidth = 5;
        ctx.beginPath(); ctx.arc(acx, acy, ringR, 0, Math.PI * 2); ctx.stroke();

        ctx.strokeStyle = "rgba(110, 150, 255, 0.18)";
        ctx.lineWidth = 2;
        ctx.beginPath(); ctx.arc(acx, acy, ringR * 0.45, 0, Math.PI * 2); ctx.stroke();

        ctx.setLineDash([24, 16]);
        ctx.strokeStyle = "rgba(90, 130, 230, 0.2)";
        ctx.lineWidth = 2;
        ctx.beginPath(); ctx.moveTo(acx - ringR, acy); ctx.lineTo(acx + ringR, acy); ctx.stroke();
        ctx.beginPath(); ctx.moveTo(acx, acy - ringR); ctx.lineTo(acx, acy + ringR); ctx.stroke();
        ctx.setLineDash([]);

        ctx.fillStyle = "rgba(130, 170, 255, 0.28)";
        ctx.beginPath(); ctx.arc(acx, acy, 16, 0, Math.PI * 2); ctx.fill();

        // Center lightning bolt watermark
        ctx.fillStyle = "rgba(160, 200, 255, 0.1)";
        ctx.beginPath();
        ctx.moveTo(acx + 10, acy - 34);
        ctx.lineTo(acx - 5,  acy + 2);  ctx.lineTo(acx + 5,  acy + 2);
        ctx.lineTo(acx - 10, acy + 34);
        ctx.lineTo(acx + 5,  acy - 2);  ctx.lineTo(acx - 5,  acy - 2);
        ctx.closePath(); ctx.fill();

        // 3. Stadium seating tiers at arena edges
        const drawSeating = (x0, y0, w, h, dir) => {
            const tiers = 5;
            for (let t = 0; t < tiers; t++) {
                const darkness = 0.55 + (t / tiers) * 0.3;
                let rx, ry, rw, rh;
                if (dir === 0) {        // top: rows stack downward from y0
                    rh = h / tiers; ry = y0 + (tiers - 1 - t) * rh;
                    const inset = t * w * 0.04; rx = x0 + inset; rw = w - inset * 2;
                } else if (dir === 1) { // bottom: rows stack upward from y0
                    rh = h / tiers; ry = y0 + t * rh;
                    const inset = t * w * 0.04; rx = x0 + inset; rw = w - inset * 2;
                } else if (dir === 2) { // left
                    rw = w / tiers; rx = x0 + (tiers - 1 - t) * rw;
                    const inset = t * h * 0.04; ry = y0 + inset; rh = h - inset * 2;
                } else {                // right
                    rw = w / tiers; rx = x0 + t * rw;
                    const inset = t * h * 0.04; ry = y0 + inset; rh = h - inset * 2;
                }
                ctx.fillStyle = `rgba(4, 4, 16, ${darkness})`;
                ctx.fillRect(rx, ry, rw, rh);
                ctx.strokeStyle = "rgba(22, 22, 50, 0.6)";
                ctx.lineWidth = 1;
                if (dir === 0 || dir === 1) {
                    for (let sl = rx; sl < rx + rw; sl += 16) {
                        ctx.beginPath(); ctx.moveTo(sl, ry); ctx.lineTo(sl, ry + rh); ctx.stroke();
                    }
                } else {
                    for (let sl = ry; sl < ry + rh; sl += 16) {
                        ctx.beginPath(); ctx.moveTo(rx, sl); ctx.lineTo(rx + rw, sl); ctx.stroke();
                    }
                }
            }
        };
        const seatD = 200;
        if (cam.y < seatD)                    drawSeating(0,         0,       aw, seatD, 0);
        if (cam.y + cam.height > ah - seatD)  drawSeating(0,         ah-seatD, aw, seatD, 1);
        if (cam.x < seatD)                    drawSeating(0,         0,       seatD, ah, 2);
        if (cam.x + cam.width > aw - seatD)   drawSeating(aw-seatD,  0,       seatD, ah, 3);

        // 4. Corner floodlight towers and beams
        [[0, 0], [aw, 0], [0, ah], [aw, ah]].forEach(([cx_, cy_]) => {
            if (cx_ + 1500 < cam.x || cx_ - 1500 > cam.x + cam.width) return;
            if (cy_ + 1500 < cam.y || cy_ - 1500 > cam.y + cam.height) return;

            const angleToCenter = Math.atan2(acy - cy_, acx - cx_);
            const beamLen = 1400;
            const grd = ctx.createRadialGradient(cx_, cy_, 0, cx_, cy_, beamLen);
            grd.addColorStop(0,   "rgba(160, 190, 255, 0.13)");
            grd.addColorStop(0.4, "rgba(100, 140, 255, 0.06)");
            grd.addColorStop(1,   "rgba(60,  100, 200, 0)");
            ctx.fillStyle = grd;
            ctx.beginPath();
            ctx.moveTo(cx_, cy_);
            ctx.arc(cx_, cy_, beamLen, angleToCenter - 0.3, angleToCenter + 0.3);
            ctx.closePath();
            ctx.fill();

            // Tower pillar block
            const pw = 36, ph = 36;
            const px = cx_ === 0 ? 0 : cx_ - pw;
            const py = cy_ === 0 ? 0 : cy_ - ph;
            ctx.fillStyle = "rgba(6, 6, 18, 0.92)";
            ctx.fillRect(px, py, pw, ph);
            ctx.strokeStyle = "rgba(60, 80, 180, 0.5)";
            ctx.lineWidth = 2;
            ctx.strokeRect(px, py, pw, ph);
        });

        // 5. Display screens on left/right walls
        [{ x: 55, y: acy - 90 }, { x: aw - 185, y: acy - 90 }].forEach(s => {
            if (s.x + 130 < cam.x || s.x > cam.x + cam.width) return;
            if (s.y + 180 < cam.y || s.y > cam.y + cam.height) return;

            ctx.fillStyle = "rgba(4, 4, 18, 0.92)";
            ctx.fillRect(s.x, s.y, 130, 180);
            ctx.strokeStyle = "rgba(60, 90, 200, 0.65)";
            ctx.lineWidth = 3;
            ctx.strokeRect(s.x, s.y, 130, 180);
            // Outer glow
            ctx.strokeStyle = "rgba(100, 140, 255, 0.2)";
            ctx.lineWidth = 8;
            ctx.strokeRect(s.x + 1, s.y + 1, 128, 178);

            // Lightning bolt on screen
            const bx = s.x + 65, by = s.y + 90;
            ctx.fillStyle = "rgba(120, 170, 255, 0.65)";
            ctx.beginPath();
            ctx.moveTo(bx + 13, by - 38);
            ctx.lineTo(bx - 6,  by + 4);  ctx.lineTo(bx + 6,  by + 4);
            ctx.lineTo(bx - 13, by + 38);
            ctx.lineTo(bx + 6,  by - 4);  ctx.lineTo(bx - 6,  by - 4);
            ctx.closePath(); ctx.fill();

            // Scan lines
            ctx.fillStyle = "rgba(0, 0, 30, 0.35)";
            for (let sl = s.y + 3; sl < s.y + 177; sl += 4) {
                ctx.fillRect(s.x + 3, sl, 124, 2);
            }
        });

        ctx.restore();
    }

    static draw(ctx, arena) {
        // Draw Bolts (Overlay)
        if (this.backgroundBolts) {
            ctx.save();
            ctx.lineWidth = 3;

            for (let i = this.backgroundBolts.length - 1; i >= 0; i--) {
                const b = this.backgroundBolts[i];
                b.life--;

                ctx.strokeStyle = `rgba(200, 200, 255, ${b.life / 10})`;
                ctx.beginPath();
                ctx.moveTo(b.x + b.segments[0].x, b.y + b.segments[0].y);
                for (let j = 1; j < b.segments.length; j++) {
                    ctx.lineTo(b.x + b.segments[j].x, b.y + b.segments[j].y);
                }
                ctx.stroke();

                if (b.life <= 0) this.backgroundBolts.splice(i, 1);
            }
            ctx.restore();
        }
    }

    static drawObstacle(ctx, obs) {
        const { x, y, w, h } = obs;
        const bev = 6;
        const seed = obs.x * 0.0071 + obs.y * 0.0137;
        const r = (i) => { const s = Math.sin(seed + i * 0.391) * 43758.5453; return s - Math.floor(s); };

        // Base: dark storm-steel gradient
        const grd = ctx.createLinearGradient(x, y, x + w, y + h);
        grd.addColorStop(0,   '#1c2a3a');
        grd.addColorStop(0.4, '#141e2a');
        grd.addColorStop(1,   '#0c1420');
        ctx.fillStyle = grd;
        ctx.fillRect(x, y, w, h);

        ctx.save();
        ctx.beginPath(); ctx.rect(x + 1, y + 1, w - 2, h - 2); ctx.clip();

        // Hexagonal tile face pattern (matches floor)
        const hexR = 14;
        const hexW = hexR * Math.sqrt(3);
        const hexH = hexR * 2;
        for (let row = -1; row <= Math.ceil(h / (hexH * 0.75)) + 1; row++) {
            for (let col = -1; col <= Math.ceil(w / hexW) + 1; col++) {
                const hx = x + col * hexW + (row % 2 === 0 ? 0 : hexW * 0.5);
                const hy = y + row * hexH * 0.75;
                const hue = 210 + (r(seed + row * 7 + col * 3) * 20 | 0);
                ctx.strokeStyle = `hsla(${hue},30%,25%,0.55)`;
                ctx.lineWidth = 0.8;
                ctx.beginPath();
                for (let j = 0; j < 6; j++) {
                    const a = (j / 6) * Math.PI * 2 - Math.PI / 6;
                    j === 0 ? ctx.moveTo(hx + Math.cos(a) * hexR, hy + Math.sin(a) * hexR)
                            : ctx.lineTo(hx + Math.cos(a) * hexR, hy + Math.sin(a) * hexR);
                }
                ctx.closePath(); ctx.stroke();
            }
        }

        // Lightning bolt mark on face
        const lx = x + (0.25 + r(seed + 1) * 0.5) * w;
        const ly = y + (0.15 + r(seed + 2) * 0.2) * h;
        const lh = Math.min(h * 0.5, 40) * (0.6 + r(seed + 3) * 0.4);
        ctx.fillStyle = `rgba(180,210,255,${0.25 + r(seed + 4) * 0.15})`;
        ctx.beginPath();
        ctx.moveTo(lx + lh * 0.25, ly);
        ctx.lineTo(lx - lh * 0.10, ly + lh * 0.45);
        ctx.lineTo(lx + lh * 0.08, ly + lh * 0.45);
        ctx.lineTo(lx - lh * 0.25, ly + lh);
        ctx.lineTo(lx + lh * 0.10, ly + lh * 0.55);
        ctx.lineTo(lx - lh * 0.08, ly + lh * 0.55);
        ctx.closePath(); ctx.fill();

        // Electric spark segments
        ctx.lineCap = 'round';
        const numSparks = 2 + (r(seed + 8) * 3 | 0);
        for (let i = 0; i < numSparks; i++) {
            const s = seed + i * 1.47;
            const sx = x + r(s)       * w;
            const sy = y + r(s + 0.1) * h;
            const sl = 6 + r(s + 0.2) * 14;
            const sa = r(s + 0.3) * Math.PI * 2;
            ctx.strokeStyle = `rgba(150,200,255,${0.30 + r(s + 0.4) * 0.30})`;
            ctx.lineWidth = 1;
            ctx.beginPath();
            ctx.moveTo(sx, sy);
            ctx.lineTo(sx + Math.cos(sa) * sl * 0.5 + (r(s + 0.5) - 0.5) * 6, sy + Math.sin(sa) * sl * 0.5);
            ctx.lineTo(sx + Math.cos(sa) * sl,                                  sy + Math.sin(sa) * sl);
            ctx.stroke();
        }

        ctx.restore();

        // Bevel: blue-grey highlight
        ctx.fillStyle = 'rgba(100,150,200,0.20)';
        ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x + w, y); ctx.lineTo(x + w - bev, y + bev); ctx.lineTo(x + bev, y + bev); ctx.closePath(); ctx.fill();
        ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x + bev, y + bev); ctx.lineTo(x + bev, y + h - bev); ctx.lineTo(x, y + h); ctx.closePath(); ctx.fill();
        ctx.fillStyle = 'rgba(0,0,0,0.55)';
        ctx.beginPath(); ctx.moveTo(x, y + h); ctx.lineTo(x + w, y + h); ctx.lineTo(x + w - bev, y + h - bev); ctx.lineTo(x + bev, y + h - bev); ctx.closePath(); ctx.fill();
        ctx.beginPath(); ctx.moveTo(x + w, y); ctx.lineTo(x + w, y + h); ctx.lineTo(x + w - bev, y + h - bev); ctx.lineTo(x + w - bev, y + bev); ctx.closePath(); ctx.fill();

        ctx.strokeStyle = '#080e18';
        ctx.lineWidth = 2;
        ctx.strokeRect(x, y, w, h);
    }
}

window.CloudBiome = CloudBiome;
window.BIOME_LOGIC['lightning'] = CloudBiome; // Register logic
