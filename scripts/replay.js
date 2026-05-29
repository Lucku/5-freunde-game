#!/usr/bin/env node
'use strict';

/**
 * Replay-driven regression tests — improvement #147.
 *
 * A "trace" is a fully deterministic scenario descriptor:
 *   { name, rngSeed, inputSeed, hostHero, guestHero, mode, ticks }
 * Because the authoritative simulation is seedable (`GameSession._rngSeed`
 * installs `mulberry32(seed)` in `_resetEcsState`, see #195/#196/#200) and the
 * bot input stream is regenerated from `inputSeed`, the same trace replays
 * bit-identically. We capture a structured `fingerprint` of the end state and
 * commit it as the golden; CI re-runs the trace and asserts the fingerprint is
 * unchanged. A code change that alters spawns / damage / movement / level-ups
 * shifts the fingerprint and fails loudly — catching the exact regression class
 * the git log shows (e.g. "ECS shim setter broke story chapters", boss-defeat
 * crash) without anyone hand-writing assertions per system.
 *
 * Usage:
 *   node scripts/replay.js verify          # replay every golden, assert match (CI)
 *   node scripts/replay.js record          # (re)generate goldens after an INTENTIONAL change
 *   node scripts/replay.js show <name>     # print a trace's fingerprint
 *
 * `record` runs every scenario TWICE and refuses to write a golden whose two
 * fingerprints differ — that would mean a `Math.random()` leak in the sim path
 * (non-determinism) and the golden would be flaky. Fix the leak, don't commit.
 *
 * Wired into `npm test` (after parityTest) so it guards every change.
 */

const fs = require('fs');
const path = require('path');

require('../server/simulation/loader');
const GameSession = require('../server/simulation/GameSession');

const TRACE_DIR = path.join(__dirname, 'replay-traces');
const TICK_MS_FALLBACK = 33;

// ─── Scenarios (the recorded "input traces") ────────────────────────────────
// Fixed seeds + heroes + modes. Keep these stable; changing a scenario's
// seed/heroes/ticks invalidates its golden (re-record intentionally).
const SCENARIOS = [
    { name: 'fire_water_normal',   rngSeed: 1337, inputSeed: 24,   hostHero: 'fire',    guestHero: 'water', mode: 'NORMAL', ticks: 720 },
    { name: 'ice_plant_normal',    rngSeed: 90210, inputSeed: 7,   hostHero: 'ice',     guestHero: 'plant', mode: 'NORMAL', ticks: 900 },
    { name: 'metal_black_normal',  rngSeed: 555,   inputSeed: 999, hostHero: 'metal',   guestHero: 'black', mode: 'NORMAL', ticks: 720 },
    { name: 'dlc_gravity_void',    rngSeed: 4242,  inputSeed: 31,  hostHero: 'gravity', guestHero: 'void',  mode: 'NORMAL', ticks: 720 },
    { name: 'fire_ice_versus',     rngSeed: 8080,  inputSeed: 12,  hostHero: 'fire',    guestHero: 'ice',   mode: 'VERSUS', ticks: 600 },
];

// ─── Deterministic PRNG + bot input (mirrors nightly-headless.js) ────────────
function mulberry32(a) {
    let s = a >>> 0;
    return function rand() {
        s = (s + 0x6D2B79F5) >>> 0;
        let t = s;
        t = Math.imul(t ^ (t >>> 15), t | 1);
        t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
        return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
}

// Combat bot — deterministic given (session state, rng). Aims at the nearest
// enemy and advances, so runs actually fight: kills → score/XP/wave/level-ups,
// contact damage → deaths. Exercises far more of the sim than random wander,
// which makes the fingerprint a much stronger regression signal.
function botInput(session, idx, rng) {
    const p = session.players[idx];
    if (!p) return { x: 0, y: 0, aimAngle: 0, shoot: false, melee: false, dash: false, special: false };
    let best = null, bestD = Infinity;
    for (const e of session.enemies) {
        const dx = e.x - p.x, dy = e.y - p.y, d = dx * dx + dy * dy;
        if (d < bestD) { bestD = d; best = e; }
    }
    const dist = best ? Math.sqrt(bestD) : Infinity;
    const aim = best ? Math.atan2(best.y - p.y, best.x - p.x) : rng() * Math.PI * 2;
    let x, y;
    if (best && dist > 220) {          // close the gap
        x = Math.sign(best.x - p.x);
        y = Math.sign(best.y - p.y);
    } else {                            // strafe / wander
        x = Math.round(rng() * 2 - 1);
        y = Math.round(rng() * 2 - 1);
    }
    return {
        x, y,
        aimAngle: aim,
        shoot:   true,
        melee:   dist < 90,
        dash:    rng() < 0.04,
        special: rng() < 0.06,
    };
}

function resolveLevelUp(gs) {
    if (!gs.isLevelingUp) return;
    const idx = gs._levelUpFor;
    if (idx < 0) return;
    const role = idx === 0 ? 'host' : 'guest';
    const player = gs.players[idx];
    const options = (player && player._levelUpOptions) || [];
    if (!options.length) { gs.isLevelingUp = false; gs._levelUpFor = -1; return; }
    gs.applyLevelUpChoice(role, options[0].id); // deterministic: always first option
}

// ─── Fingerprint ─────────────────────────────────────────────────────────────
const _r2 = n => Math.round((Number(n) || 0) * 100) / 100; // 2-dp, NaN-safe

function _player(p) {
    if (!p) return null;
    return { hp: _r2(p.hp), x: _r2(p.x), y: _r2(p.y), level: p.level | 0, xp: _r2(p.xp), dead: !!p.isDead };
}

function fingerprint(s) {
    return {
        wave: s.wave | 0,
        score: s.score | 0,
        frame: s._frame | 0,
        enemies: s.enemies.length,
        projectiles: s.projectiles.length,
        host: _player(s.players[0]),
        guest: _player(s.players[1]),
    };
}

// ─── Deterministic scenario runner ───────────────────────────────────────────
function runScenario(sc) {
    const inputRng = mulberry32(sc.inputSeed);
    const session = new GameSession(
        { code: `replay-${sc.name}`, host: { ws: 'HOST', userId: 'h' }, guest: { ws: 'GUEST', userId: 'g' } },
        () => {}, // discard outgoing messages
    );
    session._rngSeed = sc.rngSeed | 0; // pin the sim RNG (read in _resetEcsState)

    // Virtual clock — spawn pacing reads Date.now(); advance it by the tick
    // interval each step so the run is timing-independent (mirrors nightly).
    const realDateNow = Date.now;
    let vnow = realDateNow.call(Date);
    Date.now = () => vnow;
    const realLog = console.log, realWarn = console.warn, realErr = console.error;
    console.log = () => {}; console.warn = () => {}; console.error = () => {};

    let fp;
    try {
        session.init(sc.hostHero, sc.guestHero, sc.mode || 'NORMAL');
        if (session._tickInterval) { clearTimeout(session._tickInterval); session._tickInterval = null; }
        for (let t = 0; t < sc.ticks; t++) {
            resolveLevelUp(session);
            resolveLevelUp(session); // both players may queue on the same tick
            // Re-aim every 3 ticks (tracks enemies without spasming).
            if (t % 3 === 0) {
                session.applyInput('host',  botInput(session, 0, inputRng));
                session.applyInput('guest', botInput(session, 1, inputRng));
            }
            session._tick();
            vnow += session._currentTickMs || TICK_MS_FALLBACK;
            if (session.players.every(p => p && p.isDead)) break;
        }
        fp = fingerprint(session);
    } finally {
        try { session.stop(); } catch { /* swallow */ }
        Date.now = realDateNow; console.log = realLog; console.warn = realWarn; console.error = realErr;
    }
    return fp;
}

// ─── Trace IO ────────────────────────────────────────────────────────────────
function tracePath(name) { return path.join(TRACE_DIR, `${name}.json`); }

function loadGolden(name) {
    const p = tracePath(name);
    if (!fs.existsSync(p)) return null;
    return JSON.parse(fs.readFileSync(p, 'utf8'));
}

function diff(expected, actual, prefix = '') {
    const out = [];
    const keys = new Set([...Object.keys(expected || {}), ...Object.keys(actual || {})]);
    for (const k of keys) {
        const e = expected ? expected[k] : undefined;
        const a = actual ? actual[k] : undefined;
        if (e && typeof e === 'object' && a && typeof a === 'object') {
            out.push(...diff(e, a, `${prefix}${k}.`));
        } else if (JSON.stringify(e) !== JSON.stringify(a)) {
            out.push(`${prefix}${k}: golden=${JSON.stringify(e)} got=${JSON.stringify(a)}`);
        }
    }
    return out;
}

// ─── Commands ────────────────────────────────────────────────────────────────
function cmdRecord() {
    if (!fs.existsSync(TRACE_DIR)) fs.mkdirSync(TRACE_DIR, { recursive: true });
    let wrote = 0, flaky = 0;
    for (const sc of SCENARIOS) {
        const fp1 = runScenario(sc);
        const fp2 = runScenario(sc); // determinism self-check
        const drift = diff(fp1, fp2);
        if (drift.length) {
            flaky++;
            console.error(`✖ ${sc.name}: NON-DETERMINISTIC (Math.random in sim path?) — not writing golden.`);
            drift.forEach(d => console.error(`    ${d}`));
            continue;
        }
        fs.writeFileSync(tracePath(sc.name), JSON.stringify({ scenario: sc, fingerprint: fp1 }, null, 2) + '\n');
        console.log(`✓ recorded ${sc.name}  wave=${fp1.wave} score=${fp1.score} enemies=${fp1.enemies}`);
        wrote++;
    }
    console.log(`\nrecorded ${wrote}/${SCENARIOS.length} traces${flaky ? `, ${flaky} flaky (skipped)` : ''}`);
    process.exit(flaky ? 1 : 0);
}

function cmdVerify() {
    let pass = 0, fail = 0, missing = 0;
    for (const sc of SCENARIOS) {
        const golden = loadGolden(sc.name);
        if (!golden) { missing++; console.error(`✖ ${sc.name}: no golden trace — run "node scripts/replay.js record"`); continue; }
        const actual = runScenario(golden.scenario);
        const drift = diff(golden.fingerprint, actual);
        if (drift.length) {
            fail++;
            console.error(`✖ ${sc.name}: fingerprint changed (${drift.length} field${drift.length > 1 ? 's' : ''}):`);
            drift.forEach(d => console.error(`    ${d}`));
        } else {
            pass++;
            console.log(`✓ ${sc.name}  (wave=${actual.wave} score=${actual.score})`);
        }
    }
    console.log(`\n──────────────────────────────────────────`);
    console.log(`  replay: ${pass}/${SCENARIOS.length} traces match` + (fail ? `, ${fail} regressed` : '') + (missing ? `, ${missing} missing` : ''));
    process.exit((fail || missing) ? 1 : 0);
}

function cmdShow(name) {
    const golden = loadGolden(name);
    if (!golden) { console.error(`no golden: ${name}`); process.exit(1); }
    console.log(JSON.stringify(golden.fingerprint, null, 2));
}

const cmd = process.argv[2] || 'verify';
if (cmd === 'record')      cmdRecord();
else if (cmd === 'verify') cmdVerify();
else if (cmd === 'show')   cmdShow(process.argv[3]);
else { console.error(`unknown command: ${cmd} (use record|verify|show)`); process.exit(2); }
