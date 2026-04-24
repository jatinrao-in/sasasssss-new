const API_BASE = import.meta.env.VITE_API_BASE_URL || '';

// Send WhatsApp
export const sendWhatsApp = async (to, templateId, variables) => {
  const res = await fetch(`${API_BASE}/api/whatsapp/send`, {
    method: 'POST',
    headers: { 
      'Content-Type': 'application/json' 
    },
    body: JSON.stringify({ to, templateId, variables })
  });
  return res.json();
};

// Notify task assigned
export const notifyTaskAssigned = async (taskData) => {
  const res = await fetch(`${API_BASE}/api/whatsapp/task-notify`, {
    method: 'POST',
    headers: { 
      'Content-Type': 'application/json' 
    },
    body: JSON.stringify(taskData)
  });
  return res.json();
};

// Notify salary paid
export const notifySalaryPaid = async (salaryData) => {
  const res = await fetch(`${API_BASE}/api/whatsapp/salary-notify`, {
    method: 'POST',
    headers: { 
      'Content-Type': 'application/json' 
    },
    body: JSON.stringify(salaryData)
  });
  return res.json();
};

// AI: Suggest task assignment
export const suggestTaskAssignment = async (taskDescription, teamMembers) => {
  const res = await fetch(`${API_BASE}/api/ai/suggest-task`, {
    method: 'POST',
    headers: { 
      'Content-Type': 'application/json' 
    },
    body: JSON.stringify({ taskDescription, teamMembers })
  });
  return res.json();
};

// AI: Suggest deadline
export const suggestDeadline = async (taskDescription, projectName) => {
  const res = await fetch(`${API_BASE}/api/ai/suggest-deadline`, {
    method: 'POST',
    headers: { 
      'Content-Type': 'application/json' 
    },
    body: JSON.stringify({ taskDescription, projectName })
  });
  return res.json();
};

// AI: Draft WhatsApp message
export const draftWhatsAppMessage = async (context) => {
  const res = await fetch(`${API_BASE}/api/ai/draft-message`, {
    method: 'POST',
    headers: { 
      'Content-Type': 'application/json' 
    },
    body: JSON.stringify(context)
  });
  return res.json();
};
