const ActionType = {
    ENTER_GAME: 'enterGame',
    EXIT_GAME: 'exitGame',
    LOGIN_CHARACTER: 'loginCharacter', // Player REQUESTS login for a character (accountNumber, accountPassword)
    LOGIN_CHARACTER_DENIED: 'loginDenied', // Admin DENIES login for a character
    // ASSUME_CHARACTER: 'assumeCharacter', // Admin APPROVES login for a player to assume a character (characterId)
    LOGOUT_CHARACTER: 'logoutCharacter', // Player REQUESTS logout from a character
    // UNASSUME_CHARACTER: 'unassumeCharacter', // Player is successfully logged out of a character or admin FORCES a logout (characterId)
    PURCHASE_ITEMS: 'purchaseItems', // Item, Quantity
    WITHDRAW_GOLD: 'withdrawGold', // Amount
    DEPOSIT_GOLD: 'depositGold', // Amount
    // PURCHASE_ITEM_STATUS: 'purchaseItemStatus',
    // WITHDRAW_GOLD_STATUS: 'withdrawGoldStatus',
    // DEPOSIT_GOLD_STATUS: 'depositGoldtatus',
    PLAYER_UPDATED: 'playerUpdated',
    ITEM_UDPATED: 'itemUpdated',
    CHARACTER_UPDATED: 'characterUpdated'
}

export default ActionType