// Utility API helpers (non-notification)
// All notification logic has been moved to /api/notify via src/lib/notify.js

const API_BASE = import.meta.env.VITE_BACKEND_URL || import.meta.env.VITE_API_BASE_URL || '';

export { API_BASE };
