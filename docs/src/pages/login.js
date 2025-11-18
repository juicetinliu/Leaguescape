import Page from '../js/models/Page.js';
import AuthService from '../js/services/auth.js';
import GameService from '../js/services/game.js';
import MessageService from '../js/services/message.js';
import { MessageType } from '../js/models/MessageTypes.js';
import { router } from '../js/utils/router.js';
import { PAGES, GAME_STATE } from '../js/models/Enums.js';
import { gameRouter } from '../js/utils/gamerouter.js';
import PlayerHandlerService from '../js/services/handlers/playerHandler.js';
import { spinner } from '../js/components/staticComponents.js';

class LoginPage extends Page {
    constructor() {
        super(PAGES.login);
        this.currentGame = null;
        this.isLoading = false;
        
        this.gameUnsubscribe = null;
        this.playerMessageUnsubscribe = null;
    }

    async show() {
        super.show();
        this.currentGame = await gameRouter.handlePlayerGamePageShow(this.page);
        if (!this.currentGame) {
            return;
        }

        this.initializeUI();
        this.attachEventListeners();
    }

    initializeUI() {
        const template = `
            <div id="${this.page}" class="page-container">
                <div class="login-header-wrapper">
                    <button id="backToUser" class="login-exit-button text-button">EXIT</button>
                </div>

                <div class="login-wrapper">
                    <div class="login-card">
                        <div class="login-emblem">
                            <img src="">
                        </div>
                        <form id="loginForm" class="login-form-wrapper">
                            <div class="login-text-input-wrapper">
                                <label class="text-form-label" for="accountNumber">ACCOUNT NUMBER</label>
                                <input type="text" id="accountNumber" class="text-form-input" required>
                            </div>
                            <div class="login-text-input-wrapper">
                                <label class="text-form-label" for="accountPassword">PASSWORD</label>
                                <input type="password" id="accountPassword" class="text-form-input" required>
                            </div>
                            <div id="login-error-text" class="login-error-message-placeholder error-text"></div>
                            <div class="form-submit-wrapper">
                                <button id="login-submit-button" type="submit" class="text-button">LOGIN</button>
                                <div id="login-loading-wrapper" class="hidden">
                                    ${spinner}
                                </div>
                            </div>
                        </form>
                    </div>
                </div>
            </div>
        `;
        
        document.querySelector('#app').innerHTML = template;
    }

    attachEventListeners() {
        document.getElementById('backToUser').addEventListener('click', () => {
            router.navigate(`${PAGES.user}&gameId=${this.currentGame.gameId}`);
        });

        document.getElementById('loginForm').addEventListener('submit', async (e) => {
            e.preventDefault();
            if(this.isLoading) return;

            const accountNumber = document.getElementById('accountNumber').value;
            const accountPassword = document.getElementById('accountPassword').value;

            this.toggleLoading(true);
            this.toggleError(false);

            try {
                await PlayerHandlerService.logIn(this.currentGame.gameId, accountNumber, accountPassword);
            } catch (error) {
                console.error('Login error:', error);
                alert('An error occurred during login');
                this.toggleLoading(false);
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
            // process the last message (oldest) - the listener will update as messages get processed.
            if (messages && messages.length > 0) {
                const message = messages[messages.length - 1];
                await this.processPlayerMessage(message);
            }
        });
    }

    async processPlayerMessage(message) {
        console.log(message);
        await message.markAsProcessed();
        if (message.messageType === MessageType.LOGIN_SUCCESS) {
            const { characterId } = message.messageDetails;
            
            router.navigate(`${PAGES.character}&gameId=${this.currentGame.gameId}&characterId=${characterId}`);
        } else if(message.messageType === MessageType.LOGIN_FAILURE) {
            const { rejectionReason } = message.messageDetails;
            this.toggleLoading(false);
            this.toggleError(true, rejectionReason);
        }
    }

    toggleError(hasError, errorMessage) {
        const errorWrapper = document.getElementById('login-error-text');
        if(hasError) {
            if(errorMessage) {
                errorWrapper.innerHTML = errorMessage;
            } else {
                errorWrapper.innerHTML = 'Something went wrong'
            }
        } else {
            errorWrapper.innerHTML = '';
        }
    }

    toggleLoading(isLoading) {
        this.isLoading = isLoading;
        const submitButton = document.getElementById('login-submit-button');
        const spinnerWrapper = document.getElementById('login-loading-wrapper');

        if (isLoading) {
            submitButton.classList.add('hidden');
            spinnerWrapper.classList.remove('hidden');
        } else {
            submitButton.classList.remove('hidden');
            spinnerWrapper.classList.add('hidden');
        }
    }

    cleanup() {
        super.cleanup();
        this.isLoading = false;

        if (this.gameUnsubscribe) {
            this.gameUnsubscribe();
        }
        if (this.playerMessageUnsubscribe) {
            this.playerMessageUnsubscribe();
        }
    }
}

export default new LoginPage();