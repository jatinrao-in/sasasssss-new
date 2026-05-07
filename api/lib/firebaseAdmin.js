import { initializeApp, getApps, cert } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import { getAuth } from 'firebase-admin/auth';

let cachedApp = null;

export const getAdminApp = () => {
  if (cachedApp) {
    return {
      db: getFirestore(cachedApp),
      auth: getAuth(cachedApp)
    };
  }

  const privateKey = process.env.FIREBASE_PRIVATE_KEY
    ?.replace(/\\n/g, '\n')
    ?.replace(/^"|"$/g, '');

  if (!process.env.FIREBASE_PROJECT_ID || !process.env.FIREBASE_CLIENT_EMAIL || !privateKey) {
    throw new Error('Missing Firebase env vars');
  }

  const app = getApps().length > 0
    ? getApps()[0]
    : initializeApp({
        credential: cert({
          projectId: process.env.FIREBASE_PROJECT_ID,
          clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
          privateKey
        })
      });

  cachedApp = app;
  return {
    db: getFirestore(app),
    auth: getAuth(app)
  };
};

export const getAdminServices = () => getAdminApp();

export default getAdminApp;
