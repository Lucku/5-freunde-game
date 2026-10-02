// Explicit imports for symbols previously read off window shims.
import { iconHTML } from '../Icons.js'; // Cross-platform vector icons
import { applyUpgrade } from '../core/upgrades.js';

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
        const _hlCustom = window.gameContext.registries.callHero(player.type, 'getCustomLevelUpOptions', player, options);
        if (_hlCustom !== undefined) options = _hlCustom;

        options.forEach(opt => {
            let displayOpt = { ...opt };

            // Allow Hero to Modify Option (Description/Icon)
            const _hlMod = window.gameContext.registries.callHero(player.type, 'modifyUpgradeOption', player, displayOpt);
            if (_hlMod !== undefined) displayOpt = _hlMod;

            const card = document.createElement('div');
            card.className = 'upgrade-card';
            card.innerHTML = `
                <div class="upgrade-icon">${iconHTML(displayOpt.icon, 34)}</div>
                <div class="upgrade-title">${displayOpt.title}</div>
                <div class="upgrade-desc">${displayOpt.desc}</div>
            `;
            card.onclick = () => this.chooseUpgrade(opt.id, player, displayOpt.title);
            container.appendChild(card);
        });

        document.getElementById('levelup-screen').style.display = 'flex';
        if (window.setUIState) window.setUIState('LEVELUP');

        if (typeof audioManager !== 'undefined') {
            const heroKey = `level_up_${player.type}`;
            audioManager.play(audioManager.tracks[heroKey] ? heroKey : 'level_up');
        }
    }

    chooseUpgrade(type, player, displayTitle) {
        // Online: send choice directly to server (server is now authoritative)
        if (typeof isOnlineMode !== 'undefined' && isOnlineMode && player === window.player) {
            window.networkManager?.send({ type: 'LEVEL_UP_CHOICE', choice: type });
        }

        // Track for the end-of-run breakdown — only log P1 picks (P2/AI/host
        // companion picks come through different paths and aren't part of the
        // local player's narrative).
        if (player === window.player && typeof currentRunStats !== 'undefined') {
            const _wave = (typeof wave !== 'undefined') ? wave : 0;
            const _t = Math.floor((Date.now() - (currentRunStats.startTime || Date.now())) / 1000);
            const _title = displayTitle || this._upgradeTitle(type, player);
            if (!currentRunStats.upgradesPicked) currentRunStats.upgradesPicked = [];
            currentRunStats.upgradesPicked.push({ wave: _wave, timeSec: _t, id: type, title: _title });
        }

        // Hero-specific upgrade logic (e.g. SpiritHero.applyUpgrade) first, then
        // the built-in table — the same code the online server applies.
        const applied = applyUpgrade(player, type, {
            heroLogic: window.gameContext.registries.getHero(player.type),
            onTransform: (p) => {
                if (window.showNotification) window.showNotification(`${p.currentForm} ACTIVATED!`);
                if (window.createExplosion) window.createExplosion(p.x, p.y, '#fff');
                if (typeof audioManager !== 'undefined') audioManager.playHeroExclamation(p.type, 'ultimate');
            },
        });
        if (!applied) console.log("Unknown Upgrade Type: " + type);

        window.isLevelingUp = false;
        document.getElementById('levelup-screen').style.display = 'none';
        if (typeof window._afterUpgradeChosen === 'function') window._afterUpgradeChosen();
        else if (window.setUIState) window.setUIState('GAME');
    }
}

// Resolve a friendly title for an upgrade id — preferred over showing the raw
// 'cooldown' / 'radius' tokens on the end-of-run breakdown.
LevelUpUI.prototype._upgradeTitle = function (id, player) {
    const builtIn = {
        health: 'Vitality', radius: 'Blast Radius', projectile: 'Multishot',
        speed: 'Swiftness', cooldown: 'Haste', defense: 'Iron Skin',
        damage: 'Power', luck: 'Fortune', crit: 'Lethality', transform: 'Ultimate Form',
    };
    if (builtIn[id]) return builtIn[id];
    // Hero-specific upgrade pools (e.g. SpiritHero) expose an upgradePool array
    const hl = window.gameContext.registries.getHero(player && player.type);
    if (hl && Array.isArray(hl.upgradePool)) {
        const found = hl.upgradePool.find(u => u.id === id);
        if (found && found.title) return found.title;
    }
    return id;
};

const levelUpUI = new LevelUpUI();
window.levelUpUI = levelUpUI;
window.chooseUpgrade = (type) => levelUpUI.chooseUpgrade(type, window.player);

export { LevelUpUI, levelUpUI };
export default levelUpUI;
