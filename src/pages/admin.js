import AuthService from '../js/services/auth.js';
import GameService from '../js/services/game.js';
import { auth } from '../js/config/firebase.js';
import { router } from '../js/utils/router.js';

class AdminPage {
    constructor() {
        this.currentGame = null;
        this.selectedCharacterId = null;
        this.activeTab = 'profiles';
    }

    async show() {
        const gameId = new URLSearchParams(window.location.search).get('gameId');
        if (!gameId) {
            router.navigate('/user');
            return;
        }

        this.currentGame = await GameService.getGame(gameId);
        if (!this.currentGame || this.currentGame.adminId !== auth.currentUser.uid) {
            router.navigate('/user');
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
            router.navigate('/user');
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
                <span>${player.username}</span>
                ${this.currentGame.gameState === 'setup' ? `
                    <button class="btn" onclick="kickPlayer('${player.playerId}')">Kick</button>
                    <button class="btn" onclick="banPlayer('${player.playerId}')">Ban</button>
                ` : ''}
            </div>
        `).join('');

        lobbyContent.innerHTML = playersHtml || '<p>No players in lobby</p>';
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
                        <button class="btn" onclick="editCharacter('${character.characterId}')">Edit</button>
                        <button class="btn" onclick="deleteCharacter('${character.characterId}')">Delete</button>
                    </div>
                ` : ''}
            `;
            grid.appendChild(card);
        });

        if (this.currentGame.gameState !== 'end') {
            const addCard = document.createElement('div');
            addCard.className = 'profile-card add-profile';
            addCard.innerHTML = `
                <button class="btn" onclick="addCharacter()">Add Profile</button>
            `;
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

    kickPlayer(playerId) {
        if (confirm('Are you sure you want to kick this player?')) {
            GameService.kickPlayer(this.currentGame.gameId, playerId);
            this.loadLobby();
        }
    }

    banPlayer(playerId) {
        if (confirm('Are you sure you want to ban this player?')) {
            GameService.banPlayer(this.currentGame.gameId, playerId);
            this.loadLobby();
        }
    }
}

export default new AdminPage();