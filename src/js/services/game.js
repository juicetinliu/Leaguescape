import { db } from '../config/firebase.js';
import { collection, query, where, getDocs, addDoc, doc, updateDoc } from 'https://www.gstatic.com/firebasejs/12.4.0/firebase-firestore.js';
import Game from '../models/Game.js';

class GameService {
    async createGame(adminId) {
        const game = await Game.create(adminId);
        return game;
    }

    async joinGame(gameId, userId) {
        const game = await Game.get(gameId);
        if (!game) throw new Error('Game not found');

        // Create player record in game's players subcollection
        await addDoc(collection(db, `games/${gameId}/players`), {
            playerId: userId,  // Using just userId as it's already in the game context
            isBanned: false,
            assumedCharacterId: ''
        });

        return game;
    }

    async getGame(gameId) {
        return await Game.get(gameId);
    }

    async getUserGames(userId) {
        const gamesRef = collection(db, 'games');
        const games = [];
        
        // Get games where user is admin
        const adminGamesQuery = query(gamesRef, where('adminId', '==', userId));
        const adminGames = await getDocs(adminGamesQuery);
        
        // Add admin games
        for (const gameDoc of adminGames.docs) {
            games.push(new Game(gameDoc.id, gameDoc.data()));
        }

        // Get all games and check their players subcollections for this user
        const allGamesQuery = query(gamesRef);
        const allGames = await getDocs(allGamesQuery);

        for (const gameDoc of allGames.docs) {
            if (games.find(g => g.gameId === gameDoc.id)) continue; // Skip if already added as admin
            
            const playersRef = collection(db, `games/${gameDoc.id}/players`);
            const playerQuery = query(playersRef, where('playerId', '==', userId));
            const playerDocs = await getDocs(playerQuery);
            
            if (!playerDocs.empty) {
                games.push(new Game(gameDoc.id, gameDoc.data()));
            }
        }

        return games;
    }

    async banPlayer(gameId, playerId) {
        const playerRef = doc(db, `games/${gameId}/players/${playerId}`);
        await updateDoc(playerRef, {
            isBanned: true
        });
    }

    async logAction(playerId, characterId, actionType, actionDetails) {
        const gameId = this.getCurrentGameId();
        if (!gameId) throw new Error('No active game found');

        await addDoc(collection(db, `games/${gameId}/actions`), {
            playerId,
            characterId,
            actionType,
            actionDetails,
            activityTime: Date.now()
        });
    }

    getCurrentGameId() {
        // Extract game ID from URL parameters
        const urlParams = new URLSearchParams(window.location.search);
        return urlParams.get('gameId');
    }
}

export default new GameService();