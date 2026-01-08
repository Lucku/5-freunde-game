class AudioManager {
    constructor() {
        this.tracks = {
            menu: new Audio('music/main_menu.wav'),
            museum: new Audio('music/museum.wav'),
            makuta: new Audio('music/boss_makuta.wav'),
            goblin: new Audio('music/boss_green_goblin.wav'),
            battle: new Audio('music/battle.wav'),
            gameover: new Audio('music/game_over.wav'),

            // DLC Battle variants (may be overwritten/added by DLC on load)
            battle_rock_1: new Audio('dlc/rise_of_the_rock/music/battle.wav'),
            battle_rock_2: new Audio('dlc/rise_of_the_rock/music/battle_2.wav'),
            golem: new Audio('dlc/rise_of_the_rock/music/boss_dark_golem.wav'),
        };

        // Configuration
        this.tracks.menu.loop = true;
        this.tracks.menu.volume = 0.5;

        this.tracks.museum.loop = true;
        this.tracks.museum.volume = 0.5;

        this.tracks.makuta.loop = true;
        this.tracks.makuta.volume = 0.6;

        this.tracks.goblin.loop = true;
        this.tracks.goblin.volume = 0.6;

        this.tracks.battle.loop = true;
        this.tracks.battle.volume = 0.4;

        this.tracks.gameover.loop = true;
        this.tracks.gameover.volume = 0.6;

        this.tracks.battle_rock_1.loop = true;
        this.tracks.battle_rock_1.volume = 0.4;

        this.tracks.battle_rock_2.loop = true;
        this.tracks.battle_rock_2.volume = 0.4;

        this.tracks.golem.loop = true;
        this.tracks.golem.volume = 0.6;

        this.isMuted = false;
    }

    hasVoice(hero, index) {
        if (index < 0 || index >= 50) return false;
        // In a real implementation, we would check if the file exists.
        // For now, we assume if the index is valid, the file *might* exist.
        return true;
    }

    playVoice(hero, index) {
        if (this.isMuted) return;

        if (this.voice) {
            this.voice.pause();
            this.voice = null;
        }

        const id = index + 1;
        let path = "";

        // DLC: Rise of the Rock (Earth Hero)
        if (hero === 'earth') {
            path = `dlc/rise_of_the_rock/music/memories/${hero}_${id}.mp3`;
        } else {
            // Standard Heroes (and potentially others if added strictly to base)
            path = `music/memories/${hero}_${id}.mp3`;
        }

        this.voice = new Audio(path);
        this.voice.volume = 0.8;
        this.voice.play().catch(e => {
            console.warn(`Audio memory file not found or failed to play: ${path}`, e);
        });
        if (this.tracks.museum) this.tracks.museum.volume = 0.2;

        this.voice.onended = () => {
            if (this.tracks.museum) this.tracks.museum.volume = 0.5;
        };
    }

    toggleMute() {
        this.isMuted = !this.isMuted;
        if (this.isMuted) {
            this.stopAllExcept(null);
        } else {
            // Will resume on next update
        }
        return this.isMuted;
    }

    play(trackName) {
        if (this.isMuted) return;
        const track = this.tracks[trackName];
        if (track && track.paused) {
            track.play().catch(e => { /* Ignore autoplay errors */ });
        }
    }

    stop(trackName) {
        const track = this.tracks[trackName];
        if (track && !track.paused) {
            track.pause();
            track.currentTime = 0;
        }
    }

    stopAllExcept(trackName) {
        for (const key in this.tracks) {
            if (key !== trackName) {
                this.stop(key);
            }
        }
    }

    update() {
        // Ensure global variables are available
        if (typeof uiState === 'undefined') return;

        const menuStates = ['MENU', 'PERMSHOP', 'ACHIEVEMENTS', 'COLLECTION', 'HIGHSCORE', 'STORY', 'ALTAR', 'CHAOSSHOP', 'TUTORIAL', 'STATS', 'COMPLETION'];

        if (uiState === 'GAMEOVER') {
            this.stopAllExcept('gameover');
            this.play('gameover');
        } else if (uiState === 'MUSEUM') {
            this.stopAllExcept('museum');
            this.play('museum');
        } else if (menuStates.includes(uiState)) {
            this.stopAllExcept('menu');
            this.play('menu');
        } else {
            // Game Mode
            // Check for Bosses
            const isMakutaActive = typeof bossActive !== 'undefined' && bossActive &&
                typeof enemies !== 'undefined' &&
                enemies.some(e => e instanceof Boss && e.type === 'MAKUTA');

            const isGoblinActive = typeof bossActive !== 'undefined' && bossActive &&
                typeof enemies !== 'undefined' &&
                enemies.some(e => e instanceof Boss && e.type === 'GREEN_GOBLIN');

            const isGolemActive = typeof bossActive !== 'undefined' && bossActive &&
                typeof enemies !== 'undefined' &&
                enemies.some(e => e instanceof Boss && e.type === 'DARK_GOLEM');

            if (isMakutaActive) {
                this.stopAllExcept('makuta');
                this.play('makuta');
            } else if (isGoblinActive) {
                this.stopAllExcept('goblin');
                this.play('goblin');
            } else if (isGolemActive) {
                this.stopAllExcept('golem');
                this.play('golem');
            } else {
                // If the Earth hero is active in the run, prefer DLC rock battle variants (randomized)
                // Story Mode only (Not Daily/Weekly)
                const isEarthActive = typeof player !== 'undefined' && player && player.type === 'earth';
                const isStoryMode = typeof isDailyMode !== 'undefined' && !isDailyMode &&
                                    typeof isWeeklyMode !== 'undefined' && !isWeeklyMode &&
                                    typeof saveData !== 'undefined' && saveData.story && saveData.story.enabled;

                if (isEarthActive && isStoryMode && this.tracks['battle_rock_1'] && this.tracks['battle_rock_2']) {
                    const t1 = this.tracks['battle_rock_1'];
                    const t2 = this.tracks['battle_rock_2'];

                    if (!t1.paused) {
                        this.stopAllExcept('battle_rock_1');
                    } else if (!t2.paused) {
                        this.stopAllExcept('battle_rock_2');
                    } else {
                        // None playing, pick random
                        const pick = Math.random() < 0.5 ? 'battle_rock_1' : 'battle_rock_2';
                        this.stopAllExcept(pick);
                        this.play(pick);
                    }
                } else {
                    this.stopAllExcept('battle');
                    this.play('battle');
                }
            }
        }
    }
}

const audioManager = new AudioManager();
