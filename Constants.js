// --- Configuration ---
const BASE_HERO_STATS = {
    fire: { color: '#e74c3c', hp: 60, speed: 4, rangeDmg: 25, meleeDmg: 100, rangeCd: 15, meleeCd: 120, projectileSpeed: 12, projectileSize: 6, knockback: 4 },
    water: { color: '#3498db', hp: 60, speed: 4.5, rangeDmg: 12, meleeDmg: 80, rangeCd: 8, meleeCd: 100, projectileSpeed: 10, projectileSize: 5, knockback: 20 },
    ice: { color: '#ecf0f1', hp: 50, speed: 4, rangeDmg: 15, meleeDmg: 90, rangeCd: 25, meleeCd: 130, projectileSpeed: 15, projectileSize: 4, knockback: 2 },
    plant: { color: '#2ecc71', hp: 70, speed: 3.5, rangeDmg: 10, meleeDmg: 120, rangeCd: 30, meleeCd: 140, projectileSpeed: 9, projectileSize: 7, knockback: 8 },
    metal: { color: '#95a5a6', hp: 100, speed: 3, rangeDmg: 40, meleeDmg: 150, rangeCd: 40, meleeCd: 180, projectileSpeed: 18, projectileSize: 8, knockback: 12 }
};

const POWERUP_TYPES = ['HEAL', 'MAXHP', 'SPEED', 'MULTI', 'AUTOAIM'];
const WEAPON_TYPES = ['SCATTER', 'MINIGUN', 'BAZOOKA'];
const BOSS_TYPES = ['TANK', 'SPEEDSTER', 'SUMMONER', 'NOVA', 'RHINO', 'HYDRA'];
const ENEMIES_PER_WAVE = 30;
const SKILL_TREE_SIZE = 100;


// --- ACHIEVEMENTS GENERATOR ---
const ACHIEVEMENTS = [];

function addAch(id, title, desc, req, stat, type, val, text) {
    ACHIEVEMENTS.push({ id, title, desc, req, stat, bonus: { type, val, text } });
}

// 1. Kills (Total)
const killTiers = [
    [100, 'Novice Slayer', 0.01], [500, 'Adept Slayer', 0.01], [1000, 'Master Slayer', 0.01],
    [5000, 'Genocide', 0.02], [10000, 'Extinction', 0.02], [50000, 'Apocalypse', 0.05],
    [100000, 'Cataclysm', 0.05], [250000, 'Oblivion', 0.05], [500000, 'Entropy', 0.10], [1000000, 'Death Incarnate', 0.10]
];
killTiers.forEach(t => addAch(`kill_${t[0]}`, t[1], `Kill ${t[0]} enemies.`, t[0], 'totalKills', 'damage', t[2], `+${(t[2] * 100).toFixed(0)}% Dmg`));

// 2. Gold (Total)
const goldTiers = [
    [1000, 'Pocket Change', 0.05], [5000, 'Piggy Bank', 0.05], [10000, 'Merchant', 0.05],
    [50000, 'Treasurer', 0.10], [100000, 'Tycoon', 0.10], [500000, 'Baron', 0.10],
    [1000000, 'Dragon Hoard', 0.20], [5000000, 'Midas Touch', 0.20], [10000000, 'Economy', 0.25], [100000000, 'Infinite Wealth', 0.50]
];
goldTiers.forEach(t => addAch(`gold_${t[0]}`, t[1], `Collect ${t[0]} Gold.`, t[0], 'totalGold', 'gold', t[2], `+${(t[2] * 100).toFixed(0)}% Gold`));

// 3. Waves (Max Reached)
const waveTiers = [
    [10, 'Survivor', 0.05], [20, 'Veteran', 0.05], [30, 'Elite', 0.05], [40, 'Champion', 0.10], [50, 'Legend', 0.10],
    [60, 'Mythic', 0.10], [70, 'Immortal', 0.15], [80, 'Divine', 0.15], [90, 'Eternal', 0.20], [100, 'The End', 0.25]
];
waveTiers.forEach(t => addAch(`wave_${t[0]}`, t[1], `Reach Wave ${t[0]}.`, t[0], 'maxWave', 'health', t[2], `+${(t[2] * 100).toFixed(0)}% HP`));

// 4. Bosses (Total)
const bossTiers = [
    [5, 'Boss Killer', 0.02], [10, 'Giant Slayer', 0.02], [25, 'Titan Hunter', 0.03], [50, 'God Slayer', 0.05],
    [100, 'Kingslayer', 0.05], [250, 'Regicide', 0.05], [500, 'Deicide', 0.10], [1000, 'Pantheon Fall', 0.10]
];
bossTiers.forEach(t => addAch(`boss_${t[0]}`, t[1], `Kill ${t[0]} Bosses.`, t[0], 'totalBosses', 'damage', t[2], `+${(t[2] * 100).toFixed(0)}% Dmg`));

// 5. Damage Dealt (Total)
const dmgTiers = [
    [10000, 'Ouch', 0.01], [100000, 'Hurts', 0.01], [1000000, 'Pain', 0.02], [10000000, 'Agony', 0.02],
    [100000000, 'Destruction', 0.05], [500000000, 'Devastation', 0.05], [1000000000, 'Annihilation', 0.10]
];
dmgTiers.forEach(t => addAch(`dmg_${t[0]}`, t[1], `Deal ${t[0]} Damage.`, t[0], 'totalDamage', 'damage', t[2], `+${(t[2] * 100).toFixed(0)}% Dmg`));

// 6. Combo (Max) - 50 Levels
for (let i = 1; i <= 50; i++) {
    addAch(`combo_${i * 50}`, `Combo Master ${i}`, `Reach ${i * 50} Combo.`, i * 50, 'maxCombo', 'gold', 0.01, '+1% Gold');
}

// 7. Games Played (Total)
const gameTiers = [
    [1, 'First Step', 0.01], [10, 'Regular', 0.01], [50, 'Addict', 0.02], [100, 'Dedicated', 0.02],
    [250, 'Veteran Player', 0.05], [500, 'No Life', 0.05], [1000, 'Time Traveler', 0.10]
];
gameTiers.forEach(t => addAch(`games_${t[0]}`, t[1], `Play ${t[0]} Games.`, t[0], 'totalGames', 'speed', t[2], `+${(t[2] * 100).toFixed(0)}% Speed`));

// 8. Deaths (Total)
const deathTiers = [
    [1, 'Oof', 0.01], [10, 'Try Again', 0.01], [50, 'Determination', 0.02], [100, 'Undying Will', 0.05]
];
deathTiers.forEach(t => addAch(`death_${t[0]}`, t[1], `Die ${t[0]} times.`, t[0], 'totalDeaths', 'health', t[2], `+${(t[2] * 100).toFixed(0)}% HP`));

// 9. Skill Tree Progress (Total Unlocked Nodes across all heroes)
const skillTiers = [
    [10, 'Student', 0.01], [50, 'Learner', 0.01], [100, 'Scholar', 0.02], [200, 'Professor', 0.02],
    [300, 'Sage', 0.05], [400, 'Archmage', 0.05], [500, 'Omniscient', 0.10]
];
skillTiers.forEach(t => addAch(`skill_${t[0]}`, t[1], `Unlock ${t[0]} Skill Nodes.`, t[0], 'calculated_skills', 'cooldown', t[2], `-${(t[2] * 100).toFixed(0)}% CD`));

// 10. Prestige Levels (Total Prestige across all heroes)
const prestigeTiers = [
    [1, 'Ascension', 0.02], [5, 'High Ascendant', 0.02], [10, 'Demigod', 0.05], [20, 'Godhood', 0.05], [50, 'Beyond', 0.10]
];
prestigeTiers.forEach(t => addAch(`prestige_${t[0]}`, t[1], `Earn ${t[0]} Prestige Levels.`, t[0], 'calculated_prestige', 'damage', t[2], `+${(t[2] * 100).toFixed(0)}% Dmg`));

// 11. Void Shop Spending (Total Gold Spent in Void Shop)
const voidTiers = [
    [1000, 'Void Walker', 0.01], [10000, 'Void Trader', 0.02], [100000, 'Void Investor', 0.05], [1000000, 'Void Lord', 0.10]
];
voidTiers.forEach(t => addAch(`void_${t[0]}`, t[1], `Spend ${t[0]} Gold in Void Shop.`, t[0], 'totalVoidGoldSpent', 'damage', t[2], `+${(t[2] * 100).toFixed(0)}% Dmg`));

const WEATHER_TYPES = [
    { id: 'BLIZZARD', name: 'BLIZZARD', color: 'rgba(200, 230, 255, 0.3)', duration: 600 },
    { id: 'HEATWAVE', name: 'HEATWAVE', color: 'rgba(255, 100, 50, 0.2)', duration: 600 },
    { id: 'MAGNETIC', name: 'MAGNETIC STORM', color: 'rgba(142, 68, 173, 0.2)', duration: 400 }
];

// Helper to create card variants
const createCardSet = (type, name, color, specialDesc, specialBonus) => {
    return {
        [`${type}_1`]: { name: `${name} Bronze`, desc: `+10% Damage vs ${name}s`, chance: 0.01, color: '#cd7f32', bonus: { type: 'damage_vs', val: 0.1, target: type } },
        [`${type}_2`]: { name: `${name} Silver`, desc: `-10% Damage from ${name}s`, chance: 0.005, color: '#c0c0c0', bonus: { type: 'defense_vs', val: 0.1, target: type } },
        [`${type}_3`]: { name: `${name} Gold`, desc: `+20% XP from ${name}s`, chance: 0.0025, color: '#ffd700', bonus: { type: 'xp_vs', val: 0.2, target: type } },
        [`${type}_4`]: { name: `${name} Platinum`, desc: specialDesc, chance: 0.001, color: '#e5e4e2', bonus: specialBonus }
    };
};

const COLLECTOR_CARDS = {
    ...createCardSet('BASIC', 'Grunt', '#7f8c8d', '+10% Crit Chance vs Basics', { type: 'crit_vs', val: 0.1, target: 'BASIC' }),
    ...createCardSet('SHOOTER', 'Sniper', '#f1c40f', '15% Chance to Dodge Shooters', { type: 'special', id: 'SHOOTER_DODGE' }),
    ...createCardSet('BRUTE', 'Brute', '#5d4037', '+20% Crit Chance vs Brutes', { type: 'crit_vs', val: 0.2, target: 'BRUTE' }),
    ...createCardSet('SPEEDSTER', 'Speedster', '#e74c3c', 'Speedsters are 10% Slower', { type: 'special', id: 'SPEEDSTER_SLOW' }),
    ...createCardSet('SWARM', 'Swarm', '#8e44ad', 'Swarm enemies explode on death (Dmg to enemies)', { type: 'special', id: 'SWARM_EXPLODE' }),
    ...createCardSet('SUMMONER', 'Summoner', '#2980b9', 'Summoners summon 50% slower', { type: 'special', id: 'SUMMONER_SLOW' }),
    ...createCardSet('GHOST', 'Ghost', '#bdc3c7', 'Ghosts are always visible', { type: 'special', id: 'GHOST_VISIBLE' }),
    ...createCardSet('SNIPER', 'Assassin', '#16a085', 'Take 20% Less Dmg from Snipers', { type: 'defense_vs', val: 0.2, target: 'SNIPER' }), // Stacking with Silver
    ...createCardSet('BOMBER', 'Bomber', '#2c3e50', 'Bombers have 50% less HP', { type: 'special', id: 'BOMBER_HP' }),
    ...createCardSet('TOXIC', 'Toxic', '#27ae60', 'Immune to Toxic Trails', { type: 'special', id: 'TOXIC_IMMUNE' }),
    ...createCardSet('SHIELDER', 'Guardian', '#95a5a6', 'Attacks pierce Shields', { type: 'special', id: 'SHIELD_PIERCE' }),
    ...createCardSet('BOSS', 'Titan', '#c0392b', '+10% Damage vs Bosses', { type: 'damage_vs', val: 0.1, target: 'BOSS' })
};

const MUTATORS = [
    { id: 'TINY_ARENA', name: 'Tiny Arena', desc: 'The arena is 50% smaller.', color: '#e74c3c' },
    { id: 'EXPLOSIVE', name: 'Explosive Personality', desc: 'All enemies explode on death.', color: '#e67e22' },
    { id: 'SLUG', name: 'Slug Mode', desc: 'Player Speed -50%, Damage +200%.', color: '#f1c40f' },
    { id: 'FOG', name: 'Fog of War', desc: 'Enemies are only visible when close.', color: '#95a5a6' },
    { id: 'GIANTS', name: 'Giant Slayer', desc: 'Enemies have 2x HP and Size, but spawn 50% less.', color: '#8e44ad' },
    { id: 'SWARM', name: 'Swarm Mode', desc: 'Enemies have 50% HP and Size, but spawn 2x more.', color: '#2ecc71' },
    { id: 'FRAGILE', name: 'Glass Cannon', desc: 'Player HP is capped at 1, but Damage is 5x.', color: '#3498db' },
    { id: 'NO_REGEN', name: 'No Mercy', desc: 'No Health Drops spawn.', color: '#c0392b' },
    { id: 'WINDY', name: 'Hurricane', desc: 'Strong winds push you around.', color: '#1abc9c' }
];

const UPGRADE_POOL = [
    { id: 'health', title: 'Vitality', desc: 'Increase Max HP by 25 and Heal 20%.', icon: '❤️' },
    { id: 'radius', title: 'Blast Radius', desc: 'Increase Melee Area of Effect by 25%.', icon: '💥' },
    { id: 'projectile', title: 'Multishot', desc: 'Fire +1 subsequent straight shot.', icon: '🏹' },
    { id: 'speed', title: 'Swiftness', desc: 'Increase Movement Speed by 10%.', icon: '👟' },
    { id: 'cooldown', title: 'Haste', desc: 'Reduce Blast Cooldown by 10%.', icon: '⏳' },
    { id: 'defense', title: 'Iron Skin', desc: 'Reduce incoming damage by 5%.', icon: '🛡️' },
    { id: 'damage', title: 'Power', desc: 'Increase all damage dealt by 10%.', icon: '⚔️' },
    { id: 'luck', title: 'Fortune', desc: 'Increase Holy Mask drop chance.', icon: '🍀' },
    { id: 'crit', title: 'Lethality', desc: '+5% Crit Chance & +20% Crit Damage.', icon: '🎯' } // New Upgrade
];

const PERM_UPGRADES = {
    health: { name: "Void Heart", desc: "+5 Starting HP", baseCost: 1000, costMult: 1.2 },
    greed: { name: "Void Coin", desc: "+5% Gold Gain", baseCost: 2000, costMult: 1.3 },
    power: { name: "Void Strength", desc: "+1% Damage", baseCost: 5000, costMult: 1.4 },
    swift: { name: "Void Step", desc: "+1% Speed", baseCost: 3000, costMult: 1.3 }
};