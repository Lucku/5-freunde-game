// Wave.js — extracted from game.js (improvement #1 phase C).
//
// Owns the pure-helper logic around wave progression: biome selection,
// enemies-needed math, story-boss lookup. The large `advanceWave()` body
// stays in game.js for now (entangled with 30+ run-scoped variables) but
// uses these helpers to keep the seam visible.
//
// Public surface (also mirrored on `window.*` for DLC back-compat):
//   enemiesNeededForWave(wave)         — count required to advance
//   isWaveCleared(wave, killed)        — boolean check
//   getDLCBiomePool()                  — DLC-registered biome ids
//   buildBiomePool(isStoryRun, hero)   — full type[] for biome roll
//   pickRandomBiome(types)             — uniform random pick
//   pickSeededBiome(wave, seed)        — deterministic for online co-op
//   isStoryBossWave(wave, saveData, modes) — MAKUTA at 50/100
//
// Wave.js emits no events itself; advanceWave() in game.js stays the single
// authority that signals `wave:advance` once EventBus wiring lands.

import { ENEMIES_PER_WAVE } from './Constants.js';
import { eventBus } from './Managers/EventBus.js';

const BASE_BIOMES = ['fire', 'water', 'ice', 'plant', 'metal'];
const DLC_BIOMES  = [
    'earth', 'lightning', 'air', 'gravity', 'void', 'spirit',
    'chance', 'time', 'love', 'psycho', 'mirror', 'smoke',
];

export function enemiesNeededForWave(wave) {
    return ENEMIES_PER_WAVE * wave;
}

export function isWaveCleared(wave, killed) {
    return killed >= enemiesNeededForWave(wave);
}

export function getDLCBiomePool() {
    const reg = window.BIOME_LOGIC;
    if (!reg) return [];
    return DLC_BIOMES.filter(b => !!reg[b]);
}

export function buildBiomePool(isStoryRun, heroType) {
    if (heroType === 'black') return ['black'];
    if (isStoryRun) return BASE_BIOMES.slice();
    return BASE_BIOMES.concat(getDLCBiomePool());
}

export function pickRandomBiome(types) {
    if (!types || types.length === 0) return 'fire';
    return types[Math.floor(Math.random() * types.length)];
}

// Deterministic biome pick for online co-op. Both clients derive the same
// result from a shared seed + the wave number with no client-side randomness.
const ONLINE_BIOMES = ['fire', 'water', 'ice', 'plant', 'metal', 'rock', 'cloud', 'chaos'];
export function pickSeededBiome(wave, seed) {
    const h = ((wave * 2654435761) ^ (seed * 40503)) >>> 0;
    return ONLINE_BIOMES[h % ONLINE_BIOMES.length];
}

export function isStoryBossWave(wave, saveData, modes = {}) {
    if (!saveData || !saveData.story || !saveData.story.enabled) return false;
    if (modes.isDailyMode || modes.isWeeklyMode) return false;
    return wave === 50 || wave === 100;
}

/**
 * Emit `wave:advance` on the EventBus so future extracted modules can react
 * without monkey-patching advanceWave(). Called from game.js advanceWave().
 */
export function notifyWaveAdvance(wave) {
    try { eventBus.emit('wave:advance', wave); }
    catch (e) { console.warn('wave:advance handler threw:', e); }
}

window.Wave = {
    enemiesNeededForWave, isWaveCleared, getDLCBiomePool,
    buildBiomePool, pickRandomBiome, pickSeededBiome,
    isStoryBossWave, notifyWaveAdvance,
};
