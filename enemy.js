// Enemy-related logic
import { gameState, unlockAchievement } from './game-state.js';
import { elements, room } from './main.js';
import { showNotification } from './notifications.js';
import { updateUI } from './ui.js';
import { addPlayerXp } from './character.js';
import { addItemToInventory } from './inventory.js';

export function dealDamage(amount, isCrit = false, event = null) {
    if (!amount || amount <= 0) return;

    // If a world boss is active in room state, damage it instead of the normal enemy
    if (room && room.roomState && room.roomState.worldBoss && room.roomState.worldBoss.active) {
        // Apply damage to the world boss via authoritative room state update
        const boss = room.roomState.worldBoss;
        const newHealth = Math.max(0, (boss.health || boss.maxHealth) - amount);
        room.updateRoomState({
            worldBoss: {
                ...boss,
                health: newHealth
            }
        });
        // local visual / UI update
        applyWorldBossState({ ...boss, health: newHealth });
        // If boss died, handle boss defeat
        if (newHealth <= 0) {
            defeatWorldBoss();
        }
        return;
    }

    gameState.enemyHealth -= amount;
    if (gameState.enemyHealth < 0) gameState.enemyHealth = 0;

    // Determine coordinates for damage text: use event if provided, otherwise center of enemy element
    let clientX = null, clientY = null;
    if (event && typeof event.clientX === 'number' && typeof event.clientY === 'number') {
        clientX = event.clientX;
        clientY = event.clientY;
    } else if (elements.enemy) {
        const rect = elements.enemy.getBoundingClientRect();
        clientX = rect.left + rect.width / 2;
        clientY = rect.top + rect.height / 2;
    }

    if (clientX !== null && clientY !== null) {
        import('./ui.js').then(ui => {
            ui.showDamageText(amount, isCrit, clientX, clientY);
            ui.updateHealthBar();
        });
    } else {
        import('./ui.js').then(ui => ui.updateHealthBar());
    }

    if (gameState.enemyHealth <= 0) {
        defeatEnemy();
    }
}

export function defeatEnemy() {
    // Track kills for achievements
    gameState.enemiesDefeated = (gameState.enemiesDefeated || 0) + 1;

    // Calculate XP based on enemy level
    const xpEarned = Math.floor(5 * Math.pow(1.1, gameState.wave));
    addPlayerXp(xpEarned);
    
    // Award gold with bonuses
    let goldEarned = Math.floor(gameState.wave * 1.5);
    
    // Apply gold bonus from upgrades
    if (gameState.upgrades.goldBonus.level > 0) {
        goldEarned = Math.floor(goldEarned * (1 + gameState.upgrades.goldBonus.level * 0.1));
    }
    
    // Apply temporary gold boost if active
    if (gameState.goldBoostActive) {
        goldEarned *= 2;
    }
    
    // Apply tap gold buff (1000% = 10x)
    const now = Date.now();
    if (gameState.goldTapBuffUntil && now < gameState.goldTapBuffUntil) {
        gameState.goldTapMultiplier = 10;
    } else {
        gameState.goldTapMultiplier = 1;
    }
    goldEarned = Math.floor(goldEarned * gameState.goldTapMultiplier);
    
    gameState.gold += goldEarned;
    
    // Random loot drop
    if (Math.random() < 0.1) {
        addItemToInventory();
    }

    // Achievement checks
    if (unlockAchievement && gameState.enemiesDefeated === 1) {
        // First blood
        import('./notifications.js').then(n => n.showNotification('Achievement Unlocked: First Blood', '#ffd700'));
    }
    if (unlockAchievement && gameState.enemiesDefeated === 100) {
        import('./notifications.js').then(n => n.showNotification('Achievement Unlocked: Veteran Slayer (100 kills)', '#ffd700'));
        unlockAchievement('veteran_slayer', 'Veteran Slayer', 'Defeat 100 enemies');
    }
    
    // Wave progression
    gameState.wave++;
    room.updatePresence({
        waveReached: gameState.wave
    });
    
    // Update realm if needed
    if (gameState.wave % 10 === 0) {
        gameState.realm = Math.floor(gameState.wave / 10) + 1;
        elements.realmNumber.textContent = gameState.realm;
        
        // Check if this is a new realm record
        if (gameState.realm > room.roomState.realmTopScore) {
            room.updateRoomState({
                realmTopScore: gameState.realm
            });
        }
        // Unlock a realm milestone achievement
        if (unlockAchievement) {
            const id = `realm_${gameState.realm}_reach`;
            if (unlockAchievement(id, `Realm ${gameState.realm} Ascended`, `Reached realm ${gameState.realm}`)) {
                import('./notifications.js').then(n => n.showNotification(`Achievement: Reached Realm ${gameState.realm}`, '#ffd700'));
            }
        }
    }
    
    // Reset enemy
    gameState.maxEnemyHealth = Math.floor(100 * Math.pow(1.1, gameState.wave));
    gameState.enemyHealth = gameState.maxEnemyHealth;
    
    // Update enemy level display
    elements.enemyLevel.textContent = `Level ${gameState.wave}`;
    
    // Check for world boss spawn
    if (gameState.wave % 10 === 0 && !room.roomState.worldBoss.active) {
        spawnWorldBoss();
    }
    
    showNotification(`+${goldEarned} Gold, +${xpEarned} XP`);
    updateUI();
}

/**
 * Apply a world boss state locally (used when receiving spawn events from network).
 * This will not re-write room state; it only updates local UI/flags and notifies the player.
 */
export function applyWorldBossState(boss) {
    if (!boss) return;
    // Keep a local reference to the boss for client-side logic
    gameState.worldBoss = boss;

    // Notify players and optionally create local visual indicators
    // Use notifications module for consistent messaging
    import('./notifications.js').then(n => n.showNotification('World Boss has appeared!', 'red'));

    // (Optional) you can add more visual handling here, e.g., show a banner or UI element
}

export function spawnWorldBoss() {
    // Prevent duplicate spawns if room state already has an active boss
    if (room && room.roomState && room.roomState.worldBoss && room.roomState.worldBoss.active) {
        return;
    }

    const boss = {
        health: 10000 * gameState.realm,
        maxHealth: 10000 * gameState.realm,
        active: true,
        spawnedAtWave: gameState.wave // record which wave triggered it
    };

    // Update the shared room state (authoritative spawn)
    room.updateRoomState({
        worldBoss: boss
    });

    // Broadcast spawn to other clients but don't echo back to the sender
    room.send({
        type: "world-boss-spawned",
        echo: false,
        boss
    });

    // Apply locally (shows notification / local flags)
    applyWorldBossState(boss);
}

/* NEW: handle world boss defeat and rewards */
export function defeatWorldBoss() {
    const boss = room.roomState?.worldBoss;
    if (!boss) return;
    // Reward players (local client grants their share)
    const xpEarned = Math.floor(500 * gameState.realm);
    const goldEarned = Math.floor(1000 * gameState.realm);
    addPlayerXp(xpEarned);
    gameState.gold += goldEarned;

    // Clear boss from room state
    room.updateRoomState({
        worldBoss: {
            ...boss,
            active: false
        }
    });

    // Local apply and notify
    applyWorldBossState({ ...boss, active: false, health: 0 });
    import('./notifications.js').then(n => n.showNotification(`World Boss defeated! +${goldEarned} Gold +${xpEarned} XP`, '#ffd700'));

    // Award loot chance
    if (Math.random() < 0.5) addItemToInventory();

    // Progress wave after boss defeat
    gameState.wave++;
    elements.enemyLevel.textContent = `Level ${gameState.wave}`;
    // Reset next normal enemy health
    gameState.maxEnemyHealth = Math.floor(100 * Math.pow(1.1, gameState.wave));
    gameState.enemyHealth = gameState.maxEnemyHealth;
    updateUI();
}