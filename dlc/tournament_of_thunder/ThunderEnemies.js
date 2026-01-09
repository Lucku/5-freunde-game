// New Enemies for Cloud Biome

class ThunderEnemies {
    static inject() {
        if (!window.ENEMY_TYPES) return;
        if (!window.ENEMY_LOGIC) window.ENEMY_LOGIC = {};

        // 1. Cloud Bat
        if (!window.ENEMY_TYPES.includes('CLOUD_BAT')) window.ENEMY_TYPES.push('CLOUD_BAT');
        window.ENEMY_LOGIC['CLOUD_BAT'] = {
            init: (e) => {
                e.hp = 20 * (1 + (e.wave || 0) * 0.2); // Low HP
                e.speed = 4;
                e.damage = 10;
                e.color = '#90a4ae';
                e.radius = 15;
                e.xpValue = 5;
                e.sides = 3; // Triangle
                // Cloud Bats slow down if user has the card
                if (typeof saveData !== 'undefined' && saveData.collection.includes('CLOUD_BAT_4')) {
                    e.speed *= 0.5;
                }
            },
            update: (e) => {
                // Swarm behavior logic if needed, or default
                return false; // Use default
            }
        };

        // 2. Storm Elemental
        if (!window.ENEMY_TYPES.includes('STORM_ELEMENTAL')) window.ENEMY_TYPES.push('STORM_ELEMENTAL');
        window.ENEMY_LOGIC['STORM_ELEMENTAL'] = {
            init: (e) => {
                e.hp = 60 * (1 + (e.wave || 0) * 0.3);
                e.speed = 2;
                e.damage = 15;
                e.color = '#fbc02d';
                e.radius = 25;
                e.xpValue = 15;
                e.sides = 5; // Pentagon
                e.shootCooldown = 120;
            },
            update: (e) => {
                // Shoot lightning logic
                if (e.shootCooldown > 0) e.shootCooldown--;
                else {
                    const dist = Math.hypot(player.x - e.x, player.y - e.y);
                    if (dist < 400 && dist > 100) { // Range check
                        e.shootCooldown = 120;
                        if (typeof projectiles !== 'undefined') {
                            const angle = Math.atan2(player.y - e.y, player.x - e.x);
                            projectiles.push(new Projectile(
                                e.x, e.y,
                                { x: Math.cos(angle) * 8, y: Math.sin(angle) * 8 },
                                e.damage,
                                '#ffff00',
                                8,
                                'LIGHTNING',
                                5,
                                true // isEnemy
                            ));
                        }
                    }
                }
                return false;
            }
        };

        // 3. Zeus Bot (Mini-Boss)
        if (!window.ENEMY_TYPES.includes('ZEUS_BOT')) window.ENEMY_TYPES.push('ZEUS_BOT');
        window.ENEMY_LOGIC['ZEUS_BOT'] = {
            init: (e) => {
                e.hp = 300 * (1 + (e.wave || 0) * 0.5);
                e.speed = 1.5;
                e.damage = 30;
                e.color = '#fff';
                e.radius = 35;
                e.xpValue = 100;
                e.isElite = true;
                e.sides = 8; // Octagon
                
                // Card Nerf
                if (typeof saveData !== 'undefined' && saveData.collection.includes('ZEUS_BOT_4')) {
                    // "Zeus Bots do not revive minions" (Mechanic)
                    // For now, maybe just HP nerf or handle mechanic in update
                    e.hp *= 0.8; 
                }
            },
            update: (e) => {
                // Logic: Maybe spawns a mini orb?
                return false;
            }
        };
    }
}
window.ThunderEnemies = ThunderEnemies;
