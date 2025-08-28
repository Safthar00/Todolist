import { initializeApp } from 'https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js';
import { getAuth, signInWithEmailAndPassword, createUserWithEmailAndPassword, onAuthStateChanged, signOut } from 'https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js';
import { getFirestore, collection, addDoc, doc, updateDoc, deleteDoc, query, orderBy, onSnapshot, serverTimestamp, where } from 'https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js';

// Replace with your Firebase config
const firebaseConfig = {
  apiKey: "AIzaSyBq9z2rrH7xMwhnjyYzVKot36ekvsa4X4o",
  authDomain: "todolist-d63ce.firebaseapp.com",
  projectId: "todolist-d63ce",
  storageBucket: "todolist-d63ce.firebasestorage.app",
  messagingSenderId: "696580055388",
  appId: "1:696580055388:web:d92dfdaa735f142971e199"
};

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

export { app, auth, db, signInWithEmailAndPassword, createUserWithEmailAndPassword, onAuthStateChanged, signOut, collection, addDoc, doc, updateDoc, deleteDoc, query, orderBy, onSnapshot, serverTimestamp, where };