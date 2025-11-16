import Page from '../js/models/Page.js';
import AuthService from '../js/services/auth.js';
import GameService from '../js/services/game.js';
import MessageService from '../js/services/message.js';
import { MessageTo, MessageType } from '../js/models/MessageTypes.js';
import { router } from '../js/utils/router.js';
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

        this.players = [];
        this.characters = [];
        this.items = [];
    }

    async show() {
        super.show();
        const gameId = new URLSearchParams(window.location.search).get('gameId');
        if (!gameId) {
            router.navigate(PAGES.user);
            return;
        }

        this.currentGame = await GameService.getGame(gameId);
        if (!this.currentGame || await !GameService.isAdmin(gameId, AuthService.currentUser.authId)) {
            router.navigate(PAGES.user);
            return;
        }

        this.initializeUI();
        this.attachEventListeners();
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
                            ${this.currentGame.gameState === GAME_STATE.RUNNING ? '<button id="showActivity" class="btn">View Activity</button>' : ''}
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
            startGameBtn.addEventListener('click', () => this.updateGameState(GAME_STATE.RUNNING));
        }

        const endGameBtn = document.getElementById('endGame');
        if (endGameBtn) {
            endGameBtn.addEventListener('click', () => this.updateGameState(GAME_STATE.END));
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

            this.setupAdminMessageListener()
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
                <img src="${character.profileImage || '/public/images/default-profile.png'}" class="profile-image">
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
                <button id="addCharacter" class="btn">Add Character</button>
            `;
            addCard.querySelector('#addCharacter').addEventListener('click', () => this.showCharacterModal());
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

    async showActivityLog() {
        const modal = document.getElementById('activityModal');
        const log = document.getElementById('activityLog');
        
        const actions = await GameService.getGameActions(this.currentGame.gameId);
        log.innerHTML = actions.map(action => `
            <div class="activity-item">
                <span class="timestamp">${new Date(action.activityTime).toLocaleString()}</span>
                <span class="type">${action.actionType}</span>
                <span class="details">${action.actionDetails}</span>
            </div>
        `).join('');
        
        modal.style.display = 'flex';
    }

    async editCharacter(character) {
        const characterModal = document.getElementById('characterModal');
        const form = document.getElementById('characterForm');
        const characterNameParts = character.name ? character.name.split(' ') : [""];
        const characterFirstName = characterNameParts[0];
        const characterLastName = characterNameParts.slice(1).join(" ");
        const isUpdate = !!character.characterId; //otherwise this is for creating!

        form.innerHTML = `
            <div class="form-group">
                <label>FIRST NAME:</label>
                <input type="text" id="characterFirstName" value="${characterFirstName || ''}" required>
            </div>
            <div class="form-group">
                <label>LAST NAME:</label>
                <input type="text" id="characterLastName" value="${characterLastName || ''}">
            </div>
            <div class="form-group">
                <label>USER ID:</label>
                <input type="text" id="userId" value="${character.userId || ''}" required>
            </div>
            <div class="form-group">
                <label>ACCOUNT NUMBER:</label>
                <input type="text" id="accountNumber" value="${character.accountNumber || ''}" required>
            </div>
            <div class="form-group">
                <label>ACCOUNT PASSWORD:</label>
                <input type="text" id="accountPassword" value="${character.accountPassword || ''}" required>
            </div>
            <div class="form-group">
                <label>SECURITY QUESTION:</label>
                <textarea type="text" id="securityQuestion">${character.securityQuestion || ''}</textarea>
            </div>
            <div class="form-group">
                <label>SECURITY ANSWER:</label>
                <input type="text" id="securityAnswer" value="${character.securityAnswer || ''}">
            </div>
            <div class="form-group">
                <label>STARTING BANK BALANCE:</label>
                <input type="number" id="startingGold" value="${character.startingGold || 0}" required>
            </div>
            ${isUpdate ? 
                `<div class="form-group">
                    <label>CURRENT BANK BALANCE:</label>
                    <input type="number" id="actualGold" value="${character.gold || 0}" required>
                </div>` : ''}
            <div class="form-group">
                <label>CAN ACCESS SECRET:</label>
                <input type="checkbox" id="canAccessSecret" ${character.canAccessSecret ? 'checked' : ''}>
            </div>
            <div class="form-actions">
                <button type="submit" class="btn">SAVE</button>
                <button type="button" class="btn" id="cancelCharacter">CANCEL</button>
            </div>
        `;

        form.onsubmit = async (e) => {
            e.preventDefault();
            const characterData = {
                name: document.getElementById('characterFirstName').value + ' ' + document.getElementById('characterLastName').value,
                userId: document.getElementById('userId').value,
                accountNumber: document.getElementById('accountNumber').value,
                accountPassword: document.getElementById('accountPassword').value,
                securityQuestion: document.getElementById('securityQuestion').value,
                securityAnswer: document.getElementById('securityAnswer').value,
                startingGold: parseInt(document.getElementById('startingGold').value),
                gold: parseInt(document.getElementById(isUpdate ? 'actualGold' : 'startingGold').value),
                // profileImage: , soon!
                // emblemImage: , soon!
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
                <label>ITEM ID:</label>
                <input type="number" id="itemNumber" value="${item.itemNumber || 0}" required>
            </div>
            <div class="form-group">
                <label>NAME:</label>
                <input type="text" id="itemName" value="${item.name || ''}" required>
            </div>
            <div class="form-group">
                <label>DESCRIPTION:</label>
                <textarea id="itemDescription">${item.description || ''}</textarea>
            </div>
            <div class="form-group">
                <label>QUANTITY IN SHOP:</label>
                <input type="number" id="itemQuantity" value="${item.quantity || 0}" required>
            </div>
            <div class="form-group">
                <label>PRICE:</label>
                <input type="number" id="itemPrice" value="${item.price || 0}" required>
            </div>
            <div class="form-group">
                <label>PREREQS:</label>
                <input type="text" id="itemPrereqs" value="${item.prereqs || ''}">
            </div>
            <div class="form-group">
                <label>IS SECRET ITEM:</label>
                <input type="checkbox" id="itemIsSecret" ${item.isSecret ? 'checked' : ''}>
            </div>
            <div class="form-actions">
                <button type="submit" class="btn">Save</button>
                <button type="button" class="btn" id="cancelItem">Cancel</button>
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
        this.adminMessageUnsubscribe = MessageService.onUnprocessedAdminMessagesSnapshot(this.currentGame.gameId, async (messages) => {
            // process the last message (oldest) - the listener will update as messages get processed.
            if (messages && messages.length > 0) {
                const message = messages[messages.length - 1];
                await this.processAdminMessage(message);
            }
        });
    }

    async processAdminMessage(message) {
        console.log(message);
        await message.markAsProcessed();
        const gameId = this.currentGame.gameId;
        const player = this.players.find(player => { return player.playerId === message.playerId});
        if(!player) throw 'No player found, treating it as an invalid message.';
        
        const playerId = player.playerId;

        if (message.messageType === MessageType.LOGIN_ATTEMPT) {
            const { accountNumber, accountPassword } = message.messageDetails;

            const character = this.characters.find(c => 
                c.accountNumber === accountNumber && 
                c.accountPassword === accountPassword
            );

            if (character) {
                await AdminHandlerService.handlePlayerLogIn(gameId, playerId, character.characterId, true);
            }
            this.players = await GameService.getGamePlayers(gameId);
        } else if (message.messageType === MessageType.LOGOUT_ATTEMPT) {
            const { characterId } = message.messageDetails;

            if (characterId) {
                await AdminHandlerService.handlePlayerLogOut(gameId, playerId, characterId, true);
            }
            this.players = await GameService.getGamePlayers(gameId);
        } else if (message.messageType === MessageType.PURCHASE_ATTEMPT) {
            const { characterId, cart } = message.messageDetails;
            const character = this.characters.find(character => { return character.characterId === characterId });
            
            const { approved, rejectionReason, approvedItems, totalPrice } = await AdminHandlerService.checkPlayerCartPurchaseRequirements(gameId, player, character, cart, this.items);
            
            await AdminHandlerService.handlePlayerCartPurchaseRequest(gameId, playerId, characterId, approvedItems, totalPrice, approved, rejectionReason);
        } else if (message.messageType === MessageType.WITHDRAW_ATTEMPT) {
            const { characterId, amount } = message.messageDetails;
            const character = this.characters.find(character => { return character.characterId === characterId });

            const { approved, rejectionReason, isDeposit, approvedAmount = amount } = await AdminHandlerService.checkGoldActionRequirements(gameId, player, character, false, amount);

            await AdminHandlerService.handlePlayerGoldActionRequest(gameId, playerId, characterId, approvedAmount, isDeposit, approved, rejectionReason);
            

        } else if (message.messageType === MessageType.DEPOSIT_ATTEMPT) {
            const { characterId, amount } = message.messageDetails;
            const character = this.characters.find(character => { return character.characterId === characterId });

            const { approved, rejectionReason, isDeposit, approvedAmount = amount } = await AdminHandlerService.checkGoldActionRequirements(gameId, player, character, true, amount);

            await AdminHandlerService.handlePlayerGoldActionRequest(gameId, playerId, characterId, approvedAmount, isDeposit, approved, rejectionReason);
        }
        
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
    }
}

export default new AdminPage();