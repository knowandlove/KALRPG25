// player.js
import CONFIG from './config.js';
import { Physics } from './physics.js';
import { SpriteAnimator } from './spriteSystem.js';

export default class Player {
    constructor(initialX, initialY, spriteSystem = null) {
        // Core Position and Appearance
        this.x = initialX;
        this.y = initialY;
        this.width = CONFIG.TILE_SIZE * 0.75; // Slightly smaller than a tile
        this.height = CONFIG.TILE_SIZE * 0.75;
        this.speed = CONFIG.PLAYER_SPEED; // From config.js
        this.facing = 'down'; // 'up', 'down', 'left', 'right'
        
        // Sprite animation
        this.spriteAnimator = spriteSystem ? 
            new SpriteAnimator('player_male_1', spriteSystem) : null;
        this.isMoving = false;

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
    }

    update(deltaTime, inputActions, worldEngine) {
        // Handle knockback first
        if (this.knockback.active) {
            this.knockback.timer += deltaTime;
            
            // Apply knockback using physics utility
            const newVelocity = Physics.applyKnockback(
                this, 
                this.knockback.vx, 
                this.knockback.vy, 
                deltaTime, 
                worldEngine
            );
            
            this.knockback.vx = newVelocity.vx * this.knockback.friction;
            this.knockback.vy = newVelocity.vy * this.knockback.friction;
            
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
            this.isMoving = false;

            if (inputActions.up) {
                moveY = -1;
                this.facing = 'up';
                this.isMoving = true;
            }
            if (inputActions.down) {
                moveY = 1;
                this.facing = 'down';
                this.isMoving = true;
            }
            if (inputActions.left) {
                moveX = -1;
                this.facing = 'left';
                this.isMoving = true;
            }
            if (inputActions.right) {
                moveX = 1;
                this.facing = 'right';
                this.isMoving = true;
            }

            // Normalize diagonal movement
            if (moveX !== 0 && moveY !== 0) {
                const length = Math.sqrt(moveX * moveX + moveY * moveY);
                moveX = moveX / length;
                moveY = moveY / length;
            }
            
            // Use physics utility for movement
            if (moveX !== 0 || moveY !== 0) {
                Physics.moveEntity(this, moveX, moveY, deltaTime, worldEngine);
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

        // Ensure player stays in bounds (redundant with physics, but just in case)
        Physics.clampToWorldBounds(this, worldEngine);
        
        // Update sprite animation
        if (this.spriteAnimator) {
            this.spriteAnimator.update(deltaTime, this.isMoving, this.facing);
        }
    }

    attemptAttack(worldEngine) {
        if (this.attackCooldown <= 0 && !this.isAttacking) {
            this.isAttacking = true;
            this.attackTimer = 0;
            this.attackCooldown = this.attackSpeed;

            // Define attack area based on facing direction
            let attackX, attackY, attackWidth, attackHeight;
            const attackReach = this.attackRange;

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
            
            // Create attack hitbox
            const attackHitbox = {
                x: attackX,
                y: attackY,
                width: attackWidth,
                height: attackHeight
            };
            
            // Check for hits against enemies
            worldEngine.enemies.forEach(enemy => {
                if (!enemy.dying && Physics.areColliding(attackHitbox, enemy)) {
                    const playerCenter = Physics.getCenter(this);
                    enemy.takeDamage(this.attackDamage, playerCenter.x, playerCenter.y);
                    
                    if (enemy.hp <= 0 && !enemy.dying) {
                        this.gainXP(enemy.xpValue || 25);
                        enemy.startDying();
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

            // Calculate knockback using physics utility
            const playerCenter = Physics.getCenter(this);
            const direction = Physics.getDirection(attackerX, attackerY, playerCenter.x, playerCenter.y);
            
            const knockbackForce = 300; // pixels per second
            this.knockback.active = true;
            this.knockback.vx = direction.x * knockbackForce;
            this.knockback.vy = direction.y * knockbackForce;
            this.knockback.timer = 0;
            
            if (this.hp <= 0) {
                this.hp = 0;
                this.die(worldEngine);
            }
        }
    }

    gainXP(amount) {
        this.xp += amount;
        this.checkLevelUp();
    }

    checkLevelUp() {
        if (this.xp >= this.xpToNext) {
            this.level++;
            this.xp -= this.xpToNext;
            this.xpToNext = Math.floor(this.xpToNext * 1.5);
            
            this.maxHp += 20;
            this.hp = this.maxHp; // Full heal on level up
            this.attackDamage += 5;
            
            console.log(`Player leveled up! Now level ${this.level}`);
        }
    }

    die(worldEngine) {
        console.log("Player has died!");
        worldEngine.addEvent("You have been defeated!");
        
        // Reset HP
        this.hp = this.maxHp;
        
        // Find a safe respawn position in town
        const respawnPos = worldEngine.findSafeSpawnPosition(this.width, this.height, 'town');
        
        if (respawnPos) {
            // Move to town if not already there
            if (worldEngine.currentScreen !== 'town') {
                worldEngine.currentScreen = 'town';
                worldEngine.addEvent("You wake up back in town...");
            }
            
            this.x = respawnPos.x;
            this.y = respawnPos.y;
        } else {
            // Fallback to town center area
            this.x = CONFIG.TILE_SIZE * 12;
            this.y = CONFIG.TILE_SIZE * 12;
            worldEngine.currentScreen = 'town';
        }
        
        // Reset states
        this.invulnerable = false;
        this.invulnerabilityTimer = 0;
        this.knockback.active = false;
        this.damageFlash = false;
        this.isAttacking = false;
        
        // Lose some XP as penalty
        const xpLoss = Math.floor(this.xp * 0.1); // Lose 10% of current XP
        this.xp = Math.max(0, this.xp - xpLoss);
        if (xpLoss > 0) {
            worldEngine.addEvent(`Lost ${xpLoss} XP...`);
        }
    }

    // Helper to get player's center, useful for some calculations
    get centerX() {
        return this.x + this.width / 2;
    }

    get centerY() {
        return this.y + this.height / 2;
    }
}