class SaveManager {
    // Secret used to derive the HMAC signing key.
    // Lives in client-side JS — a determined attacker can find it — but this stops
    // all casual save editing and makes tampering detectable at load time.
    static _SECRET = 'FriendeSecretKey_v2__7!zQ#pL9rW$mX@nK3&hJ6^tY8*cB0-vN1=aD4+sF5~gH2';

    // Cached CryptoKey so we only import once per session.
    static _keyPromise = null;

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

        try {
            if (typeof isElectron !== 'undefined' && isElectron && typeof fs !== 'undefined') {
                if (fs.existsSync(saveFilePath)) {
                    const raw = fs.readFileSync(saveFilePath, 'utf8');
                    data = await this.decodeSaveData(raw);
                }
            } else {
                const raw = localStorage.getItem('5FreundeSave');
                if (raw) data = await this.decodeSaveData(raw);
            }
        } catch (e) {
            console.error('Failed to load save file:', e);
        }

        if (data) {
            const merged = {
                ...defaultSaveData, ...data,
                global: { ...defaultSaveData.global, ...data.global }
            };

            // Migrations
            if (!merged.story) merged.story = { unlockedChapters: [], enabled: true };
            else if (merged.story.enabled === undefined) merged.story.enabled = true;
            if (!merged.altar)  merged.altar  = { active: [] };
            if (!merged.weekly) merged.weekly = { lastCompleted: null };

            return merged;
        }

        return JSON.parse(JSON.stringify(defaultSaveData));
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
