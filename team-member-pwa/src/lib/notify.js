const API = import.meta.env.VITE_BACKEND_URL || import.meta.env.VITE_API_BASE_URL || '';

export const notify = async (eventType, context) => {
  try {
    await fetch(`${API}/api/notify`, {
      method: 'POST',
      headers: { 
        'Content-Type': 'application/json' 
      },
      body: JSON.stringify({ eventType, context })
    });
    // Silent — don't block UI
  } catch (error) {
    console.error('Notify failed:', error);
    // Never show error to user
    // Notification is background task
  }
};
