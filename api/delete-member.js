import { handleConfigError } from '../server/config.js';
import { handleCors } from '../server/cors.js';
import { getAdminServices } from '../server/firebaseAdmin.js';
import { verifyFirebaseRequest, requireAdmin } from '../server/auth.js';

export default async function handler(req, res) {
  if (handleCors(req, res)) return;

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const authContext = await verifyFirebaseRequest(req);
    requireAdmin(authContext);

    const { auth, db } = getAdminServices();
    const { uid } = req.body || {};

    if (!uid) {
      return res.status(400).json({ error: 'uid is required' });
    }

    // Prevent self-deletion
    if (uid === authContext.decodedToken.uid) {
      return res.status(400).json({ error: 'Cannot delete your own account' });
    }

    // 1. Get user data to find the email
    const userRef = db.doc(`users/${uid}`);
    const userSnap = await userRef.get();
    
    if (!userSnap.exists) {
      return res.status(404).json({ error: 'User not found in Firestore' });
    }
    const userData = userSnap.data();
    const emailToBlacklist = userData.email;

    const deleteLog = {
      uid,
      authDeleted: false,
      firestoreDeleted: false,
      notificationsDeleted: 0,
      salaryDeleted: 0,
      tasksUnassigned: 0,
      emailBlacklisted: false,
    };

    // 2. Add email to blacklist
    if (emailToBlacklist) {
      try {
        await db.doc(`blacklisted_emails/${emailToBlacklist}`).set({
          email: emailToBlacklist,
          deletedAt: new Date(),
          deletedBy: authContext.decodedToken.uid,
          uid: uid
        });
        deleteLog.emailBlacklisted = true;
      } catch (blacklistErr) {
        console.error('Blacklist error:', blacklistErr.message);
        throw new Error('Failed to blacklist email. Aborting deletion to prevent re-registration.');
      }
    }

    // 3. Delete from Firebase Auth
    try {
      await auth.deleteUser(uid);
      deleteLog.authDeleted = true;
    } catch (authErr) {
      // User may not exist in Auth (orphan Firestore record) — continue anyway
      console.warn('Auth deleteUser skipped:', authErr.message);
    }

    // 4. Delete Firestore user document
    try {
      await userRef.delete();
      deleteLog.firestoreDeleted = true;
    } catch (fsErr) {
      console.error('Firestore user delete error:', fsErr.message);
    }

    // 3. Delete notification subcollection items
    try {
      const notifsSnap = await db.collection('notifications').doc(uid).collection('items').get();
      if (!notifsSnap.empty) {
        await Promise.all(notifsSnap.docs.map((d) => d.ref.delete()));
        await db.collection('notifications').doc(uid).delete().catch(() => {});
        deleteLog.notificationsDeleted = notifsSnap.size;
      }
    } catch (e) {
      console.warn('Notification cleanup error:', e.message);
    }

    // 4. Delete salary subcollection
    try {
      const salarySnap = await db.collection('salary').doc(uid).collection('months').get();
      if (!salarySnap.empty) {
        await Promise.all(salarySnap.docs.map((d) => d.ref.delete()));
        await db.collection('salary').doc(uid).delete().catch(() => {});
        deleteLog.salaryDeleted = salarySnap.size;
      }
    } catch (e) {
      console.warn('Salary cleanup error:', e.message);
    }

    // 5. Unassign tasks (don't delete — keep task history)
    try {
      const tasksSnap = await db.collection('tasks').where('assignedTo', '==', uid).get();
      if (!tasksSnap.empty) {
        await Promise.all(tasksSnap.docs.map((d) => d.ref.update({
          assignedTo: '',
          assignedToName: 'Unassigned',
          updatedAt: new Date(),
        })));
        deleteLog.tasksUnassigned = tasksSnap.size;
      }
    } catch (e) {
      console.warn('Task unassign error:', e.message);
    }

    console.log(`Member ${uid} fully deleted by ${authContext.decodedToken.uid}`, deleteLog);

    return res.status(200).json({
      success: true,
      message: 'Member permanently deleted from Auth and Firestore',
      deleteLog,
    });
  } catch (error) {
    console.error('Delete member error:', error);

    if (handleConfigError(res, error)) return;

    const statusCode = error.statusCode || 500;
    return res.status(statusCode).json({ error: error.message });
  }
}
