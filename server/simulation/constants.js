'use strict';

// Core game constants — Node.js-compatible, no browser globals.
// These mirror the relevant parts of the client's Constants.js.

const BASE_HERO_STATS = {
    // ── Core heroes ───────────────────────────────────────────────────────────
    fire:        { color: '#e74c3c', hp: 60,  speed: 4,   rangeDmg: 25,  meleeDmg: 100, rangeCd: 15,  meleeCd: 120, projectileSpeed: 12, projectileSize: 6,  knockback: 4  },
    water:       { color: '#3498db', hp: 60,  speed: 4.5, rangeDmg: 12,  meleeDmg: 80,  rangeCd: 8,   meleeCd: 100, projectileSpeed: 10, projectileSize: 5,  knockback: 20 },
    ice:         { color: '#ecf0f1', hp: 50,  speed: 4,   rangeDmg: 15,  meleeDmg: 90,  rangeCd: 25,  meleeCd: 130, projectileSpeed: 15, projectileSize: 4,  knockback: 2  },
    plant:       { color: '#2ecc71', hp: 70,  speed: 3.5, rangeDmg: 22,  meleeDmg: 120, rangeCd: 30,  meleeCd: 140, projectileSpeed: 9,  projectileSize: 7,  knockback: 8  },
    metal:       { color: '#95a5a6', hp: 100, speed: 3,   rangeDmg: 40,  meleeDmg: 150, rangeCd: 40,  meleeCd: 180, projectileSpeed: 18, projectileSize: 8,  knockback: 12 },
    black:       { color: '#2c3e50', hp: 150, speed: 5,   rangeDmg: 50,  meleeDmg: 200, rangeCd: 10,  meleeCd: 80,  projectileSpeed: 20, projectileSize: 10, knockback: 25 },
    // ── Evil heroes ───────────────────────────────────────────────────────────
    green_goblin:{ color: '#1d8a2e', hp: 90,  speed: 5.5, rangeDmg: 35,  meleeDmg: 110, rangeCd: 12,  meleeCd: 100, projectileSpeed: 14, projectileSize: 6,  knockback: 10 },
    makuta:      { color: '#000000', hp: 200, speed: 4.2, rangeDmg: 60,  meleeDmg: 180, rangeCd: 8,   meleeCd: 90,  projectileSpeed: 18, projectileSize: 9,  knockback: 18 },
    // ── DLC: Tournament of Thunder ────────────────────────────────────────────
    lightning:   { color: '#ffeb3b', hp: 80,  speed: 4.5, rangeDmg: 20,  meleeDmg: 5,   rangeCd: 600, meleeCd: 1000, projectileSpeed: 15, projectileSize: 5,  knockback: 5,  staticCharge: 0, maxStaticCharge: 100 },
    // ── DLC: Waker of Winds ───────────────────────────────────────────────────
    air:         { color: '#40e0d0', hp: 60,  speed: 5.5, rangeDmg: 20,  meleeDmg: 80,  rangeCd: 80,  meleeCd: 80,  projectileSpeed: 6,  projectileSize: 6,  knockback: 15 },
    // ── DLC: Faith of Fortune ─────────────────────────────────────────────────
    spirit:      { color: '#F0D080', hp: 120, speed: 3.5, rangeDmg: 5,   meleeDmg: 20,  rangeCd: 20,  meleeCd: 120, projectileSpeed: 8,  projectileSize: 6,  knockback: 2  },
    chance:      { color: '#ff00ff', hp: 77,  speed: 4.5, rangeDmg: 7,   meleeDmg: 77,  rangeCd: 30,  meleeCd: 100, projectileSpeed: 10, projectileSize: 8,  knockback: 2  },
    // ── DLC: Champions of Chaos ───────────────────────────────────────────────
    gravity:     { color: '#8e44ad', hp: 60,  speed: 4.2, rangeDmg: 25,  meleeDmg: 110, rangeCd: 20,  meleeCd: 130, projectileSpeed: 11, projectileSize: 7,  knockback: -2 },
    // void stats are self-registered by VoidHero.js at runtime; stub provided here as fallback
    void:        { color: '#2c3e50', hp: 75,  speed: 4.5, rangeDmg: 15,  meleeDmg: 120, rangeCd: 180, meleeCd: 30,  projectileSpeed: 5,  projectileSize: 5,  knockback: 5,  meleeRadiusMult: 1.5 },
    // ── DLC: Echos of Eternity ────────────────────────────────────────────────
    time:        { color: '#c8aa6e', hp: 95,  speed: 4.2, rangeDmg: 24,  meleeDmg: 55,  rangeCd: 28,  meleeCd: 90,  projectileSpeed: 11, projectileSize: 8,  knockback: 14, chronoEnergy: 0, timelineBurden: 0 },
    love:        { color: '#ff6b9d', hp: 110, speed: 4.8, rangeDmg: 32,  meleeDmg: 62,  rangeCd: 22,  meleeCd: 65,  projectileSpeed: 12, projectileSize: 10, knockback: 12, affection: 0 },
    // ── DLC: Rise of the Rock ─────────────────────────────────────────────────
    earth:       { color: '#8d6e63', hp: 120, speed: 2.5, rangeDmg: 0,   meleeDmg: 100, rangeCd: 999, meleeCd: 120, projectileSpeed: 0,  projectileSize: 0,  knockback: 30, momentum: 0, maxMomentum: 100 },
    // ── DLC: Symphony of Sickness ─────────────────────────────────────────────
    sound:       { color: '#4fc3f7', hp: 100, speed: 5,   rangeDmg: 15,  meleeDmg: 10,  rangeCd: 40,  meleeCd: 45,  projectileSpeed: 10, projectileSize: 8,  knockback: 4  },
    poison:      { color: '#76ff03', hp: 120, speed: 4,   rangeDmg: 6,   meleeDmg: 8,   rangeCd: 30,  meleeCd: 50,  projectileSpeed: 6,  projectileSize: 10, knockback: 2  },
};

const UPGRADE_POOL = [
    { id: 'health',     title: 'Vitality',     desc: 'Increase Max HP by 25 and Heal 20%.',         icon: '❤️' },
    { id: 'radius',     title: 'Blast Radius', desc: 'Increase Melee Area of Effect by 25%.',       icon: '💥' },
    { id: 'projectile', title: 'Multishot',    desc: 'Fire +1 subsequent straight shot.',            icon: '🏹' },
    { id: 'speed',      title: 'Swiftness',    desc: 'Increase Movement Speed by 10%.',              icon: '👟' },
    { id: 'cooldown',   title: 'Haste',        desc: 'Reduce Blast Cooldown by 10%.',                icon: '⏳' },
    { id: 'defense',    title: 'Iron Skin',    desc: 'Reduce incoming damage by 5%.',                icon: '🛡️' },
    { id: 'damage',     title: 'Power',        desc: 'Increase all damage dealt by 10%.',            icon: '⚔️' },
    { id: 'luck',       title: 'Fortune',      desc: 'Increase Holy Mask drop chance.',              icon: '🍀' },
    { id: 'crit',       title: 'Lethality',    desc: '+5% Crit Chance & +20% Crit Damage.',          icon: '🎯' },
];

const ARENA_WIDTH  = 3000;
const ARENA_HEIGHT = 3000;
const PLAYER_RADIUS = 20;

// Server runs at 20 Hz. Each tick represents TICK_FRAMES equivalent 60-fps frames,
// so all frame-based timers from the client stay numerically compatible.
const TICK_MS     = 50;          // 20 Hz
const TICK_FRAMES = TICK_MS / (1000 / 60); // ≈ 3

module.exports = {
    BASE_HERO_STATS,
    UPGRADE_POOL,
    ARENA_WIDTH,
    ARENA_HEIGHT,
    PLAYER_RADIUS,
    TICK_MS,
    TICK_FRAMES,
};
