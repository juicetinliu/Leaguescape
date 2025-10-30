import { db } from '../config/firebase.js';
import { doc, getDoc, setDoc, updateDoc, serverTimestamp } from 'https://www.gstatic.com/firebasejs/12.4.0/firebase-firestore.js';

class Game {
    constructor(gameId, data = {}) {
        this.gameId = gameId;
        this.createdTime = data.createdTime || null;
        this.startTime = data.startTime || null;
        this.endTime = data.endTime || null;
        this.adminId = data.adminId || '';
        this.gameState = data.gameState || 'setup';
    }

    static async create(adminId) {
        const gameId = crypto.randomUUID();
        
        const game = new Game(gameId, {
            adminId,
            createdTime: serverTimestamp(),
            gameState: 'setup'
        });

        await game.save();
        return game;
    }

    static async get(gameId) {
        const gameDoc = await getDoc(doc(db, 'games', gameId));
        if (!gameDoc.exists()) return null;
        return new Game(gameDoc.id, gameDoc.data());
    }

    async save() {
        await setDoc(doc(db, 'games', this.gameId), {
            createdTime: this.createdTime || serverTimestamp(),
            startTime: this.startTime,
            endTime: this.endTime,
            adminId: this.adminId,
            gameState: this.gameState
        });
    }

    async updateState(newState) {
        if (!['setup', 'running', 'end'].includes(newState)) {
            throw new Error('Invalid game state');
        }

        this.gameState = newState;
        if (newState === 'running') this.startTime = serverTimestamp();
        if (newState === 'end') this.endTime = serverTimestamp();

        await updateDoc(doc(db, 'games', this.gameId), {
            gameState: this.gameState,
            startTime: this.startTime,
            endTime: this.endTime
        });
    }
}

export default Game;