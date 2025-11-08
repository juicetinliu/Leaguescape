import Page from '../js/models/Page.js';
import AuthService from '../js/services/auth.js';
import GameService from '../js/services/game.js';
import MessageService from '../js/services/message.js';
import { MessageType } from '../js/models/MessageTypes.js';
import { router } from '../js/utils/router.js';
import { PAGES, GAME_STATE } from '../js/models/Enums.js';
import { gameRouter } from '../js/utils/gamerouter.js';

class ShopPage extends Page {
    constructor() {
        super(PAGES.shop);
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
                <div class="items-container">
                    <div class="items-header-wrapper">
                        <div class="profile-preview-wrapper">
                            <div class="profile-image-wrapper">
                                <img src=""/>
                            </div>
                            <div class="profile-info-wrapper">
                                <div class="profile-name-text">
                                    ${this.currentCharacter.name}
                                </div>
                                <div class="profile-gold-display">
                                    ${this.currentCharacter.gold}
                                </div>
                            </div>
                        </div>
                        <div class="items-header-heading">ALL ITEMS</div>
                        <button id="backToCharacter" class="text-button">BACK</button>
                    </div>
                    <div>
                        Items will go here
                    </div>
                </div>
                <div class="cart-container">
                    <div class="cart-wrapper">
                        <div class="cart-heading">
                            SHOPPING CART
                        </div>
                        <div class="cart-items-wrapper">
                            Items will go here
                        </div>
                        <div class="cart-total-wrapper">
                        </div>
                        <div class="cart-footer">
                            <button id="purchaseCart" class="text-button">PURCHASE</button>
                        </div>
                    </div>
                </div>
            </div>
        `;
        
        document.querySelector('#app').innerHTML = template;
    }


    attachEventListeners() {
        document.getElementById('backToCharacter').addEventListener('click', () => {
            router.navigate(`${PAGES.character}&gameId=${this.currentGame.gameId}&characterId=${this.currentCharacter.characterId}`);
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

export default new ShopPage();