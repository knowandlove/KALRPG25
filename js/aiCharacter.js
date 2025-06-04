// aiCharacter.js - Fixed version with sprite support
import CONFIG from './config.js';
import { Physics } from './physics.js';
import { SpriteAnimator } from './spriteSystem.js';

export class AICharacter {
    constructor(name, personality, appearance, spriteSystem = null) {
        this.name = name;
        this.personality = personality;
        this.appearance = appearance;
        
        // Position - use x,y like other entities
        this.x = 15 * CONFIG.TILE_SIZE;
        this.y = 10 * CONFIG.TILE_SIZE;
        
        this.width = CONFIG.TILE_SIZE * 0.8;
        this.height = CONFIG.TILE_SIZE * 0.8;

        this.relationships = new Map();
        this.memories = [];
        this.currentGoal = null; 
        this.inventory = [];
        this.stats = {
            hp: 100,
            maxHp: 100,
            level: 1,
            exp: 0,
            strength: 10,
            intelligence: 10,
            charisma: 10
        };
        this.speed = CONFIG.NPC_SPEED || 80; // pixels per second
        
        // Basic AI properties
        this.currentMood = 'neutral';
        this.currentActivity = 'idle';
        this.homeScreen = 'town';
        this.lastInteraction = null;
        this.behaviorState = 'idle';
        
        // Movement properties
        this.moveTimer = 0;
        this.moveInterval = 3000 + Math.random() * 4000; // 3-7 seconds
        this.targetPosition = null;
        this.facing = 'down'; // Add facing direction
        this.isMoving = false; // Add movement state
        
        // Conversation flag
        this.isInConversation = false;
        
        // Schedule (time-based activities)
        this.schedule = this.createSchedule();
        
        // Sprite animation
        this.spriteAnimator = null;
        if (spriteSystem) {
            // Map NPC names to sprite configurations
            const spriteMap = {
                'Elara': 'npc_elara',
                'Grimm': 'npc_grimm',
                'Maya': 'npc_maya'
            };
            
            const spriteName = spriteMap[name];
            if (spriteName) {
                this.spriteAnimator = new SpriteAnimator(spriteName, spriteSystem);
            }
        }
    }
    
    // Getter for backwards compatibility with dialogue system
    get position() {
        return { x: this.x, y: this.y };
    }
    
    set position(pos) {
        this.x = pos.x;
        this.y = pos.y;
    }
    
    createSchedule() {
        // Define NPC schedules based on their role
        if (this.name === 'Grimm') {
            return {
                morning: { activity: 'working', location: 'forge' },
                afternoon: { activity: 'working', location: 'forge' },
                evening: { activity: 'resting', location: 'tavern' },
                night: { activity: 'sleeping', location: 'home' }
            };
        } else if (this.name === 'Elara') {
            return {
                morning: { activity: 'studying', location: 'library' },
                afternoon: { activity: 'exploring', location: 'town' },
                evening: { activity: 'studying', location: 'library' },
                night: { activity: 'reading', location: 'home' }
            };
        } else if (this.name === 'Maya') {
            return {
                morning: { activity: 'trading', location: 'market' },
                afternoon: { activity: 'trading', location: 'market' },
                evening: { activity: 'socializing', location: 'tavern' },
                night: { activity: 'counting coins', location: 'home' }
            };
        }
        
        // Default schedule
        return {
            morning: { activity: 'wandering', location: 'town' },
            afternoon: { activity: 'wandering', location: 'town' },
            evening: { activity: 'resting', location: 'town' },
            night: { activity: 'sleeping', location: 'home' }
        };
    }
    
    update(deltaTime, worldEngine) {
        // Don't update if in conversation
        if (this.isInConversation) return;
        
        // Update movement timer
        this.moveTimer += deltaTime;
        
        // Check if it's time to move
        if (this.moveTimer >= this.moveInterval) {
            // Always wander for now to test movement
            this.randomWander();
            this.moveTimer = 0;
            this.moveInterval = 2000 + Math.random() * 2000; // 2-4 seconds
        }
        
        // Move towards target if we have one
        if (this.targetPosition) {
            this.moveTowardsTarget(deltaTime, worldEngine);
        } else {
            this.isMoving = false;
        }
        
        // Update sprite animation
        if (this.spriteAnimator) {
            this.spriteAnimator.update(deltaTime, this.isMoving, this.facing);
        }
    }
    
    makeDecision(worldEngine) {
        // Get current time-based activity
        const timeOfDay = worldEngine.worldState.timeOfDay;
        const scheduledActivity = this.schedule[timeOfDay];
        
        // Debug log
        if (CONFIG.DEBUG_MODE && Math.random() < 0.1) {
            console.log(`${this.name} making decision: ${timeOfDay} - ${scheduledActivity?.activity || 'no activity'}`);
        }
        
        if (scheduledActivity) {
            this.currentActivity = scheduledActivity.activity;
            
            // Decide on movement based on activity
            switch (scheduledActivity.activity) {
                case 'working':
                case 'studying':
                case 'trading':
                    // Stay relatively still
                    this.smallMovement();
                    break;
                case 'exploring':
                case 'wandering':
                    // Move around more
                    this.randomWander();
                    break;
                case 'socializing':
                    // Move towards other NPCs
                    this.moveTowardsNearbyNPC(worldEngine);
                    break;
                case 'sleeping':
                case 'resting':
                    // Don't move
                    this.targetPosition = null;
                    this.isMoving = false;
                    break;
            }
        } else {
            this.randomWander();
        }
    }
    
    smallMovement() {
        // Small movement around current position
        const angle = Math.random() * Math.PI * 2;
        const distance = CONFIG.TILE_SIZE * (0.5 + Math.random() * 0.5);
        
        this.targetPosition = {
            x: this.x + Math.cos(angle) * distance,
            y: this.y + Math.sin(angle) * distance
        };
    }
    
    randomWander() {
        // Larger movement
        const directions = [
            { x: -1, y: 0 }, { x: 1, y: 0 },
            { x: 0, y: -1 }, { x: 0, y: 1 },
            { x: -1, y: -1 }, { x: 1, y: -1 },
            { x: -1, y: 1 }, { x: 1, y: 1 }
        ];
        
        const dir = directions[Math.floor(Math.random() * directions.length)];
        const distance = CONFIG.TILE_SIZE * (1 + Math.random() * 2);
        
        this.targetPosition = {
            x: this.x + dir.x * distance,
            y: this.y + dir.y * distance
        };
    }
    
    moveTowardsNearbyNPC(worldEngine) {
        // Find nearest NPC
        let nearestNPC = null;
        let nearestDistance = Infinity;
        
        for (const [name, npc] of worldEngine.friendlyNPCs) {
            if (npc !== this && npc.homeScreen === this.homeScreen) {
                const distance = Physics.getDistance(this, npc);
                
                if (distance < nearestDistance && distance < CONFIG.TILE_SIZE * 10) {
                    nearestNPC = npc;
                    nearestDistance = distance;
                }
            }
        }
        
        if (nearestNPC) {
            // Move towards them (but not too close)
            const dx = nearestNPC.x - this.x;
            const dy = nearestNPC.y - this.y;
            const stopDistance = CONFIG.TILE_SIZE * 2;
            
            if (nearestDistance > stopDistance) {
                this.targetPosition = {
                    x: this.x + dx * 0.5,
                    y: this.y + dy * 0.5
                };
            }
        } else {
            this.randomWander();
        }
    }
    
    moveTowardsTarget(deltaTime, worldEngine) {
        if (!this.targetPosition) return;
        
        const currentCenter = Physics.getCenter(this);
        const direction = Physics.getDirection(
            currentCenter.x,
            currentCenter.y,
            this.targetPosition.x,
            this.targetPosition.y
        );
        
        if (direction.distance < 5) {
            // Reached target
            this.targetPosition = null;
            this.isMoving = false;
            return;
        }
        
        // Update facing direction based on movement
        if (Math.abs(direction.x) > Math.abs(direction.y)) {
            this.facing = direction.x > 0 ? 'right' : 'left';
        } else {
            this.facing = direction.y > 0 ? 'down' : 'up';
        }
        
        this.isMoving = true;
        
        // Move towards target using physics system
        Physics.moveEntity(this, direction.x, direction.y, deltaTime, worldEngine);
        
        // If we didn't move (hit obstacle), pick new target
        const newCenter = Physics.getCenter(this);
        if (Math.abs(newCenter.x - currentCenter.x) < 0.1 && 
            Math.abs(newCenter.y - currentCenter.y) < 0.1) {
            this.targetPosition = null;
            this.isMoving = false;
        }
    }
    
    rememberEvent(event) {
        this.memories.push({
            timestamp: Date.now(),
            event: event,
            importance: this.calculateImportance(event)
        });
        
        if (this.memories.length > 50) {
            this.memories.shift();
        }
    }
    
    calculateImportance(event) {
        if (event.includes(this.name)) return 10;
        if (event.includes('combat') || event.includes('treasure')) return 8;
        if (event.includes('friend') || event.includes('relationship')) return 7;
        if (event.includes('talked') || event.includes('conversation')) return 6;
        return 5;
    }
    
    updateRelationship(otherName, change) {
        const current = this.relationships.get(otherName) || 0;
        const newValue = Math.max(-100, Math.min(100, current + change));
        this.relationships.set(otherName, newValue);
        
        // Log significant relationship changes
        if (Math.abs(change) > 10) {
            const descriptor = change > 0 ? 'improved' : 'worsened';
            this.rememberEvent(`Relationship with ${otherName} ${descriptor} significantly`);
        }
    }
    
    getRelationship(otherName) {
        return this.relationships.get(otherName) || 0;
    }
    
    getRecentMemories(count = 5) {
        return this.memories.slice(-count);
    }
}