// aiCharacter.js
import CONFIG from './config.js'; // Import CONFIG

export class AICharacter {
    constructor(name, personality, appearance) {
        this.name = name;
        this.personality = personality;
        this.appearance = appearance;
        // Default position in pixels, will be overwritten by WorldEngine on creation using startPos (tile coords)
        this.position = { x: 15 * CONFIG.TILE_SIZE, y: 10 * CONFIG.TILE_SIZE }; 
        
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
        this.speed = CONFIG.TILE_SIZE * 0.5; // Pixels per second for gradual movement
    }
    
    makeDecision() {
        // Placeholder for more complex decision making
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
        return 5;
    }
    
    updateRelationship(otherName, change) {
        const current = this.relationships.get(otherName) || 0;
        this.relationships.set(otherName, Math.max(-100, Math.min(100, current + change)));
    }
    
    getRelationship(otherName) {
        return this.relationships.get(otherName) || 0;
    }
    
    getRecentMemories(count = 5) {
        return this.memories.slice(-count);
    }
}
