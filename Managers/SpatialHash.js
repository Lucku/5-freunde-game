/**
 * SpatialHash — uniform-grid broad-phase collision index.
 *
 * Build once per frame from a list of point-like entities, then query()
 * returns only candidates whose cell overlaps a circular query region.
 * Reduces O(N×M) nested collision scans to ~O(M × avg-per-cell), which is
 * typically ~10× faster at wave-30+ entity counts (200+ enemies).
 *
 * Usage:
 *   const hash = new SpatialHash(128);          // cell size in world px
 *   hash.rebuild(enemies);                       // each entity must have x, y
 *   for (const e of hash.query(px, py, 100)) {   // returns array, may contain
 *       // dist check ...                         // entities slightly outside r
 *   }
 *
 * Why 128 px default: typical enemy radius is 12–30, projectile radius 4–10,
 * largest melee radius 80. 128 covers most queries in 1–2 cells, balancing
 * cell-count overhead vs candidate-count savings.
 *
 * Not thread-safe; not designed for incremental update — full rebuild only.
 */
class SpatialHash {
    constructor(cellSize = 128) {
        this.cellSize = cellSize;
        this._cells = new Map(); // 'cx,cy' → Array<entity>
    }

    clear() {
        this._cells.clear();
    }

    _key(cx, cy) { return cx + ',' + cy; }

    _cellCoords(x, y) {
        return [Math.floor(x / this.cellSize), Math.floor(y / this.cellSize)];
    }

    insert(entity) {
        const [cx, cy] = this._cellCoords(entity.x, entity.y);
        const k = this._key(cx, cy);
        let bucket = this._cells.get(k);
        if (!bucket) { bucket = []; this._cells.set(k, bucket); }
        bucket.push(entity);
    }

    rebuild(entities) {
        this._cells.clear();
        for (let i = 0; i < entities.length; i++) {
            const e = entities[i];
            if (!e || e.x === undefined || e.y === undefined) continue;
            this.insert(e);
        }
    }

    /**
     * Return entities in cells overlapping the circle (qx, qy, radius).
     * Caller MUST do an exact distance check — cell-AABB queries are loose.
     */
    query(qx, qy, radius) {
        const out = [];
        const minCx = Math.floor((qx - radius) / this.cellSize);
        const maxCx = Math.floor((qx + radius) / this.cellSize);
        const minCy = Math.floor((qy - radius) / this.cellSize);
        const maxCy = Math.floor((qy + radius) / this.cellSize);
        for (let cy = minCy; cy <= maxCy; cy++) {
            for (let cx = minCx; cx <= maxCx; cx++) {
                const bucket = this._cells.get(this._key(cx, cy));
                if (bucket) {
                    for (let i = 0; i < bucket.length; i++) out.push(bucket[i]);
                }
            }
        }
        return out;
    }

    /** Diagnostic: total buckets + max bucket size. Useful for tuning cellSize. */
    stats() {
        let max = 0, total = 0;
        for (const b of this._cells.values()) {
            total += b.length;
            if (b.length > max) max = b.length;
        }
        return { buckets: this._cells.size, total, maxBucket: max };
    }
}

// ESM export — loaded via `<script type="module">` and consumed by Vitest tests.
// window shim retained so classic-script callers (game.js, etc.) still see it.
export { SpatialHash };
export default SpatialHash;
if (typeof window !== 'undefined') window.SpatialHash = SpatialHash;
