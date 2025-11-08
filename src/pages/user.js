import Page from '../js/models/Page.js';
import AuthService from '../js/services/auth.js';
import GameService from '../js/services/game.js';
import { router } from '../js/utils/router.js';
import { PAGES, GAME_STATE } from '../js/models/Enums.js';

class UserPage extends Page {
    constructor() {
        super(PAGES.user);
    }

    show() {
        super.show();
        this.initializeUI();
        this.loadUsername();
        this.loadUserGames();
        this.attachEventListeners();
    }

    initializeUI() {
        const template = `
            <div id="${this.page}" class="page-container">
                <header class="header">
                    <div class="nav">
                        <div>
                            <span>Welcome, <span id="username">Loading...</span></span>
                            <button id="editUsername" class="btn">Edit Name</button>
                        </div>
                        <button id="logout" class="btn">Logout</button>
                    </div>
                </header>

                <div class="card">
                    <h2>Game Actions</h2>
                    <div class="form-group">
                        <button id="createGame" class="btn">Create New Game</button>
                    </div>
                    <div class="form-group">
                        <button id="joinGame" class="btn">Join Existing Game</button>
                    </div>
                </div>

                <div class="card">
                    <h2>Your Games</h2>
                    <div id="gamesList">Loading...</div>
                </div>

                <!-- Join Game Modal -->
                <div id="joinGameModal" class="modal" style="display: none;">
                    <div class="modal-content">
                        <h2>Join Game</h2>
                        <div class="form-group">
                            <label for="gameId">Game ID</label>
                            <input type="text" id="gameId" class="form-input">
                        </div>
                        <div class="form-group">
                            <button id="submitJoin" class="btn">Join</button>
                            <button id="cancelJoin" class="btn">Cancel</button>
                        </div>
                    </div>
                </div>
            </div>
        `;
        
        document.querySelector('#app').innerHTML = template;
    }

    async loadUserGames() {
        try {
            const games = await GameService.getUserGames(AuthService.currentUser.authId);
            const gamesList = document.getElementById('gamesList');
            
            if (games.length === 0) {
                gamesList.innerHTML = '<p>No games found. Create or join a game to get started!</p>';
                return;
            }

            const gamesHtml = games.map(game => `
                <div class="card">
                    <h3>Game ${game.gameId}</h3>
                    <p>State: ${game.gameState}</p>
                    <p>Role: ${game.adminId === AuthService.currentUser.authId ? 'Admin' : 'Player'}</p>
                    <button class="btn enter-game" data-game-id="${game.gameId}">Enter Game</button>
                </div>
            `).join('');

            gamesList.innerHTML = gamesHtml;
            
            // Add event listeners to enter game buttons
            document.querySelectorAll('.enter-game').forEach(button => {
                button.addEventListener('click', () => this.enterGame(button.dataset.gameId));
            });
        } catch (error) {
            console.error('Error loading games:', error);
        }
    }

    async loadUsername() {
        const usernameElement = document.getElementById('username');
        if (AuthService.currentUser) {
            usernameElement.textContent = AuthService.currentUser.username;
        }
    }

    async showUsernameEditDialog() {
        const currentUsername = AuthService.currentUser.username;
        const newUsername = prompt('Enter new username:', currentUsername);
        
        if (newUsername && newUsername !== currentUsername) {
            try {
                await AuthService.currentUser.updateUsername(newUsername);
                document.getElementById('username').textContent = newUsername;
            } catch (error) {
                console.error('Error updating username:', error);
                alert('Failed to update username. Please try again.');
            }
        }
    }

    attachEventListeners() {
        document.getElementById('logout').addEventListener('click', async () => {
            await AuthService.signOut();
            router.navigate(PAGES.index);
        });

        document.getElementById('editUsername').addEventListener('click', () => {
            this.showUsernameEditDialog();
        });

        document.getElementById('createGame').addEventListener('click', async () => {
            try {
                const game = await GameService.createGame(AuthService.currentUser.authId);
                router.navigate(`${PAGES.admin}&gameId=${game.gameId}`);
            } catch (error) {
                console.error('Error creating game:', error);
            }
        });

        document.getElementById('joinGame').addEventListener('click', () => {
            document.getElementById('joinGameModal').style.display = 'flex';
        });

        document.getElementById('cancelJoin').addEventListener('click', () => {
            document.getElementById('joinGameModal').style.display = 'none';
        });

        document.getElementById('submitJoin').addEventListener('click', async () => {
            const gameId = document.getElementById('gameId').value;

            try {
                await GameService.joinGame(gameId, AuthService.currentUser.authId, AuthService.currentUser.username);
                router.navigate(`${PAGES.lobby}&gameId=${gameId}`);
            } catch (error) {
                console.error('Error joining game:', error);
            }
        });
    }

    async enterGame(gameId) {
        const game = await GameService.getGame(gameId);
        if (!game) return;

        if (game.adminId === AuthService.currentUser.authId) {
            router.navigate(`${PAGES.admin}&gameId=${gameId}`);
        } else {
            switch (game.gameState) {
                case GAME_STATE.SETUP:
                    router.navigate(`${PAGES.lobby}&gameId=${gameId}`);
                    break;
                case GAME_STATE.RUNNING:
                    router.navigate(`${PAGES.login}&gameId=${gameId}`);
                    break;
                case GAME_STATE.END:
                    router.navigate(`${PAGES.credits}&gameId=${gameId}`);
                    break;
            }
        }
    }

    cleanup() {
        super.cleanup();
    }
}

export default new UserPage();