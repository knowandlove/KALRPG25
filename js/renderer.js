// renderer.js - Fixed syntax and tileset loading
import CONFIG from './config.js';

export default class Renderer {
    constructor(canvas, ctx) {
        this.canvas = canvas;
        this.ctx = ctx;

        this.camera = {
            x: 0,
            y: 0,
            width: CONFIG.CANVAS_WIDTH,
            height: CONFIG.CANVAS_HEIGHT,
            zoom: 1,
            target: null
        };

        // Tileset management
        this.tilesets = new Map();
        this.tilesetsLoaded = false;
        this.loadingPromise = null;

        // Fallback color mapping
        this.tileColors = this.createTileColorMap();
    }

    async loadTilesets() {
        if (this.loadingPromise) {
            return this.loadingPromise;
        }

        this.loadingPromise = this.loadTilesetsInternal();
        return this.loadingPromise;
    }

    async loadTilesetsInternal() {
        // First, try to load tileset info from your actual map JSON files
        const tilesetConfigs = await this.loadTilesetConfigsFromMaps();
        
        // If that fails, use fallback configuration
        if (tilesetConfigs.length === 0) {
            console.warn('🔄 Using fallback tileset configuration');
            tilesetConfigs.push(
                {
                    name: 'grass',
                    firstgid: 1,
                    imagePath: 'assets/tilesets/grass.png',
                    tilewidth: 32,
                    tileheight: 32
                },
                {
                    name: 'trees',
                    firstgid: 257,
                    imagePath: 'assets/tilesets/trees.png',
                    tilewidth: 32,
                    tileheight: 32
                },
                {
                    name: 'zone1',
                    firstgid: 513,
                    imagePath: 'assets/tilesets/zone1.png',
                    tilewidth: 32,
                    tileheight: 32
                }
            );
        }
        
        const loadPromises = tilesetConfigs.map(config => this.loadTileset(config));
        
        try {
            await Promise.all(loadPromises);
            this.tilesetsLoaded = true;
            console.log('✅ All tilesets loaded successfully');
        } catch (error) {
            console.error('❌ Failed to load tilesets:', error);
            console.log('🎨 Falling back to color-based rendering');
            this.tilesetsLoaded = false;
        }
    }

    async loadTilesetConfigsFromMaps() {
        const configs = [];
        
        try {
            // Load your actual map files to get correct tileset configuration
            const townResponse = await fetch('assets/maps/townsquare.json');
            const townData = await townResponse.json();
            
            const forestResponse = await fetch('assets/maps/forest1.json');
            const forestData = await forestResponse.json();
            
            // Process tilesets from both maps
            const allMaps = [
                { name: 'town', data: townData },
                { name: 'forest', data: forestData }
            ];
            
            allMaps.forEach(({ name, data }) => {
                if (data.tilesets) {
                    data.tilesets.forEach(tileset => {
                        // Extract actual filename and path
                        let imagePath = '';
                        let tilesetName = '';
                        
                        if (tileset.source) {
                            // Handle .tsx files - convert to .png
                            tilesetName = tileset.source.replace('.tsx', '');
                            imagePath = `assets/tilesets/${tilesetName}.png`;
                        } else if (tileset.image) {
                            // Direct image reference
                            imagePath = tileset.image;
                            tilesetName = tileset.name || 'unknown';
                        }
                        
                        if (imagePath) {
                            const config = {
                                name: tilesetName,
                                firstgid: tileset.firstgid,
                                imagePath: imagePath,
                                tilewidth: tileset.tilewidth || 32,
                                tileheight: tileset.tileheight || 32
                            };
                            
                            configs.push(config);
                            console.log(`📋 Found tileset: ${tilesetName} (firstgid: ${tileset.firstgid})`);
                        }
                    });
                }
            });
            
        } catch (error) {
            console.warn('⚠️ Could not load tileset info from maps:', error);
        }
        
        return configs;
    }

    loadTileset(config) {
        return new Promise((resolve, reject) => {
            const image = new Image();
            image.onload = () => {
                // Calculate actual columns from image width
                const actualColumns = Math.floor(image.width / config.tilewidth);
                
                this.tilesets.set(config.name, {
                    image: image,
                    firstgid: config.firstgid,
                    tilewidth: config.tilewidth,
                    tileheight: config.tileheight,
                    columns: actualColumns,
                    rows: Math.floor(image.height / config.tileheight),
                    name: config.name
                });
                console.log(`✅ Tileset ${config.name} loaded: ${actualColumns}x${Math.floor(image.height / config.tileheight)} (firstgid: ${config.firstgid})`);
                resolve();
            };
            image.onerror = () => {
                console.warn(`⚠️ Failed to load tileset: ${config.imagePath}`);
                resolve(); // Continue without this tileset
            };
            image.src = config.imagePath;
        });
    }

    getTilesetForGid(gid) {
        let bestMatch = null;
        let bestFirstgid = 0;
        
        for (const [name, tileset] of this.tilesets) {
            if (gid >= tileset.firstgid && tileset.firstgid > bestFirstgid) {
                bestMatch = tileset;
                bestFirstgid = tileset.firstgid;
            }
        }
        
        return bestMatch;
    }

    createTileColorMap() {
        return {
            // Grass tileset (1-256)
            17: '#4a7c59', // grass
            2: '#8B7355',   // dirt path
            19: '#666666',  // stone path
            20: '#555555',  // dark stone
            33: '#777777', 34: '#777777', 35: '#777777', 36: '#777777', 37: '#777777',
            49: '#666666', 50: '#666666', 51: '#666666', 52: '#666666', 53: '#666666',
            65: '#555555', 66: '#555555', 67: '#555555',
            
            // Trees tileset (257-512)
            273: '#228B22', 274: '#32CD32', 275: '#228B22', 276: '#32CD32',
            289: '#228B22', 290: '#32CD32', 291: '#228B22', 292: '#32CD32',
            305: '#228B22', 306: '#32CD32', 307: '#228B22', 308: '#32CD32',
            
            // Zone1 tileset (513+)
            513: '#8B4513', 514: '#A0522D', 515: '#654321', 516: '#8B4513',
            529: '#964B00', 530: '#8B4513', 531: '#A0522D', 532: '#654321',
            
            0: null, // Transparent
        };
    }

    initializeCameraPosition(mapPixelWidth, mapPixelHeight) {
        const viewWidth = this.camera.width / this.camera.zoom;
        const viewHeight = this.camera.height / this.camera.zoom;
        this.camera.x = (mapPixelWidth / 2) - (viewWidth / 2);
        this.camera.y = (mapPixelHeight / 2) - (viewHeight / 2);
        console.log(`📷 Camera centered at: ${this.camera.x.toFixed(0)}, ${this.camera.y.toFixed(0)}`);
    }

    setCameraTarget(entity) {
        this.camera.target = entity;
    }

    updateCamera(screenPixelWidth, screenPixelHeight) {
        const viewWidth = this.camera.width / this.camera.zoom;
        const viewHeight = this.camera.height / this.camera.zoom;

        let desiredX = this.camera.x;
        let desiredY = this.camera.y;

        if (this.camera.target) {
            // Calculate camera position based on player's actual world coordinates
            desiredX = this.camera.target.x + (this.camera.target.width / 2) - (viewWidth / 2);
            desiredY = this.camera.target.y + (this.camera.target.height / 2) - (viewHeight / 2);
        }

        // Clamp camera to current screen bounds
        if (screenPixelWidth <= viewWidth) {
            this.camera.x = (screenPixelWidth - viewWidth) / 2;
        } else {
            this.camera.x = Math.max(0, Math.min(desiredX, screenPixelWidth - viewWidth));
        }

        if (screenPixelHeight <= viewHeight) {
            this.camera.y = (screenPixelHeight - viewHeight) / 2;
        } else {
            this.camera.y = Math.max(0, Math.min(desiredY, screenPixelHeight - viewHeight));
        }
    }

    async render(worldEngine, player, gameMode) {
        // Load tilesets if not already loaded
        if (!this.tilesetsLoaded && !this.loadingPromise) {
            await this.loadTilesets();
        }

        this.ctx.fillStyle = this.getTimeBasedBackgroundColor(worldEngine.worldState.timeOfDay);
        this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);

        // Use current screen dimensions for camera calculation
        const screenPixelWidth = worldEngine.screenWidth * CONFIG.TILE_SIZE;
        const screenPixelHeight = worldEngine.screenHeight * CONFIG.TILE_SIZE;
        
        this.updateCamera(screenPixelWidth, screenPixelHeight);

        this.ctx.save();
        this.ctx.scale(this.camera.zoom, this.camera.zoom);
        this.ctx.translate(-this.camera.x, -this.camera.y);

        this.drawCurrentScreen(worldEngine);

        // Draw entities on current screen
        for (const [name, npc] of worldEngine.friendlyNPCs) {
            if (this.isEntityOnCurrentScreen(npc, worldEngine)) {
                this.drawFriendlyNPC(npc);
            }
        }

        // Draw enemies on current screen only
        const currentEnemies = worldEngine.getCurrentScreenEnemies();
        currentEnemies.forEach(enemy => {
            this.drawEnemy(enemy);
        });

        if (gameMode === 'adventure' && player) {
            this.drawPlayer(player);
        }
        
        this.ctx.restore();

        if (CONFIG.DEBUG_MODE) {
            // Update HTML debug panel instead of drawing on canvas
            if (typeof window.updateDebugPanel === 'function') {
                window.updateDebugPanel(worldEngine, player, gameMode, this);
            }
        }
    }

    isEntityOnCurrentScreen(entity, worldEngine) {
        const entityScreen = entity.homeScreen || 'town';
        return entityScreen === worldEngine.currentScreen;
    }

    drawCurrentScreen(worldEngine) {
        const currentScreen = worldEngine.getCurrentScreen();
        if (!currentScreen || !currentScreen.layers) {
            console.warn('⚠️ No valid screen data to render');
            return;
        }

        // DEBUG: Log available layers
        const availableLayers = Object.keys(currentScreen.layers);
        console.log(`🗺️ Available layers in ${worldEngine.currentScreen}:`, availableLayers);

        const startXTile = Math.floor(this.camera.x / CONFIG.TILE_SIZE);
        const endXTile = Math.min(startXTile + Math.ceil(this.camera.width / (CONFIG.TILE_SIZE * this.camera.zoom)) + 1, worldEngine.screenWidth);
        const startYTile = Math.floor(this.camera.y / CONFIG.TILE_SIZE);
        const endYTile = Math.min(startYTile + Math.ceil(this.camera.height / (CONFIG.TILE_SIZE * this.camera.zoom)) + 1, worldEngine.screenHeight);

        // Define standard layer rendering order (bottom to top)
        // Objects should render AFTER buildings so they appear on top
        const layerOrder = ['ground', 'grass', 'paths', 'walls', 'buildings', 'objects', 'trees', 'overlay'];
        
        // Render layers in order (bottom to top)
        layerOrder.forEach(layerName => {
            const layer = currentScreen.layers[layerName];
            if (layer && layer.visible !== false && layer.data) {
                console.log(`🎨 Rendering layer: ${layerName}`);
                this.drawScreenLayer(layer, worldEngine, startXTile, endXTile, startYTile, endYTile);
            }
        });

        // If no standard layers found, try to render any available layers
        // This will help us see what layers actually exist
        Object.entries(currentScreen.layers).forEach(([layerName, layer]) => {
            if (layer && layer.data && !layerOrder.includes(layerName)) {
                console.log(`🎨 Rendering unknown layer: ${layerName}`);
                this.drawScreenLayer(layer, worldEngine, startXTile, endXTile, startYTile, endYTile);
            }
        });
    }

    drawScreenLayer(layer, worldEngine, startXTile, endXTile, startYTile, endYTile) {
        if (!layer.data) return;

        for (let y = startYTile; y < endYTile; y++) {
            for (let x = startXTile; x < endXTile; x++) {
                const index = y * worldEngine.screenWidth + x;
                if (index >= 0 && index < layer.data.length) {
                    const tileId = layer.data[index];
                    if (tileId > 0) {
                        const screenX = x * CONFIG.TILE_SIZE;
                        const screenY = y * CONFIG.TILE_SIZE;
                        this.drawTile(tileId, screenX, screenY);
                    }
                }
            }
        }
    }

    drawTile(tileId, x, y) {
        if (this.tilesetsLoaded) {
            // Try to draw using tileset images
            const tileset = this.getTilesetForGid(tileId);
            if (tileset) {
                const localId = tileId - tileset.firstgid;
                const sourceX = (localId % tileset.columns) * tileset.tilewidth;
                const sourceY = Math.floor(localId / tileset.columns) * tileset.tileheight;
                
                this.ctx.drawImage(
                    tileset.image,
                    sourceX, sourceY, tileset.tilewidth, tileset.tileheight,
                    x, y, CONFIG.TILE_SIZE, CONFIG.TILE_SIZE
                );
                return;
            }
        }

        // Fallback to color rendering
        const color = this.tileColors[tileId];
        if (color) {
            this.ctx.fillStyle = color;
            this.ctx.fillRect(x, y, CONFIG.TILE_SIZE, CONFIG.TILE_SIZE);
            
            if (CONFIG.DEBUG_MODE) {
                this.ctx.strokeStyle = 'rgba(0,0,0,0.1)';
                this.ctx.strokeRect(x, y, CONFIG.TILE_SIZE, CONFIG.TILE_SIZE);
            }
        }
    }

    getTimeBasedBackgroundColor(timeOfDay) {
        const colors = {
            night: '#0a0a2a', 
            morning: '#4a4a6a', 
            afternoon: '#6a6a8a',
            evening: '#3a3a5a', 
            dawn: '#2a2a4a'
        };
        return colors[timeOfDay] || '#202030';
    }

    drawPlayer(player) {
        let playerColor = '#4169e1';
        if (player.damageFlash) playerColor = '#ff4444';
        else if (player.invulnerable) {
            playerColor = Math.floor(player.invulnerabilityTimer / 100) % 2 ? '#4169e1' : '#87CEFA';
        }
        this.ctx.fillStyle = playerColor;
        this.ctx.fillRect(player.x, player.y, player.width, player.height);
        
        // Draw facing indicator
        this.ctx.fillStyle = '#fff';
        const centerX = player.x + player.width / 2;
        const centerY = player.y + player.height / 2;
        const indicatorSize = player.width / 4;
        this.ctx.beginPath();
        switch (player.facing) {
            case 'up': 
                this.ctx.moveTo(centerX, player.y - indicatorSize / 2); 
                this.ctx.lineTo(centerX - indicatorSize, player.y + indicatorSize); 
                this.ctx.lineTo(centerX + indicatorSize, player.y + indicatorSize); 
                break;
            case 'down': 
                this.ctx.moveTo(centerX, player.y + player.height + indicatorSize / 2); 
                this.ctx.lineTo(centerX - indicatorSize, player.y + player.height - indicatorSize); 
                this.ctx.lineTo(centerX + indicatorSize, player.y + player.height - indicatorSize); 
                break;
            case 'left': 
                this.ctx.moveTo(player.x - indicatorSize / 2, centerY); 
                this.ctx.lineTo(player.x + indicatorSize, centerY - indicatorSize); 
                this.ctx.lineTo(player.x + indicatorSize, centerY + indicatorSize); 
                break;
            case 'right': 
                this.ctx.moveTo(player.x + player.width + indicatorSize / 2, centerY); 
                this.ctx.lineTo(player.x + player.width - indicatorSize, centerY - indicatorSize); 
                this.ctx.lineTo(player.x + player.width - indicatorSize, centerY + indicatorSize); 
                break;
        }
        this.ctx.closePath(); 
        this.ctx.fill();
        
        // Draw attack animation
        if (player.isAttacking) {
            this.ctx.strokeStyle = '#ffd700'; 
            this.ctx.lineWidth = 3;
            const swordLength = player.attackRange * 0.7; 
            let ex, ey;
            switch (player.facing) {
                case 'up': ex = centerX; ey = centerY - swordLength; break;
                case 'down': ex = centerX; ey = centerY + swordLength; break;
                case 'left': ex = centerX - swordLength; ey = centerY; break;
                case 'right': ex = centerX + swordLength; ey = centerY; break;
            }
            this.ctx.beginPath(); 
            this.ctx.moveTo(centerX, centerY); 
            this.ctx.lineTo(ex, ey); 
            this.ctx.stroke();
        }
    }

    drawFriendlyNPC(npc) {
        this.ctx.fillStyle = npc.appearance.color || '#cccccc';
        const npcSize = CONFIG.TILE_SIZE * 0.8;
        this.ctx.beginPath();
        this.ctx.arc(npc.position.x + npcSize / 2, npc.position.y + npcSize / 2, npcSize / 2, 0, Math.PI * 2);
        this.ctx.fill();
        this.ctx.font = `${npcSize * 0.6}px Arial`; 
        this.ctx.textAlign = 'center'; 
        this.ctx.textBaseline = 'middle';
        this.ctx.fillStyle = '#000000';
        this.ctx.fillText(npc.appearance.symbol || '?', npc.position.x + npcSize / 2, npc.position.y + npcSize / 2);
    }

    drawEnemy(enemy) {
        if (enemy.dying) {
            const deathProgress = enemy.deathTimer / enemy.deathDuration;
            this.ctx.globalAlpha = 1 - deathProgress;
            const scale = 1 - (deathProgress * 0.5);
            this.ctx.fillStyle = '#660000';
            this.ctx.fillRect(
                enemy.x + (enemy.width - (enemy.width * scale)) / 2, 
                enemy.y + (enemy.height - (enemy.height * scale)) / 2, 
                enemy.width * scale, 
                enemy.height * scale
            );
            this.ctx.globalAlpha = 1; 
            return;
        }
        
        let enemyColor = '#8b0000';
        if (enemy.damageFlash) enemyColor = '#ffaaaa';
        else if (enemy.ai.state === 'chase') enemyColor = '#dc143c';
        
        this.ctx.fillStyle = enemyColor;
        this.ctx.fillRect(enemy.x, enemy.y, enemy.width, enemy.height);
        
        // Health bar
        const healthPercent = enemy.hp / enemy.maxHp;
        this.ctx.fillStyle = '#333';
        this.ctx.fillRect(enemy.x, enemy.y - 8, enemy.width, 5);
        this.ctx.fillStyle = healthPercent > 0.5 ? '#4caf50' : healthPercent > 0.2 ? '#ff9800' : '#f44336';
        this.ctx.fillRect(enemy.x, enemy.y - 8, enemy.width * healthPercent, 5);
    }

    drawDebugInfo(worldEngine, player, gameMode) { 
        // Position debug info at bottom of screen, above the control buttons
        const debugWidth = 400;
        const debugHeight = 120;
        const padding = 10;
        
        // Position at bottom-right of canvas, leaving space for controls
        const debugX = this.canvas.width - debugWidth - padding;
        const debugY = this.canvas.height - debugHeight - padding;
        
        this.ctx.fillStyle = 'rgba(0, 0, 0, 0.8)';
        this.ctx.fillRect(debugX, debugY, debugWidth, debugHeight);
        
        this.ctx.font = '11px Courier New'; 
        this.ctx.fillStyle = '#fff';
        let yOffset = 15; 
        const lineHeight = 13;
        
        // Two columns for better space usage
        const col1X = debugX + 10;
        const col2X = debugX + 200;
        let col1Y = debugY + yOffset;
        let col2Y = debugY + yOffset;
        
        // Column 1 - World info
        this.ctx.fillText(`🕐 Time: ${worldEngine.worldState.timeOfDay}`, col1X, col1Y); col1Y += lineHeight;
        this.ctx.fillText(`🎮 Mode: ${gameMode}`, col1X, col1Y); col1Y += lineHeight;
        this.ctx.fillText(`🗺️ Screen: ${worldEngine.currentScreen}`, col1X, col1Y); col1Y += lineHeight;
        this.ctx.fillText(`📏 Size: ${worldEngine.screenWidth}x${worldEngine.screenHeight}`, col1X, col1Y); col1Y += lineHeight;
        this.ctx.fillText(`👹 Enemies: ${worldEngine.getCurrentScreenEnemies().length}`, col1X, col1Y); col1Y += lineHeight;
        this.ctx.fillText(`🎨 Tilesets: ${this.tilesetsLoaded ? 'Loaded' : 'Fallback'}`, col1X, col1Y);
        
        // Column 2 - Player & camera info
        this.ctx.fillText(`📷 Camera: ${this.camera.x.toFixed(0)}, ${this.camera.y.toFixed(0)}`, col2X, col2Y); col2Y += lineHeight;
        
        if (player && gameMode === 'adventure') {
            this.ctx.fillText(`❤️ HP: ${player.hp.toFixed(0)}/${player.maxHp}`, col2X, col2Y); col2Y += lineHeight;
            this.ctx.fillText(`📍 Pos: ${player.x.toFixed(0)}, ${player.y.toFixed(0)}`, col2X, col2Y); col2Y += lineHeight;
            this.ctx.fillText(`⭐ Level: ${player.level} (${player.xp}/${player.xpToNext} XP)`, col2X, col2Y); col2Y += lineHeight;
            this.ctx.fillText(`🏃 Facing: ${player.facing}`, col2X, col2Y); col2Y += lineHeight;
            if (player.invulnerable) {
                this.ctx.fillText(`🛡️ Invulnerable`, col2X, col2Y);
            }
        } else {
            this.ctx.fillText(`👀 Observer Mode`, col2X, col2Y); col2Y += lineHeight;
            this.ctx.fillText(`🔄 NPCs: ${worldEngine.friendlyNPCs.size}`, col2X, col2Y);
        }
    }
}