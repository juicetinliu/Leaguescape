import { db } from '../config/firebase.js';
import { collection, query, where, getDocs, addDoc, doc, updateDoc, setDoc, getDoc, deleteDoc } from 'https://www.gstatic.com/firebasejs/12.4.0/firebase-firestore.js';
import Game from '../models/Game.js';
import Character from '../models/Character.js';
import Item from '../models/Item.js';
import Action from '../models/Action.js';
import ActionType from '../models/ActionType.js';
import AuthService from '../services/auth.js';

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
            canAccessSecret: false,
            playerName: username
        });

        return game;
    }

    async isAdmin(gameId, userId) {
        const game = await this.getGame(gameId);
        return game.adminId === userId;
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

    async unBanPlayer(gameId, playerId) {
        const playerRef = doc(db, `games/${gameId}/players/${playerId}`);
        await updateDoc(playerRef, {
            isBanned: false
        });
    }

    async kickPlayer(gameId, playerId) {
        const playerRef = doc(db, `games/${gameId}/players/${playerId}`);
        await deleteDoc(playerRef);
    }

    async togglePlayerSecretAccess(gameId, playerId, canAccess) {
        const playerRef = doc(db, `games/${gameId}/players/${playerId}`);
        await updateDoc(playerRef, {
            canAccessSecret: canAccess
        });
    }

    async updatePlayerName(gameId, playerId, newName) {
        const playerRef = doc(db, `games/${gameId}/players/${playerId}`);
        const playerDoc = await getDoc(playerRef);
        if (playerDoc.exists()) {
            await updateDoc(playerRef, { playerName: newName });
        } else {
            await setDoc(playerRef, { playerName: newName }, { merge: true });
        }
    }

    async logAction(gameId, actionData) {
        const action = {
            ...actionData,
            playerId: AuthService.currentUser.authId
        }
        return await Action.create(gameId, action);
    }

    async getGamePlayers(gameId) {
        const playersRef = collection(db, `games/${gameId}/players`);
        const players = await getDocs(playersRef);
        return players.docs.map(doc => ({ playerId: doc.id, ...doc.data() }));
    }

    async getGameCharacters(gameId) {
        const charactersRef = collection(db, `games/${gameId}/characters`);
        const characters = await getDocs(charactersRef);
        return characters.docs.map(doc => 
            new Character(gameId, doc.id, doc.data())
        );
    }

    async getGameItems(gameId) {
        const itemsRef = collection(db, `games/${gameId}/items`);
        const items = await getDocs(itemsRef);
        return items.docs.map(doc => 
            new Item(gameId, doc.id, doc.data())
        );
    }

    async createCharacter(gameId, characterData) {
        return await Character.create(gameId, characterData);
    }

    async createItem(gameId, itemData) {
        return await Item.create(gameId, itemData);
    }

    async deleteCharacter(gameId, characterId) {
        const character = await Character.get(gameId, characterId);
        await character.delete();
    }

    async deleteItem(gameId, itemId) {
        const item = await Item.get(gameId, itemId);
        await item.delete();
    }

    async updateCharacter(gameId, characterId, characterData) {
        const character = await Character.get(gameId, characterId);
        await character.update(characterData);
    }

    async updateItem(gameId, itemId, itemData) {
        const item = await Item.get(gameId, itemId);
        await item.update(itemData);
    }

    getCurrentGameId() {
        // Extract game ID from URL parameters
        const urlParams = new URLSearchParams(window.location.search);
        return urlParams.get('gameId');
    }
}

export default new GameService();