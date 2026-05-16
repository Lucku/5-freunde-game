// #194 follow-up — explicit BiomeZone/Obstacle/Trap imports (were bare-name lookups via window shim).
import { BiomeZone, Obstacle } from '../../Arena.js';

// #194 — explicit renderer imports (was: window-shim lookup).

// The Mindscape - Psycho's Biome

class MindscapeBiome {
    constructor() {
        this.name = "The Mindscape";
        this.color = "#0a1a18";
        this.gridColor = "#1abc9c";
        this.particles = [];
        this.glitchTimer = 0;
        this.obstacleSeeds = [];

        // Crazier background state
        this.t = 0;
        this.tearBands = [];   // transient horizontal screen tears
        this.inkBlots = [];    // slow-drifting rorschach blobs
        this.eegLines = [];    // horizontal brainwave traces scrolling across arena
        this.mindGlyphs = [];  // drifting abstract psyche symbols (Ψ ? ! ∞ ◊ ∴ ※)
        this.pulsePhase = 0;
    }

    generate(arena) {
        const w = arena.width;
        const h = arena.height;
        const cx = w / 2;
        const cy = h / 2;

        console.log("Generating Mindscape Biome...");

        // Fracture Zone covering most of arena
        arena.biomeZones.push(new BiomeZone(cx - 900, cy - 700, 1800, 1400, 'FRACTURE'));

        // EEG brainwave traces — 5 horizontal jagged sine lines scrolling left,
        // stacked at varied y-positions. Each has independent amp/freq/hue/speed.
        this.eegLines = [];
        const eegCount = 5;
        for (let i = 0; i < eegCount; i++) {
            const yFrac = 0.12 + (i / (eegCount - 1)) * 0.76; // spread between 12% and 88%
            this.eegLines.push({
                y: h * yFrac + (Math.random() - 0.5) * 60,
                amp: 14 + Math.random() * 22,
                freq: 0.008 + Math.random() * 0.012,
                phase: Math.random() * Math.PI * 2,
                speed: 0.6 + Math.random() * 0.8,
                hue: Math.random() < 0.5 ? '#1abc9c' : '#a83080',
                spikeChance: 0.08 + Math.random() * 0.08
            });
        }

        // Drifting mind glyphs — start empty, spawned over time by update()
        this.mindGlyphs = [];

        // 6 slow rorschach inkblots drifting across the arena
        this.inkBlots = [];
        for (let i = 0; i < 6; i++) {
            this.inkBlots.push({
                x: Math.random() * w,
                y: Math.random() * h,
                r: 80 + Math.random() * 140,
                drift: Math.random() * Math.PI * 2,
                speed: 0.15 + Math.random() * 0.25,
                hue: Math.random() < 0.5 ? '#1abc9c' : '#e74c3c',
                spikes: 5 + Math.floor(Math.random() * 4)
            });
        }

        // 12-16 obstacles, asymmetric, avoiding center spawn
        const count = 12 + Math.floor(Math.random() * 5);
        this.obstacleSeeds = [];
        for (let i = 0; i < count; i++) {
            const x = Math.random() * (w - 300) + 150;
            const y = Math.random() * (h - 300) + 150;
            if (Math.hypot(x - cx, y - cy) > 350) {
                const ow = 80 + Math.random() * 120;
                const oh = 80 + Math.random() * 120;
                arena.obstacles.push(new Obstacle(x, y, ow, oh, 'psycho'));
                this.obstacleSeeds.push({ baseX: x, baseY: y, jitterPhase: Math.random() * Math.PI * 2 });
            }
        }
    }

    update(arena, player) {
        this.glitchTimer++;
        this.t++;
        this.pulsePhase += 0.025;

        // Drift inkblots — wraps around arena
        if (this.inkBlots && this.inkBlots.length) {
            const aw = arena.width, ah = arena.height;
            this.inkBlots.forEach(b => {
                b.drift += (Math.random() - 0.5) * 0.05;
                b.x += Math.cos(b.drift) * b.speed;
                b.y += Math.sin(b.drift) * b.speed;
                if (b.x < -b.r) b.x = aw + b.r;
                if (b.x > aw + b.r) b.x = -b.r;
                if (b.y < -b.r) b.y = ah + b.r;
                if (b.y > ah + b.r) b.y = -b.r;
            });
        }

        // Scroll EEG waveform phases — pace doubles during Hysteria
        const hysteriaScroll = !!(player && player.hysteriaActive);
        if (this.eegLines && this.eegLines.length) {
            this.eegLines.forEach(w => {
                w.phase += w.speed * (hysteriaScroll ? 0.06 : 0.025);
                // Occasional amplitude jolt — looks like a thought spike
                if (Math.random() < (hysteriaScroll ? w.spikeChance * 2 : w.spikeChance) * 0.05) {
                    w._jolt = 18 + Math.random() * 14;
                }
                if (w._jolt) w._jolt = Math.max(0, w._jolt - 1);
            });
        }

        // Spawn drifting mind glyphs — rate denser during Hysteria
        const glyphRate = hysteriaScroll ? 0.08 : 0.025;
        if (Math.random() < glyphRate && this.mindGlyphs.length < 40) {
            const GLYPHS = ['?', '!', 'Ψ', '∞', '◊', '∴', '※', '⊗'];
            this.mindGlyphs.push({
                x: Math.random() * arena.width,
                y: arena.height + 20,
                vy: -(0.25 + Math.random() * 0.5),
                vx: (Math.random() - 0.5) * 0.35,
                glyph: GLYPHS[Math.floor(Math.random() * GLYPHS.length)],
                size: 14 + Math.random() * 22,
                hue: Math.random() < 0.55 ? '#1abc9c' : '#a83080',
                life: 360 + Math.random() * 240,
                maxLife: 600,
                rot: (Math.random() - 0.5) * 0.6,
                rotSpeed: (Math.random() - 0.5) * 0.008
            });
        }
        // Update glyphs
        for (let i = this.mindGlyphs.length - 1; i >= 0; i--) {
            const g = this.mindGlyphs[i];
            g.x += g.vx;
            g.y += g.vy;
            g.rot += g.rotSpeed;
            g.life--;
            if (g.life <= 0 || g.y < -40) this.mindGlyphs.splice(i, 1);
        }

        // Random screen-tear band ~every 2-4 seconds (denser during Hysteria)
        const hyst = !!(player && player.hysteriaActive);
        const tearRate = hyst ? 0.06 : 0.012;
        if (Math.random() < tearRate) {
            this.tearBands.push({
                y: (player ? player.y : arena.height / 2) + (Math.random() - 0.5) * 1000,
                h: 6 + Math.random() * 20,
                life: 18 + Math.random() * 20,
                maxLife: 30,
                offset: (Math.random() - 0.5) * 80
            });
        }
        for (let i = this.tearBands.length - 1; i >= 0; i--) {
            const tb = this.tearBands[i];
            tb.life--;
            if (tb.life <= 0) this.tearBands.splice(i, 1);
        }

        // Glitch step: every ~15s nudge obstacles slightly
        if (this.glitchTimer > 900) {
            this.glitchTimer = 0;
            arena.obstacles.forEach(o => {
                if (o.type === 'psycho') {
                    const nx = o.x + (Math.random() - 0.5) * 60;
                    const ny = o.y + (Math.random() - 0.5) * 60;
                    // Only shift if new position not colliding with player
                    if (!player || Math.hypot(nx - player.x, ny - player.y) > 120) {
                        o.x = Math.max(50, Math.min(arena.width - o.w - 50, nx));
                        o.y = Math.max(50, Math.min(arena.height - o.h - 50, ny));
                        o._glitchFlash = 30;
                    }
                }
            });
        }

        // Decay glitch flash
        arena.obstacles.forEach(o => {
            if (o._glitchFlash) o._glitchFlash--;
        });

        // Particle spawn — denser during Hysteria
        const inHysteria = !!(player && player.hysteriaActive);
        const spawnRate = inHysteria ? 0.85 : 0.25;
        if (player && Math.random() < spawnRate) {
            this.particles.push({
                x: player.x + (Math.random() - 0.5) * 1400,
                y: player.y + (Math.random() - 0.5) * 1000,
                vx: (Math.random() - 0.5) * 1.6,
                vy: (Math.random() - 0.5) * 1.6,
                life: 80 + Math.random() * 80,
                size: 1 + Math.random() * 2,
                color: Math.random() < 0.4 ? '#ffffff' : '#1abc9c'
            });
        }

        // Update particles
        for (let i = this.particles.length - 1; i >= 0; i--) {
            const p = this.particles[i];
            p.x += p.vx;
            p.y += p.vy;
            // Erratic drift
            p.vx += (Math.random() - 0.5) * 0.2;
            p.vy += (Math.random() - 0.5) * 0.2;
            p.life--;
            if (p.life <= 0) this.particles.splice(i, 1);
        }
    }

    draw(ctx, arena) {
        const aw = arena.width;
        const ah = arena.height;
        const cx = aw / 2;
        const cy = ah / 2;
        const t = this.t;

        // ── 1. Pulsing radial vignette ──────────────────────────────────────
        ctx.save();
        const pulse = 0.5 + 0.5 * Math.sin(this.pulsePhase);
        const baseAlpha = 0.35 + 0.18 * pulse;
        const bgGrd = ctx.createRadialGradient(cx, cy, 100, cx, cy, Math.max(aw, ah) * 0.7);
        bgGrd.addColorStop(0,   `rgba(8, 18, 16, ${baseAlpha})`);
        bgGrd.addColorStop(0.55,`rgba(20, 6, 14, ${baseAlpha + 0.12})`);
        bgGrd.addColorStop(1,   'rgba(0, 0, 0, 0.85)');
        ctx.fillStyle = bgGrd;
        ctx.fillRect(0, 0, aw, ah);
        ctx.restore();

        // ── 2. EEG brainwave traces — horizontal jagged scrolling waveforms ──
        // Replaces the prior radial mandala (which clashed with the Mirror
        // biome's prismatic-rays-from-center motif). Each trace samples a
        // sine + noise wiggle across the full arena width, with occasional
        // amplitude jolts ("thought spikes") set by update().
        if (this.eegLines && this.eegLines.length) {
            ctx.save();
            ctx.globalCompositeOperation = 'lighter';
            ctx.lineWidth = 1.2;
            const step = 16; // sample spacing in px — coarser = cheaper, still smooth
            this.eegLines.forEach(w => {
                const jolt = w._jolt ? (1 + w._jolt * 0.08) : 1;
                ctx.strokeStyle = w.hue + '55'; // ~33% alpha as hex suffix
                ctx.beginPath();
                let first = true;
                for (let x = 0; x <= aw; x += step) {
                    // Base sine + secondary wiggle + light per-x noise via sin combo
                    const s1 = Math.sin(x * w.freq + w.phase);
                    const s2 = Math.sin(x * w.freq * 2.3 + w.phase * 1.7) * 0.45;
                    const noise = Math.sin(x * 0.07 + w.phase * 3.1) * 0.25;
                    const y = w.y + (s1 + s2 + noise) * w.amp * jolt;
                    if (first) { ctx.moveTo(x, y); first = false; }
                    else ctx.lineTo(x, y);
                }
                ctx.stroke();

                // Faint echo line shifted slightly — gives a chromatic-aberration feel
                ctx.strokeStyle = (w.hue === '#1abc9c' ? '#a83080' : '#1abc9c') + '22';
                ctx.beginPath();
                first = true;
                for (let x = 0; x <= aw; x += step) {
                    const s1 = Math.sin(x * w.freq + w.phase - 0.4);
                    const y = w.y + s1 * w.amp * jolt * 0.7 + 3;
                    if (first) { ctx.moveTo(x, y); first = false; }
                    else ctx.lineTo(x, y);
                }
                ctx.stroke();
            });
            ctx.restore();
        }

        // ── 3. Drifting mind glyphs — abstract symbols floating upward ──────
        // Replaces the prior concentric-rings-from-center pulse.
        if (this.mindGlyphs && this.mindGlyphs.length) {
            ctx.save();
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            this.mindGlyphs.forEach(g => {
                const fade = Math.min(1, g.life / 90) * Math.min(1, (g.maxLife - g.life) / 60);
                ctx.save();
                ctx.translate(g.x, g.y);
                ctx.rotate(g.rot);
                ctx.globalAlpha = 0.28 * fade;
                ctx.font = `bold ${g.size | 0}px serif`;
                ctx.fillStyle = g.hue;
                ctx.fillText(g.glyph, 0, 0);
                // Subtle white inner highlight
                ctx.globalAlpha = 0.12 * fade;
                ctx.fillStyle = '#ffffff';
                ctx.fillText(g.glyph, -0.5, -0.5);
                ctx.restore();
            });
            ctx.restore();
        }

        // ── 4. Rorschach inkblots — symmetric squashed lobes ────────────────
        if (this.inkBlots && this.inkBlots.length) {
            ctx.save();
            this.inkBlots.forEach((b, idx) => {
                ctx.save();
                ctx.translate(b.x, b.y);
                ctx.globalAlpha = 0.22;
                ctx.fillStyle = b.hue;
                ctx.beginPath();
                const wobT = t * 0.015 + idx;
                for (let i = 0; i <= b.spikes; i++) {
                    const ang = (i / b.spikes) * Math.PI * 2;
                    const wob = 0.7 + 0.3 * Math.sin(wobT + ang * 3);
                    const rx = Math.cos(ang) * b.r * wob;
                    const ry = Math.sin(ang) * b.r * wob * 0.7;
                    if (i === 0) ctx.moveTo(rx, ry);
                    else ctx.quadraticCurveTo(rx * 1.1, ry * 1.1, rx, ry);
                }
                ctx.closePath();
                ctx.filter = 'blur(8px)';
                ctx.fill();
                ctx.filter = 'none';
                ctx.restore();
            });
            ctx.restore();
        }

        // ── 5. Horizontal screen-tear bands (per-frame; sliced across arena) ─
        if (this.tearBands && this.tearBands.length) {
            ctx.save();
            this.tearBands.forEach(tb => {
                const fade = tb.life / tb.maxLife;
                ctx.fillStyle = `rgba(26, 188, 156, ${0.18 * fade})`;
                ctx.fillRect(tb.offset, tb.y, aw, tb.h);
                // Echo line
                ctx.fillStyle = `rgba(255, 80, 120, ${0.10 * fade})`;
                ctx.fillRect(tb.offset * 0.6, tb.y + tb.h * 0.5, aw, 1.5);
            });
            ctx.restore();
        }

        // ── 6. Vertical chromatic bleeds — subtle magenta + teal columns ────
        ctx.save();
        ctx.globalAlpha = 0.06 + 0.04 * pulse;
        const stripeSpacing = 140;
        for (let i = 0; i < aw; i += stripeSpacing) {
            const phase = Math.sin(t * 0.006 + i * 0.01);
            const x = i + phase * 20;
            ctx.fillStyle = (i / stripeSpacing) & 1 ? '#1abc9c' : '#a83080';
            ctx.fillRect(x, 0, 2, ah);
        }
        ctx.restore();

        // ── 7. Foreground particles (existing dust) ─────────────────────────
        this.particles.forEach(p => {
            ctx.globalAlpha = Math.min(1, p.life / 60);
            ctx.fillStyle = p.color;
            ctx.beginPath();
            ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
            ctx.fill();
        });
        ctx.globalAlpha = 1;
    }

    drawObstacle(ctx, obs) {
        const { x, y, w, h } = obs;
        const bev = 6;
        const seed = obs.x * 0.0071 + obs.y * 0.0137;
        const r = (i) => { const s = Math.sin(seed + i * 0.391) * 43758.5453; return s - Math.floor(s); };

        // Base — dark teal
        const grd = ctx.createLinearGradient(x, y, x + w, y + h);
        grd.addColorStop(0,   '#0d2b27');
        grd.addColorStop(0.5, '#08201d');
        grd.addColorStop(1,   '#051613');
        ctx.fillStyle = grd;
        ctx.fillRect(x, y, w, h);

        ctx.save();
        ctx.beginPath(); ctx.rect(x + 1, y + 1, w - 2, h - 2); ctx.clip();

        // Diagonal scratch lines
        ctx.strokeStyle = 'rgba(26, 188, 156, 0.18)';
        ctx.lineWidth = 1;
        const numScratches = 4 + (r(seed + 1) * 4 | 0);
        for (let i = 0; i < numScratches; i++) {
            const s = seed + i * 1.13;
            const sx = x + r(s) * w;
            const sy = y + r(s + 0.1) * h;
            const len = 20 + r(s + 0.2) * 60;
            const ang = r(s + 0.3) * Math.PI * 2;
            ctx.beginPath();
            ctx.moveTo(sx, sy);
            ctx.lineTo(sx + Math.cos(ang) * len, sy + Math.sin(ang) * len);
            ctx.stroke();
        }

        // Subtle teal energy spots
        const numSpots = 3 + (r(seed + 7) * 3 | 0);
        for (let i = 0; i < numSpots; i++) {
            const s = seed + i * 0.81;
            const sx = x + r(s) * w;
            const sy = y + r(s + 0.1) * h;
            ctx.fillStyle = `rgba(26, 188, 156, ${0.12 + r(s + 0.2) * 0.18})`;
            ctx.beginPath();
            ctx.arc(sx, sy, 2 + r(s + 0.3) * 3, 0, Math.PI * 2);
            ctx.fill();
        }

        ctx.restore();

        // Glitch flash overlay during shift
        if (obs._glitchFlash && obs._glitchFlash > 0) {
            ctx.fillStyle = `rgba(255, 255, 255, ${obs._glitchFlash / 60})`;
            ctx.fillRect(x, y, w, h);
        }

        // Bevel
        ctx.fillStyle = 'rgba(26, 188, 156, 0.22)';
        ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x + w, y); ctx.lineTo(x + w - bev, y + bev); ctx.lineTo(x + bev, y + bev); ctx.closePath(); ctx.fill();
        ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x + bev, y + bev); ctx.lineTo(x + bev, y + h - bev); ctx.lineTo(x, y + h); ctx.closePath(); ctx.fill();
        ctx.fillStyle = 'rgba(0,0,0,0.55)';
        ctx.beginPath(); ctx.moveTo(x, y + h); ctx.lineTo(x + w, y + h); ctx.lineTo(x + w - bev, y + h - bev); ctx.lineTo(x + bev, y + h - bev); ctx.closePath(); ctx.fill();
        ctx.beginPath(); ctx.moveTo(x + w, y); ctx.lineTo(x + w, y + h); ctx.lineTo(x + w - bev, y + h - bev); ctx.lineTo(x + w - bev, y + bev); ctx.closePath(); ctx.fill();

        ctx.strokeStyle = '#0a1a18';
        ctx.lineWidth = 1.5;
        ctx.strokeRect(x, y, w, h);
    }
}

// Register
if (typeof BIOME_LOGIC === 'undefined') window.BIOME_LOGIC = {};
window.BIOME_LOGIC['psycho'] = new MindscapeBiome();

// #194 — DLC class must be reachable by bare-name `typeof MindscapeBiome` checks in base code (Boss.js, TestingGrounds.js, etc.); these checks predate the ESM migration and look up the global directly.
if (typeof window !== 'undefined') window.MindscapeBiome = MindscapeBiome;
