export const sendViaMsg91 = async (toNumber, message) => {
  console.log('=== MSG91 SEND CALLED ===');
  console.log('Raw number input:', toNumber);

  // Clean number format
  const phone = toNumber
    .replace(/\D/g, '')   // remove non-digits
    .replace(/^0/, '')    // remove leading 0
    .replace(/^91/, '');  // remove 91 prefix if present
  const fullPhone = `91${phone}`;

  console.log('Cleaned number:', fullPhone);
  console.log('Message length:', message?.length);
  console.log('MSG91_AUTH_KEY exists:', !!process.env.MSG91_AUTH_KEY);
  console.log('MSG91_INTEGRATED_NUMBER:', process.env.MSG91_INTEGRATED_NUMBER);

  const payload = {
    integrated_number: process.env.MSG91_INTEGRATED_NUMBER,
    content_type: 'text',
    payload: {
      messaging_product: 'whatsapp',
      type: 'text',
      to: fullPhone,
      text: {
        body: message
      }
    }
  };

  console.log('MSG91 full payload:', JSON.stringify(payload, null, 2));

  const response = await fetch(
    'https://api.msg91.com/api/v5/whatsapp/whatsapp-outbound-message/bulk/',
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authkey': process.env.MSG91_AUTH_KEY
      },
      body: JSON.stringify(payload)
    }
  );

  console.log('MSG91 HTTP status:', response.status);
  const result = await response.json();
  console.log('MSG91 response body:', JSON.stringify(result, null, 2));

  return result;
};

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).end();
  const { toNumber, message } = req.body;
  try {
    const result = await sendViaMsg91(toNumber, message);
    return res.status(200).json({ success: true, result });
  } catch (error) {
    console.error('send-text error:', error.message);
    return res.status(500).json({ error: error.message });
  }
}
