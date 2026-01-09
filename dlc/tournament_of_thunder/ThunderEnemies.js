// New Enemies for Cloud Biome

class ThunderEnemies {
    static inject() {
        if (!window.ENEMY_TYPES) return;

        // 1. Cloud Bat
        window.ENEMY_TYPES['CLOUD_BAT'] = {
            hp: 20, speed: 4, damage: 10, color: '#90a4ae', radius: 15, xp: 2,
            behavior: 'SWARM',
            immuneToWind: false
        };

        // 2. Storm Elemental
        window.ENEMY_TYPES['STORM_ELEMENTAL'] = {
            hp: 60, speed: 2, damage: 15, color: '#fbc02d', radius: 25, xp: 5,
            behavior: 'SHOOTER',
            projectileSpeed: 8,
            projectileColor: 'yellow'
        };

        // 3. Zeus Bot (Mini-Boss)
        window.ENEMY_TYPES['ZEUS_BOT'] = {
            hp: 300, speed: 1.5, damage: 30, color: '#fff', radius: 40, xp: 50,
            behavior: 'BOSS_MINI',
            isElite: true
        };

        // 4. Makuta (Superboss) - This definition is mainly for reference/spawner compatibility
        window.ENEMY_TYPES['MAKUTA'] = {
            hp: 50000, speed: 4, damage: 50, color: '#fff', radius: 80, xp: 10000,
            behavior: 'BOSS',
            isBoss: true
        };
    }
}
window.ThunderEnemies = ThunderEnemies;
