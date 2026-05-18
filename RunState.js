// RunState.js — extracted from game.js (improvement #1 phase D + #11 phase 1).
//
// Two distinct exports here:
//
//   1. createRunStats() — the per-run statistics object factory + helpers.
//      Canonical instance lives in game.js as `currentRunStats`.
//
//   2. createRunState() — NEW in #11 phase 1. Container schema for the
//      ~70 module-scope `let`/`var` globals in game.js that are run-scoped
//      (entity arrays, lifecycle scalars, mode flags, story/objective/weather,
//      combat/cinematic, players + revival). No fields are wired up yet —
//      this phase only lands the schema + factory so later phases can migrate
//      consumers one slice at a time without churning the type definition.
//
// Public surface (also mirrored on `window.RunState` for DLC use):
//   createRunStats({ startTime? })         — fresh stats object
//   resetRunStats(rs, { startTime? })      — mutate in place
//   bumpDamageSource(rs, src, n)           — pure version of game.js helper
//   logUpgradePick(rs, wave, sec, id, t)   — append timeline entry
//   logKeyMoment(rs, wave, sec, kind, lbl) — append timeline entry
//   createRunState()                       — fresh run-state container

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

// #5 phase 5.1+ — ECS systems init bridge. Each component-array system
// owns a per-runState `init<Entity>(rs)` that allocates typed arrays. The
// container calls them so a fresh `runState` has both legacy class-array
// fields (entity types not yet migrated) and ECS typed arrays for the
// migrated ones.
import { initPowerUps } from './core/systems/powerUpSystem.js';
import { initCardDrops } from './core/systems/cardDropSystem.js';

// ───────────────────────────────────────────────────────────────────────────
// #11 phase 1 — RunState container schema.
//
// The fields below mirror the run-scoped module-scope globals currently in
// game.js. Later phases (#11.2 – #11.7) migrate consumers slice-by-slice. The
// per-phase mapping lives in tasks/active-work.md.
//
// IMPORTANT — defaults must match game.js's initial values byte-for-byte so a
// later phase can flip `let foo = X` into `runState.foo` without behavior
// drift. Entity arrays are fresh `[]` per call so each session gets its own.
// ───────────────────────────────────────────────────────────────────────────

/**
 * @typedef {Object} RunState
 *
 * Phase 2 — entity arrays (mutated in place by spawners + entity loops):
 * @property {Array} enemies
 * @property {Array} projectiles
 * @property {Array} particles
 * @property {Array} floatingTexts
 * @property {Array} meleeAttacks
 * @property {Array} holyMasks
 * @property {Array} goldDrops
 * @property {Array} cardDrops
 * @property {Array} memoryShards
 * @property {Array} companions
 * (#5 phase 5.1 — `powerUps` migrated to ECS typed arrays. See
 *  core/systems/powerUpSystem.js.)
 * (#5 phase 5.2 — `cardDrops` migrated to ECS typed arrays. See
 *  core/systems/cardDropSystem.js.)
 *
 * Phase 3 — run-lifecycle scalars:
 * @property {number}  wave
 * @property {number}  score
 * @property {number}  frame
 * @property {boolean} gameRunning
 * @property {boolean} gamePaused
 * @property {boolean} isLevelingUp
 * @property {boolean} isShopping
 * @property {boolean} bossActive
 * @property {number}  enemiesKilledInWave
 * @property {number}  coopZoom
 * @property {number}  _hitStopFrames
 *
 * Phase 4 — mode flags (isPhotoMode stays Camera-owned, not migrating):
 * @property {boolean} isCoopMode
 * @property {boolean} isAICompanionMode
 * @property {boolean} isEvilMode
 * @property {boolean} isDailyMode
 * @property {boolean} isWeeklyMode
 * @property {boolean} isTutorialMode
 * @property {boolean} isOnlineMode
 * @property {boolean} isOnlineHost
 * @property {boolean} isOnlineGuest
 * @property {boolean} isVersusMode
 * @property {boolean} isWorkshopMode
 * @property {boolean} isTestingMode
 * @property {boolean} isChaosShuffleMode
 * @property {boolean} isSpeedrunMode
 *
 * Phase 5 — story / objective / weather:
 * @property {Object|null} currentStoryEvent
 * @property {Object|null} currentObjective
 * @property {boolean}     isStoryOpen
 * @property {string}      currentBiomeType
 * @property {string|null} currentWeather
 * @property {string|null} currentWeather2
 * @property {number}      weatherTimer
 * @property {number}      weatherDuration
 * @property {number}      weatherDuration2
 * @property {Array}       weatherParticles
 * @property {number}      _weatherFlash
 * @property {Array}       _weatherBolts
 * @property {Array}       activeMutators
 *
 * Phase 6 — combat / cinematic:
 * @property {number}  bossDeathTimer
 * @property {number}  bossIntroTimer
 * @property {string}  bossIntroName
 * @property {boolean} bossIntroSkippable
 * @property {number}  bossIntroCamStartX
 * @property {number}  bossIntroCamStartY
 * @property {number}  bossIntroCamTargetX
 * @property {number}  bossIntroCamTargetY
 * @property {boolean} _bossChoiceScreen
 * @property {number}  _bossChoiceFrame
 * @property {number}  _bossChoiceFocus
 * @property {Object}  _bossChoiceGpPrev
 * @property {boolean} isPlayerDying
 * @property {number}  playerDeathTimer
 *
 * Phase 7 — players + revival + stats:
 * @property {Object|null} player
 * @property {Object|null} player2
 * @property {Object|null} p1RevivalMarker
 * @property {Object|null} p2RevivalMarker
 * @property {Object}      currentRunStats
 */

/**
 * Fresh per-session run-state container.
 *
 * Phase 1 of #11 lands the schema only — no consumer reads or writes through
 * this object yet. Subsequent phases migrate one field group at a time.
 *
 * @returns {RunState}
 */
export function createRunState() {
    const rs = {
        // Phase 2 — entity arrays.
        // PowerUp migrated to ECS in #5 phase 5.1 — see initPowerUps below.
        // CardDrop migrated to ECS in #5 phase 5.2 — see initCardDrops below.
        enemies:         [],
        projectiles:     [],
        particles:       [],
        floatingTexts:   [],
        meleeAttacks:    [],
        holyMasks:       [],
        goldDrops:       [],
        memoryShards:    [],
        companions:      [],

        // Phase 3 — run-lifecycle scalars.
        wave:                1,
        score:               0,
        frame:               0,
        gameRunning:         false,
        gamePaused:          false,
        isLevelingUp:        false,
        isShopping:          false,
        bossActive:          false,
        enemiesKilledInWave: 0,
        coopZoom:            1.0,
        _hitStopFrames:      0,

        // Phase 4 — mode flags.
        isCoopMode:         false,
        isAICompanionMode:  false,
        isEvilMode:         false,
        isDailyMode:        false,
        isWeeklyMode:       false,
        isTutorialMode:     false,
        isOnlineMode:       false,
        isOnlineHost:       false,
        isOnlineGuest:      false,
        isVersusMode:       false,
        isWorkshopMode:     false,
        isTestingMode:      false,
        isChaosShuffleMode: false,
        isSpeedrunMode:     false,

        // Phase 5 — story / objective / weather.
        currentStoryEvent: null,
        currentObjective:  null,
        isStoryOpen:       false,
        currentBiomeType:  'fire',
        currentWeather:    null,
        currentWeather2:   null,
        weatherTimer:      3600,
        weatherDuration:   0,
        weatherDuration2:  0,
        weatherParticles:  [],
        _weatherFlash:     0,
        _weatherBolts:     [],
        activeMutators:    [],

        // Phase 6 — combat / cinematic.
        bossDeathTimer:      0,
        bossIntroTimer:      0,
        bossIntroName:       '',
        bossIntroSkippable:  false,
        bossIntroCamStartX:  0,
        bossIntroCamStartY:  0,
        bossIntroCamTargetX: 0,
        bossIntroCamTargetY: 0,
        _bossChoiceScreen:   false,
        _bossChoiceFrame:    0,
        _bossChoiceFocus:    0,
        _bossChoiceGpPrev:   {},
        isPlayerDying:       false,
        playerDeathTimer:    0,

        // Phase 7 — players + revival + stats.
        player:          null,
        player2:         null,
        p1RevivalMarker: null,
        p2RevivalMarker: null,
        currentRunStats: createRunStats({ startTime: 0 }),
    };

    // ECS system inits — see tasks/ecs-design.md.
    initPowerUps(rs);
    initCardDrops(rs);

    return rs;
}

// #173 phase 10 — singleton instance. game.js no longer owns the canonical
// `runState`; leaf modules `import { runState } from './RunState.js'` to read
// run-scoped state without coupling to game.js's module scope. The renderer
// + DLC also see it via `window.runState` (set below) for bare-name access.
export const runState = createRunState();
if (typeof window !== 'undefined') window.runState = runState;

window.RunState = {
    createRunStats, resetRunStats, bumpDamageSource,
    logUpgradePick, logKeyMoment,
    createRunState,
};
