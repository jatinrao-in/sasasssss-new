import { getApp, getApps, initializeApp } from 'firebase/app';
import { connectAuthEmulator, getAuth } from 'firebase/auth';
import { connectFirestoreEmulator, getFirestore } from 'firebase/firestore';
import { connectFunctionsEmulator, getFunctions } from 'firebase/functions';

// Use Vite env vars (populated from .env.production / .env.development)
// Falls back to the shared config if env vars are missing (local dev compat)
const firebaseConfig = {
 apiKey: import.meta.env.VITE_FIREBASE_API_KEY || 'AIzaSyAdUkbJTH1yPNGz1yZ2vyC0dXHWgnSabgg',
 authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN || 'saya-industrial.firebaseapp.com',
 projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID || 'saya-industrial',
 storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET || 'saya-industrial.firebasestorage.app',
 messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID || '256650571457',
 appId: import.meta.env.VITE_FIREBASE_APP_ID || '1:256650571457:web:454afbda01bebeab886e40',
};

const app = getApps().length ? getApp() : initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);
const functions = getFunctions(app, 'asia-south1');
const useFirebaseEmulators = import.meta.env.VITE_USE_FIREBASE_EMULATORS === 'true';

if (useFirebaseEmulators) {
 connectAuthEmulator(auth, 'http://127.0.0.1:9099', { disableWarnings: true });
 connectFirestoreEmulator(db, '127.0.0.1', 8080);
 connectFunctionsEmulator(functions, '127.0.0.1', 5001);
}

export { auth, db, functions, firebaseConfig };
export default app;
