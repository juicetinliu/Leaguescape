import { db } from '../config/firebase.js';
import { collection, query, where, getDocs, addDoc, doc, updateDoc, setDoc, getDoc, deleteDoc } from 'https://www.gstatic.com/firebasejs/12.4.0/firebase-firestore.js';
import Game from '../models/Game.js';

class GameService {
    async createGame(adminId) {
        const game = await Game.create(adminId);
        return game;
    }

    async joinGame(gameId, userId, username) {
        const game = await Game.get(gameId);
        if (!game) throw new Error('Game not found');

        // Create player record in game's players subcollection using userId as the document ID
        await setDoc(doc(db, `games/${gameId}/players`, userId), {
            isBanned: false,
            assumedCharacterId: '',
            playername: username
        });

        return game;
    }

    async isPlayer(gameId, userId) {
        let hasJoined = false;
        try {
            const playerDoc = await getDoc(doc(db, `games/${gameId}/players`, userId));
            hasJoined = playerDoc.exists();
        } catch (error) {
            // If there's an error (e.g., permission denied), we can assume they aren't a player
        }
        return hasJoined
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
            
            // Check if user exists as a player document directly by ID. If there's a firebase read error, it means they're not a player - we can skip.
            try {
                const playerDoc = doc(db, `games/${gameDoc.id}/players`, userId);
                const playerSnapshot = await getDoc(playerDoc);
                
                if (playerSnapshot.exists()) {
                    console.log('Adding game for user:', gameDoc.id);
                    games.push(new Game(gameDoc.id, gameDoc.data()));
                }
            } catch (error) {}
        }

        return games;
    }

    async banPlayer(gameId, playerId) {
        const playerRef = doc(db, `games/${gameId}/players/${playerId}`);
        await updateDoc(playerRef, {
            isBanned: true
        });
    }

    async kickPlayer(gameId, playerId) {
        const playerRef = doc(db, `games/${gameId}/players/${playerId}`);
        await deleteDoc(playerRef);
    }

    async updatePlayerName(gameId, playerId, newName) {
        const playerRef = doc(db, `games/${gameId}/players/${playerId}`);
        await updateDoc(playerRef, {
            playername: newName
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

    async getGamePlayers(gameId) {
        const playersRef = collection(db, `games/${gameId}/players`);
        const players = await getDocs(playersRef);
        return players.docs.map(doc => ({ playerId: doc.id, ...doc.data() }));
    }

    async getGameCharacters(gameId) {
        const charactersRef = collection(db, `games/${gameId}/characters`);
        const characters = await getDocs(charactersRef);
        return characters.docs.map(doc => ({ characterId: doc.id, ...doc.data() }));
    }

    async getGameItems(gameId) {
        const itemsRef = collection(db, `games/${gameId}/items`);
        const items = await getDocs(itemsRef);
        return items.docs.map(doc => ({ itemId: doc.id, ...doc.data() }));
    }

    async createCharacter(gameId, characterData) {
        const charactersRef = collection(db, `games/${gameId}/characters`);
        const docRef = await addDoc(charactersRef, characterData);
        return { characterId: docRef.id, ...characterData };
    }

    async createItem(gameId, itemData) {
        const itemsRef = collection(db, `games/${gameId}/items`);
        const docRef = await addDoc(itemsRef, itemData);
        return { itemId: docRef.id, ...itemData };
    }

    async deleteCharacter(gameId, characterId) {
        await deleteDoc(doc(db, `games/${gameId}/characters`, characterId));
    }

    async deleteItem(gameId, itemId) {
        await deleteDoc(doc(db, `games/${gameId}/items`, itemId));
    }

    async updateCharacter(gameId, characterId, characterData) {
        await updateDoc(doc(db, `games/${gameId}/characters`, characterId), characterData);
    }

    async updateItem(gameId, itemId, itemData) {
        await updateDoc(doc(db, `games/${gameId}/items`, itemId), itemData);
    }

    getCurrentGameId() {
        // Extract game ID from URL parameters
        const urlParams = new URLSearchParams(window.location.search);
        return urlParams.get('gameId');
    }
}

export default new GameService();