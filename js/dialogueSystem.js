// dialogueSystem.js - Handle conversations between player and NPCs
import CONFIG from './config.js';

export class DialogueSystem {
    constructor(worldEngine, ollamaIntegration) {
        this.worldEngine = worldEngine;
        this.ollama = ollamaIntegration;
        this.activeConversation = null;
        this.conversationHistory = [];
        this.dialogueUI = null;
        
        this.createDialogueUI();
    }

    createDialogueUI() {
        // Create dialogue overlay
        const dialogueOverlay = document.createElement('div');
        dialogueOverlay.id = 'dialogueOverlay';
        dialogueOverlay.style.cssText = `
            position: absolute;
            bottom: 120px;
            left: 50%;
            transform: translateX(-50%);
            width: 600px;
            max-width: 90%;
            background: rgba(20, 20, 30, 0.95);
            border: 2px solid #4a4af8;
            border-radius: 10px;
            padding: 20px;
            display: none;
            z-index: 100;
            font-family: 'Courier New', monospace;
            color: #fff;
            box-shadow: 0 4px 20px rgba(0, 0, 0, 0.5);
        `;

        // NPC name and portrait area
        const npcHeader = document.createElement('div');
        npcHeader.id = 'npcHeader';
        npcHeader.style.cssText = `
            display: flex;
            align-items: center;
            margin-bottom: 15px;
            padding-bottom: 10px;
            border-bottom: 1px solid #444;
        `;

        const npcPortrait = document.createElement('div');
        npcPortrait.id = 'npcPortrait';
        npcPortrait.style.cssText = `
            width: 60px;
            height: 60px;
            background: #2a2a2a;
            border-radius: 50%;
            margin-right: 15px;
            display: flex;
            align-items: center;
            justify-content: center;
            font-size: 30px;
            border: 2px solid #666;
        `;

        const npcInfo = document.createElement('div');
        npcInfo.innerHTML = `
            <div id="npcName" style="color: #88f; font-weight: bold; font-size: 18px;">NPC Name</div>
            <div id="npcMood" style="color: #aaa; font-size: 12px; margin-top: 5px;">Mood: Neutral</div>
        `;

        npcHeader.appendChild(npcPortrait);
        npcHeader.appendChild(npcInfo);

        // Dialogue text area
        const dialogueText = document.createElement('div');
        dialogueText.id = 'dialogueText';
        dialogueText.style.cssText = `
            min-height: 100px;
            max-height: 200px;
            overflow-y: auto;
            margin-bottom: 15px;
            line-height: 1.8;
            font-size: 14px;
            padding: 10px;
            background: rgba(0, 0, 0, 0.3);
            border-radius: 5px;
            word-wrap: break-word;
            white-space: pre-wrap;
        `;

        // Player input area (replacing choices)
        const inputContainer = document.createElement('div');
        inputContainer.id = 'dialogueInputContainer';
        inputContainer.style.cssText = `
            display: flex;
            gap: 10px;
            margin-top: 15px;
        `;

        const inputField = document.createElement('input');
        inputField.id = 'dialogueInput';
        inputField.type = 'text';
        inputField.placeholder = 'Type your message...';
        inputField.style.cssText = `
            flex: 1;
            background: #2a2a3a;
            color: #fff;
            border: 1px solid #555;
            padding: 10px;
            border-radius: 5px;
            font-family: inherit;
            font-size: 13px;
        `;

        const sendButton = document.createElement('button');
        sendButton.id = 'dialogueSend';
        sendButton.textContent = 'Send';
        sendButton.style.cssText = `
            background: #4a4af8;
            color: white;
            border: none;
            padding: 10px 20px;
            border-radius: 5px;
            cursor: pointer;
            font-family: inherit;
            font-size: 13px;
        `;

        inputContainer.appendChild(inputField);
        inputContainer.appendChild(sendButton);

        // Quick responses for common actions
        const quickResponses = document.createElement('div');
        quickResponses.id = 'quickResponses';
        quickResponses.style.cssText = `
            display: flex;
            gap: 5px;
            margin-bottom: 10px;
            flex-wrap: wrap;
        `;

        dialogueOverlay.appendChild(npcHeader);
        dialogueOverlay.appendChild(dialogueText);
        dialogueOverlay.appendChild(quickResponses);
        dialogueOverlay.appendChild(inputContainer);

        document.body.appendChild(dialogueOverlay);
        this.dialogueUI = dialogueOverlay;
    }

    async startConversation(player, npc) {
        if (this.activeConversation) return;

        this.activeConversation = {
            player: player,
            npc: npc,
            turnCount: 0,
            relationship: npc.getRelationship(player.name || 'Player')
        };

        // Show dialogue UI
        this.dialogueUI.style.display = 'block';
        
        // Update NPC info
        document.getElementById('npcPortrait').textContent = npc.appearance.symbol || '?';
        document.getElementById('npcPortrait').style.color = npc.appearance.color || '#ccc';
        document.getElementById('npcName').textContent = npc.name;
        document.getElementById('npcMood').textContent = `Mood: ${npc.currentMood || 'Neutral'}`;

        try {
            // Generate opening dialogue
            const context = this.buildContext();
            let opening;
            
            // Check if NPC has the enhanced dialogue method
            if (npc.generateDialogue) {
                opening = await npc.generateDialogue(player, {
                    ...context,
                    playerAction: 'approaches you'
                });
            } else {
                // Fallback for non-enhanced NPCs
                opening = {
                    text: `Hello there! I'm ${npc.name}.`,
                    emotion: 'neutral',
                    action: 'greeting'
                };
            }

            this.displayDialogue(opening.text || "...");
            this.setupInputControls();
            this.showQuickResponses();
        } catch (error) {
            console.error('Error starting conversation:', error);
            this.displayDialogue(`${npc.name} seems distracted...`);
            this.presentPlayerChoices();
        }
    }

    buildContext() {
        return {
            currentLocation: this.worldEngine.currentScreen,
            timeOfDay: this.worldEngine.worldState.timeOfDay,
            nearbyEntities: this.getNearbyEntities(),
            recentEvents: this.worldEngine.events.slice(0, 3).map(e => e.text)
        };
    }

    getNearbyEntities() {
        const entities = [];
        const checkRadius = CONFIG.TILE_SIZE * 5;
        
        // Check other NPCs
        for (const [name, npc] of this.worldEngine.friendlyNPCs) {
            if (npc !== this.activeConversation.npc) {
                const distance = Math.sqrt(
                    Math.pow(npc.position.x - this.activeConversation.npc.position.x, 2) +
                    Math.pow(npc.position.y - this.activeConversation.npc.position.y, 2)
                );
                if (distance < checkRadius) {
                    entities.push(name);
                }
            }
        }
        
        return entities;
    }

    displayDialogue(text) {
        const dialogueText = document.getElementById('dialogueText');
        
        if (!dialogueText) {
            console.error('Dialogue text element not found!');
            return;
        }
        
        // Clear any existing text
        dialogueText.textContent = '';
        
        // If no text provided, show a default
        if (!text) {
            dialogueText.textContent = "...";
            return;
        }
        
        // Animate text appearance
        let charIndex = 0;
        
        const typeText = () => {
            if (charIndex < text.length) {
                dialogueText.textContent += text[charIndex];
                charIndex++;
                setTimeout(typeText, 30);
            }
        };
        
        typeText();
    }

    setupInputControls() {
        const inputField = document.getElementById('dialogueInput');
        const sendButton = document.getElementById('dialogueSend');
        
        if (!inputField || !sendButton) return;
        
        // Clear and focus input
        inputField.value = '';
        inputField.focus();
        
        // Remove any existing event listeners
        if (this.sendHandler) {
            sendButton.removeEventListener('click', this.sendHandler);
        }
        if (this.keypressHandler) {
            inputField.removeEventListener('keypress', this.keypressHandler);
        }
        if (this.focusHandler) {
            inputField.removeEventListener('focus', this.focusHandler);
        }
        if (this.blurHandler) {
            inputField.removeEventListener('blur', this.blurHandler);
        }
        
        // Tell the input manager we're in dialogue when focused
        this.focusHandler = () => {
            console.log('Input field focused');
            if (window.game && window.game.inputManager) {
                window.game.inputManager.setTyping ? 
                    window.game.inputManager.setTyping(true) : 
                    (window.game.inputManager.isTyping = true);
            }
        };
        
        this.blurHandler = () => {
            console.log('Input field blurred');
            if (window.game && window.game.inputManager) {
                window.game.inputManager.setTyping ? 
                    window.game.inputManager.setTyping(false) : 
                    (window.game.inputManager.isTyping = false);
            }
        };
        
        inputField.addEventListener('focus', this.focusHandler);
        inputField.addEventListener('blur', this.blurHandler);
        
        // Create new handlers
        this.sendHandler = () => {
            const message = inputField.value.trim();
            if (message) {
                this.handlePlayerMessage(message);
                inputField.value = '';
            }
        };
        
        this.keypressHandler = (e) => {
            if (e.key === 'Enter') {
                e.preventDefault(); // Prevent form submission
                const message = inputField.value.trim();
                if (message) {
                    this.handlePlayerMessage(message);
                    inputField.value = '';
                }
            }
        };
        
        // Add event listeners
        sendButton.addEventListener('click', this.sendHandler);
        inputField.addEventListener('keypress', this.keypressHandler);
        
        // Separate ESC handler that checks if we're in the input field
        if (this.escapeHandler) {
            document.removeEventListener('keydown', this.escapeHandler);
        }
        
        this.escapeHandler = (e) => {
            // Only handle ESC if we're not typing in the input field
            if (e.key === 'Escape' && document.activeElement !== inputField) {
                this.endConversation();
            }
        };
        
        document.addEventListener('keydown', this.escapeHandler);
    }

    showQuickResponses() {
        const quickContainer = document.getElementById('quickResponses');
        if (!quickContainer) return;
        
        quickContainer.innerHTML = '';
        
        const quickOptions = [
            "Hello!",
            "How are you?",
            "Tell me about yourself",
            "What's new?",
            "Goodbye"
        ];
        
        quickOptions.forEach(text => {
            const btn = document.createElement('button');
            btn.textContent = text;
            btn.style.cssText = `
                background: #3a3a5a;
                color: #fff;
                border: 1px solid #555;
                padding: 5px 10px;
                border-radius: 3px;
                cursor: pointer;
                font-size: 12px;
                font-family: inherit;
            `;
            btn.onclick = () => {
                document.getElementById('dialogueInput').value = text;
                this.handlePlayerMessage(text);
            };
            quickContainer.appendChild(btn);
        });
    }

    async handlePlayerMessage(message) {
        if (!this.activeConversation) return;
        
        // Add to conversation history
        this.conversationHistory.push({
            speaker: 'Player',
            text: message,
            timestamp: Date.now()
        });
        
        // Check for goodbye
        if (message.toLowerCase().includes('bye') || message.toLowerCase().includes('goodbye')) {
            this.endConversation();
            return;
        }
        
        // Disable input while processing
        const inputField = document.getElementById('dialogueInput');
        const sendButton = document.getElementById('dialogueSend');
        if (inputField) inputField.disabled = true;
        if (sendButton) sendButton.disabled = true;
        
        try {
            // Generate NPC response
            const context = this.buildContext();
            context.playerAction = message;
            
            let response;
            
            if (this.activeConversation.npc.generateDialogue) {
                response = await this.activeConversation.npc.generateDialogue(
                    this.activeConversation.player,
                    context
                );
            } else {
                response = {
                    text: `${this.activeConversation.npc.name} listens thoughtfully.`,
                    emotion: 'neutral'
                };
            }
            
            // Add to history
            this.conversationHistory.push({
                speaker: this.activeConversation.npc.name,
                text: response.text,
                timestamp: Date.now()
            });
            
            // Update UI
            document.getElementById('npcMood').textContent = `Mood: ${response.emotion || 'neutral'}`;
            this.displayDialogue(response.text || "...");
            
            // Re-enable input after response
            setTimeout(() => {
                if (inputField) inputField.disabled = false;
                if (sendButton) sendButton.disabled = false;
                if (inputField) inputField.focus();
            }, 500);
            
            // Update turn count
            this.activeConversation.turnCount++;
            
        } catch (error) {
            console.error('Error in dialogue:', error);
            this.displayDialogue("...");
            if (inputField) inputField.disabled = false;
            if (sendButton) sendButton.disabled = false;
        }
    }

    endConversation() {
        if (!this.activeConversation) return;

        // Make sure typing flag is cleared
        if (window.game && window.game.inputManager) {
            window.game.inputManager.isTyping = false;
        }

        // Create memory of conversation for NPC
        const npc = this.activeConversation.npc;
        const conversationSummary = `Had a ${this.activeConversation.turnCount}-turn conversation with ${this.activeConversation.player.name || 'an adventurer'}`;
        npc.rememberEvent(conversationSummary);

        // Log conversation to world events
        this.worldEngine.addEvent(`${npc.name} finished talking with ${this.activeConversation.player.name || 'the player'}`);

        // Hide UI
        this.dialogueUI.style.display = 'none';
        
        // Cleanup event listeners
        const inputField = document.getElementById('dialogueInput');
        const sendButton = document.getElementById('dialogueSend');
        
        if (this.sendHandler && sendButton) {
            sendButton.removeEventListener('click', this.sendHandler);
        }
        if (this.keypressHandler && inputField) {
            inputField.removeEventListener('keypress', this.keypressHandler);
        }
        if (this.focusHandler && inputField) {
            inputField.removeEventListener('focus', this.focusHandler);
        }
        if (this.blurHandler && inputField) {
            inputField.removeEventListener('blur', this.blurHandler);
        }
        if (this.escapeHandler) {
            document.removeEventListener('keydown', this.escapeHandler);
        }
        if (this.currentKeyHandler) {
            document.removeEventListener('keydown', this.currentKeyHandler);
        }
        
        this.activeConversation = null;
    }

    isInConversation() {
        return this.activeConversation !== null;
    }
}

// Export a helper function to check if NPCs are close enough to talk
export function canInitiateDialogue(player, npc) {
    const distance = Math.sqrt(
        Math.pow((player.x + player.width/2) - (npc.position.x + npc.width/2), 2) +
        Math.pow((player.y + player.height/2) - (npc.position.y + npc.height/2), 2)
    );
    
    return distance < CONFIG.TILE_SIZE * 2; // Within 2 tiles
}