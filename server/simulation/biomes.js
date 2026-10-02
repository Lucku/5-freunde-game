'use strict';

/**
 * server/simulation/biomes.js
 *
 * DLC biome logic on the server. Singleplayer runs each biome's
 * `BIOME_LOGIC[type].update(...)` every frame — gravity shifts, wind, falling
 * rocks, collapsing floor tiles, sludge, updrafts, enemy slows. The server
 * loaded none of them (`BIOME_LOGIC = {}`), so online those hazards only
 * existed in each client's own prediction and were overwritten by snapshots.
 *
 * The modules are the client's own files (they register themselves on
 * `window.BIOME_LOGIC`, i.e. `global` here). Packs that register from their
 * DLC index.js map the same names below. The six base biomes (Biomes.js) are
 * visual only and stay client-side.
 *
 * Biome objects hold run state (timers, hazards, wind direction — some as
 * class statics), so every session gets its own instances:
 * `createSessionBiomes()` → a registry the bridge installs as
 * `global.BIOME_LOGIC` for the duration of that session's tick.
 */

const path = require('path');
const ROOT = path.resolve(__dirname, '../../');

const MODULES = [
    'champions_of_chaos/ChaosBiome', 'champions_of_chaos/FracturedBiome',
    'disciples_of_deception/MindscapeBiome', 'disciples_of_deception/HallOfMirrorsBiome',
    'disciples_of_deception/SmogQuarterBiome',
    'faith_of_fortune/MadnessBiome', 'faith_of_fortune/TempleBiome',
    'radiance_of_ruin/CrimsonGreenhouseBiome', 'radiance_of_ruin/DreamspaceBiome',
    'radiance_of_ruin/ReliquaryBiome',
    'symphony_of_sickness/PoisonBiome', 'symphony_of_sickness/SoundBiome',
    'tournament_of_thunder/CloudBiome', 'waker_of_winds/WindBiome',
    'rise_of_the_rock/RockBiome', 'echos_of_eternity/TimeBiome', 'echos_of_eternity/LoveBiome',
];

// The modules register into the global registry (as on the client); those
// shared objects are only templates here — a tick sees its session's copies.
if (!global.BIOME_LOGIC) global.BIOME_LOGIC = {};
for (const m of MODULES) require(path.join(ROOT, 'dlc', m + '.js'));
const B = global.BIOME_LOGIC;
// Registered from their pack's index.js `injectBiome` on the client.
B.air  = global.WindBiome;
B.cloud = B.lightning = global.CloudBiome;
B.rock = B.earth = global.RockBiome;
B.time = B.eternity = global.TimeBiome;
B.love = B.heart = global.LoveBiome;
const TEMPLATES = {};
for (const m of Object.keys(B)) if (B[m]) TEMPLATES[m] = B[m];

const _plain = (v) => (v && typeof v === 'object') ? JSON.parse(JSON.stringify(v)) : v;

// A fresh, independent biome object: a new instance of an instance-style
// biome, or — for a class used statically (Cloud, Rock, Time, Love) — an
// object inheriting its methods with its own copies of the static state.
function _fresh(template) {
    if (typeof template === 'function') {
        const inst = Object.create(template);
        for (const k of Object.getOwnPropertyNames(template)) {
            if (k === 'length' || k === 'name' || k === 'prototype') continue;
            const v = template[k];
            if (typeof v !== 'function') inst[k] = _plain(v);
        }
        return inst;
    }
    return new template.constructor();
}

// Per-session registry: one instance per biome (aliases share it, as on the
// client), made on first use.
function createSessionBiomes() {
    const made = new Map();
    const reg = {};
    for (const [name, template] of Object.entries(TEMPLATES)) {
        Object.defineProperty(reg, name, {
            enumerable: true,
            get() {
                if (!made.has(template)) made.set(template, _fresh(template));
                return made.get(template);
            },
        });
    }
    return reg;
}

module.exports = { createSessionBiomes, SERVER_BIOMES: Object.keys(TEMPLATES) };
