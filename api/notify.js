import { draftMessage } from './ai/draft-whatsapp.js';
import { sendViaMsg91 } from './whatsapp/send-text.js';
import { initializeApp, cert, getApps } from 'firebase-admin/app';
import { getFirestore, Timestamp } from 'firebase-admin/firestore';

let db;
const initDb = () => {
  if (!db) {
    if (getApps().length === 0) {
      initializeApp({
        credential: cert({
          projectId: process.env.FIREBASE_PROJECT_ID,
          clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
          privateKey: process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n')
        })
      });
    }
    db = getFirestore();
  }
  return db;
};

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).end();

  const { eventType, context } = req.body || {};

  if (!eventType || !context) {
    return res.status(400).json({ error: 'Missing eventType or context' });
  }

  const firestore = initDb();

  try {
    const message = await draftMessage(eventType, context);

    const toNumber = context.whatsappNumber;
    if (!toNumber || toNumber.trim() === '') {
      return res.status(400).json({
        error: 'No WhatsApp number provided',
        hint: 'Check that member.whatsapp field exists in Firestore /users collection'
      });
    }

    const sendResult = await sendViaMsg91(toNumber, message);
    const success = sendResult?.type === 'success' || sendResult?.message?.includes('success');

    await firestore.collection('whatsapp_logs').add({
      eventType,
      toNumber,
      message,
      context,
      status: success ? 'sent' : 'failed',
      response: sendResult,
      sentAt: Timestamp.now()
    });

    if (context.memberUid) {
      await firestore
        .collection('notifications')
        .doc(context.memberUid)
        .collection('items')
        .add({
          title: getTitle(eventType),
          body: message.split('\n')[1] || message.substring(0, 60),
          type: eventType,
          read: false,
          createdAt: Timestamp.now()
        });
    }

    return res.status(200).json({ success: true, message, sent: success });

  } catch (error) {
    console.error('[notify]', error.message);

    try {
      await firestore.collection('whatsapp_logs').add({
        eventType,
        context,
        status: 'failed',
        error: error.message,
        sentAt: Timestamp.now()
      });
    } catch (_) {}

    return res.status(500).json({ error: error.message });
  }
}

const getTitle = (eventType) => {
  const titles = {
    task_assigned:     'New Task Assigned',
    task_completed:    'Task Completed',
    task_overdue:      'Task Overdue',
    salary_paid:       'Salary Credited',
    enquiry_assigned:  'New Enquiry',
    followup_due:      'Follow-up Due',
    payment_due:       'Payment Reminder',
    rgp_overdue:       'RGP Reminder',
    tool_not_returned: 'Tool Return'
  };
  return titles[eventType] || 'Notification';
};
