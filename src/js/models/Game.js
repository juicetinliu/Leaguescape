import { db } from '../config/firebase.js';
import { doc, getDoc, setDoc, updateDoc } from 'https://www.gstatic.com/firebasejs/12.4.0/firebase-firestore.js';

class Game {
    constructor(gameId, data = {}) {
        this.gameId = gameId;
        this.gamePassword = data.gamePassword || '';
        this.createdTime = data.createdTime || Date.now();
        this.startTime = data.startTime || null;
        this.endTime = data.endTime || null;
        this.adminId = data.adminId || '';
        this.gameState = data.gameState || 'setup';
    }

    static async create(adminId) {
        const gameId = crypto.randomUUID();
        const gamePassword = Math.random().toString(36).slice(-8);
        
        const game = new Game(gameId, {
            gamePassword,
            adminId,
            createdTime: Date.now(),
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
            gamePassword: this.gamePassword,
            createdTime: this.createdTime,
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
        if (newState === 'running') this.startTime = Date.now();
        if (newState === 'end') this.endTime = Date.now();

        await updateDoc(doc(db, 'games', this.gameId), {
            gameState: this.gameState,
            startTime: this.startTime,
            endTime: this.endTime
        });
    }

    async updatePassword(newPassword) {
        this.gamePassword = newPassword;
        await updateDoc(doc(db, 'games', this.gameId), {
            gamePassword: this.gamePassword
        });
    }
}

export default Game;