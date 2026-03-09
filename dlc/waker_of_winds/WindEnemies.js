class WindEnemies {

    // ==============================
    // HARPY — diving bird of prey
    // Orbits the player and swoops in periodically
    // ==============================

    static initHarpy(enemy) {
        enemy.radius = 14;
        enemy.hp *= 0.75;
        enemy.speed *= 1.4;
        enemy.color = '#00bcd4';
        enemy.damage *= 0.9;
        enemy.sides = 0; // custom draw

        enemy._baseSpeed = enemy.speed;
        enemy._state = 'orbit';
        enemy._stateTimer = 60; // initial orbit before first dive
        enemy._orbitAngle = Math.atan2(enemy.y - (player ? player.y : 0), enemy.x - (player ? player.x : 0));
        enemy._orbitDir = Math.random() < 0.5 ? 1 : -1;
        enemy._retreatAngle = 0;
        enemy._wingPhase = Math.random() * Math.PI * 2;

        if (typeof saveData !== 'undefined' && saveData.collection &&
            saveData.collection.includes('HARPY_4')) {
            enemy.knockbackResist = -0.5;
        } else {
            enemy.knockbackResist = 0.2;
        }
    }

    static updateHarpy(enemy) {
        // Let default handle frozen
        if (enemy.frozenTimer > 0) return false;

        enemy._wingPhase += 0.22;
        enemy._stateTimer = (enemy._stateTimer || 0) - 1;

        const dx = player.x - enemy.x;
        const dy = player.y - enemy.y;
        const dist = Math.hypot(dx, dy);
        const angleToPlayer = Math.atan2(dy, dx);
        enemy._faceAngle = angleToPlayer;

        let moveX = 0, moveY = 0;

        if (enemy._state === 'orbit') {
            // Circle at ~240px radius, then dive
            enemy._orbitAngle += 0.028 * enemy._orbitDir;
            const orbitX = player.x + Math.cos(enemy._orbitAngle) * 240;
            const orbitY = player.y + Math.sin(enemy._orbitAngle) * 240;
            const toDx = orbitX - enemy.x;
            const toDy = orbitY - enemy.y;
            const toDist = Math.hypot(toDx, toDy);
            if (toDist > 2) {
                moveX = (toDx / toDist) * enemy._baseSpeed * 1.3;
                moveY = (toDy / toDist) * enemy._baseSpeed * 1.3;
            }
            if (enemy._stateTimer <= 0 && dist < 380) {
                enemy._state = 'dive';
                enemy._stateTimer = 80;
            }
        } else if (enemy._state === 'dive') {
            // Fast dash straight at the player
            const diveSpeed = enemy._baseSpeed * 2.6;
            moveX = Math.cos(angleToPlayer) * diveSpeed;
            moveY = Math.sin(angleToPlayer) * diveSpeed;
            if (dist < 55 || enemy._stateTimer <= 0) {
                enemy._state = 'retreat';
                enemy._stateTimer = 45;
                // Retreat at a slight angle away
                enemy._retreatAngle = angleToPlayer + Math.PI + (Math.random() - 0.5) * 1.0;
            }
        } else if (enemy._state === 'retreat') {
            const retreatSpeed = enemy._baseSpeed * 1.9;
            moveX = Math.cos(enemy._retreatAngle) * retreatSpeed;
            moveY = Math.sin(enemy._retreatAngle) * retreatSpeed;
            if (enemy._stateTimer <= 0) {
                enemy._state = 'orbit';
                enemy._stateTimer = 90 + Math.floor(Math.random() * 60);
                enemy._orbitAngle = Math.atan2(enemy.y - player.y, enemy.x - player.x);
            }
        }

        // Apply movement with wall-slide collision
        const nx = enemy.x + moveX, ny = enemy.y + moveY;
        if (!arena.checkCollision(nx, ny, enemy.radius)) {
            enemy.x = nx; enemy.y = ny;
        } else {
            if (!arena.checkCollision(nx, enemy.y, enemy.radius)) { enemy.x = nx; enemy._state = 'orbit'; }
            else if (!arena.checkCollision(enemy.x, ny, enemy.radius)) { enemy.y = ny; enemy._state = 'orbit'; }
            else { enemy._state = 'orbit'; enemy._stateTimer = 30; }
        }

        return true;
    }

    static drawHarpy(ctx, enemy) {
        ctx.save();
        ctx.translate(enemy.x, enemy.y);
        ctx.rotate(enemy._faceAngle || 0);

        const r = enemy.radius;
        const isDiving = enemy._state === 'dive';
        // Wing spread: folded when diving, open when orbiting/retreating
        const wSpread = isDiving ? 0.2 : (0.6 + Math.sin(enemy._wingPhase || 0) * 0.5);

        // === Wings (drawn behind body) ===
        const wingGrad = ctx.createLinearGradient(-r * 1.8, 0, r * 0.3, 0);
        wingGrad.addColorStop(0, isDiving ? '#00838f' : '#006064');
        wingGrad.addColorStop(0.5, isDiving ? '#00bcd4' : '#00acc1');
        wingGrad.addColorStop(1, '#4dd0e1');

        ctx.fillStyle = wingGrad;
        ctx.strokeStyle = 'rgba(0, 60, 80, 0.65)';
        ctx.lineWidth = 1;

        // Upper wing
        ctx.beginPath();
        ctx.moveTo(r * 0.15, -r * 0.18);
        ctx.bezierCurveTo(-r * 0.5, -r * (0.35 + wSpread * 0.6),
                          -r * 1.7, -r * wSpread,
                          -r * 1.9, r * 0.35);
        ctx.quadraticCurveTo(-r * 0.9, r * 0.2, r * 0.15, -r * 0.05);
        ctx.closePath();
        ctx.fill(); ctx.stroke();

        // Lower wing (mirror)
        ctx.beginPath();
        ctx.moveTo(r * 0.15, r * 0.18);
        ctx.bezierCurveTo(-r * 0.5, r * (0.35 + wSpread * 0.6),
                          -r * 1.7, r * wSpread,
                          -r * 1.9, -r * 0.35);
        ctx.quadraticCurveTo(-r * 0.9, -r * 0.2, r * 0.15, r * 0.05);
        ctx.closePath();
        ctx.fill(); ctx.stroke();

        // Feather lines
        ctx.strokeStyle = 'rgba(0, 100, 140, 0.4)';
        ctx.lineWidth = 0.7;
        for (let i = 1; i <= 3; i++) {
            const t = i / 4;
            const wx = -r * (0.6 + t * 1.1);
            const wy = r * wSpread * t * 0.7;
            ctx.beginPath(); ctx.moveTo(wx, -wy - r * 0.08); ctx.lineTo(wx, wy + r * 0.08); ctx.stroke();
        }

        // === Body (teardrop oval) ===
        const bodyGrad = ctx.createRadialGradient(-r * 0.2, -r * 0.1, r * 0.06, 0, 0, r * 0.85);
        bodyGrad.addColorStop(0, '#80deea');
        bodyGrad.addColorStop(0.55, '#00bcd4');
        bodyGrad.addColorStop(1, '#006064');
        ctx.fillStyle = bodyGrad;
        ctx.strokeStyle = '#004d5a';
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        ctx.ellipse(0, 0, r * 0.95, r * 0.52, 0, 0, Math.PI * 2);
        ctx.fill(); ctx.stroke();

        // Head blob (slightly forward)
        ctx.beginPath();
        ctx.arc(r * 0.55, 0, r * 0.42, 0, Math.PI * 2);
        ctx.fillStyle = '#00acc1';
        ctx.fill(); ctx.stroke();

        // Beak
        ctx.fillStyle = '#f1c40f';
        ctx.strokeStyle = '#b7950b'; ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(r * 0.95, 0);
        ctx.lineTo(r * 1.55, -r * 0.13);
        ctx.lineTo(r * 1.55,  r * 0.13);
        ctx.closePath();
        ctx.fill(); ctx.stroke();

        // Eye slit
        ctx.save();
        ctx.shadowColor = '#ff2200'; ctx.shadowBlur = 4;
        ctx.strokeStyle = '#ff4400';
        ctx.lineWidth = Math.max(1.2, r * 0.09);
        ctx.lineCap = 'round';
        ctx.beginPath(); ctx.moveTo(r * 0.30, -r * 0.12); ctx.lineTo(r * 0.62, -r * 0.03); ctx.stroke();
        ctx.beginPath(); ctx.moveTo(r * 0.30,  r * 0.12); ctx.lineTo(r * 0.62,  r * 0.03); ctx.stroke();
        ctx.restore();

        // Talons (two small lines below body)
        ctx.strokeStyle = '#b0bec5'; ctx.lineWidth = 1.5;
        ctx.beginPath(); ctx.moveTo(-r * 0.1, r * 0.48); ctx.lineTo(-r * 0.25, r * 0.75); ctx.stroke();
        ctx.beginPath(); ctx.moveTo( r * 0.1, r * 0.48); ctx.lineTo( r * 0.25, r * 0.75); ctx.stroke();
        // Talon toes
        ctx.beginPath(); ctx.moveTo(-r * 0.25, r * 0.75); ctx.lineTo(-r * 0.4, r * 0.68); ctx.stroke();
        ctx.beginPath(); ctx.moveTo(-r * 0.25, r * 0.75); ctx.lineTo(-r * 0.22, r * 0.90); ctx.stroke();
        ctx.beginPath(); ctx.moveTo( r * 0.25, r * 0.75); ctx.lineTo( r * 0.4,  r * 0.68); ctx.stroke();
        ctx.beginPath(); ctx.moveTo( r * 0.25, r * 0.75); ctx.lineTo( r * 0.22, r * 0.90); ctx.stroke();

        ctx.restore();
        return true;
    }


    // ==============================
    // AERO DRONE — mechanical flying unit
    // Orbits with spinning rotors, then bursts in
    // ==============================

    static initAeroDrone(enemy) {
        enemy.radius = 18;
        enemy.hp *= 1.3;
        enemy.speed *= 0.85;
        enemy.color = '#607d8b';
        enemy.sides = 0;

        enemy._baseSpeed = enemy.speed;
        enemy._rotorPhase = Math.random() * Math.PI * 2;
        enemy._bobPhase = Math.random() * Math.PI * 2;
        enemy._orbitAngle = Math.atan2(
            enemy.y - (player ? player.y : 0),
            enemy.x - (player ? player.x : 0)
        );
        enemy._burstMode = false;
        enemy._burstTimer = 0;
        enemy._burstCooldown = 120 + Math.floor(Math.random() * 80);
        enemy._driftPhase = Math.random() * Math.PI * 2;

        if (typeof saveData !== 'undefined' && saveData.collection &&
            saveData.collection.includes('AERO_DRONE_4')) {
            enemy.hp *= 0.7;
        }
    }

    static updateAeroDrone(enemy) {
        if (enemy.frozenTimer > 0) return false;

        enemy._rotorPhase += 0.4;
        enemy._bobPhase += 0.055;
        enemy._driftPhase += 0.035;
        if (enemy._burstCooldown > 0) enemy._burstCooldown--;

        const dx = player.x - enemy.x;
        const dy = player.y - enemy.y;
        const dist = Math.hypot(dx, dy);
        const angleToPlayer = Math.atan2(dy, dx);
        enemy._faceAngle = angleToPlayer;

        let moveX = 0, moveY = 0;

        if (enemy._burstMode) {
            enemy._burstTimer--;
            const bSpeed = enemy._baseSpeed * 2.2;
            moveX = Math.cos(angleToPlayer) * bSpeed;
            moveY = Math.sin(angleToPlayer) * bSpeed;
            if (enemy._burstTimer <= 0 || dist < 50) {
                enemy._burstMode = false;
                enemy._burstCooldown = 200;
                enemy._orbitAngle = angleToPlayer + Math.PI;
            }
        } else {
            // Circle around player; add lateral sine drift
            enemy._orbitAngle += 0.018;
            const orbitR = Math.max(180, 300 - (typeof wave !== 'undefined' ? wave * 1.5 : 0));
            const orbitX = player.x + Math.cos(enemy._orbitAngle) * orbitR;
            const orbitY = player.y + Math.sin(enemy._orbitAngle) * orbitR;
            const toDx = orbitX - enemy.x;
            const toDy = orbitY - enemy.y;
            const toDist = Math.hypot(toDx, toDy);

            // Lateral drift (perpendicular)
            const perpX = -Math.sin(angleToPlayer);
            const perpY =  Math.cos(angleToPlayer);
            const drift = Math.sin(enemy._driftPhase) * enemy._baseSpeed * 0.6;

            if (toDist > 1) {
                moveX = (toDx / toDist) * enemy._baseSpeed + perpX * drift;
                moveY = (toDy / toDist) * enemy._baseSpeed + perpY * drift;
            }

            if (enemy._burstCooldown <= 0 && dist < 440) {
                enemy._burstMode = true;
                enemy._burstTimer = 38;
            }
        }

        const nx = enemy.x + moveX, ny = enemy.y + moveY;
        if (!arena.checkCollision(nx, ny, enemy.radius)) {
            enemy.x = nx; enemy.y = ny;
        } else {
            if (!arena.checkCollision(nx, enemy.y, enemy.radius)) { enemy.x = nx; enemy._burstMode = false; }
            else if (!arena.checkCollision(enemy.x, ny, enemy.radius)) { enemy.y = ny; enemy._burstMode = false; }
            else { enemy._burstMode = false; }
        }

        return true;
    }

    static drawAeroDrone(ctx, enemy) {
        ctx.save();
        ctx.translate(enemy.x, enemy.y);

        const r = enemy.radius;
        const isBursting = enemy._burstMode;
        const rotorSpin = enemy._rotorPhase || 0;
        // Subtle hover bob (visual offset)
        const bob = Math.sin(enemy._bobPhase || 0) * 2.5;
        ctx.translate(0, bob);

        // Slowly rotate entire drone body
        const bodyRot = (typeof frame !== 'undefined' ? frame : 0) * 0.012;
        ctx.rotate(bodyRot);

        // --- Rotor arms (4 at 45°) ---
        ctx.strokeStyle = isBursting ? '#90a4ae' : '#546e7a';
        ctx.lineWidth = 3;
        for (let i = 0; i < 4; i++) {
            const a = (i / 4) * Math.PI * 2 + Math.PI / 4;
            ctx.beginPath();
            ctx.moveTo(0, 0);
            ctx.lineTo(Math.cos(a) * r * 1.45, Math.sin(a) * r * 1.45);
            ctx.stroke();
        }

        // --- Rotors (spinning disks at arm tips) ---
        for (let i = 0; i < 4; i++) {
            const a = (i / 4) * Math.PI * 2 + Math.PI / 4;
            const rx = Math.cos(a) * r * 1.45;
            const ry = Math.sin(a) * r * 1.45;
            ctx.save();
            ctx.translate(rx, ry);

            // Blade blur (fast spinning ellipses)
            ctx.globalAlpha = 0.4;
            ctx.fillStyle = isBursting ? '#80deea' : '#b0bec5';
            for (let b = 0; b < 2; b++) {
                ctx.save();
                ctx.rotate(rotorSpin + b * Math.PI / 2 + i * 0.3);
                ctx.beginPath();
                ctx.ellipse(0, 0, r * 0.38, r * 0.09, 0, 0, Math.PI * 2);
                ctx.fill();
                ctx.restore();
            }
            ctx.globalAlpha = 1;

            // Hub
            ctx.fillStyle = '#37474f';
            ctx.strokeStyle = '#263238'; ctx.lineWidth = 1;
            ctx.beginPath();
            ctx.arc(0, 0, r * 0.14, 0, Math.PI * 2);
            ctx.fill(); ctx.stroke();

            ctx.restore();
        }

        // --- Square body with rounded corners ---
        const bs = r * 0.72;
        const cr = r * 0.18;
        const bodyGrad = ctx.createRadialGradient(-r * 0.2, -r * 0.2, r * 0.04, 0, 0, r * 0.75);
        bodyGrad.addColorStop(0, isBursting ? '#b0bec5' : '#78909c');
        bodyGrad.addColorStop(0.6, isBursting ? '#607d8b' : '#546e7a');
        bodyGrad.addColorStop(1, '#1c2c35');
        ctx.fillStyle = bodyGrad;
        ctx.strokeStyle = isBursting ? '#4dd0e1' : '#263238';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(-bs + cr, -bs);
        ctx.lineTo( bs - cr, -bs);   ctx.arcTo( bs, -bs,  bs, -bs + cr, cr);
        ctx.lineTo( bs,  bs - cr);   ctx.arcTo( bs,  bs,  bs - cr, bs, cr);
        ctx.lineTo(-bs + cr,  bs);   ctx.arcTo(-bs,  bs, -bs,  bs - cr, cr);
        ctx.lineTo(-bs, -bs + cr);   ctx.arcTo(-bs, -bs, -bs + cr, -bs, cr);
        ctx.closePath();
        ctx.fill(); ctx.stroke();

        // Panel detail lines
        ctx.strokeStyle = 'rgba(100,150,170,0.35)';
        ctx.lineWidth = 0.8;
        ctx.beginPath(); ctx.moveTo(-bs * 0.6, -bs); ctx.lineTo(-bs * 0.6, bs); ctx.stroke();
        ctx.beginPath(); ctx.moveTo( bs * 0.6, -bs); ctx.lineTo( bs * 0.6, bs); ctx.stroke();

        // --- Power core (center glow) ---
        if (isBursting) {
            ctx.shadowColor = '#00e5ff'; ctx.shadowBlur = 12;
        } else {
            ctx.shadowColor = '#00bcd4'; ctx.shadowBlur = 6;
        }
        const coreGrad = ctx.createRadialGradient(0, 0, 0, 0, 0, r * 0.26);
        coreGrad.addColorStop(0, isBursting ? '#e0f7fa' : '#b2ebf2');
        coreGrad.addColorStop(1, isBursting ? '#00bcd4' : '#0097a7');
        ctx.fillStyle = coreGrad;
        ctx.beginPath(); ctx.arc(0, 0, r * 0.26, 0, Math.PI * 2); ctx.fill();
        ctx.shadowBlur = 0;

        // --- Eye slits (facing player, undo body rotation) ---
        ctx.rotate(-bodyRot);
        ctx.rotate(enemy._faceAngle || 0);
        ctx.save();
        ctx.shadowColor = '#ff2200'; ctx.shadowBlur = 4;
        ctx.strokeStyle = '#ff4400';
        ctx.lineWidth = Math.max(1.5, r * 0.09);
        ctx.lineCap = 'round';
        ctx.beginPath(); ctx.moveTo(r * 0.20, -r * 0.11); ctx.lineTo(r * 0.48, -r * 0.26); ctx.stroke();
        ctx.beginPath(); ctx.moveTo(r * 0.20,  r * 0.11); ctx.lineTo(r * 0.48,  r * 0.26); ctx.stroke();
        ctx.restore();

        ctx.restore();
        return true;
    }


    // ==============================
    // CLOUD MANTA — stealth glider
    // Semi-transparent, sweeps in long arcing curves
    // ==============================

    static initCloudManta(enemy) {
        enemy.radius = 26;
        enemy.hp *= 1.6;
        enemy.speed *= 0.95;
        enemy.color = '#cfd8dc';
        enemy.damage *= 1.2;
        enemy.sides = 0;

        enemy._baseSpeed = enemy.speed;
        enemy.alpha = 0.12;
        enemy.stealthTimer = 0;
        enemy._sweepPhase = Math.random() * Math.PI * 2;
        enemy._waveTimer = 0;
        enemy._tailWave = 0;
    }

    static updateCloudManta(enemy) {
        if (enemy.frozenTimer > 0) return false;

        const noStealth = typeof saveData !== 'undefined' && saveData.collection &&
            saveData.collection.includes('CLOUD_MANTA_4');

        const dx = player.x - enemy.x;
        const dy = player.y - enemy.y;
        const dist = Math.hypot(dx, dy);
        const angleToPlayer = Math.atan2(dy, dx);
        enemy._faceAngle = angleToPlayer;

        // Stealth pulsing
        if (noStealth) {
            enemy.alpha = 1;
        } else {
            enemy.stealthTimer++;
            if (dist < 130) {
                enemy.alpha = Math.min(1, enemy.alpha + 0.04);
            } else {
                const target = 0.10 + Math.abs(Math.sin(enemy.stealthTimer * 0.022)) * 0.20;
                enemy.alpha += (target - enemy.alpha) * 0.03;
            }
        }

        // Sweeping arc: oscillate perpendicular to travel direction
        enemy._waveTimer += 0.04;
        enemy._tailWave += 0.12;

        const perpX = -Math.sin(angleToPlayer);
        const perpY =  Math.cos(angleToPlayer);
        const osc = Math.sin(enemy._waveTimer + enemy._sweepPhase) * enemy._baseSpeed * 0.85;

        const moveX = Math.cos(angleToPlayer) * enemy._baseSpeed + perpX * osc;
        const moveY = Math.sin(angleToPlayer) * enemy._baseSpeed + perpY * osc;

        const nx = enemy.x + moveX, ny = enemy.y + moveY;
        if (!arena.checkCollision(nx, ny, enemy.radius)) { enemy.x = nx; enemy.y = ny; }
        else if (!arena.checkCollision(nx, enemy.y, enemy.radius)) enemy.x = nx;
        else if (!arena.checkCollision(enemy.x, ny, enemy.radius)) enemy.y = ny;

        return true;
    }

    static drawCloudManta(ctx, enemy) {
        ctx.save();
        ctx.translate(enemy.x, enemy.y);
        ctx.globalAlpha = enemy.alpha || 1;

        const r = enemy.radius;
        // Rotate so body nose (+X) faces the player
        ctx.rotate(enemy._faceAngle || 0);

        // === Wing body ===
        // Wings spread along ±Y, body nose at +X, tail at -X
        const bodyGrad = ctx.createRadialGradient(-r * 0.05, 0, r * 0.04, 0, 0, r * 1.05);
        bodyGrad.addColorStop(0, '#eceff1');
        bodyGrad.addColorStop(0.4, '#cfd8dc');
        bodyGrad.addColorStop(1, '#607d8b');
        ctx.fillStyle = bodyGrad;
        ctx.strokeStyle = 'rgba(50, 80, 95, 0.5)';
        ctx.lineWidth = 1.2;

        // Main manta silhouette (top-down view):
        // nose at (+0.6r, 0), wingtips at (-0.4r, ±r*1.05), tail at (-0.6r, 0)
        ctx.beginPath();
        ctx.moveTo(r * 0.62, 0);                                              // nose
        ctx.bezierCurveTo(r * 0.35, -r * 0.55, -r * 0.05, -r * 1.1, -r * 0.42, -r * 1.0); // right wing curve
        ctx.bezierCurveTo(-r * 0.70, -r * 0.78, -r * 0.65, -r * 0.18, -r * 0.62, 0);      // right trailing
        ctx.bezierCurveTo(-r * 0.65, r * 0.18, -r * 0.70, r * 0.78, -r * 0.42, r * 1.0);  // left trailing
        ctx.bezierCurveTo(-r * 0.05, r * 1.1, r * 0.35, r * 0.55, r * 0.62, 0);            // left wing curve
        ctx.closePath();
        ctx.fill(); ctx.stroke();

        // === Bioluminescent vein pattern ===
        ctx.save();
        ctx.globalAlpha = (enemy.alpha || 1) * 0.5;
        ctx.strokeStyle = '#b2ebf2';
        ctx.lineWidth = 0.9;
        ctx.shadowColor = '#00bcd4'; ctx.shadowBlur = 5;

        // Center spine
        ctx.beginPath();
        ctx.moveTo(r * 0.5, 0);
        ctx.lineTo(-r * 0.5, 0);
        ctx.stroke();

        // Wing veins (both sides)
        ctx.beginPath();
        ctx.moveTo(r * 0.3, -r * 0.15);
        ctx.quadraticCurveTo(-r * 0.15, -r * 0.65, -r * 0.35, -r * 0.75);
        ctx.stroke();
        ctx.beginPath();
        ctx.moveTo(r * 0.3, r * 0.15);
        ctx.quadraticCurveTo(-r * 0.15, r * 0.65, -r * 0.35, r * 0.75);
        ctx.stroke();

        ctx.shadowBlur = 0;
        ctx.restore();

        // === Tail (long, wavy) ===
        const tailWave = Math.sin(enemy._tailWave || 0) * r * 0.3;
        ctx.strokeStyle = 'rgba(96, 125, 139, 0.7)';
        ctx.lineWidth = 2;
        ctx.lineCap = 'round';
        ctx.beginPath();
        ctx.moveTo(-r * 0.6, 0);
        ctx.bezierCurveTo(-r * 1.1, tailWave * 0.5,
                          -r * 1.8, -tailWave,
                          -r * 2.5, tailWave * 0.8);
        ctx.stroke();

        // Tail tip
        ctx.strokeStyle = 'rgba(96, 125, 139, 0.4)';
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(-r * 2.5, tailWave * 0.8);
        ctx.lineTo(-r * 3.0, tailWave * 1.2);
        ctx.stroke();

        // === Eye slits ===
        ctx.save();
        ctx.shadowColor = '#ff2200'; ctx.shadowBlur = 4;
        ctx.strokeStyle = '#ff4400';
        ctx.lineWidth = Math.max(1.5, r * 0.075);
        ctx.lineCap = 'round';
        ctx.beginPath(); ctx.moveTo(r * 0.28, -r * 0.09); ctx.lineTo(r * 0.52, -r * 0.21); ctx.stroke();
        ctx.beginPath(); ctx.moveTo(r * 0.28,  r * 0.09); ctx.lineTo(r * 0.52,  r * 0.21); ctx.stroke();
        ctx.shadowBlur = 0;
        ctx.restore();

        ctx.restore();
        return true;
    }
}

window.WindEnemies = WindEnemies;
