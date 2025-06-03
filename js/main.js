// main.js - Complete file with Ollama integration
import CONFIG from './config.js';
import WorldEngine from './worldEngine.js';
import Player from './player.js';
import Enemy from './enemy.js'; 
import Renderer from './renderer.js';
import UIManager from './uiManager.js';
import InputManager from './inputManager.js';
import { OllamaIntegration, EnhancedAICharacter } from './ollamaIntegration.js';
import { DialogueSystem, canInitiateDialogue } from './dialogueSystem.js';
import { AICharacter } from './aiCharacter.js';

class Game {
    constructor() {
        this.gameMode = 'observer'; 
        
        this.worldEngine = new WorldEngine(CONFIG);
        this.inputManager = new InputManager(this.worldEngine.canvas); 
        this.renderer = new Renderer(this.worldEngine.canvas, this.worldEngine.ctx); 
        this.uiManager = new UIManager();

        // Add Ollama integration
        this.ollamaIntegration = new OllamaIntegration();
        this.dialogueSystem = null; // Will be initialized after world loads

        this.player = null; 

        this.lastTime = 0;
        this.gameLoop = this.gameLoop.bind(this);
    }

    async initGame() {
        console.log("Initializing game with config:", CONFIG);
        
        // Wait for world initialization to complete
        await this.worldEngine.initializeWorld(); 

        // Initialize dialogue system
        this.dialogueSystem = new DialogueSystem(this.worldEngine, this.ollamaIntegration);

        // Use single screen dimensions for camera calculation
        const mapPixelWidth = this.worldEngine.screenWidth * CONFIG.TILE_SIZE;
        const mapPixelHeight = this.worldEngine.screenHeight * CONFIG.TILE_SIZE;
        this.renderer.initializeCameraPosition(mapPixelWidth, mapPixelHeight);

        // Load tilesets for renderer
        if (this.renderer.loadTilesets) {
            await this.renderer.loadTilesets();
        }

        // IMPORTANT: Wait for Ollama check to complete before creating NPCs
        await this.ollamaIntegration.checkAvailability();

        // Create enhanced NPCs with Ollama
        await this.createEnhancedNPCs();

        // Add all enemies to the north screen (wilderness)
        this.spawnEnemiesInNorth();

        this.inputManager.setMode(this.gameMode);
        this.setupEventListeners();
        
        this.uiManager.updateAllUI(this.worldEngine, this.player, this.gameMode);

        requestAnimationFrame(this.gameLoop);
        console.log("🌟 Multi-Screen Living World Engine Started!");
        
        // Check Ollama status
        if (this.ollamaIntegration.isAvailable) {
            console.log("🤖 Ollama AI integration active!");
            this.worldEngine.addEvent("Advanced AI system online - NPCs will think and respond dynamically!");
        } else {
            console.log("⚠️ Ollama not available - using fallback AI");
            this.worldEngine.addEvent("Using simplified AI behaviors");
        }
        
        // Show controls help
        setTimeout(() => {
            this.worldEngine.addEvent("Press H for help with controls");
        }, 2000);
    }

    async createEnhancedNPCs() {
        // Create Elara with enhanced AI
        const elaraBase = new AICharacter("Elara", 
            "A curious scholar who loves to explore ancient mysteries and share knowledge",
            { color: "#ff88ff", symbol: "📚" }
        );
        elaraBase.position = { x: 12 * CONFIG.TILE_SIZE, y: 15 * CONFIG.TILE_SIZE };
        elaraBase.homeScreen = 'town';
        
        const elara = this.ollamaIntegration.isAvailable 
            ? new EnhancedAICharacter(elaraBase, this.ollamaIntegration)
            : elaraBase;
        console.log('Elara instance:', elara.constructor.name);
        console.log('Elara methods:', Object.getOwnPropertyNames(Object.getPrototypeOf(elara)));
        this.worldEngine.friendlyNPCs.set("Elara", elara);
        
        // Create Grimm with enhanced AI
        const grimmBase = new AICharacter("Grimm",
            "A gruff but kind-hearted blacksmith who takes pride in his craft and protects the town",
            { color: "#ff8844", symbol: "🔨" }
        );
        grimmBase.position = { x: 8 * CONFIG.TILE_SIZE, y: 8 * CONFIG.TILE_SIZE };
        grimmBase.homeScreen = 'town';
        
        const grimm = this.ollamaIntegration.isAvailable 
            ? new EnhancedAICharacter(grimmBase, this.ollamaIntegration)
            : grimmBase;
        this.worldEngine.friendlyNPCs.set("Grimm", grimm);
        
        // Create Maya with enhanced AI
        const mayaBase = new AICharacter("Maya",
            "A cheerful merchant who loves meeting new people and sharing stories from her travels",
            { color: "#44ff88", symbol: "💰" }
        );
        mayaBase.position = { x: 16 * CONFIG.TILE_SIZE, y: 12 * CONFIG.TILE_SIZE };
        mayaBase.homeScreen = 'town';
        
        const maya = this.ollamaIntegration.isAvailable 
            ? new EnhancedAICharacter(mayaBase, this.ollamaIntegration)
            : mayaBase;
        this.worldEngine.friendlyNPCs.set("Maya", maya);

        console.log(`Created ${this.worldEngine.friendlyNPCs.size} NPCs (enhanced: ${this.ollamaIntegration.isAvailable})`);
        
        // Verify enhancement
        for (const [name, npc] of this.worldEngine.friendlyNPCs) {
            console.log(`${name} has generateDialogue:`, typeof npc.generateDialogue === 'function');
        }
    }

    spawnEnemiesInNorth() {
        // Spawn multiple enemies in the north wilderness screen
        const enemyTypes = ['goblin', 'orc', 'wolf', 'bandit'];
        const enemyCount = 4;

        for (let i = 0; i < enemyCount; i++) {
            const enemySpawn = this.worldEngine.findSafeSpawnPosition(
                CONFIG.TILE_SIZE * 0.7, 
                CONFIG.TILE_SIZE * 0.7, 
                'forest'
            );
            
            if (enemySpawn) {
                const enemyType = enemyTypes[i % enemyTypes.length];
                const enemy = new Enemy(enemySpawn.x, enemySpawn.y, enemyType);
                this.worldEngine.addEnemyToScreen(enemy, 'forest');
            }
        }
        
        console.log(`Spawned ${enemyCount} enemies in the northern wilderness`);
    }

    setupEventListeners() {
        document.getElementById('pauseBtn').addEventListener('click', () => {
            this.worldEngine.togglePause();
            this.uiManager.updateGameModeDisplay(this.gameMode, this.worldEngine.isPaused, this.worldEngine.gameSpeed);
        });
        
        document.getElementById('speedBtn').addEventListener('click', () => {
            this.worldEngine.changeSpeed();
            this.uiManager.updateGameModeDisplay(this.gameMode, this.worldEngine.isPaused, this.worldEngine.gameSpeed);
        });
        
        document.getElementById('joinBtn').addEventListener('click', () => this.toggleGameMode());

        this.worldEngine.canvas.addEventListener('click', (e) => {
            if (this.gameMode === 'observer') {
                // Observer mode click logic
                const rect = this.worldEngine.canvas.getBoundingClientRect();
                const x = e.clientX - rect.left;
                const y = e.clientY - rect.top;
                console.log(`Observer click at canvas (${x}, ${y})`);
            }
        });
        
        // Add keyboard shortcut hints
        document.addEventListener('keydown', (e) => {
            if (e.key === 'h' || e.key === 'H') {
                this.showControlsHelp();
            }
        });
    }

    showControlsHelp() {
        this.worldEngine.addEvent("=== CONTROLS ===");
        this.worldEngine.addEvent("WASD/Arrows: Move");
        this.worldEngine.addEvent("X/Space: Attack");
        this.worldEngine.addEvent("E: Talk to NPCs");
        this.worldEngine.addEvent("H: Show this help");
        this.worldEngine.addEvent("Number keys: Select dialogue options");
        this.worldEngine.addEvent("ESC: Exit conversation");
    }

    toggleGameMode() {
        if (this.gameMode === 'observer') {
            this.gameMode = 'adventure';
            const spawnPos = this.worldEngine.findSafeSpawnPosition(CONFIG.TILE_SIZE * 0.75, CONFIG.TILE_SIZE * 0.75);
            if (spawnPos) {
                this.player = new Player(spawnPos.x, spawnPos.y);
                this.worldEngine.setPlayer(this.player);
                this.renderer.setCameraTarget(this.player); 
                this.worldEngine.addEvent("You join the world in Adventure Mode!");
            } else {
                this.worldEngine.addEvent("Could not find a safe place to join the world!");
                this.gameMode = 'observer'; // Revert if spawn failed
            }
        } else {
            this.gameMode = 'observer';
            this.worldEngine.removePlayer();
            this.player = null;
            this.renderer.setCameraTarget(null); 
            this.worldEngine.addEvent("You return to Observer Mode.");
            
            // End any active conversations
            if (this.dialogueSystem && this.dialogueSystem.isInConversation()) {
                this.dialogueSystem.endConversation();
            }
        }
        this.inputManager.setMode(this.gameMode);
        this.uiManager.updateAllUI(this.worldEngine, this.player, this.gameMode); 
    }

    async gameLoop(currentTime) {
        if (!this.lastTime) { 
            this.lastTime = currentTime;
        }
        const deltaTime = currentTime - this.lastTime;
        this.lastTime = currentTime;

        this.inputManager.prepareNextFrame(); 

        if (!this.worldEngine.isRunning) { 
            requestAnimationFrame(this.gameLoop);
            return;
        }
        
        if (!this.worldEngine.isPaused) {
            const actions = {
                up: this.inputManager.isActionPressed('move_up'),
                down: this.inputManager.isActionPressed('move_down'),
                left: this.inputManager.isActionPressed('move_left'),
                right: this.inputManager.isActionPressed('move_right'),
                attack: this.inputManager.isActionPressed('attack'),
                interact: this.inputManager.isActionPressed('interact')
            };

            // Don't move player if in dialogue
            if (this.dialogueSystem && this.dialogueSystem.isInConversation()) {
                // Block all actions during dialogue
                Object.keys(actions).forEach(key => actions[key] = false);
            }
            
            // Also check if we're typing
            if (this.inputManager.isTyping) {
                Object.keys(actions).forEach(key => actions[key] = false);
            }

            this.worldEngine.tick(deltaTime); 

            // Update enhanced NPCs with AI decisions
            await this.updateEnhancedNPCs(deltaTime);

            if (this.gameMode === 'adventure' && this.player) {
                this.player.update(deltaTime, actions, this.worldEngine);
                
                if (actions.attack && !this.dialogueSystem.isInConversation()) { 
                    this.player.attemptAttack(this.worldEngine);
                }
                
                // Check for NPC interactions
                if (actions.interact && !this.dialogueSystem.isInConversation()) {
                    this.checkNPCInteractions();
                }
            }
        }
        
        // Use await to handle async rendering
        await this.renderer.render(this.worldEngine, this.player, this.gameMode);
        this.uiManager.updateAllUI(this.worldEngine, this.player, this.gameMode);

        requestAnimationFrame(this.gameLoop);
    }

    async updateEnhancedNPCs(deltaTime) {
        const worldContext = {
            currentLocation: this.worldEngine.currentScreen,
            timeOfDay: this.worldEngine.worldState.timeOfDay,
            nearbyEntities: [],
            enemiesNearby: this.worldEngine.getCurrentScreenEnemies().length > 0,
            worldEngine: this.worldEngine // Add worldEngine to context
        };

        // Limit to one NPC decision per frame to prevent blocking
        let decisionsThisFrame = 0;
        const maxDecisionsPerFrame = 1;

        for (const [name, npc] of this.worldEngine.friendlyNPCs) {
            if (npc.homeScreen === this.worldEngine.currentScreen) {
                // Update conversation cooldown for all NPCs
                if (npc.conversationCooldown > 0) {
                    npc.conversationCooldown -= deltaTime;
                }
                
                // Only make decisions if NPC has the enhanced methods
                if (npc.makeIntelligentDecision) {
                    // Get nearby entities for this NPC
                    worldContext.nearbyEntities = this.getNearbyEntitiesForNPC(npc);
                    
                    // Let NPCs wander and make decisions
                    const decision = await npc.makeIntelligentDecision(worldContext, deltaTime);
                    if (decision && decisionsThisFrame < maxDecisionsPerFrame) {
                        await npc.executeDecision(decision, this.worldEngine);
                        decisionsThisFrame++;
                    }
                }
            }
        }
    }

    getNearbyEntitiesForNPC(npc) {
        const nearby = [];
        const checkRadius = CONFIG.TILE_SIZE * 5;
        
        // Check player
        if (this.player && this.gameMode === 'adventure') {
            const distance = Math.sqrt(
                Math.pow(this.player.x - npc.position.x, 2) +
                Math.pow(this.player.y - npc.position.y, 2)
            );
            if (distance < checkRadius) {
                nearby.push('Player');
            }
        }
        
        // Check other NPCs
        for (const [otherName, otherNpc] of this.worldEngine.friendlyNPCs) {
            if (otherName !== npc.name && otherNpc.homeScreen === npc.homeScreen) {
                const distance = Math.sqrt(
                    Math.pow(otherNpc.position.x - npc.position.x, 2) +
                    Math.pow(otherNpc.position.y - npc.position.y, 2)
                );
                if (distance < checkRadius) {
                    nearby.push(otherName);
                }
            }
        }
        
        return nearby;
    }

    checkNPCInteractions() {
        if (!this.player || !this.dialogueSystem) return;
        
        // Check each NPC for interaction distance
        for (const [name, npc] of this.worldEngine.friendlyNPCs) {
            if (npc.homeScreen === this.worldEngine.currentScreen) {
                if (canInitiateDialogue(this.player, npc)) {
                    // Start conversation
                    this.dialogueSystem.startConversation(this.player, npc);
                    this.worldEngine.addEvent(`You start talking to ${name}`);
                    break; // Only talk to one NPC at a time
                }
            }
        }
    }
}

window.addEventListener('DOMContentLoaded', async () => {
    const game = new Game();
    
    // Make game accessible globally for debugging
    window.game = game;
    window.worldEngine = game.worldEngine;
    window.ollama = game.ollamaIntegration;
    
    try {
        await game.initGame();
        console.log('🎮 Game loaded! Debug commands available:');
        console.log('  window.worldEngine.debugCurrentScreen()');
        console.log('  window.worldEngine.logTileIdsAt(x, y)');
        console.log('  window.ollama.isAvailable');
        console.log('  window.game.showControlsHelp()');
    } catch (error) {
        console.error('Failed to initialize game:', error);
    }
});