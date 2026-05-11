import { getAdminApp } from '../lib/firebaseAdmin.js';
import {
  sendTaskOverdue,
  sendPaymentReminder,
  sendDailyReminder,
  sendGeneralMessage,
  sendToolReturn,
  sendRgpReminder
} from '../lib/msg91.js';

export default async function handler(
  req, res
) {
  res.setHeader(
    'Access-Control-Allow-Origin', '*');

  // Verify cron secret
  const authHeader = req.headers.authorization;
  const secret = authHeader?.replace('Bearer ', '');

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
      error: 'Firebase init failed: ' + e.message
    });
  }

  const { db } = adminApp;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const tomorrow = new Date(today);
  tomorrow.setDate(tomorrow.getDate() + 1);

  const results = [];

  try {
    // GET ALL ACTIVE USERS
    const usersSnap = await db
      .collection('users')
      .where('status', '==', 'active')
      .get();

    const allUsers = usersSnap.docs.map(d => ({
      uid: d.id,
      ...d.data()
    }));

    const members = allUsers.filter(u => u.role === 'member');
    console.log('Total users:', allUsers.length, 'Members:', members.length);

    // ═══════════════════════════
    // MORNING SLOT (Members only)
    // ═══════════════════════════
    if (slot === 'morning') {
      for (const member of members) {
        if (!member.whatsapp) continue;

        try {
          const uid = member.uid;
          const tasksSnap = await db.collection('tasks').where('assignedTo', '==', uid).get();
          const tasks = tasksSnap.docs.map(d => d.data());
          
          const pendingTasks = tasks.filter(t => t.status !== 'completed').length;
          const overdueTasks = tasks.filter(t => {
            const target = t.targetDate?.toDate?.() || new Date(t.targetDate);
            return t.status !== 'completed' && target < today;
          }).length;

          const result = await sendDailyReminder(
            member.whatsapp,
            member.name,
            pendingTasks,
            overdueTasks
          );

          results.push({ name: member.name, template: 'daily_reminder', status: result.success ? 'sent' : 'failed' });
          await new Promise(r => setTimeout(r, 500));
        } catch (err) {
          console.error(`Error for ${member.name}:`, err.message);
          results.push({ name: member.name, status: 'error', error: err.message });
        }
      }
    }

    // ═══════════════════════════
    // EVENING SLOT (All Users)
    // ═══════════════════════════
    if (slot === 'evening') {
      for (const user of allUsers) {
        if (!user.whatsapp) continue;

        try {
          const uid = user.uid;
          let pendingTasks = 0, overdueTasks = 0, followups = 0, enquiries = 0, payments = 0, rgp = 0;

          if (user.role === 'admin') {
            const tasksSnap = await db.collection('tasks').get();
            const tasks = tasksSnap.docs.map(d => d.data());
            pendingTasks = tasks.filter(t => t.status !== 'completed').length;
            overdueTasks = tasks.filter(t => {
              const target = t.targetDate?.toDate?.() || new Date(t.targetDate);
              return t.status !== 'completed' && target < today;
            }).length;

            followups = (await db.collection('followups').where('status', '==', 'open').get()).size;
            enquiries = (await db.collection('enquiries').where('status', '==', 'open').get()).size;
            payments = (await db.collection('payments').where('paymentStatus', '!=', 'received').get()).size;
            rgp = (await db.collection('rgp').where('status', '==', 'open').get()).size;

            const summary = `Team total - Tasks open: ${pendingTasks}, Overdue: ${overdueTasks}, Followups: ${followups}, Enquiries: ${enquiries}, Payments: ${payments}, RGP: ${rgp}`;
            
            const result = await sendGeneralMessage(user.whatsapp, user.name, summary);
            results.push({ name: user.name, template: 'general_message', status: result.success ? 'sent' : 'failed' });

          } else {
            const tasksSnap = await db.collection('tasks').where('assignedTo', '==', uid).get();
            const tasks = tasksSnap.docs.map(d => d.data());
            pendingTasks = tasks.filter(t => t.status !== 'completed').length;
            overdueTasks = tasks.filter(t => {
              const target = t.targetDate?.toDate?.() || new Date(t.targetDate);
              return t.status !== 'completed' && target < today;
            }).length;

            followups = (await db.collection('followups').where('assignedTo', '==', uid).where('status', '==', 'open').get()).size;
            enquiries = (await db.collection('enquiries').where('assignedTo', '==', uid).where('status', '==', 'open').get()).size;
            payments = (await db.collection('payments').where('assignedTo', '==', uid).where('paymentStatus', '!=', 'received').get()).size;
            rgp = (await db.collection('rgp').where('assignedTo', '==', uid).where('status', '==', 'open').get()).size;

            const summary = `Tasks pending: ${pendingTasks}, Overdue: ${overdueTasks}, Followups: ${followups}, Enquiries: ${enquiries}, Payments: ${payments}, RGP open: ${rgp}`;
            
            const result = await sendGeneralMessage(user.whatsapp, user.name, summary);
            results.push({ name: user.name, template: 'general_message', status: result.success ? 'sent' : 'failed' });
          }

          await new Promise(r => setTimeout(r, 500));
        } catch (err) {
          console.error(`Error for ${user.name}:`, err.message);
          results.push({ name: user.name, status: 'error', error: err.message });
        }
      }
    }

    // ═══════════════════════════
    // OVERDUE SLOT
    // ═══════════════════════════
    if (slot === 'overdue') {
      const tasksSnap = await db.collection('tasks').where('status', '!=', 'completed').get();

      for (const taskDoc of tasksSnap.docs) {
        const task = taskDoc.data();
        const target = task.targetDate?.toDate?.() || new Date(task.targetDate);

        if (target >= today) continue;

        const overdueDays = Math.floor((today - target) / (1000 * 60 * 60 * 24));
        const user = allUsers.find(u => u.uid === task.assignedTo);

        if (!user?.whatsapp) continue;

        const projectDoc = await db.doc(`projects/${task.projectId}`).get();
        const projectName = projectDoc.data()?.name || 'Project';

        try {
          const result = await sendTaskOverdue(user.whatsapp, user.name, task.title, projectName, overdueDays);
          results.push({ name: user.name, task: task.title, template: 'task_overdue', status: result.success ? 'sent' : 'failed' });
          await new Promise(r => setTimeout(r, 500));
        } catch (e) {
          console.error('Overdue error:', e.message);
        }
      }
    }

    // ═══════════════════════════
    // PAYMENT SLOT
    // ═══════════════════════════
    if (slot === 'payment') {
      const paymentsSnap = await db.collection('payments').where('paymentStatus', '!=', 'received').get();

      for (const payDoc of paymentsSnap.docs) {
        const payment = payDoc.data();
        const dueDate = payment.targetPaymentDate?.toDate?.() || new Date(payment.targetPaymentDate);

        if (!dueDate || dueDate > today) continue; // Only overdue payments

        const user = allUsers.find(u => u.uid === payment.assignedTo);
        if (!user?.whatsapp) continue;

        try {
          const amount = payment.netPending || payment.amount || 0;
          const result = await sendPaymentReminder(
            user.whatsapp,
            user.name,
            payment.customerName || 'Client',
            payment.invoiceNumber || 'N/A',
            amount
          );
          results.push({ name: user.name, customer: payment.customerName, template: 'payment_reminder', status: result.success ? 'sent' : 'failed' });
          await new Promise(r => setTimeout(r, 500));
        } catch (e) {
          console.error('Payment cron error:', e.message);
        }
      }
    }

    // ═══════════════════════════
    // TOOL SLOT
    // ═══════════════════════════
    if (slot === 'tool') {
      const toolsSnap = await db.collection('tools').where('status', '==', 'assigned').get();

      for (const toolDoc of toolsSnap.docs) {
        const tool = toolDoc.data();
        const assignedDate = tool.assignedDate?.toDate?.() || new Date(tool.assignedDate);
        
        if (!assignedDate) continue;

        const days = Math.floor((today - assignedDate) / (1000 * 60 * 60 * 24));
        if (days <= 30) continue; // Only if tool > 30 days

        const user = allUsers.find(u => u.uid === tool.assignedTo);
        if (!user?.whatsapp) continue;

        try {
          const issuedDateStr = assignedDate.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
          const result = await sendToolReturn(
            user.whatsapp,
            user.name,
            tool.toolName,
            issuedDateStr,
            days
          );
          results.push({ name: user.name, tool: tool.toolName, template: 'tool_return', status: result.success ? 'sent' : 'failed' });
          await new Promise(r => setTimeout(r, 500));
        } catch (e) {
          console.error('Tool cron error:', e.message);
        }
      }
    }

    // ═══════════════════════════
    // RGP SLOT
    // ═══════════════════════════
    if (slot === 'rgp') {
      const rgpSnap = await db.collection('rgp').where('status', '==', 'open').get();

      for (const rgpDoc of rgpSnap.docs) {
        const rgp = rgpDoc.data();
        const assignedDate = rgp.assignedDate?.toDate?.() || rgp.createdAt?.toDate?.() || new Date(rgp.createdAt || Date.now());
        
        const days = Math.floor((today - assignedDate) / (1000 * 60 * 60 * 24));
        if (days <= 15) continue; // Only if open > 15 days

        const user = allUsers.find(u => u.uid === rgp.assignedTo);
        if (!user?.whatsapp) continue;

        try {
          const result = await sendRgpReminder(
            user.whatsapp,
            user.name,
            rgp.docNumber || 'N/A',
            rgp.fromCompany || 'N/A',
            rgp.toCompany || 'N/A',
            days
          );
          results.push({ name: user.name, doc: rgp.docNumber, template: 'rgp_reminder', status: result.success ? 'sent' : 'failed' });
          await new Promise(r => setTimeout(r, 500));
        } catch (e) {
          console.error('RGP cron error:', e.message);
        }
      }
    }

    return res.status(200).json({ success: true, slot, total: results.length, results });

  } catch (error) {
    console.error('Cron error:', error.message);
    return res.status(500).json({ error: error.message });
  }
}
