import { auth } from './config/firebase.js';
import { onAuthStateChanged } from 'https://www.gstatic.com/firebasejs/12.4.0/firebase-auth.js';
import { router } from './utils/router.js';
import StorageService from './services/storage.js';
import AuthService from './services/auth.js';

class App {
    constructor() {
        this.initializeAuth();
        this.initializeRouter();
        this.initializeStorage();
    }

    initializeAuth() {
        onAuthStateChanged(auth, async (user) => {
            if (user) {
                // User is signed in
                console.log('User is signed in:', user.uid);
                await AuthService.createUserIfNeeded(user);
            } else {
                // User is signed out
                console.log('User is signed out');
            }
        });
    }

    initializeRouter() {
        // Initialize router with routes
        router.init();
    }

    initializeStorage() {
        StorageService.init()
    }
}

// Initialize the application
const app = new App();
export default app;