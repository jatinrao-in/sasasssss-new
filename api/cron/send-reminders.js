import { getAdminApp } from '../lib/firebaseAdmin.js';
import { sendDailyReminder, sendGeneralMessage } from '../lib/msg91.js';

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');

  // Verify secret
  const auth = req.headers.authorization;
  if (!auth || auth !== `Bearer ${process.env.CRON_SECRET}`) {
    console.error('Invalid cron secret');
    return res.status(401).json({ error: 'Unauthorized' });
  }

  const slot = req.query.slot;
  if (!slot) {
    return res.status(400).json({ error: 'slot param required: morning or evening' });
  }

  console.log(`Cron started: ${slot}`);

  let adminApp;
  try {
    adminApp = getAdminApp();
  } catch (e) {
    console.error('Firebase init:', e.message);
    return res.status(500).json({ error: 'Firebase init failed: ' + e.message });
  }

  const { db } = adminApp;
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const results = {
    sent: 0,
    failed: 0,
    skipped: 0,
    details: []
  };

  try {
    // Fetch all active users
    const usersSnap = await db
      .collection('users')
      .where('status', '==', 'active')
      .where('isHidden', '!=', true)
      .get();

    const allUsers = usersSnap.docs.map(d => ({ uid: d.id, ...d.data() }));
    const members = allUsers.filter(u => u.role === 'member');

    console.log(`Users: ${allUsers.length}, Members: ${members.length}`);

    // ═══════════════════════════
    // MORNING: daily_reminder
    // Members only
    // 8:00 AM IST
    // ═══════════════════════════
    if (slot === 'morning') {
      for (const member of members) {
        if (!member.whatsapp?.trim()) {
          results.skipped++;
          results.details.push({
            name: member.name,
            status: 'skipped',
            reason: 'no whatsapp number'
          });
          continue;
        }

        try {
          // Fetch tasks
          const tasksSnap = await db
            .collection('tasks')
            .where('assignedTo', '==', member.uid)
            .get();

          const tasks = tasksSnap.docs.map(d => d.data());
          const pending = tasks.filter(t => t.status !== 'completed').length;
          const overdue = tasks.filter(t => {
            const target = t.targetDate?.toDate?.() || new Date(t.targetDate);
            return t.status !== 'completed' && target < today;
          }).length;

          console.log(`${member.name}: pending=${pending} overdue=${overdue}`);

          const result = await sendDailyReminder(
            member.whatsapp,
            member.name,
            pending,
            overdue
          );

          // Log to Firestore
          await db.collection('whatsapp_logs').add({
            to: member.whatsapp,
            memberName: member.name,
            memberUid: member.uid,
            slot: 'morning',
            template: 'daily_reminder',
            variables: { name: member.name, pending, overdue },
            status: result.success ? 'sent' : 'failed',
            msg91Response: result.response,
            sentAt: new Date()
          });

          if (result.success) {
            results.sent++;
          } else {
            results.failed++;
          }

          results.details.push({
            name: member.name,
            status: result.success ? 'sent' : 'failed',
            pending,
            overdue
          });

          // Delay between sends
          await new Promise(r => setTimeout(r, 600));
        } catch (err) {
          console.error(`Morning error ${member.name}:`, err.message);
          results.failed++;
          results.details.push({ name: member.name, status: 'error', error: err.message });
        }
      }
    }

    // ═══════════════════════════
    // EVENING: general_message
    // All users (members + admins)
    // 8:00 PM IST
    // ═══════════════════════════
    if (slot === 'evening') {
      for (const user of allUsers) {
        if (!user.whatsapp?.trim()) {
          results.skipped++;
          continue;
        }

        try {
          let summary = '';

          if (user.role === 'member') {
            // Member gets own data
            const tasksSnap = await db
              .collection('tasks')
              .where('assignedTo', '==', user.uid)
              .get();
            const tasks = tasksSnap.docs.map(d => d.data());
            const pending = tasks.filter(t => t.status !== 'completed').length;
            const overdue = tasks.filter(t => {
              const target = t.targetDate?.toDate?.() || new Date(t.targetDate);
              return t.status !== 'completed' && target < today;
            }).length;
            const doneToday = tasks.filter(t => {
              const updated = t.updatedAt?.toDate?.() || new Date(t.updatedAt);
              return t.status === 'completed' && updated >= today;
            }).length;

            const followupsSnap = await db
              .collection('followups')
              .where('assignedTo', '==', user.uid)
              .where('status', '==', 'open')
              .get();

            const enquiriesSnap = await db
              .collection('enquiries')
              .where('assignedTo', '==', user.uid)
              .where('status', '==', 'open')
              .get();

            const paymentsSnap = await db
              .collection('payments')
              .where('assignedTo', '==', user.uid)
              .where('paymentStatus', '!=', 'received')
              .get();

            const rgpSnap = await db
              .collection('rgp')
              .where('assignedTo', '==', user.uid)
              .where('status', '==', 'open')
              .get();

            summary = `Tasks pending: ${pending}, Overdue: ${overdue}, Completed today: ${doneToday}, Followups: ${followupsSnap.size}, Enquiries: ${enquiriesSnap.size}, Payments: ${paymentsSnap.size}, RGP open: ${rgpSnap.size}`;
          } else {
            // Admin gets team totals
            const allTasksSnap = await db.collection('tasks').get();
            const allTasks = allTasksSnap.docs.map(d => d.data());

            const totalPending = allTasks.filter(t => t.status !== 'completed').length;
            const totalOverdue = allTasks.filter(t => {
              const target = t.targetDate?.toDate?.() || new Date(t.targetDate);
              return t.status !== 'completed' && target < today;
            }).length;
            const totalDone = allTasks.filter(t => {
              const updated = t.updatedAt?.toDate?.() || new Date(t.updatedAt);
              return t.status === 'completed' && updated >= today;
            }).length;

            const allFollowupsSnap = await db
              .collection('followups')
              .where('status', '==', 'open')
              .get();
            const allEnquiriesSnap = await db
              .collection('enquiries')
              .where('status', '==', 'open')
              .get();
            const allPaymentsSnap = await db
              .collection('payments')
              .where('paymentStatus', '!=', 'received')
              .get();
            const allRgpSnap = await db
              .collection('rgp')
              .where('status', '==', 'open')
              .get();

            summary = `Team tasks open: ${totalPending}, Overdue: ${totalOverdue}, Done today: ${totalDone}, Followups: ${allFollowupsSnap.size}, Enquiries: ${allEnquiriesSnap.size}, Payments: ${allPaymentsSnap.size}, RGP: ${allRgpSnap.size}`;
          }

          const result = await sendGeneralMessage(user.whatsapp, user.name, summary);

          await db.collection('whatsapp_logs').add({
            to: user.whatsapp,
            memberName: user.name,
            memberUid: user.uid,
            slot: 'evening',
            template: 'general_message',
            summary,
            status: result.success ? 'sent' : 'failed',
            msg91Response: result.response,
            sentAt: new Date()
          });

          if (result.success) {
            results.sent++;
          } else {
            results.failed++;
          }

          results.details.push({
            name: user.name,
            role: user.role,
            status: result.success ? 'sent' : 'failed'
          });

          await new Promise(r => setTimeout(r, 600));
        } catch (err) {
          console.error(`Evening error ${user.name}:`, err.message);
          results.failed++;
          results.details.push({ name: user.name, status: 'error', error: err.message });
        }
      }
    }

    console.log('Cron done:', results);

    return res.status(200).json({
      success: true,
      slot,
      time: new Date().toISOString(),
      sent: results.sent,
      failed: results.failed,
      skipped: results.skipped,
      details: results.details
    });
  } catch (error) {
    console.error('Cron fatal:', error.message);
    return res.status(500).json({ error: error.message });
  }
}
