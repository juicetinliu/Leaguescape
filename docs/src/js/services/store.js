import { db } from '../config/firebase.js';
import { collection, getDocs, query, where, or, orderBy, onSnapshot } from 'https://www.gstatic.com/firebasejs/12.4.0/firebase-firestore.js';
import Item from '../models/Item.js';
import GameService from './game.js';

class StoreService {
    createItemsQuery(gameId, getSecretItemsToo = false) {
        const itemsRef = collection(db, `games/${gameId}/items`);
            // Need to combine query - firebase is not a 'filter' blah blah rules engine blah blah cannot definitively prove that all items are secret or not (https://firebase.google.com/docs/firestore/security/rules-conditions?authuser=0#rules_are_not_filters)
        if (getSecretItemsToo) {
            return query(itemsRef, or(where("isSecret", "==", false), where("isSecret", "==", true)), orderBy('itemNumber', 'asc'));
        } else {
            return query(itemsRef, where("isSecret", "==", false), orderBy('itemNumber', 'asc'));
        }
    }

    async getAvailableItems(gameId, getSecretItemsToo = false) {
        const items = [];
        try {
            const itemDocs = await getDocs(this.createItemsQuery(gameId, getSecretItemsToo));
            itemDocs.forEach(doc => {
                const item = new Item(gameId, doc.id, doc.data());
                items.push(item);
            });
        } catch (e) {
            // If there's an error (e.g., permission denied), we can assume they can't look at secret items!
        }
        return items;
    }

    onItemsSnapshot(gameId, callback, getSecretItemsToo = false, errorCallback = () => {}) {
        return onSnapshot(
            this.createItemsQuery(gameId, getSecretItemsToo),
            async (itemDocs) => {
                const items = itemDocs.docs.map(doc => 
                    new Item(gameId, doc.id, doc.data()));
                await callback(items);
            }, 
            async (error) => { await errorCallback(error)}
        )
    }
}

export default new StoreService();