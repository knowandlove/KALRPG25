// main.js
import CONFIG from './config.js';
import WorldEngine from './worldEngine.js';
import Player from './player.js';
import Enemy from './enemy.js'; 
import Renderer from './renderer.js';
import UIManager from './uiManager.js';
import InputManager from './inputManager.js';

class Game {
    constructor() {
        this.gameMode = 'observer'; 
        
        this.worldEngine = new WorldEngine(CONFIG);
        this.inputManager = new InputManager(this.worldEngine.canvas); 
        this.renderer = new Renderer(this.worldEngine.canvas, this.worldEngine.ctx); 
        this.uiManager = new UIManager();

        this.player = null; 

        this.lastTime = 0;
        this.gameLoop = this.gameLoop.bind(this);
    }

    async initGame() {
        console.log("Initializing game with config:", CONFIG);
        
        // Wait for world initialization to complete
        await this.worldEngine.initializeWorld(); 

        // Use single screen dimensions for camera calculation
        const mapPixelWidth = this.worldEngine.screenWidth * CONFIG.TILE_SIZE;
        const mapPixelHeight = this.worldEngine.screenHeight * CONFIG.TILE_SIZE;
        this.renderer.initializeCameraPosition(mapPixelWidth, mapPixelHeight);

        // Load tilesets for renderer
        if (this.renderer.loadTilesets) {
            await this.renderer.loadTilesets();
        }

        // Create friendly NPCs in the town (no enemies here)
        this.worldEngine.createCharacter("Elara", { 
            personality: "A curious scholar who loves to explore",
            appearance: { color: "#ff88ff", symbol: "📚" },
            startPos: { x: 12, y: 15 }
        }, 'town');
        
        this.worldEngine.createCharacter("Grimm", {
            personality: "A gruff blacksmith who works hard",
            appearance: { color: "#ff8844", symbol: "🔨" },
            startPos: { x: 8, y: 8 }
        }, 'town');
        
        this.worldEngine.createCharacter("Maya", {
            personality: "A friendly merchant who travels often",
            appearance: { color: "#44ff88", symbol: "💰" },
            startPos: { x: 16, y: 12 }
        }, 'town');

        // Add all enemies to the north screen (wilderness)
        this.spawnEnemiesInNorth();

        this.inputManager.setMode(this.gameMode);
        this.setupEventListeners();
        
        this.uiManager.updateAllUI(this.worldEngine, this.player, this.gameMode);

        requestAnimationFrame(this.gameLoop);
        console.log("🌟 Multi-Screen Living World Engine Started!");
    }

    spawnEnemiesInNorth() {
        // Spawn multiple enemies in the north wilderness screen
        const enemyTypes = ['goblin', 'orc', 'wolf', 'bandit'];
        const enemyCount = 4;

        for (let i = 0; i < enemyCount; i++) {
            const enemySpawn = this.worldEngine.findSafeSpawnPosition(
                CONFIG.TILE_SIZE * 0.7, 
                CONFIG.TILE_SIZE * 0.7, 
                'north'
            );
            
            if (enemySpawn) {
                const enemyType = enemyTypes[i % enemyTypes.length];
                const enemy = new Enemy(enemySpawn.x, enemySpawn.y, enemyType);
                this.worldEngine.addEnemyToScreen(enemy, 'north');
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
                // Observer mode click logic (TODO)
            }
        });
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

            this.worldEngine.tick(deltaTime); 

            if (this.gameMode === 'adventure' && this.player) {
                this.player.update(deltaTime, actions, this.worldEngine);
                if (actions.attack) { 
                    this.player.attemptAttack(this.worldEngine);
                }
            }
        }
        
        // Use await to handle async rendering
        await this.renderer.render(this.worldEngine, this.player, this.gameMode);
        this.uiManager.updateAllUI(this.worldEngine, this.player, this.gameMode);

        requestAnimationFrame(this.gameLoop);
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
        console.log('  window.worldEngine.debugForestMap()');
        console.log('  window.worldEngine.logTileIdsAt(x, y)');
    } catch (error) {
        console.error('Failed to initialize game:', error);
    }
});