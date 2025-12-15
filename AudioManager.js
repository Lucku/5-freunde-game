class AudioManager {
    constructor() {
        this.tracks = {
            menu: new Audio('music/main_menu.wav'),
            museum: new Audio('music/museum.wav'),
            makuta: new Audio('music/boss_makuta.wav'),
            goblin: new Audio('music/boss_green_goblin.wav'),
            battle: new Audio('music/battle.wav'),
            gameover: new Audio('music/game_over.wav')
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

        this.isMuted = false;
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

            if (isMakutaActive) {
                this.stopAllExcept('makuta');
                this.play('makuta');
            } else if (isGoblinActive) {
                this.stopAllExcept('goblin');
                this.play('goblin');
            } else {
                this.stopAllExcept('battle');
                this.play('battle');
            }
        }
    }
}

const audioManager = new AudioManager();
