import IndexPage from '../../pages/index.js';
import InfoPage from '../../pages/info.js';
import UserPage from '../../pages/user.js';
import AdminPage from '../../pages/admin.js';
import LobbyPage from '../../pages/lobby.js';
import AuthService from '../services/auth.js';

class Router {
    constructor() {
        this.routes = {
            '/': {
                page: IndexPage,
                requiresAuth: false
            },
            '/info': {
                page: InfoPage,
                requiresAuth: false
            },
            '/user': {
                page: UserPage,
                requiresAuth: true
            },
            '/admin': {
                page: AdminPage,
                requiresAuth: true
            },
            '/lobby': {
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
        const path = window.location.pathname;
        const route = this.routes[path];

        if (!route) {
            // Handle 404
            window.location.href = '/';
            return;
        }

        if (route.requiresAuth && !AuthService.isAuthenticated()) {
            window.location.href = '/';
            return;
        }

        // Show the page
        await route.page.show();
    }

    navigate(path) {
        window.history.pushState({}, '', path);
        this.handleRoute();
    }
}

export const router = new Router();