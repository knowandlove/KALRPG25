// main.js - Simplified version without Ollama
import CONFIG from './config.js';
import WorldEngine from './worldEngine.js';
import Player from './player.js';
import Enemy from './enemy.js'; 
import Renderer from './renderer.js';
import UIManager from './uiManager.js';
import InputManager from './inputManager.js';
import { DialogueSystem, canInitiateDialogue } from './dialogueSystem.js';
import { AICharacter } from './aiCharacter.js';
import { Physics } from './physics.js';
import { SpriteSystem, CHARACTER_SPRITE_CONFIG } from './spriteSystem.js';

class Game {
    constructor() {
        this.gameMode = 'observer'; 
        
        this.worldEngine = new WorldEngine(CONFIG);
        this.inputManager = new InputManager(this.worldEngine.canvas); 
        this.renderer = new Renderer(this.worldEngine.canvas, this.worldEngine.ctx); 
        this.uiManager = new UIManager();

        // Sprite system
        this.spriteSystem = new SpriteSystem();
        
        // Dialogue system
        this.dialogueSystem = null; // Will be initialized after world loads

        this.player = null; 

        this.lastTime = 0;
        this.gameLoop = this.gameLoop.bind(this);
    }

    async initGame() {
        console.log("Initializing game with config:", CONFIG);
        
        // Load sprite sheet
        try {
            await this.spriteSystem.loadSpriteSheet('characters', 'assets/sprites/characters.png');
            
            // Configure all character sprites
            Object.entries(CHARACTER_SPRITE_CONFIG).forEach(([name, config]) => {
                this.spriteSystem.configureSpriteSet(name, config);
            });
        } catch (error) {
            console.warn('Failed to load sprites, using fallback rendering:', error);
        }
        
        // Wait for world initialization to complete
        await this.worldEngine.initializeWorld(); 

        // Initialize dialogue system
        this.dialogueSystem = new DialogueSystem(this.worldEngine);

        // Get actual map dimensions from tilemap system
        const dims = this.worldEngine.getCurrentScreenDimensions();
        this.renderer.initializeCameraPosition(dims.pixelWidth, dims.pixelHeight);

        // Create NPCs
        this.createNPCs();

        // Add all enemies to the north screen (wilderness)
        this.spawnEnemiesInNorth();

        this.inputManager.setMode(this.gameMode);
        this.setupEventListeners();
        
        this.uiManager.updateAllUI(this.worldEngine, this.player, this.gameMode);

        requestAnimationFrame(this.gameLoop);
        console.log("🌟 Living World Engine Started!");
        
        // Show controls help
        setTimeout(() => {
            this.worldEngine.addEvent("Press H for help with controls");
        }, 2000);
    }

   // Fixed createNPCs method for main.js
// Replace the existing createNPCs method with this one:

createNPCs() {
    // Create Elara - the scholar
    const elara = new AICharacter("Elara", 
        "A curious scholar who loves to explore ancient mysteries and share knowledge",
        { color: "#ff88ff", symbol: "📚" },
        this.spriteSystem // Pass sprite system
    );
    elara.x = 12 * CONFIG.TILE_SIZE;
    elara.y = 15 * CONFIG.TILE_SIZE;
    elara.homeScreen = 'town';
    this.worldEngine.friendlyNPCs.set("Elara", elara);
    
    // Create Grimm - the blacksmith
    const grimm = new AICharacter("Grimm",
        "A gruff but kind-hearted blacksmith who takes pride in his craft and protects the town",
        { color: "#ff8844", symbol: "🔨" },
        this.spriteSystem // Pass sprite system
    );
    grimm.x = 8 * CONFIG.TILE_SIZE;
    grimm.y = 8 * CONFIG.TILE_SIZE;
    grimm.homeScreen = 'town';
    this.worldEngine.friendlyNPCs.set("Grimm", grimm);
    
    // Create Maya - the merchant
    const maya = new AICharacter("Maya",
        "A cheerful merchant who loves meeting new people and sharing stories from her travels",
        { color: "#44ff88", symbol: "💰" },
        this.spriteSystem // Pass sprite system
    );
    maya.x = 16 * CONFIG.TILE_SIZE;
    maya.y = 12 * CONFIG.TILE_SIZE;
    maya.homeScreen = 'town';
    this.worldEngine.friendlyNPCs.set("Maya", maya);

    console.log(`Created ${this.worldEngine.friendlyNPCs.size} NPCs with sprites`);
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
        this.worldEngine.addEvent("Number keys: Select dialogue");
        this.worldEngine.addEvent("ESC: Exit conversation");
    }

    toggleGameMode() {
        if (this.gameMode === 'observer') {
            this.gameMode = 'adventure';
            const spawnPos = this.worldEngine.findSafeSpawnPosition(CONFIG.TILE_SIZE * 0.75, CONFIG.TILE_SIZE * 0.75);
            if (spawnPos) {
                this.player = new Player(spawnPos.x, spawnPos.y, this.spriteSystem);
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

    gameLoop(currentTime) {
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

            // Update NPCs
            for (const [name, npc] of this.worldEngine.friendlyNPCs) {
                if (npc.homeScreen === this.worldEngine.currentScreen) {
                    npc.update(deltaTime, this.worldEngine);
                }
            }

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
        
        // Render
        this.renderer.render(this.worldEngine, this.player, this.gameMode);
        this.uiManager.updateAllUI(this.worldEngine, this.player, this.gameMode);

        requestAnimationFrame(this.gameLoop);
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
    
    try {
        await game.initGame();
        console.log('🎮 Game loaded! Debug commands available:');
        console.log('  window.worldEngine.debugCurrentScreen()');
        console.log('  window.worldEngine.logTileIdsAt(x, y)');
        console.log('  window.game.showControlsHelp()');
    } catch (error) {
        console.error('Failed to initialize game:', error);
    }
});