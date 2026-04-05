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
            weather_thunder_crack: new Audio('audio/sounds/weather_thunder_crack.wav'),
            twin_event:            new Audio('audio/sounds/twin_event.wav'),
        };

        // DLC extension points
        this.musicHooks  = []; // { priority, check(), play(am) → trackKey }
        this.voicePaths  = {}; // heroId → (index) => path

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
        this.tracks.pickup_card.volume = 0.5;
        this.tracks.pickup_mask.volume = 0.6;
        this.tracks.pickup_gold.volume = 0.4;
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
            // Base game bosses
            const isMakutaActive = typeof bossActive !== 'undefined' && bossActive &&
                typeof enemies !== 'undefined' && enemies.some(e => e instanceof Boss && e.type === 'MAKUTA');
            const isGoblinActive = typeof bossActive !== 'undefined' && bossActive &&
                typeof enemies !== 'undefined' && enemies.some(e => e instanceof Boss && e.type === 'GREEN_GOBLIN');

            if (isMakutaActive) {
                this.stopAllExcept('makuta'); this.play('makuta');
            } else if (isGoblinActive) {
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

const audioManager = new AudioManager();
