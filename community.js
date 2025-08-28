import { gameState } from './game-state.js';

export function renderCommunityChest() {
    const grid = document.getElementById('community-chest-grid');
    if (!grid) return;
    import('./main.js').then(({ room }) => {
        const chest = room.roomState?.communityChest || { items: {}, capacity: 100 };
        grid.innerHTML = '';
        // Render 100 slots
        for (let i = 0; i < chest.capacity; i++) {
            const slot = document.createElement('div');
            slot.className = 'inventory-slot';
            slot.style.width = '48px';
            slot.style.height = '48px';
            const item = chest.items?.[i];
            if (item) {
                slot.innerHTML = `<div class="slot-item"><div class="item-icon">${item.icon || '❔'}</div></div>`;
                slot.addEventListener('click', () => withdraw(i));
            } else {
                slot.addEventListener('click', () => {});
            }
            grid.appendChild(slot);
        }
    });
}

export function depositSelected() {
    import('./inventory.js').then(inv => {
        const selected = inv.getSelectedCraftingSlots();
        if (!selected.length) return;
        const slotIdx = selected[0];
        inv.clearSelectedCraftingSlots();
        const item = gameState.inventory[slotIdx];
        if (!item) return;
        import('./main.js').then(({ room }) => {
            const chest = room.roomState?.communityChest || { items: {}, capacity: 100 };
            let chestIndex = -1;
            for (let i = 0; i < (chest.capacity||100); i++) {
                if (!chest.items || !chest.items[i]) { chestIndex = i; break; }
            }
            if (chestIndex === -1) return;
            const updated = {};
            updated[chestIndex] = item;
            room.updateRoomState({ communityChest: { items: updated } });
            inv.removeItemFromInventory(slotIdx);
            renderCommunityChest();
        });
    });
}

function withdraw(chestIndex) {
    import('./main.js').then(({ room }) => {
        const item = room.roomState?.communityChest?.items?.[chestIndex];
        if (!item) return;
        import('./inventory.js').then(inv => {
            const placed = inv.createItem(item);
            if (placed >= 0) {
                room.updateRoomState({ communityChest: { items: { [chestIndex]: null } } });
                renderCommunityChest();
            }
        });
    });
}