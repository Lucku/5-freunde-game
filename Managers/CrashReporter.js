/**
 * CrashReporter — best-effort client-side crash telemetry.
 *
 * - Captures window.onerror, unhandledrejection, and a ring buffer of recent
 *   console.warn / console.error breadcrumbs.
 * - Forwards reports to <serverUrl>/api/crash. No PII: username is stripped;
 *   only run-level context (hero, wave, mode, app version, platform) is sent.
 * - Opt-out via gameConfig.crashReportsEnabled = false.
 * - Coalesces duplicate stacks (1 send per stack per minute) so a tight error
 *   loop doesn't hammer the endpoint.
 *
 * Existing window.onerror handlers (Electron log-to-disk in game.js) are not
 * overwritten — both run in sequence.
 */
class CrashReporter {
    static _BREAD_MAX = 30;
    static _DEDUPE_WINDOW_MS = 60_000;
    static _MAX_PAYLOAD_BYTES = 16 * 1024;

    static _breadcrumbs = [];
    static _recentStacks = new Map(); // stackHash → firstSentAt
    static _installed = false;

    static install() {
        if (this._installed) return;
        this._installed = true;
        this._hookConsole();

        const prevErr = window.onerror;
        window.onerror = (message, source, lineno, colno, error) => {
            try { this.report({ kind: 'uncaught', message: String(message), source, lineno, colno, stack: error && error.stack }); } catch (_) {}
            if (typeof prevErr === 'function') return prevErr.apply(this, arguments);
            return false;
        };

        const prevRej = window.onunhandledrejection;
        window.onunhandledrejection = (event) => {
            try {
                const reason = event && event.reason;
                this.report({ kind: 'unhandled_rejection', message: String(reason && reason.message || reason), stack: reason && reason.stack });
            } catch (_) {}
            if (typeof prevRej === 'function') return prevRej.call(this, event);
        };
    }

    static _hookConsole() {
        const _warn = console.warn.bind(console);
        const _err  = console.error.bind(console);
        console.warn = (...args) => { this._pushBreadcrumb('warn', args); _warn(...args); };
        console.error = (...args) => { this._pushBreadcrumb('error', args); _err(...args); };
    }

    static _pushBreadcrumb(level, args) {
        try {
            const txt = args.map(a => {
                if (a instanceof Error) return a.stack || a.message;
                if (typeof a === 'object') {
                    try { return JSON.stringify(a); } catch { return String(a); }
                }
                return String(a);
            }).join(' ');
            this._breadcrumbs.push({ t: Date.now(), level, msg: txt.slice(0, 500) });
            if (this._breadcrumbs.length > this._BREAD_MAX) this._breadcrumbs.shift();
        } catch (_) { /* never let a breadcrumb error reach the user */ }
    }

    static _hashStack(s) {
        const str = String(s || '');
        let h = 0;
        for (let i = 0; i < str.length; i++) h = ((h * 31) + str.charCodeAt(i)) | 0;
        return h;
    }

    static _baseUrl() {
        const u = window.gameConfig && window.gameConfig.serverUrl;
        return u ? u.replace(/\/$/, '') : null;
    }

    static report(info) {
        if (window.gameConfig && window.gameConfig.crashReportsEnabled === false) return;
        const url = this._baseUrl();
        if (!url) return;

        // Dedupe by stack within rolling window
        const sigHash = this._hashStack(info.stack || info.message);
        const now = Date.now();
        const lastSent = this._recentStacks.get(sigHash) || 0;
        if (now - lastSent < this._DEDUPE_WINDOW_MS) return;
        this._recentStacks.set(sigHash, now);
        // Cap dedupe map size
        if (this._recentStacks.size > 200) {
            const cutoff = now - this._DEDUPE_WINDOW_MS * 5;
            for (const [k, t] of this._recentStacks) if (t < cutoff) this._recentStacks.delete(k);
        }

        const payload = {
            kind:    info.kind || 'manual',
            message: (info.message || '').slice(0, 1000),
            stack:   (info.stack   || '').slice(0, 4000),
            source:  info.source || null,
            lineno:  info.lineno || null,
            colno:   info.colno  || null,
            breadcrumbs: this._breadcrumbs.slice(-20),
            context: this._collectContext(),
            ts: now,
        };

        // Hard cap to avoid huge POSTs on infinite-loop-style stacks
        let body = JSON.stringify(payload);
        if (body.length > this._MAX_PAYLOAD_BYTES) {
            payload.breadcrumbs = payload.breadcrumbs.slice(-5);
            payload.stack = payload.stack.slice(0, 2000);
            body = JSON.stringify(payload);
        }

        try {
            fetch(`${url}/api/crash`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body,
                keepalive: true, // survives page unload (best-effort)
            }).catch(() => {}); // never throw — we're already in an error path
        } catch (_) { /* noop */ }
    }

    static _collectContext() {
        const ctx = {
            version:   (typeof APP_VERSION !== 'undefined') ? APP_VERSION : null,
            platform:  navigator && navigator.platform,
            userAgent: navigator && navigator.userAgent && navigator.userAgent.slice(0, 200),
            screen:    (window.canvas) ? { w: window.canvas.width, h: window.canvas.height } : null,
            electron:  typeof process !== 'undefined' && process.versions && process.versions.electron || null,
        };
        try {
            // Best-effort run context — guarded since these globals may be undefined early in load
            if (typeof wave !== 'undefined') ctx.wave = wave;
            if (typeof player !== 'undefined' && player) ctx.hero = player.type;
            if (typeof currentBiomeType !== 'undefined') ctx.biome = currentBiomeType;
            if (typeof isOnlineMode !== 'undefined' && isOnlineMode) ctx.online = true;
        } catch (_) { /* noop */ }
        return ctx;
    }
}

if (typeof window !== 'undefined') {
    window.CrashReporter = CrashReporter;
    // Install on script load so we capture errors from later boot stages too.
    try { CrashReporter.install(); } catch (_) {}
}
