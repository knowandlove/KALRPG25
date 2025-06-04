// dialogueSystem.js - Simple tree-based dialogue system
import CONFIG from './config.js';

export class DialogueSystem {
    constructor(worldEngine) {
        this.worldEngine = worldEngine;
        this.activeConversation = null;
        this.conversationHistory = [];
        this.dialogueUI = null;
        
        // Dialogue trees for each NPC
        this.dialogueTrees = {
            'Elara': {
                start: {
                    text: "Oh, hello there! I'm Elara, the town scholar. I spend my days studying ancient texts and mysteries. Is there something you'd like to know?",
                    choices: [
                        { text: "Tell me about the town", next: "about_town" },
                        { text: "What are you studying?", next: "studying" },
                        { text: "Do you need any help?", next: "quest_check" },
                        { text: "Goodbye", next: "end" }
                    ]
                },
                about_town: {
                    text: "Our town has quite a rich history! It was founded over 200 years ago by adventurers who discovered the nearby iron deposits. The forest to the north is ancient and full of mysteries.",
                    choices: [
                        { text: "Tell me about the forest", next: "about_forest" },
                        { text: "Who else lives here?", next: "about_npcs" },
                        { text: "Back", next: "start" }
                    ]
                },
                about_forest: {
                    text: "The northern forest is as old as time itself. Strange creatures roam there, and I've heard tales of ancient ruins deep within. Please be careful if you venture there!",
                    choices: [
                        { text: "What kind of creatures?", next: "forest_creatures" },
                        { text: "Thanks for the warning", next: "start" }
                    ]
                },
                forest_creatures: {
                    text: "Goblins, wolves, and worse... Some say there are enchanted beasts that guard the old ruins. I'd love to study them someday, from a safe distance of course!",
                    choices: [
                        { text: "Interesting...", next: "start" }
                    ]
                },
                about_npcs: {
                    text: "Well, there's Grimm the blacksmith - gruff but kind-hearted. And Maya the merchant who travels far and wide. They're both good people.",
                    choices: [
                        { text: "Thanks", next: "start" }
                    ]
                },
                studying: {
                    text: "I'm researching the ancient civilization that once lived in these lands. Their ruins dot the landscape, but most are too dangerous to explore alone.",
                    choices: [
                        { text: "Sounds fascinating", next: "start" },
                        { text: "Maybe I could help explore?", next: "quest_check" }
                    ]
                },
                quest_check: {
                    text: "Actually, yes! I've been trying to translate this ancient tablet, but I'm missing a piece. If you find any stone fragments in your travels, please bring them to me!",
                    choices: [
                        { text: "I'll keep an eye out", next: "quest_accepted" },
                        { text: "Maybe later", next: "start" }
                    ]
                },
                quest_accepted: {
                    text: "Wonderful! The fragments are usually found near old ruins. Good luck!",
                    onEnter: (dialogue) => {
                        // Add quest to player's quest log when ready
                        dialogue.worldEngine.addEvent("Quest started: Elara's Ancient Tablet");
                    },
                    choices: [
                        { text: "I'll do my best", next: "end" }
                    ]
                },
                end: {
                    text: "Safe travels, friend!",
                    choices: []
                }
            },
            
            'Grimm': {
                start: {
                    text: "*Grimm looks up from his anvil* What do you need? I'm busy, but I've always got time for a customer.",
                    choices: [
                        { text: "Show me your wares", next: "shop" },
                        { text: "Can you repair something?", next: "repair" },
                        { text: "Just looking around", next: "chat" },
                        { text: "Goodbye", next: "end" }
                    ]
                },
                shop: {
                    text: "I've got the finest weapons and armor in town. All hand-forged! Though... I'm running low on materials.",
                    choices: [
                        { text: "What materials do you need?", next: "quest_check" },
                        { text: "Show me weapons", next: "weapons" },
                        { text: "Show me armor", next: "armor" },
                        { text: "Back", next: "start" }
                    ]
                },
                weapons: {
                    text: "I've got iron swords, battle axes, and even a few enchanted daggers. Prices are fair, quality is guaranteed!",
                    choices: [
                        { text: "Maybe later", next: "start" }
                    ]
                },
                armor: {
                    text: "Chain mail, leather armor, sturdy shields... Everything an adventurer needs to stay alive!",
                    choices: [
                        { text: "I'll think about it", next: "start" }
                    ]
                },
                repair: {
                    text: "Aye, I can fix most anything. Weapons, armor, even some magical items if they're not too complex.",
                    choices: [
                        { text: "Good to know", next: "start" }
                    ]
                },
                chat: {
                    text: "Been smithing here for twenty years. This town's been good to me. That forest though... lost too many good people to those creatures.",
                    choices: [
                        { text: "What happened?", next: "forest_story" },
                        { text: "Stay safe", next: "start" }
                    ]
                },
                forest_story: {
                    text: "Groups of goblins, mostly. But something's got them riled up lately. They're more aggressive than usual. Someone should do something about it.",
                    choices: [
                        { text: "Maybe I will", next: "start" },
                        { text: "That's concerning", next: "start" }
                    ]
                },
                quest_check: {
                    text: "Iron ore's getting scarce. The best veins are in the forest, but it's too dangerous. Bring me 5 pieces of iron ore and I'll forge something special for you!",
                    choices: [
                        { text: "I'll get you that ore", next: "quest_accepted" },
                        { text: "Too dangerous for me", next: "start" }
                    ]
                },
                quest_accepted: {
                    text: "Ha! You've got guts. The ore glints red in the rocks. You'll know it when you see it.",
                    onEnter: (dialogue) => {
                        dialogue.worldEngine.addEvent("Quest started: Grimm's Iron Ore");
                    },
                    choices: [
                        { text: "I won't let you down", next: "end" }
                    ]
                },
                end: {
                    text: "*Grimm nods and returns to his work*",
                    choices: []
                }
            },
            
            'Maya': {
                start: {
                    text: "Welcome, welcome! I'm Maya, merchant extraordinaire! I travel all across the land bringing exotic goods and stories. What can I interest you in today?",
                    choices: [
                        { text: "What are you selling?", next: "shop" },
                        { text: "Tell me a story", next: "stories" },
                        { text: "Heard any rumors?", next: "rumors" },
                        { text: "Goodbye", next: "end" }
                    ]
                },
                shop: {
                    text: "I have potions from the eastern kingdoms, maps to hidden treasures, and various trinkets that might interest an adventurer like yourself!",
                    choices: [
                        { text: "Show me potions", next: "potions" },
                        { text: "Tell me about the maps", next: "maps" },
                        { text: "Back", next: "start" }
                    ]
                },
                potions: {
                    text: "Health potions, stamina draughts, even a few invisibility elixirs! Though they're not cheap - quality has its price!",
                    choices: [
                        { text: "I'll consider it", next: "start" }
                    ]
                },
                maps: {
                    text: "Ah, a treasure hunter! I have maps to three locations: an old watchtower, a hidden grove, and... *whispers* a dragon's lair. Interested?",
                    choices: [
                        { text: "Very interested!", next: "quest_check" },
                        { text: "Maybe another time", next: "start" }
                    ]
                },
                stories: {
                    text: "Oh, where do I begin? Last month I was in the capital when the king announced a tournament! Or would you prefer to hear about the haunted mansion I discovered?",
                    choices: [
                        { text: "The tournament sounds exciting", next: "tournament_story" },
                        { text: "Tell me about the mansion", next: "mansion_story" },
                        { text: "Another time", next: "start" }
                    ]
                },
                tournament_story: {
                    text: "Champions from across the realm gathered! The winner would receive a legendary sword. A mysterious knight in black armor won every match without speaking a word!",
                    choices: [
                        { text: "Fascinating!", next: "start" }
                    ]
                },
                mansion_story: {
                    text: "Two days north of here, an abandoned manor where lights flicker at night. The locals say it's cursed, but I think there's treasure inside. Too scary for me though!",
                    choices: [
                        { text: "Might be worth investigating", next: "start" }
                    ]
                },
                rumors: {
                    text: "Well... *leans in conspiratorially* I heard the goblins in the forest have a new leader. And someone saw strange lights near the old ruins last week.",
                    choices: [
                        { text: "Interesting...", next: "start" },
                        { text: "Any other news?", next: "more_rumors" }
                    ]
                },
                more_rumors: {
                    text: "The king's offering a bounty on goblin ears. And there's talk of a master thief operating in the capital. Oh! And Grimm's been working on something special in secret.",
                    choices: [
                        { text: "Thanks for the info", next: "start" }
                    ]
                },
                quest_check: {
                    text: "You know what? I like you. If you can clear out that old watchtower of goblins, I'll give you one of my maps for free! What do you say?",
                    choices: [
                        { text: "You've got a deal!", next: "quest_accepted" },
                        { text: "I'll think about it", next: "start" }
                    ]
                },
                quest_accepted: {
                    text: "Excellent! The watchtower is northwest in the forest. Be careful - I heard there are at least five goblins there!",
                    onEnter: (dialogue) => {
                        dialogue.worldEngine.addEvent("Quest started: Maya's Watchtower");
                    },
                    choices: [
                        { text: "I'll clear it out", next: "end" }
                    ]
                },
                end: {
                    text: "Come back soon! I'll have new items next time!",
                    choices: []
                }
            }
        };
        
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
            <div id="npcMood" style="color: #aaa; font-size: 12px; margin-top: 5px;"></div>
        `;

        npcHeader.appendChild(npcPortrait);
        npcHeader.appendChild(npcInfo);

        // Dialogue text area
        const dialogueText = document.createElement('div');
        dialogueText.id = 'dialogueText';
        dialogueText.style.cssText = `
            min-height: 80px;
            max-height: 200px;
            overflow-y: auto;
            margin-bottom: 20px;
            line-height: 1.6;
            font-size: 14px;
            padding: 15px;
            background: rgba(0, 0, 0, 0.3);
            border-radius: 5px;
            white-space: pre-wrap;
        `;

        // Choices container
        const choicesContainer = document.createElement('div');
        choicesContainer.id = 'dialogueChoices';
        choicesContainer.style.cssText = `
            display: flex;
            flex-direction: column;
            gap: 8px;
        `;

        // Instructions
        const instructions = document.createElement('div');
        instructions.id = 'dialogueInstructions';
        instructions.style.cssText = `
            margin-top: 10px;
            font-size: 11px;
            color: #888;
            text-align: center;
        `;
        instructions.textContent = 'Press number keys or click to select • ESC to exit';

        dialogueOverlay.appendChild(npcHeader);
        dialogueOverlay.appendChild(dialogueText);
        dialogueOverlay.appendChild(choicesContainer);
        dialogueOverlay.appendChild(instructions);

        document.body.appendChild(dialogueOverlay);
        this.dialogueUI = dialogueOverlay;
    }

    startConversation(player, npc) {
        if (this.activeConversation) return;

        this.activeConversation = {
            player: player,
            npc: npc,
            currentNode: 'start',
            turnCount: 0
        };

        // Pause the NPC's movement
        if (npc.isInConversation !== undefined) {
            npc.isInConversation = true;
        }

        // Show dialogue UI
        this.dialogueUI.style.display = 'block';
        
        // Update NPC info
        document.getElementById('npcPortrait').textContent = npc.appearance.symbol || '?';
        document.getElementById('npcPortrait').style.color = npc.appearance.color || '#ccc';
        document.getElementById('npcName').textContent = npc.name;
        document.getElementById('npcMood').textContent = `${this.getNPCMood(npc)}`;

        // Display first dialogue
        this.displayDialogueNode('start');
        
        // Set up keyboard controls
        this.setupKeyboardControls();
        
        // Disable game controls
        if (window.game && window.game.inputManager) {
            window.game.inputManager.isTyping = true;
        }
    }

    getNPCMood(npc) {
        // Simple mood based on time of day and NPC personality
        const timeOfDay = this.worldEngine.worldState.timeOfDay;
        
        if (npc.name === 'Grimm') {
            return timeOfDay === 'morning' ? 'Focused on work' : 'Tired but determined';
        } else if (npc.name === 'Elara') {
            return timeOfDay === 'night' ? 'Studying by candlelight' : 'Curious and thoughtful';
        } else if (npc.name === 'Maya') {
            return 'Cheerful and eager to trade';
        }
        
        return 'Neutral';
    }

    displayDialogueNode(nodeId) {
        const npcName = this.activeConversation.npc.name;
        const tree = this.dialogueTrees[npcName];
        
        if (!tree || !tree[nodeId]) {
            console.error(`Dialogue node ${nodeId} not found for ${npcName}`);
            this.endConversation();
            return;
        }

        const node = tree[nodeId];
        this.activeConversation.currentNode = nodeId;

        // Call onEnter function if it exists
        if (node.onEnter) {
            node.onEnter(this);
        }

        // Display text with typewriter effect
        this.displayText(node.text);

        // Display choices
        this.displayChoices(node.choices);

        // Update turn count
        this.activeConversation.turnCount++;
    }

    displayText(text) {
        const dialogueText = document.getElementById('dialogueText');
        dialogueText.textContent = '';
        
        // Typewriter effect
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

    displayChoices(choices) {
        const choicesContainer = document.getElementById('dialogueChoices');
        choicesContainer.innerHTML = '';

        choices.forEach((choice, index) => {
            const button = document.createElement('button');
            button.className = 'dialogue-choice';
            button.style.cssText = `
                background: #3a3a5a;
                color: #fff;
                border: 1px solid #555;
                padding: 10px 15px;
                border-radius: 5px;
                cursor: pointer;
                font-family: inherit;
                font-size: 13px;
                text-align: left;
                transition: all 0.2s;
            `;
            
            button.innerHTML = `<span style="color: #88f;">${index + 1}.</span> ${choice.text}`;
            
            button.onmouseover = () => {
                button.style.background = '#4a4a6a';
                button.style.borderColor = '#88f';
            };
            
            button.onmouseout = () => {
                button.style.background = '#3a3a5a';
                button.style.borderColor = '#555';
            };
            
            button.onclick = () => this.selectChoice(index);
            
            choicesContainer.appendChild(button);
        });
    }

    selectChoice(index) {
        const npcName = this.activeConversation.npc.name;
        const tree = this.dialogueTrees[npcName];
        const currentNode = tree[this.activeConversation.currentNode];
        
        if (!currentNode.choices[index]) return;
        
        const choice = currentNode.choices[index];
        
        // Log the choice
        this.conversationHistory.push({
            speaker: 'Player',
            text: choice.text,
            timestamp: Date.now()
        });

        // Handle special actions
        if (choice.action) {
            this.handleAction(choice.action);
        }

        // Move to next node
        if (choice.next === 'end') {
            this.endConversation();
        } else if (choice.next) {
            this.displayDialogueNode(choice.next);
        }
    }

    handleAction(action) {
        // Handle special actions like giving items, starting quests, etc.
        switch (action.type) {
            case 'give_item':
                // Add item to player inventory when implemented
                this.worldEngine.addEvent(`Received ${action.item}!`);
                break;
            case 'start_quest':
                // Add quest to player's quest log when implemented
                this.worldEngine.addEvent(`Quest started: ${action.quest}`);
                break;
            // Add more action types as needed
        }
    }

    setupKeyboardControls() {
        this.keyHandler = (e) => {
            // Number keys for choices
            const num = parseInt(e.key);
            if (!isNaN(num) && num >= 1 && num <= 9) {
                this.selectChoice(num - 1);
            }
            // ESC to exit
            else if (e.key === 'Escape') {
                this.endConversation();
            }
        };
        
        document.addEventListener('keydown', this.keyHandler);
    }

    endConversation() {
        if (!this.activeConversation) return;

        // Resume NPC movement
        if (this.activeConversation.npc && this.activeConversation.npc.isInConversation !== undefined) {
            this.activeConversation.npc.isInConversation = false;
        }

        // Create memory of conversation for NPC
        const npc = this.activeConversation.npc;
        npc.rememberEvent(`Had a conversation with ${this.activeConversation.player.name || 'an adventurer'}`);

        // Log conversation to world events
        this.worldEngine.addEvent(`Finished talking with ${npc.name}`);

        // Hide UI
        this.dialogueUI.style.display = 'none';
        
        // Clean up event listener
        if (this.keyHandler) {
            document.removeEventListener('keydown', this.keyHandler);
        }
        
        // Clear active conversation
        this.activeConversation = null;
        
        // Re-enable game controls
        if (window.game && window.game.inputManager) {
            window.game.inputManager.isTyping = false;
            window.game.inputManager.keys = {};
            window.game.inputManager._updateActiveActions();
        }
        
        // Return focus to the game canvas
        if (window.game && window.game.worldEngine && window.game.worldEngine.canvas) {
            window.game.worldEngine.canvas.focus();
        }
    }

    isInConversation() {
        return this.activeConversation !== null;
    }

    // Method to add or modify dialogue trees dynamically
    addDialogueTree(npcName, tree) {
        this.dialogueTrees[npcName] = tree;
    }

    // Method to add a node to existing tree
    addDialogueNode(npcName, nodeId, node) {
        if (!this.dialogueTrees[npcName]) {
            this.dialogueTrees[npcName] = {};
        }
        this.dialogueTrees[npcName][nodeId] = node;
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