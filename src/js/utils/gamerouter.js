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
    }
    
    /**
     * return false if redirected, otherwise return currentGame
     */
    async handlePlayerGamePageShow(currentPage) {
        const gameId = new URLSearchParams(window.location.search).get('gameId');
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

        if (this.validGamePagesByState[currentGame.gameState].some(page => currentPage === page)) {
            return currentGame;
        } else {
            router.navigate(this.defaultGamePageByState[currentGame.gameState] + `&gameId=${gameId}`);
            return false;
        }
    }
}

export const gameRouter = new GameRouter();