// player.js
import CONFIG from './config.js';
// We might need to import a utility for collision detection from worldEngine or a utils.js later

export default class Player {
    constructor(initialX, initialY) {
        // Core Position and Appearance
        this.x = initialX;
        this.y = initialY;
        this.width = CONFIG.TILE_SIZE * 0.75; // Slightly smaller than a tile
        this.height = CONFIG.TILE_SIZE * 0.75;
        this.speed = CONFIG.PLAYER_SPEED; // From config.js
        this.facing = 'down'; // 'up', 'down', 'left', 'right'

        // Stats - from kalrpgsinglev1.html Player object
        this.hp = CONFIG.PLAYER_HP;
        this.maxHp = CONFIG.PLAYER_HP;
        this.level = 1;
        this.xp = 0;
        this.xpToNext = 100; // Initial XP for next level

        // Combat - from kalrpgsinglev1.html Player object
        this.attackDamage = 25;
        this.attackRange = CONFIG.TILE_SIZE * 1.2; // Slightly more than one tile
        this.attackCooldown = 0;
        this.attackSpeed = 500; // Milliseconds
        this.isAttacking = false;
        this.attackTimer = 0;
        this.attackDuration = 200; // Milliseconds for attack animation/action

        // Invulnerability - from kalrpgsinglev1.html Player object
        this.invulnerable = false;
        this.invulnerabilityTimer = 0;
        this.invulnerabilityDuration = 1000; // Milliseconds

        // Visual feedback - from kalrpgsinglev1.html Player object
        this.damageFlash = false;
        this.damageFlashTimer = 0;
        this.damageFlashDuration = 100; // Milliseconds

        // Knockback - from kalrpgsinglev1.html Player object
        this.knockback = {
            active: false,
            vx: 0,
            vy: 0,
            timer: 0,
            duration: 200, // Milliseconds
            friction: 0.88
        };

        // TODO: Inventory system can be added later
        // this.inventory = [];
    }

    update(deltaTime, inputActions, worldEngine) {
        const deltaSeconds = deltaTime / 1000; // Convert ms to seconds for speed calculations

        // Handle knockback first
        if (this.knockback.active) {
            this.knockback.timer += deltaTime;
            
            let newX = this.x + this.knockback.vx * deltaSeconds * 60; // Apply knockback (60fps assumption for force)
            let newY = this.y + this.knockback.vy * deltaSeconds * 60;

            // Collision checking during knockback
            if (!worldEngine.isSolidTile(newX + this.width / 2, this.y + this.height / 2) && // Check center
                !worldEngine.isSolidTile(newX, this.y) &&
                !worldEngine.isSolidTile(newX + this.width, this.y) &&
                !worldEngine.isSolidTile(newX, this.y + this.height) &&
                !worldEngine.isSolidTile(newX + this.width, this.y + this.height)
            ) {
                this.x = newX - (newX % 1); // Prevent sub-pixel issues by flooring
                this.y = newY - (newY % 1);
            } else {
                this.knockback.vx = 0; // Stop knockback on collision
                this.knockback.vy = 0;
            }
            
            this.knockback.vx *= this.knockback.friction;
            this.knockback.vy *= this.knockback.friction;
            
            if (Math.abs(this.knockback.vx) < 0.1 && Math.abs(this.knockback.vy) < 0.1) {
                 this.knockback.active = false;
            }
            if (this.knockback.timer >= this.knockback.duration) {
                this.knockback.active = false;
            }
        } else {
            // Normal movement based on inputActions (only if not in knockback)
            let moveX = 0;
            let moveY = 0;

            if (inputActions.up) {
                moveY -= this.speed;
                this.facing = 'up';
            }
            if (inputActions.down) {
                moveY += this.speed;
                this.facing = 'down';
            }
            if (inputActions.left) {
                moveX -= this.speed;
                this.facing = 'left';
            }
            if (inputActions.right) {
                moveX += this.speed;
                this.facing = 'right';
            }

            // Normalize diagonal movement (optional, but good practice)
            if (moveX !== 0 && moveY !== 0) {
                const length = Math.sqrt(moveX * moveX + moveY * moveY);
                moveX = (moveX / length) * this.speed;
                moveY = (moveY / length) * this.speed;
            }
            
            const targetX = this.x + moveX * deltaSeconds * 60; // 60fps reference for speed
            const targetY = this.y + moveY * deltaSeconds * 60;

            // Basic collision detection (can be improved)
            // Check X movement
            if (!worldEngine.isSolidTile(targetX + this.width / 2, this.y + this.height / 2) &&
                !worldEngine.isSolidTile(targetX, this.y) &&
                !worldEngine.isSolidTile(targetX + this.width, this.y) &&
                !worldEngine.isSolidTile(targetX, this.y + this.height) &&
                !worldEngine.isSolidTile(targetX + this.width, this.y + this.height)
            ) {
                this.x = targetX;
            }
            // Check Y movement
             if (!worldEngine.isSolidTile(this.x + this.width / 2, targetY + this.height / 2) &&
                !worldEngine.isSolidTile(this.x, targetY) &&
                !worldEngine.isSolidTile(this.x + this.width, targetY) &&
                !worldEngine.isSolidTile(this.x, targetY + this.height) &&
                !worldEngine.isSolidTile(this.x + this.width, targetY + this.height)
            ) {
                this.y = targetY;
            }
        }

        // Update timers
        if (this.attackCooldown > 0) this.attackCooldown -= deltaTime;
        
        if (this.isAttacking) {
            this.attackTimer += deltaTime;
            if (this.attackTimer >= this.attackDuration) {
                this.isAttacking = false;
                this.attackTimer = 0;
            }
        }
        
        if (this.invulnerable) {
            this.invulnerabilityTimer += deltaTime;
            if (this.invulnerabilityTimer >= this.invulnerabilityDuration) {
                this.invulnerable = false;
                this.invulnerabilityTimer = 0;
            }
        }
        
        if (this.damageFlash) {
            this.damageFlashTimer += deltaTime;
            if (this.damageFlashTimer >= this.damageFlashDuration) {
                this.damageFlash = false;
                this.damageFlashTimer = 0;
            }
        }

        // Keep player within world bounds (assuming worldEngine has these properties)
        if (worldEngine.mapData && worldEngine.mapData.length > 0) {
            const worldPixelWidth = worldEngine.worldWidthTiles * CONFIG.TILE_SIZE;
            const worldPixelHeight = worldEngine.worldHeightTiles * CONFIG.TILE_SIZE;
            this.x = Math.max(0, Math.min(this.x, worldPixelWidth - this.width));
            this.y = Math.max(0, Math.min(this.y, worldPixelHeight - this.height));
        }
    }

    attemptAttack(worldEngine) {
        if (this.attackCooldown <= 0 && !this.isAttacking) {
            this.isAttacking = true;
            this.attackTimer = 0;
            this.attackCooldown = this.attackSpeed;

            // Define attack area based on facing direction
            let attackX, attackY, attackWidth, attackHeight;
            const attackReach = this.attackRange; // Use defined range

            switch (this.facing) {
                case 'up':
                    attackX = this.x + this.width / 2 - attackReach / 2;
                    attackY = this.y - attackReach;
                    attackWidth = attackReach;
                    attackHeight = attackReach;
                    break;
                case 'down':
                    attackX = this.x + this.width / 2 - attackReach / 2;
                    attackY = this.y + this.height;
                    attackWidth = attackReach;
                    attackHeight = attackReach;
                    break;
                case 'left':
                    attackX = this.x - attackReach;
                    attackY = this.y + this.height / 2 - attackReach / 2;
                    attackWidth = attackReach;
                    attackHeight = attackReach;
                    break;
                case 'right':
                    attackX = this.x + this.width;
                    attackY = this.y + this.height / 2 - attackReach / 2;
                    attackWidth = attackReach;
                    attackHeight = attackReach;
                    break;
            }
            
            // Check for hits against enemies (worldEngine will need an enemies list and method)
            worldEngine.enemies.forEach(enemy => {
                if (!enemy.dying && // Don't hit dying enemies
                    enemy.x < attackX + attackWidth &&
                    enemy.x + enemy.width > attackX &&
                    enemy.y < attackY + attackHeight &&
                    enemy.y + enemy.height > attackY) {
                    
                    enemy.takeDamage(this.attackDamage, this.x, this.y); // Enemy needs a takeDamage method
                    // worldEngine.addEvent(`${this.name} hit ${enemy.name || 'an enemy'}!`); // Optional event
                    
                    if (enemy.hp <= 0 && !enemy.dying) { // Check if enemy died from this hit
                        this.gainXP(enemy.xpValue || 25); // Enemy should have an xpValue
                        enemy.startDying(); // Enemy needs a startDying method
                    }
                }
            });
        }
    }

    takeDamage(damage, attackerX, attackerY, worldEngine) {
        if (!this.invulnerable) {
            this.hp -= damage;
            this.invulnerable = true;
            this.invulnerabilityTimer = 0;
            this.damageFlash = true;
            this.damageFlashTimer = 0;
            
            // worldEngine.addEvent(`${this.name} took ${damage} damage!`); // Optional

            // Calculate knockback direction (from kalrpgsinglev1.html)
            const dx = (this.x + this.width / 2) - (attackerX); // Attacker X,Y should be their center
            const dy = (this.y + this.height / 2) - (attackerY);
            const distance = Math.sqrt(dx * dx + dy * dy);
            
            if (distance > 0) {
                const knockbackForce = 2.5; 
                this.knockback.active = true;
                this.knockback.vx = (dx / distance) * knockbackForce;
                this.knockback.vy = (dy / distance) * knockbackForce;
                this.knockback.timer = 0;
            }
            
            if (this.hp <= 0) {
                this.hp = 0;
                this.die(worldEngine);
            }
        }
    }

    gainXP(amount) {
        this.xp += amount;
        // worldEngine.addEvent(`${this.name} gained ${amount} XP!`); // Optional
        this.checkLevelUp();
    }

    checkLevelUp() { // From kalrpgsinglev1.html
        if (this.xp >= this.xpToNext) {
            this.level++;
            this.xp -= this.xpToNext;
            this.xpToNext = Math.floor(this.xpToNext * 1.5);
            
            this.maxHp += 20;
            this.hp = this.maxHp; // Full heal on level up
            this.attackDamage += 5;
            
            console.log(`Player leveled up! Now level ${this.level}`);
            // worldEngine.addEvent(`${this.name} reached Level ${this.level}!`); // Optional
        }
    }

    die(worldEngine) {
        console.log("Player has died!");
        // worldEngine.addEvent(`${this.name} has been defeated!`); // Optional
        // TODO: Implement respawn logic or game over state
        // For now, just reset HP and position to a safe spot
        this.hp = this.maxHp;
        // const respawnPos = worldEngine.findSafeSpawnPosition(); // worldEngine will need this
        // this.x = respawnPos.x;
        // this.y = respawnPos.y;
        this.x = CONFIG.TILE_SIZE * 5; // Temporary respawn
        this.y = CONFIG.TILE_SIZE * 5;
        this.invulnerable = false; // Reset invulnerability
        this.knockback.active = false;
    }

    // Helper to get player's center, useful for some calculations
    get centerX() {
        return this.x + this.width / 2;
    }

    get centerY() {
        return this.y + this.height / 2;
    }
}
