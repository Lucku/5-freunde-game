// #5 phase 5.6 — MemoryShard ECS system. Replaces `class MemoryShard` from
// MemoryShard.js with component arrays on runState. Drop on Memory levels +
// boss-death wave breakpoints; pickup reveals a hero-keyed memory story line
// (see core/updateGameplayMid.js's pickup-dispatch loop).
//
// Storage layout per tasks/ecs-design.md (dense head + swap-with-last):
//   runState.memoryShardX        : Float32Array
//   runState.memoryShardY        : Float32Array
//   runState.memoryShardColor    : Uint16Array      // palette ordinal
//   runState.memoryShardHeroType : string[]         // 'fire' | 'water' | … | DLC types
//   runState.memoryShardCount    : number
//
// `floatOffset` (per-frame sin animation) was a per-instance field in the
// class but the value is `Math.sin(Date.now()/500)*5` — identical for every
// shard at any given frame, so we compute it once per draw call instead of
// storing it per slot.
//
// DLC color overrides: the class read `window._MEMORY_SHARD_COLORS[type]`
// before falling back to a switch. Same path preserved here in
// `_getColorByType` so DLCs that set the global table still work. The
// `dlc/echos_of_eternity/index.js` `MemoryShard.prototype.getColorByType`
// patch becomes a guarded no-op (`typeof MemoryShard !== 'undefined'` is
// now false), but its override was redundant — `'time'` was already in the
// fallback switch with the same hex.

export const MAX_MEMORYSHARDS = 32;
export const MEMORYSHARD_RADIUS = 15;

// ── Palette interning ──────────────────────────────────────────────────────
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

function _getColorByType(type) {
    if (typeof window !== 'undefined' && window._MEMORY_SHARD_COLORS && window._MEMORY_SHARD_COLORS[type]) {
        return window._MEMORY_SHARD_COLORS[type];
    }
    switch (type) {
        case 'fire':        return '#e74c3c';
        case 'water':       return '#3498db';
        case 'ice':         return '#aac8da';
        case 'plant':       return '#2ecc71';
        case 'metal':       return '#95a5a6';
        case 'earth':       return '#8d6e63';
        case 'lightning':   return '#f1c40f';
        case 'gravity':     return '#9b59b6';
        case 'void':        return '#00bcd4';
        case 'spirit':      return '#f0d080';
        case 'chance':      return '#e040fb';
        case 'time':        return '#c8aa6e';
        case 'love':        return '#ff6b9d';
        case 'air':         return '#40e0d0';
        case 'black':       return '#2c3e50';
        case 'green_goblin':
        case 'goblin':      return '#27ae60';
        case 'makuta':      return '#8e44ad';
        default:            return '#ffffff';
    }
}

// ── System API ─────────────────────────────────────────────────────────────

export function initMemoryShards(rs) {
    rs.memoryShardX        = new Float32Array(MAX_MEMORYSHARDS);
    rs.memoryShardY        = new Float32Array(MAX_MEMORYSHARDS);
    rs.memoryShardColor    = new Uint16Array(MAX_MEMORYSHARDS);
    rs.memoryShardHeroType = new Array(MAX_MEMORYSHARDS).fill('');
    rs.memoryShardCount    = 0;
}

export function spawnMemoryShard(rs, x, y, heroType) {
    const i = rs.memoryShardCount;
    if (i >= MAX_MEMORYSHARDS) return -1;
    rs.memoryShardX[i]        = x;
    rs.memoryShardY[i]        = y;
    rs.memoryShardColor[i]    = _internColor(_getColorByType(heroType));
    rs.memoryShardHeroType[i] = heroType;
    rs.memoryShardCount       = i + 1;
    return i;
}

export function killMemoryShard(rs, i) {
    const last = rs.memoryShardCount - 1;
    if (i !== last) {
        rs.memoryShardX[i]        = rs.memoryShardX[last];
        rs.memoryShardY[i]        = rs.memoryShardY[last];
        rs.memoryShardColor[i]    = rs.memoryShardColor[last];
        rs.memoryShardHeroType[i] = rs.memoryShardHeroType[last];
    }
    rs.memoryShardHeroType[last] = '';
    rs.memoryShardCount = last;
}

export function clearMemoryShards(rs) {
    for (let i = 0; i < rs.memoryShardCount; i++) rs.memoryShardHeroType[i] = '';
    rs.memoryShardCount = 0;
}

export function getMemoryShardColor(rs, i) {
    return _palette[rs.memoryShardColor[i]];
}

export function drawMemoryShards(ctx, rs) {
    // floatOffset is global (Date.now() based), same for every shard.
    const floatOffset = Math.sin(Date.now() / 500) * 5;
    for (let i = 0; i < rs.memoryShardCount; i++) {
        const color = _palette[rs.memoryShardColor[i]];
        ctx.save();
        ctx.translate(rs.memoryShardX[i], rs.memoryShardY[i] + floatOffset);

        // Glow
        ctx.shadowBlur = 20;
        ctx.shadowColor = color;

        // Diamond
        ctx.fillStyle = color;
        ctx.beginPath();
        ctx.moveTo(0, -15);
        ctx.lineTo(10, 0);
        ctx.lineTo(0, 15);
        ctx.lineTo(-10, 0);
        ctx.closePath();
        ctx.fill();

        // Inner highlight
        ctx.fillStyle = '#fff';
        ctx.globalAlpha = 0.5;
        ctx.beginPath();
        ctx.moveTo(0, -8);
        ctx.lineTo(5, 0);
        ctx.lineTo(0, 8);
        ctx.lineTo(-5, 0);
        ctx.closePath();
        ctx.fill();

        ctx.restore();
    }
}
