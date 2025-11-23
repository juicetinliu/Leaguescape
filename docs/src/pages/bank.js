import Page from '../js/models/Page.js';
import AuthService from '../js/services/auth.js';
import GameService from '../js/services/game.js';
import MessageService from '../js/services/message.js';
import { MessageType } from '../js/models/MessageTypes.js';
import { router } from '../js/utils/router.js';
import { PAGES, GAME_STATE } from '../js/models/Enums.js';
import { gameRouter } from '../js/utils/gamerouter.js';
import { gold } from '../js/components/staticComponents.js'
import CharacterHandlerService from '../js/services/handlers/characterHandler.js';

const GOLDACTION = {
    WITHDRAW: 'WITHDRAW',
    DEPOSIT: 'DEPOSIT',
}

class BankPage extends Page {
    constructor() {
        super(PAGES.bank);
        this.goldActionType = null;
        this.currentGame = null;
        this.currentCharacter = null;
        this.playerData = {};
        
        this.gameUnsubscribe = null;
        this.playerMessageUnsubscribe = null;
        this.characterUnsubscribe = null;
        this.playerDataUnsubscribe = null
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
                    <div class="back-button-wrapper wrapper">
                        <button id="backToCharacter" class="text-button">BACK</button>
                    </div>
                    <div class="bank-header-heading wrapper">THE BANK</div>
                    <div class="profile-preview-wrapper wrapper">
                        <div class="profile-info-wrapper">
                            <div id="characterName" class="profile-name-text">
                                ${this.currentCharacter.name}
                            </div>
                            <div id="character-account-number" class="profile-account-number-text">
                                <span id="account-number-prefix">
                                    Acc# 
                                </span>
                                <span id="characterAccountNumber">
                                    ${this.currentCharacter.accountNumber}
                                </span>
                            </div>
                        </div>
                        <div class="profile-image-wrapper">
                            <img src="${this.currentCharacter.profileImage}"/>
                        </div>
                    </div>
                </div>

                <div class="bank-content-wrapper">
                    <div class="bank-gold-content-wrapper">
                        <div class="account-balance-heading heading">
                            CURRENT BALANCE:
                        </div>
                        <div id="characterGold" class="profile-gold-display" data-gold=${this.currentCharacter.gold}>
                            ${this.currentCharacter.gold}
                            ${gold}
                        </div>
                    </div>
                    <div class="bank-actions-content-wrapper">
                        <div id="bankActionsWrapper" class="bank-actions-buttons">
                            <button id="depositGold" class="text-button">DEPOSIT GOLD</button>
                            <button id="withdrawGold" class="text-button">WITHDRAW GOLD</button>
                        </div>
                        <div id="bankActionsFormWrapper" class="bank-actions-form hidden">
                            <form id="goldForm" class="gold-form-wrapper">
                                <div class="gold-amount-input-wrapper">
                                    <label id="goldAmountLabel" class="text-form-label" for="goldAmount">To be replaced</label>
                                    <input type="number" id="goldAmount" class="text-form-input" required>
                                </div>
                                <div class="gold-preview-amount-wrapper">
                                    <div class="account-balance-heading heading">
                                        NEW BALANCE:
                                    </div>
                                    <div id="previewGoldBalance" class="profile-gold-display">
                                        To be replaced
                                    </div>
                                </div>
                                <div class="form-actions-wrapper">
                                    <button id="goldActionsCancel" type="button" class="text-button">CANCEL</button>
                                    <button id="goldActionsSubmit" type="submit" class="text-button">TO BE REPLACED</button>
                                </div>
                            </form>
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

        document.getElementById('depositGold').addEventListener('click', () => this.handleGoldAction(GOLDACTION.DEPOSIT));

        document.getElementById('withdrawGold').addEventListener('click', () => this.handleGoldAction(GOLDACTION.WITHDRAW));

        document.getElementById('goldAmount').addEventListener('input', (e) => { this.handleGoldInput(e); });

        document.getElementById('goldActionsCancel').addEventListener('click', () => this.toggleGoldActionsForm(false));
                
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

            //reset amount to prevent issues!
            const goldAmountInput = document.getElementById('goldAmount');
            goldAmountInput.value = 0;
            this.handleGoldInput(0);
        });
        this.playerDataUnsubscribe = GameService.onPlayerSnapshot(gameId, AuthService.currentUser.authId, async (playerData) => {
            if(playerData.loginMode == 'inventory') {
                window.location.reload();
                return;
            }
            this.playerData = playerData;
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
        characterGoldDiv.dataset.gold = this.currentCharacter.gold;
        characterGoldDiv.innerHTML = `
            ${this.currentCharacter.gold}
            ${gold}
        `;

        //TODO: Update Profile Image too!
    }

    handleGoldInput(event) {
        const isDeposit = this.goldActionType === GOLDACTION.DEPOSIT;
        let inputGoldAmount = event ? parseFloat(event.target.value) || 0 : 0;
        let output = this.processGoldActionAmount(inputGoldAmount, isDeposit);
        const goldActionsSubmitButton = document.getElementById('goldActionsSubmit');

        if(!output.isValid) {
            if(output.errorMessage) { console.log(output.errorMessage)}
            //show error message!
            goldActionsSubmitButton.disabled = true;
        } else {
            goldActionsSubmitButton.disabled = false;
        }

        const previewGoldDiv = document.getElementById('previewGoldBalance');
        previewGoldDiv.innerHTML = `
            ${output.newBalance}
            ${gold}
        `;
    }

    processGoldActionAmount(inputAmount, isDeposit) {
        const characterGoldDiv = document.getElementById('characterGold');
        let currentBalance = parseInt(characterGoldDiv.dataset.gold);
        let output = { errorMessage: "", newBalance: currentBalance, isValid: false };

        if (!Number.isInteger(inputAmount)) {
            output.errorMessage = "Gold must be a whole number"
            return output;
        }
        inputAmount = parseInt(inputAmount);
        if (inputAmount < 0) {
            output.errorMessage = "Gold must be non-negative";
            return output;
        } else {
            output.newBalance = isDeposit 
                ? currentBalance + inputAmount
                : currentBalance - inputAmount;
        }

        if(output.newBalance < 0 && !isDeposit) {
            output.errorMessage = "Insufficient funds for withdrawal"
            return output;
        }
        if(inputAmount == 0) {
            return output;
        }
        output.isValid = true;
        return output;
    }

    handleGoldAction(goldAction) {
        this.goldActionType = goldAction;
        const goldActionsSubmitButton = document.getElementById('goldActionsSubmit');
        const goldAmountLabel = document.getElementById('goldAmountLabel');
        const goldAmountInput = document.getElementById('goldAmount');
        const form = document.getElementById('goldForm');

        goldActionsSubmitButton.innerHTML = goldAction;
        goldAmountLabel.innerHTML = `${goldAction} AMOUNT`;
        goldAmountInput.value = 0;
        
        this.handleGoldInput();
        this.toggleGoldActionsForm(true);

        form.onsubmit = async (e) => {
            e.preventDefault();

            const isDeposit = goldAction === GOLDACTION.DEPOSIT;
            const amount = parseInt(document.getElementById('goldAmount').value);
            if(isDeposit) {
                await CharacterHandlerService.depositGold(this.currentGame.gameId, this.currentCharacter.characterId, amount);
            } else {
                await CharacterHandlerService.withdrawGold(this.currentGame.gameId, this.currentCharacter.characterId, amount);
            }

            this.toggleGoldActionsForm(false);
        }
    }

    toggleGoldActionsForm(show) {
        const bankActionsWrapper = document.getElementById('bankActionsWrapper');
        const bankActionsFormWrapper = document.getElementById('bankActionsFormWrapper');

        if (show) {
            bankActionsWrapper.classList.add('hidden');
            bankActionsFormWrapper.classList.remove('hidden');
        } else {
            bankActionsWrapper.classList.remove('hidden');
            bankActionsFormWrapper.classList.add('hidden');
        }
    }

    cleanup() {
        super.cleanup();
        this.goldActionType = null;
        this.currentCharacter = null;
        this.playerData = {};

        if (this.gameUnsubscribe) {
            this.gameUnsubscribe();
        }
        if (this.playerMessageUnsubscribe) {
            this.playerMessageUnsubscribe();
        }
        if (this.characterUnsubscribe) {
            this.characterUnsubscribe();
        }
        if (this.playerDataUnsubscribe) {
            this.playerDataUnsubscribe();
        }
    }
}

export default new BankPage();