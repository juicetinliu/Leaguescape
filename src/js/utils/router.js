import IndexPage from '../../pages/index.js';
import InfoPage from '../../pages/info.js';
import UserPage from '../../pages/user.js';
import AdminPage from '../../pages/admin.js';
import LobbyPage from '../../pages/lobby.js';
import AuthService from '../services/auth.js';

class Router {
    constructor() {
        this.routes = {
            'index': {
                page: IndexPage,
                requiresAuth: false
            },
            'info': {
                page: InfoPage,
                requiresAuth: false
            },
            'user': {
                page: UserPage,
                requiresAuth: true
            },
            'admin': {
                page: AdminPage,
                requiresAuth: true
            },
            'lobby': {
                page: LobbyPage,
                requiresAuth: true
            }
            // Additional routes will be added here
        };
    }

    init() {
        window.addEventListener('popstate', () => this.handleRoute());
        this.handleRoute();
    }

    async handleRoute() {
        const params = new URLSearchParams(window.location.search);
        const page = params.get('page') || 'index';
        const route = this.routes[page];

        if (!route) {
            window.location.href = '?page=index';
            return;
        }

        if (route.requiresAuth && !AuthService.isAuthenticated()) {
            let retries = 5;

            var retryFunction = async () => {
                // Give time for auth state to update and then direct to the route.
                if (AuthService.isAuthenticated()) {
                    setTimeout(async () => { 
                        await route.page.show();
                    }, 500)
                } else if (retries > 0) {
                    console.log("pending auth, retrying...", retries);
                    retries--;
                    setTimeout(retryFunction, 100);
                } else {
                    window.location.href = '?page=index';
                }
            };

            await retryFunction();
            return;
        }

        await route.page.show();
    }

    
    navigate(path) {
        const newPath = `?page=${path}`;
        window.history.pushState({}, '', newPath);
        this.handleRoute();
    }
}

export const router = new Router();