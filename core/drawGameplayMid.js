// #173 phase 10 — leaf-module extraction of `_drawGameplayMid`. Pure draw
// helper called from game.js. Reads every gameplay scalar/array via
// `globalThis.X` (resolves to `window.X` in the renderer, `global.X` server
// side). Both sides set up the same globals — renderer via the
// Object.defineProperties block in game.js, server via
// `server/simulation/loader.js`. The leaf module itself has zero DOM
// dependency at module-load time and is Node-loadable directly.
//
// Identifiers used: ctx, canvas, arena, player, player2, enemies,
// projectiles, particles, floatingTexts, companions, memoryShards,
// goldDrops, cardDrops, holyMasks, meleeAttacks, frame, score,
// currentBiomeType, currentObjective, currentWeather, coopZoom, saveData,
// audioManager, getHeroTheme, showNotification, isCoopMode,
// isAICompanionMode, isEvilMode, isVersusMode, applyScreenShake, Boss,
// BIOME_LOGIC, HERO_LOGIC, TutorialMode, TestingGrounds.
// (PowerUp draw moved to systems/powerUpSystem.js drawPowerUps in #5 phase 5.1.)
import { runState } from '../RunState.js';
import { drawPowerUps } from './systems/powerUpSystem.js';
import { drawCardDrops } from './systems/cardDropSystem.js';

export function _drawGameplayMid() {
    // Camera-bounds for the particle + floating-text on-screen check
    // (re-derived since _runGameplayMid's locals aren't shared).
    const _cullMargin = 64;
    const _camL = arena.camera.x - _cullMargin;
    const _camT = arena.camera.y - _cullMargin;
    const _camR = arena.camera.x + arena.camera.width  + _cullMargin;
    const _camB = arena.camera.y + arena.camera.height + _cullMargin;

    // ═══ phase 8 — lifted from _updateGameplayPre. Camera transform setup,
    // arena render, objective DOM + sapling/eye draws.
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.setTransform(1, 0, 0, 1, 0, 0); // reset any accumulated transform corruption

    // Apply Camera Transform
    ctx.save();

    // Queasy Cam Chaos Effect
    if (saveData.chaos && saveData.chaos.active && saveData.chaos.active.includes('DRUNK_CAM')) {
        const cx = (canvas.width / 2);
        const cy = (canvas.height / 2);
        const angle = Math.sin(frame * 0.05) * 0.1; // Sway
        const scale = 1 + Math.sin(frame * 0.03) * 0.05; // Breathe

        ctx.translate(cx, cy);
        ctx.rotate(angle);
        ctx.scale(scale, scale);
        ctx.translate(-cx, -cy);
    }

    // Screen shake (state owned by Camera.js).
    applyScreenShake(ctx);

    if (isCoopMode && coopZoom !== 1.0) ctx.scale(coopZoom, coopZoom);
    ctx.translate(-arena.camera.x, -arena.camera.y);

    // Draw World
    // Background follows Biome Type
    const themeType = currentBiomeType;
    if (arena) arena.biomeType = themeType;

    arena.draw(ctx, getHeroTheme(themeType));


    // Draw Objective Elements
    if (currentObjective && currentObjective.state === 'ACTIVE') {
        const objDisplay = document.getElementById('objective-display');
        const objText = document.getElementById('objective-text');
        const objBar = document.getElementById('objective-bar-container');
        const objFill = document.getElementById('objective-bar-fill');

        objDisplay.style.display = 'block';
        objBar.style.display = 'block';

        if (currentObjective.type === 'INFERNO') {
            objText.innerText = `COMBO TIME: ${Math.floor(currentObjective.current)} / ${currentObjective.target}s`;
            objFill.style.width = `${(currentObjective.current / currentObjective.target) * 100}%`;
            objFill.style.backgroundColor = '#e74c3c';
        } else if (currentObjective.type === 'DEFENSE') {
            const s = currentObjective.data.sapling;
            objText.innerText = `SAPLING HP: ${Math.floor(s.hp)}`;
            objFill.style.width = `${(s.hp / s.maxHp) * 100}%`;
            objFill.style.backgroundColor = '#2ecc71';

            // Draw Sapling in World
            ctx.save();
            ctx.translate(s.x - arena.camera.x, s.y - arena.camera.y);
            ctx.fillStyle = '#2ecc71';
            ctx.beginPath(); ctx.arc(0, 0, s.radius, 0, Math.PI * 2); ctx.fill();
            ctx.shadowBlur = 20; ctx.shadowColor = '#2ecc71'; ctx.stroke();
            ctx.restore();
        } else if (currentObjective.type === 'EYE_OF_STORM') {
            const eye = currentObjective.data.stormEye;
            objText.innerText = `TIME IN EYE: ${Math.floor(currentObjective.current)} / ${currentObjective.target}s`;
            objFill.style.width = `${(currentObjective.current / currentObjective.target) * 100}%`;
            objFill.style.backgroundColor = '#ecf0f1';

            // Draw Eye
            ctx.save();
            ctx.translate(eye.x - arena.camera.x, eye.y - arena.camera.y);

            // Safe Zone
            ctx.beginPath();
            ctx.arc(0, 0, eye.radius, 0, Math.PI * 2);
            ctx.fillStyle = 'rgba(52, 152, 219, 0.2)';
            ctx.fill();
            ctx.lineWidth = 5;
            ctx.strokeStyle = '#ecf0f1';
            ctx.stroke();
            ctx.restore();
        } else if (currentObjective.type === 'UNTOUCHABLE') {
            objText.innerText = `HITS TAKEN: ${currentObjective.current} / ${currentObjective.target}`;
            objFill.style.width = `${(currentObjective.current / currentObjective.target) * 100}%`;
            objFill.style.backgroundColor = '#3498db';
        } else if (currentObjective.type === 'IRON_WILL') {
            objText.innerText = `SURVIVE: ${Math.floor(currentObjective.current)} / ${currentObjective.target}s`;
            objFill.style.width = `${(currentObjective.current / currentObjective.target) * 100}%`;
            objFill.style.backgroundColor = '#95a5a6';
        }

        // DLC Hook: Draw UI
        if (window.HERO_LOGIC && window.HERO_LOGIC[player.type] && window.HERO_LOGIC[player.type].drawObjectiveUI) {
            window.HERO_LOGIC[player.type].drawObjectiveUI(currentObjective, objText, objFill);
        }
    } else {
        document.getElementById('objective-display').style.display = 'none';
    }

    // ═══ phase 7 — DRAW PHASE for the entity-loop subsystems. Moved here
    // from each subsystem's section so the draws cluster at the end. Order
    // preserved (companions → memShards → gold → card → holy → powerup
    // → projectile → melee → particles+fl.texts → enemies). Z-order between
    // subsystems unchanged; the only visual delta is that companions etc.
    // now draw AFTER updates of later subsystems in the same frame — which
    // is invisible because update + draw are both per-frame anyway.
    companions.forEach(c => c.draw(ctx));
    // Memory Shards draw pass — survivors of the collection sweep above.
    for (const shard of memoryShards) shard.draw(ctx);
    // Gold Drops draw pass — survivors of the pickup sweep above.
    for (const drop of goldDrops) drop.draw();
    // Card Drops draw pass — survivors of the pickup sweep above.
    drawCardDrops(ctx, runState);
    // Holy Masks draw pass — survivors of the pickup sweep above.
    for (const mask of holyMasks) mask.draw();
    // Powerups draw pass — survivors of the update loop above.
    drawPowerUps(ctx, runState);
    // Projectile draw pass — survivors of the update + collision sweep above.
    for (const proj of projectiles) proj.draw();
    // Melee swipes draw pass — survivors of the update loop above.
    for (const att of meleeAttacks) att.draw();

    // Particle draw pass.
    for (const part of particles) {
        if (part.x >= _camL && part.x <= _camR && part.y >= _camT && part.y <= _camB) part.draw();
    }
    // #25/#26 — Particle.draw leaves ctx.globalAlpha at the last
    // particle's alpha (the sprite-cache fast path skips save/restore).
    // Reset once after the loop instead of inside every draw() call.
    ctx.globalAlpha = 1;
    // Floating-text draw pass.
    for (const ft of floatingTexts) {
        if (ft.x >= _camL && ft.x <= _camR && ft.y >= _camT && ft.y <= _camB) ft.draw();
    }

    // #173 phase 6 — enemy draw pass. Survivors of the update + collision loop
    // above. Hit-flash overlay (ghost-only) renders on top of the enemy sprite.
    for (const enemy of enemies) {
        enemy.draw();
        if (enemy._ghost && enemy._hitFlash > 0) {
            ctx.save();
            ctx.globalAlpha = (enemy._hitFlash / 6) * 0.55;
            ctx.fillStyle = '#ffffff';
            ctx.beginPath();
            ctx.arc(enemy.x, enemy.y, (enemy.radius || 20) * 1.05, 0, Math.PI * 2);
            ctx.fill();
            ctx.restore();
        }
    }

    // #173 phase 7 — single-instance entity draws (relocated from inline
    // positions earlier in this function). Renders on top of all list-based
    // entities so the player is always visible. Z-order:
    //   enemies → player → evil overlay → player2 → versus AI + HP bars
    player.draw();
    if (isEvilMode && window.HERO_LOGIC && window.HERO_LOGIC[player.type]) {
        const _hl = window.HERO_LOGIC[player.type];
        if (_hl.drawOverlay) _hl.drawOverlay(player, ctx);
    }
    if ((isCoopMode || isAICompanionMode) && player2 && !player2.isDead) {
        player2.draw();
    }
    if (typeof window.additionalPlayers !== 'undefined') {
        window.additionalPlayers.forEach(p2 => {
            p2.draw();
            // HP bar overlay
            const percent = Math.max(0, p2.hp / p2.maxHp);
            ctx.save();
            ctx.fillStyle = 'red';
            ctx.fillRect(p2.x - 20, p2.y - 35, 40, 5);
            ctx.fillStyle = '#2ecc71';
            ctx.fillRect(p2.x - 20, p2.y - 35, 40 * percent, 5);
            ctx.restore();
        });
    }


    // ═══ phase 8 — lifted from _runGameplayMid. Camera restore, then
    // post-camera screen-space HUD draws (DLC biome, hero UI, minimap,
    // tutorial HUD, testing HUD, boss off-screen arrow).
    // Restore Camera Transform
    ctx.restore();

    // DLC Hook: Biome Draw (e.g. Falling Rock Shadows)
    if (window.BIOME_LOGIC && window.BIOME_LOGIC[currentBiomeType] && window.BIOME_LOGIC[currentBiomeType].draw) {
        ctx.save();
        // Apply camera transform again for biome effects
        ctx.translate(-arena.camera.x, -arena.camera.y);
        window.BIOME_LOGIC[currentBiomeType].draw(ctx, arena);
        ctx.restore();
    }

    // DLC Hook: Hero UI (e.g. Spirit Meter)
    if (window.HERO_LOGIC && player && window.HERO_LOGIC[player.type] && window.HERO_LOGIC[player.type].drawUI) {
        window.HERO_LOGIC[player.type].drawUI(ctx);
    }

    // #170 — Minimap (rendered into a separate DOM canvas)
    _renderMinimap();

    // Tutorial HUD
    if (isTutorialMode) TutorialMode.drawHUD(ctx);

    // Testing Grounds HUD
    if (isTestingMode) TestingGrounds.drawHUD(ctx);

    // Boss Off-Screen Direction Indicator
    if (bossActive && enemies.length > 0 && enemies[0] instanceof Boss) {
        const _boss = enemies[0];
        const _bsx = _boss.x - arena.camera.x;
        const _bsy = _boss.y - arena.camera.y;
        const _br = _boss.radius || 60;
        const _offScreen = _bsx < -_br || _bsx > canvas.width + _br ||
                           _bsy < -_br || _bsy > canvas.height + _br;
        if (_offScreen) {
            const _cx = canvas.width / 2;
            const _cy = canvas.height / 2;
            const _angle = Math.atan2(_bsy - _cy, _bsx - _cx);
            // Inner margin rectangle – keeps arrow off corners where UI lives
            const _ml = 52, _mr = canvas.width - 52;
            const _mt = 76, _mb = canvas.height - 52;
            const _dx = _bsx - _cx, _dy = _bsy - _cy;
            let _t = Infinity;
            if (_dx > 0) { const _ty = (_mr - _cx) / _dx; if (_ty > 0) { const _py = _cy + _ty * _dy; if (_py >= _mt && _py <= _mb) _t = Math.min(_t, _ty); } }
            if (_dx < 0) { const _ty = (_ml - _cx) / _dx; if (_ty > 0) { const _py = _cy + _ty * _dy; if (_py >= _mt && _py <= _mb) _t = Math.min(_t, _ty); } }
            if (_dy > 0) { const _tx = (_mb - _cy) / _dy; if (_tx > 0) { const _px = _cx + _tx * _dx; if (_px >= _ml && _px <= _mr) _t = Math.min(_t, _tx); } }
            if (_dy < 0) { const _tx = (_mt - _cy) / _dy; if (_tx > 0) { const _px = _cx + _tx * _dx; if (_px >= _ml && _px <= _mr) _t = Math.min(_t, _tx); } }
            if (_t !== Infinity) {
                const _ax = _cx + _t * _dx, _ay = _cy + _t * _dy;
                const _pulse = 0.55 + 0.2 * ((Math.sin(frame * 0.08) + 1) / 2);
                ctx.save();
                ctx.translate(_ax, _ay);
                ctx.rotate(_angle);
                ctx.globalAlpha = _pulse;
                const _s = 11;
                // Shadow
                ctx.shadowColor = 'rgba(0,0,0,0.6)';
                ctx.shadowBlur = 4;
                ctx.fillStyle = 'rgba(255, 80, 60, 1)';
                ctx.strokeStyle = 'rgba(255,255,255,0.55)';
                ctx.lineWidth = 1.2;
                ctx.beginPath();
                ctx.moveTo(_s, 0);
                ctx.lineTo(-_s * 0.55, -_s * 0.6);
                ctx.lineTo(-_s * 0.15, 0);
                ctx.lineTo(-_s * 0.55, _s * 0.6);
                ctx.closePath();
                ctx.fill();
                ctx.stroke();
                ctx.restore();
            }
        }
    }

    // SANDSTORM vision reduction (radial vignette)
    if (currentWeather && currentWeather.id === 'SANDSTORM') {
        const _swFadeIn = Math.min(1, (currentWeather.duration - weatherDuration) / 120);
        ctx.save();
        const _sg = ctx.createRadialGradient(canvas.width / 2, canvas.height / 2, 160, canvas.width / 2, canvas.height / 2, 700);
        _sg.addColorStop(0, 'transparent');
        _sg.addColorStop(0.5, `rgba(160, 110, 40, ${0.35 * _swFadeIn})`);
        _sg.addColorStop(1, `rgba(100, 70, 20, ${0.75 * _swFadeIn})`);
        ctx.fillStyle = _sg;
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        ctx.restore();
    }

    // ACIDIC FOG green tint vignette
    if (currentWeather && currentWeather.id === 'ACIDIC_FOG') {
        const _afFadeIn = Math.min(1, (currentWeather.duration - weatherDuration) / 120);
        ctx.save();
        const _ag = ctx.createRadialGradient(canvas.width / 2, canvas.height / 2, 100, canvas.width / 2, canvas.height / 2, 600);
        _ag.addColorStop(0, 'transparent');
        _ag.addColorStop(1, `rgba(40, 120, 40, ${0.45 * _afFadeIn})`);
        ctx.fillStyle = _ag;
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        ctx.restore();
    }

    // Chaos: Darkness (Fog of War) OR Mutator: Low Visibility
    const isLowVis = (typeof activeMutators !== 'undefined' && activeMutators.some(m => m.id === 'LOW_VISIBILITY'));
    if ((typeof isChaosActive === 'function' && isChaosActive('DARKNESS')) || isLowVis) {
        ctx.save();
        const gradient = ctx.createRadialGradient(canvas.width / 2, canvas.height / 2, 150, canvas.width / 2, canvas.height / 2, 800);
        gradient.addColorStop(0, 'transparent');
        gradient.addColorStop(0.4, 'rgba(0, 0, 0, 0.8)');
        gradient.addColorStop(1, 'rgba(0, 0, 0, 1)');
        ctx.fillStyle = gradient;
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        ctx.restore();
    }

    // Low Health Indicator + injured exclamation (fires once per drop below 20%)
    if (player.hp / player.maxHp < 0.2) {
        if (!player._injuredVoicePlayed) {
            player._injuredVoicePlayed = true;
            if (typeof audioManager !== 'undefined') audioManager.playHeroExclamation(player.type, 'injured');
        }
    } else {
        player._injuredVoicePlayed = false; // reset when healed above threshold
    }
    // Co-op: P2 injured exclamation
    if ((isCoopMode || isAICompanionMode) && player2 && !player2.isDead) {
        if (player2.hp / player2.maxHp < 0.2) {
            if (!player2._injuredVoicePlayed) {
                player2._injuredVoicePlayed = true;
                if (typeof audioManager !== 'undefined') audioManager.playHeroExclamation(player2.type, 'injured');
            }
        } else {
            player2._injuredVoicePlayed = false;
        }
    }
    const _hpRatio = player.hp / player.maxHp;
    if (_hpRatio < 0.25) {
        ctx.save();
        const _vigIntensity = Math.min(1, (0.25 - _hpRatio) / 0.25);
        // Static red vignette
        const _vg = ctx.createRadialGradient(canvas.width / 2, canvas.height / 2, canvas.height * 0.35, canvas.width / 2, canvas.height / 2, canvas.height * 0.78);
        _vg.addColorStop(0, 'transparent');
        _vg.addColorStop(1, `rgba(255, 0, 0, ${0.45 * _vigIntensity})`);
        ctx.fillStyle = _vg;
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        // Pulse overlay — reduced-motion mode keeps the static vignette
        // above but skips the time-varying alpha pass entirely.
        if (!isReducedMotion()) {
            const _pulseSpeed = 0.06 + _vigIntensity * 0.12;
            const _pulse = (Math.sin(frame * _pulseSpeed) + 1) / 2;
            ctx.fillStyle = `rgba(255, 0, 0, ${_pulse * 0.2 * _vigIntensity})`;
            ctx.fillRect(0, 0, canvas.width, canvas.height);
        }
        ctx.restore();
    }
}
