const _BIOME_EMOJI = {
    fire: '🔥', water: '💧', ice: '❄️', plant: '🌿', metal: '⚙️',
    rock: '🪨', cloud: '☁️', chaos: '💥', earth: '🪨', void: '☯️',
};

class WorkshopPanel {
    constructor() {
        this._el        = null;
        this._tab       = 'popular'; // 'popular' | 'newest' | 'mine'
        this._maps      = [];
        this._offset    = 0;
        this._loading   = false;
        this._prevState = null;
        this._buildDOM();
    }

    // ── Public ────────────────────────────────────────────────────────────────

    open() {
        this._prevState = window.uiState || 'GLOBAL_LOBBY';
        if (window.setUIState) window.setUIState('WORKSHOP_PANEL');
        this._el.style.display = 'flex';
        this._tab    = 'popular';
        this._offset = 0;
        this._maps   = [];
        this._renderTabs();
        this._fetchAndRender();
    }

    close() {
        this._el.style.display = 'none';
        if (window.setUIState) window.setUIState(this._prevState || 'GLOBAL_LOBBY');
    }

    // ── DOM Construction ──────────────────────────────────────────────────────

    _buildDOM() {
        const el = document.createElement('div');
        el.id = 'workshop-panel';
        el.style.cssText = [
            'display:none', 'position:fixed', 'inset:0', 'z-index:9000',
            'background:rgba(0,0,0,0.82)', 'justify-content:center', 'align-items:center',
        ].join(';');

        el.innerHTML = `
<div style="background:#1a1a2e;border:2px solid #444;border-radius:12px;width:min(680px,95vw);max-height:85vh;
            display:flex;flex-direction:column;overflow:hidden;font-family:monospace;color:#eee">
  <div style="display:flex;align-items:center;justify-content:space-between;padding:14px 18px;border-bottom:1px solid #333;background:#151526">
    <span style="font-size:1.15em;font-weight:bold;letter-spacing:1px">🗺️ Map Workshop</span>
    <div style="display:flex;gap:8px;align-items:center">
      <span id="ws-auth-badge" style="font-size:0.75em;color:#888"></span>
      <button id="ws-close-btn" style="background:#444;border:none;color:#eee;padding:5px 12px;border-radius:6px;cursor:pointer;font-size:0.9em">✕ Close</button>
    </div>
  </div>
  <div id="ws-tabs" style="display:flex;gap:6px;padding:10px 16px;border-bottom:1px solid #333;background:#12122a"></div>
  <div id="ws-list" style="flex:1;overflow-y:auto;padding:10px 14px;display:flex;flex-direction:column;gap:8px"></div>
  <div style="padding:8px 14px;border-top:1px solid #333;display:flex;justify-content:center">
    <button id="ws-loadmore-btn" style="background:#2a2a4a;border:1px solid #555;color:#ccc;padding:6px 22px;border-radius:6px;cursor:pointer;display:none">Load more</button>
  </div>
</div>`;

        document.body.appendChild(el);
        this._el = el;

        el.querySelector('#ws-close-btn').onclick = () => this.close();
        el.querySelector('#ws-loadmore-btn').onclick = () => this._fetchAndRender(true);

        this._renderTabs();
        this._updateAuthBadge();
    }

    _renderTabs() {
        const tabs = [
            { id: 'popular', label: '⭐ Popular' },
            { id: 'newest',  label: '🕐 Newest'  },
            { id: 'mine',    label: '📁 My Maps'  },
        ];
        const container = this._el.querySelector('#ws-tabs');
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
            btn.onclick = () => { this._tab = id; this._offset = 0; this._maps = []; this._renderTabs(); this._fetchAndRender(); };
            container.appendChild(btn);
        });
    }

    _updateAuthBadge() {
        const badge = this._el.querySelector('#ws-auth-badge');
        if (!badge) return;
        const u = window.gameConfig?.account?.username;
        badge.textContent = u ? `● ${u}` : '(not logged in)';
        badge.style.color = u ? '#77ff88' : '#ff8888';
    }

    // ── Data Fetching ─────────────────────────────────────────────────────────

    _baseUrl() {
        if (typeof CloudSaveManager !== 'undefined') return CloudSaveManager._baseUrl();
        const host = window.gameConfig?.serverUrl || 'localhost:3001';
        const proto = (host.startsWith('localhost') || host.startsWith('127.')) ? 'http' : 'https';
        return `${proto}://${host}`;
    }

    _token() { return window.gameConfig?.account?.token || null; }

    async _fetchAndRender(append = false) {
        if (this._loading) return;
        this._loading = true;
        const list = this._el.querySelector('#ws-list');
        const loadMore = this._el.querySelector('#ws-loadmore-btn');

        if (!append) {
            list.innerHTML = '<div style="text-align:center;padding:20px;color:#888">Loading…</div>';
        }

        const sort  = this._tab === 'newest' ? 'newest' : 'popular';
        const mine  = this._tab === 'mine';
        const token = this._token();
        const params = new URLSearchParams({ sort, limit: '20', offset: String(this._offset) });
        if (mine) params.set('mine', '1');

        const headers = {};
        if (mine && token) headers['Authorization'] = `Bearer ${token}`;

        try {
            const r = await fetch(`${this._baseUrl()}/api/maps?${params}`, { headers });
            const j = await r.json();
            const maps = j.maps || [];

            if (!append) {
                list.innerHTML = '';
                this._maps = maps;
            } else {
                this._maps = this._maps.concat(maps);
            }
            this._offset += maps.length;

            if (!append && maps.length === 0) {
                list.innerHTML = '<div style="text-align:center;padding:30px;color:#666">' +
                    (mine ? 'No maps uploaded yet. Use the map editor to create one!' : 'No community maps yet. Be the first to upload!') +
                    '</div>';
                loadMore.style.display = 'none';
            } else {
                if (!append) list.innerHTML = '';
                maps.forEach(m => list.appendChild(this._buildMapCard(m)));
                loadMore.style.display = maps.length < 20 ? 'none' : 'block';
            }
        } catch (e) {
            if (!append) list.innerHTML = `<div style="text-align:center;padding:20px;color:#f88">Error: ${e.message}</div>`;
        }
        this._loading = false;
    }

    // ── Map Card ──────────────────────────────────────────────────────────────

    _buildMapCard(map) {
        const card = document.createElement('div');
        card.style.cssText = 'background:#222240;border:1px solid #383860;border-radius:8px;padding:10px 14px;display:flex;flex-direction:column;gap:6px';

        const biomeEmoji = _BIOME_EMOJI[map.biomeType] || '🗺️';
        const isMine = window.gameConfig?.account?.token && map.author === window.gameConfig?.account?.username;

        card.innerHTML = `
<div style="display:flex;align-items:center;justify-content:space-between;gap:8px">
  <div style="display:flex;align-items:center;gap:8px;min-width:0">
    <span style="font-size:1.3em">${biomeEmoji}</span>
    <div style="min-width:0">
      <div style="font-weight:bold;font-size:0.95em;white-space:nowrap;overflow:hidden;text-overflow:ellipsis" title="${this._esc(map.name)}">${this._esc(map.name)}</div>
      <div style="font-size:0.75em;color:#888">by ${this._esc(map.author)} · ${map.arenaWidth}×${map.arenaHeight}</div>
    </div>
  </div>
  <div style="display:flex;gap:6px;flex-shrink:0;align-items:center">
    <span style="font-size:0.78em;color:#aaa" title="Plays">👁 ${map.playCount}</span>
    <button class="ws-like-btn" data-id="${map.id}" data-likes="${map.likeCount}"
      style="background:#2a2a4a;border:1px solid #555;color:#ccc;padding:3px 9px;border-radius:5px;cursor:pointer;font-size:0.8em">
      ❤️ ${map.likeCount}
    </button>
    <button class="ws-lb-btn" data-id="${map.id}"
      style="background:#2a2a4a;border:1px solid #555;color:#ccc;padding:3px 9px;border-radius:5px;cursor:pointer;font-size:0.8em">
      🏆
    </button>
    ${isMine ? `<button class="ws-del-btn" data-id="${map.id}" style="background:#4a1010;border:1px solid #884444;color:#ffaaaa;padding:3px 9px;border-radius:5px;cursor:pointer;font-size:0.8em">🗑</button>` : ''}
    <button class="ws-play-btn" data-id="${map.id}"
      style="background:#1a4a1a;border:1px solid #44aa44;color:#aaffaa;padding:4px 14px;border-radius:6px;cursor:pointer;font-weight:bold;font-size:0.85em">
      ▶ Play
    </button>
  </div>
</div>
<div class="ws-lb-area" data-id="${map.id}" style="display:none;border-top:1px solid #333;padding-top:6px;margin-top:2px"></div>`;

        card.querySelector('.ws-play-btn').onclick = () => this._playMap(map.id, card);
        card.querySelector('.ws-like-btn').onclick = (e) => this._likeMap(map.id, e.currentTarget);
        card.querySelector('.ws-lb-btn').onclick   = () => this._toggleLeaderboard(map.id, card);
        const delBtn = card.querySelector('.ws-del-btn');
        if (delBtn) delBtn.onclick = () => this._deleteMap(map.id, card);

        return card;
    }

    // ── Actions ───────────────────────────────────────────────────────────────

    async _playMap(mapId, card) {
        const btn = card.querySelector('.ws-play-btn');
        btn.textContent = '…';
        btn.disabled = true;
        try {
            const r = await fetch(`${this._baseUrl()}/api/maps/${mapId}`);
            if (!r.ok) throw new Error(`HTTP ${r.status}`);
            const j = await r.json();
            window.pendingCustomMap   = j.mapData;
            window.currentCustomMapId = mapId;
        } catch (e) {
            btn.textContent = '▶ Play';
            btn.disabled = false;
            alert('Could not load map: ' + e.message);
            return;
        }
        // Tear down the global lobby, then start the workshop run
        const gl = window.globalLobbyScene;
        if (gl) {
            if (window.networkManager?.connected) window.networkManager.leaveGlobalLobby?.();
            gl._cleanup?.();
            window.globalLobbyScene = null;
        }
        this.close();
        if (typeof window.startGame === 'function') window.startGame('WORKSHOP');
    }

    async _likeMap(mapId, btn) {
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
        const area = card.querySelector(`.ws-lb-area[data-id="${mapId}"]`);
        if (area.style.display !== 'none') { area.style.display = 'none'; return; }
        area.style.display = 'block';
        area.innerHTML = '<span style="color:#888;font-size:0.8em">Loading scores…</span>';
        try {
            const r = await fetch(`${this._baseUrl()}/api/maps/${mapId}/leaderboard?limit=10`);
            const j = await r.json();
            const entries = j.entries || [];
            if (!entries.length) { area.innerHTML = '<span style="color:#666;font-size:0.8em">No scores yet. Be the first!</span>'; return; }
            area.innerHTML = entries.map((e, i) => {
                const hero  = (_BIOME_EMOJI[e.hero] || '?');
                const time  = e.timeSec ? `${Math.floor(e.timeSec/60)}:${String(e.timeSec%60).padStart(2,'0')}` : '—';
                return `<div style="display:flex;gap:8px;font-size:0.8em;color:#ccc;padding:2px 0">
                    <span style="color:#888;width:18px">#${i+1}</span>
                    <span style="flex:1">${this._esc(e.username)}</span>
                    <span>${hero} ${this._esc(e.hero)}</span>
                    <span>W${e.wave}</span>
                    <span style="color:#ffd700">${e.score.toLocaleString()}</span>
                    <span style="color:#888">${time}</span>
                </div>`;
            }).join('');
        } catch { area.innerHTML = '<span style="color:#f88;font-size:0.8em">Failed to load scores.</span>'; }
    }

    async _deleteMap(mapId, card) {
        if (!confirm('Delete this map? This cannot be undone.')) return;
        const token = this._token();
        if (!token) return;
        try {
            const r = await fetch(`${this._baseUrl()}/api/maps/${mapId}`, {
                method: 'DELETE',
                headers: { 'Authorization': `Bearer ${token}` },
            });
            if (r.ok) card.remove();
            else { const j = await r.json(); alert('Delete failed: ' + (j.error || r.status)); }
        } catch (e) { alert('Error: ' + e.message); }
    }

    _esc(str) {
        return String(str || '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
    }
}

window.WorkshopPanel = WorkshopPanel;
