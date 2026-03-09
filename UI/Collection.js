class CollectionUI {
    getCollectionBonuses(targetType) {
        const bonuses = {
            damageMult: 1,
            defenseMult: 1,
            xpMult: 1,
            critChance: 0,
            specials: []
        };

        if (window.saveData && window.saveData.collection) {
            window.saveData.collection.forEach(key => {
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
        }
        return bonuses;
    }

    openCollection() {
        document.getElementById('menu-overlay').style.display = 'none';
        document.getElementById('collection-screen').style.display = 'flex';
        this.renderCollection();
        if (window.setUIState) window.setUIState('COLLECTION');
    }

    closeCollection() {
        document.getElementById('collection-screen').style.display = 'none';
        if (window.initMenu) window.initMenu();
    }

    renderCollection() {
        const container = document.getElementById('collection-grid');
        if (!container || typeof COLLECTOR_CARDS === 'undefined') return;

        container.innerHTML = '';

        // Helper: hex color → "r,g,b" string for CSS custom properties
        const hexRgb = hex => {
            const m = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
            return m ? `${parseInt(m[1],16)},${parseInt(m[2],16)},${parseInt(m[3],16)}` : '180,180,180';
        };

        const TIER_LABELS = ['BRONZE', 'SILVER', 'GOLD', 'PLAT'];
        const TIER_NUMS   = ['I', 'II', 'III', 'IV'];

        // Overall progress
        const allKeys = Object.keys(COLLECTOR_CARDS);
        const owned   = allKeys.filter(k => saveData.collection.includes(k)).length;
        const fillPct = allKeys.length ? (owned / allKeys.length * 100) : 0;

        const fillEl  = document.getElementById('coll-progress-fill');
        const labelEl = document.getElementById('coll-progress-label');
        if (fillEl)  fillEl.style.width  = fillPct + '%';
        if (labelEl) labelEl.textContent = `${owned} of ${allKeys.length} cards discovered`;

        // Discover unique enemy types preserving insertion order
        const types = [...new Set(
            allKeys
                .map(k => { const m = k.match(/^(.*)_\d+$/); return m?.[1]; })
                .filter(Boolean)
        )];

        types.forEach(type => {
            if (!COLLECTOR_CARDS[`${type}_1`]) return;

            const tiers      = [1, 2, 3, 4].filter(i => !!COLLECTOR_CARDS[`${type}_${i}`]);
            const setOwned   = tiers.filter(i => saveData.collection.includes(`${type}_${i}`)).length;
            const isComplete = setOwned === tiers.length;

            const setEl = document.createElement('div');
            setEl.className = 'coll-set' + (isComplete ? ' set-complete' : '');
            setEl.innerHTML = `
                <div class="coll-set-header">
                    <span class="coll-set-name">${type.replace(/_/g, ' ')}</span>
                    <span class="coll-set-progress${isComplete ? ' prog-complete' : ''}">${setOwned}&thinsp;/&thinsp;${tiers.length}</span>
                </div>
                <div class="coll-set-cards"></div>
            `;

            const cardsRow = setEl.querySelector('.coll-set-cards');

            tiers.forEach(i => {
                const key      = `${type}_${i}`;
                const card     = COLLECTOR_CARDS[key];
                const unlocked = saveData.collection.includes(key);
                const rgb      = hexRgb(card.color);

                const cardEl = document.createElement('div');
                cardEl.className = `coll-card card-tier-${i} ${unlocked ? 'unlocked' : 'locked'}`;
                cardEl.style.setProperty('--card-rgb', rgb);

                cardEl.innerHTML = `
                    <div class="coll-card-top">
                        <span class="coll-card-tier-label">${TIER_LABELS[i - 1]}</span>
                        <span class="coll-card-tier-num">${TIER_NUMS[i - 1]}</span>
                    </div>
                    <div class="coll-card-body">
                        <div class="coll-card-icon">${unlocked ? TIER_NUMS[i - 1] : '?'}</div>
                        <div class="coll-card-name">${unlocked ? card.name : '???'}</div>
                        <div class="coll-card-desc">${unlocked ? card.desc : (card.chance * 100).toFixed(2) + '% drop'}</div>
                    </div>
                `;
                cardsRow.appendChild(cardEl);
            });

            container.appendChild(setEl);
        });
    }
}

// Helper for parsing bonus description
function parseBonusDesc(bonus) {
    if (!bonus) return "No Bonus";
    if (bonus.type === 'damage_vs')  return `+${(bonus.val * 100).toFixed(0)}% Dmg vs ${bonus.target}`;
    if (bonus.type === 'defense_vs') return `+${(bonus.val * 100).toFixed(0)}% Def vs ${bonus.target}`;
    if (bonus.type === 'xp_vs')      return `+${(bonus.val * 100).toFixed(0)}% XP vs ${bonus.target}`;
    if (bonus.type === 'crit_vs')    return `+${(bonus.val * 100).toFixed(0)}% Crit vs ${bonus.target}`;
    if (bonus.type === 'special')    return "Special Effect";
    return "Unknown Bonus";
}

const collectionUI = new CollectionUI();

// Per-frame memoization: collection data never changes mid-frame, so cache results
// by [frame, targetType] to avoid re-scanning saveData.collection on every collision.
let _gcbFrame = -1;
const _gcbCache = {};
window.getCollectionBonuses = (t) => {
    if (typeof frame !== 'undefined' && frame !== _gcbFrame) {
        _gcbFrame = frame;
        for (const k in _gcbCache) delete _gcbCache[k];
    }
    if (_gcbCache[t] === undefined) _gcbCache[t] = collectionUI.getCollectionBonuses(t);
    return _gcbCache[t];
};
window.openCollection = () => collectionUI.openCollection();
window.closeCollection = () => collectionUI.closeCollection();
