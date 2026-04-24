const { getFirebaseAdmin } = require('../lib/firebaseAdmin');

/**
 * POST /api/create-member
 * Replaces the Firebase Cloud Function `createTeamMember`.
 * Creates a Firebase Auth user + writes their Firestore profile.
 * Protected by VERCEL_API_SECRET.
 */
module.exports = async (req, res) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method Not Allowed' });

  const authHeader = req.headers.authorization;
  if (!authHeader || authHeader !== `Bearer ${process.env.VERCEL_API_SECRET}`) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  const { name, email, password, phone, whatsapp, designation, permissions } = req.body || {};

  if (!name || !email || !password) {
    return res.status(400).json({ error: 'Name, email, and password are required.' });
  }

  const { auth, db, FieldValue } = getFirebaseAdmin();

  try {
    const userRecord = await auth.createUser({ email, password, displayName: name });

    await db.collection('users').doc(userRecord.uid).set({
      createdAt: FieldValue.serverTimestamp(),
      designation: designation || '',
      email,
      name,
      phone: phone || '',
      role: 'member',
      status: 'active',
      whatsapp: whatsapp || '',
      permissions: (permissions && permissions.length > 0)
        ? permissions
        : ['dashboard', 'projects', 'enquiry', 'followups', 'payments'],
    });

    return res.status(200).json({ success: true, uid: userRecord.uid });
  } catch (error) {
    if (error.code === 'auth/email-already-exists') {
      return res.status(409).json({ error: 'Email already exists.' });
    }
    console.error('[create-member]', error.message);
    return res.status(500).json({ error: error.message || 'Failed to create team member.' });
  }
};
