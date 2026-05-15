/**
 * TelemetryManager (#98) — opt-in anonymous analytics.
 *
 * Mirrors CrashReporter shape. Buffers events in memory and POSTs in batches
 * to /api/telemetry. Honors three gates from gameConfig:
 *   - telemetryEnabled       : user has explicitly opted in
 *   - telemetryConsentSeen   : first-launch modal has been answered
 *   - telemetryInstanceId    : random UUID generated on first opt-in
 *
 * No PII is ever sent: no username, no account token, no IP. Field whitelist
 * is hardcoded; unknown fields on track() are dropped before send.
 *
 * Flush triggers (whichever fires first):
 *   - buffer reaches FLUSH_THRESHOLD events
 *   - FLUSH_INTERVAL_MS ticks elapse
 *   - tab visibility hides or pagehide fires (uses sendBeacon for reliability)
 */
class TelemetryManager {
    static _ALLOWED_EVENTS = ['run_start', 'wave_completed', 'level_up', 'run_end'];
    static _ALLOWED_FIELDS = ['hero', 'mode', 'biome', 'wave', 'timeSec', 'outcome', 'upgradePicked', 'deathSource', 'dailySeed'];

    static _BUFFER_MAX = 100;
    static _FLUSH_THRESHOLD = 20;
    static _FLUSH_INTERVAL_MS = 30_000;
    static _RATE_WINDOW_MS = 60_000;
    static _RATE_LIMIT = 60;

    static _buffer = [];
    static _dropped = 0;
    static _recent = []; // timestamps for client-side rate limit
    static _timer = null;
    static _installed = false;

    static install() {
        if (this._installed) return;
        this._installed = true;
        try {
            const flush = () => this.flush(true);
            // pagehide is more reliable than beforeunload on mobile / bfcache.
            window.addEventListener('pagehide', flush);
            window.addEventListener('beforeunload', flush);
            document.addEventListener('visibilitychange', () => {
                if (document.visibilityState === 'hidden') this.flush(true);
            });
        } catch (_) {}
        this._scheduleFlush();
    }

    static _scheduleFlush() {
        if (this._timer) return;
        this._timer = setInterval(() => this.flush(false), this._FLUSH_INTERVAL_MS);
    }

    static _enabled() {
        const cfg = (typeof window !== 'undefined') ? window.gameConfig : null;
        return !!(cfg && cfg.telemetryEnabled === true && cfg.telemetryConsentSeen === true);
    }

    static _instanceId() {
        const cfg = window.gameConfig;
        if (!cfg) return null;
        if (typeof cfg.telemetryInstanceId === 'string' && cfg.telemetryInstanceId.length) return cfg.telemetryInstanceId;
        // Generate lazily on first event sent after consent.
        const id = this._generateUUID();
        cfg.telemetryInstanceId = id;
        try { localStorage.setItem('5Freunde_Config', JSON.stringify(cfg)); } catch (_) {}
        return id;
    }

    static _generateUUID() {
        if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
            try { return crypto.randomUUID(); } catch (_) {}
        }
        // RFC4122-ish fallback
        return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, c => {
            const r = (Math.random() * 16) | 0;
            const v = c === 'x' ? r : (r & 0x3) | 0x8;
            return v.toString(16);
        });
    }

    static _baseUrl() {
        const u = window.gameConfig && window.gameConfig.serverUrl;
        if (!u) return null;
        const raw = String(u).trim().replace(/\/$/, '');
        if (raw.startsWith('http://') || raw.startsWith('https://')) return raw;
        return `http://${raw}:3001`;
    }

    static _rateLimited() {
        const now = Date.now();
        const cutoff = now - this._RATE_WINDOW_MS;
        // Drop entries older than the window (in-place shift).
        while (this._recent.length && this._recent[0] < cutoff) this._recent.shift();
        if (this._recent.length >= this._RATE_LIMIT) return true;
        this._recent.push(now);
        return false;
    }

    /**
     * Record an event. Drops silently if telemetry is disabled or rate limited.
     */
    static track(event, fields) {
        if (!this._enabled()) return;
        if (!this._ALLOWED_EVENTS.includes(event)) return;
        if (this._rateLimited()) { this._dropped++; return; }

        const cleaned = { event, ts: Date.now() };
        if (fields && typeof fields === 'object') {
            for (const k of this._ALLOWED_FIELDS) {
                if (fields[k] !== undefined && fields[k] !== null) cleaned[k] = fields[k];
            }
        }
        this._buffer.push(cleaned);
        if (this._buffer.length > this._BUFFER_MAX) this._buffer.shift();
        if (this._buffer.length >= this._FLUSH_THRESHOLD) this.flush(false);
    }

    /**
     * Send buffered events. `useBeacon=true` uses navigator.sendBeacon to
     * survive page unload; otherwise standard fetch.
     */
    static flush(useBeacon = false) {
        if (!this._buffer.length) return;
        if (!this._enabled()) { this._buffer.length = 0; return; }
        const url = this._baseUrl();
        if (!url) return;

        const events = this._buffer.splice(0, this._buffer.length);
        const payload = {
            instanceId: this._instanceId(),
            appVersion: (typeof APP_VERSION !== 'undefined') ? APP_VERSION : null,
            droppedSinceLastFlush: this._dropped,
            events,
        };
        this._dropped = 0;
        const body = JSON.stringify(payload);

        try {
            if (useBeacon && typeof navigator !== 'undefined' && typeof navigator.sendBeacon === 'function') {
                const blob = new Blob([body], { type: 'application/json' });
                navigator.sendBeacon(`${url}/api/telemetry`, blob);
                return;
            }
            fetch(`${url}/api/telemetry`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body,
                keepalive: true,
            }).catch(() => {}); // best-effort; never throw
        } catch (_) { /* noop */ }
    }
}

if (typeof window !== 'undefined') {
    try { TelemetryManager.install(); } catch (_) {}
    window.TelemetryManager = TelemetryManager;
}

export { TelemetryManager };
export default TelemetryManager;
