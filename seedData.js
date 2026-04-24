/**
 * Seed script for the Saya Industrial Firebase backend.
 *
 * Uses pure REST APIs – no browser or Playwright required:
 * - Firebase Identity Toolkit REST for auth-user creation
 * - Firestore REST API (with Firebase CLI access token) for document writes
 *
 * Usage:
 *   node seedData.js
 *
 * Prerequisites:
 *   1. `firebase login` (so the CLI has a valid token)
 *   2. Node 18+ (for global fetch)
 */

import { exec } from 'node:child_process';
import { promisify } from 'node:util';
import { firebaseConfig } from './lib/firebase.js';

const execAsync = promisify(exec);
const projectId = firebaseConfig.projectId;

/* ─── User fixtures ─────────────────────────────── */

const userFixtures = [
  {
    designation: 'Administrator',
    email: 'admin@test.com',
    name: 'Test Admin',
    password: 'Admin@123',
    phone: '+91 9876543210',
    role: 'admin',
    whatsapp: '+91 9876543210',
  },
  {
    designation: 'Engineer',
    email: 'john@test.com',
    name: 'John Doe',
    password: 'Member@123',
    phone: '+91 9876543211',
    role: 'member',
    whatsapp: '+91 9876543211',
  },
  {
    designation: 'Sales',
    email: 'sara@test.com',
    name: 'Sara Khan',
    password: 'Member@123',
    phone: '+91 9876543212',
    role: 'member',
    whatsapp: '+91 9876543212',
  },
  {
    designation: 'Accounts',
    email: 'raj@test.com',
    name: 'Raj Patel',
    password: 'Member@123',
    phone: '+91 9876543213',
    role: 'member',
    whatsapp: '+91 9876543213',
  },
];

/* ─── Helpers ───────────────────────────────────── */

function daysFromToday(days) {
  const d = new Date();
  d.setDate(d.getDate() + days);
  d.setHours(0, 0, 0, 0);
  return d.toISOString();
}

function toFirestoreValue(value) {
  if (value === null || value === undefined) return { nullValue: null };
  if (value instanceof Date) return { timestampValue: value.toISOString() };
  if (typeof value === 'string') {
    // Detect ISO date strings and convert to timestamp
    if (/^\d{4}-\d{2}-\d{2}T/.test(value)) return { timestampValue: value };
    return { stringValue: value };
  }
  if (typeof value === 'boolean') return { booleanValue: value };
  if (typeof value === 'number') {
    return Number.isInteger(value)
      ? { integerValue: String(value) }
      : { doubleValue: value };
  }
  if (Array.isArray(value)) {
    return { arrayValue: { values: value.map(toFirestoreValue) } };
  }
  if (typeof value === 'object') {
    return {
      mapValue: {
        fields: Object.fromEntries(
          Object.entries(value).map(([k, v]) => [k, toFirestoreValue(v)]),
        ),
      },
    };
  }
  throw new Error(`Unsupported Firestore REST value: ${String(value)}`);
}

function toFirestoreFields(obj) {
  return Object.fromEntries(
    Object.entries(obj).map(([key, value]) => [key, toFirestoreValue(value)]),
  );
}

/* ─── Firebase CLI session ──────────────────────── */

async function getAccessToken() {
  const command = process.platform === 'win32'
    ? 'npx.cmd firebase login:list --json'
    : 'npx firebase login:list --json';
  const { stdout } = await execAsync(command, { cwd: process.cwd(), maxBuffer: 1024 * 1024 });
  const parsed = JSON.parse(stdout);
  const account = parsed?.result?.[0];
  if (!account?.tokens?.access_token) {
    throw new Error('No Firebase CLI access token found. Run `firebase login` first.');
  }
  return account.tokens.access_token;
}

/* ─── Auth user creation ────────────────────────── */

async function createOrSignInUser(user) {
  const signupRes = await fetch(
    `https://identitytoolkit.googleapis.com/v1/accounts:signUp?key=${firebaseConfig.apiKey}`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: user.email, password: user.password, returnSecureToken: true }),
    },
  );
  const signupBody = await signupRes.json();

  if (signupRes.ok) return signupBody.localId;

  if (signupBody?.error?.message !== 'EMAIL_EXISTS') {
    throw new Error(`Failed to create ${user.email}: ${signupBody?.error?.message || signupRes.statusText}`);
  }

  // If user exists, sign in to get their UID
  const signInRes = await fetch(
    `https://identitytoolkit.googleapis.com/v1/accounts:signInWithPassword?key=${firebaseConfig.apiKey}`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: user.email, password: user.password, returnSecureToken: true }),
    },
  );
  const signInBody = await signInRes.json();

  if (!signInRes.ok) {
    throw new Error(`Failed to sign in ${user.email}: ${signInBody?.error?.message || signInRes.statusText}`);
  }

  return signInBody.localId;
}

async function seedAuthUsers() {
  const uidByEmail = {};
  for (const user of userFixtures) {
    uidByEmail[user.email] = await createOrSignInUser(user);
    console.log(`  ✓ ${user.email} → ${uidByEmail[user.email]}`);
  }
  return {
    adminUid: uidByEmail['admin@test.com'],
    johnUid: uidByEmail['john@test.com'],
    saraUid: uidByEmail['sara@test.com'],
    rajUid: uidByEmail['raj@test.com'],
  };
}

/* ─── Firestore REST writes ─────────────────────── */

const FIRESTORE_BASE = `https://firestore.googleapis.com/v1/projects/${projectId}/databases/(default)/documents`;

async function writeDoc(accessToken, collectionPath, docId, data) {
  const url = `${FIRESTORE_BASE}/${collectionPath}/${docId}`;
  const res = await fetch(url, {
    method: 'PATCH',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ fields: toFirestoreFields(data) }),
  });
  if (!res.ok) {
    const body = await res.text();
    throw new Error(`Failed to write ${collectionPath}/${docId}: ${res.status} ${body}`);
  }
}

async function deleteDoc(accessToken, collectionPath, docId) {
  const url = `${FIRESTORE_BASE}/${collectionPath}/${docId}`;
  const res = await fetch(url, {
    method: 'DELETE',
    headers: { Authorization: `Bearer ${accessToken}` },
  });
  // 404 is fine (doc doesn't exist)
  if (!res.ok && res.status !== 404) {
    const body = await res.text();
    console.warn(`  ⚠ Failed to delete ${collectionPath}/${docId}: ${res.status} ${body}`);
  }
}

/* ─── Seed Firestore data ───────────────────────── */

async function seedFirestore(accessToken, ids) {
  const { adminUid, johnUid, saraUid, rajUid } = ids;

  console.log('  Cleaning old seed data...');

  // Clean up old documents
  const oldCollections = [
    ['projects', ['office-renovation', 'it-infrastructure']],
    ['tasks', ['office-electrical-phase-1', 'office-interior-paint', 'office-plumbing-installation', 'it-server-room-setup', 'it-network-cabling']],
    ['expenses', ['office-expense-electrical', 'office-expense-paint', 'it-expense-rack', 'it-expense-cabling']],
    ['enquiries', ['enquiry-quotation-abc', 'enquiry-visit-xyz', 'enquiry-costing-pqr']],
    ['followups', ['followup-costing-abc', 'followup-visit-techcorp', 'followup-quotation-pqr']],
    ['payments', ['payment-abc-inv-001', 'payment-xyz-inv-002']],
    ['rgp', ['rgp-2026-001', 'challan-2026-001']],
  ];

  for (const [collName, docIds] of oldCollections) {
    for (const docId of docIds) {
      await deleteDoc(accessToken, collName, docId);
    }
  }

  // Clean old notifications
  const notifCleanup = [
    [johnUid, ['task-office-electrical', 'task-it-server-room']],
    [saraUid, ['task-office-paint', 'payment-xyz-alert']],
    [rajUid, ['task-office-plumbing', 'task-it-overdue', 'payment-abc-assigned']],
    [adminUid, ['admin-task-overdue', 'admin-rgp-created']],
  ];
  for (const [uid, notifIds] of notifCleanup) {
    for (const notifId of notifIds) {
      await deleteDoc(accessToken, `notifications/${uid}/items`, notifId);
    }
  }

  // Clean old salary
  const salaryCleanup = [
    [johnUid, ['2026-03', '2026-04']],
    [saraUid, ['2026-03']],
    [rajUid, ['2026-03']],
  ];
  for (const [uid, months] of salaryCleanup) {
    for (const month of months) {
      await deleteDoc(accessToken, `salary/${uid}/months`, month);
    }
  }

  console.log('  Writing user profiles...');

  // Users
  const users = [
    [adminUid, { createdAt: daysFromToday(-90), designation: 'Administrator', email: 'admin@test.com', name: 'Test Admin', phone: '+91 9876543210', role: 'admin', status: 'active', whatsapp: '+91 9876543210' }],
    [johnUid, { createdAt: daysFromToday(-60), designation: 'Engineer', email: 'john@test.com', name: 'John Doe', phone: '+91 9876543211', role: 'member', status: 'active', whatsapp: '+91 9876543211' }],
    [saraUid, { createdAt: daysFromToday(-45), designation: 'Sales', email: 'sara@test.com', name: 'Sara Khan', phone: '+91 9876543212', role: 'member', status: 'active', whatsapp: '+91 9876543212' }],
    [rajUid, { createdAt: daysFromToday(-30), designation: 'Accounts', email: 'raj@test.com', name: 'Raj Patel', phone: '+91 9876543213', role: 'member', status: 'active', whatsapp: '+91 9876543213' }],
  ];
  for (const [uid, data] of users) {
    await writeDoc(accessToken, 'users', uid, data);
  }

  console.log('  Writing projects...');

  // Projects
  await writeDoc(accessToken, 'projects', 'office-renovation', {
    client: 'Saya Buildcon',
    completionPercent: 37,
    createdAt: daysFromToday(-30),
    createdBy: adminUid,
    description: 'Complete office renovation including electrical, plumbing, and interior work.',
    name: 'Office Renovation',
    poValue: 500000,
    status: 'active',
    totalExpense: 125000,
  });

  await writeDoc(accessToken, 'projects', 'it-infrastructure', {
    client: 'TechCorp Solutions',
    completionPercent: 28,
    createdAt: daysFromToday(-20),
    createdBy: adminUid,
    description: 'Setting up IT infrastructure for the new office.',
    name: 'IT Infrastructure',
    poValue: 300000,
    status: 'active',
    totalExpense: 85000,
  });

  console.log('  Writing tasks...');

  // Tasks
  const tasks = [
    ['office-electrical-phase-1', { assignedTo: johnUid, assignedToName: 'John Doe', completionPercent: 60, createdAt: daysFromToday(-25), description: 'Complete electrical wiring for the first floor.', projectId: 'office-renovation', startDate: daysFromToday(-25), status: 'open', targetDate: daysFromToday(15), title: 'Electrical Wiring - Phase 1' }],
    ['office-interior-paint', { assignedTo: saraUid, assignedToName: 'Sara Khan', completionPercent: 30, createdAt: daysFromToday(-20), description: 'Paint all office rooms with approved materials.', projectId: 'office-renovation', startDate: daysFromToday(-20), status: 'open', targetDate: daysFromToday(25), title: 'Interior Paint Work' }],
    ['office-plumbing-installation', { assignedTo: rajUid, assignedToName: 'Raj Patel', completionPercent: 20, createdAt: daysFromToday(-15), description: 'Install bathroom and pantry plumbing fixtures.', projectId: 'office-renovation', startDate: daysFromToday(-15), status: 'open', targetDate: daysFromToday(10), title: 'Plumbing Installation' }],
    ['it-server-room-setup', { assignedTo: johnUid, assignedToName: 'John Doe', completionPercent: 40, createdAt: daysFromToday(-18), description: 'Prepare the server room, racks, UPS, and cooling.', projectId: 'it-infrastructure', startDate: daysFromToday(-18), status: 'open', targetDate: daysFromToday(20), title: 'Server Room Setup' }],
    ['it-network-cabling', { assignedTo: rajUid, assignedToName: 'Raj Patel', completionPercent: 15, createdAt: daysFromToday(-20), description: 'Complete CAT6 cabling for all floors.', overdueDays: 5, projectId: 'it-infrastructure', startDate: daysFromToday(-20), status: 'overdue', targetDate: daysFromToday(-5), title: 'Network Cabling' }],
  ];
  for (const [id, data] of tasks) {
    await writeDoc(accessToken, 'tasks', id, data);
  }

  console.log('  Writing expenses...');

  // Expenses
  const expenses = [
    ['office-expense-electrical', { activity: 'Electrical Wire Purchase', amount: 45000, assignedTo: johnUid, createdAt: daysFromToday(-20), projectId: 'office-renovation', taskId: 'office-electrical-phase-1' }],
    ['office-expense-paint', { activity: 'Paint Materials', amount: 80000, assignedTo: saraUid, createdAt: daysFromToday(-15), projectId: 'office-renovation', taskId: 'office-interior-paint' }],
    ['it-expense-rack', { activity: 'Server Rack Purchase', amount: 55000, assignedTo: johnUid, createdAt: daysFromToday(-12), projectId: 'it-infrastructure', taskId: 'it-server-room-setup' }],
    ['it-expense-cabling', { activity: 'Network Cables', amount: 30000, assignedTo: rajUid, createdAt: daysFromToday(-10), projectId: 'it-infrastructure', taskId: 'it-network-cabling' }],
  ];
  for (const [id, data] of expenses) {
    await writeDoc(accessToken, 'expenses', id, data);
  }

  console.log('  Writing enquiries...');

  // Enquiries
  const enquiries = [
    ['enquiry-quotation-abc', { assignedDate: daysFromToday(-5), assignedTo: saraUid, assignedToName: 'Sara Khan', client: 'ABC Enterprises', createdAt: daysFromToday(-5), nextFollowupDate: daysFromToday(3), overdueDays: 0, status: 'open', targetDate: daysFromToday(10), taskType: 'Quotation' }],
    ['enquiry-visit-xyz', { assignedDate: daysFromToday(-3), assignedTo: johnUid, assignedToName: 'John Doe', client: 'XYZ Corp', createdAt: daysFromToday(-3), nextFollowupDate: daysFromToday(2), overdueDays: 0, status: 'open', targetDate: daysFromToday(7), taskType: 'Visit' }],
    ['enquiry-costing-pqr', { assignedDate: daysFromToday(-7), assignedTo: rajUid, assignedToName: 'Raj Patel', client: 'PQR Industries', createdAt: daysFromToday(-7), nextFollowupDate: daysFromToday(5), overdueDays: 0, status: 'open', targetDate: daysFromToday(14), taskType: 'Costing' }],
  ];
  for (const [id, data] of enquiries) {
    await writeDoc(accessToken, 'enquiries', id, data);
  }

  console.log('  Writing follow-ups...');

  // Follow-ups
  const followups = [
    ['followup-costing-abc', { assignedDate: daysFromToday(-3), assignedTo: rajUid, assignedToName: 'Raj Patel', client: 'ABC Enterprises', createdAt: daysFromToday(-3), nextFollowupDate: daysFromToday(2), overdueDays: 0, status: 'open', targetDate: daysFromToday(5), taskType: 'Costing' }],
    ['followup-visit-techcorp', { assignedDate: daysFromToday(-2), assignedTo: johnUid, assignedToName: 'John Doe', client: 'TechCorp Solutions', createdAt: daysFromToday(-2), nextFollowupDate: daysFromToday(4), overdueDays: 0, status: 'open', targetDate: daysFromToday(8), taskType: 'Visit' }],
    ['followup-quotation-pqr', { assignedDate: daysFromToday(-4), assignedTo: saraUid, assignedToName: 'Sara Khan', client: 'PQR Industries', createdAt: daysFromToday(-4), nextFollowupDate: daysFromToday(6), overdueDays: 0, status: 'open', targetDate: daysFromToday(12), taskType: 'Quotation' }],
  ];
  for (const [id, data] of followups) {
    await writeDoc(accessToken, 'followups', id, data);
  }

  console.log('  Writing payments...');

  // Payments
  const payments = [
    ['payment-abc-inv-001', { amount: 250000, assignedTo: rajUid, assignedToName: 'Raj Patel', createdAt: daysFromToday(-15), customerName: 'ABC Enterprises', invoiceDate: daysFromToday(-15), invoiceNumber: 'INV-2026-001', nextFollowupDate: daysFromToday(3), overdueDays: 0, paymentStatus: 'pending', remarks: 'Customer asked for 15-day extension.', targetPaymentDate: daysFromToday(10) }],
    ['payment-xyz-inv-002', { amount: 180000, assignedTo: saraUid, assignedToName: 'Sara Khan', createdAt: daysFromToday(-30), customerName: 'XYZ Corp', invoiceDate: daysFromToday(-30), invoiceNumber: 'INV-2026-002', nextFollowupDate: daysFromToday(1), overdueDays: 5, paymentStatus: 'pending', remarks: 'Overdue - follow up urgently.', targetPaymentDate: daysFromToday(-5) }],
  ];
  for (const [id, data] of payments) {
    await writeDoc(accessToken, 'payments', id, data);
  }

  console.log('  Writing RGP/Challan...');

  // RGP / Challan
  const rgpEntries = [
    ['rgp-2026-001', { assignedTo: johnUid, assignedToName: 'John Doe', createdAt: daysFromToday(-10), date: daysFromToday(-10), docNumber: 'RGP-2026-001', fromCompany: 'Saya Industrial', status: 'open', toCompany: 'ABC Enterprises', type: 'RGP' }],
    ['challan-2026-001', { assignedTo: rajUid, assignedToName: 'Raj Patel', createdAt: daysFromToday(-7), date: daysFromToday(-7), docNumber: 'CH-2026-001', fromCompany: 'Saya Industrial', status: 'open', toCompany: 'PQR Industries', type: 'Challan' }],
  ];
  for (const [id, data] of rgpEntries) {
    await writeDoc(accessToken, 'rgp', id, data);
  }

  console.log('  Writing notifications...');

  // Notifications (subcollection: notifications/{userId}/items/{notifId})
  const notifications = [
    [johnUid, 'task-office-electrical', { createdAt: daysFromToday(-25), message: 'New task assigned: Electrical Wiring - Phase 1', read: false, relatedId: 'office-electrical-phase-1', type: 'task' }],
    [johnUid, 'task-it-server-room', { createdAt: daysFromToday(-18), message: 'New task assigned: Server Room Setup', read: false, relatedId: 'it-server-room-setup', type: 'task' }],
    [saraUid, 'task-office-paint', { createdAt: daysFromToday(-20), message: 'New task assigned: Interior Paint Work', read: false, relatedId: 'office-interior-paint', type: 'task' }],
    [saraUid, 'payment-xyz-alert', { createdAt: daysFromToday(-5), message: 'Payment follow-up required: INV-2026-002 is overdue.', read: false, relatedId: 'payment-xyz-inv-002', type: 'payment' }],
    [rajUid, 'task-office-plumbing', { createdAt: daysFromToday(-15), message: 'New task assigned: Plumbing Installation', read: true, relatedId: 'office-plumbing-installation', type: 'task' }],
    [rajUid, 'task-it-overdue', { createdAt: daysFromToday(-5), message: 'Task overdue: Network Cabling is 5 days past due.', read: false, relatedId: 'it-network-cabling', type: 'task' }],
    [rajUid, 'payment-abc-assigned', { createdAt: daysFromToday(-15), message: 'New payment assigned: INV-2026-001', read: false, relatedId: 'payment-abc-inv-001', type: 'payment' }],
    [adminUid, 'admin-task-overdue', { createdAt: daysFromToday(-5), message: 'Task "Network Cabling" is now overdue by 5 days.', read: false, relatedId: 'it-network-cabling', type: 'task' }],
    [adminUid, 'admin-rgp-created', { createdAt: daysFromToday(-7), message: 'New RGP assigned: RGP-2026-001', read: false, relatedId: 'rgp-2026-001', type: 'rgp' }],
  ];
  for (const [uid, notifId, data] of notifications) {
    await writeDoc(accessToken, `notifications/${uid}/items`, notifId, data);
  }

  console.log('  Writing salary records...');

  // Salary (subcollection: salary/{userId}/months/{monthYear})
  const salaries = [
    [johnUid, '2026-03', { allowances: 5000, basicSalary: 35000, createdAt: daysFromToday(-10), deductions: 2000, netSalary: 38000, paidDate: daysFromToday(-5), status: 'paid' }],
    [johnUid, '2026-04', { allowances: 5000, basicSalary: 35000, createdAt: daysFromToday(-2), deductions: 2000, netSalary: 38000, paidDate: null, status: 'pending' }],
    [saraUid, '2026-03', { allowances: 4000, basicSalary: 30000, createdAt: daysFromToday(-10), deductions: 1500, netSalary: 32500, paidDate: daysFromToday(-5), status: 'paid' }],
    [rajUid, '2026-03', { allowances: 3000, basicSalary: 28000, createdAt: daysFromToday(-10), deductions: 1000, netSalary: 30000, paidDate: daysFromToday(-5), status: 'paid' }],
  ];
  for (const [uid, monthYear, data] of salaries) {
    await writeDoc(accessToken, `salary/${uid}/months`, monthYear, data);
  }
}

/* ─── Main ──────────────────────────────────────── */

async function main() {
  console.log(`\n🔧 Seeding project: ${projectId}\n`);

  console.log('1. Getting Firebase CLI access token...');
  const accessToken = await getAccessToken();
  console.log('   ✓ Token acquired\n');

  console.log('2. Creating/verifying auth users...');
  const identities = await seedAuthUsers();
  console.log('   ✓ All users ready\n');

  console.log('3. Writing Firestore seed data via REST API...');
  await seedFirestore(accessToken, identities);
  console.log('   ✓ All data seeded\n');

  console.log('═══════════════════════════════════════');
  console.log('  ✅ Seed complete!');
  console.log('═══════════════════════════════════════');
  console.log('');
  console.log('  Test Accounts:');
  console.log('  ─────────────');
  console.log('  Admin:  admin@test.com / Admin@123');
  console.log('  John:   john@test.com  / Member@123');
  console.log('  Sara:   sara@test.com  / Member@123');
  console.log('  Raj:    raj@test.com   / Member@123');
  console.log('');
}

main().catch((error) => {
  console.error('\n❌ Seed failed:', error.message);
  process.exit(1);
});
