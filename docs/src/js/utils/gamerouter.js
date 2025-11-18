import AuthService from '../services/auth.js';
import { router } from './router.js';
import GameService from '../services/game.js';
import { GAME_STATE, PAGES } from '../models/Enums.js';

class GameRouter {
    constructor() {
        this.validGamePagesByState = {
            [GAME_STATE.SETUP]: [PAGES.lobby],
            [GAME_STATE.RUNNING]: [PAGES.login, PAGES.character, PAGES.shop, PAGES.bank, PAGES.inventory],
            [GAME_STATE.END]: [PAGES.credits]
        };

        this.defaultGamePageByState = {
            [GAME_STATE.SETUP]: PAGES.lobby,
            [GAME_STATE.RUNNING]: PAGES.login,
            [GAME_STATE.END]: PAGES.credits
        };

        this.validGamePagesForLoginMode = {
            inventory: [PAGES.login, PAGES.character, PAGES.inventory],
            secret: [PAGES.login, PAGES.character, PAGES.shop, PAGES.bank, PAGES.inventory],
            normal: [PAGES.login, PAGES.character, PAGES.shop, PAGES.bank, PAGES.inventory]
        }
    }
    
    /**
     * return false if redirected, otherwise return currentGame
     */
    async handlePlayerGamePageShow(currentPage) {
        const gameId = GameService.getCurrentGameId();
        if (!gameId) {
            router.navigate(PAGES.user);
            return false;
        }

        const currentGame = await GameService.getGame(gameId);
        if (!currentGame) {
            router.navigate(PAGES.user);
            return false;
        }

        const userId = AuthService.currentUser.authId;
        if (!(await GameService.isPlayer(gameId, userId))) {
            router.navigate(PAGES.user);
            return false;
        }

        if (await GameService.isAdmin(gameId, userId)) {
            router.navigate(`${PAGES.admin}&gameId=${gameId}`);
            return false;
        }

        if (!this.validGamePagesByState[currentGame.gameState].some(page => currentPage === page)) {
            router.navigate(this.defaultGamePageByState[currentGame.gameState] + `&gameId=${gameId}`);
            return false;
        }
        return currentGame;
    }

    async handleCharacterGamePageShow(gameId, currentPage) {
        const characterId = new URLSearchParams(window.location.search).get('characterId');
        let currentCharacter = null;
        try {
            currentCharacter = await GameService.getGameCharacter(gameId, characterId);
        } catch (error) { 
            // Ignore error - this means they didn't assume the character (no permissions!)
        }
        if (!currentCharacter) {
            router.navigate(`${PAGES.login}&gameId=${gameId}`);
            return false;
        }

        const playerId = AuthService.currentUser.authId;
        const playerData = await GameService.getPlayerData(gameId, playerId);
        if(!this.validGamePagesForLoginMode[playerData.loginMode].some(page => currentPage === page)) {
            router.navigate(`${PAGES.character}&gameId=${gameId}&characterId=${characterId}`);
            return false;
        }
        return currentCharacter;
    }
}

export const gameRouter = new GameRouter();