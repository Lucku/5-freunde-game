class IntroManager {
    /**
     * Play the full intro sequence (dev logo → press-start), then call onComplete.
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

        this._showDevLogo(() => this._showPressStart(onComplete));
    }

    _showDevLogo(onComplete) {
        const screen = document.getElementById('dev-logo-screen');
        if (!screen) { onComplete(); return; }

        requestAnimationFrame(() => requestAnimationFrame(() => {
            screen.style.transition = 'opacity 1.2s ease';
            screen.style.opacity = '1';

            setTimeout(() => {
                // Pre-position press-start (opacity:0) BEFORE fading dev logo out.
                // The backdrop underneath ensures nothing leaks through while both
                // screens are momentarily transparent.
                const psScreen = document.getElementById('press-start-screen');
                if (psScreen) {
                    psScreen.style.transition = 'none';
                    psScreen.style.opacity = '0';
                    psScreen.style.display = 'flex';
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
                if (gp && gp.buttons[0] && gp.buttons[0].pressed) { advance(); return; }
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
        const hasGamepad = Array.from(navigator.getGamepads()).some(g => g && g.connected);
        el.textContent = hasGamepad ? 'Press A to start' : 'Press ENTER to start';
    }
}

const introManager = new IntroManager();
