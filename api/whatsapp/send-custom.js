import { Timestamp } from 'firebase-admin/firestore';
import { requireAdmin, verifyFirebaseRequest } from '../../server/auth.js';
import { handleCors } from '../../server/cors.js';
import { getAdminServices } from '../../server/firebaseAdmin.js';
import {
  DEFAULT_AUTOMATION_SETTINGS,
  getCompanyName,
  getMemberTaskContext,
  mergeAutomationSettings,
  renderTemplate,
  writeWhatsAppLog,
} from '../../server/whatsapp/automation.js';
import { handleConfigError, sendViaMsg91 } from '../../server/whatsapp/msg91.js';

const MAX_MESSAGE_LENGTH = 1000;

function sleep(milliseconds) {
  return new Promise((resolve) => setTimeout(resolve, milliseconds));
}

function resolveTemplate(templateKey, settings) {
  if (templateKey === 'morning') {
    return { messageType: 'morning', template: settings.morningTemplate || DEFAULT_AUTOMATION_SETTINGS.morningTemplate };
  }

  if (templateKey === 'evening') {
    return { messageType: 'evening', template: settings.eveningTemplate || DEFAULT_AUTOMATION_SETTINGS.eveningTemplate };
  }

  const error = new Error('Invalid template key');
  error.statusCode = 400;
  throw error;
}

function sanitizeRecipients(recipients) {
  if (!Array.isArray(recipients)) {
    return [];
  }

  return recipients
    .map((recipient) => ({
      uid: String(recipient?.uid || recipient?.id || '').trim(),
      name: String(recipient?.name || '').trim(),
      whatsapp: String(recipient?.whatsapp || '').trim(),
    }))
    .filter((recipient) => recipient.uid || recipient.name || recipient.whatsapp);
}

export default async function handler(req, res) {
  if (handleCors(req, res, 'POST, OPTIONS')) {
    return;
  }

  if (req.method !== 'POST') {
    return res.status(405).json({
      error: `Method ${req.method} not allowed. Use POST.`,
    });
  }

  try {
    const authContext = await verifyFirebaseRequest(req);
    requireAdmin(authContext);

    const { db } = getAdminServices();
    const {
      recipients,
      message,
      type = 'custom',
      templateKey = '',
    } = req.body || {};

    const sanitizedRecipients = sanitizeRecipients(recipients);
    const trimmedMessage = String(message || '').trim();
    const normalizedTemplateKey = String(templateKey || '').trim().toLowerCase();

    if (!sanitizedRecipients.length) {
      return res.status(400).json({ error: 'At least one recipient is required' });
    }

    if (!trimmedMessage && !normalizedTemplateKey) {
      return res.status(400).json({ error: 'message or templateKey is required' });
    }

    if (trimmedMessage.length > MAX_MESSAGE_LENGTH) {
      return res.status(400).json({ error: `message must be ${MAX_MESSAGE_LENGTH} characters or fewer` });
    }

    const [settingsDoc, companyDoc] = await Promise.all([
      db.doc('settings/whatsapp_automation').get(),
      db.doc('settings/company').get(),
    ]);
    const settings = mergeAutomationSettings(settingsDoc.exists ? settingsDoc.data() : {});
    const companyName = getCompanyName(companyDoc);
    const templateConfig = normalizedTemplateKey ? resolveTemplate(normalizedTemplateKey, settings) : null;

    const results = [];

    for (const recipient of sanitizedRecipients) {
      let finalMessage = trimmedMessage;
      let messageType = type;

      try {
        if (templateConfig) {
          const templateVariables = await getMemberTaskContext(
            db,
            recipient.uid,
            recipient,
            companyName,
          );
          finalMessage = renderTemplate(templateConfig.template, templateVariables).trim();
          messageType = templateConfig.messageType;
        }

        if (!finalMessage) {
          throw new Error('Message is empty after rendering');
        }

        if (finalMessage.length > MAX_MESSAGE_LENGTH) {
          throw new Error(`Rendered message exceeds ${MAX_MESSAGE_LENGTH} characters`);
        }

        const sendResult = await sendViaMsg91(recipient.whatsapp, finalMessage);
        const status = sendResult.sent ? 'sent' : 'failed';

        await writeWhatsAppLog(db, {
          to: sendResult.to,
          memberName: recipient.name || 'Unknown',
          memberUid: recipient.uid || '',
          messageType,
          message: finalMessage,
          status,
          msg91Response: sendResult.result,
          requestedBy: authContext.decodedToken.uid,
          sentAt: Timestamp.now(),
        });

        results.push({
          memberName: recipient.name || 'Unknown',
          phone: sendResult.to,
          status,
          message: finalMessage,
          msg91Response: sendResult.result,
        });
      } catch (error) {
        const safeMessage = finalMessage || trimmedMessage;
        const providerResponse = error.providerResponse || null;

        try {
          await writeWhatsAppLog(db, {
            to: recipient.whatsapp || '',
            memberName: recipient.name || 'Unknown',
            memberUid: recipient.uid || '',
            messageType: templateConfig?.messageType || type,
            message: safeMessage,
            status: 'failed',
            msg91Response: providerResponse || { error: error.message },
            error: error.message,
            requestedBy: authContext.decodedToken.uid,
            sentAt: Timestamp.now(),
          });
        } catch {
          // Preserve the original failure result even if log persistence also fails.
        }

        results.push({
          memberName: recipient.name || 'Unknown',
          phone: recipient.whatsapp || '',
          status: 'failed',
          error: error.message,
          message: safeMessage,
          msg91Response: providerResponse || null,
        });
      }

      await sleep(250);
    }

    const summary = {
      sent: results.filter((result) => result.status === 'sent').length,
      failed: results.filter((result) => result.status === 'failed').length,
      total: results.length,
    };

    return res.status(200).json({ success: true, summary, results });
  } catch (error) {
    console.error('send-custom failed:', error.message);

    if (handleConfigError(res, error)) {
      return;
    }

    const statusCode = error.statusCode
      || (String(error.code || '').startsWith('auth/') ? 401 : 0)
      || 500;

    return res.status(statusCode).json({
      error: statusCode === 401 ? 'Unauthorized' : error.message,
    });
  }
}
