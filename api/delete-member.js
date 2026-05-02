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

    // 1. Delete from Firebase Auth
    try {
      await auth.deleteUser(uid);
    } catch (authErr) {
      // User may not exist in Auth (Firestore-only record), continue
      console.warn('Auth deleteUser skipped:', authErr.message);
    }

    // 2. Delete Firestore user document
    await db.doc(`users/${uid}`).delete();

    // 3. Delete notification subcollection items
    const notifsSnap = await db
      .collection('notifications')
      .doc(uid)
      .collection('items')
      .get();
    if (!notifsSnap.empty) {
      await Promise.all(notifsSnap.docs.map((d) => d.ref.delete()));
      // Delete the parent notification doc too
      await db.collection('notifications').doc(uid).delete().catch(() => {});
    }

    // 4. Delete salary subcollection
    const salarySnap = await db
      .collection('salary')
      .doc(uid)
      .collection('months')
      .get();
    if (!salarySnap.empty) {
      await Promise.all(salarySnap.docs.map((d) => d.ref.delete()));
      await db.collection('salary').doc(uid).delete().catch(() => {});
    }

    console.log(`Member ${uid} fully deleted by ${authContext.decodedToken.uid}`);

    return res.status(200).json({
      success: true,
      message: 'Member deleted from Auth and Firestore',
    });
  } catch (error) {
    console.error('Delete member error:', error);

    if (handleConfigError(res, error)) return;

    const statusCode = error.statusCode || 500;
    return res.status(statusCode).json({ error: error.message });
  }
}
