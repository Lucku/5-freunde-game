// Champions of Chaos — Special Boss Enemies

class ChaosEnemies {

    // ═══════════════════════════════════════════════════════════════════════
    // VOID WALKER — Phase-shifting void creature
    //   Design:  Dissolving sphere of darkness, rotating tendrils, void core
    //   Behavior: Phases through reality (turns immune + near-invisible every
    //             8s for 2s), leaves void trail, unleashes a void pulse
    //             knockback every 5s
    // ═══════════════════════════════════════════════════════════════════════
    static initVoidWalker(enemy) {
        enemy.color = '#4a235a';
        enemy.speed *= 0.8;
        enemy.hp   *= 2.0;
        enemy.maxHp = enemy.hp;
        enemy.radius *= 1.2;
        enemy.knockbackResist = 0.5;
        enemy.isChaos = true;
        enemy._voidPulseTimer = 180;
        enemy._phaseTimer     = 300;
        enemy._phaseActive    = false;
        enemy._phaseDuration  = 0;
    }

    static updateVoidWalker(enemy) {
        // Void trail particles
        if (Math.random() < 0.12 && typeof particles !== 'undefined') {
            particles.push(new Particle(enemy.x, enemy.y, '#4a235a'));
        }

        // Phase cycle — immune + near-invisible for 2s every 8s
        enemy._phaseTimer--;
        if (enemy._phaseTimer <= 0 && !enemy._phaseActive) {
            enemy._phaseActive   = true;
            enemy._phaseDuration = 120; // 2 s
            enemy.alpha          = 0.12;
            enemy._phaseTimer    = 480; // next phase in 8 s
            if (typeof createExplosion === 'function') createExplosion(enemy.x, enemy.y, '#4a235a');
        }
        if (enemy._phaseActive) {
            enemy._phaseDuration--;
            if (enemy._phaseDuration <= 0) {
                enemy._phaseActive = false;
                enemy.alpha        = 1.0;
                if (typeof createExplosion === 'function') createExplosion(enemy.x, enemy.y, '#c39bd3');
            }
        }

        // Void Pulse — AoE knockback every 5s
        enemy._voidPulseTimer--;
        if (enemy._voidPulseTimer <= 0) {
            if (typeof player !== 'undefined') {
                const dist       = Math.hypot(player.x - enemy.x, player.y - enemy.y);
                const pulseR     = enemy.radius * 4.5;
                if (dist < pulseR) {
                    const pushAng = Math.atan2(player.y - enemy.y, player.x - enemy.x);
                    player.x += Math.cos(pushAng) * 90;
                    player.y += Math.sin(pushAng) * 90;
                    if (player.invulnTimer <= 0 && typeof player.takeDamage === 'function') {
                        player.takeDamage(8);
                    }
                }
            }
            if (typeof createExplosion === 'function') createExplosion(enemy.x, enemy.y, '#4a235a');
            enemy._voidPulseTimer = 300;
        }

        return false; // Default chase movement
    }

    static drawVoidWalker(ctx, enemy) {
        ctx.save();
        ctx.translate(enemy.x, enemy.y);

        const r = enemy.radius;
        const t = Date.now() / 1000;
        ctx.globalAlpha = enemy.alpha;

        // Pulsing outer void rings
        for (let ring = 3; ring >= 1; ring--) {
            const pulse = Math.sin(t * 1.8 + ring) * 6;
            ctx.beginPath();
            ctx.arc(0, 0, r + ring * 14 + pulse, 0, Math.PI * 2);
            ctx.strokeStyle = `rgba(74, 35, 90, ${0.18 - ring * 0.04})`;
            ctx.lineWidth = 2;
            ctx.stroke();
        }

        // Body — fades at edges like dissolving into the void
        const rg = ctx.createRadialGradient(0, 0, 0, 0, 0, r);
        rg.addColorStop(0,    '#000000');
        rg.addColorStop(0.30, '#120820');
        rg.addColorStop(0.65, '#4a235a');
        rg.addColorStop(1,    'rgba(40, 10, 60, 0.05)');
        ctx.beginPath(); ctx.arc(0, 0, r, 0, Math.PI * 2);
        ctx.fillStyle = rg; ctx.fill();

        // Rotating void tendrils
        ctx.save();
        ctx.rotate(t * 0.4);
        for (let i = 0; i < 4; i++) {
            const ang = i * Math.PI * 0.5;
            ctx.beginPath();
            ctx.moveTo(Math.cos(ang) * r * 0.25, Math.sin(ang) * r * 0.25);
            ctx.quadraticCurveTo(
                Math.cos(ang + 0.6) * r * 0.78, Math.sin(ang + 0.6) * r * 0.78,
                Math.cos(ang + 1.1) * r * 1.0,  Math.sin(ang + 1.1) * r * 1.0
            );
            ctx.strokeStyle = 'rgba(140, 50, 200, 0.45)';
            ctx.lineWidth = 2; ctx.stroke();
        }
        ctx.restore();

        // Void core — absolute black
        ctx.beginPath(); ctx.arc(0, 0, r * 0.28, 0, Math.PI * 2);
        ctx.fillStyle = '#000'; ctx.fill();

        // Single horizontal glowing void eye slit
        ctx.save();
        ctx.shadowColor = '#8e44ad'; ctx.shadowBlur = 12;
        ctx.strokeStyle = '#c39bd3'; ctx.lineWidth = 2.5; ctx.lineCap = 'round';
        ctx.beginPath();
        ctx.moveTo(-r * 0.18, 0); ctx.lineTo(r * 0.18, 0);
        ctx.stroke();
        ctx.restore();

        // Phase pulse indicator
        if (enemy._phaseActive) {
            ctx.beginPath(); ctx.arc(0, 0, r * 1.22, 0, Math.PI * 2);
            ctx.strokeStyle = `rgba(200, 150, 255, ${0.55 + Math.sin(t * 10) * 0.3})`;
            ctx.lineWidth = 2; ctx.stroke();
        }

        ctx.restore();
        return true;
    }

    // ═══════════════════════════════════════════════════════════════════════
    // GLITCH — Corrupted data entity
    //   Design:  Chromatic-aberration triangle, scanline glitches, flicker,
    //            "!" error symbol core
    //   Behavior: Erratic speed jitter, teleports every 1.5s + fires a radial
    //             burst of projectiles on each teleport
    // ═══════════════════════════════════════════════════════════════════════
    static initGlitch(enemy) {
        enemy.color  = '#ff00ff';
        enemy.speed *= 2.0;
        enemy.hp    *= 0.5;
        enemy.maxHp  = enemy.hp;
        enemy.radius = 14 + Math.random() * 6;
        enemy.sides  = 3;
        enemy.teleportTimer = 0;
        enemy._baseSpeed    = null; // Captured on first update
        enemy.isChaos       = true;
    }

    static updateGlitch(enemy) {
        // Speed jitter — erratic glitchy movement
        if (!enemy._baseSpeed) enemy._baseSpeed = enemy.speed;
        enemy.speed = enemy._baseSpeed * (0.5 + Math.random() * 1.2);

        // Teleport every ~1.5s + burst fire on arrival
        enemy.teleportTimer++;
        if (enemy.teleportTimer > 90) {
            if (typeof createExplosion === 'function') createExplosion(enemy.x, enemy.y, '#ff00ff');

            enemy.x += (Math.random() - 0.5) * 320;
            enemy.y += (Math.random() - 0.5) * 320;
            if (typeof arena !== 'undefined') {
                enemy.x = Math.max(30, Math.min(arena.width  - 30, enemy.x));
                enemy.y = Math.max(30, Math.min(arena.height - 30, enemy.y));
            }

            if (typeof createExplosion === 'function') createExplosion(enemy.x, enemy.y, '#00ffff');

            // Radial burst — 5 chaos projectiles in all directions
            if (typeof projectiles !== 'undefined' && typeof Projectile !== 'undefined') {
                const count = 5;
                for (let i = 0; i < count; i++) {
                    const ang   = (i / count) * Math.PI * 2;
                    const speed = 3 + Math.random() * 2;
                    const vel   = { x: Math.cos(ang) * speed, y: Math.sin(ang) * speed };
                    const cols  = ['#ff00ff', '#00ffff', '#ff0055'];
                    const proj  = new Projectile(enemy.x, enemy.y, vel, enemy.damage * 0.5, cols[i % 3], 6, 'chaos', 0, true);
                    if (proj) { proj.owner = enemy; projectiles.push(proj); }
                }
            }

            enemy.teleportTimer = 0;
        }

        return false; // Default chase movement
    }

    static drawGlitch(ctx, enemy) {
        ctx.save();
        ctx.translate(enemy.x, enemy.y);

        const r     = enemy.radius;
        const t     = Date.now();
        const sides = 3;

        // Flicker based on high-frequency oscillation
        const flicker = (Math.sin(t * 0.07) > 0.15) ? 1 : (Math.random() > 0.45 ? 0.55 : 1);
        ctx.globalAlpha = enemy.alpha * flicker;

        // Helper: draw triangle polygon
        const triPath = () => {
            ctx.beginPath(); ctx.moveTo(r, 0);
            for (let i = 1; i <= sides; i++) {
                ctx.lineTo(r * Math.cos(i * 2 * Math.PI / sides), r * Math.sin(i * 2 * Math.PI / sides));
            }
            ctx.closePath();
        };

        // Chromatic aberration — R / G / B offset layers
        const aberrations = [
            { dx: -3, dy:  1, color: 'rgba(255, 0, 200, 0.60)' },
            { dx:  3, dy: -1, color: 'rgba(0, 255, 255, 0.40)' },
            { dx:  0, dy:  0, color: 'rgba(255, 0, 255, 0.85)' },
        ];
        for (const a of aberrations) {
            ctx.save(); ctx.translate(a.dx, a.dy);
            triPath(); ctx.fillStyle = a.color; ctx.fill();
            ctx.restore();
        }

        // Random scanline glitch bar
        if (Math.random() < 0.28) {
            const barY = (Math.random() - 0.5) * r * 1.8;
            ctx.fillStyle = 'rgba(255, 0, 255, 0.18)';
            ctx.fillRect(-r * 1.2, barY, r * 2.4, 4 + Math.random() * 4);
        }

        // Dark outline
        triPath(); ctx.strokeStyle = '#ff00ff'; ctx.lineWidth = 2; ctx.stroke();

        // "!" error symbol
        ctx.globalAlpha = enemy.alpha;
        ctx.fillStyle = '#ffffff';
        ctx.shadowColor = '#ff00ff'; ctx.shadowBlur = 7;
        ctx.font = `bold ${Math.floor(r * 0.55)}px monospace`;
        ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
        ctx.fillText('!', 0, r * 0.07);
        ctx.shadowBlur = 0;

        ctx.restore();
        return true;
    }

    // ═══════════════════════════════════════════════════════════════════════
    // ENTROPY MAGE — Chaos sorcerer commanding disorder
    //   Design:  Glowing chaos eye core, two counter-rotating rune rings,
    //            gradient body, three orbital shield orbs with trails
    //   Behavior: Orbital shield damages on touch, teleports when too close,
    //             fires 3-spread bursts, summons GLITCH minions,
    //             triggers Chaos Nova (12-projectile ring) at 50% HP
    // ═══════════════════════════════════════════════════════════════════════
    static initEntropyMage(enemy) {
        enemy.color       = '#9b59b6';
        enemy.shootCooldown = 60;
        enemy.teleportTimer = 300;
        enemy.summonTimer   = 600;
        enemy.shieldAngle   = 0;
        enemy._novaFired    = false;
        enemy.isChaos       = true;

        enemy.hp     *= 2.5;
        enemy.maxHp   = enemy.hp;
        enemy.xpValue *= 3;
        enemy.radius  *= 1.2;
    }

    static updateEntropyMage(enemy) {
        const r      = enemy.radius;
        const phaseR = (enemy.maxHp > 0 && enemy.hp < enemy.maxHp * 0.5);

        // 1. Orbital shield — faster in phase 2
        enemy.shieldAngle += phaseR ? 0.09 : 0.05;
        if (typeof player !== 'undefined') {
            const shieldRadius = r + 30;
            for (let i = 0; i < 3; i++) {
                const ang = enemy.shieldAngle + (i * Math.PI * 2 / 3);
                const sx  = enemy.x + Math.cos(ang) * shieldRadius;
                const sy  = enemy.y + Math.sin(ang) * shieldRadius;
                const dist = Math.hypot(player.x - sx, player.y - sy);
                if (dist < 22 && player.invulnTimer <= 0) {
                    if (typeof player.takeDamage === 'function') player.takeDamage(10);
                    else player.hp -= 10;
                    const pa = Math.atan2(player.y - sy, player.x - sx);
                    player.x += Math.cos(pa) * 15; player.y += Math.sin(pa) * 15;
                    if (typeof createExplosion === 'function') createExplosion(sx, sy, '#8e44ad');
                }
            }

            // 2. Teleport when player is too close
            enemy.teleportTimer--;
            const d2p = Math.hypot(player.x - enemy.x, player.y - enemy.y);
            if (enemy.teleportTimer <= 0 || (d2p < 100 && enemy.teleportTimer < 250)) {
                if (typeof createExplosion === 'function') createExplosion(enemy.x, enemy.y, enemy.color);
                const ang = Math.random() * Math.PI * 2;
                const d   = 300 + Math.random() * 200;
                enemy.x = player.x + Math.cos(ang) * d;
                enemy.y = player.y + Math.sin(ang) * d;
                if (typeof createExplosion === 'function') createExplosion(enemy.x, enemy.y, '#e8b4ff');
                enemy.teleportTimer  = 300 + Math.random() * 100;
                enemy.shootCooldown  = 30; // Fire immediately after teleport
            }
        }

        // 3. Chaos Nova — one-time 12-projectile ring at 50% HP
        if (!enemy._novaFired && enemy.maxHp > 0 && enemy.hp < enemy.maxHp * 0.5) {
            enemy._novaFired = true;
            if (typeof projectiles !== 'undefined' && typeof Projectile !== 'undefined') {
                const novaCount = 12;
                for (let i = 0; i < novaCount; i++) {
                    const ang  = (i / novaCount) * Math.PI * 2;
                    const vel  = { x: Math.cos(ang) * 4, y: Math.sin(ang) * 4 };
                    const cols = ['#9b59b6', '#e74c3c', '#3498db'];
                    const proj = new Projectile(enemy.x, enemy.y, vel, enemy.damage * 0.7, cols[i % 3], 10, 'gravity', 0, true);
                    if (proj) { proj.owner = enemy; projectiles.push(proj); }
                }
            }
            if (typeof createExplosion === 'function') createExplosion(enemy.x, enemy.y, '#e74c3c');
        }

        // 4. 3-spread shooting
        if (enemy.shootCooldown > 0) enemy.shootCooldown--;
        else if (typeof player !== 'undefined' && typeof projectiles !== 'undefined') {
            const ang = Math.atan2(player.y - enemy.y, player.x - enemy.x);
            for (let i = -1; i <= 1; i++) {
                const s   = i * 0.2;
                const sv  = 0.8 + Math.random() * 0.4;
                const vel = { x: Math.cos(ang + s) * 5 * sv, y: Math.sin(ang + s) * 5 * sv };
                const col = ['#9b59b6', '#8e44ad', '#e74c3c'][Math.floor(Math.random() * 3)];
                const proj = new Projectile(enemy.x, enemy.y, vel, enemy.damage, col, 10, 'gravity', 0, true);
                if (proj) { proj.owner = enemy; projectiles.push(proj); }
            }
            enemy.shootCooldown = 150;
        }

        // 5. Summon GLITCH minion every 10s
        if (enemy.summonTimer > 0) enemy.summonTimer--;
        else if (typeof enemies !== 'undefined') {
            const minion = new Enemy(false, 'GLITCH');
            minion.x = enemy.x + (Math.random() - 0.5) * 100;
            minion.y = enemy.y + (Math.random() - 0.5) * 100;
            enemies.push(minion);
            if (typeof createExplosion === 'function') createExplosion(minion.x, minion.y, '#00ff00');
            enemy.summonTimer = 600;
        }

        return false; // Default chase movement
    }

    static drawEntropyMage(ctx, enemy) {
        ctx.save();
        ctx.translate(enemy.x, enemy.y);

        const r       = enemy.radius;
        const t       = Date.now() / 1000;
        const hpFrac  = (enemy.maxHp > 0) ? enemy.hp / enemy.maxHp : 1;

        // Outer pulsing chaos aura
        ctx.beginPath();
        ctx.arc(0, 0, r * (1.30 + Math.sin(t * 3) * 0.07), 0, Math.PI * 2);
        ctx.strokeStyle = `rgba(142, 68, 173, ${0.18 + Math.sin(t * 2) * 0.07})`;
        ctx.lineWidth = 4; ctx.stroke();

        // 3D body — radial gradient
        const lc = shadeColor('#9b59b6', +40);
        const dc = shadeColor('#9b59b6', -60);
        const rg = ctx.createRadialGradient(-r * 0.28, -r * 0.28, r * 0.04, 0, 0, r);
        rg.addColorStop(0,    lc);
        rg.addColorStop(0.50, '#9b59b6');
        rg.addColorStop(1,    dc);
        ctx.beginPath(); ctx.arc(0, 0, r, 0, Math.PI * 2);
        ctx.fillStyle = rg; ctx.strokeStyle = '#220033'; ctx.lineWidth = 2.5;
        ctx.fill(); ctx.stroke();

        // Inner rotating rune ring
        ctx.save();
        ctx.rotate(t * 0.7);
        ctx.strokeStyle = `rgba(200, 100, 255, ${0.35 + Math.sin(t * 2) * 0.12})`;
        ctx.lineWidth = 1.5; ctx.setLineDash([4, 8]);
        ctx.beginPath(); ctx.arc(0, 0, r * 0.65, 0, Math.PI * 2); ctx.stroke();
        ctx.setLineDash([]); ctx.restore();

        // Counter-rotating outer rune ring
        ctx.save();
        ctx.rotate(-t * 0.45);
        ctx.strokeStyle = 'rgba(155, 89, 182, 0.28)';
        ctx.lineWidth = 1.5; ctx.setLineDash([6, 6]);
        ctx.beginPath(); ctx.arc(0, 0, r * 0.85, 0, Math.PI * 2); ctx.stroke();
        ctx.setLineDash([]); ctx.restore();

        // Central chaos eye — glowing iris
        const eyeGrad = ctx.createRadialGradient(0, 0, 0, 0, 0, r * 0.20);
        eyeGrad.addColorStop(0,    '#ffffff');
        eyeGrad.addColorStop(0.35, '#e74c3c');
        eyeGrad.addColorStop(1,    '#8e44ad');
        ctx.beginPath(); ctx.arc(0, 0, r * 0.20, 0, Math.PI * 2);
        ctx.fillStyle = eyeGrad;
        ctx.shadowColor = '#e74c3c'; ctx.shadowBlur = 14;
        ctx.fill(); ctx.shadowBlur = 0;

        // Orbital shield orbs with gradient fill and ghost trails
        const shieldRadius = r + 28;
        for (let i = 0; i < 3; i++) {
            const ang = (enemy.shieldAngle || 0) + (i * Math.PI * 2 / 3);

            // Ghost trails
            for (let tr = 1; tr <= 3; tr++) {
                const trAng = ang - tr * 0.18;
                const trx   = Math.cos(trAng) * shieldRadius;
                const try_  = Math.sin(trAng) * shieldRadius;
                ctx.beginPath(); ctx.arc(trx, try_, 6 - tr, 0, Math.PI * 2);
                ctx.fillStyle = `rgba(142, 68, 173, ${0.20 - tr * 0.05})`; ctx.fill();
            }

            const sx = Math.cos(ang) * shieldRadius;
            const sy = Math.sin(ang) * shieldRadius;

            // Link line
            ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(sx, sy);
            ctx.strokeStyle = 'rgba(142, 68, 173, 0.20)'; ctx.lineWidth = 1.5; ctx.stroke();

            // Main orb — radial gradient
            const og = ctx.createRadialGradient(sx - 2, sy - 2, 1, sx, sy, 9);
            og.addColorStop(0, '#e8b4ff'); og.addColorStop(0.5, '#9b59b6'); og.addColorStop(1, '#4a0070');
            ctx.beginPath(); ctx.arc(sx, sy, 9, 0, Math.PI * 2);
            ctx.fillStyle = og; ctx.shadowColor = '#9b59b6'; ctx.shadowBlur = 10;
            ctx.fill(); ctx.shadowBlur = 0;
            ctx.strokeStyle = 'rgba(255,255,255,0.55)'; ctx.lineWidth = 1; ctx.stroke();
        }

        // Phase 2 — pulsing red warning ring at <50% HP
        if (hpFrac < 0.5) {
            ctx.beginPath(); ctx.arc(0, 0, r * 1.12, 0, Math.PI * 2);
            ctx.strokeStyle = `rgba(231, 76, 60, ${0.45 + Math.sin(t * 7) * 0.22})`;
            ctx.lineWidth = 3; ctx.stroke();
        }

        ctx.restore();
        return true;
    }
}

// Registration
if (typeof ENEMY_TYPES !== 'undefined') {
    if (!ENEMY_TYPES.includes('VOID_WALKER'))  ENEMY_TYPES.push('VOID_WALKER');
    if (!ENEMY_TYPES.includes('GLITCH'))       ENEMY_TYPES.push('GLITCH');
    if (!ENEMY_TYPES.includes('ENTROPY_MAGE')) ENEMY_TYPES.push('ENTROPY_MAGE');
}

if (typeof window.ENEMY_LOGIC === 'undefined') window.ENEMY_LOGIC = {};

window.ENEMY_LOGIC['VOID_WALKER']  = { init: ChaosEnemies.initVoidWalker,  update: ChaosEnemies.updateVoidWalker,  draw: ChaosEnemies.drawVoidWalker  };
window.ENEMY_LOGIC['GLITCH']       = { init: ChaosEnemies.initGlitch,       update: ChaosEnemies.updateGlitch,       draw: ChaosEnemies.drawGlitch       };
window.ENEMY_LOGIC['ENTROPY_MAGE'] = { init: ChaosEnemies.initEntropyMage,  update: ChaosEnemies.updateEntropyMage, draw: ChaosEnemies.drawEntropyMage  };
