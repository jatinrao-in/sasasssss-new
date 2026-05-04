import { handleCors } from '../server/cors.js';
import { requireAdmin, verifyFirebaseRequest } from '../server/auth.js';
import { sendViaMsg91, handleConfigError } from '../server/whatsapp/msg91.js';

export default async function handler(req, res) {
  if (handleCors(req, res)) return;
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const action = req.query.action || req.body?.action;

  try {
    const authContext = await verifyFirebaseRequest(req);
    requireAdmin(authContext);

    // Common for send-text and send-custom
    const { toNumber, message, recipients } = req.body || {};

    if (action === 'send-text') {
      if (!toNumber || !message) return res.status(400).json({ error: 'toNumber and message are required' });
      const result = await sendViaMsg91(toNumber, message);
      return res.status(200).json({ success: true, result: result.result, to: result.to, sent: result.sent });
    }

    if (action === 'send-custom') {
      if (!recipients || !message) return res.status(400).json({ error: 'recipients and message are required' });
      // Logic for batch send can be added here or in msg91.js
      // For now, assume it's implemented in server/whatsapp/msg91.js
      const result = await sendViaMsg91(recipients[0], message); // Simple placeholder
      return res.status(200).json({ success: true, result });
    }

    return res.status(400).json({ error: `Unknown action: ${action}` });

  } catch (error) {
    console.error('WhatsApp API Error:', error.message);
    if (handleConfigError(res, error)) return;
    const statusCode = error.statusCode || 500;
    return res.status(statusCode).json({ error: error.message });
  }
}
