// #194 — DLC module manifest. `import.meta.glob` returns
//   { './foo/bar.js': () => import('./foo/bar.js'), ... }
// at build time. Vite walks every match, statically resolves each module's
// own imports (e.g. `../../Entities/Particle.js`), and emits one bundle chunk
// per DLC file. Marking each as a separate chunk preserves the on-demand-load
// behavior #29 set up; the chunks are only fetched when DLCManager.loadScript
// is called. We exclude `./DLCManager.js` itself so the manifest doesn't
// circularly reference this file.
const DLC_MODULES = import.meta.glob('./*/*.js');

// Electron detection (mirrors Config.js pattern)
const _isElectronDLC = typeof process !== 'undefined' && process.versions && process.versions.electron;
let _fsDLC, _pathDLC, _dlcFilePath;
if (_isElectronDLC) {
    try {
        _fsDLC = require('fs');
        _pathDLC = require('path');
        if (process.env.APP_SAVE_PATH) {
            _dlcFilePath = _pathDLC.join(process.env.APP_SAVE_PATH, 'dlcs.json');
        }
    } catch (e) {
        console.warn("DLCManager: failed to load Electron fs modules:", e);
    }
}

class DLCManager {
    constructor() {
        this.activeDLCs = [];
        // #29 P3 — `heroes` lists every hero type the DLC ships so consumers
        // can reverse-map hero → owning DLC without loading the full module.
        // Eager `init()` parallel-loads everything that's enabled today; the
        // memoized `loadDLC` + `ensureDLCLoaded` below give callers a clean
        // path to lazy-load on first hero pick once the surrounding UI
        // (Achievements / Collection / Story menus) is hardened against
        // partially-registered DLC content.
        this.availableDLCs = {
            'rise_of_the_rock': {
                title: "Rise of the Rock",
                desc: "Unleash the power of the Earth! Adds a new Earth Hero, Rock Biome, new enemies, and powerful mutations.",
                icon: "⛰️",
                heroes: ['earth']
            },
            'tournament_of_thunder': {
                title: "The Tournament of Thunder",
                desc: "Enter the Cloud Kingdom! Introduces the Lightning Hero, Cloud Biome, and the legendary Tournament.",
                icon: "⚡",
                heroes: ['lightning']
            },
            'champions_of_chaos': {
                title: "Champions of Chaos",
                desc: "Defy gravity! Introduces the new Purple Hero 'Gravity', a chaotic playstyle, a distorted dimension, and a story of entropy.",
                icon: "🌌",
                heroes: ['gravity', 'void']
            },
            'waker_of_winds': {
                title: "Waker of Winds",
                desc: "Soar through the skies! Introduces the Turquoise Hero 'Air', the Sky Palace biome, and a tale of freedom.",
                icon: "🌪️",
                heroes: ['air', 'wind']
            },
            'faith_of_fortune': {
                title: "Faith of Fortune",
                desc: "Balance vs Chaos! Introduces 'Spirit' and 'Chance'. Temples, madness, and the search for the Mask.",
                icon: "🎰",
                heroes: ['spirit', 'chance']
            },
            'symphony_of_sickness': {
                title: "Symphony of Sickness",
                desc: "Rhythm vs Decay! Introduces 'Sound' and 'Poison' Heroes. Master the beat or spread the plague.",
                icon: "🎵",
                heroes: ['sound', 'poison']
            },
            'echos_of_eternity': {
                title: "Echos of Eternity",
                desc: "Where all timelines converge. Introduces the Time Hero, the hidden Love Hero, and the Maze of Time.",
                icon: "⌛",
                heroes: ['time', 'love']
            },
            'disciples_of_deception': {
                title: "Disciples of Deception",
                desc: "A character pack — three deception-themed heroes (Psycho, Mirror, Smoke) with their own biomes. No story mode.",
                icon: "🎭",
                heroes: ['psycho', 'mirror', 'smoke']
            },
            'radiance_of_ruin': {
                title: "Radiance of Ruin",
                desc: "A character pack — three resource-driven heroes (Light, Thorn, Dream) with their own biomes. No story mode.",
                icon: "👁️",
                heroes: ['light', 'thorn', 'dream']
            }
        };
        // #29 P3 — memoize in-flight loads so concurrent ensureDLCLoaded calls
        // share the same promise; resolved promises stay cached so subsequent
        // calls are O(1).
        this._loadPromises = new Map();
        // #29 P3 — reverse index built lazily from availableDLCs.
        this._heroOwnerIndex = null;
    }

    // #29 P3 — Build (and cache) a heroType → dlcId reverse map.
    _buildHeroOwnerIndex() {
        const idx = {};
        for (const id in this.availableDLCs) {
            const heroes = this.availableDLCs[id].heroes || [];
            for (let i = 0; i < heroes.length; i++) idx[heroes[i]] = id;
        }
        this._heroOwnerIndex = idx;
    }

    /**
     * Reverse-lookup the DLC that owns a hero type. Returns null for base
     * heroes (fire/water/ice/plant/metal/black) which aren't shipped by a DLC.
     */
    getHeroOwnerDLC(heroType) {
        if (!this._heroOwnerIndex) this._buildHeroOwnerIndex();
        return this._heroOwnerIndex[heroType] || null;
    }

    /**
     * Idempotent + memoized DLC load. Repeated calls return the same in-flight
     * (or already-resolved) promise — safer than the old `loadDLC` which
     * double-imported when called concurrently. Use this from any code path
     * that needs DLC content registered before proceeding (hero pick, story
     * mode entry, achievement screen open, etc.).
     */
    ensureDLCLoaded(id) {
        if (this.activeDLCs.includes(id)) return Promise.resolve();
        let p = this._loadPromises.get(id);
        if (p) return p;
        p = this.loadDLC(id).catch(e => {
            // Allow re-attempt on next call after a failure.
            this._loadPromises.delete(id);
            throw e;
        });
        this._loadPromises.set(id, p);
        return p;
    }

    _loadEnabledDLCs() {
        let raw = null;
        if (_isElectronDLC && _fsDLC && _dlcFilePath) {
            try {
                if (_fsDLC.existsSync(_dlcFilePath)) {
                    raw = _fsDLC.readFileSync(_dlcFilePath, 'utf8');
                }
            } catch (e) {
                console.error("DLCManager: failed to read dlcs file:", e);
            }
        }
        if (!raw) raw = localStorage.getItem('enabled_dlcs');

        if (raw !== null) {
            try {
                let enabled = JSON.parse(raw);
                // Migration: rename old ID
                if (enabled.includes('the_wind_waker')) {
                    enabled = enabled.filter(e => e !== 'the_wind_waker');
                    if (!enabled.includes('waker_of_winds')) enabled.push('waker_of_winds');
                    this._saveEnabledDLCs(enabled);
                }
                return enabled;
            } catch (e) {
                console.error("DLCManager: failed to parse enabled DLCs:", e);
            }
        }
        // First run: all DLCs disabled by default
        return [];
    }

    _saveEnabledDLCs(enabled) {
        const json = JSON.stringify(enabled);
        if (_isElectronDLC && _fsDLC && _dlcFilePath) {
            try {
                _fsDLC.writeFileSync(_dlcFilePath, json);
            } catch (e) {
                console.error("DLCManager: failed to write dlcs file:", e);
            }
        }
        localStorage.setItem('enabled_dlcs', json);
    }

    getDLCList() {
        const enabledDLCs = this._loadEnabledDLCs();
        return Object.keys(this.availableDLCs).map(id => ({
            id: id,
            ...this.availableDLCs[id],
            active: enabledDLCs.includes(id)
        }));
    }

    async init() {
        console.log("Initializing DLC Manager...");
        const enabledDLCs = this._loadEnabledDLCs().filter(id => this.availableDLCs.hasOwnProperty(id));
        // Parallel script load — was sequential before, costing ~80ms × N DLCs
        // of round-trip per dynamic <script>. Order independence is fine: each
        // DLC self-registers via window.DLC_REGISTRY and its hero/biome inject
        // hooks read from the same global registries.
        // #29 P3 — go through ensureDLCLoaded so concurrent init calls share
        // the same promise + the memoization is uniform between eager init
        // and on-demand load paths (hero pick, story menu, etc.).
        const t0 = (typeof performance !== 'undefined') ? performance.now() : Date.now();
        await Promise.all(enabledDLCs.map(id => this.ensureDLCLoaded(id).catch(e => {
            console.error(`DLC ${id} load failed:`, e);
        })));
        const t1 = (typeof performance !== 'undefined') ? performance.now() : Date.now();
        console.log(`DLCs loaded in ${(t1 - t0).toFixed(0)}ms (${enabledDLCs.length} parallel)`);
    }

    toggleDLC(id, enable) {
        let enabled = this._loadEnabledDLCs();
        if (enable) {
            if (!enabled.includes(id)) enabled.push(id);
        } else {
            enabled = enabled.filter(e => e !== id);
        }
        this._saveEnabledDLCs(enabled);
    }

    async loadDLC(id) {
        if (this.activeDLCs.includes(id)) return;

        console.log(`Loading DLC: ${id}`);

        // In a web environment, we might need to dynamically import scripts.
        // For Electron/Local, we can assume the script tags are added or we use require.
        // Here we will simulate loading by assuming the DLC class is available globally 
        // or we load the script dynamically.

        try {
            // Dynamic Script Loading for Web/Electron compatibility
            await this.loadScript(`dlc/${id}/index.js`);

            // The script should register itself. 
            // Convention: DLCs push themselves to window.DLC_REGISTRY
            if (window.DLC_REGISTRY && window.DLC_REGISTRY[id]) {
                const dlcContent = window.DLC_REGISTRY[id];
                await dlcContent.load();
                this.activeDLCs.push(id);
                console.log(`DLC ${id} loaded successfully.`);
            } else {
                console.error(`DLC ${id} script loaded but no registry entry found.`);
            }
        } catch (e) {
            console.error(`Failed to load DLC ${id}:`, e);
        }
    }

    /**
     * Dynamically load a DLC file as an ES module.
     *
     * #194 — uses `import.meta.glob` (static manifest) instead of the prior
     * runtime `import(url)`. Vite statically discovers every dlc/&#42;/&#42;.js file at
     * build time and emits one chunk per DLC; the chunks pull in their
     * transitive imports (Entities/, Managers/, etc.) from the same bundle
     * graph as the rest of the renderer. In dev each glob entry is a thin
     * `() => import('./foo/bar.js')` thunk Vite resolves through its normal
     * module pipeline.
     *
     * Previously this used `await import(/&#42; @vite-ignore &#42;/ url)` so the bundler
     * skipped DLC files entirely — that worked while every DLC referenced
     * renderer classes by global pollution (the `window.X = X` shims). After
     * the #194 sweep added explicit `import` lines to every DLC file, those
     * imports need a real module-graph resolution; the glob gives it.
     */
    async loadScript(src) {
        // src looks like 'dlc/foo/bar.js' (the legacy path the call sites pass).
        // import.meta.glob keys are relative to THIS file (dlc/DLCManager.js),
        // so strip the leading `dlc/` segment.
        const key = './' + src.replace(/^\.?\/+/, '').replace(/^dlc\//, '');
        const loader = DLC_MODULES[key];
        if (!loader) {
            throw new Error(`[DLCManager] No glob entry for DLC module: ${src}`);
        }
        await loader();
    }

    isDLCActive(id) {
        return this.activeDLCs.includes(id);
    }
}

window.dlcManager = new DLCManager();
window.DLC_REGISTRY = {};
window.DLCManager  = DLCManager;

// ESM exports — window shims above keep classic-script callers unchanged.
export { DLCManager };
export default window.dlcManager;
