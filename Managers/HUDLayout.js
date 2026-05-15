// HUDLayout.js — #169 Configurable HUD layout
//
// Lets the player reposition combo, minimap, and the bottom player HUD
// (HP/XP/MELEE bars + buffs + special). Layout is stored in
// `gameConfig.hudLayout` as `{ <id>: { left, top } }` in CSS pixels and
// applied as inline styles. Empty entry = use CSS default.
//
// Public API (also exposed on window for legacy callers):
//   HUDLayout.apply()         — re-apply stored layout to the DOM
//   HUDLayout.enterEditMode() — show drag overlay
//   HUDLayout.exitEditMode(save=true) — exit, optionally saving
//   HUDLayout.reset()         — clear all overrides

const EDITABLE_IDS = ['combo', 'minimap', 'bottomUi', 'p2Hud'];

// Map data-hud-id → element id in the DOM.
const ID_MAP = {
    combo:    'combo-display',
    minimap:  'minimap',
    bottomUi: 'bottom-ui',
    p2Hud:    'p2-hud'
};

function _el(hudId) {
    return document.getElementById(ID_MAP[hudId]);
}

function _allEditableEls() {
    return EDITABLE_IDS.map(_el).filter(Boolean);
}

// Snapshot each element's *original* inline layout style so Reset can restore
// to the as-authored defaults. Some elements (notably #minimap) get their
// position from HTML `style="..."`, which we must preserve.
const _defaults = {};
function _captureDefaults() {
    for (const id of EDITABLE_IDS) {
        if (_defaults[id]) continue;
        const el = _el(id);
        if (!el) continue;
        _defaults[id] = {
            position: el.style.position || '',
            left:     el.style.left     || '',
            top:      el.style.top      || '',
            right:    el.style.right    || '',
            bottom:   el.style.bottom   || ''
        };
    }
}

function _clearInline(el, hudId) {
    const d = _defaults[hudId];
    if (d) {
        el.style.position = d.position;
        el.style.left   = d.left;
        el.style.top    = d.top;
        el.style.right  = d.right;
        el.style.bottom = d.bottom;
    } else {
        el.style.position = '';
        el.style.left = '';
        el.style.top = '';
        el.style.right = '';
        el.style.bottom = '';
    }
}

function apply() {
    _captureDefaults();
    const layout = (window.gameConfig && window.gameConfig.hudLayout) || {};
    for (const id of EDITABLE_IDS) {
        const el = _el(id);
        if (!el) continue;
        const ov = layout[id];
        if (!ov || typeof ov.left !== 'number' || typeof ov.top !== 'number') {
            _clearInline(el, id);
            continue;
        }
        // Always pin via left/top when user has overridden; force position:fixed
        // so coords are viewport-relative regardless of original anchor
        // (bottom-ui defaults to flex flow inside #ui-layer).
        el.style.position = 'fixed';
        el.style.left = `${ov.left}px`;
        el.style.top  = `${ov.top}px`;
        el.style.right = '';
        el.style.bottom = '';
    }
}

function reset() {
    _captureDefaults();
    if (!window.gameConfig) return;
    window.gameConfig.hudLayout = {};
    if (typeof window.saveConfig === 'function') window.saveConfig();
    for (const id of EDITABLE_IDS) {
        const el = _el(id);
        if (!el) continue;
        _clearInline(el, id);
    }
}

// ----- Edit mode -----

let _editing = false;
let _pendingLayout = null;        // snapshot of in-progress changes
let _layoutBeforeEdit = null;     // for Cancel
let _origDisplay = {};            // per-id pre-edit `display` for force-show
let _activeDrag = null;           // { el, hudId, startX, startY, origLeft, origTop }
let _toolbarWired = false;

// --- Controller / focus state ---
// Focusable items: each editable HUD element + the 3 toolbar buttons. Order
// matches D-pad-up/down navigation; "Done" sits at the end so Start = save.
const FOCUS_ITEMS = [
    { kind: 'hud',    id: 'combo' },
    { kind: 'hud',    id: 'minimap' },
    { kind: 'hud',    id: 'bottomUi' },
    { kind: 'hud',    id: 'p2Hud' },
    { kind: 'button', id: 'hud-edit-reset' },
    { kind: 'button', id: 'hud-edit-cancel' },
    { kind: 'button', id: 'hud-edit-done' }
];
let _focusIdx = 0;
let _moveMode = false;            // true = D-pad moves the focused element
let _gpPollRaf = 0;
let _gpPrevButtons = new Set();   // edge detection
let _gpAxisHoldTimer = 0;         // ms-since-last-repeat for held axes
const GP_REPEAT_MS = 130;
const GP_DEAD = 0.4;
const MOVE_STEP = 8;              // base step per axis tick in move mode

function _serializeCurrentRect(el) {
    const r = el.getBoundingClientRect();
    return { left: Math.round(r.left), top: Math.round(r.top) };
}

function _writePendingForEl(hudId, el) {
    const rect = _serializeCurrentRect(el);
    _pendingLayout[hudId] = rect;
    el.style.position = 'fixed';
    el.style.left = `${rect.left}px`;
    el.style.top  = `${rect.top}px`;
    el.style.right = '';
    el.style.bottom = '';
}

function _onPointerDown(e) {
    if (!_editing) return;
    const el = e.currentTarget;
    const hudId = el.getAttribute('data-hud-id');
    if (!hudId || !EDITABLE_IDS.includes(hudId)) return;
    e.preventDefault();
    e.stopPropagation();

    // Pin element to current position before drag starts so the drag math is
    // simple (left/top in viewport pixels).
    _writePendingForEl(hudId, el);

    _activeDrag = {
        el,
        hudId,
        startX: e.clientX,
        startY: e.clientY,
        origLeft: _pendingLayout[hudId].left,
        origTop:  _pendingLayout[hudId].top
    };
    el.classList.add('hud-dragging');
    el.setPointerCapture && el.setPointerCapture(e.pointerId);
}

function _onPointerMove(e) {
    if (!_activeDrag) return;
    const dx = e.clientX - _activeDrag.startX;
    const dy = e.clientY - _activeDrag.startY;
    let nextLeft = _activeDrag.origLeft + dx;
    let nextTop  = _activeDrag.origTop  + dy;

    const el = _activeDrag.el;
    const w = el.offsetWidth || 0;
    const h = el.offsetHeight || 0;
    const vw = window.innerWidth;
    const vh = window.innerHeight;

    // Shift = snap to nearest viewport edge (8px gutter).
    if (e.shiftKey) {
        const GUTTER = 8;
        const candidates = [GUTTER, vw - w - GUTTER, vh - h - GUTTER, GUTTER];
        // Snap X to left or right edge if within 40px
        if (Math.abs(nextLeft - GUTTER) < 40) nextLeft = GUTTER;
        else if (Math.abs(nextLeft - (vw - w - GUTTER)) < 40) nextLeft = vw - w - GUTTER;
        if (Math.abs(nextTop - GUTTER) < 40) nextTop = GUTTER;
        else if (Math.abs(nextTop - (vh - h - GUTTER)) < 40) nextTop = vh - h - GUTTER;
    }

    // Clamp inside viewport.
    nextLeft = Math.max(0, Math.min(vw - 20, nextLeft));
    nextTop  = Math.max(0, Math.min(vh - 20, nextTop));

    el.style.left = `${nextLeft}px`;
    el.style.top  = `${nextTop}px`;
    _pendingLayout[_activeDrag.hudId] = { left: Math.round(nextLeft), top: Math.round(nextTop) };
}

function _onPointerUp(e) {
    if (!_activeDrag) return;
    const el = _activeDrag.el;
    el.classList.remove('hud-dragging');
    try { el.releasePointerCapture && el.releasePointerCapture(e.pointerId); } catch (_) {}
    _activeDrag = null;
}

// ---------- Focus / controller helpers ----------

function _focusItem() { return FOCUS_ITEMS[_focusIdx] || null; }

function _focusedEl() {
    const f = _focusItem();
    if (!f) return null;
    return f.kind === 'hud' ? _el(f.id) : document.getElementById(f.id);
}

function _renderFocus() {
    // Strip previous focus + move-mode highlights.
    document.querySelectorAll('.hud-focused, .hud-moving').forEach(el => {
        el.classList.remove('hud-focused');
        el.classList.remove('hud-moving');
    });
    const el = _focusedEl();
    if (!el) return;
    el.classList.add('hud-focused');
    if (_moveMode) el.classList.add('hud-moving');
}

function _setFocus(idx) {
    if (!FOCUS_ITEMS.length) return;
    _focusIdx = ((idx % FOCUS_ITEMS.length) + FOCUS_ITEMS.length) % FOCUS_ITEMS.length;
    _moveMode = false;
    _renderFocus();
}

function _activateFocus() {
    const f = _focusItem();
    if (!f) return;
    if (f.kind === 'button') {
        const el = document.getElementById(f.id);
        if (el) el.click();
        return;
    }
    // HUD element — toggle move mode.
    const el = _focusedEl();
    if (!el) return;
    if (!_moveMode) {
        // Entering move mode — pin element to current position so D-pad
        // deltas operate on numeric left/top.
        _writePendingForEl(f.id, el);
        _moveMode = true;
    } else {
        _moveMode = false;
    }
    _renderFocus();
}

function _moveFocused(dx, dy) {
    const f = _focusItem();
    if (!f || f.kind !== 'hud' || !_moveMode) return;
    const el = _el(f.id);
    if (!el) return;
    const existing = _pendingLayout[f.id] || _serializeCurrentRect(el);
    const w = el.offsetWidth || 0;
    const h = el.offsetHeight || 0;
    const vw = window.innerWidth;
    const vh = window.innerHeight;
    const nx = Math.max(0, Math.min(vw - 20, Math.round(existing.left + dx)));
    const ny = Math.max(0, Math.min(vh - 20, Math.round(existing.top  + dy)));
    el.style.position = 'fixed';
    el.style.left = `${nx}px`;
    el.style.top  = `${ny}px`;
    el.style.right = '';
    el.style.bottom = '';
    _pendingLayout[f.id] = { left: nx, top: ny };
}

// Poll the first connected gamepad once per rAF tick. Edge-detect D-pad +
// face buttons, repeat-fire held analog sticks.
function _pollGamepad(ts) {
    if (!_editing) return;
    const pads = navigator.getGamepads ? navigator.getGamepads() : [];
    let gp = null;
    for (const p of pads) { if (p && p.connected) { gp = p; break; } }

    if (gp) {
        const pressed = new Set();
        for (let i = 0; i < gp.buttons.length; i++) {
            const b = gp.buttons[i];
            if (b && (b.pressed || (typeof b.value === 'number' && b.value > 0.5))) {
                pressed.add(i);
            }
        }
        const edge = (idx) => pressed.has(idx) && !_gpPrevButtons.has(idx);

        // D-pad up/down → focus cycle (when not in move mode); in move mode
        // they nudge the element.
        if (edge(12)) _moveMode ? _moveFocused(0, -MOVE_STEP) : _setFocus(_focusIdx - 1);
        if (edge(13)) _moveMode ? _moveFocused(0,  MOVE_STEP) : _setFocus(_focusIdx + 1);
        if (edge(14)) _moveMode ? _moveFocused(-MOVE_STEP, 0) : _setFocus(_focusIdx - 1);
        if (edge(15)) _moveMode ? _moveFocused( MOVE_STEP, 0) : _setFocus(_focusIdx + 1);

        // LB/RB also cycle focus (handy outside move mode).
        if (edge(4) && !_moveMode) _setFocus(_focusIdx - 1);
        if (edge(5) && !_moveMode) _setFocus(_focusIdx + 1);

        // A = activate (toggle move mode for HUD / click button).
        if (edge(0)) _activateFocus();

        // B = cancel. If in move mode, drop out of move mode; otherwise close
        // edit overlay without saving.
        if (edge(1)) {
            if (_moveMode) { _moveMode = false; _renderFocus(); }
            else { exitEditMode(false); return; }
        }

        // Start = Done (save).
        if (edge(9)) { exitEditMode(true); return; }

        // Y = Reset.
        if (edge(3)) {
            const r = document.getElementById('hud-edit-reset');
            if (r) r.click();
        }

        _gpPrevButtons = pressed;

        // Analog stick movement (left stick) — only meaningful in move mode.
        const ax = gp.axes[0] || 0;
        const ay = gp.axes[1] || 0;
        const mag = Math.hypot(ax, ay);
        if (_moveMode && mag > GP_DEAD) {
            _gpAxisHoldTimer += 16;
            if (_gpAxisHoldTimer >= GP_REPEAT_MS) {
                _gpAxisHoldTimer = 0;
                const scale = Math.min(1.5, (mag - GP_DEAD) / (1 - GP_DEAD));
                _moveFocused(Math.round(ax * MOVE_STEP * 2 * scale),
                             Math.round(ay * MOVE_STEP * 2 * scale));
            }
        } else {
            _gpAxisHoldTimer = GP_REPEAT_MS; // fire immediately on next press
        }
    } else {
        _gpPrevButtons = new Set();
    }

    _gpPollRaf = requestAnimationFrame(_pollGamepad);
}

function _onEditKeydown(e) {
    if (!_editing) return;
    const k = (e.key || '').toLowerCase();
    if (k === 'escape') { e.preventDefault(); exitEditMode(false); return; }
    if (k === 'enter')  { e.preventDefault(); exitEditMode(true);  return; }
    // Tab / Shift+Tab to cycle focus, arrow keys to nudge in move mode.
    if (k === 'tab') {
        e.preventDefault();
        _setFocus(_focusIdx + (e.shiftKey ? -1 : 1));
        return;
    }
    if (k === ' ' || k === 'spacebar') {
        e.preventDefault();
        _activateFocus();
        return;
    }
    if (_moveMode && (k === 'arrowup' || k === 'arrowdown' || k === 'arrowleft' || k === 'arrowright')) {
        e.preventDefault();
        const step = e.shiftKey ? MOVE_STEP * 4 : MOVE_STEP;
        if (k === 'arrowup')    _moveFocused(0, -step);
        if (k === 'arrowdown')  _moveFocused(0,  step);
        if (k === 'arrowleft')  _moveFocused(-step, 0);
        if (k === 'arrowright') _moveFocused( step, 0);
    }
}

function _wireToolbarOnce() {
    if (_toolbarWired) return;
    _toolbarWired = true;
    const $ = (id) => document.getElementById(id);
    const doneBtn = $('hud-edit-done');
    if (doneBtn)   doneBtn.addEventListener('click',   () => exitEditMode(true));
    const cancelBtn = $('hud-edit-cancel');
    if (cancelBtn) cancelBtn.addEventListener('click', () => exitEditMode(false));
    const resetBtn = $('hud-edit-reset');
    if (resetBtn)  resetBtn.addEventListener('click',  () => {
        // Reset clears layout AND immediately reflects in the edit overlay.
        _pendingLayout = {};
        for (const id of EDITABLE_IDS) {
            const el = _el(id);
            if (!el) continue;
            _clearInline(el, id);
        }
    });
}

function enterEditMode() {
    if (_editing) return;
    _editing = true;
    _captureDefaults();
    _layoutBeforeEdit = JSON.parse(JSON.stringify(
        (window.gameConfig && window.gameConfig.hudLayout) || {}
    ));
    _pendingLayout = JSON.parse(JSON.stringify(_layoutBeforeEdit));

    document.body.classList.add('hud-edit-mode');

    // Force-show every editable element so the user can drag it even when
    // there's no active run (combo/minimap/bottom-ui are normally hidden in
    // menus). We restore display on exit.
    _origDisplay = {};
    for (const id of EDITABLE_IDS) {
        const el = _el(id);
        if (!el) continue;
        _origDisplay[id] = el.style.display;
        if (el.style.display === 'none' || getComputedStyle(el).display === 'none') {
            el.style.display = '';
        }
    }

    _wireToolbarOnce();

    // Wire per-element pointer handlers.
    for (const el of _allEditableEls()) {
        el.addEventListener('pointerdown', _onPointerDown);
    }
    window.addEventListener('pointermove', _onPointerMove);
    window.addEventListener('pointerup', _onPointerUp);
    window.addEventListener('pointercancel', _onPointerUp);
    window.addEventListener('keydown', _onEditKeydown, true);

    // Reset focus + kick off gamepad poll.
    _focusIdx = 0;
    _moveMode = false;
    _gpPrevButtons = new Set();
    _gpAxisHoldTimer = GP_REPEAT_MS;
    _gpPollRaf = requestAnimationFrame(_pollGamepad);
    _renderFocus();

    // Make sure each editable element is currently positioned via inline
    // left/top so drag math has a starting point.
    for (const id of EDITABLE_IDS) {
        const el = _el(id);
        if (!el) continue;
        const existing = _pendingLayout[id];
        if (existing && typeof existing.left === 'number') {
            el.style.position = 'fixed';
            el.style.left = `${existing.left}px`;
            el.style.top  = `${existing.top}px`;
            el.style.right = '';
            el.style.bottom = '';
        } else {
            // Pin to whatever its computed position is right now.
            _writePendingForEl(id, el);
        }
    }
}

function exitEditMode(save) {
    if (!_editing) return;
    _editing = false;
    document.body.classList.remove('hud-edit-mode');

    for (const el of _allEditableEls()) {
        el.removeEventListener('pointerdown', _onPointerDown);
        el.classList.remove('hud-dragging');
        el.classList.remove('hud-focused');
        el.classList.remove('hud-moving');
    }
    window.removeEventListener('pointermove', _onPointerMove);
    window.removeEventListener('pointerup', _onPointerUp);
    window.removeEventListener('pointercancel', _onPointerUp);
    window.removeEventListener('keydown', _onEditKeydown, true);
    _activeDrag = null;
    _moveMode = false;
    if (_gpPollRaf) cancelAnimationFrame(_gpPollRaf);
    _gpPollRaf = 0;
    _gpPrevButtons = new Set();
    // Drop focus class on any toolbar button too.
    document.querySelectorAll('#hud-edit-toolbar .hud-focused').forEach(el => {
        el.classList.remove('hud-focused');
    });

    if (save) {
        if (window.gameConfig) {
            window.gameConfig.hudLayout = _pendingLayout || {};
            if (typeof window.saveConfig === 'function') window.saveConfig();
        }
        apply();
    } else {
        // Cancel — restore original layout.
        if (window.gameConfig) window.gameConfig.hudLayout = _layoutBeforeEdit || {};
        apply();
    }

    // Restore the display style for any element we force-showed on entry.
    for (const id of EDITABLE_IDS) {
        const el = _el(id);
        if (!el) continue;
        el.style.display = _origDisplay[id] || '';
    }
    _origDisplay = {};

    // Re-open Options so the user lands back where they started.
    const optionsScreen = document.getElementById('options-screen');
    if (optionsScreen && window.gameConfig) {
        optionsScreen.style.display = 'flex';
        if (typeof window.setUIState === 'function') window.setUIState('OPTIONS');
    }

    _layoutBeforeEdit = null;
    _pendingLayout = null;
}

const HUDLayout = { apply, reset, enterEditMode, exitEditMode };

if (typeof window !== 'undefined') {
    window.HUDLayout = HUDLayout;
    // Apply on DOM ready so CSS defaults are computed correctly.
    const _boot = () => {
        try { apply(); } catch (e) { console.error('HUDLayout.apply failed', e); }
    };
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', _boot, { once: true });
    } else {
        _boot();
    }
}

export { HUDLayout };
export default HUDLayout;
