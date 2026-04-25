import { Timestamp } from 'firebase-admin/firestore';
import { draftMessage } from './ai/draft-whatsapp.js';
import { handleConfigError } from '../server/config.js';
import { getAdminServices } from '../server/firebaseAdmin.js';
import { requireNotifyPermission, verifyFirebaseRequest } from '../server/auth.js';
import { sendViaMsg91 } from './whatsapp/send-text.js';

const setCorsHeaders = (req, res) => {
  const origin = req.headers.origin || '*';
  res.setHeader('Access-Control-Allow-Origin', origin);
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
};

const resolveCompanyContext = async (firestore, context) => {
  if (context?.company && String(context.company).trim()) {
    return context;
  }

  try {
    const settingsDoc = await firestore.collection('settings').doc('company').get();
    const companyName = settingsDoc.exists ? String(settingsDoc.data()?.name || '').trim() : '';

    if (!companyName) {
      return context;
    }

    return {
      ...context,
      company: companyName,
      company_name: companyName,
    };
  } catch (error) {
    return context;
  }
};

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
  };

  return titles[eventType] || 'Notification';
};

export default async function handler(req, res) {
  setCorsHeaders(req, res);

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

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

    const resolvedContext = await resolveCompanyContext(db, context);
    const message = await draftMessage(eventType, resolvedContext);
    const toNumber = resolvedContext.whatsappNumber;

    if (!toNumber || !String(toNumber).trim()) {
      return res.status(400).json({
        error: 'No WhatsApp number provided',
        hint: 'Check that the target profile has a WhatsApp number stored in Firestore',
      });
    }

    const sendResult = await sendViaMsg91(toNumber, message);
    const success = sendResult?.type === 'success' || sendResult?.message?.includes('success');

    await db.collection('whatsapp_logs').add({
      eventType,
      toNumber,
      message,
      context: resolvedContext,
      status: success ? 'sent' : 'failed',
      response: sendResult,
      requestedBy: authContext.decodedToken.uid,
      requestedByRole: authContext.role,
      sentAt: Timestamp.now(),
    });

    if (resolvedContext.memberUid) {
      await db
        .collection('notifications')
        .doc(resolvedContext.memberUid)
        .collection('items')
        .add({
          title: getTitle(eventType),
          body: message.split('\n')[1] || message.substring(0, 60),
          type: eventType,
          read: false,
          createdAt: Timestamp.now(),
        });
    }

    return res.status(200).json({ success: true, message, sent: success });
  } catch (error) {
    console.error('Critical:', error.message);

    if (handleConfigError(res, error)) {
      return;
    }

    try {
      await db.collection('whatsapp_logs').add({
        eventType,
        context: await resolveCompanyContext(db, context),
        status: 'failed',
        error: error.message,
        sentAt: Timestamp.now(),
      });
    } catch {
      // Logging should never hide the original error response.
    }

    const statusCode = error.statusCode
      || (String(error.code || '').startsWith('auth/') ? 401 : 0)
      || (error.message.toLowerCase().includes('token') ? 401 : 500);
    return res.status(statusCode).json({
      error: statusCode === 401 ? 'Unauthorized' : error.message,
    });
  }
}
