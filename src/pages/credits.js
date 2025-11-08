import Page from '../js/models/Page.js';
import AuthService from '../js/services/auth.js';
import GameService from '../js/services/game.js';
import { router } from '../js/utils/router.js';
import { GAME_STATE, PAGES } from '../js/models/Enums.js';
import { gameRouter } from '../js/utils/gamerouter.js';

class CreditsPage extends Page {
    constructor() {
        super(PAGES.credits);
        this.currentGame = null;

        this.gameUnsubscribe = null;
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
                <header class="header">
                    <div class="nav">
                        <h1>Game Over</h1>
                        <button id="backToUser" class="btn">Back to User Page</button>
                    </div>
                </header>

                <div class="card">
                    <h2>Thanks for Playing!</h2>
                    <p>Credits implementation coming soon...</p>
                </div>
            </div>
        `;
        
        document.querySelector('#app').innerHTML = template;
    }

    attachEventListeners() {
        document.getElementById('backToUser').addEventListener('click', () => {
            router.navigate(PAGES.user);
        });
                
        if(this.currentGame.gameId) {
            this.gameUnsubscribe = GameService.onGameSnapshot(this.currentGame.gameId, async (gameData) => {
                if (gameData.gameState !== GAME_STATE.END) {
                    window.location.reload();
                }
            });
            this.setupPlayerMessageUnsubscribe();
        }
    }

    cleanup() {
        super.cleanup();
        if (this.gameUnsubscribe) {
            this.gameUnsubscribe();
        }
    }
}

export default new CreditsPage();