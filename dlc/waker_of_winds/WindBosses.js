class WindBosses {
    static isWindBoss(type) {
        return ['CLOUD_GOLEM', 'STORM_CROW', 'TORNADO_MACHINA', 'TEMPEST'].includes(type);
    }

    // ─── INIT ─────────────────────────────────────────────────────────────────
    static init(boss) {
        if (boss.type === 'CLOUD_GOLEM') {
            boss.color  = '#bdc3c7';
            boss.radius = 80;
            boss.maxHp *= 1.5; boss.hp = boss.maxHp;
            boss.speed *= 0.6;
            boss.knockbackResist = 0.9;
            boss.damage *= 1.2;
            boss._hailTimer  = 240;
            boss._stompTimer = 150;

        } else if (boss.type === 'STORM_CROW') {
            boss.color  = '#2c3e50';
            boss.radius = 50;
            boss.maxHp *= 0.8; boss.hp = boss.maxHp;
            boss.speed *= 1.6;
            boss.knockbackResist = 0.1;
            boss._screechQueued = false;

        } else if (boss.type === 'TORNADO_MACHINA') {
            boss.color  = '#1abc9c';
            boss.radius = 70;
            boss.maxHp *= 1.2; boss.hp = boss.maxHp;
            boss.speed *= 0.8;
            boss.tornadoTimer  = 0;
            boss._dashTimer    = 300;
            boss._dashing      = false;
            boss._dashVelX     = 0;
            boss._dashVelY     = 0;
            boss._dashDuration = 0;

        } else if (boss.type === 'TEMPEST') {
            boss.color  = '#8e44ad';
            boss.radius = 90;
            boss.maxHp *= 2.5; boss.hp = boss.maxHp;
            boss.speed *= 1.2;
            boss.knockbackResist = 0.8;
            boss.phase = 1;
            boss._stormRingTimer = 480;
            boss._vortexTimer    = 280;
            boss._rapidTimer     = 0;
            boss._rapidCount     = 0;
        }
    }

    // ─── UPDATE ───────────────────────────────────────────────────────────────
    static update(boss, player, arena) {
        const dist  = Math.hypot(player.x - boss.x, player.y - boss.y);
        const angle = Math.atan2(player.y - boss.y, player.x - boss.x);

        // ── CLOUD GOLEM ──────────────────────────────────────────────────────
        if (boss.type === 'CLOUD_GOLEM') {
            boss.x += Math.cos(angle) * boss.speed;
            boss.y += Math.sin(angle) * boss.speed;

            // Gust push (every ~3.3s via frame)
            if (frame % 200 === 0) {
                if (typeof audioManager !== 'undefined') audioManager.play('gust_push');
                if (typeof createExplosion === 'function') createExplosion(boss.x, boss.y, '#fff');
                player.vx += Math.cos(angle) * 22;
                player.vy += Math.sin(angle) * 22;
                if (typeof showNotification === 'function') showNotification("GUST!");
            }

            // Hailstone burst — 8 radial projectiles every 4s
            boss._hailTimer--;
            if (boss._hailTimer <= 0) {
                boss._hailTimer = 240;
                if (typeof projectiles !== 'undefined' && typeof Projectile !== 'undefined') {
                    for (let i = 0; i < 8; i++) {
                        const a   = (i / 8) * Math.PI * 2;
                        const vel = { x: Math.cos(a) * 5, y: Math.sin(a) * 5 };
                        const p   = new Projectile(boss.x, boss.y, vel, boss.damage * 0.6, '#aed6f1', 10, 'enemy', 0, true);
                        projectiles.push(p);
                    }
                }
                if (typeof audioManager !== 'undefined') audioManager.play('hailstorm_burst');
                if (typeof showNotification === 'function') showNotification("HAILSTORM!");
            }

            // Stomp — close-range AoE shockwave every 2.5s
            boss._stompTimer--;
            if (boss._stompTimer <= 0 && dist < 220) {
                boss._stompTimer = 150;
                if (typeof audioManager !== 'undefined') audioManager.play('cloud_golem_stomp');
                const pushAng = Math.atan2(player.y - boss.y, player.x - boss.x);
                player.vx += Math.cos(pushAng) * 30;
                player.vy += Math.sin(pushAng) * 30;
                if (player.invulnTimer <= 0 && typeof player.takeDamage === 'function') player.takeDamage(boss.damage * 0.5);
                if (typeof createExplosion === 'function') {
                    for (let i = 0; i < 6; i++) {
                        const a = (i / 6) * Math.PI * 2;
                        createExplosion(boss.x + Math.cos(a) * 80, boss.y + Math.sin(a) * 80, '#ecf0f1');
                    }
                }
            } else if (boss._stompTimer <= 0) {
                boss._stompTimer = 60; // Re-check sooner when out of range
            }

        // ── STORM CROW ───────────────────────────────────────────────────────
        } else if (boss.type === 'STORM_CROW') {
            if (!boss.state || boss.state === 'HOVER') {
                const hoverDist = 300;
                const tx = player.x - Math.cos(angle) * hoverDist;
                const ty = player.y - Math.sin(angle) * hoverDist;
                boss.x += (tx - boss.x) * 0.05;
                boss.y += (ty - boss.y) * 0.05;

                if (frame % 120 === 0) {
                    boss.state   = 'DIVE';
                    boss.targetX = player.x;
                    boss.targetY = player.y;
                    if (typeof audioManager !== 'undefined') audioManager.play('crow_dive_screech');
                    if (typeof createExplosion === 'function') createExplosion(boss.x, boss.y, '#2c3e50');
                }
            } else if (boss.state === 'DIVE') {
                const diveAng = Math.atan2(boss.targetY - boss.y, boss.targetX - boss.x);
                boss.x += Math.cos(diveAng) * (boss.speed * 4);
                boss.y += Math.sin(diveAng) * (boss.speed * 4);

                // Storm trail during dive
                if (Math.random() < 0.4 && typeof particles !== 'undefined') {
                    particles.push(new Particle(boss.x, boss.y, '#34495e'));
                }

                if (Math.hypot(boss.targetX - boss.x, boss.targetY - boss.y) < 25) {
                    boss.state = 'HOVER';
                    // Screech on arrival — push player back
                    if (dist < 200) {
                        const pushAng = Math.atan2(player.y - boss.y, player.x - boss.x);
                        player.vx += Math.cos(pushAng) * 25;
                        player.vy += Math.sin(pushAng) * 25;
                        if (typeof audioManager !== 'undefined') audioManager.play('screech_land');
                        if (typeof createExplosion === 'function') createExplosion(boss.x, boss.y, '#f1c40f');
                        if (typeof showNotification === 'function') showNotification("SCREECH!");
                    }
                }
            }

        // ── TORNADO MACHINA ───────────────────────────────────────────────────
        } else if (boss.type === 'TORNADO_MACHINA') {
            if (boss._dashing) {
                boss.x += boss._dashVelX;
                boss.y += boss._dashVelY;
                boss._dashDuration--;
                if (boss._dashDuration <= 0) boss._dashing = false;
            } else {
                boss.x += Math.cos(angle) * boss.speed;
                boss.y += Math.sin(angle) * boss.speed;
            }

            // Tornado projectile spawn every 3s
            boss.tornadoTimer++;
            if (boss.tornadoTimer > 180) {
                boss.tornadoTimer = 0;
                if (typeof audioManager !== 'undefined') audioManager.play('tornado_projectile_spawn');
                if (typeof projectiles !== 'undefined' && typeof Projectile !== 'undefined') {
                    const count = boss.hp < boss.maxHp * 0.5 ? 5 : 3;
                    for (let i = 0; i < count; i++) {
                        const a = (Math.PI * 2 / count) * i + frame * 0.1;
                        const p = new Projectile(boss.x, boss.y, { x: Math.cos(a), y: Math.sin(a) }, 10, '#1abc9c', 20, 'enemy', 0, true);
                        p.life = 600;
                        p.update = function () {
                            this.angle = (this.angle || 0) + 0.1;
                            this.x += this.vx; this.y += this.vy;
                            this.vx *= 1.01; this.vy *= 1.01;
                        };
                        projectiles.push(p);
                    }
                }
            }

            // Spin dash every 5s
            boss._dashTimer--;
            if (boss._dashTimer <= 0 && !boss._dashing) {
                boss._dashTimer    = 300;
                boss._dashing      = true;
                boss._dashDuration = 40;
                boss._dashVelX     = Math.cos(angle) * boss.speed * 5;
                boss._dashVelY     = Math.sin(angle) * boss.speed * 5;
                if (typeof audioManager !== 'undefined') audioManager.play('spin_dash');
                if (typeof showNotification === 'function') showNotification("SPIN DASH!");
                if (typeof createExplosion === 'function') createExplosion(boss.x, boss.y, '#1abc9c');
            }

        // ── TEMPEST (FINAL BOSS) ─────────────────────────────────────────────
        } else if (boss.type === 'TEMPEST') {
            boss.x += Math.cos(angle) * boss.speed;
            boss.y += Math.sin(angle) * boss.speed;

            // Standard projectile
            if (boss.attackCooldown <= 0) {
                if (ctx) {
                    projectiles.push(new Projectile(boss.x, boss.y, { x: Math.cos(angle) * 15, y: Math.sin(angle) * 15 }, boss.damage, '#8e44ad', 10, 'enemy', 0, true));
                }
                boss.attackCooldown = 40;
            } else {
                boss.attackCooldown--;
            }

            // Vortex pull — player is dragged toward boss
            boss._vortexTimer--;
            if (boss._vortexTimer <= 0) {
                boss._vortexTimer = 280;
                if (dist < 450 && dist > boss.radius + 20) {
                    if (typeof audioManager !== 'undefined') audioManager.play('vortex_pull');
                    const pullAng = Math.atan2(boss.y - player.y, boss.x - player.x);
                    player.x += Math.cos(pullAng) * 60;
                    player.y += Math.sin(pullAng) * 60;
                    if (typeof showNotification === 'function') showNotification("VORTEX PULL!");
                    if (typeof createExplosion === 'function') createExplosion(boss.x, boss.y, '#9b59b6');
                }
            }

            // Storm ring — 16 radial projectiles every 8s
            boss._stormRingTimer--;
            if (boss._stormRingTimer <= 0) {
                boss._stormRingTimer = 480;
                if (typeof projectiles !== 'undefined' && typeof Projectile !== 'undefined') {
                    const count = 16;
                    for (let i = 0; i < count; i++) {
                        const a   = (i / count) * Math.PI * 2;
                        const vel = { x: Math.cos(a) * 5, y: Math.sin(a) * 5 };
                        const p   = new Projectile(boss.x, boss.y, vel, boss.damage * 0.7, '#c39bd3', 8, 'enemy', 0, true);
                        projectiles.push(p);
                    }
                }
                if (typeof audioManager !== 'undefined') audioManager.play('eye_of_storm_ring');
                if (typeof showNotification === 'function') showNotification("EYE OF THE STORM!");
            }

            // Phase 2 transition at 50% HP
            if (boss.phase === 1 && boss.hp < boss.maxHp * 0.5) {
                boss.phase = 2;
                boss.speed *= 1.5;
                boss._stormRingTimer = 120; // Immediately trigger storm ring
                if (typeof audioManager !== 'undefined') audioManager.play('tempest_phase2_transition');
                if (typeof showNotification === 'function') showNotification("THE EYE OF THE STORM OPENS!");
                for (let i = 0; i < 4; i++) enemies.push(new Enemy(true));
                if (typeof createExplosion === 'function') {
                    for (let i = 0; i < 8; i++) {
                        const a = (i / 8) * Math.PI * 2;
                        createExplosion(boss.x + Math.cos(a) * boss.radius, boss.y + Math.sin(a) * boss.radius, '#e74c3c');
                    }
                }
            }

            // Phase 2: rapid burst fire every 2s
            if (boss.phase === 2) {
                boss._rapidTimer--;
                if (boss._rapidTimer <= 0 && boss._rapidCount <= 0) {
                    boss._rapidTimer = 120;
                    boss._rapidCount = 6; // Fire 6 quick shots
                }
                if (boss._rapidCount > 0) {
                    boss._rapidCount--;
                    if (ctx && typeof projectiles !== 'undefined') {
                        const spread = (Math.random() - 0.5) * 0.4;
                        const vel    = { x: Math.cos(angle + spread) * 14, y: Math.sin(angle + spread) * 14 };
                        projectiles.push(new Projectile(boss.x, boss.y, vel, boss.damage * 1.2, '#e74c3c', 8, 'enemy', 0, true));
                    }
                }
            }
        }
    }

    // ─── DRAW ─────────────────────────────────────────────────────────────────
    static draw(ctx, boss) {
        ctx.save();
        ctx.translate(boss.x, boss.y);

        if (boss.type === 'CLOUD_GOLEM')      WindBosses._drawCloudGolem(ctx, boss);
        else if (boss.type === 'STORM_CROW')  WindBosses._drawStormCrow(ctx, boss);
        else if (boss.type === 'TORNADO_MACHINA') WindBosses._drawTornadoMachina(ctx, boss);
        else if (boss.type === 'TEMPEST')    WindBosses._drawTempEst(ctx, boss);

        // Hit flash
        if (boss.hitFlash > 0) {
            ctx.globalCompositeOperation = 'source-atop';
            ctx.fillStyle = `rgba(255, 255, 255, ${boss.hitFlash / 10})`;
            ctx.fillRect(-boss.radius - 40, -boss.radius - 40, (boss.radius + 40) * 2, (boss.radius + 40) * 2);
            ctx.globalCompositeOperation = 'source-over';
        }

        ctx.restore();
    }

    // ── CLOUD GOLEM ───────────────────────────────────────────────────────────
    static _drawCloudGolem(ctx, boss) {
        const r = boss.radius;
        const t = Date.now() / 1000;

        // Outer cloud puffs — slowly rotating
        ctx.save();
        ctx.rotate(t * 0.15);
        ctx.fillStyle = 'rgba(220, 228, 235, 0.75)';
        for (let i = 0; i < 8; i++) {
            const a    = (Math.PI * 2 / 8) * i;
            const cr   = r * 0.55;
            const cx   = Math.cos(a) * r * 0.62;
            const cy   = Math.sin(a) * r * 0.62;
            const puff = r * 0.48 + Math.sin(t * 1.5 + i) * 5;
            ctx.beginPath(); ctx.arc(cx, cy, puff, 0, Math.PI * 2); ctx.fill();
        }
        ctx.restore();

        // Inner cloud layer — counter-rotating
        ctx.save();
        ctx.rotate(-t * 0.08);
        ctx.fillStyle = 'rgba(236, 240, 241, 0.55)';
        for (let i = 0; i < 5; i++) {
            const a  = (Math.PI * 2 / 5) * i + 0.3;
            const cx = Math.cos(a) * r * 0.35;
            const cy = Math.sin(a) * r * 0.35;
            ctx.beginPath(); ctx.arc(cx, cy, r * 0.38, 0, Math.PI * 2); ctx.fill();
        }
        ctx.restore();

        // Stone core — 3D granite sphere
        const coreR = r * 0.72;
        const sg = ctx.createRadialGradient(-coreR * 0.3, -coreR * 0.3, coreR * 0.05, 0, 0, coreR);
        sg.addColorStop(0,    '#d0d3d4');
        sg.addColorStop(0.5,  '#808b96');
        sg.addColorStop(1,    '#424949');
        ctx.beginPath(); ctx.arc(0, 0, coreR, 0, Math.PI * 2);
        ctx.fillStyle = sg; ctx.fill();
        ctx.strokeStyle = '#2c3e50'; ctx.lineWidth = 2; ctx.stroke();

        // Stone crack lines on the core
        ctx.strokeStyle = 'rgba(0,0,0,0.35)'; ctx.lineWidth = 1.5;
        ctx.beginPath(); ctx.moveTo(-coreR * 0.1, -coreR * 0.4); ctx.lineTo(coreR * 0.2, coreR * 0.3); ctx.stroke();
        ctx.beginPath(); ctx.moveTo(-coreR * 0.3, coreR * 0.1); ctx.lineTo(-coreR * 0.6, coreR * 0.5); ctx.stroke();

        // Lightning eyes — glowing blue-white slits
        const eyeGlow = 0.7 + Math.sin(t * 4) * 0.3;
        ctx.save();
        ctx.shadowColor = '#85c1e9'; ctx.shadowBlur = 14;
        ctx.strokeStyle = `rgba(133, 193, 233, ${eyeGlow})`;
        ctx.lineWidth = 3; ctx.lineCap = 'round';
        // Dark outline first
        ctx.shadowBlur = 0; ctx.strokeStyle = '#000'; ctx.lineWidth = 5;
        ctx.beginPath(); ctx.moveTo(-coreR*0.35, -coreR*0.18); ctx.lineTo(-coreR*0.12, -coreR*0.28); ctx.stroke();
        ctx.beginPath(); ctx.moveTo( coreR*0.12, -coreR*0.28); ctx.lineTo( coreR*0.35, -coreR*0.18); ctx.stroke();
        // Glow pass
        ctx.shadowColor = '#aed6f1'; ctx.shadowBlur = 14;
        ctx.strokeStyle = '#d6eaf8'; ctx.lineWidth = 3;
        ctx.beginPath(); ctx.moveTo(-coreR*0.35, -coreR*0.18); ctx.lineTo(-coreR*0.12, -coreR*0.28); ctx.stroke();
        ctx.beginPath(); ctx.moveTo( coreR*0.12, -coreR*0.28); ctx.lineTo( coreR*0.35, -coreR*0.18); ctx.stroke();
        ctx.restore();
    }

    // ── STORM CROW ────────────────────────────────────────────────────────────
    static _drawStormCrow(ctx, boss) {
        const r     = boss.radius;
        const t     = Date.now() / 1000;
        const flap  = Math.sin(t * 8) * 22;
        const isDiving = boss.state === 'DIVE';

        // Orient crow to face the player
        ctx.rotate(Math.atan2(player.y - boss.y, player.x - boss.x) + Math.PI / 2);

        // Motion blur during dive
        if (isDiving) {
            ctx.save();
            ctx.globalAlpha = 0.15;
            for (let trail = 1; trail <= 3; trail++) {
                ctx.fillStyle = '#34495e';
                ctx.beginPath();
                ctx.moveTo(0, -r * 0.8 + trail * 10);
                ctx.lineTo(r * 0.55, r * 0.5 + trail * 6);
                ctx.lineTo(0, r * 0.9 + trail * 8);
                ctx.lineTo(-r * 0.55, r * 0.5 + trail * 6);
                ctx.closePath(); ctx.fill();
            }
            ctx.restore();
        }

        // Left wing — gradient dark feathers
        const wg = ctx.createLinearGradient(-r * 1.2, 0, 0, 0);
        wg.addColorStop(0, '#1a252f'); wg.addColorStop(0.6, '#2c3e50'); wg.addColorStop(1, '#34495e');
        ctx.fillStyle = wg;
        ctx.beginPath();
        ctx.moveTo(-r * 0.5, r * 0.3);
        ctx.lineTo(-r * 1.2, r * 0.35 + flap);
        ctx.lineTo(-r * 0.9, r * 0.65 + flap * 0.5);
        ctx.lineTo(-r * 0.3, r * 0.75);
        ctx.closePath(); ctx.fill();

        // Right wing — mirrored
        const wg2 = ctx.createLinearGradient(0, 0, r * 1.2, 0);
        wg2.addColorStop(0, '#34495e'); wg2.addColorStop(0.4, '#2c3e50'); wg2.addColorStop(1, '#1a252f');
        ctx.fillStyle = wg2;
        ctx.beginPath();
        ctx.moveTo(r * 0.5, r * 0.3);
        ctx.lineTo(r * 1.2, r * 0.35 + flap);
        ctx.lineTo(r * 0.9, r * 0.65 + flap * 0.5);
        ctx.lineTo(r * 0.3, r * 0.75);
        ctx.closePath(); ctx.fill();

        // Body — elongated raptor shape with 3D gradient
        const bg = ctx.createRadialGradient(-r * 0.1, -r * 0.2, r * 0.05, 0, 0, r * 0.8);
        bg.addColorStop(0,   '#4a6174');
        bg.addColorStop(0.5, '#2c3e50');
        bg.addColorStop(1,   '#1a252f');
        ctx.fillStyle = bg;
        ctx.beginPath();
        ctx.moveTo(0, -r * 0.85);          // beak tip
        ctx.lineTo(r * 0.22, -r * 0.5);   // head right
        ctx.lineTo(r * 0.48, r * 0.4);    // body right
        ctx.lineTo(r * 0.15, r * 0.9);    // tail right
        ctx.lineTo(0, r * 0.75);          // tail center
        ctx.lineTo(-r * 0.15, r * 0.9);   // tail left
        ctx.lineTo(-r * 0.48, r * 0.4);   // body left
        ctx.lineTo(-r * 0.22, -r * 0.5);  // head left
        ctx.closePath(); ctx.fill();
        ctx.strokeStyle = '#111'; ctx.lineWidth = 1.5; ctx.stroke();

        // Tail feather spikes
        ctx.fillStyle = '#1a252f';
        for (let i = -2; i <= 2; i++) {
            ctx.beginPath();
            ctx.moveTo(i * r * 0.12, r * 0.75);
            ctx.lineTo(i * r * 0.18, r * 1.1);
            ctx.lineTo((i + (i < 0 ? 1 : -1)) * r * 0.05, r * 0.85);
            ctx.closePath(); ctx.fill();
        }

        // Glowing eyes — sharp angled yellow slits
        ctx.save();
        ctx.shadowColor = '#f4d03f'; ctx.shadowBlur = 10;
        // Dark outline
        ctx.strokeStyle = '#000'; ctx.lineWidth = 4; ctx.lineCap = 'round';
        ctx.beginPath(); ctx.moveTo(-r*0.22, -r*0.52); ctx.lineTo(-r*0.08, -r*0.60); ctx.stroke();
        ctx.beginPath(); ctx.moveTo( r*0.08, -r*0.60); ctx.lineTo( r*0.22, -r*0.52); ctx.stroke();
        // Yellow slit
        ctx.strokeStyle = '#f1c40f'; ctx.lineWidth = 2.5;
        ctx.beginPath(); ctx.moveTo(-r*0.22, -r*0.52); ctx.lineTo(-r*0.08, -r*0.60); ctx.stroke();
        ctx.beginPath(); ctx.moveTo( r*0.08, -r*0.60); ctx.lineTo( r*0.22, -r*0.52); ctx.stroke();
        ctx.restore();
    }

    // ── TORNADO MACHINA ───────────────────────────────────────────────────────
    static _drawTornadoMachina(ctx, boss) {
        const r       = boss.radius;
        const t       = Date.now() / 1000;
        const spin    = t * (boss._dashing ? 6 : 2);
        const phase2  = boss.hp < boss.maxHp * 0.5;
        const accentC = phase2 ? '#e74c3c' : '#1abc9c';
        const coreC   = phase2 ? '#c0392b' : '#16a085';

        ctx.save(); ctx.rotate(spin);

        // Outer armor ring — dark metallic with glow
        ctx.strokeStyle = accentC; ctx.lineWidth = 7;
        ctx.shadowColor = accentC; ctx.shadowBlur = phase2 ? 14 : 8;
        ctx.beginPath(); ctx.arc(0, 0, r, 0, Math.PI * 2); ctx.stroke();
        ctx.shadowBlur = 0;

        // Bolt details on outer ring
        ctx.fillStyle = '#555';
        for (let i = 0; i < 8; i++) {
            const a = (Math.PI * 2 / 8) * i;
            ctx.beginPath(); ctx.arc(Math.cos(a) * r, Math.sin(a) * r, 4, 0, Math.PI * 2); ctx.fill();
        }

        // Mid ring
        const mrg = ctx.createLinearGradient(-r * 0.6, -r * 0.6, r * 0.6, r * 0.6);
        mrg.addColorStop(0, '#5d6d7e'); mrg.addColorStop(1, '#2c3e50');
        ctx.beginPath(); ctx.arc(0, 0, r * 0.68, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(26,188,156, ${phase2 ? 0 : 0.12})`; ctx.fill();
        ctx.strokeStyle = '#7f8c8d'; ctx.lineWidth = 3; ctx.stroke();

        // 4 curved turbine blades
        for (let i = 0; i < 4; i++) {
            ctx.save(); ctx.rotate((Math.PI / 2) * i);
            const bg = ctx.createLinearGradient(r * 0.6, -14, r + 32, 14);
            bg.addColorStop(0, '#7f8c8d'); bg.addColorStop(0.5, '#95a5a6'); bg.addColorStop(1, '#5d6d7e');
            ctx.fillStyle = bg;
            ctx.beginPath();
            ctx.moveTo(r * 0.65, -10);
            ctx.quadraticCurveTo(r + 20, -16, r + (phase2 ? 38 : 28), 0);
            ctx.quadraticCurveTo(r + 20,  14, r * 0.65, 12);
            ctx.closePath(); ctx.fill();
            ctx.strokeStyle = accentC; ctx.lineWidth = 1; ctx.stroke();
            ctx.restore();
        }

        // Turbine core — glowing energy
        const cg = ctx.createRadialGradient(0, 0, 0, 0, 0, r * 0.38);
        cg.addColorStop(0,   phase2 ? '#ff6b6b' : '#a3e4d7');
        cg.addColorStop(0.5, coreC);
        cg.addColorStop(1,   '#1a2b2b');
        ctx.beginPath(); ctx.arc(0, 0, r * 0.38, 0, Math.PI * 2);
        ctx.fillStyle = cg; ctx.fill();
        ctx.shadowColor = accentC; ctx.shadowBlur = phase2 ? 20 : 12;
        ctx.strokeStyle = accentC; ctx.lineWidth = 2; ctx.stroke();
        ctx.shadowBlur = 0;

        ctx.restore();

        // Eye slits — dark outline then glow
        ctx.save();
        ctx.shadowColor = accentC; ctx.shadowBlur = 8;
        const slitW = Math.max(2, r * 0.07);
        ctx.strokeStyle = '#000'; ctx.lineWidth = slitW + 3; ctx.lineCap = 'round';
        ctx.beginPath(); ctx.moveTo(-r*0.16, -r*0.10); ctx.lineTo(-r*0.38, -r*0.28); ctx.stroke();
        ctx.beginPath(); ctx.moveTo( r*0.16, -r*0.10); ctx.lineTo( r*0.38, -r*0.28); ctx.stroke();
        ctx.strokeStyle = accentC; ctx.lineWidth = slitW;
        ctx.beginPath(); ctx.moveTo(-r*0.16, -r*0.10); ctx.lineTo(-r*0.38, -r*0.28); ctx.stroke();
        ctx.beginPath(); ctx.moveTo( r*0.16, -r*0.10); ctx.lineTo( r*0.38, -r*0.28); ctx.stroke();
        ctx.restore();
    }

    // ── TEMPEST (FINAL BOSS) ─────────────────────────────────────────────────
    static _drawTempEst(ctx, boss) {
        const r      = boss.radius;
        const t      = Date.now() / 1000;
        const phase2 = boss.phase === 2;
        const hpFrac = boss.hp / boss.maxHp;
        const spinFast = phase2 ? 1.8 : 1.0;

        const outerC  = phase2 ? '#922b21' : '#7d3c98';
        const midC    = phase2 ? '#e74c3c' : '#8e44ad';
        const accentC = phase2 ? '#ff6b6b' : '#c39bd3';

        // Outermost pulsing danger ring
        ctx.beginPath(); ctx.arc(0, 0, r * (1.4 + Math.sin(t * 4) * 0.06), 0, Math.PI * 2);
        ctx.strokeStyle = `rgba(${phase2 ? '231,76,60' : '142,68,173'}, ${0.20 + Math.sin(t * 3) * 0.08})`;
        ctx.lineWidth = 5; ctx.stroke();

        // Outer storm bands — 3 counter-rotating arcs
        for (let band = 0; band < 3; band++) {
            ctx.save();
            ctx.rotate(t * spinFast * (band % 2 === 0 ? 1 : -1) + band * 1.2);
            const bAlpha = 0.30 + band * 0.08;
            ctx.strokeStyle = `rgba(${phase2 ? '180,50,50' : '100,60,160'}, ${bAlpha})`;
            ctx.lineWidth = 6 - band;
            ctx.setLineDash([18, 10]);
            ctx.beginPath(); ctx.arc(0, 0, r * (0.88 + band * 0.04), -Math.PI * 0.7, Math.PI * 1.1); ctx.stroke();
            ctx.setLineDash([]); ctx.restore();
        }

        // Main vortex body — dark radial gradient
        const rg = ctx.createRadialGradient(0, 0, r * 0.05, 0, 0, r * 0.95);
        rg.addColorStop(0,    '#000000');
        rg.addColorStop(0.25, phase2 ? '#2c0a0a' : '#1a0a2e');
        rg.addColorStop(0.60, outerC);
        rg.addColorStop(0.85, midC);
        rg.addColorStop(1,    'rgba(0,0,0,0)');
        ctx.beginPath(); ctx.arc(0, 0, r * 0.95, 0, Math.PI * 2);
        ctx.fillStyle = rg; ctx.fill();

        // Rotating inner spiral arms
        ctx.save();
        ctx.rotate(t * spinFast * 1.4);
        for (let arm = 0; arm < 4; arm++) {
            ctx.save(); ctx.rotate((Math.PI / 2) * arm);
            ctx.beginPath();
            ctx.moveTo(r * 0.08, 0);
            for (let s = 0; s <= 24; s++) {
                const frac = s / 24;
                const ang  = frac * Math.PI * 1.3;
                const rad  = r * 0.12 + frac * r * 0.62;
                ctx.lineTo(Math.cos(ang) * rad, Math.sin(ang) * rad);
            }
            ctx.strokeStyle = `rgba(${phase2 ? '231,76,60' : '155,89,182'}, ${0.45 - arm * 0.05})`;
            ctx.lineWidth = 3 - arm * 0.4;
            ctx.stroke();
            ctx.restore();
        }
        ctx.restore();

        // Lightning arcs from perimeter — flicker every few frames
        if (frame % 4 === 0) {
            ctx.save();
            ctx.strokeStyle = phase2 ? '#e74c3c' : '#c39bd3';
            ctx.lineWidth = 2;
            ctx.shadowColor = accentC; ctx.shadowBlur = 10;
            for (let i = 0; i < 6; i++) {
                const a    = Math.random() * Math.PI * 2;
                const len  = 15 + Math.random() * 25;
                const arcX = Math.cos(a) * r * 0.85;
                const arcY = Math.sin(a) * r * 0.85;
                ctx.beginPath();
                ctx.moveTo(arcX, arcY);
                ctx.lineTo(arcX + Math.cos(a) * len, arcY + Math.sin(a) * len);
                ctx.stroke();
            }
            ctx.shadowBlur = 0; ctx.restore();
        }

        // Eye of the storm — void black core
        const eyeR = r * 0.24;
        ctx.beginPath(); ctx.arc(0, 0, eyeR, 0, Math.PI * 2);
        ctx.fillStyle = '#000'; ctx.fill();

        // Inner eye glow
        const eyeG = ctx.createRadialGradient(0, 0, 0, 0, 0, eyeR);
        eyeG.addColorStop(0, phase2 ? 'rgba(255,30,30,0.6)' : 'rgba(155,89,182,0.5)');
        eyeG.addColorStop(1, 'rgba(0,0,0,0)');
        ctx.beginPath(); ctx.arc(0, 0, eyeR, 0, Math.PI * 2);
        ctx.fillStyle = eyeG; ctx.fill();

        // Two glowing eye slits — V-shaped menacing gaze inside the eye
        const sw = Math.max(2.5, eyeR * 0.18);
        ctx.save();
        ctx.shadowColor = accentC; ctx.shadowBlur = 12;
        // Black outline
        ctx.strokeStyle = '#000'; ctx.lineWidth = sw + 3; ctx.lineCap = 'round';
        ctx.beginPath(); ctx.moveTo(-eyeR*0.18, -eyeR*0.30); ctx.lineTo(-eyeR*0.58, -eyeR*0.10); ctx.stroke();
        ctx.beginPath(); ctx.moveTo( eyeR*0.18, -eyeR*0.30); ctx.lineTo( eyeR*0.58, -eyeR*0.10); ctx.stroke();
        // Glowing slit
        ctx.strokeStyle = accentC; ctx.lineWidth = sw;
        ctx.beginPath(); ctx.moveTo(-eyeR*0.18, -eyeR*0.30); ctx.lineTo(-eyeR*0.58, -eyeR*0.10); ctx.stroke();
        ctx.beginPath(); ctx.moveTo( eyeR*0.18, -eyeR*0.30); ctx.lineTo( eyeR*0.58, -eyeR*0.10); ctx.stroke();
        // Central glow point
        ctx.beginPath(); ctx.arc(0, -eyeR * 0.18, eyeR * 0.08, 0, Math.PI * 2);
        ctx.fillStyle = phase2 ? '#ff6b6b' : accentC; ctx.shadowBlur = 16; ctx.fill();
        ctx.restore();

        // Phase 2 pulsing outer warning ring
        if (phase2) {
            ctx.beginPath(); ctx.arc(0, 0, r * 1.08, 0, Math.PI * 2);
            ctx.strokeStyle = `rgba(231,76,60,${0.50 + Math.sin(t * 8) * 0.25})`;
            ctx.lineWidth = 4; ctx.stroke();
        }
    }
}
