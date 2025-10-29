import { db } from '../config/firebase.js';
import { collection, query, where, getDocs } from 'https://www.gstatic.com/firebasejs/12.4.0/firebase-firestore.js';
import Item from '../models/Item.js';
import Character from '../models/Character.js';
import GameService from './game.js';

class StoreService {
    async getAvailableItems(gameId, character) {
        const itemsRef = collection(db, 'items');
        const q = query(itemsRef, where('gameId', '==', gameId));
        const querySnapshot = await getDocs(q);

        const items = [];
        querySnapshot.forEach(doc => {
            const item = new Item(doc.id, doc.data());
            // Only show secret items if character has access
            if (!item.isSecret || character.canAccessSecret) {
                items.push(item);
            }
        });

        return items;
    }

    async purchaseItem(character, item, quantity = 1) {
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
        await character.addItem(item.itemNumber.toString());

        // Log the transaction
        await GameService.logAction(
            character.userId,
            character.characterId,
            'purchaseItem',
            `${item.itemId},${quantity}`
        );

        return {
            success: true,
            newBalance: character.gold,
            itemsPurchased: quantity
        };
    }

    async getCharacterInventory(character) {
        if (!character.items) return [];

        const itemNumbers = character.items.split(',');
        const itemsRef = collection(db, 'items');
        const q = query(itemsRef, where('gameId', '==', character.gameId));
        const querySnapshot = await getDocs(q);

        const inventory = [];
        querySnapshot.forEach(doc => {
            const item = new Item(doc.id, doc.data());
            if (itemNumbers.includes(item.itemNumber.toString())) {
                inventory.push(item);
            }
        });

        return inventory;
    }
}

export default new StoreService();