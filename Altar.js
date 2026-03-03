const ALTAR_HERO_META = {
    fire:      { icon: '🔥', name: 'Fire',      rgb: '231,76,60'   },
    water:     { icon: '💧', name: 'Water',     rgb: '52,152,219'  },
    ice:       { icon: '❄️',  name: 'Ice',       rgb: '200,220,240' },
    plant:     { icon: '🌿', name: 'Plant',     rgb: '46,204,113'  },
    metal:     { icon: '⚙️',  name: 'Metal',     rgb: '149,165,166' },
    earth:     { icon: '🪨', name: 'Earth',     rgb: '180,120,60'  },
    lightning: { icon: '⚡', name: 'Lightning', rgb: '241,196,15'  },
    air:       { icon: '🌪️', name: 'Air',       rgb: '64,224,208'  },
    gravity:   { icon: '🌀', name: 'Gravity',   rgb: '155,89,182'  },
    void:      { icon: '☯️',  name: 'Void',      rgb: '0,188,212'   },
    spirit:    { icon: '✨', name: 'Spirit',    rgb: '240,208,128' },
    chance:    { icon: '🎲', name: 'Chance',    rgb: '255,100,180' },
    sound:     { icon: '🎵', name: 'Sound',     rgb: '100,180,255' },
    poison:    { icon: '☠️',  name: 'Poison',    rgb: '118,255,3'   },
};

const ALTAR_TIER_LABELS = { 1: 'RUNE I', 3: 'RUNE II', 5: 'RUNE III' };

class Altar {
    constructor() {
        this.selectorEl = null;
        this.contentEl  = null;
        this.selected   = null;
    }

    _initEls() {
        this.selectorEl = document.getElementById('altar-hero-selector');
        this.contentEl  = document.getElementById('altar-content');
    }

    _active() {
        if (!saveData.altar) saveData.altar = { active: [] };
        return saveData.altar.active;
    }

    _prestige(hero) {
        return (saveData[hero] && saveData[hero].prestige) ? saveData[hero].prestige : 0;
    }

    getEligibleHeroes() {
        const tree = (typeof ALTAR_TREE !== 'undefined') ? ALTAR_TREE : {};
        return Object.keys(tree)
            .filter(h => h !== 'convergence' && this._prestige(h) >= 1);
    }

    render() {
        this._initEls();
        if (!this.selectorEl || !this.contentEl) return;

        const heroes = this.getEligibleHeroes();

        // Keep selection valid
        if (!this.selected || !heroes.includes(this.selected)) {
            this.selected = heroes[0] || null;
        }

        this.renderSelector(heroes);
        this.renderContent();
    }

    renderSelector(heroes) {
        this.selectorEl.innerHTML = '';

        if (heroes.length === 0) return;

        heroes.forEach(hero => {
            const meta     = ALTAR_HERO_META[hero] || { icon: '?', name: hero, rgb: '180,180,180' };
            const prestige = this._prestige(hero);
            const isSelected = hero === this.selected;

            const pill = document.createElement('div');
            pill.className = 'altar-pill' + (isSelected ? ' selected' : '');
            pill.style.setProperty('--hero-rgb', meta.rgb);
            pill.innerHTML = `
                <div class="altar-mini-helmet" style="background: rgba(${meta.rgb},1);">
                    <div class="altar-mini-visor"></div>
                </div>
                <span class="altar-pill-name">${meta.name}</span>
                <span class="altar-pill-prestige">Prestige ${prestige}</span>
            `;
            pill.onclick = () => this.selectHero(hero);
            this.selectorEl.appendChild(pill);
        });
    }

    selectHero(hero) {
        this.selected = hero;
        this.render();
    }

    renderContent() {
        this.contentEl.innerHTML = '';

        if (!this.selected) {
            this.contentEl.innerHTML = `
                <div class="altar-empty">
                    <span class="altar-empty-icon">🪨</span>
                    <div>Reach Prestige 1 with any hero<br>to unlock their Mastery Runes.</div>
                </div>`;
            return;
        }

        const hero     = this.selected;
        const meta     = ALTAR_HERO_META[hero] || { icon: '?', name: hero, rgb: '180,180,180' };
        const prestige = this._prestige(hero);
        const nodes    = (typeof ALTAR_TREE !== 'undefined' && ALTAR_TREE[hero]) ? ALTAR_TREE[hero] : [];

        const panel = document.createElement('div');
        panel.style.setProperty('--hero-rgb', meta.rgb);

        // Hero heading
        const starsTotal = Math.min(prestige, 5);
        const stars = '★'.repeat(starsTotal) + '☆'.repeat(Math.max(0, 5 - starsTotal));
        panel.innerHTML = `
            <div class="altar-hero-heading">
                <div class="altar-hero-name">${meta.icon} ${meta.name} Mastery</div>
                <div class="altar-hero-prestige-row">${stars} &nbsp; Prestige ${prestige}</div>
            </div>
        `;

        // Rune cards
        const runesRow = document.createElement('div');
        runesRow.className = 'altar-runes-row';

        nodes.forEach(node => {
            const isUnlocked = prestige >= node.req;
            const isActive   = this._active().includes(node.id);
            const tierLabel  = ALTAR_TIER_LABELS[node.req] || `RUNE (P${node.req})`;

            let stateClass = 'state-locked';
            let stateLabel = `🔒 Prestige ${node.req} Required`;
            if (isUnlocked && !isActive) { stateClass = 'state-inactive'; stateLabel = 'Activate'; }
            if (isUnlocked && isActive)  { stateClass = 'state-active';   stateLabel = '✦ Active'; }

            let runeClass = 'altar-rune';
            if (isUnlocked)  runeClass += ' unlocked';
            if (isActive)    runeClass += ' active-rune';
            if (!isUnlocked) runeClass += ' locked';

            const card = document.createElement('div');
            card.className = runeClass;
            card.style.setProperty('--hero-rgb', meta.rgb);
            card.innerHTML = `
                <div class="altar-rune-tier">${tierLabel}</div>
                <div class="altar-rune-desc">${node.desc}</div>
                <div class="altar-rune-req">Prestige ${node.req} required</div>
                <span class="altar-rune-state ${stateClass}">${stateLabel}</span>
            `;

            if (isUnlocked) {
                card.onclick = () => this.toggleNode(node.id);
            }

            runesRow.appendChild(card);
        });

        panel.appendChild(runesRow);

        // Convergences for this hero
        this.renderConvergences(panel, hero, meta.rgb);

        this.contentEl.appendChild(panel);
    }

    renderConvergences(panel, hero, heroRgb) {
        const allConv = (typeof ALTAR_TREE !== 'undefined' && ALTAR_TREE.convergence)
            ? ALTAR_TREE.convergence : [];

        const relevant = allConv.filter(node => Object.keys(node.req).includes(hero));
        if (relevant.length === 0) return;

        const section = document.createElement('div');
        section.className = 'altar-conv-section';
        section.innerHTML = `
            <div class="altar-conv-heading">
                <span class="altar-conv-heading-line"></span>
                <span class="altar-conv-heading-label">✦ Convergence Runes ✦</span>
                <span class="altar-conv-heading-line"></span>
            </div>
        `;

        const grid = document.createElement('div');
        grid.className = 'altar-conv-grid';

        relevant.forEach(node => {
            const reqs       = Object.keys(node.req);
            const isUnlocked = reqs.every(h => this._prestige(h) >= node.req[h]);
            const isActive   = this._active().includes(node.id);

            let itemClass = 'altar-conv-item';
            if (isUnlocked && !isActive) itemClass += ' conv-unlocked';
            if (isUnlocked && isActive)  itemClass += ' conv-unlocked conv-active';
            if (!isUnlocked)             itemClass += ' conv-locked';

            // Requirement badges using each hero's color
            const reqBadges = reqs.map(h => {
                const m = ALTAR_HERO_META[h] || { name: h, rgb: '155,89,182' };
                return `<span class="altar-conv-req-badge" style="--b-rgb:${m.rgb}">${m.name} P${node.req[h]}</span>`;
            }).join('');

            let stateLabel = isActive ? '✦ Active' : (isUnlocked ? 'Activate' : '');
            let stateHtml  = stateLabel ? `<div class="altar-conv-state">${stateLabel}</div>` : '';

            const item = document.createElement('div');
            item.className = itemClass;
            item.innerHTML = `
                <div class="altar-conv-req">${reqBadges}</div>
                <div class="altar-conv-desc">${node.desc}</div>
                ${stateHtml}
            `;

            if (isUnlocked) {
                item.onclick = () => this.toggleNode(node.id);
            }

            grid.appendChild(item);
        });

        section.appendChild(grid);
        panel.appendChild(section);
    }

    toggleNode(id) {
        const active = this._active();
        const index  = active.indexOf(id);
        if (index === -1) active.push(id);
        else              active.splice(index, 1);
        saveGame();
        this.render();
    }
}

const altarUI = new Altar();

window.openAltar = function () {
    document.getElementById('menu-overlay').style.display = 'none';
    document.getElementById('altar-screen').style.display = 'flex';
    altarUI.render();
    if (window.setUIState) window.setUIState('ALTAR');
};

window.closeAltar = function () {
    document.getElementById('altar-screen').style.display = 'none';
    if (window.initMenu) window.initMenu();
};
