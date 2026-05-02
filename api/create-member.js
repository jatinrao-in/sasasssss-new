import { handleConfigError } from '../server/config.js';
import { handleCors } from '../server/cors.js';
import { getAdminServices } from '../server/firebaseAdmin.js';
import { verifyFirebaseRequest, requireAdmin } from '../server/auth.js';

const MEMBER_PERMISSIONS = [
  'dashboard', 'tasks', 'enquiry',
  'followups', 'payments', 'rgp', 'profile',
];

const ADMIN_PERMISSIONS = [
  'dashboard', 'projects', 'enquiry',
  'followups', 'payments', 'outgoing_payments',
  'rgp', 'salary', 'tools', 'team', 'settings', 'whatsapp',
];

export default async function handler(req, res) {
  if (handleCors(req, res)) return;

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const authContext = await verifyFirebaseRequest(req);
    requireAdmin(authContext);

    const { auth, db } = getAdminServices();

    const {
      name, email, password,
      phone, whatsapp, designation,
      role, permissions, status,
    } = req.body || {};

    // Validate required fields
    if (!name?.trim()) {
      return res.status(400).json({ error: 'Name is required' });
    }
    if (!email?.trim()) {
      return res.status(400).json({ error: 'Email is required' });
    }
    if (!password || String(password).length < 6) {
      return res.status(400).json({ error: 'Password must be at least 6 characters' });
    }

    // Create Firebase Auth user
    let newUser;
    try {
      newUser = await auth.createUser({
        email: email.trim().toLowerCase(),
        password: String(password),
        displayName: name.trim(),
        emailVerified: false,
      });
    } catch (authErr) {
      if (authErr.code === 'auth/email-already-exists') {
        return res.status(400).json({ error: 'Email already registered' });
      }
      if (authErr.code === 'auth/invalid-email') {
        return res.status(400).json({ error: 'Invalid email format' });
      }
      throw authErr;
    }

    const normalizedRole = role === 'admin' ? 'admin' : 'member';
    const defaultPermissions = normalizedRole === 'admin' ? ADMIN_PERMISSIONS : MEMBER_PERMISSIONS;
    const finalPermissions = Array.isArray(permissions) && permissions.length > 0
      ? permissions
      : defaultPermissions;

    // Save to Firestore
    await db.doc(`users/${newUser.uid}`).set({
      name: name.trim(),
      email: email.trim().toLowerCase(),
      phone: phone?.trim() || '',
      whatsapp: whatsapp?.trim() || '',
      designation: designation?.trim() || '',
      role: normalizedRole,
      permissions: finalPermissions,
      status: status === 'inactive' ? 'inactive' : 'active',
      fcmToken: null,
      createdAt: new Date(),
      updatedAt: new Date(),
      createdBy: authContext.decodedToken.uid,
    });

    // Send welcome WhatsApp if number present
    if (whatsapp?.trim()) {
      try {
        const { sendWelcomeMessage } = await import('../server/whatsapp/msg91.js');
        await sendWelcomeMessage(
          whatsapp.trim(),
          name.trim(),
        );
      } catch (msgErr) {
        console.warn('Welcome WhatsApp skipped:', msgErr.message);
      }
    }

    console.log(`Member created: ${newUser.uid} (${normalizedRole}) by ${authContext.decodedToken.uid}`);

    return res.status(200).json({
      success: true,
      uid: newUser.uid,
      message: `${name.trim()} created successfully`,
    });
  } catch (error) {
    console.error('Create member error:', error);

    if (handleConfigError(res, error)) return;

    const statusCode = error.statusCode
      || (error.code === 'auth/email-already-exists' ? 409 : 0)
      || (String(error.code || '').startsWith('auth/') ? 400 : 0)
      || 500;
    const message = error.code === 'auth/email-already-exists'
      ? 'This email is already registered'
      : error.message;

    return res.status(statusCode).json({ error: message });
  }
}
