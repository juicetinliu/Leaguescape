import { MessageType } from "../models/MessageTypes.js";

/**
 * Character wants to VERB:
 * @param {*} message
 * @returns the VERB: in readable string format
 */
export function convertMessageTypeToReadableString(messageType) {
    switch (messageType) {
        case MessageType.PURCHASE_ATTEMPT:
            return "purchase:";
        case MessageType.DEPOSIT_ATTEMPT:
            return "deposit:";
        case MessageType.WITHDRAW_ATTEMPT:
            return "withdraw:";
        case MessageType.REQUEST_INVENTORY_ATTEMPT:
            return "request their inventory.";
        default:
            return messageType;
    }
}

export function convertMessageDetailsToHTML(messageType, messageDetails, availableItems) {
    switch (messageType) {
        case MessageType.PURCHASE_ATTEMPT:
            const cart = messageDetails.cart;
            if (!cart || cart.length === 0) return "No items in cart";
            let html = '<ul>';
            Object.entries(cart).map(([itemId, quantity]) => {
                const item = availableItems.find(avItem => avItem.itemId === itemId);
                const itemName = item ? item.name : 'Unknown Item';
                html += `<li>${itemName} x ${quantity}</li>`;
            });
            html += '</ul>';
            return html;
        case MessageType.DEPOSIT_ATTEMPT:
            return `$${messageDetails.amount}`;
        case MessageType.WITHDRAW_ATTEMPT:
            return `$${messageDetails.amount}`;
        case MessageType.REQUEST_INVENTORY_ATTEMPT:
            return "";
        default:
            return typeof messageDetails === 'string' ? messageDetails : JSON.stringify(messageDetails);
    }
}