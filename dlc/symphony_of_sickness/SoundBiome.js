class SoundBiome {
    constructor() {
        this.name = "Sound";
        this.color = "#4fc3f7";
        this.beatRings = [];    // Expanding rings spawned on each beat
        this.beatPhase = 0;     // 1.0 on beat, decays smoothly to 0
        this._prevOnBeat = false;
    }

    generate(arena) {
        // Sound biome has no fixed obstacle layout — the resonance field is purely dynamic.
        // Add a few open storm zones for visual atmosphere.
        const cx = arena.width / 2;
        const cy = arena.height / 2;
    }

    update(arena, player, enemies) {
        const onBeat = !!(window.SYMPHONY_STATE && window.SYMPHONY_STATE.onBeat);
        const cam = arena.camera;

        // Detect rising edge of beat
        if (onBeat && !this._prevOnBeat) {
            this.beatPhase = 1.0;

            // Spawn 4-6 expanding rings scattered across the visible field
            const count = 4 + Math.floor(Math.random() * 3);
            for (let i = 0; i < count; i++) {
                const life = 55 + Math.floor(Math.random() * 30);
                const isMagenta = Math.random() < 0.35;
                this.beatRings.push({
                    x: cam.x + cam.width * (0.1 + Math.random() * 0.8),
                    y: cam.y + cam.height * (0.1 + Math.random() * 0.8),
                    r: 5 + Math.random() * 20,
                    maxR: 180 + Math.random() * 260,
                    life: life,
                    maxLife: life,
                    color: isMagenta ? '#e040fb' : '#00e5ff',
                    width: 1.5 + Math.random() * 2,
                });
            }
        }
        this._prevOnBeat = onBeat;

        // Smooth beat phase decay — creates a lingering "thump" feel
        this.beatPhase = Math.max(0, this.beatPhase - 0.04);

        // Advance rings
        for (let i = this.beatRings.length - 1; i >= 0; i--) {
            const ring = this.beatRings[i];
            ring.r += (ring.maxR - ring.r) / ring.life; // Eased expansion
            ring.life--;
            if (ring.life <= 0) this.beatRings.splice(i, 1);
        }
    }

    drawBackground(ctx, arena) {
        const cam = arena.camera;
        const time = Date.now() / 1000;
        const beat = this.beatPhase;           // 0→1, smooth decay after beat
        const pulse = 0.25 + beat * 0.75;       // amplitude scalar for all effects

        const cellSize = 280;
        const sx = Math.floor(cam.x / cellSize) * cellSize;
        const sy = Math.floor(cam.y / cellSize) * cellSize;
        const ex = sx + cam.width + cellSize;
        const ey = sy + cam.height + cellSize;

        ctx.save();

        // ── LAYER 1: DEEP DARK BASE ──────────────────────────────────────────
        ctx.fillStyle = 'rgba(1, 3, 18, 0.58)';
        ctx.fillRect(cam.x, cam.y, cam.width, cam.height);

        // ── LAYER 2: PULSING GRID ────────────────────────────────────────────
        const gridAlpha = 0.05 + beat * 0.14;
        ctx.strokeStyle = `rgba(0, 180, 255, ${gridAlpha})`;
        ctx.lineWidth = 0.8 + beat * 0.6;
        ctx.beginPath();
        for (let x = sx; x <= ex; x += cellSize) {
            ctx.moveTo(x, sy); ctx.lineTo(x, ey);
        }
        for (let y = sy; y <= ey; y += cellSize) {
            ctx.moveTo(sx, y); ctx.lineTo(ex, y);
        }
        ctx.stroke();

        // ── LAYER 3: SINUSOIDAL WAVEFORMS ────────────────────────────────────
        // Five horizontal waves, each with different frequency and phase.
        // All amplitudes scale with beat — mesmerising in sync.
        for (let w = 0; w < 5; w++) {
            const baseY = cam.y + ((w + 0.5) / 5) * cam.height;
            const amp = (6 + w * 5) * pulse;
            const freq = 0.014 + w * 0.004;
            const speed = 1.1 + w * 0.35;
            const hue = 185 + w * 16; // Cyan → electric blue range
            const alpha = 0.1 + beat * 0.1;

            ctx.beginPath();
            ctx.moveTo(cam.x, baseY);
            for (let px = 0; px <= cam.width; px += 4) {
                const wx = cam.x + px;
                const wy = baseY
                    + Math.sin(wx * freq + time * speed) * amp
                    + Math.sin(wx * freq * 2.4 + time * speed * 0.65) * amp * 0.38;
                ctx.lineTo(wx, wy);
            }
            ctx.strokeStyle = `hsla(${hue}, 100%, 68%, ${alpha})`;
            ctx.lineWidth = 0.8 + beat * 1.2;
            ctx.stroke();
        }

        // ── LAYER 4: PROCEDURAL SPEAKER NODES & EQUALISER BARS ──────────────
        for (let x = sx; x <= ex; x += cellSize) {
            for (let y = sy; y <= ey; y += cellSize) {
                const hash = Math.sin(x * 12.9898 + y * 78.233) * 43758.5453;
                const val = hash - Math.floor(hash);
                const hash2 = Math.sin(x * 93.989 + y * 17.233) * 7843.5;
                const val2 = hash2 - Math.floor(hash2);

                const nodeX = x + (val * 1337) % cellSize;
                const nodeY = y + (val * 7331) % cellSize;

                // SPEAKER NODE — glows and emits steady concentric rings
                if (val > 0.62) {
                    const dotR = 2.5 + beat * 4;
                    const glow = 8 + beat * 18;

                    ctx.shadowBlur = glow;
                    ctx.shadowColor = '#00e5ff';
                    ctx.fillStyle = `rgba(0, 229, 255, ${0.3 + beat * 0.45})`;
                    ctx.beginPath();
                    ctx.arc(nodeX, nodeY, dotR, 0, Math.PI * 2);
                    ctx.fill();
                    ctx.shadowBlur = 0;

                    // Three time-offset concentric rings per node (continuous, not beat-gated)
                    for (let ring = 0; ring < 3; ring++) {
                        const phase = ((time * 1.4 + val * 3 + ring / 3) % 1);
                        const ringR = phase * (55 + val * 90);
                        const ringAlpha = (1 - phase) * 0.18 * pulse;
                        if (ringAlpha < 0.01) continue;
                        ctx.strokeStyle = `rgba(0, 229, 255, ${ringAlpha})`;
                        ctx.lineWidth = (1 - phase) * 2;
                        ctx.beginPath();
                        ctx.arc(nodeX, nodeY, ringR, 0, Math.PI * 2);
                        ctx.stroke();
                    }
                }

                // EQUALISER BARS — each cluster syncs its heights to the beat
                if (val2 < 0.38) {
                    const barX = x + (val2 * 9999) % cellSize;
                    const barY = y + (val2 * 8888) % cellSize;
                    const numBars = 6;
                    const barW = 3;
                    const spacing = 6;

                    for (let b = 0; b < numBars; b++) {
                        const bHash = Math.sin(barX * (b + 1) * 4.3 + barY * 0.7) * 10000;
                        const bVal = bHash - Math.floor(bHash);
                        const beatBump = beat > 0.4 ? 1 + (beat - 0.4) * 2.5 : 1;
                        const barH = (8 + Math.abs(Math.sin(time * (1.8 + bVal * 4) + bVal * 9)) * 32) * beatBump;

                        ctx.fillStyle = `rgba(0, 180, 255, ${0.18 + beat * 0.22})`;
                        ctx.fillRect(
                            barX + b * spacing - (numBars * spacing) / 2,
                            barY,
                            barW, -barH
                        );
                    }
                }

                // HYPNOTIC DIAMOND MARKERS at grid intersections — pulse size on beat
                if (val > 0.85 && val2 > 0.85) {
                    const dSize = 4 + beat * 7;
                    ctx.strokeStyle = `rgba(224, 64, 251, ${0.12 + beat * 0.2})`;
                    ctx.lineWidth = 1;
                    ctx.beginPath();
                    ctx.moveTo(x, y - dSize);
                    ctx.lineTo(x + dSize, y);
                    ctx.lineTo(x, y + dSize);
                    ctx.lineTo(x - dSize, y);
                    ctx.closePath();
                    ctx.stroke();
                }
            }
        }

        // ── LAYER 5: EXPANDING BEAT RINGS ────────────────────────────────────
        this.beatRings.forEach(ring => {
            const progress = 1 - ring.life / ring.maxLife; // 0→1 as ring expands
            const alpha = (1 - progress) * 0.55;
            if (alpha < 0.01) return;

            ctx.shadowBlur = 12 + (1 - progress) * 10;
            ctx.shadowColor = ring.color;
            ctx.strokeStyle = ring.color;
            ctx.globalAlpha = alpha;
            ctx.lineWidth = ring.width * (1 - progress * 0.6);
            ctx.beginPath();
            ctx.arc(ring.x, ring.y, ring.r, 0, Math.PI * 2);
            ctx.stroke();
            ctx.globalAlpha = 1;
            ctx.shadowBlur = 0;
        });

        // ── LAYER 6: SLOW ROTATING HYPNOTIC SPIRALS ─────────────────────────
        // Two subtle spirals anchored to viewport, continuously rotating.
        // Their opacity surges on beat — like the sound is winding up.
        const spirals = [
            { tx: 0.22, ty: 0.38, scale: 140, dir: 1 },
            { tx: 0.78, ty: 0.62, scale: 110, dir: -1 },
        ];
        spirals.forEach(s => {
            const cx = cam.x + cam.width * s.tx;
            const cy = cam.y + cam.height * s.ty;
            const rot = time * 0.18 * s.dir;
            const sAlpha = 0.035 + beat * 0.055;

            ctx.strokeStyle = `rgba(160, 0, 255, ${sAlpha})`;
            ctx.lineWidth = 1;
            ctx.beginPath();
            const steps = 200;
            for (let i = 0; i <= steps; i++) {
                const angle = (i / steps) * Math.PI * 7 + rot;
                const r = (i / steps) * s.scale;
                const px = cx + Math.cos(angle) * r;
                const py = cy + Math.sin(angle) * r;
                if (i === 0) ctx.moveTo(px, py);
                else ctx.lineTo(px, py);
            }
            ctx.stroke();
        });

        ctx.restore();
    }

    // Called after all entities — screen-space beat flash on top of everything
    draw(ctx, arena) {
        const beat = this.beatPhase;
        if (beat < 0.05) return;

        const cam = arena.camera;
        ctx.save();

        // Sharp white-cyan flash that quickly decays — the "hit" of the beat
        const flashAlpha = Math.pow(beat, 2.5) * 0.09;
        ctx.fillStyle = `rgba(0, 200, 255, ${flashAlpha})`;
        ctx.fillRect(cam.x, cam.y, cam.width, cam.height);

        // Subtle purple fringe on strong beats
        if (beat > 0.6) {
            const fringeAlpha = (beat - 0.6) / 0.4 * 0.04;
            const fringe = ctx.createRadialGradient(
                cam.x + cam.width / 2, cam.y + cam.height / 2, cam.height * 0.1,
                cam.x + cam.width / 2, cam.y + cam.height / 2, cam.height * 0.65
            );
            fringe.addColorStop(0, 'rgba(0, 0, 0, 0)');
            fringe.addColorStop(1, `rgba(160, 0, 255, ${fringeAlpha})`);
            ctx.fillStyle = fringe;
            ctx.fillRect(cam.x, cam.y, cam.width, cam.height);
        }

        ctx.restore();
    }

    drawObstacle(ctx, obs) {
        const { x, y, w, h } = obs;
        const bev = 6;
        const seed = obs.x * 0.0071 + obs.y * 0.0137;
        const r = (i) => { const s = Math.sin(seed + i * 0.391) * 43758.5453; return s - Math.floor(s); };

        // Base: very dark navy
        const grd = ctx.createLinearGradient(x, y, x + w, y + h);
        grd.addColorStop(0,   '#020816');
        grd.addColorStop(0.5, '#010510');
        grd.addColorStop(1,   '#00030a');
        ctx.fillStyle = grd;
        ctx.fillRect(x, y, w, h);

        ctx.save();
        ctx.beginPath(); ctx.rect(x + 1, y + 1, w - 2, h - 2); ctx.clip();

        // Equaliser bars — speaker face
        const numBars = 5 + (r(seed + 1) * 5 | 0);
        const barW = (w * 0.8) / numBars;
        const barBaseY = y + h - bev - 4;
        for (let i = 0; i < numBars; i++) {
            const s = seed + i * 0.61;
            const barH = (h * 0.25) + r(s) * (h * 0.45);
            const barX = x + w * 0.1 + i * barW;
            const hue  = 185 + (r(s + 0.1) * 36 | 0);
            ctx.fillStyle = `hsla(${hue},100%,60%,0.55)`;
            ctx.fillRect(barX, barBaseY - barH, barW * 0.7, barH);
            // Bar highlight
            ctx.fillStyle = `hsla(${hue},100%,80%,0.25)`;
            ctx.fillRect(barX, barBaseY - barH, barW * 0.2, barH);
        }

        // Waveform sine line across mid
        ctx.strokeStyle = 'rgba(0,229,255,0.45)';
        ctx.lineWidth = 1.5;
        ctx.lineCap = 'round';
        const midY = y + h * 0.42;
        ctx.beginPath();
        ctx.moveTo(x + 4, midY);
        for (let px = 4; px < w - 4; px += 3) {
            const wave = Math.sin((px / w) * Math.PI * 4 + seed * 8) * (h * 0.06);
            ctx.lineTo(x + px, midY + wave);
        }
        ctx.stroke();

        // Speaker grille dots (corners)
        const dotPositions = [[0.08, 0.12],[0.92, 0.12],[0.08, 0.88],[0.92, 0.88]];
        dotPositions.forEach(([dx, dy]) => {
            ctx.fillStyle = 'rgba(0,229,255,0.30)';
            ctx.beginPath(); ctx.arc(x + dx * w, y + dy * h, 3, 0, Math.PI * 2); ctx.fill();
        });

        ctx.restore();

        // Bevel: subtle cyan tint
        ctx.fillStyle = 'rgba(0,180,220,0.18)';
        ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x + w, y); ctx.lineTo(x + w - bev, y + bev); ctx.lineTo(x + bev, y + bev); ctx.closePath(); ctx.fill();
        ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x + bev, y + bev); ctx.lineTo(x + bev, y + h - bev); ctx.lineTo(x, y + h); ctx.closePath(); ctx.fill();
        ctx.fillStyle = 'rgba(0,0,0,0.60)';
        ctx.beginPath(); ctx.moveTo(x, y + h); ctx.lineTo(x + w, y + h); ctx.lineTo(x + w - bev, y + h - bev); ctx.lineTo(x + bev, y + h - bev); ctx.closePath(); ctx.fill();
        ctx.beginPath(); ctx.moveTo(x + w, y); ctx.lineTo(x + w, y + h); ctx.lineTo(x + w - bev, y + h - bev); ctx.lineTo(x + w - bev, y + bev); ctx.closePath(); ctx.fill();

        ctx.strokeStyle = '#000308';
        ctx.lineWidth = 2;
        ctx.strokeRect(x, y, w, h);
    }
}

// Register
if (typeof window.BIOME_LOGIC === 'undefined') window.BIOME_LOGIC = {};
window.BIOME_LOGIC['sound'] = new SoundBiome();
window.BIOME_LOGIC['SOUND_PLAINS'] = window.BIOME_LOGIC['sound'];
