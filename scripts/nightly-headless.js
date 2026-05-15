#!/usr/bin/env node
'use strict';

/**
 * Nightly headless test harness — improvement #146.
 *
 * Drives N simulated co-op runs against the authoritative server simulation
 * (GameSession) with no real WebSocket / HTTP layer. Each run gets two random
 * heroes, random bot inputs every few ticks, and auto-resolves level-ups so
 * the simulation keeps advancing.
 *
 * Goals (per item #146):
 *   - 100 simulated runs by default
 *   - Assert no crashes (any thrown error fails the run)
 *   - Log perf metrics (tick wall time p50/p95/p99, throughput, max load)
 *
 * Env overrides:
 *   RUNS=<int>   number of simulated runs            (default 100)
 *   TICKS=<int>  ticks per run                        (default 1800 ≈ 60s @ 30Hz sim)
 *   SEED=<int>   PRNG seed for reproducibility        (default Date.now())
 *   REPORT=<p>   output JSON path                     (default nightly-report.json)
 *   MODES=...    comma list: NORMAL,VERSUS            (default NORMAL,VERSUS)
 *   QUIET=1      suppress per-run console lines
 *
 * Usage:
 *   node scripts/nightly-headless.js
 *   RUNS=10 TICKS=600 node scripts/nightly-headless.js
 *
 * Exit code:
 *   0  every run finished without error
 *   1  at least one run crashed or timed out
 *
 * Notes:
 *   - Wires directly into `server/simulation/GameSession` like `parityTest.js`,
 *     so no `node server/server.js` instance is needed.
 *   - Inputs mirror what `test-arena.js` and `OnlineTestBot.js` send over the
 *     wire ({ type:'INPUT', x, y, aimAngle, shoot, melee, dash, special }),
 *     but are applied via `gs.applyInput(role, input)` for speed.
 */

const fs = require('fs');
const path = require('path');

require('../server/simulation/loader');
const GameSession = require('../server/simulation/GameSession');
const { BASE_HERO_STATS, ARENA_WIDTH, ARENA_HEIGHT } = require('../server/simulation/constants');

// ─── Config ────────────────────────────────────────────────────────────────────

const RUNS   = parseInt(process.env.RUNS  || '100', 10);
const TICKS  = parseInt(process.env.TICKS || '1800', 10);
const SEED   = parseInt(process.env.SEED  || String(Date.now() & 0xFFFFFFFF), 10);
const REPORT = process.env.REPORT || path.join(process.cwd(), 'nightly-report.json');
const MODES  = (process.env.MODES || 'NORMAL,VERSUS').split(',').map(s => s.trim()).filter(Boolean);
const QUIET  = process.env.QUIET === '1';

const HERO_POOL = Object.keys(BASE_HERO_STATS);

// ─── Deterministic PRNG (mulberry32) ──────────────────────────────────────────

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

function pickFrom(rng, arr) { return arr[Math.floor(rng() * arr.length)]; }

// ─── Bot driver ────────────────────────────────────────────────────────────────

function randomInput(rng) {
    // 4-way movement with frequent idle, occasional actions.
    const moveRoll = rng();
    let x = 0, y = 0;
    if (moveRoll < 0.7) {
        x = Math.round(rng() * 2 - 1);
        y = Math.round(rng() * 2 - 1);
    }
    return {
        x,
        y,
        aimAngle: rng() * Math.PI * 2,
        shoot:   rng() < 0.55,
        melee:   rng() < 0.20,
        dash:    rng() < 0.05,
        special: rng() < 0.03,
    };
}

function resolveLevelUp(gs) {
    if (!gs.isLevelingUp) return false;
    const idx = gs._levelUpFor;
    if (idx < 0) return false;
    const role = idx === 0 ? 'host' : 'guest';
    const player = gs.players[idx];
    const options = (player && player._levelUpOptions) || [];
    if (!options.length) {
        // Stuck flag with no options — clear manually so the run can continue.
        gs.isLevelingUp = false;
        gs._levelUpFor  = -1;
        return false;
    }
    gs.applyLevelUpChoice(role, options[0].id);
    return true;
}

// ─── Stats helpers ─────────────────────────────────────────────────────────────

function percentile(sortedNs, p) {
    if (sortedNs.length === 0) return 0;
    const idx = Math.min(sortedNs.length - 1, Math.floor(p * sortedNs.length));
    return sortedNs[idx];
}

function nsToMs(ns) { return Number(ns) / 1e6; }

// ─── Single-run executor ───────────────────────────────────────────────────────

function runOne(runId, rng) {
    const hostHero  = pickFrom(rng, HERO_POOL);
    const guestHero = pickFrom(rng, HERO_POOL);
    const mode      = pickFrom(rng, MODES);

    const events  = [];
    const session = new GameSession(
        { code: `bot-${runId}`, host: { ws: 'HOST', userId: `u${runId}h` }, guest: { ws: 'GUEST', userId: `u${runId}g` } },
        (ws, msg) => {
            // Capture noteworthy events but discard the high-volume snapshot traffic.
            if (msg && msg.type && msg.type !== 'SNAPSHOT') events.push(msg.type);
        },
    );

    let error = null;
    const tickSamples = []; // ns
    let ticksRun = 0;
    let maxEnemies = 0, maxProjectiles = 0;

    // Virtual clock — the simulation reads `Date.now()` for wave spawn pacing
    // and elapsed-time stats. In a tight tick loop the real clock barely
    // advances (microseconds per tick), which would starve the spawner. We
    // monkey-patch Date.now for the duration of this run so each tick
    // advances the wall clock by the simulation's nominal tick interval.
    const realDateNow = Date.now;
    let virtualNow = realDateNow.call(Date);
    Date.now = () => virtualNow;

    // Silence stdout/stderr chatter from hero abilities / DLC hooks so the
    // harness's own per-run lines stay readable. Errors still bubble via the
    // try/catch below, so silencing the loggers is purely cosmetic.
    const realLog = console.log;
    const realWarn = console.warn;
    console.log  = () => {};
    console.warn = () => {};

    try {
        session.init(hostHero, guestHero, mode);
        // Drive ticks manually for deterministic timing.
        if (session._tickInterval) { clearTimeout(session._tickInterval); session._tickInterval = null; }

        for (let t = 0; t < TICKS; t++) {
            if (resolveLevelUp(session)) {
                // Re-resolve once in case both players queued a level-up on the same tick.
                resolveLevelUp(session);
            }

            // Refresh inputs every ~6 ticks so bots wander rather than spasm.
            if (t % 6 === 0) {
                session.applyInput('host',  randomInput(rng));
                session.applyInput('guest', randomInput(rng));
            }

            const t0 = process.hrtime.bigint();
            session._tick();
            const dt = process.hrtime.bigint() - t0;
            tickSamples.push(dt);
            ticksRun++;
            virtualNow += session._currentTickMs || 33;

            if (session.enemies.length     > maxEnemies)     maxEnemies     = session.enemies.length;
            if (session.projectiles.length > maxProjectiles) maxProjectiles = session.projectiles.length;

            // Stop early if both players are dead — no further state change worth measuring.
            if (session.players.every(p => p && p.isDead)) break;
        }
    } catch (err) {
        error = { message: err && err.message ? err.message : String(err), stack: err && err.stack ? err.stack : null };
    } finally {
        try { session.stop(); } catch { /* swallow */ }
        Date.now    = realDateNow;
        console.log = realLog;
        console.warn = realWarn;
    }

    tickSamples.sort((a, b) => Number(a - b));
    const tickMs = tickSamples.map(nsToMs);

    return {
        runId,
        hostHero,
        guestHero,
        mode,
        ok: !error,
        error,
        ticksRun,
        finalWave: session.wave,
        finalScore: session.score,
        hostHp: session.players[0] ? session.players[0].hp : null,
        guestHp: session.players[1] ? session.players[1].hp : null,
        maxEnemies,
        maxProjectiles,
        tickMs: {
            p50: percentile(tickMs, 0.50),
            p95: percentile(tickMs, 0.95),
            p99: percentile(tickMs, 0.99),
            max: tickMs.length ? tickMs[tickMs.length - 1] : 0,
        },
        eventCount: events.length,
    };
}

// ─── Aggregate + report ────────────────────────────────────────────────────────

function aggregate(results) {
    const passed = results.filter(r => r.ok);
    const failed = results.filter(r => !r.ok);
    const allTickMs = [];
    let totalTicks = 0;
    let maxWave = 0;
    let maxEnemies = 0, maxProjectiles = 0;

    for (const r of results) {
        totalTicks += r.ticksRun;
        if (r.finalWave > maxWave) maxWave = r.finalWave;
        if (r.maxEnemies > maxEnemies) maxEnemies = r.maxEnemies;
        if (r.maxProjectiles > maxProjectiles) maxProjectiles = r.maxProjectiles;
        allTickMs.push(r.tickMs.p50, r.tickMs.p95, r.tickMs.p99);
    }
    allTickMs.sort((a, b) => a - b);

    return {
        runs: results.length,
        passed: passed.length,
        failed: failed.length,
        totalTicks,
        maxWave,
        maxEnemies,
        maxProjectiles,
        aggregateTickMs: {
            p50: percentile(allTickMs, 0.50),
            p95: percentile(allTickMs, 0.95),
            p99: percentile(allTickMs, 0.99),
        },
    };
}

function printSummary(summary, results, walltimeSec) {
    const w = s => String(s).padEnd(10);
    console.log('');
    console.log('═══ Nightly headless harness ═══════════════════════════════════');
    console.log(`  Runs:        ${summary.runs}   (passed ${summary.passed}, failed ${summary.failed})`);
    console.log(`  Total ticks: ${summary.totalTicks}   wall ${walltimeSec.toFixed(2)}s`);
    console.log(`  Throughput:  ${(summary.totalTicks / walltimeSec).toFixed(0)} ticks/sec`);
    console.log(`  Tick p50/p95/p99: ${summary.aggregateTickMs.p50.toFixed(3)} / ${summary.aggregateTickMs.p95.toFixed(3)} / ${summary.aggregateTickMs.p99.toFixed(3)} ms`);
    console.log(`  Peak load:   enemies=${summary.maxEnemies}  projectiles=${summary.maxProjectiles}  wave=${summary.maxWave}`);

    if (summary.failed > 0) {
        console.log('');
        console.log('── Failures ─────────────────────────────────────────────────────');
        for (const r of results.filter(r => !r.ok)) {
            console.log(`  run #${w(r.runId)} ${w(r.hostHero)}/${w(r.guestHero)} ${w(r.mode)}  err: ${r.error.message}`);
        }
    }
    console.log('');
}

// ─── Main ──────────────────────────────────────────────────────────────────────

function main() {
    console.log(`[nightly] RUNS=${RUNS} TICKS=${TICKS} SEED=${SEED} MODES=${MODES.join(',')}`);
    console.log(`[nightly] arena=${ARENA_WIDTH}x${ARENA_HEIGHT}  hero pool=${HERO_POOL.length}`);

    const rng = mulberry32(SEED);
    const results = [];
    const wallStart = process.hrtime.bigint();

    for (let i = 0; i < RUNS; i++) {
        const r = runOne(i + 1, rng);
        results.push(r);
        if (!QUIET) {
            const tag = r.ok ? 'OK  ' : 'FAIL';
            console.log(
                `  [${tag}] #${String(r.runId).padStart(3, '0')} ${r.hostHero.padEnd(12)} vs ${r.guestHero.padEnd(12)} ` +
                `${r.mode.padEnd(7)} ticks=${String(r.ticksRun).padStart(5)} wave=${String(r.finalWave).padStart(2)} ` +
                `enemies≤${String(r.maxEnemies).padStart(3)} p99=${r.tickMs.p99.toFixed(2)}ms` +
                (r.ok ? '' : `  ✖ ${r.error.message}`)
            );
        }
    }

    const wallSec = Number(process.hrtime.bigint() - wallStart) / 1e9;
    const summary = aggregate(results);

    fs.writeFileSync(REPORT, JSON.stringify({
        meta: {
            generatedAt: new Date().toISOString(),
            seed: SEED,
            runs: RUNS,
            ticksPerRun: TICKS,
            modes: MODES,
            node: process.version,
            platform: `${process.platform} ${process.arch}`,
            walltimeSec: wallSec,
        },
        summary,
        results,
    }, null, 2));

    printSummary(summary, results, wallSec);
    console.log(`[nightly] Report written to ${REPORT}`);

    process.exit(summary.failed > 0 ? 1 : 0);
}

main();
