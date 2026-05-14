// Server-side example maps. Seeded into custom_maps on startup as if
// uploaded by a system user ("5 Freunde Team") so they appear naturally
// in the Community/Newest tabs and demonstrate the workshop flow.

const VOLCANIC_CRUCIBLE = {
    version: 2,
    name: 'Volcanic Crucible',
    biomeType: 'fire',
    arenaWidth: 2000,
    arenaHeight: 1500,
    obstacles: [
        { x: 300,  y: 200,  w: 120, h: 120, biomeType: 'fire' },
        { x: 1580, y: 200,  w: 120, h: 120, biomeType: 'fire' },
        { x: 300,  y: 1180, w: 120, h: 120, biomeType: 'fire' },
        { x: 1580, y: 1180, w: 120, h: 120, biomeType: 'fire' },
        { x: 700,  y: 500,  w: 100, h: 100, biomeType: 'fire' },
        { x: 1200, y: 500,  w: 100, h: 100, biomeType: 'fire' },
        { x: 700,  y: 900,  w: 100, h: 100, biomeType: 'fire' },
        { x: 1200, y: 900,  w: 100, h: 100, biomeType: 'fire' },
    ],
    biomeZones: [
        { type: 'LAVA', x: 50,   y: 50,   w: 300, h: 200 },
        { type: 'LAVA', x: 1650, y: 50,   w: 300, h: 200 },
        { type: 'LAVA', x: 50,   y: 1250, w: 300, h: 200 },
        { type: 'LAVA', x: 1650, y: 1250, w: 300, h: 200 },
        { type: 'LAVA', x: 900,  y: 680,  w: 200, h: 140 },
    ],
    traps: [
        { type: 'SPIKE', x: 500,  y: 750 },
        { type: 'SPIKE', x: 1500, y: 750 },
    ],
    waveConfig: {
        waveCount: 8,
        enemiesPerWave: 30,
        spawnRateBase: 40,
        spawnRateDecayPerWave: 1.5,
        enemyPool: ['BASIC', 'SHOOTER', 'BOMBER', 'BRUTE'],
        bossType: 'TANK',
    },
};

const CRYO_GAUNTLET = {
    version: 2,
    name: 'Cryo Gauntlet',
    biomeType: 'ice',
    arenaWidth: 2000,
    arenaHeight: 1500,
    obstacles: [
        { x: 300,  y: 350,  w: 500, h: 50, biomeType: 'ice' },
        { x: 1200, y: 350,  w: 500, h: 50, biomeType: 'ice' },
        { x: 300,  y: 1100, w: 500, h: 50, biomeType: 'ice' },
        { x: 1200, y: 1100, w: 500, h: 50, biomeType: 'ice' },
        { x: 500,  y: 600,  w: 50,  h: 300, biomeType: 'ice' },
        { x: 1450, y: 600,  w: 50,  h: 300, biomeType: 'ice' },
    ],
    biomeZones: [
        { type: 'ICE', x: 50,   y: 50,   w: 500, h: 300 },
        { type: 'ICE', x: 1450, y: 50,   w: 500, h: 300 },
        { type: 'ICE', x: 50,   y: 1150, w: 500, h: 300 },
        { type: 'ICE', x: 1450, y: 1150, w: 500, h: 300 },
    ],
    traps: [
        { type: 'SLOW',       x: 900,  y: 700 },
        { type: 'SLOW',       x: 1100, y: 700 },
        { type: 'LASER_BEAM', x: 700,  y: 200 },
        { type: 'LASER_BEAM', x: 1300, y: 1300 },
        { type: 'TURRET',     x: 200,  y: 750 },
        { type: 'TURRET',     x: 1800, y: 750 },
        { type: 'TELEPORTER', x: 120,  y: 120,  pairIndex: 7 },
        { type: 'TELEPORTER', x: 1880, y: 1380, pairIndex: 6 },
    ],
    waveConfig: {
        waveCount: 5,
        enemiesPerWave: 20,
        spawnRateBase: 50,
        spawnRateDecayPerWave: 2.0,
        enemyPool: ['SPEEDSTER', 'SWARM', 'BASIC'],
        bossType: 'HYDRA',
    },
};

const MAGNETIC_COLISEUM = {
    version: 2,
    name: 'Magnetic Coliseum',
    biomeType: 'metal',
    arenaWidth: 2400,
    arenaHeight: 1800,
    obstacles: [
        { x: 700,  y: 500,  w: 200, h: 200, biomeType: 'metal' },
        { x: 1500, y: 500,  w: 200, h: 200, biomeType: 'metal' },
        { x: 700,  y: 1100, w: 200, h: 200, biomeType: 'metal' },
        { x: 1500, y: 1100, w: 200, h: 200, biomeType: 'metal' },
        { x: 1100, y: 800,  w: 200, h: 200, biomeType: 'metal' },
    ],
    biomeZones: [
        { type: 'MAGNET',      x: 50,   y: 50,   w: 400, h: 400 },
        { type: 'MAGNET',      x: 1950, y: 50,   w: 400, h: 400 },
        { type: 'MAGNET',      x: 50,   y: 1350, w: 400, h: 400 },
        { type: 'MAGNET',      x: 1950, y: 1350, w: 400, h: 400 },
        { type: 'DARK_ENERGY', x: 200,  y: 850,  w: 500, h: 100 },
        { type: 'DARK_ENERGY', x: 1700, y: 850,  w: 500, h: 100 },
    ],
    traps: [
        { type: 'CONVEYOR', x: 400,  y: 200 },
        { type: 'CONVEYOR', x: 2000, y: 200 },
        { type: 'CONVEYOR', x: 400,  y: 1600 },
        { type: 'CONVEYOR', x: 2000, y: 1600 },
        { type: 'SPIKE',    x: 1200, y: 400 },
        { type: 'SPIKE',    x: 1200, y: 1400 },
    ],
    waveConfig: {
        waveCount: 10,
        enemiesPerWave: 40,
        spawnRateBase: 35,
        spawnRateDecayPerWave: 1.0,
        enemyPool: ['BRUTE', 'SUMMONER', 'SNIPER', 'SHIELDER'],
        bossType: 'RHINO',
    },
};

module.exports = {
    SYSTEM_USER_ID: 0,
    SYSTEM_AUTHOR:  '5 Freunde Team',
    EXAMPLE_MAPS:   [VOLCANIC_CRUCIBLE, CRYO_GAUNTLET, MAGNETIC_COLISEUM],
};
