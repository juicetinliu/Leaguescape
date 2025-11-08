import Page from '../js/models/Page.js';
import AuthService from '../js/services/auth.js';
import GameService from '../js/services/game.js';
import MessageService from '../js/services/message.js';
import { MessageType } from '../js/models/MessageTypes.js';
import { router } from '../js/utils/router.js';
import { PAGES, GAME_STATE } from '../js/models/Enums.js';
import { gameRouter } from '../js/utils/gamerouter.js';

class InventoryPage extends Page {
    constructor() {
        super(PAGES.inventory);
        this.currentGame = null;
        this.currentCharacter = null;
        
        this.gameUnsubscribe = null;
        this.playerMessageUnsubscribe = null;
    }

    async show() {
        super.show();
        this.currentGame = await gameRouter.handlePlayerGamePageShow(this.page);
        if (!this.currentGame) {
            return;
        }

        this.currentCharacter = await gameRouter.handleCharacterGamePageShow(this.currentGame.gameId);
        if (!this.currentCharacter) {
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
                        <h1>Inventory</h1>
                        <button id="backToCharacter" class="btn">Back to Character</button>
                    </div>
                </header>

                <div class="card">
                    <h2>Your Items</h2>
                    <p>Inventory implementation coming soon...</p>
                </div>
            </div>
        `;
        
        document.querySelector('#app').innerHTML = template;
    }


    attachEventListeners() {
                
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
        console.log(message);
        await message.markAsProcessed();
        if (message.messageType === MessageType.LOGOUT_SUCCESS) {
        }
    }

    cleanup() {
        super.cleanup();
        this.currentCharacter = null;

        if (this.gameUnsubscribe) {
            this.gameUnsubscribe();
        }
        if (this.playerMessageUnsubscribe) {
            this.playerMessageUnsubscribe();
        }
    }
}

export default new InventoryPage();