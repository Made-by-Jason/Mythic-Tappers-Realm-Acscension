export function renderMarketplace() {
    const list = document.getElementById('marketplace-list');
    if (!list) return;
    import('./main.js').then(({ room }) => {
        const listings = room.roomState?.marketplace?.listings || {};
        list.innerHTML = '';
        Object.entries(listings).forEach(([id, data]) => {
            const row = document.createElement('div');
            row.className = 'upgrade-item';
            row.innerHTML = `
                <div class="item-icon">${data.item?.icon || '❔'}</div>
                <div class="item-details">
                    <div class="item-name">${data.item?.name || 'Item'}</div>
                    <div class="item-desc">Price: ${data.price} Gold</div>
                </div>
                <div><button data-id="${id}">${room.clientId === data.sellerId ? 'Cancel' : 'Buy'}</button></div>
            `;
            row.querySelector('button').onclick = () => {
                if (room.clientId === data.sellerId) {
                    room.updateRoomState({ marketplace: { listings: { [id]: null } } });
                    renderMarketplace();
                } else {
                    import('./game-state.js').then(gs => {
                        const gsState = gs.gameState;
                        if (gsState.gold < data.price) return;
                        gsState.gold -= data.price;
                        import('./inventory.js').then(inv => {
                            const placed = inv.createItem(data.item);
                            if (placed >= 0) {
                                room.updateRoomState({ marketplace: { listings: { [id]: null } } });
                                renderMarketplace();
                                import('./ui.js').then(u => u.updateUI());
                            }
                        });
                    });
                }
            };
            list.appendChild(row);
        });
    });
}

export function listFromInput() {
    const slotInput = document.getElementById('market-slot');
    const priceInput = document.getElementById('market-price');
    if (!slotInput || !priceInput) return;
    const slot = parseInt(slotInput.value, 10);
    const price = Math.max(1, parseInt(priceInput.value, 10) || 0);
    import('./inventory.js').then(inv => {
        import('./game-state.js').then(gs => {
            const item = gs.gameState.inventory[slot];
            if (!item) return;
            const allowed = new Set(['Common','Uncommon','Rare']);
            if (!allowed.has(item.rarity)) return;
            inv.removeItemFromInventory(slot);
            const id = `listing-${Date.now()}-${Math.random().toString(16).slice(2)}`;
            import('./main.js').then(({ room }) => {
                room.updateRoomState({
                    marketplace: {
                        listings: {
                            [id]: { item, price, sellerId: room.clientId }
                        }
                    }
                });
                renderMarketplace();
            });
        });
    });
}