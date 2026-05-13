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
        this._events     = [];
        this._lastFetch  = 0;
        this._TTL        = 5 * 60 * 1000; // re-poll at most every 5 minutes
    }

    _baseUrl() {
        const raw = (window.gameConfig?.serverUrl || '').trim();
        if (!raw) return null;
        if (raw.startsWith('http://') || raw.startsWith('https://')) return raw.replace(/\/$/, '');
        return `http://${raw}:3001`;
    }

    async poll() {
        const now = Date.now();
        if (now - this._lastFetch < this._TTL) return;
        this._lastFetch = now;
        const base = this._baseUrl();
        if (!base) return;
        try {
            const res = await fetch(`${base}/api/events`);
            if (res.ok) {
                const data = await res.json();
                this._events = data.events || [];
            }
        } catch (_) {}
    }

    getActiveEvents() {
        return this._events;
    }

    getXpMultiplier() {
        let mult = 1;
        for (const ev of this._events) {
            if (ev.type === 'xp_boost') mult *= ev.multiplier;
        }
        return mult;
    }

    getScoreMultiplier() {
        let mult = 1;
        for (const ev of this._events) {
            if (ev.type === 'score_boost') mult *= ev.multiplier;
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
