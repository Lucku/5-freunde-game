// TutorialMode.js — Playable Tutorial Mode Orchestrator
// 5 waves total, one per base hero. Each wave = 1 objective → boss fight → next hero.

const TutorialMode = {
    stage: 0,     // 0–4: current wave (also selects hero + objective)
    objective: null,
    bossForced: false,

    STAGES: [
        {
            hero: 'fire', biome: 'fire',
            title: 'The Fire Awakens',
            text: 'I opened my eyes to a sky full of embers. I don\'t know this place. But the heat — it doesn\'t burn me. It flows through me. And those things in the distance... they\'re coming.',
        },
        {
            hero: 'water', biome: 'water',
            title: 'The Water Stirs',
            text: 'Water. Everywhere. But I\'m not drowning. It bends around me like it knows my name. I don\'t know where I am. All I know is the creatures ahead don\'t belong in this calm.',
        },
        {
            hero: 'ice', biome: 'ice',
            title: 'The Ice Breaks',
            text: 'The world is still. Cold, and perfectly still. I should be freezing. I\'m not. My breath fogs the air and something shifts in the distance — dark shapes, getting closer.',
        },
        {
            hero: 'plant', biome: 'plant',
            title: 'The Plant Rises',
            text: 'I\'m standing in a forest I\'ve never seen, but somehow feel I\'ve always known. The roots beneath my feet pulse like veins. Something is wrong here. Something is coming.',
        },
        {
            hero: 'metal', biome: 'metal',
            title: 'The Metal Wakes',
            text: 'I don\'t remember falling asleep. I remember the city. Now there\'s only steel and silence — and those things moving at the edge of the light. I\'d better move.',
        },
    ],

    // One objective per wave (index matches stage).
    WAVE_OBJECTIVES: [
        { type: 'KILL', target: 5, text: 'Defeat {n} enemies', hint: 'Shoot with LEFT CLICK or RT.' },
        { type: 'MELEE', target: 3, text: 'Hit enemies with melee {n}×', hint: 'RIGHT CLICK or LT to melee attack.' },
        { type: 'ABILITY', target: 2, text: 'Use your special ability {n}×', hint: 'Press E or Y to activate your special.' },
        { type: 'DASH', target: 3, text: 'Dash {n} times', hint: 'Press SHIFT or A to dash.' },
        { type: 'GOLD', target: 20, text: 'Collect {n} coins', hint: 'Pick up gold dropped by enemies.' },
    ],

    // ── Lifecycle ────────────────────────────────────────────────────────────

    init: function () {
        this.stage = 0;
        this.objective = null;
        this.bossForced = false;
        this._resetForStage();
    },

    // Called by advanceWave() hook in game.js — starts the objective for the current stage.
    startObjective: function () {
        const def = this.WAVE_OBJECTIVES[this.stage];
        if (!def) return;
        this.bossForced = false;
        this.objective = {
            type: def.type,
            target: def.target,
            current: 0,
            text: def.text.replace('{n}', def.target),
            hint: def.hint,
        };
        if (typeof showNotification === 'function') {
            showNotification(this.objective.text.toUpperCase(), '#f1c40f', 180);
        }
    },

    // ── Objective Event Handlers ──────────────────────────────────────────────

    onKill: function () {
        if (!this.objective || this.objective.type !== 'KILL') return;
        this.objective.current++;
        this.checkProgress();
    },

    onMelee: function () {
        if (!this.objective || this.objective.type !== 'MELEE') return;
        this.objective.current++;
        this.checkProgress();
    },

    onAbility: function () {
        if (!this.objective || this.objective.type !== 'ABILITY') return;
        this.objective.current++;
        this.checkProgress();
    },

    onDash: function () {
        if (!this.objective || this.objective.type !== 'DASH') return;
        this.objective.current++;
        this.checkProgress();
    },

    onGold: function () {
        if (!this.objective || this.objective.type !== 'GOLD') return;
        this.objective.current++;
        this.checkProgress();
    },

    checkProgress: function () {
        if (!this.objective || this.bossForced) return;
        if (this.objective.current >= this.objective.target) {
            this._forceBoss();
        }
    },

    _forceBoss: function () {
        this.bossForced = true;
        this.objective = null; // Hide objective tracker immediately
        // Trigger boss-spawn threshold by faking the kill count.
        if (typeof ENEMIES_PER_WAVE !== 'undefined' && typeof wave !== 'undefined') {
            window.enemiesKilledInWave = ENEMIES_PER_WAVE * wave + 100;
        }
        if (typeof showNotification === 'function') {
            showNotification('OBJECTIVE COMPLETE! BOSS INCOMING!', '#e74c3c', 180);
        }
    },

    // ── Boss Defeated ────────────────────────────────────────────────────────

    // Called from game.js bossDeathTimer===0 block instead of triggerStory().
    onBossDefeated: function () {
        if (this.stage < 4) {
            // More waves remain — switch to next hero.
            this.stage++;
            this._resetForStage();
        } else {
            // All 5 waves complete.
            this.complete();
        }
    },

    // ── Stage Transition ─────────────────────────────────────────────────────

    _resetForStage: function () {
        const stageData = this.STAGES[this.stage];

        // Switch hero & biome globals used by game.js.
        window.selectedHeroType = stageData.hero;
        window.currentBiomeType = stageData.biome;

        // Recreate player for the new hero.
        if (typeof Player !== 'undefined' && window.arena) {
            window.player = new Player(stageData.hero);
            window.player.x = window.arena.width / 2;
            window.player.y = window.arena.height / 2;
        }

        // Reset wave-level state so closeStory() → advanceWave() restarts cleanly.
        window.enemies = [];
        window.projectiles = [];
        window.particles = [];
        window.floatingTexts = [];
        window.wave = 0;
        window.bossActive = false;
        window.bossDeathTimer = 0;
        window.enemiesKilledInWave = 0;

        // Open story screen with the hero's awakening narrative.
        // fromTutorial:true prevents chapter save in openStory().
        if (typeof openStory === 'function') {
            openStory({
                id: 'tutorial_' + (this.stage + 1),
                wave: 0,
                hero: stageData.hero.toUpperCase(),
                type: 'NARRATIVE',
                title: stageData.title,
                text: stageData.text,
                fromTutorial: true,
            });
        }
    },

    // ── Completion ───────────────────────────────────────────────────────────

    complete: function () {
        if (typeof saveData !== 'undefined') {
            if (!saveData.tutorial) saveData.tutorial = { seen: true, completed: false };
            saveData.tutorial.completed = true;
        }
        if (typeof unlockAchievement === 'function') unlockAchievement('TUTORIAL_COMPLETE');
        if (typeof checkAchievements === 'function') checkAchievements();
        if (typeof saveGame === 'function') saveGame();
        if (typeof showNotification === 'function') {
            showNotification('TUTORIAL COMPLETE! Well done, hero.', '#f1c40f', 300);
        }
        setTimeout(() => {
            if (typeof gameOver === 'function') gameOver(true);
        }, 3000);
    },

    // ── HUD Rendering ────────────────────────────────────────────────────────

    drawHUD: function (ctx) {
        if (!this.objective) return;

        const screenW = ctx.canvas.width;
        const barW = 400;
        const barH = 58;
        const bx = (screenW - barW) / 2;
        const by = 16;
        const radius = 12;

        ctx.save();

        // Background
        ctx.fillStyle = 'rgba(0,0,0,0.70)';
        this._roundRect(ctx, bx, by, barW, barH, radius);
        ctx.fill();

        // Gold accent border
        ctx.strokeStyle = 'rgba(241,196,15,0.6)';
        ctx.lineWidth = 1.5;
        this._roundRect(ctx, bx, by, barW, barH, radius);
        ctx.stroke();

        // Objective label
        ctx.fillStyle = '#fff';
        ctx.font = 'bold 13px "Segoe UI", Arial, sans-serif';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'top';
        ctx.fillText(`⬡ ${this.objective.text.toUpperCase()}`, screenW / 2, by + 8);

        // Hint text
        ctx.fillStyle = 'rgba(241,196,15,0.85)';
        ctx.font = '11px "Segoe UI", Arial, sans-serif';
        ctx.fillText(this.objective.hint, screenW / 2, by + 27);

        // Progress bar track
        const trackX = bx + 10;
        const trackY = by + barH - 14;
        const trackW = barW - 20;
        const trackH = 7;
        ctx.fillStyle = 'rgba(255,255,255,0.12)';
        this._roundRect(ctx, trackX, trackY, trackW, trackH, 4);
        ctx.fill();

        // Progress bar fill
        const progress = Math.min(1, this.objective.current / this.objective.target);
        if (progress > 0) {
            ctx.fillStyle = '#f1c40f';
            this._roundRect(ctx, trackX, trackY, trackW * progress, trackH, 4);
            ctx.fill();
        }

        // Count text
        ctx.fillStyle = '#f1c40f';
        ctx.font = 'bold 11px "Segoe UI", Arial, sans-serif';
        ctx.textAlign = 'right';
        ctx.textBaseline = 'middle';
        ctx.fillText(`${this.objective.current}/${this.objective.target}`, bx + barW - 8, trackY + trackH / 2);

        // Wave indicator (top-right of bar)
        ctx.fillStyle = 'rgba(255,255,255,0.4)';
        ctx.font = '10px "Segoe UI", Arial, sans-serif';
        ctx.textAlign = 'right';
        ctx.textBaseline = 'top';
        ctx.fillText(`WAVE ${this.stage + 1}/5`, bx + barW - 6, by + 2);

        ctx.restore();
    },

    _roundRect: function (ctx, x, y, w, h, r) {
        ctx.beginPath();
        ctx.moveTo(x + r, y);
        ctx.lineTo(x + w - r, y);
        ctx.arcTo(x + w, y, x + w, y + r, r);
        ctx.lineTo(x + w, y + h - r);
        ctx.arcTo(x + w, y + h, x + w - r, y + h, r);
        ctx.lineTo(x + r, y + h);
        ctx.arcTo(x, y + h, x, y + h - r, r);
        ctx.lineTo(x, y + r);
        ctx.arcTo(x, y, x + r, y, r);
        ctx.closePath();
    },
};

window.TutorialMode = TutorialMode;
