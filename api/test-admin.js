import { getAdminApp } from
  './lib/firebaseAdmin.js';

export default async function handler(
  req, res
) {
  try {
    const { auth, db } = getAdminApp();
    const users = await auth.listUsers(1);
    return res.status(200).json({
      success: true,
      message: 'Firebase Admin working',
      userCount: users.users.length
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      error: error.message
    });
  }
}
