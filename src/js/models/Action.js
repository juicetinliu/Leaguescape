import { db } from '../config/firebase.js';
import { doc, collection, addDoc, query, where, getDocs, orderBy, serverTimestamp } from 'https://www.gstatic.com/firebasejs/12.4.0/firebase-firestore.js';

class Action {
    constructor(gameId, actionId, data = {}) {
        this.gameId = gameId;
        this.actionId = actionId;
        this.playerId = data.playerId || '';
        this.characterId = data.characterId || '';
        this.actionType = data.actionType || '';
        this.actionDetails = data.actionDetails || '';
        this.activityTime = data.activityTime || null;
    }

    static async create(gameId, actionData) {
        const action = new Action(gameId, '', {
            ...actionData,
            activityTime: serverTimestamp()
        });
        
        const docRef = await addDoc(collection(db, `games/${gameId}/actions`), {
            playerId: action.playerId,
            characterId: action.characterId,
            actionType: action.actionType,
            actionDetails: action.actionDetails,
            activityTime: action.activityTime
        });

        action.actionId = docRef.id;
        return action;
    }

    static async getGameActions(gameId) {
        const actionsRef = collection(db, `games/${gameId}/actions`);
        const q = query(actionsRef, orderBy('activityTime', 'desc'));
        const snapshot = await getDocs(q);
        
        return snapshot.docs.map(doc => new Action(gameId, doc.id, doc.data()));
    }

    static async getCharacterActions(gameId, characterId) {
        const actionsRef = collection(db, `games/${gameId}/actions`);
        const q = query(
            actionsRef,
            where('characterId', '==', characterId),
            orderBy('activityTime', 'desc')
        );
        const snapshot = await getDocs(q);
        
        return snapshot.docs.map(doc => new Action(gameId, doc.id, doc.data()));
    }

    static async getPlayerActions(gameId, playerId) {
        const actionsRef = collection(db, `games/${gameId}/actions`);
        const q = query(
            actionsRef,
            where('playerId', '==', playerId),
            orderBy('activityTime', 'desc')
        );
        const snapshot = await getDocs(q);
        
        return snapshot.docs.map(doc => new Action(gameId, doc.id, doc.data()));
    }
}

export default Action;