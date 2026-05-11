import { securePost } from './secureApi';

export const notify = async (eventType, context) => {
  if (!eventType || typeof context !== 'object' || context === null) {
    (function(){})('Skip: invalid notification payload');
    return;
  }

  if ('whatsappNumber' in context && !context.whatsappNumber) {
    (function(){})('Skip: no WhatsApp number');
    return;
  }

  try {
    await securePost('/api/notify', { eventType, context });
  } catch (error) {
    console.warn('Notify failed:', error);
  }
};
