// Multiplayer functionality
import { elements, room } from './main.js';
import { showSkillEffect } from './ui.js';
import { applyWorldBossState } from './enemy.js'; // Use the new local-applier instead of triggering another spawn

export function setupMultiplayer() {
    // Handle incoming messages
    room.onmessage = (event) => {
        switch (event.data.type) {
            case "skill-used":
                // Show other player skill effects
                if (event.data.clientId !== room.clientId) {
                    showSkillEffect(event.data.skillIndex);
                }
                break;
            case "world-boss-spawned":
                // Apply the boss state locally using the provided boss payload
                if (event.data.boss) {
                    applyWorldBossState(event.data.boss);
                }
                break;
        }
    };
}

export function updatePlayersList() {
    elements.playersList.innerHTML = '';
    
    // Display up to 5 players
    const players = Object.values(room.presence).slice(0, 5);
    
    players.forEach(player => {
        if (!player.username) return;
        
        const playerEl = document.createElement('div');
        playerEl.className = 'multiplayer-item';
        playerEl.innerHTML = `
            <div class="player-avatar" style="background-color: ${getAvatarColor(player.playerId)}"></div>
            <div class="player-name">${player.username}</div>
        `;
        
        elements.playersList.appendChild(playerEl);
    });
}

export function getAvatarColor(playerId) {
    // Generate a deterministic color based on player ID
    let hash = 0;
    for (let i = 0; i < playerId.length; i++) {
        hash = playerId.charCodeAt(i) + ((hash << 5) - hash);
    }
    
    const hue = hash % 360;
    return `hsl(${hue}, 70%, 60%)`;
}