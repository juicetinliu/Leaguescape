import { db } from '../config/firebase.js';
import { doc, getDoc, addDoc, updateDoc, deleteDoc, collection } from 'https://www.gstatic.com/firebasejs/12.4.0/firebase-firestore.js';
import { PURCHASE_STATUS } from '../models/Enums.js';
import { setTwoNumberDecimal } from '../utils/numUtils.js';

class Character {
    constructor(gameId, characterId, data = {}) {
        this.gameId = gameId;
        this.characterId = characterId;
        this.name = data.name || '';
        this.profileImage = data.profileImage || '';
        this.emblemImage = data.emblemImage || '';
        this.userId = data.userId || '';
        this.accountNumber = data.accountNumber || '';
        this.accountPassword = data.accountPassword || '';
        this.securityQuestion = data.securityQuestion || '';
        this.securityAnswer = data.securityAnswer || '';
        this.startingGold = setTwoNumberDecimal(data.startingGold) || 0;
        this.canAccessSecret = data.canAccessSecret || false;
        this.gold = setTwoNumberDecimal(data.gold) || 0;
        this.items = data.items || {}; //itemId and quantity
        this.purchaseHistory = data.purchaseHistory || {}; //hacky way for now...
    }

    static async create(gameId, characterData) {
        const character = new Character(gameId, 'willBeOverwritten', characterData);

        const docRef = await addDoc(collection(db, `games/${gameId}/characters`), {
            name: character.name,
            profileImage: character.profileImage,
            emblemImage: character.emblemImage,
            userId: character.userId,
            accountNumber: character.accountNumber,
            accountPassword: character.accountPassword,
            securityQuestion: character.securityQuestion,
            securityAnswer: character.securityAnswer,
            startingGold: character.startingGold,
            canAccessSecret: character.canAccessSecret,
            gold: character.gold,
            items: character.items,
            purchaseHistory: character.purchaseHistory
        });

        character.characterId = docRef.id;
        return character;
    }

    static async get(gameId, characterId) {
        const characterDoc = await getDoc(doc(db, `games/${gameId}/characters`, characterId));
        if (!characterDoc.exists()) throw new Error('Character not found');
        return new Character(gameId, characterDoc.id, characterDoc.data());
    }

    async update(data) {
        Object.assign(this, data);
        await updateDoc(doc(db, `games/${this.gameId}/characters`, this.characterId), data);
    }

    async delete() {
        await deleteDoc(doc(db, `games/${this.gameId}/characters`, this.characterId));
    }

    async updateGold(amount) {
        const balance = this.gold + amount;
        if(balance < 0) throw 'Character cannot end up in debt!'
        this.gold = setTwoNumberDecimal(balance);
        await updateDoc(doc(db, `games/${this.gameId}/characters`, this.characterId), {
            gold: this.gold
        });
    }

    // unused?
    // async updateProfileImage(url) {
    //     if(!url) throw 'Provide a url!'
    //     this.profileImage = url;
    //     await updateDoc(doc(db, `games/${this.gameId}/characters`, this.characterId), {
    //         profileImage: this.profileImage
    //     });
    // }

    // unused?
    // async updateEmblemImage(url) {
    //     if(!url) throw 'Provide a url!'
    //     this.emblemImage = url;
    //     await updateDoc(doc(db, `games/${this.gameId}/characters`, this.characterId), {
    //         emblemImage: this.emblemImage
    //     });
    // }

    // Unnecessary?
    // async addItem(itemId, quantity = 1) {
    //     const itemQuantity = this.items[itemId] || 0;
    //     this.items[itemId] = itemQuantity + quantity;
    //     await updateDoc(doc(db, `games/${this.gameId}/characters`, this.characterId), {
    //         items: this.items
    //     });
    // }

    /**
     * Add a purchaseHistoryEntry - used on initial character cart request to Admin
     * Skip adding if already exists!
     * 
     * @param {*} purchaseId - use the messageId (hack but should work!)
     * @param {*} cart - initial player requested items
     */
    async createPurchaseHistoryEntry(purchaseId, cart) {
        if(this.purchaseHistory[purchaseId]) return;
        
        const timestamp = Date.now();
        this.purchaseHistory[purchaseId] = {
            requestTime: timestamp,
            requestedItems: cart,
            status: PURCHASE_STATUS.PENDING
        }
        await updateDoc(doc(db, `games/${this.gameId}/characters`, this.characterId), {
            purchaseHistory: this.purchaseHistory
        });
    }

    /**
     * Update a purchaseHistoryEntry - used after admin processes the purchase request
     */
    async updatePurchaseHistoryEntry(purchaseId, approved, approvedItems, approvedPrice) {
        this.purchaseHistory[purchaseId].status = approved ? PURCHASE_STATUS.APPROVED : PURCHASE_STATUS.REJECTED;
        this.purchaseHistory[purchaseId].approvedItems = approved ? approvedItems : null;
        this.purchaseHistory[purchaseId].approvedPrice = approved ? setTwoNumberDecimal(approvedPrice) : 0;

        await updateDoc(doc(db, `games/${this.gameId}/characters`, this.characterId), {
            purchaseHistory: this.purchaseHistory
        });
    }

    async addItems(itemsMap) {
        Object.entries(itemsMap).map(([itemId, itemDetails]) => {
            const itemQuantity = this.items[itemId] || 0;
            this.items[itemId] = itemQuantity + itemDetails.quantity;
        });
        await updateDoc(doc(db, `games/${this.gameId}/characters`, this.characterId), {
            items: this.items
        });
    }

    async deleteAllItems() {
        this.items = {};
        await updateDoc(doc(db, `games/${this.gameId}/characters`, this.characterId), {
            items: this.items
        });
    }
}

export default Character;