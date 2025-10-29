import { db } from '../config/firebase.js';
import { collection, query, where, getDocs, addDoc, doc, updateDoc } from 'https://www.gstatic.com/firebasejs/12.4.0/firebase-firestore.js';
import Game from '../models/Game.js';

class GameService {
    async createGame(adminId) {
        const game = await Game.create(adminId);
        return game;
    }

    async joinGame(gameId, password, userId) {
        const game = await Game.get(gameId);
        if (!game) throw new Error('Game not found');
        if (game.gamePassword !== password) throw new Error('Invalid password');

        // Create player record
        await addDoc(collection(db, 'players'), {
            playerId: `${userId}_${gameId}`,
            gameId: gameId,
            authId: userId,
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
        const playersRef = collection(db, 'players');

        // Get games where user is admin
        const adminGamesQuery = query(gamesRef, where('adminId', '==', userId));
        const adminGames = await getDocs(adminGamesQuery);

        // Get games where user is player
        const playerGamesQuery = query(playersRef, where('authId', '==', userId));
        const playerGames = await getDocs(playerGamesQuery);

        const games = [];
        
        // Add admin games
        for (const doc of adminGames.docs) {
            games.push(new Game(doc.id, doc.data()));
        }

        // Add player games
        for (const doc of playerGames.docs) {
            const game = await Game.get(doc.data().gameId);
            if (game && !games.find(g => g.gameId === game.gameId)) {
                games.push(game);
            }
        }

        return games;
    }

    async banPlayer(gameId, playerId) {
        const playerRef = doc(db, 'players', playerId);
        await updateDoc(playerRef, {
            isBanned: true
        });
    }

    async logAction(playerId, characterId, actionType, actionDetails) {
        await addDoc(collection(db, 'characterActions'), {
            playerId,
            characterId,
            actionType,
            actionDetails,
            activityTime: Date.now()
        });
    }
}

export default new GameService();