// Echos of Eternity — Maze of Time UI
// Canvas-based post-wave overlay: branching node map + hunting list.

class MazeUI {
    constructor() {
        this._overlay = null;
        this._canvas  = null;
        this._ctx     = null;
        this._sidebar = null;
        this._afterCb = null;

        // Map pan state
        this._panX     = 0;
        this._panY     = 0;
        this._dragging = false;
        this._dragStart = { x: 0, y: 0, px: 0, py: 0 };

        // Selection
        this._hoveredNode   = null;
        this._selectedNode  = null;
        this._availableIds  = [];
        this._state         = null;
        this._heroType      = 'time';

        // Map logical size
        this.MAP_W = 2620;
        this.MAP_H = 1100;
        this.NODE_R = 26;

        this._boundMouseMove = this._onMouseMove.bind(this);
        this._boundMouseDown = this._onMouseDown.bind(this);
        this._boundMouseUp   = this._onMouseUp.bind(this);
        this._boundClick     = this._onClick.bind(this);
        this._boundKeyDown   = this._onKeyDown.bind(this);
        this._animFrame      = null;
        this._frame          = 0;
    }

    // ─── Public API ───────────────────────────────────────────────────────────
    open(heroType, afterCb) {
        if (!this._overlay) this._buildDOM();

        this._afterCb  = afterCb;
        this._heroType = heroType || 'time';
        this._state    = MazeOfTime.initForRun();

        // Compute which nodes are available for selection
        this._availableIds = MAZE_NODES
            .filter(n => MazeOfTime.isAvailable(n.id, this._state, this._heroType))
            .map(n => n.id);

        this._selectedNode = null;
        this._hoveredNode  = null;

        // Reset pan to show start of map (left side)
        this._panX = 0;
        this._panY = 0;

        // Reveal overlay
        this._overlay.style.display = 'flex';
        const waveEl = document.getElementById('maze-wave-info');
        if (waveEl) waveEl.textContent =
            `WAVE ${typeof wave !== 'undefined' ? wave : '?'}  ·  ${this._state.completed.length} NODES COMPLETED`;
        this._updateConfirmBtn();
        this._renderSidebar();

        // Attach events
        this._canvas.addEventListener('mousemove', this._boundMouseMove);
        this._canvas.addEventListener('mousedown', this._boundMouseDown);
        this._canvas.addEventListener('mouseup',   this._boundMouseUp);
        this._canvas.addEventListener('click',     this._boundClick);
        window.addEventListener('keydown', this._boundKeyDown);

        this._startLoop();
    }

    close() {
        this._stopLoop();
        if (this._overlay) this._overlay.style.display = 'none';
        this._canvas.removeEventListener('mousemove', this._boundMouseMove);
        this._canvas.removeEventListener('mousedown', this._boundMouseDown);
        this._canvas.removeEventListener('mouseup',   this._boundMouseUp);
        this._canvas.removeEventListener('click',     this._boundClick);
        window.removeEventListener('keydown', this._boundKeyDown);
    }

    // ─── DOM Construction ─────────────────────────────────────────────────────
    _buildDOM() {
        const overlay = document.createElement('div');
        overlay.id = 'maze-overlay';
        overlay.style.cssText = `
            position: fixed; inset: 0; z-index: 9000;
            background: rgba(8, 6, 16, 0.97);
            display: none; flex-direction: column;
            font-family: 'Segoe UI', Arial, sans-serif;
            color: #e8d5a0;
        `;

        // ── Header ──
        const header = document.createElement('div');
        header.style.cssText = `
            display: flex; align-items: center; justify-content: space-between;
            padding: 10px 20px; border-bottom: 1px solid rgba(200,170,80,0.25);
            background: rgba(0,0,0,0.4); flex-shrink: 0;
        `;
        header.innerHTML = `
            <div style="display:flex; align-items:center; gap:14px;">
                <span style="font-size:26px;">⌛</span>
                <div>
                    <div style="font-size:17px; font-weight:700; letter-spacing:0.15em; color:#c8aa6e;">MAZE OF TIME</div>
                    <div style="font-size:10px; color:rgba(200,170,80,0.55); letter-spacing:0.1em;">SELECT YOUR NEXT PATH</div>
                </div>
            </div>
            <div id="maze-wave-info" style="font-size:12px; color:rgba(200,170,80,0.6); letter-spacing:0.08em;"></div>
        `;
        overlay.appendChild(header);

        // ── Body: canvas + sidebar ──
        const body = document.createElement('div');
        body.style.cssText = `display:flex; flex:1; overflow:hidden; min-height:0;`;

        // Canvas for node map
        const canvas = document.createElement('canvas');
        canvas.id = 'maze-canvas';
        canvas.style.cssText = `flex:1; min-width:0; cursor:grab; display:block;`;
        body.appendChild(canvas);

        // Sidebar: hunting list
        const sidebar = document.createElement('div');
        sidebar.id = 'maze-sidebar';
        sidebar.style.cssText = `
            width: 260px; flex-shrink: 0; border-left: 1px solid rgba(200,170,80,0.2);
            background: rgba(0,0,0,0.3); padding: 14px 12px; overflow-y: auto;
            display: flex; flex-direction: column; gap: 8px;
        `;
        body.appendChild(sidebar);

        overlay.appendChild(body);

        // ── Footer ──
        const footer = document.createElement('div');
        footer.style.cssText = `
            display: flex; align-items: center; justify-content: space-between;
            padding: 10px 20px; border-top: 1px solid rgba(200,170,80,0.18);
            background: rgba(0,0,0,0.4); flex-shrink: 0; gap: 12px;
        `;
        footer.innerHTML = `
            <div style="display:flex; flex-direction:column; gap:3px; flex:1;">
                <div id="maze-node-info" style="font-size:12px; color:rgba(200,170,80,0.7); line-height:1.5;"></div>
                <div style="font-size:9px; color:rgba(200,170,80,0.25); letter-spacing:0.06em;">
                    Drag to pan the map &nbsp;·&nbsp; Click a glowing node to select &nbsp;·&nbsp; Press Enter to confirm
                </div>
            </div>
            <button id="maze-confirm-btn" style="
                flex-shrink:0; padding:9px 28px; border:none; border-radius:4px;
                background:#c8aa6e; color:#1a1408; font-size:13px;
                font-weight:700; letter-spacing:0.12em; cursor:pointer;
                opacity:0.4; pointer-events:none; transition: opacity 0.2s;
            ">ENTER NODE ▶</button>
        `;
        overlay.appendChild(footer);

        document.body.appendChild(overlay);

        this._overlay  = overlay;
        this._canvas   = canvas;
        this._ctx      = canvas.getContext('2d');
        this._sidebar  = sidebar;

        document.getElementById('maze-confirm-btn').addEventListener('click', () => this._confirmSelection());
    }

    // ─── Main Render Loop ─────────────────────────────────────────────────────
    _startLoop() {
        const loop = () => {
            this._frame++;
            this._resizeCanvas();
            this._render();
            this._animFrame = requestAnimationFrame(loop);
        };
        this._animFrame = requestAnimationFrame(loop);
    }

    _stopLoop() {
        if (this._animFrame) { cancelAnimationFrame(this._animFrame); this._animFrame = null; }
    }

    _resizeCanvas() {
        const c = this._canvas;
        const rect = c.getBoundingClientRect();
        if (c.width !== Math.floor(rect.width) || c.height !== Math.floor(rect.height)) {
            c.width  = Math.floor(rect.width);
            c.height = Math.floor(rect.height);
        }
    }

    // ─── Rendering ────────────────────────────────────────────────────────────
    _render() {
        const ctx = this._ctx;
        const W = this._canvas.width;
        const H = this._canvas.height;

        ctx.clearRect(0, 0, W, H);

        // Background grid
        this._drawGrid(ctx, W, H);

        ctx.save();
        ctx.translate(-this._panX, -this._panY);

        // Draw edges first
        for (const node of MAZE_NODES) {
            if (!this._isVisible(node)) continue;
            for (const childId of node.children) {
                const child = MazeOfTime.getNodeById(childId);
                if (!child) continue;
                this._drawEdge(ctx, node, child);
            }
        }

        // Draw nodes
        for (const node of MAZE_NODES) {
            this._drawNode(ctx, node);
        }

        ctx.restore();

        // Update info bar
        this._updateInfoBar();
    }

    _drawGrid(ctx, W, H) {
        ctx.save();
        const gSize = 80;
        ctx.strokeStyle = 'rgba(200,170,80,0.04)';
        ctx.lineWidth = 1;
        const offX = this._panX % gSize;
        const offY = this._panY % gSize;
        for (let x = -offX; x < W; x += gSize) {
            ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, H); ctx.stroke();
        }
        for (let y = -offY; y < H; y += gSize) {
            ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(W, y); ctx.stroke();
        }
        ctx.restore();
    }

    _isVisible(node) {
        // Show if completed, discovered, or available
        return this._state.completed.includes(node.id) ||
               this._state.discovered.includes(node.id) ||
               this._availableIds.includes(node.id);
    }

    _drawEdge(ctx, from, to) {
        const fromVisible = this._isVisible(from);
        const toVisible   = this._isVisible(to);
        if (!fromVisible) return;

        const toCompleted  = this._state.completed.includes(to.id);
        const fromComplete = this._state.completed.includes(from.id);

        ctx.save();
        ctx.lineWidth = 2;

        if (fromComplete && toCompleted) {
            ctx.strokeStyle = 'rgba(200,170,80,0.5)';
        } else if (fromComplete && toVisible) {
            ctx.strokeStyle = 'rgba(200,170,80,0.25)';
            ctx.setLineDash([6, 8]);
        } else {
            ctx.strokeStyle = 'rgba(200,170,80,0.08)';
            ctx.setLineDash([4, 10]);
        }

        ctx.beginPath();
        ctx.moveTo(from.x, from.y);

        // Bezier curve for nicer look
        const cpX = (from.x + to.x) / 2;
        ctx.bezierCurveTo(cpX, from.y, cpX, to.y, to.x, to.y);
        ctx.stroke();
        ctx.restore();
    }

    _drawNode(ctx, node) {
        const { id, x, y, icon, title, type } = node;
        const R = this.NODE_R;

        const completed  = this._state.completed.includes(id);
        const discovered = this._state.discovered.includes(id) || completed;
        const available  = this._availableIds.includes(id);
        const selected   = this._selectedNode && this._selectedNode.id === id;
        const hovered    = this._hoveredNode && this._hoveredNode.id === id;
        const isFoe      = type === 'FORMIDABLE_FOE';
        const isFinale   = type === 'FINALE';
        const isOrigin   = id === 'origin';

        // Only draw if visible
        const visible = completed || discovered || available;
        if (!visible) return;

        // For undiscovered children (shown as faint ?)
        const hidden = !completed && !available && discovered && !this._state.completed.includes(id);

        ctx.save();

        // Glow pulse for available nodes
        if (available && !selected) {
            const pulse = 0.35 + 0.25 * Math.sin(this._frame * 0.06);
            ctx.shadowBlur = 18;
            ctx.shadowColor = isFoe ? `rgba(220,60,60,${pulse})` :
                              isFinale ? `rgba(255,215,0,${pulse + 0.2})` :
                              `rgba(200,170,80,${pulse})`;
        }

        if (selected) {
            ctx.shadowBlur = 28;
            ctx.shadowColor = 'rgba(100,180,255,0.9)';
        }

        // Node circle
        ctx.beginPath();
        ctx.arc(x, y, R, 0, Math.PI * 2);

        if (completed) {
            ctx.fillStyle = 'rgba(200,150,40,0.35)';
            ctx.fill();
            ctx.strokeStyle = '#c8aa6e';
            ctx.lineWidth = 2.5;
        } else if (selected) {
            ctx.fillStyle = 'rgba(80,150,255,0.3)';
            ctx.fill();
            ctx.strokeStyle = '#64b4ff';
            ctx.lineWidth = 3;
        } else if (available) {
            ctx.fillStyle = isFoe ? 'rgba(180,40,40,0.2)' :
                            isFinale ? 'rgba(200,150,40,0.2)' :
                            'rgba(200,170,80,0.12)';
            ctx.fill();
            ctx.strokeStyle = isFoe ? '#e05050' :
                              isFinale ? '#ffd700' :
                              'rgba(200,170,80,0.7)';
            ctx.lineWidth = 2;
        } else if (hidden) {
            ctx.fillStyle = 'rgba(200,170,80,0.05)';
            ctx.fill();
            ctx.strokeStyle = 'rgba(200,170,80,0.15)';
            ctx.lineWidth = 1;
        }
        ctx.stroke();
        ctx.shadowBlur = 0;

        // Hover ring
        if ((hovered && available) || (hovered && !completed)) {
            ctx.beginPath();
            ctx.arc(x, y, R + 5, 0, Math.PI * 2);
            ctx.strokeStyle = 'rgba(200,170,80,0.4)';
            ctx.lineWidth = 1;
            ctx.stroke();
        }

        // Checkmark for completed
        if (completed) {
            ctx.fillStyle = 'rgba(200,170,80,0.6)';
            ctx.font = `${R}px sans-serif`;
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            ctx.fillText('✓', x, y + 1);
        } else if (hidden) {
            // Unknown node
            ctx.fillStyle = 'rgba(200,170,80,0.25)';
            ctx.font = `bold ${R - 4}px monospace`;
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            ctx.fillText('?', x, y + 1);
        } else {
            // Show icon
            ctx.font = `${R - 2}px sans-serif`;
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            ctx.globalAlpha = available ? 1.0 : 0.5;
            ctx.fillText(icon, x, y + 1);
            ctx.globalAlpha = 1.0;
        }

        // Node title below
        if (!hidden) {
            ctx.font = `bold 9px monospace`;
            ctx.textAlign = 'center';
            ctx.textBaseline = 'top';
            const alpha = completed ? 0.55 : available ? 0.85 : 0.3;
            ctx.fillStyle = selected ? `rgba(100,180,255,${alpha + 0.1})` :
                            isFoe    ? `rgba(220,100,100,${alpha})` :
                            isFinale ? `rgba(255,215,0,${alpha})` :
                                       `rgba(200,170,80,${alpha})`;

            // Word-wrap title to 2 lines max
            const words = title.split(' ');
            let line1 = '', line2 = '';
            let half = Math.ceil(words.length / 2);
            line1 = words.slice(0, half).join(' ');
            line2 = words.slice(half).join(' ');

            ctx.fillText(line1, x, y + R + 4);
            if (line2) ctx.fillText(line2, x, y + R + 14);
        }

        ctx.restore();

        // Origin pulsing ring
        if (isOrigin && !completed) {
            const pulse = 0.3 + 0.2 * Math.sin(this._frame * 0.04);
            ctx.save();
            ctx.strokeStyle = `rgba(200,170,80,${pulse})`;
            ctx.lineWidth = 1;
            ctx.beginPath();
            ctx.arc(x, y, R + 10 + 5 * Math.sin(this._frame * 0.04), 0, Math.PI * 2);
            ctx.stroke();
            ctx.restore();
        }

        // Finale glow ring
        if (isFinale && available) {
            const pulse = 0.4 + 0.3 * Math.sin(this._frame * 0.08);
            ctx.save();
            ctx.strokeStyle = `rgba(255,215,0,${pulse})`;
            ctx.lineWidth = 1.5;
            ctx.setLineDash([4, 6]);
            ctx.beginPath();
            ctx.arc(x, y, R + 8, 0, Math.PI * 2);
            ctx.stroke();
            ctx.restore();
        }
    }

    // ─── Sidebar ──────────────────────────────────────────────────────────────
    _renderSidebar() {
        const sb = this._sidebar;
        sb.innerHTML = '';

        // Title
        const title = document.createElement('div');
        title.style.cssText = `font-size:12px; font-weight:700; letter-spacing:0.12em; color:#c8aa6e; margin-bottom:4px; padding-bottom:8px; border-bottom:1px solid rgba(200,170,80,0.2);`;
        title.textContent = '💀 HUNTING LIST';
        sb.appendChild(title);

        const hunting = MazeOfTime.getHuntingStatus();
        let defeatedCount = 0;

        for (const target of hunting) {
            if (target.defeated) defeatedCount++;
            const row = document.createElement('div');
            row.style.cssText = `
                display: flex; align-items: center; gap: 8px;
                padding: 7px 6px; border-radius: 3px;
                background: ${target.defeated ? 'rgba(200,150,40,0.08)' : 'rgba(0,0,0,0.2)'};
                border: 1px solid ${target.defeated ? 'rgba(200,150,40,0.3)' : target.available ? 'rgba(220,80,80,0.3)' : 'rgba(200,170,80,0.1)'};
                opacity: ${target.available || target.defeated ? '1' : '0.45'};
            `;
            row.innerHTML = `
                <span style="font-size:16px;">${target.defeated ? '✅' : target.icon}</span>
                <div style="flex:1; min-width:0;">
                    <div style="font-size:11px; font-weight:600; color:${target.defeated ? '#c8aa6e' : target.available ? '#e08080' : 'rgba(200,170,80,0.7)'};
                         white-space:nowrap; overflow:hidden; text-overflow:ellipsis;">${target.title}</div>
                    <div style="font-size:9px; color:rgba(200,170,80,0.45); margin-top:1px;">${target.defeated ? '⚔️ DEFEATED' : target.available ? '⚔️ AVAILABLE' : '? LOCKED'}</div>
                    ${target.defeated ? `<div style="font-size:9px; color:rgba(200,150,40,0.6); margin-top:1px;">${target.buff}</div>` : ''}
                </div>
            `;
            sb.appendChild(row);
        }

        // All hunting bonus
        const bonusEl = document.createElement('div');
        bonusEl.style.cssText = `
            margin-top:8px; padding:8px; border-radius:4px; text-align:center;
            background:rgba(200,150,40,0.05); border:1px dashed rgba(200,150,40,0.2);
            font-size:9px; color:rgba(200,170,80,0.45); letter-spacing:0.08em;
        `;
        bonusEl.innerHTML = `
            ${defeatedCount < 7 ? `${defeatedCount}/7 defeated` : '🏆 ALL DEFEATED'}<br>
            <span style="color:rgba(200,150,40,0.3);">Defeat all for Eternal Hunter bonus</span>
        `;
        sb.appendChild(bonusEl);

        // Progress
        const state = this._state;
        const totalNodes = MAZE_NODES.filter(n => n.strand !== 'HUNT').length;
        const completedNodes = MAZE_NODES.filter(n => n.strand !== 'HUNT' && state.completed.includes(n.id)).length;

        const progressEl = document.createElement('div');
        progressEl.style.cssText = `margin-top: auto; padding-top: 12px; border-top: 1px solid rgba(200,170,80,0.12);`;
        progressEl.innerHTML = `
            <div style="font-size:10px; color:rgba(200,170,80,0.5); letter-spacing:0.1em; margin-bottom:6px;">MAP PROGRESS</div>
            <div style="height:4px; background:rgba(200,170,80,0.1); border-radius:2px; overflow:hidden;">
                <div style="height:100%; width:${Math.round(completedNodes/totalNodes*100)}%; background:rgba(200,150,40,0.6); border-radius:2px;"></div>
            </div>
            <div style="font-size:9px; color:rgba(200,170,80,0.4); margin-top:4px; text-align:right;">${completedNodes}/${totalNodes} nodes</div>
        `;
        sb.appendChild(progressEl);
    }

    // ─── Info Bar ─────────────────────────────────────────────────────────────
    _updateInfoBar() {
        const infoEl = document.getElementById('maze-node-info');
        if (!infoEl) return;

        const node = this._hoveredNode || this._selectedNode;
        if (!node) {
            infoEl.textContent = 'Hover over a glowing node to learn more. Click to select your path.';
            return;
        }

        const available = this._availableIds.includes(node.id);
        const completed = this._state.completed.includes(node.id);
        const waveInfo  = node.waveStrength > 1.5 ? `⚠️ Difficulty: ${Math.round(node.waveStrength * 100)}% ` : '';

        if (completed) {
            infoEl.innerHTML = `<span style="color:#c8aa6e;">✓ ${node.title}</span> — <span style="opacity:0.6;">Completed</span>`;
        } else if (!available) {
            infoEl.innerHTML = `<span style="opacity:0.5;">❓ ${node.title}</span> — <span style="opacity:0.4;">Complete prerequisite nodes to unlock</span>`;
        } else {
            const typeLabel = { STORY:'NARRATIVE', COMBAT:'COMBAT', BOSS:'BOSS FIGHT', FORMIDABLE_FOE:'FORMIDABLE FOE', BIOME:'BIOME CHALLENGE',
                DISCOVERY:'DISCOVERY', CONVERGENCE:'CONVERGENCE', COMPANION:'COMPANION EVENT', FINALE:'FINALE', HIDDEN:'SECRET' }[node.type] || node.type;
            infoEl.innerHTML = `<span style="color:#c8aa6e;">${node.icon} ${node.title}</span>
                <span style="color:rgba(200,170,80,0.5); margin:0 8px;">•</span>
                <span style="opacity:0.7;">${typeLabel}</span>
                ${waveInfo ? `<span style="color:#e08080; margin-left:8px;">${waveInfo}</span>` : ''}
                ${this._selectedNode && this._selectedNode.id === node.id ? '<span style="color:#64b4ff; margin-left:10px;">▶ SELECTED — press Enter or click ENTER NODE</span>' : ''}`;
        }
    }

    _updateConfirmBtn() {
        const btn = document.getElementById('maze-confirm-btn');
        if (!btn) return;
        const canConfirm = this._selectedNode && this._availableIds.includes(this._selectedNode.id);
        btn.style.opacity = canConfirm ? '1' : '0.4';
        btn.style.pointerEvents = canConfirm ? 'auto' : 'none';
    }

    // ─── Event Handlers ───────────────────────────────────────────────────────
    _canvasToWorld(cx, cy) {
        return { x: cx + this._panX, y: cy + this._panY };
    }

    _hitTestNode(wx, wy) {
        for (const node of MAZE_NODES) {
            if (!this._isVisible(node)) continue;
            const dx = wx - node.x;
            const dy = wy - node.y;
            if (Math.sqrt(dx * dx + dy * dy) <= this.NODE_R + 8) return node;
        }
        return null;
    }

    _onMouseMove(e) {
        const rect = this._canvas.getBoundingClientRect();
        const cx = e.clientX - rect.left;
        const cy = e.clientY - rect.top;

        if (this._dragging) {
            this._panX = Math.max(0, Math.min(this.MAP_W - this._canvas.width,
                this._dragStart.px + (this._dragStart.x - cx)));
            this._panY = Math.max(0, Math.min(this.MAP_H - this._canvas.height,
                this._dragStart.py + (this._dragStart.y - cy)));
            this._canvas.style.cursor = 'grabbing';
            return;
        }

        const { x: wx, y: wy } = this._canvasToWorld(cx, cy);
        this._hoveredNode = this._hitTestNode(wx, wy);
        this._canvas.style.cursor = this._hoveredNode ? 'pointer' : 'grab';
    }

    _onMouseDown(e) {
        const rect = this._canvas.getBoundingClientRect();
        this._dragging  = true;
        this._dragStart = {
            x: e.clientX - rect.left,
            y: e.clientY - rect.top,
            px: this._panX,
            py: this._panY,
        };
        this._canvas.style.cursor = 'grabbing';
    }

    _onMouseUp() {
        this._dragging = false;
        this._canvas.style.cursor = 'grab';
    }

    _onClick(e) {
        // Ignore if we were dragging
        const rect = this._canvas.getBoundingClientRect();
        const cx = e.clientX - rect.left;
        const cy = e.clientY - rect.top;
        const { x: wx, y: wy } = this._canvasToWorld(cx, cy);

        const dx = Math.abs(cx - (this._dragStart.x || cx));
        const dy = Math.abs(cy - (this._dragStart.y || cy));
        if (dx > 5 || dy > 5) return; // was a drag

        const node = this._hitTestNode(wx, wy);
        if (node && this._availableIds.includes(node.id)) {
            this._selectedNode = node;
            this._updateConfirmBtn();
            this._renderSidebar();
        }
    }

    _onKeyDown(e) {
        if (e.key === 'Enter' && this._selectedNode) {
            this._confirmSelection();
        }
    }

    // ─── Confirmation ─────────────────────────────────────────────────────────
    _confirmSelection() {
        if (!this._selectedNode || !this._availableIds.includes(this._selectedNode.id)) return;
        const node = this._selectedNode;

        // Set active node for this run
        MazeOfTime.selectNode(node.id);
        MazeOfTime.clearEnemyPool();

        this.close();

        // Build story event that feeds into closeStory() → resumeWaveGeneration()
        // boss nodes use type='BOSS_FIGHT' so the existing boss spawn system works automatically
        const isBossNode = !!node.bossType;
        // Use the active player's hero type so arc labels render correctly.
        // hero swap in closeStory() is a no-op because player.type already matches.
        const heroKey = (typeof player !== 'undefined' && player)
            ? player.type.toUpperCase()
            : 'TIME';
        const storyEvent = {
            id:     `maze_${node.id}`,
            wave:   typeof wave !== 'undefined' ? wave + 1 : 1,
            hero:   heroKey,
            title:  node.title,
            text:   node.narrative || node.title,
            type:   isBossNode ? 'BOSS_FIGHT' : 'MAZE_NODE',
            icon:   node.icon,
            badges: [],
            data: {
                biome:       node.biome || 'time',
                bossId:      node.bossType || undefined,
                mazeNodeId:  node.id,
                mazeModifiers: node.modifiers,
            },
        };

        if (window.openStory) {
            window.currentStoryEvent = storyEvent;
            window.openStory(storyEvent);
        } else {
            // Fallback: proceed directly
            if (typeof advanceWave === 'function') advanceWave();
        }
    }
}

window.MazeUI = MazeUI;
window.mazeUI = new MazeUI();
