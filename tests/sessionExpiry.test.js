import { describe, it, expect, beforeAll, beforeEach, afterAll, vi } from 'vitest';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';

// Expired / rejected login handling: the client must drop a login token the
// server no longer accepts instead of showing "Logged in" while every online
// call fails with "Unauthorized". Tokens are signed with the server's own
// jsonwebtoken (it lives under `server/`, see adminAuth.test.js).
const serverRequire = createRequire(fileURLToPath(new URL('../server/server.js', import.meta.url)));
const jwt = serverRequire('jsonwebtoken');

const SECRET = 'test-secret-for-session-expiry';
const nowSec = () => Math.floor(Date.now() / 1000);
const validToken   = () => jwt.sign({ id: 1, username: 'lucas' }, SECRET, { expiresIn: '90d' });
const expiredToken = () => jwt.sign({ id: 1, username: 'lucas', exp: nowSec() - 60 }, SECRET);

let CloudSaveManager;
let nm;
let notifications;
let fetchStatus;

function login(token) {
    window.gameConfig.account = { token, username: 'lucas' };
    window.gameConfig.cloudSaveEnabled = true;
    window.gameConfig.cloudSave = { lastSyncAt: 123, lastSyncHash: 'h' };
}

beforeAll(async () => {
    vi.stubGlobal('window', { gameConfig: {} });
    vi.stubGlobal('showNotification', (text, type) => { notifications.push({ text, type }); });
    vi.stubGlobal('fetch', async () => ({ status: fetchStatus, ok: fetchStatus < 400, json: async () => ({}) }));

    ({ CloudSaveManager } = await import('../Managers/CloudSaveManager.js'));
    const { NetworkManager } = await import('../Managers/NetworkManager.js');
    nm = new NetworkManager();
});

afterAll(() => {
    vi.unstubAllGlobals();
});

beforeEach(() => {
    notifications = [];
    fetchStatus = 200;
    login(validToken());
});

describe('CloudSaveManager._tokenExpired', () => {
    it('is false for a token that expires in the future', () => {
        expect(CloudSaveManager._tokenExpired(validToken())).toBe(false);
    });

    it('is true once exp has passed', () => {
        expect(CloudSaveManager._tokenExpired(expiredToken())).toBe(true);
    });

    it('decodes base64url payloads that contain - and _', () => {
        // '?>' bytes encode to '_' / '-' in base64url, which plain atob rejects.
        const token = jwt.sign({ id: 1, pad: '?>?>~~~', exp: nowSec() - 60 }, SECRET);
        expect(token.split('.')[1]).toMatch(/[-_]/);
        expect(CloudSaveManager._tokenExpired(token)).toBe(true);
    });

    it('treats an unreadable token as not expired (server decides)', () => {
        expect(CloudSaveManager._tokenExpired('not-a-jwt')).toBe(false);
        expect(CloudSaveManager._tokenExpired('a.%%%.c')).toBe(false);
    });
});

describe('CloudSaveManager.isLoggedIn / validateSession', () => {
    it('keeps a valid login', () => {
        expect(CloudSaveManager.isLoggedIn()).toBe(true);
        expect(window.gameConfig.account.token).toBeTruthy();
        expect(notifications).toHaveLength(0);
    });

    it('drops an expired login, warns once, and keeps the Cloud Sync preference', () => {
        login(expiredToken());
        expect(CloudSaveManager.isLoggedIn()).toBe(false);
        expect(window.gameConfig.account.token).toBeNull();
        expect(window.gameConfig.account.username).toBeNull();
        expect(window.gameConfig.cloudSaveEnabled).toBe(true);
        expect(window.gameConfig.cloudSave.lastSyncAt).toBe(0);
        expect(notifications).toEqual([{ text: CloudSaveManager.SESSION_EXPIRED_MSG, type: 'warning' }]);

        CloudSaveManager.validateSession();
        expect(notifications).toHaveLength(1);
    });

    it('a manual logout still turns Cloud Sync off', () => {
        CloudSaveManager.logout();
        expect(window.gameConfig.account.token).toBeNull();
        expect(window.gameConfig.cloudSaveEnabled).toBe(false);
    });
});

describe('CloudSaveManager._fetch', () => {
    it('expires the login when the server rejects the token (401)', async () => {
        fetchStatus = 401;
        await CloudSaveManager._downloadSave();
        expect(window.gameConfig.account.token).toBeNull();
        expect(notifications).toHaveLength(1);
    });

    it('does not treat other errors as an expired login', async () => {
        fetchStatus = 500;
        await CloudSaveManager._downloadSave();
        expect(window.gameConfig.account.token).toBeTruthy();
    });

    it('a wrong-password 401 on login does not log the player out', async () => {
        fetchStatus = 401;
        await expect(CloudSaveManager.login('lucas', 'wrong')).rejects.toThrow();
        expect(window.gameConfig.account.token).toBeTruthy();
        expect(notifications).toHaveLength(0);
    });
});

describe('NetworkManager auth rejection', () => {
    it('stops reconnecting, expires the login, and forwards a readable message', () => {
        const seen = [];
        const off = nm.on('ERROR', msg => seen.push(msg.message));
        nm._intentionalClose = false;

        nm._dispatch({ type: 'ERROR', message: 'Unauthorized' });
        off();

        expect(nm._intentionalClose).toBe(true);
        expect(window.gameConfig.account.token).toBeNull();
        expect(seen).toEqual([CloudSaveManager.SESSION_EXPIRED_MSG]);
    });

    it('leaves other server errors alone', () => {
        const seen = [];
        const off = nm.on('ERROR', msg => seen.push(msg.message));
        nm._intentionalClose = false;

        nm._dispatch({ type: 'ERROR', message: 'Lobby not found' });
        off();

        expect(nm._intentionalClose).toBe(false);
        expect(window.gameConfig.account.token).toBeTruthy();
        expect(seen).toEqual(['Lobby not found']);
    });
});
