export const sendViaMsg91 = async (toNumber, message) => {
  const phone = toNumber
    .replace(/\D/g, '')
    .replace(/^0/, '')
    .replace(/^91/, '');
  const fullPhone = `91${phone}`;

  const payload = {
    integrated_number: process.env.MSG91_INTEGRATED_NUMBER,
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
        'Authkey': process.env.MSG91_AUTH_KEY
      },
      body: JSON.stringify(payload)
    }
  );

  const result = await response.json();

  if (!response.ok) {
    console.error('[MSG91] Error:', JSON.stringify(result));
  }

  return result;
};

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).end();
  const { toNumber, message } = req.body;
  try {
    const result = await sendViaMsg91(toNumber, message);
    return res.status(200).json({ success: true, result });
  } catch (error) {
    console.error('[send-text]', error.message);
    return res.status(500).json({ error: error.message });
  }
}
