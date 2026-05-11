import { auth } from './firebase';

const API = import.meta.env
  .VITE_API_BASE_URL ||
  'https://sasasssss.vercel.app';

const callNotify = async (
  eventType, context
) => {
  try {
    if (!auth.currentUser) return;
    const token = await auth.currentUser
      .getIdToken(true);

    const res = await fetch(
      `${API}/api/notify`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          eventType,
          context
        })
      }
    );

    const result = await res.json();
    console.log('Notify result:', result);
    return result;

  } catch (error) {
    // Silent fail - never block UI
    console.error('Notify failed:',
      error.message);
  }
};

// Format date helper
const fmt = (date) => {
  if (!date) return 'Not set';
  const d = date?.toDate?.()
    ? date.toDate()
    : new Date(date);
  return d.toLocaleDateString('en-IN', {
    day: '2-digit',
    month: 'short',
    year: 'numeric'
  });
};

// 1. Welcome message
export const notifyWelcome = (member) => {
  if (!member?.whatsapp?.trim()) return;
  callNotify('welcome', {
    whatsappNumber: member.whatsapp,
    memberName: member.name,
    email: member.email
  });
};

// 2. Task assigned
export const notifyTaskAssigned = (
  member, task, project
) => {
  if (!member?.whatsapp?.trim()) return;
  if (!task?.title) return;
  callNotify('task_assigned', {
    whatsappNumber: member.whatsapp,
    memberName: member.name,
    taskName: task.title,
    projectName: project?.name || 'Project',
    deadline: fmt(task.targetDate)
  });
};

// 3. Salary paid
export const notifySalaryPaid = (
  member, salary, month
) => {
  if (!member?.whatsapp?.trim()) return;
  if (!salary?.netSalary ||
    salary.netSalary <= 0) return;
  callNotify('salary_paid', {
    whatsappNumber: member.whatsapp,
    memberName: member.name,
    netSalary: String(
      Math.round(salary.netSalary)),
    month: month,
    paidDate: fmt(new Date())
  });
};

// 4. Tool assigned
export const notifyToolAssigned = (
  member, tool
) => {
  if (!member?.whatsapp?.trim()) return;
  callNotify('tool_assigned', {
    whatsappNumber: member.whatsapp,
    memberName: member.name,
    toolName: tool.toolName,
    issuedDate: fmt(new Date())
  });
};

// 5. RGP assigned
export const notifyRgpAssigned = (
  member, rgp
) => {
  if (!member?.whatsapp?.trim()) return;
  callNotify('rgp_assigned', {
    whatsappNumber: member.whatsapp,
    memberName: member.name,
    docNumber: rgp.docNumber || 'N/A',
    fromCompany: rgp.fromCompany || 'N/A',
    toCompany: rgp.toCompany || 'N/A'
  });
};

// 6. Payment assigned
export const notifyPaymentAssigned = (
  member, payment
) => {
  if (!member?.whatsapp?.trim()) return;
  callNotify('payment_assigned', {
    whatsappNumber: member.whatsapp,
    memberName: member.name,
    customerName:
      payment.customerName || 'Client',
    invoiceNo:
      payment.invoiceNumber || 'N/A',
    amount: String(
      payment.amount || 0)
  });
};

// 7. Enquiry assigned
export const notifyEnquiryAssigned = (
  member, enquiry
) => {
  if (!member?.whatsapp?.trim()) return;
  callNotify('task_assigned', {
    whatsappNumber: member.whatsapp,
    memberName: member.name,
    taskName: enquiry.taskType +
      ' - ' + (enquiry.companyName || ''),
    projectName: 'Enquiry',
    deadline: fmt(enquiry.targetDate)
  });
};

// 8. Followup assigned
export const notifyFollowupAssigned = (
  member, followup
) => {
  if (!member?.whatsapp?.trim()) return;
  callNotify('task_assigned', {
    whatsappNumber: member.whatsapp,
    memberName: member.name,
    taskName: followup.taskType +
      ' - ' + (followup.companyName || ''),
    projectName: 'Follow-up',
    deadline: fmt(followup.nextFollowupDate)
  });
};
