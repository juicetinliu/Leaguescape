import Page from '../js/models/Page.js';
import AuthService from '../js/services/auth.js';
import GameService from '../js/services/game.js';
import MessageService from '../js/services/message.js';
import { MessageType } from '../js/models/MessageTypes.js';
import { router } from '../js/utils/router.js';
import { msToHms } from '../js/utils/timeUtils.js';
import { PAGES, GAME_STATE } from '../js/models/Enums.js';
import { gameRouter } from '../js/utils/gamerouter.js';
import { spinner } from '../js/components/staticComponents.js';

class TimerPage extends Page {
    constructor() {
        super(PAGES.timer);
        this.currentGame = null;
        this.isLoading = false;
        
        this.gameUnsubscribe = null;
        this.gameTimerInterval = null;
    }

    async show() {
        super.show();
        this.currentGame = await gameRouter.handlePlayerGamePageShow(this.page, true); //skip admin check - admins can also access this page!
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
                <div class="timer-header-wrapper">
                    <div class="wrapper"></div>
                    <div class="wrapper"></div>
                    <div class="back-button-wrapper wrapper">
                        <button id="backToLobby" class="timer-exit-button text-button">EXIT</button>
                    </div>
                </div>
                <div class="game-timer-wrapper wrapper">
                    <div id="gameTimer"></div>
                    <img src="public/gifs/countdown.gif">
                </div>
            </div>
        `;
        
        document.querySelector('#app').innerHTML = template;
    }

    attachEventListeners() {
        document.getElementById('backToLobby').addEventListener('click', () => {
            // Go back to lobby. Let the lobby page handle redirection (admin/player).
            router.navigate(`${PAGES.lobby}&gameId=${this.currentGame.gameId}`);
        });

        if(this.currentGame.gameId) {
            this.gameUnsubscribe = GameService.onGameSnapshot(this.currentGame.gameId, async (gameData) => {
                if (gameData.gameState === GAME_STATE.END) {
                    window.location.reload();
                } else {
                    // No need to refresh the timer unless duration or state changed
                    if (gameData.gameDuration != this.currentGame.gameDuration || gameData.gameState !== this.currentGame.gameState) {
                        this.currentGame = gameData;
                        this.startGameTimer();
                    }
                }
                this.currentGame = gameData;
            });
        }
    }

    //TODO: dedupe with admin timer into component!
    startGameTimer() {
        if (this.gameTimerInterval) {
            clearInterval(this.gameTimerInterval);
            this.gameTimerInterval = null;
        }

        const timerEl = document.getElementById('gameTimer');
        if (!timerEl) return;

        let startTime = this.currentGame.startTime;
        const gameState = this.currentGame.gameState;
        let startDate = null;
        try {
            if (startTime && startTime.toDate && gameState === GAME_STATE.RUNNING) startDate = startTime.toDate();
        } catch (e) {

        }

        const durationMs = this.currentGame.gameDuration;

        const tick = () => {
            const now = new Date();
            const elapsed = startDate ? now - startDate : 0;
            const remaining = durationMs - elapsed;

            if (remaining <= 0) {
                timerEl.textContent = msToHms(0);
                clearInterval(this.gameTimerInterval);
                this.gameTimerInterval = null;
                // reload to pick up final state
                // window.location.reload(); // Not necessary - the admin page will change the game state!
                return;
            }
            
            // format remaining as HH:MM:SS
            timerEl.textContent = msToHms(remaining);
        }
        
        
        tick();
        if(gameState === GAME_STATE.RUNNING) {
            this.gameTimerInterval = setInterval(tick, 1000);
        }
    }

    cleanup() {
        super.cleanup();

        if (this.gameUnsubscribe) {
            this.gameUnsubscribe();
        }
        if (this.gameTimerInterval) {
            clearInterval(this.gameTimerInterval);
            this.gameTimerInterval = null;
        }
    }
}

export default new TimerPage();