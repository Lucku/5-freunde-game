// Explicit import replaces bare-name `SaveManager` global read.
import { SaveManager } from './SaveManager.js';

class CloudSaveManager {
    static _syncing = false;
    static SESSION_EXPIRED_MSG = 'Login expired — please log in again.';

    static _baseUrl() {
        const raw = (window.gameConfig.serverUrl || 'localhost').trim();
        if (raw.startsWith('http://') || raw.startsWith('https://')) return raw.replace(/\/$/, '');
        return `http://${raw}:3001`;
    }

    // Returns just the hostname/IP for display
    static _displayHost() {
        const raw = (window.gameConfig.serverUrl || 'localhost').trim();
        if (raw.startsWith('http://') || raw.startsWith('https://')) {
            try { return new URL(raw).hostname; } catch { return raw; }
        }
        return raw.split(':')[0]; // strip port if someone typed host:port
    }

    // Stores a bare hostname/IP into config
    static _saveHost(host) {
        window.gameConfig.serverUrl = host.trim().replace(/^https?:\/\//, '').split('/')[0].split(':')[0];
        if (typeof saveConfig === 'function') saveConfig();
    }

    static _account() {
        return window.gameConfig.account || {};
    }

    static _cfg() {
        return window.gameConfig.cloudSave || {};
    }

    // `auth: false` for login/register: they send no token, and their 401
    // means a wrong password rather than a dead login.
    static async _fetch(endpoint, options = {}, { auth = true } = {}) {
        const token = auth ? this._account().token : null;
        const headers = { 'Content-Type': 'application/json' };
        if (token) headers['Authorization'] = `Bearer ${token}`;
        const res = await fetch(this._baseUrl() + endpoint, { ...options, headers });
        if (token && res.status === 401) this.expireSession();
        return res;
    }

    static isEnabled() {
        return !!(window.gameConfig.cloudSaveEnabled && this._account().token);
    }

    static isLoggedIn() {
        this.validateSession();
        return !!this._account().token;
    }

    // Reads the JWT `exp` claim (the server issues 90-day tokens). No
    // signature check: the server stays the authority, and an unreadable
    // token counts as not expired so the server can reject it instead.
    static _tokenExpired(token) {
        try {
            const payload = JSON.parse(atob(token.split('.')[1].replace(/-/g, '+').replace(/_/g, '/')));
            return typeof payload.exp === 'number' && payload.exp * 1000 <= Date.now();
        } catch {
            return false;
        }
    }

    // Drops an expired login so every `account.token` check in the UI (menu
    // badge, Options, lobby gates) shows the logged-out state.
    static validateSession() {
        const token = this._account().token;
        if (token && this._tokenExpired(token)) this.expireSession();
    }

    // The server no longer accepts the saved login (expired, or signed with
    // another server's JWT_SECRET): log out and tell the player why.
    static expireSession() {
        if (!this._account().token) return;
        this.logout({ keepCloudSync: true });
        if (typeof showNotification === 'function') showNotification(this.SESSION_EXPIRED_MSG, 'warning');
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
        }, { auth: false });
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
        }, { auth: false });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || 'Registration failed');
        window.gameConfig.account.token    = data.token;
        window.gameConfig.account.username = data.username;
        if (typeof saveConfig === 'function') saveConfig();
        return data;
    }

    // `keepCloudSync`: an expired login is not the player opting out, and
    // logging back in never re-enables Cloud Sync, so keep the preference.
    static logout({ keepCloudSync = false } = {}) {
        window.gameConfig.account.token    = null;
        window.gameConfig.account.username = null;
        window.gameConfig.cloudSave.lastSyncAt   = 0;
        window.gameConfig.cloudSave.lastSyncHash = null;
        if (!keepCloudSync) window.gameConfig.cloudSaveEnabled = false;
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

            let cloudMeta = null;
            let localMeta = null;
            try {
                const decoded = await SaveManager.decodeSaveData(cloudBlob);
                cloudMeta = this._extractSaveMeta(decoded);
            } catch (_) {}
            try {
                const decoded = await SaveManager.decodeSaveData(localBlob);
                localMeta = this._extractSaveMeta(decoded);
            } catch (_) {}

            const choice = await this._showConflictModal(cloudSavedAt, cloudMeta, localMeta);
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

        window.gameContext.saveData = merged;
        await SaveManager.saveGame(merged);

        window.gameConfig.cloudSave.lastSyncAt   = cloudSavedAt;
        window.gameConfig.cloudSave.lastSyncHash = this._blobHash(cloudBlob);
        if (typeof saveConfig === 'function') saveConfig();
    }

    static _extractSaveMeta(data) {
        if (!data || typeof data !== 'object') return null;
        const heroKeys = ['fire', 'water', 'ice', 'plant', 'metal', 'black'];
        const unlockedCount = heroKeys.filter(h => data[h]?.unlocked).length;
        const metaSum = Object.values(data.metaUpgrades || {}).reduce((a, b) => a + (b || 0), 0);
        return {
            unlockedHeroes: unlockedCount,
            maxWave:    data.global?.maxWave    || 0,
            totalKills: data.global?.totalKills || 0,
            metaPoints: metaSum,
        };
    }

    static _metaLine(meta) {
        if (!meta) return '—';
        return `Wave ${meta.maxWave} · ${meta.unlockedHeroes} heroes · ${meta.totalKills.toLocaleString()} kills · ${meta.metaPoints} meta pts`;
    }

    static _showConflictModal(cloudSavedAt, cloudMeta, localMeta) {
        return new Promise(resolve => {
            const modal = document.getElementById('cloud-conflict-modal');
            if (!modal) { resolve('local'); return; }

            const cloudDateEl = document.getElementById('cloud-conflict-cloud-date');
            if (cloudDateEl) cloudDateEl.textContent = new Date(cloudSavedAt).toLocaleString();

            const cloudMetaEl = document.getElementById('cloud-conflict-cloud-meta');
            if (cloudMetaEl) cloudMetaEl.textContent = this._metaLine(cloudMeta);

            const localMetaEl = document.getElementById('cloud-conflict-local-meta');
            if (localMetaEl) localMetaEl.textContent = this._metaLine(localMeta);

            modal.style.display = 'flex';
            this._prevConflictUIState = window.uiState || 'MENU';
            if (window.setUIState) window.setUIState('CLOUD_CONFLICT');
            window._resolveCloudConflict = choice => {
                modal.style.display = 'none';
                delete window._resolveCloudConflict;
                if (window.setUIState) window.setUIState(this._prevConflictUIState || 'MENU');
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

// `window.CloudSaveManager` shim retired; consumers import directly.
export { CloudSaveManager };
export default CloudSaveManager;
