import { getAdminApp } from './_lib/firebaseAdmin.js';

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
    return res.status(500).json({
      error: 'Server config error: ' + initError.message
    });
  }

  const { auth, db } = adminApp;

  try {
    const token = authHeader.split('Bearer ')[1];

    let decoded;
    try {
      decoded = await auth.verifyIdToken(token);
    } catch (tokenErr) {
      return res.status(403).json({ error: 'Invalid token. Login again.' });
    }

    const callerDoc = await db.doc(`users/${decoded.uid}`).get();

    // FIXED: exists is a property in Admin SDK
    if (!callerDoc.exists || callerDoc.data()?.role !== 'admin') {
      return res.status(403).json({ error: 'Admin access required' });
    }

    const { uid } = req.body;

    if (!uid) return res.status(400).json({ error: 'uid required' });

    if (uid === decoded.uid) {
      return res.status(400).json({ error: 'Cannot delete yourself' });
    }

    // Delete Firebase Auth
    try {
      await auth.deleteUser(uid);
      console.log('Auth deleted:', uid);
    } catch (authErr) {
      console.log('Auth skip or not found:', authErr.message);
    }

    // Capture email before deleting doc for blacklisting
    let email = null;
    try {
      const userSnap = await db.doc(`users/${uid}`).get();
      email = userSnap.data()?.email;
    } catch (e) {}

    // Delete Firestore user doc
    try {
      await db.doc(`users/${uid}`).delete();
    } catch (e) {
      console.log('User doc deletion error:', e.message);
    }

    // Cleanup related data
    try {
      // Notifications
      const nSnap = await db.collection('notifications').doc(uid).collection('items').get();
      await Promise.all(nSnap.docs.map(d => d.ref.delete()));

      // Salary
      const sSnap = await db.collection('salary').doc(uid).collection('months').get();
      await Promise.all(sSnap.docs.map(d => d.ref.delete()));

      // Unassign tasks
      const tSnap = await db.collection('tasks').where('assignedTo', '==', uid).get();
      await Promise.all(tSnap.docs.map(d => d.ref.update({
        assignedTo: null,
        assignedToName: 'Unassigned',
        updatedAt: new Date()
      })));
    } catch (e) {
      console.error('Cleanup error:', e.message);
    }

    // Save to blacklist
    if (email) {
      try {
        await db.collection('blacklisted_emails').add({
          email,
          uid,
          deletedAt: new Date(),
          deletedBy: decoded.uid
        });
      } catch (e) {}
    }

    return res.status(200).json({
      success: true,
      message: 'Member permanently deleted'
    });

  } catch (error) {
    console.error('Delete error:', error.message);
    return res.status(500).json({ error: error.message });
  }
}
