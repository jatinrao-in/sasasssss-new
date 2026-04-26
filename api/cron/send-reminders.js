import { Timestamp } from 'firebase-admin/firestore';
import { handleCors } from '../../server/cors.js';
import { requireEnv } from '../../server/config.js';
import { getAdminServices } from '../../server/firebaseAdmin.js';
import {
  buildDayRangeIst,
  formatIstDate,
  formatIstTime,
  getCompanyName,
  getMemberTaskContext,
  getTeamSummaryContext,
  mergeAutomationSettings,
  renderTemplate,
  writeWhatsAppLog,
} from '../../server/whatsapp/automation.js';
import { handleConfigError, sendViaMsg91 } from '../../server/whatsapp/msg91.js';

function sleep(milliseconds) {
  return new Promise((resolve) => setTimeout(resolve, milliseconds));
}

function getSlotConfig(slot, settings) {
  if (slot === 'morning') {
    return {
      enabled: Boolean(settings.morningEnabled),
      time: settings.morningTime,
      template: settings.morningTemplate,
    };
  }

  if (slot === 'evening') {
    return {
      enabled: Boolean(settings.eveningEnabled),
      time: settings.eveningTime,
      template: settings.eveningTemplate,
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
  if (handleCors(req, res, 'GET, OPTIONS')) {
    return;
  }

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

    const memberResults = [];

    for (const userDoc of usersSnap.docs) {
      const user = { uid: userDoc.id, ...userDoc.data() };
      let renderedMessage = '';

      try {
        const templateVariables = await getMemberTaskContext(db, userDoc.id, user, companyName, now);
        renderedMessage = renderTemplate(slotConfig.template, templateVariables).trim();

        const sendResult = await sendViaMsg91(user.whatsapp || '', renderedMessage);
        const status = sendResult.sent ? 'sent' : 'failed';

        await writeWhatsAppLog(db, {
          to: sendResult.to,
          memberName: user.name || 'Unknown',
          memberUid: userDoc.id,
          messageType: slot,
          message: renderedMessage,
          status,
          msg91Response: sendResult.result,
          sentAt: Timestamp.now(),
        });

        memberResults.push({
          memberName: user.name || 'Unknown',
          memberUid: userDoc.id,
          phone: sendResult.to,
          status,
          message: renderedMessage,
          msg91Response: sendResult.result,
        });
      } catch (error) {
        await writeWhatsAppLog(db, {
          to: user.whatsapp || '',
          memberName: user.name || 'Unknown',
          memberUid: userDoc.id,
          messageType: slot,
          message: renderedMessage,
          status: 'failed',
          msg91Response: error.providerResponse || { error: error.message },
          error: error.message,
          sentAt: Timestamp.now(),
        });

        memberResults.push({
          memberName: user.name || 'Unknown',
          memberUid: userDoc.id,
          phone: user.whatsapp || '',
          status: 'failed',
          error: error.message,
          message: renderedMessage,
        });
      }

      await sleep(300);
    }

    const adminResults = [];
    if (settings.adminSummaryEnabled) {
      const summaryContext = await getTeamSummaryContext(db, companyName, memberResults, now);
      const adminMessage = renderTemplate(settings.adminTemplate, summaryContext).trim();

      for (const adminNumber of settings.adminNumbers.filter(Boolean)) {
        try {
          const sendResult = await sendViaMsg91(adminNumber, adminMessage);
          const status = sendResult.sent ? 'sent' : 'failed';

          await writeWhatsAppLog(db, {
            to: sendResult.to,
            memberName: 'Admin Summary',
            messageType: 'admin_summary',
            message: adminMessage,
            status,
            msg91Response: sendResult.result,
            sentAt: Timestamp.now(),
          });

          adminResults.push({
            phone: sendResult.to,
            status,
            msg91Response: sendResult.result,
          });
        } catch (error) {
          await writeWhatsAppLog(db, {
            to: adminNumber,
            memberName: 'Admin Summary',
            messageType: 'admin_summary',
            message: adminMessage,
            status: 'failed',
            msg91Response: error.providerResponse || { error: error.message },
            error: error.message,
            sentAt: Timestamp.now(),
          });

          adminResults.push({
            phone: adminNumber,
            status: 'failed',
            error: error.message,
          });
        }

        await sleep(300);
      }
    }

    await db.doc('settings/whatsapp_automation_runtime').set({
      lastRunDates: {
        ...(runtimeData?.lastRunDates || {}),
        [slot]: currentIstDate,
      },
      lastRunTimes: {
        ...(runtimeData?.lastRunTimes || {}),
        [slot]: currentIstTime,
      },
      updatedAt: Timestamp.now(),
    }, { merge: true });

    const { start } = buildDayRangeIst(now);
    return res.status(200).json({
      success: true,
      slot,
      processed: memberResults.length,
      sent: memberResults.filter((result) => result.status === 'sent').length,
      failed: memberResults.filter((result) => result.status === 'failed').length,
      adminSummaryProcessed: adminResults.length,
      date: currentIstDate,
      scheduledTime: slotConfig.time,
      runStartedAt: start.toISOString(),
      results: memberResults,
      adminResults,
    });
  } catch (error) {
    console.error('send-reminders failed:', error.message);

    if (handleConfigError(res, error)) {
      return;
    }

    return res.status(error.statusCode || 500).json({ error: error.message });
  }
}
