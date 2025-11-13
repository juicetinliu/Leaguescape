import Game from '../../models/Game.js';
import Character from '../../models/Character.js';
import Item from '../../models/Item.js';
import Action from '../../models/Action.js';
import Message from '../../models/Message.js';
import { MessageTo, MessageType } from '../../models/MessageTypes.js';
import AuthService from '../auth.js';
import MessageService from '../message.js';
import GameService from '../game.js';

class AdminHandlerService {
    async handlePlayerLogOut(gameId, playerId, characterId, approved, rejectionReason = "") {
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

    async handlePlayerLogIn(gameId, playerId, characterId, approved, rejectionReason = "") {
        if (approved) {
            await GameService.updatePlayerAssumedCharacter(gameId, playerId, characterId);
            await MessageService.sendAdminMessageToPlayer(gameId, {
                messageType: MessageType.LOGIN_SUCCESS,
                messageDetails: { 
                    characterId: characterId 
                }
            }, playerId);
        } else {
            await MessageService.sendAdminMessageToPlayer(gameId, {
                messageType: MessageType.LOGIN_FAILURE,
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
        
        // Then check if the items are in stock and all reqs are met - remove anything unmet!
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

    async handlePlayerCartPurchaseRequest(gameId, playerId, characterId, approvedItems, totalPrice, approved, rejectionReason = "") {
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
}

export default new AdminHandlerService();