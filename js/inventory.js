// Inventory management
import { gameState, INVENTORY_SIZE, unlockAchievement } from './game-state.js';
import { elements } from './main.js';
import { showItemToast, showNotification } from './notifications.js'; // Correctly importing showItemToast

let tooltipTimeout;
const tooltipDelay = 300; // milliseconds delay before showing tooltip
let selectedCraftingSlots = [];

export function initInventory() {
    elements.inventoryGrid.innerHTML = '';
    selectedCraftingSlots = []; // Reset selection on init

    for (let i = 0; i < INVENTORY_SIZE; i++) {
        const slotEl = document.createElement('div');
        slotEl.className = 'inventory-slot';
        slotEl.setAttribute('data-slot', i);

        const item = gameState.inventory[i];
        if (item) {
            slotEl.innerHTML = `
                <div class="slot-item" draggable="true">
                    <div class="item-icon">${item.icon}</div>
                    <div class="item-rarity" style="background-color: ${getRarityColor(item.rarity)}"></div>
                </div>
            `;
            // Add tooltip events
            slotEl.addEventListener('mouseenter', (e) => {
                clearTimeout(tooltipTimeout); // Clear any existing timeout
                tooltipTimeout = setTimeout(() => showItemTooltip(item, slotEl), tooltipDelay);
            });
            slotEl.addEventListener('mouseleave', hideItemTooltip);
            // Add crafting selection event
            slotEl.addEventListener('click', () => toggleCraftingSelection(slotEl, i));
        } else {
             slotEl.innerHTML = ''; // Ensure empty slots are visually empty
        }

        elements.inventoryGrid.appendChild(slotEl);
    }
     updateCraftingUISelection(); // Update crafting display based on selection

    // Attach Sell-by-Rarity UI handlers (if present)
    const sellBtn = document.getElementById('sell-rarity-button');
    const sellSelect = document.getElementById('sell-rarity-select');
    if (sellBtn && sellSelect) {
        sellBtn.removeEventListener('click', handleSellClick); // safe remove if re-init
        function handleSellClick() {
            const rarity = sellSelect.value;
            sellItemsByRarity(rarity);
        }
        // Keep a reference-less listener (no closure leak)
        sellBtn.addEventListener('click', handleSellClick);
    }
}

export function getRarityColor(rarity) {
    const colors = {
        "Common": "gray",
        "Uncommon": "green",
        "Rare": "blue",
        "Epic": "purple",
        "Legendary": "orange",
        "Mythical": "gold",
        "Galactic": "#00e5ff"
    };
    return colors[rarity] || "gray";
}

export function addItemToInventory(forcedRarity = null) {
    // Find an empty slot
    let emptySlot = -1;
    for (let i = 0; i < INVENTORY_SIZE; i++) {
        if (!gameState.inventory[i]) {
            emptySlot = i;
            break;
        }
    }

    if (emptySlot === -1) {
        showItemToast({ name: "Inventory Full!", rarity: "System", icon: '⚠️', stats: {} });
        return;
    }

    // Determine item rarity
    let rarity = forcedRarity;
    if (!rarity) {
        // ... existing rarity roll logic ...
         const roll = Math.random();
        if (roll < 0.005) rarity = "Mythical";
        else if (roll < 0.05) rarity = "Legendary";
        else if (roll < 0.15) rarity = "Epic";
        else if (roll < 0.3) rarity = "Rare";
        else if (roll < 0.55) rarity = "Uncommon";
        else rarity = "Common";
    }

    // Create the item
    const itemTypes = ['⚔️', '🛡️', '👑', '💍', '🧪', '📜', '🔮', '🏹', '🔨', '⛏️', '🧤', '👢']; // Added more icons
    const itemType = itemTypes[Math.floor(Math.random() * itemTypes.length)];
    const item = {
        id: `item-${Date.now()}-${Math.random().toString(16).slice(2)}`, // More unique ID
        name: `${rarity} ${getItemTypeName(itemType)}`,
        rarity: rarity,
        icon: itemType,
        stats: generateItemStats(rarity)
    };
    gameState.inventory[emptySlot] = item;

    // Update inventory UI for the specific slot
    updateInventorySlot(emptySlot);
    showItemToast(item); // Show toast notification for the new item

    // Achievements for rare drops
    if (item.rarity === 'Legendary' || item.rarity === 'Mythical') {
        const id = item.rarity === 'Mythical' ? 'got_mythical' : 'got_legendary';
        if (unlockAchievement && unlockAchievement(id, `Found ${item.rarity}`, `You found a ${item.rarity} item!`)) {
            showNotification(`Achievement Unlocked: Found ${item.rarity} Item`, '#ffd700');
        }
    }
}

// Helper to get a descriptive name from icon
function getItemTypeName(icon) {
    const names = {
        '⚔️': 'Sword', '🛡️': 'Shield', '👑': 'Crown', '💍': 'Ring', '🧪': 'Potion',
        '📜': 'Scroll', '🔮': 'Orb', '🏹': 'Bow', '🔨': 'Hammer', '⛏️': 'Pickaxe',
        '🧤': 'Gloves', '👢': 'Boots'
    };
    return names[icon] || 'Item';
}

export function removeItemFromInventory(slotIndex) {
    if (slotIndex >= 0 && slotIndex < INVENTORY_SIZE && gameState.inventory[slotIndex]) {
        gameState.inventory[slotIndex] = null;
        updateInventorySlot(slotIndex);
        // If the removed item was selected for crafting, update crafting UI
        const craftIndex = selectedCraftingSlots.indexOf(slotIndex);
        if(craftIndex > -1) {
            selectedCraftingSlots.splice(craftIndex, 1);
            updateCraftingUISelection();
        }
        return true;
    }
    return false;
}

export function updateInventorySlot(slotIndex) {
     const slotEl = elements.inventoryGrid.querySelector(`[data-slot="${slotIndex}"]`);
     if (!slotEl) return;

     const item = gameState.inventory[slotIndex];
     if (item) {
         slotEl.innerHTML = `
             <div class="slot-item" draggable="true">
                 <div class="item-icon">${item.icon}</div>
                 <div class="item-rarity" style="background-color: ${getRarityColor(item.rarity)}"></div>
             </div>
         `;
         // Re-attach events
         slotEl.replaceWith(slotEl.cloneNode(true)); // Simple way to remove old listeners
         const newSlotEl = elements.inventoryGrid.querySelector(`[data-slot="${slotIndex}"]`);
         newSlotEl.addEventListener('mouseenter', (e) => {
            clearTimeout(tooltipTimeout); // Clear any existing timeout
            tooltipTimeout = setTimeout(() => showItemTooltip(item, newSlotEl), tooltipDelay);
        });
         newSlotEl.addEventListener('mouseleave', hideItemTooltip);
         newSlotEl.addEventListener('click', () => toggleCraftingSelection(newSlotEl, slotIndex));
         // Re-apply selected class if needed
         if (selectedCraftingSlots.includes(slotIndex)) {
            newSlotEl.classList.add('selected-for-crafting');
         }
     } else {
         slotEl.innerHTML = '';
         slotEl.replaceWith(slotEl.cloneNode(true)); // Remove listeners from empty slot
          const newSlotEl = elements.inventoryGrid.querySelector(`[data-slot="${slotIndex}"]`);
           newSlotEl.classList.remove('selected-for-crafting'); // Ensure selection class is removed
     }
}

export function generateItemStats(rarity) {
    const rarityMultiplier = {
        "Common": 1,
        "Uncommon": 1.5,
        "Rare": 2.5,
        "Epic": 4,
        "Legendary": 7,
        "Mythical": 12
    };
    
    const multiplier = rarityMultiplier[rarity] || 1;
    
    return {
        tapDamage: Math.random() < 0.5 ? Math.floor(Math.random() * 5 * multiplier) : 0,
        idleDamage: Math.random() < 0.5 ? Math.floor(Math.random() * 3 * multiplier) : 0,
        critChance: Math.random() < 0.3 ? Math.floor(Math.random() * 5) * 0.01 * multiplier : 0,
        goldBonus: Math.random() < 0.4 ? Math.floor(Math.random() * 10) * 0.01 * multiplier : 0
    };
}

// --- Tooltip Functions ---
function showItemTooltip(item, element) {
    const tooltipElement = document.getElementById('item-tooltip');
    if (!tooltipElement || !item) return;

    let statsHtml = '';
    for (const [stat, value] of Object.entries(item.stats)) {
        if (value > 0) {
            let statName = stat.replace(/([A-Z])/g, ' $1'); // Add space before capitals
            statsHtml += `<div>${statName}: ${value}</div>`;
        }
    }
    tooltipElement.innerHTML = `
        <h2>${item.name}</h2>
        <div>Rarity: ${item.rarity}</div>
        ${statsHtml}
    `;
    tooltipElement.style.display = 'block';
    const rect = element.getBoundingClientRect();
    tooltipElement.style.top = `${rect.top + 20}px`;
    tooltipElement.style.left = `${rect.left}px`;

    // Hide tooltip after 5 seconds
    setTimeout(() => {
        hideItemTooltip();
    }, 5000);
}

function hideItemTooltip() {
    clearTimeout(tooltipTimeout);
    const tooltipElement = document.getElementById('item-tooltip');
    if (tooltipElement) {
        tooltipElement.style.display = 'none';
    }
}

function toggleCraftingSelection(slotEl, slotIndex) {
    if (selectedCraftingSlots.includes(slotIndex)) {
        selectedCraftingSlots.splice(selectedCraftingSlots.indexOf(slotIndex), 1);
        slotEl.classList.remove('selected-for-crafting');
    } else {
        selectedCraftingSlots.push(slotIndex);
        slotEl.classList.add('selected-for-crafting');
    }
    updateCraftingUISelection();
}

export function getSelectedCraftingSlots() {
    return selectedCraftingSlots.slice();
}

export function clearSelectedCraftingSlots() {
    selectedCraftingSlots = [];
    // remove selection visuals if inventory grid exists
    if (elements.inventoryGrid) {
        elements.inventoryGrid.querySelectorAll('.inventory-slot').forEach(el => el.classList.remove('selected-for-crafting'));
    }
}

export function updateCraftingUISelection() {
    // Update crafting UI display based on selected slots
    const inputsContainer = document.getElementById('crafting-inputs');
    const outputContainer = document.getElementById('crafting-output');
    const craftButton = document.getElementById('craft-button');
    if (!inputsContainer || !outputContainer || !craftButton) {
        console.log(selectedCraftingSlots);
        return;
    }

    inputsContainer.innerHTML = '';
    let totalInputs = 0;
    selectedCraftingSlots.forEach(slotIndex => {
        const item = gameState.inventory[slotIndex];
        const el = document.createElement('div');
        el.className = 'inventory-slot';
        el.style.width = '48px';
        el.style.height = '48px';
        el.innerHTML = item ? `<div class="slot-item"><div class="item-icon">${item.icon}</div></div>` : '';
        inputsContainer.appendChild(el);
        totalInputs++;
    });

    // Simple craft preview: show combined stats
    if (totalInputs > 0) {
        // Combine stats of selected items
        const combined = { tapDamage: 0, idleDamage: 0, critChance: 0, goldBonus: 0 };
        let highestRarityIndex = 0;
        const order = ["Common","Uncommon","Rare","Epic","Legendary","Mythical"];
        selectedCraftingSlots.forEach(slotIndex => {
            const item = gameState.inventory[slotIndex];
            if (!item) return;
            for (const [k,v] of Object.entries(item.stats || {})) {
                combined[k] = (combined[k] || 0) + v;
            }
            const idx = order.indexOf(item.rarity);
            if (idx > highestRarityIndex) highestRarityIndex = idx;
        });
        // Improve combined stats slightly for craft result preview
        const resultStats = {};
        for (const [k,v] of Object.entries(combined)) {
            resultStats[k] = Math.max(0, Math.floor(v * 1.2));
        }
        const resultRarity = order[Math.min(order.length - 1, highestRarityIndex + 1)];
        outputContainer.innerHTML = `
            <div style="display:flex;flex-direction:column;align-items:center;">
                <div style="font-weight:bold;margin-bottom:6px;">Craft Result</div>
                <div class="slot-item" style="font-size:20px;">✳️</div>
                <div style="font-size:12px;margin-top:6px;">${resultRarity}</div>
            </div>
        `;
        craftButton.disabled = false;
    } else {
        outputContainer.innerHTML = `<div style="opacity:0.7">Select items to craft</div>`;
        craftButton.disabled = true;
    }
}

// Insert a specific item into first empty slot. Returns slot index or -1 if full.
export function createItem(item) {
    for (let i = 0; i < INVENTORY_SIZE; i++) {
        if (!gameState.inventory[i]) {
            gameState.inventory[i] = item;
            updateInventorySlot(i);
            return i;
        }
    }
    return -1;
}

// Add a specific fully-formed item to inventory
export function addSpecificItemToInventory(item) {
    const slot = createItem(item);
    if (slot >= 0) showItemToast(item);
    else showItemToast({ name: "Inventory Full!", rarity: "System", icon: '⚠️', stats: {} });
}

export async function sellItemsByRarity(rarity) {
    if (!rarity) return;

    const { room } = await import('./main.js');
    const currentSeason = room.roomState?.realmSeasons?.[gameState.realm]?.current || 'Spring';

    // Define base values per rarity and a simple stat-based bonus
    const baseValue = {
        "Common": 5,
        "Uncommon": 20,
        "Rare": 100,
        "Epic": 500,
        "Legendary": 2500,
        "Mythical": 10000
    };

    let totalGold = 0;
    const soldSlots = [];

    for (let i = 0; i < INVENTORY_SIZE; i++) {
        const item = gameState.inventory[i];
        if (!item) continue;
        if (rarity !== 'All' && item.rarity !== rarity) continue;

        // Calculate sell price: base + stat contributions
        let price = (baseValue[item.rarity] || 1);
        const stats = item.stats || {};
        price += (stats.tapDamage || 0) * 2;
        price += (stats.idleDamage || 0) * 3;
        price += Math.floor((stats.critChance || 0) * 100) * 5;
        price += Math.floor((stats.goldBonus || 0) * 100) * 4;
        price = Math.max(1, Math.floor(price));

        // Seasonal item modifier: seasonal items earn bonus when sold during their season, slight penalty otherwise
        if (item.season) {
            if (item.season === currentSeason) price = Math.floor(price * 1.75); // bonus when matching season
            else price = Math.floor(price * 0.8); // slight penalty off-season
        }

        totalGold += price;
        soldSlots.push({ slot: i, item, price });

        // Remove item from inventory (this updates slot UI via removeItemFromInventory)
        gameState.inventory[i] = null;
        updateInventorySlot(i);
    }

    if (soldSlots.length === 0) {
        showNotification('No items found to sell for that rarity.', '#ff5252');
        return;
    }

    // Credit player gold and update UI
    gameState.gold += totalGold;
    import('./ui.js').then(ui => {
        if (ui.updateUI) ui.updateUI();
    });

    // Summary notification
    showNotification(`Sold ${soldSlots.length} item(s) for ${totalGold} Gold`, '#ffd700');

    // Optionally show a condensed toast for the highest-value sold item
    const top = soldSlots.sort((a,b)=>b.price - a.price)[0];
    if (top && top.item) {
        showItemToast({ name: `Sold: ${top.item.name}`, rarity: top.item.rarity, icon: '💰', stats: { value: top.price } });
    }
}

// Blacksmith: process items below Rare into influence points
export function processLowRarityForInfluence() {
    const allow = new Set(['Common','Uncommon']);
    let processed = 0;
    let gained = 0;
    for (let i = 0; i < INVENTORY_SIZE; i++) {
        const it = gameState.inventory[i];
        if (!it) continue;
        if (allow.has(it.rarity)) {
            // Influence from base value of item
            const value = 5 + (it.stats?.tapDamage || 0) + (it.stats?.idleDamage || 0) + Math.floor((it.stats?.goldBonus || 0)*100);
            gameState.inventory[i] = null;
            updateInventorySlot(i);
            processed++;
            gained += value;
        }
    }
    if (processed === 0) {
        showNotification('No eligible items to process.', '#ff5252');
        return;
    }
    gameState.influencePoints += gained;
    showNotification(`Blacksmith processed ${processed} item(s), +${gained} Influence`, '#ffd700');
    // Trigger 5-min 1000% gold per tap if threshold reached
    if (gameState.influencePoints >= 500) {
        gameState.influencePoints -= 500;
        gameState.goldTapBuffUntil = Date.now() + 5 * 60 * 1000;
        showNotification('Influence Surge! +1000% gold per tap for 5m', '#ffd700');
    }
}
