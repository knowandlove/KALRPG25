# 🌟 AI Adventure Game - Living World Engine (Updated)

## 📋 Overview

A revolutionary browser-based AI-powered adventure game where autonomous AI characters live their own lives in a persistent world. NPCs now feature **dynamic AI-powered conversations** through Ollama integration, creating truly unique interactions every time you play.

**Latest Update**: Full Ollama integration for dynamic NPC dialogue and intelligent behavior!

---

## 🎮 Current Features (UPDATED)

### ✅ Dual Game Modes
- **Observer Mode**: Watch AI characters live their autonomous lives
- **Adventure Mode**: Join the world as a player character with full RPG mechanics
- **Seamless Switching**: Toggle between modes instantly

### ✅ Living World Simulation  
- **Autonomous AI Characters**: Each NPC has personality, goals, and persistent relationships
- **Multi-Screen World**: Town and Forest areas with screen transitions
- **Dynamic Day/Night Cycle**: 24-second days with visual time progression
- **Persistent Memory**: Characters remember interactions and build relationships
- **Emergent Events**: Random world events create unique stories

### 🤖 NEW: Ollama AI Integration
- **Dynamic Conversations**: NPCs generate unique responses based on personality and context
- **Intelligent Decision Making**: NPCs make contextual decisions every 45-75 seconds
- **Memory System**: NPCs remember past conversations and reference them
- **Relationship Building**: Every interaction affects how NPCs feel about you
- **Mood System**: NPCs have dynamic moods that affect their responses
- **Natural Wandering**: NPCs move around naturally between major decisions

### ✅ Dialogue System (COMPLETELY REVAMPED)
- **Free-form Text Input**: Type anything you want to say to NPCs
- **Quick Response Buttons**: Common phrases for fast interaction
- **Dynamic Responses**: NPCs respond based on their personality, mood, and relationship with you
- **Conversation History**: NPCs remember what you've talked about
- **Visual Feedback**: See NPC mood and emotional state during conversations

### ✅ Beautiful Tileset Rendering
- **Real Tileset Support**: Loads actual PNG tilesets (grass.png, trees.png, zone1.png)
- **Proper Layer Rendering**: Ground → Buildings → Objects → Trees (correct Z-order)
- **Smart Tileset Loading**: Reads tileset configuration from map JSON files
- **Fallback Colors**: Graceful degradation if tilesets fail to load
- **Multi-Screen Maps**: Each screen has its own tileset configuration

### ✅ Advanced Player System
- **Full RPG Mechanics**: HP, XP, leveling, stats progression
- **Combat System**: Real-time melee combat with attack animations
- **Collision Detection**: Proper tile-based collision for all entities
- **Screen Transitions**: Move between Town and Forest seamlessly
- **Visual Feedback**: Damage flash, invulnerability, directional indicators

### ✅ Intelligent Enemy AI
- **Dynamic Behavior**: Patrol → Chase → Attack state machine
- **Smart Pathfinding**: Enemies navigate around obstacles
- **Screen-Specific Spawning**: Enemies only appear in appropriate areas
- **Combat Mechanics**: Attack cooldowns, damage dealing, death animations
- **Visual Health Bars**: Real-time HP display

### ✅ Professional UI System
- **HTML-Based Interface**: Clean, modern UI outside the game canvas
- **Real-Time Updates**: All stats and info update dynamically
- **Debug Panel**: Comprehensive development tools (toggleable)
- **Event Log**: See world events with proper persistence (fixed flickering)
- **Character Cards**: Live NPC information with mood and goals

---

## 🚀 How to Run with Ollama

### 1. Install and Start Ollama
```bash
# Install Ollama (if not already installed)
curl https://ollama.ai/install.sh | sh  # Mac/Linux
# Or download from https://ollama.ai/download for Windows

# Pull a model (Qwen3 recommended)
ollama pull qwen3

# Start Ollama server
ollama serve
```

### 2. Run the Game
1. Ensure proper file structure (all JS files in `js/` folder)
2. Open `index.html` in a modern web browser
3. The game will automatically detect Ollama and enable AI features

### 3. Check Ollama Status
- Look for "🤖 Ollama AI integration active!" in the console
- If Ollama isn't running, you'll see "Using simplified AI behaviors"

---

## 🎮 Controls & Gameplay

### Basic Controls
- **WASD/Arrow Keys**: Player movement
- **X/Spacebar**: Attack enemies
- **E**: Talk to NPCs (when close)
- **H**: Show help
- **ESC**: Exit conversation

### NPC Conversations (NEW!)
- **Type anything**: Full free-form text input
- **Quick responses**: Click preset buttons for common phrases
- **Enter**: Send message
- **Say "goodbye"**: End conversation

### Game Modes
- **Observer Mode**: Watch NPCs live their lives
- **Adventure Mode**: Control a player character
- **Speed Controls**: 0.5x, 1x, 2x, 5x simulation speed
- **Pause/Resume**: Stop the world simulation

---

## 💬 Ollama Integration Details

### NPC Behavior
- **Wandering**: NPCs move randomly every 3-7 seconds
- **Major Decisions**: Every 45-75 seconds, NPCs decide to:
  - WORK - Perform their profession
  - REST - Recover and relax
  - TALK - Seek out other characters
  - EXPLORE - Wander with purpose
  - INTERACT - Examine objects

### Conversation System
- **Context Aware**: NPCs know time of day, location, and who's nearby
- **Personality Driven**: Responses match character traits
- **Relationship Based**: NPCs remember how they feel about you
- **Mood System**: Current mood affects responses
- **Memory**: NPCs reference past conversations

### Technical Details
- **Model**: Configured for Qwen3 (can use any Ollama model)
- **Fallback System**: Works without Ollama using procedural responses
- **Response Filtering**: Removes AI "thinking" text from output
- **Emotional Analysis**: Simple sentiment analysis affects relationships

---

## 🐛 Current Known Issues

### 1. **Keyboard Input in Dialogues**
- **Issue**: Can't type certain letters (W, A, S, D, E, Space) in dialogue
- **Cause**: Game controls intercepting keyboard input
- **Status**: Debugging in progress
- **Workaround**: Use quick response buttons or copy/paste

### 2. **Dialogue Text Display**
- **Issue**: Long responses may be cut off
- **Status**: Partially fixed with scrollable dialogue area
- **Solution**: Increased max height to 200px

### 3. **Event Log**
- **Issue**: Events were disappearing/flickering
- **Status**: FIXED - Added proper state checking

---

## 📁 File Structure
```
project-root/
├── index.html                 # Main game file
├── js/                        # JavaScript modules
│   ├── main.js               # Game initialization
│   ├── ollamaIntegration.js  # NEW: AI system
│   ├── dialogueSystem.js     # NEW: Conversation UI
│   ├── aiCharacter.js        # Enhanced NPC class
│   ├── worldEngine.js        # World management
│   ├── renderer.js           # Tileset rendering
│   ├── player.js             # Player character
│   ├── enemy.js              # Enemy AI
│   ├── inputManager.js       # Input handling
│   ├── uiManager.js          # UI updates
│   └── config.js             # Configuration
├── assets/                   
│   ├── maps/                 # JSON map files
│   └── tilesets/             # PNG tileset images
└── docs/                     
    └── README.md             # This file
```

---

## 🔧 Configuration

### Ollama Settings (ollamaIntegration.js)
```javascript
this.baseURL = 'http://localhost:11434'; // Ollama API endpoint
this.model = 'qwen3:latest';            // AI model to use
this.decisionInterval = 45000;          // How often NPCs make decisions
```

### NPC Personalities
- **Elara**: Curious scholar who loves ancient mysteries
- **Grimm**: Gruff but kind blacksmith who protects the town
- **Maya**: Cheerful merchant who shares travel stories

---

## 🚧 Recent Development Progress

### ✅ Completed
- Ollama integration for dynamic NPC dialogue
- Free-form text input system
- NPC mood and relationship systems
- Context-aware AI responses
- Event log flickering fix
- Dialogue UI improvements
- Response text filtering (removes AI "thinking")

### 🔄 In Progress
- Fixing keyboard input capture in dialogue
- Optimizing AI response generation
- Enhanced emotion detection

### 📋 Next Steps
- Group conversations between multiple NPCs
- Quest generation based on NPC needs
- Save/load system with conversation history
- Voice acting integration (text-to-speech)
- More complex relationship dynamics

---

## 🎯 What Makes This Special

1. **True AI Conversations**: Every NPC interaction is unique
2. **Living World**: NPCs continue their lives whether you watch or play
3. **Emergent Storytelling**: Relationships and memories create dynamic narratives
4. **No Server Required**: Everything runs locally in your browser
5. **Graceful Degradation**: Works without Ollama (with simpler AI)

---

## 🆘 Troubleshooting

### Ollama Not Connecting
- Ensure `ollama serve` is running
- Check http://localhost:11434 in browser
- Look for "Ollama API is available" in console

### NPCs Not Responding
- Check if Ollama model is loaded: `ollama list`
- Verify model name in ollamaIntegration.js
- Check browser console for errors

### Performance Issues
- Reduce NPC decision frequency in config
- Use a smaller Ollama model (phi3, gemma2)
- Lower game speed setting

---

## 📚 Ollama Model Recommendations

### For Best Quality
- `qwen3` - Excellent for creative dialogue
- `llama3.2` - Great general purpose
- `mistral` - Fast and capable

### For Performance
- `gemma2:2b` - Very fast, still good
- `phi3:mini` - Tiny but capable
- `llama3.2:1b` - Smallest Llama

---

*"A living world where every conversation is unique, where NPCs remember and react, and where emergent stories unfold through genuine AI-driven interactions."*

**Status**: 🟡 **Functional with minor issues - Keyboard input being debugged**
