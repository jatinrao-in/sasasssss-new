import { securePost } from './secureApi';

// ─── Date formatter ──────────────────────────────────────────────────────────

const formatDate = (date) => {
  if (!date) return 'Not set';
  const d = date?.toDate ? date.toDate() : new Date(date);
  if (isNaN(d.getTime())) return 'Not set';
  return d.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
};

// ─── Core dispatcher ─────────────────────────────────────────────────────────

export const notify = async (eventType, context) => {
  try {
    await securePost('/api/notify', { eventType, context });
  } catch (error) {
    // Silent fail — never block UI
    console.error('Notify failed:', error.message);
  }
};

// ─── Task assigned ───────────────────────────────────────────────────────────

/**
 * @param {object} member  - { id, name, whatsapp }
 * @param {object} task    - { title, targetDate }
 * @param {object} project - { name }
 */
export const notifyTaskAssigned = async (member, task, project) => {
  if (!member?.whatsapp) return;

  await notify('task_assigned', {
    memberUid: member.id,
    whatsappNumber: member.whatsapp,
    memberName: member.name || '',
    taskName: task.title || '',
    projectName: project?.name || '',
    deadline: formatDate(task.targetDate),
  });
};

// ─── Salary paid ─────────────────────────────────────────────────────────────

/**
 * @param {object} member - { id, name, whatsapp }
 * @param {object} row    - { netSalary, ... }
 * @param {string} month  - formatted month label, e.g. "April 2026"
 */
export const notifySalaryPaid = async (member, row, month) => {
  if (!member?.whatsapp) return;

  await notify('salary_paid', {
    memberUid: member.id,
    whatsappNumber: member.whatsapp,
    memberName: member.name || '',
    netSalary: `Rs.${(row.netSalary || 0).toLocaleString('en-IN')}`,
    month: month || '',
    paidDate: new Date().toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }),
  });
};

// ─── Payment due ─────────────────────────────────────────────────────────────

/**
 * @param {object} member   - { id, name, whatsapp }
 * @param {object} payment  - { customerName, invoiceNumber, netPending }
 */
export const notifyPaymentDue = async (member, payment) => {
  if (!member?.whatsapp) return;

  await notify('payment_due', {
    memberUid: member.id,
    whatsappNumber: member.whatsapp,
    memberName: member.name || '',
    customerName: payment.customerName || '',
    invoiceNo: payment.invoiceNumber || payment.invoiceNo || '',
    amount: `Rs.${(payment.netPending || payment.amount || 0).toLocaleString('en-IN')}`,
  });
};

// ─── Task overdue ─────────────────────────────────────────────────────────────

/**
 * @param {object} member   - { id, name, whatsapp }
 * @param {object} task     - { title, targetDate }
 * @param {object} project  - { name }
 */
export const notifyTaskOverdue = async (member, task, project) => {
  if (!member?.whatsapp) return;

  const target = task.targetDate?.toDate ? task.targetDate.toDate() : new Date(task.targetDate);
  const overdueDays = Math.max(0, Math.floor((Date.now() - target.getTime()) / 86400000));

  await notify('task_overdue', {
    memberUid: member.id,
    whatsappNumber: member.whatsapp,
    memberName: member.name || '',
    taskName: task.title || '',
    projectName: project?.name || '',
    overdueDays,
  });
};

// ─── RGP overdue ──────────────────────────────────────────────────────────────

/**
 * @param {object} member - { id, name, whatsapp }
 * @param {object} rgp    - { docNumber, fromCompany, toCompany, createdAt }
 */
export const notifyRgpOverdue = async (member, rgp) => {
  if (!member?.whatsapp) return;

  const created = rgp.createdAt?.toDate ? rgp.createdAt.toDate() : new Date(rgp.createdAt);
  const openDays = Math.max(0, Math.floor((Date.now() - created.getTime()) / 86400000));

  await notify('rgp_overdue', {
    memberUid: member.id,
    whatsappNumber: member.whatsapp,
    memberName: member.name || '',
    docNumber: rgp.docNumber || '',
    fromCompany: rgp.fromCompany || '',
    toCompany: rgp.toCompany || '',
    openDays,
  });
};

// ─── Tool not returned ────────────────────────────────────────────────────────

/**
 * @param {object} member - { id, name, whatsapp }
 * @param {object} tool   - { name, issuedDate }
 */
export const notifyToolNotReturned = async (member, tool) => {
  if (!member?.whatsapp) return;

  const issued = tool.issuedDate?.toDate ? tool.issuedDate.toDate() : new Date(tool.issuedDate);
  const days = Math.max(0, Math.floor((Date.now() - issued.getTime()) / 86400000));

  await notify('tool_not_returned', {
    memberUid: member.id,
    whatsappNumber: member.whatsapp,
    memberName: member.name || '',
    toolName: tool.name || '',
    issuedDate: formatDate(tool.issuedDate),
    days,
  });
};
