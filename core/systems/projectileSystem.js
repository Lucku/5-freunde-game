// #5 phase 5.10 — Projectile ECS system. Hybrid layout per
// `tasks/ecs-projectile-hooks.md`:
//   - Typed-array slots for hot-path fields (x, y, vx, vy, damage, radius,
//     life, pierce, knockback, type ord, color, flags bitfield, shooterType)
//   - Parallel Array slots for object refs (owner, outlineColor, online
//     net-sync fields) and optional override fn refs (updateFn, drawFn,
//     onHitFn).
//   - Per-slot custom-field bag (`_extras[i]`) for DLC `_rot`/`_healAccum`/
//     etc. — only allocated when first `_X` field is set.
//
// Compat-shim path: `Entities/Projectile.js` wraps spawn calls in a
// `ProjectileSlot` proxy so the existing ~120 spawn sites + the 20
// per-instance update/draw overrides in PoisonHero/GravityHero/WindBosses
// keep working unchanged.

import { cachedRadial } from '../../Utils.js';

export const MAX_PROJECTILES = 512;

// Type ordinal — base types have draw branches in this module; DLC types
// (MIASMA, LEECH, etc.) rely on per-slot drawFn overrides via the shim.
export const PROJECTILE_TYPES = [
    'fire', 'ice', 'water', 'plant', 'metal', 'black',
    'time', 'love', 'smoke', 'mirror', 'psycho', 'light',
    'thorn', 'dream', 'boss', 'chaos', 'enemy', 'gravity',
    // DLC / non-base — registered dynamically below.
    'MIASMA', 'LEECH', 'CRYO_WAVE', 'FROST_ZONE', 'ICE_WAVE',
    'RING_WAVE', 'TSUNAMI', 'VIRAL_CTRL', 'ACIDRAIN', 'ACID_DROP',
    'MINI_ACID', 'HALLUCIN',
];
const _typeOrdinal = new Map();
PROJECTILE_TYPES.forEach((t, i) => _typeOrdinal.set(t, i));

function _getOrAddTypeOrdinal(type) {
    let ord = _typeOrdinal.get(type);
    if (ord !== undefined) return ord;
    ord = PROJECTILE_TYPES.length;
    PROJECTILE_TYPES.push(type);
    _typeOrdinal.set(type, ord);
    return ord;
}

// ── Shooter-type enum (3 enemy variants + NONE) ────────────────────────────
export const SHOOTER_TYPE = { NONE: 0, SHOOTER: 1, TOXIC: 2, SNIPER: 3 };
const _shooterStr = ['', 'SHOOTER', 'TOXIC', 'SNIPER'];
function _shooterStrToOrd(s) {
    if (s === 'SHOOTER') return 1;
    if (s === 'TOXIC')   return 2;
    if (s === 'SNIPER')  return 3;
    return 0;
}

// ── Flag bitfield ──────────────────────────────────────────────────────────
export const PROJ_FLAG = {
    IS_ENEMY:        1 << 0,
    IS_CRIT:         1 << 1,
    IS_EXPLOSIVE:    1 << 2,
    IS_WILDFIRE:     1 << 3,
    IS_CRYO:         1 << 4,
    OWNER_IS_PLAYER: 1 << 5,
    GHOST:           1 << 6,
    DEAD:            1 << 7,
};

// ── Palette interning for colors ───────────────────────────────────────────
const _palette = [];
const _paletteByKey = new Map();
function _internColor(color) {
    let idx = _paletteByKey.get(color);
    if (idx !== undefined) return idx;
    idx = _palette.length;
    _palette.push(color);
    _paletteByKey.set(color, idx);
    return idx;
}

// ── System API ─────────────────────────────────────────────────────────────

export function initProjectiles(rs) {
    rs.projectileX            = new Float32Array(MAX_PROJECTILES);
    rs.projectileY            = new Float32Array(MAX_PROJECTILES);
    rs.projectileVX           = new Float32Array(MAX_PROJECTILES);
    rs.projectileVY           = new Float32Array(MAX_PROJECTILES);
    rs.projectileDamage       = new Float32Array(MAX_PROJECTILES);
    rs.projectileRadius       = new Float32Array(MAX_PROJECTILES);
    rs.projectileKnockback    = new Float32Array(MAX_PROJECTILES);
    rs.projectileLife         = new Float32Array(MAX_PROJECTILES);   // NaN = "null" (infinite)
    rs.projectilePierce       = new Int32Array(MAX_PROJECTILES);
    rs.projectileType         = new Uint16Array(MAX_PROJECTILES);    // ord into PROJECTILE_TYPES
    rs.projectileColor        = new Uint16Array(MAX_PROJECTILES);    // palette ord
    rs.projectileFlags        = new Uint8Array(MAX_PROJECTILES);
    rs.projectileShooterType  = new Uint8Array(MAX_PROJECTILES);
    rs.projectileOwner        = new Array(MAX_PROJECTILES).fill(null);
    rs.projectileOutlineColor = new Array(MAX_PROJECTILES).fill(null);
    rs.projectileUpdateFn     = new Array(MAX_PROJECTILES).fill(null);
    rs.projectileDrawFn       = new Array(MAX_PROJECTILES).fill(null);
    rs.projectileOnHitFn      = new Array(MAX_PROJECTILES).fill(null);
    rs.projectileExtras       = new Array(MAX_PROJECTILES).fill(null);
    rs.projectileSlotProxy    = new Array(MAX_PROJECTILES).fill(null);
    rs.projectileCount        = 0;
}

/**
 * Spawn a projectile. Returns slot index or -1 on cap overflow.
 *
 * @param {object} rs
 * @param {number} x
 * @param {number} y
 * @param {{x:number,y:number}} velocity
 * @param {number} damage
 * @param {string} color
 * @param {number} radius
 * @param {string} type
 * @param {number} knockback
 * @param {boolean} isEnemy
 * @param {object} [opts] - { isExplosive, isCrit, owner, shooterType,
 *                            outlineColor, ownerIsPlayer, isWildfire, isCryo,
 *                            onHit, update, draw, life, pierce }
 */
export function spawnProjectile(rs, x, y, velocity, damage, color, radius, type, knockback, isEnemy, opts) {
    const i = rs.projectileCount;
    if (i >= MAX_PROJECTILES) return -1;

    const isCrit = !!(opts && opts.isCrit);
    const r = isCrit ? radius * 1.5 : radius;

    rs.projectileX[i]            = x;
    rs.projectileY[i]            = y;
    rs.projectileVX[i]           = velocity ? velocity.x : 0;
    rs.projectileVY[i]           = velocity ? velocity.y : 0;
    rs.projectileDamage[i]       = damage;
    rs.projectileRadius[i]       = r;
    rs.projectileKnockback[i]    = knockback;
    rs.projectileLife[i]         = (opts && opts.life !== undefined && opts.life !== null) ? opts.life : NaN;
    rs.projectilePierce[i]       = (opts && opts.pierce !== undefined)
        ? opts.pierce
        : ((type === 'ice' && !isEnemy) ? 2 : 0);
    rs.projectileType[i]         = _getOrAddTypeOrdinal(type);
    rs.projectileColor[i]        = _internColor(color);

    let flags = 0;
    if (isEnemy) flags |= PROJ_FLAG.IS_ENEMY;
    if (isCrit)  flags |= PROJ_FLAG.IS_CRIT;
    if (opts) {
        if (opts.isExplosive)    flags |= PROJ_FLAG.IS_EXPLOSIVE;
        if (opts.isWildfire)     flags |= PROJ_FLAG.IS_WILDFIRE;
        if (opts.isCryo)         flags |= PROJ_FLAG.IS_CRYO;
        if (opts.ownerIsPlayer)  flags |= PROJ_FLAG.OWNER_IS_PLAYER;
    }
    rs.projectileFlags[i] = flags;

    rs.projectileShooterType[i]  = (opts && opts.shooterType) ? _shooterStrToOrd(opts.shooterType) : 0;
    rs.projectileOwner[i]        = (opts && opts.owner)        ? opts.owner        : null;
    rs.projectileOutlineColor[i] = (opts && opts.outlineColor) ? opts.outlineColor : null;
    rs.projectileUpdateFn[i]     = (opts && opts.update)       ? opts.update       : null;
    rs.projectileDrawFn[i]       = (opts && opts.draw)         ? opts.draw         : null;
    rs.projectileOnHitFn[i]      = (opts && opts.onHit)        ? opts.onHit        : null;
    rs.projectileExtras[i]       = null;
    rs.projectileSlotProxy[i]    = null;

    rs.projectileCount = i + 1;
    return i;
}

export function killProjectile(rs, i) {
    const last = rs.projectileCount - 1;
    if (i !== last) {
        rs.projectileX[i]            = rs.projectileX[last];
        rs.projectileY[i]            = rs.projectileY[last];
        rs.projectileVX[i]           = rs.projectileVX[last];
        rs.projectileVY[i]           = rs.projectileVY[last];
        rs.projectileDamage[i]       = rs.projectileDamage[last];
        rs.projectileRadius[i]       = rs.projectileRadius[last];
        rs.projectileKnockback[i]    = rs.projectileKnockback[last];
        rs.projectileLife[i]         = rs.projectileLife[last];
        rs.projectilePierce[i]       = rs.projectilePierce[last];
        rs.projectileType[i]         = rs.projectileType[last];
        rs.projectileColor[i]        = rs.projectileColor[last];
        rs.projectileFlags[i]        = rs.projectileFlags[last];
        rs.projectileShooterType[i]  = rs.projectileShooterType[last];
        rs.projectileOwner[i]        = rs.projectileOwner[last];
        rs.projectileOutlineColor[i] = rs.projectileOutlineColor[last];
        rs.projectileUpdateFn[i]     = rs.projectileUpdateFn[last];
        rs.projectileDrawFn[i]       = rs.projectileDrawFn[last];
        rs.projectileOnHitFn[i]      = rs.projectileOnHitFn[last];
        rs.projectileExtras[i]       = rs.projectileExtras[last];
        // Slot proxy follows the slot index — its internal `_slot` ref is stale
        // after swap, so retire the proxy. Compat shim's setters guard with
        // _slot bounds-check.
        rs.projectileSlotProxy[i]    = rs.projectileSlotProxy[last];
        if (rs.projectileSlotProxy[i]) rs.projectileSlotProxy[i]._slot = i;
    }
    rs.projectileOwner[last]        = null;
    rs.projectileOutlineColor[last] = null;
    rs.projectileUpdateFn[last]     = null;
    rs.projectileDrawFn[last]       = null;
    rs.projectileOnHitFn[last]      = null;
    rs.projectileExtras[last]       = null;
    if (rs.projectileSlotProxy[last]) rs.projectileSlotProxy[last]._slot = -1;
    rs.projectileSlotProxy[last]    = null;
    rs.projectileCount = last;
}

export function clearProjectiles(rs) {
    for (let i = 0; i < rs.projectileCount; i++) {
        rs.projectileOwner[i]        = null;
        rs.projectileOutlineColor[i] = null;
        rs.projectileUpdateFn[i]     = null;
        rs.projectileDrawFn[i]       = null;
        rs.projectileOnHitFn[i]      = null;
        rs.projectileExtras[i]       = null;
        if (rs.projectileSlotProxy[i]) rs.projectileSlotProxy[i]._slot = -1;
        rs.projectileSlotProxy[i]    = null;
    }
    rs.projectileCount = 0;
}

export function getProjectileType(rs, i) {
    return PROJECTILE_TYPES[rs.projectileType[i]];
}

export function getProjectileColor(rs, i) {
    return _palette[rs.projectileColor[i]];
}

export function hasProjectileFlag(rs, i, flag) {
    return (rs.projectileFlags[i] & flag) !== 0;
}

export function setProjectileFlag(rs, i, flag, on) {
    if (on) rs.projectileFlags[i] |=  flag;
    else    rs.projectileFlags[i] &= ~flag;
}

export function getShooterType(rs, i) {
    return _shooterStr[rs.projectileShooterType[i]] || '';
}

// ── Update + draw — base behavior + per-slot override dispatch ─────────────

function _baseUpdate(rs, i) {
    rs.projectileX[i] += rs.projectileVX[i];
    rs.projectileY[i] += rs.projectileVY[i];
    const life = rs.projectileLife[i];
    if (!Number.isNaN(life)) rs.projectileLife[i] = life - 1;
}

export function updateProjectiles(rs) {
    for (let i = 0; i < rs.projectileCount; i++) {
        const fn = rs.projectileUpdateFn[i];
        if (fn) {
            // Lazily build the slot proxy; closure-bearing DLC overrides
            // expect `this.x`/`this.life`/etc. semantics from the class.
            const proxy = _ensureProxy(rs, i);
            try { fn.call(proxy); } catch (e) { void e; }
        } else {
            _baseUpdate(rs, i);
        }
    }
}

// Build proxy lazily — only DLC override paths need it. Same lifetime as
// the slot (until killProjectile retires it). The actual implementation
// is set further down once ProjectileSlotInternal + Proxy wrapper are
// defined.
// eslint-disable-next-line prefer-const
let _ensureProxy;

// Internal proxy class — kept here so updateFn/drawFn callers can read
// `this.x`, `this.life`, `this._rot`, etc. transparently. Mirrors
// `Entities/Projectile.js` compat shim but lives module-private for the
// override path.
class ProjectileSlotInternal {
    constructor(rs, slot) {
        this._rs   = rs;
        this._slot = slot;
        // Velocity sub-object — getter/setter pair on a stable nested ref.
        const self = this;
        this._velocity = {
            get x() { return self._slot >= 0 ? self._rs.projectileVX[self._slot] : 0; },
            set x(v) { if (self._slot >= 0) self._rs.projectileVX[self._slot] = v; },
            get y() { return self._slot >= 0 ? self._rs.projectileVY[self._slot] : 0; },
            set y(v) { if (self._slot >= 0) self._rs.projectileVY[self._slot] = v; },
        };
    }
    get x()        { return this._slot >= 0 ? this._rs.projectileX[this._slot] : 0; }
    set x(v)       { if (this._slot >= 0) this._rs.projectileX[this._slot] = v; }
    get y()        { return this._slot >= 0 ? this._rs.projectileY[this._slot] : 0; }
    set y(v)       { if (this._slot >= 0) this._rs.projectileY[this._slot] = v; }
    get velocity() { return this._velocity; }
    set velocity(v) {
        if (this._slot < 0 || !v) return;
        if ('x' in v) this._rs.projectileVX[this._slot] = v.x;
        if ('y' in v) this._rs.projectileVY[this._slot] = v.y;
    }
    get damage()   { return this._slot >= 0 ? this._rs.projectileDamage[this._slot] : 0; }
    set damage(v)  { if (this._slot >= 0) this._rs.projectileDamage[this._slot] = v; }
    get radius()   { return this._slot >= 0 ? this._rs.projectileRadius[this._slot] : 0; }
    set radius(v)  { if (this._slot >= 0) this._rs.projectileRadius[this._slot] = v; }
    get knockback(){ return this._slot >= 0 ? this._rs.projectileKnockback[this._slot] : 0; }
    set knockback(v){ if (this._slot >= 0) this._rs.projectileKnockback[this._slot] = v; }
    get life()     {
        if (this._slot < 0) return null;
        const l = this._rs.projectileLife[this._slot];
        return Number.isNaN(l) ? null : l;
    }
    set life(v) {
        if (this._slot < 0) return;
        this._rs.projectileLife[this._slot] = (v === null || v === undefined) ? NaN : v;
    }
    get pierce()   { return this._slot >= 0 ? this._rs.projectilePierce[this._slot] : 0; }
    set pierce(v)  { if (this._slot >= 0) this._rs.projectilePierce[this._slot] = v; }
    get type()     { return this._slot >= 0 ? PROJECTILE_TYPES[this._rs.projectileType[this._slot]] : ''; }
    set type(v)    { if (this._slot >= 0) this._rs.projectileType[this._slot] = _getOrAddTypeOrdinal(v); }
    get color()    { return this._slot >= 0 ? _palette[this._rs.projectileColor[this._slot]] : ''; }
    set color(v)   { if (this._slot >= 0) this._rs.projectileColor[this._slot] = _internColor(v); }

    // Flag accessors
    get isEnemy()      { return this._slot >= 0 && (this._rs.projectileFlags[this._slot] & PROJ_FLAG.IS_ENEMY) !== 0; }
    set isEnemy(v)     { if (this._slot >= 0) setProjectileFlag(this._rs, this._slot, PROJ_FLAG.IS_ENEMY, v); }
    get isCrit()       { return this._slot >= 0 && (this._rs.projectileFlags[this._slot] & PROJ_FLAG.IS_CRIT) !== 0; }
    set isCrit(v)      { if (this._slot >= 0) setProjectileFlag(this._rs, this._slot, PROJ_FLAG.IS_CRIT, v); }
    get isExplosive()  { return this._slot >= 0 && (this._rs.projectileFlags[this._slot] & PROJ_FLAG.IS_EXPLOSIVE) !== 0; }
    set isExplosive(v) { if (this._slot >= 0) setProjectileFlag(this._rs, this._slot, PROJ_FLAG.IS_EXPLOSIVE, v); }
    get isWildfire()   { return this._slot >= 0 && (this._rs.projectileFlags[this._slot] & PROJ_FLAG.IS_WILDFIRE) !== 0; }
    set isWildfire(v)  { if (this._slot >= 0) setProjectileFlag(this._rs, this._slot, PROJ_FLAG.IS_WILDFIRE, v); }
    get isCryo()       { return this._slot >= 0 && (this._rs.projectileFlags[this._slot] & PROJ_FLAG.IS_CRYO) !== 0; }
    set isCryo(v)      { if (this._slot >= 0) setProjectileFlag(this._rs, this._slot, PROJ_FLAG.IS_CRYO, v); }
    get ownerIsPlayer(){ return this._slot >= 0 && (this._rs.projectileFlags[this._slot] & PROJ_FLAG.OWNER_IS_PLAYER) !== 0; }
    set ownerIsPlayer(v){ if (this._slot >= 0) setProjectileFlag(this._rs, this._slot, PROJ_FLAG.OWNER_IS_PLAYER, v); }
    get _ghost()       { return this._slot >= 0 && (this._rs.projectileFlags[this._slot] & PROJ_FLAG.GHOST) !== 0; }
    set _ghost(v)      { if (this._slot >= 0) setProjectileFlag(this._rs, this._slot, PROJ_FLAG.GHOST, v); }
    get dead()         { return this._slot >= 0 && (this._rs.projectileFlags[this._slot] & PROJ_FLAG.DEAD) !== 0; }
    set dead(v)        { if (this._slot >= 0) setProjectileFlag(this._rs, this._slot, PROJ_FLAG.DEAD, v); }

    get shooterType() { return this._slot >= 0 ? _shooterStr[this._rs.projectileShooterType[this._slot]] || undefined : undefined; }
    set shooterType(v) { if (this._slot >= 0) this._rs.projectileShooterType[this._slot] = _shooterStrToOrd(v); }
    get outlineColor() { return this._slot >= 0 ? this._rs.projectileOutlineColor[this._slot] : null; }
    set outlineColor(v){ if (this._slot >= 0) this._rs.projectileOutlineColor[this._slot] = v; }
    get owner()  { return this._slot >= 0 ? this._rs.projectileOwner[this._slot] : null; }
    set owner(v) { if (this._slot >= 0) this._rs.projectileOwner[this._slot] = v; }
    get onHit()  { return this._slot >= 0 ? this._rs.projectileOnHitFn[this._slot] : null; }
    set onHit(v) { if (this._slot >= 0) this._rs.projectileOnHitFn[this._slot] = v || null; }

    // DLC pattern `p.update = function() { ... }` lands here via the setter.
    // `proj.update()` getter returns a callable: the override fn if set,
    // otherwise a closure that runs the base tick. Closure allocation is
    // hot-path-acceptable because update is called once per projectile per
    // frame and the closure body is small.
    set update(v) { if (this._slot >= 0) this._rs.projectileUpdateFn[this._slot] = v || null; }
    get update()  {
        if (this._slot < 0) return _noopFn;
        const fn = this._rs.projectileUpdateFn[this._slot];
        if (fn) return fn;
        return _baseUpdateBound(this);
    }
    set draw(v)   { if (this._slot >= 0) this._rs.projectileDrawFn[this._slot] = v || null; }
    get draw()    { return this._slot >= 0 ? this._rs.projectileDrawFn[this._slot] : null; }

    _slotIdx() { return this._slot; }
}

// Module-private helpers for the `proj.update` getter fallback. `_baseUpdateBound`
// returns a closure bound to a specific slot proxy that runs position += velocity,
// life-- on each call.
function _noopFn() {}
function _baseUpdateBound(proxy) {
    return function _baseTick() {
        const i = proxy._slot;
        if (i < 0) return;
        const rs = proxy._rs;
        rs.projectileX[i] += rs.projectileVX[i];
        rs.projectileY[i] += rs.projectileVY[i];
        const life = rs.projectileLife[i];
        if (!Number.isNaN(life)) rs.projectileLife[i] = life - 1;
    };
}

// Property fallback for `_*` custom DLC fields — store on per-slot extras
// dictionary. The DLC pattern `this._rot += 0.03;` reads/writes through
// here. Implemented as Proxy on top of the class instance — Proxy overhead
// is one trap call per access, acceptable since DLC overrides are rare
// (~20 projectile types use them).
ProjectileSlotInternal.prototype._getExtra = function (name) {
    if (this._slot < 0) return undefined;
    const x = this._rs.projectileExtras[this._slot];
    return x ? x[name] : undefined;
};
ProjectileSlotInternal.prototype._setExtra = function (name, v) {
    if (this._slot < 0) return;
    let x = this._rs.projectileExtras[this._slot];
    if (!x) { x = {}; this._rs.projectileExtras[this._slot] = x; }
    x[name] = v;
};

// Wrap in a Proxy that traps `_X` reads/writes only. Standard fields use
// the class accessors directly (fast). Standard prototype properties are
// also passed through.
const _proxyHandler = {
    get(target, prop) {
        if (typeof prop === 'string' && prop.charCodeAt(0) === 95 /* '_' */ && prop !== '_slot' && prop !== '_rs' && prop !== '_velocity' && prop !== '_ghost' && prop !== '_slotIdx') {
            return target._getExtra(prop);
        }
        return target[prop];
    },
    set(target, prop, value) {
        if (typeof prop === 'string' && prop.charCodeAt(0) === 95 && prop !== '_slot' && prop !== '_rs' && prop !== '_velocity' && prop !== '_ghost') {
            target._setExtra(prop, value);
            return true;
        }
        target[prop] = value;
        return true;
    },
};

function _wrapSlot(rs, i) {
    const inner = new ProjectileSlotInternal(rs, i);
    return new Proxy(inner, _proxyHandler);
}

// Set the lazy-build to return the Proxy wrapper. `updateProjectiles` and
// `drawProjectiles` dispatch through this.
_ensureProxy = function _ensureProxyImpl(rs, i) {
    let p = rs.projectileSlotProxy[i];
    if (p) return p;
    p = _wrapSlot(rs, i);
    rs.projectileSlotProxy[i] = p;
    return p;
};

// Module-private — exposed for compat shim.
export function _acquireProjectileSlot(rs, i) { return _ensureProxy(rs, i); }

// ── Draw — 14 base type branches lifted from the class ─────────────────────

function _drawProjectileSlot(ctx, rs, i) {
    const fn = rs.projectileDrawFn[i];
    if (fn) {
        const proxy = _ensureProxyOverride(rs, i);
        try { fn.call(proxy); } catch (e) { void e; }
        return;
    }

    const NOW = Date.now();
    const x = rs.projectileX[i];
    const y = rs.projectileY[i];
    const vx = rs.projectileVX[i];
    const vy = rs.projectileVY[i];
    const radius = rs.projectileRadius[i];
    const type = PROJECTILE_TYPES[rs.projectileType[i]];
    const color = _palette[rs.projectileColor[i]];
    const flags = rs.projectileFlags[i];
    const isCrit = (flags & PROJ_FLAG.IS_CRIT) !== 0;
    const outlineColor = rs.projectileOutlineColor[i];

    ctx.save();
    ctx.translate(x, y);
    const angle = Math.atan2(vy, vx);

    if (isCrit) {
        ctx.shadowBlur = 15;
        ctx.shadowColor = '#fff';
    }

    if (type === 'ice') {
        ctx.rotate(angle);
        ctx.beginPath();
        ctx.moveTo(radius * 2, 0);
        ctx.lineTo(-radius, -radius * 0.6);
        ctx.lineTo(-radius, radius * 0.6);
        ctx.closePath();
        ctx.fillStyle = color;
        ctx.fill();
        ctx.fillStyle = '#fff';
        ctx.beginPath();
        ctx.moveTo(radius, -2);
        ctx.lineTo(radius * 1.5, 0);
        ctx.lineTo(radius, 2);
        ctx.fill();
    } else if (type === 'fire') {
        ctx.rotate(angle);
        ctx.beginPath();
        ctx.arc(0, 0, radius, 0, Math.PI * 2);
        ctx.fillStyle = '#f1c40f';
        ctx.fill();
        ctx.beginPath();
        ctx.moveTo(0, -radius);
        ctx.lineTo(-radius * 2.5, 0);
        ctx.lineTo(0, radius);
        ctx.fillStyle = 'rgba(231, 76, 60, 0.8)';
        ctx.fill();
    } else if (type === 'water') {
        ctx.rotate(angle);
        ctx.beginPath();
        ctx.arc(0, 0, radius, 0, Math.PI * 2);
        ctx.fillStyle = '#2980b9';
        ctx.fill();
        ctx.beginPath(); ctx.arc(-radius * 1.8, 0, radius * 0.5, 0, Math.PI * 2); ctx.fill();
        ctx.beginPath(); ctx.arc(-radius * 3.0, 0, radius * 0.3, 0, Math.PI * 2); ctx.fill();
    } else if (type === 'plant') {
        ctx.rotate(angle);
        ctx.beginPath();
        ctx.ellipse(0, 0, radius * 2, radius, 0, 0, Math.PI * 2);
        ctx.fillStyle = '#2ecc71';
        ctx.fill();
        ctx.beginPath();
        ctx.moveTo(-radius * 2, 0);
        ctx.lineTo(radius * 2, 0);
        ctx.strokeStyle = '#145a32';
        ctx.lineWidth = 2;
        ctx.stroke();
    } else if (type === 'metal') {
        const spin = NOW / 50;
        ctx.rotate(spin);
        ctx.beginPath();
        const sides = 4;
        for (let k = 0; k < sides * 2; k++) {
            const l = (k % 2 === 0) ? radius * 1.8 : radius * 0.6;
            const a = (Math.PI * k) / sides;
            ctx.lineTo(Math.cos(a) * l, Math.sin(a) * l);
        }
        ctx.closePath();
        ctx.fillStyle = '#7f8c8d';
        ctx.fill();
        ctx.strokeStyle = '#2c3e50';
        ctx.lineWidth = 1;
        ctx.stroke();
    } else if (type === 'black') {
        ctx.shadowBlur = 15 + Math.sin(NOW / 100) * 5;
        ctx.shadowColor = '#8e44ad';
        ctx.beginPath();
        ctx.arc(0, 0, radius * 1.3, 0, Math.PI * 2);
        ctx.fillStyle = '#000';
        ctx.fill();
        ctx.beginPath();
        ctx.arc(0, 0, radius * 0.7, 0, Math.PI * 2);
        ctx.fillStyle = '#4a148c';
        ctx.shadowBlur = 0;
        ctx.fill();
    } else if (type === 'time') {
        const t = NOW;
        const pulse = 0.75 + 0.25 * Math.sin(t * 0.007);
        const r = radius;
        const aura = cachedRadial(ctx, `proj-time-aura:${r}`, r * 0.2, r * 2.2, [
            [0, 'rgba(200,170,80,0.35)'],
            [0.5, 'rgba(120,80,200,0.15)'],
            [1, 'rgba(80,40,160,0)'],
        ]);
        ctx.fillStyle = aura;
        ctx.beginPath(); ctx.arc(0, 0, r * 2.2, 0, Math.PI * 2); ctx.fill();
        ctx.save();
        ctx.rotate(t * 0.003);
        ctx.strokeStyle = 'rgba(200,170,80,0.55)';
        ctx.lineWidth = 1.2;
        ctx.setLineDash([4, 6]);
        ctx.beginPath(); ctx.arc(0, 0, r * 1.6, 0, Math.PI * 2); ctx.stroke();
        ctx.setLineDash([]);
        ctx.restore();
        ctx.save();
        ctx.rotate(-t * 0.005);
        ctx.strokeStyle = 'rgba(160,120,255,0.5)';
        ctx.lineWidth = 1;
        ctx.setLineDash([3, 5]);
        ctx.beginPath(); ctx.arc(0, 0, r * 1.1, 0, Math.PI * 2); ctx.stroke();
        ctx.setLineDash([]);
        ctx.restore();
        const core = cachedRadial(ctx, `proj-time-core:${r}`, 0, r, [
            [0, '#fffbe0'],
            [0.4, '#c8aa6e'],
            [1, '#7c5020'],
        ]);
        ctx.shadowColor = '#c8aa6e';
        ctx.shadowBlur  = 12 * pulse;
        ctx.fillStyle = core;
        ctx.beginPath(); ctx.arc(0, 0, r * pulse, 0, Math.PI * 2); ctx.fill();
        ctx.shadowBlur = 0;
        ctx.save();
        ctx.rotate(t * 0.004);
        ctx.strokeStyle = 'rgba(255,245,200,0.8)';
        ctx.lineWidth = 1;
        ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(0, -r * 0.55); ctx.stroke();
        ctx.restore();
        ctx.save();
        ctx.rotate(t * 0.0012);
        ctx.strokeStyle = 'rgba(255,245,200,0.55)';
        ctx.lineWidth = 0.8;
        ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(0, -r * 0.38); ctx.stroke();
        ctx.restore();
    } else if (type === 'love') {
        const t = NOW;
        const r = radius;
        const pulse = 0.85 + 0.15 * Math.sin(t * 0.012);
        ctx.rotate(angle + Math.PI * 0.5);
        ctx.shadowColor = '#ff1a6b';
        ctx.shadowBlur  = 14 * pulse;
        const s = r * 1.4 * pulse;
        ctx.beginPath();
        ctx.moveTo(0, s * 0.4);
        ctx.bezierCurveTo(s * 0.5, s * 0.1, s, -s * 0.3, 0, -s * 0.7);
        ctx.bezierCurveTo(-s, -s * 0.3, -s * 0.5, s * 0.1, 0, s * 0.4);
        ctx.closePath();
        const hg = cachedRadial(ctx, `proj-love-heart:${Math.round(s * 4)}`, 0, s, [
            [0, '#ff9dbf'],
            [0.5, '#ff4d94'],
            [1, '#c0124a'],
        ]);
        ctx.fillStyle = hg;
        ctx.fill();
        ctx.globalAlpha = 0.35;
        ctx.fillStyle = '#ffffff';
        ctx.beginPath();
        ctx.ellipse(-s * 0.2, -s * 0.45, s * 0.18, s * 0.11, -0.6, 0, Math.PI * 2);
        ctx.fill();
        ctx.globalAlpha = 1;
        ctx.shadowBlur = 0;
    } else if (type === 'smoke') {
        const t = NOW;
        const r = radius;
        const pulse = 0.85 + 0.15 * Math.sin(t * 0.012);
        ctx.rotate(angle);
        const aura = cachedRadial(ctx, `proj-smoke-aura:${r}`, r * 0.2, r * 2.0, [
            [0, 'rgba(90, 90, 110, 0.55)'],
            [0.5, 'rgba(60, 60, 75, 0.25)'],
            [1, 'rgba(15, 15, 20, 0)'],
        ]);
        ctx.fillStyle = aura;
        ctx.beginPath(); ctx.arc(0, 0, r * 2.0 * pulse, 0, Math.PI * 2); ctx.fill();
        ctx.fillStyle = 'rgba(60, 60, 75, 0.45)';
        ctx.beginPath(); ctx.arc(-r * 1.8, -r * 0.3 + Math.sin(t * 0.02) * r * 0.2, r * 0.55, 0, Math.PI * 2); ctx.fill();
        ctx.beginPath(); ctx.arc(-r * 2.8, r * 0.3 + Math.cos(t * 0.02) * r * 0.2, r * 0.35, 0, Math.PI * 2); ctx.fill();
        const core = cachedRadial(ctx, `proj-smoke-core:${r}`, 0, r, [
            [0, '#3a3a48'],
            [0.6, '#1a1a22'],
            [1, '#0f0f14'],
        ]);
        ctx.fillStyle = core;
        ctx.beginPath(); ctx.arc(0, 0, r * pulse, 0, Math.PI * 2); ctx.fill();
        ctx.strokeStyle = 'rgba(140, 140, 160, 0.4)';
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.arc(0, 0, r * 0.6, t * 0.01 % (Math.PI * 2), (t * 0.01 % (Math.PI * 2)) + Math.PI);
        ctx.stroke();
    } else if (type === 'mirror') {
        const t = NOW;
        const r = radius;
        ctx.rotate(angle);
        ctx.shadowColor = '#5dade2';
        ctx.shadowBlur  = 8;
        ctx.beginPath();
        ctx.moveTo(r * 2.2, 0);
        ctx.lineTo(0, -r * 0.8);
        ctx.lineTo(-r * 1.4, 0);
        ctx.lineTo(0, r * 0.8);
        ctx.closePath();
        const body = cachedRadial(ctx, `proj-mirror-body:${r}`, 0, r * 1.6, [
            [0, 'rgba(220, 240, 255, 0.95)'],
            [0.5, 'rgba(93, 173, 226, 0.85)'],
            [1, 'rgba(26, 82, 118, 0.9)'],
        ]);
        ctx.fillStyle = body;
        ctx.fill();
        ctx.shadowBlur = 0;
        ctx.strokeStyle = '#0e2e44';
        ctx.lineWidth = 1;
        ctx.stroke();
        ctx.globalAlpha = 0.7;
        ctx.strokeStyle = '#ffffff';
        ctx.lineWidth = 1.4;
        ctx.beginPath();
        ctx.moveTo(r * 1.2, -r * 0.25);
        ctx.lineTo(-r * 0.4, r * 0.25);
        ctx.stroke();
        ctx.strokeStyle = `hsl(${(t * 0.1) % 360}, 80%, 70%)`;
        ctx.lineWidth = 0.8;
        ctx.beginPath();
        ctx.moveTo(r * 0.6, -r * 0.45);
        ctx.lineTo(r * 0.1, -r * 0.1);
        ctx.stroke();
        ctx.globalAlpha = 1;
    } else if (type === 'psycho') {
        const t = NOW;
        const r = radius;
        const pulse = 0.8 + 0.2 * Math.sin(t * 0.025);
        const aura = cachedRadial(ctx, `proj-psycho-aura:${r}`, r * 0.2, r * 2.0, [
            [0, 'rgba(26, 188, 156, 0.5)'],
            [0.5, 'rgba(155, 89, 182, 0.25)'],
            [1, 'rgba(26, 188, 156, 0)'],
        ]);
        ctx.fillStyle = aura;
        ctx.beginPath(); ctx.arc(0, 0, r * 2.0, 0, Math.PI * 2); ctx.fill();
        const core = cachedRadial(ctx, `proj-psycho-core:${r}`, 0, r, [
            [0, '#e8fff8'],
            [0.4, '#1abc9c'],
            [1, '#117a65'],
        ]);
        ctx.shadowColor = '#1abc9c';
        ctx.shadowBlur  = 10 * pulse;
        ctx.fillStyle = core;
        ctx.beginPath(); ctx.arc(0, 0, r * pulse, 0, Math.PI * 2); ctx.fill();
        ctx.shadowBlur = 0;
        ctx.strokeStyle = 'rgba(232, 255, 248, 0.85)';
        ctx.lineWidth = 1;
        for (let k = 0; k < 3; k++) {
            const baseA = (t * 0.01 + k * (Math.PI * 2 / 3)) % (Math.PI * 2);
            const x0 = Math.cos(baseA) * r * 1.1;
            const y0 = Math.sin(baseA) * r * 1.1;
            const x1 = Math.cos(baseA) * r * 1.8 + Math.sin(t * 0.05 + k) * r * 0.3;
            const y1 = Math.sin(baseA) * r * 1.8 + Math.cos(t * 0.05 + k) * r * 0.3;
            ctx.beginPath();
            ctx.moveTo(x0, y0);
            ctx.lineTo((x0 + x1) * 0.5 + Math.sin(t * 0.08 + k * 2) * r * 0.25, (y0 + y1) * 0.5 + Math.cos(t * 0.08 + k * 2) * r * 0.25);
            ctx.lineTo(x1, y1);
            ctx.stroke();
        }
        ctx.save();
        ctx.rotate(-t * 0.006);
        ctx.strokeStyle = 'rgba(155, 89, 182, 0.6)';
        ctx.lineWidth = 0.9;
        ctx.setLineDash([3, 4]);
        ctx.beginPath(); ctx.arc(0, 0, r * 1.3, 0, Math.PI * 2); ctx.stroke();
        ctx.setLineDash([]);
        ctx.restore();
    } else if (type === 'light') {
        const t = NOW;
        const r = radius;
        const pulse = 0.85 + 0.15 * Math.sin(t * 0.018);
        ctx.rotate(angle);
        ctx.globalCompositeOperation = 'lighter';
        for (let k = 1; k <= 4; k++) {
            const tx = -r * 0.9 * k;
            const tr = r * (0.85 - k * 0.16);
            const ta = 0.45 - k * 0.10;
            if (tr <= 0 || ta <= 0) break;
            const trailGrd = cachedRadial(ctx, `proj-light-trail:${Math.round(tr * 4)}`, 0, tr, [
                [0, `rgba(255, 245, 180, ${ta})`],
                [0.6, `rgba(241, 196, 15, ${ta * 0.5})`],
                [1, 'rgba(241, 196, 15, 0)'],
            ]);
            ctx.fillStyle = trailGrd;
            ctx.beginPath(); ctx.arc(tx, 0, tr, 0, Math.PI * 2); ctx.fill();
        }
        const halo = cachedRadial(ctx, `proj-light-halo:${r}`, r * 0.1, r * 2.4, [
            [0, 'rgba(255, 250, 200, 0.85)'],
            [0.35, 'rgba(255, 220, 90, 0.55)'],
            [0.7, 'rgba(241, 196, 15, 0.18)'],
            [1, 'rgba(241, 196, 15, 0)'],
        ]);
        ctx.fillStyle = halo;
        ctx.beginPath(); ctx.arc(0, 0, r * 2.4 * pulse, 0, Math.PI * 2); ctx.fill();
        ctx.globalCompositeOperation = 'source-over';
        ctx.shadowColor = '#fff5b8';
        ctx.shadowBlur  = 14 * pulse;
        const core = cachedRadial(ctx, `proj-light-core:${r}`, 0, r, [
            [0, '#ffffff'],
            [0.3, '#fff2a8'],
            [0.7, '#f1c40f'],
            [1, '#b8860b'],
        ]);
        ctx.fillStyle = core;
        ctx.beginPath(); ctx.arc(0, 0, r * pulse, 0, Math.PI * 2); ctx.fill();
        ctx.shadowBlur = 0;
        ctx.strokeStyle = 'rgba(255, 255, 230, 0.55)';
        ctx.lineWidth = 1.1;
        ctx.beginPath();
        ctx.moveTo(-r * 1.9, 0); ctx.lineTo(r * 1.9, 0);
        ctx.moveTo(0, -r * 1.4); ctx.lineTo(0, r * 1.4);
        ctx.stroke();
    } else if (type === 'thorn') {
        const t = NOW;
        const r = radius;
        ctx.rotate(angle);
        ctx.globalCompositeOperation = 'source-over';
        for (let k = 1; k <= 3; k++) {
            const tx = -r * 1.0 * k;
            const tr = r * (0.7 - k * 0.18);
            const ta = 0.4 - k * 0.10;
            if (tr <= 0 || ta <= 0) break;
            const mist = cachedRadial(ctx, `proj-thorn-mist:${Math.round(tr * 4)}`, 0, tr, [
                [0, `rgba(192, 57, 43, ${ta})`],
                [0.5, `rgba(120, 18, 18, ${ta * 0.5})`],
                [1, 'rgba(60, 8, 8, 0)'],
            ]);
            ctx.fillStyle = mist;
            ctx.beginPath();
            ctx.arc(tx + Math.sin(t * 0.02 + k) * r * 0.15, Math.cos(t * 0.025 + k) * r * 0.2, tr, 0, Math.PI * 2);
            ctx.fill();
        }
        ctx.shadowColor = '#8b1a1a';
        ctx.shadowBlur  = 9;
        ctx.beginPath();
        ctx.moveTo(r * 2.2, 0);
        ctx.lineTo(r * 0.6, -r * 0.55);
        ctx.lineTo(r * 0.1, -r * 0.25);
        ctx.lineTo(-r * 0.4, -r * 0.75);
        ctx.lineTo(-r * 0.7, -r * 0.20);
        ctx.lineTo(-r * 1.5, 0);
        ctx.lineTo(-r * 0.7, r * 0.20);
        ctx.lineTo(-r * 0.4, r * 0.75);
        ctx.lineTo(r * 0.1, r * 0.25);
        ctx.lineTo(r * 0.6, r * 0.55);
        ctx.closePath();
        const body = cachedRadial(ctx, `proj-thorn-body:${r}`, r * 0.6, r * 2.0, [
            [0, '#d63a3a'],
            [0.45, '#8b1a1a'],
            [1, '#3d0606'],
        ]);
        ctx.fillStyle = body;
        ctx.fill();
        ctx.shadowBlur = 0;
        ctx.strokeStyle = '#1a0303';
        ctx.lineWidth = 1.2;
        ctx.stroke();
        ctx.fillStyle = 'rgba(255, 220, 220, 0.85)';
        ctx.beginPath();
        ctx.moveTo(r * 2.2, 0);
        ctx.lineTo(r * 1.6, -r * 0.18);
        ctx.lineTo(r * 1.6, r * 0.18);
        ctx.closePath();
        ctx.fill();
    } else if (type === 'dream') {
        const t = NOW;
        const r = radius;
        const wob = Math.sin(t * 0.018) * r * 0.25;
        ctx.rotate(angle);
        for (let k = 1; k <= 5; k++) {
            const tx = -r * 0.9 * k;
            const ty = Math.sin(t * 0.02 + k * 0.7) * r * 0.45;
            const ta = 0.55 - k * 0.10;
            const tr = r * (0.45 - k * 0.06);
            if (tr <= 0 || ta <= 0) break;
            ctx.fillStyle = `rgba(196, 181, 253, ${ta})`;
            ctx.beginPath(); ctx.arc(tx, ty, tr, 0, Math.PI * 2); ctx.fill();
        }
        ctx.shadowColor = '#9c7fe0';
        ctx.shadowBlur  = 8;
        ctx.strokeStyle = 'rgba(196, 181, 253, 0.85)';
        ctx.lineWidth = r * 0.55;
        ctx.lineCap = 'round';
        ctx.beginPath();
        ctx.moveTo(-r * 1.0, wob);
        ctx.quadraticCurveTo(0, -wob, r * 1.0, wob);
        ctx.stroke();
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.85)';
        ctx.lineWidth = r * 0.22;
        ctx.beginPath();
        ctx.moveTo(-r * 0.9, wob * 0.9);
        ctx.quadraticCurveTo(0, -wob * 0.9, r * 0.9, wob * 0.9);
        ctx.stroke();
        ctx.shadowBlur = 0;
        ctx.fillStyle = 'rgba(230, 220, 255, 0.95)';
        ctx.beginPath(); ctx.arc(r * 1.0, wob, r * 0.32, 0, Math.PI * 2); ctx.fill();
        const blink = (Math.sin(t * 0.04) + 1) * 0.5;
        ctx.fillStyle = `rgba(196, 181, 253, ${0.4 + blink * 0.4})`;
        ctx.beginPath(); ctx.arc(r * 0.2, -r * 0.6, r * 0.16, 0, Math.PI * 2); ctx.fill();
        ctx.beginPath(); ctx.arc(-r * 0.2, r * 0.6, r * 0.16, 0, Math.PI * 2); ctx.fill();
    } else {
        // Fallback / enemy
        ctx.beginPath(); ctx.arc(0, 0, radius, 0, Math.PI * 2);
        ctx.fillStyle = color; ctx.fill();
        ctx.shadowBlur = isCrit ? 20 : 10;
        ctx.shadowColor = isCrit ? '#fff' : color;
        ctx.fill();
    }

    if (isCrit) {
        ctx.strokeStyle = '#fff'; ctx.lineWidth = 2; ctx.stroke();
    }

    // EvilHeroes outline (purple-shadow projectiles).
    if (outlineColor) {
        ctx.strokeStyle = outlineColor;
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.arc(0, 0, radius + 2, 0, Math.PI * 2);
        ctx.stroke();
    }

    ctx.restore();
}

export function drawProjectiles(ctx, rs) {
    for (let i = 0; i < rs.projectileCount; i++) {
        _drawProjectileSlot(ctx, rs, i);
    }
}
