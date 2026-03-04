# Napalm Weapon Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Add a "Napalm" weapon (key 5) that creates a spreading lava pool on impact, dealing tick-based damage capped at 34 HP per contact exposure, requiring 3 separate contacts to kill a full-health tank.

**Architecture:** Column-based lava pool tracks left/right spread edges advancing along terrain per-frame. Per-tank contact state tracks inContact + damageDealt to enforce the 34 HP per-exposure cap. Pool is created on napalm impact and cleared at nextTurn().

**Tech Stack:** Vanilla JavaScript, HTML5 Canvas. No test framework — verification is done by running the game in the browser (open index.html). Use browser console for debug logging.

---

## Reference: Design Doc

Full design at `docs/plans/2026-03-03-napalm-design.md`. Read it before starting.

## Key Files

- `js/constants.js` — all game constants and weapon definitions
- `js/physics.js` — Projectile, Explosion classes (add LavaPool here)
- `js/weapons.js` — WeaponSystem.applyDamage()
- `js/game.js` — Game class, update loop, handleProjectileImpact, nextTurn
- `js/renderer.js` — Renderer class drawing methods
- `js/main.js` — render() function (draw order matters)
- `js/input.js` — InputHandler.update() weapon key handling
- `js/ui.js` — drawTopBar() weapon hint text

---

### Task 1: Add NAPALM constants

**Files:**
- Modify: `js/constants.js`

**Step 1: Add NAPALM weapon type to WEAPON_TYPES**

In `js/constants.js`, find the `WEAPON_TYPES` block (around line 25) and add NAPALM:

```javascript
const WEAPON_TYPES = {
    SIMPLE: 0,
    CLUSTER: 1,
    BOUNCING: 2,
    ROLLING: 3,
    NAPALM: 4
};
```

**Step 2: Add NAPALM entry to WEAPONS**

Find the `WEAPONS` const (around line 33) and add after the ROLLING entry:

```javascript
    [WEAPON_TYPES.NAPALM]: {
        name: 'Napalm',
        impactDamage: 0,
        splashRadius: 0
    }
```

**Step 3: Add lava constants**

After the `WEAPONS` block, add:

```javascript
// Lava pool constants (Napalm weapon)
const LAVA_MAX_SPREAD = 60;         // max px from impact center in each direction
const LAVA_SPREAD_RATE = 2;         // px per frame the pool spreads
const LAVA_DAMAGE_PER_FRAME = 1;    // HP dealt per frame while tank is in contact
const LAVA_MAX_CONTACT_DAMAGE = 34; // max HP per single contact exposure
```

**Step 4: Verify constants load without errors**

Open `index.html` in the browser. Open DevTools console. Should see no errors. The game should start normally. Type `WEAPON_TYPES.NAPALM` in console — should return `4`. Type `LAVA_MAX_SPREAD` — should return `60`.

**Step 5: Commit**

```bash
git add js/constants.js
git commit -m "feat: add NAPALM weapon type and lava constants"
```

---

### Task 2: Add LavaPool class and NAPALM projectile data

**Files:**
- Modify: `js/physics.js`

**Step 1: Add LavaPool class**

At the end of `js/physics.js` (after the `Explosion` class, before the closing of the file), add:

```javascript
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
```

**Step 2: Add NAPALM case to getImpactData()**

In the `Projectile` class, find the `getImpactData()` method (around line 221). Add a NAPALM case inside the switch block, before the `default`:

```javascript
            case WEAPON_TYPES.NAPALM:
                return {
                    damage: 0,
                    splashRadius: 0,
                    splashDamage: 0,
                    isNapalm: true
                };
```

**Step 3: Verify no errors**

Open DevTools console, reload. No errors. Type `new LavaPool(300, game.terrain)` in console while a game is running — should create an object with `leftEdge: 300, rightEdge: 300`.

**Step 4: Commit**

```bash
git add js/physics.js
git commit -m "feat: add LavaPool class and NAPALM projectile impact data"
```

---

### Task 3: Update WeaponSystem for NAPALM

**Files:**
- Modify: `js/weapons.js`

**Step 1: Add NAPALM guard in applyDamage**

In `js/weapons.js`, find `WeaponSystem.applyDamage()`. The current crater creation block near the end looks like:

```javascript
        // Create crater
        if (impactData.splashRadius > 0) {
            terrain.createCrater(impactX, impactData.splashRadius);
        }
```

This already handles NAPALM correctly (splashRadius=0 means no crater). But we need to ensure `isNapalm` is forwarded in the return value. Update the return statement:

```javascript
        return {
            totalDamage,
            damageReport,
            impactX,
            impactY,
            radius: impactData.splashRadius,
            isNapalm: impactData.isNapalm || false
        };
```

**Step 2: Verify**

Reload browser. No errors. Game works normally.

**Step 3: Commit**

```bash
git add js/weapons.js
git commit -m "feat: forward isNapalm flag through WeaponSystem.applyDamage"
```

---

### Task 4: Integrate LavaPool into Game class

**Files:**
- Modify: `js/game.js`

**Step 1: Initialize lavaPools array in constructor**

In the `Game` constructor (around line 5), add after `this.damageNumbers = []`:

```javascript
        this.lavaPools = [];
```

**Step 2: Clear lavaPools in setupGame()**

In `setupGame()` (around line 112), add after `this.damageNumbers = []`:

```javascript
        this.lavaPools = [];
```

**Step 3: Create LavaPool on NAPALM impact**

In `handleProjectileImpact()` (around line 325), the method currently creates an explosion. Add LavaPool creation after the explosion block:

```javascript
    handleProjectileImpact(projectile) {
        // Apply damage
        const result = WeaponSystem.applyDamage(projectile, this.tanks, this.terrain);

        // Create explosion effect (only for non-napalm impacts with a radius)
        if (result.radius > 0) {
            const explosion = new Explosion(result.impactX, result.impactY, result.radius);
            this.explosions.push(explosion);
        }

        // Create lava pool for napalm
        if (result.isNapalm) {
            const pool = new LavaPool(result.impactX, this.terrain);
            this.lavaPools.push(pool);
        }

        // Create damage numbers
        for (const report of result.damageReport) {
            const tank = this.tanks[report.tankId];
            this.damageNumbers.push({
                x: tank.x,
                y: tank.y,
                damage: report.damage,
                frame: 0
            });
        }
    }
```

**Step 4: Update lavaPools and apply damage in update()**

In `update()`, find the section that updates explosions (around line 276). Add lava pool update block immediately after the explosions block:

```javascript
        // Update lava pools and apply damage
        for (let i = this.lavaPools.length - 1; i >= 0; i--) {
            const pool = this.lavaPools[i];
            pool.update();

            for (const tank of this.tanks) {
                if (!tank.isAlive) continue;
                const dmg = pool.applyDamageTo(tank);
                if (dmg > 0) {
                    this.damageNumbers.push({
                        x: tank.x,
                        y: tank.y - 15,
                        damage: dmg,
                        frame: 0
                    });
                }
            }
        }
```

**Step 5: Clear lavaPools in nextTurn()**

In `nextTurn()` (around line 347), add at the very start of the method body:

```javascript
        // Clear lava pools at end of turn
        this.lavaPools = [];
```

**Step 6: Clear lavaPools in returnToMenu()**

In `returnToMenu()` (around line 409), add after `this.damageNumbers = []`:

```javascript
        this.lavaPools = [];
```

**Step 7: Verify in browser**

Start a local game. Select weapon 5 (we haven't added the key yet, so temporarily test by opening console and running `game.getCurrentTank().setWeapon(4)` then fire via space). After firing, check `game.lavaPools` in console — should have one pool with leftEdge/rightEdge values. Wait 1 second — pool should be cleared after turn ends.

**Step 8: Commit**

```bash
git add js/game.js
git commit -m "feat: integrate LavaPool into game update loop and turn lifecycle"
```

---

### Task 5: Render lava pools

**Files:**
- Modify: `js/renderer.js`
- Modify: `js/main.js`

**Step 1: Add drawLavaPool() to Renderer**

In `js/renderer.js`, add this method after `drawExplosion()`:

```javascript
    drawLavaPool(pool, terrain) {
        const ctx = this.ctx;
        const pulse = 0.6 + 0.4 * Math.sin(Date.now() / 150);

        for (let x = pool.leftEdge; x <= pool.rightEdge; x++) {
            const terrainY = terrain.getHeightAt(x);

            // Lava body (4px tall strip on terrain surface)
            ctx.fillStyle = `rgba(255, 80, 0, ${pulse * 0.85})`;
            ctx.fillRect(x, terrainY - 4, 1, 4);

            // Bright core highlight (top 1px)
            ctx.fillStyle = `rgba(255, 200, 50, ${pulse * 0.9})`;
            ctx.fillRect(x, terrainY - 4, 1, 1);
        }
    }
```

**Step 2: Call drawLavaPool in render() loop in main.js**

In `js/main.js`, find the `render()` function. After `renderer.drawTerrain(game.terrain)` and before the tanks loop, add:

```javascript
    // Draw lava pools (above terrain, below tanks)
    for (const pool of game.lavaPools) {
        renderer.drawLavaPool(pool, game.terrain);
    }
```

The render order in render() should be:
1. `drawSky()`
2. `drawTerrain()`
3. **`drawLavaPool()` ← new, insert here**
4. `drawTank()` loop
5. `drawProjectile()` loop
6. `drawExplosion()` loop
7. `drawDamageNumber()` loop
8. HUD / UI

**Step 3: Verify visually**

Fire a napalm shot (use console workaround from Task 4 Step 7). After impact you should see:
- An orange/red glowing stripe appear at the impact site
- The stripe slowly spreads outward along the terrain surface
- The stripe pulses (alpha oscillates)
- After ~1 second the stripe disappears (turn ends)

**Step 4: Commit**

```bash
git add js/renderer.js js/main.js
git commit -m "feat: render lava pools as pulsing orange stripe on terrain"
```

---

### Task 6: Wire up input and UI

**Files:**
- Modify: `js/input.js`
- Modify: `js/ui.js`

**Step 1: Add key '5' for NAPALM in input.js**

In `js/input.js`, find the weapon selection block (around line 84). After the key '4' block, add:

```javascript
        if (this.keys['5']) {
            currentTank.setWeapon(WEAPON_TYPES.NAPALM);
            this.keys['5'] = false;
        }
```

**Step 2: Update weapon key hint in ui.js**

In `js/ui.js`, find `drawTopBar()` (around line 192). Find the line:

```javascript
        ctx.fillText('[1/2/3/4] to change weapon', GAME_WIDTH / 2, 50);
```

Change it to:

```javascript
        ctx.fillText('[1-5] to change weapon', GAME_WIDTH / 2, 50);
```

**Step 3: Verify full weapon flow**

Start a local game. Press `5` — the HUD top bar should now show "Napalm" as the selected weapon. Aim and press Space to fire. After impact:
- No explosion visual (no crater)
- Orange lava pool appears and spreads along terrain
- Damage numbers appear if a tank is caught in the pool
- Pool disappears after ~1 second when turn ends

**Step 4: Commit**

```bash
git add js/input.js js/ui.js
git commit -m "feat: add key 5 for Napalm selection and update weapon hint"
```

---

### Task 7: End-to-end verification

No code changes. Manual verification checklist.

**Step 1: Test projectile behavior**
- Fire Napalm at open terrain: no explosion circle, no crater in terrain
- Fire Napalm at a tank's location: lava pool appears but no instant-kill (tank takes tick damage)

**Step 2: Test lava spreading**
- Fire at flat terrain: pool spreads symmetrically left and right
- Fire near a hill: pool should spread downhill but stop where terrain rises
- Fire into a valley: pool should fill the valley shape
- Verify pool never exceeds ~120px total width (60px each direction)

**Step 3: Test damage cap per contact**
- Set up a game with 2 players (you vs Easy AI)
- Fire Napalm so the enemy tank is in the lava pool
- Watch health bar — it should drop by no more than 34 HP from that pool
- Pool disappears at turn end

**Step 4: Test 3-contact kill**
- Fire Napalm at the same enemy tank 3 times (3 turns)
- After 3rd pool expires, enemy should be dead (100 HP - 3×34 = -2 HP, dead)
- Enemy may die mid-3rd exposure once cumulative damage exceeds 100 HP

**Step 5: Test turn cleanup**
- Confirm lava pool is gone when the next turn begins
- Confirm firing other weapons after Napalm works normally

**Step 6: Test edge cases**
- Fire Napalm off the edge of the map (should hit terrain or fall off)
- Fire at map edge: pool should not spread past x=0 or x=GAME_WIDTH
- Tank walks into lava, then explosion pushes tank out of pool and back in — should reset 34 HP cap for the re-entry

**Step 7: Final commit (if no issues found)**

```bash
git add .
git commit -m "feat: complete Napalm weapon implementation"
```

If issues are found, fix them and commit fixes before this final commit.

---

## Summary of Commits

1. `feat: add NAPALM weapon type and lava constants`
2. `feat: add LavaPool class and NAPALM projectile impact data`
3. `feat: forward isNapalm flag through WeaponSystem.applyDamage`
4. `feat: integrate LavaPool into game update loop and turn lifecycle`
5. `feat: render lava pools as pulsing orange stripe on terrain`
6. `feat: add key 5 for Napalm selection and update weapon hint`
7. `feat: complete Napalm weapon implementation`
