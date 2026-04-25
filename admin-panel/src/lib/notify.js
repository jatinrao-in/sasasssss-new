import { securePost } from './secureApi';

export const notify = async (eventType, context) => {
  try {
    await securePost('/api/notify', { eventType, context });
  } catch (error) {
    console.warn('Notify failed:', error);
  }
};
