// Game Constants

// Canvas dimensions (internal game coordinates)
const GAME_WIDTH = 1200;
const GAME_HEIGHT = 600;

// Physics constants
const GRAVITY = 0.5; // pixels per frame^2
const MAX_VELOCITY = 45; // maximum initial velocity (3x speed)
const BOUNCE_DAMPING = 0.7; // velocity multiplier after bounce
const FIXED_TIME_STEP = 1/60; // 60 FPS target for consistent physics
const PROJECTILE_MAX_LIFETIME = 10; // seconds before auto-despawn
const MIN_POWER_THRESHOLD = 5; // minimum power % to prevent accidental 0% shots

// Tank constants
const TANK_WIDTH = 24;
const TANK_HEIGHT = 18;
const TANK_BARREL_LENGTH = 30;
const TANK_HEALTH = 100;
const TANK_MIN_SPACING = 100; // minimum pixels between tanks
const TANK_EDGE_MARGIN = 50; // minimum pixels from screen edge
const TANK_SPAWN_ATTEMPTS = 10; // max attempts to find valid spawn positions

// Weapon types
const WEAPON_TYPES = {
    SIMPLE: 0,
    CLUSTER: 1,
    BOUNCING: 2,
    ROLLING: 3
};

// Weapon properties
const WEAPONS = {
    [WEAPON_TYPES.SIMPLE]: {
        name: 'Missile',
        damage: 100,
        splashRadius: 70,
        splashDamage: 80,
        bounces: 0
    },
    [WEAPON_TYPES.CLUSTER]: {
        name: 'Cluster Bomb',
        initialDamage: 10,
        subProjectiles: 5,
        subDamage: 20,
        subSplash: 10,
        subSplashRadius: 20,
        splashRadius: 50,
        maxDamage: 110
    },
    [WEAPON_TYPES.BOUNCING]: {
        name: 'Bouncing Round',
        damage: 60,
        splashRadius: 30,
        splashDamage: 40,
        bounces: 3,
        maxDamage: 180
    },
    [WEAPON_TYPES.ROLLING]: {
        name: 'Rolling Bomb',
        damage: 20,
        splashRadius: 25,
        splashDamage: 15,
        maxDamage: 35
    }
};

// Fall damage
const FALL_DAMAGE_RATE = 5; // HP per 10 pixels
const FALL_DAMAGE_PIXELS = 10; // pixels per damage calculation
const FALL_DAMAGE_THRESHOLD = 10; // minimum pixels to trigger damage
const FALL_DAMAGE_MAX = 40; // maximum fall damage cap

// Tank colors (8 players max)
const TANK_COLORS = [
    '#FF0000', // Red
    '#0000FF', // Blue
    '#00FF00', // Green
    '#FFFF00', // Yellow
    '#800080', // Purple
    '#FFA500', // Orange
    '#00FFFF', // Cyan
    '#FFC0CB'  // Pink
];

// Environment colors
const COLORS = {
    SKY_TOP: '#87CEEB',
    SKY_BOTTOM: '#4A90E2',
    TERRAIN_BROWN: '#8B4513',
    TERRAIN_GREEN: '#228B22',
    TERRAIN_BLACK: '#2C2C2C',
    EXPLOSION_ORANGE: '#FF6600',
    EXPLOSION_RED: '#FF0000',
    PROJECTILE: '#FFFF00',
    UI_BG: 'rgba(0, 0, 0, 0.5)',
    HEALTH_FULL: '#00FF00',
    HEALTH_LOW: '#FF0000',
    TEXT: '#FFFFFF'
};

// Game states
const GAME_STATES = {
    MENU: 0,
    SETUP: 1,
    PLAYING: 2,
    PROJECTILE_FLYING: 3,
    GAME_OVER: 4,
    PAUSED: 5
};

// AI difficulty levels
const AI_DIFFICULTY = {
    NONE: 0,     // Human player
    EASY: 1,
    NORMAL: 2,
    HARD: 3
};

// AI error margins (angle in degrees, power in %)
const AI_ERROR_MARGINS = {
    [AI_DIFFICULTY.EASY]: { angle: 30, power: 40 },
    [AI_DIFFICULTY.NORMAL]: { angle: 10, power: 20 },
    [AI_DIFFICULTY.HARD]: { angle: 3, power: 10 }
};

// Input constants
const ANGLE_INCREMENT = 1; // degrees per key press
const POWER_INCREMENT = 1; // % per key press

// Map types
const MAP_TYPES = {
    FLAT_PLAINS: 0,
    ROLLING_HILLS: 1,
    MOUNTAIN_RANGE: 2,
    CANYON: 3,
    PLATEAU: 4
};

const MAP_NAMES = [
    'Flat Plains',
    'Rolling Hills',
    'Mountain Range',
    'Canyon',
    'Plateau'
];

// Projectile size
const PROJECTILE_RADIUS = 3;

// Explosion animation
const EXPLOSION_DURATION = 30; // frames
const EXPLOSION_MAX_RADIUS_MULTIPLIER = 1.5; // multiplier of splash radius for visual

// UI constants
const UI_FONT = '16px Arial';
const UI_FONT_LARGE = '24px Arial';
const UI_PADDING = 10;
