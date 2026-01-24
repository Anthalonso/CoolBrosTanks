// Tank class

class Tank {
    constructor(id, x, color, aiDifficulty = AI_DIFFICULTY.NONE) {
        this.id = id;
        this.x = x;
        this.y = 0; // Will be set based on terrain
        this.color = color;
        this.health = TANK_HEALTH;
        this.angle = 45; // Default angle
        this.power = 50; // Default power (%)
        this.selectedWeapon = WEAPON_TYPES.SIMPLE;
        this.aiDifficulty = aiDifficulty;
        this.isAlive = true;
        this.isFalling = false;
        this.fallStartY = 0;
    }

    // Update tank position to sit on terrain
    updatePosition(terrain) {
        const terrainHeight = terrain.getHeightAt(this.x);
        const targetY = terrainHeight - TANK_HEIGHT;

        // Check if tank should fall
        if (this.y < targetY - 1) {
            this.isFalling = true;
            if (!this.fallStartY) {
                this.fallStartY = this.y;
            }
            // Apply gravity
            this.y += GRAVITY * 2; // Fall faster than projectiles

            // Check if landed
            if (this.y >= targetY) {
                this.y = targetY;
                const fallDistance = this.y - this.fallStartY;
                const fallDamage = calculateFallDamage(fallDistance);
                if (fallDamage > 0) {
                    this.takeDamage(fallDamage);
                }
                this.isFalling = false;
                this.fallStartY = 0;
            }
        } else {
            this.y = targetY;
            this.isFalling = false;
            this.fallStartY = 0;
        }
    }

    // Take damage
    takeDamage(amount) {
        this.health -= amount;
        if (this.health <= 0) {
            this.health = 0;
            this.isAlive = false;
        }
        return amount;
    }

    // Adjust angle
    adjustAngle(delta) {
        this.angle = clamp(this.angle + delta, 0, 180);
    }

    // Adjust power
    adjustPower(delta) {
        this.power = clamp(this.power + delta, MIN_POWER_THRESHOLD, 100);
    }

    // Change weapon
    setWeapon(weaponType) {
        this.selectedWeapon = weaponType;
    }

    // Get barrel end position for projectile spawn
    getBarrelEnd() {
        const radians = degreesToRadians(this.angle);
        const barrelX = this.x + Math.cos(radians) * TANK_BARREL_LENGTH;
        const barrelY = this.y + TANK_HEIGHT / 2 - Math.sin(radians) * TANK_BARREL_LENGTH;
        return { x: barrelX, y: barrelY };
    }

    // Get tank bounding box for collision
    getBounds() {
        return {
            x: this.x - TANK_WIDTH / 2,
            y: this.y,
            width: TANK_WIDTH,
            height: TANK_HEIGHT
        };
    }

    // Check if point hits tank
    checkHit(x, y) {
        const bounds = this.getBounds();
        return pointInRect(x, y, bounds.x, bounds.y, bounds.width, bounds.height);
    }

    // Check if tank is within splash radius
    checkSplashDamage(explosionX, explosionY, radius) {
        // Use tank center for splash calculations
        const tankCenterX = this.x;
        const tankCenterY = this.y + TANK_HEIGHT / 2;

        const dist = distance(tankCenterX, tankCenterY, explosionX, explosionY);
        return dist <= radius ? dist : -1;
    }

    isHuman() {
        return this.aiDifficulty === AI_DIFFICULTY.NONE;
    }
}
