// Game state management

export const INVENTORY_SIZE = 50; // Increased inventory size

export const gameState = {
    gold: 0,
    dps: 0,
    wave: 1,
    enemyHealth: 100,
    maxEnemyHealth: 100,
    tapDamage: 1,
    idleDamage: 0,
    playerLevel: 1,
    playerXp: 0,
    xpToNextLevel: 100,
    realm: 1,
    skills: [
        { name: "Shield Bash", damage: 10, cooldown: 5, ready: true },
        { name: "Lightning Strike", damage: 30, cooldown: 10, ready: true },
        { name: "Divine Wrath", damage: 100, cooldown: 30, ready: true }
    ],
    currentClass: 'warrior',
    classes: {
        warrior: { name: "Warrior", tapMultiplier: 1.2, dpsMultiplier: 0.8 },
        mage: { name: "Mage", tapMultiplier: 0.8, dpsMultiplier: 1.2 },
        archer: { name: "Archer", tapMultiplier: 1.0, dpsMultiplier: 1.0 },
        paladin: { name: "Paladin", tapMultiplier: 1.0, dpsMultiplier: 1.0, healBonus: 0.1 }
    },
    equipment: {},
    inventory: {}, 
    upgrades: {
        tapDamage: { level: 1, cost: 10, effect: 1 },
        idleDamage: { level: 0, cost: 25, effect: 0 },
        critChance: { level: 0, cost: 50, effect: 0 },
        goldBonus: { level: 0, cost: 30, effect: 0 }
    },
    enemyTypes: [
        { name: "Slime", color: "#8b5dd6", face: "simple" },
        { name: "Goblin", color: "#5ec66a", face: "angry" },
        { name: "Skeleton", color: "#e0e0e0", face: "scary" },
        { name: "Dragon", color: "#ff5252", face: "dragon" }
    ],
    currentEnemyType: 0,
    critChance: 0.05,
    critMultiplier: 2,
    achievements: {},
    goldBoostActive: false,
    // NEW progression/meta
    influencePoints: 0,
    goldTapMultiplier: 1,
    goldTapBuffUntil: 0,
    prestigeCount: 0,
    prestigePoints: 0, // NEW: currency for prestige shop
    xpBoostUntil: 0
};

// Function to reset parts of the game state, useful for loading games
export function resetGameState() {
    // Keep essential non-progress state like class definitions, enemy types
    const nonProgressState = {
        classes: gameState.classes,
        enemyTypes: gameState.enemyTypes,
        crops: gameState.crops,
        cropSeasonMap: gameState.cropSeasonMap,
        // Add any other static data here
    };

    // Reset most properties to initial values
    Object.assign(gameState, {
        gold: 0,
        dps: 0,
        wave: 1,
        enemyHealth: 100,
        maxEnemyHealth: 100,
        tapDamage: 1,
        idleDamage: 0,
        playerLevel: 1,
        playerXp: 0,
        xpToNextLevel: 100,
        realm: 1,
        skills: [ // Reset skill cooldowns
            { name: "Shield Bash", damage: 10, cooldown: 5, ready: true },
            { name: "Lightning Strike", damage: 30, cooldown: 10, ready: true },
            { name: "Divine Wrath", damage: 100, cooldown: 30, ready: true }
        ],
        currentClass: 'warrior',
        equipment: {},
        inventory: {},
        upgrades: { // Reset upgrades
            tapDamage: { level: 1, cost: 10, effect: 1 },
            idleDamage: { level: 0, cost: 25, effect: 0 },
            critChance: { level: 0, cost: 50, effect: 0 },
            goldBonus: { level: 0, cost: 30, effect: 0 }
        },
        currentEnemyType: 0,
        critChance: 0.05,
        critMultiplier: 2,
        achievements: {},
        goldBoostActive: false,
        influencePoints: 0,
        goldTapMultiplier: 1,
        goldTapBuffUntil: 0,
        prestigeCount: 0,
        prestigePoints: 0,
        xpBoostUntil: 0
    }, nonProgressState); // Re-apply static data
}

// Function to load state data, ensuring structure compatibility
export function loadStateData(loadedData) {
    // Reset state first to clear old values
    resetGameState();
    // Deep merge might be better for nested objects like upgrades, inventory
    // Simple merge for now:
    Object.assign(gameState, loadedData);

    // Ensure inventory size consistency (if loaded save has fewer slots)
    const currentInventory = gameState.inventory || {};
    gameState.inventory = {};
    for (let i = 0; i < INVENTORY_SIZE; i++) {
        if (currentInventory[i]) {
            gameState.inventory[i] = currentInventory[i];
        } else {
             gameState.inventory[i] = null; // Ensure all slots exist
        }
    }
    // Ensure new fields exist after loading
    gameState.influencePoints = gameState.influencePoints || 0;
    gameState.goldTapMultiplier = gameState.goldTapMultiplier || 1;
    gameState.goldTapBuffUntil = gameState.goldTapBuffUntil || 0;
    gameState.prestigeCount = gameState.prestigeCount || 0;
    gameState.prestigePoints = gameState.prestigePoints || 0;
    gameState.xpBoostUntil = gameState.xpBoostUntil || 0;
    gameState.cropSeasonMap = gameState.cropSeasonMap || {
        Spring: 'Wheat',
        Summer: 'Berry',
        Autumn: 'Pumpkin',
        Winter: 'Carrot'
    };
     // Potentially add more validation/migration logic here if state structure changes over time
}

// Serialize current game state into a plain object suitable for saving
export function serializeState() {
    // deep-clone to avoid accidental references
    const cloned = JSON.parse(JSON.stringify(gameState));
    return cloned;
}

// Save/load helpers for localStorage slots
export function saveToSlot(slot) {
    try {
        const key = `mythic_slot_${slot}`;
        localStorage.setItem(key, JSON.stringify(serializeState()));
        return true;
    } catch (e) {
        console.error('Save failed', e);
        return false;
    }
}

export function loadFromSlot(slot) {
    try {
        const key = `mythic_slot_${slot}`;
        const raw = localStorage.getItem(key);
        if (!raw) return null;
        const data = JSON.parse(raw);
        loadStateData(data);
        return data;
    } catch (e) {
        console.error('Load failed', e);
        return null;
    }
}

// Achievement utility: registers an achievement if not already unlocked
export function unlockAchievement(id, title, description) {
    if (gameState.achievements[id]) return false;
    gameState.achievements[id] = {
        title,
        description,
        unlockedAt: Date.now()
    };
    return true;
}