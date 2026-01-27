// Game state manager

class Game {
    constructor() {
        this.state = GAME_STATES.MENU;
        this.menuState = 'main'; // main, modeSelect, hostGame, joinGame, lobby, players, ai, map, confirm
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

        // Multiplayer settings
        this.isMultiplayer = false;
        this.playerName = '';
        this.roomCodeInput = '';
        this.connectionError = '';
        this.terrainSeed = null;
    }

    // Set menu state
    setMenuState(state) {
        this.menuState = state;
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
        console.log('startTurn called. Turn index:', this.currentTurnIndex, 'isLocalPlayerTurn:', this.isLocalPlayerTurn());

        // Don't start turns until all tanks have settled
        if (!this.allTanksSettled) {
            console.log('startTurn: Tanks not settled yet');
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
        console.log('fireWeapon called. allTanksSettled:', this.allTanksSettled, 'hasFiredThisTurn:', this.hasFiredThisTurn);

        // Don't allow firing until all tanks have settled
        if (!this.allTanksSettled) {
            console.log('fireWeapon: Tanks not settled, skipping');
            return;
        }

        // Prevent firing more than once per turn
        if (this.hasFiredThisTurn) {
            console.log('fireWeapon: Already fired this turn, skipping');
            return;
        }

        const tank = this.getCurrentTank();
        if (!tank || this.projectiles.length > 0) {
            console.log('fireWeapon: No tank or projectiles in flight, skipping');
            return;
        }

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

            const updateResult = proj.update(this.terrain);

            // Rolling bomb hit a wall during update
            if (proj.isRolling && updateResult === null) {
                this.handleProjectileImpact(proj);
                this.projectiles.splice(i, 1);
                continue;
            }

            // Check for cluster bomb split
            if (proj.shouldSplit()) {
                const subs = proj.createSubProjectiles();
                this.projectiles.push(...subs);
                proj.isActive = false;
                continue;
            }

            // Check tank collision first (for rolling bombs this is important)
            let hitTank = false;
            for (const tank of this.tanks) {
                if (tank.isAlive && tank.checkHit(proj.x, proj.y)) {
                    this.handleProjectileImpact(proj);
                    this.projectiles.splice(i, 1);
                    hitTank = true;
                    break;
                }
            }
            if (hitTank) continue;

            // Check terrain collision
            if (this.terrain.checkCollision(proj.x, proj.y)) {
                // Rolling bomb starts rolling on terrain contact
                if (proj.weaponType === WEAPON_TYPES.ROLLING && !proj.isRolling) {
                    proj.startRolling(this.terrain);
                    continue;
                }

                // Rolling bomb check for wall/steep angle
                if (proj.isRolling && proj.checkRollStop(this.terrain)) {
                    this.handleProjectileImpact(proj);
                    this.projectiles.splice(i, 1);
                    continue;
                }

                // Try to bounce (for bouncing rounds)
                if (proj.bounce()) {
                    continue;
                }

                // Impact for non-rolling projectiles
                if (!proj.isRolling) {
                    this.handleProjectileImpact(proj);
                    this.projectiles.splice(i, 1);
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
        console.log('nextTurn called. Current index:', this.currentTurnIndex);

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

        console.log('nextTurn: New turn index:', this.currentTurnIndex);
        console.log('nextTurn: Is local player turn:', this.isLocalPlayerTurn());

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
        this.isMultiplayer = false;

        // Disconnect from network if connected
        if (network) {
            network.disconnect();
        }
    }

    // === MULTIPLAYER METHODS ===

    // Host a new multiplayer game
    async hostMultiplayerGame() {
        if (!this.playerName) {
            this.playerName = 'Host';
        }

        this.menuState = 'connecting';

        try {
            // Initialize network if not exists
            if (!network) {
                network = new Network();
            }

            // Setup network callbacks
            this.setupNetworkCallbacks();

            // Host the game
            const roomCode = await network.hostGame(this.playerName);
            console.log('Hosted game with room code:', roomCode);

            this.isMultiplayer = true;
            this.menuState = 'lobby';
        } catch (err) {
            console.error('Failed to host game:', err);
            this.connectionError = err.message;
            this.menuState = 'error';
        }
    }

    // Join an existing multiplayer game
    async joinMultiplayerGame() {
        console.log('joinMultiplayerGame called');
        console.log('playerName:', this.playerName);
        console.log('roomCodeInput:', this.roomCodeInput);

        if (!this.playerName) {
            this.playerName = 'Player';
        }

        if (!this.roomCodeInput) {
            this.connectionError = 'Please enter a room code';
            this.menuState = 'error';
            return;
        }

        this.menuState = 'connecting';
        console.log('Menu state set to connecting');

        try {
            // Initialize network if not exists
            if (!network) {
                console.log('Creating new Network instance');
                network = new Network();
            } else {
                console.log('Network already exists, disconnecting first');
                network.disconnect();
                network = new Network();
            }

            // Setup network callbacks
            this.setupNetworkCallbacks();
            console.log('Network callbacks set up');

            // Join the game
            console.log('Calling network.joinGame with code:', this.roomCodeInput);
            await network.joinGame(this.roomCodeInput, this.playerName);
            console.log('Joined game successfully');

            this.isMultiplayer = true;
            this.menuState = 'lobby';
        } catch (err) {
            console.error('Failed to join game:', err);
            this.connectionError = err.message;
            this.menuState = 'error';
        }
    }

    // Leave multiplayer game
    leaveMultiplayerGame() {
        if (network) {
            network.disconnect();
        }
        this.isMultiplayer = false;
        this.menuState = 'main';
    }

    // Setup network event callbacks
    setupNetworkCallbacks() {
        network.onPlayerJoined = (player) => {
            console.log('Player joined:', player.name);
            if (ui) {
                ui.addChatMessage(null, `${player.name} joined the game`, true);
            }
        };

        network.onPlayerLeft = (peerId) => {
            console.log('Player left:', peerId);
            if (ui) {
                ui.addChatMessage(null, 'A player left the game', true);
            }
        };

        network.onGameStart = (data) => {
            console.log('Game starting with data:', data);
            this.handleMultiplayerGameStart(data);
        };

        network.onTurnData = (data) => {
            console.log('Received turn data:', data);
            this.handleNetworkTurn(data);
        };

        network.onChatMessage = (data) => {
            if (ui && data.peerId !== network.localPlayerId) {
                ui.addChatMessage(data.playerName, data.message);
            } else if (ui) {
                // Show own messages too
                ui.addChatMessage(data.playerName, data.message);
            }
        };
    }

    // Host: start the multiplayer game
    startMultiplayerGame() {
        if (!network || !network.isHost) return;

        // Generate terrain seed for synchronized terrain
        this.terrainSeed = Math.floor(Math.random() * 1000000);

        const settings = {
            map: this.selectedMap,
            playerCount: network.players.length,
            terrainSeed: this.terrainSeed
        };

        network.startGame(settings);
    }

    // Handle game start from network
    handleMultiplayerGameStart(data) {
        this.selectedMap = data.settings.map;
        this.selectedPlayers = data.settings.playerCount;
        this.terrainSeed = data.settings.terrainSeed;

        // All players are human in multiplayer
        this.aiSettings = new Array(this.selectedPlayers).fill(AI_DIFFICULTY.NONE);

        this.isMultiplayer = true;
        this.state = GAME_STATES.SETUP;
        this.setupMultiplayerGame(data.players);
        this.state = GAME_STATES.PLAYING;
        this.startTurn();
    }

    // Setup game for multiplayer
    setupMultiplayerGame(players) {
        // Generate terrain (use seed for consistency)
        this.terrain = new Terrain(this.selectedMap);

        // Create tanks for each player
        this.tanks = [];
        const positions = this.generateTankPositions(players.length);

        for (let i = 0; i < players.length; i++) {
            const tank = new Tank(
                i,
                positions[i],
                TANK_COLORS[i],
                AI_DIFFICULTY.NONE // All human in multiplayer
            );
            tank.playerName = players[i].name;
            tank.peerId = players[i].peerId;
            tank.updatePosition(this.terrain);
            this.tanks.push(tank);
        }

        this.currentTurnIndex = 0;
        this.projectiles = [];
        this.explosions = [];
        this.damageNumbers = [];
        this.allTanksSettled = false;
    }

    // Check if it's the local player's turn
    isLocalPlayerTurn() {
        if (!this.isMultiplayer || !network) return true;

        const currentTank = this.getCurrentTank();
        if (!currentTank) return false;

        return currentTank.peerId === network.localPlayerId;
    }

    // Get current player name for display
    getCurrentPlayerName() {
        const currentTank = this.getCurrentTank();
        if (currentTank && currentTank.playerName) {
            return currentTank.playerName;
        }
        return `Player ${this.currentTurnIndex + 1}`;
    }

    // Fire weapon with network sync
    fireWeaponMultiplayer() {
        if (!this.allTanksSettled) return;
        if (this.hasFiredThisTurn) return;
        if (!this.isLocalPlayerTurn()) return;

        const tank = this.getCurrentTank();
        if (!tank || this.projectiles.length > 0) return;

        // Send turn data to network
        if (network && network.connected) {
            network.sendTurn({
                tankIndex: this.currentTurnIndex,
                angle: tank.angle,
                power: tank.power,
                weapon: tank.selectedWeapon
            });
        }

        // Fire locally
        this.fireWeapon();
    }

    // Handle turn data received from network
    handleNetworkTurn(data) {
        console.log('handleNetworkTurn called with data:', data);
        console.log('Current turn index:', this.currentTurnIndex);
        console.log('Data tank index:', data.tankIndex);

        // Ignore if this is data for a different turn than we're on
        if (data.tankIndex !== this.currentTurnIndex) {
            console.log('Ignoring - tank index mismatch');
            return;
        }

        // Ignore if it's our own turn (we already fired locally)
        if (this.isLocalPlayerTurn()) {
            console.log('Ignoring - this is our turn, already fired locally');
            return;
        }

        const tank = this.tanks[data.tankIndex];
        if (!tank) {
            console.log('Ignoring - tank not found');
            return;
        }

        console.log('Processing remote turn data');

        // If we receive turn data, the other player's tanks are settled
        // Force our tanks to be settled too to stay in sync
        if (!this.allTanksSettled) {
            console.log('Forcing allTanksSettled = true due to received turn data');
            this.allTanksSettled = true;
        }

        // Apply the turn data
        tank.angle = data.angle;
        tank.power = data.power;
        tank.selectedWeapon = data.weapon;

        // Fire the weapon
        this.fireWeapon();
    }

    // Override checkWinCondition for multiplayer
    checkWinCondition() {
        const aliveTanks = this.tanks.filter(t => t.isAlive);

        // Game over if only one tank left
        if (aliveTanks.length <= 1) return true;

        // In multiplayer, don't check for human players
        if (this.isMultiplayer) return false;

        // In local play, game over if all human players are dead
        const aliveHumans = aliveTanks.filter(t => t.isHuman());
        if (aliveHumans.length === 0) return true;

        return false;
    }
}
