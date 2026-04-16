class AudioManager {
    constructor() {
        this.tracks = {
            // Music
            menu:     new Audio('audio/music/main_menu.wav'),
            museum:   new Audio('audio/music/museum.wav'),
            makuta:   new Audio('audio/music/boss_makuta.wav'),
            goblin:   new Audio('audio/music/boss_green_goblin.wav'),
            battle:   new Audio('audio/music/battle.wav'),
            gameover: new Audio('audio/music/game_over.wav'),
            victory:  new Audio('audio/music/victory.wav'),

            // SFX
            level_up:          new Audio('audio/sounds/level_up.wav'),
            pickup_card:       new Audio('audio/sounds/pick_up_collectors_card.wav'),
            pickup_mask:       new Audio('audio/sounds/pick_up_golden_mark.wav'),
            pickup_gold:       new Audio('audio/sounds/pickup_gold.wav'),
            pickup_heal:       new Audio('audio/sounds/pickup_heal.wav'),
            pickup_maxhp:      new Audio('audio/sounds/pickup_maxhp.wav'),
            pickup_speed:      new Audio('audio/sounds/pickup_speed.wav'),
            pickup_multi:      new Audio('audio/sounds/pickup_multi.wav'),
            pickup_autoaim:    new Audio('audio/sounds/pickup_autoaim.wav'),
            wave_completed:    new Audio('audio/sounds/wave_completed.wav'),
            achievement_unlocked: new Audio('audio/sounds/achievement_unlocked.wav'),
            enemy_damage:      new Audio('audio/sounds/enemy_damage.wav'),
            dash:              new Audio('audio/sounds/dash_all.wav'),
            boss_shooter:         new Audio('audio/sounds/boss_shooter.wav'),
            boss_tank_ring:       new Audio('audio/sounds/boss_tank_ring.wav'),
            boss_tank_phase2:     new Audio('audio/sounds/boss_tank_phase2.wav'),
            boss_summoner_spawn:  new Audio('audio/sounds/boss_summoner_spawn.wav'),
            boss_summoner_phase2: new Audio('audio/sounds/boss_summoner_phase2.wav'),
            boss_summoner_shield_break: new Audio('audio/sounds/boss_summoner_shield_break.wav'),
            boss_makuta_teleport:     new Audio('audio/sounds/boss_makuta_teleport.wav'),
            boss_makuta_shadow_nova:  new Audio('audio/sounds/boss_makuta_shadow_nova.wav'),
            boss_makuta_shadow_beam:  new Audio('audio/sounds/boss_makuta_shadow_beam.wav'),
            challenge_success: new Audio('audio/sounds/challenge_success.wav'),
            challenge_fail:    new Audio('audio/sounds/challenge_fail.wav'),
            damage:            new Audio('audio/sounds/damage.wav'),
            death:             new Audio('audio/sounds/death.wav'),
            melee_all:         new Audio('audio/sounds/melee_all.wav'),
            boss_rhino_charge: new Audio('audio/sounds/boss_rhino_charge.wav'),
            boss_stomp:        new Audio('audio/sounds/boss_stomp.wav'),
            attack_fire:       new Audio('audio/sounds/attack_fire.wav'),
            attack_water:      new Audio('audio/sounds/attack_water.wav'),
            attack_ice:        new Audio('audio/sounds/attack_ice.wav'),
            attack_plant:      new Audio('audio/sounds/attack_plant.wav'),
            attack_metal:      new Audio('audio/sounds/attack_metal.wav'),
            attack_black:      new Audio('audio/sounds/attack_black.wav'),
            attack_shooter:    new Audio('audio/sounds/attack_shooter.wav'),
            special_black:     new Audio('audio/sounds/special_black.wav'),
            special_fire:      new Audio('audio/sounds/special_fire.wav'),
            special_ice:       new Audio('audio/sounds/special_ice.wav'),
            special_metal:     new Audio('audio/sounds/special_metal.wav'),
            special_plant:     new Audio('audio/sounds/special_plant.wav'),
            special_water:     new Audio('audio/sounds/special_water.wav'),

            // Weather ambience (looped)
            weather_blizzard:     new Audio('audio/sounds/weather_blizzard.wav'),
            weather_heatwave:     new Audio('audio/sounds/weather_heatwave.wav'),
            weather_thunderstorm: new Audio('audio/sounds/weather_thunderstorm.wav'),
            weather_sandstorm:    new Audio('audio/sounds/weather_sandstorm.wav'),
            weather_acidic_fog:   new Audio('audio/sounds/weather_acidic_fog.wav'),
            weather_gale:         new Audio('audio/sounds/weather_gale.wav'),
            weather_thunder_crack: new Audio('audio/sounds/weather_thunder_crack.wav'),
            twin_event:            new Audio('audio/sounds/twin_event.wav'),
        };

        // DLC extension points
        this.musicHooks       = []; // { priority, check(), play(am) → trackKey }
        this.voicePaths       = {}; // heroId → (index) => path
        this.exclamationPaths = {}; // heroId → (situation) => path  (DLC registration)

        // Music config
        this.tracks.menu.loop = true;     this.tracks.menu.volume = 0.5;
        this.tracks.museum.loop = true;   this.tracks.museum.volume = 0.5;
        this.tracks.makuta.loop = true;   this.tracks.makuta.volume = 0.6;
        this.tracks.goblin.loop = true;   this.tracks.goblin.volume = 0.6;
        this.tracks.battle.loop = true;   this.tracks.battle.volume = 0.4;
        this.tracks.gameover.loop = true; this.tracks.gameover.volume = 0.6;
        this.tracks.victory.loop  = true; this.tracks.victory.volume  = 0.6;

        // SFX config
        this.tracks.level_up.volume = 0.5;
        this.tracks.pickup_card.volume    = 0.5;
        this.tracks.pickup_mask.volume    = 0.6;
        this.tracks.pickup_gold.volume    = 0.4;
        this.tracks.pickup_heal.volume    = 0.5;
        this.tracks.pickup_maxhp.volume   = 0.55;
        this.tracks.pickup_speed.volume   = 0.45;
        this.tracks.pickup_multi.volume   = 0.45;
        this.tracks.pickup_autoaim.volume = 0.45;
        this.tracks.wave_completed.volume = 0.6;
        this.tracks.achievement_unlocked.volume = 0.7;
        this.tracks.enemy_damage.volume = 0.25;
        this.tracks.dash.volume = 0.4;
        this.tracks.boss_shooter.volume = 0.4;
        this.tracks.challenge_success.volume = 0.6;
        this.tracks.challenge_fail.volume = 0.6;
        this.tracks.boss_rhino_charge.volume = 0.6;
        this.tracks.boss_stomp.volume = 0.6;
        this.tracks.boss_tank_ring.volume = 0.5;
        this.tracks.boss_tank_phase2.volume = 0.6;
        this.tracks.boss_summoner_spawn.volume = 0.45;
        this.tracks.boss_summoner_phase2.volume = 0.6;
        this.tracks.boss_summoner_shield_break.volume = 0.55;
        this.tracks.boss_makuta_teleport.volume = 0.5;
        this.tracks.boss_makuta_shadow_nova.volume = 0.6;
        this.tracks.boss_makuta_shadow_beam.volume = 0.45;
        this.tracks.damage.volume = 0.4;
        this.tracks.death.volume = 0.6;
        ['attack_fire','attack_water','attack_ice','attack_plant','attack_metal','attack_black','melee_all'].forEach(k => {
            this.tracks[k].volume = 0.25;
        });

        this.tracks.weather_blizzard.loop     = true;  this.tracks.weather_blizzard.volume     = 0.30;
        this.tracks.weather_heatwave.loop     = true;  this.tracks.weather_heatwave.volume     = 0.25;
        this.tracks.weather_thunderstorm.loop = true;  this.tracks.weather_thunderstorm.volume = 0.35;
        this.tracks.weather_sandstorm.loop    = true;  this.tracks.weather_sandstorm.volume    = 0.30;
        this.tracks.weather_acidic_fog.loop   = true;  this.tracks.weather_acidic_fog.volume   = 0.20;
        this.tracks.weather_gale.loop         = true;  this.tracks.weather_gale.volume         = 0.30;
        this.tracks.weather_thunder_crack.volume = 0.55;
        this.tracks.twin_event.volume = 0.7;

        this.musicEnabled = true;
        this.sfxEnabled   = true;

        this.updateSettings();

        // Loop Tracking
        this.activeLoops = {};
    }

    // ── DLC Registration API ──────────────────────────────────────────────────

    /**
     * Register DLC audio tracks.
     * @param {Object} manifest  key → { path, loop?, volume? }
     */
    registerSounds(manifest) {
        for (const [key, cfg] of Object.entries(manifest)) {
            const audio = new Audio(cfg.path);
            if (cfg.loop)   audio.loop   = true;
            if (cfg.volume !== undefined) audio.volume = cfg.volume;
            this.tracks[key] = audio;
        }
    }

    /**
     * Register a music-selection hook for update().
     * Hooks are evaluated in descending priority order; the first matching hook wins.
     * @param {{ priority: number, check: () => boolean, play: (am: AudioManager) => string }} hook
     */
    registerMusicHook(hook) {
        this.musicHooks.push(hook);
        this.musicHooks.sort((a, b) => b.priority - a.priority);
    }

    /**
     * Register a voice-memory path resolver for a hero.
     * @param {string}   heroId   e.g. 'earth'
     * @param {(index: number) => string} fn  Returns the file path for memory index (1-based).
     */
    registerVoicePath(heroId, fn) {
        this.voicePaths[heroId] = fn;
    }

    /**
     * Register an exclamation path resolver for a DLC hero.
     * @param {string}   heroId   e.g. 'air'
     * @param {(situation: string) => string} fn  Returns the file path for a situation key.
     */
    registerExclamationPath(heroId, fn) {
        this.exclamationPaths[heroId] = fn;
    }

    // ── Playback helpers ──────────────────────────────────────────────────────

    startLoop(key) {
        if (!this.sfxEnabled) return;
        if (this.activeLoops[key]) return;
        const sound = this.tracks[key];
        if (sound) {
            const loopNode = sound.cloneNode();
            loopNode.loop = true;
            loopNode.volume = sound.volume;
            loopNode.play().catch(e => console.warn(`Audio loop fail: ${key}`, e));
            this.activeLoops[key] = loopNode;
        }
    }

    stopLoop(key) {
        if (this.activeLoops[key]) {
            this.activeLoops[key].pause();
            this.activeLoops[key].currentTime = 0;
            delete this.activeLoops[key];
        }
    }

    playAttack(hero, isCharged = false) {
        if (!this.sfxEnabled) return;
        let key = `attack_${hero}`;
        if (hero === 'lightning' && isCharged) key = 'attack_lightning_charged';
        const sound = this.tracks[key];
        if (sound) {
            const sfx = sound.cloneNode();
            sfx.volume = 0.3;
            sfx.play().catch(() => {});
        }
    }

    /**
     * Play a sound, but only if fewer than `max` instances are currently active.
     * Falls back to `fallbackKey` (also capped) when the primary track is missing.
     * Prevents sound overload from area-of-effect abilities hitting many targets at once.
     */
    playCapped(key, max, fallbackKey) {
        if (!this.sfxEnabled) return;
        const track = this.tracks[key] || (fallbackKey && this.tracks[fallbackKey]);
        if (!track) return;
        if (!this._cappedActive) this._cappedActive = {};
        const activeKey = this.tracks[key] ? key : fallbackKey;
        const count = this._cappedActive[activeKey] || 0;
        if (count >= max) return;
        this._cappedActive[activeKey] = count + 1;
        const sfx = track.cloneNode();
        sfx.volume = track.volume;
        sfx.play().catch(() => {});
        sfx.onended = () => { this._cappedActive[activeKey] = Math.max(0, (this._cappedActive[activeKey] || 1) - 1); };
    }

    hasVoice(_hero, index) {
        return index >= 0 && index < 50;
    }

    playVoice(hero, index) {
        if (!this.sfxEnabled) return;
        if (this.voice) { this.voice.pause(); this.voice = null; }

        const id = index + 1;
        let path;

        if (this.voicePaths[hero]) {
            path = this.voicePaths[hero](id);
        } else {
            path = `audio/memories/${hero}_${id}.mp3`;
        }

        this.voice = new Audio(path);
        this.voice.volume = 0.8;
        this.voice.play().catch(e => console.warn(`Audio memory not found: ${path}`, e));
        if (this.tracks.museum) this.tracks.museum.volume = 0.2;
        this.voice.onended = () => {
            if (this.tracks.museum) this.tracks.museum.volume = 0.5;
        };
    }

    // Plays a situational hero exclamation (injured/failure_1/twin_event/etc.)
    // For paired situations (e.g. failure_1 / failure_2) pass the base key and
    // the method picks a random variant automatically.
    playHeroExclamation(hero, situation) {
        if (!this.sfxEnabled) return;
        if (this._exclamationPlaying) return; // don't stack on top of each other

        // Randomly pick _1 or _2 variant when both exist
        const _pick = () => Math.random() < 0.5 ? `${situation}_1` : `${situation}_2`;
        const key = ['failure', 'boss_moment', 'boss_win', 'found', 'level_up'].includes(situation)
            ? _pick()
            : situation;

        let path;
        if (this.exclamationPaths[hero]) {
            path = this.exclamationPaths[hero](key);
        } else {
            path = `audio/voices/${hero}/${key}.mp3`;
        }

        const audio = new Audio(path);
        audio.volume = 0.85;
        this._exclamationPlaying = true;
        audio.play().catch(() => {}); // silently skip missing files
        audio.onended = () => { this._exclamationPlaying = false; };
        // Safety reset in case the file never loads
        setTimeout(() => { this._exclamationPlaying = false; }, 6000);

        // Show subtitle if enabled
        if (window.gameConfig && window.gameConfig.subtitlesEnabled) {
            const texts = AudioManager._exclamationTexts[hero];
            const text = texts && texts[key];
            if (text) this._showSubtitle(hero, text);
        }
    }

    // Register subtitle texts for a hero (called by DLC index files)
    registerExclamationTexts(hero, texts) {
        if (!AudioManager._exclamationTexts[hero]) AudioManager._exclamationTexts[hero] = {};
        Object.assign(AudioManager._exclamationTexts[hero], texts);
    }

    _showSubtitle(hero, text) {
        const el = document.getElementById('hero-subtitle');
        if (!el) return;
        const heroName = hero.charAt(0).toUpperCase() + hero.slice(1);
        el.querySelector('.hero-sub-name').textContent = heroName;
        el.querySelector('.hero-sub-text').textContent = `"${text}"`;
        el.classList.remove('hero-sub-hidden');
        el.classList.add('hero-sub-visible');
        clearTimeout(this._subtitleTimer);
        // Auto-hide: ~5s base + a bit extra for longer lines
        const duration = Math.min(8000, 4500 + text.length * 38);
        this._subtitleTimer = setTimeout(() => {
            el.classList.add('hero-sub-hidden');
            el.classList.remove('hero-sub-visible');
        }, duration);
    }

    toggleMute() {
        this.musicEnabled = !this.musicEnabled;
        if (!this.musicEnabled) this.stopAllMusic();
        return !this.musicEnabled;
    }

    updateSettings() {
        if (typeof gameConfig !== 'undefined') {
            if (this.musicEnabled !== gameConfig.musicEnabled) {
                this.musicEnabled = gameConfig.musicEnabled;
                if (!this.musicEnabled) this.stopAllMusic();
            }
            this.sfxEnabled = gameConfig.sfxEnabled;
            // Stop any looping SFX tracks that are playing when SFX is disabled
            if (!this.sfxEnabled) {
                for (const key in this.tracks) {
                    const t = this.tracks[key];
                    if (t && t.loop && !this.isMusic(key) && !t.paused) t.pause();
                }
            }
        }
    }

    isMusic(trackName) {
        const track = this.tracks[trackName];
        if (!track) return false;
        return track.src.includes('/audio/music/');
    }

    play(trackName) {
        const isMusic = this.isMusic(trackName);
        if (isMusic) {
            if (!this.musicEnabled) return;
            const track = this.tracks[trackName];
            if (track && track.paused) track.play().catch(() => {});
        } else {
            if (!this.sfxEnabled) return;
            const track = this.tracks[trackName];
            if (track) {
                const sfx = track.cloneNode();
                sfx.volume = track.volume;
                sfx.play().catch(() => {});
            }
        }
    }

    stop(trackName) {
        const track = this.tracks[trackName];
        if (track && !track.paused) {
            track.pause();
            track.currentTime = 0;
        }
    }

    stopAllMusic() {
        for (const key in this.tracks) {
            if (this.isMusic(key)) this.stop(key);
        }
    }

    stopAllExcept(trackName) {
        for (const key in this.tracks) {
            if (key !== trackName) this.stop(key);
        }
    }

    // Returns true when the current run is a story run (not daily/weekly challenge).
    isStoryMode() {
        return typeof isDailyMode !== 'undefined' && !isDailyMode &&
               typeof isWeeklyMode !== 'undefined' && !isWeeklyMode &&
               typeof saveData !== 'undefined' && saveData.story && saveData.story.enabled;
    }

    update() {
        if (typeof uiState === 'undefined') return;
        if (uiState === 'PAUSE' || uiState === 'LEVELUP') return;

        // Maze of Time overlay — hold maze_theme regardless of uiState
        if (window.mazeIsOpen) {
            this.stopAllExcept('maze_theme');
            this.play('maze_theme');
            return;
        }

        const menuStates = ['MENU','OPTIONS','PERMSHOP','ACHIEVEMENTS','COLLECTION','HIGHSCORE','STORY','ALTAR','CHAOSSHOP','TUTORIAL','STATS','COMPLETION','SKILLTREE'];

        if (uiState === 'VICTORY') {
            this.stopAllExcept('victory'); this.play('victory');
        } else if (uiState === 'GAMEOVER') {
            this.stopAllExcept('gameover'); this.play('gameover');
        } else if (uiState === 'MUSEUM') {
            this.stopAllExcept('museum'); this.play('museum');
        } else if (menuStates.includes(uiState)) {
            this.stopAllExcept('menu'); this.play('menu');
        } else {
            // Evil Mode: player IS the villain — play their theme regardless of menuStates logic
            const isEvilGoblin = typeof isEvilMode !== 'undefined' && isEvilMode &&
                typeof player !== 'undefined' && player && player.type === 'green_goblin';
            const isEvilMakuta = typeof isEvilMode !== 'undefined' && isEvilMode &&
                typeof player !== 'undefined' && player && player.type === 'makuta';

            // Base game bosses
            const isMakutaActive = typeof bossActive !== 'undefined' && bossActive &&
                typeof enemies !== 'undefined' && enemies.some(e => e instanceof Boss && e.type === 'MAKUTA');
            const isGoblinActive = typeof bossActive !== 'undefined' && bossActive &&
                typeof enemies !== 'undefined' && enemies.some(e => e instanceof Boss && e.type === 'GREEN_GOBLIN');

            if (isMakutaActive || isEvilMakuta) {
                this.stopAllExcept('makuta'); this.play('makuta');
            } else if (isGoblinActive || isEvilGoblin) {
                this.stopAllExcept('goblin'); this.play('goblin');
            } else {
                // Try DLC hooks in priority order
                for (const hook of this.musicHooks) {
                    if (hook.check()) {
                        const key = hook.play(this);
                        this.stopAllExcept(key);
                        this.play(key);
                        return;
                    }
                }
                // Default battle music
                this.stopAllExcept('battle');
                this.play('battle');
            }
        }
    }
}

// All exclamation subtitle texts, keyed by hero → situation key.
// DLC heroes can extend this via audioManager.registerExclamationTexts(hero, texts).
AudioManager._exclamationTexts = {
    fire: {
        injured:       "Not yet! I won't burn out like this!",
        failure_1:     "No... the fire dies here.",
        failure_2:     "Everything burns. Even me.",
        twin_event:    "Two of you? Then I'll burn you both!",
        boss_moment_1: "This is what I've been burning toward.",
        boss_moment_2: "You have no idea what real fire is.",
        boss_win_1:    "Ash. That's all you are now.",
        boss_win_2:    "The flame never dies!",
        found_1:       "What is this... it feels powerful.",
        found_2:       "Interesting. This changes things.",
        ultimate:      "INFERNO! Everything burns!",
        level_up_1:    "The fire grows stronger!",
        level_up_2:    "Burning brighter!",
    },
    water: {
        injured:       "Losing my flow... stay calm.",
        failure_1:     "Even rivers find their end.",
        failure_2:     "I return to the source.",
        twin_event:    "Two waves. I'll adapt.",
        boss_moment_1: "You are the stone. I am the water. I always win.",
        boss_moment_2: "Stay calm. Read the current.",
        boss_win_1:    "Water always finds a way.",
        boss_win_2:    "The tide has turned.",
        found_1:       "Something calls to me from this.",
        found_2:       "There's depth to this I haven't understood yet.",
        ultimate:      "Tidal Wave... the ocean rises!",
        level_up_1:    "Deeper currents awakening.",
        level_up_2:    "The flow strengthens.",
    },
    ice: {
        injured:       "Damage critical. Recalculating.",
        failure_1:     "Everything freezes. Eventually.",
        failure_2:     "...Cold. Final.",
        twin_event:    "Two targets. Efficiency unchanged.",
        boss_moment_1: "You cannot outlast absolute zero.",
        boss_moment_2: "I have calculated every possible outcome.",
        boss_win_1:    "Precisely as calculated.",
        boss_win_2:    "Everything falls to cold in the end.",
        found_1:       "Curious. The composition is unlike anything I have analyzed.",
        found_2:       "Fascinating properties. I'll study this later.",
        ultimate:      "Deep Freeze initiated. Nothing moves.",
        level_up_1:    "Efficiency increasing. Good.",
        level_up_2:    "Parameters upgraded. Continuing.",
    },
    plant: {
        injured:       "The roots are holding. Just barely.",
        failure_1:     "I return to the soil.",
        failure_2:     "Every ending is a new beginning.",
        twin_event:    "The forest has faced worse storms than two.",
        boss_moment_1: "Even the mightiest tree faces its storm.",
        boss_moment_2: "I have roots older than your anger.",
        boss_win_1:    "Life always finds a way.",
        boss_win_2:    "The canopy holds.",
        found_1:       "This resonates with something ancient.",
        found_2:       "I can feel it growing in my hands.",
        ultimate:      "OVERGROWTH! The forest reclaims everything.",
        level_up_1:    "New growth. The forest expands.",
        level_up_2:    "Stronger roots. Taller branches.",
    },
    metal: {
        injured:       "Hull compromised. Continuing.",
        failure_1:     "Systems offline.",
        failure_2:     "Every machine breaks down.",
        twin_event:    "Double threat. Noted.",
        boss_moment_1: "Stronger alloys have failed before you.",
        boss_moment_2: "I don't feel fear. That's not a boast. It's a fact.",
        boss_win_1:    "Scrapped.",
        boss_win_2:    "Dismantled.",
        found_1:       "Unusual material. Logging it.",
        found_2:       "This has value I can use.",
        ultimate:      "Iron Will engaged. Nothing gets through.",
        level_up_1:    "Structural integrity reinforced.",
        level_up_2:    "System upgrade complete.",
    },
    black: {
        injured:       "Heh... pain is just another shadow.",
        failure_1:     "The darkness... recedes.",
        failure_2:     "Even shadows fade in the end.",
        twin_event:    "Two targets. The dark will swallow you both.",
        boss_moment_1: "You think you know fear? I am fear.",
        boss_moment_2: "Let's see what hides behind your strength.",
        boss_win_1:    "Consumed by the dark.",
        boss_win_2:    "Nothing survives the void I carry.",
        found_1:       "...This thing is familiar. Wrong, but familiar.",
        found_2:       "Something dark called out to me.",
        ultimate:      "THE SHADOW. Try to hit what you can't see.",
        level_up_1:    "The shadows deepen.",
        level_up_2:    "Darker. Better.",
    },
    air: {
        injured:       "I'm scattered — pull together!",
        failure_1:     "Drifting away... where the wind goes...",
        failure_2:     "I just needed a little more sky.",
        twin_event:    "Two? Ha! The wind doesn't pick favorites!",
        boss_moment_1: "You look heavy. That's going to be a problem for you.",
        boss_moment_2: "Let's see if you can catch the breeze.",
        boss_win_1:    "Gone like a breath!",
        boss_win_2:    "Ha! Try catching the wind!",
        found_1:       "Oh, this thing is singing to me.",
        found_2:       "Something special just drifted into my hands.",
        ultimate:      "TWISTER! Ha! Hold on to something!",
        level_up_1:    "Faster! Higher!",
        level_up_2:    "Ha! Nothing can catch me now!",
    },
    void: {
        injured:       "The void begins to claim me...",
        failure_1:     "I return to nothing. As everything does.",
        failure_2:     "Silence... at last.",
        twin_event:    "Two echoes in the dark. How unfortunate... for them.",
        boss_moment_1: "You are a flicker. I am the nothing that swallows all light.",
        boss_moment_2: "The void has patience. You do not.",
        boss_win_1:    "Consumed.",
        boss_win_2:    "You were always nothing. Now you know it.",
        found_1:       "It pulses with something I recognize.",
        found_2:       "...This thing has seen darkness.",
        ultimate:      "Void Eruption. Everything ends.",
        level_up_1:    "The emptiness grows.",
        level_up_2:    "More power. More nothing.",
    },
    spirit: {
        injured:       "My peace is breaking. I must hold on.",
        failure_1:     "I release... without regret.",
        failure_2:     "Balance is restored. Even in this.",
        twin_event:    "Two sides of the same chaos. I remain the center.",
        boss_moment_1: "You carry great weight. I can see it. That won't help you here.",
        boss_moment_2: "Inner peace cannot be shattered by outer force.",
        boss_win_1:    "Balance is restored.",
        boss_win_2:    "Harmony prevails.",
        found_1:       "This... I wasn't meant to find this yet.",
        found_2:       "A gift from the universe. I accept it with gratitude.",
        ultimate:      "I am the stillness at the center of the storm.",
        level_up_1:    "Balance deepens within me.",
        level_up_2:    "The spirit grows.",
    },
    chance: {
        injured:       "Bad roll! Come on luck, don't leave me now!",
        failure_1:     "House always wins. Today, anyway.",
        failure_2:     "Finally ran out of luck.",
        twin_event:    "Two for one? Ha! I love those odds!",
        boss_moment_1: "Let's raise the stakes, shall we?",
        boss_moment_2: "I've bet everything on worse hands than this.",
        boss_win_1:    "Read 'em and weep!",
        boss_win_2:    "Ha! Never bet against the lucky one!",
        found_1:       "Jackpot! Look at this beauty!",
        found_2:       "Someone up there likes me.",
        ultimate:      "Wild Card! Anything goes now!",
        level_up_1:    "Luck is on my side today!",
        level_up_2:    "The odds just got better!",
    },
    sound: {
        injured:       "The melody is breaking apart!",
        failure_1:     "Every song finds its final note.",
        failure_2:     "The silence takes me.",
        twin_event:    "A duet? Let's see if you can keep up!",
        boss_moment_1: "The crescendo was always going to end here.",
        boss_moment_2: "I will compose something worthy of this moment.",
        boss_win_1:    "And... finale!",
        boss_win_2:    "The symphony is complete!",
        found_1:       "This vibrates at a frequency I've never heard.",
        found_2:       "It harmonizes perfectly.",
        ultimate:      "RESONANCE! Feel the full force of the symphony!",
        level_up_1:    "A new movement begins.",
        level_up_2:    "The composition evolves!",
    },
    poison: {
        injured:       "You think that hurt me? Amusing.",
        failure_1:     "Every poison has a cure. Mine just found it.",
        failure_2:     "I have been the end of many. Now...",
        twin_event:    "Two more carriers. The contagion spreads further.",
        boss_moment_1: "I've been seeping through your defenses since you first saw me.",
        boss_moment_2: "You don't beat poison. You survive it. Temporarily.",
        boss_win_1:    "Infected. Neutralized.",
        boss_win_2:    "No antidote for this.",
        found_1:       "This is deliciously corrupted.",
        found_2:       "Whatever this is, it has potential for harm. Wonderful.",
        ultimate:      "PLAGUE FORM. Everything I touch decays.",
        level_up_1:    "The toxin strengthens.",
        level_up_2:    "A more potent strain.",
    },
    gravity: {
        injured:       "The pull is too strong. Fight it.",
        failure_1:     "All things collapse inward. In time.",
        failure_2:     "I return to the center.",
        twin_event:    "Two bodies. The gravitational pull intensifies.",
        boss_moment_1: "Nothing escapes what I carry.",
        boss_moment_2: "You stand at the edge of an event horizon.",
        boss_win_1:    "Crushed under the weight of inevitability.",
        boss_win_2:    "Pulled in. As all things are.",
        found_1:       "This object bends the space around it.",
        found_2:       "I feel its mass before I even touch it.",
        ultimate:      "SINGULARITY. Nothing escapes this.",
        level_up_1:    "The pull intensifies.",
        level_up_2:    "Greater mass. Greater force.",
    },
    earth: {
        injured:       "I'm crumbling... but I don't fall!",
        failure_1:     "The mountain... has fallen.",
        failure_2:     "I sink back into the earth.",
        twin_event:    "Two? The ground shakes for both of you!",
        boss_moment_1: "I have stood longer than you have existed.",
        boss_moment_2: "You will break against me like every wave before you.",
        boss_win_1:    "The mountain endures.",
        boss_win_2:    "Buried.",
        found_1:       "Something ancient is in this.",
        found_2:       "The earth yielded this to me for a reason.",
        ultimate:      "OBSIDIAN FORM. Unbreakable.",
        level_up_1:    "Bedrock. Immovable.",
        level_up_2:    "The stone grows harder.",
    },
    lightning: {
        injured:       "Aaah — short circuit! Keep going!",
        failure_1:     "The charge... dies here.",
        failure_2:     "Every bolt finds ground eventually.",
        twin_event:    "Two of you? I'll hit both at once!",
        boss_moment_1: "You're about to learn what a direct strike feels like.",
        boss_moment_2: "Speed beats power. Always.",
        boss_win_1:    "Strike!",
        boss_win_2:    "Overloaded!",
        found_1:       "This crackles with something wild.",
        found_2:       "Electric. I like it.",
        ultimate:      "STORM SURGE! The sky opens!",
        level_up_1:    "Voltage rising!",
        level_up_2:    "Charged up!",
    },
    time: {
        injured:       "The timeline is fracturing... hold together.",
        failure_1:     "Even I cannot outrun every ending.",
        failure_2:     "This was always one of the outcomes.",
        twin_event:    "Two of you... I've seen this before. It didn't end well.",
        boss_moment_1: "I have watched this moment approaching for a long time.",
        boss_moment_2: "Every path through time led here.",
        boss_win_1:    "This timeline survives.",
        boss_win_2:    "Rewritten.",
        found_1:       "This doesn't belong in this moment.",
        found_2:       "A fragment from another timeline.",
        ultimate:      "TIME STOPS. Only I remain.",
        level_up_1:    "Another moment mastered.",
        level_up_2:    "Time bends further to my will.",
    },
    love: {
        injured:       "It hurts... but I won't let go.",
        failure_1:     "I loved every moment of this.",
        failure_2:     "Even this is an act of love.",
        twin_event:    "Two of you... my heart is big enough.",
        boss_moment_1: "I'm not fighting out of hate. That's why I'll win.",
        boss_moment_2: "Love is the strongest force in any world.",
        boss_win_1:    "Love wins.",
        boss_win_2:    "Open your heart.",
        found_1:       "Oh! This feels like it was waiting for me.",
        found_2:       "Something wonderful just found its way to me.",
        ultimate:      "HEART OF UNITY. We face this together.",
        level_up_1:    "My heart grows stronger!",
        level_up_2:    "More love, more power.",
    },
    green_goblin: {
        injured:       "Hahaha! You actually HIT me?! Impressive... and infuriating!",
        failure_1:     "This isn't over! The Green Goblin ALWAYS comes back!",
        failure_2:     "Impossible! I am the Green Goblin! I DON'T lose!",
        boss_moment_1: "You little heroes think you can stop me?! How delightfully foolish!",
        boss_moment_2: "Ah, fresh heroes crawling out to face me. PERFECT! Hahaha!",
        boss_win_1:    "Yes! Grovel before the Green Goblin! HAHAHAHA!",
        boss_win_2:    "Another pathetic hero, CRUSHED! Is that all you've got?!",
    },
    makuta: {
        injured:       "You cannot harm what is eternal...",
        failure_1:     "I will... return. The darkness never truly dies.",
        failure_2:     "This is not the end. Nothing ever truly ends.",
        boss_moment_1: "Foolish hero. You cannot stop what has already begun.",
        boss_moment_2: "Step forward. And meet your end.",
        boss_win_1:    "As it was always written. You fall before me.",
        boss_win_2:    "The mask is mine. As it was always destined.",
    },
};

const audioManager = new AudioManager();
