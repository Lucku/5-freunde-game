class LevelUpUI {
    constructor() {
    }

    // Displays the Level Up screen with options
    // Delegated from Player.levelUp() usually
    showLevelUp(player, options) {
        const container = document.getElementById('upgrade-options');
        if (!container) return;

        container.innerHTML = '';

        options.forEach(opt => {
            let displayOpt = { ...opt };
            // Earth Hero Description Swaps
            if (player.type === 'earth') {
                if (opt.id === 'projectile') {
                    displayOpt.title = 'Ram Damage';
                    displayOpt.desc = '+20% Ram Damage';
                }
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
            audioManager.play('level_up');
        }
    }

    chooseUpgrade(type, player) {
        if (type === 'health') {
            player.maxHp += 25;
            player.hp = Math.min(player.maxHp, player.hp + (player.maxHp * 0.2));
            player.runBuffs.maxHp += 25;
        }
        else if (type === 'radius') {
            player.meleeRadius *= 1.25;
        }
        else if (type === 'projectile') {
            if (player.type === 'earth') {
                // Earth Hero: Increase Ram Damage
                player.stats.ramDmgMult = (player.stats.ramDmgMult || 1) + 0.2; // +20% Ram Damage
                if (window.showNotification) window.showNotification("RAM DAMAGE INCREASED!");
            } else {
                player.extraProjectiles += 1;
                player.runBuffs.projectiles += 1;
                // Balance: -20% Damage (Additive divisor) per split, similar to Skill Tree
                player.stats.rangeDmg /= 1.2;
            }
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
        }

        window.isLevelingUp = false;
        document.getElementById('levelup-screen').style.display = 'none';
        if (window.setUIState) window.setUIState('GAME');
    }
}

const levelUpUI = new LevelUpUI();
window.levelUpUI = levelUpUI;
window.chooseUpgrade = (type) => levelUpUI.chooseUpgrade(type, window.player);
