// Shop functionality
import { gameState } from './game-state.js';
import { elements } from './main.js';
import { showNotification } from './notifications.js';
import { updateUI } from './ui.js';
import { addSpecificItemToInventory } from './inventory.js';

export function initShop() {
    // Define shop items
    const shopItems = [
        {id: 'potion', name: 'Health Potion', desc: 'Restore 50% health', cost: 50, icon: '❤️'},
        {id: 'doubleTap', name: 'Double Tap', desc: 'Double tap damage for 30s', cost: 100, icon: '👆'},
        {id: 'goldBoost', name: 'Gold Boost', desc: '2x gold for 60s', cost: 150, icon: '💰'},
        {id: 'critBoost', name: 'Crit Boost', desc: '+20% crit chance for 45s', cost: 200, icon: '⚡'},
        {id: 'autoTap', name: 'Auto Tapper (30s)', desc: 'Auto taps every 0.2s for 30s', cost: 180, icon: '🤖'},
        {id: 'lootBox', name: 'Mystery Chest', desc: 'Grants Rare–Legendary item', cost: 220, icon: '🎁'},
        {id: 'megaBomb', name: 'Mega Bomb', desc: 'Deals 25% boss/enemy HP', cost: 260, icon: '💣'},
        {id: 'xpArtifact', name: 'Ancient Artifact', desc: '2x XP gain for 5m', cost: 300, icon: '📿'},
        {id: 'chestSlots', name: 'Community Chest +5', desc: 'Unlock 5 shared chest slots (global)', cost: 250, icon: '📦'}
    ];
    
    // Create shop items
    elements.shopItems.innerHTML = '';
    shopItems.forEach(item => {
        const itemEl = document.createElement('div');
        itemEl.className = 'shop-item';
        itemEl.innerHTML = `
            <div class="item-icon">${item.icon}</div>
            <div class="item-details">
                <div class="item-name">${item.name}</div>
                <div class="item-desc">${item.desc}</div>
            </div>
            <div class="item-cost">${item.cost}</div>
        `;
        
        itemEl.addEventListener('click', () => {
            buyShopItem(item);
        });
        
        elements.shopItems.appendChild(itemEl);
    });
}

export function buyShopItem(item) {
    if (gameState.gold >= item.cost) {
        gameState.gold -= item.cost;
        
        // Apply item effect
        switch(item.id) {
            case 'potion':
                // Heal enemy (for demo)
                gameState.enemyHealth = gameState.maxEnemyHealth * 0.5;
                if (gameState.enemyHealth > gameState.maxEnemyHealth) {
                    gameState.enemyHealth = gameState.maxEnemyHealth;
                }
                break;
            case 'doubleTap':
                // Double tap damage temporarily
                const originalTapDamage = gameState.tapDamage;
                gameState.tapDamage *= 2;
                setTimeout(() => {
                    gameState.tapDamage = originalTapDamage;
                }, 30000);
                break;
            case 'goldBoost':
                // Will be applied in the goldEarned calculation
                gameState.goldBoostActive = true;
                setTimeout(() => {
                    gameState.goldBoostActive = false;
                }, 60000);
                break;
            case 'critBoost':
                // Increase crit chance temporarily
                const originalCritChance = gameState.critChance;
                gameState.critChance += 0.2;
                setTimeout(() => {
                    gameState.critChance = originalCritChance;
                }, 45000);
                break;
            case 'autoTap': {
                const durationMs = 30000;
                const intervalMs = 200;
                if (gameState._autoTapInterval) clearInterval(gameState._autoTapInterval);
                const endAt = Date.now() + durationMs;
                gameState._autoTapInterval = setInterval(async () => {
                    if (Date.now() > endAt) {
                        clearInterval(gameState._autoTapInterval);
                        gameState._autoTapInterval = null;
                        return;
                    }
                    const isCrit = Math.random() < gameState.critChance;
                    let dmg = gameState.tapDamage;
                    if (isCrit) dmg = Math.floor(dmg * gameState.critMultiplier);
                    const { dealDamage } = await import('./enemy.js');
                    dealDamage(dmg, isCrit, null);
                }, intervalMs);
                break;
            }
            case 'lootBox': {
                const r = Math.random();
                let rarity = 'Rare';
                if (r < 0.15) rarity = 'Legendary';
                else if (r < 0.50) rarity = 'Epic';
                import('./inventory.js').then(({ addSpecificItemToInventory, generateItemStats }) => {
                    const types = ['⚔️','🛡️','👑','💍','🔮','🏹'];
                    const icon = types[Math.floor(Math.random()*types.length)];
                    addSpecificItemToInventory({
                        id: `box-${Date.now()}-${Math.random().toString(16).slice(2)}`,
                        name: `${rarity} Mystery ${icon === '⚔️' ? 'Blade' : icon === '🛡️' ? 'Guard' : 'Relic'}`,
                        rarity,
                        icon,
                        stats: generateItemStats ? generateItemStats(rarity) : { tapDamage: 3 }
                    });
                });
                break;
            }
            case 'megaBomb': {
                const targetMax = gameState.maxEnemyHealth || 1;
                const dmg = Math.max(1, Math.floor(targetMax * 0.25));
                import('./enemy.js').then(({ dealDamage }) => dealDamage(dmg, false, null));
                break;
            }
            case 'xpArtifact':
                gameState.xpBoostUntil = Date.now() + 5 * 60 * 1000;
                showNotification('Ancient Artifact activated: 2x XP for 5 minutes!', '#4a95d1');
                break;
            case 'chestSlots':
                // Track per-client purchases in room state
                import('./main.js').then(({ room }) => {
                    const owned = (room.roomState.chestSlotPurchases && room.roomState.chestSlotPurchases[room.clientId]) || 0;
                    room.updateRoomState({
                        chestSlotPurchases: {
                            [room.clientId]: owned + 1
                        }
                    });
                });
                break;
        }
        
        updateUI();
        showNotification(`Used ${item.name}!`);
    } else {
        showNotification("Not enough gold!");
    }
}

// Prestige Shop
export function initPrestigeShop() {
    const container = document.getElementById('prestige-shop-items');
    if (!container) return;
    const items = [
        { id: 'gal_armor', name: 'Galactic Armor', cost: 5, icon: '🛡️', stats: { idleDamage: 15, tapDamage: 5, goldBonus: 0.1 } },
        { id: 'gal_blade', name: 'Galactic Blade', cost: 5, icon: '⚔️', stats: { tapDamage: 25, critChance: 0.1 } },
        { id: 'gal_relic', name: 'Galactic Relic', cost: 8, icon: '🔮', stats: { goldBonus: 0.2, idleDamage: 10 } },
        { id: 'gal_ring', name: 'Galactic Ring', cost: 6, icon: '💍', stats: { critChance: 0.15, tapDamage: 10 } },
        { id: 'gal_bow', name: 'Galactic Bow', cost: 7, icon: '🏹', stats: { tapDamage: 18, idleDamage: 5 } }
    ];
    container.innerHTML = '';
    items.forEach(it => {
        const el = document.createElement('div');
        el.className = 'shop-item';
        el.innerHTML = `
            <div class="item-icon">${it.icon}</div>
            <div class="item-details">
                <div class="item-name">${it.name}</div>
                <div class="item-desc">Costs ${it.cost} Prestige Points</div>
            </div>
            <div class="item-cost">${it.cost} PP</div>
        `;
        el.onclick = () => buyPrestigeItem(it);
        container.appendChild(el);
    });
}

export function buyPrestigeItem(it) {
    if ((gameState.prestigePoints || 0) < it.cost) { showNotification('Not enough Prestige Points!','#ff5252'); return; }
    gameState.prestigePoints -= it.cost;
    addSpecificItemToInventory({
        id: `gal-${Date.now()}-${Math.random().toString(16).slice(2)}`,
        name: `Galactic ${it.name.split(' ')[1] || 'Item'}`,
        rarity: 'Galactic',
        icon: it.icon,
        stats: it.stats
    });
    updateUI();
    showNotification(`Purchased ${it.name}!`, '#00e5ff');
}
