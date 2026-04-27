class CloudSaveManager {
    static _syncing = false;

    static _baseUrl() {
        return (window.gameConfig.serverUrl || 'http://localhost:3001').replace(/\/$/, '');
    }

    static _account() {
        return window.gameConfig.account || {};
    }

    static _cfg() {
        return window.gameConfig.cloudSave || {};
    }

    static async _fetch(endpoint, options = {}) {
        const token = this._account().token;
        const headers = { 'Content-Type': 'application/json' };
        if (token) headers['Authorization'] = `Bearer ${token}`;
        return fetch(this._baseUrl() + endpoint, { ...options, headers });
    }

    static isEnabled() {
        return !!(window.gameConfig.cloudSaveEnabled && this._account().token);
    }

    static isLoggedIn() {
        return !!this._account().token;
    }

    // Simple blob fingerprint: length + first/last 16 chars
    static _blobHash(blob) {
        if (!blob) return null;
        const len = blob.length;
        return `${len}:${blob.substring(0, 16)}|${blob.substring(len - 16)}`;
    }

    static async login(username, password) {
        const res = await this._fetch('/api/login', {
            method: 'POST',
            body: JSON.stringify({ username, password })
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || 'Login failed');
        window.gameConfig.account.token    = data.token;
        window.gameConfig.account.username = data.username;
        if (typeof saveConfig === 'function') saveConfig();
        return data;
    }

    static async register(username, password) {
        const res = await this._fetch('/api/register', {
            method: 'POST',
            body: JSON.stringify({ username, password })
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || 'Registration failed');
        window.gameConfig.account.token    = data.token;
        window.gameConfig.account.username = data.username;
        if (typeof saveConfig === 'function') saveConfig();
        return data;
    }

    static logout() {
        window.gameConfig.account.token    = null;
        window.gameConfig.account.username = null;
        window.gameConfig.cloudSave.lastSyncAt   = 0;
        window.gameConfig.cloudSave.lastSyncHash = null;
        window.gameConfig.cloudSaveEnabled = false;
        if (typeof saveConfig === 'function') saveConfig();
        if (typeof updateOptionButtons === 'function') updateOptionButtons();
        if (typeof updateMenuAccountBadge === 'function') updateMenuAccountBadge();
    }

    static async _downloadSave() {
        const res = await this._fetch('/api/save');
        if (!res.ok) return null;
        const data = await res.json();
        return data.blob ? data : null;
    }

    static async _uploadSave(blob) {
        const res = await this._fetch('/api/save', {
            method: 'PUT',
            body: JSON.stringify({ blob })
        });
        if (!res.ok) {
            const err = await res.json().catch(() => ({}));
            throw new Error(err.error || 'Upload failed');
        }
        const data = await res.json();
        window.gameConfig.cloudSave.lastSyncAt   = data.savedAt;
        window.gameConfig.cloudSave.lastSyncHash = this._blobHash(blob);
        if (typeof saveConfig === 'function') saveConfig();
    }

    static uploadInBackground(blob) {
        if (!this.isEnabled() || !blob) return;
        this._uploadSave(blob).catch(e => console.warn('[CloudSave] Upload failed:', e.message));
    }

    // Called from loadGame() on startup
    static async syncOnStartup() {
        if (!this.isEnabled() || this._syncing) return;
        this._syncing = true;

        try {
            const cfg = this._cfg();
            const localBlob = typeof SaveManager !== 'undefined' ? SaveManager.getRawBlob() : null;

            let cloudData = null;
            try {
                cloudData = await this._downloadSave();
            } catch (e) {
                console.warn('[CloudSave] Startup check failed:', e.message);
                return;
            }

            if (!cloudData) {
                if (localBlob) this.uploadInBackground(localBlob);
                return;
            }

            const { blob: cloudBlob, savedAt: cloudSavedAt } = cloudData;
            const cloudChanged = cloudSavedAt > (cfg.lastSyncAt || 0);
            const localChanged = this._blobHash(localBlob) !== cfg.lastSyncHash;

            if (!cloudChanged) {
                if (localChanged && localBlob) this.uploadInBackground(localBlob);
                return;
            }

            if (!localChanged || cloudBlob === localBlob) {
                await this._applyCloudSave(cloudBlob, cloudSavedAt);
                return;
            }

            const choice = await this._showConflictModal(cloudSavedAt);
            if (choice === 'cloud') {
                await this._applyCloudSave(cloudBlob, cloudSavedAt);
            } else {
                if (localBlob) await this._uploadSave(localBlob).catch(e => console.warn('[CloudSave]', e.message));
            }
        } finally {
            this._syncing = false;
        }
    }

    static async _applyCloudSave(cloudBlob, cloudSavedAt) {
        const data = await SaveManager.decodeSaveData(cloudBlob);
        if (!data) {
            console.error('[CloudSave] Failed to decode cloud save blob');
            return;
        }

        const def = window._defaultSaveData || {};
        const merged = { ...def, ...data, global: { ...(def.global || {}), ...data.global } };
        if (!merged.story) merged.story = { unlockedChapters: [], enabled: true };
        else if (merged.story.enabled === undefined) merged.story.enabled = true;
        if (!merged.altar) merged.altar = { active: [] };
        if (!merged.weekly) merged.weekly = { lastCompleted: null };

        window.saveData = merged;
        await SaveManager.saveGame(merged);

        window.gameConfig.cloudSave.lastSyncAt   = cloudSavedAt;
        window.gameConfig.cloudSave.lastSyncHash = this._blobHash(cloudBlob);
        if (typeof saveConfig === 'function') saveConfig();
    }

    static _showConflictModal(cloudSavedAt) {
        return new Promise(resolve => {
            const modal = document.getElementById('cloud-conflict-modal');
            if (!modal) { resolve('local'); return; }

            const cloudDateEl = document.getElementById('cloud-conflict-cloud-date');
            if (cloudDateEl) cloudDateEl.textContent = new Date(cloudSavedAt).toLocaleString();

            modal.style.display = 'flex';
            window._resolveCloudConflict = choice => {
                modal.style.display = 'none';
                delete window._resolveCloudConflict;
                resolve(choice);
            };
        });
    }

    // --- Login modal ---

    static showLoginModal() {
        const modal = document.getElementById('cloud-login-modal');
        if (!modal) return;
        const userInput = document.getElementById('cloud-username');
        if (userInput) userInput.value = '';
        const passInput = document.getElementById('cloud-password');
        if (passInput) passInput.value = '';
        const statusEl = document.getElementById('cloud-login-status');
        if (statusEl) { statusEl.textContent = ''; statusEl.style.color = '#aaa'; }
        modal.style.display = 'flex';
        // Track previous UI state so we can restore it on close
        this._prevUIState = window.uiState || 'MENU';
        if (window.setUIState) window.setUIState('SIGN_IN');
    }

    static hideLoginModal() {
        const modal = document.getElementById('cloud-login-modal');
        if (modal) modal.style.display = 'none';
        if (window.setUIState) window.setUIState(this._prevUIState || 'MENU');
        this._prevUIState = null;
    }

    static async submitLogin(isRegister) {
        const username = (document.getElementById('cloud-username')?.value || '').trim();
        const password = document.getElementById('cloud-password')?.value || '';
        const statusEl = document.getElementById('cloud-login-status');

        if (!username || !password) {
            if (statusEl) { statusEl.textContent = 'Please fill in username and password.'; statusEl.style.color = '#ff7777'; }
            return;
        }
        if (statusEl) { statusEl.textContent = isRegister ? 'Creating account…' : 'Logging in…'; statusEl.style.color = '#aaa'; }

        try {
            if (isRegister) {
                await this.register(username, password);
            } else {
                await this.login(username, password);
            }
            if (statusEl) { statusEl.textContent = `Logged in as ${this._account().username}`; statusEl.style.color = '#77ff88'; }
            setTimeout(() => {
                this.hideLoginModal();
                if (typeof updateOptionButtons === 'function') updateOptionButtons();
                if (typeof updateMenuAccountBadge === 'function') updateMenuAccountBadge();
            }, 700);
        } catch (e) {
            if (statusEl) { statusEl.textContent = e.message; statusEl.style.color = '#ff7777'; }
        }
    }
}

window.CloudSaveManager = CloudSaveManager;
