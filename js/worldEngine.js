// worldEngine.js - Refactored to use TilemapSystem
import CONFIG from './config.js';
import { AICharacter } from './aiCharacter.js';
import { TilemapSystem } from './tilemapSystem.js';

export default class WorldEngine {
    constructor(config) {
        this.config = config;
        this.canvas = document.getElementById('gameCanvas');
        this.ctx = this.canvas.getContext('2d');
        
        // Game state
        this.isRunning = true;
        this.isPaused = false;
        this.gameSpeed = 1;

        // World time
        this.worldTime = 0;
        this.dayLength = this.config.DAY_LENGTH;
        this.worldState = { timeOfDay: 'morning' }; // Start at morning

        // Tilemap system - single source of truth for maps and tiles
        this.tilemapSystem = new TilemapSystem();

        // Multi-screen setup
        this.currentScreen = 'town';
        this.availableScreens = ['town', 'forest']; // List of available screens

        // Entities
        this.friendlyNPCs = new Map();
        this.enemies = []; // Current screen enemies for combat
        this.screenEnemies = new Map(); // Enemies organized by screen
        this.player = null;

        // Events
        this.events = [];
        this.maxEvents = 20;

        this.setupCanvas();
    }

    setupCanvas() {
        this.canvas.width = this.config.CANVAS_WIDTH;
        this.canvas.height = this.config.CANVAS_HEIGHT;
        this.ctx.imageSmoothingEnabled = false;
    }

    async initializeWorld() {
        console.log('🌍 Initializing world...');
        
        // Initialize tilemap system with our maps
        const mapList = [
            { name: 'town', path: 'assets/maps/townsquare.json' },
            { name: 'forest', path: 'assets/maps/forest1.json' }
        ];
        
        const success = await this.tilemapSystem.initialize(mapList);
        
        if (!success) {
            console.error('Failed to initialize tilemap system');
        }
        
        this.addEvent("The world awakens...");
    }

    // Get current screen dimensions from tilemap system
    getCurrentScreenDimensions() {
        return this.tilemapSystem.getMapDimensions(this.currentScreen) || {
            width: 25,
            height: 25,
            tilewidth: 32,
            tileheight: 32,
            pixelWidth: 800,
            pixelHeight: 800
        };
    }

    // Get current screen data
    getCurrentScreen() {
        return this.tilemapSystem.getMap(this.currentScreen);
    }

    // Screen transitions
    checkScreenTransition(player) {
        if (!player) return;

        const transitionSize = CONFIG.TILE_SIZE;
        const dims = this.getCurrentScreenDimensions();
        
        // Check north transition (town -> forest)
        if (this.currentScreen === 'town' && player.y < transitionSize) {
            this.transitionToScreen('forest', player);
            player.y = dims.pixelHeight - (2 * CONFIG.TILE_SIZE); // Bottom of forest
        }
        
        // Check south transition (forest -> town)
        if (this.currentScreen === 'forest' && player.y > dims.pixelHeight - transitionSize) {
            this.transitionToScreen('town', player);
            player.y = transitionSize; // Top of town
        }
    }

    transitionToScreen(newScreen, player) {
        if (newScreen === this.currentScreen) return;
        
        const oldScreen = this.currentScreen;
        this.currentScreen = newScreen;
        
        const messages = {
            'town': "You return to the safety of the town square.",
            'forest': "You venture into the dense forest..."
        };
        
        this.addEvent(messages[newScreen] || `You enter ${newScreen}.`);
        console.log(`🚪 Transitioned: ${oldScreen} → ${newScreen}`);
    }

    // Collision detection - now delegates to tilemap system
    isSolidTile(worldX, worldY) {
        return this.tilemapSystem.isSolidPixel(this.currentScreen, worldX, worldY);
    }

    // Find safe spawn position - delegates to tilemap system
    findSafeSpawnPosition(entityWidth, entityHeight, screenName = null) {
        const targetScreen = screenName || this.currentScreen;
        const spawnPos = this.tilemapSystem.findSafeSpawnPosition(
            targetScreen, 
            entityWidth, 
            entityHeight
        );
        
        // Additional check: ensure not spawning on other entities
        if (spawnPos && this.player && targetScreen === this.currentScreen) {
            const playerDist = Math.sqrt(
                Math.pow(this.player.x - spawnPos.x, 2) +
                Math.pow(this.player.y - spawnPos.y, 2)
            );
            
            if (playerDist < CONFIG.TILE_SIZE * 2) {
                // Too close to player, try again with offset
                spawnPos.x += CONFIG.TILE_SIZE * 3;
                spawnPos.y += CONFIG.TILE_SIZE * 3;
            }
        }
        
        return spawnPos;
    }

    // Entity management
    addEnemyToScreen(enemy, screenName = 'forest') {
        if (!this.screenEnemies.has(screenName)) {
            this.screenEnemies.set(screenName, []);
        }
        
        const spawnPos = this.findSafeSpawnPosition(enemy.width, enemy.height, screenName);
        if (spawnPos) {
            enemy.x = spawnPos.x;
            enemy.y = spawnPos.y;
            this.screenEnemies.get(screenName).push(enemy);
            console.log(`🐺 Enemy spawned in ${screenName} at (${Math.floor(spawnPos.x/32)}, ${Math.floor(spawnPos.y/32)})`);
        }
    }

    getCurrentScreenEnemies() {
        return this.screenEnemies.get(this.currentScreen) || [];
    }

    // Game loop
    tick(deltaTime) {
        this.worldTime += this.gameSpeed;
        this.updateTimeOfDay();

        // Check screen transitions
        this.checkScreenTransition(this.player);

        // Update enemies on current screen AND make them accessible for combat
        const currentEnemies = this.getCurrentScreenEnemies();
        
        // IMPORTANT: Set enemies on worldEngine so player can access them for combat
        this.enemies = currentEnemies;
        
        for (let i = currentEnemies.length - 1; i >= 0; i--) {
            const enemy = currentEnemies[i];
            if (enemy.dying && enemy.deathTimer >= enemy.deathDuration) {
                currentEnemies.splice(i, 1);
                this.addEvent(`A ${enemy.type} has fallen.`);
            } else {
                enemy.update(deltaTime, this.player, this);
            }
        }

        // Random events
        if (Math.random() < (0.0001 * this.gameSpeed)) {
            this.createRandomEvent();
        }
        
        // NOTE: NPCs are updated in main.js game loop, not here
    }

    updateTimeOfDay() {
        const gameHour = Math.floor((this.worldTime % this.dayLength) / (this.dayLength / 24));
        
        if (gameHour < 6) this.worldState.timeOfDay = 'night';
        else if (gameHour < 12) this.worldState.timeOfDay = 'morning';
        else if (gameHour < 18) this.worldState.timeOfDay = 'afternoon';
        else if (gameHour < 22) this.worldState.timeOfDay = 'evening';
        else this.worldState.timeOfDay = 'night';
    }

    createRandomEvent() {
        const events = {
            town: [
                "A gentle breeze sweeps through the town square.",
                "Merchants chat in the distance.",
                "A bell tolls from the clocktower.",
                "Children's laughter echoes from nearby."
            ],
            forest: [
                "Something rustles in the dense undergrowth.",
                "A wolf howls somewhere in the darkness.", 
                "Ancient trees whisper in the wind.",
                "A twig snaps behind you..."
            ]
        };
        
        const screenEvents = events[this.currentScreen] || events.town;
        const event = screenEvents[Math.floor(Math.random() * screenEvents.length)];
        this.addEvent(event);
    }

    addEvent(text) {
        this.events.unshift({ 
            text: text, 
            time: this.worldTime, 
            timestamp: Date.now() 
        });
        if (this.events.length > this.maxEvents) {
            this.events.pop();
        }
    }

    // Player management
    setPlayer(playerInstance) {
        this.player = playerInstance;
    }

    removePlayer() {
        this.player = null;
    }

    // Controls
    togglePause() {
        this.isPaused = !this.isPaused;
    }

    changeSpeed() {
        const speeds = [0.5, 1, 2, 5];
        const currentIndex = speeds.indexOf(this.gameSpeed);
        this.gameSpeed = speeds[(currentIndex + 1) % speeds.length];
    }

    // Debug
    debugCurrentScreen() {
        const dims = this.getCurrentScreenDimensions();
        const map = this.getCurrentScreen();
        
        console.log(`🗺️ Current Screen: ${this.currentScreen}`);
        console.log(`📏 Dimensions: ${dims.width}×${dims.height} tiles (${dims.pixelWidth}×${dims.pixelHeight} pixels)`);
        console.log(`📁 Layers: ${map ? map.layerOrder.join(', ') : 'N/A'}`);
        console.log(`👹 Enemies: ${this.getCurrentScreenEnemies().length}`);
        console.log(`🎯 Collision: Check specific tiles with tilemapSystem.isSolid('${this.currentScreen}', tileX, tileY)`);
    }

    logTileIdsAt(x, y) {
        const dims = this.getCurrentScreenDimensions();
        const tileX = Math.floor(x / dims.tilewidth);
        const tileY = Math.floor(y / dims.tileheight);
        const map = this.getCurrentScreen();
        
        console.log(`Tiles at (${tileX}, ${tileY}):`);
        console.log(`  Solid: ${this.tilemapSystem.isSolid(this.currentScreen, tileX, tileY)}`);
        
        if (map && map.layers) {
            Object.entries(map.layers).forEach(([layerName, layer]) => {
                const tileId = this.tilemapSystem.getTileAt(this.currentScreen, layerName, tileX, tileY);
                if (tileId > 0) {
                    console.log(`  ${layerName}: ${tileId}`);
                }
            });
        }
    }

    // Get dimensions for the current screen
    get screenWidth() {
        return this.getCurrentScreenDimensions().width;
    }

    get screenHeight() {
        return this.getCurrentScreenDimensions().height;
    }
}