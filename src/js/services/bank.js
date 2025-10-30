import { db } from '../config/firebase.js';
import { collection, query, where, getDocs } from 'https://www.gstatic.com/firebasejs/12.4.0/firebase-firestore.js';
import Character from '../models/Character.js';
import GameService from './game.js';

class BankService {
    async getBalance(gameId, characterId) {
        const character = await Character.get(gameId, characterId);
        if (!character) throw new Error('Character not found');
        return character.gold;
    }

    async deposit(gameId, character, amount) {
        if (amount <= 0) throw new Error('Invalid amount');

        await character.updateGold(amount);
        
        await GameService.logAction(
            character.userId,
            character.characterId,
            'depositGold',
            amount.toString()
        );

        return character.gold;
    }

    async withdraw(gameId, character, amount) {
        if (amount <= 0) throw new Error('Invalid amount');
        if (character.gold < amount) throw new Error('Insufficient funds');

        await character.updateGold(-amount);
        
        await GameService.logAction(
            character.userId,
            character.characterId,
            'withdrawGold',
            amount.toString()
        );

        return character.gold;
    }

    async getTransactionHistory(gameId, character) {
        const actionsRef = collection(db, `games/${gameId}/actions`);
        const q = query(
            actionsRef, 
            where('characterId', '==', character.characterId),
            where('actionType', 'in', ['depositGold', 'withdrawGold', 'purchaseItem'])
        );
        
        const querySnapshot = await getDocs(q);
        const transactions = [];
        
        querySnapshot.forEach(doc => {
            transactions.push({
                type: doc.data().actionType,
                amount: doc.data().actionDetails,
                timestamp: doc.data().activityTime
            });
        });

        return transactions.sort((a, b) => b.timestamp - a.timestamp);
    }
}

export default new BankService();