// #173 phase 10 — leaf-module extraction of `_updateGameplayMid`. Pure update
// helper called from game.js. Reads run-scoped state via the singleton
// `runState` imported from RunState.js. Module-scope renderer globals
// (`arena`, `canvas`, `audioManager`, `Boss`, `Enemy`, `PowerUp`, `Particle`,
// `FloatingText`, `Projectile`, `MeleeAttack`, `TutorialMode`, `EvilMode`,
// `Companion`, `ENEMY_TYPES`, `GAMEPLAY`, `BIOME_LOGIC`, `HERO_LOGIC`,
// `WEATHER_TYPES`, `MazeOfTime`, `MAX_PARTICLES`, etc.) and helper functions
// (`applyDamage`, `bumpDamageSource`, `triggerHitStop`, `triggerImpact`,
// `triggerStory`, `triggerVibration`, `applyScreenShake`, `getDecoyTarget`,
// `recordPlayerDamage`, `createExplosion`, `showNotification`, `gameOver`,
// `advanceWave`, `isWaveCleared`, `isPhotoMode`, `_replaceArrInPlace`,
// `_onlineHostSendSnapshot`, `_onlineEvents`, `_enemySpatialHash`,
// `_projectileSpatialHash`, etc.) resolve via bare-name global lookup —
// `window.X` bridges in the renderer, `global.X` stubs in
// `server/simulation/loader.js`.
import { runState } from '../RunState.js';
import {
    updatePowerUps, killPowerUp, getPowerUpType, POWERUP_RADIUS,
} from './systems/powerUpSystem.js';
import { killCardDrop, CARDDROP_RADIUS } from './systems/cardDropSystem.js';
import { killParticle, updateParticles } from './systems/particleSystem.js';

export
function _updateGameplayMid(deltaTime, _isHitStopped) {
    // --- Updates ---

    // Biome Effects on Player
    let biomeSpeedMod = 1;

    // DLC Hook: Biome Update
    if (window.BIOME_LOGIC && window.BIOME_LOGIC[runState.currentBiomeType]) {
        window.BIOME_LOGIC[runState.currentBiomeType].update(arena, runState.player, enemies);
    }

    arena.biomeZones.forEach(zone => {
        // Simple AABB collision
        if (runState.player.x > zone.x && runState.player.x < zone.x + zone.w &&
            runState.player.y > zone.y && runState.player.y < zone.y + zone.h) {

            // Immunity Check
            let isImmune = false;
            if (runState.player.type === 'fire' && zone.type === 'LAVA') isImmune = true;
            if (runState.player.type === 'ice' && zone.type === 'ICE') isImmune = true;
            if (runState.player.type === 'plant' && zone.type === 'MUD') isImmune = true;
            if (runState.player.type === 'water' && zone.type === 'WATER') isImmune = true;
            if (runState.player.type === 'metal' && zone.type === 'MAGNET') isImmune = true;

            if (!isImmune) {
                if (zone.type === 'MUD') biomeSpeedMod = 0.5;
                if (zone.type === 'ICE') biomeSpeedMod = 1.3; // Slide faster
                if (zone.type === 'WATER') biomeSpeedMod = 0.7;

                if (zone.type === 'LAVA' && runState.frame % 60 === 0) {
                    applyDamage(runState.player, 5, { label: 'LAVA' }); // #18
                    createExplosion(runState.player.x, runState.player.y, '#e74c3c');
                    showNotification("BURNING!");
                }

                if (zone.type === 'MAGNET') {
                    // Pull Player towards center
                    const cx = zone.x + zone.w / 2;
                    const cy = zone.y + zone.h / 2;
                    const angle = Math.atan2(cy - runState.player.y, cx - runState.player.x);
                    runState.player.x += Math.cos(angle) * 2; // Strong pull
                    runState.player.y += Math.sin(angle) * 2;
                }
            }
        }

        // Biome Effects on Enemies (Always active, no immunity for them)
        if (zone.type === 'MAGNET') {
            const cx = zone.x + zone.w / 2;
            const cy = zone.y + zone.h / 2;
            enemies.forEach(e => {
                if (e.x > zone.x && e.x < zone.x + zone.w &&
                    e.y > zone.y && e.y < zone.y + zone.h) {
                    const angle = Math.atan2(cy - e.y, cx - e.x);
                    e.x += Math.cos(angle) * 3; // Enemies get pulled harder
                    e.y += Math.sin(angle) * 3;
                }
            });
        }
    });
    runState.player.biomeSpeedMod = biomeSpeedMod;

    if (runState.isPlayerDying) {
        // Freeze player during death sequence
        runState.player.vx = 0;
        runState.player.vy = 0;
    } else {
        runState.player.update();
    }
    // #173 phase 7 — player.draw + evil overlay relocated to the draw cluster
    // at the end of this function so the player renders ON TOP of enemies
    // (previous behavior: player drew first → enemies covered the player when
    // overlapping; new behavior: player always visible).

    // Evil Mode hero ability update (overlay draw moved to cluster)
    if (runState.isEvilMode && window.HERO_LOGIC && window.HERO_LOGIC[runState.player.type]) {
        const _hl = window.HERO_LOGIC[runState.player.type];
        if (_hl.update)      _hl.update(runState.player, deltaTime / 1000);
    }

    // Co-op / AI companion: update + draw P2
    if ((runState.isCoopMode || runState.isAICompanionMode) && runState.player2) {
        if (!runState.player2.isDead) {
            // Online guest: P2 is a ghost — skip local physics, position set by network
            if (!runState.player2._ghost) {
                runState.player2.update();
                // Distance enforcement — rubber band above 1800px (skip for online — server handles)
                if (!runState.isOnlineMode) {
                    const _sep = Math.hypot(runState.player2.x - runState.player.x, player2.y - runState.player.y);
                    if (_sep > 1800) {
                        const _force = (_sep - 1800) * 0.06;
                        const _ang = Math.atan2(runState.player.y - runState.player2.y, player.x - runState.player2.x);
                        runState.player2.x += Math.cos(_ang) * _force;
                        runState.player2.y += Math.sin(_ang) * _force;
                        const _ang2 = Math.atan2(runState.player2.y - runState.player.y, player2.x - runState.player.x);
                        runState.player.x += Math.cos(_ang2) * _force * 0.3;
                        runState.player.y += Math.sin(_ang2) * _force * 0.3;
                    }
                    if (_sep > 1400) drawCoopDistanceWarning(ctx, runState.player2, _sep);
                }
            } else if (runState.player2._snapshotAt) {
                if (runState.player2._snapBuf && runState.player2._snapBuf.length >= 2) {
                    const _p2pos = _onlineInterpBuf(runState.player2._snapBuf, _onlineRenderTime());
                    runState.player2.x = _p2pos.x; runState.player2.y = _p2pos.y;
                } else {
                    // Fallback: extrapolate from single snapshot until buffer fills
                    const _p2dt = Math.min((Date.now() - runState.player2._snapshotAt) / 1000 * 60, 8);
                    const _smx = runState.player2._smx || 0, _smy = runState.player2._smy || 0;
                    const _moveLen = Math.hypot(_smx, _smy);
                    const _speed = (runState.player2.stats?.speed || 4) * (runState.player2.speedMultiplier || 1);
                    if (_moveLen > 0) {
                        runState.player2.x = runState.player2._sx + (_smx / _moveLen) * _speed * _p2dt;
                        runState.player2.y = runState.player2._sy + (_smy / _moveLen) * _speed * _p2dt;
                    } else {
                        runState.player2.x = runState.player2._sx;
                        runState.player2.y = runState.player2._sy;
                    }
                }
            }
        }
        // #173 phase 7 — player2.draw moved to the draw cluster at the end
        // of this function. Revival markers stay inline since they need
        // per-player state set up in this block.
        updateDrawRevivalMarkers(ctx);
    }

    // Online: interpolate ghost entities between buffered snapshots; reconcile own player; flush input
    if (runState.isOnlineMode && runState.gameRunning && !runState.gamePaused) {
        _onlineFrame++;

        // Interpolate ghost entities between buffered snapshots for smooth rendering
        const _now = Date.now();
        const _renderTime = _onlineRenderTime();
        enemies.forEach(e => {
            if (!e._ghost) return;
            if (e._snapBuf && e._snapBuf.length >= 2) {
                const _ep = _onlineInterpBuf(e._snapBuf, _renderTime);
                e.x = _ep.x; e.y = _ep.y;
            } else {
                const _dt = Math.min((_now - (e._snapshotAt || _now)) / 1000 * 60, 12);
                e.x = (e._sx ?? e.x) + (e.vx || 0) * _dt;
                e.y = (e._sy ?? e.y) + (e.vy || 0) * _dt;
            }
        });
        projectiles.forEach(p => {
            if (!p._ghost || !p._snapshotAt) return;
            if (p._snapBuf && p._snapBuf.length >= 2) {
                const _pp = _onlineInterpBuf(p._snapBuf, _renderTime);
                p.x = _pp.x; p.y = _pp.y;
            } else {
                const _dt = Math.min((_now - p._snapshotAt) / 1000 * 60, 12);
                p.x = p._sx + (p.velocity?.x || 0) * _dt;
                p.y = p._sy + (p.velocity?.y || 0) * _dt;
            }
        });
        // Drop orphan projectiles once render time has passed their last buffered
        // server position — they've finished their visible flight to impact.
        if (projectiles.some(p => p._orphanAt !== undefined)) {
            _replaceArrInPlace(projectiles, projectiles.filter(p => {
                if (p._orphanAt === undefined) return true;
                const lastT = p._snapBuf && p._snapBuf.length ? p._snapBuf[p._snapBuf.length - 1].t : 0;
                return _renderTime <= lastT;
            }));
        }

        // Own-player reconciliation. Trust client prediction whenever the
        // player has active input (running, dashing). Server speed now matches
        // client (sub-stepped Player.update) so drift during motion stays
        // within RTT jitter and there's nothing to correct anyway.
        //
        // The remaining visible jerk happened the moment the player STOPPED
        // moving: client stops at its predicted position, but the server keeps
        // applying the last received "move" input for ~RTT until the "stop"
        // arrives, so the next snapshot's server position is briefly overshot
        // past the client. Reconciling against that snapshot pulled the player
        // forward — perceived as a rubber-band on release of move keys.
        //
        // Solution: a post-move grace window that suspends reconciliation for
        // ~600 ms after stopping. Server has time to apply the stop input and
        // settle, so by the time we resume reconciliation the divergence is
        // tiny. Combined with a 30 px idle dead-zone, the rubber-band on stop
        // is invisible.
        if (runState.player) {
            if (runState.player.isDashing) runState.player._reconcileGrace = 18; // ~300 ms dash grace
            else if (runState.player._reconcileGrace > 0) runState.player._reconcileGrace--;

            const _mi  = runState.player.moveInput || { x: 0, y: 0 };
            const _isInputMoving = Math.abs(_mi.x) > 0.05 || Math.abs(_mi.y) > 0.05;
            if (runState.player._wasInputMoving && !_isInputMoving) {
                runState.player._postMoveGrace = 36; // ~600 ms — covers any plausible RTT
            } else if (runState.player._postMoveGrace > 0) {
                runState.player._postMoveGrace--;
            }
            runState.player._wasInputMoving = _isInputMoving;

            if (!runState.player.isDead && runState.player._serverTargetX !== undefined) {
                const _rdx = runState.player._serverTargetX - runState.player.x;
                const _rdy = runState.player._serverTargetY - runState.player.y;
                const _rd2 = _rdx * _rdx + _rdy * _rdy;
                if (_rd2 > 90000) {                       // > 300 px — teleport / death / extreme lag: hard snap
                    runState.player.x = runState.player._serverTargetX;
                    runState.player.y = runState.player._serverTargetY;
                } else if (!runState.player.isDashing && !runState.player._reconcileGrace
                        && !runState.player._postMoveGrace && !_isInputMoving
                        && _rd2 > 900) {                  // > 30 px idle dead-zone (was 4 px)
                    // Idle past grace, divergence beyond tolerance: gentle pull
                    runState.player.x += _rdx * 0.04;
                    runState.player.y += _rdy * 0.04;
                }
                // Otherwise: trust client prediction.
            }
        }
        // Both clients send input every frame so the server has up-to-date state
        window.networkManager?.flushInput();
    }

    // #173 phase 6 — companions split into update + draw passes.
    companions.forEach(c => { c.update(); });

    // Memory Shards — #173 phase 6 split. Update + collection in reverse loop,
    // draw pass over the survivors at the end of this block.
    for (let index = memoryShards.length - 1; index >= 0; index--) {
        const shard = memoryShards[index];
        shard.update();
        const dist = Math.hypot(runState.player.x - shard.x, player.y - shard.y);
        if (dist < runState.player.radius + 20) {
            // Collect
            memoryShards.splice(index, 1);
            showNotification("MEMORY RECOVERED!");
            createExplosion(shard.x, shard.y, shard.color);

            // Save Memory
            if (!saveData.memories) saveData.memories = {};

            const shardType = shard.heroType;

            // Migration: Convert number to array if needed
            if (typeof saveData.memories[shardType] === 'number') {
                const count = saveData.memories[shardType];
                saveData.memories[shardType] = [];
                for (let i = 0; i < count; i++) saveData.memories[shardType].push(i);
            }

            if (!saveData.memories[shardType]) saveData.memories[shardType] = [];

            const unlockedIndices = saveData.memories[shardType];
            const allStories = MEMORY_STORIES[shardType] || [];
            const availableIndices = [];
            for (let i = 0; i < allStories.length; i++) {
                if (!unlockedIndices.includes(i)) availableIndices.push(i);
            }

            if (availableIndices.length > 0) {
                const newIndex = availableIndices[Math.floor(Math.random() * availableIndices.length)];
                saveData.memories[shardType].push(newIndex);

                // Show Story Text
                const storyText = allStories[newIndex];
                showNotification(`MEMORY: "${storyText}"`);

                // Play Audio
                if (typeof audioManager !== 'undefined') {
                    audioManager.playVoice(shardType, newIndex);
                }
            } else {
                showNotification("MEMORY RECOVERED! (All collected)");
            }

            saveGame();

            // Secret Love shard #51 — auto-reveal once all 50 regular Love shards are collected
            if (shardType === 'love' && typeof window.ECHOS_LOVE_SECRET !== 'undefined') {
                const collected = saveData.memories['love'] || [];
                const allFiftyCollected = collected.length >= 50 &&
                    Array.from({ length: 50 }, (_, i) => i).every(i => collected.includes(i));
                if (allFiftyCollected && !saveData.memories['love_secret_51']) {
                    saveData.memories['love_secret_51'] = true;
                    setTimeout(() => {
                        showNotification(`✦ REVELATION: "${window.ECHOS_LOVE_SECRET}"`);
                        if (typeof audioManager !== 'undefined') audioManager.playVoice('love', 50);
                    }, 3000);
                    saveGame();
                }
            }
        } else if ((runState.isCoopMode || runState.isAICompanionMode) && runState.player2 && !runState.player2.isDead) {
            const distP2 = Math.hypot(runState.player2.x - shard.x, player2.y - shard.y);
            if (distP2 < runState.player2.radius + 20) {
                memoryShards.splice(index, 1);
                showNotification("MEMORY RECOVERED!");
                createExplosion(shard.x, shard.y, shard.color);

                if (!saveData.memories) saveData.memories = {};
                const shardType = shard.heroType;
                if (typeof saveData.memories[shardType] === 'number') {
                    const count = saveData.memories[shardType];
                    saveData.memories[shardType] = [];
                    for (let i = 0; i < count; i++) saveData.memories[shardType].push(i);
                }
                if (!saveData.memories[shardType]) saveData.memories[shardType] = [];
                const unlockedIndices = saveData.memories[shardType];
                const allStories = MEMORY_STORIES[shardType] || [];
                const availableIndices = [];
                for (let i = 0; i < allStories.length; i++) {
                    if (!unlockedIndices.includes(i)) availableIndices.push(i);
                }
                if (availableIndices.length > 0) {
                    const newIndex = availableIndices[Math.floor(Math.random() * availableIndices.length)];
                    saveData.memories[shardType].push(newIndex);
                    const storyText = allStories[newIndex];
                    showNotification(`MEMORY: "${storyText}"`);
                    if (typeof audioManager !== 'undefined') audioManager.playVoice(shardType, newIndex);
                } else {
                    showNotification("MEMORY RECOVERED! (All collected)");
                }
                saveGame();
            }
        }
    }


    // Gold Drops — #173 phase 6 split. Pickup + magnet pull in reverse loop,
    // draw pass over the survivors at the end of this block.
    for (let index = goldDrops.length - 1; index >= 0; index--) {
        const drop = goldDrops[index];
        // Golden Magnet (Chance Convergence)
        const pickupRad = runState.player.pickupRange || (runState.player.radius + 20);
        const dist = Math.hypot(runState.player.x - drop.x, player.y - drop.y);
        if (dist < pickupRad) {
            const amount = Math.floor(drop.value * runState.player.goldMultiplier);
            if (runState.player.gainGold) runState.player.gainGold(amount); // Use new method
            else runState.player.gold += amount; // Fallback

            if (runState.isChaosShuffleMode) checkChaosEvent('GOLD', amount);
            if (runState.isTutorialMode) TutorialMode.onGold();
            runState.currentRunStats.moneyGained += amount; // Track Gold
            saveData.global.totalGold += drop.value; // Track for achievement
            if (typeof audioManager !== 'undefined') audioManager.play('pickup_gold');
            GoldDrop.release(drop); // #20 P3 — return to pool before splice
            goldDrops.splice(index, 1);
        }
    }

    // Card Drops — #173 phase 6 split / #5 phase 5.2 ECS. Reverse iter for
    // killCardDrop's swap-with-last safety.
    for (let index = runState.cardDropCount - 1; index >= 0; index--) {
        const dx = runState.cardDropX[index];
        const dy = runState.cardDropY[index];
        const cardKey = runState.cardDropKey[index];
        const dist = Math.hypot(runState.player.x - dx, runState.player.y - dy);
        if (dist < runState.player.radius + CARDDROP_RADIUS) {
            const card = COLLECTOR_CARDS[cardKey];

            if (card && !saveData.collection.includes(cardKey)) {
                saveData.collection.push(cardKey);
                saveGame();

                // Show notification
                const notif = document.createElement('div');
                notif.className = 'achievement-popup'; // Reuse achievement style
                notif.style.borderColor = card.color;
                notif.innerHTML = `
                    <div style="font-size: 12px; color: #aaa;">NEW CARD FOUND!</div>
                    <div style="color: ${card.color}; font-weight: bold; font-size: 16px; margin: 5px 0;">${card.name}</div>
                    <div style="font-size: 12px;">${card.desc}</div>
                `;
                document.body.appendChild(notif);

                if (typeof audioManager !== 'undefined') {
                    audioManager.play('pickup_card');
                    audioManager.playHeroExclamation(runState.player.type, 'found');
                }

                // Trigger animation
                setTimeout(() => notif.classList.add('show'), 10);

                setTimeout(() => {
                    notif.classList.remove('show');
                    setTimeout(() => notif.remove(), 1000);
                }, 4000);
            }

            killCardDrop(runState, index);
        } else if ((runState.isCoopMode || runState.isAICompanionMode) && runState.player2 && !runState.player2.isDead) {
            const distP2 = Math.hypot(runState.player2.x - dx, runState.player2.y - dy);
            if (distP2 < runState.player2.radius + CARDDROP_RADIUS) {
                const card = COLLECTOR_CARDS[cardKey];
                if (card && !saveData.collection.includes(cardKey)) {
                    saveData.collection.push(cardKey);
                    saveGame();
                    const notif = document.createElement('div');
                    notif.className = 'achievement-popup';
                    notif.style.borderColor = card.color;
                    notif.innerHTML = `
                        <div style="font-size: 12px; color: #aaa;">NEW CARD FOUND!</div>
                        <div style="color: ${card.color}; font-weight: bold; font-size: 16px; margin: 5px 0;">${card.name}</div>
                        <div style="font-size: 12px;">${card.desc}</div>
                    `;
                    document.body.appendChild(notif);
                    if (typeof audioManager !== 'undefined') {
                        audioManager.play('pickup_card');
                        audioManager.playHeroExclamation(runState.player2.type, 'found');
                    }
                    setTimeout(() => notif.classList.add('show'), 10);
                    setTimeout(() => { notif.classList.remove('show'); setTimeout(() => notif.remove(), 1000); }, 4000);
                }
                killCardDrop(runState, index);
            }
        }
    }

    // Holy Masks — #173 phase 6 split. Same pattern.
    for (let index = holyMasks.length - 1; index >= 0; index--) {
        const mask = holyMasks[index];
        const dist = Math.hypot(runState.player.x - mask.x, player.y - mask.y);
        if (dist < runState.player.radius + 20) {
            if (mask.isTrueGolden) {
                // True Golden Mask Effect
                runState.player.damageMultiplier += 0.5; // +50% Damage
                runState.player.speedMultiplier += 0.2; // +20% Speed
                runState.player.maxHp += 50;
                runState.player.hp += 50;
                runState.player.cooldownMultiplier *= 0.8; // -20% Cooldown

                // Visual Flag
                runState.player.isGolden = true;

                showNotification("TRUE GOLDEN MASK! ALL STATS BOOSTED!");
                createExplosion(runState.player.x, runState.player.y, '#fff');
                if (typeof audioManager !== 'undefined') {
                    audioManager.play('pickup_mask');
                    audioManager.playHeroExclamation(runState.player.type, 'found');
                }

                // Unlock Achievement if exists?
            } else {
                saveData[runState.player.type].level++;
                saveGame();
                if (typeof audioManager !== 'undefined') {
                    audioManager.play('pickup_mask');
                    audioManager.playHeroExclamation(runState.player.type, 'found');
                }
                showNotification("PERMANENT LEVEL UP!");
                createExplosion(runState.player.x, runState.player.y, '#f1c40f');
            }
            holyMasks.splice(index, 1);
        } else if ((runState.isCoopMode || runState.isAICompanionMode) && runState.player2 && !runState.player2.isDead) {
            const distP2 = Math.hypot(runState.player2.x - mask.x, player2.y - mask.y);
            if (distP2 < runState.player2.radius + 20) {
                if (mask.isTrueGolden) {
                    runState.player2.damageMultiplier += 0.5;
                    runState.player2.speedMultiplier += 0.2;
                    runState.player2.maxHp += 50;
                    runState.player2.hp += 50;
                    runState.player2.cooldownMultiplier *= 0.8;
                    runState.player2.isGolden = true;
                    showNotification("TRUE GOLDEN MASK! ALL STATS BOOSTED!");
                    createExplosion(runState.player2.x, runState.player2.y, '#fff');
                } else {
                    saveData[runState.player2.type].level++;
                    saveGame();
                    showNotification("PERMANENT LEVEL UP!");
                    createExplosion(runState.player2.x, runState.player2.y, '#f1c40f');
                }
                if (typeof audioManager !== 'undefined') {
                    audioManager.play('pickup_mask');
                    audioManager.playHeroExclamation(runState.player2.type, 'found');
                }
                holyMasks.splice(index, 1);
            }
        }
    }

    // #173 phase 6 / #5 phase 5.1 — powerups: timers tick first, then a
    // reverse-iter pickup-collision pass. ECS slot allocation means killPowerUp
    // does swap-with-last, so the reverse iteration stays correct.
    updatePowerUps(runState);
    for (let index = runState.powerUpCount - 1; index >= 0; index--) {
        const px = runState.powerUpX[index];
        const py = runState.powerUpY[index];
        const ptype = getPowerUpType(runState, index);
        const dist = Math.hypot(runState.player.x - px, runState.player.y - py);
        if (dist < runState.player.radius + POWERUP_RADIUS) {
            if (ptype === 'HEAL') {
                runState.player.hp = Math.min(runState.player.hp + 30, runState.player.maxHp);
                if (runState.isChaosShuffleMode) checkChaosEvent('HEAL');
                createExplosion(runState.player.x, runState.player.y, '#2ecc71');
                if (typeof audioManager !== 'undefined') audioManager.play('pickup_heal');
            }
            else if (ptype === 'MAXHP') {
                runState.player.maxHp += 20; runState.player.hp += 20;
                createExplosion(runState.player.x, runState.player.y, '#e74c3c');
                if (typeof audioManager !== 'undefined') audioManager.play('pickup_maxhp');
            }
            else if (ptype === 'SPEED') {
                runState.player.buffs.speed = 600;
                createExplosion(runState.player.x, runState.player.y, '#f1c40f');
                if (typeof audioManager !== 'undefined') audioManager.play('pickup_speed');
            }
            else if (ptype === 'MULTI') {
                runState.player.buffs.multi = 600;
                createExplosion(runState.player.x, runState.player.y, '#3498db');
                if (typeof audioManager !== 'undefined') audioManager.play('pickup_multi');
            }
            else if (ptype === 'AUTOAIM') {
                if (runState.player.heroType === 'EARTH') {
                    // Earth Hero: Temporary Ram Damage Boost
                    runState.player.stats.ramDmgMult = (runState.player.stats.ramDmgMult || 1) + 1.0; // +100% Ram Damage
                    setTimeout(() => { runState.player.stats.ramDmgMult -= 1.0; }, 10000); // Lasts 10s
                    showNotification("RAM DAMAGE BOOST!");
                    createExplosion(runState.player.x, runState.player.y, '#e74c3c');
                } else {
                    runState.player.buffs.autoaim = 600;
                    createExplosion(runState.player.x, runState.player.y, '#9b59b6');
                }
                if (typeof audioManager !== 'undefined') audioManager.play('pickup_autoaim');
            }
            killPowerUp(runState, index);
        } else if ((runState.isCoopMode || runState.isAICompanionMode) && runState.player2 && !runState.player2.isDead) {
            // Co-op: P2 collects power-ups
            const distP2 = Math.hypot(runState.player2.x - px, runState.player2.y - py);
            if (distP2 < runState.player2.radius + POWERUP_RADIUS) {
                if (ptype === 'HEAL') { runState.player2.hp = Math.min(runState.player2.hp + 30, runState.player2.maxHp); createExplosion(runState.player2.x, runState.player2.y, '#2ecc71'); }
                else if (ptype === 'MAXHP') { runState.player2.maxHp += 20; runState.player2.hp += 20; }
                else if (ptype === 'SPEED') { runState.player2.buffs.speed = 600; }
                else if (ptype === 'MULTI') { runState.player2.buffs.multi = 600; }
                else if (ptype === 'AUTOAIM') { runState.player2.buffs.autoaim = 600; }
                killPowerUp(runState, index);
            } else if (runState.powerUpTimer[index] <= 0) killPowerUp(runState, index);
        } else if (runState.powerUpTimer[index] <= 0) killPowerUp(runState, index);
    }

    for (let index = projectiles.length - 1; index >= 0; index--) {
        const proj = projectiles[index];
        if (!_isHitStopped && !proj._ghost) proj.update();
        if (proj.life !== null && proj.life <= 0) {
            Projectile.release(proj); // #20 P3
            projectiles.splice(index, 1);
            continue;
        }

        // --- PVP LOGIC ---
        // Check collision against AI Players (Avoiding Self-Damage)
        if (typeof window.additionalPlayers !== 'undefined' && window.additionalPlayers.length > 0 && !proj.isEnemy) {
            window.additionalPlayers.forEach(p2 => {
                // Avoid self-damage 
                if (proj.owner === p2) return;

                if (Math.hypot(p2.x - proj.x, p2.y - proj.y) < p2.radius + proj.radius) {
                    p2.hp -= proj.damage;
                    floatingTexts.push(FloatingText.acquire(p2.x, p2.y - 40, proj.damage.toFixed(0), "#ff0000", 25));
                    proj.dead = true; // Mark dead
                    createExplosion(proj.x, proj.y, proj.color);
                    if (p2.hp <= 0) {
                        if (typeof runState.isEvilMode !== 'undefined' && runState.isEvilMode) {
                            // Evil Mode: mark dead so checkWaveEnd() sees it — don't splice yet
                            p2.isDead = true;
                            createExplosion(p2.x, p2.y, '#fff');
                        } else {
                            const idx = window.additionalPlayers.indexOf(p2);
                            if (idx > -1) window.additionalPlayers.splice(idx, 1);
                            createExplosion(p2.x, p2.y, '#fff');
                            showNotification("OPPONENT KO!");

                            if (runState.isVersusMode && window.additionalPlayers.length === 0) {
                                audioManager.playHeroExclamation(runState.player.type, 'boss_win');
                                setTimeout(() => gameOver(true), 2000);
                            } else if (!runState.isVersusMode && runState.bossActive && window.additionalPlayers.length === 0) {
                                // Story Mode Duel Victory
                                runState.bossActive = false;
                                runState.bossDeathTimer = GAMEPLAY.BOSS_DEATH_FRAMES; // 3 seconds for dramatic effect
                                triggerHitStop(GAMEPLAY.HITSTOP_BOSS_KILL); // #39 boss-kill freeze

                                // Clear any remaining enemies/projectiles
                                enemies.forEach(e => createExplosion(e.x, e.y, '#fff'));
                                enemies.length = 0;
                                projectiles.length = 0;
                            }
                        }
                    }
                }
            });

            // Also check collision against Main Player (Player 1) if owner is not Player 1
            if (proj.owner && proj.owner !== runState.player) {
                const p1 = runState.player;
                if (Math.hypot(p1.x - proj.x, p1.y - proj.y) < p1.radius + proj.radius) {
                    p1.takeDamage(proj.damage); // Use standard take damage
                    proj.dead = true;
                    createExplosion(proj.x, proj.y, proj.color);
                }
            }

            if (proj.dead) {
                Projectile.release(proj); // #20 P3
                projectiles.splice(index, 1);
                continue;
            }
        }

        // 2P Versus PvP: projectile hits between P1 and P2
        if (runState.isVersusMode && runState.isCoopMode && runState.player2 && !runState.player2.isDead && !proj.isEnemy) {
            if (proj.owner === runState.player) {
                // P1 projectile → P2
                if (Math.hypot(runState.player2.x - proj.x, runState.player2.y - proj.y) < runState.player2.radius + proj.radius) {
                    const dmg = proj.damage * (1 - runState.player2.damageReduction);
                    runState.player2.hp -= dmg;
                    floatingTexts.push(FloatingText.acquire(runState.player2.x, runState.player2.y - 40, Math.ceil(dmg), "#ff4444", 25));
                    proj.dead = true;
                    createExplosion(proj.x, proj.y, proj.color);
                    if (runState.player2.hp <= 0 && !runState.player2.isDead) {
                        runState.player2.isDead = true; runState.player2.hp = 0;
                        createExplosion(runState.player2.x, runState.player2.y, '#fff');
                        showNotification("OPPONENT KO!");
                        audioManager.playHeroExclamation(runState.player.type, 'boss_win');
                        setTimeout(() => gameOver(true), 2000);
                    }
                }
            } else if (proj.owner === runState.player2 && !runState.player.isInvincible) {
                // P2 projectile → P1
                if (Math.hypot(runState.player.x - proj.x, runState.player.y - proj.y) < runState.player.radius + proj.radius) {
                    runState.player.takeDamage(proj.damage);
                    proj.dead = true;
                    createExplosion(proj.x, proj.y, proj.color);
                }
            }
            if (proj.dead) { Projectile.release(proj); projectiles.splice(index, 1); continue; } // #20 P3
        }

        if (arena.checkCollision(proj.x, proj.y, proj.radius)) {
            if (proj.isExplosive) {
                const _cands = queryEnemiesNear(proj.x, proj.y, 100);
                for (let _ci = 0; _ci < _cands.length; _ci++) {
                    const e = _cands[_ci];
                    if (Math.hypot(e.x - proj.x, e.y - proj.y) < 100) {
                        e.hp -= proj.damage;
                        runState.currentRunStats.damageDealt += proj.damage; // Track Damage
                        saveData.global.totalDamage += proj.damage;
                        bumpDamageSource('projectile', proj.damage);
                    }
                }
                createExplosion(proj.x, proj.y, '#e67e22');
            }
            Projectile.release(proj); // #20 P3
            projectiles.splice(index, 1);
            continue;
        }
        if (proj.x < 0 || proj.x > arena.width || proj.y < 0 || proj.y > arena.height) {
            Projectile.release(proj); // #20 P3
            projectiles.splice(index, 1);
        }
    }

    // #173 phase 6 — melee swipes: split update + PvP collision from draw.
    for (let index = meleeAttacks.length - 1; index >= 0; index--) {
        const att = meleeAttacks[index];
        att.update();

        // PvP Collision: P1 vs P2 (AI)
        if (att.owner === runState.player && typeof window.additionalPlayers !== 'undefined') {
            window.additionalPlayers.forEach(p2 => {
                const pid = p2.id || 'P2';
                if (att.hitList.includes(pid)) return;
                if (Math.hypot(p2.x - att.x, p2.y - att.y) < att.radius + p2.radius) {
                    const angleTo = Math.atan2(p2.y - att.y, p2.x - att.x);
                    let diff = angleTo - att.angle;
                    while (diff < -Math.PI) diff += Math.PI * 2;
                    while (diff > Math.PI) diff -= Math.PI * 2;
                    if (Math.abs(diff) < Math.PI / 3) {
                        if (p2.hp > 0) {
                            p2.hp -= att.damage;
                            att.hitList.push(pid);
                            createExplosion(p2.x, p2.y, att.color);
                            floatingTexts.push(FloatingText.acquire(p2.x, p2.y - 40, att.damage.toFixed(0), "#ff0000", 25));
                            if (p2.hp <= 0) {
                                if (typeof runState.isEvilMode !== 'undefined' && runState.isEvilMode) {
                                    // Evil Mode: mark dead so checkWaveEnd() sees it — don't splice yet
                                    p2.isDead = true;
                                    createExplosion(p2.x, p2.y, '#fff');
                                } else {
                                    const idx = window.additionalPlayers.indexOf(p2);
                                    if (idx > -1) window.additionalPlayers.splice(idx, 1);
                                    createExplosion(p2.x, p2.y, '#fff');
                                    showNotification("OPPONENT KO!");

                                    if (runState.isVersusMode && window.additionalPlayers.length === 0) {
                                        audioManager.playHeroExclamation(runState.player.type, 'boss_win');
                                        setTimeout(() => gameOver(true), 2000);
                                    } else if (!runState.isVersusMode && runState.bossActive && window.additionalPlayers.length === 0) {
                                        runState.bossActive = false;
                                        runState.bossDeathTimer = GAMEPLAY.BOSS_DEATH_FRAMES;
                                        triggerHitStop(GAMEPLAY.HITSTOP_BOSS_KILL); // #39 boss-kill freeze
                                        enemies.forEach(e => createExplosion(e.x, e.y, '#fff'));
                                        enemies.length = 0;
                                        projectiles.length = 0;
                                    }
                                }
                            }
                        }
                    }
                }
            });
        }

        // 2P Versus: P1 melee → P2
        if (runState.isVersusMode && runState.isCoopMode && runState.player2 && !runState.player2.isDead && att.owner === runState.player) {
            const pid = 'PLAYER_2';
            if (!att.hitList.includes(pid) && Math.hypot(runState.player2.x - att.x, runState.player2.y - att.y) < att.radius + runState.player2.radius) {
                const angleTo = Math.atan2(runState.player2.y - att.y, player2.x - att.x);
                let diff = angleTo - att.angle;
                while (diff < -Math.PI) diff += Math.PI * 2;
                while (diff > Math.PI) diff -= Math.PI * 2;
                if (Math.abs(diff) < Math.PI / 3) {
                    const dmg = att.damage * (1 - runState.player2.damageReduction);
                    runState.player2.hp -= dmg;
                    att.hitList.push(pid);
                    createExplosion(runState.player2.x, runState.player2.y, att.color);
                    floatingTexts.push(FloatingText.acquire(runState.player2.x, runState.player2.y - 40, Math.ceil(dmg), "#ff4444", 25));
                    if (runState.player2.hp <= 0 && !runState.player2.isDead) {
                        runState.player2.isDead = true; runState.player2.hp = 0;
                        createExplosion(runState.player2.x, runState.player2.y, '#fff');
                        showNotification("OPPONENT KO!");
                        audioManager.playHeroExclamation(runState.player.type, 'boss_win');
                        setTimeout(() => gameOver(true), 2000);
                    }
                }
            }
        }

        // PvP Collision: P2 (AI or 2P-Versus) vs P1
        if (att.owner && att.owner !== runState.player && !att.hitList.includes('PLAYER')) {
            if (Math.hypot(runState.player.x - att.x, runState.player.y - att.y) < att.radius + runState.player.radius) {
                const angleTo = Math.atan2(runState.player.y - att.y, player.x - att.x);
                let diff = angleTo - att.angle;
                while (diff < -Math.PI) diff += Math.PI * 2;
                while (diff > Math.PI) diff -= Math.PI * 2;
                if (Math.abs(diff) < Math.PI / 3) {
                    if (!runState.player.isInvincible && runState.player.hp > 0) {
                        runState.player.takeDamage(att.damage);
                        att.hitList.push('PLAYER');
                        createExplosion(runState.player.x, runState.player.y, att.color);
                    }
                }
            }
        }

        if (att.life <= 0) { MeleeSwipe.release(att); meleeAttacks.splice(index, 1); } // #20 P3
    }

    // #27 — camera-bounds culling. Skip draw for off-screen particles +
    // floating text; skip update entirely when far outside (≥2× margin),
    // because those particles will never return into view.
    const _cullMargin   = 64;
    const _cullFarMargin = _cullMargin * 2;
    const _camL = arena.camera.x - _cullMargin;
    const _camT = arena.camera.y - _cullMargin;
    const _camR = arena.camera.x + arena.camera.width  + _cullMargin;
    const _camB = arena.camera.y + arena.camera.height + _cullMargin;
    const _camLFar = arena.camera.x - _cullFarMargin;
    const _camTFar = arena.camera.y - _cullFarMargin;
    const _camRFar = arena.camera.x + arena.camera.width  + _cullFarMargin;
    const _camBFar = arena.camera.y + arena.camera.height + _cullFarMargin;

    // #173 phase 6 — particles split into update+cull pass + draw pass.
    // The far-offscreen cull (≥2× margin) releases immediately because those
    // particles will never re-enter the camera. The on-screen draw check is
    // recomputed in the draw pass since `part.x/y` may have shifted in update.
    // #5 phase 5.4 — ECS particle tick. Far-offscreen cull first (slots will
    // never re-enter camera bounds), then physics step + alpha decay via
    // updateParticles which handles kill-on-zero-alpha internally.
    for (let index = runState.particleCount - 1; index >= 0; index--) {
        const px = runState.particleX[index];
        const py = runState.particleY[index];
        if (px < _camLFar || px > _camRFar || py < _camTFar || py > _camBFar) {
            killParticle(runState, index);
        }
    }
    updateParticles(runState);

    // Update and Draw Floating Texts (cap at 80 — drop oldest when full)
    if (floatingTexts.length > GAMEPLAY.MAX_FLOATING_TEXTS) {
        // #20 release the dropped slice into the pool before truncating.
        const _excess = floatingTexts.length - GAMEPLAY.MAX_FLOATING_TEXTS;
        for (let _i = 0; _i < _excess; _i++) FloatingText.release(floatingTexts[_i]);
        floatingTexts.splice(0, _excess);
    }
    // #173 phase 6 — floating texts split same way as particles.
    for (let index = floatingTexts.length - 1; index >= 0; index--) {
        const ft = floatingTexts[index];
        const _ftFarOff = ft.x < _camLFar || ft.x > _camRFar || ft.y < _camTFar || ft.y > _camBFar;
        if (_ftFarOff) {
            FloatingText.release(ft);
            floatingTexts.splice(index, 1);
            continue;
        }
        ft.update();
        if (ft.life <= 0) {
            FloatingText.release(ft); // #20 return to pool before splice
            floatingTexts.splice(index, 1);
        }
    }

    // #173 phase 7 — versus AI: update pass only. Draws moved to the draw
    // cluster so AI players + HP bars render on top of all entities.
    if (typeof window.additionalPlayers !== 'undefined') {
        window.additionalPlayers.forEach(p2 => {
            if (p2.controller) {
                p2.update();
            }
        });
    }

    // #19 P2 — Lift enemy-projectile vs player(s) collision OUT of the
    // per-enemy inner sweep. Each enemy projectile collides with the
    // player exactly once regardless of how many enemies are on screen,
    // so this branch is independent of the enemies array. Running it
    // here trims the inner sweep's responsibilities to friendly
    // projectile → enemy hits, which CAN exploit spatial locality.
    for (let _pi = projectiles.length - 1; _pi >= 0; _pi--) {
        const _proj = projectiles[_pi];
        if (!_proj.isEnemy) continue;
        const _pDist = Math.hypot(_proj.x - runState.player.x, _proj.y - runState.player.y);
        if (_pDist < runState.player.radius + _proj.radius) {
            const _bonuses = getCollectionBonuses(_proj.shooterType);

            if (_proj.shooterType === 'SHOOTER' && _bonuses.specials.includes('SHOOTER_DODGE') && Math.random() < 0.15) {
                floatingTexts.push(FloatingText.acquire(runState.player.x, runState.player.y - 40, "DODGE", "#f1c40f", 20));
                Projectile.release(_proj); // #20 P3
                projectiles.splice(_pi, 1);
                continue;
            }

            if (_proj.shooterType === 'TOXIC' && _bonuses.specials.includes('TOXIC_IMMUNE')) {
                continue;
            }

            const _finalDmg = _proj.damage * _bonuses.defenseMult;
            const _dmgTaken = _finalDmg * (1 - runState.player.damageReduction);

            if (!runState.player.isInvincible) {
                runState.player.hp -= _dmgTaken;
                recordPlayerDamage(runState.player, _proj.shooterType || 'PROJECTILE', _dmgTaken); // #168
                audioManager.play('damage');
                floatingTexts.push(FloatingText.acquire(runState.player.x, runState.player.y - 20, Math.ceil(_dmgTaken), '#e74c3c', 20));
                runState.currentRunStats.damageTaken += _dmgTaken;
                runState.player.resetCombo();
                triggerImpact(3.5, 10, 0.28, 0.55, 180);

                if (runState.player.heroType === 'EARTH' && runState.player.momentum > 0) {
                    runState.player.momentum = Math.max(0, runState.player.momentum - 30);
                }
            }

            createExplosion(runState.player.x, runState.player.y, _proj.color);
            Projectile.release(_proj); // #20 P3
            projectiles.splice(_pi, 1);

            if (runState.player.transformActive) {
                runState.player.transformActive = false;
                runState.player.currentForm = 'NONE';
                showNotification("FORM BROKEN!");
            }
        } else if ((runState.isCoopMode || runState.isAICompanionMode) && runState.player2 && !runState.player2.isDead && !runState.player2.isInvincible) {
            const _pDistP2 = Math.hypot(_proj.x - runState.player2.x, _proj.y - runState.player2.y);
            if (_pDistP2 < runState.player2.radius + _proj.radius) {
                const _p2Dmg = _proj.damage * (1 - runState.player2.damageReduction);
                runState.player2.hp -= _p2Dmg;
                floatingTexts.push(FloatingText.acquire(runState.player2.x, runState.player2.y - 20, Math.ceil(_p2Dmg), '#e74c3c', 20));
                createExplosion(runState.player2.x, runState.player2.y, _proj.color);
                Projectile.release(_proj); // #20 P3
                projectiles.splice(_pi, 1);
                if (runState.player2.hp <= 0 && !runState.player2.isDead) {
                    runState.player2.isDead = true; runState.player2.hp = 0; runState.player2.isInvincible = true;
                    runState.player2.isDashing = false; runState.player2.moveInput = { x: 0, y: 0 };
                    runState.p2RevivalMarker = { x: runState.player2.x, y: runState.player2.y, progress: 0, maxProgress: 240 };
                    createExplosion(runState.player2.x, runState.player2.y, '#3b82f6');
                    if (typeof audioManager !== 'undefined') audioManager.playHeroExclamation(runState.player2.type, 'failure');
                    showNotification(runState.isAICompanionMode ? 'Ally down! Stand on marker to revive.' : 'P2 down! Stand on marker to revive.');
                }
            }
        }
    }

    // #19 P2 — Build broad-phase indices for this frame. Enemies hash
    // serves AOE-radius scans + per-enemy projectile queries below;
    // projectiles hash serves the per-enemy collision sweep that was
    // O(N×M) before inversion. Both honour _SPATIAL_HASH_MIN: when
    // entity counts are low, the rebuild + map overhead exceeds the
    // savings, so the per-frame _*HashActive flag flips off and the
    // queryEnemiesNear / queryProjectilesNear helpers linear-scan.
    _enemyHashActive = !!_enemySpatialHash && enemies.length >= _SPATIAL_HASH_MIN;
    _projectileHashActive = !!_projectileSpatialHash && projectiles.length >= _SPATIAL_HASH_MIN;
    if (_enemyHashActive) _enemySpatialHash.rebuild(enemies);
    if (_projectileHashActive) _projectileSpatialHash.rebuild(projectiles);

    // #24 P10 — time the enemy update + draw + collision phase.
    // Wave 30+ profile feeds the decision whether a Web Worker AI
    // pass (#24) is worth the rewrite.
    const _enemiesT0 = performance.now();
    for (let eIndex = enemies.length - 1; eIndex >= 0; eIndex--) {
        const enemy = enemies[eIndex];
        if (enemy.dead) { enemies.splice(eIndex, 1); continue; }

        // #28 — Biome-zone collision cache. AABB iteration is the hottest
        // zone cost (200 enemies × ~10 zones = 2k checks/frame). Refresh
        // the cached speed mod every 4 frames, or whenever LAVA DPS could
        // fire (frame % 60 === 0). Enemies move ~3–5 px/frame and zones
        // are 200–800 px wide, so staleness is invisible.
        if (enemy._zoneRefreshAt === undefined || runState.frame >= enemy._zoneRefreshAt || runState.frame % 60 === 0) {
            let enemySpeedMod = 1;
            arena.biomeZones.forEach(zone => {
                if (enemy.x > zone.x && enemy.x < zone.x + zone.w &&
                    enemy.y > zone.y && enemy.y < zone.y + zone.h) {

                    if (zone.type === 'MUD') enemySpeedMod = 0.5;
                    if (zone.type === 'ICE') enemySpeedMod = 1.3;
                    if (zone.type === 'WATER') enemySpeedMod = 0.7;

                    if (zone.type === 'LAVA' && runState.frame % 60 === 0) {
                        enemy.hp -= 5;
                        createExplosion(enemy.x, enemy.y, '#e74c3c');
                    }
                }
            });
            enemy.biomeSpeedMod = enemySpeedMod;
            enemy._zoneRefreshAt = runState.frame + 4;
        }

        if (!_isHitStopped && !enemy._ghost) enemy.update();
        // enemy.draw + hit-flash overlay moved to dedicated draw pass after
        // this loop (#173 phase 6). The hit-flash decrement stays here since
        // it's state mutation; the visual is drawn below at the new flash value.
        if (enemy._ghost && enemy._hitFlash > 0) enemy._hitFlash--;
        const dist = Math.hypot(runState.player.x - enemy.x, player.y - enemy.y);

        if (dist - enemy.radius - runState.player.radius < 0 && !runState.player.isDashing) {
            // Invincibility Check
            if (runState.player.invincibleTimer > 0) {
                // Frostbite Armor (Altar c2)
                if (runState.player.hasFrostbiteArmor) {
                    enemy.frozenTimer = 180; // 3s Freeze
                    floatingTexts.push(FloatingText.acquire(enemy.x, enemy.y - 40, "FROZEN", "#aaddff", 16));
                }

                // Reflect damage?
                enemy.hp -= 5;
                createExplosion(runState.player.x, runState.player.y, '#95a5a6');
                const angle = Math.atan2(enemy.y - runState.player.y, enemy.x - runState.player.x);
                enemy.x += Math.cos(angle) * 20; enemy.y += Math.sin(angle) * 20;
                continue; // Skip damage
            }

            // Earth Hero Max Momentum Invulnerability (Ramming)
            if (runState.player.heroType === 'EARTH' && runState.player.momentum >= runState.player.maxMomentum * 0.95) {
                // Bounce enemy away
                const angle = Math.atan2(enemy.y - runState.player.y, enemy.x - runState.player.x);
                if (!(enemy instanceof Boss)) {
                    enemy.x += Math.cos(angle) * 50;
                    enemy.y += Math.sin(angle) * 50;
                }
                createExplosion(runState.player.x, runState.player.y, '#8d6e63');
                continue; // No damage taken
            }

            // Void Hero Realm Shift (Phasing)
            if (runState.player.type === 'void' && runState.player.inRealmShift) {
                continue; // No collision damage
            }

            let dmgTaken = 1 * (1 - runState.player.damageReduction);

            // Speedster Explosion
            if (enemy.subType === 'SPEEDSTER') {
                let speedsterDmg = 20;
                const bonuses = getCollectionBonuses('SPEEDSTER');
                speedsterDmg *= bonuses.defenseMult;

                dmgTaken = speedsterDmg * (1 - runState.player.damageReduction);
                createExplosion(runState.player.x, runState.player.y, '#e74c3c');
                enemy.hp = 0; // Suicide
            }

            // Thornmail (Altar p3) — #177: route reflect damage through
            // applyDamage so it respects isInvincible + customOnDamage on
            // the enemy. Keeps the original "REFLECT" pop + explosion.
            if (runState.player.thornmailTimer > 0) {
                applyDamage(enemy, 20, { label: 'Thornmail', color: '#2ecc71', noFloatText: true, sfx: null });
                createExplosion(runState.player.x, runState.player.y, '#2ecc71');
                floatingTexts.push(FloatingText.acquire(runState.player.x, runState.player.y - 40, "REFLECT", "#2ecc71", 16));
            }

            if (!runState.player.isInvincible) {
                // Hook: Custom pre-damage check (for Shields etc)
                let damagePrevented = false;
                if (runState.player.customOnDamage) {
                    damagePrevented = runState.player.customOnDamage(dmgTaken);
                }

                if (!damagePrevented) {
                    runState.player.hp -= dmgTaken;
                    recordPlayerDamage(runState.player, enemy.subType || 'ENEMY', dmgTaken); // #168
                    audioManager.play('damage');
                    if (runState.isChaosShuffleMode) checkChaosEvent('HIT');
                    floatingTexts.push(FloatingText.acquire(runState.player.x, runState.player.y - 20, Math.ceil(dmgTaken), "#e74c3c", 20));
                    runState.currentRunStats.damageTaken += dmgTaken; // Track Damage
                    runState.player.resetCombo(); // Reset Combo on Damage
                    // Player hit by enemy body — medium jolt
                    triggerImpact(4, 10, 0.30, 0.55, 200);
                }
            }
            createExplosion(runState.player.x, runState.player.y, '#5e3939');

            if (runState.player.transformActive) {
                runState.player.transformActive = false;
                runState.player.currentForm = 'NONE';
                showNotification("FORM BROKEN!");
            }

            const angle = Math.atan2(enemy.y - runState.player.y, enemy.x - runState.player.x);
            if (!(enemy instanceof Boss)) { enemy.x += Math.cos(angle) * 20; enemy.y += Math.sin(angle) * 20; }
        }

        // Co-op: P2 enemy body contact damage
        if ((runState.isCoopMode || runState.isAICompanionMode) && runState.player2 && !runState.player2.isDead && !runState.player2.isInvincible) {
            const distP2 = Math.hypot(runState.player2.x - enemy.x, player2.y - enemy.y);
            if (distP2 - enemy.radius - runState.player2.radius < 0 && !runState.player2.isDashing) {
                let p2Dmg = 1 * (1 - runState.player2.damageReduction);
                if (enemy.subType === 'SPEEDSTER') { p2Dmg = 20 * (1 - runState.player2.damageReduction); enemy.hp = 0; }
                runState.player2.hp -= p2Dmg;
                floatingTexts.push(FloatingText.acquire(runState.player2.x, runState.player2.y - 20, Math.ceil(p2Dmg), '#e74c3c', 20));
                if (runState.player2.transformActive) { runState.player2.transformActive = false; runState.player2.currentForm = 'NONE'; }
                const a2 = Math.atan2(enemy.y - runState.player2.y, enemy.x - runState.player2.x);
                if (!(enemy instanceof Boss)) { enemy.x += Math.cos(a2) * 20; enemy.y += Math.sin(a2) * 20; }
                // P2 death in co-op
                if (runState.player2.hp <= 0 && !runState.player2.isDead) {
                    runState.player2.isDead = true; runState.player2.hp = 0; runState.player2.isInvincible = true;
                    runState.player2.isDashing = false; runState.player2.moveInput = { x: 0, y: 0 };
                    runState.p2RevivalMarker = { x: runState.player2.x, y: runState.player2.y, progress: 0, maxProgress: 240 };
                    createExplosion(runState.player2.x, runState.player2.y, '#3b82f6');
                    if (typeof audioManager !== 'undefined') audioManager.playHeroExclamation(runState.player2.type, 'failure');
                    showNotification(runState.isAICompanionMode ? 'Ally down! Stand on marker to revive.' : 'P2 down! Stand on marker to revive.');
                }
            }
        }

        // #19 P2 — Per-enemy projectile collision. Iterates only the
        // spatial-hash candidates near this enemy (~3–10 at wave 30+)
        // instead of the full projectiles array (N×M → N×k). Enemy
        // projectiles vs player were lifted into the pre-pass above
        // and are skipped here. pIndex is resolved lazily via
        // projectiles.indexOf only when a splice is needed.
        const _qR = (enemy.radius || 30) + 60;
        const _projCands = queryProjectilesNear(enemy.x, enemy.y, _qR);
        for (let _ci = 0; _ci < _projCands.length; _ci++) {
            const proj = _projCands[_ci];
            if (!proj || proj.isEnemy) continue;

            const pDist = Math.hypot(proj.x - enemy.x, proj.y - enemy.y);
            if (pDist - enemy.radius - proj.radius >= 0) continue;

            // Ghost enemies on the guest side: consume the projectile
            // for visual feedback but skip authoritative damage/flash.
            if (enemy._ghost) {
                if (!proj.pierce || proj.pierce <= 0) {
                    const _gIdx = projectiles.indexOf(proj);
                    if (_gIdx >= 0) { Projectile.release(proj); projectiles.splice(_gIdx, 1); } // #20 P3
                }
                continue;
            }

            // DLC projectile hook — STOP suppresses default damage.
            if (proj.onHit) {
                const result = proj.onHit(enemy);
                if (result === 'STOP') {
                    if (proj.life <= 0) {
                        const _hIdx = projectiles.indexOf(proj);
                        if (_hIdx >= 0) { Projectile.release(proj); projectiles.splice(_hIdx, 1); } // #20 P3
                    }
                    continue;
                }
            }

            // Boss immunity check
            if (enemy instanceof Boss && enemy.immune) {
                floatingTexts.push(FloatingText.acquire(enemy.x, enemy.y - 40, "IMMUNE", "#fff", 20));
                const _bIdx = projectiles.indexOf(proj);
                if (_bIdx >= 0) { Projectile.release(proj); projectiles.splice(_bIdx, 1); } // #20 P3
                continue;
            }

            let finalDamage = proj.damage;

            const bonuses = getCollectionBonuses(enemy.subType);
            if (enemy instanceof Boss) {
                const bossBonuses = getCollectionBonuses('BOSS');
                bonuses.damageMult += (bossBonuses.damageMult - 1);

                if (enemy.type === 'TANK' && enemy.phase === 2) {
                    bonuses.damageMult *= 1.5;
                }
            }

            finalDamage *= bonuses.damageMult;

            let isCrit = proj.isCrit;
            if (!isCrit && Math.random() < (runState.player.critChance + bonuses.critChance)) {
                isCrit = true;
                finalDamage *= runState.player.critMultiplier;
            }

            if (enemy.subType === 'SHIELDER' && bonuses.specials.includes('SHIELD_PIERCE')) {
                finalDamage *= 1.5;
            }

            if (proj.isWildfire) {
                finalDamage += 10;
                createExplosion(enemy.x, enemy.y, '#e67e22');
            }

            if (proj.isCryo) {
                enemy.frozenTimer = 60;
                floatingTexts.push(FloatingText.acquire(enemy.x, enemy.y - 40, "FROZEN", "#aaddff", 16));
            }

            enemy.hp -= finalDamage;
            enemy.hitFlashTimer = 6;
            audioManager.play('enemy_damage');
            if (enemy.hp <= 0 && enemy.hp + finalDamage > 0) {
                enemy.lastHitBy = 'PROJECTILE';
                enemy.killer = proj.owner || runState.player;
            }

            triggerImpact(isCrit ? 3.5 : 2, isCrit ? 8 : 5,
                          isCrit ? 0.15 : 0.08, isCrit ? 0.25 : 0.12,
                          isCrit ? 120 : 80);
            if (isCrit) triggerHitStop(GAMEPLAY.HITSTOP_CRIT_SHOT);

            floatingTexts.push(FloatingText.acquire(
                enemy.x,
                enemy.y - 20,
                Math.floor(finalDamage) + (isCrit ? '!' : ''),
                isCrit ? '#f1c40f' : '#fff',
                isCrit ? 30 : 16
            ));

            runState.currentRunStats.damageDealt += finalDamage;
            saveData.global.totalDamage += finalDamage;
            bumpDamageSource('projectile', finalDamage);
            createExplosion(enemy.x, enemy.y, proj.color);
            if (proj.isExplosive) {
                triggerImpact(4.5, 12, 0.22, 0.55, 220);
                const _splashCands = queryEnemiesNear(proj.x, proj.y, 100);
                for (let _si = 0; _si < _splashCands.length; _si++) {
                    const nearby = _splashCands[_si];
                    if (Math.hypot(nearby.x - proj.x, nearby.y - proj.y) < 100) {
                        nearby.hp -= proj.damage;
                        if (nearby.hp <= 0 && nearby.hp + proj.damage > 0) {
                            nearby.lastHitBy = 'PROJECTILE';
                            nearby.killer = proj.owner || runState.player;
                        }

                        floatingTexts.push(FloatingText.acquire(nearby.x, nearby.y - 20, Math.floor(proj.damage), '#e67e22', 16));

                        runState.currentRunStats.damageDealt += proj.damage;
                        saveData.global.totalDamage += proj.damage;
                        bumpDamageSource('projectile', proj.damage);
                    }
                }
                const _eIdx = projectiles.indexOf(proj);
                if (_eIdx >= 0) { Projectile.release(proj); projectiles.splice(_eIdx, 1); } // #20 P3
            } else {
                if (proj.pierce > 0) {
                    proj.pierce--;
                } else {
                    const _nIdx = projectiles.indexOf(proj);
                    if (_nIdx >= 0) { Projectile.release(proj); projectiles.splice(_nIdx, 1); } // #20 P3
                }
            }
            if (!(enemy instanceof Boss)) {
                const angle = Math.atan2(enemy.y - proj.y, enemy.x - proj.x);
                enemy.x += Math.cos(angle) * proj.knockback; enemy.y += Math.sin(angle) * proj.knockback;
            }
        }

        meleeAttacks.forEach(att => {
            if (att.hitList.includes(eIndex)) return;
            const dx = enemy.x - att.x; const dy = enemy.y - att.y;
            const dist = Math.sqrt(dx * dx + dy * dy);
            if (dist < att.radius + enemy.radius) {
                const angleToEnemy = Math.atan2(dy, dx);
                let diff = angleToEnemy - att.angle;
                while (diff < -Math.PI) diff += Math.PI * 2; while (diff > Math.PI) diff -= Math.PI * 2;
                if (Math.abs(diff) < Math.PI / 3) {
                    enemy.hp -= att.damage;
                    enemy.hitFlashTimer = 6;
                    if (enemy.hp <= 0 && enemy.hp + att.damage > 0) {
                        enemy.lastHitBy = 'MELEE';
                        enemy.killer = att.owner || runState.player;
                    }
                    if (runState.isTutorialMode) TutorialMode.onMelee();

                    // Melee impact — heavier thud
                    const isCrit = att.isCrit;
                    triggerImpact(isCrit ? 7 : 5, isCrit ? 16 : 13,
                                  isCrit ? 0.35 : 0.22, isCrit ? 0.70 : 0.50,
                                  isCrit ? 220 : 160);
                    if (isCrit) triggerHitStop(GAMEPLAY.HITSTOP_CRIT_MELEE); else triggerHitStop(GAMEPLAY.HITSTOP_HIT);
                    floatingTexts.push(FloatingText.acquire(
                        enemy.x,
                        enemy.y - 20,
                        Math.floor(att.damage) + (isCrit ? '!' : ''),
                        isCrit ? '#f1c40f' : '#fff',
                        isCrit ? 35 : 20
                    ));

                    runState.currentRunStats.damageDealt += att.damage; // Track Damage
                    saveData.global.totalDamage += att.damage;
                    bumpDamageSource('melee', att.damage);
                    createExplosion(enemy.x, enemy.y, att.color); att.hitList.push(eIndex);
                    if (!(enemy instanceof Boss)) { enemy.x += Math.cos(angleToEnemy) * 50; enemy.y += Math.sin(angleToEnemy) * 50; }
                }
            }
        });

        if (enemy.hp <= 0) {
            enemy.dead = true; // Prevent double-processing if forEach+splice skips this enemy
            if (!(enemy instanceof Boss)) createDeathBurst(enemy.x, enemy.y, enemy.color || '#e74c3c');
            if (runState.isChaosShuffleMode) checkChaosEvent('KILL', { isMelee: (enemy.lastHitBy === 'MELEE') });
            if (runState.isTutorialMode && !(enemy instanceof Boss)) TutorialMode.onKill();
            // Boss Minion Logic
            if (enemy.isSummonedMinion && enemy.parentBoss) {
                enemy.parentBoss.minionsToKill--;
            }

            runState.player.addCombo(); // Add Combo
            if (runState.player.onKill) runState.player.onKill(); // Trigger onKill effects (e.g. Black Hero Heal)
            checkAchievements(); // Check achievements on kill

            // Mutator: Explosive Personality
            if ((runState.isDailyMode || runState.isWeeklyMode) && runState.activeMutators.some(m => m.id === 'EXPLOSIVE')) {
                createExplosion(enemy.x, enemy.y, '#e74c3c');
                if (Math.hypot(runState.player.x - enemy.x, runState.player.y - enemy.y) < 100) {
                    applyDamage(runState.player, 10, { label: 'EXPLOSION' }); // #18
                }
            }

            if (enemy instanceof Boss) {
                // Makuta Achievement Check
                if (enemy.type === 'MAKUTA' && runState.wave >= 100) {
                    unlockAchievement('MAKUTA_SLAYER'); // Base Achievement

                    // Hard Mode Achievements (1-10)
                    const prestige = saveData[runState.player.type].prestige;
                    for (let i = 1; i <= 10; i++) {
                        if (prestige >= i) unlockAchievement(`MAKUTA_HM_${i}`);
                    }

                    showNotification("MAKUTA DEFEATED!");
                }

                runState.currentRunStats.bossesKilled++; // Track Boss Kill
                saveData.global.totalBosses = (saveData.global.totalBosses || 0) + 1; // Achievement track
                if (runState.currentRunStats.keyMoments) {
                    const _km_t = Math.floor((Date.now() - (runState.currentRunStats.startTime || Date.now())) / 1000);
                    runState.currentRunStats.keyMoments.push({ wave: runState.wave, timeSec: _km_t, kind: 'boss_kill', label: enemy.bossType || 'Boss' });
                }
                runState.score += 1000; runState.player.gainXp(500);
                if ((runState.isCoopMode || runState.isAICompanionMode) && runState.player2 && !runState.player2.isDead) runState.player2.gainXp(500);
                createExplosion(enemy.x, enemy.y, '#c0392b');
                checkDrop('BOSS', enemy.x, enemy.y); // Boss Card

                // CHAOS EVENT HOOK
                if (typeof checkChaosEvent === 'function') checkChaosEvent('BOSS_KILL', enemy.type);

                // Unlock Hero Story Achievement
                if (enemy.type === 'MAKUTA' && runState.wave >= 100) {
                    // True Golden Mask moved to Wave 90 start

                    if (runState.player.type === 'fire') unlockAchievement('STORY_FIRE');
                    if (runState.player.type === 'water') unlockAchievement('STORY_WATER');
                    if (runState.player.type === 'ice') unlockAchievement('STORY_ICE');
                    if (runState.player.type === 'plant') unlockAchievement('STORY_PLANT');
                    if (runState.player.type === 'metal') unlockAchievement('STORY_METAL');
                }

                // DLC boss-specific achievements (superbosses, etc.)
                if (window.DLC_STORY_ACHIEVEMENTS[enemy.type]) {
                    unlockAchievement(window.DLC_STORY_ACHIEVEMENTS[enemy.type]);
                }

                enemies.splice(eIndex, 1);
                const remainingBosses = enemies.filter(e => e instanceof Boss).length;
                if (remainingBosses === 0) {
                    runState.bossActive = false;

                    // Start Boss Death Sequence
                    runState.bossDeathTimer = GAMEPLAY.BOSS_DEATH_FRAMES; // 3 seconds at 60 FPS
                    triggerHitStop(GAMEPLAY.HITSTOP_BOSS_KILL); // #39 boss-kill freeze
                    if (typeof audioManager !== 'undefined') {
                        audioManager.play('wave_completed');
                        if (runState.currentStoryEvent && runState.currentStoryEvent.type === 'BOSS_FIGHT') {
                            audioManager.playHeroExclamation(runState.player.type, 'boss_win');
                            // Villain defeat cry (delayed so it doesn't clash with player's win line)
                            if (enemy.type === 'GREEN_GOBLIN' || enemy.type === 'MAKUTA') {
                                const _vType = enemy.type === 'GREEN_GOBLIN' ? 'green_goblin' : 'makuta';
                                setTimeout(() => audioManager.playHeroExclamation(_vType, 'failure'), 2200);
                            }
                        }
                    }


                    // Clear all other enemies instantly for dramatic effect
                    enemies.forEach(e => createExplosion(e.x, e.y, '#fff'));
                    enemies.length = 0;
                    projectiles.length = 0; // Clear projectiles too
                }
            } else {
                // Swarm Explosion (Tier 4)
                if (enemy.subType === 'SWARM' && saveData.collection.includes('SWARM_4')) {
                    createExplosion(enemy.x, enemy.y, '#8e44ad');
                    const _swarmCands = queryEnemiesNear(enemy.x, enemy.y, 100);
                    for (let _wi = 0; _wi < _swarmCands.length; _wi++) {
                        const nearby = _swarmCands[_wi];
                        if (nearby !== enemy && Math.hypot(nearby.x - enemy.x, nearby.y - enemy.y) < 100) {
                            nearby.hp -= 20;
                            floatingTexts.push(FloatingText.acquire(nearby.x, nearby.y - 20, "20", "#8e44ad", 16));
                        }
                    }
                }

                runState.currentRunStats.enemiesKilled++; // Track Kill

                // Track Specific Enemy Kills for Achievements
                const killKey = `kill_${enemy.subType}`;
                if (!saveData.stats[killKey]) saveData.stats[killKey] = 0;
                saveData.stats[killKey]++;

                const _eventXpMult = window.worldEvents?.getXpMultiplier?.() ?? 1;
                const _xpMod = (runState.bossActive ? 0.15 : 1) * _eventXpMult;
                const _killer = (runState.isCoopMode && enemy.killer) ? enemy.killer : runState.player;
                runState.score += 10; _killer.gainXp(Math.round(20 * _xpMod));
                createExplosion(enemy.x, enemy.y, '#aaa');

                // Elite Logic on Death
                if (enemy.isElite) {
                    runState.score += 500;
                    _killer.gainXp(Math.round(200 * _xpMod));
                    createExplosion(enemy.x, enemy.y, enemy.eliteType.color);

                    // Elite Card Drop
                    checkDrop(enemy.eliteType.id, enemy.x, enemy.y);

                    if (enemy.eliteType.id === 'EXPLODER') {
                        let radius = 200;
                        if (saveData.collection.includes('ELITE_EXPLODER_4')) radius = 160; // Nerf

                        createExplosion(enemy.x, enemy.y, '#e74c3c');
                        // Damage Player
                        if (Math.hypot(runState.player.x - enemy.x, runState.player.y - enemy.y) < radius) {
                            applyDamage(runState.player, 30, { label: 'EXPLODER' }); // #18
                        }
                    }
                }

                // Mask Drop Logic (Capped at 5 per wave)
                if (masksDroppedInWave < 5 && Math.random() < runState.player.maskChance) {
                    holyMasks.push(new HolyMask(enemy.x, enemy.y));
                    masksDroppedInWave++;
                }

                // Mutator: No Regen (No Health Drops)
                if (!((runState.isDailyMode || runState.isWeeklyMode) && runState.activeMutators.some(m => m.id === 'NO_REGEN'))) {
                    if (Math.random() < 0.3) goldDrops.push(GoldDrop.acquire(enemy.x, enemy.y)); // Gold Drop
                } else {
                    // Still drop gold, but maybe less? Or just no health potions if they existed as drops.
                    // Wait, GoldDrop is money. Health is usually from Shop or Skills.
                    // If "No Regen" means no healing, we should block healing in Player.js or here.
                    // Let's assume "No Health Drops" refers to potential future drops or just disable lifesteal/regen.
                    // For now, let's just block Gold Drops as a penalty or rename mutator to "Poverty".
                    // Actually, let's stick to the description: "No Health Drops spawn".
                    // Since we don't have health drops yet (only shop potions), let's make it block Gold Drops instead for now?
                    // Or better: Block Shop Healing.
                }
                if (Math.random() < 0.3) goldDrops.push(GoldDrop.acquire(enemy.x, enemy.y));

                // Check for Card Drop
                checkDrop(enemy.subType || 'BASIC', enemy.x, enemy.y);

                enemies.splice(eIndex, 1);
                if (!runState.bossActive) runState.enemiesKilledInWave++;
            }
        }
    }
    _recordPhase('enemies', performance.now() - _enemiesT0); // #24 P10

    // #173 phase 9 — player-death cinematic state machine. Trigger detection
    // (hp ≤ 0), co-op revive marker drop, isPlayerDying flag flip, timer
    // decrement, and gameOver() call. Pure state mutation — the visual fade
    // + screen shake lives in _drawGameplayPost (driven by isPlayerDying +
    // playerDeathTimer). Photo mode skips this entirely (caller-side gate)
    // so the death sequence pauses with the rest of the world.
    if (runState.player.hp <= 0 && !runState.player.isDead) {
        if (!runState.isVersusMode && (runState.isCoopMode || runState.isAICompanionMode) && runState.player2 && !runState.player2.isDead) {
            // Co-op / AI companion: P1 dies but P2 is alive — drop revival marker.
            runState.player.isDead = true;
            runState.player.hp = 0;
            runState.player.isInvincible = true;
            runState.player.isDashing = false;
            runState.player.moveInput = { x: 0, y: 0 };
            runState.p1RevivalMarker = { x: runState.player.x, y: runState.player.y, progress: 0, maxProgress: 240 };
            createExplosion(runState.player.x, runState.player.y, '#ffffff');
            showNotification(runState.isAICompanionMode ? 'You\'re down! Ally is coming to revive you.' : 'P1 down! Stand on marker to revive.');
        } else if (!runState.isPlayerDying && !runState.isOnlineGuest) {
            runState.isPlayerDying = true;
            runState.playerDeathTimer = 180; // 3 seconds animation
            createExplosion(runState.player.x, runState.player.y, '#c0392b');
            triggerImpact(14, 30, 0.70, 1.0, 800); // Death — maximum rumble
            runState.player.isDashing = false;
            runState.player.moveInput = { x: 0, y: 0 };
            runState.player.isInvincible = true; // Prevent further damage (negative HP)
            if (typeof audioManager !== 'undefined') {
                try { audioManager.play('death'); } catch (e) { }
                audioManager.playHeroExclamation(runState.player.type, 'failure');
            }
        }
    }
    // Co-op: both players dead → game over (separate check needed because the
    // revival-marker path sets player.isDead=true, which blocks the block above).
    if (!runState.isPlayerDying && !runState.isOnlineGuest &&
        !runState.isVersusMode && (runState.isCoopMode || runState.isAICompanionMode) &&
        runState.player.isDead && runState.player2 && runState.player2.isDead) {
        runState.isPlayerDying = true;
        runState.playerDeathTimer = 180;
        createExplosion(runState.player.x, runState.player.y, '#c0392b');
        triggerImpact(14, 30, 0.70, 1.0, 800);
        runState.player.isDashing = false;
        runState.player.moveInput = { x: 0, y: 0 };
        if (typeof audioManager !== 'undefined') {
            try { audioManager.play('death'); } catch (e) { }
            audioManager.playHeroExclamation(runState.player.type, 'failure');
        }
    }
    // Cinematic timer tick — spawns blood-burst particles at regular intervals
    // and ends the run when the timer hits 0.
    if (runState.isPlayerDying) {
        runState.playerDeathTimer--;
        if (runState.playerDeathTimer % 15 === 0) {
            createExplosion(runState.player.x + (Math.random() - 0.5) * 60, runState.player.y + (Math.random() - 0.5) * 60, '#c0392b');
        }
        if (runState.playerDeathTimer <= 0) {
            runState.isPlayerDying = false;
            gameOver();
        }
    }
}
// — end #173 phase 10 leaf module —
