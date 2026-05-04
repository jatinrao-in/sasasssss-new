import { Timestamp } from 'firebase-admin/firestore';
import { handleCors } from '../../server/cors.js';
import { requireEnv } from '../../server/config.js';
import { getAdminServices } from '../../server/firebaseAdmin.js';
import { verifyFirebaseRequest, requireAdmin } from '../../server/auth.js';
import { assertWhatsAppBalance, recordSuccessfulWhatsAppSend } from '../../server/whatsapp/balance.js';
import {
  sendDailyReminder,
  sendGeneralMessage,
  sendTaskOverdue,
  sendTaskAssigned,
  sendToolReturn,
  sendRgpReminder,
  sendPaymentReminder
} from '../../server/whatsapp/msg91.js';

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function readCronSecret(req) {
  return String(req.headers.authorization || req.headers['x-cron-secret'] || '').trim();
}

function calcDaysOpen(dateObj) {
  if (!dateObj) return 0;
  const target = dateObj.toDate ? dateObj.toDate() : new Date(dateObj);
  const now = new Date();
  const diffTime = Math.abs(now - target);
  return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
}

export default async function handler(req, res) {
  if (handleCors(req, res, 'GET, OPTIONS')) return;

  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { CRON_SECRET } = requireEnv(['CRON_SECRET']);
    let isAdmin = false;
    
    if (readCronSecret(req) === `Bearer ${CRON_SECRET}`) {
      isAdmin = true;
    } else {
      try {
        const authContext = await verifyFirebaseRequest(req);
        requireAdmin(authContext);
        isAdmin = true;
      } catch (err) {
        isAdmin = false;
      }
    }

    if (!isAdmin) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const { db } = getAdminServices();
    const slot = String(req.query?.slot || '').trim().toLowerCase();

    const validSlots = ['morning', 'evening', 'overdue', 'deadline', 'payment'];
    if (!validSlots.includes(slot)) {
      return res.status(400).json({ error: `slot must be one of: ${validSlots.join(', ')}` });
    }

    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    const usersSnap = await db.collection('users').where('status', '==', 'active').get();
    const allUsers = usersSnap.docs.map(doc => ({ uid: doc.id, ...doc.data() }));

    const members = allUsers.filter(u => u.role === 'member');
    const admins = allUsers.filter(u => u.role === 'admin');

    const results = { sent: 0, failed: 0, logs: [] };

    const logAndRecord = async (user, template, sendFn, ...args) => {
      if (!user.whatsapp || String(user.whatsapp).length < 10) {
        results.logs.push({ name: user.name, status: 'skipped', reason: 'Invalid or missing whatsapp' });
        return;
      }
      try {
        const availableBalanceForSend = await assertWhatsAppBalance(db, 1);
        const sendResult = await sendFn(user.whatsapp, user.name || 'Team Member', ...args);
        
        await db.collection('whatsapp_logs').add({
          to: sendResult.to,
          memberName: user.name || 'Unknown',
          memberUid: user.uid,
          messageType: slot,
          template,
          status: 'sent',
          msg91Response: sendResult.result,
          sentAt: Timestamp.now(),
        });
        
        await recordSuccessfulWhatsAppSend(db, {
          actor: 'Automation Cron',
          balanceBefore: availableBalanceForSend,
          messageType: template,
          phone: sendResult.to,
          recipientName: user.name || 'Unknown',
          source: 'api/cron/send-reminders',
        });
        results.sent++;
      } catch (error) {
        await db.collection('whatsapp_logs').add({
          to: user.whatsapp || '',
          memberName: user.name || 'Unknown',
          memberUid: user.uid,
          messageType: slot,
          template,
          status: 'failed',
          error: error.message,
          sentAt: Timestamp.now(),
        }).catch(() => {});
        results.failed++;
        results.logs.push({ name: user.name, status: 'failed', error: error.message });
      }
    };

    if (slot === 'morning') {
      for (const user of members) {
        let pendingTasksCount = 0;
        let overdueTasksCount = 0;

        const tasksSnap = await db.collection('tasks').where('assignedTo', '==', user.uid).get();
        for (const doc of tasksSnap.docs) {
          const t = doc.data();
          if (t.status !== 'completed') {
            pendingTasksCount++;
            const target = t.targetDate?.toDate?.() || (t.targetDate ? new Date(t.targetDate) : null);
            if (target && target < today) {
              overdueTasksCount++;
            }
          }
        }
        await logAndRecord(user, 'daily_reminder', sendDailyReminder, pendingTasksCount, overdueTasksCount);
        await sleep(500);
      }
    } else if (slot === 'evening') {
      let teamCompleted = 0;
      let teamPending = 0;
      let teamOverdue = 0;

      for (const user of members) {
        let completedToday = 0;
        let pending = 0;
        let overdue = 0;

        const tasksSnap = await db.collection('tasks').where('assignedTo', '==', user.uid).get();
        for (const doc of tasksSnap.docs) {
          const t = doc.data();
          if (t.status === 'completed') {
            const comp = t.completedAt?.toDate?.() || (t.completedAt ? new Date(t.completedAt) : null);
            if (comp && comp.toDateString() === today.toDateString()) {
              completedToday++;
            }
          } else {
            pending++;
            const target = t.targetDate?.toDate?.() || (t.targetDate ? new Date(t.targetDate) : null);
            if (target && target < today) overdue++;
          }
        }

        teamCompleted += completedToday;
        teamPending += pending;
        teamOverdue += overdue;

        const summary = `You completed ${completedToday} tasks today. Pending: ${pending}. Overdue: ${overdue}.`;
        await logAndRecord(user, 'general_message', sendGeneralMessage, summary);
        await sleep(500);
      }

      const adminSummary = `Team summary: ${teamPending} tasks open, ${teamOverdue} overdue, ${teamCompleted} completed today.`;
      for (const admin of admins) {
        await logAndRecord(admin, 'general_message', sendGeneralMessage, adminSummary);
        await sleep(500);
      }
    } else if (slot === 'overdue') {
      for (const user of members) {
        const tasksSnap = await db.collection('tasks').where('assignedTo', '==', user.uid).get();
        for (const doc of tasksSnap.docs) {
          const t = doc.data();
          if (t.status !== 'completed') {
            const target = t.targetDate?.toDate?.() || (t.targetDate ? new Date(t.targetDate) : null);
            if (target && target < today) {
              const overdueDays = calcDaysOpen(t.targetDate);
              await logAndRecord(user, 'task_overdue', sendTaskOverdue, t.taskName, t.projectName || 'General', overdueDays);
              await sleep(300);
            }
          }
        }
      }
    } else if (slot === 'deadline') {
      for (const user of members) {
        const tasksSnap = await db.collection('tasks').where('assignedTo', '==', user.uid).get();
        for (const doc of tasksSnap.docs) {
          const t = doc.data();
          if (t.status !== 'completed') {
            const target = t.targetDate?.toDate?.() || (t.targetDate ? new Date(t.targetDate) : null);
            if (target && target.toDateString() === tomorrow.toDateString()) {
              const deadlineStr = target.toLocaleDateString('en-IN');
              await logAndRecord(user, 'task_assigned', sendTaskAssigned, t.taskName, t.projectName || 'General', deadlineStr);
              await sleep(300);
            }
          }
        }
      }
    } else if (slot === 'payment') {
      for (const user of members) {
        const hasPaymentAccess = user.permissions?.includes('payments') || user.permissions?.includes('outgoing_payments');
        if (hasPaymentAccess) {
          const paymentsSnap = await db.collection('payments').where('assignedTo', '==', user.uid).get();
          for (const doc of paymentsSnap.docs) {
            const p = doc.data();
            if (p.paymentStatus !== 'received') {
              const target = p.targetPaymentDate?.toDate?.() || (p.targetPaymentDate ? new Date(p.targetPaymentDate) : null);
              if (target && target < today) {
                await logAndRecord(user, 'payment_reminder', sendPaymentReminder, p.customerName || 'N/A', p.invoiceNo || 'N/A', p.amount || '0');
                await sleep(300);
              }
            }
          }
        }
      }
    }

    return res.status(200).json({ success: true, slot, results });

  } catch (error) {
    console.error('send-reminders failed:', error.message);
    return res.status(500).json({ error: error.message });
  }
}
