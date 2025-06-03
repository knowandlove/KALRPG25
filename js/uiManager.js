// uiManager.js
import CONFIG from './config.js';

export default class UIManager {
    constructor() {
        // DOM element references for the side panel (from ai-adventure-game (2).html)
        this.worldTimeEl = document.getElementById('worldTime');
        this.populationEl = document.getElementById('population');
        this.modeEl = document.getElementById('mode');
        this.characterListEl = document.getElementById('characterList');
        this.eventsEl = document.getElementById('events'); // The div that contains event entries
        this.pauseBtnEl = document.getElementById('pauseBtn');
        this.speedBtnEl = document.getElementById('speedBtn');
        this.joinBtnEl = document.getElementById('joinBtn');


        // DOM element references for player stats (inspired by kalrpgsinglev1.html, assuming similar IDs in index.html)
        // We'll need to ensure these IDs exist in the main index.html if we want to display them.
        // For now, these are placeholders. The original kalrpgsinglev1.html had these in a separate .ui div.
        // We might integrate them into the sidePanel or a new HUD element.
        this.playerHpEl = document.getElementById('playerHp'); // Example ID, ensure it exists
        this.playerLevelEl = document.getElementById('playerLevel'); // Example ID
        this.playerXpEl = document.getElementById('playerXp'); // Example ID

        if (!this.worldTimeEl || !this.populationEl || !this.modeEl || !this.characterListEl || !this.eventsEl) {
            console.warn("UIManager: One or more main UI elements from ai-adventure-game's side panel are missing!");
        }
    }

    // --- Update Methods for Side Panel (Living World Info) ---

    updateWorldInfo(worldEngine) {
        if (!worldEngine) return;

        // Update world time (logic from original WorldEngine.updateUI)
        const dayLength = worldEngine.dayLength; //
        const worldTime = worldEngine.worldTime; //
        const gameSpeed = worldEngine.gameSpeed || 1; //

        // Adjust effective world time for display based on how worldTime is incremented
        // Assuming worldTime increments by gameSpeed each tick, and dayLength is in these "effective ticks"
        const effectiveWorldTimeForHourCalc = worldTime;
        const days = Math.floor(effectiveWorldTimeForHourCalc / dayLength) + 1;
        const hours = Math.floor((effectiveWorldTimeForHourCalc % dayLength) / (dayLength / 24));
        const minutes = Math.floor(((effectiveWorldTimeForHourCalc % dayLength) % (dayLength / 24)) / (dayLength / 24 / 60));
        
        if (this.worldTimeEl) {
            this.worldTimeEl.textContent = `Day ${days}, ${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}`;
        }

        // Update population
        if (this.populationEl) {
            this.populationEl.textContent = worldEngine.friendlyNPCs.size;
        }
    }

    updateCharacterList(friendlyNPCs) {
        if (!this.characterListEl || !friendlyNPCs) return;
        this.characterListEl.innerHTML = ''; // Clear existing list

        for (const [name, character] of friendlyNPCs) {
            const card = document.createElement('div');
            card.className = 'character-card'; // Class from original CSS
            // Goal description might need to be dynamically generated or simplified
            const goalDescription = character.currentGoal ? character.currentGoal.description : "Idle";
            card.innerHTML = `
                <div class="character-name">${character.appearance.symbol || '?'} ${name}</div>
                <div class="character-status">HP: ${character.stats.hp} | Lvl: ${character.stats.level}</div>
                <div class="character-goal">Goal: ${goalDescription}</div>
            `;
            this.characterListEl.appendChild(card);
        }
    }

          updateEventLog(events) {
        if (!this.eventsEl) {
            console.warn('Events element not found!');
            return;
        }
        
        if (!events || !Array.isArray(events)) {
            console.warn('Invalid events data:', events);
            return;
        }
        
        // Don't update if nothing has changed (prevent flicker)
        const eventSignature = events.map(e => e.timestamp).join(',');
        if (this.lastEventSignature === eventSignature) {
            return; // No changes, don't re-render
        }
        this.lastEventSignature = eventSignature;
        
        // Clear and rebuild
        this.eventsEl.innerHTML = '';
        
        if (events.length === 0) {
            const noEvents = document.createElement('div');
            noEvents.className = 'event-entry';
            noEvents.style.color = '#666';
            noEvents.textContent = 'No events yet...';
            this.eventsEl.appendChild(noEvents);
            return;
        }

        // Display up to a certain number of recent events
        const maxEventsToShow = 10;
        for (let i = 0; i < Math.min(events.length, maxEventsToShow); i++) {
            const event = events[i];
            const entry = document.createElement('div');
            entry.className = 'event-entry';
            
            // Ensure text is visible with inline styles
            entry.style.cssText = `
                color: #fff;
                padding: 5px;
                margin: 2px 0;
                background: #222;
                border-left: 3px solid #66f;
                font-size: 12px;
                font-family: 'Courier New', monospace;
                animation: none;
            `;
            
            // Handle both string events and event objects
            if (typeof event === 'string') {
                entry.textContent = event;
            } else if (event && event.text) {
                entry.textContent = event.text;
            } else {
                entry.textContent = 'Unknown event';
            }
            
            this.eventsEl.appendChild(entry);
        }
    }

    // --- Update Methods for Game Controls and Mode ---
    updateGameModeDisplay(gameMode, isPaused, gameSpeed) {
        if (this.modeEl) {
            this.modeEl.textContent = gameMode === 'adventure' ? 'Adventure' : 'Observer';
            this.modeEl.style.color = gameMode === 'adventure' ? '#ff8' : '#8f8';
        }
        if (this.joinBtnEl) {
            this.joinBtnEl.textContent = gameMode === 'adventure' ? 'Leave World' : 'Join World';
            this.joinBtnEl.style.background = gameMode === 'adventure' ? '#f44' : '#4f4';
        }
        if (this.pauseBtnEl) {
            this.pauseBtnEl.textContent = isPaused ? 'Resume' : 'Pause';
            this.pauseBtnEl.classList.toggle('paused', isPaused); // CSS class from original
        }
        if (this.speedBtnEl) {
            this.speedBtnEl.textContent = `Speed: ${gameSpeed}x`;
        }
    }


    // --- Update Methods for Player-Specific UI (RPG Stats) ---
    // These methods assume corresponding HTML elements exist.
    // We need to add these elements to index.html, perhaps in a new HUD div or integrated into the side panel.

    showPlayerHUD(show) {
        // This method would show/hide a dedicated player HUD container
        const playerHUD = document.getElementById('playerHUD'); // Assuming a container with this ID
        if (playerHUD) {
            playerHUD.style.display = show ? 'block' : 'none';
        }
    }

    updatePlayerStats(player) {
        if (!player) {
            // If no player, or not in adventure mode, hide/clear player stats
            if (this.playerHpEl) this.playerHpEl.textContent = 'N/A';
            if (this.playerLevelEl) this.playerLevelEl.textContent = 'N/A';
            if (this.playerXpEl) this.playerXpEl.textContent = 'N/A';
            this.showPlayerHUD(false);
            return;
        }
        
        this.showPlayerHUD(true);
        if (this.playerHpEl) {
            this.playerHpEl.textContent = `${Math.floor(player.hp)}/${player.maxHp}`;
        }
        if (this.playerLevelEl) {
            this.playerLevelEl.textContent = player.level;
        }
        if (this.playerXpEl) {
            this.playerXpEl.textContent = `${player.xp}/${player.xpToNext}`;
        }
    }

    // --- Combined Update Function ---
    // This can be called from main.js's game loop
    updateAllUI(worldEngine, player, gameMode) {
        if (!worldEngine) return;

        this.updateWorldInfo(worldEngine);
        this.updateCharacterList(worldEngine.friendlyNPCs);
        this.updateEventLog(worldEngine.events);
        this.updateGameModeDisplay(gameMode, worldEngine.isPaused, worldEngine.gameSpeed);
        
        if (gameMode === 'adventure' && player) {
            this.updatePlayerStats(player);
        } else {
            this.updatePlayerStats(null); // Clear/hide player stats if not in adventure mode
        }
    }
}
