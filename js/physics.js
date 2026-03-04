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

        // For rolling bombs - track rolling state
        this.isRolling = false;
        this.rollDirection = 0; // 1 for right, -1 for left
    }

    update(terrain) {
        // Update lifetime
        this.lifetime += FIXED_TIME_STEP;

        // Check lifetime limit
        if (this.lifetime >= PROJECTILE_MAX_LIFETIME) {
            this.isActive = false;
            return null;
        }

        // Rolling bomb special behavior
        if (this.weaponType === WEAPON_TYPES.ROLLING && this.isRolling) {
            return this.updateRolling(terrain);
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

    // Update rolling bomb movement along terrain
    updateRolling(terrain) {
        if (!terrain) return { x: this.x, y: this.y };

        const rollSpeed = 3; // pixels per frame
        const newX = this.x + (this.rollDirection * rollSpeed);

        // Check boundaries
        if (newX < 0 || newX >= GAME_WIDTH) {
            this.isActive = false;
            return null;
        }

        // Get terrain heights
        const currentHeight = terrain.getHeightAt(Math.floor(this.x));
        const nextHeight = terrain.getHeightAt(Math.floor(newX));

        // Calculate slope angle
        const heightDiff = nextHeight - currentHeight;
        const slopeAngle = Math.atan2(heightDiff, rollSpeed * this.rollDirection) * (180 / Math.PI);

        // Check for steep cliff (90 degree or steeper = wall)
        // A steep upward slope stops the bomb
        if (heightDiff < -15) {
            // Hit a wall/steep cliff going up - explode
            return null; // Signal to explode
        }

        // Update position - follow terrain
        this.x = newX;
        this.y = nextHeight - PROJECTILE_RADIUS;

        return { x: this.x, y: this.y };
    }

    // Start rolling when hitting terrain
    startRolling(terrain) {
        if (this.weaponType !== WEAPON_TYPES.ROLLING) return false;

        this.isRolling = true;
        // Roll in the direction of horizontal velocity
        this.rollDirection = this.vx >= 0 ? 1 : -1;

        // Snap to terrain surface
        if (terrain) {
            const terrainHeight = terrain.getHeightAt(Math.floor(this.x));
            this.y = terrainHeight - PROJECTILE_RADIUS;
        }

        return true;
    }

    // Check if rolling bomb should stop (hit steep angle)
    checkRollStop(terrain) {
        if (!this.isRolling || !terrain) return false;

        const lookAhead = this.rollDirection * 5;
        const currentHeight = terrain.getHeightAt(Math.floor(this.x));
        const aheadHeight = terrain.getHeightAt(Math.floor(this.x + lookAhead));

        // Height difference that constitutes a "wall" (steep angle)
        const heightDiff = aheadHeight - currentHeight;

        // If terrain rises sharply (negative because Y increases downward)
        // or drops sharply, consider it a stopping point
        if (heightDiff < -10) {
            return true; // Hit a wall
        }

        return false;
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
            case WEAPON_TYPES.ROLLING:
                return {
                    damage: WEAPONS[WEAPON_TYPES.ROLLING].damage,
                    splashRadius: WEAPONS[WEAPON_TYPES.ROLLING].splashRadius,
                    splashDamage: WEAPONS[WEAPON_TYPES.ROLLING].splashDamage
                };
            case WEAPON_TYPES.NAPALM:
                return {
                    damage: 0,
                    splashRadius: 0,
                    splashDamage: 0,
                    isNapalm: true
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

// Lava pool created by Napalm weapon
class LavaPool {
    constructor(impactX, terrain) {
        this.impactX = Math.floor(impactX);
        this.terrain = terrain;
        this.isActive = true;

        // Spread edges (start at impact point)
        this.leftEdge = this.impactX;
        this.rightEdge = this.impactX;

        // Per-tank contact state: tankId -> { inContact: bool, damageDealt: number }
        this.tankStates = {};
    }

    update() {
        // Spread left
        const newLeft = this.leftEdge - LAVA_SPREAD_RATE;
        if (this.impactX - newLeft <= LAVA_MAX_SPREAD && newLeft >= 0) {
            const currentH = this.terrain.getHeightAt(this.leftEdge);
            const nextH = this.terrain.getHeightAt(newLeft);
            // Only spread if terrain is level or lower (higher Y = lower on screen)
            if (nextH >= currentH) {
                this.leftEdge = newLeft;
            }
        }

        // Spread right
        const newRight = this.rightEdge + LAVA_SPREAD_RATE;
        if (newRight - this.impactX <= LAVA_MAX_SPREAD && newRight < GAME_WIDTH) {
            const currentH = this.terrain.getHeightAt(this.rightEdge);
            const nextH = this.terrain.getHeightAt(newRight);
            if (nextH >= currentH) {
                this.rightEdge = newRight;
            }
        }
    }

    isTankInPool(tank) {
        const tankLeft = Math.floor(tank.x - TANK_WIDTH / 2);
        const tankRight = Math.floor(tank.x + TANK_WIDTH / 2);

        // Quick bounds check
        if (tankRight < this.leftEdge || tankLeft > this.rightEdge) return false;

        // Check tank bottom is at terrain level (not hovering above)
        const terrainY = this.terrain.getHeightAt(Math.floor(tank.x));
        const tankBottomY = tank.y + TANK_HEIGHT;
        return tankBottomY >= terrainY - 5; // 5px tolerance
    }

    applyDamageTo(tank) {
        if (!tank.isAlive) return 0;

        const id = tank.id;
        if (!this.tankStates[id]) {
            this.tankStates[id] = { inContact: false, damageDealt: 0 };
        }

        const state = this.tankStates[id];
        const inPool = this.isTankInPool(tank);

        if (!inPool) {
            // Tank left the pool — reset for next contact
            if (state.inContact) {
                state.inContact = false;
                state.damageDealt = 0;
            }
            return 0;
        }

        // Tank entered pool
        if (!state.inContact) {
            state.inContact = true;
            state.damageDealt = 0;
        }

        // Cap reached — no more damage this contact
        if (state.damageDealt >= LAVA_MAX_CONTACT_DAMAGE) return 0;

        const dmg = Math.min(LAVA_DAMAGE_PER_FRAME, LAVA_MAX_CONTACT_DAMAGE - state.damageDealt);
        const dealt = tank.takeDamage(dmg);
        state.damageDealt += dealt;
        return dealt;
    }
}
