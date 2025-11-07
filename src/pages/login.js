import Page from '../js/models/Page.js';
import AuthService from '../js/services/auth.js';
import GameService from '../js/services/game.js';
import MessageService from '../js/services/message.js';
import { MessageTo, MessageType } from '../js/models/MessageTypes.js';
import { router } from '../js/utils/router.js';
import { PAGES, GAME_STATE } from '../js/models/Enums.js';
import { gameRouter } from '../js/utils/gamerouter.js';

class LoginPage extends Page {
    constructor() {
        super(PAGES.login);
        this.currentGame = null;
        
        this.gameUnsubscribe = null;
        this.playerMessageUnsubscribe = null;
    }

    async show() {
        this.gameUnsubscribe = null;
        this.playerMessageUnsubscribe = null;
        
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
            router.navigate(`${PAGES.lobby}&gameId=${this.currentGame.gameId}`);
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
                if (gameData.gameState !== GAME_STATE.RUNNING) {
                    window.location.reload();
                }
            });
            this.setupPlayerMessageUnsubscribe();
        }
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
            
            router.navigate(`${PAGES.character}&gameId=${this.currentGame.gameId}&characterId=${characterId}`);
            
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