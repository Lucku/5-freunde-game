class RockEnemies {
    // --- GOLEM ---
    static initGolem(enemy) {
        enemy.radius = 25;
        enemy.hp *= 2.5; // Very tanky
        enemy.speed *= 0.6; // Slow
        enemy.color = '#795548';
        enemy.sides = 6; // Hexagon
        enemy.knockbackResist = 0.8; // Hard to push
    }

    static updateGolem(enemy) {
        // Golem Logic: Just chases slowly, but splits on death
        // The split logic needs to be handled in the death handler or checked here if HP <= 0
        // Since we don't have a clean "onDeath" hook in Enemy.js yet, we might need to add one.
        // For now, let's assume we can check HP here, but Enemy.js usually handles removal.

        // Let's add a property to flag that it needs to split
        if (enemy.hp <= 0 && !enemy.hasSplit) {
            enemy.hasSplit = true;
            // Spawn 2 smaller golems (Mini-Golems)
            // We need access to the global 'enemies' array
            if (typeof enemies !== 'undefined') {
                for (let i = 0; i < 2; i++) {
                    const mini = new Enemy(false, 'BASIC'); // Use BASIC as base
                    mini.x = enemy.x + (Math.random() - 0.5) * 20;
                    mini.y = enemy.y + (Math.random() - 0.5) * 20;
                    mini.radius = 15;
                    mini.hp = enemy.maxHp * 0.4;
                    mini.speed = enemy.speed * 1.5;
                    mini.color = '#a1887f';
                    mini.xpValue = 2;
                    enemies.push(mini);
                }
            }
        }
        return false; // Continue default update
    }

    static drawGolem(ctx, enemy) {
        // Standard polygon draw is fine, maybe add some "cracks"
        return false; // Use default draw
    }

    // --- BURROWER ---
    static initBurrower(enemy) {
        enemy.radius = 18;
        enemy.hp *= 0.8;
        enemy.speed *= 1.2;
        enemy.color = '#5d4037';
        enemy.isBurrowed = false;
        enemy.burrowTimer = 0;
        enemy.sides = 3; // Triangle
    }

    static updateBurrower(enemy) {
        // Cycle between Burrowed (Invulnerable) and Surface (Vulnerable)
        enemy.burrowTimer++;

        if (enemy.isBurrowed) {
            if (enemy.burrowTimer > 120) { // 2 seconds underground
                enemy.isBurrowed = false;
                enemy.burrowTimer = 0;
                enemy.alpha = 1;
                // Pop up effect
                createExplosion(enemy.x, enemy.y, '#5d4037');
            }
        } else {
            if (enemy.burrowTimer > 180) { // 3 seconds on surface
                enemy.isBurrowed = true;
                enemy.burrowTimer = 0;
                enemy.alpha = 0.3; // Semi-transparent
                // Dig down effect
                createExplosion(enemy.x, enemy.y, '#3e2723');
            }
        }

        // While burrowed, immune to damage (Heal back any damage taken this frame?)
        // Or better: In Enemy.js, we should check isBurrowed before applying damage.
        // Since we can't easily modify the damage logic without a hook, 
        // we'll just heal them back instantly if they took damage while burrowed.
        if (enemy.isBurrowed) {
            if (enemy.hp < enemy.lastHp) {
                enemy.hp = enemy.lastHp; // Revert damage
                floatingTexts.push(new FloatingText(enemy.x, enemy.y - 20, "BLOCK", "#aaa", 15));
            }
        }
        enemy.lastHp = enemy.hp;

        return false;
    }

    static drawBurrower(ctx, enemy) {
        if (enemy.isBurrowed) {
            // Draw a mound of dirt
            ctx.save();
            ctx.translate(enemy.x, enemy.y);
            ctx.fillStyle = '#3e2723';
            ctx.beginPath();
            ctx.arc(0, 0, enemy.radius, 0, Math.PI * 2);
            ctx.fill();

            // Particles
            if (Math.random() < 0.3) {
                ctx.fillStyle = '#795548';
                ctx.fillRect((Math.random() - 0.5) * 20, (Math.random() - 0.5) * 20, 4, 4);
            }
            ctx.restore();
            return true; // Override default draw
        }
        return false;
    }
}
