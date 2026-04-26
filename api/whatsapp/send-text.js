import { handleCors } from '../../server/cors.js';
import { requireAdmin, verifyFirebaseRequest } from '../../server/auth.js';
import { handleConfigError, sendViaMsg91 } from '../../server/whatsapp/msg91.js';

export { sendViaMsg91 } from '../../server/whatsapp/msg91.js';

export default async function handler(req, res) {
  if (handleCors(req, res)) {
    return;
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const authContext = await verifyFirebaseRequest(req);
    requireAdmin(authContext);

    const { toNumber, message } = req.body || {};
    if (!toNumber || !message) {
      return res.status(400).json({ error: 'toNumber and message are required' });
    }

    const result = await sendViaMsg91(toNumber, message);
    return res.status(200).json({ success: true, result: result.result, to: result.to, sent: result.sent });
  } catch (error) {
    console.error('Critical:', error.message);

    if (handleConfigError(res, error)) {
      return;
    }

    const statusCode = error.statusCode
      || (String(error.code || '').startsWith('auth/') ? 401 : 0)
      || 500;

    return res.status(statusCode).json({ error: statusCode === 401 ? 'Unauthorized' : error.message });
  }
}
