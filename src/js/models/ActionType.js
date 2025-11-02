const ActionType = {
    ENTER_GAME: 'enterGame',
    EXIT_GAME: 'exitGame',
    LOGIN_CHARACTER: 'loginCharacter',
    LOGOUT_CHARACTER: 'logoutCharacter',
    PURCHASE_ITEM: 'purchaseItem', // Item, Quantity
    WITHDRAW_GOLD: 'withdrawGold', // Amount
    DEPOSIT_GOLD: 'depositGold', // Amount
    PURCHASE_ITEM_STATUS: 'purchaseItemStatus',
    WITHDRAW_GOLD_STATUS: 'withdrawGoldStatus',
    DEPOSIT_GOLD_STATUS: 'depositGoldtatus',
    PLAYER_UPDATED: 'playerUpdated',
    ITEM_UDPATED: 'itemUpdated',
    CHARACTER_UPDATED: 'characterUpdated'
}

export default ActionType