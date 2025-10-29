import AuthService from '../js/services/auth.js';

class IndexPage {
    constructor() {
        this.run();
    }

    run() {
        this.initializeUI();
        this.attachEventListeners();
    }

    initializeUI() {
        const template = `
            <div class="container">
                <div class="card">
                    <h1>Welcome to Leaguescape</h1>
                    <div class="form-group">
                        <button id="loginAnonymous" class="btn">Continue as Guest</button>
                    </div>
                    <div class="form-group">
                        <button id="loginGoogle" class="btn">Sign in with Google</button>
                    </div>
                    <div class="form-group">
                        <a href="/info" class="btn">Learn More</a>
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
                window.location.href = '/user';
            } catch (error) {
                console.error('Error signing in anonymously:', error);
            }
        });

        document.getElementById('loginGoogle').addEventListener('click', async () => {
            try {
                await AuthService.signInWithGoogle();
                window.location.href = '/user';
            } catch (error) {
                console.error('Error signing in with Google:', error);
            }
        });
    }
}

export default new IndexPage();