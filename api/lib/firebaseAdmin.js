import { initializeApp, getApps, cert }
  from 'firebase-admin/app';
import { getFirestore }
  from 'firebase-admin/firestore';
import { getAuth }
  from 'firebase-admin/auth';

let cachedApp = null;

export const getAdminApp = () => {
  if (cachedApp) {
    return {
      db: getFirestore(cachedApp),
      auth: getAuth(cachedApp)
    };
  }

  const projectId = 
    process.env.FIREBASE_PROJECT_ID;
  const clientEmail = 
    process.env.FIREBASE_CLIENT_EMAIL;
  const privateKey = process.env
    .FIREBASE_PRIVATE_KEY
    ?.replace(/\\n/g, '\n')
    ?.replace(/^"|"$/g, '');

  if (!projectId || !clientEmail || 
    !privateKey) {
    throw new Error(
      'Missing Firebase Admin env vars: ' +
      `projectId=${!!projectId} ` +
      `clientEmail=${!!clientEmail} ` +
      `privateKey=${!!privateKey}`
    );
  }

  if (getApps().length > 0) {
    cachedApp = getApps()[0];
  } else {
    cachedApp = initializeApp({
      credential: cert({
        projectId,
        clientEmail,
        privateKey
      })
    });
  }

  return {
    db: getFirestore(cachedApp),
    auth: getAuth(cachedApp)
  };
};
