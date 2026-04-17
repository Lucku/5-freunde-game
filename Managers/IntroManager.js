// A "real" game controller has at least 10 buttons and 2 axes.
// USB receivers / non-controller HID devices that the Gamepad API accidentally
// picks up typically enumerate with 0 buttons and 0 axes.
window.isRealGamepad = (gp) => gp && gp.connected && gp.buttons.length >= 10 && gp.axes.length >= 2;

class IntroManager {
    /**
     * Play the full intro sequence (dev logo → story intro → press-start), then call onComplete.
     * Skipped when gameConfig.showIntroScreens is false.
     *
     * The intro-backdrop div (display:block in HTML, z-index 9995) covers the canvas
     * from the very first paint and is removed by initMenu() once the menu is ready.
     * IntroManager does not need to touch it.
     */
    play(onComplete) {
        if (!window.gameConfig || !window.gameConfig.showIntroScreens) {
            onComplete();
            return;
        }

        // Pre-position dev-logo as an invisible cover (sync, before any rAF) so
        // there is no gap between the loading screen disappearing and it appearing.
        const devScreen = document.getElementById('dev-logo-screen');
        if (devScreen) {
            devScreen.style.transition = 'none';
            devScreen.style.opacity = '0';
            devScreen.style.display = 'flex';
        }

        this._showDevLogo(() => this._showStoryIntro(() => this._showPressStart(onComplete)));
    }

    _showDevLogo(onComplete) {
        const screen = document.getElementById('dev-logo-screen');
        if (!screen) { onComplete(); return; }

        requestAnimationFrame(() => requestAnimationFrame(() => {
            screen.style.transition = 'opacity 1.2s ease';
            screen.style.opacity = '1';

            setTimeout(() => {
                // Pre-position story-intro (opacity:0) BEFORE fading dev logo out
                // so there is no dark gap between screens.
                const siScreen = document.getElementById('story-intro-screen');
                if (siScreen) {
                    siScreen.style.transition = 'none';
                    siScreen.style.opacity = '0';
                    siScreen.style.display = 'flex';
                }

                screen.style.transition = 'opacity 1s ease';
                screen.style.opacity = '0';
                setTimeout(() => {
                    screen.style.display = 'none';
                    onComplete();
                }, 1000);
            }, 2800);
        }));
    }

    _showStoryIntro(onComplete) {
        const screen = document.getElementById('story-intro-screen');
        if (!screen) { onComplete(); return; }

        // Pre-show as invisible so the fade-in CSS animation fires correctly
        screen.style.transition = 'none';
        screen.style.opacity = '0';
        screen.style.display = 'flex';

        // Reset the content animation so it replays each time
        const content = screen.querySelector('.si-content');
        if (content) {
            content.style.animation = 'none';
            void content.offsetWidth; // reflow to restart animation
            content.style.animation = '';
        }

        let advanced = false;
        const advance = () => {
            if (advanced) return;
            advanced = true;
            cleanup();
            if (this._introAudio) { this._introAudio.pause(); this._introAudio = null; }
            screen.style.transition = 'opacity 1s ease';
            screen.style.opacity = '0';
            setTimeout(() => {
                screen.style.display = 'none';
                onComplete();
            }, 1000);
        };

        requestAnimationFrame(() => requestAnimationFrame(() => {
            screen.style.transition = 'opacity 1.4s ease';
            screen.style.opacity = '1';
        }));

        // Play narration
        const audio = new Audio('audio/intro/story_intro.mp3');
        audio.volume = 0.88;
        this._introAudio = audio;
        audio.play().catch(() => {});
        // Auto-advance 1.5s after narration ends, or after 55s fallback
        const fallbackTimer = setTimeout(advance, 55000);
        audio.onended = () => { clearTimeout(fallbackTimer); setTimeout(advance, 1500); };

        // Pre-position press-start hidden so it's ready when we advance
        const psScreen = document.getElementById('press-start-screen');
        if (psScreen) {
            psScreen.style.transition = 'none';
            psScreen.style.opacity = '0';
            psScreen.style.display = 'flex';
        }

        const onKey = () => advance();
        window.addEventListener('keydown', onKey, { once: true });
        screen.addEventListener('click', advance, { once: true });

        const gpInterval = setInterval(() => {
            for (const gp of navigator.getGamepads()) {
                if (window.isRealGamepad(gp) && gp.buttons[0]?.pressed) { advance(); return; }
            }
        }, 50);

        const cleanup = () => {
            clearTimeout(fallbackTimer);
            window.removeEventListener('keydown', onKey);
            clearInterval(gpInterval);
        };
    }

    _showPressStart(onComplete) {
        const screen = document.getElementById('press-start-screen');
        if (!screen) { onComplete(); return; }

        this._updatePromptText();

        const _onGPConnect    = () => this._updatePromptText();
        const _onGPDisconnect = () => this._updatePromptText();
        window.addEventListener('gamepadconnected',    _onGPConnect);
        window.addEventListener('gamepaddisconnected', _onGPDisconnect);

        requestAnimationFrame(() => requestAnimationFrame(() => {
            screen.style.transition = 'opacity 0.8s ease';
            screen.style.opacity = '1';
        }));

        let advanced = false;
        const advance = () => {
            if (advanced) return;
            advanced = true;
            cleanup();
            screen.style.transition = 'opacity 0.5s ease';
            screen.style.opacity = '0';
            setTimeout(() => {
                screen.style.display = 'none';
                onComplete();
            }, 500);
        };

        const onKey = (e) => {
            if (e.code === 'Enter' || e.code === 'Space') advance();
        };
        window.addEventListener('keydown', onKey);
        screen.addEventListener('click', advance, { once: true });

        const gpInterval = setInterval(() => {
            for (const gp of navigator.getGamepads()) {
                if (window.isRealGamepad(gp) && gp.buttons[0]?.pressed) { advance(); return; }
            }
        }, 50);

        const cleanup = () => {
            window.removeEventListener('keydown', onKey);
            window.removeEventListener('gamepadconnected',    _onGPConnect);
            window.removeEventListener('gamepaddisconnected', _onGPDisconnect);
            clearInterval(gpInterval);
        };
    }

    _updatePromptText() {
        const el = document.getElementById('ps-prompt-text');
        if (!el) return;
        const hasGamepad = Array.from(navigator.getGamepads()).some(g => window.isRealGamepad(g));
        el.textContent = hasGamepad ? 'Press A to start' : 'Press ENTER to start';
    }
}

const introManager = new IntroManager();
