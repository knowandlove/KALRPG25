// physics.js - Shared physics and movement utilities
import CONFIG from './config.js';

export class Physics {
    // Check if an entity can move to a position (multi-point collision)
    static canMoveTo(entity, newX, newY, worldEngine) {
        // Check all four corners of the entity's bounding box
        const points = [
            { x: newX, y: newY },                                       // Top-left
            { x: newX + entity.width, y: newY },                       // Top-right
            { x: newX, y: newY + entity.height },                      // Bottom-left
            { x: newX + entity.width, y: newY + entity.height },       // Bottom-right
            { x: newX + entity.width / 2, y: newY + entity.height / 2 } // Center
        ];
        
        // Check each point for collision
        for (const point of points) {
            if (worldEngine.isSolidTile(point.x, point.y)) {
                return false;
            }
        }
        
        // Check world bounds
        const dims = worldEngine.getCurrentScreenDimensions();
        if (newX < 0 || newY < 0 || 
            newX + entity.width > dims.pixelWidth || 
            newY + entity.height > dims.pixelHeight) {
            return false;
        }
        
        return true;
    }
    
    // Attempt to move an entity, handling collision
    static moveEntity(entity, dx, dy, deltaTime, worldEngine) {
        // Calculate desired position based on time-based movement
        const moveSpeed = entity.speed || CONFIG.PLAYER_SPEED;
        const deltaSeconds = deltaTime / 1000;
        
        const moveX = dx * moveSpeed * deltaSeconds;
        const moveY = dy * moveSpeed * deltaSeconds;
        
        const targetX = entity.x + moveX;
        const targetY = entity.y + moveY;
        
        // Try to move to the target position
        let actualX = entity.x;
        let actualY = entity.y;
        
        // Try X movement
        if (this.canMoveTo(entity, targetX, entity.y, worldEngine)) {
            actualX = targetX;
        }
        
        // Try Y movement
        if (this.canMoveTo(entity, actualX, targetY, worldEngine)) {
            actualY = targetY;
        }
        
        // Update entity position
        entity.x = actualX;
        entity.y = actualY;
        
        // Return whether movement occurred
        return actualX !== entity.x || actualY !== entity.y;
    }
    
    // Apply knockback to an entity
    static applyKnockback(entity, knockbackVx, knockbackVy, deltaTime, worldEngine) {
        const deltaSeconds = deltaTime / 1000;
        const moveX = knockbackVx * deltaSeconds;
        const moveY = knockbackVy * deltaSeconds;
        
        const targetX = entity.x + moveX;
        const targetY = entity.y + moveY;
        
        // Apply knockback with collision
        if (this.canMoveTo(entity, targetX, entity.y, worldEngine)) {
            entity.x = targetX;
        } else {
            // Hit wall, reverse velocity
            knockbackVx *= -0.5;
        }
        
        if (this.canMoveTo(entity, entity.x, targetY, worldEngine)) {
            entity.y = targetY;
        } else {
            // Hit wall, reverse velocity
            knockbackVy *= -0.5;
        }
        
        return { vx: knockbackVx, vy: knockbackVy };
    }
    
    // Calculate normalized direction vector
    static getDirection(fromX, fromY, toX, toY) {
        const dx = toX - fromX;
        const dy = toY - fromY;
        const distance = Math.sqrt(dx * dx + dy * dy);
        
        if (distance === 0) {
            return { x: 0, y: 0, distance: 0 };
        }
        
        return {
            x: dx / distance,
            y: dy / distance,
            distance: distance
        };
    }
    
    // Get entity center position
    static getCenter(entity) {
        return {
            x: entity.x + entity.width / 2,
            y: entity.y + entity.height / 2
        };
    }
    
    // Check if two entities are colliding
    static areColliding(entity1, entity2) {
        return entity1.x < entity2.x + entity2.width &&
               entity1.x + entity1.width > entity2.x &&
               entity1.y < entity2.y + entity2.height &&
               entity1.y + entity1.height > entity2.y;
    }
    
    // Get distance between two entities (center to center)
    static getDistance(entity1, entity2) {
        const center1 = this.getCenter(entity1);
        const center2 = this.getCenter(entity2);
        
        const dx = center2.x - center1.x;
        const dy = center2.y - center1.y;
        
        return Math.sqrt(dx * dx + dy * dy);
    }
    
    // Keep entity within world bounds
    static clampToWorldBounds(entity, worldEngine) {
        const dims = worldEngine.getCurrentScreenDimensions();
        
        entity.x = Math.max(0, Math.min(entity.x, dims.pixelWidth - entity.width));
        entity.y = Math.max(0, Math.min(entity.y, dims.pixelHeight - entity.height));
    }
}