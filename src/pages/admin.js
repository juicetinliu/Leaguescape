import AuthService from '../js/services/auth.js';
import GameService from '../js/services/game.js';
import { router } from '../js/utils/router.js';

class AdminPage {
    constructor() {
        this.currentGame = null;
        this.activeTab = 'profiles';
    }

    async show() {
        const gameId = new URLSearchParams(window.location.search).get('gameId');
        if (!gameId) {
            router.navigate('user');
            return;
        }

        this.currentGame = await GameService.getGame(gameId);
        if (!this.currentGame || await !GameService.isAdmin(gameId, AuthService.currentUser.authId)) {
            router.navigate('user');
            return;
        }

        this.initializeUI();
        this.attachEventListeners();
        this.loadLobby();
        this.loadActiveTab();
    }

    initializeUI() {
        const template = `
            <div class="container">
                <header class="header">
                    <div class="nav">
                        <div>
                            <h1>Game Admin: ${this.currentGame.gameId}</h1>
                            ${this.getGameStateButton()}
                        </div>
                        <div>
                            ${this.currentGame.gameState === 'running' ? '<button id="showActivity" class="btn">View Activity</button>' : ''}
                            <button id="exitGame" class="btn">Exit Game</button>
                        </div>
                    </div>
                    ${this.currentGame.gameState === 'running' ? '<div id="gameTimer"></div>' : ''}
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
                        <button class="tab-btn active" data-tab="profiles">Profiles</button>
                        <button class="tab-btn" data-tab="items">Items</button>
                        <button class="tab-btn" data-tab="bank">Bank</button>
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
            case 'setup':
                return '<button id="startGame" class="btn">Start Game</button>';
            case 'running':
                return '<button id="endGame" class="btn">End Game</button>';
            default:
                return '';
        }
    }

    attachEventListeners() {
        // Game state buttons
        document.getElementById('exitGame').addEventListener('click', () => {
            router.navigate('user');
        });

        const startGameBtn = document.getElementById('startGame');
        if (startGameBtn) {
            startGameBtn.addEventListener('click', () => this.updateGameState('running'));
        }

        const endGameBtn = document.getElementById('endGame');
        if (endGameBtn) {
            endGameBtn.addEventListener('click', () => this.updateGameState('end'));
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
    }

    async loadLobby() {
        const lobbyContent = document.getElementById('lobbyContent');
        const players = await GameService.getGamePlayers(this.currentGame.gameId);
        
        const playersHtml = players.map(player => `
            <div class="player-item">
                <span>${player.playerName || 'Unnamed Player'}</span>
                ${this.currentGame.gameState === 'setup' ? `
                    <button class="btn kick-player" data-player-id="${player.playerId}">Kick</button>
                    <button class="btn ban-player" data-player-id="${player.playerId}">Ban</button>
                ` : ''}
            </div>
        `).join('');

        lobbyContent.innerHTML = playersHtml || '<p>No players in lobby</p>';

        // Add event listeners for kick and ban buttons
        if (this.currentGame.gameState === 'setup') {
            document.querySelectorAll('.kick-player').forEach(button => {
                button.addEventListener('click', () => this.kickPlayer(button.dataset.playerId));
            });
            
            document.querySelectorAll('.ban-player').forEach(button => {
                button.addEventListener('click', () => this.banPlayer(button.dataset.playerId));
            });
        }
    }

    async loadActiveTab() {
        const content = document.getElementById('tabContent');
        switch (this.activeTab) {
            case 'profiles':
                await this.loadProfiles(content);
                break;
            case 'items':
                await this.loadItems(content);
                break;
            case 'bank':
                await this.loadBank(content);
                break;
        }
    }

    async loadItems(container) {
        const items = await GameService.getGameItems(this.currentGame.gameId);
        
        const grid = document.createElement('div');
        grid.className = 'items-grid';
        
        items.forEach(item => {
            const card = document.createElement('div');
            card.className = 'item-card';
            card.innerHTML = `
                <div class="item-info">
                    <h3>${item.name}</h3>
                    <p>Price: ${item.price} gold</p>
                    <p>Quantity: ${item.quantity}</p>
                </div>
                ${this.currentGame.gameState !== 'end' ? `
                    <div class="item-actions">
                        <button class="btn edit-item" data-id="${item.itemId}">Edit</button>
                        <button class="btn delete-item" data-id="${item.itemId}">Delete</button>
                    </div>
                ` : ''}
            `;
            
            if (this.currentGame.gameState !== 'end') {
                const editBtn = card.querySelector('.edit-item');
                const deleteBtn = card.querySelector('.delete-item');
                
                editBtn.addEventListener('click', () => this.editItem(item));
                deleteBtn.addEventListener('click', () => this.deleteItem(item.itemId));
            }
            
            grid.appendChild(card);
        });

        if (this.currentGame.gameState !== 'end') {
            const addCard = document.createElement('div');
            addCard.className = 'item-card add-item';
            addCard.innerHTML = `<button id="addItem" class="btn">Add Item</button>`;
            addCard.querySelector('#addItem').addEventListener('click', () => this.showItemModal());
            grid.appendChild(addCard);
        }

        container.innerHTML = '';
        container.appendChild(grid);
    }

    async loadProfiles(container) {
        const characters = await GameService.getGameCharacters(this.currentGame.gameId);
        
        const grid = document.createElement('div');
        grid.className = 'profile-grid';
        
        characters.forEach(character => {
            const card = document.createElement('div');
            card.className = 'profile-card';
            card.innerHTML = `
                <img src="${character.profileImage || '/public/images/default-profile.png'}" class="profile-image">
                <div class="profile-info">
                    <h3>${character.name}</h3>
                    <p>Account: ${character.accountNumber}</p>
                </div>
                ${this.currentGame.gameState !== 'end' ? `
                    <div class="profile-actions">
                        <button class="btn edit-character" data-id="${character.characterId}">Edit</button>
                        <button class="btn delete-character" data-id="${character.characterId}">Delete</button>
                    </div>
                ` : ''}
            `;
            
            // Add event listeners
            if (this.currentGame.gameState !== 'end') {
                const editBtn = card.querySelector('.edit-character');
                const deleteBtn = card.querySelector('.delete-character');
                
                editBtn.addEventListener('click', () => this.editCharacter(character));
                deleteBtn.addEventListener('click', () => this.deleteCharacter(character.characterId));
            }
            
            grid.appendChild(card);
        });

        if (this.currentGame.gameState !== 'end') {
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
        if (!confirm(`Are you sure you want to ${newState === 'running' ? 'start' : 'end'} the game?`)) {
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
        
        form.innerHTML = `
            <div class="form-group">
                <label>Name</label>
                <input type="text" id="characterName" value="${character.name || ''}" required>
            </div>
            <div class="form-group">
                <label>Account Number</label>
                <input type="text" id="accountNumber" value="${character.accountNumber || ''}" required>
            </div>
            <div class="form-group">
                <label>Account Password</label>
                <input type="text" id="accountPassword" value="${character.accountPassword || ''}" required>
            </div>
            <div class="form-group">
                <label>Starting Gold</label>
                <input type="number" id="startingGold" value="${character.startingGold || 0}" required>
            </div>
            <div class="form-actions">
                <button type="submit" class="btn">Save</button>
                <button type="button" class="btn" id="cancelCharacter">Cancel</button>
            </div>
        `;

        form.onsubmit = async (e) => {
            e.preventDefault();
            const updatedCharacter = {
                name: document.getElementById('characterName').value,
                accountNumber: document.getElementById('accountNumber').value,
                accountPassword: document.getElementById('accountPassword').value,
                startingGold: parseInt(document.getElementById('startingGold').value),
                gold: parseInt(document.getElementById('startingGold').value)
            };

            if (character.characterId) {
                await GameService.updateCharacter(this.currentGame.gameId, character.characterId, updatedCharacter);
            } else {
                await GameService.createCharacter(this.currentGame.gameId, updatedCharacter);
            }

            characterModal.style.display = 'none';
            this.loadProfiles(document.getElementById('tabContent'));
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
                <label>Name</label>
                <input type="text" id="itemName" value="${item.name || ''}" required>
            </div>
            <div class="form-group">
                <label>Description</label>
                <textarea id="itemDescription">${item.description || ''}</textarea>
            </div>
            <div class="form-group">
                <label>Price</label>
                <input type="number" id="itemPrice" value="${item.price || 0}" required>
            </div>
            <div class="form-group">
                <label>Quantity</label>
                <input type="number" id="itemQuantity" value="${item.quantity || 0}" required>
            </div>
            <div class="form-actions">
                <button type="submit" class="btn">Save</button>
                <button type="button" class="btn" id="cancelItem">Cancel</button>
            </div>
        `;

        form.onsubmit = async (e) => {
            e.preventDefault();
            const updatedItem = {
                name: document.getElementById('itemName').value,
                description: document.getElementById('itemDescription').value,
                price: parseInt(document.getElementById('itemPrice').value),
                quantity: parseInt(document.getElementById('itemQuantity').value)
            };

            if (item.itemId) {
                await GameService.updateItem(this.currentGame.gameId, item.itemId, updatedItem);
            } else {
                await GameService.createItem(this.currentGame.gameId, updatedItem);
            }

            itemModal.style.display = 'none';
            this.loadItems(document.getElementById('tabContent'));
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
            this.loadProfiles(document.getElementById('tabContent'));
        }
    }

    async deleteItem(itemId) {
        if (confirm('Are you sure you want to delete this item?')) {
            await GameService.deleteItem(this.currentGame.gameId, itemId);
            this.loadItems(document.getElementById('tabContent'));
        }
    }

    async kickPlayer(playerId) {
        if (confirm('Are you sure you want to kick this player?')) {
            await GameService.kickPlayer(this.currentGame.gameId, playerId);
            await this.loadLobby();
        }
    }

    async banPlayer(playerId) {
        if (confirm('Are you sure you want to ban this player?')) {
            await GameService.banPlayer(this.currentGame.gameId, playerId);
            await this.loadLobby();
        }
    }
}

export default new AdminPage();