import { securePost } from './secureApi';

function normalizeApiBaseUrl(value) {
  const trimmed = String(value || '').trim();
  const sanitized = trimmed.replace(/\\r\\n|\\n|\\r/g, '');

  if (!sanitized) {
    return '';
  }

  try {
    const url = new URL(sanitized);
    const normalizedPath = url.pathname
      .replace(/\/+$/, '')
      .replace(/\/r$/, '');

    return `${url.origin}${normalizedPath}`.replace(/\/$/, '');
  } catch {
    return sanitized
      .replace(/\/+$/, '')
      .replace(/\/r$/, '');
  }
}

const API_BASE = normalizeApiBaseUrl(
  import.meta.env.VITE_API_BASE_URL ||
  import.meta.env.VITE_BACKEND_URL ||
  '',
);

export const suggestTaskAssignment = async (taskDescription, teamMembers) => (
  securePost('/api/ai/suggest-task', { taskDescription, teamMembers })
);

export const suggestDeadline = async (taskDescription, projectId) => (
  securePost('/api/ai/suggest-deadline', { taskDescription, projectId })
);

export const draftWhatsAppMessage = async (context) => (
  securePost('/api/ai/draft-whatsapp', context)
);

export const getDashboardInsights = async (data) => (
  securePost('/api/ai/business-summary', { data })
);

export { API_BASE };
