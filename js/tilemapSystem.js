// tilemapSystem.js - Single source of truth for all map and tile operations
import CONFIG from './config.js';

export class TilemapSystem {
    constructor() {
        // Tileset management
        this.loadedTilesets = new Map(); // Map<firstgid, tileset data>
        this.loadedMaps = new Map();     // Map<mapName, processed map data>
        
        // Collision rules by layer name
        this.collisionRules = {
            ground: false,      // Never solid (grass, paths)
            buildings: true,    // Always solid (structures)
            trees: true,        // Always solid (vegetation)
            objects: true,      // Always solid (furniture, rocks, etc.)
            walls: true,        // Always solid (walls)
            overlay: false      // Never solid (effects)
        };

        // Specific tile IDs that override layer rules
        this.passableObjectIds = new Set([
            // Add specific object tile IDs that should NOT be solid
            // Example: 520, 521, 522 // decorative flowers
        ]);
        
        // Fallback colors for when tilesets fail to load
        this.fallbackColors = {
            // Grass tileset range (1-256)
            17: '#4a7c59', 19: '#5a8b69', 20: '#6a9b79',
            33: '#777777', 34: '#777777', 35: '#777777',
            49: '#666666', 50: '#666666', 51: '#666666',
            
            // Trees tileset range (257-512)
            260: '#228B22', 273: '#228B22', 274: '#32CD32',
            289: '#228B22', 290: '#32CD32', 291: '#228B22',
            
            // Buildings tileset range (513+)
            513: '#8B4513', 514: '#A0522D', 515: '#654321',
            529: '#964B00', 530: '#8B4513', 531: '#A0522D',
            
            0: null // Transparent
        };
    }

    // Initialize the tilemap system by loading all maps
    async initialize(mapList) {
        console.log('🗺️ Initializing Tilemap System...');
        
        const loadPromises = mapList.map(({ name, path }) => 
            this.loadMap(name, path)
        );
        
        try {
            await Promise.all(loadPromises);
            console.log('✅ All maps loaded successfully');
            return true;
        } catch (error) {
            console.error('❌ Failed to initialize tilemap system:', error);
            return false;
        }
    }

    // Load a map and its associated tilesets
    async loadMap(mapName, mapPath) {
        try {
            console.log(`📁 Loading map: ${mapName} from ${mapPath}`);
            
            const response = await fetch(mapPath);
            if (!response.ok) {
                throw new Error(`Failed to fetch map: ${response.status}`);
            }
            
            const mapData = await response.json();
            
            // Validate map structure
            if (!this.validateMapStructure(mapData)) {
                throw new Error(`Invalid map structure: ${mapName}`);
            }
            
            // Load tilesets used by this map
            await this.loadMapTilesets(mapData);
            
            // Process the map
            const processedMap = this.processMapData(mapName, mapData);
            
            this.loadedMaps.set(mapName, processedMap);
            console.log(`✅ Map loaded: ${mapName} (${mapData.width}×${mapData.height})`);
            
            return processedMap;
            
        } catch (error) {
            console.error(`❌ Failed to load map ${mapName}:`, error);
            
            // Create fallback map
            const fallbackMap = this.createFallbackMap(mapName);
            this.loadedMaps.set(mapName, fallbackMap);
            
            return fallbackMap;
        }
    }

    // Load tilesets referenced by a map
    async loadMapTilesets(mapData) {
        if (!mapData.tilesets) return;
        
        const loadPromises = mapData.tilesets.map(async (tilesetRef) => {
            // Skip if already loaded
            if (this.loadedTilesets.has(tilesetRef.firstgid)) {
                return;
            }
            
            // Determine tileset image path
            let imagePath = '';
            let tilesetName = '';
            
            if (tilesetRef.source) {
                // External tileset file (.tsx) - convert to image path
                tilesetName = tilesetRef.source.replace('.tsx', '').replace('../tilesets/', '');
                imagePath = `assets/tilesets/${tilesetName}.png`;
            } else if (tilesetRef.image) {
                // Embedded tileset with direct image reference
                imagePath = tilesetRef.image;
                tilesetName = tilesetRef.name || 'unknown';
            }
            
            if (imagePath) {
                await this.loadTilesetImage({
                    name: tilesetName,
                    firstgid: tilesetRef.firstgid,
                    imagePath: imagePath,
                    tilewidth: tilesetRef.tilewidth || 32,
                    tileheight: tilesetRef.tileheight || 32
                });
            }
        });
        
        await Promise.all(loadPromises);
    }

    // Load a single tileset image
    async loadTilesetImage(config) {
        return new Promise((resolve) => {
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
                
                console.log(`✅ Tileset ${config.name}: ${columns}×${rows} tiles (firstgid: ${config.firstgid})`);
                resolve();
            };
            
            image.onerror = () => {
                console.warn(`⚠️ Failed to load tileset: ${config.imagePath}`);
                resolve(); // Continue without this tileset
            };
            
            image.src = config.imagePath;
        });
    }

    // Process raw map data into our internal format
    processMapData(mapName, mapData) {
        const processedMap = {
            name: mapName,
            width: mapData.width,
            height: mapData.height,
            tilewidth: mapData.tilewidth || 32,
            tileheight: mapData.tileheight || 32,
            layers: {},
            layerOrder: [], // Preserve original layer order
            collisionMap: null,
            properties: mapData.properties || {},
            rawData: mapData
        };
        
        // Process layers
        mapData.layers.forEach((layer, index) => {
            processedMap.layers[layer.name] = {
                ...layer,
                index: index // Preserve original index for rendering order
            };
            processedMap.layerOrder.push(layer.name);
        });
        
        // Generate collision map
        processedMap.collisionMap = this.generateCollisionMap(processedMap);
        
        return processedMap;
    }

    // Generate collision map based on rules and tile data
    generateCollisionMap(processedMap) {
        const { width, height, layers } = processedMap;
        const collisionMap = Array(height).fill().map(() => 
            Array(width).fill(false)
        );
        
        // Apply collision rules for each layer
        Object.entries(layers).forEach(([layerName, layer]) => {
            if (!layer.data) return;
            
            const rule = this.collisionRules[layerName];
            if (rule === undefined) return; // Unknown layer, skip
            
            for (let i = 0; i < layer.data.length; i++) {
                const tileId = layer.data[i];
                if (tileId === 0) continue; // Empty tile
                
                const x = i % width;
                const y = Math.floor(i / width);
                
                if (rule === true) {
                    // Check for exceptions in passable objects
                    if (layerName === 'objects' && this.passableObjectIds.has(tileId)) {
                        continue; // This specific object is passable
                    }
                    collisionMap[y][x] = true;
                }
                // rule === false means never solid, so we don't set collision
            }
        });
        
        // Log collision statistics
        let solidCount = 0;
        collisionMap.forEach(row => {
            row.forEach(cell => { if (cell) solidCount++; });
        });
        const totalTiles = width * height;
        const passablePercent = Math.round((totalTiles - solidCount) / totalTiles * 100);
        console.log(`🎯 ${processedMap.name}: ${solidCount} solid, ${totalTiles - solidCount} passable (${passablePercent}% passable)`);
        
        return collisionMap;
    }

    // Validate map structure
    validateMapStructure(mapData) {
        const requiredProps = ['width', 'height', 'layers'];
        const hasRequired = requiredProps.every(prop => mapData.hasOwnProperty(prop));
        
        if (!hasRequired) {
            console.error('Map missing required properties:', requiredProps);
            return false;
        }
        
        // Check for at least a ground layer
        const layerNames = mapData.layers.map(layer => layer.name);
        if (!layerNames.includes('ground')) {
            console.error('Map must have a "ground" layer');
            return false;
        }
        
        console.log(`📋 Map layers: ${layerNames.join(', ')}`);
        return true;
    }

    // Create a simple fallback map
    createFallbackMap(mapName) {
        const width = 25;
        const height = 25;
        const groundTile = 17; // Grass
        
        return {
            name: mapName,
            width: width,
            height: height,
            tilewidth: 32,
            tileheight: 32,
            layers: {
                ground: {
                    name: 'ground',
                    data: Array(width * height).fill(groundTile),
                    visible: true,
                    index: 0
                }
            },
            layerOrder: ['ground'],
            collisionMap: Array(height).fill().map(() => Array(width).fill(false)),
            properties: {},
            rawData: null
        };
    }

    // Get the appropriate tileset for a given tile ID
    getTilesetForGid(gid) {
        let bestMatch = null;
        let bestFirstgid = 0;
        
        for (const [firstgid, tileset] of this.loadedTilesets) {
            if (gid >= firstgid && firstgid > bestFirstgid) {
                bestMatch = tileset;
                bestFirstgid = firstgid;
            }
        }
        
        return bestMatch;
    }

    // Get drawing information for a tile
    getTileDrawInfo(tileId) {
        if (tileId === 0) {
            return null; // Empty tile
        }
        
        const tileset = this.getTilesetForGid(tileId);
        
        if (tileset) {
            const localId = tileId - tileset.firstgid;
            const sourceX = (localId % tileset.columns) * tileset.tilewidth;
            const sourceY = Math.floor(localId / tileset.columns) * tileset.tileheight;
            
            return {
                type: 'image',
                image: tileset.image,
                sourceX: sourceX,
                sourceY: sourceY,
                sourceWidth: tileset.tilewidth,
                sourceHeight: tileset.tileheight
            };
        } else {
            // Fallback to color
            const color = this.getFallbackColor(tileId);
            if (color) {
                return {
                    type: 'color',
                    color: color
                };
            }
        }
        
        return null;
    }

    // Get fallback color for a tile ID
    getFallbackColor(tileId) {
        // Check specific colors first
        if (this.fallbackColors[tileId]) {
            return this.fallbackColors[tileId];
        }
        
        // Then check ranges
        if (tileId >= 1 && tileId <= 256) {
            return '#4a7c59'; // Default grass color
        } else if (tileId >= 257 && tileId <= 512) {
            return '#228B22'; // Default tree color
        } else if (tileId >= 513) {
            return '#8B4513'; // Default building color
        }
        
        return '#666666'; // Default gray
    }

    // Public API Methods

    // Get map data
    getMap(mapName) {
        return this.loadedMaps.get(mapName);
    }

    // Get map dimensions
    getMapDimensions(mapName) {
        const map = this.loadedMaps.get(mapName);
        if (!map) return null;
        
        return {
            width: map.width,
            height: map.height,
            tilewidth: map.tilewidth,
            tileheight: map.tileheight,
            pixelWidth: map.width * map.tilewidth,
            pixelHeight: map.height * map.tileheight
        };
    }

    // Check if a tile position is solid
    isSolid(mapName, tileX, tileY) {
        const map = this.loadedMaps.get(mapName);
        if (!map || !map.collisionMap) return true; // Unknown = solid
        
        // Bounds check
        if (tileX < 0 || tileX >= map.width || tileY < 0 || tileY >= map.height) {
            return true; // Out of bounds = solid
        }
        
        return map.collisionMap[tileY][tileX];
    }

    // Check if a world position is solid
    isSolidPixel(mapName, worldX, worldY) {
        const map = this.loadedMaps.get(mapName);
        if (!map) return true;
        
        const tileX = Math.floor(worldX / map.tilewidth);
        const tileY = Math.floor(worldY / map.tileheight);
        
        return this.isSolid(mapName, tileX, tileY);
    }

    // Get layers in render order
    getLayersInOrder(mapName) {
        const map = this.loadedMaps.get(mapName);
        if (!map) return [];
        
        return map.layerOrder.map(layerName => ({
            name: layerName,
            ...map.layers[layerName]
        }));
    }

    // Find a safe spawn position
    findSafeSpawnPosition(mapName, entityWidth, entityHeight, spawnZones = null) {
        const map = this.loadedMaps.get(mapName);
        if (!map) return null;
        
        const widthInTiles = Math.ceil(entityWidth / map.tilewidth);
        const heightInTiles = Math.ceil(entityHeight / map.tileheight);
        
        // Default spawn zones if none provided
        if (!spawnZones) {
            if (mapName === 'town') {
                spawnZones = [
                    { startX: 10, startY: 10, endX: 15, endY: 15 }, // Town center
                    { startX: 5, startY: 5, endX: 20, endY: 20 },   // Wider area
                    { startX: 2, startY: 2, endX: 23, endY: 23 }    // Almost full map
                ];
            } else {
                spawnZones = [
                    { startX: 5, startY: 5, endX: 20, endY: 20 },   // Central area
                    { startX: 2, startY: 2, endX: 23, endY: 23 }    // Wider area
                ];
            }
        }
        
        // Try each spawn zone
        for (const zone of spawnZones) {
            const attempts = 50;
            
            for (let i = 0; i < attempts; i++) {
                const tileX = Math.floor(Math.random() * (zone.endX - zone.startX)) + zone.startX;
                const tileY = Math.floor(Math.random() * (zone.endY - zone.startY)) + zone.startY;
                
                // Check if all tiles the entity would occupy are clear
                let canSpawn = true;
                
                for (let dy = 0; dy < heightInTiles; dy++) {
                    for (let dx = 0; dx < widthInTiles; dx++) {
                        const checkX = tileX + dx;
                        const checkY = tileY + dy;
                        
                        if (this.isSolid(mapName, checkX, checkY)) {
                            canSpawn = false;
                            break;
                        }
                    }
                    if (!canSpawn) break;
                }
                
                if (canSpawn) {
                    return {
                        x: tileX * map.tilewidth,
                        y: tileY * map.tileheight
                    };
                }
            }
        }
        
        // Fallback position
        console.warn(`No safe spawn found in ${mapName}`);
        return {
            x: map.tilewidth * 12,
            y: map.tileheight * 12
        };
    }

    // Add a specific tile ID to the passable list
    addPassableTileId(tileId) {
        this.passableObjectIds.add(tileId);
        
        // Regenerate collision maps for all loaded maps
        for (const [mapName, map] of this.loadedMaps) {
            map.collisionMap = this.generateCollisionMap(map);
        }
    }

    // Get tile info at a specific position
    getTileAt(mapName, layerName, tileX, tileY) {
        const map = this.loadedMaps.get(mapName);
        if (!map || !map.layers[layerName]) return 0;
        
        const layer = map.layers[layerName];
        if (!layer.data) return 0;
        
        const index = tileY * map.width + tileX;
        return layer.data[index] || 0;
    }
}