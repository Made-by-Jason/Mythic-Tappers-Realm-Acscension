// UI related functions
import { gameState } from './game-state.js';
import { elements } from './main.js';
import { showNotification } from './notifications.js';

export function updateUI() {
    elements.gold.textContent = gameState.gold;
    elements.dps.textContent = gameState.idleDamage;
    elements.wave.textContent = gameState.wave;
    elements.level.textContent = gameState.playerLevel;
    if (document.getElementById('prestige-count')) {
        document.getElementById('prestige-count').textContent = gameState.prestigeCount || 0;
    }
    if (document.getElementById('prestige-points')) {
        document.getElementById('prestige-points').textContent = gameState.prestigePoints || 0;
    }
    updateHealthBar();
}

export function updateHealthBar() {
    const healthPercent = (gameState.enemyHealth / gameState.maxEnemyHealth) * 100;
    elements.enemyHealthBar.style.width = `${healthPercent}%`;
}

export function showLevelUpNotification() {
    elements.levelUpNotification.textContent = `LEVEL UP! ${gameState.playerLevel}`;
    elements.levelUpNotification.style.opacity = 1;
    
    setTimeout(() => {
        elements.levelUpNotification.style.opacity = 0;
    }, 2000);
}

export function showDamageText(amount, isCrit, x, y) {
    const damageText = document.createElement('div');
    damageText.className = 'damage-text';
    damageText.textContent = isCrit ? `CRIT ${amount}!` : amount;
    damageText.style.left = `${x}px`;
    damageText.style.top = `${y}px`;
    damageText.style.color = isCrit ? '#ff5252' : 'white';
    damageText.style.fontSize = isCrit ? '24px' : '18px';
    
    document.body.appendChild(damageText);
    
    // Animate the damage text
    setTimeout(() => {
        damageText.style.opacity = 1;
        damageText.style.transform = `translate(-50%, -30px)`;
        
        setTimeout(() => {
            damageText.style.opacity = 0;
            setTimeout(() => {
                damageText.remove();
            }, 500);
        }, 800);
    }, 10);
}

export function closeAllModals() {
    elements.shopModal.style.display = 'none';
    elements.upgradesModal.style.display = 'none';
    elements.settingsModal.style.display = 'none';
    const ps = document.getElementById('prestige-shop-modal'); if (ps) ps.style.display = 'none';
}

export function recalculateStats() {
    const classData = gameState.classes[gameState.currentClass];
    
    // Calculate base damage
    const baseTapDamage = 1 + gameState.upgrades.tapDamage.effect;
    const baseIdleDamage = gameState.upgrades.idleDamage.effect;
    
    // Apply class multipliers
    gameState.tapDamage = Math.floor(baseTapDamage * classData.tapMultiplier);
    gameState.idleDamage = Math.floor(baseIdleDamage * classData.dpsMultiplier);
    
    updateUI();
}

export function showSkillEffect(skillIndex) {
    // Visual effect for when other players use skills
    const effectColors = ['#ff5252', '#4a95d1', '#ffd700'];
    const color = effectColors[skillIndex] || '#ffffff';
    
    const effect = document.createElement('div');
    effect.style.position = 'absolute';
    effect.style.width = '100%';
    effect.style.height = '100%';
    effect.style.backgroundColor = color;
    effect.style.opacity = 0.5;
    effect.style.borderRadius = '50%';
    effect.style.zIndex = 3;
    
    elements.enemy.appendChild(effect);
    
    setTimeout(() => {
        effect.style.opacity = 0;
        setTimeout(() => {
            effect.remove();
        }, 300);
    }, 200);
}