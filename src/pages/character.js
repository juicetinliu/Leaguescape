import Page from '../js/models/Page.js';
import AuthService from '../js/services/auth.js';
import GameService from '../js/services/game.js';
import { router } from '../js/utils/router.js';
import { PAGES } from '../js/models/Enums.js';
import { gameRouter } from '../js/utils/gamerouter.js';

class CharacterPage extends Page {
    constructor() {
        super(PAGES.character);
        this.currentGame = null;
        this.currentCharacter = null;
    }

    async show() {
        this.currentGame = await gameRouter.handlePlayerGamePageShow(this.page);
        if (!this.currentGame) {
            return;
        }

        const gameId = this.currentGame.gameId;

        const characterId = new URLSearchParams(window.location.search).get('characterId');
        try {
            this.currentCharacter = await GameService.getGameCharacter(gameId, characterId);
        } catch (error) { 
            // Ignore error 
        }
        if (!this.currentCharacter) {
            router.navigate(`${PAGES.login}&gameId=${gameId}`);
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
                    <div class="character-menu-header">
                        Welcome to Piltover Academy.
                    </div>
                    <div class="character-menu-subheader">
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
            await GameService.updatePlayerAssumedCharacter(this.currentGame.gameId, AuthService.currentUser.authId, '');
            router.navigate(`${PAGES.login}&gameId=${this.currentGame.gameId}`);
        });

        document.getElementById('goToShop').addEventListener('click', () => {
            router.navigate(`${PAGES.shop}&gameId=${this.currentGame.gameId}`);
        });

        document.getElementById('goToBank').addEventListener('click', () => {
            router.navigate(`${PAGES.bank}&gameId=${this.currentGame.gameId}`);
        });

        document.getElementById('goToInventory').addEventListener('click', () => {
            router.navigate(`${PAGES.inventory}&gameId=${this.currentGame.gameId}`);
        });
    }
}

export default new CharacterPage();