import { getApp, getApps, initializeApp } from 'firebase/app';
import { getAuth, indexedDBLocalPersistence, browserLocalPersistence, initializeAuth } from 'firebase/auth';
import {
  initializeFirestore,
  persistentLocalCache,
  persistentSingleTabManager,
  connectFirestoreEmulator,
} from 'firebase/firestore';
import { connectFunctionsEmulator, getFunctions } from 'firebase/functions';
import { getMessaging } from 'firebase/messaging';

const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY || 'AIzaSyAdUkbJTH1yPNGz1yZ2vyC0dXHWgnSabgg',
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN || 'saya-industrial.firebaseapp.com',
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID || 'saya-industrial',
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET || 'saya-industrial.firebasestorage.app',
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID || '256650571457',
  appId: import.meta.env.VITE_FIREBASE_APP_ID || '1:256650571457:web:454afbda01bebeab886e40',
};

const app = getApps().length ? getApp() : initializeApp(firebaseConfig);

// ✅ Auth with IndexedDB persistence — loads from local cache on startup (no server round-trip)
let auth;
try {
  auth = initializeAuth(app, {
    persistence: [indexedDBLocalPersistence, browserLocalPersistence],
  });
} catch {
  // initializeAuth throws if already initialized (e.g. HMR), fall back to getAuth
  auth = getAuth(app);
}

// ✅ Firestore with persistent local cache — data loads instantly from IndexedDB on reopen
const db = initializeFirestore(app, {
  localCache: persistentLocalCache({
    tabManager: persistentSingleTabManager({ forceOwnership: true }),
  }),
});

const functions = getFunctions(app, 'asia-south1');

// ✅ Messaging only in browser context (not SSR/SW)
const messaging = typeof window !== 'undefined' ? getMessaging(app) : null;

const useFirebaseEmulators = import.meta.env.VITE_USE_FIREBASE_EMULATORS === 'true';
if (useFirebaseEmulators) {
  const { connectAuthEmulator } = await import('firebase/auth');
  connectAuthEmulator(auth, 'http://127.0.0.1:9099', { disableWarnings: true });
  connectFirestoreEmulator(db, '127.0.0.1', 8080);
  connectFunctionsEmulator(functions, '127.0.0.1', 5001);
}

export { auth, db, functions, messaging, firebaseConfig };
export default app;
