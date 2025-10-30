import { db } from '../config/firebase.js';
import { doc, getDoc, setDoc, updateDoc, deleteDoc, collection } from 'https://www.gstatic.com/firebasejs/12.4.0/firebase-firestore.js';

class Character {
    constructor(gameId, characterId, data = {}) {
        this.gameId = gameId;
        this.characterId = characterId;
        this.name = data.name || '';
        this.profileImage = data.profileImage || '';
        this.emblemImage = data.emblemImage || '';
        this.userId = data.userId || '';
        this.accountNumber = data.accountNumber || '';
        this.accountPassword = data.accountPassword || '';
        this.securityQuestion = data.securityQuestion || '';
        this.securityAnswer = data.securityAnswer || '';
        this.startingGold = data.startingGold || 0;
        this.canAccessSecret = data.canAccessSecret || false;
        this.gold = data.gold || 0;
        this.items = data.items || [];
    }

    static async create(gameId, characterData) {
        const characterId = crypto.randomUUID();
        const character = new Character(gameId, characterId, characterData);
        await character.save();
        return character;
    }

    static async get(gameId, characterId) {
        const characterDoc = await getDoc(doc(db, `games/${gameId}/characters`, characterId));
        if (!characterDoc.exists()) return null;
        return new Character(gameId, characterDoc.id, characterDoc.data());
    }

    async save() {
        await setDoc(doc(db, `games/${this.gameId}/characters`, this.characterId), {
            name: this.name,
            profileImage: this.profileImage,
            emblemImage: this.emblemImage,
            userId: this.userId,
            accountNumber: this.accountNumber,
            accountPassword: this.accountPassword,
            securityQuestion: this.securityQuestion,
            securityAnswer: this.securityAnswer,
            startingGold: this.startingGold,
            canAccessSecret: this.canAccessSecret,
            gold: this.gold,
            items: this.items
        });
    }

    async update(data) {
        Object.assign(this, data);
        await updateDoc(doc(db, `games/${this.gameId}/characters`, this.characterId), data);
    }

    async delete() {
        await deleteDoc(doc(db, `games/${this.gameId}/characters`, this.characterId));
    }

    async updateGold(amount) {
        this.gold = Math.max(0, this.gold + amount);
        await updateDoc(doc(db, `games/${this.gameId}/characters`, this.characterId), {
            gold: this.gold
        });
    }

    async addItem(itemId) {
        if (!this.items.includes(itemId)) {
            this.items.push(itemId);
            await updateDoc(doc(db, `games/${this.gameId}/characters`, this.characterId), {
                items: this.items
            });
        }
    }
}

export default Character;