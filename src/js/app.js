import { auth } from './config/firebase.js';
import { onAuthStateChanged } from 'https://www.gstatic.com/firebasejs/12.4.0/firebase-auth.js';
import { router } from './utils/router.js';

class App {
    constructor() {
        this.initializeAuth();
        this.initializeRouter();
    }

    initializeAuth() {
        onAuthStateChanged(auth, (user) => {
            if (user) {
                // User is signed in
                console.log('User is signed in:', user.uid);
            } else {
                // User is signed out
                console.log('User is signed out');
                router.navigate('/');
            }
        });
    }

    initializeRouter() {
        // Initialize router with routes
        router.init();
    }
}

// Initialize the application
const app = new App();
export default app;