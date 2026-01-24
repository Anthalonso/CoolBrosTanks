// Game state manager

class Game {
    constructor() {
        this.state = GAME_STATES.MENU;
        this.menuState = 'main'; // main, players, ai, map, confirm
        this.terrain = null;
        this.tanks = [];
        this.projectiles = [];
        this.explosions = [];
        this.currentTurnIndex = 0;
        this.showTrajectoryPreview = false;
        this.damageNumbers = [];
        this.allTanksSettled = false; // Track if all tanks have landed
        this.hasFiredThisTurn = false; // Prevent fire button spamming

        // Menu settings - defaults
        this.selectedMap = MAP_TYPES.ROLLING_HILLS;
        this.selectedPlayers = 2;
        this.aiSettings = [AI_DIFFICULTY.NONE, AI_DIFFICULTY.EASY]; // Default: P1 human, P2 easy AI
    }

    // Menu navigation methods
    handleMenuInput(key) {
        if (this.menuState === 'main') {
            if (key === '1') this.menuState = 'players';
            else if (key === '2') this.menuState = 'ai';
            else if (key === '3') this.menuState = 'map';
            else if (key === '4') this.menuState = 'confirm';
        } else if (this.menuState === 'players') {
            if (key >= '2' && key <= '8') {
                this.selectedPlayers = parseInt(key);
                // Resize AI settings array
                this.aiSettings = new Array(this.selectedPlayers).fill(AI_DIFFICULTY.NONE);
                this.aiSettings[0] = AI_DIFFICULTY.NONE; // P1 is human by default
                for (let i = 1; i < this.selectedPlayers; i++) {
                    this.aiSettings[i] = AI_DIFFICULTY.EASY; // Others default to Easy AI
                }
            } else if (key === 'Escape') {
                this.menuState = 'main';
            }
        } else if (this.menuState === 'ai') {
            if (key >= '1' && key <= String(this.selectedPlayers)) {
                const playerIndex = parseInt(key) - 1;
                // Cycle through AI difficulties: Human -> Easy -> Normal -> Hard -> Human
                this.aiSettings[playerIndex] = (this.aiSettings[playerIndex] + 1) % 4;
            } else if (key === ' ') {
                this.menuState = 'confirm';
            } else if (key === 'Escape') {
                this.menuState = 'main';
            }
        } else if (this.menuState === 'map') {
            if (key >= '1' && key <= '5') {
                this.selectedMap = parseInt(key) - 1;
            } else if (key === 'Escape') {
                this.menuState = 'main';
            }
        } else if (this.menuState === 'confirm') {
            if (key === ' ') {
                this.startGame();
            } else if (key === 'Escape') {
                this.menuState = 'main';
            }
        }
    }

    startGame() {
        this.state = GAME_STATES.SETUP;
        this.setupGame();
        this.state = GAME_STATES.PLAYING;
        this.startTurn();
    }

    setupGame() {
        // Generate terrain
        this.terrain = new Terrain(this.selectedMap);

        // Create tanks
        this.tanks = [];
        const positions = this.generateTankPositions(this.selectedPlayers);

        for (let i = 0; i < this.selectedPlayers; i++) {
            const tank = new Tank(
                i,
                positions[i],
                TANK_COLORS[i],
                this.aiSettings[i]
            );
            tank.updatePosition(this.terrain);
            this.tanks.push(tank);
        }

        this.currentTurnIndex = 0;
        this.projectiles = [];
        this.explosions = [];
        this.damageNumbers = [];
        this.allTanksSettled = false; // Tanks need to land before play starts
    }

    generateTankPositions(count) {
        const positions = [];
        const spacing = (GAME_WIDTH - TANK_EDGE_MARGIN * 2) / (count - 1);

        for (let i = 0; i < count; i++) {
            const x = TANK_EDGE_MARGIN + (spacing * i);
            positions.push(x);
        }

        return positions;
    }

    startTurn() {
        // Don't start turns until all tanks have settled
        if (!this.allTanksSettled) {
            return;
        }

        // Reset fire flag for new turn
        this.hasFiredThisTurn = false;

        // Check win condition first
        if (this.checkWinCondition()) {
            this.state = GAME_STATES.GAME_OVER;
            return;
        }

        const currentTank = this.getCurrentTank();
        if (!currentTank || !currentTank.isAlive) {
            this.nextTurn();
            return;
        }

        // If AI tank, execute AI turn
        if (!currentTank.isHuman()) {
            AI.executeTurn(currentTank, this.tanks, (decision) => {
                if (decision) {
                    this.fireWeapon();
                } else {
                    this.nextTurn();
                }
            });
        }
    }

    getCurrentTank() {
        return this.tanks[this.currentTurnIndex];
    }

    fireWeapon() {
        // Don't allow firing until all tanks have settled
        if (!this.allTanksSettled) return;

        // Prevent firing more than once per turn
        if (this.hasFiredThisTurn) return;

        const tank = this.getCurrentTank();
        if (!tank || this.projectiles.length > 0) return;

        const barrelEnd = tank.getBarrelEnd();
        const projectile = new Projectile(
            barrelEnd.x,
            barrelEnd.y,
            tank.angle,
            tank.power,
            tank.selectedWeapon,
            tank.id
        );

        this.projectiles.push(projectile);
        this.hasFiredThisTurn = true;
        this.state = GAME_STATES.PROJECTILE_FLYING;
    }

    update() {
        if (this.state === GAME_STATES.PAUSED) return;

        // Update projectiles
        for (let i = this.projectiles.length - 1; i >= 0; i--) {
            const proj = this.projectiles[i];

            if (!proj.isActive) {
                this.projectiles.splice(i, 1);
                continue;
            }

            proj.update();

            // Check for cluster bomb split
            if (proj.shouldSplit()) {
                const subs = proj.createSubProjectiles();
                this.projectiles.push(...subs);
                proj.isActive = false;
                continue;
            }

            // Check terrain collision
            if (this.terrain.checkCollision(proj.x, proj.y)) {
                // Try to bounce
                if (proj.bounce()) {
                    continue;
                }

                // Impact
                this.handleProjectileImpact(proj);
                this.projectiles.splice(i, 1);
            }

            // Check tank collision
            for (const tank of this.tanks) {
                if (tank.isAlive && tank.checkHit(proj.x, proj.y)) {
                    this.handleProjectileImpact(proj);
                    this.projectiles.splice(i, 1);
                    break;
                }
            }
        }

        // Update explosions
        for (let i = this.explosions.length - 1; i >= 0; i--) {
            this.explosions[i].update();
            if (!this.explosions[i].isActive) {
                this.explosions.splice(i, 1);
            }
        }

        // Update damage numbers
        for (let i = this.damageNumbers.length - 1; i >= 0; i--) {
            this.damageNumbers[i].frame++;
            if (this.damageNumbers[i].frame > 60) {
                this.damageNumbers.splice(i, 1);
            }
        }

        // Update tank positions (falling)
        let anyTankFalling = false;
        for (const tank of this.tanks) {
            if (tank.isAlive) {
                tank.updatePosition(this.terrain);
                if (tank.isFalling) {
                    anyTankFalling = true;
                }
            }
        }

        // Mark all tanks as settled once they've all landed
        if (!this.allTanksSettled && !anyTankFalling) {
            this.allTanksSettled = true;
            // Start the first turn now that all tanks have settled
            if (this.state === GAME_STATES.PLAYING) {
                this.startTurn();
            }
        }

        // Check if projectiles are done and turn should end
        if (this.state === GAME_STATES.PROJECTILE_FLYING && this.projectiles.length === 0) {
            // Small delay before next turn
            setTimeout(() => {
                if (this.checkWinCondition()) {
                    this.state = GAME_STATES.GAME_OVER;
                } else {
                    this.nextTurn();
                }
            }, 1000);
            this.state = GAME_STATES.PLAYING;
        }
    }

    handleProjectileImpact(projectile) {
        // Apply damage
        const result = WeaponSystem.applyDamage(projectile, this.tanks, this.terrain);

        // Create explosion effect
        if (result.radius > 0) {
            const explosion = new Explosion(result.impactX, result.impactY, result.radius);
            this.explosions.push(explosion);
        }

        // Create damage numbers
        for (const report of result.damageReport) {
            const tank = this.tanks[report.tankId];
            this.damageNumbers.push({
                x: tank.x,
                y: tank.y,
                damage: report.damage,
                frame: 0
            });
        }
    }

    nextTurn() {
        // Check if game is over before finding next tank
        if (this.checkWinCondition()) {
            this.state = GAME_STATES.GAME_OVER;
            return;
        }

        // Find next alive tank
        let attempts = 0;
        do {
            this.currentTurnIndex = (this.currentTurnIndex + 1) % this.tanks.length;
            attempts++;
            if (attempts >= this.tanks.length) {
                // Safety check - no alive tanks found
                this.state = GAME_STATES.GAME_OVER;
                return;
            }
        } while (!this.getCurrentTank().isAlive);

        this.state = GAME_STATES.PLAYING;
        this.startTurn();
    }

    checkWinCondition() {
        const aliveTanks = this.tanks.filter(t => t.isAlive);

        // Game over if only one tank left
        if (aliveTanks.length <= 1) return true;

        // Game over if all human players are dead
        const aliveHumans = aliveTanks.filter(t => t.isHuman());
        if (aliveHumans.length === 0) return true;

        return false;
    }

    getWinner() {
        const aliveTanks = this.tanks.filter(t => t.isAlive);
        return aliveTanks.length === 1 ? aliveTanks[0] : null;
    }

    togglePause() {
        if (this.state === GAME_STATES.PLAYING) {
            this.state = GAME_STATES.PAUSED;
        } else if (this.state === GAME_STATES.PAUSED) {
            this.state = GAME_STATES.PLAYING;
        }
    }

    toggleTrajectoryPreview() {
        this.showTrajectoryPreview = !this.showTrajectoryPreview;
    }

    restart() {
        this.startGame();
    }

    returnToMenu() {
        this.state = GAME_STATES.MENU;
        this.menuState = 'main';
        this.projectiles = [];
        this.explosions = [];
        this.damageNumbers = [];
        this.terrain = null;
        this.tanks = [];
    }
}
