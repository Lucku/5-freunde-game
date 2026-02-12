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
            }
        };
    }

    getDLCList() {
        // Migration: Check for old ID
        let enabledDLCs = JSON.parse(localStorage.getItem('enabled_dlcs') || '["rise_of_the_rock", "champions_of_chaos", "waker_of_winds", "faith_of_fortune"]');
        if (enabledDLCs.includes('the_wind_waker')) {
            enabledDLCs = enabledDLCs.filter(e => e !== 'the_wind_waker');
            if (!enabledDLCs.includes('waker_of_winds')) enabledDLCs.push('waker_of_winds');
            localStorage.setItem('enabled_dlcs', JSON.stringify(enabledDLCs));
        }

        return Object.keys(this.availableDLCs).map(id => ({
            id: id,
            ...this.availableDLCs[id],
            active: enabledDLCs.includes(id)
        }));
    }

    async init() {
        console.log("Initializing DLC Manager...");

        // Load enabled DLCs from storage (default to enabled for now)
        let enabledDLCs = JSON.parse(localStorage.getItem('enabled_dlcs') || '["rise_of_the_rock", "champions_of_chaos", "waker_of_winds", "faith_of_fortune"]');

        // Migration check again to be safe
        if (enabledDLCs.includes('the_wind_waker')) {
            enabledDLCs = enabledDLCs.filter(e => e !== 'the_wind_waker');
            if (!enabledDLCs.includes('waker_of_winds')) enabledDLCs.push('waker_of_winds');
            localStorage.setItem('enabled_dlcs', JSON.stringify(enabledDLCs));
        }

        for (const id of enabledDLCs) {
            if (this.availableDLCs.hasOwnProperty(id)) {
                await this.loadDLC(id);
            }
        }
    }

    toggleDLC(id, enable) {
        let enabled = JSON.parse(localStorage.getItem('enabled_dlcs') || '["rise_of_the_rock"]');
        if (enable) {
            if (!enabled.includes(id)) enabled.push(id);
        } else {
            enabled = enabled.filter(e => e !== id);
        }
        localStorage.setItem('enabled_dlcs', JSON.stringify(enabled));
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
