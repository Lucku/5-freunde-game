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

                // Check if bonus applies to this target (or is global/special)
                if (card.bonus.target === targetType || card.bonus.type === 'special') {
                    if (card.bonus.type === 'damage_vs') bonuses.damageMult += card.bonus.val;
                    if (card.bonus.type === 'defense_vs') bonuses.defenseMult -= card.bonus.val; // Reduction
                    if (card.bonus.type === 'xp_vs') bonuses.xpMult += card.bonus.val;
                    if (card.bonus.type === 'crit_vs') bonuses.critChance += card.bonus.val;
                    if (card.bonus.type === 'special') bonuses.specials.push(card.bonus.id);
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
        if (!container) return;

        container.innerHTML = '';
        container.style.display = 'flex';
        container.style.flexDirection = 'column';
        container.style.gap = '20px';

        // Dynamically discover all card types from COLLECTOR_CARDS
        const typesSet = new Set();
        if (typeof COLLECTOR_CARDS !== 'undefined') {
            Object.keys(COLLECTOR_CARDS).forEach(key => {
                // Match pattern "TYPE_NUMBER" (e.g., "BASIC_1", "CLOUD_BAT_2")
                const match = key.match(/^(.*)_\d+$/);
                if (match) {
                    typesSet.add(match[1]);
                }
            });
        }

        const types = Array.from(typesSet);

        types.forEach(type => {
            // Check if we actually have cards for this type
            if (!COLLECTOR_CARDS[`${type}_1`]) return;

            const row = document.createElement('div');
            row.className = 'collection-row';
            row.style.display = 'flex';
            row.style.gap = '10px';
            row.style.justifyContent = 'center';
            row.style.flexWrap = 'wrap';

            // Header for row
            const header = document.createElement('div');
            header.style.width = '100%';
            header.style.textAlign = 'center';
            header.style.color = '#aaa';
            header.style.marginBottom = '5px';
            header.style.fontSize = '14px';
            header.innerText = type.replace(/_/g, ' ');
            row.appendChild(header);

            for (let i = 1; i <= 4; i++) {
                const key = `${type}_${i}`;
                const card = COLLECTOR_CARDS[key];
                if (!card) continue;

                const unlocked = saveData.collection.includes(key);

                const el = document.createElement('div');
                el.className = 'collection-card';
                if (!unlocked) el.classList.add('locked');

                el.style.borderColor = unlocked ? card.color : '#333';
                el.style.boxShadow = unlocked ? `0 0 15px ${card.color}20` : 'none';
                el.style.width = '180px'; // Fixed width for consistency

                el.innerHTML = `
                <div class="card-icon" style="background: ${unlocked ? card.color : '#222'}">
                    ${unlocked ? (i === 4 ? '👑' : i === 3 ? '💰' : i === 2 ? '🛡️' : '⚔️') : '?'}
                </div>
                <div class="card-info">
                    <div class="card-name" style="color: ${unlocked ? card.color : '#666'}">
                        ${unlocked ? card.name : 'Unknown'}
                    </div>
                    <div class="card-desc" style="color: ${unlocked ? '#ccc' : '#444'}">
                        ${unlocked ? card.desc : 'Find this card to unlock bonus.'}
                    </div>
                </div>
            `;
                row.appendChild(el);
            }
            container.appendChild(row);
        });
    }
}

// Helper for parsing bonus description
function parseBonusDesc(bonus) {
    if (!bonus) return "No Bonus";
    if (bonus.type === 'damage_vs') return `+${(bonus.val * 100).toFixed(0)}% Dmg vs ${bonus.target}`;
    if (bonus.type === 'defense_vs') return `+${(bonus.val * 100).toFixed(0)}% Def vs ${bonus.target}`;
    if (bonus.type === 'xp_vs') return `+${(bonus.val * 100).toFixed(0)}% XP vs ${bonus.target}`;
    if (bonus.type === 'crit_vs') return `+${(bonus.val * 100).toFixed(0)}% Crit vs ${bonus.target}`;
    if (bonus.type === 'special') return "Special Effect";
    return "Unknown Bonus";
}

const collectionUI = new CollectionUI();
window.getCollectionBonuses = (t) => collectionUI.getCollectionBonuses(t);
window.openCollection = () => collectionUI.openCollection();
window.closeCollection = () => collectionUI.closeCollection();
