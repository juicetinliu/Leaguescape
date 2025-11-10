import { db } from '../config/firebase.js';
import { collection, getDocs, query, where, or, orderBy, onSnapshot } from 'https://www.gstatic.com/firebasejs/12.4.0/firebase-firestore.js';
import Item from '../models/Item.js';
import ActionType from '../models/ActionType.js';
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

    onItemsSnapshot(gameId, callback, getSecretItemsToo = false) {
        return onSnapshot(
            this.createItemsQuery(gameId, getSecretItemsToo),
            async (itemDocs) => {
                const items = itemDocs.docs.map(doc => 
                    new Item(gameId, doc.id, doc.data()));
                await callback(items);
            }
        )
    }

    async purchaseItem(gameId, character, item, quantity = 1) {
        // Validate prerequisites
        if (!item.checkPrerequisites(character)) {
            throw new Error('Prerequisites not met');
        }

        // Check quantity available
        if (!item.isAvailable() || item.quantity < quantity) {
            throw new Error('Item not available in requested quantity');
        }

        // Check if character has enough gold
        const totalCost = item.price * quantity;
        if (character.gold < totalCost) {
            throw new Error('Insufficient funds');
        }

        // Process transaction
        await character.updateGold(-totalCost);
        await item.updateQuantity(-quantity);
        await character.addItem(item.itemId);

        // Log the transaction
        await GameService.logAction(gameId,
            { 
                characterId: character.characterId,
                actionType: ActionType.PURCHASE_ITEM,
                actionDetails: `${item.itemId},${quantity}`
            }
        );

        return {
            success: true,
            newBalance: character.gold,
            itemsPurchased: quantity
        };
    }

    async getCharacterInventory(gameId, character) {
        if (!character.items || character.items.length === 0) return [];

        const itemsRef = collection(db, `games/${gameId}/items`);
        const querySnapshot = await getDocs(itemsRef);

        const inventory = [];
        querySnapshot.forEach(doc => {
            const item = new Item(gameId, doc.id, doc.data());
            if (character.items.includes(item.itemId)) {
                inventory.push(item);
            }
        });

        return inventory;
    }
}

export default new StoreService();