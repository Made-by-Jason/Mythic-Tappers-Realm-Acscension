// Skills management
import { gameState } from './game-state.js';
import { elements, room } from './main.js';
import { dealDamage } from './enemy.js';

export function setupSkills() {
    elements.skills.forEach((skillElement, index) => {
        // Add cooldown elements if they don't exist
        if (!skillElement.querySelector('.skill-cooldown')) {
            const cooldownElement = document.createElement('div');
            cooldownElement.className = 'skill-cooldown';
            skillElement.appendChild(cooldownElement);
        }
        
        skillElement.addEventListener('click', () => {
            if (gameState.skills[index].ready) {
                const isCrit = Math.random() < gameState.critChance;
                let damage = gameState.skills[index].damage;
                
                if (isCrit) {
                    damage = Math.floor(damage * gameState.critMultiplier);
                }
                
                // Find center of enemy for damage text
                const enemyRect = elements.enemy.getBoundingClientRect();
                const centerX = enemyRect.left + enemyRect.width / 2;
                const centerY = enemyRect.top + enemyRect.height / 2;
                
                dealDamage(damage, isCrit, { clientX: centerX, clientY: centerY });
                startCooldown(index);
                
                // Notify other players of skill usage
                room.send({
                    type: "skill-used",
                    skillIndex: index,
                    clientId: room.clientId
                });
            }
        });
    });
}

export function startCooldown(skillIndex) {
    if (!gameState.skills[skillIndex] || !elements.skills[skillIndex]) {
        console.error("Invalid skill index:", skillIndex);
        return;
    }
    
    gameState.skills[skillIndex].ready = false;
    const cooldownElement = elements.skills[skillIndex].querySelector('.skill-cooldown');
    if (!cooldownElement) {
        console.error("Cooldown element not found for skill:", skillIndex);
        return;
    }
    
    const cooldownTime = gameState.skills[skillIndex].cooldown;
    
    let timeLeft = cooldownTime;
    cooldownElement.style.transform = 'scaleY(1)';
    
    const interval = setInterval(() => {
        timeLeft -= 0.1;
        cooldownElement.style.transform = `scaleY(${timeLeft / cooldownTime})`;
        
        if (timeLeft <= 0) {
            clearInterval(interval);
            gameState.skills[skillIndex].ready = true;
            cooldownElement.style.transform = 'scaleY(0)';
        }
    }, 100);
}