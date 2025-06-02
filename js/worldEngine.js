// worldEngine.js - Clean implementation for your standardized maps
import CONFIG from './config.js';
import { AICharacter } from './aiCharacter.js';

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
        this.worldState = { timeOfDay: 'dawn' };

        // Multi-screen setup
        this.currentScreen = 'town';
        this.screenWidth = 25;
        this.screenHeight = 25;
        this.screens = new Map();

        // Standardized tileset (your zone1 tileset)
        this.tileset = null;
        this.tilesetsLoaded = false;

        // Tile ID ranges from your zone1 tileset
        this.tileRanges = {
            grass: { start: 1, end: 256 },      // grass.png
            trees: { start: 257, end: 512 },   // trees.png  
            buildings: { start: 513, end: 3072 } // all your building sets
        };

        // Entities
        this.friendlyNPCs = new Map();
        this.enemies = new Map(); // Organized by screen
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
        console.log('🌍 Initializing world with your zone1 tileset...');
        
        // Load your zone1 tileset
        await this.loadZone1Tileset();
        
        // Load your standardized maps
        await this.loadStandardizedMaps();
        
        this.addEvent("The world awakens...");
    }

    async loadZone1Tileset() {
        try {
            console.log('📁 Loading zone1 tileset...');
            
            const image = new Image();
            await new Promise((resolve, reject) => {
                image.onload = () => {
                    // Calculate tileset dimensions
                    const columns = Math.floor(image.width / 32);
                    const rows = Math.floor(image.height / 32);
                    
                    this.tileset = {
                        image: image,
                        firstgid: 1,
                        tilewidth: 32,
                        tileheight: 32,
                        columns: columns,
                        rows: rows,
                        tilecount: columns * rows
                    };
                    
                    this.tilesetsLoaded = true;
                    console.log(`✅ Zone1 tileset loaded: ${columns}×${rows} tiles`);
                    resolve();
                };
                image.onerror = () => {
                    console.warn('❌ Failed to load zone1 tileset, using fallback colors');
                    this.tilesetsLoaded = false;
                    resolve(); // Continue without tileset
                };
                image.src = 'assets/tilesets/zone1_combined.png'; // Your mega-tileset
            });
            
        } catch (error) {
            console.warn('Tileset loading failed, using color fallback:', error);
            this.tilesetsLoaded = false;
        }
    }

    async loadStandardizedMaps() {
        try {
            console.log('🗺️ Loading your standardized maps...');
            
            // Load town square
            const townResponse = await fetch('assets/maps/townsquare.json');
            const townData = await townResponse.json();
            this.screens.set('town', this.processMap('town', townData));
            
            // Load forest
            const forestResponse = await fetch('assets/maps/forest1.json');
            const forestData = await forestResponse.json();
            this.screens.set('forest', this.processMap('forest', forestData));
            
            console.log('✅ Both maps loaded successfully');
            
        } catch (error) {
            console.error('Failed to load maps, creating fallback:', error);
            this.createFallbackMaps();
        }
    }

    processMap(mapName, mapData) {
        console.log(`📋 Processing ${mapName}: ${mapData.width}×${mapData.height}`);
        
        const processedMap = {
            name: mapName,
            width: mapData.width,
            height: mapData.height,
            layers: {},
            collisionLayer: [],
            rawData: mapData
        };
        
        // Organize layers by name
        mapData.layers.forEach(layer => {
            processedMap.layers[layer.name] = layer;
            
            // Log layer info
            if (layer.data) {
                const nonZeroTiles = layer.data.filter(id => id > 0);
                if (nonZeroTiles.length > 0) {
                    const min = Math.min(...nonZeroTiles);
                    const max = Math.max(...nonZeroTiles);
                    console.log(`  ${layer.name}: ${nonZeroTiles.length} tiles (${min}-${max})`);
                }
            }
        });
        
        // Create collision layer
        this.createCollisionLayer(processedMap);
        
        return processedMap;
    }

    // In your worldEngine.js, update the createCollisionLayer method:

createCollisionLayer(processedMap) {
    const { width, height, layers } = processedMap;
    
    // Initialize with all passable
    processedMap.collisionLayer = Array(height).fill().map(() => 
        Array(width).fill(false)
    );

    // Apply standardized collision rules
    const collisionRules = {
        ground: false,      // Never solid (grass, paths)
        buildings: true,    // Always solid (structures)
        trees: true,        // Always solid (vegetation)
        objects: true,      // NOW SOLID! (furniture, rocks, etc.)
        walls: true,        // Always solid (walls)
        overlay: false      // Never solid (effects)
    };

    // You can also make specific object tile IDs non-solid if needed
    const passableObjectIds = new Set([
        // Add specific object tile IDs here that should NOT be solid
        // For example: decorative items, small plants, etc.
        // 520, 521, 522  // example IDs for decorative flowers
    ]);

    Object.entries(layers).forEach(([layerName, layer]) => {
        if (!layer.data) return;
        
        const rule = collisionRules[layerName];
        if (rule === undefined) return; // Skip unknown layers
        
        for (let i = 0; i < layer.data.length; i++) {
            const tileId = layer.data[i];
            if (tileId === 0) continue; // Skip empty tiles
            
            const x = i % width;
            const y = Math.floor(i / width);
            
            let isSolid = false;
            
            if (rule === true) {
                // Check if this object ID should be passable
                if (layerName === 'objects' && passableObjectIds.has(tileId)) {
                    isSolid = false;
                } else {
                    isSolid = true; // Always solid
                }
            }
            // rule === false means never solid
            
            if (isSolid && y >= 0 && y < height && x >= 0 && x < width) {
                processedMap.collisionLayer[y][x] = true;
            }
        }
    });

    // Count collision tiles
    let solidCount = 0;
    processedMap.collisionLayer.forEach(row => {
        row.forEach(cell => { if (cell) solidCount++; });
    });
    
    const totalTiles = width * height;
    const passableCount = totalTiles - solidCount;
    
    console.log(`🎯 ${processedMap.name}: ${solidCount} solid, ${passableCount} passable (${Math.round(passableCount/totalTiles*100)}% passable)`);
}

    createFallbackMaps() {
        console.log('🔄 Creating fallback maps...');
        
        // Simple fallback town
        const fallbackTown = {
            name: 'town',
            width: this.screenWidth,
            height: this.screenHeight,
            layers: {
                ground: { data: Array(this.screenWidth * this.screenHeight).fill(17) }, // Grass
                buildings: { data: Array(this.screenWidth * this.screenHeight).fill(0) },
                trees: { data: Array(this.screenWidth * this.screenHeight).fill(0) },
                objects: { data: Array(this.screenWidth * this.screenHeight).fill(0) },
                overlay: { data: Array(this.screenWidth * this.screenHeight).fill(0) }
            },
            collisionLayer: Array(this.screenHeight).fill().map(() => 
                Array(this.screenWidth).fill(false)
            )
        };
        
        // Simple fallback forest with some trees
        const fallbackForest = {
            name: 'forest', 
            width: this.screenWidth,
            height: this.screenHeight,
            layers: {
                ground: { data: Array(this.screenWidth * this.screenHeight).fill(17) }, // Grass
                buildings: { data: Array(this.screenWidth * this.screenHeight).fill(0) },
                trees: { data: this.generateRandomTrees() },
                objects: { data: Array(this.screenWidth * this.screenHeight).fill(0) },
                overlay: { data: Array(this.screenWidth * this.screenHeight).fill(0) }
            },
            collisionLayer: this.generateForestCollision()
        };
        
        this.screens.set('town', fallbackTown);
        this.screens.set('forest', fallbackForest);
    }

    generateRandomTrees() {
        const data = Array(this.screenWidth * this.screenHeight).fill(0);
        for (let i = 0; i < data.length; i++) {
            if (Math.random() < 0.3) { // 30% tree coverage
                data[i] = 260; // Tree tile ID from your tileset
            }
        }
        return data;
    }

    generateForestCollision() {
        return Array(this.screenHeight).fill().map(() => 
            Array(this.screenWidth).map(() => Math.random() < 0.3)
        );
    }

    // Render a tile using your zone1 tileset
    renderTile(tileId, x, y) {
        if (!this.tilesetsLoaded || !this.tileset || tileId === 0) {
            this.renderFallbackTile(tileId, x, y);
            return;
        }
        
        const localId = tileId - this.tileset.firstgid;
        const sourceX = (localId % this.tileset.columns) * this.tileset.tilewidth;
        const sourceY = Math.floor(localId / this.tileset.columns) * this.tileset.tileheight;
        
        this.ctx.drawImage(
            this.tileset.image,
            sourceX, sourceY, this.tileset.tilewidth, this.tileset.tileheight,
            x, y, CONFIG.TILE_SIZE, CONFIG.TILE_SIZE
        );
    }

    renderFallbackTile(tileId, x, y) {
        // Fallback colors based on your tile ranges
        let color = '#666666'; // Default gray
        
        if (tileId >= 1 && tileId <= 256) {
            // Grass tileset range
            const grassColors = {
                17: '#4a7c59', 19: '#5a8b69', 20: '#6a9b79',
                33: '#777777', 34: '#777777', 49: '#666666', 50: '#666666', 51: '#666666'
            };
            color = grassColors[tileId] || '#4a7c59';
        } else if (tileId >= 257 && tileId <= 512) {
            // Trees tileset range  
            color = '#228B22'; // Forest green
        } else if (tileId >= 513) {
            // Buildings tileset range
            color = '#8B4513'; // Saddle brown
        }
        
        if (tileId > 0) {
            this.ctx.fillStyle = color;
            this.ctx.fillRect(x, y, CONFIG.TILE_SIZE, CONFIG.TILE_SIZE);
        }
    }

    // Character management
    createCharacter(name, config, screenName = 'town') {
        const character = new AICharacter(name, config.personality, config.appearance);
        
        const spawnPos = this.findSafeSpawnPosition(32, 32, screenName);
        if (spawnPos) {
            character.position = spawnPos;
            character.homeScreen = screenName;
            this.friendlyNPCs.set(name, character);
            this.addEvent(`${name} enters ${screenName}.`);
        } else {
            console.error(`Failed to spawn ${name} in ${screenName}`);
        }
    }

    addEnemyToScreen(enemy, screenName = 'forest') {
        if (!this.enemies.has(screenName)) {
            this.enemies.set(screenName, []);
        }
        
        const spawnPos = this.findSafeSpawnPosition(enemy.width, enemy.height, screenName);
        if (spawnPos) {
            enemy.x = spawnPos.x;
            enemy.y = spawnPos.y;
            this.enemies.get(screenName).push(enemy);
            console.log(`🐺 Enemy spawned in ${screenName} at (${Math.floor(spawnPos.x/32)}, ${Math.floor(spawnPos.y/32)})`);
        }
    }

    getCurrentScreenEnemies() {
        return this.enemies.get(this.currentScreen) || [];
    }

    getCurrentScreen() {
        return this.screens.get(this.currentScreen);
    }

    // Screen transitions
    checkScreenTransition(player) {
        if (!player) return;

        const transitionSize = CONFIG.TILE_SIZE;
        
        // Check north transition (town -> forest)
        if (this.currentScreen === 'town' && player.y < transitionSize) {
            this.transitionToScreen('forest', player);
            player.y = (this.screenHeight - 2) * CONFIG.TILE_SIZE; // Bottom of forest
        }
        
        // Check south transition (forest -> town)
        if (this.currentScreen === 'forest' && player.y > (this.screenHeight - 1) * CONFIG.TILE_SIZE) {
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

    // Collision detection
    isSolidTile(worldX, worldY) {
        const tileX = Math.floor(worldX / CONFIG.TILE_SIZE);
        const tileY = Math.floor(worldY / CONFIG.TILE_SIZE);
        
        const screen = this.getCurrentScreen();
        if (!screen || !screen.collisionLayer) return true;
        
        if (tileX < 0 || tileX >= screen.width || tileY < 0 || tileY >= screen.height) {
            return true; // Out of bounds is solid
        }
        
        return screen.collisionLayer[tileY][tileX];
    }

    findSafeSpawnPosition(entityWidth, entityHeight, screenName = null) {
        const targetScreen = screenName || this.currentScreen;
        const screen = this.screens.get(targetScreen);
        
        if (!screen) {
            console.error(`Screen ${targetScreen} not found`);
            return null;
        }
        
        const attempts = 200;
        for (let i = 0; i < attempts; i++) {
            const tileX = Math.floor(Math.random() * screen.width);
            const tileY = Math.floor(Math.random() * screen.height);
            
            // Check if spawn area is clear (2x2 tiles)
            let canSpawn = true;
            for (let dy = 0; dy < 2; dy++) {
                for (let dx = 0; dx < 2; dx++) {
                    const checkX = tileX + dx;
                    const checkY = tileY + dy;
                    if (checkX >= screen.width || checkY >= screen.height || 
                        screen.collisionLayer[checkY][checkX]) {
                        canSpawn = false;
                        break;
                    }
                }
                if (!canSpawn) break;
            }
            
            if (canSpawn) {
                return {
                    x: tileX * CONFIG.TILE_SIZE,
                    y: tileY * CONFIG.TILE_SIZE
                };
            }
        }
        
        console.warn(`No safe spawn found in ${targetScreen} after ${attempts} attempts`);
        return { x: CONFIG.TILE_SIZE * 2, y: CONFIG.TILE_SIZE * 2 };
    }

    // Game loop
    tick(deltaTime) {
        this.worldTime += this.gameSpeed;
        this.updateTimeOfDay();

        // Check screen transitions
        this.checkScreenTransition(this.player);

        // Update NPCs
        for (const [name, character] of this.friendlyNPCs) {
            if (character.homeScreen === this.currentScreen) {
                this.updateFriendlyNPC(character, deltaTime);
            }
        }

        // Update enemies on current screen
        const currentEnemies = this.getCurrentScreenEnemies();
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
    }

    updateTimeOfDay() {
        const gameHour = Math.floor((this.worldTime % this.dayLength) / (this.dayLength / 24));
        
        if (gameHour < 6) this.worldState.timeOfDay = 'night';
        else if (gameHour < 12) this.worldState.timeOfDay = 'morning';
        else if (gameHour < 18) this.worldState.timeOfDay = 'afternoon';
        else if (gameHour < 22) this.worldState.timeOfDay = 'evening';
        else this.worldState.timeOfDay = 'night';
    }

    updateFriendlyNPC(character, deltaTime) {
        if (!character.currentGoal && Math.random() < (0.01 * this.gameSpeed)) {
            const directions = [-1, 0, 1];
            const dx = directions[Math.floor(Math.random() * 3)];
            const dy = directions[Math.floor(Math.random() * 3)];
            
            if (dx === 0 && dy === 0) return;
            
            const newX = character.position.x + (dx * CONFIG.TILE_SIZE);
            const newY = character.position.y + (dy * CONFIG.TILE_SIZE);
            
            if (!this.isSolidTile(newX + character.width/2, newY + character.height/2)) {
                character.position.x = newX;
                character.position.y = newY;
            }
        }
        
        // Keep NPCs in bounds
        const maxX = this.screenWidth * CONFIG.TILE_SIZE - character.width;
        const maxY = this.screenHeight * CONFIG.TILE_SIZE - character.height;
        character.position.x = Math.max(0, Math.min(character.position.x, maxX));
        character.position.y = Math.max(0, Math.min(character.position.y, maxY));
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
        const screen = this.getCurrentScreen();
        console.log(`🗺️ Current Screen: ${this.currentScreen}`);
        console.log(`📏 Dimensions: ${screen?.width || 0}×${screen?.height || 0}`);
        console.log(`📁 Layers: ${Object.keys(screen?.layers || {}).join(', ')}`);
        
        if (screen?.collisionLayer) {
            let solid = 0, passable = 0;
            screen.collisionLayer.forEach(row => {
                row.forEach(cell => cell ? solid++ : passable++);
            });
            console.log(`🎯 Collision: ${solid} solid, ${passable} passable`);
        }
        
        if (this.tilesetsLoaded && this.tileset) {
            console.log(`🎨 Tileset: ${this.tileset.columns}×${this.tileset.rows} tiles loaded`);
        } else {
            console.log(`🎨 Tileset: Using color fallback`);
        }
    }
}