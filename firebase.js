/**
 * Firebase modular initialization for the wedding invitation SPA.
 * Firestore is used for guest messages and RSVP submissions.
 */
import { initializeApp } from 'https://www.gstatic.com/firebasejs/11.6.1/firebase-app.js';
import { getFirestore } from 'https://www.gstatic.com/firebasejs/11.6.1/firebase-firestore.js';

const firebaseConfig = {
  apiKey: 'AIzaSyA8I0qo1zmMGpjI6lW3a97GKCU_B8jar5M',
  authDomain: 'wedding-invitation-f2472.firebaseapp.com',
  projectId: 'wedding-invitation-f2472',
  storageBucket: 'wedding-invitation-f2472.firebasestorage.app',
  messagingSenderId: '962062936017',
  appId: '1:962062936017:web:9df8d8129fe9b148cca2f0',
  measurementId: 'G-EP4VBJ6DEE',
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

export { app, db };
