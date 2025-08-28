// Mineral spot functionality
import { gameState } from './game-state.js';
import { elements } from './main.js';
import { showNotification } from './notifications.js';
import { addPlayerXp } from './character.js';
import { addItemToInventory } from './inventory.js';
import { updateUI } from './ui.js';
import { room } from './main.js';
import { createItem, addSpecificItemToInventory } from './inventory.js';

// This function is called when user clicks anywhere on screen
export function processScreenClick(event) {
    // Create a click effect at cursor position
    createClickEffect(event.clientX, event.clientY);
    
    // Determine what rewards to give
    const roll = Math.random();
    
    // Several possible outcomes with different probabilities
    if (roll < 0.4) {
        // Gold only
        let amount = Math.floor(1 + Math.random() * 3 * gameState.wave);
        // Apply gold tap buff if active
        const now = Date.now();
        if (gameState.goldTapBuffUntil && now < gameState.goldTapBuffUntil) {
            gameState.goldTapMultiplier = 10;
            amount = Math.floor(amount * gameState.goldTapMultiplier);
        } else {
            gameState.goldTapMultiplier = 1;
        }
        gameState.gold += amount;
        showNotification(`+${amount} Gold`, '#ffd700');
    } else if (roll < 0.7) {
        // XP only
        const amount = Math.floor(5 + Math.random() * 10 * gameState.wave);
        addPlayerXp(amount);
        showNotification(`+${amount} XP`, '#4a95d1');
    } else if (roll < 0.85) {
        // Both gold and XP
        const goldAmount = Math.floor(1 + Math.random() * 2 * gameState.wave);
        const xpAmount = Math.floor(3 + Math.random() * 5 * gameState.wave);
        gameState.gold += goldAmount;
        addPlayerXp(xpAmount);
        showNotification(`+${goldAmount} Gold, +${xpAmount} XP`, '#9e9e9e');
    } else if (roll < 0.95) {
        // Uncommon item
        showNotification("Uncommon treasure found!", "green");
        addItemToInventory("Uncommon");
    } else if (roll < 0.985) {
        // Seasonal loot (drops specific items depending on current realm season)
        createSeasonalLoot();
    } else {
        // Legendary find (1% chance)
        showNotification("Legendary treasure found!", "gold");
        addItemToInventory("Legendary");
    }
    
    updateUI();
}

// Create visual effect for clicking
function createClickEffect(x, y) {
    const effect = document.createElement('div');
    effect.className = 'click-effect';
    effect.style.left = `${x}px`;
    effect.style.top = `${y}px`;
    
    document.body.appendChild(effect);
    
    // Remove after animation completes
    setTimeout(() => {
        effect.remove();
    }, 500);
}

// Create seasonal loot based on current realm season
function createSeasonalLoot() {
    const realm = gameState.realm;
    const seasons = room.roomState?.realmSeasons?.[realm] || { current: 'Spring' };
    const season = seasons.current || 'Spring';
    const seasonalMap = {
        Spring: { name: 'Spring Bloom', icon: '🌸' },
        Summer: { name: 'Sun Shard', icon: '☀️' },
        Autumn: { name: 'Fallen Leaf', icon: '🍂' },
        Winter: { name: 'Ice Crystal', icon: '❄️' }
    };
    const base = seasonalMap[season] || seasonalMap.Spring;

    // Rarity roll biased for seasonal loot
    const r2 = Math.random();
    let rarity = 'Uncommon';
    if (r2 < 0.02) rarity = 'Legendary';
    else if (r2 < 0.08) rarity = 'Epic';
    else if (r2 < 0.28) rarity = 'Rare';

    // Simple seasonal stat set depending on rarity
    let stats = {};
    if (rarity === 'Uncommon') stats = { goldBonus: 0.03 };
    else if (rarity === 'Rare') stats = { goldBonus: 0.06, tapDamage: 1 };
    else if (rarity === 'Epic') stats = { goldBonus: 0.10, tapDamage: 2, idleDamage: 1 };
    else if (rarity === 'Legendary') stats = { goldBonus: 0.15, tapDamage: 5, idleDamage: 3 };

    const item = {
        id: `season-${Date.now()}-${Math.random().toString(16).slice(2)}`,
        name: `${base.name}`,
        rarity,
        icon: base.icon,
        stats,
        season // tag item with its season for later checks (selling / marketplace logic)
    };

    addSpecificItemToInventory(item);
    showNotification(`${base.name} found (${rarity})!`, '#5ec66a');
}

// Keep these functions for compatibility with existing code
export function initMineralSpot() {
    // No longer needed
}

export function randomPosMineralSpot() {
    // No longer needed
}

export function mineMineral() {
    // No longer needed, replaced by processScreenClick
}
