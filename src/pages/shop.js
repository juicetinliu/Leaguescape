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
import { flickeringSymbols, flickeringSymbolsInterval } from '../js/components/flickeringSymbols.js'
import CharacterHandlerService from '../js/services/handlers/characterHandler.js';

class ShopPage extends Page {
    constructor() {
        super(PAGES.shop);
        this.currentGame = null;
        this.currentCharacter = null;
        this.playerData = {};
        this.canAccessSecretShop = false;
        this.items = [];
        this.cart = {};

        this.gameUnsubscribe = null;
        this.playerMessageUnsubscribe = null;
        this.itemsUnsubscribe = null;
        this.characterUnsubscribe = null;
        this.playerDataUnsubscribe = null
        this.flickeringSymbolsProfileNameInterval = null;
        this.flickeringSymbolsItemsHeadingInterval = null;
    }

    async show() {
        super.show();
        this.currentGame = await gameRouter.handlePlayerGamePageShow(this.page);
        if (!this.currentGame) {
            return;
        }

        const gameId = this.currentGame.gameId;
        this.currentCharacter = await gameRouter.handleCharacterGamePageShow(gameId, this.page);
        if (!this.currentCharacter) {
            return;
        }

        // Even though the snapshot listeners will update this, we do the fetch first to avoid a flicker (immediate refresh due to initial canAccessSecretShop value being different)
        this.playerData = await GameService.getPlayerData(gameId, AuthService.currentUser.authId);
        this.canAccessSecretShop = this.currentCharacter.canAccessSecret && (this.playerData.loginMode === 'secret');

        this.initializeUI();
        await this.attachEventListeners();
    }

    initializeUI() {
        const template = `
            <div id="${this.page}" class="page-container">
                <div class="items-container">
                    <div class="items-header-wrapper">
                        <div class="profile-preview-wrapper wrapper">
                            <div class="profile-image-wrapper ${this.canAccessSecretShop ? 'flickering' : ''}">
                                <img src=""/>
                            </div>
                            <div class="profile-info-wrapper">
                                <div id="characterName" class="profile-name-text">
                                    ${this.canAccessSecretShop ? flickeringSymbols(10, 'profile-name') : this.currentCharacter.name}
                                </div>
                                <div id="characterGold" class="profile-gold-display ${this.canAccessSecretShop ? 'flickering' : ''}">
                                    ${this.currentCharacter.gold}
                                    ${gold}
                                </div>
                            </div>
                        </div>
                        <div class="items-header-heading wrapper">${this.canAccessSecretShop ? flickeringSymbols(9, 'items-heading') : 'ALL ITEMS'}</div>
                        <div class="back-button-wrapper wrapper">
                            <button id="backToCharacter" class="text-button">BACK</button>
                        </div>
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
                            <button id="purchaseCart" class="text-button primary">PURCHASE</button>
                        </div>
                    </div>
                </div>
            </div>
        `;
        
        document.querySelector('#app').innerHTML = template;
    }


    attachEventListeners() {
        document.getElementById('backToCharacter').addEventListener('click', () => {
            router.navigate(`${PAGES.character}&gameId=${this.currentGame.gameId}&characterId=${this.currentCharacter.characterId}`);
        });

        document.getElementById('purchaseCart').addEventListener('click', () => this.handlePurchase());
                
        if(this.currentGame.gameId) {
            const gameId = this.currentGame.gameId;
            this.gameUnsubscribe = GameService.onGameSnapshot(gameId, async (gameData) => {
                if (gameData.gameState !== GAME_STATE.RUNNING) {
                    window.location.reload();
                }
            });
            this.setupPlayerMessageUnsubscribe(gameId);
            this.setupItemsUnsubscribe(gameId);
            this.setupCharacterPlayerUnsubscribes(gameId);
        }

        if(this.canAccessSecretShop) {
            this.flickeringSymbolsProfileNameInterval = flickeringSymbolsInterval(10, 'profile-name', 456);
            this.flickeringSymbolsItemsHeadingInterval = flickeringSymbolsInterval(9, 'items-heading', 890);
        }
    }

    setupCharacterPlayerUnsubscribes(gameId) {
        this.characterUnsubscribe = GameService.onCharacterSnapshot(gameId, this.currentCharacter.characterId, async (character) => {
            this.currentCharacter = character;
            this.loadCharacterData();
            // run flows that depend on character data changes (e.g. prereqs!)
            this.updateCartBasedOnItemsAndPrereqs();
            await this.loadItems();
            this.updateCartDisplay();
        });
        this.playerDataUnsubscribe = GameService.onPlayerSnapshot(gameId, AuthService.currentUser.authId, async (playerData) => {
            this.playerData = playerData;
            this.loadPlayerData();
        });
    }

    setupItemsUnsubscribe(gameId) {
        this.itemsUnsubscribe = StoreService.onItemsSnapshot(gameId, async (items) => {
            this.items = items;
            this.updateCartBasedOnItemsAndPrereqs();
            await this.loadItems();
            this.updateCartDisplay();
        }, this.canAccessSecretShop);
    }
        
    setupPlayerMessageUnsubscribe(gameId) {
        this.playerMessageUnsubscribe = MessageService.onUnprocessedPlayerMessagesSnapshot(gameId, async (messages) => {
            // process the last message (oldest) - the listener will update as messages get processed.
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

    loadCharacterData() {
        if(this.reloadIfSecretShopAccessChanged()) return;
        // Now update everything that depends on character data! Gold/Name/Etc.

        if(!this.canAccessSecretShop) {
            const characterNameDiv = document.getElementById('characterName');
            characterNameDiv.innerHTML = this.currentCharacter.name;
        }
        const characterGoldDiv = document.getElementById('characterGold');
        characterGoldDiv.innerHTML = `
            ${this.currentCharacter.gold}
            ${gold}
        `;

        //TODO: Update Profile Image too!
    }

    loadPlayerData() {
        if(this.reloadIfSecretShopAccessChanged()) return;
        // nothing else to update? (Player data only includes name and login mode)
    }

    reloadIfSecretShopAccessChanged() {
        const canAccessSecretShop = this.currentCharacter.canAccessSecret && (this.playerData.loginMode === 'secret');
        if (this.canAccessSecretShop !== canAccessSecretShop) {
            // access changed - force a refresh to get the right snapshot listeners/items/CX!
            window.location.reload();
            return true;
        }
        return false;
    }

    loadItems() {
        console.log('Loading Items');
        const grid = document.getElementById('itemsGrid');
        
        const itemsHtml = this.items.map(item => {
            const itemLocked = !item.checkPrerequisites(this.currentCharacter);
            const itemOutOfStock = !item.isAvailable();
            const itemInCart = this.cart[item.itemId] > 0;
            return `
            <div class="item-wrapper ${itemLocked ? 'item-locked' : ''} ${itemOutOfStock ? 'item-oos' : ''} ${itemInCart ? 'selected' : ''}" id="item-wrapper-${item.itemId}">
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
            button.addEventListener('click', () => this.toggleItemInCart(button.dataset.itemId));
        });
    }

    toggleItemInCart(itemId) {
        const currentQuantity = this.cart[itemId] || 0;

        if(currentQuantity == 0) {
            const item = this.items.find(i => i.itemId === itemId);
            if (!item || !item.isAvailable()) return;
            if (!item.checkPrerequisites(this.currentCharacter)) return;
            
            document.getElementById(`item-wrapper-${item.itemId}`).classList.add('selected');
            this.cart[itemId] = 1;
        } else {
            delete this.cart[itemId];
            document.getElementById(`item-wrapper-${itemId}`).classList.remove('selected');
        }
        this.updateCartDisplay();
    }

    updateCartBasedOnItemsAndPrereqs() {
        Object.entries(this.cart).map(([itemId, quantity]) => {
            const item = this.items.find(i => i.itemId === itemId);
            if(!item || !item.isAvailable()) {
                delete this.cart[itemId];
            } else if(!item.checkPrerequisites(this.currentCharacter)) {
                delete this.cart[itemId];
            } else if (quantity > item.quantity) {
                this.cart[itemId] = item.quantity;
            }
        });
    }

    updateCartDisplay() {
        const cartItems = document.querySelector('.cart-items-wrapper');
        let total = 0;

        const cartHtml = Object.entries(this.cart).map(([itemId, quantity]) => {
            const item = this.items.find(i => i.itemId === itemId);
            const itemTotal = item.price * quantity;
            total += itemTotal;

            return { 
                itemNumber: item.itemNumber,
                html: `
                    <div class="cart-item-wrapper">
                        <div class="cart-item-info">
                            <div class="cart-item-name-wrapper wrapper">
                                <span class="cart-item-name">${item.name}</span>
                                <span class="cart-item-number">Item #${item.itemNumber}</span>
                            </div>
                            <div class="cart-item-stepper-wrapper wrapper">
                                <div class="cart-item-stepper">
                                    <button class="cart-item-minus" data-item-id="${itemId}">-</button>
                                    <div class="cart-quantity" data-item-id="${itemId}">${quantity}</div>
                                    <button class="cart-item-plus" data-item-id="${itemId}" ${quantity >= item.quantity ? 'disabled' : ''}>+</button>
                                </div>
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
                `
            }
        }).sort((a, b) => {return a.itemNumber - b.itemNumber})
        .map((itemNumberAndHtml) => { return itemNumberAndHtml.html }).join('');

        cartItems.innerHTML = cartHtml;
        document.querySelector('.cart-total-amount-wrapper').innerHTML = `
            <div class="cart-total">
                <span class="cart-item-total-price">${total}</span>
                ${gold}
            </div>
        `;

        document.querySelectorAll('.cart-item-minus').forEach(btn => {
            const itemId = btn.dataset.itemId;
            btn.addEventListener('click', () => {
                const currentQuantity = this.cart[itemId] || 0;
                if (currentQuantity <= 1) {
                    // remove item
                    delete this.cart[itemId];
                    document.getElementById(`item-wrapper-${itemId}`).classList.remove('selected');
                } else {
                    this.cart[itemId] = currentQuantity - 1;
                }
                this.updateCartDisplay();
            });
        });

        document.querySelectorAll('.cart-item-plus').forEach(btn => {
            const itemId = btn.dataset.itemId;
            btn.addEventListener('click', () => {
                const currentQuantity = this.cart[itemId] || 0;
                const item = this.items.find(i => i.itemId === itemId);
                if (!item) return;
                if (currentQuantity + 1 > item.quantity) return; // can't exceed stock
                this.cart[itemId] = currentQuantity + 1;
                this.updateCartDisplay();
            });
        });
    }

    async handlePurchase() {
        if (Object.entries(this.cart).length === 0) return;

        await CharacterHandlerService.purchaseCart(this.currentGame.gameId, this.currentCharacter.characterId, this.cart);

        this.cart = {} //reset cart to empty map
        this.loadItems(); //load items to update selections baesd on empty map
        this.updateCartDisplay(); //load cart to update cart based on empty map
    }

    cleanup() {
        super.cleanup();
        this.currentCharacter = null;
        this.playerData = {};
        this.canAccessSecretShop = false;
        this.items = [];
        this.cart = {};

        if (this.gameUnsubscribe) {
            this.gameUnsubscribe();
        }
        if (this.playerMessageUnsubscribe) {
            this.playerMessageUnsubscribe();
        }
        if (this.itemsUnsubscribe) {
            this.itemsUnsubscribe();
        }
        if (this.characterUnsubscribe) {
            this.characterUnsubscribe();
        }
        if (this.playerDataUnsubscribe) {
            this.playerDataUnsubscribe();
        }
        if (this.flickeringSymbolsProfileNameInterval) {
            clearInterval(this.flickeringSymbolsProfileNameInterval);
        }
        if (this.flickeringSymbolsItemsHeadingInterval) {
            clearInterval(this.flickeringSymbolsItemsHeadingInterval);
        }
    }
}

export default new ShopPage();