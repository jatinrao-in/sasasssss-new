import { getApp, getApps, initializeApp } from 'firebase/app';
import {
  getFirestore,
  initializeFirestore,
  persistentLocalCache,
  persistentMultipleTabManager,
} from 'firebase/firestore';
import {
  getAuth,
  browserLocalPersistence,
  setPersistence,
} from 'firebase/auth';
import { getMessaging } from 'firebase/messaging';

import { getAnalytics, isSupported } from 'firebase/analytics';

function sanitizeFirebaseEnv(value) {
  return String(value ?? '')
    .replace(/\\[rn]/g, '')
    .replace(/[\r\n]+/g, '')
    .trim();
}

const firebaseConfig = {
  apiKey: sanitizeFirebaseEnv(import.meta.env.VITE_FIREBASE_API_KEY),
  authDomain: sanitizeFirebaseEnv(import.meta.env.VITE_FIREBASE_AUTH_DOMAIN),
  projectId: sanitizeFirebaseEnv(import.meta.env.VITE_FIREBASE_PROJECT_ID),
  storageBucket: sanitizeFirebaseEnv(import.meta.env.VITE_FIREBASE_STORAGE_BUCKET),
  messagingSenderId: sanitizeFirebaseEnv(import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID),
  appId: sanitizeFirebaseEnv(import.meta.env.VITE_FIREBASE_APP_ID),
  databaseURL: sanitizeFirebaseEnv(import.meta.env.VITE_FIREBASE_DATABASE_URL) || undefined,
  measurementId: sanitizeFirebaseEnv(import.meta.env.VITE_FIREBASE_MEASUREMENT_ID) || undefined,
};

const missingFirebaseConfigKeys = Object.entries(firebaseConfig)
  .filter(([, value]) => !value)
  .map(([key]) => key);

if (missingFirebaseConfigKeys.length > 0) {
  throw new Error(`Missing Firebase client config: ${missingFirebaseConfigKeys.join(', ')}`);
}

const app = getApps().length ? getApp() : initializeApp(firebaseConfig);

export const db = (() => {
  try {
    return initializeFirestore(app, {
      localCache: persistentLocalCache({
        tabManager: persistentMultipleTabManager(),
      }),
    });
  } catch {
    return getFirestore(app);
  }
})();

export const auth = getAuth(app);

// Set persistence ONCE
setPersistence(auth, browserLocalPersistence)
  .catch(err => console.error('Persistence error:', err));

export const messaging = typeof window !== 'undefined' ? getMessaging(app) : null;
export const analytics = typeof window !== 'undefined' && firebaseConfig.measurementId ? getAnalytics(app) : null;

export default app;
