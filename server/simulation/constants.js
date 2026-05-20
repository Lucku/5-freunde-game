'use strict';

// #199 — Server constants. Single source of truth: the 8 base heroes +
// `UPGRADE_POOL` come from the browser-side `Constants.js` via ESM-from-CJS
// `require` (Node 24+ honors `__esModule` interop). The 11 DLC heroes,
// which the browser self-registers at DLC load time, are baked in here
// because the server doesn't run a DLC bootstrap pass — they're available
// from the first `init()`. ARENA / TICK constants are server-only.

const _browserConstants = require('../../Constants.js');
const _baseHeroStats = _browserConstants.BASE_HERO_STATS;
const _upgradePool   = _browserConstants.UPGRADE_POOL;

// ── DLC hero stat block ────────────────────────────────────────────────────
// Mirrors what each DLC `index.js` injects into `BASE_HERO_STATS` at
// browser-side DLC load. Keep field shape identical to the base entries
// (color, hp, speed, rangeDmg, meleeDmg, rangeCd, meleeCd, projectileSpeed,
// projectileSize, knockback, plus optional per-hero special-resource
// fields). Drift between this table and the DLC `index.js` blocks would
// surface as "server reports different stats than the renderer" in online
// coop — keep in sync when adding new DLC heroes.
const _dlcHeroStats = {
    // Tournament of Thunder
    lightning:   { color: '#ffeb3b', hp: 80,  speed: 4.5, rangeDmg: 20,  meleeDmg: 5,   rangeCd: 600, meleeCd: 1000, projectileSpeed: 15, projectileSize: 5,  knockback: 5,  staticCharge: 0, maxStaticCharge: 100 },
    // Waker of Winds
    air:         { color: '#40e0d0', hp: 60,  speed: 5.5, rangeDmg: 20,  meleeDmg: 80,  rangeCd: 80,  meleeCd: 80,   projectileSpeed: 6,  projectileSize: 6,  knockback: 15 },
    // Faith of Fortune
    spirit:      { color: '#F0D080', hp: 120, speed: 3.5, rangeDmg: 5,   meleeDmg: 20,  rangeCd: 20,  meleeCd: 120,  projectileSpeed: 8,  projectileSize: 6,  knockback: 2  },
    chance:      { color: '#ff00ff', hp: 77,  speed: 4.5, rangeDmg: 7,   meleeDmg: 77,  rangeCd: 30,  meleeCd: 100,  projectileSpeed: 10, projectileSize: 8,  knockback: 2  },
    // Champions of Chaos
    gravity:     { color: '#8e44ad', hp: 60,  speed: 4.2, rangeDmg: 25,  meleeDmg: 110, rangeCd: 20,  meleeCd: 130,  projectileSpeed: 11, projectileSize: 7,  knockback: -2 },
    // VoidHero.js self-registers at runtime; stub provided here as fallback
    void:        { color: '#2c3e50', hp: 75,  speed: 4.5, rangeDmg: 15,  meleeDmg: 120, rangeCd: 180, meleeCd: 30,   projectileSpeed: 5,  projectileSize: 5,  knockback: 5,  meleeRadiusMult: 1.5 },
    // Echos of Eternity
    time:        { color: '#c8aa6e', hp: 95,  speed: 4.2, rangeDmg: 24,  meleeDmg: 55,  rangeCd: 28,  meleeCd: 90,   projectileSpeed: 11, projectileSize: 8,  knockback: 14, chronoEnergy: 0, timelineBurden: 0 },
    love:        { color: '#ff6b9d', hp: 110, speed: 4.8, rangeDmg: 32,  meleeDmg: 62,  rangeCd: 22,  meleeCd: 65,   projectileSpeed: 12, projectileSize: 10, knockback: 12, affection: 0 },
    // Rise of the Rock
    earth:       { color: '#8d6e63', hp: 120, speed: 2.5, rangeDmg: 0,   meleeDmg: 100, rangeCd: 999, meleeCd: 120,  projectileSpeed: 0,  projectileSize: 0,  knockback: 30, momentum: 0, maxMomentum: 100 },
    // Symphony of Sickness
    sound:       { color: '#4fc3f7', hp: 100, speed: 5,   rangeDmg: 15,  meleeDmg: 10,  rangeCd: 40,  meleeCd: 45,   projectileSpeed: 10, projectileSize: 8,  knockback: 4  },
    poison:      { color: '#76ff03', hp: 120, speed: 4,   rangeDmg: 6,   meleeDmg: 8,   rangeCd: 30,  meleeCd: 50,   projectileSpeed: 6,  projectileSize: 10, knockback: 2  },
};

// Merge: base from browser + DLC. Browser table is read-only; the merge
// returns a fresh object so server doesn't mutate the import.
const BASE_HERO_STATS = Object.assign({}, _baseHeroStats, _dlcHeroStats);
const UPGRADE_POOL    = _upgradePool;

// ── Server-only constants ──────────────────────────────────────────────────
const ARENA_WIDTH   = 3000;
const ARENA_HEIGHT  = 3000;
const PLAYER_RADIUS = 20;

// Server runs at 30 Hz. Each tick represents TICK_FRAMES equivalent 60-fps
// frames, so all frame-based timers from the client stay numerically
// compatible. Higher tick rate = smaller gaps between snapshots = smoother
// client-side interpolation.
const TICK_MS     = 33;
const TICK_FRAMES = TICK_MS / (1000 / 60); // ≈ 1.98

module.exports = {
    BASE_HERO_STATS,
    UPGRADE_POOL,
    ARENA_WIDTH,
    ARENA_HEIGHT,
    PLAYER_RADIUS,
    TICK_MS,
    TICK_FRAMES,
};
