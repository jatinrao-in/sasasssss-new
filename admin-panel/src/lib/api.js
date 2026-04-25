import { securePost } from './secureApi';

const API_BASE = (
  import.meta.env.VITE_API_BASE_URL ||
  import.meta.env.VITE_BACKEND_URL ||
  ''
).trim();

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
