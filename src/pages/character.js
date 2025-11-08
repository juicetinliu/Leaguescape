import Page from '../js/models/Page.js';
import AuthService from '../js/services/auth.js';
import GameService from '../js/services/game.js';
import MessageService from '../js/services/message.js';
import { MessageType } from '../js/models/MessageTypes.js';
import { router } from '../js/utils/router.js';
import { PAGES, GAME_STATE } from '../js/models/Enums.js';
import { gameRouter } from '../js/utils/gamerouter.js';

class CharacterPage extends Page {
    constructor() {
        super(PAGES.character);
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
                <div class="character-header-wrapper">
                    <button id="logoutCharacter" class="text-button">LOG OUT</button>
                </div>

                <div class="character-menu-wrapper">
                    <div class="character-menu-heading">
                        Welcome to Piltover Academy.
                    </div>
                    <div class="character-menu-subheading">
                        Please select your mode.
                    </div>
                    
                    <div class="character-menu-buttons-wrapper">
                        <div id="goToShop" class="character-menu-button">
                            <div class="character-menu-button-image">
                                <img src="">
                            </div>
                            <div class="character-menu-button-label">
                                THE SHOP
                            </div>
                        </div>
                        <div id="goToBank" class="character-menu-button">
                            <div class="character-menu-button-image">
                                <img src="">
                            </div>
                            <div class="character-menu-button-label">
                                THE BANK
                            </div>
                        </div>
                        <div id="goToInventory" class="character-menu-button">
                            <div class="character-menu-button-image">
                                <img src="">
                            </div>
                            <div class="character-menu-button-label">
                                THE INVENTORY
                            </div>
                        </div>
                    </div>
                </div>

                <div class="character-footer-wrapper">
                    <div class="character-footer-name">
                        ${this.currentCharacter.name}
                    </div>
                    <div class="character-footer-account-number">
                        ${this.currentCharacter.accountNumber}
                    </div>
                </div>
            </div>
        `;
        
        document.querySelector('#app').innerHTML = template;
    }

    attachEventListeners() {
        document.getElementById('logoutCharacter').addEventListener('click', async () => {
            await GameService.playerLogOut(this.currentGame.gameId, this.currentCharacter.characterId);
        });

        document.getElementById('goToShop').addEventListener('click', () => {
            router.navigate(`${PAGES.shop}&gameId=${this.currentGame.gameId}&characterId=${this.currentCharacter.characterId}`);
        });

        document.getElementById('goToBank').addEventListener('click', () => {
            router.navigate(`${PAGES.bank}&gameId=${this.currentGame.gameId}&characterId=${this.currentCharacter.characterId}`);
        });

        document.getElementById('goToInventory').addEventListener('click', () => {
            router.navigate(`${PAGES.inventory}&gameId=${this.currentGame.gameId}&characterId=${this.currentCharacter.characterId}`);
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
            router.navigate(`${PAGES.login}&gameId=${this.currentGame.gameId}`);
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

export default new CharacterPage();