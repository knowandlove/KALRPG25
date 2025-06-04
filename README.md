# 🌟 AI Adventure Game - Living World Engine

## 📋 Overview

A browser-based adventure game featuring a persistent living world where NPCs follow daily schedules and have their own lives. Switch seamlessly between **Observer Mode** (watch the world) and **Adventure Mode** (play as a character) in a tile-based RPG with real-time combat and interactive dialogue.

---

## 🎮 Core Features

### ✅ Dual Game Modes
- **Observer Mode**: Watch NPCs live autonomous lives with daily schedules
- **Adventure Mode**: Control a player character with full RPG mechanics
- **Seamless Switching**: Toggle between modes anytime with the "Join/Leave World" button

### ✅ Living World Simulation  
- **Autonomous NPCs**: Each character has personality, goals, schedules, and memories
- **Multi-Screen World**: Town and Forest areas with automatic transitions
- **Dynamic Day/Night Cycle**: 24-second days affecting NPC behavior
- **Persistent Relationships**: NPCs remember interactions and build relationships
- **World Events**: Random atmospheric events create immersion

### ✅ Tree-Based Dialogue System
- **Branching Conversations**: Each NPC has unique dialogue trees
- **Quest Integration**: Conversations can trigger quests
- **Keyboard & Mouse Controls**: Number keys or click to select responses
- **NPC Personalities**: 
  - **Elara**: Scholar studying ancient mysteries
  - **Grimm**: Gruff blacksmith with a kind heart
  - **Maya**: Cheerful merchant with travel stories

### ✅ Combat System
- **Real-Time Combat**: Attack with X or Spacebar
- **Enemy Types**: Goblins, orcs, wolves, and bandits in the forest
- **Visual Feedback**: Damage flash, knockback, death animations
- **XP & Leveling**: Gain experience and level up by defeating enemies
- **Safe Respawn**: Die in combat? Wake up safely in town (lose 10% XP)

### ✅ RPG Mechanics
- **Player Stats**: HP, Level, XP, Attack Damage
- **Screen Transitions**: Move between town and forest seamlessly
- **Collision System**: Proper tile-based movement and collision
- **Enemy AI**: Patrol, chase, and attack behaviors

### ✅ Modern UI System
- **Side Panel**: Live NPC status and world events
- **Player HUD**: Health, level, and XP display
- **World Info**: Current time, population, game mode
- **Speed Controls**: 0.5x, 1x, 2x, 5x simulation speed
- **Debug Panel**: Development tools (toggle with Debug button)

---

## 🚀 How to Run

1. **File Structure**: Ensure all files are in correct folders:
   ```
   project-root/
   ├── index.html
   ├── js/
   │   ├── main.js
   │   ├── dialogueSystem.js
   │   ├── aiCharacter.js
   │   ├── worldEngine.js
   │   ├── renderer.js
   │   ├── player.js
   │   ├── enemy.js
   │   ├── inputManager.js
   │   ├── uiManager.js
   │   └── config.js
   └── assets/
       ├── maps/
       └── tilesets/
   ```

2. **Open Game**: Simply open `index.html` in a modern web browser
3. **No Server Required**: Everything runs locally in your browser

---

## 🎮 Controls

### Movement & Combat
- **WASD/Arrow Keys**: Move your character
- **X/Spacebar**: Attack enemies
- **E**: Talk to nearby NPCs

### Dialogue
- **Number Keys (1-9)**: Select dialogue options
- **Mouse Click**: Click on dialogue choices
- **ESC**: Exit conversation

### UI Controls
- **H**: Show help
- **Pause/Resume**: Pause world simulation
- **Speed Button**: Change simulation speed
- **Join/Leave World**: Switch between Observer/Adventure mode
- **Debug Button**: Toggle debug information

---

## 💬 NPC Dialogue & Quests

### Current NPCs
1. **Elara the Scholar**
   - Location: Town square
   - Topics: Town history, ancient mysteries, the forest
   - Quest: "Find ancient tablet fragments"

2. **Grimm the Blacksmith**
   - Location: Town square
   - Topics: Smithing, weapons, forest dangers
   - Quest: "Bring 5 iron ore from the forest"

3. **Maya the Merchant**
   - Location: Town square
   - Topics: Travel stories, rumors, treasures
   - Quest: "Clear the goblin watchtower"

### NPC Schedules
- **Morning**: NPCs work at their professions
- **Afternoon**: Continued work or exploration
- **Evening**: Socializing and rest
- **Night**: Sleep or quiet activities

---

## 🗺️ World Layout

### Town (Safe Zone)
- Central spawn point
- Three friendly NPCs
- No enemies
- Southern exit leads to forest

### Forest (Combat Zone)
- Multiple enemy spawns
- Dangerous but rewarding
- Northern exit returns to town
- Future quest locations

---

## 🛠️ Technical Details

### Architecture
- **Modular ES6**: Clean separation of concerns
- **No Dependencies**: Pure JavaScript, no frameworks
- **Tileset Support**: Renders tiled maps with collision
- **State Management**: Centralized world state

### Performance
- **Optimized Rendering**: Only draws visible tiles
- **Efficient Updates**: NPCs only update on current screen
- **Smart Spawning**: Ensures entities spawn in valid locations

---

## 🐛 Recent Fixes

- ✅ **Combat System**: Fixed enemy detection and damage
- ✅ **Respawn System**: Players respawn safely in town
- ✅ **Dialogue Input**: Fixed keyboard blocking during conversations
- ✅ **NPC Movement**: NPCs pause during conversations
- ✅ **Performance**: Removed Ollama AI integration for stability

---

## 🚧 Roadmap

### Immediate Priorities
1. **Quest System**: Track and complete NPC quests
2. **Inventory System**: Collect and manage items
3. **Save/Load**: Persist game state

### Future Features
- **More NPCs**: Expand the town population
- **Crafting System**: Use collected materials
- **Dungeon Areas**: New screens with puzzles
- **Boss Enemies**: Challenging combat encounters
- **Multiplayer**: Share worlds with friends

---

## 💡 Tips for Players

1. **Start in Observer Mode** to learn NPC patterns
2. **Talk to all NPCs** to discover quests
3. **Level up in the forest** before taking on groups
4. **Watch the time** - NPCs behave differently throughout the day
5. **Check the event log** for world happenings

---

## 🔧 Customization

### Adding Dialogue
```javascript
dialogueSystem.addDialogueNode('Elara', 'new_node', {
    text: "I've discovered something amazing!",
    choices: [
        { text: "Tell me more", next: "discovery" },
        { text: "Maybe later", next: "start" }
    ]
});
```

### Creating NPCs
```javascript
const newNPC = new AICharacter("Bob", 
    "A mysterious wanderer",
    { color: "#00ff00", symbol: "?" }
);
```

---

## 🎯 Known Issues

- **Tileset Loading**: Falls back to colors if tilesets missing
- **Screen Edges**: Some collision issues at screen boundaries
- **Memory**: Long play sessions may accumulate events

---

## 🤝 Contributing

Feel free to fork and improve! Key areas for contribution:
- Additional dialogue trees
- New enemy types
- Quest system implementation
- UI improvements

---

*"A living world where every NPC has a story, every conversation matters, and adventure awaits around every corner."*

**Version**: 1.0.0  
**Status**: 🟢 **Fully Playable**  
**Last Updated**: November 2024
