// #5 phase 5.2 — CardDrop ECS system. Replaces `class CardDrop` from
// Entities/CardDrop.js with component arrays on runState. Drops on field,
// pickup adds card to collection. No timer — cards persist until picked up
// (same as the original class).
//
// Storage layout per tasks/ecs-design.md (dense head + swap-with-last):
//   runState.cardDropX        : Float32Array
//   runState.cardDropY        : Float32Array
//   runState.cardDropAngle    : Float32Array
//   runState.cardDropScale    : Float32Array
//   runState.cardDropScaleDir : Float32Array
//   runState.cardDropKey      : string[]            // cardKey lookup into COLLECTOR_CARDS
//   runState.cardDropCount    : number
//
// `cardKey` stays a regular string array — keys are arbitrary
// game-content identifiers (e.g., `enemyType_idx`), not enumerated.

export const MAX_CARDDROPS = 32;
export const CARDDROP_RADIUS = 20;

export function initCardDrops(rs) {
    rs.cardDropX        = new Float32Array(MAX_CARDDROPS);
    rs.cardDropY        = new Float32Array(MAX_CARDDROPS);
    rs.cardDropAngle    = new Float32Array(MAX_CARDDROPS);
    rs.cardDropScale    = new Float32Array(MAX_CARDDROPS);
    rs.cardDropScaleDir = new Float32Array(MAX_CARDDROPS);
    rs.cardDropKey      = new Array(MAX_CARDDROPS).fill(null);
    rs.cardDropCount    = 0;
}

export function spawnCardDrop(rs, x, y, cardKey) {
    const i = rs.cardDropCount;
    if (i >= MAX_CARDDROPS) return -1;
    rs.cardDropX[i]        = x;
    rs.cardDropY[i]        = y;
    rs.cardDropAngle[i]    = 0;
    rs.cardDropScale[i]    = 1;
    rs.cardDropScaleDir[i] = 0.01;
    rs.cardDropKey[i]      = cardKey;
    rs.cardDropCount       = i + 1;
    return i;
}

export function killCardDrop(rs, i) {
    const last = rs.cardDropCount - 1;
    if (i !== last) {
        rs.cardDropX[i]        = rs.cardDropX[last];
        rs.cardDropY[i]        = rs.cardDropY[last];
        rs.cardDropAngle[i]    = rs.cardDropAngle[last];
        rs.cardDropScale[i]    = rs.cardDropScale[last];
        rs.cardDropScaleDir[i] = rs.cardDropScaleDir[last];
        rs.cardDropKey[i]      = rs.cardDropKey[last];
    }
    rs.cardDropKey[last] = null;
    rs.cardDropCount = last;
}

export function clearCardDrops(rs) {
    for (let i = 0; i < rs.cardDropCount; i++) rs.cardDropKey[i] = null;
    rs.cardDropCount = 0;
}

export function drawCardDrops(ctx, rs) {
    for (let i = 0; i < rs.cardDropCount; i++) {
        // Animation tick — original CardDrop.draw() mutated angle/scale per call.
        rs.cardDropAngle[i] += 0.02;
        rs.cardDropScale[i] += rs.cardDropScaleDir[i];
        if (rs.cardDropScale[i] > 1.1 || rs.cardDropScale[i] < 0.9) {
            rs.cardDropScaleDir[i] *= -1;
        }

        ctx.save();
        ctx.translate(rs.cardDropX[i], rs.cardDropY[i]);
        ctx.rotate(rs.cardDropAngle[i]);
        ctx.scale(rs.cardDropScale[i], rs.cardDropScale[i]);

        // Card body
        ctx.fillStyle = '#fff';
        ctx.fillRect(-10, -14, 20, 28);
        ctx.strokeStyle = '#000';
        ctx.lineWidth = 1;
        ctx.strokeRect(-10, -14, 20, 28);

        // Inner — colored by COLLECTOR_CARDS entry.
        const card = (typeof COLLECTOR_CARDS !== 'undefined') ? COLLECTOR_CARDS[rs.cardDropKey[i]] : null;
        ctx.fillStyle = card ? card.color : '#333';
        ctx.fillRect(-8, -12, 16, 24);

        // Icon
        ctx.fillStyle = '#fff';
        ctx.font = 'bold 14px Arial';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText('C', 0, 1);

        ctx.restore();
    }
}
