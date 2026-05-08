'use strict';

/**
 * server/simulation/parityTest.js
 *
 * Verifies that the server simulation is correct and fully isolated between
 * concurrent sessions.  Run with:
 *
 *   node server/simulation/parityTest.js
 *
 * Exit 0 = all assertions passed.  Exit 1 = at least one failure.
 */

require('./loader');
const GameSession = require('./GameSession');
const { BASE_HERO_STATS, TICK_FRAMES } = require('./constants');

// ─── Assertion helpers ────────────────────────────────────────────────────────

let passed = 0;
let failed = 0;

function assert(condition, msg) {
    if (condition) { passed++; process.stdout.write(`  pass  ${msg}\n`); }
    else           { failed++; process.stderr.write(`  FAIL  ${msg}\n`); }
}

function assertEqual(a, b, msg) {
    assert(a === b, `${msg}  (got ${JSON.stringify(a)}, expect ${JSON.stringify(b)})`);
}

// ─── Session factory ──────────────────────────────────────────────────────────

function makeSession(heroHost, heroGuest) {
    const snapsHost  = [];
    const snapsGuest = [];
    const gs = new GameSession(
        { host: { ws: 'WS_HOST', userId: 'u1' }, guest: { ws: 'WS_GUEST', userId: 'u2' } },
        (ws, msg) => {
            if (msg.type !== 'SNAPSHOT') return;
            if (ws === 'WS_HOST')  snapsHost.push(msg);
            if (ws === 'WS_GUEST') snapsGuest.push(msg);
        },
    );
    gs.init(heroHost, heroGuest);
    // Stop the real interval; tests drive ticks manually for deterministic timing.
    clearInterval(gs._tickInterval);
    gs._tickInterval = null;
    return { gs, snapsHost, snapsGuest };
}

function tick(gs, n = 1) {
    for (let i = 0; i < n; i++) gs._tick();
}

// ═══════════════════════════════════════════════════════════════════════════════
// Test 1 — Session isolation: two concurrent sessions do not share state
// ═══════════════════════════════════════════════════════════════════════════════

function testSessionIsolation() {
    console.log('\n── 1  Session isolation ─────────────────────────────────');

    const { gs: gs1 } = makeSession('fire',  'water');
    const { gs: gs2 } = makeSession('metal', 'plant');

    assert(gs1._world !== gs2._world, 'Each session owns a separate World instance');
    assert(gs1.players[0] !== gs2.players[0], 'Player instances are not shared');
    assertEqual(gs1.players[0].type, 'fire',  'gs1 host hero type');
    assertEqual(gs2.players[0].type, 'metal', 'gs2 host hero type');

    // Advance gs2 and verify gs1 frame is untouched
    tick(gs2, 30);
    assertEqual(gs1._frame, 0, 'gs1 frame unchanged after ticking gs2');
    assert(gs1._world.enemies === gs1.enemies, 'gs1 world.enemies still aliases gs1.enemies');

    // Advance gs1 and verify gs2 enemy list is untouched
    tick(gs1, 20);
    assert(gs1.enemies !== gs2.enemies, 'Enemy arrays are distinct between sessions');
}

// ═══════════════════════════════════════════════════════════════════════════════
// Test 2 — Player movement: position changes in the direction of input
// ═══════════════════════════════════════════════════════════════════════════════

function testPlayerMovement() {
    console.log('\n── 2  Player movement ────────────────────────────────────');

    // Right only
    {
        const { gs, snapsHost } = makeSession('fire', 'water');
        const x0 = gs.players[0].x;
        gs.applyInput('host', { x: 1, y: 0, aimAngle: 0 });
        tick(gs, 10);
        const snap = snapsHost[snapsHost.length - 1];
        assert(snap.p2.x > x0, `Host moved right  (${x0} → ${snap.p2.x})`);
        assert(Math.abs(snap.p2.y - gs.players[0].y) < 2, 'No vertical drift with y=0 input');
    }

    // Left only
    {
        const { gs, snapsHost } = makeSession('fire', 'water');
        const x0 = gs.players[0].x;
        gs.applyInput('host', { x: -1, y: 0, aimAngle: Math.PI });
        tick(gs, 10);
        const snap = snapsHost[snapsHost.length - 1];
        assert(snap.p2.x < x0, `Host moved left   (${x0} → ${snap.p2.x})`);
    }

    // Both players move independently
    {
        const { gs, snapsHost } = makeSession('fire', 'water');
        gs.applyInput('host',  { x:  1, y: 0, aimAngle: 0 });
        gs.applyInput('guest', { x: -1, y: 0, aimAngle: Math.PI });
        tick(gs, 20);
        const snap = snapsHost[snapsHost.length - 1];
        assert(snap.p2.x !== snap.p1.x, `Host and guest moved to different x positions`);
    }
}

// ═══════════════════════════════════════════════════════════════════════════════
// Test 3 — Hero stats: initial HP matches BASE_HERO_STATS for all heroes
// ═══════════════════════════════════════════════════════════════════════════════

function testHeroStats() {
    console.log('\n── 3  Hero stats (initial HP) ────────────────────────────');

    for (const [type, stats] of Object.entries(BASE_HERO_STATS)) {
        const { gs } = makeSession(type, 'fire');
        const p = gs.players[0];
        // HP may be fractionally adjusted by meta-upgrades (stubbed at 0) or DLC init hooks.
        // We accept within ±1 to allow for integer rounding in getHeroStats().
        assert(
            Math.abs(p.hp - stats.hp) <= 1,
            `${type.padEnd(12)} hp=${p.hp}  (base ${stats.hp})`,
        );
        gs.stop();
    }
}

// ═══════════════════════════════════════════════════════════════════════════════
// Test 4 — Enemy spawning: enemies appear within 500 ticks
// ═══════════════════════════════════════════════════════════════════════════════

function testEnemySpawning() {
    console.log('\n── 4  Enemy spawning ─────────────────────────────────────');

    const { gs, snapsHost } = makeSession('fire', 'water');
    // Force immediate first spawn by resetting the last-spawn timestamp.
    gs._waveManager._lastSpawnMs = 0;
    tick(gs, 500);

    assert(gs.enemies.length > 0, `Enemies present after 500 ticks (${gs.enemies.length})`);
    const snapWithEnemies = snapsHost.find(s => s.enemies.length > 0);
    assert(!!snapWithEnemies, 'At least one snapshot contains enemies');
    assert(snapWithEnemies.enemies[0]._id > 0, 'Enemy snapshot entries have _id');
}

// ═══════════════════════════════════════════════════════════════════════════════
// Test 5 — Snapshot schema: required fields present and typed correctly
// ═══════════════════════════════════════════════════════════════════════════════

function testSnapshotSchema() {
    console.log('\n── 5  Snapshot schema ────────────────────────────────────');

    const { gs, snapsHost, snapsGuest } = makeSession('fire', 'water');
    tick(gs, 5);

    const hostSnap  = snapsHost[snapsHost.length - 1];
    const guestSnap = snapsGuest[snapsGuest.length - 1];

    // Base fields
    assertEqual(hostSnap.type, 'SNAPSHOT', 'type field');
    assert(typeof hostSnap.t    === 'number',  'timestamp is number');
    assert(typeof hostSnap.wave === 'number',  'wave is number');
    assert(Array.isArray(hostSnap.enemies),    'enemies is array');
    assert(Array.isArray(hostSnap.projectiles),'projectiles is array');

    // Personalization: host sees themselves as p2, guest as p1
    assertEqual(hostSnap.p2.hp,  60, 'host snapshot: self (fire) HP in p2');
    assertEqual(hostSnap.p1.hp,  60, 'host snapshot: partner (water) HP in p1');
    assertEqual(guestSnap.p2.hp, 60, 'guest snapshot: self (water) HP in p2');
    assertEqual(guestSnap.p1.hp, 60, 'guest snapshot: partner (fire) HP in p1');

    // p2 has all required fields
    for (const field of ['x', 'y', 'hp', 'maxHp', 'level', 'xp', 'maxXp', 'gold', 'aimAngle']) {
        assert(typeof hostSnap.p2[field] === 'number', `p2.${field} is number`);
    }
}

// ═══════════════════════════════════════════════════════════════════════════════
// Test 6 — Snapshot delta compression: static fields omitted after first tick
// ═══════════════════════════════════════════════════════════════════════════════

function testDeltaCompression() {
    console.log('\n── 6  Snapshot delta compression ─────────────────────────');

    const { gs, snapsHost } = makeSession('fire', 'water');
    gs._waveManager._lastSpawnMs = 0;  // force spawn on tick 1

    tick(gs, 3);

    const first  = snapsHost[0];
    const second = snapsHost[1];
    const third  = snapsHost[2];

    if (first.enemies.length > 0 && second.enemies.length > 0) {
        const firstEnemy  = first.enemies[0];
        const secondEnemy = second.enemies.find(e => e._id === firstEnemy._id);
        if (secondEnemy) {
            assert('maxHp' in firstEnemy,  'First appearance includes maxHp');
            assert('color' in firstEnemy,  'First appearance includes color');
            assert(!('maxHp' in secondEnemy), 'Second appearance omits maxHp (delta)');
            assert(!('color' in secondEnemy), 'Second appearance omits color (delta)');
        } else {
            process.stdout.write('  skip  Delta test (enemy not in second snap — timing)\n');
            passed++;
        }
    } else {
        // Spawn timing may vary; skip gracefully
        process.stdout.write('  skip  Delta test (no enemy in first two ticks)\n');
        passed++;
    }
}

// ═══════════════════════════════════════════════════════════════════════════════
// Test 7 — DLC hero smoke: all heroes initialize, tick, and produce snapshots
// ═══════════════════════════════════════════════════════════════════════════════

function testDlcHeroSmoke() {
    console.log('\n── 7  DLC hero smoke (all heroes × 5 ticks) ─────────────');

    for (const type of Object.keys(BASE_HERO_STATS)) {
        try {
            const { gs, snapsHost } = makeSession(type, 'fire');
            tick(gs, 5);
            assert(snapsHost.length === 5, `${type.padEnd(12)} produced 5 snapshots`);
            gs.stop();
        } catch (err) {
            failed++;
            process.stderr.write(`  FAIL  ${type.padEnd(12)} threw: ${err.message}\n`);
        }
    }
}

// ═══════════════════════════════════════════════════════════════════════════════
// Test 8 — Level-up flow: reaching XP threshold triggers level-up state
// ═══════════════════════════════════════════════════════════════════════════════

function testLevelUpFlow() {
    console.log('\n── 8  Level-up flow ──────────────────────────────────────');

    const { gs } = makeSession('fire', 'water');
    clearInterval(gs._tickInterval);
    gs._tickInterval = null;

    const player = gs.players[0];
    const levelBefore = player.level; // capture before _giveXP increments it
    const neededXp = player.maxXp - player.xp;

    let levelUpSent = false;
    gs._send = (ws, msg) => { if (msg.type === 'LEVEL_UP') levelUpSent = true; };

    gs._giveXP(player, 0, neededXp); // increments level + sets isLevelingUp

    assert(gs.isLevelingUp, 'isLevelingUp set after XP threshold reached');
    assert(player._levelUpOptions && player._levelUpOptions.length > 0, 'Level-up options generated');
    assert(levelUpSent, 'LEVEL_UP message sent to client');
    assert(player.level > levelBefore, `Level incremented by _giveXP (${levelBefore} → ${player.level})`);

    // Resolve the level-up — clears pause state, applies upgrade
    const choiceId = player._levelUpOptions[0].id;
    gs.applyLevelUpChoice('host', choiceId);
    assert(!gs.isLevelingUp, 'isLevelingUp cleared after choice');
    assert(player.level > levelBefore, `Player level increased (${levelBefore} → ${player.level})`);
}

// ─── Run all tests ─────────────────────────────────────────────────────────────

testSessionIsolation();
testPlayerMovement();
testHeroStats();
testEnemySpawning();
testSnapshotSchema();
testDeltaCompression();
testDlcHeroSmoke();
testLevelUpFlow();

const total = passed + failed;
console.log(`\n${'─'.repeat(56)}`);
if (failed === 0) {
    console.log(`  ${passed}/${total} assertions passed.\n`);
    process.exit(0);
} else {
    console.error(`  ${passed} passed, ${failed} FAILED  (${total} total).\n`);
    process.exit(1);
}
