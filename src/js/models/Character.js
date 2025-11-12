import { db } from '../config/firebase.js';
import { doc, getDoc, addDoc, updateDoc, deleteDoc, collection } from 'https://www.gstatic.com/firebasejs/12.4.0/firebase-firestore.js';

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
        this.items = data.items || {}; //itemId and quantity
    }

    static async create(gameId, characterData) {
        const character = new Character(gameId, 'willBeOverwritten', characterData);

        const docRef = await addDoc(collection(db, `games/${gameId}/characters`), {
            name: character.name,
            profileImage: character.profileImage,
            emblemImage: character.emblemImage,
            userId: character.userId,
            accountNumber: character.accountNumber,
            accountPassword: character.accountPassword,
            securityQuestion: character.securityQuestion,
            securityAnswer: character.securityAnswer,
            startingGold: character.startingGold,
            canAccessSecret: character.canAccessSecret,
            gold: character.gold,
            items: character.items
        });

        character.characterId = docRef.id;
        return character;
    }

    static async get(gameId, characterId) {
        const characterDoc = await getDoc(doc(db, `games/${gameId}/characters`, characterId));
        if (!characterDoc.exists()) throw new Error('Character not found');
        return new Character(gameId, characterDoc.id, characterDoc.data());
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

    // Unnecessary?
    // async addItem(itemId, quantity = 1) {
    //     const itemQuantity = this.items[itemId] || 0;
    //     this.items[itemId] = itemQuantity + quantity;
    //     await updateDoc(doc(db, `games/${this.gameId}/characters`, this.characterId), {
    //         items: this.items
    //     });
    // }

    async addItems(itemsMap) {
        Object.entries(itemsMap).map(([itemId, quantity]) => {
            const itemQuantity = this.items[itemId] || 0;
            this.items[itemId] = itemQuantity + quantity;
        });
        await updateDoc(doc(db, `games/${this.gameId}/characters`, this.characterId), {
            items: this.items
        });
    }

    async deleteAllItems() {
        this.items = {};
        await updateDoc(doc(db, `games/${this.gameId}/characters`, this.characterId), {
            items: this.items
        });
    }
}

export default Character;