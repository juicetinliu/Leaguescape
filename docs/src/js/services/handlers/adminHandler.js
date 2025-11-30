import Game from '../../models/Game.js';
import Character from '../../models/Character.js';
import Item from '../../models/Item.js';
import Action from '../../models/Action.js';
import Message from '../../models/Message.js';
import { MessageTo, MessageType } from '../../models/MessageTypes.js';
import AuthService from '../auth.js';
import MessageService from '../message.js';
import GameService from '../game.js';

const ACTIVITY_OPTIONS = {
    APPROVE: 'approve',
    DECLINE: 'decline',
    IGNORE: 'ignore' // should be unused...
}

class AdminHandlerService {
    constructor() {
        this.ADMIN_MESSAGE_ACTIVITY_OPTIONS = new Map([
            [MessageType.PURCHASE_ATTEMPT, 
                [ACTIVITY_OPTIONS.APPROVE, ACTIVITY_OPTIONS.DECLINE]],
            [MessageType.DEPOSIT_ATTEMPT, 
                [ACTIVITY_OPTIONS.APPROVE, ACTIVITY_OPTIONS.DECLINE]],
            [MessageType.WITHDRAW_ATTEMPT, 
                [ACTIVITY_OPTIONS.APPROVE, ACTIVITY_OPTIONS.DECLINE]],
            [MessageType.REQUEST_INVENTORY_ATTEMPT, 
                [ACTIVITY_OPTIONS.APPROVE, ACTIVITY_OPTIONS.DECLINE, ACTIVITY_OPTIONS.IGNORE]],
        ]);
    }

    returnMessageActivityOptions(messageType) {
        return this.ADMIN_MESSAGE_ACTIVITY_OPTIONS.get(messageType) || [];
    }

    async handlePlayerLogOut(gameId, player, characterId, approved, rejectionReason = "") {
        const playerId = player.playerId;
        if (approved) {
            await GameService.clearPlayerAssumedCharacter(gameId, playerId, characterId);
            await MessageService.sendAdminMessageToPlayer(gameId, {
                messageType: MessageType.LOGOUT_SUCCESS
            }, playerId);
        } else {
            await MessageService.sendAdminMessageToPlayer(gameId, {
                messageType: MessageType.LOGOUT_FAILURE,
                messageDetails: { 
                    rejectionReason: rejectionReason 
                }
            }, playerId);
        }
    }

    async handlePlayerLogIn(gameId, player, characterId, approved, rejectionReason = "", MAX_LOGIN_ATTEMPTS = 3) {
        const playerId = player.playerId;
        const characterFailedLoginMap = player.privateDetails.characterFailedLogins || {};

        if(characterFailedLoginMap[characterId]) {
            // check if locked
            if(characterFailedLoginMap[characterId].lockUntil && Date.now() < characterFailedLoginMap[characterId].lockUntil) {
                approved = false; //technically not needed, but for clarity
                rejectionReason = `Character is locked for ${Math.ceil((characterFailedLoginMap[characterId].lockUntil - Date.now())/1000)} seconds. Try again later.`;
                await MessageService.sendAdminMessageToPlayer(gameId, {
                    messageType: MessageType.LOGIN_FAILURE,
                    messageDetails: { 
                        rejectionReason: rejectionReason 
                    }
                }, playerId);
                return;
            }
        }

        if (approved) {
            await GameService.updatePlayerAssumedCharacter(gameId, playerId, characterId);
            await MessageService.sendAdminMessageToPlayer(gameId, {
                messageType: MessageType.LOGIN_SUCCESS,
                messageDetails: { 
                    characterId: characterId 
                }
            }, playerId);
            if(characterFailedLoginMap[characterId]) {
                // reset failed login attempts on successful login
                characterFailedLoginMap[characterId] = {
                    remainingAttempts: MAX_LOGIN_ATTEMPTS
                }
                await GameService.updateCharacterFailedLoginMap(gameId, playerId, characterFailedLoginMap);
            }
        } else {
            if (characterId) {
                // We matched a character! But the password was wrong.
                const remainingAttempts = characterFailedLoginMap[characterId] ? characterFailedLoginMap[characterId].remainingAttempts - 1 : MAX_LOGIN_ATTEMPTS - 1;
                if(remainingAttempts <= 0) {
                    rejectionReason = 'Invalid Credentials. Character is locked for 1 minute';
                    characterFailedLoginMap[characterId] = {
                        remainingAttempts: MAX_LOGIN_ATTEMPTS, // reset after lock
                        lockUntil: Date.now() + 60000 // lock for 1 minute
                    };
                } else {
                    characterFailedLoginMap[characterId] = {
                        remainingAttempts: remainingAttempts
                    }
                }
                await GameService.updateCharacterFailedLoginMap(gameId, playerId, characterFailedLoginMap);
            }

            await MessageService.sendAdminMessageToPlayer(gameId, {
                messageType: MessageType.LOGIN_FAILURE,
                messageDetails: { 
                    rejectionReason: rejectionReason 
                }
            }, playerId);
        }
    }
    async handlePlayerInventoryAccess(gameId, player, characterId, approved, rejectionReason = "") {
        const playerId = player.playerId;
        if (approved) {
            await GameService.logInventoryAccess(gameId, playerId, characterId);
            await MessageService.sendAdminMessageToPlayer(gameId, {
                messageType: MessageType.REQUEST_INVENTORY_SUCCESS
            }, playerId);
        } else {
            await MessageService.sendAdminMessageToPlayer(gameId, {
                messageType: MessageType.REQUEST_INVENTORY_FAILURE,
                messageDetails: { 
                    rejectionReason: rejectionReason 
                }
            }, playerId);
        }
    }

    async checkPlayerCartPurchaseRequirements(gameId, player, character, cart, availableItems) {
        let output = { approved: false, rejectionReason: '', approvedItems: {}, totalPrice: 0 };

        // first check if the player is the character
        if(player.privateDetails.assumedCharacterId !== character.characterId) {
            output.rejectionReason = 'Player did not assume this character'
            return output;
        }
        
        // Then check if the items are in stock and all reqs are met - remove anything unmet (e.g. OOS, unavailable, or quantity request exceeds current quantity) - these scenarios are possible if multiple players are purchasing at the same time!! (Though if it's just one player - this shouldn't be possible as their view updates real time.)
        let approvedItems = {};
        let totalPrice = 0;
        Object.entries(cart).map(([itemId, quantity]) => {
            const item = availableItems.find(i => i.itemId === itemId);
            let itemTotalPrice = 0;
            if(!item || !item.isAvailable()) {
                delete approvedItems[itemId];
            } else if(!item.checkPrerequisites(character)) {
                delete approvedItems[itemId];
            } else if (quantity > item.quantity) {
                approvedItems[itemId] = {
                    quantity: item.quantity,
                    price: item.price
                }
                itemTotalPrice = item.price * item.quantity;
            } else {
                approvedItems[itemId] = {
                    quantity: quantity,
                    price: item.price
                }
                itemTotalPrice = item.price * quantity;
            }
            totalPrice += itemTotalPrice;
        });

        // Then check if the character has enough gold for the remaining items
        if(character.gold < totalPrice) {
            output.rejectionReason = 'Insufficient Gold'
            return output
        }

        output.approved = true;
        output.approvedItems = approvedItems;
        output.totalPrice = totalPrice;

        return output;
    }

    async handlePlayerCartPurchaseRequest(gameId, player, character, approvedItems, totalPrice, messageId, approved, rejectionReason = "") {
        const playerId = player.playerId;
        const characterId = character.characterId;
        await character.updatePurchaseHistoryEntry(messageId, approved, approvedItems, totalPrice);
        if (approved) {
            await GameService.purchaseItemsCharacter(gameId, playerId, characterId, approvedItems, totalPrice);
            await MessageService.sendAdminMessageToPlayer(gameId, {
                messageType: MessageType.PURCHASE_SUCCESS,
                messageDetails: { 
                    approvedItems: approvedItems,
                    totalPrice: totalPrice
                }
            }, playerId);
        } else {
            await MessageService.sendAdminMessageToPlayer(gameId, {
                messageType: MessageType.PURCHASE_FAILURE,
                messageDetails: { 
                    rejectionReason: rejectionReason 
                }
            }, playerId);
        }
    }
    
    async createPlayerCartPurchaseHistoryEntry(messageId, character, cart) {
        await character.createPurchaseHistoryEntry(messageId, cart);
    }

    async checkGoldActionRequirements(gameId, player, character, isDeposit, amount) {
        let output = { approved: false, rejectionReason: '', isDeposit: isDeposit, amount: 0 };

        // first check if the player is the character
        if(player.privateDetails.assumedCharacterId !== character.characterId) {
            output.rejectionReason = 'Player did not assume this character'
            return output;
        }

        let currentBalance = character.gold;

        if (!Number.isInteger(amount)) {
            output.rejectionReason = "Gold must be a whole number"
            return output;
        }
        let inputAmount = parseInt(amount);
        let newBalance = 0;
        if (inputAmount < 0) {
            output.rejectionReason = "Gold must be non-negative";
            return output;
        } else {
            newBalance = isDeposit 
                ? currentBalance + inputAmount
                : currentBalance - inputAmount;
        }

        if(newBalance < 0 && !isDeposit) {
            output.rejectionReason = "Insufficient funds for withdrawal"
            return output;
        }
        if(inputAmount == 0) {
            output.rejectionReason = "No amount requested"
            return output;
        }
        output.approved = true;
        output.amount = inputAmount;
        return output;
    }



    async handlePlayerGoldActionRequest(gameId, player, characterId, approvedAmount, isDeposit, approved, rejectionReason = "") {
        const playerId = player.playerId;
        if (approved) {
            if (isDeposit) {
                await GameService.depositGoldCharacter(gameId, playerId, characterId, approvedAmount);
            } else {
                await GameService.withdrawGoldCharacter(gameId, playerId, characterId, approvedAmount);
            }
            await MessageService.sendAdminMessageToPlayer(gameId, {
                messageType: isDeposit 
                    ? MessageType.DEPOSIT_SUCCESS 
                    : MessageType.WITHDRAW_SUCCESS,
                messageDetails: { 
                    approvedAmount: approvedAmount
                }
            }, playerId);
        } else {
            await MessageService.sendAdminMessageToPlayer(gameId, {
                 messageType: isDeposit 
                    ? MessageType.DEPOSIT_FAILURE 
                    : MessageType.WITHDRAW_FAILURE,
                messageDetails: { 
                    rejectionReason: rejectionReason 
                }
            }, playerId);
        }
    }
}

export default new AdminHandlerService();