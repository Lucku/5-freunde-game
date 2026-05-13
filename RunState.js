// RunState.js — extracted from game.js (improvement #1 phase D).
//
// Owns the *factory + helpers* for the per-run statistics object. The
// canonical instance still lives in game.js as `currentRunStats` (and the
// World shim mirrors it onto `window._world.currentRunStats`) — touching the
// 100+ direct `currentRunStats.X` references was out of scope for this pass.
//
// Future passes can grow RunState into a real container that owns:
//   wave, enemiesKilledInWave, masksDroppedInWave, bossActive,
//   bossDeathTimer, currentBiomeType, currentObjective, currentWeather,
//   activeMutators, p1/p2RevivalMarker — i.e. the run-scoped subset of the
//   ~540 module-scope globals in game.js (#11 in the improvement backlog).
//
// Public surface (also mirrored on `window.RunState` for DLC use):
//   createRunStats({ startTime? })         — fresh stats object
//   resetRunStats(rs, { startTime? })      — mutate in place
//   bumpDamageSource(rs, src, n)           — pure version of game.js helper
//   logUpgradePick(rs, wave, sec, id, t)   — append timeline entry
//   logKeyMoment(rs, wave, sec, kind, lbl) — append timeline entry

export function createRunStats({ startTime = Date.now() } = {}) {
    return {
        missilesFired: 0,
        startTime,
        damageTaken:   0,
        damageDealt:   0,
        moneyGained:   0,
        moneySpent:    0,
        enemiesKilled: 0,
        bossesKilled:  0,
        maxCombo:      0,
        itemsBought:   0,
        // End-of-run breakdown buckets (#160).
        upgradesPicked: [],   // [{ wave, timeSec, id, title }, ...]
        keyMoments:     [],   // [{ wave, timeSec, kind, label }, ...]
        damageBySource: {},   // 'melee'|'projectile'|'special'|'dot' → number
        // Speedrun splits — populated only when isSpeedrunMode. Pushed every 10
        // cleared waves and on THE_END so the final win-wave row always exists.
        splits:         [],   // [{ wave, timeSec }, ...]
    };
}

export function resetRunStats(rs, opts = {}) {
    const fresh = createRunStats(opts);
    for (const k of Object.keys(fresh)) rs[k] = fresh[k];
    return rs;
}

export function bumpDamageSource(rs, src, n) {
    if (!rs || !rs.damageBySource || !(n > 0)) return;
    rs.damageBySource[src] = (rs.damageBySource[src] || 0) + n;
}

export function logUpgradePick(rs, wave, timeSec, id, title) {
    if (!rs || !rs.upgradesPicked) return;
    rs.upgradesPicked.push({ wave, timeSec, id, title });
}

export function logKeyMoment(rs, wave, timeSec, kind, label) {
    if (!rs || !rs.keyMoments) return;
    rs.keyMoments.push({ wave, timeSec, kind, label });
}

window.RunState = {
    createRunStats, resetRunStats, bumpDamageSource,
    logUpgradePick, logKeyMoment,
};
