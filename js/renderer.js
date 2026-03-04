// Rendering functions

class Renderer {
    constructor(canvas) {
        this.canvas = canvas;
        this.ctx = canvas.getContext('2d');
        this.scale = 1;
        this.offsetX = 0;
        this.offsetY = 0;
    }

    clear() {
        this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
    }

    drawSky() {
        // Gradient sky
        const gradient = this.ctx.createLinearGradient(0, 0, 0, GAME_HEIGHT);
        gradient.addColorStop(0, COLORS.SKY_TOP);
        gradient.addColorStop(1, COLORS.SKY_BOTTOM);

        this.ctx.fillStyle = gradient;
        this.ctx.fillRect(0, 0, GAME_WIDTH, GAME_HEIGHT);
    }

    drawTerrain(terrain) {
        this.ctx.fillStyle = COLORS.TERRAIN_BROWN;
        this.ctx.beginPath();
        this.ctx.moveTo(0, GAME_HEIGHT);

        for (let x = 0; x < GAME_WIDTH; x++) {
            const y = terrain.getHeightAt(x);
            this.ctx.lineTo(x, y);
        }

        this.ctx.lineTo(GAME_WIDTH, GAME_HEIGHT);
        this.ctx.closePath();
        this.ctx.fill();

        // Add outline
        this.ctx.strokeStyle = '#654321';
        this.ctx.lineWidth = 2;
        this.ctx.beginPath();
        for (let x = 0; x < GAME_WIDTH; x++) {
            const y = terrain.getHeightAt(x);
            if (x === 0) {
                this.ctx.moveTo(x, y);
            } else {
                this.ctx.lineTo(x, y);
            }
        }
        this.ctx.stroke();
    }

    drawTank(tank, isCurrentTank = false) {
        if (!tank.isAlive) return;

        const ctx = this.ctx;

        // Draw glow for current tank
        if (isCurrentTank) {
            ctx.shadowBlur = 15;
            ctx.shadowColor = tank.color;
        }

        // Draw tank body (rounded rectangle)
        ctx.fillStyle = tank.color;
        ctx.beginPath();
        const x = tank.x - TANK_WIDTH / 2;
        const y = tank.y;
        const radius = 4;

        ctx.moveTo(x + radius, y);
        ctx.lineTo(x + TANK_WIDTH - radius, y);
        ctx.arcTo(x + TANK_WIDTH, y, x + TANK_WIDTH, y + radius, radius);
        ctx.lineTo(x + TANK_WIDTH, y + TANK_HEIGHT - radius);
        ctx.arcTo(x + TANK_WIDTH, y + TANK_HEIGHT, x + TANK_WIDTH - radius, y + TANK_HEIGHT, radius);
        ctx.lineTo(x + radius, y + TANK_HEIGHT);
        ctx.arcTo(x, y + TANK_HEIGHT, x, y + TANK_HEIGHT - radius, radius);
        ctx.lineTo(x, y + radius);
        ctx.arcTo(x, y, x + radius, y, radius);
        ctx.closePath();
        ctx.fill();

        // Draw barrel
        const barrelEnd = tank.getBarrelEnd();
        ctx.strokeStyle = tank.color;
        ctx.lineWidth = 4;
        ctx.beginPath();
        ctx.moveTo(tank.x, tank.y + TANK_HEIGHT / 2);
        ctx.lineTo(barrelEnd.x, barrelEnd.y);
        ctx.stroke();

        // Reset shadow
        ctx.shadowBlur = 0;

        // Draw health bar
        this.drawHealthBar(tank);

        // Draw player number
        ctx.fillStyle = COLORS.TEXT;
        ctx.font = '12px Arial';
        ctx.textAlign = 'center';
        ctx.fillText(`P${tank.id + 1}`, tank.x, tank.y - 20);
    }

    drawHealthBar(tank) {
        const barWidth = TANK_WIDTH;
        const barHeight = 4;
        const x = tank.x - barWidth / 2;
        const y = tank.y - 10;

        // Background
        this.ctx.fillStyle = '#333333';
        this.ctx.fillRect(x, y, barWidth, barHeight);

        // Health
        const healthPercent = tank.health / TANK_HEALTH;
        this.ctx.fillStyle = getHealthColor(healthPercent);
        this.ctx.fillRect(x, y, barWidth * healthPercent, barHeight);

        // Border
        this.ctx.strokeStyle = '#000000';
        this.ctx.lineWidth = 1;
        this.ctx.strokeRect(x, y, barWidth, barHeight);
    }

    drawProjectile(projectile) {
        this.ctx.fillStyle = COLORS.PROJECTILE;
        this.ctx.beginPath();
        this.ctx.arc(projectile.x, projectile.y, PROJECTILE_RADIUS, 0, Math.PI * 2);
        this.ctx.fill();

        // Add glow
        this.ctx.strokeStyle = 'rgba(255, 255, 0, 0.5)';
        this.ctx.lineWidth = 2;
        this.ctx.stroke();
    }

    drawExplosion(explosion) {
        const ctx = this.ctx;
        const alpha = explosion.getAlpha();

        // Outer ring (red)
        const gradient = ctx.createRadialGradient(
            explosion.x, explosion.y, 0,
            explosion.x, explosion.y, explosion.currentRadius
        );
        gradient.addColorStop(0, `rgba(255, 100, 0, ${alpha})`);
        gradient.addColorStop(0.5, `rgba(255, 50, 0, ${alpha * 0.5})`);
        gradient.addColorStop(1, `rgba(255, 0, 0, 0)`);

        ctx.fillStyle = gradient;
        ctx.beginPath();
        ctx.arc(explosion.x, explosion.y, explosion.currentRadius, 0, Math.PI * 2);
        ctx.fill();
    }

    drawLavaPool(pool, terrain) {
        const ctx = this.ctx;
        const time = Date.now();
        const pulse = 0.6 + 0.4 * Math.sin(time / 150);
        const lavaThickness = 8;

        // Draw flame tongues (drawn first so lava body sits on top)
        const flameSpacing = 6;
        for (let x = pool.leftEdge; x <= pool.rightEdge; x += flameSpacing) {
            const terrainY = terrain.getHeightAt(x);

            // Each column gets its own animated phase
            const wave1 = Math.sin(time / 180 + x * 0.25);
            const wave2 = Math.sin(time / 110 + x * 0.4 + 2.0);
            const height = 12 + (wave1 * 0.5 + 0.5) * 20; // 12–32px tall
            const lean = wave2 * 3;                         // slight horizontal sway
            const alpha = (0.5 + (wave1 * 0.5 + 0.5) * 0.4) * pulse;

            const baseY = terrainY - lavaThickness;
            const tipX = x + lean;
            const tipY = baseY - height;

            const gradient = ctx.createLinearGradient(x, baseY, tipX, tipY);
            gradient.addColorStop(0, `rgba(255, 140, 0, ${alpha})`);
            gradient.addColorStop(0.5, `rgba(255, 60, 0, ${alpha * 0.7})`);
            gradient.addColorStop(1, `rgba(255, 220, 0, 0)`);

            ctx.fillStyle = gradient;
            ctx.beginPath();
            ctx.moveTo(x - 3, baseY);
            ctx.quadraticCurveTo(tipX + 4, baseY - height * 0.4, tipX, tipY);
            ctx.quadraticCurveTo(tipX - 4, baseY - height * 0.4, x + 3, baseY);
            ctx.closePath();
            ctx.fill();
        }

        // Draw lava body on top of flames
        for (let x = pool.leftEdge; x <= pool.rightEdge; x++) {
            const terrainY = terrain.getHeightAt(x);

            // Lava body (8px thick)
            ctx.fillStyle = `rgba(255, 80, 0, ${pulse * 0.9})`;
            ctx.fillRect(x, terrainY - lavaThickness, 1, lavaThickness);

            // Bright molten highlight (top 2px)
            ctx.fillStyle = `rgba(255, 200, 50, ${pulse * 0.95})`;
            ctx.fillRect(x, terrainY - lavaThickness, 1, 2);
        }
    }

    drawDamageNumber(x, y, damage, frame) {
        const alpha = 1 - (frame / 60);
        const offsetY = frame * 0.5;

        this.ctx.font = UI_FONT;
        this.ctx.fillStyle = `rgba(255, 0, 0, ${alpha})`;
        this.ctx.textAlign = 'center';
        this.ctx.fillText(`-${damage}`, x, y - offsetY);
    }
}
