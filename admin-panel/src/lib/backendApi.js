/**
 * Backend API — thin wrapper around the Vercel serverless backend.
 * Replaces all Firebase httpsCallable() calls.
 *
 * Set VITE_BACKEND_URL in your .env.local to your Vercel deployment URL.
 * Example: VITE_BACKEND_URL=https://saya-vercel-backend.vercel.app
 */

const BASE_URL = import.meta.env.VITE_BACKEND_URL || '';
const API_SECRET = import.meta.env.VITE_BACKEND_API_SECRET || '';

async function post(path, body) {
  const url = `${BASE_URL}${path}`;
  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${API_SECRET}`,
    },
    body: JSON.stringify(body),
  });

  const data = await response.json();

  if (!response.ok) {
    throw new Error(data.error || `Request failed with status ${response.status}`);
  }

  return data;
}

// ── Team Member ───────────────────────────────────────────────────────────────

/**
 * Create a new team member (Firebase Auth + Firestore profile).
 * Replaces: httpsCallable(functions, 'createTeamMember')
 */
export async function createTeamMember(memberData) {
  return post('/api/create-member', memberData);
}

// ── WhatsApp ─────────────────────────────────────────────────────────────────

/**
 * Send a WhatsApp message via MSG91.
 * Replaces: httpsCallable(functions, 'triggerWhatsAppNotification')
 */
export async function sendWhatsAppMessage({ to, templateName, components }) {
  return post('/api/send-whatsapp', { to, templateName, components });
}

export default { createTeamMember, sendWhatsAppMessage };
