export const ADMIN_PAGE_KEYS = [
  'dashboard',
  'projects',
  'enquiry',
  'followups',
  'payments',
  'outgoing_payments',
  'rgp',
  'salary',
  'tools',
  'team',
  'whatsapp',
  'settings',
];

export const MEMBER_PAGE_KEYS = [
  'dashboard',
  'projects',
  'tasks',
  'enquiry',
  'followups',
  'payments',
  'rgp',
  'salary',
  'notifications',
  'profile',
];

export function normalizeRole(role) {
  return role === 'admin' ? 'admin' : 'member';
}

export function normalizeStatus(status) {
  return status === 'inactive' ? 'inactive' : 'active';
}

export function getAllPageKeys(role) {
  return normalizeRole(role) === 'admin' ? [...ADMIN_PAGE_KEYS] : [...MEMBER_PAGE_KEYS];
}

export function sanitizePermissions(role, permissions, { fallbackToAll = true } = {}) {
  const allowedKeys = new Set(getAllPageKeys(role));

  if (!Array.isArray(permissions)) {
    return fallbackToAll ? [...allowedKeys] : [];
  }

  const uniquePermissions = Array.from(
    new Set(
      permissions
        .map((permission) => String(permission || '').trim())
        .filter((permission) => allowedKeys.has(permission)),
    ),
  );

  if (uniquePermissions.length > 0) {
    return uniquePermissions;
  }

  return fallbackToAll ? [...allowedKeys] : [];
}

export async function ensureMainAdminUid(db, fallbackUid = '') {
  const settingsRef = db.collection('settings').doc('access-control');
  const settingsSnap = await settingsRef.get();
  const configuredUid = settingsSnap.exists ? String(settingsSnap.data()?.mainAdminUid || '').trim() : '';

  if (configuredUid) {
    return configuredUid;
  }

  const normalizedFallback = String(fallbackUid || '').trim();
  if (!normalizedFallback) {
    return '';
  }

  await settingsRef.set({ mainAdminUid: normalizedFallback }, { merge: true });
  return normalizedFallback;
}
