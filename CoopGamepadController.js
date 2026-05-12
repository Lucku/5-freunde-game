class CoopGamepadController {
    constructor(gamepadIndex) {
        this.gamepadIndex = gamepadIndex;
    }

    getInput(player) {
        const gp = navigator.getGamepads()[this.gamepadIndex];
        if (!gp) return {
            x: 0, y: 0, aimAngle: player ? player.aimAngle : 0, usingGamepad: false,
            shoot: false, melee: false, dash: false, special: false, pause: false
        };

        const T = 0.12;
        const moveX = Math.abs(gp.axes[0]) > T ? gp.axes[0] : 0;
        const moveY = Math.abs(gp.axes[1]) > T ? gp.axes[1] : 0;
        const aimX  = Math.abs(gp.axes[2]) > T ? gp.axes[2] : 0;
        const aimY  = Math.abs(gp.axes[3]) > T ? gp.axes[3] : 0;

        const aimAngle = (aimX !== 0 || aimY !== 0)
            ? Math.atan2(aimY, aimX)
            : (player ? player.aimAngle : 0);

        const im = (typeof window !== 'undefined') ? window.inputManager : null;
        const act = (a, fallback) => (im && typeof im.isGamepadAction === 'function')
            ? im.isGamepadAction(gp, a)
            : fallback();

        return {
            x: moveX,
            y: moveY,
            aimAngle,
            usingGamepad: true,
            shoot:   act('shoot',   () => gp.buttons[7]?.value > 0.15 || gp.buttons[5]?.pressed),
            melee:   act('melee',   () => gp.buttons[6]?.pressed || gp.buttons[2]?.pressed),
            dash:    act('dash',    () => gp.buttons[4]?.pressed || gp.buttons[1]?.pressed || gp.buttons[0]?.pressed),
            special: act('special', () => gp.buttons[3]?.pressed || gp.buttons[1]?.pressed),
            pause:   act('pause',   () => gp.buttons[9]?.pressed),
        };
    }
}

export { CoopGamepadController };
export default CoopGamepadController;
