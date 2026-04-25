import { securePost } from './secureApi';

export const sendWhatsApp = async (to, templateId, variables) => (
  securePost('/api/whatsapp/send', { to, templateId, variables })
);

export const notifyTaskAssigned = async (taskData) => (
  securePost('/api/whatsapp/task-notify', taskData)
);

export const notifySalaryPaid = async (salaryData) => (
  securePost('/api/whatsapp/salary-notify', salaryData)
);

export const suggestTaskAssignment = async (taskDescription, teamMembers) => (
  securePost('/api/ai/suggest-task', { taskDescription, teamMembers })
);

export const suggestDeadline = async (taskDescription, projectName) => (
  securePost('/api/ai/suggest-deadline', { taskDescription, projectName })
);

export const draftWhatsAppMessage = async (context) => (
  securePost('/api/ai/draft-message', context)
);
