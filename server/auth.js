import { getAdminServices } from './firebaseAdmin.js';

export async function verifyFirebaseRequest(req) {
  const authHeader = req.headers.authorization;
  if (!authHeader?.startsWith('Bearer ')) {
    throw Object.assign(new Error('Unauthorized: No token'), { statusCode: 401 });
  }

  const token = authHeader.split('Bearer ')[1];
  const { auth, db } = getAdminServices();

  try {
    const decodedToken = await auth.verifyIdToken(token);
    const userDoc = await db.doc(`users/${decodedToken.uid}`).get();
    
    if (!userDoc.exists) {
      throw Object.assign(new Error('User not found'), { statusCode: 404 });
    }

    return {
      uid: decodedToken.uid,
      decodedToken,
      role: userDoc.data()?.role || 'member',
      permissions: userDoc.data()?.permissions || []
    };
  } catch (error) {
    console.error('Auth verification failed:', error.message);
    throw Object.assign(new Error('Unauthorized: Invalid token'), { statusCode: 401 });
  }
}

export function requireAdmin(authContext) {
  if (authContext.role !== 'admin') {
    throw Object.assign(new Error('Forbidden: Admin access required'), { statusCode: 403 });
  }
}

export function requireNotifyPermission(authContext, eventType) {
  // Most users can trigger common notifications, but we can add strict checks here
  // For now, allow any authenticated user to hit the notify endpoint
  if (!authContext.uid) {
    throw Object.assign(new Error('Unauthorized'), { statusCode: 401 });
  }
}
