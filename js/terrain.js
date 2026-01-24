// Terrain generation and management

class Terrain {
    constructor(mapType) {
        this.heights = new Array(GAME_WIDTH);
        this.mapType = mapType;
        this.generateTerrain();
    }

    generateTerrain() {
        switch (this.mapType) {
            case MAP_TYPES.FLAT_PLAINS:
                this.generateFlatPlains();
                break;
            case MAP_TYPES.ROLLING_HILLS:
                this.generateRollingHills();
                break;
            case MAP_TYPES.MOUNTAIN_RANGE:
                this.generateMountainRange();
                break;
            case MAP_TYPES.CANYON:
                this.generateCanyon();
                break;
            case MAP_TYPES.PLATEAU:
                this.generatePlateau();
                break;
            default:
                this.generateFlatPlains();
        }
    }

    generateFlatPlains() {
        // Mostly flat with slight variance (0-50px)
        const baseHeight = GAME_HEIGHT - 100;
        for (let x = 0; x < GAME_WIDTH; x++) {
            const variance = Math.sin(x * 0.01) * 25;
            this.heights[x] = baseHeight + variance;
        }
    }

    generateRollingHills() {
        // Gentle sine waves (50-150px variance)
        const baseHeight = GAME_HEIGHT - 200;
        for (let x = 0; x < GAME_WIDTH; x++) {
            const wave1 = Math.sin(x * 0.005) * 75;
            const wave2 = Math.sin(x * 0.012) * 35;
            this.heights[x] = baseHeight + wave1 + wave2;
        }
    }

    generateMountainRange() {
        // Sharp peaks (200-400px variance)
        const baseHeight = GAME_HEIGHT - 150;
        for (let x = 0; x < GAME_WIDTH; x++) {
            const peak1 = Math.sin(x * 0.008) * 150;
            const peak2 = Math.abs(Math.sin(x * 0.015)) * 100;
            const noise = Math.sin(x * 0.05) * 30;
            this.heights[x] = baseHeight + peak1 - peak2 + noise;
        }
    }

    generateCanyon() {
        // Two high sides with low middle
        const baseHeight = GAME_HEIGHT - 100;
        for (let x = 0; x < GAME_WIDTH; x++) {
            const normalized = x / GAME_WIDTH; // 0 to 1
            let height;

            if (normalized < 0.3) {
                // Left side - high
                height = baseHeight - 200 + Math.sin(x * 0.02) * 30;
            } else if (normalized > 0.7) {
                // Right side - high
                height = baseHeight - 200 + Math.sin(x * 0.02) * 30;
            } else {
                // Middle - low (canyon floor)
                const t = (normalized - 0.3) / 0.4; // 0 to 1 in middle section
                const dip = Math.sin(t * Math.PI) * 150;
                height = baseHeight + 50 - dip;
            }

            this.heights[x] = height;
        }
    }

    generatePlateau() {
        // Flat top with steep sides
        const baseHeight = GAME_HEIGHT - 100;
        const plateauHeight = GAME_HEIGHT - 300;

        for (let x = 0; x < GAME_WIDTH; x++) {
            const normalized = x / GAME_WIDTH;

            if (normalized < 0.2) {
                // Left slope up
                const t = normalized / 0.2;
                this.heights[x] = lerp(baseHeight, plateauHeight, t);
            } else if (normalized > 0.8) {
                // Right slope down
                const t = (normalized - 0.8) / 0.2;
                this.heights[x] = lerp(plateauHeight, baseHeight, t);
            } else {
                // Flat plateau top
                this.heights[x] = plateauHeight + Math.sin(x * 0.03) * 10;
            }
        }
    }

    // Create crater at explosion point
    createCrater(centerX, radius) {
        for (let x = centerX - radius; x <= centerX + radius; x++) {
            if (x < 0 || x >= GAME_WIDTH) continue;

            const distance = Math.abs(x - centerX);
            if (distance <= radius) {
                const craterDepth = Math.sqrt(radius * radius - distance * distance);
                // Increase Y to lower terrain (Y=0 is top, Y=600 is bottom)
                this.heights[x] = Math.min(this.heights[x] + craterDepth, GAME_HEIGHT);
            }
        }
    }

    // Get terrain height at specific x coordinate
    getHeightAt(x) {
        x = Math.floor(clamp(x, 0, GAME_WIDTH - 1));
        return this.heights[x];
    }

    // Check if projectile collides with terrain
    checkCollision(x, y) {
        if (x < 0 || x >= GAME_WIDTH) return false;
        const terrainHeight = this.getHeightAt(x);
        return y >= terrainHeight;
    }
}
