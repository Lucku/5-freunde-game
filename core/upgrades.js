// Level-up upgrade effects — shared by singleplayer (UI/LevelUp.js) and the
// online server (server/simulation/GameSession.js). An online pick must change
// exactly the stats a singleplayer pick changes: the server used its own
// generic switch (speed ×1.1 instead of +0.1, a 0.8 defense cap instead of 0.5,
// no Multishot damage split, no Fortune / Ultimate Form), so the client
// predicted one hero and the server simulated another.
//
// Returns true when the upgrade was applied (by the hero's own `applyUpgrade`
// hook or by the built-in table), false for an unknown id.
//   heroLogic   — HERO_LOGIC entry of the player's hero (optional)
//   world       — passed to the hero hook as its third argument (optional)
//   onTransform — presentation for Ultimate Form (notification, burst, voice)
export function applyUpgrade(player, type, { heroLogic = null, world, onTransform } = {}) {
    if (heroLogic && typeof heroLogic.applyUpgrade === 'function'
            && heroLogic.applyUpgrade(player, type, world)) {
        return true;
    }

    switch (type) {
        case 'health':
            player.maxHp += 25;
            player.hp = Math.min(player.maxHp, player.hp + (player.maxHp * 0.2));
            player.runBuffs.maxHp += 25;
            return true;
        case 'radius':
            player.meleeRadius *= 1.25;
            return true;
        case 'projectile':
            player.extraProjectiles += 1;
            player.runBuffs.projectiles += 1;
            // Balance: -20% Damage (Additive divisor) per split, similar to Skill Tree
            player.stats.rangeDmg /= 1.2;
            return true;
        case 'speed':    player.speedMultiplier += 0.1; player.runBuffs.speed += 0.1; return true;
        case 'cooldown': player.cooldownMultiplier *= 0.9; player.runBuffs.cooldown += 0.1; return true;
        case 'defense':  player.damageReduction = Math.min(0.5, player.damageReduction + 0.05); player.runBuffs.defense += 0.05; return true;
        case 'damage':   player.damageMultiplier += 0.1; player.runBuffs.damage += 0.1; return true;
        case 'luck':     player.maskChance += 0.005; player.runBuffs.luck += 0.005; return true;
        case 'crit':     player.critChance += 0.05; player.critMultiplier += 0.2; return true;
        case 'transform':
            player.transformActive = true;
            player.currentForm = player.getFormName();
            if (onTransform) onTransform(player);
            return true;
        default:
            return false;
    }
}
