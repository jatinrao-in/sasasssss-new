export const ADMIN_PAGE_OPTIONS = [
  {
    key: 'dashboard',
    label: 'Dashboard',
    description: 'Admin panel overview',
    path: '/dashboard',
  },
  {
    key: 'projects',
    label: 'Projects',
    description: 'Project management workspace',
    path: '/projects',
  },
  {
    key: 'enquiry',
    label: 'Enquiry',
    description: 'Lead and enquiry tracking',
    path: '/enquiry',
  },
  {
    key: 'followups',
    label: 'Follow-Ups',
    description: 'Follow-up management',
    path: '/followups',
  },
  {
    key: 'payments',
    label: 'Payments',
    description: 'Incoming payment tracking',
    path: '/payments',
  },
  {
    key: 'outgoing_payments',
    label: 'Outgoing Payments',
    description: 'Vendor and expense payouts',
    path: '/outgoing-payments',
  },
  {
    key: 'rgp',
    label: 'RGP / Challan',
    description: 'RGP and challan records',
    path: '/rgp',
  },
  {
    key: 'salary',
    label: 'Salary',
    description: 'Salary management',
    path: '/salary',
  },
  {
    key: 'tools',
    label: 'Tools',
    description: 'Tool assignment and inventory',
    path: '/tools',
  },
  {
    key: 'team',
    label: 'Team',
    description: 'Team member access management',
    path: '/team',
  },
  {
    key: 'settings',
    label: 'Settings',
    description: 'Application settings',
    path: '/settings',
  },
  {
    key: 'whatsapp',
    label: 'WhatsApp Automation',
    description: 'WhatsApp automation controls',
    path: '/whatsapp',
  },
];

export const MEMBER_PAGE_OPTIONS = [
  {
    key: 'dashboard',
    label: 'Dashboard',
    navLabel: 'Home',
    description: 'PWA home and summary',
    path: '/dashboard',
  },
  {
    key: 'tasks',
    label: 'My Tasks',
    navLabel: 'My Tasks',
    description: 'Assigned task list',
    path: '/tasks',
  },
  {
    key: 'enquiry',
    label: 'Enquiries',
    navLabel: 'Enquiries',
    description: 'Assigned enquiries',
    path: '/enquiries',
  },
  {
    key: 'followups',
    label: 'Follow-Ups',
    navLabel: 'Follow-Ups',
    description: 'Assigned follow-ups',
    path: '/follow-ups',
  },
  {
    key: 'payments',
    label: 'Payments',
    navLabel: 'Payments',
    description: 'Assigned payment updates',
    path: '/payments',
  },
  {
    key: 'rgp',
    label: 'RGP',
    navLabel: 'RGP',
    description: 'Assigned RGP records',
    path: '/rgp',
  },
  {
    key: 'profile',
    label: 'Profile',
    navLabel: 'Profile',
    description: 'Member profile and salary view',
    path: '/profile',
  },
];

export const USER_ROLE_OPTIONS = [
  {
    value: 'member',
    label: 'Team Member',
    description: 'PWA access only',
  },
  {
    value: 'admin',
    label: 'Admin',
    description: 'Admin panel access',
  },
];

export const USER_STATUS_OPTIONS = [
  { value: 'active', label: 'Active' },
  { value: 'inactive', label: 'Inactive' },
];

export const ADMIN_PERMISSION_KEYS = ADMIN_PAGE_OPTIONS.map((page) => page.key);
export const MEMBER_PERMISSION_KEYS = MEMBER_PAGE_OPTIONS.map((page) => page.key);

const MEMBER_PERMISSION_ALIASES = {
  projects: 'tasks',
};

export function normalizeRole(role) {
  return role === 'admin' ? 'admin' : 'member';
}

export function normalizeStatus(status) {
  return status === 'inactive' ? 'inactive' : 'active';
}

export function getPageOptions(role) {
  return normalizeRole(role) === 'admin' ? ADMIN_PAGE_OPTIONS : MEMBER_PAGE_OPTIONS;
}

export function getAllPageKeys(role) {
  return getPageOptions(role).map((page) => page.key);
}

function mapPermissionAlias(role, key) {
  if (normalizeRole(role) !== 'member') {
    return key;
  }

  return MEMBER_PERMISSION_ALIASES[key] || key;
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

export function resolveUserPermissions(userLike, mainAdminUid) {
  const normalizedRole = normalizeRole(userLike?.role);
  const isMainAdmin = normalizedRole === 'admin'
    && Boolean(userLike?.uid)
    && Boolean(mainAdminUid)
    && userLike.uid === mainAdminUid;

  return {
    isMainAdmin,
    permissions: isMainAdmin
      ? getAllPageKeys('admin')
      : sanitizePermissions(normalizedRole, userLike?.permissions),
    role: normalizedRole,
    status: isMainAdmin ? 'active' : normalizeStatus(userLike?.status),
  };
}

export function getAccessiblePages(userLike, role = userLike?.role) {
  const normalizedRole = normalizeRole(role);
  const allowedKeys = new Set(
    userLike?.isMainAdmin
      ? getAllPageKeys('admin')
      : Array.isArray(userLike?.permissions)
        ? userLike.permissions
        : sanitizePermissions(normalizedRole, userLike?.permissions),
  );

  return getPageOptions(normalizedRole).filter((page) => allowedKeys.has(page.key));
}

export function getFirstAccessiblePath(userLike, role = userLike?.role) {
  const accessiblePath = getAccessiblePages(userLike, role)[0]?.path || null;

  if (accessiblePath) {
    return accessiblePath;
  }

  if (!userLike) {
    return getPageOptions(role)[0]?.path || '/';
  }

  return null;
}

export function canAccessPage(userLike, pageKey, role) {
  if (!userLike) {
    return false;
  }

  const normalizedRole = normalizeRole(role);

  if (normalizeRole(userLike.role) !== normalizedRole) {
    return false;
  }

  if (normalizedRole === 'admin' && userLike.isMainAdmin) {
    return true;
  }

  return Array.isArray(userLike.permissions) && userLike.permissions.includes(pageKey);
}

export function getPageByKey(role, pageKey) {
  return getPageOptions(role).find((page) => page.key === pageKey) || null;
}
