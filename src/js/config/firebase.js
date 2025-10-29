// Firebase configuration
const firebaseConfig = {
    apiKey: "AIzaSyAEwv5EYotGK8fWFX1gR3ZSKxjdXTnTHbw",
    authDomain: "leaguescape.firebaseapp.com",
    projectId: "leaguescape",
    storageBucket: "leaguescape.firebasestorage.app",
    messagingSenderId: "1068732660049",
    appId: "1:1068732660049:web:5edd3ac1e28d284dc33b70",
    measurementId: "G-KT9EC5CT9G"
};

// Initialize Firebase
import { initializeApp } from 'https://www.gstatic.com/firebasejs/12.4.0/firebase-app.js';
import { getAuth } from 'https://www.gstatic.com/firebasejs/12.4.0/firebase-auth.js';
import { getFirestore } from 'https://www.gstatic.com/firebasejs/12.4.0/firebase-firestore.js';

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

export { app, auth, db };