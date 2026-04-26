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

function isMsg91ApiSecurityError(result) {
  return String(result?.apiError || '').trim() === '418';
}

function resolveMsg91ErrorMessage(result) {
  if (isMsg91ApiSecurityError(result)) {
    return 'MSG91 API security blocked the request. Whitelist the deployment egress IP in MSG91 Authkey settings or disable API Security for this auth key.';
  }

  const providerMessage = String(result?.errors || result?.message || '').trim();
  if (providerMessage) {
    return `MSG91 request failed: ${providerMessage}`;
  }

  return 'MSG91 request failed';
}

export async function sendViaMsg91(toNumber, message) {
  const {
    MSG91_AUTH_KEY,
    MSG91_INTEGRATED_NUMBER,
  } = requireEnv(['MSG91_AUTH_KEY', 'MSG91_INTEGRATED_NUMBER']);

  const fullPhone = normalizeIndianWhatsAppNumber(toNumber);

  const templateName = process.env.MSG91_TEMPLATE_NAME || "general_message";

  const payload = {
    integrated_number: MSG91_INTEGRATED_NUMBER,
    content_type: "template",
    payload: {
      messaging_product: "whatsapp",
      type: "template",
      template: {
        name: templateName,
        language: {
          code: "en"
        },
        components: [
          {
            type: "body",
            parameters: [
              {
                type: "text",
                text: message
              }
            ]
          }
        ]
      },
      to: fullPhone
    }
  };

  const url = 'https://api.msg91.com/api/v5/whatsapp/whatsapp-outbound-message/';

  const response = await fetch(
    url,
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        authkey: MSG91_AUTH_KEY,
      },
      body: JSON.stringify(payload),
    },
  );

  const result = await response.json();

  if (!response.ok) {
    const error = new Error(resolveMsg91ErrorMessage(result));
    error.statusCode = isMsg91ApiSecurityError(result) ? 502 : (response.status || 502);
    error.providerResponse = result;
    error.providerStatus = response.status || 502;
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
