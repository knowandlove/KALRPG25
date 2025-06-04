// enemy.js
import CONFIG from './config.js';
import { Physics } from './physics.js';

export default class Enemy {
    constructor(x, y, type = 'goblin') {
        this.x = x;
        this.y = y;
        this.type = type;

        // Dimensions
        this.width = CONFIG.TILE_SIZE * 0.7;
        this.height = CONFIG.TILE_SIZE * 0.7;

        // Stats
        this.hp = 50;
        this.maxHp = 50;
        this.damage = 15;
        this.speed = CONFIG.ENEMY_SPEED || 100; // pixels per second
        this.xpValue = 25;

        // Combat
        this.attackRange = CONFIG.TILE_SIZE * 0.8;
        this.attackCooldown = 0;
        this.attackSpeed = 1000; // Milliseconds

        // AI State
        this.ai = {
            state: 'patrol', // 'patrol', 'chase'
            alertRange: CONFIG.TILE_SIZE * 5,
            patrolTarget: null,
            patrolTimer: 0,
            patrolChangeInterval: 3000 + Math.random() * 2000,
        };

        // Visual feedback
        this.damageFlash = false;
        this.damageFlashTimer = 0;
        this.damageFlashDuration = 150;

        this.knockback = {
            active: false,
            vx: 0,
            vy: 0,
            timer: 0,
            duration: 300,
            friction: 0.85
        };

        this.dying = false;
        this.deathTimer = 0;
        this.deathDuration = 500;
    }

    update(deltaTime, player, worldEngine) {
        if (this.dying) {
            this.deathTimer += deltaTime;
            return;
        }

        // Update timers
        if (this.attackCooldown > 0) this.attackCooldown -= deltaTime;
        if (this.damageFlash) {
            this.damageFlashTimer += deltaTime;
            if (this.damageFlashTimer >= this.damageFlashDuration) {
                this.damageFlash = false;
                this.damageFlashTimer = 0;
            }
        }

        // Handle knockback
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
            return;
        }

        // AI Logic
        let distanceToPlayer = Infinity;
        if (player) {
            distanceToPlayer = Physics.getDistance(this, player);

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
        if (this.ai.state === 'chase' && player) {
            // Chase player
            if (distanceToPlayer > this.attackRange * 0.8) {
                const direction = Physics.getDirection(
                    this.x + this.width/2,
                    this.y + this.height/2,
                    player.x + player.width/2,
                    player.y + player.height/2
                );
                
                Physics.moveEntity(this, direction.x, direction.y, deltaTime, worldEngine);
            }
            
            // Attack if in range
            if (distanceToPlayer <= this.attackRange && this.attackCooldown <= 0) {
                this.attemptAttack(player, worldEngine);
            }
        } else {
            // Patrol behavior
            this.ai.patrolTimer += deltaTime;
            if (!this.ai.patrolTarget || this.ai.patrolTimer >= this.ai.patrolChangeInterval) {
                // Pick new patrol target
                const patrolRadius = CONFIG.TILE_SIZE * 3;
                const angle = Math.random() * Math.PI * 2;
                this.ai.patrolTarget = {
                    x: this.x + Math.cos(angle) * patrolRadius,
                    y: this.y + Math.sin(angle) * patrolRadius
                };
                this.ai.patrolTimer = 0;
                this.ai.patrolChangeInterval = 3000 + Math.random() * 2000;
            }

            if (this.ai.patrolTarget) {
                const direction = Physics.getDirection(
                    this.x + this.width/2,
                    this.y + this.height/2,
                    this.ai.patrolTarget.x,
                    this.ai.patrolTarget.y
                );
                
                if (direction.distance > 5) {
                    // Move slowly while patrolling
                    Physics.moveEntity(this, direction.x * 0.5, direction.y * 0.5, deltaTime, worldEngine);
                } else {
                    this.ai.patrolTarget = null;
                }
            }
        }

        // Ensure enemy stays in bounds
        Physics.clampToWorldBounds(this, worldEngine);
    }

    attemptAttack(player, worldEngine) {
        if (this.attackCooldown <= 0 && player) {
            const enemyCenter = Physics.getCenter(this);
            player.takeDamage(this.damage, enemyCenter.x, enemyCenter.y, worldEngine);
            this.attackCooldown = this.attackSpeed;
        }
    }

    takeDamage(damageAmount, attackerX, attackerY) {
        if (this.dying) return;

        this.hp -= damageAmount;
        this.damageFlash = true;
        this.damageFlashTimer = 0;

        // Calculate knockback
        const enemyCenter = Physics.getCenter(this);
        const direction = Physics.getDirection(attackerX, attackerY, enemyCenter.x, enemyCenter.y);

        const knockbackForce = 250; // pixels per second
        this.knockback.active = true;
        this.knockback.vx = direction.x * knockbackForce;
        this.knockback.vy = direction.y * knockbackForce;
        this.knockback.timer = 0;

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