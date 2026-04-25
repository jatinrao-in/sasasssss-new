import { createPrivateKey } from 'node:crypto';
import { cert, getApps, initializeApp } from 'firebase-admin/app';
import { getAuth } from 'firebase-admin/auth';
import { getFirestore } from 'firebase-admin/firestore';
import { getMessaging } from 'firebase-admin/messaging';
import { InvalidConfigError, requireEnv } from './config.js';

function normalizeFirebasePrivateKey(privateKey) {
  return String(privateKey ?? '')
    .replace(/\r\n/g, '\n')
    .replace(/\r/g, '\n')
    .replace(/\\n/g, '\n')
    .trim();
}

function validateFirebasePrivateKey(privateKey) {
  const hasPemBoundary = /-----BEGIN (?:RSA )?PRIVATE KEY-----/.test(privateKey)
    && /-----END (?:RSA )?PRIVATE KEY-----/.test(privateKey);

  if (!hasPemBoundary) {
    throw new InvalidConfigError(
      'FIREBASE_PRIVATE_KEY is missing a valid PEM header/footer. Paste the full key into Vercel, including the BEGIN and END lines.',
      ['FIREBASE_PRIVATE_KEY'],
    );
  }

  try {
    createPrivateKey(privateKey);
  } catch (error) {
    throw new InvalidConfigError(
      'FIREBASE_PRIVATE_KEY could not be decoded. Generate a new Firebase service account key and paste it into Vercel using real line breaks.',
      ['FIREBASE_PRIVATE_KEY'],
    );
  }
}

export function getAdminApp() {
  if (!getApps().length) {
    const {
      FIREBASE_PROJECT_ID,
      FIREBASE_CLIENT_EMAIL,
      FIREBASE_PRIVATE_KEY,
    } = requireEnv([
      'FIREBASE_PROJECT_ID',
      'FIREBASE_CLIENT_EMAIL',
      'FIREBASE_PRIVATE_KEY',
    ]);
    const normalizedPrivateKey = normalizeFirebasePrivateKey(FIREBASE_PRIVATE_KEY);

    validateFirebasePrivateKey(normalizedPrivateKey);
    initializeApp({
      credential: cert({
        projectId: FIREBASE_PROJECT_ID,
        clientEmail: FIREBASE_CLIENT_EMAIL,
        privateKey: normalizedPrivateKey,
      }),
    });
  }

  return getApps()[0];
}

export function getAdminServices() {
  const app = getAdminApp();

  return {
    app,
    auth: getAuth(app),
    db: getFirestore(app),
    messaging: getMessaging(app),
  };
}
