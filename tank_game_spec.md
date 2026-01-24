# Tank Artillery Game - Technical Specification

## Project Overview
A web-based 2D turn-based artillery game inspired by Scorched Earth. Players control tanks and must destroy opponents using physics-based projectile weapons.

## Technical Requirements

### Platform
- **Technology**: HTML5 Canvas with vanilla JavaScript
- **Resolution**: 1200x600 pixels (responsive)
- **Target**: Modern web browsers

### Canvas Setup
```javascript
// Base resolution (internal game coordinates)
const GAME_WIDTH = 1200;
const GAME_HEIGHT = 600;

// Responsive scaling implementation
let scale = 1;
let offsetX = 0;
let offsetY = 0;

function resizeCanvas() {
    const canvas = document.getElementById('gameCanvas');
    const container = canvas.parentElement;

    // Calculate scale to fit container while maintaining aspect ratio
    const scaleX = container.clientWidth / GAME_WIDTH;
    const scaleY = container.clientHeight / GAME_HEIGHT;
    scale = Math.min(scaleX, scaleY);

    // Set canvas display size
    canvas.style.width = (GAME_WIDTH * scale) + 'px';
    canvas.style.height = (GAME_HEIGHT * scale) + 'px';

    // Center canvas if container is larger
    offsetX = (container.clientWidth - GAME_WIDTH * scale) / 2;
    offsetY = (container.clientHeight - GAME_HEIGHT * scale) / 2;
}

// Input coordinate transformation
function screenToGameCoords(screenX, screenY) {
    return {
        x: (screenX - offsetX) / scale,
        y: (screenY - offsetY) / scale
    };
}

// Minimum supported resolution: 800x400
// Game pauses during resize to prevent physics glitches
```

## Game Mechanics

### Core Gameplay Loop
1. Game starts with 2-8 tanks placed on terrain
2. Players take turns in sequence
3. Each turn: adjust angle (0-180°) and power (0-100%)
4. Fire projectile with selected weapon type
5. Physics simulation runs until projectile settles
6. Apply damage and terrain destruction
7. Check for falling tanks and apply fall damage
8. Check win condition (only one team remaining)
9. Next player's turn

### Tank Properties
- **Health**: 100 HP (starts full)
- **Position**: Fixed X coordinate, Y adjusts with terrain
- **Angle**: 0-180 degrees (0 = right, 90 = up, 180 = left)
- **Power**: 0-100%
- **Size**: ~32x24 pixels (tank body) + barrel
- **Colors**: Assign different flat colors per tank (red, blue, green, yellow, purple, orange, cyan, pink)

### Weapon Types

#### 1. Simple Shot
- **Damage**: 50 HP direct hit
- **Splash Radius**: Small (40 pixels)
- **Splash Damage**: 30 HP at center, linear falloff
- **Special**: Standard ballistic projectile with moderate area damage
- **Physics**: Basic gravity-affected trajectory

#### 2. Cluster Bomb
- **Initial Impact**: 5 HP
- **Splits Into**: 5 sub-projectiles on impact or at apex
- **Sub-projectile Damage**: 10 HP each direct hit
- **Sub-projectile Splash**: 5 HP (20 pixel radius per sub-projectile)
- **Total Max Damage**: 55 HP (if all sub-projectiles hit)
- **Splash Radius**: Medium (50 pixels for sub-projectiles)
- **Physics**: Main projectile follows ballistic arc, splits mid-flight, sub-projectiles scatter with random velocities

#### 3. Bouncing Round
- **Damage**: 30 HP per hit
- **Splash Radius**: Small (30 pixels)
- **Splash Damage**: 20 HP at center, linear falloff
- **Bounces**: Maximum 3 bounces
- **Physics**: Bounces off terrain with velocity reduction (0.7x per bounce), loses energy each bounce
- **Note**: Difficult to use but high total damage potential (90 HP max if all 3 bounces hit same target)

### Damage System

#### Direct Hit Damage
- Applied when projectile collides with tank hitbox
- Uses weapon-specific damage value

#### Splash Damage
- Applied to all tanks within splash radius from explosion center
- Damage = Full damage at epicenter, linear falloff to 0 at edge of radius
- Formula: `damage * (1 - distance/radius)`

#### Fall Damage
- Applied when tank falls due to terrain destruction
- **Rate**: 5 HP per 10 pixels fallen
- **Maximum**: 40 HP (caps at 80 pixel fall)
- **Calculation**: Track tank Y position before/after terrain update
- **Threshold**: Minimum 10 pixels fall to trigger damage
- **Formula**: `Math.min(Math.floor(pixelsFallen / 10) * 5, 40)`

### Physics Engine

#### Projectile Motion
```javascript
// Initial velocity calculation
const radians = angle * (Math.PI / 180);
const velocityX = Math.cos(radians) * power * MAX_VELOCITY;
const velocityY = -Math.sin(radians) * power * MAX_VELOCITY;

// Each frame update (using fixed timestep for consistency)
velocityY += GRAVITY * FIXED_TIME_STEP;
x += velocityX * FIXED_TIME_STEP;
y += velocityY * FIXED_TIME_STEP;
```

#### Constants
```javascript
const GRAVITY = 0.5; // pixels per frame^2
const MAX_VELOCITY = 15; // maximum initial velocity
const BOUNCE_DAMPING = 0.7; // velocity multiplier after bounce
const FIXED_TIME_STEP = 1/60; // 60 FPS target for consistent physics
const PROJECTILE_MAX_LIFETIME = 10; // seconds before auto-despawn
const MIN_POWER_THRESHOLD = 5; // minimum power % to prevent accidental 0% shots
```

#### Collision Detection
- **Terrain**: Check if projectile Y-coordinate >= terrainHeights[projectile.x]
  - Simple and efficient: O(1) lookup per frame
  - More accurate than pixel-perfect for performance
- **Tank**: Bounding box collision (rectangular hitbox)
  - Tank hitbox: 32x24 pixels centered on tank position
  - Check if projectile point is inside rectangle
- **Bounce**: Reverse velocity component perpendicular to surface, apply damping
  - Simplified: reverse velocityY for terrain bounces
- **Boundaries**:
  - Projectile despawns if X < 0 or X > GAME_WIDTH
  - Projectile despawns if Y > GAME_HEIGHT (fell off bottom)
  - Projectile despawns after PROJECTILE_MAX_LIFETIME seconds

## Coordinate System

### Canvas Coordinates
```
(0,0) -------- X+ --------> (1200,0)
  |
  Y+
  |
  v
(0,600) ----------------> (1200,600)
```

- **Origin**: Top-left corner (0, 0)
- **X-axis**: Increases left to right (0 to 1200)
- **Y-axis**: Increases top to bottom (0 to 600)
- **Terrain heights**: Stored as Y-coordinates
  - Lower Y values = terrain is higher on screen (closer to sky)
  - Higher Y values = terrain is lower on screen (closer to bottom)
- **Projectile motion**: Positive velocityY moves projectile DOWN (gravity adds to velocityY)
- **Tank positions**: Tank.y represents the TOP of the tank

### Important Implications
- Craters INCREASE terrain Y values (move terrain down)
- Tanks fall when their Y position is LESS than terrain Y at their X position
- Gravity is ADDED to velocityY (positive gravity pulls down)

## Terrain System

### Map Generation
- **5 Preset Maps**: Each with unique terrain profile
- **Generation**: Use mathematical functions or preset point arrays

#### Map Types
1. **Flat Plains**: Height variance 0-50px, mostly horizontal
2. **Rolling Hills**: Gentle sine waves, 50-150px variance
3. **Mountain Range**: Sharp peaks, 200-400px variance
4. **Canyon**: Two high sides with low middle
5. **Plateau**: Flat top with steep sides

#### Terrain Rendering
```javascript
// Store terrain as array of heights (Y-coordinate from top of canvas)
// Lower Y values = higher terrain (Y=0 is top of screen)
// Higher Y values = lower terrain (Y=600 is bottom of screen)
const terrainHeights = new Array(GAME_WIDTH);
// Fill based on map type
// Render as filled polygon from bottom of screen to terrain height
```

### Terrain Destruction
- **Crater Formation**: On explosion, remove circular area of terrain
- **Crater Radius**: Matches splash radius of weapon
- **Implementation**: Set terrain heights to 0 (or lower) within crater radius
- **Tank Updates**: After terrain change, update all tank Y positions to rest on new terrain

#### Crater Algorithm
```javascript
// For each x coordinate in crater radius
// Creates a hemispherical crater (increases Y values to move terrain down)
for (let x = centerX - radius; x <= centerX + radius; x++) {
    if (x < 0 || x >= GAME_WIDTH) continue; // Boundary check
    const distance = Math.abs(x - centerX);
    if (distance <= radius) {
        const craterDepth = Math.sqrt(radius * radius - distance * distance);
        // Increase Y to lower terrain (Y=0 is top, Y=600 is bottom)
        terrainHeights[x] = Math.min(terrainHeights[x] + craterDepth, GAME_HEIGHT);
    }
}
```

### Tank Positioning
- **Spawn**: Random X coordinates, at least 100px apart
  - If spawn positions would overlap, re-roll all positions
  - Keep tanks at least 50px from screen edges
  - Maximum 10 attempts to find valid positions before using fallback (evenly spaced)
- **Y Position**: Always sits on terrain surface (Y = terrainHeights[tank.x] - tank.height)
- **Falling**: When terrain destroyed beneath tank, apply gravity until tank lands on new terrain surface
  - Check every frame if tank.y + tank.height < terrainHeights[tank.x]
  - If true, apply gravity and move tank down
  - Track fall distance for damage calculation

## AI System

### Difficulty Levels

#### Easy AI
- **Strategy**: Random angle and power with large variance
- **Angle**: ±30 degrees from approximate target direction
- **Power**: ±40% from estimated needed power
- **Delay**: 1-2 second "thinking" delay for realism

#### Normal AI
- **Strategy**: Calculate trajectory to target with moderate error
- **Calculation**: Solve projectile motion equations for target
- **Error Margin**: ±10 degrees angle, ±20% power
- **Adaptation**: 50% chance to adjust based on previous shot

#### Hard AI
- **Strategy**: Accurate trajectory calculation
- **Calculation**: Precise physics-based targeting
- **Error Margin**: ±3 degrees angle, ±10% power
- **Adaptation**: Learns from missed shots, adjusts for wind if implemented
- **Weapon Selection**: Chooses optimal weapon for situation

### AI Targeting Algorithm
```javascript
// NOTE: This is a simplified approximation for AI targeting.
// Actual ballistic trajectory requires solving the projectile motion equation:
// y = y₀ + x·tan(θ) - (g·x²)/(2·v²·cos²(θ))
// For production, use numerical methods or lookup tables for accuracy.

// Simplified targeting for gameplay purposes
const dx = targetX - tankX;
const dy = targetY - tankY;
const distance = Math.sqrt(dx*dx + dy*dy);

// Rough approximation: aim higher for longer distances
const baseAngle = Math.atan2(-dy, dx) * (180 / Math.PI);
const distanceFactor = distance / 500; // Adjust arc based on distance
const estimatedAngle = baseAngle + (distanceFactor * 15); // Add arc compensation

// Power based on distance
const estimatedPower = Math.min((distance / 800) * 100, 100);

// Add difficulty-based error
const finalAngle = estimatedAngle + randomError(difficulty);
const finalPower = Math.max(MIN_POWER_THRESHOLD, estimatedPower + randomError(difficulty));
```

## Controls

### Keyboard Input
- **Left Arrow**: Decrease angle (by 1 degree per press, hold for continuous)
- **Right Arrow**: Increase angle (by 1 degree per press, hold for continuous)
- **Down Arrow**: Decrease power (by 1% per press, hold for continuous)
- **Up Arrow**: Increase power (by 1% per press, hold for continuous)
- **Space Bar**: Fire weapon (only when power >= MIN_POWER_THRESHOLD)
- **1/2/3 Keys**: Select weapon type (1=Simple, 2=Cluster, 3=Bouncing)
- **T Key**: Toggle trajectory preview (optional feature)
- **P Key**: Pause/unpause game
- **Enter**: Confirm selections/advance menus
- **ESC**: Return to menu (with confirmation)

### Visual Feedback
- Display current angle and power numerically on screen
- Show trajectory preview (optional, dotted line showing estimated arc)
- Highlight current tank
- Show selected weapon type

## Visual Design

### Color Scheme

#### Tanks
- **Player 1**: Red (#FF0000)
- **Player 2**: Blue (#0000FF)
- **Player 3**: Green (#00FF00)
- **Player 4**: Yellow (#FFFF00)
- **Player 5**: Purple (#800080)
- **Player 6**: Orange (#FFA500)
- **Player 7**: Cyan (#00FFFF)
- **Player 8**: Pink (#FFC0CB)

#### Environment
- **Sky**: Blue gradient (#87CEEB to #4A90E2)
- **Clouds**: White (#FFFFFF) with transparency, optional
- **Terrain**: Brown (#8B4513), Green (#228B22), or Black (#2C2C2C) based on map theme
- **UI Background**: Semi-transparent dark grey (#00000088)

#### Effects
- **Explosions**: Orange/red expanding circles (#FF6600, #FF0000)
- **Projectiles**: Small white/yellow circles (#FFFF00)
- **Damage Numbers**: Red text floating up from impact

### Tank Rendering
```
Simple flat design:
- Body: Rounded rectangle (tank color)
- Barrel: Line/rectangle extending from turret at current angle
- Health Bar: Green-to-red bar above tank
- Player indicator: Small number/letter above health bar
```

### UI Layout
```
Top Bar:
- Current Player indicator (left)
- Current Weapon (center)
- Angle and Power display (right)

During Turn:
- Show controls guide at bottom
- Highlight active tank
- Show health bars for all tanks
```

## Game States

### 1. Menu State
- Title screen
- Player count selection (2-8)
- AI difficulty selection per player
- Map selection
- Start game button

### 2. Setup State
- Generate selected map
- Place tanks at valid positions
- Initialize game variables
- Determine turn order

### 3. Playing State
- Active turn management
- Input handling
- Physics simulation
- Damage application
- Turn transitions

### 4. Game Over State
- Display winner
- Show final scores/statistics
- Option to restart
- Option to return to menu

## File Structure
```
index.html          - Main HTML file
styles.css          - Styling (minimal, mostly canvas)
js/
  main.js           - Game initialization and main loop
  constants.js      - All game constants (gravity, damage values, colors, etc.)
  utils.js          - Shared helper functions (distance, angle conversion, etc.)
  game.js           - Game state manager
  physics.js        - Physics engine and projectile motion
  terrain.js        - Terrain generation and destruction
  tank.js           - Tank class and management
  weapons.js        - Weapon types and explosion logic
  ai.js             - AI decision-making
  input.js          - Keyboard input handling
  renderer.js       - Canvas rendering functions
  ui.js             - UI elements and HUD
```

## Implementation Priority (MVP First)

### Phase 1: Core Foundation (MVP)
- [x] HTML/Canvas setup with responsive scaling
- [x] Game loop (requestAnimationFrame)
- [x] Basic terrain generation (1-2 maps)
- [x] Tank placement and rendering
- [x] Keyboard input for angle/power

### Phase 2: Basic Physics
- [x] Projectile trajectory (simple shot only)
- [x] Gravity simulation
- [x] Terrain collision detection
- [x] Tank collision detection
- [x] Damage system (direct hit only)

### Phase 3: Turn-Based System
- [x] Turn management (player switching)
- [x] Win condition checking
- [x] Basic UI (angle, power, current player)
- [x] Health bars

### Phase 4: Terrain Destruction
- [x] Crater formation on impact
- [x] Tank falling detection
- [x] Fall damage calculation
- [x] Terrain re-rendering

### Phase 5: Additional Weapons
- [x] Cluster bomb implementation
- [x] Bouncing round implementation
- [x] Weapon selection UI
- [x] Splash damage system

### Phase 6: AI Players
- [x] AI turn automation
- [x] Easy AI
- [x] Normal AI  
- [x] Hard AI

### Phase 7: Polish
- [x] All 5 maps
- [x] Explosion animations
- [x] Game over screen
- [x] Menu system
- [x] Sound effects (optional)

## Testing Checklist
- [ ] **Physics**: Projectile physics accurate at various angles/powers
- [ ] **Physics**: Projectiles despawn at boundaries and after max lifetime
- [ ] **Physics**: Minimum power threshold prevents 0% shots
- [ ] **Weapons**: Simple shot deals correct damage and splash
- [ ] **Weapons**: Cluster bomb splits correctly and sub-projectiles deal damage
- [ ] **Weapons**: Bouncing round bounces max 3 times with damping
- [ ] **Terrain**: Terrain destruction creates proper hemispherical craters
- [ ] **Terrain**: Crater algorithm respects screen boundaries
- [ ] **Damage**: Direct hit damage applies correctly
- [ ] **Damage**: Splash damage falls off linearly with distance
- [ ] **Damage**: Fall damage applies correctly (5 HP per 10 pixels, max 40 HP)
- [ ] **Damage**: Fall damage only triggers after 10+ pixel falls
- [ ] **Tanks**: Tanks sit properly on terrain surface
- [ ] **Tanks**: Tanks fall when terrain destroyed beneath them
- [ ] **Tanks**: Tanks can't fall through terrain
- [ ] **Tanks**: Tank spawn positions don't overlap (100px minimum apart)
- [ ] **Tanks**: Tank spawns stay 50px from screen edges
- [ ] **Collision**: Tank bounding box collision works correctly
- [ ] **Collision**: Terrain collision detection is accurate
- [ ] **Game Flow**: Win condition triggers when only one team remains
- [ ] **Game Flow**: Turn switching works correctly
- [ ] **AI**: Easy AI has appropriate error margins (±30°, ±40%)
- [ ] **AI**: Normal AI has moderate accuracy (±10°, ±20%)
- [ ] **AI**: Hard AI is highly accurate (±3°, ±10%)
- [ ] **AI**: AI makes reasonable decisions at all difficulty levels
- [ ] **Players**: Game handles 2-8 players correctly
- [ ] **UI**: Responsive scaling works on different screen sizes
- [ ] **UI**: Input coordinates transform correctly with scaling
- [ ] **UI**: Minimum 800x400 resolution supported
- [ ] **Performance**: No lag with physics calculations
- [ ] **Performance**: No lag with multiple projectiles (cluster bomb)

## Known Technical Challenges

1. **Trajectory Calculation**: Solving projectile motion for AI targeting requires quadratic equation
2. **Pixel-Perfect Collision**: Efficient terrain collision without checking every pixel
3. **Cluster Bomb Splitting**: Timing and scatter pattern for sub-projectiles
4. **Terrain Smoothing**: Crater edges should blend naturally with terrain
5. **Fall Detection**: Accurately determine when tank is "falling" vs. just repositioning

## Future Enhancements (Post-MVP)
- Wind effects (affects projectile trajectory)
- More weapon types (laser, digger, teleport)
- Power-ups on map
- Destructible obstacles
- Online multiplayer
- Custom map editor
- Replay system
- Achievements/unlockables

---

## Quick Start Guide for Claude Code

1. Create `index.html` with canvas element
2. Set up game loop in `main.js`
3. Implement `terrain.js` with one simple map
4. Create `tank.js` with basic tank class
5. Build `physics.js` for projectile motion
6. Add collision detection
7. Implement turn system in `game.js`
8. Add controls via `input.js`
9. Create renderer in `renderer.js`
10. Test and iterate

Start with a playable 2-player version using only simple shots, then expand from there.
