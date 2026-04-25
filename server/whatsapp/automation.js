import { Timestamp } from 'firebase-admin/firestore';

export const DEFAULT_MORNING_TEMPLATE = `Good morning {name}!

Here is your daily work update:

Pending Tasks: {pending_tasks}
Overdue Tasks: {overdue_tasks}
Today's Followups: {followups_today}

Task Details:
{task_list}

Please update your progress today.
- {company_name}`;

export const DEFAULT_EVENING_TEMPLATE = `Good evening {name}!

End of day summary:

Tasks Completed Today: {completed_today}
Overall Progress: {overall_progress}%
Pending Tasks: {pending_tasks}
Overdue Tasks: {overdue_tasks}

Keep up the great work!
- {company_name}`;

export const DEFAULT_ADMIN_TEMPLATE = `Daily Team Summary - {date}

{team_summary}

Total Open: {total_open}
Total Overdue: {total_overdue}
Total Completed Today: {completed_today}

- {company_name}`;

export const DEFAULT_AUTOMATION_SETTINGS = {
  morningEnabled: true,
  morningTime: '07:00',
  eveningEnabled: true,
  eveningTime: '19:00',
  adminSummaryEnabled: true,
  adminNumbers: ['', '', ''],
  morningTemplate: DEFAULT_MORNING_TEMPLATE,
  eveningTemplate: DEFAULT_EVENING_TEMPLATE,
  adminTemplate: DEFAULT_ADMIN_TEMPLATE,
};

export function getAutomationDefaults() {
  return {
    ...DEFAULT_AUTOMATION_SETTINGS,
    adminNumbers: [...DEFAULT_AUTOMATION_SETTINGS.adminNumbers],
  };
}

export function mergeAutomationSettings(data = {}) {
  const merged = {
    ...getAutomationDefaults(),
    ...data,
  };

  merged.adminNumbers = Array.isArray(data?.adminNumbers)
    ? [...data.adminNumbers, '', '', ''].slice(0, 3).map((value) => String(value || '').trim())
    : [...DEFAULT_AUTOMATION_SETTINGS.adminNumbers];

  return merged;
}

export function timestampToDate(value) {
  if (!value) {
    return null;
  }

  if (typeof value.toDate === 'function') {
    return value.toDate();
  }

  const parsed = value instanceof Date ? value : new Date(value);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

export function getNowInIst(referenceDate = new Date()) {
  const asString = referenceDate.toLocaleString('en-US', { timeZone: 'Asia/Kolkata' });
  return new Date(asString);
}

export function formatIstDate(referenceDate = new Date()) {
  return referenceDate.toLocaleDateString('en-IN', {
    timeZone: 'Asia/Kolkata',
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  });
}

export function formatIstTime(referenceDate = new Date()) {
  return referenceDate.toLocaleTimeString('en-GB', {
    timeZone: 'Asia/Kolkata',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  });
}

export function buildDayRangeIst(referenceDate = new Date()) {
  const nowIst = getNowInIst(referenceDate);
  const start = new Date(nowIst);
  start.setHours(0, 0, 0, 0);
  const end = new Date(start);
  end.setDate(end.getDate() + 1);
  return { start, end, nowIst };
}

export function renderTemplate(template, variables) {
  return String(template || '').replace(/\{([a-z_]+)\}/gi, (match, key) => {
    const replacement = variables[key];
    return replacement === undefined || replacement === null ? match : String(replacement);
  });
}

export function getCompanyName(companyDoc) {
  return String(companyDoc?.data?.()?.name || companyDoc?.name || '').trim() || 'Your Company';
}

export async function getMemberTaskContext(db, uid, user, companyName, referenceDate = new Date()) {
  const { start, end, nowIst } = buildDayRangeIst(referenceDate);

  const [tasksSnap, followupsSnap] = await Promise.all([
    db.collection('tasks').where('assignedTo', '==', uid).get(),
    db.collection('followups').where('assignedTo', '==', uid).get(),
  ]);

  const allTasks = tasksSnap.docs.map((docSnap) => ({ id: docSnap.id, ...docSnap.data() }));
  const followups = followupsSnap.docs.map((docSnap) => ({ id: docSnap.id, ...docSnap.data() }));

  const pendingTasks = allTasks.filter((task) => task.status !== 'completed');
  const overdueTasks = pendingTasks.filter((task) => {
    const targetDate = timestampToDate(task.targetDate);
    return targetDate && targetDate < start;
  });
  const completedToday = allTasks.filter((task) => {
    const updatedAt = timestampToDate(task.updatedAt);
    return task.status === 'completed' && updatedAt && updatedAt >= start && updatedAt < end;
  });
  const followupsToday = followups.filter((followup) => {
    const dueDate = timestampToDate(followup.nextFollowupDate || followup.targetDate);
    return followup.status !== 'closed' && dueDate && dueDate >= start && dueDate < end;
  });

  const overallProgress = allTasks.length
    ? Math.round(
      allTasks.reduce((sum, task) => sum + Number(task.completionPercent || 0), 0) / allTasks.length,
    )
    : 0;

  const taskList = pendingTasks
    .slice(0, 5)
    .map((task) => `- ${task.title || 'Untitled task'} (${Number(task.completionPercent || 0)}%)`)
    .join('\n') || 'No pending tasks';

  return {
    uid,
    name: user?.name || 'Team Member',
    pending_tasks: pendingTasks.length,
    overdue_tasks: overdueTasks.length,
    followups_today: followupsToday.length,
    task_list: taskList,
    completed_today: completedToday.length,
    overall_progress: overallProgress,
    company_name: companyName,
    date: formatIstDate(nowIst),
  };
}

export async function getTeamSummaryContext(db, companyName, memberResults = [], referenceDate = new Date()) {
  const { start, nowIst } = buildDayRangeIst(referenceDate);
  const allTasksSnap = await db.collection('tasks').get();
  const allTasks = allTasksSnap.docs.map((docSnap) => docSnap.data());

  const totalOpen = allTasks.filter((task) => task.status !== 'completed').length;
  const totalOverdue = allTasks.filter((task) => {
    const targetDate = timestampToDate(task.targetDate);
    return task.status !== 'completed' && targetDate && targetDate < start;
  }).length;
  const totalCompletedToday = allTasks.filter((task) => {
    const updatedAt = timestampToDate(task.updatedAt);
    return task.status === 'completed' && updatedAt && updatedAt >= start;
  }).length;

  const teamSummary = memberResults.length
    ? memberResults.map((result) => {
      const label = result.status === 'sent' ? 'Sent' : `Failed${result.error ? ` (${result.error})` : ''}`;
      return `${result.memberName || result.name || 'Unknown'}: ${label}`;
    }).join('\n')
    : 'No member reminders were processed.';

  return {
    date: formatIstDate(nowIst),
    team_summary: teamSummary,
    total_open: totalOpen,
    total_overdue: totalOverdue,
    completed_today: totalCompletedToday,
    company_name: companyName,
  };
}

export async function writeWhatsAppLog(db, logData) {
  await db.collection('whatsapp_logs').add({
    ...logData,
    sentAt: logData.sentAt || Timestamp.now(),
  });
}
