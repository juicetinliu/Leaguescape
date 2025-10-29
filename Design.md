# Leaguescape Project Design

This document outlines the directory structure and key files for the Leaguescape project, a webapp for managing an escape room game with virtual store mechanics.

## Directory Structure

```
leaguescape/
├── public/                     # Static assets
│   ├── index.html             # Main HTML entry point
│   ├── styles/                # CSS files
│   │   ├── main.css          # Global styles
│   │   ├── components.css     # Reusable component styles
│   │   └── pages/            # Page-specific styles
│   ├── images/               # Image assets
│   └── favicon.ico           # Site favicon
│
├── src/                      # Source code
│   ├── js/                   # JavaScript modules
│   │   ├── app.js           # Main application entry point
│   │   ├── config/          # Configuration files
│   │   │   └── firebase.js  # Firebase configuration
│   │   ├── models/          # Data models
│   │   │   ├── User.js      # User model
│   │   │   ├── Game.js      # Game model
│   │   │   ├── Character.js # Character model
│   │   │   └── Item.js      # Item model
│   │   ├── services/        # Business logic and services
│   │   │   ├── auth.js      # Authentication service
│   │   │   ├── game.js      # Game management service
│   │   │   ├── store.js     # Store/shop service
│   │   │   └── bank.js      # Banking service
│   │   ├── components/      # Reusable UI components
│   │   │   ├── Header/      # Site header component
│   │   │   ├── Lobby/       # Game lobby components
│   │   │   ├── Shop/        # Shop components
│   │   │   └── Bank/        # Banking components
│   │   └── utils/           # Utility functions
│   │       ├── validation.js # Input validation
│   │       └── helpers.js    # Helper functions
│   │
│   └── pages/               # Page implementations
│       ├── index.js         # Landing page
│       ├── info.js          # Information page
│       ├── user.js          # User dashboard
│       ├── admin.js         # Admin dashboard
│       ├── lobby.js         # Game lobby
│       ├── login.js         # Character login
│       ├── character.js     # Character dashboard
│       ├── shop.js          # Main shop
│       ├── secret-shop.js   # Secret shop
│       ├── bank.js          # Banking interface
│       ├── inventory.js     # Character inventory
│       └── credits.js       # End game credits
│
├── firebase/               # Firebase configuration and rules
│   ├── firestore.rules    # Firestore security rules
│   └── storage.rules      # Storage security rules
│
└── tests/                 # Test files
    ├── unit/             # Unit tests
    └── integration/      # Integration tests
```

## Key Components and Responsibilities

### 1. Data Models (`src/js/models/`)

- **User.js**
  - Handles user authentication state
  - Manages user profile data
  - Tracks game history

- **Game.js**
  - Manages game state (`Setup`, `Running`, `End`)
  - Handles player roster
  - Controls game progression

- **Character.js**
  - Manages character profiles
  - Handles inventory
  - Tracks gold balance

- **Item.js**
  - Defines item properties
  - Manages item availability
  - Handles purchase prerequisites

### 2. Services (`src/js/services/`)

- **auth.js**
  - Firebase authentication integration
  - User session management
  - Role-based access control

- **game.js**
  - Game state management
  - Player management
  - Admin controls

- **store.js**
  - Item catalog management
  - Purchase processing
  - Inventory tracking

- **bank.js**
  - Gold balance management
  - Transaction processing
  - Transaction history

### 3. Pages (`src/pages/`)

Each page corresponds to a specific route and role:

- **Visitor Access**
  - `index.js` - Authentication
  - `info.js` - Game information

- **User Access**
  - `user.js` - Game management dashboard

- **Admin Access**
  - `admin.js` - Game administration

- **Player Access**
  - `lobby.js` - Game lobby
  - `login.js` - Character authentication
  - `credits.js` - End game summary

- **Character Access**
  - `character.js` - Main character interface
  - `shop.js` - Item shop
  - `secret-shop.js` - Special items
  - `bank.js` - Gold management
  - `inventory.js` - Owned items

## Firebase Structure

### Collections

```javascript
users: {
  authId: string,
  username: string
}

games: {
  gameId: string,
  gamePassword: string,
  createdTime: number,
  startTime: number,
  endTime: number,
  adminId: string,
  gameState: 'setup' | 'running' | 'end'
}

players: {
  playerId: string,
  gameId: string,
  authId: string,
  isBanned: boolean,
  assumedCharacterId: string
}

items: {
  itemId: string,
  gameId: string,
  itemNumber: number,
  name: string,
  description: string,
  quantity: number,
  price: number,
  prereqs: string,
  isSecret: boolean
}

characters: {
  characterId: string,
  gameId: string,
  name: string,
  profileImage: string,
  emblemImage: string,
  userId: string,
  accountNumber: string,
  accountPassword: string,
  securityQuestion: string,
  securityAnswer: string,
  startingGold: number,
  canAccessSecret: boolean,
  gold: number,
  items: string
}

characterActions: {
  playerId: string,
  characterId: string,
  actionType: string,
  actionDetails: string,
  activityTime: number
}
```

## Security Considerations

1. Firebase Security Rules
   - Implement role-based access control
   - Validate data integrity
   - Prevent unauthorized access to game states

2. User Authentication
   - Support anonymous authentication
   - Implement secure character login
   - Manage session states

3. Data Validation
   - Validate all user inputs
   - Verify transaction integrity
   - Ensure game state consistency

## Development Guidelines

1. Code Organization
   - Use modules for better code organization
   - Implement reusable components
   - Follow consistent naming conventions

2. Firebase Best Practices
   - Optimize data structure for queries
   - Implement proper indexing
   - Use batch operations where appropriate

3. Testing Strategy
   - Unit tests for business logic
   - Integration tests for Firebase operations
   - End-to-end tests for critical flows

4. Performance Considerations
   - Minimize unnecessary reloads
   - Implement efficient data listeners
   - Cache frequently accessed data