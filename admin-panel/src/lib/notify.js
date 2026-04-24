const API = import.meta.env.VITE_BACKEND_URL || import.meta.env.VITE_API_BASE_URL || '';

export const notify = async (eventType, context) => {
  try {
    await fetch(`${API}/api/notify`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ eventType, context })
    });
    // Silent fire-and-forget — never block the UI
  } catch (error) {
    // Silently fail — notification is non-critical
  }
};
