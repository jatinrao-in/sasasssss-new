import { getAdminApp } from './lib/firebaseAdmin.js';

export default async function handler(req, res) {
  // CORS Headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Use POST method' });
  }

  const authHeader = req.headers.authorization;
  if (!authHeader?.startsWith('Bearer ')) {
    return res.status(403).json({ error: 'Bearer token required' });
  }

  let adminApp;
  try {
    adminApp = getAdminApp();
  } catch (initError) {
    console.error('Admin init failed:', initError.message);
    return res.status(500).json({ error: 'Server config error: ' + initError.message });
  }

  const { auth, db } = adminApp;

  try {
    const token = authHeader.split('Bearer ')[1];

    // Verify caller token
    let decoded;
    try {
      decoded = await auth.verifyIdToken(token);
    } catch (tokenErr) {
      return res.status(403).json({ error: 'Invalid token. Login again.' });
    }

    // Verify caller is admin
    const callerDoc = await db.doc(`users/${decoded.uid}`).get();
    if (!callerDoc.exists || callerDoc.data()?.role !== 'admin') {
      return res.status(403).json({ error: 'Admin access required' });
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

    // Get existing user from Firestore
    const userRef = db.collection('users').doc(uid);
    const userSnapshot = await userRef.get();

    if (!userSnapshot.exists) {
      return res.status(404).json({ error: 'User not found' });
    }

    const existingUser = userSnapshot.data() || {};

    // Determine main admin (the first admin created, stored in settings/main)
    let mainAdminUid = null;
    try {
      const settingsDoc = await db.doc('settings/main').get();
      mainAdminUid = settingsDoc.data()?.adminUid || null;
    } catch (_) {}

    const isMainAdmin = Boolean(mainAdminUid) && uid === mainAdminUid;

    // Normalize role and status
    const nextRole = role ? (role === 'admin' ? 'admin' : 'member') : (existingUser.role || 'member');
    const nextStatus = status ? (status === 'inactive' ? 'inactive' : 'active') : (existingUser.status || 'active');

    // Protect main admin: cannot demote, deactivate, or remove permissions
    if (isMainAdmin) {
      if (nextRole !== 'admin' || nextStatus !== 'active') {
        return res.status(400).json({ error: 'Main admin must remain active with admin role' });
      }
    }

    // Build permission list
    const adminPerms = [
      'dashboard', 'projects', 'enquiry',
      'followups', 'payments',
      'outgoing_payments', 'rgp', 'salary',
      'tools', 'team', 'settings', 'whatsapp'
    ];
    const memberPerms = [
      'dashboard', 'tasks', 'enquiry',
      'followups', 'payments', 'rgp', 'profile'
    ];

    let nextPermissions;
    if (isMainAdmin) {
      nextPermissions = adminPerms;
    } else if (permissions !== undefined) {
      // Filter provided permissions to only valid ones for the role
      const validPerms = nextRole === 'admin' ? adminPerms : memberPerms;
      nextPermissions = permissions.filter(p => validPerms.includes(p));
    } else {
      // Keep existing or default by role
      nextPermissions = Array.isArray(existingUser.permissions)
        ? existingUser.permissions
        : (nextRole === 'admin' ? adminPerms : memberPerms);
    }

    // Update Firebase Auth user
    const authUpdates = {};

    if (name) authUpdates.displayName = name.trim();
    if (email) authUpdates.email = email.trim();
    if (password) authUpdates.password = password;
    if (status && !isMainAdmin) {
      authUpdates.disabled = nextStatus === 'inactive';
    }

    if (Object.keys(authUpdates).length > 0) {
      try {
        await auth.updateUser(uid, authUpdates);
      } catch (authErr) {
        if (authErr.code === 'auth/email-already-exists') {
          return res.status(409).json({ error: 'This email is already registered' });
        }
        return res.status(400).json({ error: authErr.message });
      }
    }

    // Update Firestore document
    const firestoreUpdate = {
      updatedAt: new Date(),
    };

    if (name !== undefined) firestoreUpdate.name = name.trim();
    if (email !== undefined) firestoreUpdate.email = email.trim();
    if (phone !== undefined) firestoreUpdate.phone = String(phone).trim();
    if (whatsapp !== undefined) firestoreUpdate.whatsapp = String(whatsapp).trim();
    if (designation !== undefined) firestoreUpdate.designation = designation.trim();

    firestoreUpdate.role = isMainAdmin ? 'admin' : nextRole;
    firestoreUpdate.status = isMainAdmin ? 'active' : nextStatus;
    firestoreUpdate.permissions = nextPermissions;

    await userRef.set(firestoreUpdate, { merge: true });

    return res.status(200).json({
      success: true,
      uid,
      permissions: firestoreUpdate.permissions,
      role: firestoreUpdate.role,
      status: firestoreUpdate.status,
    });

  } catch (error) {
    console.error('Update member error:', error.message);
    return res.status(500).json({ error: error.message });
  }
}
