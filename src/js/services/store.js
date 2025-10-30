import { db } from '../config/firebase.js';
import { collection, getDocs } from 'https://www.gstatic.com/firebasejs/12.4.0/firebase-firestore.js';
import Item from '../models/Item.js';
import Character from '../models/Character.js';
import GameService from './game.js';

class StoreService {
    async getAvailableItems(gameId, character) {
        const itemsRef = collection(db, `games/${gameId}/items`);
        const querySnapshot = await getDocs(itemsRef);

        const items = [];
        querySnapshot.forEach(doc => {
            const item = new Item(gameId, doc.id, doc.data());
            // Only show secret items if character has access
            if (!item.isSecret || character.canAccessSecret) {
                items.push(item);
            }
        });

        return items;
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