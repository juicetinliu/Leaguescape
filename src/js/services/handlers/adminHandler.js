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



    async handlePlayerGoldActionRequest(gameId, playerId, characterId, approvedAmount, isDeposit, approved, rejectionReason = "") {
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
                messageType: MessageType.WITHDRAW_FAILURE,
                messageDetails: { 
                    rejectionReason: rejectionReason 
                }
            }, playerId);
        }
    }


    async handlePlayerWithdrawRequest(gameId, playerId, characterId, approvedAmount, approved, rejectionReason = "") {
        return await this.handlePlayerGoldActionRequest(gameId, playerId, characterId, approvedAmount, approved, rejectionReason, false);
    }

    async handlePlayerDepositRequest(gameId, playerId, characterId, approvedAmount, approved, rejectionReason = "") {
        return await this.handlePlayerGoldActionRequest(gameId, playerId, characterId, approvedAmount, approved, rejectionReason, true);
    }
}

export default new AdminHandlerService();