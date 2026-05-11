import { getAdminApp } from '../lib/firebaseAdmin.js';
import {
  sendTemplate,
  sendTaskOverdue,
  sendPaymentReminder,
  sendRgpReminder,
  sendToolReturn
} from '../../server/whatsapp/msg91.js';

export default async function handler(
  req, res
) {
  res.setHeader(
    'Access-Control-Allow-Origin', '*');

  // Verify cron secret
  const authHeader =
    req.headers.authorization;
  const secret = authHeader?.replace(
    'Bearer ', '');

  if (secret !== process.env.CRON_SECRET) {
    console.error('Invalid cron secret');
    return res.status(401).json({
      error: 'Unauthorized'
    });
  }

  const slot = req.query.slot || 'morning';
  (function(){})('Cron running slot:', slot);

  let adminApp;
  try {
    adminApp = getAdminApp();
  } catch (e) {
    console.error('Admin init failed:', e.message);
    return res.status(500).json({
      error: 'Firebase init failed: ' + 
        e.message
    });
  }

  const { db } = adminApp;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const tomorrow = new Date(today);
  tomorrow.setDate(tomorrow.getDate() + 1);

  const results = [];

  try {
    // GET ALL ACTIVE MEMBERS
    const usersSnap = await db
      .collection('users')
      .where('status', '==', 'active')
      .get();

    const allUsers = usersSnap.docs.map(d => ({
      uid: d.id,
      ...d.data()
    }));

    const members = allUsers.filter(
      u => u.role === 'member'
    );

    (function(){})('Total users:', allUsers.length);
    (function(){})('Members:', members.length);

    // ═══════════════════════════
    // MORNING AND EVENING SLOTS
    // daily_full_summary template
    // Send to ALL users (members + admins)
    // ═══════════════════════════
    if (slot === 'morning' || slot === 'evening') {
      for (const user of allUsers) {
        if (!user.whatsapp) continue;
        if (user.status !== 'active') continue;

        try {
          const uid = user.uid;
          let pendingTasks = 0, overdueTasks = 0, followups = 0, enquiries = 0, payments = 0, rgp = 0;

          if (user.role === 'admin') {
            // ADMIN logic: Fetch ALL data across all users
            const tasksSnap = await db.collection('tasks').get();
            const tasks = tasksSnap.docs.map(d => d.data());
            pendingTasks = tasks.filter(t => t.status !== 'completed').length;
            overdueTasks = tasks.filter(t => {
              const target = t.targetDate?.toDate?.() || new Date(t.targetDate);
              return t.status !== 'completed' && target < today;
            }).length;

            const followupsSnap = await db.collection('followups').where('status', '==', 'open').get();
            followups = followupsSnap.size;

            const enquiriesSnap = await db.collection('enquiries').where('status', '==', 'open').get();
            enquiries = enquiriesSnap.size;

            const paymentsSnap = await db.collection('payments').where('paymentStatus', '!=', 'received').get();
            payments = paymentsSnap.size;

            const rgpSnap = await db.collection('rgp').where('status', '==', 'open').get();
            rgp = rgpSnap.size;

          } else {
            // MEMBER logic: Fetch assigned data only
            const tasksSnap = await db.collection('tasks').where('assignedTo', '==', uid).get();
            const tasks = tasksSnap.docs.map(d => d.data());
            pendingTasks = tasks.filter(t => t.status !== 'completed').length;
            overdueTasks = tasks.filter(t => {
              const target = t.targetDate?.toDate?.() || new Date(t.targetDate);
              return t.status !== 'completed' && target < today;
            }).length;

            const followupsSnap = await db.collection('followups').where('assignedTo', '==', uid).where('status', '==', 'open').get();
            followups = followupsSnap.size;

            const enquiriesSnap = await db.collection('enquiries').where('assignedTo', '==', uid).where('status', '==', 'open').get();
            enquiries = enquiriesSnap.size;

            const paymentsSnap = await db.collection('payments').where('assignedTo', '==', uid).where('paymentStatus', '!=', 'received').get();
            payments = paymentsSnap.size;

            const rgpSnap = await db.collection('rgp').where('assignedTo', '==', uid).where('status', '==', 'open').get();
            rgp = rgpSnap.size;
          }

          // Format values (Show 0 if no data, not null)
          const result = await sendTemplate(
            user.whatsapp,
            'daily_full_summary',
            [
              String(user.name),
              String(pendingTasks),
              String(overdueTasks),
              String(followups),
              String(enquiries),
              String(payments),
              String(rgp)
            ]
          );

          await db.collection('whatsapp_logs')
            .add({
              to: user.whatsapp,
              memberName: user.name,
              memberUid: uid,
              messageType: slot,
              template: 'daily_full_summary',
              variables: {
                pendingTasks,
                overdueTasks,
                followups,
                enquiries,
                payments,
                rgp
              },
              status: result.sent ? 'sent' : 'failed',
              msg91Response: result.result || {},
              sentAt: new Date()
            });

          results.push({
            name: user.name,
            status: result.sent ? 'sent' : 'failed',
            data: {
              pendingTasks,
              overdueTasks,
              followups,
              enquiries,
              payments,
              rgp
            }
          });

          await new Promise(r => setTimeout(r, 500));

        } catch (userErr) {
          console.error(`Error for ${user.name}:`, userErr.message);
          results.push({
            name: user.name,
            status: 'error',
            error: userErr.message
          });
        }
      }
    }

    // ═══════════════════════════
    // OVERDUE SLOT
    // task_overdue template
    // ═══════════════════════════
    if (slot === 'overdue') {
      const tasksSnap = await db
        .collection('tasks')
        .where('status', '!=', 'completed')
        .get();

      for (const taskDoc of tasksSnap.docs) {
        const task = taskDoc.data();
        const target =
          task.targetDate?.toDate?.() ||
          new Date(task.targetDate);

        if (target >= today) continue;

        const overdueDays = Math.floor(
          (today - target) /
          (1000 * 60 * 60 * 24)
        );

        const userDoc = await db
          .doc(`users/${task.assignedTo}`)
          .get();
        const user = userDoc.data();

        if (!user?.whatsapp) continue;

        const projectDoc = await db
          .doc(`projects/${task.projectId}`)
          .get();
        const projectName =
          projectDoc.data()?.name || 'Project';

        try {
          const result = await sendTaskOverdue(
            user.whatsapp,
            user.name,
            task.title,
            projectName,
            String(overdueDays)
          );

          await db.collection('whatsapp_logs')
            .add({
              to: user.whatsapp,
              memberName: user.name,
              template: 'task_overdue',
              status: result.success
                ? 'sent' : 'failed',
              sentAt: new Date()
            });

          results.push({
            name: user.name,
            task: task.title,
            overdueDays,
            status: result.success
              ? 'sent' : 'failed'
          });

          await new Promise(r =>
            setTimeout(r, 500));

        } catch (e) {
          console.error('Overdue error:', 
            e.message);
        }
      }
    }

    // ═══════════════════════════
    // PAYMENT SLOT
    // payment_reminder template
    // ═══════════════════════════
    if (slot === 'payment') {
      const paymentsSnap = await db
        .collection('payments')
        .where('paymentStatus', '!=', 'received')
        .get();

      for (const payDoc of paymentsSnap.docs) {
        const payment = payDoc.data();
        const dueDate =
          payment.targetPaymentDate?.toDate?.();

        if (!dueDate) continue;
        if (dueDate > tomorrow) continue;

        const userDoc = await db
          .doc(`users/${payment.assignedTo}`)
          .get();
        const user = userDoc.data();

        if (!user?.whatsapp) continue;

        try {
          const result = await sendPaymentReminder(
            user.whatsapp,
            user.name,
            payment.customerName || 'Client',
            payment.invoiceNumber || 'N/A',
            String(payment.netPending ||
              payment.amount || 0)
          );

          results.push({
            name: user.name,
            customer: payment.customerName,
            status: result.success
              ? 'sent' : 'failed'
          });

          await new Promise(r =>
            setTimeout(r, 500));

        } catch (e) {
          console.error('Payment error:',
            e.message);
        }
      }
    }

    (function(){})('Cron complete:', results);

    return res.status(200).json({
      success: true,
      slot,
      total: results.length,
      sent: results.filter(
        r => r.status === 'sent').length,
      failed: results.filter(
        r => r.status === 'failed').length,
      results
    });

  } catch (error) {
    console.error('Cron error:', error.message);
    return res.status(500).json({
      error: error.message
    });
  }
}
