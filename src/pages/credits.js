import Page from '../js/models/Page.js';
import AuthService from '../js/services/auth.js';
import GameService from '../js/services/game.js';
import { router } from '../js/utils/router.js';

class CreditsPage extends Page {
    constructor() {
        super();
        this.currentGame = null;
    }

    async show() {
        const gameId = new URLSearchParams(window.location.search).get('gameId');
        if (!gameId) {
            router.navigate('user');
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
                        <h1>Game Over</h1>
                        <button id="backToUser" class="btn">Back to User Page</button>
                    </div>
                </header>

                <div class="card">
                    <h2>Thanks for Playing!</h2>
                    <p>Credits implementation coming soon...</p>
                </div>
            </div>
        `;
        
        document.querySelector('#app').innerHTML = template;
    }

    attachEventListeners() {
        document.getElementById('backToUser').addEventListener('click', () => {
            router.navigate('user');
        });
    }
}

export default new CreditsPage();