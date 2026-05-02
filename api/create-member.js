import { initializeApp, getApps, cert } from 'firebase-admin/app';
import { getAuth } from 'firebase-admin/auth';
import { getFirestore } from 'firebase-admin/firestore';

// Initialize Firebase Admin
let adminApp;
const getAdminApp = () => {
  if (getApps().length > 0) {
    return getApps()[0];
  }
  return initializeApp({
    credential: cert({
      projectId: process.env.FIREBASE_PROJECT_ID,
      clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
      privateKey: process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n')
    })
  });
};

export default async function handler(req, res) {
  // CORS headers first
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({
      error: 'Method not allowed'
    });
  }

  // Verify Firebase Auth token
  const authHeader = req.headers.authorization;
  
  if (!authHeader?.startsWith('Bearer ')) {
    return res.status(403).json({
      error: 'No authorization token'
    });
  }

  const token = authHeader.split(' ')[1];
  
  try {
    const adminInstance = getAdminApp();
    const auth = getAuth(adminInstance);
    const db = getFirestore(adminInstance);

    // Verify token
    let decodedToken;
    try {
      decodedToken = await auth.verifyIdToken(token);
    } catch (tokenError) {
      console.error('Token error:', tokenError.message);
      return res.status(403).json({
        error: 'Invalid or expired token. Please logout and login again.'
      });
    }

    // Check caller is admin
    const callerDoc = await db.doc(`users/${decodedToken.uid}`).get();
    
    if (!callerDoc.exists || callerDoc.data()?.role !== 'admin') {
      return res.status(403).json({
        error: 'Only admins can create members'
      });
    }

    // Get new member data
    const {
      name, email, password,
      phone, whatsapp, designation,
      role, permissions, status
    } = req.body;

    // Validate required fields
    if (!name || !email || !password) {
      return res.status(400).json({
        error: 'name, email, password required'
      });
    }

    if (password.length < 6) {
      return res.status(400).json({
        error: 'Password must be 6+ characters'
      });
    }

    // Create Firebase Auth user
    let newUser;
    try {
      newUser = await auth.createUser({
        email: email.trim(),
        password: password,
        displayName: name.trim()
      });
    } catch (authError) {
      if (authError.code === 'auth/email-already-exists') {
        return res.status(400).json({
          error: 'Email already exists'
        });
      }
      throw authError;
    }

    // Default permissions based on role
    const defaultPermissions = role === 'admin' 
      ? ['dashboard', 'projects', 'enquiry', 'followups', 'payments', 'outgoing_payments', 'rgp', 'salary', 'tools', 'team', 'settings', 'whatsapp']
      : ['dashboard', 'tasks', 'enquiry', 'followups', 'payments', 'rgp', 'profile'];

    // Save to Firestore
    await db.doc(`users/${newUser.uid}`).set({
      name: name.trim(),
      email: email.trim().toLowerCase(),
      phone: phone || '',
      whatsapp: whatsapp || '',
      designation: designation || '',
      role: role || 'member',
      permissions: permissions || defaultPermissions,
      status: status || 'active',
      fcmToken: null,
      createdAt: new Date(),
      updatedAt: new Date(),
      createdBy: decodedToken.uid
    });

    // Send welcome WhatsApp if number exists
    if (whatsapp) {
      try {
        const { sendWelcomeMessage } = await import('../lib/msg91.js');
        await sendWelcomeMessage(
          whatsapp,
          name,
          email,
          password,
          'https://sasasssss.vercel.app'
        );
      } catch (msgError) {
        console.error('Welcome WhatsApp error:', msgError.message);
        // Don't fail member creation if WhatsApp fails
      }
    }

    return res.status(200).json({
      success: true,
      uid: newUser.uid,
      message: `Member ${name} created successfully`
    });

  } catch (error) {
    console.error('Create member error:', error);
    return res.status(500).json({
      error: error.message
    });
  }
}
