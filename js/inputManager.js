// inputManager.js
import CONFIG from './config.js';

export default class InputManager {
    constructor(canvas) {
        this.canvas = canvas; // Needed for mouse coordinate calculations relative to canvas

        this.keys = {}; // Stores the state of currently pressed keys
        this.mouse = {
            x: 0,
            y: 0,
            clicked: false, // True for one frame on mousedown
            isDown: false   // True while mouse button is held
        };

        this.actionMap = { // Define game actions and their default key bindings
            'move_up': ['w', 'arrowup'],
            'move_down': ['s', 'arrowdown'],
            'move_left': ['a', 'arrowleft'],
            'move_right': ['d', 'arrowright'],
            'attack': ['x', ' '], // Spacebar or X
            'interact': ['e'],
            // Add other actions as needed
        };

        this.activeActions = {}; // Stores which abstract actions are currently active
        this.gameMode = 'observer'; // 'observer' or 'adventure'

        this._setupEventListeners();
    }

    _setupEventListeners() {
        document.addEventListener('keydown', (e) => {
            const key = e.key.toLowerCase();
            this.keys[key] = true;
            this._updateActiveActions();
            
            // Prevent default browser action for keys we use (e.g., spacebar scrolling)
            for (const action in this.actionMap) {
                if (this.actionMap[action].includes(key) && this.gameMode === 'adventure') {
                    e.preventDefault();
                }
            }
        });

        document.addEventListener('keyup', (e) => {
            const key = e.key.toLowerCase();
            this.keys[key] = false;
            this._updateActiveActions();
        });

        this.canvas.addEventListener('mousedown', (e) => {
            this.mouse.isDown = true;
            this.mouse.clicked = true; // Will be true for one update cycle
            this._updateMousePosition(e);
            // console.log(`Mouse down at (${this.mouse.x}, ${this.mouse.y})`);
        });

        this.canvas.addEventListener('mouseup', (e) => {
            this.mouse.isDown = false;
            this._updateMousePosition(e);
            // console.log(`Mouse up at (${this.mouse.x}, ${this.mouse.y})`);
        });

        this.canvas.addEventListener('mousemove', (e) => {
            this._updateMousePosition(e);
        });

        // Ensure canvas can receive focus to capture key events, if needed
        this.canvas.setAttribute('tabindex', '0'); 
    }

    _updateMousePosition(event) {
        const rect = this.canvas.getBoundingClientRect();
        this.mouse.x = event.clientX - rect.left;
        this.mouse.y = event.clientY - rect.top;
    }

    _updateActiveActions() {
        for (const action in this.actionMap) {
            this.activeActions[action] = this.actionMap[action].some(key => this.keys[key]);
        }
    }

    setMode(mode) {
        this.gameMode = mode;
        // Reset key states when changing mode to avoid stuck actions
        this.keys = {}; 
        this._updateActiveActions();
        if (mode === 'adventure') {
            this.canvas.focus(); // Focus canvas for keyboard input
        }
    }

    // Call this at the beginning of each game loop update
    prepareNextFrame() {
        this.mouse.clicked = false; // Reset one-frame click state
    }

    // --- Action Query Methods ---
    isActionPressed(actionName) {
        return !!this.activeActions[actionName] && (this.gameMode === 'adventure' || actionName.startsWith('ui_')); // Only allow game actions in adventure mode
    }

    // --- Mouse Query Methods ---
    isMouseClicked() {
        return this.mouse.clicked;
    }

    isMouseDown() {
        return this.mouse.isDown;
    }

    getMousePosition() {
        return { x: this.mouse.x, y: this.mouse.y };
    }
}
