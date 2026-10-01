// Hero skill-tree generator — pure data, shared by the renderer (UI/SkillTree.js,
// Player.getHeroStats) and the server simulation (server/simulation/loader.js).
// Online co-op computes each player's stats on the server from their uploaded
// progression, so both sides must build exactly the same tree for a hero:
// deterministic from the hero type (seeded) plus the hero's optional
// HERO_LOGIC hooks (`getSkillTreeWeights`, `getSkillNodeDetails`).

import { SKILL_TREE_SIZE } from '../Constants.js';

function _heroLogic(type) {
    const reg = globalThis.HERO_LOGIC;
    return (reg && reg[type]) ? reg[type] : null;
}

export function generateHeroSkillTree(type) {
    const tree = [];
    const weights = {
        fire: { DAMAGE: 0.25, EXPLODE_CHANCE: 0.30, SPEED: 0.10, COOLDOWN: 0.15, HEALTH: 0.10, ULT_DAMAGE: 0.10 },
        water: { COOLDOWN: 0.30, KNOCK: 0.30, SPEED: 0.20, HEALTH: 0.10, ULT_SPEED: 0.10 },
        ice: { PIERCE: 0.30, COOLDOWN: 0.15, DAMAGE: 0.20, HEALTH: 0.15, ULT_DAMAGE: 0.10, ULT_SPEED: 0.10 },
        plant: { SPLIT: 0.25, HEALTH: 0.30, DAMAGE: 0.10, COOLDOWN: 0.15, ULT_DAMAGE: 0.20 },
        metal: { MELEE: 0.25, ARMOR: 0.30, HEALTH: 0.25, DAMAGE: 0.10, ULT_DAMAGE: 0.10 },
        black: { DAMAGE: 1.0 }
    };

    const _hlSt = _heroLogic(type);
    if (_hlSt && _hlSt.getSkillTreeWeights) {
        weights[type] = _hlSt.getSkillTreeWeights();
    }

    const w = weights[type];
    const types = [];
    for (const k in w) {
        const count = Math.floor(w[k] * 100);
        for (let i = 0; i < count; i++) types.push(k);
    }
    while (types.length < 100) types.push('DAMAGE');

    // Hash type string into seed so heroes with same name length get distinct trees
    let seed = 0;
    for (let i = 0; i < type.length; i++) {
        seed = ((seed << 5) - seed) + type.charCodeAt(i);
        seed |= 0;
    }
    seed = (seed >>> 0) || 1;
    const random = () => {
        const x = Math.sin(seed++) * 10000;
        return x - Math.floor(x);
    };

    const size = SKILL_TREE_SIZE;

    for (let i = 0; i < size; i++) {
        const idx = Math.floor(random() * types.length);
        const t = types[idx];

        let val = 0;
        let desc = "";

        if (t === 'DAMAGE') { val = 0.02; desc = "+2% Damage"; }
        if (t === 'HEALTH') { val = 0.02; desc = "+2% Max HP"; }
        if (t === 'SPEED') { val = 0.01; desc = "+1% Move Speed"; }
        if (t === 'COOLDOWN') { val = 0.01; desc = "-1% Cooldowns"; }
        if (t === 'ULT_DAMAGE') { val = 0.05; desc = "+5% Ult Dmg"; }
        if (t === 'ULT_SPEED') { val = 0.05; desc = "+5% Ult Spd"; }

        if (t === 'BLAST') { val = 0.05; desc = "+5% Blast Radius"; }
        if (t === 'EXPLODE_CHANCE') { val = 0.05; desc = "+5% Explode Chance"; }
        if (t === 'KNOCK') { val = 0.05; desc = "+5% Knockback"; }
        if (t === 'PIERCE') { val = 1; desc = "+1 Pierce Count"; }
        if (t === 'SPLIT') { val = 1; desc = "+1 Proj / -20% Dmg"; }
        if (t === 'ARMOR') { val = 0.01; desc = "+1% Dmg Reduction"; }
        if (t === 'MELEE') { val = 0.05; desc = "+5% Melee Size"; }

        const _hlNode = _heroLogic(type);
        if (_hlNode && _hlNode.getSkillNodeDetails) {
            const details = _hlNode.getSkillNodeDetails(t, val, desc);
            val = details.val;
            desc = details.desc;
        }

        if ((i + 1) % 10 === 0) {
            if (t === 'PIERCE' || t === 'SPLIT') val += 1;
            else val *= 5;
            desc = "MAJOR: " + desc;
        }
        tree.push({ id: i, type: t, value: val, desc: desc });
    }
    return tree;
}
