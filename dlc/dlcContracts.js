// #174 — DLC global-usage stub layer + contract validator.
//
// Background: DLC content registers itself into a handful of mutable,
// process-wide registries (`HERO_LOGIC`, `BIOME_LOGIC`, `ENEMY_LOGIC`,
// `STORY_EVENTS`, `ACHIEVEMENTS`, `COLLECTOR_CARDS`, `STORY_ARC_LABELS`,
// `DLC_STORY_ACHIEVEMENTS`, …). These live on `window` in the renderer and on
// `global` server-side (the server sets `global.window = global` and `require()`s
// the DLC *hero* files directly — see `server/simulation/loader.js`). Because
// they are shared singletons that DLCs *write into* (not classes), #4's
// window-globals flip left the DLC reads as bare `window.X` rather than ESM
// imports.
//
// This module provides:
//   1. `registry(name)` — a single, env-agnostic accessor that resolves the
//      registry on whichever root exists (window | global | globalThis) and
//      lazily creates it. The canonical "stub surface": any consumer can read
//      or register through it without re-implementing the
//      `window.X || (typeof X !== 'undefined' ? X : {})` defensive dance, and
//      without caring whether it's running in the browser or the server sim.
//   2. `validateDLCContract(id, dlc)` — asserts a DLC actually registered the
//      heroes it *declares* in its manifest (`dlc.heroes`). Returns a list of
//      human-readable problems (empty = OK). The DLC auto-loader runs this
//      right after activation so a malformed DLC fails loudly at load instead
//      of silently shipping a half-registered hero.
//
// Server-safe: no DOM access; pure data + lookups.

/** The object that backs the process-wide registries (window | global). */
export function registryRoot() {
    if (typeof window !== 'undefined') return window;
    if (typeof global !== 'undefined') return global;
    return globalThis;
}

// Registries whose canonical shape is an Array rather than a plain object.
const ARRAY_REGISTRIES = new Set(['STORY_EVENTS', 'ACHIEVEMENTS']);

/**
 * Resolve (and lazily create) a named registry on the active root.
 * Returns the live reference — callers mutate it in place, exactly as the
 * scattered `window.HERO_LOGIC[type] = …` writes do today.
 *
 * @param {string} name e.g. 'HERO_LOGIC', 'BIOME_LOGIC', 'STORY_EVENTS'
 * @returns {object|Array}
 */
export function registry(name) {
    const root = registryRoot();
    if (root[name] == null) {
        root[name] = ARRAY_REGISTRIES.has(name) ? [] : {};
    }
    return root[name];
}

/**
 * Validate that a DLC honored its manifest contract after `_activateDLC` ran.
 * Currently checks that every hero the manifest declares (`dlc.heroes`) is
 * present in `HERO_LOGIC` — i.e. the hero's script actually registered it.
 *
 * Pure + side-effect-free so it's trivially unit-testable; the loader decides
 * how loudly to surface the returned problems.
 *
 * @param {string} id   DLC id (for message context)
 * @param {{heroes?: string[]}} dlc  the registered DLC manifest object
 * @returns {string[]} problems (empty array = contract satisfied)
 */
export function validateDLCContract(id, dlc) {
    const problems = [];
    if (!dlc || typeof dlc !== 'object') {
        return [`DLC '${id}': no manifest object to validate`];
    }
    const HERO_LOGIC = registry('HERO_LOGIC');
    const declared = Array.isArray(dlc.heroes) ? dlc.heroes : [];
    for (const hero of declared) {
        if (HERO_LOGIC[hero] == null) {
            problems.push(
                `DLC '${id}': declared hero '${hero}' was not registered into HERO_LOGIC after load`
            );
        }
    }
    return problems;
}
