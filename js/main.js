// Main entry point
import { gameState, serializeState, saveToSlot, loadFromSlot } from './game-state.js';
import { updateUI } from './ui.js';
import { initShop } from './shop.js';
import { initUpgrades } from './upgrades.js';
import { initCharacterSelection } from './character.js';
import { initInventory } from './inventory.js';
import { initCrafting } from './crafting.js';
import { updatePlayersList } from './multiplayer.js';
import { processScreenClick } from './minerals.js';
import { closeAllModals } from './ui.js';
import { setupSkills } from './skills.js';
import { setupMultiplayer } from './multiplayer.js';
import { dealDamage } from './enemy.js';
import { saveSlotCloud, loadSlotCloud, loadLatestCloud } from './cloud-saves.js';


const socket = new WebsimSocket("https://my-websim-socket.onrender.com");

socket.onopen = () => {
  console.log("Connected via WebsimSocket!");
  socket.send("Hello from client!");
};

socket.onmessage = (event) => {
  console.log("Message from server:", event.data);
};

socket.onclose = () => {
  console.log("Disconnected");
};


// DOM elements
export const elements = {
    gold: document.getElementById('gold-display'),
    dps: document.getElementById('dps-display'),
    tps: document.getElementById('tps-display'),
    wave: document.getElementById('wave-display'),
    level: document.getElementById('level-display'),
    enemyHealthBar: document.getElementById('enemy-health-bar'),
    tapZone: document.getElementById('tap-zone'),
    enemy: document.getElementById('enemy'),
    enemyLevel: document.getElementById('enemy-level'),
    lootNotification: document.getElementById('loot-notification'),
    levelUpNotification: document.getElementById('level-up-notification'),
    skills: [...document.querySelectorAll('.skill')],
    realmNumber: document.querySelector('.realm-number'),
    realmSeason: document.getElementById('realm-season'),
    shopButton: document.getElementById('shop-button'),
    upgradesButton: document.getElementById('upgrades-button'),
    shopModal: document.getElementById('shop-modal'),
    upgradesModal: document.getElementById('upgrades-modal'),
    shopItems: document.getElementById('shop-items'),
    upgradeItems: document.getElementById('upgrade-items'),
    playersList: document.getElementById('players-list'),
    characterSelection: document.getElementById('character-selection'),
    settingsButton: document.getElementById('settings-button'),
    settingsModal: document.getElementById('settings-modal'),
    inventoryGrid: document.getElementById('inventory-grid'),
    damageTexts: [],
    audioToggle: document.getElementById('audio-toggle'),
    audioVolume: document.getElementById('audio-volume'),
    audioMute: document.getElementById('audio-mute')
};

// Add control mode state and joystick reference
let controlMode = 'keyboard';
let joystickManager = null;
let keyboardHandler = null;
let bgm = null;

// Game initialization
async function initGame() {
    await room.initialize();
    
    // Initialize presence with local player state
    room.updatePresence({
        playerId: room.clientId,
        username: room.peers[room.clientId]?.username || "Player",
        avatarUrl: room.peers[room.clientId]?.avatarUrl || "",
        damageDealt: 0,
        waveReached: 1,
        playerLevel: 1,
        currentClass: 'warrior'
    });
    
    // Handle presence updates
    room.subscribePresence((currentPresence) => {
        updatePlayersList();
    });
    
    // Subscribe to room state updates (community chest, marketplace, seasons)
    room.subscribeRoomState(() => {
        import('./community.js').then(m => m.renderCommunityChest && m.renderCommunityChest());
        import('./marketplace.js').then(m => m.renderMarketplace && m.renderMarketplace());
        // Update season display (reflect current realm's season)
        try {
            const current = room.roomState?.realmSeasons?.[gameState.realm]?.current || 'Spring';
            elements.realmSeason.textContent = current;
            // set background based on current season
            setBackgroundForSeason(current);
        } catch (e) {}
    });
    
    // Initialize room state
    if (!room.roomState.worldBoss) {
        room.updateRoomState({
            worldBoss: {
                health: 10000,
                maxHealth: 10000,
                active: false
            },
            realmTopScore: 1,
            communityChest: { items: {}, capacity: 100 },
            chestSlotPurchases: {},
            marketplace: { listings: {} },
            // Seasons now change every 4 hours
            realmSeasons: { 
                1: { current: 'Spring', nextChangeAt: Date.now() + 4*60*60*1000 },
                2: { current: 'Summer', nextChangeAt: Date.now() + 4*60*60*1000 },
                3: { current: 'Autumn', nextChangeAt: Date.now() + 4*60*60*1000 },
                4: { current: 'Winter', nextChangeAt: Date.now() + 4*60*60*1000 }
            }
        });
    }
    
    // Setup UI components
    initUI();
    // Initialize background music controls
    initAudio();
    // Ensure background reflects current season at start
    try {
        const initSeason = room.roomState?.realmSeasons?.[gameState.realm]?.current || 'Spring';
        setBackgroundForSeason(initSeason);
    } catch (e) {}
    
    // Start game loops
    setupEventListeners();
    updateUI();
    gameLoop();
    idleDamageLoop();

    // Attempt auto-load latest cloud save (fallback to local if none)
    try { 
        const loaded = await loadLatestCloud();
        if (!loaded) { const local = loadFromSlot(1); if (local) {} }
    } catch(e){}

    // Autosave every 2 minutes to slot 1 (cloud + local)
    const autosaveInterval = setInterval(async () => {
        try { await saveSlotCloud(1); saveToSlot(1); import('./notifications.js').then(n => n.showNotification('Autosaved (Cloud)', '#888')); } catch(e){ console.error(e); }
    }, 120000);

    // Save on unload
    window.addEventListener('beforeunload', () => {
        try { saveToSlot(1); } catch (e) {}
        try { navigator.sendBeacon && navigator.sendBeacon; } catch(e){}
    });

    // Rotate seasons per realm (leader client drives)
    // check every minute; actual season changes triggered by nextChangeAt (set to 4 hours)
    setInterval(() => {
        const peers = Object.keys(room.peers || {});
        if (!peers.length) return;
        const leader = peers.sort()[0];
        if (leader !== room.clientId) return;
        const seasonsOrder = ['Spring','Summer','Autumn','Winter'];
        const rs = room.roomState.realmSeasons || {};
        const updated = {};
        let changed = false;
        for (const [realm, data] of Object.entries(rs)) {
            if (Date.now() >= (data.nextChangeAt || 0)) {
                const idx = seasonsOrder.indexOf(data.current) >= 0 ? seasonsOrder.indexOf(data.current) : 0;
                // Next change set 4 hours ahead
                updated[realm] = { current: seasonsOrder[(idx+1)%4], nextChangeAt: Date.now() + 4*60*60*1000 };
                changed = true;
            }
        }
        if (changed) room.updateRoomState({ realmSeasons: updated });
    }, 60000);

    // Random events every 6 minutes
    setInterval(() => {
        const negative = Math.random() < 0.5;
        if (negative) {
            const loss = Math.min(gameState.gold, Math.floor(10 + Math.random()*50));
            gameState.gold -= loss;
            import('./notifications.js').then(n => n.showNotification(`Random Tax: -${loss} Gold`, '#ff5252'));
        } else {
            if (Math.random() < 0.5) {
                gameState.influencePoints += 50;
                import('./notifications.js').then(n => n.showNotification('+50 Influence (Event)', '#ffd700'));
            } else {
                import('./inventory.js').then(inv => {
                    inv.addSpecificItemToInventory({
                        id: `event-leg-${Date.now()}`,
                        name: 'Event Legendary',
                        rarity: 'Legendary',
                        icon: '🏆',
                        stats: { tapDamage: 5, idleDamage: 3, goldBonus: 0.05 }
                    });
                });
            }
        }
        updateUI();
    }, 6 * 60 * 1000);
}

// set background image according to season; currently only Spring mapping required
function setBackgroundForSeason(season) {
    const container = document.getElementById('game-container');
    if (!container) return;
    const seasonBg = {
        Spring: "url('/spring.jpg')",
        Summer: "url('/summer.jpg')",
        Autumn: "url('/autumn.jpg')",
        Winter: "url('/winter.jpg')"
    };
    const bg = seasonBg[season] || "url('../Mythic Tappers BG.png')";
    container.style.backgroundImage = bg;
    container.style.backgroundSize = 'cover';
    container.style.backgroundPosition = 'center';
}

function initUI() {
    initShop();
    import('./shop.js').then(s => s.initPrestigeShop && s.initPrestigeShop());
    initUpgrades();
    initCharacterSelection();
    initInventory();
    initCrafting(); // initialize crafting UI into the upgrades modal
    updatePlayersList();

    // Modal close buttons
    document.querySelectorAll('.modal-close').forEach(closeBtn => {
        closeBtn.addEventListener('click', () => {
            closeAllModals();
        });
    });

    // Hook controls mode radios
    const radios = document.querySelectorAll('input[name="controls-mode"]');
    radios.forEach(r => {
        r.addEventListener('change', async (e) => {
            setControlMode(e.target.value);
        });
    });

    // initialize default control handlers
    setControlMode(controlMode);

    // Save/Load button hooks (settings modal)
    document.querySelectorAll('.save-button').forEach(btn => {
        btn.addEventListener('click', async () => {
            const slot = parseInt(btn.dataset.slot || '1',10);
            const ok = await saveSlotCloud(slot).catch(()=>false);
            if (ok) { saveToSlot(slot); import('./notifications.js').then(n => n.showNotification(`Saved to Cloud Slot ${slot}`, '#4caf50')); }
            else { import('./notifications.js').then(n => n.showNotification('Cloud save failed', '#ff5252')); }
        });
    });
    document.querySelectorAll('.load-button').forEach(btn => {
        btn.addEventListener('click', async () => {
            const slot = parseInt(btn.dataset.slot || '1',10);
            const ok = await loadSlotCloud(slot).catch(()=>false);
            if (!ok) { const local = loadFromSlot(slot); if (!local) return import('./notifications.js').then(n => n.showNotification('No save found', '#ff5252')); }
            initUI(); updateUI();
            import('./notifications.js').then(n => n.showNotification(`Loaded Cloud Slot ${slot}`, '#2196F3'));
        });
    });

    // reflect current volume UI if available
    if (elements.audioVolume) {
        const v = parseFloat(localStorage.getItem('mt_bgm_vol') || '0.5');
        elements.audioVolume.value = Number.isFinite(v) ? v : 0.5;
    }

    // Hook new UI controls
    const processBtn = document.getElementById('process-low-rarity');
    if (processBtn) {
        processBtn.onclick = () => import('./inventory.js').then(m => m.processLowRarityForInfluence());
    }
    const listBtn = document.getElementById('market-list-btn');
    if (listBtn) {
        listBtn.onclick = () => import('./marketplace.js').then(m => m.listFromInput && m.listFromInput());
    }
    const prestigeBtn = document.getElementById('prestige-button');
    if (prestigeBtn) {
        prestigeBtn.onclick = () => {
            if (gameState.playerLevel >= 100) {
                const pointsGained = Math.max(1, Math.floor(gameState.playerLevel / 50));
                const keepGold = gameState.gold;
                const inv = JSON.parse(JSON.stringify(gameState.inventory));
                const prestigeCount = (gameState.prestigeCount || 0) + 1;
                import('./game-state.js').then(gs => {
                    gs.resetGameState();
                    gameState.gold = keepGold;
                    gameState.inventory = inv;
                    gameState.prestigeCount = prestigeCount;
                    gameState.prestigePoints = (gameState.prestigePoints || 0) + pointsGained;
                    import('./notifications.js').then(n => n.showNotification(`Prestiged! x${prestigeCount} (+${pointsGained} PP)`, '#ffd700'));
                    initUI();
                    updateUI();
                });
            }
        };
    }
    import('./community.js').then(m => m.renderCommunityChest && m.renderCommunityChest());
    import('./marketplace.js').then(m => m.renderMarketplace && m.renderMarketplace());
}

async function setControlMode(mode) {
    // cleanup previous handlers
    if (keyboardHandler) {
        window.removeEventListener('keydown', keyboardHandler);
        window.removeEventListener('keyup', keyboardHandler);
        keyboardHandler = null;
    }
    if (joystickManager) {
        try { joystickManager.destroy(); } catch(e) {}
        joystickManager = null;
        // remove any visible joystick container if created
        const nj = document.getElementById('nipplejs-zone');
        if (nj) nj.remove();
    }

    controlMode = mode;

    if (mode === 'keyboard') {
        // Basic WASD handling (example movement events, can be extended)
        const state = { w:false,a:false,s:false,d:false };
        keyboardHandler = function(e) {
            const isDown = (e.type === 'keydown');
            switch(e.key.toLowerCase()) {
                case 'w': state.w = isDown; break;
                case 'a': state.a = isDown; break;
                case 's': state.s = isDown; break;
                case 'd': state.d = isDown; break;
                default: return;
            }
            // For now we use this as a presence update placeholder (could be used to move avatar)
            room.updatePresence({ controls: { mode: 'keyboard', state } });
        };
        window.addEventListener('keydown', keyboardHandler);
        window.addEventListener('keyup', keyboardHandler);
    } else if (mode === 'touch') {
        // Load nipplejs from CDN on demand and create a small joystick anchored to bottom-left
        try {
            if (!window.nipplejs) {
                await import('https://cdn.jsdelivr.net/npm/nipplejs@0.9.0/dist/nipplejs.min.js');
            }
        } catch (e) {
            console.warn('Failed to load nipplejs', e);
        }
        // create zone
        const zone = document.createElement('div');
        zone.id = 'nipplejs-zone';
        zone.style.position = 'absolute';
        zone.style.left = '12px';
        zone.style.bottom = '12px';
        zone.style.width = '120px';
        zone.style.height = '120px';
        zone.style.zIndex = 1000;
        zone.style.touchAction = 'none';
        document.body.appendChild(zone);
        if (window.nipplejs && window.nipplejs.create) {
            joystickManager = window.nipplejs.create({
                zone: zone,
                mode: 'dynamic',
                position: { left: '60px', bottom: '60px' },
                color: '#fff',
                size: 90
            });
            joystickManager.on('move', (evt, data) => {
                const dir = data.direction ? data.direction.angle : null;
                // map to simple directional state and broadcast presence
                const joyState = { x: data.vector ? data.vector.x : 0, y: data.vector ? data.vector.y : 0, dir };
                room.updatePresence({ controls: { mode: 'touch', state: joyState } });
            });
            joystickManager.on('end', () => {
                room.updatePresence({ controls: { mode: 'touch', state: { x:0,y:0 } } });
            });
        } else {
            // fallback: listen to touch on tap zone to emulate simple taps
            const touchHandler = (e) => {
                const t = e.touches && e.touches[0];
                if (!t) return;
                room.updatePresence({ controls: { mode: 'touch', state: { tapX: t.clientX, tapY: t.clientY } } });
            };
            elements.tapZone.addEventListener('touchstart', touchHandler, { passive: true });
            joystickManager = { destroy() { elements.tapZone.removeEventListener('touchstart', touchHandler); } };
        }
    }

    // reflect selection UI if present
    const radios = document.querySelectorAll('input[name="controls-mode"]');
    radios.forEach(r => r.checked = (r.value === controlMode));
}

function setupEventListeners() {
    // Setup skills
    setupSkills();
    
    // Tap handling for enemy damage
    elements.tapZone.addEventListener('click', (e) => {
        const isCrit = Math.random() < gameState.critChance;
        let damage = gameState.tapDamage;
        
        if (isCrit) {
            damage = Math.floor(damage * gameState.critMultiplier);
        }
        
        dealDamage(damage, isCrit, e);
        
        // Visual feedback
        elements.enemy.style.transform = 'scale(0.95)';
        setTimeout(() => {
            elements.enemy.style.transform = 'scale(1)';
        }, 100);
        
        // Update presence with damage dealt
        room.updatePresence({
            damageDealt: (room.presence[room.clientId]?.damageDealt || 0) + damage
        });

        // Record tap timestamp and update TPS display
        tapTimestamps.push(Date.now());
        if (elements.tps) elements.tps.textContent = getTPS();
    });
    
    // Setup click handling for entire document (screen taps for resources)
    document.addEventListener('click', (e) => {
        // Don't process clicks on UI elements, only game area clicks
        if (!e.target.closest('.modal') && 
            !e.target.closest('.skill') && 
            !e.target.closest('#shop-button') && 
            !e.target.closest('#upgrades-button')) {
            processScreenClick(e);
        }
    });
    
    // Setup multiplayer
    setupMultiplayer();
    
    // Shop and upgrades buttons
    elements.shopButton.addEventListener('click', () => {
        elements.shopModal.style.display = 'flex';
    });
    
    elements.upgradesButton.addEventListener('click', () => {
        elements.upgradesModal.style.display = 'flex';
        import('./community.js').then(m => {
            m.renderCommunityChest && m.renderCommunityChest();
            const dep = document.getElementById('deposit-first-selected');
            if (dep) dep.onclick = () => m.depositSelected && m.depositSelected();
        });
        import('./marketplace.js').then(m => m.renderMarketplace && m.renderMarketplace());
    });
    
    // Settings button opens settings modal
    if (elements.settingsButton && elements.settingsModal) {
        elements.settingsButton.addEventListener('click', () => {
            elements.settingsModal.style.display = 'flex';
        });
    }
    
    // Prestige Shop open
    const psBtn = document.getElementById('prestige-shop-button');
    const psModal = document.getElementById('prestige-shop-modal');
    if (psBtn && psModal) {
        psBtn.onclick = () => { psModal.style.display = 'flex'; import('./shop.js').then(s => s.initPrestigeShop && s.initPrestigeShop()); };
    }

    // Audio controls
    if (elements.audioToggle) {
        elements.audioToggle.onclick = () => {
            if (!bgm) return;
            if (bgm.paused) {
                bgm.play().catch(()=>{});
                elements.audioToggle.textContent = '⏸️';
            } else {
                bgm.pause();
                elements.audioToggle.textContent = '▶️';
            }
        };
    }
    if (elements.audioVolume) {
        elements.audioVolume.oninput = (e) => {
            const vol = parseFloat(e.target.value || '0.5');
            if (bgm) bgm.volume = vol;
            localStorage.setItem('mt_bgm_vol', String(vol));
        };
    }
    if (elements.audioMute) {
        elements.audioMute.onclick = () => {
            if (!bgm) return;
            bgm.muted = !bgm.muted;
            elements.audioMute.textContent = bgm.muted ? '🔇' : '🔊';
            localStorage.setItem('mt_bgm_muted', bgm.muted ? '1' : '0');
        };
    }
}

function gameLoop() {
    // Update any animations or timers
    requestAnimationFrame(gameLoop);
}

function idleDamageLoop() {
    setInterval(() => {
        if (gameState.idleDamage > 0) {
            dealDamage(gameState.idleDamage);
        }
    }, 1000);
}

// Track recent tap timestamps to calculate taps-per-second (TPS)
let tapTimestamps = [];
function getTPS() {
    const now = Date.now();
    // keep only timestamps within the last 1000ms
    tapTimestamps = tapTimestamps.filter(t => now - t <= 1000);
    return tapTimestamps.length;
}
// update TPS display regularly to stay responsive
setInterval(() => {
    if (elements.tps) elements.tps.textContent = getTPS();
}, 250);

// Initialize the game when DOM is ready
document.addEventListener('DOMContentLoaded', initGame);

function initAudio() {
    try {
        if (!bgm) {
            bgm = new Audio('/Music_fx_soothing.wav');
            bgm.loop = true;
            const stored = parseFloat(localStorage.getItem('mt_bgm_vol') || '0.5');
            bgm.volume = Number.isFinite(stored) ? stored : 0.5;
            const mutedStored = localStorage.getItem('mt_bgm_muted') === '1';
            bgm.muted = mutedStored;
            if (elements.audioVolume) elements.audioVolume.value = bgm.volume;
            if (elements.audioToggle) elements.audioToggle.textContent = '▶️';
            if (elements.audioMute) elements.audioMute.textContent = bgm.muted ? '🔇' : '🔊';
            // Start on first user interaction
            const startOnce = () => {
                bgm.play().then(() => {
                    if (elements.audioToggle) elements.audioToggle.textContent = '⏸️';
                }).catch(() => {
                    // Autoplay blocked; keep as paused with play icon
                });
                window.removeEventListener('pointerdown', startOnce);
            };
            window.addEventListener('pointerdown', startOnce, { once: true });
        }
    } catch (e) {
        console.warn('Audio init failed', e);
    }
}
