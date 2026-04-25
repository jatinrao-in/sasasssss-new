import { Timestamp } from 'firebase-admin/firestore';
import { getAdminServices } from './_lib/firebaseAdmin.js';
import { requireAdmin, verifyFirebaseRequest } from './_lib/auth.js';
import {
  ensureMainAdminUid,
  normalizeRole,
  normalizeStatus,
  sanitizePermissions,
} from './_lib/accessControl.js';

const setCorsHeaders = (req, res) => {
  const origin = req.headers.origin || '*';
  res.setHeader('Access-Control-Allow-Origin', origin);
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
};

export default async function handler(req, res) {
  setCorsHeaders(req, res);

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const {
    name,
    email,
    password,
    phone,
    whatsapp,
    designation,
    role,
    permissions,
    status,
  } = req.body || {};

  if (!name || !email || !password || !phone || !whatsapp || !designation) {
    return res.status(400).json({ error: 'name, email, password, phone, whatsapp, and designation are required' });
  }

  if (String(password).length < 8) {
    return res.status(400).json({ error: 'Password must be at least 8 characters' });
  }

  const normalizedRole = normalizeRole(role);
  const normalizedStatus = normalizeStatus(status);
  const normalizedPermissions = sanitizePermissions(normalizedRole, permissions);

  try {
    const authContext = await verifyFirebaseRequest(req);
    requireAdmin(authContext);

    const { auth, db } = getAdminServices();
    await ensureMainAdminUid(db, authContext.decodedToken.uid);

    const userRecord = await auth.createUser({
      email: email.trim(),
      password,
      displayName: name.trim(),
    });

    await db.collection('users').doc(userRecord.uid).set({
      name: name.trim(),
      email: email.trim(),
      phone: String(phone).trim(),
      whatsapp: String(whatsapp).trim(),
      designation: designation.trim(),
      role: normalizedRole,
      permissions: normalizedPermissions,
      status: normalizedStatus,
      fcmToken: null,
      createdAt: Timestamp.now(),
      updatedAt: Timestamp.now(),
      createdBy: authContext.decodedToken.uid,
    });

    return res.status(200).json({
      success: true,
      uid: userRecord.uid,
      message: `${normalizedRole === 'admin' ? 'Admin' : 'Member'} ${name.trim()} created successfully`,
    });
  } catch (error) {
    console.error('[create-member]', error.message);

    const statusCode = error.statusCode
      || (error.code === 'auth/email-already-exists' ? 409 : 0)
      || (String(error.code || '').startsWith('auth/') ? 401 : 0)
      || 500;
    const message = error.code === 'auth/email-already-exists'
      ? 'This email is already registered'
      : error.message;

    return res.status(statusCode).json({ error: message });
  }
}
