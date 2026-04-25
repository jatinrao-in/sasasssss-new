import { handleConfigError, requireEnv } from '../config.js';

export function normalizeIndianWhatsAppNumber(toNumber) {
  const digits = String(toNumber ?? '')
    .replace(/\D/g, '')
    .replace(/^0+/, '')
    .replace(/^91/, '');

  if (digits.length !== 10) {
    const error = new Error('WhatsApp number must contain 10 digits');
    error.statusCode = 400;
    throw error;
  }

  return `91${digits}`;
}

export function isMsg91Success(result) {
  const type = String(result?.type || '').toLowerCase();
  const message = String(result?.message || '').toLowerCase();
  return type === 'success' || message.includes('success');
}

export async function sendViaMsg91(toNumber, message) {
  const {
    MSG91_AUTH_KEY,
    MSG91_INTEGRATED_NUMBER,
  } = requireEnv(['MSG91_AUTH_KEY', 'MSG91_INTEGRATED_NUMBER']);

  const fullPhone = normalizeIndianWhatsAppNumber(toNumber);

  const payload = {
    integrated_number: MSG91_INTEGRATED_NUMBER,
    content_type: 'text',
    payload: {
      messaging_product: 'whatsapp',
      type: 'text',
      to: fullPhone,
      text: { body: message },
    },
  };

  const response = await fetch(
    'https://api.msg91.com/api/v5/whatsapp/whatsapp-outbound-message/bulk/',
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authkey: MSG91_AUTH_KEY,
      },
      body: JSON.stringify(payload),
    },
  );

  const result = await response.json();

  if (!response.ok) {
    const error = new Error(result?.message || 'MSG91 request failed');
    error.statusCode = response.status || 502;
    error.providerResponse = result;
    throw error;
  }

  return {
    ...result,
    to: fullPhone,
    payload,
    result,
    sent: isMsg91Success(result),
  };
}

export { handleConfigError };
