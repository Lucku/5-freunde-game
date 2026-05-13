const _BIOME_EMOJI_CMP = {
    fire: '🔥', water: '💧', ice: '❄️', plant: '🌿', metal: '⚙️',
    rock: '🪨', cloud: '☁️', chaos: '💥', earth: '🪨', void: '☯️',
};

class CustomMapsPanel {
    constructor() {
        this._el        = null;
        this._tab       = 'local';   // 'local' | 'popular' | 'newest'
        this._offset    = 0;
        this._loading   = false;
        this._prevState = null;
        this._buildDOM();
    }

    // ── Public ────────────────────────────────────────────────────────────────

    open() {
        this._prevState = window.uiState || 'MENU';
        if (window.setUIState) window.setUIState('CUSTOM_MAPS');
        this._el.style.display = 'flex';
        this._tab    = 'local';
        this._offset = 0;
        this._renderTabs();
        this._updateAuthBadge();
        this._fetchAndRender();
    }

    close() {
        this._el.style.display = 'none';
        if (window.setUIState) window.setUIState(this._prevState || 'MENU');
    }

    // ── DOM ───────────────────────────────────────────────────────────────────

    _buildDOM() {
        const el = document.createElement('div');
        el.id = 'custom-maps-panel';
        el.style.cssText = [
            'display:none', 'position:fixed', 'inset:0', 'z-index:9000',
            'background:rgba(0,0,0,0.85)', 'justify-content:center', 'align-items:center',
        ].join(';');

        el.innerHTML = `
<div style="background:#1a1a2e;border:2px solid #444;border-radius:12px;width:min(720px,96vw);
            max-height:88vh;display:flex;flex-direction:column;overflow:hidden;
            font-family:monospace;color:#eee">
  <div style="display:flex;align-items:center;justify-content:space-between;
              padding:14px 18px;border-bottom:1px solid #333;background:#151526">
    <span style="font-size:1.15em;font-weight:bold;letter-spacing:1px">🗺️ Custom Maps</span>
    <div style="display:flex;gap:8px;align-items:center">
      <span id="cmp-auth-badge" style="font-size:0.75em;color:#888"></span>
      <button id="cmp-close-btn"
        style="background:#444;border:none;color:#eee;padding:5px 12px;border-radius:6px;
               cursor:pointer;font-size:0.9em">✕ Close</button>
    </div>
  </div>
  <div id="cmp-tabs" style="display:flex;gap:6px;padding:10px 16px;border-bottom:1px solid #333;
                             background:#12122a"></div>
  <div id="cmp-list" style="flex:1;overflow-y:auto;padding:10px 14px;
                             display:flex;flex-direction:column;gap:8px"></div>
  <div style="padding:8px 14px;border-top:1px solid #333;display:flex;justify-content:center">
    <button id="cmp-loadmore-btn"
      style="background:#2a2a4a;border:1px solid #555;color:#ccc;padding:6px 22px;
             border-radius:6px;cursor:pointer;display:none">Load more</button>
  </div>
  <div class="gamepad-hint" style="text-align:center;padding:4px 0 8px">🎮 Navigate: D-Pad · Confirm: A · Close: B</div>
</div>`;

        document.body.appendChild(el);
        this._el = el;

        el.querySelector('#cmp-close-btn').onclick   = () => this.close();
        el.querySelector('#cmp-loadmore-btn').onclick = () => this._fetchAndRender(true);

        this._renderTabs();
    }

    _renderTabs() {
        const tabs = [
            { id: 'local',   label: '💾 My Maps'  },
            { id: 'popular', label: '⭐ Community' },
            { id: 'newest',  label: '🕐 Newest'   },
        ];
        const container = this._el.querySelector('#cmp-tabs');
        container.innerHTML = '';
        tabs.forEach(({ id, label }) => {
            const btn = document.createElement('button');
            btn.textContent = label;
            const active = this._tab === id;
            btn.style.cssText = [
                `background:${active ? '#3a3a6a' : '#222240'}`,
                `border:1px solid ${active ? '#6688cc' : '#444'}`,
                'color:#eee', 'padding:5px 14px', 'border-radius:6px',
                'cursor:pointer', 'font-size:0.85em', 'font-family:monospace',
            ].join(';');
            btn.onclick = () => {
                this._tab = id; this._offset = 0;
                this._renderTabs(); this._fetchAndRender();
            };
            container.appendChild(btn);
        });
    }

    _updateAuthBadge() {
        const badge = this._el.querySelector('#cmp-auth-badge');
        if (!badge) return;
        const u = window.gameConfig?.account?.username;
        badge.textContent = u ? `● ${u}` : '(not logged in)';
        badge.style.color = u ? '#77ff88' : '#ff8888';
    }

    // ── Data ──────────────────────────────────────────────────────────────────

    _baseUrl() {
        if (typeof CloudSaveManager !== 'undefined') return CloudSaveManager._baseUrl();
        const host  = window.gameConfig?.serverUrl || 'localhost:3001';
        const proto = (host.startsWith('localhost') || host.startsWith('127.')) ? 'http' : 'https';
        return `${proto}://${host}`;
    }

    _token() { return window.gameConfig?.account?.token || null; }

    async _fetchAndRender(append = false) {
        if (this._loading) return;
        this._loading = true;
        const list     = this._el.querySelector('#cmp-list');
        const loadMore = this._el.querySelector('#cmp-loadmore-btn');

        if (!append) list.innerHTML = '<div style="text-align:center;padding:20px;color:#888">Loading…</div>';

        if (this._tab === 'local') {
            // ── Local maps from user data directory ───────────────────────────
            const mm = window.MapManager;
            if (!mm || !mm.isAvailable()) {
                list.innerHTML = '<div style="text-align:center;padding:24px;color:#888">' +
                    'Local maps require the desktop app.<br>' +
                    '<small style="color:#666">Use the Map Editor to create and save maps.</small></div>';
                loadMore.style.display = 'none';
                this._loading = false;
                return;
            }
            const maps = mm.listMaps();
            list.innerHTML = '';
            if (!maps.length) {
                list.innerHTML = '<div style="text-align:center;padding:30px;color:#666">' +
                    'No saved maps yet.<br>' +
                    '<small>Create one in the Map Editor and click Save.</small></div>';
            } else {
                maps.forEach(m => list.appendChild(this._buildLocalCard(m)));
            }
            loadMore.style.display = 'none';
        } else {
            // ── Community maps from server ────────────────────────────────────
            const sort   = this._tab === 'newest' ? 'newest' : 'popular';
            const params = new URLSearchParams({ sort, limit: '20', offset: String(this._offset) });
            try {
                const r    = await fetch(`${this._baseUrl()}/api/maps?${params}`);
                const j    = await r.json();
                const maps = j.maps || [];
                if (!append) list.innerHTML = '';
                this._offset += maps.length;
                if (!append && !maps.length) {
                    list.innerHTML = '<div style="text-align:center;padding:30px;color:#666">No community maps yet.</div>';
                } else {
                    maps.forEach(m => list.appendChild(this._buildServerCard(m)));
                }
                loadMore.style.display = maps.length < 20 ? 'none' : 'block';
            } catch (e) {
                if (!append) list.innerHTML = `<div style="text-align:center;padding:20px;color:#f88">Error: ${e.message}</div>`;
            }
        }
        this._loading = false;
    }

    // ── Local card ────────────────────────────────────────────────────────────

    _buildLocalCard(mapEntry) {
        const card = document.createElement('div');
        card.style.cssText = 'background:#222240;border:1px solid #383860;border-radius:8px;padding:10px 14px;display:flex;flex-direction:column;gap:6px';

        // Load the full map data for display details
        const data   = window.MapManager.loadMap(mapEntry.fileName);
        const wc     = data?.waveConfig;
        const biome  = data?.biomeType || 'fire';
        const emoji  = _BIOME_EMOJI_CMP[biome] || '🗺️';
        const waves  = wc?.waveCount ? `${wc.waveCount} waves` : 'unlimited';
        const epw    = wc?.enemiesPerWave ?? 30;
        const pool   = wc?.enemyPool?.length ?? 6;

        card.innerHTML = `
<div style="display:flex;align-items:center;justify-content:space-between;gap:8px">
  <div style="display:flex;align-items:center;gap:8px;min-width:0">
    <span style="font-size:1.3em">${emoji}</span>
    <div style="min-width:0">
      <div style="font-weight:bold;font-size:0.95em;white-space:nowrap;overflow:hidden;text-overflow:ellipsis"
           title="${this._esc(mapEntry.name)}">${this._esc(mapEntry.name)}</div>
      <div style="font-size:0.75em;color:#888">${waves} · ${epw} enemies/wave · ${pool} enemy types</div>
    </div>
  </div>
  <div style="display:flex;gap:6px;flex-shrink:0;align-items:center">
    <button class="cmp-upload-btn" style="background:#2a2a4a;border:1px solid #555;color:#ccc;
      padding:3px 9px;border-radius:5px;cursor:pointer;font-size:0.8em">⬆ Upload</button>
    <button class="cmp-del-btn" style="background:#4a1010;border:1px solid #884444;color:#ffaaaa;
      padding:3px 9px;border-radius:5px;cursor:pointer;font-size:0.8em">🗑</button>
    <button class="cmp-play-btn" style="background:#1a4a1a;border:1px solid #44aa44;color:#aaffaa;
      padding:4px 14px;border-radius:6px;cursor:pointer;font-weight:bold;font-size:0.85em">▶ Play</button>
  </div>
</div>`;

        card.querySelector('.cmp-play-btn').onclick   = () => this._playLocal(mapEntry.fileName, card);
        card.querySelector('.cmp-del-btn').onclick    = () => this._deleteLocal(mapEntry.fileName, card);
        card.querySelector('.cmp-upload-btn').onclick = () => this._uploadLocal(mapEntry.fileName, card);
        return card;
    }

    // ── Server card ───────────────────────────────────────────────────────────

    _buildServerCard(map) {
        const card = document.createElement('div');
        card.style.cssText = 'background:#222240;border:1px solid #383860;border-radius:8px;padding:10px 14px;display:flex;flex-direction:column;gap:6px';
        const emoji = _BIOME_EMOJI_CMP[map.biomeType] || '🗺️';

        card.innerHTML = `
<div style="display:flex;align-items:center;justify-content:space-between;gap:8px">
  <div style="display:flex;align-items:center;gap:8px;min-width:0">
    <span style="font-size:1.3em">${emoji}</span>
    <div style="min-width:0">
      <div style="font-weight:bold;font-size:0.95em;white-space:nowrap;overflow:hidden;text-overflow:ellipsis"
           title="${this._esc(map.name)}">${this._esc(map.name)}</div>
      <div style="font-size:0.75em;color:#888">by ${this._esc(map.author)}</div>
    </div>
  </div>
  <div style="display:flex;gap:6px;flex-shrink:0;align-items:center">
    <span style="font-size:0.78em;color:#aaa">👁 ${map.playCount}</span>
    <button class="cmp-like-btn" data-likes="${map.likeCount}"
      style="background:#2a2a4a;border:1px solid #555;color:#ccc;
             padding:3px 9px;border-radius:5px;cursor:pointer;font-size:0.8em">❤️ ${map.likeCount}</button>
    <button class="cmp-lb-btn"
      style="background:#2a2a4a;border:1px solid #555;color:#ccc;
             padding:3px 9px;border-radius:5px;cursor:pointer;font-size:0.8em">🏆</button>
    <button class="cmp-play-btn"
      style="background:#1a4a1a;border:1px solid #44aa44;color:#aaffaa;
             padding:4px 14px;border-radius:6px;cursor:pointer;font-weight:bold;font-size:0.85em">▶ Play</button>
  </div>
</div>
<div class="cmp-lb-area" style="display:none;border-top:1px solid #333;padding-top:6px;margin-top:2px"></div>`;

        card.querySelector('.cmp-play-btn').onclick = () => this._playServer(map.id, card);
        card.querySelector('.cmp-like-btn').onclick = e => this._likeServer(map.id, e.currentTarget);
        card.querySelector('.cmp-lb-btn').onclick   = () => this._toggleLeaderboard(map.id, card);
        return card;
    }

    // ── Actions: local ────────────────────────────────────────────────────────

    _playLocal(fileName, card) {
        const data = window.MapManager?.loadMap(fileName);
        if (!data) { alert('Could not read map file.'); return; }
        window.pendingCustomMap   = data;
        window.currentCustomMapId = null;
        this.close();
        if (typeof window.startGame === 'function') window.startGame('WORKSHOP');
    }

    async _uploadLocal(fileName, card) {
        const token = this._token();
        if (!token) { alert('Log in first to upload maps.'); return; }
        const data = window.MapManager?.loadMap(fileName);
        if (!data) { alert('Could not read map file.'); return; }
        const btn = card.querySelector('.cmp-upload-btn');
        btn.textContent = '…';
        btn.disabled = true;
        try {
            const r = await fetch(`${this._baseUrl()}/api/maps`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
                body: JSON.stringify(data),
            });
            const j = await r.json();
            if (j.ok) { btn.textContent = '✓ Uploaded'; btn.style.color = '#77ff88'; }
            else { btn.textContent = '⬆ Upload'; btn.disabled = false; alert('Upload failed: ' + (j.error || r.status)); }
        } catch (e) { btn.textContent = '⬆ Upload'; btn.disabled = false; alert('Error: ' + e.message); }
    }

    _deleteLocal(fileName, card) {
        if (!confirm(`Delete "${fileName.replace(/\.json$/, '')}"? This cannot be undone.`)) return;
        const ok = window.MapManager?.deleteMap(fileName);
        if (ok) card.remove();
        else alert('Delete failed.');
    }

    // ── Actions: server ───────────────────────────────────────────────────────

    async _playServer(mapId, card) {
        const btn = card.querySelector('.cmp-play-btn');
        btn.textContent = '…'; btn.disabled = true;
        try {
            const r = await fetch(`${this._baseUrl()}/api/maps/${mapId}`);
            if (!r.ok) throw new Error(`HTTP ${r.status}`);
            const j = await r.json();
            window.pendingCustomMap   = j.mapData;
            window.currentCustomMapId = mapId;
        } catch (e) {
            btn.textContent = '▶ Play'; btn.disabled = false;
            alert('Could not load map: ' + e.message);
            return;
        }
        this.close();
        if (typeof window.startGame === 'function') window.startGame('WORKSHOP');
    }

    async _likeServer(mapId, btn) {
        const token = this._token();
        if (!token) { alert('Log in to like maps.'); return; }
        btn.disabled = true;
        try {
            const r = await fetch(`${this._baseUrl()}/api/maps/${mapId}/like`, {
                method: 'POST',
                headers: { 'Authorization': `Bearer ${token}` },
            });
            const j = await r.json();
            btn.textContent = `${j.liked ? '❤️' : '🤍'} ${j.likeCount}`;
            btn.style.borderColor = j.liked ? '#cc4444' : '#555';
        } catch { /* ignore */ }
        btn.disabled = false;
    }

    async _toggleLeaderboard(mapId, card) {
        const area = card.querySelector('.cmp-lb-area');
        if (area.style.display !== 'none') { area.style.display = 'none'; return; }
        area.style.display = 'block';
        area.innerHTML = '<span style="color:#888;font-size:0.8em">Loading scores…</span>';
        try {
            const r    = await fetch(`${this._baseUrl()}/api/maps/${mapId}/leaderboard?limit=10`);
            const j    = await r.json();
            const rows = j.entries || [];
            if (!rows.length) { area.innerHTML = '<span style="color:#666;font-size:0.8em">No scores yet.</span>'; return; }
            area.innerHTML = rows.map((e, i) => {
                const time = e.timeSec ? `${Math.floor(e.timeSec / 60)}:${String(e.timeSec % 60).padStart(2, '0')}` : '—';
                return `<div style="display:flex;gap:8px;font-size:0.8em;color:#ccc;padding:2px 0">
                    <span style="color:#888;width:18px">#${i + 1}</span>
                    <span style="flex:1">${this._esc(e.username)}</span>
                    <span>${this._esc(e.hero)}</span>
                    <span>W${e.wave}</span>
                    <span style="color:#ffd700">${e.score.toLocaleString()}</span>
                    <span style="color:#888">${time}</span>
                </div>`;
            }).join('');
        } catch { area.innerHTML = '<span style="color:#f88;font-size:0.8em">Failed to load scores.</span>'; }
    }

    _esc(str) {
        return String(str || '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
    }
}

window.customMapsPanel = new CustomMapsPanel();
window.openCustomMaps  = () => window.customMapsPanel.open();
window.CustomMapsPanel = CustomMapsPanel;
