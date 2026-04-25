import { getAdminServices } from './firebaseAdmin.js';

const NOTIFY_MEMBER_EVENTS = new Set(['task_completed']);

const httpError = (statusCode, message) => {
  const error = new Error(message);
  error.statusCode = statusCode;
  return error;
};

const readBearerToken = (req) => {
  const authHeader = String(req.headers.authorization || req.headers.Authorization || '').trim();

  const match = authHeader.match(/^Bearer\s+(.+)$/i);

  if (!match) {
    throw httpError(401, 'No token provided');
  }

  return match[1].trim();
};

export async function verifyFirebaseRequest(req) {
  const token = readBearerToken(req);
  const { auth, db } = getAdminServices();
  const decodedToken = await auth.verifyIdToken(token);
  const userSnapshot = await db.collection('users').doc(decodedToken.uid).get();
  const userProfile = userSnapshot.exists ? userSnapshot.data() : {};

  return {
    decodedToken,
    userProfile,
    role: userProfile?.role || null,
  };
}

export function requireAdmin(authContext) {
  if (authContext.role !== 'admin') {
    throw httpError(403, 'Forbidden');
  }
}

export function requireNotifyPermission(authContext, eventType) {
  if (authContext.role === 'admin') {
    return;
  }

  if (NOTIFY_MEMBER_EVENTS.has(eventType)) {
    return;
  }

  throw httpError(403, 'Forbidden');
}
