import { initializeApp, cert, getApps } from 'firebase-admin/app';
import { getAuth } from 'firebase-admin/auth';
import { getFirestore, Timestamp } from 'firebase-admin/firestore';

// Initialize Firebase Admin
if (getApps().length === 0) {
  initializeApp({
    credential: cert({
      projectId: process.env.FIREBASE_PROJECT_ID,
      clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
      privateKey: process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n')
    })
  });
}

const ALLOWED_ORIGINS = [
  'http://localhost:5173',
  'http://localhost:5174',
  'http://localhost:3000',
  'https://saya-backend.vercel.app',
];

export default async function handler(req, res) {
  // CORS
  const origin = req.headers.origin;
  const allowedOrigin = ALLOWED_ORIGINS.includes(origin) ? origin : '*';
  res.setHeader('Access-Control-Allow-Origin', allowedOrigin);
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  // Auth check
  const authHeader = req.headers.authorization || '';
  const token = authHeader.replace('Bearer ', '').trim();
  const expectedSecret = process.env.BACKEND_API_SECRET || '';

  if (!expectedSecret || token !== expectedSecret) {
    console.error('Unauthorized create-member attempt. Token received:', token ? token.substring(0, 8) + '...' : 'NONE');
    return res.status(401).json({ error: 'Unauthorized' });
  }

  const { name, email, password, phone, whatsapp, designation, permissions } = req.body || {};

  if (!name || !email || !password) {
    return res.status(400).json({ error: 'name, email, and password are required' });
  }

  try {
    const auth = getAuth();
    const db = getFirestore();

    // 1. Create Firebase Auth user
    const userRecord = await auth.createUser({
      email,
      password,
      displayName: name,
    });

    console.log('Firebase Auth user created:', userRecord.uid);

    // 2. Create Firestore profile
    await db.collection('users').doc(userRecord.uid).set({
      name,
      email,
      phone: phone || '',
      whatsapp: whatsapp || '',
      designation: designation || '',
      role: 'member',
      status: 'active',
      permissions: permissions || ['dashboard', 'projects', 'enquiry', 'followups', 'payments'],
      createdAt: Timestamp.now(),
    });

    console.log('Firestore profile created for:', userRecord.uid);

    return res.status(200).json({
      success: true,
      uid: userRecord.uid,
      message: `Member ${name} created successfully`
    });

  } catch (error) {
    console.error('create-member error:', error.message);

    // Translate Firebase error codes to readable messages
    const msg = error.code === 'auth/email-already-exists'
      ? 'This email is already registered'
      : error.message;

    return res.status(500).json({ error: msg });
  }
}
