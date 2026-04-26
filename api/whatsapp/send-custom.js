import { Timestamp } from 'firebase-admin/firestore';
import { requireAdmin, verifyFirebaseRequest } from '../../server/auth.js';
import { handleCors } from '../../server/cors.js';
import { getAdminServices } from '../../server/firebaseAdmin.js';
import { handleConfigError } from '../../server/config.js';
import { sendGeneralMessage } from '../../server/whatsapp/msg91.js';

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function sanitizeRecipients(recipients) {
  if (!Array.isArray(recipients)) return [];
  return recipients
    .map((r) => ({
      uid: String(r?.uid || r?.id || '').trim(),
      name: String(r?.name || '').trim(),
      whatsapp: String(r?.whatsapp || '').trim(),
    }))
    .filter((r) => r.uid || r.name || r.whatsapp);
}

export default async function handler(req, res) {
  if (handleCors(req, res, 'POST, OPTIONS')) return;

  if (req.method !== 'POST') {
    return res.status(405).json({ error: `Method ${req.method} not allowed. Use POST.` });
  }

  try {
    const authContext = await verifyFirebaseRequest(req);
    requireAdmin(authContext);

    const { db } = getAdminServices();
    const { recipients, message, type = 'custom' } = req.body || {};

    const sanitizedRecipients = sanitizeRecipients(recipients);
    const trimmedMessage = String(message || '').trim();

    if (!sanitizedRecipients.length) {
      return res.status(400).json({ error: 'At least one recipient is required' });
    }

    if (!trimmedMessage) {
      return res.status(400).json({ error: 'message is required' });
    }

    if (trimmedMessage.length > 1000) {
      return res.status(400).json({ error: 'message must be 1000 characters or fewer' });
    }

    const results = [];

    for (const recipient of sanitizedRecipients) {
      if (!recipient.whatsapp) {
        results.push({
          memberName: recipient.name || 'Unknown',
          phone: '',
          status: 'failed',
          error: 'No WhatsApp number',
        });
        continue;
      }

      try {
        const sendResult = await sendGeneralMessage(
          recipient.whatsapp,
          recipient.name || 'Team Member',
          trimmedMessage,
        );

        const status = sendResult.sent ? 'sent' : 'failed';

        await db.collection('whatsapp_logs').add({
          to: sendResult.to,
          memberName: recipient.name || 'Unknown',
          memberUid: recipient.uid || '',
          messageType: type,
          message: trimmedMessage,
          status,
          template: 'general_message',
          msg91Response: sendResult.result,
          requestedBy: authContext.decodedToken.uid,
          sentAt: Timestamp.now(),
        });

        results.push({
          memberName: recipient.name || 'Unknown',
          phone: sendResult.to,
          status,
          msg91Response: sendResult.result,
        });
      } catch (error) {
        const providerResponse = error.providerResponse || null;

        try {
          await db.collection('whatsapp_logs').add({
            to: recipient.whatsapp || '',
            memberName: recipient.name || 'Unknown',
            memberUid: recipient.uid || '',
            messageType: type,
            message: trimmedMessage,
            status: 'failed',
            template: 'general_message',
            msg91Response: providerResponse || { error: error.message },
            error: error.message,
            requestedBy: authContext.decodedToken.uid,
            sentAt: Timestamp.now(),
          });
        } catch {
          // Never let log write hide the send result.
        }

        results.push({
          memberName: recipient.name || 'Unknown',
          phone: recipient.whatsapp || '',
          status: 'failed',
          error: error.message,
          msg91Response: providerResponse || null,
        });
      }

      await sleep(500);
    }

    const summary = {
      sent: results.filter((r) => r.status === 'sent').length,
      failed: results.filter((r) => r.status === 'failed').length,
      total: results.length,
    };

    return res.status(200).json({ success: true, summary, results });

  } catch (error) {
    console.error('send-custom failed:', error.message);

    if (handleConfigError(res, error)) return;

    const statusCode =
      error.statusCode ||
      (String(error.code || '').startsWith('auth/') ? 401 : 0) ||
      500;

    return res.status(statusCode).json({
      error: statusCode === 401 ? 'Unauthorized' : error.message,
    });
  }
}
