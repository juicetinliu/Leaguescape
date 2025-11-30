import Game from '../../models/Game.js';
import Character from '../../models/Character.js';
import Item from '../../models/Item.js';
import Action from '../../models/Action.js';
import Message from '../../models/Message.js';
import { MessageTo, MessageType } from '../../models/MessageTypes.js';
import AuthService from '../auth.js';
import { setTwoNumberDecimal } from '../../utils/numUtils.js';
import MessageService from '../message.js';
import GameService from '../game.js';

class CharacterHandlerService {
    async logOut(gameId, characterId) {
        // No action logged. This is a request!
        await MessageService.sendPlayerMessageToAdmin(gameId, {
            messageType: MessageType.LOGOUT_ATTEMPT,
            messageDetails: {
                characterId: characterId
            }
        });
    }

    async withdrawGold(gameId, characterId, goldAmount) {
        // No action logged. This is a request!
        await MessageService.sendPlayerMessageToAdmin(gameId, {
            messageType: MessageType.WITHDRAW_ATTEMPT,
            messageDetails: {
                characterId: characterId,
                amount: setTwoNumberDecimal(goldAmount)
            }
        });
    }

    async depositGold(gameId, characterId, goldAmount) {
        // No action logged. This is a request!
        await MessageService.sendPlayerMessageToAdmin(gameId, {
            messageType: MessageType.DEPOSIT_ATTEMPT,
            messageDetails: {
                characterId: characterId,
                amount: setTwoNumberDecimal(goldAmount)
            }
        });
    }

    async purchaseCart(gameId, characterId, cart = {}) {
        // No action logged. This is a request!
        await MessageService.sendPlayerMessageToAdmin(gameId, {
            messageType: MessageType.PURCHASE_ATTEMPT,
            messageDetails: {
                characterId: characterId,
                cart: cart
            }
        });
    }

    async requestInventoryAccess(gameId, characterId) {
        // No action logged. This is a request!
        await MessageService.sendPlayerMessageToAdmin(gameId, {
            messageType: MessageType.REQUEST_INVENTORY_ATTEMPT,
            messageDetails: {
                characterId: characterId,
            }
        });
    }
}

export default new CharacterHandlerService();