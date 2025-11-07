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
            <div class="container">
                <header class="header">
                    <div class="nav">
                        <h1>Character Dashboard</h1>
                        <div>
                            <button id="logoutCharacter" class="btn">Logout</button>
                        </div>
                    </div>
                </header>

                <div class="card">
                    <h2>Welcome, ${this.currentCharacter.name}</h2>
                    <div class="menu">
                        <button id="goToShop" class="btn">Shop</button>
                        <button id="goToBank" class="btn">Bank</button>
                        <button id="goToInventory" class="btn">Inventory</button>
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