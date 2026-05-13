/**
 * Draws an armoured hero sprite in local space (origin = hero centre, +x = facing direction).
 * Called by Player.draw() and Museum draw routines.
 * @param {CanvasRenderingContext2D} ctx
 * @param {string} color  hero base colour (hex)
 * @param {number} r      hero radius
 */
function drawHeroSprite(ctx, color, r, anim = {}) {
    const dark = shadeColor(color, -50);
    const light = shadeColor(color, +55);
    const fireRaise = anim.fireRaise || 0;
    const lean      = anim.lean      || 0;

    // Lean shear: sprite tilts laterally relative to facing direction
    ctx.save();
    if (lean !== 0) ctx.transform(1, 0, lean * 0.10, 1, 0, 0);

    // Ground shadow
    ctx.beginPath();
    ctx.ellipse(r * 0.08, r * 0.06, r * 1.08, r * 0.72, 0, 0, Math.PI * 2);
    ctx.fillStyle = 'rgba(0,0,0,0.28)'; ctx.fill();

    // Pauldrons — drawn before body so body rim covers their inner edge
    [-1, 1].forEach(side => {
        const sy = side * r * 0.72;
        const pr = r * 0.47;
        const pg = ctx.createRadialGradient(-pr * 0.3, sy - pr * 0.35, pr * 0.05, 0, sy, pr);
        pg.addColorStop(0, light);
        pg.addColorStop(0.55, color);
        pg.addColorStop(1, dark);
        ctx.beginPath(); ctx.arc(0, sy, pr, 0, Math.PI * 2);
        ctx.fillStyle = pg; ctx.fill();
        ctx.strokeStyle = '#111'; ctx.lineWidth = 2; ctx.stroke();
        // Armour crease highlight
        ctx.beginPath(); ctx.arc(0, sy, pr * 0.58, -Math.PI * 0.5, Math.PI * 0.1);
        ctx.strokeStyle = 'rgba(255,255,255,0.20)'; ctx.lineWidth = 1.5; ctx.stroke();
    });

    // Helmet body
    const hg = ctx.createRadialGradient(-r * 0.30, -r * 0.35, r * 0.04, 0, 0, r);
    hg.addColorStop(0, light);
    hg.addColorStop(0.42, color);
    hg.addColorStop(1, dark);
    ctx.beginPath(); ctx.arc(0, 0, r, 0, Math.PI * 2);
    ctx.fillStyle = hg; ctx.fill();
    ctx.strokeStyle = '#0d0d0d'; ctx.lineWidth = 2.5; ctx.stroke();

    // Helmet rim band
    ctx.beginPath(); ctx.arc(0, 0, r - 3.5, 0, Math.PI * 2);
    ctx.strokeStyle = 'rgba(0,0,0,0.35)'; ctx.lineWidth = 2; ctx.stroke();

    // Visor — clipped to helmet interior
    ctx.save();
    ctx.beginPath(); ctx.arc(0, 0, r - 1.5, 0, Math.PI * 2); ctx.clip();

    // Visor slit — perpendicular to facing direction (spans Y), positioned toward front face.
    // Wider than before but not touching the circle edges; fades at top/bottom.
    const slitHex = shadeColor(color, -35);
    const _sr = parseInt(slitHex.slice(1, 3), 16);
    const _sg = parseInt(slitHex.slice(3, 5), 16);
    const _sb = parseInt(slitHex.slice(5, 7), 16);
    const vHH = r * 0.6;   // half-height in Y — clear bar, not reaching circle edge
    const vX = r * 0.05;   // X position: toward the facing/front side
    const vW = r * 0.30;   // narrow in X
    const vg = ctx.createLinearGradient(0, -vHH, 0, vHH);
    vg.addColorStop(0, `rgba(${_sr},${_sg},${_sb},0.0)`);
    vg.addColorStop(0.15, `rgba(${_sr},${_sg},${_sb},0.85)`);
    vg.addColorStop(0.85, `rgba(${_sr},${_sg},${_sb},0.85)`);
    vg.addColorStop(1, `rgba(${_sr},${_sg},${_sb},0.0)`);
    ctx.fillStyle = vg;
    ctx.fillRect(vX, -vHH, vW, vHH * 2);
    // Outline so the slit reads clearly against the helmet
    ctx.strokeStyle = 'rgba(0,0,0,0.55)';
    ctx.lineWidth = 1;
    ctx.strokeRect(vX, -vHH, vW, vHH * 2);
    ctx.restore();

    // Armour chest crease (vertical plate line)
    ctx.save();
    ctx.beginPath(); ctx.arc(0, 0, r - 1.5, 0, Math.PI * 2); ctx.clip();
    const cg = ctx.createLinearGradient(0, -r, 0, r);
    cg.addColorStop(0, 'rgba(255,255,255,0.0)');
    cg.addColorStop(0.4, 'rgba(255,255,255,0.09)');
    cg.addColorStop(1, 'rgba(255,255,255,0.0)');
    ctx.fillStyle = cg;
    ctx.fillRect(r * 0.0, -r * 0.85, r * 0.06, r * 1.7);
    ctx.restore();

    // Weapon nozzle — raises on fire (arm-up pose)
    ctx.save();
    ctx.translate(0, -fireRaise * r * 0.28);
    ctx.fillStyle = '#2a2a2a';
    ctx.fillRect(r * 0.80, -r * 0.10, r * 0.30, r * 0.20);
    ctx.strokeStyle = '#444'; ctx.lineWidth = 0.7;
    ctx.strokeRect(r * 0.80, -r * 0.10, r * 0.30, r * 0.20);
    ctx.fillStyle = 'rgba(255,255,255,0.10)';
    ctx.fillRect(r * 0.82, -r * 0.08, r * 0.26, r * 0.07);
    ctx.restore();

    // Close lean shear
    ctx.restore();
}

/**
 * mulberry32 — fast, well-distributed seeded PRNG (32-bit state). Returns a
 * function that yields a float in [0, 1) on each call. Used for daily/weekly
 * challenge mode so every player on the same calendar day sees identical
 * mutators, drop rolls, and (where wired up) arena layouts. Stateless across
 * calls except for the returned closure's `s` variable — safe for parallel
 * instances.
 */
function mulberry32(seed) {
    let s = seed >>> 0;
    return function () {
        s |= 0; s = (s + 0x6D2B79F5) | 0;
        let t = Math.imul(s ^ (s >>> 15), 1 | s);
        t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
        return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
}
if (typeof window !== 'undefined') window.mulberry32 = mulberry32;

function shadeColor(color, percent) {
    // Accept #RGB shorthand, #RRGGBB, or any other input (fall back to color unchanged
    // so callers feeding it to addColorStop never get NaN-laden hex like "#8408NaN").
    if (typeof color !== 'string' || color[0] !== '#') return color;
    let hex = color.slice(1);
    if (hex.length === 3) hex = hex[0] + hex[0] + hex[1] + hex[1] + hex[2] + hex[2];
    if (hex.length !== 6) return color;
    let R = parseInt(hex.substring(0, 2), 16);
    let G = parseInt(hex.substring(2, 4), 16);
    let B = parseInt(hex.substring(4, 6), 16);
    if (Number.isNaN(R) || Number.isNaN(G) || Number.isNaN(B)) return color;
    R = Math.min(255, Math.max(0, Math.round(R * (100 + percent) / 100)));
    G = Math.min(255, Math.max(0, Math.round(G * (100 + percent) / 100)));
    B = Math.min(255, Math.max(0, Math.round(B * (100 + percent) / 100)));
    const pad = (v) => v.toString(16).padStart(2, '0');
    return "#" + pad(R) + pad(G) + pad(B);
}

// #22 — radial-gradient cache. Gradients bound to a canvas context can be
// reused across frames as long as the local-coordinate geometry stays
// constant. Callers should `ctx.translate(x, y)` first and request a gradient
// centred at (0,0). Cache is keyed by an opaque string supplied by the caller
// (typically `<callsite>:<color>:<radius>`). Bounded to LRU-ish soft cap so a
// runaway DLC can't grow it unbounded.
const _GRAD_CACHE = new Map();
const _GRAD_CACHE_MAX = 512;
function cachedRadial(ctx, key, r0, r1, stops) {
    let g = _GRAD_CACHE.get(key);
    if (g) return g;
    g = ctx.createRadialGradient(0, 0, r0, 0, 0, r1);
    for (let i = 0; i < stops.length; i++) {
        g.addColorStop(stops[i][0], stops[i][1]);
    }
    if (_GRAD_CACHE.size >= _GRAD_CACHE_MAX) {
        // Drop oldest entry. Map iteration order is insertion order.
        const firstKey = _GRAD_CACHE.keys().next().value;
        if (firstKey !== undefined) _GRAD_CACHE.delete(firstKey);
    }
    _GRAD_CACHE.set(key, g);
    return g;
}
function clearGradientCache() { _GRAD_CACHE.clear(); }

// ESM exports — file is loaded via `<script type="module">`. The window shims
// below keep classic-script callers (not yet ESM-migrated) working unchanged.
export { drawHeroSprite, shadeColor, mulberry32, cachedRadial, clearGradientCache };
if (typeof window !== 'undefined') {
    window.drawHeroSprite = drawHeroSprite;
    window.shadeColor     = shadeColor;
    // mulberry32 already exported via window above; this line keeps the
    // assignment grouped with the others when callers grep for the shim block.
    window.mulberry32     = mulberry32;
    window.cachedRadial   = cachedRadial;
    window.clearGradientCache = clearGradientCache;
}
