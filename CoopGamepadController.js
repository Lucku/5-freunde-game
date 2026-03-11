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

        return {
            x: moveX,
            y: moveY,
            aimAngle,
            usingGamepad: true,
            shoot:   gp.buttons[7]?.value > 0.15,  // R2 / RT
            melee:   gp.buttons[5]?.pressed,         // R1 / RB
            dash:    gp.buttons[4]?.pressed,          // L1 / LB
            special: gp.buttons[1]?.pressed,          // B  / Circle
            pause:   gp.buttons[9]?.pressed,          // Start / Options
        };
    }
}

window.CoopGamepadController = CoopGamepadController;
