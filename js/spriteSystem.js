// spriteSystem.js - Proper sprite rendering implementation
import CONFIG from './config.js';

export class SpriteSystem {
    constructor() {
        this.spriteSheets = new Map();
        this.spriteConfigs = new Map();
    }

    // Load a sprite sheet image
    async loadSpriteSheet(name, imagePath) {
        return new Promise((resolve, reject) => {
            const image = new Image();
            
            image.onload = () => {
                this.spriteSheets.set(name, image);
                console.log(`✅ Sprite sheet loaded: ${name} (${image.width}x${image.height})`);
                resolve(image);
            };
            
            image.onerror = () => {
                console.error(`❌ Failed to load sprite sheet: ${name}`);
                reject(new Error(`Failed to load ${imagePath}`));
            };
            
            image.src = imagePath;
        });
    }

    // Configure sprites for a character
    configureSpriteSet(characterName, config) {
        this.spriteConfigs.set(characterName, config);
    }

    // Get sprite configuration
    getSpriteConfig(characterName) {
        return this.spriteConfigs.get(characterName);
    }

    // Draw a specific sprite frame
    drawSprite(ctx, characterName, animationName, frameIndex, x, y, scale = 1) {
    const config = this.spriteConfigs.get(characterName);
    const spriteSheet = this.spriteSheets.get(config?.sheetName);
    
    if (!config || !spriteSheet) {
        this.drawFallback(ctx, x, y, CONFIG.TILE_SIZE * 0.8, CONFIG.TILE_SIZE * 0.8);
        return;
    }
    
    const animation = config.animations[animationName];
    if (!animation) {
        console.warn(`Animation '${animationName}' not found for ${characterName}`);
        return;
    }
    
    // Get the specific frame
    const frame = animation.frames[frameIndex % animation.frames.length];
    
    // Source rectangle on sprite sheet
    const sx = frame.x;
    const sy = frame.y;
    const sw = config.frameWidth;
    const sh = config.frameHeight;
    
    // Destination size - match the entity size
    const dw = CONFIG.TILE_SIZE * 0.8 * scale;
    const dh = CONFIG.TILE_SIZE * 0.8 * scale;
    
    // Draw sprite at entity position (x, y)
    // No offset needed - just draw at the entity's position
    const dx = x;
    const dy = y;
    
    ctx.imageSmoothingEnabled = false; // Pixel art
    ctx.drawImage(spriteSheet, sx, sy, sw, sh, dx, dy, dw, dh);
    
    // Debug: Draw entity bounds
    if (CONFIG.DEBUG_MODE && window.DEBUG_SPRITES) {
        ctx.strokeStyle = 'rgba(255, 0, 0, 0.5)';
        ctx.lineWidth = 2;
        ctx.strokeRect(x, y, CONFIG.TILE_SIZE * 0.8, CONFIG.TILE_SIZE * 0.8);
    }
}

    // Fallback colored rectangle
    drawFallback(ctx, x, y, width, height, color = '#ff00ff') {
        ctx.fillStyle = color;
        ctx.fillRect(x, y, width, height);
    }
}

// Helper class to manage sprite animation state
export class SpriteAnimator {
    constructor(characterName, spriteSystem) {
        this.characterName = characterName;
        this.spriteSystem = spriteSystem;
        this.currentAnimation = 'idle_down';
        this.currentFrame = 0;
        this.frameTimer = 0;
        this.isMoving = false;
        this.lastDirection = 'down';
    }
    
    update(deltaTime, isMoving, direction) {
        this.isMoving = isMoving;
        
        // Determine animation based on movement and direction
        const animationPrefix = isMoving ? 'walk' : 'idle';
        const newAnimation = `${animationPrefix}_${direction}`;
        
        // Reset frame if animation changed
        if (newAnimation !== this.currentAnimation) {
            this.currentAnimation = newAnimation;
            this.currentFrame = 0;
            this.frameTimer = 0;
        }
        
        // Update animation frame
        if (isMoving) {
            const config = this.spriteSystem.getSpriteConfig(this.characterName);
            const animation = config?.animations[this.currentAnimation];
            
            if (animation && animation.frameDuration) {
                this.frameTimer += deltaTime;
                
                if (this.frameTimer >= animation.frameDuration) {
                    this.frameTimer = 0;
                    this.currentFrame = (this.currentFrame + 1) % animation.frames.length;
                }
            }
        }
        
        this.lastDirection = direction;
    }
    
    draw(ctx, x, y, scale = 1) {
        this.spriteSystem.drawSprite(
            ctx,
            this.characterName,
            this.currentAnimation,
            this.currentFrame,
            x,
            y,
            scale
        );
    }
}

// Sprite configuration
// IMPORTANT: You need to verify these coordinates match your actual sprite sheet!
export const CHARACTER_SPRITE_CONFIG = {
    // Player character - using the character in column 0
    'player_male_1': {
        sheetName: 'characters',
        frameWidth: 32,
        frameHeight: 32,
        animations: {
            'idle_down': { 
                frames: [{ x: 0, y: 0 }] 
            },
            'idle_left': { 
                frames: [{ x: 0, y: 32 }] 
            },
            'idle_right': { 
                frames: [{ x: 0, y: 64 }] 
            },
            'idle_up': { 
                frames: [{ x: 0, y: 96 }] 
            },
            'walk_down': { 
                frames: [
                    { x: 0, y: 0 },
                    { x: 32, y: 0 },
                    { x: 64, y: 0 }
                ],
                frameDuration: 200
            },
            'walk_left': { 
                frames: [
                    { x: 0, y: 32 },
                    { x: 32, y: 32 },
                    { x: 64, y: 32 }
                ],
                frameDuration: 200
            },
            'walk_right': { 
                frames: [
                    { x: 0, y: 64 },
                    { x: 32, y: 64 },
                    { x: 64, y: 64 }
                ],
                frameDuration: 200
            },
            'walk_up': { 
                frames: [
                    { x: 0, y: 96 },
                    { x: 32, y: 96 },
                    { x: 64, y: 96 }
                ],
                frameDuration: 200
            }
        }
    },
    
    // Elara - using the pink-haired character (column 9)
    'npc_elara': {
        sheetName: 'characters',
        frameWidth: 32,
        frameHeight: 32,
        animations: {
            'idle_down': { frames: [{ x: 288, y: 128 }] },
            'idle_left': { frames: [{ x: 288, y: 160 }] },
            'idle_right': { frames: [{ x: 288, y: 192 }] },
            'idle_up': { frames: [{ x: 288, y: 224 }] },
            'walk_down': { 
                frames: [
                    { x: 288, y: 128 },
                    { x: 320, y: 128 },
                    { x: 352, y: 128 }
                ],
                frameDuration: 200
            },
            'walk_left': { 
                frames: [
                    { x: 288, y: 160 },
                    { x: 320, y: 160 },
                    { x: 352, y: 160 }
                ],
                frameDuration: 200
            },
            'walk_right': { 
                frames: [
                    { x: 288, y: 192 },
                    { x: 320, y: 192 },
                    { x: 352, y: 192 }
                ],
                frameDuration: 200
            },
            'walk_up': { 
                frames: [
                    { x: 288, y: 224 },
                    { x: 320, y: 224 },
                    { x: 352, y: 224 }
                ],
                frameDuration: 200
            }
        }
    },
    
    // Grimm - using the bearded character (column 3)
    'npc_grimm': {
        sheetName: 'characters',
        frameWidth: 32,
        frameHeight: 32,
        animations: {
            'idle_down': { frames: [{ x: 96, y: 0 }] },
            'idle_left': { frames: [{ x: 96, y: 32 }] },
            'idle_right': { frames: [{ x: 96, y: 64 }] },
            'idle_up': { frames: [{ x: 96, y: 96 }] },
            'walk_down': { 
                frames: [
                    { x: 96, y: 0 },
                    { x: 128, y: 0 },
                    { x: 160, y: 0 }
                ],
                frameDuration: 200
            },
            'walk_left': { 
                frames: [
                    { x: 96, y: 32 },
                    { x: 128, y: 32 },
                    { x: 160, y: 32 }
                ],
                frameDuration: 200
            },
            'walk_right': { 
                frames: [
                    { x: 96, y: 64 },
                    { x: 128, y: 64 },
                    { x: 160, y: 64 }
                ],
                frameDuration: 200
            },
            'walk_up': { 
                frames: [
                    { x: 96, y: 96 },
                    { x: 128, y: 96 },
                    { x: 160, y: 96 }
                ],
                frameDuration: 200
            }
        }
    },
    
    // Maya - using the red-haired character (column 6)
    'npc_maya': {
        sheetName: 'characters',
        frameWidth: 32,
        frameHeight: 32,
        animations: {
            'idle_down': { frames: [{ x: 192, y: 128 }] },
            'idle_left': { frames: [{ x: 192, y: 160 }] },
            'idle_right': { frames: [{ x: 192, y: 192 }] },
            'idle_up': { frames: [{ x: 192, y: 224 }] },
            'walk_down': { 
                frames: [
                    { x: 192, y: 128 },
                    { x: 224, y: 128 },
                    { x: 256, y: 128 }
                ],
                frameDuration: 200
            },
            'walk_left': { 
                frames: [
                    { x: 192, y: 160 },
                    { x: 224, y: 160 },
                    { x: 256, y: 160 }
                ],
                frameDuration: 200
            },
            'walk_right': { 
                frames: [
                    { x: 192, y: 192 },
                    { x: 224, y: 192 },
                    { x: 256, y: 192 }
                ],
                frameDuration: 200
            },
            'walk_up': { 
                frames: [
                    { x: 192, y: 224 },
                    { x: 224, y: 224 },
                    { x: 256, y: 224 }
                ],
                frameDuration: 200
            }
        }
    }
};