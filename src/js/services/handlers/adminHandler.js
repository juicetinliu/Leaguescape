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
        console.log(gameId, player, character, cart, availableItems);

        // Then check if the items are in stock and all reqs are met - remove anything unmet.

        // Then check if the player has enough gold for the remaining items

        // 
        output.approved = true;
        output.approvedItems = cart;
        output.totalPrice = 0;

        return output;
    }

    async handlePlayerCartPurchaseRequest(gameId, playerId, characterId, cart, totalPrice, approved, rejectionReason = "") {
        if (approved) {
            await GameService.addToCharacterItems(gameId, playerId, characterId, cart, totalPrice);
            await MessageService.sendAdminMessageToPlayer(gameId, {
                messageType: MessageType.PURCHASE_SUCCESS,
                messageDetails: { 
                    //no details?
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