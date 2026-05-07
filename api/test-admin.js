import { getAdminApp } from './lib/firebaseAdmin.js';

export default async function handler(req, res) {
  try {
    const { auth, db } = getAdminApp();
    // Test auth
    const users = await auth.listUsers(1);
    // Test db
    const settings = await db.collection('settings').doc('company').get();
    
    return res.status(200).json({
      success: true,
      message: 'Firebase Admin working',
      userCountFound: users.users.length,
      dbConnected: settings.exists || !settings.exists // just to check if call succeeds
    });
  } catch (error) {
    console.error('Test Admin failed:', error.message);
    return res.status(500).json({
      success: false,
      error: error.message
    });
  }
}
