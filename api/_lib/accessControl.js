const ADMIN_PAGE_KEYS = [
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
  'settings',
  'whatsapp',
];

const MEMBER_PAGE_KEYS = [
  'dashboard',
  'tasks',
  'enquiry',
  'followups',
  'payments',
  'rgp',
  'profile',
];

const MEMBER_PERMISSION_ALIASES = {
  projects: 'tasks',
};

const createdAtToMillis = (value) => {
  if (!value) {
    return 0;
  }

  if (typeof value.toMillis === 'function') {
    return value.toMillis();
  }

  if (typeof value.toDate === 'function') {
    return value.toDate().getTime();
  }

  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? 0 : parsed.getTime();
};

export function normalizeRole(role) {
  return role === 'admin' ? 'admin' : 'member';
}

export function normalizeStatus(status) {
  return status === 'inactive' ? 'inactive' : 'active';
}

export function getAllPageKeys(role) {
  return normalizeRole(role) === 'admin' ? [...ADMIN_PAGE_KEYS] : [...MEMBER_PAGE_KEYS];
}

function mapPermissionAlias(role, permission) {
  if (normalizeRole(role) !== 'member') {
    return permission;
  }

  return MEMBER_PERMISSION_ALIASES[permission] || permission;
}

export function sanitizePermissions(role, permissions, options = {}) {
  const normalizedRole = normalizeRole(role);
  const { fallbackToAll = permissions === undefined } = options;

  if (!Array.isArray(permissions)) {
    return fallbackToAll ? getAllPageKeys(normalizedRole) : [];
  }

  const allowedKeys = new Set(getAllPageKeys(normalizedRole));

  return [...new Set(
    permissions
      .map((permission) => mapPermissionAlias(normalizedRole, permission))
      .filter((permission) => allowedKeys.has(permission)),
  )];
}

export async function getMainAdminUid(db) {
  const settingsSnapshot = await db.collection('settings').doc('app').get();
  const configuredMainAdminUid = settingsSnapshot.data()?.mainAdminUid || null;

  if (configuredMainAdminUid) {
    return configuredMainAdminUid;
  }

  const usersSnapshot = await db.collection('users').get();
  const admins = usersSnapshot.docs
    .map((userDoc) => ({ id: userDoc.id, ...userDoc.data() }))
    .filter((profile) => normalizeRole(profile.role) === 'admin')
    .sort((firstAdmin, secondAdmin) => createdAtToMillis(firstAdmin.createdAt) - createdAtToMillis(secondAdmin.createdAt));

  return admins[0]?.id || null;
}

export async function ensureMainAdminUid(db, fallbackUid) {
  const resolvedMainAdminUid = (await getMainAdminUid(db)) || fallbackUid || null;

  if (resolvedMainAdminUid) {
    await db.collection('settings').doc('app').set(
      { mainAdminUid: resolvedMainAdminUid },
      { merge: true },
    );
  }

  return resolvedMainAdminUid;
}
