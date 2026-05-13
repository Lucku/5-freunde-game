// MapManager — local custom map file I/O (Electron only).
// Falls back gracefully in browser: isAvailable() returns false, all ops no-op.

const _DEFAULT_WAVE_CONFIG = {
    waveCount: 10,
    enemiesPerWave: 30,
    spawnRateBase: 45,
    spawnRateDecayPerWave: 1.3,
    enemyPool: ['BASIC', 'SHOOTER', 'SWARM', 'SPEEDSTER', 'BRUTE', 'TOXIC'],
    bossType: 'random',
};

class MapManager {
    static get mapsDir() {
        return (typeof process !== 'undefined' && process?.env?.APP_MAPS_PATH) || null;
    }

    static isAvailable() {
        return !!this.mapsDir;
    }

    static get _require() {
        return (typeof require !== 'undefined' ? require : null)
            ?? window.require
            ?? null;
    }

    // Returns [{ name, fileName, mtime }] sorted newest-first.
    static listMaps() {
        if (!this.isAvailable()) return [];
        try {
            const _req = this._require;
            if (!_req) return [];
            const fs   = _req('fs');
            const path = _req('path');
            const dir  = this.mapsDir;
            return fs.readdirSync(dir)
                .filter(f => f.endsWith('.json'))
                .map(f => ({
                    fileName: f,
                    name: f.replace(/\.json$/, '').replace(/_/g, ' '),
                    mtime: fs.statSync(path.join(dir, f)).mtimeMs,
                }))
                .sort((a, b) => b.mtime - a.mtime);
        } catch { return []; }
    }

    // Returns parsed map JSON, or null on failure.
    static loadMap(fileName) {
        if (!this.isAvailable()) return null;
        try {
            const _req = this._require;
            if (!_req) return null;
            const fs   = _req('fs');
            const path = _req('path');
            const raw  = fs.readFileSync(path.join(this.mapsDir, fileName), 'utf8');
            const data = JSON.parse(raw);
            // Back-fill waveConfig for v1 maps
            if (!data.waveConfig) data.waveConfig = { ..._DEFAULT_WAVE_CONFIG };
            return data;
        } catch { return null; }
    }

    // Saves map data to <mapsDir>/<safeName>.json. Returns the fileName written.
    static saveMap(name, data) {
        if (!this.isAvailable()) return null;
        try {
            const _req = this._require;
            if (!_req) return null;
            const fs   = _req('fs');
            const path = _req('path');
            const safe = (name || 'Untitled').replace(/[^a-z0-9_\- ]/gi, '_').trim().replace(/\s+/g, '_');
            const fileName = safe + '.json';
            fs.writeFileSync(path.join(this.mapsDir, fileName), JSON.stringify(data, null, 2), 'utf8');
            return fileName;
        } catch { return null; }
    }

    // Deletes a map by fileName. Returns true on success.
    static deleteMap(fileName) {
        if (!this.isAvailable()) return false;
        try {
            const _req = this._require;
            if (!_req) return false;
            const fs   = _req('fs');
            const path = _req('path');
            fs.unlinkSync(path.join(this.mapsDir, fileName));
            return true;
        } catch { return false; }
    }

    static get defaultWaveConfig() {
        return { ..._DEFAULT_WAVE_CONFIG };
    }
}

window.MapManager = MapManager;
export { MapManager };
