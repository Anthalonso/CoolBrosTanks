// Network module for PeerJS multiplayer

class Network {
    constructor() {
        this.peer = null;
        this.connections = []; // All peer connections
        this.isHost = false;
        this.roomCode = null;
        this.localPlayerId = null;
        this.players = []; // { peerId, name, tankIndex }
        this.onPlayerJoined = null;
        this.onPlayerLeft = null;
        this.onGameStart = null;
        this.onTurnData = null;
        this.onChatMessage = null;
        this.onConnectionError = null;
        this.onConnectionReady = null;
        this.connected = false;
    }

    // Generate a random room code
    generateRoomCode() {
        const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
        let code = '';
        for (let i = 0; i < 5; i++) {
            code += chars.charAt(Math.floor(Math.random() * chars.length));
        }
        return code;
    }

    // Host a new game
    async hostGame(playerName) {
        return new Promise((resolve, reject) => {
            this.roomCode = this.generateRoomCode();
            this.isHost = true;

            // Create peer with room code as ID
            this.peer = new Peer('coolbrostanks-' + this.roomCode, {
                debug: 1
            });

            this.peer.on('open', (id) => {
                console.log('Host peer opened with ID:', id);
                this.localPlayerId = id;
                this.connected = true;

                // Add host as first player
                this.players.push({
                    peerId: id,
                    name: playerName,
                    tankIndex: 0,
                    isHost: true
                });

                if (this.onConnectionReady) {
                    this.onConnectionReady();
                }
                resolve(this.roomCode);
            });

            this.peer.on('connection', (conn) => {
                this.handleNewConnection(conn);
            });

            this.peer.on('error', (err) => {
                console.error('Peer error:', err);
                if (err.type === 'unavailable-id') {
                    reject(new Error('Room code already in use. Try again.'));
                } else {
                    reject(err);
                }
            });
        });
    }

    // Join an existing game
    async joinGame(roomCode, playerName) {
        return new Promise((resolve, reject) => {
            this.roomCode = roomCode.toUpperCase();
            this.isHost = false;

            this.peer = new Peer(null, {
                debug: 1
            });

            this.peer.on('open', (id) => {
                console.log('Client peer opened with ID:', id);
                this.localPlayerId = id;

                // Connect to host
                const conn = this.peer.connect('coolbrostanks-' + this.roomCode, {
                    reliable: true
                });

                conn.on('open', () => {
                    console.log('Connected to host');
                    this.connections.push(conn);
                    this.connected = true;
                    this.setupConnectionHandlers(conn);

                    // Send join request
                    conn.send({
                        type: 'join',
                        playerName: playerName,
                        peerId: id
                    });

                    if (this.onConnectionReady) {
                        this.onConnectionReady();
                    }
                    resolve();
                });

                conn.on('error', (err) => {
                    console.error('Connection error:', err);
                    reject(new Error('Failed to connect to room'));
                });
            });

            this.peer.on('error', (err) => {
                console.error('Peer error:', err);
                if (err.type === 'peer-unavailable') {
                    reject(new Error('Room not found. Check the code and try again.'));
                } else {
                    reject(err);
                }
            });

            // Timeout for connection
            setTimeout(() => {
                if (!this.connected) {
                    reject(new Error('Connection timed out'));
                }
            }, 10000);
        });
    }

    // Handle new connection (host only)
    handleNewConnection(conn) {
        console.log('New connection from:', conn.peer);
        this.connections.push(conn);
        this.setupConnectionHandlers(conn);
    }

    // Setup handlers for a connection
    setupConnectionHandlers(conn) {
        conn.on('data', (data) => {
            this.handleMessage(conn, data);
        });

        conn.on('close', () => {
            this.handleDisconnect(conn);
        });

        conn.on('error', (err) => {
            console.error('Connection error:', err);
        });
    }

    // Handle incoming messages
    handleMessage(conn, data) {
        console.log('Received message:', data.type, data);

        switch (data.type) {
            case 'join':
                this.handleJoinRequest(conn, data);
                break;
            case 'joinAccepted':
                this.handleJoinAccepted(data);
                break;
            case 'playerList':
                this.handlePlayerList(data);
                break;
            case 'playerJoined':
                this.handlePlayerJoined(data);
                break;
            case 'playerLeft':
                this.handlePlayerLeft(data);
                break;
            case 'gameStart':
                this.handleGameStart(data);
                break;
            case 'turn':
                this.handleTurnData(data);
                break;
            case 'chat':
                this.handleChatMessage(data);
                break;
            case 'gameState':
                this.handleGameState(data);
                break;
        }
    }

    // Host: handle join request
    handleJoinRequest(conn, data) {
        if (!this.isHost) return;

        const newPlayer = {
            peerId: data.peerId,
            name: data.playerName,
            tankIndex: this.players.length,
            isHost: false
        };

        this.players.push(newPlayer);

        // Send acceptance to new player
        conn.send({
            type: 'joinAccepted',
            player: newPlayer,
            players: this.players
        });

        // Notify all other players
        this.broadcast({
            type: 'playerJoined',
            player: newPlayer,
            players: this.players
        }, conn);

        if (this.onPlayerJoined) {
            this.onPlayerJoined(newPlayer);
        }
    }

    // Client: handle join accepted
    handleJoinAccepted(data) {
        this.players = data.players;
        const localPlayer = this.players.find(p => p.peerId === this.localPlayerId);
        if (localPlayer) {
            this.localPlayerId = localPlayer.peerId;
        }
        if (this.onPlayerJoined) {
            this.onPlayerJoined(data.player);
        }
    }

    // Handle player list update
    handlePlayerList(data) {
        this.players = data.players;
    }

    // Handle player joined notification
    handlePlayerJoined(data) {
        this.players = data.players;
        if (this.onPlayerJoined) {
            this.onPlayerJoined(data.player);
        }
    }

    // Handle player left
    handlePlayerLeft(data) {
        this.players = this.players.filter(p => p.peerId !== data.peerId);
        if (this.onPlayerLeft) {
            this.onPlayerLeft(data.peerId);
        }
    }

    // Handle disconnect
    handleDisconnect(conn) {
        console.log('Connection closed:', conn.peer);
        this.connections = this.connections.filter(c => c !== conn);

        const player = this.players.find(p => p.peerId === conn.peer);
        if (player) {
            this.players = this.players.filter(p => p.peerId !== conn.peer);

            // If host, notify others
            if (this.isHost) {
                this.broadcast({
                    type: 'playerLeft',
                    peerId: conn.peer,
                    players: this.players
                });
            }

            if (this.onPlayerLeft) {
                this.onPlayerLeft(conn.peer);
            }
        }
    }

    // Handle game start
    handleGameStart(data) {
        if (this.onGameStart) {
            this.onGameStart(data);
        }
    }

    // Handle turn data
    handleTurnData(data) {
        if (this.onTurnData) {
            this.onTurnData(data);
        }

        // If host, relay to other players
        if (this.isHost) {
            const senderConn = this.connections.find(c => {
                const player = this.players.find(p => p.peerId === c.peer);
                return player && player.tankIndex === data.tankIndex;
            });
            this.broadcast(data, senderConn);
        }
    }

    // Handle chat message
    handleChatMessage(data) {
        if (this.onChatMessage) {
            this.onChatMessage(data);
        }

        // If host, relay to other players
        if (this.isHost) {
            const senderConn = this.connections.find(c => c.peer === data.peerId);
            this.broadcast(data, senderConn);
        }
    }

    // Handle game state sync
    handleGameState(data) {
        if (this.onGameState) {
            this.onGameState(data);
        }
    }

    // Send to all connections except one
    broadcast(data, exceptConn = null) {
        for (const conn of this.connections) {
            if (conn !== exceptConn && conn.open) {
                conn.send(data);
            }
        }
    }

    // Send to all connections
    sendToAll(data) {
        for (const conn of this.connections) {
            if (conn.open) {
                conn.send(data);
            }
        }
    }

    // Send to host (client only)
    sendToHost(data) {
        if (!this.isHost && this.connections.length > 0) {
            this.connections[0].send(data);
        }
    }

    // Host: start the game
    startGame(gameSettings) {
        if (!this.isHost) return;

        const startData = {
            type: 'gameStart',
            settings: gameSettings,
            players: this.players,
            seed: Math.floor(Math.random() * 1000000) // For synchronized terrain
        };

        this.sendToAll(startData);

        if (this.onGameStart) {
            this.onGameStart(startData);
        }
    }

    // Send turn data
    sendTurn(turnData) {
        const data = {
            type: 'turn',
            ...turnData
        };

        if (this.isHost) {
            this.sendToAll(data);
        } else {
            this.sendToHost(data);
        }
    }

    // Send chat message
    sendChat(message) {
        const localPlayer = this.players.find(p => p.peerId === this.localPlayerId);
        const data = {
            type: 'chat',
            peerId: this.localPlayerId,
            playerName: localPlayer ? localPlayer.name : 'Unknown',
            message: message,
            timestamp: Date.now()
        };

        if (this.isHost) {
            this.sendToAll(data);
        } else {
            this.sendToHost(data);
        }

        // Also show locally
        if (this.onChatMessage) {
            this.onChatMessage(data);
        }
    }

    // Send game state (host only, for sync)
    sendGameState(state) {
        if (!this.isHost) return;

        this.sendToAll({
            type: 'gameState',
            state: state
        });
    }

    // Get local player
    getLocalPlayer() {
        return this.players.find(p => p.peerId === this.localPlayerId);
    }

    // Check if it's local player's turn
    isLocalPlayerTurn(currentTankIndex) {
        const localPlayer = this.getLocalPlayer();
        return localPlayer && localPlayer.tankIndex === currentTankIndex;
    }

    // Disconnect and cleanup
    disconnect() {
        if (this.peer) {
            this.peer.destroy();
            this.peer = null;
        }
        this.connections = [];
        this.players = [];
        this.isHost = false;
        this.roomCode = null;
        this.connected = false;
    }
}

// Global network instance
let network = null;
