// UI elements and HUD

class UI {
    constructor(ctx) {
        this.ctx = ctx;
    }

    drawHUD(game) {
        const currentTank = game.getCurrentTank();
        if (!currentTank) return;

        this.drawTopBar(currentTank, game.currentTurnIndex);
        this.drawControlsGuide();
    }

    drawTopBar(tank, turnIndex) {
        const ctx = this.ctx;

        // Semi-transparent background
        ctx.fillStyle = COLORS.UI_BG;
        ctx.fillRect(0, 0, GAME_WIDTH, 60);

        // Current player indicator
        ctx.font = UI_FONT_LARGE;
        ctx.fillStyle = tank.color;
        ctx.textAlign = 'left';
        ctx.fillText(`Player ${tank.id + 1}`, UI_PADDING, 30);

        // AI indicator
        if (!tank.isHuman()) {
            ctx.font = UI_FONT;
            const diffText = ['', 'Easy', 'Normal', 'Hard'][tank.aiDifficulty];
            ctx.fillText(`(AI - ${diffText})`, UI_PADDING, 50);
        }

        // Current weapon (center)
        ctx.font = UI_FONT_LARGE;
        ctx.fillStyle = COLORS.TEXT;
        ctx.textAlign = 'center';
        const weaponName = WEAPONS[tank.selectedWeapon].name;
        ctx.fillText(weaponName, GAME_WIDTH / 2, 30);

        // Weapon key hint
        ctx.font = UI_FONT;
        ctx.fillText('[1/2/3] to change weapon', GAME_WIDTH / 2, 50);

        // Angle and Power (right)
        ctx.font = UI_FONT_LARGE;
        ctx.textAlign = 'right';
        ctx.fillText(`Angle: ${Math.round(tank.angle)}°`, GAME_WIDTH - UI_PADDING, 30);
        ctx.fillText(`Power: ${Math.round(tank.power)}%`, GAME_WIDTH - UI_PADDING, 50);
    }

    drawControlsGuide() {
        const ctx = this.ctx;

        ctx.fillStyle = COLORS.UI_BG;
        ctx.fillRect(0, GAME_HEIGHT - 40, GAME_WIDTH, 40);

        ctx.font = UI_FONT;
        ctx.fillStyle = COLORS.TEXT;
        ctx.textAlign = 'center';
        ctx.fillText('← → Adjust Angle  |  ↑ ↓ Adjust Power  |  SPACE Fire  |  P Pause  |  ESC Menu', GAME_WIDTH / 2, GAME_HEIGHT - 15);
    }

    drawMenu(menuState, selectedMap, selectedPlayers, aiSettings) {
        const ctx = this.ctx;

        // Background
        ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
        ctx.fillRect(0, 0, GAME_WIDTH, GAME_HEIGHT);

        // Title
        ctx.font = '48px Arial';
        ctx.fillStyle = '#FFD700';
        ctx.textAlign = 'center';
        ctx.fillText('COOL BROS TANKS', GAME_WIDTH / 2, 100);

        // Subtitle
        ctx.font = UI_FONT_LARGE;
        ctx.fillStyle = COLORS.TEXT;
        ctx.fillText('Artillery Game', GAME_WIDTH / 2, 140);

        const y = 220;
        const lineHeight = 35;

        // Menu options based on current menu state
        if (menuState === 'main') {
            this.drawMainMenu(y, lineHeight);
        } else if (menuState === 'players') {
            this.drawPlayerSelection(y, lineHeight, selectedPlayers);
        } else if (menuState === 'ai') {
            this.drawAISelection(y, lineHeight, selectedPlayers, aiSettings);
        } else if (menuState === 'map') {
            this.drawMapSelection(y, lineHeight, selectedMap);
        } else if (menuState === 'confirm') {
            this.drawConfirmation(y, lineHeight, selectedMap, selectedPlayers, aiSettings);
        }
    }

    drawMainMenu(y, lineHeight) {
        const ctx = this.ctx;
        ctx.font = '28px Arial';
        ctx.fillStyle = COLORS.TEXT;

        const options = [
            '1. Select Players',
            '2. Configure AI',
            '3. Select Map',
            '4. Start Game'
        ];

        for (let i = 0; i < options.length; i++) {
            ctx.fillText(options[i], GAME_WIDTH / 2, y + lineHeight * i);
        }

        ctx.font = UI_FONT;
        ctx.fillText('Press 1-4 to select', GAME_WIDTH / 2, GAME_HEIGHT - 50);
    }

    drawPlayerSelection(y, lineHeight, selectedPlayers) {
        const ctx = this.ctx;
        ctx.font = '28px Arial';
        ctx.fillStyle = COLORS.TEXT;

        ctx.fillText('Select Number of Players (2-8)', GAME_WIDTH / 2, y);

        ctx.font = '24px Arial';
        for (let i = 2; i <= 8; i++) {
            if (i === selectedPlayers) {
                ctx.fillStyle = '#FFD700'; // Highlight selected
            } else {
                ctx.fillStyle = COLORS.TEXT;
            }
            ctx.fillText(`${i} Players`, GAME_WIDTH / 2, y + lineHeight * (i - 1));
        }

        ctx.fillStyle = COLORS.TEXT;
        ctx.font = UI_FONT;
        ctx.fillText('Press 2-8 to select  |  ESC to go back', GAME_WIDTH / 2, GAME_HEIGHT - 50);
    }

    drawAISelection(y, lineHeight, selectedPlayers, aiSettings) {
        const ctx = this.ctx;
        ctx.font = '28px Arial';
        ctx.fillStyle = COLORS.TEXT;

        ctx.fillText('Configure AI for Each Player', GAME_WIDTH / 2, y);

        ctx.font = '20px Arial';
        for (let i = 0; i < selectedPlayers; i++) {
            const aiLevel = aiSettings[i];
            const levelText = ['Human', 'Easy AI', 'Normal AI', 'Hard AI'][aiLevel];
            const color = TANK_COLORS[i];

            ctx.fillStyle = color;
            ctx.fillText(`Player ${i + 1}: ${levelText}`, GAME_WIDTH / 2, y + lineHeight + lineHeight * i);
        }

        ctx.fillStyle = COLORS.TEXT;
        ctx.font = UI_FONT;
        ctx.fillText('Press player number (1-' + selectedPlayers + ') to cycle AI  |  SPACE to confirm  |  ESC to go back', GAME_WIDTH / 2, GAME_HEIGHT - 50);
    }

    drawMapSelection(y, lineHeight, selectedMap) {
        const ctx = this.ctx;
        ctx.font = '28px Arial';
        ctx.fillStyle = COLORS.TEXT;

        ctx.fillText('Select Map', GAME_WIDTH / 2, y);

        ctx.font = '24px Arial';
        for (let i = 0; i < MAP_NAMES.length; i++) {
            if (i === selectedMap) {
                ctx.fillStyle = '#FFD700'; // Highlight selected
            } else {
                ctx.fillStyle = COLORS.TEXT;
            }
            ctx.fillText(`${i + 1}. ${MAP_NAMES[i]}`, GAME_WIDTH / 2, y + lineHeight + lineHeight * i);
        }

        ctx.fillStyle = COLORS.TEXT;
        ctx.font = UI_FONT;
        ctx.fillText('Press 1-5 to select  |  ESC to go back', GAME_WIDTH / 2, GAME_HEIGHT - 50);
    }

    drawConfirmation(y, lineHeight, selectedMap, selectedPlayers, aiSettings) {
        const ctx = this.ctx;
        ctx.font = '28px Arial';
        ctx.fillStyle = COLORS.TEXT;

        ctx.fillText('Game Setup Complete!', GAME_WIDTH / 2, y);

        ctx.font = '20px Arial';
        ctx.fillText(`Map: ${MAP_NAMES[selectedMap]}`, GAME_WIDTH / 2, y + lineHeight * 2);
        ctx.fillText(`Players: ${selectedPlayers}`, GAME_WIDTH / 2, y + lineHeight * 3);

        // Show player setup
        for (let i = 0; i < selectedPlayers; i++) {
            const aiLevel = aiSettings[i];
            const levelText = ['Human', 'Easy AI', 'Normal AI', 'Hard AI'][aiLevel];
            const color = TANK_COLORS[i];

            ctx.fillStyle = color;
            ctx.fillText(`P${i + 1}: ${levelText}`, GAME_WIDTH / 2, y + lineHeight * (4 + i));
        }

        ctx.fillStyle = '#FFD700';
        ctx.font = '32px Arial';
        ctx.fillText('Press SPACE to Start', GAME_WIDTH / 2, GAME_HEIGHT - 100);

        ctx.fillStyle = COLORS.TEXT;
        ctx.font = UI_FONT;
        ctx.fillText('ESC to go back to main menu', GAME_WIDTH / 2, GAME_HEIGHT - 50);
    }

    drawGameOver(winner) {
        const ctx = this.ctx;

        // Semi-transparent overlay
        ctx.fillStyle = 'rgba(0, 0, 0, 0.8)';
        ctx.fillRect(0, 0, GAME_WIDTH, GAME_HEIGHT);

        // Winner announcement
        ctx.font = '64px Arial';
        ctx.fillStyle = winner.color;
        ctx.textAlign = 'center';
        ctx.fillText('VICTORY!', GAME_WIDTH / 2, GAME_HEIGHT / 2 - 50);

        ctx.font = '32px Arial';
        ctx.fillStyle = COLORS.TEXT;
        ctx.fillText(`Player ${winner.id + 1} Wins!`, GAME_WIDTH / 2, GAME_HEIGHT / 2 + 20);

        // Restart hint
        ctx.font = UI_FONT_LARGE;
        ctx.fillText('Press R to Restart', GAME_WIDTH / 2, GAME_HEIGHT / 2 + 80);
    }

    drawPauseScreen() {
        const ctx = this.ctx;

        ctx.fillStyle = 'rgba(0, 0, 0, 0.5)';
        ctx.fillRect(0, 0, GAME_WIDTH, GAME_HEIGHT);

        ctx.font = '48px Arial';
        ctx.fillStyle = COLORS.TEXT;
        ctx.textAlign = 'center';
        ctx.fillText('PAUSED', GAME_WIDTH / 2, GAME_HEIGHT / 2 - 20);

        ctx.font = UI_FONT_LARGE;
        ctx.fillText('Press P to Resume', GAME_WIDTH / 2, GAME_HEIGHT / 2 + 40);

        ctx.font = UI_FONT;
        ctx.fillText('Press ESC to Exit to Menu', GAME_WIDTH / 2, GAME_HEIGHT / 2 + 80);
    }
}
