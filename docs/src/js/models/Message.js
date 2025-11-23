import { db } from '../config/firebase.js';
import { doc, collection, addDoc, query, where, getDocs, orderBy, serverTimestamp, updateDoc } from 'https://www.gstatic.com/firebasejs/12.4.0/firebase-firestore.js';
import { MessageTo }  from './MessageTypes.js';


//TODO: validate messageData based on messageType
// Unlike Actions, messages are used for action game processing between players and admin.
// Probably should keep messages within characters instead of players for a truly secure experience...
class Message {
    constructor(gameId, messageId, data = {}) {
        this.gameId = gameId;
        this.messageId = messageId;
        this.playerId = data.playerId || '';
        this.messageTo = data.messageTo || '';

        // Must be included in messageData
        this.messageType = data.messageType || '';
        this.messageDetails = data.messageDetails || '';
        
        this.activityTime = data.activityTime || null;
        this.processed = false;
    }

    static async create(gameId, playerId, messageData, messageTo = MessageTo.ADMIN) {
        const message = new Message(gameId, 'willBeOverwritten', {
            ...messageData,
            playerId: playerId,
            messageTo: messageTo,
            activityTime: serverTimestamp()
        });

        let docRef;
        if(messageTo === MessageTo.ADMIN) {
            docRef = await addDoc(collection(db, `games/${gameId}/${messageTo}`), {
                fromPlayer: playerId,
                messageType: message.messageType,
                messageDetails: message.messageDetails,
                activityTime: message.activityTime,
                processed: message.processed
            });
        } else {
            docRef = await addDoc(collection(db, `games/${gameId}/players/${playerId}/${messageTo}`), {
                messageType: message.messageType,
                messageDetails: message.messageDetails,
                activityTime: message.activityTime,
                processed: message.processed
            });
        }

        message.messageId = docRef.id;
        return message;
    }

    async markAsProcessed() {
        this.processed = true;
        if(this.messageTo === MessageTo.ADMIN) {
            await updateDoc(doc(db, `games/${this.gameId}/${this.messageTo}`, this.messageId), {
                processed: true
            });
            return;
        } else {
            await updateDoc(doc(db, `games/${this.gameId}/players/${this.playerId}/${this.messageTo}`, this.messageId), {
                processed: true
            });
        }
    }
}

export default Message;