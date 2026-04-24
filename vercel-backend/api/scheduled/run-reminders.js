const { getFirebaseAdmin } = require('../../lib/firebaseAdmin');
const { sendMSG91WhatsApp } = require('../../lib/msg91');

// ── Helpers ──────────────────────────────────────────────────────────────────

function normalizeDate(value) {
  if (!value) return null;
  if (typeof value.toDate === 'function') return value.toDate();
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

function calculateOverdueDays(targetDate) {
  const d = normalizeDate(targetDate);
  if (!d) return 0;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const norm = new Date(d);
  norm.setHours(0, 0, 0, 0);
  const diff = Math.floor((today - norm) / (1000 * 60 * 60 * 24));
  return diff > 0 ? diff : 0;
}

function isTomorrow(dateValue) {
  const d = normalizeDate(dateValue);
  if (!d) return false;
  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);
  tomorrow.setHours(0, 0, 0, 0);
  const check = new Date(d);
  check.setHours(0, 0, 0, 0);
  return check.getTime() === tomorrow.getTime();
}

function isToday(dateValue) {
  const d = normalizeDate(dateValue);
  if (!d) return false;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const check = new Date(d);
  check.setHours(0, 0, 0, 0);
  return check.getTime() === today.getTime();
}

function getCompanyName() {
  return process.env.APP_COMPANY_NAME || 'Saya Industrial Solutions';
}

function todayDateString() {
  return new Date().toLocaleDateString('en-IN', { dateStyle: 'medium', timeZone: 'Asia/Kolkata' });
}

async function sendMsg(phone, message, db, FieldValue) {
  if (!phone) return;
  const templateName = process.env.MSG91_FREEFORM_TEMPLATE || 'generic_notification';
  const result = await sendMSG91WhatsApp({
    to: phone,
    templateName,
    components: [
      { type: 'body', parameters: [{ type: 'text', text: message.substring(0, 1024) }] }
    ]
  });
  if (!result.success) console.warn('[run-reminders] MSG91 failed:', result.error);
}

// ── Reminder Jobs ─────────────────────────────────────────────────────────────

async function runDailyMemberReminder(db, FieldValue) {
  console.log('[dailyMemberReminder] START');
  const configDoc = await db.collection('whatsapp_config').doc('daily_reminder').get();
  if (!configDoc.exists || !configDoc.data().isActive) {
    console.log('[dailyMemberReminder] Disabled — skipping.'); return;
  }
  const config = configDoc.data();
  const template = config.messageTemplate || 'Hi {name}, you have {open_tasks} pending tasks. {overdue_tasks} overdue. - {company_name}';

  const membersSnap = await db.collection('users').where('role', '==', 'member').where('status', '==', 'active').get();
  for (const memberDoc of membersSnap.docs) {
    try {
      const member = memberDoc.data();
      const phone = member.whatsapp || member.phone;
      if (!phone) continue;

      const tasksSnap = await db.collection('tasks').where('assignedTo', '==', memberDoc.id).get();
      const openTasks = tasksSnap.docs.filter(d => d.data().status !== 'completed').length;
      const overdueTasks = tasksSnap.docs.filter(d => d.data().status === 'overdue').length;
      if (openTasks === 0) continue;

      const message = template
        .replace(/{name}/g, member.name || member.email)
        .replace(/{open_tasks}/g, String(openTasks))
        .replace(/{overdue_tasks}/g, String(overdueTasks))
        .replace(/{company_name}/g, getCompanyName());
      await sendMsg(phone, message, db, FieldValue);
      console.log(`[dailyMemberReminder] Queued for ${member.name}`);
    } catch (err) { console.error(`[dailyMemberReminder] Error for ${memberDoc.id}:`, err.message); }
  }
  console.log('[dailyMemberReminder] END');
}

async function runAdminDailySummary(db, FieldValue) {
  console.log('[adminDailySummary] START');
  const configDoc = await db.collection('whatsapp_config').doc('admin_summary').get();
  if (!configDoc.exists || !configDoc.data().isActive) {
    console.log('[adminDailySummary] Disabled — skipping.'); return;
  }
  const config = configDoc.data();
  const template = config.messageTemplate || 'Daily Summary - {date}\n{team_summary}\nTotal Open: {total_open} | Overdue: {total_overdue}\n- {company_name}';
  const recipients = (config.recipients || []).filter(r => r && r.trim());
  if (recipients.length === 0) return;

  const membersSnap = await db.collection('users').where('role', '==', 'member').where('status', '==', 'active').get();
  let totalOpen = 0, totalOverdue = 0;
  const summaryLines = [];
  for (const memberDoc of membersSnap.docs) {
    const member = memberDoc.data();
    const tasksSnap = await db.collection('tasks').where('assignedTo', '==', memberDoc.id).get();
    const open = tasksSnap.docs.filter(d => d.data().status !== 'completed').length;
    const overdue = tasksSnap.docs.filter(d => d.data().status === 'overdue').length;
    const completed = tasksSnap.docs.filter(d => d.data().status === 'completed').length;
    totalOpen += open; totalOverdue += overdue;
    summaryLines.push(`${member.name}: ${open} open, ${completed} done, ${overdue} overdue`);
  }
  const message = template
    .replace(/{date}/g, todayDateString())
    .replace(/{team_summary}/g, summaryLines.join('\n'))
    .replace(/{total_open}/g, String(totalOpen))
    .replace(/{total_overdue}/g, String(totalOverdue))
    .replace(/{company_name}/g, getCompanyName());
  for (const recipient of recipients) await sendMsg(recipient, message, db, FieldValue);
  console.log(`[adminDailySummary] Sent to ${recipients.length} recipients`);
  console.log('[adminDailySummary] END');
}

async function runDeadlineReminderWhatsApp(db, FieldValue) {
  console.log('[deadlineReminderWhatsApp] START');

  // Tasks due tomorrow
  const tasksSnap = await db.collection('tasks').get();
  for (const taskDoc of tasksSnap.docs) {
    const task = taskDoc.data();
    if (task.status === 'completed' || !isTomorrow(task.targetDate)) continue;
    const memberDoc = task.assignedTo ? await db.collection('users').doc(task.assignedTo).get() : null;
    const phone = memberDoc?.exists ? (memberDoc.data().whatsapp || memberDoc.data().phone) : null;
    if (!phone) continue;
    const msg = `⏰ Deadline Tomorrow!\nTask: ${task.title}\nDue: Tomorrow\nPlease complete on time.\n- ${getCompanyName()}`;
    await sendMsg(phone, msg, db, FieldValue);
  }

  // Enquiries due tomorrow
  const enqSnap = await db.collection('enquiries').get();
  for (const doc of enqSnap.docs) {
    const data = doc.data();
    if (data.status === 'closed' || !isTomorrow(data.targetDate)) continue;
    const memberDoc = data.assignedTo ? await db.collection('users').doc(data.assignedTo).get() : null;
    const phone = memberDoc?.exists ? (memberDoc.data().whatsapp || memberDoc.data().phone) : null;
    if (!phone) continue;
    await sendMsg(phone, `⏰ Enquiry Deadline Tomorrow!\nCustomer: ${data.customerName || '-'}\nPlease follow up.\n- ${getCompanyName()}`, db, FieldValue);
  }

  // Payments due tomorrow
  const paySnap = await db.collection('payments').get();
  for (const doc of paySnap.docs) {
    const data = doc.data();
    if (data.paymentStatus === 'received' || !isTomorrow(data.targetPaymentDate)) continue;
    const memberDoc = data.assignedTo ? await db.collection('users').doc(data.assignedTo).get() : null;
    const phone = memberDoc?.exists ? (memberDoc.data().whatsapp || memberDoc.data().phone) : null;
    if (!phone) continue;
    await sendMsg(phone, `💰 Payment Due Tomorrow!\nCustomer: ${data.customerName}\nAmount: ₹${data.amount || 0}\nPlease follow up.\n- ${getCompanyName()}`, db, FieldValue);
  }

  console.log('[deadlineReminderWhatsApp] END');
}

async function runPaymentFollowupReminder(db, FieldValue) {
  console.log('[paymentFollowupReminder] START');
  const paySnap = await db.collection('payments').get();
  for (const doc of paySnap.docs) {
    const data = doc.data();
    if (data.paymentStatus === 'received' || !isToday(data.nextFollowupDate)) continue;
    const memberDoc = data.assignedTo ? await db.collection('users').doc(data.assignedTo).get() : null;
    const phone = memberDoc?.exists ? (memberDoc.data().whatsapp || memberDoc.data().phone) : null;
    if (!phone) continue;
    const netPending = (data.amount || 0) - (data.totalPaid || 0);
    await sendMsg(phone, `💰 Payment Follow-up Due Today!\nCustomer: ${data.customerName}\nAmount Pending: ₹${netPending}\n- ${getCompanyName()}`, db, FieldValue);
  }

  const outSnap = await db.collection('outgoing_payments').get();
  for (const doc of outSnap.docs) {
    const data = doc.data();
    if (data.paymentStatus === 'paid' || !isToday(data.nextFollowupDate)) continue;
    const memberDoc = data.assignedTo ? await db.collection('users').doc(data.assignedTo).get() : null;
    const phone = memberDoc?.exists ? (memberDoc.data().whatsapp || memberDoc.data().phone) : null;
    if (!phone) continue;
    await sendMsg(phone, `💰 Outgoing Payment Follow-up Today!\nVendor: ${data.vendorName}\nPending: ₹${data.netPendingAmount || 0}\n- ${getCompanyName()}`, db, FieldValue);
  }
  console.log('[paymentFollowupReminder] END');
}

// ── Main Handler ──────────────────────────────────────────────────────────────

/**
 * POST /api/scheduled/run-reminders
 * Called by GitHub Actions cron jobs.
 * Protected by x-cron-secret header.
 *
 * Body: { "job": "dailyMemberReminder" | "adminDailySummary" | "deadlineReminder" | "paymentFollowup" | "all" }
 */
module.exports = async (req, res) => {
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method Not Allowed' });

  const cronSecret = req.headers['x-cron-secret'];
  if (!cronSecret || cronSecret !== process.env.CRON_SECRET) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  const { job = 'all' } = req.body || {};
  const { db, FieldValue } = getFirebaseAdmin();

  try {
    const results = [];
    if (job === 'all' || job === 'dailyMemberReminder') {
      await runDailyMemberReminder(db, FieldValue); results.push('dailyMemberReminder');
    }
    if (job === 'all' || job === 'adminDailySummary') {
      await runAdminDailySummary(db, FieldValue); results.push('adminDailySummary');
    }
    if (job === 'all' || job === 'deadlineReminder') {
      await runDeadlineReminderWhatsApp(db, FieldValue); results.push('deadlineReminderWhatsApp');
    }
    if (job === 'all' || job === 'paymentFollowup') {
      await runPaymentFollowupReminder(db, FieldValue); results.push('paymentFollowupReminder');
    }

    return res.status(200).json({ success: true, ran: results });
  } catch (error) {
    console.error('[run-reminders] ERROR:', error.message);
    return res.status(500).json({ error: error.message });
  }
};
