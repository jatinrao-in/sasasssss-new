import { Timestamp } from 'firebase-admin/firestore';
import { getAdminServices } from './_lib/firebaseAdmin.js';
import { requireAdmin, verifyFirebaseRequest } from './_lib/auth.js';

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

  const { name, email, password, phone, whatsapp, designation, permissions } = req.body || {};

  if (!name || !email || !password) {
    return res.status(400).json({ error: 'name, email, and password are required' });
  }

  try {
    const authContext = await verifyFirebaseRequest(req);
    requireAdmin(authContext);

    const { auth, db } = getAdminServices();
    const userRecord = await auth.createUser({
      email,
      password,
      displayName: name,
    });

    await db.collection('users').doc(userRecord.uid).set({
      name,
      email,
      phone: phone || '',
      whatsapp: whatsapp || '',
      designation: designation || '',
      role: 'member',
      status: 'active',
      permissions: permissions || ['dashboard', 'projects', 'enquiry', 'followups', 'payments'],
      createdAt: Timestamp.now(),
      createdBy: authContext.decodedToken.uid,
    });

    return res.status(200).json({
      success: true,
      uid: userRecord.uid,
      message: `Member ${name} created successfully`,
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
