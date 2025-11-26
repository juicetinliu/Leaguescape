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

class CharacterPage extends Page {
    constructor() {
        super(PAGES.character);
        this.currentGame = null;
        this.currentCharacter = null;
        this.playerData = {};
        this.canAccessSecretShop = false;
        this.isLoading = false;
        
        this.gameUnsubscribe = null;
        this.characterUnsubscribe = null;
        this.playerDataUnsubscribe = null
        this.playerMessageUnsubscribe = null;
        this.gameTimerInterval = null;
        this.GAME_DURATION_MS = 60 * 60 * 1000; // 1 hour
    }

    async show() {
        super.show();
        this.currentGame = await gameRouter.handlePlayerGamePageShow(this.page);
        if (!this.currentGame) {
            return;
        }

        const gameId = this.currentGame.gameId;
        this.currentCharacter = await gameRouter.handleCharacterGamePageShow(gameId, this.page);
        if (!this.currentCharacter) {
            return;
        }

        // Even though the snapshot listeners will update this, we do the fetch first to avoid a flicker (immediate refresh due to initial canAccessSecretShop value being different)
        this.playerData = await GameService.getPlayerData(gameId, AuthService.currentUser.authId);
        this.canAccessSecretShop = this.currentCharacter.canAccessSecret && (this.playerData.loginMode === 'secret');

        this.initializeUI();
        this.attachEventListeners();
        this.startGameTimer();
    }

    initializeUI() {
        const template = `
            <div id="${this.page}" class="page-container">
                <div class="character-header-wrapper">
                    <div class="wrapper"></div>
                    <div class="game-timer-wrapper wrapper">
                        <div id="gameTimer"></div>
                    </div>
                    <div class="logout-button-wrapper wrapper">
                        <button id="logout-button" class="text-button">LOG OUT</button>
                        <div id="logout-loading-wrapper" class="hidden">
                            ${spinner}
                        </div>
                    </div>
                </div>

                <div class="character-menu-wrapper">
                    <div class="character-menu-heading">
                        Welcome to Piltover Academy.
                    </div>
                    ${this.playerData.loginMode === 'inventory' ? '' :`
                    <div class="character-menu-subheading">
                        Please select your mode.
                    </div>`}
                    
                    <div class="character-menu-buttons-wrapper">
                        ${this.playerData.loginMode === 'inventory' ? '' :
                        `<div id="go-to-${PAGES.shop}" class="character-menu-button">
                            <div id="${PAGES.shop}-page-menu-button-image" class="character-menu-button-image ${this.canAccessSecretShop ? 'flickering' : ''}">
                                <img src="public/images/${this.canAccessSecretShop ? 'ss' : 's'}.png">
                                <div id="${PAGES.shop}-spinner" class="overlay-spinner hidden">
                                    ${spinner}
                                </div>
                            </div>
                            <div class="character-menu-button-label">
                                THE SHOP
                            </div>
                        </div>
                        <div id="go-to-${PAGES.bank}" class="character-menu-button">
                            <div id="${PAGES.bank}-page-menu-button-image" class="character-menu-button-image">
                                <img src="public/images/b.png">
                                <div id="${PAGES.bank}-spinner" class="overlay-spinner hidden">
                                    ${spinner}
                                </div>
                            </div>
                            <div class="character-menu-button-label">
                                THE BANK
                            </div>
                        </div>`}
                        <div id="go-to-${PAGES.inventory}" class="character-menu-button">
                            <div id="${PAGES.inventory}-page-menu-button-image" class="character-menu-button-image">
                                <img src="public/images/i.png">
                                <div id="${PAGES.inventory}-spinner" class="overlay-spinner hidden">
                                    ${spinner}
                                </div>
                            </div>
                            <div class="character-menu-button-label">
                                THE INVENTORY
                            </div>
                        </div>
                    </div>
                </div>

                <div class="character-footer-wrapper">
                    <div id="character-footer-name">
                        ${this.currentCharacter.name}
                    </div>
                    <div id="character-footer-account-number">
                        ${this.currentCharacter.accountNumber}
                    </div>
                </div>
            </div>
        `;
        
        document.querySelector('#app').innerHTML = template;
    }

    attachEventListeners() {
        document.getElementById('logout-button').addEventListener('click', async () => {
            this.toggleLogoutLoading(true);

            try {
                await CharacterHandlerService.logOut(this.currentGame.gameId, this.currentCharacter.characterId);
            } catch (e) {
                console.error('Login error:', error);
                alert('An error occurred during logout');
                this.toggleLogoutLoading(false);
            }
        });

        if(this.playerData.loginMode !== 'inventory') {
            document.getElementById(`go-to-${PAGES.shop}`).addEventListener('click', () => {
                if(this.isLoading) return;

                this.toggleNavigationLoading(true, PAGES.shop);
                try {
                    router.navigate(`${PAGES.shop}&gameId=${this.currentGame.gameId}&characterId=${this.currentCharacter.characterId}`);
                } catch (e) {
                    this.toggleNavigationLoading(false, PAGES.shop);
                }
            });

            document.getElementById(`go-to-${PAGES.bank}`).addEventListener('click', () => {
                if(this.isLoading) return;

                this.toggleNavigationLoading(true, PAGES.bank);
                try {
                    router.navigate(`${PAGES.bank}&gameId=${this.currentGame.gameId}&characterId=${this.currentCharacter.characterId}`);
                } catch (e) {
                    this.toggleNavigationLoading(false, PAGES.bank);
                }
            });
        }

        document.getElementById(`go-to-${PAGES.inventory}`).addEventListener('click', () => {
            if(this.isLoading) return;

            this.toggleNavigationLoading(true, PAGES.inventory);
            try {
                router.navigate(`${PAGES.inventory}&gameId=${this.currentGame.gameId}&characterId=${this.currentCharacter.characterId}`);
            } catch (e) {
                this.toggleNavigationLoading(false, PAGES.inventory);
            }
        });
                
        if(this.currentGame.gameId) {
            const gameId = this.currentGame.gameId;
            this.gameUnsubscribe = GameService.onGameSnapshot(gameId, async (gameData) => {
                if (gameData.gameState !== GAME_STATE.RUNNING) {
                    window.location.reload();
                }
            });
            this.setupPlayerMessageUnsubscribe(gameId);
            this.setupCharacterPlayerUnsubscribes(gameId);
        }
    }

    setupCharacterPlayerUnsubscribes(gameId) {
        this.characterUnsubscribe = GameService.onCharacterSnapshot(gameId, this.currentCharacter.characterId, async (character) => {
            this.currentCharacter = character;
            this.loadCharacterData();
        });
        this.playerDataUnsubscribe = GameService.onPlayerSnapshot(gameId, AuthService.currentUser.authId, async (playerData) => {
            if(this.playerData.loginMode && (this.playerData.loginMode !== playerData.loginMode)) {
                window.location.reload(); //technically no need to reload between normal/secret IF the character cannot access secrets. However still safer to do so.
                return;
            }
            this.playerData = playerData;
            this.loadPlayerData();
        });
    }

    loadPlayerData() {
        if(this.reloadIfSecretShopAccessChanged()) return;
        // nothing else to update? (Player data only includes name and login mode)
    }

    reloadIfSecretShopAccessChanged() {
        const canAccessSecretShop = this.currentCharacter.canAccessSecret && (this.playerData.loginMode === 'secret');
        if (this.canAccessSecretShop !== canAccessSecretShop) {
            // access changed - force a refresh to get the right snapshot listeners/items/CX!
            window.location.reload();
            return true;
        }
        return false;
    }

    loadCharacterData() {
        if(this.reloadIfSecretShopAccessChanged()) return;
        // Now update everything that depends on character data! Gold/Name/Etc.

        const characterName = document.getElementById('character-footer-name');
        characterName.innerHTML = this.currentCharacter.name;
        const characterAccount = document.getElementById('character-footer-account-number');
        characterAccount.innerHTML = this.currentCharacter.accountNumber;
        
        
    }
        
    async setupPlayerMessageUnsubscribe(gameId) {
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
            router.navigate(`${PAGES.login}&gameId=${this.currentGame.gameId}`);
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

        const durationMs = this.GAME_DURATION_MS;

        const tick = () => {
            const now = new Date();
            const elapsed = now - startDate;
            const remaining = durationMs - elapsed;

            if (remaining <= 0) {
                timerEl.textContent = '00:00:00';
                clearInterval(this.gameTimerInterval);
                this.gameTimerInterval = null;
                window.location.reload();
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

    toggleNavigationLoading(isLoading, page) {
        this.isLoading = isLoading;
        let spinnerWrapper = document.getElementById(`${page}-spinner`);
        let image = document.getElementById(`${page}-page-menu-button-image`);

        if (isLoading) {
            spinnerWrapper.classList.remove('hidden');
            image.classList.add('loading');
        } else {
            spinnerWrapper.classList.add('hidden');
            image.classList.remove('loading');
        }
    }

    toggleLogoutLoading(isLoading) {
        this.isLoading = isLoading;
        const logoutButton = document.getElementById('logout-button');
        const spinnerWrapper = document.getElementById('logout-loading-wrapper');

        if (isLoading) {
            logoutButton.classList.add('hidden');
            spinnerWrapper.classList.remove('hidden');
        } else {
            logoutButton.classList.remove('hidden');
            spinnerWrapper.classList.add('hidden');
        }
    }

    cleanup() {
        super.cleanup();
        this.currentCharacter = null;
        this.playerData = {};
        this.canAccessSecretShop = false;
        this.isLoading = false;

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
        if (this.gameTimerInterval) {
            clearInterval(this.gameTimerInterval);
            this.gameTimerInterval = null;
        }
    }
}

export default new CharacterPage();