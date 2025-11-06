import Page from '../js/models/Page.js';
import AuthService from '../js/services/auth.js';
import GameService from '../js/services/game.js';
import MessageService from '../js/services/message.js';
import { MessageTo, MessageType } from '../js/models/MessageTypes.js';
import { router } from '../js/utils/router.js';
import ActionType from '../js/models/ActionType.js';

class LoginPage extends Page {
    constructor() {
        super();
        this.currentGame = null;
        
        this.gameUnsubscribe = null;
        this.playerMessageUnsubscribe = null;
    }

    async show() {
        this.gameUnsubscribe = null;
        this.playerMessageUnsubscribe = null;

        console.log('LoginPage show called', this);
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

        switch (this.currentGame.gameState) {
            case 'setup':
                router.navigate(`lobby&gameId=${gameId}`);
                return;
            case 'end':
                router.navigate(`credits&gameId=${gameId}`);
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
                        <h1>Character Login</h1>
                        <button id="backToLobby" class="btn">Back to Lobby</button>
                    </div>
                </header>

                <div class="card">
                    <form id="loginForm">
                        <div class="form-group">
                            <label for="accountNumber">Account Number</label>
                            <input type="text" id="accountNumber" class="form-input" required>
                        </div>
                        <div class="form-group">
                            <label for="accountPassword">Password</label>
                            <input type="password" id="accountPassword" class="form-input" required>
                        </div>
                        <button type="submit" class="btn">Login</button>
                    </form>
                </div>
            </div>
        `;
        
        document.querySelector('#app').innerHTML = template;
    }

    attachEventListeners() {
        document.getElementById('backToLobby').addEventListener('click', () => {
            router.navigate(`lobby&gameId=${this.currentGame.gameId}`);
        });

        document.getElementById('loginForm').addEventListener('submit', async (e) => {
            e.preventDefault();
            const accountNumber = document.getElementById('accountNumber').value;
            const accountPassword = document.getElementById('accountPassword').value;

            try {
                await GameService.attemptLogIn(this.currentGame.gameId, accountNumber, accountPassword);
            } catch (error) {
                console.error('Login error:', error);
                alert('An error occurred during login');
            }
        });
        
        if(this.currentGame.gameId) {
            this.gameUnsubscribe = GameService.onGameSnapshot(this.currentGame.gameId, async (gameData) => {
                if (gameData.gameState !== 'running') {
                    window.location.reload();
                }
            });
            this.setupPlayerMessageUnsubscribe();
        }
                console.log('LoginPage show called', this);

    }
    
    async setupPlayerMessageUnsubscribe() {
        this.playerMessageUnsubscribe = MessageService.onUnprocessedPlayerMessagesSnapshot(this.currentGame.gameId, async (messages) => {
            // process the last message - the listener will update as messages get processed.
            if (messages && messages.length > 0) {
                const message = messages[messages.length - 1];
                await this.processPlayerMessage(message);
            }
        });
    }

    async processPlayerMessage(message) {
        if (message.messageType === MessageType.LOGIN_SUCCESS) {
            const { characterId } = message.messageDetails;
            
            router.navigate(`character&gameId=${this.currentGame.gameId}&characterId=${characterId}`);
            
            await message.markAsProcessed();
        }
    }

    cleanup() {
        if (this.gameUnsubscribe) {
            this.gameUnsubscribe();
        }
        if (this.playerMessageUnsubscribe) {
            this.playerMessageUnsubscribe();
        }
    }
}

export default new LoginPage();