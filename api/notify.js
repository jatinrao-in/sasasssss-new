import { Timestamp } from 'firebase-admin/firestore';
import { handleConfigError } from '../server/config.js';
import { handleCors } from '../server/cors.js';
import { getAdminServices } from '../server/firebaseAdmin.js';
import { requireNotifyPermission, verifyFirebaseRequest } from '../server/auth.js';
import {
  sendGeneralMessage,
  sendTaskAssigned,
  sendTaskOverdue,
  sendSalaryCredited,
  sendPaymentReminder,
  sendRgpReminder,
  sendToolReturn,
  sendDailyReminder,
} from '../server/whatsapp/msg91.js';

// ─── In-app notification title / body helpers ───────────────────────────────

const getTitle = (eventType) => {
  const titles = {
    task_assigned: 'New Task Assigned',
    task_completed: 'Task Completed',
    task_overdue: 'Task Overdue',
    salary_paid: 'Salary Credited',
    enquiry_assigned: 'New Enquiry',
    followup_due: 'Follow-up Due',
    payment_due: 'Payment Reminder',
    rgp_overdue: 'RGP Reminder',
    tool_not_returned: 'Tool Return',
    custom_message: 'New Message',
  };
  return titles[eventType] || 'Notification';
};

const stripCurrencyPrefix = (value) => String(value || '')
  .replace(/^rs\.?/i, '')
  .replace(/^₹/, '')
  .trim();

const getBody = (eventType, context) => {
  const bodies = {
    task_assigned: `New task: ${context.taskName}`,
    task_overdue: `${context.taskName} is overdue`,
    salary_paid: `Salary of Rs.${stripCurrencyPrefix(context.netSalary)} credited for ${context.month}`,
    payment_due: `Follow up: ${context.customerName}`,
    rgp_overdue: `RGP ${context.docNumber} needs action`,
    tool_not_returned: `Return ${context.toolName}`,
    custom_message: String(context.message || '').substring(0, 60),
  };
  return bodies[eventType] || '';
};

// ─── Route each eventType to the correct MSG91 template function ────────────

async function dispatchWhatsApp(eventType, context) {
  const to = context.whatsappNumber;
  if (!to || !String(to).trim()) {
    throw Object.assign(new Error('No WhatsApp number in context'), { statusCode: 400 });
  }

  switch (eventType) {
    case 'task_assigned':
      return sendTaskAssigned(
        to,
        context.memberName,
        context.taskName,
        context.projectName,
        context.deadline || 'Not set',
      );

    case 'task_overdue':
      return sendTaskOverdue(
        to,
        context.memberName,
        context.taskName,
        context.projectName,
        context.overdueDays ?? 0,
      );

    case 'salary_paid':
      return sendSalaryCredited(
        to,
        context.memberName,
        stripCurrencyPrefix(context.netSalary) || '0',
        context.month       || '',
        context.paidDate    || new Date().toLocaleDateString('en-IN'),
      );

    case 'payment_due':
      return sendPaymentReminder(
        to,
        context.memberName,
        context.customerName || '',
        context.invoiceNo    || '',
        context.amount       || '0',
      );

    case 'rgp_overdue':
      return sendRgpReminder(
        to,
        context.memberName,
        context.docNumber   || '',
        context.fromCompany || '',
        context.toCompany   || '',
        context.openDays    ?? 0,
      );

    case 'tool_not_returned':
      return sendToolReturn(
        to,
        context.memberName,
        context.toolName   || '',
        context.issuedDate || '',
        context.days       ?? 0,
      );

    case 'custom_message':
      return sendGeneralMessage(
        to,
        context.memberName,
        context.message || '',
      );

    // Generic daily reminder (triggered via cron, not UI typically)
    case 'daily_reminder':
      return sendDailyReminder(
        to,
        context.memberName,
        context.pendingTasks ?? 0,
        context.overdueTasks ?? 0,
      );

    default: {
      const err = new Error(`Unknown eventType: ${eventType}`);
      err.statusCode = 400;
      throw err;
    }
  }
}

// ─── Handler ────────────────────────────────────────────────────────────────

export default async function handler(req, res) {
  if (handleCors(req, res)) return;

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { eventType, context } = req.body || {};

  if (!eventType || !context) {
    return res.status(400).json({ error: 'Missing eventType or context' });
  }

  let db;

  try {
    ({ db } = getAdminServices());
    const authContext = await verifyFirebaseRequest(req);
    requireNotifyPermission(authContext, eventType);

    const sendResult = await dispatchWhatsApp(eventType, context);
    const success = sendResult?.sent === true;

    // Log to whatsapp_logs
    await db.collection('whatsapp_logs').add({
      eventType,
      toNumber: context.whatsappNumber,
      memberName: context.memberName || '',
      memberUid: context.memberUid || null,
      template: sendResult.template,
      status: success ? 'sent' : 'failed',
      msg91Response: sendResult.result,
      context,
      requestedBy: authContext.decodedToken.uid,
      requestedByRole: authContext.role,
      sentAt: Timestamp.now(),
    });

    // Save in-app notification
    if (context.memberUid) {
      await db
        .collection('notifications')
        .doc(context.memberUid)
        .collection('items')
        .add({
          title: getTitle(eventType),
          body: getBody(eventType, context),
          type: eventType,
          read: false,
          createdAt: Timestamp.now(),
        });
    }

    return res.status(200).json({
      success,
      template: sendResult.template,
      phone: sendResult.to,
      msg91Response: sendResult.result,
    });

  } catch (error) {
    console.error('notify handler error:', error.message);

    if (handleConfigError(res, error)) return;

    try {
      if (db) {
        await db.collection('whatsapp_logs').add({
          eventType,
          context,
          status: 'failed',
          error: error.message,
          sentAt: Timestamp.now(),
        });
      }
    } catch {
      // Never let log write hide the original error.
    }

    const statusCode =
      error.statusCode ||
      (String(error.code || '').startsWith('auth/') ? 401 : 0) ||
      (error.message.toLowerCase().includes('token') ? 401 : 500);

    return res.status(statusCode).json({
      error: statusCode === 401 ? 'Unauthorized' : error.message,
    });
  }
}
