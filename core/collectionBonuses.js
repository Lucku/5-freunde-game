// Collector-card bonuses — shared by the client (UI/Collection.js, from the
// local save) and the online server (from each player's uploaded collection),
// so a card helps an online player exactly as it does in singleplayer.
import { COLLECTOR_CARDS } from '../Constants.js';

export function computeCollectionBonuses(collection, targetType) {
    const bonuses = {
        damageMult: 1,
        defenseMult: 1,
        xpMult: 1,
        critChance: 0,
        specials: []
    };
    if (!collection) return bonuses;
    collection.forEach(key => {
        const card = COLLECTOR_CARDS[key];
        if (!card || !card.bonus) return;

        if (card.bonus.target === targetType || card.bonus.type === 'special') {
            if (card.bonus.type === 'damage_vs')  bonuses.damageMult  += card.bonus.val;
            if (card.bonus.type === 'defense_vs') bonuses.defenseMult -= card.bonus.val;
            if (card.bonus.type === 'xp_vs')      bonuses.xpMult      += card.bonus.val;
            if (card.bonus.type === 'crit_vs')    bonuses.critChance  += card.bonus.val;
            if (card.bonus.type === 'special')    bonuses.specials.push(card.bonus.id);
        }
    });
    return bonuses;
}
