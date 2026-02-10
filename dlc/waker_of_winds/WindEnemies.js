class WindEnemies {
    // --- HARPY ---
    // Fast, susceptible to knockback (especially with card)
    static initHarpy(enemy) {
        enemy.radius = 12;
        enemy.hp *= 0.8; // Fragile
        enemy.speed *= 1.4; // Fast
        enemy.color = '#00bcd4'; // Cyan
        enemy.type = 'HARPY';
        enemy.sides = 3; // Triangle

        // Card Effect: Harpies take +50% Knockback (We simulate this by reducing resist)
        if (typeof saveData !== 'undefined' && saveData.collection.includes('HARPY_4')) {
            enemy.knockbackResist = -0.5; // Negative resistance = extra knockback
        } else {
            enemy.knockbackResist = 0.2;
        }
    }

    static updateHarpy(enemy, player) {
        // Harpies swoop: they accelerate when close
        const dx = player.x - enemy.x;
        const dy = player.y - enemy.y;
        const dist = Math.sqrt(dx * dx + dy * dy);

        if (dist < 200) {
            enemy.speed = enemy.baseSpeed * 1.5;
        } else {
            enemy.speed = enemy.baseSpeed;
        }
        return false; // Default movement
    }

    // --- AERO DRONE ---
    // Flying mechanical unit, tankier than harpy but drops scraps
    static initAeroDrone(enemy) {
        enemy.radius = 18;
        enemy.hp *= 1.2;
        enemy.speed *= 0.9;
        enemy.color = '#607d8b'; // Blue Grey
        enemy.type = 'AERO_DRONE';
        enemy.sides = 4; // Square/Diamond

        // Card Effect: Drones have 30% less HP
        if (typeof saveData !== 'undefined' && saveData.collection.includes('AERO_DRONE_4')) {
            enemy.hp *= 0.7;
            enemy.maxHp *= 0.7;
        }
    }

    static updateAeroDrone(enemy, player) {
        // Drifts in circles/curves? For now, standard tracking.
        return false;
    }

    // --- CLOUD MANTA ---
    // Stealth unit, fades in/out
    static initCloudManta(enemy) {
        enemy.radius = 22;
        enemy.hp *= 1.5; // Sturdy
        enemy.speed *= 1.1;
        enemy.color = '#cfd8dc'; // Light Grey
        enemy.type = 'CLOUD_MANTA';
        enemy.sides = 5; // Pentagon

        enemy.alpha = 0.2; // Start stealth
        enemy.stealthTimer = 0;
    }

    static updateCloudManta(enemy, player, ctx) {
        // Card Effect: Mantas cannot stealth (Always visible)
        const noStealth = typeof saveData !== 'undefined' && saveData.collection.includes('CLOUD_MANTA_4');

        if (noStealth) {
            enemy.alpha = 1;
            return false;
        }

        // Pulse stealth
        enemy.stealthTimer = (enemy.stealthTimer || 0) + 1;
        enemy.alpha = 0.2 + (Math.sin(enemy.stealthTimer * 0.05) * 0.15); // 0.05 to 0.35 alpha

        // Only become fully visible when attacking/very close
        const dx = player.x - enemy.x;
        const dy = player.y - enemy.y;
        const dist = Math.sqrt(dx * dx + dy * dy);

        if (dist < 100) enemy.alpha = 1;

        return false;
    }

    static drawCloudManta(ctx, enemy) {
        ctx.globalAlpha = enemy.alpha || 1;
        // Default draw will happen if we return false, but we set globalAlpha so it affects it?
        // Actually Enemy.draw resets alpha usually.
        // If we want custom drawing we return true.
        // Let's rely on globalAlpha persisting if the main loop doesn't reset it strictly for every enemy BEFORE the hook?
        // Usage in Enemy.js: ctx.save(); ... draw ... ctx.restore();
        // So setting globalAlpha here might not work if we return false, because the caller handles the drawing.
        // We should return FALSE and trust the caller, OR return TRUE and draw it ourselves.

        // Let's draw it ourselves to be safe about alpha
        ctx.save();
        ctx.translate(enemy.x, enemy.y);
        ctx.fillStyle = enemy.color;

        // Flattened shape (Manta-like)
        ctx.scale(1.5, 0.6);
        ctx.rotate(enemy.angle || 0);

        ctx.globalAlpha = enemy.alpha;
        ctx.beginPath();
        const sides = 5;
        for (let i = 0; i < sides; i++) {
            const angle = (i * 2 * Math.PI) / sides;
            const x = Math.cos(angle) * enemy.radius;
            const y = Math.sin(angle) * enemy.radius;
            if (i === 0) ctx.moveTo(x, y);
            else ctx.lineTo(x, y);
        }
        ctx.closePath();
        ctx.fill();
        ctx.restore();

        // Reset global alpha for safety, though restore should handle it
        ctx.globalAlpha = 1;

        return true; // We handled drawing
    }
}
