import Page from '../js/models/Page.js';
import AuthService from '../js/services/auth.js';
import GameService from '../js/services/game.js';
import MessageService from '../js/services/message.js';
import { MessageType } from '../js/models/MessageTypes.js';
import { router } from '../js/utils/router.js';
import { PAGES, GAME_STATE } from '../js/models/Enums.js';
import { gameRouter } from '../js/utils/gamerouter.js';
import CharacterHandlerService from '../js/services/handlers/characterHandler.js';
import { spinner } from '../js/components/staticComponents.js';

class InventoryPage extends Page {
    constructor() {
        super(PAGES.inventory);
        this.currentGame = null;
        this.currentCharacter = null;
        this.isLoading = true;
        
        this.gameUnsubscribe = null;
        this.playerMessageUnsubscribe = null;
    }

    async show() {
        super.show();
        this.currentGame = await gameRouter.handlePlayerGamePageShow(this.page);
        if (!this.currentGame) {
            return;
        }

        this.currentCharacter = await gameRouter.handleCharacterGamePageShow(this.currentGame.gameId, this.page);
        if (!this.currentCharacter) {
            return;
        }

        this.initializeUI();
        this.attachEventListeners();
    }

    initializeUI() {
        const template = `
            <div id="${this.page}" class="page-container">
                <div class="inventory-header-wrapper">
                    <div class="wrapper"></div>
                    <div class="inventory-header-heading wrapper">INVENTORY</div>
                    <div class="back-button-wrapper wrapper">
                        <button id="backToCharacter" class="text-button">BACK</button>
                    </div>
                </div>

                <div class="inventory-content-wrapper">
                    <div id="inventory-loading-wrapper" class="inventory-content-wrapper">
                        <div class="inventory-content-heading">
                            Contacting the Shopkeeper...
                        </div>
                        <div id="inventory-spinner-wrapper">
                            ${spinner}
                        </div>
                    </div>
                    <div id="inventory-accept-wrapper" class="inventory-content-wrapper hidden">
                        <div class="inventory-content-heading">
                            Success!
                        </div>
                        <div class="inventory-content-message">
                            The Shopkeeper will be with you shortly.
                        </div>
                    </div>
                    <div id="inventory-decline-wrapper" class="inventory-content-wrapper hidden">
                        <div class="inventory-content-heading">
                            Please try again later!
                        </div>
                        <div class="inventory-content-message">
                            The Shopkeeper has declined your request.
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
            this.notifyAdmin();
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
        if (message.messageType === MessageType.REQUEST_INVENTORY_SUCCESS) {
            this.toggleLogoutLoading(false, true);
        } else if (message.messageType === MessageType.REQUEST_INVENTORY_FAILURE) {
            this.toggleLogoutLoading(false, false);
        }
    }

    async notifyAdmin() {
        await CharacterHandlerService.requestInventoryAccess(this.currentGame.gameId, this.currentCharacter.characterId);
    }



    toggleLogoutLoading(isLoading, accepted) {
        this.isLoading = isLoading;
        const loadingWrapper = document.getElementById('inventory-loading-wrapper');
        const messageAccept = document.getElementById('inventory-accept-wrapper');
        const messageDecline = document.getElementById('inventory-decline-wrapper');

        if (isLoading) {
            messageAccept.classList.add('hidden');
            messageDecline.classList.add('hidden');
            loadingWrapper.classList.remove('hidden');
        } else {
            if(accepted) {
                messageAccept.classList.remove('hidden');
                messageDecline.classList.add('hidden');
            } else {
                messageDecline.classList.remove('hidden');
                messageAccept.classList.add('hidden');
            }
            loadingWrapper.classList.add('hidden');
        }
    }

    cleanup() {
        super.cleanup();
        this.currentCharacter = null;
        this.isLoading = true;

        if (this.gameUnsubscribe) {
            this.gameUnsubscribe();
        }
        if (this.playerMessageUnsubscribe) {
            this.playerMessageUnsubscribe();
        }
    }
}

export default new InventoryPage();