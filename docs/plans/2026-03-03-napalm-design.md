# Napalm Weapon — Design Document
Date: 2026-03-03

## Overview

Add a new "Napalm" weapon (weapon slot 5) to CoolBrosTanks. Unlike existing weapons, Napalm deals no damage on impact. Instead it releases a spreading lava pool at the impact site that persists until end of turn, dealing tick damage to tanks caught inside it.

## Gameplay Specification

- **Weapon key**: `5`
- **Projectile**: Standard ballistic trajectory (same physics as Simple shot)
- **Impact**: No direct damage, no crater
- **Effect**: Creates a LavaPool at the impact X coordinate
- **Lava spread**: Flows outward along terrain at 2px/frame, following gravity (only spreads to same-level or lower terrain). Max 60px each direction = 120px total pool width = 5% of the 1200px map
- **Damage model**: 1 HP/frame while a tank is in contact, capped at 34 HP cumulative per contact exposure. Exiting and re-entering the pool resets the cap, beginning a new exposure.
- **Kill requirement**: A full-health tank (100 HP) requires at least 3 separate contact exposures to die (3 × 34 = 102 HP total)
- **Duration**: Lava pool is destroyed when `nextTurn()` is called (~1 second after all projectiles settle)
- **Visual**: Glowing orange/red stripe rendered on terrain surface with pulsing alpha

## Architecture

### New Constants (constants.js)

```
WEAPON_TYPES.NAPALM = 4

WEAPONS[4] = {
  name: 'Napalm',
  impactDamage: 0,
  splashRadius: 0
}

LAVA_MAX_SPREAD = 60          // px from impact center in each direction
LAVA_SPREAD_RATE = 2          // px per frame spread speed
LAVA_DAMAGE_PER_FRAME = 1     // HP per frame while in contact
LAVA_MAX_CONTACT_DAMAGE = 34  // HP cap per contact exposure per tank
```

### New Class: LavaPool (physics.js)

Added alongside existing `Projectile` and `Explosion` classes.

**State:**
- `impactX` — center of pool
- `leftEdge`, `rightEdge` — current spread boundaries
- `isActive` — cleared when pool is destroyed
- `tankStates[tankId]` — per-tank `{ inContact: bool, damageDealt: number }`

**`update(terrain)`**
Each frame: advance `leftEdge` left by `LAVA_SPREAD_RATE` if within max spread AND next terrain height >= current edge height (flows downhill or level, stops uphill). Mirror logic for `rightEdge`.

**`isTankInPool(tank)`**
Returns true if tank's horizontal footprint overlaps `[leftEdge, rightEdge]` and tank's bottom Y is within 5px of terrain surface (tolerance for standing tanks).

**`applyDamageTo(tank)`**
- Initialises `tankStates[tank.id]` on first call
- If tank not in pool and was previously in contact: reset `inContact=false, damageDealt=0`
- If tank is in pool and `damageDealt < LAVA_MAX_CONTACT_DAMAGE`: deal `LAVA_DAMAGE_PER_FRAME` HP, increment `damageDealt`
- Returns actual damage dealt this frame (0 if cap reached or not in pool)

### Weapon Impact (weapons.js → WeaponSystem.applyDamage)

Add NAPALM check: skip crater creation, skip splash damage, return `isNapalm: true` in result.

### Game State (game.js)

- Add `this.lavaPools = []` to constructor, `setupGame()`, and `returnToMenu()`
- `handleProjectileImpact()`: if `result.isNapalm`, push `new LavaPool(impactX, this.terrain)`
- `update()`: for each lavaPool — call `pool.update(terrain)`, then for each alive tank call `pool.applyDamageTo(tank)` and accumulate damage numbers
- `nextTurn()`: `this.lavaPools = []`

### Rendering (renderer.js + main.js)

**`renderer.drawLavaPool(pool, terrain)`**
- For each column from `pool.leftEdge` to `pool.rightEdge`:
  - Get terrain height at column
  - Draw a 4px-tall filled rectangle at `(x, terrainY - 4)` with pulsing orange/red color
- Pulsing: `alpha = 0.6 + 0.4 * Math.sin(Date.now() / 150)`
- Color: `rgba(255, 80, 0, alpha)` with a brighter core highlight

**main.js render order**: draw lava pools after terrain, before tanks (so tanks appear on top of lava).

### Input (input.js)

Add key `'5'` → `currentTank.setWeapon(WEAPON_TYPES.NAPALM)`.

### UI (ui.js)

Update weapon key hint string from `[1/2/3/4] to change weapon` to `[1-5] to change weapon`.

## Contact Tracking Flow

```
Frame N: tank enters lava pool
  → inContact = true, damageDealt = 0
  → deal 1 HP, damageDealt = 1

Frames N+1 to N+33: tank remains in pool
  → deal 1 HP/frame, damageDealt reaches 34

Frame N+34+: cap reached
  → deal 0 HP (tank safe until it leaves)

Tank exits pool (e.g. blown away by explosion):
  → inContact = false, damageDealt = 0

Tank re-enters same pool:
  → new exposure, damageDealt starts at 0 again
  → up to 34 more HP

Turn ends → pool destroyed → all tankStates cleared
```

## Files Modified

| File | Change Type |
|------|-------------|
| `js/constants.js` | Add NAPALM weapon type, weapon entry, 4 lava constants |
| `js/physics.js` | Add LavaPool class; NAPALM case in getImpactData() |
| `js/weapons.js` | NAPALM branch: skip crater, return isNapalm flag |
| `js/game.js` | lavaPools array; update/damage loop; clear at nextTurn |
| `js/renderer.js` | Add drawLavaPool() method |
| `js/main.js` | Call drawLavaPool in render loop (after terrain, before tanks) |
| `js/input.js` | Key '5' → NAPALM weapon selection |
| `js/ui.js` | Update weapon key hint text |

## Out of Scope

- Lava flowing around terrain obstacles (lava stops at uphill terrain)
- AI strategy changes for Napalm (weapon is available but AI selection logic unchanged)
- Lava persisting between turns
- Lava destroying terrain
