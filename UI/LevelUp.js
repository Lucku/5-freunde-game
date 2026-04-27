class LevelUpUI {
    constructor() {
    }

    // Displays the Level Up screen with options
    // Delegated from Player.levelUp() usually
    showLevelUp(player, options) {
        const container = document.getElementById('upgrade-options');
        if (!container) return;

        // Show which player is choosing in co-op / online
        const subtitle = document.querySelector('#levelup-screen .screen-subtitle');
        if (subtitle) {
            if (typeof isOnlineGuest !== 'undefined' && isOnlineGuest && player === window.player) {
                subtitle.textContent = 'Your Turn — Choose an Upgrade';
                subtitle.style.color = '#60a5fa';
            } else if (window.isCoopMode && player === window.player2) {
                subtitle.textContent = 'Player 2 — Choose an Upgrade';
                subtitle.style.color = '#60a5fa';
            } else {
                subtitle.textContent = 'Choose an Upgrade';
                subtitle.style.color = '';
            }
        }

        container.innerHTML = '';

        // Allow hero to completely replace the option list (e.g. Time hero's Fast Forward / Reverse)
        if (window.HERO_LOGIC && window.HERO_LOGIC[player.type] && typeof window.HERO_LOGIC[player.type].getCustomLevelUpOptions === 'function') {
            options = window.HERO_LOGIC[player.type].getCustomLevelUpOptions(player, options);
        }

        options.forEach(opt => {
            let displayOpt = { ...opt };

            // Allow Hero to Modify Option (Description/Icon)
            if (window.HERO_LOGIC && window.HERO_LOGIC[player.type] && typeof window.HERO_LOGIC[player.type].modifyUpgradeOption === 'function') {
                displayOpt = window.HERO_LOGIC[player.type].modifyUpgradeOption(player, displayOpt);
            }

            const card = document.createElement('div');
            card.className = 'upgrade-card';
            card.innerHTML = `
                <div class="upgrade-icon">${displayOpt.icon}</div>
                <div class="upgrade-title">${displayOpt.title}</div>
                <div class="upgrade-desc">${displayOpt.desc}</div>
            `;
            card.onclick = () => this.chooseUpgrade(opt.id, player);
            container.appendChild(card);
        });

        document.getElementById('levelup-screen').style.display = 'flex';
        if (window.setUIState) window.setUIState('LEVELUP');

        if (typeof audioManager !== 'undefined') {
            const heroKey = `level_up_${player.type}`;
            audioManager.play(audioManager.tracks[heroKey] ? heroKey : 'level_up');
        }
    }

    chooseUpgrade(type, player) {
        // Online guest: relay choice to host so player2 ghost gets the same upgrade
        if (typeof isOnlineGuest !== 'undefined' && isOnlineGuest && player === window.player) {
            window.networkManager?.relay({ type: 'LEVEL_UP_CHOICE', choice: type });
        }

        // 1. Try Hero Specific Upgrade Logic
        // Defined in Hero Class (e.g. SpiritHero.applyUpgrade)
        if (window.HERO_LOGIC && window.HERO_LOGIC[player.type] && typeof window.HERO_LOGIC[player.type].applyUpgrade === 'function') {
            if (window.HERO_LOGIC[player.type].applyUpgrade(player, type)) {
                // Handled successfully by hero
                window.isLevelingUp = false;
                document.getElementById('levelup-screen').style.display = 'none';
                if (typeof window._afterUpgradeChosen === 'function') window._afterUpgradeChosen();
                else if (window.setUIState) window.setUIState('GAME');
                return;
            }
        }

        if (type === 'health') {
            player.maxHp += 25;
            player.hp = Math.min(player.maxHp, player.hp + (player.maxHp * 0.2));
            player.runBuffs.maxHp += 25;
        }
        else if (type === 'radius') {
            player.meleeRadius *= 1.25;
        }
        else if (type === 'projectile') {
            player.extraProjectiles += 1;
            player.runBuffs.projectiles += 1;
            // Balance: -20% Damage (Additive divisor) per split, similar to Skill Tree
            player.stats.rangeDmg /= 1.2;
        }
        else if (type === 'speed') { player.speedMultiplier += 0.1; player.runBuffs.speed += 0.1; }
        else if (type === 'cooldown') { player.cooldownMultiplier *= 0.9; player.runBuffs.cooldown += 0.1; }
        else if (type === 'defense') { player.damageReduction = Math.min(0.5, player.damageReduction + 0.05); player.runBuffs.defense += 0.05; }
        else if (type === 'damage') { player.damageMultiplier += 0.1; player.runBuffs.damage += 0.1; }
        else if (type === 'luck') { player.maskChance += 0.005; player.runBuffs.luck += 0.005; }
        else if (type === 'crit') { player.critChance += 0.05; player.critMultiplier += 0.2; }
        else if (type === 'transform') {
            player.transformActive = true;
            player.currentForm = player.getFormName();
            if (window.showNotification) window.showNotification(`${player.currentForm} ACTIVATED!`);
            if (window.createExplosion) window.createExplosion(player.x, player.y, '#fff');
            if (typeof audioManager !== 'undefined') audioManager.playHeroExclamation(player.type, 'ultimate');
        }
        else {
            console.log("Unknown Upgrade Type: " + type);
        }

        window.isLevelingUp = false;
        document.getElementById('levelup-screen').style.display = 'none';
        if (typeof window._afterUpgradeChosen === 'function') window._afterUpgradeChosen();
        else if (window.setUIState) window.setUIState('GAME');
    }
}

const levelUpUI = new LevelUpUI();
window.levelUpUI = levelUpUI;
window.chooseUpgrade = (type) => levelUpUI.chooseUpgrade(type, window.player);
