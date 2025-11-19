import { db } from '../config/firebase.js';
import { collection, query, where, getDocs, addDoc, doc, updateDoc, setDoc, orderBy, deleteDoc, onSnapshot } from 'https://www.gstatic.com/firebasejs/12.4.0/firebase-firestore.js';
import Game from '../models/Game.js';
import Character from '../models/Character.js';
import Item from '../models/Item.js';
import Action from '../models/Action.js';
import Message from '../models/Message.js';
import { MessageTo, MessageType } from '../models/MessageTypes.js';
import AuthService from './auth.js';

class MessageService {
    onUnprocessedAdminMessagesSnapshot(gameId, callback) {
        return onSnapshot(
            query(
                collection(db, `games/${gameId}/${MessageTo.ADMIN}`),
                where('processed', '==', false),
                orderBy('activityTime', 'desc')
            ),
            async (messages) => {
                const unprocessedMessages = messages.docs.map(doc => new Message(gameId, doc.id, { ...doc.data(), messageTo: MessageTo.ADMIN, playerId: doc.data().fromPlayer }));
                await callback(unprocessedMessages);
            }
        )
    }

    onUnprocessedPlayerMessagesSnapshot(gameId, callback) {
        const playerId = AuthService.currentUser.authId;
        return onSnapshot(
            query(
                collection(db, `games/${gameId}/players/${playerId}/${MessageTo.PLAYER}`),
                where('processed', '==', false),
                orderBy('activityTime', 'desc')
            ),
            async (messages) => {
                const unprocessedMessages = messages.docs.map(doc => new Message(gameId, doc.id, { ...doc.data(), messageTo: MessageTo.PLAYER, playerId: playerId }));
                await callback(unprocessedMessages);
            }
        )
    }

    //unused?
    async getUnprocessedAdminMessagesFromPlayer(gameId, playerId, messageType) {
        const q = messageType ? query(
            collection(db, `games/${gameId}/${MessageTo.ADMIN}`),
            where('fromPlayer', '==', playerId),
            where('processed', '==', false),
            where('messageType', '==', messageType),
            orderBy('activityTime', 'desc')
        ) : query(
            collection(db, `games/${gameId}/${MessageTo.ADMIN}`),
            where('fromPlayer', '==', playerId),
            where('processed', '==', false),
            orderBy('activityTime', 'desc')
        );
        const snapshot = await getDocs(q);
        return snapshot.docs.map(doc => new Message(gameId, doc.id, { ...doc.data(), messageTo: MessageTo.ADMIN, playerId: doc.data().fromPlayer }));
    }

    /**
     * ONLY used by the admin - to send a message for processing to a specific player
     * @param {*} gameId 
     * @param {*} messageData 
     *  * `messageType`: mandatory - MessageType
     *  * `messageDetails`: optional - map of any necessary details
     * @param {*} playerId 
     * @returns 
     */
    async sendAdminMessageToPlayer(gameId, messageData, playerId) {
        return await Message.create(gameId, playerId, messageData, MessageTo.PLAYER);
    }

    /**
     * ONLY used by players - to send a message for processing to the admin
     * @param {*} gameId 
     * @param {*} messageData 
     *  * `messageType`: mandatory - MessageType
     *  * `messageDetails`: optional - map of any necessary details
     * @returns 
     */
    async sendPlayerMessageToAdmin(gameId, messageData) {
        const playerId = AuthService.currentUser.authId;
        return await Message.create(gameId, playerId, messageData, MessageTo.ADMIN);
    }
}

export default new MessageService();