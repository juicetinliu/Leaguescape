import { db } from '../config/firebase.js';
import { collection, query, where, getDocs, addDoc, doc, updateDoc, setDoc, getDoc, deleteDoc, onSnapshot } from 'https://www.gstatic.com/firebasejs/12.4.0/firebase-firestore.js';
import Game from '../models/Game.js';
import Character from '../models/Character.js';
import Item from '../models/Item.js';
import Action from '../models/Action.js';
import Message from '../models/Message.js';
import { MessageTo, MessageType } from '../models/MessageTypes.js';
import ActionType from '../models/ActionType.js';
import AuthService from '../services/auth.js';
import MessageService from '../services/message.js';

class GameService {
    createPlayerRef(gameId, playerId) {
        return doc(db, `games/${gameId}/players/${playerId}`);
    }

    createPlayerPrivateDataRef(gameId, playerId) {
        return doc(db, `games/${gameId}/players/${playerId}/privateDetails/data`);
    }

    async createGame(adminId) {
        const game = await Game.create(adminId);
        return game;
    }

    async joinGame(gameId, userId, username) {
        const game = await Game.get(gameId);
        if (!game) throw new Error('Game not found');

        // Create player record in game's players subcollection using userId as the document ID
        await setDoc(doc(db, `games/${gameId}/players`, userId), {
            playerName: username
        });

        const privateDetailsRef = doc(db, `games/${gameId}/players/${userId}/privateDetails`, 'data');
        await setDoc(privateDetailsRef, {
            isBanned: false,
            assumedCharacterId: '',
            loginMode: 'normal'
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
        return hasJoined;
    }

    async getGame(gameId) {
        return await Game.get(gameId);
    }

    onGameSnapshot(gameId, callback) {
        return onSnapshot(doc(db, 'games', gameId), async (gameDoc) => {
            
            await callback(gameDoc.data());
        });
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
        // This should only be called by admin, firestore rules will enforce this
        const playerRef = this.createPlayerPrivateDataRef(gameId, playerId)
        await updateDoc(playerRef, {
            isBanned: true
        });
    }

    async unBanPlayer(gameId, playerId) {
        // This should only be called by admin, firestore rules will enforce this
        const playerRef = this.createPlayerPrivateDataRef(gameId, playerId)
        await updateDoc(playerRef, {
            isBanned: false
        });
    }

    async kickPlayer(gameId, playerId) {
        const playerPrivateRef = this.createPlayerPrivateDataRef(gameId, playerId)
        await deleteDoc(playerPrivateRef);
        const playerRef = this.createPlayerRef(gameId, playerId);
        await deleteDoc(playerRef);
    }

    async updatePlayerName(gameId, playerId, newName) {
        const playerRef = this.createPlayerRef(gameId, playerId);
        const playerDoc = await getDoc(playerRef);
        if (playerDoc.exists()) {
            await updateDoc(playerRef, { playerName: newName });
        } else {
            await setDoc(playerRef, { playerName: newName }, { merge: true });
        }
    }

    async updatePlayerAssumedCharacter(gameId, playerId, characterId) {
        const playerRef = this.createPlayerPrivateDataRef(gameId, playerId)
        await updateDoc(playerRef, {
            assumedCharacterId: characterId
        });
        await this.logAction(gameId, {
            actionType: ActionType.ASSUME_CHARACTER,
            characterId: characterId,
        }, playerId);
    }

    async clearPlayerAssumedCharacter(gameId, playerId, characterId) {
        const playerRef = this.createPlayerPrivateDataRef(gameId, playerId)
        await updateDoc(playerRef, {
            assumedCharacterId: ''
        });
        await this.logAction(gameId, {
            actionType: ActionType.UNASSUME_CHARACTER,
            characterId: characterId,
        }, playerId);
    }

    async updatePlayerLoginMode(gameId, playerId, loginMode) {
        // This should only be called by admin, firestore rules will enforce this
        const playerRef = this.createPlayerPrivateDataRef(gameId, playerId)
        await updateDoc(playerRef, {
            loginMode: loginMode
        });
    }


    async adminHandlePlayerLogOut(gameId, playerId, characterId, approved, rejectionReason = "") {
        if (approved) {
            await this.clearPlayerAssumedCharacter(gameId, playerId, characterId);
            await MessageService.sendAdminMessageToPlayer(gameId, {
                messageType: MessageType.LOGOUT_SUCCESS
            }, playerId);
        } else {
            await MessageService.sendAdminMessageToPlayer(gameId, {
                messageType: MessageType.LOGOUT_FAILURE,
                messageDetails: { 
                    rejectionReason: rejectionReason 
                }
            }, playerId);
        }
    }

    async adminHandlePlayerLogIn(gameId, playerId, characterId, approved, rejectionReason = "") {
        if (approved) {
            await this.updatePlayerAssumedCharacter(gameId, playerId, characterId);
            await MessageService.sendAdminMessageToPlayer(gameId, {
                messageType: MessageType.LOGIN_SUCCESS,
                messageDetails: { 
                    characterId: characterId 
                }
            }, playerId);
        } else {
            await MessageService.sendAdminMessageToPlayer(gameId, {
                messageType: MessageType.LOGIN_FAILURE,
                messageDetails: { 
                    rejectionReason: rejectionReason 
                }
            }, playerId);
        }
    }

    // Login page actions
    async playerLogIn(gameId, accountNumber, accountPassword) {
        await this.logAction(gameId, {
            actionType: ActionType.LOGIN_CHARACTER,
            actionDetails: { 
                accountNumber: accountNumber, 
                accountPassword: accountPassword 
            }
        });
        await MessageService.sendPlayerMessageToAdmin(gameId, {
            messageType: MessageType.LOGIN_ATTEMPT,
            messageDetails: {
                accountNumber: accountNumber, 
                accountPassword: accountPassword 
            }
        });
    }

    async playerLogOut(gameId, characterId) {
        await this.logAction(gameId, {
            actionType: ActionType.LOGOUT_CHARACTER,
            characterId: characterId
        });
        await MessageService.sendPlayerMessageToAdmin(gameId, {
            messageType: MessageType.LOGOUT_ATTEMPT,
            messageDetails: {
                characterId: characterId
            }
        });
    }

    async getGamePlayers(gameId) {
        const playersRef = collection(db, `games/${gameId}/players`);
        const players = await getDocs(playersRef);
        return await Promise.all(players.docs.map(async (doc) => {
            return await this.getPlayerDetails(gameId, doc);
        }));
    }

    async getPlayerDetails(gameId, playerDoc, fetchPrivateDetails = true) {
        let privateDetails = {};

        if (fetchPrivateDetails) {
            try {
                const privateDetailsRef = collection(db, `games/${gameId}/players/${playerDoc.id}/privateDetails`);
                const privateDetailsDoc = await getDocs(privateDetailsRef);
                privateDetails = privateDetailsDoc.docs[0].data();
            } catch (error) {
                // If there's an error (e.g., permission denied), return empty private details
            }
        }   

        return { 
            playerId: playerDoc.id, 
            ...playerDoc.data(), 
            privateDetails: privateDetails }
    }

    onGamePlayersSnapshot(gameId, callback, fetchPrivateDetails = true) {
        return onSnapshot(collection(db, `games/${gameId}/players`), async (players) => {
            const playerDetails = await Promise.all(players.docs.map(async (doc) => {
                return await this.getPlayerDetails(gameId, doc, fetchPrivateDetails);
            }))

            await callback(playerDetails);
        });
    }

    async getGameCharacters(gameId) {
        const charactersRef = collection(db, `games/${gameId}/characters`);
        const characters = await getDocs(charactersRef);
        return characters.docs.map(doc => 
            new Character(gameId, doc.id, doc.data())
        );
    }

    async getGameCharacter(gameId, characterId) {
        return await Character.get(gameId, characterId);
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

    /** 
     * @param {*} gameId 
     * @param {*} actionData
     *  * `actionType`: mandatory - ActionType
     *  * `characterId`: optional - if related to a character
     *  * `actionDetails`: optional - any other details
     * @param {*} playerIdForAction include if it's for a specific player (should only be used by admin), otherwise keep empty for current player/user
     */
    async logAction(gameId, actionData, playerIdForAction = null) {
        const action = {
            ...actionData,
            playerId: playerIdForAction ? playerIdForAction : AuthService.currentUser.authId
        }
        return await Action.create(gameId, action);
    }
}

export default new GameService();