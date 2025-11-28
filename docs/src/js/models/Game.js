import { db } from '../config/firebase.js';
import { doc, getDoc, setDoc, updateDoc, serverTimestamp } from 'https://www.gstatic.com/firebasejs/12.4.0/firebase-firestore.js';
import { GAME_STATE } from './Enums.js';

const DEFAULT_GAME_DURATION = 60 * 60 * 1000; // 1 hour fixed duration

class Game {
    constructor(gameId, data = {}) {
        this.gameId = gameId;
        this.createdTime = data.createdTime || null;
        this.startTime = data.startTime || null;
        this.endTime = data.endTime || null;
        this.adminId = data.adminId || '';
        this.gameDuration = data.gameDuration || DEFAULT_GAME_DURATION;
        this.gameState = data.gameState || GAME_STATE.SETUP;
    }

    static async create(adminId) {
        const gameId = crypto.randomUUID();
        
        const game = new Game(gameId, {
            adminId,
            createdTime: serverTimestamp(),
            gameState: GAME_STATE.SETUP
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
            gameDuration: this.gameDuration,
            gameState: this.gameState
        });
    }

    async updateDuration(newDuration) {
        this.gameDuration = newDuration;
        await updateDoc(doc(db, 'games', this.gameId), {
            gameDuration: this.gameDuration
        });
    }

    async updateState(newState) {
        if (!Object.values(GAME_STATE).includes(newState)) {
            throw new Error('Invalid game state: ' + newState);
        }

        this.gameState = newState;
        if (newState === GAME_STATE.RUNNING) this.startTime = serverTimestamp();
        if (newState === GAME_STATE.END) this.endTime = serverTimestamp();

        await updateDoc(doc(db, 'games', this.gameId), {
            gameState: this.gameState,
            startTime: this.startTime,
            endTime: this.endTime
        });
    }
}

export default Game;