// tilemapSystem.js - Clean, scalable tilemap implementation
import CONFIG from './config.js';

export class TilemapSystem {
    constructor() {
        // Standardized tileset configuration
        this.standardTilesets = [
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
                name: 'buildings',
                firstgid: 513,
                imagePath: 'assets/tilesets/buildings.png',
                tilewidth: 32,
                tileheight: 32
            }
        ];

        // Standard layer collision rules
        this.collisionRules = {
            ground: 'never',      // Never solid
            buildings: 'always',  // Always solid
            trees: 'always',      // Always solid  
            objects: 'selective', // Depends on tile ID
            overlay: 'never'      // Never solid
        };

        // Which specific tile IDs are solid (for selective layers)
        this.solidTileIds = new Set([
            // Add specific object tile IDs that should be solid
            // Example: furniture, rocks, etc.
        ]);

        this.loadedTilesets = new Map();
        this.loadedMaps = new Map();
    }

    // Load all standard tilesets
    async loadTilesets() {
        console.log('📁 Loading standard tilesets...');
        
        const loadPromises = this.standardTilesets.map(config => this.loadTileset(config));
        
        try {
            await Promise.all(loadPromises);
            console.log('✅ All tilesets loaded successfully');
            return true;
        } catch (error) {
            console.error('❌ Failed to load tilesets:', error);
            return false;
        }
    }

    // Load a single tileset
    loadTileset(config) {
        return new Promise((resolve, reject) => {
            const image = new Image();
            
            image.onload = () => {
                const columns = Math.floor(image.width / config.tilewidth);
                const rows = Math.floor(image.height / config.tileheight);
                
                this.loadedTilesets.set(config.firstgid, {
                    name: config.name,
                    image: image,
                    firstgid: config.firstgid,
                    tilewidth: config.tilewidth,
                    tileheight: config.tileheight,
                    columns: columns,
                    rows: rows,
                    tilecount: columns * rows
                });
                
                console.log(`✅ ${config.name}: ${columns}×${rows} tiles (firstgid: ${config.firstgid})`);
                resolve();
            };
            
            image.onerror = () => {
                console.error(`❌ Failed to load: ${config.imagePath}`);
                reject(new Error(`Failed to load ${config.imagePath}`));
            };
            
            image.src = config.imagePath;
        });
    }

    // Load a map from JSON
    async loadMap(mapName, mapPath) {
        try {
            console.log(`🗺️ Loading map: ${mapName}`);
            
            const response = await fetch(mapPath);
            const mapData = await response.json();
            
            // Validate map structure
            if (!this.validateMapStructure(mapData)) {
                throw new Error(`Invalid map structure: ${mapName}`);
            }
            
            // Process the map data
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
            });
            
            // Create collision layer
            this.createCollisionLayer(processedMap);
            
            this.loadedMaps.set(mapName, processedMap);
            console.log(`✅ Map loaded: ${mapName} (${mapData.width}×${mapData.height})`);
            
            return processedMap;
            
        } catch (error) {
            console.error(`❌ Failed to load map ${mapName}:`, error);
            throw error;
        }
    }

    // Validate that map follows our standards
    validateMapStructure(mapData) {
        const requiredProps = ['width', 'height', 'layers'];
        const hasRequired = requiredProps.every(prop => mapData.hasOwnProperty(prop));
        
        if (!hasRequired) {
            console.error('Map missing required properties:', requiredProps);
            return false;
        }

        // Check for standard layers
        const layerNames = mapData.layers.map(layer => layer.name);
        const standardLayers = ['ground', 'buildings', 'trees', 'objects', 'overlay'];
        const hasGroundLayer = layerNames.includes('ground');
        
        if (!hasGroundLayer) {
            console.error('Map must have a "ground" layer');
            return false;
        }

        console.log(`📋 Map layers: ${layerNames.join(', ')}`);
        return true;
    }

    // Create collision layer based on our rules
    createCollisionLayer(processedMap) {
        const { width, height, layers } = processedMap;
        
        // Initialize with all passable
        processedMap.collisionLayer = Array(height).fill().map(() => 
            Array(width).fill(false)
        );

        // Apply collision rules for each layer
        Object.entries(layers).forEach(([layerName, layer]) => {
            if (!layer.data) return;
            
            const rule = this.collisionRules[layerName] || 'never';
            
            for (let i = 0; i < layer.data.length; i++) {
                const tileId = layer.data[i];
                if (tileId === 0) continue; // Skip empty tiles
                
                const x = i % width;
                const y = Math.floor(i / width);
                
                let isSolid = false;
                
                switch (rule) {
                    case 'always':
                        isSolid = true;
                        break;
                    case 'selective':
                        isSolid = this.solidTileIds.has(tileId);
                        break;
                    case 'never':
                    default:
                        isSolid = false;
                        break;
                }
                
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
        
        console.log(`🎯 Collision: ${solidCount} solid, ${passableCount} passable (${Math.round(passableCount/totalTiles*100)}% passable)`);
    }

    // Render a tile using the loaded tilesets
    renderTile(ctx, tileId, x, y, tileSize = CONFIG.TILE_SIZE) {
        const tileset = this.getTilesetForId(tileId);
        
        if (!tileset) {
            // Fallback to colored rectangle
            this.renderFallbackTile(ctx, tileId, x, y, tileSize);
            return;
        }
        
        const localId = tileId - tileset.firstgid;
        const sourceX = (localId % tileset.columns) * tileset.tilewidth;
        const sourceY = Math.floor(localId / tileset.columns) * tileset.tileheight;
        
        ctx.drawImage(
            tileset.image,
            sourceX, sourceY, tileset.tilewidth, tileset.tileheight,
            x, y, tileSize, tileSize
        );
    }

    // Fallback colored tile rendering
    renderFallbackTile(ctx, tileId, x, y, tileSize) {
        const colors = {
            // Grass tileset (1-256)
            17: '#4a7c59',
            49: '#3a6b49', 51: '#5a8b69',
            33: '#777777', 34: '#777777',
            
            // Trees tileset (257-512)  
            567: '#228B22', 568: '#32CD32',
            583: '#228B22', 584: '#32CD32',
            599: '#228B22', 600: '#32CD32',
            
            // Buildings tileset (513-768)
            513: '#8B4513', 514: '#A0522D',
            529: '#654321', 530: '#8B4513'
        };
        
        const color = colors[tileId] || '#666666';
        ctx.fillStyle = color;
        ctx.fillRect(x, y, tileSize, tileSize);
    }

    // Get the correct tileset for a tile ID
    getTilesetForId(tileId) {
        let bestMatch = null;
        let bestFirstgid = 0;
        
        for (const [firstgid, tileset] of this.loadedTilesets) {
            if (tileId >= firstgid && firstgid > bestFirstgid) {
                bestMatch = tileset;
                bestFirstgid = firstgid;
            }
        }
        
        return bestMatch;
    }

    // Check if a position is solid
    isSolid(mapName, tileX, tileY) {
        const map = this.loadedMaps.get(mapName);
        if (!map || !map.collisionLayer) return true;
        
        if (tileX < 0 || tileX >= map.width || tileY < 0 || tileY >= map.height) {
            return true; // Out of bounds is solid
        }
        
        return map.collisionLayer[tileY][tileX];
    }

    // Find a safe spawn position
    findSafePosition(mapName, entityWidth = 32, entityHeight = 32) {
        const map = this.loadedMaps.get(mapName);
        if (!map) return null;
        
        const attempts = 200;
        for (let i = 0; i < attempts; i++) {
            const tileX = Math.floor(Math.random() * map.width);
            const tileY = Math.floor(Math.random() * map.height);
            
            // Check if entity fits (simple 2x2 check)
            let canSpawn = true;
            for (let dy = 0; dy < 2; dy++) {
                for (let dx = 0; dx < 2; dx++) {
                    if (this.isSolid(mapName, tileX + dx, tileY + dy)) {
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
        
        console.warn(`No safe spawn found in ${mapName}`);
        return { x: CONFIG.TILE_SIZE * 2, y: CONFIG.TILE_SIZE * 2 };
    }

    // Get map data
    getMap(mapName) {
        return this.loadedMaps.get(mapName);
    }

    // Add a tile ID to solid list (for objects layer)
    addSolidTileId(tileId) {
        this.solidTileIds.add(tileId);
        console.log(`Added tile ID ${tileId} to solid tiles`);
        
        // Rebuild collision layers for all maps
        for (const map of this.loadedMaps.values()) {
            this.createCollisionLayer(map);
        }
    }
}