import Page from '../js/models/Page.js';
import AuthService from '../js/services/auth.js';
import GameService from '../js/services/game.js';
import { router } from '../js/utils/router.js';

class InventoryPage extends Page {
    constructor() {
        super();
        this.currentGame = null;
        this.currentCharacter = null;
    }

    async show() {
        // Basic character validation, placeholder for now
        const gameId = new URLSearchParams(window.location.search).get('gameId');
        if (!gameId) {
            router.navigate('user');
            return;
        }

        this.initializeUI();
    }

    initializeUI() {
        const template = `
            <div class="container">
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
}

export default new InventoryPage();