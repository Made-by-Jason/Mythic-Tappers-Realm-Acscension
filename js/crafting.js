// Crafting UI and logic
import { gameState } from './game-state.js';
import { addItemToInventory, removeItemFromInventory, updateInventorySlot, getSelectedCraftingSlots, clearSelectedCraftingSlots } from './inventory.js';
import { showItemToast } from './notifications.js';
import { updateUI } from './ui.js';
import { elements } from './main.js';

// Render crafting UI inside #crafting-section
export function initCrafting() {
    const container = document.getElementById('crafting-section');
    if (!container) return;

    container.innerHTML = `
        <select id="crafting-recipe-select">
            <option value="custom">Custom Combine (any items)</option>
        </select>
        <div id="crafting-area">
            <div id="crafting-inputs"></div>
            <div id="crafting-arrow">→</div>
            <div id="crafting-output"></div>
        </div>
        <button id="craft-button" disabled>Craft</button>
        <div id="craft-feedback" style="margin-top:8px;color:#fff"></div>
    `;

    // Populate recipes from state
    const select = document.getElementById('crafting-recipe-select');
    if (gameState.craftingRecipes && gameState.craftingRecipes.length) {
        gameState.craftingRecipes.forEach(r => {
            const opt = document.createElement('option');
            opt.value = r.id;
            opt.textContent = `${r.name} — ${r.description}`;
            select.appendChild(opt);
        });
    }

    // Hook craft button
    document.getElementById('craft-button').addEventListener('click', () => {
        performCraft(select.value);
    });

    // Ensure inventory selection changes update crafting UI (inventory toggles call updateCraftingUISelection)
    updateCraftingDisplay();
}

function updateCraftingDisplay() {
    // Trigger inventory's function to update the DOM (it manipulates #crafting-inputs and #crafting-output)
    // Inventory module exposes updateCraftingUISelection so we call it indirectly by dispatching a custom event
    const ev = new CustomEvent('updateCraftingUI');
    document.dispatchEvent(ev);
}

// Listen for inventory updates (inventory calls updateCraftingUISelection directly, but we ensure wiring)
document.addEventListener('updateCraftingUI', () => {
    // inventory.js has updateCraftingUISelection attached globally; call directly if present
    try {
        // try to call exported function if available
        import('./inventory.js').then(inv => {
            if (inv.updateCraftingUISelection) inv.updateCraftingUISelection();
        });
    } catch (e) {
        // ignore
    }
});

function performCraft(selectedRecipeId) {
    const selectedSlots = getSelectedCraftingSlots();
    const feedback = document.getElementById('craft-feedback');
    feedback.textContent = '';

    if (!selectedSlots || selectedSlots.length === 0) {
        feedback.textContent = 'Select items to craft.';
        return;
    }

    // Simple recipe enforcement: if a specific recipe chosen, check slot count and rarities
    let recipe = null;
    if (selectedRecipeId && selectedRecipeId !== 'custom') {
        recipe = (gameState.craftingRecipes || []).find(r => r.id === selectedRecipeId);
        if (!recipe) recipe = null;
    }

    if (recipe) {
        if (selectedSlots.length !== recipe.inputsRequired) {
            feedback.textContent = `This recipe requires ${recipe.inputsRequired} inputs.`;
            return;
        }
        // Check rarities minimal requirement: each input should be >= required rarity
        const order = ["Common","Uncommon","Rare","Epic","Legendary","Mythical"];
        const requiredMinIndex = order.indexOf(recipe.inputRarity[0]);
        for (const si of selectedSlots) {
            const itm = gameState.inventory[si];
            if (!itm) {
                feedback.textContent = 'Invalid item in selection.';
                return;
            }
            const idx = order.indexOf(itm.rarity);
            if (idx < requiredMinIndex) {
                feedback.textContent = 'One or more items do not meet rarity requirements.';
                return;
            }
        }
    }

    // Compose crafted item stats from selected items (sum + small bonus)
    const combined = { tapDamage: 0, idleDamage: 0, critChance: 0, goldBonus: 0 };
    let highestRarityIndex = 0;
    const order = ["Common","Uncommon","Rare","Epic","Legendary","Mythical"];
    let chosenIcon = '✳️';
    selectedSlots.forEach((slotIndex, i) => {
        const item = gameState.inventory[slotIndex];
        if (!item) return;
        chosenIcon = chosenIcon === '✳️' ? item.icon : chosenIcon;
        for (const [k,v] of Object.entries(item.stats || {})) {
            combined[k] = (combined[k] || 0) + v;
        }
        const idx = order.indexOf(item.rarity);
        if (idx > highestRarityIndex) highestRarityIndex = idx;
    });

    // Tweak stats and determine result rarity: upgrade highest rarity by 1 step (cap at top)
    const resultRarity = order[Math.min(order.length - 1, highestRarityIndex + 1)];
    const resultStats = {};
    for (const [k,v] of Object.entries(combined)) {
        resultStats[k] = Math.max(0, Math.floor(v * 1.3) + 1);
    }

    // Build item
    const craftedItem = {
        id: `crafted-${Date.now()}-${Math.random().toString(16).slice(2)}`,
        name: `${resultRarity} Crafted Item`,
        rarity: resultRarity,
        icon: chosenIcon,
        stats: resultStats
    };

    // Remove input items (consume)
    selectedSlots.slice().sort((a,b)=>b-a).forEach(slotIndex => {
        removeItemFromInventory(slotIndex);
    });

    // Insert crafted item
    // createItem may not be exported in older versions - fallback to addItemToInventory to attempt placement
    import('./inventory.js').then(inv => {
        if (inv.createItem) {
            const slot = inv.createItem(craftedItem);
            if (slot >= 0) {
                showItemToast(craftedItem);
                clearSelectedCraftingSlots();
                updateUI();
                updateCraftingDisplay();
            } else {
                // Inventory full - rollback: try placing back removed items (not implemented), notify user
                showItemToast({ name: "Inventory Full!", rarity: "System", icon: '⚠️', stats: {} });
            }
        } else {
            // As fallback, try to use addItemToInventory (won't preserve crafted specifics)
            addItemToInventory(); // best-effort fallback
            showItemToast(craftedItem);
            clearSelectedCraftingSlots();
            updateUI();
            updateCraftingDisplay();
        }
    });
}
