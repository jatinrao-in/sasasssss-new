// Test endpoint — diagnose MSG91 WhatsApp integration
// Works in both development and production for debugging
// REMOVE THIS FILE after WhatsApp is confirmed working

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');

  const testNumber = req.query.number || '';
  if (!testNumber) {
    return res.status(400).json({
      error: 'Provide phone number in query: /api/test-whatsapp?number=9876543210'
    });
  }

  // Clean number
  const phone = testNumber.replace(/\D/g, '').replace(/^0/, '').replace(/^91/, '');
  const fullPhone = `91${phone}`;

  const envCheck = {
    hasAuthKey: !!process.env.MSG91_AUTH_KEY,
    authKeyPreview: process.env.MSG91_AUTH_KEY
      ? process.env.MSG91_AUTH_KEY.substring(0, 6) + '...'
      : 'MISSING',
    hasIntegratedNumber: !!process.env.MSG91_INTEGRATED_NUMBER,
    integratedNumber: process.env.MSG91_INTEGRATED_NUMBER || 'MISSING',
    hasGeminiKey: !!process.env.GEMINI_API_KEY,
    hasFirebaseProject: !!process.env.FIREBASE_PROJECT_ID,
    firebaseProject: process.env.FIREBASE_PROJECT_ID || 'MISSING',
  };

  console.log('=== TEST WHATSAPP CALLED ===');
  console.log('Test number:', fullPhone);
  console.log('ENV:', envCheck);

  try {
    const testMessage =
      `Hello! This is a test message from your app.\n` +
      `If you received this, WhatsApp integration is working correctly!\n` +
      `Sent at: ${new Date().toLocaleString('en-IN')}`;

    const payload = {
      integrated_number: process.env.MSG91_INTEGRATED_NUMBER,
      content_type: 'text',
      payload: {
        messaging_product: 'whatsapp',
        type: 'text',
        to: fullPhone,
        text: { body: testMessage }
      }
    };

    console.log('Payload:', JSON.stringify(payload, null, 2));

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

    const httpStatus = response.status;
    const result = await response.json();

    console.log('MSG91 HTTP status:', httpStatus);
    console.log('MSG91 response:', JSON.stringify(result));

    return res.status(200).json({
      testSentTo: fullPhone,
      msg91HttpStatus: httpStatus,
      msg91Response: result,
      envCheck,
      messageSent: testMessage,
      diagnosis: getDiagnosis(httpStatus, result, envCheck)
    });

  } catch (error) {
    console.error('Test error:', error.message);
    return res.status(500).json({
      error: error.message,
      envCheck,
      diagnosis: 'Fetch call to MSG91 failed. Check network or MSG91 API URL.'
    });
  }
}

function getDiagnosis(status, result, env) {
  if (!env.hasAuthKey) return '❌ MSG91_AUTH_KEY is missing in environment variables';
  if (!env.hasIntegratedNumber) return '❌ MSG91_INTEGRATED_NUMBER is missing in environment variables';
  if (status === 401) return '❌ MSG91 returned 401 — Auth key is invalid. Check msg91.com dashboard';
  if (status === 400) return '❌ MSG91 returned 400 — Bad request. Check payload format or integrated number';
  if (result?.type === 'success' || result?.message?.includes('success')) {
    return '✅ MSG91 accepted the message. If not received, check: (1) number is on WhatsApp, (2) MSG91 account has credits';
  }
  if (result?.message?.includes('template')) {
    return '⚠️ MSG91 requires template approval for this number. Use a pre-approved template or switch to session messaging.';
  }
  return `⚠️ Unexpected response from MSG91: ${JSON.stringify(result)}`;
}
