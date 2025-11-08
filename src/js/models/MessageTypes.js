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
}

export default { MessageType, MessageTo };