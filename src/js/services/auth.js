import { auth } from '../config/firebase.js';
import { 
    signInAnonymously, 
    signInWithPopup, 
    GoogleAuthProvider,
    signOut
} from 'https://www.gstatic.com/firebasejs/12.4.0/firebase-auth.js';
import User from '../models/User.js';

class AuthService {
    constructor() {
        this.currentUser = null;
    }

    async signInAnonymously() {
        const { user } = await signInAnonymously(auth);
        await this.createUserIfNeeded(user);
        // No need to create user as the app.js auth state listener will handle it
        return user;
    }

    async signInWithGoogle() {
        const provider = new GoogleAuthProvider();
        const { user } = await signInWithPopup(auth, provider);
        await this.createUserIfNeeded(user);
        // No need to create user as the app.js auth state listener will handle it
        return user;
    }

    async signOut() {
        await signOut(auth);
        this.currentUser = null;
    }

    async createUserIfNeeded(authUser) {
        const user = await User.get(authUser.uid);
        if (!user) {
            const newUser = new User(authUser.uid, authUser.displayName || 'Guest');
            await newUser.save();
            this.currentUser = newUser;
        } else {
            this.currentUser = user;
        }
    }

    isAuthenticated() {
        return auth.currentUser !== null;
    }
}

export default new AuthService();