import { handleConfigError, requireEnv } from '../../server/config.js';
import { handlePreflight, setCorsHeaders } from '../../server/cors.js';
import { requireAdmin, verifyFirebaseRequest } from '../../server/auth.js';

export const sendViaMsg91 = async (toNumber, message) => {
  const {
    MSG91_AUTH_KEY,
    MSG91_INTEGRATED_NUMBER,
  } = requireEnv(['MSG91_AUTH_KEY', 'MSG91_INTEGRATED_NUMBER']);

  const phone = toNumber
    .replace(/\D/g, '')
    .replace(/^0/, '')
    .replace(/^91/, '');
  const fullPhone = `91${phone}`;

  const payload = {
    integrated_number: MSG91_INTEGRATED_NUMBER,
    content_type: 'text',
    payload: {
      messaging_product: 'whatsapp',
      type: 'text',
      to: fullPhone,
      text: { body: message }
    }
  };

  const response = await fetch(
    'https://api.msg91.com/api/v5/whatsapp/whatsapp-outbound-message/bulk/',
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authkey: MSG91_AUTH_KEY
      },
      body: JSON.stringify(payload)
    }
  );

  const result = await response.json();

  return result;
};

export default async function handler(req, res) {
  setCorsHeaders(req, res);

  if (handlePreflight(req, res)) {
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
    return res.status(200).json({ success: true, result });
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
