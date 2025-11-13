import { db } from '../config/firebase.js';
import { doc, getDoc, addDoc, updateDoc, deleteDoc, collection } from 'https://www.gstatic.com/firebasejs/12.4.0/firebase-firestore.js';

class Item {
    constructor(gameId, itemId, data = {}) {
        this.gameId = gameId;
        this.itemId = itemId;
        this.itemNumber = data.itemNumber || 0;
        this.name = data.name || '';
        this.description = data.description || '';
        this.quantity = data.quantity || 0;
        this.price = data.price || 0;
        this.prereqs = data.prereqs || '';
        this.isSecret = data.isSecret || false;
    }

    static async create(gameId, itemData) {
        const item = new Item(gameId, 'willBeOverwritten', itemData);

        const docRef = await addDoc(collection(db, `games/${gameId}/items`), {
            itemNumber: item.itemNumber,
            name: item.name,
            description: item.description,
            quantity: item.quantity,
            price: item.price,
            prereqs: item.prereqs,
            isSecret: item.isSecret
        });

        item.itemId = docRef.id;
        return item;
    }

    static async get(gameId, itemId) {
        const itemDoc = await getDoc(doc(db, `games/${gameId}/items`, itemId));
        if (!itemDoc.exists()) throw new Error('Item not found');
        return new Item(gameId, itemDoc.id, itemDoc.data());
    }

    async update(data) {
        Object.assign(this, data);
        await updateDoc(doc(db, `games/${this.gameId}/items`, this.itemId), data);
    }

    async delete() {
        await deleteDoc(doc(db, `games/${this.gameId}/items`, this.itemId));
    }

    async updateQuantity(amount) {
        const balance = this.quantity + amount;
        if(balance < 0) throw 'Item cannot end up with negative quantity!'
        this.quantity = balance;
        await updateDoc(doc(db, `games/${this.gameId}/items`, this.itemId), {
            quantity: this.quantity
        });
    }

    isAvailable() {
        return this.quantity > 0;
    }

    checkPrerequisites(character) {
        if (!this.prereqs) return true;
        if (this.prereqs === 'LOCKED') return false;
        
        const requiredItems = this.prereqs.split(',');
        return requiredItems.every(itemId => Object.keys(character.items).includes(itemId));
    }
}

export default Item;