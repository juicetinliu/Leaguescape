import Page from '../js/models/Page.js';
import AuthService from '../js/services/auth.js';
import GameService from '../js/services/game.js';
import MessageService from '../js/services/message.js';
import StoreService from '../js/services/store.js';
import { MessageType } from '../js/models/MessageTypes.js';
import { router } from '../js/utils/router.js';
import { PAGES, GAME_STATE } from '../js/models/Enums.js';
import { gameRouter } from '../js/utils/gamerouter.js';
import { gold } from '../js/components/staticComponents.js'

class ShopPage extends Page {
    constructor() {
        super(PAGES.shop);
        this.currentGame = null;
        this.currentCharacter = null;
        this.canAccessSecretShop = false;
        this.items = [];
        this.cart = new Map();

        this.gameUnsubscribe = null;
        this.playerMessageUnsubscribe = null;
        this.itemsUnsubscribe = null;
    }

    async show() {
        super.show();
        this.currentGame = await gameRouter.handlePlayerGamePageShow(this.page);
        if (!this.currentGame) {
            return;
        }

        this.currentCharacter = await gameRouter.handleCharacterGamePageShow(this.currentGame.gameId);
        if (!this.currentCharacter) {
            return;
        }

        const playerData = await GameService.getPlayerData(this.currentGame.gameId, AuthService.currentUser.authId);
        this.canAccessSecretShop = this.currentCharacter.canAccessSecret && (playerData.loginMode === 'secret');

        this.initializeUI();
        await this.attachEventListeners();
    }

    initializeUI() {
        const template = `
            <div id="${this.page}" class="page-container">
                <div class="items-container">
                    <div class="items-header-wrapper">
                        <div class="profile-preview-wrapper">
                            <div class="profile-image-wrapper">
                                <img src=""/>
                            </div>
                            <div class="profile-info-wrapper">
                                <div class="profile-name-text">
                                    ${this.currentCharacter.name}
                                </div>
                                <div class="profile-gold-display">
                                    ${this.currentCharacter.gold}
                                </div>
                            </div>
                        </div>
                        <div class="items-header-heading">ALL ITEMS</div>
                        <button id="backToCharacter" class="text-button">BACK</button>
                    </div>
                    <div id="itemsGrid" class="items-grid">
                        Items will go here
                    </div>
                </div>
                <div class="cart-container">
                    <div class="cart-wrapper">
                        <div class="cart-heading">
                            SHOPPING CART
                        </div>
                        <div class="cart-items-wrapper">
                            Items will go here
                        </div>
                        <div class="cart-total-wrapper">
                            <div class="cart-total-label-wrapper">
                                <span class="cart-total-label">TOTAL</span>
                            </div>
                            <div class="cart-total-amount-wrapper">
                            </div>
                        </div>
                        <div class="cart-footer">
                            <button id="purchaseCart" class="text-button">PURCHASE</button>
                        </div>
                    </div>
                </div>
            </div>
        `;
        
        document.querySelector('#app').innerHTML = template;
    }


    async attachEventListeners() {
        document.getElementById('backToCharacter').addEventListener('click', () => {
            router.navigate(`${PAGES.character}&gameId=${this.currentGame.gameId}&characterId=${this.currentCharacter.characterId}`);
        });

        document.getElementById('purchaseCart').addEventListener('click', () => this.handlePurchase());
                
        if(this.currentGame.gameId) {
            this.gameUnsubscribe = GameService.onGameSnapshot(this.currentGame.gameId, async (gameData) => {
                if (gameData.gameState !== GAME_STATE.RUNNING) {
                    window.location.reload();
                }
            });
            this.setupPlayerMessageUnsubscribe();
            this.setupItemsUnsubscribe();
        }
    }

    async setupItemsUnsubscribe() {
        this.itemsUnsubscribe = StoreService.onItemsSnapshot(this.currentGame.gameId, async (items) => {
            this.items = items;
            await this.loadItems();
            this.updateCartDisplay();
        }, this.canAccessSecretShop);
    }
        
    async setupPlayerMessageUnsubscribe() {
        this.playerMessageUnsubscribe = MessageService.onUnprocessedPlayerMessagesSnapshot(this.currentGame.gameId, async (messages) => {
            // process the last message - the listener will update as messages get processed.
            if (messages && messages.length > 0) {
                const message = messages[messages.length - 1];
                await this.processPlayerMessage(message);
            }
        });
    }

    async processPlayerMessage(message) {
        console.log(message);
        await message.markAsProcessed();
        if (message.messageType === MessageType.LOGOUT_SUCCESS) {
        }
    }

    async loadItems() {
        console.log('Loading Items');
        const grid = document.getElementById('itemsGrid');
        
        const itemsHtml = this.items.map(item => {
            const itemLocked = !item.checkPrerequisites(this.currentCharacter);
            const itemOutOfStock = item.quantity == 0;
            return `
            <div class="item-wrapper ${itemLocked ? 'item-locked' : ''} ${itemOutOfStock ? 'item-oos' : ''}" id="item-wrapper-${item.itemId}">
                <div class="item-add-to-cart-wrapper wrapper">
                    <button class="add-to-cart" data-item-id="${item.itemId}" ${itemLocked || itemOutOfStock ? 'disabled' : ''}></button>
                </div>
                <div class="item-number-wrapper wrapper">
                    <span class="item-number">${item.itemNumber}</span>
                </div>
                <div class="divider"></div>
                <div class="item-info-wrapper wrapper">
                    <div class="item-name-wrapper">
                        <span class="item-name">${item.name}</span>
                    </div>
                    <div class="item-description-wrapper">
                        <span class="item-description">${itemLocked ? 'This item cannot be purchased.' : item.description}</span>
                    </div>
                </div>
                <div class="divider"></div>
                <div class="item-quantity-wrapper wrapper">
                    <span class="item-quantity">${item.quantity}</span>
                </div>
                <div class="divider"></div>
                <div class="item-price-wrapper wrapper">
                    <span class="item-price">${item.price}</span>
                </div>
            </div>
        `;
        }).join('');

        grid.innerHTML = itemsHtml;

        document.querySelectorAll('.add-to-cart').forEach(button => {
            button.addEventListener('click', () => this.addToCart(button.dataset.itemId));
        });
    }

    addToCart(itemId) {
        const item = this.items.find(i => i.itemId === itemId);
        if (!item || !item.isAvailable()) return;

        const currentQuantity = this.cart.get(itemId) || 0;
        if (currentQuantity + 1 > item.quantity) return;

        if (!item.checkPrerequisites(this.currentCharacter)) return;

        document.getElementById(`item-wrapper-${item.itemId}`).classList.add('selected');
        this.cart.set(itemId, currentQuantity + 1);
        this.updateCartDisplay();
    }

    updateCartDisplay() {
        const cartItems = document.querySelector('.cart-items-wrapper');
        let total = 0;

        const cartHtml = Array.from(this.cart.entries()).map(([itemId, quantity]) => {
            const item = this.items.find(i => i.itemId === itemId);
            const itemTotal = item.price * quantity;
            total += itemTotal;

            return `
                <div class="cart-item-wrapper">
                    <div class="cart-item-info">
                        <div class="cart-item-name-wrapper wrapper">
                            <span class="cart-item-name">${item.name}</span>
                            <span class="cart-item-number">Item #${item.itemNumber}</span>
                        </div>
                        <div class="cart-item-stepper-wrapper wrapper">
                            Stepper goes here
                        </div>
                        <div class="cart-item-price-wrapper wrapper">
                            <span class="cart-item-price">${item.price}</span>
                            ${gold}
                        </div>
                    </div>
                    <div class="cart-item-description-wrapper wrapper"> 
                        <span class="cart-item-description">${item.description}</span>
                    </div>
                </div>
            `;
        }).join('');

        cartItems.innerHTML = cartHtml;
        document.querySelector('.cart-total-amount-wrapper').innerHTML = `
            <div class="cart-total">
                <span class="cart-item-total-price">${total}</span>
                ${gold}
            </div>
        `;
    }

    async handlePurchase() {
        if (this.cart.size === 0) return;

        for (const [itemId, quantity] of this.cart.entries()) {
            const item = this.items.find(i => i.itemId === itemId);
            try {
                await StoreService.purchaseItem(this.currentGame.gameId, this.currentCharacter, item, quantity);
            } catch (error) {
                console.error('Purchase failed:', error);
                alert(error.message);
                return;
            }
        }

        this.cart.clear();
        this.updateCartDisplay();
        this.items = await StoreService.getAvailableItems(this.currentGame.gameId, this.currentCharacter, this.canAccessSecretShop);
        this.loadItems();
    }

    cleanup() {
        super.cleanup();
        this.currentCharacter = null;
        this.canAccessSecretShop = false;
        this.items = [];
        this.cart.clear();

        if (this.gameUnsubscribe) {
            this.gameUnsubscribe();
        }
        if (this.playerMessageUnsubscribe) {
            this.playerMessageUnsubscribe();
        }
        if (this.itemsUnsubscribe) {
            this.itemsUnsubscribe();
        }
    }
}

export default new ShopPage();