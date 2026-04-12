// EvilHeroes.js
// HERO_LOGIC entries for the two playable villain heroes in Evil Mode.
// Abilities mirror the boss implementations but are driven by player input.

if (!window.HERO_LOGIC) window.HERO_LOGIC = {};

// ─────────────────────────────────────────────────────────────────────────────
// GREEN GOBLIN
//   Attack  — toss a trick bomb (lands at aim point, detonates after 1.5 s)
//   Special — glider dive (fast dash toward aim direction with brief i-frames)
//   Ultimate— magnet pull followed by a detonating bomb ring
// ─────────────────────────────────────────────────────────────────────────────
window.HERO_LOGIC['green_goblin'] = {
    upgradePool: [
        { id: 'damage',    title: 'Volatility',     desc: 'Increase all damage dealt by 12%.',          icon: '💣' },
        { id: 'speed',     title: 'Manic Stride',   desc: 'Increase Movement Speed by 12%.',            icon: '🛹' },
        { id: 'cooldown',  title: 'Quick Fuse',     desc: 'Reduce ability cooldowns by 12%.',           icon: '⏩' },
        { id: 'health',    title: 'Goblin Armor',   desc: 'Increase Max HP by 30 and Heal 20%.',        icon: '🪖' },
        { id: 'defense',   title: 'Shields Up',     desc: 'Reduce incoming damage by 6%.',              icon: '🛡️' },
        { id: 'radius',    title: 'Bigger Boom',    desc: 'Increase bomb blast radius by 25%.',         icon: '💥' },
        { id: 'crit',      title: 'Trick Shot',     desc: '+6% Crit Chance & +25% Crit Damage.',        icon: '🎯' },
        { id: 'projectile',title: 'Grenade Cluster',desc: 'Fire +1 additional trick bomb per throw.',   icon: '🏹' },
    ],

    init(p) {
        p._goblinBombs = [];          // { x, y, timer, maxTimer, radius, dmg }
        p._bombBlastMult = 1;         // upgraded via 'radius'
        p._extraBombs = 0;            // upgraded via 'projectile'

        // Increase collision radius to fit boss-like art
        p.radius = 30;

        // Fully replace the standard circle draw with the boss-style Green Goblin art
        p.customDraw = function(ctx) {
            const gx = this.x, gy = this.y, r = this.radius;
            ctx.save();
            ctx.translate(gx, gy);
            ctx.rotate(this.aimAngle);

            // ── Wings (behind body) ──────────────────────────────────────────
            const wingFlap = Math.sin(frame * 0.12) * 0.22;
            ctx.save();
            ctx.rotate(wingFlap);
            const _wgL = ctx.createLinearGradient(-r * 1.8, 0, -r * 0.3, 0);
            _wgL.addColorStop(0, 'rgba(20,90,20,0.55)');
            _wgL.addColorStop(1, 'rgba(40,160,40,0.75)');
            ctx.strokeStyle = 'rgba(0,80,0,0.6)';
            ctx.lineWidth = 1.5;
            // Left wing
            ctx.beginPath();
            ctx.moveTo(-r * 0.3, -r * 0.1);
            ctx.quadraticCurveTo(-r * 1.5, -r * 0.8, -r * 1.8, r * 0.3);
            ctx.quadraticCurveTo(-r * 1.1, r * 0.6, -r * 0.3, r * 0.2);
            ctx.closePath();
            ctx.fillStyle = _wgL; ctx.fill(); ctx.stroke();
            // Right wing (mirrored)
            ctx.scale(-1, 1);
            ctx.beginPath();
            ctx.moveTo(-r * 0.3, -r * 0.1);
            ctx.quadraticCurveTo(-r * 1.5, -r * 0.8, -r * 1.8, r * 0.3);
            ctx.quadraticCurveTo(-r * 1.1, r * 0.6, -r * 0.3, r * 0.2);
            ctx.closePath();
            ctx.fillStyle = _wgL; ctx.fill(); ctx.stroke();
            ctx.restore();

            // ── Body ─────────────────────────────────────────────────────────
            const bodyGrad = ctx.createRadialGradient(-r * 0.25, -r * 0.25, r * 0.08, 0, 0, r);
            bodyGrad.addColorStop(0, '#5ddb6e');
            bodyGrad.addColorStop(0.42, '#1d8a2e');
            bodyGrad.addColorStop(1, '#0a3d14');
            ctx.beginPath(); ctx.arc(0, 0, r, 0, Math.PI * 2);
            ctx.fillStyle = bodyGrad;
            ctx.shadowColor = '#000'; ctx.shadowBlur = 10; ctx.fill();
            ctx.shadowBlur = 0;
            ctx.strokeStyle = '#0a3d14'; ctx.lineWidth = 3; ctx.stroke();

            // ── Hat ──────────────────────────────────────────────────────────
            ctx.save();
            ctx.fillStyle = '#1a1a00'; ctx.strokeStyle = '#3a3a00'; ctx.lineWidth = 2;
            ctx.beginPath();
            ctx.ellipse(0, -r * 0.72, r * 0.68, r * 0.17, 0, 0, Math.PI * 2);
            ctx.fill(); ctx.stroke();
            ctx.beginPath();
            ctx.moveTo(-r * 0.40, -r * 0.72);
            ctx.lineTo(0, -r * 2.1);
            ctx.lineTo(r * 0.40, -r * 0.72);
            ctx.closePath(); ctx.fill(); ctx.stroke();
            ctx.fillStyle = '#c8a800';
            ctx.fillRect(-r * 0.13, -r * 0.92, r * 0.26, r * 0.18);
            ctx.restore();

            // ── Eyes ─────────────────────────────────────────────────────────
            const eyePulse = 0.8 + 0.2 * Math.sin(frame * 0.18);
            ctx.save();
            ctx.shadowColor = '#ffe000'; ctx.shadowBlur = 14;
            ctx.fillStyle = `rgba(255,220,0,${0.85 * eyePulse})`;
            ctx.beginPath(); ctx.ellipse(-r * 0.28, -r * 0.12, r * 0.14, r * 0.09, -0.3, 0, Math.PI * 2); ctx.fill();
            ctx.beginPath(); ctx.ellipse( r * 0.28, -r * 0.12, r * 0.14, r * 0.09,  0.3, 0, Math.PI * 2); ctx.fill();
            ctx.shadowBlur = 0; ctx.fillStyle = '#1a0a00';
            ctx.beginPath(); ctx.arc(-r * 0.28, -r * 0.12, r * 0.055, 0, Math.PI * 2); ctx.fill();
            ctx.beginPath(); ctx.arc( r * 0.28, -r * 0.12, r * 0.055, 0, Math.PI * 2); ctx.fill();
            ctx.restore();

            // ── Wicked grin ──────────────────────────────────────────────────
            ctx.save();
            ctx.strokeStyle = '#0a1a00'; ctx.lineWidth = 2.5; ctx.lineCap = 'round';
            ctx.beginPath(); ctx.arc(0, r * 0.18, r * 0.38, 0.2, Math.PI - 0.2); ctx.stroke();
            ctx.fillStyle = '#e8e0c0';
            for (let i = 0; i < 5; i++) {
                const ta = 0.25 + (i / 4) * (Math.PI - 0.5);
                const tx = Math.cos(ta) * r * 0.38;
                const ty = r * 0.18 + Math.sin(ta) * r * 0.38;
                ctx.beginPath();
                ctx.moveTo(tx - 3, ty); ctx.lineTo(tx, ty + (i % 2 === 0 ? 8 : 5)); ctx.lineTo(tx + 3, ty);
                ctx.closePath(); ctx.fill();
            }
            ctx.restore();

            // ── Claw hands ───────────────────────────────────────────────────
            const wiggle = Math.sin(frame * 0.14) * 0.18;
            ctx.save();
            for (const side of [-1, 1]) {
                ctx.save();
                ctx.translate(side * r * 0.85, r * 0.28);
                ctx.rotate(side * 0.4 - side * wiggle);
                ctx.fillStyle = '#1d8a2e'; ctx.strokeStyle = '#2a6e1e'; ctx.lineWidth = 2;
                ctx.beginPath(); ctx.arc(0, 0, r * 0.22, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
                ctx.strokeStyle = '#0a3d14';
                for (let i = -1; i <= 1; i++) {
                    const ca = -Math.PI * 0.5 + i * 0.5;
                    ctx.beginPath();
                    ctx.moveTo(Math.cos(ca) * r * 0.22, Math.sin(ca) * r * 0.22);
                    ctx.lineTo(Math.cos(ca) * r * 0.38, Math.sin(ca) * r * 0.38 - 3);
                    ctx.stroke();
                }
                ctx.restore();
            }
            ctx.restore();

            ctx.restore();
        };
    },

    // Override the shoot() projectile with a bomb toss
    customShoot(p) {
        const bombTimer = 90;         // 1.5 s at 60 fps
        const baseRadius = 70;
        const dmg = p.stats.rangeDmg * p.damageMultiplier * 0.65;
        const blastR = baseRadius * (p._bombBlastMult || 1) * (p.stats.blastRadiusMult || 1);

        // Primary bomb toward aim
        const dist = 220;
        const bx = p.x + Math.cos(p.aimAngle) * dist;
        const by = p.y + Math.sin(p.aimAngle) * dist;

        p._goblinBombs.push({ x: bx, y: by, timer: bombTimer, maxTimer: bombTimer, radius: blastR, dmg });

        // Cluster extra bombs (upgrade)
        for (let i = 0; i < (p._extraBombs || 0); i++) {
            const spread = (i % 2 === 0 ? 1 : -1) * (0.35 + i * 0.2);
            const cx = p.x + Math.cos(p.aimAngle + spread) * dist;
            const cy = p.y + Math.sin(p.aimAngle + spread) * dist;
            p._goblinBombs.push({ x: cx, y: cy, timer: bombTimer, maxTimer: bombTimer, radius: blastR * 0.7, dmg: dmg * 0.6 });
        }

        // Cooldown matches the base ranged cooldown
        p.rangeCooldown = p.stats.rangeCd * p.cooldownMultiplier;

        return true;
    },

    // Special: magnet pull — suck nearby enemies in, then scatter bombs around player
    customSpecial(p) {
        const pullRange = 500;
        const pullStrength = 240; // pixels pulled per activation

        // Pull all nearby targets toward player
        const _targets = [...(enemies || []), ...(window.additionalPlayers || [])];
        _targets.forEach(e => {
            if ((e.isDead) || e.hp <= 0) return;
            const dist = Math.hypot(e.x - p.x, e.y - p.y);
            if (dist < pullRange && dist > 1) {
                const ratio = pullStrength / dist;
                e.x += (p.x - e.x) * Math.min(ratio, 1);
                e.y += (p.y - e.y) * Math.min(ratio, 1);
                e.x = Math.max(e.radius, Math.min(arena.width  - e.radius, e.x));
                e.y = Math.max(e.radius, Math.min(arena.height - e.radius, e.y));
            }
        });

        // Scatter 5 short-fuse bombs around the player
        const blastR = 75 * (p._bombBlastMult || 1);
        const dmg    = p.stats.rangeDmg * p.damageMultiplier * 0.8;
        for (let i = 0; i < 5; i++) {
            const angle = (Math.PI * 2 / 5) * i;
            const bx = p.x + Math.cos(angle) * 100;
            const by = p.y + Math.sin(angle) * 100;
            p._goblinBombs.push({ x: bx, y: by, timer: 35, maxTimer: 35, radius: blastR, dmg });
        }

        p.invincibleTimer = 20;

        if (typeof triggerImpact    !== 'undefined') triggerImpact(3, 10, 0.3, 0.55, 300);
        if (typeof audioManager     !== 'undefined') audioManager.play('boss_stomp');
        if (typeof showNotification !== 'undefined') showNotification('TRICK OR TREAT!');
        return true;
    },

    // Ultimate: magnet pull then bomb ring
    customUltimate(p) {
        if (typeof showNotification !== 'undefined') showNotification('MANIC BOMB STORM!');
        if (typeof triggerImpact !== 'undefined') triggerImpact(5, 14, 0.4, 0.7, 400);

        // Step 1: pull enemies toward player
        [...(enemies || []), ...(window.additionalPlayers || [])].forEach(e => {
            if ((e.isDead) || e.hp <= 0) return;
            const dist = Math.hypot(e.x - p.x, e.y - p.y);
            if (dist < 400 && dist > 1) {
                const pull = 2.2 * p.damageMultiplier;
                e.x += (p.x - e.x) / dist * pull * 60;
                e.y += (p.y - e.y) / dist * pull * 60;
                e.x = Math.max(e.radius, Math.min(arena.width  - e.radius, e.x));
                e.y = Math.max(e.radius, Math.min(arena.height - e.radius, e.y));
            }
        });

        // Step 2: ring of 8 bombs detonating around the player with a short delay
        const blastR = 85 * (p._bombBlastMult || 1);
        const dmg    = p.stats.rangeDmg * p.damageMultiplier * 1.1;
        for (let i = 0; i < 8; i++) {
            const angle = (Math.PI * 2 / 8) * i;
            const bx = p.x + Math.cos(angle) * 130;
            const by = p.y + Math.sin(angle) * 130;
            // Short fuse for ultimate bombs
            p._goblinBombs.push({ x: bx, y: by, timer: 30, maxTimer: 30, radius: blastR, dmg });
        }

        if (typeof audioManager !== 'undefined') audioManager.play('boss_stomp');
        return true;
    },

    // Called every frame by update() hook
    update(p, dt) {
        // Tick pending bombs
        for (let i = p._goblinBombs.length - 1; i >= 0; i--) {
            const b = p._goblinBombs[i];
            b.timer--;

            if (b.timer <= 0) {
                // Detonate
                if (typeof createExplosion !== 'undefined') createExplosion(b.x, b.y, '#e67e22');
                if (typeof audioManager !== 'undefined') audioManager.play('boss_stomp');

                const _bombTargets = [...(enemies || []), ...(window.additionalPlayers || [])];
                _bombTargets.forEach(e => {
                    if ((e.isDead) || e.hp <= 0) return;
                    if (Math.hypot(e.x - b.x, e.y - b.y) < b.radius + e.radius) {
                        const isCrit = Math.random() < p.critChance;
                        const dmg = b.dmg * (isCrit ? p.critMultiplier : 1) * (1 - (e.damageReduction || 0));
                        e.hp -= dmg;
                        if (typeof floatingTexts !== 'undefined')
                            floatingTexts.push(new FloatingText(e.x, e.y - 20, Math.ceil(dmg), isCrit ? '#ffd700' : '#e67e22', isCrit ? 26 : 20));
                    }
                });

                p._goblinBombs.splice(i, 1);
            }
        }
    },

    // Draw pending bomb indicators (canvas is in world-space — use world coords directly)
    drawOverlay(p, ctx) {
        if (!p._goblinBombs || p._goblinBombs.length === 0) return;
        ctx.save();
        p._goblinBombs.forEach(b => {
            const pct   = 1 - (b.timer / b.maxTimer);
            const alpha = 0.25 + pct * 0.45;
            ctx.beginPath();
            ctx.arc(b.x, b.y, b.radius * pct, 0, Math.PI * 2);
            ctx.strokeStyle = `rgba(230, 103, 34, ${alpha})`;
            ctx.lineWidth = 2;
            ctx.stroke();
            ctx.font = '18px Arial';
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            ctx.globalAlpha = 0.85;
            ctx.fillText('💣', b.x, b.y);
            ctx.globalAlpha = 1;
        });
        ctx.restore();
    },

    applyUpgrade(p, id) {
        if (id === 'radius')    { p._bombBlastMult = (p._bombBlastMult || 1) * 1.25; return true; }
        if (id === 'projectile'){ p._extraBombs    = (p._extraBombs || 0) + 1;       return true; }
        if (id === 'transform') {
            // Level-10 "ultimate form" for Green Goblin = activate the bomb storm
            window.HERO_LOGIC['green_goblin'].customUltimate(p);
            return true;
        }
        return false;
    },

    getFormName() { return 'MANIC GOBLIN'; },
};


// ─────────────────────────────────────────────────────────────────────────────
// MAKUTA
//   Attack  — shadow barrage projectile (fast, high damage, pierces once)
//   Special — blink teleport to aim point (capped range)
//   Ultimate— shadow sweep: spinning 240° laser arc
// ─────────────────────────────────────────────────────────────────────────────
window.HERO_LOGIC['makuta'] = {
    upgradePool: [
        { id: 'damage',   title: 'Shadow Power',   desc: 'Increase all damage dealt by 12%.',          icon: '🌑' },
        { id: 'speed',    title: 'Void Step',      desc: 'Increase Movement Speed by 10%.',            icon: '🌫️' },
        { id: 'cooldown', title: 'Dark Mastery',   desc: 'Reduce ability cooldowns by 12%.',           icon: '⏩' },
        { id: 'health',   title: 'Shadow Essence', desc: 'Increase Max HP by 40 and Heal 20%.',        icon: '💀' },
        { id: 'defense',  title: 'Void Shell',     desc: 'Reduce incoming damage by 7%.',              icon: '🛡️' },
        { id: 'crit',     title: 'Shadow Strike',  desc: '+6% Crit Chance & +30% Crit Damage.',        icon: '🎯' },
        { id: 'radius',   title: 'Sweep Width',    desc: 'Increase sweep laser arc by 30°.',           icon: '🔄' },
        { id: 'projectile',title:'Barrage',        desc: 'Fire +1 additional shadow bolt per attack.', icon: '🏹' },
    ],

    init(p) {
        p._sweepExtraAngle = 0;     // degrees added by upgrade
        p._sweepActive     = false;
        p._sweepTimer      = 0;
        p._sweepDuration   = 90;    // 1.5 s at 60 fps
        p._sweepAngle      = 0;
        p._sweepArcDeg     = 240;
        p._mkTeleportFlash = 0;
        p._mkPulseT        = 0;     // body pulse animation timer
        p._mkHornT         = 0;     // horn sway animation timer

        // Increase collision radius to fit boss-like art
        p.radius = 34;

        // Fully replace the standard circle draw with boss-style Makuta art
        p.customDraw = function(ctx) {
            const mx = this.x, my = this.y, mr = this.radius;
            this._mkPulseT = (this._mkPulseT || 0) + 0.06;
            this._mkHornT  = (this._mkHornT  || 0) + 0.025;
            const pulse = 0.5 + 0.5 * Math.sin(this._mkPulseT);
            const hsway = Math.sin(this._mkHornT) * 0.07;

            ctx.save();
            ctx.translate(mx, my);
            ctx.rotate(this.aimAngle);

            // ── Dark aura / corona ───────────────────────────────────────────
            const coronaGrad = ctx.createRadialGradient(0, 0, mr * 0.6, 0, 0, mr * 1.65);
            coronaGrad.addColorStop(0, `rgba(80,0,100,${0.25 + 0.15 * pulse})`);
            coronaGrad.addColorStop(0.6, `rgba(30,0,50,${0.15 + 0.08 * pulse})`);
            coronaGrad.addColorStop(1, 'rgba(0,0,0,0)');
            ctx.fillStyle = coronaGrad;
            ctx.beginPath(); ctx.arc(0, 0, mr * 1.65, 0, Math.PI * 2); ctx.fill();

            // ── Glow ring ────────────────────────────────────────────────────
            ctx.save();
            ctx.shadowColor = '#660088'; ctx.shadowBlur = 28 + 20 * pulse;
            ctx.strokeStyle = '#660088'; ctx.lineWidth = 2; ctx.globalAlpha = 0.7;
            ctx.beginPath(); ctx.arc(0, 0, mr + 6, 0, Math.PI * 2); ctx.stroke();
            ctx.restore();

            // ── Mask body ────────────────────────────────────────────────────
            ctx.save();
            ctx.shadowColor = '#000'; ctx.shadowBlur = 16;
            const mg = ctx.createRadialGradient(-mr * 0.2, -mr * 0.3, mr * 0.05, 0, 0, mr);
            mg.addColorStop(0, '#2a0030'); mg.addColorStop(0.5, '#110018'); mg.addColorStop(1, '#060008');
            ctx.fillStyle = mg;
            ctx.beginPath();
            ctx.moveTo(-mr * 0.72,  mr * 0.65); ctx.lineTo(-mr * 0.55,  mr * 0.85);
            ctx.lineTo(          0,  mr * 0.95); ctx.lineTo( mr * 0.55,  mr * 0.85);
            ctx.lineTo( mr * 0.72,  mr * 0.65); ctx.lineTo( mr * 1.00,  mr * 0.10);
            ctx.lineTo( mr * 0.95, -mr * 0.30); ctx.lineTo( mr * 0.65, -mr * 0.75);
            ctx.lineTo( mr * 0.22, -mr * 0.95); ctx.lineTo(          0, -mr * 1.00);
            ctx.lineTo(-mr * 0.22, -mr * 0.95); ctx.lineTo(-mr * 0.65, -mr * 0.75);
            ctx.lineTo(-mr * 0.95, -mr * 0.30); ctx.lineTo(-mr * 1.00,  mr * 0.10);
            ctx.closePath(); ctx.fill();
            ctx.restore();

            // ── Mask outline ─────────────────────────────────────────────────
            ctx.save();
            ctx.strokeStyle = '#330044'; ctx.lineWidth = 2.5;
            ctx.beginPath();
            ctx.moveTo(-mr * 0.72,  mr * 0.65); ctx.lineTo(-mr * 0.55,  mr * 0.85);
            ctx.lineTo(          0,  mr * 0.95); ctx.lineTo( mr * 0.55,  mr * 0.85);
            ctx.lineTo( mr * 0.72,  mr * 0.65); ctx.lineTo( mr * 1.00,  mr * 0.10);
            ctx.lineTo( mr * 0.95, -mr * 0.30); ctx.lineTo( mr * 0.65, -mr * 0.75);
            ctx.lineTo( mr * 0.22, -mr * 0.95); ctx.lineTo(          0, -mr * 1.00);
            ctx.lineTo(-mr * 0.22, -mr * 0.95); ctx.lineTo(-mr * 0.65, -mr * 0.75);
            ctx.lineTo(-mr * 0.95, -mr * 0.30); ctx.lineTo(-mr * 1.00,  mr * 0.10);
            ctx.closePath(); ctx.stroke();
            ctx.restore();

            // ── Crown horns ──────────────────────────────────────────────────
            ctx.save();
            ctx.rotate(hsway);
            ctx.shadowColor = '#bb00ee'; ctx.shadowBlur = 12 + 8 * pulse;
            ctx.fillStyle = '#440055'; ctx.strokeStyle = '#220033'; ctx.lineWidth = 1.5;
            // Center-left horn
            ctx.beginPath(); ctx.moveTo(-mr * 0.20, -mr * 0.92); ctx.lineTo(-mr * 0.36, -mr * 1.72); ctx.lineTo(-mr * 0.08, -mr * 0.98); ctx.closePath(); ctx.fill(); ctx.stroke();
            // Center-right horn
            ctx.beginPath(); ctx.moveTo( mr * 0.20, -mr * 0.92); ctx.lineTo( mr * 0.36, -mr * 1.72); ctx.lineTo( mr * 0.08, -mr * 0.98); ctx.closePath(); ctx.fill(); ctx.stroke();
            // Outer-left horn
            ctx.beginPath(); ctx.moveTo(-mr * 0.55, -mr * 0.72); ctx.lineTo(-mr * 0.74, -mr * 1.28); ctx.lineTo(-mr * 0.42, -mr * 0.76); ctx.closePath(); ctx.fill(); ctx.stroke();
            // Outer-right horn
            ctx.beginPath(); ctx.moveTo( mr * 0.55, -mr * 0.72); ctx.lineTo( mr * 0.74, -mr * 1.28); ctx.lineTo( mr * 0.42, -mr * 0.76); ctx.closePath(); ctx.fill(); ctx.stroke();
            ctx.restore();

            // ── Eye slits (V-shaped, angled inward) ──────────────────────────
            const eyeW = mr * 0.085;
            const ePulse = 0.80 + 0.20 * Math.sin(frame * 0.18);
            ctx.save();
            ctx.lineCap = 'round';
            // Shadow under eyes
            ctx.shadowBlur = 0; ctx.strokeStyle = '#000'; ctx.lineWidth = eyeW + 4;
            ctx.beginPath(); ctx.moveTo(-mr * 0.52, -mr * 0.22); ctx.lineTo(-mr * 0.20, -mr * 0.42); ctx.stroke();
            ctx.beginPath(); ctx.moveTo( mr * 0.52, -mr * 0.22); ctx.lineTo( mr * 0.20, -mr * 0.42); ctx.stroke();
            // Glowing fill
            ctx.shadowColor = '#ff4400'; ctx.shadowBlur = 20;
            ctx.strokeStyle = '#ff3300'; ctx.lineWidth = eyeW; ctx.globalAlpha = 0.85 * ePulse;
            ctx.beginPath(); ctx.moveTo(-mr * 0.52, -mr * 0.22); ctx.lineTo(-mr * 0.20, -mr * 0.42); ctx.stroke();
            ctx.beginPath(); ctx.moveTo( mr * 0.52, -mr * 0.22); ctx.lineTo( mr * 0.20, -mr * 0.42); ctx.stroke();
            ctx.restore();

            // ── Jagged mouth ─────────────────────────────────────────────────
            ctx.save();
            ctx.strokeStyle = '#220033'; ctx.lineWidth = 2.5; ctx.lineCap = 'butt';
            ctx.beginPath();
            ctx.moveTo(-mr * 0.42, mr * 0.38); ctx.lineTo(-mr * 0.20, mr * 0.52);
            ctx.lineTo(0, mr * 0.42); ctx.lineTo(mr * 0.20, mr * 0.52);
            ctx.lineTo(mr * 0.42, mr * 0.38); ctx.stroke();
            ctx.restore();

            ctx.restore();
        };
    },

    // Override shoot — shadow bolt with pierce
    customShoot(p) {
        const dmg    = p.stats.rangeDmg * p.damageMultiplier * 0.40;
        const speed  = p.stats.projectileSpeed;
        const size   = p.stats.projectileSize;
        const pierce = 1 + Math.floor((p.stats.pierce || 0));
        const cd     = p.stats.rangeCd * p.cooldownMultiplier;

        const angles = [p.aimAngle];
        for (let i = 0; i < (p.stats.extraProjectiles || 0); i++) {
            const spread = (i % 2 === 0 ? 1 : -1) * (0.22 + Math.floor(i / 2) * 0.18);
            angles.push(p.aimAngle + spread);
        }

        angles.forEach(a => {
            const isCrit = Math.random() < p.critChance;
            const finalDmg = isCrit ? dmg * p.critMultiplier : dmg;
            const proj = new Projectile(
                p.x, p.y,
                { x: Math.cos(a) * speed, y: Math.sin(a) * speed },
                finalDmg,
                '#8e44ad', size + 2, 'makuta', 0, false
            );
            proj.ownerIsPlayer = true;
            proj.isCrit = isCrit;
            proj.outlineColor = '#cc00ff';
            projectiles.push(proj);
        });

        if (typeof audioManager !== 'undefined') audioManager.play('boss_makuta_shadow_beam');

        p.rangeCooldown = cd;
        return true;
    },

    // Special: shadow nova — ring of shadow projectiles + aimed beams toward nearest enemy
    customSpecial(p) {
        const baseDmg  = p.stats.rangeDmg * p.damageMultiplier;
        const speed    = p.stats.projectileSpeed;
        const size     = p.stats.projectileSize;

        // Outward ring of 16 shadow bolts
        if (typeof audioManager !== 'undefined') audioManager.play('boss_makuta_shadow_nova');
        const ringCount = 16;
        for (let i = 0; i < ringCount; i++) {
            const a = (Math.PI * 2 / ringCount) * i;
            const proj = new Projectile(
                p.x, p.y,
                { x: Math.cos(a) * (speed * 0.7), y: Math.sin(a) * (speed * 0.7) },
                baseDmg * 0.28,
                '#550066', size + 1, 'makuta', 0, false
            );
            proj.ownerIsPlayer = true;
            projectiles.push(proj);
        }

        // 3 aimed shadow beams toward nearest enemy (or aim direction if none)
        const allTargets = [...(window.additionalPlayers || []).filter(e => !e.isDead && e.hp > 0)];
        let aimTarget = null;
        if (allTargets.length > 0) {
            allTargets.sort((a, b) => Math.hypot(a.x - p.x, a.y - p.y) - Math.hypot(b.x - p.x, b.y - p.y));
            aimTarget = allTargets[0];
        }
        const baseAngle = aimTarget
            ? Math.atan2(aimTarget.y - p.y, aimTarget.x - p.x)
            : p.aimAngle;

        if (typeof audioManager !== 'undefined') audioManager.play('boss_makuta_shadow_beam');
        for (let s = -1; s <= 1; s++) {
            const a = baseAngle + s * 0.2;
            const proj = new Projectile(
                p.x, p.y,
                { x: Math.cos(a) * (speed * 1.4), y: Math.sin(a) * (speed * 1.4) },
                baseDmg * 0.8,
                '#ff0055', size + 3, 'makuta', 0, false
            );
            proj.ownerIsPlayer = true;
            projectiles.push(proj);
        }

        p.invincibleTimer = 18;
        if (typeof triggerImpact    !== 'undefined') triggerImpact(4, 12, 0.4, 0.7, 350);
        if (typeof showNotification !== 'undefined') showNotification('SHADOW NOVA!');
        return true;
    },

    // Ultimate: shadow sweep laser arc
    customUltimate(p) {
        if (p._sweepActive) return false;   // already sweeping

        p._sweepActive   = true;
        p._sweepTimer    = p._sweepDuration;
        p._sweepAngle    = p.aimAngle - ((p._sweepArcDeg + p._sweepExtraAngle) / 2) * (Math.PI / 180);
        p.invincibleTimer = p._sweepDuration;

        if (typeof showNotification !== 'undefined') showNotification('SHADOW SWEEP!');
        if (typeof triggerImpact !== 'undefined') triggerImpact(6, 18, 0.5, 0.85, 500);
        if (typeof audioManager !== 'undefined') audioManager.play('boss_makuta_shadow_nova');
        return true;
    },

    update(p, dt) {
        if (p._mkTeleportFlash > 0) p._mkTeleportFlash--;

        if (!p._sweepActive) return;

        p._sweepTimer--;

        const progress  = 1 - (p._sweepTimer / p._sweepDuration);
        const totalArc  = (p._sweepArcDeg + p._sweepExtraAngle) * (Math.PI / 180);
        const curAngle  = p._sweepAngle + totalArc * progress;
        const laserLen  = 600;
        const dmgPerFrame = p.stats.rangeDmg * p.damageMultiplier * 0.18;

        // Ray-cast a series of points along the laser
        const steps = 14;
        const _sweepTargets = [...(enemies || []), ...(window.additionalPlayers || [])];
        for (let s = 0; s < steps; s++) {
            const frac = (s + 1) / steps;
            const lx = p.x + Math.cos(curAngle) * laserLen * frac;
            const ly = p.y + Math.sin(curAngle) * laserLen * frac;

            _sweepTargets.forEach(e => {
                if ((e.isDead) || e.hp <= 0) return;
                if (Math.hypot(e.x - lx, e.y - ly) < e.radius + 14) {
                    e.hp -= dmgPerFrame;
                    if (typeof floatingTexts !== 'undefined' && Math.random() < 0.08)
                        floatingTexts.push(new FloatingText(e.x, e.y - 20, Math.ceil(dmgPerFrame), '#8e44ad', 18));
                }
            });
        }

        // Visual: draw handled in drawOverlay
        if (p._sweepTimer <= 0) {
            p._sweepActive = false;
            if (typeof createExplosion !== 'undefined') createExplosion(p.x, p.y, '#8e44ad');
        }
    },

    // Canvas is in world-space when drawOverlay is called — use world coords directly
    drawOverlay(p, ctx) {
        // Teleport flash
        if (p._mkTeleportFlash > 0) {
            ctx.save();
            ctx.globalAlpha = p._mkTeleportFlash / 12 * 0.6;
            ctx.beginPath();
            ctx.arc(p.x, p.y, p.radius + 30, 0, Math.PI * 2);
            ctx.fillStyle = '#8e44ad';
            ctx.fill();
            ctx.restore();
        }

        if (!p._sweepActive) return;

        const progress  = 1 - (p._sweepTimer / p._sweepDuration);
        const totalArc  = (p._sweepArcDeg + p._sweepExtraAngle) * (Math.PI / 180);
        const curAngle  = p._sweepAngle + totalArc * progress;
        const laserLen  = 600;

        ctx.save();
        ctx.translate(p.x, p.y);

        // Outer glow
        ctx.beginPath();
        ctx.moveTo(0, 0);
        ctx.lineTo(Math.cos(curAngle) * laserLen, Math.sin(curAngle) * laserLen);
        ctx.strokeStyle = 'rgba(142, 68, 173, 0.35)';
        ctx.lineWidth = 22;
        ctx.lineCap = 'round';
        ctx.stroke();

        // Core beam
        ctx.beginPath();
        ctx.moveTo(0, 0);
        ctx.lineTo(Math.cos(curAngle) * laserLen, Math.sin(curAngle) * laserLen);
        ctx.strokeStyle = '#ffffff';
        ctx.lineWidth = 5;
        ctx.stroke();

        // Swept arc trail
        ctx.beginPath();
        ctx.moveTo(0, 0);
        ctx.arc(0, 0, laserLen * 0.15, p._sweepAngle, curAngle);
        ctx.fillStyle = 'rgba(142, 68, 173, 0.12)';
        ctx.fill();

        ctx.restore();
    },

    applyUpgrade(p, id) {
        if (id === 'radius')     { p._sweepExtraAngle += 30;             return true; }
        if (id === 'projectile') { p.stats.extraProjectiles = (p.stats.extraProjectiles || 0) + 1; return true; }
        if (id === 'transform') {
            // Level-10 "ultimate form" for Makuta = activate shadow sweep
            window.HERO_LOGIC['makuta'].customUltimate(p);
            return true;
        }
        return false;
    },

    getFormName() { return 'SHADOW GOD'; },
};
