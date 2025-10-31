import AuthService from '../js/services/auth.js';
import GameService from '../js/services/game.js';
import { router } from '../js/utils/router.js';

class LobbyPage {
    constructor() {
        this.currentGame = null;
        this.updateInterval = null;
    }

    async show() {
        const gameId = new URLSearchParams(window.location.search).get('gameId');
        if (!gameId) {
            router.navigate('user');
            return;
        }

        this.currentGame = await GameService.getGame(gameId);
        if (!this.currentGame) {
            router.navigate('user');
            return;
        }

        if (!(await GameService.isPlayer(gameId, AuthService.currentUser.authId))) {
            router.navigate('user');
            return;
        }

        // Redirect based on game state
        switch (this.currentGame.gameState) {
            case 'running':
                router.navigate(`login&gameId=${gameId}`);
                return;
            case 'end':
                router.navigate(`credits&gameId=${gameId}`);
                return;
        }

        this.initializeUI();
        this.attachEventListeners();
        this.startUpdates();
    }

    initializeUI() {
        const template = `
            <div class="container">
                <header class="header">
                    <div class="nav">
                        <h1>Game Lobby</h1>
                        <button id="leaveGame" class="btn">Leave Game</button>
                    </div>
                </header>

                <div class="card">
                    <h2>Game Info</h2>
                    <p>Game ID: ${this.currentGame.gameId}</p>
                    <p>Status: Waiting to start...</p>
                </div>

                <div class="card">
                    <h2>Players</h2>
                    <div id="playersList"></div>
                </div>

                <div class="card">
                    <h2>Your Profile</h2>
                    <div class="form-group">
                        <label for="username">Display Name</label>
                        <input type="text" id="username" class="form-input" value="${AuthService.currentUser.username}">
                        <button id="updateUsername" class="btn">Update Name</button>
                    </div>
                </div>
            </div>
        `;
        
        document.querySelector('#app').innerHTML = template;
    }

    attachEventListeners() {
        document.getElementById('leaveGame').addEventListener('click', async () => {
            if (confirm('Are you sure you want to leave the game?')) {
                await GameService.leaveGame(this.currentGame.gameId, AuthService.currentUser.authId);
                router.navigate('user');
            }
        });

        document.getElementById('updateUsername').addEventListener('click', async () => {
            const newUsername = document.getElementById('username').value.trim();
            if (newUsername && newUsername !== AuthService.currentUser.username) {
                await AuthService.currentUser.updateUsername(newUsername);
                this.updatePlayersList();
            }
        });
    }

    async updatePlayersList() {
        const players = await GameService.getGamePlayers(this.currentGame.gameId);
        const list = document.getElementById('playersList');
        
        list.innerHTML = players.map(player => `
            <div class="player-item">
                <span class="player-name">${player.username}</span>
                ${player.authId === AuthService.currentUser.authId ? ' (You)' : ''}
            </div>
        `).join('');
    }

    startUpdates() {
        // Update player list every 5 seconds
        this.updatePlayersList();

        //TODO: This should be handled via real-time listeners instead of polling
        this.updateInterval = setInterval(() => {
            this.checkGameState();
            this.updatePlayersList();
        }, 5000);
    }

    async checkGameState() {
        const game = await GameService.getGame(this.currentGame.gameId);
        if (game.gameState !== 'setup') {
            window.location.reload();
        }
    }

    cleanup() {
        if (this.updateInterval) {
            clearInterval(this.updateInterval);
        }
    }
}

export default new LobbyPage();