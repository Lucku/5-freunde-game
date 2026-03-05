/**
 * Draws an armoured hero sprite in local space (origin = hero centre, +x = facing direction).
 * Called by Player.draw() and Museum draw routines.
 * @param {CanvasRenderingContext2D} ctx
 * @param {string} color  hero base colour (hex)
 * @param {number} r      hero radius
 */
function drawHeroSprite(ctx, color, r) {
    const dark = shadeColor(color, -50);
    const light = shadeColor(color, +55);

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

    // Weapon nozzle — subtle notch just past the helmet edge, not a full barrel
    ctx.fillStyle = '#2a2a2a';
    ctx.fillRect(r * 0.80, -r * 0.10, r * 0.30, r * 0.20);
    ctx.strokeStyle = '#444'; ctx.lineWidth = 0.7;
    ctx.strokeRect(r * 0.80, -r * 0.10, r * 0.30, r * 0.20);
    ctx.fillStyle = 'rgba(255,255,255,0.10)';
    ctx.fillRect(r * 0.82, -r * 0.08, r * 0.26, r * 0.07);
}

function shadeColor(color, percent) {
    var R = parseInt(color.substring(1, 3), 16); var G = parseInt(color.substring(3, 5), 16); var B = parseInt(color.substring(5, 7), 16);
    R = parseInt(R * (100 + percent) / 100); G = parseInt(G * (100 + percent) / 100); B = parseInt(B * (100 + percent) / 100);
    R = (R < 255) ? R : 255; G = (G < 255) ? G : 255; B = (B < 255) ? B : 255;
    var RR = ((R.toString(16).length == 1) ? "0" + R.toString(16) : R.toString(16));
    var GG = ((G.toString(16).length == 1) ? "0" + G.toString(16) : G.toString(16));
    var BB = ((B.toString(16).length == 1) ? "0" + B.toString(16) : B.toString(16));
    return "#" + RR + GG + BB;
}
