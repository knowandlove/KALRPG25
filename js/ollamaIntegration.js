// ollamaIntegration.js - Dynamic AI for NPCs
import CONFIG from './config.js';

export class OllamaIntegration {
    constructor() {
        this.baseURL = 'http://localhost:11434'; // Default Ollama API endpoint
        this.model = 'qwen3:latest'; // Updated to your Qwen3 model
        this.conversationHistory = new Map(); // Track conversations per NPC
        this.isAvailable = false;
        this.checkAvailability();
    }

    async checkAvailability() {
        try {
            console.log('Checking Ollama at:', this.baseURL);
            const response = await fetch(`${this.baseURL}/api/tags`);
            if (response.ok) {
                this.isAvailable = true;
                console.log('✅ Ollama API is available');
                const data = await response.json();
                console.log('Available models:', data.models?.map(m => m.name) || []);
                return true;
            } else {
                console.log('❌ Ollama responded with:', response.status);
                this.isAvailable = false;
                return false;
            }
        } catch (error) {
            console.warn('⚠️ Ollama not available:', error.message);
            this.isAvailable = false;
            return false;
        }
    }

    async generateResponse(prompt, context = {}) {
        if (!this.isAvailable) {
            return this.fallbackResponse(prompt, context);
        }

        try {
            const response = await fetch(`${this.baseURL}/api/generate`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    model: this.model,
                    prompt: prompt,
                    stream: false,
                    options: {
                        temperature: 0.8,
                        top_p: 0.9,
                        max_tokens: 150
                    }
                })
            });

            const data = await response.json();
            return data.response || this.fallbackResponse(prompt, context);
        } catch (error) {
            console.error('Ollama API error:', error);
            return this.fallbackResponse(prompt, context);
        }
    }

    fallbackResponse(prompt, context) {
        // Intelligent fallback system when Ollama isn't available
        const { action, character, worldState } = context;
        
        const responses = {
            greeting: [
                `Hello there, traveler! I'm ${character.name}.`,
                `Greetings! What brings you to ${worldState.currentLocation}?`,
                `Oh, hello! I didn't see you there.`
            ],
            idle: [
                `*${character.name} seems lost in thought*`,
                `*${character.name} is ${this.getActivityForPersonality(character.personality)}*`,
                `The ${worldState.timeOfDay} is quite peaceful, isn't it?`
            ],
            combat: [
                `Stay back! There's danger nearby!`,
                `Did you hear that? Something's coming...`,
                `We should be careful around here.`
            ]
        };

        const responseType = this.determineResponseType(context);
        const options = responses[responseType] || responses.idle;
        return options[Math.floor(Math.random() * options.length)];
    }

    getActivityForPersonality(personality) {
        if (personality.includes('scholar')) return 'reading a worn book';
        if (personality.includes('blacksmith')) return 'examining a piece of metal';
        if (personality.includes('merchant')) return 'counting coins';
        return 'gazing at the horizon';
    }

    determineResponseType(context) {
        if (context.action === 'greet') return 'greeting';
        if (context.enemiesNearby) return 'combat';
        return 'idle';
    }
}

// Enhanced AI Character with Ollama integration
export class EnhancedAICharacter {
    constructor(baseCharacter, ollamaIntegration) {
        // Copy all properties from base character
        Object.keys(baseCharacter).forEach(key => {
            this[key] = baseCharacter[key];
        });
        
        // Add Ollama integration
        this.ollama = ollamaIntegration;
        this.conversationCooldown = 0;
        this.lastDecisionTime = 0;
        this.decisionInterval = 45000 + Math.random() * 30000; // 45-75 seconds
        this.currentMood = 'neutral';
        this.currentActivity = null;
        
        // Add simple wander behavior
        this.wanderTimer = 0;
        this.wanderInterval = 3000 + Math.random() * 4000; // 3-7 seconds
        this.wanderTarget = null;
        
        // Ensure we have the base methods
        this.rememberEvent = (event) => baseCharacter.rememberEvent.call(this, event);
        this.getRecentMemories = (count) => baseCharacter.getRecentMemories.call(this, count);
        this.updateRelationship = (name, change) => baseCharacter.updateRelationship.call(this, name, change);
        this.getRelationship = (name) => baseCharacter.getRelationship.call(this, name);
        this.calculateImportance = (event) => baseCharacter.calculateImportance.call(this, event);
    }

    async makeIntelligentDecision(worldContext, deltaTime) {
        // Update timers
        this.lastDecisionTime += deltaTime;
        this.wanderTimer += deltaTime;
        
        // Simple wandering (frequent, no AI needed)
        if (this.wanderTimer >= this.wanderInterval && !this.currentActivity) {
            this.wanderTimer = 0;
            this.wanderInterval = 3000 + Math.random() * 4000; // Reset for next wander
            this.simpleWander(worldContext.worldEngine);
            return null; // Don't count as a major decision
        }
        
        // Major decisions (infrequent, uses AI)
        if (this.lastDecisionTime < this.decisionInterval) {
            return null;
        }
        
        this.lastDecisionTime = 0;
        // Randomize next decision time
        this.decisionInterval = 45000 + Math.random() * 30000; // 45-75 seconds

        const prompt = this.buildDecisionPrompt(worldContext);
        const response = await this.ollama.generateResponse(prompt, {
            character: this,
            worldState: worldContext,
            action: 'decision'
        });

        return this.parseDecisionResponse(response);
    }
    
    // Add simple wander method that doesn't use AI
    simpleWander(worldEngine) {
        if (!worldEngine) return;
        
        const directions = ['north', 'south', 'east', 'west'];
        const direction = directions[Math.floor(Math.random() * directions.length)];
        
        const movements = {
            'north': { x: 0, y: -1 },
            'south': { x: 0, y: 1 },
            'east': { x: 1, y: 0 },
            'west': { x: -1, y: 0 }
        };
        
        const move = movements[direction];
        const steps = 1 + Math.floor(Math.random() * 3); // Move 1-3 tiles
        
        for (let i = 0; i < steps; i++) {
            const newX = this.position.x + (move.x * CONFIG.TILE_SIZE);
            const newY = this.position.y + (move.y * CONFIG.TILE_SIZE);
            
            if (!worldEngine.isSolidTile(newX + this.width/2, newY + this.height/2)) {
                this.position.x = newX;
                this.position.y = newY;
            } else {
                break; // Stop if we hit a wall
            }
        }
    }

    buildDecisionPrompt(worldContext) {
        const recentMemories = this.getRecentMemories(3).map(m => m.event).join('; ');
        const relationships = this.getTopRelationships(3);
        
        return `You are ${this.name}, ${this.personality}.
Current location: ${worldContext.currentLocation}
Time: ${worldContext.timeOfDay}
Health: ${this.stats.hp}/${this.stats.maxHp}
Current mood: ${this.currentMood}
Recent events: ${recentMemories || 'Nothing notable'}
Important relationships: ${relationships}
Nearby: ${worldContext.nearbyEntities.join(', ') || 'Nobody'}

Based on your personality and current situation, what should you do next?
Respond with ONLY one of these actions and a brief reason:
- MOVE [direction] - Move in a direction (north/south/east/west)
- TALK [character] - Start conversation with someone nearby
- WORK - Do your job/profession
- REST - Take a break and recover
- EXPLORE - Wander and look for something interesting
- INTERACT [object] - Interact with something nearby

Format: ACTION: [action] | REASON: [brief reason]`;
    }

    parseDecisionResponse(response) {
        // Parse the AI response into actionable game commands
        const lines = response.split('|');
        const actionPart = lines[0]?.trim() || '';
        const reasonPart = lines[1]?.trim() || '';

        const actionMatch = actionPart.match(/ACTION:\s*(\w+)\s*(\w*)/i);
        if (!actionMatch) {
            return { action: 'EXPLORE', target: null, reason: 'Wandering aimlessly' };
        }

        return {
            action: actionMatch[1].toUpperCase(),
            target: actionMatch[2] || null,
            reason: reasonPart.replace(/REASON:\s*/i, '') || 'Just because'
        };
    }

    async generateDialogue(player, context) {
        if (this.conversationCooldown > 0) {
            return { 
                text: "...", 
                action: "waiting" 
            };
        }

        console.log('Generating dialogue for', this.name);
        
        try {
            const prompt = this.buildDialoguePrompt(player, context);
            const response = await this.ollama.generateResponse(prompt, {
                character: this,
                worldState: context,
                action: 'dialogue'
            });

            this.conversationCooldown = 2000; // 2 second cooldown
            const result = this.parseDialogueResponse(response, player);
            console.log('Dialogue response:', result);
            return result;
        } catch (error) {
            console.error('Error generating dialogue:', error);
            return {
                text: `Hello, ${player.name || 'traveler'}!`,
                emotion: 'neutral',
                action: 'greeting'
            };
        }
    }

    buildDialoguePrompt(player, context) {
        const relationship = this.getRelationship(player.name || 'Player');
        const mood = this.calculateMoodFromContext(context);
        
        return `You are ${this.name}, ${this.personality}.
Speaking to: ${player.name || 'an adventurer'}
Your relationship level: ${relationship} (-100 to 100)
Your current mood: ${mood}
Location: ${context.currentLocation}
Time: ${context.timeOfDay}

The player says: "${context.playerAction || 'Hello'}"

Important: Respond ONLY with what ${this.name} would say. Do not include any thinking, analysis, or stage directions.
Write only the character's spoken words, 1-3 sentences.
Be conversational and show personality.`;
    }

    parseDialogueResponse(response, player) {
        // Extract just the dialogue, removing any meta-text or thinking
        let text = response;
        
        // Remove common thinking patterns
        text = text.replace(/<think>[\s\S]*?<\/think>/gi, '');
        text = text.replace(/\[.*?\]/g, ''); // Remove bracketed thoughts
        text = text.replace(/\(.*?thinking.*?\)/gi, ''); // Remove parenthetical thinking
        
        // If response contains "Grimm:" or similar, extract just the dialogue
        const characterDialogueMatch = text.match(/(?:Grimm|Elara|Maya|The \w+):\s*["']?(.+?)["']?$/i);
        if (characterDialogueMatch) {
            text = characterDialogueMatch[1];
        }
        
        // Clean up the response
        text = text.trim()
            .replace(/^["']|["']$/g, '') // Remove quotes
            .replace(/\s+/g, ' ') // Normalize whitespace
            .substring(0, 300); // Allow longer responses
        
        // If we end up with no text or very short text, use a fallback
        if (!text || text.length < 5) {
            text = this.getFallbackDialogue(player, this.currentMood);
        }

        // Determine emotional impact
        const emotionalImpact = this.analyzeEmotionalImpact(text);
        
        // Update relationship based on interaction
        this.updateRelationship(player.name || 'Player', emotionalImpact);
        
        // Create memory of this interaction
        this.rememberEvent(`Talked with ${player.name || 'the adventurer'} about: "${text.substring(0, 50)}..."`);

        return {
            text: text,
            emotion: this.currentMood,
            action: emotionalImpact > 0 ? 'friendly' : emotionalImpact < 0 ? 'cold' : 'neutral'
        };
    }
    
    getFallbackDialogue(player, mood) {
        const fallbacks = {
            tired: ["*yawns* Sorry, I'm a bit tired right now.", "It's been a long day..."],
            happy: ["It's good to see you!", "What a lovely day for a chat!"],
            worried: ["I've got a lot on my mind...", "These are troubling times."],
            neutral: ["Hello there.", "How can I help you?", "Yes?"],
            relaxed: ["Ah, just taking it easy.", "Life is good, isn't it?"]
        };
        
        const options = fallbacks[mood] || fallbacks.neutral;
        return options[Math.floor(Math.random() * options.length)];
    }

    calculateMoodFromContext(context) {
        let mood = 'neutral';
        
        // Time of day affects mood
        if (context.timeOfDay === 'night' && !this.personality.includes('nocturnal')) {
            mood = 'tired';
        }
        
        // Health affects mood
        if (this.stats.hp < this.stats.maxHp * 0.3) {
            mood = 'worried';
        }
        
        // Recent positive memories
        const recentMemories = this.getRecentMemories(5);
        const positiveMemories = recentMemories.filter(m => m.importance > 7).length;
        if (positiveMemories > 2) {
            mood = 'happy';
        }
        
        return mood;
    }

    analyzeEmotionalImpact(text) {
        // Simple sentiment analysis
        const positiveWords = ['thank', 'glad', 'happy', 'friend', 'help', 'wonderful', 'great'];
        const negativeWords = ['angry', 'hate', 'stupid', 'leave', 'go away', 'annoying'];
        
        const lowerText = text.toLowerCase();
        let score = 0;
        
        positiveWords.forEach(word => {
            if (lowerText.includes(word)) score += 5;
        });
        
        negativeWords.forEach(word => {
            if (lowerText.includes(word)) score -= 5;
        });
        
        return score;
    }

    getTopRelationships(count = 3) {
        const sorted = Array.from(this.relationships.entries())
            .sort((a, b) => Math.abs(b[1]) - Math.abs(a[1]))
            .slice(0, count);
        
        return sorted.map(([name, value]) => {
            if (value > 50) return `${name} (close friend)`;
            if (value > 20) return `${name} (friend)`;
            if (value < -50) return `${name} (enemy)`;
            if (value < -20) return `${name} (dislike)`;
            return `${name} (acquaintance)`;
        }).join(', ');
    }

    getSharedMemories(otherCharacter) {
        const otherName = otherCharacter.name || 'Player';
        return this.memories
            .filter(m => m.event.includes(otherName))
            .slice(-3)
            .map(m => m.event);
    }

    async executeDecision(decision, worldEngine) {
        switch (decision.action) {
            case 'MOVE':
                this.moveInDirection(decision.target, worldEngine);
                break;
            case 'TALK':
                this.initiatConversation(decision.target, worldEngine);
                break;
            case 'WORK':
                this.performWork(worldEngine);
                break;
            case 'REST':
                this.rest(worldEngine);
                break;
            case 'EXPLORE':
                this.explore(worldEngine);
                break;
            case 'INTERACT':
                this.interactWithObject(decision.target, worldEngine);
                break;
        }
        
        // Only log important decisions, not every single movement
        if (decision.action !== 'MOVE' && decision.action !== 'EXPLORE') {
            worldEngine.addEvent(`${this.name}: ${decision.reason}`);
        }
    }

    moveInDirection(direction, worldEngine) {
        const movements = {
            'north': { x: 0, y: -1 },
            'south': { x: 0, y: 1 },
            'east': { x: 1, y: 0 },
            'west': { x: -1, y: 0 }
        };
        
        const move = movements[direction?.toLowerCase()] || movements.east;
        const newX = this.position.x + (move.x * CONFIG.TILE_SIZE);
        const newY = this.position.y + (move.y * CONFIG.TILE_SIZE);
        
        if (!worldEngine.isSolidTile(newX + this.width/2, newY + this.height/2)) {
            this.position.x = newX;
            this.position.y = newY;
            this.currentActivity = `moving ${direction}`;
        }
    }

    initiatConversation(targetName, worldEngine) {
        // Find the target character
        const target = worldEngine.friendlyNPCs.get(targetName) || worldEngine.player;
        if (!target) return;
        
        const distance = Math.sqrt(
            Math.pow(target.x - this.position.x, 2) + 
            Math.pow(target.y - this.position.y, 2)
        );
        
        if (distance < CONFIG.TILE_SIZE * 3) {
            this.currentActivity = `talking to ${targetName}`;
            // Don't spam the event log with NPC-to-NPC conversations
            if (targetName === 'Player' || Math.random() < 0.1) { // Only log 10% of NPC conversations
                worldEngine.addEvent(`${this.name} starts a conversation with ${targetName}`);
            }
        }
    }

    performWork(worldEngine) {
        // Work based on personality/profession
        if (this.personality.includes('blacksmith')) {
            this.currentActivity = 'smithing';
            this.stats.exp += 1;
        } else if (this.personality.includes('scholar')) {
            this.currentActivity = 'studying';
            this.stats.intelligence += 0.1;
        } else if (this.personality.includes('merchant')) {
            this.currentActivity = 'trading';
            // Could implement economy system here
        }
    }

    rest(worldEngine) {
        this.currentActivity = 'resting';
        this.stats.hp = Math.min(this.stats.hp + 1, this.stats.maxHp);
        this.currentMood = 'relaxed';
    }

    explore(worldEngine) {
        // Random movement with purpose
        const angle = Math.random() * Math.PI * 2;
        const distance = CONFIG.TILE_SIZE * (1 + Math.random() * 2);
        
        const newX = this.position.x + Math.cos(angle) * distance;
        const newY = this.position.y + Math.sin(angle) * distance;
        
        if (!worldEngine.isSolidTile(newX + this.width/2, newY + this.height/2)) {
            this.position.x = newX;
            this.position.y = newY;
            this.currentActivity = 'exploring';
        }
    }

    interactWithObject(objectName, worldEngine) {
        // Placeholder for object interaction
        this.currentActivity = `examining ${objectName || 'something'}`;
        this.rememberEvent(`Interacted with ${objectName || 'an object'}`);
    }
}