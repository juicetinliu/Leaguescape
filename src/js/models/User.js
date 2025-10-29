import { db } from '../config/firebase.js';
import { doc, getDoc, setDoc, updateDoc } from 'https://www.gstatic.com/firebasejs/12.4.0/firebase-firestore.js';

class User {
    constructor(authId, username = '') {
        this.authId = authId;
        this.username = username;
    }

    static async get(authId) {
        const userDoc = await getDoc(doc(db, 'users', authId));
        if (!userDoc.exists()) return null;
        return new User(userDoc.id, userDoc.data().username);
    }

    async save() {
        await setDoc(doc(db, 'users', this.authId), {
            username: this.username
        });
    }

    async updateUsername(newUsername) {
        this.username = newUsername;
        await updateDoc(doc(db, 'users', this.authId), {
            username: newUsername
        });
    }
}

export default User;