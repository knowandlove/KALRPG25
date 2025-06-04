// config.js

const CONFIG = {
    // Display and World Dimensions
    TILE_SIZE: 32, // Standard size for tiles if we use a tile-based map
    CANVAS_WIDTH: 800, // Default canvas width
    CANVAS_HEIGHT: 600, // Default canvas height
    SIDE_PANEL_WIDTH: 300, // Width of the UI side panel

    // World Simulation
    DAY_LENGTH: 24000, // Milliseconds for a full in-game day (24 seconds)
    TICK_RATE: 60, // Target ticks per second for game logic
    
    // Movement speeds (pixels per second)
    PLAYER_SPEED: 150, // Player movement speed
    ENEMY_SPEED: 100, // Default enemy movement speed
    NPC_SPEED: 80, // Default NPC movement speed
    
    // Player Defaults
    PLAYER_HP: 100,
    
    // Other constants
    DEBUG_MODE: true, // Set to true to enable debug logs or visual aids
};

export default CONFIG;