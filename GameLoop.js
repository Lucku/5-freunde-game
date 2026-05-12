// GameLoop.js — extracted from game.js (improvement #1 phase E).
//
// Owns the requestAnimationFrame harness + fixed-timestep gate that was
// inlined at the top of `masterLoop()`. The masterLoop body itself stays in
// game.js for now — it touches 100+ run-scoped variables (player, enemies,
// camera, UI state, online sync, ...) that we can't migrate in one pass.
//
// The harness factors out:
//   - per-rAF callbacks (audio mixer pump, anything that should tick at the
//     full display refresh rate regardless of the simulation step);
//   - the deltaTime gate (`if (dt >= frameDelay) { ... }`) that throttles
//     game updates to a fixed target FPS;
//   - the lastTime drift correction.
//
// Usage:
//   import { createGameLoop } from './GameLoop.js';
//   const loop = createGameLoop({
//       targetFps: 60,
//       onRafTick: (ts) => audioManager.update(),
//       onFrame:   (dt, ts) => masterFrame(dt, ts),
//   });
//   loop.start();
//
// Stop() is provided for tests and headless harness usage; the live game
// never stops the loop.

export function createGameLoop({ targetFps = 60, onRafTick, onFrame } = {}) {
    const frameDelay = 1000 / targetFps;
    let lastTime = 0;
    let running  = false;
    let rafId    = 0;

    function tick(timestamp) {
        if (!running) return;
        if (typeof onRafTick === 'function') {
            try { onRafTick(timestamp); }
            catch (e) { console.error('GameLoop onRafTick threw:', e); }
        }
        rafId = requestAnimationFrame(tick);

        if (!timestamp) timestamp = performance.now();
        if (!lastTime) lastTime = timestamp;
        const dt = timestamp - lastTime;

        if (dt >= frameDelay) {
            lastTime = timestamp - (dt % frameDelay);
            if (typeof onFrame === 'function') {
                try { onFrame(dt, timestamp); }
                catch (e) { console.error('GameLoop onFrame threw:', e); }
            }
        }
    }

    return {
        start() {
            if (running) return;
            running = true;
            rafId = requestAnimationFrame(tick);
        },
        stop() {
            running = false;
            if (rafId) { cancelAnimationFrame(rafId); rafId = 0; }
        },
        get frameDelay() { return frameDelay; },
    };
}
