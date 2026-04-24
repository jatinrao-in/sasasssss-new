const API = import.meta.env.VITE_BACKEND_URL || import.meta.env.VITE_API_BASE_URL || '';

export const notify = async (eventType, context) => {
  console.log('=== NOTIFY CALLED ===');
  console.log('Event type:', eventType);
  console.log('Context:', JSON.stringify(context));
  console.log('API base URL:', API || '(empty — will use relative path)');
  console.log('Member WhatsApp:', context?.whatsappNumber || '⚠️ MISSING!');

  if (!context?.whatsappNumber) {
    console.error('❌ NO WHATSAPP NUMBER in context! Notification will fail.');
    console.error('Check that member.whatsapp field exists in Firestore /users/' + context?.memberUid);
  }

  try {
    const url = `${API}/api/notify`;
    console.log('Calling:', url);

    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ eventType, context })
    });

    console.log('Notify API HTTP status:', response.status);
    const result = await response.json().catch(() => ({}));
    console.log('Notify API result:', JSON.stringify(result));

    if (!response.ok || !result.success) {
      console.error('❌ Notify failed:', result);
    } else {
      console.log('✅ Notify success — WhatsApp sent:', result.sent);
    }

  } catch (error) {
    console.error('❌ Notify fetch error:', error.message);
    console.error('Possible cause: VITE_API_BASE_URL not set, or API server not running');
  }
};
