// aiCharacter.js - Updated with Ollama integration
import CONFIG from './config.js';

export class AICharacter {
    constructor(name, personality, appearance) {
        this.name = name;
        this.personality = personality;
        this.appearance = appearance;
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
        this.speed = CONFIG.TILE_SIZE * 0.5;
        
        // New properties for enhanced AI
        this.currentMood = 'neutral';
        this.currentActivity = null;
        this.homeScreen = 'town';
        this.lastInteraction = null;
        this.behaviorState = 'idle';
    }
    
    makeDecision() {
        // This will be overridden by EnhancedAICharacter
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

// Export a factory function for creating enhanced characters
export function createEnhancedCharacter(name, config, ollamaIntegration) {
    // Import here to avoid circular dependency
    const { EnhancedAICharacter } = ollamaIntegration;
    
    const baseCharacter = new AICharacter(name, config.personality, config.appearance);
    
    // Set initial position if provided
    if (config.startPos) {
        baseCharacter.position = {
            x: config.startPos.x * CONFIG.TILE_SIZE,
            y: config.startPos.y * CONFIG.TILE_SIZE
        };
    }
    
    // Set home screen if provided
    if (config.homeScreen) {
        baseCharacter.homeScreen = config.homeScreen;
    }
    
    console.log(`Creating character ${name}, Ollama available: ${ollamaIntegration?.isAvailable}`);
    
    // Return enhanced character if Ollama is available
    if (ollamaIntegration && ollamaIntegration.isAvailable) {
        const enhanced = new EnhancedAICharacter(baseCharacter, ollamaIntegration);
        console.log(`${name} has generateDialogue method:`, typeof enhanced.generateDialogue === 'function');
        return enhanced;
    }
    
    console.log(`Returning base character for ${name} (no Ollama)`);
    return baseCharacter;
}