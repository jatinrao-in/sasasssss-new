import { getAdminApp } from
  './lib/firebaseAdmin.js';
import {
  sendWelcomeMessage,
  sendTaskAssigned,
  sendTaskOverdue,
  sendSalaryCredited,
  sendToolReturn,
  sendRgpReminder,
  sendPaymentReminder,
  sendDailyReminder,
  sendGeneralMessage
} from './lib/msg91.js';

export default async function handler(
  req, res
) {
  res.setHeader(
    'Access-Control-Allow-Origin', '*');
  res.setHeader(
    'Access-Control-Allow-Methods',
    'POST, OPTIONS');
  res.setHeader(
    'Access-Control-Allow-Headers',
    'Content-Type, Authorization');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }
  if (req.method !== 'POST') {
    return res.status(405).end();
  }

  const { eventType, context } = req.body;

  if (!eventType || !context) {
    return res.status(400).json({
      error: 'eventType and context required'
    });
  }

  if (!context.whatsappNumber) {
    return res.status(400).json({
      error: 'whatsappNumber required'
    });
  }

  const { db } = getAdminApp();
  let result;

  try {
    switch (eventType) {

      case 'welcome':
        result = await sendWelcomeMessage(
          context.whatsappNumber,
          context.memberName,
          context.email,
          'Ask admin for password',
          'sasasssss-one.vercel.app'
        );
        break;

      case 'task_assigned':
        result = await sendTaskAssigned(
          context.whatsappNumber,
          context.memberName,
          context.taskName,
          context.projectName,
          context.deadline
        );
        break;

      case 'task_overdue':
        result = await sendTaskOverdue(
          context.whatsappNumber,
          context.memberName,
          context.taskName,
          context.projectName,
          context.overdueDays
        );
        break;

      case 'salary_paid':
        result = await sendSalaryCredited(
          context.whatsappNumber,
          context.memberName,
          context.netSalary,
          context.month,
          context.paidDate
        );
        break;

      case 'tool_assigned':
        result = await sendToolReturn(
          context.whatsappNumber,
          context.memberName,
          context.toolName,
          context.issuedDate,
          '0'
        );
        break;

      case 'rgp_assigned':
        result = await sendRgpReminder(
          context.whatsappNumber,
          context.memberName,
          context.docNumber,
          context.fromCompany,
          context.toCompany,
          '0'
        );
        break;

      case 'payment_assigned':
        result = await sendPaymentReminder(
          context.whatsappNumber,
          context.memberName,
          context.customerName,
          context.invoiceNo,
          context.amount
        );
        break;

      default:
        return res.status(400).json({
          error: 'Unknown eventType: ' +
            eventType
        });
    }

    // Log to Firestore
    await db.collection('whatsapp_logs').add({
      eventType,
      toNumber: context.whatsappNumber,
      memberName: context.memberName,
      template: result.template,
      status: result.success
        ? 'sent' : 'failed',
      msg91Response: result.response,
      context,
      sentAt: new Date()
    });

    return res.status(200).json({
      success: result.success,
      template: result.template,
      msg91Response: result.response
    });

  } catch (error) {
    console.error('Notify error:',
      error.message);

    await db.collection('whatsapp_logs')
      .add({
        eventType,
        context,
        status: 'failed',
        error: error.message,
        sentAt: new Date()
      }).catch(() => {});

    return res.status(500).json({
      error: error.message
    });
  }
}
