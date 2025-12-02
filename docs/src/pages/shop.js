import Page from '../js/models/Page.js';
import AuthService from '../js/services/auth.js';
import GameService from '../js/services/game.js';
import MessageService from '../js/services/message.js';
import StoreService from '../js/services/store.js';
import { MessageType } from '../js/models/MessageTypes.js';
import { router } from '../js/utils/router.js';
import { PAGES, GAME_STATE, PURCHASE_STATUS } from '../js/models/Enums.js';
import { gameRouter } from '../js/utils/gamerouter.js';
import { setTwoNumberDecimalString, setTwoNumberDecimal } from '../js/utils/numUtils.js';
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
        this.attachEventListeners();
    }
//TODO: MISSING ITEM HEADERS
    initializeUI() {
        const template = `
            <div id="${this.page}" class="page-container">
                <div class="items-container">
                    <div class="items-header-wrapper">
                        <div class="back-button-wrapper wrapper">
                            <button id="backToCharacter" class="text-button">BACK</button>
                            <button id="showPurchaseHistory" class="text-button ${!Object.entries(this.currentCharacter.purchaseHistory).length ? 'hidden' : ''}">
                                PURCHASES
                                <span id="purchaseHistoryBadge" class="hidden"></span>
                            </button>
                        </div>
                        <div class="items-header-heading wrapper">${this.canAccessSecretShop ? flickeringSymbols(9, 'flickering-items-header-heading') : 'THE SHOP'}</div>
                        <div class="profile-preview-wrapper wrapper">
                            <div class="profile-info-wrapper">
                                <div id="characterName" class="profile-name-text">
                                    ${this.canAccessSecretShop ? flickeringSymbols(10, 'profile-name') : this.currentCharacter.name}
                                </div>
                                <div id="characterGold" class="profile-gold-display">
                                    ${setTwoNumberDecimalString(this.currentCharacter.gold)}
                                    ${gold}
                                </div>
                            </div>
                            <div class="profile-image-wrapper ${this.canAccessSecretShop ? 'flickering' : ''}">
                                <img src="${this.canAccessSecretShop ? this.currentCharacter.emblemImage : this.currentCharacter.profileImage}"/>
                            </div>
                        </div>
                    </div>
                    <div id="itemsGridHeaders" class="items-grid-headers">
                        Headers will go here
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
                <!-- Purchase History Modal -->
                <div id="purchaseHistoryModal" class="modal" style="display: none;">
                    <div class="modal-content purchase-history-modal-content">
                        <div class="purchase-history-header-wrapper">
                            <div class="wrapper"></div>
                            <div class="purchase-history-heading wrapper">PURCHASE HISTORY
                            </div>
                            <div class="back-button-wrapper wrapper">
                                <button id="closePurchaseHistory" class="icon-button" class="btn">×</button>
                            </div>
                        </div>
                        <div id="purchaseHistoryList" class="purchase-history-wrapper"></div>
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
            this.flickeringSymbolsItemsHeadingInterval = flickeringSymbolsInterval(9, 'flickering-items-header-heading', 890);
        }

        // Purchase history modal
        document.getElementById('showPurchaseHistory').addEventListener('click', () => this.showPurchaseHistoryModal());
        document.getElementById('closePurchaseHistory').addEventListener('click', () => {
            const modal = document.getElementById('purchaseHistoryModal');
            modal.style.display = 'none';
            this.togglePurchaseHistoryBadge(false);
        });
    }

    setupCharacterPlayerUnsubscribes(gameId) {
        this.characterUnsubscribe = GameService.onCharacterSnapshot(gameId, this.currentCharacter.characterId, async (character) => {
            this.currentCharacter = character;
            this.loadCharacterData();
            this.loadPurchaseHistory();
            // run flows that depend on character data changes (e.g. prereqs!)
            this.updateCartBasedOnItemsAndPrereqs();
            await this.loadItems();
            this.updateCartDisplay();
        });
        this.playerDataUnsubscribe = GameService.onPlayerSnapshot(gameId, AuthService.currentUser.authId, async (playerData) => {
            if(playerData.loginMode == 'inventory') {
                window.location.reload();
                return;
            }
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
            this.loadPurchaseHistory();
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
            ${setTwoNumberDecimalString(this.currentCharacter.gold)}
            ${gold}
        `;


        const showPurchaseHistoryButton = document.getElementById('showPurchaseHistory');
        if(!Object.entries(this.currentCharacter.purchaseHistory).length) {
            showPurchaseHistoryButton.classList.add('hidden');
        } else {
            showPurchaseHistoryButton.classList.remove('hidden');
        }

        //TODO: Update Profile Image too!
    }

    togglePurchaseHistoryBadge(on) {
        const badge = document.getElementById('purchaseHistoryBadge');
        if(on) {
            badge.classList.remove('hidden');
        } else {
            badge.classList.add('hidden');
        }
    }

    showPurchaseHistoryModal() {
        const modal = document.getElementById('purchaseHistoryModal');
        if (!modal) return;
        modal.style.display = 'flex';
    }

    loadPurchaseHistory() {
        const list = document.getElementById('purchaseHistoryList');
        const history = this.currentCharacter.purchaseHistory || {};
        const entries = Object.entries(history).map(([id, entry]) => ({ id, ...entry }));
        console.log(entries);
        if (!entries || entries.length === 0) {
            list.innerHTML = 'No purchase history to show.';
            return;
        }

        entries.sort((a, b) => (b.requestTime || 0) - (a.requestTime || 0));

        const html = entries.map(e => {
            const time = new Date(e.requestTime).toLocaleString("en-US", { timeZone: "PST" });
            const purchaseStatus = e.status; // should not be empty.
            const requested = e.requestedItems || {}; // should not be empty.
            const approvedItems = e.approvedItems || null; // undefined if PURCHASE_STATUS.PENDING
            const approvedPrice = e.approvedPrice || 0; // undefined if PURCHASE_STATUS.PENDING

            const requestedItemsHtml = Object.entries(requested).map(([itemId, quantity]) => {
                const item = this.items.find(i => i.itemId === itemId);
                const name = item ? item.name : '???';
                return `
                    <div class="hist-item ${purchaseStatus === PURCHASE_STATUS.REJECTED ? 'rejected' : 'pending'}">
                        <div>${name} × ${quantity}</div>
                    </div>
                `;
            }).join('') || '<div class="hist-item">(no items... might be a bug)</div>';

            const approvedItemsHtml = approvedItems ? Object.entries(approvedItems).map(([itemId, details]) => {
                const item = this.items.find(i => i.itemId === itemId) ;
                const name = item ? item.name : '???';
                return `
                    <div class="hist-item approved">
                        <div>${name} × ${details.quantity}</div>
                        <div class="price">
                            ${setTwoNumberDecimalString(details.quantity * details.price)}
                            ${gold}
                        </div>
                    </div>
                `;
            }).join('') : '<div class="hist-item">No items purchased</div>';

            return `
                <div class="purchase-entry" id="purchase-${e.id}">
                    <div class="purchase-header">
                        <span class="purchase-time">${time}</span>
                        <span class="purchase-status">${purchaseStatus.toUpperCase()}</span>
                    </div>
                    ${purchaseStatus === PURCHASE_STATUS.APPROVED ? `
                        <div class="purchase-section">
                            <div class="purchase-section-body">
                                ${approvedItemsHtml}
                            </div>
                            <div class="purchase-section-total line-item">
                                <div>TOTAL</div>
                                <div class="price">
                                    ${setTwoNumberDecimalString(approvedPrice)} 
                                    ${gold}
                                </div>
                            </div>
                        </div>
                    ` : `
                        <div class="purchase-section">
                            <div class="purchase-section-body">${requestedItemsHtml}</div>
                        </div>
                    `}
                </div>
            `;
        }).join('');

        list.innerHTML = html;
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
        const gridHeaders = document.getElementById('itemsGridHeaders');
        const grid = document.getElementById('itemsGrid');

        gridHeaders.innerHTML = `
            <div class="item-header">
                <div class="item-add-to-cart-wrapper wrapper">SELECT</div>
                <div class="item-number-wrapper wrapper">ITEM #</div>
                <div class="item-info-wrapper wrapper">ITEM</div>
                <div class="item-quantity-wrapper wrapper">QUANTITY</div>
                <div class="item-price-wrapper wrapper">PRICE</div>
            </div>
        `;
        
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
                    <span class="item-price">${setTwoNumberDecimalString(item.price)}</span>
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
            const itemTotal = setTwoNumberDecimal(item.price * quantity);
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
                                <span class="cart-item-price">${setTwoNumberDecimalString(item.price)}</span>
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
                <span class="cart-item-total-price">${setTwoNumberDecimalString(total)}</span>
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
        this.togglePurchaseHistoryBadge(true);

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