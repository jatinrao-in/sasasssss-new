import { getAdminApp } from '../api/lib/firebaseAdmin.js';

export function getAdminServices() {
  const { db, auth } = getAdminApp();
  return { db, auth };
}
