import { db } from '../config/firebase.js';
import { doc, getDoc, setDoc, updateDoc, deleteDoc } from 'https://www.gstatic.com/firebasejs/12.4.0/firebase-firestore.js';

class Item {
    constructor(itemId, data = {}) {
        this.itemId = itemId;
        this.gameId = data.gameId || '';
        this.itemNumber = data.itemNumber || 0;
        this.name = data.name || '';
        this.description = data.description || '';
        this.quantity = data.quantity || 0;
        this.price = data.price || 0;
        this.prereqs = data.prereqs || '';
        this.isSecret = data.isSecret || false;
    }

    static async create(gameId, itemData) {
        const itemId = crypto.randomUUID();
        const item = new Item(itemId, {
            gameId,
            ...itemData
        });

        await item.save();
        return item;
    }

    static async get(itemId) {
        const itemDoc = await getDoc(doc(db, 'items', itemId));
        if (!itemDoc.exists()) return null;
        return new Item(itemDoc.id, itemDoc.data());
    }

    async save() {
        await setDoc(doc(db, 'items', this.itemId), {
            gameId: this.gameId,
            itemNumber: this.itemNumber,
            name: this.name,
            description: this.description,
            quantity: this.quantity,
            price: this.price,
            prereqs: this.prereqs,
            isSecret: this.isSecret
        });
    }

    async update(data) {
        Object.assign(this, data);
        await updateDoc(doc(db, 'items', this.itemId), data);
    }

    async delete() {
        await deleteDoc(doc(db, 'items', this.itemId));
    }

    async updateQuantity(amount) {
        this.quantity = Math.max(0, this.quantity + amount);
        await updateDoc(doc(db, 'items', this.itemId), {
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
        const characterItems = character.items ? character.items.split(',') : [];
        return requiredItems.every(item => characterItems.includes(item));
    }
}

export default Item;