class SaveManager {
    // Secret used to derive the HMAC signing key.
    // Lives in client-side JS — a determined attacker can find it — but this stops
    // all casual save editing and makes tampering detectable at load time.
    static _SECRET = 'FriendeSecretKey_v2__7!zQ#pL9rW$mX@nK3&hJ6^tY8*cB0-vN1=aD4+sF5~gH2';

    // Cached CryptoKey so we only import once per session.
    static _keyPromise = null;

    // Schema version. Bump when adding a migration that changes structure.
    // Saves without a `version` field are treated as v0 (pre-migration era).
    static SCHEMA_VERSION = 1;

    // Sequential migrations applied on load when stored version < SCHEMA_VERSION.
    // Each entry: { from, to, fn(data) -> data }. Pure transforms only; do not
    // touch disk / network. Backup blob is written before any migration runs.
    static MIGRATIONS = [
        {
            from: 0, to: 1, fn(data) {
                // v0 → v1: stamp version field on legacy saves. Defensive merge in
                // loadGame backfills missing top-level keys (story, altar, weekly),
                // so no structural changes are needed here.
                return data;
            }
        }
    ];

    static _getKey() {
        if (!this._keyPromise) {
            this._keyPromise = crypto.subtle.importKey(
                'raw',
                new TextEncoder().encode(this._SECRET),
                { name: 'HMAC', hash: 'SHA-256' },
                false,
                ['sign', 'verify']
            );
        }
        return this._keyPromise;
    }

    static async _sign(plaintext) {
        const key = await this._getKey();
        const sig = await crypto.subtle.sign('HMAC', key, new TextEncoder().encode(plaintext));
        return btoa(String.fromCharCode(...new Uint8Array(sig)));
    }

    static async _verify(plaintext, b64Sig) {
        const key = await this._getKey();
        const sigBytes = Uint8Array.from(atob(b64Sig), c => c.charCodeAt(0));
        return crypto.subtle.verify('HMAC', key, sigBytes, new TextEncoder().encode(plaintext));
    }

    // --- Encode: JSON → base64(data) + HMAC signature ---
    static async encodeSaveData(data) {
        try {
            const json = JSON.stringify(data);
            const b64 = btoa(unescape(encodeURIComponent(json)));
            const sig = await this._sign(b64);
            // Outer envelope: { d: base64-data, s: base64-hmac }
            return btoa(JSON.stringify({ d: b64, s: sig }));
        } catch (e) {
            console.error('Failed to encode save data:', e);
            return null;
        }
    }

    // --- Decode: verify HMAC, then unwrap JSON ---
    static async decodeSaveData(raw) {
        try {
            // Legacy format 1: plain JSON (migrate transparently)
            if (raw.trim().startsWith('{')) {
                console.warn('Save: migrating from plain-JSON format');
                return JSON.parse(raw);
            }

            let envelope;
            try {
                envelope = JSON.parse(atob(raw));
            } catch (_) {
                // base64 decoded to something that isn't JSON at all — try the
                // old encode path: btoa(unescape(encodeURIComponent(json)))
                console.warn('Save: migrating from unsigned base64 format');
                const json = decodeURIComponent(escape(atob(raw)));
                return JSON.parse(json);
            }

            // New format: { d, s }
            if (typeof envelope.d === 'string' && typeof envelope.s === 'string') {
                // Correct — fall through to HMAC verification below.
            } else if (envelope && (envelope.global !== undefined || envelope.fire !== undefined)) {
                // Legacy format: base64 decoded directly to a save object (all-ASCII save data).
                console.warn('Save: migrating from unsigned base64 format (ASCII path)');
                return envelope;
            } else {
                console.error('Save: unrecognised envelope structure');
                return null;
            }

            const valid = await this._verify(envelope.d, envelope.s);
            if (!valid) {
                console.error('Save: HMAC verification failed — save file may have been tampered with');
                return null;
            }

            const json = decodeURIComponent(escape(atob(envelope.d)));
            return JSON.parse(json);
        } catch (e) {
            console.error('Failed to decode save data:', e);
            return null;
        }
    }

    static async saveGame(data) {
        if (!data) return null;

        // Always stamp current schema version before encoding so out-of-date
        // saves get fixed on the next write without an explicit migration step.
        data.version = SaveManager.SCHEMA_VERSION;

        const encoded = await this.encodeSaveData(data);
        if (!encoded) return null;

        if (typeof isElectron !== 'undefined' && isElectron && typeof fs !== 'undefined') {
            try {
                fs.writeFileSync(saveFilePath, encoded);
            } catch (e) {
                console.error('Failed to save game to disk:', e);
            }
        } else {
            localStorage.setItem('5FreundeSave', encoded);
        }

        console.log('Game Saved Successfully');
        return encoded;
    }

    // Write a one-shot backup of the current encoded blob before a migration runs.
    // Single slot (not a ring buffer) — overwrites on each migration boundary.
    static _writePreMigrationBackup(encoded, fromVersion) {
        if (!encoded) return;
        const tag = `pre_v${fromVersion}_to_v${SaveManager.SCHEMA_VERSION}`;
        try {
            if (typeof isElectron !== 'undefined' && isElectron && typeof fs !== 'undefined' && typeof saveFilePath !== 'undefined') {
                fs.writeFileSync(saveFilePath + `.${tag}.bak`, encoded);
            } else {
                localStorage.setItem(`5FreundeSave.${tag}.bak`, encoded);
            }
            console.log(`Save: pre-migration backup written (${tag})`);
        } catch (e) {
            console.error('Save: failed to write pre-migration backup:', e);
        }
    }

    // Run all applicable migrations in order. Returns the migrated object.
    static _migrate(data) {
        const stored = (typeof data.version === 'number' && data.version >= 0) ? data.version : 0;
        if (stored >= SaveManager.SCHEMA_VERSION) {
            // Same or newer (newer = forward-compat scenario; leave as-is)
            data.version = SaveManager.SCHEMA_VERSION;
            return data;
        }
        let cur = stored;
        for (const m of SaveManager.MIGRATIONS) {
            if (m.from < cur) continue;
            if (m.from !== cur) {
                console.warn(`Save: migration gap — no path from v${cur} to v${m.from}, aborting`);
                break;
            }
            try {
                data = m.fn(data) || data;
                cur = m.to;
                console.log(`Save: migrated v${m.from} → v${m.to}`);
            } catch (e) {
                console.error(`Save: migration v${m.from}→v${m.to} threw:`, e);
                break;
            }
        }
        data.version = cur;
        return data;
    }

    // Returns the raw encoded save blob from disk/localStorage without decoding.
    static getRawBlob() {
        try {
            if (typeof isElectron !== 'undefined' && isElectron && typeof fs !== 'undefined') {
                if (fs.existsSync(saveFilePath)) return fs.readFileSync(saveFilePath, 'utf8');
            } else {
                return localStorage.getItem('5FreundeSave') || null;
            }
        } catch (e) {
            console.error('Failed to read raw save blob:', e);
        }
        return null;
    }

    static async loadGame(defaultSaveData) {
        let data = null;
        let rawBlob = null;

        try {
            if (typeof isElectron !== 'undefined' && isElectron && typeof fs !== 'undefined') {
                if (fs.existsSync(saveFilePath)) {
                    rawBlob = fs.readFileSync(saveFilePath, 'utf8');
                    data = await this.decodeSaveData(rawBlob);
                }
            } else {
                rawBlob = localStorage.getItem('5FreundeSave');
                if (rawBlob) data = await this.decodeSaveData(rawBlob);
            }
        } catch (e) {
            console.error('Failed to load save file:', e);
        }

        if (data) {
            const storedVersion = (typeof data.version === 'number') ? data.version : 0;
            if (storedVersion < SaveManager.SCHEMA_VERSION) {
                this._writePreMigrationBackup(rawBlob, storedVersion);
                data = this._migrate(data);
            }

            const merged = {
                ...defaultSaveData, ...data,
                global: { ...defaultSaveData.global, ...data.global }
            };

            // Defensive merge for new top-level keys (idempotent — also covers
            // partial migrations / hand-edited saves).
            if (!merged.story) merged.story = { unlockedChapters: [], enabled: true };
            else if (merged.story.enabled === undefined) merged.story.enabled = true;
            if (!merged.altar)  merged.altar  = { active: [] };
            if (!merged.weekly) merged.weekly = { lastCompleted: null };

            merged.version = SaveManager.SCHEMA_VERSION;
            return merged;
        }

        const fresh = JSON.parse(JSON.stringify(defaultSaveData));
        fresh.version = SaveManager.SCHEMA_VERSION;
        return fresh;
    }

    static exportSave(data) {
        const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url; a.download = 'freunde_savegame.json';
        document.body.appendChild(a); a.click(); document.body.removeChild(a);
    }

    static importSave(file, callback) {
        if (!file) return;
        const reader = new FileReader();
        reader.onload = function (e) {
            try {
                const json = JSON.parse(e.target.result);
                if (json.global && json.unlocks) {
                    callback(json);
                } else {
                    alert('Invalid save file format!');
                }
            } catch (err) {
                console.error(err);
                alert('Failed to parse save file.');
            }
        };
        reader.readAsText(file);
    }
}

export { SaveManager };
export default SaveManager;
