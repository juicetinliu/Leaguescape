import Game from '../../models/Game.js';
import Character from '../../models/Character.js';
import Item from '../../models/Item.js';
import Action from '../../models/Action.js';
import Message from '../../models/Message.js';
import { MessageTo, MessageType } from '../../models/MessageTypes.js';
import AuthService from '../auth.js';
import MessageService from '../message.js';
import GameService from '../game.js';

class PlayerHandlerService {
    async logIn(gameId, accountNumber, accountPassword) {
        // No action logged. This is a request!
        await MessageService.sendPlayerMessageToAdmin(gameId, {
            messageType: MessageType.LOGIN_ATTEMPT,
            messageDetails: {
                accountNumber: accountNumber, 
                accountPassword: accountPassword 
            }
        });
    }
}

export default new PlayerHandlerService();