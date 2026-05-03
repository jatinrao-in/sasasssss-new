import { addDoc, collection, serverTimestamp } from 'firebase/firestore';
import { db } from './firebase';
import { securePost } from './secureApi';

export const saveAppNotification = async (uid, payload) => {
  if (!uid) return;
  try {
    await addDoc(collection(db, 'notifications', uid, 'items'), {
      ...payload,
      read: false,
      createdAt: serverTimestamp()
    });
  } catch (err) {
    console.error('Failed to save app notification:', err);
  }
};

const formatDate = (date) => {
  if (!date) return 'Not set';
  const parsed = typeof date?.toDate === 'function' ? date.toDate() : new Date(date);
  if (Number.isNaN(parsed.getTime())) return 'Not set';
  return parsed.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
};

const formatNumber = (value) => Number(value || 0).toLocaleString('en-IN');

const hasWhatsapp = (member) => Boolean(member?.whatsapp);
const isPositiveNumber = (value) => Number.isFinite(Number(value)) && Number(value) > 0;

export const notify = async (eventType, context) => {
  if (!eventType || typeof context !== 'object' || context === null) {
    console.log('Skip: invalid notification payload');
    return;
  }

  try {
    await securePost('/api/notify', { eventType, context });
  } catch (error) {
    console.error('Notify failed:', error.message);
  }
};

export const notifyTaskAssigned = async (member, task, project) => {
  if (!hasWhatsapp(member)) {
    console.log('Skip: no WhatsApp number');
    return;
  }
  if (!task?.title) {
    console.log('Skip: task title missing');
    return;
  }
  if (!task?.assignedTo) {
    console.log('Skip: task is not assigned');
    return;
  }
  if (!project?.name) {
    console.log('Skip: project name missing');
    return;
  }

  await saveAppNotification(member.id || member.uid, {
    title: 'New Task Assigned',
    body: `${task.title} - Due ${formatDate(task.targetDate)}`,
    type: 'task'
  });

  await notify('task_assigned', {
    memberUid: member.id,
    whatsappNumber: member.whatsapp,
    memberName: member.name || '',
    taskName: task.title,
    projectName: project.name,
    deadline: formatDate(task.targetDate),
  });
};

export const notifySalaryPaid = async (member, salary, month) => {
  if (!hasWhatsapp(member)) {
    console.log('Skip: no WhatsApp number');
    return;
  }
  if (!isPositiveNumber(salary?.netSalary)) {
    console.log('Skip: invalid salary amount');
    return;
  }
  if (!month) {
    console.log('Skip: no month specified');
    return;
  }
  if (salary?.status !== 'paid') {
    console.log('Skip: salary not marked paid');
    return;
  }

  await saveAppNotification(member.id || member.uid, {
    title: 'Salary Paid',
    body: `Salary of ${formatNumber(salary.netSalary)} paid for ${month}`,
    type: 'salary'
  });

  await notify('salary_paid', {
    memberUid: member.id,
    whatsappNumber: member.whatsapp,
    memberName: member.name || '',
    netSalary: formatNumber(salary.netSalary),
    month,
    paidDate: new Date().toLocaleDateString('en-IN', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
    }),
  });
};

export const notifyPaymentDue = async (member, payment) => {
  const pendingAmount = Number(
    payment?.netPending
    ?? payment?.netPendingAmount
    ?? (Number(payment?.amount || 0) - Number(payment?.totalPaid || 0)),
  );

  if (!hasWhatsapp(member)) {
    console.log('Skip: no WhatsApp number');
    return;
  }
  if (!payment?.customerName) {
    console.log('Skip: customer name missing');
    return;
  }
  if (!isPositiveNumber(pendingAmount)) {
    console.log('Skip: invalid pending amount');
    return;
  }
  if (payment?.paymentStatus === 'received') {
    console.log('Skip: payment already received');
    return;
  }

  await saveAppNotification(member.id || member.uid, {
    title: 'Payment Due',
    body: `Payment due for ${payment.customerName} - Rs.${formatNumber(pendingAmount)}`,
    type: 'payment'
  });

  await notify('payment_due', {
    memberUid: member.id,
    whatsappNumber: member.whatsapp,
    memberName: member.name || '',
    customerName: payment.customerName,
    invoiceNo: payment.invoiceNumber || payment.invoiceNo || 'N/A',
    amount: `Rs.${formatNumber(pendingAmount)}`,
  });
};

export const notifyTaskOverdue = async (member, task, project) => {
  if (!hasWhatsapp(member)) {
    console.log('Skip: no WhatsApp number');
    return;
  }
  if (!task?.title) {
    console.log('Skip: task title missing');
    return;
  }
  if (!project?.name) {
    console.log('Skip: project name missing');
    return;
  }

  const target = typeof task?.targetDate?.toDate === 'function'
    ? task.targetDate.toDate()
    : new Date(task?.targetDate);

  if (Number.isNaN(target.getTime())) {
    console.log('Skip: invalid task target date');
    return;
  }

  const overdueDays = Math.max(0, Math.floor((Date.now() - target.getTime()) / 86400000));

  await saveAppNotification(member.id || member.uid, {
    title: 'Task Overdue',
    body: `Task ${task.title} is overdue by ${overdueDays} days`,
    type: 'task'
  });

  await notify('task_overdue', {
    memberUid: member.id,
    whatsappNumber: member.whatsapp,
    memberName: member.name || '',
    taskName: task.title,
    projectName: project.name,
    overdueDays,
  });
};

export const notifyRgpOverdue = async (member, rgp) => {
  if (!hasWhatsapp(member)) {
    console.log('Skip: no WhatsApp number');
    return;
  }
  if (!rgp?.docNumber) {
    console.log('Skip: RGP document number missing');
    return;
  }

  const created = typeof rgp?.createdAt?.toDate === 'function'
    ? rgp.createdAt.toDate()
    : new Date(rgp?.createdAt);

  if (Number.isNaN(created.getTime())) {
    console.log('Skip: invalid RGP created date');
    return;
  }

  const openDays = Math.max(0, Math.floor((Date.now() - created.getTime()) / 86400000));

  await saveAppNotification(member.id || member.uid, {
    title: 'RGP Overdue',
    body: `RGP ${rgp.docNumber} is overdue by ${openDays} days`,
    type: 'rgp'
  });

  await notify('rgp_overdue', {
    memberUid: member.id,
    whatsappNumber: member.whatsapp,
    memberName: member.name || '',
    docNumber: rgp.docNumber,
    fromCompany: rgp.fromCompany || '',
    toCompany: rgp.toCompany || '',
    openDays,
  });
};

export const notifyToolNotReturned = async (member, tool) => {
  if (!hasWhatsapp(member)) {
    console.log('Skip: no WhatsApp number');
    return;
  }
  if (!tool?.name) {
    console.log('Skip: tool name missing');
    return;
  }

  const issued = typeof tool?.issuedDate?.toDate === 'function'
    ? tool.issuedDate.toDate()
    : new Date(tool?.issuedDate);

  if (Number.isNaN(issued.getTime())) {
    console.log('Skip: invalid tool issue date');
    return;
  }

  const days = Math.max(0, Math.floor((Date.now() - issued.getTime()) / 86400000));

  await saveAppNotification(member.id || member.uid, {
    title: 'Tool Not Returned',
    body: `Tool ${tool.name} not returned for ${days} days`,
    type: 'tool'
  });

  await notify('tool_not_returned', {
    memberUid: member.id,
    whatsappNumber: member.whatsapp,
    memberName: member.name || '',
    toolName: tool.name,
    issuedDate: formatDate(tool.issuedDate),
    days,
  });
};

export const notifyEnquiryAssigned = async (member, enquiry) => {
  if (!member?.whatsapp) return;
  
  await saveAppNotification(member.id || member.uid, {
    title: 'New Enquiry Assigned',
    body: `${enquiry.companyName} - Due ${enquiry.targetDate ? formatDate(enquiry.targetDate) : 'Not set'}`,
    type: 'enquiry'
  });

  await notify('enquiry_assigned', {
    memberUid: member.id || member.uid,
    whatsappNumber: member.whatsapp,
    memberName: member.name,
    enquiryType: enquiry.taskType || 'Enquiry',
    companyName: enquiry.companyName || 'Company',
    targetDate: enquiry.targetDate ? formatDate(enquiry.targetDate) : 'Not set'
  });
};

export const notifyFollowupAssigned = async (member, followup) => {
  if (!member?.whatsapp) return;

  await saveAppNotification(member.id || member.uid, {
    title: 'New Followup Assigned',
    body: `${followup.companyName} - Due ${followup.nextFollowupDate ? formatDate(followup.nextFollowupDate) : 'Not set'}`,
    type: 'followup'
  });

  await notify('followup_assigned', {
    memberUid: member.id || member.uid,
    whatsappNumber: member.whatsapp,
    memberName: member.name,
    followupType: followup.taskType || 'Follow-up',
    companyName: followup.companyName || 'Company',
    nextFollowupDate: followup.nextFollowupDate ? formatDate(followup.nextFollowupDate) : 'Not set'
  });
};

export const notifyToolAssigned = async (member, tool) => {
  if (!member?.whatsapp) return;

  await saveAppNotification(member.id || member.uid, {
    title: 'New Tool Assigned',
    body: `Tool ${tool.toolName} assigned`,
    type: 'tool'
  });

  await notify('tool_assigned', {
    memberUid: member.id || member.uid,
    whatsappNumber: member.whatsapp,
    memberName: member.name,
    toolName: tool.toolName,
    issuedDate: formatDate(tool.handedOverDate || new Date()),
    days: '0'
  });
};

export const notifyRgpAssigned = async (member, rgp) => {
  if (!member?.whatsapp) return;

  await saveAppNotification(member.id || member.uid, {
    title: 'New RGP Assigned',
    body: `RGP ${rgp.docNumber} assigned`,
    type: 'rgp'
  });

  await notify('rgp_assigned', {
    memberUid: member.id || member.uid,
    whatsappNumber: member.whatsapp,
    memberName: member.name,
    type: rgp.type || 'RGP',
    docNumber: rgp.docNumber || 'N/A',
    fromCompany: rgp.fromCompany || 'N/A',
    toCompany: rgp.toCompany || 'N/A',
    date: formatDate(new Date())
  });
};

export const notifyPaymentAssigned = async (member, payment) => {
  if (!member?.whatsapp) return;
  if (!payment?.customerName) return;

  await saveAppNotification(member.id || member.uid, {
    title: 'New Payment Assigned',
    body: `Payment assigned for ${payment.customerName} - Rs.${Number(payment.amount || 0).toLocaleString('en-IN')}`,
    type: 'payment'
  });

  await notify('payment_assigned', {
    memberUid: member.id || member.uid,
    whatsappNumber: member.whatsapp,
    memberName: member.name,
    customerName: payment.customerName,
    invoiceNo: payment.invoiceNumber || 'N/A',
    amount: `Rs.${Number(payment.amount || 0).toLocaleString('en-IN')}`
  });
};
