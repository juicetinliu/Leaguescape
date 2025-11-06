import Page from '../js/models/Page.js';
import AuthService from '../js/services/auth.js';
import GameService from '../js/services/game.js';
import { router } from '../js/utils/router.js';

class CharacterPage extends Page {
    constructor() {
        super();
        this.currentGame = null;
        this.currentCharacter = null;
    }

    async show() {
        const gameId = new URLSearchParams(window.location.search).get('gameId');
        if (!gameId) {
            router.navigate('user');
            return;
        }

        this.currentGame = await GameService.getGame(gameId);
        if (!this.currentGame) {
            router.navigate('user');
            return;
        }

        const userId = AuthService.currentUser.authId;
        if (!(await GameService.isPlayer(gameId, userId))) {
            router.navigate('user');
            return;
        }
        
        if (await GameService.isAdmin(gameId, userId)) {
            router.navigate(`admin&gameId=${gameId}`);
            return;
        }

        switch (this.currentGame.gameState) {
            case 'setup':
                router.navigate(`lobby&gameId=${gameId}`);
                return;
            case 'end':
                router.navigate(`credits&gameId=${gameId}`);
                return;
        }

        const characterId = new URLSearchParams(window.location.search).get('characterId');
        try {
            this.currentCharacter = await GameService.getGameCharacter(gameId, characterId);
        } catch (error) { 
            // Ignore error 

        }
        if (!this.currentCharacter) {
            router.navigate(`login&gameId=${gameId}`);
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
            router.navigate(`login&gameId=${this.currentGame.gameId}`);
        });

        document.getElementById('goToShop').addEventListener('click', () => {
            router.navigate(`shop&gameId=${this.currentGame.gameId}`);
        });

        document.getElementById('goToBank').addEventListener('click', () => {
            router.navigate(`bank&gameId=${this.currentGame.gameId}`);
        });

        document.getElementById('goToInventory').addEventListener('click', () => {
            router.navigate(`inventory&gameId=${this.currentGame.gameId}`);
        });
    }
}

export default new CharacterPage();