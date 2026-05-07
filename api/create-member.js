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

    const {
      name, email, password,
      phone, whatsapp, designation,
      role, permissions, status
    } = req.body;

    if (!name?.trim()) return res.status(400).json({ error: 'Name required' });
    if (!email?.trim()) return res.status(400).json({ error: 'Email required' });
    if (!password || password.length < 6) return res.status(400).json({ error: 'Password min 6 characters' });

    let newUser;
    try {
      newUser = await auth.createUser({
        email: email.trim().toLowerCase(),
        password: password,
        displayName: name.trim()
      });
    } catch (authErr) {
      if (authErr.code === 'auth/email-already-exists') {
        return res.status(400).json({ error: 'Email already registered' });
      }
      return res.status(400).json({ error: authErr.message });
    }

    const adminPerms = [
      'dashboard','projects','enquiry',
      'followups','payments',
      'outgoing_payments','rgp','salary',
      'tools','team','settings','whatsapp'
    ];
    const memberPerms = [
      'dashboard','tasks','enquiry',
      'followups','payments','rgp','profile'
    ];

    try {
      await db.doc(`users/${newUser.uid}`).set({
        uid: newUser.uid,
        name: name.trim(),
        email: email.trim().toLowerCase(),
        phone: phone?.trim() || '',
        whatsapp: whatsapp?.trim() || '',
        designation: designation?.trim() || '',
        role: role || 'member',
        permissions: permissions?.length
          ? permissions
          : role === 'admin'
          ? adminPerms
          : memberPerms,
        status: status || 'active',
        fcmToken: null,
        createdAt: new Date(),
        updatedAt: new Date(),
        createdBy: decoded.uid
      });
    } catch (fsErr) {
      // Rollback Auth user
      await auth.deleteUser(newUser.uid).catch(() => {});
      throw new Error('Firestore save failed: ' + fsErr.message);
    }

    // Send welcome WhatsApp silently
    if (whatsapp?.trim()) {
      try {
        // Updated path to consolidated whatsapp logic if needed, 
        // or just use a helper from server/
        const { sendViaMsg91 } = await import('../server/whatsapp/msg91.js');
        await sendViaMsg91(whatsapp.trim(), `Welcome ${name}! Your account is ready. Email: ${email}. Ask admin for password.`);
      } catch (e) {
        console.error('WhatsApp:', e.message);
      }
    }

    return res.status(200).json({
      success: true,
      uid: newUser.uid,
      message: `${name} created successfully`
    });

  } catch (error) {
    console.error('Create member error:', error.message);
    return res.status(500).json({ error: error.message });
  }
}
