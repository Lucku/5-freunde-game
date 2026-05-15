import { describe, it, expect, beforeEach, beforeAll, afterAll, vi } from 'vitest';

// TelemetryManager calls window.addEventListener / document.addEventListener
// at module load, and reads navigator + localStorage at runtime. Stub those
// before the dynamic import so the side-effect install() doesn't throw.

let TelemetryManager;
let fetchCalls;
let beaconCalls;

beforeAll(async () => {
    const listeners = {};
    const storage = new Map();

    vi.stubGlobal('window', {
        addEventListener: (name, fn) => { (listeners[name] ||= []).push(fn); },
        removeEventListener: () => {},
        gameConfig: null,
    });
    vi.stubGlobal('document', {
        addEventListener: () => {},
        visibilityState: 'visible',
    });
    vi.stubGlobal('navigator', {
        sendBeacon: (url, blob) => { beaconCalls.push({ url, size: blob?.size || 0 }); return true; },
    });
    vi.stubGlobal('localStorage', {
        getItem: k => storage.get(k) ?? null,
        setItem: (k, v) => { storage.set(k, String(v)); },
        removeItem: k => { storage.delete(k); },
    });
    vi.stubGlobal('Blob', class { constructor(arr) { this.size = arr.reduce((n, p) => n + p.length, 0); } });
    vi.stubGlobal('APP_VERSION', '1.0.0-test');

    // Block setInterval from leaking — return a no-op handle.
    vi.useFakeTimers();

    const mod = await import('../Managers/TelemetryManager.js');
    TelemetryManager = mod.TelemetryManager;
});

afterAll(() => {
    vi.useRealTimers();
    vi.unstubAllGlobals();
});

beforeEach(() => {
    fetchCalls = [];
    beaconCalls = [];
    vi.stubGlobal('fetch', (url, opts) => {
        fetchCalls.push({ url, body: opts?.body });
        return Promise.resolve({ ok: true, json: () => Promise.resolve({ ok: true }) });
    });
    // Reset class state between tests
    TelemetryManager._buffer.length = 0;
    TelemetryManager._recent.length = 0;
    TelemetryManager._dropped = 0;
    window.gameConfig = {
        telemetryEnabled: true,
        telemetryConsentSeen: true,
        telemetryInstanceId: 'test-uuid-1234',
        serverUrl: 'http://localhost:3001',
    };
});

describe('TelemetryManager opt-in gate', () => {
    it('drops events when telemetry is disabled', () => {
        window.gameConfig.telemetryEnabled = false;
        TelemetryManager.track('run_start', { hero: 'fire' });
        expect(TelemetryManager._buffer.length).toBe(0);
    });

    it('drops events when consent has not been seen', () => {
        window.gameConfig.telemetryConsentSeen = false;
        TelemetryManager.track('run_start', { hero: 'fire' });
        expect(TelemetryManager._buffer.length).toBe(0);
    });

    it('drops events when gameConfig is missing', () => {
        window.gameConfig = null;
        TelemetryManager.track('run_start', { hero: 'fire' });
        // Restore so subsequent tests' beforeEach doesn't NPE on cleanup
        window.gameConfig = {};
        expect(TelemetryManager._buffer.length).toBe(0);
    });

    it('accepts events when both gates pass', () => {
        TelemetryManager.track('run_start', { hero: 'fire', mode: 'normal' });
        expect(TelemetryManager._buffer.length).toBe(1);
        expect(TelemetryManager._buffer[0].event).toBe('run_start');
        expect(TelemetryManager._buffer[0].hero).toBe('fire');
    });
});

describe('TelemetryManager event whitelist', () => {
    it('rejects unknown event names', () => {
        TelemetryManager.track('arbitrary_evil_event', { ssn: '123-45-6789' });
        expect(TelemetryManager._buffer.length).toBe(0);
    });

    it('strips fields not on the allow-list', () => {
        TelemetryManager.track('run_end', {
            hero:       'fire',
            outcome:    'death',
            wave:       12,
            username:   'shouldNotLeak',  // PII — must be stripped
            authToken:  'shouldNotLeak',  // PII — must be stripped
            password:   'shouldNotLeak',
        });
        const ev = TelemetryManager._buffer[0];
        expect(ev.hero).toBe('fire');
        expect(ev.outcome).toBe('death');
        expect(ev.wave).toBe(12);
        expect(ev.username).toBeUndefined();
        expect(ev.authToken).toBeUndefined();
        expect(ev.password).toBeUndefined();
    });

    it('accepts all four whitelisted events', () => {
        for (const e of ['run_start', 'wave_completed', 'level_up', 'run_end']) {
            TelemetryManager.track(e, { hero: 'fire' });
        }
        expect(TelemetryManager._buffer.length).toBe(4);
    });
});

describe('TelemetryManager batching + flush', () => {
    it('auto-flushes when buffer hits FLUSH_THRESHOLD', () => {
        const threshold = TelemetryManager._FLUSH_THRESHOLD;
        for (let i = 0; i < threshold; i++) {
            TelemetryManager.track('wave_completed', { hero: 'fire', wave: i + 1 });
        }
        // After auto-flush the buffer should be empty and fetch should have fired.
        expect(TelemetryManager._buffer.length).toBe(0);
        expect(fetchCalls.length).toBe(1);
        expect(fetchCalls[0].url).toBe('http://localhost:3001/api/telemetry');
    });

    it('manual flush sends batched events and clears buffer', () => {
        TelemetryManager.track('run_start', { hero: 'water', mode: 'normal' });
        TelemetryManager.track('wave_completed', { hero: 'water', wave: 1 });
        TelemetryManager.flush(false);
        expect(TelemetryManager._buffer.length).toBe(0);
        expect(fetchCalls.length).toBe(1);
        const body = JSON.parse(fetchCalls[0].body);
        expect(body.instanceId).toBe('test-uuid-1234');
        expect(body.appVersion).toBe('1.0.0-test');
        expect(body.events.length).toBe(2);
        expect(body.events[0].event).toBe('run_start');
    });

    it('flush is a no-op when buffer is empty', () => {
        TelemetryManager.flush(false);
        expect(fetchCalls.length).toBe(0);
    });

    it('useBeacon=true routes through navigator.sendBeacon', () => {
        TelemetryManager.track('run_end', { hero: 'fire', outcome: 'death' });
        TelemetryManager.flush(true);
        expect(beaconCalls.length).toBe(1);
        expect(beaconCalls[0].url).toBe('http://localhost:3001/api/telemetry');
        expect(fetchCalls.length).toBe(0);
    });

    it('flush drops events if telemetry was disabled mid-buffer', () => {
        TelemetryManager.track('run_start', { hero: 'fire' });
        window.gameConfig.telemetryEnabled = false;
        TelemetryManager.flush(false);
        expect(TelemetryManager._buffer.length).toBe(0);
        expect(fetchCalls.length).toBe(0);
    });
});

describe('TelemetryManager client rate limit', () => {
    it('caps at _RATE_LIMIT events per minute', () => {
        const cap = TelemetryManager._RATE_LIMIT;
        // Disable auto-flush so all rate-limit decisions stack up here.
        const origThreshold = TelemetryManager._FLUSH_THRESHOLD;
        TelemetryManager._FLUSH_THRESHOLD = 1_000_000;
        try {
            for (let i = 0; i < cap + 20; i++) {
                TelemetryManager.track('level_up', { hero: 'fire', upgradePicked: 'damage' });
            }
            expect(TelemetryManager._buffer.length).toBe(cap);
            expect(TelemetryManager._dropped).toBe(20);
        } finally {
            TelemetryManager._FLUSH_THRESHOLD = origThreshold;
        }
    });
});
