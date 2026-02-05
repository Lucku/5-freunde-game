// Chaos & Gravity - Unique Enemies

class ChaosEnemies {
    // --- VOID WALKER ---
    static initVoidWalker(enemy) {
        enemy.color = '#4a235a'; // Deep Void
        enemy.speed *= 0.8;
        enemy.hp *= 2.0;
        enemy.radius *= 1.2;
        enemy.knockbackResist = 0.5;
        enemy.isChaos = true;
    }

    static updateVoidWalker(enemy) {
        // Standard chase but with trail
        if (Math.random() < 0.1) {
            // Leave void trail that slows player? (Not implemented yet to avoid complexity)
            // Just visual particle
            if (typeof particles !== 'undefined') particles.push(new Particle(enemy.x, enemy.y, '#4a235a'));
        }
        return false; // Continue default update
    }

    // --- GLITCH ---
    static initGlitch(enemy) {
        enemy.color = '#ff00ff'; // Neon Magenta
        enemy.speed *= 2.0;
        enemy.hp *= 0.5;
        enemy.teleportTimer = 0;
        enemy.isChaos = true;
    }

    static updateGlitch(enemy) {
        // Teleport behavior
        enemy.teleportTimer = (enemy.teleportTimer || 0) + 1;
        if (enemy.teleportTimer > 90) { // Every 1.5s
            if (typeof createExplosion === 'function') createExplosion(enemy.x, enemy.y, enemy.color);

            // Blind hop
            enemy.x += (Math.random() - 0.5) * 300;
            enemy.y += (Math.random() - 0.5) * 300;

            enemy.teleportTimer = 0;
            if (typeof createExplosion === 'function') createExplosion(enemy.x, enemy.y, enemy.color);
        }
        return false;
    }

    // --- ENTROPY MAGE ---
    static initEntropyMage(enemy) {
        enemy.color = '#9b59b6'; // Lighter Purple
        enemy.shootCooldown = 60;
        enemy.teleportTimer = 300; // 5 seconds
        enemy.summonTimer = 600; // 10 seconds
        enemy.shieldAngle = 0;
        enemy.isChaos = true;

        // Buff Stats for "Boss" feel
        enemy.hp *= 2.5;
        enemy.maxHp = enemy.hp;
        enemy.xpValue *= 3;
        enemy.radius *= 1.2;
    }

    static updateEntropyMage(enemy) {
        // 1. Orbital Shield Animation & Logic
        enemy.shieldAngle += 0.05;
        if (typeof player !== 'undefined') {
            const shieldRadius = enemy.radius + 30;
            // 3 Orbs
            for (let i = 0; i < 3; i++) {
                const ang = enemy.shieldAngle + (i * (Math.PI * 2 / 3));
                const sx = enemy.x + Math.cos(ang) * shieldRadius;
                const sy = enemy.y + Math.sin(ang) * shieldRadius;

                // Collision with Player
                // We use a simple radius check (Orb = 8, Player = ~12 => 20)
                const dist = Math.hypot(player.x - sx, player.y - sy);
                if (dist < 25) {
                    // Deal Damage (Throttle?)
                    // Ideally we check an immunity timer, but for now raw damage makes it dangerous to touch
                    if (player.invulnTimer <= 0) {
                        if (typeof player.takeDamage === 'function') player.takeDamage(10);
                        else player.hp -= 10;

                        // Knockback
                        const pushAng = Math.atan2(player.y - sy, player.x - sx);
                        player.x += Math.cos(pushAng) * 15;
                        player.y += Math.sin(pushAng) * 15;

                        if (typeof createExplosion === 'function') createExplosion(sx, sy, '#8e44ad');
                    }
                }
            }

            // 2. Teleport Logic (If hit or timer)
            enemy.teleportTimer--;
            const distToPlayer = Math.hypot(player.x - enemy.x, player.y - enemy.y);

            if (enemy.teleportTimer <= 0 || (distToPlayer < 100 && enemy.teleportTimer < 250)) {
                // Teleport Effect
                if (typeof createExplosion === 'function') createExplosion(enemy.x, enemy.y, enemy.color);

                // Move logic
                const angle = Math.random() * Math.PI * 2;
                const dist = 300 + Math.random() * 200;
                enemy.x = player.x + Math.cos(angle) * dist;
                enemy.y = player.y + Math.sin(angle) * dist;

                // Re-appear Effect
                if (typeof createExplosion === 'function') createExplosion(enemy.x, enemy.y, '#fff');
                enemy.teleportTimer = 300 + Math.random() * 100;

                // Reset shot to fire immediately after teleport
                enemy.shootCooldown = 30;
            }
        }

        // 3. Shooting Logic (Chaos Barrage)
        if (enemy.shootCooldown > 0) enemy.shootCooldown--;
        else if (typeof player !== 'undefined' && typeof projectiles !== 'undefined') {
            const angle = Math.atan2(player.y - enemy.y, player.x - enemy.x);

            // Fire 3 projectiles with random speed variation (Chaos)
            for (let i = -1; i <= 1; i++) {
                const spread = i * 0.2;
                const speedVar = 0.8 + Math.random() * 0.4; // 80% to 120% speed
                const vel = {
                    x: Math.cos(angle + spread) * 5 * speedVar,
                    y: Math.sin(angle + spread) * 5 * speedVar
                };

                // Colored based on "Entropy" (Purple/Cyan/Red mix?)
                const cols = ['#9b59b6', '#8e44ad', '#e74c3c'];
                const col = cols[Math.floor(Math.random() * cols.length)];

                const proj = new Projectile(enemy.x, enemy.y, vel, enemy.damage, col, 10, 'gravity', 0, true);
                if (proj) {
                    proj.owner = enemy; // Ensure PVP logic doesn't break
                    projectiles.push(proj);
                }
            }

            enemy.shootCooldown = 150; // 2.5s cooldown
        }

        // 4. Summoning (Rare)
        if (enemy.summonTimer > 0) enemy.summonTimer--;
        else if (typeof enemies !== 'undefined') {
            // Summon a Glitch minion
            if (typeof ChaosEnemies !== 'undefined') {
                // Create generic enemy
                const minion = new Enemy(false, 'GLITCH'); // Assuming Enemy constructor handles type if we pass it, or we init manually
                minion.x = enemy.x + (Math.random() - 0.5) * 100;
                minion.y = enemy.y + (Math.random() - 0.5) * 100;
                // Manually init if needed, usually Enemy constructor calls global init based on type
                enemies.push(minion);
                if (typeof createExplosion === 'function') createExplosion(minion.x, minion.y, '#00ff00');
            }
            enemy.summonTimer = 600;
        }

        return false; // Default movement behavior (chase player)
    }

    static drawEntropyMage(ctx, enemy) {
        // Draw Orbital Shield
        const shieldRadius = enemy.radius + 30;
        const orbs = 3;

        for (let i = 0; i < orbs; i++) {
            const ang = (enemy.shieldAngle || 0) + (i * (Math.PI * 2 / orbs));
            const sx = enemy.x + Math.cos(ang) * shieldRadius;
            const sy = enemy.y + Math.sin(ang) * shieldRadius;

            ctx.beginPath();
            ctx.arc(sx, sy, 8, 0, Math.PI * 2);
            ctx.fillStyle = '#8e44ad';
            ctx.fill();
            ctx.strokeStyle = '#fff';
            ctx.lineWidth = 1;
            ctx.stroke();

            // Link to center
            ctx.beginPath();
            ctx.moveTo(enemy.x, enemy.y);
            ctx.lineTo(sx, sy);
            ctx.strokeStyle = 'rgba(142, 68, 173, 0.3)';
            ctx.stroke();
        }

        return false; // Render standard body on top
    }
}

// Registration
if (typeof ENEMY_TYPES !== 'undefined') {
    if (!ENEMY_TYPES.includes('VOID_WALKER')) ENEMY_TYPES.push('VOID_WALKER');
    if (!ENEMY_TYPES.includes('GLITCH')) ENEMY_TYPES.push('GLITCH');
    if (!ENEMY_TYPES.includes('ENTROPY_MAGE')) ENEMY_TYPES.push('ENTROPY_MAGE');
}

if (typeof window.ENEMY_LOGIC === 'undefined') window.ENEMY_LOGIC = {};

window.ENEMY_LOGIC['VOID_WALKER'] = { init: ChaosEnemies.initVoidWalker, update: ChaosEnemies.updateVoidWalker };
window.ENEMY_LOGIC['GLITCH'] = { init: ChaosEnemies.initGlitch, update: ChaosEnemies.updateGlitch };
window.ENEMY_LOGIC['ENTROPY_MAGE'] = { init: ChaosEnemies.initEntropyMage, update: ChaosEnemies.updateEntropyMage, draw: ChaosEnemies.drawEntropyMage };

