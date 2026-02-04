// Main game initialization and loop

let game;
let renderer;
let ui;
let inputHandler;
let lastTime = 0;

function init() {
    const canvas = document.getElementById('gameCanvas');
    const ctx = canvas.getContext('2d');

    // Initialize systems
    renderer = new Renderer(canvas);
    ui = new UI(ctx, canvas);
    inputHandler = new InputHandler();
    game = new Game();

    // Make game globally accessible for UI click handlers
    window.game = game;

    // Setup menu controls
    setupMenuControls();

    // Start game loop
    requestAnimationFrame(gameLoop);
}

function setupMenuControls() {
    document.addEventListener('keydown', (e) => {
        // Don't process menu keys if text input is active
        if (ui && (ui.textInputActive || ui.chatInputActive)) {
            return;
        }

        if (game.state === GAME_STATES.MENU) {
            // Handle menu input for all menu states
            if (['main', 'modeSelect', 'players', 'ai', 'map', 'confirm'].includes(game.menuState)) {
                e.preventDefault();
                game.handleMenuInput(e.key);
            }
        }

        if (game.state === GAME_STATES.GAME_OVER && (e.key === 'r' || e.key === 'R')) {
            e.preventDefault();
            game.restart();
        }
    });
}

function gameLoop(currentTime) {
    // Calculate delta time
    const deltaTime = (currentTime - lastTime) / 1000;
    lastTime = currentTime;

    // Update - always process input (for pause/unpause and exit)
    inputHandler.update(game);

    // Only update game logic if not paused
    if (game.state === GAME_STATES.PLAYING || game.state === GAME_STATES.PROJECTILE_FLYING) {
        game.update();
    }

    // Render
    render();

    // Continue loop
    requestAnimationFrame(gameLoop);
}

function render() {
    renderer.clear();

    if (game.state === GAME_STATES.MENU) {
        renderer.drawSky();
        ui.drawMenu(game.menuState, game.selectedMap, game.selectedPlayers, game.aiSettings);
        return;
    }

    // Draw game
    renderer.drawSky();

    if (game.terrain) {
        renderer.drawTerrain(game.terrain);
    }

    // Draw tanks
    for (let i = 0; i < game.tanks.length; i++) {
        const tank = game.tanks[i];
        const isCurrentTank = i === game.currentTurnIndex && game.state === GAME_STATES.PLAYING;
        renderer.drawTank(tank, isCurrentTank);
    }

    // Draw projectiles
    for (const projectile of game.projectiles) {
        renderer.drawProjectile(projectile);
    }

    // Draw explosions
    for (const explosion of game.explosions) {
        renderer.drawExplosion(explosion);
    }

    // Draw damage numbers
    for (const dmg of game.damageNumbers) {
        renderer.drawDamageNumber(dmg.x, dmg.y, dmg.damage, dmg.frame);
    }

    // Draw HUD
    if (game.state === GAME_STATES.PLAYING) {
        ui.drawHUD(game);

        // Draw multiplayer turn indicator
        if (game.isMultiplayer) {
            const isYourTurn = game.isLocalPlayerTurn();
            const currentPlayerName = game.getCurrentPlayerName();
            ui.drawMultiplayerTurnIndicator(isYourTurn, currentPlayerName);
        }
    }

    // Draw chat for multiplayer
    if (game.isMultiplayer && (game.state === GAME_STATES.PLAYING || game.state === GAME_STATES.PROJECTILE_FLYING)) {
        ui.drawChat();
    }

    // Draw pause screen
    if (game.state === GAME_STATES.PAUSED) {
        ui.drawPauseScreen();
    }

    // Draw game over screen
    if (game.state === GAME_STATES.GAME_OVER) {
        const winner = game.getWinner();
        if (winner) {
            ui.drawGameOver(winner);
        }
    }
}

// Start game when page loads
window.addEventListener('load', init);
