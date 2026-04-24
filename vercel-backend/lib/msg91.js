const axios = require('axios');
const { getFirebaseAdmin } = require('./firebaseAdmin');

function formatMSG91Number(phone) {
  if (!phone) return null;
  let cleaned = phone.replace(/\\D/g, '');
  if (cleaned.length === 10) cleaned = '91' + cleaned;
  return cleaned;
}

async function sendMSG91WhatsApp({ to, templateName, components }) {
  const { db, FieldValue } = getFirebaseAdmin();
  const authKey = process.env.MSG91_AUTH_KEY || '';
  const integratedNumber = process.env.MSG91_INTEGRATED_NUMBER || '';

  const formattedTo = formatMSG91Number(to);
  if (!formattedTo) return { success: false, error: 'Invalid phone number' };

  if (!authKey || !integratedNumber) {
    console.warn('[sendMSG91WhatsApp] API credentials missing.');
    return { success: false, error: 'Missing MSG91 credentials' };
  }

  const payload = {
    "integrated-number": integratedNumber,
    "content_type": "template",
    "payload": {
      "to": formattedTo,
      "type": "template",
      "template": {
        "name": templateName,
        "language": { "code": "en", "policy": "deterministic" },
        "components": components || []
      }
    }
  };

  try {
    const response = await axios.post(
      'https://api.msg91.com/api/v5/whatsapp/whatsapp-outbound-message/',
      payload,
      { headers: { 'authkey': authKey, 'Content-Type': 'application/json' } }
    );
    
    // Log success
    await db.collection('whatsapp_logs').add({
      to: formattedTo,
      payload,
      status: 'sent',
      response: response.data,
      sentAt: FieldValue.serverTimestamp(),
    });
    
    return { success: true, response: response.data };
  } catch (error) {
    const errorMsg = error.response ? JSON.stringify(error.response.data) : error.message;
    console.error('[sendMSG91WhatsApp] Failed:', errorMsg);
    
    // Log failure
    await db.collection('whatsapp_logs').add({
      to: formattedTo,
      payload,
      status: 'failed',
      error: errorMsg,
      sentAt: FieldValue.serverTimestamp(),
    });
    
    return { success: false, error: errorMsg };
  }
}

module.exports = { sendMSG91WhatsApp };
