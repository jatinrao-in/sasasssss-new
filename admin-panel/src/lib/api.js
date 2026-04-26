import { securePost } from './secureApi';

// WhatsApp functions
export const sendWhatsAppCustom = async (
  recipients, message, type = 'custom'
) => {
  return await securePost(
    '/api/whatsapp/send-custom',
    { recipients, message, type }
  );
};

export const sendTaskNotification = async (
  taskData
) => {
  return await securePost(
    '/api/notify',
    { 
      eventType: 'task_assigned',
      context: taskData 
    }
  );
};

export const sendSalaryNotification = async (
  salaryData
) => {
  return await securePost(
    '/api/notify',
    {
      eventType: 'salary_paid',
      context: salaryData
    }
  );
};

// All other notify calls
export const notify = async (
  eventType, context
) => {
  try {
    await securePost('/api/notify', {
      eventType,
      context
    });
  } catch (error) {
    // Silent fail — never block UI
    console.error('Notify failed:', 
      error.message);
  }
};

// Gemini AI functions
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
