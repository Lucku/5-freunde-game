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

const EDITABLE_IDS = ['combo', 'minimap', 'bottomUi'];

// Map data-hud-id → element id in the DOM.
const ID_MAP = {
    combo:    'combo-display',
    minimap:  'minimap',
    bottomUi: 'bottom-ui'
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
    }
    window.removeEventListener('pointermove', _onPointerMove);
    window.removeEventListener('pointerup', _onPointerUp);
    window.removeEventListener('pointercancel', _onPointerUp);
    _activeDrag = null;

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
