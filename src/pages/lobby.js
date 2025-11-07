import Page from '../js/models/Page.js';
import AuthService from '../js/services/auth.js';
import GameService from '../js/services/game.js';
import { router } from '../js/utils/router.js';
import { GAME_STATE, PAGES } from '../js/models/Enums.js';
import { gameRouter } from '../js/utils/gamerouter.js';

class LobbyPage extends Page {
    constructor() {
        super(PAGES.lobby);
        this.currentGame = null;

        this.gamePlayersUnsubscribe = null;
        this.gameUnsubscribe = null;
    }

    async show() {
        this.currentGame = await gameRouter.handlePlayerGamePageShow(this.page);
        if (!this.currentGame) {
            return;
        }

        this.initializeUI();
        this.attachEventListeners();
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
                router.navigate(PAGES.user);
            }
        });

        document.getElementById('updateUsername').addEventListener('click', async () => {
            const newUsername = document.getElementById('username').value.trim();
            if (newUsername) {
                await GameService.updatePlayerName(this.currentGame.gameId, AuthService.currentUser.authId, newUsername);
            }
        });
        
        if(this.currentGame.gameId) {
            this.gamePlayersUnsubscribe = GameService.onGamePlayersSnapshot(this.currentGame.gameId, async (gameLobbyData) => {
                await this.updatePlayersList(gameLobbyData);
            }, false);

            this.gameUnsubscribe = GameService.onGameSnapshot(this.currentGame.gameId, async (gameData) => {
                if (gameData.gameState !== GAME_STATE.SETUP) {
                    window.location.reload();
                }
            });
        }
    }

    async updatePlayersList(gamePlayers) {
        const players = gamePlayers ? gamePlayers : await GameService.getGamePlayers(this.currentGame.gameId);
        const list = document.getElementById('playersList');
        
        list.innerHTML = players.map(player => `
            <div class="player-item">
                <span class="player-name">${player.playerName || 'Unnamed Player'}</span>
                ${player.playerId === AuthService.currentUser.authId ? ' (You)' : ''}
            </div>
        `).join('');
    }

    cleanup() {
        if (this.gamePlayersUnsubscribe) {
            this.gamePlayersUnsubscribe();
        }
        if (this.gameUnsubscribe) {
            this.gameUnsubscribe();
        }
    }
}

export default new LobbyPage();