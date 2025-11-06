import Page from '../js/models/Page.js';
import AuthService from '../js/services/auth.js';
import GameService from '../js/services/game.js';
import { router } from '../js/utils/router.js';
import { db } from '../js/config/firebase.js';
import { collection, query, where, orderBy, onSnapshot } from 'https://www.gstatic.com/firebasejs/12.4.0/firebase-firestore.js';
import Message from '../js/models/Message.js';
import { MessageTo, MessageType } from '../js/models/MessageTypes.js';

class LobbyPage extends Page {
    constructor() {
        super();
        this.currentGame = null;
        // this.updateInterval = null; // Not necessary as onSnapshot will handle updates
        this.gamePlayersUnsubscribe = null;
        this.gameUnsubscribe = null;
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

        const userId = AuthService.currentUser.authId;
        if (!(await GameService.isPlayer(gameId, userId))) {
            router.navigate('user');
            return;
        }

        if (await GameService.isAdmin(gameId, userId)) {
            router.navigate(`admin&gameId=${gameId}`);
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
        // this.startUpdates();  // Not necessary as onSnapshot will handle updates
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
                router.navigate('user');
            }
        });

        document.getElementById('updateUsername').addEventListener('click', async () => {
            const newUsername = document.getElementById('username').value.trim();
            if (newUsername) {
                await GameService.updatePlayerName(this.currentGame.gameId, AuthService.currentUser.authId, newUsername);
                // this.updatePlayersList();  // Not necessary as onSnapshot will handle updates
            }
        });
        
        if(this.currentGame.gameId) {
            this.gamePlayersUnsubscribe = GameService.onGamePlayersSnapshot(this.currentGame.gameId, async (gameLobbyData) => {
                await this.updatePlayersList(gameLobbyData);
            }, false);

            this.gameUnsubscribe = GameService.onGameSnapshot(this.currentGame.gameId, async (gameData) => {
                if (gameData.gameState !== 'setup') {
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

    // startUpdates() {
    //     // Update player list every 5 seconds
    //     this.updatePlayersList();

    //     //TODO: This should be handled via real-time listeners instead of polling
    //     this.updateInterval = setInterval(async () => {
    //         await this.checkGameState();
    //         this.updatePlayersList();
    //     }, 5000);
    // } // Not necessary as onSnapshot will handle updates

    // async checkGameState() {
    //     const game = await GameService.getGame(this.currentGame.gameId);
    //     if (game.gameState !== 'setup') {
    //         window.location.reload();
    //     }
    // }  // Not necessary as onSnapshot will handle updates

    cleanup() {
        // if (this.updateInterval) {
        //     clearInterval(this.updateInterval);
        // }  // Not necessary as onSnapshot will handle updates
        if (this.gamePlayersUnsubscribe) {
            this.gamePlayersUnsubscribe();
        }
        if (this.gameUnsubscribe) {
            this.gameUnsubscribe();
        }
    }
}

export default new LobbyPage();