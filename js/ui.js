// UI elements and HUD

class UI {
    constructor(ctx, canvas) {
        this.ctx = ctx;
        this.canvas = canvas;
        this.mouseX = 0;
        this.mouseY = 0;
        this.menuButtons = []; // Stores clickable regions for current menu
        this.hoveredButton = null;

        this.setupMouseListeners();
    }

    setupMouseListeners() {
        if (!this.canvas) return;

        this.canvas.addEventListener('mousemove', (e) => {
            const rect = this.canvas.getBoundingClientRect();
            this.mouseX = e.clientX - rect.left;
            this.mouseY = e.clientY - rect.top;
            this.updateHoveredButton();
        });

        this.canvas.addEventListener('click', (e) => {
            const rect = this.canvas.getBoundingClientRect();
            const clickX = e.clientX - rect.left;
            const clickY = e.clientY - rect.top;
            this.handleMenuClick(clickX, clickY);
        });
    }

    updateHoveredButton() {
        this.hoveredButton = null;
        for (const btn of this.menuButtons) {
            if (this.mouseX >= btn.x && this.mouseX <= btn.x + btn.width &&
                this.mouseY >= btn.y && this.mouseY <= btn.y + btn.height) {
                this.hoveredButton = btn;
                break;
            }
        }
    }

    handleMenuClick(x, y) {
        for (const btn of this.menuButtons) {
            if (x >= btn.x && x <= btn.x + btn.width &&
                y >= btn.y && y <= btn.y + btn.height) {
                if (btn.action && typeof window.game !== 'undefined') {
                    btn.action();
                }
                break;
            }
        }
    }

    // Create a clickable button region
    addButton(x, y, width, height, action) {
        this.menuButtons.push({ x, y, width, height, action });
    }

    // Clear buttons when menu state changes
    clearButtons() {
        this.menuButtons = [];
    }

    // Check if a button area is hovered
    isHovered(x, y, width, height) {
        return this.mouseX >= x && this.mouseX <= x + width &&
               this.mouseY >= y && this.mouseY <= y + height;
    }

    // Draw a back button in the bottom left
    drawBackButton() {
        const ctx = this.ctx;
        const btnX = 20;
        const btnY = GAME_HEIGHT - 80;
        const btnWidth = 100;
        const btnHeight = 35;
        const isHovered = this.isHovered(btnX, btnY, btnWidth, btnHeight);

        // Draw button background
        ctx.fillStyle = isHovered ? 'rgba(255, 215, 0, 0.4)' : 'rgba(100, 100, 100, 0.5)';
        ctx.fillRect(btnX, btnY, btnWidth, btnHeight);

        // Draw border
        ctx.strokeStyle = isHovered ? '#FFD700' : COLORS.TEXT;
        ctx.lineWidth = 2;
        ctx.strokeRect(btnX, btnY, btnWidth, btnHeight);

        // Draw text
        ctx.font = '18px Arial';
        ctx.fillStyle = isHovered ? '#FFD700' : COLORS.TEXT;
        ctx.textAlign = 'center';
        ctx.fillText('← Back', btnX + btnWidth / 2, btnY + 24);

        this.addButton(btnX, btnY, btnWidth, btnHeight, () => game.handleMenuInput('Escape'));
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
        ctx.fillText('[1/2/3/4] to change weapon', GAME_WIDTH / 2, 50);

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

        // Clear buttons for new frame
        this.clearButtons();

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

        // Draw cursor style hint
        if (this.hoveredButton) {
            this.canvas.style.cursor = 'pointer';
        } else {
            this.canvas.style.cursor = 'default';
        }
    }

    drawMainMenu(y, lineHeight) {
        const ctx = this.ctx;
        ctx.font = '28px Arial';

        const options = [
            { text: 'Select Players', action: () => game.handleMenuInput('1') },
            { text: 'Configure AI', action: () => game.handleMenuInput('2') },
            { text: 'Select Map', action: () => game.handleMenuInput('3') },
            { text: 'Start Game', action: () => game.handleMenuInput('4') }
        ];

        const buttonWidth = 250;
        const buttonHeight = 35;

        for (let i = 0; i < options.length; i++) {
            const btnX = GAME_WIDTH / 2 - buttonWidth / 2;
            const btnY = y + lineHeight * i - 25;
            const isHovered = this.isHovered(btnX, btnY, buttonWidth, buttonHeight);

            // Draw hover highlight
            if (isHovered) {
                ctx.fillStyle = 'rgba(255, 215, 0, 0.3)';
                ctx.fillRect(btnX, btnY, buttonWidth, buttonHeight);
                ctx.fillStyle = '#FFD700';
            } else {
                ctx.fillStyle = COLORS.TEXT;
            }

            ctx.fillText(`${i + 1}. ${options[i].text}`, GAME_WIDTH / 2, y + lineHeight * i);
            this.addButton(btnX, btnY, buttonWidth, buttonHeight, options[i].action);
        }

        ctx.font = UI_FONT;
        ctx.fillStyle = COLORS.TEXT;
        ctx.fillText('Press 1-4 or click to select', GAME_WIDTH / 2, GAME_HEIGHT - 50);
    }

    drawPlayerSelection(y, lineHeight, selectedPlayers) {
        const ctx = this.ctx;
        ctx.font = '28px Arial';
        ctx.fillStyle = COLORS.TEXT;

        ctx.fillText('Select Number of Players (2-8)', GAME_WIDTH / 2, y);

        ctx.font = '24px Arial';
        const buttonWidth = 150;
        const buttonHeight = 30;

        for (let i = 2; i <= 8; i++) {
            const btnX = GAME_WIDTH / 2 - buttonWidth / 2;
            const btnY = y + lineHeight * (i - 1) - 22;
            const isHovered = this.isHovered(btnX, btnY, buttonWidth, buttonHeight);

            if (isHovered) {
                ctx.fillStyle = 'rgba(255, 215, 0, 0.3)';
                ctx.fillRect(btnX, btnY, buttonWidth, buttonHeight);
            }

            if (i === selectedPlayers) {
                ctx.fillStyle = '#FFD700'; // Highlight selected
            } else if (isHovered) {
                ctx.fillStyle = '#FFD700';
            } else {
                ctx.fillStyle = COLORS.TEXT;
            }
            ctx.fillText(`${i} Players`, GAME_WIDTH / 2, y + lineHeight * (i - 1));

            const playerCount = i;
            this.addButton(btnX, btnY, buttonWidth, buttonHeight, () => game.handleMenuInput(String(playerCount)));
        }

        // Back button
        this.drawBackButton();

        ctx.fillStyle = COLORS.TEXT;
        ctx.font = UI_FONT;
        ctx.fillText('Click to select  |  ESC or Back to go back', GAME_WIDTH / 2, GAME_HEIGHT - 50);
    }

    drawAISelection(y, lineHeight, selectedPlayers, aiSettings) {
        const ctx = this.ctx;
        ctx.font = '28px Arial';
        ctx.fillStyle = COLORS.TEXT;
        ctx.textAlign = 'center';

        ctx.fillText('Configure AI for Each Player', GAME_WIDTH / 2, y);

        ctx.font = '20px Arial';
        const buttonWidth = 250;
        const buttonHeight = 28;

        for (let i = 0; i < selectedPlayers; i++) {
            const aiLevel = aiSettings[i];
            const levelText = ['Human', 'Easy AI', 'Normal AI', 'Hard AI'][aiLevel];
            const color = TANK_COLORS[i];

            const btnX = GAME_WIDTH / 2 - buttonWidth / 2;
            const btnY = y + lineHeight + lineHeight * i - 20;
            const isHovered = this.isHovered(btnX, btnY, buttonWidth, buttonHeight);

            if (isHovered) {
                ctx.fillStyle = 'rgba(255, 255, 255, 0.2)';
                ctx.fillRect(btnX, btnY, buttonWidth, buttonHeight);
            }

            ctx.fillStyle = isHovered ? '#FFFFFF' : color;
            ctx.fillText(`Player ${i + 1}: ${levelText}`, GAME_WIDTH / 2, y + lineHeight + lineHeight * i);

            const playerIndex = i + 1;
            this.addButton(btnX, btnY, buttonWidth, buttonHeight, () => game.handleMenuInput(String(playerIndex)));
        }

        // Confirm button
        const confirmY = y + lineHeight + lineHeight * selectedPlayers + 20;
        this.drawConfirmButton(GAME_WIDTH / 2 - 75, confirmY, 150, 40, 'Confirm', () => game.handleMenuInput(' '));

        // Back button
        this.drawBackButton();

        ctx.fillStyle = COLORS.TEXT;
        ctx.font = UI_FONT;
        ctx.textAlign = 'center';
        ctx.fillText('Click player to cycle AI  |  Click Confirm or press SPACE', GAME_WIDTH / 2, GAME_HEIGHT - 50);
    }

    // Draw a confirm/action button
    drawConfirmButton(x, y, width, height, text, action) {
        const ctx = this.ctx;
        const isHovered = this.isHovered(x, y, width, height);

        // Draw button background
        ctx.fillStyle = isHovered ? 'rgba(255, 215, 0, 0.6)' : 'rgba(255, 215, 0, 0.3)';
        ctx.fillRect(x, y, width, height);

        // Draw border
        ctx.strokeStyle = '#FFD700';
        ctx.lineWidth = 2;
        ctx.strokeRect(x, y, width, height);

        // Draw text
        ctx.font = '22px Arial';
        ctx.fillStyle = isHovered ? '#FFFFFF' : '#FFD700';
        ctx.textAlign = 'center';
        ctx.fillText(text, x + width / 2, y + height / 2 + 7);

        this.addButton(x, y, width, height, action);
    }

    drawMapSelection(y, lineHeight, selectedMap) {
        const ctx = this.ctx;
        ctx.font = '28px Arial';
        ctx.fillStyle = COLORS.TEXT;
        ctx.textAlign = 'center';

        ctx.fillText('Select Map', GAME_WIDTH / 2, y);

        ctx.font = '24px Arial';
        const buttonWidth = 220;
        const buttonHeight = 30;

        for (let i = 0; i < MAP_NAMES.length; i++) {
            const btnX = GAME_WIDTH / 2 - buttonWidth / 2;
            const btnY = y + lineHeight + lineHeight * i - 22;
            const isHovered = this.isHovered(btnX, btnY, buttonWidth, buttonHeight);

            if (isHovered) {
                ctx.fillStyle = 'rgba(255, 215, 0, 0.3)';
                ctx.fillRect(btnX, btnY, buttonWidth, buttonHeight);
            }

            if (i === selectedMap) {
                ctx.fillStyle = '#FFD700'; // Highlight selected
            } else if (isHovered) {
                ctx.fillStyle = '#FFD700';
            } else {
                ctx.fillStyle = COLORS.TEXT;
            }
            ctx.fillText(`${i + 1}. ${MAP_NAMES[i]}`, GAME_WIDTH / 2, y + lineHeight + lineHeight * i);

            const mapIndex = i + 1;
            this.addButton(btnX, btnY, buttonWidth, buttonHeight, () => game.handleMenuInput(String(mapIndex)));
        }

        // Back button
        this.drawBackButton();

        ctx.fillStyle = COLORS.TEXT;
        ctx.font = UI_FONT;
        ctx.textAlign = 'center';
        ctx.fillText('Click to select  |  ESC or Back to go back', GAME_WIDTH / 2, GAME_HEIGHT - 50);
    }

    drawConfirmation(y, lineHeight, selectedMap, selectedPlayers, aiSettings) {
        const ctx = this.ctx;
        ctx.font = '28px Arial';
        ctx.fillStyle = COLORS.TEXT;
        ctx.textAlign = 'center';

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

        // Start Game button
        const startBtnY = GAME_HEIGHT - 130;
        this.drawConfirmButton(GAME_WIDTH / 2 - 100, startBtnY, 200, 50, 'START GAME', () => game.handleMenuInput(' '));

        // Back button
        this.drawBackButton();

        ctx.fillStyle = COLORS.TEXT;
        ctx.font = UI_FONT;
        ctx.textAlign = 'center';
        ctx.fillText('Click START or press SPACE  |  ESC to go back', GAME_WIDTH / 2, GAME_HEIGHT - 50);
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
