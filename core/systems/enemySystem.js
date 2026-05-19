// #5 phase 5.11 (skeleton) — Enemy ECS system.
//
// Storage layout per `tasks/ecs-enemy-boss-design.md`. This file ships
// the typed-array allocation + minimal helper API; the compat shim
// (`Enemy.js` as factory returning slot proxies) and the mixed-storage
// `enemies` sentinel land in 5.11b in a follow-up session — the
// Enemy class's 591-LOC constructor + 220-LOC update + 170-LOC draw
// require careful per-subtype mapping that's beyond one-session scope.
//
// Storage on runState:
//   enemyX/Y                  : Float32Array
//   enemyHp/maxHp/damage      : Float32Array
//   enemyRadius/speed         : Float32Array
//   enemyXpValue              : Float32Array
//   enemyAlpha/biomeSpeedMod  : Float32Array
//   enemyColor                : Uint16Array (palette ord)
//   enemySides                : Uint8Array
//   enemySubType              : Uint8Array (ord into ENEMY_SUBTYPES)
//   enemyShootCooldown        : Int32Array
//   enemySummonCooldown       : Int32Array
//   enemyFrozenTimer          : Int32Array
//   enemySlowTimer            : Int32Array
//   enemyPoisonStacks         : Int32Array
//   enemyHitFlashTimer        : Int32Array
//   enemyFlags                : Uint8Array (bitfield: isElite, isSummonedMinion, _ghost, dead)
//   enemyEliteType            : Array (object refs — eliteType config)
//   enemyParentBoss           : Array (Boss ref)
//   enemyTargetPreference     : Array (string|null)
//   enemyBodyGradient         : Array (lazy gradient cache)
//   enemyId                   : Int32Array (network ghost ID)
//   enemyExtras               : Array (per-slot custom `_*` field bag)
//   enemySlotProxy            : Array
//   enemyCount                : number
//
// `bossInstances` (regular array, NOT typed) is added by RunState so the
// mixed-storage sentinel in 5.11b can iterate `enemyCount` ECS slots
// followed by `bossInstances.length` class instances. Bosses stay as
// class instances until phase 5.12 migrates them too.

export const MAX_ENEMIES = 256;

// Subtype enum — base 11 subtypes + DLC-extended.
export const ENEMY_SUBTYPES = [
    'BASIC', 'SHOOTER', 'BRUTE', 'SPEEDSTER', 'SWARM',
    'SUMMONER', 'GHOST', 'SNIPER', 'BOMBER', 'TOXIC', 'SHIELDER',
    'GOBLIN',
];
const _subtypeOrdinal = new Map();
ENEMY_SUBTYPES.forEach((t, i) => _subtypeOrdinal.set(t, i));

export function getOrAddSubtypeOrdinal(type) {
    let ord = _subtypeOrdinal.get(type);
    if (ord !== undefined) return ord;
    ord = ENEMY_SUBTYPES.length;
    ENEMY_SUBTYPES.push(type);
    _subtypeOrdinal.set(type, ord);
    return ord;
}

// ── Flag bitfield ──────────────────────────────────────────────────────────
export const ENEMY_FLAG = {
    IS_ELITE:           1 << 0,
    IS_SUMMONED_MINION: 1 << 1,
    GHOST:              1 << 2,
    DEAD:               1 << 3,
};

// ── Palette interning ──────────────────────────────────────────────────────
const _palette = [];
const _paletteByKey = new Map();
export function internEnemyColor(color) {
    let idx = _paletteByKey.get(color);
    if (idx !== undefined) return idx;
    idx = _palette.length;
    _palette.push(color);
    _paletteByKey.set(color, idx);
    return idx;
}
export function getEnemyPaletteColor(ord) { return _palette[ord]; }

// ── System API ─────────────────────────────────────────────────────────────

export function initEnemies(rs) {
    rs.enemyX                = new Float32Array(MAX_ENEMIES);
    rs.enemyY                = new Float32Array(MAX_ENEMIES);
    rs.enemyHp               = new Float32Array(MAX_ENEMIES);
    rs.enemyMaxHp            = new Float32Array(MAX_ENEMIES);
    rs.enemyDamage           = new Float32Array(MAX_ENEMIES);
    rs.enemyRadius           = new Float32Array(MAX_ENEMIES);
    rs.enemySpeed            = new Float32Array(MAX_ENEMIES);
    rs.enemyXpValue          = new Float32Array(MAX_ENEMIES);
    rs.enemyAlpha            = new Float32Array(MAX_ENEMIES);
    rs.enemyBiomeSpeedMod    = new Float32Array(MAX_ENEMIES);
    rs.enemyColor            = new Uint16Array(MAX_ENEMIES);
    rs.enemySides            = new Uint8Array(MAX_ENEMIES);
    rs.enemySubType          = new Uint8Array(MAX_ENEMIES);
    rs.enemyShootCooldown    = new Int32Array(MAX_ENEMIES);
    rs.enemySummonCooldown   = new Int32Array(MAX_ENEMIES);
    rs.enemyFrozenTimer      = new Int32Array(MAX_ENEMIES);
    rs.enemySlowTimer        = new Int32Array(MAX_ENEMIES);
    rs.enemyPoisonStacks     = new Int32Array(MAX_ENEMIES);
    rs.enemyHitFlashTimer    = new Int32Array(MAX_ENEMIES);
    rs.enemyFlags            = new Uint8Array(MAX_ENEMIES);
    rs.enemyEliteType        = new Array(MAX_ENEMIES).fill(null);
    rs.enemyParentBoss       = new Array(MAX_ENEMIES).fill(null);
    rs.enemyTargetPreference = new Array(MAX_ENEMIES).fill(null);
    rs.enemyBodyGradient     = new Array(MAX_ENEMIES).fill(null);
    rs.enemyId               = new Int32Array(MAX_ENEMIES);
    rs.enemyExtras           = new Array(MAX_ENEMIES).fill(null);
    rs.enemySlotProxy        = new Array(MAX_ENEMIES).fill(null);
    rs.enemyCount            = 0;

    // Mixed-storage scaffold: Boss class instances live here until 5.12.
    // The `enemies` sentinel in 5.11b iterates ECS slots first then this
    // array. Initialized here so consumers can read it without an
    // undefined-check.
    rs.bossInstances         = [];
}

// Allocate a slot. Returns slot index or -1 on cap. Caller writes
// per-subtype fields after acquire.
export function allocEnemySlot(rs) {
    const i = rs.enemyCount;
    if (i >= MAX_ENEMIES) return -1;
    // Reset to safe defaults — caller overwrites what it needs.
    rs.enemyAlpha[i]            = 1;
    rs.enemyBiomeSpeedMod[i]    = 1;
    rs.enemyShootCooldown[i]    = 0;
    rs.enemySummonCooldown[i]   = 0;
    rs.enemyFrozenTimer[i]      = 0;
    rs.enemySlowTimer[i]        = 0;
    rs.enemyPoisonStacks[i]     = 0;
    rs.enemyHitFlashTimer[i]    = 0;
    rs.enemyFlags[i]            = 0;
    rs.enemyEliteType[i]        = null;
    rs.enemyParentBoss[i]       = null;
    rs.enemyTargetPreference[i] = null;
    rs.enemyBodyGradient[i]     = null;
    rs.enemyId[i]               = 0;
    rs.enemyExtras[i]           = null;
    rs.enemySlotProxy[i]        = null;
    rs.enemyCount               = i + 1;
    return i;
}

export function killEnemy(rs, i) {
    const last = rs.enemyCount - 1;
    // Capture the proxy that actually dies BEFORE the swap stomps the slot
    // ref. When i != last, this is the proxy originally at slot i (the one
    // whose hp hit zero). When i == last, this is the only proxy involved.
    const dyingProxy = rs.enemySlotProxy[i];
    if (i !== last) {
        rs.enemyX[i]                = rs.enemyX[last];
        rs.enemyY[i]                = rs.enemyY[last];
        rs.enemyHp[i]               = rs.enemyHp[last];
        rs.enemyMaxHp[i]            = rs.enemyMaxHp[last];
        rs.enemyDamage[i]           = rs.enemyDamage[last];
        rs.enemyRadius[i]           = rs.enemyRadius[last];
        rs.enemySpeed[i]            = rs.enemySpeed[last];
        rs.enemyXpValue[i]          = rs.enemyXpValue[last];
        rs.enemyAlpha[i]            = rs.enemyAlpha[last];
        rs.enemyBiomeSpeedMod[i]    = rs.enemyBiomeSpeedMod[last];
        rs.enemyColor[i]            = rs.enemyColor[last];
        rs.enemySides[i]            = rs.enemySides[last];
        rs.enemySubType[i]          = rs.enemySubType[last];
        rs.enemyShootCooldown[i]    = rs.enemyShootCooldown[last];
        rs.enemySummonCooldown[i]   = rs.enemySummonCooldown[last];
        rs.enemyFrozenTimer[i]      = rs.enemyFrozenTimer[last];
        rs.enemySlowTimer[i]        = rs.enemySlowTimer[last];
        rs.enemyPoisonStacks[i]     = rs.enemyPoisonStacks[last];
        rs.enemyHitFlashTimer[i]    = rs.enemyHitFlashTimer[last];
        rs.enemyFlags[i]            = rs.enemyFlags[last];
        rs.enemyEliteType[i]        = rs.enemyEliteType[last];
        rs.enemyParentBoss[i]       = rs.enemyParentBoss[last];
        rs.enemyTargetPreference[i] = rs.enemyTargetPreference[last];
        rs.enemyBodyGradient[i]     = rs.enemyBodyGradient[last];
        rs.enemyId[i]               = rs.enemyId[last];
        rs.enemyExtras[i]           = rs.enemyExtras[last];
        rs.enemySlotProxy[i]        = rs.enemySlotProxy[last];
        if (rs.enemySlotProxy[i]) rs.enemySlotProxy[i]._slot = i;
    }
    rs.enemyEliteType[last]        = null;
    rs.enemyParentBoss[last]       = null;
    rs.enemyTargetPreference[last] = null;
    rs.enemyBodyGradient[last]     = null;
    rs.enemyExtras[last]           = null;
    rs.enemySlotProxy[last]        = null;
    // Mark the dying proxy dead — but only if it's not the same object that
    // we just moved into slot i (when i == last, dyingProxy was the only
    // proxy and we already nulled rs.enemySlotProxy[last]).
    if (dyingProxy && dyingProxy !== rs.enemySlotProxy[i]) dyingProxy._slot = -1;
    rs.enemyCount = last;
}

export function clearEnemies(rs) {
    for (let i = 0; i < rs.enemyCount; i++) {
        rs.enemyEliteType[i]        = null;
        rs.enemyParentBoss[i]       = null;
        rs.enemyTargetPreference[i] = null;
        rs.enemyBodyGradient[i]     = null;
        rs.enemyExtras[i]           = null;
        if (rs.enemySlotProxy[i]) rs.enemySlotProxy[i]._slot = -1;
        rs.enemySlotProxy[i]        = null;
    }
    rs.enemyCount = 0;
    // bossInstances also cleared — wave reset semantics.
    if (rs.bossInstances) rs.bossInstances.length = 0;
}

export function getEnemySubType(rs, i) {
    return ENEMY_SUBTYPES[rs.enemySubType[i]];
}

export function hasEnemyFlag(rs, i, flag) {
    return (rs.enemyFlags[i] & flag) !== 0;
}

export function setEnemyFlag(rs, i, flag, on) {
    if (on) rs.enemyFlags[i] |=  flag;
    else    rs.enemyFlags[i] &= ~flag;
}

// ── EnemySlot proxy ────────────────────────────────────────────────────────
//
// Lazy-built per-slot proxy. Methods (`update`, `draw`) resolve via the
// prototype chain to `Enemy.prototype` — the proxy's `getPrototypeOf` trap
// returns the EnemyProto registered via `registerEnemyPrototype` at module
// load time. The shim in `Enemy.js` sets this up.

let _EnemyProto = null;
export function registerEnemyPrototype(proto) { _EnemyProto = proto; }

class EnemySlotInternal {
    constructor(rs, slot) {
        this._rs = rs;
        this._slot = slot;
    }
    _slotIdx() { return this._slot; }
    _getExtra(name) {
        if (this._slot < 0) return undefined;
        const x = this._rs.enemyExtras[this._slot];
        return x ? x[name] : undefined;
    }
    _setExtra(name, v) {
        if (this._slot < 0) return;
        let x = this._rs.enemyExtras[this._slot];
        if (!x) { x = {}; this._rs.enemyExtras[this._slot] = x; }
        x[name] = v;
    }
}

// Typed-array-backed field accessors. Each entry: [fieldName, arrayKey].
const _F32 = [
    ['x', 'enemyX'], ['y', 'enemyY'],
    ['hp', 'enemyHp'], ['maxHp', 'enemyMaxHp'], ['damage', 'enemyDamage'],
    ['radius', 'enemyRadius'], ['speed', 'enemySpeed'],
    ['xpValue', 'enemyXpValue'],
    ['alpha', 'enemyAlpha'], ['biomeSpeedMod', 'enemyBiomeSpeedMod'],
];
const _I32 = [
    ['shootCooldown', 'enemyShootCooldown'],
    ['summonCooldown', 'enemySummonCooldown'],
    ['frozenTimer', 'enemyFrozenTimer'],
    ['slowTimer', 'enemySlowTimer'],
    ['poisonStacks', 'enemyPoisonStacks'],
    ['hitFlashTimer', 'enemyHitFlashTimer'],
];
const _U8 = [
    ['sides', 'enemySides'],
];
const _OBJ = [
    ['eliteType', 'enemyEliteType'],
    ['parentBoss', 'enemyParentBoss'],
    ['targetPreference', 'enemyTargetPreference'],
    ['_bodyGradient', 'enemyBodyGradient'],
];

for (const [name, key] of _F32) {
    Object.defineProperty(EnemySlotInternal.prototype, name, {
        get() { return this._slot >= 0 ? this._rs[key][this._slot] : 0; },
        set(v) { if (this._slot >= 0) this._rs[key][this._slot] = v; },
        configurable: true,
    });
}
for (const [name, key] of _I32) {
    Object.defineProperty(EnemySlotInternal.prototype, name, {
        get() { return this._slot >= 0 ? this._rs[key][this._slot] : 0; },
        set(v) { if (this._slot >= 0) this._rs[key][this._slot] = v; },
        configurable: true,
    });
}
for (const [name, key] of _U8) {
    Object.defineProperty(EnemySlotInternal.prototype, name, {
        get() { return this._slot >= 0 ? this._rs[key][this._slot] : 0; },
        set(v) { if (this._slot >= 0) this._rs[key][this._slot] = v; },
        configurable: true,
    });
}
for (const [name, key] of _OBJ) {
    Object.defineProperty(EnemySlotInternal.prototype, name, {
        get() { return this._slot >= 0 ? this._rs[key][this._slot] : null; },
        set(v) { if (this._slot >= 0) this._rs[key][this._slot] = v; },
        configurable: true,
    });
}
// Color — palette-interned string ↔ Uint16 ord.
Object.defineProperty(EnemySlotInternal.prototype, 'color', {
    get() { return this._slot >= 0 ? _palette[this._rs.enemyColor[this._slot]] : '#fff'; },
    set(v) { if (this._slot >= 0) this._rs.enemyColor[this._slot] = internEnemyColor(v); },
    configurable: true,
});
// Subtype — palette-style enum.
Object.defineProperty(EnemySlotInternal.prototype, 'subType', {
    get() { return this._slot >= 0 ? ENEMY_SUBTYPES[this._rs.enemySubType[this._slot]] : ''; },
    set(v) { if (this._slot >= 0) this._rs.enemySubType[this._slot] = getOrAddSubtypeOrdinal(v); },
    configurable: true,
});
// `_id` int.
Object.defineProperty(EnemySlotInternal.prototype, '_id', {
    get() { return this._slot >= 0 ? this._rs.enemyId[this._slot] : 0; },
    set(v) { if (this._slot >= 0) this._rs.enemyId[this._slot] = v; },
    configurable: true,
});
// Boolean flags.
function _flagAccessor(name, flag) {
    Object.defineProperty(EnemySlotInternal.prototype, name, {
        get() { return this._slot >= 0 && (this._rs.enemyFlags[this._slot] & flag) !== 0; },
        set(v) { if (this._slot >= 0) setEnemyFlag(this._rs, this._slot, flag, v); },
        configurable: true,
    });
}
_flagAccessor('isElite', ENEMY_FLAG.IS_ELITE);
_flagAccessor('isSummonedMinion', ENEMY_FLAG.IS_SUMMONED_MINION);
_flagAccessor('_ghost', ENEMY_FLAG.GHOST);
_flagAccessor('dead', ENEMY_FLAG.DEAD);

// `_world` is a per-slot extras field — DLC patches frequently read it.
// Use extras storage to keep it slot-bound without growing typed-array surface.

// Reserved-name set: properties the Proxy handler routes via class accessors
// (NOT via extras). Anything else with `_` prefix flows to extras storage.
const _RESERVED = new Set([
    '_rs', '_slot', '_slotIdx', '_getExtra', '_setExtra',
    '_id', '_ghost', '_bodyGradient',
]);

const _proxyHandler = {
    get(target, prop) {
        if (typeof prop === 'string' && prop.charCodeAt(0) === 95 /* '_' */ && !_RESERVED.has(prop)) {
            return target._getExtra(prop);
        }
        if (prop in target) return target[prop];
        // Fall back to prototype chain (Enemy.prototype methods like update/draw).
        if (_EnemyProto && prop in _EnemyProto) return _EnemyProto[prop];
        return undefined;
    },
    set(target, prop, value) {
        if (typeof prop === 'string' && prop.charCodeAt(0) === 95 && !_RESERVED.has(prop)) {
            target._setExtra(prop, value);
            return true;
        }
        target[prop] = value;
        return true;
    },
    has(target, prop) {
        return prop in target || (_EnemyProto !== null && prop in _EnemyProto);
    },
    getPrototypeOf() {
        return _EnemyProto;
    },
};

export function acquireEnemySlot(rs, slot) {
    if (rs.enemySlotProxy[slot]) return rs.enemySlotProxy[slot];
    const inner = new EnemySlotInternal(rs, slot);
    const proxy = new Proxy(inner, _proxyHandler);
    rs.enemySlotProxy[slot] = proxy;
    return proxy;
}

/**
 * Copy all own properties from `srcThis` (the throwaway `this` of the
 * Enemy constructor body) into the ECS slot. Known fields land in their
 * typed-array slot; unknown `_*` and miscellaneous fields land in extras.
 * After this call, `proxy.X` reads return the same values that
 * `srcThis.X` had.
 */
export function copyToEnemySlot(rs, slot, srcThis) {
    const proxy = acquireEnemySlot(rs, slot);
    for (const k of Object.keys(srcThis)) {
        try {
            proxy[k] = srcThis[k];
        } catch (e) { void e; }
    }
    return proxy;
}
