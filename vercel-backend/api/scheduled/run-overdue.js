const { getFirebaseAdmin } = require('../../lib/firebaseAdmin');

function normalizeDate(value) {
  if (!value) return null;
  if (typeof value.toDate === 'function') return value.toDate();
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

function calculateOverdueDays(targetDate) {
  const d = normalizeDate(targetDate);
  if (!d) return 0;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const norm = new Date(d);
  norm.setHours(0, 0, 0, 0);
  const diff = Math.floor((today - norm) / (1000 * 60 * 60 * 24));
  return diff > 0 ? diff : 0;
}

function deriveTaskStatus(task) {
  if ((task.completionPercent || 0) >= 100 || task.status === 'completed') return 'completed';
  return calculateOverdueDays(task.targetDate) > 0 ? 'overdue' : 'open';
}

function deriveOpenStatus(record) {
  if (record.status === 'closed') return 'closed';
  return calculateOverdueDays(record.targetDate) > 0 ? 'overdue' : 'open';
}

/**
 * POST /api/scheduled/run-overdue
 * Recalculates overdue status for all tasks, enquiries, followups, payments.
 * Replaces the Firebase `overdueCalculator` scheduled function.
 * Protected by x-cron-secret header.
 */
module.exports = async (req, res) => {
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method Not Allowed' });

  const cronSecret = req.headers['x-cron-secret'];
  if (!cronSecret || cronSecret !== process.env.CRON_SECRET) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  const { db } = getFirebaseAdmin();
  const collections = [
    { name: 'tasks', kind: 'task' },
    { name: 'enquiries', kind: 'open-item' },
    { name: 'followups', kind: 'open-item' },
    { name: 'payments', kind: 'payment' },
    { name: 'outgoing_payments', kind: 'outgoing_payment' },
  ];

  const summary = {};

  for (const col of collections) {
    try {
      const snap = await db.collection(col.name).get();
      const batch = db.batch();
      let count = 0;

      for (const docSnap of snap.docs) {
        const data = docSnap.data();
        let overdue, newStatus;

        if (col.kind === 'task') {
          if (data.status === 'completed') continue;
          overdue = calculateOverdueDays(data.targetDate);
          newStatus = deriveTaskStatus(data);
          if (data.overdueDays !== overdue || data.status !== newStatus) {
            batch.update(docSnap.ref, { overdueDays: overdue, status: newStatus });
            count++;
          }
        } else if (col.kind === 'payment') {
          if (data.paymentStatus === 'received') continue;
          overdue = calculateOverdueDays(data.targetPaymentDate);
          if (data.overdueDays !== overdue) {
            batch.update(docSnap.ref, { overdueDays: overdue });
            count++;
          }
        } else if (col.kind === 'outgoing_payment') {
          if (data.paymentStatus === 'paid') continue;
          overdue = calculateOverdueDays(data.paymentDueDate);
          if (data.overdueDays !== overdue) {
            batch.update(docSnap.ref, { overdueDays: overdue });
            count++;
          }
        } else {
          if (data.status === 'closed') continue;
          overdue = calculateOverdueDays(data.targetDate);
          newStatus = deriveOpenStatus(data);
          if (data.overdueDays !== overdue || data.status !== newStatus) {
            batch.update(docSnap.ref, { overdueDays: overdue, status: newStatus });
            count++;
          }
        }
      }

      if (count > 0) await batch.commit();
      summary[col.name] = count;
      console.log(`[run-overdue] Updated ${count} docs in ${col.name}`);
    } catch (err) {
      console.error(`[run-overdue] Error in ${col.name}:`, err.message);
      summary[col.name] = `ERROR: ${err.message}`;
    }
  }

  return res.status(200).json({ success: true, summary });
};
