import { initializeApp } from "firebase/app";
import {
  getAuth,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signInWithPopup,
  GoogleAuthProvider,
  signOut,
  onAuthStateChanged,
  User,
} from "firebase/auth";

const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY || "AIzaSyDa2TJTdyivaYh_wt9SY6w8hoPHA_lk-8Y",
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN || "mental-696ef.firebaseapp.com",
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID || "mental-696ef",
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET || "mental-696ef.firebasestorage.app",
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID || "35474767674",
  appId: import.meta.env.VITE_FIREBASE_APP_ID || "1:35474767674:web:3c347270e16696f86c1a03",
  measurementId: import.meta.env.VITE_FIREBASE_MEASUREMENT_ID || "G-9F3TES2TSR",
};

const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
const googleProvider = new GoogleAuthProvider();

export async function loginWithEmail(email: string, password: string) {
  return signInWithEmailAndPassword(auth, email, password);
}

export async function registerWithEmail(email: string, password: string) {
  return createUserWithEmailAndPassword(auth, email, password);
}

export async function loginWithGoogle() {
  return signInWithPopup(auth, googleProvider);
}

export async function logout() {
  return signOut(auth);
}

export function onAuthChange(callback: (user: User | null) => void) {
  return onAuthStateChanged(auth, callback);
}
