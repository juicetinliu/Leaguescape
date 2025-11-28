import Page from '../js/models/Page.js';
import AuthService from '../js/services/auth.js';
import GameService from '../js/services/game.js';
import MessageService from '../js/services/message.js';
import { MessageTo, MessageType } from '../js/models/MessageTypes.js';
import { router } from '../js/utils/router.js';
import { parseCsvText } from '../js/utils/csvUtils.js';
import { msToHms, hmsToMs } from '../js/utils/timeUtils.js';
import { PAGES, GAME_STATE } from '../js/models/Enums.js';
import AdminHandlerService from '../js/services/handlers/adminHandler.js';

const TABS = {
    CHARACTERS: 'characters',
    ITEMS: 'items',
    BANK: 'bank'
}

class AdminPage extends Page {
    constructor() {
        super(PAGES.admin);
        this.currentGame = null;
        this.activeTab = TABS.CHARACTERS;
        this.gamePlayersUnsubscribe = null;
        this.gameItemsUnsubscribe = null;
        this.gameCharactersUnsubscribe = null;
        this.adminMessageUnsubscribe = null;

        this.unprocessedAdminMessages = [];

        this.players = [];
        this.characters = [];
        this.items = [];
        this.gameTimerInterval = null;
        this.importCsvRows = [];
    }

    async show() {
        super.show();
        const gameId = new URLSearchParams(window.location.search).get('gameId');
        if (!gameId) {
            router.navigate(PAGES.user);
            return;
        }

        this.currentGame = await GameService.getGame(gameId);
        const isAdmin = await GameService.isAdmin(gameId, AuthService.currentUser.authId);
        if (!this.currentGame || !isAdmin) {
            router.navigate(PAGES.user);
            return;
        }

        // Even though the snapshot listeners will update this, we do the fetch first to avoid empty data for dependent message flows
        this.players = await GameService.getGamePlayers(this.currentGame.gameId); // 
        this.initializeUI();
        this.attachEventListeners();
        // start timer UI if game already running
        if (this.currentGame.gameState === GAME_STATE.RUNNING) {
            this.startGameTimer();
        }
        // this.loadLobby(); // Not necessary as onSnapshot will handle updates
        // this.loadActiveTab(); // Not necessary as onSnapshot will update the first tab!
    }

    initializeUI() {
        const template = `
            <div id="${this.page}" class="page-container">
                <header class="header">
                    <div class="nav">
                        <div>
                            <h1>Game Admin: ${this.currentGame.gameId}</h1>
                            ${this.getGameStateButton()}
                        </div>
                        <div>
                            <button id="showActivity" class="btn">View Activity <span id="activityBadge" class="hidden">0</span></button>
                            ${this.currentGame.gameState === GAME_STATE.SETUP || this.currentGame.gameState === GAME_STATE.RUNNING ? '<button id="modifyDuration" class="btn">Modify Duration</button>' : ''}
                            <button id="exitGame" class="btn">Exit Game</button>
                        </div>
                    </div>
                    ${this.currentGame.gameState === GAME_STATE.RUNNING ? '<div id="gameTimer"></div>' : ''}
                </header>

                <div class="card" id="lobbySection">
                    <div class="section-header">
                        <h2>Game Lobby</h2>
                        <button class="btn" id="toggleLobby">▼</button>
                    </div>
                    <div id="lobbyContent"></div>
                </div>

                <div class="card">
                    <div class="tabs">
                        <button class="tab-btn active" data-tab="${TABS.CHARACTERS}">Characters</button>
                        <button class="tab-btn" data-tab="${TABS.ITEMS}">Items</button>
                        <button class="tab-btn" data-tab="${TABS.BANK}">Bank</button>
                    </div>
                    <div id="tabContent"></div>
                </div>

                <!-- Activity Modal -->
                <div id="activityModal" class="modal" style="display: none;">
                    <div class="modal-content">
                        <h2>Activity Log</h2>
                        <div id="activityLog"></div>
                        <button id="closeActivity" class="btn">Close</button>
                    </div>
                </div>

                <!-- Character Modal -->
                <div id="characterModal" class="modal" style="display: none;">
                    <div class="modal-content">
                        <h2>Character Details</h2>
                        <form id="characterForm">
                            <!-- Form fields will be dynamically added -->
                        </form>
                    </div>
                </div>

                <!-- Item Modal -->
                <div id="itemModal" class="modal" style="display: none;">
                    <div class="modal-content">
                        <h2>Item Details</h2>
                        <form id="itemForm">
                            <!-- Form fields will be dynamically added -->
                        </form>
                    </div>
                </div>

                <!-- Import CSV Modal -->
                <div id="importCsvModal" class="modal" style="display: none;">
                    <div class="modal-content">
                        <h2>Import Characters (CSV)</h2>
                        <p>CSV should include header: <code>first_name,last_name,user_id,user_password,starting_gold</code></p>
                        <input type="file" id="importCsvFileInput" accept="text/csv" />
                        <div id="importCsvError" class="error-text"></div>
                        <div id="importCsvPreview"></div>
                        <div class="form-actions">
                            <button id="importCsvCancel" class="btn">Cancel</button>
                            <button id="importCsvConfirm" class="btn" disabled>Confirm Import</button>
                        </div>
                    </div>
                </div>

                <!-- Modify Duration Modal -->
                <div id="modifyDurationModal" class="modal" style="display: none;">
                    <div class="modal-content">
                        <h2>Set Game Duration</h2>
                        <p>Enter duration as <code>HH:MM:SS</code></p>
                        <input type="text" id="durationInput" placeholder="01:00:00" />
                        <div id="durationError" class="error-text"></div>
                        <div class="form-actions">
                            <button id="durationCancel" class="btn">Cancel</button>
                            <button id="durationConfirm" class="btn" disabled>Confirm</button>
                        </div>
                    </div>
                </div>
            </div>
        `;
        
        document.querySelector('#app').innerHTML = template;
    }

    getGameStateButton() {
        switch (this.currentGame.gameState) {
            case GAME_STATE.SETUP:
                return '<button id="startGame" class="btn">Start Game</button>';
            case GAME_STATE.RUNNING:
                return '<button id="endGame" class="btn">End Game</button>';
            default:
                return '';
        }
    }

    attachEventListeners() {
        // Game state buttons
        document.getElementById('exitGame').addEventListener('click', () => {
            router.navigate(PAGES.user);
        });

        const startGameBtn = document.getElementById('startGame');
        if (startGameBtn) {
            startGameBtn.addEventListener('click', async () => {
                await this.updateGameState(GAME_STATE.RUNNING);
            });
        }

        const endGameBtn = document.getElementById('endGame');
        if (endGameBtn) {
            endGameBtn.addEventListener('click', async () => { 
                await this.updateGameState(GAME_STATE.END);
            });
        }

        // Tab switching
        document.querySelectorAll('.tab-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                this.activeTab = e.target.dataset.tab;
                this.updateTabs();
                this.loadActiveTab();
            });
        });

        // Activity log
        const showActivityBtn = document.getElementById('showActivity');
        if (showActivityBtn) {
            showActivityBtn.addEventListener('click', () => this.showActivityLog());
        }

        // Game duration button
        const modifyDurationBtn = document.getElementById('modifyDuration');
        if (modifyDurationBtn) {
            modifyDurationBtn.addEventListener('click', () => this.showModifyDurationModal());
        }

        // Lobby toggle
        document.getElementById('toggleLobby').addEventListener('click', (e) => {
            const content = document.getElementById('lobbyContent');
            const btn = e.target;
            if (content.style.display === 'none') {
                content.style.display = 'block';
                btn.textContent = '▼';
            } else {
                content.style.display = 'none';
                btn.textContent = '▶';
            }
        });

        document.getElementById('closeActivity').onclick = () => {
            const modal = document.getElementById('activityModal');
            modal.style.display = 'none';
        };

        if(this.currentGame.gameId) {
            this.gamePlayersUnsubscribe = GameService.onGamePlayersSnapshot(this.currentGame.gameId, async (gameLobbyData) => {
                await this.loadLobby(gameLobbyData);
            });
            this.gameCharactersUnsubscribe = GameService.onGameCharactersSnapshot(this.currentGame.gameId, async (gameCharactersData) => {
                await this.loadCharacters(this.activeTab === TABS.CHARACTERS ? document.getElementById('tabContent') : null, gameCharactersData);
            });
            this.gameItemsUnsubscribe = GameService.onGameItemsSnapshot(this.currentGame.gameId, async (gameItemsData) => {
                await this.loadItems(this.activeTab === TABS.ITEMS ? document.getElementById('tabContent') : null, gameItemsData);
            });

            // subscribe to unprocessed admin messages and update badge
            this.setupAdminMessageListener();
        }
    }

    async loadLobby(gamePlayers) {
        const lobbyContent = document.getElementById('lobbyContent');
        this.players = gamePlayers ? gamePlayers : await GameService.getGamePlayers(this.currentGame.gameId);
        const playersHtml = this.players.map(player => `
            <div class="player-item">
                <span>${player.playerName || 'Unnamed Player'}</span>
                <select class="login-mode-select" data-player-id="${player.playerId}">
                    <option value="normal" ${player.loginMode === 'normal' ? 'selected' : ''}>Normal</option>
                    <option value="secret" ${player.loginMode === 'secret' ? 'selected' : ''}>Secret</option>
                    <option value="inventory" ${player.loginMode === 'inventory' ? 'selected' : ''}>Inventory</option>
                </select>
                <div>
                ${player.privateDetails.assumedCharacterId ? `Player assumed character: ${this.characters.find(c => c.characterId === player.privateDetails.assumedCharacterId).name}
                    ` : `No character assumed`}
                </div>
                <button class="btn kick-player" data-player-id="${player.playerId}">Kick</button>
                ${!player.privateDetails.isBanned ?
                    `<button class="btn ban-player" data-player-id="${player.playerId}">Ban</button>`
                    : `<button class="btn unban-player" data-player-id="${player.playerId}">UnBan</button>`
                }
            </div>
        `).join('');

        lobbyContent.innerHTML = playersHtml || '<p>No players in lobby</p>';

        // Add event listeners for kick and ban buttons
        document.querySelectorAll('.kick-player').forEach(button => {
            button.addEventListener('click', () => this.kickPlayer(button.dataset.playerId));
        });
        
        document.querySelectorAll('.ban-player').forEach(button => {
            button.addEventListener('click', () => this.banPlayer(button.dataset.playerId));
        });

        document.querySelectorAll('.unban-player').forEach(button => {
            button.addEventListener('click', () => this.unBanPlayer(button.dataset.playerId));
        });

        document.querySelectorAll('.login-mode-select').forEach(select => {
            select.addEventListener('change', async (e) => {
                await GameService.updatePlayerLoginMode(this.currentGame.gameId, e.target.dataset.playerId, e.target.value);
            });
        });
    }

    async loadActiveTab() {
        const content = document.getElementById('tabContent');
        switch (this.activeTab) {
            case TABS.CHARACTERS:
                await this.loadCharacters(content, this.characters);
                break;
            case TABS.ITEMS:
                await this.loadItems(content, this.items);
                break;
            case TABS.BANK:
                await this.loadBank(content);
                break;
        }
    }

    async loadItems(container, gameItemsData) {
        this.items = gameItemsData ? gameItemsData : await GameService.getGameItems(this.currentGame.gameId);
        if(!container) return; //only load the data!

        const grid = document.createElement('div');
        grid.className = 'items-grid';
        
        this.items.forEach(item => {
            const card = document.createElement('div');
            card.className = 'item-card';
            card.innerHTML = `
                <div class="item-info">
                    <h3>${item.name}</h3>
                    <p>Price: ${item.price} gold</p>
                    <p>Quantity: ${item.quantity}</p>
                </div>
                ${this.currentGame.gameState !== GAME_STATE.END ? `
                    <div class="item-actions">
                        <button class="btn edit-item" data-id="${item.itemId}">Edit</button>
                        <button class="btn delete-item" data-id="${item.itemId}">Delete</button>
                    </div>
                ` : ''}
            `;
            
            if (this.currentGame.gameState !== GAME_STATE.END) {
                const editBtn = card.querySelector('.edit-item');
                const deleteBtn = card.querySelector('.delete-item');
                
                editBtn.addEventListener('click', () => this.editItem(item));
                deleteBtn.addEventListener('click', () => this.deleteItem(item.itemId));
            }
            
            grid.appendChild(card);
        });

        if (this.currentGame.gameState !== GAME_STATE.END) {
            const addCard = document.createElement('div');
            addCard.className = 'item-card add-item';
            addCard.innerHTML = `<button id="addItem" class="btn">Add Item</button>`;
            addCard.querySelector('#addItem').addEventListener('click', () => this.showItemModal());
            grid.appendChild(addCard);
        }

        container.innerHTML = '';
        container.appendChild(grid);
    }

    async loadCharacters(container, gameCharactersData) {
        this.characters = gameCharactersData ? gameCharactersData : await GameService.getGameCharacters(this.currentGame.gameId);
        if(!container) return; //only load the data!

        const grid = document.createElement('div');
        grid.className = 'profile-grid';
        
        this.characters.forEach(character => {
            const card = document.createElement('div');
            card.className = 'profile-card';
            card.innerHTML = `
                <div class="profile-image-wrapper">
                    <img src="${character.profileImage}" class="profile-image">
                </div>
                <div class="profile-info">
                    <h3>${character.name}</h3>
                    <p>Account: ${character.accountNumber}</p>
                </div>
                ${this.currentGame.gameState !== GAME_STATE.END ? `
                    <div class="profile-actions">
                        <button class="btn edit-character" data-id="${character.characterId}">Edit</button>
                        <button class="btn delete-character" data-id="${character.characterId}">Delete</button>
                    </div>
                ` : ''}
            `;
            
            // Add event listeners
            if (this.currentGame.gameState !== GAME_STATE.END) {
                const editBtn = card.querySelector('.edit-character');
                const deleteBtn = card.querySelector('.delete-character');
                
                editBtn.addEventListener('click', () => this.editCharacter(character));
                deleteBtn.addEventListener('click', () => this.deleteCharacter(character.characterId));
            }
            
            grid.appendChild(card);
        });

        if (this.currentGame.gameState !== GAME_STATE.END) {
            const addCard = document.createElement('div');
            addCard.className = 'profile-card add-profile';
            addCard.innerHTML = `
                <div class="profile-add-actions">
                    <button id="addCharacter" class="btn">Add Character</button>
                    <button id="importCsv" class="btn">Import CSV</button>
                </div>
            `;
            addCard.querySelector('#addCharacter').addEventListener('click', () => this.showCharacterModal());
            addCard.querySelector('#importCsv').addEventListener('click', () => this.showImportCsvModal());
            grid.appendChild(addCard);
        }

        container.innerHTML = '';
        container.appendChild(grid);
    }

    updateTabs() {
        document.querySelectorAll('.tab-btn').forEach(btn => {
            btn.classList.toggle('active', btn.dataset.tab === this.activeTab);
        });
    }

    async updateGameState(newState) {
        if (!confirm(`Are you sure you want to ${newState === GAME_STATE.RUNNING ? 'start' : 'end'} the game?`)) {
            return;
        }

        await this.currentGame.updateState(newState);
        window.location.reload();
    }

    startGameTimer() {
        // Clear any existing interval
        if (this.gameTimerInterval) {
            clearInterval(this.gameTimerInterval);
            this.gameTimerInterval = null;
        }

        const timerEl = document.getElementById('gameTimer');
        if (!timerEl) return;

        // Determine start time from game doc
        let startTime = this.currentGame.startTime;
        let startDate = null;
        try {
            startDate = startTime && startTime.toDate ? startTime.toDate() : new Date(startTime);
        } catch (e) {
            startDate = new Date();
        }

        const durationMs = this.currentGame.gameDuration;

        const tick = () => {
            const now = new Date();
            const elapsed = now - startDate;
            const remaining = durationMs - elapsed;

            if (remaining <= 0) {
                timerEl.textContent = msToHms(0);
                clearInterval(this.gameTimerInterval);
                this.gameTimerInterval = null;
                // auto end the game
                this.endGameAutomatically();
                return;
            }

            // format remaining as HH:MM:SS
            timerEl.textContent = msToHms(remaining);
        }

        // initial tick and interval
        tick();
        this.gameTimerInterval = setInterval(tick, 1000);
    }

    async endGameAutomatically() {
        try {
            // update without confirmation
            await this.currentGame.updateState(GAME_STATE.END);
            window.location.reload();
        } catch (err) {
            console.error('Failed to auto-end game', err);
        }
    }

    async showActivityLog() {
        const modal = document.getElementById('activityModal');
        modal.style.display = 'flex';
    }

    renderUnprocessedMessages() {
        const log = document.getElementById('activityLog');
        const unprocessedAdminMessagesLength = this.unprocessedAdminMessages.length;
        const html = this.unprocessedAdminMessages.map(msg => {
            if(msg.processed) return '';
            
            const player = this.players.find(p => p.playerId === msg.playerId);
            let character = null;
            if(msg.messageDetails && msg.messageDetails.characterId) {
                character = this.characters.find(c => c.characterId === msg.messageDetails.characterId);
            }
            const activityOptions = AdminHandlerService.returnMessageActivityOptions(msg.messageType);

            // TODO: Create helpers to convert the messageType to display string, and details to display ready UX.
            return `
                <div class="activity-item" id="activity-${msg.messageId}">
                    <div class="activity-header">
                        <span class="timestamp">${msg.activityTime.toDate().toLocaleString("en-US", { timeZone: "PST" })}</span>
                        <span class="message-type">${msg.messageType}</span>
                    </div>
                    <div class="activity-details"><pre>${typeof msg.messageDetails === 'string' ? msg.messageDetails : JSON.stringify(msg.messageDetails)}</pre></div>
                    <div class="activity-actions">
                        ${activityOptions.map(option => {return `
                            <button class="btn ${option}-msg" data-id="${msg.messageId}">${option.toUpperCase()}</button>
                        `;}).join('')}
                    </div>
                </div>
            `;
        }).join('');


        if (unprocessedAdminMessagesLength === 0) {
            log.innerHTML = '<p>No pending requests</p>';
        } else {
            log.innerHTML = html;
        }

        const badge = document.getElementById('activityBadge');
        if (unprocessedAdminMessagesLength > 0) {
            badge.classList.remove('hidden');
            badge.textContent = unprocessedAdminMessagesLength > 9 
                ? '9+'
                : unprocessedAdminMessagesLength ;
        } else {
            badge.classList.add('hidden');
            badge.textContent = "0";
        }

        // attach listeners
        document.querySelectorAll('.approve-msg').forEach(btn => {
            btn.addEventListener('click', async (e) => {
                const id = e.target.dataset.id;
                await this.processAdminDecision(id, true);
            });
        });

        document.querySelectorAll('.decline-msg').forEach(btn => {
            btn.addEventListener('click', async (e) => {
                const id = e.target.dataset.id;
                await this.processAdminDecision(id, false);
            });
        });

        document.querySelectorAll('.ignore-msg').forEach(btn => {
            btn.addEventListener('click', async (e) => {
                const id = e.target.dataset.id;
                await this.ignoreMessage(id);
            });
        });
    }

    async editCharacter(character) {
        const characterModal = document.getElementById('characterModal');
        const form = document.getElementById('characterForm');
        const characterNameParts = character.name ? character.name.split(' ') : [""];
        const characterFirstName = characterNameParts[0];
        const characterLastName = characterNameParts.slice(1).join(" ");
        const isUpdate = !!character.characterId; //otherwise this is for creating!

        form.innerHTML = `
            <div class="character-form-images">
                <div class="form-group">
                    <label for="profileImageInput">PROFILE IMAGE:</label>
                    <input type="file" id="profileImageInput" accept="image/*">
                    <div class="profile-image-wrapper">
                        <img src="${character.profileImage}" alt="profileImagePreview" id="profileImagePreview">
                    </div>
                </div>
                <div class="form-group">
                    <label for="emblemImageInput">EMBLEM IMAGE:</label>
                    <input type="file" id="emblemImageInput" accept="image/*">
                    <div class="emblem-image-wrapper">
                        <img src="${character.emblemImage}" alt="emblemImagePreview" id="emblemImagePreview">
                    </div>
                </div>
            </div>
            <div class="character-form-details">
                <div class="form-group">
                    <label for="characterFirstName">FIRST NAME:</label>
                    <input type="text" id="characterFirstName" value="${characterFirstName || ''}" required>
                </div>
                <div class="form-group">
                    <label for="characterLastName">LAST NAME:</label>
                    <input type="text" id="characterLastName" value="${characterLastName || ''}">
                </div>
                <div class="form-group">
                    <label for="accountNumber">USER ID:</label>
                    <input type="text" id="accountNumber" value="${character.accountNumber || ''}" required>
                </div>
                <div class="form-group">
                    <label for="accountPassword">USER PASSWORD:</label>
                    <input type="text" id="accountPassword" value="${character.accountPassword || ''}" required>
                </div>
                <div class="form-group">
                    <label for="startingGold">STARTING GOLD BALANCE:</label>
                    <input type="number" id="startingGold" value="${character.startingGold || 0}" required>
                </div>
                ${isUpdate ? 
                    `<div class="form-group">
                        <label for="actualGold">CURRENT GOLD BALANCE:</label>
                        <input type="number" id="actualGold" value="${character.gold || 0}" required>
                    </div>` : ''}
                <div class="form-group">
                    <label for="canAccessSecret">CAN ACCESS SECRET:</label>
                    <input type="checkbox" id="canAccessSecret" ${!isUpdate || character.canAccessSecret ? 'checked' : ''}>
                </div>
                <div class="form-actions">
                    <button type="button" class="btn" id="cancelCharacter">CANCEL</button>
                    <button type="submit" class="btn">SAVE</button>
                </div>
            </div>
        `;

        document.getElementById('profileImageInput').addEventListener('change', function() {
            const profileImagePreview = document.getElementById('profileImagePreview');

            const files = this.files;
            if (files && files.length > 0) {
                const reader = new FileReader();
                reader.onload = function(e) {
                    profileImagePreview.src = e.target.result;
                };
                reader.onerror = function(err) {
                    console.error("Error reading file:", err);
                    alert("An error occurred while reading the file.");
                };
                reader.readAsDataURL(files[0]);
            }
        });

        document.getElementById('emblemImageInput').addEventListener('change', function() {
            const emblemImagePreview = document.getElementById('emblemImagePreview');

            const files = this.files;
            if (files && files.length > 0) {
                const reader = new FileReader();
                reader.onload = function(e) {
                    emblemImagePreview.src = e.target.result;
                };
                reader.onerror = function(err) {
                    console.error("Error reading file:", err);
                    alert("An error occurred while reading the file.");
                };
                reader.readAsDataURL(files[0]);
            }
        });

        form.onsubmit = async (e) => {
            e.preventDefault();
            const gameId = this.currentGame.gameId;

            const profileImageInput = document.getElementById('profileImageInput');
            let profileImageUrl = character.profileImage || '';
            const profileFiles = profileImageInput.files;
            if (profileFiles.length > 0) {
                profileImageUrl = await GameService.uploadCharacterProfileImage(gameId, profileFiles[0]);
            }
            const emblemImageInput = document.getElementById('emblemImageInput');
            let emblemImageUrl = character.emblemImage || '';
            const emblemFiles = emblemImageInput.files;
            if (emblemFiles.length > 0) {
                emblemImageUrl = await GameService.uploadCharacterProfileImage(gameId, emblemFiles[0]);
            }

            const characterData = {
                name: document.getElementById('characterFirstName').value + ' ' + document.getElementById('characterLastName').value,
                accountNumber: document.getElementById('accountNumber').value,
                accountPassword: document.getElementById('accountPassword').value,
                startingGold: parseInt(document.getElementById('startingGold').value),
                gold: parseInt(document.getElementById(isUpdate ? 'actualGold' : 'startingGold').value),
                profileImage: profileImageUrl,
                emblemImage: emblemImageUrl,
                canAccessSecret: document.getElementById('canAccessSecret').checked
                //items - TODO: support starting items?
            };

            if (isUpdate) {
                await GameService.updateCharacter(this.currentGame.gameId, character.characterId, characterData);
            } else {
                await GameService.createCharacter(this.currentGame.gameId, characterData);
            }

            characterModal.style.display = 'none';
            // this.loadCharacters(document.getElementById('tabContent')); // Not necessary as onSnapshot will handle updates
        };

        document.getElementById('cancelCharacter').onclick = () => {
            characterModal.style.display = 'none';
        };

        characterModal.style.display = 'flex';
    }

    async editItem(item) {
        const itemModal = document.getElementById('itemModal');
        const form = document.getElementById('itemForm');
        
        form.innerHTML = `
            <div class="form-group">
                <label for="itemNumber">ITEM ID:</label>
                <input type="number" id="itemNumber" value="${item.itemNumber || 0}" required>
            </div>
            <div class="form-group">
                <label for="itemName">NAME:</label>
                <input type="text" id="itemName" value="${item.name || ''}" required>
            </div>
            <div class="form-group">
                <label for="itemDescription">DESCRIPTION:</label>
                <textarea id="itemDescription">${item.description || ''}</textarea>
            </div>
            <div class="form-group">
                <label for="itemQuantity">QUANTITY IN SHOP:</label>
                <input type="number" id="itemQuantity" value="${item.quantity || 0}" required>
            </div>
            <div class="form-group">
                <label for="itemPrice">PRICE:</label>
                <input type="number" id="itemPrice" value="${item.price || 0}" required>
            </div>
            <div class="form-group">
                <label for="itemPrereqs">PREREQS:</label>
                <input type="text" id="itemPrereqs" value="${item.prereqs || ''}">
            </div>
            <div class="form-group">
                <label for="itemIsSecret">IS SECRET ITEM:</label>
                <input type="checkbox" id="itemIsSecret" ${item.isSecret ? 'checked' : ''}>
            </div>
            <div class="form-actions">
                <button type="button" class="btn" id="cancelItem">Cancel</button>
                <button type="submit" class="btn">Save</button>
            </div>
        `;

        form.onsubmit = async (e) => {
            e.preventDefault();
            const updatedItem = {
                itemNumber: parseInt(document.getElementById('itemNumber').value),
                name: document.getElementById('itemName').value,
                description: document.getElementById('itemDescription').value,
                quantity: parseInt(document.getElementById('itemQuantity').value),
                price: parseInt(document.getElementById('itemPrice').value),
                prereqs: document.getElementById('itemPrereqs').value, // Probably should make this into some selection CX. Currently requires list of itemIds which is hard to translate!
                isSecret: document.getElementById('itemIsSecret').checked,
            };

            if (item.itemId) {
                await GameService.updateItem(this.currentGame.gameId, item.itemId, updatedItem);
            } else {
                await GameService.createItem(this.currentGame.gameId, updatedItem);
            }

            itemModal.style.display = 'none';
            // this.loadItems(document.getElementById('tabContent')); // Not necessary as onSnapshot will handle updates
        };

        document.getElementById('cancelItem').onclick = () => {
            itemModal.style.display = 'none';
        };

        itemModal.style.display = 'flex';
    }

    /*********************** CSV Import Handlers ************************/
    showImportCsvModal() {
        this.importCsvRows = [];
        const err = document.getElementById('importCsvError');
        const preview = document.getElementById('importCsvPreview');
        const confirmBtn = document.getElementById('importCsvConfirm');
        if (err) err.innerHTML = '';
        if (preview) preview.innerHTML = '';
        if (confirmBtn) confirmBtn.disabled = true;

        const modal = document.getElementById('importCsvModal');
        modal.style.display = 'flex';

        // wire file input
        const fileInput = document.getElementById('importCsvFileInput');
        fileInput.value = '';
        fileInput.onchange = (e) => this.handleImportCsvFileInput(e.target.files && e.target.files[0]);

        document.getElementById('importCsvCancel').onclick = () => this.hideImportCsvModal();
        document.getElementById('importCsvConfirm').onclick = async () => await this.confirmImportCsv();
    }

    hideImportCsvModal() {
        const modal = document.getElementById('importCsvModal');
        if (modal) modal.style.display = 'none';
        this.importCsvRows = [];
    }

    handleImportCsvFileInput(file) {
        const err = document.getElementById('importCsvError');
        const preview = document.getElementById('importCsvPreview');
        const confirmBtn = document.getElementById('importCsvConfirm');
        if (!file) {
            if (err) err.innerHTML = 'No file selected';
            if (confirmBtn) confirmBtn.disabled = true;
            if (preview) preview.innerHTML = '';
            return;
        }

        const reader = new FileReader();
        reader.onload = (ev) => {
            const text = ev.target.result;
            try {
                const rows = parseCsvText(text);
                // validate
                if (!rows || rows.length === 0) {
                    throw new Error('CSV contains no rows');
                }
                // ensure headers
                const required = ['first_name','last_name','user_id','user_password','starting_gold'];
                const headers = Object.keys(rows[0]);
                const missing = required.filter(r => !headers.includes(r));
                if (missing.length > 0) {
                    throw new Error('Missing headers: ' + missing.join(', '));
                }

                this.importCsvRows = rows;
                if (err) err.innerHTML = '';
                if (preview) this.renderImportPreview(rows);
                if (confirmBtn) confirmBtn.disabled = rows.length === 0;
            } catch (e) {
                if (err) err.innerHTML = e.message || 'Invalid CSV';
                if (preview) preview.innerHTML = '';
                if (confirmBtn) confirmBtn.disabled = true;
            }
        };
        reader.onerror = (e) => {
            const errEl = document.getElementById('importCsvError');
            if (errEl) errEl.innerHTML = 'Failed to read file';
        };
        reader.readAsText(file);
    }

    renderImportPreview(rows) {
        const preview = document.getElementById('importCsvPreview');
        if (!preview) return;
        const count = rows.length;
        const lines = rows.slice(0, 10).map(r => `<li>${r.first_name} ${r.last_name} (${r.user_id} | ${r.user_password}) - ${r.starting_gold}</li>`).join('');
        preview.innerHTML = `
            <p>Will create <strong>${count}</strong> characters.</p>
            <ul>${lines}${count > 10 ? '<li>...and more</li>' : ''}</ul>
        `;
    }

    async confirmImportCsv() {
        if (!this.importCsvRows || this.importCsvRows.length === 0) return;
        const rows = this.importCsvRows;
        const gameId = this.currentGame.gameId;
        try {
            // create characters sequentially to avoid bursts
            for (const r of rows) {
                const first = r.first_name || '';
                const last = r.last_name || '';
                const characterData = {
                    name: (first + ' ' + last).trim(),
                    accountNumber: r.user_id || '',
                    accountPassword: r.user_password || '',
                    startingGold: parseInt(r.starting_gold || '0'),
                    gold: parseInt(r.starting_gold || '0'),
                    profileImage: '',
                    emblemImage: '',
                    canAccessSecret: true
                };
                await GameService.createCharacter(gameId, characterData);
            }
            this.hideImportCsvModal();
        } catch (err) {
            const errEl = document.getElementById('importCsvError');
            if (errEl) errEl.innerHTML = 'Failed to import CSV: ' + (err.message || String(err));
        }
    }

    /********************* End CSV Import Handlers ***********************/

    /********************* Modify Duration Handlers ********************/

    showModifyDurationModal() {
        const modal = document.getElementById('modifyDurationModal');
        const input = document.getElementById('durationInput');
        const err = document.getElementById('durationError');
        const confirmBtn = document.getElementById('durationConfirm');
        if (!modal || !input || !confirmBtn || !this.currentGame) return;
        // prefill with current duration
        input.value = msToHms(this.currentGame.gameDuration);
        if (err) err.innerHTML = '';
        confirmBtn.disabled = false;

        input.oninput = () => {
            const ms = hmsToMs(input.value.trim());
            const showError = ms === null;
            if (err) err.innerHTML = showError ? 'Invalid format. Use HH:MM:SS' : '';
            confirmBtn.disabled = showError;
        };

        document.getElementById('durationCancel').onclick = () => this.hideModifyDurationModal();
        document.getElementById('durationConfirm').onclick = async () => await this.confirmModifyDuration();

        modal.style.display = 'flex';
    }

    hideModifyDurationModal() {
        const modal = document.getElementById('modifyDurationModal');
        if (modal) modal.style.display = 'none';
        const input = document.getElementById('durationInput');
        if (input) input.oninput = null;
    }

    async confirmModifyDuration() {
        const input = document.getElementById('durationInput');
        const err = document.getElementById('durationError');
        if (!input) return;
        const ms = hmsToMs(input.value.trim());
        if (ms === null) {
            if (err) err.innerHTML = 'Invalid duration format';
            return;
        }

        try {
            await this.currentGame.updateDuration(ms);
            this.hideModifyDurationModal();
            // if game running, restart timer with new duration
            if (this.currentGame.gameState === GAME_STATE.RUNNING) {
                this.startGameTimer();
            }
        } catch (e) {
            if (err) err.innerHTML = 'Failed to save duration: ' + (e.message || String(e));
        }
    }

    /******************* End Modify Duration Handlers *******************/

    showCharacterModal() {
        this.editCharacter({});
    }

    showItemModal() {
        this.editItem({});
    }

    async deleteCharacter(characterId) {
        if (confirm('Are you sure you want to delete this character?')) {
            await GameService.deleteCharacter(this.currentGame.gameId, characterId);
            // this.loadCharacters(document.getElementById('tabContent')); // Not necessary as onSnapshot will handle updates
        }
    }

    async deleteItem(itemId) {
        if (confirm('Are you sure you want to delete this item?')) {
            await GameService.deleteItem(this.currentGame.gameId, itemId);
            // this.loadItems(document.getElementById('tabContent')); // Not necessary as onSnapshot will handle updates
        }
    }

    async kickPlayer(playerId) {
        if (confirm('Are you sure you want to kick this player?')) {
            await GameService.kickPlayer(this.currentGame.gameId, playerId);
            // await this.loadLobby(); // Not necessary as onSnapshot will handle updates
        }
    }

    async banPlayer(playerId) {
        if (confirm('Are you sure you want to ban this player?')) {
            await GameService.banPlayer(this.currentGame.gameId, playerId);
            await this.loadLobby(); // necessary - onSnapshot only handles updates to player data, not privateDetails!
        }
    }

    async unBanPlayer(playerId) {
        if (confirm('Are you sure you want to unban this player?')) {
            await GameService.unBanPlayer(this.currentGame.gameId, playerId);
            await this.loadLobby(); // necessary - onSnapshot only handles updates to player data, not privateDetails!
        }
    }

    async setupAdminMessageListener() {
        // Keep local list of unprocessed messages and update badge/UI. Do not auto-process.
        this.adminMessageUnsubscribe = MessageService.onUnprocessedAdminMessagesSnapshot(this.currentGame.gameId, async (messages) => {
            console.log(messages);
            this.unprocessedAdminMessages = messages || [];
            await this.autoProcessMessages();
            this.renderUnprocessedMessages();
        });
    }

    // Run flows that happen immediately on receiving the message.
    // Also run auto-approved/rejected messages - this "skips" the activity log flow if the message marked as processed here!
    async autoProcessMessages() {
        await Promise.all(this.unprocessedAdminMessages.map(async message => {
            const messageId = message.messageId;
            const gameId = this.currentGame.gameId;
            const player = this.players.find(p => p.playerId === message.playerId);

            if(message.messageType === MessageType.PURCHASE_ATTEMPT) {
                const { characterId, cart } = message.messageDetails;
                const character = this.characters.find(character => { return character.characterId === characterId });

                return await AdminHandlerService.createPlayerCartPurchaseHistoryEntry(messageId, character, cart);
            } else if (message.messageType === MessageType.LOGIN_ATTEMPT) {
                const { accountNumber, accountPassword } = message.messageDetails;
                const character = this.characters.find(c => c.accountNumber === accountNumber && c.accountPassword === accountPassword);
                if (character) {
                    await AdminHandlerService.handlePlayerLogIn(gameId, player, character.characterId, true);
                    await this.loadLobby();
                } else {
                    await AdminHandlerService.handlePlayerLogIn(gameId, player, null, false, 'Invalid Credentials');
                }
                await message.markAsProcessed();
            } else if (message.messageType === MessageType.LOGOUT_ATTEMPT) {
                const { characterId } = message.messageDetails;
                if (characterId) {
                    await AdminHandlerService.handlePlayerLogOut(gameId, player, characterId, true);
                    await this.loadLobby();
                } else {
                    await AdminHandlerService.handlePlayerLogOut(gameId, player, characterId, false, 'Invalid Character');
                }
                await message.markAsProcessed();
            }
            return;
        }));
    }

    async ignoreMessage(messageId) {
        const message = this.unprocessedAdminMessages.find(m => m.messageId === messageId);
        if (!message) return;
        await message.markAsProcessed();
    }

    // Admin-driven processing: called when admin approves/declines an individual message. Admin can also make modifications/overrides.
    async processAdminDecision(messageId, adminApproved, adminRejectionMessage, modifications) {
        const message = this.unprocessedAdminMessages.find(m => m.messageId === messageId);
        if (!message) return;

        const gameId = this.currentGame.gameId;
        const player = this.players.find(p => p.playerId === message.playerId);
        if (!player) {
            // mark processed and return. This flow should not be possible!
            await message.markAsProcessed();
            return;
        }

        if (message.messageType === MessageType.REQUEST_INVENTORY_ATTEMPT) {
            const { characterId } = message.messageDetails;
            if (adminApproved && characterId) {
                await AdminHandlerService.handlePlayerInventoryAccess(gameId, player, characterId, true);
            } else {
                await AdminHandlerService.handlePlayerInventoryAccess(gameId, player, characterId, false, !adminApproved ? 'Declined by Admin' : 'Invalid Character');
            }
        } else if (message.messageType === MessageType.PURCHASE_ATTEMPT) {
            const { characterId, cart } = message.messageDetails;
            const character = this.characters.find(character => { return character.characterId === characterId });
            
            const { approved:autoApproved, rejectionReason, approvedItems, totalPrice } = await AdminHandlerService.checkPlayerCartPurchaseRequirements(gameId, player, character, cart, this.items);
            if (adminApproved && autoApproved) {
                await AdminHandlerService.handlePlayerCartPurchaseRequest(gameId, player, character, approvedItems, totalPrice, messageId, true);
            } else {
                await AdminHandlerService.handlePlayerCartPurchaseRequest(gameId, player, character, [], 0, messageId, false, !adminApproved ? 'Declined by Admin' : rejectionReason);
            }
        } else if (message.messageType === MessageType.WITHDRAW_ATTEMPT || message.messageType === MessageType.DEPOSIT_ATTEMPT) {
            const { characterId, amount } = message.messageDetails;
            const isDeposit = message.messageType === MessageType.DEPOSIT_ATTEMPT;
            const character = this.characters.find(character => { return character.characterId === characterId });
            const { approved:autoApproved, rejectionReason, isDeposit:_, amount:approvedAmount } = await AdminHandlerService.checkGoldActionRequirements(gameId, player, character, isDeposit, amount);
            if (adminApproved && autoApproved) {
                await AdminHandlerService.handlePlayerGoldActionRequest(gameId, player, characterId, approvedAmount, isDeposit, true);
            } else {
                await AdminHandlerService.handlePlayerGoldActionRequest(gameId, player, characterId, approvedAmount, isDeposit, false, !adminApproved ? 'Declined by Admin' : rejectionReason);
            }
        }

        // Mark original message processed and remove from local list
        await message.markAsProcessed();
    }

    cleanup() {
        super.cleanup();
        this.players = [];
        this.characters = [];
        this.items = [];

        if (this.gamePlayersUnsubscribe) {
            this.gamePlayersUnsubscribe();
        }
        if (this.adminMessageUnsubscribe) {
            this.adminMessageUnsubscribe();
        }
        if (this.gameCharactersUnsubscribe){ 
            this.gameCharactersUnsubscribe();
        }
        if (this.gameItemsUnsubscribe){ 
            this.gameItemsUnsubscribe();
        }
        this.unprocessedAdminMessages = [];
        if (this.gameTimerInterval) {
            clearInterval(this.gameTimerInterval);
            this.gameTimerInterval = null;
        }
    }
}

export default new AdminPage();