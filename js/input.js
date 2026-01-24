// Keyboard input handling

class InputHandler {
    constructor() {
        this.keys = {};
        this.setupEventListeners();
    }

    setupEventListeners() {
        document.addEventListener('keydown', (e) => {
            this.keys[e.key] = true;
            this.handleKeyDown(e);
        });

        document.addEventListener('keyup', (e) => {
            this.keys[e.key] = false;
        });
    }

    handleKeyDown(e) {
        // Prevent default for game keys
        if (['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown', ' ', 'p', 'P', 't', 'T'].includes(e.key)) {
            e.preventDefault();
        }
    }

    isKeyPressed(key) {
        return this.keys[key] === true;
    }

    update(game) {
        if (!game) return;

        // Allow pause/unpause in both PLAYING and PAUSED states
        if (this.keys['p'] || this.keys['P']) {
            this.keys['p'] = false;
            this.keys['P'] = false;
            if (game.state === GAME_STATES.PLAYING || game.state === GAME_STATES.PAUSED) {
                game.togglePause();
            }
        }

        // Allow exit to menu from PLAYING or PAUSED states
        if (this.keys['Escape']) {
            this.keys['Escape'] = false;
            if (game.state === GAME_STATES.PLAYING || game.state === GAME_STATES.PAUSED) {
                game.returnToMenu();
                return;
            }
        }

        // Don't process other inputs if not in PLAYING state
        if (game.state !== GAME_STATES.PLAYING) return;

        const currentTank = game.getCurrentTank();
        if (!currentTank || !currentTank.isHuman() || game.projectiles.length > 0) return;

        // Angle controls
        if (this.isKeyPressed('ArrowLeft')) {
            currentTank.adjustAngle(ANGLE_INCREMENT);
        }
        if (this.isKeyPressed('ArrowRight')) {
            currentTank.adjustAngle(-ANGLE_INCREMENT);
        }

        // Power controls
        if (this.isKeyPressed('ArrowUp')) {
            currentTank.adjustPower(POWER_INCREMENT);
        }
        if (this.isKeyPressed('ArrowDown')) {
            currentTank.adjustPower(-POWER_INCREMENT);
        }

        // Weapon selection
        if (this.keys['1']) {
            currentTank.setWeapon(WEAPON_TYPES.SIMPLE);
            this.keys['1'] = false;
        }
        if (this.keys['2']) {
            currentTank.setWeapon(WEAPON_TYPES.CLUSTER);
            this.keys['2'] = false;
        }
        if (this.keys['3']) {
            currentTank.setWeapon(WEAPON_TYPES.BOUNCING);
            this.keys['3'] = false;
        }

        // Fire weapon
        if (this.keys[' ']) {
            this.keys[' '] = false;
            if (currentTank.power >= MIN_POWER_THRESHOLD) {
                game.fireWeapon();
            }
        }

        // Toggle trajectory preview (if implemented)
        if (this.keys['t'] || this.keys['T']) {
            this.keys['t'] = false;
            this.keys['T'] = false;
            game.toggleTrajectoryPreview();
        }
    }
}
