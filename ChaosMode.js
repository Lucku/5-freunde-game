// ChaosMode.js
/**
 * CHAOS MODE 2.0 Logic
 * Extracted from game.js
 */

// State
let chaosShuffleOptions = [];
let chaosSelectionIndex = 1;
let currentChaosObjective = null;
let nextWaveIsNemesis = null; // ID of boss if active
let bossIncarnationActive = false;
let chaosObjectiveStreak = 0;
// Affection System
let heroAffection = {
    fire: 50, water: 50, ice: 50, plant: 50, metal: 50
};
// Emergency & Status State
let affectionCooldowns = {}; // { type: timestamp }
let activeBackups = []; // { type: string, expiry: timestamp }
let lostHeroes = []; // ['fire', 'water'] - permanently gone this run

// Ensure DLC heroes are init
if (window.dlcManager) {
    window.dlcManager.getDLCList().forEach(d => {
        if (d.active && d.hero && !heroAffection[d.hero]) heroAffection[d.hero] = 50;
    });
}

function spawnChaosCompanion(type) {
    if (typeof Companion !== 'undefined' && typeof companions !== 'undefined') {
        companions.push(new Companion(type, player));
        showNotification(`${type.toUpperCase()} COMPANION JOINED!`, 'positive');
    } else {
        console.warn("Companion system not ready");
    }
}

// Objectives & Rewards Pools
// Using Constants.js values as source of truth


function getAvailableChaosBosses() {
    let bosses = [
        { id: 'MAKUTA', name: 'Makuta', reward: 'True Golden Mask' },
        { id: 'GREEN_GOBLIN', name: 'Green Goblin', reward: '3x Chaos Reward' },
        { id: 'DARK_GOLEM', name: 'Dark Golem', reward: '3x Chaos Reward' }
    ];

    // Check DLC
    if (window.dlcManager) {
        let dlcs = window.dlcManager.getDLCList();
        if (dlcs.some(d => d.id === 'tournament_of_thunder' && d.active)) {
            bosses.push({ id: 'ZEUS', name: 'Zeus', reward: '3x Chaos Reward' });
        }
        if (dlcs.some(d => d.id === 'rise_of_the_rock' && d.active)) {
            bosses.push({ id: 'ROCK_BOSS', name: 'Titan of Rock', reward: '3x Chaos Reward' });
        }
    }
    return bosses;
}

function openChaosGamble() {
    gamePaused = true;
    setUIState('CHAOS_GAMBLE');
    document.getElementById('chaos-selection-screen').style.display = 'flex';
    document.getElementById('chaos-options-container').innerHTML = '';
    chaosSelectionIndex = 1;

    // Generate 2 random heroes not current
    const types = ['fire', 'water', 'ice', 'plant', 'metal'];
    if (window.dlcManager) {
        window.dlcManager.getDLCList().forEach(d => { if (d.active && d.hero) types.push(d.hero); });
    }

    let available = types.filter(t => t !== player.type && !lostHeroes.includes(t));

    // Pick 2 random unique
    let picks = [];
    while (picks.length < 2 && available.length > 0) {
        let r = Math.floor(Math.random() * available.length);
        picks.push(available[r]);
        available.splice(r, 1);
    }

    // Define Penalties
    const penalties = [
        {
            id: 'GOLD', name: '-20% Gold Gain', apply: (p) => {
                p.goldMultiplier = (p.goldMultiplier || 1) * 0.8;
            }
        },
        {
            id: 'HP', name: '-10% Max HP', apply: (p) => {
                let oldMax = p.maxHp;
                p.maxHp = Math.floor(p.maxHp * 0.9);
                p.hp = Math.floor(p.hp * (p.maxHp / oldMax));
            }
        },
        { id: 'HEAL', name: '-50% Healing', apply: (p) => { p.healMultiplier = (p.healMultiplier || 1) * 0.5; } },
        { id: 'SPEED', name: '-10% Speed', apply: (p) => { p.speedMultiplier = (p.speedMultiplier || 0) - 0.1; } },
        { id: 'DMG', name: '-10% Damage', apply: (p) => { p.damageMultiplier = (p.damageMultiplier || 0) * 0.9; } }
    ];
    let penalty = penalties[Math.floor(Math.random() * penalties.length)];

    let options = [
        { type: 'HERO', val: picks[0], label: `Switch to ${picks[0].toUpperCase()}`, color: BASE_HERO_STATS[picks[0]]?.color || '#fff' },
        { type: 'HERO', val: picks[1], label: `Switch to ${picks[1].toUpperCase()}`, color: BASE_HERO_STATS[picks[1]]?.color || '#fff' }
    ];

    // Feature 1: The Nemesis Wager (20% Chance)
    if (Math.random() < 0.20) {
        let bosses = getAvailableChaosBosses();
        let boss = bosses[Math.floor(Math.random() * bosses.length)];
        options.push({
            type: 'NEMESIS',
            val: boss,
            label: `CHALLENGE: ${boss.name.toUpperCase()}`,
            color: '#8e44ad',
            note: `Reward: ${boss.reward}`
        });
    } else {
        options.push({ type: 'STAY', val: penalty, label: `Keep ${player.type.toUpperCase()} & ${penalty.name}`, color: '#e74c3c' });
    }

    chaosShuffleOptions = options;
    updateChaosGambleUI();
}

function updateChaosGambleUI() {
    const container = document.getElementById('chaos-options-container');

    // Initial render — build card shells
    if (container.children.length !== chaosShuffleOptions.length) {
        container.innerHTML = '';
        chaosShuffleOptions.forEach((opt, idx) => {
            const card = document.createElement('div');
            card.id = `chaos-opt-${idx}`;
            card.className = 'chaos-opt-card';
            card.onclick = () => confirmChaosGamble(idx);
            card.onmouseenter = () => {
                if (chaosSelectionIndex !== idx) {
                    chaosSelectionIndex = idx;
                    updateChaosGambleUI();
                }
            };
            container.appendChild(card);
        });
    }

    // Update each card
    chaosShuffleOptions.forEach((opt, idx) => {
        const card = document.getElementById(`chaos-opt-${idx}`);
        if (!card) return;

        const isActive = (idx === chaosSelectionIndex);
        // Convert hex color to rgba for glow
        const glowColor = opt.color + '40';

        card.className = 'chaos-opt-card' + (isActive ? ' active' : '');
        card.style.setProperty('--card-color', opt.color);
        card.style.setProperty('--card-glow', glowColor);

        // Build inner HTML per type
        let iconHTML = '';
        let descHTML = '';
        let bondHTML = '';

        if (opt.type === 'HERO') {
            const aff = heroAffection[opt.val] || 50;
            iconHTML = `
                <div class="chaos-opt-hero-icon" style="background:${opt.color};">
                    <div class="chaos-opt-hero-visor"></div>
                </div>`;
            descHTML = 'Abandon your current form and adapt to chaos.';
            bondHTML = `
                <div class="chaos-opt-bond">❤ Bond ${aff}%
                    <div class="chaos-bond-bar"><div class="chaos-bond-fill" style="width:${aff}%;"></div></div>
                </div>`;
        } else if (opt.type === 'STAY') {
            const aff = heroAffection[player.type] || 50;
            iconHTML = `
                <div class="chaos-opt-hero-icon" style="background:${opt.color};">
                    <div class="chaos-opt-hero-visor"></div>
                </div>`;
            descHTML = 'Resist the chaos — but pay a price.';
            bondHTML = `
                <div class="chaos-opt-bond">❤ Bond ${aff}%
                    <div class="chaos-bond-bar"><div class="chaos-bond-fill" style="width:${aff}%;"></div></div>
                </div>`;
        } else if (opt.type === 'NEMESIS') {
            iconHTML = `
                <div class="chaos-opt-hero-icon" style="background:${opt.color}; font-size:28px; color:#fff;">⚔</div>`;
            descHTML = `Instant Boss Fight`;
            bondHTML = `<div class="chaos-opt-bond" style="color:#f1c40f;">Reward: ${opt.note}</div>`;
        }

        const penaltyLine = opt.type === 'STAY'
            ? `<div style="margin-top:8px; font-size:10px; letter-spacing:0.5px; color:#e74c3c; text-transform:uppercase;">${opt.val.name}</div>`
            : '';

        card.innerHTML = `
            ${iconHTML}
            <div class="chaos-opt-label">${opt.label}</div>
            <div class="chaos-opt-desc">${descHTML}</div>
            ${penaltyLine}
            ${bondHTML}
            ${isActive ? '<div class="chaos-opt-hint">◈ Press A to confirm</div>' : ''}
        `;
    });
}

function confirmChaosGamble(idx) {
    let choice = chaosShuffleOptions[idx];
    document.getElementById('chaos-selection-screen').style.display = 'none';
    gamePaused = false;
    setUIState('GAME'); // Reset UI State

    // Affection Logic
    if (choice.type === 'HERO') {
        // Gain Affection for chosen
        if (heroAffection[choice.val] !== undefined) heroAffection[choice.val] = Math.min(100, heroAffection[choice.val] + 10);

        // Lose Affection for ignored Heroes
        chaosShuffleOptions.forEach(opt => {
            if (opt.type === 'HERO' && opt.val !== choice.val) {
                let t = opt.val;
                if (heroAffection[t] !== undefined) {
                    let oldVal = heroAffection[t];
                    let newVal = Math.max(0, heroAffection[t] - 10);
                    heroAffection[t] = newVal;

                    // Apply Penalties
                    if (newVal === 0 && oldVal > 0) {
                        // LOST FOREVER
                        lostHeroes.push(t);
                        showNotification(`${t.toUpperCase()} HAS ABANDONED YOU!`, 'negative');
                        player.maxHp = Math.floor(player.maxHp * 0.7); // Massive Debuff
                        player.hp = Math.min(player.hp, player.maxHp);
                    } else if (newVal < 20 && oldVal >= 20) {
                        // Warning Debuff
                        showNotification(`${t.toUpperCase()} IS LOSING FAITH... (-10% DMG)`, 'warning');
                        player.damageMultiplier = (player.damageMultiplier || 1) * 0.9;
                    }
                }
            }
        });
    }

    if (choice.type === 'HERO') {
        shuffleHero(choice.val);
    } else if (choice.type === 'STAY') {
        // Apply Penalty
        choice.val.apply(player);
        showNotification(`PENALTY APPLIED: ${choice.val.name}`);
        createExplosion(player.x, player.y, '#e74c3c', 20);
    } else if (choice.type === 'NEMESIS') {
        nextWaveIsNemesis = choice.val.id;
        showNotification(`WARNING: ${choice.val.name.toUpperCase()} APPROACHES!`);
    }

    resumeWaveGeneration();
}

function manageAffection(dt) {
    if (!player || player.hp <= 0) return;

    // 1. Full Affection Companions (Permanent)
    for (let type in heroAffection) {
        if (type === player.type || lostHeroes.includes(type)) continue;

        if (heroAffection[type] >= 100) {
            if (typeof companions !== 'undefined') {
                if (!companions.find(c => c.type === type)) {
                    spawnChaosCompanion(type);
                    if (typeof showNotification !== 'undefined') showNotification(`MAX BOND: ${type.toUpperCase()} JOINS PERMANENTLY!`);
                }
            }
        }
    }

    // 2. Emergency Backup (>80% Affection, <20% HP)
    if (player.hp < player.maxHp * 0.2) {
        for (let type in heroAffection) {
            if (type === player.type || lostHeroes.includes(type)) continue;

            if (typeof companions !== 'undefined' && companions.find(c => c.type === type)) continue;

            if (heroAffection[type] > 80) {
                let lastTime = affectionCooldowns[type] || 0;
                if (Date.now() - lastTime > 60000) {
                    spawnChaosCompanion(type);
                    activeBackups.push({ type: type, expiry: Date.now() + 30000 });
                    affectionCooldowns[type] = Date.now();
                    if (typeof showNotification !== 'undefined') showNotification(`EMERGENCY: ${type.toUpperCase()} TO THE RESCUE!`);
                    if (typeof createExplosion !== 'undefined') createExplosion(player.x, player.y, '#fff', 50);
                }
            }
        }
    }

    // 3. Expiry Check for Backups
    for (let i = activeBackups.length - 1; i >= 0; i--) {
        let b = activeBackups[i];
        if (Date.now() > b.expiry) {
            if (heroAffection[b.type] < 100) {
                if (typeof companions !== 'undefined') {
                    let idx = companions.findIndex(c => c.type === b.type);
                    if (idx !== -1) {
                        companions.splice(idx, 1);
                        if (typeof showNotification !== 'undefined') showNotification(`${b.type.toUpperCase()} DEPARTS.`);
                    }
                }
            }
            activeBackups.splice(i, 1);
        }
    }
}

function generateChaosObjective() {
    if (!isChaosShuffleMode) return;

    // Feature 2: Chaos Bounty Hunter (Streak Check)
    if (chaosObjectiveStreak >= 3 && Math.random() < 0.3) {
        let bosses = getAvailableChaosBosses();
        let boss = bosses[Math.floor(Math.random() * bosses.length)];

        nextWaveIsNemesis = boss.id;
        showNotification("THE CHAOS ATTRACTS ATTENTION...");

        currentChaosObjective = {
            id: 'KILL_BOUNTY',
            text: `Defeat ${boss.name}`,
            duration: 'wave',
            type: 'boss_kill',
            target: 1,
            bossId: boss.id,
            reward: { name: 'Chaos Artifact', icon: '🏆', val: 1, id: 'ARTIFACT' }
        };

        let hud = document.getElementById('chaos-challenge-hud');
        if (hud) {
            hud.style.display = 'block';
            hud.style.color = '#e74c3c';
        }
        updateChaosObjective(0);
        return;
    }

    // Pick random objective
    let pool = CHAOS_OBJECTIVES;
    let template = pool[Math.floor(Math.random() * pool.length)];

    // Pick random reward
    let rewardPool = CHAOS_REWARDS;
    let reward = rewardPool[Math.floor(Math.random() * rewardPool.length)];

    currentChaosObjective = {
        ...template,
        progress: 0,
        startTime: Date.now(),
        failed: false,
        completed: false,
        reward: reward // Store reward
    };

    // UI Update
    let hud = document.getElementById('chaos-challenge-hud');
    if (hud) {
        hud.style.display = 'block';
        hud.style.color = '#ff5e5e';
    }

    showNotification(`NEW CHALLENGE: ${template.text}`);
    updateChaosObjective(0); // Initial Render
}

function updateChaosObjective(dt) {
    // Run Affection System Logic (Per Frame)
    if (dt > 0) manageAffection(dt);

    let hud = document.getElementById('chaos-challenge-hud');
    if (!hud) return;

    // Force Display Block if Chaos Mode is Active
    hud.style.display = 'block';

    // Persist persistence check
    if (!currentChaosObjective) {
        let status = `<span style="color:#777">Waiting for Chaos...</span>`;

        // Append Active Backups Status
        if (activeBackups.length > 0) {
            status += `<br><span style="color:cyan; font-size:10px;">BACKUP ACTIVE: ${activeBackups.map(b => b.type.toUpperCase()).join(', ')}</span>`;
        } else {
            // Show Full Affection Companions status
            let fullLove = Object.keys(heroAffection).filter(k => heroAffection[k] >= 100 && k !== player.type && !lostHeroes.includes(k));
            if (fullLove.length > 0) {
                status += `<br><span style="color:#2ecc71; font-size:10px;">COMPANIONS: ${fullLove.map(t => t.toUpperCase()).join(', ')}</span>`;
            }
        }

        hud.innerHTML = status;
        return;
    }

    if (currentChaosObjective.completed || currentChaosObjective.failed) {
        // Just keep the last status message visible
        // Maybe add 'Completed' or 'Failed' tag again just in case
        return;
    }

    let obj = currentChaosObjective;
    // Ensure HUD is visible
    hud.style.display = 'block';

    // Render Content
    let rewardHtml = `<span style="margin-left:8px; color:#f1c40f; border:1px solid #f1c40f; padding:2px 5px; border-radius:4px; font-size:12px;">${obj.reward.icon} ${obj.reward.name}</span>`;

    let statusText = "";
    // Time limit check
    if (obj.duration && typeof obj.duration === 'number') {
        let elapsed = (Date.now() - obj.startTime) / 1000;
        let remaining = obj.duration - elapsed;

        if (remaining <= 0) {
            // Time up!
            if (obj.type === 'timer') {
                completeChaosObjective(true); return;
            } else if (obj.type === 'counter') {
                completeChaosObjective(false); return; // Counter needed to reach target
            } else if (obj.type === 'accumulation') {
                completeChaosObjective(false); return;
            }
        } else {
            statusText = `${obj.text} (${remaining.toFixed(1)}s)`;
        }
    } else if (obj.duration === 'wave') {
        statusText = `${obj.text} (Survive Wave)`;
    }

    // Accumulation check (e.g. Stand Still)
    if (obj.type === 'accumulation') {
        if (obj.id_check === 'STAND_STILL') {
            const isMoving = (keys['w'] || keys['a'] || keys['s'] || keys['d'] || player.moveInput.x !== 0 || player.moveInput.y !== 0);
            if (!isMoving) {
                obj.progress += dt;
                let pct = Math.min(100, (obj.progress / obj.target) * 100);
                statusText = `${obj.text} (${pct.toFixed(0)}%)`;
                if (obj.progress >= obj.target) { completeChaosObjective(true); return; }
            }
        }
    }

    // Counter Display
    if (obj.type === 'counter') {
        statusText = `${obj.text} (${Math.floor(obj.progress)}/${obj.target})`;
    }

    // Boss Kill Display
    if (obj.type === 'boss_kill') {
        statusText = `${obj.text}`;
    }

    if (statusText) hud.innerHTML = `CHALLENGE: ${statusText} ${rewardHtml}`;
}

function checkChaosEvent(eventType, val = 1) {
    if (!currentChaosObjective || currentChaosObjective.completed || currentChaosObjective.failed) return;
    let obj = currentChaosObjective;

    if (eventType === 'BOSS_KILL') {
        if (obj.type === 'boss_kill' && val === obj.bossId) {
            completeChaosObjective(true);
        }
        return;
    }

    if (obj.failOnHit && eventType === 'HIT') completeChaosObjective(false);
    if (obj.failOnHeal && eventType === 'HEAL') completeChaosObjective(false);
    if (obj.failOnAttack && eventType === 'ATTACK') completeChaosObjective(false);
    if (obj.failOnDash && eventType === 'DASH') completeChaosObjective(false);
    if (obj.failOnSpecial && eventType === 'SPECIAL') completeChaosObjective(false);

    if (obj.type === 'counter') {
        let match = false;
        if (obj.id === 'KILL_FAST' && eventType === 'KILL') match = true; // Generic Kill
        if (obj.counterType === 'GOLD' && eventType === 'GOLD') match = true;
        if (obj.counterType === 'DASH' && eventType === 'DASH') match = true;
        if (obj.counterType === 'MELEE_KILL' && eventType === 'KILL' && val.isMelee) match = true; // val needs structure check
        if (obj.counterType === 'PROJ_KILL' && eventType === 'KILL' && !val.isMelee) match = true;

        if (match) {
            obj.progress += (typeof val === 'number' ? val : 1);
            if (obj.progress >= obj.target) completeChaosObjective(true);
        }
    }
}

function completeChaosObjective(success) {
    currentChaosObjective.completed = true; // Stop checking
    let hud = document.getElementById('chaos-challenge-hud');
    let reward = currentChaosObjective.reward;

    if (success) {
        chaosObjectiveStreak++;
        if (hud) {
            hud.style.display = 'block';
            hud.style.color = '#2ecc71';
            hud.innerHTML = `COMPLETE: ${reward.icon} ${reward.name} (Streak: ${chaosObjectiveStreak})`;
        }
        showNotification(`CHALLENGE COMPLETE! ${reward.icon} ${reward.name}`);
        createExplosion(player.x, player.y, '#2ecc71', 30);
        if (typeof audioManager !== 'undefined') audioManager.play('challenge_success');

        // Apply Stat from Reward
        if (reward.id === 'damage') player.damageMultiplier = (player.damageMultiplier || 1) + reward.val;
        if (reward.id === 'health') { player.maxHp += reward.val; player.hp += reward.val; }
        if (reward.id === 'speed') player.speedMultiplier = (player.speedMultiplier || 0) + reward.val;
        if (reward.id === 'defense') player.damageReduction = Math.min(0.8, (player.damageReduction || 0) + reward.val);
        if (reward.id === 'gold') player.goldMultiplier = (player.goldMultiplier || 1) + reward.val;
        if (reward.id === 'luck') player.maskChance = (player.maskChance || 0.01) + reward.val;
        if (reward.id === 'xp') player.maxXp = Math.max(10, player.maxXp * (1 - reward.val));
        if (reward.id === 'cooldown') player.cooldownMultiplier = Math.max(0.1, (player.cooldownMultiplier || 1) - reward.val);
        if (reward.id === 'radius') {
            // Melee/Explosion Radius
            player.stats.meleeRadiusMult = (player.stats.meleeRadiusMult || 1) + reward.val;
            player.meleeRadius = 80 * player.stats.meleeRadiusMult;
            player.stats.blastRadiusMult = (player.stats.blastRadiusMult || 1) + reward.val;
        }
        if (reward.id === 'crit') player.critChance = (player.critChance || 0.05) + reward.val;

        if (reward.id === 'ARTIFACT') {
            // Meta Progression or Big Buff
            player.damageMultiplier += 0.5; // Example big buff
            showNotification("CHAOS ARTIFACT POWER ABSORBED!");
        }

    } else {
        chaosObjectiveStreak = 0;
        if (hud) {
            hud.style.display = 'block';
            hud.style.color = '#555';
            hud.innerHTML = `CHALLENGE FAILED`;
        }
        showNotification(`CHALLENGE FAILED`);
        if (typeof audioManager !== 'undefined') audioManager.play('challenge_fail');
        currentChaosObjective.failed = true;
    }
}