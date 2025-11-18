import Page from '../js/models/Page.js';
import AuthService from '../js/services/auth.js';
import { router } from '../js/utils/router.js';
import { PAGES } from '../js/models/Enums.js';

class IndexPage extends Page {
    constructor() {
        super(PAGES.index);
    }

    show() {
        super.show();
        this.initializeUI();
        this.attachEventListeners();
    }

    initializeUI() {
        const template = `
            <div id="${this.page}" class="page-container">
                <div class="card">
                    <h1>Welcome to Leaguescape</h1>
                    <div class="form-group">
                        <button id="loginAnonymous" class="text-button">Continue as Guest</button>
                    </div>
                    <div class="form-group">
                        <button id="loginGoogle" class="text-button">Sign in with Google</button>
                    </div>
                    <div class="form-group">
                        <button id="learnMore" class="text-button">Learn More</button>
                    </div>
                </div>
            </div>
        `;
        
        document.querySelector('#app').innerHTML = template;
    }

    attachEventListeners() {
        document.getElementById('loginAnonymous').addEventListener('click', async () => {
            try {
                await AuthService.signInAnonymously();
                router.navigate(PAGES.user);
                // No need to navigate as the app.js auth state listener will handle it
            } catch (error) {
                console.error('Error signing in anonymously:', error);
            }
        });

        document.getElementById('loginGoogle').addEventListener('click', async () => {
            try {
                await AuthService.signInWithGoogle();
                router.navigate(PAGES.user);
                // No need to navigate as the app.js auth state listener will handle it
            } catch (error) {
                console.error('Error signing in with Google:', error);
            }
        });

        document.getElementById('learnMore').addEventListener('click', async () => {
            router.navigate(PAGES.info);
        });
    }


    cleanup() {
        super.cleanup();
    }
}

export default new IndexPage();