// Weapon system - handles damage application

class WeaponSystem {
    static applyDamage(projectile, tanks, terrain) {
        const impactData = projectile.getImpactData();
        const impactX = Math.floor(projectile.x);
        const impactY = Math.floor(projectile.y);

        let totalDamage = 0;
        const damageReport = [];

        // Check direct hits first
        for (const tank of tanks) {
            if (!tank.isAlive) continue;

            if (tank.checkHit(impactX, impactY)) {
                // Direct hit
                const damage = tank.takeDamage(impactData.damage);
                totalDamage += damage;
                damageReport.push({
                    tankId: tank.id,
                    damage: damage,
                    type: 'direct'
                });
            }
        }

        // Apply splash damage
        if (impactData.splashRadius > 0) {
            for (const tank of tanks) {
                if (!tank.isAlive) continue;

                const dist = tank.checkSplashDamage(impactX, impactY, impactData.splashRadius);
                if (dist >= 0) {
                    const splashDmg = calculateSplashDamage(impactData.splashDamage, dist, impactData.splashRadius);
                    if (splashDmg > 0) {
                        const damage = tank.takeDamage(Math.floor(splashDmg));
                        totalDamage += damage;

                        // Check if already hit directly
                        const existingReport = damageReport.find(r => r.tankId === tank.id);
                        if (existingReport) {
                            existingReport.damage += damage;
                            existingReport.type = 'direct+splash';
                        } else {
                            damageReport.push({
                                tankId: tank.id,
                                damage: damage,
                                type: 'splash'
                            });
                        }
                    }
                }
            }
        }

        // Create crater
        if (impactData.splashRadius > 0) {
            terrain.createCrater(impactX, impactData.splashRadius);
        }

        return {
            totalDamage,
            damageReport,
            impactX,
            impactY,
            radius: impactData.splashRadius,
            isNapalm: impactData.isNapalm || false
        };
    }
}
