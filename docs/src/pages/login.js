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
        this.gameTimerInterval = null;
    }

    async show() {
        super.show();
        this.currentGame = await gameRouter.handlePlayerGamePageShow(this.page);
        if (!this.currentGame) {
            return;
        }

        this.initializeUI();
        this.attachEventListeners();
        this.startGameTimer();
    }

    initializeUI() {
        const template = `
            <div id="${this.page}" class="page-container">
                <div class="login-header-wrapper">
                    <div class="wrapper"></div>
                    <div class="game-timer-wrapper wrapper">
                        <div id="gameTimer"></div>
                    </div>
                    <div class="back-button-wrapper wrapper">
                        <button id="backToUser" class="login-exit-button text-button">EXIT</button>
                    </div>
                </div>

                <div class="login-wrapper">
                    <div class="login-card">
                        <div class="login-emblem">
                            <img src="public/images/login.png">
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
                } else {
                    if (gameData.gameDuration != this.currentGame.gameDuration) {
                        this.currentGame.gameDuration = gameData.gameDuration;
                        this.startGameTimer();
                    }
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

    startGameTimer() {
        if (this.gameTimerInterval) {
            clearInterval(this.gameTimerInterval);
            this.gameTimerInterval = null;
        }

        const timerEl = document.getElementById('gameTimer');
        if (!timerEl) return;

        let startTime = this.currentGame.startTime;
        let startDate = null;
        try {
            startDate = startTime && startTime.toDate ? startTime.toDate() : new Date(startTime);
        } catch (e) {
            startDate = new Date();
        }

        const durationMs = this.currentGame.gameDuration;

        const tick = () => {
            const now = new Date();
            const elapsed = now - startDate;
            const remaining = durationMs - elapsed;

            if (remaining <= 0) {
                timerEl.textContent = '00:00:00';
                clearInterval(this.gameTimerInterval);
                this.gameTimerInterval = null;
                // reload to pick up final state
                // window.location.reload(); // Not necessary - the admin page will change the game state!
                return;
            }

            const hrs = Math.floor(remaining / (1000 * 60 * 60));
            const mins = Math.floor((remaining % (1000 * 60 * 60)) / (1000 * 60));
            const secs = Math.floor((remaining % (1000 * 60)) / 1000);
            const pad = (n) => String(n).padStart(2, '0');
            timerEl.textContent = `${pad(hrs)}:${pad(mins)}:${pad(secs)}`;
        }

        tick();
        this.gameTimerInterval = setInterval(tick, 1000);
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
        if (this.gameTimerInterval) {
            clearInterval(this.gameTimerInterval);
            this.gameTimerInterval = null;
        }
    }
}

export default new LoginPage();