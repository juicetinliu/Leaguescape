export const MessageTo = {
    ADMIN: 'messagesToAdmin',
    PLAYER: 'messagesFromAdmin'
}

export const MessageType = {
    LOGIN_ATTEMPT: 'loginAttempt',
    LOGIN_SUCCESS: 'loginSuccess',
    LOGIN_FAILURE: 'loginFailure',
    LOGOUT_ATTEMPT: 'logoutAttempt',
    LOGOUT_SUCCESS: 'logoutSuccess',
    LOGOUT_FAILURE: 'logoutFailure',
    PURCHASE_ATTEMPT: 'purchaseAttempt',
    PURCHASE_SUCCESS: 'purchaseSuccess',
    PURCHASE_FAILURE: 'purchaseFailure',
    DEPOSIT_ATTEMPT: 'depositAttempt',
    DEPOSIT_SUCCESS: 'depositSuccess',
    DEPOSIT_FAILURE: 'depositFailure',
    WITHDRAW_ATTEMPT: 'withdrawAttempt',
    WITHDRAW_SUCCESS: 'withdrawSuccess',
    WITHDRAW_FAILURE: 'withdrawFailure',
    REQUEST_INVENTORY_ATTEMPT: 'requestInventoryAttempt',
    REQUEST_INVENTORY_SUCCESS: 'requestInventorySuccess',
    REQUEST_INVENTORY_FAILURE: 'requestInventoryFailure'
}

export default { MessageType, MessageTo };