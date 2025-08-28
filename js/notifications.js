// Notification system
import { elements } from './main.js';
import { getRarityColor } from './inventory.js'; // Import for rarity color

export function showNotification(text, color = null) {
    elements.lootNotification.textContent = text;
    elements.lootNotification.style.color = color || 'white';
    elements.lootNotification.style.opacity = 1;

    setTimeout(() => {
        elements.lootNotification.style.opacity = 0;
    }, 2000);
}

export function showItemToast(item) {
    const toastContainer = document.getElementById('toast-container');
    if (!toastContainer) return;

    const toast = document.createElement('div');
    toast.className = 'toast item-toast';

    let statsHtml = '';
    if (item.stats) {
        for (const [stat, value] of Object.entries(item.stats)) {
            if (value > 0) {
                 let statName = stat.replace(/([A-Z])/g, ' $1').replace(/^./, str => str.toUpperCase()); // Format stat name
                statsHtml += `<div class="toast-stat">${statName}: ${value}</div>`;
            }
        }
    }

    toast.innerHTML = `
        <div class="toast-name" style="color: ${getRarityColor(item.rarity)}">${item.name}</div>
        <div class="toast-rarity">Rarity: ${item.rarity}</div>
        ${statsHtml}
    `;

    toastContainer.appendChild(toast);

    // Trigger fade-in animation
    requestAnimationFrame(() => toast.classList.add('show'));

    // Automatically remove the toast after a few seconds (robust removal + fallback)
    const toastLifetime = 3000;
    let removed = false;
    const scheduleRemoval = () => { if (removed) return; removed = true; toast.classList.remove('show'); setTimeout(()=>{ if (toast.parentElement) toast.remove(); }, 400); };
    const removalTimeout = setTimeout(scheduleRemoval, toastLifetime);
    toast.addEventListener('transitionend', function onTrans() { if (!toast.classList.contains('show')) { clearTimeout(removalTimeout); scheduleRemoval(); toast.removeEventListener('transitionend', onTrans); } });
    // Hard fallback to ensure cleanup if something goes wrong
    setTimeout(()=>{ if (toast.parentElement) toast.remove(); }, toastLifetime + 2000);
}
