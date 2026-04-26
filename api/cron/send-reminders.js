import { Timestamp } from 'firebase-admin/firestore';
import { handleCors } from '../../server/cors.js';
import { requireEnv } from '../../server/config.js';
import { getAdminServices } from '../../server/firebaseAdmin.js';
import {
  buildDayRangeIst,
  formatIstDate,
  formatIstTime,
  getCompanyName,
  getTeamSummaryContext,
  mergeAutomationSettings,
} from '../../server/whatsapp/automation.js';
import {
  handleConfigError,
  sendDailyReminder,
  sendGeneralMessage,
} from '../../server/whatsapp/msg91.js';

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function getSlotConfig(slot, settings) {
  if (slot === 'morning') {
    return {
      enabled: Boolean(settings.morningEnabled),
      time: settings.morningTime,
    };
  }
  if (slot === 'evening') {
    return {
      enabled: Boolean(settings.eveningEnabled),
      time: settings.eveningTime,
    };
  }
  const error = new Error('slot must be "morning" or "evening"');
  error.statusCode = 400;
  throw error;
}

function readCronSecret(req) {
  return String(req.headers.authorization || req.headers['x-cron-secret'] || '').trim();
}

function shouldBypassTimeCheck(req) {
  return String(req.query?.force || '').trim() === '1';
}

export default async function handler(req, res) {
  if (handleCors(req, res, 'GET, OPTIONS')) return;

  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { CRON_SECRET } = requireEnv(['CRON_SECRET']);

    if (readCronSecret(req) !== `Bearer ${CRON_SECRET}`) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const { db } = getAdminServices();
    const slot = String(req.query?.slot || '').trim().toLowerCase();

    const [settingsDoc, companyDoc, runtimeDoc] = await Promise.all([
      db.doc('settings/whatsapp_automation').get(),
      db.doc('settings/company').get(),
      db.doc('settings/whatsapp_automation_runtime').get(),
    ]);

    if (!settingsDoc.exists) {
      return res.status(200).json({ success: true, message: 'No WhatsApp automation settings configured' });
    }

    const settings = mergeAutomationSettings(settingsDoc.data());
    const slotConfig = getSlotConfig(slot, settings);

    if (!slotConfig.enabled) {
      return res.status(200).json({ success: true, slot, message: `${slot} reminder disabled` });
    }

    const now = new Date();
    const currentIstTime = formatIstTime(now);
    const currentIstDate = formatIstDate(now);

    if (!shouldBypassTimeCheck(req) && currentIstTime !== slotConfig.time) {
      return res.status(200).json({
        success: true,
        slot,
        message: `Current IST time ${currentIstTime} does not match scheduled time ${slotConfig.time}`,
      });
    }

    const runtimeData = runtimeDoc.exists ? runtimeDoc.data() : {};
    if (!shouldBypassTimeCheck(req) && runtimeData?.lastRunDates?.[slot] === currentIstDate) {
      return res.status(200).json({
        success: true,
        slot,
        message: `${slot} reminders already processed for ${currentIstDate}`,
      });
    }

    const companyName = getCompanyName(companyDoc);

    const usersSnap = await db.collection('users')
      .where('role', '==', 'member')
      .where('status', '==', 'active')
      .get();

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const memberResults = [];

    for (const userDoc of usersSnap.docs) {
      const user = { uid: userDoc.id, ...userDoc.data() };

      if (!user.whatsapp) {
        memberResults.push({
          memberName: user.name || 'Unknown',
          memberUid: userDoc.id,
          phone: '',
          status: 'skipped',
          error: 'No WhatsApp number',
        });
        continue;
      }

      try {
        // Count tasks for this member
        const tasksSnap = await db.collection('tasks')
          .where('assignedTo', '==', userDoc.id)
          .get();

        const tasks = tasksSnap.docs.map((d) => d.data());

        const pendingTasks = tasks.filter((t) => t.status !== 'completed').length;
        const overdueTasks = tasks.filter((t) => {
          if (t.status === 'completed') return false;
          const target = t.targetDate?.toDate?.() || (t.targetDate ? new Date(t.targetDate) : null);
          return target && target < today;
        }).length;

        // Use daily_reminder template (variables: name, pendingTasks, overdueTasks)
        const sendResult = await sendDailyReminder(
          user.whatsapp,
          user.name || 'Team Member',
          pendingTasks,
          overdueTasks,
        );

        const status = sendResult.sent ? 'sent' : 'failed';

        await db.collection('whatsapp_logs').add({
          to: sendResult.to,
          memberName: user.name || 'Unknown',
          memberUid: userDoc.id,
          messageType: slot,
          template: 'daily_reminder',
          status,
          msg91Response: sendResult.result,
          pendingTasks,
          overdueTasks,
          sentAt: Timestamp.now(),
        });

        memberResults.push({
          memberName: user.name || 'Unknown',
          memberUid: userDoc.id,
          phone: sendResult.to,
          status,
          pendingTasks,
          overdueTasks,
        });
      } catch (error) {
        await db.collection('whatsapp_logs').add({
          to: user.whatsapp || '',
          memberName: user.name || 'Unknown',
          memberUid: userDoc.id,
          messageType: slot,
          template: 'daily_reminder',
          status: 'failed',
          msg91Response: error.providerResponse || { error: error.message },
          error: error.message,
          sentAt: Timestamp.now(),
        }).catch(() => {});

        memberResults.push({
          memberName: user.name || 'Unknown',
          memberUid: userDoc.id,
          phone: user.whatsapp || '',
          status: 'failed',
          error: error.message,
        });
      }

      await sleep(500);
    }

    // ── Admin summary ────────────────────────────────────────────────────────
    const adminResults = [];
    if (settings.adminSummaryEnabled) {
      const summaryContext = await getTeamSummaryContext(db, companyName, memberResults, now);
      const totalPending = memberResults.reduce((s, r) => s + (r.pendingTasks || 0), 0);
      const totalOverdue = memberResults.reduce((s, r) => s + (r.overdueTasks || 0), 0);

      const adminSummaryText =
        `Daily ${slot} summary for ${currentIstDate}:\n` +
        `Members notified: ${memberResults.length}\n` +
        `Total pending tasks: ${totalPending}\n` +
        `Total overdue tasks: ${totalOverdue}`;

      for (const adminNumber of (settings.adminNumbers || []).filter(Boolean)) {
        try {
          const sendResult = await sendGeneralMessage(adminNumber, 'Admin', adminSummaryText);
          const status = sendResult.sent ? 'sent' : 'failed';

          await db.collection('whatsapp_logs').add({
            to: sendResult.to,
            memberName: 'Admin Summary',
            messageType: 'admin_summary',
            template: 'general_message',
            status,
            msg91Response: sendResult.result,
            sentAt: Timestamp.now(),
          }).catch(() => {});

          adminResults.push({ phone: sendResult.to, status });
        } catch (error) {
          adminResults.push({ phone: adminNumber, status: 'failed', error: error.message });
        }

        await sleep(500);
      }
    }

    // ── Record last-run timestamp ────────────────────────────────────────────
    await db.doc('settings/whatsapp_automation_runtime').set(
      {
        lastRunDates: { ...(runtimeData?.lastRunDates || {}), [slot]: currentIstDate },
        lastRunTimes: { ...(runtimeData?.lastRunTimes || {}), [slot]: currentIstTime },
        updatedAt: Timestamp.now(),
      },
      { merge: true },
    );

    const { start } = buildDayRangeIst(now);
    return res.status(200).json({
      success: true,
      slot,
      processed: memberResults.length,
      sent: memberResults.filter((r) => r.status === 'sent').length,
      failed: memberResults.filter((r) => r.status === 'failed').length,
      adminSummaryProcessed: adminResults.length,
      date: currentIstDate,
      scheduledTime: slotConfig.time,
      runStartedAt: start.toISOString(),
      results: memberResults,
      adminResults,
    });

  } catch (error) {
    console.error('send-reminders failed:', error.message);
    if (handleConfigError(res, error)) return;
    return res.status(error.statusCode || 500).json({ error: error.message });
  }
}
