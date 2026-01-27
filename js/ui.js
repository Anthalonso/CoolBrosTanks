// UI elements and HUD

class UI {
    constructor(ctx, canvas) {
        this.ctx = ctx;
        this.canvas = canvas;
        this.mouseX = 0;
        this.mouseY = 0;
        this.menuButtons = []; // Stores clickable regions for current menu
        this.hoveredButton = null;

        // Text input state
        this.textInputActive = false;
        this.textInputValue = '';
        this.textInputCallback = null;
        this.textInputLabel = '';

        // Chat state
        this.chatMessages = [];
        this.chatInputActive = false;
        this.chatInputValue = '';
        this.maxChatMessages = 50;

        this.setupMouseListeners();
        this.setupKeyboardListener();
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

    setupKeyboardListener() {
        document.addEventListener('keydown', (e) => {
            // Handle text input mode
            if (this.textInputActive) {
                e.preventDefault();
                if (e.key === 'Enter') {
                    if (this.textInputCallback) {
                        this.textInputCallback(this.textInputValue);
                    }
                    this.textInputActive = false;
                    this.textInputValue = '';
                } else if (e.key === 'Escape') {
                    this.textInputActive = false;
                    this.textInputValue = '';
                } else if (e.key === 'Backspace') {
                    this.textInputValue = this.textInputValue.slice(0, -1);
                } else if (e.key.length === 1 && this.textInputValue.length < 20) {
                    this.textInputValue += e.key;
                }
                return;
            }

            // Handle chat input mode
            if (this.chatInputActive) {
                if (e.key === 'Enter') {
                    if (this.chatInputValue.trim() && network && network.connected) {
                        network.sendChat(this.chatInputValue.trim());
                    }
                    this.chatInputActive = false;
                    this.chatInputValue = '';
                } else if (e.key === 'Escape') {
                    this.chatInputActive = false;
                    this.chatInputValue = '';
                } else if (e.key === 'Backspace') {
                    e.preventDefault();
                    this.chatInputValue = this.chatInputValue.slice(0, -1);
                } else if (e.key.length === 1 && this.chatInputValue.length < 100) {
                    this.chatInputValue += e.key;
                }
                return;
            }

            // Toggle chat with Enter key during multiplayer game
            if (e.key === 'Enter' && network && network.connected &&
                game && (game.state === GAME_STATES.PLAYING || game.state === GAME_STATES.PROJECTILE_FLYING)) {
                this.chatInputActive = true;
                this.chatInputValue = '';
            }
        });
    }

    // Start text input mode
    startTextInput(label, callback) {
        this.textInputActive = true;
        this.textInputValue = '';
        this.textInputLabel = label;
        this.textInputCallback = callback;
    }

    // Add chat message
    addChatMessage(playerName, message, isSystem = false) {
        this.chatMessages.push({
            playerName,
            message,
            isSystem,
            timestamp: Date.now()
        });
        if (this.chatMessages.length > this.maxChatMessages) {
            this.chatMessages.shift();
        }
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
        } else if (menuState === 'modeSelect') {
            this.drawModeSelect(y, lineHeight);
        } else if (menuState === 'hostGame') {
            this.drawHostGame(y, lineHeight);
        } else if (menuState === 'joinGame') {
            this.drawJoinGame(y, lineHeight);
        } else if (menuState === 'lobby') {
            this.drawLobby(y, lineHeight, selectedMap, selectedPlayers);
        } else if (menuState === 'players') {
            this.drawPlayerSelection(y, lineHeight, selectedPlayers);
        } else if (menuState === 'ai') {
            this.drawAISelection(y, lineHeight, selectedPlayers, aiSettings);
        } else if (menuState === 'map') {
            this.drawMapSelection(y, lineHeight, selectedMap);
        } else if (menuState === 'confirm') {
            this.drawConfirmation(y, lineHeight, selectedMap, selectedPlayers, aiSettings);
        } else if (menuState === 'connecting') {
            this.drawConnecting(y, lineHeight);
        } else if (menuState === 'error') {
            this.drawError(y, lineHeight);
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
            { text: 'Online Multiplayer', action: () => game.setMenuState('modeSelect') },
            { text: 'Local Play', action: () => game.setMenuState('players') }
        ];

        const buttonWidth = 280;
        const buttonHeight = 50;

        for (let i = 0; i < options.length; i++) {
            const btnX = GAME_WIDTH / 2 - buttonWidth / 2;
            const btnY = y + 60 * i;
            const isHovered = this.isHovered(btnX, btnY, buttonWidth, buttonHeight);

            // Draw button background
            ctx.fillStyle = isHovered ? 'rgba(255, 215, 0, 0.4)' : 'rgba(100, 100, 100, 0.5)';
            ctx.fillRect(btnX, btnY, buttonWidth, buttonHeight);

            // Draw border
            ctx.strokeStyle = isHovered ? '#FFD700' : COLORS.TEXT;
            ctx.lineWidth = 2;
            ctx.strokeRect(btnX, btnY, buttonWidth, buttonHeight);

            // Draw text
            ctx.fillStyle = isHovered ? '#FFD700' : COLORS.TEXT;
            ctx.fillText(options[i].text, GAME_WIDTH / 2, btnY + 33);

            this.addButton(btnX, btnY, buttonWidth, buttonHeight, options[i].action);
        }

        ctx.font = UI_FONT;
        ctx.fillStyle = COLORS.TEXT;
        ctx.fillText('Select game mode', GAME_WIDTH / 2, GAME_HEIGHT - 50);
    }

    drawModeSelect(y, lineHeight) {
        const ctx = this.ctx;
        ctx.font = '28px Arial';
        ctx.fillStyle = COLORS.TEXT;
        ctx.textAlign = 'center';

        ctx.fillText('Online Multiplayer', GAME_WIDTH / 2, y);

        const options = [
            { text: 'Host Game', action: () => game.setMenuState('hostGame') },
            { text: 'Join Game', action: () => game.setMenuState('joinGame') }
        ];

        const buttonWidth = 220;
        const buttonHeight = 45;

        for (let i = 0; i < options.length; i++) {
            const btnX = GAME_WIDTH / 2 - buttonWidth / 2;
            const btnY = y + 50 + 55 * i;
            const isHovered = this.isHovered(btnX, btnY, buttonWidth, buttonHeight);

            ctx.fillStyle = isHovered ? 'rgba(255, 215, 0, 0.4)' : 'rgba(100, 100, 100, 0.5)';
            ctx.fillRect(btnX, btnY, buttonWidth, buttonHeight);

            ctx.strokeStyle = isHovered ? '#FFD700' : COLORS.TEXT;
            ctx.lineWidth = 2;
            ctx.strokeRect(btnX, btnY, buttonWidth, buttonHeight);

            ctx.fillStyle = isHovered ? '#FFD700' : COLORS.TEXT;
            ctx.font = '24px Arial';
            ctx.fillText(options[i].text, GAME_WIDTH / 2, btnY + 30);

            this.addButton(btnX, btnY, buttonWidth, buttonHeight, options[i].action);
        }

        this.drawBackButton();

        ctx.font = UI_FONT;
        ctx.fillStyle = COLORS.TEXT;
        ctx.fillText('Host a new game or join an existing one', GAME_WIDTH / 2, GAME_HEIGHT - 50);
    }

    drawHostGame(y, lineHeight) {
        const ctx = this.ctx;
        ctx.font = '28px Arial';
        ctx.fillStyle = COLORS.TEXT;
        ctx.textAlign = 'center';

        ctx.fillText('Host New Game', GAME_WIDTH / 2, y);

        // Text input for player name
        ctx.font = '20px Arial';
        ctx.fillText('Enter your name:', GAME_WIDTH / 2, y + 60);

        // Draw text input box
        const inputX = GAME_WIDTH / 2 - 150;
        const inputY = y + 80;
        const inputWidth = 300;
        const inputHeight = 40;

        ctx.fillStyle = this.textInputActive ? 'rgba(255, 255, 255, 0.2)' : 'rgba(0, 0, 0, 0.3)';
        ctx.fillRect(inputX, inputY, inputWidth, inputHeight);
        ctx.strokeStyle = this.textInputActive ? '#FFD700' : COLORS.TEXT;
        ctx.lineWidth = 2;
        ctx.strokeRect(inputX, inputY, inputWidth, inputHeight);

        ctx.fillStyle = COLORS.TEXT;
        ctx.font = '22px Arial';
        const displayText = this.textInputActive ? this.textInputValue + '|' : (game.playerName || 'Click to enter name');
        ctx.fillText(displayText, GAME_WIDTH / 2, inputY + 27);

        // Click to focus input
        this.addButton(inputX, inputY, inputWidth, inputHeight, () => {
            this.startTextInput('Enter name', (name) => {
                game.playerName = name || 'Player';
            });
        });

        // Host button
        const hostBtnY = y + 160;
        this.drawConfirmButton(GAME_WIDTH / 2 - 100, hostBtnY, 200, 50, 'CREATE ROOM', () => {
            game.hostMultiplayerGame();
        });

        this.drawBackButton();

        ctx.font = UI_FONT;
        ctx.fillStyle = COLORS.TEXT;
        ctx.fillText('Enter your name and create a room', GAME_WIDTH / 2, GAME_HEIGHT - 50);
    }

    drawJoinGame(y, lineHeight) {
        const ctx = this.ctx;
        ctx.font = '28px Arial';
        ctx.fillStyle = COLORS.TEXT;
        ctx.textAlign = 'center';

        ctx.fillText('Join Game', GAME_WIDTH / 2, y);

        // Text input for player name
        ctx.font = '20px Arial';
        ctx.fillText('Your name:', GAME_WIDTH / 2, y + 50);

        // Name input box
        const nameInputX = GAME_WIDTH / 2 - 150;
        const nameInputY = y + 65;
        const inputWidth = 300;
        const inputHeight = 35;

        ctx.fillStyle = (this.textInputActive && this.textInputLabel === 'name') ? 'rgba(255, 255, 255, 0.2)' : 'rgba(0, 0, 0, 0.3)';
        ctx.fillRect(nameInputX, nameInputY, inputWidth, inputHeight);
        ctx.strokeStyle = (this.textInputActive && this.textInputLabel === 'name') ? '#FFD700' : COLORS.TEXT;
        ctx.lineWidth = 2;
        ctx.strokeRect(nameInputX, nameInputY, inputWidth, inputHeight);

        ctx.fillStyle = COLORS.TEXT;
        ctx.font = '20px Arial';
        let nameText = (this.textInputActive && this.textInputLabel === 'name') ? this.textInputValue + '|' : (game.playerName || 'Click to enter');
        ctx.fillText(nameText, GAME_WIDTH / 2, nameInputY + 24);

        this.addButton(nameInputX, nameInputY, inputWidth, inputHeight, () => {
            this.startTextInput('name', (name) => {
                game.playerName = name || 'Player';
            });
        });

        // Room code input
        ctx.fillText('Room code:', GAME_WIDTH / 2, y + 130);

        const codeInputY = y + 145;
        ctx.fillStyle = (this.textInputActive && this.textInputLabel === 'code') ? 'rgba(255, 255, 255, 0.2)' : 'rgba(0, 0, 0, 0.3)';
        ctx.fillRect(nameInputX, codeInputY, inputWidth, inputHeight);
        ctx.strokeStyle = (this.textInputActive && this.textInputLabel === 'code') ? '#FFD700' : COLORS.TEXT;
        ctx.strokeRect(nameInputX, codeInputY, inputWidth, inputHeight);

        ctx.fillStyle = COLORS.TEXT;
        let codeText = (this.textInputActive && this.textInputLabel === 'code') ? this.textInputValue.toUpperCase() + '|' : (game.roomCodeInput || 'Click to enter');
        ctx.fillText(codeText, GAME_WIDTH / 2, codeInputY + 24);

        this.addButton(nameInputX, codeInputY, inputWidth, inputHeight, () => {
            this.startTextInput('code', (code) => {
                game.roomCodeInput = code.toUpperCase();
            });
        });

        // Join button
        const joinBtnY = y + 210;
        this.drawConfirmButton(GAME_WIDTH / 2 - 100, joinBtnY, 200, 50, 'JOIN ROOM', () => {
            game.joinMultiplayerGame();
        });

        this.drawBackButton();

        ctx.font = UI_FONT;
        ctx.fillStyle = COLORS.TEXT;
        ctx.fillText('Enter name and room code to join', GAME_WIDTH / 2, GAME_HEIGHT - 50);
    }

    drawLobby(y, lineHeight, selectedMap, selectedPlayers) {
        const ctx = this.ctx;
        ctx.font = '28px Arial';
        ctx.fillStyle = COLORS.TEXT;
        ctx.textAlign = 'center';

        const isHost = network && network.isHost;
        ctx.fillText(isHost ? 'Game Lobby (Host)' : 'Game Lobby', GAME_WIDTH / 2, y - 20);

        // Room code display
        if (network && network.roomCode) {
            ctx.font = '20px Arial';
            ctx.fillStyle = '#FFD700';
            ctx.fillText('Room Code:', GAME_WIDTH / 2, y + 20);
            ctx.font = '36px Arial';
            ctx.fillText(network.roomCode, GAME_WIDTH / 2, y + 60);
        }

        // Players list
        ctx.font = '20px Arial';
        ctx.fillStyle = COLORS.TEXT;
        ctx.fillText('Players:', GAME_WIDTH / 2, y + 100);

        if (network && network.players) {
            for (let i = 0; i < network.players.length; i++) {
                const player = network.players[i];
                const color = TANK_COLORS[i];
                ctx.fillStyle = color;
                const hostTag = player.isHost ? ' (Host)' : '';
                const youTag = player.peerId === network.localPlayerId ? ' (You)' : '';
                ctx.fillText(`${i + 1}. ${player.name}${hostTag}${youTag}`, GAME_WIDTH / 2, y + 130 + 25 * i);
            }
        }

        // Waiting message or start button
        const btnY = GAME_HEIGHT - 180;
        if (isHost) {
            // Map selection for host
            ctx.fillStyle = COLORS.TEXT;
            ctx.font = '18px Arial';
            ctx.fillText(`Map: ${MAP_NAMES[selectedMap]}  (Click to change)`, GAME_WIDTH / 2, btnY - 40);

            const mapBtnWidth = 250;
            const mapBtnX = GAME_WIDTH / 2 - mapBtnWidth / 2;
            this.addButton(mapBtnX, btnY - 55, mapBtnWidth, 25, () => {
                game.selectedMap = (game.selectedMap + 1) % MAP_NAMES.length;
            });

            if (network.players.length >= 2) {
                this.drawConfirmButton(GAME_WIDTH / 2 - 100, btnY, 200, 50, 'START GAME', () => {
                    game.startMultiplayerGame();
                });
            } else {
                ctx.fillStyle = 'rgba(100, 100, 100, 0.5)';
                ctx.fillRect(GAME_WIDTH / 2 - 100, btnY, 200, 50);
                ctx.strokeStyle = '#666';
                ctx.lineWidth = 2;
                ctx.strokeRect(GAME_WIDTH / 2 - 100, btnY, 200, 50);
                ctx.fillStyle = '#666';
                ctx.font = '22px Arial';
                ctx.fillText('Waiting for players...', GAME_WIDTH / 2, btnY + 32);
            }
        } else {
            ctx.fillStyle = COLORS.TEXT;
            ctx.font = '22px Arial';
            ctx.fillText('Waiting for host to start...', GAME_WIDTH / 2, btnY + 20);
        }

        // Leave button
        const leaveBtnX = 20;
        const leaveBtnY = GAME_HEIGHT - 80;
        const leaveBtnWidth = 120;
        const leaveBtnHeight = 35;
        const isHovered = this.isHovered(leaveBtnX, leaveBtnY, leaveBtnWidth, leaveBtnHeight);

        ctx.fillStyle = isHovered ? 'rgba(255, 100, 100, 0.4)' : 'rgba(100, 100, 100, 0.5)';
        ctx.fillRect(leaveBtnX, leaveBtnY, leaveBtnWidth, leaveBtnHeight);
        ctx.strokeStyle = isHovered ? '#FF6666' : COLORS.TEXT;
        ctx.lineWidth = 2;
        ctx.strokeRect(leaveBtnX, leaveBtnY, leaveBtnWidth, leaveBtnHeight);

        ctx.font = '18px Arial';
        ctx.fillStyle = isHovered ? '#FF6666' : COLORS.TEXT;
        ctx.textAlign = 'center';
        ctx.fillText('Leave Room', leaveBtnX + leaveBtnWidth / 2, leaveBtnY + 24);

        this.addButton(leaveBtnX, leaveBtnY, leaveBtnWidth, leaveBtnHeight, () => {
            game.leaveMultiplayerGame();
        });

        ctx.font = UI_FONT;
        ctx.fillStyle = COLORS.TEXT;
        ctx.textAlign = 'center';
        ctx.fillText('Share the room code with friends to play together!', GAME_WIDTH / 2, GAME_HEIGHT - 50);
    }

    drawConnecting(y, lineHeight) {
        const ctx = this.ctx;
        ctx.font = '28px Arial';
        ctx.fillStyle = COLORS.TEXT;
        ctx.textAlign = 'center';

        ctx.fillText('Connecting...', GAME_WIDTH / 2, y + 50);

        // Animated dots
        const dots = '.'.repeat((Math.floor(Date.now() / 500) % 3) + 1);
        ctx.font = '24px Arial';
        ctx.fillText(dots, GAME_WIDTH / 2, y + 90);

        ctx.font = UI_FONT;
        ctx.fillText('Please wait', GAME_WIDTH / 2, GAME_HEIGHT - 50);
    }

    drawError(y, lineHeight) {
        const ctx = this.ctx;
        ctx.font = '28px Arial';
        ctx.fillStyle = '#FF6666';
        ctx.textAlign = 'center';

        ctx.fillText('Connection Error', GAME_WIDTH / 2, y + 30);

        ctx.font = '20px Arial';
        ctx.fillStyle = COLORS.TEXT;
        const errorMsg = game.connectionError || 'Unable to connect';
        ctx.fillText(errorMsg, GAME_WIDTH / 2, y + 80);

        this.drawConfirmButton(GAME_WIDTH / 2 - 75, y + 120, 150, 45, 'Back', () => {
            game.setMenuState('modeSelect');
        });

        ctx.font = UI_FONT;
        ctx.fillText('Please try again', GAME_WIDTH / 2, GAME_HEIGHT - 50);
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

    // Draw chat box for multiplayer
    drawChat() {
        if (!network || !network.connected) return;

        const ctx = this.ctx;
        const chatX = 10;
        const chatY = 70;
        const chatWidth = 280;
        const chatHeight = 200;

        // Chat background
        ctx.fillStyle = 'rgba(0, 0, 0, 0.6)';
        ctx.fillRect(chatX, chatY, chatWidth, chatHeight);

        // Chat border
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.3)';
        ctx.lineWidth = 1;
        ctx.strokeRect(chatX, chatY, chatWidth, chatHeight);

        // Chat title
        ctx.font = '14px Arial';
        ctx.fillStyle = '#FFD700';
        ctx.textAlign = 'left';
        ctx.fillText('Chat (Press Enter)', chatX + 5, chatY + 15);

        // Draw messages (show last messages that fit)
        const messageStartY = chatY + 35;
        const messageHeight = 16;
        const maxVisibleMessages = Math.floor((chatHeight - 60) / messageHeight);
        const visibleMessages = this.chatMessages.slice(-maxVisibleMessages);

        ctx.font = '13px Arial';
        for (let i = 0; i < visibleMessages.length; i++) {
            const msg = visibleMessages[i];
            const msgY = messageStartY + i * messageHeight;

            if (msg.isSystem) {
                ctx.fillStyle = '#888888';
                ctx.fillText(msg.message, chatX + 5, msgY);
            } else {
                // Player name in color
                ctx.fillStyle = '#FFD700';
                const nameWidth = ctx.measureText(msg.playerName + ': ').width;
                ctx.fillText(msg.playerName + ':', chatX + 5, msgY);

                // Message in white
                ctx.fillStyle = COLORS.TEXT;
                const maxMsgWidth = chatWidth - nameWidth - 15;
                let msgText = msg.message;
                if (ctx.measureText(msgText).width > maxMsgWidth) {
                    while (ctx.measureText(msgText + '...').width > maxMsgWidth && msgText.length > 0) {
                        msgText = msgText.slice(0, -1);
                    }
                    msgText += '...';
                }
                ctx.fillText(msgText, chatX + 5 + nameWidth, msgY);
            }
        }

        // Chat input box
        const inputY = chatY + chatHeight - 25;
        ctx.fillStyle = this.chatInputActive ? 'rgba(255, 255, 255, 0.2)' : 'rgba(0, 0, 0, 0.4)';
        ctx.fillRect(chatX + 5, inputY, chatWidth - 10, 20);

        if (this.chatInputActive) {
            ctx.strokeStyle = '#FFD700';
            ctx.strokeRect(chatX + 5, inputY, chatWidth - 10, 20);
        }

        ctx.fillStyle = this.chatInputActive ? COLORS.TEXT : '#888888';
        ctx.font = '13px Arial';
        const inputText = this.chatInputActive ?
            (this.chatInputValue + '|') :
            'Press Enter to chat...';
        ctx.fillText(inputText, chatX + 10, inputY + 14);
    }

    // Draw multiplayer turn indicator
    drawMultiplayerTurnIndicator(isYourTurn, currentPlayerName) {
        const ctx = this.ctx;

        if (isYourTurn) {
            // Highlight that it's your turn
            ctx.fillStyle = 'rgba(0, 255, 0, 0.2)';
            ctx.fillRect(0, 60, GAME_WIDTH, 30);
            ctx.font = '18px Arial';
            ctx.fillStyle = '#00FF00';
            ctx.textAlign = 'center';
            ctx.fillText('YOUR TURN - Aim and Fire!', GAME_WIDTH / 2, 80);
        } else {
            ctx.fillStyle = 'rgba(255, 165, 0, 0.2)';
            ctx.fillRect(0, 60, GAME_WIDTH, 30);
            ctx.font = '18px Arial';
            ctx.fillStyle = '#FFA500';
            ctx.textAlign = 'center';
            ctx.fillText(`Waiting for ${currentPlayerName}...`, GAME_WIDTH / 2, 80);
        }
    }
}
