const { getFirebaseAdmin } = require('../../lib/firebaseAdmin');
const { sendMSG91WhatsApp } = require('../../lib/msg91');

function normalizeDate(value) {
  if (!value) return null;
  if (typeof value.toDate === 'function') return value.toDate();
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

function isTomorrow(dateValue) {
  const date = normalizeDate(dateValue);
  if (!date) return false;

  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);
  tomorrow.setHours(0, 0, 0, 0);

  const checkDate = new Date(date);
  checkDate.setHours(0, 0, 0, 0);
  return checkDate.getTime() === tomorrow.getTime();
}

function isToday(dateValue) {
  const date = normalizeDate(dateValue);
  if (!date) return false;

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const checkDate = new Date(date);
  checkDate.setHours(0, 0, 0, 0);
  return checkDate.getTime() === today.getTime();
}

async function getCompanyName(db) {
  const settingsDoc = await db.collection('settings').doc('company').get();
  return settingsDoc.exists ? settingsDoc.data().name || '' : '';
}

function todayDateString() {
  return new Date().toLocaleDateString('en-IN', {
    dateStyle: 'medium',
    timeZone: 'Asia/Kolkata',
  });
}

async function sendMsg(phone, message) {
  if (!phone || !message?.trim()) return;

  const templateName = process.env.MSG91_FREEFORM_TEMPLATE || 'generic_notification';
  const result = await sendMSG91WhatsApp({
    to: phone,
    templateName,
    components: [
      {
        type: 'body',
        parameters: [{ type: 'text', text: message.substring(0, 1024) }],
      },
    ],
  });

  if (!result.success) {
    console.warn('[run-reminders] MSG91 failed:', result.error);
  }
}

async function runDailyMemberReminder(db) {
  console.log('[dailyMemberReminder] START');

  const configDoc = await db.collection('whatsapp_config').doc('daily_reminder').get();
  if (!configDoc.exists || !configDoc.data().isActive) {
    console.log('[dailyMemberReminder] Disabled - skipping.');
    return;
  }

  const config = configDoc.data();
  const template = config.messageTemplate || '';
  if (!template.trim()) {
    console.log('[dailyMemberReminder] No Firestore template configured - skipping.');
    return;
  }

  const companyName = await getCompanyName(db);
  const membersSnap = await db.collection('users').where('role', '==', 'member').where('status', '==', 'active').get();

  for (const memberDoc of membersSnap.docs) {
    try {
      const member = memberDoc.data();
      const phone = member.whatsapp || member.phone;
      if (!phone) continue;

      const tasksSnap = await db.collection('tasks').where('assignedTo', '==', memberDoc.id).get();
      const openTasks = tasksSnap.docs.filter((docSnap) => docSnap.data().status !== 'completed').length;
      const overdueTasks = tasksSnap.docs.filter((docSnap) => docSnap.data().status === 'overdue').length;
      if (openTasks === 0) continue;

      const message = template
        .replace(/{name}/g, member.name || member.email || '')
        .replace(/{open_tasks}/g, String(openTasks))
        .replace(/{overdue_tasks}/g, String(overdueTasks))
        .replace(/{company_name}/g, companyName);

      await sendMsg(phone, message);
      console.log(`[dailyMemberReminder] Queued for ${member.name || memberDoc.id}`);
    } catch (error) {
      console.error(`[dailyMemberReminder] Error for ${memberDoc.id}:`, error.message);
    }
  }

  console.log('[dailyMemberReminder] END');
}

async function runAdminDailySummary(db) {
  console.log('[adminDailySummary] START');

  const configDoc = await db.collection('whatsapp_config').doc('admin_summary').get();
  if (!configDoc.exists || !configDoc.data().isActive) {
    console.log('[adminDailySummary] Disabled - skipping.');
    return;
  }

  const config = configDoc.data();
  const template = config.messageTemplate || '';
  const recipients = (config.recipients || []).filter((value) => value && value.trim());
  if (recipients.length === 0 || !template.trim()) return;

  const companyName = await getCompanyName(db);
  const membersSnap = await db.collection('users').where('role', '==', 'member').where('status', '==', 'active').get();

  let totalOpen = 0;
  let totalOverdue = 0;
  const summaryLines = [];

  for (const memberDoc of membersSnap.docs) {
    const member = memberDoc.data();
    const tasksSnap = await db.collection('tasks').where('assignedTo', '==', memberDoc.id).get();
    const open = tasksSnap.docs.filter((docSnap) => docSnap.data().status !== 'completed').length;
    const overdue = tasksSnap.docs.filter((docSnap) => docSnap.data().status === 'overdue').length;
    const completed = tasksSnap.docs.filter((docSnap) => docSnap.data().status === 'completed').length;

    totalOpen += open;
    totalOverdue += overdue;
    summaryLines.push(`${member.name}: ${open} open, ${completed} done, ${overdue} overdue`);
  }

  const message = template
    .replace(/{date}/g, todayDateString())
    .replace(/{team_summary}/g, summaryLines.join('\n'))
    .replace(/{total_open}/g, String(totalOpen))
    .replace(/{total_overdue}/g, String(totalOverdue))
    .replace(/{company_name}/g, companyName);

  for (const recipient of recipients) {
    await sendMsg(recipient, message);
  }

  console.log(`[adminDailySummary] Sent to ${recipients.length} recipients`);
  console.log('[adminDailySummary] END');
}

async function runDeadlineReminderWhatsApp(db) {
  console.log('[deadlineReminderWhatsApp] START');
  const companyName = await getCompanyName(db);

  const tasksSnap = await db.collection('tasks').get();
  for (const taskDoc of tasksSnap.docs) {
    const task = taskDoc.data();
    if (task.status === 'completed' || !isTomorrow(task.targetDate)) continue;

    const memberDoc = task.assignedTo ? await db.collection('users').doc(task.assignedTo).get() : null;
    const phone = memberDoc?.exists ? memberDoc.data().whatsapp || memberDoc.data().phone : null;
    if (!phone) continue;

    await sendMsg(
      phone,
      `Deadline tomorrow!\nTask: ${task.title}\nDue: Tomorrow\nPlease complete on time.\n- ${companyName}`,
    );
  }

  const enquiriesSnap = await db.collection('enquiries').get();
  for (const enquiryDoc of enquiriesSnap.docs) {
    const enquiry = enquiryDoc.data();
    if (enquiry.status === 'closed' || !isTomorrow(enquiry.targetDate)) continue;

    const memberDoc = enquiry.assignedTo ? await db.collection('users').doc(enquiry.assignedTo).get() : null;
    const phone = memberDoc?.exists ? memberDoc.data().whatsapp || memberDoc.data().phone : null;
    if (!phone) continue;

    await sendMsg(
      phone,
      `Enquiry deadline tomorrow!\nCustomer: ${enquiry.customerName || '-'}\nPlease follow up.\n- ${companyName}`,
    );
  }

  const paymentsSnap = await db.collection('payments').get();
  for (const paymentDoc of paymentsSnap.docs) {
    const payment = paymentDoc.data();
    if (payment.paymentStatus === 'received' || !isTomorrow(payment.targetPaymentDate)) continue;

    const memberDoc = payment.assignedTo ? await db.collection('users').doc(payment.assignedTo).get() : null;
    const phone = memberDoc?.exists ? memberDoc.data().whatsapp || memberDoc.data().phone : null;
    if (!phone) continue;

    await sendMsg(
      phone,
      `Payment due tomorrow!\nCustomer: ${payment.customerName}\nAmount: ₹${payment.amount || 0}\nPlease follow up.\n- ${companyName}`,
    );
  }

  console.log('[deadlineReminderWhatsApp] END');
}

async function runPaymentFollowupReminder(db) {
  console.log('[paymentFollowupReminder] START');
  const companyName = await getCompanyName(db);

  const paymentsSnap = await db.collection('payments').get();
  for (const paymentDoc of paymentsSnap.docs) {
    const payment = paymentDoc.data();
    if (payment.paymentStatus === 'received' || !isToday(payment.nextFollowupDate)) continue;

    const memberDoc = payment.assignedTo ? await db.collection('users').doc(payment.assignedTo).get() : null;
    const phone = memberDoc?.exists ? memberDoc.data().whatsapp || memberDoc.data().phone : null;
    if (!phone) continue;

    const netPending = (payment.amount || 0) - (payment.totalPaid || 0);
    await sendMsg(
      phone,
      `Payment follow-up due today!\nCustomer: ${payment.customerName}\nAmount Pending: ₹${netPending}\n- ${companyName}`,
    );
  }

  const outgoingPaymentsSnap = await db.collection('outgoing_payments').get();
  for (const outgoingDoc of outgoingPaymentsSnap.docs) {
    const outgoingPayment = outgoingDoc.data();
    if (outgoingPayment.paymentStatus === 'paid' || !isToday(outgoingPayment.nextFollowupDate)) continue;

    const memberDoc = outgoingPayment.assignedTo
      ? await db.collection('users').doc(outgoingPayment.assignedTo).get()
      : null;
    const phone = memberDoc?.exists ? memberDoc.data().whatsapp || memberDoc.data().phone : null;
    if (!phone) continue;

    await sendMsg(
      phone,
      `Outgoing payment follow-up today!\nVendor: ${outgoingPayment.vendorName}\nPending: ₹${outgoingPayment.netPendingAmount || 0}\n- ${companyName}`,
    );
  }

  console.log('[paymentFollowupReminder] END');
}

module.exports = async (req, res) => {
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method Not Allowed' });

  const cronSecret = req.headers['x-cron-secret'];
  if (!cronSecret || cronSecret !== process.env.CRON_SECRET) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  const { job = 'all' } = req.body || {};
  const { db } = getFirebaseAdmin();

  try {
    const results = [];

    if (job === 'all' || job === 'dailyMemberReminder') {
      await runDailyMemberReminder(db);
      results.push('dailyMemberReminder');
    }

    if (job === 'all' || job === 'adminDailySummary') {
      await runAdminDailySummary(db);
      results.push('adminDailySummary');
    }

    if (job === 'all' || job === 'deadlineReminder') {
      await runDeadlineReminderWhatsApp(db);
      results.push('deadlineReminderWhatsApp');
    }

    if (job === 'all' || job === 'paymentFollowup') {
      await runPaymentFollowupReminder(db);
      results.push('paymentFollowupReminder');
    }

    return res.status(200).json({ success: true, ran: results });
  } catch (error) {
    console.error('[run-reminders] ERROR:', error.message);
    return res.status(500).json({ error: error.message });
  }
};
