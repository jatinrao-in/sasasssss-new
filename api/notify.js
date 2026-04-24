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
  // CORS headers for local dev
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(200).end();

  if (req.method !== 'POST') return res.status(405).end();

  console.log('=== NOTIFY API CALLED ===');
  console.log('Event type:', req.body?.eventType);
  console.log('Context:', JSON.stringify(req.body?.context));

  // ENV check
  console.log('ENV CHECK:');
  console.log('GEMINI_API_KEY exists:', !!process.env.GEMINI_API_KEY);
  console.log('MSG91_AUTH_KEY exists:', !!process.env.MSG91_AUTH_KEY);
  console.log('MSG91_INTEGRATED_NUMBER:', process.env.MSG91_INTEGRATED_NUMBER);
  console.log('FIREBASE_PROJECT_ID:', process.env.FIREBASE_PROJECT_ID);

  const { eventType, context } = req.body || {};

  if (!eventType || !context) {
    console.error('Missing eventType or context in request body');
    return res.status(400).json({ error: 'Missing eventType or context' });
  }

  const firestore = initDb();

  try {
    // 1. Draft message via Gemini AI
    console.log('Drafting message for event:', eventType);
    const message = await draftMessage(eventType, context);
    console.log('Message drafted successfully:', message);

    // 2. Validate WhatsApp number
    const toNumber = context.whatsappNumber;
    console.log('WhatsApp number from context:', toNumber);

    if (!toNumber || toNumber.trim() === '') {
      console.error('NO WHATSAPP NUMBER PROVIDED in context!');
      return res.status(400).json({
        error: 'No WhatsApp number provided in context',
        hint: 'Check that member.whatsapp field exists in Firestore /users collection'
      });
    }

    // 3. Send via MSG91
    console.log('Sending via MSG91 to:', toNumber);
    const sendResult = await sendViaMsg91(toNumber, message);
    console.log('MSG91 result:', JSON.stringify(sendResult));

    const success = sendResult?.type === 'success' || sendResult?.message === 'Message sent successfully';

    // 4. Log to Firestore
    await firestore.collection('whatsapp_logs').add({
      eventType,
      toNumber,
      message,
      context,
      status: success ? 'sent' : 'failed',
      response: sendResult,
      sentAt: Timestamp.now()
    });

    // 5. Save in-app notification
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

    return res.status(200).json({
      success: true,
      message,
      sent: success,
      msg91Result: sendResult
    });

  } catch (error) {
    console.error('NOTIFY ERROR:', error.message);
    console.error('Stack:', error.stack);

    try {
      await firestore.collection('whatsapp_logs').add({
        eventType,
        context,
        status: 'failed',
        error: error.message,
        sentAt: Timestamp.now()
      });
    } catch (logErr) {
      console.error('Failed to log error to Firestore:', logErr.message);
    }

    return res.status(500).json({
      error: error.message,
      stack: error.stack
    });
  }
}

const getTitle = (eventType) => {
  const titles = {
    task_assigned: '📋 New Task Assigned',
    task_completed: '✅ Task Completed',
    task_overdue: '⚠️ Task Overdue',
    salary_paid: '💰 Salary Credited',
    enquiry_assigned: '📩 New Enquiry',
    followup_due: '🔔 Follow-up Due',
    payment_due: '💳 Payment Reminder',
    rgp_overdue: '📦 RGP Reminder',
    tool_not_returned: '🔧 Tool Return'
  };
  return titles[eventType] || 'Notification';
};
