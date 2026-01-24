// Physics engine and projectile motion

class Projectile {
    constructor(x, y, angle, power, weaponType, ownerId) {
        this.x = x;
        this.y = y;
        this.weaponType = weaponType;
        this.ownerId = ownerId;
        this.isActive = true;
        this.bounceCount = 0;
        this.lifetime = 0; // in seconds

        // Calculate initial velocity
        const radians = degreesToRadians(angle);
        let velocity = (power / 100) * MAX_VELOCITY;

        // Bouncing rounds are slower
        if (weaponType === WEAPON_TYPES.BOUNCING) {
            velocity *= 0.5; // 50% speed for bouncing rounds
        }

        this.vx = Math.cos(radians) * velocity;
        this.vy = -Math.sin(radians) * velocity;

        // For cluster bombs - track if split has occurred
        this.hasSplit = false;
        this.isSubProjectile = false;
    }

    update() {
        // Update lifetime
        this.lifetime += FIXED_TIME_STEP;

        // Check lifetime limit
        if (this.lifetime >= PROJECTILE_MAX_LIFETIME) {
            this.isActive = false;
            return null;
        }

        // Apply gravity
        this.vy += GRAVITY;

        // Update position
        this.x += this.vx;
        this.y += this.vy;

        // Ricochet off screen boundaries
        const ricochetDamping = 0.8; // Energy loss on ricochet

        // Left/right boundaries
        if (this.x < 0) {
            this.x = 0;
            this.vx = -this.vx * ricochetDamping;
        } else if (this.x >= GAME_WIDTH) {
            this.x = GAME_WIDTH - 1;
            this.vx = -this.vx * ricochetDamping;
        }

        // Top boundary
        if (this.y < 0) {
            this.y = 0;
            this.vy = -this.vy * ricochetDamping;
        }

        // Bottom boundary - still despawn if going below
        if (this.y > GAME_HEIGHT) {
            this.isActive = false;
            return null;
        }

        return { x: this.x, y: this.y };
    }

    // Handle bounce for bouncing rounds
    bounce() {
        if (this.weaponType !== WEAPON_TYPES.BOUNCING) {
            return false;
        }

        const maxBounces = WEAPONS[WEAPON_TYPES.BOUNCING].bounces;
        if (this.bounceCount >= maxBounces) {
            return false;
        }

        // Reverse Y velocity with less damping for dramatic bounces
        const bounceDamping = 0.85; // Higher = more dramatic bounces (less energy loss)
        this.vy = -Math.abs(this.vy) * bounceDamping; // Make sure it goes up
        this.vx *= bounceDamping;
        this.bounceCount++;

        // Move projectile above terrain based on its speed to prevent re-collision
        this.y -= Math.abs(this.vy) * 2;

        return true;
    }

    // Check if cluster bomb should split
    shouldSplit() {
        if (this.weaponType !== WEAPON_TYPES.CLUSTER || this.hasSplit || this.isSubProjectile) {
            return false;
        }

        // Split at apex (when vy changes from negative to positive)
        if (this.vy >= 0) {
            this.hasSplit = true;
            return true;
        }

        return false;
    }

    // Create sub-projectiles for cluster bomb
    createSubProjectiles() {
        const subProjectiles = [];
        const count = WEAPONS[WEAPON_TYPES.CLUSTER].subProjectiles;

        // Get current direction of main projectile
        const mainAngle = Math.atan2(this.vy, this.vx);
        const spreadAngle = 30; // degrees of spread

        for (let i = 0; i < count; i++) {
            // Spread sub-projectiles in a cone around the main direction
            const offset = ((i - (count - 1) / 2) / count) * spreadAngle;
            const subAngle = mainAngle + degreesToRadians(offset);
            const speed = randomRange(8, 12); // Faster to maintain direction

            const sub = new Projectile(this.x, this.y, 0, 0, WEAPON_TYPES.CLUSTER, this.ownerId);
            sub.vx = Math.cos(subAngle) * speed + this.vx * 0.3; // Inherit some parent velocity
            sub.vy = Math.sin(subAngle) * speed + this.vy * 0.3;
            sub.isSubProjectile = true;
            sub.hasSplit = true;

            subProjectiles.push(sub);
        }

        return subProjectiles;
    }

    // Get impact data for damage calculation
    getImpactData() {
        if (this.isSubProjectile) {
            return {
                damage: WEAPONS[WEAPON_TYPES.CLUSTER].subDamage,
                splashRadius: WEAPONS[WEAPON_TYPES.CLUSTER].subSplashRadius,
                splashDamage: WEAPONS[WEAPON_TYPES.CLUSTER].subSplash
            };
        }

        switch (this.weaponType) {
            case WEAPON_TYPES.SIMPLE:
                return {
                    damage: WEAPONS[WEAPON_TYPES.SIMPLE].damage,
                    splashRadius: WEAPONS[WEAPON_TYPES.SIMPLE].splashRadius,
                    splashDamage: WEAPONS[WEAPON_TYPES.SIMPLE].splashDamage
                };
            case WEAPON_TYPES.CLUSTER:
                return {
                    damage: WEAPONS[WEAPON_TYPES.CLUSTER].initialDamage,
                    splashRadius: 0,
                    splashDamage: 0
                };
            case WEAPON_TYPES.BOUNCING:
                return {
                    damage: WEAPONS[WEAPON_TYPES.BOUNCING].damage,
                    splashRadius: WEAPONS[WEAPON_TYPES.BOUNCING].splashRadius,
                    splashDamage: WEAPONS[WEAPON_TYPES.BOUNCING].splashDamage
                };
            default:
                return { damage: 0, splashRadius: 0, splashDamage: 0 };
        }
    }
}

// Explosion effect
class Explosion {
    constructor(x, y, radius) {
        this.x = x;
        this.y = y;
        this.maxRadius = radius * EXPLOSION_MAX_RADIUS_MULTIPLIER;
        this.currentRadius = 0;
        this.frame = 0;
        this.duration = EXPLOSION_DURATION;
        this.isActive = true;
    }

    update() {
        this.frame++;
        const progress = this.frame / this.duration;

        // Expand then fade
        if (progress < 0.5) {
            this.currentRadius = this.maxRadius * (progress * 2);
        } else {
            this.currentRadius = this.maxRadius * (1 - (progress - 0.5) * 2);
        }

        if (this.frame >= this.duration) {
            this.isActive = false;
        }
    }

    getAlpha() {
        const progress = this.frame / this.duration;
        return 1 - progress;
    }
}
