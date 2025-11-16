import Page from '../js/models/Page.js';
import AuthService from '../js/services/auth.js';
import GameService from '../js/services/game.js';
import MessageService from '../js/services/message.js';
import { MessageType } from '../js/models/MessageTypes.js';
import { router } from '../js/utils/router.js';
import { PAGES, GAME_STATE } from '../js/models/Enums.js';
import { gameRouter } from '../js/utils/gamerouter.js';
import { gold } from '../js/components/staticComponents.js'

class BankPage extends Page {
    constructor() {
        super(PAGES.bank);
        this.currentGame = null;
        this.currentCharacter = null;
        
        this.gameUnsubscribe = null;
        this.playerMessageUnsubscribe = null;
        this.characterUnsubscribe = null;
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
                <div class="bank-header-wrapper">
                    <div class="wrapper"></div>
                    <div class="bank-header-heading wrapper">THE BANK</div>
                    <div class="back-button-wrapper wrapper">
                        <button id="backToCharacter" class="text-button">BACK</button>
                    </div>
                </div>

                <div class="bank-content-wrapper">
                    <div class="bank-profile-content-wrapper">
                        <div class="profile-image-wrapper">
                            <img src=""/>
                        </div>
                        <div class="profile-bank-info-wrapper">
                            <div class="profile-name-heading heading">
                                FULL NAME:
                            </div>
                            <div id="characterName" class="profile-name-text">
                                ${this.currentCharacter.name}
                            </div>
                        </div>
                        <div class="profile-bank-info-wrapper">
                            <div class="profile-account-number-heading heading">
                                ACCOUNT NUMBER:
                            </div>
                            <div id="characterAccountNumber" class="profile-account-number-text">
                                ${this.currentCharacter.accountNumber}
                            </div>
                        </div>
                    </div>
                    <div class="bank-gold-content-wrapper">
                        <div class="account-balance-heading heading">
                            CURRENT BALANCE:
                        </div>
                        <div id="characterGold" class="profile-gold-display">
                            ${this.currentCharacter.gold}
                            ${gold}
                        </div>
                    </div>
                    <div class="bank-actions-content-wrapper">
                        <button id="depositGold" class="text-button">DEPOSIT GOLD</button>
                        <button id="withdrawGold" class="text-button">WITHDRAW GOLD</button>
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
            const gameId = this.currentGame.gameId;
            this.gameUnsubscribe = GameService.onGameSnapshot(gameId, async (gameData) => {
                if (gameData.gameState !== GAME_STATE.RUNNING) {
                    window.location.reload();
                }
            });
            this.setupPlayerMessageUnsubscribe(gameId);
            this.setupCharacterUnsubscribe(gameId)
        }
    }

    setupCharacterUnsubscribe(gameId) {
        this.characterUnsubscribe = GameService.onCharacterSnapshot(gameId, this.currentCharacter.characterId, async (character) => {
            this.currentCharacter = character;
            this.loadCharacterData();
        });
    }
    
        
    setupPlayerMessageUnsubscribe(gameId) {
        this.playerMessageUnsubscribe = MessageService.onUnprocessedPlayerMessagesSnapshot(gameId, async (messages) => {
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
        if (message.messageType === MessageType.LOGOUT_SUCCESS) {
        }
    }

    loadCharacterData() {
        const characterNameDiv = document.getElementById('characterName');
        characterNameDiv.innerHTML = this.currentCharacter.name;
        const characterAccountNumberDiv = document.getElementById('characterAccountNumber');
        characterAccountNumberDiv.innerHTML = this.currentCharacter.accountNumber;
        const characterGoldDiv = document.getElementById('characterGold');
        characterGoldDiv.innerHTML = `
            ${this.currentCharacter.gold}
            ${gold}
        `;

        //TODO: Update Profile Image too!
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
        if (this.characterUnsubscribe) {
            this.characterUnsubscribe();
        }
    }
}

export default new BankPage();