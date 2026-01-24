// AI decision-making system

class AI {
    static makeDecision(aiTank, targetTank, difficulty) {
        if (!targetTank || !aiTank) return null;

        const dx = targetTank.x - aiTank.x;
        const dy = targetTank.y - aiTank.y;
        const dist = distance(aiTank.x, aiTank.y, targetTank.x, targetTank.y);

        // Base angle calculation
        const baseAngle = Math.atan2(-dy, dx) * (180 / Math.PI);

        // Add arc compensation for distance
        const distanceFactor = dist / 500;
        let estimatedAngle = baseAngle + (distanceFactor * 15);

        // Ensure angle is within bounds (0-180)
        estimatedAngle = clamp(estimatedAngle, 0, 180);

        // Power based on distance
        let estimatedPower = Math.min((dist / 800) * 100, 100);
        estimatedPower = Math.max(estimatedPower, MIN_POWER_THRESHOLD);

        // Get error margins based on difficulty
        const errorMargins = AI_ERROR_MARGINS[difficulty] || AI_ERROR_MARGINS[AI_DIFFICULTY.EASY];

        // Add random error
        const angleError = randomRange(-errorMargins.angle, errorMargins.angle);
        const powerError = randomRange(-errorMargins.power, errorMargins.power);

        let finalAngle = clamp(estimatedAngle + angleError, 0, 180);
        let finalPower = clamp(estimatedPower + powerError, MIN_POWER_THRESHOLD, 100);

        // Choose weapon (Hard AI chooses strategically)
        let weapon = WEAPON_TYPES.SIMPLE;

        if (difficulty === AI_DIFFICULTY.HARD) {
            // Use cluster bomb for medium-long range
            if (dist > 300 && dist < 700) {
                weapon = WEAPON_TYPES.CLUSTER;
            }
            // Use bouncing round if target is behind cover (very basic check)
            else if (Math.abs(dy) > 100) {
                weapon = WEAPON_TYPES.BOUNCING;
            }
        } else if (difficulty === AI_DIFFICULTY.NORMAL) {
            // Randomly choose weapon occasionally
            if (Math.random() < 0.3) {
                weapon = randomInt(0, 2);
            }
        }

        return {
            angle: finalAngle,
            power: finalPower,
            weapon: weapon
        };
    }

    static findBestTarget(aiTank, allTanks) {
        let bestTarget = null;
        let closestDistance = Infinity;

        for (const tank of allTanks) {
            if (!tank.isAlive || tank.id === aiTank.id) continue;

            const dist = distance(aiTank.x, aiTank.y, tank.x, tank.y);
            if (dist < closestDistance) {
                closestDistance = dist;
                bestTarget = tank;
            }
        }

        return bestTarget;
    }

    static async executeTurn(aiTank, allTanks, callback) {
        // Add thinking delay for realism
        const thinkingDelay = randomRange(800, 1500);

        await new Promise(resolve => setTimeout(resolve, thinkingDelay));

        const target = AI.findBestTarget(aiTank, allTanks);
        if (!target) {
            callback(null);
            return;
        }

        const decision = AI.makeDecision(aiTank, target, aiTank.aiDifficulty);

        if (decision) {
            // Apply decision to tank
            aiTank.angle = decision.angle;
            aiTank.power = decision.power;
            aiTank.selectedWeapon = decision.weapon;

            // Small delay before firing
            await new Promise(resolve => setTimeout(resolve, 300));

            callback(decision);
        } else {
            callback(null);
        }
    }
}
