import { db } from '../config/firebase.js';
import { doc, getDoc, setDoc, updateDoc, deleteDoc } from 'https://www.gstatic.com/firebasejs/12.4.0/firebase-firestore.js';

class Character {
    constructor(characterId, data = {}) {
        this.characterId = characterId;
        this.gameId = data.gameId || '';
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
        this.items = data.items || '';
    }

    static async create(gameId, characterData) {
        const characterId = crypto.randomUUID();
        const character = new Character(characterId, {
            gameId,
            ...characterData
        });

        await character.save();
        return character;
    }

    static async get(characterId) {
        const characterDoc = await getDoc(doc(db, 'characters', characterId));
        if (!characterDoc.exists()) return null;
        return new Character(characterDoc.id, characterDoc.data());
    }

    async save() {
        await setDoc(doc(db, 'characters', this.characterId), {
            gameId: this.gameId,
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
        await updateDoc(doc(db, 'characters', this.characterId), data);
    }

    async delete() {
        await deleteDoc(doc(db, 'characters', this.characterId));
    }

    async updateGold(amount) {
        this.gold = Math.max(0, this.gold + amount);
        await updateDoc(doc(db, 'characters', this.characterId), {
            gold: this.gold
        });
    }

    async addItem(itemNumber) {
        const items = this.items ? this.items.split(',') : [];
        if (!items.includes(itemNumber)) {
            items.push(itemNumber);
            this.items = items.join(',');
            await updateDoc(doc(db, 'characters', this.characterId), {
                items: this.items
            });
        }
    }
}

export default Character;