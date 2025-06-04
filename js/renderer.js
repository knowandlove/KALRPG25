// renderer.js - Refactored to only handle drawing
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
            // Calculate camera position based on target's actual world coordinates
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

    render(worldEngine, player, gameMode) {
        // Clear canvas with time-based background
        this.ctx.fillStyle = this.getTimeBasedBackgroundColor(worldEngine.worldState.timeOfDay);
        this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);

        // Get current screen dimensions
        const dims = worldEngine.getCurrentScreenDimensions();
        if (!dims) return; // No map loaded
        
        this.updateCamera(dims.pixelWidth, dims.pixelHeight);

        // Set up camera transform
        this.ctx.save();
        this.ctx.scale(this.camera.zoom, this.camera.zoom);
        this.ctx.translate(-this.camera.x, -this.camera.y);

        // Draw the current screen
        this.drawCurrentScreen(worldEngine);

        // Draw entities on current screen
        for (const [name, npc] of worldEngine.friendlyNPCs) {
            if (this.isEntityOnCurrentScreen(npc, worldEngine)) {
                this.drawFriendlyNPC(npc);
            }
        }

        // Draw enemies on current screen
        const currentEnemies = worldEngine.getCurrentScreenEnemies();
        currentEnemies.forEach(enemy => {
            this.drawEnemy(enemy);
        });

        // Draw player if in adventure mode
        if (gameMode === 'adventure' && player) {
            this.drawPlayer(player);
        }
        
        this.ctx.restore();

        // Update debug panel if available
        if (CONFIG.DEBUG_MODE && typeof window.updateDebugPanel === 'function') {
            window.updateDebugPanel(worldEngine, player, gameMode, this);
        }
    }

    isEntityOnCurrentScreen(entity, worldEngine) {
        const entityScreen = entity.homeScreen || 'town';
        return entityScreen === worldEngine.currentScreen;
    }

    drawCurrentScreen(worldEngine) {
        const tilemapSystem = worldEngine.tilemapSystem;
        const currentScreenName = worldEngine.currentScreen;
        const layers = tilemapSystem.getLayersInOrder(currentScreenName);
        
        if (!layers || layers.length === 0) {
            console.warn('⚠️ No layers to render for screen:', currentScreenName);
            return;
        }

        // Calculate visible tile range for culling
        const tileSize = CONFIG.TILE_SIZE;
        const startXTile = Math.floor(this.camera.x / tileSize);
        const endXTile = Math.ceil((this.camera.x + this.camera.width) / tileSize);
        const startYTile = Math.floor(this.camera.y / tileSize);
        const endYTile = Math.ceil((this.camera.y + this.camera.height) / tileSize);

        // Get map dimensions
        const dims = worldEngine.getCurrentScreenDimensions();
        
        // Render each layer in order
        layers.forEach(layer => {
            if (!layer.visible && layer.visible !== undefined) return;
            if (!layer.data) return;
            
            // Render visible tiles in this layer
            for (let y = startYTile; y <= endYTile && y < dims.height; y++) {
                if (y < 0) continue;
                
                for (let x = startXTile; x <= endXTile && x < dims.width; x++) {
                    if (x < 0) continue;
                    
                    const index = y * dims.width + x;
                    const tileId = layer.data[index];
                    
                    if (tileId > 0) {
                        this.drawTile(tilemapSystem, tileId, x * tileSize, y * tileSize);
                    }
                }
            }
        });
    }

    drawTile(tilemapSystem, tileId, x, y) {
        const drawInfo = tilemapSystem.getTileDrawInfo(tileId);
        
        if (!drawInfo) return;
        
        if (drawInfo.type === 'image') {
            // Draw from tileset image
            this.ctx.drawImage(
                drawInfo.image,
                drawInfo.sourceX,
                drawInfo.sourceY,
                drawInfo.sourceWidth,
                drawInfo.sourceHeight,
                x,
                y,
                CONFIG.TILE_SIZE,
                CONFIG.TILE_SIZE
            );
        } else if (drawInfo.type === 'color') {
            // Draw colored rectangle as fallback
            this.ctx.fillStyle = drawInfo.color;
            this.ctx.fillRect(x, y, CONFIG.TILE_SIZE, CONFIG.TILE_SIZE);
            
            // Debug grid lines if enabled
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
    // Try to draw sprite first
    if (player.spriteAnimator) {
        player.spriteAnimator.draw(this.ctx, player.x, player.y, 1.5); // Use scale 1.5
        
        // Draw attack animation overlay if attacking
        if (player.isAttacking) {
            this.drawAttackEffect(player);
        }
        
        // Draw damage/invulnerability effects
        if (player.damageFlash || player.invulnerable) {
            this.drawPlayerEffects(player);
        }
    } else {
        // Fallback to original rectangle drawing
        this.drawPlayerRectangle(player);
    }
}
    
    drawPlayerRectangle(player) {
        let playerColor = '#4169e1';
        if (player.damageFlash) {
            playerColor = '#ff4444';
        } else if (player.invulnerable) {
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
            this.drawAttackEffect(player);
        }
    }
    
    drawAttackEffect(player) {
        this.ctx.strokeStyle = '#ffd700'; 
        this.ctx.lineWidth = 3;
        const centerX = player.x + player.width / 2;
        const centerY = player.y + player.height / 2;
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
    
    drawPlayerEffects(player) {
        // Draw a semi-transparent overlay for damage/invulnerability
        this.ctx.save();
        
        if (player.damageFlash) {
            this.ctx.globalAlpha = 0.5;
            this.ctx.fillStyle = '#ff0000';
            this.ctx.fillRect(player.x - 2, player.y - 2, player.width + 4, player.height + 4);
        } else if (player.invulnerable && Math.floor(player.invulnerabilityTimer / 100) % 2) {
            this.ctx.globalAlpha = 0.3;
            this.ctx.fillStyle = '#ffffff';
            this.ctx.fillRect(player.x - 2, player.y - 2, player.width + 4, player.height + 4);
        }
        
        this.ctx.restore();
    }

drawFriendlyNPC(npc) {
    // Try to draw sprite first
    if (npc.spriteAnimator) {
        npc.spriteAnimator.draw(this.ctx, npc.x, npc.y, 1.5); // Use scale 1.5 for NPCs too
    } else {
        // Fallback to original circle/symbol rendering
        this.ctx.fillStyle = npc.appearance.color || '#cccccc';
        const npcSize = CONFIG.TILE_SIZE * 0.8;
        
        // Draw as circle
        this.ctx.beginPath();
        this.ctx.arc(
            npc.x + npc.width / 2, 
            npc.y + npc.height / 2, 
            npcSize / 2, 
            0, 
            Math.PI * 2
        );
        this.ctx.fill();
        
        // Draw symbol
        this.ctx.font = `${npcSize * 0.6}px Arial`; 
        this.ctx.textAlign = 'center'; 
        this.ctx.textBaseline = 'middle';
        this.ctx.fillStyle = '#000000';
        this.ctx.fillText(
            npc.appearance.symbol || '?', 
            npc.x + npc.width / 2, 
            npc.y + npc.height / 2
        );
    }
}
    drawEnemy(enemy) {
        if (enemy.dying) {
            // Death animation
            const deathProgress = enemy.deathTimer / enemy.deathDuration;
            this.ctx.globalAlpha = 1 - deathProgress;
            
            const scale = 1 - (deathProgress * 0.5);
            const scaledWidth = enemy.width * scale;
            const scaledHeight = enemy.height * scale;
            const offsetX = (enemy.width - scaledWidth) / 2;
            const offsetY = (enemy.height - scaledHeight) / 2;
            
            this.ctx.fillStyle = '#660000';
            this.ctx.fillRect(
                enemy.x + offsetX, 
                enemy.y + offsetY, 
                scaledWidth, 
                scaledHeight
            );
            
            this.ctx.globalAlpha = 1; 
            return;
        }
        
        // Draw enemy
        let enemyColor = '#8b0000';
        if (enemy.damageFlash) {
            enemyColor = '#ffaaaa';
        } else if (enemy.ai.state === 'chase') {
            enemyColor = '#dc143c';
        }
        
        this.ctx.fillStyle = enemyColor;
        this.ctx.fillRect(enemy.x, enemy.y, enemy.width, enemy.height);
        
        // Draw health bar
        const healthPercent = enemy.hp / enemy.maxHp;
        const barWidth = enemy.width;
        const barHeight = 5;
        const barY = enemy.y - 8;
        
        // Background
        this.ctx.fillStyle = '#333';
        this.ctx.fillRect(enemy.x, barY, barWidth, barHeight);
        
        // Health
        if (healthPercent > 0.5) {
            this.ctx.fillStyle = '#4caf50';
        } else if (healthPercent > 0.2) {
            this.ctx.fillStyle = '#ff9800';
        } else {
            this.ctx.fillStyle = '#f44336';
        }
        this.ctx.fillRect(enemy.x, barY, barWidth * healthPercent, barHeight);
    }
}