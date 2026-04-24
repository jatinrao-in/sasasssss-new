import { initializeApp, cert, getApps } from 'firebase-admin/app';
import { getFirestore, Timestamp } from 'firebase-admin/firestore';
import { draftMessage } from '../ai/draft-whatsapp.js';
import { sendViaMsg91 } from '../whatsapp/send-text.js';

// Initialize Firebase Admin (with check to prevent multiple instances)
const apps = getApps();
const app = apps.length > 0 ? apps[0] : initializeApp({
  credential: cert({
    projectId: process.env.FIREBASE_PROJECT_ID,
    clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
    privateKey: process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n')
  })
});

const formatDateIST = (date) => {
  if (!date) return 'Not set';
  const d = date?.toDate ? date.toDate() : new Date(date);
  return d.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
};

const daysDiff = (date1, date2) => {
  const d1 = date1?.toDate ? date1.toDate() : new Date(date1);
  const d2 = date2?.toDate ? date2.toDate() : new Date(date2);
  return Math.floor((d2 - d1) / (1000 * 60 * 60 * 24));
};

// Send a notification via Gemini + MSG91 and log it
const sendNotification = async (db, eventType, context) => {
  if (!context.whatsappNumber) return;
  try {
    const message = await draftMessage(eventType, context);
    const sendResult = await sendViaMsg91(context.whatsappNumber, message);

    await db.collection('whatsapp_logs').add({
      eventType,
      toNumber: context.whatsappNumber,
      message,
      context,
      status: sendResult.type === 'success' ? 'sent' : 'failed',
      response: sendResult,
      sentAt: Timestamp.now()
    });

    if (context.memberUid) {
      const titles = {
        task_overdue: '⚠️ Task Overdue',
        followup_due: '🔔 Follow-up Due',
        payment_due: '💳 Payment Reminder',
        rgp_overdue: '📦 RGP Reminder',
        tool_not_returned: '🔧 Tool Return',
      };
      await db.collection('notifications').doc(context.memberUid).collection('items').add({
        title: titles[eventType] || 'Notification',
        body: message.split('\n')[1] || message.substring(0, 60),
        type: eventType,
        read: false,
        createdAt: Timestamp.now()
      });
    }
  } catch (err) {
    console.error(`Failed to send ${eventType} notification:`, err.message);
  }
};

export default async function handler(req, res) {
  // Verify cron secret
  const authHeader = req.headers.authorization;
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  try {
    const db = getFirestore();
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const todayStr = today.toISOString().split('T')[0];

    // ── Get settings (company name) ──────────────────────────────────────────
    const settingsDoc = await db.collection('settings').doc('company').get();
    const companyName = settingsDoc.exists ? (settingsDoc.data().name || 'Your Company') : 'Your Company';

    // ── Get all active members ──────────────────────────────────────────────
    const usersSnap = await db.collection('users').where('role', '==', 'member').where('status', '==', 'active').get();
    const members = {};
    usersSnap.docs.forEach(d => { members[d.id] = { uid: d.id, ...d.data() }; });

    // ── Get all projects for name lookup ──────────────────────────────────
    const projectsSnap = await db.collection('projects').get();
    const projects = {};
    projectsSnap.docs.forEach(d => { projects[d.id] = { id: d.id, ...d.data() }; });

    const notifications = [];

    // ── 1. TASK OVERDUE CHECK ───────────────────────────────────────────────
    const tasksSnap = await db.collection('tasks').where('status', '!=', 'completed').get();
    for (const taskDoc of tasksSnap.docs) {
      const task = taskDoc.data();
      const member = members[task.assignedTo];
      if (!member || !task.targetDate) continue;

      const targetDate = task.targetDate.toDate();
      if (targetDate < today) {
        const overdueDays = daysDiff(targetDate, today);
        const project = projects[task.projectId] || {};
        notifications.push(sendNotification(db, 'task_overdue', {
          memberUid: member.uid,
          whatsappNumber: member.whatsapp || '',
          memberName: member.name,
          taskName: task.title,
          projectName: project.name || 'Unknown Project',
          deadline: formatDateIST(targetDate),
          overdueDays,
          company: companyName,
        }));
      }
    }

    // ── 2. FOLLOWUP DUE TODAY ────────────────────────────────────────────────
    const followupsSnap = await db.collection('followups').where('status', '!=', 'closed').get();
    for (const fuDoc of followupsSnap.docs) {
      const fu = fuDoc.data();
      const member = members[fu.assignedTo];
      if (!member || !fu.nextFollowupDate) continue;

      const followupDate = fu.nextFollowupDate.toDate();
      followupDate.setHours(0, 0, 0, 0);
      if (followupDate.toISOString().split('T')[0] === todayStr) {
        notifications.push(sendNotification(db, 'followup_due', {
          memberUid: member.uid,
          whatsappNumber: member.whatsapp || '',
          memberName: member.name,
          followupType: fu.taskType || 'Follow-up',
          topic: fu.customerName || fu.taskType || 'Assigned item',
          dueDate: formatDateIST(today),
          company: companyName,
        }));
      }
    }

    // ── 3. PAYMENT DUE / OVERDUE ─────────────────────────────────────────────
    const paymentsSnap = await db.collection('payments').where('paymentStatus', '!=', 'received').get();
    for (const payDoc of paymentsSnap.docs) {
      const pay = payDoc.data();
      const member = members[pay.assignedTo];
      if (!member) continue;

      const targetDate = pay.targetPaymentDate?.toDate();
      const followupDate = pay.nextFollowupDate?.toDate();

      const isFollowupDue = followupDate && followupDate.toISOString().split('T')[0] === todayStr;
      const isOverdue = targetDate && targetDate < today;

      if (isFollowupDue || isOverdue) {
        const overdueDays = targetDate ? daysDiff(targetDate, today) : 0;
        notifications.push(sendNotification(db, 'payment_due', {
          memberUid: member.uid,
          whatsappNumber: member.whatsapp || '',
          memberName: member.name,
          customerName: pay.customerName || 'Customer',
          invoiceNo: pay.invoiceNumber || '-',
          amount: `Rs.${(pay.netPending || 0).toLocaleString('en-IN')}`,
          dueDate: formatDateIST(targetDate),
          overdueDays: Math.max(0, overdueDays),
          company: companyName,
        }));
      }
    }

    // ── 4. RGP OPEN > 15 DAYS ────────────────────────────────────────────────
    const rgpSnap = await db.collection('rgp').where('status', '==', 'open').get();
    for (const rgpDoc of rgpSnap.docs) {
      const rgp = rgpDoc.data();
      const member = members[rgp.assignedTo];
      if (!member || !rgp.date) continue;

      const openDays = daysDiff(rgp.date.toDate(), today);
      if (openDays > 15) {
        notifications.push(sendNotification(db, 'rgp_overdue', {
          memberUid: member.uid,
          whatsappNumber: member.whatsapp || '',
          memberName: member.name,
          type: rgp.type || 'RGP',
          docNumber: rgp.docNumber || '-',
          fromCompany: rgp.fromCompany || '-',
          toCompany: rgp.toCompany || '-',
          openDays,
          company: companyName,
        }));
      }
    }

    // ── 5. TOOL NOT RETURNED > 30 DAYS ──────────────────────────────────────
    const toolsSnap = await db.collection('tools').where('returnStatus', '==', 'pending').get();
    for (const toolDoc of toolsSnap.docs) {
      const tool = toolDoc.data();
      const member = members[tool.assignedTo];
      if (!member || !tool.handedOverDate) continue;

      const days = daysDiff(tool.handedOverDate.toDate(), today);
      if (days > 30) {
        notifications.push(sendNotification(db, 'tool_not_returned', {
          memberUid: member.uid,
          whatsappNumber: member.whatsapp || '',
          memberName: member.name,
          toolName: tool.toolName || 'Tool',
          issuedDate: formatDateIST(tool.handedOverDate),
          days,
          company: companyName,
        }));
      }
    }

    // Wait for all notifications (fire-and-forget style, errors logged inside)
    await Promise.allSettled(notifications);

    return res.status(200).json({
      success: true,
      processed: notifications.length,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('Cron error:', error);
    return res.status(500).json({ error: error.message });
  }
}
