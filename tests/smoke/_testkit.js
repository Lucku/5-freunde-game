// Smoke-test harness shared across `tests/smoke/*.test.js`.
//
// Reuses `server/simulation/loader.js` — the same shim the nightly headless
// harness uses. The loader installs a `global.window = global` shim plus
// stubbed canvas / Audio / document / localStorage, then loads every entity
// class and DLC `HERO_LOGIC` block. After it runs, browser-side classes are
// reachable as plain Node modules.
//
// The smoke tests are deterministic: they construct one `GameSession` per
// scenario, force-set the entity under test, drive a fixed number of ticks
// with stub inputs, and assert that nothing throws. Behavior correctness
// (damage numbers, win/loss outcomes) is out of scope — that's what the
// nightly stochastic harness covers.

import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);

// `require()` cache makes this idempotent — the loader runs exactly once
// per worker even if multiple test files import the testkit.
require('../../server/simulation/loader.js');
const GameSession = require('../../server/simulation/GameSession.js');
const { BASE_HERO_STATS } = require('../../server/simulation/constants.js');

// Stable hero roster: whatever the server table contains at module-load
// time. DLC heroes that self-register at file-load (VoidHero, GravityHero,
// etc.) have already mutated the shared object by the time the loader
// returns.
export const HERO_KEYS = Object.freeze(Object.keys(BASE_HERO_STATS));

// Idle-input template. Every smoke test starts from this and toggles only
// the field it's exercising.
export const STUB_INPUT = Object.freeze({
    x: 0, y: 0, aimAngle: 0,
    shoot: false, melee: false, dash: false, special: false,
});

let _runIdCounter = 0;

// Create a fresh GameSession with a virtual clock + silenced loggers, ready
// to tick. Caller MUST invoke `teardown()` in a `finally` block so the
// real `Date.now` / `console.log` are restored even on test failure.
export function createSmokeSession(hostHero, guestHero = 'fire', mode = 'NORMAL') {
    const id = ++_runIdCounter;
    const events = [];

    const session = new GameSession(
        {
            code: `smoke-${id}`,
            host:  { ws: 'HOST',  userId: `s${id}h` },
            guest: { ws: 'GUEST', userId: `s${id}g` },
        },
        (_ws, msg) => {
            if (msg && msg.type && msg.type !== 'SNAPSHOT') events.push(msg);
        },
    );

    // GameSession reads `Date.now()` for wave-spawn pacing. Real-time barely
    // advances during a tight tick loop, so the spawner would starve. Pin
    // the clock and advance it by the simulation's nominal tick interval
    // after each `_tick()` call.
    const realDateNow = Date.now;
    let virtualNow = realDateNow.call(Date);
    Date.now = () => virtualNow;

    // DLC hero logic logs heavily on update — drown it out so test output
    // stays readable. Errors still bubble through the try/catch wrapping
    // each test case.
    const realLog  = console.log;
    const realWarn = console.warn;
    const realInfo = console.info;
    console.log  = () => {};
    console.warn = () => {};
    console.info = () => {};

    session.init(hostHero, guestHero, mode);

    // Replace the auto-driven 30 Hz tick interval with manual stepping so
    // each test owns its time advancement.
    if (session._tickInterval) {
        clearTimeout(session._tickInterval);
        session._tickInterval = null;
    }

    const ctx = {
        session,
        events,
        advanceClock(ms = session._currentTickMs || 33) {
            virtualNow += ms;
        },
        teardown() {
            try { session.stop(); } catch { /* swallow */ }
            Date.now     = realDateNow;
            console.log  = realLog;
            console.warn = realWarn;
            console.info = realInfo;
        },
    };

    return ctx;
}

// Drive `n` ticks. Re-applies `input` to both players every tick so
// latched actions (`_pendingShoot` etc.) re-fire as long as the input
// flag stays set.
export function tickN(ctx, n, input = STUB_INPUT) {
    for (let i = 0; i < n; i++) {
        if (ctx.session.isLevelingUp) _autoResolveLevelUp(ctx.session);
        ctx.session.applyInput('host',  input);
        ctx.session.applyInput('guest', STUB_INPUT);
        ctx.session._tick();
        ctx.advanceClock();
    }
}

// Press special once: send `special:true` for one tick, then release.
// Special is consumed on the rising edge; holding it down does nothing
// extra.
export function pressSpecial(ctx, settleTicks = 30) {
    ctx.session.applyInput('host', { ...STUB_INPUT, special: true });
    ctx.session._tick();
    ctx.advanceClock();
    // Settle: lets the special animation / projectile burst dissipate so
    // hero-specific cleanup branches get hit.
    tickN(ctx, settleTicks, STUB_INPUT);
}

export function hostPlayer(ctx) { return ctx.session.players[0]; }

// Force every resource bucket the smoke suite is aware of to its max so
// any resource-gated special / ultimate can fire. Setting more fields
// than a given hero owns is a no-op since plain property writes don't
// throw on unknown keys.
export function forceSpecialReady(player) {
    player.specialCooldown = 0;
    if ('innerPeace'     in player) player.innerPeace     = player.maxInnerPeace     ?? 100;
    if ('staticCharge'   in player) player.staticCharge   = player.maxStaticCharge   ?? 100;
    if ('momentum'       in player) player.momentum       = player.maxMomentum       ?? 100;
    if ('chronoEnergy'   in player) player.chronoEnergy   = 100;
    if ('affection'      in player) player.affection      = 100;
    if ('timelineBurden' in player) player.timelineBurden = 0;
}

function _autoResolveLevelUp(session) {
    const idx = session._levelUpFor;
    if (idx < 0) { session.isLevelingUp = false; return; }
    const role    = idx === 0 ? 'host' : 'guest';
    const player  = session.players[idx];
    const options = (player && player._levelUpOptions) || [];
    if (options.length) {
        session.applyLevelUpChoice(role, options[0].id);
    } else {
        session.isLevelingUp = false;
        session._levelUpFor  = -1;
    }
}
