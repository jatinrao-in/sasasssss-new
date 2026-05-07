import { getAdminApp } from '../_lib/firebaseAdmin.js';
import {
  sendDailyReminder,
  sendGeneralMessage,
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
  console.log('Cron running slot:', slot);

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

    console.log('Total users:', allUsers.length);
    console.log('Members:', members.length);

    // ═══════════════════════════
    // MORNING SLOT
    // daily_reminder template
    // Send to members only
    // ═══════════════════════════
    if (slot === 'morning') {
      for (const member of members) {
        if (!member.whatsapp) {
          results.push({
            name: member.name,
            status: 'skipped',
            reason: 'no whatsapp'
          });
          continue;
        }

        try {
          // Get member tasks
          const tasksSnap = await db
            .collection('tasks')
            .where('assignedTo', '==', member.uid)
            .get();

          const tasks = tasksSnap.docs
            .map(d => d.data());

          const pending = tasks.filter(
            t => t.status !== 'completed'
          ).length;

          const overdue = tasks.filter(t => {
            const target =
              t.targetDate?.toDate?.() ||
              new Date(t.targetDate);
            return t.status !== 'completed'
              && target < today;
          }).length;

          console.log(`${member.name}: 
            pending=${pending} overdue=${overdue}`);

          const result = await sendDailyReminder(
            member.whatsapp,
            member.name,
            pending,
            overdue
          );

          await db.collection('whatsapp_logs')
            .add({
              to: member.whatsapp,
              memberName: member.name,
              memberUid: member.uid,
              messageType: 'morning',
              template: 'daily_reminder',
              status: result.success
                ? 'sent' : 'failed',
              msg91Response: result.response,
              sentAt: new Date()
            });

          results.push({
            name: member.name,
            status: result.success
              ? 'sent' : 'failed',
            pending,
            overdue
          });

          // Delay between sends
          await new Promise(r =>
            setTimeout(r, 500));

        } catch (memberErr) {
          console.error(
            `Error for ${member.name}:`,
            memberErr.message
          );
          results.push({
            name: member.name,
            status: 'error',
            error: memberErr.message
          });
        }
      }
    }

    // ═══════════════════════════
    // EVENING SLOT
    // general_message template
    // Send to ALL users (members + admins)
    // ═══════════════════════════
    if (slot === 'evening') {
      for (const user of allUsers) {
        if (!user.whatsapp) continue;

        try {
          const tasksSnap = await db
            .collection('tasks')
            .where('assignedTo', '==', user.uid)
            .get();

          const tasks = tasksSnap.docs
            .map(d => d.data());

          const completed = tasks.filter(t => {
            const updated =
              t.updatedAt?.toDate?.() ||
              new Date(t.updatedAt);
            return t.status === 'completed'
              && updated >= today;
          }).length;

          const pending = tasks.filter(
            t => t.status !== 'completed'
          ).length;

          const overdue = tasks.filter(t => {
            const target =
              t.targetDate?.toDate?.() ||
              new Date(t.targetDate);
            return t.status !== 'completed'
              && target < today;
          }).length;

          let summary;
          if (user.role === 'admin') {
            // Admin gets team summary
            const allTasksSnap = await db
              .collection('tasks').get();
            const allTasks = allTasksSnap.docs
              .map(d => d.data());
            const totalOpen = allTasks.filter(
              t => t.status !== 'completed'
            ).length;
            const totalOverdue = allTasks.filter(
              t => {
                const target =
                  t.targetDate?.toDate?.() ||
                  new Date(t.targetDate);
                return t.status !== 'completed'
                  && target < today;
              }
            ).length;
            const totalDone = allTasks.filter(
              t => {
                const updated =
                  t.updatedAt?.toDate?.() ||
                  new Date(t.updatedAt);
                return t.status === 'completed'
                  && updated >= today;
              }
            ).length;
            summary = 
              `Team summary - Open: ${totalOpen},` +
              ` Overdue: ${totalOverdue},` +
              ` Completed today: ${totalDone}`;
          } else {
            summary =
              `Completed today: ${completed},` +
              ` Pending: ${pending},` +
              ` Overdue: ${overdue}`;
          }

          const result = await sendGeneralMessage(
            user.whatsapp,
            user.name,
            summary
          );

          await db.collection('whatsapp_logs')
            .add({
              to: user.whatsapp,
              memberName: user.name,
              memberUid: user.uid,
              messageType: 'evening',
              template: 'general_message',
              status: result.success
                ? 'sent' : 'failed',
              msg91Response: result.response,
              sentAt: new Date()
            });

          results.push({
            name: user.name,
            role: user.role,
            status: result.success
              ? 'sent' : 'failed'
          });

          await new Promise(r =>
            setTimeout(r, 500));

        } catch (userErr) {
          console.error(
            `Error for ${user.name}:`,
            userErr.message
          );
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

    console.log('Cron complete:', results);

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
