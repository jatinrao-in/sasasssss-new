export default async function handler(req, res) {
  
  // Log env vars
  console.log('AUTH KEY:', 
    process.env.MSG91_AUTH_KEY);
  console.log('INTEGRATED NUMBER:', 
    process.env.MSG91_INTEGRATED_NUMBER);
  
  const payload = {
    integrated_number: 
      process.env.MSG91_INTEGRATED_NUMBER,
    content_type: "text",
    payload: {
      messaging_product: "whatsapp",
      type: "text",
      to: "919499473347",
      text: {
        body: "Welcome to Saya Industrial! We are glad to have you on board. - Team Saya Industrial"
      }
    }
  };

  console.log('Sending payload:', 
    JSON.stringify(payload));

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
  console.log('MSG91 Response:', 
    JSON.stringify(result));

  return res.status(200).json({
    success: true,
    payload_sent: payload,
    msg91_response: result
  });
}
