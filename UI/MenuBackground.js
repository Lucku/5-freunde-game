const MenuBackground = (() => {
    // Elemental color palette (matches hero types)
    const COLORS = [
        '#e74c3c', // fire
        '#3498db', // water
        '#2ecc71', // plant
        '#c8e8f8', // ice
        '#9b59b6', // void/chaos
        '#f39c12', // gold accent
        '#1abc9c', // teal accent
    ];

    // Ambient glow orbs — orbit the center slowly
    const GLOW_DEFS = [
        { angle: 0,              speed:  0.00018, dist: 0.38, color: [231, 76,  60],  size: 580, alpha: 0.07 }, // fire
        { angle: Math.PI * 0.6, speed: -0.00013, dist: 0.42, color: [52,  152, 219], size: 520, alpha: 0.07 }, // water
        { angle: Math.PI * 1.1, speed:  0.00010, dist: 0.35, color: [46,  204, 113], size: 550, alpha: 0.06 }, // plant
        { angle: Math.PI * 1.7, speed: -0.00015, dist: 0.30, color: [155, 89,  182], size: 480, alpha: 0.06 }, // void
    ];

    let canvas = null, ctx = null, rafId = null;
    let W = 0, H = 0, t = 0;
    let particles = [];

    // ── Particle factory ─────────────────────────────────────────
    function makeParticle(randomY = false) {
        const w = W || window.innerWidth;
        const h = H || window.innerHeight;
        return {
            x:        Math.random() * w,
            y:        randomY ? Math.random() * h : h + 8,
            size:     0.8 + Math.random() * 2.2,
            speed:    0.2 + Math.random() * 0.55,
            drift:    (Math.random() - 0.5) * 0.35,
            alpha:    0,
            maxAlpha: 0.25 + Math.random() * 0.55,
            fadingIn: true,
            color:    COLORS[Math.floor(Math.random() * COLORS.length)],
        };
    }

    // ── Canvas setup ─────────────────────────────────────────────
    function init() {
        canvas = document.createElement('canvas');
        canvas.id = 'menu-bg-canvas';
        canvas.style.cssText = [
            'position:fixed', 'top:0', 'left:0',
            'width:100%', 'height:100%',
            'pointer-events:none', 'z-index:19',
        ].join(';');

        document.body.insertBefore(canvas, document.body.firstChild);

        ctx = canvas.getContext('2d');
        resize();
        window.addEventListener('resize', resize);

        for (let i = 0; i < 65; i++) particles.push(makeParticle(true));
    }

    function resize() {
        if (!canvas) return;
        W = canvas.width  = canvas.offsetWidth  || window.innerWidth;
        H = canvas.height = canvas.offsetHeight || window.innerHeight;
    }

    // ── Draw loop ─────────────────────────────────────────────────
    function tick() {
        if (!canvas || !ctx) return;
        t++;

        ctx.clearRect(0, 0, W, H);

        // 1. Base gradient (top → bottom)
        const base = ctx.createLinearGradient(0, 0, 0, H);
        base.addColorStop(0, '#07091c');
        base.addColorStop(1, '#0b0d1f');
        ctx.fillStyle = base;
        ctx.fillRect(0, 0, W, H);

        // 2. Diagonal grid — very faint
        ctx.save();
        ctx.strokeStyle = 'rgba(255,255,255,0.022)';
        ctx.lineWidth = 1;
        const gs = 90;
        for (let x = -H; x < W + H; x += gs) {
            ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x + H, H); ctx.stroke();
        }
        for (let x = -H; x < W + H; x += gs) {
            ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x - H, H); ctx.stroke();
        }
        ctx.restore();

        // 3. Orbiting ambient glow blobs
        const cx = W / 2, cy = H / 2;
        GLOW_DEFS.forEach(orb => {
            const a = orb.angle + t * orb.speed;
            const ox = cx + Math.cos(a) * orb.dist * W;
            const oy = cy + Math.sin(a) * orb.dist * H * 0.55;
            const pulse = orb.alpha + 0.02 * Math.sin(t * 0.008 + orb.angle);
            const [r, g, b] = orb.color;

            const grad = ctx.createRadialGradient(ox, oy, 0, ox, oy, orb.size);
            grad.addColorStop(0,   `rgba(${r},${g},${b},${pulse.toFixed(3)})`);
            grad.addColorStop(0.4, `rgba(${r},${g},${b},${(pulse * 0.35).toFixed(3)})`);
            grad.addColorStop(1,   'rgba(0,0,0,0)');
            ctx.fillStyle = grad;
            ctx.fillRect(0, 0, W, H);
        });

        // 4. Subtle centre bloom
        const bloom = ctx.createRadialGradient(cx, cy * 0.82, 0, cx, cy * 0.82, Math.min(W, H) * 0.45);
        const ba = 0.04 + 0.015 * Math.sin(t * 0.006);
        bloom.addColorStop(0,   `rgba(120,100,200,${ba})`);
        bloom.addColorStop(1,   'rgba(0,0,0,0)');
        ctx.fillStyle = bloom;
        ctx.fillRect(0, 0, W, H);

        // 5. Floating elemental particles
        for (let i = particles.length - 1; i >= 0; i--) {
            const p = particles[i];
            p.y -= p.speed;
            p.x += p.drift;
            if (p.fadingIn) {
                p.alpha += 0.008;
                if (p.alpha >= p.maxAlpha) p.fadingIn = false;
            } else {
                p.alpha -= 0.0025;
            }
            if (p.alpha <= 0 || p.y < -10) {
                particles[i] = makeParticle(false);
                continue;
            }

            ctx.save();
            ctx.globalAlpha = p.alpha;
            ctx.shadowBlur  = p.size * 7;
            ctx.shadowColor = p.color;
            ctx.fillStyle   = p.color;
            ctx.beginPath();
            ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
            ctx.fill();
            ctx.restore();
        }

        // 6. Vignette — darken edges
        const vign = ctx.createRadialGradient(cx, cy, H * 0.28, cx, cy, H * 0.92);
        vign.addColorStop(0, 'rgba(0,0,0,0)');
        vign.addColorStop(1, 'rgba(0,0,0,0.72)');
        ctx.fillStyle = vign;
        ctx.fillRect(0, 0, W, H);

        rafId = requestAnimationFrame(tick);
    }

    // ── Public API ────────────────────────────────────────────────
    function start() {
        if (!canvas) init();
        if (canvas) canvas.style.display = 'block';
        if (!rafId) tick();
    }

    function stop() {
        if (rafId) { cancelAnimationFrame(rafId); rafId = null; }
        if (canvas) canvas.style.display = 'none';
    }

    return { start, stop };
})();
