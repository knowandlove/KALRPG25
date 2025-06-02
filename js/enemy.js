// enemy.js
import CONFIG from './config.js';

// Basic Enemy class
export default class Enemy {
    constructor(x, y, type = 'goblin') {
        this.x = x;
        this.y = y;
        this.type = type; // For different enemy types later

        // Dimensions - can be type-specific
        this.width = CONFIG.TILE_SIZE * 0.7;
        this.height = CONFIG.TILE_SIZE * 0.7;

        // Stats - inspired by kalrpgsinglev1.html EnemySystem.create
        this.hp = 50;
        this.maxHp = 50;
        this.damage = 15;
        this.speed = 1.5;
        this.xpValue = 25; // XP player gets for defeating this enemy

        // Combat - inspired by kalrpgsinglev1.html
        this.attackRange = CONFIG.TILE_SIZE * 0.8; // Slightly less than a tile
        this.attackCooldown = 0;
        this.attackSpeed = 1000; // Milliseconds

        // AI State - inspired by kalrpgsinglev1.html
        this.ai = {
            state: 'patrol', // 'patrol', 'chase'
            alertRange: CONFIG.TILE_SIZE * 5, // How close player needs to be to alert
            patrolTarget: null, // {x, y} for current patrol destination
            patrolTimer: 0,
            patrolChangeDirectionInterval: 3000 + Math.random() * 2000, // ms
        };

        // Visual feedback & State - inspired by kalrpgsinglev1.html
        this.damageFlash = false;
        this.damageFlashTimer = 0;
        this.damageFlashDuration = 150; // ms

        this.knockback = {
            active: false,
            vx: 0,
            vy: 0,
            timer: 0,
            duration: 300, // ms
            friction: 0.85
        };

        this.dying = false;
        this.deathTimer = 0;
        this.deathDuration = 500; // ms for death animation
    }

    update(deltaTime, player, worldEngine) {
        const deltaSeconds = deltaTime / 1000;

        if (this.dying) {
            this.deathTimer += deltaTime;
            return;
        }

        if (this.attackCooldown > 0) this.attackCooldown -= deltaTime;
        if (this.damageFlash) {
            this.damageFlashTimer += deltaTime;
            if (this.damageFlashTimer >= this.damageFlashDuration) {
                this.damageFlash = false;
                this.damageFlashTimer = 0;
            }
        }

        if (this.knockback.active) {
            this.knockback.timer += deltaTime;
            
            let newX = this.x + this.knockback.vx * deltaSeconds * 60;
            let newY = this.y + this.knockback.vy * deltaSeconds * 60;

            if (!worldEngine.isSolidTile(newX + this.width / 2, this.y + this.height / 2)) { // Simplified collision for knockback
                 this.x = newX;
                 this.y = newY;
            } else {
                this.knockback.vx *= -0.5; 
                this.knockback.vy *= -0.5;
            }
            
            this.knockback.vx *= this.knockback.friction;
            this.knockback.vy *= this.knockback.friction;

            if (Math.abs(this.knockback.vx) < 0.1 && Math.abs(this.knockback.vy) < 0.1) {
                this.knockback.active = false;
            }
            if (this.knockback.timer >= this.knockback.duration) {
                this.knockback.active = false;
            }
            return; 
        }

        // --- AI Logic ---
        let distanceToPlayer = Infinity; // Initialize with a large value
        if (player) { // Only run player-dependent AI if player exists
            distanceToPlayer = Math.sqrt( // Now distanceToPlayer is defined in this scope
                (player.x - this.x) ** 2 + (player.y - this.y) ** 2
            );

            if (distanceToPlayer <= this.ai.alertRange) {
                this.ai.state = 'chase';
            } else if (this.ai.state === 'chase' && distanceToPlayer > this.ai.alertRange * 1.5) {
                this.ai.state = 'patrol';
                this.ai.patrolTarget = null;
            }
        } else {
            this.ai.state = 'patrol';
            this.ai.patrolTarget = null; 
        }


        // Movement
        let moveX = 0;
        let moveY = 0;

        if (this.ai.state === 'chase' && player) { 
            if (distanceToPlayer > this.attackRange * 0.8) {
                const dx = player.x - this.x;
                const dy = player.y - this.y;
                if (distanceToPlayer > 0) { 
                    moveX = (dx / distanceToPlayer) * this.speed;
                    moveY = (dy / distanceToPlayer) * this.speed;
                }
            }
            // Check distanceToPlayer again before attempting attack
            if (distanceToPlayer <= this.attackRange && this.attackCooldown <= 0) {
                this.attemptAttack(player, worldEngine);
            }
        } else { // Patrol state
            this.ai.patrolTimer += deltaTime;
            if (!this.ai.patrolTarget || this.ai.patrolTimer >= this.ai.patrolChangeDirectionInterval) {
                const patrolRadius = CONFIG.TILE_SIZE * 3;
                const angle = Math.random() * Math.PI * 2;
                this.ai.patrolTarget = {
                    x: this.x + Math.cos(angle) * patrolRadius,
                    y: this.y + Math.sin(angle) * patrolRadius
                };
                this.ai.patrolTimer = 0;
            }

            if (this.ai.patrolTarget) {
                const dx = this.ai.patrolTarget.x - this.x;
                const dy = this.ai.patrolTarget.y - this.y;
                const distToTarget = Math.sqrt(dx * dx + dy * dy);
                if (distToTarget > this.speed * deltaSeconds * 60) { // Compare against potential movement in a frame
                     if (distToTarget > 0) { 
                        moveX = (dx / distToTarget) * this.speed * 0.7;
                        moveY = (dy / distToTarget) * this.speed * 0.7;
                     }
                } else {
                    this.ai.patrolTarget = null;
                }
            }
        }
        
        const targetX = this.x + moveX * deltaSeconds * 60; 
        const targetY = this.y + moveY * deltaSeconds * 60;

        // Basic collision for movement
        if (!worldEngine.isSolidTile(targetX + this.width / 2, this.y + this.height / 2)) { 
            this.x = targetX;
        }
        if (!worldEngine.isSolidTile(this.x + this.width / 2, targetY + this.height / 2)) { 
            this.y = targetY;
        }

        // Boundary clamping
        if (worldEngine.mapData && worldEngine.mapData.length > 0 && worldEngine.worldWidthTiles > 0 && worldEngine.worldHeightTiles > 0) {
            const worldPixelWidth = worldEngine.worldWidthTiles * CONFIG.TILE_SIZE;
            const worldPixelHeight = worldEngine.worldHeightTiles * CONFIG.TILE_SIZE;
            this.x = Math.max(0, Math.min(this.x, worldPixelWidth - this.width));
            this.y = Math.max(0, Math.min(this.y, worldPixelHeight - this.height));
        }
    }

    attemptAttack(player, worldEngine) { 
        if (this.attackCooldown <= 0 && player) { 
            player.takeDamage(this.damage, this.x + this.width / 2, this.y + this.height / 2, worldEngine);
            this.attackCooldown = this.attackSpeed;
        }
    }

    takeDamage(damageAmount, attackerX, attackerY) {
        if (this.dying) return; 

        this.hp -= damageAmount;
        this.damageFlash = true;
        this.damageFlashTimer = 0;

        const dx = (this.x + this.width / 2) - attackerX;
        const dy = (this.y + this.height / 2) - attackerY;
        const distance = Math.sqrt(dx * dx + dy * dy);

        if (distance > 0) {
            const knockbackForce = 4; 
            this.knockback.active = true;
            this.knockback.vx = (dx / distance) * knockbackForce;
            this.knockback.vy = (dy / distance) * knockbackForce;
            this.knockback.timer = 0;
        }

        if (this.hp <= 0) {
            this.hp = 0;
            this.startDying();
        }
    }

    startDying() {
        if (!this.dying) {
            this.dying = true;
            this.deathTimer = 0;
        }
    }
    
    get centerX() {
        return this.x + this.width / 2;
    }

    get centerY() {
        return this.y + this.height / 2;
    }
}
