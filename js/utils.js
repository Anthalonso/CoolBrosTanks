// Utility functions

// Calculate distance between two points
function distance(x1, y1, x2, y2) {
    const dx = x2 - x1;
    const dy = y2 - y1;
    return Math.sqrt(dx * dx + dy * dy);
}

// Convert degrees to radians
function degreesToRadians(degrees) {
    return degrees * (Math.PI / 180);
}

// Convert radians to degrees
function radiansToDegrees(radians) {
    return radians * (180 / Math.PI);
}

// Clamp a value between min and max
function clamp(value, min, max) {
    return Math.max(min, Math.min(max, value));
}

// Linear interpolation
function lerp(start, end, t) {
    return start + (end - start) * t;
}

// Random number between min and max (inclusive)
function randomRange(min, max) {
    return Math.random() * (max - min) + min;
}

// Random integer between min and max (inclusive)
function randomInt(min, max) {
    return Math.floor(Math.random() * (max - min + 1)) + min;
}

// Random element from array
function randomElement(array) {
    return array[Math.floor(Math.random() * array.length)];
}

// Check if point is inside rectangle
function pointInRect(px, py, rx, ry, rw, rh) {
    return px >= rx && px <= rx + rw && py >= ry && py <= ry + rh;
}

// Check if two rectangles overlap
function rectsOverlap(x1, y1, w1, h1, x2, y2, w2, h2) {
    return x1 < x2 + w2 && x1 + w1 > x2 && y1 < y2 + h2 && y1 + h1 > y2;
}

// Calculate splash damage with linear falloff
function calculateSplashDamage(maxDamage, distance, radius) {
    if (distance >= radius) return 0;
    return maxDamage * (1 - distance / radius);
}

// Calculate fall damage
function calculateFallDamage(pixelsFallen) {
    if (pixelsFallen < FALL_DAMAGE_THRESHOLD) return 0;
    const damage = Math.floor(pixelsFallen / FALL_DAMAGE_PIXELS) * FALL_DAMAGE_RATE;
    return Math.min(damage, FALL_DAMAGE_MAX);
}

// Get color interpolated between green and red based on health percentage
function getHealthColor(healthPercent) {
    if (healthPercent > 0.5) {
        // Green to yellow
        const t = (1 - healthPercent) * 2;
        return `rgb(${Math.floor(255 * t)}, 255, 0)`;
    } else {
        // Yellow to red
        const t = healthPercent * 2;
        return `rgb(255, ${Math.floor(255 * t)}, 0)`;
    }
}

// Draw text with outline
function drawTextWithOutline(ctx, text, x, y, fillStyle, outlineStyle = '#000000', outlineWidth = 2) {
    ctx.strokeStyle = outlineStyle;
    ctx.lineWidth = outlineWidth;
    ctx.strokeText(text, x, y);
    ctx.fillStyle = fillStyle;
    ctx.fillText(text, x, y);
}

// Shuffle array (Fisher-Yates)
function shuffleArray(array) {
    const arr = [...array];
    for (let i = arr.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [arr[i], arr[j]] = [arr[j], arr[i]];
    }
    return arr;
}
