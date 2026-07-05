/**
 * WorldEventsManager — polls /api/events and exposes active multipliers.
 *
 * Usage:
 *   await window.worldEvents.poll()       // fetch (auto-throttled to 5 min)
 *   window.worldEvents.getXpMultiplier()  // e.g. 2 during a 2× XP event
 *   window.worldEvents.getBanner()        // human-readable label or null
 */
class WorldEventsManager {
    constructor() {
        this._events      = [];
        this._lastFetch   = 0;             // last SUCCESSFUL fetch
        this._lastAttempt = 0;             // last attempt (success or failure)
        this._TTL         = 5 * 60 * 1000; // re-poll at most every 5 minutes on success
        this._RETRY_TTL   = 30 * 1000;     // but retry every 30s after a failure
    }

    _baseUrl() {
        const raw = (window.gameConfig?.serverUrl || '').trim();
        if (!raw) return null;
        if (raw.startsWith('http://') || raw.startsWith('https://')) return raw.replace(/\/$/, '');
        return `http://${raw}:3001`;
    }

    async poll() {
        const now = Date.now();
        // Throttle successes to _TTL, but only lock out retries for _RETRY_TTL —
        // a failed fetch previously stamped _lastFetch and blocked retry for the
        // full 5 minutes.
        if (now - this._lastFetch < this._TTL) return;
        if (now - this._lastAttempt < this._RETRY_TTL) return;
        this._lastAttempt = now;
        const base = this._baseUrl();
        if (!base) return;
        try {
            const res = await fetch(`${base}/api/events`);
            if (res.ok) {
                const data = await res.json();
                this._events = data.events || [];
                this._lastFetch = now; // stamp success only
            }
        } catch (_) {}
    }

    getActiveEvents() {
        return this._events;
    }

    getXpMultiplier() {
        let mult = 1;
        for (const ev of this._events) {
            if (ev.type === 'xp_boost') mult *= (Number(ev.multiplier) || 1);
        }
        return mult;
    }

    getScoreMultiplier() {
        let mult = 1;
        for (const ev of this._events) {
            if (ev.type === 'score_boost') mult *= (Number(ev.multiplier) || 1);
        }
        return mult;
    }

    getBanner() {
        if (!this._events.length) return null;
        return this._events[0].label;
    }
}

window.worldEvents = new WorldEventsManager();

export { WorldEventsManager };
export default window.worldEvents;
