import IndexPage from '../../pages/index.js';
import InfoPage from '../../pages/info.js';
import UserPage from '../../pages/user.js';
import AdminPage from '../../pages/admin.js';
import LobbyPage from '../../pages/lobby.js';
import LoginPage from '../../pages/login.js';
import CharacterPage from '../../pages/character.js';
import ShopPage from '../../pages/shop.js';
import BankPage from '../../pages/bank.js';
import InventoryPage from '../../pages/inventory.js';
import CreditsPage from '../../pages/credits.js';
import AuthService from '../services/auth.js';
import { PAGES } from '../models/Enums.js';

class Router {
    constructor() {
        this.routes = {
            [PAGES.index]: {
                page: IndexPage,
                requiresAuth: false
            },
            [PAGES.info]: {
                page: InfoPage,
                requiresAuth: false
            },
            [PAGES.user]: {
                page: UserPage,
                requiresAuth: true
            },
            [PAGES.admin]: {
                page: AdminPage,
                requiresAuth: true
            },
            [PAGES.lobby]: {
                page: LobbyPage,
                requiresAuth: true
            },
            [PAGES.login]: {
                page: LoginPage,
                requiresAuth: true
            },
            [PAGES.character]: {
                page: CharacterPage,
                requiresAuth: true
            },
            [PAGES.shop]: {
                page: ShopPage,
                requiresAuth: true
            },
            [PAGES.bank]: {
                page: BankPage,
                requiresAuth: true
            },
            [PAGES.inventory]: {
                page: InventoryPage,
                requiresAuth: true
            },
            [PAGES.credits]: {
                page: CreditsPage,
                requiresAuth: true
            }
        };
        this.prevRoute = null;
    }

    init() {
        this.prevRoute = null;
        window.addEventListener('popstate', () => this.handleRoute());
        this.handleRoute();
    }

    async handleRoute() {
        const params = new URLSearchParams(window.location.search);
        const page = params.get('page') || PAGES.index;
        const route = this.routes[page];

        if (!route) {
            window.location.href = `?page=${PAGES.index}`;
            return;
        }

        if (route.requiresAuth && !AuthService.isAuthenticated()) {
            let retries = 5;

            var retryFunction = async () => {
                // Give time for auth state to update and then direct to the route.
                if (AuthService.isAuthenticated()) {
                    setTimeout(async () => { 
                        await this._showPage(route);
                    }, 500)
                } else if (retries > 0) {
                    console.log("pending auth, retrying...", retries);
                    retries--;
                    setTimeout(retryFunction, 100);
                } else {
                    window.location.href = `?page=${PAGES.index}`;
                }
            };

            await retryFunction();
            return;
        }

        await this._showPage(route);
    }

    async _showPage(route) {
        this.prevRoute = route;
        await route.page.show();
    }

    
    navigate(path) {
        if (this.prevRoute) this.prevRoute.page.cleanup();
        const newPath = `?page=${path}`;
        window.history.pushState({}, '', newPath);
        this.handleRoute();
    }
}

export const router = new Router();