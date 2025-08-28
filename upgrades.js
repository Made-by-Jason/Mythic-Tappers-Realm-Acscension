// Upgrades functionality
import { gameState } from './game-state.js';
import { elements, room } from './main.js';
import { showNotification } from './notifications.js';
import { updateUI, recalculateStats } from './ui.js';

export function initUpgrades() {
    // Update upgrade items
    updateUpgradeItems();
}

export function updateUpgradeItems() {
    elements.upgradeItems.innerHTML = '';
    
    // Create upgrade items
    const upgrades = [
        {id: 'tapDamage', name: 'Tap Damage', desc: `Level ${gameState.upgrades.tapDamage.level}: +${gameState.upgrades.tapDamage.effect} damage per tap`, cost: gameState.upgrades.tapDamage.cost, icon: '👆'},
        {id: 'idleDamage', name: 'Idle Damage', desc: `Level ${gameState.upgrades.idleDamage.level}: +${gameState.upgrades.idleDamage.effect} DPS`, cost: gameState.upgrades.idleDamage.cost, icon: '⏱️'},
        {id: 'critChance', name: 'Critical Chance', desc: `Level ${gameState.upgrades.critChance.level}: +${gameState.upgrades.critChance.level * 5}% crit chance`, cost: gameState.upgrades.critChance.cost, icon: '⚡'},
        {id: 'goldBonus', name: 'Gold Bonus', desc: `Level ${gameState.upgrades.goldBonus.level}: +${gameState.upgrades.goldBonus.level * 10}% gold`, cost: gameState.upgrades.goldBonus.cost, icon: '💰'}
    ];
    
    upgrades.forEach(upgrade => {
        const upgradeEl = document.createElement('div');
        upgradeEl.className = 'upgrade-item';
        upgradeEl.innerHTML = `
            <div class="item-icon">${upgrade.icon}</div>
            <div class="item-details">
                <div class="item-name">${upgrade.name}</div>
                <div class="item-desc">${upgrade.desc}</div>
            </div>
            <div class="item-cost">${upgrade.cost}</div>
        `;
        
        upgradeEl.addEventListener('click', () => {
            buyUpgrade(upgrade.id);
        });
        
        elements.upgradeItems.appendChild(upgradeEl);
    });
}

export function buyUpgrade(upgradeId) {
    const upgrade = gameState.upgrades[upgradeId];
    
    if (gameState.gold >= upgrade.cost) {
        gameState.gold -= upgrade.cost;
        upgrade.level++;
        
        // Apply upgrade effect
        switch(upgradeId) {
            case 'tapDamage':
                upgrade.effect = Math.floor(upgrade.level * Math.pow(1.1, upgrade.level));
                gameState.tapDamage = 1 + upgrade.effect;
                break;
            case 'idleDamage':
                upgrade.effect = Math.floor(upgrade.level * Math.pow(1.1, upgrade.level));
                gameState.idleDamage = upgrade.effect;
                break;
            case 'critChance':
                gameState.critChance = 0.05 + (upgrade.level * 0.05);
                break;
            case 'goldBonus':
                // Will be applied in the goldEarned calculation
                break;
        }
        
        // Increase cost for next level
        upgrade.cost = Math.floor(upgrade.cost * 1.5);
        
        // Apply class modifiers
        recalculateStats();
        
        updateUpgradeItems();
        updateUI();
        
        room.updatePresence({
            tapDamage: gameState.tapDamage,
            dps: gameState.idleDamage
        });
    } else {
        showNotification("Not enough gold!");
    }
}