import { FieldValue, Timestamp } from 'firebase-admin/firestore';

const WHATSAPP_BALANCE_PATH = 'settings/whatsapp_balance';

function getBalanceRef(db) {
  return db.doc(WHATSAPP_BALANCE_PATH);
}

export async function getWhatsAppBalance(db) {
  const balanceSnap = await getBalanceRef(db).get();
  return Number(balanceSnap.data()?.balance || 0);
}

export async function assertWhatsAppBalance(db, requiredMessages = 1) {
  const requiredCount = Math.max(1, Number(requiredMessages) || 1);
  const balance = await getWhatsAppBalance(db);

  if (balance <= 0) {
    const error = new Error('Insufficient WhatsApp balance');
    error.statusCode = 402;
    error.balance = 0;
    throw error;
  }

  if (balance < requiredCount) {
    const error = new Error(
      `Balance Rs.${balance} is not enough for ${requiredCount} message${requiredCount === 1 ? '' : 's'}`,
    );
    error.statusCode = 402;
    error.balance = balance;
    throw error;
  }

  return balance;
}

export async function recordSuccessfulWhatsAppSend(db, {
  actor = 'System',
  balanceBefore = null,
  messageType = 'custom',
  note = 'Automatic Rs.1 deduction after successful MSG91 send',
  phone = '',
  recipientName = '',
  source = 'system',
} = {}) {
  const balanceRef = getBalanceRef(db);
  const safeBalanceBefore = Number.isFinite(balanceBefore) ? balanceBefore : null;

  await balanceRef.set({
    balance: FieldValue.increment(-1),
    totalSpent: FieldValue.increment(1),
    totalMessages: FieldValue.increment(1),
    lastUpdated: Timestamp.now(),
    lastUpdatedBy: actor,
  }, { merge: true });

  await balanceRef.collection('history').add({
    type: 'deduction',
    delta: -1,
    previousBalance: safeBalanceBefore,
    newBalance: safeBalanceBefore === null ? null : safeBalanceBefore - 1,
    messageType,
    note,
    phone,
    recipientName,
    source,
    createdAt: Timestamp.now(),
    createdBy: actor,
  });
}
