import { Timestamp } from 'firebase-admin/firestore';
import { handleConfigError } from '../server/config.js';
import { handleCors } from '../server/cors.js';
import { getAdminServices } from '../server/firebaseAdmin.js';
import { requireAdmin, verifyFirebaseRequest } from '../server/auth.js';
import {
  ensureMainAdminUid,
  getAllPageKeys,
  normalizeRole,
  normalizeStatus,
  sanitizePermissions,
} from '../server/accessControl.js';

export default async function handler(req, res) {
  if (handleCors(req, res)) {
    return;
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const {
    uid,
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

  if (!uid) {
    return res.status(400).json({ error: 'uid is required' });
  }

  if (password && String(password).length < 8) {
    return res.status(400).json({ error: 'Password must be at least 8 characters' });
  }

  try {
    const authContext = await verifyFirebaseRequest(req);
    requireAdmin(authContext);

    const { auth, db } = getAdminServices();
    const mainAdminUid = await ensureMainAdminUid(db, authContext.decodedToken.uid);
    const userRef = db.collection('users').doc(uid);
    const userSnapshot = await userRef.get();

    if (!userSnapshot.exists) {
      return res.status(404).json({ error: 'User not found' });
    }

    const existingUser = userSnapshot.data() || {};
    const existingRole = normalizeRole(existingUser.role);
    const nextRole = role ? normalizeRole(role) : existingRole;
    const nextStatus = status ? normalizeStatus(status) : normalizeStatus(existingUser.status);
    const nextPermissions = permissions === undefined
      ? sanitizePermissions(nextRole, existingUser.permissions)
      : sanitizePermissions(nextRole, permissions, { fallbackToAll: false });

    const isMainAdmin = Boolean(mainAdminUid) && uid === mainAdminUid;

    if (isMainAdmin) {
      const requestedPermissions = permissions === undefined ? getAllPageKeys('admin') : nextPermissions;
      const hasFullAdminAccess = getAllPageKeys('admin').every((pageKey) => requestedPermissions.includes(pageKey));

      if (nextRole !== 'admin' || nextStatus !== 'active' || !hasFullAdminAccess) {
        return res.status(400).json({ error: 'Main admin must remain active with full admin access' });
      }
    }

    const authUpdates = {};

    if (name) {
      authUpdates.displayName = name.trim();
    }

    if (email) {
      authUpdates.email = email.trim();
    }

    if (password) {
      authUpdates.password = password;
    }

    if (Object.keys(authUpdates).length > 0) {
      await auth.updateUser(uid, authUpdates);
    }

    const firestoreUpdate = {
      updatedAt: Timestamp.now(),
    };

    if (name !== undefined) {
      firestoreUpdate.name = name.trim();
    }

    if (email !== undefined) {
      firestoreUpdate.email = email.trim();
    }

    if (phone !== undefined) {
      firestoreUpdate.phone = String(phone).trim();
    }

    if (whatsapp !== undefined) {
      firestoreUpdate.whatsapp = String(whatsapp).trim();
    }

    if (designation !== undefined) {
      firestoreUpdate.designation = designation.trim();
    }

    firestoreUpdate.role = isMainAdmin ? 'admin' : nextRole;
    firestoreUpdate.status = isMainAdmin ? 'active' : nextStatus;
    firestoreUpdate.permissions = isMainAdmin
      ? getAllPageKeys('admin')
      : nextPermissions;

    await userRef.set(firestoreUpdate, { merge: true });

    return res.status(200).json({
      success: true,
      uid,
      permissions: firestoreUpdate.permissions,
      role: firestoreUpdate.role,
      status: firestoreUpdate.status,
    });
  } catch (error) {
    console.error('Critical:', error.message);

    if (handleConfigError(res, error)) {
      return;
    }

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
