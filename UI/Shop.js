const SHOP_POOL = [
    { id: 'dmg', name: 'Sharpening Stone', baseCost: 250, desc: '+5% Damage', action: () => { player.damageMultiplier += 0.05; player.runBuffs.damage += 0.05; } },
    { id: 'spd', name: 'Light Boots', baseCost: 200, desc: '+5% Speed', action: () => { player.speedMultiplier += 0.05; player.runBuffs.speed += 0.05; } },
    { id: 'hp', name: 'Heart Container', baseCost: 300, desc: '+20 Max HP', action: () => { player.maxHp += 20; player.hp += 20; player.runBuffs.maxHp += 20; } },
    { id: 'cd', name: 'Hourglass', baseCost: 350, desc: '-5% Cooldown', action: () => { player.cooldownMultiplier *= 0.95; player.runBuffs.cooldown += 0.05; } },
    { id: 'crit', name: 'Lucky Charm', baseCost: 400, desc: '+5% Crit Chance', action: () => { player.critChance += 0.05; } },
    { id: 'def', name: 'Iron Plating', baseCost: 400, desc: '+2% Dmg Reduction', action: () => { player.damageReduction = Math.min(0.75, player.damageReduction + 0.02); player.runBuffs.defense += 0.02; } },
    { id: 'range', name: 'Magnet', baseCost: 150, desc: '+20 Pickup Range', action: () => { player.pickupRadius += 20; } }
];

class ShopUI {
    constructor() {
        this.currentShopItems = [];
    }

    // --- Permanent Shop Logic ---
    openPermShop() {
        document.getElementById('menu-overlay').style.display = 'none';
        document.getElementById('perm-shop-screen').style.display = 'flex';
        this.renderPermShop();
        if (window.setUIState) window.setUIState('PERMSHOP');
    }

    renderPermShop() {
        document.getElementById('permGoldVal').innerText = window.saveData.global.totalGold;
        const container = document.getElementById('perm-shop-container');
        container.innerHTML = '';

        if (typeof PERM_UPGRADES !== 'undefined') {
            for (let key in PERM_UPGRADES) {
                const up = PERM_UPGRADES[key];
                const level = window.saveData.metaUpgrades[key] || 0;
                const cost = Math.floor(up.baseCost * Math.pow(up.costMult, level));

                const div = document.createElement('div');
                div.className = 'shop-item';
                div.innerHTML = `
                    <div style="font-size: 20px; font-weight: bold; color: #9b59b6;">${up.name}</div>
                    <div style="color: #aaa; margin: 5px 0;">${up.desc}</div>
                    <div style="color: #fff;">Level: ${level}</div>
                    <div class="shop-cost">${cost} Total Gold</div>
                `;
                div.onclick = () => this.buyPermUpgrade(key, cost);
                container.appendChild(div);
            }
        }
    }

    buyPermUpgrade(key, cost) {
        if (window.saveData.global.totalGold >= cost) {
            window.saveData.global.totalGold -= cost;
            window.saveData.metaUpgrades[key] = (window.saveData.metaUpgrades[key] || 0) + 1;

            // Track Void Spending
            window.saveData.global.totalVoidGoldSpent = (window.saveData.global.totalVoidGoldSpent || 0) + cost;

            if (window.saveGame) window.saveGame(); // Or SaveManager.saveGame()
            this.renderPermShop();
            if (window.showNotification) window.showNotification("Upgrade Purchased!");

            // Check for Void Shop achievements
            if (window.checkAchievements) window.checkAchievements();
        } else {
            if (window.showNotification) window.showNotification("Not enough Total Gold!");
        }
    }

    closePermShop() {
        document.getElementById('perm-shop-screen').style.display = 'none';
        if (window.initMenu) window.initMenu();
    }

    // --- Chaos Shop Logic ---
    isChaosActive(effectId) {
        return window.saveData.chaos && window.saveData.chaos.active && window.saveData.chaos.active.includes(effectId);
    }

    openChaosShop() {
        document.getElementById('menu-overlay').style.display = 'none';
        document.getElementById('chaos-shop-screen').style.display = 'flex';
        this.renderChaosShop();
        if (window.setUIState) window.setUIState('CHAOSSHOP');
    }

    renderChaosShop() {
        // Ensure chaos data exists
        if (!window.saveData.chaos) window.saveData.chaos = { shards: 0, unlocked: [], active: [] };

        document.getElementById('chaosShardsVal').innerText = window.saveData.chaos.shards;
        const container = document.getElementById('chaos-shop-container');
        container.innerHTML = '';

        if (typeof CHAOS_EFFECTS !== 'undefined') {
            CHAOS_EFFECTS.forEach(effect => {
                const isUnlocked = window.saveData.chaos.unlocked.includes(effect.id);
                const isActive = window.saveData.chaos.active.includes(effect.id);

                const div = document.createElement('div');
                div.className = 'shop-item';
                // Style differently if unlocked/active
                if (isUnlocked) {
                    div.style.borderColor = isActive ? '#2ecc71' : '#e74c3c';
                    div.style.background = isActive ? 'rgba(46, 204, 113, 0.2)' : 'rgba(231, 76, 60, 0.1)';
                }

                let actionText = isUnlocked ? (isActive ? "ACTIVE (Click to Disable)" : "INACTIVE (Click to Enable)") : `Buy for ${effect.cost} Shards`;
                let costColor = isUnlocked ? (isActive ? '#2ecc71' : '#e74c3c') : '#f1c40f';

                div.innerHTML = `
                    <div style="font-size: 20px; font-weight: bold; color: #e74c3c;">${effect.name}</div>
                    <div style="color: #aaa; margin: 5px 0;">${effect.desc}</div>
                    <div style="color: #f1c40f; font-weight: bold;">Bonus: +${Math.round(effect.bonus * 100)}% Gold</div>
                    <div style="color: ${costColor}; margin-top: 10px; font-weight: bold;">${actionText}</div>
                `;

                div.onclick = () => {
                    if (isUnlocked) {
                        this.toggleChaosEffect(effect.id);
                    } else {
                        this.buyChaosEffect(effect.id, effect.cost);
                    }
                };
                container.appendChild(div);
            });
        }
    }

    buyChaosEffect(id, cost) {
        if (window.saveData.chaos.shards >= cost) {
            window.saveData.chaos.shards -= cost;
            window.saveData.chaos.unlocked.push(id);
            if (window.saveGame) window.saveGame();
            this.renderChaosShop();
            if (window.showNotification) window.showNotification("Chaos Effect Unlocked!");
        } else {
            if (window.showNotification) window.showNotification("Not enough Chaos Shards!");
        }
    }

    toggleChaosEffect(id) {
        const index = window.saveData.chaos.active.indexOf(id);
        if (index > -1) {
            window.saveData.chaos.active.splice(index, 1);
            if (window.showNotification) window.showNotification("Effect Disabled");
        } else {
            window.saveData.chaos.active.push(id);
            if (window.showNotification) window.showNotification("Effect Enabled");
        }
        if (window.saveGame) window.saveGame();
        this.renderChaosShop();
    }

    closeChaosShop() {
        document.getElementById('chaos-shop-screen').style.display = 'none';
        if (window.initMenu) window.initMenu();
    }

    // --- In-Game Shop Logic ---
    openShop() {
        window.isShopping = true;
        document.getElementById('shop-screen').style.display = 'flex';

        // Generate Shop Items if new visit (empty list)
        if (!this.currentShopItems || this.currentShopItems.length === 0) {
            this.currentShopItems = [];
            // Always add Heal
            this.currentShopItems.push({
                id: 'heal',
                name: 'Health Potion',
                baseCost: 100,
                desc: 'Heal 50 HP',
                action: () => { player.hp = Math.min(player.hp + 50, player.maxHp); }
            });

            // Pick 3 random unique items from pool
            const pool = [...SHOP_POOL];
            for (let i = 0; i < 3; i++) {
                if (pool.length === 0) break;
                const idx = Math.floor(Math.random() * pool.length);
                this.currentShopItems.push(pool[idx]);
                pool.splice(idx, 1);
            }
        }

        this.renderShopItems();
        if (window.setUIState) window.setUIState('SHOP');
    }

    renderShopItems() {
        document.getElementById('shopGoldVal').innerText = player.gold;

        // Update Health UI
        const updateShopHealth = () => {
            const hpEl = document.getElementById('shopHealthVal');
            const maxHpEl = document.getElementById('shopMaxHealthVal');
            if (hpEl) hpEl.innerText = Math.ceil(player.hp);
            if (maxHpEl) maxHpEl.innerText = Math.ceil(player.maxHp);
        };
        updateShopHealth();

        const container = document.getElementById('shop-container');
        container.innerHTML = '';

        // Calculate Multipliers
        // Price increases with wave and items bought
        // Helpers for currentRunStats usage
        const itemsBought = (window.currentRunStats && window.currentRunStats.itemsBought) ? window.currentRunStats.itemsBought : 0;
        const wave = window.wave || 1;

        const waveMult = 1 + (wave * 0.1);
        const boughtMult = 1 + (itemsBought * 0.2); // 20% increase per item bought

        this.currentShopItems.forEach(item => {
            const cost = Math.floor(item.baseCost * waveMult * boughtMult);

            const div = document.createElement('div');
            div.className = 'shop-item';
            div.innerHTML = `
                <div style="font-size: 24px; font-weight: bold; color: #fff;">${item.name}</div>
                <div style="color: #aaa; margin: 5px 0;">${item.desc}</div>
                <div class="shop-cost" style="color: ${player.gold >= cost ? '#f1c40f' : '#e74c3c'}">${cost} Gold</div>
            `;
            div.onclick = () => {
                if (player.gold >= cost) {
                    player.gold -= cost;
                    if (window.currentRunStats) {
                        window.currentRunStats.moneySpent = (window.currentRunStats.moneySpent || 0) + cost;
                        window.currentRunStats.itemsBought = (window.currentRunStats.itemsBought || 0) + 1;
                    }

                    item.action();

                    if (window.showNotification) window.showNotification("Purchased!");
                    this.renderShopItems(); // Re-render to update prices and health
                } else {
                    if (window.showNotification) window.showNotification("Not enough Gold!");
                }
            };
            container.appendChild(div);
        });
    }

    closeShop() {
        window.isShopping = false;
        document.getElementById('shop-screen').style.display = 'none';
        this.currentShopItems = []; // Reset for next shop
        if (window.advanceWave) window.advanceWave();
    }
}

const shopUI = new ShopUI();

// Global Functions for backwards compatibility
window.openPermShop = () => shopUI.openPermShop();
window.closePermShop = () => shopUI.closePermShop();
window.openChaosShop = () => shopUI.openChaosShop();
window.closeChaosShop = () => shopUI.closeChaosShop();
window.isChaosActive = (id) => shopUI.isChaosActive(id);
window.openShop = () => shopUI.openShop();
window.closeShop = () => shopUI.closeShop();
// window.buyPermUpgrade was used in onclicks, must expose
window.buyPermUpgrade = (key, cost) => shopUI.buyPermUpgrade(key, cost);
window.buyChaosEffect = (id, cost) => shopUI.buyChaosEffect(id, cost);
window.toggleChaosEffect = (id) => shopUI.toggleChaosEffect(id);
