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
        this.availableDLCs = {
            'rise_of_the_rock': {
                title: "Rise of the Rock",
                desc: "Unleash the power of the Earth! Adds a new Earth Hero, Rock Biome, new enemies, and powerful mutations.",
                icon: "⛰️"
            },
            'tournament_of_thunder': {
                title: "The Tournament of Thunder",
                desc: "Enter the Cloud Kingdom! Introduces the Lightning Hero, Cloud Biome, and the legendary Tournament.",
                icon: "⚡"
            },
            'champions_of_chaos': {
                title: "Champions of Chaos",
                desc: "Defy gravity! Introduces the new Purple Hero 'Gravity', a chaotic playstyle, a distorted dimension, and a story of entropy.",
                icon: "🌌"
            },
            'waker_of_winds': {
                title: "Waker of Winds",
                desc: "Soar through the skies! Introduces the Turquoise Hero 'Air', the Sky Palace biome, and a tale of freedom.",
                icon: "🌪️"
            },
            'faith_of_fortune': {
                title: "Faith of Fortune",
                desc: "Balance vs Chaos! Introduces 'Spirit' and 'Chance'. Temples, madness, and the search for the Mask.",
                icon: "🎰"
            },
            'symphony_of_sickness': {
                title: "Symphony of Sickness",
                desc: "Rhythm vs Decay! Introduces 'Sound' and 'Poison' Heroes. Master the beat or spread the plague.",
                icon: "🎵"
            },
            'echos_of_eternity': {
                title: "Echos of Eternity",
                desc: "Where all timelines converge. Introduces the Time Hero, the hidden Love Hero, and the Maze of Time.",
                icon: "⌛"
            }
        };
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
        const enabledDLCs = this._loadEnabledDLCs();
        for (const id of enabledDLCs) {
            if (this.availableDLCs.hasOwnProperty(id)) {
                await this.loadDLC(id);
            }
        }
    }

    toggleDLC(id, enable) {
        let enabled = this._loadEnabledDLCs();
        if (enable) {
            if (!enabled.includes(id)) enabled.push(id);
        } else {
            enabled = enabled.filter(e => e !== id);
        }
        this._saveEnabledDLCs(enabled);
        alert(`DLC ${id} ${enable ? 'enabled' : 'disabled'}. Please restart the game.`);
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

    loadScript(src) {
        return new Promise((resolve, reject) => {
            const script = document.createElement('script');
            script.src = src;
            script.onload = resolve;
            script.onerror = reject;
            document.head.appendChild(script);
        });
    }

    isDLCActive(id) {
        return this.activeDLCs.includes(id);
    }
}

window.dlcManager = new DLCManager();
window.DLC_REGISTRY = {};
