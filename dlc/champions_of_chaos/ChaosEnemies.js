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
        enemy.shootCooldown = 120;
        enemy.isChaos = true;
    }

    static updateEntropyMage(enemy) {
        // Shooting Logic
        if (enemy.shootCooldown > 0) enemy.shootCooldown--;
        else if (typeof player !== 'undefined' && typeof projectiles !== 'undefined') {
            const angle = Math.atan2(player.y - enemy.y, player.x - enemy.x);
            // Projectile needs to be enemy-owned.
            // Assuming Projectile(x, y, vel, dmg, color, size, type, timer, isEnemy)
            const vel = { x: Math.cos(angle) * 5, y: Math.sin(angle) * 5 };
            // Note: Projectile sig might vary, check Player.js or game.js usage
            // Usually: x, y, velocity, damage, color, size, type, duration, isEnemy
            projectiles.push(new Projectile(enemy.x, enemy.y, vel, enemy.damage, '#8e44ad', 10, 'gravity', 0, true));
            enemy.shootCooldown = 180;
        }
        return false;
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
window.ENEMY_LOGIC['ENTROPY_MAGE'] = { init: ChaosEnemies.initEntropyMage, update: ChaosEnemies.updateEntropyMage };

