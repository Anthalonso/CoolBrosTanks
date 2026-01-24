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

    drawDamageNumber(x, y, damage, frame) {
        const alpha = 1 - (frame / 60);
        const offsetY = frame * 0.5;

        this.ctx.font = UI_FONT;
        this.ctx.fillStyle = `rgba(255, 0, 0, ${alpha})`;
        this.ctx.textAlign = 'center';
        this.ctx.fillText(`-${damage}`, x, y - offsetY);
    }
}
