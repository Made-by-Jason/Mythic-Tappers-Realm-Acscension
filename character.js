// Character class management
import { gameState } from './game-state.js';
import { elements, room } from './main.js';
import { showNotification } from './notifications.js';
import { recalculateStats } from './ui.js';
import { showLevelUpNotification } from './ui.js';

export function initCharacterSelection() {
    elements.characterSelection.innerHTML = '';
    
    Object.entries(gameState.classes).forEach(([classId, classData]) => {
        const charEl = document.createElement('div');
        charEl.className = 'character-card';
        if (classId === gameState.currentClass) {
            charEl.classList.add('selected');
        }
        
        charEl.innerHTML = `
            <div class="character-icon">${getClassIcon(classId)}</div>
            <div class="character-name">${classData.name}</div>
        `;
        
        charEl.addEventListener('click', () => {
            selectCharacterClass(classId);
        });
        
        elements.characterSelection.appendChild(charEl);
    });
}

export function getClassIcon(classId) {
    const icons = {
        warrior: '⚔️',
        mage: '🔮',
        archer: '🏹',
        paladin: '🛡️'
    };
    return icons[classId] || '👤';
}

export function selectCharacterClass(classId) {
    gameState.currentClass = classId;
    
    // Apply class bonuses
    recalculateStats();
    
    // Update UI
    document.querySelectorAll('.character-card').forEach(card => {
        card.classList.remove('selected');
        if (card.querySelector('.character-name').textContent === gameState.classes[classId].name) {
            card.classList.add('selected');
        }
    });
    
    room.updatePresence({
        currentClass: classId
    });
    
    showNotification(`Class changed to ${gameState.classes[classId].name}!`);
}

export function addPlayerXp(amount) {
    const now = Date.now();
    const xpGain = (gameState.xpBoostUntil && now < gameState.xpBoostUntil) ? Math.floor(amount * 2) : amount;
    gameState.playerXp += xpGain;
    
    while (gameState.playerXp >= gameState.xpToNextLevel) {
        // Level up
        gameState.playerXp -= gameState.xpToNextLevel;
        gameState.playerLevel++;
        
        // Calculate new XP requirement (increases each level)
        gameState.xpToNextLevel = Math.floor(100 * Math.pow(1.2, gameState.playerLevel));
        
        // Show level up notification
        showLevelUpNotification();
        
        // Update presence
        room.updatePresence({
            playerLevel: gameState.playerLevel
        });
    }
    
    import('./ui.js').then(ui => {
        ui.updateUI();
    });
}