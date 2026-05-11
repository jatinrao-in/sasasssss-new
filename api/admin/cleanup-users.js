import { handleConfigError } from '../../server/config.js';
import { handleCors } from '../../server/cors.js';
import { getAdminServices } from '../../server/firebaseAdmin.js';
import { verifyFirebaseRequest, requireAdmin } from '../../server/auth.js';

export default async function handler(req, res) {
  if (handleCors(req, res)) return;

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const authContext = await verifyFirebaseRequest(req);
    requireAdmin(authContext);

    const { auth, db } = getAdminServices();

    // ── STEP 1: Collect all Firebase Auth UIDs (paginated) ──────────────────
    const authUids = new Set();
    let pageToken;

    do {
      const listResult = await auth.listUsers(1000, pageToken);
      listResult.users.forEach((u) => authUids.add(u.uid));
      pageToken = listResult.pageToken;
    } while (pageToken);

    (function(){})(`[cleanup-users] Auth accounts found: ${authUids.size}`, [...authUids]);

    // ── STEP 2: Collect all Firestore /users documents ─────────────────────
    const firestoreSnap = await db.collection('users').get();
    (function(){})(`[cleanup-users] Firestore docs found: ${firestoreSnap.size}`);

    // ── STEP 3: Partition into valid vs orphan ──────────────────────────────
    const validDocs = [];
    const orphanDocs = [];

    firestoreSnap.docs.forEach((docSnap) => {
      const data = docSnap.data();
      const entry = { id: docSnap.id, email: data.email || '', name: data.name || '' };
      if (authUids.has(docSnap.id)) {
        validDocs.push(entry);
      } else {
        orphanDocs.push(entry);
      }
    });

    (function(){})('[cleanup-users] Valid:', validDocs);
    (function(){})('[cleanup-users] Orphans:', orphanDocs);

    // ── STEP 4: Delete orphans + their sub-collections ──────────────────────
    const deleteResults = [];

    for (const orphan of orphanDocs) {
      const result = { id: orphan.id, email: orphan.email, name: orphan.name, status: 'deleted', notificationsDeleted: 0, salaryDeleted: 0 };

      try {
        // Delete /users/{uid}
        await db.doc(`users/${orphan.id}`).delete();

        // Delete /notifications/{uid}/items/*
        try {
          const notifsSnap = await db.collection('notifications').doc(orphan.id).collection('items').get();
          await Promise.all(notifsSnap.docs.map((d) => d.ref.delete()));
          await db.collection('notifications').doc(orphan.id).delete().catch(() => {});
          result.notificationsDeleted = notifsSnap.size;
        } catch (e) {
          console.warn(`[cleanup-users] Notif cleanup for ${orphan.id}:`, e.message);
        }

        // Delete /salary/{uid}/months/*
        try {
          const salarySnap = await db.collection('salary').doc(orphan.id).collection('months').get();
          await Promise.all(salarySnap.docs.map((d) => d.ref.delete()));
          await db.collection('salary').doc(orphan.id).delete().catch(() => {});
          result.salaryDeleted = salarySnap.size;
        } catch (e) {
          console.warn(`[cleanup-users] Salary cleanup for ${orphan.id}:`, e.message);
        }

        (function(){})(`[cleanup-users] Deleted orphan: ${orphan.email} (${orphan.id})`);
      } catch (delErr) {
        result.status = 'error';
        result.error = delErr.message;
        console.error(`[cleanup-users] Failed to delete ${orphan.id}:`, delErr.message);
      }

      deleteResults.push(result);
    }

    return res.status(200).json({
      success: true,
      summary: {
        authUsersCount: authUids.size,
        firestoreDocsFound: firestoreSnap.size,
        validDocsKept: validDocs.length,
        orphanDocsDeleted: orphanDocs.length,
      },
      keptUsers: validDocs,
      deletedUsers: deleteResults,
    });
  } catch (error) {
    console.error('[cleanup-users] Error:', error);
    if (handleConfigError(res, error)) return;
    return res.status(error.statusCode || 500).json({ error: error.message });
  }
}
